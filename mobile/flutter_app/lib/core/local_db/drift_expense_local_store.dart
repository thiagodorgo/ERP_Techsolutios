import 'dart:convert';

import 'package:drift/drift.dart';

import '../../features/expenses/data/expense_local_store.dart';
import '../../features/expenses/domain/expense_models.dart';
import 'app_database.dart';

class DriftExpenseLocalStore implements ExpenseLocalStore {
  DriftExpenseLocalStore(this._db);

  final AppDatabase _db;

  @override
  Future<List<ExpenseReport>> loadReports() async {
    final receiptRows = await _db
        .customSelect('SELECT * FROM expense_receipts')
        .get();
    final receiptsByItem = <String, List<Receipt>>{};
    for (final row in receiptRows) {
      final itemId = row.readNullable<String>('item_local_id');
      if (itemId == null) continue; // orphan receipt — skip association
      receiptsByItem.putIfAbsent(itemId, () => []).add(_receiptFromRow(row));
    }

    final itemRows = await _db
        .customSelect('SELECT * FROM expense_items')
        .get();
    final itemsByReport = <String, List<ExpenseItem>>{};
    for (final row in itemRows) {
      final reportId = row.read<String>('report_local_id');
      final itemId = row.read<String>('local_id');
      final receipts = receiptsByItem[itemId] ?? const <Receipt>[];
      itemsByReport
          .putIfAbsent(reportId, () => [])
          .add(_itemFromRow(row, receipts));
    }

    final reportRows = await _db
        .customSelect('SELECT * FROM expense_reports')
        .get();
    return reportRows.map((row) {
      final localId = row.read<String>('local_id');
      final items = itemsByReport[localId] ?? const <ExpenseItem>[];
      return _reportFromRow(row, items);
    }).toList();
  }

  @override
  Future<void> saveReports(List<ExpenseReport> reports) async {
    await _db.transaction(() async {
      await _db.customUpdate(
        'DELETE FROM expense_receipts',
        variables: <Variable>[],
      );
      await _db.customUpdate(
        'DELETE FROM expense_items',
        variables: <Variable>[],
      );
      await _db.customUpdate(
        'DELETE FROM expense_reports',
        variables: <Variable>[],
      );

      for (final report in reports) {
        await _db.customInsert(
          'INSERT INTO expense_reports '
          '(local_id,server_id,tenant_id,employee_id,title,policy_version,status,'
          'advance_amount,advance_tenant_id,created_at,updated_at) '
          'VALUES (?,?,?,?,?,?,?,?,?,?,?)',
          variables: <Variable>[
            Variable<String>(report.localId),
            Variable<String>(report.serverId),
            Variable<String>(report.tenantId),
            Variable<String>(report.employeeId),
            Variable<String>(report.title),
            Variable<String>(report.policyVersion),
            Variable<String>(report.status.name),
            Variable<double>(report.advance?.amount),
            Variable<String>(report.advance?.tenantId),
            Variable<int>(report.createdAt?.millisecondsSinceEpoch),
            Variable<int>(report.updatedAt?.millisecondsSinceEpoch),
          ],
        );

        for (final item in report.items) {
          await _db.customInsert(
            'INSERT INTO expense_items '
            '(local_id,tenant_id,report_local_id,category_id,amount,date,city,vendor_name) '
            'VALUES (?,?,?,?,?,?,?,?)',
            variables: <Variable>[
              Variable<String>(item.localId),
              Variable<String>(item.tenantId),
              Variable<String>(report.localId),
              Variable<String>(item.categoryId),
              Variable<double>(item.amount),
              Variable<int>(item.date.millisecondsSinceEpoch),
              Variable<String>(item.city),
              Variable<String>(item.vendorName),
            ],
          );

          for (final receipt in item.receipts) {
            await _db.customInsert(
              'INSERT INTO expense_receipts '
              '(local_id,server_id,tenant_id,report_local_id,item_local_id,'
              'file_name,mime_type,size_bytes,local_reference,sha256_hash,'
              'capture_source,upload_status,ocr_status,'
              'ocr_extracted_fields_json,user_reviewed_fields_json,'
              'created_at,updated_at) '
              'VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
              variables: <Variable>[
                Variable<String>(receipt.localId),
                Variable<String>(receipt.serverId),
                Variable<String>(receipt.tenantId),
                Variable<String>(receipt.reportLocalId ?? report.localId),
                Variable<String>(receipt.itemLocalId ?? item.localId),
                Variable<String>(receipt.fileName),
                Variable<String>(receipt.mimeType),
                Variable<int>(receipt.sizeBytes),
                Variable<String>(receipt.localReference),
                Variable<String>(receipt.sha256Hash),
                Variable<String>(receipt.captureSource.name),
                Variable<String>(receipt.uploadStatus.name),
                Variable<String>(receipt.ocrStatus.name),
                Variable<String>(
                  receipt.ocrExtractedFields != null
                      ? jsonEncode(receipt.ocrExtractedFields)
                      : null,
                ),
                Variable<String>(
                  receipt.userReviewedFields != null
                      ? jsonEncode(receipt.userReviewedFields)
                      : null,
                ),
                Variable<int>(receipt.createdAt.millisecondsSinceEpoch),
                Variable<int>(receipt.updatedAt?.millisecondsSinceEpoch),
              ],
            );
          }
        }
      }
    });
  }

  ExpenseReport _reportFromRow(QueryRow row, List<ExpenseItem> items) {
    final advanceAmount = row.readNullable<double>('advance_amount');
    final advanceTenantId = row.readNullable<String>('advance_tenant_id');
    final createdAtMs = row.readNullable<int>('created_at');
    final updatedAtMs = row.readNullable<int>('updated_at');
    return ExpenseReport(
      localId: row.read<String>('local_id'),
      serverId: row.readNullable<String>('server_id'),
      tenantId: row.read<String>('tenant_id'),
      employeeId: row.read<String>('employee_id'),
      title: row.read<String>('title'),
      policyVersion: row.read<String>('policy_version'),
      status: ExpenseReportStatus.values.byName(row.read<String>('status')),
      items: items,
      advance: advanceAmount != null && advanceTenantId != null
          ? ExpenseAdvance(tenantId: advanceTenantId, amount: advanceAmount)
          : null,
      createdAt: createdAtMs != null
          ? DateTime.fromMillisecondsSinceEpoch(createdAtMs, isUtc: true)
          : null,
      updatedAt: updatedAtMs != null
          ? DateTime.fromMillisecondsSinceEpoch(updatedAtMs, isUtc: true)
          : null,
    );
  }

  ExpenseItem _itemFromRow(QueryRow row, List<Receipt> receipts) {
    return ExpenseItem(
      localId: row.read<String>('local_id'),
      tenantId: row.read<String>('tenant_id'),
      categoryId: row.read<String>('category_id'),
      amount: row.read<double>('amount'),
      date: DateTime.fromMillisecondsSinceEpoch(
        row.read<int>('date'),
        isUtc: true,
      ),
      city: row.readNullable<String>('city'),
      vendorName: row.readNullable<String>('vendor_name'),
      receipts: receipts,
    );
  }

  Receipt _receiptFromRow(QueryRow row) {
    final ocrFieldsJson = row.readNullable<String>('ocr_extracted_fields_json');
    final reviewedFieldsJson = row.readNullable<String>(
      'user_reviewed_fields_json',
    );
    final updatedAtMs = row.readNullable<int>('updated_at');
    return Receipt(
      localId: row.read<String>('local_id'),
      serverId: row.readNullable<String>('server_id'),
      tenantId: row.read<String>('tenant_id'),
      reportLocalId: row.readNullable<String>('report_local_id'),
      itemLocalId: row.readNullable<String>('item_local_id'),
      fileName: row.read<String>('file_name'),
      mimeType: row.read<String>('mime_type'),
      sizeBytes: row.read<int>('size_bytes'),
      localReference: row.readNullable<String>('local_reference'),
      sha256Hash: row.readNullable<String>('sha256_hash'),
      captureSource: ReceiptCaptureSource.values.byName(
        row.read<String>('capture_source'),
      ),
      uploadStatus: ReceiptUploadStatus.values.byName(
        row.read<String>('upload_status'),
      ),
      ocrStatus: ReceiptOcrStatus.values.byName(row.read<String>('ocr_status')),
      ocrExtractedFields: ocrFieldsJson != null
          ? Map<String, Object?>.from(jsonDecode(ocrFieldsJson) as Map)
          : null,
      userReviewedFields: reviewedFieldsJson != null
          ? Map<String, Object?>.from(jsonDecode(reviewedFieldsJson) as Map)
          : null,
      createdAt: DateTime.fromMillisecondsSinceEpoch(
        row.read<int>('created_at'),
        isUtc: true,
      ),
      updatedAt: updatedAtMs != null
          ? DateTime.fromMillisecondsSinceEpoch(updatedAtMs, isUtc: true)
          : null,
    );
  }
}
