import 'next-auth';
import 'next-auth/jwt';
import type { Role } from '@/lib/types';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      image?: string | null;
      role: Role;
      department: string;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    uid?: string;
    role?: Role;
    department?: string;
    refreshedAt?: number;
  }
}
