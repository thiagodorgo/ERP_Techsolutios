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
  pendingUpload,
  uploading,
  uploaded,
  failed,
}

enum PolicyViolationSeverity {
  warning,
  blocking,
}

class Receipt extends Equatable {
  const Receipt({
    required this.localId,
    required this.tenantId,
    required this.sha256,
    required this.uploadStatus,
  });

  final String localId;
  final String tenantId;
  final String sha256;
  final ReceiptUploadStatus uploadStatus;

  @override
  List<Object?> get props => [localId, tenantId, sha256, uploadStatus];
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
  const ExpenseAdvance({
    required this.tenantId,
    required this.amount,
  });

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
    this.serverId,
    this.items = const <ExpenseItem>[],
    this.advance,
  });

  final String localId;
  final String? serverId;
  final String tenantId;
  final String employeeId;
  final String policyVersion;
  final ExpenseReportStatus status;
  final List<ExpenseItem> items;
  final ExpenseAdvance? advance;

  bool belongsToTenant(String activeTenantId) => tenantId == activeTenantId;

  @override
  List<Object?> get props => [
        localId,
        serverId,
        tenantId,
        employeeId,
        policyVersion,
        status,
        items,
        advance,
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
