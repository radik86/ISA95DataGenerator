param(
    [string]$SourceInstance = "(localdb)\MSSQLLocalDB",
    [string]$SourceDatabase = "ISA95Migrations",
    [string]$TargetInstance = "localhost",
    [string]$TargetDatabase = "ISA95Migrations",
    [string]$BackupFolder = "$PSScriptRoot\_db_migration",
    [switch]$OverwriteTarget
)

$ErrorActionPreference = "Stop"

function Require-SqlCmd {
    $cmd = Get-Command sqlcmd -ErrorAction SilentlyContinue
    if (-not $cmd) {
        throw "sqlcmd was not found. Install SQL Server Command Line Utilities (sqlcmd) and retry."
    }
}

function Escape-SqlLiteral([string]$value) {
    return $value.Replace("'", "''")
}

function Invoke-SqlText {
    param(
        [Parameter(Mandatory = $true)][string]$Server,
        [Parameter(Mandatory = $true)][string]$Query,
        [string]$Database = "master",
        [string]$Separator
    )

    $args = @('-S', $Server, '-d', $Database, '-E', '-b', '-h', '-1', '-W', '-Q', $Query)
    if ($Separator) {
        $args += @('-s', $Separator)
    }

    $output = & sqlcmd @args 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "sqlcmd failed on server '$Server'. Output:`n$output"
    }
    return $output
}

function Get-FirstNonEmptyLine([string[]]$lines) {
    return ($lines | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne "" } | Select-Object -First 1)
}

Write-Host "Checking prerequisites..." -ForegroundColor Yellow
Require-SqlCmd

New-Item -ItemType Directory -Path $BackupFolder -Force | Out-Null

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupPath = Join-Path $BackupFolder "$SourceDatabase-$timestamp.bak"

Write-Host "Validating source database..." -ForegroundColor Yellow
$sourceExists = Get-FirstNonEmptyLine (Invoke-SqlText -Server $SourceInstance -Database "master" -Query "SET NOCOUNT ON;SELECT DB_ID(N'$(Escape-SqlLiteral $SourceDatabase)');")
if (-not $sourceExists -or $sourceExists -eq "NULL") {
    throw "Source database '$SourceDatabase' was not found on '$SourceInstance'."
}

Write-Host "Reading source logical file names..." -ForegroundColor Yellow
$logicalRows = Invoke-SqlText -Server $SourceInstance -Database $SourceDatabase -Separator "|" -Query "SET NOCOUNT ON;SELECT name, type_desc FROM sys.database_files ORDER BY CASE type_desc WHEN 'ROWS' THEN 0 ELSE 1 END;"

$dataLogicalName = $null
$logLogicalName = $null
foreach ($row in $logicalRows) {
    $line = $row.Trim()
    if ($line -eq "" -or $line -notlike "*|*") { continue }

    $parts = $line.Split("|", 2)
    if ($parts.Length -ne 2) { continue }

    $name = $parts[0].Trim()
    $typeDesc = $parts[1].Trim().ToUpperInvariant()

    if ($typeDesc -eq "ROWS" -and -not $dataLogicalName) { $dataLogicalName = $name }
    if ($typeDesc -eq "LOG" -and -not $logLogicalName) { $logLogicalName = $name }
}

if (-not $dataLogicalName -or -not $logLogicalName) {
    throw "Could not determine logical ROWS/LOG file names from source database '$SourceDatabase'."
}

Write-Host "Creating source backup: $backupPath" -ForegroundColor Yellow
$backupSql = "BACKUP DATABASE [$SourceDatabase] TO DISK = N'$(Escape-SqlLiteral $backupPath)' WITH COPY_ONLY, INIT, STATS = 5;"
Invoke-SqlText -Server $SourceInstance -Database "master" -Query $backupSql | Out-Null

Write-Host "Reading target default data/log folders..." -ForegroundColor Yellow
$defaultDataPath = Get-FirstNonEmptyLine (Invoke-SqlText -Server $TargetInstance -Database "master" -Query "SET NOCOUNT ON;SELECT CAST(SERVERPROPERTY('InstanceDefaultDataPath') AS NVARCHAR(4000));")
$defaultLogPath = Get-FirstNonEmptyLine (Invoke-SqlText -Server $TargetInstance -Database "master" -Query "SET NOCOUNT ON;SELECT CAST(SERVERPROPERTY('InstanceDefaultLogPath') AS NVARCHAR(4000));")

if (-not $defaultDataPath -or $defaultDataPath -eq "NULL") {
    throw "Could not read InstanceDefaultDataPath on target '$TargetInstance'."
}
if (-not $defaultLogPath -or $defaultLogPath -eq "NULL") {
    throw "Could not read InstanceDefaultLogPath on target '$TargetInstance'."
}

$targetMdf = Join-Path $defaultDataPath "$TargetDatabase.mdf"
$targetLdf = Join-Path $defaultLogPath "$TargetDatabase`_log.ldf"

Write-Host "Checking target database state..." -ForegroundColor Yellow
$targetExists = Get-FirstNonEmptyLine (Invoke-SqlText -Server $TargetInstance -Database "master" -Query "SET NOCOUNT ON;SELECT DB_ID(N'$(Escape-SqlLiteral $TargetDatabase)');")
if ($targetExists -and $targetExists -ne "NULL") {
    if (-not $OverwriteTarget) {
        throw "Target database '$TargetDatabase' already exists on '$TargetInstance'. Re-run with -OverwriteTarget to replace it."
    }

    Write-Host "Dropping existing target database '$TargetDatabase'..." -ForegroundColor Yellow
    $dropSql = @"
ALTER DATABASE [$TargetDatabase] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
DROP DATABASE [$TargetDatabase];
"@
    Invoke-SqlText -Server $TargetInstance -Database "master" -Query $dropSql | Out-Null
}

Write-Host "Restoring backup to target instance..." -ForegroundColor Yellow
$restoreSql = @"
RESTORE DATABASE [$TargetDatabase]
FROM DISK = N'$(Escape-SqlLiteral $backupPath)'
WITH MOVE N'$(Escape-SqlLiteral $dataLogicalName)' TO N'$(Escape-SqlLiteral $targetMdf)',
     MOVE N'$(Escape-SqlLiteral $logLogicalName)' TO N'$(Escape-SqlLiteral $targetLdf)',
     RECOVERY,
     REPLACE,
     STATS = 5;
"@
Invoke-SqlText -Server $TargetInstance -Database "master" -Query $restoreSql | Out-Null

Write-Host "Verifying restore..." -ForegroundColor Yellow
$verifyRows = Invoke-SqlText -Server $TargetInstance -Database $TargetDatabase -Query "SET NOCOUNT ON;SELECT COUNT(*) AS TableCount FROM sys.tables;SELECT CASE WHEN OBJECT_ID(N'__EFMigrationsHistory') IS NULL THEN -1 ELSE (SELECT COUNT(*) FROM __EFMigrationsHistory) END AS MigrationCount;"

Write-Host "" 
Write-Host "Migration complete." -ForegroundColor Green
Write-Host "Source : $SourceInstance / $SourceDatabase" -ForegroundColor Cyan
Write-Host "Target : $TargetInstance / $TargetDatabase" -ForegroundColor Cyan
Write-Host "Backup : $backupPath" -ForegroundColor Cyan
Write-Host "Data   : $targetMdf" -ForegroundColor Cyan
Write-Host "Log    : $targetLdf" -ForegroundColor Cyan
Write-Host "" 
Write-Host "Verification output:" -ForegroundColor Yellow
$verifyRows | ForEach-Object { Write-Host $_ }
Write-Host "" 
Write-Host "Next: update API connection string to target instance and restart API." -ForegroundColor Yellow
