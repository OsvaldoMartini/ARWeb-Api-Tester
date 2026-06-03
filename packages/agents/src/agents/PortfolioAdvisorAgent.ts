import { BaseAgent } from '../base-agent.js';

/** Portfolio holdings, allocation, performance. */
export class PortfolioAdvisorAgent extends BaseAgent {
  readonly id = 'portfolio-advisor';
  readonly name = 'Portfolio Advisor';
  readonly description = 'Portfolio holdings, allocation, performance.';
  readonly mode = 'employee' as const;
  readonly keywords = ['portfolio','holdings','allocation','performance','positions'];
  /** Populated at runtime from the CapabilityMap once a catalog is imported. */
  readonly capabilityEndpointIds: string[] = [];
}
