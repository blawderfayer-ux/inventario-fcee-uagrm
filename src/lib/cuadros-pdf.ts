import type { AlmacenesReport } from './almacenes';
import { logoDataUri } from './logo-file';
import { BRAND } from './brand';

function esc(v: string): string {
  return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Formato boliviano: punto para miles, coma para decimales. */
function bs(n: number): string {
  return n.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function qty(n: number): string {
  return n.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Bloque de tres firmas, tal como lo exige el formulario oficial. */
function firmas(): string {
  const blocks = [
    ['Firma Contabilidad', ''],
    ['Firma DGAA - DAF', 'Jefe Administrativo y Financiero'],
    ['Firma Responsable', 'Encargado de Almacén Facultativo'],
  ];
  return `<div class="firmas">${blocks
    .map(
      ([title, sub]) => `<div class="firma">
        <div class="linea"></div>
        <div class="ftitle">${esc(title)}</div>
        ${sub ? `<div class="fsub">${esc(sub)}</div>` : ''}
        <div class="fsub">${esc(BRAND.faculty)}</div>
        <div class="fsub">U.A.G.R.M.</div>
      </div>`
    )
    .join('')}</div>`;
}

const NOTA_1 =
  'La información expuesta en el presente cuadro cuenta con la documentación de soporte ' +
  'correspondiente, en el marco de las Normas Básicas del Sistema de Contabilidad Integrada.';

const NOTA_2 =
  'Las entidades del sector público, que NO estén comprendidas dentro del Órgano Ejecutivo ' +
  '(Vicepresidencia, Ministerios de Estado y Tesoro General de la Nación), deben dar ' +
  'cumplimiento al Artículo 46 de las NBSCI, respecto a las firmas de los Estados Financieros ' +
  'y estados de cuenta o información complementaria.';

function encabezado(logo: string | null, codigo: string, titulo: string, year: number): string {
  return `<header>
  <div class="hleft">${logo ? `<img src="${logo}" alt="Escudo FCEE UAGRM">` : ''}</div>
  <div class="hcenter">
    <div class="entidad">${esc(BRAND.university)}</div>
    <div class="entidad2">${esc(BRAND.faculty)}</div>
    <div class="titulo">${esc(titulo)}</div>
    <div class="fecha">Al 31 de diciembre ${year}</div>
    <div class="fecha">(Expresado en Bolivianos)</div>
  </div>
  <div class="hright">
    <div class="cod">${esc(codigo)}</div>
    <div class="ver">Versión 01</div>
  </div>
</header>`;
}

/** Documento imprimible con el Cuadro 5 y el Cuadro 6, una hoja cada uno. */
export async function buildCuadrosHtml(report: AlmacenesReport): Promise<string> {
  const logo = await logoDataUri();
  const t = report.totals;

  const resumenRows = report.resumen
    .map(
      (r) => `<tr>
      <td class="c">${r.n}</td>
      <td class="c mono">${r.partida ? esc(r.partida) : '<span class="sinp">Sin partida</span>'}</td>
      <td class="num">${qty(r.qtyInitial)}</td>
      <td class="num">${bs(r.valInitial)}</td>
      <td class="num">${qty(r.qtyFinal)}</td>
      <td class="num">${bs(r.valFinal)}</td>
    </tr>`
    )
    .join('');

  const detalleRows = report.detalle
    .map(
      (r) => `<tr>
      <td class="c">${r.n}</td>
      <td>${esc(r.category)}</td>
      <td class="c">${esc(r.unit)}</td>
      <td class="c">Bolivianos</td>
      <td class="num">${qty(r.qtyInitial)}</td>
      <td class="num">${qty(r.qtyIn)}</td>
      <td class="num">${qty(r.qtyOut)}</td>
      <td class="num">${qty(r.qtyFinal)}</td>
      <td class="num">${bs(r.valInitial)}</td>
      <td class="num">${bs(r.valIn)}</td>
      <td class="num">${bs(r.valOut)}</td>
      <td class="num">${bs(r.valFinal)}</td>
    </tr>`
    )
    .join('');

  const aviso = report.sinPartida.length
    ? `<div class="aviso">Categorías sin partida presupuestaria asignada:
       <strong>${esc(report.sinPartida.join(', '))}</strong>. Asígnela desde
       Inventario → Categorías para que aparezcan agrupadas en el Cuadro 5.</div>`
    : '';

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Cuadros de Almacenes ${report.year} — ${esc(BRAND.short)}</title>
<style>
  @page { size: A4 landscape; margin: 12mm 10mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #000; margin: 0;
         font-size: 10px; padding: 0 12px 20px; }
  @media print { body { padding: 0; } .hint { display: none !important; } }

  .hint { background: #13294B; color: #fff; padding: 10px 14px; font-size: 12px;
          text-align: center; margin: 0 -12px 14px; }

  .hoja { page-break-after: always; margin-bottom: 34px; }
  .hoja:last-child { page-break-after: auto; margin-bottom: 0; }
  @media print { .hoja { margin-bottom: 0; } }

  header { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 14px; }
  .hleft { width: 90px; }
  .hleft img { height: 60px; width: auto; }
  .hcenter { flex: 1; text-align: center; }
  .hright { width: 110px; text-align: right; font-weight: bold; font-size: 11px; }
  .ver { font-weight: normal; }
  .entidad { font-size: 12px; font-weight: bold; }
  .entidad2 { font-size: 11px; }
  .titulo { font-size: 12px; font-weight: bold; text-decoration: underline; margin-top: 6px; }
  .fecha { font-size: 10px; }

  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #000; padding: 4px 6px; }
  thead th { background: #DCE6F1; font-size: 9.5px; text-align: center; font-weight: bold; }
  td { font-size: 10px; }
  td.num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  td.c { text-align: center; }
  td.mono { font-family: 'Courier New', monospace; }
  .sinp { color: #9E1B32; font-style: italic; font-family: Arial, sans-serif; }
  tfoot td { font-weight: bold; background: #F2F2F2; }
  tfoot td.lbl { text-align: center; }

  .nota { margin-top: 12px; font-size: 9.5px; text-align: justify; }
  .nota b { font-weight: bold; }
  .aviso { margin-top: 10px; font-size: 9px; color: #9E1B32; border: 1px solid #9E1B32;
           padding: 6px 8px; }

  .firmas { display: flex; justify-content: space-around; gap: 20px;
            margin-top: 42px; margin-bottom: 14px; }
  .firma { flex: 1; text-align: center; }
  .linea { border-top: 1px solid #000; margin-bottom: 4px; }
  .ftitle { font-size: 10px; font-weight: bold; }
  .fsub { font-size: 8px; }
</style>
</head>
<body>
<div class="hint">Use Ctrl/Cmd + P y elija «Guardar como PDF». Cada cuadro sale en su propia hoja.</div>

<!-- ============ CUADRO 5 ============ -->
<section class="hoja">
  ${encabezado(logo, 'DGCF - R1.05', 'RESUMEN DE ALMACENES (BIENES DE CONSUMO)', report.year)}
  <table>
    <colgroup>
      <col style="width:5%"><col style="width:19%"><col style="width:19%">
      <col style="width:19%"><col style="width:19%"><col style="width:19%">
    </colgroup>
    <thead>
      <tr>
        <th rowspan="2">N°</th>
        <th rowspan="2">Partida</th>
        <th>Cantidad Inicial</th>
        <th>Saldo Inicial</th>
        <th>Cantidad Final</th>
        <th>Saldo Final</th>
      </tr>
      <tr>
        <th>al 01/01/${report.year}</th>
        <th>al 01/01/${report.year} (Bs)</th>
        <th>al 31/12/${report.year}</th>
        <th>al 31/12/${report.year} (Bs)</th>
      </tr>
    </thead>
    <tbody>${
      resumenRows ||
      '<tr><td colspan="6" style="text-align:center;padding:18px">Sin movimientos ni existencias en la gestión.</td></tr>'
    }</tbody>
    <tfoot>
      <tr>
        <td class="lbl" colspan="2">TOTAL</td>
        <td class="num">${qty(t.qtyInitial)}</td>
        <td class="num">${bs(t.valInitial)}</td>
        <td class="num">${qty(t.qtyFinal)}</td>
        <td class="num">${bs(t.valFinal)}</td>
      </tr>
    </tfoot>
  </table>

  <div class="nota"><b>Nota:</b> ${NOTA_1}</div>
  ${aviso}
  ${firmas()}
  <div class="nota"><b>Nota:</b> ${NOTA_2}</div>
</section>

<!-- ============ CUADRO 6 ============ -->
<section class="hoja">
  ${encabezado(logo, 'DGCF - R1.06', 'DETALLE DE ALMACENES (BIENES DE CONSUMO)', report.year)}
  <table>
    <colgroup>
      <col style="width:4%"><col style="width:16%"><col style="width:7%"><col style="width:8%">
      <col style="width:8%"><col style="width:8%"><col style="width:8%"><col style="width:8%">
      <col style="width:8.25%"><col style="width:8.25%"><col style="width:8.25%"><col style="width:8.25%">
    </colgroup>
    <thead>
      <tr>
        <th rowspan="2">N°</th>
        <th rowspan="2">Descripción (Ítem)</th>
        <th rowspan="2">Unidad de medida</th>
        <th rowspan="2">Precio Unitario</th>
        <th colspan="4">Cantidad</th>
        <th colspan="4">Valores</th>
      </tr>
      <tr>
        <th>Saldo Inicial</th><th>Entradas</th><th>Salidas</th><th>Saldo Final</th>
        <th>Saldo Inicial</th><th>Entradas</th><th>Salidas</th><th>Saldo Final</th>
      </tr>
    </thead>
    <tbody>${
      detalleRows ||
      '<tr><td colspan="12" style="text-align:center;padding:18px">Sin movimientos ni existencias en la gestión.</td></tr>'
    }</tbody>
    <tfoot>
      <tr>
        <td class="lbl" colspan="4">TOTAL</td>
        <td class="num">${qty(t.qtyInitial)}</td>
        <td class="num">${qty(t.qtyIn)}</td>
        <td class="num">${qty(t.qtyOut)}</td>
        <td class="num">${qty(t.qtyFinal)}</td>
        <td class="num">${bs(t.valInitial)}</td>
        <td class="num">${bs(t.valIn)}</td>
        <td class="num">${bs(t.valOut)}</td>
        <td class="num">${bs(t.valFinal)}</td>
      </tr>
    </tfoot>
  </table>

  <div class="nota"><b>Nota:</b> ${NOTA_1}</div>
  ${firmas()}
  <div class="nota"><b>Nota:</b> ${NOTA_2}</div>
</section>

<script>window.addEventListener('load', function () { setTimeout(function () { window.print(); }, 400); });</script>
</body>
</html>`;
}
