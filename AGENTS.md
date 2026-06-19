# AGENTS.md — ARWeb Monorepo

This file gives AI coding agents (Codex, Copilot, Claude, etc.) the context needed to
work effectively in this repository without re-deriving its structure from scratch.

---

## What this project is

Two separate desktop Windows applications built as a monorepo:

| App | Purpose | Tauri shell | Node sidecar | React frontend | Ports |
|---|---|---|---|---|---|
| **ARAPI Tester** | No-code REST API testing for banking staff | `src-arapi/` | `server-arapi/` | `src/` | UI: 5173, API: 8787 |
| **AR Conversational** | AI banking assistant (employee & client modes) | `src-ar/` | `server-ar/` | `src-ar-web/` | UI: 5174, API: 8788 |

Both apps share the same SQLite database at `%APPDATA%\ARWebShared\arweb.db` (production)
or `data/app.db` (dev fallback).

Target: Windows `.exe` installer (Tauri v2 + NSIS/MSI). **No C#, no .NET.**

---

## Repository layout

```
ARWeb-Api-Tester/
├── src/                     ARAPI Tester — React frontend (Vite, port 5173)
├── src-ar-web/              AR Conversational — React frontend (Vite, port 5174)
├── src-arapi/               ARAPI Tester — Tauri v2 Rust shell
├── src-ar/                  AR Conversational — Tauri v2 Rust shell
├── server-arapi/            ARAPI Tester — Node.js HTTP sidecar (port 8787)
├── server-ar/               AR Conversational — Node.js HTTP sidecar (port 8788)
├── packages/
│   ├── domain/              Pure TypeScript entities — no external deps
│   ├── application/         Use-cases + port interfaces (ports.ts)
│   ├── infrastructure/      SQLite repos, OpenAPI importer, HTTP executor, AI, reports
│   ├── api-testing-engine/  BotJob execution engine
│   ├── agents/              14 banking agents + BankingAgentRouter
│   ├── mock-server/         Fastify-like localhost mock HTTP server
│   ├── shared-ui/           React design-system tokens + utilities
│   └── common/              Logger, Result<T>, uuid, nowIso, sanitize
├── scripts/
│   ├── build-arapi.ps1      Full installer build for ARAPI Tester
│   ├── build-ar.ps1         Full installer build for AR Conversational
│   ├── build-sidecar.ps1    Node sidecar → exe (server-arapi)
│   └── build-sidecar-ar.ps1 Node sidecar → exe (server-ar)
├── docs/
│   └── progress.json        Separation roadmap status (phases 0-7, all done)
├── data/                    Dev SQLite DB (gitignored)
├── dist/                    ARAPI Tester Vite build output
├── dist-ar/                 AR Conversational Vite build output
├── index.html               ARAPI Tester Vite entry
├── vite.config.ts           ARAPI Tester Vite config
├── vite.config-ar.ts        AR Conversational Vite config
├── tsconfig.json            Root TypeScript config (references packages)
└── tsconfig.ar-web.json     TypeScript config for src-ar-web/
```

---

## Architecture — clean layers

```
React UI  →  Node sidecar (HTTP, localhost only)  →  packages/application (use-cases)
                                                   →  packages/infrastructure (SQLite, HTTP, AI)
                                                   →  packages/domain (entities)
```

**Invariant:** All AI suggestions and agent plans must reference only endpoints that exist
in the imported OpenAPI catalog. This is enforced by `RealApiCatalogValidator`
(`packages/application/src/validation/`).

**Rust holds no business logic.** The Tauri shells (`src-arapi/`, `src-ar/`) only:
1. Open the Chromium window (React frontend)
2. In production builds: spawn and kill the bundled Node sidecar

---

## Key packages

### packages/domain
Pure entities, no dependencies. Core types:
- `ApiEndpoint`, `ApiSpec`, `ApiParameter`, `ApiOutputField` — OpenAPI catalog
- `BotJob`, `BotJobBlock`, `BotJobCommand` — no-code test automation
- `ExecutionRun`, `ExecutionStepResult` — test run results
- `BusinessCategory`, `BusinessSubcategory` — 25 banking categories
- `AiProviderConfig` — multi-provider AI settings

### packages/application
Port interfaces (in `src/interfaces/ports.ts`):
- `CatalogReadPort`, `CatalogWritePort`
- `BotJobRepository`, `ExecutionRepository`
- `TaxonomyRepository`, `SettingsRepository`
- `HttpExecutorPort`

Use-cases: `ImportOpenApiUseCase`

### packages/infrastructure/src/persistence/sqlite
19-table SQLite schema. All repositories implement the application ports:
- `SqliteCatalogRepository`
- `SqliteBotJobRepository`
- `SqliteExecutionRepository`
- `SqliteTaxonomyRepository` — seeds 25 banking categories on first run
- `SqliteSettingsRepository`

Database: opened via `openDatabase(path)` (WAL mode, FK on, idempotent migrations).

### packages/agents
14 banking agents + router. Each agent extends `BaseAgent` and has a capability map:
- `RelationshipManagerAgent`, `CreditAndLendingAgent`, `CashAndPaymentsAgent`
- `PortfolioAdvisorAgent`, `ClientWealthAssistantAgent`, `SecuritiesTradingAgent`
- `ClientCreditAssistantAgent`, `ClientCashAssistantAgent`, `ClientTradingAssistantAgent`
- `BackOfficeOperationsAgent`, `ReportingAndCOOAgent`, `ComplianceAndRiskAgent`
- `AuditAndUATAgent`, `ClientMessagesAndDocumentsAgent`

`BankingAgentRouter` selects the right agent based on question intent.

---

## Dev commands

```bash
# ARAPI Tester (web only, no Tauri window)
npm run dev              # server-arapi :8787 + Vite :5173

# AR Conversational (web only, no Tauri window)
npm run dev:ar           # server-ar :8788 + Vite :5174

# Build TypeScript packages only
npm run build:packages

# Build frontends
npm run build            # ARAPI → dist/
npm run build:ar         # AR Conversational → dist-ar/

# Full installer builds (Windows, requires Rust + Tauri CLI)
pwsh scripts\build-arapi.ps1    # → src-arapi\target\release\bundle\
pwsh scripts\build-ar.ps1       # → src-ar\target\release\bundle\

# Or via npm
npm run installer:arapi
npm run installer:ar
```

---

## Build notes (important for Tauri)

- `tauri build` must be run **from within** each shell directory (`src-arapi/` or `src-ar/`),
  NOT from the repo root with `--config`. Running from root causes Tauri to compile the
  wrong Rust crate. The `build-*.ps1` scripts do `Push-Location` before calling tauri.
- `beforeBuildCommand` in `tauri.conf.json` runs from the **project root** (one level above
  the shell dir). Use plain `npm run build` / `npm run build:ar` — no `--prefix` needed.
- `better-sqlite3` is a native addon (`.node` file). It is excluded from esbuild and
  bundled alongside the exe by `@yao-pkg/pkg`. SEA (Node single executable) is NOT used.
- If you rename `src-arapi/` or `src-ar/`, run `cargo clean --release` inside the renamed
  dir — Cargo caches absolute paths and will break after a rename.
- The `import.meta` CJS warning from esbuild is expected and harmless (it's a warning,
  not an error). The sidecar still runs correctly.

---

## Sidecar API — server-arapi (port 8787)

All routes are plain JSON over HTTP, localhost only.

| Method | Route | Description |
|---|---|---|
| GET | `/health` | Liveness check |
| GET | `/catalog/endpoints` | List all imported endpoints |
| GET | `/catalog/specs` | List all imported OpenAPI specs |
| POST | `/import` | Import from folder path `{ folderPath }` |
| POST | `/import/upload` | Import uploaded files `{ files: [{name, content}] }` |
| GET | `/taxonomy` | List banking categories + subcategories |
| GET | `/botjobs` | List all BotJobs |
| POST | `/botjobs` | Create a BotJob |
| POST | `/botjobs/:id/run` | Execute a BotJob |
| GET | `/executions` | List execution runs |
| GET | `/settings` | Get all settings |
| POST | `/settings` | Upsert a setting |
| POST | `/assistant` | Chat with the app assistant (non-agent AI) |
| GET | `/separation/progress` | Returns `docs/progress.json` content |

## Sidecar API — server-ar (port 8788)

| Method | Route | Description |
|---|---|---|
| GET | `/health` | Liveness check |
| GET | `/catalog/endpoints` | Endpoints from shared SQLite |
| GET | `/agents` | List available banking agents |
| GET | `/agents/capabilities` | Agent capability map |
| POST | `/agents/ask` | Ask a banking agent `{ question, mode, agentId }` |
| GET | `/settings` | AI provider settings |
| POST | `/settings` | Upsert a setting |
| GET | `/separation/progress` | Returns `docs/progress.json` content |

---

## Coding conventions

- **TypeScript strict mode** throughout. No `any` without a comment.
- **ESM modules** (`"type": "module"` in all package.json files).
- **Result<T, E>** pattern from `@arweb/common` for fallible operations — no raw throws
  in domain/application layers.
- **Port interfaces** live in `packages/application/src/interfaces/ports.ts`. Add a new
  repository there before implementing it in infrastructure.
- **No business logic in Rust.** If you need to add Tauri commands, add them to `lib.rs`
  as thin wrappers only.
- React: functional components + hooks. State: Zustand stores in `src/store/` and
  `src-ar-web/store/`.
- Styling: Tailwind CSS. Design tokens in `packages/shared-ui/`.
- Tests: Vitest (`npm test`). E2E: Playwright (`npm run test:e2e`).

---

## What is NOT done yet (known stubs)

- `BotJobDesignerPage.tsx` — visual no-code designer (UI stub)
- `ExecuteTestsPage.tsx` — Run button not wired to `ExecutionRepository`
- AI layer (`packages/infrastructure/src/ai/`) — offline stub; real provider calls
  (OpenAI, Anthropic, Ollama) not yet implemented
- Reports: HTML/CSV/Bash exporters exist; PDF, Postman, Excel pending
- Several ARAPI Tester pages show placeholder content (EnvironmentsPage, MockServerPage)
