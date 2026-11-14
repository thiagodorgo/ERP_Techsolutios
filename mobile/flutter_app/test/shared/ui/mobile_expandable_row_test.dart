// B-SAN3-15b (criado na ordem 1: o 15b chegou antes do B-SAN3-17) — os testes da `MobileExpandableRow`, a linha que
// abre o detalhe, contrato único das Emendas 5.2 (§2.1, §2.2, §3.1) e 5.3 (§1 a §4) do B-SAN3-15b.
//   K1  — o toque no título abre e fecha; fechada, a peça tem 48.0 de altura; o detalhe começa 48.0 abaixo do topo da
//         linha; o título está num `Text` só dele e o meta em outro;
//   K2  — com foco (Tab), Enter abre e Espaço fecha; `androidTapTargetGuideline` e `labeledTapTargetGuideline` passam;
//   K2b — vermelho-controle permanente do arnês: no mesmo arnês, um `InkWell` de 200 por 44 reprova a diretriz de 48;
//   K3  — a peça não existe em dobro em `lib/`;
//   K4  — a linha corta pelo fim, sem vão e sem estouro, a 390 e a 320 de largura.
// O arnês é parte do contrato: o tema do app, um `Padding` de 16 nos quatro lados e uma `Column`, sem rolável (sem a
// margem, a diretriz pula a linha que encosta na borda e não mede nada).
import 'dart:io';

import 'package:erp_techsolutions_mobile/shared/theme/erp_mobile_theme.dart';
import 'package:erp_techsolutions_mobile/shared/ui/mobile_kit.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

const _titulo = 'Disjuntor tripolar 25A';
const _meta = ' · ELE-0102 · 2 un';

Widget _arnes(Widget filho) => MaterialApp(
  theme: ErpMobileTheme.light(),
  home: Scaffold(
    body: Padding(
      padding: const EdgeInsets.all(16),
      child: Column(children: [filho]),
    ),
  ),
);

class _Host extends StatefulWidget {
  const _Host();

  @override
  State<_Host> createState() => _HostState();
}

class _HostState extends State<_Host> {
  bool _aberta = false;

  @override
  Widget build(BuildContext context) => MobileExpandableRow(
    key: const Key('peca'),
    title: _titulo,
    meta: _meta,
    expanded: _aberta,
    onToggle: () => setState(() => _aberta = !_aberta),
    detail: const SizedBox(
      key: Key('detalhe'),
      height: 60,
      child: Text('Saldo'),
    ),
  );
}

void main() {
  testWidgets(
    'K1 o toque no título abre e fecha; 48 de altura; o detalhe logo abaixo',
    (t) async {
      await t.pumpWidget(_arnes(const _Host()));
      expect(t.getSize(find.byKey(const Key('peca'))).height, 48.0);
      expect(find.byKey(const Key('detalhe')), findsNothing);

      // O título e o meta, cada um num `Text` só dele.
      expect(find.text(_titulo), findsOneWidget);
      expect(find.text(_meta), findsOneWidget);

      await t.tap(find.text(_titulo));
      await t.pumpAndSettle();
      expect(find.byKey(const Key('detalhe')), findsOneWidget);
      final topoDaLinha = t.getTopLeft(find.byKey(const Key('peca'))).dy;
      expect(
        t.getTopLeft(find.byKey(const Key('detalhe'))).dy,
        topoDaLinha + 48.0,
      );

      await t.tap(find.text(_titulo));
      await t.pumpAndSettle();
      expect(find.byKey(const Key('detalhe')), findsNothing);
      expect(t.getSize(find.byKey(const Key('peca'))).height, 48.0);
    },
  );

  testWidgets(
    'K2 com foco, Enter abre e Espaço fecha; diretrizes de 48 e de rótulo',
    (t) async {
      final semantica = t.ensureSemantics();
      await t.pumpWidget(_arnes(const _Host()));
      await t.sendKeyEvent(LogicalKeyboardKey.tab);
      await t.pumpAndSettle();
      await t.sendKeyEvent(LogicalKeyboardKey.enter);
      await t.pumpAndSettle();
      expect(
        find.byKey(const Key('detalhe')),
        findsOneWidget,
        reason: 'Enter abre',
      );
      await t.sendKeyEvent(LogicalKeyboardKey.space);
      await t.pumpAndSettle();
      expect(
        find.byKey(const Key('detalhe')),
        findsNothing,
        reason: 'Espaço fecha',
      );
      await expectLater(t, meetsGuideline(androidTapTargetGuideline));
      await expectLater(t, meetsGuideline(labeledTapTargetGuideline));
      semantica.dispose();
    },
  );

  testWidgets(
    'K2b o arnês mede: um InkWell de 200 por 44 reprova a diretriz de 48',
    (t) async {
      final semantica = t.ensureSemantics();
      await t.pumpWidget(
        _arnes(
          Semantics(
            label: 'controle',
            child: SizedBox(
              width: 200,
              height: 44,
              child: InkWell(onTap: () {}),
            ),
          ),
        ),
      );
      final avaliacao = await androidTapTargetGuideline.evaluate(t);
      expect(avaliacao.passed, isFalse, reason: avaliacao.reason);
      semantica.dispose();
    },
  );

  test('K3 a peça não existe em dobro em lib/', () {
    final declaracao = RegExp(
      r'^(?:(?:abstract|base|final|interface|sealed|mixin)\s+)*class\s+(\w*Expandable\w*)',
      multiLine: true,
    );
    final lib = Directory('lib');
    expect(
      lib.existsSync(),
      isTrue,
      reason: 'rode a partir de mobile/flutter_app',
    );
    final achadas = <String>[];
    var arquivos = 0;
    for (final f in lib.listSync(recursive: true).whereType<File>()) {
      if (!f.path.endsWith('.dart')) continue;
      arquivos += 1;
      final caminho = f.path.replaceAll(r'\', '/');
      for (final m in declaracao.allMatches(f.readAsStringSync())) {
        achadas.add('$caminho:${m.group(1)}');
      }
    }
    expect(arquivos, greaterThan(100), reason: 'a guarda mede algo');
    expect(achadas, ['lib/shared/ui/mobile_kit.dart:MobileExpandableRow']);
    expect(
      File('lib/shared/ui/erp_clickable_blocks.dart').existsSync(),
      isFalse,
    );
  });

  // K4 — Emenda 5.3 §1.3: os 4 casos, a 390 e a 320, num teste só.
  testWidgets('K4 a linha corta pelo fim, sem vão e sem estouro, a 390 e a 320', (
    t,
  ) async {
    const tituloLongo =
        'Disjuntor tripolar 25A curva C para quadro de distribuicao';
    const casos = <String, (String, String?)>{
      'C1': (tituloLongo, ' · ELE-0102 · 2 un'),
      'C2': ('Mapa, trajeto e quilometragem da jornada de hoje', null),
      'C3': ('Cabo', ' · ELE-0102 · 2 un'),
      'C4': (tituloLongo, ' · 2 un'),
    };
    addTearDown(() => t.binding.setSurfaceSize(null));
    for (final largura in [390.0, 320.0]) {
      await t.binding.setSurfaceSize(Size(largura, 640));
      for (final caso in casos.entries) {
        final onde = '${caso.key} a ${largura.toInt()}';
        final (titulo, meta) = caso.value;
        await t.pumpWidget(
          _arnes(
            MobileExpandableRow(
              key: UniqueKey(),
              title: titulo,
              meta: meta,
              expanded: false,
              onToggle: () {},
              detail: const SizedBox.shrink(),
              trailing: const Text('+2', key: ValueKey('k4-trailing')),
            ),
          ),
        );

        // (a) nada estoura.
        expect(t.takeException(), isNull, reason: onde);

        final tituloCortado = t
            .renderObject<RenderParagraph>(find.text(titulo))
            .didExceedMaxLines;
        final metaCortado =
            meta != null &&
            t.renderObject<RenderParagraph>(find.text(meta)).didExceedMaxLines;
        // (b) a precondição: C1, C2 e C4 cortam o título; C3 corta o meta.
        if (caso.key == 'C3') {
          expect(metaCortado, isTrue, reason: '$onde: corta o meta');
        } else {
          expect(tituloCortado, isTrue, reason: '$onde: corta o título');
        }

        final xTitulo = t.getTopLeft(find.text(titulo)).dx;
        final xTrailing = t
            .getTopLeft(find.byKey(const ValueKey('k4-trailing')))
            .dx;
        final larguraTitulo = t.getSize(find.text(titulo)).width;
        final larguraMeta = meta == null
            ? 0.0
            : t.getSize(find.text(meta)).width;
        final vao = (xTrailing - xTitulo) - (larguraTitulo + larguraMeta);
        // (c) com texto cortado, sem vão (o vão fixo da peça entre o texto e o trailing é 10).
        if (tituloCortado || metaCortado) {
          expect(vao, lessThanOrEqualTo(16.0), reason: '$onde: vão $vao');
        }
        // (d) C1: o título leva o espaço e o meta some.
        if (caso.key == 'C1') {
          expect(
            larguraTitulo,
            greaterThanOrEqualTo(0.9 * (larguraTitulo + larguraMeta)),
            reason: '$onde: título $larguraTitulo, meta $larguraMeta',
          );
        }
      }
    }
  });
}
