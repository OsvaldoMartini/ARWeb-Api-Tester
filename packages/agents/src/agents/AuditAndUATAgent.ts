import { BaseAgent } from '../base-agent.js';

/** Audit trail, test evidence, UAT sign-off. */
export class AuditAndUATAgent extends BaseAgent {
  readonly id = 'audit-and-uat';
  readonly name = 'Audit & UAT';
  readonly description = 'Audit trail, test evidence, UAT sign-off.';
  readonly mode = 'employee' as const;
  readonly keywords = ['audit','uat','evidence','trace','signoff'];
  /** Populated at runtime from the CapabilityMap once a catalog is imported. */
  readonly capabilityEndpointIds: string[] = [];
}
