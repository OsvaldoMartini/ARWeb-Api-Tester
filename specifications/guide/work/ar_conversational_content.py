"""Authoritative content inventory for the AR Conversational client guide."""

VERSION = "1.0.0"
REVIEW_DATE = "26 August 2026"

TOC = [
    ("about", "1. About AR Conversational"),
    ("release", "2. Read this before using the current release"),
    ("install", "3. Installation and first launch"),
    ("quick_start", "4. End-to-end quick start"),
    ("interface", "5. Interface fundamentals"),
    ("screens", "6. Screen-by-screen guide"),
    ("modes", "7. Employee and client modes"),
    ("agents", "8. Banking agents and routing"),
    ("conversations", "9. Questions, answers, limitations, and evidence"),
    ("delegation", "10. ARAPI delegation and cross-application workflow"),
    ("catalog", "11. Read-only API Catalog"),
    ("providers", "12. AI provider settings"),
    ("security", "13. Security and operational practices"),
    ("troubleshooting", "14. Troubleshooting"),
    ("status", "15. Feature status matrix"),
    ("controls", "Appendix A. Complete control index"),
    ("agent_reference", "Appendix B. Agent reference"),
    ("api", "Appendix C. Local API reference"),
    ("glossary", "Appendix D. Glossary"),
    ("handoff", "Appendix E. Client acceptance checklist"),
]

NAV_ITEMS = [
    ("Home", "Overview, shared-backend status, agent coverage, and shortcuts."),
    ("AR Conversational", "Employee/client banking questions, agent routing, evidence, and ARAPI delegation."),
    ("API Catalog", "Read-only search of the endpoint inventory shared with ARAPI."),
    ("Settings", "Shared provider records, default selection, connection indicator, and local ports."),
]

SCREENS = [
    ("01-home.png", "Home overview", "AR Conversational Home showing the online backend, dynamic agent coverage, Employee mode, and three navigation cards.", "Confirm the backend is online and review current catalog coverage before starting a client or employee conversation."),
    ("02-assistant-employee.png", "Employee conversation workspace", "Empty Employee-mode AR Conversational workspace with Mode, Coverage, Auto-route, question input, and Send controls.", "Employee mode changes automatic routing candidates, example language, and the way supported synthetic balance results are introduced."),
    ("03-mode-welcome.png", "Conversation mode chooser", "Welcome modal comparing Employee Mode and Client e-Banking Mode with example questions and start buttons.", "Choose the perspective that matches the simulation. Close keeps the current mode; the Mode button reopens this chooser later."),
    ("04-agent-coverage.png", "Agent catalog coverage", "Expanded Agent catalog coverage panel listing wired and unwired agents with dynamic endpoint counts.", "Coverage is a keyword-match inventory, not proof that every endpoint is suitable or callable for the question."),
    ("05-agent-selected.png", "Explicit agent selection", "Employee conversation workspace with Relationship Manager selected instead of Auto-route.", "An explicit selection takes precedence over automatic mode-and-keyword routing for the next question."),
    ("06-assistant-client.png", "Client e-Banking workspace", "Empty Client-mode AR Conversational workspace with client-specific subtitle, prompt, and top-bar mode selection.", "Use Client mode for end-client wording and client-agent automatic routing. It does not authenticate or identify a real client."),
    ("07-client-balance-answer.png", "Synthetic client balance answer", "Client question and a Client Cash Assistant balance response showing masked IBANs, totals, catalog evidence text, and a synthetic-data warning.", "The displayed balances are local synthetic ARAPI mock data, not live core-banking data and not suitable for financial decisions."),
    ("08-client-evidence-expanded.png", "Expanded endpoint evidence", "The same balance response with the evidence disclosure expanded to three method-and-path pills.", "Evidence shows which catalog records were selected by keyword matching; review every method and path before relying on it."),
    ("09-arapi-delegation.png", "ARAPI catalog-search delegation", "A conversational catalog-search instruction answered by ARAPI Bot Builder with five matched endpoints and a handoff warning.", "Catalog, BotJob, test-build, and related instructions are delegated to ARAPI. Review work in the separate ARAPI application."),
    ("10-api-catalog.png", "API Catalog overview", "Read-only AR Conversational API Catalog showing method, path, summary, mapping status, and a search field.", "Endpoint counts and rows depend on the shared database. Import or modify specifications only in ARAPI."),
    ("11-catalog-filtered.png", "Filtered API Catalog", "API Catalog filtered by a balance search with matching paths and summaries.", "Search matches method, path, or summary text. Broad terms may return semantically weak matches that require human review."),
    ("12-settings.png", "Settings provider list", "Settings page showing seven provider records, Together.ai as current default, provider disclosures, and Test/default controls.", "Settings are shared with ARAPI. Changing the default or provider record affects both applications."),
    ("13-settings-provider-form.png", "Provider configuration form", "Expanded OpenAI provider form showing Model, empty masked API-key input, and Save.", "Leave a saved key field blank to preserve the existing key. Never place production credentials in screenshots or support tickets."),
    ("14-settings-local-services.png", "Settings local services", "Lower Settings area showing the shared backend port 8787 and development client port 5174.", "The backend is localhost-only. Port 5174 is the Vite development UI port; packaged desktop operation does not require exposing it."),
    ("15-settings-test-result.png", "Provider Test result", "Together.ai provider card showing Connected, zero milliseconds, and OK above the local-services panel.", "In the reviewed C# build this is a local configuration indicator, not an external provider round-trip or proof that an LLM processed a request."),
]

AGENTS = [
    ("Employee", "Relationship Manager", "Customer-facing service, onboarding, accounts, balances, and payments.", "customer, onboarding, account, balance, payment"),
    ("Employee", "Portfolio Advisor", "Investment advisory and portfolio support.", "portfolio, holdings, allocation, investment, recommendation"),
    ("Employee", "Cash & Payments", "Payments, transfers, and cash operations.", "payment, transfer, SEPA, SWIFT, cash"),
    ("Employee", "Securities Trading", "Trading and execution workflows.", "trade, order, execution, security"),
    ("Employee", "Credit & Lending", "Loan and credit servicing.", "loan, credit, mortgage, repayment"),
    ("Employee", "Compliance & Risk", "Compliance checks, risk, and controls.", "compliance, AML, risk, screening"),
    ("Employee", "Back Office Operations", "Settlement, reconciliation, and operations support.", "settlement, reconciliation, operations"),
    ("Employee", "Reporting & COO", "Reporting, analytics, and operational oversight.", "report, analytics, audit"),
    ("Employee", "Audit & UAT", "Audit trail and test support.", "audit, UAT, log"),
    ("Client", "Client Wealth Assistant", "Client-facing wealth and investment support.", "wealth, portfolio, investment"),
    ("Client", "Client Cash Assistant", "Client-facing cash, balance, and payment support.", "payment, transfer, cash"),
    ("Client", "Client Trading Assistant", "Client trading support.", "trade, market, security"),
    ("Client", "Client Credit Assistant", "Client lending support.", "loan, credit, mortgage"),
    ("Client", "Client Messages & Documents", "Client document and message handling.", "document, message, statement"),
]

PROVIDERS = [
    ("OpenAI", "gpt-4o-mini", "No"),
    ("Anthropic Claude", "claude-3-5-haiku-20241022", "No"),
    ("Google Gemini", "gemini-1.5-flash", "No"),
    ("Azure OpenAI", "gpt-4o-mini", "Yes - deployment endpoint"),
    ("Ollama (local)", "llama3.2", "Yes - usually http://localhost:11434"),
    ("Together.ai", "meta-llama/Llama-3-8b-chat-hf", "No"),
    ("Custom OpenAI-compatible", "gpt-4o-mini", "Yes - deployment endpoint"),
]

CONTROL_INDEX = [
    ("Global", "Home sidebar item", "Always", "Opens the overview and current shared-backend/agent status."),
    ("Global", "AR Conversational sidebar item", "Always", "Opens the conversation workspace; remounting clears visible turns."),
    ("Global", "API Catalog sidebar item", "Always", "Opens the read-only shared endpoint inventory."),
    ("Global", "Settings sidebar item", "Always", "Opens shared provider and local-service settings."),
    ("Global", "Employee / Client top-bar buttons", "Always", "Changes the current in-memory conversation perspective."),
    ("Global", "sidecar status indicator", "Always", "Shows whether the UI can reach the localhost backend; refreshed every five seconds."),
    ("Home", "AR Conversational shortcut card", "Always", "Opens the conversation workspace."),
    ("Home", "API Catalog shortcut card", "Always", "Opens the read-only catalog."),
    ("Home", "Settings shortcut card", "Always", "Opens provider settings."),
    ("Conversation", "Mode", "Always", "Opens the Employee/Client comparison modal."),
    ("Mode chooser", "Close (x)", "Modal open", "Closes the chooser without changing the current mode and records the introduction as seen."),
    ("Mode chooser", "Start as Bank Employee", "Modal open", "Selects Employee mode and closes the chooser."),
    ("Mode chooser", "Start as e-Banking Client", "Modal open", "Selects Client mode and closes the chooser."),
    ("Conversation", "Coverage", "Always", "Shows or hides agent names and dynamic catalog-match counts."),
    ("Conversation", "Agent selector / Auto-route", "Agents loaded", "Uses mode and keyword routing when blank, or forces the selected agent."),
    ("Conversation", "Question input", "Always", "Accepts one question/instruction. Enter sends; empty text is ignored."),
    ("Conversation", "Send", "Non-empty question and not busy", "Sends one request to the local backend and appends the result to the visible session."),
    ("Conversation", "show/hide endpoints used", "Answer includes evidence", "Expands or collapses selected catalog method/path pills."),
    ("API Catalog", "Search method / path", "Catalog loaded", "Filters by method, path, or summary; does not change the catalog."),
    ("Settings", "Provider expand/collapse chevron", "Always", "Shows or hides Model, optional Base URL, API key, and Save."),
    ("Settings", "NO KEY badge", "Provider has no saved key", "Disabled status; a key must be saved before selecting the provider as default."),
    ("Settings", "SET DEFAULT", "Provider has a key and is not default", "Makes the provider the shared default across both apps."),
    ("Settings", "DEFAULT badge", "Provider is current default", "Shows the provider selected for shared AI features; disabled until another provider is chosen."),
    ("Settings", "Test", "Provider has a key", "Shows the current build's provider-test result."),
    ("Provider form", "Model", "Provider expanded", "Stores the optional model value."),
    ("Provider form", "Base URL", "Azure, Ollama, or Custom provider expanded", "Stores the provider/deployment endpoint."),
    ("Provider form", "API key", "Provider expanded", "Accepts a new masked key; blank on a later save preserves the existing value."),
    ("Provider form", "Save", "Provider expanded", "Persists the shared provider record and clears the typed key field."),
]

API_ROUTES = [
    ("GET", "/health", "Backend liveness used for the online/offline indicator."),
    ("GET", "/catalog/endpoints", "Read the endpoint inventory shared with ARAPI."),
    ("GET", "/agents", "List 14 agents with dynamic catalog capability counts."),
    ("GET", "/agents/capabilities", "List agent names and endpoint-count summaries."),
    ("POST", "/agents/ask", "Route one banking question by mode/explicit agent and return answer, evidence, and limitations."),
    ("POST", "/app-assistant/chat", "Handle delegated ARAPI catalog/BotJob instructions."),
    ("GET", "/settings/ai-providers", "List provider records without returning key values."),
    ("POST", "/settings/ai-providers", "Create/update a shared provider record."),
    ("POST", "/settings/ai-providers/set-default", "Set the shared default provider by record ID."),
    ("POST", "/settings/ai-providers/test", "Return the current build's local provider-test result."),
]

TROUBLESHOOTING = [
    ("sidecar offline", "Close and reopen the desktop app, confirm no process is already occupying port 8787, and contact the deployment administrator if status remains offline. Do not expose the port publicly."),
    ("Home shows no agent coverage", "Wait for the backend to become online. If the list remains absent, verify GET /agents locally and restart the approved application bundle."),
    ("Agents show no match or zero endpoints", "Open ARAPI, import a trusted OpenAPI/Swagger specification, and verify that relevant method/path/summary terms exist. Counts are keyword matches and update with the catalog."),
    ("The wrong agent answered", "Return the selector to Auto-route and use a more specific question, or explicitly choose the intended agent. An explicit agent overrides the current mode's automatic candidate filter."),
    ("Send does nothing", "Enter non-whitespace text and wait for the current request to finish. Send is disabled while busy; pressing Enter also submits."),
    ("A conversation disappeared", "Visible turns are component memory only. Navigating away, reloading, or restarting clears them; there is no conversation-history workspace in 1.0.0."),
    ("A balance answer looks like real customer data", "Stop and read the orange limitation. The reviewed build returns local synthetic accounts with masked IBANs. Never use it for customer service, valuation, or a financial decision."),
    ("Evidence appears unrelated", "Evidence is selected by keyword matching and is limited to a few catalog records. Review method, path, summary, ownership, authorization, and the real contract in ARAPI before use."),
    ("An instruction was delegated to ARAPI", "Prompts about creating/building tests, BotJobs, catalog searches, or payment endpoints use the ARAPI assistant route. Open ARAPI Designer/Execute Tests to review any result."),
    ("A delegated instruction says BotJobs were executed", "The current delegated run intent can execute all saved BotJobs against the built-in Mock environment. Review ARAPI execution history and do not interpret local green rows as proof of a real downstream change."),
    ("Provider Test says Connected but AI behavior fails", "The reviewed C# Test result is a local configuration indicator. Verify the record, model, base URL, entitlement, proxy/firewall, and an approved external provider check outside this indicator."),
    ("Catalog is empty or read-only", "Use the separate ARAPI application's Import APIs workflow. AR Conversational intentionally provides no import, edit, or category-mapping controls."),
    ("Port 5174 cannot be reached", "Port 5174 is the Vite development UI port. A packaged Tauri desktop app loads its bundled frontend and does not require a public web listener on 5174."),
]

GLOSSARY = [
    ("Agent", "A named routing profile with employee/client mode, description, and banking keywords."),
    ("Auto-route", "Selection behavior that filters agents by mode and scores banking keywords in the question."),
    ("Capability count", "Current count of catalog endpoints that keyword-match an agent; not a permission or runtime-success guarantee."),
    ("Conversation mode", "Employee or Client UI context used for examples, placeholder text, automatic candidates, and supported answer wording."),
    ("Evidence", "Up to three method/path catalog records selected for a normal banking question."),
    ("Limitation", "A warning returned with an answer, such as synthetic data or no matching endpoint."),
    ("Synthetic data", "Local demonstration records used by the reviewed C# backend; never live core-banking data."),
    ("Delegation", "Routing of catalog/test/BotJob language from AR Conversational to the shared ARAPI assistant endpoint."),
    ("Shared database", "The local data store used by both desktop apps for catalog, provider settings, BotJobs, and related records."),
    ("Default provider", "The provider record marked as shared default; in this build the label alone does not prove an external LLM call occurred."),
]
