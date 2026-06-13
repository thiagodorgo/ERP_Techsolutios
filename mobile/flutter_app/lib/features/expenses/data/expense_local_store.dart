import 'dart:convert';
import 'dart:io';

import 'package:path_provider/path_provider.dart';

import '../domain/expense_models.dart';

abstract class ExpenseLocalStore {
  Future<List<ExpenseReport>> loadReports();
  Future<void> saveReports(List<ExpenseReport> reports);
}

class InMemoryExpenseLocalStore implements ExpenseLocalStore {
  InMemoryExpenseLocalStore([
    List<ExpenseReport> seed = const <ExpenseReport>[],
  ]) : _reports = List<ExpenseReport>.from(seed);

  List<ExpenseReport> _reports;

  @override
  Future<List<ExpenseReport>> loadReports() async {
    return List.unmodifiable(_reports);
  }

  @override
  Future<void> saveReports(List<ExpenseReport> reports) async {
    _reports = List<ExpenseReport>.from(reports);
  }
}

class JsonFileExpenseLocalStore implements ExpenseLocalStore {
  JsonFileExpenseLocalStore.appDocuments({
    this.fileName = 'expense_reports.json',
  }) : _file = null;

  JsonFileExpenseLocalStore.file(File file) : _file = file, fileName = null;

  final File? _file;
  final String? fileName;

  @override
  Future<List<ExpenseReport>> loadReports() async {
    final file = await _resolveFile();
    if (!await file.exists()) {
      return const <ExpenseReport>[];
    }

    final content = await file.readAsString();
    if (content.trim().isEmpty) {
      return const <ExpenseReport>[];
    }

    final decoded = jsonDecode(content) as List<dynamic>;
    return decoded
        .map(
          (item) => ExpenseReportCodec.fromJson(item as Map<String, dynamic>),
        )
        .toList(growable: false);
  }

  @override
  Future<void> saveReports(List<ExpenseReport> reports) async {
    final file = await _resolveFile();
    await file.parent.create(recursive: true);
    final encoded = reports
        .map(ExpenseReportCodec.toJson)
        .toList(growable: false);
    await file.writeAsString(jsonEncode(encoded), flush: true);
  }

  Future<File> _resolveFile() async {
    final fixed = _file;
    if (fixed != null) {
      return fixed;
    }

    final directory = await getApplicationDocumentsDirectory();
    return File('${directory.path}/${fileName ?? 'expense_reports.json'}');
  }
}

class ExpenseReportCodec {
  const ExpenseReportCodec._();

  static Map<String, Object?> toJson(ExpenseReport report) {
    return {
      'local_id': report.localId,
      'server_id': report.serverId,
      'title': report.title,
      'tenant_id': report.tenantId,
      'employee_id': report.employeeId,
      'policy_version': report.policyVersion,
      'status': report.status.name,
      'items': report.items.map(_itemToJson).toList(growable: false),
      'advance': report.advance == null
          ? null
          : {
              'tenant_id': report.advance!.tenantId,
              'amount': report.advance!.amount,
            },
      'created_at': report.createdAt?.toIso8601String(),
      'updated_at': report.updatedAt?.toIso8601String(),
    };
  }

  static ExpenseReport fromJson(Map<String, dynamic> json) {
    final advance = json['advance'] as Map<String, dynamic>?;
    return ExpenseReport(
      localId: json['local_id'] as String,
      serverId: json['server_id'] as String?,
      title: json['title'] as String? ?? 'Prestação de Contas',
      tenantId: json['tenant_id'] as String,
      employeeId: json['employee_id'] as String,
      policyVersion: json['policy_version'] as String,
      status: ExpenseReportStatus.values.byName(json['status'] as String),
      items: ((json['items'] as List<dynamic>?) ?? const <dynamic>[])
          .map((item) => _itemFromJson(item as Map<String, dynamic>))
          .toList(growable: false),
      advance: advance == null
          ? null
          : ExpenseAdvance(
              tenantId: advance['tenant_id'] as String,
              amount: (advance['amount'] as num).toDouble(),
            ),
      createdAt: json['created_at'] == null
          ? null
          : DateTime.parse(json['created_at'] as String),
      updatedAt: json['updated_at'] == null
          ? null
          : DateTime.parse(json['updated_at'] as String),
    );
  }

  static Map<String, Object?> _itemToJson(ExpenseItem item) {
    return {
      'local_id': item.localId,
      'tenant_id': item.tenantId,
      'category_id': item.categoryId,
      'amount': item.amount,
      'date': item.date.toIso8601String(),
      'city': item.city,
      'vendor_name': item.vendorName,
      'receipts': item.receipts.map(_receiptToJson).toList(growable: false),
    };
  }

  static ExpenseItem _itemFromJson(Map<String, dynamic> json) {
    return ExpenseItem(
      localId: json['local_id'] as String,
      tenantId: json['tenant_id'] as String,
      categoryId: json['category_id'] as String,
      amount: (json['amount'] as num).toDouble(),
      date: DateTime.parse(json['date'] as String),
      city: json['city'] as String?,
      vendorName: json['vendor_name'] as String?,
      receipts: ((json['receipts'] as List<dynamic>?) ?? const <dynamic>[])
          .map((receipt) => _receiptFromJson(receipt as Map<String, dynamic>))
          .toList(growable: false),
    );
  }

  static Map<String, Object?> _receiptToJson(Receipt receipt) {
    return {
      'local_id': receipt.localId,
      'server_id': receipt.serverId,
      'tenant_id': receipt.tenantId,
      'report_local_id': receipt.reportLocalId,
      'item_local_id': receipt.itemLocalId,
      'file_name': receipt.fileName,
      'mime_type': receipt.mimeType,
      'size_bytes': receipt.sizeBytes,
      'local_reference': receipt.localReference,
      'sha256_hash': receipt.sha256Hash,
      'capture_source': receipt.captureSource.name,
      'upload_status': receipt.uploadStatus.name,
      'ocr_status': receipt.ocrStatus.name,
      'ocr_extracted_fields': receipt.ocrExtractedFields,
      'user_reviewed_fields': receipt.userReviewedFields,
      'created_at': receipt.createdAt.toIso8601String(),
      'updated_at': receipt.updatedAt?.toIso8601String(),
    };
  }

  static Receipt _receiptFromJson(Map<String, dynamic> json) {
    // backward compat: sha256 was the previous field name
    final sha256Hash = (json['sha256_hash'] ?? json['sha256']) as String?;

    final captureSourceStr = json['capture_source'] as String?;
    final captureSource = captureSourceStr != null
        ? ReceiptCaptureSource.values.byName(captureSourceStr)
        : ReceiptCaptureSource.manualPlaceholder;

    final uploadStatusStr = json['upload_status'] as String;
    // backward compat: pendingUpload was renamed to pending
    final uploadStatus = uploadStatusStr == 'pendingUpload'
        ? ReceiptUploadStatus.pending
        : ReceiptUploadStatus.values.byName(uploadStatusStr);

    final ocrStatusStr = json['ocr_status'] as String?;
    final ocrStatus = ocrStatusStr != null
        ? ReceiptOcrStatus.values.byName(ocrStatusStr)
        : ReceiptOcrStatus.notStarted;

    final createdAtStr = json['created_at'] as String?;
    final createdAt = createdAtStr != null
        ? DateTime.parse(createdAtStr)
        : DateTime.utc(2026, 1, 1);

    return Receipt(
      localId: json['local_id'] as String,
      serverId: json['server_id'] as String?,
      tenantId: json['tenant_id'] as String,
      reportLocalId: json['report_local_id'] as String?,
      itemLocalId: json['item_local_id'] as String?,
      fileName: json['file_name'] as String? ?? 'comprovante',
      mimeType: json['mime_type'] as String? ?? 'image/jpeg',
      sizeBytes: (json['size_bytes'] as num?)?.toInt() ?? 0,
      localReference: json['local_reference'] as String?,
      sha256Hash: sha256Hash,
      captureSource: captureSource,
      uploadStatus: uploadStatus,
      ocrStatus: ocrStatus,
      ocrExtractedFields: json['ocr_extracted_fields'] == null
          ? null
          : Map<String, Object?>.from(json['ocr_extracted_fields'] as Map),
      userReviewedFields: json['user_reviewed_fields'] == null
          ? null
          : Map<String, Object?>.from(json['user_reviewed_fields'] as Map),
      createdAt: createdAt,
      updatedAt: json['updated_at'] == null
          ? null
          : DateTime.parse(json['updated_at'] as String),
    );
  }
}
