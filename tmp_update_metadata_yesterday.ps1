$ErrorActionPreference = 'Stop'

$base = 'http://localhost:5237/api/GenericData'
$excludeIds = @(
  'OR-PLANT03FRA-LINE-03-202603061437-296',
  'OR-PLANT02VIENNA-LINE-02-202603061431-858',
  'OR-PLANT02VIENNA-LINE-02-202603061429-328'
)
$yesterdayUtc = (Get-Date).ToUniversalTime().AddDays(-1).ToString('o')

function Test-IsExcludedValue($v) {
  if ($null -eq $v) { return $false }
  if ($v -is [string]) { return ($excludeIds -contains $v) }
  return $false
}

function Test-IsExcludedObject($obj) {
  if ($null -eq $obj) { return $false }

  if ($obj -is [System.Collections.IDictionary]) {
    foreach ($k in $obj.Keys) {
      $val = $obj[$k]
      if (Test-IsExcludedValue $val) { return $true }
      if ($val -is [System.Collections.IDictionary] -or (($val -is [System.Collections.IEnumerable]) -and -not ($val -is [string]))) {
        if (Test-IsExcludedObject $val) { return $true }
      }
    }
    return $false
  }

  if (($obj -is [System.Collections.IEnumerable]) -and -not ($obj -is [string])) {
    foreach ($item in $obj) {
      if (Test-IsExcludedValue $item) { return $true }
      if ($item -is [System.Collections.IDictionary] -or (($item -is [System.Collections.IEnumerable]) -and -not ($item -is [string]))) {
        if (Test-IsExcludedObject $item) { return $true }
      }
    }
    return $false
  }

  return (Test-IsExcludedValue $obj)
}

$summary = Invoke-RestMethod -Uri "$base/summary" -Method Get
$stores = @($summary.PSObject.Properties.Name) | Sort-Object

if ($stores.Count -eq 0) {
  throw 'No stores found in GenericData summary.'
}

Write-Output ("TIMESTAMP=" + $yesterdayUtc)
Write-Output ("STORE_COUNT=" + $stores.Count)

$totalSeen = 0
$totalUpdated = 0
$totalSkipped = 0

foreach ($store in $stores) {
  $records = Invoke-RestMethod -Uri "$base/$store" -Method Get
  if ($null -eq $records) { $records = @() }
  if (-not ($records -is [System.Array])) { $records = @($records) }

  $seen = $records.Count
  $updated = 0
  $skipped = 0

  if ($seen -gt 0) {
    $payload = New-Object System.Collections.Generic.List[object]

    foreach ($rec in $records) {
      if (Test-IsExcludedObject $rec) {
        $skipped++
        $payload.Add($rec) | Out-Null
        continue
      }

      $rec | Add-Member -NotePropertyName 'DataGeneratedAt' -NotePropertyValue $yesterdayUtc -Force
      $rec | Add-Member -NotePropertyName 'LastDataMigrationAt' -NotePropertyValue $yesterdayUtc -Force
      $payload.Add($rec) | Out-Null
      $updated++
    }

    $json = $payload | ConvertTo-Json -Depth 40 -Compress
    Invoke-RestMethod -Uri "$base/$store/bulk" -Method Post -ContentType 'application/json' -Body $json | Out-Null
  }

  $totalSeen += $seen
  $totalUpdated += $updated
  $totalSkipped += $skipped

  Write-Output ("STORE=" + $store + ",SEEN=" + $seen + ",UPDATED=" + $updated + ",SKIPPED=" + $skipped)
}

Write-Output ("TOTAL_SEEN=" + $totalSeen)
Write-Output ("TOTAL_UPDATED=" + $totalUpdated)
Write-Output ("TOTAL_SKIPPED=" + $totalSkipped)
