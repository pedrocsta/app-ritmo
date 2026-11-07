# RYVMO - Seu progresso, todos os dias

App pessoal de habitos, dieta e treinos. **Next.js 16 + TypeScript + Supabase**. Design dark mobile-first, PWA para instalar no iPhone, e **login exclusivo para uma conta**. O codigo preserva os seus dados ja existentes da versao RITMO: a tabela `public.ritmo_state` e o formato `version: 1` continuam iguais.

## O que ha nesta versao

- Identidade visual RYVMO, modo escuro, experiencia responsiva para iPhone 16 Pro Max e desktop.
- Login com e-mail e senha via **Supabase Auth**. Nao ha tela de cadastro. Somente `OWNER_USER_ID` pode acessar o painel ou a API, mesmo se outras contas existirem no projeto.
- Habitos editaveis: criar, renomear, alterar descricao, icone e cor; excluir os existentes. Os cinco iniciais continuam disponiveis (Duolingo, creatina, academia, estudo e nao beber).
- Seis etapas iniciais da dieta tambem podem ser renomeadas, removidas ou ampliadas.
- Heatmap dinamico (53 semanas), estatisticas e pontuacoes recalculadas conforme os habitos e refeicoes ativos.
- Treinos de segunda a domingo; cargas compartilhadas para o mesmo exercicio entre dias, series e repeticoes independentes, historico de sessoes preservado.
- Salvamento na nuvem com revisao concorrente, cache temporario offline, exportar/importar backup.
- Service worker guarda apenas arquivos estaticos; nunca faz cache de HTML ou dados privados.

## 1. Supabase - reaproveite seu banco atual

**Nao apague a tabela nem execute um DROP TABLE.** O seu `supabase/schema.sql` antigo ja criou `public.ritmo_state`, e a nova versao e compativel com ela. Se voce nao tinha aplicado o SQL, execute `supabase/schema.sql` uma vez no SQL Editor.

1. Abra **Supabase > Authentication > Users**.
2. Clique em **Add user > Create new user**, informe seu e-mail e uma senha forte e marque a confirmacao de e-mail se a interface oferecer essa opcao. Se o fluxo de criacao mudar, use **Invite user** e conclua a senha pelo e-mail.
3. Copie o **User UID** (UUID) desse usuario, nao o e-mail. Voce usara como `OWNER_USER_ID`.
4. Em **Authentication > Providers > Email / Settings**, desative **Allow new users to sign up**. Mantenha o login por e-mail/senha ativo. Isso impede cadastros publicos.
5. Em **Project Settings > API Keys**, copie a chave **publishable** (`sb_publishable_...`); a chave **Secret** (`sb_secret_...`) continua sendo usada so no servidor.
6. Copie a Project URL do projeto em **Connect** ou em Project Settings.

## 2. Variaveis de ambiente

Crie `.env.local` no seu PC; **nao coloque este arquivo no GitHub**. Preencha a partir de `.env.example`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_SUA_CHAVE_PUBLICA
SUPABASE_URL=https://SEU-PROJETO.supabase.co
SUPABASE_SECRET_KEY=sb_secret_SUA_CHAVE_SECRETA
OWNER_USER_ID=UUID_DO_USUARIO_CRIADO_NO_SUPABASE
```

A URL se repete porque o app usa Supabase Auth no browser e a API de dados em uma rota segura no servidor. **So a publishable key e publica**. Nunca envie ou exponha `SUPABASE_SECRET_KEY`.

## 3. Instalar e executar

Node.js **20.9+**:

```bash
npm install
npm run test
npm run typecheck
npm run build
npm run dev
```

Abra http://localhost:3000. Deve redirecionar para `/login`. Entre com a sua conta unica. Se `OWNER_USER_ID` estiver incorreto ou ausente, nenhum usuario recebe acesso.

## 4. Atualizar GitHub e Vercel

Copie os arquivos deste projeto para o repositorio existente, **mantendo o historico .git e evitando substituir suas credenciais**. Faca commit e push. No painel **Vercel > Project > Settings > Environment Variables**, configure as **cinco** variaveis acima em `Production`. Certifique-se de que a Root Directory aponta para a pasta que contem `package.json`. Faca **Redeploy** depois de atualizar as variaveis.

No iPhone: acesse sua URL HTTPS da Vercel pelo Safari, entre com a senha, toque em **Compartilhar > Adicionar a Tela de Inicio**. No PC, use a mesma URL. Tudo sincroniza no mesmo registro Supabase. Se Vercel Authentication estiver ativada, havera uma autenticacao *adicional* da Vercel; ela nao e necessaria quando este login unico estiver corretamente configurado.

## 5. Privacidade, migracao e limites

- A URL `/api/state` exige uma sessao valida do Supabase **e** UID igual a `OWNER_USER_ID`. A service-role/secret key so existe no backend. `public.ritmo_state` mantem RLS e nega acesso direto a `anon` e `authenticated`. Nao adicione policies que exponham essa tabela ao browser.
- A pagina `/` verifica a sessao no servidor e encaminha visitantes para `/login`.
- Nao ha cadastro no app. Desative os signups no Supabase para manter uma unica conta.
- **Seus dados existentes continuam na linha `id = 'personal'`.** Ao abrir, dados antigos sao migrados automaticamente em memoria. A primeira alteracao salva os novos campos opcionais de habit management, sem apagar treinos antigos.
- Excluir um habito ou uma refeicao remove o item do painel e da pontuacao, mas **preserva seus checks antigos no JSON**. Para restaurar, use um backup (recomendado antes de exclusoes).
- Quando a lista muda, o heatmap e os percentuais historicos sao recalculados segundo as metas *atualmente ativas*.
- Se excluir o habito de academia, o **gerenciador de treinos permanece disponivel** pela aba Treinos. Se excluir o de estudo, os minutos passados tambem ficam preservados.
- O cache local e apagado ao sair. Por motivos de seguranca, **HTML privado nao e armazenado para abrir offline apos encerrar a sessao**. Uma aba ja aberta pode manter anotacoes pendentes de sincronizacao, mas nao limpe os dados antes de aparecer "Sincronizado".
- Limites: 80 habitos, 30 etapas da dieta, 3.5MB por salvamento, backups ate 3MB; a API mantem controle de revisao e alerta em conflito de edicao.
- A seguranca depende de uma senha forte, das credenciais secretas mantidas fora do GitHub, da configuracao de Auth e do UID correto. Ative MFA no Supabase se achar necessario para a conta pessoal.

## Como esta organizado

```
app/
  page.tsx                  # Protecao server-side da home
  dashboard.tsx             # Dashboard e editores, client-side
  login/page.tsx            # Protecao da pagina de login
  login/login-form.tsx      # UI de login
  api/auth/me/route.ts      # Confirma o UID autorizado apos entrar
  api/state/route.ts        # GET/PUT protegidos -> registro no Supabase
  globals.css              # Design system dark
lib/
  auth.ts                   # Verifica Supabase Auth + OWNER_USER_ID
  model.ts                  # Modelo, compatibilidade, score dinamico
  use-cloud-store.ts       # Cache temporario, sync e conflitos
  supabase/client.ts       # Cliente publico de login
  supabase/server.ts       # Cliente SSR com cookies
  supabase-server.ts        # Acesso secreto REST somente server
proxy.ts                    # Refresh de cookies SSR no Next 16
supabase/schema.sql         # SQL existente; nao requer migracao
public/sw.js                # Apenas cache de assets publicos
```

**Nota de verificacao:** testes unitarios e de rota usam mocks e nao conectam a um banco real. Antes de depender do app diariamente, confira login, salvar, logout, acesso negado a `/api/state` sem login e sincronizacao PC/iPhone na sua publicacao real. Este codigo nao foi enviado automaticamente para seu repositorio GitHub.
