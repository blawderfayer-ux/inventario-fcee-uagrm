import type { NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';

/**
 * Configuración compartida entre el middleware (runtime edge, sin acceso a
 * MongoDB) y el runtime de Node. Todo lo que toque la base de datos vive en
 * `src/auth.ts`, no aquí.
 */
export const authConfig = {
  providers: [Google],
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: { strategy: 'jwt' },
  trustHost: true,
} satisfies NextAuthConfig;

export default authConfig;
