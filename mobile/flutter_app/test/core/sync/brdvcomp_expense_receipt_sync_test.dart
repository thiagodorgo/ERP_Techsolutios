// B-RDV-COMPROVANTE (§G.3) · RR4 — o blob do comprovante morre SÓ quando o servidor
// confirma (`uploaded`); recusa (422/503) e erro de rede o PRESERVAM (§6 do CLAUDE.md).
// Vermelho-controle: na `origin/main` nem `expense_receipt_sync.dart` existe.
import 'dart:typed_data';

import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/evidence/evidence_blob_store.dart';
import 'package:erp_techsolutions_mobile/core/network/api_error.dart';
import 'package:erp_techsolutions_mobile/core/permissions/permission_resolver.dart';
import 'package:erp_techsolutions_mobile/core/sync/expense_receipt_sync.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_factory.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_repository.dart';
import 'package:erp_techsolutions_mobile/features/expenses/data/expense_local_store.dart';
import 'package:erp_techsolutions_mobile/features/expenses/data/expense_repository.dart';
import 'package:erp_techsolutions_mobile/features/expenses/domain/expense_models.dart';
import 'package:flutter_test/flutter_test.dart';

class _StubReceiptUploadApi implements ExpenseReceiptUploadApi {
  _StubReceiptUploadApi(this._results);

  final List<Object> _results;
  final List<ExpenseReceiptUploadRequest> requests = [];

  @override
  Future<ExpenseReceiptUploadResponse> upload(
    ExpenseReceiptUploadRequest request,
  ) async {
    requests.add(request);
    final next = _results.removeAt(0);
    if (next is ExpenseReceiptUploadResponse) return next;
    throw next;
  }
}

Future<
  ({
    InMemorySyncQueueRepository queue,
    LocalExpenseRepository repository,
    InMemoryEvidenceBlobStore blobStore,
    SyncAction action,
    String blobRef,
    String reportLocalId,
    String itemLocalId,
    String receiptLocalId,
  })
>
_scenario() async {
  final queue = InMemorySyncQueueRepository();
  final blobStore = InMemoryEvidenceBlobStore();
  final repository = LocalExpenseRepository(
    session: _session(),
    syncQueue: queue,
    actionFactory: SyncActionFactory(),
    localStore: InMemoryExpenseLocalStore(),
    blobStore: blobStore,
  );

  final created = await repository.createReport(
    title: 'Viagem comprovante',
    advanceAmount: 0,
  );
  final reportLocalId = created.report.localId;
  final item = await repository.addItem(
    reportId: reportLocalId,
    categoryId: 'fuel',
    amount: 50,
    city: 'Campinas',
    vendorName: 'Posto',
  );
  final itemLocalId = item.report.items.last.localId;

  final bytes = Uint8List.fromList(List<int>.filled(32, 7));
  final action = await repository.attachReceiptPlaceholder(
    reportLocalId: reportLocalId,
    itemLocalId: itemLocalId,
    fileName: 'nota.jpg',
    mimeType: 'image/jpeg',
    bytes: bytes,
    sha256: 'a' * 64,
  );
  expect(action, isNotNull, reason: 'com bytes o comprovante entra na fila');

  // Os ids de servidor nascem no lote JSON; aqui o cenário os grava direto.
  await repository.markReportSynced(reportLocalId, 'report-server-1');
  await repository.markItemSynced(reportLocalId, itemLocalId, 'item-server-1');

  final receipt = repository.receiptsForItem(reportLocalId, itemLocalId).single;
  expect(receipt.uploadStatus, ReceiptUploadStatus.pending);
  final blobRef = receipt.localReference!;
  expect(await blobStore.load(blobRef), isNotNull);

  return (
    queue: queue,
    repository: repository,
    blobStore: blobStore,
    action: action!,
    blobRef: blobRef,
    reportLocalId: reportLocalId,
    itemLocalId: itemLocalId,
    receiptLocalId: receipt.localId,
  );
}

ExpenseReceiptSyncService _service(
  InMemorySyncQueueRepository queue,
  LocalExpenseRepository repository,
  InMemoryEvidenceBlobStore blobStore,
  ExpenseReceiptUploadApi api,
) {
  return ExpenseReceiptSyncService(
    queue: queue,
    repository: repository,
    blobStore: blobStore,
    api: api,
  );
}

void main() {
  test(
    'RR4.1 confirmação do servidor (uploaded) marca o comprovante e APAGA o blob',
    () async {
      final s = await _scenario();
      final api = _StubReceiptUploadApi([
        const ExpenseReceiptUploadResponse(
          receiptId: 'receipt-server-1',
          uploadStatus: 'uploaded',
        ),
      ]);

      final result = await _service(
        s.queue,
        s.repository,
        s.blobStore,
        api,
      ).uploadTenant('tenant-demo');

      expect(result.uploaded, hasLength(1));
      expect(api.requests.single.reportServerId, 'report-server-1');
      expect(api.requests.single.itemServerId, 'item-server-1');
      expect(api.requests.single.clientActionId, s.action.clientActionId);

      final actions = await s.queue.actionsForTenant('tenant-demo');
      expect(
        actions
            .singleWhere((a) => a.clientActionId == s.action.clientActionId)
            .status,
        SyncStatus.synced,
      );
      final receipt = s.repository
          .receiptsForItem(s.reportLocalId, s.itemLocalId)
          .single;
      expect(receipt.uploadStatus, ReceiptUploadStatus.uploaded);
      expect(receipt.serverId, 'receipt-server-1');
      expect(
        await s.blobStore.load(s.blobRef),
        isNull,
        reason: 'uploaded é o ÚNICO estado que apaga o blob',
      );
    },
  );

  test(
    'RR4.2 recusa 422 e 503 PRESERVAM o blob (422 conflita; 503 sem custo)',
    () async {
      final s = await _scenario();

      // 422: recusa de segurança → conflito visível, blob intacto.
      final rejected = _StubReceiptUploadApi([
        const ApiServerError(statusCode: 422),
      ]);
      await _service(
        s.queue,
        s.repository,
        s.blobStore,
        rejected,
      ).uploadTenant('tenant-demo');

      var action = (await s.queue.actionsForTenant(
        'tenant-demo',
      )).singleWhere((a) => a.clientActionId == s.action.clientActionId);
      expect(action.status, SyncStatus.conflict);
      expect(action.lastErrorCode, 'RECEIPT_REJECTED');
      expect(
        await s.blobStore.load(s.blobRef),
        isNotNull,
        reason: 'recusa preserva o blob (§6)',
      );

      // 503: scanner/servidor indisponível → volta a pending SEM consumir tentativa.
      await s.queue.update(action.copyWith(status: SyncStatus.pending));
      final busy = _StubReceiptUploadApi([
        const ApiServerError(statusCode: 503),
      ]);
      await _service(
        s.queue,
        s.repository,
        s.blobStore,
        busy,
      ).uploadTenant('tenant-demo');

      action = (await s.queue.actionsForTenant(
        'tenant-demo',
      )).singleWhere((a) => a.clientActionId == s.action.clientActionId);
      expect(action.status, SyncStatus.pending);
      expect(
        action.retryCount,
        s.action.retryCount,
        reason: '503 não consome tentativa',
      );
      expect(action.lastErrorCode, 'SYNC_BUSY');
      expect(await s.blobStore.load(s.blobRef), isNotNull);
    },
  );

  test(
    'RR4.3 erro de rede PRESERVA o blob e consome tentativa (failed)',
    () async {
      final s = await _scenario();
      final api = _StubReceiptUploadApi([const ApiNetworkError()]);

      await _service(
        s.queue,
        s.repository,
        s.blobStore,
        api,
      ).uploadTenant('tenant-demo');

      final action = (await s.queue.actionsForTenant(
        'tenant-demo',
      )).singleWhere((a) => a.clientActionId == s.action.clientActionId);
      expect(action.status, SyncStatus.failed);
      expect(action.retryCount, s.action.retryCount + 1);
      expect(await s.blobStore.load(s.blobRef), isNotNull);
      final receipt = s.repository
          .receiptsForItem(s.reportLocalId, s.itemLocalId)
          .single;
      expect(receipt.uploadStatus, ReceiptUploadStatus.failed);
    },
  );
}

BootstrapSession _session() {
  return const BootstrapSession(
    activeTenant: TenantContext(
      tenantId: 'tenant-demo',
      displayName: 'Tenant Demo',
    ),
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
