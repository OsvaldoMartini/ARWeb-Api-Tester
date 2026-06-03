import type { BusinessCategory, BusinessSubcategory } from '@arweb/domain';

/**
 * Banking taxonomy seed (Phase 6) — 25 categories x 5 subcategories.
 * Keywords drive automatic endpoint → category mapping after an OpenAPI import.
 * Names are business-friendly so non-technical users navigate by domain, not URL.
 */
const CATEGORIES: { name: string; keywords: string[]; subs: string[] }[] = [
  { name: 'Customer & Onboarding', keywords: ['customer', 'client', 'onboarding', 'kyc', 'profile'], subs: ['New Customer', 'KYC / Identity', 'Customer 360', 'Consents', 'Offboarding'] },
  { name: 'Accounts', keywords: ['account', 'iban', 'ledger'], subs: ['Current Accounts', 'Savings', 'Account Details', 'Statements', 'Account Closure'] },
  { name: 'Balances', keywords: ['balance', 'available', 'booked'], subs: ['Available Balance', 'Booked Balance', 'Holds', 'Overdraft', 'Currency Balance'] },
  { name: 'Payments & Transfers', keywords: ['payment', 'transfer', 'sepa', 'swift', 'remittance'], subs: ['Single Payment', 'Bulk Payment', 'Standing Orders', 'Direct Debit', 'Cross-Border'] },
  { name: 'Cards', keywords: ['card', 'debit', 'credit card', 'pan'], subs: ['Card Issuance', 'Card Controls', 'Transactions', 'Disputes', 'Replacement'] },
  { name: 'Securities & Trading', keywords: ['order', 'trade', 'security', 'isin', 'execution'], subs: ['Order Entry', 'Order Status', 'Executions', 'Instruments', 'Market Data'] },
  { name: 'Portfolio & Holdings', keywords: ['portfolio', 'holdings', 'positions', 'allocation'], subs: ['Positions', 'Allocation', 'Performance', 'Valuation', 'Rebalancing'] },
  { name: 'Investment Advisory', keywords: ['advice', 'recommendation', 'suitability', 'mifid'], subs: ['Suitability', 'Recommendations', 'Model Portfolios', 'Risk Profile', 'Proposals'] },
  { name: 'Credit & Lending', keywords: ['loan', 'credit', 'lending', 'mortgage', 'collateral'], subs: ['Applications', 'Limits', 'Repayments', 'Collateral', 'Restructuring'] },
  { name: 'Deposits & Treasury', keywords: ['deposit', 'treasury', 'term', 'money market'], subs: ['Term Deposits', 'Notice Accounts', 'Treasury Positions', 'Liquidity', 'Rates'] },
  { name: 'Foreign Exchange', keywords: ['fx', 'forex', 'exchange', 'currency'], subs: ['Spot', 'Forward', 'Rates', 'Conversions', 'Hedging'] },
  { name: 'Compliance & AML', keywords: ['compliance', 'aml', 'sanction', 'suspicious', 'screening'], subs: ['Screening', 'Alerts', 'Case Management', 'Reporting', 'Watchlists'] },
  { name: 'Risk Management', keywords: ['risk', 'exposure', 'var', 'limit'], subs: ['Credit Risk', 'Market Risk', 'Limits', 'Exposure', 'Stress Tests'] },
  { name: 'Fraud & Disputes', keywords: ['fraud', 'dispute', 'chargeback'], subs: ['Fraud Alerts', 'Investigations', 'Chargebacks', 'Recovery', 'Reporting'] },
  { name: 'Statements & Documents', keywords: ['statement', 'document', 'pdf', 'letter'], subs: ['Statements', 'Tax Documents', 'Contracts', 'Notices', 'Archive'] },
  { name: 'Notifications & Messaging', keywords: ['message', 'notification', 'alert', 'inbox'], subs: ['Secure Messages', 'Push Alerts', 'Email', 'SMS', 'Preferences'] },
  { name: 'Authentication & Access', keywords: ['auth', 'login', 'token', 'mfa', 'consent'], subs: ['Sessions', 'MFA', 'Consents', 'Scopes', 'Devices'] },
  { name: 'Beneficiaries & Payees', keywords: ['beneficiary', 'payee', 'recipient'], subs: ['Add Payee', 'Verify Payee', 'Payee List', 'Trusted Payees', 'Removal'] },
  { name: 'Standing Orders & Schedules', keywords: ['standing order', 'schedule', 'recurring'], subs: ['Create', 'Amend', 'Cancel', 'Calendar', 'History'] },
  { name: 'Reporting & Analytics', keywords: ['report', 'analytics', 'kpi', 'dashboard'], subs: ['Operational', 'Regulatory', 'Custom', 'Exports', 'Coverage'] },
  { name: 'Back Office & Settlement', keywords: ['settlement', 'reconciliation', 'clearing', 'corporate action'], subs: ['Settlement', 'Reconciliation', 'Corporate Actions', 'Fees', 'Adjustments'] },
  { name: 'Wealth & Private Banking', keywords: ['wealth', 'private', 'mandate', 'discretionary'], subs: ['Mandates', 'Discretionary', 'Reporting', 'Fees', 'Relationship'] },
  { name: 'Insurance & Bancassurance', keywords: ['insurance', 'policy', 'premium', 'claim'], subs: ['Policies', 'Quotes', 'Premiums', 'Claims', 'Renewals'] },
  { name: 'Fees & Pricing', keywords: ['fee', 'price', 'tariff', 'charge'], subs: ['Tariffs', 'Charges', 'Refunds', 'Bundles', 'Quotes'] },
  { name: 'Audit & Operations', keywords: ['audit', 'log', 'trace', 'operation', 'uat'], subs: ['Audit Trail', 'Event Log', 'UAT', 'Health', 'Maintenance'] },
];

let cId = 0;
let sId = 0;

export function bankingTaxonomySeed(): { categories: BusinessCategory[]; subcategories: BusinessSubcategory[] } {
  const categories: BusinessCategory[] = [];
  const subcategories: BusinessSubcategory[] = [];
  CATEGORIES.forEach((c, i) => {
    const categoryId = `cat_${String(cId++).padStart(2, '0')}`;
    categories.push({ id: categoryId, name: c.name, description: null, keywords: c.keywords, order: i });
    c.subs.forEach((s, j) => {
      subcategories.push({
        id: `sub_${String(sId++).padStart(3, '0')}`,
        categoryId,
        name: s,
        keywords: [],
        order: j,
      });
    });
  });
  return { categories, subcategories };
}
