# B-TRC-01 · integração do #440 · relatório do dev

- **Dev:** `dev-trc01-integ440-opus` (Claude Opus, nível menor, declarado; identidade nova). Cobre a tarefa porque o
  Gemini caiu nela e o Codex/Argon estavam ocupados (`D-IAS-EXTERNAS-PRIMEIRO`). Não achou o defeito (quem achou foi o
  orquestrador) e não revisa.
- **Worktree / ramo / head:** `C:/Users/AMP/w-trc01`, `feat/traccar-b-trc-01` (PR #426), head `770a74c1`.
- **Defeito (achado pelo orquestrador):** depois do merge da `main` com o #440 (`40c3651f`), `AssignWorkOrderInput.event`
  passou a ser obrigatório; o auxiliar `assignVehicle` de `tests/traccar-position-ingestion-db.test.ts` não o passava, e
  `assignedEventData` lia `input.event.fromStatus` de `undefined` (4 casos vermelhos na CI).
- **Escopo:** só o auxiliar `assignVehicle` desse arquivo, mais este relatório.

## Passo 0 · terreno

- `git rev-parse --short HEAD` → `770a74c1`.
- `git diff --ignore-cr-at-eol --stat` antes do conserto → só `tests/traccar-position-ingestion-db.test.ts` (a tentativa
  do Gemini). Os ~55 ` M` em `.agents/agents/**` do `git status` são fantasmas de `core.autocrlf=true`: somem sob
  `--ignore-cr-at-eol`. Não foram tocados. Os untracked `.npmtest-503.log`, `check_md5.cjs` e `check_md5.js` também
  não são meus e ficaram como estavam.
- **Tentativa do Gemini substituída:** ela chamava `repo.loadOne(tenantId, workOrderId)`, método que **não existe** em
  `RlsPrismaWorkOrderRepository` (TS2339), e usava `wo!.status as any`. Foi trocada por `repo.findById(tenantId,
  workOrderId)`, que existe (`src/modules/work-orders/work-order-prisma.repository.ts:692`, envolve
  `withTenantRls` na mesma organização) e devolve `WorkOrder | undefined`, cujo `status` já é `WorkOrderStatus`. Por isso
  não há `as any` nem `!`.
- Codificação e EOL: `file` → `UTF-8 text` antes e depois; `grep -c $'\r'` → 0 no HEAD e 0 no arquivo editado (LF).

## Passo 1 · checagem de tipo

- `npx tsc --noEmit --target es2022 --module nodenext --moduleResolution nodenext --skipLibCheck --strict
  tests/traccar-position-ingestion-db.test.ts 2>&1 | grep traccar-position-ingestion-db` → **vazio** (grep exit 1).
- **Vermelho-controle:** o mesmo comando sobre o blob do HEAD (copiado a `tests/zz-ctrl-head-trc.test.ts` e removido
  logo depois) → `error TS2345: ... is not assignable to parameter of type 'AssignWorkOrderInput'` na linha 179. O
  comando enxerga o defeito; o conserto o remove.
- `npm run check` (`tsc -p tsconfig.json --noEmit`) → exit 0.

## Passo 2 · `traccar-position-ingestion-db` em container Linux

- Ferramenta lida antes: rede própria `tl<ts><pid>-net`, `postgres:16` e `redis:7` sem porta publicada, worktree
  montado `:ro` e copiado, `npm ci` + `prisma generate` + `migrate deploy` dentro do container, `trap` que remove os três
  containers e a rede pelo nome. Não toca `erp-postgres`/`erp-redis`.
- Comando: `bash C:/Users/AMP/erp-pausa-2026-10-03/ferramentas/teste-linux.sh C:/Users/AMP/w-trc01
  "CORE_SAAS_PERSISTENCE=prisma node --test --import tsx tests/traccar-position-ingestion-db.test.ts"`
- Saída: `# tests 22 · # pass 22 · # fail 0 · # cancelled 0 · # skipped 0 · duration_ms 19457` · `teste-linux ec=0`.
  `grep TypeError|fromStatus` no log → 0.
- **N = 22, fail 0.** Os 4 casos que a CI deu vermelhos (`ci426-failed.log`: "a viatura da OS é a do instante do fix",
  "OS anterior à migração fica ambígua", "a OS que tinha a viatura … continua na janela", "OS de OUTRA viatura que
  trocou de viatura …") são os `ok 11`, `ok 12`, `ok 14` e `ok 15` daqui. O log da CI serve de vermelho-controle do
  HEAD (`fail 4`).
- Resíduo: `docker ps -a` e `docker network ls` filtrados por `^tl` → vazio.

## Passo 3 · as 6 suítes `-db` do Traccar

- Comando (um só container): `bash C:/Users/AMP/erp-pausa-2026-10-03/ferramentas/teste-linux.sh C:/Users/AMP/w-trc01
  "CORE_SAAS_PERSISTENCE=prisma node --test --import tsx tests/traccar-binding-uniqueness-db.test.ts
  tests/traccar-idempotency-db.test.ts tests/traccar-ingest-pool-db.test.ts tests/traccar-position-ingestion-db.test.ts
  tests/traccar-quarantine-db.test.ts tests/traccar-resolution-race-db.test.ts"`
- Saída: `# tests 50 · # pass 50 · # fail 0 · # cancelled 0 · # skipped 0 · duration_ms 20768` · `teste-linux ec=0`.
- **N = 50, fail 0** (22 da ingestão mais 28 das outras cinco; `skipped 0`, logo nenhuma caiu no ramo sem
  `DATABASE_URL`).
- Resíduo `^tl` em containers e redes → vazio.

## Passo 4 · diff

- `git diff --stat --ignore-cr-at-eol` → `tests/traccar-position-ingestion-db.test.ts | 11 +++++++++--` (1 arquivo,
  9+, 2−). Este relatório é o único arquivo novo (untracked) que é meu.
- `git diff --check` → exit 0, sem saída.
- `git diff -U0 | grep -E '^[-+].*assert'` → nenhuma linha (exit 1). **Nenhuma asserção mudou**: `assert.ok(assigned,
  "a atribuição da OS existe")` segue como estava, e nenhum outro caso nem auxiliar foi tocado. A linha `if (!current)
  throw` é uma pré-condição do auxiliar (estreita o tipo sem `!` nem `as any`), não uma asserção de caso. Nos 22 casos
  ela nunca dispara.
- Nada em `src/**`, `prisma/**`, `.github/**` nem `Kpis/*`. Sem commit e sem push.

```diff
@@ -176,13 +176,20 @@ if (!connectionString) {
     operatorId: string,
     vehicleId: string,
   ): Promise<void> {
-    const assigned = await new h.workOrders.RlsPrismaWorkOrderRepository(h.role.client as PrismaClient).assign({
+    // O #440 (P-ATOMICA) exige o evento `work_order_assigned` na própria escrita: `fromStatus` é o status ATUAL da OS,
+    // lido pelo mesmo repositório, sob o RLS da mesma organização.
+    const repo = new h.workOrders.RlsPrismaWorkOrderRepository(h.role.client as PrismaClient);
+    const current = await repo.findById(tenantId, workOrderId);
+    if (!current) throw new Error(`OS ${workOrderId} não encontrada sob o RLS da organização antes da troca da viatura`);
+    const message = "B-TRC-01 ciclo 2 — troca sintética da viatura";
+    const assigned = await repo.assign({
       tenantId,
       workOrderId,
       operatorId,
       vehicleId,
-      message: "B-TRC-01 ciclo 2 — troca sintética da viatura",
+      message,
       assignedBy: operatorId,
+      event: { fromStatus: current.status, actorUserId: operatorId, message, metadata: {} },
     });
     assert.ok(assigned, "a atribuição da OS existe");
     await pause(STEP_MS);
```

## Fecho

- `event` passa a ser enviado assim: `fromStatus` = status atual lido por `findById` sob o RLS do mesmo tenant;
  `actorUserId` = `operatorId` (o mesmo valor de `assignedBy`); `message` = a mesma mensagem; `metadata: {}`.
- A tentativa do Gemini (`repo.loadOne`, método inexistente, mais `as any`) foi **substituída**. O diff contra o HEAD
  não tem resto dela.
- Limpeza: o arquivo de controle `tests/zz-ctrl-head-trc.test.ts` foi removido logo após o passo 1. Os containers e a
  rede da ferramenta foram removidos pelo nome nos dois passos (resíduo 0). Os logs dos passos 2 e 3 ficaram no
  scratchpad da sessão (`integ440-passo2.log`, `integ440-passo3.log`).
