# Build the ARAPI Node.js sidecar as a self-contained Windows exe for the
# AR Conversational shell.
#
# Usage: pwsh scripts/build-sidecar-ar.ps1

param([string]$TargetTriple = "x86_64-pc-windows-msvc")

$ErrorActionPreference = "Stop"
$root      = Split-Path $PSScriptRoot -Parent
$outDir    = Join-Path $root "server-arapi\dist"
$binDir    = Join-Path $root "src-ar\binaries"
$bundle    = Join-Path $outDir "sidecar.cjs"
$outputExe = Join-Path $binDir "arweb-sidecar-$TargetTriple.exe"
$esbuild   = Join-Path $root "node_modules\.bin\esbuild.cmd"

New-Item -ItemType Directory -Force $outDir | Out-Null
New-Item -ItemType Directory -Force $binDir | Out-Null

# ── Step 1: locate better-sqlite3 native addon ────────────────────────────────
$addonCandidates = @(
    (Join-Path $root "node_modules\better-sqlite3\build\Release\better_sqlite3.node"),
    (Join-Path $root "packages\infrastructure\node_modules\better-sqlite3\build\Release\better_sqlite3.node")
)
$addonPath = $addonCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $addonPath) {
    Write-Error @"
better_sqlite3.node not found.
Run:  npm install
Then: npm rebuild better-sqlite3
and try again.
"@
    exit 1
}
Write-Host "   native addon: $addonPath"

# ── Step 2: bundle TypeScript → CJS ──────────────────────────────────────────
Write-Host "▶ Bundling server-arapi with esbuild..."
& $esbuild "$root\server-arapi\src\index.ts" `
    --bundle `
    --platform=node `
    --format=cjs `
    --target=node20 `
    --external:better-sqlite3 `
    --outfile="$bundle"
if ($LASTEXITCODE -ne 0) { throw "esbuild failed" }

# ── Step 3: package into standalone exe ───────────────────────────────────────
$pkgCmd = Join-Path $root "node_modules\.bin\pkg.cmd"
if (-not (Test-Path $pkgCmd)) {
    throw "pkg not found. Run 'npm install' from the repo root first."
}
Write-Host "▶ Packaging with @yao-pkg/pkg (local)..."
& $pkgCmd "$bundle" `
    --targets "node20-win-x64" `
    --output "$outputExe" `
    --asset "$addonPath"
if ($LASTEXITCODE -ne 0) { throw "@yao-pkg/pkg failed" }

Write-Host ""
Write-Host "DONE: $outputExe" -ForegroundColor Green
