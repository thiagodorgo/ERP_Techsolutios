import 'package:drift/drift.dart';

import '../../features/work_orders/data/work_order_local_store.dart';
import '../../features/work_orders/domain/work_order_models.dart';
import '../../core/sync/sync_models.dart';
import 'app_database.dart';

class DriftWorkOrderLocalStore implements WorkOrderLocalStore {
  DriftWorkOrderLocalStore(this._db);

  final AppDatabase _db;

  // ---------------------------------------------------------------------------
  // Work Orders
  // ---------------------------------------------------------------------------

  @override
  Future<List<WorkOrder>> loadWorkOrders() async {
    final rows = await _db
        .customSelect('SELECT * FROM work_orders ORDER BY created_at DESC')
        .get();
    return rows.map(_workOrderFromRow).toList();
  }

  @override
  Future<void> saveWorkOrder(WorkOrder order) async {
    await _db.customInsert(
      'INSERT OR REPLACE INTO work_orders '
      '(local_id, server_id, tenant_id, code, title, customer_name, '
      'service_address, latitude, longitude, status, priority, '
      'assigned_user_id, scheduled_at, started_at, arrived_at, '
      'completed_at, checklist_id, sync_status, created_at, updated_at) '
      'VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
      variables: [
        Variable<String>(order.localId),
        Variable<String>(order.serverId),
        Variable<String>(order.tenantId),
        Variable<String>(order.code),
        Variable<String>(order.title),
        Variable<String>(order.customerName),
        Variable<String>(order.serviceAddress),
        Variable<double>(order.latitude),
        Variable<double>(order.longitude),
        Variable<String>(order.status.name),
        Variable<String>(order.priority.name),
        Variable<String>(order.assignedUserId),
        Variable<int>(_msOrNull(order.scheduledAt)),
        Variable<int>(_msOrNull(order.startedAt)),
        Variable<int>(_msOrNull(order.arrivedAt)),
        Variable<int>(_msOrNull(order.completedAt)),
        Variable<String>(order.checklistId),
        Variable<String>(order.syncStatus.name),
        Variable<int>(order.createdAt.millisecondsSinceEpoch),
        Variable<int>(_msOrNull(order.updatedAt)),
      ],
    );
  }

  @override
  Future<void> saveWorkOrders(List<WorkOrder> orders) async {
    for (final o in orders) {
      await saveWorkOrder(o);
    }
  }

  // ---------------------------------------------------------------------------
  // Timeline
  // ---------------------------------------------------------------------------

  @override
  Future<List<WorkOrderTimelineEvent>> loadTimeline(
    String workOrderLocalId,
  ) async {
    final rows = await _db
        .customSelect(
          'SELECT * FROM work_order_timeline '
          'WHERE work_order_local_id = ? ORDER BY occurred_at ASC',
          variables: [Variable<String>(workOrderLocalId)],
        )
        .get();
    return rows.map(_timelineFromRow).toList();
  }

  @override
  Future<void> saveTimelineEvent(WorkOrderTimelineEvent event) async {
    await _db.customInsert(
      'INSERT OR REPLACE INTO work_order_timeline '
      '(local_id, work_order_local_id, tenant_id, event_type, '
      'occurred_at, actor_user_id, note, from_status, to_status, sync_status) '
      'VALUES (?,?,?,?,?,?,?,?,?,?)',
      variables: [
        Variable<String>(event.localId),
        Variable<String>(event.workOrderLocalId),
        Variable<String>(event.tenantId),
        Variable<String>(event.eventType.name),
        Variable<int>(event.occurredAt.millisecondsSinceEpoch),
        Variable<String>(event.actorUserId),
        Variable<String>(event.note),
        Variable<String>(event.fromStatus?.name),
        Variable<String>(event.toStatus?.name),
        Variable<String>(event.syncStatus.name),
      ],
    );
  }

  // ---------------------------------------------------------------------------
  // Evidence
  // ---------------------------------------------------------------------------

  @override
  Future<void> saveEvidence(WorkOrderEvidence evidence) async {
    await _db.customInsert(
      'INSERT OR REPLACE INTO work_order_evidence '
      '(local_id, server_id, work_order_local_id, tenant_id, file_name, '
      'mime_type, size_bytes, capture_source, checksum, sync_status, '
      'upload_status, created_at, uploaded_at, upload_error_code, '
      'local_blob_ref) '
      'VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
      variables: [
        Variable<String>(evidence.localId),
        Variable<String>(evidence.serverId),
        Variable<String>(evidence.workOrderLocalId),
        Variable<String>(evidence.tenantId),
        Variable<String>(evidence.fileName),
        Variable<String>(evidence.mimeType),
        Variable<int>(evidence.sizeBytes),
        Variable<String>(evidence.captureSource),
        Variable<String>(evidence.checksum),
        Variable<String>(evidence.syncStatus.name),
        Variable<String>(evidence.uploadStatus.name),
        Variable<int>(evidence.createdAt.millisecondsSinceEpoch),
        Variable<int>(_msOrNull(evidence.uploadedAt)),
        Variable<String>(evidence.uploadErrorCode),
        Variable<String>(evidence.localBlobRef),
      ],
    );
  }

  @override
  Future<List<WorkOrderEvidence>> loadEvidence(String workOrderLocalId) async {
    final rows = await _db
        .customSelect(
          'SELECT * FROM work_order_evidence '
          'WHERE work_order_local_id = ? ORDER BY created_at ASC',
          variables: [Variable<String>(workOrderLocalId)],
        )
        .get();
    return rows.map(_evidenceFromRow).toList();
  }

  @override
  Future<List<WorkOrderEvidence>> loadAllEvidence() async {
    final rows = await _db
        .customSelect(
          'SELECT * FROM work_order_evidence ORDER BY created_at ASC',
        )
        .get();
    return rows.map(_evidenceFromRow).toList();
  }

  @override
  Future<WorkOrderEvidence?> findEvidence(String localId) async {
    final rows = await _db
        .customSelect(
          'SELECT * FROM work_order_evidence WHERE local_id = ? LIMIT 1',
          variables: [Variable<String>(localId)],
        )
        .get();
    if (rows.isEmpty) return null;
    return _evidenceFromRow(rows.first);
  }

  // ---------------------------------------------------------------------------
  // Maintenance
  // ---------------------------------------------------------------------------

  @override
  Future<void> clearAll() async {
    await _db.customStatement('DELETE FROM work_order_evidence');
    await _db.customStatement('DELETE FROM work_order_timeline');
    await _db.customStatement('DELETE FROM work_orders');
  }

  // ---------------------------------------------------------------------------
  // Serialization helpers
  // ---------------------------------------------------------------------------

  WorkOrder _workOrderFromRow(QueryRow row) => WorkOrder(
    localId: row.read<String>('local_id'),
    serverId: row.readNullable<String>('server_id'),
    tenantId: row.read<String>('tenant_id'),
    code: row.read<String>('code'),
    title: row.read<String>('title'),
    customerName: row.read<String>('customer_name'),
    serviceAddress: row.read<String>('service_address'),
    latitude: row.readNullable<double>('latitude'),
    longitude: row.readNullable<double>('longitude'),
    status: WorkOrderStatus.values.byName(row.read<String>('status')),
    priority: WorkOrderPriority.values.byName(row.read<String>('priority')),
    assignedUserId: row.readNullable<String>('assigned_user_id'),
    scheduledAt: _fromMs(row.readNullable<int>('scheduled_at')),
    startedAt: _fromMs(row.readNullable<int>('started_at')),
    arrivedAt: _fromMs(row.readNullable<int>('arrived_at')),
    completedAt: _fromMs(row.readNullable<int>('completed_at')),
    checklistId: row.readNullable<String>('checklist_id'),
    syncStatus: SyncStatus.values.byName(row.read<String>('sync_status')),
    createdAt: DateTime.fromMillisecondsSinceEpoch(
      row.read<int>('created_at'),
      isUtc: true,
    ),
    updatedAt: _fromMs(row.readNullable<int>('updated_at')),
  );

  WorkOrderTimelineEvent _timelineFromRow(QueryRow row) =>
      WorkOrderTimelineEvent(
        localId: row.read<String>('local_id'),
        workOrderLocalId: row.read<String>('work_order_local_id'),
        tenantId: row.read<String>('tenant_id'),
        eventType: WorkOrderTimelineEventType.values.byName(
          row.read<String>('event_type'),
        ),
        occurredAt: DateTime.fromMillisecondsSinceEpoch(
          row.read<int>('occurred_at'),
          isUtc: true,
        ),
        actorUserId: row.readNullable<String>('actor_user_id'),
        note: row.readNullable<String>('note'),
        fromStatus: _statusOrNull(row.readNullable<String>('from_status')),
        toStatus: _statusOrNull(row.readNullable<String>('to_status')),
        syncStatus: SyncStatus.values.byName(row.read<String>('sync_status')),
      );

  WorkOrderEvidence _evidenceFromRow(QueryRow row) => WorkOrderEvidence(
    localId: row.read<String>('local_id'),
    serverId: row.readNullable<String>('server_id'),
    workOrderLocalId: row.read<String>('work_order_local_id'),
    tenantId: row.read<String>('tenant_id'),
    fileName: row.read<String>('file_name'),
    mimeType: row.read<String>('mime_type'),
    sizeBytes: row.read<int>('size_bytes'),
    captureSource: row.read<String>('capture_source'),
    checksum: row.readNullable<String>('checksum'),
    syncStatus: SyncStatus.values.byName(row.read<String>('sync_status')),
    uploadStatus: SyncStatus.values.byName(row.read<String>('upload_status')),
    createdAt: DateTime.fromMillisecondsSinceEpoch(
      row.read<int>('created_at'),
      isUtc: true,
    ),
    uploadedAt: _fromMs(row.readNullable<int>('uploaded_at')),
    uploadErrorCode: row.readNullable<String>('upload_error_code'),
    localBlobRef: row.readNullable<String>('local_blob_ref'),
  );

  static int? _msOrNull(DateTime? dt) => dt?.millisecondsSinceEpoch;

  static DateTime? _fromMs(int? ms) =>
      ms == null ? null : DateTime.fromMillisecondsSinceEpoch(ms, isUtc: true);

  static WorkOrderStatus? _statusOrNull(String? name) =>
      name == null ? null : WorkOrderStatus.values.byName(name);
}
