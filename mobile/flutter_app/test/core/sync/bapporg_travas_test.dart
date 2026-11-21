// B-APP-ORG (itens 69 e 70), F1 — o contrato comum das três travas contra
// mandar dado de uma sessão com o token de outra (Emenda 1 §A1, §A4, §A6).
//
// - T-b: cada cliente HTTP fica preso à sessão que o criou. Sessão viva
//   diferente → o pedido é recusado sem sair do aparelho, e o erro é o próprio
//   `ApiSessionChangedError` ("não tentou"). Sessão viva nula → sai como hoje.
// - T-a: a troca fecha a porta da sincronização e espera a passada em curso
//   parar no próximo limite de domínio, com prazo de 30 s.
// - T-c: a passada só roda quando o bootstrap é da sessão viva.
//
// Mutações literais que este arquivo pega (Emenda 1 §A4/§A6 e plano §5.6):
// M10a, M10b (só o T10b-retry), M11 (T10c), M12 (T16), M19 (T10b).
import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:erp_techsolutions_mobile/core/auth/auth_notifier.dart';
import 'package:erp_techsolutions_mobile/core/auth/auth_repository.dart';
import 'package:erp_techsolutions_mobile/core/auth/auth_token_storage.dart';
import 'package:erp_techsolutions_mobile/core/auth/session_http_client.dart';
import 'package:erp_techsolutions_mobile/core/auth/session_renewal.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_repository.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session_match.dart';
import 'package:erp_techsolutions_mobile/core/evidence/evidence_blob_store.dart';
import 'package:erp_techsolutions_mobile/core/evidence/evidence_sync.dart';
import 'package:erp_techsolutions_mobile/core/evidence/evidence_upload.dart';
import 'package:erp_techsolutions_mobile/core/location/field_location_api.dart';
import 'package:erp_techsolutions_mobile/core/location/field_location_service.dart';
import 'package:erp_techsolutions_mobile/core/location/field_location_store.dart';
import 'package:erp_techsolutions_mobile/core/network/api_error.dart';
import 'package:erp_techsolutions_mobile/core/network/auth_interceptor.dart';
import 'package:erp_techsolutions_mobile/core/network/http_client.dart';
import 'package:erp_techsolutions_mobile/core/permissions/permission_resolver.dart';
import 'package:erp_techsolutions_mobile/core/sync/auto_sync_coordinator.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_providers.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_reclaim_service.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_repository.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_replay_service.dart';
import 'package:erp_techsolutions_mobile/core/telemetry/telemetry_api.dart';
import 'package:erp_techsolutions_mobile/core/telemetry/telemetry_local_store.dart';
import 'package:erp_techsolutions_mobile/core/telemetry/telemetry_providers.dart';
import 'package:erp_techsolutions_mobile/core/telemetry/telemetry_sync_service.dart';
import 'package:erp_techsolutions_mobile/features/auth/auth_models.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_local_store.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

// ── T-b: o servidor de teste e o cliente real ────────────────────────────────

const _keyA = 'u-a|org-a|n1';
const _keyB = 'u-b|org-b|n2';

/// Conta os pedidos que de fato saíram do aparelho.
class _Server implements HttpClientAdapter {
  _Server(this.statusFor);

  final int Function(int n, RequestOptions o) statusFor;
  final List<RequestOptions> seen = [];

  /// O `Authorization` de cada pedido NO MOMENTO em que saiu (o interceptador
  /// reusa o mesmo `RequestOptions` na repetição e troca o cabeçalho depois).
  final List<String?> authSent = [];

  @override
  Future<ResponseBody> fetch(
    RequestOptions o,
    Stream<Uint8List>? s,
    Future<void>? c,
  ) async {
    seen.add(o);
    authSent.add(o.headers['Authorization'] as String?);
    final status = statusFor(seen.length, o);
    return ResponseBody.fromString(
      jsonEncode({'data': <String, dynamic>{}}),
      status,
      headers: {
        Headers.contentTypeHeader: ['application/json; charset=utf-8'],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}

class _Live {
  _Live(this.key, this.token);

  String? key;
  String? token;
  int renews = 0;
}

/// O cliente de produção (`createAuthenticatedHttpClient` + o interceptador
/// real), preso a [bound], com a sessão viva lida de [live].
Dio _client(
  _Server server,
  _Live live, {
  required String? bound,
  Future<SessionRenewalOutcome> Function()? onRenew,
}) {
  final dio = createAuthenticatedHttpClient(
    const ApiConfig(baseUrl: 'http://servidor-de-teste'),
    renew: (_, _) async {
      live.renews++;
      final renew = onRenew;
      if (renew == null) return const SessionDead();
      return renew();
    },
    expire: (_) async {},
    currentAccessToken: () => live.token,
    currentEpoch: () => 1,
    boundSessionKey: bound,
    currentSessionKey: () => live.key,
  );
  dio.httpClientAdapter = server;
  return dio;
}

Future<Object?> _call(Dio dio) async {
  try {
    await dio.post<dynamic>('/api/v1/mobile/sync/work-orders', data: {});
    return null;
  } on DioException catch (e) {
    return e;
  }
}

// ── T-a / T-c: o coordenador com os domínios gravando a ordem ────────────────

const _tenant = 'org-a';

AuthSession _authSession(String sub, String tenant, String nonce) =>
    AuthSession(
      tokens: AuthTokens(
        accessToken: 'tok-$sub',
        expiresAt: DateTime.now().toUtc().add(const Duration(hours: 1)),
      ),
      user: AuthUser(
        sub: sub,
        email: '$sub@exemplo.com',
        tenantId: tenant,
        tenantRole: 'field_technician',
        tenantRoles: const ['field_technician'],
        permissions: const ['work_orders:read'],
        scope: 'tenant',
      ),
      sessionNonce: nonce,
    );

/// A sessão viva fixa do teste (sem armazenamento, sem servidor).
class _FixedAuth extends AuthNotifier {
  _FixedAuth(this._session);

  final AuthSession? _session;

  @override
  Future<AuthState> build() async => _session == null
      ? const AuthState(status: AuthStatus.unauthenticated)
      : AuthState(status: AuthStatus.authenticated, session: _session);
}

BootstrapSession _bootstrap({String? ownerKey, String tenant = _tenant}) =>
    BootstrapSession(
      activeTenant: TenantContext(tenantId: tenant, displayName: 'Org A'),
      enabledModules: const [],
      permissions: const PermissionSet({'dashboard:read'}),
      ownerKey: ownerKey,
    );

const _empty = SyncReplayResult(synced: [], failed: [], conflicts: []);

/// O 1º domínio da passada. Com [barrier], fica preso até ela completar.
class _Reclaim extends SyncQueueReclaimService {
  _Reclaim(this.calls, SyncQueueRepository queue, {this.barrier})
    : super(queue: queue, expenseChannelOff: () => true);

  final List<String> calls;
  final Completer<void>? barrier;

  @override
  Future<void> reclaimTenant(String tenantId) async {
    calls.add('reclaim');
    final b = barrier;
    if (b != null) await b.future;
  }
}

class _FieldLocation extends FieldLocationSyncService {
  _FieldLocation(this.calls)
    : super(
        store: InMemoryFieldLocationStore(),
        api: const PendingFieldLocationApi(),
      );

  final List<String> calls;

  @override
  Future<FieldLocationSyncResult> syncTenant(String tenantId) {
    calls.add('field_location');
    return super.syncTenant(tenantId);
  }
}

class _Telemetry extends TelemetrySyncService {
  _Telemetry(this.calls)
    : super(
        store: InMemoryTelemetryLocalStore(),
        api: const PendingTelemetryApi(),
      );

  final List<String> calls;

  @override
  Future<TelemetryFlushSummary> flushTenant(String tenantId) {
    calls.add('telemetry');
    return super.flushTenant(tenantId);
  }
}

class _WorkOrders extends WorkOrderSyncReplayService {
  _WorkOrders(this.calls, SyncQueueRepository queue)
    : super(queue: queue, api: MockWorkOrderSyncBatchApi());

  final List<String> calls;

  @override
  Future<SyncReplayResult> replayTenant(String tenantId) async {
    calls.add('work_order');
    return _empty;
  }
}

class _Checklists extends ChecklistSyncReplayService {
  _Checklists(this.calls, SyncQueueRepository queue)
    : super(queue: queue, api: MockChecklistSyncBatchApi());

  final List<String> calls;

  @override
  Future<SyncReplayResult> replayTenant(String tenantId) async {
    calls.add('checklist');
    return _empty;
  }
}

class _Evidence extends EvidenceSyncReplayService {
  _Evidence(this.calls, SyncQueueRepository queue)
    : super(queue: queue, api: const PendingEvidenceSyncBatchApi());

  final List<String> calls;

  @override
  Future<SyncReplayResult> replayTenant(String tenantId) async {
    calls.add('evidence');
    return _empty;
  }
}

class _Expenses extends SyncReplayService {
  _Expenses(this.calls, SyncQueueRepository queue)
    : super(queue: queue, api: MockExpenseSyncBatchApi());

  final List<String> calls;

  @override
  Future<SyncReplayResult> replayTenant(String tenantId) async {
    calls.add('expense');
    return _empty;
  }
}

ProviderContainer _coordinator(
  List<String> calls, {
  required AuthSession? live,
  required BootstrapSession bootstrap,
  Completer<void>? barrier,
}) {
  final queue = InMemorySyncQueueRepository();
  return ProviderContainer(
    overrides: [
      authStateProvider.overrideWith(() => _FixedAuth(live)),
      bootstrapSessionProvider.overrideWith((ref) async => bootstrap),
      syncQueueRepositoryProvider.overrideWithValue(queue),
      syncQueueReclaimServiceProvider.overrideWithValue(
        _Reclaim(calls, queue, barrier: barrier),
      ),
      fieldLocationSyncServiceProvider.overrideWithValue(_FieldLocation(calls)),
      telemetrySyncServiceProvider.overrideWithValue(_Telemetry(calls)),
      workOrderSyncReplayServiceProvider.overrideWithValue(
        _WorkOrders(calls, queue),
      ),
      checklistSyncReplayServiceProvider.overrideWithValue(
        _Checklists(calls, queue),
      ),
      evidenceSyncReplayServiceProvider.overrideWithValue(
        _Evidence(calls, queue),
      ),
      syncReplayServiceProvider.overrideWithValue(_Expenses(calls, queue)),
      evidenceBinaryUploadServiceProvider.overrideWithValue(
        EvidenceBinaryUploadService(
          store: InMemoryWorkOrderLocalStore(),
          blobStore: InMemoryEvidenceBlobStore(),
          api: const PendingEvidenceUploadApi(),
        ),
      ),
    ],
  );
}

Future<AutoSyncCoordinator> _ready(ProviderContainer c) async {
  await c.read(authStateProvider.future);
  await c.read(bootstrapSessionProvider.future);
  c.read(autoSyncCoordinatorProvider);
  return c.read(autoSyncCoordinatorProvider.notifier);
}

final _sessionA = _authSession('u-a', _tenant, 'n1');
const _keyOfA = 'u-a|$_tenant|n1';

void main() {
  group('T-b — o cliente fica preso à sessão que o criou', () {
    test('T-b igual: com a chave viva igual à guardada, o pedido SAI, com o '
        'token da sessão', () async {
      final server = _Server((_, _) => 200);
      final live = _Live(_keyA, 'tok-a');
      final error = await _call(_client(server, live, bound: _keyA));

      expect(error, isNull);
      expect(server.seen, hasLength(1));
      expect(server.authSent.single, 'Bearer tok-a');
    });

    test('T-b nula: sem sessão viva, o pedido sai como hoje, SEM '
        'Authorization (a porta do 401 do #588 segue igual)', () async {
      final server = _Server((_, _) => 200);
      final live = _Live(null, null);
      final error = await _call(_client(server, live, bound: _keyA));

      expect(error, isNull);
      expect(server.seen, hasLength(1));
      expect(server.authSent.single, isNull);
    });

    test('T10b: cliente da sessão A usado com a sessão viva B → 0 pedido, e o '
        'erro é ApiSessionChangedError ("não tentou")', () async {
      final server = _Server((_, _) => 200);
      final live = _Live(_keyB, 'tok-b');
      final error = await _call(_client(server, live, bound: _keyA));

      expect(server.seen, isEmpty, reason: 'nada sai com o token de B');
      expect(error, isA<DioException>());
      final dioError = error! as DioException;
      expect(dioError.type, DioExceptionType.cancel);
      expect(dioError.error, isA<SessionChangedLocalError>());
      final mapped = mapDioError(dioError);
      expect(mapped, isA<ApiSessionChangedError>());
      expect(mapped, isNot(isA<ApiUnauthorizedError>()));
      expect(mapped, isNot(isA<ApiNetworkError>()));
      expect(mapped.safeMessage, kSessionChangedMessage);
      expect(live.renews, 0, reason: 'a recusa não dispara a renovação');
    });

    test('T10b sem sessão no nascimento: cliente criado sem sessão e usado '
        'depois de um login → 0 pedido, ApiSessionChangedError', () async {
      final server = _Server((_, _) => 200);
      final live = _Live(_keyB, 'tok-b');
      final error = await _call(_client(server, live, bound: null));

      expect(server.seen, isEmpty);
      expect(
        mapDioError(error! as DioException),
        isA<ApiSessionChangedError>(),
      );
    });

    test('T10b-retry: o pedido de A leva 401, a sessão vira B durante a '
        'renovação → a repetição é recusada: 1 pedido só', () async {
      final server = _Server((n, _) => n == 1 ? 401 : 200);
      final live = _Live(_keyA, 'tok-a');
      final error = await _call(
        _client(
          server,
          live,
          bound: _keyA,
          onRenew: () async {
            // A renovação de A devolve um token novo de A, mas, nesse meio
            // tempo, a sessão viva virou B.
            live.key = _keyB;
            live.token = 'tok-b';
            return const SessionRenewed('tok-a2');
          },
        ),
      );

      expect(live.renews, 1);
      expect(server.seen, hasLength(1), reason: 'a repetição não sai');
      expect(server.authSent.single, 'Bearer tok-a');
      expect(error, isA<DioException>());
      expect(
        mapDioError(error! as DioException),
        isA<ApiSessionChangedError>(),
      );
    });

    test('T10b-fiação: o sessionHttpClient guarda a chave do nascimento — '
        'depois de um login em outra organização, o cliente antigo não '
        'manda nada e o novo manda com o token novo', () async {
      final storage = InMemoryAuthTokenStorage();
      // Como os 16 providers de produção: segue a chave da sessão.
      final clientProvider = Provider<Dio>(
        (ref) =>
            sessionHttpClient(ref, ref.watch(authenticatedApiConfigProvider)),
      );
      final c = ProviderContainer(
        overrides: [
          authTokenStorageProvider.overrideWithValue(storage),
          authRepositoryProvider.overrideWithValue(
            LocalDevAuthRepository(storage: storage),
          ),
        ],
      );
      addTearDown(c.dispose);
      await c.read(authStateProvider.future);
      final auth = c.read(authStateProvider.notifier);
      await auth.login(email: 't@x', password: 'p', tenantId: 'org-a');
      final keyA = auth.liveSessionKey;
      expect(keyA, isNotNull);

      final serverA = _Server((_, _) => 200);
      final clientA = c.read(clientProvider)..httpClientAdapter = serverA;
      expect(await _call(clientA), isNull, reason: 'a vida normal não muda');
      expect(serverA.seen, hasLength(1));

      await auth.login(email: 't@x', password: 'p', tenantId: 'org-b');
      final keyB = auth.liveSessionKey;
      expect(keyB, isNot(keyA));

      final error = await _call(clientA);
      expect(serverA.seen, hasLength(1), reason: 'o cliente de A não manda');
      expect(
        mapDioError(error! as DioException),
        isA<ApiSessionChangedError>(),
      );

      final serverB = _Server((_, _) => 200);
      final clientB = c.read(clientProvider)..httpClientAdapter = serverB;
      expect(identical(clientA, clientB), isFalse);
      expect(await _call(clientB), isNull);
      final tokenB = c.read(authStateProvider).value!.session!.tokens;
      expect(serverB.authSent.single, 'Bearer ${tokenB.accessToken}');
    });
  });

  group('T-a — a troca fecha a porta e espera a passada', () {
    test('T10a-núcleo (a): com a passada presa no 1º domínio, a porta espera; '
        'solta a barreira, a passada para no limite seguinte e a porta '
        'devolve true', () async {
      final calls = <String>[];
      final barrier = Completer<void>();
      final c = _coordinator(
        calls,
        live: _sessionA,
        bootstrap: _bootstrap(ownerKey: _keyOfA),
        barrier: barrier,
      );
      addTearDown(c.dispose);
      final coordinator = await _ready(c);

      final pass = coordinator.triggerManual();
      await Future<void>.delayed(Duration.zero);
      expect(calls, ['reclaim']);

      bool? held;
      unawaited(coordinator.holdForSessionChange().then((v) => held = v));
      await Future<void>.delayed(Duration.zero);
      expect(held, isNull, reason: 'a porta espera a passada em curso');

      barrier.complete();
      await pass;
      await Future<void>.delayed(Duration.zero);

      expect(held, isTrue);
      expect(calls, [
        'reclaim',
      ], reason: 'a passada parou no limite de domínio seguinte');
      expect(c.read(autoSyncCoordinatorProvider).isRunning, isFalse);
      coordinator.releaseAfterSessionChange();
    });

    test('T10a-núcleo (b): passada que não termina → no prazo a porta '
        'devolve false e reabre; o prazo padrão é 30 s', () async {
      expect(kSessionChangeHoldTimeout, const Duration(seconds: 30));
      final calls = <String>[];
      final barrier = Completer<void>();
      final c = _coordinator(
        calls,
        live: _sessionA,
        bootstrap: _bootstrap(ownerKey: _keyOfA),
        barrier: barrier,
      );
      addTearDown(c.dispose);
      final coordinator = await _ready(c);

      final pass = coordinator.triggerManual();
      await Future<void>.delayed(Duration.zero);
      expect(calls, ['reclaim']);

      // Com o prazo padrão, a porta ainda espera depois de 300 ms.
      bool? heldDefault;
      unawaited(
        coordinator.holdForSessionChange().then((v) => heldDefault = v),
      );
      await Future<void>.delayed(const Duration(milliseconds: 300));
      expect(heldDefault, isNull, reason: 'o prazo padrão não é curto');

      // Com um prazo curto (o mesmo caminho), o prazo estoura: false.
      final held = await coordinator.holdForSessionChange(
        timeout: const Duration(milliseconds: 100),
      );
      expect(held, isFalse, reason: 'o prazo estourou: a troca não acontece');

      // A porta reabriu: solta a barreira e a passada segue até o fim.
      barrier.complete();
      await pass;
      expect(calls, contains('expense'));
    });

    test('T10c: uma passada pedida com a porta fechada não começa; com a '
        'porta reaberta, começa', () async {
      final calls = <String>[];
      final c = _coordinator(
        calls,
        live: _sessionA,
        bootstrap: _bootstrap(ownerKey: _keyOfA),
      );
      addTearDown(c.dispose);
      final coordinator = await _ready(c);

      expect(await coordinator.holdForSessionChange(), isTrue);
      await coordinator.triggerManual();
      expect(calls, isEmpty, reason: 'a troca está em curso: nada roda');
      expect(c.read(autoSyncCoordinatorProvider).isRunning, isFalse);

      coordinator.releaseAfterSessionChange();
      await coordinator.triggerManual();
      expect(calls.first, 'reclaim');
      expect(calls, contains('expense'));
    });
  });

  group('T-c — a passada só roda com o bootstrap da sessão viva', () {
    test('T16: bootstrap de A com a sessão viva B (a janela da troca) → a '
        'passada não roda nenhum domínio', () async {
      final calls = <String>[];
      final c = _coordinator(
        calls,
        live: _authSession('u-b', 'org-b', 'n2'),
        bootstrap: _bootstrap(ownerKey: _keyOfA),
      );
      addTearDown(c.dispose);
      final coordinator = await _ready(c);

      await coordinator.triggerManual();

      expect(calls, isEmpty);
      final state = c.read(autoSyncCoordinatorProvider);
      expect(state.isRunning, isFalse);
      expect(state.lastSyncAt, isNull);
    });

    test('T16 controle: o mesmo bootstrap com a sua própria sessão viva → a '
        'passada roda', () async {
      final calls = <String>[];
      final c = _coordinator(
        calls,
        live: _sessionA,
        bootstrap: _bootstrap(ownerKey: _keyOfA),
      );
      addTearDown(c.dispose);
      final coordinator = await _ready(c);

      await coordinator.triggerManual();

      expect(calls.first, 'reclaim');
      expect(c.read(autoSyncCoordinatorProvider).lastSyncAt, isNotNull);
    });

    test('bootstrapMatchesLiveSession: a regra, caso a caso', () {
      final liveA = AuthState(
        status: AuthStatus.authenticated,
        session: _sessionA,
      );
      final liveB = AuthState(
        status: AuthStatus.authenticated,
        session: _authSession('u-b', 'org-b', 'n2'),
      );
      const out = AuthState(status: AuthStatus.unauthenticated);

      expect(bootstrapMatchesLiveSession(null, liveA), isFalse);
      expect(
        bootstrapMatchesLiveSession(_bootstrap(ownerKey: _keyOfA), liveA),
        isTrue,
      );
      expect(
        bootstrapMatchesLiveSession(_bootstrap(ownerKey: _keyOfA), liveB),
        isFalse,
      );
      // Sem sessão viva: não há token a vazar (a regra da T-b).
      expect(
        bootstrapMatchesLiveSession(_bootstrap(ownerKey: _keyOfA), out),
        isTrue,
      );
      expect(
        bootstrapMatchesLiveSession(_bootstrap(ownerKey: _keyOfA), null),
        isTrue,
      );
      // Cache sem dono: só a organização do token.
      expect(bootstrapMatchesLiveSession(_bootstrap(), liveA), isTrue);
      expect(bootstrapMatchesLiveSession(_bootstrap(), liveB), isFalse);
    });
  });
}
