# B-104 — Upload real de fotos/evidencias

## Objetivo

Implementar upload real parcial de arquivos de evidencia mobile, conectando
backend mobile e Flutter sem tocar frontend web, Prisma, migrations, infra,
secrets, `.env`, Figma, `pubspec` ou lockfiles.

## Contrato backend

- `POST /api/v1/mobile/evidence-uploads`
- `multipart/form-data`
- Campos: `evidence_id`, `client_evidence_id`, `sha256`, `size_bytes`,
  `content_type` opcional, `work_order_id` opcional, arquivo `file`.
- Tenant resolvido pelo ator autenticado.
- Permissoes: `work_orders:update` ou `field_location:send`.
- MIME: `image/jpeg`, `image/png`.
- Limite: 10 MB.
- Resposta em envelope `{ data }` com contrato
  `mobile_evidence_file_upload@2026-06-17.b104`.

## Contrato Flutter

- Picker pode carregar `bytes`, mas bytes nunca entram no JSON de sync.
- `EvidenceBlobStore` salva bytes em referencia local opaca.
- Metadata sync registra manifesto e retorna `evidence_id`.
- Upload binario roda depois do metadata sync e somente com `evidence_id`
  real.
- `localBlobRef`, path local, base64, file_data e tenant externo nunca sao
  enviados.

## Lacunas fora do B-104

- Presigned URL.
- Storage protegido final.
- Persistencia DB/Redis.
- Antivirus.
- Auditoria completa de arquivo.
- Politica definitiva de retencao.

## Validacoes obrigatorias

- `dart format --output=none --set-exit-if-changed lib test`
- `flutter analyze`
- `flutter test`
- `npm run check`
- `npm test`
- `npm run lint`
- `npm run build`
- `node --test --import tsx tests/mobile-backend-contracts.test.ts`
- `node --check mobile/flutter_app/Kpis/app.js`
- `git diff --check`
