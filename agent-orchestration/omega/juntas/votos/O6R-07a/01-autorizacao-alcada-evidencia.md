# C1 — `jurado-b07a-autorizacao-e-alcada` · evidência

> **Cadeira C1** da junta do `B-O6R-07a` (PR #369). **VETO.** Quórum: unanimidade de 3.
> Identidade nova: não escrevi plano nem emenda, não fui dev, não votei em junta anterior.
> **Julgo o mérito; não proponho correção** (§C7.4-bis).

## HEAD medido por mim

```
$ git rev-parse HEAD
fb6618b413bda0a8efd8bbbf1ace38f824761b82
```

O briefing manda registrar `head_julgado = e9a9caa` (ERRATA E-1). **Medi e discordo do rótulo:**
o head do worktree é `fb6618b`. Conferi que o delta `e9a9caa..fb6618b` é **só registro de junta**:

```
$ git diff --name-status e9a9caa HEAD
M	agent-orchestration/omega/juntas/BRIEFING-O6R-07a.md
A	agent-orchestration/omega/juntas/votos/O6R-07a/00a-inspetor-evidencia.md
A	agent-orchestration/omega/juntas/votos/O6R-07a/00a-inspetor-parecer.md

$ git diff --name-status 7c248c9 HEAD -- src prisma tests frontend RBAC_MATRIX.md
(vazio)
```

**`head_julgado` = `fb6618b`**, e nenhuma linha de código o separa de `7c248c9` (o head do cabeçalho
original do briefing). Os três heads citados nesta rodada são equivalentes para efeito de código.

---

## C1-1 — A permissão está distribuída certo, medida CONTRA A MATRIZ

**Status: EM APURAÇÃO**

- [ ] **1a** — `RBAC_MATRIX.md` lida como fonte: quem a matriz dá `work_orders:approve` (ou equivalente)?
- [ ] **1b** — Catálogo (`src/modules/core-saas/permissions/catalog.ts`) × matriz, papel a papel.
- [ ] **1c** — Migração (distribuição no banco) × matriz.
- [ ] **1d** — GET `pending`/`detail` seguem em `work_orders:read`?
- [ ] **1e** — **PROVA POR MUTAÇÃO**: conceder a chave a papel que não devia → medir a rota **abrir**;
      restaurar → medir **fechar**.
- [ ] **1f** — `finance`/`inventory` **registrados** em `P-O6R-B07-APPROVAL-BY-POLICY`, não omitidos.

## C1-2 — SoD e escopo por objeto valem COMO ENUNCIADOS?

**Status: EM APURAÇÃO**

- [ ] **2a** — `403 APPROVAL_SELF_DECISION` em **approve E reject**.
- [ ] **2b** — `403 WORK_ORDER_NOT_ASSIGNED` (**não 404**); fronteira do 404 cross-tenant não borrada.
- [ ] **2c** — A regra nasce no **SERVICE** ou só na rota? Ataque pelas **rotas HTTP reais**.
- [ ] **2d** — Ator com **dois papéis** (união): gestão não cai no guard — existe teste e passa?
- [ ] **2e** — Auditoria §2.8: recusa sem PII nova; sem `token`/`path`/`bucket`/`base64`/`tenant_id`.

## C1-3 — O P0 fecha de verdade, ou fecha pela metade?

**Status: EM APURAÇÃO**

- [ ] **3a** — Inventário de **todas** as rotas mutantes do módulo work-orders (verbos e sub-recursos).
- [ ] **3b** — Cada rota mutante: passa pelo escopo por objeto ou sobrou via aberta?
- [ ] **3c** — Sub-recursos: checklists, anexos, comentários, status, atribuição, evidências.
- [ ] **3d** — Outros papéis de campo (`field_technician`, `technician`, `field_dispatcher`).
- [ ] **3e** — Tensão E1/E4 (`assigned_operator_id` = user id × perfil de operador): real neste head?

---

# REGISTRO DAS MEDIÇÕES

(apenso abaixo, item a item, conforme medido — P1/P2)

## C1-1 — MEDIDO · veredito parcial: **CONFORME**

### 1a · A matriz, lida como fonte (não o plano)

```
$ sed -n '/^| Workflow \/ approvals/p' RBAC_MATRIX.md
| Workflow / approvals | full | full | full | request | approval-by-policy | approval-by-policy | request/ack | read | support-view |
```

Colunas (cabeçalho da matriz-base): `platform_admin | tenant_admin | manager | operator | finance |
inventory | field_technician | auditor | support`. Logo, **pela matriz**:

| papel | matriz diz | esperado p/ `work_orders:approve` |
|---|---|---|
| platform_admin | `full` | **tem** |
| tenant_admin | `full` | **tem** |
| manager | `full` | **tem** |
| operator | `request` | não tem |
| finance | `approval-by-policy` | não tem *sem política* |
| inventory | `approval-by-policy` | não tem *sem política* |
| field_technician | `request/ack` | não tem |
| auditor | `read` | não tem |
| support | `support-view` | não tem |

`technician` e `field_dispatcher` **não existem na matriz-base** (ela tem 9 papéis); são papéis do
catálogo do código. Pela semântica (`field_technician`=campo, `field_dispatcher`=despacho) nenhum
dos dois é aprovador. **Nada no código diverge da matriz neste eixo.**

### 1b · Catálogo × matriz, papel a papel (execução real)

```
$ node --import tsx -e "import { ROLE_PERMISSIONS } from './src/modules/core-saas/permissions/catalog.ts'; ..."
technician         ["work_orders:read","work_orders:comment","work_orders:update","work_orders:status"]
field_technician   ["work_orders:read","work_orders:comment","work_orders:update","work_orders:status"]
field_dispatcher   ["work_orders:read","work_orders:comment","work_orders:create","work_orders:assign","work_orders:status"]
operator           ["work_orders:read","work_orders:comment","work_orders:update","work_orders:status","work_orders:mileage_correct"]
manager            [... ,"work_orders:approve"]
auditor            ["work_orders:read"]
support            []   finance []   inventory []   viewer ["work_orders:read"]
```

`manager` é a única concessão explícita; nenhum papel de campo/leitura a recebe. **Bate com a matriz.**

### 1c · Migração — distribuição no banco

`prisma/migrations/20260871000000_.../migration.sql`: `r.key IN ('super_admin','tenant_admin','manager')`.
`platform_admin` ausente **com razão escrita no cabeçalho** (não existe como role no banco; herda no
catálogo em código). Coerente com 1b. *(A prova de aplicação da migração é da cadeira C3.)*

### 1d · Leitura não decide

`work-order.routes.ts` l.69-83: `GET /approvals/pending` e `GET /approvals/:approvalId` seguem em
`requirePermission(WORK_ORDER_PERMISSIONS.read)`. Só `POST .../approve` e `.../reject` mudaram para
`.approve`. **Conforme.**

### 1e · **PROVA POR MUTAÇÃO** (o item que o mandato exige)

Worktree PRÓPRIO `.claude/worktrees/jur-c1-drill` @ `fb6618b`, `npm ci` próprio (326 pacotes, ec=0).
Sem banco (arnês em memória) — nenhuma porta aberta, base viva não tocada.

```
$ node --test --import tsx tests/zz-c1-drill-permissao.test.ts
# FASE1 technician approve (sem a chave): 403 permission_required
# FASE2 technician approve (COM a chave): 200 approved      <- concedi work_orders:approve em runtime
# FASE2 technician reject  (COM a chave): 200 rejected
# FASE3 technician approve (restaurado):  403 permission_required
ok 1 - C1-1e — PROVA POR MUTAÇÃO
```

A rota **abre e fecha com a chave**, não com um teste de papel disfarçado. O gate é real.

### 1b-extra · Negativos ALÉM dos 4 que o dev cobriu

O teste do dev (`o6r07a-approval-permission.test.ts`) nega 4 papéis. Ampliei para 9 × 2 verbos:

```
field_dispatcher/approve=403 | field_dispatcher/reject=403 | support/*=403 | finance/*=403
inventory/*=403 | viewer/*=403 | technician/*=403 | field_technician/*=403 | operator/*=403 | auditor/*=403
POSITIVO manager: 200 · tenant_admin: 200 · super_admin: 200 · platform_admin: 200
```

**18/18 negados, 4/4 concedidos.** A herança de plataforma existe e funciona.

### 1f · `finance`/`inventory` REGISTRADOS, não omitidos

```
$ grep -n "P-O6R-B07-APPROVAL-BY-POLICY" -A 12 agent-orchestration/controle/pendencias.md
2833:## P-O6R-B07-APPROVAL-BY-POLICY (2026-09-02) — `finance`/`inventory` sem `work_orders:approve` — MÉDIA
```
Com a razão medida (o agregado não tem campo monetário). **Registrado.**

**C1-1 = CONFORME.** Nenhum achado.

---

## C1-2 — parcialmente medido

### 2a · SoD em approve **E** reject — **CONFORME** (execução)

Solicitante é `manager` (tem a chave) — sem isso o 403 seria de permissão e o teste provaria outra coisa.

```
# SoD approve: 403 APPROVAL_SELF_DECISION
# SoD reject : 403 APPROVAL_SELF_DECISION
# SoD sobre pendencia JA decidida: 403 APPROVAL_SELF_DECISION   <- 403 ANTES do 409: não vaza o estado
ok 3 - C1-2a
```

A ordem deliberada (403 antes do 409) **vale como enunciada**: o solicitante recebe a mesma resposta
com a pendência aberta ou já decidida.

### 2b · `403 WORK_ORDER_NOT_ASSIGNED` × `404` cross-tenant — **CONFORME** (execução)

```
PATCH /work-orders/:B            (técnico A, mesma org)      -> 403 WORK_ORDER_NOT_ASSIGNED
PATCH /work-orders/:B/status     (técnico A, mesma org)      -> 403 WORK_ORDER_NOT_ASSIGNED
PATCH /work-orders/:A            (técnico de OUTRA org)      -> 404 WORK_ORDER_NOT_FOUND
```
A fronteira **não foi borrada**: o 403 novo não comeu o 404 do cross-tenant.

### 2c · A regra nasce no SERVICE — **CONFORME**

```
$ grep -rn "assertMutationObjectScope" src/
src/modules/work-orders/work-order.service.ts:808:  private async assertMutationObjectScope(
src/modules/work-orders/work-order.service.ts:837:    await this.assertMutationObjectScope(actor, current);   <- update()
src/modules/work-orders/work-order.service.ts:1304:   await this.assertMutationObjectScope(actor, current);   <- changeStatus()
```
Método privado do **serviço**, não middleware de rota. Ataquei pelas **rotas HTTP reais** e o 403 veio.
*(Este mesmo `grep` é a base do achado C1-A1 abaixo: são **2** call sites, e só 2.)*

### 2d · Ator com DOIS papéis — **CONFORME** (execução)

```
PATCH /work-orders/:B  com x-role: "field_technician,manager"  -> 200 OK
PATCH /work-orders/:B  com x-role: "field_technician"          -> 403 WORK_ORDER_NOT_ASSIGNED
```
A união vence, e a diferença é o **papel**, não a pessoa (mesmo `x-user-id` nas duas).

---

## C1-3 — MEDIDO · veredito parcial: **NÃO CONFORME — o P0 NÃO fecha**

### 3a/3b · Inventário das rotas mutantes e a varredura

O guard tem **2 call sites** (2c). O módulo tem **14 rotas mutantes**. Ataquei todas com
`field_technician` A contra a OS do `field_technician` B, mesma organização — **rotas HTTP reais**:

```
$ node --test --import tsx tests/zz-c1-drill-p0.test.ts     (worktree jur-c1-drill @ fb6618b)

PATCH /work-orders/:B                          -> 403 WORK_ORDER_NOT_ASSIGNED   <- fechado pelo bloco
PATCH /work-orders/:B/status                   -> 403 WORK_ORDER_NOT_ASSIGNED   <- fechado pelo bloco
POST  /work-orders/:B/attachments              -> 201 OK                        <- **VIA ABERTA**
DELETE/work-orders/:B/attachments/:id          -> 204 OK                        <- **VIA ABERTA**
POST  /work-orders/:B/comments                 -> 201 OK                        <- **VIA ABERTA**
POST  /work-orders/:B/geocode                  -> 200 (geocoded=false, Noop)    <- sem guard, sem efeito no default
POST  /work-orders/:B/geocode-destination      -> 422 (validação de domínio)    <- sem guard
PATCH /work-orders/:B/mileage                  -> 403 FORBIDDEN (permissão)
POST  /work-orders/:B/cancel                   -> 403 FORBIDDEN (permissão)
POST  /work-orders/:B/duplicate                -> 403 FORBIDDEN (permissão)
POST  /work-orders/:B/assign                   -> 403 FORBIDDEN (permissão)
PATCH /work-orders/:B/checklists               -> 403 FORBIDDEN (permissão)
POST  /work-orders/:A/attachments (a PRÓPRIA)  -> 201 OK   <- controle positivo: o app de campo não travou
```

### 3c · O EFEITO, medido — não é campo inócuo, é **destruição de evidência**

```
$ node --test --import tsx tests/zz-c1-drill-p0b.test.ts
(a) anexo do dono: lista ANTES=1 · DELETE por tecnico A=204 · lista DEPOIS=0
    · download antes=200 depois=404
(b) POST comments (campo message) na OS alheia -> 201 OK
(c) POST geocode na OS alheia -> 200 geocoded=false reason="Geocodificação está desabilitada
    neste ambiente." · lat depois=undefined
```

O técnico A **apagou o anexo que a gestão pendurou na OS do técnico B**: sumiu da lista do dono e o
download passou de `200` para `404`. `WorkOrderAttachmentService.deleteAttachment` ainda chama
`deleteStoredWorkOrderAttachmentFile` — o blob sai do storage. **Não há guard de objeto nem de autoria**:
`assertWorkOrder()` só chama `workOrderService.get` (escopo de tenant).

Sobre (c), **sendo justo**: o 200 do geocode é `geocoded:false` porque o geocoder é Noop no env padrão.
**Não medi com `GEOCODING_ENABLED` ligado** — registro a rota como *alcançável sem guard*, sem afirmar
efeito que não medi.

### 3d · Outros papéis de campo

`technician` e `field_technician` têm exatamente as mesmas chaves (`read/comment/update/status` — §1b);
o ataque vale para os dois. `field_dispatcher` é `tenant_wide` por desenho (despacho redistribui).

### O achado: **C1-A1** — o bloco marca `Ω6R-SEC-002` como `fechado`, e ele não está

O critério de aceite escrito no PRÓPRIO achado (`docs/revisoes/O6R/achados.jsonl`, campo `teste`):

> *"**Técnico A não altera OS de B** nem decide aprovação; gestor dentro da alçada consegue,
> solicitante não se autoaprova."*

O diff deste bloco vira o registro para `"status":"fechado"`, `"fechado_por":"B-O6R-07a"`:

```
$ git diff f895dd2 HEAD -- docs/revisoes/O6R/achados.jsonl
-  "id":"Ω6R-SEC-002", ... "status":"ativo"
+  "id":"Ω6R-SEC-002", ... "status":"fechado","fechado_em":"2026-09-02","fechado_por":"B-O6R-07a"
```

E o `evidencia_fechamento` declara **duas** exclusões — *"FORA DO FECHAMENTO, dito às claras: alçada por
VALOR ... e team_id ..."* — e **não declara** que o escopo por objeto cobre só `update`/`status`.

**Por que isto é `dentro-do-bloco`, e não `pre-existente`:** as rotas de anexo/comentário são de fato
anteriores (Ω3-d / Ω3F-5) e estão **fora** do §5 permitido do 07a — o dev **não podia** consertá-las, e
eu **não o cobro por isso**. O defeito que imputo é outro e é **ato deste PR**: `achados.jsonl`
**está** no §5 permitido, e foi neste diff que o P0 passou a `fechado`. Fechar um P0 que segue aberto
o **tira do razão** — ninguém volta a ele. A regra de escopo (§C7.1-ter(a)) protege o bloco de ser
reprovado por defeito que não criou; ela não autoriza **declarar fechado** o que a medição mostra aberto.

### E o que foi dito à junta (briefing §6.3, vindo da E2)

> *"técnico **não atribuído** perde **toda** mutação, inclusive a inócua"*

**Falso, medido:** ele mantém criar anexo, **apagar anexo alheio** e comentar, em qualquer OS da
organização. A junta recebeu para deliberar uma caracterização mais forte do que a execução entrega.
Registro como **C1-A2**.

**C1-3 = NÃO CONFORME.**

### 2e · Auditoria da recusa de SoD (§2.8) — **CONFORME** (execução)

```
$ node --test --import tsx tests/zz-c1-drill-tensao.test.ts
{ "action":"approval.self_decision_denied", "tenantId":"...", "actorId":"...",
  "approvalId":"...", "entityType":"work_order", "entityId":"...", "outcome":"denied",
  "metadata": { "reason":"self_decision", "decision":"approved",
                "status":"pending_approval", "work_order_id":"..." } }
```

Sem `token`, `path`, `bucket`, `storage_key`, `base64` — e o `sanitizeAuditMetadata`
(`approval.service.ts:241-249`) filtra essas chaves por regex. O `tenantId` de topo **não é PII nova**:
é a forma pré-existente de `ApprovalAuditEvent` (os eventos `approval.requested|approved|rejected` já a
carregavam antes do bloco), e é store interno, não payload público. O id do solicitante **não** é repetido
em metadata. **Sem achado.**

**C1-2 = CONFORME** (2a, 2b, 2c, 2d, 2e).

---

### 3e · A TENSÃO E1/E4 — **REAL neste head, medida** (o briefing a deixou "para a junta decidir")

`work-order.service.ts:1670`: `operatorId: parseRequiredUuid(body.operatorId ?? body.userId, "operatorId")`.
Quem atribui mandando `userId` grava um **USER id** em `assigned_operator_id`.

```
$ node --test --import tsx tests/zz-c1-drill-tensao.test.ts
(1) assign{operatorId:PERFIL} -> 200 assigned=PERFIL  | PATCH pelo tecnico A -> 200 OK
(2) assign{userId:USER}       -> 200 gravou=USER-ID   | PATCH pelo MESMO tecnico -> 403 WORK_ORDER_NOT_ASSIGNED
(3) PATCH status pelo MESMO tecnico na OS (2)         -> 403 WORK_ORDER_NOT_ASSIGNED
```

**Decido como jurado:** a tensão é real e tem efeito operacional. O app Flutter **manda `user_id`** no
assign — é o achado `Ω6R-QUA-004`, que segue `parcialmente_superado` com o componente `assignWorkOrder`
**listado como aberto**. Logo: OS atribuída pelo app → o técnico **legitimamente atribuído** não muda nem o
título nem o **status** — e `PATCH /status` é o caminho da **fila offline** do mobile.

O 403 **nasce com o guard deste bloco** (antes, o 200 passava). É **fail-closed** (recusa a mais, nunca
permissão a mais), o que o mantém fora de `bloqueia`; mas trava fluxo de campo real e o bloco **não abriu
pendência** para ele — `pendencias.md:2924` o entrega à junta sem dono. Registro como **C1-A4**, gravidade
**alta**.

---

# VEREDITO C1: **REPROVADO**

| item | veredito |
|---|---|
| **C1-1** permissão × matriz | **CONFORME** (provado por mutação) |
| **C1-2** SoD e escopo por objeto como enunciados | **CONFORME** (5/5 sub-provas) |
| **C1-3** o P0 fecha? | **NÃO** — 3 vias abertas, 1 destrutiva |

O que o bloco construiu é bom e eu o digo sem reservas: a chave dedicada é real (abre e fecha por
mutação), a distribuição bate com a matriz papel a papel, o SoD vale nos dois verbos e não vaza estado,
o guard de objeto nasce no serviço, a união de papéis funciona e o 404 cross-tenant sobreviveu.

**O que reprova é o passo final:** o mesmo PR que fechou três cortes do achado virou o registro do P0
para `fechado`, e o critério de aceite escrito no próprio achado — *"Técnico A não altera OS de B"* —
**falha por execução** em três rotas, uma delas **destruindo evidência da OS alheia**.
Não cobro do bloco o conserto das rotas (fora do §5 dele). Cobro a **declaração de fechamento**, que é
ato deste diff, em arquivo que **está** no §5 dele.

## Limpeza (§C5)

Worktree próprio `.claude/worktrees/jur-c1-drill` (criado a partir de `fb6618b`, `npm ci` próprio) —
removido por `git worktree remove --force` ao fim. Nenhum banco subido: todo o ataque rodou no arnês
HTTP em memória (`CORE_SAAS_PERSISTENCE=memory`), portanto **nenhuma porta aberta** e a base viva
`erp-postgres`/`erp-redis` **não foi tocada, nem lida**. Nada escrito na árvore principal (R2).
