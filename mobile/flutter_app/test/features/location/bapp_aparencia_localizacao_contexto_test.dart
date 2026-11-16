// B-APP-APARENCIA (F1) — a opção da localização também no Perfil (linha
// "Localização" de Privacidade) e no Início (o aviso), Emenda 1, A1: a mesma
// chave muda as três peças juntas.
import 'package:erp_techsolutions_mobile/core/appearance/app_appearance.dart';
import 'package:erp_techsolutions_mobile/features/location/ui/location_consent_home_card.dart';
import 'package:erp_techsolutions_mobile/shared/ui/mobile_kit.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../capturas/captura_helper.dart';

const _key = kLocationConsentAppearanceKey;

const _situations = [
  ('nao-decidiu', 'Pendente', 'Autorize para poder enviar sua localização.'),
  ('concedido', 'Permitido', 'Permitido durante o uso do app.'),
  ('revogado', 'Revogado', 'Revogado. Nada é capturado.'),
  ('nao-permitido', 'Não permitido', 'Não permitido. Nada é capturado.'),
];

Future<void> _pump(
  WidgetTester t,
  String initial,
  AppAppearance ap, {
  String state = 'nao-decidiu',
  bool send = true,
}) async {
  final w = AparWorld(
    consent: FixedConsentStore(consentState(state)),
    prefs: {_key: ap},
  );
  await t.pumpWidget(aparApp(w, initial: initial, send: send));
  await t.pumpAndSettle();
}

void main() {
  group('Perfil › Privacidade › Localização', () {
    testWidgets('PA. na A, a linha é igual à "Trocar de organização"', (
      t,
    ) async {
      await _pump(t, '/profile', AppAppearance.a, state: 'concedido');
      expect(find.byKey(const Key('profile-location-row-B')), findsNothing);
      expect(find.byKey(const Key('profile-location-row-C')), findsNothing);
      expect(find.byKey(const Key('profile-location-pill')), findsNothing);
      expect(find.text('Localização'), findsOneWidget);
    });

    for (final (state, short, line) in _situations) {
      testWidgets('PB-$state. na B, o selo "$short"', (t) async {
        await _pump(t, '/profile', AppAppearance.b, state: state);
        expect(find.byKey(const Key('profile-location-row-B')), findsOneWidget);
        expect(
          t
              .widget<MobilePill>(
                find.byKey(const Key('profile-location-pill')),
              )
              .label,
          short,
        );
      });

      testWidgets('PC-$state. na C, o ícone e "$line" embaixo', (t) async {
        await _pump(t, '/profile', AppAppearance.c, state: state);
        expect(find.byKey(const Key('profile-location-row-C')), findsOneWidget);
        expect(
          t.widget<Text>(find.byKey(const Key('profile-location-line'))).data,
          line,
        );
        expect(find.byKey(const Key('profile-location-pill')), findsNothing);
      });
    }
  });

  group('Início', () {
    double topOf(WidgetTester t, Finder f) => t.getRect(f).top;

    testWidgets('IA. na A, o cartão fica depois dos atalhos', (t) async {
      await _pump(t, '/', AppAppearance.a);
      expect(find.byType(LocationConsentHomeCard), findsOneWidget);
      expect(
        topOf(t, find.byType(LocationConsentHomeCard)),
        greaterThan(topOf(t, find.text('ATALHOS OPCIONAIS'))),
      );
    });

    for (final state in ['nao-decidiu', 'confirme']) {
      testWidgets('IB-$state. na B, o cartão branco sobe para logo depois do '
          'cartão do usuário', (t) async {
        await _pump(t, '/', AppAppearance.b, state: state);
        final card = find.byType(LocationConsentHomeCardB);
        expect(card, findsOneWidget);
        expect(find.byType(LocationConsentHomeCard), findsNothing);
        expect(topOf(t, card), lessThan(topOf(t, find.text('RESUMO DE HOJE'))));
      });

      testWidgets('IC-$state. na C, a faixa com "Revisar" sobe para logo '
          'depois do cartão do usuário', (t) async {
        await _pump(t, '/', AppAppearance.c, state: state);
        final band = find.byType(LocationConsentHomeBandC);
        expect(band, findsOneWidget);
        expect(
          find.descendant(of: band, matching: find.text('Revisar')),
          findsOneWidget,
        );
        expect(topOf(t, band), lessThan(topOf(t, find.text('RESUMO DE HOJE'))));
      });
    }

    for (final ap in [AppAppearance.b, AppAppearance.c]) {
      testWidgets('I${ap.letter}-decidiu. já decidiu: sem aviso', (t) async {
        await _pump(t, '/', ap, state: 'concedido');
        expect(
          find.byKey(const Key('location-consent-home-card')),
          findsNothing,
        );
      });

      testWidgets('I${ap.letter}-semperm. sem permissão de enviar: sem aviso', (
        t,
      ) async {
        await _pump(t, '/', ap, send: false);
        expect(
          find.byKey(const Key('location-consent-home-card')),
          findsNothing,
        );
      });

      testWidgets('I${ap.letter}-abre. "Revisar" leva à tela de localização na '
          'mesma aparência', (t) async {
        await _pump(t, '/', ap);
        await t.tap(find.byKey(const Key('location-consent-home-card')));
        await t.pumpAndSettle();
        expect(
          find.byKey(Key('aparencia-localizacao-consentimento-${ap.letter}')),
          findsOneWidget,
        );
      });
    }
  });
}
