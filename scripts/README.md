# Release Scripts

## First-time setup (Windows — do this once after cloning)

```bat
npm install
```

This installs `@yao-pkg/pkg` (the sidecar bundler) and all other dev dependencies.
You **must** run this before building the sidecar or using the release scripts.

---

## Full release workflow (Windows)

Open **Command Prompt or PowerShell as Administrator** in the project root.

```bat
REM Pull latest, bump version, build sidecar + Tauri, collect artifacts, zip
scripts\release.bat patch

REM Or bump minor / major
scripts\release.bat minor
scripts\release.bat major

REM Set exact version
scripts\release.bat 1.2.3

REM Already built manually? Just collect artifacts + zip (no build)
scripts\release.bat --collect-only

REM Build without bumping version
scripts\release.bat --skip-bump
```

`release.bat` runs the full pipeline automatically:
1. `git pull --rebase` — syncs remote before touching version files
2. Bumps version in `package.json`, `tauri.conf.json`, `Cargo.toml`
3. Builds the Node.js sidecar (`build-sidecar.ps1` → `@yao-pkg/pkg`)
4. Runs `npm run tauri:build` (Vite + Rust → `.exe` + `.msi`)
5. Copies installers to `releases\v<ver>\`
6. Writes `RELEASE.md` and updates `releases\INDEX.md`
7. Creates **`ARWEB-API-Tester-v<ver>-windows-x64.zip`** — the file to send clients

---

## Build sidecar only

If you only need to rebuild the sidecar binary (e.g. after a server code change):

```bat
scripts\build-sidecar.bat
```

The sidecar is built with `@yao-pkg/pkg` (installed locally) which:
- Bundles all TypeScript via esbuild
- Packages `better-sqlite3` native addon (`.node`) into the exe
- Extracts the addon to `%TEMP%` at runtime — no Node.js installation needed on client machines

---

## What's in the release folder

```
releases\
  v0.1.2\
    ARWEB API Tester_0.1.2_x64-setup.exe      ← NSIS installer (send to clients via zip)
    ARWEB API Tester_0.1.2_x64_en-US.msi      ← MSI for IT/silent deployment
    ARWEB-API-Tester-v0.1.2-windows-x64.zip   ← zip this and send to clients
    RELEASE.md                                 ← fill in release notes before sharing
  INDEX.md                                     ← auto-updated, committed to git
```

Binary artifacts in `releases\v*\` are gitignored. Only `releases\INDEX.md` is tracked.

---

## After the build

```bat
REM Push version commit + tag
git push --follow-tags

REM (Optional) Create GitHub release with zip artifact
gh release create v0.1.2 "releases\v0.1.2\ARWEB-API-Tester-v0.1.2-windows-x64.zip" --title "v0.1.2" --notes-file "releases\v0.1.2\RELEASE.md"
```

---

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `CONFLICT in package.json` | git pull merged version bumps | `git restore src-tauri\Cargo.lock` then `git pull` |
| `JSONDecodeError: Expecting value` | Merge conflict markers in package.json | `git checkout --theirs package.json && git add package.json && git commit` |
| `tag already exists` | Tag was created in a previous run | Fixed — bump-version.bat skips tag creation if tag exists |
| `@yao-pkg/pkg failed — ERR_REQUIRE_ESM` | npx cache has broken version of into-stream | Fixed — pkg is now installed locally via `npm install`; re-run `npm install` |
| `pkg not found` | `npm install` not run yet | Run `npm install` from the repo root first |
| `E0597 borrow checker` | Rust lifetime error in lib.rs | Fixed in current codebase; run `git pull` |
| Sidecar **offline** after install | better-sqlite3 native addon not loading, or wrong DB path | Fixed — @yao-pkg/pkg bundles the addon; Tauri passes DB_PATH to sidecar |
| Import returns `<!doctype html>` | Tauri webview has no Vite proxy; /api resolves to index.html | Fixed — sidecarClient detects Tauri and uses `http://127.0.0.1:8787` directly |

---

## Requirements

- **Windows 10/11**, run as **Administrator**
- [Node.js 20+](https://nodejs.org/)
- [Rust toolchain](https://rustup.rs/) — target `x86_64-pc-windows-msvc`
- [Tauri prerequisites](https://tauri.app/start/prerequisites/) (WebView2, VS Build Tools 2022)
- `git` on PATH; optionally `gh` (GitHub CLI)
- **`npm install` must be run once** before `build-sidecar.bat` or `release.bat`

---

## Scripts reference

| Script | Purpose |
|--------|---------|
| `build-sidecar.bat` | Builds the Node sidecar exe into `src-tauri\binaries\` |
| `build-sidecar.ps1` | PowerShell implementation called by the .bat |
| `bump-version.bat` | Bumps version in the three version files + git commit + tag |
| `_bump_version.py` | Python helper called by bump-version.bat |
| `release.bat` | Full pipeline: pull → bump → sidecar → tauri build → collect → zip |
| `_release_finalize.py` | Python helper: writes RELEASE.md + updates INDEX.md |

## Version files kept in sync

| File | Field |
|------|-------|
| `package.json` | `"version"` |
| `src-tauri/tauri.conf.json` | `"version"` |
| `src-tauri/Cargo.toml` | `version` inside `[package]` |
