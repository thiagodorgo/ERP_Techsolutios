import 'package:dio/dio.dart';

import '../../../core/network/api_contracts.dart';
import '../../../core/network/api_error.dart';
import '../../../core/network/http_client.dart';
import '../domain/checklist_models.dart';

abstract class ChecklistRemoteApi {
  Future<List<MobileChecklistTemplate>> fetchAvailableChecklists({
    required String tenantId,
    String? workOrderId,
  });
  Future<MobileChecklistSchema> fetchChecklistRender(String checklistId);
  Future<String> createRun({
    required String checklistId,
    required String workOrderId,
    required String tenantId,
    required String userId,
  });
  Future<void> patchRun({
    required String runId,
    required Map<String, Object?> answers,
  });
  Future<void> completeRun(String runId);
  Future<void> createMarker({
    required String runId,
    required String type,
    String? label,
    String? description,
    String? positionLabel,
  });
  Future<void> createDivergence({
    required String runId,
    required String description,
  });
  Future<void> acknowledge({
    required String runId,
    required String acknowledgedByName,
    required String acknowledgedByRole,
  });
  Future<void> attachMetadata({
    required String runId,
    required String fieldId,
    required String fileName,
    required String mimeType,
    required int sizeBytes,
    String? checksum,
  });
}

// Safe stub — used when backend is not yet connected.
// Never throws with sensitive info; always returns ApiNetworkError.
class PendingBackendChecklistRemoteApi implements ChecklistRemoteApi {
  const PendingBackendChecklistRemoteApi();

  @override
  Future<List<MobileChecklistTemplate>> fetchAvailableChecklists({
    required String tenantId,
    String? workOrderId,
  }) => Future.error(const ApiNetworkError());

  @override
  Future<MobileChecklistSchema> fetchChecklistRender(String checklistId) =>
      Future.error(const ApiNetworkError());

  @override
  Future<String> createRun({
    required String checklistId,
    required String workOrderId,
    required String tenantId,
    required String userId,
  }) => Future.error(const ApiNetworkError());

  @override
  Future<void> patchRun({
    required String runId,
    required Map<String, Object?> answers,
  }) => Future.error(const ApiNetworkError());

  @override
  Future<void> completeRun(String runId) =>
      Future.error(const ApiNetworkError());

  @override
  Future<void> createMarker({
    required String runId,
    required String type,
    String? label,
    String? description,
    String? positionLabel,
  }) => Future.error(const ApiNetworkError());

  @override
  Future<void> createDivergence({
    required String runId,
    required String description,
  }) => Future.error(const ApiNetworkError());

  @override
  Future<void> acknowledge({
    required String runId,
    required String acknowledgedByName,
    required String acknowledgedByRole,
  }) => Future.error(const ApiNetworkError());

  @override
  Future<void> attachMetadata({
    required String runId,
    required String fieldId,
    required String fileName,
    required String mimeType,
    required int sizeBytes,
    String? checksum,
  }) => Future.error(const ApiNetworkError());
}

// Real Dio implementation — requires an authenticated Dio client.
class DioChecklistRemoteApi implements ChecklistRemoteApi {
  DioChecklistRemoteApi(this._client);

  final Dio _client;

  // ── 5 priority endpoints ────────────────────────────────────────────────────

  @override
  Future<List<MobileChecklistTemplate>> fetchAvailableChecklists({
    required String tenantId,
    String? workOrderId,
  }) async {
    try {
      final params = <String, dynamic>{'tenantId': tenantId};
      if (workOrderId != null) params['workOrderId'] = workOrderId;
      final response = await _client.get(
        ChecklistApiEndpoints.available,
        queryParameters: params,
      );
      final body = response.data as Map<String, dynamic>? ?? const {};
      // Tolerant envelope: accept checklists / items / data wrappers.
      final raw =
          body['checklists'] ?? body['items'] ?? body['data'] ?? const [];
      final list = (raw as List<dynamic>).cast<Map<String, dynamic>>();
      return list
          .map((j) => _templateFromRemoteJson(j, fallbackTenantId: tenantId))
          .toList(growable: false);
    } on DioException catch (e) {
      throw mapDioError(e);
    }
  }

  @override
  Future<MobileChecklistSchema> fetchChecklistRender(String checklistId) async {
    try {
      final response = await _client.get(
        ChecklistApiEndpoints.checklistRender(checklistId),
      );
      return _schemaFromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw mapDioError(e);
    }
  }

  @override
  Future<String> createRun({
    required String checklistId,
    required String workOrderId,
    required String tenantId,
    required String userId,
  }) async {
    try {
      final response = await _client.post(
        ChecklistApiEndpoints.runs(),
        data: {
          'checklistId': checklistId,
          'workOrderId': workOrderId,
          'tenantId': tenantId,
          'userId': userId,
        },
      );
      final body = response.data as Map<String, dynamic>;
      return body['runId'] as String;
    } on DioException catch (e) {
      throw mapDioError(e);
    }
  }

  @override
  Future<void> patchRun({
    required String runId,
    required Map<String, Object?> answers,
  }) async {
    try {
      await _client.patch(
        ChecklistApiEndpoints.run(runId),
        data: {'answers': answers},
      );
    } on DioException catch (e) {
      throw mapDioError(e);
    }
  }

  @override
  Future<void> completeRun(String runId) async {
    try {
      await _client.post(ChecklistApiEndpoints.completeRun(runId));
    } on DioException catch (e) {
      throw mapDioError(e);
    }
  }

  // ── Remaining endpoints ─────────────────────────────────────────────────────

  @override
  Future<void> createMarker({
    required String runId,
    required String type,
    String? label,
    String? description,
    String? positionLabel,
  }) async {
    try {
      final normalizedLabel = label?.trim();
      final normalizedDescription = description?.trim();
      final normalizedPositionLabel = positionLabel?.trim();
      await _client.post(
        ChecklistApiEndpoints.markers(runId),
        data: {
          'type': type,
          if (normalizedLabel != null && normalizedLabel.isNotEmpty)
            'label': normalizedLabel,
          if (normalizedDescription != null && normalizedDescription.isNotEmpty)
            'description': normalizedDescription,
          if (normalizedPositionLabel != null &&
              normalizedPositionLabel.isNotEmpty)
            'positionLabel': normalizedPositionLabel,
        },
      );
    } on DioException catch (e) {
      throw mapDioError(e);
    }
  }

  @override
  Future<void> createDivergence({
    required String runId,
    required String description,
  }) async {
    try {
      await _client.post(
        ChecklistApiEndpoints.divergence(runId),
        data: {'description': description},
      );
    } on DioException catch (e) {
      throw mapDioError(e);
    }
  }

  @override
  Future<void> acknowledge({
    required String runId,
    required String acknowledgedByName,
    required String acknowledgedByRole,
  }) async {
    try {
      await _client.post(
        ChecklistApiEndpoints.acknowledgement(runId),
        data: {
          'acknowledgedByName': acknowledgedByName,
          'acknowledgedByRole': acknowledgedByRole,
        },
      );
    } on DioException catch (e) {
      throw mapDioError(e);
    }
  }

  @override
  Future<void> attachMetadata({
    required String runId,
    required String fieldId,
    required String fileName,
    required String mimeType,
    required int sizeBytes,
    String? checksum,
  }) async {
    try {
      final normalizedChecksum = checksum?.trim();
      await _client.post(
        ChecklistApiEndpoints.attachments(runId),
        data: {
          'fieldId': fieldId,
          'fileName': fileName,
          'mimeType': mimeType,
          'sizeBytes': sizeBytes,
          if (normalizedChecksum != null && normalizedChecksum.isNotEmpty)
            'checksum': normalizedChecksum,
        },
      );
    } on DioException catch (e) {
      throw mapDioError(e);
    }
  }

  // ── JSON parsers ────────────────────────────────────────────────────────────

  // Tolerant parser: accepts camelCase (backend list DTO) and snake_case
  // (local cache format). Falls back to empty string / safe defaults so the
  // app never crashes on an unexpected field shape.
  MobileChecklistTemplate _templateFromRemoteJson(
    Map<String, dynamic> j, {
    required String fallbackTenantId,
  }) {
    String str(String camel, String snake) =>
        (j[camel] as String?) ?? (j[snake] as String?) ?? '';
    String? strOpt(String camel, String snake) =>
        (j[camel] as String?) ?? (j[snake] as String?);
    bool boolVal(String camel, String snake) =>
        (j[camel] as bool?) ?? (j[snake] as bool?) ?? false;
    return MobileChecklistTemplate(
      id: j['id'] as String,
      tenantId: strOpt('tenantId', 'tenant_id') ?? fallbackTenantId,
      title: str('title', 'title'),
      description: strOpt('description', 'description'),
      isRequired: boolVal('isRequired', 'is_required'),
      schemaVersion: str('schemaVersion', 'schema_version').isEmpty
          ? 'v1'
          : str('schemaVersion', 'schema_version'),
      status: str('status', 'status').isEmpty
          ? 'active'
          : str('status', 'status'),
      linkedWorkOrderType: strOpt(
        'linkedWorkOrderType',
        'linked_work_order_type',
      ),
    );
  }

  MobileChecklistSchema _schemaFromJson(Map<String, dynamic> j) =>
      MobileChecklistSchema(
        id: j['id'] as String,
        checklistId: j['checklistId'] as String,
        version: j['version'] as String,
        title: j['title'] as String,
        instructions: j['instructions'] as String?,
        fields: (j['fields'] as List<dynamic>? ?? [])
            .map((f) => _fieldFromJson(f as Map<String, dynamic>))
            .toList(growable: false),
      );

  MobileChecklistField _fieldFromJson(Map<String, dynamic> j) =>
      MobileChecklistField(
        id: j['id'] as String,
        type: MobileChecklistFieldType.fromApiValue(j['type'] as String),
        label: j['label'] as String,
        description: j['description'] as String?,
        required: j['required'] as bool? ?? false,
        order: j['order'] as int,
        options: (j['options'] as List<dynamic>?)
            ?.map((o) => _optionFromJson(o as Map<String, dynamic>))
            .toList(),
      );

  MobileChecklistFieldOption _optionFromJson(Map<String, dynamic> j) =>
      MobileChecklistFieldOption(
        value: j['value'] as String,
        label: j['label'] as String,
        description: j['description'] as String?,
      );
}
