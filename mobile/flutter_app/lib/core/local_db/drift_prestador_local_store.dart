import 'package:drift/drift.dart';

import '../../features/prestador/data/prestador_local_store.dart';
import '../../features/prestador/domain/prestador_models.dart';
import '../sync/sync_models.dart';
import 'app_database.dart';

class DriftPrestadorLocalStore implements PrestadorLocalStore {
  DriftPrestadorLocalStore(this._db);

  final AppDatabase _db;

  @override
  Future<List<WorkOrderMaterial>> loadMaterials(String workOrderLocalId) async {
    final rows = await _db
        .customSelect(
          'SELECT * FROM work_order_materials '
          'WHERE work_order_local_id = ? ORDER BY created_at ASC',
          variables: [Variable<String>(workOrderLocalId)],
        )
        .get();
    return rows.map(_fromRow).toList();
  }

  @override
  Future<void> saveMaterial(WorkOrderMaterial m) async {
    await _db.customInsert(
      'INSERT OR REPLACE INTO work_order_materials '
      '(local_id, tenant_id, work_order_local_id, sku, name, quantity, '
      'unit, source, sync_status, created_at) '
      'VALUES (?,?,?,?,?,?,?,?,?,?)',
      variables: [
        Variable<String>(m.localId),
        Variable<String>(m.tenantId),
        Variable<String>(m.workOrderLocalId),
        Variable<String>(m.sku),
        Variable<String>(m.name),
        Variable<int>(m.quantity),
        Variable<String>(m.unit),
        Variable<String>(m.source),
        Variable<String>(m.syncStatus.name),
        Variable<int>(DateTime.now().toUtc().millisecondsSinceEpoch),
      ],
    );
  }

  @override
  Future<void> deleteMaterial(String localId) async {
    await _db.customStatement(
      'DELETE FROM work_order_materials WHERE local_id = ?',
      [localId],
    );
  }

  WorkOrderMaterial _fromRow(QueryRow row) => WorkOrderMaterial(
    localId: row.read<String>('local_id'),
    tenantId: row.read<String>('tenant_id'),
    workOrderLocalId: row.read<String>('work_order_local_id'),
    sku: row.read<String>('sku'),
    name: row.read<String>('name'),
    quantity: row.read<int>('quantity'),
    unit: row.read<String>('unit'),
    source: row.read<String>('source'),
    syncStatus: SyncStatus.values.byName(row.read<String>('sync_status')),
  );
}
