# Build both backend executables in one go.
#
# Usage: pwsh scripts/build-sidecars.ps1
# Optional: pwsh scripts/build-sidecars.ps1 -TargetTriple x86_64-pc-windows-msvc

param([string]$TargetTriple = "x86_64-pc-windows-msvc")

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Building both backend executables"         -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/2] Building ARAPI backend..." -ForegroundColor Yellow
& "$PSScriptRoot\build-arapi-csharp.ps1" -TargetTriple $TargetTriple
if ($LASTEXITCODE -ne 0) { throw "ARAPI backend build failed (exit code $LASTEXITCODE)" }

Write-Host ""
Write-Host "[2/2] Building AR Conversational backend..." -ForegroundColor Yellow
& "$PSScriptRoot\build-arapi-csharp.ps1" -TargetTriple $TargetTriple -OutputDir "src-ar\binaries"
if ($LASTEXITCODE -ne 0) { throw "AR Conversational backend build failed (exit code $LASTEXITCODE)" }

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  Both backend executables built"            -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "  ARAPI backend          : src-arapi\binaries\arapi-backend-$TargetTriple.exe"
Write-Host "  AR Conversational backend: src-ar\binaries\arapi-backend-$TargetTriple.exe"
Write-Host ""
