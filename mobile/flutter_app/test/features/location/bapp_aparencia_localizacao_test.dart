// B-APP-APARENCIA (F1) — a tela de localização nas aparências B e C
// (`localizacao-consentimento-3opcoes.reference.html`; plano §2.1, Emendas 1 a
// 3). Os 14 estados da maquete têm par na B e na C; as chaves que os testes da
// A prendem existem nas três, com o mesmo efeito.
import 'dart:async';

import 'package:erp_techsolutions_mobile/core/appearance/app_appearance.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/location/location_consent_store.dart';
import 'package:erp_techsolutions_mobile/features/location/ui/location_consent_screen.dart';
import 'package:erp_techsolutions_mobile/shared/theme/erp_mobile_theme.dart';
import 'package:erp_techsolutions_mobile/shared/ui/mobile_kit.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../capturas/captura_helper.dart';

const _key = kLocationConsentAppearanceKey;
const _rootA = Key('consent-organization-card'); // só a A tem este cartão
const _rootB = Key('aparencia-localizacao-consentimento-B');
const _rootC = Key('aparencia-localizacao-consentimento-C');

Future<AparWorld> _pump(
  WidgetTester t,
  AppAppearance appearance, {
  String state = 'nao-decidiu',
  bool send = true,
  bool gps = true,
}) async {
  final w = AparWorld(
    consent: FixedConsentStore(consentState(state)),
    prefs: {_key: appearance},
  );
  await t.pumpWidget(aparApp(w, send: send, gps: gps));
  await t.pumpAndSettle();
  return w;
}

void _expectOnly(Key root) {
  for (final k in [_rootA, _rootB, _rootC]) {
    expect(
      find.byKey(k),
      k == root ? findsOneWidget : findsNothing,
      reason: 'só $root na tela',
    );
  }
}

String _bannerText(WidgetTester t, String key) {
  final texts = t
      .widgetList<Text>(
        find.descendant(of: find.byKey(Key(key)), matching: find.byType(Text)),
      )
      .map((w) => w.data ?? '')
      .join(' ');
  return texts;
}

String _tileValue(WidgetTester t, String key) =>
    t.widget<MobileStatTile>(find.byKey(Key(key))).value;

void main() {
  group('despacho', () {
    for (final ap in AppAppearance.values) {
      testWidgets('D${ap.letter}. preferência ${ap.letter} mostra a vista '
          '${ap.letter}', (t) async {
        await _pump(t, ap);
        _expectOnly(switch (ap) {
          AppAppearance.a => _rootA,
          AppAppearance.b => _rootB,
          AppAppearance.c => _rootC,
        });
      });
    }

    testWidgets('D4. com sessão autenticada e o bootstrap recarregando, a tela '
        'mostra o carregamento e nunca desenha a A antes da B', (t) async {
      final w = AparWorld(prefs: {_key: AppAppearance.b});
      final bootstrap = Completer<BootstrapSession>();
      await t.pumpWidget(aparApp(w, bootstrap: bootstrap.future));
      await t.pump();
      await t.pump(const Duration(milliseconds: 50));
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      _expectOnly(const Key('nenhuma'));
      bootstrap.complete(aparSession());
      await t.pumpAndSettle();
      _expectOnly(_rootB);
    });

    testWidgets('D5. sem sessão autenticada (sessão carregando), a tela '
        'desenha a A', (t) async {
      final w = AparWorld(prefs: {_key: AppAppearance.c});
      await t.pumpWidget(
        aparApp(
          w,
          authenticated: false,
          bootstrap: Completer<BootstrapSession>().future,
        ),
      );
      await t.pumpAndSettle();
      _expectOnly(_rootA);
    });

    testWidgets('D6. keystore que não responde: em até 3 s a tela sai do '
        'carregamento na A', (t) async {
      final w = AparWorld(appearanceStore: PendingAppAppearanceStore());
      await t.pumpWidget(aparApp(w));
      await t.pump();
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      await t.pump(const Duration(milliseconds: 2900));
      expect(find.byKey(_rootA), findsNothing);
      await t.pump(const Duration(milliseconds: 150));
      await t.pump();
      _expectOnly(_rootA);
    });

    testWidgets('D7. keystore que não responde e a tela fechada antes do teto: '
        'nenhum Timer fica pendente', (t) async {
      final w = AparWorld(appearanceStore: PendingAppAppearanceStore());
      await t.pumpWidget(aparApp(w));
      await t.pump(const Duration(milliseconds: 500));
      await t.pumpWidget(const SizedBox());
      // O fim do teste confere que nenhum Timer ficou pendente.
    });
  });

  group('B, "Como o protótipo"', () {
    testWidgets('B1. sem decisão: apresentação, 3 blocos, ações antes da '
        'lista, check nas 4 linhas', (t) async {
      await _pump(t, AppAppearance.b);
      expect(find.byType(MobileIntroHeader), findsOneWidget);
      expect(find.byType(MobileStatusBlock), findsNWidgets(3));
      expect(find.byKey(const Key('consent-accept')), findsOneWidget);
      expect(find.byKey(const Key('consent-decline')), findsOneWidget);
      expect(
        t.getRect(find.byKey(const Key('consent-decline'))).top,
        lessThan(t.getRect(find.byKey(const Key('consent-row-uso'))).top),
      );
      for (final id in ['uso', 'quando', 'fechado', 'mudar']) {
        expect(find.byKey(Key('consent-row-check-$id')), findsOneWidget);
      }
      expect(find.byKey(const Key('consent-row-check-registro')), findsNothing);
      expect(find.text('Privacidade · Localização'), findsOneWidget);
    });

    testWidgets('B2. confirme de novo: a faixa de atenção com o texto', (
      t,
    ) async {
      await _pump(t, AppAppearance.b, state: 'confirme');
      expect(
        _bannerText(t, 'consent-b-reconfirm-banner'),
        contains('Confirme de novo: a sua organização não registrou'),
      );
      expect(find.byKey(const Key('consent-decline')), findsOneWidget);
    });

    testWidgets('B3. concedido e registrado: cartão verde, 2 blocos, faixa, '
        'check nas 4 linhas e Revogar vermelho no fim', (t) async {
      await _pump(t, AppAppearance.b, state: 'concedido');
      final card = t.widget<MobileStatusCard>(
        find.byKey(const Key('consent-status-card')),
      );
      expect(card.success, isTrue);
      expect(card.title, 'Consentimento concedido');
      expect(find.byType(MobileStatusBlock), findsNWidgets(2));
      expect(
        _bannerText(t, 'consent-b-organization-banner'),
        contains('Registrado na sua organização em'),
      );
      for (final id in ['uso', 'quando', 'fechado', 'mudar']) {
        expect(find.byKey(Key('consent-row-check-$id')), findsOneWidget);
      }
      expect(
        t.widget(find.byKey(const Key('consent-revoke'))),
        isA<MobileDangerOutlineButton>(),
      );
      expect(
        t.getRect(find.byKey(const Key('consent-revoke'))).top,
        greaterThan(t.getRect(find.byKey(const Key('consent-row-gps'))).top),
      );
    });

    for (final (state, short) in [
      ('aguardando', 'Aguardando conexão'),
      ('sem-cadastro', 'Sem cadastro'),
      ('erro', 'Aguardando conexão'),
    ]) {
      testWidgets('B-$state. concedido sem registro: cartão verde e o bloco da '
          'organização "$short"', (t) async {
        await _pump(t, AppAppearance.b, state: state);
        expect(
          t
              .widget<MobileStatusCard>(
                find.byKey(const Key('consent-status-card')),
              )
              .success,
          isTrue,
        );
        expect(
          t
              .widget<MobileStatusBlock>(
                find.byKey(const Key('consent-b-block-organization')),
              )
              .value,
          short,
        );
      });
    }

    for (final (state, subtitle) in [
      ('revogado', 'Revogado. Nada é capturado.'),
      ('revogado-aguardando', 'Revogado. Nada é capturado.'),
      ('nao-permitido', 'Não permitido. Nada é capturado.'),
    ]) {
      testWidgets('B-$state. o cartão é o neutro, nunca verde, e só Permitir', (
        t,
      ) async {
        await _pump(t, AppAppearance.b, state: state);
        final card = t.widget<MobileStatusCard>(
          find.byKey(const Key('consent-status-card')),
        );
        expect(card.success, isFalse);
        expect(card.subtitle, subtitle);
        expect(find.byKey(const Key('consent-accept')), findsOneWidget);
        expect(find.byKey(const Key('consent-decline')), findsNothing);
        expect(find.byKey(const Key('consent-revoke')), findsNothing);
      });
    }

    testWidgets('B-desatualizado. a data antiga é o aviso', (t) async {
      await _pump(t, AppAppearance.b, state: 'desatualizado');
      expect(
        _bannerText(t, 'consent-b-organization-banner'),
        contains('em 10/11'),
      );
    });

    testWidgets('B-gps-off. o bloco do GPS diz Indisponível', (t) async {
      await _pump(t, AppAppearance.b, state: 'gps-off', gps: false);
      final block = t.widget<MobileStatusBlock>(
        find.byKey(const Key('consent-b-block-gps')),
      );
      expect(block.value, 'Indisponível');
      expect(block.tone, PillTone.danger);
    });

    testWidgets('B-bloqueado. acesso não permitido, sem ações', (t) async {
      await _pump(t, AppAppearance.b, send: false);
      expect(find.text('Acesso não permitido'), findsOneWidget);
      expect(find.byKey(const Key('consent-accept')), findsNothing);
      expect(find.byKey(const Key('consent-revoke')), findsNothing);
      expect(find.byKey(_rootB), findsOneWidget);
    });

    testWidgets('B-bloqueado-com. com consentimento, o Revogar continua, '
        'vermelho', (t) async {
      await _pump(t, AppAppearance.b, state: 'concedido', send: false);
      expect(find.text('Acesso não permitido'), findsOneWidget);
      expect(
        t.widget(find.byKey(const Key('consent-revoke'))),
        isA<MobileDangerOutlineButton>(),
      );
    });

    testWidgets('B-carregando. a decisão carregando mostra o indicador', (
      t,
    ) async {
      final w = AparWorld(
        consent: _NeverStore(),
        prefs: {_key: AppAppearance.b},
      );
      await t.pumpWidget(aparApp(w));
      await t.pump(const Duration(milliseconds: 100));
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      expect(find.byKey(_rootB), findsNothing);
      // O título da B é um só, também carregando (a A diria "Localização em
      // campo" enquanto não há decisão).
      expect(find.text('Privacidade · Localização'), findsOneWidget);
    });

    testWidgets('B-ação. Permitir vai à organização e a tela vira concedido', (
      t,
    ) async {
      final w = AparWorld.live(prefs: {_key: AppAppearance.b});
      await t.pumpWidget(aparApp(w));
      await t.pumpAndSettle();
      await t.tap(find.byKey(const Key('consent-accept')));
      await t.pumpAndSettle();
      expect(w.api.calls, ['grant']);
      expect(find.byKey(const Key('consent-revoke')), findsOneWidget);
      await t.ensureVisible(find.byKey(const Key('consent-revoke')));
      await t.pumpAndSettle();
      await t.tap(find.byKey(const Key('consent-revoke')));
      await t.pumpAndSettle();
      expect(w.api.calls, ['grant', 'revoke']);
      expect(find.byKey(const Key('consent-accept')), findsOneWidget);
    });
  });

  group('C, "Resumo e ações fixas"', () {
    testWidgets('C1. sem decisão: faixa da decisão, 3 blocos, Permitir e '
        'Agora não na barra fixa', (t) async {
      await _pump(t, AppAppearance.c);
      expect(find.byType(MobileStatTile), findsNWidgets(3));
      expect(_tileValue(t, 'consent-c-block-capture'), 'Desligada');
      final sticky = find.byKey(const Key('consent-c-sticky'));
      expect(
        find.descendant(
          of: sticky,
          matching: find.byKey(const Key('consent-accept')),
        ),
        findsOneWidget,
      );
      expect(
        find.descendant(
          of: sticky,
          matching: find.byKey(const Key('consent-decline')),
        ),
        findsOneWidget,
      );
      expect(find.text('Localização em campo'), findsOneWidget);
    });

    testWidgets('C2. confirme de novo: a faixa da organização com o texto', (
      t,
    ) async {
      await _pump(t, AppAppearance.c, state: 'confirme');
      expect(
        _bannerText(t, 'consent-c-organization-banner'),
        contains('Confirme de novo'),
      );
    });

    testWidgets('C3. concedido e registrado: Captura "Com o app aberto" e '
        'Revogar vermelho na barra', (t) async {
      await _pump(t, AppAppearance.c, state: 'concedido');
      expect(_tileValue(t, 'consent-c-block-capture'), 'Com o app aberto');
      expect(_tileValue(t, 'consent-c-block-organization'), 'Registrado');
      expect(
        t.widget(find.byKey(const Key('consent-revoke'))),
        isA<MobileDangerOutlineButton>(),
      );
    });

    testWidgets('C4. concedido e pendente mostra "Só no aparelho", e o '
        'detalhe da Captura explica', (t) async {
      await _pump(t, AppAppearance.c, state: 'aguardando');
      expect(_tileValue(t, 'consent-c-block-capture'), 'Só no aparelho');
      await t.tap(find.byKey(const Key('consent-c-block-capture')));
      await t.pumpAndSettle();
      expect(find.text(locationCaptureDeviceOnlyDetailForTest), findsOneWidget);
      expect(
        t
            .widget<MobileStatTile>(
              find.byKey(const Key('consent-c-block-capture')),
            )
            .selected,
        isTrue,
      );
    });

    for (final state in ['sem-cadastro', 'erro']) {
      testWidgets('C-$state. concedido sem registro: "Só no aparelho"', (
        t,
      ) async {
        await _pump(t, AppAppearance.c, state: state);
        expect(_tileValue(t, 'consent-c-block-capture'), 'Só no aparelho');
      });
    }

    for (final state in ['revogado', 'revogado-aguardando', 'nao-permitido']) {
      testWidgets('C-$state. sem consentimento: Captura Desligada e só '
          'Permitir', (t) async {
        await _pump(t, AppAppearance.c, state: state);
        expect(_tileValue(t, 'consent-c-block-capture'), 'Desligada');
        expect(find.byKey(const Key('consent-accept')), findsOneWidget);
        expect(find.byKey(const Key('consent-decline')), findsNothing);
      });
    }

    testWidgets('C-desatualizado. a data antiga é o aviso', (t) async {
      await _pump(t, AppAppearance.c, state: 'desatualizado');
      expect(
        _bannerText(t, 'consent-c-organization-banner'),
        contains('em 10/11'),
      );
    });

    testWidgets('C-gps-off. GPS Indisponível e Captura Desligada', (t) async {
      await _pump(t, AppAppearance.c, state: 'gps-off', gps: false);
      expect(_tileValue(t, 'consent-c-block-gps'), 'Indisponível');
      expect(_tileValue(t, 'consent-c-block-capture'), 'Desligada');
    });

    testWidgets('C-bloqueado. acesso não permitido, sem ações', (t) async {
      await _pump(t, AppAppearance.c, send: false);
      expect(find.text('Acesso não permitido'), findsOneWidget);
      expect(find.byKey(_rootC), findsOneWidget);
      expect(find.byKey(const Key('consent-accept')), findsNothing);
    });

    testWidgets('C-bloqueado-com. com consentimento, o Revogar continua, '
        'vermelho', (t) async {
      await _pump(t, AppAppearance.c, state: 'concedido', send: false);
      expect(
        t.widget(find.byKey(const Key('consent-revoke'))),
        isA<MobileDangerOutlineButton>(),
      );
    });

    testWidgets('C-carregando. a decisão carregando mostra o indicador', (
      t,
    ) async {
      final w = AparWorld(
        consent: _NeverStore(),
        prefs: {_key: AppAppearance.c},
      );
      await t.pumpWidget(aparApp(w));
      await t.pump(const Duration(milliseconds: 100));
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      expect(find.byKey(_rootC), findsNothing);
      // A C segue o título da A (sem decisão: "Localização em campo").
      expect(find.text('Localização em campo'), findsOneWidget);
    });

    testWidgets('C-bloco. tocar num bloco abre a linha dele, marcado', (
      t,
    ) async {
      await _pump(t, AppAppearance.c, state: 'concedido');
      await t.tap(find.byKey(const Key('consent-c-block-gps')));
      await t.pumpAndSettle();
      expect(
        t
            .widget<MobileExpandableRow>(
              find.byKey(const Key('consent-row-gps')),
            )
            .expanded,
        isTrue,
      );
      expect(
        t
            .widget<MobileStatTile>(
              find.byKey(const Key('consent-c-block-gps')),
            )
            .selected,
        isTrue,
      );
    });

    testWidgets('C-ação. Agora não vai à organização como "não"', (t) async {
      final w = AparWorld.live(prefs: {_key: AppAppearance.c});
      await t.pumpWidget(aparApp(w));
      await t.pumpAndSettle();
      await t.tap(find.byKey(const Key('consent-decline')));
      await t.pumpAndSettle();
      expect(w.api.calls, ['revoke']);
      expect(_tileValue(t, 'consent-c-block-capture'), 'Desligada');
    });
  });

  group('W11 e a11y (com a Roboto)', () {
    setUpAll(loadRoboto);
    for (final size in const [Size(390, 812), Size(360, 740)]) {
      for (final ap in [AppAppearance.b, AppAppearance.c]) {
        for (final state in ['nao-decidiu', 'confirme']) {
          testWidgets('W11-${ap.letter} ${size.width.toInt()}×'
              '${size.height.toInt()} $state: Agora não inteiro sem rolar', (
            t,
          ) async {
            fixarTela(t, size);
            await _pump(t, ap, state: state);
            final screen = t.getRect(find.byType(LocationConsentScreen));
            final nav = t.getRect(find.byType(MobileBottomNav));
            for (final key in const ['consent-accept', 'consent-decline']) {
              final rect = t.getRect(find.byKey(Key(key)));
              expect(
                rect.top >= screen.top && rect.bottom <= nav.top,
                isTrue,
                reason: 'W11: $key inteiro na área visível ($rect, nav $nav)',
              );
            }
          });
        }
      }
    }

    for (final ap in [AppAppearance.b, AppAppearance.c]) {
      for (final state in ['nao-decidiu', 'concedido']) {
        testWidgets('A11Y-${ap.letter} $state: alvos de 48 px e rótulos', (
          t,
        ) async {
          fixarTela(t, const Size(390, 812));
          final handle = t.ensureSemantics();
          await _pump(t, ap, state: state);
          await expectLater(t, meetsGuideline(androidTapTargetGuideline));
          await expectLater(t, meetsGuideline(labeledTapTargetGuideline));
          handle.dispose();
        });
      }
    }
  });

  // Conferência visual do orquestrador (conf-visual-583-orq.md, CV-1 a CV-6):
  // cada ajuste preso por um teste novo.
  group('conferência visual', () {
    testWidgets('CV-1. B sem decisão: "SUA DECISÃO" diz "Consentimento '
        'pendente", sem bolinha', (t) async {
      await _pump(t, AppAppearance.b);
      final block = find.byKey(const Key('consent-status-card'));
      expect(
        t.widget<MobileStatusBlock>(block).value,
        'Consentimento pendente',
      );
      expect(
        find.descendant(
          of: block,
          matching: find.byKey(const Key('mobile-status-block-dot')),
        ),
        findsNothing,
      );
      expect(
        find.descendant(
          of: find.byKey(const Key('consent-b-block-gps')),
          matching: find.byKey(const Key('mobile-status-block-dot')),
        ),
        findsOneWidget,
      );
    });

    group('com a Roboto', () {
      setUpAll(loadRoboto);
      for (final size in const [Size(390, 812), Size(360, 740)]) {
        testWidgets('CV-1b. B sem decisão a ${size.width.toInt()}: '
            '"Consentimento" inteiro numa linha (nunca quebra no meio)', (
          t,
        ) async {
          fixarTela(t, size);
          await _pump(t, AppAppearance.b);
          final paragraph = t.renderObject<RenderParagraph>(
            find.text('Consentimento pendente'),
          );
          // O começo e o fim da palavra ficam na mesma linha.
          final start = paragraph.getOffsetForCaret(
            const TextPosition(offset: 0),
            Rect.zero,
          );
          final end = paragraph.getOffsetForCaret(
            const TextPosition(
              offset: 'Consentimento'.length,
              affinity: TextAffinity.upstream,
            ),
            Rect.zero,
          );
          expect(end.dy, start.dy);
        });
      }
    });

    testWidgets('CV-2. B: "Agora não" neutro (texto escuro, borda clara)', (
      t,
    ) async {
      await _pump(t, AppAppearance.b);
      final style = t
          .widget<OutlinedButton>(find.byKey(const Key('consent-decline')))
          .style;
      expect(style?.foregroundColor?.resolve({}), ErpMobileTheme.ink);
      expect(style?.side?.resolve({})?.color, ErpMobileTheme.cardBorder);
    });

    testWidgets('CV-2c. C: "Agora não" continua no azul do tema', (t) async {
      await _pump(t, AppAppearance.c);
      final style = t
          .widget<OutlinedButton>(find.byKey(const Key('consent-decline')))
          .style;
      expect(style?.foregroundColor, isNull);
    });

    testWidgets('CV-3. B: a lista usa o ✓ simples, neutro', (t) async {
      await _pump(t, AppAppearance.b);
      for (final id in ['uso', 'quando', 'fechado', 'mudar']) {
        final icon = t.widget<Icon>(find.byKey(Key('consent-row-check-$id')));
        expect(icon.icon, Icons.check);
        expect(icon.color, ErpMobileTheme.ink);
      }
    });

    testWidgets('CV-4. B concedido: a faixa "Registrado…" no verde-claro de '
        'sucesso', (t) async {
      await _pump(t, AppAppearance.b, state: 'concedido');
      final box = t
          .widgetList<Container>(
            find.descendant(
              of: find.byKey(const Key('consent-b-organization-banner')),
              matching: find.byType(Container),
            ),
          )
          .first;
      final deco = box.decoration! as BoxDecoration;
      expect(deco.color, const Color(0xFFECFDF5));
      expect((deco.border! as Border).top.color, const Color(0xFFA7F3D0));
    });

    for (final ap in [AppAppearance.a, AppAppearance.c]) {
      testWidgets('CV-5${ap.letter}. "Com o app fechado, nada" com o ícone ⊘', (
        t,
      ) async {
        await _pump(t, ap);
        final icon = t
            .widgetList<Icon>(
              find.descendant(
                of: find.byKey(const Key('consent-row-fechado')),
                matching: find.byType(Icon),
              ),
            )
            .first;
        expect(icon.icon, Icons.block_outlined);
      });
    }

    testWidgets('CV-6 (medida). Aberta pelo Perfil, a tela tem a seta de '
        'voltar nas 3 aparências', (t) async {
      for (final ap in AppAppearance.values) {
        final w = AparWorld(prefs: {_key: ap});
        await t.pumpWidget(aparApp(w, initial: '/profile'));
        await t.pumpAndSettle();
        // Na A, a linha de Privacidade é a de hoje (o texto "Localização");
        // na B e na C, a linha nova.
        final link = ap == AppAppearance.a
            ? find.text('Localização')
            : find.byKey(Key('profile-location-row-${ap.letter}'));
        await t.ensureVisible(link);
        await t.pumpAndSettle();
        await t.tap(link);
        await t.pumpAndSettle();
        expect(find.byType(LocationConsentScreen), findsOneWidget);
        expect(find.byType(BackButton), findsOneWidget, reason: ap.letter);
        await t.pumpWidget(const SizedBox());
      }
    });
  });
}

/// O texto do detalhe da Captura quando a posição fica no aparelho.
const locationCaptureDeviceOnlyDetailForTest =
    'A posição fica guardada no celular e só vai para a sua organização '
    'depois que a sua decisão for registrada.';

/// Um registro que nunca responde (o estado "carregando" da decisão).
class _NeverStore extends FixedConsentStore {
  _NeverStore() : super(consentState('nao-decidiu'));

  @override
  Future<LocationConsentStatus> status() =>
      Completer<LocationConsentStatus>().future;
}
