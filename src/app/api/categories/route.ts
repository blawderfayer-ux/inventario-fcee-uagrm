import { NextResponse } from 'next/server';
import { COLLECTIONS, collection, ensureIndexes } from '@/lib/mongodb';
import { HttpError, requireUser, route } from '@/lib/guard';
import { listCategories, type CategoryDoc } from '@/lib/inventory';
import { DEFAULT_CATEGORIES } from '@/lib/types';

export const runtime = 'nodejs';

/** La partida es el código del clasificador de gastos: 3 a 6 dígitos. */
function normalizePartida(value: string | undefined): string {
  const partida = (value ?? '').trim();
  if (!partida) return '';
  if (!/^\d{3,6}$/.test(partida)) {
    throw new HttpError(400, 'La partida debe ser un código numérico de 3 a 6 dígitos.');
  }
  return partida;
}

export const GET = route(async () => {
  await requireUser();
  const categories = await listCategories();
  return NextResponse.json({
    categories: categories.length
      ? categories
      : DEFAULT_CATEGORIES.map((name) => ({ name, partida: '' })),
  });
});

export const POST = route(async (req: Request) => {
  await requireUser(['admin', 'stockkeeper']);
  await ensureIndexes();

  const body = (await req.json()) as { name?: string; partida?: string };
  const name = body.name?.trim();
  if (!name) throw new HttpError(400, 'El nombre de la categoría es obligatorio.');
  const partida = normalizePartida(body.partida);

  const categories = await collection<CategoryDoc>(COLLECTIONS.categories);
  await categories.updateOne(
    { name },
    { $set: { partida }, $setOnInsert: { name, createdAt: new Date() } },
    { upsert: true }
  );

  return NextResponse.json({ categories: await listCategories() }, { status: 201 });
});

/** Actualiza únicamente la partida presupuestaria de una categoría existente. */
export const PATCH = route(async (req: Request) => {
  await requireUser(['admin', 'stockkeeper']);

  const body = (await req.json()) as { name?: string; partida?: string };
  const name = body.name?.trim();
  if (!name) throw new HttpError(400, 'Indique la categoría a modificar.');
  const partida = normalizePartida(body.partida);

  const categories = await collection<CategoryDoc>(COLLECTIONS.categories);
  const res = await categories.updateOne({ name }, { $set: { partida } });
  if (res.matchedCount === 0) {
    throw new HttpError(404, `La categoría "${name}" no existe.`);
  }

  return NextResponse.json({ categories: await listCategories() });
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

  const categories = await collection<CategoryDoc>(COLLECTIONS.categories);
  await categories.deleteOne({ name });

  return NextResponse.json({ categories: await listCategories() });
});
