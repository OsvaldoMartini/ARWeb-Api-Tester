# ARWEB API Tester

A no-code **banking API testing** desktop application. Import real OpenAPI/Swagger
specs, map endpoints to business categories, ask a multi-agent banking assistant,
design **BotJobs** (command sequences), run them against a built-in mock server or a
real backend, and export reports.

- **Stack:** TypeScript + React + Vite + Tauri v2. **100% C#-free.**
- **No login.** The app opens straight into the workspace — no account, no auth gate.
- **Rust holds no business logic.** All logic lives in TypeScript; Rust is only the
  window shell + sidecar launcher.
- **Grounded in real specs.** A non-bypassable `RealApiCatalogValidator` guarantees
  tests, agents and AI generation can only reference endpoints/fields that exist in
  imported specs — nothing is invented.

---

## Prerequisites

- **Node.js 20+** and npm 10+
- **Rust** (stable) + Tauri prerequisites for your OS — see
  <https://v2.tauri.app/start/prerequisites/>
  - Windows: Microsoft C++ Build Tools + **WebView2** (preinstalled on Win 11)
  - macOS: Xcode Command Line Tools
  - Linux: `webkit2gtk`, `libayatana-appindicator`, etc.

> You can run the **web UI + engine** without Rust (`npm run dev`). Rust is only
> needed to build/run the native desktop window (`npm run tauri:dev`).

---

## Install

```bash
npm install
```

This installs all workspaces (apps + packages) in one go.

## Run (development)

**Browser + engine only** (fastest inner loop, no Rust needed):

```bash
npm run dev
```

- Node sidecar (the engine) → <http://127.0.0.1:8787>
- Desktop UI (Vite) → <http://localhost:1420>

**Native desktop window** (Tauri):

```bash
npm run tauri:dev
```

This builds the shared packages, starts the sidecar + Vite, and opens the app.

## Build (production)

```bash
npm run tauri:build
```

Generates a native installer. Before the first build, generate icons:

```bash
npx tauri icon path/to/icon.png
```

### Bundling the sidecar (no Node required on the client)

For a self-contained installer, the Node sidecar must be compiled to a single
executable and dropped at `src-tauri/binaries/arweb-sidecar-<target-triple>`
(declared as `bundle.externalBin` in `tauri.conf.json`). The Tauri shell spawns it
on launch and kills it on exit (`src-tauri/src/lib.rs`). Producing that binary
(via `node --experimental-sea-config`, `pkg`, or similar) is the one remaining
packaging step and is intentionally left as a follow-up — development works today
because `npm run dev` starts the engine from source.

---

## Useful scripts

| Script | What it does |
| --- | --- |
| `npm run build:packages` | Compile all `packages/*` (tsc project refs). |
| `npm run dev` | Sidecar + Vite together (no Rust). |
| `npm run tauri:dev` | Native window + sidecar + Vite. |
| `npm run tauri:build` | Native installer. |
| `npm run typecheck` | Whole-repo TypeScript check (`tsc -b`). |
| `npm run lint` / `npm run format` | ESLint / Prettier. |
| `npm run test` | Vitest. |

Configuration (ports, optional AI keys) lives in `.env` — copy `.env.example`.
**No key is required**: without one, the AI Assistant uses an offline fallback.

---

## Architecture & separation of concerns

A clean-architecture workspace. The two top-level pieces you deploy independently
sit at the root — `src/` (the web app) and `src-tauri/` (the desktop executable) —
with the engine in `server/`. Dependencies point **inward** (`domain` knows nothing
about anyone; UI/infra depend on the inner layers, never the reverse), so any
functionality can be swapped without touching the rest.

```
arweb-api-tester/
├── src/                    # React + Vite web app — deploy independently to a web server
│   ├── pages/  components/ store/  lib/
│   └── services/           # sidecarClient: the only place that talks to the engine
├── src-tauri/              # minimal Rust shell (window + engine launcher) — the executable
├── server/                 # Node engine: HTTP API wiring the packages — deploy independently
│
├── packages/               # shared TS libs, consumed by BOTH src/ and server/
│   ├── domain/             # pure entities + enums (zero dependencies)
│   ├── application/        # use cases, ports (interfaces), RealApiCatalogValidator
│   ├── infrastructure/     # adapters: OpenAPI import, persistence, HTTP, AI, reports
│   ├── api-testing-engine/ # BotJob execution engine, commands, assertions
│   ├── agents/             # 14 banking agents + router + capability map (Pilot 3)
│   ├── mock-server/        # local mock server (127.0.0.1)
│   ├── shared-ui/          # design tokens + framework-agnostic UI helpers
│   └── common/             # Result type, logger, id/sanitize utilities
│
├── public/                 # static web assets
├── index.html  vite.config.ts  tailwind.config.js  tsconfig.json  package.json
├── data/                   # demo-context.json, exports/
└── specifications/         # the source roadmap + pilot specs (reference)
```

**Independent deployment (your goal):** `src/` builds to static assets (`npm run build`
→ `dist/`) you can host anywhere; `server/` is a standalone Node process you host on
your app server; the web app talks to it over `/api`. The same `src/` + `server/` pair
is also what the Tauri desktop build bundles — nothing is duplicated.

**Where to change things:**

- New page → add an entry to `src/lib/nav.ts` + a component in `src/pages/`.
- New command type → `packages/api-testing-engine/src/commands/` (+ enum in domain).
- New banking agent → `packages/agents/src/agents/` (+ register in `registry.ts`).
- Swap storage (in-memory → SQLite) → implement the repository ports in
  `packages/infrastructure/src/persistence/` (see `sqlite-notes.md`); nothing else
  changes because callers depend on the `application` ports, not the implementation.
- Swap the engine transport (raw `http` → Fastify) → only `server/` changes; the web
  app talks to it through `src/services/sidecarClient.ts`.

### Why a separate Node engine?

Keeping the engine in TypeScript (not Rust) honors the "no business logic in Rust"
rule and lets the same code serve the web deploy and the packaged desktop app. The
web UI only ever calls `/api/*` (proxied to the engine), so UI and engine stay
cleanly decoupled — and each can be deployed and scaled on its own.

---

## Status

This is the **initial scaffold** (roadmap Phases 0–2 wired, later phases stubbed):
all 11 navigation pages exist and the engine runs out of the box with an in-memory
catalog. Import, catalog browsing, taxonomy, the AI assistant and the mock server
are functional end-to-end; the BotJob designer, execution audit-trail and report
export are present as structured placeholders ready to be filled in per the roadmap.
