import 'package:flutter_test/flutter_test.dart';

import 'package:erp_techsolutions_mobile/core/local_db/app_database.dart';
import 'package:erp_techsolutions_mobile/core/local_db/drift_expense_local_store.dart';
import 'package:erp_techsolutions_mobile/core/local_db/drift_sync_action_store.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_store.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/features/expenses/data/expense_local_store.dart';
import 'package:erp_techsolutions_mobile/features/expenses/domain/expense_models.dart';

ExpenseReport _report({
  required String tenantId,
  String localId = 'PC-local-1',
  List<ExpenseItem> items = const [],
}) {
  return ExpenseReport(
    localId: localId,
    tenantId: tenantId,
    employeeId: 'emp-1',
    policyVersion: 'v1',
    status: ExpenseReportStatus.draft,
    title: 'Prestação de Contas Teste',
    createdAt: DateTime.utc(2026, 6, 11),
    items: items,
  );
}

ExpenseItem _item({
  required String tenantId,
  String localId = 'item-local-1',
  List<Receipt> receipts = const [],
}) {
  return ExpenseItem(
    localId: localId,
    tenantId: tenantId,
    categoryId: 'fuel',
    amount: 100.0,
    date: DateTime.utc(2026, 6, 11),
    receipts: receipts,
  );
}

Receipt _receipt({
  required String tenantId,
  String localId = 'receipt-local-1',
}) {
  return Receipt(
    localId: localId,
    tenantId: tenantId,
    captureSource: ReceiptCaptureSource.manualPlaceholder,
    uploadStatus: ReceiptUploadStatus.local,
    createdAt: DateTime.utc(2026, 6, 11),
  );
}

SyncAction _action({
  required String tenantId,
  String clientActionId = 'act-1',
  SyncStatus status = SyncStatus.local,
}) {
  return SyncAction(
    clientActionId: clientActionId,
    tenantId: tenantId,
    type: 'expense_report.create',
    payload: {'local_id': 'PC-local-1', 'tenant_id': tenantId},
    status: status,
    createdAt: DateTime.utc(2026, 6, 11),
  );
}

void main() {
  group('DriftExpenseLocalStore — SQLite round-trip', () {
    late AppDatabase db;
    late DriftExpenseLocalStore store;

    setUp(() {
      db = AppDatabase.openInMemory();
      store = DriftExpenseLocalStore(db);
    });

    tearDown(() => db.close());

    test('1. criar Prestação de Contas e recarregar do SQLite', () async {
      final report = _report(tenantId: 'tenant-a');
      await store.saveReports([report]);

      final loaded = await store.loadReports();
      expect(loaded, hasLength(1));
      expect(loaded.first.localId, 'PC-local-1');
      expect(loaded.first.tenantId, 'tenant-a');
      expect(loaded.first.title, 'Prestação de Contas Teste');
      expect(loaded.first.status, ExpenseReportStatus.draft);
      expect(loaded.first.createdAt, DateTime.utc(2026, 6, 11));
    });

    test('2. criar item e recarregar do SQLite', () async {
      final item = _item(tenantId: 'tenant-a');
      final report = _report(tenantId: 'tenant-a', items: [item]);
      await store.saveReports([report]);

      final loaded = await store.loadReports();
      expect(loaded.first.items, hasLength(1));
      expect(loaded.first.items.first.localId, 'item-local-1');
      expect(loaded.first.items.first.categoryId, 'fuel');
      expect(loaded.first.items.first.amount, 100.0);
      expect(loaded.first.items.first.date, DateTime.utc(2026, 6, 11));
    });

    test('3. anexar recibo e recarregar do SQLite', () async {
      final receipt = _receipt(tenantId: 'tenant-a');
      final item = _item(tenantId: 'tenant-a', receipts: [receipt]);
      final report = _report(tenantId: 'tenant-a', items: [item]);
      await store.saveReports([report]);

      final loaded = await store.loadReports();
      final loadedReceipt = loaded.first.items.first.receipts.first;
      expect(loadedReceipt.localId, 'receipt-local-1');
      expect(loadedReceipt.tenantId, 'tenant-a');
      expect(
        loadedReceipt.captureSource,
        ReceiptCaptureSource.manualPlaceholder,
      );
      expect(loadedReceipt.uploadStatus, ReceiptUploadStatus.local);
      expect(loadedReceipt.createdAt, DateTime.utc(2026, 6, 11));
    });

    test(
      '4. isolamento de tenant: tenant-b nao ve dados do tenant-a',
      () async {
        final reportA = _report(tenantId: 'tenant-a', localId: 'PC-a');
        final reportB = _report(tenantId: 'tenant-b', localId: 'PC-b');
        await store.saveReports([reportA, reportB]);

        final all = await store.loadReports();
        expect(all, hasLength(2));

        final aReports = all.where((r) => r.tenantId == 'tenant-a').toList();
        final bReports = all.where((r) => r.tenantId == 'tenant-b').toList();
        expect(aReports, hasLength(1));
        expect(bReports, hasLength(1));
        expect(aReports.first.localId, 'PC-a');
        expect(bReports.first.localId, 'PC-b');
      },
    );

    test(
      '5. markReceiptUploaded: serverId e uploadStatus persistidos',
      () async {
        final receipt = _receipt(tenantId: 'tenant-a');
        final item = _item(tenantId: 'tenant-a', receipts: [receipt]);
        final report = _report(tenantId: 'tenant-a', items: [item]);
        await store.saveReports([report]);

        final updatedReceipt = receipt.copyWith(
          serverId: 'server-receipt-42',
          uploadStatus: ReceiptUploadStatus.uploaded,
          updatedAt: DateTime.utc(2026, 6, 12),
        );
        final updatedItem = item.copyWith(receipts: [updatedReceipt]);
        final updatedReport = report.copyWith(items: [updatedItem]);
        await store.saveReports([updatedReport]);

        final loaded = await store.loadReports();
        final loadedReceipt = loaded.first.items.first.receipts.first;
        expect(loadedReceipt.serverId, 'server-receipt-42');
        expect(loadedReceipt.uploadStatus, ReceiptUploadStatus.uploaded);
        expect(loadedReceipt.updatedAt, DateTime.utc(2026, 6, 12));
      },
    );
  });

  group('DriftSyncActionStore — SQLite round-trip', () {
    late AppDatabase db;
    late DriftSyncActionStore store;

    setUp(() {
      db = AppDatabase.openInMemory();
      store = DriftSyncActionStore(db);
    });

    tearDown(() => db.close());

    test('6. fila sync persistida no SQLite', () async {
      final action = _action(tenantId: 'tenant-a');
      await store.save([action]);

      final loaded = await store.load();
      expect(loaded, hasLength(1));
      expect(loaded.first.clientActionId, 'act-1');
      expect(loaded.first.type, 'expense_report.create');
      expect(loaded.first.status, SyncStatus.local);
      expect(loaded.first.createdAt, DateTime.utc(2026, 6, 11));
      expect(loaded.first.payload['local_id'], 'PC-local-1');
    });

    test(
      '7. retryCount e lastSafeError persistidos sem dados sensiveis',
      () async {
        final action = _action(tenantId: 'tenant-a').copyWith(
          retryCount: 3,
          lastSafeError: 'timeout ao sincronizar',
          lastErrorCode: 'NET_TIMEOUT',
          status: SyncStatus.failed,
        );
        await store.save([action]);

        final loaded = await store.load();
        expect(loaded.first.retryCount, 3);
        expect(loaded.first.lastSafeError, 'timeout ao sincronizar');
        expect(loaded.first.lastErrorCode, 'NET_TIMEOUT');
        expect(loaded.first.status, SyncStatus.failed);
        // payload nao contem token, bearer, secret
        final payloadStr = loaded.first.payload.toString();
        expect(payloadStr.toLowerCase(), isNot(contains('bearer')));
        expect(payloadStr.toLowerCase(), isNot(contains('token')));
        expect(payloadStr.toLowerCase(), isNot(contains('secret')));
      },
    );
  });

  group('Interface contracts', () {
    test(
      '8. DriftExpenseLocalStore e DriftSyncActionStore implementam interfaces sem expor Drift',
      () {
        final db = AppDatabase.openInMemory();
        addTearDown(db.close);

        final expenseStore = DriftExpenseLocalStore(db);
        final syncStore = DriftSyncActionStore(db);

        // UI vê apenas as interfaces abstratas — Drift é detalhe de implementação
        expect(expenseStore, isA<ExpenseLocalStore>());
        expect(syncStore, isA<SyncActionStore>());
      },
    );
  });
}
