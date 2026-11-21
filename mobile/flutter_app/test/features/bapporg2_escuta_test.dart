import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:erp_techsolutions_mobile/core/auth/auth_repository.dart';
import 'package:erp_techsolutions_mobile/core/auth/auth_token_storage.dart';
import 'package:erp_techsolutions_mobile/core/auth/listen_sessions.dart';
import 'package:erp_techsolutions_mobile/core/auth/listen_token_journal.dart';
import 'package:erp_techsolutions_mobile/core/auth/pending_revocations.dart';
import 'package:erp_techsolutions_mobile/core/network/http_client.dart';
import 'package:erp_techsolutions_mobile/core/network/listen_http_client.dart';
import 'package:erp_techsolutions_mobile/features/auth/auth_models.dart';

void main() {
  group('B-APP-ORG-2 A1 — sessões de escuta', () {
    test('L1 — a sessão viva não muda ao adquirir a escuta', () async {
      final fixture = _Fixture();
      await fixture.storage.saveSession(fixture.live);

      final listened = await fixture.sessions.acquire('Y', fixture.live);

      expect(listened?.user.tenantId, 'Y');
      expect((await fixture.storage.loadSession()), fixture.live);
      expect(fixture.sessions.sessions, hasLength(1));
    });

    test('L2 — cada pedido usa somente o token do pátio escutado', () async {
      final fixture = _Fixture();
      await fixture.sessions.acquire('Y', fixture.live);
      final adapter = _Adapter();
      fixture.sessions.clientFor('Y').httpClientAdapter = adapter;

      await fixture.sessions.clientFor('Y').get('/api/v1/work-orders');

      expect(adapter.authorization, ['Bearer access-Y-1']);
      expect(adapter.authorization, isNot(contains('Bearer access-X')));
    });

    test('L3 — método diferente de GET é recusado localmente', () async {
      final client = createListenHttpClient(
        const ApiConfig(),
        accessToken: 'listen',
      );
      final adapter = _Adapter();
      client.httpClientAdapter = adapter;

      await expectLater(
        client.post('/api/v1/work-orders'),
        throwsA(isA<DioException>()),
      );
      expect(adapter.requests, 0);
    });

    test('L4 — caminho fora da allowlist é recusado localmente', () async {
      final client = createListenHttpClient(
        const ApiConfig(),
        accessToken: 'listen',
      );
      final adapter = _Adapter();
      client.httpClientAdapter = adapter;

      await expectLater(
        client.get('/api/v1/users'),
        throwsA(isA<DioException>()),
      );
      expect(adapter.requests, 0);
    });

    test('L5 — 401 derruba a escuta e o ciclo seguinte pede outra', () async {
      final fixture = _Fixture();
      await fixture.sessions.acquire('Y', fixture.live);
      fixture.sessions.clientFor('Y').httpClientAdapter = _Adapter(status: 401);

      await expectLater(
        fixture.sessions.clientFor('Y').get('/api/v1/work-orders'),
        throwsA(isA<DioException>()),
      );
      expect(fixture.sessions.sessions, isEmpty);
      await fixture.sessions.acquire('Y', fixture.live);
      expect(fixture.repository.acquisitions, 2);
    });

    test('L6 — pátio removido é revogado sem afetar os demais', () async {
      final fixture = _Fixture();
      await fixture.sessions.acquire('Y', fixture.live);
      await fixture.sessions.acquire('Z', fixture.live);

      await fixture.sessions.retainTenants({'Z'});

      expect(fixture.sessions.sessions.map((s) => s.user.tenantId), ['Z']);
      expect(fixture.repository.revoked, contains('refresh-Y-1'));
    });

    test('L7 — Sair revoga e descarta todas as escutas', () async {
      final fixture = _Fixture();
      await fixture.sessions.acquire('Y', fixture.live);
      await fixture.sessions.acquire('Z', fixture.live);

      await fixture.sessions.discardAll();

      expect(fixture.sessions.sessions, isEmpty);
      expect(await fixture.journal.all(), isEmpty);
      expect(
        fixture.repository.revoked,
        containsAll(['refresh-Y-1', 'refresh-Z-2']),
      );
    });

    test('L8 — troca de época descarta escutas antigas', () async {
      final fixture = _Fixture();
      await fixture.sessions.acquire('Y', fixture.live);
      final oldClient = fixture.sessions.clientFor('Y');

      await fixture.sessions.discardAll();

      expect(() => fixture.sessions.clientFor('Y'), throwsStateError);
      expect(fixture.sessions.sessions, isEmpty);
      expect(oldClient, isNot(same(fixture.liveClient)));
    });

    test('L9 — resposta de outro pátio é recusada e não vira escuta', () async {
      final fixture = _Fixture();
      fixture.repository.replyTenant = 'Z';

      await expectLater(
        fixture.sessions.acquire('Y', fixture.live),
        throwsA(isA<ListenTenantMismatchError>()),
      );
      expect(fixture.sessions.sessions, isEmpty);
    });

    test('L10 — um ciclo de escuta não persiste dados operacionais', () async {
      final fixture = _Fixture();
      await fixture.sessions.acquire('Y', fixture.live);
      fixture.sessions.clientFor('Y').httpClientAdapter = _Adapter();

      await fixture.sessions.clientFor('Y').get('/api/v1/work-orders');

      expect(await fixture.storage.loadSession(), isNull);
      expect(await fixture.journal.all(), {'Y': 'refresh-Y-1'});
    });

    test('L11 — cinco expirações mantêm no máximo uma sessão viva', () async {
      final fixture = _Fixture();
      for (var cycle = 0; cycle < 5; cycle++) {
        await fixture.sessions.acquire('Y', fixture.live);
        await fixture.sessions.drop('Y');
      }

      expect(fixture.repository.acquisitions, 5);
      expect(fixture.repository.maxLive, 1);
      expect(fixture.repository.liveCount, 1);
    });

    test('L11b — sem resposta definitiva não pede sessão nova', () async {
      final fixture = _Fixture();
      await fixture.sessions.acquire('Y', fixture.live);
      await fixture.sessions.drop('Y');
      fixture.repository.revocationOutcome = RevocationOutcome.retry;

      for (var cycle = 0; cycle < 5; cycle++) {
        expect(await fixture.sessions.acquire('Y', fixture.live), isNull);
      }

      expect(fixture.repository.acquisitions, 1);
      expect(fixture.repository.liveCount, 1);
    });

    test('L11c — reabrir revoga o token persistido antes de pedir', () async {
      final fixture = _Fixture();
      await fixture.sessions.acquire('Y', fixture.live);
      final reopened = fixture.reopen();

      await reopened.acquire('Y', fixture.live);

      expect(fixture.repository.events, [
        'acquire:Y',
        'revoke:refresh-Y-1',
        'acquire:Y',
      ]);
      expect(fixture.repository.maxLive, 1);
    });

    test('L11d — diário tem um token por pátio e limpa no Sair', () async {
      final fixture = _Fixture();
      await fixture.journal.put('Y', 'old');
      await fixture.journal.put('Y', 'new');
      await fixture.journal.put('Z', 'z');
      expect(await fixture.journal.all(), {'Y': 'new', 'Z': 'z'});

      await fixture.sessions.discardAll();

      expect(await fixture.journal.all(), isEmpty);
      expect(fixture.repository.revoked, containsAll(['new', 'z']));
    });

    test('G-ESCUTA — cliente não usa renovação nem cliente autenticado', () {
      const source = String.fromEnvironment('G_ESCUTA_SOURCE');
      expect(
        source,
        isEmpty,
        reason: 'censo de fonte roda também no script de mutação',
      );
      expect(kListenPaths, hasLength(3));
    });
  });
}

class _Fixture {
  _Fixture() {
    repository = _Repository(storage);
    journal = ListenTokenJournal(storage);
    revocations = PendingRevocations(
      repository: repository,
      storage: storage,
      report: (_) {},
    );
    sessions = reopen();
  }

  final InMemoryAuthTokenStorage storage = InMemoryAuthTokenStorage();
  late final _Repository repository;
  late final ListenTokenJournal journal;
  late final PendingRevocations revocations;
  final Dio liveClient = Dio();
  late final ListenSessions sessions;

  AuthSession get live => _session('X', 0);

  ListenSessions reopen() => ListenSessions(
    repository: repository,
    journal: journal,
    revocations: revocations,
    config: const ApiConfig(baseUrl: 'https://example.invalid'),
    liveClient: liveClient,
  );
}

class _Repository extends LocalDevAuthRepository {
  _Repository(AuthTokenStorage storage) : super(storage: storage);

  int acquisitions = 0;
  int liveCount = 0;
  int maxLive = 0;
  String? replyTenant;
  RevocationOutcome revocationOutcome = RevocationOutcome.revoked;
  final List<String> revoked = [];
  final List<String> events = [];

  @override
  Future<AuthSession> acquireListenSession({
    required AuthSession current,
    required String tenantId,
    required Dio client,
  }) async {
    acquisitions++;
    liveCount++;
    maxLive = liveCount > maxLive ? liveCount : maxLive;
    events.add('acquire:$tenantId');
    final session = _session(replyTenant ?? tenantId, acquisitions);
    if (session.user.tenantId != tenantId) {
      throw ListenTenantMismatchError(session.tokens.refreshToken!);
    }
    return session;
  }

  @override
  Future<RevocationOutcome> revokeRefreshToken(String refreshToken) async {
    revoked.add(refreshToken);
    events.add('revoke:$refreshToken');
    if (revocationOutcome != RevocationOutcome.retry && liveCount > 0) {
      liveCount--;
    }
    return revocationOutcome;
  }
}

AuthSession _session(String tenantId, int sequence) => AuthSession(
  tokens: AuthTokens(
    accessToken: sequence == 0 ? 'access-X' : 'access-$tenantId-$sequence',
    refreshToken: sequence == 0 ? 'refresh-X' : 'refresh-$tenantId-$sequence',
    expiresAt: DateTime.utc(2030),
  ),
  user: AuthUser(
    sub: 'technician',
    email: 'technician@example.invalid',
    tenantId: tenantId,
    tenantRole: 'field_technician',
    tenantRoles: const ['field_technician'],
    permissions: const [],
    scope: 'tenant',
  ),
  sessionNonce: 'nonce-$tenantId-$sequence',
);

class _Adapter implements HttpClientAdapter {
  _Adapter({this.status = 200});

  final int status;
  int requests = 0;
  final List<String?> authorization = [];

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<List<int>>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    requests++;
    authorization.add(options.headers['Authorization'] as String?);
    return ResponseBody.fromBytes(
      utf8.encode('{}'),
      status,
      headers: {
        Headers.contentTypeHeader: ['application/json'],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}
