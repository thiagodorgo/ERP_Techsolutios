// B-O6R-11d (F0) — ESQUELETO do codec de OS entre o app e o backend. Toda função lança, de propósito: é o
// vermelho-controle declarado da F0 (§3 do plano). A F1 escreve o corpo.
import '../../features/work_orders/domain/work_order_models.dart';

WorkOrderStatus? workOrderStatusFromApiOrNull(Object? value) =>
    throw UnimplementedError('B-O6R-11d F1');

WorkOrderStatus workOrderStatusFromApi(Object? value) =>
    throw UnimplementedError('B-O6R-11d F1');

bool workOrderStatusHasBackendEntry(String backendValue) =>
    throw UnimplementedError('B-O6R-11d F1');

String? workOrderStatusToApiOrNull(String appName) =>
    throw UnimplementedError('B-O6R-11d F1');

String workOrderStatusNameToApi(String appName) =>
    throw UnimplementedError('B-O6R-11d F1');

WorkOrderPriority workOrderPriorityFromApi(Object? value) =>
    throw UnimplementedError('B-O6R-11d F1');
