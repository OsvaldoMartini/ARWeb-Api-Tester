import { BaseAgent } from '../base-agent.js';

/** Settlement, reconciliation, corporate actions. */
export class BackOfficeOperationsAgent extends BaseAgent {
  readonly id = 'back-office-operations';
  readonly name = 'Back Office Operations';
  readonly description = 'Settlement, reconciliation, corporate actions.';
  readonly mode = 'employee' as const;
  readonly keywords = ['settlement','reconciliation','corporate action','operation'];
  /** Populated at runtime from the CapabilityMap once a catalog is imported. */
  readonly capabilityEndpointIds: string[] = [];
}
