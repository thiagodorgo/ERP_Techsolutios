## 8. Escopo permitido e proibido — arquivo a arquivo (carrega as emendas 1-a/b/c, 2-g/l e 3 dentro de si)

**PERMITIDO (e só isto):**
- `src/modules/inventory/inventory-prisma.repository.ts` — `lockItemForUpdate`, `ItemWriteLock`, leituras `*Locked` (**e a remoção das versões sem lock que decidem** — D-02), V1–V5,
  `mapTransientDbFailure` (+ uso em todo wrapper `Rls*`), mapeamento de P2002 nos wrappers de V3/V4/V5 (fora da tx).
- `src/modules/inventory/inventory.types.ts` — **só** `transferGroupInconsistentError()` (409) e `stockBusyError()` (503).
- `src/modules/inventory/cycle-count.types.ts` — `CYCLE_COUNT_STATUSES` += `"fechando"`; tipos `BeginCloseOutcome`, `RecordEntryOutcome`, `CancelOutcome`, `FinishCloseOutcome`,
  `AbortCloseOutcome`, `StampEntryInput`; `cycleCountBusyError()` (503); `closeIncompleteError()` (409); **`entryAlreadyAdjustedError()` (422), `closeInProgressError(n)` (422),
  `itemsInOpenSessionError(n)` (409)** — mensagens em PT-BR de negócio (§5).
- `src/modules/inventory/cycle-count.repository.ts` — interface (`beginClose`, `lockSessionForUpdate`, `findEntry`, `stampEntry`, **`abortClose`**, `finishClose` com `totalVarianceValue`,
  `recordEntryCount`/`cancelSession` com outcome; `createSession` recusando sobreposição; **sem** `applyClose`) + in-memory com a mesma máquina de estados e o resolvedor `avgCostOf`.
- `src/modules/inventory/cycle-count-prisma.repository.ts` — os métodos acima (`FOR UPDATE`/`FOR SHARE`/`FOR NO KEY UPDATE` tagged; CAS por `status` no `where`; SQL do total; consulta de
  sobreposição); wrapper `Rls*` com `mapTransientDbFailure`.
- `src/modules/inventory/cycle-count.service.ts` — `close` por unidades (porta + `hooks.beforeUnitCommit` + `abortClose` no `catch`), `recordEntry`/`cancel` mapeando outcomes; construtor com a
  porta; fábricas (`:245-281`, a de memória injeta `avgCostOf`).
- `src/modules/inventory/cycle-count.validators.ts` — tocar **só** se o dev medir que `parseOptionalStatus` não lê `CYCLE_COUNT_STATUSES` (`:59-64` lê).
- `src/modules/inventory/inventory-uow.ts` (NOVO) · `src/modules/inventory/inventory-uow-prisma.ts` (NOVO) · `src/modules/inventory/index.ts` (export, se preciso).
- `prisma/migrations/20260873000000_add_stock_movements_unique_backstops/migration.sql` (NOVO; texto do §4.1) · `prisma/schema.prisma` (**só comentário** junto da l.1508).
- `scripts/inventory-duplicates-census.sql` (NOVO; somente leitura; linha 1 do §4.2).
- `tests/inventory-balance-lock-race-db.test.ts` · `tests/inventory-cycle-count-close-units-db.test.ts` · `tests/inventory-unique-backstops-db.test.ts` ·
  **`tests/inventory-migration-drill-db.test.ts`** · `tests/inventory-write-paths-guard.test.ts` (NOVOS).
- `.github/workflows/ci.yml` — **só** as **4** linhas `SUITES="$SUITES tests/<suíte -db>.test.ts"` + 1 bloco de comentário no formato das vizinhas, **depois da l.249**
  (`tests/financial-entry-delete-reverse-race-db.test.ts`) e **antes da l.250** (`node --test --import tsx $SUITES`) `[03]`; a `P-O6R-B04-SUITES-LIST-CI` **não nasce** (emenda 1-c).
- `docs/revisoes/O6R/achados.jsonl` — **só** as 2 linhas `Ω6R-DAT-002` e `Ω6R-DAT-003`: `"status": "fechado"`, `"fechado_por": "B-O6R-04a (PR na autoria; nº e hash no backfill pós-merge — §C3.5)"`,
  `"fechado_em"`, `"evidencia_fechamento"` (forma do #385 `[06]`), e **no DAT-003 o campo novo `"nota_criterio"`** (A-DAT; texto do `[06]`) — `correcao`/`teste` originais intactos.
- `docs/revisoes/O6R/REGISTRO_ACHADOS_O6R.md` — **só** as 2 seções `### [Ω6R-DAT-002]`/`### [Ω6R-DAT-003]`: linha `- Status: **fechado** em <data> pelo \`B-O6R-04a\` (PR na autoria; …)` +
  parágrafo do conserto; no DAT-003, a linha `- Nota de critério (§A2): …` (`[06]`).
- `agent-orchestration/**` · `Kpis/kpis-latest.json`, `Kpis/kpis-history.json`, `Kpis/kpis-history.md`, `Kpis/app.js` (só o fallback via `kpi-freeze.mjs`), `Kpis/index.html` se a hidratação
  exigir. Em `kpis-latest.json` (K-01): `production_readiness.p0_fechados` **fica 13**, `fechados` **inalterado**, **`aguardando_merge = [{id: Ω6R-DAT-002}, {id: Ω6R-DAT-003}]`** e
  `nota_aguardando` no texto do `[06]`; **`findings.itens[DAT-002/003].status = "fechado"`**; `roadmap.blocos[B-O6R-04].estado = "parcial"` (QUA-002 segue `ativo`).

**PROIBIDO (o dev reporta, não decide — rito 3):** `src/modules/inventory/inventory.service.ts`, `inventory.repository.ts` (in-memory de estoque — o resolvedor `avgCostOf` consome
`findItemById` existente), `inventory.routes.ts`, `inventory.controller.ts`, `cycle-count.routes.ts`, `cycle-count.controller.ts` (a auditoria já grava `report.totalVarianceValue`),
`inventory.calculations.ts`, `inventory.abc.ts`; `src/modules/mobile/**` (04b), `src/modules/fuel-logs/**`, `src/modules/maintenance-orders/**`, `src/modules/checklists/**`,
`src/database/**` (o `withTenantRls` NÃO ganha opções; timeout NÃO sobe — emenda 2-h), `src/modules/core-saas/**` (`sendRouteError` não muda), `tests/helpers/**` (só consumo), `frontend/**`,
`mobile/**`, `API_CONTRACTS.md`, `RBAC_MATRIX.md`, `.env`, lockfiles, qualquer outra migração, qualquer outra linha de `.github/workflows/**` e de `docs/**`. Migração destrutiva = parada
irredutível (§C7.5). **Nenhuma coluna nova** (o total é derivado; o "item em sessão aberta" é consulta, não coluna).
