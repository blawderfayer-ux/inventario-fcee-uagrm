import { requireUser, route } from '@/lib/guard';
import { buildReport, parseFilters } from '@/lib/reports';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Excel en es-BO usa `;` como separador de listas y `,` como decimal. */
const SEP = ';';

function cell(value: string | number): string {
  if (typeof value === 'number') return value.toFixed(2).replace('.', ',');
  const needsQuotes = /[";\n\r]/.test(value);
  return needsQuotes ? `"${value.replace(/"/g, '""')}"` : value;
}

export const GET = route(async (req: Request) => {
  await requireUser(['admin']);

  const filters = parseFilters(new URL(req.url).searchParams);
  const report = await buildReport(filters);

  const lines: string[] = [];
  lines.push(cell('UNIVERSIDAD AUTÓNOMA GABRIEL RENÉ MORENO'));
  lines.push(cell('Facultad de Ciencias Económicas y Empresariales'));
  lines.push(cell('Informe de Inventario'));
  lines.push(
    [cell('Período'), cell(`${filters.dateFrom} a ${filters.dateTo}`)].join(SEP)
  );
  lines.push([cell('Categoría'), cell(filters.category)].join(SEP));
  lines.push([cell('Departamento'), cell(filters.department)].join(SEP));
  lines.push('');
  lines.push(
    [
      'SKU',
      'Descripción',
      'Categoría',
      'Unidad',
      'Stock',
      'P. Unitario (Bs.)',
      'Valor Total (Bs.)',
      'Entradas período',
      'Salidas período',
    ]
      .map(cell)
      .join(SEP)
  );

  for (const r of report.rows) {
    lines.push(
      [
        cell(r.sku),
        cell(r.name),
        cell(r.category),
        cell(r.unit),
        String(r.quantity),
        cell(r.unitPrice),
        cell(r.totalValue),
        String(r.entradas),
        String(r.salidas),
      ].join(SEP)
    );
  }

  lines.push('');
  lines.push([cell('TOTAL INVENTARIADO (Bs.)'), cell(report.totalValue)].join(SEP));
  lines.push([cell('TOTAL UNIDADES'), String(report.totalUnits)].join(SEP));

  // El BOM hace que Excel reconozca UTF-8 y muestre bien los acentos.
  const csv = '﻿' + lines.join('\r\n');
  const filename = `inventario-fcee-${filters.dateFrom}_${filters.dateTo}.csv`;

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
});
