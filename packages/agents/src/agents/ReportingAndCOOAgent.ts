import { BaseAgent } from '../base-agent.js';

/** Operational dashboards, KPIs, coverage reports. */
export class ReportingAndCOOAgent extends BaseAgent {
  readonly id = 'reporting-and-coo';
  readonly name = 'Reporting & COO';
  readonly description = 'Operational dashboards, KPIs, coverage reports.';
  readonly mode = 'employee' as const;
  readonly keywords = ['report','kpi','dashboard','coverage','metric'];
  /** Populated at runtime from the CapabilityMap once a catalog is imported. */
  readonly capabilityEndpointIds: string[] = [];
}
