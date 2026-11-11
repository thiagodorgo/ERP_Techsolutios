# B-ASS-09a — diário de dev (incremental, P1)

Bloco **B-ASS-09a** — rateio automático a partir da importação (item 61 do portão). Bloco de DINHEIRO, junta completa.
Identidade de dev: **`dev-09a-cl`, Claude Opus 5.5 (subagente da sessão), nível menor, DECLARADA** (§C7 item 11(6)).
Exceção declarada: o plano pede Codex; o Codex 1 está sem cota semanal até 16/11, o Codex 2 está na pré-revisão do #536 e a
API está no limite do dia até 21:00. Pré-revisão e conferência: de outro modelo (Codex 2, ou a API depois das 21:00).
Não escrevi o plano nem o critiquei.

- **Plano:** `erp-pausa-2026-10-03/planos/plano-B-ASS-09a-v2.md` + **Emenda 1** (R2-01 a R2-12). Fora do repositório.
- **Ramo:** `feat/rateio-automatico-importacao` · **worktree:** `C:/Users/thiag/w-09a` · `npm ci` próprio (sem junction) ·
  `npx prisma generate`.
- **Base:** `origin/main` = `a0979f51` (#530, B-ASS-08b, com a G14 `20260901000000_ass08b_provider_one_enabled_per_kind`).
  O plano mediu em `d0da291e`; `git diff --name-only d0da291e a0979f51` toca, do que o bloco usa, só
  `src/infra/jobs/job-worker.bootstrap.ts`, `job.registry.ts`, `job.types.ts` e `tests/job-worker-bootstrap.test.ts` (o #530).
  Nenhum arquivo de `cloud-cost*`/`cloud-costs` mudou, então os `arquivo:linha` do plano valem. **A trava com o #530 (§4) não
  se aplica mais:** o #530 já está na base.
- **Banco:** Postgres 16 descartável `dev09a-pg` em `127.0.0.1:55496`.
- **Recomendações do §9 adotadas por padrão (NÃO decisões do dono):** 1(a), 2(a), 3(a); e o comportamento da P4 (R2-05).

## Fatias

| fatia | comando | saída resumida | veredito parcial |
|---|---|---|---|
| F0 | âncoras: `git grep -c -F -- '<X>' -- src` na base `a0979f51` | `id: input.id,` 0 · `import_id: input.importId` 0 · `where: { id: runId, status: "pending" }` 0 · `onImportCompleted` 0 · `costSource` 0 · `import_auto` 0 · `autoAllocation` 0 · `sourceBillingPeriod` 0 · `MAX_AUTO_ALLOCATION_PERIODS_PER_IMPORT` 0 · `gt: periodStart` 0 · `return createMemoryCloudCostService();` 1 · `rule.allocationMethod` 1 · a regex de invisíveis 1 | as âncoras † estão em 0, como o plano mediu |
| F0 | `CORE_SAAS_PERSISTENCE=memory node --test --import tsx tests/ass-09a-rateio-automatico.test.ts` (só T4m e T4m-b, código de produção intocado) | `not ok 1 - T4m` `expected: 30` `actual: 130` · `not ok 2 - T4m-b` `expected: '…0003'` (Y, novembro) `actual: '…0002'` (X, só outubro) · `# tests 2 # pass 0 # fail 2` | **vermelho-controle por asserção** do R4, nos dois lados (linha e escolha da importação) |
| F0 | `CORE_SAAS_PERSISTENCE=memory node --test --import tsx tests/cloud-cost-allocation.test.ts` (T12 e T-AUTO-6 novos, produção intocada) | `ok 1..7` (os 7 de antes) · `not ok 8 - T12`: `actual [['storage_usage_weight','audited_actions_count'],…]` · `not ok 9 - T-AUTO-6`: `AmazonCloudWatch/CW:Requests` `actual costCategory: 'api_requests'` sem `estimate` × `expected 'monitoring'`, `estimate: true` · `# tests 9 # pass 7 # fail 2` | **vermelho-controle por asserção** do R8 e do R5. Os casos entram no commit da F6, que os deixa verdes |
| F1m | `ls prisma/migrations \| tail -1` na base | `20260901000000_ass08b_provider_one_enabled_per_kind` (a G14 do #530); o PR aberto #537 traz `20260901090000_…` | carimbo da M-09a = `20260902000000`, maior que os dois |
| F1m | `node scripts/migration-transaction-guard.mjs` (antes do drill) | `G6 20260902000000_ass09a_allocation_run_import_id: falta o drill por prefixo` · `violações: 1` | a M-09a cai sob G2 (4 sentenças com `BEGIN;`/`COMMIT;`), e o G6 exige o drill (R2-03) |
| F1m | `DATABASE_URL=…55496/erp_09a node --test --import tsx tests/ass-09a-import-id-migration-drill-db.test.ts` | `ok 1` deploy (coluna, FK `confdeltype='n'`, índice) · `ok 2` down em 1 transação, backfill preenchido/NULL/NULL/NULL (UUID inexistente, `'nao-e-uuid'`, `null`) e SET NULL ao apagar a importação · `ok 3` prefixos k=1..4 atômicos · `# tests 3 # pass 3 # fail 0 # skipped 0` (56 s) | drill verde; guard depois: `violações: 0` |
| F1m | **M6b** (apagar a sentença `UPDATE "cloud_cost_allocation_runs" …` do `migration.sql`) e o drill de novo | `not ok 2`: `+ actual null` × `- expected '107ddbea-…'` (os 4 casos viram NULL) · `not ok 3` · `# pass 1 # fail 2`; `cmp` com o original depois de restaurar | **vermelho**, restaurado |
| F1m | `DATABASE_URL=… node --test --import tsx tests/ass-09a-rateio-automatico-db.test.ts` (só T-M09a-db) | `ok 1 - T-M09a-db` (coluna `uuid`, FK para `cloud_cost_imports` com `confdeltype='n'`, `createRun` grava, apagar a importação anula) · `# skipped 0` · o código sob teste roda no papel efêmero (`rolsuper=false`, `rolbypassrls=false`, asserido) | verde |
| F1m | **M6** (`    import_id: input.importId ?? null,` → apagada, âncora com contagem 1) | `not ok 1 - T-M09a-db` · `createRun grava a coluna import_id` · `expected: 'c2331104-…'` `actual: ~` | **vermelho**, restaurado |
| F1 | `CORE_SAAS_PERSISTENCE=memory node --test --import tsx tests/ass-09a-rateio-automatico.test.ts` | `ok` T4m, T4m-b, T2b, T2, T4, T5, T5-cap, T9c · `# tests 8 # pass 8 # fail 0` | verde. T4: exclusiva out 100 + nov 30 = **130** (janelas `…-10-31T23:59:59.999Z` e `…-11-30T23:59:59.999Z`), sobrepostos 40 + 7 = **47**, inclusiva 1 run com fim intacto `…-06-30T23:59:59.000Z` e Σ = total; repetir mantém |
| F1 | mutações (`mutrun.mjs`: âncora X conta 1 → aplica Y → roda → restaura e confere byte a byte) | **M2** (`return randomUUID();`): `not ok` T2b, T2, T4, T5-cap por `randomUUID is not defined` (o Y literal não compila em runtime: o módulo não importa `randomUUID`) · **M2 suplementar** (`return globalThis.crypto.randomUUID();`): `not ok` T2b, T2, T4 por asserção (`created` 2 a cada passada) · **M2b**: `not ok` T2b (`…-468b-…` × `…-568b-…`) · **M4a**: `not ok` T4 (A = **47**, esperado 40) · **M4b**: `not ok` T4 (A = 47) · **M4d**: `not ok` T4m (`actual: 130`) · **M4e**: `not ok` T4m-b (escolhe X) · **M5a**: `not ok` T5 (o serviço recusa: `Cloud cost import must exist and be completed.`) · **M11**: `not ok` T5-cap (`created: 25`, `outcome: 'ensured'`) · **M9c**: `not ok` T9c (`created: 1`) | as 10 vermelhas, todas restauradas (`restaurado=true`) |
| F1 | regressões em memória (`cloud-cost-allocation`, `-routes`, `san3-03-*`, `aws-cur-cost-*`, `job-worker-bootstrap`, `ass-03-rateio-banco`, `financial-period-lock-guard`, `o6r06-janela-reservada-guard`) com o R4 aplicado | `# tests 123 # pass 116 # fail 2 # skipped 5` · os 2 `not ok` são T12 e T-AUTO-6 (F6, vermelhos de propósito); os 5 pulados são `-db` sem `DATABASE_URL` | o R4 não regride o caminho manual |
| F1 | **leitura do dev, declarada (§A6):** a escolha das linhas por `sourceBillingPeriod` (plano §2.2.2, listada na F3) entrou já na F1, no corpo de `executeAllocationRun`, porque o T4 (P3, dono da F1) não fica verde sem ela. A F3 só extrai o corpo para `runAllocation` e põe a reivindicação. O desenho não muda | — | sem mudança de escopo |
