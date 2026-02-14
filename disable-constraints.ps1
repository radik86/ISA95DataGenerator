# Disable Foreign Key and Check Constraints in ISA95Migrations database
# Run this script before importing data to avoid constraint violations

$serverInstance = "(localdb)\MSSQLLocalDB"
$database = "ISA95Migrations"

Write-Host "Disabling all foreign key constraints in $database..." -ForegroundColor Yellow

# SQL to disable all foreign key constraints
$disableFKSql = @"
-- Disable all foreign key constraints
DECLARE @sql NVARCHAR(MAX) = N'';

SELECT @sql += N'ALTER TABLE ' + QUOTENAME(OBJECT_SCHEMA_NAME(parent_object_id)) 
    + '.' + QUOTENAME(OBJECT_NAME(parent_object_id)) 
    + ' NOCHECK CONSTRAINT ' + QUOTENAME(name) + ';' + CHAR(13)
FROM sys.foreign_keys;

EXEC sp_executesql @sql;

-- Also disable all check constraints
SET @sql = N'';
SELECT @sql += N'ALTER TABLE ' + QUOTENAME(OBJECT_SCHEMA_NAME(parent_object_id)) 
    + '.' + QUOTENAME(OBJECT_NAME(parent_object_id)) 
    + ' NOCHECK CONSTRAINT ' + QUOTENAME(name) + ';' + CHAR(13)
FROM sys.check_constraints;

EXEC sp_executesql @sql;

PRINT 'All foreign key and check constraints have been disabled.';
"@

try {
    sqlcmd -S $serverInstance -d $database -Q $disableFKSql
    Write-Host "Successfully disabled all foreign key and check constraints!" -ForegroundColor Green
}
catch {
    Write-Host "Error disabling constraints: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "Constraints are now disabled. You can import data without FK/Check constraint violations." -ForegroundColor Cyan
Write-Host "Note: Primary key constraints cannot be disabled, but duplicates will be handled by the API (upsert logic)." -ForegroundColor Cyan
