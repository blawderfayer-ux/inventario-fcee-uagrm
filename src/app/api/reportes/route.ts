import { NextResponse } from 'next/server';
import { requireUser, route } from '@/lib/guard';
import { buildReport, parseFilters } from '@/lib/reports';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = route(async (req: Request) => {
  await requireUser(['admin']);
  const filters = parseFilters(new URL(req.url).searchParams);
  return NextResponse.json(await buildReport(filters));
});
