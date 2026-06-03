import { BaseAgent } from '../base-agent.js';

/** AML, sanctions, risk scoring, limits monitoring. */
export class ComplianceAndRiskAgent extends BaseAgent {
  readonly id = 'compliance-and-risk';
  readonly name = 'Compliance & Risk';
  readonly description = 'AML, sanctions, risk scoring, limits monitoring.';
  readonly mode = 'employee' as const;
  readonly keywords = ['compliance','aml','sanction','risk','limit','suspicious'];
  /** Populated at runtime from the CapabilityMap once a catalog is imported. */
  readonly capabilityEndpointIds: string[] = [];
}
