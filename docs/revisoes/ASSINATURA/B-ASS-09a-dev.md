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
