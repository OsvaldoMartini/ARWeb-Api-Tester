# ARAPI
## User Manual — Complete Feature Guide

**Product:** ARAPI — Banking API Test Automation Platform  
**Version:** Phase 19  
**Audience:** QA Engineers, API Developers, Test Managers, IT Operations  

---

## Table of Contents

1. [What is ARAPI?](#1-what-is-arapi)
2. [Core Concepts](#2-core-concepts)
3. [Importing API Specifications](#3-importing-api-specifications)
4. [The API Catalog](#4-the-api-catalog)
5. [Business Categories](#5-business-categories)
6. [Designing BotJobs](#6-designing-botjobs)
7. [Command Reference](#7-command-reference)
8. [Variables and Token Resolution](#8-variables-and-token-resolution)
9. [Environments](#9-environments)
10. [Executing Tests](#10-executing-tests)
11. [Execution Results and Reports](#11-execution-results-and-reports)
12. [Mock Server](#12-mock-server)
13. [Bot Builder — AI Test Assistant](#13-bot-builder--ai-test-assistant)
14. [Settings — AI Providers](#14-settings--ai-providers)
15. [What ARAPI Can Do Today](#15-what-arapi-can-do-today)
16. [What ARAPI Will Be Able to Do](#16-what-arapi-will-be-able-to-do)
17. [Security & Architecture](#17-security--architecture)
18. [REST API Reference](#18-rest-api-reference)

---

## 1. What is ARAPI?

**ARAPI** is a no-code API test automation platform purpose-built for banking and fintech teams.  

It lets you:
- **Import** OpenAPI/Swagger specifications — single files, folders, or entire directory trees
- **Browse** your full API catalog, organized by banking domain
- **Design** BotJobs — automated test workflows — using a visual drag-and-drop builder (no coding)
- **Execute** BotJobs against the built-in Mock Server, staging, or production environments
- **Analyze** results with step-by-step pass/fail breakdowns and export them as HTML or CSV
- **Ask an AI assistant** to search your catalog, create BotJobs, and run tests — all from a conversation

ARAPI is vendor-neutral: it works with any OpenAPI 3.0 or Swagger 2.0 specification and supports seven AI providers.

---

## 2. Core Concepts

### API Catalog
A database of every endpoint imported from your OpenAPI/Swagger files. Each endpoint has a method, path, summary, tags, and parameter definitions. The catalog is the source of truth for all testing — ARAPI cannot test an endpoint that is not in the catalog.

### BotJob
A reusable, ordered test workflow made of **Blocks** and **Commands**. Think of a BotJob as a test scenario: "Create a new client, extract the client ID, call the account opening endpoint, assert the response is 201."

### Block
A logical group inside a BotJob (e.g., "Setup", "Create Client", "Verify State", "Cleanup"). Blocks help organize long workflows into readable sections.

### Command
A single test step inside a Block. Commands are typed (API_CALL, ASSERT, EXTRACT, etc.) and configured via the visual designer. Each command has a type, configuration, enabled/disabled toggle, and an order number.

### Environment
A named target for test execution. The built-in **Mock Server** is always available. You can add your own staging and production environments with custom base URLs.

### Variable
A named value that flows through a BotJob. Variables can be set at design time or extracted from API responses at runtime and used as `${varName}` tokens in subsequent requests.

---

## 3. Importing API Specifications

### Supported Formats
| Format | Extensions | Notes |
|--------|-----------|-------|
| OpenAPI 3.0 | `.yaml`, `.yml`, `.json` | Full support including `$ref` resolution |
| Swagger 2.0 | `.yaml`, `.yml`, `.json` | Automatically converted |

### Import Methods

#### Method 1: Upload Files (Browser)
Go to **Import APIs → Browse Files**.

- Click **Browse Files** to select one or more OpenAPI/Swagger files
- Or click **Browse Folder** to select an entire directory — ARAPI will recursively scan all subfolders
- Files are shown in a list with their name and size; remove individual files with ×
- Click **Import** to process all selected files

> **Folder import:** When importing a folder, ARAPI preserves the subfolder structure. Files are stored under paths matching their original directory tree, so a file at `specs/payments/sepa.yaml` is stored as `payments/sepa.yaml`.

#### Method 2: Server Path (Desktop / Admin)
Go to **Import APIs → Folder Path**.

- Enter the absolute path to a folder on the server
- ARAPI scans the folder recursively, importing all `.yaml`, `.yml`, and `.json` files
- Ignored directories: `node_modules`, `dist`, `build`, `.git`, `vs`, `bin`, `obj`

### What Gets Imported
For each file, ARAPI extracts:
- Every HTTP endpoint (method + path)
- Summary and description text
- Tags (used for business category mapping)
- Query, path, header, and body parameters (name, location, required flag, type, example values)
- Response schemas (top-level JSON fields)

### Error Handling
- Files that fail parsing are logged with the error reason
- Failed files do not stop the import of other files — the process always continues
- A summary shows how many specs and endpoints were successfully imported, and lists any failures

### Import Result
After import, you will see:
- Number of OpenAPI specs successfully parsed
- Total endpoints added to the catalog
- Names of any files that could not be parsed (with error details)

---

## 4. The API Catalog

The catalog is your central reference for all imported endpoints.

### Catalog Table
Columns:
- **Method** — HTTP verb with color coding: GET (blue), POST (green), PUT (amber), DELETE (red), PATCH (purple)
- **Path** — Full endpoint path including parameters (e.g., `/v1/accounts/{accountId}/balance`)
- **Summary** — Human-readable description from the OpenAPI spec
- **Mapping** — Business category assignment status: "mapped" or "unmapped"

### Search
Use the search bar to filter by method, path, or summary text. The filter is applied instantly as you type.

### Exports

#### Postman Collection
Download your full catalog as a **Postman Collection (v2.1)** — importable directly into Postman, Insomnia, or any compatible client. All endpoints, parameters, and metadata are included.

> File: `arweb-postman-collection.json`

#### Bash / curl Script
Download a shell script that makes one `curl` call per endpoint. Execute it against any base URL to replay your entire catalog.

> File: `arweb-catalog.sh`  
> Usage: `BASE_URL=https://staging.mybank.com bash arweb-catalog.sh`

---

## 5. Business Categories

ARAPI automatically assigns imported endpoints to **25 banking business categories** based on keyword matching against their path, method, summary, and tags.

### Categories

| # | Category | Example Endpoints |
|---|----------|------------------|
| 1 | Customer & Onboarding | `/clients`, `/kyc`, `/onboarding` |
| 2 | Accounts | `/accounts`, `/iban`, `/account-opening` |
| 3 | Balances | `/balance`, `/available-balance`, `/holds` |
| 4 | Payments & Transfers | `/payments`, `/sepa`, `/swift`, `/transfers` |
| 5 | Cards | `/cards`, `/card-limits`, `/pin`, `/disputes` |
| 6 | Securities & Trading | `/orders`, `/executions`, `/instruments` |
| 7 | Portfolio & Holdings | `/portfolio`, `/positions`, `/holdings` |
| 8 | Investment Advisory | `/suitability`, `/recommendations`, `/mandates` |
| 9 | Credit & Lending | `/loans`, `/mortgages`, `/credit-lines` |
| 10 | Deposits & Treasury | `/deposits`, `/term-deposits`, `/rates` |
| 11 | Foreign Exchange | `/fx`, `/spot`, `/forward`, `/hedging` |
| 12 | Compliance & AML | `/aml`, `/sanctions`, `/compliance` |
| 13 | Risk Management | `/risk`, `/exposure`, `/limits`, `/var` |
| 14 | Fraud & Disputes | `/fraud`, `/chargebacks`, `/investigations` |
| 15 | Statements & Documents | `/statements`, `/documents`, `/reports` |
| 16 | Notifications & Messaging | `/notifications`, `/alerts`, `/messages` |
| 17 | Authentication & Access | `/auth`, `/mfa`, `/sessions`, `/consents` |
| 18 | Beneficiaries & Payees | `/beneficiaries`, `/payees` |
| 19 | Standing Orders | `/standing-orders`, `/recurring`, `/direct-debits` |
| 20 | Reporting & Analytics | `/analytics`, `/kpi`, `/dashboards` |
| 21 | Back Office & Settlement | `/settlement`, `/reconciliation`, `/corporate-actions` |
| 22 | Wealth & Private Banking | `/wealth`, `/discretionary`, `/private-banking` |
| 23 | Insurance & Bancassurance | `/insurance`, `/policies`, `/claims` |
| 24 | Fees & Pricing | `/fees`, `/tariffs`, `/pricing` |
| 25 | Audit & Operations | `/audit`, `/events`, `/health`, `/uat` |

Each category has **5 subcategories** providing further granularity for large API catalogs.

The **Business Categories** page shows all 25 categories as cards. Click any category to see its subcategories and the number of endpoints mapped to it.

---

## 6. Designing BotJobs

### Creating a BotJob
1. Go to **Execute Tests** and click **New BotJob**  
   — or — ask the **Bot Builder** AI assistant to create one for you
2. Give it a name (required) and description (optional)
3. The BotJob is created with one empty **Main** block
4. Click **Open Designer** to build the workflow

### The Visual Designer

The designer has three panels:

#### Left Panel — Command Palette
Grouped by type:
- **API** — API_CALL
- **Variables** — SET_VARIABLE, EXTRACT_JSON_PATH
- **Assertions** — ASSERT_STATUS_CODE, ASSERT_FIELD_VALUE, ASSERT_JSON_PATH_EXISTS
- **Control** — WAIT, STOP_ON_FAILURE
- **Data** — (future commands: IF/ELSE, LOOP, READ_CSV)

Drag a command from the palette and drop it into any block.

#### Center Panel — Workflow Canvas
Shows all blocks and their commands in execution order.

- **Add Block** — Create a new logical group (give it a meaningful name like "Setup" or "Cleanup")
- **Reorder commands** — Drag handles to reorder within or between blocks
- **Enable/Disable** — Toggle individual commands on or off without deleting them
- **Delete** — Remove individual commands or entire blocks

Each command shows its type badge (color-coded) and a summary of its configuration.

#### Right Panel — Command Configuration
Click any command to open its configuration editor.

Fields vary by command type (see Command Reference below). All changes are held in memory until you click **Save**.

### Saving
Click **Save** in the top bar. ARAPI saves the full BotJob — all blocks, commands, and variables — in a single transaction. A success/error toast confirms the save.

### Managing Variables
In the designer, open the **Variables** tab to define BotJob-level variables:
- **Name** — referenced as `${name}` in commands
- **Initial Value** — the value at the start of execution
- **Secret** — if checked, the value is redacted in logs, results, and exports

---

## 7. Command Reference

### API_CALL
Makes an HTTP request to an imported catalog endpoint.

| Field | Description |
|-------|-------------|
| Endpoint | Select from your API catalog (searchable dropdown) |
| Body | JSON request body — supports `${variable}` tokens |
| Headers | Additional request headers (key-value pairs) — supports `${variable}` tokens |

The response (body and status code) is automatically stored as `lastResponse` and `lastStatus` for use by subsequent assertion and extraction commands.

---

### SET_VARIABLE
Sets or overwrites a workflow variable at runtime.

| Field | Description |
|-------|-------------|
| Variable Name | The variable to set (creates it if it does not exist) |
| Value | The new value — supports `${variable}` tokens and hardcoded values |

**Use case:** Compute a value at runtime (e.g., set a request timestamp), override a default, or stage data for the next API call.

---

### ASSERT_STATUS_CODE
Validates the HTTP status code of the most recent API_CALL.

| Field | Description |
|-------|-------------|
| Expected Code | Integer, e.g., `200`, `201`, `404` |

Passes if `lastStatus == expectedCode`. Fails otherwise.

---

### ASSERT_FIELD_VALUE
Validates a specific field value in the last JSON response.

| Field | Description |
|-------|-------------|
| JSON Path | Dot-notation path, e.g., `data.account.status` |
| Expected Value | String or number to compare against |

Passes if the field at the given path equals the expected value. Fails if the path does not exist or the value does not match.

---

### ASSERT_JSON_PATH_EXISTS
Verifies that a field exists in the last JSON response (does not check its value).

| Field | Description |
|-------|-------------|
| JSON Path | Dot-notation path, e.g., `data.clientId` |

Passes if the field is present. Fails if the path does not exist or returns `null`.

**Use case:** Confirm that a newly created resource returned an ID without caring about its specific value (before extracting it).

---

### EXTRACT_JSON_PATH
Extracts a value from the last JSON response and stores it as a workflow variable.

| Field | Description |
|-------|-------------|
| JSON Path | Dot-notation path, e.g., `data.clientId` |
| Variable Name | The variable to store the extracted value in |

**Use case:** Extract the `clientId` returned from a POST /clients call, then use `${clientId}` in the next API_CALL to `/clients/{clientId}/accounts`.

---

### WAIT
Pauses execution for a specified number of milliseconds.

| Field | Description |
|-------|-------------|
| Duration (ms) | Pause length in milliseconds (maximum: 10,000 ms = 10 seconds) |

**Use case:** Add a pause between commands when an async operation (e.g., a payment) takes time to propagate.

---

### STOP_ON_FAILURE
Marks that execution should halt if the previous command failed.

No configuration needed. Place this immediately after a critical assertion. If the assertion fails, no further commands in the BotJob will execute.

**Use case:** If the login command fails, stop immediately — there is no point running downstream commands that all depend on authentication.

---

## 8. Variables and Token Resolution

### Declaring Variables
Variables are declared at the BotJob level with an optional initial value. They are resolved fresh at the start of each execution run.

### Referencing Variables
Use `${variableName}` anywhere in:
- API_CALL request body (JSON)
- API_CALL headers
- SET_VARIABLE values
- ASSERT_FIELD_VALUE expected values

**Example:**
```json
{
  "clientId": "${clientId}",
  "amount": "${transferAmount}",
  "currency": "EUR"
}
```

### Runtime Variable Flow
```
BotVariable (initial: "EUR")
     │
     ▼
API_CALL body uses ${currency}
     │
     ▼
Response: { "accountId": "ACC-12345" }
     │
     ▼
EXTRACT_JSON_PATH: data.accountId → ${accountId}
     │
     ▼
Next API_CALL: /accounts/${accountId}/balance
```

### Secret Variables
Mark a variable as **secret** to redact its value from:
- Execution step results
- HTML and CSV reports
- Server logs

Use for passwords, authentication tokens, and any sensitive test data.

---

## 9. Environments

Environments define where BotJobs run. The base URL of the environment is prepended to all API_CALL paths.

### Built-in: Mock Server
| Property | Value |
|----------|-------|
| ID | `mock` |
| Port | 8855 (default) |
| Type | Built-in, cannot be deleted |
| Purpose | Safe sandbox — calls never reach real systems |

Always available. The Mock Server is automatically seeded with your imported endpoints and responds with generated mock data.

### Custom Environments

Create as many environments as needed:

| Field | Required | Description |
|-------|----------|-------------|
| Name | Yes | e.g., "Staging", "UAT", "Production" |
| Base URL | Yes | e.g., `https://staging.mybank.com` |
| Description | No | Free text notes |
| Headers | No | Default headers applied to all requests (e.g., Authorization) |
| Default | No | The environment pre-selected when running a BotJob |

### Environment Operations
- **Create** — Use the + button on the Environments page
- **Edit** — Click the edit icon on any custom environment card
- **Delete** — Remove non-built-in environments (confirmation required)
- **Set Default** — Star any environment to make it the default selection in the execution dialog

---

## 10. Executing Tests

### Running a BotJob

**From the Execute Tests page:**
1. Find the BotJob in the list
2. Click the **Run** button
3. Select the target environment (defaults to your default environment)
4. Click **Execute**

**From the Bot Builder AI assistant:**
Tell the assistant to run a BotJob by name or ID. It will execute it and display the results.

### Creating a Bash curl Script

Open **Scripts** (immediately before **Execute Tests** in the menu), select a
BotJob and environment, then choose **Browse** to select the output directory.
Use a dedicated folder such as `Documents\ARAPI\Scripts` rather than the app
installation directory. Click **Create Bash Script** to save a `.sh` file with
the BotJob's enabled API calls in execution order.

You can also select a BotJob on **Execute Tests** and click **Create Scripts**;
ARAPI opens the Scripts page with that BotJob and environment already selected.
Run the result from Bash with `bash script-name.sh`. Secrets are not copied into
the file; required sensitive values must be supplied as environment variables.

### Execution Process
1. ARAPI validates all API_CALL endpoint IDs against the current catalog
2. Variables are initialized from their declared initial values
3. Commands execute in block order, command order
4. Each command's result (pass/fail/error/skipped) is recorded
5. `${variable}` tokens are resolved just before each command runs
6. If a STOP_ON_FAILURE command is preceded by a failed assertion, remaining commands are skipped
7. The run summary is saved to the execution history

### Execution Statuses
| Status | Meaning |
|--------|---------|
| `passed` | All enabled commands passed |
| `failed` | One or more commands failed |
| `error` | An unexpected runtime error occurred |
| `running` | Execution is in progress |

### Step Statuses
| Status | Meaning |
|--------|---------|
| `passed` | Command executed and all assertions matched |
| `failed` | Assertion did not match, or API returned unexpected status |
| `error` | Command could not execute (network error, missing variable) |
| `skipped` | Skipped because STOP_ON_FAILURE was triggered earlier |

---

## 11. Execution Results and Reports

### Viewing Results

Go to **Execute Tests → History**. Results are grouped by BotJob and sorted by most recent first.

Each run card shows:
- Run status badge (passed/failed/error)
- Target environment name
- Step counts: `N passed / M failed / T total`
- Total execution duration
- Timestamp

Click a run to expand step-by-step details:
- Step number and command type
- Status badge and duration (ms)
- Request JSON (what was sent)
- Response JSON (what was received)
- For assertions: expected vs actual values

### Filtering
Use the BotJob selector to show only runs for a specific BotJob.

### Exporting a Run

Go to **Reports & Exports**. Select a run from the dropdown, then:

#### HTML Report
A formatted, browser-readable report of the full execution run.
- Pass/fail breakdown per step
- Color-coded status indicators
- Printable to PDF from the browser
- File: `run-{runId}.html`

#### CSV Export
A tabular export for spreadsheets and BI tools.
- Columns: stepId, commandType, status, durationMs, errorMessage
- Importable into Excel, Google Sheets, Jira, etc.
- File: `run-{runId}.csv`

### Catalog Exports (Always Available)
These exports cover the full catalog, independent of any specific run:

| Export | Format | Use |
|--------|--------|-----|
| Postman Collection | JSON | Import into Postman or Insomnia |
| Bash/curl Script | Shell | Replay all endpoints via command line |

---

## 12. Mock Server

The built-in Mock Server lets you run BotJobs safely without touching real APIs.

### Starting / Stopping
Go to **Mock Server** and click **Start**. The server binds to port 8855.  
Click **Stop** to shut it down.

### How It Works
When started, the Mock Server:
1. Reads all endpoints from your API catalog
2. Creates a mock route for each one
3. Returns generated mock responses matching the response schema
4. Logs every request it receives

### Request Log
The log shows every call made to the Mock Server:

| Column | Description |
|--------|-------------|
| # | Sequential request number |
| Time | Timestamp of the request |
| Method | HTTP verb |
| Path | Requested path |
| Status | HTTP status code returned |
| Matched | Whether the path matched a known catalog endpoint |

Use the log to verify your BotJob is calling the right endpoints with the right methods.

### Stats
At the top of the page:
- **Total Requests** — Count since the server was started
- **Match Rate** — Percentage of requests that matched a catalog endpoint
- **Most Hit** — The endpoint called most frequently

### Clear Log
Click **Clear Log** to reset the request log without restarting the server.

---

## 13. Bot Builder — AI Test Assistant

**Bot Builder** is ARAPI's built-in AI assistant that can take real actions: search your catalog, create BotJobs, and execute tests — all from a conversation.

### Accessing Bot Builder
Click **Bot Builder** in the navigation sidebar.

### Starting a Conversation
The assistant opens with four starter suggestions:
- *"I want to create a BotJob that creates a new client"*
- *"What BotJobs do I already have?"*
- *"Search the catalog for payment endpoints"*
- *"Run all my BotJobs against the Mock Server"*

Click any suggestion or type your own question.

### What the Bot Builder Can Do

#### Search the Catalog
Ask in natural language — the assistant searches your catalog by method, path, summary, and tags.

> *"Find endpoints related to KYC and onboarding"*  
> *"Show me all POST endpoints for account management"*  
> *"What payment transfer APIs do I have?"*

Results appear as a collapsible card showing method, path, and summary for each match.

#### List Existing BotJobs
> *"What BotJobs do I have?"*  
> *"List all my test workflows."*

The assistant returns a list of all BotJobs with their names, IDs, and descriptions.

#### Create a BotJob
> *"Create a BotJob called 'Full Client Onboarding Test'"*  
> *"I need a test for the payment flow — create a BotJob for that"*

The assistant creates the BotJob in the database and returns:
- The new BotJob name and ID
- A card with an **Open Designer** link to add commands

When using Anthropic Claude as your AI provider, the assistant first searches the catalog for relevant endpoints, then creates the BotJob with full context.

#### List Environments
> *"What environments do I have configured?"*  
> *"Show me the available test targets."*

#### Execute a BotJob
> *"Run the 'Client Onboarding' BotJob against the Mock Server"*  
> *"Execute BotJob [ID] on staging"*

The assistant runs the BotJob and displays an execution result card showing pass/fail counts and status.

### Provider Badge
The top-right corner shows which AI provider is active. If no provider is configured, a warning badge links you to Settings.

### Anthropic vs Other Providers
- **With Anthropic Claude** — The assistant uses Anthropic's tool-use API for a true agentic loop: it can search the catalog, act on results, and create BotJobs in a single conversation turn
- **With other providers (Together.ai, OpenAI, Gemini, etc.)** — The assistant answers your question with a text response; catalog search and BotJob creation still work but may require more explicit instructions

---

## 14. Settings — AI Providers

### Supported Providers

| Provider | Key Format | Default Model |
|----------|-----------|---------------|
| OpenAI | `sk-...` | gpt-4o-mini |
| Anthropic | `sk-ant-...` | claude-3-5-haiku-20241022 |
| Google Gemini | Google API key | gemini-1.5-flash |
| Azure OpenAI | Azure key | gpt-4o-mini (+ base URL required) |
| Ollama | No key needed | llama3.2 (+ base URL required) |
| Together.ai | `tgp_v1_...` | meta-llama/Llama-3.3-70B-Instruct-Turbo |
| Custom | Any | gpt-4o-mini (+ base URL required) |

### Adding a Provider
1. Go to **Settings → AI Providers**
2. Find the provider card and click to expand it
3. Enter your API key
4. Optionally change the model name
5. For Azure / Ollama / Custom: enter the base URL
6. Click **Save**

### Default Provider
Toggle **DEFAULT** on exactly one provider. The default provider is used by:
- AR Conversational (if installed alongside)
- Bot Builder text-completion fallback
- All AI-powered features that do not specify a provider

Status indicators:
- **Green DEFAULT** — Provider is set as default and has an API key configured
- **Red NO KEY** — Provider is set as default but no API key is saved
- **Grey SET DEFAULT** — Provider is not the default

> **Rule:** Only one provider can be DEFAULT at a time. Enabling a new provider as default automatically disables the previous default.

### Test Connection
Click **Test** on any provider card to verify:
- The API key is valid
- The provider API is reachable
- Response time (milliseconds) is shown

The test sends a minimal prompt ("Say exactly: OK") and displays the result.

### Key Security
API keys are stored encrypted in the database using AES-256-GCM. They are:
- Never logged in plain text
- Never included in exports
- Shown as `••••••••••••` in the UI after saving

---

## 15. What ARAPI Can Do Today

### Import & Catalog
- Import OpenAPI 3.0 and Swagger 2.0 specs (JSON and YAML)
- Upload individual files or entire folder trees with subfolder preservation
- Import from server filesystem paths (admin/desktop use)
- Auto-map endpoints to 25 banking business categories
- Keyword search across the full catalog
- Export catalog as Postman Collection or Bash/curl script

### BotJob Design
- Visual drag-and-drop workflow designer
- 8 runnable command types (API_CALL, SET_VARIABLE, ASSERT_STATUS_CODE, ASSERT_FIELD_VALUE, ASSERT_JSON_PATH_EXISTS, EXTRACT_JSON_PATH, WAIT, STOP_ON_FAILURE)
- Multi-block workflow structure
- Variable system with `${token}` resolution
- Secret variable masking
- Enable/disable individual commands without deleting them
- Save complete BotJob state in one click

### Execution
- Execute any BotJob against any environment
- Built-in Mock Server sandbox (port 8855)
- Custom environment management (name, base URL, headers, default)
- Real-time step-by-step result tracking
- Anti-hallucination validation (endpoints must exist in catalog)

### Results & Reporting
- Full execution history with filtering by BotJob
- Step detail view (request JSON, response JSON, assertion results)
- HTML report download (browser-printable to PDF)
- CSV export for spreadsheets and BI tools

### Bot Builder AI
- Natural language catalog search
- AI-assisted BotJob creation
- BotJob execution from chat
- Environment listing
- Anthropic tool-use agentic loop (for Claude users)
- Text-completion fallback for other providers

### Settings
- 7 AI providers with API key management
- Encrypted key storage (AES-256-GCM)
- One-click connection testing with latency
- Default provider toggle (exclusive, atomic)

---

## 16. What ARAPI Will Be Able to Do

### Short Term
- **IF/ELSE branching** — Conditional logic in BotJobs based on response values or variables
- **LOOP / FOR_EACH** — Iterate over a list of values (e.g., test 10 client IDs in one BotJob)
- **READ_CSV / READ_EXCEL** — Data-driven testing: load test data from a spreadsheet, run the BotJob once per row
- **CALL_COMPONENT** — Reusable sub-workflows: define "Login" once, call it from any BotJob
- **Retry on failure** — Auto-retry flaky steps with configurable backoff

### Medium Term
- **AI_GENERATE_DATA** — Use AI to generate realistic test payloads (names, IBANs, amounts)
- **Schema validation command** — Assert that a response matches a specific JSON schema
- **Parallel execution** — Run multiple BotJobs simultaneously and aggregate results
- **Scheduled runs** — Cron-based automation: run regression suites nightly or hourly
- **Test Collections** — Group BotJobs into suites for regression, smoke, and integration testing
- **CI/CD integration** — REST API and CLI to trigger runs from Jenkins, GitHub Actions, GitLab CI

### Long Term
- **Visual test recorder** — Record API calls from a browser session and auto-generate a BotJob
- **Diff testing** — Compare API responses between two environments (staging vs production)
- **Performance baseline** — Track response times over time and alert on regressions
- **Multi-region execution** — Run BotJobs from geographically distributed nodes
- **Custom report templates** — White-label HTML reports with your bank's branding
- **RBAC** — Role-based access control for catalog, BotJobs, and execution results
- **Webhooks** — Post execution results to Slack, Teams, or any webhook endpoint on completion

---

## 17. Security & Architecture

### Data Security
- API provider keys encrypted at rest (AES-256-GCM, SHA-256 key derivation)
- Master encryption key stored in a protected file (`0600` permissions) or environment variable
- No API keys appear in logs, exports, or HTTP responses
- Sidecar server binds to `127.0.0.1` only — not exposed directly to the network

### Anti-Hallucination Guarantee
Before executing any BotJob, ARAPI validates every `API_CALL` endpoint ID against the live catalog. If an endpoint no longer exists (or was never imported), execution is blocked with a clear error. The AI assistant is subject to the same rule — it cannot create a BotJob that references a non-existent endpoint.

### Network Architecture
```
Browser / Desktop App
       │ HTTPS
       ▼
   nginx reverse proxy
       │
       ▼
   ARAPI web UI (port 80/443)
       │ /api/* proxy
       ▼
   Sidecar (127.0.0.1:8787)
       │
       ├── SQLite database (WAL mode)
       ├── Mock Server (port 8855)
       └── AI provider APIs (outbound only)
```

### Database
- SQLite with WAL (Write-Ahead Logging) for concurrent reads
- Single shared connection — no connection pool needed
- All writes serialized through the sidecar process

### Supported Deployment Targets
| Target | Description |
|--------|-------------|
| Docker Compose | Production — nginx + web + API in containers |
| Tauri Desktop | macOS / Windows desktop app |
| Development | Vite dev server proxying to local sidecar |

---

## 18. REST API Reference

All API endpoints are prefixed with `/api/` when accessed through the nginx proxy.

### Health
| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Sidecar health check |

### API Catalog
| Method | Path | Description |
|--------|------|-------------|
| GET | `/catalog/endpoints` | List all endpoints with category mapping |
| POST | `/import` | Import from server filesystem path |
| POST | `/import/upload` | Upload files from browser |
| PUT | `/catalog/endpoints/{id}/category` | Manually map endpoint to category |
| GET | `/catalog/export/postman` | Download Postman Collection JSON |
| GET | `/catalog/export/bash` | Download bash/curl script |

### Taxonomy
| Method | Path | Description |
|--------|------|-------------|
| GET | `/taxonomy` | List 25 categories and their subcategories |

### Environments
| Method | Path | Description |
|--------|------|-------------|
| GET | `/environments` | List all environments |
| POST | `/environments` | Create new environment |
| PUT | `/environments/{id}` | Update environment |
| DELETE | `/environments/{id}` | Delete environment |

### BotJobs
| Method | Path | Description |
|--------|------|-------------|
| GET | `/botjobs` | List all BotJobs |
| POST | `/botjobs` | Create new BotJob |
| GET | `/botjobs/{id}` | Get full BotJob (blocks, commands, variables) |
| PUT | `/botjobs/{id}` | Save/update complete BotJob |
| DELETE | `/botjobs/{id}` | Delete BotJob and all its data |
| POST | `/botjobs/{id}/execute` | Execute BotJob (`{ "environmentId": "mock" }`) |

### Execution & Results
| Method | Path | Description |
|--------|------|-------------|
| GET | `/executions` | List runs (filter: `?botJobId=`) |
| GET | `/executions/{runId}/steps` | Get step results for a run |
| GET | `/executions/{runId}/report.html` | Download HTML report |
| GET | `/executions/{runId}/report.csv` | Download CSV report |

### Mock Server
| Method | Path | Description |
|--------|------|-------------|
| GET | `/mock/status` | Status: `{ running, port }` |
| POST | `/mock/start` | Start the Mock Server |
| POST | `/mock/stop` | Stop the Mock Server |
| GET | `/mock/log` | Get request log entries |
| POST | `/mock/log/clear` | Clear request log |

### AI Settings
| Method | Path | Description |
|--------|------|-------------|
| GET | `/settings/ai-providers` | List providers (keys redacted) |
| POST | `/settings/ai-providers` | Create/update provider |
| POST | `/settings/ai-providers/set-default` | Set default provider (atomic) |
| POST | `/settings/ai-providers/test` | Test provider (`{ "provider": "together" }`) |

### Bot Builder
| Method | Path | Description |
|--------|------|-------------|
| POST | `/app-assistant/chat` | Chat (`{ "messages": [{role, content}] }`) |

### AR Conversational Agents
| Method | Path | Description |
|--------|------|-------------|
| GET | `/agents` | List all agents and their domains |
| GET | `/agents/capabilities` | Capability summary per agent |
| POST | `/agents/ask` | Ask question (`{ question, mode, agentId? }`) |

---

*ARAPI — No-code API test automation for banking and fintech teams.*
