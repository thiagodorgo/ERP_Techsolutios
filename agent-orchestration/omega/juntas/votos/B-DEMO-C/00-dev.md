# B-DEMO-C: diário do dev (aceite e status do despacho no app, com envio imediato)

Plano: `C:/Users/AMP/erp-pausa-2026-10-03/planos/DEMO-C-plano.md`, com a **Emenda E1** (l.598 em diante; as fatias estão na §E1.3).
Crítica: `C:/Users/AMP/erp-pausa-2026-10-03/revisoes/DEMO-C-critica.md`.
Demo ao sócio: `C:/Users/AMP/erp-pausa-2026-10-03/planos/DEMO-SOCIO-plano.md`.

## RETOMADA S0 (orquestrador, 2026-10-26 ~22:25Z)
- **Head base:** `c9a2d036` (`origin/main`). Ramo `feat/mobile-democ-aceite-despacho`, worktree `C:/Users/AMP/w-democ`.
- **Feito:**
  - `git worktree add -b feat/mobile-democ-aceite-despacho C:/Users/AMP/w-democ origin/main` → ok;
  - `npm ci` → ec=0;
  - `cd mobile/flutter_app && flutter pub get` → ec=0;
  - disco: `df` antes 9,5 GB, depois 9,0 GB livres. Piso de trabalho R11: 7,5 GB.
- **Falta:** S1 a S12c, conforme a §E1.3.
- **Próximo comando:** começar a S1 (backend, passos 1 a 3: permissão, lista fechada, `getForMutation`; o resolvedor e o tipo do resultado), em `src/modules/mobile/` (`mobile-work-order-sync.ts`, `mobile.routes.ts`) e um teste novo.

## QUEDA S1 (orquestrador, 2026-10-26 22:56Z): `dev-democ-s1-gempro` (Gemini CLI, gemini-3.1-pro-preview, API)
- **Parou pelo teto** de US$ 3 (gastou US$ 3,03 em 7 etapas). Todo comando de terminal foi recusado pelo próprio CLI com "Tool execution denied by policy". Por isso não rodou teste, não fez commit e não gravou RETOMADA.
- **Parcial NÃO commitado** no worktree: `src/modules/mobile/mobile-work-order-sync.ts`, `src/modules/mobile/mobile.routes.ts` e `tests/mobile-backend-contracts.test.ts` (+42/−2). A cópia está em `C:/Users/AMP/erp-pausa-2026-10-03/arquivo-quedas/democ-s1-gempro/s1-parcial.patch`.
- **Quem retomar a S1:** meça o parcial (`git diff`) antes de confiar nele. Nada foi testado, e não houve vermelho-controle antes do código. Aproveite o que servir e refaça o resto do jeito que o mandato manda: teste vermelho primeiro.

## RETOMADA S1 (dev-democ-be-opus, 2026-10-26)
- **Executor:** subagente genérico Claude, modelo **Claude Opus 5.5** (nível menor, declarado). Retomada P3 da queda do `dev-democ-s1-gempro`.
- **Head de partida:** `a44cfbc9` (o da RETOMADA S0), medido por `git log --oneline -3`. Ramo `feat/mobile-democ-aceite-despacho`.
- **Medição do parcial do Gemini (P3), antes de confiar:** `git diff -- src tests` → 3 arquivos, +42/−2, nunca executado.
  - `mobile-work-order-sync.ts`: resolvedor tipado `any`; depois do passo 3 devolvia `accepted` com `effect: "advanced"` **sem escrever nada** (mentira no contrato, não fail-closed).
  - `tests/mobile-backend-contracts.test.ts`: +2 linhas (`resetFieldDispatchRuntimeForTests`) — arquivo **fora do PERMITIDO** do §4.1/§E1.2.
  - Decisão: descartado inteiro (`git checkout --` nos 3 arquivos; a cópia segue em `arquivo-quedas/democ-s1-gempro/s1-parcial.patch`). Reescrito com teste vermelho primeiro. Aproveitada só a ideia do resolvedor passado pela rota.
- **Feito (comando → saída):**
  - teste novo `tests/mobile-dispatch-status-sync.test.ts` (B6, B7, B8; app inteiro em memória por HTTP) → **vermelho-controle** no head `a44cfbc9`: `node --test --import tsx tests/mobile-dispatch-status-sync.test.ts` → `# pass 0 · # fail 3`, os três com `actual: 'unsupported_action_type'`;
  - código: ramo `field_dispatch.status_change` em `processAction` → `processDispatchStatusAction` com os passos 1 (`field_dispatch:update`), 2 (lista fechada `accepted|on_route|arrived|in_service|completed`, `invalid_status`) e 3 (`getForMutation`); resolvedor `MobileDispatchServiceResolver` (sem ele: `dispatch_service_unavailable`, 503); tipo do resultado `dispatch?: MobileDispatchActionOutcome`; a rota passa `() => createDefaultFieldDispatchService(service)`. **Depois do passo 3, até a S2, a ação é recusada `dispatch_status_not_implemented` (501), sem escrita** (fail-closed);
  - `node --test --import tsx tests/mobile-dispatch-status-sync.test.ts` → `# pass 3 · # fail 0`;
  - `npm run check` → ec=0 (`npm run lint` = `npm run check`);
  - `node --test --import tsx tests/field-dispatch.test.ts tests/field-dispatch-routes.test.ts tests/field-dispatch-target-role.test.ts tests/mobile-backend-contracts.test.ts tests/mobile-work-order-assign-registry.test.ts` → `# tests 44 · # pass 44 · # fail 0`;
  - `node --test --import tsx tests/o6r07c-census-guard.test.ts tests/o6r07c-b-scope.test.ts` → `# tests 219 · # pass 217 · # fail 2`: **T1 e T14 vermelhos, de propósito e previstos pelo plano** (é o vermelho-controle do B11: "só o ramo novo, sem a mudança do censo → `NAO-CLASSIFICADA`"). Detalhe: `NAO-CLASSIFICADA: PAR /api/v1/mobile/sync/work-order-actions · field_dispatch.status_change`, a única chave. Fecha na S4;
  - `git diff --check` → ec=0; `df -h /c` → 8,0 GB livres.
- **Mutações (aplicadas no arquivo, teste da linha rodado, arquivo restaurado; sha256 conferido antes == depois):**

  | Id | Mutação em `mobile-work-order-sync.ts` | Teste | Resultado | Restauro |
  |---|---|---|---|---|
  | M-B6 | tirar `parseMobileDispatchTargetStatus` (passo 2) | B6 | **vermelho**: `expected 'invalid_status'`, `actual 'dispatch_status_not_implemented'` | `cba82aeaddbe == cba82aeaddbe` |
  | M-B7 | tirar `requireActionPermission(…, "field_dispatch:update")` (passo 1) | B7 | **vermelho**: `expected 'permission_required'`, `actual 'dispatch_status_not_implemented'` | `cba82aeaddbe == cba82aeaddbe` |
  | M-B8 | `getForMutation` → `get` (passo 3) | B8 | **vermelho**: `expected 'not_assigned_to_actor'`, `actual 'dispatch_status_not_implemented'` | `cba82aeaddbe == cba82aeaddbe` |

  Nota: as mutações do §5.1 para B6/B7/B8 descrevem o efeito com o passo 5 pronto ("`failed` grava `failed_at`", "o despacho anda"). Com a S1, o efeito é cair no 501; a S2 re-executa as três sobre o passo 5 e mede o efeito do plano.
- **Falta:** S2 (passo 4 com a tabela de posto R7; passo 5 com despacho do ator, idempotência por estado e cadeia R1; B1, B3, B4, B5, B9, R13) e S3 a S5.
- **Próximo comando:** `git -C C:/Users/AMP/w-democ log --oneline -1` (tem de ser o commit da S1) e começar a S2 com o vermelho-controle: escrever B1, B3, B4, B5 (com `reassigned`), B9, R7 e R13 em `tests/mobile-dispatch-status-sync.test.ts` e rodar `node --test --import tsx tests/mobile-dispatch-status-sync.test.ts` (devem cair no `dispatch_status_not_implemented`).

## PAUSA 00:22Z de 2026-10-27 (dev-democ-be-opus, Claude Opus 5.5, nível menor declarado) — S2 em curso
- **Motivo:** ordem do dono (P7), repassada pelo orquestrador: o Claude sai da demo e outro executor continua. Este é um corte limpo; o commit é `wip`.
- **Head antes deste commit:** `3dda6b97` (commit da S1, empurrado: `git rev-parse origin/feat/mobile-democ-aceite-despacho` = `3dda6b97…`). Este `wip` vai por cima.
- **Feito na S2 (comando → saída):**
  - testes novos em `tests/mobile-dispatch-status-sync.test.ts`: B1, B3, B4, B5/R1 (de `assigned` e de `reassigned`), B9, R7, R13; arnês ganhou `osPara`, `cancelarOs`, `cancelarDespacho`, `servicoDespacho` e `direto` (chama `syncMobileWorkOrderActions` sem a rota, para injetar falha no despacho);
  - **vermelho-controle** no head `3dda6b97`: `node --test --import tsx tests/mobile-dispatch-status-sync.test.ts` → `# tests 10 · # pass 3 · # fail 7` (B1, B3, B4, B5, B9, R7, R13 vermelhos; B6–B8 verdes). O arnês montou todas as sementes (a falha foi sempre na asserção da ação de despacho);
  - código em `src/modules/mobile/mobile-work-order-sync.ts`: passo 4 (`assertWorkOrderAtStep`, tabela `WORK_ORDER_STEP_RANK` do R7: `open` → `work_order_not_at_step`, `cancelled`/`rejected`/fora da tabela → `work_order_closed`); passo 5 (`list` do despacho do ator; `total > items` ou >1 ativo → `ambiguous_active_dispatch`; nenhum ativo: `assigned_only` → `accepted` `effect none` `reason no_active_dispatch` ou `already_at_status` se um encerrado já está no pedido; `tenant_wide` → `rejected` `no_own_active_dispatch` (422); um ativo: posto ≥ pedido → `already_at_status` sem escrita; senão a cadeia canônica, um `changeStatus` por passo); resposta `dispatchAcceptedResult` sem `server_state`;
  - `npx tsc -p tsconfig.json --noEmit` → ec=0;
  - `node --test --import tsx tests/mobile-dispatch-status-sync.test.ts` → `# tests 10 · # pass 10 · # fail 0`;
  - `git diff --check` → ec=0; `df -h /c` → **7,7 GB** livres (piso de trabalho R11 = 7,5 GB: perto).
  - Ajuste do B9 durante a fatia: a "OS atribuída sem despacho" pela rota `POST /work-orders/:id/assign` não serve no modo memória (o id de usuário em memória não é UUID: `400 invalid_uuid`). O caso de "nenhum ativo" usa o **despacho cancelado** com a OS ainda do técnico (premissa afirmada no teste).
- **Mutações da S2 (sha256 do arquivo restaurado `6a33b7069f7e` == antes, em todas):**

  | Id | Mutação em `mobile-work-order-sync.ts` | Teste | Resultado |
  |---|---|---|---|
  | M-B1 | ramo `field_dispatch.status_change` desligado | B1 | vermelho: `expected 'accepted'`, `actual 'rejected'` |
  | M-B3 | o ramo de idempotência regrava: `changeStatus(target)` | B3 | vermelho: "accepted_at foi regravado" (`…20.309Z` × `…20.353Z`) |
  | M-B3b | comparação de posto tirada (`if (false)`) | B3 | vermelho: `effect` ≠ `already_at_status` (deep-equal) |
  | M-B4 | passo 4 tirado | B4 | vermelho: `expected 'conflict'`, `actual 'accepted'` |
  | M-B5 | cadeia trocada por `changeStatus(target)` direto | B5 | vermelho: "a cadeia pulou o aceite: accepted_at nulo" |
  | M-B9 | escolhe o 1º ativo (sem a checagem de >1) | B9 | vermelho: `expected 'conflict'`, `actual 'accepted'` |
  | M-R7 | posto = índice em `WORK_ORDER_STATUSES` | R7 | vermelho: `expected 'conflict'`, `actual 'accepted'` (o despacho andou na OS cancelada) |
  | M-R13 | a do R1 (sem cadeia) | R13 | vermelho: "o aceite que falhou nunca foi carimbado" |
  | M-B6 | lista fechada tirada | B6 | vermelho: `expected 'rejected'`, `actual 'accepted'` |
  | M-B7 | passo 1 tirado | B7 | vermelho: `expected 'rejected'`, `actual 'accepted'` (o `technician` moveu o despacho) |
  | M-B8 | `getForMutation` → `get` | B8 | vermelho: `expected 'rejected'`, `actual 'accepted'` (o técnico B recebe `effect none`) |

  **Aviso de método:** na primeira rodada, M-B3, M-B5 e M-R13 deram "vermelho" por **erro de compilação do mutante** (o script não convertia `\n`). Foram re-executadas com o script corrigido, que agora acusa `COMPILACAO:` quando o mutante não compila; a tabela acima é a da re-execução, com o efeito real.
- **Falta na S2:**
  1. re-medir o vermelho-controle do B9 **como ficou** (a parte do despacho cancelado mudou depois do primeiro controle; a primeira asserção, a da ambiguidade, não mudou);
  2. bateria parcial: `npm run check`, `node --test --import tsx tests/field-dispatch.test.ts tests/field-dispatch-routes.test.ts tests/field-dispatch-target-role.test.ts tests/mobile-backend-contracts.test.ts tests/mobile-work-order-assign-registry.test.ts` (na S1: 44/44) e `node --test --import tsx tests/o6r07c-census-guard.test.ts tests/o6r07c-b-scope.test.ts` (esperado: só T1 e T14 vermelhos pela chave nova, até a S4);
  3. commit `feat(mobile-sync): … (B-DEMO-C S2)` e a `## RETOMADA S2`. Depois, S3 a S5 conforme a §E1.3.
- **Arquivos meio escritos:** nenhum. `mobile-work-order-sync.ts` e `tests/mobile-dispatch-status-sync.test.ts` estão completos para a S2, compilam e passam 10/10.
- **Script de mutação** (fora do repositório, scratchpad da sessão do Claude): aplica a troca numa âncora única, roda o teste filtrado, restaura e confere o sha256. Quem continuar pode refazer a mesma forma; as âncoras estão na tabela.
- **Próximo comando exato:** `cd C:/Users/AMP/w-democ && git log --oneline -1 && timeout 600 npm run check && node --test --import tsx tests/mobile-dispatch-status-sync.test.ts tests/field-dispatch.test.ts tests/field-dispatch-routes.test.ts tests/field-dispatch-target-role.test.ts tests/mobile-backend-contracts.test.ts tests/mobile-work-order-assign-registry.test.ts`

## RETOMADA S2 (dev-democ-s2-argon, 2026-10-27)
- **Executor:** `dev-democ-s2-argon` · Gemini CLI, modelo **gemini-4-argon**, pela API paga com teto de US$ 3 nesta tarefa, nível menor declarado (`D-GEMINI-ARGON-NIVEL-CODEX`). Retomada P3/P7 da pausa do `dev-democ-be-opus` em `fcf764da`.
- **Head de partida:** `fcf764da` (commit `wip` da pausa S2, sobre `3dda6b97` da S1), medido por `git -C C:/Users/AMP/w-democ log --oneline -3`. Ramo `feat/mobile-democ-aceite-despacho`.
- **Disco antes e depois:** `Get-PSDrive C | Select-Object Used,Free` → `10760351744` bytes (~10,0 GB livres) antes e depois (acima do piso de 7,5 GB da R11).
- **Feito (comando → saída, 1 linha por comando; re-execução P3 + cauda da S2):**
  - `git -C C:/Users/AMP/w-democ log --oneline -3; git -C C:/Users/AMP/w-democ status --short` → `fcf764da` limpo.
  - `npm run check` → `tsc -p tsconfig.json --noEmit` (ec=0; `npm run lint` é alias do mesmo comando).
  - `node --test --import tsx tests/mobile-dispatch-status-sync.test.ts tests/field-dispatch.test.ts tests/field-dispatch-routes.test.ts tests/field-dispatch-target-role.test.ts tests/mobile-backend-contracts.test.ts tests/mobile-work-order-assign-registry.test.ts` → `# tests 54 · # pass 54 · # fail 0` (10 testes em `tests/mobile-dispatch-status-sync.test.ts`: B6, B7, B8, B1, B3, B4, B5/R1, B9, R7 e R13; 44 nos demais).
  - **Vermelho-controle S2 (incluindo B9 como ficou):** troca temporária de `src/modules/mobile/mobile-work-order-sync.ts` pela versão da S1 (`git show 3dda6b97:src/modules/mobile/mobile-work-order-sync.ts`) + `node --test --import tsx tests/mobile-dispatch-status-sync.test.ts` → `# tests 10 · # pass 3 · # fail 7`: B6, B7 e B8 verdes; B1, B3, B4, B5/R1, B9 (`expected: 'conflict', actual: 'rejected'`), R7 e R13 vermelhos; arquivo restaurado (`sha256` antes == depois).
  - `node --test --import tsx tests/o6r07c-census-guard.test.ts tests/o6r07c-b-scope.test.ts` → `# tests 219 · # pass 217 · # fail 2`: **só T1 e T14 vermelhos** pela chave nova `PAR /api/v1/mobile/sync/work-order-actions · field_dispatch.status_change`, como previsto até a S4.
  - Normalização de fim de linha (`\r\n` → `\n`) em `tests/mobile-dispatch-status-sync.test.ts` (que havia entrado com CRLF no commit `wip` `fcf764da`): `git -C C:/Users/AMP/w-democ diff 3dda6b97 --check` → ec=0 (0 erros).
- **Mutações da S2 (re-executadas em processo próprio segundo P3, com `sha256` de `src/modules/mobile/mobile-work-order-sync.ts` conferido antes == depois: `9b3197a5015a == 9b3197a5015a`):**

  | Id | Mutação em `mobile-work-order-sync.ts` | Teste | Resultado | Restauro (`sha256`) |
  |---|---|---|---|---|
  | M-B1 | desligar o ramo `field_dispatch.status_change` | B1 | **vermelho**: `expected: 'accepted'`, `actual: 'rejected'` (`unsupported_action_type`) | `9b3197a5015a == 9b3197a5015a` |
  | M-B3 | chamar `changeStatus` também no ramo `currentRank >= targetRank` | B3 | **vermelho**: `accepted_at` regravado (`expected !== actual`) e evento duplicado | `9b3197a5015a == 9b3197a5015a` |
  | M-B3b | desligar `if (currentRank >= targetRank)` | B3 | **vermelho**: `effect` sai `'advanced'` em vez de `'already_at_status'` e `accepted_at` muda | `9b3197a5015a == 9b3197a5015a` |
  | M-B4 | comentar `assertWorkOrderAtStep(workOrder.status, target)` (passo 4) | B4 | **vermelho**: `expected: 'conflict'`, `actual: 'accepted'` | `9b3197a5015a == 9b3197a5015a` |
  | M-B5 | trocar o laço da cadeia canônica (R1) por `changeStatus(target)` direto | B5/R1 | **vermelho**: "a cadeia pulou o aceite: `accepted_at` nulo" | `9b3197a5015a == 9b3197a5015a` |
  | M-B9 | desligar `if (active.length > 1)` | B9 | **vermelho**: `expected: 'conflict'`, `actual: 'accepted'` (um dos dois despachos anda) | `9b3197a5015a == 9b3197a5015a` |
  | M-B9b | recusar (`422 no_own_active_dispatch`) quando técnico da OS não tem despacho ativo | B9 | **vermelho**: `expected: 'accepted'`, `actual: 'rejected'` (no caso do despacho cancelado) | `9b3197a5015a == 9b3197a5015a` |
  | M-B9c | desligar `if (!actorMutatesAssignedOnly(actor))` | B9 | **vermelho**: `expected: 'rejected'`, `actual: 'accepted'` (`operator` recebe `effect: 'none'`) | `9b3197a5015a == 9b3197a5015a` |
  | M-R7 | dar posto numérico a `open`, `cancelled` e `rejected` em `WORK_ORDER_STEP_RANK` | R7 | **vermelho**: `expected: 'conflict'`, `actual: 'accepted'` (despacho anda em OS cancelada) | `9b3197a5015a == 9b3197a5015a` |
  | M-R13 | trocar a cadeia por `changeStatus(target)` direto | R13 | **vermelho**: "o aceite que falhou nunca foi carimbado" (`accepted_at` nulo) | `9b3197a5015a == 9b3197a5015a` |
  | M-B6 | tirar `parseMobileDispatchTargetStatus` (passo 2, agora sobre o passo 5) | B6 | **vermelho**: `expected: 'rejected'`, `actual: 'accepted'` | `9b3197a5015a == 9b3197a5015a` |
  | M-B7 | tirar `requireActionPermission(…, "field_dispatch:update")` (passo 1, sobre o passo 5) | B7 | **vermelho**: `expected: 'rejected'`, `actual: 'accepted'` (`technician` move o despacho) | `9b3197a5015a == 9b3197a5015a` |
  | M-B8 | trocar `getForMutation` por `get` (passo 3, sobre o passo 5) | B8 | **vermelho**: `expected: 'rejected'`, `actual: 'accepted'` (técnico B recebe `effect: 'none'`) | `9b3197a5015a == 9b3197a5015a` |

- **O que falta (fatia seguinte = S3, §E1.3):**
  - R4: trava em processo por `tenantId:userId` em volta do lote em `src/modules/mobile/mobile-work-order-sync.ts`, relendo o recibo (`syncReceipts.get`) para cada ação dentro da trava (erro dentro da trava não a prende);
  - R6: `createPersistentRbacContextMiddleware(resolveAuthorization)` na rota `POST /mobile/sync/work-order-actions` em `src/modules/mobile/mobile.routes.ts` (depois do `tenantContextMiddleware`, com `resolveAuthorization` opcional em `createMobileRouter` para teste);
  - B12: atualizar a versão do contrato (`2026-07-07.d1` → nova versão do bloco, se previsto no §3.3/B12, ou verificar o contrato B12 em `tests/mobile-backend-contracts.test.ts` e `tests/mobile-dispatch-status-sync.test.ts`) e fechar B2/R17, R4, R6 e B12 com vermelho-controle e mutações;
  - ponto de retomada da S3: `"censo e laço G a fazer"`.
- **Próximo comando exato (para a S3):** `cd C:/Users/AMP/w-democ && git log --oneline -2 && git status --short && node --test --import tsx tests/mobile-dispatch-status-sync.test.ts`
