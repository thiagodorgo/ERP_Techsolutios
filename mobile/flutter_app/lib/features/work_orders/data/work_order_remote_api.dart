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
      final resp = await _dio.get<List<dynamic>>(
        WorkOrderApiEndpoints.workOrderTimeline(workOrderId),
      );
      return (resp.data ?? [])
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
    serviceAddress: str('serviceAddress', 'service_address'),
    status: WorkOrderStatus.values.firstWhere(
      (s) => s.name == (json['status'] as String?),
      orElse: () => WorkOrderStatus.scheduled,
    ),
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
    serviceAddress: json['service_address'] as String,
    status: WorkOrderStatus.values.firstWhere(
      (s) => s.name == (json['status'] as String),
      orElse: () => WorkOrderStatus.scheduled,
    ),
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

WorkOrderTimelineEvent _timelineEventFromJson(Map<String, dynamic> json) {
  return WorkOrderTimelineEvent(
    localId: json['id'] as String,
    workOrderLocalId: json['work_order_id'] as String,
    tenantId: json['tenant_id'] as String,
    eventType: WorkOrderTimelineEventType.values.firstWhere(
      (t) => t.name == (json['event_type'] as String),
      orElse: () => WorkOrderTimelineEventType.note,
    ),
    occurredAt:
        _parseDate(json['occurred_at'] as String?) ?? DateTime.now().toUtc(),
    actorUserId: json['actor_user_id'] as String?,
    note: json['note'] as String?,
  );
}

DateTime? _parseDate(String? s) =>
    s == null ? null : DateTime.tryParse(s)?.toUtc();
