import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

import '../../../core/bootstrap/bootstrap_repository.dart';
import '../../../core/bootstrap/bootstrap_session.dart';
import '../../../core/local_db/drift_work_order_local_store.dart';
import '../../../core/local_db/database_provider.dart';
import '../../../core/sync/sync_action_factory.dart';
import '../../../core/sync/sync_models.dart';
import '../../../core/sync/sync_providers.dart';
import '../../../core/sync/sync_queue_repository.dart';
import '../../../core/network/api_contracts.dart';
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

class WorkOrderRepository extends ChangeNotifier {
  WorkOrderRepository({
    required BootstrapSession session,
    required SyncQueueRepository syncQueue,
    required SyncActionFactory actionFactory,
    required WorkOrderLocalStore localStore,
    List<WorkOrder> seedWorkOrders = const [],
  }) : _session = session,
       _syncQueue = syncQueue,
       _actionFactory = actionFactory,
       _localStore = localStore,
       _orders = seedWorkOrders;

  final BootstrapSession _session;
  final SyncQueueRepository _syncQueue;
  final SyncActionFactory _actionFactory;
  final WorkOrderLocalStore _localStore;
  final Uuid _uuid = const Uuid();

  List<WorkOrder> _orders;
  bool _loaded = false;

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
    if (stored.isEmpty && seedIfEmpty) {
      _orders = _seedOrders(_session);
      await _localStore.saveWorkOrders(_orders);
    } else {
      _orders = stored
          .where((o) => o.tenantId == _session.activeTenant.tenantId)
          .toList();
    }
    _loaded = true;
    notifyListeners();
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
        'client_action_id_ref': _uuid.v4(),
        'local_id': localId,
        'server_id': wo.serverId,
        'new_status': newStatus.name,
        'previous_status': wo.status.name,
        'occurred_at': now.toIso8601String(),
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
        'server_id': wo.serverId,
        'new_status': WorkOrderStatus.completed.name,
        'previous_status': wo.status.name,
        'occurred_at': now.toIso8601String(),
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

  Future<List<WorkOrderTimelineEvent>> loadTimeline(String localId) =>
      _localStore.loadTimeline(localId);

  Future<WorkOrderEvidence> attachEvidence({
    required String workOrderLocalId,
    required String fileName,
    required String mimeType,
    required int sizeBytes,
    required String captureSource,
    String? checksum,
  }) async {
    final wo = findById(workOrderLocalId);
    if (wo == null) throw StateError('WorkOrder $workOrderLocalId not found');
    if (wo.tenantId != _session.activeTenant.tenantId) {
      throw StateError('Tenant mismatch');
    }

    final now = DateTime.now().toUtc();
    final evidence = WorkOrderEvidence(
      localId: 'woevid-local-${_uuid.v4()}',
      workOrderLocalId: workOrderLocalId,
      tenantId: _session.activeTenant.tenantId,
      fileName: fileName,
      mimeType: mimeType,
      sizeBytes: sizeBytes,
      captureSource: captureSource,
      checksum: checksum,
      syncStatus: SyncStatus.pending,
      createdAt: now,
    );

    await _localStore.saveEvidence(evidence);

    final action = _actionFactory.create(
      tenantId: _session.activeTenant.tenantId,
      type: WorkOrderSyncActionTypes.evidenceAttach,
      payload: {
        'local_evidence_id': evidence.localId,
        'work_order_local_id': workOrderLocalId,
        'work_order_server_id': wo.serverId,
        'file_name': fileName,
        'mime_type': mimeType,
        'size_bytes': sizeBytes,
        'capture_source': captureSource,
        'created_at': now.toIso8601String(),
        'checksum': ?checksum,
      },
    );
    await _syncQueue.enqueue(action);
    notifyListeners();
    return evidence;
  }

  Future<List<WorkOrderEvidence>> loadEvidence(String workOrderLocalId) =>
      _localStore.loadEvidence(workOrderLocalId);
}

// Providers

final workOrderLocalStoreProvider = Provider<WorkOrderLocalStore>(
  (ref) => DriftWorkOrderLocalStore(ref.watch(appDatabaseProvider)),
);

final workOrderRepositoryProvider = Provider<WorkOrderRepository>((ref) {
  final session = ref
      .watch(bootstrapSessionProvider)
      .maybeWhen(data: (v) => v, orElse: () => devBootstrapSession);

  return WorkOrderRepository(
    session: session,
    syncQueue: ref.watch(syncQueueRepositoryProvider),
    actionFactory: ref.watch(syncActionFactoryProvider),
    localStore: ref.watch(workOrderLocalStoreProvider),
  );
});

final workOrderRemoteApiProvider = Provider<WorkOrderRemoteApi>(
  (ref) => const PendingBackendWorkOrderRemoteApi(),
);

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
