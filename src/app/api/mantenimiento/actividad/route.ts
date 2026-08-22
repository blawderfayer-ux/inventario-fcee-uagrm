import { NextResponse } from 'next/server';
import { COLLECTIONS, collection } from '@/lib/mongodb';
import { HttpError, requireUser, route } from '@/lib/guard';
import type { MovementDoc } from '@/lib/inventory';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Resumen de la bitácora agrupado por usuario, para depurar datos de prueba. */
export const GET = route(async () => {
  await requireUser(['admin']);
  const movements = await collection<MovementDoc>(COLLECTIONS.movements);

  const rows = await movements
    .aggregate<{
      _id: string;
      total: number;
      ingresos: number;
      extracciones: number;
      ultimo: Date;
    }>([
      {
        $group: {
          _id: '$userName',
          total: { $sum: 1 },
          ingresos: { $sum: { $cond: [{ $eq: ['$action', 'ingreso'] }, 1, 0] } },
          extracciones: { $sum: { $cond: [{ $eq: ['$action', 'extracción'] }, 1, 0] } },
          ultimo: { $max: '$createdAt' },
        },
      },
      { $sort: { total: -1 } },
    ])
    .toArray();

  const usuarios = rows.map((r) => ({
    userName: r._id ?? '(sin usuario)',
    total: r.total,
    ingresos: r.ingresos,
    extracciones: r.extracciones,
    ultimo: r.ultimo ? r.ultimo.toISOString() : null,
  }));

  return NextResponse.json({
    usuarios,
    total: usuarios.reduce((acc, u) => acc + u.total, 0),
  });
});

/**
 * Borra la bitácora de un usuario concreto.
 *
 * Es una operación de depuración, pensada para limpiar los datos de prueba
 * antes de poner el sistema en uso real. Como borra registros de auditoría,
 * queda restringida a Super Administrador y exige nombrar al usuario de forma
 * explícita: no hay manera de vaciar la bitácora entera de un solo golpe.
 */
export const DELETE = route(async (req: Request) => {
  await requireUser(['admin']);

  const userName = new URL(req.url).searchParams.get('userName')?.trim();
  if (!userName) {
    throw new HttpError(400, 'Indique el usuario cuya actividad desea borrar.');
  }

  const movements = await collection<MovementDoc>(COLLECTIONS.movements);
  const { deletedCount } = await movements.deleteMany({ userName });

  if (deletedCount === 0) {
    throw new HttpError(404, `No hay movimientos registrados a nombre de "${userName}".`);
  }

  return NextResponse.json({ ok: true, eliminados: deletedCount });
});
