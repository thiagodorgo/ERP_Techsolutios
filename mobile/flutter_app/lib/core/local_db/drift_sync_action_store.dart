import 'dart:convert';

import 'package:drift/drift.dart';

import '../sync/sync_action_store.dart';
import '../sync/sync_models.dart';
import 'app_database.dart';

class DriftSyncActionStore implements SyncActionStore {
  DriftSyncActionStore(this._db);

  final AppDatabase _db;

  @override
  Future<List<SyncAction>> load() async {
    final rows = await _db.customSelect('SELECT * FROM sync_actions').get();
    return rows.map(_actionFromRow).toList();
  }

  @override
  Future<void> save(List<SyncAction> actions) async {
    await _db.transaction(() async {
      await _db.customUpdate(
        'DELETE FROM sync_actions',
        variables: <Variable>[],
      );
      for (final action in actions) {
        await _db.customInsert(
          'INSERT INTO sync_actions '
          '(client_action_id,tenant_id,type,payload_json,status,'
          'created_at,processed_at,retry_count,last_error_code,last_safe_error) '
          'VALUES (?,?,?,?,?,?,?,?,?,?)',
          variables: <Variable>[
            Variable<String>(action.clientActionId),
            Variable<String>(action.tenantId),
            Variable<String>(action.type),
            Variable<String>(jsonEncode(action.payload)),
            Variable<String>(action.status.name),
            Variable<int>(action.createdAt.millisecondsSinceEpoch),
            Variable<int>(action.processedAt?.millisecondsSinceEpoch),
            Variable<int>(action.retryCount),
            Variable<String>(action.lastErrorCode),
            Variable<String>(action.lastSafeError),
          ],
        );
      }
    });
  }

  SyncAction _actionFromRow(QueryRow row) {
    final processedAtMs = row.readNullable<int>('processed_at');
    return SyncAction(
      clientActionId: row.read<String>('client_action_id'),
      tenantId: row.read<String>('tenant_id'),
      type: row.read<String>('type'),
      payload: Map<String, Object?>.from(
        jsonDecode(row.read<String>('payload_json')) as Map,
      ),
      status: SyncStatus.values.byName(row.read<String>('status')),
      createdAt: DateTime.fromMillisecondsSinceEpoch(
        row.read<int>('created_at'),
        isUtc: true,
      ),
      retryCount: row.read<int>('retry_count'),
      lastErrorCode: row.readNullable<String>('last_error_code'),
      lastSafeError: row.readNullable<String>('last_safe_error'),
      processedAt: processedAtMs != null
          ? DateTime.fromMillisecondsSinceEpoch(processedAtMs, isUtc: true)
          : null,
    );
  }
}
