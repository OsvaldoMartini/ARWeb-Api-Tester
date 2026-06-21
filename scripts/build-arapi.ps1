# Full production build for ARAPI.
# Produces: src-arapi\binaries\arapi-backend-*.exe
#           src-arapi\target\release\bundle\nsis\*.exe  (NSIS installer)
#           src-arapi\target\release\bundle\msi\*.msi   (MSI installer)
#
# Usage: pwsh scripts\build-arapi.ps1
# Optional: pwsh scripts\build-arapi.ps1 -TargetTriple x86_64-pc-windows-msvc

param([string]$TargetTriple = "x86_64-pc-windows-msvc")

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$tauri = Join-Path $root "node_modules\.bin\tauri.cmd"
$shellDir = Join-Path $root "src-arapi"

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  ARAPI --- full build"                      -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Tauri build runs the frontend build and the C# backend publish via
# beforeBuildCommand in src-arapi/tauri.conf.json.
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
Write-Host "  ARAPI build complete!"                     -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Backend : src-arapi\binaries\arapi-backend-$TargetTriple.exe"
Write-Host "  NSIS    : $bundleDir\nsis\"
Write-Host "  MSI     : $bundleDir\msi\"
Write-Host ""
