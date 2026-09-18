import 'package:dio/dio.dart';

import '../../../core/network/api_contracts.dart';
import '../../../core/network/api_error.dart';
import '../../../core/network/http_client.dart';
import '../../../core/sync/sync_models.dart';
import '../domain/work_order_models.dart';

abstract class WorkOrderRemoteApi {
  Future<List<WorkOrder>> fetchWorkOrders({String? tenantId});

  /// [tenantId] é o da SESSÃO do aparelho: o DTO do backend não emite o identificador da
  /// organização (§2.8), e uma OS com tenant vazio fica invisível para as leituras por tenant.
  Future<WorkOrder> fetchWorkOrder(String workOrderId, {String? tenantId});
  Future<WorkOrder> updateWorkOrderStatus(
    String workOrderId,
    WorkOrderStatus status, {
    String? tenantId,
  });
  Future<List<WorkOrderTimelineEvent>> fetchTimeline(String workOrderId);
  Future<WorkOrder> assignWorkOrder(
    String workOrderId,
    String userId, {
    String? note,
    String? tenantId,
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
  Future<WorkOrder> fetchWorkOrder(String workOrderId, {String? tenantId}) =>
      Future.error(const ApiNetworkError());

  @override
  Future<WorkOrder> updateWorkOrderStatus(
    String workOrderId,
    WorkOrderStatus status, {
    String? tenantId,
  }) => Future.error(const ApiNetworkError());

  @override
  Future<List<WorkOrderTimelineEvent>> fetchTimeline(String workOrderId) =>
      Future.error(const ApiNetworkError());

  @override
  Future<WorkOrder> assignWorkOrder(
    String workOrderId,
    String userId, {
    String? note,
    String? tenantId,
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

  // B-O6R-11 (Ω6R-QUA-004) — detalhe, status e atribuição respondem no envelope padrão
  // `{ data: toWorkOrderDto(...) }` (work-order.controller.ts), em camelCase e SEM `tenantId`.
  // O parser antigo recebia o envelope INTEIRO, lia snake_case e fazia `json['tenant_id'] as
  // String`: bastava uma resposta íntegra chegar para o cast estourar (TypeError, fora do
  // `on DioException`). Os três agora desembrulham `data` e usam o mesmo parser da lista.
  @override
  Future<WorkOrder> fetchWorkOrder(
    String workOrderId, {
    String? tenantId,
  }) async {
    try {
      final resp = await _dio.get<Map<String, dynamic>>(
        WorkOrderApiEndpoints.workOrder(workOrderId),
      );
      return _workOrderFromRemoteJson(
        _unwrapData(resp.data),
        fallbackTenantId: '',
        sessionTenantId: tenantId,
      );
    } on DioException catch (e) {
      throw mapDioError(e);
    }
  }

  @override
  Future<WorkOrder> updateWorkOrderStatus(
    String workOrderId,
    WorkOrderStatus status, {
    String? tenantId,
  }) async {
    // Fora do `try` de propósito: status sem equivalente no backend é erro de programação do
    // app (ArgumentError), não falha de rede — e nenhum pedido sai.
    final backendStatus = backendStatusFor(status);
    try {
      final resp = await _dio.patch<Map<String, dynamic>>(
        WorkOrderApiEndpoints.workOrderStatus(workOrderId),
        data: {'status': backendStatus},
      );
      return _workOrderFromRemoteJson(
        _unwrapData(resp.data),
        fallbackTenantId: '',
        sessionTenantId: tenantId,
      );
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

  // O backend lê `operatorId ?? userId` e `message` (work-order.service.ts, `assign`); `user_id` e
  // `note` não eram lidos → 400 antes de qualquer efeito. `userId` preenche os dois lados da
  // atribuição: `assigned_operator_id` (pelo fallback) e `assigned_user_id` (o que a lista expõe).
  // A rota exige `work_orders:assign` — despacho/gestor/admin; o técnico de campo não tem.
  @override
  Future<WorkOrder> assignWorkOrder(
    String workOrderId,
    String userId, {
    String? note,
    String? tenantId,
  }) async {
    try {
      final message = note?.trim();
      final resp = await _dio.post<Map<String, dynamic>>(
        WorkOrderApiEndpoints.workOrderAssign(workOrderId),
        data: {
          'userId': userId,
          if (message != null && message.isNotEmpty) 'message': message,
        },
      );
      return _workOrderFromRemoteJson(
        _unwrapData(resp.data),
        fallbackTenantId: '',
        sessionTenantId: tenantId,
      );
    } on DioException catch (e) {
      throw mapDioError(e);
    }
  }

  // Rota inexistente no backend (P-MOBILE-APPROVAL-REQUEST-REST-404, dono B-SAN3-16).
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
//
// B-O6R-11, emenda 2 (i): [sessionTenantId] é o tenant da SESSÃO que o chamador passou. Quando
// vem, ele VENCE qualquer tenant do corpo — a organização se resolve pelo ator autenticado, nunca
// por conteúdo de resposta (§2.8). Sem ele, fica o comportamento anterior: o do corpo, se vier,
// senão [fallbackTenantId]. Hoje só detalhe, status e atribuição o passam.
WorkOrder _workOrderFromRemoteJson(
  Map<String, dynamic> json, {
  required String fallbackTenantId,
  String? sessionTenantId,
}) {
  final serverId = json['id'] as String?;
  String str(String camel, String snake) =>
      (json[camel] as String?) ?? (json[snake] as String?) ?? '';
  String? strOpt(String camel, String snake) =>
      (json[camel] as String?) ?? (json[snake] as String?);
  return WorkOrder(
    localId: serverId ?? 'wo-remote-${DateTime.now().millisecondsSinceEpoch}',
    serverId: serverId,
    tenantId:
        sessionTenantId ?? strOpt('tenantId', 'tenant_id') ?? fallbackTenantId,
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

/// Corpo de uma resposta de objeto único: o conteúdo de `data` quando o backend usa o envelope
/// padrão, senão o próprio corpo (tolerante, como `registry_options_remote_api._items`).
Map<String, dynamic> _unwrapData(Map<String, dynamic>? body) {
  final data = body?['data'];
  if (data is Map<String, dynamic>) return data;
  if (data is Map) return Map<String, dynamic>.from(data);
  return body ?? const <String, dynamic>{};
}

// B-O6R-11 — vocabulário de status, nos DOIS sentidos. O backend fala `WORK_ORDER_STATUSES`
// (work-order.types.ts: open, assigned, accepted, on_route, on_site, in_progress, paused,
// completed, cancelled, rejected); o app, `WorkOrderStatus`. É o espelho do
// `WorkOrderSyncCodec._backendStatus` (sync_replay_service.dart), que traduz o mesmo vocabulário
// na fila offline: as duas tabelas não podem divergir, e o teste de paridade do B-O6R-11
// (bo6r11_os_rest_envelope_e_vocabulario_test.dart, caso 11) fica vermelho se uma mudar sozinha.

/// App → backend (corpo do `PATCH /work-orders/:id/status`). O `switch` é exaustivo: estado novo
/// no enum não compila sem decisão aqui. Estado que só existe no app lança [ArgumentError] — o
/// app nunca pede ao backend um estado que ele não tem (seria 400 `invalid_status`).
String backendStatusFor(WorkOrderStatus status) => switch (status) {
  WorkOrderStatus.scheduled => 'open',
  WorkOrderStatus.dispatched => 'assigned',
  WorkOrderStatus.enRoute => 'on_route',
  WorkOrderStatus.arrived => 'on_site',
  WorkOrderStatus.inService => 'in_progress',
  WorkOrderStatus.paused => 'paused',
  WorkOrderStatus.completed => 'completed',
  WorkOrderStatus.cancelled => 'cancelled',
  WorkOrderStatus.rejected => 'rejected',
  WorkOrderStatus.pendingApproval ||
  WorkOrderStatus.approved ||
  WorkOrderStatus.exception => throw ArgumentError.value(
    status,
    'status',
    'sem equivalente no backend',
  ),
};

/// Backend → app. Antes só `pending_approval` era traduzido, e todo o resto do vocabulário do
/// backend caía em `scheduled` — inclusive na lista viva do B-099: toda OS aparecia "Agendada".
/// Nome do próprio enum continua valendo (fixtures e cache local); desconhecido continua caindo
/// em `scheduled` (comportamento anterior, provado pelo b099 2.3).
WorkOrderStatus workOrderStatusFromApiValue(Object? value) {
  final normalized = value is String ? value.trim() : '';
  return switch (normalized) {
    'open' => WorkOrderStatus.scheduled,
    'assigned' => WorkOrderStatus.dispatched,
    // Lossy: o app não distingue "atribuída" de "aceita" (P-MOBILE-STATUS-ACCEPTED-LOSSY).
    'accepted' => WorkOrderStatus.dispatched,
    'on_route' => WorkOrderStatus.enRoute,
    'on_site' => WorkOrderStatus.arrived,
    'in_progress' => WorkOrderStatus.inService,
    'pending_approval' => WorkOrderStatus.pendingApproval,
    _ => WorkOrderStatus.values.firstWhere(
      (status) => status.name == normalized,
      orElse: () => WorkOrderStatus.scheduled,
    ),
  };
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
  'work_order_approval_requested' =>
    WorkOrderTimelineEventType.approvalRequested,
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
