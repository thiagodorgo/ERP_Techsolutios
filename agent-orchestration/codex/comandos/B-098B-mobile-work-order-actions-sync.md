# B-098B - Mobile Work Order Actions Sync Contract

## Objetivo

Implementar o contrato backend `POST /api/v1/mobile/sync/work-order-actions` para sincronizacao controlada de acoes de Ordens de Servico vindas do Flutter, sem alterar Flutter.

## Base

- Branch: `feature/mobile-work-order-actions-sync`
- Base: `origin/main` atualizada apos merge do PR #81
- Worktree: `ERP_Techsolutios-codex-b098b`

## Escopo permitido

- `src/modules/mobile/**`
- `tests/mobile-backend-contracts.test.ts`
- `docs/api.md`
- `docs/mobile-flutter-app.md`
- `docs/mobile-sync-contracts.md`
- `agent-orchestration/**`

## Contrato implementado

- Endpoint: `POST /api/v1/mobile/sync/work-order-actions`
- Envelope: `{ client_batch_id?, actions[] }`
- Acao obrigatoria: `client_action_id`
- Tipos implementados:
  - `work_order.status_change`
  - `work_order.assign`
- Resultado separado em:
  - `accepted`
  - `rejected`
  - `conflicts`
  - `already_applied`

## Regras de seguranca e consistencia

- `tenant_id` de body/payload nao e confiavel.
- Tenant efetivo vem do ator autenticado/contexto backend.
- Idempotencia usa tenant do ator + usuario do ator + `client_action_id`.
- Reenvio identico retorna `already_applied`.
- Reenvio com mesmo `client_action_id` e payload diferente retorna conflito.
- Checklist, inventario e evidencias genericas permanecem fora do bloco.

## Validacoes esperadas

- `npm run check`
- `npm run lint`
- `npm test`
- `node --test --import tsx tests/mobile-backend-contracts.test.ts tests/core-saas-contract.test.ts`
- `npm run build`
- `npm --prefix frontend run check`
- `npm --prefix frontend run test:smoke`
- `npm --prefix frontend run build`
- `npx prisma validate` com `DATABASE_URL` dummy local
- `git diff --check`
