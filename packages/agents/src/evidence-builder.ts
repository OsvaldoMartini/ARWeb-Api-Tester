import type { Evidence } from '@arweb/domain';
import type { CatalogReadPort } from '@arweb/application';

/**
 * EvidenceBuilder (Pilot 3) — turns a list of endpoint ids into human-readable
 * evidence (method + path) attached to every answer for auditability.
 */
export class EvidenceBuilder {
  constructor(private readonly catalog: CatalogReadPort) {}

  async build(endpointIds: string[]): Promise<Evidence[]> {
    const out: Evidence[] = [];
    for (const id of endpointIds) {
      const ep = await this.catalog.getEndpointById(id);
      if (ep) out.push({ endpointId: id, method: ep.method, path: ep.path, note: ep.summary });
    }
    return out;
  }
}
