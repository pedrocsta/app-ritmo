import 'server-only';
import { createServerClient, type SetAllCookies } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { isPublicSupabaseConfigured } from '@/lib/supabase/config';
export async function createClient() {
  if (!isPublicSupabaseConfigured()) throw new Error('Supabase Auth nao configurado no servidor.');
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet: Parameters<SetAllCookies>[0]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Server Components cannot set cookies. proxy.ts refreshes them.
          }
        },
      },
    },
  );
}
