import 'package:drift/drift.dart';

import '../local_db/app_database.dart';
import '../sync/sync_models.dart';
import 'telemetry_event.dart';

/// Buffer local DEDICADO da telemetria (D-Ω4C-TELE-FLUTTER-BUFFER).
///
/// NÃO reusa a fila `sync_actions` compartilhada: telemetria é alto volume
/// (heartbeat a cada N s), tem envelope próprio e a falha de flush precisa ficar
/// ISOLADA dos demais domínios (OS/checklist/RDV). Espelha o precedente vivo do
/// field-location (`field_location_events` + `FieldLocationSyncService`).
abstract class TelemetryLocalStore {
  /// Enfileira um novo evento (upsert por `localId`).
  Future<void> enqueue(TelemetryEvent event);

  /// Upsert (usado para `markFailed`/retry).
  Future<void> save(TelemetryEvent event);

  /// Eventos pendentes/failed do tenant, `capturedAt` ASC, com teto de lote e de
  /// retry (não devolve o que já estourou o cap).
  Future<List<TelemetryEvent>> pendingForTenant(
    String tenantId, {
    int limit = 50,
    int maxRetry = 5,
  });

  /// Todos os eventos do tenant (diagnóstico/teste).
  Future<List<TelemetryEvent>> eventsForTenant(String tenantId);

  /// Remove uma linha (purga de estado terminal: accepted/already_applied/rejected
  /// ou retry esgotado).
  Future<void> remove(String localId);

  /// Housekeeping — remove linhas já marcadas `synced` do tenant.
  Future<void> purgeSynced(String tenantId);
}

class InMemoryTelemetryLocalStore implements TelemetryLocalStore {
  InMemoryTelemetryLocalStore([List<TelemetryEvent> seed = const []]) {
    for (final event in seed) {
      _events[event.localId] = event;
    }
  }

  final Map<String, TelemetryEvent> _events = {};

  @override
  Future<void> enqueue(TelemetryEvent event) => save(event);

  @override
  Future<void> save(TelemetryEvent event) async {
    _events[event.localId] = event;
  }

  @override
  Future<List<TelemetryEvent>> pendingForTenant(
    String tenantId, {
    int limit = 50,
    int maxRetry = 5,
  }) async {
    final pending =
        _events.values
            .where((event) => event.tenantId == tenantId)
            .where(
              (event) =>
                  event.syncStatus == SyncStatus.pending ||
                  event.syncStatus == SyncStatus.failed,
            )
            .where((event) => event.retryCount < maxRetry)
            .toList()
          ..sort((a, b) => a.capturedAt.compareTo(b.capturedAt));
    return pending.take(limit).toList(growable: false);
  }

  @override
  Future<List<TelemetryEvent>> eventsForTenant(String tenantId) async {
    return _events.values.where((event) => event.tenantId == tenantId).toList()
      ..sort((a, b) => a.capturedAt.compareTo(b.capturedAt));
  }

  @override
  Future<void> remove(String localId) async {
    _events.remove(localId);
  }

  @override
  Future<void> purgeSynced(String tenantId) async {
    _events.removeWhere(
      (_, event) =>
          event.tenantId == tenantId && event.syncStatus == SyncStatus.synced,
    );
  }
}

class DriftTelemetryLocalStore implements TelemetryLocalStore {
  DriftTelemetryLocalStore(this._db);

  final AppDatabase _db;

  @override
  Future<void> enqueue(TelemetryEvent event) => save(event);

  @override
  Future<void> save(TelemetryEvent event) async {
    await _db.customInsert(
      'INSERT OR REPLACE INTO telemetry_events '
      '(local_id, tenant_id, client_action_id, event_type, captured_at, '
      'latitude, longitude, accuracy_meters, speed_kmh, signal_type, '
      'app_version, work_order_id, refusal_reason, sync_status, retry_count, '
      'last_error_code, last_safe_error, created_at, synced_at) '
      'VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
      variables: [
        Variable<String>(event.localId),
        Variable<String>(event.tenantId),
        Variable<String>(event.clientActionId),
        Variable<String>(event.eventType.wire),
        Variable<int>(event.capturedAt.millisecondsSinceEpoch),
        Variable<double>(event.latitude),
        Variable<double>(event.longitude),
        Variable<double>(event.accuracyMeters),
        Variable<double>(event.speedKmh),
        Variable<String>(event.signalType?.wire),
        Variable<String>(event.appVersion),
        Variable<String>(event.workOrderId),
        Variable<String>(event.refusalReason),
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
  Future<List<TelemetryEvent>> pendingForTenant(
    String tenantId, {
    int limit = 50,
    int maxRetry = 5,
  }) async {
    final rows = await _db
        .customSelect(
          'SELECT * FROM telemetry_events '
          'WHERE tenant_id = ? '
          "AND sync_status IN ('pending', 'failed') "
          'AND retry_count < ? ORDER BY captured_at ASC LIMIT ?',
          variables: [
            Variable<String>(tenantId),
            Variable<int>(maxRetry),
            Variable<int>(limit),
          ],
        )
        .get();
    return rows.map(_eventFromRow).toList();
  }

  @override
  Future<List<TelemetryEvent>> eventsForTenant(String tenantId) async {
    final rows = await _db
        .customSelect(
          'SELECT * FROM telemetry_events '
          'WHERE tenant_id = ? ORDER BY captured_at ASC',
          variables: [Variable<String>(tenantId)],
        )
        .get();
    return rows.map(_eventFromRow).toList();
  }

  @override
  Future<void> remove(String localId) async {
    await _db.customStatement(
      'DELETE FROM telemetry_events WHERE local_id = ?',
      [localId],
    );
  }

  @override
  Future<void> purgeSynced(String tenantId) async {
    await _db.customStatement(
      "DELETE FROM telemetry_events WHERE tenant_id = ? AND sync_status = 'synced'",
      [tenantId],
    );
  }

  TelemetryEvent _eventFromRow(QueryRow row) {
    return TelemetryEvent(
      localId: row.read<String>('local_id'),
      tenantId: row.read<String>('tenant_id'),
      clientActionId: row.read<String>('client_action_id'),
      eventType: TelemetryEventType.fromWire(row.read<String>('event_type')),
      capturedAt: _fromMs(row.read<int>('captured_at')),
      latitude: row.readNullable<double>('latitude'),
      longitude: row.readNullable<double>('longitude'),
      accuracyMeters: row.readNullable<double>('accuracy_meters'),
      speedKmh: row.readNullable<double>('speed_kmh'),
      signalType: TelemetrySignalType.fromWire(
        row.readNullable<String>('signal_type'),
      ),
      appVersion: row.readNullable<String>('app_version'),
      workOrderId: row.readNullable<String>('work_order_id'),
      refusalReason: row.readNullable<String>('refusal_reason'),
      syncStatus: SyncStatus.values.byName(row.read<String>('sync_status')),
      retryCount: row.read<int>('retry_count'),
      lastErrorCode: row.readNullable<String>('last_error_code'),
      lastSafeError: row.readNullable<String>('last_safe_error'),
      createdAt: _fromMs(row.read<int>('created_at')),
      syncedAt: _fromMsOrNull(row.readNullable<int>('synced_at')),
    );
  }
}

DateTime _fromMs(int ms) =>
    DateTime.fromMillisecondsSinceEpoch(ms, isUtc: true);

DateTime? _fromMsOrNull(int? ms) => ms == null ? null : _fromMs(ms);
