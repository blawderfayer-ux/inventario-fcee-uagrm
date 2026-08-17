import { COLLECTIONS, collection } from './mongodb';
import { toActivityItem, type MovementDoc, type ProductDoc } from './inventory';

export interface ReportRow {
  sku: string;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  minStock: number;
  unitPrice: number;
  totalValue: number;
  entradas: number;
  salidas: number;
  estado: 'Crítico' | 'Normal';
}

export interface ReportFilters {
  dateFrom: string;
  dateTo: string;
  category: string;
  type: 'all' | 'entradas' | 'salidas';
}

export function parseFilters(params: URLSearchParams): ReportFilters {
  const today = new Date().toISOString().slice(0, 10);
  const type = params.get('type');
  return {
    dateFrom: params.get('dateFrom') || today,
    dateTo: params.get('dateTo') || today,
    category: params.get('category') || 'Todas',
    type: type === 'entradas' || type === 'salidas' ? type : 'all',
  };
}

export interface ReportData {
  filters: ReportFilters;
  rows: ReportRow[];
  movements: ReturnType<typeof toActivityItem>[];
  totalValue: number;
  totalUnits: number;
  totalEntradas: number;
  totalSalidas: number;
  criticalCount: number;
  byCategory: { category: string; units: number; value: number; items: number }[];
}

/**
 * Arma el informe: existencias actuales por producto más los movimientos del
 * período, filtrados por categoría y tipo de movimiento.
 */
export async function buildReport(filters: ReportFilters): Promise<ReportData> {
  const products = await collection<ProductDoc>(COLLECTIONS.products);
  const movements = await collection<MovementDoc>(COLLECTIONS.movements);

  const productQuery: Record<string, unknown> = {};
  if (filters.category !== 'Todas') productQuery.category = filters.category;
  const productDocs = await products.find(productQuery).sort({ name: 1 }).toArray();

  const from = new Date(`${filters.dateFrom}T00:00:00`);
  const to = new Date(`${filters.dateTo}T23:59:59.999`);

  const movementQuery: Record<string, unknown> = { createdAt: { $gte: from, $lte: to } };
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
      minStock: p.minStock,
      unitPrice: p.unitPrice,
      totalValue: Math.round(p.quantity * p.unitPrice * 100) / 100,
      entradas: own.filter((m) => m.action === 'ingreso').reduce((acc, m) => acc + m.quantity, 0),
      salidas: own.filter((m) => m.action === 'extracción').reduce((acc, m) => acc + m.quantity, 0),
      estado: p.quantity <= p.minStock ? 'Crítico' : 'Normal',
    };
  });

  // Resumen por categoría: alimenta la hoja de gráficos del Excel.
  const catMap = new Map<string, { units: number; value: number; items: number }>();
  for (const r of rows) {
    const acc = catMap.get(r.category) ?? { units: 0, value: 0, items: 0 };
    acc.units += r.quantity;
    acc.value += r.totalValue;
    acc.items += 1;
    catMap.set(r.category, acc);
  }

  return {
    filters,
    rows,
    movements: movementDocs.map(toActivityItem),
    totalValue: Math.round(rows.reduce((acc, r) => acc + r.totalValue, 0) * 100) / 100,
    totalUnits: rows.reduce((acc, r) => acc + r.quantity, 0),
    totalEntradas: rows.reduce((acc, r) => acc + r.entradas, 0),
    totalSalidas: rows.reduce((acc, r) => acc + r.salidas, 0),
    criticalCount: rows.filter((r) => r.estado === 'Crítico').length,
    byCategory: [...catMap.entries()]
      .map(([category, v]) => ({ category, ...v }))
      .sort((a, b) => b.value - a.value),
  };
}
