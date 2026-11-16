// B-APP-APARENCIA (F1) — as peças novas do kit (plano §2.1): o MobileStatTile
// igual a antes sem os parâmetros novos e botão com eles; MobileIntroHeader,
// MobileStatusBlock, MobileStatusCard e MobileDangerOutlineButton, com o
// contraste AA isolado.
import 'dart:ui' show Tristate;

import 'package:erp_techsolutions_mobile/shared/theme/erp_mobile_theme.dart';
import 'package:erp_techsolutions_mobile/shared/ui/mobile_kit.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

Widget _host(Widget child) => MaterialApp(
  theme: ErpMobileTheme.light(),
  home: Scaffold(
    body: Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: SizedBox(width: 160, child: child),
      ),
    ),
  ),
);

void main() {
  testWidgets('K1. MobileStatTile sem os parâmetros novos desenha como antes', (
    t,
  ) async {
    await t.pumpWidget(
      _host(
        const MobileStatTile(
          key: Key('tile'),
          value: '7',
          label: 'OS hoje',
          color: ErpMobileTheme.primary,
        ),
      ),
    );
    final container = t.widget<Container>(
      find
          .descendant(
            of: find.byKey(const Key('tile')),
            matching: find.byType(Container),
          )
          .first,
    );
    final deco = container.decoration! as BoxDecoration;
    final border = deco.border! as Border;
    expect(border.top.color, ErpMobileTheme.cardBorder);
    expect(border.top.width, 1);
    expect(
      container.padding,
      const EdgeInsets.symmetric(vertical: 14, horizontal: 10),
    );
    expect(
      find.descendant(
        of: find.byKey(const Key('tile')),
        matching: find.byType(InkWell),
      ),
      findsNothing,
    );
    expect(t.widget<Text>(find.text('7')).style?.fontSize, 24);
  });

  testWidgets('K2. MobileStatTile com onTap é botão, marcado quando '
      'selected, e Enter ativa', (t) async {
    var taps = 0;
    final handle = t.ensureSemantics();
    await t.pumpWidget(
      _host(
        MobileStatTile(
          key: const Key('tile'),
          icon: Icons.gps_fixed_outlined,
          value: 'Disponível',
          label: 'GPS',
          color: ErpMobileTheme.success,
          selected: true,
          onTap: () => taps++,
        ),
      ),
    );
    final flags = t.getSemantics(find.byKey(const Key('tile'))).flagsCollection;
    expect(flags.isButton, isTrue);
    expect(flags.isSelected, Tristate.isTrue);
    await t.tap(find.byKey(const Key('tile')));
    expect(taps, 1);
    Focus.of(t.element(find.text('GPS'))).requestFocus();
    await t.pump();
    await t.sendKeyEvent(LogicalKeyboardKey.enter);
    await t.pump();
    expect(taps, 2);
    final border =
        (t
                        .widget<Container>(
                          find
                              .descendant(
                                of: find.byKey(const Key('tile')),
                                matching: find.byType(Container),
                              )
                              .first,
                        )
                        .decoration!
                    as BoxDecoration)
                .border!
            as Border;
    expect(border.top.color, ErpMobileTheme.primary);
    handle.dispose();
  });

  testWidgets('K3. MobileStatusBlock: rótulo em caixa alta, valor com o tom', (
    t,
  ) async {
    await t.pumpWidget(
      _host(
        const MobileStatusBlock(
          label: 'Organização',
          value: 'Registrado',
          tone: PillTone.done,
        ),
      ),
    );
    expect(find.text('ORGANIZAÇÃO'), findsOneWidget);
    expect(
      t.widget<Text>(find.text('Registrado')).style?.color,
      const Color(0xFF047857),
    );
  });

  testWidgets('K4. MobileStatusCard: verde só com success', (t) async {
    await t.pumpWidget(
      _host(
        const Column(
          children: [
            MobileStatusCard(
              key: Key('ok'),
              icon: Icons.check,
              title: 'Consentimento concedido',
              subtitle: 'Permitido durante o uso do app.',
              success: true,
            ),
            MobileStatusCard(
              key: Key('neutro'),
              icon: Icons.block_outlined,
              title: 'Consentimento pendente',
              subtitle: 'Revogado. Nada é capturado.',
            ),
          ],
        ),
      ),
    );
    BoxDecoration deco(String key) =>
        t
                .widget<Container>(
                  find
                      .descendant(
                        of: find.byKey(Key(key)),
                        matching: find.byType(Container),
                      )
                      .first,
                )
                .decoration!
            as BoxDecoration;
    expect(deco('ok').color, const Color(0xFFECFDF5));
    expect(deco('neutro').color, Colors.white);
  });

  testWidgets('K5. MobileDangerOutlineButton: vermelho do tema e 48 px', (
    t,
  ) async {
    await t.pumpWidget(
      _host(
        MobileDangerOutlineButton(
          key: const Key('btn'),
          label: 'Revogar consentimento',
          icon: const Icon(Icons.block_outlined),
          onPressed: () {},
        ),
      ),
    );
    expect(
      t.getSize(find.byKey(const Key('btn'))).height,
      greaterThanOrEqualTo(48),
    );
    final style = DefaultTextStyle.of(
      t.element(find.text('Revogar consentimento')),
    ).style;
    expect(style.color, ErpMobileTheme.dangerInk);
  });

  testWidgets('K6. contraste AA nas peças novas, isoladas', (t) async {
    await t.pumpWidget(
      _host(
        SingleChildScrollView(
          child: Column(
            children: [
              const MobileIntroHeader(
                icon: Icons.location_on_outlined,
                title: 'Localização em campo',
                message: 'Sua organização usa a sua localização.',
              ),
              for (final tone in [
                PillTone.done,
                PillTone.warning,
                PillTone.danger,
                PillTone.neutral,
              ])
                MobileStatusBlock(label: 'GPS', value: 'Valor', tone: tone),
              const MobileStatusCard(
                icon: Icons.check,
                title: 'Consentimento concedido',
                subtitle: 'Permitido durante o uso do app.',
                success: true,
              ),
              const MobileStatusCard(
                icon: Icons.block_outlined,
                title: 'Consentimento pendente',
                subtitle: 'Revogado. Nada é capturado.',
              ),
              MobileDangerOutlineButton(label: 'Revogar', onPressed: () {}),
              MobileStatTile(
                icon: Icons.schedule_outlined,
                value: 'Com o app aberto',
                label: 'Captura',
                color: ErpMobileTheme.success,
                onTap: () {},
              ),
            ],
          ),
        ),
      ),
    );
    await expectLater(t, meetsGuideline(textContrastGuideline));
  });
}
