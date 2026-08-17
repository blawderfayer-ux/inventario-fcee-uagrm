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

const CATEGORIES = ['Papelería', 'Escritura', 'Impresión', 'Archivo', 'Oficina', 'Tecnología'];

const PRODUCTS = [
  {
    sku: 'PAP-A4-75',
    name: 'Resma de Papel A4 75g',
    category: 'Papelería',
    quantity: 48,
    unitPrice: 32.5,
    minStock: 20,
    unit: 'resma',
    location: 'Almacén A – Estante 01',
    description:
      'Papel bond A4 75g/m², 500 hojas por resma. Para uso general en impresoras láser e inyección de tinta.',
  },
  {
    sku: 'BOL-BIC-AZ',
    name: 'Bolígrafo Bic Azul',
    category: 'Escritura',
    quantity: 12,
    unitPrice: 1.2,
    minStock: 50,
    unit: 'unidad',
    location: 'Almacén A – Estante 03',
    description:
      'Bolígrafo punta fina 0.7mm, tinta azul de secado rápido. Cuerpo transparente con capuchón.',
  },
  {
    sku: 'TON-HP85A',
    name: 'Tóner HP 85A Negro',
    category: 'Impresión',
    quantity: 4,
    unitPrice: 285.0,
    minStock: 5,
    unit: 'cartucho',
    location: 'Almacén B – Estante 02',
    description:
      'Cartucho HP 85A (CE285A), rendimiento aprox. 1600 páginas al 5% de cobertura. Compatible LaserJet P1102.',
  },
  {
    sku: 'ARC-OFIC-A4',
    name: 'Archivador de Palanca A4',
    category: 'Archivo',
    quantity: 65,
    unitPrice: 18.5,
    minStock: 30,
    unit: 'unidad',
    location: 'Almacén A – Estante 05',
    description:
      'Archivador de palanca lomo ancho 7.5 cm. Forro plástico azul oscuro. Capacidad 350 hojas.',
  },
  {
    sku: 'FOL-MAN-FC',
    name: 'Folder Manila F/C',
    category: 'Papelería',
    quantity: 320,
    unitPrice: 0.45,
    minStock: 100,
    unit: 'unidad',
    location: 'Almacén A – Estante 02',
    description: 'Folder manila tamaño oficio F/C, 150g, color natural. Resistente a la humedad.',
  },
  {
    sku: 'USB-KNG-8G',
    name: 'USB Kingston 8GB',
    category: 'Tecnología',
    quantity: 9,
    unitPrice: 22.0,
    minStock: 10,
    unit: 'unidad',
    location: 'Almacén B – Estante 01',
    description:
      'Kingston DataTraveler 8GB USB 2.0. Transferencia hasta 40 MB/s. Diseño compacto sin capuchón.',
  },
  {
    sku: 'MAR-SHP-NEG',
    name: 'Marcador Permanente Negro',
    category: 'Escritura',
    quantity: 38,
    unitPrice: 8.5,
    minStock: 20,
    unit: 'unidad',
    location: 'Almacén A – Estante 04',
    description:
      'Marcador permanente punta fina. Tinta resistente al agua, compatible con papel, plástico y cartón.',
  },
  {
    sku: 'GRA-EST-26/6',
    name: 'Grapas Estándar 26/6',
    category: 'Oficina',
    quantity: 150,
    unitPrice: 4.8,
    minStock: 50,
    unit: 'caja',
    location: 'Almacén A – Estante 06',
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

  for (const name of CATEGORIES) {
    await db
      .collection('categories')
      .updateOne({ name }, { $setOnInsert: { name, createdAt: now } }, { upsert: true });
  }

  let created = 0;
  for (const p of PRODUCTS) {
    const res = await db.collection('products').updateOne(
      { sku: p.sku },
      { $setOnInsert: { ...p, imageUrl: '', createdAt: now, updatedAt: now } },
      { upsert: true }
    );
    if (res.upsertedCount) created++;
  }

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
