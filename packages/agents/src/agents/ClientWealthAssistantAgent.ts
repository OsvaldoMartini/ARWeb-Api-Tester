import { BaseAgent } from '../base-agent.js';

/** Client-facing portfolio and wealth overview. */
export class ClientWealthAssistantAgent extends BaseAgent {
  readonly id = 'client-wealth';
  readonly name = 'Wealth Assistant';
  readonly description = 'Client-facing portfolio and wealth overview.';
  readonly mode = 'client' as const;
  readonly keywords = ['my portfolio','my investments','my wealth','returns'];
  /** Populated at runtime from the CapabilityMap once a catalog is imported. */
  readonly capabilityEndpointIds: string[] = [];
}
