/** Supabase REST access. This module must only be imported from server route handlers. */
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

export function isSupabaseConfigured(): boolean {
  return Boolean(url && key && /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(url));
}

export async function supabaseRequest(path: string, init: RequestInit = {}): Promise<Response> {
  if (!isSupabaseConfigured() || !url || !key) {
    throw new Error('Supabase nao configurado. Confira SUPABASE_URL e SUPABASE_SECRET_KEY.');
  }
  const headers = new Headers(init.headers);
  headers.set('apikey', key);
  // Legacy service_role keys are JWTs; new sb_secret keys must not be Bearer tokens.
  if (key.startsWith('eyJ')) headers.set('Authorization', `Bearer ${key}`);
  headers.set('Accept', 'application/json');
  if (init.body) headers.set('Content-Type', 'application/json');
  return fetch(`${url.replace(/\/$/, '')}/rest/v1/${path}`, {
    ...init,
    headers,
    cache: 'no-store',
  });
}
