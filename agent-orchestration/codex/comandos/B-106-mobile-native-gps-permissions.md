# B-106 — Adapter GPS nativo real + permissoes Android/iOS

## Objetivo

Conectar o `DeviceLocationProvider` criado no B-105 a um adapter GPS nativo real no Flutter, com permissoes Android/iOS when-in-use, opt-in explicito e captura manual somente por acao do usuario.

## Escopo permitido

- `mobile/flutter_app/pubspec.yaml`
- `mobile/flutter_app/pubspec.lock`
- `mobile/flutter_app/android/app/src/main/AndroidManifest.xml`
- `mobile/flutter_app/ios/Runner/Info.plist`
- `mobile/flutter_app/lib/core/location/**`
- `mobile/flutter_app/lib/core/sync/**`
- `mobile/flutter_app/lib/features/work_orders/ui/**`
- `mobile/flutter_app/test/**`
- `mobile/flutter_app/Kpis/**`
- `Kpis/**`
- `docs/mobile-flutter-mvp-gap-analysis.md`
- `docs/mobile-flutter-app.md`
- `docs/api.md`
- `docs/mobile-sync-contracts.md`
- `docs/field-operator-location-map.md`
- `agent-orchestration/codex/log-execucao.md`
- `agent-orchestration/docs/status-geral.md`

## Regras de privacidade

- Sem background tracking.
- Sem stream continuo.
- Sem timer periodico.
- Sem captura automatica ao abrir tela.
- Sem captura automatica no `AutoSyncCoordinator`.
- Sem envio silencioso.
- Sem permissoes Android de background ou foreground service location.
- Sem permissoes iOS Always ou `UIBackgroundModes` location.
- Localizacao capturada apenas quando o usuario aciona `Enviar localizacao agora`.

## Entregas esperadas

- Dependencia `geolocator` adicionada via `flutter pub add geolocator`.
- `GeolocatorDeviceLocationProvider` com port testavel.
- `LocationConsentStore` para opt-in interno antes do pedido de permissao nativa.
- UI de Localizacao operacional com status de consentimento, permissao e servico.
- Preservacao do contrato `POST /api/v1/mobile/field-locations`.
- Field Location continua antes dos demais dominios no sync.
- KPIs mobile e raiz atualizados, incluindo HTML.
- Docs atualizadas com politica de captura manual e payload seguro.

## Validacoes obrigatorias

```bash
cd mobile/flutter_app
dart format --output=none --set-exit-if-changed lib test
flutter analyze
flutter test test/features/b106_native_gps_permissions_test.dart --reporter compact
flutter test test/features/b105_gps_operational_map_test.dart --reporter compact
flutter test test/features/b104_evidence_real_upload_test.dart --reporter compact
flutter test test/core/evidence_sync_test.dart --reporter compact
flutter test test/features/b103_work_order_sync_test.dart --reporter compact
flutter test test/features/b102_checklist_answers_sync_test.dart --reporter compact
flutter test --reporter compact
cd ../..

rg -n "getPositionStream|getServiceStatusStream|Timer.periodic|ACCESS_BACKGROUND_LOCATION|FOREGROUND_SERVICE_LOCATION|UIBackgroundModes|NSLocationAlwaysAndWhenInUseUsageDescription|NSLocationAlwaysUsageDescription" mobile/flutter_app
rg -n "debugPrint\(|print\(|console\.log|latitude|longitude" mobile/flutter_app/lib/core/location mobile/flutter_app/lib/features/work_orders/ui
rg -n "tenant_id|tenantId|Authorization|Bearer|accessToken|refreshToken|base64|file_data|local_path|path" mobile/flutter_app/lib/core/location mobile/flutter_app/test/features

npm run check
npm run lint
npm test
npm run build
node --test --import tsx tests/mobile-backend-contracts.test.ts
node --test --import tsx tests/mobile-backend-contracts.test.ts tests/core-saas-contract.test.ts

git diff --name-only
git diff --check
git status --short
```

## Criterio de aceite

- Todas as validacoes passam.
- Os tres PNGs de marca continuam untracked e fora do commit.
- Nao ha alteracao em backend funcional, frontend web, Prisma, migrations, infra, `.env`, `package.json` ou lockfiles JS.
- PR aberta sem merge.
