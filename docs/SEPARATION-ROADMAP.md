# ARWeb Separation Roadmap
## AR Conversational ↔ ARAPI Tester — Two Independent Tauri Apps

---

## FOR THE WINDOWS CLAUDE AGENT READING THIS

> **READ THIS ENTIRE DOCUMENT BEFORE TOUCHING ANY FILE.**

You are being asked to execute a multi-phase separation of one monolithic Tauri/React/Node app
into **two independent Tauri desktop apps**. The codebase is at:

```
C:\path\to\ARWeb-Api-Tester\   (Windows)
/srv/projects/ARWeb-Api-Tester/ (Linux multiserver)
```

### Rules you must follow:

1. **Do NOT rename or delete any existing file until the phase says so.** Read the phase first, plan, then act.
2. **Work one phase at a time.** After each phase, update `docs/progress.json` (see bottom of this doc).
3. **The folder `src-tauri` does NOT need to stay named `src-tauri`.** Tauri reads `tauri.conf.json` from any folder — you override with `--config src-arapi/tauri.conf.json` in npm scripts.
4. **All monorepo packages in `packages/` are SHARED between both apps.** Never split them.
5. **The SQLite database remains shared** unless explicitly told to split it.
6. **When a phase is complete, mark it in `docs/progress.json`** so the progress page reflects it.
7. **If something is unclear**, check `server/src/server.ts` (full route list) and `src/App.tsx` (full route list) before asking.
8. After each phase, run: `npm run typecheck` to verify no TypeScript errors.

### How to read this document:

- Each phase has a **Goal**, **Files to touch**, and **Step-by-step instructions**.
- The `progress.json` file at `docs/progress.json` tracks completion — update it after each phase.
- The **live progress page** at `src/pages/SeparationProgressPage.tsx` reads `progress.json` via the sidecar — build it in Phase 0.

---

## Architecture Overview (Current State)

```
ARWeb-Api-Tester/
├── src/             ← React frontend (13 routes, BOTH concerns mixed)
├── src-tauri/       ← Tauri desktop shell (ONE app, wraps everything)
├── server/          ← Node sidecar (38+ routes, BOTH concerns mixed)
├── packages/        ← 8 monorepo packages (SHARED, do not split)
│   ├── domain/
│   ├── common/
│   ├── application/
│   ├── infrastructure/
│   ├── agents/          ← AR Conversational concern
│   ├── api-testing-engine/ ← ARAPI Tester concern
│   ├── mock-server/
│   └── shared-ui/
└── docs/
```

## Architecture Overview (Target State)

```
ARWeb-Api-Tester/
├── src/             ← React frontend: ARAPI Tester only (11 routes)
├── src-ar-web/      ← React frontend: AR Conversational only (4 routes)  [NEW]
├── src-arapi/       ← Tauri shell for ARAPI Tester (renamed from src-tauri)
├── src-ar/          ← Tauri shell for AR Conversational               [NEW]
├── server-arapi/    ← Node sidecar for ARAPI Tester (renamed from server/)
├── server-ar/       ← Node sidecar for AR Conversational              [NEW]
├── packages/        ← UNCHANGED — shared by both apps
└── docs/
    ├── SEPARATION-ROADMAP.md   ← this file
    └── progress.json           ← phase completion tracker
```

## Route Distribution

### ARAPI Tester (`src/` + `server-arapi/`)
| Page | Route | Server Routes |
|------|-------|---------------|
| Home | `/` | `GET /health` |
| Import APIs | `/import` | `POST /import`, `POST /import/upload` |
| API Catalog | `/catalog` | `GET /catalog/*` |
| Business Categories | `/categories` | `GET /taxonomy/*` |
| Test Cases | `/test-cases` | - |
| Bot Builder | `/builder` | `POST /app-assistant/chat` |
| BotJob Designer | `/designer` | `GET/POST /botjobs/*` |
| Execute Tests | `/execute` | `GET/POST /executions/*` |
| Mock Server | `/mock` | `GET/POST /mock/*` |
| Reports | `/reports` | `GET /reports/*`, `/export/*` |
| Environments | `/environments` | `GET/POST /environments/*` |
| Settings | `/settings` | `GET/POST /settings/*` |

### AR Conversational (`src-ar-web/` + `server-ar/`)
| Page | Route | Server Routes |
|------|-------|---------------|
| Home | `/` | `GET /health` |
| AI Assistant | `/assistant` | `GET/POST /agents/*` |
| API Catalog (read-only) | `/catalog` | `GET /catalog/endpoints` |
| Settings | `/settings` | `GET/POST /settings/*` |

---

## PHASE 0 — Progress Tracker Page (Do This First)

**Goal:** Build a live progress dashboard so the operator can see exactly where the separation stands.

### Files to create:
- `docs/progress.json`
- `src/pages/SeparationProgressPage.tsx`
- Add route `/separation` to `src/App.tsx`
- Add sidecar endpoint `GET /separation/progress` to `server/src/server.ts`

### Step-by-step:

**0.1 — Create `docs/progress.json`:**
```json
{
  "updated": "2026-06-17",
  "phases": [
    { "id": 0, "name": "Progress Tracker Page",        "status": "in-progress", "note": "" },
    { "id": 1, "name": "Rename src-tauri → src-arapi", "status": "pending",     "note": "" },
    { "id": 2, "name": "Split Node server",            "status": "pending",     "note": "" },
    { "id": 3, "name": "Split React frontend",         "status": "pending",     "note": "" },
    { "id": 4, "name": "Create src-ar Tauri shell",    "status": "pending",     "note": "" },
    { "id": 5, "name": "Update src-arapi Tauri shell", "status": "pending",     "note": "" },
    { "id": 6, "name": "Wire root package.json scripts","status": "pending",    "note": "" },
    { "id": 7, "name": "Windows build & smoke test",   "status": "pending",     "note": "" }
  ]
}
```

**0.2 — Add sidecar route** in `server/src/server.ts`:
```typescript
'GET /separation/progress': async () => {
  const { readFileSync } = await import('node:fs');
  const { join } = await import('node:path');
  // Walk up from __dirname to find docs/progress.json
  // Adjust the relative path based on where the sidecar runs
  const p = join(process.cwd(), 'docs', 'progress.json');
  return JSON.parse(readFileSync(p, 'utf8'));
},
```

**0.3 — Create `src/pages/SeparationProgressPage.tsx`:**
- Call `GET /api/separation/progress` on mount
- Render each phase as a card with status badge: `pending` (grey) / `in-progress` (yellow) / `done` (green) / `blocked` (red)
- Auto-refresh every 10 seconds
- Show `updated` timestamp
- Show any `note` text under the phase

**0.4 — Add route in `src/App.tsx`:**
```tsx
<Route path="/separation" element={<SeparationProgressPage />} />
```

**0.5 — Add nav link in `src/lib/nav.ts`** (temporary, remove after Phase 7).

**0.6 — Mark phase done:**
Update `docs/progress.json` → phase 0 status: `"done"`.

---

## PHASE 1 — Rename `src-tauri/` → `src-arapi/`

**Goal:** Confirm Tauri accepts a non-default folder name. Low-risk rename before adding complexity.

**Answer:** The folder does NOT need to be named `src-tauri`. Tauri CLI searches for `tauri.conf.json` starting from the project root. You tell it where to look via `--config` in npm scripts.

### Files to touch:
- Rename folder `src-tauri/` → `src-arapi/`
- Update `package.json` scripts

### Step-by-step:

**1.1 — Rename the folder:**
```powershell
# Windows PowerShell
Rename-Item src-tauri src-arapi
```
```bash
# Linux
mv src-tauri src-arapi
```

**1.2 — Update `package.json` scripts** — add `--config` flags:
```json
"tauri": "tauri --config src-arapi/tauri.conf.json",
"tauri:dev": "tauri dev --config src-arapi/tauri.conf.json",
"tauri:build": "tauri build --config src-arapi/tauri.conf.json",
```

**1.3 — Update `src-arapi/tauri.conf.json`:**
- Change `productName` to `"ARAPI Tester"`
- Change `identifier` to `"com.arweb.arapi-tester"`
- Keep everything else identical

**1.4 — Smoke test (Windows only):**
```powershell
npm run tauri:dev
```
Verify the window opens with title "ARAPI Tester".

**1.5 — Mark phase done** in `docs/progress.json`.

---

## PHASE 2 — Split the Node Sidecar

**Goal:** Create `server-ar/` (AR Conversational server, port 8788) by extracting agent routes.
Keep `server/` working as `server-arapi/` (renamed in Phase 2.4).

### Files to create:
- `server-ar/` (new directory, copy of `server/` with only agent routes)
- `server-ar/src/index.ts`
- `server-ar/src/server.ts` (minimal — only agent routes)
- `server-ar/src/bootstrap/container.ts`
- `server-ar/package.json`
- `server-ar/tsconfig.json`

### Routes for `server-ar/` (port 8788):
```
GET  /health
GET  /catalog/endpoints          ← read-only catalog (agents need to see endpoints)
GET  /agents                     ← list 14 agents
GET  /agents/capabilities        ← capability summary
POST /agents/ask                 ← banking Q&A
GET  /settings/ai-providers      ← read AI provider config
POST /settings/ai-providers      ← write AI provider config
```

### Routes to REMOVE from `server-ar/`:
Everything related to BotJobs, executions, mock server, import, taxonomy management, app-assistant.

### Step-by-step:

**2.1 — Copy server structure:**
```powershell
# Windows
Copy-Item -Recurse server server-ar
```

**2.2 — Edit `server-ar/src/server.ts`:**
Delete all routes EXCEPT: `/health`, `/catalog/endpoints`, `/agents/*`, `/settings/ai-providers`.
The file should shrink from ~600 lines to ~100 lines.

**2.3 — Edit `server-ar/src/bootstrap/container.ts`:**
Remove all repositories/use-cases not needed by agents:
- KEEP: `catalogRepo`, `settingsRepo`, `agentRouter`
- REMOVE: `botJobRepo`, `executionRepo`, `taxonomyRepo`, `environmentRepo`, `engine`, `importUseCase`, `mockServer`, `appAssistant`

**2.4 — Edit `server-ar/package.json`:**
```json
{
  "name": "@arweb/server-ar",
  "description": "AR Conversational sidecar",
  "scripts": {
    "dev": "PORT=8788 tsx watch src/index.ts",
    "build": "esbuild src/index.ts --bundle ... --outfile dist/server-ar.cjs"
  }
}
```

**2.5 — Rename `server/` → `server-arapi/`:**
```powershell
Rename-Item server server-arapi
```
Update root `package.json` workspace: `"server-arapi"` instead of `"server"`.

**2.6 — Verify both servers start independently:**
```bash
# Terminal 1
cd server-arapi && npm run dev    # port 8787
# Terminal 2  
cd server-ar && npm run dev       # port 8788
```

**2.7 — Mark phase done** in `docs/progress.json`.

---

## PHASE 3 — Split the React Frontend

**Goal:** Create `src-ar-web/` as a minimal React app for AR Conversational.
Keep `src/` as the ARAPI Tester frontend (remove `AiAssistantPage`).

### Pages for `src-ar-web/` (4 pages):
- `HomePage.tsx` — landing, show agent list
- `AiAssistantPage.tsx` — copy from `src/pages/`
- `SettingsPage.tsx` — copy + trim to AI provider settings only
- `SeparationProgressPage.tsx` — copy from `src/pages/` (read-only view)

### Pages to REMOVE from `src/`:
- `AiAssistantPage.tsx`
- Remove `/assistant` route from `src/App.tsx`
- Remove "AI Assistant" from `src/lib/nav.ts`

### Step-by-step:

**3.1 — Create `src-ar-web/` directory structure:**
```
src-ar-web/
├── main.tsx
├── App.tsx              ← 4 routes only
├── store/appStore.ts    ← copy + trim (no botjob state)
├── services/sidecarClient.ts  ← copy + trim (only agent calls, port 8788)
├── lib/nav.ts           ← 4 items only
├── components/
│   └── layout/          ← copy from src/components/layout/
└── pages/
    ├── HomePage.tsx
    ├── AiAssistantPage.tsx
    ├── SettingsPage.tsx
    └── SeparationProgressPage.tsx
```

**3.2 — Create `vite.config-ar.ts`** at project root:
```typescript
export default defineConfig({
  root: 'src-ar-web',
  build: { outDir: '../dist-ar' },
  server: { port: 5174, proxy: { '/api': 'http://localhost:8788' } },
  // ... rest same as vite.config.ts
})
```

**3.3 — Edit `src-ar-web/services/sidecarClient.ts`:**
Change base URL to `http://localhost:8788` (or use env var `VITE_SIDECAR_PORT`).

**3.4 — Edit `src/App.tsx`:**
Remove import and route for `AiAssistantPage`.

**3.5 — Edit `src/lib/nav.ts`:**
Remove "AI Assistant" entry.

**3.6 — Verify ARAPI frontend still runs:**
```bash
npm run dev:web   # localhost:5173 — no /assistant route
```

**3.7 — Verify AR frontend runs:**
```bash
npx vite --config vite.config-ar.ts   # localhost:5174
```

**3.8 — Mark phase done** in `docs/progress.json`.

---

## PHASE 4 — Create `src-ar/` Tauri Shell

**Goal:** New Rust/Tauri project that wraps `src-ar-web` and bundles `server-ar` as sidecar.

### Files to create:
- `src-ar/Cargo.toml`
- `src-ar/tauri.conf.json`
- `src-ar/src/main.rs`
- `src-ar/src/lib.rs`
- `src-ar/build.rs`
- `src-ar/icons/` (copy from `src-arapi/icons/` or create AR-specific)

### Step-by-step:

**4.1 — Copy Tauri shell structure:**
```powershell
Copy-Item -Recurse src-arapi src-ar
```

**4.2 — Edit `src-ar/Cargo.toml`:**
```toml
[package]
name = "ar-conversational"
version = "1.0.0"
# rest same as src-arapi/Cargo.toml
```

**4.3 — Edit `src-ar/tauri.conf.json`:**
```json
{
  "productName": "AR Conversational",
  "version": "1.0.0",
  "identifier": "com.arweb.ar-conversational",
  "build": {
    "beforeDevCommand": "npx vite --config vite.config-ar.ts",
    "devUrl": "http://localhost:5174",
    "beforeBuildCommand": "npx vite build --config vite.config-ar.ts",
    "frontendDist": "../dist-ar"
  },
  "app": {
    "windows": [{ "title": "AR Conversational", "width": 1100, "height": 750 }]
  },
  "bundle": {
    "externalBin": ["binaries/ar-sidecar"]
  }
}
```

**4.4 — Update `src-ar/src/lib.rs`:**
Change sidecar binary name from `arweb-sidecar` to `ar-sidecar` (or keep name, just different binary path).

**4.5 — Add npm scripts in root `package.json`:**
```json
"tauri:ar": "tauri dev --config src-ar/tauri.conf.json",
"tauri:ar:build": "tauri build --config src-ar/tauri.conf.json",
"dev:ar": "concurrently \"npm run dev --workspace @arweb/server-ar\" \"npx vite --config vite.config-ar.ts\""
```

**4.6 — Smoke test AR Conversational Tauri app:**
```powershell
npm run tauri:ar
```
Verify window opens with title "AR Conversational" and the assistant page works.

**4.7 — Mark phase done** in `docs/progress.json`.

---

## PHASE 5 — Update `src-arapi/` Tauri Shell

**Goal:** Ensure ARAPI Tester Tauri app points to `server-arapi/` (renamed server) and still works.

### Files to touch:
- `src-arapi/tauri.conf.json` — update sidecar binary path if name changed
- `src-arapi/src/lib.rs` — update sidecar binary name if changed
- Root `package.json` — update dev/build scripts

### Step-by-step:

**5.1 — If you renamed server/ → server-arapi/, update build scripts** in `server-arapi/package.json`:
Ensure the output binary is still named `arweb-sidecar` (or update `tauri.conf.json` to match new name).

**5.2 — Run full ARAPI build:**
```powershell
npm run tauri:build
```
Verify installer is produced.

**5.3 — Mark phase done** in `docs/progress.json`.

---

## PHASE 6 — Clean Up Root `package.json`

**Goal:** Single clean script per app with zero ambiguity.

### Target scripts:
```json
{
  "scripts": {
    "build:packages": "...(unchanged)...",

    "dev:arapi":       "concurrently ... server-arapi + vite at 5173",
    "dev:ar":          "concurrently ... server-ar + vite-ar at 5174",
    "dev":             "npm run dev:arapi",

    "tauri:arapi:dev": "tauri dev --config src-arapi/tauri.conf.json",
    "tauri:arapi:build": "tauri build --config src-arapi/tauri.conf.json",
    "tauri:ar:dev":    "tauri dev --config src-ar/tauri.conf.json",
    "tauri:ar:build":  "tauri build --config src-ar/tauri.conf.json",

    "build:arapi":     "npm run build:packages && vite build",
    "build:ar":        "npm run build:packages && vite build --config vite.config-ar.ts"
  }
}
```

**6.1 — Remove old `tauri`, `tauri:dev`, `tauri:build` aliases** (they're ambiguous now).

**6.2 — Update workspaces array:**
```json
"workspaces": [
  "packages/*",
  "server-arapi",
  "server-ar"
]
```

**6.3 — Mark phase done** in `docs/progress.json`.

---

## PHASE 7 — Windows Build & Smoke Test

**Goal:** Both apps build to `.exe` installers on Windows and run independently.

### Checklist:
- [ ] `npm run tauri:arapi:build` → produces `ARAPI-Tester_1.0.0_x64-setup.exe`
- [ ] `npm run tauri:ar:build` → produces `AR-Conversational_1.0.0_x64-setup.exe`
- [ ] Install both, launch both simultaneously — no port conflicts
- [ ] ARAPI Tester has NO AI Assistant page
- [ ] AR Conversational has NO BotJob/Execute pages
- [ ] Both share same SQLite database at `data/arweb.db` (verify by checking same path in both `container.ts` files)
- [ ] AI provider settings changed in AR Conversational are reflected in ARAPI Tester (shared settings table)

**7.1 — Mark phase done** in `docs/progress.json`.

---

## Port Map (Final State)

| App | Frontend | Sidecar | Tauri Dev |
|-----|----------|---------|-----------|
| ARAPI Tester | 5173 | 8787 | `src-arapi/` |
| AR Conversational | 5174 | 8788 | `src-ar/` |

---

## Key Decisions & Rationale

### Why NOT split the packages/ monorepo?
Both apps share `@arweb/domain`, `@arweb/infrastructure` (SQLite), `@arweb/application` (validator).
Splitting would create dependency management hell for no benefit — packages are already cleanly separated by concern.

### Why share the SQLite database?
The API catalog is imported once and used by both apps. Splitting the DB would require syncing imported endpoints across two databases. Keep `data/arweb.db` as the single source of truth.

### Why `server-ar` needs `GET /catalog/endpoints`?
The AR Conversational agents need to know which endpoints exist to build evidence and capability maps. Read-only access is fine — no write routes needed.

### Why is `src-ar-web/` a separate directory rather than reusing `src/`?
Different Vite configs (port, proxy target, outDir). Cleaner builds. No risk of ARAPI routing leaking into AR Conversational.

### Can both Tauri apps run simultaneously on Windows?
Yes. They use different ports (5174/8788 vs 5173/8787) and different window identifiers. Tauri bundles them as independent `.exe` files.

---

## `docs/progress.json` Format

This file is read by the live progress page. Update it after every phase.

```json
{
  "updated": "YYYY-MM-DD",
  "phases": [
    {
      "id": 0,
      "name": "Progress Tracker Page",
      "status": "done",
      "note": "Page at /separation, auto-refreshes every 10s"
    },
    {
      "id": 1,
      "name": "Rename src-tauri → src-arapi",
      "status": "pending",
      "note": ""
    }
  ]
}
```

Status values: `"pending"` | `"in-progress"` | `"done"` | `"blocked"`

---

## File Change Summary (All Phases)

### NEW files/folders:
- `docs/progress.json`
- `src/pages/SeparationProgressPage.tsx`
- `src-ar/` (full Tauri shell)
- `src-ar-web/` (AR Conversational React app)
- `server-ar/` (AR Conversational Node sidecar)
- `vite.config-ar.ts`

### RENAMED:
- `src-tauri/` → `src-arapi/`
- `server/` → `server-arapi/`

### MODIFIED:
- `src/App.tsx` — remove `/assistant` route
- `src/lib/nav.ts` — remove AI Assistant nav item
- `package.json` — new scripts, updated workspaces
- `server-arapi/src/server.ts` — unchanged (all routes stay)
- `src-arapi/tauri.conf.json` — productName + identifier update

### DELETED:
- Nothing is deleted. `src/pages/AiAssistantPage.tsx` moves to `src-ar-web/pages/`.

---

*Last updated: 2026-06-17 — Author: Osvaldo Martini / Claude Code (Linux multiserver)*
