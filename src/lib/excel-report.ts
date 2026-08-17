import ExcelJS from 'exceljs';
import type { ReportData } from './reports';
import { logoBuffer } from './logo-file';
import { BRAND } from './brand';

const NAVY = 'FF13294B';
const CRIMSON = 'FF9E1B32';
const SOFT = 'FFF2F6FC';
const BORDER = 'FFD7E0EC';

const MONEY = '"Bs. "#,##0.00';
const INT = '#,##0';

function thin(color = BORDER): Partial<ExcelJS.Borders> {
  const side = { style: 'thin' as const, color: { argb: color } };
  return { top: side, left: side, bottom: side, right: side };
}

/**
 * ExcelJS escribe `<color>` dentro de `<dataBar>`, pero su archivo de tipos
 * omite ese campo. El cast mantiene el XML correcto sin apagar el tipado.
 */
type DataBarRule = ExcelJS.DataBarRuleType & { color: { argb: string } };

function dataBarRule(
  priority: number,
  argb: string,
  cfvo: ExcelJS.Cvfo[]
): ExcelJS.ConditionalFormattingRule {
  return { type: 'dataBar', priority, cfvo, color: { argb }, gradient: false } as DataBarRule;
}

function fill(argb: string): ExcelJS.Fill {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb } };
}

function dmy(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

/** Cabecera institucional con el escudo y los datos del período. */
async function writeHeader(
  ws: ExcelJS.Worksheet,
  wb: ExcelJS.Workbook,
  report: ReportData,
  lastCol: string
) {
  const logo = await logoBuffer();
  if (logo) {
    // ExcelJS declara su propio tipo Buffer; el de Node es compatible en runtime.
    const id = wb.addImage({ buffer: logo as unknown as ExcelJS.Buffer, extension: 'png' });
    ws.addImage(id, { tl: { col: 0.25, row: 0.3 }, ext: { width: 62, height: 62 } });
  }

  ws.mergeCells(`B1:${lastCol}1`);
  ws.mergeCells(`B2:${lastCol}2`);
  ws.mergeCells(`B3:${lastCol}3`);
  ws.mergeCells(`B4:${lastCol}4`);

  const title = ws.getCell('B1');
  title.value = BRAND.university.toUpperCase();
  title.font = { name: 'Calibri', size: 14, bold: true, color: { argb: NAVY } };
  title.alignment = { vertical: 'middle' };

  const faculty = ws.getCell('B2');
  faculty.value = BRAND.faculty;
  faculty.font = { name: 'Calibri', size: 11, color: { argb: NAVY } };
  faculty.alignment = { vertical: 'middle' };

  const sub = ws.getCell('B3');
  sub.value = `Informe de Inventario · Período ${dmy(report.filters.dateFrom)} al ${dmy(
    report.filters.dateTo
  )}`;
  sub.font = { name: 'Calibri', size: 10, color: { argb: 'FF64748B' } };
  sub.alignment = { vertical: 'middle' };

  const meta = ws.getCell('B4');
  const tipo =
    report.filters.type === 'all'
      ? 'Todos los movimientos'
      : report.filters.type === 'entradas'
        ? 'Solo entradas'
        : 'Solo salidas';
  meta.value = `Categoría: ${report.filters.category} · ${tipo} · Emitido: ${new Date().toLocaleString(
    'es-BO'
  )}`;
  meta.font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF64748B' } };
  meta.alignment = { vertical: 'middle' };

  for (let r = 1; r <= 4; r++) ws.getRow(r).height = 18;

  // Filete institucional bajo la cabecera.
  ws.mergeCells(`A5:${lastCol}5`);
  const rule = ws.getCell('A5');
  rule.fill = fill(CRIMSON);
  ws.getRow(5).height = 4;
}

/** Tarjetas de totales, en una banda de dos filas. */
function writeSummary(ws: ExcelJS.Worksheet, report: ReportData, startRow: number) {
  const cards: [string, number | string, string][] = [
    ['ARTÍCULOS', report.rows.length, INT],
    ['UNIDADES EN STOCK', report.totalUnits, INT],
    ['VALOR INVENTARIADO', report.totalValue, MONEY],
    ['ENTRADAS DEL PERÍODO', report.totalEntradas, INT],
    ['SALIDAS DEL PERÍODO', report.totalSalidas, INT],
    ['STOCK CRÍTICO', report.criticalCount, INT],
  ];

  const labelRow = ws.getRow(startRow);
  const valueRow = ws.getRow(startRow + 1);
  labelRow.height = 15;
  valueRow.height = 22;

  cards.forEach(([label, value, format], i) => {
    const col = i + 1;

    const l = labelRow.getCell(col);
    l.value = label;
    l.font = { name: 'Calibri', size: 8, bold: true, color: { argb: 'FF64748B' } };
    l.alignment = { horizontal: 'center', vertical: 'middle' };
    l.fill = fill(SOFT);
    l.border = thin();

    const v = valueRow.getCell(col);
    v.value = value;
    v.numFmt = format;
    v.font = {
      name: 'Calibri',
      size: 13,
      bold: true,
      color: { argb: label === 'STOCK CRÍTICO' && report.criticalCount > 0 ? CRIMSON : NAVY },
    };
    v.alignment = { horizontal: 'center', vertical: 'middle' };
    v.fill = fill(SOFT);
    v.border = thin();
  });
}

const COLUMNS: { header: string; width: number; format?: string; align?: 'left' | 'right' | 'center' }[] =
  [
    { header: 'Código', width: 13, align: 'left' },
    { header: 'Descripción del artículo', width: 40, align: 'left' },
    { header: 'Categoría', width: 16, align: 'left' },
    { header: 'Unidad', width: 11, align: 'center' },
    { header: 'Stock', width: 11, format: INT, align: 'right' },
    { header: 'Mínimo', width: 11, format: INT, align: 'right' },
    { header: 'P. Unitario', width: 15, format: MONEY, align: 'right' },
    { header: 'Valor Total', width: 17, format: MONEY, align: 'right' },
    { header: 'Entradas', width: 12, format: INT, align: 'right' },
    { header: 'Salidas', width: 11, format: INT, align: 'right' },
    { header: 'Estado', width: 12, align: 'center' },
  ];

function writeTable(ws: ExcelJS.Worksheet, report: ReportData, headerRow: number) {
  ws.columns = COLUMNS.map((c) => ({ width: c.width }));

  const head = ws.getRow(headerRow);
  head.height = 24;
  COLUMNS.forEach((c, i) => {
    const cell = head.getCell(i + 1);
    cell.value = c.header;
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = fill(NAVY);
    cell.alignment = {
      horizontal: c.align === 'right' ? 'right' : c.align === 'center' ? 'center' : 'left',
      vertical: 'middle',
      wrapText: true,
    };
    cell.border = thin(NAVY);
  });

  report.rows.forEach((r, i) => {
    const row = ws.getRow(headerRow + 1 + i);
    row.height = 17;
    const values: (string | number)[] = [
      r.sku,
      r.name,
      r.category,
      r.unit,
      r.quantity,
      r.minStock,
      r.unitPrice,
      r.totalValue,
      r.entradas,
      r.salidas,
      r.estado,
    ];

    values.forEach((v, c) => {
      const col = COLUMNS[c];
      const cell = row.getCell(c + 1);
      cell.value = v;
      if (col.format) cell.numFmt = col.format;
      cell.font = {
        name: 'Calibri',
        size: 10,
        color: { argb: c === 10 && r.estado === 'Crítico' ? CRIMSON : 'FF0F172A' },
        bold: c === 7 || (c === 10 && r.estado === 'Crítico'),
      };
      cell.alignment = {
        horizontal: col.align === 'right' ? 'right' : col.align === 'center' ? 'center' : 'left',
        vertical: 'middle',
      };
      cell.border = thin();
      if (i % 2 === 1) cell.fill = fill(SOFT);
      if (c === 4 && r.estado === 'Crítico') {
        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: CRIMSON } };
      }
    });
  });

  const totalRow = ws.getRow(headerRow + 1 + report.rows.length);
  totalRow.height = 22;
  totalRow.getCell(1).value = 'TOTAL INVENTARIADO';
  ws.mergeCells(totalRow.number, 1, totalRow.number, 4);

  const totals: Record<number, number> = {
    5: report.totalUnits,
    8: report.totalValue,
    9: report.totalEntradas,
    10: report.totalSalidas,
  };

  for (let c = 1; c <= COLUMNS.length; c++) {
    const cell = totalRow.getCell(c);
    if (totals[c] !== undefined) {
      cell.value = totals[c];
      cell.numFmt = COLUMNS[c - 1].format ?? INT;
    }
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = fill(NAVY);
    cell.alignment = {
      horizontal: c <= 4 ? 'left' : 'right',
      vertical: 'middle',
    };
    cell.border = thin(NAVY);
  }

  const firstData = headerRow + 1;
  const lastData = headerRow + report.rows.length;

  if (report.rows.length > 0) {
    // Barras dentro de la celda: la "gráfica" queda alineada con su columna.
    ws.addConditionalFormatting({
      ref: `E${firstData}:E${lastData}`,
      rules: [dataBarRule(1, 'FF9DB9DC', [{ type: 'min' }, { type: 'max' }])],
    });
    ws.addConditionalFormatting({
      ref: `H${firstData}:H${lastData}`,
      rules: [dataBarRule(2, 'FFB9CBE4', [{ type: 'min' }, { type: 'max' }])],
    });

    ws.autoFilter = { from: { row: headerRow, column: 1 }, to: { row: lastData, column: 11 } };
  }

  ws.views = [{ state: 'frozen', xSplit: 2, ySplit: headerRow }];
}

/** Segunda hoja: participación de cada categoría, con barras comparativas. */
function writeCategorySheet(wb: ExcelJS.Workbook, report: ReportData) {
  const ws = wb.addWorksheet('Resumen por categoría', {
    pageSetup: { paperSize: 9, orientation: 'portrait' },
  });
  ws.columns = [{ width: 26 }, { width: 14 }, { width: 16 }, { width: 20 }, { width: 14 }];

  ws.mergeCells('A1:E1');
  const t = ws.getCell('A1');
  t.value = 'Distribución del inventario por categoría';
  t.font = { name: 'Calibri', size: 13, bold: true, color: { argb: NAVY } };
  ws.getRow(1).height = 24;

  const headers = ['Categoría', 'Artículos', 'Unidades', 'Valor total', '% del valor'];
  const head = ws.getRow(3);
  head.height = 22;
  headers.forEach((h, i) => {
    const cell = head.getCell(i + 1);
    cell.value = h;
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = fill(NAVY);
    cell.alignment = { horizontal: i === 0 ? 'left' : 'right', vertical: 'middle' };
    cell.border = thin(NAVY);
  });

  const total = report.totalValue || 1;
  report.byCategory.forEach((c, i) => {
    const row = ws.getRow(4 + i);
    row.height = 17;
    const values: (string | number)[] = [c.category, c.items, c.units, c.value, c.value / total];
    values.forEach((v, idx) => {
      const cell = row.getCell(idx + 1);
      cell.value = v;
      if (idx === 3) cell.numFmt = MONEY;
      if (idx === 4) cell.numFmt = '0.0%';
      if (idx === 1 || idx === 2) cell.numFmt = INT;
      cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF0F172A' } };
      cell.alignment = { horizontal: idx === 0 ? 'left' : 'right', vertical: 'middle' };
      cell.border = thin();
      if (i % 2 === 1) cell.fill = fill(SOFT);
    });
  });

  const last = 3 + report.byCategory.length;
  if (report.byCategory.length > 0) {
    ws.addConditionalFormatting({
      ref: `D4:D${last}`,
      rules: [dataBarRule(1, 'FF9DB9DC', [{ type: 'min' }, { type: 'max' }])],
    });
    ws.addConditionalFormatting({
      ref: `E4:E${last}`,
      rules: [
        dataBarRule(2, 'FFA8D5BA', [
          { type: 'num', value: 0 },
          { type: 'num', value: 1 },
        ]),
      ],
    });
  }

  const totalRow = ws.getRow(last + 1);
  totalRow.height = 20;
  totalRow.getCell(1).value = 'TOTAL';
  totalRow.getCell(2).value = report.rows.length;
  totalRow.getCell(3).value = report.totalUnits;
  totalRow.getCell(4).value = report.totalValue;
  totalRow.getCell(5).value = 1;
  totalRow.getCell(2).numFmt = INT;
  totalRow.getCell(3).numFmt = INT;
  totalRow.getCell(4).numFmt = MONEY;
  totalRow.getCell(5).numFmt = '0.0%';
  for (let c = 1; c <= 5; c++) {
    const cell = totalRow.getCell(c);
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = fill(NAVY);
    cell.alignment = { horizontal: c === 1 ? 'left' : 'right', vertical: 'middle' };
    cell.border = thin(NAVY);
  }

  ws.mergeCells(`A${last + 3}:E${last + 3}`);
  const note = ws.getCell(`A${last + 3}`);
  note.value =
    'Las barras de color muestran la participación relativa de cada categoría sobre el valor total del inventario.';
  note.font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF64748B' } };
  note.alignment = { wrapText: true, vertical: 'top' };
}

/** Arma el libro de Excel completo del informe de inventario. */
export async function buildWorkbook(report: ReportData): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  wb.creator = `${BRAND.app} · ${BRAND.faculty}`;
  wb.created = new Date();

  const ws = wb.addWorksheet('Inventario', {
    pageSetup: {
      paperSize: 9,
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 },
    },
    headerFooter: {
      oddFooter: `&L${BRAND.faculty}&RPágina &P de &N`,
    },
  });

  const headerRow = 10;
  writeTable(ws, report, headerRow);
  await writeHeader(ws, wb, report, 'K');
  writeSummary(ws, report, 7);
  writeCategorySheet(wb, report);

  return wb;
}
