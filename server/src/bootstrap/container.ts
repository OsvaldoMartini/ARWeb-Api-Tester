import { ConsoleLogger, type Logger } from '@arweb/common';
import { RealApiCatalogValidator, ImportOpenApiUseCase } from '@arweb/application';
import {
  OpenApiCatalogImporter,
  InMemoryCatalogRepository,
  FetchHttpExecutor,
  AiProviderService,
  bankingTaxonomySeed,
  HtmlCsvReportExporter,
} from '@arweb/infrastructure';
import { BotJobExecutionEngine } from '@arweb/api-testing-engine';
import { BankingAgentRouter, createAllAgents } from '@arweb/agents';
import { MockServer } from '@arweb/mock-server';

/**
 * Composition root (Phase 1). All wiring happens here so feature code stays free
 * of construction concerns. Swapping the in-memory repo for SQLite is a one-line
 * change here — callers depend on ports, not implementations.
 */
export interface Container {
  logger: Logger;
  catalog: InMemoryCatalogRepository;
  validator: RealApiCatalogValidator;
  importer: OpenApiCatalogImporter;
  importUseCase: ImportOpenApiUseCase;
  engine: BotJobExecutionEngine;
  router: BankingAgentRouter;
  mockServer: MockServer;
  reporter: HtmlCsvReportExporter;
  taxonomy: ReturnType<typeof bankingTaxonomySeed>;
  config: { sidecarPort: number; mockPort: number; realBaseUrl: string };
}

export function buildContainer(): Container {
  const logger = new ConsoleLogger({ app: 'sidecar' }, 'info');

  const sidecarPort = Number(process.env['SIDECAR_PORT'] ?? 8787);
  const mockPort = Number(process.env['MOCK_SERVER_PORT'] ?? 8855);
  const realBaseUrl = process.env['REAL_API_BASE_URL'] ?? 'http://localhost:9000';

  const catalog = new InMemoryCatalogRepository();
  const validator = new RealApiCatalogValidator(catalog);
  const importer = new OpenApiCatalogImporter(catalog, logger);
  const importUseCase = new ImportOpenApiUseCase(importer, logger);
  const http = new FetchHttpExecutor();
  const mockServer = new MockServer({ port: mockPort, logger });

  const engine = new BotJobExecutionEngine({
    http,
    validator,
    catalog,
    logger,
    resolveBaseUrl: (target) => (target === 'mock' ? `http://127.0.0.1:${mockPort}` : realBaseUrl),
  });

  // AI gateway resolves keys from settings; null => offline rule-based fallback.
  const _ai = new AiProviderService(logger, () => null);
  void _ai; // wired into agents/use-cases as features land

  const router = new BankingAgentRouter(createAllAgents());
  const reporter = new HtmlCsvReportExporter();
  const taxonomy = bankingTaxonomySeed();

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
    taxonomy,
    config: { sidecarPort, mockPort, realBaseUrl },
  };
}
