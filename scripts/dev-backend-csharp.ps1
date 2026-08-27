# Run the shared localhost C# backend for ARAPI and AR Conversational development.

param([int]$Port = 8787)

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$project = Join-Path $root "server-arapi-csharp\server-arapi-csharp.csproj"
$dataDir = Join-Path $root "data"

New-Item -ItemType Directory -Force -Path $dataDir | Out-Null
if ([string]::IsNullOrWhiteSpace($env:DB_PATH)) {
  $env:DB_PATH = Join-Path $dataDir "app.db"
}
$env:SIDECAR_PORT = $Port.ToString()

Write-Host "ARWeb C# backend: http://127.0.0.1:$Port" -ForegroundColor Cyan
Write-Host "DB_PATH: $env:DB_PATH" -ForegroundColor DarkGray

dotnet run --project $project --no-launch-profile
exit $LASTEXITCODE
