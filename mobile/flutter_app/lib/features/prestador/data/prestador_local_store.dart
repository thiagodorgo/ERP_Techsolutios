import '../domain/prestador_models.dart';

abstract class PrestadorLocalStore {
  Future<List<WorkOrderMaterial>> loadMaterials(String workOrderLocalId);
  Future<void> saveMaterial(WorkOrderMaterial material);
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
  Future<void> deleteMaterial(String localId) async {
    _materials.removeWhere((m) => m.localId == localId);
  }
}
