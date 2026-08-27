# Build the C# backend as a Windows executable.
#
# Usage: pwsh scripts/build-arapi-csharp.ps1
# Optional: pwsh scripts/build-arapi-csharp.ps1 -Runtime win-x64
# Optional: pwsh scripts/build-arapi-csharp.ps1 -TargetTriple x86_64-pc-windows-msvc
# Optional: pwsh scripts/build-arapi-csharp.ps1 -OutputDir src-ar\binaries -OutputName arapi-backend

param(
  [string]$TargetTriple = "x86_64-pc-windows-msvc",
  [string]$Runtime = "win-x64",
  [string]$Configuration = "Release",
  [string]$OutputDir,
  [string]$OutputName = "arapi-backend",
  [switch]$RefreshCatalogSeed
)

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$project = Join-Path $root "server-arapi-csharp\server-arapi-csharp.csproj"
$binDir = if ($OutputDir) { Join-Path $root $OutputDir } else { Join-Path $root "src-arapi\binaries" }
$output = Join-Path $binDir "$OutputName-$TargetTriple.exe"
$seedInput = Join-Path $root "data\app.db"
$seedOutput = Join-Path $root "data\catalog.seed.json"

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Building C# ARAPI backend"                 -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

if ($RefreshCatalogSeed) {
  if (-not (Test-Path -LiteralPath $seedInput)) {
    throw "Cannot refresh catalog seed because local data\app.db is missing"
  }
  python (Join-Path $root "scripts\export-catalog-seed.py") $seedInput $seedOutput
  if ($LASTEXITCODE -ne 0) { throw "catalog seed export failed" }
} elseif (-not (Test-Path -LiteralPath $seedOutput)) {
  throw "Committed data\catalog.seed.json is missing"
} else {
  Write-Host "[seed] Using committed catalog.seed.json (pass -RefreshCatalogSeed only for an approved refresh)" -ForegroundColor DarkGray
}

dotnet publish $project `
  -c $Configuration `
  -r $Runtime `
  --self-contained true `
  -p:PublishSingleFile=true `
  -p:EnableCompressionInSingleFile=true `
  -p:IncludeNativeLibrariesForSelfExtract=true `
  -p:PublishTrimmed=false `
  -o $binDir

if ($LASTEXITCODE -ne 0) { throw "dotnet publish failed" }

$sourceExe = Join-Path $binDir "$OutputName.exe"
if (Test-Path $sourceExe) {
  Copy-Item -LiteralPath $sourceExe -Destination $output -Force
} else {
  throw "Published backend executable not found: $sourceExe"
}

$publishSeedDir = Join-Path $binDir "data"
New-Item -ItemType Directory -Force -Path $publishSeedDir | Out-Null
Copy-Item -LiteralPath $seedOutput -Destination (Join-Path $publishSeedDir "catalog.seed.json") -Force

foreach ($extra in @(
  (Join-Path $binDir "$OutputName.exe"),
  (Join-Path $binDir "$OutputName.dll"),
  (Join-Path $binDir "$OutputName.deps.json"),
  (Join-Path $binDir "$OutputName.runtimeconfig.json"),
  (Join-Path $binDir "$OutputName.pdb"),
  (Join-Path $binDir "web.config"),
  (Join-Path $binDir "arweb-sidecar-x86_64-pc-windows-msvc.exe")
)) {
  if (Test-Path $extra) {
    Remove-Item -LiteralPath $extra -Force
  }
}

Write-Host ""
Write-Host "DONE: $output" -ForegroundColor Green
