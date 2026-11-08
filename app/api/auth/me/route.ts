import { NextResponse } from 'next/server';
import { ownerStatus } from '@/lib/auth';
export const dynamic = 'force-dynamic';
export async function GET() {
  const status = await ownerStatus();
  return NextResponse.json({ authorized: status === 'owner', ...(status === 'unavailable' ? { error: 'Autenticacao temporariamente indisponivel. Confira a configuracao do Supabase.' } : {}) }, {
    status: status === 'owner' ? 200 : status === 'anonymous' ? 401 : status === 'forbidden' ? 403 : 503,
    headers: { 'Cache-Control': 'private, no-store, max-age=0' },
  });
}
