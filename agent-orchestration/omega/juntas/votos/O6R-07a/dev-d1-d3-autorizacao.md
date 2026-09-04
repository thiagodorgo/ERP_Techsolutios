# EVIDÊNCIA DE DESENVOLVIMENTO — `dev-o6r07a-autorizacao` (D1 · D2 · D3)

**Papel:** DESENVOLVER (§C7.4-bis — quem planeja não desenvolve; quem acha não conserta).
**Plano:** `agent-orchestration/omega/planos/B-O6R-07-plano.md` §3.1, §3.2, §3.3 · §4 linhas 1/2/3.
**Worktree:** `.claude/worktrees/b07` · **branch:** `fix/o6r07a-authorization`.
**Mandato:** SOMENTE D1 (permissão dedicada), D2 (SoD no decide), D3 (escopo por objeto no técnico).
Fora do meu mandato e NÃO tocados: §3.4, §3.5, §3.6 (auth), `Kpis/*`, `API_CONTRACTS.md`,
`achados.jsonl`, `status-geral.md`.

**Regra-mãe:** nenhuma correção vale por "ficou verde". Cada sonda nova traz o **vermelho-controle**
registrado (a MESMA sonda contra o head-base, com `ec` e trecho de saída).

---

## §0 · Baseline — MEDIDO (antes de qualquer edição de código)

```
$ git rev-parse HEAD
c421f9f058078e1e643fc5a01d269894ad53d4a3
$ git status --porcelain
?? agent-orchestration/omega/juntas/votos/O6R-07a/     (só este arquivo-esqueleto)
$ git branch --show-current
fix/o6r07a-authorization
```

**Contagem por EXECUÇÃO REAL** (não a estática 58 do §2.5, que subconta subtests). Forma:
`node --test --import tsx <arquivos>`, uma execução por grupo, no head `c421f9f`, sem banco
(harness em memória — `CORE_SAAS_PERSISTENCE=memory`).

| Grupo | Comando | tests | pass | fail | skip | ec |
|---|---|---|---|---|---|---|
| aprovação + fronteira de permissão | `node --test --import tsx tests/approval.test.ts tests/approval-routes.test.ts tests/approval-frontend-contract.test.ts tests/permission-catalog-migration-parity.test.ts` | **8** | 8 | 0 | 0 | **0** |
| OS + RBAC + paridade de banco | `node --test --import tsx tests/work-orders.test.ts tests/work-orders-routes.test.ts tests/core-saas.test.ts tests/permission-catalog-db-parity.test.ts tests/persistent-rbac-authorization.test.ts tests/persistent-rbac-middleware.test.ts` | **36** | 32 | 0 | **4** | 0 |

Os 4 `skipped` do 2º grupo são pré-existentes (testes `-db` que se auto-pulam sem `DATABASE_URL`);
não foram introduzidos por mim e o denominador 36 é constante.

**Detecção-base = 0, confirmada:** os 44 testes acima passam no head DEFEITUOSO. Nenhum deles
exerce papel no approve, SoD ou escopo por objeto — é o cenário do §2.5 do plano.

**Medição extra do terreno (`PERMISSOES_HERDADAS_DO_SEED`):**
```
$ node --import tsx -e "<contagem das chaves do Set em tests/permission-catalog-migration-parity.test.ts>"
baseline size = 189
```
`TAMANHO_CONGELADO` no mesmo arquivo (l.321) = **189**. A lista de isenção está **cheia até o teto**.
Isto é a raiz do bloqueio do D1 registrado adiante.


## D1 — §3.1 permissão dedicada `work_orders:approve` — CÓDIGO PRONTO E PROVADO · **PROVISIONAMENTO BLOQUEADO**

### O que foi implementado

| Arquivo | O quê |
|---|---|
| `src/modules/work-orders/work-order.routes.ts` | `approve: "work_orders:approve"` em `WORK_ORDER_PERMISSIONS`; as rotas `POST /approvals/:id/approve` e `/reject` passam de `requirePermission(.update)` para `requirePermission(.approve)`. GET `pending`/`:id` **inalterados** em `work_orders:read`. |
| `src/modules/core-saas/permissions/catalog.ts` | `"work_orders:approve"` no `PERMISSION_CATALOG` (logo após `mileage_correct`) + concessão explícita a `manager`. |

**Como os admins recebem — MEDIDO, não presumido** (o plano mandava medir o padrão da casa):
`catalog.ts` l.398-405 → `super_admin: PERMISSION_CATALOG` · `platform_admin: PERMISSION_CATALOG` ·
`tenant_admin: TENANT_ADMIN_PERMISSIONS = PERMISSION_CATALOG.filter(p => !p.startsWith("platform:"))`.
Ou seja: os três recebem **por herança**, que é exatamente como recebem `work_orders:mileage_correct` e todos
os demais `work_orders:*`. Nenhuma linha explícita foi acrescentada para eles — seguir o padrão é não inventar
exceção. **`manager` é a ÚNICA concessão explícita do bloco.**

### Casos (piso §4 linha 1 = ≥6; entregues **9** de papel + 2 de leitura + 1 de distribuição)

`tests/o6r07a-approval-permission.test.ts`, 3 testes:

1. **papel** — `technician`, `field_technician`, `operator`, `auditor` × {approve, reject} = **8 negativos**,
   todos `403 / permission_required`, e a pendência segue `pending_approval` ao final (prova de que nenhum
   deles decidiu); `manager` approve **200**; `tenant_admin` reject **200** → 10 asserções de papel.
   O solicitante das pendências é um usuário DEDICADO, distinto de todos os decisores — sem isso o 403 de D1
   se confundiria com o 403 de D2 e o teste provaria a coisa errada.
2. **leitura não decide** — o MESMO `field_technician` que recebe 403 para decidir continua com `200` em
   `GET /approvals/pending` e `GET /approvals/:id`. Sem este caso, fechar a leitura junto passaria despercebido
   e o app de campo perderia a fila.
3. **distribuição** — a lista de papéis com a chave é comparada por igualdade a
   `["manager","platform_admin","super_admin","tenant_admin"]`, e 9 papéis são negados nominalmente
   (finance, inventory, technician, field_technician, operator, field_dispatcher, auditor, support, viewer).

### VERMELHO-CONTROLE (obrigatório) — o que o plano exigia: *technician recebe 200 no approve*

Injeção: as 2 guardas revertidas para `requirePermission(WORK_ORDER_PERMISSIONS.update)` (o estado do
head-base), catálogo e testes intactos.

```
$ node -e "<reverte as 2 guardas para .update>"
INJECAO: 2 guardas revertidas para .update
$ node --test --import tsx tests/o6r07a-approval-permission.test.ts
not ok 1 - D1 — decidir aprovação exige work_orders:approve: gestão passa, campo e leitura não
  error: |-
    technician:approve deveria ser 403 e veio 200
    200 !== 403
  expected: 403
  actual: 200
# tests 3 · pass 2 · fail 1        → ec != 0
```
Guardas restauradas em seguida e conferidas: `grep -c "requirePermission(WORK_ORDER_PERMISSIONS.approve)"` = **2**.
`git diff --numstat` do arquivo = `10 2` (não houve conversão de EOL em massa; o arquivo tem 296 CR, contados
com `tr -cd '\r' | wc -c`, não com `grep -c`).

### N e forma

`node --test --import tsx <os 3 arquivos o6r07a-*>`, **N=3**, denominador **11/11/11**, `ec=0` nas três.

### ⛔ BLOQUEIO MEDIDO — a chave não pode ser provisionada dentro do §5

Acrescentar `work_orders:approve` ao catálogo deixa **3 verificações vermelhas**, e as três vivem **fora do §5
PERMITIDO do próprio plano**. Isto não é opinião — é execução:

```
$ node --test --import tsx tests/permission-catalog-migration-parity.test.ts
not ok 2 - permissão acrescentada ao catálogo chega ao banco por migração (fronteira)
  error: |-
    Permissão nova no catálogo e SEM migração de dados: work_orders:approve.
    Em produção o deploy roda apenas `prisma migrate deploy` (deploy-production.yml, sem `db:seed`):
    a permissão nasce MORTA no banco e a rota protegida por ela responde 403 para TODOS os papéis...
    Entregue no MESMO PR uma migração aditiva e idempotente, no padrão de
    prisma/migrations/20260861000000_grant_checklist_run_reopen_permission
# tests 3 · pass 2 · fail 1
```

| # | O que fica vermelho | O que resolve | Está no §5? |
|---|---|---|---|
| 1 | `tests/permission-catalog-migration-parity.test.ts` | migração aditiva em `prisma/migrations/` | **NÃO — `prisma/**` é PROIBIDO INTEIRO** |
| 2 | `tests/core-saas.test.ts` — literal `expectedPermissionCatalog` (l.48) | 1 linha após `"work_orders:mileage_correct"` | **NÃO** (fora do §2.5) |
| 3 | `tests/fixtures/role-catalog-contract.snapshot.json` (lido por `tests/core-saas-role-authority.test.ts`, que **não** é o `-db` do ciclo 5) | acrescentar a chave nos papéis com herança | **NÃO** (fora do §2.5) |

**A válvula de escape está fechada, e isso também foi medido:** o guard oferece isenção via
`PERMISSOES_HERDADAS_DO_SEED`, mas a lista tem **189** chaves e `TAMANHO_CONGELADO` (l.321) é **189** —
crescer reprova o terceiro teste do mesmo arquivo, que diz em voz alta *"ESTA LISTA NÃO CRESCE… deve ser
reprovado na revisão do PR"*.

**O plano se contradiz aqui, e o §A2 manda registrar em vez de escolher um lado em silêncio:** §3.1 exige a
chave nova; §5 proíbe `prisma/**` INTEIRO; §3.10 previu o caso mas nomeou "seed" — e `prisma/seed.ts` também é
`prisma/**`. Não existe caminho dentro do escopo declarado.

**PAREI e devolvi** (regra do mandato: *arquivo fora das listas → você PARA*). Registrado em
`pendencias.md` → `P-O6R-B07A-PROVISIONAMENTO-DA-CHAVE`. O conteúdo exato da migração está no §Fechamento.

## D2 — §3.2 SoD no decide (`APPROVAL_SELF_DECISION`) — **COMPLETO E PROVADO**

### O que foi implementado

`src/modules/work-orders/approval.service.ts`, em `decide()`: se `actor.userId === current.requestedByUserId`
→ `ApprovalError(403, "APPROVAL_SELF_DECISION", "self_decision", …)`. Vale para approve **e** reject (os dois
passam pelo mesmo `decide`). Zero campo novo, zero migração — `requestedByUserId` já vivia no agregado
(`approval.types.ts:26`) e simplesmente nunca era comparado ao ator.

`src/modules/work-orders/approval.types.ts`: `ApprovalAuditEvent.action` ganha
`"approval.self_decision_denied"` e `outcome` passa de `"success"` para `"success" | "denied"` — enum fechado,
não texto livre.

**Ordem deliberada — o SoD vem ANTES do 409 `approval_already_decided`.** Autorização primeiro: o solicitante
recebe a MESMA resposta esteja a pendência aberta ou já decidida. Com o 409 antes, uma varredura do próprio
solicitante distinguiria "pendente" de "decidida" pelo código de erro. Tem caso de teste dedicado.

**Auditoria da recusa, no padrão allowlist do módulo, sem PII nova:** `metadata` leva
`{reason:"self_decision", decision, status, work_order_id}`. O id do solicitante NÃO é repetido em metadata —
seria a mesma pessoa que já é o `actorId` do evento.

### Casos (piso §4 linha 2 = ≥2; entregues **8**)

`tests/o6r07a-approval-sod.test.ts`, 3 testes:

1. autoaprovação **403** `APPROVAL_SELF_DECISION`/`self_decision` · autorrecusa **403** · pendência segue
   `pending_approval` depois das duas (a recusa não deixou efeito) · outro decisor approve **200** · outro
   decisor reject **200**. Os dois atores têm o MESMO papel e a MESMA permissão — a única variável é quem pediu.
2. SoD antes do 409: numa pendência **já decidida por outro**, o solicitante recebe **403**, não 409.
3. rastro: exatamente **1** evento `approval.self_decision_denied`, `outcome:"denied"`, `actorId` correto,
   `metadata.reason`/`decision` corretos, e varredura do JSON serializado contra 10 termos sensíveis
   (token, bearer, authorization, base64, storage_key, bucket, local_path, password, email, @example.com).

### VERMELHO-CONTROLE — o que o plano exigia: *autoaprovação retorna 200*

Injeção: `if (actor.userId === current.requestedByUserId)` → `if (false)`.

```
$ node --test --import tsx tests/o6r07a-approval-sod.test.ts
not ok 1 - D2 — quem pediu não decide...        error: 200 !== 403
not ok 2 - D2 — o SoD vem ANTES do 409...       error: 409 !== 403
not ok 3 - D2 — a recusa deixa rastro...        error:   0 !== 1
# tests 3 · pass 0 · fail 3        → ec != 0
```
As três sondas ficam vermelhas, cada uma pela sua razão própria (200 no lugar do 403; 409 vazando o estado;
zero eventos de auditoria). Guard restaurado e reexecutado verde em seguida.

### N e forma

Incluído nas 3 execuções conjuntas (11/11/11, `ec=0`), forma declarada no bloco de Fechamento.

### Efeito colateral no arnês existente — **1 arquivo, dentro do §2.5, corrigido e justificado**

`tests/approval-routes.test.ts` quebrou: `managerA` era ao mesmo tempo `requestedByUserId` das duas pendências
e o decisor. Com o contrato novo isso é 403, e o teste morria em
`Cannot read properties of undefined (reading 'status')`.

**Correção: 2 linhas** — `requestedByUserId: seed.managerA.id` → `seed.viewerA.id`, nas duas chamadas de
`approvalService.request`. **Nenhuma asserção foi alterada, removida ou afrouxada**: o alvo do arquivo (RBAC de
papel, isolamento por organização, 400 sem motivo, 409 na segunda decisão, ausência de campo sensível no
payload) segue idêntico. O arquivo **está no §2.5**, e a edição é do tipo que o plano autoriza ("SÓ se o
contrato novo os quebrar"). Verde depois: `ec=0`, 2/2.

## D3 — §3.3 escopo por objeto (`WORK_ORDER_NOT_ASSIGNED`) — CÓDIGO PRONTO E PROVADO · **1 asserção fora do §5**

### O que foi implementado

| Arquivo | O quê |
|---|---|
| `work-order.types.ts` | `WORK_ORDER_MUTATION_SCOPE` — mapa papel→escopo, `as const satisfies Record<Role, …>` + `actorMutatesAssignedOnly(actor)`. |
| `work-order.service.ts` | `WorkOrderReferenceResolvers.resolveActorOperatorProfileId`; método privado `assertMutationObjectScope`; chamada em `update()` e `changeStatus()`; wiring do resolver em `createDefaultReferenceResolvers()`. |

**A regra nasce no SERVICE, não na UI** — backend é a autoridade final (CLAUDE.md B§2.4). E cobre também a
**fila offline do mobile**: `mobile-work-order-sync.ts` (`work_order.status_change`) chama o mesmo
`changeStatus`, então o técnico não contorna o escopo sincronizando em vez de chamar a rota.

**Derivação por INCLUSÃO, no idioma do `ROLE_AUTHORITY` da casa** (`catalog.ts:322-335`), e não por exclusão:
- `tenant_wide` — super_admin, platform_admin, tenant_admin, manager, operator, field_dispatcher
- `assigned_only` — technician, field_technician
- `no_mutation` — viewer, finance, inventory, auditor, support (**medido**: viewer e auditor têm só
  `work_orders:read`; finance, inventory e support não têm nenhuma chave `work_orders:*`)

`satisfies Record<Role, …>` faz papel novo sem classificação **reprovar o `npm run check`** — a omissão nunca
vira permissão. Há também a ponta de EXECUÇÃO da mesma verdade (o guard de tipo some numa refatoração para
`Record<string, …>` sem barulho).

**A regra é de PRESENÇA nos dois lados** (tem papel de campo **e** não tem papel de gestão), como o §3.3
enuncia — não "todo mundo menos a gestão". Motivo medido: chamadores internos passam contexto com
`roles: []` (`tests/work-order-checklists-sticky.test.ts:696`, `…-sticky-db.test.ts:238,328`) e o middleware
HTTP já recusa `roles.length === 0` com 403 `role_required` **antes** do serviço — tratar "sem papel" como
escopado não fecharia buraco de HTTP nenhum e quebraria composição interna.

**403, não 404** (o plano é explícito): a ordem existe na organização do ator e ele PODE lê-la
(`work_orders:read` é tenant-wide e a lista do app depende disso). 404 segue reservado ao cross-tenant, e há
caso de teste provando que continua sendo 404.

**Fail-closed por composição:** sem resolver injetado, ou com o perfil não resolvido, a resposta é a mesma 403.
O `catch` do resolver devolve `undefined` **de propósito** — falha de leitura do perfil nunca vira permissão.

### Casos (piso §4 linha 3 = ≥4; entregues **12**)

`tests/o6r07a-wo-object-scope.test.ts`, 5 testes:

1. técnico A × OS do técnico B → **403** em `PATCH /work-orders/:id` **e** em `PATCH /:id/status` · OS **sem
   atribuição** → 403 nos dois verbos (4 negativos, todos com `code: WORK_ORDER_NOT_ASSIGNED` e
   `reason: not_assigned_to_actor`) · o título da OS do colega segue o original (a recusa não deixou efeito) ·
   a **própria** OS → 200 nos dois verbos.
2. `manager` (que **não tem perfil de operador nenhum**) muta a OS de um técnico → 200. Um guard que exigisse
   perfil de todo mundo travaria o despacho.
3. **ator com DOIS papéis** (exigência explícita do mandato): `x-role: field_technician,manager` → **200** na
   OS alheia (união vence); o **MESMO usuário** só com `field_technician` → **403**. O par é o que prova que a
   diferença é o papel, não a pessoa.
4. cross-tenant → **404** preservado.
5. exaustividade: todo papel de `DEFAULT_ROLES` tem classificação; `actorMutatesAssignedOnly` conferida em 6
   combinações incluindo `[]` e `["field_technician","manager"]`.

**Nota de arnês (§A2):** os usuários deste teste são **UUIDs crus**, não `core.createUser(...)`. O store em
memória emite `usr-000001`, enquanto `users.id` é `@db.Uuid` no schema e `OperatorProfileService` valida
`user_id` como UUID. Usar o formato de produção mantém o teste medindo o produto, não o arnês.

### VERMELHO-CONTROLE — o que o plano exigia: *técnico A muta OS do técnico B com 200*

Injeção: `if (!actorMutatesAssignedOnly(actor)) return;` → `if (true) return;`.

```
$ node --test --import tsx tests/o6r07a-wo-object-scope.test.ts
not ok 1 - D3 — técnico só muta a ordem atribuída a ele (update e status)
  error: alheiaUpdate deveria ser 403 e veio 200
ok   2 - D3 — gestão segue tenant-wide (correto: não muda com o guard desarmado)
not ok 3 - D3 — ator com DOIS papéis: a união vence...
ok   4 - D3 — 404 continua sendo do cross-tenant (correto: independe do guard)
ok   5 - D3 — a classificação de escopo é exaustiva (unitário, independe do guard)
# tests 5 · pass 3 · fail 2        → ec != 0
```
**O vermelho é SELETIVO, e isso é parte da prova:** os 2 casos que dependem do guard caem; os 3 que não
dependem seguem verdes. Sonda que fica vermelha inteira quando se desarma uma linha está medindo o arnês, não
o defeito. Guard restaurado e reexecutado verde.

### ⛔ 1 asserção fora do §5 — `tests/work-order-checklists-sticky.test.ts:612`

O arquivo assere que um `field_technician` desviando pelo update genérico com corpo `checklists` recebe
**409 `checklist_set_requires_endpoint`**. Com o guard, esse ator (não atribuído àquela ordem) recebe
**403 `WORK_ORDER_NOT_ASSIGNED`**.

```
not ok 15 - [rota] o ajuste exige a permissão de ENVIAR ao técnico e o detalhe passa a mostrar o conjunto
  error: |-
    o desvio pelo update genérico é porta fechada, não 200
    403 !== 409
```

**Não é regressão** — a intenção declarada do próprio teste ("porta fechada, não 200") continua satisfeita; a
porta agora fecha antes e mais forte. **E a ordem não é escolha de estilo:** medi onde o 409 nasce —
`work-order.service.ts:948-957`, dentro de `applyChecklistSelectionOnUpdate`, que é o ponto de ESCRITA do
conjunto (`rewriteChecklistSet`). Pôr o guard de autorização depois dele seria autorizar depois de gravar.
Não existe ordem que preserve o 409 **e** mantenha a autorização antes da escrita.

O arquivo **não está no §2.5**. **PAREI e devolvi.** Correção necessária: **uma asserção**, `409 → 403` com
razão `not_assigned_to_actor`. Registrado em `pendencias.md` → `P-O6R-B07A-STICKY-409-VIRA-403`.

## Fechamento

### `git diff --numstat` — completo, nada elidido

```
13	0	src/modules/core-saas/permissions/catalog.ts
39	0	src/modules/work-orders/approval.service.ts
11	2	src/modules/work-orders/approval.types.ts
10	2	src/modules/work-orders/work-order.routes.ts
69	1	src/modules/work-orders/work-order.service.ts
61	0	src/modules/work-orders/work-order.types.ts
10	2	tests/approval-routes.test.ts
```
Não rastreados (novos): `tests/o6r07a-approval-permission.test.ts` · `tests/o6r07a-approval-sod.test.ts` ·
`tests/o6r07a-wo-object-scope.test.ts` · este arquivo de evidência.
Somado depois da medição acima: `agent-orchestration/controle/pendencias.md` (3 pendências novas — permitido
pelo mandato).

**Conferência de escopo §5, arquivo a arquivo:** os 7 modificados e os 3 testes novos estão **todos** na lista
PERMITIDO — 07a. **Zero** arquivo do PROIBIDO tocado: `prisma/**` intacto, `src/modules/authority/**` intacto,
financeiro intacto, `.github/**`, `frontend/**`, `mobile/**`, `CLAUDE.md`/`AGENTS.md`, `.env`, lockfiles,
`RBAC_MATRIX.md`/`APPROVAL_LIMITS.md`, `scripts/**` (executei, não editei) e os **8 arquivos do ciclo 5** —
nenhum deles aparece no diff. `tests/helpers/auth-identity-fixture.ts` nem foi importado.

### Bateria — `ec` de cada passo

| Passo | Comando | `ec` |
|---|---|---|
| typecheck | `npm run check` | **0** |
| lint | `npm run lint` | **0** |
| build | `npm run build` | **0** |
| sondas novas (N=3) | `node --test --import tsx tests/o6r07a-*.test.ts` | **0 · 0 · 0** |
| alvos §2.5 (aprovação) | `node --test --import tsx tests/approval*.test.ts` | **0** |
| suíte canônica | `npm test` com cluster descartável | **1** (4 falhas — todas nomeadas abaixo) |
| whitespace | `git diff --check` | **0** |
| contrato de frontend | `node --test --import tsx tests/approval-frontend-contract.test.ts` | **0** — o `.tsx` NÃO mudou e o teste não acusou o delta de permissão |
| check do frontend | `npm --prefix frontend run check` | **1 — NÃO MEDIDO POR AMBIENTE** |

**Sobre o `npm --prefix frontend run check`: eu NÃO medi, e digo por quê em vez de estimar.** Falha com
`TS2307: Cannot find module 'lucide-react' / 'react-router-dom'` em dezenas de arquivos — `frontend/node_modules`
**não existe neste worktree** (`test -d` = ausente; só o `npm ci` da raiz foi rodado). É gap de ambiente, não
do diff: **nenhum arquivo de `frontend/` está no meu diff.** Instalar dependência do frontend não está no
mandato. Quem for medir precisa de `npm --prefix frontend ci` antes.

### N, forma e denominador de cada número publicado

| Número | Forma | N |
|---|---|---|
| 44 testes de baseline (8 + 36), `ec=0` | `node --test --import tsx <arquivos>`, sem banco | 1 por grupo |
| **11/11/11** nas sondas novas | `node --test --import tsx` dos 3 arquivos juntos | **N=3**, denominador **idêntico** nas três |
| **2622** testes na suíte canônica · pass 2616 · fail 4 · skip 2 | `npm test` (= `node scripts/run-backend-tests.mjs`, 251 arquivos), com `DATABASE_URL`/`REDIS_URL` do cluster descartável e `CORE_SAAS_PERSISTENCE=memory` | 1 |
| 2384 · pass 2322 · fail 4 · skip 58 | o mesmo `npm test` **sem** banco | 1 |
| 189 = `TAMANHO_CONGELADO` | contagem das chaves do `Set` por parse do arquivo | 1 |

**Os dois denominadores de `npm test` diferem de propósito e a diferença é explicada:** sem banco, 58 skips e
o **piso de denominador do runner dispara** (`core-saas-role-authority.test.ts` termina sem registrar teste,
porque `src/database/prisma.ts` lança `DATABASE_URL is required` no import). Com o cluster descartável esse
arquivo **roda**, os skips caem para 2 e o total sobe para 2622. Isso **confirma que aquela falha era do
ambiente, não do diff** — e é a razão de o cluster não ser opcional.

### As 4 falhas da suíte canônica — nomeadas, com dono

| # | Teste | Causa | Dentro do meu escopo? |
|---|---|---|---|
| 1 | `permissão acrescentada ao catálogo chega ao banco por migração (fronteira)` | D1 · exige migração em `prisma/migrations/` | **NÃO** — `prisma/**` PROIBIDO INTEIRO |
| 2 | `mantem catalogo de permissoes integro` (`tests/core-saas.test.ts`) | D1 · literal do catálogo | **NÃO** — fora do §2.5 |
| 3 | `contrato do consumidor de deploy: snapshot dos valores exportados` (`tests/fixtures/role-catalog-contract.snapshot.json`) | D1 · snapshot papel→permissões | **NÃO** — fora do §2.5 |
| 4 | `[rota] o ajuste exige a permissão de ENVIAR ao técnico…` (`work-order-checklists-sticky.test.ts:612`) | D3 · 409 → 403 | **NÃO** — fora do §2.5 |

**Nenhuma delas é defeito da correção.** As três de D1 são a MESMA causa (a chave nova precisa ser
provisionada e aparece em 3 snapshots); a de D3 é o contrato novo funcionando. As quatro estão registradas em
`pendencias.md` (`P-O6R-B07A-PROVISIONAMENTO-DA-CHAVE`, `P-O6R-B07A-STICKY-409-VIRA-403`).

### Migração que D1 pede — conteúdo pronto, NÃO escrita (arquivo proibido)

Padrão de `prisma/migrations/20260861000000_grant_checklist_run_reopen_permission`. Aditiva e idempotente:
`INSERT` em `permissions` com `ON CONFLICT (key) DO NOTHING`, depois `INSERT` em `role_permissions`
selecionando os papéis **manager, tenant_admin, super_admin, platform_admin** com
`ON CONFLICT (role_id, permission_id) DO NOTHING`. Quem for escrevê-la deve **ler a migração-padrão** e copiar
a forma dela — não este parágrafo.

### O que eu NÃO fiz, e por quê

1. **Migração de provisionamento de `work_orders:approve`** — `prisma/**` é PROIBIDO INTEIRO no §5. Sem ela,
   a chave nasce morta em produção (o guard diz isso com todas as letras). **Bloqueia o merge.**
2. **`tests/core-saas.test.ts` e `tests/fixtures/role-catalog-contract.snapshot.json`** — fora do §5. Uma linha
   cada. **Bloqueiam o merge.**
3. **`tests/work-order-checklists-sticky.test.ts:612`** (`409` → `403`) — fora do §5. **Bloqueia o merge.**
4. **§3.4, §3.5, §3.6 do plano** (lockout anônimo, rate-limit por IP, pino N/r/p do scrypt) — **fora do meu
   mandato**, que é D1–D3. O módulo `auth` não foi tocado: `git diff` de `src/modules/auth/**` é **vazio**.
5. **`Kpis/*`, `API_CONTRACTS.md`, `docs/revisoes/O6R/achados.jsonl`, `REGISTRO_ACHADOS_O6R.md`,
   `status-geral.md`, `log-execucao.md`** — entrega do orquestrador ou de outro mandato, por instrução expressa.
6. **`team_id` como critério de escopo** — o §3.3 exclui explicitamente deste bloco (sem modelo de membership
   de equipe medido).
7. **Commit, PR, merge** — do orquestrador.
8. **Alçada monetária por valor** — não é implementável aqui: o agregado de aprovação não tem campo de valor
   (`approval.types.ts` lido inteiro). Vira `P-O6R-B07-APPROVAL-BY-POLICY`.

### Tensão registrada (§A2) — semântica de `assigned_operator_id`

Implementei **exatamente** o que o §3.3 manda: `assigned_operator_id == OperatorProfile.id` do ator (lookup 1:1
por `user_id`). Registro, sem re-julgar o diagnóstico e sem alterar a regra: **nem todo caminho de escrita
grava um id de OperatorProfile nessa coluna.** `POST /work-orders/:id/assign` aceita
`body.operatorId ?? body.userId` (`work-order.service.ts:1618`), e `field-dispatch.service.ts:221` trabalha com
`operatorUserId`. A coluna não tem FK declarada no schema (`prisma/schema.prisma:2340`, `String? @db.Uuid`).
**Consequência:** um técnico atribuído por *user id* seria recusado com 403. O erro, se houver, é **fail-closed**
(recusa a mais, nunca permissão a mais), e por isso implementei como planejado em vez de alargar a regra por
conta própria. **A junta decide** se quer um caso de teste adicional ou uma pendência de normalização da coluna.

### Limpeza (§C5) — 1 linha

Containers descartáveis `o6r07-pg` (:56434) e `o6r07-redis` (:56381) **derrubados e removidos**; a base viva
`erp-postgres`/`erp-redis` não foi tocada em momento nenhum (nem leitura — este worktree não tem `.env`, e
`DATABASE_URL` estava vazia até eu exportá-la apontando para o cluster descartável); `dist/` do `npm run build`
removido; logs temporários em `/tmp` descartados; nenhum arquivo rastreado nem `node_modules` tocado; nenhuma
junction/symlink criada.

### Armadilhas do mandato — como foram respeitadas

CR contado com `tr -cd '\r' | wc -c` (nunca `grep -c`) · nenhum `sed -i`/`perl -i` em arquivo de contrato (as
duas injeções de vermelho-controle foram `fs.readFileSync`/`writeFileSync` da MESMA string, e o `numstat`
confirma que não houve conversão de EOL em massa: `10 2` no routes, não o arquivo inteiro) · nenhum
`git archive`+`tar` · nenhum heredoc com aspas (todo conteúdo de teste foi escrito com `Write`) · nenhum
`git checkout -- <arquivo>`, `stash`, `reset`, `gc` ou remoção de `.lock` · nenhum mass-delete (o cluster
inteiro foi descartado, que é teardown escopado por construção).
