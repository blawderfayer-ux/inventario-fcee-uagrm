import { requireUser, route } from '@/lib/guard';
import { buildAlmacenesReport, parseYear } from '@/lib/almacenes';
import { buildCuadrosWorkbook } from '@/lib/cuadros-excel';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = route(async (req: Request) => {
  await requireUser(['admin']);
  const year = parseYear(new URL(req.url).searchParams);
  const report = await buildAlmacenesReport(year);
  const wb = await buildCuadrosWorkbook(report);

  const buffer = await wb.xlsx.writeBuffer();

  return new Response(buffer as ArrayBuffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="cuadros-almacenes-${year}.xlsx"`,
      'Cache-Control': 'no-store',
    },
  });
});
