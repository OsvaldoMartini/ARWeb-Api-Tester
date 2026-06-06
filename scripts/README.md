# Release Scripts

## Quick start (Windows)

Open **PowerShell as Administrator** in the project root.

```powershell
# Patch release (0.1.0 → 0.1.1)
.\scripts\release.ps1 patch

# Minor release (0.1.0 → 0.2.0)
.\scripts\release.ps1 minor

# Major release (0.1.0 → 1.0.0)
.\scripts\release.ps1 major

# Set an exact version
.\scripts\release.ps1 1.2.3

# Rebuild without bumping the version
.\scripts\release.ps1 -SkipBump
```

Or with the `.bat` wrapper (same options):
```bat
scripts\release.bat patch
```

## What each script does

| Script | Purpose |
|--------|---------|
| `bump-version.ps1` / `.bat` | Updates version in `package.json`, `src-tauri/tauri.conf.json`, and `src-tauri/Cargo.toml`, then creates a git commit and tag |
| `release.ps1` / `.bat` | Calls bump-version → builds Node sidecar → runs `tauri build` → copies `.exe` / `.msi` to `releases\vX.Y.Z\` → updates `releases\INDEX.md` |
| `build-sidecar.ps1` | Builds and bundles the Node.js sidecar binary into `src-tauri\binaries\` |

## Output

```
releases\
  v0.1.1\
    ARWEB-API-Tester_0.1.1_x64-setup.exe   ← NSIS installer (recommended)
    ARWEB-API-Tester_0.1.1_x64_en-US.msi   ← MSI alternative
    RELEASE.md                              ← fill in release notes before sharing
  INDEX.md                                  ← tracked in git, updated automatically
```

Binary artifacts in `releases\v*\` are gitignored. Only `releases\INDEX.md` is committed.

## After the build

```powershell
# Push the version commit and tag to GitHub
git push --follow-tags

# (Optional) Create a GitHub release with the artifacts
gh release create v0.1.1 releases\v0.1.1\* --title "v0.1.1" --notes-file releases\v0.1.1\RELEASE.md
```

## Requirements

- Windows 10/11, run as **Administrator**
- [Rust toolchain](https://rustup.rs/) with `x86_64-pc-windows-msvc` target
- [Tauri prerequisites](https://tauri.app/start/prerequisites/) (WebView2, VS Build Tools)
- Node.js 22+
- `pkg` installed globally: `npm install -g pkg` (used by `build-sidecar.ps1`)
- `git` and optionally `gh` (GitHub CLI) on PATH

## Version files kept in sync

The scripts update all three version files atomically:

| File | Field |
|------|-------|
| `package.json` | `"version"` |
| `src-tauri/tauri.conf.json` | `"version"` |
| `src-tauri/Cargo.toml` | `version` inside `[package]` |
