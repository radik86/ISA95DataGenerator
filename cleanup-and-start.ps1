#!/usr/bin/env pwsh
# Cleanup and Start Script for ISA95DataGenerator
# Run this script when the app won't start due to memory issues (instead of rebooting)

param(
    [switch]$FullClean,  # Use -FullClean to also remove node_modules and reinstall
    [switch]$SkipStart   # Use -SkipStart to only cleanup without starting the app
)

$ErrorActionPreference = "SilentlyContinue"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  ISA95 Data Generator - Cleanup Tool" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Step 1: Kill all Node.js processes
Write-Host "[1/8] Killing Node.js processes..." -ForegroundColor Yellow
$nodeProcesses = Get-Process node -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    $nodeProcesses | Stop-Process -Force
    Write-Host "  + Killed $($nodeProcesses.Count) Node.js process(es)" -ForegroundColor Green
} else {
    Write-Host "  + No Node.js processes running" -ForegroundColor Green
}

# Kill Vite processes
$viteProcesses = Get-Process -Name "vite*" -ErrorAction SilentlyContinue
if ($viteProcesses) {
    $viteProcesses | Stop-Process -Force
    Write-Host "  + Killed Vite processes" -ForegroundColor Green
}

Start-Sleep -Seconds 1

# Step 2: Navigate to frontend directory
Write-Host "`n[2/8] Navigating to frontend directory..." -ForegroundColor Yellow
$frontendPath = Join-Path $PSScriptRoot "frontend"
if (Test-Path $frontendPath) {
    Set-Location $frontendPath
    Write-Host "  + Changed to: $frontendPath" -ForegroundColor Green
} else {
    Write-Host "  x Frontend directory not found!" -ForegroundColor Red
    exit 1
}

# Step 3: Clear npm cache
Write-Host "`n[3/8] Clearing npm cache..." -ForegroundColor Yellow
npm cache clean --force 2>&1 | Out-Null
Write-Host "  + npm cache cleared" -ForegroundColor Green

# Step 4: Clear Vite and build caches
Write-Host "`n[4/8] Clearing Vite and build caches..." -ForegroundColor Yellow
$cacheDirs = @(".vite", "dist", "node_modules/.vite")
foreach ($dir in $cacheDirs) {
    if (Test-Path $dir) {
        Remove-Item -Recurse -Force $dir -ErrorAction SilentlyContinue
        Write-Host "  + Removed $dir" -ForegroundColor Green
    }
}

# Step 5: Full clean (optional)
if ($FullClean) {
    Write-Host "`n[5/8] Performing full clean (node_modules)..." -ForegroundColor Yellow
    Write-Host "  ! This may take several minutes..." -ForegroundColor DarkYellow
    
    if (Test-Path "node_modules") {
        Remove-Item -Recurse -Force "node_modules" -ErrorAction SilentlyContinue
        Write-Host "  + Removed node_modules" -ForegroundColor Green
    }
    
    if (Test-Path "package-lock.json") {
        Remove-Item -Force "package-lock.json" -ErrorAction SilentlyContinue
        Write-Host "  + Removed package-lock.json" -ForegroundColor Green
    }
    
    Write-Host "  Installing dependencies..." -ForegroundColor Yellow
    npm install
    Write-Host "  + Dependencies installed" -ForegroundColor Green
} else {
    Write-Host "`n[5/8] Skipping full clean (use -FullClean to reinstall node_modules)" -ForegroundColor Gray
}

# Step 6: Check memory status
Write-Host "`n[6/8] Checking system memory..." -ForegroundColor Yellow
$os = Get-WmiObject Win32_OperatingSystem
$totalMemoryGB = [math]::Round($os.TotalVisibleMemorySize / 1MB, 2)
$freeMemoryGB = [math]::Round($os.FreePhysicalMemory / 1MB, 2)
$usedMemoryGB = [math]::Round($totalMemoryGB - $freeMemoryGB, 2)
$memoryUsagePercent = [math]::Round(($usedMemoryGB / $totalMemoryGB) * 100, 1)

Write-Host "  Total Memory: $totalMemoryGB GB" -ForegroundColor Cyan
Write-Host "  Used Memory:  $usedMemoryGB GB ($memoryUsagePercent%25)" -ForegroundColor Cyan
Write-Host "  Free Memory:  $freeMemoryGB GB" -ForegroundColor Cyan

if ($freeMemoryGB -lt 2) {
    Write-Host "  ! Warning: Low memory! Consider closing other applications." -ForegroundColor Red
} elseif ($freeMemoryGB -lt 4) {
    Write-Host "  ! Caution: Limited memory available." -ForegroundColor Yellow
} else {
    Write-Host "  + Sufficient memory available" -ForegroundColor Green
}

# Step 7: Remind about browser cleanup
Write-Host "`n[7/8] Browser cleanup reminder..." -ForegroundColor Yellow
Write-Host "  i Don't forget to clear browser cache:" -ForegroundColor Cyan
Write-Host "    - Press Ctrl+Shift+Delete in your browser" -ForegroundColor Gray
Write-Host "    - Or F12 -> Application -> Clear storage -> Clear site data" -ForegroundColor Gray
Write-Host "    - Close all browser tabs with the app open" -ForegroundColor Gray

# Step 8: Start the application
if (-not $SkipStart) {
    Write-Host "`n[8/8] Starting the application..." -ForegroundColor Yellow
    Write-Host "  * Running: npm run dev" -ForegroundColor Cyan
    Write-Host "`n========================================`n" -ForegroundColor Cyan
    
    # Start the dev server
    npm run dev
} else {
    Write-Host "`n[8/8] Skipping application start (use without -SkipStart to auto-start)" -ForegroundColor Gray
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "+ Cleanup complete! Run 'npm run dev' to start the app." -ForegroundColor Green
    Write-Host "========================================`n" -ForegroundColor Cyan
}
