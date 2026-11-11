// B-RDV-COMPROVANTE · conserto c1 do #525 (§2(d)5, §12.7 do plano do conserto) — o id do item no servidor volta pelo
// `result_ref` que o lote gravou na ação `itemCreate`, NO APARELHO, sem reenvio (Q8: reenviar criaria o item no
// servidor e mudaria o total do relatório). `synced` sem `result_ref` ("Versão do gestor" ou a cascata
// `SUPERSEDED_BY_SERVER`) e item sem ação, ou com ela em conflito, vão a `conflict RECEIPT_ITEM_NOT_SYNCED`.
//
// RR-D.4 — 1 teste, 3 casos, Drift real e fila real (`PersistentSyncQueueRepository` sobre o Drift):
//          (1) `itemCreate` `synced` COM `result_ref` e item sem `serverId` (o aparelho que veio da `main`): o upload
//              sai com o id do `result_ref`, o id sobrevive a reabrir o banco, o lote não recebe `expense_item.create`;
//          (2) `ATK_GESTOR`: o `itemCreate` em conflito resolvido por `resolveConflictAction(useServer)` →
//              `RECEIPT_ITEM_NOT_SYNCED`, blob preservado, nenhum `expense_item.create`, o envio não fica preso por ele;
//          (3) a cascata `SUPERSEDED_BY_SERVER` → igual ao (2).
// RR-D.5 — item sem ação `itemCreate`, ou com ela em conflito: `RECEIPT_ITEM_NOT_SYNCED`, blob preservado, mensagem em
//          PT-BR, e o envio do relatório não fica preso pelo comprovante.
//
// O passe aqui é lote → upload → lote, com os serviços reais (`replayTenant` e `uploadTenant`): é o que
// `runExpenseSyncPass` faz, sem a liberação do 503 (que não entra nestes casos) — e assim o arquivo também roda no
// objeto, para o vermelho-controle ser de comportamento.
import 'dart:typed_data';

import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/evidence/evidence_blob_store.dart';
import 'package:erp_techsolutions_mobile/core/local_db/app_database.dart';
import 'package:erp_techsolutions_mobile/core/local_db/drift_expense_local_store.dart';
import 'package:erp_techsolutions_mobile/core/local_db/drift_sync_action_store.dart';
import 'package:erp_techsolutions_mobile/core/network/api_contracts.dart';
import 'package:erp_techsolutions_mobile/core/permissions/permission_resolver.dart';
import 'package:erp_techsolutions_mobile/core/sync/expense_receipt_sync.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_factory.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_conflict_resolver.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_repository.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_replay_service.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_resolution_side_effects.dart';
import 'package:erp_techsolutions_mobile/features/expenses/data/expense_local_store.dart';
import 'package:erp_techsolutions_mobile/features/expenses/data/expense_repository.dart';
import 'package:erp_techsolutions_mobile/features/expenses/data/expense_sync_entity_updater.dart';
import 'package:erp_techsolutions_mobile/features/expenses/domain/expense_models.dart';
import 'package:flutter_test/flutter_test.dart';

const _tenant = 'tenant-demo';
const _notSyncedText =
    'O item deste comprovante não chegou ao servidor; o comprovante ficou no aparelho.';

class _Server {
  final List<List<String>> batches = [];
  final List<ExpenseReceiptUploadRequest> uploads = [];
  int _seq = 0;

  List<SyncActionResult> batch(List<SyncAction> actions) {
    batches.add([for (final a in actions) a.type]);
    return [
      for (final a in actions)
        SyncActionResult(
          clientActionId: a.clientActionId,
          status: 'processed',
          resultRef: a.type == ExpenseSyncActionTypes.reportSubmit
              ? a.payload['report_id'] as String?
              : 'srv-${a.clientActionId}',
        ),
    ];
  }

  bool get sentItemCreate =>
      batches.any((b) => b.contains(ExpenseSyncActionTypes.itemCreate));
}

class _UploadApi implements ExpenseReceiptUploadApi {
  _UploadApi(this._server);
  final _Server _server;

  @override
  Future<ExpenseReceiptUploadResponse> upload(
    ExpenseReceiptUploadRequest request,
  ) async {
    _server.uploads.add(request);
    return ExpenseReceiptUploadResponse(
      receiptId: 'receipt-server-${++_server._seq}',
      uploadStatus: 'uploaded',
    );
  }
}

class _Scene {
  _Scene({
    required this.queue,
    required this.store,
    required this.repository,
    required this.blobs,
  });

  final SyncQueueRepository queue;
  final ExpenseLocalStore store;
  final LocalExpenseRepository repository;
  final InMemoryEvidenceBlobStore blobs;
  final _Server server = _Server();
  late String reportLocalId;
  late String itemLocalId;
  late String receiptAction;
  late String blobRef;
  String? submitAction;

  /// Lote → upload → lote, com os serviços reais.
  Future<void> pass() async {
    final replay = SyncReplayService(
      queue: queue,
      api: CaptureBatchApi(server.batch),
      supportedActionTypes: ExpenseSyncActionTypes.backendSupported,
      entityUpdater: buildExpenseSyncEntityUpdater(repository),
      serverIdForReport: repository.serverIdForReport,
    );
    final receipts = ExpenseReceiptSyncService(
      queue: queue,
      repository: repository,
      blobStore: blobs,
      api: _UploadApi(server),
    );
    await replay.replayTenant(_tenant);
    try {
      await receipts.uploadTenant(_tenant);
    } catch (_) {}
    await replay.replayTenant(_tenant);
  }

  Future<SyncAction> action(String clientActionId) async =>
      (await queue.actionsForTenant(
        _tenant,
      )).singleWhere((a) => a.clientActionId == clientActionId);

  Future<SyncAction> itemCreateAction() async => (await queue.actionsForTenant(
    _tenant,
  )).singleWhere((a) => a.type == ExpenseSyncActionTypes.itemCreate);
}

LocalExpenseRepository _repository(
  ExpenseLocalStore store,
  SyncQueueRepository queue,
  InMemoryEvidenceBlobStore blobs,
) => LocalExpenseRepository(
  session: _session(),
  syncQueue: queue,
  actionFactory: SyncActionFactory(),
  localStore: store,
  blobStore: blobs,
);

/// Relatório já criado no servidor; item local com a ação `itemCreate` na fila; comprovante anexado; envio offline.
Future<_Scene> _scene({
  required SyncQueueRepository queue,
  required ExpenseLocalStore store,
  bool submit = true,
}) async {
  final blobs = InMemoryEvidenceBlobStore();
  final repository = _repository(store, queue, blobs);
  final s = _Scene(
    queue: queue,
    store: store,
    repository: repository,
    blobs: blobs,
  );
  final created = await repository.createReport(
    title: 'Viagem',
    advanceAmount: 0,
  );
  s.reportLocalId = created.report.localId;
  final added = await repository.addItem(
    reportId: s.reportLocalId,
    categoryId: 'fuel',
    amount: 50,
    city: 'Campinas',
    vendorName: 'Posto',
  );
  s.itemLocalId = added.report.items.last.localId;
  final attach = await repository.attachReceiptPlaceholder(
    reportLocalId: s.reportLocalId,
    itemLocalId: s.itemLocalId,
    fileName: 'nota.jpg',
    mimeType: 'image/jpeg',
    bytes: Uint8List.fromList(List<int>.filled(32, 7)),
    sha256: 'a' * 64,
  );
  s.receiptAction = attach!.clientActionId;
  s.blobRef = repository
      .receiptsForItem(s.reportLocalId, s.itemLocalId)
      .single
      .localReference!;
  await repository.markReportSynced(s.reportLocalId, 'srv-rel-1');
  final reportCreate = (await queue.actionsForTenant(
    _tenant,
  )).singleWhere((a) => a.type == ExpenseSyncActionTypes.reportCreate);
  await queue.update(
    reportCreate.copyWith(
      status: SyncStatus.synced,
      payload: {...reportCreate.payload, 'result_ref': 'srv-rel-1'},
    ),
  );
  if (submit) {
    final submitted = await repository.submitReport(s.reportLocalId);
    s.submitAction = submitted.action.clientActionId;
  }
  return s;
}

void main() {
  test(
    'RR-D.4 o id do item volta pelo result_ref, no aparelho e sem reenvio; synced sem result_ref ("Versão do gestor" e a cascata) vai a RECEIPT_ITEM_NOT_SYNCED',
    () async {
      // ── Caso 1: o aparelho que veio da `main` (o lote gravou o `result_ref`, o item ficou sem `serverId`). ──
      final db = AppDatabase.openInMemory();
      addTearDown(db.close);
      final store = DriftExpenseLocalStore(db);
      final queue = PersistentSyncQueueRepository(DriftSyncActionStore(db));
      final c1 = await _scene(queue: queue, store: store);
      final item = await c1.itemCreateAction();
      await queue.update(
        item.copyWith(
          status: SyncStatus.synced,
          payload: {...item.payload, 'result_ref': 'srv-item-1'},
        ),
      );
      expect(
        c1.repository.serverIdForItem(c1.reportLocalId, c1.itemLocalId),
        isNull,
      );

      await c1.pass();

      final sentIds = c1.server.uploads.map((u) => u.itemServerId).toList();
      expect(sentIds, ['srv-item-1'], reason: 'upload sem o id do result_ref');
      expect((await c1.action(c1.receiptAction)).status, SyncStatus.synced);
      expect(
        c1.server.sentItemCreate,
        isFalse,
        reason: 'a recuperação reenviou o itemCreate',
      );
      expect(
        (await queue.actionsForTenant(
          _tenant,
        )).where((a) => a.type == ExpenseSyncActionTypes.itemCreate),
        hasLength(1),
        reason: 'nasceu uma ação itemCreate nova',
      );
      final reopened = _repository(store, queue, InMemoryEvidenceBlobStore());
      await reopened.load();
      expect(
        reopened.serverIdForItem(c1.reportLocalId, c1.itemLocalId),
        'srv-item-1',
        reason: 'o id recuperado não sobreviveu a reabrir o banco',
      );

      // ── Caso 2 (`ATK_GESTOR`): o `itemCreate` em conflito resolvido pela "Versão do gestor". ──
      final c2 = await _scene(
        queue: InMemorySyncQueueRepository(),
        store: InMemoryExpenseLocalStore(),
      );
      final conflicted = (await c2.itemCreateAction()).copyWith(
        status: SyncStatus.conflict,
        lastErrorCode: 'SESSION_FORBIDDEN',
      );
      await c2.queue.update(conflicted);
      final resolved = resolveConflictAction(
        conflicted,
        ConflictChoice.useServer,
      );
      expect(resolved.payload['result_ref'], isNull);
      await c2.queue.update(resolved);

      await c2.pass();

      final r2 = await c2.action(c2.receiptAction);
      expect(r2.status, SyncStatus.conflict, reason: 'caso 2: ${r2.status}');
      expect(r2.lastErrorCode, 'RECEIPT_ITEM_NOT_SYNCED');
      expect(await c2.blobs.load(c2.blobRef), isNotNull);
      expect(c2.server.uploads, isEmpty);
      expect(c2.server.sentItemCreate, isFalse);
      expect(
        (await c2.action(c2.submitAction!)).status,
        SyncStatus.synced,
        reason: 'caso 2: o comprovante prendeu o envio do relatório',
      );

      // ── Caso 3: a cascata `SUPERSEDED_BY_SERVER` (o relatório resolvido pela "Versão do gestor"). ──
      final c3 = await _scene(
        queue: InMemorySyncQueueRepository(),
        store: InMemoryExpenseLocalStore(),
      );
      final reportCreate = (await c3.queue.actionsForTenant(
        _tenant,
      )).singleWhere((a) => a.type == ExpenseSyncActionTypes.reportCreate);
      final before = reportCreate.copyWith(
        status: SyncStatus.conflict,
        lastErrorCode: 'payload_mismatch',
      );
      await c3.queue.update(before);
      final after = resolveConflictAction(before, ConflictChoice.useServer);
      await c3.queue.update(after);
      await SyncResolutionSideEffects(c3.queue).apply(before, after);
      final cascaded = await c3.itemCreateAction();
      expect(cascaded.status, SyncStatus.synced);
      expect(cascaded.lastErrorCode, 'SUPERSEDED_BY_SERVER');
      expect(cascaded.payload['result_ref'], isNull);

      await c3.pass();

      final r3 = await c3.action(c3.receiptAction);
      expect(r3.status, SyncStatus.conflict, reason: 'caso 3: ${r3.status}');
      expect(r3.lastErrorCode, 'RECEIPT_ITEM_NOT_SYNCED');
      expect(await c3.blobs.load(c3.blobRef), isNotNull);
      expect(c3.server.uploads, isEmpty);
      expect(c3.server.sentItemCreate, isFalse);
    },
  );

  test(
    'RR-D.5 item sem ação itemCreate, ou com ela em conflito: RECEIPT_ITEM_NOT_SYNCED, blob preservado, mensagem em PT-BR, e o envio não fica preso pelo comprovante',
    () async {
      // (a) Sem ação `itemCreate`: o item veio do armazenamento local, sem nada na fila.
      final seeded = ExpenseReport(
        localId: 'PC-local-40',
        serverId: 'srv-rel-40',
        title: 'Viagem antiga',
        tenantId: _tenant,
        employeeId: 'employee-1',
        policyVersion: 'v1',
        status: ExpenseReportStatus.syncPending,
        items: [
          ExpenseItem(
            localId: 'item-local-40',
            tenantId: _tenant,
            categoryId: 'fuel',
            amount: 30,
            date: DateTime.utc(2026, 11, 3),
          ),
        ],
      );
      final queue = InMemorySyncQueueRepository();
      final blobs = InMemoryEvidenceBlobStore();
      final repository = _repository(
        InMemoryExpenseLocalStore([seeded]),
        queue,
        blobs,
      );
      final attach = await repository.attachReceiptPlaceholder(
        reportLocalId: 'PC-local-40',
        itemLocalId: 'item-local-40',
        fileName: 'nota.jpg',
        mimeType: 'image/jpeg',
        bytes: Uint8List.fromList(List<int>.filled(32, 4)),
        sha256: 'c' * 64,
      );
      final submitted = await repository.submitReport('PC-local-40');
      final a = _Scene(
        queue: queue,
        store: InMemoryExpenseLocalStore(),
        repository: repository,
        blobs: blobs,
      );
      final blobRef = repository
          .receiptsForItem('PC-local-40', 'item-local-40')
          .single
          .localReference!;

      await a.pass();

      final ra = await a.action(attach!.clientActionId);
      expect(ra.status, SyncStatus.conflict, reason: '(a): ${ra.status}');
      expect(ra.lastErrorCode, 'RECEIPT_ITEM_NOT_SYNCED');
      expect(ra.lastSafeError, _notSyncedText);
      expect(await blobs.load(blobRef), isNotNull);
      expect(
        (await a.action(submitted.action.clientActionId)).status,
        SyncStatus.synced,
        reason: '(a): o comprovante prendeu o envio do relatório',
      );

      // (b) A ação `itemCreate` em conflito. (O envio continua preso pelo ITEM, pela regra de sempre; o que se mede
      // aqui é o comprovante.)
      final b = await _scene(
        queue: InMemorySyncQueueRepository(),
        store: InMemoryExpenseLocalStore(),
        submit: false,
      );
      await b.queue.update(
        (await b.itemCreateAction()).copyWith(
          status: SyncStatus.conflict,
          lastErrorCode: 'EXPENSE_NOT_FOUND',
        ),
      );

      await b.pass();

      final rb = await b.action(b.receiptAction);
      expect(rb.status, SyncStatus.conflict, reason: '(b): ${rb.status}');
      expect(rb.lastErrorCode, 'RECEIPT_ITEM_NOT_SYNCED');
      expect(rb.lastSafeError, _notSyncedText);
      expect(await b.blobs.load(b.blobRef), isNotNull);
      expect(b.server.uploads, isEmpty);
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
