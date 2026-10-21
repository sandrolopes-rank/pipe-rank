# Rank CRM — Contexto Global do Projeto

> **Arquivo de leitura global**: contexto geral, instruções permanentes de trabalho e backlog vivo.
> Manter sempre atualizado a cada mudança relevante. Última revisão: 20/10/2026.

---

## 1. Contexto geral

**Produto:** Rank CRM — gestão de pipeline de receita da RankMyApp (Gestão de Receita).
**Stack:** Next.js 16.3.6 (App Router, Turbopack) · React 19 · TypeScript · Tailwind 4 · Supabase (auth + Postgres + realtime) · Recharts 3 · lucide-react.
**Deploy:** Vercel, a partir do `main` do repositório `sandrolopes-rank/pipe-rank` (deploy automático no push).
**Versão:** SemVer simplificado gerido por `scripts/version.mjs` (`npm run version:update|check`). `feat` → MINOR, `fix` → PATCH. Atual: **v0.13**.

**Integração Elephan.AI** (página `/elephan`, admin): a Elephan é a plataforma de revenue intelligence que grava/transcreve reuniões do time. A API externa (somente leitura, `https://api.elephan.dev`, auth `Bearer elk_prod_...`) fornece transcrições completas, resumo IA, sentimento (geral e por participante), objeções/churn signals, scorecard, conversas de WhatsApp e insights agrupados. Docs: `https://api.elephan.dev/docs/`. O acesso desta integração é controlado pelo **sistema de privilégios** (abaixo).

**Sistema de privilégios (RBAC por página/função — 20/10/2026):** o admin cria privilégios custom em `/usuarios` → aba **+ Privilégios**. Cada privilégio define, por página: acesso (`full`/`readonly`/`disabled`=cinza não-clicável na sidebar/`hidden`), escopo de dados (`all`=geral / `own`=somente atribuídos) e funções granulares (ex.: na Elephan — dashboard, alertas, reuniões, playground). Arquitetura:
- `supabase-privileges.sql` — tabela `public.privileges` (config JSONB, RLS, seeds `admin`+`usuario`). **Precisa ser rodado no SQL Editor** (rodado em 20/10). **Cuidado**: a policy de escrita **não pode referenciar `user_roles`** (a policy dela é autorreferente → erro 42P17 "infinite recursion" em qualquer SELECT; corrigido em `supabase-privileges-fix-rls.sql`, que checa só o JWT);
- `src/lib/privileges.ts` — **registry declarativo** com labels/descrições/funções granulares (`PAGES_MANUAL`);
- **Auto-detecção de páginas**: `scripts/gen-privileges-pages.mjs` escaneia `src/app/**/page.tsx` e gera `src/lib/privileges-pages.generated.ts`; roda sozinho em `predev`/`prebuild` (ou `npm run gen:privileges`). O registry final = manual (prioridade) + rotas novas detectadas (label do caminho, sem funções granulares, descrição "Página detectada automaticamente"). **Página nova no projeto aparece sozinha no formulário de privilégios, nascendo "Oculta"** (habilitação explícita). Rotas excluídas da detecção: `login`, `recupera-senha`, `auth`, `dashboard`, `oportunidades` (stubs) e `usuarios` (admin-only). Configs padrão (admin/usuário/blank) são derivadas dinamicamente do registry — nada a editar ao criar página;
- `src/lib/use-privileges.ts` — hook que resolve a config do usuário logado (role do `user_metadata`: `admin`/`user`/slug custom; fallback seguro = config "Usuário" quando a tabela/slug não existe);
- `/api/privileges` + `/api/privileges/[id]` — CRUD (service role; `admin` imutável, `usuario` editável e não excluível);
- Atribuição: select de privilégio na tabela de usuários (`/api/users/role` valida slugs custom);
- **Admin** = acesso pleno imutável. `/usuarios` e `/planos` permanecem admin-only fora do registry (segurança).

**Arquitetura da integração Elephan:**
- `src/app/api/elephan/proxy/route.ts` — proxy server-side (evita CORS, whitelist de paths de leitura, aceita key do client ou fallback `ELEPHAN_API_KEY` no `.env.local`);
- `src/components/elephan-dashboard.tsx` — dashboard mensal (KPIs, por dia, horas/responsável, clientes, sentimentação com drill-down);
- `src/components/elephan-meetings.tsx` — lista de reuniões (filtros, paginação, modal de detalhe);
- `src/components/elephan-playground.tsx` — explorador da API (somente admin);
- `src/components/elephan-alerts.tsx` — quadro de alertas (registry plugável de avaliadores);
- Dados de **outubro/2026** para teste: 77 reuniões, 52,4h, 64% com deal no CRM (HubSpot), 4 com negativo dominante.

**Particularidades de dados (API real ≠ documentação):**
- `sentimentAnalysis.totalSentiment` é **array** `{sentimental, total, perc}` (docs dizem string);
- `keywords[]` são objetos `{word, count, positions}`;
- `speakers[]` **não traz nome de quem falou** (id vazio);
- `sentimentAnalysis.speakerSentiment[]` traz nomes e % por participante (não documentado);
- `reasons[]` (churn signals etc.) só vem no **detalhe** (não na lista) e só em parte das reuniões;
- `url_file` = áudio .webm da gravação (S3);
- **Deep link da reunião no app Elephan**: `https://app.elephan.ai/info-transcript/?t={ObjectId}` (mesmo ID da API — descoberto navegando no app; não documentado na API);
- Recharts 3 **não renderiza LabelList** se o gráfico montar com a aba em segundo plano → usar `isAnimationActive={false}`.

---

## 2. Instruções permanentes (sempre seguir)

1. **Testes de nivelamento de UI**: toda vez que criar ou ajustar camadas de UI, rodar verificação de nivelamento/alinhamento (alturas, tops, screenshots) para identificar quebras.
2. **Commit apenas sob pedido**: nunca commitar/push sem o usuário avisar explicitamente.
3. **Camada de análise/insights da Elephan: somente admins** (privilégios por camada de acesso serão discutidos no futuro).
4. **Verificar shapes reais da API antes de implementar** — a documentação diverge dos dados retornados (ver seção 1).
5. **Nivelar visualmente** novos controles com os existentes (mesma altura/padrão dos inputs do projeto).
6. **Não usar `<DashboardLayout>` sem `userEmail`** em páginas admin — a sidebar perde o modo admin (bug já corrigido em recupera/renovacoes/elephan).

---

## 3. Backlog vivo

### Elephan.AI
- [ ] **Chave de API do time**: a chave atual é pessoal (insights bloqueados — "Team-scoped endpoint"). Ninguém do time é `super_admin`; solicitar à Elephan (`api@elephan.dev`) geração/promoção para chave de time. Libera: `/v1/insights`, `/v1/insights/clusters`, `/v1/webhooks`.
- [ ] **Scorecards CS/Farming**: configurar scorecards no painel Elephan (Configurações → Scorecard → Adicionar perguntas; tipos range/yesno/text) e vincular aos tipos de reunião do time (o time é CS/Farming). Camada de alerta de scorecard já pronta no código (`AVALIADORES` em `elephan-alerts.tsx`, `ativo: false`).
- [ ] **Insights por sentimento**: com a chave de time, cruzar `/v1/insights` com sentimentos para explicações do "motivo" de cada sentimentação (por reunião e por participante).
- [ ] **Alertas da Elephan no sino (server-side)**: a integração client-side está feita (contagem + link para o quadro); para alertas em tempo real sem depender de visita à página, usar webhook/poller com a chave de time.
- [ ] **`/v1/stats` retorna 404** em produção (documentado mas não implementado pela Elephan).
- [ ] **Nome do speaker nas utterances**: API não traz quem falou — solicitar à Elephan inclusão do campo.
- [ ] **Dashboard**: ideias a definir com o usuário (evolução das métricas, metas, comparação entre meses).

### Supabase / infra
- [ ] **404 nas tabelas `users` e `recoveries`**: a página Recupera consulta tabelas que não existem no projeto Supabase atual.
- [ ] **Bloqueio server-side das rotas admin** (middleware): hoje a proteção é client-side; rotas como `/usuarios`, `/recupera`, `/renovacoes`, `/elephan` são acessíveis por URL direta (exposição apenas visual/funcional mitigada pelos guards).

### CRM geral
- [x] ~~Definir privilégios por camada de acesso~~ → sistema de privilégios implementado (ver seção 1). Evoluções pendentes:
  - [ ] **RLS server-side por privilégio**: enforcement atual é client-side (guards de rota + UI); idealmente o escopo `own`/`all` vira policy no Postgres.
  - [ ] **RLS do Recupera**: escopo `own` na página `/recupera` ainda não filtra dados (tabela nem existe no projeto Supabase atual — ver backlog Supabase).
  - [ ] **Escopo `own` na Elephan usa heurística** de match por e-mail/nome (dono da reunião ou participante em `speakerSentiment`); se a Elephan expuser ID do CRM, trocar por match exato.

---

## 4. Funcionalidades por página

- **`/overview`** — dashboard principal: KPIs (Upsell/Cross Sell com modal de clientes e produtos negociados), Propostas em Andamento (modal reestilizado com badges), Mapa de Calor, gráfico "Upsell por Mês" com **modal por coluna** (clientes do mês, 3 slides), tabela de oportunidades. **Privilégios**: funções `kpis`/`graficos`/`tabela` escondem seções; `readonly` esconde criar/editar/arquivar/excluir; escopo `own` filtra por `owner_email` (tabela, KPIs, gráficos e drill-downs).
- **`/elephan`** — integração Elephan (admin): **botão API Playground no topo** (abre modal), card-resumo de alertas (clicável → quadro com abas Críticos/Medianos; alertas clicáveis → modal de detalhes com sinais extraídos), dashboard mensal (navegação por mês, KPIs, por dia/responsável/clientes/tipos/horas/sentimentação — **todas as camadas clicáveis**: agregado → modal de grupo → reunião → modal de detalhe), sentimentação com drill-down por cliente/participante e exclusões gerenciadas + painel de reuniões (filtros responsável/data/busca, modal com resumo IA, sentimento por participante, transcrição por fala, scorecard viz, HubSpot, gravação, deep link para a Elephan).
- **`/alertas`** — histórico de alertas (admin).
- **`/recupera`, `/renovacoes`, `/analytics`** — módulos com acesso por privilégio (cada um com regra própria no registry).
- **`/usuarios`** — admin-only: abas **Usuários** (CRUD + select de privilégio por usuário, inclui customs) e **+ Privilégios** (CRUD de privilégios; formulário gerado do registry `src/lib/privileges.ts`, que mescla entradas manuais com as rotas auto-detectadas do projeto).
- **`/planos`** — anotações e planos futuros; acesso por privilégio (padrão: oculta para não-admins, admin sempre vê).
- **Sino de notificações (sidebar)** — badge = não lidas; diminui por item aberto; persistência em localStorage (`alertas_read_v1`). **Integra Elephan**: alertas de sentimentação/churn do mês (admin, cache-first) aparecem no sino e direcionam para `/elephan?alertas=1` (quadro auto-aberto); lidos controlados pelo quadro (evento `elephan-alertas-lidos`).

---

## 5. Credenciais de teste (local)

- Admin CRM: `sandro.lopes@rankmyapp.com.br` / `senha123`
- Usuário comum: `teste@rankmyapp.com.br` / `senha123`
- Chave API Elephan (pessoal, no `.env.local` como `ELEPHAN_API_KEY`): `elk_prod_5aa9...` (**não commitar**)

---

## 6. Decisões registradas

- **Privilégios (20/10/2026)**: config JSONB por página (`access`/`scope`/`features`) na tabela `privileges`; atribuição via `user_metadata.role` ('admin' | 'user' | slug custom) — sem tabela de join. Registry TS (`src/lib/privileges.ts`) é a fonte das páginas/funções configuráveis, **mesclando entradas manuais com rotas auto-detectadas** (`scripts/gen-privileges-pages.mjs` em predev/prebuild) — página nova nasce "Oculta" e os configs padrão são derivados dinamicamente; enforcement client-side (sidebar cinza/oculta, guards de rota com redirect para `homeHref`, readonly esconde ações, escopo filtra dados); admin sempre pleno; sino mostra alertas Elephan também para privilégios com função `alertas` liberada. Estado inicial do hook é **conservador** (config "Usuário") — sem sessão nunca se expõe nav restrita. E2E validado: sidebar (clicável/cinza/oculta), readonly sem "Nova Oportunidade", Elephan sem Playground com quadro de alertas independente do dashboard, redirects `/usuarios`/`/analytics`/`/renovacoes`/`/recupera` → home do privilégio, escopo `own` travando filtro de responsável na tabela de reuniões, e auto-detecção (página temporária criada apareceu sozinha no formulário e sumiu ao remover).
- Integração Elephan: leitura via proxy server-side (CORS); chave no localStorage do admin + fallback `.env.local`.
- Camada de análise/insights = admin-only (futura discussão de camadas de acesso).
- Alertas v1: quadro na página /elephan; gatilhos ativos = sentimento negativo dominante (≥40% e > positivo) e churn_signal (via detalhe das reuniões negativas); scorecard = camada pronta inativa.
- Estratégia de dados: a **lista** da API já traz sentiment/deal/summary — detalhe só quando necessário (modal, churn check).
- **Performance**: cache localStorage com strip dos campos pesados (zero custo no Supabase), TTL 15min + stale-while-revalidate; opção B (cache server-side) fica para quando houver múltiplos admins/sino em tempo real.
- **Chave da API Elephan centralizada no Supabase** (`app_config.elephan_api_key`): o admin troca pela interface (playground → "Salvar no servidor") e vale para todos imediatamente — sem variável de ambiente na Vercel. O proxy resolve nesta ordem: override do playground → app_config (service role, cache 60s) → env `ELEPHAN_API_KEY` (fallback). SQL: `supabase-elephan-config.sql` (RLS admin-only; proxy lê via service role).
- **Exclusões da sentimentação**: o admin gerencia (botão "Pessoas" no card de sentimentação) quais nomes são removidos das views de sentimento (ex.: membros internos), persistido em localStorage (`elephan_sentimento_excluidos`) — aplicado ao card e aos participantes do drill-down. Persistência compartilhada (Supabase) fica como evolução futura caso haja múltiplos admins.
