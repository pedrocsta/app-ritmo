# RYVMO 3.0 — hábitos, dieta e Hipertrofia Estética

Aplicativo **Next.js 16 + React 19 + Supabase Auth** com tema escuro, versão mobile-first e suporte a iPhone e desktop. Projeto de usuário único, login por e-mail e senha e sincronização protegida. O programa de treino está incluído em um **script SQL separado**, para adicionar os planos à conta indicada sem apagar dados existentes.

## Arquivos essenciais

| Arquivo | Finalidade |
| --- | --- |
| `supabase/importar-treino-pedro.sql` | **Execute no Supabase SQL Editor** para importar a semana inteira para `pedrohdcosta@outlook.com` |
| `supabase/hipertrofia-estetica.catalog.json` | Fonte estruturada e legível dos 28 movimentos e 34 itens de plano |
| `public/exercises/*.svg` | **28 ilustrações originais esquemáticas** embutidas no projeto, sem links externos nem imagens de alongamento |
| `app/dashboard.tsx` | Treinos, imagens ampliáveis, prescrições, séries realizadas e registros |
| `app/globals.css` | Tema escuro, hovers e abas da semana alinhadas verticalmente |
| `lib/model.ts` | Compatibilidade com os registros anteriores e novos detalhes de treino |

## O que entra na semana

| Dia | Tipo | Conteúdo |
| --- | --- | --- |
| Segunda | Corrida | 40 min: 5 caminhando + 30 correndo + 5 caminhando |
| Terça | Lower A + Abdômen | 7 exercícios, foco em quadríceps |
| Quarta | Descanso | Dia de recuperação, sem exercícios adicionados |
| Quinta | Corrida | 40 min: 5 caminhando + 30 correndo + 5 caminhando |
| Sexta | Upper A | 9 exercícios de peito, costas, ombros e braços |
| Sábado | Lower B + Abdômen | 8 exercícios, foco em posteriores, glúteos e quadríceps |
| Domingo | Upper B | 8 exercícios, ênfase estética |

**Alongamento e mobilidade não foram incluídos**, conforme solicitado. Os 34 itens usam 28 movimentos/imagens porque há exercícios repetidos em mais de um dia.

## 1) Antes de importar — verificação da conta

1. No Supabase, abra **Authentication → Users** e confirme que existe **`pedrohdcosta@outlook.com`**.
2. Copie o **UID** dessa conta (UUID). Na Vercel, `OWNER_USER_ID` **deve corresponder exatamente a esse UID**. O e-mail não substitui o UID.
3. No RYVMO atual, se houver dados pendentes, aguarde aparecer **Sincronizado**. Se possível, exporte um backup em **Ajustes → Exportar backup**. Feche as abas do RYVMO antes de rodar SQL para evitar conflitos de revisão.
4. **Não execute o schema inicial novamente** se a tabela `public.ritmo_state` já existe. Este projeto traz uma migração de treino própria e não precisa de `DROP TABLE`.

## 2) Executar o SQL de importação

No painel do **mesmo projeto Supabase** conectado à Vercel, abra **SQL Editor → New query**, copie o conteúdo completo de `supabase/importar-treino-pedro.sql` e execute.

O script, numa transação:

- Confirma que `pedrohdcosta@outlook.com` existe em `auth.users`.
- Impede o vínculo se a linha `personal` já pertence a **outro UID**.
- Acrescenta a coluna `owner_user_id` ao registro atual.
- Cria a tabela privada `ryvmo_import_backups` e salva uma cópia de `data` e `revision` **antes de modificar**.
- Acrescenta o plano completo, sem apagar hábitos, refeições, dias marcados, sessões ou exercícios anteriores.
- Evita duplicações do mesmo identificador se você rodar o SQL duas vezes.
- Mantém o **peso atual** de exercícios já importados em vez de redefini-lo.
- Incrementa `revision`, permitindo que o app perceba a alteração externa.

A consulta de verificação ao fim deve mostrar `owner_email = pedrohdcosta@outlook.com` e **pelo menos** `segunda=1, terca=7, quarta=0, quinta=1, sexta=9, sabado=8, domingo=8`. Se existiam exercícios manuais nesses dias, os totais podem ser maiores, porque a importação **não os apaga**.

**Importante sobre cargas compartilhadas:** a aplicação mantém um único valor **atual** por movimento. Por isso, referências distintas do seu plano são preservadas e exibidas em cada dia: cadeira flexora (60 kg terça / 55 kg sábado), abdominal na polia (50 kg terça / 45 kg sábado), puxada alta neutra (60 kg sexta / 65 kg domingo). Ao modificar a **carga atual compartilhada**, ela muda em todas as aparições; as **referências originais** e os snapshots de treinos concluídos permanecem intactos. As cargas de referência são sugestões do plano, não metas obrigatórias.

## 3) Atualizar o GitHub / Vercel

Copie **todos os arquivos e pastas** de `ryvmo-next/` para a raiz do repositório atual que contém `package.json` (ou configure Root Directory na Vercel). Mantenha o diretório `.git` e **não envie** `.env.local` nem chaves secretas. Faça commit e push. A Vercel fará um novo deployment da branch configurada.

As **cinco variáveis de ambiente** continuam com estes nomes na Vercel → **Project Settings → Environment Variables → Production**:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_SUA_CHAVE_PUBLICA
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SECRET_KEY=sb_secret_SUA_CHAVE_SECRETA
OWNER_USER_ID=UUID_DA_CONTA_PEDRO
```

As variáveis `NEXT_PUBLIC_` são usadas pelo login; a chave `sb_secret_` **jamais** deve aparecer em código cliente ou repositório. **Redeploy** após alterar variáveis.

Teste a URL de produção `/login`, faça login e abra **Treinos**. Em caso de erro 500, confira **Vercel → Logs**: esse erro não pode ser diagnosticado pelo texto genérico do navegador. A versão mantém o tratamento resiliente do proxy e das rotas autenticadas para evitar 500 não tratados por falha temporária no Auth; isso não dispensa validar as configurações e os logs reais.

## 4) Usar no celular e no PC

No PC: abra a URL HTTPS da Vercel no navegador e faça login. No iPhone: abra a mesma URL no Safari, faça login, toque em **Compartilhar → Adicionar à Tela de Início**. No Safari, selecione **Abrir como App** quando a opção estiver disponível. Os dados são compartilhados pelo Supabase.

As imagens podem ser tocadas para ampliar; há uma dica textual para reconhecer cada movimento. **São ilustrações esquemáticas, não fotografias ou avaliação técnica de postura**. Para um movimento desconhecido, peça demonstração a um profissional.

No treino de força é possível:

- editar séries e repetições planejadas para cada dia;
- editar a carga atual (compartilhada automaticamente com aparições do mesmo exercício);
- conferir descanso, faixa de repetições e carga original de referência;
- marcar as séries realizadas e expandir **Registrar repetições e cargas por série**;
- concluir o treino: os valores efetivamente registrados ficam no histórico como snapshot, sem serem alterados por futuras progressões de carga.

Corridas de segunda e quinta têm um botão próprio de conclusão e **não marcam automaticamente o hábito de academia**. Quarta aparece como descanso. Todos os hábitos e refeições preexistentes permanecem administráveis em Ajustes.

## 5) Desenvolvimento local

Requer Node.js **20.9+**:

```bash
npm install
npm run test
npm run typecheck
npm run build
npm run dev
```

Abra http://localhost:3000. O arquivo `.env.example` contém os nomes das variáveis. Copie para `.env.local` e preencha localmente, **sem commitar**.

## 6) Segurança e limites

- O servidor verifica a sessão Supabase Auth e compara o UID com `OWNER_USER_ID`; sem isso, retorna 401/403/503 em vez de liberar dados.
- A linha `public.ritmo_state` usa a API do Supabase apenas via Next.js com chave secreta server-side. O RLS continua ativado, sem policies para `anon` e `authenticated` acessarem o JSON diretamente.
- A estrutura `version: 1` e os nomes da tabela antiga continuam compatíveis. A migração mantém o cache/conflitos de revisão existentes.
- O PWA só armazena arquivos públicos e assets estáticos em cache; não armazena HTML privado nem respostas da API.
- O limite de tamanho de salvamento ainda é 3,5 MB; em caso de conflito com outro dispositivo, escolha explicitamente uma versão depois de fazer backup.
- Para atualizar o peso, altere a carga compartilhada no exercício; para registrar o peso efetivamente usado numa série passada, use o formulário detalhado.

**Verificacao realizada aqui:** testes de modelo, autenticacao com mocks, recuperacao de falhas, UI dark, integridade das 28 ilustracoes, 34 itens de plano e round-trip dos dados passaram. A checagem de TypeScript e o build de producao do Next.js tambem passaram. A integracao autenticada com um Supabase real nao foi validada. O script SQL foi preparado e validado estruturalmente; sua execucao no projeto Supabase e uma etapa separada da publicacao do codigo.
