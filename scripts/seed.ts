/**
 * Carga datos iniciales en MongoDB: categorías y un catálogo de productos de
 * ejemplo. Es idempotente — vuelve a ejecutarse sin duplicar nada.
 *
 *   npm run seed
 */
import { config } from 'dotenv';
import { MongoClient } from 'mongodb';

config({ path: '.env.local' });
config({ path: '.env' });

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB ?? 'inventario_fcee';

if (!uri) {
  console.error('Falta MONGODB_URI. Copia .env.example a .env.local y complétalo.');
  process.exit(1);
}

// Categorías de almacén con su partida presupuestaria, según los cuadros de
// cierre de gestión de la Facultad (DGCF-R1.05 / R1.06).
const CATEGORIES: { name: string; partida: string }[] = [
  { name: 'Material de Limpieza', partida: '39100' },
  { name: 'Material de Papelería', partida: '32100' },
  { name: 'Material de Bioseguridad', partida: '39990' },
  { name: 'Material de Escritorio', partida: '39500' },
];

const PRODUCTS = [
  {
    name: 'Resma de Papel A4 75g',
    category: 'Material de Papelería',
    quantity: 48,
    unitPrice: 32.5,
    minStock: 20,
    unit: 'resma',
    description:
      'Papel bond A4 75g/m², 500 hojas por resma. Para uso general en impresoras láser e inyección de tinta.',
  },
  {
    name: 'Bolígrafo Bic Azul',
    category: 'Material de Escritorio',
    quantity: 12,
    unitPrice: 1.2,
    minStock: 50,
    unit: 'unidad',
    description:
      'Bolígrafo punta fina 0.7mm, tinta azul de secado rápido. Cuerpo transparente con capuchón.',
  },
  {
    name: 'Tóner HP 85A Negro',
    category: 'Material de Escritorio',
    quantity: 4,
    unitPrice: 285.0,
    minStock: 5,
    unit: 'cartucho',
    description:
      'Cartucho HP 85A (CE285A), rendimiento aprox. 1600 páginas al 5% de cobertura. Compatible LaserJet P1102.',
  },
  {
    name: 'Archivador de Palanca A4',
    category: 'Material de Escritorio',
    quantity: 65,
    unitPrice: 18.5,
    minStock: 30,
    unit: 'unidad',
    description:
      'Archivador de palanca lomo ancho 7.5 cm. Forro plástico azul oscuro. Capacidad 350 hojas.',
  },
  {
    name: 'Folder Manila F/C',
    category: 'Material de Papelería',
    quantity: 320,
    unitPrice: 0.45,
    minStock: 100,
    unit: 'unidad',
    description: 'Folder manila tamaño oficio F/C, 150g, color natural. Resistente a la humedad.',
  },
  {
    name: 'USB Kingston 8GB',
    category: 'Material de Escritorio',
    quantity: 9,
    unitPrice: 22.0,
    minStock: 10,
    unit: 'unidad',
    description:
      'Kingston DataTraveler 8GB USB 2.0. Transferencia hasta 40 MB/s. Diseño compacto sin capuchón.',
  },
  {
    name: 'Marcador Permanente Negro',
    category: 'Material de Escritorio',
    quantity: 38,
    unitPrice: 8.5,
    minStock: 20,
    unit: 'unidad',
    description:
      'Marcador permanente punta fina. Tinta resistente al agua, compatible con papel, plástico y cartón.',
  },
  {
    name: 'Detergente en Polvo 1kg',
    category: 'Material de Limpieza',
    quantity: 24,
    unitPrice: 18.0,
    minStock: 10,
    unit: 'bolsa',
    description: 'Detergente en polvo multiuso, bolsa de 1 kg. Para limpieza general de ambientes.',
  },
  {
    name: 'Lavandina 2 litros',
    category: 'Material de Limpieza',
    quantity: 8,
    unitPrice: 12.5,
    minStock: 12,
    unit: 'botella',
    description: 'Hipoclorito de sodio al 5%, botella de 2 litros. Desinfección de superficies.',
  },
  {
    name: 'Alcohol en Gel 1 litro',
    category: 'Material de Bioseguridad',
    quantity: 30,
    unitPrice: 25.0,
    minStock: 15,
    unit: 'botella',
    description: 'Alcohol en gel al 70%, botella de 1 litro con dosificador.',
  },
  {
    name: 'Barbijo Quirúrgico Triple Capa',
    category: 'Material de Bioseguridad',
    quantity: 200,
    unitPrice: 1.5,
    minStock: 100,
    unit: 'unidad',
    description: 'Barbijo descartable de triple capa con elástico. Caja de 50 unidades.',
  },
  {
    name: 'Grapas Estándar 26/6',
    category: 'Material de Escritorio',
    quantity: 150,
    unitPrice: 4.8,
    minStock: 50,
    unit: 'caja',
    description:
      'Caja de grapas estándar 26/6 galvanizadas. 1000 unidades por caja. Para grapadoras de escritorio.',
  },
];

async function main() {
  const client = new MongoClient(uri!);
  await client.connect();
  const db = client.db(dbName);
  const now = new Date();

  await db.collection('categories').createIndex({ name: 1 }, { unique: true });
  await db.collection('products').createIndex({ sku: 1 }, { unique: true });
  await db.collection('users').createIndex({ email: 1 }, { unique: true });
  await db.collection('movements').createIndex({ createdAt: -1 });

  for (const { name, partida } of CATEGORIES) {
    await db
      .collection('categories')
      .updateOne(
        { name },
        { $set: { partida }, $setOnInsert: { name, createdAt: now } },
        { upsert: true }
      );
  }

  // Los códigos se asignan en orden: FCEE-0001, FCEE-0002, ...
  let created = 0;
  let seq = 0;
  for (const p of PRODUCTS) {
    seq++;
    const sku = `FCEE-${String(seq).padStart(4, '0')}`;
    const res = await db.collection('products').updateOne(
      { name: p.name },
      { $setOnInsert: { ...p, sku, imageUrl: '', createdAt: now, updatedAt: now } },
      { upsert: true }
    );
    if (res.upsertedCount) created++;
  }

  // El contador queda alineado con lo que ya existe en la colección.
  const totalProducts = await db.collection('products').countDocuments();
  await db
    .collection('counters')
    .updateOne({ _id: 'sku' as never }, { $set: { seq: totalProducts } }, { upsert: true });

  const admins = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  for (const email of admins) {
    await db.collection('users').updateOne(
      { email },
      {
        $set: { role: 'admin', status: 'active', updatedAt: now },
        $setOnInsert: {
          email,
          name: email.split('@')[0],
          department: 'Decanato FCEE',
          lastLogin: null,
          createdAt: now,
        },
      },
      { upsert: true }
    );
  }

  console.log(`Categorías: ${CATEGORIES.length} aseguradas.`);
  console.log(`Productos: ${created} creados, ${PRODUCTS.length - created} ya existían.`);
  console.log(
    admins.length
      ? `Administradores asegurados: ${admins.join(', ')}`
      : 'Sin ADMIN_EMAILS: el primer usuario que inicie sesión será admin.'
  );

  await client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
