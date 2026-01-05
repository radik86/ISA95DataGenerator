# Stop any running ISA95DataGenerator API processes
Write-Host "Stopping any running API processes..." -ForegroundColor Yellow
Get-Process | Where-Object {$_.ProcessName -like "*ISA95*"} | ForEach-Object {
    Write-Host "Found process: $($_.ProcessName) (PID: $($_.Id))" -ForegroundColor Cyan
    Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
}

Start-Sleep -Seconds 2

# Navigate to project directory
Write-Host "`nNavigating to project directory..." -ForegroundColor Yellow
Set-Location "c:\Users\radion.badanjuk\Documents\Avanade\MDS\MDS Tools\ISA95DataGenerator"

# Clean build artifacts
Write-Host "`nCleaning previous build..." -ForegroundColor Yellow
dotnet clean

# Build the solution
Write-Host "`nBuilding solution..." -ForegroundColor Yellow
dotnet build

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nBuild successful!" -ForegroundColor Green
    
    # Start the API
    Write-Host "`nStarting API server..." -ForegroundColor Yellow
    Write-Host "API will be available at: http://localhost:5000" -ForegroundColor Cyan
    Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Cyan
    Write-Host "`n" -ForegroundColor Yellow
    
    dotnet run --project src/ISA95DataGenerator.API
} else {
    Write-Host "`nBuild failed! Please check the errors above." -ForegroundColor Red
    exit 1
}
