import { NextResponse } from 'next/server';
import { requireUser, route } from '@/lib/guard';
import { computeMetrics, listActivity, weeklyFlow } from '@/lib/inventory';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = route(async () => {
  await requireUser(['admin']);

  const [metrics, flow, activity] = await Promise.all([
    computeMetrics(),
    weeklyFlow(),
    listActivity(12),
  ]);

  return NextResponse.json({ metrics, weeklyFlow: flow, activity });
});
