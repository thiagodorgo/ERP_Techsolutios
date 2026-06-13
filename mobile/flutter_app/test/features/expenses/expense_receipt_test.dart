import 'dart:io';

import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/diagnostics/diagnostics_screen.dart';
import 'package:erp_techsolutions_mobile/core/network/api_contracts.dart';
import 'package:erp_techsolutions_mobile/core/permissions/permission_resolver.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_factory.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_store.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_providers.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_repository.dart';
import 'package:erp_techsolutions_mobile/features/expenses/data/expense_local_store.dart';
import 'package:erp_techsolutions_mobile/features/expenses/data/expense_repository.dart';
import 'package:erp_techsolutions_mobile/features/expenses/domain/expense_models.dart';
import 'package:erp_techsolutions_mobile/features/expenses/services/expense_policy_evaluator.dart';
import 'package:erp_techsolutions_mobile/features/expenses/ui/expense_item_receipts_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

void main() {
  // ── 1 ──────────────────────────────────────────────────────────────────────
  test(
    'attachReceiptPlaceholder creates receipt with localId captureSource uploadStatus and createdAt',
    () async {
      final repo = _buildRepo();
      final created = await repo.createReport(
        title: 'Prestação de Contas recibo',
        advanceAmount: 0,
      );
      final itemResult = await repo.addItem(
        reportId: created.report.localId,
        categoryId: 'meal',
        amount: 30,
        city: 'SP',
        vendorName: 'Loja',
      );
      final itemLocalId = itemResult.report.items.first.localId;

      await repo.attachReceiptPlaceholder(
        reportLocalId: created.report.localId,
        itemLocalId: itemLocalId,
        fileName: 'nota_refeicao.jpg',
      );

      final receipts = repo.receiptsForItem(
        created.report.localId,
        itemLocalId,
      );
      expect(receipts, hasLength(1));

      final receipt = receipts.first;
      expect(receipt.localId, isNotEmpty);
      expect(receipt.captureSource, ReceiptCaptureSource.manualPlaceholder);
      expect(receipt.uploadStatus, ReceiptUploadStatus.local);
      expect(receipt.createdAt, isNotNull);
      expect(receipt.fileName, 'nota_refeicao.jpg');
      expect(receipt.reportLocalId, created.report.localId);
      expect(receipt.itemLocalId, itemLocalId);
    },
  );

  test('missing receipt status update is a no-op', () async {
    final repo = _buildRepo();
    final created = await repo.createReport(
      title: 'Prestação de Contas no-op',
      advanceAmount: 0,
    );
    await repo.addItem(
      reportId: created.report.localId,
      categoryId: 'meal',
      amount: 30,
      city: 'SP',
      vendorName: 'Loja',
    );

    final before = repo.findReport(created.report.localId);

    await repo.markReceiptUploadPending(
      created.report.localId,
      'receipt-local-missing',
    );

    expect(repo.findReport(created.report.localId), before);
  });

  // ── 2 ──────────────────────────────────────────────────────────────────────
  test('receipt persists across local store reload', () async {
    final dir = await Directory.systemTemp.createTemp('erp-receipt-persist-');
    addTearDown(() => dir.delete(recursive: true));

    final reportFile = File('${dir.path}/reports.json');
    final syncFile = File('${dir.path}/sync.json');

    final repo = _buildFileRepo(reportFile, syncFile);
    final created = await repo.createReport(
      title: 'Prestação de Contas persist',
      advanceAmount: 0,
    );
    final itemResult = await repo.addItem(
      reportId: created.report.localId,
      categoryId: 'fuel',
      amount: 50,
      city: 'RJ',
      vendorName: 'Posto',
    );

    await repo.attachReceiptPlaceholder(
      reportLocalId: created.report.localId,
      itemLocalId: itemResult.report.items.first.localId,
      fileName: 'cupom_combustivel.jpg',
    );

    final reloaded = _buildFileRepo(reportFile, syncFile);
    await reloaded.load(seedIfEmpty: false);

    final item = reloaded.findReport(created.report.localId)!.items.first;
    expect(item.receipts, hasLength(1));
    expect(item.receipts.first.fileName, 'cupom_combustivel.jpg');
    expect(
      item.receipts.first.captureSource,
      ReceiptCaptureSource.manualPlaceholder,
    );
    expect(item.receipts.first.createdAt, isNotNull);
  });

  // ── 3 ──────────────────────────────────────────────────────────────────────
  test(
    'attachReceiptPlaceholder enqueues expense_receipt.attach with non-empty clientActionId',
    () async {
      final syncQueue = InMemorySyncQueueRepository();
      final repo = _buildRepo(syncQueue: syncQueue);

      final created = await repo.createReport(
        title: 'Prestação de Contas sync',
        advanceAmount: 0,
      );
      final itemResult = await repo.addItem(
        reportId: created.report.localId,
        categoryId: 'meal',
        amount: 25,
        city: 'BH',
        vendorName: 'Restaurante',
      );

      final result = await repo.attachReceiptPlaceholder(
        reportLocalId: created.report.localId,
        itemLocalId: itemResult.report.items.first.localId,
      );

      expect(result.action.type, ExpenseSyncActionTypes.receiptAttach);
      expect(result.action.clientActionId, isNotEmpty);

      final queued = await syncQueue.actionsForTenant('tenant-demo');
      final receiptActions = queued
          .where((a) => a.type == ExpenseSyncActionTypes.receiptAttach)
          .toList();
      expect(receiptActions, hasLength(1));
      expect(receiptActions.first.clientActionId, isNotEmpty);
    },
  );

  // ── 4 ──────────────────────────────────────────────────────────────────────
  test(
    'expense_receipt.attach payload contains only safe metadata — no private path, token or raw content',
    () async {
      final repo = _buildRepo();
      final created = await repo.createReport(
        title: 'Prestação de Contas seguro',
        advanceAmount: 0,
      );
      final itemResult = await repo.addItem(
        reportId: created.report.localId,
        categoryId: 'meal',
        amount: 40,
        city: 'Curitiba',
        vendorName: 'Lanchonete',
      );

      final result = await repo.attachReceiptPlaceholder(
        reportLocalId: created.report.localId,
        itemLocalId: itemResult.report.items.first.localId,
        fileName: 'nota.jpg',
      );

      final payload = result.action.payload;

      // Safe metadata must be present
      expect(
        payload.keys,
        containsAll([
          'tenant_id',
          'receipt_local_id',
          'file_name',
          'capture_source',
        ]),
      );

      // No key must hint at sensitive data
      for (final key in payload.keys) {
        expect(
          key.contains('token') ||
              key.contains('password') ||
              key.contains('secret'),
          isFalse,
          reason: 'Payload key "$key" suggests sensitive data',
        );
      }

      // No value must look like an absolute filesystem path or bearer token
      for (final value in payload.values) {
        if (value is String) {
          expect(
            value.startsWith('/data/') || value.startsWith('/storage/'),
            isFalse,
            reason: 'Payload value "$value" looks like a private path',
          );
          expect(
            value.toLowerCase().startsWith('bearer '),
            isFalse,
            reason: 'Payload value "$value" looks like a bearer token',
          );
          // base64 blobs are long and match [A-Za-z0-9+/=]+
          if (value.length > 100) {
            expect(
              RegExp(r'^[A-Za-z0-9+/]+=*$').hasMatch(value),
              isFalse,
              reason: 'Payload value looks like base64 encoded content',
            );
          }
        }
      }
    },
  );

  // ── 5 ──────────────────────────────────────────────────────────────────────
  test(
    'policy blocks submit when receipt required but item has no receipt',
    () {
      const policy = ExpensePolicy(
        tenantId: 'tenant-a',
        version: 'v1',
        categoryLimits: {},
        receiptRequiredCategories: {'fuel'},
      );
      final report = ExpenseReport(
        localId: 'PC-1',
        tenantId: 'tenant-a',
        employeeId: 'employee-1',
        policyVersion: 'v1',
        status: ExpenseReportStatus.draft,
        items: [
          ExpenseItem(
            localId: 'item-1',
            tenantId: 'tenant-a',
            categoryId: 'fuel',
            amount: 80,
            date: DateTime.utc(2026, 6, 11),
          ),
        ],
      );

      final violations = const ExpensePolicyEvaluator().evaluate(
        report: report,
        policy: policy,
      );

      expect(
        violations.any(
          (v) =>
              v.code == 'receipt_required' &&
              v.severity == PolicyViolationSeverity.blocking,
        ),
        isTrue,
      );
    },
  );

  // ── 6 ──────────────────────────────────────────────────────────────────────
  test(
    'policy allows submit after receipt placeholder attached to required category item',
    () async {
      final repo = _buildRepo();
      final created = await repo.createReport(
        title: 'Prestação de Contas fuel',
        advanceAmount: 0,
      );
      final itemResult = await repo.addItem(
        reportId: created.report.localId,
        categoryId: 'fuel',
        amount: 80,
        city: 'SP',
        vendorName: 'Posto',
      );

      await repo.attachReceiptPlaceholder(
        reportLocalId: created.report.localId,
        itemLocalId: itemResult.report.items.first.localId,
      );

      final report = repo.findReport(created.report.localId)!;
      const policy = ExpensePolicy(
        tenantId: 'tenant-demo',
        version: 'v1',
        categoryLimits: {},
        receiptRequiredCategories: {'fuel'},
      );

      final violations = const ExpensePolicyEvaluator().evaluate(
        report: report,
        policy: policy,
      );

      expect(
        violations.where((v) => v.code == 'receipt_required'),
        isEmpty,
        reason: 'receipt placeholder should satisfy receipt_required',
      );
    },
  );

  // ── 7 ──────────────────────────────────────────────────────────────────────
  testWidgets('receipts screen renders fileName and upload status chip', (
    tester,
  ) async {
    final receipt = Receipt(
      localId: 'receipt-t1',
      tenantId: 'tenant-demo',
      reportLocalId: 'report-r1',
      itemLocalId: 'item-i1',
      fileName: 'nota_fiscal_widget.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 2048,
      captureSource: ReceiptCaptureSource.camera,
      uploadStatus: ReceiptUploadStatus.local,
      createdAt: _kDate,
    );

    final store = InMemoryExpenseLocalStore([
      ExpenseReport(
        localId: 'report-r1',
        tenantId: 'tenant-demo',
        employeeId: 'employee-1',
        policyVersion: 'v1',
        status: ExpenseReportStatus.draft,
        items: [
          ExpenseItem(
            localId: 'item-i1',
            tenantId: 'tenant-demo',
            categoryId: 'meal',
            amount: 50,
            date: _kDate,
            receipts: [receipt],
          ),
        ],
      ),
    ]);

    final router = GoRouter(
      initialLocation: '/expenses/report-r1/items/item-i1/receipts',
      routes: [
        GoRoute(
          path: '/expenses/:reportId/items/:itemId/receipts',
          builder: (context, state) => ExpenseItemReceiptsScreen(
            reportId: state.pathParameters['reportId']!,
            itemId: state.pathParameters['itemId']!,
          ),
        ),
      ],
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          expenseLocalStoreProvider.overrideWithValue(store),
          syncActionStoreProvider.overrideWithValue(InMemorySyncActionStore()),
        ],
        child: MaterialApp.router(routerConfig: router),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('nota_fiscal_widget.jpg'), findsOneWidget);
    expect(find.text('Local'), findsOneWidget);
  });

  // ── 8 ──────────────────────────────────────────────────────────────────────
  testWidgets(
    'diagnostics screen does not render raw payload of expense_receipt.attach action',
    (tester) async {
      const privatePayloadValue =
          '/data/user/0/com.example.app/private-token-xyz';

      final syncStore = InMemorySyncActionStore([
        SyncAction(
          clientActionId: 'receipt-diag-01',
          tenantId: 'tenant-demo',
          type: ExpenseSyncActionTypes.receiptAttach,
          payload: const {
            'tenant_id': 'tenant-demo',
            'receipt_local_id': 'receipt-r1',
            'file_name': 'nota.jpg',
            'private_path': privatePayloadValue,
          },
          status: SyncStatus.pending,
          createdAt: _kDate,
        ),
      ]);

      final router = GoRouter(
        initialLocation: '/diagnostics',
        routes: [
          GoRoute(
            path: '/diagnostics',
            builder: (context, state) => const DiagnosticsScreen(),
          ),
        ],
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            syncActionStoreProvider.overrideWithValue(syncStore),
            expenseLocalStoreProvider.overrideWithValue(
              InMemoryExpenseLocalStore(),
            ),
          ],
          child: MaterialApp.router(routerConfig: router),
        ),
      );
      await tester.pumpAndSettle();

      expect(
        find.textContaining(privatePayloadValue),
        findsNothing,
        reason: 'DiagnosticsScreen must not render raw payload values',
      );
    },
  );
}

// ── helpers ──────────────────────────────────────────────────────────────────

final _kDate = DateTime.utc(2026, 6, 11);

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

LocalExpenseRepository _buildRepo({SyncQueueRepository? syncQueue}) {
  return LocalExpenseRepository(
    session: _session(),
    syncQueue: syncQueue ?? InMemorySyncQueueRepository(),
    actionFactory: SyncActionFactory(),
    localStore: InMemoryExpenseLocalStore(),
  );
}

LocalExpenseRepository _buildFileRepo(File reportFile, File syncFile) {
  return LocalExpenseRepository(
    session: _session(),
    syncQueue: PersistentSyncQueueRepository(
      JsonFileSyncActionStore.file(syncFile),
    ),
    actionFactory: SyncActionFactory(),
    localStore: JsonFileExpenseLocalStore.file(reportFile),
  );
}
