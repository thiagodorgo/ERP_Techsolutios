// B-APP-ORG-2 (A1) — as sessões e o cliente de escuta.
//
// Plano B-APP-ORG-69-70: Emenda 1.8 §5.2 (L2 a L5, L9, G-ESCUTA), 1.8.1 §7.3
// (L9 reescrito), 1.8.2 §4.3 (o censo G-ESCUTA ampliado) e 1.8.3 §4 e §5.3
// (L11 a L11d, o diário e o `reason` do 403). O repositório é o REAL
// (`DioAuthRepository`), e todo HTTP passa pelo servidor falso.

import 'dart:io';

import 'package:dio/dio.dart';
import 'package:erp_techsolutions_mobile/core/auth/auth_repository.dart';
import 'package:erp_techsolutions_mobile/core/network/api_error.dart';
import 'package:erp_techsolutions_mobile/core/network/http_client.dart';
import 'package:erp_techsolutions_mobile/core/network/listen_http_client.dart';
import 'package:flutter_test/flutter_test.dart';

import 'bapporg2_fakes.dart';

void main() {
  group('B-APP-ORG-2 A1 — sessões de escuta', () {
    test('L2 — todo pedido da escuta de Y leva o token de Y; nenhum pedido do '
        'cliente vivo leva o token de Y', () async {
      final e = Escuta();
      await e.sessions.acquire('Y', liveSession());

      await e.sessions.clientFor('Y').get(kWorkOrders);

      final listened = e.server.to(kWorkOrders);
      expect(listened.map((s) => s.auth), ['Bearer tok-Y-1']);
      final fromLive = e.server.to(kActiveTenant);
      expect(fromLive.map((s) => s.auth), ['Bearer $kLiveToken']);
      expect(
        e.server.sent.where((s) => s.path != kWorkOrders).map((s) => s.auth),
        everyElement(isNot(contains('tok-Y'))),
      );
    });

    test('L3 — pedido que não é GET é recusado sem sair do aparelho', () async {
      final e = Escuta();
      await e.sessions.acquire('Y', liveSession());

      final error = await _caught(e.sessions.clientFor('Y').post(kWorkOrders));

      expect(error, isA<DioException>());
      expect((error as DioException).error, isA<ListenRequestRefused>());
      expect(e.server.to(kWorkOrders), isEmpty);
    });

    test(
      'L4 — caminho fora da lista é recusado sem sair do aparelho',
      () async {
        final e = Escuta();
        await e.sessions.acquire('Y', liveSession());

        final error = await _caught(
          e.sessions.clientFor('Y').get('/api/v1/users'),
        );

        expect(error, isA<DioException>());
        expect((error as DioException).error, isA<ListenRequestRefused>());
        expect(e.server.to('/api/v1/users'), isEmpty);
      },
    );

    test('L5 — 401 na escuta: a sessão cai, 0 renovação, e o ciclo seguinte '
        'pede outra', () async {
      final e = Escuta();
      await e.sessions.acquire('Y', liveSession());
      e.server.workOrdersStatus = 401;

      final error = await _caught(e.sessions.clientFor('Y').get(kWorkOrders));

      expect(error, isA<DioException>());
      expect(e.sessions.sessions, isEmpty);
      expect(e.server.to(kRefresh), isEmpty);
      final again = await e.sessions.acquire('Y', liveSession());
      expect(again?.tokens.accessToken, 'tok-Y-2');
      expect(e.server.to(kActiveTenant), hasLength(2));
      expect(e.server.to(kRefresh), isEmpty);
    });

    test('L9 — resposta do active-tenant com outro pátio: a sessão não é '
        'guardada, o token recebido vai para a revogação e nenhum pedido sai '
        'com ela', () async {
      final e = Escuta();
      e.server.replyTenant = 'Z';

      final error = await _caught(e.sessions.acquire('Y', liveSession()));

      expect(error, isA<ListenTenantMismatchError>());
      expect(e.sessions.sessions, isEmpty);
      expect(() => e.sessions.clientFor('Y'), throwsStateError);
      expect(await e.journal.all(), isEmpty);
      expect(e.server.events, ['acquire:Y', 'revoke:ref-Z-1']);
      expect(e.server.liveOf('Z'), 0);
      expect(
        e.server.sent.map((s) => s.auth),
        everyElement(isNot(contains('tok-Z'))),
      );
    });

    test('L11 — 5 expirações da escuta de Y com o logout respondendo: as '
        'sessões vivas de Y nunca passam de 1', () async {
      final e = Escuta();
      for (var cycle = 0; cycle < 5; cycle++) {
        await e.sessions.acquire('Y', liveSession());
        expect(e.server.liveOf('Y'), 1);
        e.expire();
      }
      await e.sessions.acquire('Y', liveSession());

      expect(e.server.to(kActiveTenant), hasLength(6));
      expect(e.server.to(kLogout), hasLength(5));
      expect(e.server.maxLive['Y'], 1);
      expect(e.server.liveOf('Y'), 1);
    });

    test('L11b — logout de Y sem resposta (503 e sem rede): 0 pedido de sessão '
        'nova em 5 ciclos, vivas = 1; o logout volta: 1 revogação, 1 pedido, '
        'vivas = 1', () async {
      final e = Escuta();
      await e.sessions.acquire('Y', liveSession());
      e.expire();
      for (var cycle = 0; cycle < 5; cycle++) {
        e.server.logout = cycle.isEven
            ? LogoutMode.unavailable
            : LogoutMode.offline;
        expect(await e.sessions.acquire('Y', liveSession()), isNull);
      }
      expect(e.server.to(kActiveTenant), hasLength(1));
      expect(e.server.liveOf('Y'), 1);
      expect(await e.journal.all(), {'Y': 'ref-Y-1'});

      e.server.logout = LogoutMode.ok;
      final revokedBefore = e.server.events.length;
      final session = await e.sessions.acquire('Y', liveSession());

      expect(session?.tokens.accessToken, 'tok-Y-2');
      expect(e.server.events.sublist(revokedBefore), [
        'revoke:ref-Y-1',
        'acquire:Y',
      ]);
      expect(e.server.to(kActiveTenant), hasLength(2));
      expect(e.server.liveOf('Y'), 1);
      expect(e.server.maxLive['Y'], 1);
    });

    test('L11c — fechar e abrir o app: o token da execução anterior é revogado '
        'antes de qualquer pedido; vivas nunca passa de 1', () async {
      final e = Escuta();
      await e.sessions.acquire('Y', liveSession());
      final reopened = e.open();

      await reopened.acquire('Y', liveSession());

      expect(e.server.events, ['acquire:Y', 'revoke:ref-Y-1', 'acquire:Y']);
      expect(e.server.maxLive['Y'], 1);
      expect(e.server.liveOf('Y'), 1);
    });

    test('L11d — o diário nunca tem mais de 1 token por pátio nem token de '
        'pátio fora da lista; o Sair o esvazia e leva os tokens para a fila do '
        'Sair', () async {
      final e = Escuta();
      await e.sessions.acquire('Y', liveSession());
      await e.sessions.acquire('Z', liveSession());
      e.expire();
      await e.sessions.acquire('Y', liveSession());
      expect(await e.journal.all(), {'Y': 'ref-Y-3', 'Z': 'ref-Z-2'});

      await e.sessions.retainTenants({'Y'});
      expect(await e.journal.all(), {'Y': 'ref-Y-3'});
      expect(e.server.events.last, 'revoke:ref-Z-2');

      e.server.logout = LogoutMode.offline;
      await e.sessions.discardAll();

      expect(await e.journal.all(), isEmpty);
      expect(e.sessions.sessions, isEmpty);
      final queued = await e.storage.loadPendingRevocations();
      expect(queued.map((q) => q.token), ['ref-Y-3']);
    });

    test(
      'R403 (CA182-09) — o 403 da escuta traz o reason do servidor',
      () async {
        final e = Escuta();
        await e.sessions.acquire('Y', liveSession());
        e.server.workOrdersStatus = 403;

        final error = await _caught(e.sessions.clientFor('Y').get(kWorkOrders));

        final mapped = mapDioError(error! as DioException);
        expect(mapped, isA<ApiForbiddenError>());
        expect((mapped as ApiForbiddenError).reason, 'module_not_enabled');
        expect(e.sessions.sessions, hasLength(1));
      },
    );

    test('R403b — o reason só passa como identificador curto', () {
      ApiError map(Object? data) => mapDioError(
        DioException(
          requestOptions: RequestOptions(path: kWorkOrders),
          type: DioExceptionType.badResponse,
          response: Response<Object?>(
            requestOptions: RequestOptions(path: kWorkOrders),
            statusCode: 403,
            data: data,
          ),
        ),
      );
      String? reason(Object? data) => (map(data) as ApiForbiddenError).reason;

      expect(
        reason({
          'error': {'reason': 'forbidden'},
        }),
        'forbidden',
      );
      expect(
        reason({
          'error': {'reason': 'Texto livre do servidor'},
        }),
        isNull,
      );
      expect(reason({'reason': 'forbidden'}), isNull);
      expect(reason('forbidden'), isNull);
      expect(reason(null), isNull);
    });
  });

  group('G-ESCUTA — o censo da escuta em lib/', () {
    final sources = _libSources();

    List<String> filesWith(bool Function(String line) match) => [
      for (final entry in sources.entries)
        if (entry.value.any(match)) entry.key,
    ]..sort();

    test('kActiveTenantPath só em auth_repository.dart', () {
      expect(filesWith((l) => l.contains('kActiveTenantPath')), [
        'lib/core/auth/auth_repository.dart',
      ]);
    });

    test('acquireListenSession( só é chamado em listen_sessions.dart', () {
      expect(
        filesWith(
          (l) =>
              l.contains('acquireListenSession(') &&
              !l.contains('Future<AuthSession> acquireListenSession('),
        ),
        ['lib/core/auth/listen_sessions.dart'],
      );
    });

    test('createListenHttpClient( só é chamado em listen_sessions.dart', () {
      expect(
        filesWith(
          (l) =>
              l.contains('createListenHttpClient(') &&
              !l.contains('Dio createListenHttpClient('),
        ),
        ['lib/core/auth/listen_sessions.dart'],
      );
    });

    test('o cliente de escuta não tem renovação nem o cliente autenticado', () {
      final cli = sources['lib/core/network/listen_http_client.dart']!;
      expect(cli.where((l) => l.contains('AuthRefreshInterceptor')), isEmpty);
      expect(
        cli.where((l) => l.contains('createAuthenticatedHttpClient')),
        isEmpty,
      );
      expect(kListenPaths, {
        '/api/v1/work-orders',
        '/api/v1/commissions/calculations/mine',
        '/api/v1/commissions/statements/my-summary',
      });
    });
  });
}

Future<Object?> _caught(Future<Object?> future) async {
  try {
    await future;
    return null;
  } catch (error) {
    return error;
  }
}

/// As linhas de código (sem comentário) de cada arquivo `.dart` de `lib/`.
Map<String, List<String>> _libSources() {
  final result = <String, List<String>>{};
  final files = Directory('lib')
      .listSync(recursive: true)
      .whereType<File>()
      .where((f) => f.path.endsWith('.dart'));
  for (final file in files) {
    final path = file.path.replaceAll(r'\', '/');
    result[path] = [
      for (final line in file.readAsLinesSync())
        if (!line.trimLeft().startsWith('//')) line,
    ];
  }
  return result;
}
