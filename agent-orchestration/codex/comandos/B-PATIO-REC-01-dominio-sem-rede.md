# B-PATIO-REC-01 — Recebimento do pátio: domínio da intenção de pagamento, sem rede

- **Tipo:** feature
- **Fase:** Execution (A5)
- **Trilha:** backend/raiz; sem frontend, sem mobile, sem rede
- **Data:** 2026-11-03
- **Branch:** `feat/patio-rec-01-dominio`
- **Autor:** `dev-rec01-opus` (Claude Opus 5.5, nível menor DECLARADO, cobrindo a conta 1 do Codex por ordem do dono)
- **Verificação:** Codex (`D-UM-FAZ-OUTRO-VERIFICA`), depois junta completa (dinheiro, permissão nova, isolamento; unanimidade de 3)
- **Plano (fora do repositório, PREMISSA de plano):** `erp-pausa-2026-10-03/planos/B-PATIO-RECEBIMENTO-plano-v3.md` §9.1 +
  `erp-pausa-2026-10-03/planos/B-PATIO-RECEBIMENTO-plano-v3-emenda-1.md` §3.1, §6.2.2, §8.2.5 e §10.1 (onde a emenda diverge, vale a
  emenda; a §10 vale acima das anteriores).
- **Decisões do dono:** Q12 *"Q12 autorizo"* (02/11 ~23:50) para as migrações M-REC-1, M-REC-2 e M-REC-7a, não destrutivas no `up` e
  com `BEGIN;`/`COMMIT;`; Q-DEVOLVE, Q1, Q5, Q13 (`REGISTRO-PENDENTE.md`, 02/11 ~23:45).

## Objetivo

Criar o domínio da intenção de pagamento on-line da taxa de pátio (`impound_payment_intents`, `impound_payment_refs`), a máquina de
estados como tabela de dados, as regras de criação (a)-(h) da v3 §5.2, o devido capado ao teto (`ChargeService.getSettleableDueCents`),
as rotas de leitura e de criação com a permissão nova `charging:online_payment`, e a prova no banco dos CHECKs de dinheiro, do link
aberto, das colunas de conta e do isolamento (R-ISO). **Sem rede:** a porta de conexão recusa por padrão (`payment_mode_unset`) e o
portão do canal está desligado por padrão (`channel_disabled`); nenhuma cobrança nasce em produção até o REC-04 e o REC-02a.

## Escopo

- **PERMITIDO:** v3 §9.1 com os acréscimos da emenda §3.1/§6.2.2/§8.2.5/§10.1: `src/modules/impound-payments/**` (sem canal, sem jobs);
  `src/modules/charging/charge.service.ts` só o método novo `getSettleableDueCents`; `src/app.ts`; `catalog.ts` (+1);
  `tests/core-saas.test.ts`, `tests/core-saas-role-authority.test.ts` + fixture; `prisma/schema.prisma` + M-REC-1/2/7a;
  `tests/rec-01-*.test.ts`; `.github/workflows/ci.yml` (lista `SUITES`); `RBAC_MATRIX.md`; `docs/patio-recebimento.md`; este comando;
  `docs/revisoes/PATIO/B-PATIO-REC-01-dev.md`.
- **PROIBIDO:** `fetch` ou porta de provedor; `src/modules/release/**`; qualquer outra linha do `charging`; `frontend/**`, `portals/**`;
  dependência nova; lockfiles; `split`/`wallet`; credencial; `Kpis/**` (congelado, `D-GOV-PROPORCIONAL`).

## Regras que valem no bloco

- **R-ISO (emenda §10.1):** organização só do ator autenticado; `tenant_id` explícito no `WHERE` de toda consulta, além da RLS;
  `assertRowsBelongToTenant` em toda leitura que devolve linha; busca por id de outra organização → 404.
- **P-REC-22b:** o tipo `IntentAccount` não representa a conta da plataforma; `assertIntentAccount` recusa (`account_not_allowed`).
- **Migrações:** `BEGIN;`/`COMMIT;`, nada destrutivo no `up`, `node scripts/migration-transaction-guard.mjs` verde, drill nomeado.

## Bateria de validação (final)

`npm run check` · `npm run lint` · `[SB]` dos 5 arquivos `rec-01` → `# pass 28` · `[SB]` regressão (release, for-repair, core-saas,
daily-engine) → `# pass 63` · `[UF]` → `# pass 12` · `[DB]` `rec-01-domain-db`, `rec-01-migration-drill-db`, `release-gate-concurrency`,
`san3-05-leituras-de-plataforma-db` → `# pass 8 + 3 + N_san3` · `[DBP]` → `# pass 2` · todos `# fail 0 # skipped 0` · guard de
migração → ok · `npm test` na forma do CI → `# fail 0` · `npm run build` · `git diff --check` · `git diff origin/main --stat --
src/modules/release` vazio · `git diff origin/main -- src/modules/charging | grep -c "^-[^-]"` → 0.

## Baseline (F0, medida em `origin/main` = `ceb62a07`)

`[SB]` 63/63 · `[UF]` 12/12 · `[DB]` 3 + 13 = 16/16 (`N_san3` = 13: 12 subtestes + o teste-pai) · `[DBP]` 2/2. Diário:
`docs/revisoes/PATIO/B-PATIO-REC-01-dev.md`.
