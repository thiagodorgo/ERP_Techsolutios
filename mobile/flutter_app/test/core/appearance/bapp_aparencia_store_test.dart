// B-APP-APARENCIA (F1) — a guarda e os providers da aparência por pessoa
// (plano §1.3, Emenda 1 A5, Emenda 2 R2-1, Emenda 3 §3).
import 'dart:async';
import 'dart:convert';

import 'package:erp_techsolutions_mobile/core/appearance/app_appearance.dart';
import 'package:erp_techsolutions_mobile/core/appearance/app_appearance_providers.dart';
import 'package:erp_techsolutions_mobile/core/appearance/app_appearance_store.dart';
import 'package:erp_techsolutions_mobile/core/auth/auth_notifier.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_repository.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../capturas/captura_helper.dart';

const _t1u1 = AppAppearanceOwner(tenantId: 't1', userId: 'u1');
const _t1u2 = AppAppearanceOwner(tenantId: 't1', userId: 'u2');
const _t2u1 = AppAppearanceOwner(tenantId: 't2', userId: 'u1');
const _key = kLocationConsentAppearanceKey;

ProviderContainer _container({
  required AppAppearanceStore store,
  bool authenticated = true,
  Future<BootstrapSession>? bootstrap,
}) {
  final container = ProviderContainer(
    overrides: [
      appAppearanceStoreProvider.overrideWithValue(store),
      if (authenticated) authStateProvider.overrideWith(AparFakeAuth.new),
      bootstrapSessionProvider.overrideWith(
        (_) => bootstrap ?? Future.value(aparSession()),
      ),
    ],
  );
  addTearDown(container.dispose);
  return container;
}

Future<void> _settle() async {
  for (var i = 0; i < 5; i++) {
    await Future<void>.delayed(Duration.zero);
  }
}

void main() {
  group('guarda (store)', () {
    test('S1. a chave é por organização e pessoa', () async {
      final store = InMemoryAppAppearanceStore();
      expect(await store.write(_t1u1, _key, AppAppearance.b), isTrue);
      expect(store.values.keys, ['erp.aparencia.v1.t1.u1']);
      expect(jsonDecode(store.values['erp.aparencia.v1.t1.u1']!), {_key: 'B'});
    });

    test('S2. dois usuários na mesma organização não se veem', () async {
      final store = InMemoryAppAppearanceStore();
      await store.write(_t1u1, _key, AppAppearance.c);
      expect(await store.read(_t1u2), isEmpty);
      expect(await store.read(_t1u1), {_key: AppAppearance.c});
    });

    test('S3. a mesma pessoa em duas organizações não se vê', () async {
      final store = InMemoryAppAppearanceStore();
      await store.write(_t2u1, _key, AppAppearance.c);
      expect(await store.read(_t1u1), isEmpty);
      expect(await store.read(_t2u1), {_key: AppAppearance.c});
    });

    test('S4. chave de tela inválida é descartada', () async {
      final store = InMemoryAppAppearanceStore({
        'erp.aparencia.v1.t1.u1': jsonEncode({
          'Tela Inválida': 'B',
          '-comeca-com-traco': 'B',
          _key: 'C',
        }),
      });
      expect(await store.read(_t1u1), {_key: AppAppearance.c});
    });

    test(
      'S5. valor fora de A, B e C é descartado ("D", minúscula, número)',
      () async {
        final store = InMemoryAppAppearanceStore({
          'erp.aparencia.v1.t1.u1': jsonEncode({
            _key: 'D',
            'execucao-guincho': 'b',
            'troca-senha': 2,
            'prestador-atendimento': 'B',
          }),
        });
        expect(await store.read(_t1u1), {
          'prestador-atendimento': AppAppearance.b,
        });
      },
    );

    test('S6. JSON corrompido vira vazio e a tela fica no padrão', () async {
      final store = InMemoryAppAppearanceStore({
        'erp.aparencia.v1.t1.u1': '{"localizacao-consentimento": "B"',
      });
      final prefs = await store.read(_t1u1);
      expect(prefs, isEmpty);
      expect(resolveAppAppearance(prefs, _key), defaultAppAppearanceFor(_key));
    });

    test('S7. sem dono a leitura é o vazio', () async {
      final store = InMemoryAppAppearanceStore();
      await store.write(_t1u1, _key, AppAppearance.b);
      expect(await store.read(null), isEmpty);
      expect(
        resolveAppAppearance(await store.read(null), _key),
        defaultAppAppearanceFor(_key),
      );
    });

    test('S8. sem dono não grava', () async {
      final store = InMemoryAppAppearanceStore();
      expect(await store.write(null, _key, AppAppearance.b), isFalse);
      expect(store.values, isEmpty);
    });

    test('S9. armazenamento que recusa: a escolha vale na sessão', () async {
      final store = RefusingAppAppearanceStore();
      expect(await store.write(_t1u1, _key, AppAppearance.b), isFalse);
      expect(await store.read(_t1u1), {_key: AppAppearance.b});
    });

    test('S10. sem escolha abre o padrão: a B na Localização (o desenho '
        'aprovado, B-GUI-00) e a A nas outras telas', () {
      expect(defaultAppAppearanceFor(_key), AppAppearance.b);
      expect(resolveAppAppearance(const {}, _key), AppAppearance.b);
      expect(defaultAppAppearanceFor('troca-senha'), AppAppearance.a);
    });

    test('S11. a escrita guarda as letras e mantém as outras telas', () async {
      final store = InMemoryAppAppearanceStore()
        ..seed(_t1u1, {'troca-senha': AppAppearance.c});
      await store.write(_t1u1, _key, AppAppearance.b);
      expect(jsonDecode(store.values['erp.aparencia.v1.t1.u1']!), {
        'troca-senha': 'C',
        _key: 'B',
      });
    });

    test('S12. o registro tem só as telas desta fatia, com 3 opções', () {
      expect(appAppearanceScreens.map((s) => s.key), [
        _key,
        kExecucaoGuinchoAppearanceKey,
        kDetalheOsAppearanceKey,
      ]);
      final screen = appAppearanceScreens.firstWhere((s) => s.key == _key);
      expect(screen.label, 'Localização e consentimento');
      expect(screen.options.map((o) => o.label), [
        'Cartões de hoje',
        'Como o protótipo',
        'Resumo e ações fixas',
      ]);
      expect(screen.metaOf(AppAppearance.b), 'B · Como o protótipo');
    });
  });

  group('providers', () {
    test('P1. sem sessão autenticada (sessão carregando): o padrão da tela, '
        'como dado (a B na Localização, B-GUI-00)', () {
      final container = _container(
        store: InMemoryAppAppearanceStore()
          ..seed(aparOwner, {_key: AppAppearance.c}),
        authenticated: false,
        bootstrap: Completer<BootstrapSession>().future,
      );
      final value = container.read(screenAppearanceProvider(_key));
      expect(value, const AsyncValue<AppAppearance>.data(AppAppearance.b));
    });

    test(
      'P2. com sessão autenticada e o bootstrap carregando: carregando',
      () async {
        final container = _container(
          store: InMemoryAppAppearanceStore()
            ..seed(aparOwner, {_key: AppAppearance.b}),
          bootstrap: Completer<BootstrapSession>().future,
        );
        container.listen(screenAppearanceProvider(_key), (_, _) {});
        await container.read(authStateProvider.future);
        await _settle();
        final value = container.read(screenAppearanceProvider(_key));
        expect(value.isLoading, isTrue);
        expect(value.hasValue, isFalse);
      },
    );

    test(
      'P3. com dono: a escolha guardada desta pessoa nesta organização',
      () async {
        final container = _container(
          store: InMemoryAppAppearanceStore()
            ..seed(aparOwner, {_key: AppAppearance.c}),
        );
        container.listen(screenAppearanceProvider(_key), (_, _) {});
        await container.read(bootstrapSessionProvider.future);
        await container.read(appAppearancePrefsProvider.future);
        await _settle();
        expect(
          container.read(screenAppearanceProvider(_key)).asData?.value,
          AppAppearance.c,
        );
      },
    );

    test('P4. setScreen muda na hora e grava no aparelho', () async {
      final store = InMemoryAppAppearanceStore();
      final container = _container(store: store);
      container.listen(screenAppearanceProvider(_key), (_, _) {});
      await container.read(bootstrapSessionProvider.future);
      await container.read(appAppearancePrefsProvider.future);
      final saved = await container
          .read(appAppearancePrefsProvider.notifier)
          .setScreen(_key, AppAppearance.b);
      expect(saved, isTrue);
      expect(
        container.read(screenAppearanceProvider(_key)).asData?.value,
        AppAppearance.b,
      );
      expect(await store.read(aparOwner), {_key: AppAppearance.b});
    });

    test('P5. sem sessão autenticada, setScreen não grava', () async {
      final store = InMemoryAppAppearanceStore();
      final container = _container(store: store, authenticated: false);
      container.read(screenAppearanceProvider(_key));
      final saved = await container
          .read(appAppearancePrefsProvider.notifier)
          .setScreen(_key, AppAppearance.b);
      expect(saved, isFalse);
      expect(store.values, isEmpty);
    });
  });
}
