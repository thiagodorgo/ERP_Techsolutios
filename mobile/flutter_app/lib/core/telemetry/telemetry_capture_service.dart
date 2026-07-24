import 'dart:async';
import 'dart:math' as math;

import 'package:uuid/uuid.dart';

import '../config/app_config.dart';
import '../location/device_location_provider.dart';
import '../location/location_consent_store.dart';
import '../sync/sync_models.dart';
import 'telemetry_event.dart';
import 'telemetry_local_store.dart';
import 'telemetry_signal_source.dart';

typedef TelemetryIdFactory = String Function();
typedef TelemetryClock = DateTime Function();
typedef TenantIdResolver = String? Function();

enum TelemetryCaptureOutcome {
  queued,
  skippedNoConsent,
  skippedUnavailable,
  skippedDistanceFilter,
}

class TelemetryCaptureResult {
  const TelemetryCaptureResult._(this.outcome, {this.event, this.safeMessage});

  factory TelemetryCaptureResult.queued(TelemetryEvent event) =>
      TelemetryCaptureResult._(TelemetryCaptureOutcome.queued, event: event);

  factory TelemetryCaptureResult.skipped(
    TelemetryCaptureOutcome outcome, [
    String? safeMessage,
  ]) => TelemetryCaptureResult._(outcome, safeMessage: safeMessage);

  final TelemetryCaptureOutcome outcome;
  final TelemetryEvent? event;
  final String? safeMessage;

  bool get isQueued => outcome == TelemetryCaptureOutcome.queued;
}

/// Serviço de captura de telemetria — SÓ em primeiro plano
/// (D-Ω4C-TELE-FLUTTER-FOREGROUND). Coleta heartbeat (GPS consent-gated) numa
/// cadência + `distanceFilter`, e emite os eventos de ciclo (connect/disconnect)
/// e recusa. NÃO usa WorkManager, isolate nem `getPositionStream` persistente:
/// o timer só roda enquanto `start()` estiver ativo (o root para em `paused`).
class TelemetryCaptureService {
  TelemetryCaptureService({
    required TelemetryLocalStore store,
    required DeviceLocationProvider deviceLocationProvider,
    required LocationConsentStore consentStore,
    required TelemetrySignalSource signalSource,
    required bool Function() hasLocationSendPermission,
    TelemetryIdFactory? idFactory,
    TelemetryClock? clock,
    this.appVersion = kAppVersion,
    this.heartbeatInterval = const Duration(seconds: 60),
    this.distanceFilterMeters = 25,
  }) : _store = store,
       _deviceLocationProvider = deviceLocationProvider,
       _consentStore = consentStore,
       _signalSource = signalSource,
       _hasLocationSendPermission = hasLocationSendPermission,
       _idFactory = idFactory ?? const Uuid().v4,
       _clock = clock ?? DateTime.now;

  final TelemetryLocalStore _store;
  final DeviceLocationProvider _deviceLocationProvider;
  final LocationConsentStore _consentStore;
  final TelemetrySignalSource _signalSource;
  final bool Function() _hasLocationSendPermission;
  final TelemetryIdFactory _idFactory;
  final TelemetryClock _clock;
  final String appVersion;
  final Duration heartbeatInterval;
  final double distanceFilterMeters;

  Timer? _timer;
  bool _active = false;
  bool _connectEmitted = false;
  double? _lastLat;
  double? _lastLng;
  final Set<String> _refusalKeys = <String>{};

  bool get isCapturing => _active;

  /// Liga o timer de captura em primeiro plano. Idempotente: chamadas repetidas
  /// enquanto ativo não empilham timers.
  void start(TenantIdResolver tenantIdResolver) {
    _active = true;
    _timer ??= Timer.periodic(
      heartbeatInterval,
      (_) => _onTick(tenantIdResolver),
    );
  }

  /// Para o timer (transição para background / `paused`). Nenhum ponto é
  /// capturado após o stop — prova de foreground-only (RN-TELE-MOBILE-05).
  void stop() {
    _active = false;
    _timer?.cancel();
    _timer = null;
    _lastLat = null;
    _lastLng = null;
  }

  Future<void> _onTick(TenantIdResolver tenantIdResolver) async {
    if (!_active) return;
    final tenantId = tenantIdResolver();
    if (tenantId == null || tenantId.trim().isEmpty) return;
    try {
      await captureHeartbeat(tenantId: tenantId);
    } catch (_) {
      // Captura nunca derruba o app; falhas ficam no buffer/no-op honesto.
    }
  }

  /// Captura um heartbeat GPS. **Gate de consentimento do cliente**
  /// (D-Ω4C-TELE-FLUTTER-CONSENT): sem `field_location:send` OU sem consentimento
  /// de dispositivo → NADA de localização é tocada (retorna `skippedNoConsent`,
  /// zero coordenada no buffer).
  Future<TelemetryCaptureResult> captureHeartbeat({
    required String tenantId,
  }) async {
    if (!_hasLocationSendPermission()) {
      return TelemetryCaptureResult.skipped(
        TelemetryCaptureOutcome.skippedNoConsent,
      );
    }
    if (!await _consentStore.hasAcceptedManualCapture()) {
      return TelemetryCaptureResult.skipped(
        TelemetryCaptureOutcome.skippedNoConsent,
      );
    }

    final reading = await _deviceLocationProvider.currentLocation();
    if (!reading.isAvailable || reading.fix == null) {
      return TelemetryCaptureResult.skipped(
        TelemetryCaptureOutcome.skippedUnavailable,
        reading.safeMessage,
      );
    }

    final fix = reading.fix!;
    if (distanceFilterMeters > 0 && _lastLat != null && _lastLng != null) {
      final moved = _distanceMeters(
        _lastLat!,
        _lastLng!,
        fix.latitude,
        fix.longitude,
      );
      if (moved < distanceFilterMeters) {
        return TelemetryCaptureResult.skipped(
          TelemetryCaptureOutcome.skippedDistanceFilter,
        );
      }
    }

    final id = _idFactory();
    final event = TelemetryEvent(
      localId: id,
      tenantId: tenantId,
      clientActionId: id,
      eventType: TelemetryEventType.heartbeat,
      capturedAt: fix.recordedAt,
      latitude: fix.latitude,
      longitude: fix.longitude,
      accuracyMeters: fix.accuracyMeters,
      speedKmh: fix.speedMetersPerSecond == null
          ? null
          : fix.speedMetersPerSecond! * 3.6,
      signalType: await _signalSource.currentSignal(),
      appVersion: appVersion,
      syncStatus: SyncStatus.pending,
      retryCount: 0,
      createdAt: _clock().toUtc(),
    );
    await _store.enqueue(event);
    _lastLat = fix.latitude;
    _lastLng = fix.longitude;
    return TelemetryCaptureResult.queued(event);
  }

  /// APP_CONNECT (login / foreground). De-dup por estado — não emite connect
  /// repetido enquanto já conectado (D-Ω4C-TELE-FLUTTER-EVENTS).
  Future<TelemetryEvent?> recordAppConnect({required String tenantId}) async {
    if (_connectEmitted) return null;
    _connectEmitted = true;
    return _enqueueNonGpsEvent(
      tenantId: tenantId,
      eventType: TelemetryEventType.appConnect,
    );
  }

  /// APP_DISCONNECT (logout / background). De-dup por estado.
  Future<TelemetryEvent?> recordAppDisconnect({
    required String tenantId,
  }) async {
    if (!_connectEmitted) return null;
    _connectEmitted = false;
    return _enqueueNonGpsEvent(
      tenantId: tenantId,
      eventType: TelemetryEventType.appDisconnect,
    );
  }

  /// SERVICE_REFUSAL — emitido no ponto de recusa do fluxo de OS
  /// (`reportUnableToStart`). `workOrderId` só entra se for UUID REAL de servidor
  /// (nunca id local `wo-local-*`). De-dup por (OS, motivo).
  Future<TelemetryEvent?> recordServiceRefusal({
    required String tenantId,
    required String? workOrderServerId,
    required String reason,
  }) async {
    final serverId = _validUuidOrNull(workOrderServerId);
    final key = '${serverId ?? '-'}|$reason';
    if (_refusalKeys.contains(key)) return null;
    _refusalKeys.add(key);
    return _enqueueNonGpsEvent(
      tenantId: tenantId,
      eventType: TelemetryEventType.serviceRefusal,
      workOrderId: serverId,
      refusalReason: reason,
    );
  }

  Future<TelemetryEvent> _enqueueNonGpsEvent({
    required String tenantId,
    required TelemetryEventType eventType,
    String? workOrderId,
    String? refusalReason,
  }) async {
    final now = _clock().toUtc();
    final id = _idFactory();
    final event = TelemetryEvent(
      localId: id,
      tenantId: tenantId,
      clientActionId: id,
      eventType: eventType,
      capturedAt: now,
      signalType: await _signalSource.currentSignal(),
      appVersion: appVersion,
      workOrderId: workOrderId,
      refusalReason: refusalReason,
      syncStatus: SyncStatus.pending,
      retryCount: 0,
      createdAt: now,
    );
    await _store.enqueue(event);
    return event;
  }
}

final _uuidPattern = RegExp(
  r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
  caseSensitive: false,
);

String? _validUuidOrNull(String? value) {
  if (value == null) return null;
  final normalized = value.trim();
  if (normalized.isEmpty || !_uuidPattern.hasMatch(normalized)) return null;
  return normalized;
}

double _distanceMeters(double lat1, double lng1, double lat2, double lng2) {
  const earthRadius = 6371000.0; // metros
  final dLat = _toRadians(lat2 - lat1);
  final dLng = _toRadians(lng2 - lng1);
  final a =
      math.sin(dLat / 2) * math.sin(dLat / 2) +
      math.cos(_toRadians(lat1)) *
          math.cos(_toRadians(lat2)) *
          math.sin(dLng / 2) *
          math.sin(dLng / 2);
  final c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a));
  return earthRadius * c;
}

double _toRadians(double degrees) => degrees * math.pi / 180.0;
