# test.md — Auditoria Técnica, QA Automatizado e Regressão — Rank CRM

> Auditoria ponta a ponta executada em **28/10/2026** sobre o estado do working tree
> (branch `main`, commit `a9c3a02`, **com as alterações não commitadas do usuário preservadas**).
> Repositório: `sandrolopes-rank/pipe-rank` · Versão declarada: v0.16.0.
>
> **Rodada 2 (28/10/2026, sequência da auditoria):** ações pendentes priorizadas executadas —
> padronização de `/api/elephan/config`, higiene de metadata do master, comentário do middleware,
> zerados os 5 erros de lint do `overview/page.tsx` (WIP). Suítes finais: **21/21 API · 20/20 unitários ·
> lint 0 erros · tsc 0 · build ✓ · E2E `/overview` com KPIs idênticos ao baseline**. Detalhes na seção 17.

---

## 1. Objetivo e escopo

Auditoria integral do Rank CRM (Next.js 16.3.6 + React 19 + Supabase): mapeamento de
arquitetura, inventário de funcionalidades, matriz de perfis/permissões, testes
automatizados (unitários, API/segurança e E2E no navegador), diagnóstico de defeitos com
causa-raiz, correções mínimas com evidências e regressão completa.

**Escopo de dados:** ambiente real do Supabase do projeto (credenciais de teste fornecidas
pelo dono). Nenhuma operação destrutiva foi executada; toda mutação de teste foi revertida
ao final (ver seção 16).

## 2. Stack e arquitetura encontrada

| Camada | Tecnologia / localização |
|---|---|
| Frontend | Next.js 16.3.6 App Router, React 19, Tailwind 4, Recharts 3 (`src/app/**/page.tsx`, `src/components/*`) |
| Backend | Route Handlers `src/app/api/**` (users, privileges, elephan proxy/config) |
| Auth | Supabase Auth (senha + Google OAuth com restrição de domínio `rankmyapp.com.br`), sessão SSR por cookies, middleware `src/middleware.ts` |
| Autorização | RBAC declarativo: `src/lib/privileges.ts` (registry) + `src/lib/use-privileges.ts` (client) + `src/lib/api-auth.ts` (server, novo no WIP) |
| Banco | Supabase Postgres; RPCs SECURITY DEFINER (`list_users_scoped`, `can_manage_privileges`, hierarquia); RLS por tabela |
| Integração externa | Elephan.AI via proxy server-side (`/api/elephan/proxy`), chave em `app_config` → `.env.local` |
| Deploy | Vercel a partir do `main` |
| Testes | **Não existia nenhum** — criados nesta auditoria (`tests/`) |

### Fluxo de execução (login → dado)
`/login` → `signInWithPassword`/OAuth → sessão em cookies → middleware valida sessão →
páginas resolvem privilégio client-side (`usePrivileges`) → dados via Supabase anon
(RLS/RPC) ou rotas `/api/*` (JWT Bearer ou cookie + service role para escrita admin).

## 3. Ambiente e pré-requisitos

- Node + `npm install` (deps já presentes).
- `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`, `ELEPHAN_API_KEY` (não versionado).
- Dev server: `npm run dev` (porta 3000). **Observação:** durante a auditoria um dev
  server prévio do usuário já ocupava a porta 3000 (PID 15012) e foi reaproveitado
  (Turbopack recompila on-demand com o código atual — verificado).
- Credenciais de teste: admin `sandro.lopes@rankmyapp.com.br`, usuário `teste@rankmyapp.com.br`
  (ambas `senha123`, fornecidas pelo dono para esta auditoria).

## 4. Comandos de execução dos testes

```bash
npm run lint          # ESLint (baseline: 5 erros pré-existentes em overview/page.tsx)
npx tsc --noEmit      # TypeScript (limpo)
npm run build         # Build de produção (27 rotas)
npm test              # Testes unitários (Vitest) — 20 testes
npm run test:api      # Matriz de autorização das APIs (requer dev server na 3000)
```

## 5. Inventário de funcionalidades (F-xxx)

| ID | Funcionalidade | Camada | Estado |
|---|---|---|---|
| F-001 | Login por senha + OAuth Google (restrição de domínio) | `login/page.tsx`, `auth/callback` | VALIDADA (E2E) |
| F-002 | Middleware de sessão (proteção server-side de páginas) | `src/lib/supabase/middleware.ts` | VALIDADA COM RESSALVAS¹ |
| F-003 | Resolução de privilégios client-side (registry + fallback seguro) | `use-privileges.ts`, `privileges.ts` | VALIDADA (unitários + E2E) |
| F-004 | CRUD de oportunidades em `/overview` (escopo own/hierarchy/all, readonly) | `overview/page.tsx` | VALIDADA COM RESSALVAS² |
| F-005 | Sidebar com gating por privilégio (full/readonly/disabled/hidden) | `sidebar.tsx` | VALIDADA (E2E) |
| F-006 | Guards de rota client-side (redirect para `homeHref`) | páginas | VALIDADA (E2E: /analytics, /alertas, /planos, /recupera, /elephan) |
| F-007 | Listagem admin de usuários (`GET /api/users`) | `api/users/route.ts` | CORRIGIDA (BUG-001) → VALIDADA |
| F-008 | CRUD administrativo de usuários (`create/delete/reset-password/role/toggle-active`) | `api/users/*` | VALIDADA (API: negativas 401/403 corretas) |
| F-009 | Tema por usuário (`PATCH /api/users/theme`) | `api/users/theme` | CORRIGIDA (BUG-002) → VALIDADA |
| F-010 | CRUD de privilégios (`/api/privileges`, `/api/privileges/[id]`) | `api/privileges/*` | VALIDADA (API + E2E abas) |
| F-011 | Atribuição de privilégio por usuário | `api/users/role` | VALIDADA (E2E: atribuição + revogação testadas) |
| F-012 | Hierarquia de equipe (líder → subordinados, escopo server-side) | RPCs `list_users_scoped` / `list_hierarchy_emails`, `hierarchy-manager.tsx` | VALIDADA (E2E: líder vê self+descendentes) |
| F-013 | Proxy Elephan.AI (whitelist de leitura) | `api/elephan/proxy` | CORRIGIDA (BUG-003) → VALIDADA |
| F-014 | Config da chave Elephan (`/api/elephan/config`) | `api/elephan/config` | VALIDADA COM RESSALVAS³ |
| F-015 | Dashboard Elephan (KPIs, alertas, reuniões, playground) | `elephan/*` | VALIDADA (E2E pós-correção do proxy) |
| F-016 | Páginas Recupera / Renovações / Analytics / Alertas / Planos (acesso por privilégio) | páginas | VALIDADA (E2E guards; dados internos não exaustivos) |
| F-017 | Auto-detecção de páginas para privilégios (`gen-privileges-pages.mjs`) | `scripts/` | VALIDADA (executado em predev/prebuild: 7 páginas) |
| F-018 | Gestão de versão SemVer (`scripts/version.mjs`) | `scripts/` | NÃO TESTADA (fora do escopo crítico; sem achados na leitura) |

¹ O middleware só verifica existência de sessão — papéis/privilégios não são checados
server-side em páginas (dívida documentada no PROJETO.md; mitigada por guards client + RLS).
² Escopo de dados aplicado client-side (RLS de oportunidades cobre parcialmente — ver PROJETO.md).
³ Admin resolvido por e-mail hardcoded (`ADMIN_EMAIL`) com sessão de cookies — funciona para
o master real, mas diverge do padrão `getCaller` das demais rotas.

## 6. Matriz de perfis e permissões (resultados observados)

Perfis exercitados: **master/admin** (`sandro.lopes@`), **líder** (`teste@`, metadata
`role=lider`, subordinados reais: 2), **privilégio custom readonly** (criado e removido
durante o teste), **anônimo** (sem token).

| # | Cenário | Esperado | Observado | Evidência |
|---|---|---|---|---|
| M-01 | Admin lista usuários (`GET /api/users`) | 200 | 200 (6 usuários) | suite API T-101 |
| M-02 | Usuário comum lista usuários | 401/403 | 401 | T-102 |
| M-03 | Anônimo em `/api/users` e `/api/privileges` | 401/403 | 401 | T-103, T-303 |
| M-04 | Usuário comum em create/delete/reset/role/toggle | 401/403 | 401 (todos) | T-201..205 |
| M-05 | Usuário comum em CRUD de privilégios | 401/403 | 403 (RPC `can_manage_privileges` = false) | T-301, T-302 |
| M-06 | Anônimo grava tema de terceiros (`PATCH /api/users/theme`) | 401/403 | **ANTES: 200 + gravação provada** → DEPOIS: 401 | T-401/T-402 |
| M-07 | Usuário grava o próprio tema | 200 | 200 | T-403 |
| M-08 | Usuário grava tema de OUTRO usuário (cross-user) | 403 | 403 | T-404 |
| M-09 | Anônimo usa o proxy Elephan (gasta chave do servidor) | 401 | **ANTES: 200 (upstream 200)** → DEPOIS: 401 | T-501 |
| M-10 | Usuário autenticado usa o proxy | 200 | 200 | T-504 |
| M-11 | Path traversal no proxy | 400 | 400 | T-502 |
| M-12 | Usuário comum altera chave Elephan | 403 | 403 | T-503 |
| M-13 | Líder vê lista de usuários escopada | self + descendentes | 3 (self + 2 subordinados reais) via RPC server-side | E2E + RPC |
| M-14 | Privilégio readonly: sem "Nova Oportunidade"/editar | sem ações | sem ações | E2E |
| M-15 | Página oculta por URL direta | redirect p/ home | redirect `/overview` (analytics, alertas, planos, recupera, elephan) | E2E |
| M-16 | Revogação de privilégio volta ao estado anterior | state restaurado | `role=lider` restaurado, privilégio QA excluído | seção 16 |

## 7. Defeitos identificados

### BUG-001 — Admin (master) rejeitado pelas APIs administrativas — **Alta** — CORRIGIDO
- **Camada:** `src/lib/api-auth.ts` (WIP não commitado) × `src/lib/use-privileges.ts`.
- **Reprodução:** `GET /api/users` com Bearer do admin → **401** "Apenas administradores listam todos os usuários" (T-101 antes da correção).
- **Esperado:** 200.
- **Causa-raiz confirmada:** o client identifica o master pelo **e-mail** (`ADMIN_EMAIL`), mas o server (`getCaller`) exigia `user_metadata.role === "admin"` — e a conta master real **não tem `role` no metadata** (verificado: `role_metadata = undefined`). Qualquer consumidor das rotas admin-only receberia 401/403 para o dono do sistema. Antes do WIP, `GET /api/users` não tinha autenticação alguma (diff do Git).
- **Correção:** `resolveAdmin()` em `api-auth.ts` passa a aceitar **role `admin` OU e-mail = `ADMIN_EMAIL`** (mesma semântica do client). Arquivo: `src/lib/api-auth.ts`.
- **Regressão:** T-101/T-304 passaram; nenhuma outra verificação regrediu (19/19).

### BUG-002 — Escrita não autenticada em `user_metadata` de terceiros — **Alta** — CORRIGIDO
- **Camada:** `src/app/api/users/theme/route.ts`.
- **Reprodução:** `PATCH /api/users/theme {userId, themePalette}` **sem token** → **200** e `theme_palette` gravado (prova por leitura posterior — T-401/T-402 antes da correção). Rota usa service role sem verificar chamador.
- **Esperado:** 401 sem sessão; 403 em escrita cross-user.
- **Causa-raiz confirmada:** rota sem nenhuma autorização, com service role direto e `userId` aceito do body.
- **Correção:** `getCallerWithSession` obrigatório; escrita restrita ao **próprio** usuário (`userId !== caller.userId → 403`). Rota está órfã (nenhum consumidor na UI — o tema real usa `auth.updateUser`), risco de regressão baixo.
- **Regressão:** T-401 (401), T-403 (200 self), T-404 (403 cross-user) — todas aprovadas.

### BUG-003 — Proxy Elephan acessível sem autenticação — **Alta** — CORRIGIDO
- **Camada:** `src/app/api/elephan/proxy/route.ts`.
- **Reprodução:** `POST /api/elephan/proxy {path:"/health"}` sem token → **200** com resposta upstream usando a chave do servidor (T-501 antes da correção).
- **Esperado:** 401. **Impacto:** em produção (Vercel, rota pública), qualquer anônimo consultaria transcrições/dados do time e consumiria a quota da chave.
- **Causa-raiz confirmada:** o middleware isenta `/api/*` e a rota não verificava sessão.
- **Correção:** sessão obrigatória via `getCallerWithSession` (Bearer **ou cookie de sessão** — os 4 consumidores da UI fazem fetch same-origin sem Bearer; exigir só Bearer quebraria todo o dashboard).
- **Regressão:** T-501 (401), T-504 (200 com token), E2E do dashboard Elephan como admin carregou integralmente (122 reuniões, alertas, gráficos).

### Achados sem correção (registrados)
- **Dívida/observação (Baixa):** `/api/elephan/config` autoriza por e-mail hardcoded com sessão de cookies, divergindo do padrão `getCaller` — funciona para o master real; inconsistência documentada (F-014).
- **Dívida (Média):** `/api/privileges` GET responde `{"privileges": [...]}`; comentários de leitura em `privileges-manager` coerentes — sem defeito funcional; apenas nota de contrato.
- **Baseline de lint:** 5 erros e 25 warnings, **todos pré-existentes** no WIP do usuário (3× `react-hooks/preserve-manual-memoization`, 2× `no-explicit-any` em `overview/page.tsx` + warnings de `window.location.href`). Preservados intactos (trabalho em andamento do dono).
- **Dívida conhecida (do PROJETO.md, confirmada em leitura):** proteção server-side de páginas limitada à sessão; escopo `own/hierarchy` de dados aplicado client-side em `/overview` (RLS cobre oportunidades).

## 8. Correções realizadas (arquivos alterados)

| Arquivo | Mudança |
|---|---|
| `src/lib/api-auth.ts` | BUG-001: `resolveAdmin` (role OU e-mail master); refatoração `resolveCaller`; novo `getCallerWithSession` (Bearer ou cookie) |
| `src/app/api/users/theme/route.ts` | BUG-002: autenticação obrigatória + self-service enforced |
| `src/app/api/elephan/proxy/route.ts` | BUG-003: sessão obrigatória (Bearer ou cookie) |
| `package.json` | scripts `test` e `test:api` + devDependency `vitest@^2` |
| `tests/unit/privileges.test.ts` | **novo** — 20 testes unitários do RBAC |
| `tests/api/run-api-tests.mjs` | **novo** — 19 verificações de API/segurança com login real |

## 9. Resultados executados (consolidado)

| Suíte | Comando | Antes das correções | Depois das correções |
|---|---|---|---|
| Unitários (Vitest) | `npm test` | — (não existia) | **20/20 PASS** |
| API/segurança | `npm run test:api` | — (não existia) | **19/19 PASS** (antes: 15/19, 3 defeitos) |
| TypeScript | `npx tsc --noEmit` | exit 0 | exit 0 |
| ESLint | `npm run lint` | 5 erros / 25 warnings (pré-existentes) | idem (inalterado — WIP do dono) |
| Build | `npm run build` | ✓ 27 rotas | ✓ 27 rotas |
| E2E navegador | manual assistido | — | matriz seção 6 |

Credibilidade dos resultados: a primeira execução da suíte de API continha um **bug no
próprio harness** (argumento `pass` recebia string → PASS vazio). O harness foi corrigido
para booleans e **toda a suíte foi re-executada do zero**; os números acima são da
execução corrigida.

## 10. Riscos residuais e investigações pendentes

1. **RLS por privilégio nas tabelas de dados** — escopo `own/hierarchy/all` do Overview é
   client-side; recomenda-se policy server-side (já mapeado no PROJETO.md).
2. **Middleware sem checagem de papel** — páginas admin dependem do guard client; um
   usuário autenticado sem privilégio chega a carregar o shell da página.
3. ~~`/api/elephan/config` com e-mail hardcoded~~ → **resolvido na rodada 2** (seção 17.1).
4. ~~`role` no metadata da conta master~~ → **resolvido na rodada 2** (seção 17.2).
5. ~~5 erros de lint do `overview/page.tsx`~~ → **resolvidos na rodada 2** (seção 17.4).

## 11. Limitações da auditoria

- Testes E2E restritos aos fluxos principais (login, sidebar, guards, escopos, dashboard
  Elephan, abas de /usuarios); não foram exaustivos em todos os modais/abas.
- A camada de dados da Elephan e o RLS do banco foram validados por comportamento
  observado (API/E2E), não por inspeção direta do Postgres.
- Um dev server prévio do usuário (porta 3000) foi reaproveitado; assume-se que o
  Turbopack serviu o código atual do disco (confirmado pelo comportamento das rotas novas).

## 12. Reversão do estado (pós-teste)

- `teste@rankmyapp.com.br`: `role` restaurada para **`lider`** (valor original).
- Privilégio temporário **`qa-auditoria`** excluído; restaram somente `admin`, `usuario`, `lider` (estado original).
- Tema do usuário de teste restaurado ao original (T-401/T-403 revertidas in-test).
- Nenhum usuário criado/excluído; nenhuma oportunidade ou dado de negócio alterado.

## 13. Próximas ações priorizadas

1. Revisar/commitar o WIP de hierarquia + correções da auditoria (as 3 correções da rodada 1
   e os ajustes da rodada 2 são compatíveis e complementares) — **dependência:** validação do dono.
2. ~~Definir `user_metadata.role="admin"` para o master~~ → **feito (rodada 2, seção 17.2)**.
3. ~~Padronizar `/api/elephan/config` em `getCaller`~~ → **feito (rodada 2, seção 17.1)**.
4. Server-side enforcement de escopo/RLS por privilégio (média estrutura, alto valor).
5. ~~Tratar os 5 erros de lint do `overview/page.tsx` no WIP~~ → **feito (rodada 2, seção 17.4)**.

## 14. Critérios de aceite aplicados

Funcionalidade = **VALIDADA** apenas com execução real + evidência reproduzível (saída de
suíte, screenshot/estado do DOM, código HTTP). Nenhum resultado foi inferido por leitura
de código; os estados F-xxx da seção 5 refletem somente o que foi exercitado.

## 15. Tabela de rastreabilidade (resumo)

| ID | Funcionalidade | Camada | Perfil | Teste | Resultado | Defeito | Evidência |
|---|---|---|---|---|---|---|---|
| F-001 | Login | UI/Auth | todos | E2E | PASS | — | login teste@ e admin@ via navegador |
| F-005/F-006 | Sidebar/guards | UI | lider, custom, admin, anônimo | E2E | PASS | — | M-13..M-15 |
| F-007 | Listagem admin users | API | admin, user, anônimo | T-101..103 | PASS (pós-fix) | BUG-001 | HTTP 200/401/401 |
| F-008 | CRUD users | API | user | T-201..205 | PASS | — | 401 em todas |
| F-009 | Tema | API | anônimo, self, cross | T-401..404 | PASS (pós-fix) | BUG-002 | 401/200/403 |
| F-010/F-011 | Privilégios | API+UI | admin, user, anônimo | T-301..304 + E2E | PASS (pós-fix) | BUG-001 | 403/200 + abas |
| F-012 | Hierarquia | RPC | líder | E2E + RPC | PASS | — | 3 emails = self+2 |
| F-013 | Proxy Elephan | API | anônimo, user | T-501/502/504 | PASS (pós-fix) | BUG-003 | 401/400/200 |
| F-014 | Config Elephan | API | user | T-503 | PASS | — | 403 |
| F-015 | Dashboard Elephan | UI | admin | E2E | PASS (pós-fix) | — | 122 reuniões carregadas |

## 16. Instruções para retomada

Se esta auditoria precisar ser retomada: rodar `npm run dev` e `npm run test:api` (suíte
valida o estado atual das 3 correções), `npm test` para o RBAC. O estado do banco foi
revertido (seção 12) — recriar o privilégio QA apenas se novo teste de matriz for
necessário. Arquivos da auditoria: `tests/` (novos), `src/lib/api-auth.ts`,
`src/app/api/users/theme/route.ts`, `src/app/api/elephan/proxy/route.ts` (correções).

## 17. Rodada 2 — ações pendentes executadas (28/10/2026)
### 17.1 `/api/elephan/config` padronizado no mecanismo central de auth (F-014 → VALIDADA)
- **Antes:** autorização por e-mail hardcoded (`ADMIN_EMAIL`) com sessão de cookies — divergia do padrão das demais rotas.
- **Mudança:** `getCallerWithSession` (Bearer **ou** cookie) + `caller.isAdmin` — mesma semântica de `resolveAdmin` (role `admin` no metadata OU e-mail master). Comportamento funcional do master inalterado.
- **Novas verificações:** T-505 (anônimo → 401) e T-506 (admin via Bearer com chave inválida → 400, prova de autorização sem mutar `app_config`). Suíte: **21/21 PASS**.

### 17.2 Higiene de metadata da conta master (risco residual 4 → resolvido)
- `user_metadata.role = "admin"` definido para `sandro.lopes@rankmyapp.com.br` via Admin API (todos os demais campos preservados — verificado campo a campo). Elimina a divergência client×server na fonte dos dados; a correção de código (BUG-001) permanece como defesa.

### 17.3 Middleware — comentário desatualizado corrigido
- `src/lib/supabase/middleware.ts`: o comentário afirmava que `/api/*` "usa service_role_key internamente" (falso desde o WIP) — atualizado para refletir `src/lib/api-auth.ts`.

### 17.4 Lint do `overview/page.tsx` (WIP do dono): 5 erros → **0 erros** (25 warnings pré-existentes mantidos)
- 3× `react-hooks/preserve-manual-memoization` (`clientesPorCalor`, `filteredOpportunities`, `sortedOpportunities`, `uniqueResponsaveis`): memoização manual convertida para computação direta (IIFE), padrão já dominante no próprio arquivo — o React Compiler memoiza automaticamente e a memoização manual "não era preservável".
- 2× `no-explicit-any`: casts tipados (`{ value?; count?; clients? }`) nos tooltips dos gráficos, com guardas de narrowing equivalentes.
- **E2E pós-refatoração:** `/overview` como `teste@` (líder) com hard reload → tabela com 10 linhas e KPIs idênticos ao baseline pré-refatoração (4 Negociação R$ 88.764,88 · 1 Envio R$ 11.565,00 · 1 Em Assinatura R$ 1.116,00 · 1 FUP R$ 3.500,00). Durante o smoke test inicial, um estado transitório de carregamento (fetch + `hierarchySet` assíncronos) foi confundido com perda de dados — **investigado até a causa** (rede: `select=*` HTTP 200 com 21 linhas; RPC de hierarquia 200; dado server-side com 7 ativas) e descartado com evidência.

### 17.5 Estado consolidado pós-rodada 2

| Suíte | Resultado |
|---|---|
| `npm run lint` | **0 erros**, 25 warnings (pré-existentes) |
| `npx tsc --noEmit` | 0 erros |
| `npm test` (unitários) | 20/20 PASS |
| `npm run test:api` | **21/21 PASS** |
| `npm run build` | ✓ 27 rotas |
| E2E `/overview` (líder) | KPIs e tabela idênticos ao baseline |

### 17.6 Arquivos alterados na rodada 2
- `src/app/api/elephan/config/route.ts` — padronização de auth (17.1)
- `src/lib/supabase/middleware.ts` — comentário (17.3)
- `src/app/overview/page.tsx` — 4 memoizações → computação direta + casts tipados (17.4)
- `tests/api/run-api-tests.mjs` — T-505/T-506
- Banco (fora do Git): `user_metadata.role` do master → `"admin"` (17.2)
- **Dados de negócio: nenhum alterado** (todas as consultas de investigação foram somente leitura).

## 18. Rodada 3 — modo de atuação genérico e escopo de `/usuarios` (28/10/2026)

**Pedido do dono:** (1) a flag Admin/Líder não deve ter nome fixo — o admin deve poder assumir
qualquer privilégio e valer exatamente o que ele libera; (2) no modo de atuação, `/usuarios`
ainda listava todos os usuários.

### 18.1 Causa-raiz confirmada do ponto (2)
As RPCs SECURITY DEFINER (`list_users_scoped` etc.) resolvem o escopo pelo **chamador real** —
e o master é sempre `admin` para o banco (branch `v_rank = 'admin'` retorna todos). O modo de
atuação vivia só no client (`localStorage`), invisível ao servidor. Não é bug das RPCs:
verificado com probes que `list_hierarchy_ids`/`list_hierarchy_emails`/`list_users_scoped`
estão corretas para chamadores não-admin. (Durante a investigação, uma aparente "poluição de
árvore" foi descartada com evidência: a tabela `user_hierarchy` foi editada às 20:41 pelo
dono — `created_at` dos vínculos — entre duas observações; as funções sempre estiveram certas.)

### 18.2 Correções (camada client, mínimo necessário)
| Arquivo | Mudança |
|---|---|
| `src/lib/use-privileges.ts` | Modo de atuação **genérico**: `mode` passa a ser o **slug** do privilégio assumido (legacy "lider" segue válido com fallback para rank `lider`); novo `actingChoices` (privilégios de rank ≠ admin, com nome real) para o seletor; resolução: slug escolhido → fallback rank `lider` → `usuario` |
| `src/components/sidebar.tsx` | Botão fixo "Líder" → **seletor de privilégio** (nomes vindos do banco); rótulo dinâmico;Admin continua botão dedicado |
| `src/app/usuarios/page.tsx` | `fetchUsers` aplica o **escopo do privilégio assumido** sobre o resultado da RPC: `all` → sem filtro; `hierarchy` → filtra por `priv.hierarchyEmails` (self + descendentes); `own` → somente self |
| `PROJETO.md` | Seção 1 atualizada (convenção do projeto: manter o contexto global) |

### 18.3 Validação E2E (master, navegador)
| Cenário | Esperado | Observado |
|---|---|---|
| Admin mode: `/usuarios` | 6 usuários, nav completa | 6 usuários, nav completa ✓ |
| Assumir "Líder" (nome real do privilégio) | sidebar adapta; `/usuarios` só self + equipe | nav: Overview, Elephan.AI, Usuários; lista = **3** (sandro + aline + amanda = árvore real do master) ✓ |
| Assumir "Usuário" | `/usuarios` oculta → redirect; só Overview; escopo own | redirect para `/overview`; nav só Overview; KPIs R$ 0,00 (master sem oportunidades próprias) ✓ |
| Voltar para Admin | tudo restaurado; modo persistido | 6 usuários; `priv_admin_mode = admin` ✓ |

**Ressalva documentada (dívida aceita):** o filtro de atuação é client-side — o payload da RPC
ainda traz todos os usuários ao master em modo assumido (o master é o dono do sistema e pode
vê-los em modo Admin a qualquer momento; não há elevação de privilégio). Enforcement
server-side do modo de atuação exigiria parâmetro novo nas RPCs (migração SQL + redeploy das
funções) — registrado como evolução futura, não aplicado sem autorização.

### 18.4 Nota de correção ao relatório anterior
A validação de F-012/M-13 (rodada 1) concluiu "líder vê 3 usuários — escopo correto" com base
nos dados daquela hora (vínculos `teste → aline/amanda`, alterados às 20:41 pelo dono para
`master → aline/amanda`). O **mecanismo** de escopo server-side continua VALIDADO (probes
atuais: `list_hierarchy_ids(teste)` = vazio; `list_users_scoped(teste)` = só ele). O valor
exibido na matriz M-13 dependia dos dados do momento.

### 18.5 Regressão da rodada 3
`test:api` 21/21 · unitários 20/20 · tsc 0 · lint **0 erros** · build ✓ 27 rotas · E2E ciclo
completo Admin → Líder → Usuário → Admin.

### 18.6 Refinamento do seletor (pedidos do dono, mesma rodada)
- **Novo componente `src/components/acting-mode-switcher.tsx`**: dropdown refinado (drop-up com sombra/borda `--card-*`, cabeçalhos de seção, ícone por rank, subtítulo do rank, item ativo com gradiente + check, chevron animado, fecha com clique-fora/Esc) substituindo o par botão+`<select>` nativo.
- **Bug da duplicação corrigido**: no select antigo, o placeholder mostrava o nome do privilégio assumido ("Líder") E a lista de opções também continha "Líder" → aparecia 2x. No dropdown novo há uma única lista (Admin + privilégios), sem duplicação possível.
- **Truncamento corrigido**: badge de rank lateral truncava "Usuário" → rank movido para subtítulo da linha.
- **Validação**: E2E no navegador (painel lista exatamente `Admin · Líder · Usuário`, sem duplicatas; Esc fecha sem efeito; clique restaura/assume modo; persistência ok) + screenshot; tsc 0 · lint 0 · unitários 20/20 · API 21/21 · build ✓.

### 18.7 Nova página `/gerencial` — visível somente para Admin (pedido do dono)
- **`src/app/gerencial/page.tsx`** (novo): placeholder "Em breve" no padrão das demais páginas, com guard por privilégio (redirect para `homeHref` em acesso direto por URL).
- **`src/lib/privileges.ts`**: entrada manual `gerencial` no topo do `PAGES_MANUAL` (fica **acima de Overview** na navegação e no formulário de privilégios). "Somente Admin" é garantido estruturalmente: página nasce `hidden` (não está em `USER_DEFAULT_ACCESS`, e `normalizeConfig` preenche páginas ausentes de configs antigas como hidden) — só o `defaultAdminConfig` (derivado do registry) a libera.
- **`src/components/sidebar.tsx`**: novo `adminMainItems` (Gerencial + Overview) usado apenas no modo admin — não-admins nunca veem o item, nem no fallback de carregamento. Ícone: PieChart.
- **Testes**: 2 novos unitários (ordem acima de Overview; hidden p/ Usuário/blank/config antiga + full p/ Admin) — **22/22**. E2E: admin vê Gerencial em 1º na nav e a página carrega; `teste@` (líder) não vê o item e `/gerencial` por URL redireciona para `/overview`. Regressão: API 21/21 · build ✓ (28 rotas, `/gerencial` presente) · lint 0 · tsc 0.

## 19. Rodada 4 — Recupera: auditoria completa, dash analítico e testes por camada (28/10/2026)

**Pedido do dono:** revisar todas as funcionalidades da página Recupera, garantir formulários funcionais, padronizar o visual com a aba Overview (dash + tabelas estilizadas), criar ≥10 registros fictícios, testar camada por camada e corrigir problemas.

### 19.1 Defeito estrutural encontrado (BUG-005 — Bloqueio total da página) — CORRIGIDO
- **Comportamento observado:** `/recupera` listava sempre vazio, formulário sem responsáveis e CRUD falhando em silêncio.
- **Causa-raiz confirmada:** as tabelas `recoveries` **e** `users` **não existiam** no projeto Supabase (404 PGRST205 — exatamente o backlog do PROJETO.md). A página engolia os erros (`if (data)` sem `error`).
- **Correção:** `supabase-recupera-setup.sql` (novo, rodado pelo dono no SQL Editor): cria `recoveries` (schema completo + `owner_email` p/ escopo) e `users` (p/ o select de Responsável), RLS authenticated, índices e trigger `updated_at`; popula `users` a partir de `auth.users`. Na página, erros de carregamento/CRUD agora **exibem banner de erro** (fase de observabilidade).

### 19.2 Dash analítico e padronização visual (padrão Overview)
- **5 cards de KPI** no estilo Overview (título + tooltip, valor grande, subtítulo, chip de ícone): Em Andamento, Recuperados, Perdidos, Receita em Risco (c/ em aberto), Receita Recuperada (c/ taxa).
- **Gráfico "Receita por Mês"**: barras Em risco (accent) vs Recuperada (verde), por mês do pedido de churn, ordem calendário.
- **Gráfico "Propostas & Tipos"**: donut de status das propostas + painéis Preditivo/Churn (qtd · valor) e "Sem proposta enviada".
- **Filtros**: busca + Status + Tipo + Responsável + "Limpar filtros" + contador "x de y registros".
- **Tabela estilizada**: cabeçalhos padronizados, badges, hover, empty states distintos (com filtro × sem dados).
- **Escopo de privilégio aplicado** (`src/lib/recupera.ts::scopeRecoveries`): all/hierarchy (via hierarchyEmails)/own por `owner_email` — mesma semântica do Overview. Insert grava `owner_email` do criador.

### 19.3 Testes por camada (resultados)
| Camada | Suíte | Resultado |
|---|---|---|
| Unitária (helpers puros: stats, filtros, escopo, formatadores) | `tests/unit/recupera.test.ts` (18) | **18/18** (total 40/40) |
| Dados/RLS (12 registros fictícios: inserts, CHECKs, filtros REST, ordenação, 2 perfis, update, exclusão + limpeza total) | `tests/api/run-recupera-tests.mjs` | **19/19** |
| E2E navegador (admin): dashboard renderiza (6 linhas + 2 gráficos), formulário cria (select de responsáveis populado), filtros (busca/status/contador/limpar), edição pré-preenchida salva (KPI 2→3), exclusão com confirm nativo | manual assistido | **PASS** |
| Build/lint/tsc | `npm run build` etc. | ✓ 28 rotas · 0 erros · 0 |

- **Correções no próprio harness durante a rodada** (registradas por transparência): R-021 esperava `owner_email` em insert REST que não o enviava (a página envia); R-052 aceitava só 401/403, mas RLS correta para anônimo retorna 200 vazio (nenhum dado vazou).
- **Estado do banco:** todos os registros de teste foram removidos (0 restantes). Estrutura (`recoveries`/`users`) permanece — era o objetivo.

### 19.4 Arquivos da rodada
`supabase-recupera-setup.sql` (novo) · `src/lib/recupera.ts` (novo) · `src/app/recupera/page.tsx` (redesenhada) · `tests/unit/recupera.test.ts` (novo) · `tests/api/run-recupera-tests.mjs` (novo)

### 19.5 Padronização visual + dash interativo (feedback do dono) — CORRIGIDO
- **Largura estourando o container (corrigido):** o `main` do `DashboardLayout` era flex item sem `min-width:0` — o min-content da tabela expandia a página inteira. Fix em `dashboard-layout.tsx` (`min-w-0`, beneficia todas as páginas); tabela passa a rolar internamente. Verificado: `document.scrollWidth == viewport`.
- **Gráficos sem dados visíveis (corrigido):** faltavam Legend e rótulos. Adicionados Legend nos dois gráficos e `LabelList` nas barras (`isAnimationActive={false}` na Bar — lição do PROJETO.md; em recharts 3.10 o LabelList não tem a prop e renderiza via zIndex layer fora de `.recharts-bar`).
- **Tabela fora do padrão (corrigida):** container com gradiente (`linear-gradient(135deg, card-bg → background)`) como Overview, cabeçalhos ordenáveis (setas, `handleSort`), **Personalizar Colunas** com checkboxes (3 colunas nascem ocultas), empty state com ícone Inbox + 2 linhas, barra de ações alinhada à direita com contador "N registros" e botão Nova Recuperação no padrão Overview.
- **Dados por responsável (novo):** agregado `porResponsavel` em `src/lib/recupera.ts` (count, risco, recuperada, ordenado) + card "Recupera por Responsável" com cards clicáveis que **filtram a tabela** (toggle, estado ativo em gradiente). +2 testes unitários.
- **Dash clicável/interativo (padrão Overview):** drill-down analítico via modal (`drill`): KPIs abrem modal com os registros por trás do número; barras do gráfico mensal abrem o mês (onClick na Bar com payload, padrão elephan-dashboard); fatias do donut abrem o status de proposta; painéis Preditivo/Churn e "Sem proposta enviada" também abrem. Modal com contagem, soma em risco e cards por registro.
- **Validação E2E:** overflow resolvido (`scrollWidth == viewport`, main 1066px), labels visíveis ("20 mil", "24 mil"...), legendas 2/2, KPI "Perdidos" → modal 1 item, barra Janeiro → modal 2 itens, fatia "Sem retorno" → modal 1 item, filtro por responsável filtra a tabela (3 registros de Aline). Regressão: unitários 42/42 · dados Recupera 19/19 · API auth 21/21 · build ✓ · lint 0 · tsc 0. Dados de teste removidos (0 restantes).

### 19.6 Rosca com valores (feedback do dono) — CORRIGIDO
- A legenda do Recharts mostrava só os nomes dos status, sem valores.
- **Legenda customizada com valores e percentuais** (padrão "Distribuição por Status" da Overview): cor por status + nome + `N (xx,xx%)`, **clicável** (abre o drill-down do status), substituindo a `<Legend>` do Recharts.
- **Total no centro da rosca** ("6 propostas").
- Validado E2E: legenda renderiza "Em análise 2 (33,3%)", "Sem retorno 1 (16,7%)", etc.; item da legenda abre o drill-down; total central visível; sem overflow. Regressão: unitários 42/42 · build ✓ · dados de teste removidos.

## 20. Rodada 5 — login quebrado de nathalia.simao@ (29-30/10/2026) — RESOLVIDO

**Relato:** Nathalia não logava — por senha "senha incorreta", pelo Google "nada acontece".

### 20.1 Diagnóstico (por exclusão, com evidência de execução)
| Passo | Resultado |
|---|---|
| Conta existe no auth? | Sim (criada 29/10 15:09 pela UI), confirmada, não banida, `last_sign_in_at: null` (nunca logou) |
| Login por senha | **HTTP 500** `unexpected_failure: Database error querying schema` — NÃO era "senha incorreta" |
| Senha errada proposital | 500 também → a falha era na CONSULTA do registro, antes de checar a senha |
| Controle (teste@ c/ senha errada) | 400 normal |
| Admin API GET/DELETE por id dela | **500** — qualquer query do GoTrue na linha falhava |
| Google "nada acontece" | mesmo erro de auth no callback (o app redireciona de volta sem mensagem) |
| Contas antigas (6 usuários) | todas saudáveis — o problema era só dela (criada pelo fluxo novo) |

### 20.2 Causa-raiz (BUG-006 — Alta)
O cadastro pela UI usava o RPC `create_user_scoped`, que insere **direto em auth.users/auth.identities** com valores divergentes do que o GoTrue grava/exige: `provider_id` = e-mail (GoTrue: UUID do usuário), `instance_id` = UUID zero (hosted: herda o da instância). Linhas assim ficam **invisíveis/inválidas para o GoTrue** → login 500. Contas criadas antes da hierarquia (via `auth.admin.createUser`) eram saudáveis — por isso só a Nathalia (a primeira criada pelo fluxo novo) quebrava.

### 20.3 Correções
1. **`supabase-fix-auth-insert.sql`**: alinhamento parcial (provider_id/sub = UUID, email_verified) → 500 sumiu.
2. **`supabase-fix-auth-insert-v2.sql`**: instance_id herdado da instância → GoTrue passou a enxergar as linhas (404/invalid → encontrava, mas hash/estrutura ainda divergentes).
3. **Decisão arquitetural (v3, definitiva)**: **fim do INSERT direto em auth.users**. `src/app/api/users/create` cria via `auth.admin.createUser` (GoTrue) para **admin OU quem tem `cadastrar_usuarios`**; vínculo líder→novo via novo RPC `link_new_user_hierarchy` (`supabase-fix-auth-insert-v3.sql`, mesma regra do create_user_scoped). UI (`usuarios/page.tsx`) migrateu para a rota com Bearer.
4. **Conta da Nathalia recriada** pela API oficial do GoTrue com `senha123` (linha antiga removida no SQL).

### 20.4 Validação
- Login REST da Nathalia: **200 com token** ✓ · senha errada → 400 normal ✓ · admin GET 200 ✓
- **Login dela pelo app real (navegador): entrou em /overview** ✓ (o cenário exato do relato)
- Cadastro de teste pelo **formulário** (novo fluxo) → login 200 ✓ → usuário de teste excluído (limpeza) ✓
- Regressão: unitários 42/42 · API auth 21/21 · build ✓ · lint 0 · tsc 0 · `supabase-fix-auth-insert*.sql` mantidos local (gitignore de *.sql)

### 20.5 Garantia de não-regressão (canário de autenticação)
A suíte `tests/api/run-api-tests.mjs` ganhou o bloco **T-601..T-605**: cria um usuário pela rota oficial, **loga com as credenciais recém-criadas** (o teste exato que faltava e teria capturado o BUG-006 antes do deploy), verifica que senha errada dá 400 (nunca 500), confere canário de login de usuário pré-existente e remove o usuário de teste. Suíte completa: **26/26 PASS**.

## 21. Rodada 6 — destino pós-login pela primeira página do privilégio (30/10/2026) — RESOLVIDO

**Relato:** Nathalia (privilégio `estrategista`, só Elephan aberta) logava e caía em /overview com a tela "Sem acesso à Overview" em todo login.

### 21.1 Causa
O login (senha e callback do Google) redirecionava **sempre** para `/overview`, hardcoded; e o guard do Overview renderizava uma tela de beco sem saída em vez de redirecionar (diferente das demais páginas, que levam à home do privilégio).

### 21.2 Correções
- **`src/lib/home-redirect.ts`** (novo): `firstOpenPage` (primeira página full/readonly na ordem do registry, fallback /overview) e `resolveHomeAfterLogin` (mesma resolução do use-privileges sem React: master → /overview; demais → privilégio do metadata, 'user' → 'usuario').
- **`login/page.tsx`**: destino pós-senha resolvido pelo helper.
- **`auth/callback/route.ts`**: login Google sem `?next` explícito também respeita o privilégio.
- **`overview/page.tsx`**: guard redireciona para `homeHref` quando existe alternativa; o aviso "Nenhuma página liberada" só aparece quando **nenhuma** página está liberada (evita loop).

### 21.3 Validação
- Unitários: +9 (`home-redirect.test.ts`) — caso Nathalia (estrategista → /elephan), ordem do registry, fallback fail-closed — **51/51**.
- **E2E navegador: login da Nathalia cai direto em `/elephan`**, zero mensagem de bloqueio, sidebar só com o privilégio dela. Sessão encerrada ao final.
- Regressão: build ✓ 28 rotas · API 26/26 · lint 0 · tsc 0.
