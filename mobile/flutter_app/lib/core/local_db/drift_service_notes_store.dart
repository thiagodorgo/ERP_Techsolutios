import 'package:drift/drift.dart';

import '../../features/prestador/data/service_notes_store.dart';
import 'app_database.dart';

/// B-SAN3-15b (P9) — as notas do atendimento no banco do aparelho (`work_order_service_notes`, v18), com a chave
/// (organização, usuário, OS). Sobrevivem a reinício; a purga da OS as apaga (`DriftWorkOrderLocalStore`).
class DriftServiceNotesStore implements ServiceNotesStore {
  DriftServiceNotesStore(this._db);

  final AppDatabase _db;

  @override
  Future<ServiceNotes?> load(ServiceNotesScope scope) async {
    final rows = await _db
        .customSelect(
          'SELECT diagnosis, execution FROM work_order_service_notes '
          'WHERE tenant_id = ? AND user_id = ? AND work_order_local_id = ?',
          variables: [
            Variable<String>(scope.tenantId),
            Variable<String>(scope.userId),
            Variable<String>(scope.workOrderLocalId),
          ],
        )
        .get();
    if (rows.isEmpty) return null;
    final row = rows.single;
    return ServiceNotes(
      diagnosis: row.read<String>('diagnosis'),
      execution: row.read<String>('execution'),
    );
  }

  @override
  Future<void> save(ServiceNotesScope scope, ServiceNotes notes) async {
    await _db.customInsert(
      'INSERT OR REPLACE INTO work_order_service_notes '
      '(tenant_id, user_id, work_order_local_id, diagnosis, execution, '
      'updated_at) VALUES (?,?,?,?,?,?)',
      variables: [
        Variable<String>(scope.tenantId),
        Variable<String>(scope.userId),
        Variable<String>(scope.workOrderLocalId),
        Variable<String>(notes.diagnosis),
        Variable<String>(notes.execution),
        Variable<int>(DateTime.now().toUtc().millisecondsSinceEpoch),
      ],
    );
  }
}
