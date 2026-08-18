import ExcelJS from 'exceljs';
import type { AlmacenesReport } from './almacenes';
import { logoBuffer } from './logo-file';
import { BRAND } from './brand';

const HEAD_FILL = 'FFDCE6F1';
const TOTAL_FILL = 'FFF2F2F2';
const MONEY = '#,##0.00';

function border(): Partial<ExcelJS.Borders> {
  const side = { style: 'thin' as const, color: { argb: 'FF000000' } };
  return { top: side, left: side, bottom: side, right: side };
}

function headCell(cell: ExcelJS.Cell, text: string) {
  cell.value = text;
  cell.font = { name: 'Arial', size: 9, bold: true };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEAD_FILL } };
  cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  cell.border = border();
}

/** Membrete institucional idéntico en ambas hojas. */
async function header(
  ws: ExcelJS.Worksheet,
  wb: ExcelJS.Workbook,
  lastCol: string,
  codigo: string,
  titulo: string,
  year: number
) {
  const logo = await logoBuffer();
  if (logo) {
    const id = wb.addImage({ buffer: logo as unknown as ExcelJS.Buffer, extension: 'png' });
    ws.addImage(id, { tl: { col: 0.2, row: 0.2 }, ext: { width: 58, height: 58 } });
  }

  const lines: [string, number, boolean][] = [
    [BRAND.university, 12, true],
    [BRAND.faculty, 11, false],
    [titulo, 12, true],
    [`Al 31 de diciembre ${year}`, 10, false],
    ['(Expresado en Bolivianos)', 10, false],
  ];

  lines.forEach(([text, size, bold], i) => {
    const row = i + 1;
    ws.mergeCells(`B${row}:${lastCol}${row}`);
    const cell = ws.getCell(`B${row}`);
    cell.value = text;
    cell.font = { name: 'Arial', size, bold, underline: i === 2 };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(row).height = 16;
  });

  const cod = ws.getCell(`${lastCol}1`);
  cod.value = codigo;
  cod.font = { name: 'Arial', size: 10, bold: true };
  cod.alignment = { horizontal: 'right' };
  const ver = ws.getCell(`${lastCol}2`);
  ver.value = 'Versión 01';
  ver.font = { name: 'Arial', size: 10 };
  ver.alignment = { horizontal: 'right' };
}

const NOTA_1 =
  'Nota: La información expuesta en el presente cuadro cuenta con la documentación de soporte ' +
  'correspondiente, en el marco de las Normas Básicas del Sistema de Contabilidad Integrada.';

const NOTA_2 =
  'Nota: Las entidades del sector público, que NO estén comprendidas dentro del Órgano Ejecutivo ' +
  '(Vicepresidencia, Ministerios de Estado y Tesoro General de la Nación), deben dar cumplimiento ' +
  'al Artículo 46 de las NBSCI, respecto a las firmas de los Estados Financieros y estados de ' +
  'cuenta o información complementaria.';

/** Notas y las tres líneas de firma bajo cada cuadro. */
function footer(ws: ExcelJS.Worksheet, startRow: number, lastCol: string, span: number) {
  ws.mergeCells(`A${startRow}:${lastCol}${startRow}`);
  const n1 = ws.getCell(`A${startRow}`);
  n1.value = NOTA_1;
  n1.font = { name: 'Arial', size: 9 };
  n1.alignment = { wrapText: true, vertical: 'top' };
  ws.getRow(startRow).height = 26;

  const signRow = startRow + 4;
  const width = Math.max(1, Math.floor(span / 3));
  const titles = ['Firma Contabilidad', 'Firma DGAA - DAF', 'Firma Responsable'];
  const subs = ['', 'Jefe Administrativo y Financiero', 'Encargado de Almacén Facultativo'];

  titles.forEach((title, i) => {
    const from = i * width + 1;
    const to = i === 2 ? span : from + width - 1;

    ws.mergeCells(signRow, from, signRow, to);
    const line = ws.getCell(signRow, from);
    line.border = { top: { style: 'thin', color: { argb: 'FF000000' } } };

    ws.mergeCells(signRow + 1, from, signRow + 1, to);
    const t = ws.getCell(signRow + 1, from);
    t.value = title;
    t.font = { name: 'Arial', size: 10, bold: true };
    t.alignment = { horizontal: 'center' };

    ws.mergeCells(signRow + 2, from, signRow + 2, to);
    const s = ws.getCell(signRow + 2, from);
    s.value = [subs[i], BRAND.faculty, 'U.A.G.R.M.'].filter(Boolean).join(' · ');
    s.font = { name: 'Arial', size: 8 };
    s.alignment = { horizontal: 'center', wrapText: true };
  });

  const notaRow = signRow + 4;
  ws.mergeCells(`A${notaRow}:${lastCol}${notaRow}`);
  const n2 = ws.getCell(`A${notaRow}`);
  n2.value = NOTA_2;
  n2.font = { name: 'Arial', size: 9 };
  n2.alignment = { wrapText: true, vertical: 'top' };
  ws.getRow(notaRow).height = 30;
}

function sheetOptions(): Partial<ExcelJS.AddWorksheetOptions> {
  return {
    pageSetup: {
      paperSize: 9,
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 },
    },
  };
}

function writeCuadro5(wb: ExcelJS.Workbook, report: AlmacenesReport) {
  const ws = wb.addWorksheet('Cuadro 5 - Resumen', sheetOptions());
  ws.columns = [{ width: 6 }, { width: 20 }, { width: 20 }, { width: 22 }, { width: 20 }, { width: 22 }];

  const HEAD = 7;
  ws.mergeCells(`A${HEAD}:A${HEAD + 1}`);
  headCell(ws.getCell(`A${HEAD}`), 'N°');
  ws.mergeCells(`B${HEAD}:B${HEAD + 1}`);
  headCell(ws.getCell(`B${HEAD}`), 'Partida');
  headCell(ws.getCell(`C${HEAD}`), 'Cantidad Inicial');
  headCell(ws.getCell(`D${HEAD}`), 'Saldo Inicial');
  headCell(ws.getCell(`E${HEAD}`), 'Cantidad Final');
  headCell(ws.getCell(`F${HEAD}`), 'Saldo Final');
  headCell(ws.getCell(`C${HEAD + 1}`), `al 01/01/${report.year}`);
  headCell(ws.getCell(`D${HEAD + 1}`), `al 01/01/${report.year} (Bs)`);
  headCell(ws.getCell(`E${HEAD + 1}`), `al 31/12/${report.year}`);
  headCell(ws.getCell(`F${HEAD + 1}`), `al 31/12/${report.year} (Bs)`);
  ws.getRow(HEAD).height = 20;
  ws.getRow(HEAD + 1).height = 20;

  let r = HEAD + 2;
  for (const row of report.resumen) {
    const values: (string | number)[] = [
      row.n,
      row.partida || 'Sin partida',
      row.qtyInitial,
      row.valInitial,
      row.qtyFinal,
      row.valFinal,
    ];
    values.forEach((v, c) => {
      const cell = ws.getCell(r, c + 1);
      cell.value = v;
      if (c >= 2) cell.numFmt = MONEY;
      cell.font = { name: 'Arial', size: 10 };
      cell.alignment = { horizontal: c <= 1 ? 'center' : 'right', vertical: 'middle' };
      cell.border = border();
    });
    r++;
  }

  ws.mergeCells(r, 1, r, 2);
  const label = ws.getCell(r, 1);
  label.value = 'TOTAL';
  const t = report.totals;
  [t.qtyInitial, t.valInitial, t.qtyFinal, t.valFinal].forEach((v, i) => {
    const cell = ws.getCell(r, i + 3);
    cell.value = v;
    cell.numFmt = MONEY;
  });
  for (let c = 1; c <= 6; c++) {
    const cell = ws.getCell(r, c);
    cell.font = { name: 'Arial', size: 10, bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TOTAL_FILL } };
    cell.alignment = { horizontal: c <= 2 ? 'center' : 'right', vertical: 'middle' };
    cell.border = border();
  }

  footer(ws, r + 2, 'F', 6);
  return header(wb.getWorksheet('Cuadro 5 - Resumen')!, wb, 'F', 'DGCF - R1.05',
    'RESUMEN DE ALMACENES (BIENES DE CONSUMO)', report.year);
}

function writeCuadro6(wb: ExcelJS.Workbook, report: AlmacenesReport) {
  const ws = wb.addWorksheet('Cuadro 6 - Detalle', sheetOptions());
  ws.columns = [
    { width: 5 }, { width: 30 }, { width: 12 }, { width: 13 },
    { width: 13 }, { width: 12 }, { width: 12 }, { width: 13 },
    { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 },
  ];

  const HEAD = 7;
  ['A', 'B', 'C', 'D'].forEach((col, i) => {
    ws.mergeCells(`${col}${HEAD}:${col}${HEAD + 1}`);
    headCell(
      ws.getCell(`${col}${HEAD}`),
      ['N°', 'Descripción (Ítem)', 'Unidad de medida', 'Precio Unitario'][i]
    );
  });
  ws.mergeCells(`E${HEAD}:H${HEAD}`);
  headCell(ws.getCell(`E${HEAD}`), 'Cantidad');
  ws.mergeCells(`I${HEAD}:L${HEAD}`);
  headCell(ws.getCell(`I${HEAD}`), 'Valores');
  ['Saldo Inicial', 'Entradas', 'Salidas', 'Saldo Final'].forEach((label, i) => {
    headCell(ws.getCell(HEAD + 1, 5 + i), label);
    headCell(ws.getCell(HEAD + 1, 9 + i), label);
  });
  ws.getRow(HEAD).height = 20;
  ws.getRow(HEAD + 1).height = 20;

  let r = HEAD + 2;
  for (const row of report.detalle) {
    const values: (string | number)[] = [
      row.n,
      row.category,
      row.unit,
      'Bolivianos',
      row.qtyInitial,
      row.qtyIn,
      row.qtyOut,
      row.qtyFinal,
      row.valInitial,
      row.valIn,
      row.valOut,
      row.valFinal,
    ];
    values.forEach((v, c) => {
      const cell = ws.getCell(r, c + 1);
      cell.value = v;
      if (c >= 4) cell.numFmt = MONEY;
      cell.font = { name: 'Arial', size: 10 };
      cell.alignment = {
        horizontal: c === 1 ? 'left' : c <= 3 ? 'center' : 'right',
        vertical: 'middle',
      };
      cell.border = border();
    });
    r++;
  }

  ws.mergeCells(r, 1, r, 4);
  ws.getCell(r, 1).value = 'TOTAL';
  const t = report.totals;
  [t.qtyInitial, t.qtyIn, t.qtyOut, t.qtyFinal, t.valInitial, t.valIn, t.valOut, t.valFinal].forEach(
    (v, i) => {
      const cell = ws.getCell(r, i + 5);
      cell.value = v;
      cell.numFmt = MONEY;
    }
  );
  for (let c = 1; c <= 12; c++) {
    const cell = ws.getCell(r, c);
    cell.font = { name: 'Arial', size: 10, bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TOTAL_FILL } };
    cell.alignment = { horizontal: c <= 4 ? 'center' : 'right', vertical: 'middle' };
    cell.border = border();
  }

  ws.views = [{ state: 'frozen', ySplit: HEAD + 1 }];
  footer(ws, r + 2, 'L', 12);
  return header(ws, wb, 'L', 'DGCF - R1.06', 'DETALLE DE ALMACENES (BIENES DE CONSUMO)', report.year);
}

/** Libro con los dos cuadros oficiales, una hoja cada uno. */
export async function buildCuadrosWorkbook(report: AlmacenesReport): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  wb.creator = `${BRAND.app} · ${BRAND.faculty}`;
  wb.created = new Date();

  await writeCuadro5(wb, report);
  await writeCuadro6(wb, report);

  return wb;
}
