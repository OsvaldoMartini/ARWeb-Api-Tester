# ARWeb API Tester — Roadmap Status

> Updated: 2026-06-06 | v0.1.0 | [ragstack.ch](https://ragstack.ch)

## Done

| Phase | Name | Key deliverable |
|-------|------|-----------------|
| 0 | Product Definition | Specs, pilots, architecture docs |
| 1 | Tauri + React Foundation | Desktop shell, Vite dev server |
| 2 | Domain Model | 20+ TypeScript entities |
| 3 | SQLite Persistence | 19-table schema, WAL, repos |
| 4 | OpenAPI Import | YAML/JSON recursive scan |
| 5 | Catalog Validator | Anti-hallucination gate |
| 6 | Banking Taxonomy UI | 25 categories, auto-map on import |
| Web | ragstack.ch Deployment | Docker, nginx, Traefik, Let's Encrypt |
| 8 | BotJob Engine | CRUD designer, executor, step audit trail |
| 10 | Mock Server UI | Request log table, stats, clear |
| 11 | AI Layer | 7 providers, Settings page, live routing |
| **7** | **Multi-Agent Banking Assistant** | **14 agents wired to catalog, evidence, AI answers** |

## Pending

| Phase | Name | Effort |
|-------|------|--------|
| 9 | Visual BotJob Designer | Drag-and-drop canvas |
| 12 | Reports & Exports | PDF, Postman collection |
| 13 | UX Polish | Loading states, error boundaries |
| 14 | Security + Tauri exe | Encrypt keys, sign installer, v1.0 |

## Architecture (one-liner)

```
Browser/Tauri → React+TS → Node sidecar (port 8787) → SQLite
                                ↓
              14 banking agents (keyword router + AI gateway)
              BotJob engine (8 MVP commands)
              Mock server (catalog replay)
```
