import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ConsoleLogger, type Logger } from '@arweb/common';
import { RealApiCatalogValidator } from '@arweb/application';
import {
  AiProviderService,
  CryptoService,
  openDatabase,
  SqliteCatalogRepository,
  SqliteSettingsRepository,
} from '@arweb/infrastructure';
import { resolveMasterKey } from './crypto-key.js';
import { BankingAgentRouter, createAllAgents } from '@arweb/agents';

const _dir =
  typeof __dirname === 'string'
    ? __dirname
    : dirname(fileURLToPath(import.meta.url));
const _repoRoot = join(_dir, '..', '..', '..'); // server-ar/src/bootstrap -> repo root

function resolveDefaultDbPath(): string {
  if (typeof process !== 'undefined' && (process as { pkg?: unknown }).pkg) {
    const appData = process.env['APPDATA'] ?? process.env['LOCALAPPDATA'];
    if (appData) {
      return join(appData, 'ARWebShared', 'arweb.db');
    }
  }
  return join(_repoRoot, 'data', 'app.db');
}

export interface Container {
  logger: Logger;
  catalog: SqliteCatalogRepository;
  validator: RealApiCatalogValidator;
  router: BankingAgentRouter;
  settingsRepo: SqliteSettingsRepository;
  ai: AiProviderService;
  config: { sidecarPort: number };
}

export function buildContainer(): Container {
  const logger = new ConsoleLogger({ app: 'ar-sidecar' }, 'info');

  const sidecarPort = Number(process.env['SIDECAR_PORT'] ?? 8788);
  const dbPath      = process.env['DB_PATH'] ?? resolveDefaultDbPath();

  const db = openDatabase(dbPath);
  logger.info('SQLite database ready', { path: dbPath });

  const masterKey = resolveMasterKey(dirname(dbPath));
  const cryptoSvc = new CryptoService(masterKey);

  const catalog      = new SqliteCatalogRepository(db);
  const settingsRepo = new SqliteSettingsRepository(db, cryptoSvc);
  const validator    = new RealApiCatalogValidator(catalog);

  const ai = new AiProviderService(logger);

  settingsRepo.listAiProviders().then((providers) => {
    logger.info('[container] AI providers loaded from DB', { total: providers.length });
    for (const p of providers) {
      if (p.enabled) ai.configure(p.provider, p.encryptedApiKey, p.baseUrl, p.model);
    }
    const def = providers.find((p) => p.isDefault && p.enabled);
    if (def) ai.setDefaultProvider(def.provider);
    else logger.warn('[container] NO default provider found in DB');
  }).catch((e) => {
    logger.error('[container] FAILED to load AI providers', { error: e instanceof Error ? e.message : String(e) });
  });

  const router = new BankingAgentRouter(createAllAgents());

  catalog.listEndpoints().then((eps) => {
    if (eps.length > 0) router.populateFromCatalog(eps);
  }).catch(() => {});

  return { logger, catalog, validator, router, settingsRepo, ai, config: { sidecarPort } };
}
