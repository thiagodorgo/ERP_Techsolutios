enum InventoryItemStatus {
  normal,
  low,
  critical,
  zeroed;

  String get label => switch (this) {
    normal => 'Normal',
    low => 'Baixo',
    critical => 'Critico',
    zeroed => 'Zerado',
  };

  static InventoryItemStatus fromQuantity(int quantity, int minQuantity) {
    if (quantity == 0) return zeroed;
    if (minQuantity > 0 && quantity <= (minQuantity * 0.2).ceil()) {
      return critical;
    }
    if (minQuantity > 0 && quantity <= minQuantity) return low;
    return normal;
  }
}

enum InventoryMovementType {
  entry,
  exit;

  String get apiValue => name;
}

class InventoryItem {
  const InventoryItem({
    required this.id,
    required this.tenantId,
    required this.code,
    required this.name,
    required this.category,
    required this.quantity,
    required this.unit,
    required this.minQuantity,
  });

  final String id;
  final String tenantId;
  final String code;
  final String name;
  final String category;
  final int quantity;
  final String unit;
  final int minQuantity;

  InventoryItemStatus get status =>
      InventoryItemStatus.fromQuantity(quantity, minQuantity);

  bool get isCritical =>
      status == InventoryItemStatus.critical ||
      status == InventoryItemStatus.zeroed;

  InventoryItem copyWith({int? quantity}) => InventoryItem(
    id: id,
    tenantId: tenantId,
    code: code,
    name: name,
    category: category,
    quantity: quantity ?? this.quantity,
    unit: unit,
    minQuantity: minQuantity,
  );
}

class InventoryMovement {
  const InventoryMovement({
    required this.id,
    required this.tenantId,
    required this.itemId,
    required this.type,
    required this.quantity,
    required this.date,
    this.reference,
    this.supplier,
    this.notes,
    this.workOrderId,
  });

  final String id;
  final String tenantId;
  final String itemId;
  final InventoryMovementType type;
  final int quantity;
  final DateTime date;
  final String? reference;
  final String? supplier;
  final String? notes;
  final String? workOrderId;
}
