import 'package:drift/drift.dart';

import '../local_db/app_database.dart';
import '../sync/sync_models.dart';
import 'field_location_models.dart';

abstract class FieldLocationStore {
  Future<void> save(FieldLocationEvent event);
  Future<List<FieldLocationEvent>> eventsForTenant(String tenantId);
  Future<List<FieldLocationEvent>> pendingForTenant(
    String tenantId, {
    required int maxRetry,
  });
  Future<FieldLocationEvent?> latestForWorkOrder({
    required String tenantId,
    required String workOrderLocalId,
  });
}

class InMemoryFieldLocationStore implements FieldLocationStore {
  final Map<String, FieldLocationEvent> _events = {};

  @override
  Future<void> save(FieldLocationEvent event) async {
    _events[event.localId] = event;
  }

  @override
  Future<List<FieldLocationEvent>> eventsForTenant(String tenantId) async {
    return _events.values.where((event) => event.tenantId == tenantId).toList()
      ..sort(_byRecordedAtAsc);
  }

  @override
  Future<List<FieldLocationEvent>> pendingForTenant(
    String tenantId, {
    required int maxRetry,
  }) async {
    return _events.values
        .where((event) => event.tenantId == tenantId)
        .where(
          (event) =>
              event.syncStatus == SyncStatus.pending ||
              event.syncStatus == SyncStatus.failed,
        )
        .where((event) => event.retryCount < maxRetry)
        .toList()
      ..sort(_byRecordedAtAsc);
  }

  @override
  Future<FieldLocationEvent?> latestForWorkOrder({
    required String tenantId,
    required String workOrderLocalId,
  }) async {
    final matches =
        _events.values
            .where((event) => event.tenantId == tenantId)
            .where((event) => event.workOrderLocalId == workOrderLocalId)
            .toList()
          ..sort((a, b) => b.recordedAt.compareTo(a.recordedAt));
    return matches.isEmpty ? null : matches.first;
  }
}

class DriftFieldLocationStore implements FieldLocationStore {
  DriftFieldLocationStore(this._db);

  final AppDatabase _db;

  @override
  Future<void> save(FieldLocationEvent event) async {
    await _db.customInsert(
      'INSERT OR REPLACE INTO field_location_events '
      '(local_id, server_id, tenant_id, work_order_local_id, '
      'work_order_server_id, latitude, longitude, accuracy_meters, '
      'heading_degrees, speed_meters_per_second, battery_level, recorded_at, '
      'sync_status, retry_count, last_error_code, last_safe_error, created_at, '
      'synced_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
      variables: [
        Variable<String>(event.localId),
        Variable<String>(event.serverId),
        Variable<String>(event.tenantId),
        Variable<String>(event.workOrderLocalId),
        Variable<String>(event.workOrderServerId),
        Variable<double>(event.latitude),
        Variable<double>(event.longitude),
        Variable<double>(event.accuracyMeters),
        Variable<double>(event.headingDegrees),
        Variable<double>(event.speedMetersPerSecond),
        Variable<int>(event.batteryLevel),
        Variable<int>(event.recordedAt.millisecondsSinceEpoch),
        Variable<String>(event.syncStatus.name),
        Variable<int>(event.retryCount),
        Variable<String>(event.lastErrorCode),
        Variable<String>(event.lastSafeError),
        Variable<int>(event.createdAt.millisecondsSinceEpoch),
        Variable<int>(event.syncedAt?.millisecondsSinceEpoch),
      ],
    );
  }

  @override
  Future<List<FieldLocationEvent>> eventsForTenant(String tenantId) async {
    final rows = await _db
        .customSelect(
          'SELECT * FROM field_location_events '
          'WHERE tenant_id = ? ORDER BY recorded_at ASC',
          variables: [Variable<String>(tenantId)],
        )
        .get();
    return rows.map(_eventFromRow).toList();
  }

  @override
  Future<List<FieldLocationEvent>> pendingForTenant(
    String tenantId, {
    required int maxRetry,
  }) async {
    final rows = await _db
        .customSelect(
          'SELECT * FROM field_location_events '
          'WHERE tenant_id = ? '
          "AND sync_status IN ('pending', 'failed') "
          'AND retry_count < ? ORDER BY recorded_at ASC',
          variables: [Variable<String>(tenantId), Variable<int>(maxRetry)],
        )
        .get();
    return rows.map(_eventFromRow).toList();
  }

  @override
  Future<FieldLocationEvent?> latestForWorkOrder({
    required String tenantId,
    required String workOrderLocalId,
  }) async {
    final rows = await _db
        .customSelect(
          'SELECT * FROM field_location_events '
          'WHERE tenant_id = ? AND work_order_local_id = ? '
          'ORDER BY recorded_at DESC LIMIT 1',
          variables: [
            Variable<String>(tenantId),
            Variable<String>(workOrderLocalId),
          ],
        )
        .get();
    if (rows.isEmpty) return null;
    return _eventFromRow(rows.first);
  }

  FieldLocationEvent _eventFromRow(QueryRow row) {
    return FieldLocationEvent(
      localId: row.read<String>('local_id'),
      serverId: row.readNullable<String>('server_id'),
      tenantId: row.read<String>('tenant_id'),
      workOrderLocalId: row.read<String>('work_order_local_id'),
      workOrderServerId: row.readNullable<String>('work_order_server_id'),
      latitude: row.read<double>('latitude'),
      longitude: row.read<double>('longitude'),
      accuracyMeters: row.readNullable<double>('accuracy_meters'),
      headingDegrees: row.readNullable<double>('heading_degrees'),
      speedMetersPerSecond: row.readNullable<double>('speed_meters_per_second'),
      batteryLevel: row.readNullable<int>('battery_level'),
      recordedAt: _fromMs(row.read<int>('recorded_at')),
      syncStatus: SyncStatus.values.byName(row.read<String>('sync_status')),
      retryCount: row.read<int>('retry_count'),
      lastErrorCode: row.readNullable<String>('last_error_code'),
      lastSafeError: row.readNullable<String>('last_safe_error'),
      createdAt: _fromMs(row.read<int>('created_at')),
      syncedAt: _fromMsOrNull(row.readNullable<int>('synced_at')),
    );
  }
}

int _byRecordedAtAsc(FieldLocationEvent a, FieldLocationEvent b) =>
    a.recordedAt.compareTo(b.recordedAt);

DateTime _fromMs(int ms) =>
    DateTime.fromMillisecondsSinceEpoch(ms, isUtc: true);

DateTime? _fromMsOrNull(int? ms) => ms == null ? null : _fromMs(ms);
