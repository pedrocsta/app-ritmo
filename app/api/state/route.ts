import { NextResponse } from 'next/server';
import { sanitizeImportedData } from '@/lib/model';
import { isSupabaseConfigured, supabaseRequest } from '@/lib/supabase-server';
import { ownerStatus } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const NO_STORE = { 'Cache-Control': 'private, no-store, max-age=0', 'X-Content-Type-Options': 'nosniff' };
const MAX_BYTES = 3_500_000;

type StoredRecord = { data: unknown; revision: number; updated_at: string };

function errorResponse(message: string, status = 503) {
  return NextResponse.json({ error: message }, { status, headers: NO_STORE });
}

async function authorize(): Promise<ReturnType<typeof errorResponse> | null> {
  const result = await ownerStatus();
  if (result === 'anonymous') return errorResponse('Sessao expirada. Entre novamente.', 401);
  if (result === 'forbidden') return errorResponse('Conta sem autorizacao para acessar este app.', 403);
  return null;
}

async function fetchState(): Promise<StoredRecord> {
  const response = await supabaseRequest('ritmo_state?select=data,revision,updated_at&id=eq.personal&limit=1');
  if (!response.ok) throw new Error(`Erro ao consultar Supabase (${response.status}). Verifique a tabela e as permissoes.`);
  const rows = (await response.json()) as StoredRecord[];
  if (!Array.isArray(rows) || !rows[0]) throw new Error('Registro nao encontrado. Execute supabase/schema.sql no SQL Editor.');
  return rows[0];
}

export async function GET() {
  const denied = await authorize();
  if (denied) return denied;
  if (!isSupabaseConfigured()) return errorResponse('Configure SUPABASE_URL e SUPABASE_SECRET_KEY no servidor.');
  try {
    const state = await fetchState();
    return NextResponse.json({ data: sanitizeImportedData(state.data), revision: state.revision, updatedAt: state.updated_at }, { headers: NO_STORE });
  } catch (error) {
    console.error('RYVMO GET:', error instanceof Error ? error.message : 'erro desconhecido');
    return errorResponse('Nao foi possivel carregar os dados do Supabase. Verifique a configuracao e o SQL inicial.');
  }
}

export async function PUT(request: Request) {
  const denied = await authorize();
  if (denied) return denied;
  if (!isSupabaseConfigured()) return errorResponse('Configure SUPABASE_URL e SUPABASE_SECRET_KEY no servidor.');
  const body = await request.text();
  if (new TextEncoder().encode(body).byteLength > MAX_BYTES) return errorResponse('Os dados excedem 3,5 MB. Exporte um backup antes de reduzir o historico.', 413);
  let expectedRevision: number;
  let data: ReturnType<typeof sanitizeImportedData>;
  try {
    const input = JSON.parse(body) as { data?: unknown; expectedRevision?: unknown };
    if (typeof input.expectedRevision !== 'number' || !Number.isSafeInteger(input.expectedRevision) || input.expectedRevision < 0) throw new Error('Revisao invalida');
    expectedRevision = Number(input.expectedRevision);
    data = sanitizeImportedData(input.data);
  } catch {
    return errorResponse('Formato de dados invalido.', 400);
  }
  try {
    const response = await supabaseRequest(
      `ritmo_state?id=eq.personal&revision=eq.${expectedRevision}&select=revision,updated_at`,
      {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ data, revision: expectedRevision + 1, updated_at: new Date().toISOString() }),
      },
    );
    if (!response.ok) throw new Error(`Supabase PATCH retornou HTTP ${response.status}`);
    const rows = (await response.json()) as Pick<StoredRecord, 'revision' | 'updated_at'>[];
    if (!Array.isArray(rows) || rows.length === 0) {
      return errorResponse('Os dados foram atualizados em outra aba ou aparelho. Escolha qual versao manter.', 409);
    }
    return NextResponse.json({ revision: rows[0].revision, updatedAt: rows[0].updated_at }, { headers: NO_STORE });
  } catch (error) {
    console.error('RYVMO PUT:', error instanceof Error ? error.message : 'erro desconhecido');
    return errorResponse('Nao foi possivel salvar no Supabase. O app mantera uma copia local para tentar novamente.');
  }
}
