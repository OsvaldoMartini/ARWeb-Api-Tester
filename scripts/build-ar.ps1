# Full production build for AR Conversational.
# Produces: src-ar\binaries\ar-conversational-sidecar-*.exe
#           src-ar\target\release\bundle\nsis\*.exe  (NSIS installer)
#           src-ar\target\release\bundle\msi\*.msi   (MSI installer)
#
# Usage: pwsh scripts\build-ar.ps1
# Optional: pwsh scripts\build-ar.ps1 -TargetTriple x86_64-pc-windows-msvc

param([string]$TargetTriple = "x86_64-pc-windows-msvc")

$ErrorActionPreference = "Stop"
$root    = Split-Path $PSScriptRoot -Parent
$tauri   = Join-Path $root "node_modules\.bin\tauri.cmd"
$shellDir = Join-Path $root "src-ar"

Write-Host ""
Write-Host "============================================" -ForegroundColor Magenta
Write-Host "  AR Conversational --- full build"          -ForegroundColor Magenta
Write-Host "============================================" -ForegroundColor Magenta
Write-Host ""

# ── Step 1: build the Node.js sidecar ─────────────────────────────────────────
Write-Host "[1/2] Building Node.js sidecar (server-ar)..." -ForegroundColor Yellow
& "$PSScriptRoot\build-sidecar-ar.ps1" -TargetTriple $TargetTriple
# build-sidecar-ar.ps1 throws on any failure

# ── Step 2: Tauri build ────────────────────────────────────────────────────────
# Run tauri FROM src-ar/ so Cargo.toml + tauri.conf.json are unambiguous.
# beforeBuildCommand in tauri.conf.json uses "npm --prefix .. run build:ar"
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
Write-Host "  AR Conversational build complete!"         -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Sidecar : src-ar\binaries\ar-conversational-sidecar-$TargetTriple.exe"
Write-Host "  NSIS    : $bundleDir\nsis\"
Write-Host "  MSI     : $bundleDir\msi\"
Write-Host ""
