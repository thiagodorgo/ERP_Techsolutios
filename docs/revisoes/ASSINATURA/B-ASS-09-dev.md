# B-ASS-09 — diário de dev (incremental, P1)

Bloco **B-ASS-09** — visão de custo × assinatura por organização, grupo e global, com câmbio (item 61 do portão). Bloco de
DINHEIRO e de BANCO, junta completa.

- **Identidade:** `dev-ass09-cl`, Claude Opus 5.5 (subagente da sessão), nível menor, **identidade de dev declarada**
  (§C7 item 11(6)). Não escrevi nem critiquei o plano.
- **Fatias deste dev:** F0 (**cobrindo o braço, declarado**: as contas Codex estavam sem janela e depois na junta J-555, e o
  DeepSeek no horário de pico), F4 e F5. As F1, F2 e F3 seguem do braço.
- **Plano:** `erp-pausa-2026-10-03/planos/plano-B-ASS-09-v2.md` + **Emenda 1** (`…-v2-emenda1.md`, prevalece). Fora do
  repositório.
- **Autorização de `prisma/**`:** P1 de 31/10, `D-COBRANCA-RESPOSTAS-3110`.
- **Banco:** Postgres 16 descartável próprio em `127.0.0.1:55561` (`initdb` com `timezone` e `log_timezone` em UTC antes do
  start). Nunca a base viva, a 5432 nem a 6379.

## F0 — ramo `feat/ass-09-visao-custo` (worktree `C:/Users/thiag/w-ass09`)

| passo | comando | saída resumida | veredito |
|---|---|---|---|
| worktree | `git fetch origin` · `git worktree add -b feat/ass-09-visao-custo C:/Users/thiag/w-ass09 origin/main` | `HEAD is now at d29b3bef` (#558) | base = `origin/main` `d29b3bef3041a5e383885b01b28595817d7b15d5` |
| `npm ci` | `npm ci` no worktree (sem junction) · `DATABASE_URL=…55561/erp_ass09 npm run db:generate` | `exit=0` · cliente gerado | terreno próprio |
| baseline N (CI) | `gh run view 43530268818 --job 132245927735 --log` (job `backend` da `main` `d29b3bef`, evento `push`, `success`) e `grep -E '# (tests\|pass\|fail\|skipped)'` | `[run-backend-tests] 550 arquivo(s) · 5554 teste(s) · pass 5552 · fail 0 · skipped 2` · `# tests 5554 # pass 5552 # fail 0 # cancelled 0 # skipped 2` | **N (job `backend`) = 5554**, 0 falha, 2 pulos (os de sempre) |
| baseline N (CI) | `gh run view 43530268818 --job 132245927975 --log` (job `backend-postgres`) | `# tests 621 # pass 621 # fail 0 # skipped 0` · `testes pulados: 0` | **N (job `backend-postgres`) = 621**, 0 pulo |
| baseline das regressões do plano §11 (memória, local) | `CORE_SAAS_PERSISTENCE=memory node --test --import tsx` nas 14 suítes do §11 (`cloud-cost-allocation`, `-routes`, `san3-03-summary`, `san3-03-system-org`, `san3-03-conservation`, `ass-09a-rateio-automatico`, `ass-04-statement-engine`, `-inputs`, `-routes`, `ass-02-plans-subscription`, `ass-01-markup-retirado`, `core-saas`, `permission-catalog-migration-parity`, `san3-05-acessos-de-plataforma-guard`) | `# tests 211 # pass 211 # fail 0 # skipped 0` | igual ao que a crítica r1 mediu (211) |
| baseline das regressões do plano §11 (Postgres, local) | `DATABASE_URL=…55561/erp_ass09` (migrado com `npx prisma migrate deploy`, 134 migrações) e `node --test --import tsx` em `san3-05-leituras-de-plataforma-db`, `san3-03-system-org-db`, `ass-09a-rateio-automatico-db`, `ass-03-metering-census-db` | `# tests 44 # pass 44 # fail 0 # skipped 0` | o plano estimava ≈ 31; o executado vale: **44** |
| vermelho-controle | sonda fora do repositório: `createApp().listen(0)` e `fetch` nas 10 rotas R1–R10 com `x-role: super_admin` | as 10 → `404 {"error":{"code":"NOT_FOUND","reason":"route_not_found","message":"Route not found."}}` | **vermelho**: nenhuma rota do bloco existe na `main` |
| vermelho-controle | `psql … -d erp_ass09` (base migrada da `main`): `pg_class` com `economic_groups`, `economic_group_members`, `platform_fx_rates`; `pg_extension` | `<nenhuma>` · extensões `plpgsql,pgcrypto` | as 3 tabelas e o `btree_gist` não existem |
| carimbo livre | `ls prisma/migrations \| grep -c '^[0-9]'` · última · `grep -c 20260903000000` · `migration_lock.toml` | `134` · `20260902000000_ass09a_allocation_run_import_id` · `0` · ausente | `20260903000000` livre na `main` |
| carimbo livre | `gh pr list --state open` (5 PRs: #559, #555, #554, #419, #393) e `gh pr view <n> --json files` filtrando `prisma/` | só o #554 toca `prisma/`, e só `seed*.ts` (`seed-fleet.ts`, `seed-users.ts`, `seed.ts`); nenhum cria migração | carimbo livre também nos PRs abertos |
| registro | `agent-orchestration/controle/decisoes.md`: acréscimo `REGISTRO-ASS09-CONFLITOS` (D-1 a D-11 e a Q6) no fim do arquivo | `git diff --stat`: `58 insertions(+)`; `git diff -U0 … \| grep -c '^-[^-]'` = `0` | só acréscimo |
| comando do bloco | `agent-orchestration/codex/comandos/B-ASS-09-visao-custo-margem.md`, no molde de `comando-template.md`, com a autorização da M6 citada pelo nome | — | nome do arquivo = o do PERMITIDO do plano §7 (ver nota abaixo) |

**Nota (divergência de nome, declarada):** o mandato do orquestrador pede `B-ASS-09-visao-custo.md`; o PERMITIDO do plano
§7 lista `agent-orchestration/codex/comandos/B-ASS-09-visao-custo-margem.md`. Segui o PERMITIDO, porque a conferência
`git diff --name-only origin/main...HEAD` ⊆ PERMITIDO vale antes de cada commit. Trocar o nome é uma linha.

### Tabela de âncoras (Emenda 1 §1.2, re-medida)

`git rev-parse origin/main` → **`d29b3bef3041a5e383885b01b28595817d7b15d5`** (#558). A Emenda 1 mediu em `24f7e792`;
entre as duas entraram `5728df31` (#557, B-ASS-08c-wh) e `d29b3bef` (#558, B-SAN3-24d).

| âncora | ref | linha medida | comando | igual à Emenda 1? |
|---|---|---|---|---|
| `PLANO_SAN3.md`, item 60 | `d29b3bef` | l.143 | `git show <ref>:docs/revisoes/SAN3/PLANO_SAN3.md \| grep -nE '^\| *6[01] *\|'` | sim |
| `PLANO_SAN3.md`, item 61 | `d29b3bef` | l.144; `grep -cE '^\| *61 *\|'` = **1**; ainda cita `cloud-charge.engine.ts:80-97` e `PlatformCloudBillingPage.tsx:122-124,139` | idem + `grep -oE` dos dois textos | sim (conteúdo igual) |
| `PLANO_SAN3.md`, linha do `B-ASS-09a` | `d29b3bef` | l.325 | `grep -nE` dos ids de bloco | sim |
| `PLANO_SAN3.md`, linha do `B-ASS-09` | `d29b3bef` | l.326; ``grep -cF '`B-ASS-09` · `feat/subscription-cost-overview`'`` = **1**; ainda diz `\| backend \|` | idem | sim (conteúdo igual) |
| `PLANO_SAN3.md`, linha do `B-ASS-10b` | `d29b3bef` | l.327 | idem | sim |
| `ci.yml`, lista curada `SUITES=` | `d29b3bef` | l.199-345; `grep -c 'SUITES="\$SUITES'` = **72**; a última é `SUITES="$SUITES tests/b-material-sync-db.test.ts"` (l.345) | `git show <ref>:.github/workflows/ci.yml \| grep -n 'SUITES='` | sim |
| `ci.yml`, `node --test … tee postgres-subset.tap` | `d29b3bef` | l.346 | `grep -n 'tee postgres-subset.tap'` | sim |
| `ci.yml`, guard de zero pulos | `d29b3bef` | l.351-356 | `grep -nE 'Fail on skipped\|skipped=\|test "\$skipped"'` | sim |
| `ci.yml`, job `backend-postgres` | `d29b3bef` | l.131-357 (o `antivirus` abre na l.358) | `grep -nE '^  [a-z-]+:$'` | sim |
| `ci.yml`, regra "toda suíte `-db` nova entre AQUI" | `d29b3bef` | l.295 | ``grep -n 'toda suíte `-db` nova'`` | sim |
| `ci.yml`, job `backend`: `DATABASE_URL`, `postgres:16` | `d29b3bef` | l.31-130, l.40, l.53, l.149 | `grep -nE 'DATABASE_URL: postgresql\|image: postgres:16'` | sim |
| `ci.yml`, `ass-09` na lista | `d29b3bef` | `grep -c ass-09` = **0** | idem | sim |
| fontes (`statement.engine.ts:187-188`, `statement.types.ts:70-73`, `cloud-charge.engine.ts:80`, `cloud-cost-allocation.service.ts:313-317`, `API_CONTRACTS.md` l.291 e l.308-310, `ass-05b-audit-allowlist.test.ts:60`, `san3-05-leituras-de-plataforma-db.test.ts:72`, `cloud-charge-markup-rules.test.ts:13`, `subscription-billing.md:108`, `subscription-billing.platform.routes.ts` l.6/9/35, página de 140 linhas, `cloud-billing.adapter.ts` l.26/35/50-54/134) | `d29b3bef` | todas batem (`sed -n` em cada uma) | `git show <ref>:<arquivo> \| sed -n '<l>p'` | sim |
| `git diff 24f7e792 d29b3bef` no conjunto de fontes da Emenda 1 §1.1 | `d29b3bef` | **não é vazio**: 3 arquivos, todos fora das âncoras — `subscription-billing/providers/provider-config.service.ts` (+6 −0), `webhooks/subscription-billing.webhook.routes.ts` (+47 −4), `webhooks/webhook-runtime.ts` (+8 −4), todos do #557. `statement.engine.ts`, `statement.types.ts`, `subscription-billing.platform.routes.ts`, `platform-audit/audit-metadata.ts`, `metering/censored-tables.ts`, `index.ts` e `subscription-billing.service.ts`: iguais | `git diff --stat 24f7e792 <ref> -- <conjunto>` e `git diff --quiet` por arquivo | as âncoras valem; os 3 arquivos que mudaram estão no PROIBIDO deste bloco (`providers/**`, `webhooks/**`) e não são âncora. Não é divergência de conteúdo (Emenda 1 §1.2(3)) |
| `decisoes.md`: `D-CUSTO-PLATAFORMA-LINHA-PROPRIA`, `D-COBRANCA-RESPOSTAS-3110` | `d29b3bef` | l.4160, l.4179 | `grep -nE` dos dois ids | sim |
| `prisma/migrations` | `d29b3bef` | 134; última `20260902000000_…`; `20260903000000` livre; `migration_lock.toml` ausente | `ls` | sim |
| `pendencias.md`, dono `B-ASS-09` | `d29b3bef` | `git diff 24f7e792 <ref> -- …pendencias.md \| grep -c B-ASS-09` = **0** (o arquivo ganhou 35 linhas de outros blocos) | idem | sim: nenhuma nova com dono `B-ASS-09` |
| fora do repositório (`REGISTRO-PENDENTE.md`, `porteiro-542-parecer.md`, `B-ASSINATURA-plano.md`) | — | não re-medíveis no repositório | — | como na Emenda 1 (E9) |

## F1 — `overview-money.ts`, constantes, `costStatusOf`, `alertFor`, `marginPct` (R-FX-1..4, R-MG-1..4)

- **Dev:** `dev-ass09-f13-cl`, Claude Opus 5.5 (subagente da sessão), nível menor, **identidade de dev declarada**
  (§C7 item 11(6)), **cobrindo o braço, declarado**: as 3 contas Codex na junta J-555 a partir das 23:29 SP e o DeepSeek no
  pico e com pouco saldo. Não sou `dev-ass09-cl`, nem planejador, nem crítico do bloco. **A pré-revisão das F1, F2 e F3 passa a
  ser de outra casa (Codex ou DeepSeek).**
- **Ramo:** `feat/ass-09-visao-custo`, worktree `C:/Users/thiag/w-ass09`, a partir de `2b5e0325` (F0). Sem banco.
- **Arquivos:** `src/modules/subscription-billing/overview/{overview-money.ts, overview.constants.ts, overview.types.ts,
  overview.engine.ts}`, `tests/ass-09-overview-money.test.ts`, `tests/ass-09-overview-engine.test.ts`.

| passo | comando | saída resumida | veredito |
|---|---|---|---|
| vermelho antes | `CORE_SAAS_PERSISTENCE=memory node --test --import tsx tests/ass-09-overview-money.test.ts tests/ass-09-overview-engine.test.ts` | `ERR_MODULE_NOT_FOUND … overview-money.js` · `# tests 2 # pass 0 # fail 2` | vermelho (o módulo não existe) |
| verde depois | idem | `# tests 11 # pass 11 # fail 0 # skipped 0` | verde |
| tipos | `npx tsc -p tsconfig.json --noEmit` | sem saída, ec 0 | verde |
| mutações | executor fora do repositório: a âncora tem de casar **1 vez**; aplica, roda o teste-dono, restaura e confere o md5 | as 12 abaixo, todas `VERMELHO`, `restaurado=true` | todas mortas |

| mutação (texto literal) | teste que fica vermelho | observação |
|---|---|---|
| M-FX-1 `costMicro * rateMicro` → `costMicro * MICRO` | T-FX-1 (e T-FX-2, T-FX-2b) | — |
| M-FX-2 `r * 2n >= d ? q + 1n : q` → `q` | T-FX-2, T-FX-2b | — |
| M-FX-3 corpo de `roundHalfAwayFromZero` → `return (n + d / 2n) / d;` | T-FX-2b | o corpo está numa linha só, igual ao texto do plano, para a troca ser literal |
| M-FX-4 `if (rateMicro === null) return null;` → `if (rateMicro === null) rateMicro = MICRO;` | T-FX-3 | — |
| M-FX-5 `if (currency === "BRL")` → `if (currency === "BRL" && rateMicro !== null)` | T-FX-4 (e T-MG-14) | — |
| M-MG-1 `cost > sub` → `cost >= sub` | T-MG-1..8 (caso T-MG-3) | — |
| M-MG-2 `80n` → `90n` (`overview.constants.ts`) | T-MG-1..8 (caso T-MG-2) | — |
| M-MG-3 tirar `sub > 0n && ` | T-MG-1..8 (caso T-MG-5) | — |
| M-MG-4 corpo de `costStatusOf` → `return summary.runId === null ? "no_run" : "ok";` | T-MG-12..15 (caso T-MG-13), T-FX-3, T-MG-16 | — |
| M-MG-5 `entry === undefined ? 0n :` → `entry === undefined ? null :` | T-MG-12..15 (caso T-MG-15) | o plano não dá o texto; a âncora é esta |
| M-MG-6 `roundHalfAwayFromZero(margin * 10_000n, sub)` → `(…, cost)` | T-MG-9..11 | **fica vermelho por `ReferenceError: cost is not defined`, não pelo `"85.19"` do plano**: a assinatura canônica `marginPct(margin, sub)` não tem `cost` no escopo |
| M-MG-8 `summary.currency ?? null` → `summary.currency ?? "BRL"` | T-MG-16 | o plano só dá o texto mutado; a âncora original é `summary.currency ?? null` (em `summaryCurrencyOf`, lida por `costStatusOf` e pelo motor) |

**Leituras do dev, declaradas (§A6):**
1. **Divisão F1 × F2.** O R-FX-1, o R-FX-3 e o R-MG-3 (T-MG-15: "fora de `tenants[]` → `0.00`") precisam do custo de UMA
   organização. Por isso a F1 entrega também `tenantCostOf` e `pricingOf` no `overview.engine.ts`; a F2 monta as linhas, o
   grupo, `totals` e o global em cima deles. O T-FX-1 da F1 confere a conversão, a margem e o original pelo dinheiro; o
   formato da linha inteira é da F2.
2. **Porteiro único de P13.** `pricingOf(status, moeda, taxa)` devolve `UNPRICED` (moeda `""`, taxa `null`) para todo
   status sem custo válido: toda conversão por `costToBrlCents` dá `null`, inclusive em real (`no_import` com moeda `BRL`).
   O original (`costMicro`) só existe em `ok`, `legacy_unscoped` e `fx_missing`.
3. **Falha fechada a mais (achado da revisão pela skill `backend-review-ts-prisma`, antes do commit):** `rateToMicro` recusa
   taxa **zero** (zeraria o custo em silêncio; a M6 tem `CHECK (rate > 0)`), e `costStatusOf` trata uma `coverage` que o bloco
   não conhece como `no_import`, nunca como `ok`. Cada uma tem caso no teste.

## F2 — `membership.rules.ts` (F2a) e `overview.engine.ts` (F2b) (R-MG-5, R-GLB-1..3, R-FX-7..9, R-GRP-1, R-GRP-2, R-GRP-7, R-H13-1)

- **Dev:** `dev-ass09-f13-cl` (o mesmo da F1, cobrindo o braço, declarado). Partida em **F2a** e **F2b** pelo acelerador da
  **Emenda 2 §1.2/§1.6** (`plano-B-ASS-09-v2-emenda2.md`, lida às 23:2x SP, ainda em escrita nas §2 a §6): a F2a empurra só
  as regras de vigência, para a J1 da F5b poder começar antes do motor.

### F2a — `economic-groups/membership.rules.ts` e `tests/ass-09-groups.test.ts` (só os casos da F2)

| passo | comando | saída resumida | veredito |
|---|---|---|---|
| vermelho antes | `membership.rules.ts` fora do lugar · `CORE_SAAS_PERSISTENCE=memory node --test --import tsx tests/ass-09-groups.test.ts` | `ERR_MODULE_NOT_FOUND … membership.rules.js` | vermelho |
| verde depois | idem, com o arquivo | `# tests 2 # pass 2 # fail 0 # skipped 0` | verde |
| âncoras que a F5b importa (Emenda 2 §1.4) | `grep -cF` no arquivo | `return deriveBusinessDate(now);` 1 · `return row.validTo === null \|\| row.validTo > from;` 1 · `if (validFrom <= row.validFrom) throw retroactive();` 1 · `if (hits.length > 1) throw new MembershipOverlapError(tenantId);` 1 · `day < row.validTo` 1 | cada uma casa **1 vez** |
| mutações | executor fora do repositório (âncora 1x, aplica, roda, restaura, md5) | **M-GRP-1** `day < row.validTo` → `day <= row.validTo`: T-GRP-1..3 (regra) vermelho · **M-GRP-10** apagar `if (hits.length > 1) throw new MembershipOverlapError(tenantId);`: T-GRP-12 (regra) vermelho (`Missing expected exception`) · `restaurado=true` nas duas | mortas |

**O que a F5b importa (Emenda 2 §1.4), com os nomes livres declarados:**
- `MemberRow` estrutural (`tenantId`, `groupId`, `validFrom`, `validTo`), que o `EconomicGroupMembership` do repositório já satisfaz;
- `isMemberOn(row, day)`, `todayBusinessDate(now)`, `overlaps(row, from)`, `groupOfTenantOn(rows, tenantId, day)`;
- a regra de fechamento se chama **`assertCanClose(row, validFrom)`** e lança `MembershipRuleError` com `reason
  "membership_retroactive"`; a regra "de hoje em diante" se chama **`assertNotBeforeToday(validFrom, today)`**, com o mesmo erro;
- `MembershipOverlapError` (`code "membership_integrity_violation"`, `tenantId`).
- As âncoras da M-GRP-4, da M-GRP-11 e da M-GRP-12 **só se contam** na F2 (acima); quem as mata é a F5b (Emenda 2 §1.6).

### F2b — `overview/overview.engine.ts` (linhas, grupo, totais, global, H13, períodos) e o resto do `tests/ass-09-groups.test.ts`

| passo | comando | saída resumida | veredito |
|---|---|---|---|
| vermelho antes | `git stash` do motor e dos tipos da F2b (o motor fica o da F1, `3007ce88`) · `CORE_SAAS_PERSISTENCE=memory node --test --import tsx tests/ass-09-groups.test.ts tests/ass-09-overview-engine.test.ts` | `SyntaxError: … overview.engine.js does not provide an export named 'buildOverview'` · `# tests 2 # pass 0` | vermelho |
| verde depois | `git stash pop` · idem | `# tests 22 # pass 22 # fail 0` (motor 17, grupos 5) | verde |
| tipos | `npx tsc -p tsconfig.json --noEmit` | sem saída, ec 0 | verde |
| âncoras únicas (Emenda 1 §3.1) | `grep -cF 'members.map((m) => m.costCents)'` e `grep -cF 'lines.map((l) => l.costCents)'` em `overview.engine.ts` | `1` e `1` | ok |
| mutações | executor fora do repositório (âncora 1x, aplica, roda o motor e os grupos, restaura, md5) | as 17 abaixo, todas `VERMELHO`, `restaurado=true` | todas mortas |

| mutação (texto literal) | vermelho em |
|---|---|
| M-FX-10 `if (xs.some((x) => x === null)) return null;` → `xs = xs.map((x) => x ?? 0n);` | T-FX-7, T-FX-8, T-FX-9 |
| M-FX-11 `costToBrlCents(totalImportedMicro, currency, rateMicro)` → `…, rateMicro ?? MICRO)` | T-FX-7, T-FX-8 |
| M-FX-12 `platformOwnCost: costToBrlCents(platformMicro, currency, rateMicro),` → `… ?? 0n,` | T-FX-7, T-FX-8 |
| M-FX-13 `margin: subOrNull(subscriptionTotal, totalCost),` → `margin: subscriptionTotal - (totalCost ?? 0n),` | T-FX-7, T-FX-8 |
| M-FX-14 `allocatedCost: sumOrNull(members.map((m) => m.costCents)),` → `sumIgnoringNull(…)` | T-FX-9 (só ele: equivalente pela entrada HTTP, Emenda 1 §3) |
| M-FX-15 `allocatedCost: sumOrNull(lines.map((l) => l.costCents)),` → `sumIgnoringNull(…)` | T-FX-9 (idem) |
| M-GLB-1 `toMicro(summary.totalUnallocatedCost)` → `toMicro(summary.totalUnallocatedCost + summary.totalPlatformCost)` | T-GLB-1 |
| M-GLB-2 `const conversionResidualCost = subOrNull(…);` → `const conversionResidualCost = 0n;` | T-GLB-2, T-FX-7, T-FX-8 |
| M-GLB-3 `subOrNull(subscriptionTotal, totalCost)` → `subOrNull(subscriptionTotal, tenantsCost)` | T-GLB-3 |
| M-GLB-4 `const orgs = input.tenants.filter((t) => !isPlatformTenant(t));` → `const orgs = input.tenants;` | T-GLB-1 |
| M-H13-1 apagar `warnings.push("multiple_imports_in_month");` | T-H13-1 |
| M-H13-2 `const totalImportedMicro = toMicro(…);` → `2n * toMicro(…)` | T-H13-1 (e T-GLB-1..3) |
| M-MG-7f (suplementar) em `lastDayOfPeriod`, `Date.UTC(year, month, 0)` → `Date.UTC(year, month, 1)` | T-MG-17, T-GRP-1..3 (motor), T-H13-1 |
| M-GRP-2 `const memberDay = lastDateOfPeriod(period);` → ``const memberDay = `${period}-01`;`` | T-GRP-1..3 (motor), T-GRP-4, T-GRP-12 (motor) |
| M-GRP-3 apagar `if (ungrouped.length > 0) groupLines.push(noGroupLineOf(ungrouped));` | T-GRP-4, T-FX-7 |
| M-GRP-1 (de novo, agora também pelo motor) | T-GRP-1..3 (regra e motor) |
| M-GRP-10 (de novo, agora também pelo motor) | T-GRP-12 (regra e motor) |

**Leituras do dev na F2, declaradas (§A6):**
1. **R-MG-5 e a M-MG-7.** O plano dá o R-MG-5 à F2, mas a expressão canônica `periodEnd: lastDayOfPeriod(period)` mora no
   `overview.service.ts`, que é da F6. A F2 entrega `firstDayOfPeriod`, `lastDayOfPeriod`, `firstDayOfNextPeriod` (a função que a
   M-MG-7 usa) e `lastDateOfPeriod`, e o T-MG-17 prova a janela contra o **resumo real** (`CloudCostAllocationService` em memória,
   run do 09a com fim `23:59:59.999Z`, fevereiro de 2026 e de 2028), com o controle "fim no dia 1 do mês seguinte → `no_run`".
   **A M-MG-7 literal só se executa na F6**, quando o serviço existir; aqui roda a suplementar M-MG-7f.
2. **R-H13-1.** O P11 diz que mora no `overview.service.ts` ("lê `listAllocationRuns`"). O serviço (F6) só LÊ as runs; o motor
   PURO as classifica: `costSourcesOf(period, runs, usedImportId)` filtra a janela EXATA (mesmo dia UTC de início e de fim, como o
   resumo) e tem o `warnings.push("multiple_imports_in_month")` da M-H13-1. O T-H13-1 usa o resumo e o `listAllocationRuns` reais
   (duas runs de outubro com importações distintas, mais uma que só toca outubro e não conta).
3. **M-H13-2** ("somar o custo das duas runs") não tem texto no plano; a forma literal escolhida é o efeito que o plano descreve
   ("valor dobrado"), no total importado do global.
4. **M-GRP-2** ("o 1º dia de P no lugar do último") também não tem texto; a âncora é a do motor.
5. **"Sem grupo" e o T-FX-7.** O T-FX-7 pede `cost_missing` "nas linhas de grupo"; a linha "Sem grupo" segue a P5 (`alert: null`,
   só somas e margem). As linhas de grupo de verdade dão `cost_missing`, e "Sem grupo" tem custo e margem `null` como as outras.
6. **A margem do grupo não é a soma das margens por organização** (D-6): ela desconta o custo de quem não tem assinatura (a filial).
   A conservação do P7 é em assinatura e em custo; o T-GRP-4 confere as duas e a margem do grupo por `assinatura − custo`.
7. **O R-GRP-7 é sem HTTP** (Emenda 2 §1.6): `buildOverview` lança `MembershipOverlapError` nas 3 formas (`group`, `tenant` e
   `global`, porque toda linha de organização leva o grupo). O 500 `membership_integrity_violation` da rota é da F6.
8. **Falhas fechadas a mais, sem número parcial:** taxa de outro mês ou de outra moeda nunca converte (vira `fx_missing`); taxa a
   partir de 1000 é recusada (`fx_rate_invalid`); organização do rateio fora da lista da visão (`tenant_list_incomplete`: o custo
   dela sumiria no resíduo da conversão), assinatura ou grupo faltando (`subscription_missing`, `group_unknown`) lançam
   `OverviewEngineError`. A F6 mapeia para 500. A lista de grupos que a F6 passa inclui os excluídos (mês passado).
9. **O formato do `data`** (§4.2): `lines` + `totals` em `groupBy=tenant` e `group`; `global` em `groupBy=global`.

## F3 — `overview/subscription-amount.ts` (R-SUB-1..7)

- **Dev:** `dev-ass09-f13-cl` (o mesmo da F1 e da F2, cobrindo o braço, declarado).
- **Q5 = recomendação, D-DONO-1311-RECOMENDACOES.** Decisão do dono de 13/11 ~23:20 SP ("minhas decisões vão todas nas
  recomendações"), repassada pelo orquestrador às 23:2x SP e escrita na Emenda 2 (decisão 5 e §5.1: "Q5 = antes do crédito … a
  expressão canônica, o `subscriptionBasis`, o T-SUB-1, o T-SUB-7 e a M-SUB-1 invertida"; **§9.2**, lida às 23:33, e o
  **C-E2-9** do §6). A assinatura do mês é o valor do demonstrativo **antes** de abater o crédito: `totalCents + creditsAppliedCents`. O total
  do demonstrativo e o crédito usado seguem **separados** na resposta. Troca o padrão D-9 do v2 (a alternativa A).

| passo | comando | saída resumida | veredito |
|---|---|---|---|
| vermelho antes | `CORE_SAAS_PERSISTENCE=memory node --test --import tsx tests/ass-09-subscription-amount.test.ts` sem o módulo | `ERR_MODULE_NOT_FOUND … subscription-amount.js` · `# tests 1 # pass 0` | vermelho |
| verde depois | as 4 suítes das fatias: `tests/ass-09-subscription-amount.test.ts`, `-overview-money`, `-overview-engine`, `-groups` | `# tests 35 # pass 35 # fail 0 # skipped 0` (F3: 8) | verde |
| tipos | `npx tsc -p tsconfig.json --noEmit` | sem saída, ec 0 | verde |
| mutações | executor fora do repositório (âncora 1x, aplica, roda, restaura, md5) | as 7 abaixo, todas `VERMELHO`, `restaurado=true` | todas mortas |

| mutação (texto literal) | vermelho em |
|---|---|
| M-SUB-1 (invertida, forma da Emenda 2 §9.2) `BigInt(statement.totalCents + statement.creditsAppliedCents)` → `BigInt(statement.totalCents)` | T-SUB-1, T-SUB-4, T-SUB-7 |
| M-SUB-7 `BigInt(statement.totalCents + statement.creditsAppliedCents)` → `BigInt(statement.paidCents)` | T-SUB-1, T-SUB-4, T-SUB-7 |
| M-SUB-2 `return projectAmount(runtime, tenantId, period);` → `return fromStatement((await runtime.service.close({ tenantId, period, now, actorId: "overview", source: "manual" })).statement)` | T-SUB-2 (1 linha gravada), T-SUB-5, F3 apoio |
| M-SUB-3 `case "paid":` → `case "paid":` seguido de `case "cancelled":` (o cancelado cai no ramo do fechado) | T-SUB-3 (`"500.00"`) |
| M-SUB-4 `{ source: "statement_reopened", estimate: true }` → `… estimate: false }` | T-SUB-4 |
| M-SUB-5 `subscriptionAmountCents: null,` → `subscriptionAmountCents: 0n,` | T-SUB-5 (alerta `critical`) |
| M-SUB-6 apagar `if (statement && statement.status !== "open") return fromStatement(statement);` | T-SUB-6 (chamadas > 0), T-SUB-1, T-SUB-3, T-SUB-4, T-SUB-7 |

**Expectativas que a Q5 mudou:** T-SUB-1 → `subscriptionAmount "1000.00"`, `statementTotal "900.00"`, `creditsApplied "100.00"`,
e o custo `750.00` dá alerta `none` (75 %; na base líquida seria `warning`, 83 %). T-SUB-7 → setembro `"100.00"`, outubro
`"100.00"` (conta `"50.00"` + crédito `"50.00"`); somados `"200.00"`, o contratado dos dois meses; os 50 pagos a mais contam uma vez,
em outubro.

**Leituras do dev na F3, declaradas (§A6):**
1. **O valor de `subscriptionBasis`** passa a `"before_credits"` (nome da Emenda 2 §9.2, que troca o `statement_total` em todo
   lugar). Ele é a constante `SUBSCRIPTION_BASIS` e o tipo literal do campo em `overview.types.ts` (arquivo da F2), e aparece em
   2 testes da F2 (`ass-09-overview-engine`, `ass-09-groups`): os três mudam neste commit da F3, por causa da Q5. O
   `API_CONTRACTS.md` e o `docs/subscription-billing.md` são da F8.
2. **As expressões canônicas** são as da Emenda 2 §9.2, cada uma 1 vez, num ramo único (`statementAmount`) para `closed`,
   `paid` e `reopened`: `subscriptionAmountCents: BigInt(statement.totalCents + statement.creditsAppliedCents),`,
   `statementTotalCents: BigInt(statement.totalCents),` e `creditsAppliedCents: BigInt(statement.creditsAppliedCents),`.
3. **Cancelado:** assinatura `0`; o total e o crédito gravados na linha seguem à vista, separados, pelo mesmo ramo único
   (`{ ...statementAmount(…, { source: "cancelled" }), subscriptionAmountCents: 0n }`), para as âncoras seguirem únicas.
4. **Projeção** (sem linha ou linha `open`): `inputs.resolve(t, P, { pin: null })` + `computeStatement` sem ajuste e sem crédito,
   sem gravar; `statementTotal` e `creditsApplied` `null` (não há demonstrativo). Com a base antes do crédito, a projeção e o mês
   fechado passam a estar na mesma base (o K17 encolhe: o crédito ainda não aplicado não mudaria o valor).
5. **C-E2-9, rodado por mim antes do push:** as 3 âncoras `grep -cF` = 1/1/1; `subscriptionBasis: "before_credits"` presente em
   `overview/` (no tipo do campo); `statement_total` em `src`, `tests` e `API_CONTRACTS.md`: sem saída; `paidCents` em `overview/`: sem
   saída (o comentário que o citava foi reescrito); `tests/ass-09-subscription-amount.test.ts` 8/8; M-SUB-1 e M-SUB-7 como escritas
   no §9.2: vermelhas.
6. **`now`** é o relógio do pedido: o período depois do mês corrente (SP) é recusado (`period_in_future`) antes de qualquer
   leitura; o período mal formado, `invalid_period`. Isso também mantém `now` no escopo, que a M-SUB-2 usa como texto.

## F3b — `overview/subscription-amount.ts`: o crédito do retrato do fechamento (Emenda 2.1 §2; A2)

- **Dev:** `dev-ass09-f3fix-cl` (Claude Opus 5.5, dev declarado). Não escrevi a F3 (`dev-ass09-f13-cl`), não achei o A2
  (`rev-ass09-e2-cl`), não planejei a Emenda 2.1 (`plano-ass09-e21-fable`) e não dei o visto (`rev-ass09-e21-cl`). Sem
  cruzamento entre modelos, declarado (§C7 11(2)).
- **Lei:** Emenda 2.1 §2 (P3 nova, 6 expressões canônicas, T-SUB-8 a T-SUB-11, 6 mutações) mais o visto `rev-ass09-e21-cl`
  (APROVADO COM AJUSTES), dos quais esta fatia aplica **A-E21-1** (a âncora vira `if (latest == null) throw snapshotMissing();`,
  igualdade frouxa, e o T-SUB-10 ganha o 5º caso, retrato sem a chave `latest`) e **A-E21-4** (M-SUB-1 e M-SUB-7 também deixam
  o T-SUB-9 vermelho). A-E21-2 e A-E21-3 são da F6 e da F8 (abaixo).
- **Partida:** `121d2f21`; só os 4 caminhos do §6.2. `overview.types.ts`: só o comentário da base (l.51-52).

| passo | comando | saída resumida | veredito |
|---|---|---|---|
| vermelho antes | `CORE_SAAS_PERSISTENCE=memory node --test --import tsx tests/ass-09-subscription-amount.test.ts` com a F3 de hoje (md5 `2d945ad8…`) | `# tests 12 # pass 8 # fail 4`: T-SUB-8 `'50.00'`/`'0.00'`, T-SUB-9 `'150.00'`, T-SUB-10 `Missing expected rejection: closed`, T-SUB-11 `Missing expected rejection.` | vermelho |
| verde depois | o mesmo comando, com o conserto | `# tests 12 # pass 12 # fail 0 # skipped 0` | verde |
| regressão | as 4 suítes do braço (`-subscription-amount`, `-overview-money`, `-overview-engine`, `-groups`) | `# tests 39 # pass 39 # fail 0` | verde |
| tipos | `npm run db:generate` + `npm run check` (= `npm run lint`) | ec 0 | verde |
| mutações | executor fora do repositório (âncora conta 1, aplica, roda, restaura bytes, md5) | as 11 abaixo `VERMELHO`, `restaurado=true` | todas mortas |

| mutação (texto literal) | vermelho em |
|---|---|
| M-SUB-1 `BigInt(statement.totalCents + latest.creditsAppliedCents)` → `BigInt(statement.totalCents)` | T-SUB-1 (`'900.00'`), T-SUB-4, T-SUB-7, T-SUB-8 (`'50.00'`), T-SUB-9 (refechado `'50.00'`) |
| M-SUB-7 `BigInt(statement.totalCents + latest.creditsAppliedCents)` → `BigInt(statement.paidCents)` | T-SUB-1 (`'0.00'`), T-SUB-4, T-SUB-7, T-SUB-8, T-SUB-9 |
| M-SUB-8 `BigInt(statement.totalCents + latest.creditsAppliedCents)` → `BigInt(statement.totalCents + statement.creditsAppliedCents)` | T-SUB-8 (`'50.00'`), T-SUB-9 (`'150.00'`); **controle:** T-SUB-1 a T-SUB-7 verdes |
| M-SUB-9 `creditsAppliedCents: BigInt(latest.creditsAppliedCents),` → `creditsAppliedCents: BigInt(statement.creditsAppliedCents),` | T-SUB-8 (`creditsApplied '0.00'`), T-SUB-9 (`'50.00'`) |
| M-SUB-10 apagar `if (latest == null) throw snapshotMissing();` | T-SUB-10 (`TypeError: Cannot destructure property 'terms' of 'input' as it is null.`) |
| M-SUB-11 apagar `if (recompute(latest) !== statement.totalCents) throw snapshotMismatch();` | T-SUB-11 (`Missing expected rejection.`) |
| M-SUB-2 a M-SUB-6 (textos da F3, âncoras conta 1) | as mesmas da F3 (M-SUB-4 também T-SUB-9; M-SUB-6 também T-SUB-8 a 11) |
| controle do A-E21-1: `latest == null` → `latest === null` | T-SUB-10, só o 5º caso (`TypeError … as it is undefined.`) |

**Leituras do dev na F3b, declaradas (§A6):**
1. **Outubro aberto no T-SUB-8 sai do próprio fechamento:** o `close` com o mês sem preço pula a organização e deixa a linha
   `open` (`statement.service.ts:113` e l.124-125), que é o único caminho do serviço que cria linha. Assim nenhuma linha do
   T-SUB-8 e do T-SUB-9 é montada à mão; o crédito de 50.00 nasce de um pagamento de 150.00 do provedor (`settle`) sobre
   setembro fechado em 100.00.
2. **O 5º caso do T-SUB-10** grava `snapshot: { history: [] }` (só por SQL manual, como o caso nulo). O teste falha nomeando o
   erro que saiu (`<status>: saiu <erro>`), para a M-SUB-10 e o controle mostrarem o `TypeError` e não só "validação falhou".
3. **`seedInconsistent`** é a única porta do teste que grava linha sem retrato coerente, e só o T-SUB-10 e o T-SUB-11 a usam.
   O `seed` dos T-SUB-1 a 7 confere `recompute(latest) === totalCents` antes de gravar.
4. **C-E2-9 com a âncora do A-E21-1:** a linha `git grep -c 'if (latest === null) throw snapshotMissing();'` do §7 passa a ser
   `git grep -c 'if (latest == null) throw snapshotMissing();'` (conta 1); a forma estrita dá 0 de propósito.
5. **Para a F6 (A-E21-2), não feito aqui:** ao traduzir `statement_snapshot_missing` / `statement_snapshot_mismatch` em 500
   `statement_integrity_violation`, a rota grava no log do servidor o `reason`, o mês e a organização da linha (o `tenantId` só
   no log, nunca no corpo); o T-SUB-12 confere que o corpo não leva `tenantId`. A falha por linha fica como pendência BAIXA
   `P-ASS09-INTEGRIDADE-POR-LINHA` (dono: B-ASS-12).
6. **Para a F8 (A-E21-3), não feito aqui:** o risco K29 (mudança no `computeStatement` que altere o total de um retrato antigo
   derruba a visão em todo mês com demonstrativo gravado; mitigação: mudar o cálculo só com versão) entra em
   `docs/subscription-billing.md`, junto do invariante §3.3. E a pendência `P-ASS08-REVERSAO-CREDITO-APLICADO` (A-E21-5: dono
   `B-ASS-08c`, ALTA, bloqueia ligar o canal) vai ao `pendencias.md`.

## F6 — `overview.service.ts`, as 10 rotas, validadores e trilha (R-ACC-1..3; Emenda 2 §2.2; Emenda 2.1 §2.6; visto A-E21-2)

- **Dev:** `dev-ass09-f13-cl`, Claude Opus 5.5, **identidade de dev declarada** (§C7 item 11(6)), retomado pelo orquestrador em
  14/11 ~02:27 SP: a F6 era do braço e passou ao Claude (o dono, 13/11: só o Claude trabalha). Não sou planejador, crítico nem
  revisor do bloco. **Sem cruzamento entre modelos, declarado** (§C7 11(2)).
- **Ramo:** `feat/ass-09-visao-custo`, worktree `C:/Users/thiag/w-ass09`, a partir de `1a3c7477` (J2), puxado por `--ff-only`.
- **Arquivos:** `overview/{overview.service.ts, overview.routes.ts, overview.factory.ts, overview.trail.ts, tenant-list.ts,
  tenant-list.prisma.ts}`, `fx-rates/fx-rates.routes.ts`, `economic-groups/economic-groups.routes.ts`,
  `subscription-billing.platform.routes.ts` (só montar os 3 routers), `platform-audit/audit-metadata.ts` (só as 8 chaves do
  §4.3), `tests/ass-05b-audit-allowlist.test.ts` (só a lista congelada), `tests/ass-09-overview-routes.test.ts` (novo).

| passo | comando | saída resumida | veredito |
|---|---|---|---|
| leitura | v2 §4.1 (10 rotas) × serviços da F5 (`fx-rates.service.ts`, `economic-groups.service.ts`) | R2–R10 batem rota a rota com os métodos e códigos dos serviços; o R1 é novo | §4.1 bate, sem PARADA |
| medido | `sendRouteError` (`core-saas/routes/http.ts`) | todo `Error` sem `statusCode` vira **400** `invalid_request` com a mensagem | a rota do R1 traduz as falhas de integridade |
| vermelho antes | `CORE_SAAS_PERSISTENCE=memory node --test --import tsx tests/ass-09-overview-routes.test.ts` | `ERR_MODULE_NOT_FOUND … economic-groups.routes.js` | vermelho |
| verde depois | idem | `# tests 12 # pass 12 # fail 0 # skipped 0` | verde |
| suítes do bloco (memória) | overview-routes, money, engine, groups, subscription-amount, groups-service, fx-rates, `ass-05b-audit-allowlist`, `financial-period-lock-guard` | `# tests 69 # pass 69 # fail 0 # skipped 0` | verde |
| regressões (memória) | `cloud-cost-allocation`, `-routes`, `san3-03-summary`, `-system-org`, `-conservation`, `ass-09a-rateio-automatico`, `ass-04-statement-engine`, `-inputs`, `-routes`, `-service`, `ass-02-plans-subscription`, `ass-01-markup-retirado`, `core-saas`, `permission-catalog-migration-parity` | `# tests 196 # pass 196 # fail 0 # skipped 0` | verde |
| suíte inteira (memória, pelo runner) | `CORE_SAAS_PERSISTENCE=memory npm test` | `560 arquivo(s) · 4596 teste(s) · pass 4400 · fail 22 · skipped 173` (sem Redis e sem Postgres locais; o CI tem 5554) | triagem abaixo |
| triagem, HEAD × base `1a3c7477` (a F6 num `git stash -u`) | cada arquivo vermelho, sozinho, nos dois | `o6r07c-census-guard` base 32/32 → HEAD 29/32 · `san3-18-route-module-census` base 7/7 → HEAD 3/7 · `san3-05-acessos-de-plataforma-guard` 32/35 nos dois (as 2 chaves sem motivo são da F5a e da F5b; a F6 não acrescenta chave, porque `tenants` não é FORCE) · `core-saas-role-authority` 0/1, `domain-events` 2/4, `job-queue` 0/3 e `worker-heartbeat` 21/22, iguais nos dois (ambiente: sem Redis) · `users-seg-desativado-sse` 6/6 sozinho nos dois (carga da suíte paralela) | **2 arquivos vermelhos por causa da F6: os dois censos de rota (PARADA abaixo)** |
| `check`/`lint` na forma do CI | `npm ci` (ec 0) · `DATABASE_URL=<fictícia> npm run db:generate` (ec 0) · `npm run check` (ec 0) · `npm run lint` (ec 0) · `git diff --check` | todos 0 | verde |

| mutação (texto literal) | vermelho em | observação |
|---|---|---|
| M-ACC-1 tirar `requirePlatformPermission("platform:billing:read"), ` do `GET /overview` | T-ACC-1b | o tenant_admin recebe resposta, não 403 |
| M-ACC-4 tirar `requirePlatformPermission("platform:billing:read"), ` do `GET /economic-groups/:groupId/history` | T-ACC-1b | rota e guarda numa linha só, para a âncora ser única |
| M-ACC-5 acrescentar `router.get("/economic-groups/:groupId/members", requirePlatformPermission("platform:billing:read"), (_req, res) => res.json({ data: [] }));` antes do `return router;` dos grupos | T-ACC-1a (11 ≠ 10) | — |
| M-ACC-3 `const picked = pickBillingAuditMetadata(context, OVERVIEW_TRAIL_KEYS);` → `const picked = context;` | T-ACC-3 | o nome do grupo aparece na trilha de plataforma |
| M-MG-7 `periodEnd: lastDayOfPeriod(period)` → `periodEnd: firstDayOfNextPeriod(period)` (`overview.service.ts`, conta 1) | T-MG-17b (`no_run` no lugar de `imported`/`ok`), T-OV-1, T-FX-5b | a M-MG-7 literal do plano, que a F2 deixou para cá |
| M-SUB-12 apagar `  if (error instanceof StatementIntegrityError) return statementIntegrity(error, logger);` (`overview.routes.ts`, conta 1) | T-SUB-12 (**400 `invalid_request`** no lugar de 500 `statement_integrity_violation`) | a âncora que a Emenda 2.1 §2.6 manda registrar aqui |
| M-GRP-10h (suplementar) apagar `  if (error instanceof MembershipOverlapError) return membershipIntegrity(error, logger, period);` | T-GRP-12 (HTTP) | a metade HTTP do R-GRP-7 (Emenda 2 §2.2) |
| M-SUB-12L (suplementar) apagar a linha `logger.error({ reason: error.reason, period: error.period, tenantId: error.tenantId }, …)` | T-SUB-12 | o log do A-E21-2 é conferido, não só o corpo |

Todas com a âncora contada 1 vez, aplicadas uma por vez, restauradas e conferidas por md5 (`restaurado=true` nas 8).

**Testes novos (`tests/ass-09-overview-routes.test.ts`, 12):** T-ACC-1a (enumera da pilha do `express.Router` em runtime: os 3 routers
novos montam **exatamente** as 10 do §4.1, e o router de plataforma as monta) · T-ACC-1b (tenant_admin → 403
`platform_permission_required` nas 10; a plataforma passa da guarda nas 3 leituras) · T-ACC-2 (`GET /billing/subscription` sem
`allocatedCost`, `margin`, `marginPct`, `fxRate`, `groupId` nem `cost`) · T-ACC-3 (trilha ⊆ allowlist; sem nome de grupo, de
organização nem notas; `tenant_id` nunca na metadata; controle positivo das chaves) · T-OV-1 (as 3 formas pela rota; a organização da
plataforma não é linha) · T-OV-2 (400 `invalid_period`, 400 `invalid_group_by`, 422 `period_in_future`) · T-MG-17b (janela exata pelo
serviço) · T-FX-5b (a visão usa 5.500000, versão 2) · T-FX-6b (os códigos do câmbio pela rota, `invalid_json` e `range_too_large`) ·
T-GRP-HTTP (R4–R10 pela rota) · **T-GRP-12 (HTTP)** (repositório de teste que implementa `EconomicGroupsRepository` com as duas linhas
sobrepostas, não o dublê: 500 `membership_integrity_violation` nas 3 formas, sem `data`, sem a organização no corpo, a organização no
log) · **T-SUB-12** (demonstrativo gravado sem retrato: 500 `statement_integrity_violation`, sem `data`, sem `tenantId` no corpo; o log
com `{ reason: "statement_snapshot_missing", period, tenantId }`).

**Leituras do dev na F6, declaradas (§A6):**
1. **O `sendRouteError` da casa responde 400 `invalid_request` a todo `Error` sem `statusCode`.** Por isso a rota do R1 traduz,
   ela mesma, as três falhas de integridade em **500**, só com o motivo no corpo: `statement_integrity_violation` (Emenda 2.1
   §2.6), `membership_integrity_violation` (P5, Emenda 2 §2.2) e **`overview_integrity_violation`** (nome meu, para o
   `OverviewEngineError` da F2: organização do rateio fora da lista, assinatura ou grupo faltando, taxa a partir de 1000). A F8
   escreve os três no `API_CONTRACTS.md`.
2. **A-E21-2:** o `StatementIntegrityError` nasce no serviço com a organização e o mês; a rota grava no LOG
   `{ reason, period, tenantId }` e responde sem nenhum dos dois. O `MembershipOverlapError` também vai ao log com a organização.
   O T-SUB-12 e o T-GRP-12 (HTTP) conferem o corpo sem `tenantId` e a linha do log.
3. **A trilha** (`overview.trail.ts`): uma função só (`trailMetadata`) passa todo contexto pela allowlist do módulo, com as 8
   chaves novas (`group_id`, `month`, `currency_from`, `currency_to`, `rate`, `version`, `valid_from`, `valid_to`) e o ator.
   Taxa, criar, renomear e excluir grupo → trilha de plataforma; entrar e sair → `audit_logs` da organização, dentro da troca
   (o `membershipAuditBuilder` vai ao `EconomicGroupsService` pela fábrica, Emenda 2 §2.4). O contexto chega inteiro (com nome e
   notas): é o que faz a M-ACC-3 ficar vermelha.
4. **O diretório de organizações** (`GroupTenantDirectory`, F5b) é montado pela F6 sobre a lista (`tenant-list.ts`), e lê o
   registro **uma vez por pedido** (achado da revisão pela skill antes do commit: o `putMembers` consulta até 500 organizações, e
   cada consulta leria o registro inteiro).
5. **`firstDayOfNextPeriod` importado e não usado no serviço**, com comentário: é o que deixa a M-MG-7 rodar como escrita e cair em
   `no_run`, em vez de `ReferenceError`.
6. **Códigos meus, a registrar na F8:** `invalid_tenant_ids` (400, `tenantIds` que não é lista de texto: uma lista malformada não
   pode virar "tirar todo mundo do grupo") e `overview_integrity_violation` (500).
7. **Fora do escopo, medido:** a trilha de plataforma é gravada depois da escrita (molde do `PlansService`), não na mesma transação;
   a da organização vai na transação da troca.

### PARADA — os dois censos de rota pedem instantâneos fora do PERMITIDO (vale a `D-EMENDA-ANTES-DO-CODIGO`)

As 10 rotas novas acendem dois censos, e os dois exigem que **toda** rota montada esteja num instantâneo commitado. Os dois
instantâneos são **gerados** por script, nunca escritos à mão, e **nenhum dos dois está no PERMITIDO** do plano (v2 §7, Emendas 1,
2 e 2.1). Não os regenerei.

| guarda | base `1a3c7477` | HEAD da F6 | o que acusa | instantâneo e gerador |
|---|---|---|---|---|
| `tests/san3-18-route-module-census.test.ts` | 7/7 | 3/7 | `NOVA (fora do instantâneo)` para cada uma das 10; **nenhuma** `SEM CLASSE` (as `zz-*` são as sondas de mutação do próprio teste) | `tests/fixtures/san3-18-route-modules.json` · `node --import tsx scripts/san3-18-censo-modulos.mjs --gravar tests/fixtures/san3-18-route-modules.json` |
| `tests/o6r07c-census-guard.test.ts` | 32/32 | 29/32 | `NAO-CLASSIFICADA: ROTA …` para cada uma das 10 | `tests/fixtures/o6r07c-classificacao-vias.json` · `node --import tsx tests/helpers/o6r07c-census.ts gravar tests/fixtures/o6r07c-classificacao-vias.json` |

- **O que falta para fechar:** uma emenda que ponha os dois arquivos no PERMITIDO, **só pela regeneração** (como o
  `censored-tables.ts` da M6), com o `git diff` de cada um contendo só as 10 entradas novas, e a classe de cada rota conferida pelo
  revisor. É do tamanho da linha do `san3-05` que a F7 já faz; a leitura minha (§A6) é que cabe na F7.
- **Por que não regenerei:** o `san3-18` diz que "o diff do instantâneo é o que a junta revisa"; regenerar fora do PERMITIDO seria
  ampliar o escopo sem emenda.
- **Vermelho esperado até a emenda:** esses 2 arquivos no job `backend`, além do `san3-05-acessos-de-plataforma-guard` (dono F7, desde
  a F5) e do `san3-05-leituras-de-plataforma-db` (a superfície fechada, `-db`, dono F7).

## F4 — ramo `feat/ass-09-banco` (worktree `C:/Users/thiag/w-ass09b`)

Base: `feat/ass-09-banco` nasce do head da F0 (`2b5e0325`), em worktree próprio com `npm ci` próprio (sem junction),
`exit=0`. `git merge-base HEAD origin/main` = `d29b3bef`.

| passo | comando | saída resumida | veredito |
|---|---|---|---|
| `schema.prisma` | 3 modelos (`EconomicGroup`, `EconomicGroupMember`, `PlatformFxRate`) e a relação inversa `economic_group_members` em `model Tenant`; `map:` nas 2 FKs, nos 2 índices e no único do câmbio, iguais aos nomes da M6 | `git diff --numstat` → `61 0 prisma/schema.prisma` (só acréscimo) · `npx prisma validate` → `The schema at prisma\schema.prisma is valid` (ec 0) | verde. O `prisma format --check` acusa arquivo não formatado **também na `main`** (`w-ass09`, `d29b3bef`); não formatei (reescreveria 2 044 linhas fora do bloco) |
| M6 | `prisma/migrations/20260903000000_ass09_economic_groups_fx_rates/migration.sql`: `BEGIN;` … `COMMIT;`, 15 sentenças (extensão, 3 tabelas, índice único funcional, 2 índices, 2 FKs, a exclusão, ENABLE, FORCE, `DROP POLICY IF EXISTS` e a política, índice único do câmbio) e o runbook `down` | a sentença da exclusão é a do plano, literal: `grep -c "ALTER TABLE economic_group_members ADD CONSTRAINT economic_group_members_no_overlap EXCLUDE"` = **1** (âncora da M-GRP-9) | aditiva; nenhuma tabela existente muda |
| guard | `node scripts/migration-transaction-guard.mjs` | `migrações: 135 · anteriores: 112 · novas: 23 · violações: 0` | verde |
| drill (R-MIG-1) | `DATABASE_URL=…55561/erp_ass09 node --test --import tsx tests/ass-09-groups-fx-migration-drill-db.test.ts` | `ok 1` deploy (3 tabelas; índice `economic_groups_name_active_key` UNIQUE em `lower(btrim(name))` onde `deleted_at IS NULL`; único do câmbio; 2 índices; `economic_group_members_no_overlap` com `contype='x'` e `pg_get_constraintdef` = `EXCLUDE USING gist (tenant_id WITH =, daterange(valid_from, valid_to, '[)'::text) WITH &&)`; 6 CHECKs; `relrowsecurity` e `relforcerowsecurity`; a política com o GUC; 2 FKs `RESTRICT`; `btree_gist`) · `ok 2` down em 1 transação (as 3 tabelas saem, `btree_gist` fica, `tenants` intacto) e o corpo reaplica · `ok 3` prefixos k = 1..15 atômicos, inclusive a extensão · `# tests 3 # pass 3 # fail 0 # skipped 0` | verde |
| **M-MIG-1** | `COMMIT;` final apagado (`mutrun`: âncora conta 1, aplica, roda, restaura e confere md5) → `node scripts/migration-transaction-guard.mjs` | `G2 20260903000000_ass09_economic_groups_fx_rates: n = 15 sentenças sem BEGIN;/COMMIT; nas pontas …` · `violações: 1` · exit 1 · `restaurado=true` | **vermelho**, restaurado |
| **M-MIG-2** | sentença `ALTER TABLE "economic_group_members" FORCE ROW LEVEL SECURITY;` apagada → o drill | `not ok 1` (`+ rlsForced: 0` × `- rlsForced: 1`) · `not ok 2` (`expected 15 actual 14` sentenças) · `not ok 3` · `# pass 0 # fail 3` · `restaurado=true` | **vermelho**, restaurado |
| censo | `DATABASE_URL=…/erp_ass09` (com a M6 aplicada) `node scripts/gen-tenant-tables.mjs` | `119 tabelas gravadas`; `git diff` de `censored-tables.ts`: **+1 linha**, `"economic_group_members"` | só pela regeneração |
| censo (controle) | `tests/ass-03-metering-census-db.test.ts` (T-MED-db-8) com o censo regenerado, e com o arquivo antigo reposto | regenerado: `ok 1` · antigo: `not ok 1 … censo divergente — faltando: [economic_group_members]; sobrando: []` | o censo é exigido pela M6 e casa com o catálogo |
| **K12** (hipótese medida) | `psql` no cluster: `CREATE EXTENSION IF NOT EXISTS btree_gist` sob 3 papéis `NOSUPERUSER NOBYPASSRLS` | `btree_gist` 1.7 `trusted = t` · papel sem `CREATE` na base: `ERROR: permission denied to create extension "btree_gist"` (`Must have CREATE privilege on current database to create this extension.`) · papel com `CREATE` na base: `CREATE EXTENSION` · dono da base: `CREATE EXTENSION` | a extensão nasce sem superusuário, desde que o papel da migração tenha `CREATE` na base (ou seja o dono) |
| **K12** (cadeia inteira) | `npx prisma migrate deploy` das 135 migrações (com a M6) numa base `OWNER ass09_mig`, papel `NOSUPERUSER BYPASSRLS` | `All migrations have been successfully applied.` · 135 aplicadas · `btree_gist` com dono `ass09_mig` · `economic_group_members_no_overlap` `x` | verde. Sob `NOSUPERUSER NOBYPASSRLS` a cadeia **não sobe, por desenho anterior ao bloco**: a `20260873000000_add_stock_movements_unique_backstops` recusa com `EP0001 … censo CEGO sob o papel "ass09_app" (FORCE RLS sem superusuario/BYPASSRLS) … NADA foi mutado` (`P-O6R-B04-CENSO-DUPLICATAS-STAGING-PROD`). Logo o papel de migração de produção já precisa de superusuário ou `BYPASSRLS`, e, com `CREATE` na base, a M6 sobe. O CI roda `migrate deploy` como `postgres` (`ci.yml` l.40 e l.109) |

### Deriva (Emenda 1 §2.1), duas bases

Comandos, na ordem da emenda, no cluster Postgres 16 descartável próprio (`127.0.0.1:55561`):

1. `npx prisma validate` → ec 0.
2. `MB=$(git merge-base HEAD origin/main)` → `d29b3bef`; `git worktree add --detach ../w-ass09-drift-base "$MB"` e `npm ci`
   próprio (`exit=0`).
3. (a) `ass09_drift_base`: `migrate deploy` e `migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script`
   no worktree do merge-base; (b) `ass09_drift_head`: `migrate deploy`, `migrate status` e o mesmo `migrate diff` no worktree do
   dev; (c) `norm()` e `diff` como a emenda escreve.

**O que não rodou como escrito, com a saída literal, e o que fiz:**
- Com o papel `ass09_app` (`NOSUPERUSER NOBYPASSRLS`), o `migrate deploy` para na `20260873000000` (a saída `EP0001` acima). É
  uma trava anterior ao bloco, por desenho; não é a M6.
- Com o deploy por outro papel e o `migrate status`/`migrate diff` por `ass09_app`, sem privilégio nas tabelas: `migrate status`
  → `Error: ERROR: permission denied for table _prisma_migrations` (ec 1); `migrate diff` → 4 833 linhas na base e 4 882 no
  head, todas `ADD COLUMN`/`CREATE` (o `information_schema` só mostra colunas de tabela que o papel alcança). Medida inválida,
  guardada fora do repositório e descartada.
- **Medida válida:** as 3 etapas (deploy, status e diff), nas duas bases, pelo papel dono das bases, `ass09_mig`
  (`NOSUPERUSER BYPASSRLS`, o menor papel que a cadeia aceita). Nenhum superusuário na medida.

| medida | base (`d29b3bef`) | head (`feat/ass-09-banco`) |
|---|---|---|
| `migrate deploy` | `All migrations have been successfully applied.` (134) | idem (135) |
| `migrate status` | — | `Database schema is up to date!` (ec 0) |
| linhas do `migrate diff --script` | **220** | **220** |
| `md5sum` | `ea7c0780690adc81351cee0971215a8c` | `ea7c0780690adc81351cee0971215a8c` |
| `grep -ciE 'economic\|platform_fx'` | — | **0** |
| delta normalizado | — | **vazio** (0 linha) |

**Critério de aceite:** (1) as 220 linhas da base estão todas no head, iguais (md5 igual); (2) o delta é vazio, portanto
subconjunto da lista nominal: o Prisma 7.8 **não** emite `DROP INDEX "economic_groups_name_active_key"` (índice de expressão com
`WHERE`, ignorado; a base só tem 1 `DROP INDEX`, de `impound_processes_tenant_id_identity_id_idx`), e nenhuma linha cita
`economic_group_members` ou `platform_fx_rates` (a exclusão, os CHECKs e a extensão não aparecem, como a r2 mediu); (3) nenhuma
outra linha. **VERDE.** A base de 220 linhas é a mesma contagem que o `B-TRC-02` mediu (`B-TRC-02-dev.md`).

**M-MIG-3** (vermelho de controle do critério): no `EconomicGroupMember`, a linha `  valid_to   DateTime? @db.Date` tirada do
`schema.prisma` (neste schema o campo tem o nome da coluna, no padrão da casa), a M6 intacta → o mesmo diff no head e o mesmo
critério: `linhas base=220 mmig3=223` · delta `> ALTER TABLE "economic_group_members" DROP COLUMN "valid_to";` ·
`CRITERIO: VERMELHO` (exit 1) · `restaurado=true`. O critério enxerga deriva nova.

<details><summary>Saída do <code>migrate diff --script</code> (base e head idênticos, md5 <code>ea7c0780…</code>, 220 linhas)</summary>

```sql
-- DropForeignKey
ALTER TABLE "financial_entries" DROP CONSTRAINT "financial_entries_reversal_pair_fk";

-- DropForeignKey
ALTER TABLE "financial_titles" DROP CONSTRAINT "financial_titles_parent_title_fkey";

-- DropForeignKey
ALTER TABLE "service_quote_items" DROP CONSTRAINT "service_quote_items_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "service_quote_items" DROP CONSTRAINT "service_quote_items_tenant_id_price_table_id_fkey";

-- DropForeignKey
ALTER TABLE "service_quote_items" DROP CONSTRAINT "service_quote_items_tenant_id_service_quote_id_fkey";

-- DropForeignKey
ALTER TABLE "service_quote_items" DROP CONSTRAINT "service_quote_items_tenant_id_tariff_id_fkey";

-- DropForeignKey
ALTER TABLE "service_quotes" DROP CONSTRAINT "service_quotes_tenant_id_customer_id_fkey";

-- DropForeignKey
ALTER TABLE "service_quotes" DROP CONSTRAINT "service_quotes_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "service_quotes" DROP CONSTRAINT "service_quotes_tenant_id_service_catalog_id_fkey";

-- DropForeignKey
ALTER TABLE "service_quotes" DROP CONSTRAINT "service_quotes_tenant_id_source_price_table_id_fkey";

-- DropForeignKey
ALTER TABLE "service_quotes" DROP CONSTRAINT "service_quotes_tenant_id_source_tariff_id_fkey";

-- DropForeignKey
ALTER TABLE "service_quotes" DROP CONSTRAINT "service_quotes_tenant_id_work_order_id_fkey";

-- DropForeignKey
ALTER TABLE "tag_assignments" DROP CONSTRAINT "tag_assignments_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "tag_assignments" DROP CONSTRAINT "tag_assignments_tenant_id_tag_id_fkey";

-- DropForeignKey
ALTER TABLE "work_order_comments" DROP CONSTRAINT "work_order_comments_tenant_id_author_user_id_fkey";

-- DropForeignKey
ALTER TABLE "work_order_comments" DROP CONSTRAINT "work_order_comments_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "work_order_comments" DROP CONSTRAINT "work_order_comments_tenant_id_work_order_id_fkey";

-- DropForeignKey
ALTER TABLE "work_order_financial_items" DROP CONSTRAINT "work_order_financial_items_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "work_order_financial_items" DROP CONSTRAINT "work_order_financial_items_tenant_id_price_table_id_fkey";

-- DropForeignKey
ALTER TABLE "work_order_financial_items" DROP CONSTRAINT "work_order_financial_items_tenant_id_tariff_id_fkey";

-- DropForeignKey
ALTER TABLE "work_order_financial_items" DROP CONSTRAINT "work_order_financial_items_tenant_id_work_order_id_fkey";

-- DropIndex
DROP INDEX "impound_processes_tenant_id_identity_id_idx";

-- AlterTable
ALTER TABLE "cloud_charge_calculation_runs" ALTER COLUMN "metadata" DROP DEFAULT;

-- AlterTable
ALTER TABLE "cloud_charge_rules" ALTER COLUMN "metadata" DROP DEFAULT;

-- AlterTable
ALTER TABLE "cloud_cost_allocation_runs" ALTER COLUMN "metadata" DROP DEFAULT;

-- AlterTable
ALTER TABLE "cloud_cost_imports" ALTER COLUMN "metadata" DROP DEFAULT;

-- AlterTable
ALTER TABLE "cloud_cost_line_items" ALTER COLUMN "metadata" DROP DEFAULT;

-- AlterTable
ALTER TABLE "cloud_usage_daily_aggregates" ALTER COLUMN "metadata" DROP DEFAULT;

-- AlterTable
ALTER TABLE "cloud_usage_events" ALTER COLUMN "metadata" DROP DEFAULT;

-- AlterTable
ALTER TABLE "commission_basis_events" ALTER COLUMN "payload" DROP DEFAULT;

-- AlterTable
ALTER TABLE "commission_calculations" ALTER COLUMN "calculation_snapshot" DROP DEFAULT;

-- AlterTable
ALTER TABLE "commission_policy_rules" ALTER COLUMN "conditions" DROP DEFAULT;

-- AlterTable
ALTER TABLE "expense_policies" ALTER COLUMN "category_rules" DROP DEFAULT,
ALTER COLUMN "limits" DROP DEFAULT,
ALTER COLUMN "approval_rules" DROP DEFAULT,
ALTER COLUMN "receipt_rules" DROP DEFAULT;

-- AlterTable
ALTER TABLE "field_dispatch_events" ALTER COLUMN "metadata" DROP DEFAULT;

-- AlterTable
ALTER TABLE "field_dispatches" ALTER COLUMN "metadata" DROP DEFAULT;

-- AlterTable
ALTER TABLE "field_operator_locations" ALTER COLUMN "metadata" DROP DEFAULT;

-- AlterTable
ALTER TABLE "notifications" ALTER COLUMN "metadata" DROP DEFAULT;

-- AlterTable
ALTER TABLE "tenant_cloud_charges" ALTER COLUMN "metadata" DROP DEFAULT;

-- AlterTable
ALTER TABLE "tenant_cloud_cost_allocations" ALTER COLUMN "source_cost_line_item_ids" DROP DEFAULT,
ALTER COLUMN "metadata" DROP DEFAULT;

-- AlterTable
ALTER TABLE "work_order_assignments" ALTER COLUMN "metadata" DROP DEFAULT;

-- AlterTable
ALTER TABLE "work_order_events" ALTER COLUMN "metadata" DROP DEFAULT;

-- RenameForeignKey
ALTER TABLE "checklist_applicability_rules" RENAME CONSTRAINT "checklist_applicability_rules_tenant_id_service_catalog_i_fkey" TO "checklist_applicability_rules_tenant_id_service_catalog_id_fkey";

-- RenameForeignKey
ALTER TABLE "impound_process_checklist_links" RENAME CONSTRAINT "impound_process_checklist_links_tenant_id_checklist_run_i_fkey" TO "impound_process_checklist_links_tenant_id_checklist_run_id_fkey";

-- RenameForeignKey
ALTER TABLE "tenant_cloud_cost_allocations" RENAME CONSTRAINT "tenant_cloud_cost_allocations_run_id_fkey" TO "tenant_cloud_cost_allocations_allocation_run_id_fkey";

-- RenameIndex
ALTER INDEX "audit_logs_tenant_entity_idx" RENAME TO "audit_logs_tenant_id_entity_entity_id_created_at_idx";

-- RenameIndex
ALTER INDEX "checklist_runs_tenant_id_related_entity_type_related_entity_id_" RENAME TO "checklist_runs_tenant_id_related_entity_type_related_entity_idx";

-- RenameIndex
ALTER INDEX "checklist_template_components_tenant_id_template_id_component_k" RENAME TO "checklist_template_components_tenant_id_template_id_compone_key";

-- RenameIndex
ALTER INDEX "cloud_charge_calculation_runs_period_idx" RENAME TO "cloud_charge_calculation_runs_period_start_period_end_idx";

-- RenameIndex
ALTER INDEX "cloud_charge_calculation_runs_source_allocation_run_idx" RENAME TO "cloud_charge_calculation_runs_source_allocation_run_id_idx";

-- RenameIndex
ALTER INDEX "cloud_charge_rules_effective_idx" RENAME TO "cloud_charge_rules_effective_from_effective_until_idx";

-- RenameIndex
ALTER INDEX "cloud_charge_rules_tenant_idx" RENAME TO "cloud_charge_rules_tenant_id_idx";

-- RenameIndex
ALTER INDEX "cloud_cost_allocation_runs_period_idx" RENAME TO "cloud_cost_allocation_runs_period_start_period_end_idx";

-- RenameIndex
ALTER INDEX "cloud_cost_imports_period_idx" RENAME TO "cloud_cost_imports_period_start_period_end_idx";

-- RenameIndex
ALTER INDEX "cloud_cost_line_items_billing_period_idx" RENAME TO "cloud_cost_line_items_billing_period_start_billing_period_e_idx";

-- RenameIndex
ALTER INDEX "cloud_usage_daily_aggregates_tenant_date_metric_unit_source_key" RENAME TO "cloud_usage_daily_aggregates_tenant_id_date_metric_key_unit_key";

-- RenameIndex
ALTER INDEX "commission_statements_tenant_id_payee_id_period_start_period_en" RENAME TO "commission_statements_tenant_id_payee_id_period_start_perio_key";

-- RenameIndex
ALTER INDEX "field_operator_locations_tenant_id_operator_user_id_recorded_at" RENAME TO "field_operator_locations_tenant_id_operator_user_id_recorde_idx";

-- RenameIndex
ALTER INDEX "impound_process_checklist_links_tenant_id_process_id_chec_key" RENAME TO "impound_process_checklist_links_tenant_id_process_id_checkl_key";

-- RenameIndex
ALTER INDEX "portal_access_logs_tenant_fp_idx" RENAME TO "portal_access_logs_tenant_id_query_fingerprint_occurred_at_idx";

-- RenameIndex
ALTER INDEX "portal_access_logs_tenant_ip_idx" RENAME TO "portal_access_logs_tenant_id_ip_hash_occurred_at_idx";

-- RenameIndex
ALTER INDEX "tag_assignments_tenant_entity_tag_key" RENAME TO "tag_assignments_tenant_id_entity_type_entity_id_tag_id_key";

-- RenameIndex
ALTER INDEX "tariffs_natural_key" RENAME TO "tariffs_tenant_id_price_table_id_service_catalog_id_custome_key";

-- RenameIndex
ALTER INDEX "tenant_cloud_charges_calculation_run_idx" RENAME TO "tenant_cloud_charges_calculation_run_id_idx";

-- RenameIndex
ALTER INDEX "tenant_cloud_charges_period_idx" RENAME TO "tenant_cloud_charges_period_start_period_end_idx";

-- RenameIndex
ALTER INDEX "tenant_cloud_charges_rule_idx" RENAME TO "tenant_cloud_charges_cloud_charge_rule_id_idx";

-- RenameIndex
ALTER INDEX "tenant_cloud_charges_run_tenant_key" RENAME TO "tenant_cloud_charges_calculation_run_id_tenant_id_key";

-- RenameIndex
ALTER INDEX "tenant_cloud_charges_source_allocation_run_idx" RENAME TO "tenant_cloud_charges_source_allocation_run_id_idx";

-- RenameIndex
ALTER INDEX "tenant_cloud_charges_tenant_idx" RENAME TO "tenant_cloud_charges_tenant_id_idx";

-- RenameIndex
ALTER INDEX "tenant_cloud_cost_allocations_period_idx" RENAME TO "tenant_cloud_cost_allocations_period_start_period_end_idx";

-- RenameIndex
ALTER INDEX "tenant_cloud_cost_allocations_run_idx" RENAME TO "tenant_cloud_cost_allocations_allocation_run_id_idx";

-- RenameIndex
ALTER INDEX "tenant_cloud_cost_allocations_run_tenant_service_usage_category" RENAME TO "tenant_cloud_cost_allocations_allocation_run_id_tenant_id_s_key";

-- RenameIndex
ALTER INDEX "tenant_cloud_cost_allocations_tenant_idx" RENAME TO "tenant_cloud_cost_allocations_tenant_id_idx";

```

</details>

### Regressões da F4 (cluster `erp_ass09`, com a M6 aplicada)

| comando | saída | veredito |
|---|---|---|
| `DATABASE_URL=…/erp_ass09 node --test --import tsx` em `ass-09-groups-fx-migration-drill-db`, `san3-05-leituras-de-plataforma-db`, `san3-03-system-org-db`, `ass-09a-rateio-automatico-db`, `ass-03-metering-census-db` | `# tests 47 # pass 47 # fail 0 # skipped 0` (3 do drill + os 44 da baseline) | verde; o código sob teste das suítes de regressão roda no papel efêmero `NOSUPERUSER NOBYPASSRLS` do arnês |
| `CORE_SAAS_PERSISTENCE=memory` nos guards que leem `schema.prisma`/`prisma/migrations` (13 arquivos: `ass-02-plan-catalog`, `auth-invariant-guards`, `b-san3-24-escopo`, `financial-entry-link-census`, `inventory-write-paths-guard`, `migration-transaction-guard`, `permission-catalog-migration-parity`, `rec-01-live-link-guard`, `san3-03-basis-census`, `san3-05-acessos-de-plataforma-guard`, `traccar-event-topology`, `db-catalog-write-guard`, `b-o6r-12-regime-census`) | `# tests 114 # pass 111 # fail 2 # skipped 1` · os 2 `not ok` são **um só**: `san3-05-acessos-de-plataforma-guard` › `L0 exato` (e o T13 que o contém): `# L0: tabelas ENABLE=124 FORCE=124 · acessores Prisma em FORCE=124` × o literal `123` | **vermelho esperado, dono F7**: a M6 traz exatamente 1 tabela FORCE nova e 1 model. O literal L0 e as chaves do ratchet são da F7 (plano §9, "ratchet"), e o arquivo está fora do que a F4 e a F5 podem tocar |
| `npm ci` → `DATABASE_URL=…/erp_ass09 npm run db:generate` → `npm run check` · `npm run lint` · `git diff --check` | `check=0` · `lint=0` · vazio | verde |

**Leitura do dev, declarada (§A6):** o mandato limita a F4 e a F5 a `prisma/**`, `*.prisma.ts`, `*.repository.ts`, `*.service.ts`
e testes `-db`; a linha da F4 no plano (§9) inclui "censo". Fiz o censo só pela regeneração (o arquivo está no PERMITIDO do plano
§7 com essa condição, e nenhuma fatia do braço o toca). Sem ele, o T-MED-db-8 fica vermelho com a M6 (controle acima).

## F5 — ramo `feat/ass-09-banco` (PARCIAL: paradas declaradas no serviço de grupos e na trava do câmbio)

**Feito** (só `*.repository.ts`, `*.prisma.ts`, `*.service.ts` de grupos e câmbio e testes `-db`):

- `src/modules/subscription-billing/fx-rates/`: `fx-rates.repository.ts` (tipos, porta e dublê em memória), `fx-rates.prisma.ts`
  (versão nova sob `pg_advisory_xact_lock(hashtextextended(<mês:origem:destino>, 0))`, maior versão por `aggregate`, vigente
  por `orderBy: { version: "desc" }`), `fx-rates.service.ts` (validação do R-FX-6 e do P10, `putRate`, `currentRate`,
  `listRates` com até 24 meses; erros no molde `SubscriptionBillingError`).
- `src/modules/subscription-billing/economic-groups/`: `economic-groups.repository.ts` (tipos, porta e dublê que **espelha a
  M6**: exclusão por intervalo `[)`, CHECK do fim, nome único `lower(btrim)` entre os não excluídos e CHECK de 1 a 120, troca
  tudo ou nada) e `economic-groups.prisma.ts` (vínculos só por `forEachTenantRls`, com o canário `assertRowsBelongToTenant`;
  23P01 → `MembershipConflictError`, 23514 → `MembershipRangeError`/`GroupNameCheckError`, 23505 → `GroupNameTakenError`).
- Forma do erro do Prisma 7 + `@prisma/adapter-pg`, **medida** por sonda no cluster antes do mapeamento: `create` →
  `DriverAdapterError` com `cause.originalCode` (`23P01`, `23514`); `$executeRawUnsafe` → `P2010` com
  `meta.driverAdapterError.cause.originalCode`; nome duplicado → `P2002` com `originalMessage` citando
  `economic_groups_name_active_key`.
- Testes: `tests/ass-09-fx-rates-db.test.ts` (4) e `tests/ass-09-groups-db.test.ts` (4), o código sob teste no papel efêmero
  `NOSUPERUSER NOBYPASSRLS` do arnês (`rolsuper=false`, `rolbypassrls=false`, asserido); o T-FX-db-1 com barreira escopada
  por `application_name` (o admin segura `LOCK TABLE platform_fx_rates IN SHARE MODE` até os dois `putRate` estarem presos).

| passo | comando | saída resumida | veredito |
|---|---|---|---|
| suítes `-db` da F5 + drill, 3× | `DATABASE_URL=…55561/erp_ass09 CORE_SAAS_PERSISTENCE=memory node --test --import tsx tests/ass-09-groups-fx-migration-drill-db.test.ts tests/ass-09-fx-rates-db.test.ts tests/ass-09-groups-db.test.ts` | rodadas 1, 2 e 3: `# tests 11 # pass 11 # fail 0 # skipped 0` | verde, denominador constante (3 + 4 + 4) |
| regressões `-db` | `san3-05-leituras-de-plataforma-db`, `san3-03-system-org-db`, `ass-09a-rateio-automatico-db`, `ass-03-metering-census-db` | `# tests 44 # pass 44 # fail 0 # skipped 0` | verde |
| resíduo | `psql … erp_ass09`: `economic_group_members`, `economic_groups`, `platform_fx_rates`, organizações `ass09-%`, papéis `o6r_b01_%` | `0 · 0 · 0 · 0 · 0` | teardown sem resto |
| **M-FX-6** | no dublê, `.sort((a, b) => b.version - a.version)` → `.sort((a, b) => a.version - b.version)` | `not ok 3` (espelho): `dublê e Postgres divergem depois de 2026-08 5.500000` (`+ 1, '5.400000'` × `- 2, '5.500000'`) · `restaurado=true` | **vermelho** |
| **M-FX-7** | `const RATE_PATTERN = /^\d{1,3}(\.\d{1,6})?$/;` → `/^\d{1,3}(\.\d+)?$/` | `not ok 4` (T-FX-6): `Missing expected rejection: rate "5.1234567"` · `restaurado=true` | **vermelho** |
| **M-FX-8** | a linha `await tx.$executeRaw\`SELECT pg_advisory_xact_lock(…)\`;` apagada | `not ok 2` (T-FX-db-1): `nenhum dos dois PUT falha` × `Unique constraint failed on the fields: (month, currency_from, currency_to, version)` · `restaurado=true` | **vermelho** |
| **M-FX-9** | `orderBy: { version: "desc" }` → `orderBy: { version: "asc" }` | `not ok 1` (T-FX-db-2: `actual '5.400000'` × `expected '5.600000'`), e `not ok 2`, `not ok 3` · `restaurado=true` | **vermelho** |
| **M-GRP-9** | a M6 sem a sentença `ALTER TABLE economic_group_members ADD CONSTRAINT economic_group_members_no_overlap EXCLUDE …`, numa base nova (`fresh-db-run.sh`: `CREATE DATABASE`, `migrate deploy`, a suíte, `DROP DATABASE`) | `not ok 2` (T-GRP-db-3: `Missing expected rejection.` — o 2º vínculo de C, que cruza o 1º, é aceito) · `not ok 3` (espelho: `2-…:ok`, `4-…:ok`, `6-…:ok` no Postgres × `membership_conflict` no dublê) · `restaurado=true` | **vermelho** |
| **M-GRP-6** (= M-MIG-2) | a M6 sem `FORCE ROW LEVEL SECURITY`, numa base nova | `not ok 1` (T-GRP-db-2: `+ forced: false` × `- forced: true`) · `restaurado=true` | **vermelho** |
| **M-GRP-8** | no dublê, `  return btrimSpaces(name).toLowerCase();` → `  return btrimSpaces(name);` | `not ok 4` (espelho de grupos): `mesmo nome, outra caixa…:ok` e `renomeia para o nome ativo:ok` no dublê × `group_name_exists` no Postgres · `restaurado=true` | **vermelho** |
| suplementar (minha, declarada §A6) | dublê sem a checagem da exclusão | `not ok 3`: `2-…:ok`, `4-…:ok` × `membership_conflict` | **vermelho**, restaurado |
| suplementar | dublê sem a checagem do CHECK do fim | `not ok 3`: `5-fecha A@G2 no dia do início:ok` × `membership_range_invalid` | **vermelho**, restaurado |
| suplementar | dublê sem a cópia da troca (`const staged = this.memberships;`) | `not ok 3`: `7-…:membership_conflict` × `ok` (o passo 6 deixou B gravado pela metade) | **vermelho**, restaurado |
| guards em memória | `db-catalog-write-guard`, `migration-transaction-guard`, `san3-05-acessos-de-plataforma-guard`, `auth-invariant-guards`, `inventory-write-paths-guard`, `b-o6r-12-regime-census` | `# tests 88 # pass 84 # fail 3 # skipped 1` · os 3 `not ok` são do `san3-05-acessos-de-plataforma-guard`: o L0 (`124` × `123`, da F4), o T13 que o contém, e **1 chave nova sem motivo**: `L1 src/modules/subscription-billing/fx-rates/fx-rates.prisma.ts PrismaFxRatesRepository.appendVersion tx RAW-SQL($executeRaw) OPACO ? $TRANSACTION-SEM-SETTER-PROVADO ×1` (a trava consultiva, que não lê nem grava tabela). Os acessos a `economic_group_members` entram reconhecidos (`forEachTenantRls`) e não acusam | **vermelho esperado, dono F7** (o ratchet e o literal L0 são da F7, plano §9; o arquivo está fora do que a F4 e a F5 tocam). O `db-catalog-write-guard` fica verde: os 3 arquivos novos não escrevem catálogo |
| `check`/`lint` | `npm run check` · `npm run lint` (depois de `npm ci` e `npm run db:generate` com o `DATABASE_URL` do cluster) | `check=0` · `lint=0` | verde |

**Leituras do dev, declaradas (§A6):**
1. Os tipos de câmbio e de grupo moram nos `*.repository.ts` (como os `Create…Record` do molde `plans.repository.ts`), e não
   em `fx-rates.types.ts`/`economic-groups.types.ts` da árvore do plano §3: o mandato limita a F5 a `*.repository.ts`,
   `*.prisma.ts` e `*.service.ts`, e um `economic-groups.types.ts` meu colidiria com o `MemberRow` que a F2 do braço vai
   declarar para `membership.rules.ts`. O meu tipo de vínculo (`EconomicGroupMembership`) tem `tenantId`, `groupId`,
   `validFrom` e `validTo` em `AAAA-MM-DD`, compatível por estrutura com o `isMemberOn`/`overlaps` canônicos.
2. O R-FX-6 (T-FX-6) e o R-FX-5 (T-FX-5) são testes em memória no plano, fora do que o mandato me deixa tocar. Cobri a
   validação **no serviço contra o Postgres** (o código, o motivo e "nada gravado"), e o T-FX-5 pelo T-FX-db-2 e pelo espelho
   do dublê. O 400/422 por HTTP e "a visão usa 5.500000" passam pela rota e pela visão (F6).
3. A trilha do câmbio e dos grupos (`platform_audit_logs`, `audit_logs` da organização) não está aqui: é a "trilha" da F6, com
   as chaves novas da allowlist em `audit-metadata.ts`, que é arquivo do braço.

### PARADA — o que da F5 não roda como escrito (vale a `D-EMENDA-ANTES-DO-CODIGO`)

1. **`economic-groups.service.ts` não pode ser escrito neste ramo sem improvisar.** A P9 do serviço (checagem por intervalo,
   `validFrom ≥ hoje` em SP, `validFrom > valid_from` da linha que fecha) é feita, pelo plano §6, das expressões canônicas de
   `membership.rules.ts` (`overlaps`, `todayBusinessDate`, a regra `if (validFrom <= row.validFrom) throw retroactive();`), e é
   onde as mutações M-GRP-4, M-GRP-11 e M-GRP-12 atuam. O plano §9 diz: "o `membership.rules.ts` é do braço (F2) e o Claude
   só o importa". Mas este ramo nasce da F0 e corre em paralelo com a F1–F3: o arquivo não existe aqui
   (`git ls-tree -r HEAD --name-only | grep -c membership.rules` = 0). Escrevê-lo seria tomar a fatia do braço; reescrever as
   regras no serviço quebraria as âncoras canônicas.
2. **Os testes em memória da F5 caem em arquivo da F2.** R-GRP-3..6 e R-GRP-8 (T-GRP-5..11, T-GRP-13) moram em
   `tests/ass-09-groups.test.ts`, o mesmo arquivo do T-GRP-1..4 e do T-GRP-12 (F2), e o mandato limita a F5 a testes `-db`.
3. **Dependem do serviço e ficam pendentes com ele:** R-GRP-db-1 (corrida de dois `PUT members`) e R-GRP-db-3 (b) e (c)
   (422 pelo serviço; 409 com a M-GRP-11 aplicada); as mutações M-GRP-4, M-GRP-7, M-GRP-11 e M-GRP-12.
4. **A trava do câmbio do plano (P10) bate num guard da casa.** `tests/financial-period-lock-guard.test.ts` ›
   "guard — pg_advisory em src/** vive SÓ em src/database/financial-period-lock.ts" (`B-O6R-02`, Ω6R-DIN-008) reprova
   qualquer `pg_advisory` em `src/**` fora de `src/database/financial-period-lock.ts`, comentário incluído (a busca é
   `/pg_advisory/` linha a linha). O plano manda a versão nova do câmbio "sob `pg_advisory_xact_lock`" em
   `fx-rates/fx-rates.prisma.ts` (P10) e escreve a M-FX-8 como "apagar a linha do `pg_advisory_xact_lock`". Medido: na `main`,
   `git grep -n pg_advisory origin/main -- 'src/**'` só acha `src/database/financial-period-lock.ts` (l.7, 41, 49); no ramo,
   `fx-rates.prisma.ts` l.5 (comentário) e l.41 (a trava) → o guard fica **vermelho**, e vermelho só por causa deste bloco
   (controle abaixo). Tanto o lar único (`src/database/**`) quanto o guard estão fora do PERMITIDO. **Não troquei o
   mecanismo**: o código fica como o plano escreveu, a prova (T-FX-db-1 verde, M-FX-8 vermelha) fica no diário, e a escolha é
   da emenda. Caminhos que vi, sem escolher: (a) a trava do câmbio no lar único, como segunda chave, com o guard 2 intacto
   (`src/database/financial-period-lock.ts`, PROIBIDO hoje); (b) o guard passa a aceitar `fx-rates.prisma.ts` com motivo
   (`tests/financial-period-lock-guard.test.ts`, PROIBIDO hoje); (c) serializar sem trava consultiva — `LOCK TABLE
   platform_fx_rates IN SHARE ROW EXCLUSIVE MODE` na transação (modo que conflita consigo mesmo), ou repetir a inserção na
   violação do `UNIQUE` —, com a M-FX-8 reescrita por emenda.

**O que a emenda precisa dizer (proposta, não decisão minha):** (a) a ordem — o resto da F5 roda depois que a F2 estiver na
linha (rebase de `feat/ass-09-banco` sobre a F2 do braço, ou na junção, antes da F6); (b) o arquivo dos testes em memória do
serviço de grupos (por exemplo, `tests/ass-09-groups-service.test.ts`, dentro de `tests/ass-09-*.test.ts` do PERMITIDO), para
não dividir `tests/ass-09-groups.test.ts` entre duas fatias; (c) quem faz; (d) o mecanismo da trava do câmbio diante do guard
de `pg_advisory` (item 4).

### Suíte inteira em memória (sinal de regressão, fora da bateria do mandato)

`npm test` no head da F5 (Git Bash, `CORE_SAAS_PERSISTENCE=memory`, **sem** `DATABASE_URL` e sem `REDIS_URL`, porque a 6379 é
proibida): `553 arquivo(s) · 4534 teste(s) · pass 4344 · fail 16 · skipped 173` (as `-db` pulam sem banco). Para separar
defeito do bloco de ambiente, rodei os arquivos que falharam nas duas árvores, no mesmo ambiente:

| arquivo | `main` (`w-ass09`, `d29b3bef`) | ramo (`w-ass09b`) | classe |
|---|---|---|---|
| `core-saas-role-authority`, `domain-events` (2), `job-queue` (3), `worker-heartbeat` (1) | `not ok` | `not ok` | ambiente: sem Redis e sem banco |
| `users-seg-desativado-sse` (16b-1 a 16b-6) | `ok` isolado | `ok` isolado | instável sob a carga da suíte inteira; verde nas duas árvores isoladas |
| `financial-period-lock-guard` › guard 1 | `ok` | **`not ok`** | **do bloco** — PARADA 4 acima |
| `san3-05-acessos-de-plataforma-guard` › T13 (L0 e a chave RAW) | `ok` | **`not ok`** | **do bloco**, esperado — dono F7 |

Comando da comparação: `node --test --import tsx tests/core-saas-role-authority.test.ts tests/domain-events.test.ts
tests/job-queue.test.ts tests/users-seg-desativado-sse.test.ts tests/worker-heartbeat.test.ts
tests/financial-period-lock-guard.test.ts` → `main`: `# tests 38 # pass 31 # fail 7`; ramo: `# tests 38 # pass 30 # fail 8`
(a diferença é o guard da PARADA 4).

## J1 — rebase de `feat/ass-09-banco` sobre a F2a (Emenda 2 §1.5), 13/11 23:36–23:39 SP

Retomada de `dev-ass09-cl` pelo id (Emenda 2 §1.3). Roteiro da §1.5, com `OLD=202ba18d`, `BASE=2b5e0325` e o alvo
`origin/feat/ass-09-visao-custo` = **`75f27800`** no `git fetch` da J1 (F1 `3007ce88` → F2a `2cb13671` → F2b `75f27800`;
`git merge-base --is-ancestor 2cb13671 origin/feat/ass-09-visao-custo` → verdadeiro).

| passo | comando | saída | veredito |
|---|---|---|---|
| (1) | `git rebase origin/feat/ass-09-visao-custo` · `test -z "$(git diff --name-only --diff-filter=U)"` | `Rebasing (1/2)Rebasing (2/2)Successfully rebased and updated refs/heads/feat/ass-09-banco.` · nenhum arquivo em conflito | limpo |
| (2) | `git diff "$BASE" "$OLD" -- . ":(exclude)$D" \| git patch-id --stable` × `git diff origin/feat/ass-09-visao-custo HEAD -- . ":(exclude)$D" \| git patch-id --stable` | A = `56e6c8a8da032fe39968f2e7882d9948f6d3f49f` · B = `56e6c8a8da032fe39968f2e7882d9948f6d3f49f` | iguais: o código do banco saiu igual da rebase |
| (3) | linhas acrescentadas ao diário por cada lado, `comm -23` contra o diário do HEAD | lado do bloco: 104 linhas distintas, **0** perdidas · lado do banco (`202ba18d`): 229 linhas distintas, **0** perdidas | o diário guarda os dois lados |
| bateria antes do push | `npm run db:generate` · `npm run check` · `npm run lint` (com o `DATABASE_URL` do cluster) | `gen=0` · `check=0` · `lint=0` | verde, já com a F1 e a F2 no ramo |
| `-db` da fatia | cluster `pg-ass09` refeito (`initdb` UTF8 `locale=C`, `timezone`/`log_timezone` UTC antes do start, `127.0.0.1:55561`), `npx prisma migrate deploy` (135), guard (`violações: 0`), e `node --test --import tsx tests/ass-09-groups-fx-migration-drill-db.test.ts tests/ass-09-fx-rates-db.test.ts tests/ass-09-groups-db.test.ts` | `# tests 11 # pass 11 # fail 0 # skipped 0` | verde |
| conferência (não é bateria minha) | `CORE_SAAS_PERSISTENCE=memory node --test --import tsx tests/ass-09-groups.test.ts tests/ass-09-overview-engine.test.ts tests/ass-09-overview-money.test.ts` | `# tests 27 # pass 27 # fail 0 # skipped 0` | a F1/F2 seguem verdes por cima do banco |
| push | `git push --force-with-lease=feat/ass-09-banco:202ba18d origin HEAD:feat/ass-09-banco` | `+ 202ba18d...b84b2998 HEAD -> feat/ass-09-banco (forced update)` | **J1 feita**: `feat/ass-09-banco` = `b84b2998`. O ramo do bloco não recebeu push |

**Depois da J1:** o `git fetch` seguinte mostrou `origin/feat/ass-09-visao-custo` = `121d2f21` (a F3, `feat(billing): F3 do B-ASS-09 —
assinatura do período, antes do crédito`), empurrada pelo `dev-ass09-f13-cl` durante a J1. Ela não entra na J1; é a base da J2
(§1.2). A F5a, a F5b e a J2 esperam a mensagem "EMENDA 2 REVISADA" do orquestrador.

## F5a — a trava do câmbio por tabela (Emenda 2 §3.3, §2.3; Emenda 2.1 §1), 14/11 01:10–01:20 SP

Retomada depois de "EMENDA 2 REVISADA". Base: `feat/ass-09-banco` = `de037d9e`. Cluster `pg-ass09` religado (`127.0.0.1:55561`,
UTC), base `erp_ass09` migrada na J1. Código sob teste no papel efêmero `NOSUPERUSER NOBYPASSRLS` do arnês.

- `fx-rates.prisma.ts`: a 1ª sentença da transação passa a ser, literal, `await tx.$executeRaw\`LOCK TABLE platform_fx_rates IN
  SHARE ROW EXCLUSIVE MODE\`;` (`grep -c` = 1); sai a `fxRateLockKey` (`git grep -n fxRateLockKey -- src tests` sem saída) e o
  comentário dela; o comentário do topo descreve a trava de tabela e o privilégio que ela exige (K18).
- `tests/ass-09-fx-rates-db.test.ts`: barreira **de linha** (Emenda 2.1 §1.3). O admin grava a versão 2 do mesmo mês e moeda sem
  `COMMIT` (`INSERT … VALUES ('2026-10', $1, 'BRL', 9, 2)`, conta 1), espera os dois `putRate` presos e termina por `throw
  BARRIER_ROLLBACK`; o `finally` aceita só essa rejeição (`assert.rejects(holder, (error) => error === BARRIER_ROLLBACK)`).
  `grep -c 'RawUnsafe("LOCK TABLE'` no teste = 0. Cabeçalho e comentário do T-FX-db-1 nomeiam M-FX-8, M-FX-16 e M-FX-17.
- `tests/ass-09-fx-rates.test.ts` (novo, em memória): T-FX-5 e T-FX-6 com o dublê e o serviço, sem banco.

| passo | comando | saída | veredito |
|---|---|---|---|
| C-E2-1 | `git diff --quiet origin/main -- src/database/financial-period-lock.ts tests/financial-period-lock-guard.test.ts` · `git grep -l pg_advisory -- 'src/**'` · `node --test … tests/financial-period-lock-guard.test.ts` | exit 0 · só `src/database/financial-period-lock.ts` · `ok 3`, `ok 4` (os 2 guards) | a guarda e o lar intactos, e verdes |
| C-E2-2 (3×) | `DATABASE_URL=…/erp_ass09 CORE_SAAS_PERSISTENCE=memory node --test --import tsx tests/ass-09-fx-rates-db.test.ts` | rodadas 1, 2, 3: `# tests 4 # pass 4 # fail 0 # skipped 0` | verde, N constante |
| **M-FX-8** (5×) | apagar `      await tx.$executeRaw\`LOCK TABLE platform_fx_rates IN SHARE ROW EXCLUSIVE MODE\`;` (âncora conta 1, restauração por md5) | 5 de 5: `T-FX-db-1 = not ok 2` · `Unique constraint failed on the fields: (month, currency_from, currency_to, version)` · `restaurado=true` | **vermelha nas 5** |
| **M-FX-16** (5×) | `IN SHARE ROW EXCLUSIVE MODE` → `IN ROW EXCLUSIVE MODE` | 5 de 5: `not ok 2` · `Unique constraint failed …` · `restaurado=true` | **vermelha nas 5** |
| **M-FX-17** (5×) | `IN SHARE ROW EXCLUSIVE MODE` → `IN SHARE MODE` | 5 de 5: `not ok 2` · `deadlock detected` · `restaurado=true` | **vermelha nas 5** |
| vermelho-controle (5×) | barreira devolvida a `await tx.$executeRawUnsafe("LOCK TABLE platform_fx_rates IN SHARE MODE");` **e** a M-FX-17 aplicada (duas mutações aninhadas, cada uma com âncora 1 e restauração por md5) | 5 de 5: `T-FX-db-1 = ok 2`, nenhuma mensagem | a M-FX-17 sobrevive à barreira antiga: é a barreira de linha que a mata |
| C-E2-3 | sem `DATABASE_URL`: `CORE_SAAS_PERSISTENCE=memory node --test --import tsx tests/ass-09-fx-rates.test.ts` | `ok 1` T-FX-5 · `ok 2` T-FX-6 · `# tests 2 # pass 2 # fail 0 # skipped 0` | verde, sem banco |
| **M-FX-6** (memória) | no dublê, `.sort((a, b) => b.version - a.version)` → `.sort((a, b) => a.version - b.version)` | `not ok 1` T-FX-5: `expected '5.500000'` · `actual '5.400000'` · `restaurado=true` | **vermelha** sem banco |
| **M-FX-7** (memória) | `const RATE_PATTERN = /^\d{1,3}(\.\d{1,6})?$/;` → `/^\d{1,3}(\.\d+)?$/` | `not ok 2` T-FX-6: `Missing expected rejection: rate "5.1234567"` · `restaurado=true` | **vermelha** sem banco |
| ratchet | `san3-05-acessos-de-plataforma-guard` | a mesma chave da F5: `L1 … fx-rates.prisma.ts PrismaFxRatesRepository.appendVersion tx RAW-SQL($executeRaw) OPACO ? $TRANSACTION-SEM-SETTER-PROVADO ×1`, e o L0 124 | **vermelho esperado, dono F7** (motivo: "trava de tabela, não lê nem grava linha") |
| `check`/`lint` | `npm run check` · `npm run lint` · `git diff --check` | `0` · `0` · vazio | verde |

## F5b — o serviço de grupos (Emenda 2 §1.4, §2.1, §2.4; Emenda 2.1 §5), 14/11 01:20–01:45 SP

**Contrato da F2 conferido antes do código (§1.4):** em `membership.rules.ts` do ramo (vindo da F2a pela J1), `git grep -c -F`
dá **1** para cada âncora — `return deriveBusinessDate(now);`, `return row.validTo === null || row.validTo > from;`,
`if (hits.length > 1) throw new MembershipOverlapError(tenantId);`, `if (validFrom <= row.validFrom) throw retroactive();` — e
`export function isMemberOn` = 1. A função de fechamento da F2 se chama `assertCanClose`; o serviço a importa, com
`assertNotBeforeToday`, `overlaps`, `todayBusinessDate`, `isMemberOn` e `MembershipRuleError`. Nenhuma regra reescrita.

- `economic-groups.service.ts` (novo): R4–R10 sem HTTP. P9 por intervalo; `23P01` → 409 `membership_conflict`;
  `MembershipRangeError` → 422 `membership_range_invalid` (âncora `if (error instanceof MembershipRangeError) throw
  rangeInvalid();`, conta 1); `MembershipRuleError` → 422 `membership_retroactive`; e os códigos do §4.1 do v2
  (`group_not_found`, `tenant_not_found`, `platform_organization`, `too_many_members`, `group_name_exists`, `name_invalid`,
  `group_has_members`, vigente ou agendado). Âncora da M-GRP-7: `if (inAnotherGroup.length > 0) throw
  tenantInAnotherGroup(inAnotherGroup);` (conta 1).
- Trilha na mesma transação (§2.4): `MembershipChanges.audit` leva os eventos prontos (a F6 monta o conteúdo pela allowlist e o
  injeta no serviço por `MembershipAuditBuilder`); o Prisma grava cada um no `tx` da volta da organização, pelo molde
  `writeAuditInTx` de `statement.prisma-runtime.ts`; o dublê guarda os eventos. Evento de organização fora da troca recusa a
  troca inteira (`MembershipAuditTenantError`).
- `tests/ass-09-groups-service.test.ts` (novo, em memória): T-GRP-5..7, 8, 9..10, 11, 13, 14 e mais 3 casos (os outros códigos
  do R9/R6; a saída agendada pedida de novo; a trilha).
- `tests/ass-09-groups-db.test.ts`: T-GRP-db-3 (b) pelo serviço sobre o Prisma (o (c) é a M-GRP-11 nele) e T-GRP-db-1 (corrida,
  barreira `LOCK TABLE economic_group_members IN SHARE MODE` no admin, escopada pelo `application_name` da suíte); um
  `beforeEach` limpa vínculos e trilha das organizações da suíte, para um caso vermelho não contaminar o seguinte.

| passo | comando | saída | veredito |
|---|---|---|---|
| memória, 3× | sem `DATABASE_URL`: `node --test --import tsx tests/ass-09-fx-rates.test.ts tests/ass-09-groups-service.test.ts tests/ass-09-groups.test.ts tests/ass-09-overview-engine.test.ts tests/ass-09-overview-money.test.ts tests/financial-period-lock-guard.test.ts` | rodadas 1, 2, 3: `# tests 40 # pass 40 # fail 0 # skipped 0` | verde, N constante |
| `-db`, 3× | `DATABASE_URL=…/erp_ass09 node --test --import tsx tests/ass-09-groups-fx-migration-drill-db.test.ts tests/ass-09-fx-rates-db.test.ts tests/ass-09-groups-db.test.ts` | rodadas 1, 2, 3: `# tests 13 # pass 13 # fail 0 # skipped 0` (3 + 4 + 6) | verde, N constante, papel `NOSUPERUSER NOBYPASSRLS` |
| T-GRP-db-1, quem perde | sonda temporária (uma linha de `console.log`, aplicada e restaurada por md5), 3× | `SONDA-PERDEDOR 409 membership_conflict` nas 3 | o banco segura a corrida (exclusão), nunca 500 |
| regressões `-db` | `san3-05-leituras-de-plataforma-db`, `san3-03-system-org-db`, `ass-09a-rateio-automatico-db`, `ass-03-metering-census-db` | `# tests 44 # pass 44 # fail 0 # skipped 0` | verde |
| resíduo | `psql … erp_ass09`: vínculos, grupos, câmbio, trilha `economic_group.%`, organizações `ass09%`, papéis `o6r_b01_%` | `0 0 0 0 0 0` | teardown sem resto |
| **M-GRP-7** | tirar `      if (inAnotherGroup.length > 0) throw tenantInAnotherGroup(inAnotherGroup);` | `not ok` T-GRP-5..7 (`expected 422` · `actual 409`, `membership_conflict` do espelho), T-GRP-11, trilha · `restaurado=true` | **vermelha**, 409 como a Emenda 2 §2.1 escreve |
| **M-GRP-4** (arquivo da F2, só no worktree) | `  return deriveBusinessDate(now);` → `  return now.toISOString().slice(0, 10);` | `not ok` T-GRP-8: o `validFrom 2026-10-13` cai em `membership_retroactive` · `restaurado=true` | **vermelha** |
| **M-GRP-8** (dublê) | `  return btrimSpaces(name).toLowerCase();` → `  return btrimSpaces(name);` | `not ok` T-GRP-9..10: `Missing expected rejection: mesmo nome em outra caixa` · `restaurado=true` | **vermelha** |
| **M-GRP-11** (F2) | `  return row.validTo === null \|\| row.validTo > from;` → `  return row.validTo === null;` | memória: `not ok` T-GRP-11 (`expected 422` · `actual 409`, `membership_conflict`) · Postgres: `not ok` só o T-GRP-db-3 (b), `actual [409, 'membership_conflict']` × `expected [422, 'tenant_in_another_group']` — é o (c): o banco segura · `restaurado=true` | **vermelha**, 409, nunca 200 |
| **M-GRP-12** (F2) | `  if (validFrom <= row.validFrom) throw retroactive();` → `  if (validFrom < row.validFrom) throw retroactive();` | `not ok` T-GRP-13: `actual 'membership_range_invalid'` × `expected 'membership_retroactive'` · `restaurado=true` | **vermelha**, 422 `membership_range_invalid` (Emenda 2.1 §5) |
| **M-GRP-13** (nova) | tirar `      if (error instanceof MembershipRangeError) throw rangeInvalid();` | `not ok` T-GRP-14: `statusCode` indefinido (o erro cru, `code membership_range_invalid`, sobe) · `restaurado=true` | **vermelha** |
| **M-GRP-9** (base nova) | a M6 sem a `EXCLUDE` (`fresh-db-run.sh`) | `not ok` T-GRP-db-1: `exatamente um dos dois vence` · `2 !== 1`; e T-GRP-db-3 (a), espelho · `restaurado=true` | **vermelha**: os dois vencem |
| guards | `san3-05-acessos-de-plataforma-guard`, `db-catalog-write-guard`, `auth-invariant-guards`, `migration-transaction-guard` | `# tests 73 # pass 69 # fail 3 # skipped 1`; os 3 do `san3-05`: o L0 (124), o T13 e 2 chaves novas sem motivo: a do câmbio (F5a) e `L2 src/modules/subscription-billing/economic-groups/economic-groups.prisma.ts new AuditLogRepository(tx) PARAMETRO(tx) ×1` (a trilha no `tx`, molde do demonstrativo) | **vermelho esperado, dono F7** (motivo por chave) |
| `check`/`lint` | `npm run check` · `npm run lint` · `git diff --check` | `0` · `0` · vazio | verde |

**Leituras do dev, declaradas (§A6):**
1. **O diretório de organizações é uma porta do serviço** (`GroupTenantDirectory`: `getTenant`, `listTenantIds`). Os vínculos
   estão sob RLS FORCE e só se leem organização por organização; a rota (F6) monta o diretório (a `tenant-list` da visão). Nos
   testes, um diretório próprio de cada suíte.
2. **`validFrom` fora de `AAAA-MM-DD` → 400 `invalid_valid_from`.** O v2 não nomeia esse código.
3. **A organização com saída agendada do mesmo grupo, pedida de novo:** o serviço abre a continuação na data da saída (sem buraco,
   sem cruzar), porque o repositório não reabre linha. O v2 não fixa o caso; está coberto por um teste próprio.
4. **Os testes da F2 continuam intocados:** `tests/ass-09-groups.test.ts` e `membership.rules.ts` não estão no diff deste ramo
   (`git diff --name-only origin/feat/ass-09-visao-custo...HEAD`); as mutações da F2 foram só aplicadas e restauradas.

## J2 — o ramo do banco entra no ramo do bloco (Emenda 2 §1.5; Emenda 2.1 §4 e §6.1), 14/11 02:20–02:25 SP

Condição de entrada: a F3b está em `origin/feat/ass-09-visao-custo` = `96a0f84d` (`git log --format=%s origin/feat/ass-09-visao-custo
| grep -c 'F3b do B-ASS-09'` = 1), por fast-forward a partir de `121d2f21` (`git merge-base --is-ancestor 121d2f21 …` → verdadeiro),
aprovada pela verificação `ver-f3b-cl`. Roteiro da §1.5 com `OLD=317004e7` (F5b) e `BASE=75f27800` (o head do bloco usado na J1).

| passo | comando | saída | veredito |
|---|---|---|---|
| (1) | `git rebase origin/feat/ass-09-visao-custo` · `test -z "$(git diff --name-only --diff-filter=U)"` | `Rebasing (1/5)…(5/5)Successfully rebased and updated refs/heads/feat/ass-09-banco.` · nenhum conflito | limpo |
| (2) | `git diff "$BASE" "$OLD" -- . ":(exclude)$D" \| git patch-id --stable` × `git diff origin/feat/ass-09-visao-custo HEAD -- . ":(exclude)$D" \| git patch-id --stable` | A = `05ffc7b04c79eddfebd0f8c1010c740bba4bab29` · B = `05ffc7b04c79eddfebd0f8c1010c740bba4bab29` | iguais |
| (3) | linhas acrescentadas ao diário por cada lado desde a `BASE`, `comm -23` contra o diário do HEAD | lado do bloco (F3, F3b): 87 linhas distintas, **0** perdidas · lado do banco (`317004e7`): 307, **0** perdidas | o diário guarda os dois lados |
| C-E2-4 (o laço da Emenda 2.1 §4, `H=HEAD`) | cada commit de `2b5e0325..HEAD` pelo 1º rótulo do assunto | `SEM-ROTULO: 0` · `DOIS LADOS: 0` · 14 caminhos do banco, 10 do braço | nenhum arquivo com commit dos dois lados |
| bateria antes do push | `npm run db:generate` · `check` · `lint`; guard de migração; `-db` da fatia (drill, câmbio, grupos); memória (câmbio, serviço de grupos, F2, motor, dinheiro, assinatura da F3b, guarda do período) | `0` · `0` · `0` · `violações: 0` · `# tests 13 # pass 13 # fail 0 # skipped 0` · `# tests 52 # pass 52 # fail 0 # skipped 0` | verde |
| push do banco | `git push --force-with-lease=feat/ass-09-banco:317004e7 origin HEAD:feat/ass-09-banco` | `+ 317004e7...c26a1f06 HEAD -> feat/ass-09-banco (forced update)` | só no ramo do banco |
| avanço do bloco | `git merge-base --is-ancestor origin/feat/ass-09-visao-custo HEAD` → verdadeiro · `git push origin HEAD:feat/ass-09-visao-custo` | `96a0f84d..c26a1f06  HEAD -> feat/ass-09-visao-custo` (sem `--force`) | **fast-forward** |
| C-E2-4 depois | `git rev-parse origin/feat/ass-09-visao-custo origin/feat/ass-09-banco` · `git merge-base --is-ancestor 75f27800 origin/feat/ass-09-visao-custo` | os dois `c26a1f06…` · verdadeiro | os dois ramos no mesmo SHA; o bloco só andou para a frente |

**J2 feita.** A partir daqui o trabalho é no ramo do bloco (`feat/ass-09-visao-custo`); a F6 é de outro dev.

## F8 (parte 1, sem depender da F6) — guarda do markup, `PLANO_SAN3.md`, docs e registro, 14/11 02:26–02:37 SP

Pedido do orquestrador: adiantar no ramo do banco o que não depende das rotas da F6 (a F6 corre ao mesmo tempo no ramo do bloco,
em arquivos disjuntos: `overview.service.ts`, rotas, validadores e trilha). O resto da F8 (o `API_CONTRACTS.md` e o T-API-1) vem
depois da J3. Base: `1a3c7477` (J2).

| passo | comando | saída | veredito |
|---|---|---|---|
| guarda do markup (R-REG-1) | `CORE_SAAS_PERSISTENCE=memory node --test --import tsx tests/ass-09-markup-inalcancavel.test.ts` | `ok 1` (nenhum módulo de `src/modules/cloud-charges/` alcançável a partir dos 5 pontos de entrada: `src/app.ts`, `core-saas.ts`, `portal-app.ts`, `server.ts` e `src/infra/jobs/job-worker.bootstrap.ts`; 907 arquivos percorridos; 0 import relativo sem resolver; 0 `import()` com especificador não literal) · `ok 2` (controle: partindo de `cloud-charges/index.ts`, o caminhador vê o motor do markup) | verde |
| **M-REG-1** | recolocar em `src/modules/platform/platform.routes.ts` a linha de `0f2bfb73^:6`, `import { createCloudChargesPlatformRouter } from "../cloud-charges/cloud-charge.routes.js";` (âncora conta 1, restauração por md5) | `not ok 1`: 8 módulos de `cloud-charges` alcançáveis (`cloud-charge.routes.ts`, `.service.ts`, `.engine.ts`, `.rules.ts`, …) · `restaurado=true` | **vermelha**: é o vermelho-controle real |
| `PLANO_SAN3.md` (re-medido, Emenda 1 §1.2) | `grep -cE '^\| *61 *\|'` = 1 (l.144) · ``grep -cF '`B-ASS-09` · `feat/subscription-cost-overview`'`` = 1 (l.326); edição ancorada pelo conteúdo | item 61: `cloud-charge.engine.ts:80-97` e `PlatformCloudBillingPage.tsx:122-124,139` → "código de markup congelado e inalcançável (guard `tests/ass-09-markup-inalcancavel.test.ts`, `B-ASS-09`); tela em `frontend/src/modules/platform/cloud-billing/pages/PlatformCloudBillingPage.tsx`" (D-1, D-3) · linha do bloco: `backend` → `backend + prisma (M6)` (D-2) · `git diff --numstat` `2 2` | só as 2 linhas |
| `docs/subscription-billing.md` | seção nova "Visão da plataforma: custo × assinatura (B-ASS-09)", com "Câmbio do mês" e "Grupos"; e, junto do invariante do retrato (seção do demonstrativo), a frase do **K29** (A-E21-3) | `git diff --numstat` `82 1` (a linha trocada é a do invariante, que ganhou a frase do K29 no fim) | o texto descreve o contrato do plano e das emendas; confiro contra a F6 na parte 2 da F8 |
| `docs/cloud-cost-allocation.md` | uma linha, depois do risco H13: a visão mostra `multiple_imports_in_month` e nunca soma; o resto fica com o `B-ASS-13` | `1 0` | uma linha |
| `pendencias.md` (só acréscimo) | `node pend.mjs` (fora do repositório): 11 marcadores dentro das entradas e 2 entradas novas no fim | `git diff --numstat` `26 0`; `git diff -U0 … \| grep -c '^-[^-]'` = **0** | só acréscimo |
| triagem do D-4 | marcadores em: `P-REG-CONF542-01` (encerramento), `P-SAN3-05-LISTA-SEM-ALLOCATION-RUNS` (encerramento previsto, F7), `P-ASS09A-MES-EM-VARIOS-ARQUIVOS` (parte aqui; o resto ao `B-ASS-13`), `P-ASS09A-EMPATE-MESMO-MS` (encerramento por decisão), `P-ALLOC-MANUAL-INICIO-INCLUSIVO`, `P-ASS09A-BORDA-MICROSSEGUNDO`, `P-ASS09A-METODO-OUTRAS-REGRAS`, `P-ALLOC-RUN-STARTED-AT-NULO` (os 4 ao `B-ASS-09m`), `P-ASS09A-REDE-TRANSFERENCIA` (Q4 = sim, regra ao `B-ASS-09m`); e andamento em `P-CONFLITO-ASSINATURA-FILIAL-X-ORGANIZACAO` (Q2) e `P-DONO-CLOUD-BILLING-ESCOPO` | — | as linhas de status mudam no registro pós-merge, como na casa |
| entradas novas | `P-ASS08-REVERSAO-CREDITO-APLICADO` (ALTA, `pre-existente`, dono `B-ASS-08c`, bloqueia ligar o canal; A-E21-5) · `P-ASS09-INTEGRIDADE-POR-LINHA` (BAIXA, dono `B-ASS-12`, gatilho "alcance deixar de ser 0"; A-E21-2) | — | registradas |
| índice | `python agent-orchestration/controle/gerar-indice-pendencias.py` (2 vezes, mesma saída) | `987 cabecalhos / 976 IDs · ABERTA 755`; as 2 novas no índice (ALTA na linha 400, BAIXA na 775) | regenerado, nunca digitado |
| testes que leem esses arquivos | `CORE_SAAS_PERSISTENCE=memory node --test --import tsx` em `b-o6r-12-regime-census`, `b-san3-24-escopo`, `financial-ledger-helper`, `impound-checklist-link`, `kpi-dashboard-charts`, `o6r07c-subresource-scope`, `ass-09-markup-inalcancavel`, `db-catalog-write-guard`, `ass-01-markup-retirado`, `cloud-charge-markup-rules` | `# tests 107 # pass 106 # fail 0 # skipped 1` | verde |
| `check`/`lint` | `npm run check` · `npm run lint` · `git diff --check` | `0` · `0` · vazio | verde |

**Para a pré-revisão e a junta (V-F3b-1):** a âncora do C-E2-9 no head é `if (latest == null) throw snapshotMissing();` (com `==`, que
cobre o retrato nulo e o sem a chave), não `=== null` como a Emenda 2.1 escreve em §2.2, §2.5 (M-SUB-10) e §7. O
`git grep -c -F` com `===` dá 0; com `==`, 1.

**Leitura do dev, declarada (§A6):** o K29 entra também na seção do demonstrativo, junto da frase do invariante do retrato, porque o
A-E21-3 manda escrevê-lo "junto do invariante §3.3"; a seção nova da visão o repete com o mitigante.

## J3 — a F8 (parte 1) por cima da F6, e o bloco avança (Emenda 2 §1.5), 14/11 03:34–03:41 SP

A F6 (`dev-ass09-f13-cl`) entrou em `origin/feat/ass-09-visao-custo` = `4fb0d7b9`, a partir de `1a3c7477`. Parcial medido antes de
seguir (P3/P7): `w-ass09b` limpo, em `7035a686` = `origin/feat/ass-09-banco`; os arquivos das duas linhas são disjuntos, salvo
este diário (a F6 escreveu antes da linha `## F4 — ramo`; a F8, no fim); `git merge-tree --write-tree` limpo. Roteiro da §1.5 com
`OLD=7035a686` e `BASE=1a3c7477`.

| passo | comando | saída | veredito |
|---|---|---|---|
| (1) | `git rebase origin/feat/ass-09-visao-custo` · `test -z "$(git diff --name-only --diff-filter=U)"` | `Rebasing (1/1)Successfully rebased and updated refs/heads/feat/ass-09-banco.` · nenhum conflito | limpo |
| (2) | `git diff "$BASE" "$OLD" -- . ":(exclude)$D" \| git patch-id --stable` × `git diff origin/feat/ass-09-visao-custo HEAD -- . ":(exclude)$D" \| git patch-id --stable` | A = `d7ef7d35b1225ac8e8ddbdbbed2abeb033e00353` · B = `d7ef7d35b1225ac8e8ddbdbbed2abeb033e00353` | iguais |
| (3) | linhas acrescentadas ao diário por cada lado desde a `BASE`, `comm -23` contra o diário do HEAD | lado do bloco (F6): 81 distintas, **0** perdidas · lado do banco (`7035a686`): 23, **0** perdidas | os dois lados ficam |
| bateria antes do push | `db:generate` · `check` · `lint`; `-db` da fatia (drill, câmbio, grupos); memória `tests/ass-09-*.test.ts` (com as rotas da F6 e a guarda do markup) + `financial-period-lock-guard` + `ass-05b-audit-allowlist` | `0` · `0` · `0` · `# tests 13 # pass 13 # fail 0 # skipped 0` · `# tests 74 # pass 71 # fail 0 # skipped 3` (os 3 pulos são os 3 `-db` sem `DATABASE_URL`, cobertos na linha anterior) | verde |
| push do banco | `git push --force-with-lease=feat/ass-09-banco:7035a686 origin HEAD:feat/ass-09-banco` | `+ 7035a686...4851b97b` | só no ramo do banco |
| avanço do bloco | `git merge-base --is-ancestor origin/feat/ass-09-visao-custo HEAD` → verdadeiro · `git push origin HEAD:feat/ass-09-visao-custo` | `4fb0d7b9..4851b97b` (sem `--force`) | **fast-forward**; os dois ramos em `4851b97b` |

Corrigido neste commit: o fim da F8 parte 1 é 02:37 (medido), não 02:50.

## F7 — censos de rota, `san3-05` com as 10 rotas, ratchet e o fim a fim (plano v2 §9; Emenda 2.2), 14/11 03:44–04:10 SP

Base: `b9a5972f` (J3: F6 + F8 parte 1), nos dois ramos. Liberada pela Emenda 2.2 (03:43 SP). `git log d29b3bef..origin/main`
traz o #559 e o #560; nenhum dos dois toca o `san3-05` nem o `ci.yml`, e o #555 (que mexe no `san3-05`) segue aberto. Por isso
não há rebase sobre a `main` nesta fatia (ele exigiria force-push no ramo do bloco); a integração com a `main` é da F9 (Emenda 2.1
§3). Nenhuma rota além das 10 da F6.

**Censos (Emenda 2.2), só pelos geradores oficiais:**

| passo | comando | saída | veredito |
|---|---|---|---|
| antes | `CORE_SAAS_PERSISTENCE=memory node --test --import tsx tests/san3-18-route-module-census.test.ts tests/o6r07c-census-guard.test.ts` | `# tests 39 # pass 32 # fail 7` | o vermelho que a Emenda 2.2 mediu |
| `san3-18` | `node --import tsx scripts/san3-18-censo-modulos.mjs --gravar tests/fixtures/san3-18-route-modules.json` | `instantâneo gravado: 455 rotas · sem classe 0 · sem caminho 0` | — |
| `o6r07c` | `node --import tsx tests/helpers/o6r07c-census.ts gravar tests/fixtures/o6r07c-classificacao-vias.json`, e o `\n` final recolocado (o gerador grava sem) | `chaves vivas: 524 \| entradas ·07c-b: 0 \| VIOLAÇÕES: 0` · `instantâneo gravado: 524 chaves` | — |
| `git diff --stat -- tests/fixtures` | — | `o6r07c-classificacao-vias.json \| 42 +++…-` · `san3-18-route-modules.json \| 10 +++` · `2 files changed, 51 insertions(+), 1 deletion(-)` (numstat `41 1` e `10 0`) | o equivalente com o `\n` mantido |
| as chaves | `git diff … \| grep -E '^[+-][^+-]'` | `san3-18`: +10 linhas `"PLATAFORMA"` (`DELETE …/economic-groups/:groupId`, `GET …/economic-groups`, `GET …/economic-groups/:groupId`, `GET …/economic-groups/:groupId/history`, `GET …/fx-rates`, `GET …/overview`, `PATCH …/economic-groups/:groupId`, `POST …/economic-groups`, `PUT …/economic-groups/:groupId/members`, `PUT …/fx-rates/:month`) · `o6r07c`: +10 chaves `ROTA` — `LEITURA` em `GET …/economic-groups`, `GET …/economic-groups/:groupId`, `GET …/economic-groups/:groupId/history`, `GET …/fx-rates`, `GET …/overview`; `SEM-ALCANCE-CAMPO` em `DELETE …/:groupId`, `PATCH …/:groupId`, `POST …/economic-groups`, `PUT …/:groupId/members`, `PUT …/fx-rates/:month` — e `"ROTEADOR /api/v1/platform/billing"` `n: 3` → `n: 6` | **exatamente** o diff da Emenda 2.2 §2; nenhuma outra linha |
| depois | o mesmo par de testes | `# tests 39 # pass 39 # fail 0 # skipped 0` | verde |

**Ratchet** (`tests/san3-05-acessos-de-plataforma-guard.test.ts`): as 2 chaves, coladas da saída do gerador, com uma linha de
motivo cada — `L1 … fx-rates.prisma.ts PrismaFxRatesRepository.appendVersion tx RAW-SQL($executeRaw) OPACO ? $TRANSACTION-SEM-SETTER-PROVADO ×1`
("trava de tabela, não lê nem grava linha") e `L2 … economic-groups.prisma.ts new AuditLogRepository(tx) PARAMETRO(tx) ×1`
(a trilha no `tx` da volta da organização) — e o literal L0 `123 → 124` (a 1 tabela FORCE nova). Gerador e WRAPPERS
intocados. `git diff --numstat` `13 1`. Resultado: `# tests 35 # pass 35 # fail 0 # skipped 0` (antes: `fail 3`).

**`tests/san3-05-leituras-de-plataforma-db.test.ts`:**
- A linha do `manual-csv` passa a declarar `cloud_cost_allocation_runs` (a importação cria a run do rateio automático e enfileira
  o job) — o encerramento previsto da `P-SAN3-05-LISTA-SEM-ALLOCATION-RUNS`.
- As 10 rotas entram na lista fechada: 3 `SEM-FORCE` (`GET`/`PUT` do câmbio, `POST` do grupo) e 7 `FORCE-POR-TENANT` (a visão e
  as 6 do grupo que leem ou gravam `economic_group_members`, a PUT de membros também `audit_logs`). A rota FORCE nomeia só as
  tabelas FORCE que toca, como o resto da lista.
- Cada uma das 7 FORCE tem cenário próprio, nos dois papéis, recortado às 2 organizações e aos 2 grupos do seed (S, com A desde
  `0999-01-01`; T, vazio): a visão de `0999-03` por organização (a linha de A sai no grupo S), a lista de grupos (contagem de
  hoje), o detalhe e o histórico de S, a PUT de membros de T com B, a renomeação de T e a exclusão de S recusada (422
  `group_has_members`). O estado de B e o nome de T voltam ao seed antes de cada papel; a limpeza apaga vínculos, a trilha
  `economic_group.%` e os 2 grupos antes das organizações. `git diff --numstat` `109 1`.
- Resultado: `# tests 12 # pass 12 # fail 0 # skipped 0` (o T11e com as 7 rotas novas iguais nos dois papéis; o T11g com as 10
  na lista fechada e o FORCE de cada tabela conferido no catálogo).
- **Mutação suplementar (minha, declarada §A6):** a leitura dos vínculos fora do `tx` da volta
  (`tx.economicGroupMember.findMany` → `this.client.economicGroupMember.findMany` em `listMembershipsOfTenants`) → `not ok`:
  `GET /api/v1/platform/billing/economic-groups/:groupId/history: resultado vazio` sob o papel efêmero · `restaurado=true`. O
  diferencial enxerga o defeito de RLS.

**Fim a fim na forma real (R-E2E-db-1)**, `tests/ass-09-overview-e2e-db.test.ts`: o app de verdade, o papel efêmero
`NOSUPERUSER NOBYPASSRLS` como cliente global, um mês sorteado entre 1950 e 1998. O CSV sintético (`aws-cur-sample.csv`, no mês
da suíte, com a tag da organização) pela rota `manual-csv` → 1 run automática por importação → o job
`cloud-cost-allocation.run` a conclui → `PUT /billing/fx-rates/<mês>` com `5.000000` → `GET /billing/overview`. Sonda temporária
(aplicada e restaurada): `mes=1958-06 usd=12.75 brl=63.75 parcelas=63.75/0.00/0.00/0.00/0.00 total=63.75 status=ok` — o custo em
reais é o original vezes a taxa, a visão lê a run do rateio automático, e as 5 parcelas do global somam o total. Sem mutação
própria (é o aceite).

| bateria da F7 | comando | saída |
|---|---|---|
| `check`/`lint` | `npm run check` · `npm run lint` | `0` · `0` |
| `-db`, 3× | drill, câmbio, grupos, fim a fim e `san3-05-leituras-de-plataforma-db` | rodadas 1, 2, 3: `# tests 26 # pass 26 # fail 0 # skipped 0` |
| regressões `-db` | `san3-03-system-org-db`, `ass-09a-rateio-automatico-db`, `ass-03-metering-census-db` | `# tests 32 # pass 32 # fail 0 # skipped 0` |
| memória | `tests/ass-09-*.test.ts`, o par de censos, o ratchet, `db-catalog-write-guard`, `financial-period-lock-guard` | `# tests 146 # pass 141 # fail 0 # skipped 5` (os 5 pulos: os `-db` sem `DATABASE_URL`) |
| resíduo | `psql … erp_ass09` | vínculos 0 · grupos 0 · câmbio 0 · organizações 1 (`platform`, da migração) · importações 0 · papéis `o6r_b01_%` 0 |

## F8 (parte 2) — `API_CONTRACTS.md` e o T-API-1 (R-API-1; D-10), 14/11 04:10–04:18 SP

Re-medido antes de editar (Emenda 1 §1.2): o §3.3 começa em `### 3.3 Plataforma`; as 3 linhas de markup e a última linha da
tabela (`/platform/cloud-usage/tenants/:tenantId/summary` · `/daily`) casam 1 vez cada; a edição se ancora pelo conteúdo.

- `API_CONTRACTS.md` (`git diff --numstat` `62 3`): as 3 linhas de markup ficam, com "**Retiradas (B-ASS-01, 404).**" (D-10);
  as 10 rotas R1–R10 entram na tabela do §3.3, uma por linha, com a permissão; e a seção
  `platform_billing_overview@2026-11.b-ass-09`, com o formato por `groupBy`, a base `before_credits` (total gravado + crédito do
  retrato), os 15 campos que ficam `null` sem custo válido (P13), e os códigos de R1 a R10 como a F6 e a F5 os escrevem
  (`overview_integrity_violation`, `invalid_tenant_ids`, `invalid_valid_from` e `invalid_json` inclusive).
- `tests/ass-09-api-contracts.test.ts` (novo): o §3.3 × o runtime — o caminho sai da pilha dos 3 routers, e a permissão de uma
  sonda HTTP por rota (ator sem papel de plataforma com `x-permissions`; exatamente uma das duas permissões passa da guarda);
  mais a seção do contrato e as 3 linhas retiradas. `# tests 3 # pass 3 # fail 0 # skipped 0`.
- **M-API-1** (apagar a linha de `GET /platform/billing/economic-groups/:groupId/history`) → `not ok 1`:
  `- 'GET /economic-groups/:groupId/history platform:billing:read'` some do documentado · `restaurado=true`. **Vermelha.**
- Suplementar (minha, declarada §A6): `PUT /economic-groups/:groupId/members` com `platform:billing:read` na rota → `not ok 1`
  (`documentado … manage` × `runtime … read`) · `restaurado=true`. A sonda de permissão enxerga a troca.
- `docs/subscription-billing.md` (`5 2`): os 500 `membership_integrity_violation` e `overview_integrity_violation` e os 400
  `invalid_tenant_ids` e `invalid_valid_from`, como a F6 escreveu.
- Bateria: `check` `0` · `lint` `0` · `git diff --check` vazio · em memória `ass-09-api-contracts`, `ass-09-overview-routes`,
  `ass-09-markup-inalcancavel`, `db-catalog-write-guard`, `b-san3-12a-reasons-census` (que também lê o `API_CONTRACTS.md`):
  `# tests 23 # pass 22 # fail 0 # skipped 1` (o pulo é o `-db` do guard de catálogo, sem `DATABASE_URL`).

## F9 — a `main` integrada, as 4 suítes no `backend-postgres` (Q6) e a bateria (plano v2 §9; Emenda 2 §9.3; Emenda 2.1 §3), 14/11 05:13–07:23 SP (PARADA)

Retomada pelo `## PAUSA` de 04:20 SP, medindo o parcial antes (P3/P7): os dois ramos remotos em `b929a6dc`, `w-ass09b` limpo, o
cluster parado com a base `erp_ass09` migrada. Nada meio-escrito.

**Integração da `main` (`101c9db4`, com o #559, o #560 e o #555).** `git merge --no-ff origin/main` → `76a31641`, pais
`b929a6dc` e `101c9db4`. Conflitos (`git merge-tree --write-tree --name-only b929a6dc 101c9db4`): `decisoes.md`, `pendencias.md`
(o lado da `main` primeiro, porque o 1º item dele continua a entrada anterior) e
`tests/san3-05-acessos-de-plataforma-guard.test.ts` (as 4 chaves do B-ASS-08c1a ao lado das 2 do bloco no `NOVAS`), por união do
texto, nada próprio; e o `pendencias-indice.md`, regenerado pelo gerador
(`python agent-orchestration/controle/gerar-indice-pendencias.py`). O `API_CONTRACTS.md`, o `PLANO_SAN3.md` e o
`san3-05-leituras-de-plataforma-db.test.ts` se fundiram sozinhos. `git show --cc 76a31641`: as linhas novas em relação aos
dois pais são só as do índice regenerado e 1 linha em branco entre os dois lados do `decisoes.md`. `git diff 76a31641^2 76a31641
--stat` = `52 files changed, 9520 insertions(+), 720 deletions(-)`, que é a mudança do bloco sobre a `main`. Os dois ramos em
`76a31641`, por push sem força.

Depois disso a `main` ganhou o #563 (`9f1eadc2`, marco de KPI, só `Kpis/**`): nenhum arquivo em comum com o bloco e
`git merge-tree --write-tree HEAD origin/main` limpo, então não integrei de novo (o PR é mesclável).

**G3 e `createPgAdapter`.** O teste do fuso (`tests/db-fuso-utc-pontos-de-conexao.test.ts`) e a fábrica
`src/database/pg-connection.ts` não estão na `main` (`git ls-tree origin/main` vazio; `git show origin/main:src/database/pg-connection.ts`
→ `does not exist`): chegam com o #554, que não entrou. Os 4 `-db` novos do bloco constroem o adaptador com `new PrismaPg(` em
5 pontos (`grep -c`: `ass-09-fx-rates-db` 1, `ass-09-groups-db` 1, `ass-09-groups-fx-migration-drill-db` 2,
`ass-09-overview-e2e-db` 1). A troca, só da construção e sem mexer em asserção, fica para quando o #554 entrar (pendência
declarada no PR); não a fiz contra uma fábrica que não existe na base.

**As 4 linhas no `SUITES=` (Q6, `D-DONO-1311-RECOMENDACOES`).** `ab53a546`: exatamente 4 linhas, juntas e nesta ordem, depois da
última `SUITES="$SUITES tests/b-material-sync-db.test.ts"` e antes do `node --test … | tee postgres-subset.tap`. **Divergência
declarada (§A2):** o coordenador pediu "com o comentário de praxe"; a Emenda 2 §9.3 tira o comentário e o C-E2-10 conta
exatamente 4 linhas. Segui o plano (o plano é a lei; a emenda é a mais nova sobre o ponto). Se o comentário for querido, é 1
emenda e 1 linha. No mesmo commit, `decisoes.md` ganha a `D-DONO-1311-RECOMENDACOES` (Q1–Q6, *"minhas decisões vão todas nas
recomendações"*), por acréscimo.

Medição antes, na forma do job (`CORE_SAAS_PERSISTENCE=prisma`, `JWT_SECRET=dev-only-change-me`, `JWT_EXPIRES_IN=15m`,
`LOG_LEVEL=silent`, `RBAC_DB_PARITY=1`; base nova `erp_ass09_ci` → `migrate deploy` → `npm run db:seed`): as 4 suítes juntas,
3×, `# tests 14 # pass 14 # fail 0 # skipped 0` nas 3; cada uma sozinha, 3×, `6`/`4`/`3`/`1`, `fail 0`, `skipped 0`.

**Bateria da F9** (head `ab53a546`):

| item | comando | saída |
|---|---|---|
| tipos, lint, build | `npm run check` · `npm run lint` · `npm run build` · `npm run db:generate` | `0` · `0` · `0` · `0` |
| guard de migração | `node scripts/migration-transaction-guard.mjs` | `violações: 0` (135 migrações) |
| espaços | `git diff --check origin/main...HEAD` | vazio |
| C-E2-1 | `pg_advisory` em `src/**` | só `src/database/financial-period-lock.ts`; âncora do `LOCK TABLE` 1; `fxRateLockKey` 0; INSERT da barreira 1; `RawUnsafe("LOCK TABLE` no teste 0 |
| C-E2-4 | rótulo do 1º marcador de cada commit próprio (`git log --no-merges 2b5e0325..HEAD --not origin/main`) | 17 commits; sem rótulo 0; arquivo com commits dos dois lados 0 |
| C-E2-10 | as linhas novas do `ci.yml` | 4, na ordem, entre a âncora e o `node --test` |
| suíte, 1ª | `npm test` (forma do job `backend`: `CORE_SAAS_PERSISTENCE=memory`, `DATABASE_URL` do cluster próprio, sem Redis), `timeout 3000` | `exit=124`: a suíte travou no `ass-05-vault-routes` (o servidor próprio do teste não imprimiu `PORT` em 30 s sob a carga de 15 arquivos em paralelo, e os filhos vivos seguraram o arquivo). Sozinho: `# tests 5 # pass 5 # fail 0`, 38 s. Fora do diff do bloco |
| suíte, 2ª | `node scripts/run-backend-tests.mjs` com os 572 arquivos menos o `ass-05-vault-routes`, mesma forma | `572 arquivo(s) · 5724 teste(s) · pass 5694 · fail 26 · skipped 2` (+ `cancelled 2`), 1306 s, `exit=1` |

As 28 linhas `not ok` da 2ª, por arquivo e por causa:

| arquivo | n | causa | prova |
|---|---|---|---|
| `ass-08-lock-order-db` (T-LOCK-2, o censo) | 1 | **do bloco** | ver a PARADA abaixo |
| `domain-events` · `job-queue` · `worker-heartbeat` | 2 · 3 · 1 | sem Redis (a 6379 é proibida no mandato) | `code: 'ECONNREFUSED'` |
| `san3-05-runtime-role-guard-db` | 6 | Windows: ferramenta de Linux | `program "cat >/dev/null" failed` (38000), `setsid: ausente`, boot real sem saída em 15 s |
| `san3-09-bootstrap-platform-admin-db` | 2 | Windows | o `migrate deploy` do teste executa o shim de shell `node_modules/.bin/prisma` pelo `node` (`SyntaxError`); vermelho também sozinho |
| `users-seg-desativado-sse` | 6 | anterior ao bloco | vermelho sozinho (0/6) e também com o `src/` da `main` (`git checkout origin/main -- src/`, medido e restaurado: status limpo) |
| `ass-03-metering-db` · `users-acesso-seg-usuarios-db` | 1 · 6 | carga (`57014` statement timeout; corrida sob paralelismo) | sozinhos: `9/9` e `9/9` |

### PARADA 2026-11-14 10:23 UTC (07:23 SP) — o censo do T-LOCK-2 não conhece as 3 aberturas novas do bloco

**O defeito, medido.** `tests/ass-08-lock-order-db.test.ts` (do B-ASS-08, na `main` desde o #522) faz o censo, pelo
compilador, de toda abertura de transação em `src/modules/subscription-billing/**` contra a tabela congelada `FROZEN`. Uma
chave nova sem classe dá vermelho. Sozinho, no head `ab53a546`: `# tests 7 # pass 6 # fail 1`. A falha é
`not ok 6 - T-LOCK-2: o censo das aberturas bate com a tabela congelada…`, com `actual` igual a estas 3 chaves e `expected []`:
- `…/economic-groups/economic-groups.prisma.ts#PrismaEconomicGroupsRepository.listMembershipsOfTenants#forEachTenantRls`
- `…/economic-groups/economic-groups.prisma.ts#PrismaEconomicGroupsRepository.applyMembershipChanges#forEachTenantRls`
- `…/fx-rates/fx-rates.prisma.ts#PrismaFxRatesRepository.appendVersion#.$transaction`

Elas nasceram na F5a e na F5b. O teste já existia no F0 (`git merge-base --is-ancestor d5ec1696 2b5e0325` verdadeiro), mas o
plano e as emendas não o citam (`grep -i 'lock-order\|T-LOCK\|FROZEN'` nos 9 arquivos do plano: 0). E eu não o rodei antes:
ele só roda com `DATABASE_URL`, e as minhas baterias `-db` das fatias não o incluíam. No CI ele roda no job `backend`, que tem
`DATABASE_URL`; ele não está no `SUITES=` do `backend-postgres`. O job `backend` do PR ficaria vermelho.

**Por que parei.** O conserto mexe em `tests/ass-08-lock-order-db.test.ts`, que não está no PERMITIDO de fatia nenhuma. Pelo
mandato e pela `D-EMENDA-ANTES-DO-CODIGO`, não improviso. Não abri o PR.

**Medida da proposta, para quem escrever a emenda (sonda aplicada e restaurada, sem commit).** As 3 chaves entram na `FROZEN`
com a classe `sem-tabela-do-mapa`, em ordem alfabética, depois da linha do `provider-customer…set`. `git diff --numstat`
dá `3 0`. A condição da isenção vale: `MAP_MENTION` casa 0 vezes nos dois arquivos, porque eles não citam
`billing_outbox`/`subscription_statements*`/`StatementTx` nem `.transaction(`. Resultado: `# tests 7 # pass 7 # fail 0 # skipped 0`,
`restaurado=true` por md5, `git status` limpo. Também caberia uma linha no cabeçalho do arquivo ("B-ASS-09: 3 aberturas, sem
tabela do mapa"), como as extensões do 08b e do 08c1a fizeram. Fica para a emenda decidir.

- **Head medido:** `ab53a546` (F9: o `ci.yml` e o `decisoes.md`), mais o commit deste diário. Empurrados aos dois ramos por
  fast-forward, para o CI de push rodar no Linux.
- **Feito:** F0 a F8, a integração da `main` e o `ci.yml` (Q6). Bateria: tudo verde, exceto o T-LOCK-2. As outras 27 linhas
  vermelhas são de ambiente ou anteriores ao bloco (tabela acima).
- **Falta:** a emenda; o conserto de 3 linhas; reexecutar o `ass-08-lock-order-db` e a suíte; abrir o PR em rascunho (o corpo já
  está pronto em `dev-ass09-cl-tmp/pr-body.md`); a limpeza. A troca de `new PrismaPg(` por `createPgAdapter` espera o #554.
- **Próximo comando, depois da emenda:** aplicar as 3 linhas pela emenda; depois
  `DATABASE_URL=… node --test --import tsx tests/ass-08-lock-order-db.test.ts`.
- Cluster `pg-ass09` parado depois deste registro (pasta `C:/Users/thiag/pg-ass09`, `127.0.0.1:55561`, bases `erp_ass09` e `erp_ass09_ci` mantidas). Nenhum papel efêmero restante.

### Adendo à PARADA, 2026-11-14 10:41 UTC (07:41 SP): o CI no Linux mostra mais 2 censos e um ID repetido

O CI de push rodou no Linux, e o que o Windows mascarava apareceu. A `main` está verde no `9f1eadc2` (rodada `43576957097`).

| rodada · head | job | resultado |
|---|---|---|
| `43576090192` · `76a31641` | `backend` | `573 arquivo(s) · 5739 teste(s) · pass 5734 · fail 3 · skipped 2`: o T-LOCK-2, o T14a/b e o pai dele (`san3-05-runtime-role-guard-db`) |
| `43576090192` · `76a31641` | `frontend` | `# tests 1806 # pass 1805 # fail 1`: o T40 |
| `43585218449` · `06732ccb` | `backend-postgres` | `# tests 635 # pass 635 # fail 0 # skipped 0`. A `main` dá 621, e 621 + 14 = 635: as 4 suítes da Q6 rodaram, sem pulo |
| `43585218449` · `06732ccb` | `frontend` | o mesmo T40 (`1805/1806`) |

**Os 2 censos novos.** Os dois nasceram do bloco e ficam fora do PERMITIDO. Cada um tem precedente de atualização no PR do
bloco que mexeu no número.

1. `tests/san3-05-runtime-role-guard-db.test.ts:1019` (T14a/b), o literal `tabelas_com_dml`:
   - o esperado é `…|0|0|139` e o CI lê `…|0|0|142`;
   - `142 − 139 = 3` são exatamente as 3 tabelas da M6 (`grep -c 'CREATE TABLE'` no `migration.sql` = 3);
   - `posse_force` e `views_sobre_force` seguem 0;
   - precedente: o B-ASS-08 foi de 133 para 139, com a linha de comentário `:1016`;
   - no Windows o teste cai antes, por `setsid` ausente, e isso escondeu o número.
2. `frontend/tests/san3-06b-navegacao-plataforma.test.ts:61` (T40), o literal `endpoints sob /api/v1/platform = 53`:
   - o gerador `scripts/san3-06b-endpoints-de-plataforma.mjs` dá 63 no CI e aqui;
   - `grep -c 'billing/(overview|fx-rates|economic-groups)'` na saída = 10, as rotas R1–R10;
   - precedente: o B-ASS-04 foi de 35 para 48, e o B-ASS-05 de 48 para 53;
   - não rodei o teste do frontend aqui, porque o worktree não tem `frontend/node_modules`.

**O ID repetido.** A `main` andou para `521f0bcb` (#562, registro). Esse merge traz o `D-DONO-1311-RECOMENDACOES`
(`decisoes.md`, "~23:12 SP"), o mesmo ID da entrada que o `ab53a546` pôs ("~23:20 SP", com Q1–Q6). Hoje
`git merge-tree --write-tree HEAD origin/main` sai com 1: há conflito em `decisoes.md`, `pendencias.md`, no índice e no
`PLANO_SAN3.md`. Na próxima integração, a entrada do bloco não pode entrar com o ID repetido (§A2). A da `main` é a fala; a
minha é a aplicação ao B-ASS-09. A emenda decide entre tirá-la e trocar o título por uma aplicação da entrada da `main`.

**A "praxe" das 4 linhas.** A entrada da `main` diz, para o `B-SAN3-17`, "entra no `SUITES=` … com o comentário de praxe". É a
mesma expressão do coordenador. A Emenda 2 §9.3 deste bloco tira o comentário, e o C-E2-10 conta 4 linhas. Mantive o plano. A
emenda pode trocar isso numa linha.

**A emenda pedida consolida 4 pontos:**
- as 3 chaves da `FROZEN` (T-LOCK-2), medidas: 7/7;
- `139 → 142` (T14a/b, com a linha de comentário);
- `53 → 63` (T40);
- o ID repetido na integração do `521f0bcb`.

Depois vem a bateria de novo (o `ass-08-lock-order-db` local e o CI de push) e o PR em rascunho.

## F9, retomada pela Emenda 2.3 e com o #554, 14/11 07:44–08:15 SP

**§4.1: a `main` integrada com a §2.** `198d670b` é o merge de `ae7c0a74` com `521f0bcb` (o #562 e o #563).
- Conflitos: `pendencias.md`, resolvido por união; o índice, regenerado; e `decisoes.md`, resolvido pela §2.
- Em `decisoes.md` fica a entrada da `main` da `D-DONO-1311-RECOMENDACOES`. A entrada do bloco perde o cabeçalho e vira o sub-item
  "**(d) A Q5 e a Q6 do `B-ASS-09`**", antes do "Revogada em parte".
- Contagem dos cabeçalhos: `grep -c '^## D-DONO-1311-RECOMENDACOES'` = 1. O comando literal da §2 dá 0, porque o cabeçalho da `main`
  é `## … (2026-11-13 ~23:12 SP) —` e o padrão procura `### ` ou `RECOMENDACOES —`.
- Linhas próprias do merge (`git show --cc`): 7 no `decisoes.md` (o sub-item), 1 linha em branco no `pendencias.md` e o índice.
- **Leitura do dev, declarada (§A6):** a §2 chama de "texto próprio" da entrada do bloco as respostas Q5 e Q6, e só elas entram no
  (d). As respostas Q1 a Q4 não mexem em registro do repositório. Elas ficam no plano, fora do repositório, e valem pela regra
  geral da entrada da `main` ("toda pergunta ao dono aberta naquela hora é respondida pela recomendação").

**§1: os 3 censos** (`1560cc89`):

| teste | mudança | medida |
|---|---|---|
| T-LOCK-2 | +3 chaves `sem-tabela-do-mapa`, cada uma com 1 linha de motivo (`6 0`) | `# tests 7 # pass 7 # fail 0`. Mutação de controle **M-LOCK-E23**: tirar a chave do `appendVersion` → `not ok 6`, com a chave no `actual`; restaurado por cópia, md5 igual |
| T14a/b | `139 → 142`, com o comentário das 3 tabelas da M6 (`2 1`) | `git diff --name-only origin/main...HEAD -- prisma/migrations` = só a M6, com 3 `CREATE TABLE` (`economic_groups`, `economic_group_members`, `platform_fx_rates`). O teste só roda no Linux, e fica para o CI |
| T40 | `53 → 63`, com o comentário das 10 rotas (`2 1`) | `--test-name-pattern=T40` da raiz: `# pass 1 # fail 0` (os outros 2 casos do arquivo ficam fora do padrão) |

Nenhuma asserção sai. O `git diff -U0` dos 3 arquivos tem 2 linhas `-assert`, e as duas são os literais trocados (139 e 53), cada uma
com a substituta.

**Incidente da medição, declarado.** Na 1ª tentativa da mutação de controle, restaurei com `git checkout --`. A edição ainda não estava
no índice, e o checkout levou junto as 6 linhas do conserto. Medi (`git diff --numstat` sem o arquivo), reapliquei pela mesma âncora
e pus a edição no índice. Daí em diante, a restauração é por cópia, com md5 igual. A 2ª rodada é a que vale: `7/7` → mutante `6/7` →
restaurado `7/7`.

**O #554 entrou (`14b693e4`, 07:53 SP).** `149f17ab` é o merge com ele. O conflito do ratchet `san3-05` se resolve por união: as 2
chaves do bloco ficam ao lado da chave do B-DB-FUSO-UTC, cada uma na sua entrada. O índice foi regenerado, e as únicas linhas
próprias são as do índice. Com o merge, o ratchet dá `35/35`.

`3a42528c` faz o G3: os 5 `new PrismaPg(` dos 4 `-db` viram
`(await import("../src/database/pg-connection.js")).createPgAdapter(…)`, como as suítes do #554. Só muda a linha de construção, e o
connection string é o mesmo, com o `application_name`. O `PrismaPg` desestruturado fica sem uso, porque os testes não entram no
`tsconfig`.
- Contagem: 217 `new PrismaPg(` em `tests/`, fora de `tests/helpers/` e de `tests/db-fuso-utc-*`, que é o teto.
- O G3 (`tests/db-fuso-utc-pontos-de-conexao.test.ts`) dá `# tests 6 # pass 6 # fail 0`.

**Bateria no head `3a42528c`:**
- `db:generate`, `check`, `lint` e `build`: `0`.
- Guard de migração: `violações: 0`. `git diff --check`: vazio.
- As 4 suítes na forma do `backend-postgres` (base nova, `migrate deploy`, `db:seed`): `14/14` nas 3 rodadas, `0` pulo.
- `ass-08-lock-order-db` + `san3-05-leituras-de-plataforma-db`: `19/19`.
- Em memória, `ass-09-*`, os censos `san3-18-*` e `o6r07c-*`, `db-catalog-write-guard` e `financial-period-lock-guard`:
  `# tests 376 # pass 368 # fail 0 # skipped 8` (os 8 pulos são `-db` sem `DATABASE_URL`).
- Commits próprios desde o F0: 21.
