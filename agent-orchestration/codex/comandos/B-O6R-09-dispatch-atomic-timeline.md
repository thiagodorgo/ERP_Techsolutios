# B-O6R-09 — despacho e linha do tempo atômicos, criação idempotente e aprovação de orçamento sem OS em dobro (item 7 do portão)

- **Tipo:** feature (correção de defeito de dado)
- **Fase:** Execution (A5)
- **Trilha:** backend/raiz + web (chave por intenção) + lista `SUITES=` da CI; sem mobile
- **Data:** 2026-11-11
- **Branch:** `fix/dispatch-atomic-timeline`
- **Dev:** `dev-o6r09-cl` (Claude Opus 5.5, subagente da sessão, cobrindo o Codex; exceção declarada: Codex 1 sem cota
  semanal até 16/11, Codex 2 ocupado).
- **Plano (norma):** `planos/plano-B-O6R-09-v2.md` + ajustes R2-02 a R2-11 da crítica r2 (`revisoes/crit-09-r2-plano.json`) +
  `planos/plano-B-O6R-09-emenda1.md` (item fundido, fatia 6) + a crítica dela (`revisoes/crit-09-em1.json`) + a emenda 1.1
  (fatia 6), todos em `C:/Users/thiag/erp-pausa-2026-10-03/`. Onde uma emenda muda o v2, vale a emenda.
- **Decisões do dono:** `D-PORTAO-7-RECOMENDACOES-1011` (não permitir dois despachos ativos do mesmo técnico na mesma OS,
  FORA deste bloco: `P-DESPACHO-DUPLICADO-MESMO-TECNICO`) e `D-PORTAO-3-RECOMENDACOES-1111` (o bloco se alarga para a web e
  a CI, Pergunta 1 = (A); a OS em dobro ou órfã da aprovação de orçamento é fundida aqui, Q1 (c)).

## Objetivo

1. Toda escrita que muda o estado de um despacho (criar, mudar status, reatribuir) e o evento obrigatório que a narra
   são gravados na MESMA transação Postgres (P1).
2. Uma transição só se aplica se o despacho ainda tiver o `status` E o `operator_user_id` em que foi validada (P2);
   o mesmo status sem texto é no-op; com texto, 422.
3. A criação aceita `idempotencyKey`: a mesma (organização, autor, chave) cria no máximo um despacho, inclusive sob
   corrida; a repetição devolve o despacho (200), e outro conteúdo recebe 422 (P3).
4. Nos caminhos que atribuem a OS, o despacho novo só fica visível depois que a OS aceitou; recusa da OS não deixa
   nada para apagar (P4, transação-mãe).
5. A web envia a chave por intenção; as suítes `-db` novas entram na lista curada da CI.
6. (fatia 6, emenda 1.1) A aprovação do orçamento reserva, cria a OS e grava o vínculo numa transação só.

## Escopo PERMITIDO / PROIBIDO

O do plano v2 §4.1, §4.2 (com o "sim" da Pergunta 1) e §4.4, mais o da emenda 1 §2 e o da emenda 1.1 (fatia 6). O
`prisma/**` entra só para a chave de criação do despacho (PLANO_SAN3 §5). O `.github/workflows/ci.yml` muda só na lista
`SUITES=` do `backend-postgres`. `Kpis/**` congelado (`D-GOV-PROPORCIONAL`).

## Bateria de validação

A do v2 §6, somada à da emenda 1 §5.1: `npm run check`, `npm run lint`, os testes do bloco (os `-db` com `# skipped 0`),
as regressões nomeadas, `npm test` (resumo TAP), `npm run build`; na web, `check`, `build` e `test:smoke`; e
`git diff --check`. Cada mutação literal é aplicada uma por vez, fica vermelha no teste-dono e é revertida.

## Rastreabilidade

Diário do dev: `docs/revisoes/SAN3/B-O6R-09-dev.md`. Revisão: junta completa (banco, permissão, perda de dado e, com a
fatia 6, dinheiro), pelo fluxo do §C7 item 10(3).
