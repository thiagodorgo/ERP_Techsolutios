import '../../../core/local_db/drift_material_enqueue_unit.dart';
import '../../../core/local_db/drift_prestador_local_store.dart';
import '../../../core/sync/sync_models.dart';
import '../../../core/sync/sync_queue_repository.dart';
import '../domain/prestador_models.dart';
import 'prestador_local_store.dart';

/// B-SAN3-15b (P11) — a peça e a ação da fila gravadas numa unidade só.
///
/// `commit` grava os [materials] e enfileira as [actions]. Na produção (Drift nos dois, o MESMO banco) é uma transação
/// só: uma falha em qualquer ponto não deixa nada gravado.
abstract class MaterialEnqueueUnit {
  Future<void> commit({
    required List<WorkOrderMaterial> materials,
    required List<SyncAction> actions,
  });
}

/// Os stores de memória dos testes: grava os materiais e depois enfileira, como antes do bloco.
class SequentialMaterialEnqueueUnit implements MaterialEnqueueUnit {
  SequentialMaterialEnqueueUnit(this._queue, this._materials);

  final SyncQueueRepository _queue;
  final PrestadorLocalStore _materials;

  @override
  Future<void> commit({
    required List<WorkOrderMaterial> materials,
    required List<SyncAction> actions,
  }) async {
    for (final material in materials) {
      await _materials.saveMaterial(material);
    }
    for (final action in actions) {
      await _queue.enqueue(action);
    }
  }
}

/// Fila e materiais em bancos diferentes (ou numa combinação sem transação comum): recusa ANTES de gravar.
class FailClosedMaterialEnqueueUnit implements MaterialEnqueueUnit {
  FailClosedMaterialEnqueueUnit();

  @override
  Future<void> commit({
    required List<WorkOrderMaterial> materials,
    required List<SyncAction> actions,
  }) async {
    throw StateError('material_unit_db_mismatch');
  }
}

/// A unidade nasce do MESMO `queue` que o repositório recebeu (nenhuma instância nova de fila, nenhum provider novo):
///   (a) fila transacional e materiais Drift no MESMO banco → [DriftMaterialEnqueueUnit];
///   (b) materiais fora do Drift (os stores de memória dos testes) → [SequentialMaterialEnqueueUnit];
///   (c) qualquer outra combinação → [FailClosedMaterialEnqueueUnit].
MaterialEnqueueUnit materialEnqueueUnitFor({
  required SyncQueueRepository queue,
  required PrestadorLocalStore materials,
}) {
  if (queue is TransactionalSyncQueue &&
      materials is DriftPrestadorLocalStore &&
      queue.canCommitWith(materials.database)) {
    return DriftMaterialEnqueueUnit(queue, materials);
  }
  if (materials is! DriftPrestadorLocalStore) {
    return SequentialMaterialEnqueueUnit(queue, materials);
  }
  return FailClosedMaterialEnqueueUnit();
}
