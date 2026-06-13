import 'package:dio/dio.dart';

import '../../../core/bootstrap/bootstrap_session.dart';
import '../../../core/network/api_contracts.dart';
import '../../../core/network/http_client.dart';
import '../domain/expense_models.dart';
import 'expense_local_store.dart';

abstract class ExpenseRemoteApi {
  Future<ExpensePolicySnapshot> fetchPolicies();
  Future<List<ExpenseCategorySnapshot>> fetchCategories();
  Future<List<ExpenseReport>> listReports();
  Future<ExpenseReport> createReport(ExpenseReport report);
  Future<ExpenseReport> getReport(String reportId);
  Future<ExpenseReport> patchReport(ExpenseReport report);
  Future<ExpenseItem> createItem({
    required String reportId,
    required ExpenseItem item,
  });
  Future<ExpenseReport> submitReport(String reportId);
}

// Stub used before HTTP integration is active.
class PendingBackendExpenseRemoteApi implements ExpenseRemoteApi {
  const PendingBackendExpenseRemoteApi();

  @override
  Future<ExpensePolicySnapshot> fetchPolicies() =>
      _pending(ExpenseApiEndpoints.expensePolicies);

  @override
  Future<List<ExpenseCategorySnapshot>> fetchCategories() =>
      _pending(ExpenseApiEndpoints.expenseCategories);

  @override
  Future<List<ExpenseReport>> listReports() =>
      _pending(ExpenseApiEndpoints.expenseReports);

  @override
  Future<ExpenseReport> createReport(ExpenseReport report) =>
      _pending(ExpenseApiEndpoints.expenseReports);

  @override
  Future<ExpenseReport> getReport(String reportId) =>
      _pending(ExpenseApiEndpoints.expenseReport(reportId));

  @override
  Future<ExpenseReport> patchReport(ExpenseReport report) =>
      _pending(ExpenseApiEndpoints.expenseReport(report.localId));

  @override
  Future<ExpenseItem> createItem({
    required String reportId,
    required ExpenseItem item,
  }) => _pending(ExpenseApiEndpoints.expenseReportItems(reportId));

  @override
  Future<ExpenseReport> submitReport(String reportId) =>
      _pending(ExpenseApiEndpoints.submitExpenseReport(reportId));

  Future<T> _pending<T>(String endpoint) {
    throw UnimplementedError(
      'HTTP integration pending for $endpoint. Local-first repository active.',
    );
  }
}

class DioExpenseRemoteApi implements ExpenseRemoteApi {
  DioExpenseRemoteApi(this._client);

  final Dio _client;

  @override
  Future<ExpensePolicySnapshot> fetchPolicies() async {
    try {
      final response = await _client.get(ExpenseApiEndpoints.expensePolicies);
      return _policyFromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw mapDioError(e);
    }
  }

  @override
  Future<List<ExpenseCategorySnapshot>> fetchCategories() async {
    try {
      final response = await _client.get(ExpenseApiEndpoints.expenseCategories);
      final list = response.data as List<dynamic>;
      return list
          .map((item) => _categoryFromJson(item as Map<String, dynamic>))
          .toList(growable: false);
    } on DioException catch (e) {
      throw mapDioError(e);
    }
  }

  @override
  Future<List<ExpenseReport>> listReports() async {
    try {
      final response = await _client.get(ExpenseApiEndpoints.expenseReports);
      final list = response.data as List<dynamic>;
      return list
          .map(
            (item) => ExpenseReportCodec.fromJson(item as Map<String, dynamic>),
          )
          .toList(growable: false);
    } on DioException catch (e) {
      throw mapDioError(e);
    }
  }

  @override
  Future<ExpenseReport> createReport(ExpenseReport report) async {
    try {
      final response = await _client.post(
        ExpenseApiEndpoints.expenseReports,
        data: ExpenseReportCodec.toJson(report),
      );
      return ExpenseReportCodec.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw mapDioError(e);
    }
  }

  @override
  Future<ExpenseReport> getReport(String reportId) async {
    try {
      final response = await _client.get(
        ExpenseApiEndpoints.expenseReport(reportId),
      );
      return ExpenseReportCodec.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw mapDioError(e);
    }
  }

  @override
  Future<ExpenseReport> patchReport(ExpenseReport report) async {
    try {
      final serverId = report.serverId ?? report.localId;
      final response = await _client.patch(
        ExpenseApiEndpoints.expenseReport(serverId),
        data: ExpenseReportCodec.toJson(report),
      );
      return ExpenseReportCodec.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw mapDioError(e);
    }
  }

  @override
  Future<ExpenseItem> createItem({
    required String reportId,
    required ExpenseItem item,
  }) async {
    try {
      final response = await _client.post(
        ExpenseApiEndpoints.expenseReportItems(reportId),
        data: _itemToJson(item),
      );
      return _itemFromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw mapDioError(e);
    }
  }

  @override
  Future<ExpenseReport> submitReport(String reportId) async {
    try {
      final response = await _client.post(
        ExpenseApiEndpoints.submitExpenseReport(reportId),
      );
      return ExpenseReportCodec.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw mapDioError(e);
    }
  }

  // ── JSON helpers ──────────────────────────────────────────────────────────

  ExpensePolicySnapshot _policyFromJson(Map<String, dynamic> json) {
    final rawLimits =
        (json['categoryLimits'] as Map<String, dynamic>?) ?? const {};
    final rawRequired =
        (json['receiptRequiredCategories'] as List<dynamic>?) ?? const [];
    return ExpensePolicySnapshot(
      version: json['version'] as String,
      categoryLimits: rawLimits.map(
        (k, v) => MapEntry(k, (v as num).toDouble()),
      ),
      receiptRequiredCategories: rawRequired.cast<String>().toSet(),
    );
  }

  ExpenseCategorySnapshot _categoryFromJson(Map<String, dynamic> json) {
    return ExpenseCategorySnapshot(
      id: json['id'] as String,
      label: json['label'] as String,
      requiresReceipt: json['requiresReceipt'] as bool? ?? false,
      limit: json['limit'] == null ? null : (json['limit'] as num).toDouble(),
    );
  }

  Map<String, Object?> _itemToJson(ExpenseItem item) {
    return {
      'local_id': item.localId,
      'tenant_id': item.tenantId,
      'category_id': item.categoryId,
      'amount': item.amount,
      'date': item.date.toIso8601String(),
      'city': item.city,
      'vendor_name': item.vendorName,
    };
  }

  ExpenseItem _itemFromJson(Map<String, dynamic> json) {
    return ExpenseItem(
      localId: json['local_id'] as String,
      tenantId: json['tenant_id'] as String,
      categoryId: json['category_id'] as String,
      amount: (json['amount'] as num).toDouble(),
      date: DateTime.parse(json['date'] as String),
      city: json['city'] as String?,
      vendorName: json['vendor_name'] as String?,
    );
  }
}
