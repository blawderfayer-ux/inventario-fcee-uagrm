import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { ROLE_HOME, type Role } from '@/lib/types';

export default async function HomePage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  redirect(ROLE_HOME[(session.user.role as Role) ?? 'employee']);
}
