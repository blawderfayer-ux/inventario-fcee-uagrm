import { HttpError } from './guard';

export interface ProductPayload {
  name?: string;
  category?: string;
  quantity?: number;
  unitPrice?: number;
  minStock?: number;
  unit?: string;
  imageUrl?: string;
  description?: string;
}

/**
 * Valida y limpia el cuerpo recibido al crear o editar un producto.
 * El SKU no viene del formulario: lo genera el servidor (ver `nextSku`).
 */
export function normalizePayload(body: ProductPayload) {
  const name = body.name?.trim();
  if (!name) throw new HttpError(400, 'El nombre del producto es obligatorio.');

  const quantity = Number(body.quantity ?? 0);
  const unitPrice = Number(body.unitPrice ?? 0);
  const minStock = Number(body.minStock ?? 0);

  if (!Number.isFinite(quantity) || quantity < 0) {
    throw new HttpError(400, 'La cantidad debe ser un número mayor o igual a 0.');
  }
  if (!Number.isFinite(unitPrice) || unitPrice < 0) {
    throw new HttpError(400, 'El precio unitario debe ser un número mayor o igual a 0.');
  }
  if (!Number.isFinite(minStock) || minStock < 0) {
    throw new HttpError(400, 'El stock mínimo debe ser un número mayor o igual a 0.');
  }

  return {
    name,
    category: body.category?.trim() || 'Papelería',
    quantity: Math.floor(quantity),
    unitPrice: Math.round(unitPrice * 100) / 100,
    minStock: Math.floor(minStock),
    unit: body.unit?.trim() || 'unidad',
    imageUrl: body.imageUrl?.trim() ?? '',
    description: body.description?.trim() ?? '',
  };
}
