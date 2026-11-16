// B-APP-APARENCIA (F2) — a execução do guincho, seção Vistorias, nas 3
// aparências (`execucao-guincho-3opcoes.reference.html`): o despacho pela
// escolha do Perfil, só para OS de guincho; os 13 estados da maquete (mais o
// "verificando" da A) na B e na C; a trava, a prévia da comparação, a cor do
// passo concluído (`P-APP-TEMA-SUCESSO-TERTIARY`) e as peças novas do kit.
import 'package:erp_techsolutions_mobile/core/appearance/app_appearance.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_repository.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/domain/work_order_models.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/ui/work_order_stepper.dart';
import 'package:erp_techsolutions_mobile/shared/theme/erp_mobile_theme.dart';
import 'package:erp_techsolutions_mobile/shared/ui/erp_components.dart';
import 'package:erp_techsolutions_mobile/shared/ui/mobile_kit.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../capturas/captura_helper.dart';

const _keyB = Key('aparencia-execucao-guincho-B');
const _keyC = Key('aparencia-execucao-guincho-C');
const _keyA = ValueKey('bsan314-fase-entrega');

const _semConexao =
    'Sem conexão. O que você fizer fica salvo no aparelho e é enviado quando '
    'o sinal voltar.';
const _desatualizado =
    'Não foi possível atualizar as vistorias agora. Os dados podem estar '
    'desatualizados.';
const _filaConclusao =
    'A vistoria de entrega e a conclusão da OS ficam na fila. Quando o sinal '
    'voltar, a entrega é enviada primeiro e a OS conclui logo depois.';
const _filaEntrega =
    'As respostas da entrega ficam salvas no aparelho e vão para o servidor '
    'quando o sinal voltar.';
const _naoVerificada = 'Entrega não verificada — conecte-se para atualizar.';

Future<void> _pump(
  WidgetTester t,
  String estado, {
  AppAppearance? ap,
  GuinchoCenario? cenario,
  Size size = const Size(800, 3000),
  bool settle = true,
}) async {
  fixarTela(t, size);
  // Um app novo por chamada: o ProviderScope anterior sai da árvore.
  await t.pumpWidget(const SizedBox.shrink());
  await t.pumpWidget(
    await guinchoApp(cenario ?? GuinchoCenario.of(estado), appearance: ap),
  );
  if (settle) {
    await t.pumpAndSettle();
  } else {
    // A sessão chega; a OS ainda não (o FutureBuilder sem dado).
    await t.pump();
  }
}

String _title(WidgetTester t) =>
    t.widget<MobileScreenHeader>(find.byType(MobileScreenHeader)).title;

Finder _in(Key key, String text) =>
    find.descendant(of: find.byKey(key), matching: find.text(text));

Finder _inRich(Key key, String text) => find.descendant(
  of: find.byKey(key),
  matching: find.textContaining(text, findRichText: true),
);

ButtonStyleButton _button(WidgetTester t, String label, {Key? within}) =>
    t.widget<ButtonStyleButton>(
      find
          .ancestor(
            of: within == null
                ? find.text(label)
                : find.descendant(
                    of: find.byKey(within),
                    matching: find.text(label),
                  ),
            matching: find.byWidgetPredicate((w) => w is ButtonStyleButton),
          )
          .first,
    );

MobileStickyBar _bar(WidgetTester t) =>
    t.widget<MobileStickyBar>(find.byKey(const Key('guincho-b-barra')));

String _barButton(WidgetTester t) => t
    .widget<Text>(
      find.descendant(
        of: find.byKey(const Key('guincho-b-proxima-acao')),
        matching: find.byType(Text),
      ),
    )
    .data!;

MobileRequirement _req(WidgetTester t, String prefix) => t
    .widget<MobileRequirementList>(find.byType(MobileRequirementList))
    .items
    .firstWhere((r) => r.text.startsWith(prefix));

const _noColeta = Key('guincho-b-no-coleta');
const _noEntrega = Key('guincho-b-no-entrega');
const _noConclusao = Key('guincho-b-no-conclusao');
const _cColeta = Key('guincho-c-fase-coleta');
const _cEntrega = Key('guincho-c-fase-entrega');
const _cConcluir = Key('guincho-c-concluir');
const _cComparar = Key('guincho-c-comparar-texto');

void main() {
  group('despacho', () {
    for (final ap in AppAppearance.values) {
      testWidgets('GD1-${ap.letter}. preferência ${ap.letter} mostra a vista '
          '${ap.letter} e nenhuma outra', (t) async {
        await _pump(t, 'rota', ap: ap);
        expect(
          find.byKey(_keyB),
          ap == AppAppearance.b ? findsOne : findsNothing,
        );
        expect(
          find.byKey(_keyC),
          ap == AppAppearance.c ? findsOne : findsNothing,
        );
        expect(
          find.byKey(_keyA),
          ap == AppAppearance.a ? findsOne : findsNothing,
        );
      });
    }

    for (final ap in [AppAppearance.b, AppAppearance.c]) {
      testWidgets('GD2-${ap.letter}. OS de prestador com preferência '
          '${ap.letter} desenha a A', (t) async {
        await _pump(
          t,
          'rota',
          ap: ap,
          cenario: GuinchoCenario(
            runs: [guinchoColeta()],
            order: guinchoOrder(type: WorkOrderServiceType.provider),
          ),
        );
        expect(find.byKey(_keyB), findsNothing);
        expect(find.byKey(_keyC), findsNothing);
        expect(find.text('Checklist'), findsOneWidget);
      });
    }

    testWidgets('GD3. keystore que não responde: a tela fica no carregamento '
        'até o teto de 3 s e então desenha a A, sem Timer pendente', (t) async {
      fixarTela(t, const Size(800, 3000));
      await t.pumpWidget(
        await guinchoApp(
          GuinchoCenario.of('rota'),
          store: PendingAppAppearanceStore(),
        ),
      );
      await t.pump(const Duration(milliseconds: 200));
      await t.pump(const Duration(milliseconds: 200));
      expect(find.byType(CircularProgressIndicator), findsWidgets);
      expect(find.byKey(_keyA), findsNothing);
      await t.pump(const Duration(seconds: 3));
      await t.pumpAndSettle();
      expect(find.byKey(_keyA), findsOneWidget);
    });
  });

  group('opção B — Guiada por fases', () {
    testWidgets('GB1. coleta em andamento: título "Coleta" e a barra pede '
        '"Continuar vistoria de coleta", com o caminho da coleta', (t) async {
      await _pump(t, 'coleta', ap: AppAppearance.b);
      expect(_title(t), 'Coleta');
      expect(
        _bar(t).supportingText,
        'Conclua a vistoria de coleta para seguir para a entrega.',
      );
      expect(_barButton(t), 'Continuar vistoria de coleta');
      expect(_in(_noEntrega, 'Abrir vistoria de entrega'), findsOneWidget);
      await t.tap(find.byKey(const Key('guincho-b-proxima-acao')));
      await t.pumpAndSettle();
      expect(
        find.text(
          'Vistoria /checklists/$guinchoCl/run?workOrderId=$guinchoWo'
          '&kind=collection',
        ),
        findsOneWidget,
      );
    });

    testWidgets('GB2. rota de entrega pede Abrir vistoria de entrega, e a '
        'conclusão fica travada', (t) async {
      await _pump(t, 'rota', ap: AppAppearance.b);
      expect(_title(t), 'Rota de entrega');
      expect(_barButton(t), 'Abrir vistoria de entrega');
      expect(
        _bar(t).supportingText,
        'Leve o veículo até o local de entrega e abra a vistoria ao chegar.',
      );
      expect(_bar(t).supportingTextColor, ErpMobileTheme.warningInk);
      expect(_in(_noConclusao, 'Travada'), findsOneWidget);
      expect(
        _in(
          _noConclusao,
          'Conclua a vistoria de entrega antes de concluir a OS.',
        ),
        findsOneWidget,
      );
      expect(find.text('Concluir OS'), findsNothing);
      await t.tap(find.byKey(const Key('guincho-b-proxima-acao')));
      await t.pumpAndSettle();
      expect(
        find.text(
          'Vistoria /checklists/$guinchoCl/run?workOrderId=$guinchoWo'
          '&kind=delivery',
        ),
        findsOneWidget,
      );
    });

    testWidgets('GB3. entrega em andamento: título "Entrega", "Continuar '
        'vistoria de entrega" e o progresso no nó', (t) async {
      await _pump(t, 'entrega', ap: AppAppearance.b);
      expect(_title(t), 'Entrega');
      expect(_barButton(t), 'Continuar vistoria de entrega');
      expect(
        _bar(t).supportingText,
        'Conclua a vistoria de entrega para liberar a conclusão da OS.',
      );
      expect(
        _in(_noEntrega, 'Vistoria de veículo leve · 2 de 3 obrigatórios'),
        findsOneWidget,
      );
      final bar = t.widget<LinearProgressIndicator>(
        find.descendant(
          of: find.byKey(_noEntrega),
          matching: find.byType(LinearProgressIndicator),
        ),
      );
      expect(bar.value, closeTo(2 / 3, 0.001));
    });

    testWidgets('GB4. entrega concluída: "Pronta para concluir", Concluir OS '
        'liberado e verde, e concluir leva ao detalhe', (t) async {
      await _pump(t, 'pronta', ap: AppAppearance.b);
      expect(_title(t), 'Pronta para concluir');
      expect(_bar(t).supportingText, 'Coleta e entrega concluídas.');
      expect(_barButton(t), 'Concluir OS');
      expect(_in(_noConclusao, 'Liberada'), findsOneWidget);
      expect(_in(_noColeta, 'Ver vistoria de coleta'), findsOneWidget);
      expect(
        find.text('As duas vistorias concluídas: veja o que mudou.'),
        findsOneWidget,
      );
      final concluir = _button(t, 'Concluir OS');
      expect(concluir.onPressed, isNotNull);
      expect(
        concluir.style?.backgroundColor?.resolve({}),
        ErpMobileTheme.success,
      );
      await t.tap(find.text('Concluir OS'));
      await t.pumpAndSettle();
      expect(find.text('Detalhe'), findsOneWidget);
    });

    testWidgets('GB5. entrega em andamento sem sinal: faixa sem conexão, '
        '"Salvo no aparelho" e o aviso da fila da entrega', (t) async {
      await _pump(t, 'entrega-off', ap: AppAppearance.b);
      expect(find.byKey(const ValueKey('guincho-b-sem-conexao')), findsOne);
      expect(find.text(_semConexao), findsOneWidget);
      expect(_in(_noEntrega, 'Salvo no aparelho'), findsOneWidget);
      expect(
        find.descendant(
          of: find.byKey(_noEntrega),
          matching: find.textContaining('salvas no aparelho'),
        ),
        findsOneWidget,
      );
      expect(find.text(_filaEntrega), findsOneWidget);
      expect(_barButton(t), 'Continuar vistoria de entrega');
    });

    testWidgets('GB6. entrega concluída sem sinal: "Na fila", o aviso da fila '
        'e concluir continua liberado', (t) async {
      await _pump(t, 'pronta-off', ap: AppAppearance.b);
      expect(_in(_noEntrega, 'Na fila'), findsOneWidget);
      expect(find.text(_filaConclusao), findsOneWidget);
      expect(
        _bar(t).supportingText,
        'Sem sinal: a conclusão fica na fila e é enviada quando o sinal '
        'voltar.',
      );
      expect(
        _in(_noConclusao, 'Liberada. Sem sinal, a conclusão vai para a fila.'),
        findsOneWidget,
      );
      expect(_button(t, 'Concluir OS').onPressed, isNotNull);
    });

    testWidgets('GB7. entrega não verificada: o nó diz por quê, e concluir '
        'fica liberado com o aviso', (t) async {
      await _pump(t, 'naover', ap: AppAppearance.b);
      expect(_title(t), 'Atendimento');
      expect(_in(_noEntrega, 'Não verificada'), findsOneWidget);
      expect(_in(_noEntrega, _naoVerificada), findsOneWidget);
      expect(
        _bar(t).supportingText,
        'Sem sinal, a entrega não foi conferida. Se a OS tiver entrega, a '
        'conclusão só é aceita depois dela.',
      );
      expect(
        _in(_noConclusao, 'Liberada. Sem sinal, a entrega não foi conferida.'),
        findsOneWidget,
      );
      expect(_button(t, 'Concluir OS').onPressed, isNotNull);
    });

    testWidgets('GB8. entrega aguardando despacho: "Atualizar" no nó e a '
        'entrega não segura a OS', (t) async {
      await _pump(t, 'aguardando', ap: AppAppearance.b);
      expect(_in(_noEntrega, 'Aguardando despacho'), findsOneWidget);
      expect(_button(t, 'Atualizar', within: _noEntrega).onPressed, isNotNull);
      expect(
        _bar(t).supportingText,
        'A entrega aguarda a central e não impede concluir a OS.',
      );
      expect(_button(t, 'Concluir OS').onPressed, isNotNull);
    });

    testWidgets('GB9. OS antiga, sem entrega: conclui só com a coleta', (
      t,
    ) async {
      await _pump(t, 'sem', ap: AppAppearance.b);
      expect(_in(_noEntrega, 'Sem entrega'), findsOneWidget);
      expect(_bar(t).supportingText, 'Esta OS conclui só com a coleta.');
      expect(find.byKey(const Key('guincho-b-comparar')), findsNothing);
      expect(_button(t, 'Concluir OS').onPressed, isNotNull);
    });

    testWidgets('GB10. dados desatualizados: a faixa com "Atualizar", e a '
        'barra como na rota de entrega', (t) async {
      await _pump(t, 'desat', ap: AppAppearance.b);
      expect(
        find.byKey(const ValueKey('guincho-b-desatualizado')),
        findsOneWidget,
      );
      expect(find.text(_desatualizado), findsOneWidget);
      expect(_barButton(t), 'Abrir vistoria de entrega');
    });

    testWidgets('GB11. verificando com o servidor: a entrega é "Verificando", '
        'nunca "sem entrega"', (t) async {
      await _pump(t, 'verificando', ap: AppAppearance.b);
      expect(_in(_noEntrega, 'Verificando'), findsOneWidget);
      expect(
        _bar(t).supportingText,
        'Verificando com o servidor se esta OS tem vistoria de entrega.',
      );
    });

    testWidgets('GB12. carregando: o indicador da tela, sem a B nem a A', (
      t,
    ) async {
      await _pump(t, 'carregando', ap: AppAppearance.b, settle: false);
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      expect(find.byKey(_keyB), findsNothing);
      expect(find.byKey(_keyA), findsNothing);
    });

    testWidgets('GB13. erro ao carregar: a mensagem de hoje', (t) async {
      await _pump(t, 'erro', ap: AppAppearance.b);
      expect(find.text('Ordem de serviço não encontrada.'), findsOneWidget);
      expect(find.byKey(_keyB), findsNothing);
    });

    testWidgets('GB14. acesso não permitido: "Ação não permitida"', (t) async {
      await _pump(t, 'acesso', ap: AppAppearance.b);
      expect(find.byType(PermissionBlockedState), findsOneWidget);
      expect(find.text('Ação não permitida'), findsOneWidget);
      expect(find.byKey(_keyB), findsNothing);
    });

    testWidgets('GB15. "Mais ações" reúne Pausar, aprovação e exceção, e '
        'Pausar muda a situação', (t) async {
      await _pump(t, 'pronta', ap: AppAppearance.b);
      await t.tap(find.byKey(const Key('guincho-b-mais-acoes')));
      await t.pumpAndSettle();
      expect(find.text('Pausar'), findsOneWidget);
      expect(find.text('Solicitar aprovação'), findsOneWidget);
      expect(find.text('Registrar exceção'), findsOneWidget);
      final container = ProviderScope.containerOf(t.element(find.byKey(_keyB)));
      await t.tap(find.text('Pausar'));
      await t.pumpAndSettle();
      expect(find.text('Detalhe'), findsOneWidget);
      expect(
        container.read(workOrderRepositoryProvider).findById(guinchoWo)!.status,
        WorkOrderStatus.paused,
      );
    });
  });

  group('opção C — Coleta × Entrega lado a lado', () {
    testWidgets('GC1. coleta em andamento: "2/3" no cartão da coleta, a '
        'entrega "Abrir", e Concluir OS travado pela coleta', (t) async {
      await _pump(t, 'coleta', ap: AppAppearance.c);
      expect(_in(_cColeta, '2/3'), findsNothing); // é rich text
      expect(_inRich(_cColeta, '2/3'), findsOneWidget);
      expect(_in(_cColeta, 'Em andamento'), findsNWidgets(2));
      expect(_in(_cColeta, 'Continuar'), findsOneWidget);
      expect(_in(_cEntrega, 'Abrir'), findsOneWidget);
      expect(t.widget<MobilePhaseCard>(find.byKey(_cColeta)).current, isTrue);
      expect(
        _req(t, 'Vistoria de coleta').state,
        MobileRequirementState.pending,
      );
      expect(_button(t, 'Concluir OS').onPressed, isNull);
      expect(
        _inRich(
          _cConcluir,
          'Conclua a vistoria de coleta antes de concluir a OS.',
        ),
        findsOneWidget,
      );
    });

    testWidgets('GC2. Concluir OS desabilitado na rota de entrega, com o '
        'cartão de comparação ainda incompleto', (t) async {
      await _pump(t, 'rota', ap: AppAppearance.c);
      expect(_button(t, 'Concluir OS').onPressed, isNull);
      expect(
        _inRich(
          _cConcluir,
          'Conclua a vistoria de entrega antes de concluir a OS.',
        ),
        findsOneWidget,
      );
      expect(
        t.widget<Text>(find.byKey(_cComparar)).data,
        'Fica completa quando a entrega for concluída.',
      );
      expect(find.text('Vistoria de veículo leve'), findsOneWidget);
      expect(
        _req(t, 'Vistoria de entrega').state,
        MobileRequirementState.pending,
      );
    });

    testWidgets('GC3. entrega em andamento mostra o cartão com "Fica completa '
        'quando a entrega for concluída." e não roda a comparação', (t) async {
      await _pump(t, 'entrega', ap: AppAppearance.c);
      expect(_inRich(_cEntrega, '2/3'), findsOneWidget);
      expect(_in(_cEntrega, 'Continuar'), findsOneWidget);
      expect(
        t.widget<Text>(find.byKey(_cComparar)).data,
        'Fica completa quando a entrega for concluída.',
      );
    });

    testWidgets('GC4. entrega concluída: a prévia diz o que mudou, e '
        'Concluir OS fica liberado', (t) async {
      await _pump(t, 'pronta', ap: AppAppearance.c);
      expect(
        t.widget<Text>(find.byKey(_cComparar)).data,
        '2 itens mudaram: retrovisor esquerdo e para-choque traseiro.',
      );
      expect(_req(t, 'Vistoria de entrega').state, MobileRequirementState.met);
      expect(_req(t, 'Com sinal').state, MobileRequirementState.met);
      expect(_button(t, 'Concluir OS').onPressed, isNotNull);
      await t.tap(find.byKey(const Key('guincho-c-comparar')));
      await t.pumpAndSettle();
      expect(
        find.text(
          'Comparação /checklists/$guinchoCl/comparison?workOrderId='
          '$guinchoWo',
        ),
        findsOneWidget,
      );
    });

    testWidgets('GC5. entrega em andamento sem sinal: "Salvas no aparelho" e '
        'o requisito de sinal na fila', (t) async {
      await _pump(t, 'entrega-off', ap: AppAppearance.c);
      expect(find.byKey(const ValueKey('guincho-c-sem-conexao')), findsOne);
      expect(_inRich(_cEntrega, 'Salvas no aparelho'), findsOneWidget);
      final net = _req(t, 'Sem sinal');
      expect(net.state, MobileRequirementState.queued);
      expect(
        net.text,
        'Sem sinal: o que você fizer fica no aparelho e vai quando o sinal '
        'voltar',
      );
    });

    testWidgets('GC6. entrega concluída sem sinal: "na fila" e a entrega vai '
        'primeiro', (t) async {
      await _pump(t, 'pronta-off', ap: AppAppearance.c);
      expect(_inRich(_cEntrega, 'na fila'), findsOneWidget);
      expect(
        _req(t, 'Sem sinal').text,
        'Sem sinal: a entrega e a conclusão ficam na fila; a entrega vai '
        'primeiro e a OS conclui logo depois',
      );
      expect(_button(t, 'Concluir OS').onPressed, isNotNull);
    });

    testWidgets('GC7. entrega não verificada: a frase no cartão, o requisito '
        'informativo e Concluir OS liberado', (t) async {
      await _pump(t, 'naover', ap: AppAppearance.c);
      expect(_in(_cEntrega, _naoVerificada), findsOneWidget);
      final r = _req(t, 'Vistoria de entrega');
      expect(r.state, MobileRequirementState.info);
      expect(r.text, contains('não verificada sem sinal'));
      expect(_button(t, 'Concluir OS').onPressed, isNotNull);
    });

    testWidgets('GC8. aguardando despacho: "Atualizar" no cartão e o '
        'requisito não exigido por enquanto', (t) async {
      await _pump(t, 'aguardando', ap: AppAppearance.c);
      expect(_in(_cEntrega, 'Aguardando despacho'), findsOneWidget);
      expect(_button(t, 'Atualizar', within: _cEntrega).onPressed, isNotNull);
      expect(
        _req(t, 'Vistoria de entrega').text,
        'Vistoria de entrega: aguardando despacho, não exigida por enquanto',
      );
    });

    testWidgets('GC9. OS antiga, sem entrega: o requisito "não exigida nesta '
        'OS" e sem cartão de comparação', (t) async {
      await _pump(t, 'sem', ap: AppAppearance.c);
      expect(
        _req(t, 'Vistoria de entrega').text,
        'Vistoria de entrega: não exigida nesta OS',
      );
      expect(find.byKey(const Key('guincho-c-comparar')), findsNothing);
      expect(_button(t, 'Concluir OS').onPressed, isNotNull);
    });

    testWidgets('GC10. dados desatualizados: a faixa com "Atualizar"', (
      t,
    ) async {
      await _pump(t, 'desat', ap: AppAppearance.c);
      expect(
        find.byKey(const ValueKey('guincho-c-desatualizado')),
        findsOneWidget,
      );
      expect(find.text(_desatualizado), findsOneWidget);
      expect(_button(t, 'Concluir OS').onPressed, isNull);
    });

    testWidgets('GC11. verificando: o requisito diz que o aparelho pergunta ao '
        'servidor', (t) async {
      await _pump(t, 'verificando', ap: AppAppearance.c);
      expect(_in(_cEntrega, 'Verificando'), findsOneWidget);
      expect(
        _req(t, 'Vistoria de entrega').text,
        'Vistoria de entrega: verificando com o servidor',
      );
    });

    testWidgets('GC12. carregando: o indicador da tela, sem a C nem a A', (
      t,
    ) async {
      await _pump(t, 'carregando', ap: AppAppearance.c, settle: false);
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      expect(find.byKey(_keyC), findsNothing);
      expect(find.byKey(_keyA), findsNothing);
    });

    testWidgets('GC13. erro ao carregar: a mensagem de hoje', (t) async {
      await _pump(t, 'erro', ap: AppAppearance.c);
      expect(find.text('Ordem de serviço não encontrada.'), findsOneWidget);
      expect(find.byKey(_keyC), findsNothing);
    });

    testWidgets('GC14. acesso não permitido: "Ação não permitida"', (t) async {
      await _pump(t, 'acesso', ap: AppAppearance.c);
      expect(find.text('Ação não permitida'), findsOneWidget);
      expect(find.byKey(_keyC), findsNothing);
    });

    testWidgets('GC15. "Próxima ação" com as mudanças de situação de hoje, e '
        'concluir leva ao detalhe', (t) async {
      await _pump(t, 'pronta', ap: AppAppearance.c);
      for (final s in [
        WorkOrderStatus.paused,
        WorkOrderStatus.pendingApproval,
        WorkOrderStatus.exception,
      ]) {
        expect(
          find.byKey(ValueKey('guincho-transicao-${s.name}')),
          findsOneWidget,
        );
      }
      final container = ProviderScope.containerOf(t.element(find.byKey(_keyC)));
      await t.tap(find.text('Concluir OS'));
      await t.pumpAndSettle();
      expect(find.text('Detalhe'), findsOneWidget);
      expect(
        container.read(workOrderRepositoryProvider).findById(guinchoWo)!.status,
        WorkOrderStatus.completed,
      );
    });
  });

  group('regras que não mudam com a aparência', () {
    testWidgets('GX1. modelos diferentes não mostram o cartão (C) nem a '
        'linha de comparação (B)', (t) async {
      final cenario = GuinchoCenario(
        runs: [
          guinchoColeta(),
          guinchoEntrega(n: 3, done: true, checklistId: guinchoClOutro),
        ],
      );
      await _pump(t, 'pronta', ap: AppAppearance.c, cenario: cenario);
      expect(find.byKey(const Key('guincho-c-comparar')), findsNothing);
      expect(_button(t, 'Concluir OS').onPressed, isNotNull);
      await _pump(t, 'pronta', ap: AppAppearance.b, cenario: cenario);
      expect(find.byKey(_keyB), findsOneWidget);
      expect(find.byKey(const Key('guincho-b-comparar')), findsNothing);
      expect(find.text('Mesmo modelo'), findsNothing);
    });

    testWidgets('GX2. modelo fora do cache: o cartão fica, a prévia sai, e '
        'nada quebra', (t) async {
      await _pump(
        t,
        'pronta',
        ap: AppAppearance.c,
        cenario: GuinchoCenario(
          runs: [guinchoColeta(), guinchoEntrega(n: 3, done: true)],
          schemaCached: false,
        ),
      );
      expect(
        t.widget<Text>(find.byKey(_cComparar)).data,
        'As duas vistorias concluídas: veja o que mudou.',
      );
      expect(find.byKey(_cColeta), findsOneWidget);
      expect(t.takeException(), isNull);
    });

    testWidgets('GX3. passo concluído em #059669 e o título dos cartões da A '
        'em #0F172A (P-APP-TEMA-SUCESSO-TERTIARY)', (t) async {
      await _pump(t, 'rota');
      final circle = t.widget<Container>(
        find
            .descendant(
              of: find.byKey(const Key('wo-step-0')),
              matching: find.byType(Container),
            )
            .first,
      );
      expect(
        (circle.decoration! as BoxDecoration).color,
        ErpMobileTheme.success,
      );
      final label = t.widget<Text>(
        find.descendant(
          of: find.byKey(const Key('wo-step-0')),
          matching: find.byType(Text),
        ),
      );
      expect(label.style?.color, ErpMobileTheme.success);
      final title = t.renderObject<RenderParagraph>(
        find.descendant(of: find.byKey(_keyA), matching: find.text('Entrega')),
      );
      expect(title.text.style?.color, ErpMobileTheme.ink);
      expect(find.byType(WorkOrderStepper), findsOneWidget);
    });

    testWidgets('GX4. a B mostra os passos presos no topo e o cartão da OS', (
      t,
    ) async {
      await _pump(t, 'rota', ap: AppAppearance.b);
      expect(
        find.descendant(
          of: find.byKey(const Key('guincho-b-passos')),
          matching: find.byType(WorkOrderStepper),
        ),
        findsOneWidget,
      );
      final card = find.byKey(const Key('guincho-b-cartao-os'));
      expect(
        find.descendant(of: card, matching: find.text('OS-2891')),
        findsOne,
      );
      expect(
        find.descendant(of: card, matching: find.text('Guincho')),
        findsOne,
      );
      expect(
        find.descendant(of: card, matching: find.text('Indústria Alfa Ltda')),
        findsOne,
      );
      expect(
        find.descendant(
          of: card,
          matching: find.text('Av. Afonso Pena, 2000 — Centro, Belo Horizonte'),
        ),
        findsOne,
      );
      expect(find.text('Mesmo modelo'), findsOneWidget);
    });

    testWidgets('GX5. leitor de tela: os nós dizem o estado, e os botões '
        'curtos da C têm o nome inteiro', (t) async {
      final handle = t.ensureSemantics();
      await _pump(t, 'rota', ap: AppAppearance.b);
      expect(
        find.bySemanticsLabel(RegExp('Vistoria de coleta, concluída')),
        findsOne,
      );
      expect(
        find.bySemanticsLabel(RegExp('Vistoria de entrega, atual')),
        findsOne,
      );
      expect(
        find.bySemanticsLabel(RegExp('Conclusão da OS, pendente')),
        findsOne,
      );
      await _pump(t, 'rota', ap: AppAppearance.c);
      expect(find.byKey(_keyC), findsOneWidget);
      expect(find.bySemanticsLabel(RegExp('Ver vistoria de coleta')), findsOne);
      expect(
        find.bySemanticsLabel(RegExp('Abrir vistoria de entrega')),
        findsOne,
      );
      expect(
        t.getSemantics(find.byKey(_cConcluir)).label,
        contains('Vistoria de entrega concluída (falta)'),
      );
      handle.dispose();
    });

    for (final ap in [AppAppearance.b, AppAppearance.c]) {
      testWidgets('GX6-${ap.letter}. toque de 48 px e rótulo em todo alvo, a '
          '390 × 812', (t) async {
        final handle = t.ensureSemantics();
        for (final estado in ['rota', 'pronta']) {
          await _pump(t, estado, ap: ap, size: const Size(390, 812));
          expect(
            find.byKey(ap == AppAppearance.b ? _keyB : _keyC),
            findsOneWidget,
          );
          await expectLater(t, meetsGuideline(androidTapTargetGuideline));
          await expectLater(t, meetsGuideline(labeledTapTargetGuideline));
        }
        handle.dispose();
      });
    }

    testWidgets('GX7. o registro tem a execução do guincho com os nomes da '
        'maquete', (t) async {
      final screen = appAppearanceScreens.firstWhere(
        (s) => s.key == kExecucaoGuinchoAppearanceKey,
      );
      expect(kExecucaoGuinchoAppearanceKey, 'execucao-guincho');
      expect(screen.label, 'Execução do guincho');
      expect(screen.options.map((o) => o.label), [
        'Fiel à tela de hoje',
        'Guiada por fases',
        'Coleta × Entrega lado a lado',
      ]);
      expect(defaultAppAppearanceFor(screen.key), AppAppearance.a);
    });

    testWidgets('GX8. no Perfil, escolher C para a execução do guincho grava '
        'C nesta pessoa e organização', (t) async {
      fixarTela(t, const Size(800, 3000));
      final world = AparWorld();
      await t.pumpWidget(aparApp(world, initial: '/profile'));
      await t.pumpAndSettle();
      const row = Key('aparencia-tela-$kExecucaoGuinchoAppearanceKey');
      expect(
        t.widget<MobileExpandableRow>(find.byKey(row)).meta,
        ' · A · Fiel à tela de hoje',
      );
      await t.tap(find.byKey(row));
      await t.pumpAndSettle();
      await t.tap(
        find.byKey(
          const Key('aparencia-opcao-$kExecucaoGuinchoAppearanceKey-C'),
        ),
      );
      await t.pumpAndSettle();
      expect(await world.appearanceStore.read(aparOwner), {
        kExecucaoGuinchoAppearanceKey: AppAppearance.c,
      });
      expect(
        t.widget<MobileExpandableRow>(find.byKey(row)).meta,
        ' · C · Coleta × Entrega lado a lado',
      );
    });
  });

  group('kit', () {
    testWidgets('GK1. a barra fixa sem texto de apoio desenha como antes; com '
        'ele, o texto vem acima das ações', (t) async {
      Widget bar({String? text}) => MaterialApp(
        home: Scaffold(
          body: MobileStickyBar(
            supportingText: text,
            children: [
              Expanded(
                child: FilledButton(onPressed: () {}, child: const Text('Ir')),
              ),
            ],
          ),
        ),
      );
      await t.pumpWidget(bar());
      expect(find.byType(Text), findsOneWidget);
      expect(
        find.descendant(
          of: find.byType(MobileStickyBar),
          matching: find.byType(Column),
        ),
        findsNothing,
      );
      await t.pumpWidget(bar(text: 'Leve o veículo.'));
      expect(
        t.getRect(find.text('Leve o veículo.')).bottom,
        lessThanOrEqualTo(t.getRect(find.text('Ir')).top),
      );
    });

    testWidgets('GK2. as peças novas passam no contraste AA, isoladas', (
      t,
    ) async {
      final handle = t.ensureSemantics();
      await t.pumpWidget(
        MaterialApp(
          theme: ErpMobileTheme.light(),
          home: Scaffold(
            body: ListView(
              children: [
                const MobilePhaseTimeline(
                  title: 'Vistorias do guincho',
                  nodes: [
                    MobilePhaseNode(
                      title: 'Vistoria de coleta',
                      state: MobilePhaseState.done,
                      marker: Icons.check,
                      meta: 'Vistoria de veículo leve · 3 de 3 obrigatórios',
                    ),
                    MobilePhaseNode(
                      title: 'Vistoria de entrega',
                      state: MobilePhaseState.todo,
                      marker: Icons.local_shipping_outlined,
                      meta: 'Não iniciada',
                    ),
                  ],
                ),
                Row(
                  children: [
                    Expanded(
                      child: MobilePhaseCard(
                        label: 'Coleta',
                        statusLabel: 'Pronta',
                        statusTone: PillTone.info,
                        value: '3/3',
                        valueSuffix: 'obrigatórios',
                        progress: 1,
                        meta: 'Concluída',
                        metaEmphasis: 'na fila',
                        actionLabel: 'Ver',
                        actionSemanticLabel: 'Ver vistoria de coleta',
                        onAction: () {},
                      ),
                    ),
                  ],
                ),
                const MobileRequirementList(
                  items: [
                    MobileRequirement(MobileRequirementState.met, 'Feito'),
                    MobileRequirement(MobileRequirementState.pending, 'Falta'),
                    MobileRequirement(MobileRequirementState.unmet, 'Não'),
                    MobileRequirement(MobileRequirementState.info, 'Informa'),
                    MobileRequirement(MobileRequirementState.queued, 'Fila'),
                  ],
                ),
                MobileStickyBar(
                  supportingText: 'Conclua a vistoria de entrega.',
                  supportingTextColor: ErpMobileTheme.warningInk,
                  children: [
                    Expanded(
                      child: FilledButton(
                        onPressed: () {},
                        child: const Text('Abrir'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      );
      await expectLater(t, meetsGuideline(textContrastGuideline));
      handle.dispose();
    });
  });
}
