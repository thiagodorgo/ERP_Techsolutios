import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

import '../../../core/bootstrap/bootstrap_repository.dart';
import '../../../core/bootstrap/bootstrap_session.dart';
import '../../../core/network/api_contracts.dart';
import '../../../core/sync/sync_action_factory.dart';
import '../../../core/sync/sync_providers.dart';
import '../../../core/sync/sync_queue_repository.dart';
import '../domain/inventory_models.dart';
import 'inventory_local_store.dart';

class InventoryRepository extends ChangeNotifier {
  InventoryRepository({
    required BootstrapSession session,
    required SyncQueueRepository syncQueue,
    required SyncActionFactory actionFactory,
    required InventoryLocalStore localStore,
  }) : _session = session,
       _syncQueue = syncQueue,
       _actionFactory = actionFactory,
       _localStore = localStore;

  final BootstrapSession _session;
  final SyncQueueRepository _syncQueue;
  final SyncActionFactory _actionFactory;
  final InventoryLocalStore _localStore;
  final _uuid = const Uuid();

  List<InventoryItem> _items = [];
  bool _loaded = false;

  List<InventoryItem> get items => List.unmodifiable(_items);

  List<InventoryItem> get criticalItems =>
      _items.where((i) => i.isCritical).toList();

  Future<void> load({bool seedIfEmpty = true}) async {
    if (_loaded) return;
    final stored = await _localStore.loadItems(_session.activeTenant.tenantId);
    if (stored.isEmpty && seedIfEmpty) {
      await _seedItems();
      _items = await _localStore.loadItems(_session.activeTenant.tenantId);
    } else {
      _items = stored;
    }
    _loaded = true;
    notifyListeners();
  }

  Future<InventoryItem?> findById(String id) async {
    final item = await _localStore.findItem(id);
    if (item == null) return null;
    // Only return items belonging to this tenant
    if (item.tenantId != _session.activeTenant.tenantId) return null;
    return item;
  }

  Future<List<InventoryMovement>> getMovements({InventoryMovementType? type}) =>
      _localStore.loadMovements(_session.activeTenant.tenantId, type: type);

  Future<InventoryItem> recordEntry({
    required String itemId,
    required int quantity,
    String? reference,
    String? supplier,
    String? notes,
  }) async {
    final item = await _localStore.findItem(itemId);
    if (item == null) throw Exception('Item nao encontrado: $itemId');

    final updated = item.copyWith(quantity: item.quantity + quantity);
    await _localStore.saveItem(updated);

    final movId = _uuid.v4();
    final now = DateTime.now();
    await _localStore.saveMovement(
      InventoryMovement(
        id: movId,
        tenantId: _session.activeTenant.tenantId,
        itemId: itemId,
        type: InventoryMovementType.entry,
        quantity: quantity,
        date: now,
        reference: reference,
        supplier: supplier,
        notes: notes,
      ),
    );

    final action = _actionFactory.create(
      tenantId: _session.activeTenant.tenantId,
      type: InventorySyncActionTypes.entryCreate,
      payload: {
        'item_id': itemId,
        'quantity': quantity,
        'movement_id': movId,
        'date': now.toIso8601String(),
        'reference': reference,
        'supplier': supplier,
        'notes': notes,
      },
    );
    await _syncQueue.enqueue(action);

    final idx = _items.indexWhere((i) => i.id == itemId);
    if (idx >= 0) _items[idx] = updated;
    notifyListeners();

    return updated;
  }

  Future<InventoryItem> recordExit({
    required String itemId,
    required int quantity,
    String? workOrderId,
    String? notes,
  }) async {
    final item = await _localStore.findItem(itemId);
    if (item == null) throw Exception('Item nao encontrado: $itemId');
    if (item.quantity < quantity) {
      throw Exception(
        'Saldo insuficiente: ${item.quantity} ${item.unit} disponivel, '
        '$quantity ${item.unit} solicitado',
      );
    }

    final updated = item.copyWith(quantity: item.quantity - quantity);
    await _localStore.saveItem(updated);

    final movId = _uuid.v4();
    final now = DateTime.now();
    await _localStore.saveMovement(
      InventoryMovement(
        id: movId,
        tenantId: _session.activeTenant.tenantId,
        itemId: itemId,
        type: InventoryMovementType.exit,
        quantity: quantity,
        date: now,
        workOrderId: workOrderId,
        notes: notes,
      ),
    );

    final action = _actionFactory.create(
      tenantId: _session.activeTenant.tenantId,
      type: InventorySyncActionTypes.exitCreate,
      payload: {
        'item_id': itemId,
        'quantity': quantity,
        'movement_id': movId,
        'date': now.toIso8601String(),
        'work_order_id': workOrderId,
        'notes': notes,
      },
    );
    await _syncQueue.enqueue(action);

    final idx = _items.indexWhere((i) => i.id == itemId);
    if (idx >= 0) _items[idx] = updated;
    notifyListeners();

    return updated;
  }

  Future<void> _seedItems() async {
    final tid = _session.activeTenant.tenantId;
    const demos = [
      (
        id: 'inv-001',
        code: 'IT-001',
        name: 'Capacitor 100uF 50V',
        cat: 'Eletrico',
        qty: 248,
        unit: 'un.',
        min: 50,
      ),
      (
        id: 'inv-002',
        code: 'IT-002',
        name: 'Resistor 10kOhm',
        cat: 'Eletrico',
        qty: 12,
        unit: 'un.',
        min: 100,
      ),
      (
        id: 'inv-003',
        code: 'IT-003',
        name: 'Tubo PVC 3/4"',
        cat: 'Hidraulico',
        qty: 85,
        unit: 'un.',
        min: 30,
      ),
      (
        id: 'inv-004',
        code: 'IT-004',
        name: 'Chave Philips #2',
        cat: 'Ferramentas',
        qty: 6,
        unit: 'un.',
        min: 10,
      ),
      (
        id: 'inv-005',
        code: 'IT-005',
        name: 'Capacete de seguranca',
        cat: 'EPI',
        qty: 32,
        unit: 'un.',
        min: 5,
      ),
      (
        id: 'inv-006',
        code: 'IT-006',
        name: 'Fio eletrico 2,5mm',
        cat: 'Eletrico',
        qty: 0,
        unit: 'm',
        min: 50,
      ),
      (
        id: 'inv-007',
        code: 'IT-007',
        name: 'Disjuntor 20A',
        cat: 'Eletrico',
        qty: 3,
        unit: 'un.',
        min: 20,
      ),
      (
        id: 'inv-008',
        code: 'IT-008',
        name: 'Abracadeira nylon 20cm',
        cat: 'Fixacao',
        qty: 14,
        unit: 'un.',
        min: 30,
      ),
    ];
    for (final d in demos) {
      await _localStore.saveItem(
        InventoryItem(
          id: d.id,
          tenantId: tid,
          code: d.code,
          name: d.name,
          category: d.cat,
          quantity: d.qty,
          unit: d.unit,
          minQuantity: d.min,
        ),
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Providers
// ---------------------------------------------------------------------------

final inventoryLocalStoreProvider = Provider<InventoryLocalStore>(
  (ref) => InMemoryInventoryLocalStore(),
);

final inventoryRepositoryProvider = Provider<InventoryRepository>((ref) {
  final session = ref
      .watch(bootstrapSessionProvider)
      .maybeWhen(data: (v) => v, orElse: () => devBootstrapSession);
  return InventoryRepository(
    session: session,
    syncQueue: ref.watch(syncQueueRepositoryProvider),
    actionFactory: ref.watch(syncActionFactoryProvider),
    localStore: ref.watch(inventoryLocalStoreProvider),
  );
});
