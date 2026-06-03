import type {
  ApiSpec,
  ApiEndpoint,
  ApiParameter,
  ApiOutputField,
  BotJob,
  BotJobBlock,
  BotJobCommand,
  BotVariable,
  ExecutionRun,
  ExecutionStepResult,
  BusinessCategory,
  BusinessSubcategory,
  AiProviderSetting,
  ConfigurationSetting,
} from '@arweb/domain';

/**
 * Ports (interfaces) the application layer depends on. Infrastructure provides
 * the concrete implementations (SQLite, HTTP, AI SDKs). This is the dependency
 * inversion boundary — application never imports infrastructure directly.
 */

/** Read-only catalog access used by the validator and agents (hot path). */
export interface CatalogReadPort {
  getEndpointById(id: string): Promise<ApiEndpoint | null>;
  findEndpointByMethodAndPath(method: string, path: string): Promise<ApiEndpoint | null>;
  getParameters(endpointId: string): Promise<ApiParameter[]>;
  getOutputFields(endpointId: string): Promise<ApiOutputField[]>;
  listEndpoints(): Promise<ApiEndpoint[]>;
}

export interface CatalogWritePort {
  saveSpec(spec: ApiSpec): Promise<void>;
  saveEndpoints(endpoints: ApiEndpoint[]): Promise<void>;
  saveParameters(params: ApiParameter[]): Promise<void>;
  saveOutputFields(fields: ApiOutputField[]): Promise<void>;
  clearAll(): Promise<void>;
}

export interface BotJobRepository {
  list(): Promise<BotJob[]>;
  getById(id: string): Promise<BotJob | null>;
  getBlocks(botJobId: string): Promise<BotJobBlock[]>;
  getCommands(blockId: string): Promise<BotJobCommand[]>;
  getVariables(botJobId: string): Promise<BotVariable[]>;
  save(job: BotJob, blocks: BotJobBlock[], commands: BotJobCommand[], vars: BotVariable[]): Promise<void>;
  remove(id: string): Promise<void>;
}

export interface ExecutionRepository {
  createRun(run: ExecutionRun): Promise<void>;
  updateRun(run: ExecutionRun): Promise<void>;
  addStepResult(result: ExecutionStepResult): Promise<void>;
  listRuns(botJobId?: string): Promise<ExecutionRun[]>;
  getStepResults(runId: string): Promise<ExecutionStepResult[]>;
}

export interface TaxonomyRepository {
  listCategories(): Promise<BusinessCategory[]>;
  listSubcategories(categoryId?: string): Promise<BusinessSubcategory[]>;
  seedIfEmpty(categories: BusinessCategory[], subs: BusinessSubcategory[]): Promise<void>;
  setEndpointCategory(endpointId: string, categoryId: string | null): Promise<void>;
}

export interface SettingsRepository {
  getAll(): Promise<ConfigurationSetting[]>;
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  listAiProviders(): Promise<AiProviderSetting[]>;
  upsertAiProvider(setting: AiProviderSetting): Promise<void>;
}

/** Executes a real HTTP request. Implemented in infrastructure (undici/axios). */
export interface HttpExecutorPort {
  send(req: HttpRequest): Promise<HttpResponse>;
}

export interface HttpRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
  timeoutMs?: number;
}

export interface HttpResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
  durationMs: number;
}
