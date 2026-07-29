# J-NAV-MENU-PLATFORM-JWT — correção do menu Platform sob JWT

> **Data:** 2026-07-28 · **Branch:** `fix/nav-menu-platform-jwt` ·
> **Decisão:** `D-NAV-MENU-PLATFORM-JWT` · **Resultado:** APROVADO 6/6
> (junta mínima 4/4 + especialistas dos ciclos 2/2)

## Mandato e escopo

Corrigir `GET /api/v1/navigation/menu?scope=platform` para atores JWT do plano
de controle, mantendo a convergência com headers legados, o isolamento
multi-tenant e o RBAC persistente para tenants UUID. O arquivo protegido
`tests/navigation-menu-routes.test.ts`, `src/app.ts`, Prisma, lockfiles,
portais, frontend e stashes ficaram fora do escopo.

Arquivos de produto alterados somente nos módulos autorizados:

- `src/modules/auth/routes/me.routes.ts`
- `src/modules/auth/routes/session-admin.routes.ts`
- `src/modules/core-saas/middleware/persistent-rbac-context.middleware.ts`
- `src/modules/navigation/navigation.routes.ts`
- `src/modules/navigation/navigation.service.ts`

## Diagnóstico comprovado

Com Prisma real, o baseline do teste protegido era **5/7**: o menu Platform
respondia `500 AUTHORIZATION_CONTEXT_ERROR`. O erro direto do repositório era
`Invalid input syntax for type uuid: "platform"`.

`platform` é um identificador assinado do plano de controle, não um tenant
persistido UUID. Os middlewares globais dos routers `/me` e `/sessions`,
montados no prefixo amplo `/api/v1`, interceptavam `/navigation/menu` antes do
router proprietário e encaminhavam esse pseudo-tenant a
`UserRoleRepository.listByUserForTenant`
(`src/modules/core-saas/repositories/user-role.repository.ts:33-35`). O
PostgreSQL recusava o literal não UUID e o catch do middleware convertia a
falha no 500 genérico.
O router de Navegação também precisava de uma fronteira explícita para o
plano de controle. O acesso `[0]` do segundo teste era apenas consequência do
500 anterior, pois a resposta de erro não possuía `data`. A inspeção confirmou
que não existe acesso `[0]` no middleware nem na cadeia de resolução RBAC; a
hipótese inicial do comando foi refutada, não ocultada.

## Solução aprovada

- Os middlewares de contexto de `/me` e `/sessions` foram limitados aos seus
  próprios prefixos e deixaram de capturar routers irmãos.
- O middleware RBAC persistente ganhou um opt-in
  `allowPlatformControlPlaneContext`, desativado e fail-closed por padrão.
  Somente Navegação o habilita.
- Navegação normaliza `platform` como ausência de tenant ativo, usa o contexto
  comum de autenticação e não permite que itens `tenantOnly` sejam exibidos
  sem tenant real.
- Tenants UUID continuam obrigatoriamente resolvidos pelo RBAC persistente; os
  grants armazenados substituem os claims do JWT, sem fallback permissivo.
- Registry, permissões e provisionamento canônicos continuam sendo as fontes
  do menu; nenhum item ou grant foi hardcoded.

## Ciclos adversariais

### Ciclo 1 — REPROVADO

O primeiro diff pulava o RBAC persistente globalmente para o pseudo-tenant
`platform`. Coordenador, validador e crítico vetaram a ampliação porque ela
alcançaria todos os consumidores do middleware. O KPI também precisava
registrar a entrega como correção ainda não publicada.

**Correção:** bypass convertido em opt-in exclusivo de Navegação; middlewares
dos routers amplos limitados aos próprios paths; tenant Platform normalizado;
teste de tenant UUID fortalecido para provar que grants persistidos substituem
claims.

### Ciclo 2 — REPROVADO

O passe residual mostrou que `operator` e `viewer` com pseudo-tenant Platform
e scope ausente ainda podiam receber itens tenant. A regra anterior barrava
`tenantOnly` sem tenant apenas para ator de plataforma.

**Correção:** qualquer item `tenantOnly` passou a exigir `context.tenantId`,
independentemente do papel. A matriz adversarial cobre `platform`, `tenant`,
scope ausente e inválido. A sugestão LOW do crítico também foi incorporada:
o cenário Platform sem scope agora exige explicitamente `platform.tenants`,
evitando falso positivo de array vazio.

## Votos definitivos — quatro passes obrigatórios

| Passe | Poder | Voto | Evidência principal |
|---|---|---|---|
| coordenador-de-acessos | VETO | **APROVADO** | Opt-in restrito a Navegação; default fail-closed; tenant UUID persistente; matriz direta Platform sem vazamento. |
| validador-mestre | VETO | **APROVADO** | RA1–RA9 atendidos; escopo permitido; isolamento e KPI coerentes; nenhum achado VETO/ALTA. |
| critico-adversarial | adversarial | **APROVADO** | Nenhum achado crítico, alto ou médio; falha do resolver permanece 500 sem fallback; melhoria LOW do array vazio incorporada. |
| inspetor-de-rotas | rotas/provisionamento | **APROVADO** | `/me*` e `/sessions*` não capturam irmãos; todos os cenários JWT/legacy, Platform/tenant e provisionamento passaram. |

## Especialistas criados pela fábrica (§C7.4)

| Especialista | Voto | Evidência independente |
|---|---|---|
| resolução RBAC persistente e raio compartilhado | **APROVADO** | Especialista inspecionou 55 invocações pré-rebase (54 sem flag); após Ω5P PR-18a, a prova final contou 56 invocações, somente Navigation com flag e as outras 55 fail-closed. Amostra ampliada 186 pass, 0 fail, 2 skips DB-gated. |
| paridade JWT × `legacy_headers` | **APROVADO** | 104/104; `platform_admin` e `super_admin` produziram os mesmos quatro IDs Platform pelas duas vias; papéis comuns ficaram vazios e tenant UUID continuou persistente. |

Os dossiês dos vetos estão em
`agent-orchestration/omega/reprovacoes/R-nav-menu-platform-1.md` e
`R-nav-menu-platform-2.md`.

## Matriz de aceitação

| Requisito | Prova | Resultado |
|---|---|---|
| RA1 | Teste protegido com Prisma real | **7/7** |
| RA2 | Erro UUID reproduzido e cadeia de routers identificada | **PASS** |
| RA3 | `tenant_admin` comum + `scope=platform` | **200 `data:[]`** |
| RA4 | JWT e headers legados convergem no contexto canônico | **PASS** |
| RA5 | Suíte completa + check/build/lint | **PASS** |
| RA6 | Diff limitado a auth/core-saas/navigation, testes, docs e KPIs | **PASS** |
| RA7 | Três testes adversariais novos | **3/3** |
| RA8 | `operator`/`viewer`, pseudo-tenant e tenants UUID sem vazamento | **PASS** |
| RA9 | KPIs por contagem completa; `blocks_completed=111` | **PASS** |

## Gates finais

- Backend completo após rebase em Ω5P PR-18a:
  **1900 pass, 0 fail, 6 skip — 1906 total**
- Navegação focada final: **106/106**
- Matriz ampliada da junta: **113/113**
- Auth/RBAC/navigation/sessions: **169/169**
- Teste protegido em Prisma real: **7/7**
- Frontend smoke carregado: **937/937**
- Flutter carregado: **807/807**
- `npm run check`, `npm run build`, `npm run lint`: **OK**
- `git diff --cached --check`: **OK**
- `tests/navigation-menu-routes.test.ts`: hash preservado
  `135f91c820eb97b18e3a03f2c933d6ae43302a97`

## Decisão

**APROVADO 6/6 para commit, CI e merge** (quatro passes obrigatórios e dois
especialistas dos ciclos). Trata-se de correção de fronteira de
autenticação/autorização, não de novo bloco funcional; por isso
`blocks_completed` permanece em **111**.
