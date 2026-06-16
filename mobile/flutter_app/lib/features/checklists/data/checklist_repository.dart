import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

import '../../../core/auth/auth_notifier.dart';
import '../../../core/bootstrap/bootstrap_repository.dart';
import '../../../core/bootstrap/bootstrap_session.dart';
import '../../../core/local_db/database_provider.dart';
import '../../../core/local_db/drift_checklist_local_store.dart';
import '../../../core/network/api_contracts.dart';
import '../../../core/network/api_error.dart';
import '../../../core/network/http_client.dart';
import '../../../core/sync/sync_action_factory.dart';
import '../../../core/sync/sync_models.dart';
import '../../../core/sync/sync_providers.dart';
import '../../../core/sync/sync_queue_repository.dart';
import '../domain/checklist_models.dart';
import 'checklist_local_store.dart';
import 'checklist_remote_api.dart';

enum ChecklistPullOutcome { success, cached, error, pulling }

class ChecklistRepository extends ChangeNotifier {
  ChecklistRepository({
    required BootstrapSession session,
    required SyncQueueRepository syncQueue,
    required SyncActionFactory actionFactory,
    required ChecklistLocalStore localStore,
    required ChecklistRemoteApi remoteApi,
  }) : _session = session,
       _syncQueue = syncQueue,
       _actionFactory = actionFactory,
       _localStore = localStore,
       _remoteApi = remoteApi;

  final BootstrapSession _session;
  final SyncQueueRepository _syncQueue;
  final SyncActionFactory _actionFactory;
  final ChecklistLocalStore _localStore;
  final ChecklistRemoteApi _remoteApi;
  final Uuid _uuid = const Uuid();

  List<MobileChecklistTemplate> _templates = [];
  bool _loaded = false;
  bool _isPulling = false;
  DateTime? _lastPulledAt;
  String? _lastPullError;

  List<MobileChecklistTemplate> get templates => List.unmodifiable(_templates);

  bool get isPulling => _isPulling;
  DateTime? get lastPulledAt => _lastPulledAt;
  String? get lastPullError => _lastPullError;
  bool get hasCache => _templates.isNotEmpty;

  Future<void> load({bool seedIfEmpty = true}) async {
    if (_loaded) return;

    // _isPulling is set synchronously so the first build can read it.
    // notifyListeners() is deferred until after the first await to avoid
    // calling setState() during a widget build.
    _isPulling = true;

    try {
      final remote = await _remoteApi.fetchAvailableChecklists(
        tenantId: _session.activeTenant.tenantId,
      );
      for (final t in remote) {
        await _localStore.saveTemplate(t);
      }
      _templates = remote;
      _lastPulledAt = DateTime.now().toUtc();
      _lastPullError = null;
      _loaded = true;
      _isPulling = false;
      notifyListeners();
      return;
    } catch (e) {
      _lastPullError = e is ApiError
          ? e.safeMessage
          : 'Nao foi possivel atualizar os modelos de checklist agora.';
      _isPulling = false;
      // fall through to local cache / seed
    }

    final stored = await _localStore.loadTemplates(
      _session.activeTenant.tenantId,
    );
    if (stored.isEmpty && seedIfEmpty) {
      final seeds = _seedTemplates(_session);
      final schemas = _seedSchemas(_session);
      for (final t in seeds) {
        await _localStore.saveTemplate(t);
      }
      for (final s in schemas) {
        await _localStore.saveSchema(s);
      }
      _templates = seeds;
    } else {
      _templates = stored;
    }
    _loaded = true;
    notifyListeners();
  }

  Future<ChecklistPullOutcome> refresh() async {
    if (_isPulling) return ChecklistPullOutcome.pulling;
    _loaded = false;
    _isPulling = true;
    notifyListeners();
    try {
      final remote = await _remoteApi.fetchAvailableChecklists(
        tenantId: _session.activeTenant.tenantId,
      );
      for (final t in remote) {
        await _localStore.saveTemplate(t);
      }
      _templates = remote;
      _lastPulledAt = DateTime.now().toUtc();
      _lastPullError = null;
      _loaded = true;
      return ChecklistPullOutcome.success;
    } catch (e) {
      _lastPullError = e is ApiError
          ? e.safeMessage
          : 'Nao foi possivel atualizar os modelos de checklist agora.';
      _loaded = true;
      return _templates.isEmpty
          ? ChecklistPullOutcome.error
          : ChecklistPullOutcome.cached;
    } finally {
      _isPulling = false;
      notifyListeners();
    }
  }

  List<MobileChecklistTemplate> get activeTemplates =>
      _templates.where((t) => t.isActive).toList();

  Future<MobileChecklistSchema?> getSchema(String checklistId) async {
    try {
      final remote = await _remoteApi.fetchChecklistRender(checklistId);
      await _localStore.saveSchema(remote);
      return remote;
    } catch (_) {
      return _localStore.loadSchema(checklistId);
    }
  }

  Future<List<MobileChecklistRun>> getRunsForWorkOrder(
    String workOrderId,
  ) async => _localStore.loadRunsForWorkOrder(workOrderId);

  Future<MobileChecklistRun> getOrStartRun({
    required String checklistId,
    required String workOrderId,
    required String schemaVersion,
  }) async {
    final existing = await _localStore.loadRunsForWorkOrder(workOrderId);
    final inProgress = existing
        .where(
          (r) =>
              r.checklistId == checklistId &&
              r.status == MobileChecklistRunStatus.inProgress,
        )
        .firstOrNull;
    if (inProgress != null) return inProgress;

    final run = MobileChecklistRun(
      localId: 'clrun-local-${_uuid.v4()}',
      tenantId: _session.activeTenant.tenantId,
      checklistId: checklistId,
      workOrderId: workOrderId,
      schemaVersion: schemaVersion,
      status: MobileChecklistRunStatus.inProgress,
      executedByUserId: _session.user.userId,
      startedAt: DateTime.now().toUtc(),
      syncStatus: SyncStatus.pending,
      answers: const {},
    );

    await _localStore.saveRun(run);

    final action = _actionFactory.create(
      tenantId: _session.activeTenant.tenantId,
      type: ChecklistSyncActionTypes.runCreate,
      payload: {
        'local_run_id': run.localId,
        'checklist_id': checklistId,
        'work_order_id': workOrderId,
        'schema_version': schemaVersion,
        'started_at': run.startedAt.toIso8601String(),
      },
    );
    await _syncQueue.enqueue(action);
    notifyListeners();
    return run;
  }

  Future<void> saveAnswer({
    required String runId,
    required MobileChecklistAnswer answer,
  }) async {
    final run = await _localStore.loadRun(runId);
    if (run == null) return;

    final updated = run.copyWith(
      answers: Map<String, MobileChecklistAnswer>.from(run.answers)
        ..[answer.fieldId] = answer,
    );
    await _localStore.saveRun(updated);

    final serverRunId = run.serverId?.trim();
    final action = _actionFactory.create(
      tenantId: _session.activeTenant.tenantId,
      type: ChecklistSyncActionTypes.answerUpsert,
      payload: {
        'local_run_id': runId,
        if (serverRunId != null && serverRunId.isNotEmpty)
          'server_run_id': serverRunId,
        'field_id': answer.fieldId,
        'answered_at': answer.answeredAt.toIso8601String(),
        if (answer.boolValue != null) 'bool_value': answer.boolValue,
        if (answer.choiceValue != null && answer.choiceValue!.isNotEmpty)
          'choice_value': answer.choiceValue,
        if (answer.multiChoiceValues != null &&
            answer.multiChoiceValues!.isNotEmpty)
          'multi_choice_values': answer.multiChoiceValues,
        if (answer.textValue != null && answer.textValue!.isNotEmpty)
          'text_value': answer.textValue,
        if (answer.numberValue != null) 'number_value': answer.numberValue,
        if (answer.observationText != null &&
            answer.observationText!.isNotEmpty)
          'observation_text': answer.observationText,
      },
    );
    await _syncQueue.enqueue(action);
    notifyListeners();
  }

  Future<void> completeRun({
    required String runId,
    required MobileChecklistSchema schema,
  }) async {
    final run = await _localStore.loadRun(runId);
    if (run == null) throw ArgumentError('Run nao encontrado: $runId');

    final pending = schema.requiredFields
        .where((f) => !(run.answers[f.id]?.hasValue ?? false))
        .toList();
    if (pending.isNotEmpty) {
      throw StateError(
        'Campos obrigatorios pendentes: ${pending.map((f) => f.label).join(', ')}',
      );
    }

    final now = DateTime.now().toUtc();
    final completed = run.copyWith(
      status: MobileChecklistRunStatus.completed,
      completedAt: now,
      syncStatus: SyncStatus.pending,
    );
    await _localStore.saveRun(completed);

    final serverRunId = run.serverId?.trim();
    final action = _actionFactory.create(
      tenantId: _session.activeTenant.tenantId,
      type: ChecklistSyncActionTypes.runComplete,
      payload: {
        'local_run_id': runId,
        if (serverRunId != null && serverRunId.isNotEmpty)
          'server_run_id': serverRunId,
        'completed_at': now.toIso8601String(),
        'answer_count': run.answers.length,
      },
    );
    await _syncQueue.enqueue(action);
    notifyListeners();
  }

  Future<MobileChecklistMarker> addMarker({
    required String runId,
    required String type,
    String? label,
    String? description,
    String? positionLabel,
  }) async {
    final normalizedLabel = label?.trim();
    final normalizedDescription = description?.trim();
    final normalizedPositionLabel = positionLabel?.trim();
    final marker = MobileChecklistMarker(
      localId: 'clmark-local-${_uuid.v4()}',
      runId: runId,
      type: type,
      label: normalizedLabel != null && normalizedLabel.isNotEmpty
          ? normalizedLabel
          : null,
      description:
          normalizedDescription != null && normalizedDescription.isNotEmpty
          ? normalizedDescription
          : null,
      positionLabel:
          normalizedPositionLabel != null && normalizedPositionLabel.isNotEmpty
          ? normalizedPositionLabel
          : null,
      syncStatus: SyncStatus.pending,
    );
    await _localStore.saveMarker(marker);

    final action = _actionFactory.create(
      tenantId: _session.activeTenant.tenantId,
      type: ChecklistSyncActionTypes.markerCreate,
      payload: {
        'local_marker_id': marker.localId,
        'local_run_id': runId,
        'type': type,
        if (normalizedLabel != null && normalizedLabel.isNotEmpty)
          'label': normalizedLabel,
        if (normalizedDescription != null && normalizedDescription.isNotEmpty)
          'description': normalizedDescription,
        if (normalizedPositionLabel != null &&
            normalizedPositionLabel.isNotEmpty)
          'position_label': normalizedPositionLabel,
      },
    );
    await _syncQueue.enqueue(action);
    notifyListeners();
    return marker;
  }

  Future<List<MobileChecklistMarker>> getMarkers(String runId) =>
      _localStore.loadMarkers(runId);

  Future<MobileChecklistAcknowledgement> acknowledge({
    required String runId,
    required String acknowledgedByName,
    required String acknowledgedByRole,
  }) async {
    final ack = MobileChecklistAcknowledgement(
      localId: 'clack-local-${_uuid.v4()}',
      runId: runId,
      acknowledgedByName: acknowledgedByName,
      acknowledgedByRole: acknowledgedByRole,
      acknowledgedAt: DateTime.now().toUtc(),
      confirmed: true,
      syncStatus: SyncStatus.pending,
    );
    await _localStore.saveAcknowledgement(ack);

    final action = _actionFactory.create(
      tenantId: _session.activeTenant.tenantId,
      type: ChecklistSyncActionTypes.acknowledgementCreate,
      payload: {
        'local_ack_id': ack.localId,
        'local_run_id': runId,
        'acknowledged_by_role': acknowledgedByRole,
        'acknowledged_at': ack.acknowledgedAt.toIso8601String(),
        'confirmed': true,
      },
    );
    await _syncQueue.enqueue(action);
    notifyListeners();
    return ack;
  }

  Future<MobileChecklistAcknowledgement?> getAcknowledgement(String runId) =>
      _localStore.loadAcknowledgement(runId);

  Future<MobileChecklistAttachmentMetadata> addAttachment({
    required String runId,
    required String fieldId,
    required String fileName,
    required String mimeType,
    int sizeBytes = 0,
    String? checksum,
    String? captureSource,
  }) async {
    final normalizedChecksum = checksum?.trim();
    final normalizedCaptureSource = captureSource?.trim();
    final att = MobileChecklistAttachmentMetadata(
      localId: 'clatt-local-${_uuid.v4()}',
      runId: runId,
      fieldId: fieldId,
      fileName: fileName,
      mimeType: mimeType,
      sizeBytes: sizeBytes,
      checksum: normalizedChecksum != null && normalizedChecksum.isNotEmpty
          ? normalizedChecksum
          : null,
      captureSource:
          normalizedCaptureSource != null && normalizedCaptureSource.isNotEmpty
          ? normalizedCaptureSource
          : null,
      syncStatus: SyncStatus.pending,
    );
    await _localStore.saveAttachment(att);

    final action = _actionFactory.create(
      tenantId: _session.activeTenant.tenantId,
      type: ChecklistSyncActionTypes.attachmentAttach,
      payload: {
        'local_att_id': att.localId,
        'local_run_id': runId,
        'field_id': fieldId,
        'file_name': fileName,
        'mime_type': mimeType,
        'size_bytes': sizeBytes,
        if (normalizedChecksum != null && normalizedChecksum.isNotEmpty)
          'checksum': normalizedChecksum,
        if (normalizedCaptureSource != null &&
            normalizedCaptureSource.isNotEmpty)
          'capture_source': normalizedCaptureSource,
      },
    );
    await _syncQueue.enqueue(action);
    notifyListeners();
    return att;
  }
}

// ---------------------------------------------------------------------------
// Providers
// ---------------------------------------------------------------------------

final checklistLocalStoreProvider = Provider<ChecklistLocalStore>((ref) {
  final db = ref.watch(appDatabaseProvider);
  return DriftChecklistLocalStore(db);
});

final checklistRemoteApiProvider = Provider<ChecklistRemoteApi>((ref) {
  final config = ref.watch(authenticatedApiConfigProvider);
  if (config.accessToken == null) {
    return const PendingBackendChecklistRemoteApi();
  }
  return DioChecklistRemoteApi(
    createAuthenticatedHttpClient(
      config,
      onRefresh: () async {
        await ref.read(authStateProvider.notifier).tryRefresh();
        return ref
            .read(authStateProvider)
            .maybeWhen(
              data: (s) => s.session?.tokens.accessToken,
              orElse: () => null,
            );
      },
      onClearSession: () => ref.read(authStateProvider.notifier).logout(),
    ),
  );
});

final checklistRepositoryProvider = Provider<ChecklistRepository>((ref) {
  final session = ref
      .watch(bootstrapSessionProvider)
      .maybeWhen(data: (v) => v, orElse: () => devBootstrapSession);

  return ChecklistRepository(
    session: session,
    syncQueue: ref.watch(syncQueueRepositoryProvider),
    actionFactory: ref.watch(syncActionFactoryProvider),
    localStore: ref.watch(checklistLocalStoreProvider),
    remoteApi: ref.watch(checklistRemoteApiProvider),
  );
});

// ---------------------------------------------------------------------------
// Demo seeds (simulates schema published by backend/admin)
// ---------------------------------------------------------------------------

List<MobileChecklistTemplate> _seedTemplates(BootstrapSession session) {
  final tenantId = session.activeTenant.tenantId;
  return [
    MobileChecklistTemplate(
      id: 'cl-seed-1',
      tenantId: tenantId,
      title: 'Checklist de Instalacao',
      description: 'Verificacao pre e pos instalacao de equipamento',
      isRequired: true,
      schemaVersion: 'v1',
      status: 'active',
    ),
    MobileChecklistTemplate(
      id: 'cl-seed-2',
      tenantId: tenantId,
      title: 'Vistoria de Veiculo',
      description: 'Registro de condicoes do veiculo antes da saida',
      isRequired: false,
      schemaVersion: 'v1',
      status: 'active',
    ),
  ];
}

List<MobileChecklistSchema> _seedSchemas(BootstrapSession session) {
  return [
    const MobileChecklistSchema(
      id: 'schema-seed-1',
      checklistId: 'cl-seed-1',
      version: 'v1',
      title: 'Checklist de Instalacao',
      instructions:
          'Preencha todos os campos obrigatorios antes de concluir o checklist.',
      fields: [
        MobileChecklistField(
          id: 'f-serial',
          type: MobileChecklistFieldType.text,
          label: 'Numero de serie do equipamento',
          required: true,
          order: 1,
        ),
        MobileChecklistField(
          id: 'f-voltage',
          type: MobileChecklistFieldType.number,
          label: 'Tensao medida (V)',
          required: false,
          order: 2,
        ),
        MobileChecklistField(
          id: 'f-grounding',
          type: MobileChecklistFieldType.boolean,
          label: 'Aterramento verificado',
          required: false,
          order: 3,
        ),
        MobileChecklistField(
          id: 'f-condition',
          type: MobileChecklistFieldType.singleChoice,
          label: 'Condicao do local',
          required: false,
          order: 4,
          options: [
            MobileChecklistFieldOption(value: 'good', label: 'Bom'),
            MobileChecklistFieldOption(value: 'regular', label: 'Regular'),
            MobileChecklistFieldOption(value: 'bad', label: 'Ruim'),
          ],
        ),
        MobileChecklistField(
          id: 'f-checks',
          type: MobileChecklistFieldType.multiChoice,
          label: 'Itens verificados',
          required: false,
          order: 5,
          options: [
            MobileChecklistFieldOption(
              value: 'power',
              label: 'Alimentacao eletrica',
            ),
            MobileChecklistFieldOption(
              value: 'network',
              label: 'Cabeamento de rede',
            ),
            MobileChecklistFieldOption(
              value: 'fixation',
              label: 'Fixacao mecanica',
            ),
          ],
        ),
        MobileChecklistField(
          id: 'f-photo',
          type: MobileChecklistFieldType.photoUpload,
          label: 'Foto do equipamento instalado',
          required: false,
          order: 6,
        ),
        MobileChecklistField(
          id: 'f-before-after',
          type: MobileChecklistFieldType.beforeAfter,
          label: 'Estado antes e depois',
          required: false,
          order: 7,
        ),
        MobileChecklistField(
          id: 'f-obs',
          type: MobileChecklistFieldType.observation,
          label: 'Observacoes gerais',
          required: false,
          order: 8,
        ),
      ],
    ),
    const MobileChecklistSchema(
      id: 'schema-seed-2',
      checklistId: 'cl-seed-2',
      version: 'v1',
      title: 'Vistoria de Veiculo',
      fields: [
        MobileChecklistField(
          id: 'f-vehicle-type',
          type: MobileChecklistFieldType.vehicleSelector,
          label: 'Tipo de veiculo',
          required: true,
          order: 1,
          options: [
            MobileChecklistFieldOption(value: 'sedan', label: 'Sedan'),
            MobileChecklistFieldOption(value: 'pickup', label: 'Picape'),
            MobileChecklistFieldOption(value: 'van', label: 'Van'),
            MobileChecklistFieldOption(value: 'truck', label: 'Caminhao'),
            MobileChecklistFieldOption(
              value: 'motorcycle',
              label: 'Motocicleta',
            ),
            MobileChecklistFieldOption(value: 'bus', label: 'Onibus'),
          ],
        ),
        MobileChecklistField(
          id: 'f-damage',
          type: MobileChecklistFieldType.damageMap,
          label: 'Mapa de danos',
          required: false,
          order: 2,
        ),
        MobileChecklistField(
          id: 'f-ack',
          type: MobileChecklistFieldType.acknowledgement,
          label: 'Ciencia do motorista',
          required: false,
          order: 3,
        ),
      ],
    ),
  ];
}
