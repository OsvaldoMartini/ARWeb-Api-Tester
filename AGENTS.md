# AGENTS.md - ARWeb Monorepo

Operational context for AI coding agents working in this repository.

This repo builds two separate Windows desktop apps from one TypeScript/Rust
monorepo. Keep changes scoped to the app you are touching, and be especially
careful around the Tauri shells and sidecar executable packaging.

## Project Map

| App | Purpose | React UI | Backend | Tauri shell | Dev ports |
| --- | --- | --- | --- | --- | --- |
| ARAPI | No-code REST API testing for banking staff | `src/` | `server-arapi-csharp/` | `src-arapi/` | UI `5173`, API `8787` |
| AR Conversational | AI banking assistant for employee/client modes | `src-ar-web/` | C# backend (`server-arapi-csharp/`) | `src-ar/` | UI `5174`, API `8787` |

Both apps use the same SQLite database:

- Packaged apps: `%APPDATA%\ARWebShared\arweb.db`
- Dev fallback: `data/app.db`

Target runtime is Windows desktop via Tauri v2, NSIS/MSI installers, and sidecar
executables. Both desktop apps now use the C# backend path.

## Directory Roles

```text
src/                         ARAPI React frontend
src-ar-web/                  AR Conversational React frontend
server-arapi-csharp/         Shared production/development C# localhost backend
src-arapi/                   ARAPI Tauri v2 shell
src-ar/                      AR Conversational Tauri v2 shell
packages/domain/             Pure TypeScript entities and enums
packages/shared-ui/          Shared React UI tokens/utilities
packages/common/             Logger, Result, ids, time, sanitize helpers
scripts/                     Required C# sidecar and Windows desktop build scripts
data/catalog.seed.json       Committed catalog seed used by clean builds
specifications/              Specifications and final client guides
CAPI/                        Local-only reference/database folder; never commit or push
```

## Architecture Rules

The dependency direction is:

```text
React UI -> localhost C# backend -> SQLite/state/catalog adapters
React UI -> shared TypeScript domain/UI helpers
```

Rules:

- Rust has no business logic. `src-arapi/` and `src-ar/` only create the window,
  load the frontend, spawn the production sidecar, pass `DB_PATH`, and kill the
  sidecar on exit. Both apps use the C# backend executable.
- Shared TypeScript packages must not import either application frontend.
- All agent/AI evidence must reference only endpoints present in the imported
  catalog unless the C# backend explicitly labels a record synthetic/mock-only.
- Sidecar HTTP APIs are localhost-only JSON APIs. Do not expose them on a public
  interface.

## Executable Build Model

Each desktop app is a Tauri shell plus a packaged backend executable:

- ARAPI sidecar source: `server-arapi-csharp/Program.cs`
- ARAPI sidecar exe: `src-arapi/binaries/arapi-backend-x86_64-pc-windows-msvc.exe`
- ARAPI Tauri external bin name: `binaries/arapi-backend`
- AR Conversational backend source: `server-arapi-csharp/Program.cs`
- AR Conversational bundled sidecar exe: `src-ar/binaries/arapi-backend-x86_64-pc-windows-msvc.exe`
- AR Conversational Tauri external bin name: `binaries/arapi-backend`

Important Tauri rules:

- Run Tauri commands from the shell directory, not the repo root.
  - ARAPI: `cd src-arapi && tauri build`
  - AR Conversational: `cd src-ar && tauri build`
- Prefer the wrapper scripts from the repo root:
  - `pwsh scripts\build-arapi.ps1`
  - `pwsh scripts\build-ar.ps1`
- `src-arapi/tauri.conf.json` uses `beforeBuildCommand: "npm run build && npm run build:server-csharp"` and
  `frontendDist: "../dist"`.
- `src-ar/tauri.conf.json` uses `beforeBuildCommand: "npm run build:ar && npm run build:server-csharp:ar"` and
  `frontendDist: "../dist-ar"`.
- `externalBin` entries must omit the target triple and `.exe`; Tauri appends
  the target-specific suffix during bundling.
- If a shell directory is renamed or moved, run `cargo clean --release` inside
  that shell directory because Cargo may cache absolute paths.

Sidecar packaging rules:

- Publish `server-arapi-csharp` as a self-contained `win-x64` single-file
  executable through `scripts/build-arapi-csharp.ps1`.
- Normal builds embed the reviewed `data/catalog.seed.json`. Refresh the seed
  only with `-RefreshCatalogSeed` and review the resulting change.
- Never commit `CAPI/`, `data/app.db`, database WAL/SHM files, state JSON, or
  encryption-key files.

## Common Build Commands

```powershell
# Install dependencies
npm install

# Build TypeScript packages
npm run build:packages

# Run ARAPI web/dev sidecar
npm run dev

# Run AR Conversational web with the ARAPI backend
npm run dev:ar

# Run both web UIs against one shared C# backend
npm run dev:both

# Build frontends
npm run build
npm run build:ar

# Build the C# backend
npm run build:server-csharp
npm run build:server-csharp:ar

# Full Windows installers
pwsh scripts\build-arapi.ps1
pwsh scripts\build-ar.ps1
```

## Runtime/Environment Notes

- `DB_PATH` controls the SQLite path. Packaged Tauri apps pass a shared
  `%APPDATA%\ARWebShared\arweb.db` path to their sidecar.
- `SIDECAR_PORT` defaults:
  - `server-arapi-csharp`: `8787`
  - AR Conversational uses `server-arapi-csharp` on `8787`
- Backend entrypoint:
  - `server-arapi-csharp/Program.cs`
- Tauri spawn code:
  - `src-arapi/src/lib.rs`
  - `src-ar/src/lib.rs`

## Sidecar API Surface

ARAPI, `server-arapi-csharp`, port `8787`:

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/health` | Liveness |
| GET | `/catalog/endpoints` | List imported endpoints |
| POST | `/import` | Import OpenAPI files from `{ folderPath }` |
| POST | `/import/upload` | Import uploaded OpenAPI files |
| GET | `/taxonomy` | Banking taxonomy |
| GET | `/agents` | Available banking agents |
| GET | `/agents/capabilities` | Agent capability map |
| POST | `/agents/ask` | Ask banking agent |
| POST | `/app-assistant/chat` | App assistant chat |
| GET | `/settings/ai-providers` | List AI provider settings without secrets |
| POST | `/settings/ai-providers` | Upsert AI provider setting |
| POST | `/settings/ai-providers/set-default` | Set default provider |
| POST | `/settings/ai-providers/test` | Test provider call |
| GET/POST/PUT/DELETE | `/environments...` | Environment CRUD |
| GET/POST/PUT/DELETE | `/botjobs...` | BotJob CRUD |
| GET | `/botjobs/:id/export/bash` | Generate a BotJob Bash/curl script |
| POST | `/botjobs/:id/execute` | Execute a BotJob |
| GET | `/executions` | List execution runs |
| GET | `/executions/:runId/steps` | Run step results |
| GET | `/executions/:runId/report.html` | HTML execution report |
| GET | `/executions/:runId/report.csv` | CSV execution report |
| GET | `/catalog/export/postman` | Postman collection export |
| GET | `/catalog/export/bash` | Bash script export |
| GET/POST | `/mock...` | Mock server status/control/log |
| GET | `/separation/progress` | `docs/progress.json` |

AR Conversational uses the C# backend routes above on port `8787`.

## Coding Conventions

- TypeScript is strict. Avoid `any`; if unavoidable, document why at the use
  site.
- The repo uses ESM (`"type": "module"`). Preserve `.js` extensions in emitted
  TypeScript imports where existing code uses them.
- React uses functional components and hooks.
- State lives in Zustand stores under `src/store/` and `src-ar-web/store/`.
- Styling is Tailwind CSS, with shared tokens/utilities in
  `packages/shared-ui/`.
- Keep UI behavior app-specific unless the shared package already owns the
  abstraction.
- Do not put secrets in logs, docs, generated exports, or API responses.

## Testing and Verification

Use the narrowest verification that proves the change:

- Package/type changes: `npm run build:packages`
- ARAPI frontend: `npm run build`
- AR Conversational frontend: `npm run build:ar`
- Full typecheck: `npm run typecheck`
- Sidecar exe smoke: run the generated exe and check `/health` on its port.
- Full installer smoke: build with the PowerShell wrapper and inspect
  `src-*/target/release/bundle/`.

When fixing executable issues, always verify:

- The expected sidecar exe exists in `src-*/binaries/`.
- The Tauri `externalBin` base name matches the sidecar name used in `lib.rs`.
- The sidecar starts without Node installed globally.
- The app passes the intended `DB_PATH` in production.
- The installer bundle contains the sidecar.

## Known Incomplete Areas

- Some ARAPI pages are still partial or placeholder-heavy.
- AI provider integration is present but should be treated carefully; never
  expose stored API keys.
- Reports/export support exists for HTML, CSV, Bash, and Postman; confirm before
  claiming PDF, Excel, or other formats.
- BotJob execution and designer flows are evolving. Check current code before
  assuming a route or UI action exists.

## Agent Workflow

1. Read the nearest code before editing.
2. Keep changes inside the relevant app/package boundary.
3. Preserve the executable packaging model unless explicitly changing it.
4. Update this file when build commands, ports, sidecar names, or architecture
   boundaries change.
5. Do not revert unrelated user changes or generated artifacts.
