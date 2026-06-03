# routes/

The MVP defines routes inline in `../server.ts` using a zero-dependency Node HTTP
router (guarantees the sidecar runs after a plain `npm install`).

When you upgrade to **Fastify** (roadmap recommendation), split each concern into
its own plugin module here, e.g.:

```
routes/
├── catalog.routes.ts
├── import.routes.ts
├── botjob.routes.ts
├── execution.routes.ts
├── agents.routes.ts
├── mock.routes.ts
└── settings.routes.ts
```

Each module exports a Fastify plugin and is registered in `server.ts`.
