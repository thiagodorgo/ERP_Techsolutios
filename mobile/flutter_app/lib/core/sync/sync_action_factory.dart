import 'package:uuid/uuid.dart';

import 'sync_models.dart';

class SyncActionFactory {
  SyncActionFactory({Uuid? uuid, String? Function()? currentUserId})
    : _uuid = uuid ?? const Uuid(),
      _currentUserId = currentUserId;

  final Uuid _uuid;
  final String? Function()? _currentUserId;

  SyncAction create({
    required String tenantId,
    required String type,
    required Map<String, Object?> payload,
    String? userId,
    String? clientActionId,
    DateTime? createdAt,
  }) {
    if (tenantId.trim().isEmpty) {
      throw ArgumentError.value(tenantId, 'tenantId', 'tenantId is required');
    }
    if (type.trim().isEmpty) {
      throw ArgumentError.value(type, 'type', 'type is required');
    }

    final resolvedUserId =
        _normalizeUserId(userId) ?? _normalizeUserId(_currentUserId?.call());

    return SyncAction(
      clientActionId: clientActionId ?? _uuid.v4(),
      tenantId: tenantId,
      userId: resolvedUserId,
      type: type,
      payload: Map<String, Object?>.unmodifiable(payload),
      status: SyncStatus.pending,
      createdAt: createdAt ?? DateTime.now().toUtc(),
    );
  }

  static String? _normalizeUserId(String? value) {
    final trimmed = value?.trim();
    if (trimmed == null || trimmed.isEmpty) return null;
    return trimmed;
  }
}
