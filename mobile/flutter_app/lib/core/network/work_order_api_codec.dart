// B-O6R-11d (Ω6R-QUA-004) — o codec ÚNICO de status e prioridade de OS entre o app e o backend.
//
// O vocabulário do backend (`src/modules/work-orders/work-order.types.ts`: `WORK_ORDER_STATUSES`,
// `WORK_ORDER_PRIORITIES`) nunca coincidiu com o do app (`WorkOrderStatus`, `WorkOrderPriority`). Casar pelo nome do
// enum do app fazia 6 dos 10 status do servidor virarem "Agendada" na lista e `null` na linha do tempo, e a OS
// "urgente" aparecer "Normal". Toda leitura de OS (lista, detalhe, status, atribuição e linha do tempo) e toda
// escrita de status (REST e fila) passa por aqui; não há segundo tradutor.
import '../../features/work_orders/domain/work_order_models.dart';

const Map<String, WorkOrderStatus> _statusFromBackend = {
  'open': WorkOrderStatus.scheduled,
  'assigned': WorkOrderStatus.dispatched,
  'accepted': WorkOrderStatus.dispatched,
  'on_route': WorkOrderStatus.enRoute,
  'on_site': WorkOrderStatus.arrived,
  'in_progress': WorkOrderStatus.inService,
  'paused': WorkOrderStatus.paused,
  'completed': WorkOrderStatus.completed,
  'cancelled': WorkOrderStatus.cancelled,
  'rejected': WorkOrderStatus.rejected,
  'pending_approval': WorkOrderStatus.pendingApproval,
};

/// null = desconhecido (a linha do tempo exige; nunca um palpite).
///
/// Primeiro a tabela do backend; depois o NOME do app, que é o que o cache local e os testes antigos (b109, b127)
/// guardam; senão `null`.
WorkOrderStatus? workOrderStatusFromApiOrNull(Object? value) {
  if (value is! String) return null;
  final normalized = value.trim();
  if (normalized.isEmpty) return null;
  return _statusFromBackend[normalized] ??
      WorkOrderStatus.values.asNameMap()[normalized];
}

/// Para a lista e a OS única: status FUTURO do backend cai em "Agendada"
/// (`P-MOBILE-STATUS-DESCONHECIDO-VIRA-AGENDADA`).
WorkOrderStatus workOrderStatusFromApi(Object? value) =>
    workOrderStatusFromApiOrNull(value) ?? WorkOrderStatus.scheduled;

/// CR2-11D-07(a): o status do backend tem entrada EXPLÍCITA na tabela (não vale o casamento pelo nome do app).
bool workOrderStatusHasBackendEntry(String backendValue) =>
    _statusFromBackend.containsKey(backendValue);

const Map<String, String> _statusToBackend = {
  'scheduled': 'open',
  'dispatched': 'assigned',
  'enRoute': 'on_route',
  'arrived': 'on_site',
  'inService': 'in_progress',
  'paused': 'paused',
  'completed': 'completed',
  'cancelled': 'cancelled',
};

/// REST: null = sem equivalente no backend (pendingApproval, approved, exception, rejected).
///
/// O `rejected` do app é "aprovação negada"; no servidor, `rejected` encerra a OS (CL11D-09). Por isso não sai.
String? workOrderStatusToApiOrNull(String appName) => _statusToBackend[appName];

/// Fila: IDÊNTICO ao `_backendStatus` de d5ec1696 (passa cru o que não tem tradução).
///
/// O resíduo dos 4 status sem equivalente na fila é da `P-MOBILE-CODEC-FILA-STATUS-CRU` (`B-SAN3-16`).
String workOrderStatusNameToApi(String appName) =>
    _statusToBackend[appName] ?? appName;

const Map<String, WorkOrderPriority> _priorityFromBackend = {
  'low': WorkOrderPriority.low,
  'medium': WorkOrderPriority.normal,
  'high': WorkOrderPriority.high,
  'urgent': WorkOrderPriority.critical,
};

/// Tabela do backend; depois o nome do app (cache local); senão "Normal".
WorkOrderPriority workOrderPriorityFromApi(Object? value) {
  if (value is! String) return WorkOrderPriority.normal;
  final normalized = value.trim();
  return _priorityFromBackend[normalized] ??
      WorkOrderPriority.values.asNameMap()[normalized] ??
      WorkOrderPriority.normal;
}
