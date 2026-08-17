import { COLLECTIONS, collection } from './mongodb';
import { escapeRegex, toActivityItem, type MovementDoc, type ProductDoc } from './inventory';

export interface ReportRow {
  sku: string;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalValue: number;
  entradas: number;
  salidas: number;
}

export interface ReportFilters {
  dateFrom: string;
  dateTo: string;
  category: string;
  department: string;
  type: 'all' | 'entradas' | 'salidas';
}

export function parseFilters(params: URLSearchParams): ReportFilters {
  const today = new Date().toISOString().slice(0, 10);
  const type = params.get('type');
  return {
    dateFrom: params.get('dateFrom') || today,
    dateTo: params.get('dateTo') || today,
    category: params.get('category') || 'Todas',
    department: params.get('department') || 'Todos los departamentos',
    type: type === 'entradas' || type === 'salidas' ? type : 'all',
  };
}

/**
 * Arma el reporte: existencias actuales por producto más los movimientos del
 * período, filtrados por categoría, departamento y tipo de movimiento.
 */
export async function buildReport(filters: ReportFilters) {
  const products = await collection<ProductDoc>(COLLECTIONS.products);
  const movements = await collection<MovementDoc>(COLLECTIONS.movements);

  const productQuery: Record<string, unknown> = {};
  if (filters.category !== 'Todas') productQuery.category = filters.category;
  const productDocs = await products.find(productQuery).sort({ name: 1 }).toArray();

  const from = new Date(`${filters.dateFrom}T00:00:00`);
  const to = new Date(`${filters.dateTo}T23:59:59.999`);

  const movementQuery: Record<string, unknown> = { createdAt: { $gte: from, $lte: to } };
  if (filters.department !== 'Todos los departamentos') {
    movementQuery.department = new RegExp(`^${escapeRegex(filters.department)}$`, 'i');
  }
  if (filters.type === 'entradas') movementQuery.action = 'ingreso';
  if (filters.type === 'salidas') movementQuery.action = 'extracción';
  if (filters.category !== 'Todas') {
    movementQuery.productId = { $in: productDocs.map((p) => p._id) };
  }

  const movementDocs = await movements.find(movementQuery).sort({ createdAt: -1 }).toArray();

  const rows: ReportRow[] = productDocs.map((p) => {
    const own = movementDocs.filter((m) => m.productId.equals(p._id));
    return {
      sku: p.sku,
      name: p.name,
      category: p.category,
      unit: p.unit,
      quantity: p.quantity,
      unitPrice: p.unitPrice,
      totalValue: Math.round(p.quantity * p.unitPrice * 100) / 100,
      entradas: own.filter((m) => m.action === 'ingreso').reduce((acc, m) => acc + m.quantity, 0),
      salidas: own.filter((m) => m.action === 'extracción').reduce((acc, m) => acc + m.quantity, 0),
    };
  });

  return {
    filters,
    rows,
    movements: movementDocs.map(toActivityItem),
    totalValue: Math.round(rows.reduce((acc, r) => acc + r.totalValue, 0) * 100) / 100,
    totalUnits: rows.reduce((acc, r) => acc + r.quantity, 0),
  };
}
