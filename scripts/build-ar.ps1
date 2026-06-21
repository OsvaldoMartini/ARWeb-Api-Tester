# Full production build for AR.
# Produces: src-ar\binaries\arapi-backend-*.exe
#           src-ar\target\release\bundle\nsis\*.exe  (NSIS installer)
#           src-ar\target\release\bundle\msi\*.msi   (MSI installer)
#
# Usage: pwsh scripts\build-ar.ps1
# Optional: pwsh scripts\build-ar.ps1 -TargetTriple x86_64-pc-windows-msvc

param([string]$TargetTriple = "x86_64-pc-windows-msvc")

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$tauri = Join-Path $root "node_modules\.bin\tauri.cmd"
$shellDir = Join-Path $root "src-ar"

Write-Host ""
Write-Host "============================================" -ForegroundColor Magenta
Write-Host "  AR --- full build"                        -ForegroundColor Magenta
Write-Host "============================================" -ForegroundColor Magenta
Write-Host ""

# The Tauri beforeBuildCommand builds the frontend and the C# backend.
Write-Host "[1/1] Building Tauri app (frontend + C# backend + Rust + installer)..." -ForegroundColor Yellow
Push-Location $shellDir
try {
    & $tauri build
    if ($LASTEXITCODE -ne 0) { throw "tauri build failed (exit code $LASTEXITCODE)" }
} finally {
    Pop-Location
}

$bundleDir = Join-Path $shellDir "target\release\bundle"
Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  AR build complete!"                        -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Backend : src-ar\binaries\arapi-backend-$TargetTriple.exe"
Write-Host "  NSIS    : $bundleDir\nsis\"
Write-Host "  MSI     : $bundleDir\msi\"
Write-Host ""
