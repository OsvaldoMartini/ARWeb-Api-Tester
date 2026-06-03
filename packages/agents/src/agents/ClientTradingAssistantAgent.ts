import { BaseAgent } from '../base-agent.js';

/** Client-facing order placement and status. */
export class ClientTradingAssistantAgent extends BaseAgent {
  readonly id = 'client-trading';
  readonly name = 'Trading Assistant';
  readonly description = 'Client-facing order placement and status.';
  readonly mode = 'client' as const;
  readonly keywords = ['buy','sell','my orders','place order','market'];
  /** Populated at runtime from the CapabilityMap once a catalog is imported. */
  readonly capabilityEndpointIds: string[] = [];
}
