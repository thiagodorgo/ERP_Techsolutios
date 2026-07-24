import 'package:equatable/equatable.dart';

import '../sync/sync_models.dart';

/// Ω4C PR-13 — modelo local do evento de telemetria do app de campo.
///
/// Espelha `FieldLocationEvent`/`FieldLocationFix` (validação de coordenada) mas
/// é FLAT e tem envelope próprio (o backend PR-12 quer `events:[{eventType, ...}]`,
/// não `type`+`payload`). Só o `heartbeat` carrega GPS (consent-gated); os demais
/// eventos (acesso/recusa) NÃO têm coordenada — não são rastreamento de posição.
///
/// Campos `batteryPct`/`deviceModel`/`sdkInt` do contrato backend são OPCIONAIS e
/// ficam DEFERIDOS nesta fatia (D-Ω4C-TELE-FLUTTER-NODEPS): os pacotes canônicos
/// (`battery_plus`/`device_info_plus`) não estão no pubspec e adicioná-los é
/// decisão de junta-5 + PD. Por isso não existem colunas para eles aqui.
class TelemetryValidationError extends Error {
  TelemetryValidationError(this.field, this.message);

  final String field;
  final String message;

  @override
  String toString() => 'TelemetryValidationError($field): $message';
}

/// Tipos de evento — o `wire` bate 1:1 com `TELEMETRY_EVENT_TYPES`
/// (`telemetry.types.ts`): heartbeat | app_connect | app_disconnect |
/// service_refusal.
enum TelemetryEventType {
  heartbeat('heartbeat'),
  appConnect('app_connect'),
  appDisconnect('app_disconnect'),
  serviceRefusal('service_refusal');

  const TelemetryEventType(this.wire);

  final String wire;

  bool get carriesGps => this == TelemetryEventType.heartbeat;

  static TelemetryEventType fromWire(String value) {
    return TelemetryEventType.values.firstWhere(
      (type) => type.wire == value,
      orElse: () => throw TelemetryValidationError(
        'eventType',
        'Unknown telemetry event type: $value',
      ),
    );
  }
}

/// Tipo de sinal de rede — enum backend `wifi | mobile | none`
/// (`TELEMETRY_SIGNAL_TYPES`). Derivado de `connectivity_plus` (zero dep nova).
enum TelemetrySignalType {
  wifi('wifi'),
  mobile('mobile'),
  none('none');

  const TelemetrySignalType(this.wire);

  final String wire;

  static TelemetrySignalType? fromWire(String? value) {
    if (value == null) return null;
    for (final signal in TelemetrySignalType.values) {
      if (signal.wire == value) return signal;
    }
    return null;
  }
}

class TelemetryEvent extends Equatable {
  TelemetryEvent({
    required this.localId,
    required this.tenantId,
    required this.clientActionId,
    required this.eventType,
    required DateTime capturedAt,
    required this.syncStatus,
    required this.retryCount,
    required DateTime createdAt,
    this.latitude,
    this.longitude,
    this.accuracyMeters,
    this.speedKmh,
    this.signalType,
    this.appVersion,
    this.workOrderId,
    this.refusalReason,
    this.lastErrorCode,
    this.lastSafeError,
    this.syncedAt,
  }) : capturedAt = capturedAt.toUtc(),
       createdAt = createdAt.toUtc() {
    _validate();
  }

  final String localId;
  final String tenantId;

  /// Chave de idempotência (tenant + usuário + client_action_id no backend).
  /// Determinística por captura, persistida na linha → retry reusa o mesmo valor
  /// e o backend responde `already_applied` (nunca duplica).
  final String clientActionId;
  final TelemetryEventType eventType;
  final DateTime capturedAt;

  // GPS — presentes SÓ no heartbeat consentido. lat/lng andam sempre juntos.
  final double? latitude;
  final double? longitude;
  final double? accuracyMeters;

  /// Velocidade em km/h (geolocator entrega m/s → ×3,6 na captura).
  final double? speedKmh;
  final TelemetrySignalType? signalType;
  final String? appVersion;

  /// UUID REAL da OS (server) — só em recusas com serverId válido; nunca id local.
  final String? workOrderId;
  final String? refusalReason;

  final SyncStatus syncStatus;
  final int retryCount;
  final String? lastErrorCode;
  final String? lastSafeError;
  final DateTime createdAt;
  final DateTime? syncedAt;

  bool get hasGps => latitude != null && longitude != null;

  void _validate() {
    final latPresent = latitude != null;
    final lngPresent = longitude != null;
    if (latPresent != lngPresent) {
      throw TelemetryValidationError(
        'coordinate',
        'latitude and longitude must be provided together.',
      );
    }
    if (latPresent) {
      _range(latitude!, 'latitude', -90, 90);
      _range(longitude!, 'longitude', -180, 180);
    }
    if (accuracyMeters != null) {
      _min(accuracyMeters!, 'accuracyMeters', 0);
    }
    if (speedKmh != null) {
      _min(speedKmh!, 'speedKmh', 0);
    }
  }

  TelemetryEvent copyWith({
    String? localId,
    String? tenantId,
    String? clientActionId,
    TelemetryEventType? eventType,
    DateTime? capturedAt,
    double? latitude,
    double? longitude,
    double? accuracyMeters,
    double? speedKmh,
    TelemetrySignalType? signalType,
    String? appVersion,
    String? workOrderId,
    String? refusalReason,
    SyncStatus? syncStatus,
    int? retryCount,
    String? lastErrorCode,
    String? lastSafeError,
    DateTime? createdAt,
    DateTime? syncedAt,
    bool clearLastError = false,
    bool clearSyncedAt = false,
  }) {
    return TelemetryEvent(
      localId: localId ?? this.localId,
      tenantId: tenantId ?? this.tenantId,
      clientActionId: clientActionId ?? this.clientActionId,
      eventType: eventType ?? this.eventType,
      capturedAt: capturedAt ?? this.capturedAt,
      latitude: latitude ?? this.latitude,
      longitude: longitude ?? this.longitude,
      accuracyMeters: accuracyMeters ?? this.accuracyMeters,
      speedKmh: speedKmh ?? this.speedKmh,
      signalType: signalType ?? this.signalType,
      appVersion: appVersion ?? this.appVersion,
      workOrderId: workOrderId ?? this.workOrderId,
      refusalReason: refusalReason ?? this.refusalReason,
      syncStatus: syncStatus ?? this.syncStatus,
      retryCount: retryCount ?? this.retryCount,
      lastErrorCode: clearLastError
          ? null
          : (lastErrorCode ?? this.lastErrorCode),
      lastSafeError: clearLastError
          ? null
          : (lastSafeError ?? this.lastSafeError),
      createdAt: createdAt ?? this.createdAt,
      syncedAt: clearSyncedAt ? null : (syncedAt ?? this.syncedAt),
    );
  }

  @override
  List<Object?> get props => [
    localId,
    tenantId,
    clientActionId,
    eventType,
    capturedAt,
    latitude,
    longitude,
    accuracyMeters,
    speedKmh,
    signalType,
    appVersion,
    workOrderId,
    refusalReason,
    syncStatus,
    retryCount,
    lastErrorCode,
    lastSafeError,
    createdAt,
    syncedAt,
  ];
}

void _range(num value, String field, num min, num max) {
  if (value < min || value > max) {
    throw TelemetryValidationError(
      field,
      '$field must be between $min and $max.',
    );
  }
}

void _min(num value, String field, num min) {
  if (value < min) {
    throw TelemetryValidationError(
      field,
      '$field must be greater than or equal to $min.',
    );
  }
}
