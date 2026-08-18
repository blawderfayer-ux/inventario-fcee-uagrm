import { requireUser, route } from '@/lib/guard';
import { buildAlmacenesReport, parseYear } from '@/lib/almacenes';
import { buildCuadrosHtml } from '@/lib/cuadros-pdf';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = route(async (req: Request) => {
  await requireUser(['admin']);
  const year = parseYear(new URL(req.url).searchParams);
  const report = await buildAlmacenesReport(year);
  const html = await buildCuadrosHtml(report);

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
});
