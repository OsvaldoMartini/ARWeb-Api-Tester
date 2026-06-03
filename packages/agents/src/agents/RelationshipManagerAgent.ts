import { BaseAgent } from '../base-agent.js';

/** Client relationships, 360 view, onboarding status. */
export class RelationshipManagerAgent extends BaseAgent {
  readonly id = 'relationship-manager';
  readonly name = 'Relationship Manager';
  readonly description = 'Client relationships, 360 view, onboarding status.';
  readonly mode = 'employee' as const;
  readonly keywords = ['client','relationship','onboarding','kyc','profile'];
  /** Populated at runtime from the CapabilityMap once a catalog is imported. */
  readonly capabilityEndpointIds: string[] = [];
}
