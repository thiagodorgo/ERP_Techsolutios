# B-SAN3-14 — Diário do DEV

> O plano (`agent-orchestration/codex/comandos/B-SAN3-14-guincho-entrega.md:8`) nomeia o diário do dev fora do repositório
> (`revisoes/dev-14-cl-progresso.md`, na pasta do orquestrador), e nenhum commit do ramo trouxe um diário para
> `docs/revisoes/SAN3/`. **Leitura do dev `fix-546-api`, declarada (§A6):** o mandato da Emenda 3 manda gravar em
> `docs/revisoes/SAN3/`; este arquivo nasce com a convenção `B-SAN3-NN-dev.md` só com a seção da Emenda 3. A mesma seção
> vai em `/saida/dev-14-cl-progresso-emenda3.md` para o orquestrador apensar ao diário externo.

## Emenda 3 (fix-546-api)

- **Dev:** `fix-546-api`, Claude Opus 5.5 pela API, identidade de dev declarada. Não escreveu o plano, os blocos nem o
  merge; os achados A e B são do `merge-546-api`, que não os consertou.
- **Fonte:** `plano-B-SAN3-14-emenda3.md` (orquestrador, 11/11 16:08 SP), que prevalece sobre o v2 e as Emendas 1 e 2.
- **Objeto:** `e7da698d` (ramo `fix/mobile-guincho-entrega`, com a main `f5b79026`).
- **Horas (UTC, de `date`):** início 19:07:16; este registro 19:12:08 de 2026-11-11.

### Passo 1 — npm ci, prisma generate, vermelho-controle
```
npm ci → exit 0 · npx prisma generate → exit 0
$ node --test --import tsx tests/bsan314-trava-conclusao.test.ts
not ok 1..8 (os 8 casos)
# tests 8 # pass 0 # fail 8 # skipped 0
causa: error: 'Work order arrival requires a server check-in verdict.' (assertCheckinVerdictForStatus)
```
Veredito: 8/8 not ok, causa = fixture sem veredito de check-in (achado B confirmado).

### Passo 2 — E3.2 (arnês) — Wed Nov 11 19:07:59 UTC 2026
```diff
diff --git a/tests/bsan314-trava-conclusao.test.ts b/tests/bsan314-trava-conclusao.test.ts
index 6c087d42..1fd9f615 100644
--- a/tests/bsan314-trava-conclusao.test.ts
+++ b/tests/bsan314-trava-conclusao.test.ts
@@ -16,11 +16,12 @@ process.env.LOG_LEVEL = "silent";
 type RunPhase = { readonly role: string | null; readonly status: string };
 
 async function montar(options: { readonly phases?: () => Promise<readonly RunPhase[]> } = {}) {
-  const [workOrders, checklists, { resolvePermissionsForRoles }, sync] = await Promise.all([
+  const [workOrders, checklists, { resolvePermissionsForRoles }, sync, { verifyCheckin }] = await Promise.all([
     import("../src/modules/work-orders/work-order.service.js"),
     import("../src/modules/checklists/checklist.service.js"),
     import("../src/modules/core-saas/permissions/catalog.js"),
     import("../src/modules/mobile/mobile-work-order-sync.js"),
+    import("../src/modules/work-orders/work-order.checkin.js"),
   ]);
   workOrders.resetWorkOrderRuntimeForTests();
   checklists.resetChecklistRuntimeForTests();
@@ -62,20 +63,26 @@ async function montar(options: { readonly phases?: () => Promise<readonly RunPha
   });
   await checklistService.publishTemplate(atorChecklist, template.id);
 
-  // A OS chega em "Em atendimento" (o caminho até lá não é o que este arquivo mede).
+  // A OS chega em "Em atendimento" (o caminho até lá não é o que este arquivo mede). O "No local" leva o veredito de
+  // check-in emitido por `verifyCheckin` pela porta da base (veredito `office`), como nas suítes `san3-26-*`: o
+  // invariante do B-SAN3-26 (`assertCheckinVerdictForStatus`) vale também para o arnês.
   const criarOsEmAtendimento = async (): Promise<string> => {
     const os = await memoryService.create(gestao as never, { title: "Reboque leve" });
     const repo = workOrders.getMemoryWorkOrderRepositoryForTests();
     let from = os.status;
     for (const status of ["assigned", "accepted", "on_route", "on_site", "in_progress"] as const) {
-      await repo.changeStatus({
+      const atual = await repo.findById(tenantId, os.id);
+      assert.ok(atual);
+      const feito = await repo.changeStatus({
         tenantId,
         workOrderId: os.id,
         status,
         expectedStatus: from,
         actorUserId: userId,
         message: "preparo do teste",
+        ...(status === "on_site" ? { checkin: verifyCheckin(gestao, atual, null, {}, "http_status_route") } : {}),
       } as never);
+      assert.ok(feito, `o arnês levou a OS a ${status}`);
       from = status;
     }
     return os.id;
```
```
ok 1 - OS com vistoria de entrega em andamento não conclui por changeStatus: 422 delivery_checklist_pending
ok 2 - OS sem execução de entrega conclui (OS legada, Pergunta 2 = (a))
ok 3 - entrega concluída: conclui
ok 4 - entrega pending_acknowledgement: conclui
ok 5 - entrega cancelled: conclui
ok 6 - cadeia reaberta: versão concluída + versão nova in_progress: 422; concluída a nova: conclui
ok 7 - falha da consulta recusa (fail-closed)
ok 8 - [sync] conclusão da OS com entrega em andamento pela fila do app sai como rejected/delivery_checklist_pending; concluída a entrega, a MESMA ação (mesmo client_action_id) é aceita
# tests 8
# pass 8
# fail 0
# skipped 0
```
Veredito: 8/8 verdes; nenhuma asserção dos 8 casos mudou; o veredito vem de verifyCheckin (porta da base, office), sem contornar assertCheckinVerdictForStatus.

### Passo 3 — E3.1 (trava na releitura) — Wed Nov 11 19:09:16 UTC 2026
```diff
diff --git a/src/modules/work-orders/work-order.service.ts b/src/modules/work-orders/work-order.service.ts
index 0cf675b9..404f2dc3 100644
--- a/src/modules/work-orders/work-order.service.ts
+++ b/src/modules/work-orders/work-order.service.ts
@@ -1601,6 +1601,16 @@ export class WorkOrderService {
     if (!updated) {
       const reread = await this.rereadAfterStatusMiss(actor, current.id); // B-SAN3-23:releitura-status
       await this.revalidateStatusChange(actor, reread, nextStatus); // B-SAN3-23:revalida-status
+      // B-SAN3-14 (Emenda 3, E3.1) — a trava R-A4 da entrada, de novo e na mesma ordem, sobre a OS relida: entre a
+      // 1ª leitura e a escrita pode ter nascido uma vistoria de entrega em aberto.
+      if (nextStatus === "completed" && (await this.hasOpenDeliveryChecklistRun(actor, reread))) { // B-SAN3-14:trava-na-releitura
+        throw new WorkOrderError(
+          DELIVERY_CHECKLIST_PENDING_HTTP_STATUS,
+          "WORK_ORDER_UNPROCESSABLE",
+          "delivery_checklist_pending",
+          "Conclua a vistoria de entrega antes de concluir a OS.",
+        );
+      }
       // Emenda 3, item 1 — o veredito é RECALCULADO sobre a OS relida, antes da regravação: a placa pode ter mudado.
       checkin = await this.verifyCheckinForStatus(actor, reread, nextStatus, body, entry); // B-SAN3-26:veredito-na-releitura
       fromStatus = reread.status;
```
Só o trecho da releitura (após revalidateStatusChange, antes do verifyCheckinForStatus); sem laço, uma regravação só.

### Passo 4 — teste novo tests/bsan314-trava-releitura.test.ts e mutação — Wed Nov 11 19:09:16 UTC 2026
Gancho: Proxy do repositório de memória como em b-san3-23-cas-retentativa (before[n]); acrescido after[n] porque a OS precisa voltar a in_progress entre a escrita que casou 0 e a releitura (in_progress é a única origem de 'completed'; o CAS compara só a situação). Porta das vistorias = composição de produção (references do createMemoryWorkOrderService).
```
verde: ok 1 - [E3.1] ... # pass 1 # fail 0
mutação: if (false && nextStatus === "completed" && ...) // B-SAN3-14:trava-na-releitura
not ok 1 - [E3.1] a entrega abre entre a leitura e a escrita (o CAS casa 0): a releitura recusa com delivery_checklist_pending e a OS não fica completed
  location: '/work/tests/bsan314-trava-releitura.test.ts:1:3759'
  error: 'Missing expected rejection.'
    async TestContext.<anonymous> (/work/tests/bsan314-trava-releitura.test.ts:140:3)
restaurado: git diff --stat → work-order.service.ts | 10 ++++++++++ (igual ao passo 3); teste de novo ok 1
```

### Passo 5 — bateria — Wed Nov 11 19:11:44 UTC 2026
```
$ for f in $(ls tests | grep -E "^(bsan314|san3-26|b-san3-23|field-dispatch)"); do node --test --import tsx tests/$f; done
b-san3-23-cancel-race-db.test.ts exit=0 # tests 21 # pass 21 # fail 0 # skipped 0 
b-san3-23-cas-retentativa.test.ts exit=0 # tests 10 # pass 10 # fail 0 # skipped 0 
bsan314-provisao-entrega-db.test.ts exit=0 # tests 4 # pass 4 # fail 0 # skipped 0 
bsan314-reabertura-fase.test.ts exit=0 # tests 2 # pass 2 # fail 0 # skipped 0 
bsan314-trava-conclusao.test.ts exit=0 # tests 8 # pass 8 # fail 0 # skipped 0 
bsan314-trava-releitura.test.ts exit=0 # tests 1 # pass 1 # fail 0 # skipped 0 
field-dispatch-checklist-set-port.test.ts exit=0 # tests 9 # pass 9 # fail 0 # skipped 0 
field-dispatch-multi-checklist.test.ts exit=0 # tests 18 # pass 18 # fail 0 # skipped 0 
field-dispatch-routes.test.ts exit=0 # tests 2 # pass 2 # fail 0 # skipped 0 
field-dispatch-target-role.test.ts exit=0 # tests 8 # pass 8 # fail 0 # skipped 0 
field-dispatch.test.ts exit=0 # tests 4 # pass 4 # fail 0 # skipped 0 
san3-26-checkin-conferencia.test.ts exit=0 # tests 25 # pass 25 # fail 0 # skipped 0 
san3-26-checkin-juncao-cas.test.ts exit=0 # tests 3 # pass 3 # fail 0 # skipped 0 
san3-26-checkin-normalizacao.test.ts exit=0 # tests 8 # pass 8 # fail 0 # skipped 0 
san3-26-checkin-ponto-unico.guard.test.ts exit=0 # tests 5 # pass 5 # fail 0 # skipped 0 

-db: conexão do arranjo do CI (postgres, migrações aplicadas: 'No pending migrations'); as partes de RLS rodam sob papel EFÊMERO criado pela suíte, com a postura asserida:
ok 4 - T4 · drill de RLS: papel sem bypass, lista vazia para outra organização e acesso cru sem contexto = 0
ok 5 - [A8] A1 sob papel NOSUPERUSER sem BYPASSRLS → a trava compartilhada funciona sob RLS: 422 work_order_cancelled; 0 item ativo
Tentativa extra (declarada): a suíte INTEIRA sob um papel fix546_app NOSUPERUSER NOBYPASSRLS CREATEROLE falha já no semeio do arnês ('new row violates row-level security policy for table work_orders/users'), 0 pass — o arnês semeia como dono por desenho (padrão B-O6R-06, ci.yml:220), não é efeito desta emenda. Papel removido (DROP OWNED; DROP ROLE → 0 linhas).

npm run check → exit 0 (tsc --noEmit)
npm run lint → exit 0
git diff --check → exit 0 · git diff --check e7da698d → exit 0
```

### Passo 6 — escopo — Wed Nov 11 19:11:44 UTC 2026
```
$ git diff --name-only e7da698d  (+ untracked)
src/modules/work-orders/work-order.service.ts
tests/bsan314-trava-conclusao.test.ts
tests/bsan314-trava-releitura.test.ts (novo)
```
Tudo ⊆ PERMITIDO da E3.3 (o diário entra no passo 7).

### Commits
1. `test(work-orders): o arnês da trava da entrega passa pelo check-in (B-SAN3-14, Emenda 3)` — 9204d7de
2. `fix(work-orders): a trava da entrega também na releitura do CAS (B-SAN3-14, Emenda 3)` — 0a091029
3. `docs(san3): diário da Emenda 3 do B-SAN3-14` — este

Sem push (o orquestrador empurra). O CI inteiro no head novo fica para depois do push.
