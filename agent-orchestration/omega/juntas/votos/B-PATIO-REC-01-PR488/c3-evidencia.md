# Evidência da cadeira C3 — junta do PR #488 (B-PATIO-REC-01)

- Identidade: `jurado-j488-c3-opus`. Modelo: Claude Opus 5.5 (`claude-opus-5-5`), nível menor DECLARADO.
- Cruzamento (item 11): **esta cadeira NÃO cruza modelo** — o dev (`dev-rec01-opus`) também é Claude. C1 e C2 são Codex.
- Objeto: `ea6d4aef54181a0dc4030ec56e174e378aec5e12`. Base: merge-base do PR.
- Competência: regressão, escopo e registro.

## Item 1 — Suíte

### 1a. CI: resumo TAP, objeto × base (merge-base `ceb62a07` = baseRefOid do PR)
- **Comando:** `gh api …/commits/<sha>/check-runs` + `gh run view <run> --json event,headSha`; depois `gh run view <run> --job <id> --log | sed (tira prefixo job/etapa/hora) | grep -E "^# (tests|pass|fail|skipped)|^not ok"` (logs em `revisoes/j488/c3-ci/*.log`).
- **Saída:**
  - base push `41636048324`: backend `125917408515` 4264/4262 pass/0 fail/2 skip; backend-postgres `125917408595` 493/493/0/0.
  - objeto push `41648819642`: backend `125961211365` 4301/4299/0/2; backend-postgres `125961211496` 502/502/0/0.
  - objeto pull_request `41648826865` (merge com main): backend `125961237691` 4408/4406/0/2; backend-postgres `125961237523` 502/502/0/0.
  - `not ok`: 0 linhas em todos os 6 logs.
- **Comando:** nomes de teste (`ok N - nome`, todos os níveis, sem o sufixo `# SKIP`) ordenados, `comm -23 base objeto` por job (mesma forma: push × push).
- **Saída:** sumiram 0 (backend) e 0 (backend-postgres); novos 37 (backend) e 9 (backend-postgres) — todos do REC-01 (T-DOM-*, T-ISO-*, T-MAQ-*, drill (a)/(b)). Skips: os mesmos 2 na base e no objeto (`toda permissão do catálogo existe…` e `os grants do papel GLOBAL…`, RBAC_DB_PARITY, ligados só no backend-postgres); backend-postgres 0 skip nos dois.
- **Veredito parcial:** VERDE. 4264→4301 (+37) e 493→502 (+9); nenhum teste sumiu, virou skip ou caiu. As suítes `-db` do REC-01 rodam (ok, não SKIP) nos dois jobs; o job `backend` tem serviço postgres e `migrate deploy` (ci.yml).

### 1b. Suítes do REC-01 no meu Postgres (`j488-c3-pg`, 127.0.0.1:55493, base `erp_c3`), worktree `C:/Users/thiag/w-j488-c3` em `ea6d4aef`, `npm ci` próprio
- **Comando:** `npm run db:generate` (com DATABASE_URL, R4) → gen=0; `npx prisma migrate deploy` → 120 migrações, "All migrations have been successfully applied"; `for t in tests/rec-01-*.test.ts; node --test --import tsx $t`.
- **Saída:** domain-db 7/7; intent-service 11/11; live-link-guard 1/1; migration-drill-db 2/2; routes-permissions 6/6; state-machine 3/3; validators 7/7 → **37 pass, 0 fail, 0 skip** (= os 37 novos do job backend; os 9 `-db` = os 9 novos do backend-postgres). 2ª rodada dos `-db`: 7/7 e 2/2. Depois de `npm run db:seed`: `RBAC_DB_PARITY=1 tests/permission-catalog-db-parity.test.ts` 2/2, 0 skip.
- **Vermelho-controle na base:**
  - `domain-db` contra a base `erp_c3_base` migrada com as 117 migrações de `ceb62a07` (`git archive ceb62a07 prisma prisma.config.ts` + `prisma migrate deploy`; `to_regclass('impound_payment_intents')` = nulo) → 8 testes, 0 pass, **8 fail**.
  - `migration-drill-db` com as 3 migrações novas retiradas do worktree (a forma da base; o drill lê `prisma/migrations/<nome>`) → 2 testes, **2 fail**; restaurado, `git status --porcelain` = 0.
  - as 5 suítes em memória com `src/` da base (`git checkout ceb62a07 -- src` + remoção dos 10 arquivos adicionados) → cada uma **1 fail** (módulo inexistente); restaurado com `git checkout ea6d4aef -- src`, porcelain 0.
- **Veredito parcial (item 1):** VERDE. Nenhum teste sumiu, virou skip ou caiu; as suítes do bloco passam no meu banco e ficam vermelhas na base.

## Item 2 — Escopo e guardas

### 2a. Diff do PR contra o PERMITIDO (§9.1 da v3 + §3.1 e §11.2 da emenda)
- **Comando:** `git merge-base ea6d4aef origin/main` → `ceb62a07` (= `baseRefOid` do PR, `gh pr view 488`); `git diff --name-status ceb62a07..ea6d4aef`; `git log --merges ceb62a07..ea6d4aef` → 0.
- **Saída:** 34 arquivos. Cada um no PERMITIDO: `ci.yml` (só +2 linhas em `SUITES` e comentário, hunk único l.312); `RBAC_MATRIX.md`; comando `agent-orchestration/codex/comandos/B-PATIO-REC-01-dominio-sem-rede.md`; `docs/patio-recebimento.md`; diário `docs/revisoes/PATIO/B-PATIO-REC-01-dev.md`; M-REC-1/2/7a (`20260890…`, `20260891…`, `20260892…`) + `schema.prisma`; `src/app.ts` (import + 1 `app.use`); `charge.service.ts` (só `getSettleableDueCents`, `grep -c '^-[^-]'` = 0); `catalog.ts` (+1 permissão no catálogo, +1 grant em `manager`, a mesma distribuição de `charging:settle`); os 10 arquivos de `src/modules/impound-payments/` = exatamente a lista do §9.1 + `index.ts`; `tests/core-saas.test.ts`, snapshot `role-catalog-contract.snapshot.json`; os 7 `tests/rec-01-*`; e as 3 guardas do §11.2.
- **PROIBIDO:** `Kpis/**` 0, lockfiles/`package.json` 0, `frontend/**`/`portals/**` 0, `src/modules/release/**` 0, `.claude/`/`.agents/` 0, nenhum outro arquivo de `src/` fora de pátio/charging além de `app.ts` e `catalog.ts` (permitidos nominalmente). `git diff --check ceb62a07 ea6d4aef` → ec=0, vazio.
- **Veredito parcial:** VERDE.

### 2b. As 3 guardas do §11.2
- **Censo — Comando:** `npx tsx tests/helpers/o6r07c-census.ts gravar c3-scratch/censo-obj.json` (sem DATABASE_URL) → "chaves vivas: 474 · VIOLAÇÕES: 0", ec=0; `cmp censo-obj.json <(git show ea6d4aef:tests/fixtures/o6r07c-classificacao-vias.json)` → **IGUAL byte a byte**. Diferença chave a chave contra `git show ceb62a07:…` (471 → 474): `+ GET …/online-payment LEITURA`, `+ GET …/online-payments LEITURA`, `+ POST …/online-payment SEM-ALCANCE-CAMPO`; `MIDDLEWARE (anônima) 114→116`, `tenantContextMiddleware 56→57`, `ROTEADOR /api/v1 59→60`; nada mais. `tests/o6r07c-census-guard.test.ts` 32/32.
- **FORCE 112→113 — Comando:** `git diff ceb62a07..ea6d4aef -- tests/san3-05-acessos-de-plataforma-guard.test.ts` → 1 linha −/+ (só a constante `ENABLE=113 FORCE=113 · acessores Prisma em FORCE=113`); nenhuma outra linha do arquivo (o congelado do inventário T13 não ganhou chave) e nenhum fixture de inventário no diff. Suíte no objeto 35/35. **Vermelho-controle:** a constante voltada a 112 no objeto (âncora = 1) → `T13` 2 fail; restaurado, porcelain 0. No meu banco: `relforcerowsecurity` 109 (base, 117 migrações) → 110 (objeto); a tabela nova FORCE é `impound_payment_intents` (`impound_payment_refs` sem RLS, como a M-REC-2 a cria).
- **Runtime 119→121 — Comando:** `git diff … -- tests/san3-05-runtime-role-guard-db.test.ts` → 1 linha −/+ (só o `119`→`121` da regex). Local (Windows) a suíte dá 8/12: os 4 fail são T14a/b/c/d por `setsid: ausente — necessário para impedir que psql \password leia a senha do terminal` (ambiente: a suíte só roda no Linux do job `backend`); não rodei em container Linux porque já havia 2 trabalhos Docker de jurados de pé (j488-c1-pg, j488-c3-pg; teto P8). **Medido por outro caminho:** no log do job `backend` do objeto (Linux) `ok 8 - T14a/b …` (l.18267) com a regex `…|121$`, e na base `ok 8 - T14a/b` com `119`; no meu banco, tabelas de `public` 119 (base) → 121 (objeto) = +`impound_payment_intents` +`impound_payment_refs`.
- **Veredito parcial:** VERDE. As 3 guardas mudaram exatamente o esperado.

### 2c. Nenhum mutante vivo no objeto
- **Comando:** `grep -cE` das âncoras das mutações do plano/emenda/pré-revisão no objeto + as suítes que as matam verdes (item 1b).
- **Saída:** `assertIntentAccount(account);` 1; `reconciliation_pending` no service 1; `assertRowsBelongToTenant` 3; `moneyToCents` no repo Prisma 6; `scope === "platform"` no validator 0; `AGENCY_FEE` nos types 0; `FORCE ROW LEVEL SECURITY` na M-REC-1 1; identidade `paid_amount = applied_amount + held_amount + refunded_amount` 1; `num_nonnulls(...) = 1` na M-REC-1 e na M-REC-2 1+1; `ON CONFLICT` na M-REC-7a 3; `overAccrued.has(line.id)` 1; UNIQUE `WHERE "status" IN ('pending', 'cancel_requested')` = `LIVE_LINK_STATUSES`; `charging:online_payment` só no catálogo e em `manager` (igual a `charging:settle`). `git status --porcelain` = 0 depois de todas as minhas mutações.
- **Veredito parcial (item 2):** VERDE.

## Item 3 — Registro

### 3a. Diário com contagens reproduzíveis
- **Comando:** `git log 2bc58290..ea6d4aef` → só `ea6d4aef docs(patio)…`, que muda só o diário (o CI citado no diário é do head `2bc58290`; o código é o mesmo). Re-execução no meu terreno: `[SB]` regressão (release, for-repair, core-saas, daily-engine); `[SB]` os 5 `rec-01`; `[UF] core-saas-role-authority`; `[DB]` rec-01-domain-db + drill + release-gate-concurrency + san3-05-leituras-de-plataforma-db; `[SB] permission-catalog-migration-parity`; `[DBP]` paridade; guard de migração; `npm run check`; `npm run lint`.
- **Saída:** 63/63 · 28/28 · 12/12 · 25/25 (= 7 + 2 + 3 + 13) · 3/3 · 2/2 · `migrações: 120 · anteriores: 112 · novas: 8 · violações: 0` · check=0 · lint=0. Todos 0 fail, 0 skip. **Iguais às do diário** (RETOMADA 0, 6 e 7: N = 93, M = 28 + 9 = 37). O CI do diário (4301/4299/0/2 e 502/502/0/0) é o mesmo que li no objeto (item 1a). A diferença com o M = 34 da emenda §3.1 está explicada no próprio diário (emenda §10: 28 `[SB]`; T-DOM-db-8 da §11.1 soma 1 aos 8 `[DB]`).
- **Veredito parcial:** VERDE.

### 3b. As 3 decisões do dev × emenda §11.3; RBAC_MATRIX; migrações
- **Comando:** leitura do diário (RETOMADA 1, 4, 4b, 5) contra `planos/…emenda-1.md` §11.3; `grep -nE "_cents" prisma/migrations/2026089*/migration.sql` e `git diff ceb62a07..ea6d4aef -- prisma/schema.prisma | grep '^+.*_cents'`; `git diff ceb62a07..ea6d4aef -- RBAC_MATRIX.md`; `grep -c '^BEGIN;'/'^COMMIT;'` e `^(DROP|DELETE|TRUNCATE)` por migração; `node scripts/migration-transaction-guard.mjs`.
- **Saída:**
  - "colunas de dinheiro" (leitura `*_cents` da RETOMADA 4) → substituída pela §11.1 e refeita na RETOMADA 5 (`*_amount` em reais, conversão só no repositório Prisma por `moneyToCents`/`centsToMoney`, T-DOM-db-8 com V1 e F4-M9); `_cents` como coluna: 0 nas 3 migrações e 0 no schema.
  - "`create` no F1" (RETOMADA 1) e "ordem do `create`" (RETOMADA 4b, corpo lido depois do canal e da conta; censo `SEM-ALCANCE-CAMPO`) → aceitas pela §11.3; o objeto segue as duas.
  - `RBAC_MATRIX.md`: +1 linha `online payment … uses the NEW charging:online_payment … super_admin, platform_admin, tenant_admin, manager: a MESMA distribuição de charging:settle`, com M-REC-7a citada.
  - M-REC-1, M-REC-2, M-REC-7a: `BEGIN;` 1 e `COMMIT;` 1 cada; DROP/DELETE/TRUNCATE 0; guard ec=0, 0 violações.
- **Veredito parcial (item 3):** VERDE.

## Achados
Nenhum, grave ou não grave. Nota de terreno (não é achado): a `san3-05-runtime-role-guard-db` não roda no Windows (`setsid` ausente); a constante 121 foi medida pelo log Linux do job `backend` do objeto e pela contagem de tabelas no meu banco.

## Limpeza
- Container `j488-c3-pg` removido (`docker rm -f`), sem tocar em `erp-postgres`/`erp-redis` nem em `j488-c1-pg`.
- Worktree `C:/Users/thiag/w-j488-c3` removido com `git worktree remove --force`.
- Ficam, como evidência: este arquivo, `c3-voto.json`, os 6 logs de CI em `c3-ci/` e o censo regenerado `c3-scratch/censo-obj.json`.

VOTO: APROVADO
