import { ObjectId, type WithId } from 'mongodb';
import { COLLECTIONS, collection, ensureIndexes } from './mongodb';
import type { AppUser, Role } from './types';

export interface UserDoc {
  _id?: ObjectId;
  name: string;
  email: string;
  role: Role;
  department: string;
  status: 'active' | 'inactive';
  image?: string;
  lastLogin?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export function formatDateTime(date: Date | null | undefined): string {
  if (!date) return '—';
  const d = date.toLocaleDateString('es-BO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const t = date.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${d} ${t}`;
}

export function toAppUser(doc: WithId<UserDoc>): AppUser {
  return {
    id: doc._id.toString(),
    name: doc.name,
    email: doc.email,
    role: doc.role,
    department: doc.department,
    status: doc.status,
    lastLogin: formatDateTime(doc.lastLogin),
    image: doc.image,
  };
}

/** Iniciales para el avatar: hasta dos letras a partir del nombre. */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter((w) => /^[\p{Lu}]/u.test(w));
  const source = words.length ? words : name.trim().split(/\s+/);
  return source
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Registra (o actualiza) al usuario que acaba de autenticarse con Google.
 *
 * El rol nunca lo elige el usuario:
 *  - Si su correo está en ADMIN_EMAILS, entra como admin.
 *  - Si es el primer usuario del sistema, entra como admin (bootstrap).
 *  - En cualquier otro caso entra como 'employee' y un admin puede promoverlo
 *    desde la pantalla de Usuarios.
 *
 * Devuelve null si el usuario existe pero está marcado como inactivo.
 */
export async function upsertGoogleUser(input: {
  name?: string | null;
  email: string;
  image?: string | null;
}): Promise<AppUser | null> {
  await ensureIndexes();
  const users = await collection<UserDoc>(COLLECTIONS.users);
  const email = input.email.toLowerCase();
  const now = new Date();

  const existing = await users.findOne({ email });

  if (existing) {
    if (existing.status === 'inactive') return null;
    await users.updateOne(
      { _id: existing._id },
      {
        $set: {
          name: existing.name || input.name || email,
          image: input.image ?? existing.image,
          lastLogin: now,
          updatedAt: now,
        },
      }
    );
    return toAppUser({ ...existing, lastLogin: now });
  }

  const isListedAdmin = adminEmails().includes(email);
  const isFirstUser = (await users.estimatedDocumentCount()) === 0;
  const role: Role = isListedAdmin || isFirstUser ? 'admin' : 'employee';

  const doc: UserDoc = {
    name: input.name?.trim() || email.split('@')[0],
    email,
    role,
    department: role === 'admin' ? 'Decanato FCEE' : 'Sin asignar',
    status: 'active',
    image: input.image ?? undefined,
    lastLogin: now,
    createdAt: now,
    updatedAt: now,
  };

  const result = await users.insertOne(doc);
  return toAppUser({ ...doc, _id: result.insertedId });
}

export async function findUserByEmail(email: string): Promise<AppUser | null> {
  const users = await collection<UserDoc>(COLLECTIONS.users);
  const doc = await users.findOne({ email: email.toLowerCase() });
  return doc ? toAppUser(doc) : null;
}

export async function listUsers(): Promise<AppUser[]> {
  const users = await collection<UserDoc>(COLLECTIONS.users);
  const docs = await users.find({}).sort({ createdAt: -1 }).toArray();
  return docs.map(toAppUser);
}
