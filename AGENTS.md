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
server-arapi/                ARAPI localhost HTTP sidecar
server-arapi-csharp/         Experimental C# ARAPI backend path
server-ar/                   Legacy AR Conversational sidecar code; do not use for new AR client flows
src-arapi/                   ARAPI Tauri v2 shell
src-ar/                      AR Conversational Tauri v2 shell
packages/domain/             Pure TypeScript entities and enums
packages/application/        Use cases, ports, validation
packages/infrastructure/     SQLite, OpenAPI import, HTTP, AI, reports, export
packages/api-testing-engine/ BotJob execution engine
packages/agents/             Banking agents and router
packages/mock-server/        Local mock HTTP server
packages/shared-ui/          Shared React UI tokens/utilities
packages/common/             Logger, Result, ids, time, sanitize helpers
scripts/                     Windows build and release scripts
docs/                        Manuals, roadmap/progress, generated docs
dist/                        ARAPI Vite build output
dist-ar/                     AR Conversational Vite build output
```

## Architecture Rules

The dependency direction is:

```text
React UI -> localhost backend -> application ports/use cases
                                -> infrastructure adapters
                                -> domain entities
```

Rules:

- Rust has no business logic. `src-arapi/` and `src-ar/` only create the window,
  load the frontend, spawn the production sidecar, pass `DB_PATH`, and kill the
  sidecar on exit. Both apps use the C# backend executable.
- Domain and application layers must not import infrastructure.
- Application ports live in `packages/application/src/interfaces/ports.ts`.
  Add or adjust a port there before adding an infrastructure implementation.
- Use `Result<T, E>` from `@arweb/common` for fallible domain/application flows.
- All agent/AI plans must reference only endpoints present in the imported
  OpenAPI catalog. `RealApiCatalogValidator` enforces this invariant.
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

- Sidecars are bundled to CJS with esbuild and then packaged with
  `@yao-pkg/pkg`.
- `better-sqlite3` is native. Keep it external in esbuild and pass the
  `better_sqlite3.node` file as a pkg asset.
- Do not switch to Node SEA unless the whole native-addon packaging path is
  redesigned and tested.
- An esbuild warning about `import.meta` in CJS may be harmless; verify runtime
  behavior before treating it as a build failure.

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

If `better_sqlite3.node` is missing, run:

```powershell
npm install
npm rebuild better-sqlite3
```

## Runtime/Environment Notes

- `DB_PATH` controls the SQLite path. Packaged Tauri apps pass a shared
  `%APPDATA%\ARWebShared\arweb.db` path to their sidecar.
- `SIDECAR_PORT` defaults:
  - `server-arapi-csharp`: `8787`
  - AR Conversational uses `server-arapi-csharp` on `8787`
- Backend entrypoint:
  - `server-arapi-csharp/Program.cs`
- Legacy Node bootstrap files:
  - `server-ar/src/bootstrap/container.ts` (legacy)
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
- Unit tests: `npm test`
- E2E: `npm run test:e2e`
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
