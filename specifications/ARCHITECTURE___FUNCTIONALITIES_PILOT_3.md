# ARCHITECTURE & FUNCTIONALITIES - PILOT 3

> **Project folder:** `D:\Projects_DevOps\ARWEB-API-Andrea-TOP`
> **Solution name:** `ConversationalBankingMock.sln`

---

## 1. Executive Summary

Pilot 3 is the current "TOP" workspace — the designated target for the final merged product. It shares the same conversational banking assistant foundation as Pilot 2 but has a smaller feature surface (no mock server, no floating AI window, no test runner service). It compensates with a more refined multi-agent architecture: 14 specialized banking agents (9 employee + 5 client) with an explicit router and capability map. It is the cleanest codebase of the three, with the clearest separation of agent responsibilities, and is the natural integration point for features pulled in from Pilots 1 and 2.

---

## 2. Project Goal

**Problem solved:** Non-technical banking professionals (and simulated eBanking clients) need to ask questions about banking API capabilities in natural language and receive validated, realistic answers — with zero possibility of receiving invented data.

**Intended user flow:**
1. Load OpenAPI/YAML specs from a folder → in-memory catalog built
2. Select a banking specialist role (bank employee or eBanking client)
3. Ask a business question in natural language
4. The system routes to the matching specialized agent
5. Agent validates against the catalog, builds a mock execution plan, and returns a response
6. User can generate PDF banking reports or view the API catalog
7. Optionally use OpenAI to reformat responses to natural language

**Target user:** Bank employee (technical detail visible), eBanking client (plain language, no JSON exposed), or API architect evaluating Avaloq CAPI coverage.

---

## 3. Technical Stack

| Layer | Technology |
|---|---|
| Language | C# 12 |
| Runtime | .NET 8.0 (net8.0 / net8.0-windows) |
| UI Framework | WPF (Windows Presentation Foundation) with XAML |
| Database | SQLite via EF Core (`Microsoft.EntityFrameworkCore.Sqlite` 8.0.11) |
| OpenAPI Parsing | `Microsoft.OpenApi.Readers` 1.6.23 |
| Logging | Serilog 4.0.2 + Console + File sinks |
| DI Container | `Microsoft.Extensions.DependencyInjection` 8.0.1 |
| AI Integration | Optional OpenAI (direct HTTP), Anthropic, Together, Custom |
| Build Tools | .NET CLI / MSBuild, Visual Studio 2022 |
| Nullable | Enabled |
| Implicit Usings | Enabled |
| PDF | Pure C# (no external library) |

---

## 4. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│  Presentation Layer — WPF Desktop (dark banking theme, MVVM)        │
│  MainWindow.xaml + MainWindowViewModel.cs                           │
│  Tabs: Load APIs | API Catalog | Chat | Reports | Settings          │
└─────────────────────────┬───────────────────────────────────────────┘
                          │ RelayCommand / INotifyPropertyChanged
┌─────────────────────────▼───────────────────────────────────────────┐
│  Core Layer — Business Logic (no external deps)                     │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────┐        │
│  │  BankingAgentRouter                                     │        │
│  │  Selects 1 of 14 specialized agents by intent          │        │
│  │  Agents/                                               │        │
│  │  Employee: RelationshipManager, PortfolioAdvisor,      │        │
│  │            CashAndPayments, SecuritiesTrading,         │        │
│  │            CreditAndLending, ComplianceAndRisk,        │        │
│  │            BackOfficeOperations, ReportingAndCOO,      │        │
│  │            AuditAndUAT                                 │        │
│  │  Client:   ClientWealthAssistant, ClientCashAssistant, │        │
│  │            ClientTradingAssistant,                     │        │
│  │            ClientCreditAssistant,                      │        │
│  │            ClientMessagesAndDocuments                  │        │
│  └─────────────────────────────────────────────────────────┘        │
│                                                                     │
│  ChatbotService → IntentRecognizer → ApiPlanBuilder                 │
│  → RealApiCatalogValidator → MockDataGenerator → ChatFormatting     │
│  CapabilityMap → EvidenceBuilder → Orchestrator                     │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────────┐
│  Infrastructure Layer                                               │
│  OpenApiCatalogImporter — parse .yaml/.json/.yml                   │
│  SerilogBootstrap       — structured logging                        │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────────┐
│  Data Layer                                                         │
│  EF Core Sqlite (chat history persistence)                          │
│  RealApiCatalog (in-memory: endpoints, schemas, documents)          │
│  ApiSpecs/ folder (user-provided OpenAPI files)                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Key architectural difference from Pilots 1 and 2:** The multi-agent router pattern. Instead of a single `ChatbotService` handling all intents, Pilot 3 decomposes responsibility across 14 specialized agents, each with its own domain knowledge and endpoint patterns. The `BankingAgentRouter` selects the correct agent, and the `Orchestrator` manages the multi-step execution.

---

## 5. Folder Structure Analysis

```
ARWEB-API-Andrea-TOP/
├── .claude/settings.local.json
├── .gitignore                         (created in this session)
├── ApiSpecs/
│   ├── README.md
│   └── sample-avaloq-capi.yaml        Sample Avaloq CAPI spec
├── ConversationalBankingMock/         Legacy nested directory — DO NOT EDIT
│   ├── ConversationalBankingMock.sln
│   └── src/
├── specifications/                    (created in this session)
├── src/
│   ├── ConversationalBankingMock.App/
│   │   ├── .csproj
│   │   └── Program.cs                Console REPL (dotnet run --specs=./ApiSpecs)
│   ├── ConversationalBankingMock.Core/
│   │   ├── .csproj                   No external NuGet deps
│   │   ├── Agents/
│   │   │   ├── BankingAgentRouter.cs
│   │   │   ├── Orchestrator.cs
│   │   │   ├── CapabilityMap.cs
│   │   │   ├── EvidenceBuilder.cs
│   │   │   └── [9 employee + 5 client agent files]
│   │   ├── Chat/ChatbotService.cs
│   │   ├── DemoData/
│   │   │   ├── DemoBankingContext.cs
│   │   │   └── DemoBankingContextService.cs
│   │   ├── Formatting/ChatFormatting.cs
│   │   ├── IntentRecognition/RuleBasedIntentRecognizer.cs
│   │   ├── Interfaces/Interfaces.cs
│   │   ├── Mocking/SchemaAwareMockDataGenerator.cs
│   │   ├── Models/
│   │   │   ├── ApiModels.cs
│   │   │   └── PlanModels.cs
│   │   ├── Planning/ApiPlanBuilder.cs
│   │   └── Validation/RealApiCatalogValidator.cs
│   ├── ConversationalBankingMock.Infrastructure/
│   │   ├── .csproj
│   │   ├── Logging/SerilogBootstrap.cs
│   │   └── OpenApiImport/OpenApiCatalogImporter.cs
│   ├── ConversationalBankingMock.Tests/
│   │   ├── .csproj
│   │   └── Program.cs               Custom test runner (dotnet run, not dotnet test)
│   └── ConversationalBankingMock.Wpf/
│       ├── .csproj                  EF Core Sqlite + WebView2
│       ├── App.xaml / App.xaml.cs
│       ├── MainWindow.xaml / .cs
│       ├── Commands/RelayCommand.cs
│       ├── Data/
│       │   ├── BankingDbContext.cs
│       │   ├── DatabaseSeeder.cs
│       │   └── DemoBankingContext.json
│       ├── Models/UiModels.cs
│       ├── Reporting/ProfessionalPdfReportExporter.cs
│       └── ViewModels/
│           ├── MainWindowViewModel.cs
│           └── ObservableObject.cs
├── CLAUDE.md                          (created in this session)
├── ConversationalBankingMock.sln
└── README.md
```

**Entry points:**
- Console: `src/ConversationalBankingMock.App/Program.cs` — `dotnet run --project src/ConversationalBankingMock.App -- --specs=./ApiSpecs`
- WPF: `src/ConversationalBankingMock.Wpf/App.xaml.cs` — `dotnet run --project src/ConversationalBankingMock.Wpf`
- Tests: `src/ConversationalBankingMock.Tests/Program.cs` — `dotnet run --project src/ConversationalBankingMock.Tests`

**Pre-built binaries:** `src/ConversationalBankingMock.Wpf/bin/Release/net8.0-windows/ConversationalBankingMock.Wpf.exe`

---

## 6. Main Functionalities

| # | Feature | Description |
|---|---|---|
| 1 | OpenAPI import | Recursive folder parse, skip bin/obj/node_modules/.git |
| 2 | Endpoint catalog | Searchable grid with method, path, operationId, tags, schema viewer |
| 3 | Multi-agent chat | BankingAgentRouter selects 1 of 14 specialized agents |
| 4 | No-invention enforcement | RealApiCatalogValidator blocks unsupported operations |
| 5 | Bank employee mode | Technical detail, API plan visible, limitations listed |
| 6 | eBanking client mode | Friendly Italian, no JSON/endpoints exposed |
| 7 | Demo banking context | DemoBankingContextService provides simulated client data |
| 8 | Mock data generation | Schema-aware fake values for request/response bodies |
| 9 | PDF report generation | 7 report types (Customer 360, Portfolio, Payments, Securities, Credit, Compliance, API Coverage) |
| 10 | Settings | API folder, DB path, OpenAI integration toggle, client identity |
| 11 | Capability map | CapabilityMap class shows which endpoints each agent can use |
| 12 | Evidence builder | EvidenceBuilder attaches real endpoint references to responses |
| 13 | Console REPL | Full pipeline accessible without WPF (for scripting/testing) |
| 14 | Regression tests | 9 agent routing tests + 5 no-invention tests (custom runner) |

---

## 7. API Testing Workflow

```
Phase 1 — Load
  Select folder → OpenApiCatalogImporter parses all specs
  → RealApiCatalog built in-memory

Phase 2 — Explore
  API Catalog tab: search by path/method/tag
  Schema viewer shows request/response structure

Phase 3 — Converse
  User selects specialist agent (banking role selector in UI)
  Types question → BankingAgentRouter picks correct agent
  Agent: intent → plan → validate → mock → format
  Response includes: business answer, APIs used, limitations

Phase 4 — Report
  Select report type → ProfessionalPdfReportExporter
  PDF auto-opens (7 banking report templates)

Phase 5 — Verify (automated)
  dotnet run --project Tests
  Runs 9 routing tests + 5 no-invention regression tests
```

---

## 8. User Experience for Non-Technical Clients

- **14 named specialist agents** — user selects their banking role (portfolio advisor, client assistant, etc.)
- **Two conversation modes** — automatic mode switch between employee and client personas
- **Demo banking context** — pre-loaded simulated client data (Mario Rossi, BP-10001) for realistic demos
- **Limitations always shown** — user explicitly told which requests cannot be fulfilled and why
- **PDF reports** — one-click banking-quality reports without any data input
- **No code editor** — entire interaction via chat and buttons
- **Console REPL** — alternative access for power users or scripting scenarios
- **Dark enterprise theme** — professional ARWeb-inspired navy/cyan/green/orange palette

---

## 9. Backend Analysis

**Core agents (src/ConversationalBankingMock.Core/Agents/):**

| Component | Responsibility |
|---|---|
| `BankingAgentRouter` | Selects the appropriate agent based on recognized intent and user mode |
| `Orchestrator` | Manages multi-step agent execution; assembles final response |
| `CapabilityMap` | Declares which endpoint patterns each agent owns |
| `EvidenceBuilder` | Attaches real endpoint references and schema evidence to response |
| `RelationshipManager` | Employee agent: customer profile, KYC, relationship data |
| `PortfolioAdvisor` | Employee agent: positions, assets, portfolio composition |
| `CashAndPayments` | Employee agent: payment operations, doc-pays, transfers |
| `SecuritiesTrading` | Employee agent: orders, securities, exchange |
| `CreditAndLending` | Employee agent: loans, limits, collateral |
| `ComplianceAndRisk` | Employee agent: AML, compliance, restrictions |
| `BackOfficeOperations` | Employee agent: settlement, reconciliation, back-office |
| `ReportingAndCOO` | Employee agent: reporting, COO dashboard, coverage |
| `AuditAndUAT` | Employee agent: audit trail, UAT scenarios |
| `ClientWealthAssistant` | Client agent: portfolio view (client-safe language) |
| `ClientCashAssistant` | Client agent: account balance, payments |
| `ClientTradingAssistant` | Client agent: securities view, orders |
| `ClientCreditAssistant` | Client agent: loan/limit view |
| `ClientMessagesAndDocuments` | Client agent: messages, document access |

**Core pipeline (shared with Pilots 1 and 2):**
- `ChatbotService` → `RuleBasedIntentRecognizer` → `ApiPlanBuilder` → `RealApiCatalogValidator` → `SchemaAwareMockDataGenerator` → `ChatFormatting`

**DemoBankingContext:** `DemoBankingContextService` provides realistic simulated banking data (account numbers, balances, client names) as context for agent responses — unique to Pilot 3.

**Infrastructure:** `OpenApiCatalogImporter` (same as Pilots 1/2). `SerilogBootstrap` for structured logging. No `ApiCatalogDatabase` raw SQL — this pilot uses EF Core (via `BankingDbContext`) for chat history persistence.

---

## 10. Frontend Analysis

**WPF UI — same dark banking theme as Pilot 2 but fewer windows:**

| Tab | Purpose |
|---|---|
| Load APIs | Folder picker, import status |
| API Catalog | Searchable endpoint grid, schema viewer |
| Chat | Specialist agent selector, conversation, technical evidence |
| Reports | 7 PDF report buttons |
| Settings | Folder, DB, OpenAI key/model, client name/ID |

**No additional windows** (no floating prompt, no mock server window, no classification visualizer) — simpler than Pilot 2.

**ViewModels:** `MainWindowViewModel` + `ObservableObject`. Only two ViewModels vs five in Pilot 2.

**EF Core `BankingDbContext`:** Chat history is persisted in SQLite via Entity Framework (unlike Pilots 1 and 2 which use raw SQL or in-memory only). `DatabaseSeeder` handles initial data seeding. `DemoBankingContext.json` provides the demo client data file.

---

## 11. Data Model / Storage

**SQLite (EF Core) — for chat history and configuration:**
- `BankingDbContext` manages the schema via EF Core
- `DatabaseSeeder` populates initial configuration and demo data
- `DemoBankingContext.json` — JSON file with simulated banking client data

**In-memory catalog:** `RealApiCatalog` — loaded at startup from ApiSpecs folder. Not persisted.

**Reports output:** `Documents/ConversationalBankingMockExports/Reports/` (user Documents folder)

**No ExcelCSV, no ExecutionRun tables** — test result history is minimal compared to Pilot 1.

---

## 12. Configuration and Environment

**Environment variables (optional):**
```
OPENAI_API_KEY    — OpenAI API key for response reformatter
OPENAI_MODEL      — Default: gpt-4o-mini / gpt-4.1-mini
```

**Defaults (hardcoded):**
- Default API specs folder: `C:\Users\apsof\OneDrive\Desktop\CAPI1`
- Default demo client: Mario Rossi, BP-10001
- Default mode: Bank Employee

**EF Core startup:** `DatabaseSeeder` runs on first launch, populating settings and demo context. No manual migration commands required.

**`DemoBankingContext.json`** — JSON file co-located with the WPF project; contains simulated banking data used by `DemoBankingContextService`.

---

## 13. Security Considerations

- **No user authentication.** Single-user desktop.
- **OpenAI API key** — stored in EF Core SQLite database (plaintext).
- **No mock server** — unlike Pilot 2, no local HTTP listener; reduced attack surface.
- **`RealApiCatalogValidator`** — primary security boundary for data correctness; prevents LLM hallucination.
- **`ChatFormatting` safety check** — OpenAI response rejected if it appears technical in client mode.
- **`DemoBankingContext.json`** — contains simulated data only; no real account information.
- **`ConversationalBankingMock/` nested folder** — legacy copy; should not be deployed or distributed.

---

## 14. Strengths

1. **Multi-agent architecture** — 14 named specialists with dedicated domain knowledge; cleanest agent design of all pilots
2. **`BankingAgentRouter`** — explicit routing table; easy to add new agents without touching existing ones
3. **`CapabilityMap`** — declarative endpoint ownership per agent; makes agent coverage auditable
4. **`EvidenceBuilder`** — response always includes real endpoint references; supports compliance and traceability
5. **`DemoBankingContext`** — pre-loaded realistic client data enables demos without a live banking backend
6. **EF Core for persistence** — type-safe migrations for chat history; more robust than raw SQL in Pilots 2
7. **Console REPL** — full pipeline testable without WPF; valuable for scripted verification
8. **Cleanest codebase** — fewest lines of code for the feature set; best maintainability
9. **Regression test suite** — 9 routing tests verify agent selection; 5 no-invention tests; highest test quality
10. **`specifications/` folder** — designated place for architecture documents; integration with current session output
11. **Two-mode operation** — employee/client mode implemented cleanly via agent selection + formatter

---

## 15. Weaknesses and Risks

1. **No BotJob workflow engine** — no equivalent to Pilot 1's 33-command system; cannot build reusable automated test workflows
2. **No mock HTTP server** — cannot simulate banking API endpoint calls from external clients (Pilot 2 has this)
3. **No floating AI prompt window** — less accessible AI integration than Pilot 2
4. **No banking taxonomy** — no pre-seeded 25-category endpoint organization (Pilot 1 has this)
5. **No test runner service** — no async flow execution with per-step progress events
6. **No Excel/CSV integration** — no data-driven testing from files
7. **Hardcoded default path** `C:\Users\apsof\...` — breaks on every other machine
8. **In-memory catalog** — no persistence of imported endpoints; slow reimport on every restart for large catalogs
9. **12 hardcoded intent templates** — adding a new banking intent requires code recompile
10. **Legacy nested folder** (`ConversationalBankingMock/`) — duplicated code risk; should be removed

---

## 16. Best Ideas to Reuse

1. **Multi-agent router pattern** — `BankingAgentRouter` + 14 agents; cleanest agent decomposition; port directly to final version
2. **`CapabilityMap`** — declarative endpoint-to-agent mapping; enables governance and coverage reporting
3. **`EvidenceBuilder`** — always attach real endpoint references to response; critical for compliance use cases
4. **`DemoBankingContextService`** — JSON-driven simulated client data; reuse for demo and onboarding scenarios
5. **`DemoBankingContext.json`** — portable demo data file; easy to customize per client
6. **EF Core `BankingDbContext`** — prefer over raw SQL in Pilot 2; extend this schema for the final version
7. **`DatabaseSeeder`** — clean seeder pattern; extend with banking taxonomy from Pilot 1
8. **Console REPL** — keep for power users and scripting; enable CI pipeline invocation
9. **Regression test suite design** — 9 routing + 5 no-invention tests; expand and formalize in final version
10. **`specifications/` folder** — use as the canonical architecture documentation home for the final product

---

## 17. Recommended Improvements

- **Port the multi-agent architecture** as the primary chat engine of the final product — it is the best agent design
- **Add BotJob engine from Pilot 1** — the 33-command system is what enables non-technical users to build reusable tests
- **Add MockServerService from Pilot 2** — local HTTP simulation is essential for offline testing
- **Add banking taxonomy from Pilot 1** — 25 categories with keyword auto-mapping
- **Add FloatingPromptWindow from Pilot 2** — significantly improves AI accessibility
- **Persist the API catalog in EF Core** — extend `BankingDbContext` with `ApiEndpoints`, `ApiSchemas`, `ApiDocuments` tables
- **Remove the nested `ConversationalBankingMock/` folder** — dead code, risk of confusion
- **Fix hardcoded default path** — prompt user on first launch or read from environment variable
- **Extend EF Core schema** — add `ExecutionRuns`, `ExecutionStepResults`, `BotJobs` tables from Pilot 1
- **Add ClosedXML** — enable Excel/CSV data-driven testing

---

## 18. Final Evaluation

**Overall maturity:** Backend 80% / Frontend 60%

Pilot 3 is the **architectural foundation** for the final product. Its multi-agent design is the cleanest decomposition of banking domain responsibilities, and its EF Core integration is the most technically sound data layer. It is intentionally leaner than Pilots 1 and 2 — a deliberate integration target, not a finished product. The strategy is clear: pull the BotJob engine from Pilot 1, the mock server and AI prompt infrastructure from Pilot 2, and mount them on Pilot 3's multi-agent router and EF Core persistence layer.

**Rating:** ★★★★☆ (architecture quality) / ★★★☆☆ (feature completeness)
