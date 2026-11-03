# B-PATIO-REC-01 — diário do dev

- **Autor:** `dev-rec01-opus`, Claude Opus 5.5, nível menor **DECLARADO**. Cobre a conta 1 do Codex (limite), por ordem do dono.
  Não escreveu o plano. **Verificador:** Codex (outro modelo, `D-UM-FAZ-OUTRO-VERIFICA`); depois, junta completa.
- **Plano:** v3 §9.1 + emenda 1 §3.1, §6.2.2, §8.2.5, §10.1 (fora do repositório, `erp-pausa-2026-10-03/planos/`).
- **Terreno:** worktree `C:/Users/thiag/w-rec01`, `npm ci` próprio (sem junction), Postgres descartável `rec01-pg` (`postgres:16`,
  `127.0.0.1:55467`, usuário `postgres` como no CI). Nunca `erp-*`, nunca 5432/3000/5173/6379.
- **Ambientes (v3 §9.0):** `[SB]` = `env -u DATABASE_URL -u RBAC_DB_PARITY node --test --import tsx …`; `[UF]` =
  `DATABASE_URL=postgresql://x:x@127.0.0.1:1/x`; `[DB]` = `DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:55467/postgres`;
  `[DBP]` = `[DB]` + `npm run db:seed` + `RBAC_DB_PARITY=1`.
- **Saídas TAP completas:** `C:/Users/thiag/erp-pausa-2026-10-03/rec01/` (fora do repositório).

## RETOMADA 0 — F0 (baselines), ref `origin/main` = `ceb62a07`

| comando | saída |
|---|---|
| `[SB] tests/release.test.ts tests/release-for-repair.test.ts tests/core-saas.test.ts tests/charging-daily-engine.test.ts` | `# tests 63 # pass 63 # fail 0 # skipped 0` (bate com a v3: 63) |
| `[UF] tests/core-saas-role-authority.test.ts` | `# pass 12 # fail 0 # skipped 0` (bate: 12) |
| `[DB] tests/release-gate-concurrency.test.ts tests/san3-05-leituras-de-plataforma-db.test.ts` | `# tests 16 # pass 16 # fail 0 # skipped 0` = 3 + **`N_san3` = 13** (12 subtestes T10–T12 + o teste-pai) |
| `npm run db:seed` + `[DBP] tests/permission-catalog-db-parity.test.ts` | `# pass 2 # fail 0 # skipped 0` (bate: 2) |

Leitura: as quatro baselines batem com a v3 §9.1 F0. `N_san3` fica fixado em **13**. N do bloco = 63 + 12 + 3 + 2 + 13 = **93**.

## RETOMADA 1 — F1 (tipos, máquina de estados como dados, validadores, repositório em memória; emenda §3.1)

- **Entrega:** `src/modules/impound-payments/impound-payment.{types,state-machine,validators,repository,service}.ts`. A máquina é
  a tabela `INTENT_TRANSITIONS` (estados da v3 §4.2, linhas das §4.4/§4.5, com gatilho, motivo e pergunta do dono). `IntentAccount`
  tem só `organization` e `group` (com `groupId`, emenda §6.2.3); `assertIntentAccount` recusa o resto com `account_not_allowed`.
- **Leitura minha, declarada (§A6):** a emenda põe o T-DOM-27 na F1 contra o `create` do serviço. Por isso o `create` (regras
  (a)-(h) da v3 §5.2) nasce já na F1, sobre portas injetadas; a F2 acrescenta o `getSettleableDueCents` do charging, a fiação de
  produção e os testes das regras (T-DOM-7..12, 24, 25, T-ISO-1).
- **V (V2, o módulo nasce na fatia)** — commit `test(…)` com o módulo ausente:
  `[SB] tests/rec-01-state-machine.test.ts tests/rec-01-validators.test.ts` → `ERR_MODULE_NOT_FOUND` nos 2 arquivos, `# tests 2 # pass 0`.
  Como é V2, as mutações abaixo são o vermelho de controle.
- **M** (âncora = 1, restauro por edição inversa com hash igual, `git status --porcelain` vazio depois de cada uma):

| # | arquivo · troca | resultado |
|---|---|---|
| F1-M1 | `impound-payment.state-machine.ts` · apagar a linha `funds_held → reversed` (E5) | `not ok 2 - T-MAQ-saidas-2` com `'funds_held sem saída incondicional'`; `# pass 9 # fail 1` |
| F1-M2 | `impound-payment.types.ts` · `PAYABLE_CHARGE_KINDS` + `"AGENCY_FEE"` | `not ok 9 - T-DOM-6` (deep-equal); `# pass 9 # fail 1` |
| F1-M3 (emenda) | `impound-payment.service.ts` · apagar `    assertIntentAccount(account);` | `not ok 10 - T-DOM-27`: `expected account_not_allowed, got created pending`; `# pass 9 # fail 1` |
| F1-M4 (emenda) | `impound-payment.validators.ts` · aceitar `record.scope === "platform"` | `not ok 10 - T-DOM-27`: `expected account_not_allowed, got created pending`; `# pass 9 # fail 1` |

- **C:** `[SB] tests/rec-01-state-machine.test.ts tests/rec-01-validators.test.ts` → `# tests 10 # pass 10 # fail 0 # skipped 0`
  (emenda §3.1: 10). `npx tsc --noEmit` → limpo.
