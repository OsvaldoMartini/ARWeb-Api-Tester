# BEST OF 3 PILOTS - FINAL RECOMMENDATIONS

> **Analysis date:** 2026-06-03
> **Target project:** `D:\Projects_DevOps\ARWEB-API-Andrea-TOP`
> **Goal:** Define the final architecture for a non-technical-client API testing tool for the banking domain

---

## 1. Overall Goal

Build a **professional, non-code API testing tool** for banking domain professionals (business analysts, QA testers, eBanking clients) that:

- Imports real OpenAPI/Swagger specifications (Avaloq CAPI format and others)
- Validates every operation against the imported catalog — **no invented endpoints, fields, or data**
- Allows designing reusable test workflows (BotJobs) through a visual, no-code interface
- Executes tests against real or simulated banking APIs
- Provides multi-AI assistance (test data generation, workflow design, error explanation)
- Generates professional PDF banking reports
- Is accessible to non-technical users without any programming knowledge

---

## 2. Comparison Table

| Area | Pilot 1 (BankingApiWorkbench) | Pilot 2 (ConversationalBankingMock-Context) | Pilot 3 (ConversationalBankingMock-TOP) | Best Choice |
|---|---|---|---|---|
| **Language** | C# / .NET 8 | C# / .NET 8 | C# / .NET 8 | All equal |
| **UI Framework** | WPF | WPF + WebView2 | WPF + WebView2 | Pilot 2/3 (WebView2 future-ready) |
| **Agent Architecture** | Single chatbot service | Single chatbot service + 13 agents | Multi-agent router (14 agents) | **Pilot 3** |
| **BotJob Engine** | ✅ 33 command types, full execution | ❌ Not present | ❌ Not present | **Pilot 1** |
| **Banking Taxonomy** | ✅ 25 categories × 5 sub | ❌ None | ❌ None | **Pilot 1** |
| **Mock HTTP Server** | ❌ Not present | ✅ localhost:8855 | ❌ Not present | **Pilot 2** |
| **Floating AI Window** | ❌ Not present | ✅ FloatingPromptWindow | ❌ Not present | **Pilot 2** |
| **Test Runner Service** | ✅ BotJobExecutionEngine | ✅ TestRunnerService | ❌ Minimal | **Pilot 1** |
| **Data Persistence** | ✅ EF Core 15+ tables | ⚠️ Raw SQL 4 tables | ✅ EF Core (smaller schema) | **Pilot 1** |
| **AI Providers** | ✅ 6 providers, UI config | ✅ 4 providers, DB config | ✅ 4 providers, env vars | **Pilot 1** |
| **AppContextBuilder** | ❌ Not present | ✅ Dynamic AI system prompt | ❌ Not present | **Pilot 2** |
| **ActionRegistry** | ❌ Not present | ✅ AI triggers app actions | ❌ Not present | **Pilot 2** |
| **PromptRelay Event Bus** | ❌ Not present | ✅ In-process typed events | ❌ Not present | **Pilot 2** |
| **Excel/CSV Testing** | ✅ ClosedXML | ❌ None | ❌ None | **Pilot 1** |
| **Bash Script Export** | ✅ curl script generation | ❌ None | ❌ None | **Pilot 1** |
| **PDF Reports** | ⚠️ HTML only | ✅ Pure C# PDF (7 types) | ✅ Pure C# PDF (7 types) | **Pilot 2/3** |
| **Demo Banking Context** | ❌ No simulated client data | ❌ Basic (Mario Rossi config only) | ✅ DemoBankingContextService + JSON | **Pilot 3** |
| **CapabilityMap** | ❌ Not present | ❌ Not present | ✅ Per-agent endpoint ownership | **Pilot 3** |
| **EvidenceBuilder** | ❌ Not present | ❌ Not present | ✅ Real endpoint references in response | **Pilot 3** |
| **No-Invention Rule** | ✅ RealApiCatalogValidator | ✅ RealApiCatalogValidator | ✅ RealApiCatalogValidator | All equal |
| **Test Framework** | ✅ xUnit (standard) | ⚠️ Custom runner | ⚠️ Custom runner + routing tests | **Pilot 1** |
| **UI Completeness** | ⚠️ 30–40% (stubs) | ✅ 70% (most features work) | ✅ 60% (clean but fewer features) | **Pilot 2** |
| **Codebase Size** | Large (4,000+ lines) | Medium (3,000+ lines) | Small (cleanest) | **Pilot 3** |
| **DI Container** | ❌ Services instantiated in VM | ✅ MEDI registered at startup | ✅ MEDI registered at startup | **Pilot 2/3** |
| **Architecture Quality** | ★★★★☆ | ★★★☆☆ | ★★★★★ | **Pilot 3** |
| **Feature Completeness** | ★★★★☆ (backend) | ★★★★☆ (frontend) | ★★★☆☆ | **Pilot 1 (backend) / Pilot 2 (frontend)** |

---

## 3. Best Architecture Elements

### From Pilot 3 — Multi-Agent Router Pattern ★★★★★

The `BankingAgentRouter` + 14 specialized agents is the best architectural decision across all three pilots. Instead of a monolithic `ChatbotService`, each banking domain (portfolio, payments, credit, compliance, etc.) has a dedicated agent with its own endpoint patterns and response templates. This enables:
- Independent evolution of each domain agent
- Explicit capability declaration via `CapabilityMap`
- Audit trail via `EvidenceBuilder`
- Clear onboarding: new banking domain = new agent file

**Adopt this as the core chat pipeline of the final version.**

### From Pilot 1 — Clean Architecture Layers ★★★★☆

Four concentric layers (Domain → Application → Infrastructure → Presentation) with proper dependency inversion. Domain has zero external references. All business logic is in services behind interfaces. Testable, replaceable, maintainable.

**Adopt this layering for all new code.**

### From Pilot 2 — WPF Services + Event Bus ★★★★☆

`MockServerService`, `TestRunnerService`, `PromptRelay`, `AppContextBuilder`, `ActionRegistry` are well-designed runtime services that sit between the Core logic and the UI. The `PromptRelay` event bus decouples windows without direct references.

**Adopt this WPF services layer pattern.**

---

## 4. Best Functionalities

| Functionality | Source | Priority |
|---|---|---|
| BotJob workflow engine (33 command types) | Pilot 1 | Critical |
| Banking taxonomy (25 categories × 5 sub) | Pilot 1 | Critical |
| Multi-agent router (14 banking agents) | Pilot 3 | Critical |
| No-invention RealApiCatalogValidator | All 3 | Critical (keep as-is) |
| Mock HTTP server (localhost) | Pilot 2 | High |
| Multi-AI provider (6 providers) | Pilot 1 | High |
| Excel/CSV data-driven testing | Pilot 1 | High |
| Floating AI prompt window | Pilot 2 | High |
| AppContextBuilder + ActionRegistry | Pilot 2 | High |
| Bash script export | Pilot 1 | Medium |
| DemoBankingContextService | Pilot 3 | Medium |
| CapabilityMap + EvidenceBuilder | Pilot 3 | Medium |
| Pure C# PDF reports (7 types) | Pilot 2/3 | Medium |
| xUnit test suite | Pilot 1 | Medium |

---

## 5. Best UI/UX Ideas for Non-Technical Clients

1. **Specialist selector menu** (Pilots 2/3) — user picks a banking role; no need to understand intent routing
2. **Two conversation modes** (Pilot 3) — automatic employee/client mode with appropriate language level
3. **Demo prompts** (Pilot 2) — pre-loaded example questions prevent blank-page paralysis
4. **BotJob 3-folder editor** (Pilot 1) — visual block/command designer without any code
5. **Floating AI window** (Pilot 2) — AI accessible without leaving current workflow tab
6. **Splash screen with progress** (Pilot 1) — loading indicators prevent user confusion at startup
7. **Limitations always shown** (Pilot 3) — explicit "this endpoint is missing" message builds trust
8. **PDF report one-click** (Pilots 2/3) — business-quality documents without technical knowledge
9. **Mock server start/stop** (Pilot 2) — visual server control panel with request log
10. **Evidence panel** (debug mode) (all 3) — technical users can always see the API plan underneath

---

## 6. Best Backend/API Design

**Winner: Pilot 1 (BotJobExecutionEngine) + Pilot 3 (Multi-Agent Router)**

The ideal backend combines:
- Pilot 3's `BankingAgentRouter` for intent dispatch (14 agents, capability map, evidence)
- Pilot 1's `BotJobExecutionEngine` for test workflow execution (33 commands, variable resolution, async)
- Pilot 1's service layer interfaces (10 clean interfaces behind DI)
- Pilot 2's `MockServerService` for HTTP simulation
- Pilot 2's `AppContextBuilder` for AI context construction

The `RealApiCatalogValidator` is equally well-implemented in all three — keep without modification.

---

## 7. Best Data Model or Storage Approach

**Winner: Pilot 1 (EF Core, 15+ tables, full audit trail)**

Pilot 1's schema is the most complete by far:
- Full API catalog persistence (`ApiEndpoints`, `ApiParameters`, `ApiOutputFields`, `ApiDependencies`)
- Full test lifecycle (`BusinessTestCases`, `BotJobs`, `BotJobBlocks`, `BotJobCommands`)
- Full execution history (`ExecutionRuns`, `ExecutionStepResults`)
- Multi-AI configuration (`AiProviderSettings`)

**Adopt Pilot 1's schema. Extend with:**
- Pilot 3's `DemoBankingContext` JSON table
- Pilot 2's `prompt_commands` (action registry) as a proper EF Core table

**Discard:** Pilot 2's raw SQL approach — no type safety, no migrations.

---

## 8. Best Configuration Approach

**Winner: Pilot 1 (database-backed, UI-managed)**

All configuration in SQLite (`ConfigurationSettings` table), editable via UI at runtime, no appsettings.json required. Includes:
- Environment URL / base URL
- AI provider selection and credentials
- Default folder paths

**Improvement needed:** Encrypt AI API keys at rest (DPAPI on Windows, or a secrets manager). Pilot 1 stores them plaintext — this must be fixed in the final version.

**From Pilot 2:** Adopt per-provider prompt templates stored in DB — allows non-technical customization of AI behavior without code changes.

---

## 9. Security Recommendations

1. **Encrypt AI API keys** in SQLite — use Windows DPAPI (`System.Security.Cryptography.ProtectedData`) for at-rest encryption
2. **Mock server authentication** (if exposed beyond localhost) — add Bearer token or API key validation in `MockServerService`
3. **Input sanitization** for BotJob names, category names, variable names before storing in SQLite
4. **Bash script export** — add warning to generated scripts: "Do not commit this file — it may contain auth tokens"
5. **Keep `RealApiCatalogValidator` as a non-bypassable gate** — never add a "skip validation" flag
6. **Client mode safety check** in formatter — keep the Pilot 2/3 check: reject LLM responses that look technical
7. **No secrets in source code** — ensure `DemoBankingContext.json` contains only simulated data
8. **Remove legacy nested folder** `ConversationalBankingMock/` from Pilot 3 — reduces confusion and deployment risk

---

## 10. What Should Be Removed

| Item | Reason |
|---|---|
| `ConversationalBankingMock/` nested folder (Pilot 3) | Legacy duplicate, deployment risk |
| MainViewModel monolith (all 3) | 1,000–1,200 line god class; split by feature tab |
| Raw SQL in `ApiCatalogDatabase.cs` (Pilot 2) | Replace with EF Core from Pilot 1 |
| Hardcoded `C:\Users\apsof\...` default path | Machine-specific; breaks on other machines |
| Hardcoded port 8855 for mock server | Should be configurable |
| Pilot 1's HTML-only reports | Replace with Pilot 2/3's pure C# PDF exporter |
| Pilot 1's no-DI service instantiation | Replace with MEDI (already done in Pilots 2/3) |
| Heuristic dependency detection in Pilot 1 | Fragile; replace with LLM-assisted semantic analysis |
| `BOTJOB_THREE_FULL_PAGE_FOLDERS.md`, `BOTJOB_VISUAL_IMPROVEMENTS.md` (Pilot 1) | Move content to proper specifications folder |

---

## 11. What Should Be Merged into the Final TOP Version

**Phase A — Core Integration (High Priority)**

From Pilot 1 into Pilot 3:
- `BankingTaxonomy` — 25 categories × 5 subcategories + keyword maps → seed via `DatabaseSeeder`
- `BotJobExecutionEngine` — 33-command async executor → extract to Core layer
- `AiTestDataService` + `AiBotJobGeneratorService` — LLM-powered generation → keep in Infrastructure
- `ClosedXML` dependency + `CsvExportService` → add to Infrastructure
- `BashScriptGeneratorService` → add to Infrastructure
- EF Core schema: `BusinessCategories`, `BusinessSubcategories`, `BusinessTestCases`, `BotJobs`, `BotJobBlocks`, `BotJobCommands`, `BotVariables`, `DataSetDefinitions`, `ExecutionRuns`, `ExecutionStepResults`, `AiProviderSettings` → extend `BankingDbContext`
- `xUnit` test project → replace custom test runner

From Pilot 2 into Pilot 3:
- `MockServerService` → add to Wpf/Services
- `TestRunnerService` → add to Wpf/Services
- `FloatingPromptWindow` + `FloatingPromptViewModel` → add to Wpf/Views + Wpf/ViewModels
- `AppContextBuilder` → add to Wpf/Services
- `ActionRegistry` → add to Wpf/Services
- `PromptRelay` → add to Wpf/Services
- `ClassificationVisualizerWindow` → add to Wpf/Views
- `MockServerViewModel` + `TestRunsViewModel` → add to Wpf/ViewModels
- Per-provider prompt template management (DB-backed)

Keep from Pilot 3 (unchanged):
- `BankingAgentRouter` + 14 agents
- `CapabilityMap` + `EvidenceBuilder`
- `DemoBankingContextService` + `DemoBankingContext.json`
- `RealApiCatalogValidator`
- `BankingDbContext` (extend, do not replace)
- `DatabaseSeeder` (extend with taxonomy seeding)
- `ProfessionalPdfReportExporter` (7 report types)

---

## 12. Proposed Final Architecture

```
ConversationalBankingMock-TOP (Final)
├── src/
│   ├── ConversationalBankingMock.Domain/
│   │   └── Entities.cs              Pure C# — all domain entities (from Pilot 1)
│   │
│   ├── ConversationalBankingMock.Application/
│   │   └── Interfaces.cs            Service contracts + DTOs
│   │
│   ├── ConversationalBankingMock.Core/    (No external deps)
│   │   ├── Agents/                  BankingAgentRouter + 14 agents (Pilot 3)
│   │   │   ├── BankingAgentRouter.cs
│   │   │   ├── CapabilityMap.cs
│   │   │   ├── EvidenceBuilder.cs
│   │   │   ├── Orchestrator.cs
│   │   │   └── [14 agent files]
│   │   ├── BotJob/                  BotJob engine (from Pilot 1)
│   │   │   ├── BotJobExecutionEngine.cs
│   │   │   ├── CommandTypes.cs      33 command types
│   │   │   └── VariableResolver.cs
│   │   ├── Chat/ChatbotService.cs
│   │   ├── DemoData/                (Pilot 3)
│   │   ├── Formatting/ChatFormatting.cs
│   │   ├── IntentRecognition/
│   │   ├── Interfaces/
│   │   ├── Mocking/
│   │   ├── Models/
│   │   ├── Planning/ApiPlanBuilder.cs
│   │   └── Validation/RealApiCatalogValidator.cs
│   │
│   ├── ConversationalBankingMock.Infrastructure/
│   │   ├── AI/                      Multi-AI services (from Pilot 1)
│   │   │   ├── AiTestDataService.cs
│   │   │   ├── AiBotJobGeneratorService.cs
│   │   │   └── OpenAiPromptService.cs
│   │   ├── Export/                  (from Pilot 1)
│   │   │   ├── CsvExportService.cs
│   │   │   └── BashScriptGeneratorService.cs
│   │   ├── Logging/SerilogBootstrap.cs
│   │   └── OpenApiImport/OpenApiCatalogImporter.cs
│   │
│   ├── ConversationalBankingMock.App/    Console REPL (keep)
│   │
│   ├── ConversationalBankingMock.Tests/  xUnit test project (from Pilot 1)
│   │
│   └── ConversationalBankingMock.Wpf/
│       ├── Data/
│       │   ├── BankingDbContext.cs         Extended with 15+ tables
│       │   ├── DatabaseSeeder.cs           Extended with taxonomy seeding
│       │   └── DemoBankingContext.json
│       ├── Services/                       (from Pilot 2)
│       │   ├── MockServerService.cs
│       │   ├── TestRunnerService.cs
│       │   ├── MockResponseGenerator.cs
│       │   ├── AppContextBuilder.cs
│       │   ├── ActionRegistry.cs
│       │   └── PromptRelay.cs
│       ├── ViewModels/
│       │   ├── MainWindowViewModel.cs      Split by tab
│       │   ├── BotJobViewModel.cs          (new — from Pilot 1 BotJob tabs)
│       │   ├── FloatingPromptViewModel.cs  (from Pilot 2)
│       │   ├── MockServerViewModel.cs      (from Pilot 2)
│       │   ├── TestRunsViewModel.cs        (from Pilot 2)
│       │   └── ObservableObject.cs
│       ├── Views/
│       │   ├── FloatingPromptWindow.xaml   (from Pilot 2)
│       │   ├── MockServerWindow.xaml       (from Pilot 2)
│       │   └── ClassificationVisualizerWindow.xaml (from Pilot 2)
│       ├── Reporting/ProfessionalPdfReportExporter.cs
│       └── Resources/ARWebTheme.xaml       Dark banking XAML design system
```

**EF Core schema additions:**
- Extend `BankingDbContext` with: `BusinessCategories`, `BusinessSubcategories`, `BusinessTestCases`, `BotJobs`, `BotJobBlocks`, `BotJobCommands`, `BotVariables`, `DataSetDefinitions`, `ExecutionRuns`, `ExecutionStepResults`, `AiProviderSettings`, `ApiEndpoints` (persistent catalog), `ApiParameters`, `ApiOutputFields`

---

## 13. Recommended Development Roadmap

### Phase 1 — Foundation Consolidation (2–3 weeks)

1. Remove `ConversationalBankingMock/` nested folder from Pilot 3
2. Add `Domain` project from Pilot 1 (Entities.cs)
3. Extend `BankingDbContext` with all missing EF Core tables
4. Extend `DatabaseSeeder` with banking taxonomy seeding (from Pilot 1's `BankingTaxonomy`)
5. Add `Microsoft.Extensions.DependencyInjection` startup registration (already in Pilot 3)
6. Fix hardcoded default paths — use `Configuration` table values with first-launch prompt
7. Replace custom test runner in Tests project with xUnit

### Phase 2 — BotJob Engine Integration (3–4 weeks)

8. Port `BotJobExecutionEngine` from Pilot 1 to Core layer
9. Port all 33 `CommandTypes` and `VariableResolver`
10. Add `BotJobBlocks`, `BotJobCommands`, `BotVariables`, `ExecutionRuns`, `ExecutionStepResults` tables
11. Port `AiTestDataService` + `AiBotJobGeneratorService` from Pilot 1
12. Port `CsvExportService` + `BashScriptGeneratorService` from Pilot 1
13. Add ClosedXML dependency for Excel/CSV data-driven testing

### Phase 3 — UI Integration (3–4 weeks)

14. Port `MockServerService` + `MockServerWindow` from Pilot 2
15. Port `FloatingPromptWindow` + `FloatingPromptViewModel` from Pilot 2
16. Port `AppContextBuilder` + `ActionRegistry` + `PromptRelay` from Pilot 2
17. Port `ClassificationVisualizerWindow` from Pilot 2
18. Add BotJob designer tabs (3-folder layout from Pilot 1 ROADMAP)
19. Split `MainWindowViewModel` into per-feature ViewModels
20. Implement configurable mock server port

### Phase 4 — AI & Security Hardening (2 weeks)

21. Add 6th AI provider (Ollama local) from Pilot 1
22. Encrypt AI API keys in SQLite using Windows DPAPI
23. Add per-provider prompt template management (editable in UI)
24. Add bash export warning about auth tokens
25. Add input sanitization for BotJob/category/variable names

### Phase 5 — Web Frontend (Future / Optional)

26. Create React + Vite frontend as alternative to WPF
27. Expose Core + Infrastructure as .NET Web API
28. Use WebView2 in WPF to embed React UI (already dependency in Pilots 2/3)
29. Enable cross-platform operation (macOS, Linux) via web UI

---

## 14. Final Conclusion

The three pilots collectively represent a **complete engineering blueprint** for a best-in-class banking API testing tool. No single pilot is the winner — the final product is the synthesis of the best elements from all three:

| Contribution | Source |
|---|---|
| Multi-agent router + 14 banking agents + CapabilityMap + EvidenceBuilder | **Pilot 3** |
| BotJob engine + 33 commands + banking taxonomy + audit trail + xUnit | **Pilot 1** |
| Mock HTTP server + floating AI window + AppContextBuilder + PromptRelay | **Pilot 2** |
| EF Core data layer + DemoBankingContextService + cleanest codebase | **Pilot 3** |
| Multi-AI providers + Excel/CSV + Bash export + variable substitution | **Pilot 1** |
| TestRunnerService + ClassificationVisualizerWindow + distribution model | **Pilot 2** |

The `RealApiCatalogValidator` no-invention rule is the **single most important architectural invariant** — present identically in all three pilots, it must remain the non-bypassable core of the final product.

**Pilot 3 (ARWEB-API-Andrea-TOP) is the correct integration target.** Its multi-agent architecture is the cleanest, its EF Core setup is the most extensible, its test suite is the most comprehensive routing verifier, and it is already the designated workspace. The development roadmap above turns it into the complete product by importing the best components from Pilots 1 and 2.

**Estimated total implementation effort:** 10–13 weeks for a single senior developer.

---

*Generated by Claude Code — analysis based on direct source code inspection of all three project folders.*
*Files analyzed: ~50+ source files, ~10,000+ lines of C#, 3 solution files, multiple documentation files.*
