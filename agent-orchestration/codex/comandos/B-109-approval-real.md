# B-109 - Aprovacao operacional real

## Objetivo

Entregar um MVP real e seguro de aprovacao para OS, checklist concluido e
evidencia armazenada, sem atualizar KPIs na feature PR.

## Endpoints

- `GET /api/v1/approvals/pending`
- `GET /api/v1/approvals/:approvalId`
- `POST /api/v1/approvals/:approvalId/approve`
- `POST /api/v1/approvals/:approvalId/reject`

## Regras

- Tenant resolvido pelo ator autenticado.
- Leitura usa temporariamente `work_orders:read`.
- Decisao usa temporariamente `work_orders:update`.
- Futuro: `approval:read` e `approval:decide`.
- Reprovacao exige motivo.
- Segunda decisao retorna `approval_already_decided`.
- Resposta publica usa allowlist sem token, path, storage key, bucket, base64 ou
  conteudo binario.

## Integracoes

- OS concluida cria pendencia idempotente.
- `ApprovalService.request` aceita `work_order`, `checklist_run` e `evidence`.
- Auditoria sanitizada em memoria e persistente best-effort.
- Notificacao segura para o solicitante com action URL da OS.
- UI web no detalhe de Work Order.
- Flutter apenas tolera estados; nao decide neste bloco.

## Persistencia

Repositorio em memoria com interface substituivel. Prisma/migrations ficam fora
do B-109.

## Validacoes

```bash
cd mobile/flutter_app
flutter pub get
dart format --output=none --set-exit-if-changed lib test
flutter analyze
flutter test test/features/b109_approval_state_regression_test.dart --reporter compact
flutter test test/features/b108_evidence_storage_hardening_test.dart --reporter compact
flutter test test/features/b107_work_order_remote_create_conflicts_test.dart --reporter compact
flutter test --reporter compact
cd ../..

npm run check
npm run lint
npm test
npm run build
node --test --import tsx tests/approval.test.ts tests/approval-routes.test.ts tests/approval-frontend-contract.test.ts
node --test --import tsx tests/mobile-backend-contracts.test.ts
node --test --import tsx tests/mobile-backend-contracts.test.ts tests/core-saas-contract.test.ts
npm --prefix frontend run check
npm --prefix frontend run build
git diff --check
```

## KPIs propostos, nao publicados

- Blocos: 39
- MVP demo: 94%
- MVP vendavel: 79%
- Totais reais de testes: preencher apos validacao final.
