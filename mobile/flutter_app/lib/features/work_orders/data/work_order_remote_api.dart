import 'package:dio/dio.dart';

import '../../../core/network/api_contracts.dart';
import '../../../core/network/api_error.dart';
import '../../../core/network/http_client.dart';
import '../../../core/sync/sync_models.dart';
import '../domain/work_order_models.dart';

abstract class WorkOrderRemoteApi {
  /// [tenantId] é o da SESSÃO do aparelho e é OBRIGATÓRIO: o corpo da resposta nunca é
  /// consultado para descobrir a organização (§2.8 — o tenant se resolve pelo ator autenticado).
  ///
  /// B-O6R-11 ciclo 2 (C2-F2 / C3-A2): no ciclo 1 o parâmetro era `String?`, e o chamador que o
  /// OMITISSE recebia o tenant do CORPO nos quatro leitores — sem build nem teste vermelho. A
  /// emenda 3 (m) fechou o `''`; o nulo, ausência do MESMO dado, ficou do lado permitido. Agora
  /// quem omite **não compila**: o compilador é a forma mais forte de fail-closed que a casa usa.
  /// `''` continua sendo o "sem sessão" possível, e deixa a OS invisível para as leituras por
  /// tenant — o lado fechado.
  Future<List<WorkOrder>> fetchWorkOrders({required String tenantId});
  Future<WorkOrder> fetchWorkOrder(
    String workOrderId, {
    required String tenantId,
  });
  Future<WorkOrder> updateWorkOrderStatus(
    String workOrderId,
    WorkOrderStatus status, {
    required String tenantId,
  });
  Future<List<WorkOrderTimelineEvent>> fetchTimeline(String workOrderId);
  Future<WorkOrder> assignWorkOrder(
    String workOrderId,
    String userId, {
    String? note,
    required String tenantId,
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
  Future<List<WorkOrder>> fetchWorkOrders({required String tenantId}) =>
      Future.error(const ApiNetworkError());

  @override
  Future<WorkOrder> fetchWorkOrder(
    String workOrderId, {
    required String tenantId,
  }) => Future.error(const ApiNetworkError());

  @override
  Future<WorkOrder> updateWorkOrderStatus(
    String workOrderId,
    WorkOrderStatus status, {
    required String tenantId,
  }) => Future.error(const ApiNetworkError());

  @override
  Future<List<WorkOrderTimelineEvent>> fetchTimeline(String workOrderId) =>
      Future.error(const ApiNetworkError());

  @override
  Future<WorkOrder> assignWorkOrder(
    String workOrderId,
    String userId, {
    String? note,
    required String tenantId,
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
  Future<List<WorkOrder>> fetchWorkOrders({required String tenantId}) async {
    try {
      final resp = await _dio.get<Map<String, dynamic>>(
        WorkOrderApiEndpoints.workOrders,
      );
      // C3-A1: 200 sem lista NÃO vira lista vazia silenciosa. O backend sempre emite `items`
      // (`toWorkOrderListDto`); tolerar a ausência era aceitar uma forma que ele nunca produz e
      // apresentar "nenhuma OS" onde houve falha de contrato.
      final items = resp.data?['items'];
      if (items is! List) {
        throw const FormatException('lista de OS sem items');
      }
      return [
        for (final item in items)
          _workOrderFromRemoteJson(_comoObjeto(item), tenantId: tenantId),
      ];
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
    required String tenantId,
  }) async {
    try {
      final resp = await _dio.get<Map<String, dynamic>>(
        WorkOrderApiEndpoints.workOrder(workOrderId),
      );
      return _workOrderFromRemoteJson(
        _unwrapData(resp.data),
        tenantId: tenantId,
      );
    } on DioException catch (e) {
      throw mapDioError(e);
    }
  }

  @override
  Future<WorkOrder> updateWorkOrderStatus(
    String workOrderId,
    WorkOrderStatus status, {
    required String tenantId,
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
        tenantId: tenantId,
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
    required String tenantId,
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
        tenantId: tenantId,
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

// Parser do DTO de lista/detalhe do backend (camelCase) e do cache local (snake_case).
// A lista responde {items:[{id, customerName, scheduledFor, ...}], pagination:...}.
//
// B-O6R-11, emendas 2 (i) e 3 (j)/(m) e ciclo 2 (C2-F2/C3-A2): [tenantId] é o tenant da SESSÃO,
// e é OBRIGATÓRIO. Não existe mais caminho para o tenant do CORPO — a leitura
// `strOpt('tenantId','tenant_id')` foi removida, e depois disto não há uma única leitura de
// tenant de payload neste arquivo. A organização se resolve pelo ator autenticado (§2.8); `''`
// deixa a OS invisível para as leituras por tenant, que é o lado fechado.
//
// C3-A1 (ciclo 2): resposta 200 sem `id` NÃO vira OS. Antes, `id` ausente virava
// `localId: 'wo-remote-<timestamp>'` com `syncStatus: synced` — dado inventado marcado como
// sincronizado. Agora lança [FormatException] com mensagem CONSTANTE: nada do payload é ecoado.
WorkOrder _workOrderFromRemoteJson(
  Map<String, dynamic> json, {
  required String tenantId,
}) {
  final serverId = json['id'];
  if (serverId is! String || serverId.trim().isEmpty) {
    throw const FormatException('OS remota sem id');
  }
  String str(String camel, String snake) =>
      (json[camel] as String?) ?? (json[snake] as String?) ?? '';
  String? strOpt(String camel, String snake) =>
      (json[camel] as String?) ?? (json[snake] as String?);
  return WorkOrder(
    localId: serverId,
    serverId: serverId,
    tenantId: tenantId,
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

/// Corpo de uma resposta de objeto único: o conteúdo de `data`, e SÓ ele.
///
/// C3-A1 (ciclo 2): o `?? body ?? {}` do ciclo 1 aceitava uma forma que o backend nunca emite —
/// as três rotas de OS respondem `{ data: objeto }` em 100 % dos caminhos. Tolerar era fail-open:
/// `{}`, `{data: null}`, `{data: []}` e `{error: …}` com HTTP 200 viravam uma OS fabricada e
/// marcada como sincronizada. Agora lança [FormatException] com mensagem constante (§2.8: nada do
/// payload é ecoado).
Map<String, dynamic> _unwrapData(Map<String, dynamic>? body) {
  final data = body?['data'];
  if (data is! Map) {
    throw const FormatException('resposta da OS sem objeto em data');
  }
  return _comoObjeto(data);
}

Map<String, dynamic> _comoObjeto(Object? valor) {
  if (valor is Map<String, dynamic>) return valor;
  if (valor is Map) return Map<String, dynamic>.from(valor);
  throw const FormatException('OS remota sem objeto');
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

/// Backend → app, entrada por entrada e EXPLÍCITA. São os 10 valores de `WORK_ORDER_STATUSES`
/// (`src/modules/work-orders/work-order.types.ts`) mais `pending_approval`, que o backend emite
/// como estado de aprovação. Pública de propósito: o caso 16 do
/// `bo6r11_os_rest_envelope_e_vocabulario_test.dart` lê o vocabulário no arquivo do backend e
/// exige que TODO valor de lá tenha entrada aqui — status novo no backend deixa o teste vermelho
/// em vez de cair silenciosamente no destino do desconhecido (C2-F3).
const Map<String, WorkOrderStatus> backendStatusToApp = {
  'open': WorkOrderStatus.scheduled,
  'assigned': WorkOrderStatus.dispatched,
  // Lossy: o app não distingue "atribuída" de "aceita" (P-MOBILE-STATUS-ACCEPTED-LOSSY).
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

/// Backend → app. Antes só `pending_approval` era traduzido, e todo o resto do vocabulário do
/// backend caía em `scheduled` — inclusive na lista viva do B-099: toda OS aparecia "Agendada".
/// Nome do próprio enum continua valendo (fixtures e cache local).
///
/// Status DESCONHECIDO cai em `scheduled` — comportamento pré-existente (`e79616aa`, 2026-06-13),
/// FIXADO pelo caso 15 do `bo6r11_os_rest_envelope_e_vocabulario_test.dart` até
/// `P-MOBILE-STATUS-DESCONHECIDO-VIRA-AGENDADA` decidir o destino. (O comentário do ciclo 1 dizia
/// "provado pelo b099 2.3"; a cadeira C2 da junta mediu que aquele caso constrói
/// `WorkOrder(status: scheduled)` e lê o próprio literal — não prova destino nenhum.)
WorkOrderStatus workOrderStatusFromApiValue(Object? value) {
  final normalized = value is String ? value.trim() : '';
  return backendStatusToApp[normalized] ??
      WorkOrderStatus.values.firstWhere(
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
