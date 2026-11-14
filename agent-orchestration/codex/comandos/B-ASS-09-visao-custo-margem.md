# B-ASS-09 — Visão de custo × assinatura por organização, grupo e global, com câmbio (item 61 do portão)

- **Tipo:** feature (bloco de DINHEIRO e de BANCO: calcula margem, converte moeda e cria tabela de organização sob RLS FORCE)
- **Fase:** Execution
- **Trilha:** backend/raiz
- **Data:** 2026-11-13
- **Ramos:** `feat/ass-09-visao-custo` (ramo do bloco; fatias do braço F0–F3, F6, F9) e `feat/ass-09-banco` (fatias do Claude
  F4 e F5, num worktree próprio; o orquestrador junta por rebase antes da F6). 1 bloco = 1 PR, aberto na F9.
- **Autor deste comando:** `dev-ass09-cl`, Claude Opus 5.5 (subagente da sessão), nível menor, **identidade de dev declarada**
  (§C7 item 11(6)), fazendo a F0 **cobrindo o braço, declarado** (as contas Codex sem janela e o DeepSeek no horário de pico).
- **Plano (norma única):** `erp-pausa-2026-10-03/planos/plano-B-ASS-09-v2.md` com a **Emenda 1**
  (`plano-B-ASS-09-v2-emenda1.md`, que prevalece). Fora do repositório. Onde este comando divergir do plano, vale o plano.
- **Nível de revisão:** junta completa (§C7 item 10(1)): dinheiro (margem e câmbio), banco (migração nova com tabela FORCE e
  extensão) e isolamento entre organizações. A trava automática sobe de qualquer jeito (o diff toca `prisma/**`).
- **KPI:** congelado (§C7 item 8(5)). Nenhum arquivo de `Kpis/**` muda.

## Autorização de `prisma/**`

A migração **M6** (`prisma/migrations/20260903000000_ass09_economic_groups_fx_rates/`, renumerável) e os 3 modelos do
`schema.prisma` estão autorizados pela **P1 de 31/10, `D-COBRANCA-RESPOSTAS-3110`** ("7 de esquema", a M6 entre elas). Nenhuma
outra migração, coluna nova em tabela existente nem migração de dados.

## Objetivo

A plataforma passa a ver, para um mês `P`, quanto cada cliente paga e quanto custa, por organização, por grupo e no global, em
reais, com margem e alerta, e com toda ausência de dado visível, nunca zero. Ficam de fora: a tela (é do `B-ASS-10b`), os
consertos do motor de rateio (vão ao `B-ASS-09m`) e qualquer preço calculado a partir de custo.

## Contexto / fontes de verdade

- Ler antes: `agent-orchestration/docs/status-geral.md`, `agent-orchestration/controle/`, `PROJECT_MEMORY.md`.
- Fontes: `RBAC_MATRIX.md` (nenhuma permissão nova; `platform:billing:read` e `platform:billing:manage` já existem),
  `API_CONTRACTS.md` §3.3, `docs/subscription-billing.md`, `docs/cloud-cost-allocation.md`.
- Divergências registradas antes do código (§A2): `agent-orchestration/controle/decisoes.md`,
  `REGISTRO-ASS09-CONFLITOS` (D-1 a D-11 e a pergunta Q6).
- Blocos relacionados: `B-ASS-09a` (#542, rateio automático), `B-ASS-04` (demonstrativo), `B-ASS-01` (#498, markup retirado),
  `B-ASS-10b` (tela).

## Contratos / Endpoints

Base `/api/v1/platform/billing`, no router de plataforma que já existe. Todas sob `requirePlatformPermission(...)`.

| # | rota | permissão |
|---|---|---|
| R1 | `GET /overview?period=AAAA-MM&groupBy=tenant\|group\|global` | `platform:billing:read` |
| R2 | `GET /fx-rates?from=AAAA-MM&to=AAAA-MM` | `platform:billing:read` |
| R3 | `PUT /fx-rates/:month` | `platform:billing:manage` |
| R4 | `GET /economic-groups` | `platform:billing:read` |
| R5 | `POST /economic-groups` | `platform:billing:manage` |
| R6 | `GET /economic-groups/:groupId` | `platform:billing:read` |
| R7 | `PATCH /economic-groups/:groupId` | `platform:billing:manage` |
| R8 | `DELETE /economic-groups/:groupId` | `platform:billing:manage` |
| R9 | `PUT /economic-groups/:groupId/members` | `platform:billing:manage` |
| R10 | `GET /economic-groups/:groupId/history` | `platform:billing:read` |

- Envelope `{ data }`; erro `{ error: { code, reason, message } }`. **Versão do contrato:**
  `platform_billing_overview@2026-11.b-ass-09`.
- Ator de organização → 403 em todas. Nada novo em `/billing/*`.

## Regras (negócio · permissão · segurança)

- Dinheiro em centavos inteiros (`BigInt`) no cálculo e string com 2 casas no JSON; nenhum `float` depois da entrada;
  arredondamento metade para longe do zero.
- Custo ausente (`no_run`, `no_import`, `fx_missing`, `currency_unknown`) deixa `null` todo campo de custo e margem em reais,
  na linha, no grupo, em `totals` e no global. Taxa ausente nunca vira 1.
- Base da assinatura: total do demonstrativo (`subscriptionBasis: "statement_total"`), com `statementTotal` e `creditsApplied`
  separados (D-9; pergunta Q5 com padrão).
- Uma organização tem no máximo um vínculo de grupo em qualquer dia: `EXCLUDE USING gist` no banco e checagem por intervalo
  no serviço; `23P01` vira 409 `membership_conflict`; o motor falha fechado (500 `membership_integrity_violation`).
- Câmbio com histórico: versão nova a cada `PUT`, nunca `UPDATE`, sob `pg_advisory_xact_lock`.
- Trilha só pela allowlist (`pickBillingAuditMetadata`); nome de grupo e de organização nunca entram.
- Repositório público: todo número de teste é sintético; nenhum valor real de fatura, taxa negociada ou preço de plano.

## Escopo PERMITIDO (plano §7)

- `src/modules/subscription-billing/overview/**`, `economic-groups/**`, `fx-rates/**` (novos)
- `src/modules/subscription-billing/subscription-billing.platform.routes.ts` — só montar os 3 routers novos
- `src/modules/subscription-billing/subscription-billing.service.ts` e `src/modules/subscription-billing/index.ts` — fábricas e
  exports, se o padrão do módulo pedir
- `src/modules/subscription-billing/platform-audit/audit-metadata.ts` — só as chaves novas
- `src/modules/subscription-billing/metering/censored-tables.ts` — só pela regeneração `node scripts/gen-tenant-tables.mjs`
- `prisma/schema.prisma` — 3 modelos e a relação inversa em `model Tenant`
- `prisma/migrations/20260903000000_ass09_economic_groups_fx_rates/migration.sql` (novo; renumerável)
- `tests/ass-09-*.test.ts` e `tests/ass-09-*-db.test.ts` (novos)
- `tests/san3-05-leituras-de-plataforma-db.test.ts` — as 10 rotas na `SUPERFICIE` e a linha do `manual-csv`
  (`P-SAN3-05-LISTA-SEM-ALLOCATION-RUNS`)
- `tests/san3-05-acessos-de-plataforma-guard.test.ts` — só as chaves novas, uma linha de motivo cada
- `tests/ass-05b-audit-allowlist.test.ts` — só a lista congelada
- `API_CONTRACTS.md` — só o §3.3 (as 10 linhas e a marcação "retiradas" nas 3 rotas de markup) e a seção nova
  `platform_billing_overview@2026-11.b-ass-09`
- `.github/workflows/ci.yml` — **só com o "sim" do dono na Q6** (as 4 linhas `SUITES=` no job `backend-postgres`). Sem
  resposta, PROIBIDO
- `docs/subscription-billing.md` (seções novas), `docs/cloud-cost-allocation.md` (uma linha),
  `docs/revisoes/SAN3/PLANO_SAN3.md` (a linha do item 61 e a do bloco)
- `docs/revisoes/ASSINATURA/B-ASS-09-dev.md` (diário do dev)
- este comando
- `agent-orchestration/controle/decisoes.md`, `pendencias.md` (e `pendencias-indice.md`, só regenerado)

## Escopo PROIBIDO (plano §7)

- `src/modules/cloud-cost-allocation/**` (só `import` do serviço e dos tipos), `src/modules/cloud-costs/**`,
  `src/modules/cloud-charges/**` (congelado)
- `src/modules/subscription-billing/{statements,plans,outbox,webhooks,providers,vault,charges,credits,invoices,billing-profile}/**`
  e o resto de `metering/**`; `subscription-billing.tenant.routes.ts`
- `src/app.ts`, `src/modules/platform/platform.routes.ts`, `src/modules/core-saas/permissions/**`, `RBAC_MATRIX.md`
- `frontend/**`, `mobile/**`, `Kpis/**`, `.github/**` (salvo o `ci.yml` com a Q6), lockfiles, `infra/**`, `.env`,
  `prisma/seed*.ts`
- coluna nova em tabela existente; migração além da M6; migração de dados; preço calculado a partir de custo; chamada externa
  (câmbio automático)
- usar `paidCents` como base da assinatura; trocar a base do D-9 sem emenda escrita

Ampliação nominal só por emenda escrita antes do código (`D-EMENDA-ANTES-DO-CODIGO`).

## Perguntas ao dono (plano §13) — nenhuma segura o bloco; vale o padrão sem resposta

- **Q1** (o grupo é um só?): padrão, um conceito só, criado por este bloco.
- **Q2** (quem assina pelo grupo?): padrão, a matriz assina; a filial sai `no_subscription` e a margem vale no grupo.
- **Q3** (que taxa?): padrão, digitada pela plataforma por mês, com histórico.
- **Q4** (transferência e CDN em "rede"?): padrão, sim; a regra vai ao `B-ASS-09m`.
- **Q5** (crédito na receita do mês): padrão, o total do demonstrativo (líquido), com os dois números separados.
- **Q6** (mexer na lista curada do CI): padrão, não; leitura do log por suíte e pendência `P-ASS09-SUITES-DB-NO-CURADO`.

## Fatias (plano §9 com a Emenda 1 §4)

| fatia | o quê | dev |
|---|---|---|
| F0 | este comando; worktree e `npm ci` próprios; baseline N por execução; vermelho-controle (404); carimbo livre; D-1 a D-11 no registro; tabela de âncoras no diário | Claude, cobrindo o braço |
| F1 | `overview-money.ts` + constantes + `costStatusOf` + `alertFor` + `marginPct` | braço |
| F2 | `overview.engine.ts` (P13 em todo agregado, `groupLineOf`, `totalsOf`) + `membership.rules.ts` | braço |
| F3 | `subscription-amount.ts` (base líquida, campos separados) | braço |
| F4 | `schema.prisma` + M6 (`btree_gist` + `EXCLUDE`) + guard + drill + censo + deriva em duas bases (Emenda 1 §2.1) | Claude |
| F5 | grupos e câmbio: dublês (espelham CHECK e exclusão) + Prisma + serviços (checagem por intervalo, `23P01` → 409) | Claude |
| F6 | `overview.service.ts` + 10 rotas + validadores + trilha | braço |
| F7 | rebase; `san3-05` com as 10 rotas e a linha do `manual-csv`; fim a fim na forma real | Claude |
| F8 | guard de markup; `API_CONTRACTS.md` + T-API-1; docs; `PLANO_SAN3.md`; registro | Claude |
| F9 | bateria completa; R-CI-1 pelo padrão da Q6; PR; limpeza | braço |

## Bateria de validação

```bash
npm ci
DATABASE_URL=<cluster descartável> npm run db:generate
npm run check
npm run lint
node scripts/migration-transaction-guard.mjs        # violações: 0
CORE_SAAS_PERSISTENCE=memory node --test --import tsx tests/ass-09-*.test.ts   # sem os -db
DATABASE_URL=<cluster descartável> node --test --import tsx tests/ass-09-*-db.test.ts   # 0 pulo, papel NOSUPERUSER NOBYPASSRLS
# regressões (plano §11): cloud-cost-allocation, cloud-cost-allocation-routes, san3-03-summary, san3-03-system-org,
# san3-03-conservation, ass-09a-rateio-automatico, ass-04-statement-engine, ass-04-statement-inputs, ass-04-statement-routes,
# ass-02-plans-subscription, ass-01-markup-retirado, core-saas, permission-catalog-migration-parity,
# san3-05-acessos-de-plataforma-guard; e as -db san3-05-leituras-de-plataforma-db, san3-03-system-org-db,
# ass-09a-rateio-automatico-db, ass-03-metering-census-db
npm test            # na forma do job backend (CORE_SAAS_PERSISTENCE=memory, DATABASE_URL e REDIS_URL descartáveis)
npm run build
git diff --check origin/main...HEAD
```

Cada mutação literal do plano (§6 do v2 e §2 e §3 da Emenda 1) é aplicada como está escrita, fica vermelha e é restaurada,
com a saída no diário. Limpeza §C5 no fim de cada fatia.

## Definition of Done (§10)

- [ ] Escopo respeitado (`git diff --name-only origin/main...HEAD` ⊆ PERMITIDO; nada do PROIBIDO).
- [ ] Bateria verde, com as suítes `-db` sem pulo e sob papel `NOSUPERUSER NOBYPASSRLS`.
- [ ] Permissão validada no backend; ator de organização → 403 nas 10 rotas.
- [ ] Sem segredo nem nome de grupo ou de organização na trilha (§2.8).
- [ ] Temporários limpos (§C5); depois do merge, `bash scripts/post-merge-cleanup.sh`.
- [ ] PR aberto (F9). KPI congelado: nada em `Kpis/**`.

## Rastreabilidade (§C6)

- **ID:** B-ASS-09
- **PR #:** aberto na F9
- **Merge commit / approved head:** `null` na autoria → backfill pós-merge
- **Junta:** junta completa, registro em `agent-orchestration/omega/juntas/`
- **Status:** `published_per_pr`
- **Contrato:** `platform_billing_overview@2026-11.b-ass-09`
