// Generator: ARAPI Platform Manual (.docx)
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, WidthType, BorderStyle, ShadingType,
  PageBreak, convertInchesToTwip, Footer, Header,
} from '/tmp/node_modules/docx/dist/index.mjs';
import fs from 'fs';

// ── Brand palette ─────────────────────────────────────────────────────────────
const C = {
  indigo:     '2D3A8C',  // ARAPI indigo — primary brand
  orange:     'E8620A',  // energetic orange accent
  slate:      '3D4E6B',  // dark slate secondary
  lightIndigo:'EEF0FB',  // section background
  lightOrange:'FDF2EA',  // callout background
  lightSlate: 'EFF3F8',  // table row alt
  white:      'FFFFFF',
  darkText:   '1A1A2E',
  medText:    '3D3D5C',
  lightBorder:'D5DCE8',
  green:      '1A8A50',
  red:        'C0392B',
  gold:       'C9A84C',
};

const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const allNoBorder = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

// ── Reusable primitives ───────────────────────────────────────────────────────

function run(text, opts = {}) {
  return new TextRun({ text, font: 'Calibri', size: opts.size ?? 22, color: opts.color ?? C.darkText, bold: opts.bold ?? false, italics: opts.italic ?? false });
}

function body(text, opts = {}) {
  return new Paragraph({
    children: [new TextRun({ text, font: 'Calibri', size: 22, color: C.darkText, bold: opts.bold, italics: opts.italic })],
    spacing: { after: 100 },
    indent: opts.indent ? { left: 360 } : {},
  });
}

function bullet(text, sub = false) {
  return new Paragraph({
    children: [
      new TextRun({ text: sub ? '     ◆  ' : '▶  ', font: 'Calibri', size: 20, color: C.orange, bold: true }),
      new TextRun({ text, font: 'Calibri', size: 20, color: C.darkText }),
    ],
    spacing: { after: 80 },
    indent: { left: sub ? 560 : 360 },
  });
}

function callout(text, color = C.lightOrange, border = C.orange) {
  return new Paragraph({
    children: [new TextRun({ text: '  ℹ  ' + text, font: 'Calibri', size: 20, color: C.darkText, italics: true })],
    spacing: { before: 120, after: 120 },
    shading: { type: ShadingType.SOLID, color },
    border: { left: { style: BorderStyle.SINGLE, size: 18, color: border } },
    indent: { left: 200, right: 200 },
  });
}

function heading2(text) {
  return new Paragraph({
    children: [new TextRun({ text, font: 'Calibri', size: 32, bold: true, color: C.indigo })],
    spacing: { before: 300, after: 100 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: C.orange } },
  });
}

function heading3(text) {
  return new Paragraph({
    children: [new TextRun({ text, font: 'Calibri', size: 24, bold: true, color: C.slate })],
    spacing: { before: 200, after: 80 },
  });
}

function spacer(n = 1) {
  return Array.from({ length: n }, () => new Paragraph({ children: [new TextRun('')], spacing: { after: 60 } }));
}

function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

function divider() {
  return new Paragraph({
    children: [],
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: C.orange } },
    spacing: { before: 200, after: 200 },
  });
}

// ── Table primitives ──────────────────────────────────────────────────────────

function headerCell(text, width, shade = C.indigo) {
  return new TableCell({
    children: [new Paragraph({
      children: [new TextRun({ text, font: 'Calibri', size: 20, bold: true, color: C.white })],
      alignment: AlignmentType.LEFT,
    })],
    shading: { type: ShadingType.SOLID, color: shade },
    width: { size: width, type: WidthType.PERCENTAGE },
    margins: { top: 80, bottom: 80, left: 120, right: 80 },
    borders: { bottom: { style: BorderStyle.SINGLE, size: 4, color: C.orange }, top: noBorder, left: noBorder, right: noBorder },
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

function twoColTable(rows, h1, h2, w1 = 30, w2 = 70) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: [headerCell(h1, w1), headerCell(h2, w2)], tableHeader: true }),
      ...rows.map(([c1, c2], i) => new TableRow({
        children: [
          dataCell(c1, w1, i % 2 === 0 ? C.white : C.lightSlate, true),
          dataCell(c2, w2, i % 2 === 0 ? C.white : C.lightSlate),
        ],
      })),
    ],
    spacing: { before: 120, after: 120 },
  });
}

function threeColTable(rows, h1, h2, h3, w1 = 22, w2 = 30, w3 = 48) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: [headerCell(h1, w1), headerCell(h2, w2), headerCell(h3, w3)], tableHeader: true }),
      ...rows.map(([c1, c2, c3], i) => new TableRow({
        children: [
          dataCell(c1, w1, i % 2 === 0 ? C.white : C.lightSlate, true),
          dataCell(c2, w2, i % 2 === 0 ? C.white : C.lightSlate),
          dataCell(c3, w3, i % 2 === 0 ? C.white : C.lightSlate),
        ],
      })),
    ],
    spacing: { before: 120, after: 120 },
  });
}

function fourColTable(rows, h1, h2, h3, h4, w1 = 20, w2 = 25, w3 = 30, w4 = 25) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: [headerCell(h1, w1), headerCell(h2, w2), headerCell(h3, w3), headerCell(h4, w4)], tableHeader: true }),
      ...rows.map(([c1, c2, c3, c4], i) => new TableRow({
        children: [
          dataCell(c1, w1, i % 2 === 0 ? C.white : C.lightSlate, true),
          dataCell(c2, w2, i % 2 === 0 ? C.white : C.lightSlate),
          dataCell(c3, w3, i % 2 === 0 ? C.white : C.lightSlate),
          dataCell(c4, w4, i % 2 === 0 ? C.white : C.lightSlate),
        ],
      })),
    ],
    spacing: { before: 120, after: 120 },
  });
}

// ── Section banner ────────────────────────────────────────────────────────────

function sectionBanner(num, title) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: `${num}`, font: 'Calibri', size: 52, bold: true, color: C.white })], alignment: AlignmentType.CENTER })],
          shading: { type: ShadingType.SOLID, color: C.orange },
          width: { size: 8, type: WidthType.PERCENTAGE },
          margins: { top: 80, bottom: 80, left: 80, right: 80 },
          borders: allNoBorder,
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: title, font: 'Calibri', size: 34, bold: true, color: C.white })], alignment: AlignmentType.LEFT })],
          shading: { type: ShadingType.SOLID, color: C.indigo },
          width: { size: 92, type: WidthType.PERCENTAGE },
          margins: { top: 80, bottom: 80, left: 200, right: 80 },
          borders: allNoBorder,
        }),
      ],
    })],
    spacing: { before: 360, after: 200 },
  });
}

// ── Command block ─────────────────────────────────────────────────────────────

function commandBlock(name, badge, fields, desc) {
  const fieldRows = fields.map(([f, d]) => new TableRow({
    children: [
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: f, font: 'Calibri', size: 19, bold: true, color: C.indigo })], spacing: { after: 0 } })],
        borders: allNoBorder,
        shading: { type: ShadingType.SOLID, color: C.lightIndigo },
        width: { size: 26, type: WidthType.PERCENTAGE },
        margins: { top: 50, bottom: 50, left: 160, right: 60 },
      }),
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: d, font: 'Calibri', size: 19, color: C.darkText })], spacing: { after: 0 } })],
        borders: allNoBorder,
        shading: { type: ShadingType.SOLID, color: C.white },
        width: { size: 74, type: WidthType.PERCENTAGE },
        margins: { top: 50, bottom: 50, left: 120, right: 60 },
      }),
    ],
  }));

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: badge + '  ', font: 'Calibri', size: 24, bold: true, color: C.white }),
                new TextRun({ text: name, font: 'Calibri', size: 24, bold: true, color: C.white }),
              ],
              spacing: { after: 50 },
            }),
            new Paragraph({ children: [new TextRun({ text: desc, font: 'Calibri', size: 19, color: 'CCDDFF', italics: true })], spacing: { after: 0 } }),
          ],
          shading: { type: ShadingType.SOLID, color: C.indigo },
          borders: allNoBorder,
          margins: { top: 120, bottom: 100, left: 180, right: 80 },
        })],
      }),
      ...fieldRows,
      new TableRow({
        children: [new TableCell({
          children: [new Paragraph({ children: [] })],
          borders: { bottom: { style: BorderStyle.SINGLE, size: 6, color: C.orange }, top: noBorder, left: noBorder, right: noBorder },
          shading: { type: ShadingType.SOLID, color: C.white },
          margins: { top: 30, bottom: 30 },
        })],
      }),
    ],
    spacing: { before: 160, after: 40 },
  });
}

// ── Cover page ────────────────────────────────────────────────────────────────

function coverPage() {
  return [
    new Paragraph({ children: [new TextRun({ text: ' ', size: 48 })], spacing: { before: 600, after: 0 } }),
    new Paragraph({
      children: [new TextRun({ text: 'ARAPI', font: 'Calibri', size: 160, bold: true, color: C.white })],
      alignment: AlignmentType.CENTER,
      shading: { type: ShadingType.SOLID, color: C.indigo },
      spacing: { before: 0, after: 0 },
    }),
    new Paragraph({
      children: [new TextRun({ text: '─────────────────────────────────────────', font: 'Calibri', size: 28, color: C.orange })],
      alignment: AlignmentType.CENTER,
      shading: { type: ShadingType.SOLID, color: C.indigo },
      spacing: { before: 60, after: 60 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Banking API Test Automation Platform', font: 'Calibri', size: 36, bold: false, color: C.orange })],
      alignment: AlignmentType.CENTER,
      shading: { type: ShadingType.SOLID, color: C.indigo },
      spacing: { before: 0, after: 0 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Complete Feature Guide & User Manual', font: 'Calibri', size: 24, color: 'AABBDD', italics: true })],
      alignment: AlignmentType.CENTER,
      shading: { type: ShadingType.SOLID, color: C.indigo },
      spacing: { before: 40, after: 120 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: '  Platform: Phase 19   |   ', font: 'Calibri', size: 20, color: C.darkText }),
        new TextRun({ text: 'Audience: QA Engineers, Developers, Test Managers   |   ', font: 'Calibri', size: 20, color: C.darkText }),
        new TextRun({ text: '2025  ', font: 'Calibri', size: 20, color: C.darkText }),
      ],
      alignment: AlignmentType.CENTER,
      shading: { type: ShadingType.SOLID, color: C.lightOrange },
      spacing: { before: 120, after: 0 },
    }),
    pageBreak(),
  ];
}

// ── Build document ────────────────────────────────────────────────────────────

const doc = new Document({
  creator: 'ARWeb',
  title:   'ARAPI — User Manual',
  description: 'Complete feature guide for ARAPI Banking API Test Automation Platform',
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
                children: [new Paragraph({ children: [new TextRun({ text: 'ARAPI', font: 'Calibri', size: 16, bold: true, color: C.indigo })], alignment: AlignmentType.LEFT })],
                borders: { bottom: { style: BorderStyle.SINGLE, size: 4, color: C.orange }, top: noBorder, left: noBorder, right: noBorder },
                shading: { type: ShadingType.SOLID, color: C.white },
              }),
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: 'Banking API Test Automation — User Manual', font: 'Calibri', size: 16, color: C.medText, italics: true })], alignment: AlignmentType.RIGHT })],
                borders: { bottom: { style: BorderStyle.SINGLE, size: 4, color: C.orange }, top: noBorder, left: noBorder, right: noBorder },
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
          children: [new TextRun({ text: '© ARWeb   |   CONFIDENTIAL   |   Page ', font: 'Calibri', size: 16, color: C.medText })],
          alignment: AlignmentType.CENTER,
          border: { top: { style: BorderStyle.SINGLE, size: 4, color: C.lightBorder } },
        })],
      }),
    },
    children: [

      // ── COVER ──
      ...coverPage(),

      // ── S1: What is ARAPI ──
      sectionBanner('1', 'What is ARAPI?'),
      body('ARAPI is a no-code API test automation platform purpose-built for banking and fintech teams.'),
      ...spacer(1),

      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [new TableRow({
          children: [
            ...[
              ['📥', 'Import', 'OpenAPI/Swagger specs — single files, folders, or entire directory trees with subfolders'],
              ['🗂️', 'Catalog', 'Browse all endpoints organized by 25 banking business domains'],
              ['🤖', 'Design', 'Build automated test workflows visually — no coding required'],
              ['▶️', 'Execute', 'Run against Mock Server, staging, or production environments'],
              ['📊', 'Analyze', 'Step-by-step pass/fail breakdowns with HTML and CSV exports'],
              ['🧠', 'AI Builder', 'Ask an AI assistant to search your catalog, create BotJobs, and run tests'],
            ].map(([icon, title, desc]) => new TableCell({
              children: [
                new Paragraph({ children: [new TextRun({ text: icon, font: 'Calibri', size: 40 })], alignment: AlignmentType.CENTER, spacing: { after: 60 } }),
                new Paragraph({ children: [new TextRun({ text: title, font: 'Calibri', size: 22, bold: true, color: C.indigo })], alignment: AlignmentType.CENTER, spacing: { after: 60 } }),
                new Paragraph({ children: [new TextRun({ text: desc, font: 'Calibri', size: 18, color: C.medText })], alignment: AlignmentType.CENTER, spacing: { after: 0 } }),
              ],
              shading: { type: ShadingType.SOLID, color: C.lightIndigo },
              borders: { right: { style: BorderStyle.SINGLE, size: 6, color: C.white }, top: noBorder, bottom: noBorder, left: noBorder },
              margins: { top: 140, bottom: 140, left: 100, right: 100 },
              width: { size: 16, type: WidthType.PERCENTAGE },
            })),
          ],
        })],
        spacing: { before: 160, after: 200 },
      }),

      callout('ARAPI is vendor-neutral: it works with any OpenAPI 3.0 or Swagger 2.0 specification and supports seven AI providers.', C.lightIndigo, C.indigo),

      // ── S2: Core Concepts ──
      sectionBanner('2', 'Core Concepts'),

      twoColTable([
        ['API Catalog', 'Database of every endpoint imported from your OpenAPI/Swagger files. Source of truth for all testing — ARAPI cannot test an endpoint not in the catalog.'],
        ['BotJob', 'A reusable, ordered test workflow made of Blocks and Commands. "Create client → extract ID → call account opening → assert 201 response."'],
        ['Block', 'A logical group inside a BotJob (e.g. "Setup", "Create Client", "Verify", "Cleanup"). Organizes long workflows into readable sections.'],
        ['Command', 'A single test step inside a Block. Typed (API_CALL, ASSERT, EXTRACT…), configured via the visual designer, with enable/disable toggle.'],
        ['Environment', 'A named execution target: the built-in Mock Server, or your own staging/production environments with custom base URLs.'],
        ['Variable', 'A named value flowing through a BotJob. Set at design time or extracted from API responses and referenced as ${varName} in requests.'],
      ], 'Concept', 'Definition', 22, 78),

      // ── S3: Importing ──
      sectionBanner('3', 'Importing API Specifications'),

      twoColTable([
        ['OpenAPI 3.0', '.yaml  /  .yml  /  .json — Full support including $ref resolution'],
        ['Swagger 2.0', '.yaml  /  .yml  /  .json — Automatically converted on import'],
      ], 'Format', 'Extensions & Notes', 22, 78),

      ...spacer(1),
      heading2('Import Methods'),
      heading3('Method 1 — Upload Files (Browser)'),
      bullet('Click Browse Files to select one or more OpenAPI/Swagger files'),
      bullet('Click Browse Folder to select an entire directory — ARAPI recursively scans all subfolders'),
      bullet('Files appear in a list with name and size; remove individual files with ×'),
      bullet('Click Import to process all selected files'),

      ...spacer(1),
      callout('Folder import preserves the subfolder structure. A file at specs/payments/sepa.yaml is stored as payments/sepa.yaml — the full directory tree is maintained.', C.lightOrange, C.orange),

      ...spacer(1),
      heading3('Method 2 — Server Path (Admin/Desktop)'),
      bullet('Enter the absolute path to a folder on the server'),
      bullet('ARAPI scans recursively and imports all .yaml, .yml, and .json files'),
      bullet('Ignored: node_modules, dist, build, .git, vs, bin, obj'),

      ...spacer(1),
      heading3('What Gets Imported'),
      twoColTable([
        ['Endpoint', 'HTTP method + full path including parameters'],
        ['Metadata', 'Summary, description, tags'],
        ['Parameters', 'Name, location (query/path/header/body), required flag, type, example'],
        ['Response schemas', 'Top-level JSON fields from response definitions'],
      ], 'Data', 'Details', 24, 76),

      ...spacer(1),
      heading3('Error Handling'),
      bullet('Files that fail parsing are logged with the specific error reason'),
      bullet('Failed files do NOT stop the import of other files — the process always continues'),
      bullet('A summary shows successful specs, total endpoints, and failed file names with error details'),

      // ── S4: Catalog ──
      sectionBanner('4', 'The API Catalog'),

      heading3('Catalog Table Columns'),
      fourColTable([
        ['Method', 'HTTP verb, color-coded', 'GET=Blue, POST=Green, PUT=Amber, DELETE=Red, PATCH=Purple', ''],
        ['Path', 'Full endpoint path', '/v1/accounts/{accountId}/balance', ''],
        ['Summary', 'Human-readable description from OpenAPI spec', '', ''],
        ['Mapping', 'Business category assignment', '"mapped" or "unmapped"', ''],
      ], 'Column', 'Description', 'Examples', 'Notes', 18, 26, 36, 20),

      ...spacer(1),
      heading3('Catalog Exports'),
      twoColTable([
        ['Postman Collection v2.1', 'Full catalog in Postman JSON. Import directly into Postman or Insomnia. File: arweb-postman-collection.json'],
        ['Bash / curl Script', 'One curl command per endpoint. Pipe to bash to replay your entire catalog against any base URL. File: arweb-catalog.sh'],
      ], 'Export', 'Description', 26, 74),

      // ── S5: Business Categories ──
      sectionBanner('5', 'Business Categories — 25 Banking Domains'),
      body('ARAPI automatically maps endpoints to 25 banking domains based on keyword matching against path, method, summary, and tags. Each category has 5 subcategories.'),
      ...spacer(1),

      threeColTable([
        ['1', 'Customer & Onboarding', '/clients, /kyc, /onboarding, /identity'],
        ['2', 'Accounts', '/accounts, /iban, /account-opening'],
        ['3', 'Balances', '/balance, /available-balance, /holds'],
        ['4', 'Payments & Transfers', '/payments, /sepa, /swift, /transfers'],
        ['5', 'Cards', '/cards, /card-limits, /pin, /disputes'],
        ['6', 'Securities & Trading', '/orders, /executions, /instruments, /blotter'],
        ['7', 'Portfolio & Holdings', '/portfolio, /positions, /holdings, /nav'],
        ['8', 'Investment Advisory', '/suitability, /recommendations, /mandates'],
        ['9', 'Credit & Lending', '/loans, /mortgages, /credit-lines, /collateral'],
        ['10', 'Deposits & Treasury', '/deposits, /term-deposits, /rates'],
        ['11', 'Foreign Exchange', '/fx, /spot, /forward, /hedging'],
        ['12', 'Compliance & AML', '/aml, /sanctions, /compliance, /screening'],
        ['13', 'Risk Management', '/risk, /exposure, /limits, /var, /stress'],
        ['14', 'Fraud & Disputes', '/fraud, /chargebacks, /investigations'],
        ['15', 'Statements & Documents', '/statements, /documents, /reports'],
        ['16', 'Notifications & Messaging', '/notifications, /alerts, /messages, /sms'],
        ['17', 'Authentication & Access', '/auth, /mfa, /sessions, /consents'],
        ['18', 'Beneficiaries & Payees', '/beneficiaries, /payees, /whitelist'],
        ['19', 'Standing Orders', '/standing-orders, /recurring, /direct-debits'],
        ['20', 'Reporting & Analytics', '/analytics, /kpi, /dashboards, /metrics'],
        ['21', 'Back Office & Settlement', '/settlement, /reconciliation, /nostro'],
        ['22', 'Wealth & Private Banking', '/wealth, /discretionary, /private-banking'],
        ['23', 'Insurance & Bancassurance', '/insurance, /policies, /claims'],
        ['24', 'Fees & Pricing', '/fees, /tariffs, /pricing, /bundles'],
        ['25', 'Audit & Operations', '/audit, /events, /health, /uat'],
      ], '#', 'Category', 'Example Endpoint Paths', 8, 30, 62),

      // ── S6: BotJob Designer ──
      sectionBanner('6', 'Designing BotJobs — The Visual Designer'),

      heading3('Creating a BotJob'),
      bullet('Go to Execute Tests → New BotJob, or ask the Bot Builder AI assistant to create one'),
      bullet('Give it a name (required) and description (optional)'),
      bullet('BotJob is created with one empty Main block'),
      bullet('Click Open Designer to build the workflow'),

      ...spacer(1),
      heading3('Designer Layout — Three Panels'),

      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({ children: [new TextRun({ text: '⬅  Command Palette', font: 'Calibri', size: 22, bold: true, color: C.white })], spacing: { after: 80 } }),
                new Paragraph({ children: [new TextRun({ text: 'Grouped command types:', font: 'Calibri', size: 19, color: C.orange, italics: true })], spacing: { after: 60 } }),
                ...['🔵  API — API_CALL', '🟣  Variables — SET_VARIABLE, EXTRACT', '🟢  Assertions — ASSERT_*', '🟠  Control — WAIT, STOP_ON_FAILURE', '🟡  Data — future commands'].map(t => new Paragraph({ children: [new TextRun({ text: t, font: 'Calibri', size: 19, color: C.white })], spacing: { after: 50 } })),
                new Paragraph({ children: [new TextRun({ text: 'Drag & drop onto canvas', font: 'Calibri', size: 18, color: C.orange, italics: true })], spacing: { after: 0 }, indent: { left: 160 } }),
              ],
              shading: { type: ShadingType.SOLID, color: C.indigo },
              borders: { right: { style: BorderStyle.SINGLE, size: 8, color: C.orange }, top: noBorder, bottom: noBorder, left: noBorder },
              margins: { top: 140, bottom: 140, left: 180, right: 120 },
              width: { size: 28, type: WidthType.PERCENTAGE },
            }),
            new TableCell({
              children: [
                new Paragraph({ children: [new TextRun({ text: '⬛  Workflow Canvas', font: 'Calibri', size: 22, bold: true, color: C.indigo })], spacing: { after: 80 } }),
                new Paragraph({ children: [new TextRun({ text: 'All blocks and commands in execution order:', font: 'Calibri', size: 19, color: C.slate, italics: true })], spacing: { after: 60 } }),
                ...['Add Block — create logical sections', 'Reorder commands — drag handles', 'Enable/Disable — toggle without deleting', 'Delete — remove commands or entire blocks', 'Color-coded type badges per command'].map(t => new Paragraph({ children: [new TextRun({ text: '  ▶  ' + t, font: 'Calibri', size: 19, color: C.darkText })], spacing: { after: 50 } })),
              ],
              shading: { type: ShadingType.SOLID, color: C.lightIndigo },
              borders: { right: { style: BorderStyle.SINGLE, size: 8, color: C.orange }, top: noBorder, bottom: noBorder, left: noBorder },
              margins: { top: 140, bottom: 140, left: 180, right: 120 },
              width: { size: 40, type: WidthType.PERCENTAGE },
            }),
            new TableCell({
              children: [
                new Paragraph({ children: [new TextRun({ text: '⚙  Config Editor', font: 'Calibri', size: 22, bold: true, color: C.indigo })], spacing: { after: 80 } }),
                new Paragraph({ children: [new TextRun({ text: 'Click any command to configure:', font: 'Calibri', size: 19, color: C.slate, italics: true })], spacing: { after: 60 } }),
                ...['Fields vary by command type', 'Endpoint selector (searchable)', 'JSON body editor', 'Headers key-value editor', '${variable} tokens supported', 'Changes held until Save click'].map(t => new Paragraph({ children: [new TextRun({ text: '  ▶  ' + t, font: 'Calibri', size: 19, color: C.darkText })], spacing: { after: 50 } })),
              ],
              shading: { type: ShadingType.SOLID, color: C.lightOrange },
              borders: allNoBorder,
              margins: { top: 140, bottom: 140, left: 180, right: 120 },
              width: { size: 32, type: WidthType.PERCENTAGE },
            }),
          ],
        })],
        spacing: { before: 160, after: 200 },
      }),

      // ── S7: Commands ──
      sectionBanner('7', 'Command Reference — All 8 Runnable Types'),

      commandBlock('API_CALL', '🔵', [
        ['Endpoint', 'Select from your API catalog — searchable dropdown showing method + path'],
        ['Body', 'JSON request body — supports ${variable} tokens'],
        ['Headers', 'Additional request headers as key-value pairs — supports ${variable} tokens'],
        ['Auto-captures', 'Response body → lastResponse  |  Status code → lastStatus'],
      ], 'Makes an HTTP request to a catalog endpoint. Auto-stores response for downstream commands.'),

      commandBlock('SET_VARIABLE', '🟣', [
        ['Variable Name', 'The variable to create or overwrite'],
        ['Value', 'New value — supports ${variable} tokens and hardcoded values'],
      ], 'Sets or overwrites a workflow variable at runtime. Use to stage data or compute values for the next API call.'),

      commandBlock('ASSERT_STATUS_CODE', '🟢', [
        ['Expected Code', 'Integer — e.g. 200, 201, 404, 422'],
      ], 'Validates the HTTP status code of the most recent API_CALL. Passes if lastStatus == expected.'),

      commandBlock('ASSERT_FIELD_VALUE', '🟢', [
        ['JSON Path', 'Dot-notation path — e.g. data.account.status'],
        ['Expected Value', 'String or number to compare against the field'],
      ], 'Validates a specific field value in the last JSON response. Fails if path missing or value does not match.'),

      commandBlock('ASSERT_JSON_PATH_EXISTS', '🟢', [
        ['JSON Path', 'Dot-notation path — e.g. data.clientId'],
      ], 'Verifies a field exists in the last JSON response. Does not check its value — just presence. Use before EXTRACT.'),

      commandBlock('EXTRACT_JSON_PATH', '🟣', [
        ['JSON Path', 'Dot-notation path — e.g. data.clientId'],
        ['Variable Name', 'The variable to store the extracted value in'],
      ], 'Extracts a value from the last JSON response and stores it as a workflow variable for use in subsequent commands.'),

      commandBlock('WAIT', '🟠', [
        ['Duration (ms)', 'Pause length in milliseconds — maximum 10,000 ms (10 seconds)'],
      ], 'Pauses execution. Use when an async operation (payment propagation, async job) needs time before verification.'),

      commandBlock('STOP_ON_FAILURE', '🟠', [
        ['No config', 'Place immediately after a critical assertion'],
      ], 'Halts execution if the previous command failed. All subsequent commands are skipped. Use to protect downstream steps that depend on authentication or resource creation.'),

      // ── S8: Variables ──
      sectionBanner('8', 'Variables & Token Resolution'),

      body('Variables are declared at the BotJob level with optional initial values. Reference them as ${varName} in any API_CALL body, headers, or assertion values.'),
      ...spacer(1),

      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({ children: [new TextRun({ text: '📌  Variable Flow Example', font: 'Calibri', size: 22, bold: true, color: C.white })], spacing: { after: 100 } }),
                ...[
                  '1.  BotVariable: currency = "EUR"',
                  '2.  API_CALL body uses ${currency}',
                  '        → POST /payments/transfers',
                  '        → body: { "currency": "${currency}" }',
                  '3.  Response: { "accountId": "ACC-12345" }',
                  '4.  EXTRACT data.accountId → ${accountId}',
                  '5.  Next API_CALL: /accounts/${accountId}/balance',
                  '        → Resolved: /accounts/ACC-12345/balance',
                ].map(t => new Paragraph({ children: [new TextRun({ text: t, font: 'Calibri', size: 19, color: t.startsWith('    ') ? 'AABBDD' : C.white, italics: t.startsWith('    ') })], spacing: { after: 50 } })),
              ],
              shading: { type: ShadingType.SOLID, color: C.indigo },
              borders: allNoBorder,
              margins: { top: 160, bottom: 160, left: 200, right: 120 },
              width: { size: 55, type: WidthType.PERCENTAGE },
            }),
            new TableCell({
              children: [
                new Paragraph({ children: [new TextRun({ text: '🔐  Secret Variables', font: 'Calibri', size: 22, bold: true, color: C.orange })], spacing: { after: 80 } }),
                new Paragraph({ children: [new TextRun({ text: 'Mark any variable as Secret to redact its value from:', font: 'Calibri', size: 19, color: C.darkText })], spacing: { after: 60 } }),
                ...['Execution step results', 'HTML and CSV reports', 'Server logs'].map(t => new Paragraph({ children: [new TextRun({ text: '◆  ' + t, font: 'Calibri', size: 19, color: C.darkText })], spacing: { after: 50 }, indent: { left: 160 } })),
                new Paragraph({ children: [new TextRun({ text: ' ', size: 20 })], spacing: { after: 80 } }),
                new Paragraph({ children: [new TextRun({ text: '✅  Use for:', font: 'Calibri', size: 20, bold: true, color: C.indigo })], spacing: { after: 60 } }),
                ...['Passwords', 'API / Bearer tokens', 'Sensitive test data', 'PINs and OTPs'].map(t => new Paragraph({ children: [new TextRun({ text: '◆  ' + t, font: 'Calibri', size: 19, color: C.darkText })], spacing: { after: 50 }, indent: { left: 160 } })),
              ],
              shading: { type: ShadingType.SOLID, color: C.lightOrange },
              borders: allNoBorder,
              margins: { top: 160, bottom: 160, left: 200, right: 120 },
              width: { size: 45, type: WidthType.PERCENTAGE },
            }),
          ],
        })],
        spacing: { before: 160, after: 200 },
      }),

      // ── S9: Environments ──
      sectionBanner('9', 'Environments'),

      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({ children: [new TextRun({ text: '🔒  MOCK SERVER', font: 'Calibri', size: 24, bold: true, color: C.white })], spacing: { after: 80 } }),
                new Paragraph({ children: [new TextRun({ text: 'Built-in — always available', font: 'Calibri', size: 19, color: C.orange, italics: true })], spacing: { after: 80 } }),
                ...['ID: "mock"  |  Port: 8855', 'Cannot be deleted or edited', 'Auto-seeded from your catalog', 'Zero risk — no real APIs called', 'Request log with match tracking'].map(t => new Paragraph({ children: [new TextRun({ text: '◆  ' + t, font: 'Calibri', size: 19, color: C.white })], spacing: { after: 50 } })),
              ],
              shading: { type: ShadingType.SOLID, color: C.indigo },
              borders: { right: { style: BorderStyle.SINGLE, size: 8, color: C.orange }, top: noBorder, bottom: noBorder, left: noBorder },
              margins: { top: 160, bottom: 160, left: 200, right: 120 },
              width: { size: 40, type: WidthType.PERCENTAGE },
            }),
            new TableCell({
              children: [
                new Paragraph({ children: [new TextRun({ text: '🌐  CUSTOM ENVIRONMENTS', font: 'Calibri', size: 24, bold: true, color: C.indigo })], spacing: { after: 80 } }),
                new Paragraph({ children: [new TextRun({ text: 'Unlimited — staging, UAT, production', font: 'Calibri', size: 19, color: C.slate, italics: true })], spacing: { after: 80 } }),
              ],
              shading: { type: ShadingType.SOLID, color: C.lightSlate },
              borders: allNoBorder,
              margins: { top: 160, bottom: 0, left: 200, right: 120 },
              width: { size: 60, type: WidthType.PERCENTAGE },
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [] })], borders: allNoBorder, shading: { type: ShadingType.SOLID, color: C.indigo }, width: { size: 40, type: WidthType.PERCENTAGE } }),
            new TableCell({
              children: [
                twoColTable([
                  ['Name', 'Required — e.g. "Staging", "UAT", "Production"'],
                  ['Base URL', 'Required — e.g. https://staging.mybank.com'],
                  ['Description', 'Optional free text notes'],
                  ['Headers', 'Default headers for all requests (e.g. Authorization)'],
                  ['Default', 'Pre-selected environment when running BotJobs'],
                ], 'Field', 'Details', 26, 74),
              ],
              borders: allNoBorder,
              shading: { type: ShadingType.SOLID, color: C.lightSlate },
              margins: { top: 0, bottom: 160, left: 200, right: 120 },
              width: { size: 60, type: WidthType.PERCENTAGE },
            }),
          ],
        })],
        spacing: { before: 160, after: 200 },
      }),

      // ── S10: Executing ──
      sectionBanner('10', 'Executing Tests'),

      heading3('Running a BotJob'),
      bullet('Find the BotJob in Execute Tests list → click Run'),
      bullet('Select target environment (defaults to your default environment)'),
      bullet('Click Execute'),
      ...spacer(1),

      heading3('Execution Process'),
      threeColTable([
        ['Step 1', 'Validation', 'All API_CALL endpoint IDs checked against current catalog'],
        ['Step 2', 'Variable Init', 'Variables initialized from declared initial values'],
        ['Step 3', 'Command Loop', 'Commands execute in block order, command order'],
        ['Step 4', 'Token Resolution', '${variable} tokens resolved just before each command'],
        ['Step 5', 'Result Recording', 'Pass/fail/error/skipped recorded per step'],
        ['Step 6', 'Failure Check', 'STOP_ON_FAILURE skips remaining commands on trigger'],
        ['Step 7', 'Summary Save', 'Run summary saved to execution history'],
      ], 'Step', 'Phase', 'Description', 10, 22, 68),

      ...spacer(1),
      heading3('Status Reference'),

      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ children: [headerCell('RUN STATUS', 35, C.indigo), headerCell('STEP STATUS', 65, C.indigo)], tableHeader: true }),
          new TableRow({
            children: [
              new TableCell({
                children: [
                  ...['✅  passed — all commands passed', '❌  failed — one or more failed', '⚠️  error — unexpected runtime error', '⏳  running — execution in progress'].map(t => new Paragraph({ children: [new TextRun({ text: t, font: 'Calibri', size: 19, color: C.darkText })], spacing: { after: 60 } })),
                ],
                borders: allNoBorder,
                shading: { type: ShadingType.SOLID, color: C.lightSlate },
                margins: { top: 100, bottom: 100, left: 120, right: 80 },
                width: { size: 35, type: WidthType.PERCENTAGE },
              }),
              new TableCell({
                children: [
                  ...['✅  passed — executed, all assertions matched', '❌  failed — assertion mismatch or wrong status', '⚠️  error — network error or missing variable', '⏭️  skipped — STOP_ON_FAILURE was triggered earlier'].map(t => new Paragraph({ children: [new TextRun({ text: t, font: 'Calibri', size: 19, color: C.darkText })], spacing: { after: 60 } })),
                ],
                borders: allNoBorder,
                shading: { type: ShadingType.SOLID, color: C.white },
                margins: { top: 100, bottom: 100, left: 120, right: 80 },
                width: { size: 65, type: WidthType.PERCENTAGE },
              }),
            ],
          }),
        ],
        spacing: { before: 120, after: 120 },
      }),

      // ── S11: Results & Reports ──
      sectionBanner('11', 'Execution Results & Reports'),

      heading3('Viewing Results — Execute Tests → History'),
      twoColTable([
        ['Run card', 'Status badge, environment name, N passed / M failed / T total, duration, timestamp'],
        ['Step detail', 'Status, command type, duration (ms), request JSON, response JSON, assertion results'],
        ['Filtering', 'BotJob selector shows only runs for a specific workflow'],
      ], 'View', 'Contents', 24, 76),

      ...spacer(1),
      heading3('Report Exports'),

      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({ children: [new TextRun({ text: '📄  HTML Report', font: 'Calibri', size: 22, bold: true, color: C.indigo })], spacing: { after: 80 } }),
                ...['Formatted, browser-readable summary', 'Pass/fail per step with color coding', 'Printable to PDF from browser', 'File: run-{runId}.html'].map(t => new Paragraph({ children: [new TextRun({ text: '◆  ' + t, font: 'Calibri', size: 19, color: C.darkText })], spacing: { after: 50 } })),
              ],
              shading: { type: ShadingType.SOLID, color: C.lightIndigo },
              borders: { right: { style: BorderStyle.SINGLE, size: 8, color: C.orange }, top: noBorder, bottom: noBorder, left: noBorder },
              margins: { top: 140, bottom: 140, left: 200, right: 120 },
              width: { size: 50, type: WidthType.PERCENTAGE },
            }),
            new TableCell({
              children: [
                new Paragraph({ children: [new TextRun({ text: '📊  CSV Export', font: 'Calibri', size: 22, bold: true, color: C.indigo })], spacing: { after: 80 } }),
                ...['Tabular: stepId, commandType, status, durationMs, errorMessage', 'Import into Excel, Google Sheets, Jira', 'Perfect for BI tools and dashboards', 'File: run-{runId}.csv'].map(t => new Paragraph({ children: [new TextRun({ text: '◆  ' + t, font: 'Calibri', size: 19, color: C.darkText })], spacing: { after: 50 } })),
              ],
              shading: { type: ShadingType.SOLID, color: C.lightOrange },
              borders: allNoBorder,
              margins: { top: 140, bottom: 140, left: 200, right: 120 },
              width: { size: 50, type: WidthType.PERCENTAGE },
            }),
          ],
        })],
        spacing: { before: 160, after: 200 },
      }),

      heading3('Catalog Exports — Always Available'),
      twoColTable([
        ['Postman Collection', 'arweb-postman-collection.json — import into Postman or Insomnia'],
        ['Bash/curl Script', 'arweb-catalog.sh — replay all endpoints via command line against any base URL'],
      ], 'Export', 'File & Use', 24, 76),

      // ── S12: Mock Server ──
      sectionBanner('12', 'Mock Server'),

      heading3('Purpose'),
      body('The built-in Mock Server lets you run BotJobs safely without touching real APIs. Auto-seeded with your catalog endpoints, it returns generated responses and logs every request.'),

      ...spacer(1),
      heading3('Request Log Columns'),
      threeColTable([
        ['#', 'Sequential request number', 'Chronological ordering'],
        ['Time', 'Timestamp', 'When the request was received'],
        ['Method', 'HTTP verb', 'GET, POST, PUT, DELETE, PATCH'],
        ['Path', 'Requested path', 'Full URL path called'],
        ['Status', 'HTTP status returned', '200, 201, 404, etc.'],
        ['Matched', 'Catalog match flag', 'True = known endpoint, False = unknown path'],
      ], 'Column', 'Content', 'Notes', 15, 35, 50),

      ...spacer(1),
      heading3('Stats Dashboard'),
      twoColTable([
        ['Total Requests', 'Count since server was started'],
        ['Match Rate', 'Percentage of requests that matched a catalog endpoint'],
        ['Most Hit', 'The endpoint called most frequently'],
      ], 'Stat', 'Description', 28, 72),

      // ── S13: Bot Builder ──
      sectionBanner('13', 'Bot Builder — AI Test Assistant'),

      body('Bot Builder is ARAPI\'s built-in AI assistant that takes real actions: search your catalog, create BotJobs, and run tests — all from a conversation.'),
      ...spacer(1),

      heading3('5 Actions the Bot Builder Can Take'),
      threeColTable([
        ['🔍  Search Catalog', 'Natural language search across all imported endpoints', '"Find endpoints related to KYC and onboarding"'],
        ['📋  List BotJobs', 'Show all existing BotJobs with names, IDs, descriptions', '"What test workflows do I have?"'],
        ['➕  Create BotJob', 'Create a named BotJob in the database, return ID + Designer link', '"Create a BotJob for the payment transfer flow"'],
        ['🌐  List Environments', 'Show all configured test environments', '"What environments do I have?"'],
        ['▶️  Execute BotJob', 'Run a BotJob and return pass/fail results', '"Run \'Client Onboarding\' against the Mock Server"'],
      ], 'Action', 'What It Does', 'Example Prompt', 20, 38, 42),

      ...spacer(1),

      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({ children: [new TextRun({ text: '🧠  With Anthropic Claude', font: 'Calibri', size: 22, bold: true, color: C.white })], spacing: { after: 80 } }),
                new Paragraph({ children: [new TextRun({ text: 'Full agentic loop (tool use API):', font: 'Calibri', size: 19, color: C.orange, italics: true })], spacing: { after: 60 } }),
                ...['Searches catalog autonomously', 'Acts on results in same turn', 'Multi-step reasoning', 'Creates BotJobs with full context'].map(t => new Paragraph({ children: [new TextRun({ text: '◆  ' + t, font: 'Calibri', size: 19, color: C.white })], spacing: { after: 50 } })),
              ],
              shading: { type: ShadingType.SOLID, color: C.indigo },
              borders: { right: { style: BorderStyle.SINGLE, size: 8, color: C.orange }, top: noBorder, bottom: noBorder, left: noBorder },
              margins: { top: 140, bottom: 140, left: 180, right: 120 },
              width: { size: 50, type: WidthType.PERCENTAGE },
            }),
            new TableCell({
              children: [
                new Paragraph({ children: [new TextRun({ text: '💬  With Other Providers', font: 'Calibri', size: 22, bold: true, color: C.indigo })], spacing: { after: 80 } }),
                new Paragraph({ children: [new TextRun({ text: 'OpenAI, Together.ai, Gemini, Ollama:', font: 'Calibri', size: 19, color: C.slate, italics: true })], spacing: { after: 60 } }),
                ...['Text-completion mode', 'Answers questions about the platform', 'Catalog search and BotJob creation still work', 'May need more explicit instructions'].map(t => new Paragraph({ children: [new TextRun({ text: '◆  ' + t, font: 'Calibri', size: 19, color: C.darkText })], spacing: { after: 50 } })),
              ],
              shading: { type: ShadingType.SOLID, color: C.lightOrange },
              borders: allNoBorder,
              margins: { top: 140, bottom: 140, left: 180, right: 120 },
              width: { size: 50, type: WidthType.PERCENTAGE },
            }),
          ],
        })],
        spacing: { before: 160, after: 200 },
      }),

      // ── S14: Settings / AI Providers ──
      sectionBanner('14', 'Settings — AI Provider Configuration'),

      fourColTable([
        ['OpenAI', 'sk-...', 'gpt-4o-mini', 'Industry-leading, general purpose'],
        ['Anthropic', 'sk-ant-...', 'claude-3-5-haiku-20241022', 'Best for Bot Builder tool use'],
        ['Google Gemini', 'Google API key', 'gemini-1.5-flash', 'Fast and cost-effective'],
        ['Azure OpenAI', 'Azure key', 'gpt-4o-mini', 'Azure compliance — requires base URL'],
        ['Ollama', 'No key needed', 'llama3.2', '100% local — requires base URL'],
        ['Together.ai', 'tgp_v1_...', 'Llama-3.3-70B-Turbo', 'Open-source models, affordable'],
        ['Custom', 'Any key', 'gpt-4o-mini', 'Any OpenAI-compatible endpoint'],
      ], 'Provider', 'Key Format', 'Default Model', 'Best Use', 18, 22, 32, 28),

      ...spacer(1),
      heading3('Default Provider Toggle'),
      bullet('Enable DEFAULT on exactly one provider — this is used by all AI features'),
      bullet('Green DEFAULT = provider set + API key present → active'),
      bullet('Red NO KEY = set as default but no key saved → AI features unavailable'),
      bullet('Grey SET DEFAULT = not currently the default'),
      bullet('Enabling a new default automatically disables the previous one (atomic, exclusive)'),

      ...spacer(1),
      heading3('Test Connection'),
      bullet('Click Test on any provider card to verify: key valid, API reachable, latency in ms'),
      bullet('Test sends a minimal prompt ("Say exactly: OK") and shows the response'),

      ...spacer(1),
      callout('API keys are encrypted at rest using AES-256-GCM. They never appear in logs, exports, or HTTP responses. Shown as ••••••••• in the UI after saving.', C.lightIndigo, C.indigo),

      // ── S15: Can Do Today ──
      sectionBanner('15', 'What ARAPI Can Do Today'),

      threeColTable([
        ['✅', 'Import OpenAPI 3.0 + Swagger 2.0', 'JSON and YAML, single files or full folder trees'],
        ['✅', 'Folder/subfolder import', 'Preserves directory structure, browser + server path'],
        ['✅', 'Auto-category mapping', '25 banking domains via keyword matching'],
        ['✅', 'Catalog search', 'Instant filter across method, path, summary'],
        ['✅', 'Postman + bash export', 'Full catalog in Postman v2.1 or curl script'],
        ['✅', 'Visual BotJob designer', 'Drag-and-drop, 3-panel, no coding'],
        ['✅', '8 runnable command types', 'API_CALL, SET_VARIABLE, ASSERT_*, EXTRACT, WAIT, STOP'],
        ['✅', 'Variable system', '${token} resolution, secret masking, runtime extraction'],
        ['✅', 'Built-in Mock Server', 'Port 8855, auto-seeded, request log'],
        ['✅', 'Custom environments', 'Unlimited, named, with default headers'],
        ['✅', 'Execution history', 'All runs stored with step-level detail'],
        ['✅', 'HTML + CSV reports', 'Download per run, browser-printable to PDF'],
        ['✅', 'Bot Builder AI', 'Catalog search, BotJob create/list/execute from chat'],
        ['✅', 'Anti-hallucination', 'BotJob validation against live catalog before execution'],
        ['✅', '7 AI providers', 'OpenAI, Anthropic, Gemini, Azure, Together.ai, Ollama, Custom'],
        ['✅', 'Encrypted key storage', 'AES-256-GCM for all provider credentials'],
      ], '', 'Feature', 'Details', 5, 38, 57),

      // ── S16: Roadmap ──
      sectionBanner('16', 'What ARAPI Will Be Able to Do'),

      threeColTable([
        ['Short Term', 'IF/ELSE branching', 'Conditional command execution based on response values or variables'],
        ['Short Term', 'LOOP / FOR_EACH', 'Iterate over a list — test 10 client IDs in one BotJob'],
        ['Short Term', 'READ_CSV / READ_EXCEL', 'Data-driven testing: one row = one test run'],
        ['Short Term', 'CALL_COMPONENT', 'Reusable sub-workflows — define Login once, use everywhere'],
        ['Short Term', 'Retry on failure', 'Auto-retry flaky steps with configurable backoff'],
        ['Medium Term', 'AI_GENERATE_DATA', 'AI generates realistic IBANs, amounts, names for test payloads'],
        ['Medium Term', 'Schema validation command', 'Assert response matches a specific JSON schema'],
        ['Medium Term', 'Parallel execution', 'Run multiple BotJobs simultaneously, aggregate results'],
        ['Medium Term', 'Scheduled runs', 'Cron-based automation — regression suites nightly or hourly'],
        ['Medium Term', 'Test Collections', 'Group BotJobs into suites: regression, smoke, integration'],
        ['Medium Term', 'CI/CD integration', 'REST API + CLI to trigger runs from Jenkins, GitHub Actions, GitLab CI'],
        ['Long Term', 'Visual test recorder', 'Record API calls from browser session, auto-generate BotJob'],
        ['Long Term', 'Diff testing', 'Compare responses between environments (staging vs production)'],
        ['Long Term', 'Performance baseline', 'Track response times over time, alert on regressions'],
        ['Long Term', 'Multi-region execution', 'Run BotJobs from geographically distributed nodes'],
        ['Long Term', 'RBAC', 'Role-based access for catalog, BotJobs, results'],
        ['Long Term', 'Webhooks', 'Post results to Slack, Teams, or any webhook on completion'],
        ['Long Term', 'White-label reports', 'Custom HTML report templates with your bank\'s branding'],
      ], 'Timeline', 'Feature', 'Description', 18, 30, 52),

      // ── S17: Security ──
      sectionBanner('17', 'Security & Architecture'),

      twoColTable([
        ['Key Encryption', 'AES-256-GCM. Master key from filesystem (0600 permissions) or ARWEB_MASTER_KEY env var.'],
        ['Network Isolation', 'Sidecar server binds to 127.0.0.1 only. Not directly network-accessible. Fronted by nginx proxy.'],
        ['Anti-Hallucination', 'Architectural constraint: every BotJob API_CALL endpoint ID validated against live catalog before execution.'],
        ['No Secrets in Exports', 'Secret variables are redacted. API keys never appear in HTML/CSV reports, logs, or HTTP responses.'],
        ['WAL-mode SQLite', 'SQLite with Write-Ahead Logging for concurrent reads. Single-connection, all writes serialized.'],
        ['Docker Isolation', 'API container runs as non-root node user. Web and API containers communicate on internal Docker network only.'],
      ], 'Protection', 'Detail', 24, 76),

      ...spacer(1),
      heading3('Network Architecture'),

      new Table({
        width: { size: 80, type: WidthType.PERCENTAGE },
        rows: [
          ...([
            ['Browser / Desktop App', C.lightOrange, C.orange],
            ['         ↕  HTTPS', C.white, C.white],
            ['nginx reverse proxy  (port 80 / 443)', C.lightSlate, C.indigo],
            ['         ↕  /api/* proxy', C.white, C.white],
            ['ARAPI Sidecar  (127.0.0.1:8787)', C.lightIndigo, C.indigo],
            ['    ├── SQLite database (WAL mode)', C.white, C.white],
            ['    ├── Mock Server (port 8855)', C.white, C.white],
            ['    └── AI provider APIs (outbound)', C.white, C.white],
          ].map(([text, shade, border]) => new TableRow({
            children: [new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text, font: 'Courier New', size: 19, color: C.darkText, bold: shade !== C.white })], alignment: AlignmentType.LEFT })],
              shading: { type: ShadingType.SOLID, color: shade },
              borders: text.includes('├') || text.includes('└') || text.includes('↕')
                ? allNoBorder
                : { left: { style: BorderStyle.SINGLE, size: 8, color: border }, top: noBorder, bottom: noBorder, right: noBorder },
              margins: { top: 50, bottom: 50, left: 200, right: 100 },
            })],
          }))),
        ],
        spacing: { before: 160, after: 200 },
      }),

      // ── S18: API Reference ──
      sectionBanner('18', 'REST API Quick Reference'),

      threeColTable([
        ['GET /catalog/endpoints', 'List all endpoints with category mapping', 'Catalog'],
        ['POST /import/upload', 'Upload files from browser (JSON array of file contents)', 'Catalog'],
        ['POST /import', 'Import from server filesystem path', 'Catalog'],
        ['GET /catalog/export/postman', 'Download Postman Collection JSON', 'Catalog'],
        ['GET /catalog/export/bash', 'Download bash/curl script', 'Catalog'],
        ['GET /taxonomy', 'List 25 categories and subcategories', 'Taxonomy'],
        ['GET /environments', 'List all environments', 'Environments'],
        ['POST /environments', 'Create new environment', 'Environments'],
        ['PUT /environments/{id}', 'Update environment', 'Environments'],
        ['DELETE /environments/{id}', 'Delete environment', 'Environments'],
        ['GET /botjobs', 'List all BotJobs', 'BotJobs'],
        ['POST /botjobs', 'Create new BotJob', 'BotJobs'],
        ['GET /botjobs/{id}', 'Get full BotJob (blocks + commands + variables)', 'BotJobs'],
        ['PUT /botjobs/{id}', 'Save/update complete BotJob', 'BotJobs'],
        ['DELETE /botjobs/{id}', 'Delete BotJob and all its data', 'BotJobs'],
        ['POST /botjobs/{id}/execute', 'Execute BotJob ({ "environmentId": "mock" })', 'BotJobs'],
        ['GET /executions', 'List runs (filter: ?botJobId=)', 'Results'],
        ['GET /executions/{id}/steps', 'Get step results for a run', 'Results'],
        ['GET /executions/{id}/report.html', 'Download HTML report', 'Results'],
        ['GET /executions/{id}/report.csv', 'Download CSV report', 'Results'],
        ['GET /mock/status', 'Mock Server status { running, port }', 'Mock Server'],
        ['POST /mock/start', 'Start Mock Server (seeds from catalog)', 'Mock Server'],
        ['POST /mock/stop', 'Stop Mock Server', 'Mock Server'],
        ['GET /mock/log', 'Get request log entries', 'Mock Server'],
        ['POST /mock/log/clear', 'Clear request log', 'Mock Server'],
        ['GET /settings/ai-providers', 'List providers (keys redacted)', 'Settings'],
        ['POST /settings/ai-providers', 'Create/update provider', 'Settings'],
        ['POST /settings/ai-providers/set-default', 'Set default provider (atomic)', 'Settings'],
        ['POST /settings/ai-providers/test', 'Test provider { "provider": "together" }', 'Settings'],
        ['POST /app-assistant/chat', 'Chat { "messages": [{role, content}] }', 'Bot Builder'],
        ['GET /agents', 'List all AR Conversational agents', 'AR Conversational'],
        ['POST /agents/ask', 'Ask question { question, mode, agentId? }', 'AR Conversational'],
      ], 'Endpoint', 'Description / Body', 'Group', 38, 46, 16),

      ...spacer(2),
      divider(),
      new Paragraph({
        children: [new TextRun({ text: 'ARAPI — No-code API test automation for banking and fintech teams.', font: 'Calibri', size: 20, color: C.medText, italics: true })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 200, after: 200 },
      }),
    ],
  }],
});

const buffer = await Packer.toBuffer(doc);
fs.writeFileSync('/srv/projects/ARWeb-Api-Tester/docs/ARAPI-Manual.docx', buffer);
console.log('✅  ARAPI-Manual.docx written');
