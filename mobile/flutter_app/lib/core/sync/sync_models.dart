import 'package:equatable/equatable.dart';

enum SyncStatus {
  local,
  pending,
  syncing,
  failed,
  conflict,
  synced,
}

class SyncAction extends Equatable {
  const SyncAction({
    required this.clientActionId,
    required this.tenantId,
    required this.type,
    required this.payload,
    required this.status,
    required this.createdAt,
    this.retryCount = 0,
  });

  final String clientActionId;
  final String tenantId;
  final String type;
  final Map<String, Object?> payload;
  final SyncStatus status;
  final DateTime createdAt;
  final int retryCount;

  SyncAction copyWith({
    String? clientActionId,
    String? tenantId,
    String? type,
    Map<String, Object?>? payload,
    SyncStatus? status,
    DateTime? createdAt,
    int? retryCount,
  }) {
    return SyncAction(
      clientActionId: clientActionId ?? this.clientActionId,
      tenantId: tenantId ?? this.tenantId,
      type: type ?? this.type,
      payload: payload ?? this.payload,
      status: status ?? this.status,
      createdAt: createdAt ?? this.createdAt,
      retryCount: retryCount ?? this.retryCount,
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
      ];
}
