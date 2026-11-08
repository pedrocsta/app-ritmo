-- RYVMO 3.0 — Importacao nao destrutiva do treino Hipertrofia Estetica
-- Conta-alvo: pedrohdcosta@outlook.com
-- Execute no Supabase > SQL Editor do MESMO projeto configurado na Vercel.
-- Nao apaga habitos, dieta, dias marcados, treinos antigos, cargas editadas ou sessoes.
-- Idempotente: repetir nao duplica itens com os mesmos IDs de importacao.
-- ATENCAO: a tabela RYVMO atual usa UM registro global (id = 'personal').
-- O projeto deve possuir OWNER_USER_ID apontando para a conta acima.

begin;

alter table public.ritmo_state
  add column if not exists owner_user_id uuid references auth.users (id);

-- Backup automatico antes de cada execucao, sem acessibilidade publica.
create table if not exists public.ryvmo_import_backups (
  id bigint generated always as identity primary key,
  owner_user_id uuid not null,
  data jsonb not null,
  revision bigint not null,
  saved_at timestamptz not null default now()
);
alter table public.ryvmo_import_backups enable row level security;
revoke all on table public.ryvmo_import_backups from anon, authenticated;

do $import$
declare
  v_owner_id uuid;
  v_saved_owner uuid;
  v_state jsonb;
  v_exercise_data jsonb;
  v_plan jsonb;
  v_plan_item jsonb;
  v_exercise jsonb;
  v_day text;
  v_catalog jsonb := $catalog${"programName":"Hipertrofia Estética","programVersion":1,"ownerEmail":"pedrohdcosta@outlook.com","exercises":[{"id":"ryvmo-ex-corrida","name":"Corrida","weight":0,"imageKey":"corrida","muscleGroup":"Cardio","instructions":"Caminhe 5 min para aquecer; corra leve durante 30 min e finalize com 5 min de caminhada.","kind":"cardio"},{"id":"ryvmo-ex-agachamento-livre","name":"Agachamento Livre com Barra","weight":100,"imageKey":"agachamento-livre","muscleGroup":"Quadríceps · Glúteos","instructions":"Barra estável no trapézio, abdômen firme. Flexione quadril e joelhos com controle e suba pressionando o chão.","kind":"strength"},{"id":"ryvmo-ex-leg-press-45","name":"Leg Press 45°","weight":200,"imageKey":"leg-press-45","muscleGroup":"Quadríceps · Glúteos","instructions":"Mantenha toda a planta dos pés na plataforma. Desça com controle sem arredondar a lombar.","kind":"strength"},{"id":"ryvmo-ex-cadeira-extensora","name":"Cadeira Extensora","weight":40,"imageKey":"cadeira-extensora","muscleGroup":"Quadríceps","instructions":"Ajuste o eixo da máquina ao joelho. Eleve o rolo sem impulsionar o tronco.","kind":"strength"},{"id":"ryvmo-ex-cadeira-flexora","name":"Cadeira Flexora","weight":60,"imageKey":"cadeira-flexora","muscleGroup":"Posteriores de coxa","instructions":"Ajuste a máquina e flexione os joelhos controlando o retorno.","kind":"strength"},{"id":"ryvmo-ex-panturrilha-unilateral","name":"Panturrilha Unilateral em Pé","weight":0,"imageKey":"panturrilha-unilateral","muscleGroup":"Panturrilhas","instructions":"Eleve o calcanhar ao máximo com apoio para equilíbrio. Desça lentamente, sem perder a amplitude.","kind":"strength"},{"id":"ryvmo-ex-abdominal-polia","name":"Abdominal na Polia com Carga","weight":50,"imageKey":"abdominal-polia","muscleGroup":"Abdômen","instructions":"Ajoelhe-se diante da polia alta. Flexione a coluna aproximando costelas e pelve, sem puxar com os braços.","kind":"strength"},{"id":"ryvmo-ex-elevacao-joelhos","name":"Elevação de Joelhos Suspenso","weight":0,"imageKey":"elevacao-joelhos","muscleGroup":"Abdômen","instructions":"Pendure-se com ombros ativos; eleve os joelhos em direção ao peito sem balançar.","kind":"strength"},{"id":"ryvmo-ex-supino-inclinado-halteres","name":"Supino Inclinado com Halteres","weight":27.5,"imageKey":"supino-inclinado-halteres","muscleGroup":"Peito superior","instructions":"Com banco em inclinação moderada, desça os halteres sob controle e pressione para cima.","kind":"strength"},{"id":"ryvmo-ex-puxada-neutra","name":"Puxada Alta — Pegada Neutra","weight":60,"imageKey":"puxada-neutra","muscleGroup":"Costas","instructions":"Com a pegada neutra, conduza os cotovelos em direção às costelas, sem inclinar demais o tronco.","kind":"strength"},{"id":"ryvmo-ex-supino-reto-halteres","name":"Supino Reto com Halteres","weight":27.5,"imageKey":"supino-reto-halteres","muscleGroup":"Peito","instructions":"Mantenha os pés firmes; desça os halteres alinhados aos cotovelos e empurre com controle.","kind":"strength"},{"id":"ryvmo-ex-remada-baixa","name":"Remada Baixa na Polia — Triângulo","weight":55,"imageKey":"remada-baixa","muscleGroup":"Costas","instructions":"Sente-se estável, peito aberto, e puxe o triângulo rumo ao abdômen movendo as escápulas.","kind":"strength"},{"id":"ryvmo-ex-desenvolvimento-neutro","name":"Desenvolvimento com Halteres — Neutro","weight":22.5,"imageKey":"desenvolvimento-neutro","muscleGroup":"Ombros","instructions":"Com palmas voltadas uma para a outra, empurre os halteres acima da cabeça sem arquear a lombar.","kind":"strength"},{"id":"ryvmo-ex-lateral-polia","name":"Elevação Lateral Unilateral na Polia","weight":10,"imageKey":"lateral-polia","muscleGroup":"Ombro lateral","instructions":"Braço levemente flexionado: eleve lateralmente até perto da altura do ombro, sem impulso.","kind":"strength"},{"id":"ryvmo-ex-crucifixo-inverso-maquina","name":"Crucifixo Inverso Máquina","weight":35,"imageKey":"crucifixo-inverso-maquina","muscleGroup":"Deltoide posterior","instructions":"Peito apoiado, abra os braços com cotovelos suaves e mantenha a tensão no deltoide posterior.","kind":"strength"},{"id":"ryvmo-ex-rosca-scott-maquina","name":"Rosca Scott Máquina","weight":40,"imageKey":"rosca-scott-maquina","muscleGroup":"Bíceps","instructions":"Braços apoiados no banco Scott; flexione os cotovelos sem tirar os ombros da almofada.","kind":"strength"},{"id":"ryvmo-ex-triceps-frances-corda","name":"Tríceps Francês na Polia com Corda","weight":30,"imageKey":"triceps-frances-corda","muscleGroup":"Tríceps","instructions":"Com cotovelos elevados, estenda os braços acima da cabeça sem abrir excessivamente os cotovelos.","kind":"strength"},{"id":"ryvmo-ex-terra-romeno","name":"Levantamento Terra Romeno","weight":50,"imageKey":"terra-romeno","muscleGroup":"Posteriores · Glúteos","instructions":"Leve o quadril para trás com joelhos levemente flexionados e barra próxima às pernas.","kind":"strength"},{"id":"ryvmo-ex-agachamento-bulgaro","name":"Agachamento Búlgaro com Halteres","weight":10,"imageKey":"agachamento-bulgaro","muscleGroup":"Quadríceps · Glúteos","instructions":"Apoie o pé posterior no banco, desça verticalmente com equilíbrio e retorne pelo pé da frente.","kind":"strength"},{"id":"ryvmo-ex-hip-thrust","name":"Elevação Pélvica / Hip Thrust","weight":50,"imageKey":"hip-thrust","muscleGroup":"Glúteos","instructions":"Escápulas apoiadas no banco; eleve o quadril até alinhar joelhos, quadril e ombros.","kind":"strength"},{"id":"ryvmo-ex-panturrilha-sentado","name":"Panturrilha Sentado","weight":15,"imageKey":"panturrilha-sentado","muscleGroup":"Panturrilhas","instructions":"Com o joelho flexionado, eleve os calcanhares e controle a descida.","kind":"strength"},{"id":"ryvmo-ex-ab-wheel","name":"Ab Wheel — Progressão Avançada","weight":0,"imageKey":"ab-wheel","muscleGroup":"Core","instructions":"A partir de joelhos apoiados, role à frente com abdômen contraído e retorne sem colapsar a lombar.","kind":"strength"},{"id":"ryvmo-ex-supino-inclinado-smith","name":"Supino Inclinado no Smith","weight":50,"imageKey":"supino-inclinado-smith","muscleGroup":"Peito superior","instructions":"Banco inclinado sob a barra guiada; desça rumo à parte superior do peito e estenda os cotovelos.","kind":"strength"},{"id":"ryvmo-ex-crucifixo-maquina","name":"Crucifixo Máquina","weight":60,"imageKey":"crucifixo-maquina","muscleGroup":"Peito","instructions":"Ajuste o banco; aproxime os apoios à frente do peito com leve flexão dos cotovelos.","kind":"strength"},{"id":"ryvmo-ex-remada-unilateral-polia","name":"Remada Unilateral na Polia","weight":30,"imageKey":"remada-unilateral-polia","muscleGroup":"Costas","instructions":"Puxe a pegada em direção ao quadril mantendo tronco estável e escápula controlada.","kind":"strength"},{"id":"ryvmo-ex-crucifixo-inverso-polia","name":"Crucifixo Inverso na Polia","weight":15,"imageKey":"crucifixo-inverso-polia","muscleGroup":"Deltoide posterior","instructions":"Com cabos cruzados, abra os braços em linha com os ombros sem usar balanço.","kind":"strength"},{"id":"ryvmo-ex-rosca-martelo","name":"Rosca Martelo com Halteres","weight":20,"imageKey":"rosca-martelo","muscleGroup":"Braquiorradial · Bíceps","instructions":"Com pegada neutra e braços próximos ao corpo, flexione os cotovelos sem balançar.","kind":"strength"},{"id":"ryvmo-ex-triceps-polia-barra","name":"Tríceps na Polia — Barra Reta ou W","weight":45,"imageKey":"triceps-polia-barra","muscleGroup":"Tríceps","instructions":"Cotovelos junto ao tronco, estenda os braços na polia e retorne sem elevar os ombros.","kind":"strength"}],"plans":{"0":[{"id":"ryvmo-plan-0-01-corrida","exerciseId":"ryvmo-ex-corrida","sets":1,"reps":1,"referenceWeight":0,"notes":"5 min caminhando · 30 min corrida leve · 5 min caminhando","durationMinutes":40,"warmupMinutes":5,"mainMinutes":30,"cooldownMinutes":5,"intensity":"Leve a moderada"}],"1":[{"id":"ryvmo-plan-1-01-agachamento-livre","exerciseId":"ryvmo-ex-agachamento-livre","sets":3,"reps":8,"restSeconds":180,"referenceWeight":100},{"id":"ryvmo-plan-1-02-leg-press-45","exerciseId":"ryvmo-ex-leg-press-45","sets":2,"reps":15,"restSeconds":180,"referenceWeight":200,"repsUpper":15},{"id":"ryvmo-plan-1-03-cadeira-extensora","exerciseId":"ryvmo-ex-cadeira-extensora","sets":2,"reps":15,"restSeconds":90,"referenceWeight":40,"repsUpper":15},{"id":"ryvmo-plan-1-04-cadeira-flexora","exerciseId":"ryvmo-ex-cadeira-flexora","sets":3,"reps":10,"restSeconds":120,"referenceWeight":60,"repsUpper":15},{"id":"ryvmo-plan-1-05-panturrilha-unilateral","exerciseId":"ryvmo-ex-panturrilha-unilateral","sets":4,"reps":15,"restSeconds":90,"referenceWeight":0,"repsUpper":15,"notes":"Peso corporal; progressão opcional com halter de 10–20 kg."},{"id":"ryvmo-plan-1-06-abdominal-polia","exerciseId":"ryvmo-ex-abdominal-polia","sets":3,"reps":10,"restSeconds":90,"referenceWeight":50,"repsUpper":15},{"id":"ryvmo-plan-1-07-elevacao-joelhos","exerciseId":"ryvmo-ex-elevacao-joelhos","sets":2,"reps":10,"restSeconds":90,"referenceWeight":0,"repsUpper":15,"notes":"Peso corporal."}],"2":[],"3":[{"id":"ryvmo-plan-3-01-corrida","exerciseId":"ryvmo-ex-corrida","sets":1,"reps":1,"referenceWeight":0,"notes":"5 min caminhando · 30 min corrida leve · 5 min caminhando","durationMinutes":40,"warmupMinutes":5,"mainMinutes":30,"cooldownMinutes":5,"intensity":"Leve a moderada"}],"4":[{"id":"ryvmo-plan-4-01-supino-inclinado-halteres","exerciseId":"ryvmo-ex-supino-inclinado-halteres","sets":3,"reps":8,"restSeconds":180,"referenceWeight":27.5},{"id":"ryvmo-plan-4-02-puxada-neutra","exerciseId":"ryvmo-ex-puxada-neutra","sets":3,"reps":8,"restSeconds":180,"referenceWeight":60},{"id":"ryvmo-plan-4-03-supino-reto-halteres","exerciseId":"ryvmo-ex-supino-reto-halteres","sets":2,"reps":8,"restSeconds":180,"referenceWeight":27.5},{"id":"ryvmo-plan-4-04-remada-baixa","exerciseId":"ryvmo-ex-remada-baixa","sets":3,"reps":8,"restSeconds":150,"referenceWeight":55},{"id":"ryvmo-plan-4-05-desenvolvimento-neutro","exerciseId":"ryvmo-ex-desenvolvimento-neutro","sets":2,"reps":8,"restSeconds":180,"referenceWeight":22.5,"repsUpper":"22,5 kg em cada halter."},{"id":"ryvmo-plan-4-06-lateral-polia","exerciseId":"ryvmo-ex-lateral-polia","sets":3,"reps":15,"restSeconds":90,"referenceWeight":10,"repsUpper":20},{"id":"ryvmo-plan-4-07-crucifixo-inverso-maquina","exerciseId":"ryvmo-ex-crucifixo-inverso-maquina","sets":2,"reps":20,"restSeconds":90,"referenceWeight":35,"repsUpper":20},{"id":"ryvmo-plan-4-08-rosca-scott-maquina","exerciseId":"ryvmo-ex-rosca-scott-maquina","sets":2,"reps":8,"restSeconds":120,"referenceWeight":40},{"id":"ryvmo-plan-4-09-triceps-frances-corda","exerciseId":"ryvmo-ex-triceps-frances-corda","sets":2,"reps":15,"restSeconds":120,"referenceWeight":30}],"5":[{"id":"ryvmo-plan-5-01-terra-romeno","exerciseId":"ryvmo-ex-terra-romeno","sets":3,"reps":12,"restSeconds":180,"referenceWeight":50,"repsUpper":"Carga de referência."},{"id":"ryvmo-plan-5-02-agachamento-bulgaro","exerciseId":"ryvmo-ex-agachamento-bulgaro","sets":2,"reps":8,"restSeconds":150,"referenceWeight":10},{"id":"ryvmo-plan-5-03-hip-thrust","exerciseId":"ryvmo-ex-hip-thrust","sets":3,"reps":8,"restSeconds":150,"referenceWeight":50},{"id":"ryvmo-plan-5-04-cadeira-flexora","exerciseId":"ryvmo-ex-cadeira-flexora","sets":2,"reps":15,"restSeconds":120,"referenceWeight":55},{"id":"ryvmo-plan-5-05-cadeira-extensora","exerciseId":"ryvmo-ex-cadeira-extensora","sets":2,"reps":12,"restSeconds":90,"referenceWeight":40,"repsUpper":15},{"id":"ryvmo-plan-5-06-panturrilha-sentado","exerciseId":"ryvmo-ex-panturrilha-sentado","sets":4,"reps":20,"restSeconds":90,"referenceWeight":15},{"id":"ryvmo-plan-5-07-ab-wheel","exerciseId":"ryvmo-ex-ab-wheel","sets":3,"reps":10,"restSeconds":120,"referenceWeight":0,"repsUpper":"Peso corporal."},{"id":"ryvmo-plan-5-08-abdominal-polia","exerciseId":"ryvmo-ex-abdominal-polia","sets":2,"reps":15,"restSeconds":90,"referenceWeight":45}],"6":[{"id":"ryvmo-plan-6-01-supino-inclinado-smith","exerciseId":"ryvmo-ex-supino-inclinado-smith","sets":3,"reps":10,"restSeconds":180,"referenceWeight":50},{"id":"ryvmo-plan-6-02-puxada-neutra","exerciseId":"ryvmo-ex-puxada-neutra","sets":3,"reps":10,"restSeconds":180,"referenceWeight":65},{"id":"ryvmo-plan-6-03-crucifixo-maquina","exerciseId":"ryvmo-ex-crucifixo-maquina","sets":2,"reps":10,"restSeconds":120,"referenceWeight":60,"repsUpper":15},{"id":"ryvmo-plan-6-04-remada-unilateral-polia","exerciseId":"ryvmo-ex-remada-unilateral-polia","sets":2,"reps":8,"restSeconds":120,"referenceWeight":30},{"id":"ryvmo-plan-6-05-lateral-polia","exerciseId":"ryvmo-ex-lateral-polia","sets":4,"reps":15,"restSeconds":90,"referenceWeight":10,"repsUpper":20},{"id":"ryvmo-plan-6-06-crucifixo-inverso-polia","exerciseId":"ryvmo-ex-crucifixo-inverso-polia","sets":2,"reps":20,"restSeconds":90,"referenceWeight":15,"repsUpper":20},{"id":"ryvmo-plan-6-07-rosca-martelo","exerciseId":"ryvmo-ex-rosca-martelo","sets":2,"reps":8,"restSeconds":120,"referenceWeight":20},{"id":"ryvmo-plan-6-08-triceps-polia-barra","exerciseId":"ryvmo-ex-triceps-polia-barra","sets":2,"reps":15,"restSeconds":120,"referenceWeight":45,"repsUpper":15}]},"trainingDays":{"0":{"title":"Corrida","subtitle":"40 min · leve a moderada","kind":"cardio"},"1":{"title":"Lower A + Abdômen","subtitle":"Ênfase em quadríceps","kind":"strength"},"2":{"title":"Descanso","subtitle":"Dia de recuperação","kind":"rest"},"3":{"title":"Corrida","subtitle":"40 min · leve a moderada","kind":"cardio"},"4":{"title":"Upper A","subtitle":"Peito · costas · ombros · braços","kind":"strength"},"5":{"title":"Lower B + Abdômen","subtitle":"Posteriores · glúteos · quadríceps","kind":"strength"},"6":{"title":"Upper B","subtitle":"Ênfase estética","kind":"strength"}}}$catalog$::jsonb;
begin
  select id into v_owner_id
  from auth.users
  where lower(email) = 'pedrohdcosta@outlook.com'
  limit 1;

  if v_owner_id is null then
    raise exception 'Conta pedrohdcosta@outlook.com nao encontrada em Authentication > Users. Crie a conta antes de importar.';
  end if;

  select data, owner_user_id into v_state, v_saved_owner
  from public.ritmo_state where id = 'personal' for update;

  if v_state is null then
    raise exception 'Registro personal inexistente. Execute supabase/schema.sql primeiro.';
  end if;
  if v_saved_owner is not null and v_saved_owner <> v_owner_id then
    raise exception 'Registro personal ja vinculado a outro UID. Importacao cancelada para proteger os dados existentes.';
  end if;

  insert into public.ryvmo_import_backups(owner_user_id, data, revision)
  select v_owner_id, data, revision from public.ritmo_state where id = 'personal';

  -- Biblioteca global de exercicios, com imagens locais, instrucoes e peso compartilhado.
  v_exercise_data := coalesce(v_state->'exercises', '{}'::jsonb);
  for v_exercise in select value from jsonb_array_elements(v_catalog->'exercises')
  loop
    -- Se o exercicio ja foi importado, mantem a carga atual definida pelo usuario.
    v_exercise_data := jsonb_set(v_exercise_data, array[v_exercise->>'id'],
      v_exercise || coalesce(v_exercise_data->(v_exercise->>'id'), '{}'::jsonb), true);
  end loop;
  v_state := jsonb_set(v_state, '{exercises}', v_exercise_data, true);

  -- Acrescenta os treinos sem remover exercicios manuais que possam estar nos dias.
  for v_day in select jsonb_object_keys(v_catalog->'plans') loop
    v_plan := coalesce(v_state->'plans'->v_day, '[]'::jsonb);
    for v_plan_item in select value from jsonb_array_elements(v_catalog->'plans'->v_day) loop
      if not exists (
        select 1 from jsonb_array_elements(v_plan) as item(value)
        where item.value->>'id' = v_plan_item->>'id'
      ) then
        v_plan := v_plan || jsonb_build_array(v_plan_item);
      end if;
    end loop;
    v_state := jsonb_set(v_state, array['plans', v_day], v_plan, true);
  end loop;

  -- Rotulos de cada dia, incluindo quarta-feira de descanso.
  v_state := jsonb_set(v_state, '{trainingDays}',
    coalesce(v_state->'trainingDays', '{}'::jsonb) || v_catalog->'trainingDays', true);
  if not (v_state ? 'workoutDetails') then
    v_state := jsonb_set(v_state, '{workoutDetails}', '{}'::jsonb, true);
  end if;

  update public.ritmo_state
  set data = v_state, owner_user_id = v_owner_id,
      revision = revision + 1, updated_at = now()
  where id = 'personal';

  raise notice 'RYVMO: programa importado para pedrohdcosta@outlook.com (UID=%). Confira que OWNER_USER_ID na Vercel e igual a este UID.', v_owner_id;
end;
$import$;

commit;

-- Resumo da importacao. O resultado deve indicar 1, 7, 0, 1, 9, 8, 8.
select
  rs.revision,
  au.email as owner_email,
  jsonb_array_length(rs.data->'plans'->'0') as segunda,
  jsonb_array_length(rs.data->'plans'->'1') as terca,
  jsonb_array_length(rs.data->'plans'->'2') as quarta,
  jsonb_array_length(rs.data->'plans'->'3') as quinta,
  jsonb_array_length(rs.data->'plans'->'4') as sexta,
  jsonb_array_length(rs.data->'plans'->'5') as sabado,
  jsonb_array_length(rs.data->'plans'->'6') as domingo
from public.ritmo_state rs
left join auth.users au on au.id = rs.owner_user_id
where rs.id = 'personal';
