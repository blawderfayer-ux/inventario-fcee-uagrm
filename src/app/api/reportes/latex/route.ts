import { requireUser, route } from '@/lib/guard';
import { buildReport, parseFilters } from '@/lib/reports';
import { buildTex } from '@/lib/latex-report';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = route(async (req: Request) => {
  await requireUser(['admin']);

  const filters = parseFilters(new URL(req.url).searchParams);
  const report = await buildReport(filters);
  const source = buildTex(report);
  const filename = `informe-inventario-${filters.dateFrom}_${filters.dateTo}.tex`;

  return new Response(source, {
    headers: {
      'Content-Type': 'application/x-tex; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
});
