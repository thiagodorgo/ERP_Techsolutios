import '../domain/prestador_models.dart';
import '../../../core/sync/sync_models.dart';

abstract class PrestadorLocalStore {
  Future<List<WorkOrderMaterial>> loadMaterials(String workOrderLocalId);
  Future<void> saveMaterial(WorkOrderMaterial material);
  Future<void> updateMaterial(
    String localId, {
    int? quantity,
    SyncStatus? syncStatus,
  });
  Future<void> deleteMaterial(String localId);
}

class InMemoryPrestadorLocalStore implements PrestadorLocalStore {
  InMemoryPrestadorLocalStore([List<WorkOrderMaterial>? seed])
    : _materials = List<WorkOrderMaterial>.from(seed ?? const []);

  final List<WorkOrderMaterial> _materials;

  @override
  Future<List<WorkOrderMaterial>> loadMaterials(
    String workOrderLocalId,
  ) async =>
      _materials.where((m) => m.workOrderLocalId == workOrderLocalId).toList();

  @override
  Future<void> saveMaterial(WorkOrderMaterial material) async {
    _materials.removeWhere((m) => m.localId == material.localId);
    _materials.add(material);
  }

  @override
  Future<void> updateMaterial(
    String localId, {
    int? quantity,
    SyncStatus? syncStatus,
  }) async {
    final index = _materials.indexWhere(
      (material) => material.localId == localId,
    );
    if (index < 0) return;
    final current = _materials[index];
    _materials[index] = current.copyWith(
      quantity: quantity,
      syncStatus: syncStatus,
    );
  }

  @override
  Future<void> deleteMaterial(String localId) async {
    _materials.removeWhere((m) => m.localId == localId);
  }
}
