# B-102 — Flutter Checklist Answers Sync

## Objetivo

Conectar o replay local-first de respostas de checklist do Flutter ao contrato
backend real `POST /api/v1/mobile/sync/checklist-actions`.

Escopo real apos revisao humana: B-102 envia apenas respostas/notas/conclusao
de runs reconhecidas pelo backend (`server_run_id` ou `run_id` real). Runs
locais sem mapeamento remoto permanecem pending; `checklist_run.create`,
markers, divergencia, acknowledgement e anexos em lote ficam para blocos
futuros.

## Escopo permitido

- `mobile/flutter_app/**`
- `mobile/flutter_app/Kpis/**`
- `agent-orchestration/codex/**`
- `agent-orchestration/docs/status-geral.md`
- `docs/mobile-flutter-mvp-gap-analysis.md`

## Escopo proibido

- backend `src/**`
- frontend web `frontend/**`
- Prisma, migrations, infra, secrets, `.env`
- Figma
- `pubspec.yaml`, `pubspec.lock`, `package.json` e lockfiles
- OS sync bidirecional
- upload real de evidencias
- checklist run creation/mapping remoto
- markers/divergencia/acknowledgement/anexos em lote

## Contrato

- endpoint: `POST /api/v1/mobile/sync/checklist-actions`
- request: `{ client_batch_id, actions[] }`
- action: `{ client_action_id, type, local_created_at, payload }`
- tipos enviados:
  - `checklist.item_answer`
  - `checklist.item_note`
  - `checklist.complete`
- tipos internos enviados pelo replay real B-102:
  - `checklist_answer.upsert`
  - `checklist_run.complete`
- `local_run_id` pode ir em metadata, mas nao pode virar `run_id` de backend.
- tenant resolvido pelo backend via ator autenticado; o app nao envia
  `tenantId` ou `tenant_id`.

## Resultado esperado

- `accepted` -> `synced`
- `already_applied` -> `synced`
- `rejected` -> `failed` retryable
- `conflicts` -> `conflict` manual
- erro de rede -> `failed` com `NETWORK_ERROR`

## Validacoes obrigatorias

Executar dentro de `mobile/flutter_app`:

```bash
flutter pub get
dart format --output=none --set-exit-if-changed lib test
flutter analyze
flutter test test/features/b088_checklist_sync_replay_test.dart --reporter compact
flutter test test/features/b100_checklist_remote_templates_test.dart --reporter compact
flutter test test/core/evidence_sync_test.dart --reporter compact
flutter test test/features/b102_checklist_answers_sync_test.dart --reporter compact
flutter test --reporter compact
```

Executar na raiz:

```bash
npm test
npm run lint
npm run build
node --check mobile/flutter_app/Kpis/app.js
git diff --check
rg -n ':\s*\?[A-Za-z_][A-Za-z0-9_]*' mobile/flutter_app/lib mobile/flutter_app/test
rg -n '\?tenantId|\?note|\?checksum|\?captureSource' mobile/flutter_app/lib mobile/flutter_app/test
git status --short
git diff --name-only
```

## Proximos blocos

- B-103 — OS sync bidirecional
- B-104 — upload real de evidencias
- GPS/mapa
- aprovacao real
- piloto Android real
