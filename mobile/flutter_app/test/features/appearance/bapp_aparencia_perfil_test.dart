// B-APP-APARENCIA (F1) — Perfil › Aparência › Telas (plano §1.1, Emenda 1 A6,
// Emenda 3 §1): uma linha por tela do registro, as 3 opções num RadioGroup, o
// selo "padrão", a nota pessoal e o aviso quando o aparelho não guarda.
import 'package:erp_techsolutions_mobile/core/appearance/app_appearance.dart';
import 'package:erp_techsolutions_mobile/core/appearance/app_appearance_store.dart';
import 'package:erp_techsolutions_mobile/shared/ui/mobile_kit.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../capturas/captura_helper.dart';

const _key = kLocationConsentAppearanceKey;
const _row = Key('aparencia-tela-$_key');

Future<AparWorld> _profile(
  WidgetTester t, {
  Map<String, AppAppearance> prefs = const {},
  AppAppearanceStore? store,
}) async {
  final w = AparWorld(prefs: prefs, appearanceStore: store);
  await t.pumpWidget(aparApp(w, initial: '/profile'));
  await t.pumpAndSettle();
  return w;
}

Future<void> _open(WidgetTester t) async {
  await t.ensureVisible(find.byKey(_row));
  await t.pumpAndSettle();
  await t.tap(find.byKey(_row));
  await t.pumpAndSettle();
}

Future<void> _choose(WidgetTester t, AppAppearance value) async {
  final option = find.byKey(Key('aparencia-opcao-$_key-${value.letter}'));
  await t.ensureVisible(option);
  await t.pumpAndSettle();
  await t.tap(option);
  await t.pumpAndSettle();
}

String _meta(WidgetTester t) =>
    t.widget<MobileExpandableRow>(find.byKey(_row)).meta ?? '';

void main() {
  testWidgets('PF1. a seção "Telas" lista só as telas registradas, com a '
      'escolha atual no meta', (t) async {
    await _profile(t);
    expect(find.text('Telas'), findsOneWidget);
    expect(find.byType(MobileExpandableRow), findsNWidgets(1));
    expect(find.text('Localização e consentimento'), findsOneWidget);
    expect(_meta(t), ' · A · Cartões de hoje');
  });

  testWidgets('PF2. escolher B grava B e o meta mostra "B · Como o '
      'protótipo"', (t) async {
    final w = await _profile(t);
    await _open(t);
    await _choose(t, AppAppearance.b);
    expect(_meta(t), ' · B · Como o protótipo');
    expect(await w.appearanceStore.read(aparOwner), {_key: AppAppearance.b});
  });

  testWidgets('PF3. o RadioGroup marca a escolha guardada', (t) async {
    await _profile(t, prefs: {_key: AppAppearance.c});
    await _open(t);
    expect(find.byType(RadioListTile<AppAppearance>), findsNWidgets(3));
    final group = t.widget<RadioGroup<AppAppearance>>(
      find.byType(RadioGroup<AppAppearance>),
    );
    expect(group.groupValue, AppAppearance.c);
    expect(_meta(t), ' · C · Resumo e ações fixas');
  });

  testWidgets('PF4. o selo "padrão" fica na A, e a nota pessoal aparece', (
    t,
  ) async {
    await _profile(t);
    await _open(t);
    expect(
      find.descendant(
        of: find.byKey(Key('aparencia-opcao-$_key-A')),
        matching: find.text('padrão'),
      ),
      findsOneWidget,
    );
    expect(find.text('padrão'), findsOneWidget);
    expect(
      find.text(
        'Escolha pessoal: vale só para você, nesta organização e neste '
        'aparelho.',
      ),
      findsOneWidget,
    );
  });

  testWidgets('PF5. tocar na linha aberta fecha', (t) async {
    await _profile(t);
    await _open(t);
    expect(t.widget<MobileExpandableRow>(find.byKey(_row)).expanded, isTrue);
    await t.tap(find.text('Localização e consentimento'));
    await t.pumpAndSettle();
    expect(t.widget<MobileExpandableRow>(find.byKey(_row)).expanded, isFalse);
    expect(find.byType(RadioListTile<AppAppearance>), findsNothing);
  });

  testWidgets('PF6. armazenamento que recusa: mostra o aviso, e a escolha '
      'vale na sessão', (t) async {
    await _profile(t, store: RefusingAppAppearanceStore());
    await _open(t);
    await _choose(t, AppAppearance.b);
    expect(
      find.text(
        'Não foi possível guardar a escolha neste aparelho. Ela vale até '
        'fechar o app.',
      ),
      findsOneWidget,
    );
    expect(_meta(t), ' · B · Como o protótipo');
  });

  testWidgets('PF7. com o aparelho guardando, nenhum aviso', (t) async {
    await _profile(t);
    await _open(t);
    await _choose(t, AppAppearance.c);
    expect(find.byKey(const Key('aparencia-nao-guardada')), findsNothing);
  });

  testWidgets('PF8. a escolha do Perfil muda a tela de localização', (t) async {
    await _profile(t);
    await _open(t);
    await _choose(t, AppAppearance.c);
    final link = find.byKey(const Key('profile-location-row-C'));
    await t.ensureVisible(link);
    await t.pumpAndSettle();
    await t.tap(link);
    await t.pumpAndSettle();
    expect(
      find.byKey(const Key('aparencia-localizacao-consentimento-C')),
      findsOneWidget,
    );
  });

  testWidgets('PF9. a11y: a linha e as 3 opções têm alvo de 48 px e rótulo', (
    t,
  ) async {
    fixarTela(t, const Size(390, 812));
    final handle = t.ensureSemantics();
    await _profile(t);
    await _open(t);
    expect(
      t.getSize(find.text('Localização e consentimento')).height,
      lessThanOrEqualTo(48),
    );
    expect(
      t
          .getSize(
            find.ancestor(
              of: find.text('Localização e consentimento'),
              matching: find.byType(InkWell),
            ),
          )
          .height,
      greaterThanOrEqualTo(48),
    );
    for (final ap in AppAppearance.values) {
      final option = find.byKey(Key('aparencia-opcao-$_key-${ap.letter}'));
      expect(t.getSize(option).height, greaterThanOrEqualTo(48));
      expect(
        t.getSemantics(option).label,
        contains('${ap.letter} · ${appAppearanceScreens.single.labelOf(ap)}'),
      );
    }
    handle.dispose();
  });
}
