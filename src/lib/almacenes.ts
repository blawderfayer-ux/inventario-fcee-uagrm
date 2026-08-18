import { COLLECTIONS, collection } from './mongodb';
import { listCategories, type MovementDoc, type ProductDoc } from './inventory';

/**
 * Cuadros oficiales de cierre de gestión:
 *   · Cuadro 6 (DGCF-R1.06) — Detalle de Almacenes, una fila por categoría.
 *   · Cuadro 5 (DGCF-R1.05) — Resumen de Almacenes, agregado por partida.
 *
 * Ambos cumplen la identidad contable  Saldo Inicial + Entradas − Salidas =
 * Saldo Final, tanto en cantidades como en valores.
 */

export interface DetalleRow {
  n: number;
  category: string;
  partida: string;
  unit: string;
  qtyInitial: number;
  qtyIn: number;
  qtyOut: number;
  qtyFinal: number;
  valInitial: number;
  valIn: number;
  valOut: number;
  valFinal: number;
}

export interface ResumenRow {
  n: number;
  partida: string;
  qtyInitial: number;
  valInitial: number;
  qtyFinal: number;
  valFinal: number;
}

export interface Totals {
  qtyInitial: number;
  qtyIn: number;
  qtyOut: number;
  qtyFinal: number;
  valInitial: number;
  valIn: number;
  valOut: number;
  valFinal: number;
}

export interface AlmacenesReport {
  year: number;
  from: string;
  to: string;
  detalle: DetalleRow[];
  resumen: ResumenRow[];
  totals: Totals;
  /** Categorías sin partida asignada; el Cuadro 5 las agrupa aparte. */
  sinPartida: string[];
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function parseYear(params: URLSearchParams): number {
  const raw = Number(params.get('year'));
  const current = new Date().getFullYear();
  if (!Number.isFinite(raw) || raw < 2000 || raw > current + 1) return current;
  return Math.floor(raw);
}

/**
 * Construye ambos cuadros para una gestión completa (1 de enero al 31 de
 * diciembre del año indicado).
 *
 * El saldo final se obtiene revirtiendo, sobre las existencias actuales, los
 * movimientos posteriores al cierre; el saldo inicial se deduce después por la
 * identidad contable. Así los cuadros cuadran aunque se emitan meses después.
 */
export async function buildAlmacenesReport(year: number): Promise<AlmacenesReport> {
  const start = new Date(year, 0, 1, 0, 0, 0, 0);
  const end = new Date(year, 11, 31, 23, 59, 59, 999);

  const products = await collection<ProductDoc>(COLLECTIONS.products);
  const movements = await collection<MovementDoc>(COLLECTIONS.movements);

  const productDocs = await products.find({}).toArray();
  const categoryOf = new Map(productDocs.map((p) => [p._id.toString(), p.category]));

  const partidaOf = new Map((await listCategories()).map((c) => [c.name, c.partida]));

  // Existencias actuales por categoría, en cantidad y en valor.
  const qtyFinal = new Map<string, number>();
  const valFinal = new Map<string, number>();
  for (const p of productDocs) {
    qtyFinal.set(p.category, (qtyFinal.get(p.category) ?? 0) + p.quantity);
    valFinal.set(p.category, (valFinal.get(p.category) ?? 0) + p.quantity * p.unitPrice);
  }

  // Se revierten los movimientos posteriores al cierre para volver al 31/12.
  const after = await movements.find({ createdAt: { $gt: end } }).toArray();
  for (const m of after) {
    const cat = m.category ?? categoryOf.get(m.productId.toString()) ?? 'Sin categoría';
    const sign = m.action === 'ingreso' ? -1 : m.action === 'extracción' ? 1 : 0;
    if (sign === 0) continue;
    qtyFinal.set(cat, (qtyFinal.get(cat) ?? 0) + sign * m.quantity);
    valFinal.set(cat, (valFinal.get(cat) ?? 0) + sign * m.quantity * m.unitPrice);
  }

  // Movimientos de la gestión.
  const inPeriod = await movements
    .find({ createdAt: { $gte: start, $lte: end } })
    .toArray();

  const qtyIn = new Map<string, number>();
  const qtyOut = new Map<string, number>();
  const valIn = new Map<string, number>();
  const valOut = new Map<string, number>();

  for (const m of inPeriod) {
    const cat = m.category ?? categoryOf.get(m.productId.toString()) ?? 'Sin categoría';
    const amount = m.quantity * m.unitPrice;
    if (m.action === 'ingreso') {
      qtyIn.set(cat, (qtyIn.get(cat) ?? 0) + m.quantity);
      valIn.set(cat, (valIn.get(cat) ?? 0) + amount);
    } else if (m.action === 'extracción') {
      qtyOut.set(cat, (qtyOut.get(cat) ?? 0) + m.quantity);
      valOut.set(cat, (valOut.get(cat) ?? 0) + amount);
    }
  }

  const names = new Set<string>([
    ...qtyFinal.keys(),
    ...qtyIn.keys(),
    ...qtyOut.keys(),
  ]);

  const detalle: DetalleRow[] = [...names]
    .sort((a, b) => a.localeCompare(b, 'es'))
    .map((category, i) => {
      const qf = qtyFinal.get(category) ?? 0;
      const qi = qtyIn.get(category) ?? 0;
      const qo = qtyOut.get(category) ?? 0;
      const vf = valFinal.get(category) ?? 0;
      const vi = valIn.get(category) ?? 0;
      const vo = valOut.get(category) ?? 0;
      return {
        n: i + 1,
        category,
        partida: partidaOf.get(category) ?? '',
        unit: 'Unidad',
        qtyInitial: qf - qi + qo,
        qtyIn: qi,
        qtyOut: qo,
        qtyFinal: qf,
        valInitial: round2(vf - vi + vo),
        valIn: round2(vi),
        valOut: round2(vo),
        valFinal: round2(vf),
      };
    });

  // Cuadro 5: mismas cifras agregadas por partida presupuestaria.
  const byPartida = new Map<string, ResumenRow>();
  for (const r of detalle) {
    const key = r.partida || 'SIN_PARTIDA';
    const acc =
      byPartida.get(key) ??
      { n: 0, partida: r.partida, qtyInitial: 0, valInitial: 0, qtyFinal: 0, valFinal: 0 };
    acc.qtyInitial += r.qtyInitial;
    acc.valInitial = round2(acc.valInitial + r.valInitial);
    acc.qtyFinal += r.qtyFinal;
    acc.valFinal = round2(acc.valFinal + r.valFinal);
    byPartida.set(key, acc);
  }

  const resumen = [...byPartida.entries()]
    .sort(([a], [b]) => (a === 'SIN_PARTIDA' ? 1 : b === 'SIN_PARTIDA' ? -1 : a.localeCompare(b)))
    .map(([, row], i) => ({ ...row, n: i + 1 }));

  const sum = (pick: (r: DetalleRow) => number) => detalle.reduce((a, r) => a + pick(r), 0);

  return {
    year,
    from: `01/01/${year}`,
    to: `31/12/${year}`,
    detalle,
    resumen,
    totals: {
      qtyInitial: sum((r) => r.qtyInitial),
      qtyIn: sum((r) => r.qtyIn),
      qtyOut: sum((r) => r.qtyOut),
      qtyFinal: sum((r) => r.qtyFinal),
      valInitial: round2(sum((r) => r.valInitial)),
      valIn: round2(sum((r) => r.valIn)),
      valOut: round2(sum((r) => r.valOut)),
      valFinal: round2(sum((r) => r.valFinal)),
    },
    sinPartida: detalle.filter((r) => !r.partida).map((r) => r.category),
  };
}
