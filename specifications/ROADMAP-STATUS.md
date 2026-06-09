# ARWeb API Tester — Roadmap Status

> Updated: 2026-06-09 | **v1.0.0** | [ragstack.ch](https://ragstack.ch)

---

## Phase status

| Phase | Name | Key deliverable | Status |
|-------|------|-----------------|--------|
| 0 | Product Definition | Specs, pilots, architecture docs | Done |
| 1 | Tauri + React Foundation | Desktop shell, Vite dev server | Done |
| 2 | Domain Model | 20+ TypeScript entities | Done |
| 3 | SQLite Persistence | 19-table schema, WAL, repos | Done |
| 4 | OpenAPI Import | YAML/JSON recursive scan | Done |
| 5 | Catalog Validator | Anti-hallucination gate | Done |
| 6 | Banking Taxonomy UI | 25 categories, auto-map on import | Done |
| Web | ragstack.ch Deployment | Docker, nginx, Traefik, Let's Encrypt | Done |
| 8 | BotJob Engine | CRUD designer, executor, step audit trail | Done |
| 10 | Mock Server UI | Request log table, stats, clear | Done |
| 11 | AI Layer | 7 providers, Settings page, live routing | Done |
| 7 | Multi-Agent Banking Assistant | 14 agents wired to catalog, evidence, AI answers | Done |
| 9 | Visual BotJob Designer | Drag-and-drop canvas, color-coded nodes, palette | Done |
| 12 | Reports & Exports | HTML, CSV, Postman Collection, Bash/curl script | Done |
| 13 | UX Polish | LoadingSpinner, ErrorAlert, EmptyState, ErrorBoundary | Done |
| 14 | Security + v1.0 | AES-256-GCM key encryption, key masking, v1.0.0 | Done |

---

## Architecture

```
Browser/Tauri → React+TS → Node sidecar (port 8787) → SQLite (AppData)
                                ↓
              14 banking agents (keyword router + AI gateway)
              BotJob engine (drag-and-drop canvas, 8 command types)
              Mock server (catalog replay, request log)
              Reports engine (HTML/CSV/Postman/Bash export)
```

---

## What was built in each phase

### Phase 9 — Visual BotJob Designer
- Commands rendered as **color-coded flow nodes** with connector lines
- **Drag-to-reorder** via `@dnd-kit/sortable` (grip handle, keyboard accessible)
- **Command palette** (right panel, grouped by category) — click to add
- Categories: blue=API, green=assert, purple=variable, teal=extract, orange=control, yellow=data, pink=AI
- 3-column layout: job list | canvas | palette

### Phase 12 — Reports & Exports
- `GET /executions/:runId/report.html` — HTML run summary (printable to PDF from browser)
- `GET /executions/:runId/report.csv` — tabular step results for Excel/BI
- `GET /catalog/export/postman` — Postman Collection v2.1 with `{{baseUrl}}` variable
- `GET /catalog/export/bash` — curl script for all endpoints
- Reports page: run selector, 4 download cards split into Run / Catalog sections
- `fetch → Blob → <a download>` — works in dev, web, and Tauri

### Phase 13 — UX Polish
- `LoadingSpinner` — animated Loader2 icon, replaces all inline "Loading…" text
- `ErrorAlert` — icon + styled box, replaces all inline `text-danger` paragraphs
- `EmptyState` — centered icon + title + body card for zero-data screens
- `ErrorBoundary` — class component wrapping `<Outlet />` in Layout; catches page crashes
- Fixed: `ExecuteTestsPage` jobs fetch and history fetch were silently swallowing errors
- Fixed: `BusinessCategoriesPage` missing empty state when no categories loaded

### Phase 14 — Security + v1.0.0
- `CryptoService`: AES-256-GCM encryption using Node built-in `crypto` (zero new deps)
  - Format: `arweb:v1:<base64(iv[12] + authTag[16] + ciphertext)>`
  - Plain-text legacy values pass through `decrypt()` unchanged — re-encrypted on next save
- Key resolution: `ARWEB_MASTER_KEY` env var (Docker/CI) or auto-generated `.arweb.key` file (0600)
- `GET /settings/ai-providers` — returns `hasApiKey: bool`, never exposes key material to UI
- Settings page — shows "key saved" placeholder; tooltip updated to mention AES-256-GCM

> **Code signing** (Windows installer): requires a paid EV certificate. Steps when ready:
> 1. Obtain an EV code signing certificate (DigiCert, Sectigo, etc.)
> 2. Add `"signCommand"` or `"certificateThumbprint"` to `src-tauri/tauri.conf.json` under `bundle.windows`
> 3. Re-run `scripts\release.bat` — Tauri signs the installer automatically

---

## Windows Desktop Build — Step by step

### Prerequisites (one-time)

| Tool | Notes |
|------|-------|
| Node.js 20+ | nodejs.org |
| Rust toolchain | rustup.rs — target `x86_64-pc-windows-msvc` |
| VS Build Tools 2022 | C++ workload required by Tauri |
| WebView2 Runtime | Pre-installed on Windows 11; download for Win 10 |
| Git | On PATH |

### First-time setup (after cloning or after `git pull` that adds new deps)

```bat
npm install
```

This installs `@yao-pkg/pkg` (the sidecar bundler) and pins `into-stream` to v6
to avoid an ESM compatibility error on Node 20.

### Full release

```bat
scripts\release.bat patch
```

What it does automatically:
1. `git pull --rebase` — syncs with remote; restores lock files and `Cargo.toml` first
2. Bumps `package.json` / `tauri.conf.json` / `Cargo.toml`
3. Builds the Node sidecar: esbuild → `@yao-pkg/pkg` → `arweb-sidecar-x86_64-pc-windows-msvc.exe`
4. Runs `npm run tauri:build` (Vite + Rust → installers)
5. Copies installers to `releases\v<ver>\nsis\` and `releases\v<ver>\msi\`
6. Creates **`ARWEB-API-Tester-v<ver>-windows-x64.zip`** — send this to clients
7. Writes `releases\v<ver>\RELEASE.md` and updates `releases\INDEX.md`

### Release folder structure

```
releases\
  v1.0.0\
    nsis\
      ARWEB API Tester_1.0.0_x64-setup.exe    ← end users, double-click
    msi\
      ARWEB API Tester_1.0.0_x64_en-US.msi   ← IT / silent deployment
    ARWEB-API-Tester-v1.0.0-windows-x64.zip  ← send this to clients
    RELEASE.md
  INDEX.md
```

### NSIS vs MSI

| | NSIS `.exe` | MSI `.msi` |
|---|---|---|
| Who uses it | End users / testers | IT admins |
| How to install | Double-click | `msiexec /i` or Group Policy |
| What to send | Put in the ZIP | Only on request |
| Admin rights | Usually not needed | Often required |

### Other release modes

```bat
scripts\release.bat --collect-only   REM already built, just collect + zip
scripts\release.bat --skip-bump      REM build without bumping version
scripts\build-sidecar.bat            REM rebuild sidecar only
```

---

## Known issues fixed

| Issue | Root cause | Fix |
|-------|-----------|-----|
| Sidecar offline after install | `better-sqlite3` native addon not loadable in Node SEA | Switched to `@yao-pkg/pkg` — bundles and extracts `.node` at runtime |
| Wrong SQLite path in production | `container.ts` walked `../../../` from source | Tauri passes `DB_PATH=%APPDATA%\com.arweb.apitester\arweb.db` on spawn |
| Import shows `<!doctype html>` | Tauri webview has no Vite proxy; `/api/*` hit SPA fallback | `sidecarClient` detects `__TAURI_INTERNALS__` → uses `http://127.0.0.1:8787` |
| `ERR_REQUIRE_ESM` during sidecar build | `npx @yao-pkg/pkg` cached ESM-incompatible `into-stream` | `@yao-pkg/pkg` installed locally; `into-stream` pinned to v6 |
| `git tag already exists` | `bump-version.bat` failed on duplicate tags | Script checks existence before creating tag |
| Merge conflict in `package.json` | Concurrent version bumps on Windows and server | `release.bat` opens with `git pull --rebase` + restores lock files |
| E0597 Rust borrow error | `to_string_lossy()` on temporary `PathBuf` | Bind `PathBuf` to named variable first |
| Silent fetch failures in Execute Tests | `.catch(() => {})` swallowed all errors | Surfaces errors via `ErrorAlert` component |
| API keys stored as plain text | Field named `encryptedApiKey` but never encrypted | `CryptoService` (AES-256-GCM) wired into settings repository |

---

## Web deployment (ragstack.ch)

```
Traefik (HTTPS) → arweb-web:30880 (nginx) → arweb-api:8787 (Node sidecar)
                                                     ↓
                                            /app/data/app.db (bind-mounted)
```

Deploy command (on multiserver):
```bash
cd /srv/projects/ARWeb-Api-Tester
git pull
docker compose -f docker-compose.ragstack.yml build --no-cache
docker compose -f docker-compose.ragstack.yml up -d
```

Set `ARWEB_MASTER_KEY` in `docker-compose.ragstack.yml` to pin the encryption key across container restarts:
```yaml
environment:
  - ARWEB_MASTER_KEY=your-secret-key-here
```
