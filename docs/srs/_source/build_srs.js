const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType,
  AlignmentType, HeadingLevel, TableOfContents, PageBreak, Header, Footer, PageNumber,
  LevelFormat, BorderStyle, VerticalAlign, TabStopType
} = require('docx');
const C = require('./srs_content');

const NAVY = '0A1931', GOLD = 'C9A86A', GOLD_D = '8B6F47', CREAM = 'F7F5F0', GREY = '6B7280', LINE = 'D9D4C7';
const FONT = 'Arial';
const PAGE_W = 11906, MARGIN = 1134; // A4, 2cm margins
const CW = PAGE_W - 2 * MARGIN; // 9638

const STATUS = { C: 'Confirmed', P: 'Proposed', R: 'Recommended', T: 'TBC', F: 'Future' };
const STATUS_FILL = { C: 'E3F1E7', P: 'E6ECF7', R: 'F3ECDD', T: 'FBE7D3', F: 'ECECEC' };
const PRIO = { M: 'Must', S: 'Should', C: 'Could', W: 'Won’t' };
const SRC = { V: 'Client vision', CP: 'Client prototype', A: 'Analyst' };
const srcLabel = s => s.split('/').map(x => SRC[x] || x).join(' + ');

// ---------- helpers ----------
const t = (text, o = {}) => new TextRun({ text, font: FONT, ...o });
const p = (text, o = {}) => new Paragraph({ spacing: { after: 120, line: 300 }, ...o, children: Array.isArray(text) ? text : [t(text, o.run || {})] });
const h1 = text => new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: true, children: [t(text)] });
const h2 = text => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [t(text)] });
const h3 = text => new Paragraph({ heading: HeadingLevel.HEADING_3, children: [t(text)] });
const bullet = (text, lvl = 0) => new Paragraph({ numbering: { reference: 'bullets', level: lvl }, spacing: { after: 60, line: 280 }, children: Array.isArray(text) ? text : [t(text)] });
const kv = (k, v) => bullet([t(k + ': ', { bold: true }), t(v)]);

const border = { style: BorderStyle.SINGLE, size: 4, color: LINE };
const borders = { top: border, bottom: border, left: border, right: border };

function cell(content, width, o = {}) {
  const runs = Array.isArray(content) ? content : [t(String(content), { size: o.size || 18, bold: o.bold, color: o.color })];
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders,
    shading: o.fill ? { fill: o.fill, type: ShadingType.CLEAR, color: 'auto' } : undefined,
    margins: { top: 70, bottom: 70, left: 100, right: 100 },
    verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({ alignment: o.align || AlignmentType.LEFT, children: runs })],
  });
}

function table(headers, rows, widths, o = {}) {
  const total = widths.reduce((a, b) => a + b, 0);
  const head = new TableRow({
    tableHeader: true,
    children: headers.map((h, i) => cell(h, widths[i], { bold: true, color: 'FFFFFF', fill: NAVY, size: 18 })),
  });
  const body = rows.map((r, ri) => new TableRow({
    cantSplit: true,
    children: r.map((c, i) => {
      if (c && typeof c === 'object' && !Array.isArray(c) && c.text !== undefined) {
        return cell(c.text, widths[i], { fill: c.fill, bold: c.bold, align: c.align });
      }
      return cell(c, widths[i], { fill: o.zebra && ri % 2 ? 'FAF8F3' : undefined, bold: o.boldFirst && i === 0 });
    }),
  }));
  return new Table({ width: { size: total, type: WidthType.DXA }, columnWidths: widths, rows: [head, ...body] });
}
const gap = () => new Paragraph({ spacing: { after: 120 }, children: [] });

// ---------- content ----------
const today = '29 September 2026';
const children = [];

// Cover
children.push(
  new Paragraph({ spacing: { before: 1800 }, children: [t('رواف', { size: 72, bold: true, color: NAVY })] }),
  new Paragraph({ spacing: { after: 100 }, children: [t('RAWAAF', { size: 28, bold: true, color: GOLD, characterSpacing: 60 })] }),
  new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: GOLD, space: 8 } }, spacing: { after: 400 }, children: [] }),
  new Paragraph({ spacing: { after: 200 }, children: [t('Software Requirements Specification (SRS)', { size: 44, bold: true, color: NAVY })] }),
  new Paragraph({ spacing: { after: 600 }, children: [t('Smart short-stay booking & operations platform — Guest website/app, Owner & Operator dashboard, Field apps, Platform Admin', { size: 24, color: GREY })] }),
  table(['Item', 'Value'], [
    ['Document', 'Software Requirements Specification'],
    ['Product', 'Rawaaf (رواف) — Smart Stay Platform'],
    ['Version', '1.0 — Draft for client review'],
    ['Date', today],
    ['Status', 'For review & sign-off'],
    ['Companion deliverables', 'Clickable UI/UX prototype (prototype/index.html); Product vision presentation (docs/business-experience)'],
  ], [2800, CW - 2800], { boldFirst: true }),
  new Paragraph({ children: [new PageBreak()] }),
);

// Document control
children.push(
  new Paragraph({ heading: HeadingLevel.HEADING_1, children: [t('Document Control')] }),
  h3('Revision history'),
  table(['Version', 'Date', 'Author', 'Changes'], [
    ['0.1', '22 Sep 2026', 'Business Analysis', 'Product vision & business-analysis presentation (Arabic).'],
    ['1.0', today, 'Business Analysis', 'First full SRS. Consolidates client vision + client Rawaaf prototype; adds NFRs, data model, interfaces, open questions.'],
  ], [1100, 1600, 2000, CW - 4700]),
  gap(),
  h3('How to read requirement tags'),
  p('Every requirement carries a Priority, a Status and a Source so that assumptions are never read as decisions.'),
  table(['Tag', 'Values', 'Meaning'], [
    ['Priority (MoSCoW)', 'Must / Should / Could / Won’t', 'Must = required for launch (MVP). Should = important, can follow shortly. Could = nice to have. Won’t = out of current scope.'],
    ['Status', { text: 'Confirmed', fill: STATUS_FILL.C }, 'Stated explicitly by the client (vision or prototype).'],
    ['', { text: 'Proposed', fill: STATUS_FILL.P }, 'Capability proposed by the analyst team to make the product complete.'],
    ['', { text: 'Recommended', fill: STATUS_FILL.R }, 'Enhancement that raises quality or reduces risk (security, compliance, operations).'],
    ['', { text: 'TBC', fill: STATUS_FILL.T }, 'Needs a client decision or information before design — see Section 10.'],
    ['', { text: 'Future', fill: STATUS_FILL.F }, 'Outside initial scope.'],
    ['Source', 'Client vision / Client prototype / Analyst', 'Where the requirement came from, for traceability.'],
  ], [2000, 2800, CW - 4800]),
  new Paragraph({ children: [new PageBreak()] }),
  new Paragraph({ heading: HeadingLevel.HEADING_1, children: [t('Table of Contents')] }),
  new TableOfContents('Table of Contents', { hyperlink: true, headingStyleRange: '1-2' }),
);

// 1 Introduction
children.push(
  h1('1. Introduction'),
  h2('1.1 Purpose'),
  p('This document specifies the functional and non-functional requirements of Rawaaf (رواف), a smart short-stay platform in the Kingdom of Saudi Arabia that combines property booking, smart (keyless) access, property operations and supervision, AI-assisted pricing, a personal guest assistant, loyalty & wallet, KPI dashboards, advertising campaigns and government compliance integrations (SHOMOOS, NAFATH, EWAA).'),
  p('It is the agreed reference for the client, designers, developers and testers. It is written to be approved by the client, and every open decision is listed explicitly in Section 10.'),
  h2('1.2 Scope'),
  p('In scope:'),
  bullet('Guest web experience (responsive), and the same features for a mobile app if confirmed (OQ-BUS-01).'),
  bullet('Owner & Operator dashboard; Supervisor and Photographer field apps (mobile-first web).'),
  bullet('Platform Admin console.'),
  bullet('Integrations: payment gateway, smart-lock provider, SHOMOOS, NAFATH, EWAA, SMS/WhatsApp/e-mail, maps, AI provider, ZATCA e-invoicing.'),
  p('Out of scope for this version: demand forecasting, personalised recommendations, proactive operational insights (Future), channel-manager sync with OTAs (Airbnb/Booking.com) unless requested, and native hardware installation of locks.'),
  h2('1.3 Product vision'),
  p('“The smarter way to operate and experience short-term stays.” Eight systems, one experience:'),
  ...['Property booking', 'Smart access', 'Property operations', 'Supervision', 'Pricing intelligence', 'Compliance integrations', 'Personal assistance', 'Business analytics'].map(x => bullet(x)),
  p('Together they serve three audiences: guests, property owners/operators, and platform management.'),
  h2('1.4 Definitions & acronyms'),
  table(['Term', 'Definition'], C.glossary, [2600, CW - 2600], { boldFirst: true, zebra: true }),
  h2('1.5 References'),
  bullet('Rawaaf product vision & business-analysis presentation — docs/business-experience/index.html (Sep 2026).'),
  bullet('Client prototype “Rawaaf client account” web app — docs/client-reference/ (shared by client via Meta AI).'),
  bullet('Rawaaf clickable UI/UX prototype — prototype/index.html (companion to this SRS).'),
  bullet('ISO/IEC/IEEE 29148:2018 — Requirements engineering (structure reference).'),
  bullet('Saudi Personal Data Protection Law (PDPL) and implementing regulations; ZATCA e-invoicing regulations.'),
);

// 2 Overall description
const modRows = C.modules.map((m, i) => [`3.${i + 1}`, m.code, m.name, m.desc]);
children.push(
  h1('2. Overall Description'),
  h2('2.1 Product perspective'),
  p('Rawaaf is a new, self-contained multi-sided platform. It sits between guests, property owners/operators, a field team, smart locks installed in units, and external government and commercial services. The core data flow is:'),
  p([t('Guest → Booking → Reservation data → Access credential → Smart lock → Property → Operational data → Analytics → KPI dashboard & Pricing assistant', { bold: true, color: NAVY })]),
  p('From reservation data, compliance data flows to SHOMOOS / NAFATH / EWAA (details TBC).'),
  h2('2.2 Product functions (modules)'),
  table(['§', 'Code', 'Module', 'Summary'], modRows, [600, 800, 2600, CW - 4000], { zebra: true }),
  h2('2.3 User classes & characteristics'),
  table(['Role', 'Description', 'Data scope', 'Primary channel'], C.roles, [1700, 3700, 2300, CW - 7700], { boldFirst: true, zebra: true }),
  p('Not every role necessarily needs a separate login (e.g. Photographer) — to be confirmed.', { run: { italics: true, color: GREY, size: 18 } }),
  h2('2.4 Operating models'),
  table(['Aspect', 'Supervised', 'Self-service'], [
    ['Field presence', 'Rawaaf supervisor, photographer, field support', 'None — fully digital'],
    ['Content', 'Professional photography + QA', 'Owner uploads photos; QA by admin'],
    ['Unit readiness', 'Supervisor readiness inspection before each arrival', 'Owner/service provider responsibility (TBC)'],
    ['Arrival', 'Smart access, optional field support', 'Smart access only'],
    ['During stay', 'Field support + personal assistant', 'Personal assistant + remote support'],
    ['After departure', 'Supervisor post-stay inspection with photos', 'Owner/provider inspection (TBC)'],
  ], [2200, 3700, CW - 5900], { boldFirst: true }),
  h2('2.5 Operating environment'),
  bullet('Cloud-hosted, with data residency in Saudi Arabia (recommended: a KSA cloud region).'),
  bullet('Guest: modern mobile & desktop browsers; optional iOS/Android app.'),
  bullet('Field apps: mobile browsers (installable PWA), camera access for photos.'),
  bullet('Smart locks: provider cloud API (Wi-Fi/gateway) and/or Bluetooth with offline codes.'),
  h2('2.6 Design & implementation constraints'),
  bullet('Arabic-first RTL UI following the Rawaaf visual identity supplied by the client (Section 6.1).'),
  bullet('Regulatory: PDPL, ZATCA e-invoicing, CST SMS rules, Ministry of Tourism licensing for short-term rentals, SHOMOOS obligations.'),
  bullet('Payment through a SAMA-licensed gateway; no card data stored by the platform.'),
  bullet('Smart-lock capabilities limited by the chosen provider’s API.'),
  h2('2.7 Assumptions & dependencies'),
  bullet('The client will provide access to government integration channels (SHOMOOS, NAFATH, EWAA) and the related agreements.'),
  bullet('The client will contract a payment gateway, SMS/WhatsApp provider and smart-lock provider.'),
  bullet('Units in the Smart-access programme will have compatible locks installed before go-live.'),
  bullet('Prices, fees, points and cashback figures in the client prototype are treated as confirmed business rules unless changed in Section 10.'),
);

// 3 Functional requirements
children.push(h1('3. Functional Requirements'),
  p('Requirements are grouped by module. IDs follow FR-<MODULE>-<NN> and are stable for traceability to design, prototype screens and test cases.'));
let totals = { all: 0, M: 0, S: 0, C: 0, W: 0, st: { C: 0, P: 0, R: 0, T: 0, F: 0 } };
C.modules.forEach((m, i) => {
  children.push(h2(`3.${i + 1} ${m.name} (${m.code})`), p(m.desc));
  const rows = m.reqs.map((r, j) => {
    totals.all++; totals[r[1]]++; totals.st[r[2]]++;
    return [
      { text: `FR-${m.code}-${String(j + 1).padStart(2, '0')}`, bold: true },
      r[0],
      { text: PRIO[r[1]], align: AlignmentType.CENTER },
      { text: STATUS[r[2]], fill: STATUS_FILL[r[2]], align: AlignmentType.CENTER },
      srcLabel(r[3]),
    ];
  });
  children.push(table(['ID', 'Requirement', 'Priority', 'Status', 'Source'], rows, [1350, CW - 1350 - 850 - 1150 - 1300, 850, 1150, 1300]));
});

// 4 Use cases
children.push(h1('4. Key Use Cases'), p('Main end-to-end scenarios. Detailed screen flows are demonstrated in the clickable prototype.'));
C.useCases.forEach(u => {
  children.push(h3(`${u[0]} — ${u[1]}`),
    table(['Field', 'Description'], [['Actors', u[2]], ['Main flow', u[3]], ['Alternative / exception', u[4]]], [2200, CW - 2200], { boldFirst: true }));
});

// 5 Data
children.push(
  h1('5. Data Requirements'),
  h2('5.1 Core entities'),
  p('Logical data model (indicative; the physical schema is defined in technical design).'),
  table(['Entity', 'Key attributes'], C.entities, [2400, CW - 2400], { boldFirst: true, zebra: true }),
  h2('5.2 State models'),
  table(['Object', 'States & transitions'], C.states, [2400, CW - 2400], { boldFirst: true, zebra: true }),
  h2('5.3 Property profile — five data layers'),
  table(['Layer', 'Fields'], [
    ['Identity', 'Property information · property type · location'],
    ['Content', 'Photos · amenities · description'],
    ['Commercial', 'Availability · pricing · booking status'],
    ['Operations', 'Operational status · supervision type · access settings'],
    ['Governance', 'Policies · guest data · verification documents'],
  ], [2400, CW - 2400], { boldFirst: true }),
);

// 6 Interfaces
const screens = [
  ['Guest website / app', 'Home (hero search, city & type filters, unit grid, compare tray) · Search results · Unit detail (gallery, details, amenities, policies, reviews) · Compare modal · Booking wizard (5 steps incl. Nafath & policy acknowledgement) · Confirmation & digital key · Login / Register with OTP · Account: overview, bookings, favourites, wallet, points & rewards, reviews, settings · Active stay (open door, Wi-Fi, guide, requests, report issue, check-out) · Review · Invoice · Assistant chat · Notifications', '#/  #/search  #/property/:id  #/book/:id  #/account/:tab  #/stay/:id  #/review/:id  #/invoice/:id'],
  ['Owner / Operator dashboard', 'KPI dashboard · Properties list · Property profile (5 layers) · Add-property wizard (9 steps) · Availability calendar · Smart pricing · Bookings list & detail · Smart locks & access events · Operations: task board, incidents, damage cases · Reviews & replies · Payouts · Promotions', '#/operator  …/properties  …/property/:id/:tab  …/add  …/calendar  …/pricing  …/bookings  …/booking/:id  …/locks  …/ops/:tab  …/reviews  …/payouts  …/campaigns'],
  ['Supervisor app', 'Today’s tasks · Task detail with checklist & photos · Mark unit ready · Report incident / damage · Map · Reports · Profile', '#/supervisor  …/task/:id  …/map  …/reports  …/me'],
  ['Photographer app', 'Assigned shoots · Shoot detail & shot list · Upload photos · QA feedback · Earnings · Profile', '#/photographer  …/shoot/:id  …/earnings  …/me'],
  ['Platform Admin console', 'Platform KPIs · Property verification queue · Photo QA · Damage & disputes · Users & roles (permission matrix) · Campaigns · Integrations health · Pricing signals & events · Settings (master data, fees, VAT, policies, loyalty) · Audit log', '#/admin  …/verification  …/photos  …/disputes  …/users  …/campaigns  …/integrations  …/pricing  …/settings  …/audit'],
];
children.push(
  h1('6. External Interface Requirements'),
  h2('6.1 User interface — Rawaaf design system'),
  p('The client supplied a working Rawaaf guest prototype. All portals shall reuse its visual language so the product feels like one brand:'),
  table(['Token', 'Value', 'Usage'], [
    ['Primary / Navy', '#0A1931', 'Text, primary buttons, active nav, dark hero cards'],
    ['Accent / Gold', '#C9A86A (text #8B6F47)', 'Highlights, CTAs on dark, progress, tier badges'],
    ['Background / Cream', '#F7F5F0', 'Page background, input fills, secondary chips'],
    ['Surface', '#FFFFFF, radius 20–24 px, soft shadow', 'Cards, panels, modals'],
    ['Status colours', 'Emerald = confirmed · Navy/Blue = completed · Red = cancelled · Amber = attention', 'Status pills'],
    ['Typography', 'Tajawal 300–800 (Arabic & Latin); heavy 800 headings', 'All text'],
    ['Shape', 'Pill buttons & chips (fully rounded); 64 px sticky blurred header', 'Controls, navigation'],
    ['Direction', 'RTL default, LTR for English', 'Layout'],
  ], [2200, 3400, CW - 5600], { boldFirst: true }),
  p('UX principles: mobile-first; booking in ≤ 5 steps; price transparency before payment (all fees + VAT); status always visible (pills); every destructive action confirmed; empty states with a next action; toasts instead of browser alerts; skeleton loading.'),
  h2('6.2 Screen inventory'),
  p('Each screen below is represented in the clickable prototype (prototype/index.html), which is the UI reference for this SRS.'),
  table(['Portal', 'Screens', 'Prototype routes'], screens, [1900, CW - 1900 - 2900, 2900], { boldFirst: true, zebra: true }),
  p('Open prototype/index.html in a browser; use the floating “Demo” button to switch portals. Guest OTP for the demo is 1234.', { run: { italics: true, color: GREY, size: 18 } }),
  h2('6.3 Hardware interfaces'),
  bullet('Smart locks (keypad PIN, Bluetooth e-key and/or remote unlock via gateway), with battery and connectivity telemetry.'),
  bullet('Mobile device camera for inspection and photography uploads.'),
  h2('6.4 Software interfaces'),
  table(['System', 'Purpose', 'Notes / constraints'], C.interfaces, [2000, 3800, CW - 5800], { boldFirst: true, zebra: true }),
  h2('6.5 Communication interfaces'),
  bullet('HTTPS/TLS 1.2+ REST/JSON APIs; webhooks for payment, lock and integration callbacks (signed and idempotent).'),
  bullet('Push notifications (web push / mobile), SMS, WhatsApp Business, e-mail.'),
);

// 7 NFR
children.push(h1('7. Non-Functional Requirements'),
  table(['Category', 'ID', 'Requirement'], C.nfr, [1700, 1500, CW - 3200], { zebra: true }));

// 8 Business rules
children.push(h1('8. Business Rules'),
  table(['ID', 'Rule', 'Status', 'Source'], C.rules.map((r, i) => [
    { text: `BR-${String(i + 1).padStart(3, '0')}`, bold: true }, r[0], { text: STATUS[r[1]], fill: STATUS_FILL[r[1]], align: AlignmentType.CENTER }, srcLabel(r[2]),
  ]), [1100, CW - 1100 - 1250 - 1500, 1250, 1500]));

// 9 KPIs
children.push(h1('9. KPI Definitions'),
  p('Proposed standard definitions, to be approved with the client. Values are computed only from actual platform data.'),
  table(['KPI', 'Meaning', 'Formula'], C.kpis, [2000, 3200, CW - 5200], { boldFirst: true, zebra: true }),
  p('Analysis dimensions: period · property · property type · city · operating model.'));

// 10 Open questions
children.push(h1('10. Open Questions & Decisions Required'),
  p('These items block detailed design of the related requirements (Status = TBC). Please answer or confirm each one.'),
  table(['ID', 'Area', 'Question', 'Client answer'], C.questions.map((q, i) => [
    { text: `OQ-${q[0]}-${String(C.questions.slice(0, i + 1).filter(x => x[0] === q[0]).length).padStart(2, '0')}`, bold: true }, q[0], q[1], '',
  ]), [1400, 800, CW - 1400 - 800 - 2600, 2600]));

// 11 Release plan
children.push(h1('11. Proposed Release Plan'),
  p('A logical build sequence for discussion — not an agreed timeline.'),
  table(['Phase', 'Content'], C.phases, [2800, CW - 2800], { boldFirst: true, zebra: true }));

// 12 Summary & sign-off
children.push(h1('12. Requirements Summary & Sign-off'),
  table(['Measure', 'Count'], [
    ['Functional requirements', String(totals.all)],
    ['Must / Should / Could', `${totals.M} / ${totals.S} / ${totals.C}`],
    ['Confirmed / Proposed / Recommended / TBC', `${totals.st.C} / ${totals.st.P} / ${totals.st.R} / ${totals.st.T}`],
    ['Non-functional requirements', String(C.nfr.length)],
    ['Business rules', String(C.rules.length)],
    ['Use cases', String(C.useCases.length)],
    ['Open questions', String(C.questions.length)],
  ], [5000, CW - 5000], { boldFirst: true }),
  gap(),
  p('By signing below, the parties confirm that this SRS (with answers to Section 10) is the baseline for design and development. Changes after sign-off follow the change-request process.'),
  table(['Role', 'Name', 'Signature', 'Date'], [
    ['Client — Product owner', '', '', ''],
    ['Client — Business representative', '', '', ''],
    ['Delivery — Business analyst', '', '', ''],
    ['Delivery — Technical lead', '', '', ''],
  ], [3000, 2400, 2400, CW - 7800], { boldFirst: true }),
);

// ---------- document ----------
const doc = new Document({
  creator: 'Business Analysis', title: 'Rawaaf — Software Requirements Specification',
  styles: {
    default: { document: { run: { font: FONT, size: 20, color: '1F2430' } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 34, bold: true, font: FONT, color: NAVY },
        paragraph: { spacing: { before: 0, after: 240 }, outlineLevel: 0, border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: GOLD, space: 6 } } } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 26, bold: true, font: FONT, color: NAVY },
        paragraph: { spacing: { before: 300, after: 140 }, outlineLevel: 1, keepNext: true } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 22, bold: true, font: FONT, color: GOLD_D },
        paragraph: { spacing: { before: 220, after: 100 }, outlineLevel: 2, keepNext: true } },
    ],
  },
  numbering: { config: [{ reference: 'bullets', levels: [
    { level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } } } },
    { level: 1, format: LevelFormat.BULLET, text: '–', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1080, hanging: 270 } } } },
  ] }] },
  features: { updateFields: true },
  sections: [{
    properties: { page: { size: { width: PAGE_W, height: 16838 }, margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN } } },
    headers: { default: new Header({ children: [new Paragraph({
      tabStops: [{ type: TabStopType.RIGHT, position: CW }],
      border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: LINE, space: 4 } },
      children: [t('Rawaaf — SRS v1.0', { size: 16, color: GREY }), t('\tDraft for client review', { size: 16, color: GOLD_D })],
    })] }) },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER,
      children: [t('Page ', { size: 16, color: GREY }), new TextRun({ children: [PageNumber.CURRENT], size: 16, color: GREY, font: FONT }),
        t(' of ', { size: 16, color: GREY }), new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: GREY, font: FONT })] })] }) },
    children,
  }],
});

const out = process.argv[2];
Packer.toBuffer(doc).then(b => { fs.writeFileSync(out, b); console.log('written', out, b.length, JSON.stringify(totals)); });
