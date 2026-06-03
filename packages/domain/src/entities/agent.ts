/** Multi-agent layer (Pilot 3, Phase 7). */

export interface Agent {
  id: string;
  /** business-facing name, e.g. "Portfolio Advisor" */
  name: string;
  description: string;
  mode: 'employee' | 'client' | 'both';
  /** categories / capabilities this agent owns */
  capabilityIds: string[];
}

/** Per-agent endpoint ownership — which real endpoints an agent may plan with. */
export interface CapabilityMapEntry {
  id: string;
  agentId: string;
  capabilityName: string;
  endpointIds: string[]; // must all exist in the catalog
}

/** Real endpoint references attached to an answer so it can be audited. */
export interface Evidence {
  endpointId: string;
  method: string;
  path: string;
  note: string | null;
}
