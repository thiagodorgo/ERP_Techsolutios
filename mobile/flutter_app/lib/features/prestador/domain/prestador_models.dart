import '../../../core/sync/sync_models.dart';

/// Item do estoque do técnico (peças no carro/van) — origem `/mobile/technician/stock`.
class TechnicianStockItem {
  const TechnicianStockItem({
    required this.sku,
    required this.name,
    required this.category,
    required this.available,
    required this.unit,
    this.location = 'Van-01',
  });

  final String sku;
  final String name;
  final String category;
  final int available;
  final String unit;
  final String location;
}

/// Material aplicado em uma OS (peça consumida no atendimento).
class WorkOrderMaterial {
  const WorkOrderMaterial({
    required this.localId,
    required this.tenantId,
    required this.workOrderLocalId,
    required this.sku,
    required this.name,
    required this.quantity,
    required this.unit,
    required this.syncStatus,
    this.source = 'technician_stock',
  });

  final String localId;
  final String tenantId;
  final String workOrderLocalId;
  final String sku;
  final String name;
  final int quantity;
  final String unit;
  final String source;
  final SyncStatus syncStatus;

  WorkOrderMaterial copyWith({int? quantity, SyncStatus? syncStatus}) =>
      WorkOrderMaterial(
        localId: localId,
        tenantId: tenantId,
        workOrderLocalId: workOrderLocalId,
        sku: sku,
        name: name,
        quantity: quantity ?? this.quantity,
        unit: unit,
        source: source,
        syncStatus: syncStatus ?? this.syncStatus,
      );
}

/// Mescla uma seleção de peças (sku→qty) na lista atual de materiais da OS,
/// somando quantidades quando o SKU já existe. Função pura (testável).
List<WorkOrderMaterial> mergeMaterials({
  required List<WorkOrderMaterial> current,
  required Map<String, int> selection,
  required List<TechnicianStockItem> catalog,
  required String tenantId,
  required String workOrderLocalId,
  required String Function(String sku) idFor,
}) {
  final merged = [...current];
  selection.forEach((sku, addQty) {
    if (addQty <= 0) return;
    final catalogItem = catalog.where((c) => c.sku == sku).firstOrNull;
    if (catalogItem == null) return;
    final existingIndex = merged.indexWhere((m) => m.sku == sku);
    if (existingIndex >= 0) {
      final ex = merged[existingIndex];
      merged[existingIndex] = ex.copyWith(
        quantity: ex.quantity + addQty,
        syncStatus: SyncStatus.pending,
      );
    } else {
      merged.add(
        WorkOrderMaterial(
          localId: idFor(sku),
          tenantId: tenantId,
          workOrderLocalId: workOrderLocalId,
          sku: sku,
          name: catalogItem.name,
          quantity: addQty,
          unit: catalogItem.unit,
          syncStatus: SyncStatus.pending,
        ),
      );
    }
  });
  return merged;
}
