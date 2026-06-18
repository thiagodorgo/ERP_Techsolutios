# B-108 - Hardening de evidencias/storage

## Objetivo

Endurecer o upload mobile de evidencias iniciado no B-104, mantendo multipart e
offline-first, sem expor path, bucket, storage key, token, base64 ou tenant
externo.

## Contrato backend

- `POST /api/v1/mobile/evidence-uploads`
- `multipart/form-data`
- Campos: `evidence_id`, `client_evidence_id`, `sha256`, `size_bytes`,
  `content_type` opcional, `work_order_id` opcional, arquivo `file`.
- Tenant resolvido pelo ator autenticado; `tenant_id` do form e ignorado.
- Permissoes: `work_orders:update` ou `field_location:send`.
- MIME: `image/jpeg`, `image/png`.
- Limite: 10 MB.
- Provider local protegido para dev/test, com nome fisico gerado pelo servidor.
- Scanner testavel com default Noop e fake para limpo/infectado/falha.
- Resposta em envelope `{ data }` com contrato
  `mobile_evidence_file_upload@2026-06-18.b108`.

## Contrato Flutter

- Mantem upload multipart apos manifesto `evidence_id`.
- `status=stored` marca evidencia como sincronizada e apaga o blob local opaco.
- `rejected`, `scan_failed`, `pending_review`, erro de rede ou timeout preservam
  a evidencia local.
- Payload real nao envia `tenant_id`, `tenantId`, token, `Authorization`,
  `Bearer`, `base64`, `file_data`, `local_path`, `path`, bucket ou storage key.

## Auditoria segura

- `evidence.upload.accepted`
- `evidence.upload.rejected`
- `evidence.upload.scan_failed`
- `evidence.upload.stored`

Metadata de auditoria nao inclui path, bucket, storage key, token, base64 ou
conteudo binario.

## Limites

- Nao atualizar KPIs nesta PR.
- Sem Prisma, migrations, frontend web, infra, Figma, `.env`, package/lockfiles
  ou `pubspec`.
- Sem presigned URL/storage externo, DB/Redis receipt, antivirus real, download
  protegido final ou retencao definitiva nesta rodada.

## Validacoes obrigatorias

```bash
cd mobile/flutter_app
flutter pub get
dart format --output=none --set-exit-if-changed lib test
flutter analyze
flutter test test/features/b108_evidence_storage_hardening_test.dart --reporter compact
flutter test test/features/b104_evidence_real_upload_test.dart --reporter compact
flutter test test/features/b107_work_order_remote_create_conflicts_test.dart --reporter compact
flutter test --reporter compact
cd ../..

npm run check
npm run lint
npm test
npm run build
node --test --import tsx tests/mobile-backend-contracts.test.ts
node --test --import tsx tests/mobile-backend-contracts.test.ts tests/core-saas-contract.test.ts
node --check Kpis/app.js
node --check mobile/flutter_app/Kpis/app.js
git diff --check
```

## KPI

Feature B-108 nao altera arquivos KPI. Proposta pos-avaliacao humana: blocos
38, MVP demo 93%, MVP vendavel 76%, totais de testes conforme validacao final.
