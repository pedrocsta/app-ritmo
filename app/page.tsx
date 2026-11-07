import { redirect } from 'next/navigation';
import { ownerStatus } from '@/lib/auth';
import Dashboard from './dashboard';
export const dynamic = 'force-dynamic';
export default async function Page() {
  const status = await ownerStatus();
  if (status !== 'owner') redirect('/login');
  return <Dashboard />;
}
