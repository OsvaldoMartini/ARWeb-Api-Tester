/**
 * Thin typed client for the Node sidecar.
 *
 * In dev, Vite proxies `/api/*` -> `http://127.0.0.1:8787/*` (see vite.config.ts),
 * so the renderer never talks to the network directly and there are no CORS
 * surprises. Keeping every call behind this module means swapping the transport
 * later touches exactly one file. Response shapes here MUST mirror
 * server/src/server.ts.
 */

const BASE = '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    let detail = '';
    try {
      detail = JSON.stringify(await res.json());
    } catch {
      detail = await res.text().catch(() => '');
    }
    throw new Error(`${init?.method ?? 'GET'} ${path} failed: ${res.status} ${detail}`);
  }
  // Empty-body guard avoids "Unexpected end of JSON input" on 204s.
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export interface HealthResponse {
  ok: boolean;
  ts: number;
}

/** Mirrors the projection in `GET /catalog/endpoints`. */
export interface CatalogEndpoint {
  id: string;
  method: string;
  path: string;
  summary?: string;
  tags?: string[];
  categoryId?: string | null;
  mappingStatus: 'mapped' | 'unmapped';
}

export interface ImportResult {
  specsImported: number;
  endpointsImported: number;
  failures: { file: string; error: string }[];
}

export interface TaxonomyCategory {
  id: string;
  name: string;
  description?: string | null;
  keywords?: string[];
  order?: number;
}

export interface TaxonomySubcategory {
  id: string;
  categoryId: string;
  name: string;
}

export interface TaxonomyResponse {
  categories: TaxonomyCategory[];
  subcategories: TaxonomySubcategory[];
}

/** Mirrors `BankingAgentRouter.list()`. */
export interface AgentInfo {
  id: string;
  name: string;
  description: string;
  mode: string;
}

/** Mirrors `AgentResult`. */
export interface AgentAnswer {
  agentId: string;
  agentName: string;
  answer: string;
  evidence: { endpointId: string; method: string; path: string }[];
  limitations: string[];
}

export interface MockStatus {
  running: boolean;
  port?: number;
}

export interface MockLogEntry {
  method: string;
  path: string;
  matchedEndpointId?: string;
  status: number;
  ts: number;
}

/** Error responses from the sidecar look like `{ error: string }`. */
function assertNoError<T>(data: T | { error: string }): T {
  if (data && typeof data === 'object' && 'error' in data) {
    throw new Error((data as { error: string }).error);
  }
  return data as T;
}

export const sidecar = {
  health: () => request<HealthResponse>('/health'),

  // The route returns a bare array (not wrapped in an object).
  getEndpoints: () => request<CatalogEndpoint[]>('/catalog/endpoints'),

  import: (folderPath: string) =>
    request<ImportResult | { error: string }>('/import', {
      method: 'POST',
      body: JSON.stringify({ folderPath }),
    }).then(assertNoError),

  getTaxonomy: () => request<TaxonomyResponse>('/taxonomy'),

  getAgents: () => request<AgentInfo[]>('/agents'),

  ask: (question: string, mode: 'employee' | 'client', agentId?: string) =>
    request<AgentAnswer | { error: string }>('/agents/ask', {
      method: 'POST',
      body: JSON.stringify({ question, mode, agentId }),
    }).then(assertNoError),

  mockStatus: () => request<MockStatus>('/mock/status'),
  mockStart: () => request<MockStatus>('/mock/start', { method: 'POST' }),
  mockStop: () => request<MockStatus>('/mock/stop', { method: 'POST' }),
  // The route returns a bare array of log entries.
  mockLog: () => request<MockLogEntry[]>('/mock/log'),
};
