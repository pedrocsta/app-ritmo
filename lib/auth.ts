import 'server-only';
import { createClient } from '@/lib/supabase/server';

/** Both routes and pages verify a real Supabase Auth user, never trust cookie contents. */
export async function ownerStatus(): Promise<'owner' | 'anonymous' | 'forbidden'> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return 'anonymous';
  // If no owner UID is configured, fail closed rather than exposing the personal row.
  if (!process.env.OWNER_USER_ID || user.id !== process.env.OWNER_USER_ID) return 'forbidden';
  return 'owner';
}
