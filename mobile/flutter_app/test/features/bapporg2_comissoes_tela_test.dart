// B-APP-ORG-2 (A3, tela) — a aba Comissões: CM2, CM5 (um teste por estado) e
// a interação da Emenda 1.8.3.5 §2 (filtro pelo indicador e pela barra, "Ver
// todos" e uma linha aberta por vez). O token de cada pátio é um dublê (a A1
// liga o de verdade no merge).
import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:erp_techsolutions_mobile/core/network/connectivity_repository.dart';
import 'package:erp_techsolutions_mobile/features/commissions/data/commissions_by_patio.dart'
    as commission;
import 'package:erp_techsolutions_mobile/features/commissions/state/commissions_controller.dart';
import 'package:erp_techsolutions_mobile/features/commissions/ui/commissions_screen.dart';
import 'package:erp_techsolutions_mobile/features/commissions/ui/finance_section_switch.dart';
import 'package:erp_techsolutions_mobile/shared/theme/erp_mobile_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

// ---------------------------------------------------------------------------
// Dublês: o token de cada pátio e o servidor
// ---------------------------------------------------------------------------

final class _Tokens implements commission.PatioTokenSource {
  @override
  Future<String?> tokenForPatio(String patioId) async => 'tok-$patioId';
}

/// Um mês do servidor de teste: o total em centavos (texto) e a contagem.
typedef _Month = ({String cents, int count});

final class _Patio {
  _Patio({required this.months, this.items = const <Map<String, Object?>>[]});

  /// Por número do mês (6 = junho … 11 = novembro).
  final Map<int, _Month> months;
  final List<Map<String, Object?>> items;

  /// Quando não nulo, toda resposta deste pátio é este erro.
  (int, String)? failure;
}

final class _Server implements HttpClientAdapter {
  _Server(this.patios);

  final Map<String, _Patio> patios;
  int requests = 0;

  /// Cada pedido: o pátio, o caminho e a query.
  final List<(String, String, Map<String, dynamic>)> sent = [];

  /// Quando não nulo, toda resposta espera por ele.
  Completer<void>? gate;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    requests++;
    final gate = this.gate;
    if (gate != null) await gate.future;
    final token = (options.headers['Authorization'] as String).substring(
      'Bearer tok-'.length,
    );
    final patio = patios[token]!;
    sent.add((token, options.path, options.queryParameters));
    final failure = patio.failure;
    if (failure != null) {
      return _json(failure.$1, {
        'error': {'reason': failure.$2},
      });
    }
    if (options.path == commission.commissionCalculationsMinePath) {
      return _json(200, {
        'items': patio.items,
        'pagination': {'limit': 100, 'offset': 0, 'total': patio.items.length},
      });
    }
    final from = DateTime.parse(
      options.queryParameters['from'] as String,
    ).toLocal();
    final month = patio.months[from.month] ?? (cents: '0', count: 0);
    return _json(200, {
      'data': {
        'items': [
          if (month.count > 0)
            {
              'payeeId': 'payee-1',
              'totalCents': month.cents,
              'count': month.count,
            },
        ],
        'totalCents': month.cents,
      },
    });
  }

  @override
  void close({bool force = false}) {}
}

ResponseBody _json(int status, Map<String, Object?> body) =>
    ResponseBody.fromString(
      jsonEncode(body),
      status,
      headers: {
        Headers.contentTypeHeader: ['application/json; charset=utf-8'],
      },
    );

Map<String, Object?> _item(
  String id,
  String cents,
  String createdAt, {
  String status = 'approved',
  String? settledAt,
}) => {
  'id': id,
  'amountCents': cents,
  'status': status,
  'createdAt': createdAt,
  'settledAt': settledAt,
};

/// O pátio X da maquete: seis meses, quatro lançamentos em novembro e um em
/// outubro.
_Patio _patioX() => _Patio(
  months: {
    6: (cents: '98000', count: 7),
    7: (cents: '110540', count: 8),
    8: (cents: '86000', count: 6),
    9: (cents: '121000', count: 9),
    10: (cents: '114730', count: 8),
    11: (cents: '60550', count: 4),
  },
  items: [
    _item('x1', '16800', '2026-11-20T15:05:00.000Z'),
    _item('x2', '14250', '2026-11-19T12:40:00.000Z', status: 'calculated'),
    _item(
      'x3',
      '17500',
      '2026-11-18T15:22:00.000Z',
      settledAt: '2026-11-20T15:00:00.000Z',
    ),
    _item('x4', '12000', '2026-11-12T14:10:00.000Z', status: 'rejected'),
    _item('x5', '16000', '2026-10-28T15:47:00.000Z'),
  ],
);

_Patio _patioY() => _Patio(
  months: {10: (cents: '38000', count: 3), 11: (cents: '41500', count: 3)},
  items: [
    _item('y1', '15500', '2026-11-17T15:02:00.000Z', status: 'disputed'),
    _item('y2', '13000', '2026-11-12T13:15:00.000Z'),
  ],
);

const _x = commission.CommissionPatio(id: 'x', name: 'Pátio Central');
const _y = commission.CommissionPatio(id: 'y', name: 'Pátio Norte');

final _now = DateTime(2026, 11, 21, 14, 32);

// ---------------------------------------------------------------------------
// A montagem
// ---------------------------------------------------------------------------

Future<ProviderContainer> _pump(
  WidgetTester tester,
  _Server server, {
  bool offline = false,
}) async {
  tester.view.physicalSize = const Size(390, 2400);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
  final repository = commission.CommissionByPatioRepository(
    tokenSource: _Tokens(),
    clientFactory: (token) {
      final dio = Dio(
        BaseOptions(
          baseUrl: 'https://api.invalid',
          headers: {'Authorization': 'Bearer $token'},
        ),
      );
      dio.httpClientAdapter = server;
      return dio;
    },
  );
  final container = ProviderContainer(
    overrides: [
      commissionPatiosProvider.overrideWithValue(const [
        CommissionPatioEntry(patio: _x, isCurrent: true),
        CommissionPatioEntry(patio: _y, isCurrent: false),
      ]),
      commissionRepositoryProvider.overrideWithValue(repository),
      commissionClockProvider.overrideWithValue(() => _now),
    ],
  );
  addTearDown(container.dispose);
  if (offline) container.read(networkStatusProvider.notifier).setOffline();
  final router = GoRouter(
    initialLocation: commissionsRoutePath,
    routes: [
      GoRoute(
        path: '/expenses',
        builder: (context, state) => const Scaffold(body: Text('despesas')),
      ),
      GoRoute(
        path: commissionsRoutePath,
        builder: (context, state) => const CommissionsScreen(),
      ),
    ],
  );
  addTearDown(router.dispose);
  await tester.pumpWidget(
    UncontrolledProviderScope(
      container: container,
      child: MaterialApp.router(
        theme: ErpMobileTheme.light(),
        routerConfig: router,
      ),
    ),
  );
  await tester.pumpAndSettle();
  return container;
}

Finder _inBlock(String patioId, Finder matching) => find.descendant(
  of: find.byKey(ValueKey('commission-block-$patioId')),
  matching: matching,
);

Finder _row(String patioId, String id) =>
    find.byKey(ValueKey('commission-row-$patioId/$id'));

void main() {
  group('B-APP-ORG-2 A3 — tela Comissões', () {
    testWidgets(
      'CM2: cada pátio mostra o total dele, e em lugar nenhum a soma',
      (tester) async {
        final server = _Server({
          'x': _Patio(months: {11: (cents: '1000', count: 1)}),
          'y': _Patio(months: {11: (cents: '550', count: 1)}),
        });
        await _pump(tester, server);

        expect(_inBlock('x', find.text(r'R$ 10,00')), findsWidgets);
        expect(_inBlock('y', find.text(r'R$ 5,50')), findsWidgets);
        expect(_inBlock('x', find.text(r'R$ 5,50')), findsNothing);
        expect(_inBlock('y', find.text(r'R$ 10,00')), findsNothing);
        expect(find.textContaining('15,50', findRichText: true), findsNothing);
        expect(find.text('Pátio Central'), findsOneWidget);
        expect(find.text('Pátio Norte'), findsOneWidget);
        expect(_inBlock('x', find.text('Pátio atual')), findsOneWidget);
        expect(_inBlock('y', find.text('Pátio atual')), findsNothing);
      },
    );

    testWidgets(
      'Meses: o resumo é pedido mês a mês (from/to) e o No mês é o do mês atual',
      (tester) async {
        final server = _Server({'x': _patioX(), 'y': _patioY()});
        await _pump(tester, server);

        final x = [
          for (final sent in server.sent)
            if (sent.$1 == 'x') sent,
        ];
        expect(x.length, 7);
        expect(x.first.$2, commission.commissionCalculationsMinePath);
        expect(x.first.$3['limit'], '100');
        final months = [
          for (final sent in x.skip(1))
            DateTime.parse(sent.$3['from'] as String).toLocal(),
        ];
        expect(months.map((day) => day.month), [6, 7, 8, 9, 10, 11]);
        expect(months.every((day) => day.day == 1 && day.hour == 0), isTrue);
        for (final sent in x.skip(1)) {
          expect(sent.$2, commission.commissionStatementsMySummaryPath);
        }
        expect(
          DateTime.parse(x.first.$3['from'] as String).toLocal(),
          DateTime(2026, 6),
        );
        expect(_inBlock('x', find.text(r'R$ 605,50')), findsOneWidget);
      },
    );

    testWidgets(
      'CM2b na tela: centavos inválidos num mês deixam só aquele pátio em erro',
      (tester) async {
        final y = _patioY();
        y.months[9] = (cents: '10.08', count: 1);
        await _pump(tester, _Server({'x': _patioX(), 'y': y}));

        expect(
          _inBlock(
            'y',
            find.text('Não foi possível carregar as comissões deste pátio'),
          ),
          findsOneWidget,
        );
        expect(_inBlock('y', find.textContaining('10,08')), findsNothing);
        expect(_inBlock('x', find.text(r'R$ 605,50')), findsOneWidget);
      },
    );

    testWidgets('CM5 com dados: o indicador, as barras e os 3 últimos', (
      tester,
    ) async {
      await _pump(tester, _Server({'x': _patioX(), 'y': _patioY()}));

      expect(_inBlock('x', find.text(r'R$ 605,50')), findsOneWidget);
      expect(
        _inBlock(
          'x',
          find.text('No mês · 4 atendimentos\n▼ abaixo de outubro'),
        ),
        findsOneWidget,
      );
      expect(
        _inBlock(
          'x',
          find.textContaining(
            'Novembro: R\$ 605,50 · 4 atendimentos',
            findRichText: true,
          ),
        ),
        findsOneWidget,
      );
      expect(_inBlock('x', find.text('Atualizado às 14:32')), findsOneWidget);
      expect(_inBlock('x', find.text('A receber')), findsNothing);
      expect(_inBlock('x', find.text('Pago no mês')), findsNothing);
      expect(_row('x', 'x1'), findsOneWidget);
      expect(_row('x', 'x3'), findsOneWidget);
      expect(_row('x', 'x4'), findsNothing);
      expect(_inBlock('x', find.text('Paga')), findsOneWidget);
      expect(_inBlock('y', find.text('Em contestação')), findsOneWidget);
    });

    testWidgets('CM5 carregando: cada pátio carrega sozinho', (tester) async {
      final server = _Server({'x': _patioX(), 'y': _patioY()})
        ..gate = Completer<void>();
      final semantics = tester.ensureSemantics();
      await _pump(tester, server);

      expect(_inBlock('x', find.text('Carregando…')), findsOneWidget);
      expect(_inBlock('y', find.text('Carregando…')), findsOneWidget);
      expect(
        find.bySemanticsLabel('Carregando as comissões deste pátio'),
        findsNWidgets(2),
      );

      server.gate!.complete();
      server.gate = null;
      await tester.pumpAndSettle();
      expect(find.text('Carregando…'), findsNothing);
      expect(_inBlock('x', find.text(r'R$ 605,50')), findsOneWidget);
      semantics.dispose();
    });

    testWidgets('CM5 vazio: ainda sem comissão no pátio', (tester) async {
      await _pump(
        tester,
        _Server({'x': _Patio(months: const {}), 'y': _patioY()}),
      );

      expect(
        _inBlock('x', find.text('Nenhuma comissão ainda')),
        findsOneWidget,
      );
      expect(_inBlock('y', find.text('Nenhuma comissão ainda')), findsNothing);
      expect(_inBlock('y', find.text(r'R$ 415,00')), findsOneWidget);
    });

    testWidgets(
      'CM5 erro em um pátio: o outro continua, e "Tentar de novo" só nele',
      (tester) async {
        final y = _patioY()..failure = (500, 'internal');
        final server = _Server({'x': _patioX(), 'y': y});
        await _pump(tester, server);

        expect(
          _inBlock(
            'y',
            find.text('Não foi possível carregar as comissões deste pátio'),
          ),
          findsOneWidget,
        );
        expect(_inBlock('y', find.text('Falhou às 14:32')), findsOneWidget);
        expect(_inBlock('x', find.text(r'R$ 605,50')), findsOneWidget);

        y.failure = null;
        await tester.tap(_inBlock('y', find.text('Tentar de novo')));
        await tester.pumpAndSettle();
        expect(_inBlock('y', find.text(r'R$ 415,00')), findsOneWidget);
      },
    );

    testWidgets('CM5 pátio sem financeiro: "não disponíveis neste pátio"', (
      tester,
    ) async {
      final y = _patioY()..failure = (403, 'module_not_enabled');
      await _pump(tester, _Server({'x': _patioX(), 'y': y}));

      expect(
        _inBlock('y', find.text('Comissões não disponíveis neste pátio.')),
        findsOneWidget,
      );
      expect(_inBlock('x', find.text(r'R$ 605,50')), findsOneWidget);
    });

    testWidgets('CM5 sem acesso (403): frase própria, os outros seguem', (
      tester,
    ) async {
      final y = _patioY()..failure = (403, 'forbidden');
      await _pump(tester, _Server({'x': _patioX(), 'y': y}));

      expect(
        _inBlock(
          'y',
          find.text('Você não tem acesso às comissões deste pátio.'),
        ),
        findsOneWidget,
      );
      expect(
        _inBlock('y', find.text('Comissões não disponíveis neste pátio.')),
        findsNothing,
      );
      expect(_inBlock('x', find.text(r'R$ 605,50')), findsOneWidget);
    });

    testWidgets(
      'CM5 sem atualização: a atualização falha e ficam os dados de antes',
      (tester) async {
        final y = _patioY();
        await _pump(tester, _Server({'x': _patioX(), 'y': y}));
        expect(_inBlock('y', find.text(r'R$ 415,00')), findsOneWidget);

        y.failure = (503, 'unavailable');
        await tester.tap(find.byTooltip('Atualizar as comissões'));
        await tester.pumpAndSettle();

        expect(
          _inBlock(
            'y',
            find.text('Sem atualização agora. Estes são os dados das 14:32.'),
          ),
          findsOneWidget,
        );
        expect(
          _inBlock('y', find.text('Última atualização às 14:32')),
          findsOneWidget,
        );
        expect(_inBlock('y', find.text(r'R$ 415,00')), findsOneWidget);
        expect(
          _inBlock('x', find.textContaining('Sem atualização')),
          findsNothing,
        );
      },
    );

    testWidgets('CM5 sem conexão: mostra o que já carregou, sem atualizar', (
      tester,
    ) async {
      final server = _Server({'x': _patioX(), 'y': _patioY()});
      final container = await _pump(tester, server);

      container.read(networkStatusProvider.notifier).setOffline();
      await tester.pumpAndSettle();

      expect(
        find.text('Sem conexão. Mostrando o que foi carregado às 14:32.'),
        findsOneWidget,
      );
      expect(_inBlock('x', find.text('Carregado às 14:32')), findsOneWidget);
      expect(_inBlock('x', find.text(r'R$ 605,50')), findsOneWidget);
      final refresh = tester.widget<IconButton>(
        find.widgetWithIcon(IconButton, Icons.refresh),
      );
      expect(refresh.onPressed, isNull);
    });

    testWidgets('CM5 abriu sem conexão: nada carregado e nenhum pedido', (
      tester,
    ) async {
      final server = _Server({'x': _patioX(), 'y': _patioY()});
      await _pump(tester, server, offline: true);

      expect(find.text('Sem conexão'), findsOneWidget);
      expect(
        find.textContaining('Elas não ficam guardadas no aparelho.'),
        findsOneWidget,
      );
      expect(find.text('Tentar de novo'), findsOneWidget);
      expect(server.requests, 0);
    });

    testWidgets(
      'Interação: tocar no indicador filtra o mês, tocar de novo limpa',
      (tester) async {
        await _pump(tester, _Server({'x': _patioX(), 'y': _patioY()}));

        await tester.tap(find.byKey(const ValueKey('commission-indicator-x')));
        await tester.pumpAndSettle();

        expect(_inBlock('x', find.text('No mês')), findsOneWidget);
        expect(_row('x', 'x4'), findsOneWidget);
        expect(_row('x', 'x5'), findsNothing);
        expect(_inBlock('x', find.textContaining('Ver todos')), findsNothing);
        expect(_row('y', 'y1'), findsOneWidget);

        await tester.tap(find.byKey(const ValueKey('commission-indicator-x')));
        await tester.pumpAndSettle();
        expect(_inBlock('x', find.text('No mês')), findsNothing);
        expect(_row('x', 'x4'), findsNothing);
      },
    );

    testWidgets(
      'Interação: tocar na barra mostra o valor exato do mês e filtra',
      (tester) async {
        await _pump(tester, _Server({'x': _patioX(), 'y': _patioY()}));

        await tester.tap(find.byKey(const ValueKey('commission-bar-x-4')));
        await tester.pumpAndSettle();

        expect(
          _inBlock(
            'x',
            find.textContaining(
              'Outubro: R\$ 1.147,30 · 8 atendimentos',
              findRichText: true,
            ),
          ),
          findsOneWidget,
        );
        expect(_inBlock('x', find.text('Outubro')), findsOneWidget);
        expect(_row('x', 'x5'), findsOneWidget);
        expect(_row('x', 'x1'), findsNothing);

        await tester.tap(_inBlock('x', find.byTooltip('Tirar o filtro')).first);
        await tester.pumpAndSettle();
        expect(_row('x', 'x1'), findsOneWidget);
        expect(_row('x', 'x5'), findsNothing);
      },
    );

    testWidgets('Interação: "Ver todos" mostra todos os lançamentos', (
      tester,
    ) async {
      await _pump(tester, _Server({'x': _patioX(), 'y': _patioY()}));

      expect(
        _inBlock('x', find.text('Ver todos os 5 lançamentos')),
        findsOneWidget,
      );
      expect(_inBlock('y', find.textContaining('Ver todos')), findsNothing);

      await tester.tap(_inBlock('x', find.text('Ver todos os 5 lançamentos')));
      await tester.pumpAndSettle();
      for (final id in ['x1', 'x2', 'x3', 'x4', 'x5']) {
        expect(_row('x', id), findsOneWidget, reason: id);
      }
      expect(_inBlock('x', find.textContaining('Ver todos')), findsNothing);
    });

    testWidgets('Interação: uma linha aberta por vez, na tela inteira', (
      tester,
    ) async {
      await _pump(tester, _Server({'x': _patioX(), 'y': _patioY()}));

      await tester.tap(
        find
            .descendant(of: _row('x', 'x1'), matching: find.text(r'R$ 168,00'))
            .first,
      );
      await tester.pumpAndSettle();
      expect(find.text('Gerada em'), findsOneWidget);
      expect(
        find.descendant(of: _row('x', 'x1'), matching: find.text('Gerada em')),
        findsOneWidget,
      );

      await tester.tap(
        find
            .descendant(of: _row('x', 'x3'), matching: find.text(r'R$ 175,00'))
            .first,
      );
      await tester.pumpAndSettle();
      expect(find.text('Gerada em'), findsOneWidget);
      expect(
        find.descendant(of: _row('x', 'x3'), matching: find.text('Gerada em')),
        findsOneWidget,
      );
      expect(
        find.descendant(of: _row('x', 'x3'), matching: find.text('Paga em')),
        findsOneWidget,
      );

      await tester.tap(
        find
            .descendant(of: _row('y', 'y1'), matching: find.text(r'R$ 155,00'))
            .first,
      );
      await tester.pumpAndSettle();
      expect(find.text('Gerada em'), findsOneWidget);
      expect(
        find.descendant(of: _row('y', 'y1'), matching: find.text('Gerada em')),
        findsOneWidget,
      );

      await tester.tap(
        find
            .descendant(of: _row('y', 'y1'), matching: find.text(r'R$ 155,00'))
            .first,
      );
      await tester.pumpAndSettle();
      expect(find.text('Gerada em'), findsNothing);
    });

    testWidgets('A troca "Despesas | Comissões" leva às despesas', (
      tester,
    ) async {
      await _pump(tester, _Server({'x': _patioX(), 'y': _patioY()}));

      final comissoes = tester.getSize(find.text('Comissões'));
      expect(comissoes.height, greaterThan(0));
      await tester.tap(find.text('Despesas'));
      await tester.pumpAndSettle();
      expect(find.text('despesas'), findsOneWidget);
    });
  });
}
