# Full production build for ARAPI Tester.
# Produces: src-arapi\binaries\arweb-sidecar-*.exe
#           src-arapi\target\release\bundle\nsis\*.exe  (NSIS installer)
#           src-arapi\target\release\bundle\msi\*.msi   (MSI installer)
#
# Usage: pwsh scripts\build-arapi.ps1
# Optional: pwsh scripts\build-arapi.ps1 -TargetTriple x86_64-pc-windows-msvc

param([string]$TargetTriple = "x86_64-pc-windows-msvc")

$ErrorActionPreference = "Stop"
$root    = Split-Path $PSScriptRoot -Parent
$tauri   = Join-Path $root "node_modules\.bin\tauri.cmd"
$shellDir = Join-Path $root "src-arapi"

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  ARAPI Tester --- full build"               -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# ── Step 1: build the Node.js sidecar ─────────────────────────────────────────
Write-Host "[1/2] Building Node.js sidecar (server-arapi)..." -ForegroundColor Yellow
& "$PSScriptRoot\build-sidecar.ps1" -TargetTriple $TargetTriple
# build-sidecar.ps1 throws on any failure

# ── Step 2: Tauri build ────────────────────────────────────────────────────────
# Run tauri FROM src-arapi/ so Cargo.toml + tauri.conf.json are unambiguous.
# beforeBuildCommand in tauri.conf.json uses "npm --prefix .. run build"
# which builds the frontend from the repo root.
Write-Host ""
Write-Host "[2/2] Building Tauri app (frontend + Rust + installer)..." -ForegroundColor Yellow
Push-Location $shellDir
try {
    & $tauri build
    if ($LASTEXITCODE -ne 0) { throw "tauri build failed (exit code $LASTEXITCODE)" }
} finally {
    Pop-Location
}

# ── Done ──────────────────────────────────────────────────────────────────────
$bundleDir = Join-Path $shellDir "target\release\bundle"
Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  ARAPI Tester build complete!"              -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Sidecar : src-arapi\binaries\arweb-sidecar-$TargetTriple.exe"
Write-Host "  NSIS    : $bundleDir\nsis\"
Write-Host "  MSI     : $bundleDir\msi\"
Write-Host ""
