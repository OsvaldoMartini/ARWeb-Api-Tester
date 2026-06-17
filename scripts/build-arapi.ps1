# Full production build for ARAPI Tester.
# Produces: src-arapi\binaries\arweb-sidecar-*.exe
#           src-arapi\target\release\bundle\nsis\*.exe  (NSIS installer)
#           src-arapi\target\release\bundle\msi\*.msi   (MSI installer)
#
# Usage: pwsh scripts\build-arapi.ps1
# Optional: pwsh scripts\build-arapi.ps1 -TargetTriple x86_64-pc-windows-msvc

param([string]$TargetTriple = "x86_64-pc-windows-msvc")

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
Push-Location $root

try {
    Write-Host ""
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host "  ARAPI Tester — full build"                -ForegroundColor Cyan
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host ""

    # ── Step 1: build the Node.js sidecar ─────────────────────────────────────
    Write-Host "[1/2] Building Node.js sidecar (server-arapi)..." -ForegroundColor Yellow
    & "$PSScriptRoot\build-sidecar.ps1" -TargetTriple $TargetTriple
    # build-sidecar.ps1 throws on failure — no exit-code check needed here

    # ── Step 2: Tauri build ────────────────────────────────────────────────────
    # tauri:build runs beforeBuildCommand = "npm run build"
    #   which does: build:packages + tsc --noEmit + vite build → dist/
    # Then Tauri compiles Rust and bundles NSIS + MSI installers.
    Write-Host ""
    Write-Host "[2/2] Building Tauri app (frontend + Rust + installer)..." -ForegroundColor Yellow
    npm run tauri:build
    if ($LASTEXITCODE -ne 0) { throw "tauri build failed (exit code $LASTEXITCODE)" }

    # ── Done ──────────────────────────────────────────────────────────────────
    $bundleDir = Join-Path $root "src-arapi\target\release\bundle"
    Write-Host ""
    Write-Host "============================================" -ForegroundColor Green
    Write-Host "  ARAPI Tester build complete!"              -ForegroundColor Green
    Write-Host "============================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Sidecar : src-arapi\binaries\arweb-sidecar-$TargetTriple.exe"
    Write-Host "  NSIS    : $bundleDir\nsis\"
    Write-Host "  MSI     : $bundleDir\msi\"
    Write-Host ""
} finally {
    Pop-Location
}
