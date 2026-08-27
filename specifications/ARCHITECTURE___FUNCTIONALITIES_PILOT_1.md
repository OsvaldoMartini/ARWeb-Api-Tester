# ARCHITECTURE & FUNCTIONALITIES - PILOT 1

> **Project folder:** `D:\Projects_DevOps\ARWEB-API-Andrea`
> **Solution name:** `BankingApiWorkbench.sln`

---

## 1. Executive Summary

Pilot 1 is the most feature-complete and architecturally mature of the three pilots. It is a **full-cycle API testing workbench** for banking domain professionals, implemented as a Windows desktop application in C# / .NET 8. The application combines a clean-architecture backend with a multi-tab WPF frontend, a BotJob workflow engine with 33 command types, multi-AI-provider support, and a rich SQLite-backed data model covering the entire lifecycle from API import to test execution and HTML reporting. It is the closest to production-grade of the three pilots but has a partially complete UI layer.

---

## 2. Project Goal

**Problem solved:** Business analysts and QA testers in the banking domain need to validate REST APIs (such as Avaloq CAPI) without writing code. Existing tools (Postman, SoapUI) require technical skills and do not understand banking domain workflows.

**Intended user flow:**
1. Import OpenAPI/YAML spec files from a folder → automatic endpoint discovery
2. Browse endpoints organized by 25 banking business categories
3. Create business test cases mapped to real endpoints
4. Design BotJob workflows visually (no code) using drag-and-drop blocks and forms
5. Use AI assistance to auto-generate test data and complete BotJobs
6. Execute BotJobs against mock or live banking APIs
7. Review step-by-step results, request/response bodies, and pass/fail counts
8. Generate HTML reports and export CSV or Bash curl scripts

**Target user:** Business analyst, QA tester, or banking specialist — no programming knowledge required.

---

## 3. Technical Stack

| Layer | Technology |
|---|---|
| Language | C# 12 |
| Runtime | .NET 8.0 (net8.0 / net8.0-windows) |
| UI Framework | WPF (Windows Presentation Foundation) with XAML |
| ORM | Entity Framework Core 8.0.11 |
| Database | SQLite (embedded, file-based) |
| Excel I/O | ClosedXML 0.104.2 |
| Logging | None (Serilog not included in Pilot 1) |
| Test Framework | xUnit 2.9.2 |
| Build Tools | .NET CLI / MSBuild, Visual Studio 2022 |
| AI Providers | OpenAI, Anthropic Claude, Google Gemini, Azure OpenAI, Ollama (local), Together.ai |
| AI SDK | Direct HTTP (no official SDK) |
| Nullable | Enabled |
| Implicit Usings | Enabled |

---

## 4. Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│  WPF Presentation Layer                                          │
│  MainWindow.xaml (1,400+ lines) / MainViewModel.cs (1,200+ lines)│
│  11 feature tabs + 3-folder BotJob editor                        │
│  ARWeb light-grey/blue enterprise theme (XAML ResourceDictionary) │
└────────────────────────────┬─────────────────────────────────────┘
                             │ ICommand / ObservableCollection
┌────────────────────────────▼─────────────────────────────────────┐
│  Application Layer (Interfaces.cs)                               │
│  9 service interfaces + DTOs                                     │
│  IApiImportService, IDependencyService,                          │
│  IBusinessCatalogBuilder, IBotJobExecutionEngine,                │
│  IReportService, IAiTestDataService,                             │
│  IAiBotJobGeneratorService, ICsvExportService,                   │
│  IOpenAiPromptService                                            │
└────────────────────────────┬─────────────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────────┐
│  Infrastructure / Service Layer (Services.cs ~900 lines)         │
│  10 service implementations + BashScriptGeneratorService         │
│  RealApiCatalogValidator (no-invention enforcement)              │
└────────────────────────────┬─────────────────────────────────────┘
                             │ EF Core DbContext
┌────────────────────────────▼─────────────────────────────────────┐
│  Data Access Layer (WorkbenchDbContext.cs)                        │
│  15+ DbSet<T> — SQLite file: banking-api-workbench.db            │
└────────────────────────────┬─────────────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────────┐
│  Domain Layer (Entities.cs ~350 lines)                           │
│  Pure C# sealed classes — no EF, no UI dependencies             │
└──────────────────────────────────────────────────────────────────┘
```

**Architectural style:** Clean Architecture with four concentric layers. Dependency rule strictly respected: Domain has no external references; Application only references Domain; Infrastructure references Application+Domain; Presentation references all layers via DI.

**DI container:** No explicit `IServiceProvider` setup detected; services are instantiated directly inside `MainViewModel`. This is the main architectural shortcoming.

---

## 5. Folder Structure Analysis

```
ARWEB-API-Andrea/
├── .claude/settings.local.json          Claude Code tool permissions
├── docs/
│   ├── ARCHITECTURE.md
│   └── USER_MANUAL.md
├── samples/
│   └── banking-sample.openapi.yaml      Sample Avaloq CAPI spec
├── src/
│   ├── BankingApiWorkbench.Application/
│   │   ├── BankingApiWorkbench.Application.csproj
│   │   └── Interfaces.cs                9 interfaces + DTOs (89 lines)
│   ├── BankingApiWorkbench.Domain/
│   │   ├── BankingApiWorkbench.Domain.csproj
│   │   └── Entities.cs                  15+ sealed entity classes (350 lines)
│   ├── BankingApiWorkbench.Infrastructure/
│   │   ├── BankingApiWorkbench.Infrastructure.csproj
│   │   ├── BankingTaxonomy.cs           25 categories × 5 subcategories + keywords
│   │   ├── Services.cs                  10 service implementations (~900 lines)
│   │   └── WorkbenchDbContext.cs        EF Core DbContext (220 lines)
│   ├── BankingApiWorkbench.Tests/
│   │   ├── BankingApiWorkbench.Tests.csproj
│   │   ├── AiSettingsE2ETests.cs
│   │   └── FrameworkTests.cs
│   └── BankingApiWorkbench.Wpf/
│       ├── BankingApiWorkbench.Wpf.csproj
│       ├── App.xaml / App.xaml.cs       Startup, splash screen, DB init
│       ├── MainWindow.xaml              1,400+ lines, 11-tab layout
│       ├── MainWindow.xaml.cs
│       ├── SplashWindow.xaml/.cs        Loading screen with progress steps
│       ├── Resources/ARWebTheme.xaml    Full XAML design system (color tokens)
│       └── ViewModels/MainViewModel.cs  1,200+ lines — all feature logic
├── BankingApiWorkbench.sln
├── banking-api-workbench.db             SQLite database (runtime)
├── README.md
├── ROADMAP.md
├── ARCHITECTURE.md
├── USER_MANUAL.md
├── HOW_TO_EXECUTE_TEST_CASE.md
├── BOTJOB_THREE_FULL_PAGE_FOLDERS.md   Detailed UI mockup for BotJob editor
└── BOTJOB_VISUAL_IMPROVEMENTS.md       Visual design guidelines
```

**Entry point:** `App.xaml.cs::OnStartup` → splash screen → DB init → seed → `MainWindow`

**Core business logic:** `Services.cs` (Infrastructure) + `Entities.cs` (Domain)

---

## 6. Main Functionalities

| # | Feature | Status |
|---|---|---|
| 1 | Import banking OpenAPI specs (YAML/JSON) from folder | Complete |
| 2 | Auto-categorize endpoints into 25 banking domains | Complete |
| 3 | Create business test cases (mapped to real endpoints) | Complete |
| 4 | BotJob workflow designer (3-folder UI) | Partially implemented |
| 5 | 33 BotJob command types (API call, assert, loop, AI, Excel…) | Backend complete, UI stubs |
| 6 | AI test data generation (6 providers) | Complete |
| 7 | AI BotJob generation (4-step wizard) | Complete |
| 8 | BotJob execution engine with step-by-step results | Complete |
| 9 | HTML report generation | Complete |
| 10 | CSV export (endpoints, test cases, commands) | Complete |
| 11 | Bash curl script export for CI/CD | Complete |
| 12 | Excel/CSV data-driven testing (ClosedXML) | Complete |
| 13 | Reusable component library (CALL_COMPONENT) | Complete |
| 14 | Variable substitution via JSON path extraction | Complete |
| 15 | Multi-AI provider management (UI configuration) | Complete |

---

## 7. API Testing Workflow

```
1. Import
   User selects folder → ApiImportService parses YAML/JSON files
   → Upsert endpoints/parameters/output fields/dependencies into SQLite

2. Categorize
   BusinessCatalogBuilder auto-maps endpoints to 25 banking categories
   via keyword matching (BankingTaxonomy)

3. Test Case Creation
   User selects category/subcategory → template generated
   Marked "Mapped" if real endpoints exist, "Not mapped" if missing

4. BotJob Design (no-code)
   Block structure (visual groups) → Commands inside blocks
   Command types: API_CALL, SET_VARIABLE, ASSERT_STATUS_CODE,
   ASSERT_FIELD_VALUE, LOOP, FOR_EACH, IF/ELSE, READ_EXCEL, etc.

5. Validation (RealApiCatalogValidator)
   Every API_CALL must reference an imported endpoint ID
   Wizard injects real endpoint list into AI prompts to prevent invention

6. Execution (BotJobExecutionEngine)
   Resolve variables → execute commands in order
   Real HTTP calls or mock responses
   Track: status, request JSON, response JSON, duration, pass/fail

7. Reporting
   HTML report per test case
   CSV export of full run
   Bash script for offline execution
```

---

## 8. User Experience for Non-Technical Clients

- All configuration via WPF forms (no YAML/JSON editing)
- 25 pre-loaded banking domain categories with human-readable names
- BotJob commands described in business terms ("Call API", "Check field equals", "Repeat for each item")
- AI generates test data and full BotJob from a plain text test case description
- Splash screen with progress steps at startup
- Tabs organized by workflow stage (Import → Catalog → Test Cases → BotJob → Execute → Reports)
- Results shown as pass/fail counts with color indicators

---

## 9. Backend Analysis

**Services implemented (Services.cs ~900 lines):**

| Service | Responsibility |
|---|---|
| `ApiImportService` | Parse OpenAPI YAML/JSON, upsert to EF Core, infer dependency graph |
| `DependencyService` | Build endpoint dependency graph from resource naming patterns |
| `BusinessCatalogBuilder` | Keyword-based auto-mapping of endpoints to 25 banking categories |
| `BotJobExecutionEngine` | Async command-by-command execution, variable resolution, HTTP calls |
| `ReportService` | HTML report generation per test case/run |
| `AiTestDataService` | LLM call → JSON test payload for selected endpoint |
| `AiBotJobGeneratorService` | LLM call → structured BotJob (blocks + commands) for test case |
| `CsvExportService` | Export to CSV using EF Core data |
| `OpenAiPromptService` | Optimize prompts by injecting real endpoint list |
| `BashScriptGeneratorService` | Convert BotJob commands to curl bash script |

**RealApiCatalogValidator:** Ensures every `API_CALL` command references a real imported endpoint by ID. This is the core enforcement mechanism.

**HTTP execution:** Direct `HttpClient` calls to configured base URL. No mock interception in the execution engine itself.

**Database migration strategy:** `ApplyPendingSchemaChangesAsync()` — adds new tables (e.g., `AiProviderSettings`) without running destructive `EnsureCreated`. One-time GUID→INTEGER PK migration for API catalog.

---

## 10. Frontend Analysis

**Framework:** WPF (Windows Presentation Foundation), XAML, MVVM

**MainWindow.xaml (1,400+ lines)** — 11 tabs:
1. Import Specs
2. Endpoint Catalog
3. Business Categories
4. Test Cases
5. BotJob Folder 1 — Block Structure
6. BotJob Folder 2 — API Toolbox
7. BotJob Folder 3 — Properties/Controls
8. Components Library
9. Execution & Monitoring
10. Reports
11. Configuration

**MainViewModel.cs (1,200+ lines):** All business logic wired to UI. Single ViewModel for all 11 tabs — this is the largest architectural weakness. MVVM binding uses `ObservableCollection<T>` for all lists.

**ARWebTheme.xaml:** Complete XAML design system with color tokens (light grey, blue headers, borders). Applied via `ResourceDictionary`.

**SplashWindow:** Loading progress at startup with 6 sequential steps (0% → 100%).

**UI Pattern:** No drag-and-drop implemented despite being listed in ROADMAP. Most form validation is stubbed. Command property editors are placeholder controls.

---

## 11. Data Model / Storage

**SQLite file:** `banking-api-workbench.db` (co-located with executable)

**EF Core tables (15+):**

| Table | Purpose |
|---|---|
| ApiSpecs | Source OpenAPI file metadata |
| ApiEndpoints | HTTP operations (method + path + operationId) |
| ApiParameters | Input fields per endpoint |
| ApiOutputFields | Response JSON paths |
| ApiDependencies | Inferred sequencing relationships |
| BusinessCategories | 25 banking domain categories |
| BusinessSubcategories | 5 subcategories per category (125 total) |
| BusinessTestCases | Test case templates linked to categories |
| BotJobs | Workflow definitions |
| BotJobBlocks | Ordered logical groupings |
| BotJobCommands | Individual commands (33 types) |
| Components | Reusable block templates |
| ComponentCommands | Commands within a component |
| BotVariables | Runtime variable definitions |
| DataSetDefinitions | Excel/CSV file references |
| ExecutionRuns | Test run records (pass/fail counts, timing) |
| ExecutionStepResults | Per-command result (request, response, status, duration) |
| ConfigurationSettings | App settings (base URL, env name) |
| AiProviderSettings | LLM provider configs (key, model, base URL) |

**No in-memory-only catalog.** All state is persisted in SQLite. The catalog (endpoints, parameters, schemas) is the full EF Core object graph.

---

## 12. Configuration and Environment

**AI provider configuration (stored in SQLite):**
- OpenAI: `https://api.openai.com/v1`, model `gpt-4o`
- Anthropic Claude: `https://api.anthropic.com/v1`, model `claude-sonnet-4-6`
- Google Gemini: `https://generativelanguage.googleapis.com/v1beta`
- Azure OpenAI: custom deployment
- Ollama (local): `http://localhost:11434/api`, model `llama3.2`
- Together.ai: hosted open-source models

**Environment URL:** Stored in `ConfigurationSettings` table. Set via UI Configuration tab.

**Startup flow:**
1. `App.xaml.cs::OnStartup` → splash screen
2. `WorkbenchDbContext.EnsureCreatedAsync` → `ApplyPendingSchemaChangesAsync`
3. Seed AI provider defaults and 25 banking categories (if empty)
4. Load all collections into ViewModel
5. Show MainWindow

**No appsettings.json** — all configuration is DB-stored.

**Secrets:** AI API keys stored in SQLite (plaintext, local only).

---

## 13. Security Considerations

- **No user authentication.** Single-user Windows desktop. No login/logout.
- **AI API keys stored in plaintext SQLite** — acceptable for local desktop but must be encrypted if the `.db` file is ever shared or backed up.
- **No HTTPS enforcement** for target API calls (configurable base URL; no certificate pinning).
- **Bash script export** may expose environment tokens if committed to version control.
- **No input sanitization** for the BotJob name, category name, or variable name fields visible in the DB.
- `RealApiCatalogValidator` prevents LLM-injected fake endpoints — the most important security boundary.

---

## 14. Strengths

1. **Richest data model** — 15+ EF Core tables cover the entire test lifecycle; no data is lost between sessions
2. **33 command types** — most complete BotJob language of the three pilots
3. **Multi-AI pluggability** — 6 providers configurable at runtime via UI; no code change required
4. **Banking taxonomy pre-loaded** — 25 categories × 5 subcategories with keyword maps; zero configuration for banking projects
5. **No-invention enforcement** — `RealApiCatalogValidator` is the cleanest implementation across all pilots
6. **ClosedXML integration** — data-driven testing from Excel/CSV without any third-party server
7. **Bash script export** — BotJobs become executable shell scripts; enables CI/CD integration
8. **Variable substitution engine** — JSON path extraction (`$.transactions[0].amount`) for complex chaining
9. **Full audit trail** — `ExecutionRuns` + `ExecutionStepResults` give immutable, queryable history
10. **xUnit test suite** — only pilot using a standard test framework
11. **Comprehensive documentation** — README, ARCHITECTURE, ROADMAP, USER_MANUAL, HOW_TO guides

---

## 15. Weaknesses and Risks

1. **WPF UI only 30–40% complete** — most tabs are scaffolded; drag-and-drop, form validation, and property editors are stubs
2. **MainViewModel is 1,200 lines** — all 11 feature tabs wired in one class; untestable and unmaintainable at scale
3. **No DI container** — services instantiated directly inside ViewModel; prevents clean unit testing
4. **Windows-only** — WPF cannot run on macOS or Linux; blocks non-Windows users entirely
5. **Heuristic dependency detection** — resource-name matching is fragile; will fail on non-standard API naming conventions
6. **AI API keys in plaintext SQLite** — risk if database file is copied or backed up to shared storage
7. **Hardcoded default paths** in seeding logic (taxonomy names, provider URLs)
8. **No versioning of BotJob definitions** — no rollback, no change history
9. **No multi-user** — shared SQLite, no locking, no collaboration features
10. **Incomplete error handling** — many catch blocks swallow exceptions silently

---

## 16. Best Ideas to Reuse

1. **`RealApiCatalogValidator`** — extract as reusable validation package; the cleanest implementation
2. **`BankingTaxonomy`** — 25 categories + keyword auto-mapping; reuse directly for banking projects
3. **Multi-AI provider pattern** — `AiProviderSetting` record + direct HTTP calls; provider-agnostic at runtime
4. **33 command type taxonomy** — `CommandTypes` static class; extensible without enum changes
5. **`BotJobExecutionEngine`** — async command executor with variable resolution; core engine for the final version
6. **`AiTestDataService`** + **`AiBotJobGeneratorService`** — LLM-powered generation with real endpoint injection
7. **`ClosedXML` data-driven testing** — Excel/CSV-based test datasets
8. **`ExecutionRun` + `ExecutionStepResult` schema** — immutable audit trail with request/response capture
9. **`BashScriptGeneratorService`** — output BotJob as shell script; enables CI/CD pipeline integration
10. **ARWeb XAML theme** — light-mode enterprise design system; portable to WPF, Blazor, or web CSS

---

## 17. Recommended Improvements

- **Complete the WPF UI** or migrate to a web frontend (React/Blazor) — most features are backend-complete
- **Split MainViewModel** into per-tab ViewModels wired by a navigation service
- **Add Microsoft.Extensions.DependencyInjection** and register all services at startup
- **Encrypt AI API keys** in SQLite using DPAPI or a secrets manager
- **Replace heuristic dependency detection** with semantic LLM-based analysis
- **Add BotJob versioning** — store diffs per save; enable rollback
- **Add CI/CD export** — generate GitHub Actions YAML or Jenkins pipeline in addition to Bash
- **Consider web UI** — React + .NET API backend would break the Windows-only limitation
- **Add per-field form validation** — currently stubs in most editors

---

## 18. Final Evaluation

**Overall maturity:** Backend 95% / Frontend 35%

Pilot 1 is the **engineering reference** for the final version. It has the most complete domain model, the most command types, the best separation of concerns in backend layers, and the only standard test framework. The WPF UI, while visually structured, is far from feature-complete and is architecturally monolithic. The path forward is to extract the backend services and domain model from this project and pair them with a modern web or cross-platform frontend.

**Rating:** ★★★★☆ (backend) / ★★☆☆☆ (frontend completeness)
