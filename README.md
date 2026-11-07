# Ritmo — hábitos, dieta e treinos

Aplicativo **Next.js 16 + React 19 + TypeScript + Supabase**, projetado como PWA responsivo, com especial atenção ao Safari do **iPhone 16 Pro Max**. O aplicativo é de **usuário único e não pede cadastro nem login**.

## O que está implementado

- 11 metas diárias: Duolingo (inglês), creatina, academia, 60 minutos de estudo (meta ajustável), não beber álcool e 6 refeições: café da manhã, lanche da manhã, almoço, lanche da tarde, pré-treino e janta.
- Dashboard de progresso, estatísticas de sequência, histórico de hábitos e **heatmap de 53 semanas**; escolha um dia no heatmap para revisar os registros.
- **Gerenciador de treinos de segunda a domingo**, com catálogo de exercícios, cargas em kg, séries e repetições e conclusão individual de séries.
- Carga **centralizada por exercício**: usar “Supino reto” na segunda e quinta referencia o mesmo exercício. Se você mudar a carga em um dia, ela muda no outro; séries/repetições podem ser diferentes por dia.
- Ao finalizar um treino, o app guarda um **registro histórico dos pesos, séries e repetições daquela sessão**. Alterar a carga atual não modifica o histórico de treinos antigos.
- Sincronização automática com Supabase, com indicador de status, cópia temporária no navegador para falhas de conexão e detecção de edição simultânea com controle de revisão.
- Backup manual em JSON, importação, botão para apagar os registros, manifest e service worker para instalação como PWA.
- Migração automática da antiga versão local: se houver dados locais legados e o banco estiver vazio, o Ritmo os envia ao Supabase na primeira execução.

## 1. Preparar o Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. Abra **SQL Editor** no painel do projeto.
3. Copie e execute o conteúdo de [`supabase/schema.sql`](supabase/schema.sql). Ele cria **um único registro** em `public.ritmo_state` e ativa RLS sem permitir acesso direto às chaves públicas.
4. Em **Connect → API Keys** (ou **Project Settings → API Keys**), copie a URL do projeto e uma chave **Secret** que começa com `sb_secret_`. A chave é usada **somente no backend**.

> **Nunca** coloque a chave Secret em `NEXT_PUBLIC_*`, no código do cliente, em screenshots ou em um repositório. Não envie essa chave em mensagens de chat.

## 2. Configurar o Next.js

Requer **Node.js 20.9+**.

```bash
cp .env.example .env.local
```

Preencha `.env.local`:

```env
SUPABASE_URL=https://SEU-PROJETO.supabase.co
SUPABASE_SECRET_KEY=sb_secret_SUA_CHAVE
```

Depois execute:

```bash
npm install
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

Para validar o projeto:

```bash
npm run test
npm run typecheck
npm run build
```

Se o app apresentar erro de conexão, confirme que o SQL foi executado, que a URL e a chave estão corretas e que o servidor foi reiniciado após mudar as variáveis.

## 3. Hospedar e instalar no iPhone

1. Hospede este projeto em um serviço com suporte a **Next.js Route Handlers**, como Vercel.
2. Cadastre **SUPABASE_URL** e **SUPABASE_SECRET_KEY** nas variáveis do ambiente do servidor da hospedagem. **Não** exponha a chave ao browser.
3. Proteja o endereço com o mecanismo de **acesso privado da hospedagem** (veja o aviso abaixo).
4. No iPhone, abra a URL HTTPS no Safari e use **Compartilhar → Adicionar à Tela de Início**.

O layout respeita as áreas seguras do iOS e tem navegação inferior fixa.

## Aviso de segurança: por que uma instalação privada importa

Este app atende ao pedido de **não ter login**. Para isso, a API `/api/state` é deliberadamente **sem autenticação de usuário**. O banco bloqueia acesso anônimo direto, e a chave Secret fica apenas no servidor, **mas isso não impede que visitantes de um site público usem a API do próprio site**. Se você publicar sem proteção, **qualquer pessoa que obtenha a URL poderá ler, alterar ou apagar seus hábitos e treinos**.

Para que o uso seja realmente pessoal, **não publique o endpoint abertamente**: escolha uma hospedagem com restrição de acesso, Cloudflare Access, uma VPN/rede privada ou outra proteção no nível de infraestrutura. Esse controle pode solicitar identificação para abrir o site, mas **o próprio Ritmo continua sem login**. URL escondida, por si só, não equivale a segurança.

## Como a persistência funciona

- O Supabase guarda o documento `data` em uma coluna `jsonb`, junto de `revision` e `updated_at`, em uma linha `id = 'personal'`.
- `GET /api/state`: carrega o estado completo da nuvem.
- `PUT /api/state`: salva o estado completo somente se a revisão atual ainda for a esperada. Isso evita **sobrescrita silenciosa** entre abas e aparelhos.
- Se não houver conexão, o app preserva o estado em `localStorage` como **cópia pendente**, não como armazenamento principal. No próximo acesso, tentará sincronizar. Não limpe os dados do navegador antes de a indicação “Sincronizado” aparecer.
- Se dois dispositivos tiverem alterações conflitantes, o app mostra as opções **Carregar da nuvem** e **Manter este aparelho**. Faça backup antes de escolher, pois uma versão substituirá a outra.
- Para economizar recursos, alterações são enviadas após um pequeno intervalo de inatividade. A nuvem é atualizada ao voltar para a aba e periodicamente enquanto ela estiver visível. Não utiliza Realtime.

## Limitações da versão

- Ainda não há conexão ao seu **projeto real**: você precisa preencher `.env.local` e executar o SQL acima para vincular a conta.
- O corpo de um salvamento está limitado a 3,5 MB; backup importado tem limite de 3 MB. Isso é adequado ao uso pessoal normal, mas uma base muito extensa exigirá dividir o documento em várias tabelas.
- Sem acesso à rede na primeira abertura, o app precisará de um cache já carregado para abrir registros.
- Como o histórico é mantido em snapshots, o peso atual pode ser compartilhado entre dias sem alterar sessões concluídas.

## Estrutura

```text
app/
  page.tsx                 # Dashboard, dieta, heatmap, editor de treinos
  api/state/route.ts       # GET e PUT -> Supabase REST, apenas no servidor
  globals.css              # Design system responsivo
lib/
  model.ts                 # Modelo, validação, sincronização das cargas
  use-cloud-store.ts       # Persistência no Supabase, cache e conflito
  supabase-server.ts       # Chave Secret, server-only por convenção
  dates.ts
supabase/
  schema.sql               # Tabela e restrições de acesso
.env.example              # Variáveis de ambiente sem credenciais reais
public/                   # Ícones, manifest e PWA
```
