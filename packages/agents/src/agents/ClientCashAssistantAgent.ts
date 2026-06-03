import { BaseAgent } from '../base-agent.js';

/** Client-facing balances and payments. */
export class ClientCashAssistantAgent extends BaseAgent {
  readonly id = 'client-cash';
  readonly name = 'Cash Assistant';
  readonly description = 'Client-facing balances and payments.';
  readonly mode = 'client' as const;
  readonly keywords = ['my balance','my account','send money','my payments'];
  /** Populated at runtime from the CapabilityMap once a catalog is imported. */
  readonly capabilityEndpointIds: string[] = [];
}
