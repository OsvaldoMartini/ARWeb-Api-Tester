# ARWeb API Tester — Roadmap Status

> Updated: 2026-06-06 | v0.1.2 | [ragstack.ch](https://ragstack.ch)

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
| 9 | Visual BotJob Designer | Drag-and-drop canvas | Pending |
| 12 | Reports & Exports | PDF, Postman collection | Pending |
| 13 | UX Polish | Loading states, error boundaries | Pending |
| 14 | Security + Tauri exe | Encrypt keys, sign installer, v1.0 | Pending |

---

## Architecture

```
Browser/Tauri → React+TS → Node sidecar (port 8787) → SQLite (AppData)
                                ↓
              14 banking agents (keyword router + AI gateway)
              BotJob engine (8 MVP command types)
              Mock server (catalog replay, request log)
```

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

### Full release (patch version bump)

```bat
scripts\release.bat patch
```

What it does automatically:
1. `git pull --rebase` — syncs with remote before touching any file
2. Bumps `package.json` / `tauri.conf.json` / `Cargo.toml` (e.g. 0.1.1 → 0.1.2)
3. Builds the Node sidecar: esbuild → `@yao-pkg/pkg` → `arweb-sidecar-x86_64-pc-windows-msvc.exe`
4. Runs `npm run tauri:build` (Vite + Rust → installers)
5. Copies `.exe` and `.msi` to `releases\v0.1.2\`
6. Creates **`ARWEB-API-Tester-v0.1.2-windows-x64.zip`** — the file to send to clients
7. Writes `releases\v0.1.2\RELEASE.md` and updates `releases\INDEX.md`

### Other release modes

```bat
REM Already built manually, just collect and zip
scripts\release.bat --collect-only

REM Build without bumping version
scripts\release.bat --skip-bump

REM Build sidecar only (after server code change)
scripts\build-sidecar.bat
```

### Sending to clients

Inside `releases\v0.1.2\` send the ZIP:
```
ARWEB-API-Tester-v0.1.2-windows-x64.zip
  └── ARWEB API Tester_0.1.2_x64-setup.exe   ← double-click to install
  └── RELEASE.md
```

Client double-clicks the setup.exe, follows the wizard. No Node.js or other runtime needed.
The SQLite database is created at `%APPDATA%\com.arweb.apitester\arweb.db`.

---

## Known issues fixed in current version

| Issue | Root cause | Fix |
|-------|-----------|-----|
| Sidecar **offline** after install | `better-sqlite3` native addon not loadable in Node SEA | Switched to `@yao-pkg/pkg` which bundles and extracts the `.node` file at runtime |
| Wrong SQLite path in production | `container.ts` walked `../../../` from source path | Tauri now passes `DB_PATH=%APPDATA%\com.arweb.apitester\arweb.db` on sidecar spawn |
| Import shows `<!doctype html>` error | Tauri webview has no Vite proxy; `/api/*` hit the SPA fallback | `sidecarClient` detects `__TAURI_INTERNALS__` and uses `http://127.0.0.1:8787` directly |
| `ERR_REQUIRE_ESM` during sidecar build | `npx @yao-pkg/pkg` cached a version with ESM-incompatible `into-stream` | `@yao-pkg/pkg` installed locally; `into-stream` pinned to v6 via npm overrides |
| `git tag already exists` error | `bump-version.bat` failed fatally on duplicate tags | Script now checks existence before creating tag |
| Merge conflict in `package.json` | Concurrent version bumps on Windows and server | `release.bat` now opens with `git pull --rebase` |

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
