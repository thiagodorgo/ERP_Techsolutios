import 'package:equatable/equatable.dart';

import '../sync/sync_models.dart';

class FieldLocationValidationError extends Error {
  FieldLocationValidationError(this.field, this.message);

  final String field;
  final String message;

  @override
  String toString() => 'FieldLocationValidationError($field): $message';
}

class FieldLocationFix extends Equatable {
  FieldLocationFix({
    required this.latitude,
    required this.longitude,
    required DateTime recordedAt,
    this.accuracyMeters,
    this.headingDegrees,
    this.speedMetersPerSecond,
    this.batteryLevel,
  }) : recordedAt = recordedAt.toUtc() {
    _validate();
  }

  final double latitude;
  final double longitude;
  final double? accuracyMeters;
  final double? headingDegrees;
  final double? speedMetersPerSecond;
  final int? batteryLevel;
  final DateTime recordedAt;

  void _validate() {
    _range(latitude, 'latitude', -90, 90);
    _range(longitude, 'longitude', -180, 180);
    if (accuracyMeters != null) {
      _min(accuracyMeters!, 'accuracyMeters', 0);
    }
    if (headingDegrees != null) {
      _range(headingDegrees!, 'headingDegrees', 0, 360);
    }
    if (speedMetersPerSecond != null) {
      _min(speedMetersPerSecond!, 'speedMetersPerSecond', 0);
    }
    if (batteryLevel != null && (batteryLevel! < 0 || batteryLevel! > 100)) {
      throw FieldLocationValidationError(
        'batteryLevel',
        'batteryLevel must be between 0 and 100.',
      );
    }
  }

  @override
  List<Object?> get props => [
    latitude,
    longitude,
    accuracyMeters,
    headingDegrees,
    speedMetersPerSecond,
    batteryLevel,
    recordedAt,
  ];
}

class FieldLocationEvent extends Equatable {
  FieldLocationEvent({
    required this.localId,
    required this.tenantId,
    required this.workOrderLocalId,
    required this.latitude,
    required this.longitude,
    required DateTime recordedAt,
    required this.syncStatus,
    required this.retryCount,
    required DateTime createdAt,
    this.serverId,
    this.workOrderServerId,
    this.accuracyMeters,
    this.headingDegrees,
    this.speedMetersPerSecond,
    this.batteryLevel,
    this.lastErrorCode,
    this.lastSafeError,
    this.syncedAt,
  }) : recordedAt = recordedAt.toUtc(),
       createdAt = createdAt.toUtc() {
    FieldLocationFix(
      latitude: latitude,
      longitude: longitude,
      accuracyMeters: accuracyMeters,
      headingDegrees: headingDegrees,
      speedMetersPerSecond: speedMetersPerSecond,
      batteryLevel: batteryLevel,
      recordedAt: recordedAt,
    );
  }

  final String localId;
  final String? serverId;
  final String tenantId;
  final String workOrderLocalId;
  final String? workOrderServerId;
  final double latitude;
  final double longitude;
  final double? accuracyMeters;
  final double? headingDegrees;
  final double? speedMetersPerSecond;
  final int? batteryLevel;
  final DateTime recordedAt;
  final SyncStatus syncStatus;
  final int retryCount;
  final String? lastErrorCode;
  final String? lastSafeError;
  final DateTime createdAt;
  final DateTime? syncedAt;

  FieldLocationEvent copyWith({
    String? localId,
    String? serverId,
    String? tenantId,
    String? workOrderLocalId,
    String? workOrderServerId,
    double? latitude,
    double? longitude,
    double? accuracyMeters,
    double? headingDegrees,
    double? speedMetersPerSecond,
    int? batteryLevel,
    DateTime? recordedAt,
    SyncStatus? syncStatus,
    int? retryCount,
    String? lastErrorCode,
    String? lastSafeError,
    DateTime? createdAt,
    DateTime? syncedAt,
    bool clearServerId = false,
    bool clearLastError = false,
  }) {
    return FieldLocationEvent(
      localId: localId ?? this.localId,
      serverId: clearServerId ? null : (serverId ?? this.serverId),
      tenantId: tenantId ?? this.tenantId,
      workOrderLocalId: workOrderLocalId ?? this.workOrderLocalId,
      workOrderServerId: workOrderServerId ?? this.workOrderServerId,
      latitude: latitude ?? this.latitude,
      longitude: longitude ?? this.longitude,
      accuracyMeters: accuracyMeters ?? this.accuracyMeters,
      headingDegrees: headingDegrees ?? this.headingDegrees,
      speedMetersPerSecond: speedMetersPerSecond ?? this.speedMetersPerSecond,
      batteryLevel: batteryLevel ?? this.batteryLevel,
      recordedAt: recordedAt ?? this.recordedAt,
      syncStatus: syncStatus ?? this.syncStatus,
      retryCount: retryCount ?? this.retryCount,
      lastErrorCode: clearLastError
          ? null
          : (lastErrorCode ?? this.lastErrorCode),
      lastSafeError: clearLastError
          ? null
          : (lastSafeError ?? this.lastSafeError),
      createdAt: createdAt ?? this.createdAt,
      syncedAt: syncedAt ?? this.syncedAt,
    );
  }

  @override
  List<Object?> get props => [
    localId,
    serverId,
    tenantId,
    workOrderLocalId,
    workOrderServerId,
    latitude,
    longitude,
    accuracyMeters,
    headingDegrees,
    speedMetersPerSecond,
    batteryLevel,
    recordedAt,
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
    throw FieldLocationValidationError(
      field,
      '$field must be between $min and $max.',
    );
  }
}

void _min(num value, String field, num min) {
  if (value < min) {
    throw FieldLocationValidationError(
      field,
      '$field must be greater than or equal to $min.',
    );
  }
}
