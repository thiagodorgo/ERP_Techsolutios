import '../../../core/sync/sync_models.dart';
import '../domain/work_order_models.dart';

abstract class WorkOrderLocalStore {
  Future<List<WorkOrder>> loadWorkOrders();
  Future<void> saveWorkOrder(WorkOrder order);
  Future<void> saveWorkOrders(List<WorkOrder> orders);
  Future<List<WorkOrderTimelineEvent>> loadTimeline(String workOrderLocalId);
  Future<void> saveTimelineEvent(WorkOrderTimelineEvent event);
  Future<void> saveEvidence(WorkOrderEvidence evidence);
  Future<List<WorkOrderEvidence>> loadEvidence(String workOrderLocalId);
  Future<List<WorkOrderEvidence>> loadAllEvidence();
  Future<WorkOrderEvidence?> findEvidence(String localId);
  Future<void> clearAll();

  /// B-SAN3-13 — tira UMA OS do aparelho: a linha e as filhas dela (linha do tempo, evidência e, no Drift, os
  /// materiais do prestador). Só o repositório chama, sob a trava e depois de provar que não há trabalho pendente
  /// (plano v3 §2.3/§4.3). NÃO toca localização, telemetria nem vistoria (pipelines próprios, M24).
  Future<void> deleteWorkOrder(String localId);

  /// B-SAN3-13 ciclo 2 (C2-01, RQ-1) — o apagar da OS RECONCILIADA (não fabricada): só sai se a linha não está
  /// `pending` e — no Drift — se nenhum material do prestador dela está fora de `synced`. A checagem é o predicado
  /// do próprio DELETE, na mesma transação que apaga as filhas (sem checar-e-depois-agir): um escritor de material
  /// fora da trava ou é visto pelo predicado (a linha fica) ou é segurado até o commit e sobrevive em
  /// `work_order_materials`. Devolve `true` se apagou; `false` = nada apagado (a linha fica com o selo).
  Future<bool> deleteWorkOrderUnlessPending(String localId);
}

class InMemoryWorkOrderLocalStore implements WorkOrderLocalStore {
  InMemoryWorkOrderLocalStore([
    List<WorkOrder> seed = const [],
    List<WorkOrderTimelineEvent> timelineSeed = const [],
  ]) : _orders = {for (final o in seed) o.localId: o},
       _timeline = {for (final e in timelineSeed) e.localId: e};

  final Map<String, WorkOrder> _orders;
  final Map<String, WorkOrderTimelineEvent> _timeline;
  final Map<String, WorkOrderEvidence> _evidence = {};

  @override
  Future<List<WorkOrder>> loadWorkOrders() async =>
      List.unmodifiable(_orders.values.toList());

  @override
  Future<void> saveWorkOrder(WorkOrder order) async {
    _orders[order.localId] = order;
  }

  @override
  Future<void> saveWorkOrders(List<WorkOrder> orders) async {
    for (final o in orders) {
      _orders[o.localId] = o;
    }
  }

  @override
  Future<List<WorkOrderTimelineEvent>> loadTimeline(
    String workOrderLocalId,
  ) async {
    return _timeline.values
        .where((e) => e.workOrderLocalId == workOrderLocalId)
        .toList()
      ..sort((a, b) => a.occurredAt.compareTo(b.occurredAt));
  }

  @override
  Future<void> saveTimelineEvent(WorkOrderTimelineEvent event) async {
    _timeline[event.localId] = event;
  }

  @override
  Future<void> saveEvidence(WorkOrderEvidence evidence) async {
    _evidence[evidence.localId] = evidence;
  }

  @override
  Future<List<WorkOrderEvidence>> loadEvidence(String workOrderLocalId) async {
    return _evidence.values
        .where((e) => e.workOrderLocalId == workOrderLocalId)
        .toList()
      ..sort((a, b) => a.createdAt.compareTo(b.createdAt));
  }

  @override
  Future<List<WorkOrderEvidence>> loadAllEvidence() async {
    return _evidence.values.toList()
      ..sort((a, b) => a.createdAt.compareTo(b.createdAt));
  }

  @override
  Future<WorkOrderEvidence?> findEvidence(String localId) async {
    return _evidence[localId];
  }

  @override
  Future<void> clearAll() async {
    _orders.clear();
    _timeline.clear();
    _evidence.clear();
  }

  /// Materiais: este store em memória não os guarda (moram no `PrestadorLocalStore`) — no-op DECLARADO; o
  /// `DriftWorkOrderLocalStore` apaga `work_order_materials` na mesma operação.
  @override
  Future<void> deleteWorkOrder(String localId) async {
    _orders.remove(localId);
    _timeline.removeWhere((_, e) => e.workOrderLocalId == localId);
    _evidence.removeWhere((_, e) => e.workOrderLocalId == localId);
  }

  /// Retém se a linha está `pending`; senão apaga a linha e as filhas que este store conhece. Materiais: não os
  /// guarda (moram no `PrestadorLocalStore`) — DECLARADO; a janela do material é medida só no Drift.
  @override
  Future<bool> deleteWorkOrderUnlessPending(String localId) async {
    final row = _orders[localId];
    if (row == null || row.syncStatus == SyncStatus.pending) return false;
    await deleteWorkOrder(localId);
    return true;
  }
}
