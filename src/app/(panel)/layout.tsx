import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import AppShell from '@/components/AppShell';
import { signOutAction } from '../actions';
import { initialsOf } from '@/lib/users';
import type { Role } from '@/lib/types';

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.email) redirect('/login');

  const user = {
    name: session.user.name,
    department: session.user.department,
    initials: initialsOf(session.user.name),
    role: session.user.role as Role,
  };

  return (
    <AppShell user={user} onLogout={signOutAction}>
      {children}
    </AppShell>
  );
}
