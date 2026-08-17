import { requireUser, route } from '@/lib/guard';
import { buildReport, parseFilters } from '@/lib/reports';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

/**
 * Devuelve el informe como documento imprimible. La página se abre en una
 * pestaña nueva y lanza el diálogo de impresión del navegador, desde donde se
 * guarda como PDF sin necesidad de un motor de renderizado en el servidor.
 */
export const GET = route(async (req: Request) => {
  await requireUser(['admin']);

  const filters = parseFilters(new URL(req.url).searchParams);
  const report = await buildReport(filters);
  const emitted = new Date().toLocaleString('es-BO');

  const rows = report.rows
    .map(
      (r, i) => `<tr class="${i % 2 ? 'alt' : ''}">
      <td class="mono">${esc(r.sku)}</td>
      <td>${esc(r.name)}</td>
      <td>${esc(r.category)}</td>
      <td>${esc(r.unit)}</td>
      <td class="num">${r.quantity}</td>
      <td class="num">${money(r.unitPrice)}</td>
      <td class="num strong">${money(r.totalValue)}</td>
    </tr>`
    )
    .join('');

  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Informe de Inventario — FCEE UAGRM</title>
<style>
  @page { size: A4; margin: 18mm 14mm; }
  body { font-family: Georgia, 'Times New Roman', serif; color: #0F172A; margin: 0; font-size: 11px; }
  header { text-align: center; border-bottom: 2px solid #13294B; padding-bottom: 10px; margin-bottom: 6px; }
  header .u { font-size: 14px; font-weight: 700; letter-spacing: .05em; }
  header .f { font-size: 12px; margin-top: 2px; }
  header .s { font-size: 10px; color: #64748B; margin-top: 5px; }
  .meta { display: flex; justify-content: space-between; font-size: 10px; color: #64748B; margin: 10px 0 14px; }
  table { width: 100%; border-collapse: collapse; }
  thead th { background: #13294B; color: #fff; font-size: 9px; letter-spacing: .08em;
             text-transform: uppercase; padding: 7px 8px; text-align: left; }
  thead th.num { text-align: right; }
  td { padding: 6px 8px; border-bottom: 1px solid #E2E8F0; font-size: 10.5px; }
  td.num { text-align: right; font-variant-numeric: tabular-nums; }
  td.mono { font-family: 'Courier New', monospace; font-size: 9.5px; color: #64748B; }
  td.strong { font-weight: 700; }
  tr.alt td { background: #F8FAFC; }
  tfoot td { border-top: 2px solid #13294B; font-weight: 700; padding-top: 8px; }
  footer { margin-top: 18px; border-top: 1px solid #E2E8F0; padding-top: 8px;
           font-size: 9px; color: #64748B; display: flex; justify-content: space-between; }
  @media print { .hint { display: none !important; } }
  .hint { background: #13294B; color: #fff; padding: 10px 14px; font-family: system-ui, sans-serif;
          font-size: 12px; text-align: center; }
</style>
</head>
<body>
<div class="hint">Use Ctrl/Cmd + P y elija «Guardar como PDF» para archivar este informe.</div>
<header>
  <div class="u">UNIVERSIDAD AUTÓNOMA GABRIEL RENÉ MORENO</div>
  <div class="f">Facultad de Ciencias Económicas y Empresariales</div>
  <div class="s">Informe de Inventario · Período ${esc(filters.dateFrom)} / ${esc(filters.dateTo)}</div>
</header>
<div class="meta">
  <span>Categoría: ${esc(filters.category)} · Departamento: ${esc(filters.department)}</span>
  <span>Emitido: ${esc(emitted)}</span>
</div>
<table>
  <thead>
    <tr>
      <th>SKU</th><th>Descripción</th><th>Categoría</th><th>Unidad</th>
      <th class="num">Stock</th><th class="num">P. Unitario (Bs.)</th><th class="num">Valor Total (Bs.)</th>
    </tr>
  </thead>
  <tbody>${rows || '<tr><td colspan="7">Sin datos para los filtros seleccionados.</td></tr>'}</tbody>
  <tfoot>
    <tr>
      <td colspan="4">TOTAL INVENTARIADO</td>
      <td class="num">${report.totalUnits}</td>
      <td></td>
      <td class="num">Bs. ${money(report.totalValue)}</td>
    </tr>
  </tfoot>
</table>
<footer>
  <span>Sistema de Gestión de Inventarios · FCEE UAGRM</span>
  <span>Documento generado automáticamente</span>
</footer>
<script>window.addEventListener('load', function () { setTimeout(function () { window.print(); }, 350); });</script>
</body>
</html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
});
