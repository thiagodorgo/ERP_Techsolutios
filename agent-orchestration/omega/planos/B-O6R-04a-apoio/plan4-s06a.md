## 6. Testes de encerramento — cada caso com vermelho-controle no head-base ou controle embutido (o cenário do crítico, reproduzido)

**Arnês comum das suítes `-db`** (inalterado do v2 §6; padrão `o6r06-usage-atomic-db.test.ts:30-37` + `financial-entry-delete-reverse-race-db.test.ts:1-60`): DB-gated **só** por
`DATABASE_URL` ausente (um `test(nome, { skip })` por arquivo — conta no piso do runner; com `DATABASE_URL` presente nenhuma delas pula, o orçamento `SKIP_BUDGET_DB = 2` é só dos 2 casos RBAC
`[03]`); `CORE_SAAS_PERSISTENCE = "prisma"` antes de qualquer import; admin com `withApplicationName` + `assertApplicationNamePropagated`; **dois papéis efêmeros** (`createEphemeralRole`,
`NOSUPERUSER … NOINHERIT` + `GRANT SELECT, INSERT, UPDATE, DELETE`) com postura asserida por `pg_roles` — falha ao criar = vermelho, nunca skip; os serviços sob teste rodam nos clientes dos papéis;
o admin só semeia, observa `pg_stat_activity` e faz teardown escopado por `tenant_id` em ordem de FK — nunca wildcard. Barreira = `waitForOwnBlockedStatement` por `application_name`
(`pg-barrier.ts:91-113`). `40P01` nunca aceitável. `RACE_N = 10`. "Head-base" = `[04]`/`[07]`/`[09]`/`[10]` (minha execução); o dev reexecuta contra `02bd7dab` (§10 passo 9).
**Emulações embutidas como controle vermelho** (v2 e v1) vivem no arquivo de teste, em SQL cru, e ficam marcadas `// CONTROLE VERMELHO — não é o código do bloco`.

### T-A `tests/inventory-balance-lock-race-db.test.ts` — V1–V5 + I7 + transitório (fecha `Ω6R-DAT-002` + `P-020`) — inalterado do v2, com o gancho de A12 dentro da tx

| caso | forma | verde | vermelho-controle |
|---|---|---|---|
| A0 | postura dos 2 papéis; tag; `read committed` | `false/false` ×2; tag; `read committed` | n/a (`[04]` PRE) |
| **A1 [encerramento]** | item BASE=10; 20 saídas de 1 (10 por A + 10 por B, largada comum) × RACE_N | saldo ≥ 0; **exatamente 10** ok + 10 × 409; 0 × `40P01`; 0 × `P2028` | v2 `[10-P1]`: 20 ok, saldo −10 |
| **A2 [barreira]** | admin: tx crua `FOR UPDATE` do item + INSERT −10 sem commit; B `createMovement(−1)`; barreira `fragment: "tenant_id"`; admin commita | 1ª asserção: B → 409 e saldo 0; 2ª: texto bloqueado ∋ `inventory_items` | v2 `[10-P11-hb]`: B commita, saldo −1 (vermelho pela invariante) |
| A3–A6 | `link` ×20; `ajuste −1` ×20; saída de custódia viatura ×20; `createExitForSource` ×20 fontes | saldo ≥ 0; 10/10 | mesma classe de P1 |
| **A7 / A7b** | `reverseMovement` ×2 do mesmo movimento × RACE_N; estorno ×2 de um `link` | **1** compensação (2 para o par), perdedor 409 | v2 `[10-P3]`: 2 |
| **A8** | `removeExitForSource` ×2 da mesma fonte × RACE_N | 1; perdedor `undefined` | v2 `[10-P5]`: 2 |
| **A9** | entrada 10@3 ×2 sobre 10@1 | `avg_cost = 2.333333` | v2 `[10-P7]`: 2,0 |
| **A10** | `createExitForSource` ×2 MESMA fonte × RACE_N | mesmo `id`; 0 × `25P02` | v2 `[10-P9]`: `25P02` 10/10 |
| A11 | saída no item de T2 sob contexto de T1 | `undefined` (→ 400); 0 linhas em T2 | n/a |
| **A12 [I7 × open/abc]** | `close` v3 com `beforeUnitCommit` segurando sessão + X 1,5 s **dentro da tx**; B: `open()` real e, noutra rodada, `recalculateAbc()` real | B **bloqueia** (texto ∋ `cycle_count_entries` / `abc_class`) e conclui; 0 × `40P01` | controle vermelho em B8(i) |
| A13 | forma (saída simples; acima do saldo) | movimento; 409 com saldo | regressão |
| **A14 [transitório → 503]** | admin segura `FOR UPDATE` 5,5 s; B `createMovement`; + `mapTransientDbFailure` com os 3 formatos | 503 `stock_busy`, nada gravado | v2 `[10-TOK]`: `P2028` cru (400) |
