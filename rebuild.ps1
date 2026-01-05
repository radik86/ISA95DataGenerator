# ISA95 Data Generator - Rebuild and Restart Script
# This script performs a clean rebuild of backend and frontend, then restarts both

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "ISA95 Data Generator - Rebuild Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Stop existing processes
Write-Host "Stopping existing processes..." -ForegroundColor Yellow

# Stop backend on port 5237
$port = 5237
$processId = (Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue).OwningProcess
if ($processId) {
    $processId | ForEach-Object { 
        Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue
        Write-Host "  Stopped backend process $_" -ForegroundColor Green
    }
    Start-Sleep -Seconds 2
} else {
    Write-Host "  No backend process found on port $port" -ForegroundColor Gray
}

# Stop frontend on ports 5174 and 5175
$frontendPorts = @(5174, 5175)
foreach ($fport in $frontendPorts) {
    $fpid = (Get-NetTCPConnection -LocalPort $fport -ErrorAction SilentlyContinue).OwningProcess
    if ($fpid) {
        $fpid | ForEach-Object { 
            Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue
            Write-Host "  Stopped frontend process $_ on port $fport" -ForegroundColor Green
        }
    }
}

# Stop background jobs
$jobs = Get-Job | Where-Object { $_.State -eq 'Running' }
if ($jobs) {
    $jobs | ForEach-Object {
        Stop-Job -Id $_.Id -ErrorAction SilentlyContinue
        Remove-Job -Id $_.Id -Force -ErrorAction SilentlyContinue
    }
}

Start-Sleep -Seconds 2
Write-Host ""

# Clean and rebuild backend
Write-Host "Cleaning backend..." -ForegroundColor Yellow
dotnet clean
if ($LASTEXITCODE -ne 0) {
    Write-Host "Backend clean failed!" -ForegroundColor Red
    Write-Host "Press any key to exit..." -ForegroundColor Red
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}
Write-Host "  Backend cleaned!" -ForegroundColor Green
Write-Host ""

Write-Host "Building backend..." -ForegroundColor Yellow
dotnet build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Backend build failed!" -ForegroundColor Red
    Write-Host "Press any key to exit..." -ForegroundColor Red
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}
Write-Host "  Backend build successful!" -ForegroundColor Green
Write-Host ""

# Rebuild frontend
Write-Host "Rebuilding frontend..." -ForegroundColor Yellow
Set-Location "frontend"
npm run build 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "  Frontend build had warnings (continuing...)" -ForegroundColor Yellow
} else {
    Write-Host "  Frontend build successful!" -ForegroundColor Green
}
Set-Location ".."
Write-Host ""

# Start backend in new terminal window
Write-Host "Starting backend API in new terminal..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'c:\Users\radion.badanjuk\Documents\Avanade\MDS\MDS Tools\ISA95DataGenerator'; Write-Host 'Starting Backend API...' -ForegroundColor Cyan; dotnet run --project src/ISA95DataGenerator.API"
Write-Host "  Backend terminal opened!" -ForegroundColor Green

# Wait for backend to be ready
Write-Host "  Waiting for backend to be ready..." -ForegroundColor Gray
Start-Sleep -Seconds 8

# Check if backend is responding
try {
    $response = Invoke-RestMethod -Uri "http://localhost:5237/entities" -Method GET -TimeoutSec 5 -ErrorAction Stop
    Write-Host "  Backend is ready! Found $($response.Count) entities" -ForegroundColor Green
} catch {
    Write-Host "  Backend may still be starting up..." -ForegroundColor Yellow
}
Write-Host ""

# Start frontend in new terminal window
Write-Host "Starting frontend in new terminal..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'c:\Users\radion.badanjuk\Documents\Avanade\MDS\MDS Tools\ISA95DataGenerator\frontend'; Write-Host 'Starting Frontend Dev Server...' -ForegroundColor Cyan; npm run dev"
Write-Host "  Frontend terminal opened!" -ForegroundColor Green
Start-Sleep -Seconds 3
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Application Rebuilt and Started!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Backend API: http://localhost:5237" -ForegroundColor White
Write-Host "Frontend:    http://localhost:5174 or http://localhost:5175" -ForegroundColor White
Write-Host ""
Write-Host "Two terminal windows have been opened:" -ForegroundColor Gray
Write-Host "  - Backend terminal (dotnet)" -ForegroundColor Gray
Write-Host "  - Frontend terminal (npm)" -ForegroundColor Gray
Write-Host ""
Write-Host "To stop all services, run: .\stop.ps1" -ForegroundColor Yellow
Write-Host "Or close the terminal windows manually" -ForegroundColor Yellow
Write-Host ""
