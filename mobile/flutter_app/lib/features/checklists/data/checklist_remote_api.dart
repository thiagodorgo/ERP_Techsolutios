import 'package:dio/dio.dart';

import '../../../core/network/api_contracts.dart';
import '../../../core/network/api_error.dart';
import '../../../core/network/http_client.dart';
import '../domain/checklist_models.dart';

/// Run pré-criada pelo despacho (D-CHK-DISPATCH-CREATE) baixada pelo guincheiro.
/// Só o essencial para vincular a run local ao server_run_id e desambiguar por
/// checklist vigente. NÃO expõe client_run_key (o backend não o devolve).
class RemoteChecklistRun {
  const RemoteChecklistRun({
    required this.id,
    required this.checklistId,
    this.status,
    this.relatedEntityType,
    this.relatedEntityId,
  });

  /// server_run_id — o id da run no servidor (alvo do multipart e do sync).
  final String id;

  /// templateId do backend = checklistId no app.
  final String checklistId;
  final String? status;
  final String? relatedEntityType;
  final String? relatedEntityId;
}

abstract class ChecklistRemoteApi {
  Future<List<MobileChecklistTemplate>> fetchAvailableChecklists({
    required String tenantId,
    String? workOrderId,
  });

  /// Baixa a(s) run(s) pré-criada(s) de uma OS (despacho cria, guincheiro
  /// responde). Lista vazia PODE significar falha de provisão, não só ausência
  /// — o chamador trata os dois casos (estado "aguardando despacho").
  Future<List<RemoteChecklistRun>> fetchRunsForWorkOrder(
    String workOrderId, {
    String? checklistId,
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
  Future<List<RemoteChecklistRun>> fetchRunsForWorkOrder(
    String workOrderId, {
    String? checklistId,
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
  Future<List<RemoteChecklistRun>> fetchRunsForWorkOrder(
    String workOrderId, {
    String? checklistId,
  }) async {
    try {
      final params = <String, dynamic>{'workOrderId': workOrderId};
      if (checklistId != null && checklistId.isNotEmpty) {
        params['checklistId'] = checklistId;
      }
      final response = await _client.get(
        ChecklistApiEndpoints.runs(),
        queryParameters: params,
      );
      final body = response.data as Map<String, dynamic>? ?? const {};
      final raw = body['data'] ?? body['runs'] ?? body['items'] ?? const [];
      final list = (raw as List<dynamic>).cast<Map<String, dynamic>>();
      return list.map(_runFromRemoteJson).toList(growable: false);
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
      // P-CHK-RENDER-ENVELOPE (CHECKLIST P1) — o backend responde `{ data: {...} }`; sem o desembrulho o
      // _schemaFromJson estourava o cast e o app caía no fallback de SEEDS (nenhum checklist authorado na web
      // renderizava). Tolera também payload sem envelope (contrato antigo/teste).
      final body = response.data as Map<String, dynamic>;
      final payload = (body['data'] as Map<String, dynamic>?) ?? body;
      return _schemaFromJson(payload);
    } on DioException catch (e) {
      throw mapDioError(e);
    }
  }

  // Parser tolerante (camelCase do DTO backend + snake_case defensivo).
  RemoteChecklistRun _runFromRemoteJson(Map<String, dynamic> j) {
    String? strOpt(String camel, String snake) =>
        (j[camel] as String?) ?? (j[snake] as String?);
    return RemoteChecklistRun(
      id: (j['id'] as String?) ?? '',
      checklistId: strOpt('templateId', 'template_id') ?? '',
      status: strOpt('status', 'status'),
      relatedEntityType: strOpt('relatedEntityType', 'related_entity_type'),
      relatedEntityId: strOpt('relatedEntityId', 'related_entity_id'),
    );
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

  // P-CHK-RENDER-ENVELOPE (CHECKLIST P1) — parser alinhado ao shape REAL do GET /mobile/checklists/:id/render:
  // `{ id, name, description, type, version:NUMERO, schema, components }` (sem `checklistId`/`title`). O contrato
  // antigo (`checklistId`/`title`/`version` string) segue tolerado — nunca mais estourar cast e cair nos seeds.
  MobileChecklistSchema _schemaFromJson(Map<String, dynamic> j) =>
      MobileChecklistSchema(
        id: (j['id'] as String?) ?? '',
        checklistId:
            (j['checklistId'] as String?) ?? (j['id'] as String?) ?? '',
        version: '${j['version'] ?? j['schema_version'] ?? '1'}',
        title: (j['title'] as String?) ?? (j['name'] as String?) ?? '',
        instructions:
            (j['instructions'] as String?) ?? (j['description'] as String?),
        // Tolera os DOIS formatos do contrato: `fields` (render) e `components`
        // (builder/admin). Ver mapeamento em _fieldFromJson.
        fields: ((j['fields'] ?? j['components']) as List<dynamic>? ?? const [])
            .map((f) => _fieldFromJson(f as Map<String, dynamic>))
            .toList(growable: false),
      );

  // Aceita tanto o shape `field` quanto `component`:
  //   component.id         -> id
  //   component.type/componentKey -> type
  //   component.label      -> label
  //   component.required   -> required
  //   component.orderIndex -> order
  // Tipo desconhecido vira `unsupported` e o render mostra
  // "Componente não suportado nesta versão do app.".
  MobileChecklistField _fieldFromJson(Map<String, dynamic> j) =>
      MobileChecklistField(
        id: j['id'] as String,
        type: MobileChecklistFieldType.fromApiValue(
          (j['type'] ?? j['componentKey']) as String? ?? 'unsupported',
        ),
        label: (j['label'] as String?) ?? '',
        description: j['description'] as String?,
        required: j['required'] as bool? ?? false,
        order: (j['order'] ?? j['orderIndex']) as int? ?? 0,
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
