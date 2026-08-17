import { NextResponse } from 'next/server';
import type { ObjectId } from 'mongodb';
import { COLLECTIONS, collection, ensureIndexes } from '@/lib/mongodb';
import { requireUser, route } from '@/lib/guard';
import {
  listProducts,
  nextSku,
  recordMovement,
  syncSkuCounter,
  toProduct,
  type ProductDoc,
} from '@/lib/inventory';
import { normalizePayload, type ProductPayload } from '@/lib/product-payload';

export const runtime = 'nodejs';

export const GET = route(async (req: Request) => {
  await requireUser();
  const url = new URL(req.url);
  const products = await listProducts({
    search: url.searchParams.get('search') ?? undefined,
    category: url.searchParams.get('category') ?? undefined,
  });
  return NextResponse.json({ products });
});

export const POST = route(async (req: Request) => {
  const user = await requireUser(['admin', 'stockkeeper']);
  await ensureIndexes();
  await syncSkuCounter();

  const data = normalizePayload((await req.json()) as ProductPayload);
  const products = await collection<ProductDoc>(COLLECTIONS.products);

  // El código se asigna solo, en orden de alta. Si el contador quedara
  // desfasado por datos cargados a mano, se salta hasta encontrar uno libre.
  let sku = await nextSku();
  while (await products.findOne({ sku })) {
    sku = await nextSku();
  }

  const now = new Date();
  const doc: ProductDoc = { ...data, sku, createdAt: now, updatedAt: now };
  const result = await products.insertOne(doc);
  const saved = { ...doc, _id: result.insertedId as ObjectId };

  if (data.quantity > 0) {
    await recordMovement({
      product: saved,
      action: 'ingreso',
      quantity: data.quantity,
      user,
      reason: 'Alta de producto en inventario',
    });
  }

  return NextResponse.json({ product: toProduct(saved) }, { status: 201 });
});
