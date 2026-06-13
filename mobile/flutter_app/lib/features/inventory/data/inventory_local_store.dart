import '../domain/inventory_models.dart';

abstract class InventoryLocalStore {
  Future<List<InventoryItem>> loadItems(String tenantId);
  Future<void> saveItem(InventoryItem item);
  Future<InventoryItem?> findItem(String id);
  Future<List<InventoryMovement>> loadMovements(
    String tenantId, {
    InventoryMovementType? type,
  });
  Future<void> saveMovement(InventoryMovement movement);
}

class InMemoryInventoryLocalStore implements InventoryLocalStore {
  InMemoryInventoryLocalStore({
    List<InventoryItem>? items,
    List<InventoryMovement>? movements,
  }) {
    if (items != null) _items.addAll(items);
    if (movements != null) _movements.addAll(movements);
  }

  final List<InventoryItem> _items = [];
  final List<InventoryMovement> _movements = [];

  @override
  Future<List<InventoryItem>> loadItems(String tenantId) async =>
      _items.where((i) => i.tenantId == tenantId).toList();

  @override
  Future<void> saveItem(InventoryItem item) async {
    final idx = _items.indexWhere(
      (i) => i.id == item.id && i.tenantId == item.tenantId,
    );
    if (idx >= 0) {
      _items[idx] = item;
    } else {
      _items.add(item);
    }
  }

  @override
  Future<InventoryItem?> findItem(String id) async =>
      _items.where((i) => i.id == id).firstOrNull;

  @override
  Future<List<InventoryMovement>> loadMovements(
    String tenantId, {
    InventoryMovementType? type,
  }) async => _movements.where((m) {
    if (m.tenantId != tenantId) return false;
    if (type != null && m.type != type) return false;
    return true;
  }).toList();

  @override
  Future<void> saveMovement(InventoryMovement movement) async {
    _movements.add(movement);
  }
}
