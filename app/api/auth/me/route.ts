import { NextResponse } from 'next/server';
import { ownerStatus } from '@/lib/auth';
export const dynamic = 'force-dynamic';
export async function GET() {
  const status = await ownerStatus();
  return NextResponse.json({ authorized: status === 'owner' }, {
    status: status === 'owner' ? 200 : status === 'anonymous' ? 401 : 403,
    headers: { 'Cache-Control': 'private, no-store, max-age=0' },
  });
}
