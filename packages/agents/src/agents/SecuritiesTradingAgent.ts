import { BaseAgent } from '../base-agent.js';

/** Orders, executions, market instruments. */
export class SecuritiesTradingAgent extends BaseAgent {
  readonly id = 'securities-trading';
  readonly name = 'Securities Trading';
  readonly description = 'Orders, executions, market instruments.';
  readonly mode = 'employee' as const;
  readonly keywords = ['order','trade','security','instrument','execution','isin'];
  /** Populated at runtime from the CapabilityMap once a catalog is imported. */
  readonly capabilityEndpointIds: string[] = [];
}
