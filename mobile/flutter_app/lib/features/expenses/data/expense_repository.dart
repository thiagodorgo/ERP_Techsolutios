import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/bootstrap/bootstrap_repository.dart';
import '../../../core/bootstrap/bootstrap_session.dart';
import '../../../core/local_db/database_provider.dart';
import '../../../core/local_db/drift_expense_local_store.dart';
import '../../../core/network/api_contracts.dart';
import '../../../core/sync/sync_action_factory.dart';
import '../../../core/sync/sync_models.dart';
import '../../../core/sync/sync_providers.dart';
import '../../../core/sync/sync_queue_repository.dart';
import '../domain/expense_models.dart';
import 'expense_local_store.dart';

class ExpenseMutationResult {
  const ExpenseMutationResult({required this.report, required this.action});

  final ExpenseReport report;
  final SyncAction action;
}

class LocalExpenseRepository extends ChangeNotifier {
  LocalExpenseRepository({
    required BootstrapSession session,
    required SyncQueueRepository syncQueue,
    required SyncActionFactory actionFactory,
    required ExpenseLocalStore localStore,
    List<ExpenseReport> seedReports = const <ExpenseReport>[],
  }) : _session = session,
       _syncQueue = syncQueue,
       _actionFactory = actionFactory,
       _localStore = localStore,
       _reports = seedReports;

  final BootstrapSession _session;
  final SyncQueueRepository _syncQueue;
  final SyncActionFactory _actionFactory;
  final ExpenseLocalStore _localStore;
  List<ExpenseReport> _reports;
  bool _loaded = false;
  int _reportSequence = 10;
  int _itemSequence = 10;
  int _receiptSequence = 10;

  List<ExpenseReport> get reports => List.unmodifiable(_reports);

  Future<void> load({bool seedIfEmpty = true}) async {
    if (_loaded) {
      return;
    }

    final stored = await _localStore.loadReports();
    if (stored.isEmpty && seedIfEmpty) {
      _reports = _initialReports(_session);
      await _persistReports();
    } else {
      _reports = stored
          .where((report) => report.tenantId == _session.activeTenant.tenantId)
          .toList(growable: false);
    }
    _loaded = true;
    _refreshSequences();
    notifyListeners();
  }

  ExpensePolicy get activePolicy {
    return ExpensePolicy(
      tenantId: _session.activeTenant.tenantId,
      version: _session.expensePolicy.version,
      categoryLimits: _session.expensePolicy.categoryLimits,
      receiptRequiredCategories:
          _session.expensePolicy.receiptRequiredCategories,
    );
  }

  List<ExpenseCategorySnapshot> get categories => _session.expenseCategories;

  ExpenseReport? findReport(String localId) {
    for (final report in _reports) {
      if (report.localId == localId) {
        return report;
      }
    }
    return null;
  }

  Future<ExpenseMutationResult> createReport({
    required String title,
    required double advanceAmount,
  }) async {
    await load();
    final localId = 'PC-local-${_reportSequence++}';
    final report = ExpenseReport(
      localId: localId,
      title: title.trim().isEmpty
          ? 'Prestação de Contas de campo'
          : title.trim(),
      tenantId: _session.activeTenant.tenantId,
      employeeId: _session.user.userId,
      policyVersion: _session.expensePolicy.version,
      status: ExpenseReportStatus.syncPending,
      advance: ExpenseAdvance(
        tenantId: _session.activeTenant.tenantId,
        amount: advanceAmount,
      ),
      createdAt: DateTime.now().toUtc(),
    );
    final action = _actionFactory.create(
      tenantId: report.tenantId,
      type: ExpenseSyncActionTypes.reportCreate,
      payload: {
        'local_id': report.localId,
        'title': report.title,
        'employee_id': report.employeeId,
        'policy_version': report.policyVersion,
        'advance_amount': advanceAmount,
      },
    );

    _reports = [report, ..._reports];
    notifyListeners();
    await _persistReports();
    await _syncQueue.enqueue(action);
    return ExpenseMutationResult(report: report, action: action);
  }

  Future<ExpenseMutationResult> addItem({
    required String reportId,
    required String categoryId,
    required double amount,
    required String city,
    required String vendorName,
    bool attachReceiptPlaceholder = false,
  }) async {
    await load();
    final report = findReport(reportId);
    if (report == null) {
      throw ArgumentError.value(reportId, 'reportId', 'Report not found');
    }

    final itemLocalId = 'item-local-${_itemSequence++}';
    final item = ExpenseItem(
      localId: itemLocalId,
      tenantId: report.tenantId,
      categoryId: categoryId,
      amount: amount,
      date: DateTime.now().toUtc(),
      city: city.trim().isEmpty ? null : city.trim(),
      vendorName: vendorName.trim().isEmpty ? null : vendorName.trim(),
      receipts: attachReceiptPlaceholder
          ? [
              Receipt(
                localId: 'receipt-local-${_receiptSequence++}',
                tenantId: report.tenantId,
                reportLocalId: report.localId,
                itemLocalId: itemLocalId,
                captureSource: ReceiptCaptureSource.manualPlaceholder,
                uploadStatus: ReceiptUploadStatus.local,
                createdAt: DateTime.now().toUtc(),
              ),
            ]
          : const <Receipt>[],
    );

    final updated = report.copyWith(
      status: ExpenseReportStatus.syncPending,
      items: [...report.items, item],
      updatedAt: DateTime.now().toUtc(),
    );
    await _replace(updated);

    final action = _actionFactory.create(
      tenantId: report.tenantId,
      type: ExpenseSyncActionTypes.itemCreate,
      payload: {
        'report_local_id': report.localId,
        'category_id': categoryId,
        'amount': amount,
        'city': item.city,
        'vendor_name': item.vendorName,
        'receipt_placeholder': attachReceiptPlaceholder,
      },
    );
    await _syncQueue.enqueue(action);
    return ExpenseMutationResult(report: updated, action: action);
  }

  Future<ExpenseMutationResult> submitReport(String reportId) async {
    await load();
    final report = findReport(reportId);
    if (report == null) {
      throw ArgumentError.value(reportId, 'reportId', 'Report not found');
    }

    final submitted = report.copyWith(
      status: ExpenseReportStatus.submitted,
      updatedAt: DateTime.now().toUtc(),
    );
    await _replace(submitted);

    final action = _actionFactory.create(
      tenantId: report.tenantId,
      type: ExpenseSyncActionTypes.reportSubmit,
      payload: {
        'report_local_id': report.localId,
        'policy_version': report.policyVersion,
        'submitted_at': DateTime.now().toUtc().toIso8601String(),
      },
    );
    await _syncQueue.enqueue(action);
    return ExpenseMutationResult(report: submitted, action: action);
  }

  Future<ExpenseMutationResult> attachReceiptPlaceholder({
    required String reportLocalId,
    required String itemLocalId,
    String fileName = 'comprovante',
    String mimeType = 'image/jpeg',
    ReceiptCaptureSource captureSource = ReceiptCaptureSource.manualPlaceholder,
  }) async {
    await load();
    final report = findReport(reportLocalId);
    if (report == null) {
      throw ArgumentError.value(
        reportLocalId,
        'reportLocalId',
        'Report not found',
      );
    }

    ExpenseItem? target;
    for (final i in report.items) {
      if (i.localId == itemLocalId) {
        target = i;
        break;
      }
    }
    if (target == null) {
      throw ArgumentError.value(itemLocalId, 'itemLocalId', 'Item not found');
    }

    final receipt = Receipt(
      localId: 'receipt-local-${_receiptSequence++}',
      tenantId: report.tenantId,
      reportLocalId: reportLocalId,
      itemLocalId: itemLocalId,
      fileName: fileName,
      mimeType: mimeType,
      captureSource: captureSource,
      uploadStatus: ReceiptUploadStatus.local,
      createdAt: DateTime.now().toUtc(),
    );

    final updatedItem = target.copyWith(
      receipts: [...target.receipts, receipt],
    );
    final updated = report.copyWith(
      items: [
        for (final i in report.items)
          if (i.localId == itemLocalId) updatedItem else i,
      ],
      updatedAt: DateTime.now().toUtc(),
    );
    await _replace(updated);

    final action = _actionFactory.create(
      tenantId: report.tenantId,
      type: ExpenseSyncActionTypes.receiptAttach,
      payload: _safeReceiptPayload(report, target, receipt),
    );
    await _syncQueue.enqueue(action);
    return ExpenseMutationResult(report: updated, action: action);
  }

  List<Receipt> receiptsForItem(String reportLocalId, String itemLocalId) {
    final report = findReport(reportLocalId);
    if (report == null) return const <Receipt>[];
    for (final item in report.items) {
      if (item.localId == itemLocalId) return item.receipts;
    }
    return const <Receipt>[];
  }

  List<Receipt> receiptsForReport(String reportLocalId) {
    final report = findReport(reportLocalId);
    if (report == null) return const <Receipt>[];
    return [for (final item in report.items) ...item.receipts];
  }

  Future<void> markReceiptUploadPending(
    String reportLocalId,
    String receiptLocalId,
  ) async {
    await _updateReceiptStatus(
      reportLocalId,
      receiptLocalId,
      (r) => r.copyWith(
        uploadStatus: ReceiptUploadStatus.pending,
        updatedAt: DateTime.now().toUtc(),
      ),
    );
  }

  Future<void> markReceiptUploadFailed(
    String reportLocalId,
    String receiptLocalId,
  ) async {
    await _updateReceiptStatus(
      reportLocalId,
      receiptLocalId,
      (r) => r.copyWith(
        uploadStatus: ReceiptUploadStatus.failed,
        updatedAt: DateTime.now().toUtc(),
      ),
    );
  }

  Future<void> markReceiptUploaded(
    String reportLocalId,
    String receiptLocalId, {
    required String serverId,
  }) async {
    await _updateReceiptStatus(
      reportLocalId,
      receiptLocalId,
      (r) => r.copyWith(
        serverId: serverId,
        uploadStatus: ReceiptUploadStatus.uploaded,
        updatedAt: DateTime.now().toUtc(),
      ),
    );
  }

  Future<void> markReceiptOcrReviewed(
    String reportLocalId,
    String receiptLocalId, {
    Map<String, Object?>? reviewedFields,
  }) async {
    await _updateReceiptStatus(
      reportLocalId,
      receiptLocalId,
      (r) => r.copyWith(
        ocrStatus: ReceiptOcrStatus.reviewed,
        userReviewedFields: reviewedFields ?? r.userReviewedFields,
        updatedAt: DateTime.now().toUtc(),
      ),
    );
  }

  Future<void> _updateReceiptStatus(
    String reportLocalId,
    String receiptLocalId,
    Receipt Function(Receipt) update,
  ) async {
    await load();
    final report = findReport(reportLocalId);
    if (report == null) return;

    final updatedItems = <ExpenseItem>[];
    var found = false;
    for (final item in report.items) {
      final updatedReceipts = <Receipt>[];
      var itemChanged = false;
      for (final receipt in item.receipts) {
        if (receipt.localId == receiptLocalId) {
          updatedReceipts.add(update(receipt));
          found = true;
          itemChanged = true;
        } else {
          updatedReceipts.add(receipt);
        }
      }
      updatedItems.add(
        itemChanged ? item.copyWith(receipts: updatedReceipts) : item,
      );
    }

    if (!found) {
      return;
    }

    await _replace(
      report.copyWith(items: updatedItems, updatedAt: DateTime.now().toUtc()),
    );
  }

  Map<String, Object?> _safeReceiptPayload(
    ExpenseReport report,
    ExpenseItem item,
    Receipt receipt,
  ) {
    return {
      'tenant_id': report.tenantId,
      'report_local_id': report.localId,
      'report_server_id': report.serverId,
      'item_local_id': item.localId,
      'receipt_local_id': receipt.localId,
      'file_name': receipt.fileName,
      'mime_type': receipt.mimeType,
      'size_bytes': receipt.sizeBytes,
      'sha256_hash': receipt.sha256Hash,
      'capture_source': receipt.captureSource.name,
      'created_at': receipt.createdAt.toIso8601String(),
      // not included: localReference (path-like), raw file content, tokens
    };
  }

  Future<void> _replace(ExpenseReport updated) async {
    _reports = [
      for (final report in _reports)
        if (report.localId == updated.localId) updated else report,
    ];
    notifyListeners();
    await _persistReports();
  }

  Future<void> _persistReports() async {
    final allReports = await _localStore.loadReports();
    final otherTenants = allReports
        .where((report) => report.tenantId != _session.activeTenant.tenantId)
        .toList(growable: false);
    await _localStore.saveReports([...otherTenants, ..._reports]);
  }

  void _refreshSequences() {
    for (final report in _reports) {
      final reportNumber = _suffixNumber(report.localId, 'PC-local-');
      if (reportNumber >= _reportSequence) {
        _reportSequence = reportNumber + 1;
      }

      for (final item in report.items) {
        final itemNumber = _suffixNumber(item.localId, 'item-local-');
        if (itemNumber >= _itemSequence) {
          _itemSequence = itemNumber + 1;
        }

        for (final receipt in item.receipts) {
          final receiptNumber = _suffixNumber(
            receipt.localId,
            'receipt-local-',
          );
          if (receiptNumber >= _receiptSequence) {
            _receiptSequence = receiptNumber + 1;
          }
        }
      }
    }
  }
}

final expenseLocalStoreProvider = Provider<ExpenseLocalStore>(
  (ref) => DriftExpenseLocalStore(ref.watch(appDatabaseProvider)),
);

final expenseRepositoryProvider = Provider<LocalExpenseRepository>((ref) {
  final session = ref
      .watch(bootstrapSessionProvider)
      .maybeWhen(data: (value) => value, orElse: () => devBootstrapSession);

  return LocalExpenseRepository(
    session: session,
    syncQueue: ref.watch(syncQueueRepositoryProvider),
    actionFactory: ref.watch(syncActionFactoryProvider),
    localStore: ref.watch(expenseLocalStoreProvider),
  );
});

int _suffixNumber(String value, String prefix) {
  if (!value.startsWith(prefix)) {
    return 0;
  }
  return int.tryParse(value.substring(prefix.length)) ?? 0;
}

List<ExpenseReport> _initialReports(BootstrapSession session) {
  final tenantId = session.activeTenant.tenantId;
  return [
    ExpenseReport(
      localId: 'PC-local-1',
      title: 'Prestação de Contas atendimento OS-1042',
      tenantId: tenantId,
      employeeId: session.user.userId,
      policyVersion: session.expensePolicy.version,
      status: ExpenseReportStatus.returned,
      advance: ExpenseAdvance(tenantId: tenantId, amount: 80),
      items: [
        ExpenseItem(
          localId: 'item-local-1',
          tenantId: tenantId,
          categoryId: 'fuel',
          amount: 184.90,
          date: DateTime.utc(2026, 6, 11),
          city: 'Sao Paulo',
          vendorName: 'Posto Demo',
        ),
      ],
    ),
    ExpenseReport(
      localId: 'PC-local-2',
      title: 'Prestação de Contas manutencao preventiva',
      tenantId: tenantId,
      employeeId: session.user.userId,
      policyVersion: session.expensePolicy.version,
      status: ExpenseReportStatus.approvedManager,
      advance: ExpenseAdvance(tenantId: tenantId, amount: 120),
      items: [
        ExpenseItem(
          localId: 'item-local-2',
          tenantId: tenantId,
          categoryId: 'meal',
          amount: 42,
          date: DateTime.utc(2026, 6, 10),
          city: 'Campinas',
          vendorName: 'Restaurante Demo',
        ),
      ],
    ),
  ];
}
