# ARCHITECTURE & FUNCTIONALITIES - PILOT 2

> **Project folder:** `D:\Projects_DevOps\ARWEB-API-Andrea-Context`
> **Solution name:** `ConversationalBankingMock.sln`

---

## 1. Executive Summary

Pilot 2 is an evolved conversational banking assistant focused on natural language interaction with banking APIs. It sits between Pilot 1 (full workbench) and Pilot 3 (base version) in terms of features. Its key differentiators are: a built-in mock HTTP server (localhost:8855), a standalone test runner service, a floating AI prompt window, a PromptRelay in-process event bus, an `AppContextBuilder` for AI system prompts, and a more complete WPF UI with dark banking theme. It shares the same no-invention core as Pilot 3 but adds significant runtime infrastructure on top.

---

## 2. Project Goal

**Problem solved:** Non-technical banking professionals need to verify that a set of banking REST APIs (Avaloq CAPI format) answers their business questions — without writing code. They also need to simulate the API responses locally before connecting to the real server.

**Intended user flow:**
1. Load a folder of OpenAPI/YAML specs → automatic endpoint catalog built in-memory
2. Browse the endpoint catalog visually with search and schema viewer
3. Use a chat interface to ask business questions in natural language
4. The system validates every answer against the real imported catalog (no-invention rule)
5. Optionally run a local mock HTTP server that replies with schema-correct fake data
6. Build and execute test flows (sequences of API calls)
7. Use a floating AI prompt window for ad-hoc queries and command execution
8. Generate professional PDF banking reports

**Target user:** Bank employee (internal, technical detail visible) or eBanking client (friendly mode, no JSON exposed).

---

## 3. Technical Stack

| Layer | Technology |
|---|---|
| Language | C# 12 |
| Runtime | .NET 8.0 (net8.0 / net8.0-windows) |
| UI Framework | WPF (Windows Presentation Foundation) with XAML |
| Database | SQLite via `Microsoft.Data.Sqlite` 8.0.0 (raw SQL, not EF Core) |
| OpenAPI Parsing | `Microsoft.OpenApi.Readers` 1.6.23 |
| Logging | Serilog 4.0.2 + Console + File sinks |
| AI Integration | Optional OpenAI (direct HTTP), Anthropic, Together, Custom |
| DI Container | `Microsoft.Extensions.DependencyInjection` 8.0.1 |
| Browser embedding | `Microsoft.Web.WebView2` 1.0.2739.15 (future use) |
| Build Tools | .NET CLI / MSBuild, Visual Studio 2022 |
| Nullable | Enabled |
| Implicit Usings | Enabled |
| PDF | Pure C# (no external library) |

---

## 4. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│  Presentation Layer — WPF Desktop (MVVM, dark banking theme)        │
│  MainWindow.xaml (6 tabs) / MainWindowViewModel.cs (1,000+ lines)  │
│  Additional Windows: FloatingPromptWindow, MockServerWindow,        │
│                      ClassificationVisualizerWindow                 │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ RelayCommand / INotifyPropertyChanged
┌──────────────────────────▼──────────────────────────────────────────┐
│  WPF Services Layer                                                 │
│  MockServerService   — HTTP listener on localhost:8855              │
│  TestRunnerService   — async test flow execution                    │
│  MockResponseGenerator — schema-aware fake response bodies          │
│  AppContextBuilder   — AI system prompt from live app state         │
│  ActionRegistry      — named command registry for AI integration    │
│  PromptRelay         — in-process event bus (singleton)             │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ Interfaces
┌──────────────────────────▼──────────────────────────────────────────┐
│  Core Layer (no external deps)                                      │
│  ChatbotService      — intent → plan → validate → format            │
│  RuleBasedIntentRecognizer — 12 banking intent templates            │
│  ApiPlanBuilder      — endpoint sequence composer                   │
│  RealApiCatalogValidator — no-invention enforcer                    │
│  SchemaAwareMockDataGenerator — heuristic fake values              │
│  ChatFormatting      — rule-based or LLM response formatter         │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────────┐
│  Infrastructure Layer                                               │
│  OpenApiCatalogImporter — parse .yaml/.json/.yml from folder       │
│  ApiCatalogDatabase    — SQLite (raw SQL): config + test_runs       │
│  SerilogBootstrap      — structured logging configuration           │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────────┐
│  Data Layer                                                         │
│  catalog.db (SQLite 16KB)  — configuration + test run history       │
│  RealApiCatalog (in-memory) — all endpoints, schemas, documents     │
│  ApiSpecs/ folder          — user-provided OpenAPI files            │
└─────────────────────────────────────────────────────────────────────┘
```

**Architectural style:** Layered (Core / Infrastructure / WPF-Services / Presentation). Clean separation between Core (pure business logic) and all external dependencies. WPF services sit between the Core and the UI, adding runtime capabilities (server, test runner, relay).

**Data flow (chat pipeline):**
```
User message
  → RuleBasedIntentRecognizer (12 keyword templates)
  → ApiPlanBuilder (build endpoint sequence from catalog)
  → RealApiCatalogValidator (strict no-invention check)
  → SchemaAwareMockDataGenerator (schema-based fake bodies)
  → ChatFormatting (rule-based Italian templates OR OpenAI reformatter)
  → ChatResponse (IsSupported, BusinessAnswer, SupportedByRealApis)
  → WPF chat tab (display + technical evidence panel)
```

---

## 5. Folder Structure Analysis

```
ARWEB-API-Andrea-Context/
├── .claude/settings.local.json
├── .gitignore
├── ApiSpecs/README.md
├── DB Queries/                            (empty)
├── deploy/
│   ├── net8.0/                            Console App binary
│   └── net8.0-windows/                   WPF + BlazorDesktop binaries
├── logs/                                  Serilog output
├── migrations/                           (reserved)
├── share/
│   └── ConversationalBankingMock_v2026-05-28/   Distribution package
├── specifications/
│   └── blazor-desktop-migration.md       Planned Blazor refactor roadmap
├── src/
│   ├── ConversationalBankingMock.App/
│   │   ├── .csproj
│   │   └── Program.cs                   Console REPL entry point
│   ├── ConversationalBankingMock.Core/
│   │   ├── .csproj                      No external NuGet deps
│   │   ├── Chat/ChatbotService.cs
│   │   ├── Formatting/ChatFormatting.cs
│   │   ├── IntentRecognition/RuleBasedIntentRecognizer.cs
│   │   ├── Interfaces/Interfaces.cs
│   │   ├── Models/
│   │   │   ├── ApiModels.cs             RealApiCatalog, ApiEndpoint, ApiSchema...
│   │   │   ├── PlanModels.cs            ApiExecutionPlan, IntentDefinition...
│   │   │   └── TestModels.cs
│   │   ├── Mocking/
│   │   │   ├── SchemaAwareMockDataGenerator.cs
│   │   │   └── TestDataGenerator.cs
│   │   ├── Planning/ApiPlanBuilder.cs
│   │   └── Validation/RealApiCatalogValidator.cs
│   ├── ConversationalBankingMock.Infrastructure/
│   │   ├── .csproj
│   │   ├── Database/ApiCatalogDatabase.cs   Raw SQL, 4 tables
│   │   ├── Logging/SerilogBootstrap.cs
│   │   └── OpenApiImport/OpenApiCatalogImporter.cs
│   ├── ConversationalBankingMock.Tests/
│   │   ├── .csproj
│   │   └── Program.cs                   5 no-invention regression tests
│   └── ConversationalBankingMock.Wpf/
│       ├── .csproj                      WebView2 dep included
│       ├── App.xaml / App.xaml.cs
│       ├── MainWindow.xaml / .cs        6-tab dark UI
│       ├── Commands/RelayCommand.cs
│       ├── Models/UiModels.cs
│       ├── Reporting/ProfessionalPdfReportExporter.cs
│       ├── Services/
│       │   ├── ActionRegistry.cs        AI command action registry
│       │   ├── AppContextBuilder.cs     System prompt from app state
│       │   ├── MockResponseGenerator.cs
│       │   ├── MockServerService.cs     HTTP listener localhost:8855
│       │   ├── PromptRelay.cs           In-process event bus
│       │   └── TestRunnerService.cs
│       ├── ViewModels/
│       │   ├── FloatingPromptViewModel.cs
│       │   ├── MainWindowViewModel.cs   1,000+ lines
│       │   ├── MockServerViewModel.cs
│       │   ├── ObservableObject.cs
│       │   └── TestRunsViewModel.cs
│       └── Views/
│           ├── ClassificationVisualizerWindow.xaml.cs
│           ├── FloatingPromptWindow.xaml.cs
│           └── MockServerWindow.xaml.cs
├── catalog.db
├── ConversationalBankingMock.sln
├── ConversationalBankingMock_v2026-05-28.zip
└── README.md
```

**Entry points:**
- Console: `src/ConversationalBankingMock.App/Program.cs`
- WPF: `src/ConversationalBankingMock.Wpf/App.xaml.cs`
- Tests: `src/ConversationalBankingMock.Tests/Program.cs` (`dotnet run`, not `dotnet test`)

---

## 6. Main Functionalities

| # | Feature | Description |
|---|---|---|
| 1 | OpenAPI import | Recursive folder parse (.yaml/.json/.yml), skip bin/obj/node_modules |
| 2 | Endpoint catalog | Searchable DataGrid with method, path, operationId, tags, schema viewer |
| 3 | Chat (bank employee mode) | Technical detail, API plan visible, limitations listed |
| 4 | Chat (eBanking client mode) | Friendly Italian, no JSON/endpoints exposed |
| 5 | No-invention enforcement | RealApiCatalogValidator blocks unsupported operations |
| 6 | Mock HTTP server | localhost:8855 — responds to any imported endpoint with fake JSON |
| 7 | Test flow builder | Add steps, run sequence, track pass/fail, store results in SQLite |
| 8 | Floating AI prompt window | Modeless chat with AI; can trigger app actions via ActionRegistry |
| 9 | API classification (AI tab) | Classify endpoint purpose using LLM with per-provider prompt templates |
| 10 | PDF report generation | 7 report types (Customer 360, Portfolio, Payments, Securities, Credit, Compliance, API Coverage) |
| 11 | 13 specialist agents (menu) | Banking specialist selector in chat sidebar |
| 12 | Demo prompts | Pre-loaded example questions per specialist role |
| 13 | Technical evidence panel | Debug view: full plan, schemas, validation status |
| 14 | Settings | API folder, DB path, OpenAI key/model, client name/ID, debug toggle |
| 15 | Multi-AI provider support | OpenAI, Anthropic, Together, Custom — configurable per-provider prompts |

---

## 7. API Testing Workflow

```
Phase 1 — Load
  Browse to folder containing OpenAPI specs
  → OpenApiCatalogImporter parses all .yaml/.json/.yml files recursively
  → RealApiCatalog built in-memory (endpoints, schemas, documents)

Phase 2 — Explore
  API Catalog tab: search by path/method/tag
  Schema viewer shows request/response structure
  Add endpoints to test flow directly from catalog

Phase 3 — Chat
  Type business question → ChatbotService pipeline
  Response includes: business answer + APIs used + limitations
  Technical evidence panel shows full plan (debug mode)

Phase 4 — Mock
  Start MockServerService on localhost:8855
  Point any HTTP client at the mock server
  Receives realistic schema-based fake responses

Phase 5 — Test
  Build test flow (ordered list of API steps)
  TestRunnerService executes each step asynchronously
  Results: HTTP status, response body, latency, pass/fail
  Stored in SQLite test_runs + test_cases tables

Phase 6 — Report
  Generate PDF report for any banking domain
  Select report type → PDF auto-opens
```

---

## 8. User Experience for Non-Technical Clients

- **Two-mode chat:** Bank employee (sees technical detail) vs eBanking client (plain language only)
- **Demo prompts:** Pre-loaded example questions prevent "blank page" problem
- **Specialist menu:** Banking specialist selector gives context without requiring technical knowledge
- **Floating AI window:** Accessible from anywhere in the app without switching tabs
- **Mock server status indicator:** Visual on/off toggle with port number
- **PDF reports:** One-click generation with professional banking layout
- **No code editor anywhere** — all interaction via forms, buttons, and chat
- **Serilog structured logging** — user never sees raw errors; logs go to file

---

## 9. Backend Analysis

**Core pipeline services (no external deps):**

| Service | Responsibility |
|---|---|
| `ChatbotService` | Orchestrates: intent → plan → validate → generate → format |
| `RuleBasedIntentRecognizer` | 12 intent templates, keyword matching, score-based selection |
| `ApiPlanBuilder` | Maps intent patterns to catalog endpoints, generates mock param values |
| `RealApiCatalogValidator` | Final gate: endpoint, parameter, and field existence check |
| `SchemaAwareMockDataGenerator` | Schema-aware fake values (heuristics for names, dates, amounts) |
| `ChatFormatting` | `RuleBasedChatResponseFormatter` (Italian templates) + `OpenAiChatResponseFormatter` (LLM) |

**WPF runtime services:**

| Service | Responsibility |
|---|---|
| `MockServerService` | `HttpListener` on port 8855; matches path → `MockResponseGenerator` → returns JSON |
| `TestRunnerService` | Async test flow executor with progress events and cancellation |
| `MockResponseGenerator` | Wraps `SchemaAwareMockDataGenerator` for HTTP server responses |
| `AppContextBuilder` | Builds AI system prompt from: app state, catalog endpoints, available actions |
| `ActionRegistry` | Named command registry (`nav_tab_catalog`, `run_flow`, etc.) for AI to trigger |
| `PromptRelay` | In-process singleton event bus: ForwardToChat, AddTestStep, TestProgressChanged, etc. |

**Intent recognition (12 intents):**
Customer360Report, PortfolioPositionsReport, PaymentReport, SecuritiesOrdersReport, PaymentSimulation, SecuritiesOrderSimulation, CreditLimitsCollateralReport, EBankingClientOverview, EBankingClientPayment, EBankingClientMessages, EBankingClientSecuritiesOrder, BankServicesReport, CapabilityQuestion

**AI integration:** Direct HTTP to provider API (no SDK). OpenAI as default formatter at `gpt-4o-mini` / `gpt-4.1-mini`. Safety check: response rejected if it looks technical (contains JSON brackets or endpoint names). Falls back to rule-based automatically.

---

## 10. Frontend Analysis

**WPF 6-tab dark banking UI (1,500×920 window):**

| Tab | Purpose |
|---|---|
| 1. Load APIs | Folder picker, import status, failed imports list |
| 2. API Catalog | Searchable grid, schema viewer, "add to test flow" button |
| 3. Classification API | AI-powered endpoint classification with per-provider prompts |
| 4. Chat | Specialist menu, demo prompts, conversation, evidence panel |
| 5. Reports | 7 PDF report buttons (Customer 360, Portfolio, etc.) |
| 6. Settings | Folder, DB path, OpenAI, client name/ID, debug toggle |

**Additional windows:**
- `FloatingPromptWindow` — modeless AI chat; sends commands back via `PromptRelay`
- `MockServerWindow` — server status, port, start/stop, request log
- `ClassificationVisualizerWindow` — API classification results visualization

**ViewModels:**
- `MainWindowViewModel` (1,000+ lines) — main orchestrator
- `FloatingPromptViewModel` — floating AI window logic
- `MockServerViewModel` — server state
- `TestRunsViewModel` — test result display

**Color scheme:** Dark navy/cyan/green/orange (ARWeb-inspired banking palette)

---

## 11. Data Model / Storage

**SQLite (catalog.db, 16KB — raw SQL, no EF Core):**

| Table | Purpose |
|---|---|
| `configuration` | Key-value store: API folder, mode toggles, AI keys, prompt templates, client identity |
| `test_runs` | Test run summary: name, status, total/passed/failed counts, start/end time |
| `test_cases` | Per-step result: method, path, request JSON, response JSON, HTTP status, latency |
| `prompt_commands` | AI action registry: key, label, description, category, enabled flag |

**Default configuration values:**
- `ApiSpecsFolder`: `C:\Users\apsof\OneDrive\Desktop\CAPI1`
- `IsBankEmployeeMode`: true
- `SimulatedClientName`: "Mario Rossi"
- `SimulatedClientId`: "BP-10001"
- `UseOpenAiResponseFormatter`: true
- `OpenAiModel`: "gpt-4.1-mini"

**In-memory catalog:** `RealApiCatalog` — loaded once at startup. Holds all endpoints, schemas, documents. Rebuilt on reimport.

**PDF output:** `Documents/ConversationalBankingMockExports/Reports/` (user Documents folder)

---

## 12. Configuration and Environment

**Environment variables (optional):**
```
OPENAI_API_KEY    — OpenAI API key (also settable via UI)
OPENAI_MODEL      — Default: gpt-4o-mini / gpt-4.1-mini
```

**No `appsettings.json`** — all configuration is SQLite-backed.

**Per-provider prompt templates** are stored in the `configuration` table (DB), editable via Settings tab at runtime.

**Mock server port:** Hardcoded to 8855 in `MockServerService`.

---

## 13. Security Considerations

- **No user authentication.** Single-user desktop application.
- **AI API keys stored in SQLite configuration table** (plaintext). Risk if `.db` is copied.
- **Mock server (localhost:8855) has no authentication** — accessible to any local process.
- **No TLS on mock server** — HTTP only; acceptable for local demo use.
- **`RealApiCatalogValidator`** prevents LLM hallucination from reaching the response — primary security boundary for data correctness.
- **OpenAI safety check:** Response rejected if it appears technical despite being in client mode.
- **No secrets in source code** — API keys read from DB or environment variables.

---

## 14. Strengths

1. **MockServerService** — most unique feature: a real HTTP server that serves realistic fake responses; allows integration testing without a live banking backend
2. **PromptRelay event bus** — clean decoupling of UI windows via a typed singleton bus; no cross-window direct references
3. **AppContextBuilder** — AI system prompt automatically reflects live catalog state and available actions; enables context-aware AI assistance
4. **ActionRegistry** — AI can trigger named app actions (navigate tab, run flow); bridges AI and UI
5. **TestRunnerService** — standalone async test executor with per-step progress events and cancellation
6. **FloatingPromptWindow** — modeless AI window accessible without losing context in main tabs
7. **ClassificationVisualizerWindow** — dedicated view for AI classification of endpoint purposes
8. **Dual-formatter** — safe LLM integration with automatic fallback; no wrong answer over no answer
9. **No-invention rule via Validator** — identical robustness to Pilot 1; prevents any invented API calls
10. **Release distribution in `share/`** — versioned zip packages alongside source; easy delivery to non-technical stakeholders
11. **WebView2 dependency** — foundation for embedding web UI components in future versions

---

## 15. Weaknesses and Risks

1. **No BotJob workflow engine** — no equivalent to Pilot 1's 33-command BotJob system; test flows are simple ordered lists without control flow
2. **In-memory-only catalog** — no SQLite persistence of imported endpoints; reimporting on every startup is slow for large catalogs
3. **Hardcoded default paths** — `C:\Users\apsof\OneDrive\Desktop\CAPI1` is machine-specific; causes startup errors on other machines
4. **Hardcoded mock server port 8855** — conflicts with other services; should be configurable
5. **No banking taxonomy** — no Pilot-1-style pre-seeded 25-category mapping; endpoints not organized by domain
6. **Raw SQL** in `ApiCatalogDatabase` (no ORM) — SQL written by hand; no migrations, no type safety
7. **12 hardcoded intent templates** — no DB-driven intent management; adding a new intent requires recompile
8. **MainWindowViewModel still too large** (1,000+ lines) — mixing chat, reports, classification, test runner in one class
9. **WPF Windows-only** — no cross-platform support
10. **No Excel/CSV data-driven testing** — no ClosedXML integration; test data is always schema-generated fake values

---

## 16. Best Ideas to Reuse

1. **`MockServerService`** — the most reusable component: a zero-config HTTP mock server driven by the imported catalog; extract as a standalone service
2. **`PromptRelay` event bus** — clean, typed, in-process message bus; extract as a shared library for any MVVM application
3. **`AppContextBuilder`** — dynamic AI system prompt that includes live app state and command registry; reuse in any AI-integrated tool
4. **`ActionRegistry`** — named app command registry consumable by AI; enables AI-to-UI action triggering
5. **`FloatingPromptViewModel` + `FloatingPromptWindow`** — reusable pattern for AI side-panel accessible from anywhere
6. **`TestRunnerService`** — async flow execution with per-step events and cancellation tokens; extract as standalone test executor
7. **`ProfessionalPdfReportExporter`** — pure C# PDF generation, Swiss banking style, 7 report types; extract as shared library
8. **`ChatFormatting` dual-formatter** — IChatResponseFormatter with rule-based fallback; portable pattern for safe LLM integration
9. **Release in `share/`** — versioned distribution model; good practice for delivering to non-technical stakeholders
10. **`ClassificationVisualizerWindow`** — AI classification UI; useful for endpoint governance workflows

---

## 17. Recommended Improvements

- **Persist the imported catalog in SQLite** — avoid full reimport on every startup; store endpoints, schemas, documents
- **Add banking taxonomy** from Pilot 1 — 25 pre-seeded categories improve organization for banking projects
- **Make mock server port configurable** — read from `ConfigurationSettings` table
- **Add control flow commands** to test flows — at minimum: IF/ELSE, LOOP, variable substitution
- **Fix hardcoded default paths** — prompt user on first launch instead
- **Migrate raw SQL to EF Core** — type-safe migrations, no hand-written SQL
- **Split ViewModels** — separate TestRunsViewModel, ReportsViewModel, ClassificationViewModel from MainWindowViewModel
- **Add endpoint persistence layer** — `ApiEndpoints` table in SQLite mirroring in-memory catalog
- **Encrypt AI API keys** in SQLite configuration

---

## 18. Final Evaluation

**Overall maturity:** Backend 85% / Frontend 70%

Pilot 2 is the most **complete and usable** of the three pilots from an end-user perspective. The mock server and floating AI window are genuinely useful innovations not found in the other pilots. It has the most polished UI and the widest feature breadth. Its main weakness compared to Pilot 1 is the absence of the BotJob workflow engine and the lack of banking taxonomy — the two features most critical for non-technical users to build reusable test cases.

**Rating:** ★★★★☆ (overall) / ★★★★★ (UX innovation)
