import 'package:uuid/uuid.dart';

import '../../features/work_orders/domain/work_order_models.dart';
import '../network/api_error.dart';
import '../sync/sync_models.dart';
import 'device_location_provider.dart';
import 'field_location_api.dart';
import 'field_location_models.dart';
import 'field_location_store.dart';
import 'location_consent_api.dart';
import 'location_consent_sync.dart';

enum FieldLocationCaptureStatus { queued, unavailable }

class FieldLocationCaptureResult {
  const FieldLocationCaptureResult._({
    required this.status,
    this.event,
    this.safeMessage,
  });

  factory FieldLocationCaptureResult.queued(FieldLocationEvent event) {
    return FieldLocationCaptureResult._(
      status: FieldLocationCaptureStatus.queued,
      event: event,
    );
  }

  factory FieldLocationCaptureResult.unavailable(String safeMessage) {
    return FieldLocationCaptureResult._(
      status: FieldLocationCaptureStatus.unavailable,
      safeMessage: safeMessage,
    );
  }

  final FieldLocationCaptureStatus status;
  final FieldLocationEvent? event;
  final String? safeMessage;
}

class FieldLocationSyncResult {
  const FieldLocationSyncResult({
    required this.synced,
    required this.failed,
    required this.skipped,
  });

  final List<FieldLocationEvent> synced;
  final List<FieldLocationEvent> failed;
  final List<FieldLocationEvent> skipped;
}

typedef FieldLocationIdFactory = String Function();
typedef FieldLocationClock = DateTime Function();

class FieldLocationSyncService {
  FieldLocationSyncService({
    required FieldLocationStore store,
    required FieldLocationApi api,
    DeviceLocationProvider deviceLocationProvider =
        const PendingDeviceLocationProvider(),
    FieldLocationIdFactory? idFactory,
    FieldLocationClock? clock,
    this.maxRetry = 5,
    LocationConsentSync? consentSync,
  }) : _store = store,
       _api = api,
       _deviceLocationProvider = deviceLocationProvider,
       _idFactory = idFactory ?? const Uuid().v4,
       _clock = clock ?? DateTime.now,
       _consentSync = consentSync;

  final FieldLocationStore _store;
  final FieldLocationApi _api;
  final DeviceLocationProvider _deviceLocationProvider;
  final FieldLocationIdFactory _idFactory;
  final FieldLocationClock _clock;
  final int maxRetry;

  /// B-SAN3-17 (P4): com ele, a decisão de consentimento sai antes de qualquer
  /// posição. Sem ele (`null`), o envio é o de antes.
  final LocationConsentSync? _consentSync;

  LocationConsentSync? get consentSync => _consentSync;

  Future<FieldLocationCaptureResult> captureForWorkOrder({
    required String tenantId,
    required WorkOrder workOrder,
  }) async {
    final reading = await _deviceLocationProvider.currentLocation();
    if (!reading.isAvailable || reading.fix == null) {
      return FieldLocationCaptureResult.unavailable(
        reading.safeMessage ??
            'Localizacao do dispositivo indisponivel nesta versao.',
      );
    }

    final fix = reading.fix!;
    final event = FieldLocationEvent(
      localId: _idFactory(),
      tenantId: tenantId,
      workOrderLocalId: workOrder.localId,
      workOrderServerId: _serverIdOrNull(workOrder.serverId),
      latitude: fix.latitude,
      longitude: fix.longitude,
      accuracyMeters: fix.accuracyMeters,
      headingDegrees: fix.headingDegrees,
      speedMetersPerSecond: fix.speedMetersPerSecond,
      batteryLevel: fix.batteryLevel,
      recordedAt: fix.recordedAt,
      syncStatus: SyncStatus.pending,
      retryCount: 0,
      createdAt: _clock().toUtc(),
    );
    await _store.save(event);
    return FieldLocationCaptureResult.queued(event);
  }

  Future<FieldLocationSyncResult> syncTenant(String tenantId) async {
    final consent = _consentSync;
    if (consent != null && !await consent.readyToSendPositions(tenantId)) {
      // A organização ainda não conhece a decisão, ou ela não é "sim": nada
      // sai, e nada gasta tentativa.
      return FieldLocationSyncResult(
        synced: const [],
        failed: const [],
        skipped: await _store.pendingForTenant(tenantId, maxRetry: maxRetry),
      );
    }
    final pending = await _store.pendingForTenant(tenantId, maxRetry: maxRetry);
    final synced = <FieldLocationEvent>[];
    final failed = <FieldLocationEvent>[];

    for (final event in pending) {
      // CR17R2-01 (1): antes de CADA envio, de novo e sem rede (uma revogação
      // pode ter chegado com o envio anterior em voo).
      if (consent != null && !await consent.positionsStillAllowed(tenantId)) {
        break;
      }
      FieldLocationEvent updated;
      try {
        final response = await _api.send(event);
        updated = event.copyWith(
          serverId: response.serverId,
          syncStatus: SyncStatus.synced,
          syncedAt: response.receivedAt ?? _clock().toUtc(),
          clearLastError: true,
        );
        synced.add(updated);
      } catch (error) {
        if (consent != null && _refusedForConsent(error)) {
          // P8: a organização recusou por falta de consentimento. O local
          // volta a "não decidiu", o não enviado com GPS é apagado e nada é
          // reenviado.
          await consent.resetAfterServerRefusal(tenantId);
          break;
        }
        final mapped = _mapError(error);
        updated = event.copyWith(
          syncStatus: SyncStatus.failed,
          retryCount: event.retryCount + 1,
          lastErrorCode: mapped.code,
          lastSafeError: mapped.safeMessage,
        );
        failed.add(updated);
      }
      // CR17R2-01 (2): o resultado não recria o ponto que a revogação apagou.
      await _store.saveIfPresent(updated);
    }

    return FieldLocationSyncResult(
      synced: synced,
      failed: failed,
      skipped: const [],
    );
  }

  Future<FieldLocationEvent?> latestForWorkOrder({
    required String tenantId,
    required String workOrderLocalId,
  }) {
    return _store.latestForWorkOrder(
      tenantId: tenantId,
      workOrderLocalId: workOrderLocalId,
    );
  }
}

bool _refusedForConsent(Object error) =>
    error is LocationConsentRefusedError &&
    error.reason == 'tracking_consent_required';

({String code, String safeMessage}) _mapError(Object error) {
  if (error is ApiNetworkError || error is ApiTimeoutError) {
    return (
      code: 'NETWORK_ERROR',
      safeMessage: 'Falha de conexão. Tente novamente.',
    );
  }
  if (error is ApiServerError &&
      error.statusCode >= 400 &&
      error.statusCode < 500) {
    return (code: 'VALIDATION_ERROR', safeMessage: error.safeMessage);
  }
  if (error is ApiError) {
    return (code: 'SYNC_ERROR', safeMessage: error.safeMessage);
  }
  return (
    code: 'SYNC_ERROR',
    safeMessage: 'Nao foi possivel sincronizar a localizacao.',
  );
}

String? _serverIdOrNull(String? value) {
  if (value == null || value.trim().isEmpty) return null;
  return value.trim();
}
