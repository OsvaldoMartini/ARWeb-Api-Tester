# ARWeb API Tester — Project README

> Last updated: 2026-06-06 | Version: 0.1.0 | Branch: master

## What is this?

A no-code API testing tool for banking clients. Non-technical users can import an OpenAPI spec, browse endpoints by banking category, compose automated test sequences (BotJobs), run them against a local mock server or a real API, and view step-by-step audit trails — all without writing code or using Postman.

Delivered as:
- **Desktop app** — Tauri v2 Windows executable (`.exe` installer)
- **Web app** — Docker-hosted at [https://ragstack.ch](https://ragstack.ch), open to everyone, no login

---

## Architecture at a glance

```
Browser / Tauri WebView
        │  React + TypeScript (Vite)
        │  /api/* proxied to sidecar
        ▼
Node.js Sidecar (port 8787)
        │  server/src/server.ts — 30+ HTTP routes
        │  packages/agents      — 14 banking AI agents
        │  packages/api-testing-engine — BotJob executor
        ▼
SQLite (better-sqlite3)
        data/app.db — single file, WAL mode
        Same schema for desktop and web
```

**Monorepo packages:**

| Package | Role |
|---------|------|
| `domain` | Entities, enums, interfaces |
| `application` | Use cases, ports, validators |
| `infrastructure` | SQLite repos, OpenAPI importer, AI gateway |
| `agents` | 14 banking agents + router |
| `api-testing-engine` | BotJob execution engine |
| `mock-server` | Local HTTP mock server |
| `shared-ui` | React design system |
| `common` | Logger, uuid, result types |

---

## Phase status

| Phase | Name | Status |
|-------|------|--------|
| 0 | Product Definition | ✅ Done |
| 1 | Tauri + React Foundation | ✅ Done |
| 2 | TypeScript Domain Model | ✅ Done |
| 3 | SQLite Persistence Layer | ✅ Done |
| 4 | OpenAPI Import Engine | ✅ Done |
| 5 | RealApiCatalogValidator | ✅ Done |
| 6 | Banking Taxonomy UI | ✅ Done |
| Web | ragstack.ch Docker Deployment | ✅ Done |
| 8 | BotJob Engine + Execution | ✅ Done |
| 10 | Mock Server UI | ✅ Done |
| 11 | AI Layer (7 providers) | ✅ Done |
| 7 | Multi-Agent Banking Assistant | ⬜ Next |
| 9 | Visual No-Code BotJob Designer | ⬜ Pending |
| 12 | Reports & Exports | ⬜ Pending |
| 13 | React UX Polish | ⬜ Pending |
| 14 | Security & Tauri Packaging | ⬜ Pending |

---

## Local development

**Prerequisites:** Node.js 22+, Rust toolchain (for Tauri), npm

```bash
# Install dependencies
npm install

# Start the React dev server + Node sidecar
npm run tauri:dev        # Tauri desktop app
# or for web-only dev:
npm run dev              # React on :5173
npm run start --workspace @arweb/server   # sidecar on :8787
```

The Vite dev server proxies `/api/*` → `http://127.0.0.1:8787`.

---

## Building

### Web (Docker — ragstack.ch)

```bash
./build-images.sh           # build Docker images
./build-images.sh --no-cache  # force fresh build
./restart.sh                # deploy / restart containers
```

### Desktop (Windows .exe)

Open PowerShell as Administrator:

```powershell
.\scripts\release.ps1 patch   # bump patch version, build, package
.\scripts\release.ps1 minor   # bump minor version
.\scripts\release.bat patch   # same, .bat wrapper
```

Artifacts land in `releases\vX.Y.Z\`. See `scripts/README.md` for full details.

---

## Key routes (sidecar HTTP API)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Liveness check |
| GET | `/catalog/endpoints` | List all imported endpoints |
| POST | `/import` | Import OpenAPI specs from a folder |
| GET | `/taxonomy` | Banking categories + subcategories |
| PUT | `/catalog/endpoints/:id/category` | Assign a category |
| GET | `/agents` | List banking agents |
| POST | `/agents/ask` | Ask the AI assistant |
| GET | `/botjobs` | List BotJobs |
| POST | `/botjobs` | Create a BotJob |
| GET | `/botjobs/:id` | Get job + blocks + commands + vars |
| PUT | `/botjobs/:id` | Save full BotJob |
| DELETE | `/botjobs/:id` | Delete a BotJob |
| POST | `/botjobs/:id/execute` | Run a BotJob (mock or real) |
| GET | `/executions` | List execution history |
| GET | `/executions/:runId/steps` | Step-by-step audit trail |
| GET | `/mock/status` | Mock server status |
| POST | `/mock/start` | Start mock server |
| POST | `/mock/stop` | Stop mock server |
| GET | `/mock/log` | Request log (last 200) |
| POST | `/mock/log/clear` | Clear the log |
| GET | `/settings/ai-providers` | List AI provider configs |
| POST | `/settings/ai-providers` | Save an AI provider config |

---

## AI providers (Phase 11)

Configured via **Settings** page. Keys stored in SQLite, never logged.

| Provider | Default model | Key required |
|----------|---------------|--------------|
| OpenAI | gpt-4o-mini | Yes |
| Anthropic | claude-3-5-haiku-20241022 | Yes |
| Google Gemini | gemini-1.5-flash | Yes |
| Azure OpenAI | gpt-4o-mini | Yes + base URL |
| Ollama (local) | llama3.2 | No (base URL) |
| Together.ai | meta-llama/Llama-3-8b-chat-hf | Yes |
| Custom OpenAI-compatible | gpt-4o-mini | Yes + base URL |

Without a key the app returns offline rule-based answers — it never breaks.

---

## Web deployment (ragstack.ch)

```
Browser → HTTPS → Hetzner VPS (Traefik + Let's Encrypt)
       → WireGuard tunnel → Multiserver (192.168.1.50)
       → Traefik → nginx:30880 → arweb-api:8787 → SQLite
```

**SQLite volume:** `./data:/app/data` on the multiserver.  
**Traefik configs:** `vps-proxy/dynamic/routes.yml` (VPS) and `MultiTraderAI-Docker-Bots/dynamic/ragstack.yml` (multiserver).

> The local `data/app.db` is owned by root after the first Docker run.  
> Fix with: `sudo chown $USER:$USER data/app.db data/app.db-*`

---

## Repository layout

```
src/                  React frontend (pages, components, services)
server/               Node.js sidecar entry point + HTTP API
packages/             Monorepo packages (domain → infra → agents → engine)
src-tauri/            Tauri shell (Rust)
scripts/              Build + release scripts (PS1, SH, BAT)
releases/             Binary artifacts (gitignored) + INDEX.md
specifications/       Architecture docs, roadmap, pilots
docker/               nginx.conf for web deployment
data/                 SQLite DB (gitignored, Docker volume)
```
