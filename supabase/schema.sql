-- Execute UMA vez no Supabase > SQL Editor.
-- Usuario unico, sem Supabase Auth. NENHUMA politica publica de leitura/escrita.
-- O servidor Next.js acessa esta tabela exclusivamente com SUPABASE_SECRET_KEY.

create table if not exists public.ritmo_state (
  id text primary key constraint ritmo_personal_only check (id = 'personal'),
  data jsonb not null,
  revision bigint not null default 0 check (revision >= 0),
  updated_at timestamptz not null default now()
);

alter table public.ritmo_state enable row level security;
revoke all on table public.ritmo_state from anon, authenticated;
grant select, insert, update on table public.ritmo_state to service_role;

-- Nao crie policy para anon/authenticated: acesso direto pelo navegador deve ser negado.
insert into public.ritmo_state (id, data, revision)
values (
  'personal',
  '{"version":1,"days":{},"exercises":{},"plans":{"0":[],"1":[],"2":[],"3":[],"4":[],"5":[],"6":[]},"workoutChecks":{},"sessions":[],"settings":{"studyGoal":60}}'::jsonb,
  0
)
on conflict (id) do nothing;
