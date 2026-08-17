import type { ReportData } from './reports';
import { logoDataUri } from './logo-file';
import { BRAND } from './brand';

function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function money(n: number): string {
  return n.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function dmy(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

/**
 * Devuelve el informe como documento imprimible con el membrete de la
 * Facultad. La página se abre en una pestaña nueva y lanza el diálogo de
 * impresión, desde donde se guarda como PDF.
 */
/** Construye el informe imprimible con el membrete de la Facultad. */
export async function buildPrintableHtml(report: ReportData): Promise<string> {
  const filters = report.filters;
  const logo = await logoDataUri();
  const emitted = new Date().toLocaleString('es-BO');

  const tipo =
    filters.type === 'all'
      ? 'Todos los movimientos'
      : filters.type === 'entradas'
        ? 'Solo entradas'
        : 'Solo salidas';

  const rows = report.rows
    .map(
      (r, i) => `<tr class="${i % 2 ? 'alt' : ''}">
      <td class="mono">${esc(r.sku)}</td>
      <td>${esc(r.name)}</td>
      <td>${esc(r.category)}</td>
      <td class="c">${esc(r.unit)}</td>
      <td class="num${r.estado === 'Crítico' ? ' bad' : ''}">${r.quantity}</td>
      <td class="num soft">${r.minStock}</td>
      <td class="num">${money(r.unitPrice)}</td>
      <td class="num strong">${money(r.totalValue)}</td>
      <td class="c">${
        r.estado === 'Crítico'
          ? '<span class="tag bad">Crítico</span>'
          : '<span class="tag ok">Normal</span>'
      }</td>
    </tr>`
    )
    .join('');

  const maxCat = Math.max(1, ...report.byCategory.map((c) => c.value));
  const catRows = report.byCategory
    .map((c) => {
      const pct = report.totalValue > 0 ? (c.value / report.totalValue) * 100 : 0;
      return `<tr>
      <td>${esc(c.category)}</td>
      <td class="num">${c.items}</td>
      <td class="num">${c.units}</td>
      <td class="num strong">${money(c.value)}</td>
      <td class="num">${pct.toFixed(1)}%</td>
      <td class="barcell"><span class="bar" style="width:${((c.value / maxCat) * 100).toFixed(1)}%"></span></td>
    </tr>`;
    })
    .join('');

  const cards = [
    ['Artículos', String(report.rows.length), false],
    ['Unidades en stock', report.totalUnits.toLocaleString('es-BO'), false],
    ['Valor inventariado', `Bs. ${money(report.totalValue)}`, false],
    ['Entradas', String(report.totalEntradas), false],
    ['Salidas', String(report.totalSalidas), false],
    ['Stock crítico', String(report.criticalCount), report.criticalCount > 0],
  ] as const;

  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Informe de Inventario — ${esc(BRAND.short)}</title>
<style>
  @page { size: A4 landscape; margin: 14mm 12mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
         color: #0F172A; margin: 0; font-size: 10.5px; padding: 0 14px 22px; }
  @media print { body { padding: 0; } }

  .hint { background: #13294B; color: #fff; padding: 10px 14px; font-size: 12px; text-align: center; }
  @media print { .hint { display: none !important; } }

  header { display: flex; align-items: center; gap: 14px;
           border-bottom: 2px solid #13294B; padding-bottom: 10px; margin-bottom: 4px; }
  header img { height: 58px; width: auto; }
  header .u { font-size: 14px; font-weight: 700; color: #13294B; letter-spacing: .02em; }
  header .f { font-size: 11.5px; color: #13294B; margin-top: 1px; }
  header .s { font-size: 10px; color: #64748B; margin-top: 4px; }
  .rule { height: 3px; background: #9E1B32; margin-bottom: 12px; }

  .cards { display: flex; gap: 6px; margin-bottom: 14px; }
  .card { flex: 1; border: 1px solid #D7E0EC; background: #F2F6FC; border-radius: 3px;
          padding: 7px 9px; }
  .card .l { font-size: 7.5px; font-weight: 700; letter-spacing: .09em;
             text-transform: uppercase; color: #64748B; }
  .card .v { font-size: 14px; font-weight: 700; color: #13294B; margin-top: 3px;
             font-variant-numeric: tabular-nums; }
  .card.bad .v { color: #9E1B32; }
  .card.bad { border-color: #9E1B32; }

  h2 { font-size: 11px; text-transform: uppercase; letter-spacing: .1em; color: #13294B;
       margin: 16px 0 7px; padding-bottom: 3px; border-bottom: 1px solid #D7E0EC; }

  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; }
  thead th { background: #13294B; color: #fff; font-size: 8.5px; letter-spacing: .07em;
             text-transform: uppercase; padding: 7px 7px; text-align: left; font-weight: 700; }
  thead th.num { text-align: right; }
  thead th.c { text-align: center; }
  td { padding: 5px 7px; border-bottom: 1px solid #E2E8F0; font-size: 10px;
       overflow: hidden; text-overflow: ellipsis; }
  td.num { text-align: right; font-variant-numeric: tabular-nums; }
  td.c { text-align: center; }
  td.mono { font-family: 'Consolas', 'Courier New', monospace; font-size: 9.5px; color: #475569; }
  td.strong { font-weight: 700; }
  td.soft { color: #64748B; }
  td.bad { color: #9E1B32; font-weight: 700; }
  tr.alt td { background: #F8FAFC; }
  tfoot td { border-top: 0; background: #13294B; color: #fff; font-weight: 700;
             padding: 7px; font-size: 10.5px; }
  tfoot td.num { text-align: right; }

  .tag { display: inline-block; font-size: 8px; font-weight: 700; letter-spacing: .05em;
         padding: 2px 6px; border-radius: 2px; text-transform: uppercase; }
  .tag.ok { background: #F0FDF4; color: #16A34A; border: 1px solid #BBF7D0; }
  .tag.bad { background: #FEF2F2; color: #9E1B32; border: 1px solid #FECACA; }

  .barcell { padding-right: 10px; }
  .bar { display: block; height: 9px; background: #13294B; border-radius: 2px; }

  footer { margin-top: 16px; border-top: 1px solid #E2E8F0; padding-top: 7px;
           font-size: 8.5px; color: #64748B; display: flex; justify-content: space-between; }
</style>
</head>
<body>
<div class="hint">Use Ctrl/Cmd + P y elija «Guardar como PDF» para archivar este informe.</div>

<header>
  ${logo ? `<img src="${logo}" alt="Escudo FCEE UAGRM">` : ''}
  <div>
    <div class="u">${esc(BRAND.university.toUpperCase())}</div>
    <div class="f">${esc(BRAND.faculty)}</div>
    <div class="s">Informe de Inventario · Período ${dmy(filters.dateFrom)} al ${dmy(filters.dateTo)}
      · Categoría: ${esc(filters.category)} · ${esc(tipo)} · Emitido: ${esc(emitted)}</div>
  </div>
</header>
<div class="rule"></div>

<div class="cards">
  ${cards
    .map(
      ([l, v, bad]) =>
        `<div class="card${bad ? ' bad' : ''}"><div class="l">${esc(l)}</div><div class="v">${esc(v)}</div></div>`
    )
    .join('')}
</div>

<h2>Detalle de existencias</h2>
<table>
  <colgroup>
    <col style="width:9%"><col style="width:26%"><col style="width:12%"><col style="width:8%">
    <col style="width:7%"><col style="width:7%"><col style="width:10%"><col style="width:12%">
    <col style="width:9%">
  </colgroup>
  <thead>
    <tr>
      <th>Código</th><th>Descripción del artículo</th><th>Categoría</th><th class="c">Unidad</th>
      <th class="num">Stock</th><th class="num">Mín.</th><th class="num">P. Unit. (Bs.)</th>
      <th class="num">Valor (Bs.)</th><th class="c">Estado</th>
    </tr>
  </thead>
  <tbody>${rows || '<tr><td colspan="9" style="text-align:center;padding:22px;color:#64748B">Sin datos para los filtros seleccionados.</td></tr>'}</tbody>
  <tfoot>
    <tr>
      <td colspan="4">TOTAL INVENTARIADO</td>
      <td class="num">${report.totalUnits}</td>
      <td></td>
      <td></td>
      <td class="num">Bs. ${money(report.totalValue)}</td>
      <td></td>
    </tr>
  </tfoot>
</table>

<h2>Distribución por categoría</h2>
<table>
  <colgroup>
    <col style="width:20%"><col style="width:10%"><col style="width:11%">
    <col style="width:15%"><col style="width:9%"><col style="width:35%">
  </colgroup>
  <thead>
    <tr>
      <th>Categoría</th><th class="num">Artículos</th><th class="num">Unidades</th>
      <th class="num">Valor (Bs.)</th><th class="num">%</th><th>Participación</th>
    </tr>
  </thead>
  <tbody>${catRows || '<tr><td colspan="6" style="text-align:center;padding:18px;color:#64748B">Sin categorías con existencias.</td></tr>'}</tbody>
</table>

<footer>
  <span>${esc(BRAND.app)} · ${esc(BRAND.faculty)}</span>
  <span>${esc(BRAND.department)} — Documento generado automáticamente</span>
</footer>
<script>window.addEventListener('load', function () { setTimeout(function () { window.print(); }, 400); });</script>
</body>
</html>`;

  return html;
}
