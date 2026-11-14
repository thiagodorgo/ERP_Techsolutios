// A peça `MobileExpandableRow` (lib/shared/ui/mobile_kit.dart), compartilhada
// entre o B-SAN3-17 e o B-SAN3-15b. Contrato: emenda 5.2 do 15b (§2.1, §2.2 e
// §3.1) e emenda 5.3 (§1 a §4). Arnês do K1, K2, K2b e K4: o tema do app, um
// `Padding` de 16 nos quatro lados e uma `Column`, sem rolável em volta.
import 'dart:io';

import 'package:erp_techsolutions_mobile/shared/theme/erp_mobile_theme.dart';
import 'package:erp_techsolutions_mobile/shared/ui/mobile_kit.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

Widget _harness(Widget child) => MaterialApp(
  theme: ErpMobileTheme.light(),
  home: Scaffold(
    body: Padding(
      padding: const EdgeInsets.all(16),
      child: Column(children: [child]),
    ),
  ),
);

class _Toggle extends StatefulWidget {
  const _Toggle({this.meta});

  final String? meta;

  @override
  State<_Toggle> createState() => _ToggleState();
}

class _ToggleState extends State<_Toggle> {
  bool open = false;

  @override
  Widget build(BuildContext context) => MobileExpandableRow(
    key: const ValueKey('peca'),
    title: 'Revogue quando quiser',
    meta: widget.meta,
    expanded: open,
    onToggle: () => setState(() => open = !open),
    detail: const Padding(
      key: ValueKey('detalhe'),
      padding: EdgeInsets.all(12),
      child: Text('Você pode revogar a qualquer momento.'),
    ),
  );
}

void main() {
  testWidgets('K1 o toque abre e fecha; a linha tem 48 e o detalhe nasce logo '
      'abaixo; título e meta em Text separados', (tester) async {
    await tester.pumpWidget(_harness(const _Toggle(meta: ' · 2 un')));

    expect(find.byKey(const ValueKey('detalhe')), findsNothing);
    expect(tester.getSize(find.byKey(const ValueKey('peca'))).height, 48.0);
    expect(find.text('Revogue quando quiser'), findsOneWidget);
    expect(find.text(' · 2 un'), findsOneWidget);

    await tester.tap(find.text('Revogue quando quiser'));
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('detalhe')), findsOneWidget);
    final rowTop = tester.getTopLeft(find.byKey(const ValueKey('peca'))).dy;
    final detailTop = tester
        .getTopLeft(find.byKey(const ValueKey('detalhe')))
        .dy;
    expect(detailTop - rowTop, 48.0);

    await tester.tap(find.text('Revogue quando quiser'));
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('detalhe')), findsNothing);
  });

  testWidgets('K2 com foco, Enter abre e Espaço fecha; as diretrizes de alvo '
      'passam', (tester) async {
    final handle = tester.ensureSemantics();
    await tester.pumpWidget(_harness(const _Toggle()));

    await tester.sendKeyEvent(LogicalKeyboardKey.tab);
    await tester.pumpAndSettle();
    await tester.sendKeyEvent(LogicalKeyboardKey.enter);
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('detalhe')), findsOneWidget);
    await tester.sendKeyEvent(LogicalKeyboardKey.space);
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('detalhe')), findsNothing);

    await expectLater(tester, meetsGuideline(androidTapTargetGuideline));
    await expectLater(tester, meetsGuideline(labeledTapTargetGuideline));
    handle.dispose();
  });

  testWidgets('K2b vermelho-controle do arnês: um InkWell de 200 por 44 '
      'reprova a diretriz do Android', (tester) async {
    final handle = tester.ensureSemantics();
    await tester.pumpWidget(
      _harness(
        SizedBox(
          width: 200,
          height: 44,
          child: InkWell(
            onTap: () {},
            child: Semantics(label: 'Controle de 44', child: const SizedBox()),
          ),
        ),
      ),
    );

    final result = await androidTapTargetGuideline.evaluate(tester);
    expect(result.passed, isFalse);
    handle.dispose();
  });

  test('K3 a peça não existe em dobro', () {
    final declaration = RegExp(
      r'^(?:(?:abstract|base|final|interface|sealed|mixin)\s+)*class\s+(\w*Expandable\w*)',
      multiLine: true,
    );
    final found = <String>[];
    for (final file in Directory('lib').listSync(recursive: true)) {
      if (file is! File || !file.path.endsWith('.dart')) continue;
      final path = file.path.replaceAll(r'\', '/');
      for (final match in declaration.allMatches(file.readAsStringSync())) {
        found.add('$path:${match.group(1)}');
      }
    }

    expect(found, ['lib/shared/ui/mobile_kit.dart:MobileExpandableRow']);
    expect(
      File('lib/shared/ui/erp_clickable_blocks.dart').existsSync(),
      isFalse,
    );
  });

  const cases = <String, (String, String?)>{
    'C1': (
      'Disjuntor tripolar 25A curva C para quadro de distribuicao',
      ' · ELE-0102 · 2 un',
    ),
    'C2': ('Mapa, trajeto e quilometragem da jornada de hoje', null),
    'C3': ('Cabo', ' · ELE-0102 · 2 un'),
    'C4': (
      'Disjuntor tripolar 25A curva C para quadro de distribuicao',
      ' · 2 un',
    ),
  };

  for (final width in [390.0, 320.0]) {
    for (final entry in cases.entries) {
      testWidgets('K4 ${entry.key} a $width: sem vão, sem estouro, corta pelo '
          'fim', (tester) async {
        await tester.binding.setSurfaceSize(Size(width, 640));
        addTearDown(() => tester.binding.setSurfaceSize(null));
        final (title, meta) = entry.value;
        await tester.pumpWidget(
          _harness(
            MobileExpandableRow(
              title: title,
              meta: meta,
              expanded: false,
              onToggle: () {},
              trailing: const Text('+2', key: ValueKey('k4-trailing')),
              detail: const SizedBox(),
            ),
          ),
        );

        // (a) nada estoura
        expect(tester.takeException(), isNull);

        final titleCut = tester
            .renderObject<RenderParagraph>(find.text(title))
            .didExceedMaxLines;
        final metaCut =
            meta != null &&
            tester
                .renderObject<RenderParagraph>(find.text(meta))
                .didExceedMaxLines;
        final titleWidth = tester.getSize(find.text(title)).width;
        final metaWidth = meta == null
            ? 0.0
            : tester.getSize(find.text(meta)).width;
        final gap =
            (tester.getTopLeft(find.byKey(const ValueKey('k4-trailing'))).dx -
                tester.getTopLeft(find.text(title)).dx) -
            (titleWidth + metaWidth);
        // ignore: avoid_print
        print(
          'BSAN317-K4 $width ${entry.key} titulo_cortado=$titleCut '
          'meta_cortado=$metaCut titulo=${titleWidth.toStringAsFixed(1)} '
          'meta=${metaWidth.toStringAsFixed(1)} vao=${gap.toStringAsFixed(1)}',
        );

        // (b) a precondição: o caso corta o que tem de cortar
        if (entry.key == 'C3') {
          expect(metaCut, isTrue, reason: 'C3 corta o meta');
          expect(titleCut, isFalse, reason: 'C3: o título curto não corta');
        } else {
          expect(titleCut, isTrue, reason: '${entry.key} corta o título');
        }
        // (c) cortado, não há vão
        if (titleCut || metaCut) {
          expect(gap, lessThanOrEqualTo(16.0));
        }
        // (d) C1: o título leva o espaço do texto e o meta some
        if (entry.key == 'C1') {
          expect(
            titleWidth,
            greaterThanOrEqualTo(0.9 * (titleWidth + metaWidth)),
          );
        }
      });
    }
  }
}
