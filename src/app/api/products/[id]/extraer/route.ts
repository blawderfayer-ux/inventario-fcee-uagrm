import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { COLLECTIONS, collection } from '@/lib/mongodb';
import { HttpError, requireUser, route } from '@/lib/guard';
import { toProduct, recordMovement, type ProductDoc } from '@/lib/inventory';

export const runtime = 'nodejs';

/**
 * Registra el retiro de material desde el kiosco.
 *
 * El descuento se hace con findOneAndUpdate condicionado a que todavía haya
 * stock suficiente, de modo que dos retiros simultáneos del mismo producto no
 * puedan dejar la cantidad en negativo.
 */
export const POST = route(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await ctx.params;

  if (!ObjectId.isValid(id)) throw new HttpError(404, 'Producto no encontrado.');

  const body = (await req.json()) as { quantity?: number; reason?: string };
  const quantity = Math.floor(Number(body.quantity ?? 0));
  const reason = body.reason?.trim() ?? '';

  if (!Number.isFinite(quantity) || quantity < 1) {
    throw new HttpError(400, 'La cantidad a retirar debe ser al menos 1.');
  }
  if (!reason) {
    throw new HttpError(400, 'Debe indicar el motivo de la extracción.');
  }

  const products = await collection<ProductDoc>(COLLECTIONS.products);
  const updated = await products.findOneAndUpdate(
    { _id: new ObjectId(id), quantity: { $gte: quantity } },
    { $inc: { quantity: -quantity }, $set: { updatedAt: new Date() } },
    { returnDocument: 'after' }
  );

  if (!updated) {
    const exists = await products.findOne({ _id: new ObjectId(id) });
    if (!exists) throw new HttpError(404, 'Producto no encontrado.');
    throw new HttpError(
      409,
      `Stock insuficiente: quedan ${exists.quantity} ${exists.unit}(s) disponibles.`
    );
  }

  await recordMovement({
    product: updated,
    action: 'extracción',
    quantity,
    user,
    reason,
  });

  return NextResponse.json({ product: toProduct(updated) });
});
