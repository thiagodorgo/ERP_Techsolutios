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
