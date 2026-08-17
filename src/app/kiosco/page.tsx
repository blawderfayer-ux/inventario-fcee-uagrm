import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import EmployeeKiosk from '@/views/EmployeeKiosk';
import { signOutAction } from '../actions';

export const metadata = { title: 'Kiosco de Extracción · FCEE UAGRM' };

export default async function KioscoPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  return (
    <EmployeeKiosk
      user={{ name: session.user.name, department: session.user.department }}
      canReturnToPanel={session.user.role === 'admin'}
      onLogout={signOutAction}
    />
  );
}
