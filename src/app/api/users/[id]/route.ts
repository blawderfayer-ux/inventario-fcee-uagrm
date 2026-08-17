import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { COLLECTIONS, collection } from '@/lib/mongodb';
import { HttpError, requireUser, route } from '@/lib/guard';
import { toAppUser, type UserDoc } from '@/lib/users';
import { ROLES, type Role } from '@/lib/types';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

async function findOr404(id: string) {
  if (!ObjectId.isValid(id)) throw new HttpError(404, 'Usuario no encontrado.');
  const users = await collection<UserDoc>(COLLECTIONS.users);
  const doc = await users.findOne({ _id: new ObjectId(id) });
  if (!doc) throw new HttpError(404, 'Usuario no encontrado.');
  return { users, doc };
}

/** Impide que el sistema se quede sin ningún administrador activo. */
async function assertNotLastAdmin(currentId: ObjectId) {
  const users = await collection<UserDoc>(COLLECTIONS.users);
  const remaining = await users.countDocuments({
    role: 'admin',
    status: 'active',
    _id: { $ne: currentId },
  });
  if (remaining === 0) {
    throw new HttpError(
      409,
      'Debe existir al menos un Super Administrador activo en el sistema.'
    );
  }
}

export const PATCH = route(async (req: Request, ctx: Ctx) => {
  const actor = await requireUser(['admin']);
  const { id } = await ctx.params;
  const { users, doc } = await findOr404(id);

  const body = (await req.json()) as {
    name?: string;
    email?: string;
    role?: Role;
    department?: string;
    status?: 'active' | 'inactive';
  };

  const role: Role = ROLES.includes(body.role as Role) ? (body.role as Role) : doc.role;
  const status: 'active' | 'inactive' = body.status === 'inactive' ? 'inactive' : 'active';

  if (doc.role === 'admin' && doc.status === 'active' && (role !== 'admin' || status !== 'active')) {
    await assertNotLastAdmin(doc._id);
  }
  if (actor.id === id && status === 'inactive') {
    throw new HttpError(409, 'No puede desactivar su propia cuenta.');
  }

  const email = body.email?.trim().toLowerCase() ?? doc.email;
  if (email !== doc.email) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new HttpError(400, 'Ingrese un correo electrónico válido.');
    }
    if (await users.findOne({ email, _id: { $ne: doc._id } })) {
      throw new HttpError(409, `El correo ${email} ya está registrado.`);
    }
  }

  const update = {
    name: body.name?.trim() || doc.name,
    email,
    role,
    department: body.department?.trim() || doc.department,
    status,
    updatedAt: new Date(),
  };

  await users.updateOne({ _id: doc._id }, { $set: update });
  return NextResponse.json({ user: toAppUser({ ...doc, ...update }) });
});

export const DELETE = route(async (_req: Request, ctx: Ctx) => {
  const actor = await requireUser(['admin']);
  const { id } = await ctx.params;
  const { users, doc } = await findOr404(id);

  if (actor.id === id) {
    throw new HttpError(409, 'No puede eliminar su propia cuenta.');
  }
  if (doc.role === 'admin' && doc.status === 'active') {
    await assertNotLastAdmin(doc._id);
  }

  await users.deleteOne({ _id: doc._id });
  return NextResponse.json({ ok: true });
});
