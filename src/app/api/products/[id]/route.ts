import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { COLLECTIONS, collection } from '@/lib/mongodb';
import { HttpError, requireUser, route } from '@/lib/guard';
import { toProduct, recordMovement, type ProductDoc } from '@/lib/inventory';
import { deleteImageByUrl } from '@/lib/gridfs';
import { normalizePayload, type ProductPayload } from '@/lib/product-payload';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

async function findOr404(id: string) {
  if (!ObjectId.isValid(id)) throw new HttpError(404, 'Producto no encontrado.');
  const products = await collection<ProductDoc>(COLLECTIONS.products);
  const doc = await products.findOne({ _id: new ObjectId(id) });
  if (!doc) throw new HttpError(404, 'Producto no encontrado.');
  return { products, doc };
}

export const GET = route(async (_req: Request, ctx: Ctx) => {
  await requireUser();
  const { id } = await ctx.params;
  const { doc } = await findOr404(id);
  return NextResponse.json({ product: toProduct(doc) });
});

export const PATCH = route(async (req: Request, ctx: Ctx) => {
  const user = await requireUser(['admin', 'stockkeeper']);
  const { id } = await ctx.params;
  const { products, doc } = await findOr404(id);

  // El SKU se conserva: se asignó al dar de alta y no se edita.
  const data = normalizePayload((await req.json()) as ProductPayload);

  // Si el reponedor sustituyó la fotografía, la anterior deja de tener dueño.
  if (doc.imageUrl && doc.imageUrl !== data.imageUrl) {
    await deleteImageByUrl(doc.imageUrl);
  }

  const updated = { ...doc, ...data, updatedAt: new Date() };
  await products.updateOne({ _id: doc._id }, { $set: { ...data, updatedAt: updated.updatedAt } });

  const delta = data.quantity - doc.quantity;
  if (delta !== 0) {
    await recordMovement({
      product: updated,
      action: delta > 0 ? 'ingreso' : 'extracción',
      quantity: Math.abs(delta),
      user,
      reason: 'Ajuste manual de stock',
    });
  } else {
    await recordMovement({
      product: updated,
      action: 'modificación',
      quantity: 0,
      user,
      reason: 'Edición de datos del producto',
    });
  }

  return NextResponse.json({ product: toProduct(updated) });
});

/**
 * Elimina el producto junto con su historial de movimientos.
 *
 * La bitácora se borra a propósito: un movimiento sin producto deja de tener
 * categoría, y los cuadros de cierre lo arrastrarían como «Sin categoría» con
 * saldos iniciales negativos. Para conservar el historial, marque el producto
 * con stock 0 en lugar de eliminarlo.
 */
export const DELETE = route(async (_req: Request, ctx: Ctx) => {
  await requireUser(['admin', 'stockkeeper']);
  const { id } = await ctx.params;
  const { products, doc } = await findOr404(id);

  const movements = await collection(COLLECTIONS.movements);
  const { deletedCount } = await movements.deleteMany({ productId: doc._id });

  await products.deleteOne({ _id: doc._id });
  await deleteImageByUrl(doc.imageUrl);

  return NextResponse.json({ ok: true, movimientosEliminados: deletedCount ?? 0 });
});
