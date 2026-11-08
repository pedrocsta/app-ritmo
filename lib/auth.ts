import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { isPublicSupabaseConfigured } from '@/lib/supabase/config';

export type OwnerStatus = 'owner' | 'anonymous' | 'forbidden' | 'unavailable';

/** Never trusts a cookie alone: verifies the Supabase user on the server. */
export async function ownerStatus(): Promise<OwnerStatus> {
  if (!isPublicSupabaseConfigured() || !process.env.OWNER_USER_ID) {
    console.error('[RYVMO] Auth: falta configurar NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ou OWNER_USER_ID.');
    return 'unavailable';
  }
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      // No session, invalid credentials, etc.: treat as anonymous, never as owner.
      if (error.name === 'AuthRetryableFetchError' || (error.status ?? 0) >= 500) {
        console.error('[RYVMO] Auth: servico de autenticacao indisponivel.');
        return 'unavailable';
      }
      return 'anonymous';
    }
    if (!user) return 'anonymous';
    return user.id === process.env.OWNER_USER_ID ? 'owner' : 'forbidden';
  } catch (error) {
    console.error('[RYVMO] Auth: falha inesperada na verificacao de sessao.', error instanceof Error ? error.name : 'erro desconhecido');
    return 'unavailable';
  }
}
