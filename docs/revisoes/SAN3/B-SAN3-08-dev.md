# Diário do dev — B-SAN3-08 (itens 40 e 41 do portão)

- **autor:** `dev-san3-08-cl` — Claude Opus 5.5 (subagente da sessão), dev, identidade nova. Não planejou nem criticou.
- **verificador:** a definir pelo orquestrador (§C7.11(1): da outra casa, Codex, se houver crédito).
- **fontes, em ordem de prevalência:** `D-PORTAO-7-RECOMENDACOES-1011` e `D-PORTAO-3-RECOMENDACOES-1111`
  (`REGISTRO-PENDENTE.md` l.909-911 e l.930-933) → emenda 1 (`planos/plano-B-SAN3-08-emenda1.md`) → plano v1
  (`planos/B-SAN3-08-plano.md`) → crítica `crit-08-cl` (`revisoes/crit-08-plano.json`).
- **terreno:** worktree próprio `C:/Users/thiag/w-san308`, ramo `feat/web-orcamento-aprovar-destino` a partir da
  `origin/main` `6f727afc0ed9eb40449d34cafb5ebf00a47c52f5` (medida em 2026-11-11 01:56 SP). `npm ci` e
  `npm --prefix frontend ci` próprios, sem junction, ambos `ec=0`.
- **ref do plano × ref do dev:** o plano e a emenda mediram `d5ec1696`. `git diff --stat d5ec1696 HEAD` nos caminhos do bloco
  (`frontend/src/modules/registry/service-quotes`, `QuoteTab.tsx`, `src/modules/service-quotes`, `frontend/tests`,
  `tests/service-quote-approve.test.ts`) → vazio. Os `arquivo:linha` do plano valem na base do dev.
- **mecânica de ramo e commit:** por ordem do orquestrador, o ramo é `feat/web-orcamento-aprovar-destino` (o v1 citava
  `fix/orcamento-destino-e-papel-financeiro`) e o prefixo é `feat(web-orcamentos): …`. Este diário, em
  `docs/revisoes/SAN3/`, também é por ordem do orquestrador (fica declarado fora da lista PERMITIDA do v1 para o revisor).

Formato P1: comando → saída resumida → veredito parcial.

## Linha de base (antes de qualquer edição)

- `node --test --import tsx tests/service-quotes.smoke.test.tsx tests/work-order-quote-tab.test.tsx tests/work-orders-honest-errors.test.tsx`
  (a partir de `frontend/`) → `# tests 85 # pass 85 # fail 0 # skipped 0` (14 + 5 + 66). Veredito: regressões verdes na base.
- `CORE_SAAS_PERSISTENCE=memory node --test --import tsx tests/service-quote-approve.test.ts` → `# tests 16 # pass 16 # fail 0`.
  Veredito: regressão do backend verde na base.

## F0 — paridade do corpo (P1, R-A4 no servidor)

- **F0.1 builder como cópia literal de hoje.** `service-quote-approve.model.ts` nasceu com o mapeamento snake_case de
  `service-quotes.service.ts:111-121`, sem coordenadas. Veredito: pré-condição do vermelho-controle montada.
- **F0.2 teste novo** `tests/san3-08-aprovar-orcamento-destino.test.ts`: [P1], [P1-b], [P1-pino], ligando o builder da web ao
  `ServiceQuoteService.approve` real (memória), com serviço `requires_destination: true` e tarifa publicada.
- **F0.3 vermelho-controle (02:00 SP).** `CORE_SAAS_PERSISTENCE=memory node --test --import tsx tests/san3-08-aprovar-orcamento-destino.test.ts` →
  `not ok 1 - [P1] … error: 'o approve recusou o corpo da web: 422:destination_required · corpo={"service_address":"Rua da Coleta, 10","destination_address":"Oficina Central, 200","activation_mode":"guincho"}'`
  · `ok 2 - [P1-b]` · `not ok 3 - [P1-pino] … 422:destination_required · corpo={}` · `# pass 1 # fail 2`.
  Veredito: a hipótese do Fato 3 vale também na base `6f727afc` (o servidor não lê snake_case; a sonda A da crítica reproduzida).
- **F0.4 verde.** Builder em camelCase, com as 4 coordenadas (R-A4.1/2) em `ServiceQuoteApprovePayload`; campo vazio fora do
  corpo; `activationMode` só espaços fora do corpo → `# tests 3 # pass 3 # fail 0`.
- **F0.5 mutações literais** (script `mut.mjs` no scratchpad: `grep -cF` âncora = 1, aplica, roda, restaura byte a byte;
  `CORE_SAAS_PERSISTENCE=memory` exportado):
  - **M1** `destinationAddress: payload.destinationAddress,` → `destination_address: payload.destinationAddress,` · âncora = 1 ·
    `not ok 1 - [P1] … 422:destination_required` · `# fail 1` · restaurado=true. Vermelha.
  - **M1b** apagar `destinationLatitude: toCoordinate(payload.destinationLatitude),` · âncora = 1 ·
    `not ok 3 - [P1-pino] … 422:destination_required · corpo={"destinationLongitude":-46.63}` · restaurado=true. Vermelha.
  - **M2** `destinationAddress: payload.destinationAddress,` → `destinationAddress: payload.destinationAddress ?? "x",` · âncora = 1 ·
    `not ok 2 - [P1-b] … 'Missing expected rejection.'` (e o [P1-pino] também cai, porque o "x" vira endereço) · restaurado=true. Vermelha.
  - controle sem mutação depois das três → `# pass 3 # fail 0`.
  - **nota de terreno:** a 1ª rodada das mutações passou `CORE_SAAS_PERSISTENCE=memory` como prefixo do comando, que o `cmd.exe`
    do `spawnSync` não entende; saiu `ec=1` sem TAP. Não contou como vermelho; refeita com a variável exportada (acima).
- **F0.6 ligação.** `approveServiceQuote` passa a mandar `buildServiceQuoteApproveBody(body)`. `npm --prefix frontend run check` → ok.
  `node --test --import tsx tests/san3-08-aprovar-orcamento-destino.test.ts tests/service-quote-approve.test.ts` (memória) →
  `# tests 19 # pass 19 # fail 0 # skipped 0`. Veredito: F0 verde.
