import type { ApiSpec, ApiEndpoint, ApiParameter, ApiOutputField } from '@arweb/domain';
import type { CatalogReadPort, CatalogWritePort } from '@arweb/application';

/**
 * In-memory catalog repository. Lets the app run out-of-the-box with zero native
 * deps. Phase 3 replaces this with a SQLite-backed repository (better-sqlite3 +
 * Drizzle) behind the SAME ports — no caller changes required.
 */
export class InMemoryCatalogRepository implements CatalogReadPort, CatalogWritePort {
  private specs = new Map<string, ApiSpec>();
  private endpoints = new Map<string, ApiEndpoint>();
  private params = new Map<string, ApiParameter[]>(); // by endpointId
  private outputs = new Map<string, ApiOutputField[]>(); // by endpointId

  // --- read ---
  async getEndpointById(id: string): Promise<ApiEndpoint | null> {
    return this.endpoints.get(id) ?? null;
  }
  async findEndpointByMethodAndPath(method: string, path: string): Promise<ApiEndpoint | null> {
    for (const ep of this.endpoints.values()) {
      if (ep.method === method.toUpperCase() && ep.path === path) return ep;
    }
    return null;
  }
  async getParameters(endpointId: string): Promise<ApiParameter[]> {
    return this.params.get(endpointId) ?? [];
  }
  async getOutputFields(endpointId: string): Promise<ApiOutputField[]> {
    return this.outputs.get(endpointId) ?? [];
  }
  async listEndpoints(): Promise<ApiEndpoint[]> {
    return [...this.endpoints.values()];
  }
  async listSpecs(): Promise<ApiSpec[]> {
    return [...this.specs.values()];
  }

  // --- write ---
  async saveSpec(spec: ApiSpec): Promise<void> {
    this.specs.set(spec.id, spec);
  }
  async saveEndpoints(endpoints: ApiEndpoint[]): Promise<void> {
    for (const ep of endpoints) this.endpoints.set(ep.id, ep);
  }
  async saveParameters(params: ApiParameter[]): Promise<void> {
    for (const p of params) {
      const list = this.params.get(p.endpointId) ?? [];
      list.push(p);
      this.params.set(p.endpointId, list);
    }
  }
  async saveOutputFields(fields: ApiOutputField[]): Promise<void> {
    for (const f of fields) {
      const list = this.outputs.get(f.endpointId) ?? [];
      list.push(f);
      this.outputs.set(f.endpointId, list);
    }
  }
  async clearAll(): Promise<void> {
    this.specs.clear();
    this.endpoints.clear();
    this.params.clear();
    this.outputs.clear();
  }
}
