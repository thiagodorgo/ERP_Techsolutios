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

## F4 — ramo `feat/ass-09-banco` (worktree `C:/Users/thiag/w-ass09b`)

(preenchido no ramo `feat/ass-09-banco`)
