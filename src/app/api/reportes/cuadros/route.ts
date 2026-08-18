import { NextResponse } from 'next/server';
import { requireUser, route } from '@/lib/guard';
import { buildAlmacenesReport, parseYear } from '@/lib/almacenes';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = route(async (req: Request) => {
  await requireUser(['admin']);
  const year = parseYear(new URL(req.url).searchParams);
  return NextResponse.json(await buildAlmacenesReport(year));
});
