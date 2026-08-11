import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

import '../../../core/auth/auth_notifier.dart';
import '../../../core/bootstrap/bootstrap_repository.dart';
import '../../../core/bootstrap/bootstrap_session.dart';
import '../../../core/evidence/evidence_blob_store.dart';
import '../../../core/local_db/database_provider.dart';
import '../../../core/local_db/drift_checklist_local_store.dart';
import '../../../core/network/api_contracts.dart';
import '../../../core/network/api_error.dart';
import '../../../core/network/http_client.dart';
import '../../../core/sync/sync_action_factory.dart';
import '../../../core/sync/sync_models.dart';
import '../../../core/sync/sync_providers.dart';
import '../../../core/sync/sync_queue_repository.dart';
import '../domain/checklist_comparison.dart';
import '../domain/checklist_models.dart';
import 'checklist_local_store.dart';
import 'checklist_remote_api.dart';

enum ChecklistPullOutcome { success, cached, error, pulling }

/// Estado da resolução da run de checklist de uma OS (D-CHK-DISPATCH-CREATE).
enum ChecklistRunResolutionStatus {
  /// Run disponível para o guincheiro responder (baixada do backend ou local
  /// offline).
  ready,

  /// Nenhuma run pré-criada foi devolvida pelo backend. Pode ser OS sem
  /// checklist despachado OU falha de provisão da run (lista vazia é ambígua).
  awaitingDispatch,
}

class ChecklistRunResolution {
  const ChecklistRunResolution._(this.status, this.run, {this.offline = false});

  factory ChecklistRunResolution.ready(
    MobileChecklistRun run, {
    bool offline = false,
  }) => ChecklistRunResolution._(
    ChecklistRunResolutionStatus.ready,
    run,
    offline: offline,
  );

  factory ChecklistRunResolution.awaitingDispatch() =>
      const ChecklistRunResolution._(
        ChecklistRunResolutionStatus.awaitingDispatch,
        null,
      );

  final ChecklistRunResolutionStatus status;
  final MobileChecklistRun? run;

  /// `true` quando a run é local (backend não alcançado): o app funciona
  /// offline e o server_run_id é gravado no próximo download com conexão.
  final bool offline;

  bool get isReady => status == ChecklistRunResolutionStatus.ready;
  bool get isAwaitingDispatch =>
      status == ChecklistRunResolutionStatus.awaitingDispatch;
}

/// Resultado do diagnóstico de fase de [ChecklistRepository.lookupRunByKind].
/// Separa "fase inexistente" de "fase ambígua" para que a tela de comparação
/// recuse com mensagem honesta em vez de esconder a ambiguidade atrás de um
/// null genérico (P-CHK-FLUTTER-KIND-COLAPSA).
class ChecklistRunKindLookup {
  const ChecklistRunKindLookup({
    required this.run,
    required this.isAmbiguous,
    required this.hasUnknownKindRun,
  });

  /// A run da fase pedida quando existe EXATAMENTE uma; null caso contrário.
  final MobileChecklistRun? run;

  /// `true` quando a OS tem MAIS de uma run da fase pedida — escolher uma em
  /// silêncio poderia confrontar a run errada na comparação.
  final bool isAmbiguous;

  /// `true` quando a OS tem alguma run cuja fase esta versão do app não
  /// reconhece ([MobileChecklistRunKind.unknown]) — o pareamento
  /// coleta × entrega deixa de ser confiável.
  final bool hasUnknownKindRun;
}

class ChecklistRepository extends ChangeNotifier {
  ChecklistRepository({
    required BootstrapSession session,
    required SyncQueueRepository syncQueue,
    required SyncActionFactory actionFactory,
    required ChecklistLocalStore localStore,
    required ChecklistRemoteApi remoteApi,
    EvidenceBlobStore? blobStore,
  }) : _session = session,
       _syncQueue = syncQueue,
       _actionFactory = actionFactory,
       _localStore = localStore,
       _remoteApi = remoteApi,
       _blobStore = blobStore;

  final BootstrapSession _session;
  final SyncQueueRepository _syncQueue;
  final SyncActionFactory _actionFactory;
  final ChecklistLocalStore _localStore;
  final ChecklistRemoteApi _remoteApi;
  // Blob store da foto de checklist (binário local até subir por multipart).
  // Opcional: em testes sem foto pode ser nulo (addAttachment só grava metadado).
  final EvidenceBlobStore? _blobStore;
  final Uuid _uuid = const Uuid();

  static const Set<String> _checklistActionTypes = {
    ChecklistSyncActionTypes.runCreate,
    ChecklistSyncActionTypes.answerUpsert,
    ChecklistSyncActionTypes.runComplete,
    ChecklistSyncActionTypes.markerCreate,
    ChecklistSyncActionTypes.divergenceCreate,
    ChecklistSyncActionTypes.acknowledgementCreate,
    ChecklistSyncActionTypes.attachmentAttach,
  };

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

  /// D-CHK-DISPATCH-CREATE — o guincheiro NÃO cria a run: o despacho a cria e o
  /// app a BAIXA. Este método resolve a run que o guincheiro deve responder:
  ///
  /// - backend devolve a run pré-criada → grava o server_run_id na run local e
  ///   carimba as ações já enfileiradas dessa run (offline → syncável); `ready`.
  /// - backend devolve lista vazia → `awaitingDispatch` (sem checklist despachado
  ///   OU falha de provisão — a lista vazia é AMBÍGUA). NÃO cria run nem enfileira
  ///   `runCreate`.
  /// - backend inalcançável (offline) → retoma/cria uma run local para trabalhar
  ///   offline (SEM `runCreate`); o server_run_id chega no próximo download.
  Future<ChecklistRunResolution> resolveRunForWorkOrder({
    required String checklistId,
    required String workOrderId,
    required String schemaVersion,
    MobileChecklistRunKind kind = MobileChecklistRunKind.collection,
  }) async {
    final existingLocal = (await _localStore.loadRunsForWorkOrder(
      workOrderId,
    )).where((r) => r.checklistId == checklistId && r.kind == kind).firstOrNull;

    List<RemoteChecklistRun>? remote;
    try {
      remote = await _remoteApi.fetchRunsForWorkOrder(
        workOrderId,
        checklistId: checklistId,
      );
    } catch (_) {
      remote = null; // offline / erro de rede
    }

    if (remote != null) {
      final match = _pickPreCreatedRun(remote, checklistId);
      if (match == null || match.id.isEmpty) {
        // Lista vazia = aguardando despacho (ou provisão falhou). Se já existe
        // uma run local desta OS/fase, mantém-la usável.
        if (existingLocal != null) {
          return ChecklistRunResolution.ready(existingLocal);
        }
        return ChecklistRunResolution.awaitingDispatch();
      }

      // Grava o server_run_id (run existente ou nova). SEM runCreate.
      final run = existingLocal != null
          ? existingLocal.copyWith(serverId: match.id)
          : _buildLocalRun(
              checklistId: checklistId,
              workOrderId: workOrderId,
              schemaVersion: schemaVersion,
              kind: kind,
              serverId: match.id,
            );
      await _localStore.saveRun(run);
      await _stampServerRunIdOnQueue(run.localId, match.id);
      notifyListeners();
      return ChecklistRunResolution.ready(run);
    }

    // Offline: retoma ou cria uma run local para não bloquear o campo.
    if (existingLocal != null) {
      return ChecklistRunResolution.ready(existingLocal, offline: true);
    }
    final run = _buildLocalRun(
      checklistId: checklistId,
      workOrderId: workOrderId,
      schemaVersion: schemaVersion,
      kind: kind,
    );
    await _localStore.saveRun(run);
    notifyListeners();
    return ChecklistRunResolution.ready(run, offline: true);
  }

  /// AUTO-SYNC (junta PR-B): baixa o `server_run_id` das runs iniciadas 100%
  /// offline que ainda estão SEM serverId mas já têm ações/fotos de checklist
  /// pendentes. Religa o download ANTES do replay — sem depender de o guincheiro
  /// REABRIR a tela. Para cada run pendente sem serverId, dispara
  /// [resolveRunForWorkOrder] (que baixa a run pré-criada e carimba o
  /// server_run_id nas ações enfileiradas). Falha de rede numa run é isolada:
  /// resolveRunForWorkOrder trata offline sem lançar.
  Future<void> downloadPendingRuns() async {
    final tenantId = _session.activeTenant.tenantId;

    // Runs locais referenciadas por ações de checklist pendentes...
    final localRunIds = <String>{};
    for (final action in await _syncQueue.pendingForTenant(tenantId)) {
      if (!_checklistActionTypes.contains(action.type)) continue;
      final localRunId = action.payload['local_run_id'];
      if (localRunId is String && localRunId.isNotEmpty) {
        localRunIds.add(localRunId);
      }
    }
    // ...e por fotos ainda pendentes de upload (binário no blob store local).
    for (final att in await _localStore.loadAttachmentsPendingUpload()) {
      if (att.runId.isNotEmpty) localRunIds.add(att.runId);
    }

    for (final localRunId in localRunIds) {
      final run = await _localStore.loadRun(localRunId);
      if (run == null || run.tenantId != tenantId) continue;
      final serverId = run.serverId?.trim();
      if (serverId != null && serverId.isNotEmpty) continue; // já baixada

      await resolveRunForWorkOrder(
        checklistId: run.checklistId,
        workOrderId: run.workOrderId,
        schemaVersion: run.schemaVersion,
        kind: run.kind,
      );
    }
  }

  // Desambigua a run pré-criada quando a OS trocou de checklist entre despachos
  // (>1 run). Prefere a run do checklist vigente; entre elas, a não-terminal.
  RemoteChecklistRun? _pickPreCreatedRun(
    List<RemoteChecklistRun> runs,
    String checklistId,
  ) {
    if (runs.isEmpty) return null;
    final matching = runs.where((r) => r.checklistId == checklistId).toList();
    final pool = matching.isNotEmpty ? matching : runs;
    return pool.firstWhere(
      (r) => r.status == null || !_isTerminalRunStatus(r.status!),
      orElse: () => pool.first,
    );
  }

  bool _isTerminalRunStatus(String status) =>
      status == 'completed' || status == 'completed_with_divergence';

  MobileChecklistRun _buildLocalRun({
    required String checklistId,
    required String workOrderId,
    required String schemaVersion,
    required MobileChecklistRunKind kind,
    String? serverId,
  }) {
    // Prefixo c_/e_ para rastrear a fase (coleta/entrega) no id local.
    final prefix = kind == MobileChecklistRunKind.delivery ? 'e' : 'c';
    return MobileChecklistRun(
      localId: 'clrun-${prefix}_${_uuid.v4()}',
      serverId: serverId,
      tenantId: _session.activeTenant.tenantId,
      checklistId: checklistId,
      workOrderId: workOrderId,
      schemaVersion: schemaVersion,
      status: MobileChecklistRunStatus.inProgress,
      kind: kind,
      executedByUserId: _session.user.userId,
      startedAt: DateTime.now().toUtc(),
      syncStatus: SyncStatus.pending,
      answers: const {},
    );
  }

  // Carimba o server_run_id nas ações de checklist já enfileiradas desta run
  // (offline → elegíveis para replay). Espelha _mapDependentActions da OS.
  Future<void> _stampServerRunIdOnQueue(
    String localRunId,
    String serverRunId,
  ) async {
    if (serverRunId.trim().isEmpty) return;
    final tenantId = _session.activeTenant.tenantId;
    final actions = await _syncQueue.actionsForTenant(tenantId);
    for (final action in actions) {
      if (!_checklistActionTypes.contains(action.type)) continue;
      if (action.payload['local_run_id'] != localRunId) continue;
      final current = action.payload['server_run_id'];
      if (current is String && current.trim().isNotEmpty) continue;
      await _syncQueue.update(
        action.copyWith(
          payload: {...action.payload, 'server_run_id': serverRunId},
        ),
      );
    }
  }

  // O guincheiro NÃO cria a run no servidor. Cria/retoma apenas o scaffold LOCAL
  // (offline-first) para segurar as respostas até o server_run_id chegar — SEM
  // enfileirar `runCreate` (D-CHK-DISPATCH-CREATE). O fluxo de coleta/entrega usa
  // resolveRunForWorkOrder (que também baixa a run do despacho); este atalho é
  // hoje exercitado sobretudo pelos testes e serve de fallback offline puro.
  Future<MobileChecklistRun> getOrStartRun({
    required String checklistId,
    required String workOrderId,
    required String schemaVersion,
    MobileChecklistRunKind kind = MobileChecklistRunKind.collection,
  }) async {
    final existing = await _localStore.loadRunsForWorkOrder(workOrderId);
    final inProgress = existing
        .where(
          (r) =>
              r.checklistId == checklistId &&
              r.kind == kind &&
              r.status == MobileChecklistRunStatus.inProgress,
        )
        .firstOrNull;
    if (inProgress != null) return inProgress;

    final run = _buildLocalRun(
      checklistId: checklistId,
      workOrderId: workOrderId,
      schemaVersion: schemaVersion,
      kind: kind,
    );
    await _localStore.saveRun(run);
    notifyListeners();
    return run;
  }

  Future<String?> _serverRunIdFor(String localRunId) async {
    final run = await _localStore.loadRun(localRunId);
    final serverId = run?.serverId?.trim();
    return (serverId != null && serverId.isNotEmpty) ? serverId : null;
  }

  /// Diagnóstico da fase (coleta/entrega) na OS. Distingue "não existe" de
  /// "mais de uma run da MESMA fase" (ambiguidade real) e expõe se a OS tem
  /// run de fase não identificada — a comparação coleta × entrega produz o
  /// resumo de divergências que vira prova jurídica do estado do veículo,
  /// então aqui nunca se devolve palpite (P-CHK-FLUTTER-KIND-COLAPSA).
  Future<ChecklistRunKindLookup> lookupRunByKind({
    required String workOrderId,
    required MobileChecklistRunKind kind,
  }) async {
    final runs = await _localStore.loadRunsForWorkOrder(workOrderId);
    final hasUnknownKindRun = runs.any(
      (r) => r.kind == MobileChecklistRunKind.unknown,
    );
    // `unknown` não é uma fase — é a ausência de identificação. Não casa com
    // coleta, com entrega, nem consigo mesmo: duas runs "unknown" podem ser
    // fases DIFERENTES que esta versão do app não sabe distinguir.
    if (kind == MobileChecklistRunKind.unknown) {
      return ChecklistRunKindLookup(
        run: null,
        isAmbiguous: false,
        hasUnknownKindRun: hasUnknownKindRun,
      );
    }
    final matches = runs.where((r) => r.kind == kind).toList();
    // Mais de uma run da mesma fase conhecida (ex.: vínculo manual do
    // operador somado ao checklist legado da OS) é ambiguidade real:
    // escolher em silêncio poderia confrontar a entrega contra a run errada
    // e fabricar divergência. Devolve "ambíguo" e a UI recusa comparar.
    if (matches.length > 1) {
      return ChecklistRunKindLookup(
        run: null,
        isAmbiguous: true,
        hasUnknownKindRun: hasUnknownKindRun,
      );
    }
    return ChecklistRunKindLookup(
      run: matches.firstOrNull,
      isAmbiguous: false,
      hasUnknownKindRun: hasUnknownKindRun,
    );
  }

  /// Retorna o run de uma fase específica (coleta/entrega) da OS, se houver
  /// EXATAMENTE um. Devolve null quando a fase não existe, quando é ambígua
  /// (>1 run da mesma fase) ou quando `kind` é [MobileChecklistRunKind.unknown]
  /// — nunca um palpite por ordem de inserção.
  Future<MobileChecklistRun?> getRunByKind({
    required String workOrderId,
    required MobileChecklistRunKind kind,
  }) async => (await lookupRunByKind(workOrderId: workOrderId, kind: kind)).run;

  /// Registra divergências entre coleta e entrega e enfileira para sync.
  /// A divergência é um FLAG de estado da run no backend (component_id +
  /// observação); o app resume as diferenças numa observação legível.
  Future<void> recordDivergences({
    required String runId,
    required List<ChecklistDivergence> divergences,
  }) async {
    if (divergences.isEmpty) return;
    final serverRunId = await _serverRunIdFor(runId);
    final action = _actionFactory.create(
      tenantId: _session.activeTenant.tenantId,
      type: ChecklistSyncActionTypes.divergenceCreate,
      payload: {
        'local_run_id': runId,
        if (serverRunId != null && serverRunId.isNotEmpty)
          'server_run_id': serverRunId,
        'divergence_count': divergences.length,
        'field_ids': divergences.map((d) => d.fieldId).toList(),
        // Componente âncora + observação que o backend exige (handler
        // divergence_create). Usa o primeiro campo divergente como âncora.
        'component_id': divergences.first.fieldId,
        'observation': _buildDivergenceObservation(divergences),
      },
    );
    await _syncQueue.enqueue(action);
    notifyListeners();
  }

  String _buildDivergenceObservation(List<ChecklistDivergence> divergences) {
    final parts = divergences.map(
      (d) =>
          '${d.label}: coleta "${d.collectionValue}" -> '
          'entrega "${d.deliveryValue}"',
    );
    return 'Divergencias (${divergences.length}): ${parts.join('; ')}';
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

    // has_divergence REAL (junta PR-B): o app conhece as divergências desta run
    // (recordDivergences enfileirou um divergence_create). Reportar `false` fixo
    // fazia o `complete` REBAIXAR pending_acknowledgement→completed e a ciência
    // subsequente 409-perder. Aqui o complete carrega o estado verdadeiro.
    final hasDivergence = await _runHasDivergence(runId);

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
        'has_divergence': hasDivergence,
      },
    );
    await _syncQueue.enqueue(action);
    notifyListeners();
  }

  // Uma run tem divergência quando existe (na fila) uma ação divergence_create
  // referenciando-a (por local_run_id ou pelo server_run_id já baixado).
  Future<bool> _runHasDivergence(String localRunId) async {
    final tenantId = _session.activeTenant.tenantId;
    final serverRunId = await _serverRunIdFor(localRunId);
    final actions = await _syncQueue.actionsForTenant(tenantId);
    return actions.any((a) {
      if (a.type != ChecklistSyncActionTypes.divergenceCreate) return false;
      if (a.payload['local_run_id'] == localRunId) return true;
      if (serverRunId != null && a.payload['server_run_id'] == serverRunId) {
        return true;
      }
      return false;
    });
  }

  Future<MobileChecklistMarker> addMarker({
    required String runId,
    required String type,
    String? fieldId,
    String? label,
    String? description,
    String? positionLabel,
  }) async {
    final normalizedLabel = label?.trim();
    final normalizedDescription = description?.trim();
    final normalizedPositionLabel = positionLabel?.trim();
    final normalizedFieldId = fieldId?.trim();
    // FAIL-SAFE (junta PR-B): o backend EXIGE component_id no marker_create
    // (parseRequiredString → 400 required_field). Sem ele o marcador seria
    // enfileirado e rejeitado, sumindo em silêncio após o maxRetry = data-loss.
    // Bloqueia ANTES de gravar/enfileirar para o campo tratar (a tela mostra um
    // aviso e não abre o diálogo sem componente âncora).
    if (normalizedFieldId == null || normalizedFieldId.isEmpty) {
      throw ArgumentError.value(
        fieldId,
        'fieldId',
        'component_id (campo do mapa de danos) e obrigatorio para registrar '
            'um marcador — o backend rejeita marcador sem componente ancora.',
      );
    }
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

    final serverRunId = await _serverRunIdFor(runId);
    final action = _actionFactory.create(
      tenantId: _session.activeTenant.tenantId,
      type: ChecklistSyncActionTypes.markerCreate,
      payload: {
        'local_marker_id': marker.localId,
        'local_run_id': runId,
        if (serverRunId != null && serverRunId.isNotEmpty)
          'server_run_id': serverRunId,
        // Componente âncora que o backend exige (handler marker_create).
        // Garantido não-vazio pelo fail-safe acima.
        'field_id': normalizedFieldId,
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

    final serverRunId = await _serverRunIdFor(runId);
    final action = _actionFactory.create(
      tenantId: _session.activeTenant.tenantId,
      type: ChecklistSyncActionTypes.acknowledgementCreate,
      payload: {
        'local_ack_id': ack.localId,
        'local_run_id': runId,
        if (serverRunId != null && serverRunId.isNotEmpty)
          'server_run_id': serverRunId,
        'acknowledged_by_role': acknowledgedByRole,
        'acknowledged_at': ack.acknowledgedAt.toIso8601String(),
        'confirmed': true,
        // Mensagem que o backend exige (handler acknowledgement_create).
        'message': _buildAcknowledgementMessage(
          acknowledgedByName,
          acknowledgedByRole,
        ),
      },
    );
    await _syncQueue.enqueue(action);
    notifyListeners();
    return ack;
  }

  String _buildAcknowledgementMessage(String name, String role) {
    final trimmedName = name.trim();
    final who = trimmedName.isEmpty ? 'responsavel' : trimmedName;
    final trimmedRole = role.trim();
    return trimmedRole.isEmpty
        ? 'Ciencia registrada por $who.'
        : 'Ciencia registrada por $who ($trimmedRole).';
  }

  Future<MobileChecklistAcknowledgement?> getAcknowledgement(String runId) =>
      _localStore.loadAcknowledgement(runId);

  /// Registra a foto do checklist. O METADADO vai pelo sync (ordenação/vínculo);
  /// o BINÁRIO (`bytes`) é gravado no blob store local e sobe depois pelo
  /// multipart POST /mobile/checklist-runs/:runId/attachments (offline-first).
  Future<MobileChecklistAttachmentMetadata> addAttachment({
    required String runId,
    required String fieldId,
    required String fileName,
    required String mimeType,
    int sizeBytes = 0,
    String? checksum,
    String? captureSource,
    Uint8List? bytes,
  }) async {
    final normalizedChecksum = checksum?.trim();
    final normalizedCaptureSource = captureSource?.trim();

    // Grava o binário localmente (se veio e há blob store) para subir por
    // multipart quando houver conexão. O blob opaco só é apagado após stored.
    String? localBlobRef;
    var effectiveSize = sizeBytes;
    if (bytes != null && bytes.isNotEmpty && _blobStore != null) {
      localBlobRef = await _blobStore.save(bytes, contentType: mimeType);
      effectiveSize = bytes.length;
    }

    final att = MobileChecklistAttachmentMetadata(
      localId: 'clatt-local-${_uuid.v4()}',
      runId: runId,
      fieldId: fieldId,
      fileName: fileName,
      mimeType: mimeType,
      sizeBytes: effectiveSize,
      checksum: normalizedChecksum != null && normalizedChecksum.isNotEmpty
          ? normalizedChecksum
          : null,
      captureSource:
          normalizedCaptureSource != null && normalizedCaptureSource.isNotEmpty
          ? normalizedCaptureSource
          : null,
      syncStatus: SyncStatus.pending,
      localBlobRef: localBlobRef,
      uploadStatus: SyncStatus.pending,
    );
    await _localStore.saveAttachment(att);

    final serverRunId = await _serverRunIdFor(runId);
    final action = _actionFactory.create(
      tenantId: _session.activeTenant.tenantId,
      type: ChecklistSyncActionTypes.attachmentAttach,
      payload: {
        'local_att_id': att.localId,
        'local_run_id': runId,
        if (serverRunId != null && serverRunId.isNotEmpty)
          'server_run_id': serverRunId,
        'field_id': fieldId,
        'file_name': fileName,
        'mime_type': mimeType,
        'size_bytes': effectiveSize,
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
    blobStore: ref.watch(evidenceBlobStoreProvider),
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
        MobileChecklistField(
          id: 'f-signature',
          type: MobileChecklistFieldType.signature,
          label: 'Assinatura',
          required: false,
          order: 4,
        ),
      ],
    ),
  ];
}
