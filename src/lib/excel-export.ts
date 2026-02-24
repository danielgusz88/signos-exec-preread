// ═══════════════════════════════════════════════════════════════════════════
// FunnelAI — Excel Export with Live Formulas
// ═══════════════════════════════════════════════════════════════════════════

import ExcelJS from 'exceljs';
import type {
  CurrentModelConfig,
  CurrentSimulationResult,
  BundleConfig,
  BundleSimulationResult,
  SensitivityItem,
} from './simulator';

// ─── Styling Constants ───────────────────────────────────────────────────

const HEADER_FILL: ExcelJS.FillPattern = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
const HEADER_FONT: Partial<ExcelJS.Font> = { bold: true, color: { argb: 'FFF8FAFC' }, size: 11 };
const SUBHEADER_FILL: ExcelJS.FillPattern = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
const SUBHEADER_FONT: Partial<ExcelJS.Font> = { bold: true, color: { argb: 'FFE2E8F0' }, size: 10 };
const SECTION_FILL: ExcelJS.FillPattern = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
const SECTION_FONT: Partial<ExcelJS.Font> = { bold: true, color: { argb: 'FF94A3B8' }, size: 10 };
const FORMULA_FONT: Partial<ExcelJS.Font> = { color: { argb: 'FF3B82F6' }, italic: true };
const POSITIVE_FONT: Partial<ExcelJS.Font> = { color: { argb: 'FF10B981' }, bold: true };
const NEGATIVE_FONT: Partial<ExcelJS.Font> = { color: { argb: 'FFEF4444' }, bold: true };
const BORDER_THIN: Partial<ExcelJS.Borders> = {
  bottom: { style: 'thin', color: { argb: 'FF334155' } },
};

const FMT_CURRENCY = '$#,##0';
const FMT_CURRENCY_DEC = '$#,##0.00';
const FMT_PCT = '0.0%';
const FMT_PCT_WHOLE = '0%';
const FMT_NUMBER = '#,##0';
const FMT_RATIO = '0.0';

// ─── Helpers ─────────────────────────────────────────────────────────────

function autoWidth(ws: ExcelJS.Worksheet) {
  ws.columns.forEach(col => {
    let maxLen = 10;
    col.eachCell?.({ includeEmpty: false }, cell => {
      const len = cell.value ? String(cell.value).length : 0;
      if (len > maxLen) maxLen = len;
    });
    col.width = Math.min(maxLen + 3, 30);
  });
}

function addSectionRow(ws: ExcelJS.Worksheet, text: string, colCount: number) {
  const row = ws.addRow([text]);
  row.font = SECTION_FONT;
  row.fill = SECTION_FILL;
  ws.mergeCells(row.number, 1, row.number, colCount);
  return row;
}

function col(n: number): string {
  // 1 = A, 2 = B, ... 26 = Z, 27 = AA
  let s = '';
  while (n > 0) {
    n--;
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26);
  }
  return s;
}

function triggerDownload(buffer: ExcelJS.Buffer, filename: string) {
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}


// ═══════════════════════════════════════════════════════════════════════════
// CURRENT MODEL EXPORT
// ═══════════════════════════════════════════════════════════════════════════

export async function exportCurrentModelExcel(
  config: CurrentModelConfig,
  result: CurrentSimulationResult,
  sensitivity: SensitivityItem[],
) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'FunnelAI LTV Simulator';
  wb.created = new Date();

  // ═══ Sheet 1: Summary ═══
  const summaryWs = wb.addWorksheet('Summary', { properties: { tabColor: { argb: 'FF3B82F6' } } });
  buildCurrentSummary(summaryWs, config, result);

  // ═══ Sheet 2: LTV Buildup ═══
  const buildupWs = wb.addWorksheet('LTV Buildup', { properties: { tabColor: { argb: 'FF10B981' } } });
  buildCurrentLTVBuildup(buildupWs, config, result);

  // ═══ Sheet 3: Configuration ═══
  const configWs = wb.addWorksheet('Configuration', { properties: { tabColor: { argb: 'FF8B5CF6' } } });
  buildCurrentConfig(configWs, config);

  // ═══ Sheet 4: Monthly Data ═══
  const monthlyWs = wb.addWorksheet('Monthly Data', { properties: { tabColor: { argb: 'FFF59E0B' } } });
  buildCurrentMonthly(monthlyWs, result);

  // ═══ Sheet 5: ARPU by Age ═══
  const arpuWs = wb.addWorksheet('ARPU by Age', { properties: { tabColor: { argb: 'FF06B6D4' } } });
  buildCurrentARPU(arpuWs, result);

  // ═══ Sheet 6: Sensitivity ═══
  const sensWs = wb.addWorksheet('Sensitivity', { properties: { tabColor: { argb: 'FFEF4444' } } });
  buildSensitivity(sensWs, sensitivity);

  const buffer = await wb.xlsx.writeBuffer();
  const date = new Date().toISOString().slice(0, 10);
  triggerDownload(buffer, `Signos_LTV_Current_Model_${date}.xlsx`);
}


function buildCurrentSummary(ws: ExcelJS.Worksheet, config: CurrentModelConfig, result: CurrentSimulationResult) {
  const s = result.summary;

  // Title
  ws.mergeCells('A1:D1');
  const titleRow = ws.getRow(1);
  titleRow.getCell(1).value = `FunnelAI — Current Model Summary (${config.horizon}-Month)`;
  titleRow.getCell(1).font = { bold: true, size: 14, color: { argb: 'FFF8FAFC' } };
  titleRow.getCell(1).fill = HEADER_FILL;
  titleRow.height = 28;

  ws.getRow(2).getCell(1).value = `Generated: ${new Date().toLocaleDateString()} | Scenario: ${config.name}`;
  ws.getRow(2).getCell(1).font = { size: 9, color: { argb: 'FF94A3B8' } };

  let r = 4;

  // Unit Economics
  addSectionRow(ws, 'UNIT ECONOMICS', 4);
  r = ws.rowCount + 1;

  const unitRows: Array<[string, number | string, string, string?]> = [
    ['LTV (Revenue)', result.cohortLTV.revenue, FMT_CURRENCY],
    ['LTV (Gross Profit)', result.cohortLTV.grossProfit, FMT_CURRENCY],
    ['Blended CAC', s.blendedCAC, FMT_CURRENCY],
    ['LTV:CAC Ratio', 0, FMT_RATIO, `=B${r + 1}/B${r + 2}`],  // formula
    ['Payback Period (months)', s.paybackMonths, FMT_NUMBER],
    ['Peak ARPU', s.peakARPU, FMT_CURRENCY],
  ];

  for (const [label, value, fmt, formula] of unitRows) {
    const row = ws.addRow([label, formula ? undefined : value]);
    row.getCell(1).font = { color: { argb: 'FFE2E8F0' } };
    row.getCell(2).numFmt = fmt;
    if (formula) {
      row.getCell(2).value = { formula, result: typeof value === 'number' ? value : 0 } as ExcelJS.CellFormulaValue;
      row.getCell(2).font = FORMULA_FONT;
    }
    row.getCell(2).font = { ...row.getCell(2).font, bold: true };
  }

  ws.addRow([]);
  addSectionRow(ws, 'REVENUE & PROFITABILITY', 4);

  const totalRevRow = ws.rowCount + 1;
  const finRows: Array<[string, number, string]> = [
    ['Total Revenue', s.totalRevenue, FMT_CURRENCY],
    ['Total COGS', s.totalCOGS, FMT_CURRENCY],
    ['Total Gross Profit', s.totalGP, FMT_CURRENCY],
    ['Total Marketing', s.totalMarketing, FMT_CURRENCY],
    ['Total Net Profit', s.totalProfit, FMT_CURRENCY],
  ];

  for (const [label, value, fmt] of finRows) {
    const row = ws.addRow([label, value]);
    row.getCell(1).font = { color: { argb: 'FFE2E8F0' } };
    row.getCell(2).numFmt = fmt;
    row.getCell(2).font = { bold: true };
  }

  // Add formula rows for margins
  const gpRowNum = totalRevRow + 2;
  const revRowNum = totalRevRow;
  const profitRowNum = totalRevRow + 4;

  const marginRow1 = ws.addRow(['Gross Margin %']);
  marginRow1.getCell(1).font = { color: { argb: 'FFE2E8F0' } };
  marginRow1.getCell(2).value = { formula: `=IF(B${revRowNum}>0,B${gpRowNum}/B${revRowNum},0)`, result: s.avgGM / 100 } as ExcelJS.CellFormulaValue;
  marginRow1.getCell(2).numFmt = FMT_PCT;
  marginRow1.getCell(2).font = FORMULA_FONT;

  const marginRow2 = ws.addRow(['Net Margin %']);
  marginRow2.getCell(1).font = { color: { argb: 'FFE2E8F0' } };
  marginRow2.getCell(2).value = { formula: `=IF(B${revRowNum}>0,B${profitRowNum}/B${revRowNum},0)`, result: s.npmPct / 100 } as ExcelJS.CellFormulaValue;
  marginRow2.getCell(2).numFmt = FMT_PCT;
  marginRow2.getCell(2).font = FORMULA_FONT;

  ws.addRow([]);
  addSectionRow(ws, 'CUSTOMERS', 4);

  const custRows: Array<[string, number | string, string]> = [
    ['Total Acquired', s.totalAcquired, FMT_NUMBER],
    [`Month ${config.horizon} Active`, Math.round(s.finalActive), FMT_NUMBER],
    ['Retention Rate', s.retentionRate / 100, FMT_PCT],
    ['On Sustain %', s.sustainPct / 100, FMT_PCT],
  ];

  for (const [label, value, fmt] of custRows) {
    const row = ws.addRow([label, value]);
    row.getCell(1).font = { color: { argb: 'FFE2E8F0' } };
    row.getCell(2).numFmt = fmt;
    row.getCell(2).font = { bold: true };
  }

  ws.getColumn(1).width = 28;
  ws.getColumn(2).width = 18;
}


function buildCurrentLTVBuildup(ws: ExcelJS.Worksheet, config: CurrentModelConfig, result: CurrentSimulationResult) {
  const bu = result.ltvBuildup;

  ws.mergeCells('A1:E1');
  const titleRow = ws.getRow(1);
  titleRow.getCell(1).value = 'LTV Revenue Buildup — Component Decomposition';
  titleRow.getCell(1).font = { bold: true, size: 13, color: { argb: 'FFF8FAFC' } };
  titleRow.getCell(1).fill = HEADER_FILL;
  titleRow.height = 26;

  // Component breakdown
  ws.addRow([]);
  addSectionRow(ws, 'REVENUE COMPONENTS', 5);

  const baseRow = ws.rowCount + 1;
  const componentHeaders = ws.addRow(['Component', 'LTV per Customer', '% of Total', '', 'Formula']);
  componentHeaders.font = SUBHEADER_FONT;
  componentHeaders.fill = SUBHEADER_FILL;

  const compStartRow = ws.rowCount + 1;
  const comps: Array<[string, number]> = [
    ['Base Program Revenue', bu.baseProgramLTV],
    ['Add-on Revenue', bu.addOnLTV],
    ['Sustain Revenue', bu.sustainLTV],
  ];

  for (const [name, val] of comps) {
    const r = ws.addRow([name, val]);
    r.getCell(1).font = { color: { argb: 'FFE2E8F0' } };
    r.getCell(2).numFmt = FMT_CURRENCY_DEC;
    r.getCell(2).font = { bold: true };
  }

  // Add % formulas
  const totalRow = ws.rowCount + 1;
  const totalR = ws.addRow(['Total LTV (Revenue)']);
  totalR.getCell(1).font = { bold: true, color: { argb: 'FFF8FAFC' } };
  totalR.getCell(2).value = { formula: `=SUM(B${compStartRow}:B${compStartRow + 2})`, result: result.cohortLTV.revenue } as ExcelJS.CellFormulaValue;
  totalR.getCell(2).numFmt = FMT_CURRENCY_DEC;
  totalR.getCell(2).font = { ...FORMULA_FONT, bold: true, size: 12 };
  totalR.border = { top: { style: 'medium', color: { argb: 'FF475569' } } };

  // Now add % column formulas
  for (let i = 0; i < 3; i++) {
    const cellRow = compStartRow + i;
    ws.getCell(`C${cellRow}`).value = { formula: `=IF(B$${totalRow}>0,B${cellRow}/B$${totalRow},0)`, result: comps[i][1] / result.cohortLTV.revenue } as ExcelJS.CellFormulaValue;
    ws.getCell(`C${cellRow}`).numFmt = FMT_PCT;
    ws.getCell(`C${cellRow}`).font = FORMULA_FONT;
  }

  ws.getCell(`C${totalRow}`).value = { formula: `=SUM(C${compStartRow}:C${compStartRow + 2})`, result: 1 } as ExcelJS.CellFormulaValue;
  ws.getCell(`C${totalRow}`).numFmt = FMT_PCT_WHOLE;
  ws.getCell(`C${totalRow}`).font = FORMULA_FONT;

  // Add-on breakdown
  ws.addRow([]);
  addSectionRow(ws, 'ADD-ON BREAKDOWN', 5);
  const aoHeaderRow = ws.addRow(['Add-on', 'LTV Contribution', '% of Total LTV']);
  aoHeaderRow.font = SUBHEADER_FONT;
  aoHeaderRow.fill = SUBHEADER_FILL;

  for (const [name, val] of Object.entries(bu.addOnBreakdown)) {
    const r = ws.addRow([name, val]);
    r.getCell(1).font = { color: { argb: 'FFE2E8F0' } };
    r.getCell(2).numFmt = FMT_CURRENCY_DEC;
    const rn = ws.rowCount;
    ws.getCell(`C${rn}`).value = { formula: `=IF(B$${totalRow}>0,B${rn}/B$${totalRow},0)`, result: val / result.cohortLTV.revenue } as ExcelJS.CellFormulaValue;
    ws.getCell(`C${rn}`).numFmt = FMT_PCT;
    ws.getCell(`C${rn}`).font = FORMULA_FONT;
  }

  // Churn impact
  ws.addRow([]);
  addSectionRow(ws, 'CHURN IMPACT', 5);
  const grossRow = ws.addRow(['Gross Potential (0% churn)', bu.grossPotentialLTV]);
  grossRow.getCell(1).font = { color: { argb: 'FFE2E8F0' } };
  grossRow.getCell(2).numFmt = FMT_CURRENCY_DEC;
  grossRow.getCell(2).font = { bold: true };
  const grossRowNum = ws.rowCount;

  const churnRow = ws.addRow(['Lost to Churn']);
  churnRow.getCell(1).font = NEGATIVE_FONT;
  churnRow.getCell(2).value = { formula: `=B${grossRowNum}-B${totalRow}`, result: bu.churnImpactLTV } as ExcelJS.CellFormulaValue;
  churnRow.getCell(2).numFmt = FMT_CURRENCY_DEC;
  churnRow.getCell(2).font = { ...NEGATIVE_FONT, ...FORMULA_FONT };
  const churnRowNum = ws.rowCount;

  const churnPctRow = ws.addRow(['Churn Impact %']);
  churnPctRow.getCell(1).font = NEGATIVE_FONT;
  churnPctRow.getCell(2).value = { formula: `=IF(B${grossRowNum}>0,B${churnRowNum}/B${grossRowNum},0)`, result: bu.grossPotentialLTV > 0 ? bu.churnImpactLTV / bu.grossPotentialLTV : 0 } as ExcelJS.CellFormulaValue;
  churnPctRow.getCell(2).numFmt = FMT_PCT;
  churnPctRow.getCell(2).font = { ...NEGATIVE_FONT, ...FORMULA_FONT };

  // Monthly accumulation
  ws.addRow([]);
  addSectionRow(ws, 'CUMULATIVE LTV BY CUSTOMER AGE', 5);
  const accHeaderRow = ws.addRow(['Month', 'Cumulative LTV', 'Base Program', 'Add-ons', 'Sustain', 'Survival Rate']);
  accHeaderRow.font = SUBHEADER_FONT;
  accHeaderRow.fill = SUBHEADER_FILL;

  for (const pt of bu.monthlyAccumulation) {
    const r = ws.addRow([pt.age, pt.cumulativeLTV, pt.cumulativeBase, pt.cumulativeAddOn, pt.cumulativeSustain, pt.survivalRate]);
    r.getCell(2).numFmt = FMT_CURRENCY_DEC;
    r.getCell(3).numFmt = FMT_CURRENCY_DEC;
    r.getCell(4).numFmt = FMT_CURRENCY_DEC;
    r.getCell(5).numFmt = FMT_CURRENCY_DEC;
    r.getCell(6).numFmt = FMT_PCT;
  }

  autoWidth(ws);
  ws.getColumn(1).width = 30;
}


function buildCurrentConfig(ws: ExcelJS.Worksheet, config: CurrentModelConfig) {
  ws.mergeCells('A1:H1');
  const titleRow = ws.getRow(1);
  titleRow.getCell(1).value = 'Configuration — Input Parameters';
  titleRow.getCell(1).font = { bold: true, size: 13, color: { argb: 'FFF8FAFC' } };
  titleRow.getCell(1).fill = HEADER_FILL;
  titleRow.height = 26;

  ws.addRow([]);
  addSectionRow(ws, 'ENTRY PROGRAMS', 8);

  const progHeaders = ws.addRow(['Program', 'Price/mo', 'COGS/mo', 'Margin', 'Early Churn/mo', 'Mid Churn/mo', 'Late Churn/mo', 'Mix %']);
  progHeaders.font = SUBHEADER_FONT;
  progHeaders.fill = SUBHEADER_FILL;

  for (const p of config.programs) {
    const r = ws.addRow([p.name, p.price, p.cogs, null, p.earlyChurn, p.midChurn, p.lateChurn, p.mixPct]);
    r.getCell(2).numFmt = FMT_CURRENCY;
    r.getCell(3).numFmt = FMT_CURRENCY;
    const rn = ws.rowCount;
    r.getCell(4).value = { formula: `=1-C${rn}/B${rn}`, result: 1 - p.cogs / p.price } as ExcelJS.CellFormulaValue;
    r.getCell(4).numFmt = FMT_PCT;
    r.getCell(4).font = FORMULA_FONT;
    r.getCell(5).numFmt = FMT_PCT;
    r.getCell(6).numFmt = FMT_PCT;
    r.getCell(7).numFmt = FMT_PCT;
    r.getCell(8).numFmt = FMT_PCT_WHOLE;
  }

  ws.addRow([]);
  addSectionRow(ws, 'À LA CARTE ADD-ONS', 8);

  const aoHeaders = ws.addRow(['Add-on', 'Price/mo', 'COGS/mo', 'Margin', 'Max Attach Rate', 'Ramp (months)', 'Delay (months)']);
  aoHeaders.font = SUBHEADER_FONT;
  aoHeaders.fill = SUBHEADER_FILL;

  for (const a of config.addOns) {
    const r = ws.addRow([a.name, a.price, a.cogs, null, a.maxAttachRate, a.rampMonths, a.attachDelay]);
    r.getCell(2).numFmt = FMT_CURRENCY;
    r.getCell(3).numFmt = FMT_CURRENCY;
    const rn = ws.rowCount;
    r.getCell(4).value = { formula: `=1-C${rn}/B${rn}`, result: 1 - a.cogs / a.price } as ExcelJS.CellFormulaValue;
    r.getCell(4).numFmt = FMT_PCT;
    r.getCell(4).font = FORMULA_FONT;
    r.getCell(5).numFmt = FMT_PCT;
  }

  ws.addRow([]);
  addSectionRow(ws, 'SUSTAIN PLAN', 8);

  const susHeaders = ws.addRow(['Parameter', 'Value']);
  susHeaders.font = SUBHEADER_FONT;
  susHeaders.fill = SUBHEADER_FILL;

  const susRows: Array<[string, number, string]> = [
    ['Price/mo', config.sustain.price, FMT_CURRENCY],
    ['COGS/mo', config.sustain.cogs, FMT_CURRENCY],
    ['Transition Rate/mo', config.sustain.transitionRate, FMT_PCT],
    ['Transition Delay (months)', config.sustain.transitionDelay, FMT_NUMBER],
    ['Sustain Churn/mo', config.sustain.churnRate, FMT_PCT],
  ];

  for (const [label, value, fmt] of susRows) {
    const r = ws.addRow([label, value]);
    r.getCell(2).numFmt = fmt;
  }

  ws.addRow([]);
  addSectionRow(ws, 'ACQUISITION & ECONOMICS', 8);

  const acqHeaders = ws.addRow(['Parameter', 'Value']);
  acqHeaders.font = SUBHEADER_FONT;
  acqHeaders.fill = SUBHEADER_FILL;

  const acqRows: Array<[string, number, string]> = [
    ['Monthly Acq. Start', config.monthlyAcqStart, FMT_NUMBER],
    ['Monthly Acq. End', config.monthlyAcqEnd, FMT_NUMBER],
    ['Ramp Months', config.rampMonths, FMT_NUMBER],
    ['Blended CAC', config.blendedCAC, FMT_CURRENCY],
    ['CAC Inflation/yr', config.cacInflationPct / 100, FMT_PCT],
    ['Horizon (months)', config.horizon, FMT_NUMBER],
  ];

  for (const [label, value, fmt] of acqRows) {
    const r = ws.addRow([label, value]);
    r.getCell(2).numFmt = fmt;
  }

  autoWidth(ws);
}


function buildCurrentMonthly(ws: ExcelJS.Worksheet, result: CurrentSimulationResult) {
  ws.mergeCells('A1:O1');
  const titleRow = ws.getRow(1);
  titleRow.getCell(1).value = 'Monthly Simulation Data — with Live Formulas';
  titleRow.getCell(1).font = { bold: true, size: 13, color: { argb: 'FFF8FAFC' } };
  titleRow.getCell(1).fill = HEADER_FILL;
  titleRow.height = 26;

  // Headers
  // A=Month, B=New Cust, C=Active, D=On Program, E=On Sustain
  // F=Revenue, G=Program Rev, H=Add-on Rev, I=Sustain Rev
  // J=COGS, K=Gross Profit (formula), L=Marketing
  // M=Contribution (formula), N=GM% (formula), O=CM% (formula)
  // P=Cum Revenue (formula), Q=Cum COGS (formula), R=Cum Marketing (formula), S=Cum Profit (formula)
  // T=ARPU (formula)
  const headers = [
    'Month', 'New Customers', 'Total Active', 'On Program', 'On Sustain',
    'Total Revenue', 'Program Rev', 'Add-on Rev', 'Sustain Rev',
    'COGS', 'Gross Profit', 'Marketing',
    'Contribution', 'GM %', 'CM %',
    'Cum Revenue', 'Cum COGS', 'Cum Marketing', 'Cum Profit',
    'Blended ARPU',
  ];

  const headerRow = ws.addRow(headers);
  headerRow.font = SUBHEADER_FONT;
  headerRow.fill = SUBHEADER_FILL;
  headerRow.border = BORDER_THIN;

  const dataStartRow = 3; // row 3 is first data row

  for (let i = 0; i < result.months.length; i++) {
    const m = result.months[i];
    const rn = dataStartRow + i;
    const row = ws.addRow([
      m.month,
      m.newCustomers,
      m.totalActive,
      m.totalOnProgram,
      m.totalOnSustain,
      m.totalRevenue,         // F: Revenue
      m.programRevenue,       // G: Program Rev
      m.addOnRevenue,         // H: Add-on Rev
      m.sustainRevenue,       // I: Sustain Rev
      m.totalCOGS,            // J: COGS
      null,                   // K: GP formula
      m.marketing,            // L: Marketing
      null,                   // M: Contribution formula
      null,                   // N: GM% formula
      null,                   // O: CM% formula
      null,                   // P: Cum Rev formula
      null,                   // Q: Cum COGS formula
      null,                   // R: Cum Marketing formula
      null,                   // S: Cum Profit formula
      null,                   // T: ARPU formula
    ]);

    // Live formulas
    row.getCell(11).value = { formula: `=F${rn}-J${rn}`, result: m.totalGP } as ExcelJS.CellFormulaValue;
    row.getCell(13).value = { formula: `=K${rn}-L${rn}`, result: m.contribution } as ExcelJS.CellFormulaValue;
    row.getCell(14).value = { formula: `=IF(F${rn}>0,K${rn}/F${rn},0)`, result: m.gmPct / 100 } as ExcelJS.CellFormulaValue;
    row.getCell(15).value = { formula: `=IF(F${rn}>0,M${rn}/F${rn},0)`, result: m.cmPct / 100 } as ExcelJS.CellFormulaValue;
    row.getCell(16).value = { formula: `=SUM(F$${dataStartRow}:F${rn})`, result: m.cumRevenue } as ExcelJS.CellFormulaValue;
    row.getCell(17).value = { formula: `=SUM(J$${dataStartRow}:J${rn})`, result: m.cumCOGS } as ExcelJS.CellFormulaValue;
    row.getCell(18).value = { formula: `=SUM(L$${dataStartRow}:L${rn})`, result: m.cumMarketing } as ExcelJS.CellFormulaValue;
    row.getCell(19).value = { formula: `=SUM(M$${dataStartRow}:M${rn})`, result: m.cumProfit } as ExcelJS.CellFormulaValue;
    row.getCell(20).value = { formula: `=IF(C${rn}>0,F${rn}/C${rn},0)`, result: m.blendedARPU } as ExcelJS.CellFormulaValue;

    // Formatting
    row.getCell(2).numFmt = FMT_NUMBER;
    row.getCell(3).numFmt = FMT_NUMBER;
    row.getCell(4).numFmt = FMT_NUMBER;
    row.getCell(5).numFmt = FMT_NUMBER;
    for (let c = 6; c <= 13; c++) row.getCell(c).numFmt = FMT_CURRENCY;
    row.getCell(14).numFmt = FMT_PCT;
    row.getCell(15).numFmt = FMT_PCT;
    for (let c = 16; c <= 19; c++) row.getCell(c).numFmt = FMT_CURRENCY;
    row.getCell(20).numFmt = FMT_CURRENCY_DEC;

    // Mark formula cells
    for (const c of [11, 13, 14, 15, 16, 17, 18, 19, 20]) {
      row.getCell(c).font = FORMULA_FONT;
    }
  }

  // Totals row with formulas
  const lastDataRow = dataStartRow + result.months.length - 1;
  ws.addRow([]); // spacer
  const totRow = ws.addRow([
    'TOTAL', null, null, null, null,
    null, null, null, null, null, null, null, null, null, null,
    null, null, null, null,
  ]);
  const totRn = ws.rowCount;
  totRow.font = { bold: true, color: { argb: 'FFF8FAFC' } };
  totRow.fill = SUBHEADER_FILL;

  totRow.getCell(2).value = { formula: `=SUM(B${dataStartRow}:B${lastDataRow})`, result: result.summary.totalAcquired } as ExcelJS.CellFormulaValue;
  totRow.getCell(6).value = { formula: `=SUM(F${dataStartRow}:F${lastDataRow})`, result: result.summary.totalRevenue } as ExcelJS.CellFormulaValue;
  totRow.getCell(7).value = { formula: `=SUM(G${dataStartRow}:G${lastDataRow})`, result: result.months.reduce((s, m) => s + m.programRevenue, 0) } as ExcelJS.CellFormulaValue;
  totRow.getCell(8).value = { formula: `=SUM(H${dataStartRow}:H${lastDataRow})`, result: result.months.reduce((s, m) => s + m.addOnRevenue, 0) } as ExcelJS.CellFormulaValue;
  totRow.getCell(9).value = { formula: `=SUM(I${dataStartRow}:I${lastDataRow})`, result: result.months.reduce((s, m) => s + m.sustainRevenue, 0) } as ExcelJS.CellFormulaValue;
  totRow.getCell(10).value = { formula: `=SUM(J${dataStartRow}:J${lastDataRow})`, result: result.summary.totalCOGS } as ExcelJS.CellFormulaValue;
  totRow.getCell(11).value = { formula: `=F${totRn}-J${totRn}`, result: result.summary.totalGP } as ExcelJS.CellFormulaValue;
  totRow.getCell(12).value = { formula: `=SUM(L${dataStartRow}:L${lastDataRow})`, result: result.summary.totalMarketing } as ExcelJS.CellFormulaValue;
  totRow.getCell(13).value = { formula: `=K${totRn}-L${totRn}`, result: result.summary.totalProfit } as ExcelJS.CellFormulaValue;
  totRow.getCell(14).value = { formula: `=IF(F${totRn}>0,K${totRn}/F${totRn},0)`, result: result.summary.avgGM / 100 } as ExcelJS.CellFormulaValue;
  totRow.getCell(15).value = { formula: `=IF(F${totRn}>0,M${totRn}/F${totRn},0)`, result: result.summary.npmPct / 100 } as ExcelJS.CellFormulaValue;

  totRow.getCell(2).numFmt = FMT_NUMBER;
  for (let c = 6; c <= 13; c++) totRow.getCell(c).numFmt = FMT_CURRENCY;
  totRow.getCell(14).numFmt = FMT_PCT;
  totRow.getCell(15).numFmt = FMT_PCT;

  autoWidth(ws);
  ws.views = [{ state: 'frozen', xSplit: 1, ySplit: 2 }];
}


function buildCurrentARPU(ws: ExcelJS.Worksheet, result: CurrentSimulationResult) {
  ws.mergeCells('A1:F1');
  const titleRow = ws.getRow(1);
  titleRow.getCell(1).value = 'ARPU by Customer Age';
  titleRow.getCell(1).font = { bold: true, size: 13, color: { argb: 'FFF8FAFC' } };
  titleRow.getCell(1).fill = HEADER_FILL;
  titleRow.height = 26;

  const headerRow = ws.addRow(['Customer Age (mo)', 'Total ARPU', 'Base ARPU', 'Add-on ARPU', 'Sustain ARPU', 'ARPU Check']);
  headerRow.font = SUBHEADER_FONT;
  headerRow.fill = SUBHEADER_FILL;

  const startRow = 3;
  for (let i = 0; i < result.arpuByAge.length; i++) {
    const a = result.arpuByAge[i];
    const rn = startRow + i;
    const row = ws.addRow([a.age, a.arpu, a.baseArpu, a.addOnArpu, a.sustainArpu]);
    row.getCell(2).numFmt = FMT_CURRENCY_DEC;
    row.getCell(3).numFmt = FMT_CURRENCY_DEC;
    row.getCell(4).numFmt = FMT_CURRENCY_DEC;
    row.getCell(5).numFmt = FMT_CURRENCY_DEC;

    // Formula: sum of components should equal total
    row.getCell(6).value = { formula: `=C${rn}+D${rn}+E${rn}`, result: a.baseArpu + a.addOnArpu + a.sustainArpu } as ExcelJS.CellFormulaValue;
    row.getCell(6).numFmt = FMT_CURRENCY_DEC;
    row.getCell(6).font = FORMULA_FONT;
  }

  autoWidth(ws);
  ws.views = [{ state: 'frozen', xSplit: 1, ySplit: 2 }];
}


// ═══════════════════════════════════════════════════════════════════════════
// BUNDLE MODEL EXPORT
// ═══════════════════════════════════════════════════════════════════════════

export async function exportBundleModelExcel(
  config: BundleConfig,
  result: BundleSimulationResult,
  sensitivity: SensitivityItem[],
) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'FunnelAI LTV Simulator';
  wb.created = new Date();

  const summaryWs = wb.addWorksheet('Summary', { properties: { tabColor: { argb: 'FF8B5CF6' } } });
  buildBundleSummary(summaryWs, config, result);

  const buildupWs = wb.addWorksheet('LTV Buildup', { properties: { tabColor: { argb: 'FF10B981' } } });
  buildBundleLTVBuildup(buildupWs, config, result);

  const configWs = wb.addWorksheet('Configuration', { properties: { tabColor: { argb: 'FF3B82F6' } } });
  buildBundleConfig(configWs, config);

  const monthlyWs = wb.addWorksheet('Monthly Data', { properties: { tabColor: { argb: 'FFF59E0B' } } });
  buildBundleMonthly(monthlyWs, config, result);

  const sensWs = wb.addWorksheet('Sensitivity', { properties: { tabColor: { argb: 'FFEF4444' } } });
  buildSensitivity(sensWs, sensitivity);

  const buffer = await wb.xlsx.writeBuffer();
  const date = new Date().toISOString().slice(0, 10);
  triggerDownload(buffer, `Signos_LTV_Bundle_Model_${date}.xlsx`);
}


function buildBundleSummary(ws: ExcelJS.Worksheet, config: BundleConfig, result: BundleSimulationResult) {
  const s = result.summary;

  ws.mergeCells('A1:D1');
  const titleRow = ws.getRow(1);
  titleRow.getCell(1).value = `FunnelAI — Bundle Model Summary (${config.horizon}-Month)`;
  titleRow.getCell(1).font = { bold: true, size: 14, color: { argb: 'FFF8FAFC' } };
  titleRow.getCell(1).fill = HEADER_FILL;
  titleRow.height = 28;

  ws.getRow(2).getCell(1).value = `Generated: ${new Date().toLocaleDateString()} | Scenario: ${config.name}`;
  ws.getRow(2).getCell(1).font = { size: 9, color: { argb: 'FF94A3B8' } };

  addSectionRow(ws, 'UNIT ECONOMICS', 4);
  const ueStart = ws.rowCount + 1;

  const unitRows: Array<[string, number, string]> = [
    ['LTV (Revenue)', result.cohortLTV.revenue, FMT_CURRENCY],
    ['LTV (Gross Profit)', result.cohortLTV.grossProfit, FMT_CURRENCY],
    ['Blended CAC', s.blendedCAC, FMT_CURRENCY],
  ];

  for (const [label, value, fmt] of unitRows) {
    const r = ws.addRow([label, value]);
    r.getCell(1).font = { color: { argb: 'FFE2E8F0' } };
    r.getCell(2).numFmt = fmt;
    r.getCell(2).font = { bold: true };
  }

  const ratioRow = ws.addRow(['LTV:CAC Ratio']);
  ratioRow.getCell(1).font = { color: { argb: 'FFE2E8F0' } };
  ratioRow.getCell(2).value = { formula: `=B${ueStart + 1}/B${ueStart + 2}`, result: s.ltvCacRatio } as ExcelJS.CellFormulaValue;
  ratioRow.getCell(2).numFmt = FMT_RATIO;
  ratioRow.getCell(2).font = { ...FORMULA_FONT, bold: true };

  ws.addRow(['Payback Period (months)', s.paybackMonths]).getCell(2).numFmt = FMT_NUMBER;

  ws.addRow([]);
  addSectionRow(ws, 'REVENUE & PROFITABILITY', 4);

  const revStart = ws.rowCount + 1;
  const finRows: Array<[string, number, string]> = [
    ['Total Revenue', s.totalRevenue, FMT_CURRENCY],
    ['Total COGS', s.totalCOGS, FMT_CURRENCY],
    ['Total Gross Profit', s.totalGP, FMT_CURRENCY],
    ['Total Marketing', s.totalMarketing, FMT_CURRENCY],
    ['Total Net Profit', s.totalProfit, FMT_CURRENCY],
  ];

  for (const [label, value, fmt] of finRows) {
    const r = ws.addRow([label, value]);
    r.getCell(1).font = { color: { argb: 'FFE2E8F0' } };
    r.getCell(2).numFmt = fmt;
    r.getCell(2).font = { bold: true };
  }

  const gmRow = ws.addRow(['Gross Margin %']);
  gmRow.getCell(1).font = { color: { argb: 'FFE2E8F0' } };
  gmRow.getCell(2).value = { formula: `=IF(B${revStart}>0,B${revStart + 2}/B${revStart},0)`, result: s.avgGM / 100 } as ExcelJS.CellFormulaValue;
  gmRow.getCell(2).numFmt = FMT_PCT;
  gmRow.getCell(2).font = FORMULA_FONT;

  ws.addRow([]);
  addSectionRow(ws, 'CUSTOMERS', 4);

  const custRows: Array<[string, number | string, string]> = [
    ['Total Acquired', s.totalAcquired, FMT_NUMBER],
    [`Month ${config.horizon} Active`, s.finalActive, FMT_NUMBER],
    ['Retention Rate', s.retentionRate / 100, FMT_PCT],
  ];

  for (const [label, value, fmt] of custRows) {
    const r = ws.addRow([label, value]);
    r.getCell(1).font = { color: { argb: 'FFE2E8F0' } };
    r.getCell(2).numFmt = fmt;
    r.getCell(2).font = { bold: true };
  }

  ws.getColumn(1).width = 28;
  ws.getColumn(2).width = 18;
}


function buildBundleLTVBuildup(ws: ExcelJS.Worksheet, config: BundleConfig, result: BundleSimulationResult) {
  const bu = result.ltvBuildup;

  ws.mergeCells('A1:E1');
  const titleRow = ws.getRow(1);
  titleRow.getCell(1).value = 'LTV Revenue Buildup — Tier Decomposition';
  titleRow.getCell(1).font = { bold: true, size: 13, color: { argb: 'FFF8FAFC' } };
  titleRow.getCell(1).fill = HEADER_FILL;
  titleRow.height = 26;

  ws.addRow([]);
  addSectionRow(ws, 'WEIGHTED TIER CONTRIBUTION TO LTV', 5);

  const tierHeaders = ws.addRow(['Tier', 'Weighted LTV Contribution', '% of Total', 'Mix %', 'Per-Customer LTV']);
  tierHeaders.font = SUBHEADER_FONT;
  tierHeaders.fill = SUBHEADER_FILL;

  const tierStartRow = ws.rowCount + 1;
  for (const tier of config.tiers) {
    const tierLTV = bu.byTierLTV[tier.name] || 0;
    const perCust = result.tierCohortLTV[tier.name];
    const r = ws.addRow([tier.name, tierLTV, null, tier.mixPct, perCust?.revenue || 0]);
    r.getCell(2).numFmt = FMT_CURRENCY_DEC;
    r.getCell(4).numFmt = FMT_PCT_WHOLE;
    r.getCell(5).numFmt = FMT_CURRENCY_DEC;
  }

  const totalRow = ws.rowCount + 1;
  const totR = ws.addRow(['Total LTV (Revenue)']);
  totR.getCell(1).font = { bold: true, color: { argb: 'FFF8FAFC' } };
  totR.getCell(2).value = { formula: `=SUM(B${tierStartRow}:B${tierStartRow + config.tiers.length - 1})`, result: result.cohortLTV.revenue } as ExcelJS.CellFormulaValue;
  totR.getCell(2).numFmt = FMT_CURRENCY_DEC;
  totR.getCell(2).font = { ...FORMULA_FONT, bold: true, size: 12 };
  totR.border = { top: { style: 'medium', color: { argb: 'FF475569' } } };

  // % formulas
  for (let i = 0; i < config.tiers.length; i++) {
    const rn = tierStartRow + i;
    const tierLTV = bu.byTierLTV[config.tiers[i].name] || 0;
    ws.getCell(`C${rn}`).value = { formula: `=IF(B$${totalRow}>0,B${rn}/B$${totalRow},0)`, result: result.cohortLTV.revenue > 0 ? tierLTV / result.cohortLTV.revenue : 0 } as ExcelJS.CellFormulaValue;
    ws.getCell(`C${rn}`).numFmt = FMT_PCT;
    ws.getCell(`C${rn}`).font = FORMULA_FONT;
  }

  ws.getCell(`C${totalRow}`).value = { formula: `=SUM(C${tierStartRow}:C${tierStartRow + config.tiers.length - 1})`, result: 1 } as ExcelJS.CellFormulaValue;
  ws.getCell(`C${totalRow}`).numFmt = FMT_PCT_WHOLE;
  ws.getCell(`C${totalRow}`).font = FORMULA_FONT;

  // Churn impact
  ws.addRow([]);
  addSectionRow(ws, 'CHURN IMPACT', 5);

  const grossRow = ws.addRow(['Gross Potential (0% churn)', bu.grossPotentialLTV]);
  grossRow.getCell(2).numFmt = FMT_CURRENCY_DEC;
  grossRow.getCell(2).font = { bold: true };
  const grossRowNum = ws.rowCount;

  const churnRow = ws.addRow(['Lost to Churn']);
  churnRow.getCell(1).font = NEGATIVE_FONT;
  churnRow.getCell(2).value = { formula: `=B${grossRowNum}-B${totalRow}`, result: bu.churnImpactLTV } as ExcelJS.CellFormulaValue;
  churnRow.getCell(2).numFmt = FMT_CURRENCY_DEC;
  churnRow.getCell(2).font = { ...NEGATIVE_FONT, ...FORMULA_FONT };
  const churnRowNum = ws.rowCount;

  const churnPctRow = ws.addRow(['Churn Impact %']);
  churnPctRow.getCell(1).font = NEGATIVE_FONT;
  churnPctRow.getCell(2).value = { formula: `=IF(B${grossRowNum}>0,B${churnRowNum}/B${grossRowNum},0)`, result: bu.grossPotentialLTV > 0 ? bu.churnImpactLTV / bu.grossPotentialLTV : 0 } as ExcelJS.CellFormulaValue;
  churnPctRow.getCell(2).numFmt = FMT_PCT;
  churnPctRow.getCell(2).font = { ...NEGATIVE_FONT, ...FORMULA_FONT };

  // Monthly accumulation
  ws.addRow([]);
  addSectionRow(ws, 'CUMULATIVE LTV BY CUSTOMER AGE', 5);
  const accHeader = ws.addRow(['Month', 'Cumulative LTV', 'Survival Rate']);
  accHeader.font = SUBHEADER_FONT;
  accHeader.fill = SUBHEADER_FILL;

  for (const pt of bu.monthlyAccumulation) {
    const r = ws.addRow([pt.age, pt.cumulativeLTV, pt.survivalRate]);
    r.getCell(2).numFmt = FMT_CURRENCY_DEC;
    r.getCell(3).numFmt = FMT_PCT;
  }

  autoWidth(ws);
  ws.getColumn(1).width = 30;
}


function buildBundleConfig(ws: ExcelJS.Worksheet, config: BundleConfig) {
  ws.mergeCells('A1:G1');
  const titleRow = ws.getRow(1);
  titleRow.getCell(1).value = 'Configuration — Bundle Tier Parameters';
  titleRow.getCell(1).font = { bold: true, size: 13, color: { argb: 'FFF8FAFC' } };
  titleRow.getCell(1).fill = HEADER_FILL;
  titleRow.height = 26;

  ws.addRow([]);
  addSectionRow(ws, 'TIER PRICING & COSTS', 7);

  const tierHeaders = ws.addRow(['Tier', 'Price/mo', 'COGS/mo', 'Margin', 'Churn/mo', 'Mix %']);
  tierHeaders.font = SUBHEADER_FONT;
  tierHeaders.fill = SUBHEADER_FILL;

  for (const t of config.tiers) {
    const r = ws.addRow([t.name, t.price, t.cogs, null, t.churnRate, t.mixPct]);
    r.getCell(2).numFmt = FMT_CURRENCY;
    r.getCell(3).numFmt = FMT_CURRENCY;
    const rn = ws.rowCount;
    r.getCell(4).value = { formula: `=1-C${rn}/B${rn}`, result: 1 - t.cogs / t.price } as ExcelJS.CellFormulaValue;
    r.getCell(4).numFmt = FMT_PCT;
    r.getCell(4).font = FORMULA_FONT;
    r.getCell(5).numFmt = FMT_PCT;
    r.getCell(6).numFmt = FMT_PCT_WHOLE;
  }

  ws.addRow([]);
  addSectionRow(ws, 'ACQUISITION & ECONOMICS', 7);

  const acqHeaders = ws.addRow(['Parameter', 'Value']);
  acqHeaders.font = SUBHEADER_FONT;
  acqHeaders.fill = SUBHEADER_FILL;

  const acqRows: Array<[string, number, string]> = [
    ['Monthly Acq. Start', config.monthlyAcqStart, FMT_NUMBER],
    ['Monthly Acq. End', config.monthlyAcqEnd, FMT_NUMBER],
    ['Ramp Months', config.rampMonths, FMT_NUMBER],
    ['Blended CAC', config.blendedCAC, FMT_CURRENCY],
    ['CAC Inflation/yr', config.cacInflationPct / 100, FMT_PCT],
    ['Upgrade Rate/mo (F→C)', config.upgradeRate, FMT_PCT],
    ['Upgrade Delay (months)', config.upgradeDelay, FMT_NUMBER],
    ['Horizon (months)', config.horizon, FMT_NUMBER],
  ];

  for (const [label, value, fmt] of acqRows) {
    const r = ws.addRow([label, value]);
    r.getCell(2).numFmt = fmt;
  }

  autoWidth(ws);
}


function buildBundleMonthly(ws: ExcelJS.Worksheet, config: BundleConfig, result: BundleSimulationResult) {
  // Dynamic columns based on tier count
  const tierNames = config.tiers.map(t => t.name);

  ws.mergeCells('A1:P1');
  const titleRow = ws.getRow(1);
  titleRow.getCell(1).value = 'Monthly Simulation Data — with Live Formulas';
  titleRow.getCell(1).font = { bold: true, size: 13, color: { argb: 'FFF8FAFC' } };
  titleRow.getCell(1).fill = HEADER_FILL;
  titleRow.height = 26;

  // Headers: Month, New, ...per-tier active, Total Active, Revenue, COGS, GP, Marketing, Contribution, GM%, CM%, CumRev, CumCOGS, CumMktg, CumProfit
  const headers = [
    'Month', 'New Customers',
    ...tierNames.map(n => `${n} Active`),
    'Total Active',
    'Revenue', 'COGS', 'Gross Profit', 'Marketing',
    'Contribution', 'GM %', 'CM %',
    'Cum Revenue', 'Cum COGS', 'Cum Marketing', 'Cum Profit',
  ];

  const headerRow = ws.addRow(headers);
  headerRow.font = SUBHEADER_FONT;
  headerRow.fill = SUBHEADER_FILL;

  const dataStartRow = 3;
  const tierCount = tierNames.length;
  // Column indices (1-based):
  const COL_MONTH = 1;
  const COL_NEW = 2;
  const COL_TIER_START = 3;
  const COL_TOTAL_ACTIVE = COL_TIER_START + tierCount;
  const COL_REV = COL_TOTAL_ACTIVE + 1;
  const COL_COGS = COL_REV + 1;
  const COL_GP = COL_COGS + 1;
  const COL_MKTG = COL_GP + 1;
  const COL_CONTRIB = COL_MKTG + 1;
  const COL_GM = COL_CONTRIB + 1;
  const COL_CM = COL_GM + 1;
  const COL_CUMREV = COL_CM + 1;
  const COL_CUMCOGS = COL_CUMREV + 1;
  const COL_CUMMKTG = COL_CUMCOGS + 1;
  const COL_CUMPROFIT = COL_CUMMKTG + 1;

  for (let i = 0; i < result.months.length; i++) {
    const m = result.months[i];
    const rn = dataStartRow + i;

    const rowData: (number | null)[] = [
      m.month,
      m.newCustomers,
      ...tierNames.map(n => m.tiers[n]?.active || 0),
      null, // Total Active formula
      m.totalRevenue,
      m.totalCOGS,
      null, // GP formula
      m.marketing,
      null, // Contribution formula
      null, // GM% formula
      null, // CM% formula
      null, null, null, null, // Cumulative formulas
    ];

    const row = ws.addRow(rowData);

    // Total Active = SUM of tier actives
    row.getCell(COL_TOTAL_ACTIVE).value = {
      formula: `=SUM(${col(COL_TIER_START)}${rn}:${col(COL_TIER_START + tierCount - 1)}${rn})`,
      result: m.totalActive,
    } as ExcelJS.CellFormulaValue;

    // GP = Revenue - COGS
    row.getCell(COL_GP).value = { formula: `=${col(COL_REV)}${rn}-${col(COL_COGS)}${rn}`, result: m.totalGP } as ExcelJS.CellFormulaValue;

    // Contribution = GP - Marketing
    row.getCell(COL_CONTRIB).value = { formula: `=${col(COL_GP)}${rn}-${col(COL_MKTG)}${rn}`, result: m.contribution } as ExcelJS.CellFormulaValue;

    // GM% = GP / Revenue
    row.getCell(COL_GM).value = { formula: `=IF(${col(COL_REV)}${rn}>0,${col(COL_GP)}${rn}/${col(COL_REV)}${rn},0)`, result: m.gmPct / 100 } as ExcelJS.CellFormulaValue;

    // CM% = Contribution / Revenue
    row.getCell(COL_CM).value = { formula: `=IF(${col(COL_REV)}${rn}>0,${col(COL_CONTRIB)}${rn}/${col(COL_REV)}${rn},0)`, result: m.cmPct / 100 } as ExcelJS.CellFormulaValue;

    // Cumulative formulas
    row.getCell(COL_CUMREV).value = { formula: `=SUM(${col(COL_REV)}$${dataStartRow}:${col(COL_REV)}${rn})`, result: m.cumRevenue } as ExcelJS.CellFormulaValue;
    row.getCell(COL_CUMCOGS).value = { formula: `=SUM(${col(COL_COGS)}$${dataStartRow}:${col(COL_COGS)}${rn})`, result: m.cumCOGS } as ExcelJS.CellFormulaValue;
    row.getCell(COL_CUMMKTG).value = { formula: `=SUM(${col(COL_MKTG)}$${dataStartRow}:${col(COL_MKTG)}${rn})`, result: m.cumMarketing } as ExcelJS.CellFormulaValue;
    row.getCell(COL_CUMPROFIT).value = { formula: `=SUM(${col(COL_CONTRIB)}$${dataStartRow}:${col(COL_CONTRIB)}${rn})`, result: m.cumProfit } as ExcelJS.CellFormulaValue;

    // Formatting
    row.getCell(COL_NEW).numFmt = FMT_NUMBER;
    for (let c = COL_TIER_START; c <= COL_TOTAL_ACTIVE; c++) row.getCell(c).numFmt = FMT_NUMBER;
    for (let c = COL_REV; c <= COL_CONTRIB; c++) row.getCell(c).numFmt = FMT_CURRENCY;
    row.getCell(COL_GM).numFmt = FMT_PCT;
    row.getCell(COL_CM).numFmt = FMT_PCT;
    for (let c = COL_CUMREV; c <= COL_CUMPROFIT; c++) row.getCell(c).numFmt = FMT_CURRENCY;

    for (const c of [COL_TOTAL_ACTIVE, COL_GP, COL_CONTRIB, COL_GM, COL_CM, COL_CUMREV, COL_CUMCOGS, COL_CUMMKTG, COL_CUMPROFIT]) {
      row.getCell(c).font = FORMULA_FONT;
    }
  }

  autoWidth(ws);
  ws.views = [{ state: 'frozen', xSplit: 1, ySplit: 2 }];
}


// ═══════════════════════════════════════════════════════════════════════════
// COMPARE MODE EXPORT
// ═══════════════════════════════════════════════════════════════════════════

export async function exportCompareExcel(
  currentConfig: CurrentModelConfig,
  bundleConfig: BundleConfig,
  currentResult: CurrentSimulationResult,
  bundleResult: BundleSimulationResult,
  currentSens: SensitivityItem[],
  bundleSens: SensitivityItem[],
) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'FunnelAI LTV Simulator';
  wb.created = new Date();

  // Sheet 1: Side-by-side comparison
  const compWs = wb.addWorksheet('Comparison', { properties: { tabColor: { argb: 'FF3B82F6' } } });
  buildComparison(compWs, currentConfig, bundleConfig, currentResult, bundleResult);

  // Sheet 2-3: Current model details
  const curSumWs = wb.addWorksheet('Current Summary', { properties: { tabColor: { argb: 'FF3B82F6' } } });
  buildCurrentSummary(curSumWs, currentConfig, currentResult);

  const curMonWs = wb.addWorksheet('Current Monthly', { properties: { tabColor: { argb: 'FF3B82F6' } } });
  buildCurrentMonthly(curMonWs, currentResult);

  // Sheet 4-5: Bundle model details
  const bunSumWs = wb.addWorksheet('Bundle Summary', { properties: { tabColor: { argb: 'FF8B5CF6' } } });
  buildBundleSummary(bunSumWs, bundleConfig, bundleResult);

  const bunMonWs = wb.addWorksheet('Bundle Monthly', { properties: { tabColor: { argb: 'FF8B5CF6' } } });
  buildBundleMonthly(bunMonWs, bundleConfig, bundleResult);

  // Sensitivity sheets
  const curSensWs = wb.addWorksheet('Current Sensitivity', { properties: { tabColor: { argb: 'FFEF4444' } } });
  buildSensitivity(curSensWs, currentSens);

  const bunSensWs = wb.addWorksheet('Bundle Sensitivity', { properties: { tabColor: { argb: 'FFEF4444' } } });
  buildSensitivity(bunSensWs, bundleSens);

  const buffer = await wb.xlsx.writeBuffer();
  const date = new Date().toISOString().slice(0, 10);
  triggerDownload(buffer, `Signos_LTV_Model_Comparison_${date}.xlsx`);
}


function buildComparison(
  ws: ExcelJS.Worksheet,
  currentConfig: CurrentModelConfig,
  bundleConfig: BundleConfig,
  currentResult: CurrentSimulationResult,
  bundleResult: BundleSimulationResult,
) {
  const cS = currentResult.summary;
  const bS = bundleResult.summary;

  ws.mergeCells('A1:E1');
  const titleRow = ws.getRow(1);
  titleRow.getCell(1).value = 'Model Comparison — Current vs Bundle';
  titleRow.getCell(1).font = { bold: true, size: 14, color: { argb: 'FFF8FAFC' } };
  titleRow.getCell(1).fill = HEADER_FILL;
  titleRow.height = 28;

  ws.getRow(2).getCell(1).value = `Current: ${currentConfig.name} | Bundle: ${bundleConfig.name} | Generated: ${new Date().toLocaleDateString()}`;
  ws.getRow(2).getCell(1).font = { size: 9, color: { argb: 'FF94A3B8' } };

  ws.addRow([]);
  const metricHeader = ws.addRow(['Metric', 'Current Model', 'Bundle Model', 'Δ (Bundle − Current)', 'Winner']);
  metricHeader.font = SUBHEADER_FONT;
  metricHeader.fill = SUBHEADER_FILL;

  const headerRowNum = ws.rowCount;
  const startRow = headerRowNum + 1;

  interface CompRow {
    label: string;
    current: number;
    bundle: number;
    fmt: string;
    higherBetter?: boolean;
  }

  const rows: CompRow[] = [
    { label: 'LTV (Revenue)', current: currentResult.cohortLTV.revenue, bundle: bundleResult.cohortLTV.revenue, fmt: FMT_CURRENCY, higherBetter: true },
    { label: 'LTV (Gross Profit)', current: currentResult.cohortLTV.grossProfit, bundle: bundleResult.cohortLTV.grossProfit, fmt: FMT_CURRENCY, higherBetter: true },
    { label: 'Blended CAC', current: cS.blendedCAC, bundle: bS.blendedCAC, fmt: FMT_CURRENCY, higherBetter: false },
    { label: 'LTV:CAC Ratio', current: cS.ltvCacRatio, bundle: bS.ltvCacRatio, fmt: FMT_RATIO, higherBetter: true },
    { label: 'Payback (months)', current: cS.paybackMonths, bundle: bS.paybackMonths, fmt: FMT_NUMBER, higherBetter: false },
    { label: 'Gross Margin %', current: cS.avgGM / 100, bundle: bS.avgGM / 100, fmt: FMT_PCT, higherBetter: true },
    { label: 'Total Revenue', current: cS.totalRevenue, bundle: bS.totalRevenue, fmt: FMT_CURRENCY, higherBetter: true },
    { label: 'Total Net Profit', current: cS.totalProfit, bundle: bS.totalProfit, fmt: FMT_CURRENCY, higherBetter: true },
    { label: 'Total Acquired', current: cS.totalAcquired, bundle: bS.totalAcquired, fmt: FMT_NUMBER, higherBetter: true },
    { label: 'Final Active', current: Math.round(cS.finalActive), bundle: bS.finalActive, fmt: FMT_NUMBER, higherBetter: true },
    { label: 'Retention Rate', current: cS.retentionRate / 100, bundle: bS.retentionRate / 100, fmt: FMT_PCT, higherBetter: true },
  ];

  for (let i = 0; i < rows.length; i++) {
    const { label, current, bundle, fmt, higherBetter } = rows[i];
    const rn = startRow + i;
    const r = ws.addRow([label, current, bundle]);
    r.getCell(1).font = { color: { argb: 'FFE2E8F0' }, bold: true };
    r.getCell(2).numFmt = fmt;
    r.getCell(3).numFmt = fmt;

    // Delta formula
    r.getCell(4).value = { formula: `=C${rn}-B${rn}`, result: bundle - current } as ExcelJS.CellFormulaValue;
    r.getCell(4).numFmt = fmt;
    r.getCell(4).font = FORMULA_FONT;

    // Winner formula
    if (higherBetter !== undefined) {
      r.getCell(5).value = {
        formula: higherBetter
          ? `=IF(C${rn}>B${rn},"Bundle",IF(B${rn}>C${rn},"Current","Tie"))`
          : `=IF(C${rn}<B${rn},"Bundle",IF(B${rn}<C${rn},"Current","Tie"))`,
        result: higherBetter ? (bundle > current ? 'Bundle' : current > bundle ? 'Current' : 'Tie') : (bundle < current ? 'Bundle' : current < bundle ? 'Current' : 'Tie'),
      } as ExcelJS.CellFormulaValue;
      r.getCell(5).font = FORMULA_FONT;
    }
  }

  autoWidth(ws);
  ws.getColumn(1).width = 22;
  ws.getColumn(4).width = 22;
  ws.getColumn(5).width = 12;
}


// ═══════════════════════════════════════════════════════════════════════════
// SHARED — Sensitivity Sheet
// ═══════════════════════════════════════════════════════════════════════════

function buildSensitivity(ws: ExcelJS.Worksheet, sensitivity: SensitivityItem[]) {
  ws.mergeCells('A1:G1');
  const titleRow = ws.getRow(1);
  titleRow.getCell(1).value = 'Sensitivity Analysis — LTV (Gross Profit) Impact';
  titleRow.getCell(1).font = { bold: true, size: 13, color: { argb: 'FFF8FAFC' } };
  titleRow.getCell(1).fill = HEADER_FILL;
  titleRow.height = 26;

  const headerRow = ws.addRow(['Parameter', 'Low Scenario', 'Base LTV', 'High Scenario', 'Low LTV', 'High LTV', 'Δ Range']);
  headerRow.font = SUBHEADER_FONT;
  headerRow.fill = SUBHEADER_FILL;

  const startRow = 3;
  for (let i = 0; i < sensitivity.length; i++) {
    const s = sensitivity[i];
    const rn = startRow + i;
    const r = ws.addRow([s.parameter, s.lowLabel, s.baseLTV, s.highLabel, s.lowLTV, s.highLTV]);
    r.getCell(3).numFmt = FMT_CURRENCY;
    r.getCell(5).numFmt = FMT_CURRENCY;
    r.getCell(6).numFmt = FMT_CURRENCY;

    // Delta Range formula = ABS(High - Low)
    r.getCell(7).value = { formula: `=ABS(F${rn}-E${rn})`, result: s.delta } as ExcelJS.CellFormulaValue;
    r.getCell(7).numFmt = FMT_CURRENCY;
    r.getCell(7).font = FORMULA_FONT;

    // Color the LTV values
    if (s.lowLTV < s.baseLTV) r.getCell(5).font = NEGATIVE_FONT;
    if (s.highLTV > s.baseLTV) r.getCell(6).font = POSITIVE_FONT;
  }

  autoWidth(ws);
  ws.getColumn(1).width = 24;
}
