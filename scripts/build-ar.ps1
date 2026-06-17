# Full production build for AR Conversational.
# Produces: src-ar\binaries\ar-conversational-sidecar-*.exe
#           src-ar\target\release\bundle\nsis\*.exe  (NSIS installer)
#           src-ar\target\release\bundle\msi\*.msi   (MSI installer)
#
# Usage: pwsh scripts\build-ar.ps1
# Optional: pwsh scripts\build-ar.ps1 -TargetTriple x86_64-pc-windows-msvc

param([string]$TargetTriple = "x86_64-pc-windows-msvc")

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
Push-Location $root

try {
    Write-Host ""
    Write-Host "============================================" -ForegroundColor Magenta
    Write-Host "  AR Conversational — full build"           -ForegroundColor Magenta
    Write-Host "============================================" -ForegroundColor Magenta
    Write-Host ""

    # ── Step 1: build the Node.js sidecar ─────────────────────────────────────
    Write-Host "[1/2] Building Node.js sidecar (server-ar)..." -ForegroundColor Yellow
    & "$PSScriptRoot\build-sidecar-ar.ps1" -TargetTriple $TargetTriple
    # build-sidecar-ar.ps1 throws on failure — no exit-code check needed here

    # ── Step 2: Tauri build ────────────────────────────────────────────────────
    # tauri:ar:build runs beforeBuildCommand = "npm run build:ar"
    #   which does: build:packages + tsc (ar-web) --noEmit + vite build (ar config) → dist-ar/
    # Then Tauri compiles Rust and bundles NSIS + MSI installers.
    Write-Host ""
    Write-Host "[2/2] Building Tauri app (frontend + Rust + installer)..." -ForegroundColor Yellow
    npm run tauri:ar:build
    if ($LASTEXITCODE -ne 0) { throw "tauri build failed (exit code $LASTEXITCODE)" }

    # ── Done ──────────────────────────────────────────────────────────────────
    $bundleDir = Join-Path $root "src-ar\target\release\bundle"
    Write-Host ""
    Write-Host "============================================" -ForegroundColor Green
    Write-Host "  AR Conversational build complete!"         -ForegroundColor Green
    Write-Host "============================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Sidecar : src-ar\binaries\ar-conversational-sidecar-$TargetTriple.exe"
    Write-Host "  NSIS    : $bundleDir\nsis\"
    Write-Host "  MSI     : $bundleDir\msi\"
    Write-Host ""
} finally {
    Pop-Location
}
