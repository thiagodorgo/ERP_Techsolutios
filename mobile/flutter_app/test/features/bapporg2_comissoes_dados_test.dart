import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:erp_techsolutions_mobile/features/commissions/data/commission_patio_clients.dart';
import 'package:erp_techsolutions_mobile/features/commissions/data/commissions_by_patio.dart';
import 'package:flutter_test/flutter_test.dart';

final class _Tokens {
  _Tokens(this.values);

  final Map<String, String?> values;
  final List<String> requestedPatios = [];

  Future<String?> tokenForPatio(String patioId) async {
    requestedPatios.add(patioId);
    return values[patioId];
  }
}

final class _Sent {
  const _Sent(this.method, this.path, this.authorization);

  final String method;
  final String path;
  final String? authorization;
}

typedef _Responder = ResponseBody Function(RequestOptions options);

final class _Server implements HttpClientAdapter {
  _Server(this.responder);

  final _Responder responder;
  final List<_Sent> sent = [];

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    sent.add(
      _Sent(
        options.method,
        options.path,
        options.headers['Authorization'] as String?,
      ),
    );
    return responder(options);
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

Map<String, Object?> _calculations({Object? amountCents = '101'}) => {
  'items': [
    {
      'id': 'calculation-1',
      'amount': 1.005,
      'amountCents': amountCents,
      'status': 'pending',
      'createdAt': '2026-11-21T12:00:00.000Z',
      'settledAt': null,
    },
  ],
  'pagination': {'limit': 50, 'offset': 0, 'total': 1},
};

Map<String, Object?> _summary({Object? totalCents = '1008'}) => {
  'data': {
    'items': [
      {
        'payeeId': 'payee-1',
        'total': 10.075,
        'totalCents': totalCents,
        'count': 1,
      },
    ],
    'total': 10.075,
    'totalCents': totalCents,
    'from': null,
    'to': null,
  },
};

CommissionByPatioRepository _repository({
  required _Tokens tokens,
  required _Server server,
}) {
  return CommissionByPatioRepository(
    patioClients: _Clients(tokens: tokens, server: server),
  );
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
        baseUrl: 'https://api.invalid/api/v1',
        headers: {'Authorization': 'Bearer $token'},
      ),
    );
    dio.httpClientAdapter = server;
    return dio;
  }
}

String _token(RequestOptions options) =>
    (options.headers['Authorization'] as String).substring('Bearer '.length);

void main() {
  group('B-APP-ORG-2 A3-dados — Comissões por pátio', () {
    test(
      'CM1 e CM2b: usa o token de cada pátio e só os centavos em texto',
      () async {
        final tokens = _Tokens({'patio-x': 'tok-x', 'patio-y': 'tok-y'});
        final server = _Server((options) {
          if (options.path == commissionCalculationsMinePath) {
            return _json(200, _calculations());
          }
          if (options.path == commissionStatementsMySummaryPath) {
            return _json(
              200,
              _summary(totalCents: _token(options) == 'tok-x' ? '1008' : '550'),
            );
          }
          return _json(404, const {});
        });
        final repository = _repository(tokens: tokens, server: server);

        final blocks = await repository.load(const [
          CommissionPatio(id: 'patio-x', name: 'Pátio X'),
          CommissionPatio(id: 'patio-y', name: 'Pátio Y'),
        ]);

        expect(tokens.requestedPatios, ['patio-x', 'patio-y']);
        expect(blocks.map((block) => block.status), [
          CommissionPatioBlockStatus.loaded,
          CommissionPatioBlockStatus.loaded,
        ]);
        expect(blocks[0].data!.totalCents, 1008);
        expect(blocks[0].data!.formattedTotal, r'R$ 10,08');
        expect(blocks[0].data!.calculations.single.amountCents, 101);
        expect(blocks[0].data!.calculations.single.formattedAmount, r'R$ 1,01');
        expect(blocks[1].data!.formattedTotal, r'R$ 5,50');
        expect(server.sent.map((request) => request.authorization), [
          'Bearer tok-x',
          'Bearer tok-x',
          'Bearer tok-y',
          'Bearer tok-y',
        ]);
      },
    );

    test(
      'CM2b: campo monetário inválido falha só o bloco e não usa amount/total',
      () async {
        for (final invalid in <Object?>[null, 1008, 10.08, '', '10.08', '-1']) {
          final tokens = _Tokens({'patio-x': 'tok-x'});
          final server = _Server((options) {
            if (options.path == commissionCalculationsMinePath) {
              return _json(200, _calculations());
            }
            return _json(200, _summary(totalCents: invalid));
          });

          final blocks = await _repository(
            tokens: tokens,
            server: server,
          ).load(const [CommissionPatio(id: 'patio-x', name: 'Pátio X')]);

          expect(
            blocks.single.status,
            CommissionPatioBlockStatus.failed,
            reason: 'valor inválido: $invalid',
          );
          expect(blocks.single.data, isNull);
        }
      },
    );

    test(
      'CM2b: amountCents ausente ou inválido também falha o bloco',
      () async {
        for (final invalid in <Object?>[null, 101, 1.01, '', '1.01']) {
          final tokens = _Tokens({'patio-x': 'tok-x'});
          final server = _Server((options) {
            if (options.path == commissionCalculationsMinePath) {
              return _json(200, _calculations(amountCents: invalid));
            }
            return _json(200, _summary());
          });

          final blocks = await _repository(
            tokens: tokens,
            server: server,
          ).load(const [CommissionPatio(id: 'patio-x', name: 'Pátio X')]);

          expect(
            blocks.single.status,
            CommissionPatioBlockStatus.failed,
            reason: 'valor inválido: $invalid',
          );
          expect(blocks.single.data, isNull);
        }
      },
    );

    test('parseCentsText aceita somente texto ASCII de dígitos', () {
      expect(parseCentsText('0'), 0);
      expect(parseCentsText('001008'), 1008);
      for (final invalid in <Object?>[
        null,
        0,
        10.08,
        '',
        '10.08',
        '-1',
        '+1',
        ' 1',
        '１２',
      ]) {
        expect(
          () => parseCentsText(invalid),
          throwsFormatException,
          reason: 'valor inválido: $invalid',
        );
      }
    });

    test(
      'CM3 e CM6: faz somente os dois GET permitidos e não persiste',
      () async {
        final tokens = _Tokens({'patio-x': 'tok-x'});
        final server = _Server((options) {
          if (options.path == commissionCalculationsMinePath) {
            return _json(200, _calculations());
          }
          return _json(200, _summary());
        });

        await _repository(
          tokens: tokens,
          server: server,
        ).load(const [CommissionPatio(id: 'patio-x', name: 'Pátio X')]);

        expect(commissionReadPaths, {
          '/api/v1/commissions/calculations/mine',
          '/api/v1/commissions/statements/my-summary',
        });
        expect(server.sent.map((request) => request.method).toSet(), {'GET'});
        expect(
          server.sent.map((request) => request.path).toSet(),
          commissionReadPaths,
        );

        final source = File(
          'lib/features/commissions/data/commissions_by_patio.dart',
        ).readAsStringSync();
        expect(source, isNot(contains('local_db')));
        expect(source, isNot(contains('.post(')));
        expect(source, isNot(contains('.put(')));
        expect(source, isNot(contains('.patch(')));
        expect(source, isNot(contains('.delete(')));
      },
    );

    test('CM4: falha de Y não derruba os blocos de X e Z', () async {
      final tokens = _Tokens({
        'patio-x': 'tok-x',
        'patio-y': 'tok-y',
        'patio-z': 'tok-z',
      });
      final server = _Server((options) {
        if (_token(options) == 'tok-y') {
          return _json(500, {
            'error': {'reason': 'internal'},
          });
        }
        if (options.path == commissionCalculationsMinePath) {
          return _json(200, _calculations());
        }
        return _json(200, _summary());
      });

      final blocks = await _repository(tokens: tokens, server: server)
          .load(const [
            CommissionPatio(id: 'patio-x', name: 'Pátio X'),
            CommissionPatio(id: 'patio-y', name: 'Pátio Y'),
            CommissionPatio(id: 'patio-z', name: 'Pátio Z'),
          ]);

      expect(blocks.map((block) => block.status), [
        CommissionPatioBlockStatus.loaded,
        CommissionPatioBlockStatus.failed,
        CommissionPatioBlockStatus.loaded,
      ]);
    });

    test('CM8 e CM9: módulo desligado difere de falta de permissão', () async {
      final tokens = _Tokens({'patio-y': 'tok-y', 'patio-z': 'tok-z'});
      final server = _Server((options) {
        final reason = _token(options) == 'tok-y'
            ? 'module_not_enabled'
            : 'forbidden';
        return _json(403, {
          'error': {'reason': reason},
        });
      });

      final blocks = await _repository(tokens: tokens, server: server)
          .load(const [
            CommissionPatio(id: 'patio-y', name: 'Pátio Y'),
            CommissionPatio(id: 'patio-z', name: 'Pátio Z'),
          ]);

      expect(blocks[0].status, CommissionPatioBlockStatus.moduleNotEnabled);
      expect(blocks[1].status, CommissionPatioBlockStatus.forbidden);
    });

    test(
      'G-DINHEIRO: feature não contém conversões ou formatador proibidos',
      () {
        final files = Directory(
          'lib/features/commissions',
        ).listSync(recursive: true).whereType<File>();
        final source = files.map((file) => file.readAsStringSync()).join('\n');

        for (final forbidden in [
          'toDouble(',
          'double.parse',
          'as num',
          'formatCurrency(',
          'toStringAsFixed',
        ]) {
          expect(source, isNot(contains(forbidden)), reason: forbidden);
        }
      },
    );
  });
}
