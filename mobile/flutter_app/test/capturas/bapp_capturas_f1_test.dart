// B-APP-APARENCIA (F1) — as capturas das 3 aparências para a conferência
// visual do orquestrador (Emenda 2, R2-4). Não é golden: grava PNG fora do
// repositório, na pasta de `ERP_CAPTURAS_DIR`; sem a variável, o teste é
// pulado (o CI e a suíte não gravam nada, e os casos pulados não contam).
//
// Nome: `<tela>-<aparência>-<estado>-<largura>.png`.
import 'package:erp_techsolutions_mobile/core/appearance/app_appearance.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'captura_helper.dart';

const _key = kLocationConsentAppearanceKey;
const _sizes = [Size(390, 812), Size(360, 740)];

const _locStates = [
  'nao-decidiu',
  'confirme',
  'concedido',
  'aguardando',
  'sem-cadastro',
  'erro',
  'revogado',
  'revogado-aguardando',
  'nao-permitido',
  'desatualizado',
  'gps-off',
  'bloqueado',
  'bloqueado-com',
];

const _profileStates = {
  'pend': 'nao-decidiu',
  'conc': 'concedido',
  'rev': 'revogado',
  'np': 'nao-permitido',
};

const _homeStates = {
  'pend': ('nao-decidiu', true),
  'confirme': ('confirme', true),
  'decidiu': ('concedido', true),
  'semperm': ('nao-decidiu', false),
};

void main() {
  final skip = capturasDir == null
      ? 'sem ERP_CAPTURAS_DIR: captura só sob pedido, fora do repositório'
      : null;

  setUpAll(() async {
    if (skip != null) return;
    await loadRoboto();
    await loadMaterialIcons();
  });

  for (final size in _sizes) {
    final w = size.width.toInt();
    for (final ap in AppAppearance.values) {
      for (final state in _locStates) {
        testWidgets('localizacao-${ap.letter}-$state-$w', skip: skip != null, (
          t,
        ) async {
          fixarTela(t, size);
          final blocked = state.startsWith('bloqueado');
          final world = AparWorld(
            consent: FixedConsentStore(
              consentState(
                state == 'bloqueado'
                    ? 'nao-decidiu'
                    : state == 'bloqueado-com'
                    ? 'concedido'
                    : state,
              ),
            ),
            prefs: {_key: ap},
          );
          await t.pumpWidget(
            aparApp(world, send: !blocked, gps: state != 'gps-off'),
          );
          await t.pumpAndSettle();
          await capturar(t, 'localizacao-${ap.letter}-$state-$w');
        });
      }

      for (final MapEntry(key: name, value: state) in _profileStates.entries) {
        testWidgets('perfil-${ap.letter}-$name-$w', skip: skip != null, (
          t,
        ) async {
          fixarTela(t, size);
          final world = AparWorld(
            consent: FixedConsentStore(consentState(state)),
            prefs: {_key: ap},
          );
          await t.pumpWidget(aparApp(world, initial: '/profile'));
          await t.pumpAndSettle();
          await capturar(t, 'perfil-${ap.letter}-$name-$w');
        });
      }

      testWidgets('perfil-${ap.letter}-telas-aberto-$w', skip: skip != null, (
        t,
      ) async {
        fixarTela(t, size);
        final world = AparWorld(prefs: {_key: ap});
        await t.pumpWidget(aparApp(world, initial: '/profile'));
        await t.pumpAndSettle();
        final row = find.byKey(const Key('aparencia-tela-$_key'));
        await t.ensureVisible(row);
        await t.pumpAndSettle();
        await t.tap(row);
        await t.pumpAndSettle();
        await t.ensureVisible(find.byKey(Key('aparencia-opcao-$_key-C')));
        await t.pumpAndSettle();
        await capturar(t, 'perfil-${ap.letter}-telas-aberto-$w');
      });

      for (final MapEntry(key: name, value: (state, send))
          in _homeStates.entries) {
        testWidgets('inicio-${ap.letter}-$name-$w', skip: skip != null, (
          t,
        ) async {
          fixarTela(t, size);
          final world = AparWorld(
            consent: FixedConsentStore(consentState(state)),
            prefs: {_key: ap},
          );
          await t.pumpWidget(aparApp(world, initial: '/', send: send));
          await t.pumpAndSettle();
          await capturar(t, 'inicio-${ap.letter}-$name-$w');
        });
      }
    }
  }
}
