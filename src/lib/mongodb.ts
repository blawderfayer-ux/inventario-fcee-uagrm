import { MongoClient, type Db, type Collection, type Document } from 'mongodb';

// En desarrollo Next.js recarga los módulos en cada cambio; cachear el cliente en
// globalThis evita abrir una conexión nueva por recarga y agotar el pool de Atlas.
const globalForMongo = globalThis as unknown as {
  _mongoClientPromise?: Promise<MongoClient>;
};

/**
 * La conexión se abre en la primera consulta, no al importar el módulo: así
 * `next build` puede analizar las rutas sin necesitar credenciales de MongoDB.
 */
export function getClient(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      'Falta la variable de entorno MONGODB_URI. Copia .env.example a .env.local y complétala.'
    );
  }
  return (globalForMongo._mongoClientPromise ??= new MongoClient(uri, {
    maxPoolSize: 10,
  }).connect());
}

export async function getDb(): Promise<Db> {
  const client = await getClient();
  return client.db(process.env.MONGODB_DB ?? 'inventario_fcee');
}

export async function collection<T extends Document>(name: string): Promise<Collection<T>> {
  const db = await getDb();
  return db.collection<T>(name);
}

export const COLLECTIONS = {
  products: 'products',
  users: 'users',
  movements: 'movements',
  categories: 'categories',
} as const;

let indexesReady: Promise<void> | null = null;

/** Crea los índices una sola vez por proceso. Idempotente. */
export function ensureIndexes(): Promise<void> {
  indexesReady ??= (async () => {
    const db = await getDb();
    await Promise.all([
      db.collection(COLLECTIONS.products).createIndex({ sku: 1 }, { unique: true }),
      db.collection(COLLECTIONS.products).createIndex({ name: 'text', sku: 'text' }),
      db.collection(COLLECTIONS.products).createIndex({ category: 1 }),
      db.collection(COLLECTIONS.users).createIndex({ email: 1 }, { unique: true }),
      db.collection(COLLECTIONS.movements).createIndex({ createdAt: -1 }),
      db.collection(COLLECTIONS.movements).createIndex({ productId: 1 }),
      db.collection(COLLECTIONS.categories).createIndex({ name: 1 }, { unique: true }),
    ]);
  })().catch((err) => {
    // Si falla la creación de índices no queremos dejar la promesa rechazada en
    // caché para siempre: el siguiente request lo reintenta.
    indexesReady = null;
    throw err;
  });
  return indexesReady;
}
