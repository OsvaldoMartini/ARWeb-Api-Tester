# Build the C# ARAPI backend as a self-contained Windows executable.
#
# Usage: pwsh scripts/build-arapi-csharp.ps1
# Optional: pwsh scripts/build-arapi-csharp.ps1 -Runtime win-x64

param(
  [string]$Runtime = "win-x64",
  [string]$Configuration = "Release"
)

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$project = Join-Path $root "server-arapi-csharp\server-arapi-csharp.csproj"
$output = Join-Path $root "src-arapi\binaries\arapi-backend.exe"

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
  -o (Split-Path $output)

if ($LASTEXITCODE -ne 0) { throw "dotnet publish failed" }

Write-Host ""
Write-Host "DONE: $output" -ForegroundColor Green
