/**
 * Completa la categoría en los movimientos antiguos.
 *
 * La bitácora empezó a guardar la categoría del producto más tarde, así que los
 * movimientos anteriores no la tienen. Este script la rellena consultando el
 * producto correspondiente, sin borrar ni modificar nada más: la actividad de
 * cada usuario se conserva intacta.
 *
 *   npm run backfill
 */
import { config } from 'dotenv';
import { MongoClient, type ObjectId } from 'mongodb';

config({ path: '.env.local' });
config({ path: '.env' });

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB ?? 'inventario_fcee';

if (!uri) {
  console.error('Falta MONGODB_URI. Copia .env.example a .env.local y complétalo.');
  process.exit(1);
}

async function main() {
  const client = new MongoClient(uri!);
  await client.connect();
  const db = client.db(dbName);

  const products = await db
    .collection<{ _id: ObjectId; category: string }>('products')
    .find({}, { projection: { category: 1 } })
    .toArray();
  const categoryOf = new Map(products.map((p) => [p._id.toString(), p.category]));

  const pending = await db
    .collection<{ _id: ObjectId; productId: ObjectId }>('movements')
    .find({ category: { $exists: false } })
    .toArray();

  let filled = 0;
  let orphan = 0;

  for (const m of pending) {
    const category = categoryOf.get(m.productId?.toString() ?? '');
    if (!category) {
      orphan++;
      continue;
    }
    await db.collection('movements').updateOne({ _id: m._id }, { $set: { category } });
    filled++;
  }

  console.log(`Movimientos sin categoría encontrados: ${pending.length}`);
  console.log(`  Completados desde su producto: ${filled}`);
  console.log(
    `  Sin producto asociado (producto ya dado de baja): ${orphan}` +
      (orphan ? ' — se conservan y aparecen como «Productos dados de baja».' : '')
  );

  await client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
