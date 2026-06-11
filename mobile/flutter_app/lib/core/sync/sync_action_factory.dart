import 'package:uuid/uuid.dart';

import 'sync_models.dart';

class SyncActionFactory {
  SyncActionFactory({Uuid? uuid}) : _uuid = uuid ?? const Uuid();

  final Uuid _uuid;

  SyncAction create({
    required String tenantId,
    required String type,
    required Map<String, Object?> payload,
    String? clientActionId,
    DateTime? createdAt,
  }) {
    if (tenantId.trim().isEmpty) {
      throw ArgumentError.value(tenantId, 'tenantId', 'tenantId is required');
    }
    if (type.trim().isEmpty) {
      throw ArgumentError.value(type, 'type', 'type is required');
    }

    return SyncAction(
      clientActionId: clientActionId ?? _uuid.v4(),
      tenantId: tenantId,
      type: type,
      payload: Map<String, Object?>.unmodifiable(payload),
      status: SyncStatus.pending,
      createdAt: createdAt ?? DateTime.now().toUtc(),
    );
  }
}
