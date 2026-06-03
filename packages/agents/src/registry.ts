import type { BaseAgent } from './base-agent.js';
import { RelationshipManagerAgent } from './agents/RelationshipManagerAgent.js';
import { PortfolioAdvisorAgent } from './agents/PortfolioAdvisorAgent.js';
import { CashAndPaymentsAgent } from './agents/CashAndPaymentsAgent.js';
import { SecuritiesTradingAgent } from './agents/SecuritiesTradingAgent.js';
import { CreditAndLendingAgent } from './agents/CreditAndLendingAgent.js';
import { ComplianceAndRiskAgent } from './agents/ComplianceAndRiskAgent.js';
import { BackOfficeOperationsAgent } from './agents/BackOfficeOperationsAgent.js';
import { ReportingAndCOOAgent } from './agents/ReportingAndCOOAgent.js';
import { AuditAndUATAgent } from './agents/AuditAndUATAgent.js';
import { ClientWealthAssistantAgent } from './agents/ClientWealthAssistantAgent.js';
import { ClientCashAssistantAgent } from './agents/ClientCashAssistantAgent.js';
import { ClientTradingAssistantAgent } from './agents/ClientTradingAssistantAgent.js';
import { ClientCreditAssistantAgent } from './agents/ClientCreditAssistantAgent.js';
import { ClientMessagesAndDocumentsAgent } from './agents/ClientMessagesAndDocumentsAgent.js';

/** All 14 banking agents (Pilot 3). Add a new domain = add a file + one line here. */
export function createAllAgents(): BaseAgent[] {
  return [
    new RelationshipManagerAgent(),
    new PortfolioAdvisorAgent(),
    new CashAndPaymentsAgent(),
    new SecuritiesTradingAgent(),
    new CreditAndLendingAgent(),
    new ComplianceAndRiskAgent(),
    new BackOfficeOperationsAgent(),
    new ReportingAndCOOAgent(),
    new AuditAndUATAgent(),
    new ClientWealthAssistantAgent(),
    new ClientCashAssistantAgent(),
    new ClientTradingAssistantAgent(),
    new ClientCreditAssistantAgent(),
    new ClientMessagesAndDocumentsAgent(),
  ];
}
