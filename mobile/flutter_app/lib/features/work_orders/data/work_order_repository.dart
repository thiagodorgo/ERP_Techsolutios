import 'package:crypto/crypto.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

import '../../../core/auth/auth_notifier.dart';
import '../../../core/bootstrap/bootstrap_repository.dart';
import '../../../core/bootstrap/bootstrap_session.dart';
import '../../../core/config/app_config.dart';
import '../../../core/evidence/evidence_blob_store.dart';
import '../../../core/local_db/drift_work_order_local_store.dart';
import '../../../core/local_db/database_provider.dart';
import '../../../core/network/api_contracts.dart';
import '../../../core/network/api_error.dart';
import '../../../core/sync/sync_action_factory.dart';
import '../../../core/sync/sync_models.dart';
import '../../../core/sync/sync_providers.dart';
import '../../../core/sync/sync_queue_repository.dart';
import '../domain/work_order_models.dart';
import 'work_order_local_store.dart';
import 'work_order_remote_api.dart';

class WorkOrderMutationResult {
  const WorkOrderMutationResult({
    required this.workOrder,
    required this.action,
  });

  final WorkOrder workOrder;
  final SyncAction action;
}

enum WorkOrderPullOutcome { success, cached, error, pulling }

class WorkOrderRepository extends ChangeNotifier {
  WorkOrderRepository({
    required BootstrapSession session,
    required SyncQueueRepository syncQueue,
    required SyncActionFactory actionFactory,
    required WorkOrderLocalStore localStore,
    List<WorkOrder> seedWorkOrders = const [],
    WorkOrderRemoteApi? remoteApi,
    EvidenceBlobStore? evidenceBlobStore,
  }) : _session = session,
       _syncQueue = syncQueue,
       _actionFactory = actionFactory,
       _localStore = localStore,
       _remoteApi = remoteApi,
       _evidenceBlobStore = evidenceBlobStore,
       _orders = seedWorkOrders;

  final BootstrapSession _session;
  final SyncQueueRepository _syncQueue;
  final SyncActionFactory _actionFactory;
  final WorkOrderLocalStore _localStore;
  final WorkOrderRemoteApi? _remoteApi;
  final EvidenceBlobStore? _evidenceBlobStore;
  final Uuid _uuid = const Uuid();

  List<WorkOrder> _orders;
  bool _loaded = false;
  bool _isPulling = false;
  DateTime? _lastPulledAt;
  String? _lastPullError;

  bool get isPulling => _isPulling;
  DateTime? get lastPulledAt => _lastPulledAt;
  String? get lastPullError => _lastPullError;
  bool get hasRemote => _remoteApi != null;

  List<WorkOrder> get workOrders => List.unmodifiable(_orders);

  List<WorkOrder> workOrdersForUser(String userId) =>
      _orders.where((o) => o.assignedUserId == userId).toList();

  WorkOrder? findById(String localId) {
    for (final o in _orders) {
      if (o.localId == localId) return o;
    }
    return null;
  }

  WorkOrder? findByServerId(String serverId) {
    for (final o in _orders) {
      if (o.serverId == serverId) return o;
    }
    return null;
  }

  Future<void> load({bool seedIfEmpty = true}) async {
    if (_loaded) return;

    final stored = await _localStore.loadWorkOrders();
    final tenantOrders = stored
        .where((o) => o.tenantId == _session.activeTenant.tenantId)
        .toList();

    if (stored.isEmpty && seedIfEmpty && _remoteApi == null) {
      // Only seed fake data in local/dev mode when the store is completely empty.
      // Never seed when other-tenant orders exist; never seed in remote mode.
      _orders = _seedOrders(_session);
      await _localStore.saveWorkOrders(_orders);
    } else {
      _orders = tenantOrders;
    }
    _loaded = true;
    notifyListeners();

    // Kick off a background pull when remote API is configured.
    if (_remoteApi != null) {
      _pullInBackground().ignore();
    }
  }

  /// Triggers a fresh pull from the remote API regardless of [_loaded] state.
  /// Returns [WorkOrderPullOutcome.pulling] in local/dev mode (no-op).
  Future<WorkOrderPullOutcome> refresh() async {
    if (_remoteApi == null) return WorkOrderPullOutcome.pulling;
    if (_isPulling) return WorkOrderPullOutcome.pulling;
    _loaded = false;
    return _pullInBackground();
  }

  Future<void> refreshLocalState() async {
    final stored = await _localStore.loadWorkOrders();
    _orders = stored
        .where((order) => order.tenantId == _session.activeTenant.tenantId)
        .toList();
    notifyListeners();
  }

  Future<WorkOrderPullOutcome> _pullInBackground() async {
    if (_isPulling) return WorkOrderPullOutcome.pulling;
    _isPulling = true;
    notifyListeners();

    try {
      final remote = await _remoteApi!.fetchWorkOrders(
        tenantId: _session.activeTenant.tenantId,
      );
      await _upsertRemoteOrders(remote);
      _lastPulledAt = DateTime.now().toUtc();
      _lastPullError = null;
      _loaded = true;
      return WorkOrderPullOutcome.success;
    } catch (e) {
      _lastPullError = e is ApiError
          ? e.safeMessage
          : 'Nao foi possivel atualizar suas ordens agora.';
      _loaded = true;
      return _orders.isEmpty
          ? WorkOrderPullOutcome.error
          : WorkOrderPullOutcome.cached;
    } finally {
      _isPulling = false;
      notifyListeners();
    }
  }

  /// Upserts remote work orders into Drift, preserving local pending changes.
  Future<void> _upsertRemoteOrders(List<WorkOrder> remote) async {
    final localByServerId = <String, WorkOrder>{
      for (final o in _orders)
        if (o.serverId != null) o.serverId!: o,
    };

    for (final ro in remote) {
      if (ro.serverId == null) continue;
      final existing = localByServerId[ro.serverId!];
      // Preserve local work orders with pending sync actions.
      if (existing != null && existing.syncStatus == SyncStatus.pending) {
        continue;
      }
      // Keep existing localId so cached detail routes stay valid.
      final toSave = existing != null
          ? ro.copyWith(localId: existing.localId)
          : ro;
      await _localStore.saveWorkOrder(toSave);
    }

    final refreshed = await _localStore.loadWorkOrders();
    _orders = refreshed
        .where((o) => o.tenantId == _session.activeTenant.tenantId)
        .toList();
  }

  Future<WorkOrderMutationResult> updateStatus(
    String localId,
    WorkOrderStatus newStatus,
  ) async {
    final idx = _orders.indexWhere((o) => o.localId == localId);
    if (idx == -1) throw StateError('WorkOrder $localId not found');

    final wo = _orders[idx];
    if (!wo.status.canTransitionTo(newStatus)) {
      throw StateError('Invalid transition: ${wo.status} → $newStatus');
    }

    final now = DateTime.now().toUtc();
    final updated = wo.copyWith(
      status: newStatus,
      syncStatus: SyncStatus.pending,
      updatedAt: now,
      startedAt: newStatus == WorkOrderStatus.inService ? now : wo.startedAt,
      arrivedAt: newStatus == WorkOrderStatus.arrived ? now : wo.arrivedAt,
      completedAt: newStatus == WorkOrderStatus.completed
          ? now
          : wo.completedAt,
    );

    final action = _actionFactory.create(
      tenantId: _session.activeTenant.tenantId,
      type: WorkOrderSyncActionTypes.statusUpdate,
      payload: {
        'local_id': localId,
        if (wo.serverId != null && wo.serverId!.trim().isNotEmpty)
          'server_id': wo.serverId!.trim(),
        'new_status': newStatus.name,
        'previous_status': wo.status.name,
        'occurred_at': now.toIso8601String(),
        'message': _messageForStatus(newStatus),
      },
    );

    final timelineEvent = WorkOrderTimelineEvent(
      localId: _uuid.v4(),
      workOrderLocalId: localId,
      tenantId: _session.activeTenant.tenantId,
      eventType: WorkOrderTimelineEventType.statusChanged,
      occurredAt: now,
      fromStatus: wo.status,
      toStatus: newStatus,
      actorUserId: _session.user.userId,
    );

    _orders = List<WorkOrder>.from(_orders)..[idx] = updated;
    await _localStore.saveWorkOrder(updated);
    await _localStore.saveTimelineEvent(timelineEvent);
    await _syncQueue.enqueue(action);
    notifyListeners();

    return WorkOrderMutationResult(workOrder: updated, action: action);
  }

  Future<WorkOrderMutationResult> completeWorkOrder(
    String localId, {
    required bool checklistComplete,
  }) async {
    final idx = _orders.indexWhere((o) => o.localId == localId);
    if (idx == -1) throw StateError('WorkOrder $localId not found');

    final wo = _orders[idx];
    if (!wo.status.canTransitionTo(WorkOrderStatus.completed)) {
      throw StateError('Invalid transition: ${wo.status} → completed');
    }

    if (wo.checklistId != null && !checklistComplete) {
      throw StateError(
        'Conclua o checklist obrigatorio antes de finalizar a OS.',
      );
    }

    final now = DateTime.now().toUtc();
    final updated = wo.copyWith(
      status: WorkOrderStatus.completed,
      syncStatus: SyncStatus.pending,
      completedAt: now,
      updatedAt: now,
    );

    final action = _actionFactory.create(
      tenantId: _session.activeTenant.tenantId,
      type: WorkOrderSyncActionTypes.statusUpdate,
      payload: {
        'local_id': localId,
        if (wo.serverId != null && wo.serverId!.trim().isNotEmpty)
          'server_id': wo.serverId!.trim(),
        'new_status': WorkOrderStatus.completed.name,
        'previous_status': wo.status.name,
        'occurred_at': now.toIso8601String(),
        'message': 'Mobile completed work order.',
      },
    );

    final timelineEvent = WorkOrderTimelineEvent(
      localId: _uuid.v4(),
      workOrderLocalId: localId,
      tenantId: _session.activeTenant.tenantId,
      eventType: WorkOrderTimelineEventType.completed,
      occurredAt: now,
      actorUserId: _session.user.userId,
    );

    _orders = List<WorkOrder>.from(_orders)..[idx] = updated;
    await _localStore.saveWorkOrder(updated);
    await _localStore.saveTimelineEvent(timelineEvent);
    await _syncQueue.enqueue(action);
    notifyListeners();

    return WorkOrderMutationResult(workOrder: updated, action: action);
  }

  Future<WorkOrderMutationResult> createWorkOrder({
    required String title,
    required String customerName,
    required String serviceAddress,
    required WorkOrderPriority priority,
    DateTime? scheduledAt,
    String? checklistId,
  }) async {
    final now = DateTime.now().toUtc();
    final localId = 'wo-local-${_uuid.v4()}';
    final code = 'OS-local-${_orders.length + 1}';

    final wo = WorkOrder(
      localId: localId,
      tenantId: _session.activeTenant.tenantId,
      code: code,
      title: title,
      customerName: customerName,
      serviceAddress: serviceAddress,
      status: WorkOrderStatus.scheduled,
      priority: priority,
      syncStatus: SyncStatus.pending,
      createdAt: now,
      scheduledAt: scheduledAt,
      checklistId: checklistId,
    );

    final action = _actionFactory.create(
      tenantId: _session.activeTenant.tenantId,
      type: WorkOrderSyncActionTypes.create,
      payload: {
        'local_id': localId,
        'code': code,
        'title': title,
        'customer_name': customerName,
        'service_address': serviceAddress,
        'priority': priority.name,
        'scheduled_at': scheduledAt?.toIso8601String(),
        'checklist_id': checklistId,
        'created_at': now.toIso8601String(),
      },
    );

    final timelineEvent = WorkOrderTimelineEvent(
      localId: _uuid.v4(),
      workOrderLocalId: localId,
      tenantId: _session.activeTenant.tenantId,
      eventType: WorkOrderTimelineEventType.created,
      occurredAt: now,
      actorUserId: _session.user.userId,
    );

    _orders = [..._orders, wo];
    await _localStore.saveWorkOrder(wo);
    await _localStore.saveTimelineEvent(timelineEvent);
    await _syncQueue.enqueue(action);
    notifyListeners();

    return WorkOrderMutationResult(workOrder: wo, action: action);
  }

  Future<SyncAction> createApprovalRequest({
    required String localId,
    required String reason,
    required String impact,
    required String urgency,
  }) async {
    if (reason.trim().isEmpty) {
      throw ArgumentError.value(reason, 'reason', 'reason is required');
    }

    final wo = findById(localId);
    if (wo == null) throw StateError('WorkOrder $localId not found');

    final now = DateTime.now().toUtc();
    final action = _actionFactory.create(
      tenantId: _session.activeTenant.tenantId,
      type: WorkOrderSyncActionTypes.approvalRequest,
      payload: {
        'local_id': localId,
        'server_id': wo.serverId,
        'reason': reason,
        'impact': impact,
        'urgency': urgency,
        'requested_at': now.toIso8601String(),
        'requested_by_user_id': _session.user.userId,
      },
    );

    final timelineEvent = WorkOrderTimelineEvent(
      localId: _uuid.v4(),
      workOrderLocalId: localId,
      tenantId: _session.activeTenant.tenantId,
      eventType: WorkOrderTimelineEventType.approvalRequested,
      occurredAt: now,
      note: reason,
      actorUserId: _session.user.userId,
    );

    await _localStore.saveTimelineEvent(timelineEvent);
    await _syncQueue.enqueue(action);
    notifyListeners();

    return action;
  }

  /// Timeline do detalhe/check-in: quando ha API e id de servidor, busca o
  /// historico real (GET /work-orders/:id/timeline). Em falha de rede/timeout
  /// ou 404/403 (ApiError), cai de forma segura para o cache local — sem
  /// quebrar a tela e sem stack trace.
  Future<List<WorkOrderTimelineEvent>> loadTimeline(String localId) async {
    final remote = _remoteApi;
    if (remote != null) {
      String? serverId;
      for (final order in _orders) {
        if (order.localId == localId) {
          serverId = order.serverId;
          break;
        }
      }
      if (serverId != null && serverId.isNotEmpty) {
        try {
          final events = await remote.fetchTimeline(serverId);
          if (events.isNotEmpty) return events;
        } on ApiError {
          // Falha segura — mantem o historico local.
        } catch (_) {
          // Qualquer outra falha inesperada tambem cai para o local.
        }
      }
    }
    return _localStore.loadTimeline(localId);
  }

  Future<WorkOrderEvidence> attachEvidence({
    required String workOrderLocalId,
    required String fileName,
    required String mimeType,
    required int sizeBytes,
    required String captureSource,
    String? checksum,
    Uint8List? bytes,
  }) async {
    final wo = findById(workOrderLocalId);
    if (wo == null) throw StateError('WorkOrder $workOrderLocalId not found');
    if (wo.tenantId != _session.activeTenant.tenantId) {
      throw StateError('Tenant mismatch');
    }
    if (sizeBytes <= 0 || sizeBytes > 10 * 1024 * 1024) {
      throw ArgumentError.value(
        sizeBytes,
        'sizeBytes',
        'Invalid evidence size',
      );
    }
    if (bytes != null && bytes.length != sizeBytes) {
      throw ArgumentError.value(
        bytes.length,
        'bytes',
        'Evidence size mismatch',
      );
    }

    final now = DateTime.now().toUtc();
    final trimmedChecksum = checksum?.trim();
    final normalizedChecksum =
        trimmedChecksum != null && trimmedChecksum.isNotEmpty
        ? trimmedChecksum
        : (bytes == null ? null : sha256.convert(bytes).toString());
    final localBlobRef = bytes == null || _evidenceBlobStore == null
        ? null
        : await _evidenceBlobStore.save(bytes, contentType: mimeType);
    final evidenceLocalId = 'woevid-local-${_uuid.v4()}';
    final evidence = WorkOrderEvidence(
      localId: evidenceLocalId,
      workOrderLocalId: workOrderLocalId,
      tenantId: _session.activeTenant.tenantId,
      fileName: fileName,
      mimeType: mimeType,
      sizeBytes: sizeBytes,
      captureSource: captureSource,
      checksum: normalizedChecksum != null && normalizedChecksum.isNotEmpty
          ? normalizedChecksum
          : null,
      syncStatus: SyncStatus.pending,
      uploadStatus: SyncStatus.pending,
      localBlobRef: localBlobRef,
      createdAt: now,
    );

    await _localStore.saveEvidence(evidence);

    final action = _actionFactory.create(
      tenantId: _session.activeTenant.tenantId,
      type: EvidenceSyncActionTypes.workOrderPhoto,
      clientActionId: evidenceLocalId,
      payload: {
        'local_evidence_id': evidenceLocalId,
        if (wo.serverId != null && wo.serverId!.trim().isNotEmpty)
          'work_order_id': wo.serverId!.trim(),
        'kind': 'photo',
        'file_name': fileName,
        'content_type': mimeType,
        'size_bytes': sizeBytes,
        if (normalizedChecksum != null && normalizedChecksum.isNotEmpty)
          'sha256': normalizedChecksum,
      },
    );
    await _syncQueue.enqueue(action);
    notifyListeners();
    return evidence;
  }

  Future<List<WorkOrderEvidence>> loadEvidence(String workOrderLocalId) =>
      _localStore.loadEvidence(workOrderLocalId);

  Future<SyncAction> reportUnableToStart({
    required String localId,
    required String reason,
    required String note,
  }) async {
    final wo = findById(localId);
    if (wo == null) throw StateError('WorkOrder $localId not found');

    final now = DateTime.now().toUtc();
    final action = _actionFactory.create(
      tenantId: _session.activeTenant.tenantId,
      type: WorkOrderSyncActionTypes.unableToStart,
      payload: {
        'local_id': localId,
        if (wo.serverId != null && wo.serverId!.trim().isNotEmpty)
          'server_id': wo.serverId!.trim(),
        'reason': reason,
        'note': note,
        'occurred_at': now.toIso8601String(),
        'reported_by_user_id': _session.user.userId,
      },
    );

    final timelineEvent = WorkOrderTimelineEvent(
      localId: _uuid.v4(),
      workOrderLocalId: localId,
      tenantId: _session.activeTenant.tenantId,
      eventType: WorkOrderTimelineEventType.exceptionRaised,
      occurredAt: now,
      note: '$reason: $note',
      actorUserId: _session.user.userId,
    );

    await _localStore.saveTimelineEvent(timelineEvent);
    await _syncQueue.enqueue(action);
    notifyListeners();
    return action;
  }
}

// Providers

final workOrderLocalStoreProvider = Provider<WorkOrderLocalStore>(
  (ref) => DriftWorkOrderLocalStore(ref.watch(appDatabaseProvider)),
);

// Returns DioWorkOrderRemoteApi when ERP_AUTH_MODE=remote and a token is available.
// Returns null in local/dev mode so WorkOrderRepository stays in seed-only mode.
final workOrderRemoteApiProvider = Provider<WorkOrderRemoteApi?>((ref) {
  if (!kIsRemoteAuth) return null;
  final config = ref.watch(authenticatedApiConfigProvider);
  if (config.accessToken == null) return null;
  return DioWorkOrderRemoteApi.create(config);
});

final workOrderRepositoryProvider = Provider<WorkOrderRepository>((ref) {
  final session = ref
      .watch(bootstrapSessionProvider)
      .maybeWhen(data: (v) => v, orElse: () => devBootstrapSession);

  return WorkOrderRepository(
    session: session,
    syncQueue: ref.watch(syncQueueRepositoryProvider),
    actionFactory: ref.watch(syncActionFactoryProvider),
    localStore: ref.watch(workOrderLocalStoreProvider),
    remoteApi: ref.watch(workOrderRemoteApiProvider),
    evidenceBlobStore: ref.watch(evidenceBlobStoreProvider),
  );
});

String _messageForStatus(WorkOrderStatus status) {
  return switch (status) {
    WorkOrderStatus.dispatched => 'Mobile accepted dispatch.',
    WorkOrderStatus.enRoute => 'Mobile technician en route.',
    WorkOrderStatus.arrived => 'Mobile arrived on site.',
    WorkOrderStatus.inService => 'Mobile started work order.',
    WorkOrderStatus.paused => 'Mobile paused work order.',
    WorkOrderStatus.pendingApproval => 'Mobile requested approval.',
    WorkOrderStatus.completed => 'Mobile completed work order.',
    WorkOrderStatus.cancelled => 'Mobile cancelled work order.',
    _ => 'Mobile updated work order status.',
  };
}

List<WorkOrder> _seedOrders(BootstrapSession session) {
  final tenantId = session.activeTenant.tenantId;
  final now = DateTime.utc(2026, 6, 11);
  return [
    WorkOrder(
      localId: 'wo-local-1',
      tenantId: tenantId,
      code: 'OS-1042',
      title: 'Instalacao de ar-condicionado',
      customerName: 'Cliente Demo Ltda',
      serviceAddress: 'Av. Paulista, 1000 - Sao Paulo',
      status: WorkOrderStatus.inService,
      priority: WorkOrderPriority.high,
      assignedUserId: session.user.userId,
      scheduledAt: now,
      startedAt: now,
      syncStatus: SyncStatus.synced,
      createdAt: now,
      checklistId: 'cl-seed-1',
    ),
    WorkOrder(
      localId: 'wo-local-2',
      tenantId: tenantId,
      code: 'OS-1043',
      title: 'Manutencao preventiva de bomba hidraulica',
      customerName: 'Industria Exemplo SA',
      serviceAddress: 'Rua das Industrias, 500 - Santo Andre',
      status: WorkOrderStatus.scheduled,
      priority: WorkOrderPriority.normal,
      scheduledAt: now.add(const Duration(days: 1)),
      syncStatus: SyncStatus.synced,
      createdAt: now,
    ),
    WorkOrder(
      localId: 'wo-local-3',
      tenantId: tenantId,
      code: 'OS-1044',
      title: 'Reparo de painel eletrico',
      customerName: 'Condominio Torres Verde',
      serviceAddress: 'Rua Verde, 200 - Campinas',
      status: WorkOrderStatus.pendingApproval,
      priority: WorkOrderPriority.critical,
      assignedUserId: session.user.userId,
      syncStatus: SyncStatus.pending,
      createdAt: now,
    ),
  ];
}
