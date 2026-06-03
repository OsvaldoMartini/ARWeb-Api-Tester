# SQLite persistence (Phase 3) — implementation note

The MVP ships with `InMemoryCatalogRepository` so the app runs with zero native
dependencies. To make the catalog persistent (the roadmap explicitly warns against
keeping it only in memory), implement the SAME ports with SQLite:

Recommended stack: `better-sqlite3` + `drizzle-orm`.

1. `npm i better-sqlite3 drizzle-orm` and `npm i -D drizzle-kit @types/better-sqlite3`
   inside `packages/infrastructure`.
2. Define the schema (tables listed in ROADMAP Phase 3) in `schema.ts`.
3. Implement `SqliteCatalogRepository implements CatalogReadPort, CatalogWritePort`.
4. Implement the other repositories (BotJob, Execution, Taxonomy, Settings).
5. Encrypt `AiProviderSetting.encryptedApiKey` before insert (see `ai/crypto.ts`).
6. Swap the binding in `server/src/bootstrap/container.ts` — callers
   are unaffected because they depend on the port interfaces, not the impl.
