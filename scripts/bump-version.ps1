# bump-version.ps1  —  bump the version in all 3 version files and git-commit the change
# Usage:
#   .\scripts\bump-version.ps1 patch       # 0.1.0 → 0.1.1
#   .\scripts\bump-version.ps1 minor       # 0.1.0 → 0.2.0
#   .\scripts\bump-version.ps1 major       # 0.1.0 → 1.0.0
#   .\scripts\bump-version.ps1 1.2.3       # set exact version

param(
    [Parameter(Mandatory=$true)]
    [string]$Bump
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$Root = Split-Path -Parent $PSScriptRoot

# ── read current version from package.json (single source of truth) ───────────
$PkgPath = Join-Path $Root 'package.json'
$Pkg = Get-Content $PkgPath -Raw | ConvertFrom-Json
$Current = $Pkg.version

$parts = $Current -split '\.'
$Major = [int]$parts[0]; $Minor = [int]$parts[1]; $Patch = [int]$parts[2]

switch ($Bump) {
    'patch' { $Patch++ }
    'minor' { $Minor++; $Patch = 0 }
    'major' { $Major++; $Minor = 0; $Patch = 0 }
    default {
        if ($Bump -match '^\d+\.\d+\.\d+$') {
            $p2 = $Bump -split '\.'; $Major=[int]$p2[0]; $Minor=[int]$p2[1]; $Patch=[int]$p2[2]
        } else {
            Write-Error "Usage: bump-version.ps1 [patch|minor|major|x.y.z]"
            exit 1
        }
    }
}

$New = "$Major.$Minor.$Patch"
Write-Host "Bumping $Current → $New"

# ── package.json ──────────────────────────────────────────────────────────────
$PkgRaw = Get-Content $PkgPath -Raw
$PkgRaw = $PkgRaw -replace '"version":\s*"[^"]+"', """version"": ""$New"""
Set-Content $PkgPath -Value $PkgRaw -NoNewline
Write-Host "  updated package.json"

# ── src-arapi/tauri.conf.json ─────────────────────────────────────────────────
$TauriConfPath = Join-Path $Root 'src-arapi' 'tauri.conf.json'
$TauriRaw = Get-Content $TauriConfPath -Raw
$TauriRaw = $TauriRaw -replace '"version":\s*"[^"]+"', """version"": ""$New"""
Set-Content $TauriConfPath -Value $TauriRaw -NoNewline
Write-Host "  updated src-arapi/tauri.conf.json"

# ── src-arapi/Cargo.toml ──────────────────────────────────────────────────────
$CargoPath = Join-Path $Root 'src-arapi' 'Cargo.toml'
$CargoLines = Get-Content $CargoPath
$InPackage = $false
$CargoOut = foreach ($Line in $CargoLines) {
    if ($Line -match '^\[package\]') { $InPackage = $true }
    elseif ($Line -match '^\[') { $InPackage = $false }
    if ($InPackage -and $Line -match '^version\s*=') {
        "version = ""$New"""
    } else {
        $Line
    }
}
Set-Content $CargoPath -Value ($CargoOut -join "`n") -NoNewline
Write-Host "  updated src-arapi/Cargo.toml"

# ── git commit ────────────────────────────────────────────────────────────────
Push-Location $Root
git add package.json src-arapi/tauri.conf.json src-arapi/Cargo.toml
git commit -m "chore: bump version to $New"
git tag -a "v$New" -m "Release v$New"
Write-Host "  git commit + tag v$New created"
Pop-Location

Write-Host ""
Write-Host "Version is now $New. Run .\scripts\release.ps1 to build and package." -ForegroundColor Green
