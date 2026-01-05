# ISA95 Data Generator - Stop Script
# This script stops all running backend and frontend processes

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "ISA95 Data Generator - Stop Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Stopping all processes..." -ForegroundColor Yellow
Write-Host ""

# Stop backend on port 5237
Write-Host "Stopping backend..." -ForegroundColor Yellow
$port = 5237
$processId = (Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue).OwningProcess
if ($processId) {
    $processId | ForEach-Object { 
        Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue
        Write-Host "  Stopped process $_ on port $port" -ForegroundColor Green
    }
} else {
    Write-Host "  No backend process found on port $port" -ForegroundColor Gray
}
Write-Host ""

# Stop frontend on ports 5174 and 5175
Write-Host "Stopping frontend..." -ForegroundColor Yellow
$frontendPorts = @(5174, 5175)
$stopped = $false
foreach ($fport in $frontendPorts) {
    $fpid = (Get-NetTCPConnection -LocalPort $fport -ErrorAction SilentlyContinue).OwningProcess
    if ($fpid) {
        $fpid | ForEach-Object { 
            Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue
            Write-Host "  Stopped process $_ on port $fport" -ForegroundColor Green
            $stopped = $true
        }
    }
}
if (-not $stopped) {
    Write-Host "  No frontend process found" -ForegroundColor Gray
}
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "All services stopped!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
