import { NextResponse } from 'next/server';
import { COLLECTIONS, collection, ensureIndexes } from '@/lib/mongodb';
import { HttpError, requireUser, route } from '@/lib/guard';
import { listUsers, toAppUser, type UserDoc } from '@/lib/users';
import { ROLES, type Role } from '@/lib/types';

export const runtime = 'nodejs';

export const GET = route(async () => {
  await requireUser(['admin']);
  return NextResponse.json({ users: await listUsers() });
});

/**
 * Pre-registra a un usuario antes de su primer inicio de sesión: cuando entre
 * con Google, `upsertGoogleUser` encontrará este documento y respetará el rol
 * y el departamento asignados aquí.
 */
export const POST = route(async (req: Request) => {
  await requireUser(['admin']);
  await ensureIndexes();

  const body = (await req.json()) as {
    name?: string;
    email?: string;
    role?: Role;
    department?: string;
    status?: 'active' | 'inactive';
  };

  const email = body.email?.trim().toLowerCase();
  const name = body.name?.trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpError(400, 'Ingrese un correo electrónico válido.');
  }
  if (!name) throw new HttpError(400, 'El nombre completo es obligatorio.');

  const role: Role = ROLES.includes(body.role as Role) ? (body.role as Role) : 'employee';

  const users = await collection<UserDoc>(COLLECTIONS.users);
  if (await users.findOne({ email })) {
    throw new HttpError(409, `El correo ${email} ya está registrado.`);
  }

  const now = new Date();
  const doc: UserDoc = {
    name,
    email,
    role,
    department: body.department?.trim() || 'Sin asignar',
    status: body.status === 'inactive' ? 'inactive' : 'active',
    lastLogin: null,
    createdAt: now,
    updatedAt: now,
  };

  const result = await users.insertOne(doc);
  return NextResponse.json({ user: toAppUser({ ...doc, _id: result.insertedId }) }, { status: 201 });
});
