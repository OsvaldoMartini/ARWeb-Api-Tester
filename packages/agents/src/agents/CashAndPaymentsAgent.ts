import { BaseAgent } from '../base-agent.js';

/** Accounts, balances, transfers and payments. */
export class CashAndPaymentsAgent extends BaseAgent {
  readonly id = 'cash-and-payments';
  readonly name = 'Cash & Payments';
  readonly description = 'Accounts, balances, transfers and payments.';
  readonly mode = 'employee' as const;
  readonly keywords = ['payment','transfer','balance','account','cash','sepa','iban'];
  /** Populated at runtime from the CapabilityMap once a catalog is imported. */
  readonly capabilityEndpointIds: string[] = [];
}
