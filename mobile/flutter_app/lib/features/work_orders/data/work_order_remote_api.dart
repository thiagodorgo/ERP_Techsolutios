import 'package:dio/dio.dart';

import '../../../core/network/api_contracts.dart';
import '../../../core/network/api_error.dart';
import '../../../core/network/http_client.dart';
import '../../../core/sync/sync_models.dart';
import '../domain/work_order_models.dart';

abstract class WorkOrderRemoteApi {
  Future<List<WorkOrder>> fetchWorkOrders({String? tenantId});
  Future<WorkOrder> fetchWorkOrder(String workOrderId);
  Future<WorkOrder> updateWorkOrderStatus(
    String workOrderId,
    WorkOrderStatus status,
  );
  Future<List<WorkOrderTimelineEvent>> fetchTimeline(String workOrderId);
  Future<WorkOrder> assignWorkOrder(
    String workOrderId,
    String userId, {
    String? note,
  });
  Future<void> createApprovalRequest(
    String workOrderId,
    WorkOrderApprovalRequest request,
  );
}

// Safe stub — used when backend is not yet connected.
// Never throws with sensitive info; always returns ApiNetworkError.
class PendingBackendWorkOrderRemoteApi implements WorkOrderRemoteApi {
  const PendingBackendWorkOrderRemoteApi();

  @override
  Future<List<WorkOrder>> fetchWorkOrders({String? tenantId}) =>
      Future.error(const ApiNetworkError());

  @override
  Future<WorkOrder> fetchWorkOrder(String workOrderId) =>
      Future.error(const ApiNetworkError());

  @override
  Future<WorkOrder> updateWorkOrderStatus(
    String workOrderId,
    WorkOrderStatus status,
  ) => Future.error(const ApiNetworkError());

  @override
  Future<List<WorkOrderTimelineEvent>> fetchTimeline(String workOrderId) =>
      Future.error(const ApiNetworkError());

  @override
  Future<WorkOrder> assignWorkOrder(
    String workOrderId,
    String userId, {
    String? note,
  }) => Future.error(const ApiNetworkError());

  @override
  Future<void> createApprovalRequest(
    String workOrderId,
    WorkOrderApprovalRequest request,
  ) => Future.error(const ApiNetworkError());
}

class DioWorkOrderRemoteApi implements WorkOrderRemoteApi {
  DioWorkOrderRemoteApi(this._dio);

  final Dio _dio;

  static DioWorkOrderRemoteApi create(ApiConfig config) =>
      DioWorkOrderRemoteApi(createExpenseHttpClient(config));

  @override
  Future<List<WorkOrder>> fetchWorkOrders({String? tenantId}) async {
    try {
      final resp = await _dio.get<Map<String, dynamic>>(
        WorkOrderApiEndpoints.workOrders,
      );
      final data = resp.data ?? const <String, dynamic>{};
      final items = (data['items'] as List<dynamic>? ?? [])
          .cast<Map<String, dynamic>>();
      return items
          .map(
            (j) =>
                _workOrderFromRemoteJson(j, fallbackTenantId: tenantId ?? ''),
          )
          .toList();
    } on DioException catch (e) {
      throw mapDioError(e);
    }
  }

  @override
  Future<WorkOrder> fetchWorkOrder(String workOrderId) async {
    try {
      final resp = await _dio.get<Map<String, dynamic>>(
        WorkOrderApiEndpoints.workOrder(workOrderId),
      );
      return _workOrderFromJson(resp.data!);
    } on DioException catch (e) {
      throw mapDioError(e);
    }
  }

  @override
  Future<WorkOrder> updateWorkOrderStatus(
    String workOrderId,
    WorkOrderStatus status,
  ) async {
    try {
      final resp = await _dio.patch<Map<String, dynamic>>(
        WorkOrderApiEndpoints.workOrderStatus(workOrderId),
        data: {'status': status.name},
      );
      return _workOrderFromJson(resp.data!);
    } on DioException catch (e) {
      throw mapDioError(e);
    }
  }

  @override
  Future<List<WorkOrderTimelineEvent>> fetchTimeline(String workOrderId) async {
    try {
      // O backend responde no envelope padrão `{ data: [...] }` (work-order.controller.ts).
      // Pedir `List<dynamic>` fazia o Dio receber um Map e devolver null → a linha do tempo remota
      // vinha SEMPRE vazia, e o repositório caía no histórico local sem ninguém perceber.
      final resp = await _dio.get<Map<String, dynamic>>(
        WorkOrderApiEndpoints.workOrderTimeline(workOrderId),
      );
      final itens = (resp.data?['data'] as List<dynamic>?) ?? const [];
      return itens
          .cast<Map<String, dynamic>>()
          .map(_timelineEventFromJson)
          .toList();
    } on DioException catch (e) {
      throw mapDioError(e);
    }
  }

  @override
  Future<WorkOrder> assignWorkOrder(
    String workOrderId,
    String userId, {
    String? note,
  }) async {
    try {
      final normalizedNote = note?.trim();
      final resp = await _dio.post<Map<String, dynamic>>(
        WorkOrderApiEndpoints.workOrderAssign(workOrderId),
        data: {
          'user_id': userId,
          if (normalizedNote != null && normalizedNote.isNotEmpty)
            'note': normalizedNote,
        },
      );
      return _workOrderFromJson(resp.data!);
    } on DioException catch (e) {
      throw mapDioError(e);
    }
  }

  @override
  Future<void> createApprovalRequest(
    String workOrderId,
    WorkOrderApprovalRequest request,
  ) async {
    try {
      await _dio.post<void>(
        WorkOrderApiEndpoints.workOrderApprovalRequests(workOrderId),
        data: {
          'reason': request.reason,
          'impact': request.impact,
          'urgency': request.urgency,
          'requested_at': request.requestedAt.toIso8601String(),
        },
      );
    } on DioException catch (e) {
      throw mapDioError(e);
    }
  }
}

// Tolerant parser for the backend list/detail DTO (camelCase) and local cache (snake_case).
// The list endpoint returns {items:[{id, customerName, scheduledFor, ...}], pagination:...}.
// Fields not present in the list DTO (tenantId) are filled from [fallbackTenantId].
WorkOrder _workOrderFromRemoteJson(
  Map<String, dynamic> json, {
  required String fallbackTenantId,
}) {
  final serverId = json['id'] as String?;
  String str(String camel, String snake) =>
      (json[camel] as String?) ?? (json[snake] as String?) ?? '';
  String? strOpt(String camel, String snake) =>
      (json[camel] as String?) ?? (json[snake] as String?);
  return WorkOrder(
    localId: serverId ?? 'wo-remote-${DateTime.now().millisecondsSinceEpoch}',
    serverId: serverId,
    tenantId: strOpt('tenantId', 'tenant_id') ?? fallbackTenantId,
    code: str('code', 'code'),
    title: str('title', 'title'),
    customerName: str('customerName', 'customer_name'),
    customerDocument: strOpt('customerDocument', 'customer_document'),
    customerPhone: strOpt('customerPhone', 'customer_phone'),
    serviceAddress: str('serviceAddress', 'service_address'),
    status: workOrderStatusFromApiValue(json['status']),
    priority: WorkOrderPriority.values.firstWhere(
      (p) => p.name == (json['priority'] as String?),
      orElse: () => WorkOrderPriority.normal,
    ),
    assignedUserId: strOpt('assignedUserId', 'assigned_user_id'),
    scheduledAt: _parseDate(strOpt('scheduledFor', 'scheduled_at')),
    startedAt: _parseDate(strOpt('startedAt', 'started_at')),
    arrivedAt: _parseDate(strOpt('arrivedAt', 'arrived_at')),
    completedAt: _parseDate(strOpt('completedAt', 'completed_at')),
    checklistId: strOpt('checklistId', 'checklist_id'),
    syncStatus: SyncStatus.synced,
    createdAt:
        _parseDate(strOpt('createdAt', 'created_at')) ?? DateTime.now().toUtc(),
    updatedAt: _parseDate(strOpt('updatedAt', 'updated_at')),
  );
}

WorkOrder _workOrderFromJson(Map<String, dynamic> json) {
  return WorkOrder(
    localId: json['local_id'] as String? ?? json['id'] as String,
    serverId: json['id'] as String?,
    tenantId: json['tenant_id'] as String,
    code: json['code'] as String,
    title: json['title'] as String,
    customerName: json['customer_name'] as String,
    customerDocument: json['customer_document'] as String?,
    customerPhone: json['customer_phone'] as String?,
    serviceAddress: json['service_address'] as String,
    status: workOrderStatusFromApiValue(json['status']),
    priority: WorkOrderPriority.values.firstWhere(
      (p) => p.name == (json['priority'] as String),
      orElse: () => WorkOrderPriority.normal,
    ),
    assignedUserId: json['assigned_user_id'] as String?,
    scheduledAt: _parseDate(json['scheduled_at'] as String?),
    startedAt: _parseDate(json['started_at'] as String?),
    arrivedAt: _parseDate(json['arrived_at'] as String?),
    completedAt: _parseDate(json['completed_at'] as String?),
    checklistId: json['checklist_id'] as String?,
    syncStatus: SyncStatus.values.firstWhere(
      (s) => s.name == (json['sync_status'] as String?),
      orElse: () => SyncStatus.synced,
    ),
    createdAt:
        _parseDate(json['created_at'] as String?) ?? DateTime.now().toUtc(),
    updatedAt: _parseDate(json['updated_at'] as String?),
  );
}

WorkOrderStatus workOrderStatusFromApiValue(Object? value) {
  final normalized = value is String ? value.trim() : '';
  if (normalized == 'pending_approval') {
    return WorkOrderStatus.pendingApproval;
  }
  return WorkOrderStatus.values.firstWhere(
    (status) => status.name == normalized,
    orElse: () => WorkOrderStatus.scheduled,
  );
}

/// Traduz o vocabulário do backend (`work_order_created`) para o do app (`created`).
///
/// O parser antigo comparava `enum.name` direto com o valor recebido — como os vocabulários nunca
/// coincidiram, TODO evento virava "Observacao" no card, mesmo quando a resposta chegava íntegra.
/// Tipo desconhecido continua caindo em `note` de propósito: um evento novo no backend não pode
/// derrubar a tela do guincheiro, e o texto real viaja em `message`.
WorkOrderTimelineEventType _eventTypeFromApi(String? valor) => switch (valor) {
  'work_order_created' => WorkOrderTimelineEventType.created,
  'work_order_updated' => WorkOrderTimelineEventType.statusChanged,
  'work_order_status_changed' => WorkOrderTimelineEventType.statusChanged,
  'work_order_assigned' => WorkOrderTimelineEventType.assigned,
  'work_order_arrived_on_site' => WorkOrderTimelineEventType.arrivedOnSite,
  'work_order_service_started' => WorkOrderTimelineEventType.serviceStarted,
  'work_order_paused' => WorkOrderTimelineEventType.paused,
  'work_order_resumed' => WorkOrderTimelineEventType.resumed,
  'work_order_approval_requested' => WorkOrderTimelineEventType.approvalRequested,
  'work_order_approval_granted' => WorkOrderTimelineEventType.approvalGranted,
  'work_order_approval_denied' => WorkOrderTimelineEventType.approvalDenied,
  'work_order_completed' => WorkOrderTimelineEventType.completed,
  'work_order_cancelled' => WorkOrderTimelineEventType.cancelled,
  'work_order_mileage_updated' => WorkOrderTimelineEventType.statusChanged,
  'work_order_comment' => WorkOrderTimelineEventType.note,
  _ => WorkOrderTimelineEventType.note,
};

/// Status da transição registrada no evento. Desconhecido vira `null` — nunca um palpite: um status
/// errado na linha do tempo é registro falso, e a tela sabe lidar com a ausência.
WorkOrderStatus? _statusFromApi(String? valor) {
  if (valor == null || valor.isEmpty) return null;
  for (final status in WorkOrderStatus.values) {
    if (status.name == valor) return status;
  }
  return null;
}

WorkOrderTimelineEvent _timelineEventFromJson(Map<String, dynamic> json) {
  // Os nomes vêm do `toWorkOrderEventDto` do backend, em camelCase. O parser antigo lia snake_case
  // (`work_order_id`, `occurred_at`, `note`) e ainda exigia `tenant_id` com cast duro — campo que o
  // DTO CORRETAMENTE não emite (§2.8: identificador de organização nunca vai para o cliente). Bastava
  // uma resposta íntegra chegar para o cast estourar.
  return WorkOrderTimelineEvent(
    localId: json['id'] as String,
    workOrderLocalId: (json['workOrderId'] as String?) ?? '',
    // O tenant vem da sessão do próprio aparelho, nunca do corpo da resposta.
    tenantId: '',
    eventType: _eventTypeFromApi(json['eventType'] as String?),
    occurredAt:
        _parseDate(json['createdAt'] as String?) ?? DateTime.now().toUtc(),
    actorUserId: json['actorUserId'] as String?,
    note: json['message'] as String?,
    fromStatus: _statusFromApi(json['fromStatus'] as String?),
    toStatus: _statusFromApi(json['toStatus'] as String?),
  );
}

DateTime? _parseDate(String? s) =>
    s == null ? null : DateTime.tryParse(s)?.toUtc();
