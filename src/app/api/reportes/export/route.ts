import { requireUser, route } from '@/lib/guard';
import { buildReport, parseFilters } from '@/lib/reports';
import { buildWorkbook } from '@/lib/excel-report';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = route(async (req: Request) => {
  await requireUser(['admin']);

  const filters = parseFilters(new URL(req.url).searchParams);
  const report = await buildReport(filters);
  const wb = await buildWorkbook(report);

  const buffer = await wb.xlsx.writeBuffer();
  const filename = `inventario-fcee-${filters.dateFrom}_${filters.dateTo}.xlsx`;

  return new Response(buffer as ArrayBuffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
});
