# B-O6R-07c — Plano: escopo por objeto nos subrecursos da OS e no sync mobile

> **Papel:** `planejador-mestre` · **identidade:** `planejador-b-o6r-07c` (nova).
> **Modelo que rodou:** **Opus 5.5 — substituição DECLARADA** (§C7.6-bis, `D-FALLBACK-MODELO-FABLE-OPUS`).
> **Por que o Fable faltou:** não faltou por cota — o dono **reservou o Fable a bloco de dinheiro**
> (memória `feedback-fable-so-em-bloco-de-dinheiro`, 08/10); este bloco é de **PERMISSÃO**, não de dinheiro.
> O frontmatter do `planejador-mestre` continua `fable`; a substituição é do invocador.
> **Ref medida:** worktree `C:/Users/AMP/w-07c`, ramo `fix/o6r07c-subresource-scope`, HEAD = `origin/main` =
> `c1cfdabe12c74b58f8393dbee4f333224c56b303` (medido por `git rev-parse HEAD origin/main`). Toda afirmação
> abaixo sobre código foi medida nessa ref (§A7).
> **Estado:** COMPLETO (gravado seção a seção; Apêndice A reexecutado a partir do próprio texto deste arquivo, com
> as mesmas contagens).

**Resumo (para o orquestrador e o crítico).**
- **Vias:** o gerador acha **61** vias mutantes alcançáveis pelo técnico; **36** estão na propriedade (31
  canônicas), **3** já guardadas pelo 07a, **33 abertas**. O registro tinha **16** (10 + 6 do item 51) — todas
  achadas; **17 novas** (12 canônicas): 7 tipos de vistoria pelo sync (+5 apelidos), o status do **despacho**, 3
  evidências de OS pelo sync e o **upload** da evidência. Fora da propriedade e registradas: 10 de classe R
  (vínculo por referência) e a anomalia `fleet-alerts/run`.
- **Desenho:** porta pública `WorkOrderService.getForMutation` (o predicado do 07a, sem cópia); `ChecklistService.assertRunMutationScope`
  (run → OS → mesmo predicado; run sem OS nega); despacho pelo alvo próprio; evidência pelo `getForMutation`. Sem
  migração. Sync recusa por ação dentro de lote 200, sem recibo — o app mantém a ação (`failed`).
- **Para decidir antes do código:** (1) a **ampliação** do §5.1 (despacho e upload de evidência; sem ela o
  `Ω6R-SEC-002` não fecha); (2) `D-07c-DESPACHO-ALVO`; (3) `D-07c-IDEMP`; (4) a tensão `coordenador-de-acessos` ×
  inelegibilidade (§5.4).
- **Testes:** N = 8 → meta 16; desenho ≥ 60 (35 sondas geradas, 18 semânticos, 6 do guard, ≥ 5 `-db`), 14
  mutações de produto e 6 do guard. **Tamanho G.** Régua: 44 suítes, 430 testes, 0 falha em `c1cfdabe`.

## 0. Objetivo · ator · fluxo

**Objetivo.** Fechar o resíduo do `Ω6R-SEC-002` (`P-O6R-SUBRECURSO-OBJECT-SCOPE`, item 11) e o item 51
(`P-SAN3-CHECKLIST-RUN-SEM-ESCOPO-POR-OBJETO`) **pela propriedade**, não pela lista: todo caminho de escrita que
o técnico de campo alcança sobre uma OS — ou sobre algo que existe **por causa** de uma OS — passa pelo **mesmo**
predicado de escopo por objeto que o `B-O6R-07a` criou. Por ordem do dono (`D-ORDEM-NOITE-2026-10-10`, `agent-orchestration/controle/decisoes.md:3080`), é um dos
passos para destravar a produção (REPROVADA pela J-6R; o `Ω6R-SEC-002` é um dos 4 críticos abertos).

**Ator.** `field_technician` (LEGACY) e `technician` (STANDARD) — os dois papéis que o 07a classifica como
`assigned_only` (`src/modules/work-orders/work-order.types.ts:97-98`). Rótulo de UI: "Técnico de Campo".

**Fluxo origem → destino.** App de campo (Flutter, fila offline) ou console web → `POST/PATCH/DELETE /api/v1/...`
ou `POST /api/v1/mobile/sync/*` → middleware de RBAC (só permissão) → **serviço do agregado** (onde a decisão de
escopo por objeto passa a morar, no ponto único de cada agregado) → repositório tenant-scoped.

**Contrato que muda (e só este).** Técnico **não atribuído** que tenta escrever num subrecurso da OS recebe
**403** `{ error: { code: "WORK_ORDER_NOT_ASSIGNED", reason: "not_assigned_to_actor" } }` — o mesmo corpo que o 07a
já devolve em `PATCH /work-orders/:id` e `PATCH /work-orders/:id/status` (`work-order.service.ts:832-838`).
No sync, a recusa é **por ação**, dentro de um HTTP 200: a ação sai em `rejected[]` com
`error.reason = "not_assigned_to_actor"` (o envelope de lote não vira erro de rede — §3.5). **404 continua sendo do
cross-tenant** (inalterado). Nenhum outro código muda: 409 duplicidade, 422 transição inválida e 400 de corpo
seguem como estão, e o escopo é avaliado **antes** de qualquer parse de corpo ou efeito (mesma posição do 07a,
`work-order.service.ts:851-852`).

**Modelagem.** **Sem migração.** O vínculo run → OS já existe (`ChecklistRun.relatedEntityType/relatedEntityId`,
`src/modules/checklists/checklist.types.ts:102-103`; o despacho grava `relatedEntityType: "work_order"`,
`src/modules/field-dispatch/field-dispatch.service.ts:899`); o vínculo despacho → técnico também
(`FieldDispatch.operatorUserId`); a atribuição da OS é `assigned_operator_id` (07a). Nada de `prisma/**`.


## 1. A propriedade enunciada

> **P-07c.** *Nenhum ator cujo único acesso à OS é por papel de campo escreve em subrecurso de uma OS que não lhe
> está atribuída* — subrecurso = o que mora sob `/work-orders/:workOrderId/**` (anexo, comentário, tag de
> comentário, geocodificação, quilometragem, status, campos), as **vistorias da OS** (`ChecklistRun` com
> `relatedEntityType = "work_order"`), o **despacho da OS** (`FieldDispatch`), as **evidências da OS** pelo sync
> (`evidence.work_order_*`) e **toda ação de sync** que nomeia uma OS ou uma run. A recusa é 403
> `not_assigned_to_actor`; o default de qualquer via **nova** é negar (§4.3).

**Quem conta como "atribuído"** — reuso literal do 07a, sem regra nova:

| sujeito | predicado | fonte |
|---|---|---|
| a OS | `assigned_operator_id` = perfil de operador do ator **ou** = `userId` do ator (dual-match) | `work-order.service.ts:828-832` (07a, ciclo 2) |
| a vistoria | a OS da run (`relatedEntityType = "work_order"` → `relatedEntityId`) satisfaz a linha acima; run **sem** OS vinculada → **nega** (fail-closed, a mesma regra da OS órfã do 07a, `tests/o6r07a-wo-object-scope.test.ts:22-84`, negativo 2) | `checklist.service.ts:346` (a consulta por OS já existe) |
| o despacho | `FieldDispatch.operatorUserId` = `userId` do ator (o despacho tem alvo próprio; ver §3.4 e R3) | `field-dispatch.service.ts:221,379` |
| evidência de OS (sync) | o `work_order_id` do payload satisfaz a linha da OS (hoje o sync nem confere se a OS existe — `mobile-evidence-sync.ts:294-296`) | — |

**Quem cai no escopo e quem passa sempre** — a classificação é a do 07a (`WORK_ORDER_MUTATION_SCOPE`,
`work-order.types.ts:90-104`), resolvida **por união de papéis** (`actorMutatesAssignedOnly`, `:124-129`):

- **escopados (`assigned_only`):** `field_technician`, `technician`. A matriz diz o mesmo:
  `RBAC_MATRIX.md:45` (OS = `execute/update-assigned`), `:44` (execuções de checklist = `answer-assigned`),
  `:66` (*"updates assigned operational flows"*); `docs/03-atores-papeis.md:154` (*"visualizar apenas serviços
  atribuídos"*), `:290` (AUTH-007); `docs/04-regras-negocio.md:83` (RN-MOB-001).
- **passam sempre (`tenant_wide`):** `super_admin`, `platform_admin`, `tenant_admin`, `manager`, `operator`,
  `field_dispatcher` — quem despacha e redistribui trabalho (`RBAC_MATRIX.md:45`: `full`/`create/edit`). Basta
  **um** papel `tenant_wide` para o ator não cair no guard (teste do 07a, `o6r07a-wo-object-scope.test.ts:103-131`).
- **sem mutação de OS (`no_mutation`):** `viewer`, `finance`, `inventory`, `auditor`, `support` — o guard não os
  alcança porque o RBAC já os barra antes (censo §2: `viewer` = 403 `permission_required` em todas as vias de OS).
  **Exceção que o bloco herda e não resolve:** `inventory` × vistoria = `read/answer-by-scope`
  (`RBAC_MATRIX.md:44`) está **negado** por fail-closed desde o `B-SAN3-04a`
  (`P-SAN3-04A-CHECKLIST-ESCOPO-ESTOQUE`, `pendencias.md:9683`, dono este bloco). O escopo de vistoria que este
  bloco cria é **por atribuição da OS**; o "escopo" do Estoque não é atribuição de OS e não tem definição escrita
  em fonte nenhuma (`RBAC_MATRIX.md` não o define; `docs/03-atores-papeis.md` não o define). **Disposição:** a
  pendência **não fecha aqui** — o bloco entrega o mecanismo (predicado por run) e a pendência ganha o append
  "mecanismo pronto; falta a definição do escopo do Estoque — decisão de produto", com dono `fila pós-gate`
  (§6, R6). Conceder `checklist_runs:update` ao `inventory` sem essa definição contrariaria
  `D-SAN3-04A-FAIL-CLOSED-POR-ESCOPO`.

**O que a propriedade NÃO diz (fronteiras declaradas, para o crítico atacar):**
1. **Leitura** não entra: `work_orders:read` segue tenant-wide (decisão do 07a, `work-order.service.ts:799-803`);
   escopo de leitura é do `B-SAN3-13` (item 32, `PLANO_SAN3.md:525-527`).
2. **Registro próprio que só aponta para uma OS** (avaria, abastecimento, despesa, telemetria com `work_order_id`
   no corpo) **não** é subrecurso da OS: o registro tem sujeito próprio (o veículo, o gasto, a posição), a OS não o
   exibe (git grep -il por damage, avaria, fuel, abastec, expense e despesa em `frontend/src/modules/work-orders`
   devolve 0 arquivos) e nenhum dado da OS muda. É **outra propriedade** ("vínculo a OS alheia por referência"),
   censada no §2 (classe R) e registrada como pendência nomeada com dono — não reprova nem fecha nada aqui.
3. **Moderação de comentário** (`D-Ω3F-5-COMMENT`): dentro da OS **atribuída**, a regra "autor OU
   `work_orders:update`" (`work-order-comment.service.ts:139-145`) fica **intacta** — este bloco põe o escopo da
   OS **antes** dela, não a reescreve. Os papéis de escritório (`tenant_wide`) seguem moderando em qualquer OS.
   Confirmação da hipótese do `PLANO_SAN3.md:529-531`: o guard do 07a escopa **só** `assigned_only`
   (`work-order.service.ts:812`), logo `manager`/`operator`/`field_dispatcher`/`tenant_admin` não são tocados —
   **confirmada no código**, e o teste C-MOD (§4) a prova por execução.


## 2. Enumeração GERADA das vias

**Método — dois geradores, ambos sobre o código real de `c1cfdabe`, nenhum com lista digitada** (texto integral
no Apêndice A; reexecutáveis por quem quiser conferir — P3):

1. **`census.mts` (rotas).** Monta o app **real** (`createApp` de `src/app.ts`, modo `memory`, sem
   `DATABASE_URL`/`REDIS_URL`), percorre a pilha de roteadores do Express 5 (`app.router.stack`, inclusive os
   12 roteadores **aninhados**, cuja montagem é resolvida pelo matcher real contra os literais `"/x"` lidos de
   `src/**`) e **sonda por HTTP** cada rota mutante (POST/PUT/PATCH/DELETE) como `field_technician`, `technician`
   e `viewer` (controle), com corpo `{}` e ids aleatórios. **"Alcança"** = a resposta **não** é 401 nem 403
   `permission_required|role_required|tenant_required|platform_permission_required` — o portão de RBAC deixou
   passar; 400/404/422/200 já são o serviço respondendo.
2. **`census-sync.mts` (ações de sync).** Endpoints = toda rota `POST /mobile/sync/*` **montada** (lida do mesmo
   `createApp`); tipos = **todo** literal `"dominio.acao"` de **todo** `.ts` não-teste de `src/modules` (758
   arquivos, 335 literais). Cada tipo é enviado a cada endpoint, nos dois papéis de campo, e o resultado da
   **ação** é lido do lote. "Alcança" = não é `permission_required` nem `unsupported_action*`.
3. **`classify.cjs`** cruza as duas saídas com regras de classe por prefixo/tipo; o que nenhuma regra cobre sai
   `NAO-CLASSIFICADA` (contou **0**). A coluna "registro" vem do texto de `pendencias.md:6707-6800` (vias 1–10)
   e `pendencias.md:9350-9360` (item 51 + emenda).

**Comandos e saídas (cwd = `C:/Users/AMP/w-07c`, HEAD `c1cfdabe`, Node v20.19.5, `npm ci` próprio + `prisma
generate` com URL fictícia na porta 1):**

```
node --import tsx census.mts census-out.json
  → rotas montadas: 409 | routers aninhados: 12 | mutantes: 223 | mutantes que field_technician OU technician alcançam: 42
node --import tsx census-sync.mts census-sync-out.json
  → endpoints de sync montados: 5 | arquivos .ts lidos: 758 | literais: 335 | pares endpoint×tipo: 1675 | alcançados: 23
node classify.cjs census-out.json census-sync-out.json
  → CONTAGEM POR CLASSE: OS=13 · VISTORIA=18 · DESPACHO=1 · EVIDENCIA-OS=4 · R=10 · N=15 · NAO-CLASSIFICADA=0 · total=61
  → NA PROPRIEDADE: 36 (guardadas pelo 07a: 3 · abertas: 33 · registradas: 16 · NOVAS: 17)
  → REGISTRADAS QUE O CENSO NAO ACHOU: nenhuma
```

O total 61 = 42 rotas − 4 envelopes de lote de sync (desdobrados por tipo de ação) + 23 pares de sync. As 18 de
VISTORIA incluem **5 apelidos** de tipo de ação (`checklist_acknowledgement.create`, `checklist_attachment.attach`,
`checklist_divergence.create`, `checklist_marker.create`, `checklist_run.complete`), mapeados para o mesmo tipo
canônico por `ACTION_TYPE_ALIASES` (`src/modules/mobile/mobile-checklist-sync.ts:50-65`). **Em vias canônicas:
31 na propriedade, 3 guardadas pelo 07a, 28 abertas, 16 registradas, 12 novas.** Os apelidos ficam na tabela e
no guard mesmo assim: são entradas distintas que o app pode mandar, e cada uma tem de nascer negada.

**Classes:**
- **OS** — mora sob `/work-orders/:workOrderId/**` ou é ação `work_order.*` do sync.
- **VISTORIA** — `/mobile/checklist-runs/:runId/**` ou ação `checklist*` do sync; a run pertence à OS por
  `relatedEntityId`.
- **DESPACHO** — `/operations/dispatches/:dispatchId/**` (o despacho é a OS enviada a um técnico).
- **EVIDENCIA-OS** — `evidence.work_order_*` do sync e o upload binário que depende do recibo dele.
- **R** — registro **próprio** do técnico que aceita `work_order_id` **por referência** no corpo (fora da
  propriedade — §1, fronteira 2).
- **N** — não toca OS (sessão, inbox própria, posição própria, entidades de frota, evidência de campo).

### 2.1 A tabela gerada (61 linhas, sem edição manual)

| # | via (método + caminho, ou endpoint · tipo de ação) | classe | field_technician | technician | registro | estado hoje |
|---|---|---|---|---|---|---|
| 1 | `PATCH /work-orders/:workOrderId` | OS | 404:not_found | 404:not_found |  | guardada pelo 07a |
| 2 | `PATCH /work-orders/:workOrderId/status` | OS | 404:not_found | 404:not_found |  | guardada pelo 07a |
| 3 | `POST /work-orders/:workOrderId/attachments` | OS | 400:multipart_required | 400:multipart_required | 1 | **ABERTA** |
| 4 | `DELETE /work-orders/:workOrderId/attachments/:attachmentId` | OS | 404:work_order_not_found | 404:work_order_not_found | 2 | **ABERTA** |
| 5 | `POST /work-orders/:workOrderId/geocode` | OS | 404:not_found | 404:not_found | 8 | **ABERTA** |
| 6 | `POST /work-orders/:workOrderId/geocode-destination` | OS | 404:not_found | 404:not_found | 9 | **ABERTA** |
| 7 | `POST /work-orders/:workOrderId/comments` | OS | 404:not_found | 404:not_found | 3 | **ABERTA** |
| 8 | `PATCH /work-orders/:workOrderId/comments/:commentId` | OS | 404:not_found | 404:not_found | 4 | **ABERTA** |
| 9 | `DELETE /work-orders/:workOrderId/comments/:commentId` | OS | 404:not_found | 404:not_found | 5 | **ABERTA** |
| 10 | `POST /work-orders/:workOrderId/comments/:commentId/tags/:tagId` | OS | 404:not_found | 404:not_found | 6 | **ABERTA** |
| 11 | `DELETE /work-orders/:workOrderId/comments/:commentId/tags/:tagId` | OS | 404:not_found | 404:not_found | 7 | **ABERTA** |
| 12 | `/mobile/sync/work-order-actions` · `work_order.mileage` | OS | rejected:not_found | rejected:not_found | 10 | **ABERTA** |
| 13 | `/mobile/sync/work-order-actions` · `work_order.status_change` | OS | rejected:not_found | rejected:not_found |  | guardada pelo 07a |
| 14 | `PATCH /mobile/checklist-runs/:runId` | VISTORIA | 404:checklist_run_not_found | 404:checklist_run_not_found | 51a | **ABERTA** |
| 15 | `POST /mobile/checklist-runs/:runId/attachments` | VISTORIA | 400:invalid_request | 400:invalid_request | 51d | **ABERTA** |
| 16 | `POST /mobile/checklist-runs/:runId/markers` | VISTORIA | 400:invalid_request | 400:invalid_request | 51e | **ABERTA** |
| 17 | `POST /mobile/checklist-runs/:runId/complete` | VISTORIA | 404:checklist_run_not_found | 404:checklist_run_not_found | 51b | **ABERTA** |
| 18 | `POST /mobile/checklist-runs/:runId/divergence` | VISTORIA | 400:invalid_request | 400:invalid_request | 51f | **ABERTA** |
| 19 | `POST /mobile/checklist-runs/:runId/acknowledgement` | VISTORIA | 400:invalid_request | 400:invalid_request | 51c | **ABERTA** |
| 20 | `/mobile/sync/checklist-actions` · `checklist.acknowledgement_create` | VISTORIA | rejected:checklist_run_not_found | rejected:checklist_run_not_found |  | **ABERTA** |
| 21 | `/mobile/sync/checklist-actions` · `checklist.attachment_attach` | VISTORIA | rejected:checklist_run_not_found | rejected:checklist_run_not_found |  | **ABERTA** |
| 22 | `/mobile/sync/checklist-actions` · `checklist.complete` | VISTORIA | rejected:checklist_run_not_found | rejected:checklist_run_not_found |  | **ABERTA** |
| 23 | `/mobile/sync/checklist-actions` · `checklist.divergence_create` | VISTORIA | rejected:checklist_run_not_found | rejected:checklist_run_not_found |  | **ABERTA** |
| 24 | `/mobile/sync/checklist-actions` · `checklist.item_answer` | VISTORIA | rejected:checklist_run_not_found | rejected:checklist_run_not_found |  | **ABERTA** |
| 25 | `/mobile/sync/checklist-actions` · `checklist.item_note` | VISTORIA | rejected:checklist_run_not_found | rejected:checklist_run_not_found |  | **ABERTA** |
| 26 | `/mobile/sync/checklist-actions` · `checklist.marker_create` | VISTORIA | rejected:checklist_run_not_found | rejected:checklist_run_not_found |  | **ABERTA** |
| 27 | `/mobile/sync/checklist-actions` · `checklist_acknowledgement.create` | VISTORIA | rejected:checklist_run_not_found | rejected:checklist_run_not_found |  | **ABERTA** |
| 28 | `/mobile/sync/checklist-actions` · `checklist_attachment.attach` | VISTORIA | rejected:checklist_run_not_found | rejected:checklist_run_not_found |  | **ABERTA** |
| 29 | `/mobile/sync/checklist-actions` · `checklist_divergence.create` | VISTORIA | rejected:checklist_run_not_found | rejected:checklist_run_not_found |  | **ABERTA** |
| 30 | `/mobile/sync/checklist-actions` · `checklist_marker.create` | VISTORIA | rejected:checklist_run_not_found | rejected:checklist_run_not_found |  | **ABERTA** |
| 31 | `/mobile/sync/checklist-actions` · `checklist_run.complete` | VISTORIA | rejected:checklist_run_not_found | rejected:checklist_run_not_found |  | **ABERTA** |
| 32 | `PATCH /operations/dispatches/:dispatchId/status` | DESPACHO | 404:not_found | 403:permission_required |  | **ABERTA** |
| 33 | `POST /mobile/evidence-uploads` | EVIDENCIA-OS | 400:invalid_content_type | 400:invalid_content_type |  | **ABERTA** |
| 34 | `/mobile/sync/evidence-actions` · `evidence.work_order_observation` | EVIDENCIA-OS | accepted:accepted | accepted:accepted |  | **ABERTA** |
| 35 | `/mobile/sync/evidence-actions` · `evidence.work_order_photo` | EVIDENCIA-OS | rejected:required_field | rejected:required_field |  | **ABERTA** |
| 36 | `/mobile/sync/evidence-actions` · `evidence.work_order_signature` | EVIDENCIA-OS | rejected:required_field | rejected:required_field |  | **ABERTA** |
| 37 | `POST /mobile/telemetry` | R | 422:operator_profile_required | 422:operator_profile_required |  | fora da propriedade |
| 38 | `POST /fuel-logs` | R | 400:required_field | 403:permission_required |  | fora da propriedade |
| 39 | `PATCH /fuel-logs/:fuelLogId` | R | 404:not_found | 403:permission_required |  | fora da propriedade |
| 40 | `POST /damages` | R | 400:required_field | 400:required_field |  | fora da propriedade |
| 41 | `POST /expense-reports` | R | 403:permission_required | 400:required_field |  | fora da propriedade |
| 42 | `PATCH /expense-reports/:reportId` | R | 403:permission_required | 404:not_found |  | fora da propriedade |
| 43 | `POST /expense-reports/:reportId/items` | R | 403:permission_required | 404:not_found |  | fora da propriedade |
| 44 | `/mobile/sync/expense-actions` · `expense_item.create` | R | 403:permission_required | 400:required_field |  | fora da propriedade |
| 45 | `/mobile/sync/expense-actions` · `expense_report.create` | R | 403:permission_required | 400:required_field |  | fora da propriedade |
| 46 | `/mobile/sync/expense-actions` · `expense_report.submit` | R | 403:permission_required | 400:required_field |  | fora da propriedade |
| 47 | `POST /auth/login` | N | 400 | 400 |  | fora da propriedade |
| 48 | `POST /auth/refresh` | N | 400 | 400 |  | fora da propriedade |
| 49 | `POST /auth/logout` | N | 200 | 200 |  | fora da propriedade |
| 50 | `POST /notifications/fleet-alerts/run` | N | 200 | 200 |  | fora da propriedade |
| 51 | `POST /notifications/:notificationId/read` | N | 404:notification_not_found | 404:notification_not_found |  | fora da propriedade |
| 52 | `POST /notifications/read-all` | N | 200 | 200 |  | fora da propriedade |
| 53 | `POST /notifications/:notificationId/archive` | N | 404:notification_not_found | 404:notification_not_found |  | fora da propriedade |
| 54 | `POST /mobile/field-locations` | N | 400:invalid_number | 400:invalid_number |  | fora da propriedade |
| 55 | `POST /damages/:damageId/attachments` | N | 400:multipart_required | 400:multipart_required |  | fora da propriedade |
| 56 | `POST /attachments` | N | 400:multipart_required | 400:multipart_required |  | fora da propriedade |
| 57 | `DELETE /attachments/:attachmentId` | N | 404:attachment_not_found | 404:attachment_not_found |  | fora da propriedade |
| 58 | `POST /expense-reports/:reportId/submit` | N | 403:permission_required | 404:not_found |  | fora da propriedade |
| 59 | `/mobile/sync/evidence-actions` · `evidence.field_observation` | N | accepted:accepted | accepted:accepted |  | fora da propriedade |
| 60 | `/mobile/sync/evidence-actions` · `evidence.field_photo` | N | rejected:required_field | rejected:required_field |  | fora da propriedade |
| 61 | `/mobile/sync/evidence-actions` · `evidence.field_signature` | N | rejected:required_field | rejected:required_field |  | fora da propriedade |

CONTAGEM POR CLASSE: OS=13 · VISTORIA=18 · DESPACHO=1 · EVIDENCIA-OS=4 · R=10 · N=15 · NAO-CLASSIFICADA=0 · total=61
NA PROPRIEDADE: 36 (guardadas pelo 07a: 3 · abertas: 33 · registradas: 16 · NOVAS (abertas e fora do registro): 17)
REGISTRADAS QUE O CENSO NAO ACHOU: nenhuma

### 2.2 Gerado × registrado — **há mais, e são 12 vias canônicas novas**

| conjunto | vias | onde |
|---|---|---|
| registradas, abertas | **16**: as 10 da `P-O6R-SUBRECURSO-OBJECT-SCOPE` (tabela, col. "registro" 1–10) + as 6 do item 51 com a emenda (51a–51f) | linhas 3–12 e 14–19 |
| guardadas pelo 07a | **3**: `PATCH /work-orders/:id`, `PATCH /work-orders/:id/status`, sync `work_order.status_change` (o 07a guardou `changeStatus`, que o sync chama — `work-order.service.ts:1313-1319`) | linhas 1, 2, 13 |
| **NOVAS** (abertas, fora do registro) | **12 canônicas / 17 entradas**: | |
| · vistoria pelo **sync** | 7 tipos canônicos (`item_answer`, `item_note`, `marker_create`, `divergence_create`, `acknowledgement_create`, `attachment_attach`, `complete`) + 5 apelidos — chamam os **mesmos** métodos do `ChecklistService` que as rotas do item 51 (`mobile-checklist-sync.ts:425-443,453-474,497-515,535-552,575-583,616-625`) | linhas 20–31 |
| · **despacho** | `PATCH /operations/dispatches/:dispatchId/status` — `changeStatus` não confere o alvo do despacho (`field-dispatch.service.ts:486-497`); alcançável só pelo `field_technician` (`field_dispatch:update`, `catalog.ts:950`); o app Flutter **não** chama esta rota (`git grep "operations/dispatches" -- mobile/flutter_app/lib` → 0) | linha 32 |
| · **evidência de OS pelo sync** | `evidence.work_order_observation/_photo/_signature` — exige só `work_orders:update` e **nem confere se a OS existe** (`mobile-evidence-sync.ts:279-296`); sonda: `accepted` com `work_order_id` aleatório | linhas 34–36 |
| · **upload da evidência** | `POST /mobile/evidence-uploads` — grava o binário de uma evidência de OS a partir do recibo do sync (`mobile-evidence-upload.ts:104-116`) | linha 33 |

**Nenhuma registrada ficou de fora do gerado** (`REGISTRADAS QUE O CENSO NAO ACHOU: nenhuma`). A fronteira do
`PLANO_SAN3.md:254` já previa as duas primeiras famílias novas ("`mobile-evidence-sync.ts` e
`mobile-checklist-sync.ts` (vias que o censo vai achar — C2-08)"); **o despacho e o upload de evidência estão
fora dela** — tratamento no §5.1.

**Por que o despacho é subrecurso da OS e não registro próprio:** o `FieldDispatch` só existe para uma OS
(`workOrderId` obrigatório, `field-dispatch.service.ts:221-225` + o evento leva `work_order_id`, `:529-533`),
e mudar o status dele escreve na **linha do tempo da OS** (`createEvent` com `workOrderId`, `:511-520`).

### 2.3 Fora da propriedade, mas medido — vira registro, não conserto

**Classe R (10 entradas, 8 rotas/ações distintas por papel):** `POST /damages` (`work_order_id` validado só
por existência no tenant, `damage.service.ts:116-118,446-455`), `POST`/`PATCH /fuel-logs` (`fuel-log.service.ts:170,234`),
`POST`/`PATCH /expense-reports`, `POST /expense-reports/:id/items` e as 3 ações `expense_*` do sync (só
`technician`; `expense-management.service.ts:108,228`), `POST /mobile/telemetry` (`telemetry.validators.ts:95-96`).
O técnico **cria o próprio registro** apontando para uma OS que não é dele; a OS não muda e não o exibe.
→ **pendência nova** `P-O6R-07C-VINCULO-A-OS-ALHEIA-POR-REFERENCIA` (MÉDIA, `pre-existente`, dono:
`fila pós-gate`, a nomear pelo estrategista), com N=10, forma "sonda HTTP passa o RBAC" e causa "o `work_order_id`
do corpo não passa pelo escopo da OS". **Não reprova nem fecha nada aqui** e **não segura o `Ω6R-SEC-002`**: o
achado do SEC-002 é "o técnico muta a OS alheia" (`docs/revisoes/O6R/achados.jsonl`, linha do SEC-002) e nenhuma
dessas vias muta a OS. Junto, como **hipótese a medir** (não fato): o `PATCH /fuel-logs/:id` do `field_technician`
alcança registro de abastecimento de **qualquer** veículo (só sondado com id aleatório → 404; efeito não medido).

**Classe N com uma anomalia:** `POST /notifications/fleet-alerts/run` responde **200** ao `field_technician` e ao
`technician` (sonda), e dispara a varredura de alertas de frota da **organização inteira** com fan-out a
destinatários (`notification.controller.ts:76-99`), sob `notifications:update` — que o `RBAC_MATRIX.md:86` diz ser
da **própria caixa**. Origem `f47062ba` (2026-07-09, #152). → **pendência nova**
`P-O6R-07C-FLEET-ALERTS-RUN-PELO-CAMPO` (MÉDIA, `pre-existente`, dono `fila pós-gate`). Fora da propriedade
(não é OS); registrada porque o censo a mediu e calar seria escolher um lado em silêncio (§A2).

**Dono órfão herdado (`PLANO_SAN3.md:400-401`):** `P-O6R-B01-RELIGACAO-SEM-REMEDIO` (`pendencias.md:3850`) é
via de saída de **religação de identidade** entre organizações — superfície de `auth`/`identity-links`, que o
censo mostra **fora** do alcance do técnico (`/auth/identity-links*` = 401 `jwt_required`) e sem relação com
escopo por objeto de OS. **Não cabe no 07c** (mexer em `src/modules/auth/**` alargaria a fronteira de um bloco de
permissão para identidade, que tem junta própria). → ganha **bloco próprio pós-gate** (`B-AUTH-RELIGACAO-SAIDA`, a
nomear pelo estrategista); o 07c apenas apensa essa disposição à entrada.


## 3. Desenho

**Princípio:** **um** predicado (o do 07a), **um** ponto de decisão por agregado, chamado por **toda** entrada
desse agregado (rota REST e ação de sync). Nada é duplicado: a classificação de papéis
(`WORK_ORDER_MUTATION_SCOPE` + `actorMutatesAssignedOnly`, `work-order.types.ts:90-129`) e a comparação de
atribuição (`assertMutationObjectScope`, `work-order.service.ts:808-840`) continuam onde estão e passam a ser
**consumidas** por quem hoje as ignora. **Sem migração** (§0). `work-order.types.ts` fica **intocado** (§5).

### 3.1 OS — `WorkOrderService` ganha a porta pública

`work-order.service.ts`:
- **novo** `async getForMutation(actor, workOrderId): Promise<WorkOrder>` = `this.get(actor, workOrderId)` (404
  cross-tenant, inalterado) → `this.assertMutationObjectScope(actor, workOrder)` → devolve a OS. É a **única**
  porta pública do predicado; o corpo do método privado do 07a não muda.
- `setMileage` (`:1247`): logo após o `this.get` (`:1253`), antes de qualquer parse → fecha a **via 10** (o sync
  `work_order.mileage` chama este método, `mobile-work-order-sync.ts:245-256`, que **não** muda).
- `geocodeById` (`:194`) e `geocodeDestinationById` (`:283`): depois do `findById` (404) e **antes** do 409
  `already_geocoded` → fecham as **vias 8 e 9**.
- `update` e `changeStatus` **não mudam** (o 07a já os guarda).

### 3.2 Anexo e comentário da OS — trocam `get` por `getForMutation` nos caminhos de escrita

- `work-order-attachment.service.ts`: `createUploadedAttachment` e `deleteAttachment` resolvem a OS por
  `getForMutation` (listar e baixar seguem em `get`); expõe `assertCanMutate(actor, workOrderId)` (=
  `getForMutation`, conversão 404 → `work_order_not_found` preservada). `work-order-attachment.controller.ts`:
  `createAttachment` chama `assertCanMutate` **antes** do teste de multipart (`:35`) e do parse (`:40`) — o servidor
  não lê nem verifica bytes de quem não pode gravar → **vias 1 e 2**.
- `work-order-comment.service.ts`: `addComment`, `editComment`, `deleteComment`, `attachTag`, `detachTag` resolvem
  a OS por um `assertWorkOrderForMutation` (= `workOrderService.getForMutation` com a mesma conversão 404 →
  `commentNotFoundError` do `assertWorkOrder` atual, `:117-126`); o 403 do escopo **atravessa** sem conversão. A
  checagem vem **antes** de `parseComment` e da busca do comentário — e antes de `assertCanMutate` (`:139-145`),
  que **fica intacto** (`D-Ω3F-5-COMMENT`). `listComments` segue em `get` → **vias 3–7**.

### 3.3 Vistoria — `ChecklistService.assertRunMutationScope`

`checklist.service.ts`:
- `ActorContext` (`:49-52`) ganha `roles?: readonly string[]` (o controller já passa o `tenantContext` inteiro,
  `checklist.controller.ts:338`; o sync passa o `AuthenticatedActor`). Ausente → tratado como `[]` → **não**
  escopado, que é a regra do 07a para composição interna sem papel (`work-order.types.ts:118-123`); o HTTP nunca
  chega com `roles: []` (o middleware recusa com `role_required`).
- **novo** `async assertRunMutationScope(actor, runOrId)`: se `!actorMutatesAssignedOnly(actor)` → retorna (sem
  I/O). Senão: `getRun` (404 tenant-scoped primeiro) → se `relatedEntityType === "work_order"` e há
  `relatedEntityId` → `await this.scope.assertWorkOrderMutation(actor, relatedEntityId)`; **senão** →
  `ChecklistError(403, "WORK_ORDER_NOT_ASSIGNED", "not_assigned_to_actor")` (run sem OS = nega, fail-closed). Sem
  `scope` injetado → a mesma recusa (composição incompleta nunca vira permissão — idioma do 07a,
  `work-order.service.ts:805-806`).
- `scope` entra pelo **construtor** (segundo parâmetro, opcional); `createMemoryChecklistService` e
  `createDefaultChecklistService` (`:828-851`) compõem com import **dinâmico** de `work-order.service.js` →
  `getForMutation` (idioma dos resolvers vizinhos; sem ciclo de carga: `work-order.service.ts` só importa **tipos**
  de `checklists/`, `:77`).
- Chamado no **início** de `updateRun`, `createAttachment`, `createUploadedAttachment`, `createMarker`,
  `completeRun`, `registerDivergence`, `acknowledgeRun` (as 7 alcançáveis) **e** de `reopenRun` e `createRun` (hoje
  fora do alcance do técnico por permissão; guardados para que uma concessão futura não abra a via — `createRun`
  usa o `relatedEntity*` do input).
- `checklist.controller.ts`: `updateChecklistRun` (`:181`), `createChecklistAttachment` (`:194`, nos **dois**
  ramos), `createChecklistMarker` (`:239`), `completeChecklistRun` (`:255`), `registerChecklistDivergence` (`:305`),
  `acknowledgeChecklistRun` (`:318`) chamam `service.assertRunMutationScope(actor, runId)` **antes** de ler o corpo.
  A dupla checagem (controller + serviço) é deliberada: o controller garante a ordem "escopo antes do parse"; o
  serviço é o ponto único que o sync também atravessa. Só o ator `assigned_only` paga o I/O extra.
- `mobile-checklist-sync.ts`: **nenhuma** chamada nova nos handlers que escrevem (eles chamam os métodos acima);
  **uma** em `handleAttachmentAttach` (`:570-583`), que não escreve mas **promete** o endpoint de upload — mesma
  lógica da trava de vistoria concluída já posta ali (`:577-583`): não prometer o que o upload vai recusar.
  **Decisão D-07c-IDEMP:** a detecção de `already_applied` dos handlers (que lê e não escreve) **fica antes** do
  escopo, de propósito: ação aplicada quando o técnico **era** atribuído e reenviada depois da redistribuição
  responde `already_applied`, não `rejected` — recusar o que já está no banco faria o app repetir para sempre uma
  ação cumprida. → **vias 14–31** (6 REST + 12 entradas de sync).

### 3.4 Despacho — `FieldDispatchService.changeStatus`

`field-dispatch.service.ts:486`: logo após `this.get` (`:487`) e antes de `parseFieldDispatchStatus` (`:488`): se
`actorMutatesAssignedOnly(actor)` e `current.operatorUserId` difere de `actor.userId` → `FieldDispatchError(403,
"FIELD_DISPATCH_NOT_ASSIGNED", "not_assigned_to_actor")`. **"Atribuído" aqui é o alvo do despacho**
(`operatorUserId`), não o `assigned_operator_id` da OS: o despacho tem alvo próprio e **não** sincroniza a
atribuição da OS (`git grep -nF ".assign(" -- src/modules/field-dispatch` → 0 linhas), então exigir a atribuição
da OS travaria o técnico no **próprio** despacho — a classe do `C1-A4` do 07a. O predicado de **papel** é o do
07a (reuso); a comparação de dono é uma igualdade. Nada mais do módulo muda → **via 32**.

### 3.5 Evidência de OS — sync e upload

- `mobile-evidence-sync.ts`: `syncMobileEvidenceActions` (`:95`, já `async`) ganha o parâmetro `resolveService`
  (default `createDefaultWorkOrderService`, idioma de `mobile-work-order-sync.ts:67-71`); `processAction` (`:244`)
  vira `async` e o laço passa a `await` (`:123`). Para escopo `work_order`, na ordem: permissão →
  `assertSafePayload` → lê `payload.work_order_id` (ausente → o 400 `required_field` de hoje) →
  `await service.getForMutation(actor, id)` → só então `validateAndNormalizeMetadata`. **Contrato que muda para
  todos os papéis, declarado:** OS inexistente ou de outra organização deixa de ser `accepted` e passa a `rejected`
  `not_found` (hoje o sync aceita qualquer string — sonda, §2.1 linha 34). Escopo `field` intocado.
- `mobile-evidence-upload.ts`: depois do recibo (`:104-111`) e do 409 `work_order_mismatch` (`:113-116`), se
  `receipt.workOrderId` → `getForMutation` → 403/404. Recibo concedido quando o técnico **era** atribuído não vira
  passe livre depois da redistribuição. O app preserva o blob em todo status diferente de `stored` (B-108,
  `CLAUDE.md` §6) → o 403 **não perde** a foto → **vias 33–36**.

### 3.6 O sync recusa sem perder a ação (invariante do B-108) — medido no app, sem tocar no app

- Os três syncs envolvidos capturam o erro **por ação** e devolvem lote 200 (`try/catch` → `actionErrorResult`:
  `mobile-work-order-sync.ts:207-275,302-352`; `mobile-checklist-sync.ts:345-376`; `mobile-evidence-sync.ts:244-277,362`),
  e o erro de escopo é reconhecido por forma (`statusCode`, `code`, `reason` — `mobile-checklist-sync.ts:1030-1040`)
  → sai em `rejected[]` com `error.reason = "not_assigned_to_actor"`.
- **Recibo só de `accepted`/`already_applied`** (`mobile-checklist-sync.ts:225-240`; `mobile-work-order-sync.ts:99-106`;
  `mobile-evidence-sync.ts:125-126`) → a ação recusada **não** envenena o replay: redistribuída a OS ao técnico, o
  mesmo `client_action_id` é aceito.
- **No app** (só leitura; `mobile/**` é PROIBIDO): `rejected` → `failed` (`sync_replay_service.dart:507`); `failed`
  mantém a ação **na fila** com `lastErrorCode` = o `reason` e `retryCount + 1` (`sync_replay_service.dart:763-768`;
  `pendingForTenant` inclui `failed`, `sync_queue_repository.dart:36-46`). A ação **não** é descartada; a dívida de
  UX (não perda de dado) está no R5.

### 3.7 Avaliado e **rejeitado** (para o crítico não precisar redescobrir)

- **Guard automático por `router.param`** nos parâmetros `workOrderId`, `runId` e `dispatchId` — faria toda rota
  nova nascer negada em tempo de execução, mas o `param` roda **antes** do `requirePermission` da rota: o técnico
  sem permissão passaria a receber `not_assigned_to_actor` em vez de `permission_required` (quebra asserções vivas,
  ex.: `tests/work-order-mileage.test.ts`, que espera `permission_required` do técnico no `PATCH /mileage`) e o
  evento de auditoria `permission.denied` (`rbac.middleware.ts:56-74`) deixaria de ser gravado. A garantia "via
  nova nasce negada" fica no **guard de CI** (§4.3), que falha antes do merge.
- **Escopo nos repositórios** (filtro por `assigned_operator_id` na consulta): espalharia o predicado por N
  consultas e o devolveria como 404 — contrário ao contrato do 07a (403; a OS existe e é legível,
  `work-order.service.ts:799-803`).
- **Mexer em `WORK_ORDER_MUTATION_SCOPE`** para incluir ou excluir papéis: fora do mandato; a classificação é do 07a.


## 4. Testes de encerramento + mutações

**Baseline medido (N).** Em `c1cfdabe`, as 44 suítes não-`-db` que exercem as vias tocadas (lista gerada por
`git grep` dos caminhos/handlers do §2 sobre `tests/` + as de nome `mobile|evidence|dispatch|checklist|comment|
mileage|geocod|o6r07a-wo`) rodaram com `CORE_SAAS_PERSISTENCE=memory`, sem `DATABASE_URL`:
`node --test --import tsx --test-reporter=tap <44 arquivos>` → **`# tests 430 · pass 427 · fail 0 · skipped 3`**
(os 3 são auto-pulos **declarados** de suítes que exigem banco: `impound-checklist-link-autolink`,
`impound-process-checklist-link-schema`, `o6r06-usage-fault-injection`), ec=0, 32 s. É a **régua de regressão**
do bloco. Testes que hoje provam a propriedade: os **8** de `tests/o6r07a-wo-object-scope.test.ts` → **N = 8**,
**meta M ≥ 2N = 16** testes novos; o desenho abaixo dá **≥ 60** (35 gerados + 18 semânticos + 6 do guard +
≥ 5 `-db`). A suíte inteira (`npm test`) é medida pelo dev em cluster descartável **antes** de codar, na forma
canônica (`DATABASE_URL`/`REDIS_URL` do cluster dele, `CORE_SAAS_PERSISTENCE` não exportada), e publicada com N
e forma.

**Arquivos novos de teste (nomes fixos):**
- `tests/helpers/o6r07c-census.ts` — o gerador do §2 (o mesmo algoritmo do Apêndice A), exportado para os dois
  arquivos abaixo. **Não** há lista digitada de vias.
- `tests/o6r07c-subresource-scope.test.ts` — sondas geradas + semânticos (§4.1, §4.2).
- `tests/o6r07c-census-guard.test.ts` — o guard de exaustividade (§4.3).
- `tests/o6r07c-subresource-scope-db.test.ts` — o caminho Prisma (§4.4).

**Vermelho-controle:** todo teste de **recusa** abaixo é rodado pelo dev em `c1cfdabe` (antes do conserto) e
tem de sair **vermelho**, com a saída gravada na evidência do dev. Exceções esperadas e declaradas: as 3 vias
já guardadas pelo 07a (§2.1 linhas 1, 2, 13) saem **verdes** no head-base, e os testes **positivos** (que provam
que o guard não é "nega tudo") também — não são critério de fechamento, são controle.

### 4.1 Uma sonda por via, gerada da enumeração (`o6r07c-subresource-scope.test.ts`, bloco G)

Arnês: `createApp` real em memória (idioma de `tests/o6r07a-wo-object-scope.test.ts:360-419`), organização A com
`managerA`, `tecnicoA` e `tecnicoB` (UUID cru + perfil de operador cada) e organização B com `tecnicoB2`;
**semeados**: OS `osA` atribuída ao perfil do `tecnicoA`; modelo de checklist publicado com 1 componente e run
`runA` com `relatedEntityType = "work_order"`, `relatedEntityId = osA`; run `runOrfa` **sem** OS; despacho
`dispA` de `osA` com alvo `tecnicoA` (o `tecnicoA` precisa existir no core com papel de campo —
`field-dispatch.service.ts:818-835`).

Para **cada** via da propriedade devolvida pelo gerador (36 entradas hoje, 35 no laço — a exceção é o upload; nenhuma digitada), o laço cria um
`test()` com o nome da via e faz **três** chamadas, substituindo `:workOrderId → osA`, `:runId → runA`,
`:dispatchId → dispA` e os demais parâmetros por UUID aleatório:

| ator | REST (corpo `{}`) | ação de sync (payload-superconjunto¹) | o que prova |
|---|---|---|---|
| `tecnicoB` (mesmo papel da via, **não** atribuído) | **403** e `error.reason === "not_assigned_to_actor"` | a ação em `rejected[]` com `error.reason === "not_assigned_to_actor"`; lote **200** | **G-NEG** — a propriedade |
| `tecnicoA` (atribuído) | **não** é `not_assigned_to_actor` (400/404/409/422/2xx do domínio) | idem, fora de `rejected` por escopo | **G-POS** — não é "nega tudo" |
| `managerA` (`tenant_wide`) | **não** é `not_assigned_to_actor` | idem | **G-WIDE** — gestão intocada |

¹ `{ work_order_id: osA, run_id: runA, component_id: <componente de runA>, value: "x", note: "x",
observation: "x", message: "x", file_name: "x.jpg", status: "accepted", mileage_start: 1 }` — os campos que os
handlers exigem (`mobile-checklist-sync.ts:427,464,508-512,544-547,587`; `mobile-work-order-sync.ts:245-256`;
`mobile-evidence-sync.ts:294-296`). Tipo de sync **novo** cujo handler exija campo fora do superconjunto sai
`rejected` por `required_field` no `tecnicoB` → **vermelho** (o guard, §4.3, nomeia a causa).

**Exceções explícitas do laço (com teste dedicado no §4.2):** `POST /mobile/evidence-uploads` (exige multipart +
recibo do sync — teste E-UP); e o papel `technician` nas vias que só o `field_technician` alcança (o despacho:
`technician` = 403 `permission_required`, §2.1 linha 32).

**Ordem "escopo antes do parse" — consequência que o laço prova:** nas vias REST, o `tecnicoB` recebe 403 com
corpo `{}`, o que só acontece se o escopo vier antes da validação do corpo e do teste de multipart (§3.2, §3.3).
Nas ações de **sync** a ordem é outra, de propósito (D-07c-IDEMP): resolver a run (404) → parse → `already_applied`?
→ escopo → escrita — por isso o payload-superconjunto.

### 4.2 Testes semânticos (`o6r07c-subresource-scope.test.ts`, bloco S) — cada um vermelho no head-base

| id | cenário | asserção de encerramento |
|---|---|---|
| S-ANX | `tecnicoB` apaga anexo da `osA` (anexo enviado pelo `tecnicoA`) | 403 `not_assigned_to_actor` **e** o download do anexo pelo `managerA` segue **200** (a recusa não deixou efeito; antes: 204 e 200→404, `pendencias.md:6729-6730`) |
| S-KM | `tecnicoB` manda `work_order.mileage` da `osA` pelo sync | `rejected` `not_assigned_to_actor`, lote 200, **e** `mileageStart` da `osA` segue `null` (antes: `null → 111111`, `pendencias.md:6771`) |
| S-COM | `tecnicoB` comenta, edita, apaga e (des)taggeia comentário na `osA` | 403 nas 5; o comentário do `tecnicoA` segue com o texto original e sem tag |
| S-MOD | moderação `D-Ω3F-5-COMMENT` preservada | `managerA` edita e apaga comentário do `tecnicoA` na `osA` → 2xx; `tecnicoA` (atribuído, porta `work_orders:update`) edita comentário do `managerA` na `osA` → 2xx (a regra autor-OU-update fica intacta **dentro** da OS atribuída) |
| S-GEO | `tecnicoB` chama `geocode` e `geocode-destination` da `osA` | 403 nas 2, com o provedor desligado (default) — o escopo vem antes do 409/422 e do provedor |
| S-RUN | `tecnicoB` responde, marca avaria, anexa, registra divergência, conclui e dá ciência na `runA`, por REST **e** pelo sync | 403 / `rejected` `not_assigned_to_actor` nos 12 caminhos; respostas, marcadores e status da `runA` **iguais** aos de antes (leitura pelo `managerA`) |
| S-RUN-OK | o mesmo roteiro pelo `tecnicoA` | responde → conclui → dá ciência → 2xx/`accepted` (o fluxo de campo real não quebrou) |
| S-ORFA | `tecnicoA` e `tecnicoB` respondem a `runOrfa` (sem OS) | 403 para os dois; `managerA` → não-403 (fail-closed só para o campo) |
| S-DISP | `tecnicoB` muda o status de `dispA` (alvo `tecnicoA`) | 403 `not_assigned_to_actor`; status de `dispA` inalterado; **e** `tecnicoA` muda o status do **próprio** despacho com a `osA` **sem** atribuição na OS → 2xx (o alvo do despacho é o critério, §3.4) |
| S-EVI | `tecnicoB` registra `evidence.work_order_observation` da `osA` | `rejected` `not_assigned_to_actor`; e `managerA` com `work_order_id` inexistente → `rejected` `not_found` (contrato novo declarado, §3.5) |
| E-UP | `tecnicoA` registra metadado da foto da `osA` (aceito) → `managerA` reatribui a `osA` ao `tecnicoB` → `tecnicoA` sobe o binário | upload **403** `not_assigned_to_actor`, nada gravado no storage de evidência |
| S-MIX | um lote com 2 ações: uma na `osA` pelo `tecnicoA` (atribuído) e uma na `osB` (alheia) | **200**; `accepted: 1`, `rejected: 1` (`not_assigned_to_actor`); a aceita produziu efeito, a recusada não |
| S-REPLAY | a ação recusada em S-MIX é reenviada com o **mesmo** `client_action_id` depois que o `managerA` atribui a `osB` ao técnico | `accepted` (a recusa não gravou recibo, §3.6) |
| S-IDEMP | `tecnicoA` responde a `runA` pelo sync (aceito) → `managerA` reatribui a `osA` ao `tecnicoB` → `tecnicoA` reenvia a **mesma** ação | `already_applied`, **não** `rejected` (D-07c-IDEMP); e uma ação **nova** dele na `runA` → `rejected` `not_assigned_to_actor` |
| S-XT | `tecnicoB2` (outra organização) em cada classe (anexo, comentário, run, despacho, evidência) | **404** (cross-tenant intocado; o 403 não vira oráculo de existência) |
| S-DUAL | `osU` atribuída por **user id** (a forma que o app grava, `o6r07a-wo-object-scope.test.ts:199-222`) | o `tecnicoA` nomeado responde a run da `osU` e anexa nela → 2xx (o dual-match do 07a vale nos subrecursos) |
| S-ROLES | ator com os papéis `field_technician` e `manager` em `osA` alheia | não-403 nas vias de anexo, comentário e run (união por presença, `work-order.types.ts:124-129`) |
| S-SVC | `ChecklistService.createRun` e `reopenRun` chamados direto com contexto `field_technician` sobre a `osA` alheia; `createRun` com contexto **sem papel** (o do provisionamento do despacho, `field-dispatch.service.ts:878`) | 403 nos dois primeiros; o terceiro **cria** (composição interna não é escopada) |

### 4.3 O guard que faz a via nova nascer negada (`o6r07c-census-guard.test.ts`) — CE-2 e CE-G1

- **(a) Fonte gerada:** o `tests/helpers/o6r07c-census.ts` monta o `createApp` **real**, percorre a pilha (com
  os aninhados) e sonda; os tipos de sync são **todos** os literais `dominio.acao` de `src/modules/**/*.ts`. Nada
  de lista de rotas.
- **Regra de pertença à propriedade (por forma, não por nome):** via REST cujo caminho tem parâmetro
  `:workOrderId`, `:runId` ou `:dispatchId`, **em qualquer roteador**; ação de sync de tipo `work_order.*`,
  `checklist*` ou `evidence.work_order_*`. Toda via assim tem de passar no **G-NEG** do §4.1 — o laço do §4.1 a
  recebe sozinho, pela mesma função.
- **(b) Default do membro não previsto = NEGAR:** via mutante alcançável por `field_technician` ou `technician`
  que **não** pertence à propriedade **e não** está na **allowlist literal de exceções** (as 25 entradas R e N do
  §2.1, cada uma com classe, justificativa e arquivo:linha) → **falha** com a mensagem: via nova sem
  classificação; o default é negar (escopo por objeto, ou entrada justificada na allowlist).
- **Rede reversa:** entrada da allowlist que deixou de ser alcançável → **falha** (allowlist envelhecida). Classe
  `NAO-CLASSIFICADA` com contagem maior que zero → **falha**.
- **(c) Mutações que o deixam vermelho (o dev as executa e grava o vermelho):**
  - **MG1** — rota nova `POST /work-orders/:workOrderId/mutacao-teste` sob `requirePermission(WORK_ORDER_PERMISSIONS.update)`, respondendo 200 → vermelho (pertence à propriedade e o G-NEG vê 200);
  - **MG2** — rota nova `POST /rota-teste-07c` sob a mesma permissão → vermelho (não classificada);
  - **MG3** — conceder `checklist_runs:create` ao `field_technician` no catálogo **sem** tocar no serviço → `POST /mobile/checklist-runs` vira alcançável e não está na allowlist → vermelho;
  - **MG4** — tipo de sync novo `checklist.mutacao_teste` com handler que escreve sem passar pelo serviço → vermelho;
  - **MG5** — apagar uma entrada da allowlist → vermelho (a via R/N vira não classificada);
  - **MG6** — trocar o critério de alcance para tratar 400 como barrado → o censo encolhe e a rede reversa da allowlist fica vermelha.

### 4.4 O caminho Prisma (`o6r07c-subresource-scope-db.test.ts`)

Com `DATABASE_URL` (no CI roda dentro do `npm test` do job `backend`, que sobe Postgres e Redis —
`.github/workflows/ci.yml:40-60,109`; sem banco, auto-pulo **declarado** no padrão das `-db` vizinhas):
repositórios Prisma reais; um caso positivo e um negativo para **OS** (anexo), **vistoria** (resposta pelo sync),
**despacho** e **evidência**, mais **S-DUAL**. Obrigatório porque o mapeamento `related_entity_type` →
`relatedEntityType` do repositório Prisma (`checklist-prisma.repository.ts:1338`) e o resolvedor de perfil em
Prisma são os pontos em que um erro deixaria **todo** técnico negado em produção (`relatedEntityType` indefinido
= run sem OS = 403) — e o modo memória não os exerce. As asserções de RLS seguem o drill do `B-O6R-06` (papel
efêmero `NOSUPERUSER NOBYPASSRLS`), conforme `PLANO_SAN3.md` §6. O dev usa **cluster descartável próprio**
(prefixo `dev07c-`, sem porta pública, removido pelo nome) — **nunca** 5432/6379 nem os contêineres `erp-*`.

### 4.5 Mutações de produto (cada critério com a que o derruba)

| mutação no código de produção | derruba |
|---|---|
| **M1** `getForMutation` sem a chamada a `assertMutationObjectScope` | G-NEG nas 13 de OS + S-ANX, S-KM, S-COM, S-GEO, S-EVI, E-UP |
| **M2** `assertRunMutationScope` retorna cedo sempre | G-NEG nas 18 de vistoria + S-RUN, S-ORFA |
| **M3** run sem OS tratada como permitida | S-ORFA |
| **M4** escopo do despacho comparando com o `assigned_operator_id` da OS | S-DISP (o positivo do próprio despacho cai) |
| **M5** escopo do despacho removido | G-NEG da via 32 + S-DISP |
| **M6** evidência: escopo removido do sync ou do upload | G-NEG 34–36 + S-EVI, ou E-UP |
| **M7** controller faz o parse **antes** do escopo (ordem invertida) | G-NEG das vias REST com corpo validado ou multipart (linhas 3, 15, 16, 18, 19 do §2.1) |
| **M8** nega tudo (`assigned_only` sempre recusado) | G-POS, S-RUN-OK, S-DUAL, positivo de S-DISP |
| **M9** escopo aplicado também a `tenant_wide` | G-WIDE, S-MOD |
| **M10** a recusa grava recibo | S-REPLAY |
| **M11** a recusa lança no lote (aborta o lote) | S-MIX |
| **M12** escopo **antes** do `already_applied` no sync | S-IDEMP |
| **M13** `assertCanMutate` de comentário passa a exigir só o autor (moderação quebrada) | S-MOD |
| **M14** `ChecklistService` composto sem `scope` | G-POS de vistoria cai para o `tecnicoA` (fail-closed provado; o positivo denuncia a composição faltante) |

### 4.6 Regressão — o que pode mudar em teste existente, e como

Rodada a régua (as 44 suítes) **depois** do conserto, cada falha é classificada e publicada pelo dev: **(i)**
fixture em que um técnico age em OS **sem atribuição** (o arnês não atribuía porque não precisava) → corrige-se
**a fixture** (atribuir a OS ao técnico), **nunca** a asserção; **(ii)** teste que **afirmava** o defeito (técnico
não atribuído com sucesso) → vira negativo, com nota; **(iii)** qualquer outra → é defeito do conserto. Medido
hoje por `git grep` de papel de campo nos caminhos tocados: `checklist-runs` 7 arquivos, `dispatches/` 4,
`sync/work-order-actions` 2, `sync/checklist-actions` 1, `sync/evidence-actions` 1, `evidence-uploads` 1,
comentários, anexos e geocode 0. **Nenhuma** asserção de `permission_required` pode mudar (o desenho não mexe na
precedência — §3.7).


## 5. Escopo permitido / proibido · bateria · junta

### 5.1 Escopo PERMITIDO (caminhos exatos)

**Da linha do bloco (`PLANO_SAN3.md:254`), usados:** `src/modules/work-orders/work-order.service.ts` ·
`src/modules/work-order-comments/work-order-comment.service.ts` (o resto de `work-order-comments/**` fica
permitido e **sem** mudança prevista) · `src/modules/checklists/checklist.service.ts` ·
`src/modules/mobile/mobile-checklist-sync.ts` (só `handleAttachmentAttach`) · `src/modules/mobile/mobile-evidence-sync.ts`.
**Da linha, permitidos e sem mudança prevista:** `src/modules/work-orders/work-order.routes.ts`,
`src/modules/checklists/checklist.routes.ts`, `src/modules/mobile/mobile-work-order-sync.ts` (a via 10 fecha em
`setMileage`, no serviço).

**Ampliação nominal pedida por este plano (o censo achou; regra de saída do `PLANO_SAN3.md:254` e C2-08,
`:598`)** — cada uma porque a via mora ali e não há como fechá-la de fora:
- `src/modules/work-orders/work-order-attachment.service.ts` e `src/modules/work-orders/work-order-attachment.controller.ts` — vias 1 e 2 (o serviço é quem resolve a OS; o controller faz o parse multipart antes do serviço).
- `src/modules/checklists/checklist.controller.ts` — a ordem "escopo antes do parse" das 6 rotas de vistoria (já dentro da trava `src/modules/checklists/**`, §6 do plano SAN3).
- `src/modules/field-dispatch/field-dispatch.service.ts` — **só** `changeStatus` (via 32). Trava nova: `07c` → `B-O6R-09` (dono de `field-dispatch/**`, fila pós-gate, não iniciado).
- `src/modules/mobile/mobile-evidence-upload.ts` — via 33.

**Testes e registro:** `tests/helpers/o6r07c-census.ts`, `tests/o6r07c-subresource-scope.test.ts`,
`tests/o6r07c-census-guard.test.ts`, `tests/o6r07c-subresource-scope-db.test.ts` (novos); **fixtures** das suítes
da régua (§4.6), só nas classes (i) e (ii), cada arquivo listado na evidência do dev · `API_CONTRACTS.md` (linhas de
`/work-orders/:id/**` em `:277-290`, das rotas de vistoria e despacho e de `/mobile/sync/*` em `:570`) ·
`agent-orchestration/controle/pendencias.md` (APPEND) e `pendencias-indice.md` (**regenerado pelo gerador**, nunca à
mão) · `docs/revisoes/O6R/achados.jsonl` (linha do `Ω6R-SEC-002`) · `agent-orchestration/codex/log-execucao.md` ·
`agent-orchestration/omega/juntas/**` (orquestrador) · os corpos de jurado que a fábrica criar, nos **dois**
espelhos (`.claude/agents/especialistas/` e `.agents/agents/especialistas/`, via `scripts/sync-agent-agents.mjs`).

**Se a junta do plano recusar a ampliação**, as vias 32 e 33 viram pendência nomeada com dono e o `Ω6R-SEC-002`
**não** fecha neste bloco (regra de saída do `PLANO_SAN3.md:254`: só fecha com **todas** as vias do censo com
escopo provado). A ampliação é a recomendação deste plano: as duas são de uma linha cada, no mesmo idioma.

### 5.2 Escopo PROIBIDO

`prisma/**` e `prisma/migrations/**` (sem migração) · `src/modules/work-orders/work-order.types.ts` (a
classificação do 07a é reusada, não editada) · `src/modules/core-saas/permissions/catalog.ts` e `scripts/provision-rbac.ts`
(nenhuma permissão muda) · `RBAC_MATRIX.md`, `APPROVAL_LIMITS.md`, `PRODUCT_CONTEXT.md`, `CLAUDE.md`, `AGENTS.md` ·
`mobile/**` (o app já preserva a ação recusada, §3.6) · `frontend/**` · `Kpis/**` (**KPI congelado**,
`D-GOV-PROPORCIONAL` §C7.8(5)) · `src/app.ts` · `src/modules/field-dispatch/**` fora de `field-dispatch.service.ts#changeStatus` ·
`src/modules/damages/**`, `src/modules/fuel-logs/**`, `src/modules/expense-management/**` (trava do `03a`),
`src/modules/telemetry/**`, `src/modules/notifications/**`, `src/modules/attachments/**` (classes R e N — registro,
não conserto) · `src/modules/auth/**` · `src/modules/checklists/*-prisma.repository.ts` e `checklist.repository.ts`
(o vínculo run→OS já é lido) · `.github/**`, `infra/**`, `package.json`, `package-lock.json`, `.env*` · as worktrees
`C:/Users/AMP/w-389j` e `C:/Users/AMP/w-traccar`.

**Dependências e travas (§6 do plano SAN3), medidas em `origin/main` = `c1cfdabe`:** `07a` (#369) e `07b` (#380)
mergeados. A agenda punha `SAN3-13` **antes** do `07c` em `work-order.service.ts`; o `SAN3-13` **não começou**
(depende do `B-O6R-11`, PR #388 aberto, que só toca `mobile/**`, `Kpis/**` e corpos de jurado — `gh pr diff 388
--name-only`) → a trava (dois blocos não tocam o mesmo arquivo **ao mesmo tempo**) não é violada; a ordem passa a
`07c → SAN3-13`, e o `SAN3-13` rebaseia sobre o `07c`. O #389 (`B-O6R-04a`) só toca `src/modules/inventory/**` e
testes de estoque — sem interseção. O #388 **não** muda a retenção de ação `failed` na fila do app (só serializa as
mutações de `sync_queue_repository.dart`) → o §3.6 vale antes e depois dele.

### 5.3 Bateria exata (backend; frontend e Flutter não são tocados)

Ambiente declarado no cabeçalho da evidência do dev (nenhuma variável de conveniência exportada no runner):
worktree próprio com `npm ci` próprio (sem junction de `node_modules`), Node v20.19.5, cluster descartável
`dev07c-pg`/`dev07c-redis` sem porta pública, removidos pelo nome; nunca 5432/6379/3000/5173/5050 nem `erp-*`.

```
DATABASE_URL=<cluster dev07c> npx prisma generate
npx prisma migrate deploy                                  # no cluster descartável
npm run check
npm run lint
node --test --import tsx tests/o6r07c-subresource-scope.test.ts tests/o6r07c-census-guard.test.ts
node --test --import tsx tests/o6r07c-subresource-scope-db.test.ts           # DATABASE_URL do cluster
node --test --import tsx --test-reporter=tap <as 44 suítes da régua, §4>      # memory; esperado 0 fail
node --test --import tsx tests/o6r07a-wo-object-scope.test.ts                 # regressão do 07a: 8/8, sem edição
npm test                                                   # forma canônica, cluster descartável; N e forma publicados
npm run build
node scripts/sync-agent-agents.mjs --check                 # se a fábrica criou corpos
git diff --check
```

Mais: **vermelho-controle** de cada teste de recusa em `c1cfdabe`; **M1–M14** e **MG1–MG6** executadas uma a uma,
cada uma com o vermelho gravado e a restauração conferida (`git diff` vazio depois); limpeza §C5 dos
`storage/checklist-attachments/<uuid>/` criados pelas passadas (o `.gitkeep` rastreado fica).

### 5.4 Junta — completa, unanimidade de 3, crítico no plano (`D-GOV-PROPORCIONAL` (1); §C7.1-ter(b))

O bloco toca **permissão** → **inspetor de terreno + 3 cadeiras com veto + unanimidade**; **teto de 2 ciclos**
(do 3º em diante só bloqueia defeito de produto grave — §C7.8(2)); **crítico adversarial no plano, antes do código**
(máx. 2 rodadas); P1–P7 em todos; mandato forma A com pré-voo só para o inspetor e as cadeiras (§C7.8(3)).
Quórum **não** é 5/5: zero dependência nova, zero serviço externo, zero deploy (`package*.json` proibido, §5.2).

| papel | corpo (medido em `git ls-tree c1cfdabe .claude/agents/`) | identidade | mandato (≤ 3 itens, P4) |
|---|---|---|---|
| crítico do plano | `critico-adversarial.md` (existe) | **nova**, `critico-07c` | atacar a propriedade, a fronteira das classes R/N, o critério do despacho, a D-07c-IDEMP e a ampliação do §5.1 |
| inspetor de terreno | `inspetor-de-terreno-da-junta.md` (existe) | por contrato | §C7.1-bis inteiro: SHA com check-runs concluídos, worktree e cluster por jurado, S0 do espelho Codex, inelegibilidade **por nome** |
| **C1** · escopo por objeto e cadeia de acesso (veto) | competência do `coordenador-de-acessos.md` — **corpo novo pela fábrica**, derivado dele | **nova**, `jurado-07c-c1-escopo-por-objeto` | (1) G-NEG/G-POS/G-WIDE **re-executados por sonda própria** no head (não pelo teste do dev); (2) `RBAC_MATRIX.md:44,45,66` × catálogo × comportamento — `tenant_wide` intacto, S-MOD, 404 cross-tenant; (3) julgar as duas decisões: alvo do despacho (§3.4) e run sem OS = nega |
| **C2** · censo fail-closed e guard (veto) | competência do `guardiao-fail-closed.md` + `inspetor-de-rotas.md` — **corpo novo pela fábrica** | **nova**, `jurado-07c-c2-censo-e-guard` | (1) **gerador próprio**, independente do helper do dev, e comparação das contagens (409/223/42; 23; 61/36/25); (2) executar MG1–MG6 e no mínimo M1, M2, M7, M8, M14 — vermelho em cada; (3) CE-G1 (a)(b)(c) e CE-2 conferidos na letra |
| **C3** · sync B-108, regressão e escopo (veto) | **corpo novo pela fábrica** (contrato mobile + regressão + escopo/registro) | **nova**, `jurado-07c-c3-sync-regressao-escopo` | (1) S-MIX, S-REPLAY, S-IDEMP, E-UP e a leitura do app (`rejected` → `failed` mantido); (2) régua das 44 + `npm test` + a `-db` em cluster próprio; fixtures só das classes (i)/(ii); (3) diff dentro do §5.1, PROIBIDO vazio, registro (pendências, `achados.jsonl`, `API_CONTRACTS.md`) — **sem** cobrar KPI |

**A fábrica cria 3 corpos** (C1, C2, C3) e o orquestrador os versiona nos dois espelhos (a fábrica não tem Bash) —
e, por P3/P5, **um suplente por cadeira** com identidade própria. **Tensão registrada (§A2), não consolidada em
silêncio:** `PLANO_SAN3.md:254` pede "unanimidade + `coordenador-de-acessos`", mas a **identidade**
`coordenador-de-acessos` é a **achadora** do `C2-09` (o item 51), em
`agent-orchestration/omega/juntas/votos/SAN3-plano/C2-coordenador-de-acessos-voto.json:54`, e a casa não deixa quem
achou votar no conserto (`J-B-O6R-07b.md:17`). Resolução proposta: a **competência** do corpo entra pela C1, com
**identidade nova**. O orquestrador registra em `controle/` antes da junta.

**Inelegíveis por nome** (o inspetor confere com `git log --all -S<nome>`):

| nome | por quê |
|---|---|
| `planejador-b-o6r-07c` | planejou este bloco |
| o dev do bloco (nome que o orquestrador der) e o crítico `critico-07c` | desenvolve / atacou o plano |
| `jurado-b07a-autorizacao-e-alcada` | achou o `C1-A1` (as 9 rotas), `J-O6R-07a-ciclo1.md:13` |
| `jurado-b07a-c2-autorizacao-s` | achou o `S-A1` (a décima via), `J-O6R-07a-ciclo2.md:13,60` |
| `coordenador-de-acessos` (identidade) | achou o `C2-09` (item 51), `votos/SAN3-plano/C2-coordenador-de-acessos-voto.json:54` |
| `guardiao-fail-closed` (identidade) | achou o `C2c2-03` (a CE-2 deste bloco), `votos/SAN3-plano-ciclo2/C2-guardiao-fail-closed-voto.json:30` |
| `porteiro-pos-merge` | reconfirmou o `S-A1` (`00c-porteiro-pos-merge-369.md`, G1.8); não vota em junta |

Os planejadores e devs do 07a e do 07b **não** são inelegíveis por regra (o 07c reusa o código deles, não
conserta achado deles); se a junta quiser afastá-los por prudência, é decisão dela, escrita.


## 6. Riscos · rollback · tamanho

| # | risco | probabilidade × dano | mitigação no plano |
|---|---|---|---|
| R1 | **Técnico negado em tudo em produção** (o mapeamento Prisma de `related_entity_type` ou o resolvedor de perfil falha → "run sem OS"/"sem perfil" → 403 para quem é atribuído) | baixa × **alto** (o campo para) | `-db` obrigatório com positivos (§4.4); G-POS e S-RUN-OK; dual-match herdado do 07a (S-DUAL) |
| R2 | Fixtures existentes quebram em massa e o dev "conserta" afrouxando asserção | média × alto | regra (i)/(ii)/(iii) do §4.6, cada arquivo listado; C3 confere a classe de cada mudança |
| R3 | **Despacho × atribuição da OS divergem** (pré-existente): o despacho não atribui a OS, então o técnico despachado sem `assigned_operator_id` já leva 403 do 07a no status da OS e passará a levar nos subrecursos | média × médio | **não** é criado por este bloco nem resolvido por ele; S-DISP prova que o despacho usa o alvo próprio. O `Ω6R-QUA-004` (write do assign; dono `B-O6R-11`, PR #388 aberto, `pendencias.md:3377-3382`) é o dono; o 07c **apensa** à `P-O6R-B11` a observação de que o despacho também não escreve a atribuição |
| R4 | Custo de I/O extra para o técnico (controller + serviço: até 2 leituras de run, 2 de OS, 2 de perfil por mutação REST de vistoria) | alta × baixo | só para `assigned_only`; `tenant_wide` sai sem I/O (§3.3). **Hipótese não medida** — o C3 pode pedir a medição |
| R5 | A ação recusada fica `failed` na fila do app e é reenviada a cada sync, com "Servidor recusou a acao." — sem perda, mas com ruído | alta × baixo | backend não muda isso; **pendência nova** `P-O6R-07C-APP-RECUSA-DE-ESCOPO-SEM-SAIDA` (BAIXA, dono `B-SAN3-16`, que já é dono da fila do app e vem depois do 07c na trava de `mobile-work-order-sync.ts`) |
| R6 | `inventory` × vistoria `answer-by-scope` segue negado | — | append à `P-SAN3-04A-CHECKLIST-ESCOPO-ESTOQUE`: mecanismo pronto, falta a definição de escopo do Estoque (produto); dono passa a `fila pós-gate` (§1) |
| R7 | O contrato do sync de evidência muda para **todos** (OS inexistente → `rejected` `not_found`) | baixa × baixo | declarado (§3.5), testado (S-EVI), documentado em `API_CONTRACTS.md` |
| R8 | A junta recusa a ampliação do §5.1 | média × médio | o `Ω6R-SEC-002` não fecha; as vias 32/33 viram pendência com dono (§5.1) — o resto do bloco vale |

**Rollback.** Sem migração e sem dado novo: reverter o squash do PR devolve exatamente o comportamento de
`c1cfdabe` (inclusive as 33 vias abertas). Nenhum registro gravado no banco depende do código novo.

**Tamanho: G** (o `PLANO_SAN3.md:254` já o dimensiona G, 13 h na agenda do §6). Medido: **10 arquivos de
produção com mudança** (§5.1) + 3 permitidos sem mudança prevista, **4 arquivos de teste novos** com ≥ 60 testes, ajustes
de fixture em até **16** suítes (§4.6), 2 decisões para a junta (despacho, D-07c-IDEMP) e uma ampliação de
fronteira.

## 7. Registro que o PR entrega (APPEND, nunca reescrita)

- `P-O6R-SUBRECURSO-OBJECT-SCOPE` → **FECHADA** (escopo provado nas 33 vias abertas + as 3 do 07a, com a tabela do
  §2.1 e os testes do §4), valor anterior preservado.
- `P-SAN3-CHECKLIST-RUN-SEM-ESCOPO-POR-OBJETO` → **FECHADA** (S-RUN, S-ORFA, G-NEG das 18 de vistoria).
- `Ω6R-SEC-002` em `docs/revisoes/O6R/achados.jsonl` → `fechado` **somente** se o §5.1 for aceito inteiro.
- `P-SAN3-04A-CHECKLIST-ESCOPO-ESTOQUE` → append (R6). `P-O6R-B11` (`Ω6R-QUA-004`) → append (R3).
  `P-O6R-B01-RELIGACAO-SEM-REMEDIO` → append: não cabe no 07c; bloco próprio pós-gate (§2.3).
- **Novas:** `P-O6R-07C-VINCULO-A-OS-ALHEIA-POR-REFERENCIA` (MÉDIA) · `P-O6R-07C-FLEET-ALERTS-RUN-PELO-CAMPO`
  (MÉDIA) · `P-O6R-07C-APP-RECUSA-DE-ESCOPO-SEM-SAIDA` (BAIXA) — cada uma com N, forma, causa, escopo
  `pre-existente` com evidência de data, dono e teste de encerramento.
- **Decisões para `controle/decisoes.md`:** `D-07c-DESPACHO-ALVO` (§3.4), `D-07c-IDEMP` (§3.3), `D-07c-RUN-SEM-OS-NEGA`
  (§1), a tensão `coordenador-de-acessos` × inelegibilidade (§5.4).
- `pendencias-indice.md` **regenerado pelo gerador**. **KPI: nada** (congelado).


## Apêndice A — os geradores, verbatim (P3: roteiro de reexecução)

Rodados com cwd = raiz do worktree (`C:/Users/AMP/w-07c`, HEAD `c1cfdabe`), depois de `npm ci` e `prisma generate`.
Os arquivos ficaram no scratchpad da sessão do planejador; o texto abaixo é a cópia integral. O helper do dev
(`tests/helpers/o6r07c-census.ts`) reimplementa o mesmo algoritmo — a C2 compara as contagens.

### census.mts

```ts
// Censo RUNTIME do B-O6R-07c: toda rota MONTADA pelo createApp real (src/app.ts), sondada por HTTP com o
// contexto de cada papel. "Alcança" = a resposta NÃO é 403 permission_required/role_required/tenant_required
// (o portão de RBAC deixou passar; o que vem depois — 400/404/422/200 — é o serviço).
// Uso: (cwd = raiz do worktree) node --import tsx <este arquivo> <saida.json>
import { randomUUID } from "node:crypto";
import fs from "node:fs";
process.env.LOG_LEVEL = "silent";
process.env.CORE_SAAS_PERSISTENCE = "memory";
delete process.env.DATABASE_URL; delete process.env.REDIS_URL;
const { pathToFileURL } = await import("node:url");
const root = new URL(pathToFileURL(process.cwd()).href + "/src/");
const { createApp } = await import(new URL("app.ts", root).href);
const { CoreSaasRegistry } = await import(new URL("modules/core-saas/services/core-saas.service.ts", root).href);
const { MemoryCoreSaasAdapter } = await import(new URL("modules/core-saas/services/memory-core-saas.adapter.ts", root).href);
const { InMemoryCoreSaasStore } = await import(new URL("modules/core-saas/store/core-saas.store.ts", root).href);
const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
const tenant = core.createTenant({ name: "Censo 07c", modules: ["work_orders"] });
const app = createApp(new MemoryCoreSaasAdapter(core));
const PREFIXES = ["/api/v1", "/api/v1/auth", "/api/v1/platform", "/api/v1/navigation"];
// Montagens ANINHADAS: candidatas lidas da fonte (toda chamada .use("/x", ...) em src/**), casadas pelo matcher real.
const { execFileSync } = await import("node:child_process");
const NESTED = [...new Set(execFileSync("git", ["grep", "-h", "-o", "-E", '"/[a-z-]+"', "--", "src"], { encoding: "utf8" }).split(String.fromCharCode(10)).map((l) => l.slice(1, -1)).filter((x) => x.length > 1))].sort((a, b) => b.length - a.length);
console.log('literais candidatas a montagem aninhada (da fonte):', NESTED.length);
type R = { method: string; path: string; mount: string };
const routes: R[] = []; let nested = 0;
function walk(stack: any[], mount: string, depth: number) {
  for (const l of stack) {
    if (l.route) {
      const paths = Array.isArray(l.route.path) ? l.route.path : [l.route.path];
      for (const p of paths) for (const m of Object.keys(l.route.methods)) if (m !== "_all") routes.push({ method: m.toUpperCase(), path: mount + p, mount });
    } else if (l.handle?.stack) {
      if (depth > 0) nested++;
      let pre = mount;
      if (depth === 0) { pre = PREFIXES.find((c) => l.match(c + "/__p__")) ?? "?"; }
      else { const raiz = l.match("/__zz_raiz__/__p__"); const c = raiz ? "" : NESTED.find((n) => l.match(n + "/__p__")); pre = mount + (c ?? "/?NESTED?"); }
      walk(l.handle.stack, pre, depth + 1);
    }
  }
}
walk((app as any).router.stack, "", 0);
const server = app.listen(0, "127.0.0.1");
await new Promise((r) => server.once("listening", r));
const base = `http://127.0.0.1:${(server.address() as any).port}`;
const ROLES = ["field_technician", "technician", "viewer"];
const user = randomUUID();
const out: any[] = [];
for (const r of routes) {
  const url = base + r.path.replace(/:([A-Za-z_]+)/g, () => randomUUID());
  const row: any = { method: r.method, path: r.path };
  for (const role of ROLES) {
    if (r.method === "GET" || r.method === "HEAD") { row[role] = "-"; continue; }
    const res = await fetch(url, { method: r.method, headers: { "content-type": "application/json", "x-tenant-id": tenant.id, "x-user-id": user, "x-role": role }, body: r.method === "DELETE" ? undefined : "{}" });
    const text = await res.text(); let reason = "";
    try { reason = JSON.parse(text)?.error?.reason ?? ""; } catch {}
    row[role] = `${res.status}${reason ? ":" + reason : ""}`;
  }
  out.push(row);
}
server.close();
const gate = (s: string) => /^403:(permission_required|role_required|tenant_required|platform_permission_required)$/.test(s) || /^401/.test(s) || s === "-";
const mut = out.filter((x) => x.method !== "GET" && x.method !== "HEAD");
const reach = mut.filter((x) => !gate(x.field_technician) || !gate(x.technician));
fs.writeFileSync(process.argv[2], JSON.stringify({ total: out.length, nested, mutating: mut.length, reach }, null, 1));
console.log(`rotas montadas: ${out.length} | routers aninhados: ${nested} | mutantes: ${mut.length} | mutantes que field_technician OU technician alcançam: ${reach.length}`);
for (const x of reach) console.log(`${x.method.padEnd(6)} ${x.path.padEnd(72)} ft=${x.field_technician.padEnd(34)} tech=${x.technician.padEnd(34)} viewer=${x.viewer}`);
process.exit(0);
```

### census-sync.mts

```ts
// Censo das AÇÕES de sync: endpoints = toda rota POST montada sob /api/v1/mobile/sync/ (lida do createApp real);
// tipos = todo literal "dominio.acao" dos arquivos *sync*.ts de src/modules (lidos da fonte). Cada tipo é
// enviado a cada endpoint, como field_technician e technician, com ids aleatórios no payload. "Alcança" = o
// resultado da ação NÃO é permission_required (nem unsupported_action_type, que diz que o endpoint não o conhece).
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
process.env.LOG_LEVEL = "silent"; process.env.CORE_SAAS_PERSISTENCE = "memory";
delete process.env.DATABASE_URL; delete process.env.REDIS_URL;
const root = new URL(pathToFileURL(process.cwd()).href + "/src/");
const { createApp } = await import(new URL("app.ts", root).href);
const { CoreSaasRegistry } = await import(new URL("modules/core-saas/services/core-saas.service.ts", root).href);
const { MemoryCoreSaasAdapter } = await import(new URL("modules/core-saas/services/memory-core-saas.adapter.ts", root).href);
const { InMemoryCoreSaasStore } = await import(new URL("modules/core-saas/store/core-saas.store.ts", root).href);
const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
const tenant = core.createTenant({ name: "Censo sync 07c", modules: ["work_orders"] });
const app = createApp(new MemoryCoreSaasAdapter(core));
const endpoints: string[] = [];
(function walk(stack: any[], mount: string, depth: number) {
  for (const l of stack) {
    if (l.route) { for (const m of Object.keys(l.route.methods)) if (m === "post" && String(l.route.path).startsWith("/mobile/sync/")) endpoints.push("/api/v1" + l.route.path); }
    else if (l.handle?.stack && depth === 0 && l.match("/api/v1/__p__")) walk(l.handle.stack, "/api/v1", 1);
  }
})((app as any).router.stack, "", 0);
const files = execFileSync("git", ["ls-files", "src/modules"], { encoding: "utf8" }).split(String.fromCharCode(10)).filter((f) => /[.]ts$/.test(f) && !/test/.test(f));
const types = new Set<string>();
for (const f of files) for (const m of fs.readFileSync(f, "utf8").matchAll(/"([a-z_]+[.][a-z_.]+)"/g)) types.add(m[1]);
const server = app.listen(0, "127.0.0.1"); await new Promise((r) => server.once("listening", r));
const base = `http://127.0.0.1:${(server.address() as any).port}`;
const user = randomUUID(); const rows: any[] = [];
for (const ep of endpoints) for (const type of [...types].sort()) {
  const row: any = { endpoint: ep.replace("/api/v1", ""), type };
  for (const role of ["field_technician", "technician"]) {
    const id = randomUUID();
    const payload = { work_order_id: randomUUID(), server_run_id: randomUUID(), run_id: randomUUID(), local_run_id: randomUUID(), component_id: randomUUID(), status: "accepted", mileage_start: 1, note: "x", caption: "x", answer: "x", value: "x" };
    const body = { client_batch_id: randomUUID(), actions: [{ client_action_id: id, clientActionId: id, client_evidence_id: id, type, local_created_at: new Date().toISOString(), payload }] };
    const res = await fetch(base + ep, { method: "POST", headers: { "content-type": "application/json", "x-tenant-id": tenant.id, "x-user-id": user, "x-role": role }, body: JSON.stringify(body) });
    const j: any = await res.json().catch(() => ({}));
    if (res.status !== 200) { row[role] = `${res.status}:${j?.error?.reason ?? ""}`; continue; }
    const d = j.data ?? {}; let found: any;
    for (const k of Object.keys(d)) if (Array.isArray(d[k])) for (const a of d[k]) if (a?.client_action_id === id || a?.client_evidence_id === id || a?.clientActionId === id) found = { bucket: k, a };
    row[role] = found ? `${found.bucket}:${found.a?.error?.reason ?? found.a?.status ?? ""}` : `sem-resultado:${JSON.stringify(j).slice(0, 80)}`;
  }
  rows.push(row);
}
server.close();
const naoAlcanca = (s: string) => /permission_required|role_required|tenant_required|unsupported_action/.test(s);
const reach = rows.filter((r) => !naoAlcanca(r.field_technician) || !naoAlcanca(r.technician));
fs.writeFileSync(process.argv[2], JSON.stringify({ endpoints, files, types: [...types].sort(), rows }, null, 1));
console.log(`endpoints de sync montados: ${endpoints.length} (${endpoints.join(", ")})`);
console.log(`arquivos .ts de src/modules lidos: ${files.length} | literais de tipo: ${types.size} | pares endpoint×tipo: ${rows.length} | pares que field_technician OU technician alcançam: ${reach.length}`);
for (const r of reach) console.log(`${r.endpoint.padEnd(32)} ${r.type.padEnd(40)} ft=${r.field_technician.padEnd(44)} tech=${r.technician}`);
process.exit(0);
```

### classify.cjs

```js
// classify.cjs <census-out.json> <census-sync-out.json> : classifica TODA via alcançável pelo técnico.
// Regras por prefixo/tipo; o que nenhuma regra cobre sai NAO-CLASSIFICADA (o guard do dev a trata como falha).
const fs = require("fs");
const http = JSON.parse(fs.readFileSync(process.argv[2], "utf8")).reach;
const sync = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));
const gate = (s) => /permission_required|role_required|tenant_required|unsupported_action/.test(s);
const syncReach = sync.rows.filter((r) => !gate(r.field_technician) || !gate(r.technician));
const G07A = new Set(["PATCH /api/v1/work-orders/:workOrderId", "PATCH /api/v1/work-orders/:workOrderId/status", "work_order.status_change"]);
const REG = { // registro: P-O6R-SUBRECURSO-OBJECT-SCOPE (1..10) e item 51 + emenda (51a..51f)
  "POST /api/v1/work-orders/:workOrderId/attachments": "1", "DELETE /api/v1/work-orders/:workOrderId/attachments/:attachmentId": "2",
  "POST /api/v1/work-orders/:workOrderId/comments": "3", "PATCH /api/v1/work-orders/:workOrderId/comments/:commentId": "4",
  "DELETE /api/v1/work-orders/:workOrderId/comments/:commentId": "5", "POST /api/v1/work-orders/:workOrderId/comments/:commentId/tags/:tagId": "6",
  "DELETE /api/v1/work-orders/:workOrderId/comments/:commentId/tags/:tagId": "7", "POST /api/v1/work-orders/:workOrderId/geocode": "8",
  "POST /api/v1/work-orders/:workOrderId/geocode-destination": "9", "work_order.mileage": "10",
  "PATCH /api/v1/mobile/checklist-runs/:runId": "51a", "POST /api/v1/mobile/checklist-runs/:runId/complete": "51b",
  "POST /api/v1/mobile/checklist-runs/:runId/acknowledgement": "51c", "POST /api/v1/mobile/checklist-runs/:runId/attachments": "51d",
  "POST /api/v1/mobile/checklist-runs/:runId/markers": "51e", "POST /api/v1/mobile/checklist-runs/:runId/divergence": "51f",
};
function classeHttp(m, p) {
  if (/^\/api\/v1\/work-orders\/:workOrderId/.test(p)) return "OS";
  if (/^\/api\/v1\/mobile\/checklist-runs\/:runId/.test(p)) return "VISTORIA";
  if (/^\/api\/v1\/operations\/dispatches\/:dispatchId/.test(p)) return "DESPACHO";
  if (p === "/api/v1/mobile/evidence-uploads") return "EVIDENCIA-OS";
  if (/^\/api\/v1\/mobile\/sync\//.test(p)) return "SYNC(lote)";
  if (/^\/api\/v1\/(damages|fuel-logs|expense-reports)(\/|$)/.test(p) && !/attachments$/.test(p) && !/submit$/.test(p)) return "R";
  if (p === "/api/v1/mobile/telemetry") return "R";
  if (/^\/api\/v1\/auth\//.test(p) || /^\/api\/v1\/notifications\//.test(p) || p === "/api/v1/mobile/field-locations" || /^\/api\/v1\/attachments/.test(p) || /^\/api\/v1\/damages\/:damageId\/attachments$/.test(p) || /submit$/.test(p)) return "N";
  return "NAO-CLASSIFICADA";
}
function classeSync(t) {
  if (/^work_order[.]/.test(t)) return "OS";
  if (/^checklist/.test(t)) return "VISTORIA";
  if (/^evidence[.]work_order_/.test(t)) return "EVIDENCIA-OS";
  if (/^evidence[.]field_/.test(t)) return "N";
  if (/^expense_/.test(t)) return "R";
  return "NAO-CLASSIFICADA";
}
const linhas = []; const cont = {};
for (const x of http) {
  const k = `${x.method} ${x.path}`; const c = classeHttp(x.method, x.path);
  if (c === "SYNC(lote)") continue; // o lote é desdobrado por tipo de ação abaixo
  cont[c] = (cont[c] || 0) + 1;
  linhas.push({ via: "`" + k.replace("/api/v1", "") + "`", c, ft: x.field_technician, tech: x.technician, reg: REG[k] ?? "", g: G07A.has(k) });
}
for (const r of syncReach) {
  const c = classeSync(r.type); cont[c] = (cont[c] || 0) + 1;
  linhas.push({ via: "`" + r.endpoint + "` · `" + r.type + "`", c, ft: r.field_technician, tech: r.technician, reg: REG[r.type] ?? "", g: G07A.has(r.type) });
}
const ordem = ["OS", "VISTORIA", "DESPACHO", "EVIDENCIA-OS", "R", "N", "NAO-CLASSIFICADA"];
linhas.sort((a, b) => ordem.indexOf(a.c) - ordem.indexOf(b.c));
let n = 0;
console.log("| # | via (método + caminho, ou endpoint · tipo de ação) | classe | field_technician | technician | registro | estado hoje |");
console.log("|---|---|---|---|---|---|---|");
for (const l of linhas) console.log(`| ${++n} | ${l.via} | ${l.c} | ${l.ft} | ${l.tech} | ${l.reg} | ${l.g ? "guardada pelo 07a" : ["OS","VISTORIA","DESPACHO","EVIDENCIA-OS"].includes(l.c) ? "**ABERTA**" : "fora da propriedade"} |`);
console.log("");
console.log("CONTAGEM POR CLASSE: " + ordem.map((c) => `${c}=${cont[c] || 0}`).join(" · ") + ` · total=${n}`);
const prop = linhas.filter((l) => ["OS","VISTORIA","DESPACHO","EVIDENCIA-OS"].includes(l.c));
console.log(`NA PROPRIEDADE: ${prop.length} (guardadas pelo 07a: ${prop.filter((l) => l.g).length} · abertas: ${prop.filter((l) => !l.g).length} · registradas: ${prop.filter((l) => l.reg).length} · NOVAS (abertas e fora do registro): ${prop.filter((l) => !l.g && !l.reg).length})`);
const regFaltando = Object.entries(REG).filter(([k]) => !linhas.some((l) => l.via.includes(k.replace("/api/v1", "")) || l.via.includes("`" + k + "`")));
console.log("REGISTRADAS QUE O CENSO NAO ACHOU: " + (regFaltando.length ? regFaltando.map(([k, v]) => v + "=" + k).join("; ") : "nenhuma"));
```
