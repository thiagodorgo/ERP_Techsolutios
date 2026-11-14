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

## F4 — ramo `feat/ass-09-banco` (worktree `C:/Users/thiag/w-ass09b`)

(preenchido no ramo `feat/ass-09-banco`)
