import { ObjectId, type WithId } from 'mongodb';
import { COLLECTIONS, collection, ensureIndexes } from './mongodb';
import { formatDateTime } from './users';
import type {
  ActivityItem,
  CategoryItem,
  Metrics,
  MovementAction,
  Product,
  WeeklyFlowPoint,
} from './types';

export interface ProductDoc {
  _id?: ObjectId;
  sku: string;
  name: string;
  category: string;
  quantity: number;
  unitPrice: number;
  minStock: number;
  unit: string;
  imageUrl: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MovementDoc {
  _id?: ObjectId;
  productId: ObjectId;
  productName: string;
  sku: string;
  action: MovementAction;
  quantity: number;
  unit: string;
  unitPrice: number;
  /** Categoría del producto al momento del movimiento. */
  category?: string;
  userId: string;
  userName: string;
  department: string;
  reason?: string;
  createdAt: Date;
}

export function toProduct(doc: WithId<ProductDoc>): Product {
  return {
    id: doc._id.toString(),
    sku: doc.sku,
    name: doc.name,
    category: doc.category,
    quantity: doc.quantity,
    unitPrice: doc.unitPrice,
    minStock: doc.minStock,
    unit: doc.unit,
    imageUrl: doc.imageUrl,
    description: doc.description,
    lastUpdated: formatDateTime(doc.updatedAt),
  };
}

function minutesSince(date: Date): number {
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
}

export function toActivityItem(doc: WithId<MovementDoc>): ActivityItem {
  return {
    id: doc._id.toString(),
    user: doc.userName,
    action: doc.action,
    product: doc.productName,
    quantity: doc.quantity,
    unit: doc.unit,
    department: doc.department,
    time: doc.createdAt.toLocaleTimeString('es-BO', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }),
    minutesAgo: minutesSince(doc.createdAt),
    reason: doc.reason,
  };
}

export async function listProducts(filter?: {
  search?: string;
  category?: string;
}): Promise<Product[]> {
  await ensureIndexes();
  const products = await collection<ProductDoc>(COLLECTIONS.products);

  const query: Record<string, unknown> = {};
  if (filter?.category && filter.category !== 'Todas') {
    query.category = filter.category;
  }
  if (filter?.search?.trim()) {
    const rx = new RegExp(escapeRegex(filter.search.trim()), 'i');
    query.$or = [{ name: rx }, { sku: rx }];
  }

  const docs = await products.find(query).sort({ name: 1 }).toArray();
  return docs.map(toProduct);
}

export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function getProduct(id: string): Promise<Product | null> {
  if (!ObjectId.isValid(id)) return null;
  const products = await collection<ProductDoc>(COLLECTIONS.products);
  const doc = await products.findOne({ _id: new ObjectId(id) });
  return doc ? toProduct(doc) : null;
}

export async function recordMovement(input: {
  product: WithId<ProductDoc>;
  action: MovementAction;
  quantity: number;
  user: { id: string; name: string; department: string };
  reason?: string;
}): Promise<void> {
  const movements = await collection<MovementDoc>(COLLECTIONS.movements);
  await movements.insertOne({
    productId: input.product._id,
    productName: input.product.name,
    sku: input.product.sku,
    action: input.action,
    quantity: input.quantity,
    unit: input.product.unit,
    unitPrice: input.product.unitPrice,
    category: input.product.category,
    userId: input.user.id,
    userName: input.user.name,
    department: input.user.department,
    reason: input.reason,
    createdAt: new Date(),
  });
}

export async function listActivity(limit = 12): Promise<ActivityItem[]> {
  const movements = await collection<MovementDoc>(COLLECTIONS.movements);
  const docs = await movements.find({}).sort({ createdAt: -1 }).limit(limit).toArray();
  return docs.map(toActivityItem);
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function computeMetrics(): Promise<Metrics> {
  const products = await collection<ProductDoc>(COLLECTIONS.products);
  const movements = await collection<MovementDoc>(COLLECTIONS.movements);

  const [totals] = await products
    .aggregate<{ totalStock: number; totalValue: number }>([
      {
        $group: {
          _id: null,
          totalStock: { $sum: '$quantity' },
          totalValue: { $sum: { $multiply: ['$quantity', '$unitPrice'] } },
        },
      },
    ])
    .toArray();

  const criticalAlerts = await products.countDocuments({
    $expr: { $lte: ['$quantity', '$minStock'] },
  });

  const today = startOfToday();
  const todayAgg = await movements
    .aggregate<{ _id: MovementAction; count: number; units: number }>([
      { $match: { createdAt: { $gte: today } } },
      { $group: { _id: '$action', count: { $sum: 1 }, units: { $sum: '$quantity' } } },
    ])
    .toArray();

  const entriesToday = todayAgg.find((a) => a._id === 'ingreso')?.count ?? 0;
  const exitsToday = todayAgg.find((a) => a._id === 'extracción')?.count ?? 0;
  const unitsToday =
    (todayAgg.find((a) => a._id === 'ingreso')?.units ?? 0) -
    (todayAgg.find((a) => a._id === 'extracción')?.units ?? 0);

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [weekValue] = await movements
    .aggregate<{ delta: number }>([
      { $match: { createdAt: { $gte: weekAgo } } },
      {
        $group: {
          _id: null,
          delta: {
            $sum: {
              $multiply: [
                { $multiply: ['$quantity', '$unitPrice'] },
                { $cond: [{ $eq: ['$action', 'ingreso'] }, 1, -1] },
              ],
            },
          },
        },
      },
    ])
    .toArray();

  return {
    totalStock: totals?.totalStock ?? 0,
    totalValue: totals?.totalValue ?? 0,
    movementsToday: todayAgg.reduce((acc, a) => acc + a.count, 0),
    criticalAlerts,
    entriesToday,
    exitsToday,
    unitsToday,
    valueDeltaWeek: weekValue?.delta ?? 0,
  };
}

const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

/** Entradas vs. salidas de los últimos 7 días, en orden cronológico. */
export async function weeklyFlow(): Promise<WeeklyFlowPoint[]> {
  const movements = await collection<MovementDoc>(COLLECTIONS.movements);
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  from.setDate(from.getDate() - 6);

  const rows = await movements
    .aggregate<{ _id: { day: string; action: MovementAction }; units: number }>([
      { $match: { createdAt: { $gte: from } } },
      {
        $group: {
          _id: {
            day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            action: '$action',
          },
          units: { $sum: '$quantity' },
        },
      },
    ])
    .toArray();

  const points: WeeklyFlowPoint[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(from);
    date.setDate(from.getDate() + i);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
      date.getDate()
    ).padStart(2, '0')}`;
    points.push({
      dia: DAY_LABELS[date.getDay()],
      entradas: rows.find((r) => r._id.day === key && r._id.action === 'ingreso')?.units ?? 0,
      salidas: rows.find((r) => r._id.day === key && r._id.action === 'extracción')?.units ?? 0,
    });
  }
  return points;
}

export interface CategoryDoc {
  name: string;
  /** Partida presupuestaria del clasificador de gastos (ej. 39100). */
  partida?: string;
  createdAt?: Date;
}

export async function listCategories(): Promise<CategoryItem[]> {
  const categories = await collection<CategoryDoc>(COLLECTIONS.categories);
  const docs = await categories.find({}).sort({ name: 1 }).toArray();
  return docs.map((d) => ({ name: d.name, partida: d.partida ?? '' }));
}

/**
 * Genera el siguiente código de producto en orden de alta: FCEE-0001,
 * FCEE-0002, etc. El contador se incrementa de forma atómica con
 * findOneAndUpdate, así dos altas simultáneas nunca reciben el mismo código.
 */
export async function nextSku(): Promise<string> {
  const counters = await collection<{ _id: string; seq: number }>(COLLECTIONS.counters);
  const result = await counters.findOneAndUpdate(
    { _id: 'sku' },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: 'after' }
  );
  const seq = result?.seq ?? 1;
  return `FCEE-${String(seq).padStart(4, '0')}`;
}

/**
 * Alinea el contador con los productos ya existentes. Se llama antes de la
 * primera generación para que los datos cargados por el seed no choquen con
 * los códigos nuevos.
 */
export async function syncSkuCounter(): Promise<void> {
  const counters = await collection<{ _id: string; seq: number }>(COLLECTIONS.counters);
  if (await counters.findOne({ _id: 'sku' })) return;

  const products = await collection<ProductDoc>(COLLECTIONS.products);
  const total = await products.countDocuments();
  await counters.updateOne(
    { _id: 'sku' },
    { $setOnInsert: { seq: total } },
    { upsert: true }
  );
}
