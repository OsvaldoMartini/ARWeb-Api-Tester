# ARWeb Desktop Apps — Delivery Branch

This repository builds two Windows desktop applications:

- **ARAPI** — no-code REST API catalog, BotJobs, Bash/curl export, execution audit, mock controls, and reports.
- **AR Conversational** — employee/client banking conversations, banking-agent routing, catalog evidence, and ARAPI handoff.

Both applications use the same C# backend and SQLite layout. Rust/Tauri is only the desktop shell and backend launcher. This lean branch intentionally excludes legacy Node sidecars, generated binaries/installers, test output, Docker material, and local reference data.

## Delivery Contents

| Path | Purpose |
| --- | --- |
| `src/` | ARAPI React frontend |
| `src-ar-web/` | AR Conversational React frontend |
| `server-arapi-csharp/` | Shared localhost C# backend |
| `src-arapi/` | ARAPI Tauri v2 shell |
| `src-ar/` | AR Conversational Tauri v2 shell |
| `packages/common/` | Shared TypeScript utilities |
| `packages/domain/` | Shared entities and AI-provider definitions |
| `packages/shared-ui/` | Shared React UI helpers |
| `scripts/` | Required development and Windows build scripts |
| `data/catalog.seed.json` | Committed non-secret catalog seed used by clean builds |
| `specifications/` | Project specifications and final client guides |
| `CAPI/` | Local-only API reference/database folder; ignored and never committed |

## Prerequisites

- Windows 10/11
- Node.js 20+ and npm 10+
- .NET SDK 8
- Rust stable
- Microsoft C++ Build Tools and WebView2 Runtime for Tauri

Install dependencies:

```powershell
npm install
```

## Development

All development commands use `server-arapi-csharp/`. The legacy Node sidecars are not part of this branch.

Run ARAPI with the C# backend:

```powershell
npm run dev
```

Run AR Conversational with the C# backend:

```powershell
npm run dev:ar
```

Run both web UIs against one shared C# backend:

```powershell
npm run dev:both
```

| Service | Local URL |
| --- | --- |
| ARAPI UI | `http://127.0.0.1:5173` |
| AR Conversational UI | `http://127.0.0.1:5174` |
| Shared C# backend | `http://127.0.0.1:8787` |

## Verification

```powershell
npm run build
npm run build:ar
npm run typecheck
```

Backend health:

```powershell
Invoke-RestMethod http://127.0.0.1:8787/health
```

## Windows Desktop Builds

Run from the repository root:

```powershell
pwsh scripts\build-arapi.ps1
pwsh scripts\build-ar.ps1
```

The scripts build each React frontend, publish the self-contained C# sidecar, build the Rust shell, and produce Tauri bundles. Generated `dist*`, `artifacts/`, `src-*/binaries/`, `src-*/target/`, and C# `bin/obj/` directories are ignored by Git.

Close any running `ARAPI.exe`, `AR-Conversational.exe`, or `arapi-backend.exe` before a full build so Windows does not lock generated files.

## Local Data and CAPI

`CAPI/` may remain in the repository directory on an authorized workstation for local import/testing, but the complete folder is ignored by Git. Before every commit or push, verify:

```powershell
git status --short -- CAPI
git ls-files -- CAPI
```

Both commands must print no CAPI content on this delivery branch.

`data/app.db`, its WAL/SHM files, `data/arapi-backend-state.json`, and `data/.arweb.key` are also local-only. A clean clone and normal desktop build use `data/catalog.seed.json`. The seed is refreshed only when an authorized maintainer explicitly runs `scripts/build-arapi-csharp.ps1 -RefreshCatalogSeed` and reviews the resulting change.

Packaged Tauri applications select the shared local database path and pass it to the sidecar through `DB_PATH`. Development uses `data/app.db` by default.

## Client Guides

Final manuals are stored in `specifications/guide/`:

```text
ARAPI-Complete-Client-Guide.docx
ARAPI-Complete-Client-Guide.pdf
AR-Conversational-Complete-Client-Guide.docx
AR-Conversational-Complete-Client-Guide.pdf
```

The guide authoring workspace and raw QA screenshots are excluded from the delivery branch; the final client documents contain their images.

## Security Notes

- Keep port `8787` bound to localhost.
- Do not commit local databases, CAPI content, keys, generated scripts containing secrets, or customer data.
- Protect the shared SQLite database as credential-bearing.
- Treat synthetic balances and delegated mock runs as demonstration evidence only.
- Review generated Bash/curl scripts and ARAPI BotJobs before any non-mock use.
