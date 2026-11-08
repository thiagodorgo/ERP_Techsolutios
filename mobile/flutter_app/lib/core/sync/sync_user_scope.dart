import '../network/api_contracts.dart';
import 'sync_models.dart';
import 'sync_queue_repository.dart';
import 'sync_stalled_resolver.dart';

class SyncOwnershipError extends StateError {
  SyncOwnershipError(super.message);
}

String? _normalizeUserId(String? value) {
  final trimmed = value?.trim();
  if (trimmed == null || trimmed.isEmpty) return null;
  return trimmed;
}

bool isOwnedBy(SyncAction action, String? userId) {
  final uid = _normalizeUserId(userId);
  final owner = _normalizeUserId(action.userId);
  return uid != null && owner != null && owner == uid;
}

({List<SyncAction> mine, List<SyncAction> others, List<SyncAction> legacy})
partitionByUser(Iterable<SyncAction> actions, String? userId) {
  final uid = _normalizeUserId(userId);
  final mine = <SyncAction>[];
  final others = <SyncAction>[];
  final legacy = <SyncAction>[];

  for (final action in actions) {
    final owner = _normalizeUserId(action.userId);
    if (owner == null) {
      legacy.add(action);
    } else if (uid != null && owner == uid) {
      mine.add(action);
    } else {
      others.add(action);
    }
  }

  return (mine: mine, others: others, legacy: legacy);
}

String? _readEmployeeIdFromPayload(Map<String, Object?> payload) {
  for (final key in const <String>['employee_id', 'employeeUserId']) {
    final raw = payload[key];
    if (raw is String) {
      final normalized = _normalizeUserId(raw);
      if (normalized != null) return normalized;
    }
  }
  return null;
}

String? _legacyExpenseEmployeeId(
  SyncAction action,
  Iterable<SyncAction> allTenantActions,
) {
  final direct = _readEmployeeIdFromPayload(action.payload);
  if (direct != null) return direct;

  final rawReportLocalId = action.payload['report_local_id'];
  if (rawReportLocalId is! String || rawReportLocalId.trim().isEmpty) {
    return null;
  }
  final reportLocalId = rawReportLocalId.trim();

  for (final candidate in allTenantActions) {
    if (candidate.type != ExpenseSyncActionTypes.reportCreate) continue;
    final candidateLocalId = candidate.payload['local_id'];
    if (candidateLocalId is String &&
        candidateLocalId.trim() == reportLocalId) {
      final reportOwner = _readEmployeeIdFromPayload(candidate.payload);
      if (reportOwner != null) return reportOwner;
    }
  }
  return null;
}

/// Retorna `true` quando [action] é legada (`userId == null`) e pode ser
/// assumida pelo [userId] da sessão em vigor (S-n7: despesas cujo
/// `report.create` carrega `employee_id` de outro usuário não podem ser
/// assumidas por terceiro).
bool canAssumeLegacyAction(
  SyncAction action,
  String? userId, {
  Iterable<SyncAction> allTenantActions = const <SyncAction>[],
}) {
  final uid = _normalizeUserId(userId);
  if (uid == null) return false;
  if (_normalizeUserId(action.userId) != null) return false;

  if (ExpenseSyncActionTypes.supported.contains(action.type)) {
    final expenseEmployeeId = _legacyExpenseEmployeeId(
      action,
      allTenantActions,
    );
    if (expenseEmployeeId != null && expenseEmployeeId != uid) {
      return false;
    }
  }

  return true;
}

SyncAction assignActionToUser(
  SyncAction action,
  String userId, {
  Iterable<SyncAction> allTenantActions = const <SyncAction>[],
}) {
  final uid = _normalizeUserId(userId);
  if (uid == null) return action;
  if (!canAssumeLegacyAction(action, uid, allTenantActions: allTenantActions)) {
    return action;
  }
  return action.copyWith(userId: uid);
}

SyncAction discardLegacyAction(SyncAction action, {DateTime? discardedAt}) {
  if (_normalizeUserId(action.userId) != null) return action;
  if (!canDiscardSyncAction(action.type)) return action;

  return action.copyWith(
    status: SyncStatus.synced,
    lastErrorCode: syncDiscardedErrorCode,
    lastSafeError: syncDiscardedSafeError,
    processedAt: discardedAt ?? DateTime.now().toUtc(),
  );
}

class UserScopedSyncQueueRepository implements SyncQueueRepository {
  UserScopedSyncQueueRepository({
    required SyncQueueRepository queue,
    required String? Function() currentUserId,
  }) : _queue = queue,
       _currentUserId = currentUserId;

  final SyncQueueRepository _queue;
  final String? Function() _currentUserId;

  @override
  Future<void> enqueue(SyncAction action) => _queue.enqueue(action);

  @override
  Future<List<SyncAction>> pendingForTenant(String tenantId) async {
    final uid = _normalizeUserId(_currentUserId());
    if (uid == null) return const <SyncAction>[];
    final pending = await _queue.pendingForTenant(tenantId);
    return pending
        .where((action) => isOwnedBy(action, uid))
        .toList(growable: false);
  }

  @override
  Future<List<SyncAction>> actionsForTenant(String tenantId) =>
      _queue.actionsForTenant(tenantId);

  @override
  Future<void> update(SyncAction action) async {
    final uid = _normalizeUserId(_currentUserId());
    final existingActions = await _queue.actionsForTenant(action.tenantId);
    SyncAction? existing;
    for (final candidate in existingActions) {
      if (candidate.clientActionId == action.clientActionId) {
        existing = candidate;
        break;
      }
    }
    final target = existing ?? action;
    if (!isOwnedBy(target, uid) || !isOwnedBy(action, uid)) {
      throw SyncOwnershipError(
        'Ação pertence a outro usuário e não pode ser alterada nesta sessão.',
      );
    }
    await _queue.update(action);
  }
}
