# Junta J-ws-ui-refresh — WS-UI-REFRESH (remover botão "Atualizar" + auto-refresh)

- **Data:** 2026-07-19
- **Entrega:** UI transversal (mandato do dono): "que não exista mais o botão de atualizar pois o sistema faz isso automatico".
  Removido o botão manual "Atualizar" de **30 páginas** + auto-refresh em segundo plano.
- **Tipo:** bloco normal (frontend, sem dep nova) → **maioria de ≥3**.
- **Branch:** `feat/frontend-ws-ui-refresh`.

## Processo
1. Recon + classificação (32 ocorrências de "Atualizar" → ~30 botões reais; excluídos "Atualizar status", salvar-em-modal,
   "Atualizado às", cópia de empty-state). Padrão-ouro identificado: `useOperationsMap` (setInterval + background mode).
2. Referência montada pelo orquestrador: hook novo `frontend/src/hooks/useAutoRefresh.ts` + `useCustomers`/`ClientesPage`.
   Lição travada: `RefreshCw` é reusado no botão de erro "Tentar novamente" → só remover o import se ficar órfão.
3. **Fan-out** (workflow, 8 batches por módulo, arquivos não-sobrepostos) aplicou o padrão a ~28 telas + 3 smoke tests.
   Orquestrador tratou à parte o trio WorkOrder (ActionBar/DetailPage) e o DashboardPage (fora de qualquer módulo).
4. Verify global: tsc verde, build verde, `test:smoke` 514/514, `approval-frontend-contract` 1/1, grep 0 botão restante.
5. **Junta de avaliação** (3 agentes).

## Composição e votos
| Agente | Lente | Veredito |
|---|---|---|
| general-purpose | correção do padrão de auto-refresh (flicker/leak/mismatch/enabled) | **APROVADO** |
| cognicao-visual | fidelidade §11 pós-remoção (header/ações/cópia/affordance) | **APROVADO_CONDICIONADO** |
| validador-mestre | regras/DoD (escopo, botões preservados, smoke, contrato do hook) | **APROVADO** |

**Resultado: 2 APROVADO + 1 APROVADO_CONDICIONADO — 0 BLOQUEIA, 0 REPROVADO. Maioria APROVADO → MERGE após sanar condições.**

Confirmações da junta: padrão uniforme e correto nos 28 hooks (background mode: `1x true + 1x false` por hook, sem flicker);
todos os 30 call sites passam uma `refresh` que ACEITA `background` (sem mismatch — tsc não pegaria, verificado assinatura a
assinatura); timer via ref (sem leak), cleanup + pausa em `document.hidden`; `OperationsMapPage` corretamente sem `useAutoRefresh`
(já pola+SSE, sem duplo polling); nenhum botão não-refresh removido; os 3 smoke só perderam a linha do botão.

## Condições sanadas
- **MEDIA (cognicao) — TenantSettingsPage `<div work-orders-actions>` vazio p/ admin editor:** wrapper agora só renderiza
  quando há conteúdo (Badge "Somente leitura").
- **BAIXA (cognicao) — OperationsDispatchesPage idem p/ não-criador:** mesmo fix (wrapper condicional).
- **BAIXA (pattern+validador) — FinanceiroPage `useAutoRefresh(refresh)` sem `enabled`:** alinhado a
  `{ enabled: Boolean(activeContext) }` (import de `useTenantContext`).

## Condições DEFERIDAS (não-bloqueantes → pendências registradas)
- **MEDIA (cognicao) — affordance de "liveness":** 29/30 telas não mostram indicador de auto-refresh (só o mapa). O dono
  pediu refresh SILENCIOSO ("o sistema faz isso automatico" = fonte-de-verdade #1) → **sancionado, não bloqueia**. Os hooks já
  expõem `isRefreshing`; indicador sutil opcional fica em `P-UI-REFRESH-LIVENESS`.
- **BAIXA (cognicao) — cópia de erro em adapters** ("Atualize a lista", DuplicateWorkOrderModal) referencia refresh manual
  que não existe mais → `P-UI-REFRESH-ERROR-COPY` (passada de cópia futura; adapters fora do escopo deste WS).
- **BAIXA (cognicao) — Notifications não expõe `isRefreshing`** (divergência cosmética; funcionalmente correto) → fold em `P-UI-REFRESH-LIVENESS`.

## Rastreabilidade
- ID: WS-UI-REFRESH · PR: (após `gh pr create`) · merge_commit/approved_head: null na autoria (backfill pós-merge).
- Ata do fan-out: `wf_a477f5a9-614`; junta `wf_1e096b04-d65`.
- `.claude/skills/*` untracked (pré-existentes) EXCLUÍDOS do commit.
