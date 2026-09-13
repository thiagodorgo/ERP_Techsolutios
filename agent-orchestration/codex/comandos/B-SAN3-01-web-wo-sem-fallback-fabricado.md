# B-SAN3-01 — a web deixa de fabricar OS quando o backend recusa (item 4)

- **Tipo:** feature (fecha um item de perda de dado do gate) · **Fase:** Execution · **Trilha:** frontend · **Data:** 2026-09-13
- **Branch:** `fix/web-wo-sem-fallback-fabricado` · **Frente:** 3 do plano SAN3 (web e antivírus) — primeiro da frente e das
  travas QuoteTab (`SAN3-01` → `SAN3-08`), aba Financeiro e serviço de OS da web (`SAN3-01` → `SAN3-25`) e `tests/e2e/**`
  (`SAN3-01` → `SAN3-10`), §6
- **Autor:** orquestrador (rodada SAN3), depois do porteiro do #386 (LIBERADO COM RESSALVA)

## Objetivo

Tirar da web o `catch` que devolve dado inventado no lugar do erro (plano SAN3 §4.1, item 4 — `P-008`): a lista vazia vira
6 OS inventadas com aviso falso; o create recusado pelo backend vira uma OS falsa (`OS-FALLBACK`) e **o que o operador digitou
se perde** — perda de dado; o 404 vira dado de mentira. O conserto mostra o erro real, preserva o que foi digitado e não
navega. Fica de fora: qualquer tela nova e o app.

## Contexto / fontes de verdade

- Ler antes: status-geral, `agent-orchestration/controle/` (`P-008`), o log, `PROJECT_MEMORY.md`; prova do §4.1:
  `frontend/src/modules/work-orders/work-orders.service.ts:28,46-50,60-72`.
- Plano: `docs/revisoes/SAN3/PLANO_SAN3.md` §4.1 (item 4), §5 (linha do bloco), §5.6 (CE-G1, CE-G2), §6.
- Estados obrigatórios (§7): error e empty recriados do protótipo; nada de dado de demonstração na tela.

## Escopo PERMITIDO

- `frontend/src/modules/work-orders/**` · `frontend/src/modules/registry/service-quotes/useServiceQuoteReferences.ts` ·
  `frontend/src/modules/operations/dispatches/dispatches.service.ts`
- `tests/e2e/critical-flows.spec.ts` (o caso "com fallback seguro", l.196-220, exige a OS inventada e muda com o conserto)
- testes novos do frontend · `agent-orchestration/**` · `Kpis/**`

## Escopo PROIBIDO

`src/**` (backend), `mobile/**`, `prisma/**`, `infra/**`, `.github/**`, `.env`, lockfiles, qualquer outro módulo do frontend.

## Rito (§C7)

> **Corpo da ref em toda invocação dos gates:** `planejador-mestre`, `inspetor-de-terreno-da-junta` e `porteiro-pos-merge`
> divergem na árvore da sessão; o prompt manda ler `git show origin/main:.claude/agents/<papel>.md`.

1. `planejador-mestre` (Fable) mede em `origin/main`: **todo** `catch` do frontend que devolve dado no lugar do erro, gerado por
   grep a partir do código (não só os três arquivos da linha do §5 — a propriedade é "nenhuma via da web inventa dado quando o
   backend falha"); o que cada um devolve; os testes com vermelho-controle. O que achar fora da fronteira vira pendência
   nomeada com dono, não escopo novo.
2. Um dev distinto implementa só o plano aprovado.
3. Inspetor; junta com **unanimidade de 3** + `cognicao-visual`.
4. CI verde → squash → limpeza §C5 (comandos separados; limpeza só depois de ler `MERGED`) → porteiro.

## Teste de encerramento (§5)

200 com lista vazia → `items: []`; create 422 → erro na tela, sem navegar; detalhe 404 → estado de erro. Asserções de
comportamento, nenhuma por literal. Vermelho-controle no head-base.

## Bateria de validação

```bash
npm --prefix frontend ci
npm --prefix frontend run check
npm --prefix frontend run build
npm --prefix frontend run test:smoke
npm test                      # a suíte backend lê .tsx por texto (contratos de frontend) — rodar também
node --check Kpis/app.js && node scripts/kpi-freeze.mjs --check
git diff --check
```

## KPIs no próprio PR (§C3)

Smoke e contratos com N e forma; `blocks_completed` +1; `status: published_per_pr`. Se for o **primeiro PR de execução a
mergear** depois do #386, carrega as dívidas dele (ver o comando do `B-SAN3-04a`).

## DoD · Rastreabilidade

Escopo respeitado · bateria verde · estados §7 · sem termo técnico nem dado inventado na UI · KPI no PR · junta · §C5 ·
porteiro. ID `B-SAN3-01` · PR # · merge commit · approved head · junta · status.
