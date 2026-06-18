import 'package:equatable/equatable.dart';

enum SyncStatus { local, pending, syncing, failed, conflict, synced }

class SyncAction extends Equatable {
  const SyncAction({
    required this.clientActionId,
    required this.tenantId,
    required this.type,
    required this.payload,
    required this.status,
    required this.createdAt,
    this.retryCount = 0,
    this.lastErrorCode,
    this.lastSafeError,
    this.processedAt,
  });

  final String clientActionId;
  final String tenantId;
  final String type;
  final Map<String, Object?> payload;
  final SyncStatus status;
  final DateTime createdAt;
  final int retryCount;
  final String? lastErrorCode;
  final String? lastSafeError;
  final DateTime? processedAt;

  SyncAction copyWith({
    String? clientActionId,
    String? tenantId,
    String? type,
    Map<String, Object?>? payload,
    SyncStatus? status,
    DateTime? createdAt,
    int? retryCount,
    String? lastErrorCode,
    String? lastSafeError,
    DateTime? processedAt,
    bool clearLastErrorCode = false,
    bool clearLastSafeError = false,
    bool clearProcessedAt = false,
  }) {
    return SyncAction(
      clientActionId: clientActionId ?? this.clientActionId,
      tenantId: tenantId ?? this.tenantId,
      type: type ?? this.type,
      payload: payload ?? this.payload,
      status: status ?? this.status,
      createdAt: createdAt ?? this.createdAt,
      retryCount: retryCount ?? this.retryCount,
      lastErrorCode: clearLastErrorCode
          ? null
          : (lastErrorCode ?? this.lastErrorCode),
      lastSafeError: clearLastSafeError
          ? null
          : (lastSafeError ?? this.lastSafeError),
      processedAt: clearProcessedAt ? null : (processedAt ?? this.processedAt),
    );
  }

  @override
  List<Object?> get props => [
    clientActionId,
    tenantId,
    type,
    payload,
    status,
    createdAt,
    retryCount,
    lastErrorCode,
    lastSafeError,
    processedAt,
  ];
}
