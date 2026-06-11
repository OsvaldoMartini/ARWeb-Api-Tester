// Generator: AR Conversational Manual (.docx)
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, WidthType, BorderStyle, ShadingType,
  PageBreak, TableOfContents, LevelFormat, convertInchesToTwip,
  PageNumber, NumberFormat, Footer, Header, ImageRun,
} from '/tmp/node_modules/docx/dist/index.mjs';
import fs from 'fs';

// ── Brand palette ─────────────────────────────────────────────────────────────
const C = {
  navy:       '1B2A6B',  // deep navy — primary brand
  gold:       'C9A84C',  // gold accent
  teal:       '0D7A7A',  // teal secondary
  lightBlue:  'E8F0FB',  // section background
  lightGold:  'FDF6E3',  // callout background
  lightTeal:  'E6F5F5',  // table row alt
  white:      'FFFFFF',
  darkText:   '1A1A2E',
  medText:    '3D3D5C',
  lightBorder:'D5DCE8',
  red:        'C0392B',
  green:      '27AE60',
};

// ── Helper builders ───────────────────────────────────────────────────────────

const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const allNoBorder = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

function run(text, opts = {}) {
  return new TextRun({
    text,
    font:  opts.font  ?? 'Calibri',
    size:  opts.size  ?? 22,
    color: opts.color ?? C.darkText,
    bold:  opts.bold  ?? false,
    italics: opts.italic ?? false,
    break: opts.break ?? 0,
  });
}

function heading1(text) {
  return new Paragraph({
    children: [new TextRun({ text, font: 'Calibri', size: 52, bold: true, color: C.navy })],
    spacing: { before: 480, after: 160 },
    shading: { type: ShadingType.SOLID, color: C.lightBlue },
    indent: { left: 200 },
  });
}

function heading2(text) {
  return new Paragraph({
    children: [new TextRun({ text, font: 'Calibri', size: 34, bold: true, color: C.navy })],
    spacing: { before: 360, after: 120 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: C.gold } },
  });
}

function heading3(text) {
  return new Paragraph({
    children: [new TextRun({ text, font: 'Calibri', size: 26, bold: true, color: C.teal })],
    spacing: { before: 240, after: 80 },
  });
}

function heading4(text) {
  return new Paragraph({
    children: [new TextRun({ text, font: 'Calibri', size: 22, bold: true, color: C.medText })],
    spacing: { before: 160, after: 60 },
  });
}

function body(text, opts = {}) {
  return new Paragraph({
    children: [new TextRun({ text, font: 'Calibri', size: 22, color: C.darkText, bold: opts.bold, italics: opts.italic })],
    spacing: { after: 100 },
    indent: opts.indent ? { left: 360 } : {},
  });
}

function bullet(text, level = 0) {
  return new Paragraph({
    children: [
      new TextRun({ text: level === 0 ? '▶  ' : '◆  ', font: 'Calibri', size: 20, color: C.gold, bold: true }),
      new TextRun({ text, font: 'Calibri', size: 20, color: C.darkText }),
    ],
    spacing: { after: 80 },
    indent: { left: 360 + level * 360 },
  });
}

function callout(text, color = C.lightGold, border = C.gold) {
  return new Paragraph({
    children: [new TextRun({ text: '  ℹ  ' + text, font: 'Calibri', size: 20, color: C.darkText, italics: true })],
    spacing: { before: 120, after: 120 },
    shading: { type: ShadingType.SOLID, color },
    border: { left: { style: BorderStyle.SINGLE, size: 18, color: border } },
    indent: { left: 200, right: 200 },
  });
}

function spacer(n = 1) {
  return Array.from({ length: n }, () => new Paragraph({ children: [new TextRun('')], spacing: { after: 80 } }));
}

function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

function divider() {
  return new Paragraph({
    children: [],
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: C.gold } },
    spacing: { before: 200, after: 200 },
  });
}

// ── Table builders ────────────────────────────────────────────────────────────

function headerCell(text, width, shade = C.navy) {
  return new TableCell({
    children: [new Paragraph({
      children: [new TextRun({ text, font: 'Calibri', size: 20, bold: true, color: C.white })],
      alignment: AlignmentType.LEFT,
    })],
    shading: { type: ShadingType.SOLID, color: shade },
    width: { size: width, type: WidthType.PERCENTAGE },
    margins: { top: 80, bottom: 80, left: 120, right: 80 },
    borders: { bottom: { style: BorderStyle.SINGLE, size: 4, color: C.gold }, top: noBorder, left: noBorder, right: noBorder },
  });
}

function dataCell(text, width, shade = C.white, bold = false, color = C.darkText) {
  return new TableCell({
    children: [new Paragraph({
      children: [new TextRun({ text, font: 'Calibri', size: 20, color, bold })],
      alignment: AlignmentType.LEFT,
    })],
    shading: { type: ShadingType.SOLID, color: shade },
    width: { size: width, type: WidthType.PERCENTAGE },
    margins: { top: 60, bottom: 60, left: 120, right: 80 },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 2, color: C.lightBorder },
      bottom: { style: BorderStyle.SINGLE, size: 2, color: C.lightBorder },
      left: noBorder, right: noBorder,
    },
  });
}

function twoColTable(rows, header1, header2, w1 = 35, w2 = 65) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [headerCell(header1, w1), headerCell(header2, w2)],
        tableHeader: true,
      }),
      ...rows.map(([c1, c2], i) => new TableRow({
        children: [
          dataCell(c1, w1, i % 2 === 0 ? C.white : C.lightTeal, true),
          dataCell(c2, w2, i % 2 === 0 ? C.white : C.lightTeal),
        ],
      })),
    ],
  });
}

function threeColTable(rows, h1, h2, h3, w1 = 25, w2 = 35, w3 = 40) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [headerCell(h1, w1), headerCell(h2, w2), headerCell(h3, w3)],
        tableHeader: true,
      }),
      ...rows.map(([c1, c2, c3], i) => new TableRow({
        children: [
          dataCell(c1, w1, i % 2 === 0 ? C.white : C.lightTeal, true),
          dataCell(c2, w2, i % 2 === 0 ? C.white : C.lightTeal),
          dataCell(c3, w3, i % 2 === 0 ? C.white : C.lightTeal),
        ],
      })),
    ],
  });
}

// ── Cover page ────────────────────────────────────────────────────────────────

function coverPage() {
  return [
    new Paragraph({
      children: [new TextRun({ text: ' ', size: 48 })],
      spacing: { before: 800, after: 0 },
    }),
    // Big brand block
    new Paragraph({
      children: [new TextRun({ text: 'AR', font: 'Calibri', size: 144, bold: true, color: C.white })],
      alignment: AlignmentType.CENTER,
      shading: { type: ShadingType.SOLID, color: C.navy },
      spacing: { before: 0, after: 0 },
      indent: { left: 0, right: 0 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'CONVERSATIONAL', font: 'Calibri', size: 52, bold: true, color: C.white })],
      alignment: AlignmentType.CENTER,
      shading: { type: ShadingType.SOLID, color: C.navy },
      spacing: { before: 0, after: 0 },
    }),
    new Paragraph({
      children: [new TextRun({ text: '─────────────────────────────────────', font: 'Calibri', size: 28, color: C.gold })],
      alignment: AlignmentType.CENTER,
      shading: { type: ShadingType.SOLID, color: C.navy },
      spacing: { before: 60, after: 60 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'AI Banking Assistant', font: 'Calibri', size: 36, bold: false, color: C.gold })],
      alignment: AlignmentType.CENTER,
      shading: { type: ShadingType.SOLID, color: C.navy },
      spacing: { before: 0, after: 0 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Complete Feature Guide & User Manual', font: 'Calibri', size: 24, color: 'AABBDD', italics: true })],
      alignment: AlignmentType.CENTER,
      shading: { type: ShadingType.SOLID, color: C.navy },
      spacing: { before: 40, after: 120 },
    }),
    // Info strip
    new Paragraph({
      children: [
        new TextRun({ text: '  Version: Pilot 3   |   ', font: 'Calibri', size: 20, color: C.darkText }),
        new TextRun({ text: 'Audience: Bank Staff, IT Administrators   |   ', font: 'Calibri', size: 20, color: C.darkText }),
        new TextRun({ text: '2025  ', font: 'Calibri', size: 20, color: C.darkText }),
      ],
      alignment: AlignmentType.CENTER,
      shading: { type: ShadingType.SOLID, color: C.lightGold },
      spacing: { before: 120, after: 0 },
    }),
    pageBreak(),
  ];
}

// ── Section label ─────────────────────────────────────────────────────────────

function sectionLabel(num, title) {
  return new Paragraph({
    children: [
      new TextRun({ text: ` ${num} `, font: 'Calibri', size: 28, bold: true, color: C.white }),
      new TextRun({ text: `  ${title}`, font: 'Calibri', size: 28, bold: true, color: C.navy }),
    ],
    shading: { type: ShadingType.SOLID, color: C.navy },
    spacing: { before: 400, after: 200 },
    indent: { left: 0 },
    children: [
      new TextRun({ text: ` §${num} `, font: 'Calibri', size: 26, bold: true, color: C.white,
        highlight: undefined }),
    ],
  });
}

// Nicer section banner
function sectionBanner(num, title) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: `${num}`, font: 'Calibri', size: 52, bold: true, color: C.white })], alignment: AlignmentType.CENTER })],
          shading: { type: ShadingType.SOLID, color: C.gold },
          width: { size: 8, type: WidthType.PERCENTAGE },
          margins: { top: 80, bottom: 80, left: 80, right: 80 },
          borders: allNoBorder,
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: title, font: 'Calibri', size: 34, bold: true, color: C.white })], alignment: AlignmentType.LEFT })],
          shading: { type: ShadingType.SOLID, color: C.navy },
          width: { size: 92, type: WidthType.PERCENTAGE },
          margins: { top: 80, bottom: 80, left: 200, right: 80 },
          borders: allNoBorder,
        }),
      ],
    })],
    spacing: { before: 360, after: 200 },
  });
}

// Agent card
function agentCard(emoji, name, domain, items) {
  const itemRows = items.map(item => new TableRow({
    children: [new TableCell({
      children: [new Paragraph({
        children: [
          new TextRun({ text: '   ◆  ', font: 'Calibri', size: 19, color: C.gold }),
          new TextRun({ text: item, font: 'Calibri', size: 19, color: C.darkText }),
        ],
        spacing: { after: 40 },
      })],
      borders: allNoBorder,
      shading: { type: ShadingType.SOLID, color: C.white },
    })],
  }));

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      // header row
      new TableRow({
        children: [new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: emoji + '  ', font: 'Calibri', size: 26, bold: true, color: C.white }),
                new TextRun({ text: name, font: 'Calibri', size: 26, bold: true, color: C.white }),
              ],
              spacing: { after: 40 },
            }),
            new Paragraph({
              children: [new TextRun({ text: '  ' + domain, font: 'Calibri', size: 20, color: C.gold, italics: true })],
              spacing: { after: 0 },
            }),
          ],
          shading: { type: ShadingType.SOLID, color: C.navy },
          borders: allNoBorder,
          margins: { top: 100, bottom: 80, left: 180, right: 80 },
        })],
      }),
      // items
      ...itemRows,
      // spacing row
      new TableRow({
        children: [new TableCell({
          children: [new Paragraph({ children: [] })],
          borders: { bottom: { style: BorderStyle.SINGLE, size: 6, color: C.gold }, top: noBorder, left: noBorder, right: noBorder },
          shading: { type: ShadingType.SOLID, color: C.white },
        })],
      }),
    ],
    margins: { top: 200, bottom: 120 },
  });
}

// ── Build document ────────────────────────────────────────────────────────────

const doc = new Document({
  creator: 'ARWeb',
  title:   'AR Conversational — User Manual',
  description: 'Complete feature guide for AR Conversational AI Banking Assistant',
  styles: {
    default: {
      document: {
        run: { font: 'Calibri', size: 22, color: C.darkText },
      },
    },
  },
  sections: [{
    properties: {
      page: {
        margin: { top: convertInchesToTwip(1), bottom: convertInchesToTwip(0.8), left: convertInchesToTwip(1), right: convertInchesToTwip(1) },
      },
    },
    headers: {
      default: new Header({
        children: [new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: 'AR CONVERSATIONAL', font: 'Calibri', size: 16, bold: true, color: C.navy })], alignment: AlignmentType.LEFT })],
                borders: { bottom: { style: BorderStyle.SINGLE, size: 4, color: C.gold }, top: noBorder, left: noBorder, right: noBorder },
                shading: { type: ShadingType.SOLID, color: C.white },
              }),
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: 'AI Banking Assistant — User Manual', font: 'Calibri', size: 16, color: C.medText, italics: true })], alignment: AlignmentType.RIGHT })],
                borders: { bottom: { style: BorderStyle.SINGLE, size: 4, color: C.gold }, top: noBorder, left: noBorder, right: noBorder },
                shading: { type: ShadingType.SOLID, color: C.white },
              }),
            ],
          })],
        })],
      }),
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          children: [
            new TextRun({ text: '© ARWeb   |   CONFIDENTIAL   |   Page ', font: 'Calibri', size: 16, color: C.medText }),
          ],
          alignment: AlignmentType.CENTER,
          border: { top: { style: BorderStyle.SINGLE, size: 4, color: C.lightBorder } },
        })],
      }),
    },
    children: [
      // ── Cover ──
      ...coverPage(),

      // ── Section 1: What is AR Conversational ──
      sectionBanner('1', 'What is AR Conversational?'),
      body('AR Conversational is an AI-powered banking assistant that understands natural-language questions from bank staff and retail/private banking clients, answering them by consulting your bank\'s real API catalog.'),
      ...spacer(1),
      body('It is not a chatbot with scripted answers. It is an intelligent routing and composition engine that:', { bold: true }),
      bullet('Reads your question in plain language (English or Italian)'),
      bullet('Identifies which banking domain the question belongs to'),
      bullet('Routes the question to the correct specialist AI agent'),
      bullet('Consults your bank\'s actual API endpoints to find the answer'),
      bullet('Returns a structured, evidence-backed response'),
      ...spacer(1),
      callout('AR Conversational acts as a digital banking subject-matter expert — available 24/7, with knowledge of every API your bank has exposed.'),

      // ── Section 2: How It Works ──
      sectionBanner('2', 'How It Works — Three-Layer Architecture'),

      threeColTable([
        ['Layer 1 — ROUTING', 'BankingAgentRouter scores your question against each agent\'s keyword library. Best-match agent is selected automatically. Manual override available.', 'Automatic & accurate'],
        ['Layer 2 — VALIDATION', 'Every endpoint the AI references is checked against your imported API catalog. Cannot hallucinate or invent endpoints that don\'t exist.', 'Hard architectural constraint'],
        ['Layer 3 — AI COMPOSITION', 'Validated endpoint data is sent to your AI provider (OpenAI, Claude, Gemini, Together.ai, Ollama…), which composes a clear natural-language answer.', 'Powered by your chosen AI'],
      ], 'Layer', 'Description', 'Guarantee', 22, 52, 26),

      ...spacer(1),
      callout('Anti-hallucination is enforced at architecture level, not as a prompt instruction — the system physically cannot reference an endpoint that is not in your catalog.', C.lightBlue, C.navy),

      // ── Section 3: Modes ──
      sectionBanner('3', 'Conversation Modes'),
      body('AR Conversational operates in two distinct modes, tailored to the audience:'),
      ...spacer(1),

      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                children: [
                  new Paragraph({ children: [new TextRun({ text: '🏢  EMPLOYEE MODE', font: 'Calibri', size: 26, bold: true, color: C.white })], spacing: { after: 80 } }),
                  new Paragraph({ children: [new TextRun({ text: 'For internal bank staff', font: 'Calibri', size: 20, color: C.gold, italics: true })], spacing: { after: 80 } }),
                  new Paragraph({ children: [new TextRun({ text: '◆  Relationship managers, portfolio advisors', font: 'Calibri', size: 19, color: C.white })], spacing: { after: 60 } }),
                  new Paragraph({ children: [new TextRun({ text: '◆  Cash managers, compliance officers', font: 'Calibri', size: 19, color: C.white })], spacing: { after: 60 } }),
                  new Paragraph({ children: [new TextRun({ text: '◆  Back-office operations, auditors', font: 'Calibri', size: 19, color: C.white })], spacing: { after: 60 } }),
                  new Paragraph({ children: [new TextRun({ text: '◆  Full operational + regulatory access', font: 'Calibri', size: 19, color: C.white })], spacing: { after: 60 } }),
                  new Paragraph({ children: [new TextRun({ text: '◆  9 specialist agents available', font: 'Calibri', size: 19, color: C.gold, bold: true })], spacing: { after: 60 } }),
                ],
                shading: { type: ShadingType.SOLID, color: C.navy },
                borders: allNoBorder,
                margins: { top: 160, bottom: 160, left: 200, right: 120 },
                width: { size: 50, type: WidthType.PERCENTAGE },
              }),
              new TableCell({
                children: [
                  new Paragraph({ children: [new TextRun({ text: '👤  CLIENT MODE', font: 'Calibri', size: 26, bold: true, color: C.navy })], spacing: { after: 80 } }),
                  new Paragraph({ children: [new TextRun({ text: 'For retail & private banking customers', font: 'Calibri', size: 20, color: C.teal, italics: true })], spacing: { after: 80 } }),
                  new Paragraph({ children: [new TextRun({ text: '◆  Retail banking clients', font: 'Calibri', size: 19, color: C.darkText })], spacing: { after: 60 } }),
                  new Paragraph({ children: [new TextRun({ text: '◆  Private banking customers', font: 'Calibri', size: 19, color: C.darkText })], spacing: { after: 60 } }),
                  new Paragraph({ children: [new TextRun({ text: '◆  Simplified language, no internal jargon', font: 'Calibri', size: 19, color: C.darkText })], spacing: { after: 60 } }),
                  new Paragraph({ children: [new TextRun({ text: '◆  Restricted to own account information', font: 'Calibri', size: 19, color: C.darkText })], spacing: { after: 60 } }),
                  new Paragraph({ children: [new TextRun({ text: '◆  5 specialist agents available', font: 'Calibri', size: 19, color: C.teal, bold: true })], spacing: { after: 60 } }),
                ],
                shading: { type: ShadingType.SOLID, color: C.lightGold },
                borders: allNoBorder,
                margins: { top: 160, bottom: 160, left: 200, right: 120 },
                width: { size: 50, type: WidthType.PERCENTAGE },
              }),
            ],
          }),
        ],
        spacing: { before: 200, after: 200 },
      }),

      // ── Section 4: The 14 Agents ──
      sectionBanner('4', 'The 14 Specialist Agents'),
      body('AR Conversational is powered by 14 specialist agents — 9 for employee use and 5 for client use. Each has deep expertise in a specific banking domain.'),
      ...spacer(1),
      heading2('Employee Agents (9)'),

      agentCard('🤝', 'Relationship Manager',
        'Client relationships, CRM, onboarding',
        ['Client 360-degree views and profiles', 'KYC status and onboarding pipelines', 'Client segmentation (retail, private, corporate)', 'Relationship history and touchpoints', 'Mandate and advisory agreements']),

      agentCard('📊', 'Portfolio Advisor',
        'Investment portfolios and wealth management',
        ['Portfolio holdings and positions', 'Asset allocation and rebalancing', 'Performance attribution and returns', 'Investment mandates and constraints', 'Suitability assessments']),

      agentCard('💳', 'Cash and Payments Agent',
        'Treasury, payments, transfers',
        ['Account balances (available, booked, holds)', 'SEPA credit transfers and direct debits', 'SWIFT international wire transfers', 'Standing orders and scheduled payments', 'Intraday liquidity and cash positioning']),

      agentCard('📈', 'Securities Trading Agent',
        'Capital markets and execution',
        ['Order entry and management (equities, bonds, derivatives)', 'Trade execution and fill status', 'Market data and real-time quotes', 'Trading history and blotter', 'Settlement status and confirmations']),

      agentCard('🏦', 'Credit and Lending Agent',
        'Loans, credit, mortgages',
        ['Consumer and corporate loan details', 'Credit limit utilization and headroom', 'Mortgage terms and repayment schedules', 'Collateral and guarantee structures', 'Loan origination and approval workflows']),

      agentCard('🛡️', 'Compliance and Risk Agent',
        'Regulatory compliance, AML, risk',
        ['AML/KYC screening results', 'Sanctions list checks', 'Compliance alerts and exceptions', 'Risk exposure and limit monitoring', 'Regulatory reporting status']),

      agentCard('⚙️', 'Back Office Operations Agent',
        'Post-trade, settlement, corporate actions',
        ['Trade settlement and failed trades', 'Reconciliation breaks', 'Corporate actions (dividends, splits, rights)', 'Nostro/vostro account management', 'Custody and safekeeping positions']),

      agentCard('📋', 'Reporting and COO Agent',
        'Management information, KPIs, regulatory metrics',
        ['Operational dashboards and KPI reports', 'Regulatory reporting (Basel, MiFID, EMIR)', 'P&L attribution and revenue analysis', 'SLA monitoring and incident metrics', 'Capacity and volume statistics']),

      agentCard('🔍', 'Audit and UAT Agent',
        'Audit trails, testing, system health',
        ['Audit event logs and access history', 'UAT test case management', 'System health checks and API diagnostics', 'Change management records', 'Regulatory audit responses']),

      ...spacer(1),
      heading2('Client-Facing Agents (5)'),

      agentCard('💼', 'Client Wealth Assistant',
        'Personal investments and portfolio overview',
        ['Portfolio total value and allocation breakdown', 'Individual holding performance', 'Year-to-date returns', 'Upcoming maturities or events']),

      agentCard('🏧', 'Client Cash Assistant',
        'Accounts, balances, transactions',
        ['Available and booked account balance', 'Recent transaction history', 'Pending transactions and holds', 'IBAN and account details']),

      agentCard('📉', 'Client Trading Assistant',
        'Personal orders and trades',
        ['Status of open orders', 'Historical trade executions', 'Dividends and corporate action entitlements']),

      agentCard('💰', 'Client Credit Assistant',
        'Personal loans and credit products',
        ['Loan balances and next repayment dates', 'Credit card limits and usage', 'Mortgage details and outstanding balance', 'Repayment history']),

      agentCard('📄', 'Client Messages and Documents Assistant',
        'Statements, documents, communications',
        ['Account statements (PDF download links)', 'Tax documents and certificates', 'Bank notices and secure messages', 'Document archive access']),

      // ── Section 5: Asking Questions ──
      sectionBanner('5', 'Asking Questions'),
      body('Ask questions the same way you would ask a colleague. No special syntax required. The system understands natural language in English and Italian.'),
      ...spacer(1),

      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                children: [
                  new Paragraph({ children: [new TextRun({ text: '🏢  Employee Mode — Examples', font: 'Calibri', size: 22, bold: true, color: C.navy })], spacing: { after: 100 } }),
                  ...[
                    'What is the AML screening status for client ID 12345?',
                    'Show me the portfolio allocation for account CH93-0076.',
                    'What SEPA payments are pending settlement today?',
                    'Has there been suspicious activity flagged in the last 30 days?',
                    'Qual è lo stato del mandato per il cliente Rossi?',
                  ].map(q => new Paragraph({
                    children: [
                      new TextRun({ text: '"', font: 'Calibri', size: 19, color: C.gold, bold: true }),
                      new TextRun({ text: q, font: 'Calibri', size: 19, color: C.darkText, italics: true }),
                      new TextRun({ text: '"', font: 'Calibri', size: 19, color: C.gold, bold: true }),
                    ],
                    spacing: { after: 80 },
                    indent: { left: 180 },
                  })),
                ],
                shading: { type: ShadingType.SOLID, color: C.lightBlue },
                borders: allNoBorder,
                margins: { top: 140, bottom: 140, left: 180, right: 100 },
                width: { size: 50, type: WidthType.PERCENTAGE },
              }),
              new TableCell({
                children: [
                  new Paragraph({ children: [new TextRun({ text: '👤  Client Mode — Examples', font: 'Calibri', size: 22, bold: true, color: C.teal })], spacing: { after: 100 } }),
                  ...[
                    'What is my account balance?',
                    'Show me my last 10 transactions.',
                    'When is my next loan repayment?',
                    'Can I get my last bank statement?',
                    'Come sta andando il mio portafoglio quest\'anno?',
                  ].map(q => new Paragraph({
                    children: [
                      new TextRun({ text: '"', font: 'Calibri', size: 19, color: C.teal, bold: true }),
                      new TextRun({ text: q, font: 'Calibri', size: 19, color: C.darkText, italics: true }),
                      new TextRun({ text: '"', font: 'Calibri', size: 19, color: C.teal, bold: true }),
                    ],
                    spacing: { after: 80 },
                    indent: { left: 180 },
                  })),
                ],
                shading: { type: ShadingType.SOLID, color: C.lightTeal },
                borders: allNoBorder,
                margins: { top: 140, bottom: 140, left: 180, right: 100 },
                width: { size: 50, type: WidthType.PERCENTAGE },
              }),
            ],
          }),
        ],
        spacing: { before: 200, after: 200 },
      }),

      // ── Section 6: Understanding the Answer ──
      sectionBanner('6', 'Understanding the Answer'),
      body('Every response includes three components:'),
      ...spacer(1),

      twoColTable([
        ['The Answer', 'A clear, natural-language response composed by the AI using validated banking API data as its reference.'],
        ['Evidence', 'The specific API endpoints consulted — HTTP method, path, and summary. Confirms the answer is grounded in real API specifications.'],
        ['Limitations', 'Shown when your bank has not imported the API specs needed to fully answer. Specifies what is missing and what to import.'],
      ], 'Component', 'Description', 28, 72),

      ...spacer(1),
      callout('The system will never provide an answer based on endpoints that do not exist in your imported catalog. You receive a clear limitation notice rather than an incorrect or fabricated answer.', C.lightBlue, C.navy),

      // ── Section 7: 25 Banking Domains ──
      sectionBanner('7', 'Business Coverage — 25 Banking Domains'),

      threeColTable([
        ['1', 'Customer & Onboarding', 'KYC, identity verification, client profiles'],
        ['2', 'Accounts', 'Current accounts, savings, IBAN, account opening'],
        ['3', 'Balances', 'Available balance, booked balance, holds, overdrafts'],
        ['4', 'Payments & Transfers', 'SEPA, SWIFT, instant payments, standing orders'],
        ['5', 'Cards', 'Debit cards, credit cards, limits, disputes'],
        ['6', 'Securities & Trading', 'Orders, executions, market data, settlement'],
        ['7', 'Portfolio & Holdings', 'Positions, allocation, NAV, performance'],
        ['8', 'Investment Advisory', 'Suitability, recommendations, mandates'],
        ['9', 'Credit & Lending', 'Loans, mortgages, credit lines, collateral'],
        ['10', 'Deposits & Treasury', 'Term deposits, FX deposits, rates'],
        ['11', 'Foreign Exchange', 'Spot, forward, hedging, FX rates'],
        ['12', 'Compliance & AML', 'Screening, sanctions, alerts, reports'],
        ['13', 'Risk Management', 'Exposure, limits, VaR, stress tests'],
        ['14', 'Fraud & Disputes', 'Chargebacks, fraud investigations, alerts'],
        ['15', 'Statements & Documents', 'PDF statements, tax docs, certificates'],
        ['16', 'Notifications & Messaging', 'Alerts, SMS, email, secure messages'],
        ['17', 'Authentication & Access', 'MFA, sessions, consents, tokens'],
        ['18', 'Beneficiaries & Payees', 'Payee management, verification, whitelists'],
        ['19', 'Standing Orders', 'Recurring payments, direct debits'],
        ['20', 'Reporting & Analytics', 'Dashboards, KPIs, regulatory metrics'],
        ['21', 'Back Office & Settlement', 'Reconciliation, corporate actions, nostro'],
        ['22', 'Wealth & Private Banking', 'Discretionary management, mandates'],
        ['23', 'Insurance & Bancassurance', 'Policies, claims, premiums'],
        ['24', 'Fees & Pricing', 'Tariffs, charges, fee schedules, bundles'],
        ['25', 'Audit & Operations', 'Audit trails, UAT, health checks'],
      ], '#', 'Domain', 'Key Topics', 8, 32, 60),

      // ── Section 8: AI Providers ──
      sectionBanner('8', 'AI Provider Configuration'),

      twoColTable([
        ['OpenAI', 'GPT-4o and GPT-4o-mini — industry-leading general intelligence'],
        ['Anthropic Claude', 'Claude 3.5 Haiku & Sonnet — strong reasoning and compliance'],
        ['Google Gemini', 'Gemini 1.5 Flash & Pro — fast and cost-effective'],
        ['Azure OpenAI', 'Microsoft Azure-hosted OpenAI — meets Azure compliance requirements'],
        ['Together.ai', 'Open-source models (Llama 3.3, Qwen) — flexible and affordable'],
        ['Ollama', 'Local/on-premise LLMs — 100% private, nothing leaves your network'],
        ['Custom', 'Any OpenAI-compatible endpoint — bring your own banking AI model'],
      ], 'AI Provider', 'Description & Best Use'),

      ...spacer(1),
      callout('For maximum data privacy, use Ollama — all AI processing runs on your own infrastructure. Nothing leaves your network. Recommended for environments with strict data sovereignty requirements.', C.lightGold, C.gold),

      // ── Section 9: Can Do Today ──
      sectionBanner('9', 'What AR Conversational Can Do Today'),

      twoColTable([
        ['✅  Natural language Q&A', 'English and Italian, any banking question'],
        ['✅  Automatic agent routing', 'Best-fit selection from 14 specialist agents'],
        ['✅  Manual specialist selection', 'Direct access to any agent from the UI'],
        ['✅  Employee mode', 'Full operational + regulatory access for bank staff'],
        ['✅  Client mode', 'Simplified, client-safe answers for retail/private customers'],
        ['✅  Evidence-backed answers', 'Every answer cites real API endpoints from your catalog'],
        ['✅  Limitations reporting', 'Clear notification when required APIs are not imported'],
        ['✅  25 banking domains', 'Auto-mapped from your API catalog keywords'],
        ['✅  Anti-hallucination', 'Only real, imported endpoints are ever referenced'],
        ['✅  7 AI provider integrations', 'Choose the AI that fits your compliance needs'],
        ['✅  Multi-language support', 'English and Italian out of the box'],
        ['✅  API key encryption', 'AES-256-GCM for all provider credentials at rest'],
      ], 'Feature', 'Details', 30, 70),

      // ── Section 10: Roadmap ──
      sectionBanner('10', 'What AR Conversational Will Be Able to Do'),

      threeColTable([
        ['Short Term', 'Real-time API execution', 'Live banking data in answers, not just API references'],
        ['Short Term', 'Session context memory', 'Multi-turn conversations remembering previous questions'],
        ['Short Term', 'Structured output cards', 'Balance amounts, transaction tables, charts in the chat'],
        ['Medium Term', 'Action execution', 'Initiate payments, book transfers from the conversation'],
        ['Medium Term', 'Custom agent profiles', 'Define agents tuned to your specific API taxonomy'],
        ['Medium Term', 'Audit trail per conversation', 'Full regulatory log of every interaction'],
        ['Medium Term', 'Multi-client disambiguation', 'Handle multiple clients in one session with clear context'],
        ['Long Term', 'Proactive alerts', 'AR surfaces unusual patterns without being asked'],
        ['Long Term', 'CRM integration', 'Pre-fills context from the client open in your CRM'],
        ['Long Term', 'Voice interface', 'Spoken questions and spoken answers for call centres'],
        ['Long Term', 'Regulatory report generation', 'Compose full regulatory documents from natural language'],
      ], 'Timeline', 'Feature', 'Description', 18, 30, 52),

      // ── Section 11: Security ──
      sectionBanner('11', 'Security & Data Handling'),

      twoColTable([
        ['API Key Encryption', 'AES-256-GCM. Keys never stored in plain text, never appear in logs or exports.'],
        ['Network Isolation', 'Sidecar server binds to 127.0.0.1 only — not directly network-accessible.'],
        ['No Data Leakage', 'Only question text and API metadata sent to your AI provider. No customer PII unless your own API responses include it.'],
        ['Ollama Option', 'Full on-premise deployment — zero external network calls. Meets the strictest data sovereignty requirements.'],
        ['Anti-Hallucination', 'Architectural constraint: the system cannot reference endpoints not in your catalog. Not a prompt-level guardrail.'],
        ['Audit Logging', 'All sidecar calls logged. Questions, routing decisions, and AI responses available for audit.'],
      ], 'Protection', 'Detail', 28, 72),

      ...spacer(2),
      divider(),
      new Paragraph({
        children: [new TextRun({ text: 'AR Conversational — Turning your API catalog into a 24/7 banking expert.', font: 'Calibri', size: 20, color: C.medText, italics: true })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 200, after: 200 },
      }),
    ],
  }],
});

const buffer = await Packer.toBuffer(doc);
fs.writeFileSync('/srv/projects/ARWeb-Api-Tester/docs/AR-Conversational-Manual.docx', buffer);
console.log('✅  AR-Conversational-Manual.docx written');
