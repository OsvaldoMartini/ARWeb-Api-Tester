# Build the C# ARAPI backend as a Windows executable for the ARAPI shell.
#
# Usage: pwsh scripts/build-arapi-csharp.ps1
# Optional: pwsh scripts/build-arapi-csharp.ps1 -Runtime win-x64
# Optional: pwsh scripts/build-arapi-csharp.ps1 -TargetTriple x86_64-pc-windows-msvc

param(
  [string]$TargetTriple = "x86_64-pc-windows-msvc",
  [string]$Runtime = "win-x64",
  [string]$Configuration = "Release"
)

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$project = Join-Path $root "server-arapi-csharp\server-arapi-csharp.csproj"
$binDir = Join-Path $root "src-arapi\binaries"
$output = Join-Path $binDir "arapi-backend-$TargetTriple.exe"

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Building C# ARAPI backend"                 -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

dotnet publish $project `
  -c $Configuration `
  -r $Runtime `
  --self-contained false `
  -p:PublishTrimmed=false `
  -o $binDir

if ($LASTEXITCODE -ne 0) { throw "dotnet publish failed" }

$sourceExe = Join-Path $binDir "arapi-backend.exe"
if (Test-Path $sourceExe) {
  Copy-Item -LiteralPath $sourceExe -Destination $output -Force
} else {
  throw "Published backend executable not found: $sourceExe"
}

Write-Host ""
Write-Host "DONE: $output" -ForegroundColor Green
