import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import StockInventory from '@/views/StockInventory';
import type { Role } from '@/lib/types';

export const metadata = { title: 'Inventario · FCEE UAGRM' };

export default async function InventarioPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  return <StockInventory role={session.user.role as Role} />;
}
