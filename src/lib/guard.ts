import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import type { Role } from './types';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  department: string;
  image?: string | null;
}

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
  }
}

/**
 * Devuelve el usuario autenticado o lanza HttpError.
 * `roles` limita el acceso a los roles indicados.
 */
export async function requireUser(roles?: Role[]): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user?.email) {
    throw new HttpError(401, 'Debe iniciar sesión para realizar esta acción.');
  }
  const user = session.user as SessionUser;
  if (roles && !roles.includes(user.role)) {
    throw new HttpError(403, 'Su rol no tiene permisos para esta operación.');
  }
  return user;
}

/** Envuelve un handler de API traduciendo HttpError a una respuesta JSON. */
export function route<T extends unknown[]>(
  handler: (...args: T) => Promise<Response>
): (...args: T) => Promise<Response> {
  return async (...args: T) => {
    try {
      return await handler(...args);
    } catch (err) {
      if (err instanceof HttpError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      console.error('[api]', err);
      const message = err instanceof Error ? err.message : 'Error interno del servidor.';
      return NextResponse.json({ error: message }, { status: 500 });
    }
  };
}
