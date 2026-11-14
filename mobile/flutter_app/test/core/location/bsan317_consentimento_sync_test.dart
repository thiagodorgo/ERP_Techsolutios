// B-SAN3-17 (itens 18 e 52), raia do app: a decisão de consentimento chega
// ao servidor antes de qualquer posição, inclusive da telemetria (P4, P7, P8,
// P10 a P14 do plano v2; CR17R2-01 a 09 da Emenda 1 do v2; §2.5 da Emenda 1
// da abertura).
//
// Ordem do arquivo (F0 do plano): primeiro os casos que só usam a API de hoje
// (S6 e S10, este pelo coordenador real e pelos providers reais, com um
// servidor HTTP local de teste); depois os casos da API nova, que derrubam a
// compilação na base. O S7 e o S9 moram no arquivo "por pessoa" (eles têm de
// sair verdes na F3, e este arquivo só compila com a F4).
import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:erp_techsolutions_mobile/core/auth/auth_notifier.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_repository.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/evidence/evidence_blob_store.dart';
import 'package:erp_techsolutions_mobile/core/evidence/evidence_sync.dart';
import 'package:erp_techsolutions_mobile/core/evidence/evidence_upload.dart';
import 'package:erp_techsolutions_mobile/core/location/field_location_api.dart';
import 'package:erp_techsolutions_mobile/core/location/field_location_models.dart';
import 'package:erp_techsolutions_mobile/core/location/field_location_service.dart';
import 'package:erp_techsolutions_mobile/core/location/field_location_store.dart';
import 'package:erp_techsolutions_mobile/core/location/location_consent_api.dart';
import 'package:erp_techsolutions_mobile/core/location/location_consent_providers.dart';
import 'package:erp_techsolutions_mobile/core/location/location_consent_store.dart';
import 'package:erp_techsolutions_mobile/core/location/location_consent_sync.dart';
import 'package:erp_techsolutions_mobile/core/network/api_error.dart';
import 'package:erp_techsolutions_mobile/core/network/http_client.dart';
import 'package:erp_techsolutions_mobile/core/permissions/permission_resolver.dart';
import 'package:erp_techsolutions_mobile/core/sync/auto_sync_coordinator.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_providers.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_reclaim_service.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_repository.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_replay_service.dart';
import 'package:erp_techsolutions_mobile/core/telemetry/telemetry_api.dart';
import 'package:erp_techsolutions_mobile/core/telemetry/telemetry_codec.dart';
import 'package:erp_techsolutions_mobile/core/telemetry/telemetry_event.dart';
import 'package:erp_techsolutions_mobile/core/telemetry/telemetry_local_store.dart';
import 'package:erp_techsolutions_mobile/core/telemetry/telemetry_providers.dart';
import 'package:erp_techsolutions_mobile/core/telemetry/telemetry_sync_service.dart';
import 'package:erp_techsolutions_mobile/features/auth/auth_models.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_local_store.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';

const _tenant = 'tenant-bsan317-sync';
const _otherTenant = 'tenant-bsan317-outra';

// ── Fábricas de dado ──────────────────────────────────────────────────────────

FieldLocationEvent _point(
  String id, {
  String tenantId = _tenant,
  int retryCount = 0,
  SyncStatus status = SyncStatus.pending,
}) => FieldLocationEvent(
  localId: id,
  tenantId: tenantId,
  workOrderLocalId: 'wo-local-17',
  workOrderServerId: '7d0f1a52-2b8c-4a44-9e44-0c3a1f7d9b11',
  latitude: -23.5617,
  longitude: -46.6559,
  accuracyMeters: 8,
  recordedAt: DateTime.utc(2026, 11, 14, 3, int.parse(id.split('-').last)),
  syncStatus: status,
  retryCount: retryCount,
  createdAt: DateTime.utc(2026, 11, 14, 3),
);

TelemetryEvent _heartbeat(
  String id, {
  String tenantId = _tenant,
  SyncStatus status = SyncStatus.pending,
  int retryCount = 0,
}) => TelemetryEvent(
  localId: id,
  tenantId: tenantId,
  clientActionId: id,
  eventType: TelemetryEventType.heartbeat,
  capturedAt: DateTime.utc(2026, 11, 14, 3, 1),
  latitude: -23.5617,
  longitude: -46.6559,
  accuracyMeters: 5,
  syncStatus: status,
  retryCount: retryCount,
  createdAt: DateTime.utc(2026, 11, 14, 3, 1),
);

TelemetryEvent _connect(String id, {String tenantId = _tenant}) =>
    TelemetryEvent(
      localId: id,
      tenantId: tenantId,
      clientActionId: id,
      eventType: TelemetryEventType.appConnect,
      capturedAt: DateTime.utc(2026, 11, 14, 3, 2),
      syncStatus: SyncStatus.pending,
      retryCount: 0,
      createdAt: DateTime.utc(2026, 11, 14, 3, 2),
    );

// ── Falsos ───────────────────────────────────────────────────────────────────

/// API de posição falsa: grava cada envio; `errors` (um por chamada, em ordem)
/// faz a chamada falhar; `hold` segura o envio do índice dado até ser aberto.
class _FakeFieldLocationApi implements FieldLocationApi {
  _FakeFieldLocationApi({List<Object?>? errors, this.log})
    : _errors = errors ?? const [];

  final List<Object?> _errors;
  final List<String>? log;
  final List<String> sent = [];
  final Map<int, Completer<void>> hold = {};
  int _calls = 0;

  /// Quantas chamadas entraram (inclusive a que estiver presa).
  int get calls => _calls;

  @override
  Future<FieldLocationApiResponse> send(FieldLocationEvent event) async {
    final index = _calls++;
    final gate = hold[index];
    if (gate != null) await gate.future;
    log?.add('position');
    sent.add(event.localId);
    final error = index < _errors.length ? _errors[index] : null;
    if (error != null) throw error;
    return FieldLocationApiResponse(
      serverId: 'srv-${event.localId}',
      receivedAt: DateTime.utc(2026, 11, 14, 4),
    );
  }
}

class _RecordingTelemetryApi implements TelemetryApi {
  final List<List<TelemetryEvent>> batches = [];

  @override
  Future<List<TelemetrySyncResult>> sendBatch(
    List<TelemetryEvent> events,
  ) async {
    batches.add(List.of(events));
    return [
      for (final event in events)
        TelemetrySyncResult(
          clientActionId: event.clientActionId,
          status: 'accepted',
        ),
    ];
  }
}

// ── Arnês do coordenador (cópia do bo6r11_resgate_antes_do_primeiro_servico) ──

const _empty = SyncReplayResult(synced: [], failed: [], conflicts: []);

class _RecordingReclaim extends SyncQueueReclaimService {
  _RecordingReclaim(this.calls, SyncQueueRepository queue)
    : super(queue: queue, expenseChannelOff: () => true);

  final List<String> calls;

  @override
  Future<void> reclaimTenant(String tenantId) {
    calls.add('reclaim');
    return super.reclaimTenant(tenantId);
  }
}

class _RecordingWorkOrderReplay extends WorkOrderSyncReplayService {
  _RecordingWorkOrderReplay(this.calls, SyncQueueRepository queue)
    : super(queue: queue, api: MockWorkOrderSyncBatchApi());

  final List<String> calls;

  @override
  Future<SyncReplayResult> replayTenant(String tenantId) async {
    calls.add('work_order');
    return _empty;
  }
}

class _RecordingChecklistReplay extends ChecklistSyncReplayService {
  _RecordingChecklistReplay(this.calls, SyncQueueRepository queue)
    : super(queue: queue, api: MockChecklistSyncBatchApi());

  final List<String> calls;

  @override
  Future<SyncReplayResult> replayTenant(String tenantId) async {
    calls.add('checklist');
    return _empty;
  }
}

class _RecordingEvidenceReplay extends EvidenceSyncReplayService {
  _RecordingEvidenceReplay(this.calls, SyncQueueRepository queue)
    : super(queue: queue, api: const PendingEvidenceSyncBatchApi());

  final List<String> calls;

  @override
  Future<SyncReplayResult> replayTenant(String tenantId) async {
    calls.add('evidence');
    return _empty;
  }
}

class _RecordingExpenseReplay extends SyncReplayService {
  _RecordingExpenseReplay(this.calls, SyncQueueRepository queue)
    : super(queue: queue, api: MockExpenseSyncBatchApi());

  final List<String> calls;

  @override
  Future<SyncReplayResult> replayTenant(String tenantId) async {
    calls.add('expense');
    return _empty;
  }
}

class _RecordingTelemetrySync extends TelemetrySyncService {
  _RecordingTelemetrySync(
    this.calls, {
    required super.store,
    required super.api,
  });

  final List<String> calls;

  @override
  Future<TelemetryFlushSummary> flushTenant(String tenantId) {
    calls.add('telemetry');
    return super.flushTenant(tenantId);
  }
}

AuthSession _auth(String sub, String token) => AuthSession(
  tokens: AuthTokens(
    accessToken: token,
    expiresAt: DateTime.now().toUtc().add(const Duration(hours: 1)),
  ),
  user: AuthUser(
    sub: sub,
    email: '$sub@exemplo.com',
    tenantId: _tenant,
    tenantRole: 'field_technician',
    tenantRoles: const ['field_technician'],
    permissions: const ['field_location:send'],
    scope: 'tenant',
  ),
);

class _FakeAuth extends AuthNotifier {
  @override
  Future<AuthState> build() async => AuthState(
    status: AuthStatus.authenticated,
    session: _auth('user-a', 'tok-a1'),
  );

  void setSession(String sub, String token) {
    state = AsyncValue.data(
      AuthState(status: AuthStatus.authenticated, session: _auth(sub, token)),
    );
  }
}

BootstrapSession _boot(String sub) => BootstrapSession(
  activeTenant: const TenantContext(tenantId: _tenant, displayName: 'Org 17'),
  enabledModules: const [],
  permissions: const PermissionSet({'field_location:send'}),
  user: AuthenticatedUser(
    userId: sub,
    email: '$sub@exemplo.com',
    tenantRole: 'field_technician',
    tenantRoles: const ['field_technician'],
    scope: 'tenant',
  ),
);

/// Servidor HTTP local de teste (127.0.0.1, porta efêmera). Responde as duas
/// rotas de consentimento com `consentStatus` (503 ou 200) e grava cada
/// pedido. As outras rotas dão 404.
class _LocalServer {
  late HttpServer _server;
  int consentStatus = 503;
  final List<String> consentRequests = [];

  String get baseUrl => 'http://127.0.0.1:${_server.port}';

  Future<void> start() async {
    _server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
    _server.listen((request) async {
      final body = await utf8.decoder.bind(request).join();
      final path = request.uri.path;
      if (path.startsWith('/api/v1/mobile/location-consent')) {
        consentRequests.add(path);
        request.response.statusCode = consentStatus;
        request.response.headers.contentType = ContentType.json;
        if (consentStatus == 200) {
          final decoded = jsonDecode(body) as Map<String, dynamic>;
          final granted = !path.endsWith('/revoke');
          request.response.write(
            jsonEncode({
              'data': {
                'granted': granted,
                'granted_at': granted ? '2026-11-14T03:30:00.000Z' : null,
                'client_action_id': decoded['client_action_id'],
                'status': 'applied',
              },
            }),
          );
        } else {
          request.response.write(
            jsonEncode({
              'error': {'code': 'UNAVAILABLE', 'message': 'indisponível'},
            }),
          );
        }
      } else {
        request.response.statusCode = 404;
      }
      await request.response.close();
    });
  }

  Future<void> stop() => _server.close(force: true);
}

/// Devolve a rede de verdade (loopback) mesmo se o binding de teste tiver
/// trocado o `HttpClient` global.
class _RealHttp extends HttpOverrides {}

ProviderContainer _coordinatorContainer({
  required List<String> calls,
  required _LocalServer server,
  required TelemetryLocalStore telemetryStore,
  required TelemetryApi telemetryApi,
  FieldLocationStore? fieldStore,
  List<Override> extra = const [],
}) {
  final queue = InMemorySyncQueueRepository();
  return ProviderContainer(
    overrides: [
      authStateProvider.overrideWith(_FakeAuth.new),
      bootstrapSessionProvider.overrideWith((ref) async {
        final auth = await ref.watch(authStateProvider.future);
        return _boot(auth.session!.user.sub);
      }),
      authenticatedApiConfigProvider.overrideWithValue(
        ApiConfig(baseUrl: server.baseUrl, accessToken: 'tok-a1'),
      ),
      fieldLocationStoreProvider.overrideWithValue(
        fieldStore ?? InMemoryFieldLocationStore(),
      ),
      telemetryLocalStoreProvider.overrideWithValue(telemetryStore),
      telemetryApiProvider.overrideWithValue(telemetryApi),
      telemetrySyncServiceProvider.overrideWith(
        (ref) => _RecordingTelemetrySync(
          calls,
          store: ref.watch(telemetryLocalStoreProvider),
          api: ref.watch(telemetryApiProvider),
        ),
      ),
      syncQueueRepositoryProvider.overrideWithValue(queue),
      syncQueueReclaimServiceProvider.overrideWithValue(
        _RecordingReclaim(calls, queue),
      ),
      workOrderSyncReplayServiceProvider.overrideWithValue(
        _RecordingWorkOrderReplay(calls, queue),
      ),
      checklistSyncReplayServiceProvider.overrideWithValue(
        _RecordingChecklistReplay(calls, queue),
      ),
      evidenceSyncReplayServiceProvider.overrideWithValue(
        _RecordingEvidenceReplay(calls, queue),
      ),
      syncReplayServiceProvider.overrideWithValue(
        _RecordingExpenseReplay(calls, queue),
      ),
      evidenceBinaryUploadServiceProvider.overrideWithValue(
        EvidenceBinaryUploadService(
          store: InMemoryWorkOrderLocalStore(),
          blobStore: InMemoryEvidenceBlobStore(),
          api: const PendingEvidenceUploadApi(),
        ),
      ),
      ...extra,
    ],
  );
}

Future<void> _runPass(ProviderContainer container) async {
  await container.read(bootstrapSessionProvider.future);
  container.read(autoSyncCoordinatorProvider);
  await HttpOverrides.runWithHttpOverrides(
    () => container.read(autoSyncCoordinatorProvider.notifier).triggerManual(),
    _RealHttp(),
  );
}

int _gpsIn(List<List<TelemetryEvent>> batches) =>
    batches.expand((b) => b).where((e) => e.latitude != null).length;

void main() {
  setUp(() => FlutterSecureStorage.setMockInitialValues({}));

  // ── Casos que só usam a API de hoje ────────────────────────────────────────

  test('S6. sem consentSync, o envio de posições é o de hoje (casos 11 a 14 '
      'do b105)', () async {
    // 11: sucesso marca synced
    final s11 = InMemoryFieldLocationStore();
    await s11.save(_point('p-1'));
    final r11 = await FieldLocationSyncService(
      store: s11,
      api: _FakeFieldLocationApi(),
    ).syncTenant(_tenant);
    final l11 = (await s11.eventsForTenant(_tenant)).single;
    expect(r11.synced, hasLength(1));
    expect(l11.syncStatus, SyncStatus.synced);
    expect(l11.serverId, 'srv-p-1');
    expect(l11.syncedAt, isNotNull);

    // 12: erro de rede marca failed, com nova tentativa
    final s12 = InMemoryFieldLocationStore();
    await s12.save(_point('p-1'));
    final r12 = await FieldLocationSyncService(
      store: s12,
      api: _FakeFieldLocationApi(errors: [const ApiNetworkError()]),
    ).syncTenant(_tenant);
    final l12 = (await s12.eventsForTenant(_tenant)).single;
    expect(r12.failed, hasLength(1));
    expect(l12.syncStatus, SyncStatus.failed);
    expect(l12.retryCount, 1);
    expect(l12.lastErrorCode, 'NETWORK_ERROR');

    // 13: erro de validação marca failed seguro
    final s13 = InMemoryFieldLocationStore();
    await s13.save(_point('p-1'));
    await FieldLocationSyncService(
      store: s13,
      api: _FakeFieldLocationApi(
        errors: [
          const ApiServerError(
            statusCode: 400,
            safeMessage: 'Localizacao invalida.',
          ),
        ],
      ),
    ).syncTenant(_tenant);
    final l13 = (await s13.eventsForTenant(_tenant)).single;
    expect(l13.syncStatus, SyncStatus.failed);
    expect(l13.lastErrorCode, 'VALIDATION_ERROR');
    expect(l13.lastSafeError, 'Localizacao invalida.');

    // 14: maxRetry respeitado
    final s14 = InMemoryFieldLocationStore();
    await s14.save(_point('p-1', retryCount: 5));
    final api14 = _FakeFieldLocationApi();
    final r14 = await FieldLocationSyncService(
      store: s14,
      api: api14,
      maxRetry: 5,
    ).syncTenant(_tenant);
    expect(r14.synced, isEmpty);
    expect(api14.sent, isEmpty);
  });

  test('S10. revogação pendente e 5xx no envio da decisão → 0 lote de '
      'telemetria; depois do envio, o lote sai', () async {
    final server = _LocalServer();
    await server.start();
    addTearDown(server.stop);
    final calls = <String>[];
    final telemetryApi = _RecordingTelemetryApi();
    final telemetryStore = InMemoryTelemetryLocalStore([
      _heartbeat('hb-1'),
      _connect('ac-1'),
    ]);
    final c = _coordinatorContainer(
      calls: calls,
      server: server,
      telemetryStore: telemetryStore,
      telemetryApi: telemetryApi,
    );
    addTearDown(c.dispose);
    await c.read(bootstrapSessionProvider.future);

    // O técnico aceita e revoga no aparelho; a revogação ainda não chegou à
    // organização (o servidor responde 503).
    await c.read(locationConsentStoreProvider).acceptManualCapture();
    await c.read(locationConsentStoreProvider).clearManualCapture();
    server.consentStatus = 503;
    await _runPass(c);
    final batchesWhilePending = telemetryApi.batches.length;
    final gpsWhilePending = _gpsIn(telemetryApi.batches);
    final callsWhilePending = List.of(calls);

    // A organização volta a responder: a revogação é registrada.
    server.consentStatus = 200;
    calls.clear();
    await _runPass(c);

    // ignore: avoid_print
    print(
      'BSAN317-S10 pendente:[lotes=$batchesWhilePending gps=$gpsWhilePending '
      'chamadas=${callsWhilePending.join(',')}] '
      'depois:[lotes=${telemetryApi.batches.length} '
      'consentimento=${server.consentRequests.join(',')}]',
    );

    expect(
      batchesWhilePending,
      0,
      reason: 'S10: com a revogação pendente, nenhum lote de telemetria sai',
    );
    expect(callsWhilePending, containsAll(['work_order', 'checklist']));
    expect(
      server.consentRequests.where((p) => p.endsWith('/revoke')),
      isNotEmpty,
      reason: 'a revogação foi enviada',
    );
    expect(
      telemetryApi.batches,
      hasLength(1),
      reason: 'S10: depois que a organização registra, o lote sai',
    );
  });

  // ── Casos da API nova (derrubam a compilação na base) ──────────────────────

  group('LocationConsentSync', () {
    const a = LocationConsentOwner(tenantId: _tenant, userId: 'user-a');
    const b = LocationConsentOwner(tenantId: _tenant, userId: 'user-b');

    late List<String> log;
    late LocationConsentOwner? owner;
    late DateTime now;
    late SecureLocationConsentStore store;
    late _FakeConsentApi consentApi;
    late InMemoryFieldLocationStore fieldStore;
    late InMemoryTelemetryLocalStore telemetryStore;
    late LocationConsentSync sync;

    LocationConsentSync buildSync(LocationConsentStore s) =>
        LocationConsentSync(
          store: s,
          currentOwner: () => owner,
          api: () => consentApi,
          fieldLocationStore: () => fieldStore,
          telemetryStore: () => telemetryStore,
        );

    setUp(() {
      log = [];
      owner = a;
      now = DateTime.utc(2026, 11, 14, 3, 30);
      store = SecureLocationConsentStore(
        const FlutterSecureStorage(),
        ownerResolver: () => owner,
        clock: () => now,
      );
      consentApi = _FakeConsentApi(log);
      fieldStore = InMemoryFieldLocationStore();
      telemetryStore = InMemoryTelemetryLocalStore();
      sync = buildSync(store);
    });

    Future<void> grantedAndRegistered() async {
      await sync.accept(_tenant);
      expect(await sync.readyToSendPositions(_tenant), isTrue);
      log.clear();
      consentApi.calls.clear();
    }

    Future<List<FieldLocationEvent>> pendingPoints() =>
        fieldStore.pendingForTenant(_tenant, maxRetry: 5);

    Future<int> gpsInBuffer([String tenantId = _tenant]) async =>
        (await telemetryStore.eventsForTenant(
          tenantId,
        )).where((e) => e.latitude != null).length;

    test('S1. decisão pendente → a ordem é [consentimento, posição]', () async {
      await store.acceptManualCapture(); // pendente, sem rede ainda
      await fieldStore.save(_point('p-1'));
      final positionApi = _FakeFieldLocationApi(log: log);
      final service = FieldLocationSyncService(
        store: fieldStore,
        api: positionApi,
        consentSync: sync,
      );

      await service.syncTenant(_tenant);

      expect(log, ['consent:grant', 'position']);
    });

    test('S2. a rede falha no envio da decisão → 0 posição; o retryCount não '
        'muda', () async {
      await store.acceptManualCapture();
      await fieldStore.save(_point('p-1'));
      consentApi.script.add(const ApiNetworkError());
      final positionApi = _FakeFieldLocationApi(log: log);
      final service = FieldLocationSyncService(
        store: fieldStore,
        api: positionApi,
        consentSync: sync,
      );

      final result = await service.syncTenant(_tenant);
      final point = (await fieldStore.eventsForTenant(_tenant)).single;

      expect(positionApi.sent, isEmpty);
      expect(result.skipped.map((e) => e.localId), ['p-1']);
      expect(point.retryCount, 0);
      expect(point.syncStatus, SyncStatus.pending);
      expect(await store.pendingDecisionFor(a), isNotNull);
    });

    test('S3. 422 operator_profile_required no envio da decisão → 0 posição; '
        'estado "cadastro ausente"', () async {
      await store.acceptManualCapture();
      await fieldStore.save(_point('p-1'));
      consentApi.script.add(
        const LocationConsentRefusedError('operator_profile_required'),
      );
      final positionApi = _FakeFieldLocationApi(log: log);
      final service = FieldLocationSyncService(
        store: fieldStore,
        api: positionApi,
        consentSync: sync,
      );

      await service.syncTenant(_tenant);

      expect(positionApi.sent, isEmpty);
      expect(
        (await store.status()).serverState,
        LocationConsentServerState.profileMissing,
      );
      expect(await store.pendingDecisionFor(a), isNotNull);
    });

    test('S3b. depois do 422 de cadastro ausente, o passe seguinte REENVIA a '
        'decisão, sem gastar tentativa', () async {
      await store.acceptManualCapture();
      await fieldStore.save(_point('p-1'));
      consentApi.script.addAll([
        const LocationConsentRefusedError('operator_profile_required'),
        const LocationConsentRefusedError('operator_profile_required'),
      ]);
      final service = FieldLocationSyncService(
        store: fieldStore,
        api: _FakeFieldLocationApi(log: log),
        consentSync: sync,
      );

      await service.syncTenant(_tenant);
      await service.syncTenant(_tenant);

      expect(
        consentApi.calls.where((c) => c.startsWith('grant')),
        hasLength(2),
        reason: 'S3b: a decisão continua pendente e é reenviada',
      );
      expect((await fieldStore.eventsForTenant(_tenant)).single.retryCount, 0);
    });

    test('S4. a posição volta 422 tracking_consent_required → o local volta a '
        '"não decidiu", pontos e pulsos com GPS apagados, sem nova '
        'tentativa', () async {
      await grantedAndRegistered();
      await fieldStore.save(_point('p-1'));
      await fieldStore.save(_point('p-2'));
      await telemetryStore.enqueue(_heartbeat('hb-1'));
      await telemetryStore.enqueue(_connect('ac-1'));
      final positionApi = _FakeFieldLocationApi(
        errors: [
          const LocationConsentRefusedError('tracking_consent_required'),
        ],
      );
      final service = FieldLocationSyncService(
        store: fieldStore,
        api: positionApi,
        consentSync: sync,
      );

      await service.syncTenant(_tenant);
      final status = await store.status();

      expect(await store.hasAcceptedManualCapture(), isFalse);
      expect(status.needsDecision, isTrue);
      expect(await pendingPoints(), isEmpty);
      expect(await gpsInBuffer(), 0);
      expect(
        (await telemetryStore.eventsForTenant(_tenant)).map((e) => e.localId),
        ['ac-1'],
      );
      expect(positionApi.sent, ['p-1'], reason: 'S4: sem nova tentativa');
      expect(consentApi.calls, isEmpty, reason: 'nunca re-concede sozinho');
    });

    test('S5. revogar → os pontos não enviados somem; só a revogação vai ao '
        'servidor', () async {
      await grantedAndRegistered();
      await fieldStore.save(_point('p-1'));
      await fieldStore.save(_point('p-2', status: SyncStatus.failed));
      await fieldStore.save(_point('p-9', tenantId: _otherTenant));
      final positionApi = _FakeFieldLocationApi(log: log);
      final service = FieldLocationSyncService(
        store: fieldStore,
        api: positionApi,
        consentSync: sync,
      );

      await sync.revoke(_tenant);
      await service.syncTenant(_tenant);

      expect(await pendingPoints(), isEmpty);
      expect(
        await fieldStore.pendingForTenant(_otherTenant, maxRetry: 5),
        hasLength(1),
        reason: 'a outra organização não é tocada',
      );
      expect(log, ['consent:revoke']);
      expect(positionApi.sent, isEmpty);
      expect(await store.hasAcceptedManualCapture(), isFalse);
    });

    test('S8. o aceite fica preso antes de aplicar; o técnico revoga; o app '
        'pede o acerto de novo → o servidor falso termina "revogado", um envio '
        'em voo por vez, 0 posição', () async {
      // Cabeçalho declarado (Emenda 1 da abertura, 2.5): o servidor falso NÃO
      // tem guarda de data e aplica na ordem de chegada; o primeiro aceite
      // espera um portão ANTES de aplicar (enquanto fechado, o estado dele não
      // muda e o envio não entra no registro); o teste assere a concorrência
      // máxima de envios em voo.
      final gate = Completer<void>();
      consentApi.holdFirstGrantBeforeApply = gate;
      await fieldStore.save(_point('p-1'));
      final positionApi = _FakeFieldLocationApi(log: log);
      final service = FieldLocationSyncService(
        store: fieldStore,
        api: positionApi,
        consentSync: sync,
      );

      final first = sync.accept(_tenant); // o aceite fica preso no portão
      await Future<void>.delayed(const Duration(milliseconds: 5));
      final second = sync.revoke(_tenant); // o técnico revoga no aparelho
      await Future<void>.delayed(const Duration(milliseconds: 5));
      final third = sync.settleDecision(_tenant); // o app pede o acerto de novo
      await Future<void>.delayed(const Duration(milliseconds: 5));
      gate.complete();
      await Future.wait<Object?>([first, second, third]);
      await sync.settleDecision(_tenant);
      await service.syncTenant(_tenant);

      // ignore: avoid_print
      print(
        'BSAN317-S8 envios=${consentApi.applied.join(',')} '
        'servidor=${consentApi.serverConsent} '
        'max_em_voo=${consentApi.maxInFlight} posicoes=${positionApi.sent}',
      );
      expect(consentApi.applied, ['grant', 'revoke']);
      expect(consentApi.serverConsent, isFalse);
      expect(consentApi.maxInFlight, 1);
      expect(positionApi.sent, isEmpty);
    });

    test('S11. revogar → 0 pulso com coordenada no buffer da telemetria '
        'daquela organização; os sem GPS ficam', () async {
      await grantedAndRegistered();
      await telemetryStore.enqueue(_heartbeat('hb-1'));
      await telemetryStore.enqueue(
        _heartbeat('hb-2', status: SyncStatus.failed, retryCount: 1),
      );
      await telemetryStore.enqueue(_connect('ac-1'));
      await telemetryStore.enqueue(_heartbeat('hb-9', tenantId: _otherTenant));

      await sync.revoke(_tenant);

      expect(await gpsInBuffer(), 0);
      expect(
        (await telemetryStore.eventsForTenant(_tenant)).map((e) => e.localId),
        ['ac-1'],
      );
      expect(await gpsInBuffer(_otherTenant), 1);
    });

    for (final refusal in <String, Object>{
      'superseded': 'superseded',
      '403 no aceite': const LocationConsentRefusedError(
        'permission_required',
        statusCode: 403,
      ),
    }.entries) {
      test('S12. ${refusal.key} → "confirme de novo", o não enviado com GPS '
          'apagado, readyToSendPositions falso', () async {
        await store.acceptManualCapture();
        await fieldStore.save(_point('p-1'));
        await telemetryStore.enqueue(_heartbeat('hb-1'));
        await telemetryStore.enqueue(_connect('ac-1'));
        consentApi.script.add(
          refusal.value == 'superseded'
              ? LocationConsentApiResult(
                  status: LocationConsentApiStatus.superseded,
                  granted: false,
                  profileUpdatedAt: DateTime.utc(2026, 11, 14, 3, 40),
                )
              : refusal.value,
        );

        final settled = await sync.settleDecision(_tenant);
        final status = await store.status();

        expect(settled, isTrue, reason: 'nada ficou pendente');
        expect(status.needsDecision, isTrue);
        expect(status.needsReconfirm, isTrue, reason: '"Confirme de novo"');
        expect(await store.hasAcceptedManualCapture(), isFalse);
        expect(await sync.readyToSendPositions(_tenant), isFalse);
        expect(await pendingPoints(), isEmpty);
        expect(await gpsInBuffer(), 0);
        expect(await store.pendingDecisionFor(a), isNull);
      });
    }

    test(
      'S13. a sessão troca de A para B entre ler a decisão de A e enviá-la '
      '→ 0 envio com a sessão de B; a decisão de A continua pendente',
      () async {
        final gated = _GatedStore(
          const FlutterSecureStorage(),
          ownerResolver: () => owner,
        );
        final gatedSync = buildSync(gated);
        await gated.acceptManualCapture();
        final gate = Completer<void>();
        gated.gateNextRead = gate;

        final settling = gatedSync.settleDecision(_tenant);
        await gated.readStarted.future; // a decisão de A já foi lida
        owner = b; // a sessão troca antes do envio
        gate.complete();
        final settled = await settling;

        expect(settled, isFalse);
        expect(
          consentApi.calls,
          isEmpty,
          reason: 'S13: 0 envio com a sessão de B',
        );
        owner = a;
        expect(await gated.pendingDecisionFor(a), isNotNull);
      },
    );

    for (final inFlightFails in [false, true]) {
      test('S14. revogar com um envio de posição em voo → 0 envio depois da '
          'revogação além do que estava em voo e 0 ponto pendente no fim '
          '(envio em voo ${inFlightFails ? 'falha' : 'dá certo'})', () async {
        await grantedAndRegistered();
        await fieldStore.save(_point('p-1'));
        await fieldStore.save(_point('p-2'));
        await fieldStore.save(_point('p-3'));
        final positionApi = _FakeFieldLocationApi(
          errors: [if (inFlightFails) const ApiNetworkError()],
        );
        final held = Completer<void>();
        positionApi.hold[0] = held;
        final service = FieldLocationSyncService(
          store: fieldStore,
          api: positionApi,
          consentSync: sync,
        );

        final syncing = service.syncTenant(_tenant);
        await Future<void>.delayed(const Duration(milliseconds: 5));
        await sync.revoke(_tenant);
        held.complete();
        await syncing;

        expect(positionApi.calls, 1, reason: 'S14: só o que estava em voo');
        expect(await pendingPoints(), isEmpty, reason: 'S14: nada é recriado');
      });
    }

    test('S15. 400 no aceite → "confirme de novo", settleDecision verdadeiro, '
        'sem laço, e o lote sem GPS sai', () async {
      await store.acceptManualCapture();
      await telemetryStore.enqueue(_heartbeat('hb-1'));
      await telemetryStore.enqueue(_connect('ac-1'));
      consentApi.script.add(
        const LocationConsentRefusedError('invalid_date', statusCode: 400),
      );
      final telemetryApi = _RecordingTelemetryApi();

      final settled = await sync.settleDecision(_tenant);
      final again = await sync.settleDecision(_tenant);
      if (settled) {
        await TelemetrySyncService(
          store: telemetryStore,
          api: telemetryApi,
        ).flushTenant(_tenant);
      }

      expect(settled, isTrue, reason: 'S15: o portão não fica preso');
      expect(again, isTrue);
      expect(consentApi.calls, hasLength(1), reason: 'S15: sem laço');
      expect((await store.status()).needsReconfirm, isTrue);
      expect(telemetryApi.batches, hasLength(1));
      expect(telemetryApi.batches.single.map((e) => e.localId), ['ac-1']);
    });

    test('S16. a nova confirmação depois de um superseded usa decided_at = '
        'max(agora do aparelho, profile_updated_at + 1 ms)', () async {
      final profileUpdatedAt = DateTime.utc(2026, 11, 14, 4, 30);
      now = DateTime.utc(2026, 11, 14, 3, 30); // relógio 1 h atrás do perfil
      await store.acceptManualCapture();
      final old = (await store.pendingDecisionFor(a))!;
      consentApi.script.add(
        LocationConsentApiResult(
          status: LocationConsentApiStatus.superseded,
          granted: false,
          profileUpdatedAt: profileUpdatedAt,
        ),
      );
      await sync.settleDecision(_tenant);

      await store.acceptManualCapture(); // a reconfirmação do titular
      final fresh = (await store.pendingDecisionFor(a))!;

      expect(old.decidedAt, DateTime.utc(2026, 11, 14, 3, 30));
      expect(
        fresh.decidedAt,
        profileUpdatedAt.add(const Duration(milliseconds: 1)),
        reason: 'S16: posterior ao estado que o titular viu',
      );

      now = DateTime.utc(2026, 11, 14, 5); // relógio já adiante do perfil
      await store.clearManualCapture();
      await store.acceptManualCapture();
      expect((await store.pendingDecisionFor(a))!.decidedAt, now);
    });
  });

  group('fiação dos providers', () {
    test('S9b. o LocationConsentSync é o MESMO depois do refresh de token, e '
        'é o que o fieldLocationSyncServiceProvider usa', () async {
      final c = ProviderContainer(
        overrides: [
          authStateProvider.overrideWith(_FakeAuth.new),
          bootstrapSessionProvider.overrideWith((ref) async {
            final auth = await ref.watch(authStateProvider.future);
            await Future<void>.delayed(const Duration(milliseconds: 30));
            return _boot(auth.session!.user.sub);
          }),
          fieldLocationStoreProvider.overrideWithValue(
            InMemoryFieldLocationStore(),
          ),
          telemetryLocalStoreProvider.overrideWithValue(
            InMemoryTelemetryLocalStore(),
          ),
        ],
      );
      addTearDown(c.dispose);
      c.listen(locationConsentSyncProvider, (_, _) {});
      c.listen(fieldLocationSyncServiceProvider, (_, _) {});
      await c.read(bootstrapSessionProvider.future);

      final s1 = c.read(locationConsentSyncProvider);
      expect(
        identical(c.read(fieldLocationSyncServiceProvider).consentSync, s1),
        isTrue,
      );

      (c.read(authStateProvider.notifier) as _FakeAuth).setSession(
        'user-a',
        'tok-a2',
      );
      await Future<void>.delayed(const Duration(milliseconds: 5));
      await c.read(bootstrapSessionProvider.future);

      final s2 = c.read(locationConsentSyncProvider);
      expect(identical(s1, s2), isTrue, reason: 'S9b: estável no refresh');
      expect(
        identical(c.read(fieldLocationSyncServiceProvider).consentSync, s1),
        isTrue,
      );
    });

    for (final mode in ['o provider lança', 'o portão lança']) {
      test('S10c. $mode → OS, vistoria, evidência e despesa ainda rodam; a '
          'telemetria não', () async {
        final server = _LocalServer();
        await server.start();
        addTearDown(server.stop);
        final calls = <String>[];
        final c = _coordinatorContainer(
          calls: calls,
          server: server,
          telemetryStore: InMemoryTelemetryLocalStore([_connect('ac-1')]),
          telemetryApi: _RecordingTelemetryApi(),
          extra: [
            if (mode == 'o provider lança')
              locationConsentSyncProvider.overrideWith(
                (ref) => throw StateError('portão indisponível'),
              )
            else
              locationConsentSyncProvider.overrideWith(
                (ref) => _ThrowingSync(
                  store: ref.watch(locationConsentStoreProvider),
                  currentOwner: () => null,
                  api: () => const PendingLocationConsentApi(),
                  fieldLocationStore: () => InMemoryFieldLocationStore(),
                  telemetryStore: () => InMemoryTelemetryLocalStore(),
                ),
              ),
          ],
        );
        addTearDown(c.dispose);

        await _runPass(c);

        expect(
          calls,
          containsAll(['work_order', 'checklist', 'evidence', 'expense']),
        );
        expect(calls, isNot(contains('telemetry')));
      });
    }
  });
}

// ── Falsos da API nova ─────────────────────────────────────────────────────────

/// Servidor de consentimento falso, SEM guarda de data: aplica na ordem de
/// chegada. `script` dá a resposta de cada chamada, em ordem (um
/// `LocationConsentApiResult` ou um erro); sem roteiro, aplica.
class _FakeConsentApi implements LocationConsentApi {
  _FakeConsentApi(this.log);

  final List<String> log;
  final List<Object> script = [];
  final List<String> calls = [];
  final List<String> applied = [];
  bool? serverConsent;
  Completer<void>? holdFirstGrantBeforeApply;
  int _inFlight = 0;
  int maxInFlight = 0;

  @override
  Future<LocationConsentApiResult> grant(LocationConsentDecision decision) =>
      _send('grant', decision);

  @override
  Future<LocationConsentApiResult> revoke(LocationConsentDecision decision) =>
      _send('revoke', decision);

  Future<LocationConsentApiResult> _send(
    String kind,
    LocationConsentDecision decision,
  ) async {
    _inFlight++;
    if (_inFlight > maxInFlight) maxInFlight = _inFlight;
    try {
      final gate = kind == 'grant' ? holdFirstGrantBeforeApply : null;
      if (gate != null) {
        holdFirstGrantBeforeApply = null;
        await gate.future; // o pedido "chega" quando o portão abre
      }
      calls.add('$kind:${decision.clientActionId}');
      log.add('consent:$kind');
      final scripted = script.isEmpty ? null : script.removeAt(0);
      if (scripted is LocationConsentApiResult) return scripted;
      if (scripted != null) throw scripted;
      serverConsent = decision.granted;
      applied.add(kind);
      return LocationConsentApiResult(
        status: LocationConsentApiStatus.applied,
        granted: decision.granted,
        grantedAt: decision.granted ? decision.decidedAt : null,
      );
    } finally {
      _inFlight--;
    }
  }
}

/// Store real com um portão depois da leitura da decisão pendente (S13).
class _GatedStore extends SecureLocationConsentStore {
  _GatedStore(super.storage, {required super.ownerResolver});

  Completer<void>? gateNextRead;
  final Completer<void> readStarted = Completer<void>();

  @override
  Future<LocationConsentDecision?> pendingDecisionFor(
    LocationConsentOwner owner,
  ) async {
    final decision = await super.pendingDecisionFor(owner);
    final gate = gateNextRead;
    if (gate != null) {
      gateNextRead = null;
      if (!readStarted.isCompleted) readStarted.complete();
      await gate.future;
    }
    return decision;
  }
}

class _ThrowingSync extends LocationConsentSync {
  _ThrowingSync({
    required super.store,
    required super.currentOwner,
    required super.api,
    required super.fieldLocationStore,
    required super.telemetryStore,
  });

  @override
  Future<bool> settleDecision(String tenantId) =>
      Future.error(StateError('portão indisponível'));
}
