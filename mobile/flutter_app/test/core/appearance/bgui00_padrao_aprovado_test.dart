// B-GUI-00 — o padrão de cada tela é o desenho aprovado (decisão H do dono,
// 16/11; plano-APP-GUINCHO-emenda1 §5.1). A Localização abre na B, "Como o
// protótipo", para quem nunca escolheu; quem já escolheu continua com a sua
// escolha; a Execução do guincho continua na A.
import 'package:erp_techsolutions_mobile/core/appearance/app_appearance.dart';
import 'package:erp_techsolutions_mobile/core/appearance/app_appearance_providers.dart';
import 'package:erp_techsolutions_mobile/core/appearance/app_appearance_store.dart';
import 'package:erp_techsolutions_mobile/core/auth/auth_notifier.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_repository.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../capturas/captura_helper.dart';

const _location = kLocationConsentAppearanceKey;
const _execucao = kExecucaoGuinchoAppearanceKey;

/// A aparência de [screenKey] pelo caminho das telas: sessão autenticada,
/// bootstrap pronto (há dono) e a escolha lida de [store].
Future<AppAppearance?> _appearanceOf(
  AppAppearanceStore store,
  String screenKey,
) async {
  final container = ProviderContainer(
    overrides: [
      appAppearanceStoreProvider.overrideWithValue(store),
      authStateProvider.overrideWith(AparFakeAuth.new),
      bootstrapSessionProvider.overrideWith((_) => Future.value(aparSession())),
    ],
  );
  addTearDown(container.dispose);
  container.listen(screenAppearanceProvider(screenKey), (_, _) {});
  await container.read(bootstrapSessionProvider.future);
  await container.read(appAppearancePrefsProvider.future);
  for (var i = 0; i < 5; i++) {
    await Future<void>.delayed(Duration.zero);
  }
  return container.read(screenAppearanceProvider(screenKey)).asData?.value;
}

void main() {
  group('B-GUI-00 — o padrão é o desenho aprovado', () {
    test('H1. sem escolha guardada, a Localização abre na B ("Como o '
        'protótipo")', () async {
      expect(defaultAppAppearanceFor(_location), AppAppearance.b);
      expect(resolveAppAppearance(const {}, _location), AppAppearance.b);
      expect(
        await _appearanceOf(InMemoryAppAppearanceStore(), _location),
        AppAppearance.b,
      );
      final screen = appAppearanceScreens.firstWhere((s) => s.key == _location);
      expect(
        screen.metaOf(defaultAppAppearanceFor(_location)),
        'B · Como o protótipo',
      );
    });

    test('H2. com a A guardada, a Localização continua na A', () async {
      expect(
        resolveAppAppearance({_location: AppAppearance.a}, _location),
        AppAppearance.a,
      );
      expect(
        await _appearanceOf(
          InMemoryAppAppearanceStore()
            ..seed(aparOwner, {_location: AppAppearance.a}),
          _location,
        ),
        AppAppearance.a,
      );
    });

    test('H3. a Execução do guincho continua na A, com e sem escolha das '
        'outras telas', () async {
      expect(defaultAppAppearanceFor(_execucao), AppAppearance.a);
      expect(
        await _appearanceOf(InMemoryAppAppearanceStore(), _execucao),
        AppAppearance.a,
      );
      expect(
        await _appearanceOf(
          InMemoryAppAppearanceStore()
            ..seed(aparOwner, {_location: AppAppearance.c}),
          _execucao,
        ),
        AppAppearance.a,
      );
    });
  });
}
