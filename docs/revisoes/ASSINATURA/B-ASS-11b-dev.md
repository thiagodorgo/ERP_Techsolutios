# B-ASS-11b — diário de dev (Parte R do item 62: o cliente sem a consulta de tendência)

Bloco **B-ASS-11b** — retira do cliente `GET /api/v1/billing/subscription/usage-history` (P12; decisão 8.2 do dono, "a
tendência sai"). Junta completa (a trava casa `tenant` no nome do arquivo de rotas).
Identidade de dev: **`dev-62r-cl`, Claude Opus 5.5, identidade nova, DECLARADA.** Não escrevi o plano nem as emendas e não
os critiquei. Exceção declarada: o §8 da Emenda 1.1 pede Codex para a Parte R; o orquestrador designou este dev.

- **Lei (a mais nova prevalece):** `erp-pausa-2026-10-03/planos/plano-B-ASS-11-emenda1.md` → `plano-B-ASS-11-emenda1.1.md`
  (§1.3, §3.2, §4.3, §6, §8 "Parte R — 3 fatias") → `plano-B-ASS-11-emenda1.1.1.md`. Fora do repositório.
- **Ramo:** `fix/ass-cliente-sem-tendencia` (o nome da lei: Emenda 1, tabela do Resumo). **Worktree:** `~/w-62r`, a partir
  de `origin/main` `adec93ce` (#565); `npm ci` próprio (sem junction); `prisma generate` com `DATABASE_URL` fictícia.
- **Banco:** nenhum. A lei não pede teste `-db`, e o job `backend-postgres` não roda suíte de cobrança.
- **Diário completo, com cada comando e a hora de `date`:** `erp-pausa-2026-10-03/revisoes/b-ass-11/dev-62r-cl.md`, fora do
  repositório. Abaixo, o resumo por fatia.

## Fatias

| fatia | hora (SP) | comando | saída resumida | veredito |
|---|---|---|---|---|
| R0 | 21:14–21:16 | a regressão do §8.3 na `main` (`ass-04-statement-routes`, `san3-04a-menu-front-x-catalogo`, `navigation-menu`, `san3-18-menu-modules`, `san3-18-route-module-census`, `o6r07c-census-guard`), em memória | `tests 95 · pass 95 · fail 0` | base verde (o V2 da evidência também deu 95) |
| R0 | 21:17–21:18 | `node --test --import tsx tests/ass-11b-cliente-so-p12.test.ts tests/ass-04-statement-routes.test.ts` (produção intocada) | `tests 25 · pass 19 · fail 6`: T-ST-64 `actual 200 / expected 404`; T-R1 `[GET /billing/subscription, GET /billing/subscription/usage-history]`; T-R2 `ocorrências: 7`; T-R3 2 endpoints; T-R4 a chave em cada fixture; T-R5 a l.117 da doc | **vermelho-controle por asserção** nos 6 |
| R1 | 21:19 | `git fetch origin main && git rebase origin/main`; `gh pr view 566 --json state -q .state` | `adec93ce` (não andou); `OPEN` | rebase antes da R1 |
| R1 | 21:20 | a retirada por chave (§6.1); `npx tsc -p tsconfig.json --noEmit`; `git diff --check` | 4 arquivos, 3+/58−; tsc 0; check 0; `git grep` dos 4 nomes em `src` e na doc → 0 | retirada limpa |
| R1 | 21:21–21:22 | `tests/helpers/o6r07c-census.ts gravar …`; `printf '\n' >> …`; `scripts/san3-18-censo-modulos.mjs --gravar …`; `git diff --numstat origin/main -- tests/fixtures/` | `513 chaves · VIOLAÇÕES: 0`; o gerador gravou sem a quebra final (`}\n}`), o `printf` a devolveu; `444 rotas · sem classe 0`; **`0 4`** e **`0 1`** | as fixtures pelo gerador, só a chave da tendência sai |
| R1 | 21:23–21:25 | o teste novo + a regressão do §8.3 | `tests 100 · pass 100 · fail 0` | verde |
| R2 | 21:27–21:30 | as 4 mutações (âncora `grep -cF` = 1 em cada; aplicada, rodada, restaurada e conferida byte a byte) | ver a tabela abaixo | as 4 vermelhas, restauradas |
| R2 | 21:31–21:32 | `npm run check` · `npm run lint` · `npm run build` · `git diff --check origin/main...HEAD` | exit 0 nos 4 | verde |
| R2 | 21:32–21:44 | `npm test` (o runner assume `CORE_SAAS_PERSISTENCE=memory`; rodado SEM `DATABASE_URL` e `REDIS_URL`, que o job `backend` do CI tem) | `573 arquivos · 4733 testes · pass 4541 · fail 13 · cancelled 1 · skipped 178`; o piso de denominador acusou `core-saas-role-authority`. O TAP parou em 185 até eu encerrar os 4 servidores-filhos órfãos do cofre do meu worktree (classe `P-TESTE-VAULT-ROUTES-FILHO-ORFAO`) | os vermelhos são de 5 arquivos, nenhum de cobrança, navegação ou censo; ver abaixo |
| R2 | 21:45–21:57 | cada arquivo vermelho sozinho, e A/B com os 3 arquivos de `src/` da `main` (`git checkout origin/main -- <3>`, depois `git checkout HEAD -- <3>`, árvore limpa) | `ass-05-vault-routes` 5/5 sozinho; `core-saas-role-authority` cai no import nos dois lados (`DATABASE_URL is required to initialize Prisma Client.`); `job-worker-bootstrap` 6/7 e `traccar-ingest-listener` 16/18 nos dois lados (a sonda de fuso e o boot precisam do banco); `users-seg-desativado-sse` oscila com a CPU em 100%: head 6/6 e 0/6, `main` 6/6, 0/6 e 0/6 | **ambiente, igual na `main`** (leitura do dev, declarada §A6); quem decide é o CI |
| R2 | 22:03 | `git fetch origin main && git rebase origin/main` (a `main` andou para `8fc4b60e`, #570, só registro) | R0 e R1 reaplicadas sem conflito; o registro desta fatia foi reaplicado por cima da `main` nova, e o índice regenerado | rebase antes do head da junta |
| R2 | 22:04–22:06 | os 2 geradores de novo, depois do rebase | o mesmo `513 chaves · VIOLAÇÕES: 0` e `444 rotas · sem classe 0`; `git diff` das fixtures contra a R1 vazio; contra a `main` nova, `0 4` e `0 1` | as fixtures seguem as do gerador |

## Mutações

| # | âncora (`grep -cF`) | troca | vermelhos |
|---|---|---|---|
| MR-1 | `  return router;` → 1 | inserida na linha de cima a rota `${BASE}/usage-history` respondendo 200 | `tests 64 · fail 8`: **T-ST-64** (`actual 200 / expected 404`), **T-R1**, `o6r07c-census-guard` T1 (`NAO-CLASSIFICADA: ROTA GET /api/v1/billing/subscription/usage-history`) e T14, `san3-18-route-module-census` P2 ×4 |
| MR-2 | `router.use(BASE, requirePermission("billing:read"));` → 1 | linha removida | `tests 25 · fail 1`: **T-ST-31** (`actual 200 / expected 403`) |
| MR-3 | `relatedEndpoints: ["GET /api/v1/billing/subscription"],` → 1 | com o 2º endpoint | `tests 27 · fail 1`: **T-R3** |
| MR-4 | `export type TenantSubscriptionView = {` → 1 | inserido na linha de cima `export type UsageHistoryRow = { readonly period: string };` | `tests 5 · fail 1`: **T-R2** (`actual: [ 'UsageHistoryRow' ]`) |

## Lista do diff (Emenda 1.1 §4.3)

`git diff --name-only origin/main...HEAD` (mais a árvore), conferido por expressão contra o PERMITIDO do §6.1: **15 caminhos, nada fora**.

- código, teste e doc (8): `src/modules/subscription-billing/subscription-billing.tenant.routes.ts`, `src/modules/subscription-billing/statements/subscription-view.ts`, `src/modules/navigation/navigation.registry.ts`, `tests/ass-04-statement-routes.test.ts`, `tests/ass-11b-cliente-so-p12.test.ts`, `tests/fixtures/o6r07c-classificacao-vias.json`, `tests/fixtures/san3-18-route-modules.json`, `docs/subscription-billing.md`;
- registro (7): `agent-orchestration/codex/comandos/B-ASS-11b-cliente-sem-tendencia.md`, `docs/revisoes/ASSINATURA/B-ASS-11b-dev.md`, `agent-orchestration/controle/pendencias.md`, `agent-orchestration/controle/pendencias-indice.md` (regenerado), `agent-orchestration/controle/decisoes.md`, `agent-orchestration/docs/status-geral.md`, `docs/revisoes/SAN3/PLANO_SAN3.md` (só a l.146).

Depois do rebase (22:06–22:09): a regressão do §8.3, o teste novo e os testes que leem o registro (`b-o6r-12-regime-census`, `kpi-dashboard-charts`, `b-san3-24-escopo`, `o6r07c-b-scope`, `ass-09a-rateio-automatico`, `impound-checklist-link`, `financial-ledger-helper`) → `tests 383 · pass 383 · fail 0`.

## Depois do PR em rascunho: o #566 entrou na `main` (22:30–22:43)

| hora (SP) | comando | saída resumida | veredito |
|---|---|---|---|
| 22:30 | `gh pr checks <PR>` no head `1d718d1a` | os 8 jobs verdes nas 2 rodadas (push e pull_request) | CI verde |
| 22:30 | `git fetch origin main`; `gh pr view 566 --json state` | `origin/main` = `cd480ab6` (#566, `B-ASS-09`); `MERGED` | a ordem #566 → R vale: o head da junta tem de estar em dia com a `main` |
| 22:31 | `git merge --no-ff origin/main` (merge, não rebase: o ramo já está no remoto e não se empurra com force) | auto-merge nas fixtures, na doc, em `pendencias.md` e `decisoes.md`; conflito em `pendencias-indice.md` (regenerado) e em `PLANO_SAN3.md`, só de vizinhança: o #566 mudou a l.145 (item 61), este bloco a l.146 (item 62); ficam as duas | resolvido sem escolher texto de ninguém |
| 22:32–22:34 | os 2 geradores sobre a árvore do merge | o6r07c `523 chaves · VIOLAÇÕES: 0` (o gerador de novo sem a quebra final, `printf` aplicado); san3-18 `454 rotas · sem classe 0`; o gerador dá o mesmo arquivo do auto-merge; contra a `main`, `0 4` e `0 1` | fixtures pelo gerador |
| 22:34–22:41 | regressão do §8.3 + teste novo + testes que leem o registro + os 11 arquivos de teste (não `-db`) do #566; `prisma generate` (o #566 mudou o schema; `DATABASE_URL` fictícia); `check`, `lint`, `build` | `tests 233 · pass 233 · fail 0`; o 1º `check` deu exit 2 só por cliente Prisma velho, e depois do `generate` os 3 deram exit 0 | verde |

## Fora do bloco, declarado

- Os comandos do §1.3 (fechamento do item 62) não se aplicam a este PR: a tela (`B-ASS-11`, Parte T) não está na `main`. O
  item 62 segue PARCIAL.
- O `status: "backend-ready"` do item `tenant.billing` não muda (Emenda 1.1 §7, A10): nasce a `P-NAV-TENANT-BILLING-STATUS`.
