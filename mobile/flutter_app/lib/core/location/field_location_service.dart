import 'package:uuid/uuid.dart';

import '../../features/work_orders/domain/work_order_models.dart';
import '../network/api_error.dart';
import '../sync/sync_models.dart';
import 'device_location_provider.dart';
import 'field_location_api.dart';
import 'field_location_models.dart';
import 'field_location_store.dart';

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
  }) : _store = store,
       _api = api,
       _deviceLocationProvider = deviceLocationProvider,
       _idFactory = idFactory ?? const Uuid().v4,
       _clock = clock ?? DateTime.now;

  final FieldLocationStore _store;
  final FieldLocationApi _api;
  final DeviceLocationProvider _deviceLocationProvider;
  final FieldLocationIdFactory _idFactory;
  final FieldLocationClock _clock;
  final int maxRetry;

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
    final pending = await _store.pendingForTenant(tenantId, maxRetry: maxRetry);
    final synced = <FieldLocationEvent>[];
    final failed = <FieldLocationEvent>[];

    for (final event in pending) {
      try {
        final response = await _api.send(event);
        final updated = event.copyWith(
          serverId: response.serverId,
          syncStatus: SyncStatus.synced,
          syncedAt: response.receivedAt ?? _clock().toUtc(),
          clearLastError: true,
        );
        await _store.save(updated);
        synced.add(updated);
      } catch (error) {
        final mapped = _mapError(error);
        final updated = event.copyWith(
          syncStatus: SyncStatus.failed,
          retryCount: event.retryCount + 1,
          lastErrorCode: mapped.code,
          lastSafeError: mapped.safeMessage,
        );
        await _store.save(updated);
        failed.add(updated);
      }
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

({String code, String safeMessage}) _mapError(Object error) {
  if (error is ApiNetworkError || error is ApiTimeoutError) {
    return (
      code: 'NETWORK_ERROR',
      safeMessage: 'Falha de conexao. Tente novamente.',
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
