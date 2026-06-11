# AR Conversational
## User Manual — Complete Feature Guide

**Product:** AR Conversational  
**Version:** Pilot 3  
**Audience:** Business Users, Bank Staff, IT Administrators  

---

## Table of Contents

1. [What is AR Conversational?](#1-what-is-ar-conversational)
2. [How It Works](#2-how-it-works)
3. [Conversation Modes](#3-conversation-modes)
4. [The 14 Specialist Agents](#4-the-14-specialist-agents)
5. [Asking Questions](#5-asking-questions)
6. [Understanding the Answer](#6-understanding-the-answer)
7. [Business Coverage — 25 Banking Domains](#7-business-coverage--25-banking-domains)
8. [AI Provider Configuration](#8-ai-provider-configuration)
9. [What AR Conversational Can Do Today](#9-what-ar-conversational-can-do-today)
10. [What AR Conversational Will Be Able to Do](#10-what-ar-conversational-will-be-able-to-do)
11. [Security & Data Handling](#11-security--data-handling)
12. [Quick Reference — Sample Questions](#12-quick-reference--sample-questions)

---

## 1. What is AR Conversational?

**AR Conversational** is an AI-powered banking assistant that understands natural-language questions from bank staff (and, in client mode, from retail/private banking clients) and answers them by consulting your bank's real API catalog.

It is not a chatbot with scripted answers. It is an **intelligent routing and composition engine** that:

- Reads your question in plain language (English or Italian)
- Identifies which banking domain the question belongs to
- Routes the question to the correct specialist AI agent
- Consults your bank's actual API endpoints to find the answer
- Returns a structured, evidence-backed response

AR Conversational acts as a **digital banking subject-matter expert** — available 24/7, with knowledge of every API your bank has exposed.

---

## 2. How It Works

```
User question
     │
     ▼
 BankingAgentRouter
 (keyword scoring)
     │
     ▼
 Best-fit Specialist Agent
 (domain-specific knowledge)
     │
     ▼
 API Catalog Lookup
 (real endpoints validated)
     │
     ▼
 AI Composition
 (generates a structured answer)
     │
     ▼
 Answer + Evidence + Limitations
```

### The Three-Layer Design

**Layer 1 — Routing**  
The router scores your question against every agent's known keywords and capabilities. The agent with the best match is selected automatically. You can also select a specialist manually.

**Layer 2 — Validation**  
Every endpoint the AI wants to reference is checked against your actual imported API catalog. The system cannot invent or hallucinate endpoints that do not exist in your bank's OpenAPI specifications. This is a hard architectural constraint.

**Layer 3 — AI Composition**  
The validated endpoint information is sent to your configured AI provider (OpenAI, Claude, Gemini, Together.ai, Ollama, etc.), which composes a clear, natural-language answer.

---

## 3. Conversation Modes

AR Conversational operates in two distinct modes, tailored to the audience:

### Employee Mode
For internal bank staff: relationship managers, portfolio advisors, cash managers, compliance officers, back-office operations, auditors, and management.

- Full access to operational, regulatory, and technical information
- Access to 9 employee-facing specialist agents
- Can retrieve sensitive risk metrics, compliance data, audit trails
- Answers include operational context and regulatory references

### Client Mode
For retail and private banking clients via a bank-branded interface.

- Restricted to public-facing account and product information
- Access to 5 client-facing specialist agents
- Answers use simplified language; no internal jargon
- Cannot access other clients' data or operational systems

> **How to switch modes:** Use the mode selector at the top of the AR Conversational page before asking your question.

---

## 4. The 14 Specialist Agents

AR Conversational is powered by 14 specialist agents — 9 for employee use and 5 for client use. Each agent has deep expertise in a specific banking domain.

---

### Employee Agents

#### 1. Relationship Manager
**Domain:** Client relationships, CRM, onboarding  
**Handles questions about:**  
- Client 360-degree views and profiles
- KYC status and onboarding pipelines
- Client segmentation (retail, private, corporate)
- Relationship history and touchpoints
- Mandate and advisory agreements

#### 2. Portfolio Advisor
**Domain:** Investment portfolios and wealth management  
**Handles questions about:**  
- Portfolio holdings and positions
- Asset allocation and rebalancing
- Performance attribution and returns
- Investment mandates and constraints
- Suitability assessments

#### 3. Cash and Payments Agent
**Domain:** Treasury, payments, transfers  
**Handles questions about:**  
- Account balances (available, booked, holds)
- SEPA credit transfers and direct debits
- SWIFT international wire transfers
- Standing orders and scheduled payments
- Intraday liquidity and cash positioning

#### 4. Securities Trading Agent
**Domain:** Capital markets and execution  
**Handles questions about:**  
- Order entry and management (equities, bonds, derivatives)
- Trade execution and fill status
- Market data and real-time quotes
- Trading history and blotter
- Settlement status and confirmations

#### 5. Credit and Lending Agent
**Domain:** Loans, credit, mortgages  
**Handles questions about:**  
- Consumer and corporate loan details
- Credit limit utilization and headroom
- Mortgage terms and repayment schedules
- Collateral and guarantee structures
- Loan origination and approval workflows

#### 6. Compliance and Risk Agent
**Domain:** Regulatory compliance, AML, risk  
**Handles questions about:**  
- AML/KYC screening results
- Sanctions list checks
- Compliance alerts and exceptions
- Risk exposure and limit monitoring
- Regulatory reporting status

#### 7. Back Office Operations Agent
**Domain:** Post-trade, settlement, corporate actions  
**Handles questions about:**  
- Trade settlement and failed trades
- Reconciliation breaks
- Corporate actions (dividends, splits, rights)
- Nostro/vostro account management
- Custody and safekeeping positions

#### 8. Reporting and COO Agent
**Domain:** Management information, KPIs, regulatory metrics  
**Handles questions about:**  
- Operational dashboards and KPI reports
- Regulatory reporting (Basel, MiFID, EMIR)
- P&L attribution and revenue analysis
- SLA monitoring and incident metrics
- Capacity and volume statistics

#### 9. Audit and UAT Agent
**Domain:** Audit trails, testing, system health  
**Handles questions about:**  
- Audit event logs and access history
- UAT test case management
- System health checks and API diagnostics
- Change management records
- Regulatory audit responses

---

### Client-Facing Agents

#### 10. Client Wealth Assistant
**Domain:** Personal investments and portfolio overview  
**Handles questions about:**  
- Portfolio total value and allocation breakdown
- Individual holding performance
- Year-to-date returns
- Upcoming maturities or events

#### 11. Client Cash Assistant
**Domain:** Accounts, balances, transactions  
**Handles questions about:**  
- Available and booked account balance
- Recent transaction history
- Pending transactions and holds
- IBAN and account details

#### 12. Client Trading Assistant
**Domain:** Personal orders and trades  
**Handles questions about:**  
- Status of open orders
- Historical trade executions
- Dividends and corporate action entitlements

#### 13. Client Credit Assistant
**Domain:** Personal loans and credit products  
**Handles questions about:**  
- Loan balances and next repayment dates
- Credit card limits and usage
- Mortgage details and outstanding balance
- Repayment history

#### 14. Client Messages and Documents Assistant
**Domain:** Statements, documents, communications  
**Handles questions about:**  
- Account statements (PDF download links)
- Tax documents and certificates
- Bank notices and secure messages
- Document archive access

---

## 5. Asking Questions

### Natural Language Input
Ask questions the same way you would ask a colleague. No special syntax required.

**Examples (Employee Mode):**
- *"What is the current AML screening status for client ID 12345?"*
- *"Show me the portfolio allocation for account number CH93-0076-2011-6238-5295-7."*
- *"What SEPA payments are pending settlement today?"*
- *"Has there been any suspicious activity flagged on account 98765 in the last 30 days?"*

**Examples (Client Mode):**
- *"What is my account balance?"*
- *"Show me my last 10 transactions."*
- *"When is my next loan repayment?"*
- *"Can I get my last bank statement?"*

### Manually Selecting a Specialist
If you know which domain your question belongs to, you can select a specialist agent directly from the specialist selector dropdown. This bypasses the automatic routing and sends your question directly to that agent.

**When to use manual selection:**
- Your question is very specific to one domain
- The automatic routing selected the wrong agent
- You want to explore a specific agent's capabilities

### Multi-Language Support
AR Conversational understands and responds in **English** and **Italian**. The AI composes its answer in the same language as your question.

---

## 6. Understanding the Answer

Every response from AR Conversational includes three components:

### The Answer
A clear, natural-language response to your question composed by the AI using validated banking API data as its reference.

### Evidence
The specific API endpoints that were consulted to formulate the answer. Shown as:
- HTTP method (GET, POST, etc.)
- API path (e.g., `/v1/accounts/{accountId}/balance`)
- Summary description

Evidence confirms that the answer is grounded in your bank's real API specifications, not invented content.

### Limitations
When your bank has not yet imported the API specifications needed to fully answer your question, Limitations appear as a warning. This tells you which capabilities are missing from your catalog and suggests importing the relevant specifications.

> **Important:** AR Conversational will never provide an answer based on endpoints that do not exist in your imported API catalog. If the required APIs are not imported, you will receive a clear limitation notice rather than an incorrect or fabricated answer.

---

## 7. Business Coverage — 25 Banking Domains

AR Conversational covers **25 core banking business domains**, each with 5 subcategories. These map automatically to your imported API catalog.

| # | Domain | Key Topics |
|---|--------|------------|
| 1 | Customer & Onboarding | KYC, identity verification, client profiles |
| 2 | Accounts | Current accounts, savings, IBAN, account opening |
| 3 | Balances | Available balance, booked balance, holds, overdrafts |
| 4 | Payments & Transfers | SEPA, SWIFT, instant payments, standing orders |
| 5 | Cards | Debit cards, credit cards, limits, disputes |
| 6 | Securities & Trading | Orders, executions, market data, settlement |
| 7 | Portfolio & Holdings | Positions, allocation, NAV, performance |
| 8 | Investment Advisory | Suitability, recommendations, mandates |
| 9 | Credit & Lending | Loans, mortgages, credit lines, collateral |
| 10 | Deposits & Treasury | Term deposits, FX deposits, rates |
| 11 | Foreign Exchange | Spot, forward, hedging, FX rates |
| 12 | Compliance & AML | Screening, sanctions, alerts, reports |
| 13 | Risk Management | Exposure, limits, VaR, stress tests |
| 14 | Fraud & Disputes | Chargebacks, fraud investigations, alerts |
| 15 | Statements & Documents | PDF statements, tax docs, certificates |
| 16 | Notifications & Messaging | Alerts, SMS, email, secure messages |
| 17 | Authentication & Access | MFA, sessions, consents, tokens |
| 18 | Beneficiaries & Payees | Payee management, verification, whitelists |
| 19 | Standing Orders & Schedules | Recurring payments, direct debits |
| 20 | Reporting & Analytics | Dashboards, KPIs, regulatory metrics |
| 21 | Back Office & Settlement | Reconciliation, corporate actions, nostro |
| 22 | Wealth & Private Banking | Discretionary management, mandates |
| 23 | Insurance & Bancassurance | Policies, claims, premiums |
| 24 | Fees & Pricing | Tariffs, charges, fee schedules, bundles |
| 25 | Audit & Operations | Audit trails, UAT, health checks |

---

## 8. AI Provider Configuration

AR Conversational uses your configured AI provider to compose answers. The system supports:

| Provider | Description |
|----------|-------------|
| **OpenAI** | GPT-4o and GPT-4o-mini models |
| **Anthropic Claude** | Claude 3.5 Haiku and Sonnet models |
| **Google Gemini** | Gemini 1.5 Flash and Pro models |
| **Azure OpenAI** | Microsoft Azure-hosted OpenAI models |
| **Together.ai** | Open-source models (Llama 3.3, Qwen, etc.) |
| **Ollama** | Local/on-premise models (fully private) |
| **Custom** | Any OpenAI-compatible endpoint |

### Configuration
Go to **Settings → AI Providers** to add your API key. Designate one provider as the **DEFAULT** — this is what AR Conversational will use for all queries.

### What happens without an AI provider?
AR Conversational falls back to a **rule-based response** that lists relevant endpoints but does not compose a natural-language answer. Full conversational capability requires at least one AI provider configured.

---

## 9. What AR Conversational Can Do Today

### Currently Working Features

- **Natural language question answering** in English and Italian
- **Automatic routing** to 1 of 14 specialist agents based on question content
- **Manual specialist selection** for direct access to any agent
- **Employee mode** for internal bank staff with full operational access
- **Client mode** for retail/private banking customers
- **Evidence-backed answers** citing real API endpoints from your catalog
- **Limitations reporting** when required APIs are not yet imported
- **25 banking domain coverage** mapped to your API catalog
- **Anti-hallucination guarantee** — only real, imported endpoints are referenced
- **7 AI provider integrations** — choose the AI that fits your compliance needs
- **Multi-language support** — English and Italian
- **API key encryption at rest** — AES-256-GCM for provider credentials

---

## 10. What AR Conversational Will Be Able to Do

The following capabilities are planned for upcoming releases:

### Short Term
- **Real-time API execution** — today AR Conversational reads your API catalog; tomorrow it will call live banking APIs and return actual account data in answers
- **Session context** — remember previous questions in the same conversation for multi-turn dialogue (e.g., "now show me the portfolio for that same client")
- **Structured output cards** — balance amounts, transaction tables, charts rendered directly in the chat UI

### Medium Term
- **Action execution** — initiate payments, book transfers, create orders from the conversation (with approval workflow)
- **Custom agent profiles** — define your own specialist agents tuned to your bank's specific API taxonomy
- **Audit trail per conversation** — full log of every question, agent used, endpoint consulted, and AI response for regulatory compliance
- **Multi-client disambiguation** — ask about multiple clients in one session with clear context separation

### Long Term
- **Proactive alerts** — AR Conversational surfaces unusual patterns or compliance breaches without being asked
- **Integration with bank CRM** — pre-fills context based on the client currently open in your CRM
- **Voice interface** — speak questions, receive spoken answers (for call-centre environments)
- **Regulatory report generation** — compose full regulatory documents from natural language instructions

---

## 11. Security & Data Handling

### API Key Protection
All AI provider API keys are encrypted in the database using **AES-256-GCM** encryption. Keys are never stored in plain text and are redacted from all logs and exports.

### No Data Leaves Without Your Consent
AR Conversational only sends your question (and relevant API metadata) to the AI provider you configure. It does not send customer PII unless your own API responses include it as part of your bank's API data.

### Ollama for Full Privacy
If your regulatory or compliance requirements prohibit sending data to external cloud AI providers, configure **Ollama** as your AI provider. Ollama runs entirely on your own infrastructure — nothing leaves your network.

### Anti-Hallucination Architecture
The system cannot invent banking endpoints. Every endpoint referenced in an answer must exist in your imported API catalog. This constraint is enforced at the architecture level, not as a prompt instruction.

### Audit Logging
All API calls to the sidecar backend are logged. Questions, agent routing decisions, and AI responses are available in server logs for audit purposes.

---

## 12. Quick Reference — Sample Questions

### Employee Mode — Relationship Manager
- *"What is the onboarding status for new client Mario Rossi?"*
- *"Show me all clients flagged for KYC review this week."*
- *"Who are our top 10 clients by AUM?"*

### Employee Mode — Portfolio Advisor
- *"What is the current asset allocation for portfolio P-98765?"*
- *"Which holdings are outside mandate constraints right now?"*
- *"Show the year-to-date performance for all discretionary mandates."*

### Employee Mode — Payments
- *"What is the status of SWIFT transfer REF-20240611-001?"*
- *"How many SEPA rejections did we have yesterday?"*
- *"List all standing orders for account CH93-0076."*

### Employee Mode — Compliance
- *"Has client ID 44321 triggered any AML alerts in the last 90 days?"*
- *"What is the current sanctions screening failure rate?"*
- *"Show the open compliance exceptions older than 30 days."*

### Client Mode — Cash
- *"What is my current account balance?"*
- *"Show me transactions from the last 7 days."*
- *"Is there a hold on my account?"*

### Client Mode — Investments
- *"How is my portfolio performing this year?"*
- *"What investments do I hold right now?"*
- *"When does my term deposit mature?"*

---

*AR Conversational — Turning your API catalog into a 24/7 banking expert.*
