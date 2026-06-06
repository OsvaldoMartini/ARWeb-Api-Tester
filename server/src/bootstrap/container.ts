import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ConsoleLogger, type Logger } from '@arweb/common';
import { RealApiCatalogValidator, ImportOpenApiUseCase } from '@arweb/application';
import {
  OpenApiCatalogImporter,
  FetchHttpExecutor,
  AiProviderService,
  bankingTaxonomySeed,
  HtmlCsvReportExporter,
  openDatabase,
  SqliteCatalogRepository,
  SqliteBotJobRepository,
  SqliteExecutionRepository,
  SqliteTaxonomyRepository,
  SqliteSettingsRepository,
} from '@arweb/infrastructure';
import { BotJobExecutionEngine } from '@arweb/api-testing-engine';
import { BankingAgentRouter, createAllAgents } from '@arweb/agents';
import { MockServer } from '@arweb/mock-server';

// Resolve the repo root regardless of which directory the process was started from.
const _dir = dirname(fileURLToPath(import.meta.url));
const _repoRoot = join(_dir, '..', '..', '..'); // server/src/bootstrap → repo root
const DB_DEFAULT = join(_repoRoot, 'data', 'app.db');

/**
 * Composition root. All wiring lives here so feature code stays free of
 * construction concerns. Swapping implementations is a one-line change here —
 * callers depend on ports, not on concrete classes.
 */
export interface Container {
  logger: Logger;
  catalog: SqliteCatalogRepository;
  validator: RealApiCatalogValidator;
  importer: OpenApiCatalogImporter;
  importUseCase: ImportOpenApiUseCase;
  engine: BotJobExecutionEngine;
  router: BankingAgentRouter;
  mockServer: MockServer;
  reporter: HtmlCsvReportExporter;
  taxonomy: ReturnType<typeof bankingTaxonomySeed>;
  botJobRepo: SqliteBotJobRepository;
  executionRepo: SqliteExecutionRepository;
  taxonomyRepo: SqliteTaxonomyRepository;
  settingsRepo: SqliteSettingsRepository;
  ai: AiProviderService;
  config: { sidecarPort: number; mockPort: number; realBaseUrl: string };
}

export function buildContainer(): Container {
  const logger = new ConsoleLogger({ app: 'sidecar' }, 'info');

  const sidecarPort = Number(process.env['SIDECAR_PORT'] ?? 8787);
  const mockPort    = Number(process.env['MOCK_SERVER_PORT'] ?? 8855);
  const realBaseUrl = process.env['REAL_API_BASE_URL'] ?? 'http://localhost:9000';
  const dbPath      = process.env['DB_PATH'] ?? DB_DEFAULT;

  // ── SQLite database (single shared connection, WAL mode) ──────────────────
  const db = openDatabase(dbPath);
  logger.info('SQLite database ready', { path: dbPath });

  // ── Repositories ──────────────────────────────────────────────────────────
  const catalog      = new SqliteCatalogRepository(db);
  const botJobRepo   = new SqliteBotJobRepository(db);
  const executionRepo = new SqliteExecutionRepository(db);
  const taxonomyRepo = new SqliteTaxonomyRepository(db);
  const settingsRepo = new SqliteSettingsRepository(db);

  // Seed banking taxonomy on first run (idempotent — no-op if rows exist)
  const seed = bankingTaxonomySeed();
  void taxonomyRepo.seedIfEmpty(seed.categories, seed.subcategories);

  // ── Application services ──────────────────────────────────────────────────
  const validator     = new RealApiCatalogValidator(catalog);
  const importer      = new OpenApiCatalogImporter(catalog, logger);
  const importUseCase = new ImportOpenApiUseCase(importer, logger);
  const mockServer    = new MockServer({ port: mockPort, logger });

  const engine = new BotJobExecutionEngine({
    http: new FetchHttpExecutor(),
    validator,
    catalog,
    logger,
    resolveBaseUrl: (target) => (target === 'mock' ? `http://127.0.0.1:${mockPort}` : realBaseUrl),
  });

  const ai = new AiProviderService(logger);

  // Load stored AI provider settings and configure the gateway at startup.
  settingsRepo.listAiProviders().then((providers) => {
    for (const p of providers) {
      if (p.enabled) ai.configure(p.provider, p.encryptedApiKey, p.baseUrl, p.model);
    }
    const def = providers.find((p) => p.isDefault && p.enabled);
    if (def) ai.setDefaultProvider(def.provider);
  }).catch(() => {});

  const router   = new BankingAgentRouter(createAllAgents());
  const reporter = new HtmlCsvReportExporter();

  // Populate agent capability maps from the existing catalog at startup.
  catalog.listEndpoints().then((eps) => {
    if (eps.length > 0) router.populateFromCatalog(eps);
  }).catch(() => {});

  return {
    logger,
    catalog,
    validator,
    importer,
    importUseCase,
    engine,
    router,
    mockServer,
    reporter,
    taxonomy: seed,
    botJobRepo,
    executionRepo,
    taxonomyRepo,
    settingsRepo,
    ai,
    config: { sidecarPort, mockPort, realBaseUrl },
  };
}
