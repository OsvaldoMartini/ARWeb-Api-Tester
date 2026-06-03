import { BaseAgent } from '../base-agent.js';

/** Client-facing loans and credit cards. */
export class ClientCreditAssistantAgent extends BaseAgent {
  readonly id = 'client-credit';
  readonly name = 'Credit Assistant';
  readonly description = 'Client-facing loans and credit cards.';
  readonly mode = 'client' as const;
  readonly keywords = ['my loan','my card','my credit','installment'];
  /** Populated at runtime from the CapabilityMap once a catalog is imported. */
  readonly capabilityEndpointIds: string[] = [];
}
