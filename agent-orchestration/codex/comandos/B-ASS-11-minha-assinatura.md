# B-ASS-11 — a tela do cliente "Minha assinatura" (Parte T do item 62 do portão)

- **Tipo:** feature (tela nova do portal web; nenhuma linha de `src/**`)
- **Fase:** Execution
- **Trilha:** frontend
- **Data:** 2026-11-15
- **Branch:** `feat/ass-minha-assinatura-62t` (o orquestrador nomeou; a Emenda 1.1 §4.2 citava `feat/my-subscription-view`,
  e o T-G3 aceita os dois nomes)
- **Autor (dev):** `dev-62t-cl`, Claude Opus 5.5, **identidade de dev nova, declarada**. Tela no Claude
  (`D-DESIGN-SO-CLAUDE`, `D-CODEX-PRIMEIRO-TELAS-E-PLANOS-NO-CLAUDE`). Não escreveu nem criticou o plano.
- **Plano (lei, a mais nova prevalece):** `erp-pausa-2026-10-03/planos/plano-B-ASS-11-emenda1.md` →
  `plano-B-ASS-11-emenda1.1.md` → `plano-B-ASS-11-emenda1.1.1.md`. Arquivos fora do repositório. Onde este comando
  divergir da lei, vale a lei.
- **Referência aprovada:** `docs/claude-code-handoff/screen-refs/minha-assinatura-3opcoes.reference.html` (maquete v3,
  15 situações nas 3 opções; aprovada pelo dono em 14/11, sem ajuste, `D-ASS11-MAQUETE-APROVADA`).
- **Tela-modelo:** `frontend/src/modules/settings/pages/TenantSettingsPage.tsx`; contêiner das 3 aparências no molde de
  `frontend/src/modules/finance/cheques/ChequesPage.tsx`; camada de dados no molde de `tenant-settings.*` e de
  `useCheques.ts`. Skills: `ts-frontend-full` (implementar) e `ui-ux-pro-max` (revisar).
- **Nível de revisão:** **revisão reforçada** + conferência visual das 3 aparências (Emenda 1 §10). A trava não casa
  nenhum caminho do PERMITIDO; qualquer arquivo fora dele leva o PR para junta completa.
- **KPI:** congelado (§C7 item 8(5)).

## Objetivo

A organização vê a própria assinatura numa tela honesta, pela rota isolada que já está na `main`
(`GET /api/v1/billing/subscription`): o plano, o uso da franquia de usuários e de espaço em pizza cheia, a situação e,
só com fatura em aberto, o "Como pagar" com os meios que o servidor mandar. Nenhum valor em dinheiro, módulo, veículo
ou tendência (P12). A tela sai com as 3 aparências aprovadas, escolhidas por usuário no menu de aparência que já existe.

Fecha o **item 62** e a `P-ASS-VISAO-DO-CLIENTE` **só se** os 3 comandos do §1.3 da Emenda 1.1 passarem no head (a
tendência já saiu da `main` pelo #574).

## Escopo PERMITIDO (Emenda 1 §7.1 + Emenda 1.1 §4.1)

- `frontend/src/modules/settings/subscription/**` (novo)
- `frontend/src/components/charts/UsagePie.tsx` (novo) e `frontend/src/components/charts/index.ts`
- `frontend/src/App.tsx` (1 import e 1 rota) · `frontend/src/layouts/appSidebarNav.ts` (1 constante, 3 grupos, 1 caminho)
- `frontend/src/modules/appearance/appearance.registry.ts` (+1 entrada) · `frontend/src/styles/app.css` (bloco no fim)
- `frontend/package.json` (só a linha `test:smoke`)
- `frontend/tests/ass-11-*.test.ts(x)` (novos) · `frontend/tests/aparencia-registro.guard.test.ts` (+1 linha)
- `docs/claude-code-handoff/screen-refs/minha-assinatura-3opcoes.reference.html` (Fm-b) e o `README.md` dela
- `docs/navigation-matrix.md`, `docs/frontend-screens.md`, `COMPONENT_LIBRARY.md`
- este comando e `docs/revisoes/ASSINATURA/B-ASS-11-dev.md`
- registro: `agent-orchestration/controle/pendencias.md`, `pendencias-indice.md` (regenerado), `decisoes.md`,
  `agent-orchestration/docs/status-geral.md`, `docs/revisoes/SAN3/PLANO_SAN3.md` (l.146 e l.329)

## Escopo PROIBIDO

`src/**`, `prisma/**`, `migrations/**`, `infra/**`, `.github/**`, `.env*`, lockfiles, `mobile/**`, `Kpis/**`;
`frontend/src/navigation/tenantNavigation.ts` e todo caminho com `tenant`, `permission`, `rbac` ou `auth`; chamar
`/billing/subscription/usage-history` ou `/platform/*`; valor em dinheiro, formatador de moeda, cálculo de excedente;
literal de dado na página; "Baixar nota fiscal"; contato nominal, telefone ou e-mail.

## Fatias (Emenda 1.1 §8, cerca de 9 h 20 min)

Fm-b (a referência) · F0 (este comando, base N, T-M vermelhos) · F1 (`UsagePie`) · F2 (dados) · F3 (vista A, página,
rota) · F4 (vistas B e C, registro, guard) · F5 (15 estados, teclado, cópia) · F6 (menu, matriz, docs, smoke) · F7
(bateria, 18 mutações, §4.1, §1.3, registro, PR). Uma fatia por commit, vermelho antes e verde depois.

## Testes-dono (todos em `frontend/tests/`, todos na lista do `test:smoke`)

`ass-11-usage-pie.test.tsx` (T-U1–T-U6) · `ass-11-minha-assinatura.adapter.test.ts` (T-A1–T-A9, T-A3b) ·
`ass-11-minha-assinatura.smoke.test.tsx` (T-S1–T-S7, T-S3a/b) · `ass-11-minha-assinatura-live.test.tsx` (T-L1–T-L9) ·
`ass-11-menu-e-rota.test.tsx` (T-M1–T-M5) · `ass-11-escopo.guard.test.ts` (T-G1–T-G3). Mais o guard existente
`aparencia-registro.guard.test.ts`, com a tela nova. Regressão nomeada: `tests/san3-04a-menu-front-x-catalogo.test.ts`.

## Mutações

As 18 da Emenda 1.1 §5.3 (MT-1 a MT-15, com MT-5a a MT-5d), literais, com `grep -cF` = 1 antes de cada uma.

## Bateria de validação

`npm --prefix frontend run check` · `npm --prefix frontend run test:smoke` · `npm --prefix frontend run build` ·
`npm run check` · `npm run lint` · `npm test` · `git diff --check` · o comando do §4.1 da Emenda 1.1 (escopo) · os 3
comandos do §1.3 (item 62) · a guarda de caminho local do repositório público.

## Rastreabilidade

ID `B-ASS-11` · PR em rascunho (o número fica no registro pós-merge) · status `draft_pr`.
