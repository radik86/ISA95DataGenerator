$src = "$PSScriptRoot\templates\masterdata"
$dst = "$PSScriptRoot\frontend\public\templates\masterdata"

Copy-Item "$src\*.csv" $dst -Force

$copied = (Get-ChildItem $dst -Filter *.csv).Count
Write-Host "Synced $copied CSV files from templates/masterdata -> frontend/public/templates/masterdata"
