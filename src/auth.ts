import NextAuth from 'next-auth';
import authConfig from './auth.config';
import { findUserByEmail, upsertGoogleUser } from './lib/users';

/** Cada cuánto se vuelve a leer el rol desde MongoDB (ms). */
const ROLE_REFRESH_MS = 5 * 60 * 1000;

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    /**
     * Cualquier cuenta de Google puede entrar; el rol se asigna en MongoDB.
     * Solo se rechaza a quien un admin haya marcado como inactivo.
     */
    async signIn({ user }) {
      if (!user.email) return false;
      const appUser = await upsertGoogleUser({
        name: user.name,
        email: user.email,
        image: user.image,
      });
      return appUser ? true : '/login?error=AccessDenied';
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
      session.user.department = token.department ?? 'Sin asignar';
      session.user.name = token.name ?? session.user.email;
      return session;
    },
  },
});
