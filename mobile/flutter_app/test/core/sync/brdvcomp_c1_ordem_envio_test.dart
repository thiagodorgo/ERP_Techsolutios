// B-RDV-COMPROVANTE · conserto c1 do #525 (§2(c), §12.6 e §13.1 do plano do conserto) — quem segura o envio
// do relatório e a ordem do passe de despesa: lote → comprovantes → lote (`runExpenseSyncPass`).
//
// Real do produto: `SyncReplayService` (o lote, com `_prepareForBackend` e o predicado), `ExpenseReceiptSyncService`
// (o upload), `InMemorySyncQueueRepository`, `LocalExpenseRepository` e `InMemoryEvidenceBlobStore`. Fingido: só o
// servidor (o lote responde `processed`; o upload responde como o servidor real — replay antes da editabilidade,
// relatório enviado → 422 antes do 503).
//
// RR-C.1 — ordem no mesmo passe (C2-DP-02, `TOPO_422`): o envio só sai DEPOIS do upload; o comprovante sobe, o blob
//          morre só no `uploaded`, e o envio sai no MESMO passe.
// RR-C.2 — recusado não segura (§12.6 L2): o comprovante em `conflict` (415) não prende o envio, e o blob fica.
// RR-C.3 — offline: sem sessão ou sem rede nada sai, as duas ações ficam na fila, o adiamento não gasta tentativa.
import 'dart:typed_data';

import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/evidence/evidence_blob_store.dart';
import 'package:erp_techsolutions_mobile/core/network/api_contracts.dart';
import 'package:erp_techsolutions_mobile/core/network/api_error.dart';
import 'package:erp_techsolutions_mobile/core/permissions/permission_resolver.dart';
import 'package:erp_techsolutions_mobile/core/sync/expense_receipt_sync.dart';
import 'package:erp_techsolutions_mobile/core/sync/expense_sync_pass.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_factory.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_repository.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_replay_service.dart';
import 'package:erp_techsolutions_mobile/features/expenses/data/expense_local_store.dart';
import 'package:erp_techsolutions_mobile/features/expenses/data/expense_repository.dart';
import 'package:erp_techsolutions_mobile/features/expenses/data/expense_sync_entity_updater.dart';
import 'package:erp_techsolutions_mobile/features/expenses/domain/expense_models.dart';
import 'package:flutter_test/flutter_test.dart';

const _tenant = 'tenant-demo';

// ───────────────────────────── servidor fingido ─────────────────────────────

class _Server {
  final Map<String, String> label = {}; // id de servidor do relatório → 'A'/'B'
  final Map<String, String> status =
      {}; // id de servidor do relatório → draft/submitted
  final Map<String, String> stored = {}; // client_action_id → receiptId
  final Map<String, int> refuseWith =
      {}; // client_action_id → status de recusa/indisponível do servidor
  final List<String> timeline = [];
  int pass = 0;
  bool networkDown = false;
  int _seq = 0;

  Future<ExpenseReceiptUploadResponse> upload(
    ExpenseReceiptUploadRequest request,
  ) async {
    if (networkDown) throw const ApiNetworkError();
    final rel = label[request.reportServerId] ?? '?';
    final known = stored[request.clientActionId];
    if (known != null) {
      timeline.add('p$pass upload:$rel:200');
      return ExpenseReceiptUploadResponse(
        receiptId: known,
        uploadStatus: 'uploaded',
      );
    }
    if (status[request.reportServerId] == 'submitted') {
      timeline.add('p$pass upload:$rel:422');
      throw const ApiServerError(statusCode: 422);
    }
    final refused = refuseWith[request.clientActionId];
    if (refused != null) {
      timeline.add('p$pass upload:$rel:$refused');
      throw ApiServerError(statusCode: refused);
    }
    final id = 'receipt-server-${++_seq}';
    stored[request.clientActionId] = id;
    timeline.add('p$pass upload:$rel:201');
    return ExpenseReceiptUploadResponse(
      receiptId: id,
      uploadStatus: 'uploaded',
    );
  }

  List<SyncActionResult> batch(List<SyncAction> actions) {
    if (networkDown) throw const ApiNetworkError();
    return [
      for (final action in actions)
        if (action.type == ExpenseSyncActionTypes.reportSubmit)
          _submit(action)
        else
          SyncActionResult(
            clientActionId: action.clientActionId,
            status: 'processed',
            resultRef: 'srv-${action.clientActionId}',
          ),
    ];
  }

  SyncActionResult _submit(SyncAction action) {
    final reportId = action.payload['report_id'] as String;
    status[reportId] = 'submitted';
    timeline.add('p$pass submit:${label[reportId]}');
    return SyncActionResult(
      clientActionId: action.clientActionId,
      status: 'processed',
      resultRef: reportId,
    );
  }
}

class _UploadApi implements ExpenseReceiptUploadApi {
  _UploadApi(this._server);
  final _Server _server;

  @override
  Future<ExpenseReceiptUploadResponse> upload(
    ExpenseReceiptUploadRequest request,
  ) => _server.upload(request);
}

// ───────────────────────────── cenário ─────────────────────────────

class _Scene {
  _Scene(this.queue, this.repository, this.blobs, this.server);

  final InMemorySyncQueueRepository queue;
  final LocalExpenseRepository repository;
  final InMemoryEvidenceBlobStore blobs;
  final _Server server;
  final Map<String, String> reportLocalId = {}; // 'A' → id local do relatório
  final Map<String, String> receiptAction =
      {}; // 'A' → client_action_id do comprovante
  final Map<String, String> submitAction =
      {}; // 'A' → client_action_id do envio
  final Map<String, String> blobRef = {};

  SyncReplayService replay({ExpenseSyncBatchApi? api}) => SyncReplayService(
    queue: queue,
    api: api ?? CaptureBatchApi(server.batch),
    supportedActionTypes: ExpenseSyncActionTypes.backendSupported,
    entityUpdater: buildExpenseSyncEntityUpdater(repository),
    serverIdForReport: repository.serverIdForReport,
  );

  ExpenseReceiptSyncService receipts({ExpenseReceiptUploadApi? api}) =>
      ExpenseReceiptSyncService(
        queue: queue,
        repository: repository,
        blobStore: blobs,
        api: api ?? _UploadApi(server),
      );

  Future<void> pass({
    ExpenseSyncBatchApi? batchApi,
    ExpenseReceiptUploadApi? uploadApi,
  }) async {
    server.pass += 1;
    await runExpenseSyncPass(
      _tenant,
      replay: replay(api: batchApi),
      receipts: () => receipts(api: uploadApi),
    );
  }

  Future<SyncAction> action(String clientActionId) async =>
      (await queue.actionsForTenant(
        _tenant,
      )).singleWhere((a) => a.clientActionId == clientActionId);
}

/// Relatório e item já sincronizados num lote anterior; o técnico anexa o comprovante e envia offline.
Future<_Scene> _scene({List<String> reports = const ['A']}) async {
  final queue = InMemorySyncQueueRepository();
  final blobs = InMemoryEvidenceBlobStore();
  final repository = LocalExpenseRepository(
    session: _session(),
    syncQueue: queue,
    actionFactory: SyncActionFactory(),
    localStore: InMemoryExpenseLocalStore(),
    blobStore: blobs,
  );
  final scene = _Scene(queue, repository, blobs, _Server());
  for (final rel in reports) {
    final created = await repository.createReport(
      title: 'Viagem $rel',
      advanceAmount: 0,
    );
    final reportLocalId = created.report.localId;
    final added = await repository.addItem(
      reportId: reportLocalId,
      categoryId: 'fuel',
      amount: 50,
      city: 'Campinas',
      vendorName: 'Posto $rel',
    );
    final itemLocalId = added.report.items.last.localId;
    final attach = await repository.attachReceiptPlaceholder(
      reportLocalId: reportLocalId,
      itemLocalId: itemLocalId,
      fileName: 'nota-$rel.jpg',
      mimeType: 'image/jpeg',
      bytes: Uint8List.fromList(List<int>.filled(32, rel.codeUnitAt(0))),
      sha256: rel.toLowerCase().codeUnitAt(0).toRadixString(16) * 32,
    );
    await repository.markReportSynced(reportLocalId, 'srv-rel-$rel');
    await repository.markItemSynced(
      reportLocalId,
      itemLocalId,
      'srv-item-$rel',
    );
    scene.server.label['srv-rel-$rel'] = rel;
    scene.server.status['srv-rel-$rel'] = 'draft';
    scene.reportLocalId[rel] = reportLocalId;
    scene.receiptAction[rel] = attach!.clientActionId;
    scene.blobRef[rel] = repository
        .receiptsForItem(reportLocalId, itemLocalId)
        .single
        .localReference!;
    for (final a in await queue.actionsForTenant(_tenant)) {
      if (a.payload['report_local_id'] == reportLocalId &&
              a.type == ExpenseSyncActionTypes.itemCreate ||
          a.payload['local_id'] == reportLocalId &&
              a.type == ExpenseSyncActionTypes.reportCreate) {
        final ref = a.type == ExpenseSyncActionTypes.reportCreate
            ? 'srv-rel-$rel'
            : 'srv-item-$rel';
        await queue.update(
          a.copyWith(
            status: SyncStatus.synced,
            payload: {...a.payload, 'result_ref': ref},
          ),
        );
      }
    }
  }
  for (final rel in reports) {
    final submitted = await repository.submitReport(scene.reportLocalId[rel]!);
    scene.submitAction[rel] = submitted.action.clientActionId;
  }
  return scene;
}

void main() {
  test(
    'RR-C.1 ordem no mesmo passe (TOPO_422): o envio só sai DEPOIS do upload; o comprovante sobe, o blob morre, e o envio sai no MESMO passe',
    () async {
      final s = await _scene();

      await s.pass();

      expect(
        s.server.timeline,
        ['p1 upload:A:201', 'p1 submit:A'],
        reason:
            'o envio do relatório tem de sair depois do upload do comprovante, no mesmo passe',
      );
      final attach = await s.action(s.receiptAction['A']!);
      expect(
        attach.status,
        SyncStatus.synced,
        reason: '${attach.lastErrorCode}',
      );
      expect(await s.blobs.load(s.blobRef['A']!), isNull);
      final submit = await s.action(s.submitAction['A']!);
      expect(submit.status, SyncStatus.synced);
    },
  );

  test(
    'RR-C.2 comprovante recusado (415) não segura o envio do relatório: o envio sai no passe e o blob fica',
    () async {
      final s = await _scene();
      s.server.refuseWith[s.receiptAction['A']!] = 415;

      await s.pass();

      expect(s.server.timeline, ['p1 upload:A:415', 'p1 submit:A']);
      final attach = await s.action(s.receiptAction['A']!);
      expect(attach.status, SyncStatus.conflict);
      expect(attach.lastErrorCode, 'RECEIPT_UNSUPPORTED_TYPE');
      expect(
        await s.blobs.load(s.blobRef['A']!),
        isNotNull,
        reason: 'recusa preserva o blob',
      );
      expect(
        (await s.action(s.submitAction['A']!)).status,
        SyncStatus.synced,
        reason: 'o recusado prendeu o envio do relatório',
      );
    },
  );

  test(
    'RR-C.3 offline: sem sessão ou sem rede nada sai; o envio e o comprovante ficam na fila; o adiamento não gasta tentativa; o relatório local continua submitted',
    () async {
      // (a) Sem sessão: o lote e o upload não chamam a rede.
      final noSession = await _scene();
      await noSession.pass(
        batchApi: const SessionlessExpenseSyncBatchApi(),
        uploadApi: const PendingExpenseReceiptUploadApi(),
      );
      expect(noSession.server.timeline, isEmpty);
      for (final id in [
        noSession.submitAction['A']!,
        noSession.receiptAction['A']!,
      ]) {
        final a = await noSession.action(id);
        expect(a.status, SyncStatus.pending, reason: a.type);
        expect(a.retryCount, 0, reason: a.type);
      }
      expect(
        noSession.repository.findReport(noSession.reportLocalId['A']!)!.status,
        ExpenseReportStatus.submitted,
      );

      // (b) Sem rede: o comprovante tenta e falha; o envio segue ADIADO, sem gastar tentativa.
      final offline = await _scene();
      offline.server.networkDown = true;
      await offline.pass();
      expect(offline.server.timeline, isEmpty);
      final submit = await offline.action(offline.submitAction['A']!);
      expect(submit.status, SyncStatus.pending);
      expect(
        submit.retryCount,
        0,
        reason: 'o adiamento do envio gastou tentativa',
      );
      final attach = await offline.action(offline.receiptAction['A']!);
      expect(attach.status, SyncStatus.failed);
      expect(await offline.blobs.load(offline.blobRef['A']!), isNotNull);
      expect(
        offline.repository.findReport(offline.reportLocalId['A']!)!.status,
        ExpenseReportStatus.submitted,
      );
    },
  );
}

BootstrapSession _session() {
  return const BootstrapSession(
    activeTenant: TenantContext(tenantId: _tenant, displayName: 'Tenant Demo'),
    user: AuthenticatedUser(
      userId: 'employee-1',
      email: 'tecnico@demo.com',
      tenantRole: 'field_technician',
      tenantRoles: ['field_technician'],
      scope: 'tenant',
    ),
    enabledModules: [],
    permissions: PermissionSet({
      'expense_report:create',
      'expense_report:read',
      'expense_report:update',
      'expense_report:submit',
    }),
    expensePolicy: ExpensePolicySnapshot(
      version: 'v1',
      categoryLimits: {'fuel': 150, 'meal': 80},
      receiptRequiredCategories: {'fuel'},
    ),
  );
}
