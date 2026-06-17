/**
 * Thin typed client for the AR Conversational sidecar (port 8788).
 *
 * URL routing:
 *  - Dev: Vite proxies `/api/*` → `http://127.0.0.1:8788/*`
 *  - Tauri production: goes direct to the sidecar on localhost:8788.
 */

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
const BASE = isTauri ? 'http://127.0.0.1:8788' : '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    let detail = '';
    try { detail = JSON.stringify(await res.json()); } catch { detail = await res.text().catch(() => ''); }
    throw new Error(`${init?.method ?? 'GET'} ${path} failed: ${res.status} ${detail}`);
  }
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export interface HealthResponse { ok: boolean; ts: number; }

export interface CatalogEndpoint {
  id: string; method: string; path: string;
  summary?: string; tags?: string[];
  categoryId?: string | null;
  mappingStatus: 'mapped' | 'unmapped';
}

export interface AgentInfo {
  id: string; name: string; description: string;
  mode: string; capabilityCount: number;
}

export interface AgentCapability {
  agentId: string; agentName: string; endpointCount: number;
}

export interface AgentAnswer {
  agentId: string; agentName: string; answer: string;
  evidence: { endpointId: string; method: string; path: string }[];
  limitations: string[];
}

export interface AiProviderSetting {
  id: string; provider: string; label: string;
  baseUrl?: string | null; model?: string | null;
  encryptedApiKey?: string | null; hasApiKey?: boolean;
  isDefault: boolean; enabled: boolean;
}

function assertNoError<T>(data: T | { error: string }): T {
  if (data && typeof data === 'object' && 'error' in data) {
    throw new Error((data as { error: string }).error);
  }
  return data as T;
}

export const sidecar = {
  health: () => request<HealthResponse>('/health'),

  getEndpoints: () => request<CatalogEndpoint[]>('/catalog/endpoints'),

  getAgents: () => request<AgentInfo[]>('/agents'),

  getCapabilities: () => request<AgentCapability[]>('/agents/capabilities'),

  ask: (question: string, mode: 'employee' | 'client', agentId?: string) =>
    request<AgentAnswer | { error: string }>('/agents/ask', {
      method: 'POST',
      body: JSON.stringify({ question, mode, agentId }),
    }).then(assertNoError),

  getAiProviders: () => request<{ providers: AiProviderSetting[] }>('/settings/ai-providers'),

  saveAiProvider: (setting: AiProviderSetting) =>
    request<{ ok: boolean }>('/settings/ai-providers', {
      method: 'POST',
      body: JSON.stringify(setting),
    }),

  setDefaultAiProvider: (id: string) =>
    request<{ ok: boolean }>('/settings/ai-providers/set-default', {
      method: 'POST',
      body: JSON.stringify({ id }),
    }),

  testAiProvider: (provider: string) =>
    request<{ ok: boolean; ms: number; text?: string; error?: string }>('/settings/ai-providers/test', {
      method: 'POST',
      body: JSON.stringify({ provider }),
    }),
};

export function downloadUrl(path: string): string {
  return `${BASE}${path}`;
}
