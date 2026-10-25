import 'dart:async';

import 'package:crypto/crypto.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

import '../../../core/auth/auth_notifier.dart';
import '../../../core/bootstrap/bootstrap_repository.dart';
import '../../../core/bootstrap/bootstrap_session.dart';
import '../../../core/config/app_config.dart';
import '../../../core/evidence/evidence_blob_store.dart';
import '../../../core/local_db/drift_work_order_local_store.dart';
import '../../../core/local_db/database_provider.dart';
import '../../../core/network/api_contracts.dart';
import '../../../core/network/api_error.dart';
import '../../../core/sync/sync_action_factory.dart';
import '../../../core/sync/sync_models.dart';
import '../../../core/sync/sync_providers.dart';
import '../../../core/sync/sync_queue_repository.dart';
import '../../../core/telemetry/telemetry_providers.dart';
import '../../checklists/data/checklist_local_store.dart';
import '../../checklists/data/checklist_repository.dart';
import '../../prestador/data/prestador_local_store.dart';
import '../../prestador/data/prestador_repository.dart';
import '../domain/work_order_models.dart';
import 'work_order_local_store.dart';
import 'work_order_remote_api.dart';

class WorkOrderMutationResult {
  const WorkOrderMutationResult({
    required this.workOrder,
    required this.action,
  });

  final WorkOrder workOrder;
  final SyncAction action;
}

/// Ω4C PR-13 — hook de telemetria de recusa de serviço. Recebe o `serverId` REAL
/// da OS (nunca id local) + o motivo. Mantido como callback opcional para o
/// repositório não depender do módulo de telemetria (e não quebrar os testes que
/// o constroem sem telemetria).
typedef ServiceRefusalTelemetryHook =
    Future<void> Function({
      required String tenantId,
      required String? workOrderServerId,
      required String reason,
    });

enum WorkOrderPullOutcome { success, cached, error, pulling }

/// B-SAN3-13 — gancho para trabalho pendente que mora FORA das tabelas de OS (vistoria e materiais do prestador,
/// ramos 4 e 5 do §2.3 do plano v3). O provider o compõe; ausente = `false` (declarado, R10). Ciclo 2 (C2-02, RQ-2):
/// recebe o MESMO instantâneo da fila que a reconciliação acabou de ler (uma fonte, sem releitura).
typedef WorkOrderExternalPendingWork =
    Future<bool> Function(WorkOrder order, List<SyncAction> actions);

/// B-SAN3-13 (R2-6, CA-24) — como cada ação da fila offline aponta para a OS. O ramo 1 da retenção casa QUALQUER
/// ação, de QUALQUER tipo, por qualquer uma destas chaves — a tabela abaixo não decide a retenção, ela PROVA que
/// toda família conhecida está coberta: o teste-guarda F24 lê `api_contracts.dart` e falha se nascer um tipo de
/// ação sem classificação aqui, ou se uma chave classificada não estiver nas chaves do ramo 1.
const workOrderLocalReferenceKeys = <String>{'local_id', 'work_order_local_id'};
const workOrderServerReferenceKeys = <String>{
  'server_id',
  'work_order_id',
  'work_order_server_id',
};

/// Ciclo 2 (C2-02, RQ-2) — as chaves pelas quais TODA ação de vistoria refere o run: os 7 produtores de
/// `ChecklistSyncActionTypes` gravam `local_run_id` (e `server_run_id` quando já baixado) e o replay resolve o run
/// por elas. O ramo 4 do gancho as LÊ (ação pendente de um run da OS retém a OS).
const workOrderRunReferenceKeys = <String>{'local_run_id', 'server_run_id'};

/// Classificação de toda constante de `*SyncActionTypes`: as chaves pelas quais a ação refere a OS (ramo 1), ou
/// as chaves do run (vistoria — a OS vem por `checklist_runs`, ramo 4), ou vazio (não refere OS).
const workOrderActionReferenceKeys = <String, Set<String>>{
  // WorkOrderSyncActionTypes — `local_id` + `server_id` (M21).
  'work_order.status_update': {'local_id', 'server_id'},
  'work_order.create': {'local_id'},
  'work_order.approval_request': {'local_id', 'server_id'},
  'work_order.evidence_attach': {'local_id', 'server_id'},
  'work_order.unable_to_start': {'local_id', 'server_id'},
  'work_order.assign': {'local_id', 'server_id'},
  // EvidenceSyncActionTypes — as de OS por `work_order_id` (serverId); as de campo não referem OS.
  'evidence.work_order_photo': {'work_order_id'},
  'evidence.work_order_signature': {'work_order_id'},
  'evidence.work_order_observation': {'work_order_id'},
  'evidence.field_photo': {},
  'evidence.field_signature': {},
  'evidence.field_observation': {},
  // InventorySyncActionTypes — material do prestador por `work_order_local_id` (R2-6); saída por `work_order_id`.
  'work_order_material.add': {'work_order_local_id'},
  'inventory_exit.create': {'work_order_id'},
  'inventory_entry.create': {},
  // ChecklistSyncActionTypes — pela vistoria (`local_run_id`/`server_run_id` → `checklist_runs.work_order_id`):
  // ramo 4.
  'checklist_run.create': workOrderRunReferenceKeys,
  'checklist_answer.upsert': workOrderRunReferenceKeys,
  'checklist_run.complete': workOrderRunReferenceKeys,
  'checklist_marker.create': workOrderRunReferenceKeys,
  'checklist_divergence.create': workOrderRunReferenceKeys,
  'checklist_acknowledgement.create': workOrderRunReferenceKeys,
  'checklist_attachment.attach': workOrderRunReferenceKeys,
  // ExpenseSyncActionTypes — despesa não refere OS.
  'expense_report.create': {},
  'expense_item.create': {},
  'expense_report.submit': {},
  'expense_receipt.attach': {},
};

const _pendingActionStatuses = <SyncStatus>{
  SyncStatus.pending,
  SyncStatus.syncing,
  SyncStatus.failed,
  SyncStatus.conflict,
};

const _blobStillOnDeviceUploadStatuses = <SyncStatus>{
  SyncStatus.pending,
  SyncStatus.failed,
  SyncStatus.conflict,
};

class WorkOrderRepository extends ChangeNotifier {
  WorkOrderRepository({
    required BootstrapSession session,
    required SyncQueueRepository syncQueue,
    required SyncActionFactory actionFactory,
    required WorkOrderLocalStore localStore,
    List<WorkOrder> seedWorkOrders = const [],
    WorkOrderRemoteApi? remoteApi,
    EvidenceBlobStore? evidenceBlobStore,
    ServiceRefusalTelemetryHook? onServiceRefusalTelemetry,
    bool allowSeedOrders = true,
    WorkOrderExternalPendingWork? hasExternalPendingWork,
  }) : _session = session,
       _allowSeedOrders = allowSeedOrders,
       _hasExternalPendingWork = hasExternalPendingWork,
       _syncQueue = syncQueue,
       _actionFactory = actionFactory,
       _localStore = localStore,
       _remoteApi = remoteApi,
       _evidenceBlobStore = evidenceBlobStore,
       _onServiceRefusalTelemetry = onServiceRefusalTelemetry,
       _orders = seedWorkOrders;

  final BootstrapSession _session;
  final SyncQueueRepository _syncQueue;
  final SyncActionFactory _actionFactory;
  final WorkOrderLocalStore _localStore;
  final WorkOrderRemoteApi? _remoteApi;
  final EvidenceBlobStore? _evidenceBlobStore;
  final ServiceRefusalTelemetryHook? _onServiceRefusalTelemetry;
  // B-SAN3-13 (Q5) — OS semente só no app de demonstração local; o provider passa `!kIsRemoteAuth`.
  final bool _allowSeedOrders;
  final WorkOrderExternalPendingWork? _hasExternalPendingWork;
  final Uuid _uuid = const Uuid();

  /// B-SAN3-13 (§2.4, CRIT-6 + R2-4) — UMA cadeia de `Future` por PROCESSO (estática): todas as instâncias do
  /// repositório — o provider troca a instância a cada sessão/token renovado, e a velha pode seguir com um pull
  /// em voo — entram na mesma fila. Dentro dela correm as 7 mutações públicas, a regra de fabricação e a
  /// reconciliação; nenhuma rede corre dentro dela (a caminhada vem antes, R17).
  // `null` = fila ociosa. Ociosa, a próxima operação corre já, sem se pendurar num `Future` antigo — que, em teste,
  // pode pertencer a uma zona que ninguém mais bombeia.
  static Future<void>? _serialTail;

  static Future<T> _serial<T>(Future<T> Function() body) async {
    final previous = _serialTail;
    final done = Completer<void>();
    final mine = done.future;
    _serialTail = mine;
    try {
      if (previous != null) await previous;
      return await body();
    } finally {
      done.complete();
      if (identical(_serialTail, mine)) _serialTail = null;
    }
  }

  List<WorkOrder> _orders;
  bool _loaded = false;
  bool _isPulling = false;
  DateTime? _lastPulledAt;
  String? _lastPullError;
  bool _lastPullIncomplete = false;

  bool get isPulling => _isPulling;

  /// B-SAN3-13 (CA-14) — a última caminhada não provou o fim (teto, backend sem `nextCursor`, API sem caminhada):
  /// nada foi tirado do aparelho e a tela mostra "dados desatualizados".
  bool get lastPullIncomplete => _lastPullIncomplete;
  DateTime? get lastPulledAt => _lastPulledAt;
  String? get lastPullError => _lastPullError;
  bool get hasRemote => _remoteApi != null;

  List<WorkOrder> get workOrders => List.unmodifiable(_orders);

  static String? _normalized(String? value) {
    final trimmed = value?.trim();
    return trimmed == null || trimmed.isEmpty ? null : trimmed;
  }

  WorkOrder? findById(String localId) {
    for (final o in _orders) {
      if (o.localId == localId) return o;
    }
    return null;
  }

  WorkOrder? findByServerId(String serverId) {
    for (final o in _orders) {
      if (o.serverId == serverId) return o;
    }
    return null;
  }

  Future<void> load({bool seedIfEmpty = true}) async {
    if (_loaded) return;

    // B-SAN3-13 (#33, Q5) — fora do app de demonstração, OS fabricada (sem `serverId` e sem criação na fila) não
    // tem lugar no aparelho: sai já no `load()`, sob a trava.
    if (!_allowSeedOrders) {
      await _serial(_purgeFabricatedOrders);
    }

    final stored = await _localStore.loadWorkOrders();
    final tenantOrders = stored
        .where((o) => o.tenantId == _session.activeTenant.tenantId)
        .toList();

    if (_allowSeedOrders &&
        stored.isEmpty &&
        seedIfEmpty &&
        _remoteApi == null) {
      // Only seed fake data in local/dev mode when the store is completely empty.
      // Never seed when other-tenant orders exist; never seed in remote mode.
      _orders = _seedOrders(_session);
      await _localStore.saveWorkOrders(_orders);
    } else {
      _orders = tenantOrders;
    }
    _loaded = true;
    notifyListeners();

    // Kick off a background pull when remote API is configured.
    if (_remoteApi != null) {
      _pullInBackground().ignore();
    }
  }

  /// Triggers a fresh pull from the remote API regardless of [_loaded] state.
  /// Returns [WorkOrderPullOutcome.pulling] in local/dev mode (no-op).
  Future<WorkOrderPullOutcome> refresh() async {
    if (_remoteApi == null) return WorkOrderPullOutcome.pulling;
    if (_isPulling) return WorkOrderPullOutcome.pulling;
    _loaded = false;
    return _pullInBackground();
  }

  Future<void> refreshLocalState() async {
    final stored = await _localStore.loadWorkOrders();
    _orders = stored
        .where((order) => order.tenantId == _session.activeTenant.tenantId)
        .toList();
    notifyListeners();
  }

  Future<WorkOrderPullOutcome> _pullInBackground() async {
    if (_isPulling) return WorkOrderPullOutcome.pulling;
    _isPulling = true;
    notifyListeners();

    try {
      // B-SAN3-13 — a caminhada (rede) corre FORA da trava; só a escrita no aparelho entra nela. API sem caminhada
      // (implementações antigas da interface) = caminhada incompleta: atualiza, nunca tira nada.
      final api = _remoteApi!;
      final tenantId = _session.activeTenant.tenantId;
      final WorkOrderFetchResult result = api is WalkingWorkOrderRemoteApi
          ? await (api as WalkingWorkOrderRemoteApi)
                .fetchAssignedOpenWorkOrders(tenantId: tenantId)
          : WorkOrderFetchResult(
              orders: await api.fetchWorkOrders(tenantId: tenantId),
              complete: false,
            );
      await _serial(
        () => result.complete
            ? _reconcile(result.orders)
            : _upsertRemoteOrders(result.orders),
      );
      _lastPullIncomplete = !result.complete;
      _lastPulledAt = DateTime.now().toUtc();
      _lastPullError = null;
      _loaded = true;
      return WorkOrderPullOutcome.success;
    } catch (e) {
      _lastPullError = e is ApiError
          ? e.safeMessage
          : 'Nao foi possivel atualizar suas ordens agora.';
      _loaded = true;
      return _orders.isEmpty
          ? WorkOrderPullOutcome.error
          : WorkOrderPullOutcome.cached;
    } finally {
      _isPulling = false;
      notifyListeners();
    }
  }

  /// Upserts remote work orders into Drift, preserving local pending changes.
  /// B-SAN3-13 — roda sob a trava e indexa o que está NO STORE (não o `_orders` da instância, que pode ser velho).
  Future<void> _upsertRemoteOrders(List<WorkOrder> remote) async {
    final tenantId = _session.activeTenant.tenantId;
    final localByServerId = <String, WorkOrder>{
      for (final o in await _localStore.loadWorkOrders())
        if (o.serverId != null && o.tenantId == tenantId) o.serverId!: o,
    };

    for (final ro in remote) {
      if (ro.serverId == null) continue;
      final existing = localByServerId[ro.serverId!];
      // Preserve local work orders with pending sync actions.
      if (existing != null && existing.syncStatus == SyncStatus.pending) {
        continue;
      }
      // Keep existing localId so cached detail routes stay valid.
      final toSave = existing != null
          ? ro.copyWith(localId: existing.localId)
          : ro;
      await _localStore.saveWorkOrder(toSave);
    }

    final refreshed = await _localStore.loadWorkOrders();
    _orders = refreshed
        .where((o) => o.tenantId == _session.activeTenant.tenantId)
        .toList();
  }

  /// B-SAN3-13 (#32/#33, plano v3 §2.3/§2.6) — depois de uma caminhada COMPLETA: o conjunto devolvido S é a verdade.
  /// Toda linha da organização ativa que não está em S sai do aparelho — OS e filhas — SALVO se tiver trabalho
  /// pendente (ação na fila, linha `pending`, blob de evidência ainda no aparelho, vistoria ou material não
  /// sincronizados), caso em que fica, com o selo que já existe, até drenar. Sob a trava; cada linha candidata é
  /// RELIDA do store imediatamente antes da decisão (nunca do `_orders`). O app não decide "aberta": nenhuma purga
  /// por status local (`isFinal`, F23).
  Future<void> _reconcile(List<WorkOrder> remote) async {
    await _upsertRemoteOrders(remote);
    final tenantId = _session.activeTenant.tenantId;
    final returned = <String>{
      for (final r in remote)
        if (r.serverId != null) r.serverId!,
    };
    final candidates = [
      for (final row in await _localStore.loadWorkOrders())
        if (row.tenantId == tenantId &&
            !(row.serverId != null && returned.contains(row.serverId)))
          row.localId,
    ];
    for (final localId in candidates) {
      final row = await _reloadRow(localId);
      if (row == null) continue;
      final actions = await _syncQueue.actionsForTenant(tenantId);
      // Ciclo 2 (C2-01, RQ-1): a fabricada sai incondicional (regra de fabricação, C2-04 mantido); a reconciliada
      // passa por duas portas — o gancho (ramos 1-5) e o predicado do próprio DELETE (linha e material), atômico.
      // `false` do store não é erro: a linha fica, com o selo, até o próximo pull.
      if (_isFabricated(row, actions)) {
        await _localStore.deleteWorkOrder(row.localId);
      } else if (!await _hasPendingWork(row, actions)) {
        await _localStore.deleteWorkOrderUnlessPending(row.localId);
      }
    }
    final refreshed = await _localStore.loadWorkOrders();
    _orders = refreshed.where((o) => o.tenantId == tenantId).toList();
  }

  /// B-SAN3-13 (#33) — a regra de fabricação: sem `serverId` e sem nenhuma ação `work_order.create` (de qualquer
  /// status) com `local_id` desta linha. São as sementes (`wo-local-1..3`, inclusive a 3ª, nascida `pending`).
  Future<void> _purgeFabricatedOrders() async {
    final tenantId = _session.activeTenant.tenantId;
    final actions = await _syncQueue.actionsForTenant(tenantId);
    for (final row in await _localStore.loadWorkOrders()) {
      if (row.tenantId == tenantId && _isFabricated(row, actions)) {
        await _localStore.deleteWorkOrder(row.localId);
      }
    }
    final refreshed = await _localStore.loadWorkOrders();
    _orders = refreshed.where((o) => o.tenantId == tenantId).toList();
  }

  Future<WorkOrder?> _reloadRow(String localId) async {
    for (final row in await _localStore.loadWorkOrders()) {
      if (row.localId == localId) return row;
    }
    return null;
  }

  static bool _isFabricated(WorkOrder row, List<SyncAction> actions) {
    final serverId = row.serverId?.trim();
    if (serverId != null && serverId.isNotEmpty) return false;
    return !actions.any(
      (a) =>
          a.type == WorkOrderSyncActionTypes.create &&
          a.payload['local_id'] == row.localId,
    );
  }

  /// B-SAN3-13 (§2.3, os 5 ramos). Qualquer um verdadeiro = a linha fica.
  Future<bool> _hasPendingWork(WorkOrder row, List<SyncAction> actions) async {
    // Ramo 1 — ação não sincronizada, de QUALQUER tipo, que aponta para esta OS por qualquer chave conhecida.
    final serverId = row.serverId?.trim();
    for (final action in actions) {
      if (!_pendingActionStatuses.contains(action.status)) continue;
      final payload = action.payload;
      final byLocal = workOrderLocalReferenceKeys.any(
        (key) => payload[key] == row.localId,
      );
      final byServer =
          serverId != null &&
          serverId.isNotEmpty &&
          workOrderServerReferenceKeys.any((key) => payload[key] == serverId);
      if (byLocal || byServer) return true;
    }
    // Ramo 2 — a linha (relida) ainda `pending`: escritor fora da trava entre gravar a linha e enfileirar, ou o
    // atualizador do replay entre o `update` da ação e o `save` da linha.
    if (row.syncStatus == SyncStatus.pending) return true;
    // Ramo 3 — blob de evidência ainda no aparelho e não enviado. Blob ausente (`LOCAL_BLOB_MISSING`) não tem o que
    // perder; evidência sem blob com o metadado já enviado também não.
    for (final evidence in await _localStore.loadEvidence(row.localId)) {
      if (evidence.localBlobRef != null &&
          _blobStillOnDeviceUploadStatuses.contains(evidence.uploadStatus) &&
          evidence.uploadErrorCode != 'LOCAL_BLOB_MISSING') {
        return true;
      }
    }
    // Ramos 4 e 5 — vistoria e materiais do prestador (tabelas de outros módulos, pelo gancho do provider).
    final external = _hasExternalPendingWork;
    if (external != null && await external(row, actions)) return true;
    return false;
  }

  // B-SAN3-13 (§2.4) — as 7 mutações públicas entram na trava estática; o corpo de cada uma é o de antes.
  Future<WorkOrderMutationResult> updateStatus(
    String localId,
    WorkOrderStatus newStatus,
  ) => _serial(() => _updateStatusLocked(localId, newStatus));

  Future<WorkOrderMutationResult> assignRegistry(
    String localId, {
    String? vehicleId,
    String? vehiclePlate,
    String? teamId,
    String? teamName,
  }) => _serial(
    () => _assignRegistryLocked(
      localId,
      vehicleId: vehicleId,
      vehiclePlate: vehiclePlate,
      teamId: teamId,
      teamName: teamName,
    ),
  );

  Future<WorkOrderMutationResult> completeWorkOrder(
    String localId, {
    required bool checklistComplete,
  }) => _serial(
    () =>
        _completeWorkOrderLocked(localId, checklistComplete: checklistComplete),
  );

  Future<WorkOrderMutationResult> createWorkOrder({
    required String title,
    required String customerName,
    required String serviceAddress,
    required WorkOrderPriority priority,
    DateTime? scheduledAt,
    String? checklistId,
  }) => _serial(
    () => _createWorkOrderLocked(
      title: title,
      customerName: customerName,
      serviceAddress: serviceAddress,
      priority: priority,
      scheduledAt: scheduledAt,
      checklistId: checklistId,
    ),
  );

  Future<SyncAction> createApprovalRequest({
    required String localId,
    required String reason,
    required String impact,
    required String urgency,
  }) => _serial(
    () => _createApprovalRequestLocked(
      localId: localId,
      reason: reason,
      impact: impact,
      urgency: urgency,
    ),
  );

  Future<WorkOrderEvidence> attachEvidence({
    required String workOrderLocalId,
    required String fileName,
    required String mimeType,
    required int sizeBytes,
    required String captureSource,
    String? checksum,
    Uint8List? bytes,
  }) => _serial(
    () => _attachEvidenceLocked(
      workOrderLocalId: workOrderLocalId,
      fileName: fileName,
      mimeType: mimeType,
      sizeBytes: sizeBytes,
      captureSource: captureSource,
      checksum: checksum,
      bytes: bytes,
    ),
  );

  Future<SyncAction> reportUnableToStart({
    required String localId,
    required String reason,
    required String note,
  }) => _serial(
    () => _reportUnableToStartLocked(
      localId: localId,
      reason: reason,
      note: note,
    ),
  );

  Future<WorkOrderMutationResult> _updateStatusLocked(
    String localId,
    WorkOrderStatus newStatus,
  ) async {
    final idx = _orders.indexWhere((o) => o.localId == localId);
    if (idx == -1) throw StateError('WorkOrder $localId not found');

    final wo = _orders[idx];
    if (!wo.status.canTransitionTo(newStatus)) {
      throw StateError('Invalid transition: ${wo.status} → $newStatus');
    }

    final now = DateTime.now().toUtc();
    final updated = wo.copyWith(
      status: newStatus,
      syncStatus: SyncStatus.pending,
      updatedAt: now,
      startedAt: newStatus == WorkOrderStatus.inService ? now : wo.startedAt,
      arrivedAt: newStatus == WorkOrderStatus.arrived ? now : wo.arrivedAt,
      completedAt: newStatus == WorkOrderStatus.completed
          ? now
          : wo.completedAt,
    );

    final action = _actionFactory.create(
      tenantId: _session.activeTenant.tenantId,
      type: WorkOrderSyncActionTypes.statusUpdate,
      payload: {
        'local_id': localId,
        if (wo.serverId != null && wo.serverId!.trim().isNotEmpty)
          'server_id': wo.serverId!.trim(),
        'new_status': newStatus.name,
        'previous_status': wo.status.name,
        'occurred_at': now.toIso8601String(),
        'message': _messageForStatus(newStatus),
      },
    );

    final timelineEvent = WorkOrderTimelineEvent(
      localId: _uuid.v4(),
      workOrderLocalId: localId,
      tenantId: _session.activeTenant.tenantId,
      eventType: WorkOrderTimelineEventType.statusChanged,
      occurredAt: now,
      fromStatus: wo.status,
      toStatus: newStatus,
      actorUserId: _session.user.userId,
    );

    _orders = List<WorkOrder>.from(_orders)..[idx] = updated;
    await _localStore.saveWorkOrder(updated);
    await _localStore.saveTimelineEvent(timelineEvent);
    await _syncQueue.enqueue(action);
    notifyListeners();

    return WorkOrderMutationResult(workOrder: updated, action: action);
  }

  /// D1 (seleção viatura/equipe): vincula viatura/equipe à OS de forma otimista
  /// (salva local + enfileira `work_order.assign`). O backend exige `operator_id`
  /// — reenviamos o operador atualmente atribuído à OS. Se a OS não tiver operador
  /// atribuído, lançamos [StateError] e NÃO enfileiramos (safe): a UI orienta a
  /// atribuir um operador antes.
  Future<WorkOrderMutationResult> _assignRegistryLocked(
    String localId, {
    String? vehicleId,
    String? vehiclePlate,
    String? teamId,
    String? teamName,
  }) async {
    final idx = _orders.indexWhere((o) => o.localId == localId);
    if (idx == -1) throw StateError('WorkOrder $localId not found');

    final wo = _orders[idx];
    final operatorId = wo.assignedUserId?.trim();
    if (operatorId == null || operatorId.isEmpty) {
      throw StateError('Atribua um operador antes de definir viatura/equipe.');
    }

    final normalizedVehicleId = _normalized(vehicleId);
    final normalizedTeamId = _normalized(teamId);

    final now = DateTime.now().toUtc();
    final updated = wo.copyWith(
      vehicleId: normalizedVehicleId,
      vehiclePlate: _normalized(vehiclePlate),
      teamId: normalizedTeamId,
      teamName: _normalized(teamName),
      syncStatus: SyncStatus.pending,
      updatedAt: now,
    );

    final payload = <String, Object?>{
      'local_id': localId,
      if (wo.serverId != null && wo.serverId!.trim().isNotEmpty)
        'server_id': wo.serverId!.trim(),
      'operator_id': operatorId,
      'occurred_at': now.toIso8601String(),
      'message': 'Mobile definiu viatura/equipe.',
    };
    if (normalizedVehicleId != null) {
      payload['vehicle_id'] = normalizedVehicleId;
    }
    if (normalizedTeamId != null) {
      payload['team_id'] = normalizedTeamId;
    }

    final action = _actionFactory.create(
      tenantId: _session.activeTenant.tenantId,
      type: WorkOrderSyncActionTypes.assign,
      payload: payload,
    );

    final timelineEvent = WorkOrderTimelineEvent(
      localId: _uuid.v4(),
      workOrderLocalId: localId,
      tenantId: _session.activeTenant.tenantId,
      eventType: WorkOrderTimelineEventType.assigned,
      occurredAt: now,
      note: 'Viatura/equipe atualizada.',
      actorUserId: _session.user.userId,
    );

    _orders = List<WorkOrder>.from(_orders)..[idx] = updated;
    await _localStore.saveWorkOrder(updated);
    await _localStore.saveTimelineEvent(timelineEvent);
    await _syncQueue.enqueue(action);
    notifyListeners();

    return WorkOrderMutationResult(workOrder: updated, action: action);
  }

  Future<WorkOrderMutationResult> _completeWorkOrderLocked(
    String localId, {
    required bool checklistComplete,
  }) async {
    final idx = _orders.indexWhere((o) => o.localId == localId);
    if (idx == -1) throw StateError('WorkOrder $localId not found');

    final wo = _orders[idx];
    if (!wo.status.canTransitionTo(WorkOrderStatus.completed)) {
      throw StateError('Invalid transition: ${wo.status} → completed');
    }

    if (wo.checklistId != null && !checklistComplete) {
      throw StateError(
        'Conclua o checklist obrigatorio antes de finalizar a OS.',
      );
    }

    final now = DateTime.now().toUtc();
    final updated = wo.copyWith(
      status: WorkOrderStatus.completed,
      syncStatus: SyncStatus.pending,
      completedAt: now,
      updatedAt: now,
    );

    final action = _actionFactory.create(
      tenantId: _session.activeTenant.tenantId,
      type: WorkOrderSyncActionTypes.statusUpdate,
      payload: {
        'local_id': localId,
        if (wo.serverId != null && wo.serverId!.trim().isNotEmpty)
          'server_id': wo.serverId!.trim(),
        'new_status': WorkOrderStatus.completed.name,
        'previous_status': wo.status.name,
        'occurred_at': now.toIso8601String(),
        'message': 'Mobile completed work order.',
      },
    );

    final timelineEvent = WorkOrderTimelineEvent(
      localId: _uuid.v4(),
      workOrderLocalId: localId,
      tenantId: _session.activeTenant.tenantId,
      eventType: WorkOrderTimelineEventType.completed,
      occurredAt: now,
      actorUserId: _session.user.userId,
    );

    _orders = List<WorkOrder>.from(_orders)..[idx] = updated;
    await _localStore.saveWorkOrder(updated);
    await _localStore.saveTimelineEvent(timelineEvent);
    await _syncQueue.enqueue(action);
    notifyListeners();

    return WorkOrderMutationResult(workOrder: updated, action: action);
  }

  Future<WorkOrderMutationResult> _createWorkOrderLocked({
    required String title,
    required String customerName,
    required String serviceAddress,
    required WorkOrderPriority priority,
    DateTime? scheduledAt,
    String? checklistId,
  }) async {
    final now = DateTime.now().toUtc();
    final localId = 'wo-local-${_uuid.v4()}';
    final code = 'OS-local-${_orders.length + 1}';

    final wo = WorkOrder(
      localId: localId,
      tenantId: _session.activeTenant.tenantId,
      code: code,
      title: title,
      customerName: customerName,
      serviceAddress: serviceAddress,
      status: WorkOrderStatus.scheduled,
      priority: priority,
      syncStatus: SyncStatus.pending,
      createdAt: now,
      scheduledAt: scheduledAt,
      checklistId: checklistId,
    );

    final action = _actionFactory.create(
      tenantId: _session.activeTenant.tenantId,
      type: WorkOrderSyncActionTypes.create,
      payload: {
        'local_id': localId,
        'code': code,
        'title': title,
        'customer_name': customerName,
        'service_address': serviceAddress,
        'priority': priority.name,
        'scheduled_at': scheduledAt?.toIso8601String(),
        'checklist_id': checklistId,
        'created_at': now.toIso8601String(),
      },
    );

    final timelineEvent = WorkOrderTimelineEvent(
      localId: _uuid.v4(),
      workOrderLocalId: localId,
      tenantId: _session.activeTenant.tenantId,
      eventType: WorkOrderTimelineEventType.created,
      occurredAt: now,
      actorUserId: _session.user.userId,
    );

    _orders = [..._orders, wo];
    await _localStore.saveWorkOrder(wo);
    await _localStore.saveTimelineEvent(timelineEvent);
    await _syncQueue.enqueue(action);
    notifyListeners();

    return WorkOrderMutationResult(workOrder: wo, action: action);
  }

  Future<SyncAction> _createApprovalRequestLocked({
    required String localId,
    required String reason,
    required String impact,
    required String urgency,
  }) async {
    if (reason.trim().isEmpty) {
      throw ArgumentError.value(reason, 'reason', 'reason is required');
    }

    final wo = findById(localId);
    if (wo == null) throw StateError('WorkOrder $localId not found');

    final now = DateTime.now().toUtc();
    final action = _actionFactory.create(
      tenantId: _session.activeTenant.tenantId,
      type: WorkOrderSyncActionTypes.approvalRequest,
      payload: {
        'local_id': localId,
        'server_id': wo.serverId,
        'reason': reason,
        'impact': impact,
        'urgency': urgency,
        'requested_at': now.toIso8601String(),
        'requested_by_user_id': _session.user.userId,
      },
    );

    final timelineEvent = WorkOrderTimelineEvent(
      localId: _uuid.v4(),
      workOrderLocalId: localId,
      tenantId: _session.activeTenant.tenantId,
      eventType: WorkOrderTimelineEventType.approvalRequested,
      occurredAt: now,
      note: reason,
      actorUserId: _session.user.userId,
    );

    await _localStore.saveTimelineEvent(timelineEvent);
    await _syncQueue.enqueue(action);
    notifyListeners();

    return action;
  }

  /// Timeline do detalhe/check-in: quando ha API e id de servidor, busca o
  /// historico real (GET /work-orders/:id/timeline). Em falha de rede/timeout
  /// ou 404/403 (ApiError), cai de forma segura para o cache local — sem
  /// quebrar a tela e sem stack trace.
  /// Registra que a linha do tempo remota falhou e o app caiu para o histórico local.
  /// Só identificador e motivo seguro — nunca corpo de resposta, token ou caminho (§2.8).
  void _avisarFalhaDeTimeline(String serverId, String motivoSeguro) {
    debugPrint(
      '[work-orders] linha do tempo remota indisponível para $serverId '
      '($motivoSeguro) — exibindo o histórico local, que pode estar incompleto.',
    );
  }

  Future<List<WorkOrderTimelineEvent>> loadTimeline(String localId) async {
    final remote = _remoteApi;
    if (remote != null) {
      String? serverId;
      for (final order in _orders) {
        if (order.localId == localId) {
          serverId = order.serverId;
          break;
        }
      }
      if (serverId != null && serverId.isNotEmpty) {
        try {
          final events = await remote.fetchTimeline(serverId);
          if (events.isNotEmpty) return events;
        } on ApiError catch (e) {
          // Falha segura — mantém o histórico local. Mas NÃO em silêncio: este `catch` escondeu por
          // completo o fato de a linha do tempo remota nunca ter funcionado (envelope, nomes de campo
          // e vocabulário de tipo divergiam do backend). A tela parecia saudável exibindo um histórico
          // truncado. O aviso usa a mensagem SEGURA do erro (§2.8: sem token, caminho ou payload).
          _avisarFalhaDeTimeline(serverId, e.safeMessage);
        } catch (e) {
          _avisarFalhaDeTimeline(serverId, e.runtimeType.toString());
        }
      }
    }
    return _localStore.loadTimeline(localId);
  }

  Future<WorkOrderEvidence> _attachEvidenceLocked({
    required String workOrderLocalId,
    required String fileName,
    required String mimeType,
    required int sizeBytes,
    required String captureSource,
    String? checksum,
    Uint8List? bytes,
  }) async {
    final wo = findById(workOrderLocalId);
    if (wo == null) throw StateError('WorkOrder $workOrderLocalId not found');
    if (wo.tenantId != _session.activeTenant.tenantId) {
      throw StateError('Tenant mismatch');
    }
    if (sizeBytes <= 0 || sizeBytes > 10 * 1024 * 1024) {
      throw ArgumentError.value(
        sizeBytes,
        'sizeBytes',
        'Invalid evidence size',
      );
    }
    if (bytes != null && bytes.length != sizeBytes) {
      throw ArgumentError.value(
        bytes.length,
        'bytes',
        'Evidence size mismatch',
      );
    }

    final now = DateTime.now().toUtc();
    final trimmedChecksum = checksum?.trim();
    final normalizedChecksum =
        trimmedChecksum != null && trimmedChecksum.isNotEmpty
        ? trimmedChecksum
        : (bytes == null ? null : sha256.convert(bytes).toString());
    final localBlobRef = bytes == null || _evidenceBlobStore == null
        ? null
        : await _evidenceBlobStore.save(bytes, contentType: mimeType);
    final evidenceLocalId = 'woevid-local-${_uuid.v4()}';
    final evidence = WorkOrderEvidence(
      localId: evidenceLocalId,
      workOrderLocalId: workOrderLocalId,
      tenantId: _session.activeTenant.tenantId,
      fileName: fileName,
      mimeType: mimeType,
      sizeBytes: sizeBytes,
      captureSource: captureSource,
      checksum: normalizedChecksum != null && normalizedChecksum.isNotEmpty
          ? normalizedChecksum
          : null,
      syncStatus: SyncStatus.pending,
      uploadStatus: SyncStatus.pending,
      localBlobRef: localBlobRef,
      createdAt: now,
    );

    await _localStore.saveEvidence(evidence);

    final action = _actionFactory.create(
      tenantId: _session.activeTenant.tenantId,
      type: EvidenceSyncActionTypes.workOrderPhoto,
      clientActionId: evidenceLocalId,
      payload: {
        'local_evidence_id': evidenceLocalId,
        if (wo.serverId != null && wo.serverId!.trim().isNotEmpty)
          'work_order_id': wo.serverId!.trim(),
        'kind': 'photo',
        'file_name': fileName,
        'content_type': mimeType,
        'size_bytes': sizeBytes,
        if (normalizedChecksum != null && normalizedChecksum.isNotEmpty)
          'sha256': normalizedChecksum,
      },
    );
    await _syncQueue.enqueue(action);
    notifyListeners();
    return evidence;
  }

  Future<List<WorkOrderEvidence>> loadEvidence(String workOrderLocalId) =>
      _localStore.loadEvidence(workOrderLocalId);

  Future<SyncAction> _reportUnableToStartLocked({
    required String localId,
    required String reason,
    required String note,
  }) async {
    final wo = findById(localId);
    if (wo == null) throw StateError('WorkOrder $localId not found');

    final now = DateTime.now().toUtc();
    final action = _actionFactory.create(
      tenantId: _session.activeTenant.tenantId,
      type: WorkOrderSyncActionTypes.unableToStart,
      payload: {
        'local_id': localId,
        if (wo.serverId != null && wo.serverId!.trim().isNotEmpty)
          'server_id': wo.serverId!.trim(),
        'reason': reason,
        'note': note,
        'occurred_at': now.toIso8601String(),
        'reported_by_user_id': _session.user.userId,
      },
    );

    final timelineEvent = WorkOrderTimelineEvent(
      localId: _uuid.v4(),
      workOrderLocalId: localId,
      tenantId: _session.activeTenant.tenantId,
      eventType: WorkOrderTimelineEventType.exceptionRaised,
      occurredAt: now,
      note: '$reason: $note',
      actorUserId: _session.user.userId,
    );

    await _localStore.saveTimelineEvent(timelineEvent);
    await _syncQueue.enqueue(action);

    // Ω4C PR-13 — trilha de telemetria: SERVICE_REFUSAL no ponto EXATO da recusa
    // (D-Ω4C-TELE-FLUTTER-EVENTS). Best-effort e ISOLADO: uma falha de telemetria
    // nunca derruba a recusa. `workOrderId` = serverId REAL (nunca id local) —
    // a validação de UUID fica no serviço de telemetria.
    final hook = _onServiceRefusalTelemetry;
    if (hook != null) {
      try {
        await hook(
          tenantId: _session.activeTenant.tenantId,
          workOrderServerId: wo.serverId,
          reason: reason,
        );
      } catch (_) {
        // Telemetria de recusa nunca bloqueia o fluxo de OS.
      }
    }

    notifyListeners();
    return action;
  }
}

// Providers

final workOrderLocalStoreProvider = Provider<WorkOrderLocalStore>(
  (ref) => DriftWorkOrderLocalStore(ref.watch(appDatabaseProvider)),
);

// Returns DioWorkOrderRemoteApi when ERP_AUTH_MODE=remote and a token is available.
// Returns null in local/dev mode so WorkOrderRepository stays in seed-only mode.
final workOrderRemoteApiProvider = Provider<WorkOrderRemoteApi?>((ref) {
  if (!kIsRemoteAuth) return null;
  final config = ref.watch(authenticatedApiConfigProvider);
  if (config.accessToken == null) return null;
  return DioWorkOrderRemoteApi.create(config);
});

final workOrderRepositoryProvider = Provider<WorkOrderRepository>((ref) {
  final session = ref
      .watch(bootstrapSessionProvider)
      .maybeWhen(data: (v) => v, orElse: () => devBootstrapSession);

  return WorkOrderRepository(
    session: session,
    syncQueue: ref.watch(syncQueueRepositoryProvider),
    actionFactory: ref.watch(syncActionFactoryProvider),
    localStore: ref.watch(workOrderLocalStoreProvider),
    remoteApi: ref.watch(workOrderRemoteApiProvider),
    evidenceBlobStore: ref.watch(evidenceBlobStoreProvider),
    // B-SAN3-13 (Q5) — sementes só no app de demonstração local.
    allowSeedOrders: !kIsRemoteAuth,
    // B-SAN3-13 (§2.3 ramos 4 e 5) — vistoria e materiais do prestador moram em tabelas de outros módulos, que este
    // bloco só LÊ. Lidos na hora (não no build do provider); falha de leitura = RETÉM (fail-closed: na dúvida, a
    // OS fica no aparelho).
    hasExternalPendingWork: buildWorkOrderExternalPendingWork(
      checklistStore: () => ref.read(checklistLocalStoreProvider),
      prestadorStore: () => ref.read(prestadorLocalStoreProvider),
    ),
    // Ω4C PR-13 — a recusa de serviço alimenta a trilha de telemetria.
    onServiceRefusalTelemetry:
        ({
          required String tenantId,
          required String? workOrderServerId,
          required String reason,
        }) async {
          await ref
              .read(telemetryCaptureServiceProvider)
              .recordServiceRefusal(
                tenantId: tenantId,
                workOrderServerId: workOrderServerId,
                reason: reason,
              );
        },
  );
});

/// B-SAN3-13 (§2.3 ramos 4 e 5) — vistoria e materiais do prestador moram em tabelas de outros módulos, que este
/// bloco só LÊ. Os stores são obtidos na hora (não no build do provider). Falha de leitura = RETÉM (fail-closed: na
/// dúvida, a OS fica no aparelho).
///
/// Ramo 4, completo no ciclo 2 (C2-02, RQ-2) — para cada run da OS: (a) run não sincronizado; (b) ação da fila
/// ainda não sincronizada (pending/syncing/failed/conflict) que aponta para o run por `local_run_id` ou
/// `server_run_id` — os 7 tipos de vistoria; (c) marcador ou ciência gravados e ainda não sincronizados (a janela
/// gravar→enfileirar do próprio `ChecklistRepository`); (d) anexo com binário ainda por subir. Qualquer um = fica.
WorkOrderExternalPendingWork buildWorkOrderExternalPendingWork({
  required ChecklistLocalStore Function() checklistStore,
  required PrestadorLocalStore Function() prestadorStore,
}) {
  return (order, actions) async {
    try {
      final checklists = checklistStore();
      final runLocalIds = <String>{};
      final runServerIds = <String>{};
      for (final key in {order.serverId, order.localId}.whereType<String>()) {
        for (final run in await checklists.loadRunsForWorkOrder(key)) {
          // (a)
          if (run.syncStatus != SyncStatus.synced) return true;
          runLocalIds.add(run.localId);
          final runServerId = run.serverId;
          if (runServerId != null && runServerId.isNotEmpty) {
            runServerIds.add(runServerId);
          }
          // (c)
          final markers = await checklists.loadMarkers(run.localId);
          if (markers.any((m) => m.syncStatus != SyncStatus.synced)) {
            return true;
          }
          final ack = await checklists.loadAcknowledgement(run.localId);
          if (ack != null && ack.syncStatus != SyncStatus.synced) return true;
        }
      }
      if (runLocalIds.isNotEmpty) {
        // (b)
        for (final action in actions) {
          if (!_pendingActionStatuses.contains(action.status)) continue;
          final payload = action.payload;
          if (runLocalIds.contains(payload['local_run_id']) ||
              runServerIds.contains(payload['server_run_id'])) {
            return true;
          }
        }
        // (d)
        final runIds = {...runLocalIds, ...runServerIds};
        final attachments = await checklists.loadAttachmentsPendingUpload();
        if (attachments.any((a) => runIds.contains(a.runId))) return true;
      }
      final materials = await prestadorStore().loadMaterials(order.localId);
      return materials.any((m) => m.syncStatus != SyncStatus.synced);
    } catch (_) {
      return true;
    }
  };
}

String _messageForStatus(WorkOrderStatus status) {
  return switch (status) {
    WorkOrderStatus.dispatched => 'Mobile accepted dispatch.',
    WorkOrderStatus.enRoute => 'Mobile technician en route.',
    WorkOrderStatus.arrived => 'Mobile arrived on site.',
    WorkOrderStatus.inService => 'Mobile started work order.',
    WorkOrderStatus.paused => 'Mobile paused work order.',
    WorkOrderStatus.pendingApproval => 'Mobile requested approval.',
    WorkOrderStatus.completed => 'Mobile completed work order.',
    WorkOrderStatus.cancelled => 'Mobile cancelled work order.',
    _ => 'Mobile updated work order status.',
  };
}

List<WorkOrder> _seedOrders(BootstrapSession session) {
  final tenantId = session.activeTenant.tenantId;
  final now = DateTime.utc(2026, 6, 11);
  return [
    WorkOrder(
      localId: 'wo-local-1',
      tenantId: tenantId,
      code: 'OS-1042',
      title: 'Instalacao de ar-condicionado',
      customerName: 'Cliente Demo Ltda',
      serviceAddress: 'Av. Paulista, 1000 - Sao Paulo',
      status: WorkOrderStatus.inService,
      priority: WorkOrderPriority.high,
      assignedUserId: session.user.userId,
      scheduledAt: now,
      startedAt: now,
      syncStatus: SyncStatus.synced,
      createdAt: now,
      checklistId: 'cl-seed-1',
    ),
    WorkOrder(
      localId: 'wo-local-2',
      tenantId: tenantId,
      code: 'OS-1043',
      title: 'Manutencao preventiva de bomba hidraulica',
      customerName: 'Industria Exemplo SA',
      serviceAddress: 'Rua das Industrias, 500 - Santo Andre',
      status: WorkOrderStatus.scheduled,
      priority: WorkOrderPriority.normal,
      scheduledAt: now.add(const Duration(days: 1)),
      syncStatus: SyncStatus.synced,
      createdAt: now,
    ),
    WorkOrder(
      localId: 'wo-local-3',
      tenantId: tenantId,
      code: 'OS-1044',
      title: 'Reparo de painel eletrico',
      customerName: 'Condominio Torres Verde',
      serviceAddress: 'Rua Verde, 200 - Campinas',
      status: WorkOrderStatus.pendingApproval,
      priority: WorkOrderPriority.critical,
      assignedUserId: session.user.userId,
      syncStatus: SyncStatus.pending,
      createdAt: now,
    ),
  ];
}
