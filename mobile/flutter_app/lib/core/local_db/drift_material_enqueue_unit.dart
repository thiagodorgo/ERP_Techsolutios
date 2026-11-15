import '../../features/prestador/data/material_enqueue_unit.dart';
import '../../features/prestador/domain/prestador_models.dart';
import '../sync/sync_models.dart';
import '../sync/sync_queue_repository.dart';
import 'drift_prestador_local_store.dart';

/// B-SAN3-15b (P11) — a unidade da produção: dentro da cauda da fila, uma transação do Drift grava os materiais (pelo
/// mesmo banco) e as ações. A gravação dos materiais NUNCA chama a fila (reentrar na cauda travaria).
class DriftMaterialEnqueueUnit implements MaterialEnqueueUnit {
  DriftMaterialEnqueueUnit(this._queue, this._materials);

  final TransactionalSyncQueue _queue;
  final DriftPrestadorLocalStore _materials;

  @override
  Future<void> commit({
    required List<WorkOrderMaterial> materials,
    required List<SyncAction> actions,
  }) async {
    await _queue.enqueueAllWithin(actions, () async {
      for (final material in materials) {
        await _materials.saveMaterial(material);
      }
    });
  }
}
