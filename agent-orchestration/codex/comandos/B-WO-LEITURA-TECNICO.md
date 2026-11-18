# B-WO-LEITURA-TECNICO — o técnico de campo só lê o que é dele (item 71 do portão)

- **Tipo:** feature (correção de permissão e de vazamento de dado)
- **Fase:** Execution
- **Trilha:** backend/raiz
- **Data:** 2026-11-17 a 2026-11-18
- **Branch:** `feat/wo-leitura-tecnico`, a partir da `origin/main` `60c0704a` (#595), integrada com a `origin/main` de 18/11
- **Pendência que o bloco fecha:** `P-WO-LEITURAS-TENANT-WIDE-TECNICO` (ALTA; item 71 do portão, `D-DONO-1711-ITEM-71`)
- **Nível:** junta completa (permissão e vazamento de dado entre técnicos da mesma organização, §C7 10(1))

## Papel desta execução

- **F0–F6 (17/11):** DEV `dev-wo-leitura-cl` (Claude Opus 5.5, nível menor declarado, identidade nova; parou em PAUSA P7 com PARADA na F6).
- **Retomada F1-E31+E32, F6, F7, F8 (18/11):** DEV `agy-dev-71-ar` (Gemini 4 Argon pelo Antigravity, nível menor declarado; `D-GEMINI-ARGON-NIVEL-CODEX`, sucessor de `dev-wo-leitura-cl`).
- **Cruzamento (§C7 11(1)):** o plano e as emendas são Claude; a crítica das Emendas 3.1 e 3.2 foi DeepSeek Pro (`dp-crit-71-e31e32`); o dev da retomada é Argon; a pré-revisão e a junta vêm de outras casas.

## Fontes, nesta ordem (a mais nova prevalece)

1. A crítica `dp-crit-71-e31e32.json` (SEGUE COM EMENDA, ajustes de texto no F8) e a resposta do dono à Q-B de 18/11 ("Pendência para depois", `P-WO-LEITURA-DESPACHANTE-VISTORIA`).
2. A Emenda 3.2 do plano (`plano-B-WO-LEITURA-TECNICO-emenda3.2.md`, evidência E0 a E9; `D-DONO-1811-71-VISAO-SO-COM-PERMISSAO`).
3. A Emenda 3.1 do plano (`plano-B-WO-LEITURA-TECNICO-emenda3.1.md`, evidência S0 a S7; `D-DONO-1811-71-MESMA-REGRA`, `D-DONO-1711-PAINEL-COM-PERMISSAO-DO-SUPERIOR`, `D-DONO-1711-PAINEL-Q1-Q3`, `D-DONO-1711-GESTOR-CONCEDE`).
4. As decisões do dono de 17/11 pelo canal do artefato: o item 71 no portão (`D-DONO-1711-ITEM-71`) e as 5 recomendações do plano (`D-DONO-1711-WO-LEITURA-5`, "reco").
5. A Emenda 2 (`plano-B-WO-LEITURA-TECNICO-emenda2.md`), a Emenda 1 (`plano-B-WO-LEITURA-TECNICO-emenda1.md`) e o plano (`plano-B-WO-LEITURA-TECNICO.md`), em `erp-pausa-2026-10-03/planos/`, fora do repositório.

## Objetivo

Quem alcança a OS por papel de campo (`technician`, `field_technician`; a regra de presença `actorReadsAssignedOnly`, com mapa de leitura próprio `WORK_ORDER_READ_SCOPE`) e não tem papel que alargue a leitura (`tenant_wide`: `super_admin`, `platform_admin`, `tenant_admin`, `manager`, `operator`, `field_dispatcher`) lê só a OS atribuída a ele (o casamento duplo do 07a: user id ou perfil). Suporte, estoque, financeiro, visualizador e auditor são `nao_alarga`: sozinhos seguem lendo a organização, mas somados ao papel de campo não alargam a leitura nas 18 rotas do bloco (`D-DONO-1811-71-MESMA-REGRA`, `D-DONO-1811-71-VISAO-SO-COM-PERMISSAO`), enquanto o módulo próprio do outro papel (a Auditoria, `GET /audit-events`) segue com o alcance dele. Para o resto, a resposta é exatamente a que a rota dá a um id inexistente; as listas filtram no servidor; o painel conta só as OS dele. São as 18 leituras do censo: o detalhe da OS e 8 subrecursos, a lista de OS, a lista, a comparação e o download da vistoria, a lista, o detalhe e a linha do tempo do despacho, a lista e o detalhe da aprovação, e o painel. A escrita segue 403 `not_assigned_to_actor`. Sem migração.

## Escopo

PERMITIDO: o §7 do plano, com o que as Emendas 1, 2, 3.1 e 3.2 acrescentam (`field-dispatch.types.ts`, `field-dispatch.repository.ts`, `field-dispatch-prisma.repository.ts`, `tests/fixtures/wo-leitura-formas/**`), mais o que o mandato do dev pôs no escopo: o registro (`agent-orchestration/controle/pendencias.md`, `decisoes.md`, `pendencias-indice.md` gerado), a linha 71 do portão (`docs/revisoes/SAN3/PLANO_SAN3.md` §4.1), este comando, e no `.github/workflows/ci.yml` **só** a linha `SUITES=` da suíte `-db` nova no job `backend-postgres`.

PROIBIDO: `prisma/**`, `migrations/**`, `mobile/**`, `frontend/**`, `infra/**`, `.env*`, lockfiles, `package.json`, `scripts/**`, `Kpis/**` (congelado), `RBAC_MATRIX.md` e os outros arquivos-base, `src/modules/attachments/**`, `src/modules/core-saas/**`, `tests/fixtures/o6r07c-classificacao-vias.json` e `tests/helpers/o6r07c-census.ts` (reusados sem mudança).

## Bateria (a do §9 do contrato, na forma deste bloco)

1. `npm run check` · `npm run lint`
2. `node --test --import tsx tests/wo-leitura-scope.test.ts` (o laço L com L-MESMA-REGRA, L-SOZINHO, L-MODULO-PROPRIO e os semânticos, em memória: 457 casos)
3. `node --test --import tsx tests/wo-leitura-census-guard.test.ts` (o guard T-L0–T-L8, 16 casos, as 4 formas)
4. `node --test --import tsx tests/wo-leitura-scope-db.test.ts` com `DATABASE_URL` (papel efêmero NOSUPERUSER NOBYPASSRLS, 3×, com D-MESMA-REGRA, D-CONCEDE e D-MODULO-PROPRIO)
5. as regressões: `tests/o6r07a-*`, `tests/o6r07c-*`, `tests/san3-13-wo-list-*`, `tests/approval*`, `tests/field-dispatch*`, `tests/checklist-routes.test.ts`, `tests/work-order-*`, e a suíte inteira (`npm test`, excluindo `ass-05-vault-routes` localmente no Windows conforme `P-TESTE-VAULT-ROUTES-TRAVA-NO-WINDOWS`; régua final no CI)
6. `npm run build` · `node scripts/migration-transaction-guard.mjs` · `git diff --check`
7. `git diff --name-only origin/main...HEAD` ⊆ PERMITIDO
8. o instantâneo é o gerado: `node --import tsx tests/helpers/wo-leitura-census.ts gravar <saida>` + `cmp` com o commitado
9. as 29 mutações ativas literais (Emenda 3.2 §5) + MR15 equivalente (`N = 0`), cada uma com o conjunto do TAP comparado com o declarado

O resultado medido de cada passo, com N e TAP, fica no diário do dev (`erp-pausa-2026-10-03/revisoes/wo-leitura/dev-wo-leitura-cl.md`, fora do repositório).
