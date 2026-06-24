# Full production build for ARAPI.
# Produces: artifacts\ARAPI\ARAPI.exe
#           artifacts\ARAPI\arapi-backend.exe
#           artifacts\ARAPI\data\...
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
$releaseDir = Join-Path $shellDir "target\release"
$artifactDir = Join-Path $root "artifacts\ARAPI"
$artifactDataDir = Join-Path $artifactDir "data"

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
$appExe = Join-Path $releaseDir "arweb-api-tester.exe"
$backendExe = Join-Path $releaseDir "arapi-backend.exe"
$sourceDb = Join-Path $root "data\app.db"
$sourceKey = Join-Path $root "data\.arweb.key"
$sourceState = Join-Path $root "data\arapi-backend-state.json"
$sourceSeed = Join-Path $root "data\catalog.seed.json"

if (!(Test-Path $appExe)) {
    throw "ARAPI executable not found: $appExe"
}
if (!(Test-Path $backendExe)) {
    throw "ARAPI backend executable not found: $backendExe"
}

Write-Host "[post] Refreshing artifacts\ARAPI portable folder..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path $artifactDir | Out-Null
Get-ChildItem -LiteralPath $artifactDir -Force | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force -Path $artifactDataDir | Out-Null

Copy-Item -LiteralPath $appExe -Destination (Join-Path $artifactDir "ARAPI.exe") -Force
Copy-Item -LiteralPath $backendExe -Destination (Join-Path $artifactDir "arapi-backend.exe") -Force

if (Test-Path $sourceDb) {
    Copy-Item -LiteralPath $sourceDb -Destination (Join-Path $artifactDataDir "arweb.db") -Force
}
if (Test-Path $sourceSeed) {
    Copy-Item -LiteralPath $sourceSeed -Destination (Join-Path $artifactDataDir "catalog.seed.json") -Force
}
if (Test-Path $sourceKey) {
    Copy-Item -LiteralPath $sourceKey -Destination (Join-Path $artifactDataDir ".arweb.key") -Force
}
if (Test-Path $sourceState) {
    Copy-Item -LiteralPath $sourceState -Destination (Join-Path $artifactDataDir "arapi-backend-state.json") -Force
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  ARAPI build complete!"                     -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Portable: artifacts\ARAPI\"
Write-Host "  Backend : src-arapi\binaries\arapi-backend-$TargetTriple.exe"
Write-Host "  NSIS    : $bundleDir\nsis\"
Write-Host "  MSI     : $bundleDir\msi\"
Write-Host ""
