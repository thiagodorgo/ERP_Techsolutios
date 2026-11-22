// ignore_for_file: unused_element

// B-APP-ORG-2 (A3, tela) — a aba Comissões: CM2, CM5 (um teste por estado) e
// a interação da Emenda 1.8.3.5 §2 (filtro pelo indicador e pela barra, "Ver
// todos" e uma linha aberta por vez). O token de cada pátio é um dublê (a A1
// liga o de verdade no merge).
import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:erp_techsolutions_mobile/core/auth/auth_notifier.dart';
import 'package:erp_techsolutions_mobile/core/network/connectivity_repository.dart';
import 'package:erp_techsolutions_mobile/features/commissions/data/commission_patio_clients.dart';
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

final class _Tokens {
  Future<String?> tokenForPatio(String patioId) async => 'tok-$patioId';
}

final class _Clients implements CommissionPatioClients {
  _Clients({required this.tokens, required this.server});

  final _Tokens tokens;
  final _Server server;

  @override
  Future<Dio?> clientFor(String patioId) async {
    final token = await tokens.tokenForPatio(patioId);
    if (token == null || token.isEmpty) return null;
    final dio = Dio(
      BaseOptions(
        baseUrl: 'https://api.invalid',
        headers: {'Authorization': 'Bearer $token'},
      ),
    );
    dio.httpClientAdapter = server;
    return dio;
  }
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
    patioClients: _Clients(tokens: _Tokens(), server: server),
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

class _Cell<T> extends Notifier<T> {
  _Cell(this._initial);
  final T _initial;
  @override
  T build() => _initial;
  void set(T value) => state = value;
}

const _listaA = <CommissionPatioEntry>[
  CommissionPatioEntry(patio: _x, isCurrent: true),
  CommissionPatioEntry(patio: _y, isCurrent: false),
];
const _listaB = <CommissionPatioEntry>[
  CommissionPatioEntry(patio: _y, isCurrent: true),
  CommissionPatioEntry(patio: _x, isCurrent: false),
];

final _chave = NotifierProvider<_Cell<String?>, String?>(() => _Cell('ka'));
final _lista =
    NotifierProvider<
      _Cell<List<CommissionPatioEntry>?>,
      List<CommissionPatioEntry>?
    >(() => _Cell(_listaA));

void main() {
  testWidgets('IC8b — a sessao viva muda com a aba aberta', (tester) async {
    tester.view.physicalSize = const Size(390, 2400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    final server = _Server({'x': _patioX(), 'y': _patioY()});
    final repository = commission.CommissionByPatioRepository(
      patioClients: _Clients(tokens: _Tokens(), server: server),
    );
    final container = ProviderContainer(
      overrides: [
        sessionKeyProvider.overrideWith((ref) => ref.watch(_chave)),
        commissionPatiosProvider.overrideWith((ref) => ref.watch(_lista)),
        commissionRepositoryProvider.overrideWithValue(repository),
        commissionClockProvider.overrideWithValue(() => _now),
      ],
    );
    addTearDown(container.dispose);
    final router = GoRouter(
      initialLocation: commissionsRoutePath,
      routes: [
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
    expect(_inBlock('x', find.text(r'R$ 605,50')), findsOneWidget);
    final antes = server.requests;

    // Outra sessão: o servidor passa a responder outro valor para X.
    server.patios['x']!.months[11] = (cents: '100', count: 1);
    container.read(_chave.notifier).set('kb');
    container.read(_lista.notifier).set(null);
    await tester.pump();
    container.read(_lista.notifier).set(_listaB);
    await tester.pumpAndSettle();

    expect(server.requests, greaterThan(antes));
    expect(find.text(r'R$ 605,50'), findsNothing);
    expect(_inBlock('x', find.text(r'R$ 1,00')), findsOneWidget);
    expect(_inBlock('y', find.text(r'R$ 415,00')), findsOneWidget);
  });
}
