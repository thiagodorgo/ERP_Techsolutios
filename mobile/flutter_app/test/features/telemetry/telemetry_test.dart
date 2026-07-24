import 'dart:convert';
import 'dart:io';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:drift/native.dart';
import 'package:erp_techsolutions_mobile/core/local_db/app_database.dart';
import 'package:erp_techsolutions_mobile/core/location/device_location_provider.dart';
import 'package:erp_techsolutions_mobile/core/location/field_location_models.dart';
import 'package:erp_techsolutions_mobile/core/location/location_consent_store.dart';
import 'package:erp_techsolutions_mobile/core/network/api_contracts.dart';
import 'package:erp_techsolutions_mobile/core/network/api_error.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_factory.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_store.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_repository.dart';
import 'package:erp_techsolutions_mobile/core/telemetry/telemetry_api.dart';
import 'package:erp_techsolutions_mobile/core/telemetry/telemetry_capture_service.dart';
import 'package:erp_techsolutions_mobile/core/telemetry/telemetry_codec.dart';
import 'package:erp_techsolutions_mobile/core/telemetry/telemetry_event.dart';
import 'package:erp_techsolutions_mobile/core/telemetry/telemetry_local_store.dart';
import 'package:erp_techsolutions_mobile/core/telemetry/telemetry_signal_source.dart';
import 'package:erp_techsolutions_mobile/core/telemetry/telemetry_sync_service.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_local_store.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_repository.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/domain/work_order_models.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/permissions/permission_resolver.dart';
import 'package:flutter_test/flutter_test.dart';
// ignore: depend_on_referenced_packages
import 'package:sqlite3/sqlite3.dart' as sqlite3;

const _tenantId = 'tenant-tele';
const _realWorkOrderUuid = '11111111-2222-3333-4444-555555555555';

void main() {
  group('PR-13 modelo de evento', () {
    test('1. enums mapeiam wire do backend', () {
      expect(TelemetryEventType.heartbeat.wire, 'heartbeat');
      expect(TelemetryEventType.appConnect.wire, 'app_connect');
      expect(TelemetryEventType.appDisconnect.wire, 'app_disconnect');
      expect(TelemetryEventType.serviceRefusal.wire, 'service_refusal');
      expect(
        TelemetryEventType.fromWire('service_refusal'),
        TelemetryEventType.serviceRefusal,
      );
      expect(TelemetrySignalType.wifi.wire, 'wifi');
      expect(TelemetrySignalType.mobile.wire, 'mobile');
      expect(TelemetrySignalType.none.wire, 'none');
      expect(
        TelemetrySignalType.fromWire('mobile'),
        TelemetrySignalType.mobile,
      );
      expect(TelemetrySignalType.fromWire(null), isNull);
      expect(TelemetrySignalType.fromWire('bogus'), isNull);
    });

    test('2. meia-coordenada e valores negativos sao rejeitados', () {
      expect(
        () => _event(latitude: -23.5, longitude: null),
        throwsA(isA<TelemetryValidationError>()),
      );
      expect(
        () => _event(latitude: null, longitude: -46.6),
        throwsA(isA<TelemetryValidationError>()),
      );
      expect(
        () => _event(latitude: -91, longitude: 10),
        throwsA(isA<TelemetryValidationError>()),
      );
      expect(
        () => _event(speedKmh: -1),
        throwsA(isA<TelemetryValidationError>()),
      );
    });

    test('3. capturedAt e createdAt sao normalizados para UTC', () {
      final event = _event(
        capturedAt: DateTime.parse('2026-07-24T12:00:00-03:00'),
      );
      expect(event.capturedAt.isUtc, isTrue);
      expect(event.capturedAt.toIso8601String(), '2026-07-24T15:00:00.000Z');
    });
  });

  group('PR-13 codec / contrato (RN-TELE-MOBILE-08)', () {
    test('4. endpoint mobile registrado', () {
      expect(TelemetryApiEndpoints.mobileTelemetry, '/api/v1/mobile/telemetry');
    });

    test('5. envelope flat + camelCase; lat/lng juntos so no heartbeat', () {
      const codec = TelemetryCodec();
      final request = codec.encodeRequest([
        _event(
          clientActionId: 'cai-hb',
          eventType: TelemetryEventType.heartbeat,
          latitude: -23.55,
          longitude: -46.63,
          accuracyMeters: 8,
          speedKmh: 36,
          signalType: TelemetrySignalType.mobile,
          appVersion: '1.0.0',
        ),
      ]);

      expect(request['client_batch_id'], startsWith('telemetry-batch-'));
      final events = request['events'] as List;
      final event = events.single as Map<String, Object?>;
      expect(event['client_action_id'], 'cai-hb');
      expect(event['eventType'], 'heartbeat');
      expect(event['capturedAt'], isA<String>());
      expect(event['lat'], -23.55);
      expect(event['lng'], -46.63);
      expect(event['accuracyM'], 8);
      expect(event['speedKmh'], 36);
      expect(event['signalType'], 'mobile');
      expect(event['appVersion'], '1.0.0');
    });

    test('6. evento sem GPS nao emite lat/lng (só heartbeat consentido)', () {
      const codec = TelemetryCodec();
      final request = codec.encodeRequest([
        _event(
          clientActionId: 'cai-refusal',
          eventType: TelemetryEventType.serviceRefusal,
          latitude: null,
          longitude: null,
          workOrderId: _realWorkOrderUuid,
          refusalReason: 'customer_absent',
        ),
      ]);
      final event = (request['events'] as List).single as Map<String, Object?>;
      expect(event.containsKey('lat'), isFalse);
      expect(event.containsKey('lng'), isFalse);
      expect(event['workOrderId'], _realWorkOrderUuid);
      expect(event['refusalReason'], 'customer_absent');
    });

    test('7. §2.8 — payload nunca carrega tenant/token/path', () {
      const codec = TelemetryCodec();
      final serialized = jsonEncode(
        codec.encodeRequest([
          _event(
            latitude: -23.55,
            longitude: -46.63,
            signalType: TelemetrySignalType.wifi,
            appVersion: '1.0.0',
          ),
        ]),
      );
      for (final forbidden in const [
        'tenant_id',
        'tenantId',
        'Authorization',
        'Bearer',
        'accessToken',
        'refreshToken',
        'password',
        'base64',
        '"path"',
      ]) {
        expect(serialized, isNot(contains(forbidden)), reason: forbidden);
      }
    });

    test('8. decodeResponse le data.results e tolera results na raiz', () {
      const codec = TelemetryCodec();
      final decoded = codec.decodeResponse({
        'data': {
          'summary': {'received': 2, 'accepted': 1, 'rejected': 1},
          'results': [
            {'client_action_id': 'a', 'status': 'accepted'},
            {
              'client_action_id': 'b',
              'status': 'rejected',
              'reason': 'tracking_consent_required',
            },
          ],
        },
      });
      expect(decoded, hasLength(2));
      expect(decoded[0].isAccepted, isTrue);
      expect(decoded[1].isRejected, isTrue);
      expect(decoded[1].reason, 'tracking_consent_required');

      final rootLevel = codec.decodeResponse({
        'results': [
          {'client_action_id': 'c', 'status': 'already_applied'},
        ],
      });
      expect(rootLevel.single.isAccepted, isTrue);
    });
  });

  group('PR-13 buffer Drift dedicado', () {
    test('9. enqueue/pending filtra tenant, retry e teto de lote', () async {
      final store = InMemoryTelemetryLocalStore();
      for (var i = 0; i < 60; i++) {
        await store.enqueue(_connectEvent(localId: 'e$i'));
      }
      await store.enqueue(_connectEvent(localId: 'other', tenantId: 'x'));
      await store.enqueue(
        _connectEvent(
          localId: 'exhausted',
          retryCount: 5,
          status: SyncStatus.failed,
        ),
      );

      final pending = await store.pendingForTenant(_tenantId, limit: 50);
      expect(pending, hasLength(50));
      expect(pending.every((e) => e.tenantId == _tenantId), isTrue);
      expect(pending.any((e) => e.localId == 'exhausted'), isFalse);
    });

    test('10. remove e purgeSynced limpam o buffer', () async {
      final store = InMemoryTelemetryLocalStore();
      await store.enqueue(_connectEvent(localId: 'a'));
      await store.enqueue(
        _connectEvent(localId: 'b', status: SyncStatus.synced),
      );
      await store.remove('a');
      await store.purgeSynced(_tenantId);
      expect(await store.eventsForTenant(_tenantId), isEmpty);
    });

    test('11. upgrade Drift 11→12 cria telemetry_events (aditivo)', () async {
      final file = await _legacyDatabaseFile(11);
      final db = AppDatabase(NativeDatabase(file));
      addTearDown(db.close);
      final store = DriftTelemetryLocalStore(db);

      await store.enqueue(
        _event(
          localId: 'drift-1',
          eventType: TelemetryEventType.heartbeat,
          latitude: -23.55,
          longitude: -46.63,
          speedKmh: 36,
          signalType: TelemetrySignalType.wifi,
        ),
      );
      final loaded = await store.eventsForTenant(_tenantId);
      expect(loaded.single.localId, 'drift-1');
      expect(loaded.single.eventType, TelemetryEventType.heartbeat);
      expect(loaded.single.speedKmh, 36);
      expect(loaded.single.signalType, TelemetrySignalType.wifi);
    });
  });

  group('PR-13 captura foreground + consent-gate (RN-01/05)', () {
    test('12. sem permissao field_location:send → nao captura GPS', () async {
      final store = InMemoryTelemetryLocalStore();
      final capture = _captureService(
        store: store,
        consentAccepted: true,
        hasPermission: false,
      );
      final result = await capture.captureHeartbeat(tenantId: _tenantId);
      expect(result.outcome, TelemetryCaptureOutcome.skippedNoConsent);
      expect(await store.eventsForTenant(_tenantId), isEmpty);
    });

    test(
      '13. sem consentimento de dispositivo → zero coordenada no buffer',
      () async {
        final store = InMemoryTelemetryLocalStore();
        final capture = _captureService(
          store: store,
          consentAccepted: false,
          hasPermission: true,
        );
        final result = await capture.captureHeartbeat(tenantId: _tenantId);
        expect(result.outcome, TelemetryCaptureOutcome.skippedNoConsent);
        final events = await store.eventsForTenant(_tenantId);
        expect(events, isEmpty);
      },
    );

    test(
      '14. com consentimento → heartbeat com GPS e speed km/h (m/s×3,6)',
      () async {
        final store = InMemoryTelemetryLocalStore();
        final capture = _captureService(
          store: store,
          consentAccepted: true,
          hasPermission: true,
          fix: _fix(speedMetersPerSecond: 10),
        );
        final result = await capture.captureHeartbeat(tenantId: _tenantId);
        expect(result.isQueued, isTrue);
        final event = (await store.eventsForTenant(_tenantId)).single;
        expect(event.eventType, TelemetryEventType.heartbeat);
        expect(event.hasGps, isTrue);
        expect(event.latitude, -23.55052);
        expect(event.speedKmh, closeTo(36, 0.0001));
        expect(event.signalType, TelemetrySignalType.mobile);
        expect(event.appVersion, isNotEmpty);
      },
    );

    test('15. distanceFilter suprime heartbeat parado', () async {
      final store = InMemoryTelemetryLocalStore();
      var i = 0;
      final capture = _captureService(
        store: store,
        consentAccepted: true,
        hasPermission: true,
        fix: _fix(),
        distanceFilterMeters: 25,
        idFactory: () => 'hb-${i++}',
      );
      final first = await capture.captureHeartbeat(tenantId: _tenantId);
      final second = await capture.captureHeartbeat(tenantId: _tenantId);
      expect(first.isQueued, isTrue);
      expect(second.outcome, TelemetryCaptureOutcome.skippedDistanceFilter);
      expect(await store.eventsForTenant(_tenantId), hasLength(1));
    });

    test(
      '16. foreground-only: stop interrompe a captura (sem background)',
      () async {
        final store = InMemoryTelemetryLocalStore();
        var i = 0;
        final capture = _captureService(
          store: store,
          consentAccepted: true,
          hasPermission: true,
          fix: _fix(),
          distanceFilterMeters: 0,
          heartbeatInterval: const Duration(milliseconds: 25),
          idFactory: () => 'hb-${i++}',
        );
        addTearDown(capture.stop);

        capture.start(() => _tenantId);
        await Future<void>.delayed(const Duration(milliseconds: 120));
        final duringForeground = (await store.eventsForTenant(
          _tenantId,
        )).length;
        expect(duringForeground, greaterThan(0));

        capture.stop();
        expect(capture.isCapturing, isFalse);
        final afterStop = (await store.eventsForTenant(_tenantId)).length;
        await Future<void>.delayed(const Duration(milliseconds: 120));
        final afterBackground = (await store.eventsForTenant(_tenantId)).length;
        // Nenhum ponto novo capturado em background.
        expect(afterBackground, afterStop);
      },
    );
  });

  group('PR-13 eventos de ciclo + recusa (RN-06)', () {
    test('17. connect/disconnect com de-dup por estado', () async {
      final store = InMemoryTelemetryLocalStore();
      final capture = _captureService(store: store);

      final connect1 = await capture.recordAppConnect(tenantId: _tenantId);
      final connect2 = await capture.recordAppConnect(tenantId: _tenantId);
      final disconnect1 = await capture.recordAppDisconnect(
        tenantId: _tenantId,
      );
      final disconnect2 = await capture.recordAppDisconnect(
        tenantId: _tenantId,
      );

      expect(connect1, isNotNull);
      expect(connect2, isNull); // de-dup
      expect(disconnect1, isNotNull);
      expect(disconnect2, isNull); // de-dup
      final events = await store.eventsForTenant(_tenantId);
      expect(events.map((e) => e.eventType), [
        TelemetryEventType.appConnect,
        TelemetryEventType.appDisconnect,
      ]);
      expect(events.every((e) => !e.hasGps), isTrue);
    });

    test(
      '18. recusa usa serverId UUID real (nunca id local) + de-dup',
      () async {
        final store = InMemoryTelemetryLocalStore();
        final capture = _captureService(store: store);

        final real = await capture.recordServiceRefusal(
          tenantId: _tenantId,
          workOrderServerId: _realWorkOrderUuid,
          reason: 'customer_absent',
        );
        final duplicate = await capture.recordServiceRefusal(
          tenantId: _tenantId,
          workOrderServerId: _realWorkOrderUuid,
          reason: 'customer_absent',
        );
        final localOnly = await capture.recordServiceRefusal(
          tenantId: _tenantId,
          workOrderServerId: 'wo-local-999',
          reason: 'unsafe_site',
        );

        expect(real!.workOrderId, _realWorkOrderUuid);
        expect(real.refusalReason, 'customer_absent');
        expect(real.hasGps, isFalse);
        expect(duplicate, isNull); // de-dup (mesma OS + motivo)
        expect(
          localOnly!.workOrderId,
          isNull,
        ); // id local nunca vira workOrderId
      },
    );

    test('19. reportUnableToStart alimenta a trilha de telemetria', () async {
      final telemetryStore = InMemoryTelemetryLocalStore();
      final capture = _captureService(store: telemetryStore);
      final repo = _workOrderRepository(
        onServiceRefusalTelemetry:
            ({
              required String tenantId,
              required String? workOrderServerId,
              required String reason,
            }) async {
              await capture.recordServiceRefusal(
                tenantId: tenantId,
                workOrderServerId: workOrderServerId,
                reason: reason,
              );
            },
      );

      await repo.reportUnableToStart(
        localId: 'wo-local-ref',
        reason: 'customer_absent',
        note: 'Cliente ausente no local.',
      );

      final events = await telemetryStore.eventsForTenant(_tenantId);
      expect(events.single.eventType, TelemetryEventType.serviceRefusal);
      expect(events.single.workOrderId, _realWorkOrderUuid);
      expect(events.single.refusalReason, 'customer_absent');
      expect(events.single.hasGps, isFalse);
    });
  });

  group('PR-13 flush em lote / idempotencia (RN-02/03/04)', () {
    test('20. flush ≤50, accepted purga do buffer', () async {
      final store = InMemoryTelemetryLocalStore();
      for (var i = 0; i < 60; i++) {
        await store.enqueue(
          _connectEvent(localId: 'e$i', clientActionId: 'c$i'),
        );
      }
      final api = _FakeTelemetryApi();
      final service = TelemetrySyncService(store: store, api: api);

      final summary = await service.flushTenant(_tenantId);

      expect(api.batches.single, hasLength(50)); // teto de lote respeitado
      expect(summary.accepted, 50);
      expect((await store.eventsForTenant(_tenantId)), hasLength(10));
    });

    test(
      '21. idempotencia: already_applied purga e nao re-enfileira',
      () async {
        final store = InMemoryTelemetryLocalStore();
        await store.enqueue(
          _connectEvent(localId: 'e1', clientActionId: 'cai-1'),
        );
        final api = _FakeTelemetryApi(
          responder: (events) => [
            for (final e in events)
              TelemetrySyncResult(
                clientActionId: e.clientActionId,
                status: 'already_applied',
              ),
          ],
        );
        final service = TelemetrySyncService(store: store, api: api);

        final summary = await service.flushTenant(_tenantId);
        expect(summary.alreadyApplied, 1);
        expect(await store.eventsForTenant(_tenantId), isEmpty);

        // Re-flush não reenvia nada (buffer vazio).
        final again = await service.flushTenant(_tenantId);
        expect(again.purged, 0);
        expect(api.batches, hasLength(1));
      },
    );

    test(
      '22. rejected:tracking_consent_required é terminal (sem retry)',
      () async {
        final store = InMemoryTelemetryLocalStore();
        await store.enqueue(
          _connectEvent(localId: 'e1', clientActionId: 'cai-1'),
        );
        final api = _FakeTelemetryApi(
          responder: (events) => [
            for (final e in events)
              TelemetrySyncResult(
                clientActionId: e.clientActionId,
                status: 'rejected',
                reason: 'tracking_consent_required',
              ),
          ],
        );
        final service = TelemetrySyncService(store: store, api: api);

        final summary = await service.flushTenant(_tenantId);
        expect(summary.rejected, 1);
        expect(await store.eventsForTenant(_tenantId), isEmpty);
      },
    );

    test(
      '23. offline→fila→replay: erro de rede vira failed retryable, id estavel',
      () async {
        final store = InMemoryTelemetryLocalStore();
        await store.enqueue(
          _connectEvent(localId: 'e1', clientActionId: 'cai-1'),
        );
        final failing = _FakeTelemetryApi(error: const ApiNetworkError());
        final service = TelemetrySyncService(store: store, api: failing);

        final firstSummary = await service.flushTenant(_tenantId);
        expect(firstSummary.failed, 1);
        final pendingAfterFail = await store.pendingForTenant(_tenantId);
        expect(pendingAfterFail.single.syncStatus, SyncStatus.failed);
        expect(pendingAfterFail.single.retryCount, 1);
        expect(pendingAfterFail.single.clientActionId, 'cai-1'); // id estavel
        // §2.8: mensagem de erro nunca vaza coordenada/PII.
        expect(pendingAfterFail.single.lastSafeError, isNot(contains('-23.')));

        // Volta online: mesmo clientActionId → aceito → purgado.
        final ok = _FakeTelemetryApi();
        final recovered = TelemetrySyncService(store: store, api: ok);
        final secondSummary = await recovered.flushTenant(_tenantId);
        expect(secondSummary.accepted, 1);
        expect(ok.batches.single.single.clientActionId, 'cai-1');
        expect(await store.eventsForTenant(_tenantId), isEmpty);
      },
    );

    test('24. cap de retry descarta evento cronicamente falho', () async {
      final store = InMemoryTelemetryLocalStore();
      await store.enqueue(
        _connectEvent(
          localId: 'e1',
          clientActionId: 'cai-1',
          retryCount: 4,
          status: SyncStatus.failed,
        ),
      );
      final failing = _FakeTelemetryApi(error: const ApiNetworkError());
      final service = TelemetrySyncService(store: store, api: failing);

      await service.flushTenant(_tenantId); // retryCount 4→5 = cap → descarta
      expect(await store.eventsForTenant(_tenantId), isEmpty);
    });
  });

  group('PR-13 sinal de rede', () {
    test('25. connectivity → signalType (wifi/mobile/none)', () {
      expect(mapConnectivityToSignal([_wifi]), TelemetrySignalType.wifi);
      expect(mapConnectivityToSignal([_mobile]), TelemetrySignalType.mobile);
      expect(mapConnectivityToSignal([_none]), TelemetrySignalType.none);
    });
  });
}

// ── connectivity_plus helpers ──────────────────────────────────────────────────

const _wifi = ConnectivityResult.wifi;
const _mobile = ConnectivityResult.mobile;
const _none = ConnectivityResult.none;

// ── builders ────────────────────────────────────────────────────────────────────

TelemetryEvent _event({
  String localId = 'tele-local-1',
  String clientActionId = 'cai-1',
  String tenantId = _tenantId,
  TelemetryEventType eventType = TelemetryEventType.heartbeat,
  DateTime? capturedAt,
  double? latitude = -23.55052,
  double? longitude = -46.633308,
  double? accuracyMeters,
  double? speedKmh,
  TelemetrySignalType? signalType,
  String? appVersion,
  String? workOrderId,
  String? refusalReason,
  SyncStatus status = SyncStatus.pending,
  int retryCount = 0,
}) {
  return TelemetryEvent(
    localId: localId,
    tenantId: tenantId,
    clientActionId: clientActionId,
    eventType: eventType,
    capturedAt: capturedAt ?? DateTime.utc(2026, 7, 24, 12),
    latitude: latitude,
    longitude: longitude,
    accuracyMeters: accuracyMeters,
    speedKmh: speedKmh,
    signalType: signalType,
    appVersion: appVersion,
    workOrderId: workOrderId,
    refusalReason: refusalReason,
    syncStatus: status,
    retryCount: retryCount,
    createdAt: DateTime.utc(2026, 7, 24, 12),
  );
}

TelemetryEvent _connectEvent({
  String localId = 'tele-local-1',
  String clientActionId = 'cai-1',
  String tenantId = _tenantId,
  SyncStatus status = SyncStatus.pending,
  int retryCount = 0,
}) {
  return _event(
    localId: localId,
    clientActionId: clientActionId,
    tenantId: tenantId,
    eventType: TelemetryEventType.appConnect,
    latitude: null,
    longitude: null,
    status: status,
    retryCount: retryCount,
  );
}

FieldLocationFix _fix({
  double latitude = -23.55052,
  double longitude = -46.633308,
  double? speedMetersPerSecond,
}) {
  return FieldLocationFix(
    latitude: latitude,
    longitude: longitude,
    accuracyMeters: 8,
    speedMetersPerSecond: speedMetersPerSecond,
    recordedAt: DateTime.utc(2026, 7, 24, 12),
  );
}

TelemetryCaptureService _captureService({
  required TelemetryLocalStore store,
  bool consentAccepted = true,
  bool hasPermission = true,
  FieldLocationFix? fix,
  double distanceFilterMeters = 25,
  Duration heartbeatInterval = const Duration(seconds: 60),
  TelemetryIdFactory? idFactory,
}) {
  var counter = 0;
  return TelemetryCaptureService(
    store: store,
    deviceLocationProvider: _FakeDeviceLocationProvider(fix),
    consentStore: InMemoryLocationConsentStore(accepted: consentAccepted),
    signalSource: const FixedTelemetrySignalSource(TelemetrySignalType.mobile),
    hasLocationSendPermission: () => hasPermission,
    idFactory: idFactory ?? (() => 'tele-${counter++}'),
    heartbeatInterval: heartbeatInterval,
    distanceFilterMeters: distanceFilterMeters,
  );
}

WorkOrderRepository _workOrderRepository({
  ServiceRefusalTelemetryHook? onServiceRefusalTelemetry,
}) {
  const session = BootstrapSession(
    activeTenant: TenantContext(
      tenantId: _tenantId,
      displayName: 'Tenant Tele',
    ),
    enabledModules: [],
    permissions: PermissionSet({'field_location:send', 'work_orders:read'}),
  );
  final workOrder = WorkOrder(
    localId: 'wo-local-ref',
    serverId: _realWorkOrderUuid,
    tenantId: _tenantId,
    code: 'OS-REF',
    title: 'Atendimento com recusa',
    customerName: 'Cliente Tele',
    serviceAddress: 'Rua Tele, 1',
    status: WorkOrderStatus.enRoute,
    priority: WorkOrderPriority.normal,
    syncStatus: SyncStatus.synced,
    createdAt: DateTime.utc(2026, 7, 24),
  );
  return WorkOrderRepository(
    session: session,
    syncQueue: PersistentSyncQueueRepository(InMemorySyncActionStore([])),
    actionFactory: SyncActionFactory(),
    localStore: InMemoryWorkOrderLocalStore([workOrder]),
    seedWorkOrders: [workOrder],
    onServiceRefusalTelemetry: onServiceRefusalTelemetry,
  );
}

Future<File> _legacyDatabaseFile(int version) async {
  final directory = await Directory.systemTemp.createTemp('telemetry-drift-');
  final file = File('${directory.path}/legacy.sqlite');
  addTearDown(() => directory.delete(recursive: true));

  final db = sqlite3.sqlite3.open(file.path);
  try {
    db.execute('PRAGMA user_version = $version');
  } finally {
    db.close();
  }
  return file;
}

// ── fakes ────────────────────────────────────────────────────────────────────────

class _FakeDeviceLocationProvider implements DeviceLocationProvider {
  const _FakeDeviceLocationProvider(this._fix);

  final FieldLocationFix? _fix;

  @override
  Future<DeviceLocationResult> currentLocation() async {
    final fix = _fix;
    if (fix == null) {
      return DeviceLocationResult.unavailable('GPS indisponivel no teste.');
    }
    return DeviceLocationResult.available(fix);
  }
}

class _FakeTelemetryApi implements TelemetryApi {
  _FakeTelemetryApi({this.responder, this.error});

  final List<TelemetrySyncResult> Function(List<TelemetryEvent>)? responder;
  final Object? error;
  final List<List<TelemetryEvent>> batches = [];

  @override
  Future<List<TelemetrySyncResult>> sendBatch(
    List<TelemetryEvent> events,
  ) async {
    batches.add(events);
    final currentError = error;
    if (currentError != null) throw currentError;
    return responder?.call(events) ??
        [
          for (final event in events)
            TelemetrySyncResult(
              clientActionId: event.clientActionId,
              status: 'accepted',
            ),
        ];
  }
}
