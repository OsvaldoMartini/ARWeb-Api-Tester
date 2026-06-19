# Build both Windows sidecar executables in one go.
#
# Usage: pwsh scripts/build-sidecars.ps1
# Optional: pwsh scripts/build-sidecars.ps1 -TargetTriple x86_64-pc-windows-msvc

param([string]$TargetTriple = "x86_64-pc-windows-msvc")

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Building both sidecar executables"         -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/2] Building ARAPI sidecar..." -ForegroundColor Yellow
& "$PSScriptRoot\build-sidecar.ps1" -TargetTriple $TargetTriple

Write-Host ""
Write-Host "[2/2] Building AR Conversational sidecar..." -ForegroundColor Yellow
& "$PSScriptRoot\build-sidecar-ar.ps1" -TargetTriple $TargetTriple

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  Both sidecar executables built"             -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "  ARAPI sidecar          : src-arapi\binaries\arweb-sidecar-$TargetTriple.exe"
Write-Host "  AR Conversational sidecar: src-ar\binaries\arweb-sidecar-$TargetTriple.exe"
Write-Host ""
