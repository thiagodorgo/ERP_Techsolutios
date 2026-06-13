import 'package:equatable/equatable.dart';

enum ExpenseReportStatus {
  draft,
  syncPending,
  readyToSubmit,
  submitted,
  underReview,
  returned,
  approvedManager,
  approvedFinance,
  rejected,
  scheduledForPayment,
  paid,
  cancelled,
}

enum ReceiptUploadStatus {
  local,
  pending,
  uploading,
  uploaded,
  failed,
  conflict,
}

enum ReceiptCaptureSource { camera, gallery, file, manualPlaceholder }

enum ReceiptOcrStatus { notStarted, pending, reviewed, failed, unavailable }

enum PolicyViolationSeverity { warning, blocking }

class Receipt extends Equatable {
  const Receipt({
    required this.localId,
    required this.tenantId,
    required this.captureSource,
    required this.uploadStatus,
    required this.createdAt,
    this.serverId,
    this.reportLocalId,
    this.itemLocalId,
    this.fileName = 'comprovante',
    this.mimeType = 'image/jpeg',
    this.sizeBytes = 0,
    this.localReference,
    this.sha256Hash,
    this.ocrStatus = ReceiptOcrStatus.notStarted,
    this.ocrExtractedFields,
    this.userReviewedFields,
    this.updatedAt,
  });

  final String localId;
  final String? serverId;
  final String tenantId;
  final String? reportLocalId;
  final String? itemLocalId;
  final String fileName;
  final String mimeType;
  final int sizeBytes;
  final String? localReference;
  final String? sha256Hash;
  final ReceiptCaptureSource captureSource;
  final ReceiptUploadStatus uploadStatus;
  final ReceiptOcrStatus ocrStatus;
  final Map<String, Object?>? ocrExtractedFields;
  final Map<String, Object?>? userReviewedFields;
  final DateTime createdAt;
  final DateTime? updatedAt;

  Receipt copyWith({
    String? localId,
    String? serverId,
    String? tenantId,
    String? reportLocalId,
    String? itemLocalId,
    String? fileName,
    String? mimeType,
    int? sizeBytes,
    String? localReference,
    String? sha256Hash,
    ReceiptCaptureSource? captureSource,
    ReceiptUploadStatus? uploadStatus,
    ReceiptOcrStatus? ocrStatus,
    Map<String, Object?>? ocrExtractedFields,
    Map<String, Object?>? userReviewedFields,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return Receipt(
      localId: localId ?? this.localId,
      serverId: serverId ?? this.serverId,
      tenantId: tenantId ?? this.tenantId,
      reportLocalId: reportLocalId ?? this.reportLocalId,
      itemLocalId: itemLocalId ?? this.itemLocalId,
      fileName: fileName ?? this.fileName,
      mimeType: mimeType ?? this.mimeType,
      sizeBytes: sizeBytes ?? this.sizeBytes,
      localReference: localReference ?? this.localReference,
      sha256Hash: sha256Hash ?? this.sha256Hash,
      captureSource: captureSource ?? this.captureSource,
      uploadStatus: uploadStatus ?? this.uploadStatus,
      ocrStatus: ocrStatus ?? this.ocrStatus,
      ocrExtractedFields: ocrExtractedFields ?? this.ocrExtractedFields,
      userReviewedFields: userReviewedFields ?? this.userReviewedFields,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  @override
  List<Object?> get props => [
    localId,
    serverId,
    tenantId,
    reportLocalId,
    itemLocalId,
    fileName,
    mimeType,
    sizeBytes,
    localReference,
    sha256Hash,
    captureSource,
    uploadStatus,
    ocrStatus,
    ocrExtractedFields,
    userReviewedFields,
    createdAt,
    updatedAt,
  ];
}

class ExpenseItem extends Equatable {
  const ExpenseItem({
    required this.localId,
    required this.tenantId,
    required this.categoryId,
    required this.amount,
    required this.date,
    this.city,
    this.vendorName,
    this.receipts = const <Receipt>[],
  });

  final String localId;
  final String tenantId;
  final String categoryId;
  final double amount;
  final DateTime date;
  final String? city;
  final String? vendorName;
  final List<Receipt> receipts;

  ExpenseItem copyWith({
    String? localId,
    String? tenantId,
    String? categoryId,
    double? amount,
    DateTime? date,
    String? city,
    String? vendorName,
    List<Receipt>? receipts,
  }) {
    return ExpenseItem(
      localId: localId ?? this.localId,
      tenantId: tenantId ?? this.tenantId,
      categoryId: categoryId ?? this.categoryId,
      amount: amount ?? this.amount,
      date: date ?? this.date,
      city: city ?? this.city,
      vendorName: vendorName ?? this.vendorName,
      receipts: receipts ?? this.receipts,
    );
  }

  @override
  List<Object?> get props => [
    localId,
    tenantId,
    categoryId,
    amount,
    date,
    city,
    vendorName,
    receipts,
  ];
}

class ExpenseAdvance extends Equatable {
  const ExpenseAdvance({required this.tenantId, required this.amount});

  final String tenantId;
  final double amount;

  @override
  List<Object?> get props => [tenantId, amount];
}

class ExpenseReport extends Equatable {
  const ExpenseReport({
    required this.localId,
    required this.tenantId,
    required this.employeeId,
    required this.policyVersion,
    required this.status,
    this.title = 'Prestação de Contas',
    this.serverId,
    this.items = const <ExpenseItem>[],
    this.advance,
    this.createdAt,
    this.updatedAt,
  });

  final String localId;
  final String? serverId;
  final String title;
  final String tenantId;
  final String employeeId;
  final String policyVersion;
  final ExpenseReportStatus status;
  final List<ExpenseItem> items;
  final ExpenseAdvance? advance;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  bool belongsToTenant(String activeTenantId) => tenantId == activeTenantId;

  ExpenseReport copyWith({
    String? localId,
    String? serverId,
    String? title,
    String? tenantId,
    String? employeeId,
    String? policyVersion,
    ExpenseReportStatus? status,
    List<ExpenseItem>? items,
    ExpenseAdvance? advance,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return ExpenseReport(
      localId: localId ?? this.localId,
      serverId: serverId ?? this.serverId,
      title: title ?? this.title,
      tenantId: tenantId ?? this.tenantId,
      employeeId: employeeId ?? this.employeeId,
      policyVersion: policyVersion ?? this.policyVersion,
      status: status ?? this.status,
      items: items ?? this.items,
      advance: advance ?? this.advance,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  @override
  List<Object?> get props => [
    localId,
    serverId,
    title,
    tenantId,
    employeeId,
    policyVersion,
    status,
    items,
    advance,
    createdAt,
    updatedAt,
  ];
}

class ExpensePolicy extends Equatable {
  const ExpensePolicy({
    required this.tenantId,
    required this.version,
    required this.categoryLimits,
    required this.receiptRequiredCategories,
  });

  final String tenantId;
  final String version;
  final Map<String, double> categoryLimits;
  final Set<String> receiptRequiredCategories;

  @override
  List<Object?> get props => [
    tenantId,
    version,
    categoryLimits,
    receiptRequiredCategories,
  ];
}

class PolicyViolation extends Equatable {
  const PolicyViolation({
    required this.code,
    required this.message,
    required this.severity,
    required this.itemLocalId,
  });

  final String code;
  final String message;
  final PolicyViolationSeverity severity;
  final String itemLocalId;

  @override
  List<Object?> get props => [code, message, severity, itemLocalId];
}

extension ExpenseReportStatusLabels on ExpenseReportStatus {
  String get label {
    return switch (this) {
      ExpenseReportStatus.draft => 'Rascunho',
      ExpenseReportStatus.syncPending => 'Sync pendente',
      ExpenseReportStatus.readyToSubmit => 'Pronto',
      ExpenseReportStatus.submitted => 'Enviado',
      ExpenseReportStatus.underReview => 'Em analise',
      ExpenseReportStatus.returned => 'Devolvido',
      ExpenseReportStatus.approvedManager => 'Aprovado manager',
      ExpenseReportStatus.approvedFinance => 'Aprovado finance',
      ExpenseReportStatus.rejected => 'Rejeitado',
      ExpenseReportStatus.scheduledForPayment => 'Pagamento agendado',
      ExpenseReportStatus.paid => 'Pago',
      ExpenseReportStatus.cancelled => 'Cancelado',
    };
  }

  String get statusTone {
    return switch (this) {
      ExpenseReportStatus.draft => 'info',
      ExpenseReportStatus.syncPending => 'warning',
      ExpenseReportStatus.readyToSubmit => 'info',
      ExpenseReportStatus.submitted => 'info',
      ExpenseReportStatus.underReview => 'warning',
      ExpenseReportStatus.returned => 'warning',
      ExpenseReportStatus.approvedManager => 'success',
      ExpenseReportStatus.approvedFinance => 'success',
      ExpenseReportStatus.rejected => 'danger',
      ExpenseReportStatus.scheduledForPayment => 'info',
      ExpenseReportStatus.paid => 'success',
      ExpenseReportStatus.cancelled => 'danger',
    };
  }
}
