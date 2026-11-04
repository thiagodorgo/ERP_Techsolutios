# Evidência — Junta PR #488 — C1 Dinheiro e Banco

- Cadeira: `C1`
- Identidade: `jurado-j488-c1-sol`
- Modelo: `Codex GPT-5.6 Sol` (nível menor declarado)
- Objeto: `ea6d4aef54181a0dc4030ec56e174e378aec5e12`
- Worktree: `C:/Users/thiag/w-j488-c1`
- Postgres descartável: `j488-c1-pg` em `127.0.0.1:55491`

## Item 1 — Identidade do dinheiro no banco

- **Comando:** `DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:55491/postgres node --test --import tsx tests/rec-01-domain-db.test.ts`; `env -u DATABASE_URL -u RBAC_DB_PARITY node --test --import tsx tests/rec-01-intent-service.test.ts`; `docker exec -i j488-c1-pg psql -X -U postgres -d postgres -v ON_ERROR_STOP=1` com sete `INSERT INTO impound_payment_intents` diretos e transacionais contra `money_identity_chk`, `open_states_money_chk`, `held_states_money_chk`, `reversed_money_chk`, `settled_money_chk`, `held_reason_pair_chk` e `money_nonnegative_chk`; `node --import tsx --input-type=module -e` importando `moneyToCents`/`centsToMoney` nas bordas `0.01`, `0.10`, `999999.99`, `0.005`; `docker exec j488-c1-pg psql ... SELECT input::numeric(12,2)`; vermelho-controle com âncora única `if (overAccrued.has(line.id)) continue;` removida, mesma suíte `rec-01-intent-service`, restauração literal e reexecução.
- **Saída resumida:** banco `7/7`, incluindo T-DOM-db-5 e T-DOM-db-8; serviço `11/11`, incluindo T-DOM-24 (`35000`, enquanto o resumo público permanece `38000`); os sete INSERTs retornaram `23514` e o nome exato da respectiva constraint; bordas: `0.01→1`, `0.10→10`, `999999.99→99999999`, `0.005→1`, e o PostgreSQL armazenou `0.005` como `0.01`; mutação: âncora `1`, `not ok T-DOM-24`, `expected 35000, got 38000`, `10 pass/1 fail/0 skipped`; restaurada, âncora `1`, `git diff --exit-code` e `git status` vazios, reexecução `11/11`.
- **Veredito parcial:** **APROVADO** — identidade, estado × dinheiro, conversão reais↔centavos e devido capado ao teto foram medidos no objeto e o vermelho-controle discrimina o defeito.

## Item 2 — Concorrência e link aberto

- **Comando:** `DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:55491/postgres node --test --import tsx tests/rec-01-domain-db.test.ts`; `env -u DATABASE_URL -u RBAC_DB_PARITY node --test --import tsx tests/rec-01-state-machine.test.ts`; vermelho-controle com contagem da âncora única `note: "DEVOLVER: a saída que existe sempre` = 1, remoção literal apenas da linha de transição `funds_held → reversed`/E5, mesma suíte T-MAQ-saídas, restauração e reexecução.
- **Saída resumida:** banco `7/7`: T-DOM-db-1 confirmou uma criação concorrente e um `23505 impound_payment_intents_live_link_key`; T-DOM-db-6 confirmou commit de `cancelled→funds_held` e `settled→disputed` com irmã `pending`; T-MAQ-saídas `3/3`; mutação: `not ok T-MAQ-saidas-2`, `funds_held sem saída incondicional`, `2 pass/1 fail/0 skipped`; restaurada, âncora `1`, `git diff --exit-code` e `git status` vazios, reexecução `3/3`.
- **Veredito parcial:** **APROVADO** — UNIQUE parcial segura a corrida sem bloquear destinos do dinheiro e a máquina não deixa estado sem saída; o vermelho-controle discriminou a retirada da saída incondicional.

## Item 3 — Migrações

- **Comando:** contagem `grep -Ec '^BEGIN;$'`/`'^COMMIT;$'` nas M-REC-1/2/7a; varredura do SQL executável sem comentários por verbos destrutivos no início de sentença; `node scripts/migration-transaction-guard.mjs`; `DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:55491/postgres node --test --import tsx tests/rec-01-migration-drill-db.test.ts`; `DATABASE_URL=... npm run db:seed`; `RBAC_DB_PARITY=1 DATABASE_URL=... node --test --import tsx tests/permission-catalog-db-parity.test.ts`; consulta direta dos grants; vermelho-controle com âncora única `ON CONFLICT (key) DO NOTHING;` = 1 substituída por `;` na M-REC-7a, mesmo drill, restauração literal e reexecução.
- **Saída resumida:** cada uma das 3 migrações trouxe `BEGIN=1 COMMIT=1`; nenhum `DROP`, `DELETE FROM`, `TRUNCATE` ou `ALTER TABLE … DROP` executável no `up`; guard `120 migrações · 112 anteriores · 8 novas · 0 violações`; drill `2/2`, incluindo deploy real, down→up, rollback total da M-REC-1 quebrada e idempotência; paridade `2/2`, `0 skipped`; grants de `charging:online_payment` apenas `manager`, `super_admin`, `tenant_admin`; mutação: `23505 permissions_key_key`, `1 pass/1 fail/0 skipped`; restaurada, âncora `1`, `git diff --exit-code` e `git status` vazios, drill repetido `2/2`.
- **Veredito parcial:** **APROVADO** — as M-REC-1/2/7a são transacionais e aditivas no `up`, o drill e a paridade passaram e o vermelho-controle provou a idempotência da M-REC-7a.
