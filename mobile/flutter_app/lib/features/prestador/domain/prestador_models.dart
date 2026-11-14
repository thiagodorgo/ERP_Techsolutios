import '../../../core/sync/sync_models.dart';

/// Item do estoque do técnico (peças no carro/van) — origem `/mobile/technician/stock`.
class TechnicianStockItem {
  const TechnicianStockItem({
    required this.sku,
    required this.name,
    this.category = '',
    required this.available,
    required this.unit,
  });

  final String sku;
  final String name;
  final String category;
  final num available;
  final String unit;
}

/// B-SAN3-15b (decisão 1.B do dono, 13/11) — "Última unidade": saldo de 1 ou menos, contado no aparelho sobre a lista
/// que veio (não usa o estoque mínimo do item).
bool isLastUnit(TechnicianStockItem item) => item.available.floor() <= 1;

/// Custódia de onde o estoque do técnico sai (`professional` ou `base`).
class TechnicianStockCustody {
  const TechnicianStockCustody({required this.kind, required this.label});

  final String kind;
  final String label;
}

/// Chave da lista salva: a última resposta fica por (organização, usuário).
class TechnicianStockCacheScope {
  const TechnicianStockCacheScope({
    required this.tenantId,
    required this.userId,
  });

  final String tenantId;
  final String userId;
}

/// Lista salva no aparelho, com a hora em que foi gravada.
class TechnicianStockCacheEntry {
  const TechnicianStockCacheEntry({
    required this.items,
    required this.fetchedAt,
  });

  final List<TechnicianStockItem> items;
  final DateTime fetchedAt;
}

/// Resultado de `loadTechnicianStock`: o retrato do estoque e o que fazer com a lista salva.
class TechnicianStockLoad {
  const TechnicianStockLoad({
    required this.items,
    required this.custody,
    required this.fetchedAt,
    required this.isFresh,
    required this.isForbidden,
    this.cached,
    this.error,
  });

  /// 200 — a resposta substitui a lista salva.
  factory TechnicianStockLoad.fresh(
    List<TechnicianStockItem> items, {
    TechnicianStockCustody? custody,
    DateTime? fetchedAt,
  }) => TechnicianStockLoad(
    items: List.unmodifiable(items),
    custody: custody,
    fetchedAt: fetchedAt ?? DateTime.now(),
    isFresh: true,
    isForbidden: false,
  );

  /// 5xx / rede / tempo esgotado — não toca na lista salva; itens vazios, hora da tentativa,
  /// e a lista salva viaja no campo separado [cached].
  factory TechnicianStockLoad.failed(
    Object error, {
    TechnicianStockCacheEntry? cached,
  }) => TechnicianStockLoad(
    items: const <TechnicianStockItem>[],
    custody: null,
    fetchedAt: DateTime.now(),
    isFresh: false,
    isForbidden: false,
    cached: cached,
    error: error,
  );

  /// 403 — apaga a lista salva.
  factory TechnicianStockLoad.forbidden({DateTime? fetchedAt}) =>
      TechnicianStockLoad(
        items: const <TechnicianStockItem>[],
        custody: null,
        fetchedAt: fetchedAt ?? DateTime.now(),
        isFresh: false,
        isForbidden: true,
      );

  final List<TechnicianStockItem> items;
  final TechnicianStockCustody? custody;
  final DateTime fetchedAt;
  final bool isFresh;
  final bool isForbidden;
  final TechnicianStockCacheEntry? cached;
  final Object? error;

  bool get hasCached => cached != null && cached!.items.isNotEmpty;
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
