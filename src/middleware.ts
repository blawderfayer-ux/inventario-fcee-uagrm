import NextAuth from 'next-auth';
import { NextResponse } from 'next/server';
import authConfig from './auth.config';
import { ROLE_HOME, type Role } from './lib/types';

const { auth } = NextAuth(authConfig);

/** Qué roles pueden ver cada sección. */
const ACCESS: { prefix: string; roles: Role[] }[] = [
  { prefix: '/dashboard', roles: ['admin'] },
  { prefix: '/usuarios', roles: ['admin'] },
  { prefix: '/reportes', roles: ['admin'] },
  { prefix: '/inventario', roles: ['admin', 'stockkeeper'] },
  { prefix: '/kiosco', roles: ['admin', 'stockkeeper', 'employee'] },
];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const role = req.auth?.user?.role as Role | undefined;

  if (pathname === '/login') {
    if (role) return NextResponse.redirect(new URL(ROLE_HOME[role], req.url));
    return NextResponse.next();
  }

  if (!req.auth) {
    const login = new URL('/login', req.url);
    if (pathname !== '/') login.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(login);
  }

  if (pathname === '/') {
    return NextResponse.redirect(new URL(ROLE_HOME[role ?? 'employee'], req.url));
  }

  const rule = ACCESS.find((r) => pathname.startsWith(r.prefix));
  if (rule && role && !rule.roles.includes(role)) {
    return NextResponse.redirect(new URL(ROLE_HOME[role], req.url));
  }

  return NextResponse.next();
});

export const config = {
  // Se excluyen las rutas de API (se protegen por sí mismas), los assets
  // estáticos y las imágenes servidas desde GridFS.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
