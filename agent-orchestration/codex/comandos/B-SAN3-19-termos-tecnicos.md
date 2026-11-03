# B-SAN3-19 — faxina de termos técnicos no app de campo (item 48)

- **Ramo:** `fix/mobile-faxina-termos`
- **Papel desta execução:** DEV; não planeja, não critica e não vota.
- **Executor:** Claude Opus `dev-san319-opus` (nível menor, declarado). Verificador: Codex GPT-5.6 Sol (§C7 item 11).
- **Plano:** `C:/Users/thiag/erp-pausa-2026-10-03/planos/B-SAN3-19-plano.md` (autor: orquestrador, Claude Opus 5.5, no papel de topo).
- **Nível:** revisão simples, mais CI e conferência visual por widget test (§C7 item 10(1)). Só texto exibido.
- **Pendência:** `P-MOBILE-FAXINA-TERMOS-TECNICOS` (`PLANO_SAN3.md:173`, `:292`).

## Escopo permitido

`mobile/flutter_app/android/app/src/main/AndroidManifest.xml` (só `android:label`); `mobile/flutter_app/ios/Runner/Info.plist`
(só `CFBundleDisplayName`/`CFBundleName`); `mobile/flutter_app/lib/core/auth/role_labels.dart` (novo);
`lib/shared/ui/{home_screen,erp_components,profile_screen}.dart`; `lib/features/auth/tenant_selector_screen.dart`;
`mobile/flutter_app/test/features/bsan319_*_test.dart`; `docs/revisoes/SAN3/B-SAN3-19-dev.md`; este comando.

## Escopo proibido

`pubspec.yaml`/`pubspec.lock`; `src/**`, `frontend/**`, `prisma/**`, `Kpis/**`; valor de papel enviado ou comparado;
`bootstrap_session.dart` ("Tenant Demo", item 47).

## Validação

Em `mobile/flutter_app`: `flutter pub get` · `dart format --output=none --set-exit-if-changed lib test` · `flutter analyze` ·
`flutter test test/features/bsan319_*` · regressões das telas tocadas · `flutter test --reporter compact`. Na raiz:
`git diff --check`. Mutações M1–M4 vermelhas e restauradas. CI do head concluído, com o resumo do job `flutter` lido no log.
