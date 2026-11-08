'use client';
import { createBrowserClient } from '@supabase/ssr';
import { isPublicSupabaseConfigured } from './config';
export function createClient() {
  if (!isPublicSupabaseConfigured()) throw new Error('Supabase Auth nao configurado neste ambiente.');
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
