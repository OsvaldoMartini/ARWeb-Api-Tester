import { BaseAgent } from '../base-agent.js';

/** Loans, credit lines, mortgages, limits. */
export class CreditAndLendingAgent extends BaseAgent {
  readonly id = 'credit-and-lending';
  readonly name = 'Credit & Lending';
  readonly description = 'Loans, credit lines, mortgages, limits.';
  readonly mode = 'employee' as const;
  readonly keywords = ['loan','credit','mortgage','limit','lending','collateral'];
  /** Populated at runtime from the CapabilityMap once a catalog is imported. */
  readonly capabilityEndpointIds: string[] = [];
}
