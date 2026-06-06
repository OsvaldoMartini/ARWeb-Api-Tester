# release.ps1  —  bump version, build Tauri exe, and copy artifacts to releases/
# Must be run on a Windows machine with Rust + Tauri toolchain installed.
#
# Usage:
#   .\scripts\release.ps1 patch        # bump patch, build, package
#   .\scripts\release.ps1 minor
#   .\scripts\release.ps1 major
#   .\scripts\release.ps1 1.2.3        # set exact version
#   .\scripts\release.ps1 -SkipBump    # rebuild current version without bumping

param(
    [string]$Bump = '',
    [switch]$SkipBump
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$Root = Split-Path -Parent $PSScriptRoot

# ── 1. bump version (unless skipped) ─────────────────────────────────────────
if (-not $SkipBump) {
    if (-not $Bump) { Write-Error "Provide a bump type: patch | minor | major | x.y.z"; exit 1 }
    Write-Host "== Bumping version ($Bump)..." -ForegroundColor Cyan
    & "$PSScriptRoot\bump-version.ps1" $Bump
}

# ── 2. read the current version ───────────────────────────────────────────────
$PkgPath = Join-Path $Root 'package.json'
$Version = (Get-Content $PkgPath -Raw | ConvertFrom-Json).version
$Tag = "v$Version"
Write-Host "== Building $Tag..." -ForegroundColor Cyan

# ── 3. build sidecar (Node.js binary bundled into the exe) ───────────────────
Write-Host "   Building Node sidecar..."
Push-Location $Root
& "$PSScriptRoot\build-sidecar.ps1"

# ── 4. tauri build ────────────────────────────────────────────────────────────
Write-Host "   Running tauri build..."
npm run tauri:build
if ($LASTEXITCODE -ne 0) { Write-Error "tauri build failed"; exit 1 }
Pop-Location

# ── 5. collect artifacts ──────────────────────────────────────────────────────
$BundleRoot = Join-Path $Root 'src-tauri' 'target' 'release' 'bundle'
$ReleaseDir = Join-Path $Root 'releases' $Tag
New-Item -ItemType Directory -Force -Path $ReleaseDir | Out-Null

$Artifacts = @()

# Windows NSIS installer (.exe)
$NsisDir = Join-Path $BundleRoot 'nsis'
if (Test-Path $NsisDir) {
    Get-ChildItem $NsisDir -Filter '*.exe' | ForEach-Object {
        Copy-Item $_.FullName $ReleaseDir
        $Artifacts += $_.Name
        Write-Host "   copied $($_.Name)"
    }
}

# Windows MSI installer
$MsiDir = Join-Path $BundleRoot 'msi'
if (Test-Path $MsiDir) {
    Get-ChildItem $MsiDir -Filter '*.msi' | ForEach-Object {
        Copy-Item $_.FullName $ReleaseDir
        $Artifacts += $_.Name
        Write-Host "   copied $($_.Name)"
    }
}

# Linux AppImage (if cross-compiled or built on Linux)
$AppImageDir = Join-Path $BundleRoot 'appimage'
if (Test-Path $AppImageDir) {
    Get-ChildItem $AppImageDir -Filter '*.AppImage' | ForEach-Object {
        Copy-Item $_.FullName $ReleaseDir
        $Artifacts += $_.Name
        Write-Host "   copied $($_.Name)"
    }
}

# ── 6. write per-release notes ────────────────────────────────────────────────
$Date = (Get-Date).ToString('yyyy-MM-dd')
$NotesPath = Join-Path $ReleaseDir 'RELEASE.md'
$ArtifactList = ($Artifacts | ForEach-Object { "- ``$_``" }) -join "`n"
Set-Content $NotesPath @"
# Release $Tag  ($Date)

## Artifacts
$ArtifactList

## What's new
<!-- fill in before distributing -->

## Installation (Windows)
Run the \`\`-setup.exe\`\` installer. The app installs a Node.js sidecar that
handles all API communication — no separate server setup required.

## SQLite database
The database is stored at:
\`%APPDATA%\com.arweb.apitester\arweb.db\`
"@
Write-Host "   wrote releases/$Tag/RELEASE.md"

# ── 7. update INDEX.md ────────────────────────────────────────────────────────
$IndexPath = Join-Path $Root 'releases' 'INDEX.md'
$IndexEntry = "| $Tag | $Date | $($Artifacts -join ', ') |"
if (-not (Test-Path $IndexPath)) {
    Set-Content $IndexPath @"
# Release Index

| Version | Date | Artifacts |
|---------|------|-----------|
$IndexEntry
"@
} else {
    $IndexContent = Get-Content $IndexPath -Raw
    if ($IndexContent -notmatch [regex]::Escape($Tag)) {
        # insert after the header row
        $IndexContent = $IndexContent -replace '(\| Version \| Date \| Artifacts \|\n\|[-| ]+\|\n)', "`$1$IndexEntry`n"
        Set-Content $IndexPath -Value $IndexContent -NoNewline
    }
}
Write-Host "   updated releases/INDEX.md"

# ── 8. done ───────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "Release $Tag ready in releases/$Tag/" -ForegroundColor Green
Write-Host "Artifacts:" -ForegroundColor Green
$Artifacts | ForEach-Object { Write-Host "  releases/$Tag/$_" }
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  git push --follow-tags          # push the version tag"
Write-Host "  gh release create $Tag releases/$Tag/* --title '$Tag' --notes-file releases/$Tag/RELEASE.md"
