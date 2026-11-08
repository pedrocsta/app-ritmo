import { redirect } from 'next/navigation';
import { ownerStatus } from '@/lib/auth';
import LoginForm from './login-form';
import { isPublicSupabaseConfigured } from '@/lib/supabase/config';
export const dynamic = 'force-dynamic';
export default async function LoginPage() {
  if (await ownerStatus() === 'owner') redirect('/');
  return <LoginForm missingConfig={!isPublicSupabaseConfigured() || !process.env.OWNER_USER_ID} />;
}
