import { NextResponse } from 'next/server';
import { COLLECTIONS, collection, ensureIndexes } from '@/lib/mongodb';
import { HttpError, requireUser, route } from '@/lib/guard';
import { listCategories } from '@/lib/inventory';
import { DEFAULT_CATEGORIES } from '@/lib/types';

export const runtime = 'nodejs';

export const GET = route(async () => {
  await requireUser();
  const categories = await listCategories();
  return NextResponse.json({
    categories: categories.length ? categories : DEFAULT_CATEGORIES,
  });
});

export const POST = route(async (req: Request) => {
  await requireUser(['admin', 'stockkeeper']);
  await ensureIndexes();

  const body = (await req.json()) as { name?: string };
  const name = body.name?.trim();
  if (!name) throw new HttpError(400, 'El nombre de la categoría es obligatorio.');

  const categories = await collection<{ name: string; createdAt: Date }>(COLLECTIONS.categories);
  await categories.updateOne(
    { name },
    { $setOnInsert: { name, createdAt: new Date() } },
    { upsert: true }
  );

  return NextResponse.json({ categories: await listCategories() }, { status: 201 });
});

export const DELETE = route(async (req: Request) => {
  await requireUser(['admin', 'stockkeeper']);

  const name = new URL(req.url).searchParams.get('name')?.trim();
  if (!name) throw new HttpError(400, 'Indique la categoría a eliminar.');

  const products = await collection(COLLECTIONS.products);
  const inUse = await products.countDocuments({ category: name });
  if (inUse > 0) {
    throw new HttpError(
      409,
      `No se puede eliminar "${name}": ${inUse} producto(s) la están usando.`
    );
  }

  const categories = await collection<{ name: string }>(COLLECTIONS.categories);
  await categories.deleteOne({ name });

  return NextResponse.json({ categories: await listCategories() });
});
