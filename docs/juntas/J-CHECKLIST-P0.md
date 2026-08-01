# J-CHECKLIST-P0 — Conserto do data-loss de sincronização de checklist (mobile → backend)

> Decisão de arquitetura: **D-CHK-DISPATCH-CREATE** (`agent-orchestration/controle/decisoes.md`).
> Duas fatias: **PR-A** (backend — despacho cria a run, RBAC, endpoint run-por-OS, ciclo completo do sync) e
> **PR-B** (Flutter — baixar a run pré-criada, sync das respostas contra `server_run_id`, upload de foto multipart).

## 1. Problema

O guincheiro preenche o checklist offline; a fila local replaya para `POST /mobile/sync/checklist-actions`. A recon
achou **perda silenciosa total**: (camada A, dominante) o wiring de produção do app só enviava 2 tipos E só com
`server_run_id`, que nunca era populado; (camada B) o backend só processava 3 tipos. Foto/avaria/assinatura/respostas
preenchidas no campo **nunca chegavam ao servidor**. App ainda não em produção real (piloto pendente) → risco latente,
não sangramento ativo.

## 2. Decisão (D-CHK-DISPATCH-CREATE)

"Despacho cria, guincheiro responde": o **operador/despacho CRIA a run** (efeito de domínio de `field_dispatch:create`,
não-amplificador — espelha o freeze do snapshot que o despacho já faz, sem re-checar `checklist_runs:create`); o
**guincheiro (`field_technician`) só RESPONDE/CONCLUI/ASSINA** — ganha `checklist_runs:read/update/complete/acknowledge`
(drift fix: tinha ZERO), NÃO `create`. Endpoint novo `GET /mobile/checklist-runs?workOrderId=` deixa o guincheiro baixar
o `server_run_id`. Consequência aceita: guincheiro offline sem run pré-criada não preenche (fronteira da decisão).

## 3. PR-A — VOTOS DA JUNTA (2026-08-01) — **APROVADO** (junta orquestrada como workflow adversarial)

> `agente-dba-guardiao` + `critico-adversarial` + `coordenador-de-acessos` (revisão) → rework → re-verificação
> (`critico-adversarial` + `agente-dba-guardiao`). Todos os PoCs contra Postgres real.

**Ciclo 1 (revisão):**
- **coordenador-de-acessos → APROVADO** (sem condição). Ratificou o efeito-de-domínio NÃO-amplificador (manager/
  field_dispatcher provisionam a run indiretamente mas NÃO ganham acesso a checklist_runs; coerente com o precedente
  Ω4C); a distribuição final `checklist_runs:create ∈ {operator, super/tenant/platform_admin}`; o gate do endpoint
  (`checklist_runs:read`, cross-tenant 200-vazio, 422 sem workOrderId); e **ratificou a consequência cross-módulo
  P-IMPOUND-CHK-VISIBILITY** (dar `checklist_runs:read` ao field_technician faz ele passar no gate duplo do
  `GET /impound-processes/:id/checklist-runs` do dossiê — aceitável: só devolve `ChecklistRunSummary` estreito, sem
  hash-chain/autoridade/PII, classe de dado que o guincheiro já lê; o gate duplo segue barrando field_dispatcher).
- **agente-dba-guardiao → APROVADO_CONDICIONADO. 1 ALTA:** o `event_type` novo `field_dispatch_checklist_run_failed`
  era barrado por um CHECK EXISTENTE (`field_dispatch_events_event_type_check`, 4 valores) — a afirmação "String pura,
  sem CHECK, sem migração" era FALSA (INSERT → 23514). Sem `$transaction` no create+createEvent, o fail-open virava
  **fail-closed-500 com despacho órfão + evento de domínio (Outbox) e auditoria perdidos**.
- **critico-adversarial → APROVADO_CONDICIONADO.** Núcleo sólido (8 despachos concorrentes = 1 run, isolamento, ciclo
  do guincheiro persistindo de verdade via /comparison). **2 MÉDIA:** (a) `createRun` emitia o evento `checklist_run.created`
  (métrica FATURADA `checklist_runs_count`) mesmo devolvendo run idempotente → super-contagem de faturamento + audit
  duplicado sob despacho concorrente; (b) fail-open com recuperação fraca (reassign não reprovisiona, falha silenciosa).
  2 BAIXA: `reason` de auditoria com `error.message` cru (§2.8); endpoint devolve >1 run se o checklist da OS muda.

**Rework (7 achados):** migração `20260858000000` estende o CHECK (+ try/catch de defesa; fail-open volta a ser
fail-open); `createRun` retorna `{run, created}` e o service pula emissão/audit quando `created===false` (fecha o
double-billing — limitado a 1 pela constraint unique); `reassign` reprovisiona idempotente + notifica o operador na
falha; `reason` codificado; endpoint aceita `?checklistId=` para desambiguar; nota de ops do índice não-CONCURRENTLY;
teste de contrato fixa `CORE_SAAS_PERSISTENCE=memory`.

**Ciclo 2 (re-verificação adversarial):**
- **agente-dba-guardiao → CONFIRMADO_FECHADO.** Migração `20260858000000` aditiva/superset (4→5 valores, nenhum
  removido), provada viva (novo valor passa, bogus 23514, 4 antigos intactos, 0 linhas violando); `migrate status` 94
  up to date.
- **critico-adversarial → NOVO_ACHADO.** Faturamento CONFIRMADO fechado (o unique limita a 1 emissão). **1 MÉDIA nova:**
  o `catch` do P2002 fazia a re-busca DENTRO da transação já ABORTADA (`withTenantRls` = 1 tx interativa) → `25P02`
  lançado (não é P2002 → não re-capturado) → o perdedor da corrida LANÇAVA em vez de devolver `created:false`, gerando
  evento de falha ESPÚRIO + notificação falsa ao operador (auto-derrotante). + BAIXA: o teste de concorrência só rodava
  em memória (serializa), mascarando o abort.

**Rework 2 (raiz):** `createRun` Prisma com `client_run_key` passa a usar `INSERT ... ON CONFLICT (tenant_id,
client_run_key) DO NOTHING RETURNING` — 0 linhas ⇒ conflito sem abortar a tx ⇒ SELECT normal devolve a existente
`created:false`; 1 linha ⇒ `created:true`. Teste DB-gated novo (`checklist-run-create-concurrency-db.test.ts`) com
**barreira que força a colisão** (concorrência ingênua mascara — o vencedor commita antes do perdedor pré-checar):
prova que o perdedor recebe `created:false` limpo, 1 run, 1 unidade faturada, ZERO evento/notificação espúrios. O teste
**FALHA contra o código bugado** com o `25P02` exato e passa contra o corrigido (regressão que comprovadamente pega o bug).

**Decisão da junta:** **APROVADO** — 1 ALTA + 3 MÉDIA + 3 BAIXA, todas fechadas e re-verificadas contra Postgres real.
**KPIs:** backend **2040/2055 → 2064/2070**. 2 migrações novas (`20260857000000` client_run_key, `20260858000000`
event_type CHECK). Pendências registradas: P-IMPOUND-CHK-VISIBILITY (ratificada), P-RBAC-CHECKLIST-DRIFT (manager/
finance/inventory), P-CHK-TEMPLATE-PRISMA-V7 (bug real de `createTemplate` no Prisma v7, fora de escopo). Próximo: **PR-B
(Flutter)**.

## 4. PR-B — Flutter (pendente)

Parar de criar run local (`getOrStartRun`); baixar a run pré-criada via `GET /mobile/checklist-runs?workOrderId=`;
gravar `serverId`; sync das respostas/marker/divergence/ack/complete contra o `server_run_id`; upload de foto por
multipart. KPIs duplos (§C3.2). Junta própria.
