# Legacy wrapper: build the C# backend executable for ARAPI.
#
# Usage: pwsh scripts/build-sidecar.ps1

param([string]$TargetTriple = "x86_64-pc-windows-msvc")

$ErrorActionPreference = "Stop"
& "$PSScriptRoot\build-arapi-csharp.ps1" -TargetTriple $TargetTriple
