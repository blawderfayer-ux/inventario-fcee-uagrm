import NextAuth from 'next-auth';
import authConfig from './auth.config';
import { findUserByEmail, upsertGoogleUser } from './lib/users';
import { DEPARTMENT } from './lib/brand';

/** Cada cuánto se vuelve a leer el rol desde MongoDB (ms). */
const ROLE_REFRESH_MS = 5 * 60 * 1000;

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    /**
     * Cualquier cuenta de Google puede entrar; el rol se asigna en MongoDB.
     * Solo se rechaza a quien un admin haya marcado como inactivo.
     *
     * Cada rechazo redirige con su propio código de error. Auth.js convierte
     * cualquier excepción de este callback en `AccessDenied`, así que un fallo
     * de MongoDB se mostraba como «cuenta desactivada» aunque no lo estuviera.
     */
    async signIn({ user }) {
      if (!user.email) return '/login?error=EmailRequired';
      try {
        const appUser = await upsertGoogleUser({
          name: user.name,
          email: user.email,
          image: user.image,
        });
        return appUser ? true : '/login?error=AccountDisabled';
      } catch (err) {
        console.error('[auth] No se pudo verificar la cuenta en MongoDB:', err);
        return '/login?error=DatabaseUnavailable';
      }
    },

    async jwt({ token, trigger }) {
      const stale =
        !token.role || Date.now() - (token.refreshedAt ?? 0) > ROLE_REFRESH_MS;

      if (token.email && (stale || trigger === 'update')) {
        const appUser = await findUserByEmail(token.email);
        if (appUser) {
          token.uid = appUser.id;
          token.role = appUser.role;
          token.department = appUser.department;
          token.name = appUser.name;
          token.refreshedAt = Date.now();
        }
      }
      return token;
    },

    async session({ session, token }) {
      session.user.id = token.uid ?? '';
      session.user.role = token.role ?? 'employee';
      session.user.department = token.department ?? DEPARTMENT;
      session.user.name = token.name ?? session.user.email;
      return session;
    },
  },
});
