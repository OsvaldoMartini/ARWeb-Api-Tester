# Build the Node.js sidecar as a self-contained Windows executable using Node SEA.
# Usage: pwsh scripts/build-sidecar.ps1
# Requires: Node.js 20+, esbuild (workspace devDep), postject (installed automatically)

param([string]$TargetTriple = "x86_64-pc-windows-msvc")

$ErrorActionPreference = "Stop"
$root      = Split-Path $PSScriptRoot -Parent
$outDir    = Join-Path $root "server\dist"
$binDir    = Join-Path $root "src-tauri\binaries"
$bundle    = Join-Path $outDir "sidecar.cjs"
$seaCfg    = Join-Path $outDir "sea-config.json"
$blob      = Join-Path $outDir "sea-prep.blob"
$outputExe = Join-Path $binDir "arweb-sidecar-$TargetTriple.exe"
$esbuild   = Join-Path $root "node_modules\.bin\esbuild.cmd"

New-Item -ItemType Directory -Force $outDir | Out-Null
New-Item -ItemType Directory -Force $binDir | Out-Null

# ── Step 1: bundle all TypeScript sources into a single CJS file ──────────────
Write-Host "▶ Bundling sidecar with esbuild..."
& $esbuild "$root\server\src\index.ts" `
    --bundle `
    --platform=node `
    --format=cjs `
    --target=node20 `
    --outfile="$bundle"
if ($LASTEXITCODE -ne 0) { throw "esbuild failed" }

# ── Step 2: write the SEA config ─────────────────────────────────────────────
Write-Host "▶ Writing sea-config.json..."
$seaJson = [pscustomobject]@{
    main                           = $bundle -replace '\\','/'
    output                         = $blob  -replace '\\','/'
    disableExperimentalSEAWarning  = $true
} | ConvertTo-Json
# Write without BOM — PowerShell 5.1 Set-Content -Encoding utf8 adds BOM which breaks Node JSON parser
[System.IO.File]::WriteAllText($seaCfg, $seaJson, [System.Text.UTF8Encoding]::new($false))

# ── Step 3: generate the blob ─────────────────────────────────────────────────
Write-Host "▶ Generating SEA blob..."
& node --experimental-sea-config $seaCfg
if ($LASTEXITCODE -ne 0) { throw "node --experimental-sea-config failed" }

# ── Step 4: copy node.exe as the base executable ─────────────────────────────
Write-Host "▶ Copying node.exe → $outputExe"
Copy-Item -Force (Get-Command node).Source $outputExe

# ── Step 5: (optional) remove Authenticode signature so postject can inject ──
$signtool = Get-Command signtool.exe -ErrorAction SilentlyContinue
if ($signtool) {
    Write-Host "▶ Removing code signature..."
    & $signtool.Source remove /s /f $outputExe 2>&1 | Out-Null
}

# ── Step 6: inject the blob ───────────────────────────────────────────────────
Write-Host "▶ Injecting blob with postject..."
& (Join-Path $root "node_modules\.bin\postject.cmd") `
    $outputExe `
    NODE_SEA_BLOB `
    $blob `
    --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2
if ($LASTEXITCODE -ne 0) { throw "postject failed" }

Write-Host ""
Write-Host "DONE. Sidecar ready: $outputExe" -ForegroundColor Green
