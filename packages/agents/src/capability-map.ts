import type { CapabilityMapEntry } from '@arweb/domain';

/**
 * CapabilityMap (Pilot 3) — declares which real endpoints each agent owns.
 * Built/refreshed after a catalog import (by keyword auto-mapping or manual edit),
 * then injected into the agents so they can only plan with endpoints they own.
 */
export class CapabilityMap {
  private byAgent = new Map<string, string[]>();

  constructor(entries: CapabilityMapEntry[] = []) {
    for (const e of entries) this.byAgent.set(e.agentId, e.endpointIds);
  }

  set(agentId: string, endpointIds: string[]): void {
    this.byAgent.set(agentId, endpointIds);
  }

  endpointsFor(agentId: string): string[] {
    return this.byAgent.get(agentId) ?? [];
  }

  toEntries(): CapabilityMapEntry[] {
    return [...this.byAgent.entries()].map(([agentId, endpointIds], i) => ({
      id: `cap_${i}`,
      agentId,
      capabilityName: agentId,
      endpointIds,
    }));
  }
}
