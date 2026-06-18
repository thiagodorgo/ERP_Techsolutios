# B-107 - Criacao remota de OS e conflitos

## Objetivo

Permitir que OS local-only seja criada pelo sync mobile, receba `serverId` e
libere acoes dependentes, com resolucao manual inicial de conflitos.

## Contratos

- `POST /api/v1/mobile/sync/work-order-actions`
- tipos B-107: `work_order.create` e `work_order.status_change`
- tenant resolvido pelo contexto autenticado
- permissao de create: `work_orders:create`
- idempotencia: tenant + usuario + `client_action_id`

## Validacoes

```bash
cd mobile/flutter_app
dart format --output=none --set-exit-if-changed lib test
flutter analyze
flutter test test/features/b107_work_order_remote_create_conflicts_test.dart --reporter compact
flutter test test/features/b106_native_gps_permissions_test.dart --reporter compact
flutter test test/features/b105_gps_operational_map_test.dart --reporter compact
flutter test test/features/b103_work_order_sync_test.dart --reporter compact
flutter test --reporter compact
cd ../..

npm run check
npm run lint
npm test
npm run build
node --test --import tsx tests/mobile-backend-contracts.test.ts
node --test --import tsx tests/mobile-backend-contracts.test.ts tests/core-saas-contract.test.ts
```

## Limites

- Nao atualizar KPIs nesta PR.
- Sem approval real ou `evidence_attach` no replay de OS.
- Sem Prisma, migrations, frontend web, infra, Figma ou alteracao de lockfiles.
- Limpar artefatos Flutter/Node apos as validacoes.
