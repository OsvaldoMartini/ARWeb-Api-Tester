# Legacy wrapper: build the C# backend executable for AR Conversational.
#
# Usage: pwsh scripts/build-sidecar-ar.ps1

param([string]$TargetTriple = "x86_64-pc-windows-msvc")

$ErrorActionPreference = "Stop"
& "$PSScriptRoot\build-arapi-csharp.ps1" -TargetTriple $TargetTriple -OutputDir "src-ar\binaries"
