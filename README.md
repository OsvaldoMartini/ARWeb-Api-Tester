# ARWeb Desktop Apps

This repository builds two Windows desktop apps from one monorepo:

- **ARAPI**: no-code banking REST API testing, catalog import, mock server, BotJobs, and reports.
- **AR Conversational**: banking assistant for employee/client conversations that connects to the ARAPI backend.

Both apps use the same C# backend and SQLite database layout. Rust/Tauri is only the desktop shell and backend launcher; business logic lives in the React apps and `server-arapi-csharp`.

## Main Folders

| Folder | Purpose |
| --- | --- |
| `src/` | ARAPI React frontend |
| `src-ar-web/` | AR Conversational React frontend |
| `server-arapi-csharp/` | Shared C# REST backend |
| `src-arapi/` | ARAPI Tauri shell |
| `src-ar/` | AR Conversational Tauri shell |
| `packages/` | Shared TypeScript domain, application, infrastructure, agents, mock server, UI helpers |
| `data/` | Local development database and catalog seed |
| `artifacts/ARAPI/` | Portable ARAPI output folder |
| `artifacts/AR/` | Portable AR Conversational output folder |

## Prerequisites

- Node.js 20+
- npm 10+
- .NET SDK 8
- Rust stable
- Tauri Windows prerequisites:
  - Microsoft C++ Build Tools
  - WebView2 Runtime

Install dependencies once:

```powershell
npm install
```

## Development

Run ARAPI web UI with backend:

```powershell
npm run dev
```

Run AR Conversational web UI against the ARAPI backend:

```powershell
npm run dev:ar
```

Default ports:

| Service | Port |
| --- | --- |
| ARAPI UI | `5173` |
| AR Conversational UI | `5174` |
| C# backend | `8787` |

## Build Executables

Run these commands from the repository root:

```powershell
cd D:\Projects_DevOps\ARWeb-Api-Tester
```

Build ARAPI:

```powershell
C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe -ExecutionPolicy Bypass -File scripts\build-arapi.ps1
```

Build AR Conversational:

```powershell
C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe -ExecutionPolicy Bypass -File scripts\build-ar.ps1
```

Before building, close:

- `ARAPI.exe`
- `AR-Conversational.exe`
- any running `arapi-backend.exe`

Otherwise Windows may lock the backend executable or the artifact folder.

## Portable Output Folders

After building ARAPI, use:

```text
artifacts\ARAPI\
  ARAPI.exe
  arapi-backend.exe
  data\
    arweb.db
    catalog.seed.json
    .arweb.key
    arapi-backend-state.json
```

Start ARAPI with:

```text
artifacts\ARAPI\ARAPI.exe
```

After building AR Conversational, use:

```text
artifacts\AR\
  AR-Conversational.exe
  arapi-backend.exe
  data\
    arweb.db
    catalog.seed.json
    .arweb.key
    arapi-backend-state.json
```

Start AR Conversational with:

```text
artifacts\AR\AR-Conversational.exe
```

Do not normally run `arapi-backend.exe` directly. The desktop app starts it.

## Bot Builder Usage

In ARAPI, open:

```text
Bot Builder
```

The Bot Builder can:

- search the API catalog
- create BotJobs
- create mock functional tests
- use registered APIs when found
- create synthetic mock data/endpoints when no good API exists
- save generated tests into the database for later use

When asking for a runnable test, end the request with:

```text
- mock functional test
```

Examples:

```text
Create new client - mock functional test
Payment validation - mock functional test
Check account balances - mock functional test
Portfolio exposure review - mock functional test
```

Generated tests are visible in:

```text
BotJob Designer
Execute Tests
```

## AR Conversational Delegation

AR Conversational answers normal employee/client banking questions.

If the user asks to create tests, create BotJobs, or search the catalog, AR Conversational delegates to the same ARAPI backend flow. Examples:

```text
Create new client - mock functional test
Search the catalog for payment endpoints
```

## Database

The portable apps prefer the local database beside the executable:

```text
artifacts\ARAPI\data\arweb.db
artifacts\AR\data\arweb.db
```

The backend uses `DB_PATH` when provided by Tauri. AI provider settings and generated BotJobs are saved in SQLite.

## Useful Checks

Check whether the backend is running:

```powershell
Invoke-RestMethod http://127.0.0.1:8787/health
```

List saved BotJobs:

```powershell
Invoke-RestMethod http://127.0.0.1:8787/botjobs
```

Find the process using port `8787`:

```powershell
netstat -ano | findstr :8787
```

Stop a process by PID:

```powershell
taskkill /PID <PID> /F
```

## Cleanup

The largest rebuildable folders are:

```text
src-arapi\target
src-ar\target
server-arapi-csharp\bin
server-arapi-csharp\obj
```

They can be deleted when apps/builds are not running. They will be recreated by the build scripts.
