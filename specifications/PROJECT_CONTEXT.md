# ARWeb API Tester — Project Context

> Goals, stack, architecture, phase completion status, and what to build next.
> Updated: 2026-06-05

---

## Product Vision

Desktop app for non-technical banking users to test REST APIs without code.
Final target: Tauri `.exe` installer — no Node.js or technical tooling required by the client.

**Stack:** React + TypeScript + Vite (frontend) | Node.js TypeScript sidecar (engine) | SQLite `better-sqlite3` (persistence) | Tauri v2 shell (packaging). **100% C#-free.**

---

## Repository

| | |
|---|---|
| **Path** | `D:\Projects_DevOps\ARWeb-Api-Tester` |
| **Branch** | `master` |
| **Dev (web only)** | `npm run dev` |
| **Dev (native window)** | `npm run tauri:dev` |
| **Build installer** | `npm run tauri:build` |
| **DB path (dev)** | `data/app.db` — auto-created; override with `DB_PATH` env var |
| **Sidecar port** | 8787 (localhost only); override with `SIDECAR_PORT` |
| **Mock server port** | 8855; override with `MOCK_SERVER_PORT` |

---

## Monorepo Architecture

```
src/                      React UI (11 pages)
server/src/               Node.js HTTP sidecar (port 8787, 127.0.0.1 only)
packages/
  domain/                 Pure TS entities — zero deps (innermost layer)
  application/            Use-cases + port interfaces (dependency inversion boundary)
  infrastructure/         SQLite repos, OpenAPI importer, HTTP executor, AI service, reports
  api-testing-engine/     BotJob execution engine
  agents/                 14 banking agents + BankingAgentRouter
  mock-server/            Localhost mock HTTP server
  shared-ui/              React design system tokens + utilities
  common/                 Logger, Result<T>, uuid, nowIso, sanitize
src-tauri/                Tauri v2 Rust shell (minimal — no business logic)
```

**Dependency flow (strict):** domain ← application ← infrastructure ← server ← React UI

**Core invariant:** `RealApiCatalogValidator` — every AI suggestion, agent plan, and BotJob command must reference only endpoints/fields that exist in the imported OpenAPI specs. Non-bypassable.

---

## Phase Completion Status

| Phase | Title | Status |
|---|---|---|
| 0 | Product Definition | ✅ Done |
| 1 | Tauri + React + Vite + Node sidecar | ✅ Done |
| 2 | TypeScript domain model | ✅ Done |
| **3** | **SQLite Persistence Layer** | **✅ Done — commit `0d7881d`** |
| **4** | **OpenAPI Import Engine** | **✅ Done — importer writes to SQLite via `CatalogWritePort`** |
| 5 | RealApiCatalogValidator | ✅ Done |
| 6 | Banking Taxonomy + Business Catalog UI | ⬜ Next candidate |
| 7 | Multi-Agent Banking Assistant | 🔶 Scaffolded — 14 agents + router exist and are wired to server |
| 8 | BotJob Engine | 🔶 ~70% — MVP commands done; IF/ELSE/LOOP/CSV/EXCEL/AI_GENERATE are stubs; needs `ExecutionRepository` wiring |
| 9 | Visual No-Code BotJob Designer | ⬜ UI stub only |
| 10 | Mock Server | ✅ Done |
| 11 | AI Layer (multi-provider) | ⬜ Offline stub only |
| 12 | Reports & Exports | ⬜ HTML/CSV/Bash exist; PDF, Postman, Excel pending |
| 13 | React UX polish | ⬜ Several pages are stubs |
| 14 | Security & Packaging | ⬜ |

---

## Port Interfaces (application layer — dependency inversion boundary)

```typescript
CatalogReadPort      // getEndpointById, findEndpointByMethodAndPath, getParameters, getOutputFields, listEndpoints
CatalogWritePort     // saveSpec, saveEndpoints, saveParameters, saveOutputFields, clearAll
BotJobRepository     // list, getById, getBlocks, getCommands, getVariables, save, remove
ExecutionRepository  // createRun, updateRun, addStepResult, listRuns, getStepResults
TaxonomyRepository   // listCategories, listSubcategories, seedIfEmpty, setEndpointCategory
SettingsRepository   // getAll, get, set, listAiProviders, upsertAiProvider
HttpExecutorPort     // send(HttpRequest) → HttpResponse
```

All implemented in `packages/infrastructure/src/persistence/sqlite/`.

---

## Key Source Locations

| What | Where |
|---|---|
| SQLite schema (19 tables) | `packages/infrastructure/src/persistence/sqlite/migrations.ts` |
| DB connection factory | `packages/infrastructure/src/persistence/sqlite/db.ts` |
| Catalog repository | `packages/infrastructure/src/persistence/sqlite/catalog.repository.ts` |
| BotJob repository | `packages/infrastructure/src/persistence/sqlite/botjob.repository.ts` |
| Execution repository | `packages/infrastructure/src/persistence/sqlite/execution.repository.ts` |
| Taxonomy repository | `packages/infrastructure/src/persistence/sqlite/taxonomy.repository.ts` |
| Settings repository | `packages/infrastructure/src/persistence/sqlite/settings.repository.ts` |
| Composition root | `server/src/bootstrap/container.ts` |
| HTTP sidecar routes | `server/src/server.ts` |
| OpenAPI importer | `packages/infrastructure/src/openapi/openapi-catalog-importer.ts` |
| BotJob engine | `packages/api-testing-engine/src/botjob-execution-engine.ts` |
| Catalog validator | `packages/application/src/validation/real-api-catalog-validator.ts` |
| 14 banking agents | `packages/agents/src/agents/` |
| Agent router | `packages/agents/src/banking-agent-router.ts` |
| Banking taxonomy seed | `packages/infrastructure/src/persistence/banking-taxonomy.seed.ts` |
| React pages | `src/pages/` (11 pages) |
| Tauri folder picker | `src/pages/ImportApisPage.tsx` — uses `@tauri-apps/plugin-dialog` |
| Sidecar SEA build | `scripts/build-sidecar.ps1` |

---

## Recommended Next Steps

### Option A — Phase 6: Banking Taxonomy UI (quickest visible win)
- `GET /taxonomy` currently returns static seed — update it to query `taxonomyRepo`
- Wire `BusinessCategoriesPage.tsx` (stub) to display live categories/subcategories from DB
- Add auto-mapping: after OpenAPI import, match endpoint tags/path keywords against category `keywords[]` and call `taxonomyRepo.setEndpointCategory()`
- Add `PUT /catalog/endpoints/:id/category` route

### Option B — Phase 8: BotJob Engine + Persistence
- Wire `SqliteExecutionRepository` into `BotJobExecutionEngine` constructor options
- Call `executionRepo.createRun()` → `addStepResult()` per step → `updateRun()` on finish
- Add server routes: `GET /botjobs`, `POST /botjobs`, `GET /executions`, `GET /executions/:runId/steps`
- Wire `BotJobDesignerPage.tsx` (stub) to save/load jobs
- Enable the disabled "Run" button on `ExecuteTestsPage.tsx`

### Option C — Phase 11: AI Layer
- Replace `AiProviderService` offline stub with real API calls (OpenAI, Anthropic, Ollama, etc.)
- `SqliteSettingsRepository` already stores encrypted AI provider configs
- Wire `SettingsPage.tsx` to add/edit/test AI providers

---

## Sidecar Build Note (Phase 14 concern)

`better-sqlite3` is a native Node.js addon (`.node` file). The `scripts/build-sidecar.ps1` bundles via Node.js SEA — native addons are incompatible with SEA as-is. For Phase 14, resolve by either:
- Adding `--external:better-sqlite3` to the esbuild step and shipping the `.node` file alongside the EXE
- Switching to `node-sqlite3-wasm` (pure WASM, SEA-compatible)

---

## Pilot Heritage

| Pilot | What was reused |
|---|---|
| Pilot 1 | BotJob engine, 33 command types, SQLite schema, banking taxonomy, CSV/Excel data-driven testing, execution audit trail |
| Pilot 2 | Mock server, AI runtime UX (floating prompt, app context builder), professional reports |
| Pilot 3 | 14 banking agents, multi-agent router, CapabilityMap, EvidenceBuilder, `RealApiCatalogValidator` |
