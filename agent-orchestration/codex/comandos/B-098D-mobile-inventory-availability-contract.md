# B-098D - Mobile Inventory Availability Contract

## Objetivo

Implementar contratos backend minimos para o app mobile consultar disponibilidade de estoque e registrar acoes controladas de inventario em contexto de campo, sem alterar Flutter.

## Base

- Branch: `feature/mobile-inventory-availability-contract`
- Base: `origin/main` atualizada apos merge do PR #84
- Worktree: `ERP_Techsolutios-codex-b098d`

## Escopo permitido

- `src/modules/mobile/**`
- `tests/mobile-backend-contracts.test.ts`
- `docs/api.md`
- `docs/mobile-flutter-app.md`
- `docs/mobile-sync-contracts.md`
- `docs/mobile-backend-contract-readiness.md`
- `agent-orchestration/**`

## Contratos implementados

- Endpoint: `GET /api/v1/mobile/inventory/availability`
- Endpoint: `POST /api/v1/mobile/sync/inventory-actions`
- Availability retorna `data.items[]` com `item_id`, `sku`, `name`, `unit`, `warehouse_id`, `available_quantity`, `reserved_quantity` e `status`.
- Sync usa envelope `{ client_batch_id?, actions[] }`.
- Cada acao exige `client_action_id`, `type`, `local_created_at` e `payload`.
- Tipos implementados:
  - `inventory.reserve`
  - `inventory.consume`
  - `inventory.shortage_report`
- Resultado separado em:
  - `summary`
  - `accepted`
  - `rejected`
  - `conflicts`
  - `already_applied`

## Regras de seguranca e consistencia

- `tenant_id` de query/body/payload nao e confiavel.
- Tenant efetivo vem do ator autenticado/contexto backend.
- Availability exige `inventory.read` ou `inventory.manage`.
- Sync exige `inventory.manage`, seguindo o catalogo real atual do repo.
- Idempotencia usa tenant do ator + usuario do ator + `client_action_id`.
- Reenvio identico retorna `already_applied`.
- Reenvio com mesmo `client_action_id` e payload diferente retorna `idempotency_payload_mismatch`.
- Flutter, Figma, secrets, `.env`, migrations e infra permanecem fora do bloco.

## Status do contrato

`partial`: a disponibilidade e o replay minimo existem em memoria para estabilizar o contrato mobile, mas ainda faltam persistencia duravel, reserva transacional multi-instancia, relacionamento real com OS/armazem e implementacao Flutter consumindo o endpoint.

## Validacoes esperadas

- `npm run check`
- `npm run lint`
- `npm test`
- `node --test --import tsx tests/mobile-backend-contracts.test.ts tests/core-saas-contract.test.ts`
- `npm run build`
- `npm --prefix frontend run check`
- `npm --prefix frontend run test:smoke`
- `npm --prefix frontend run build`
- `DATABASE_URL=dummy npx prisma validate`
- `git diff --check`
