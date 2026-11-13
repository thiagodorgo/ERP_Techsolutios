import 'package:dio/dio.dart';

import '../../../core/network/api_contracts.dart';
import '../../../core/network/http_client.dart';
import '../domain/prestador_models.dart';

/// 403 de `GET /mobile/technician/stock`: o perfil não tem `inventory.read`.
/// Distinto dos demais erros para o repositório apagar a lista salva (P5).
class TechnicianStockForbiddenError implements Exception {
  const TechnicianStockForbiddenError();
}

class TechnicianStockResponse {
  const TechnicianStockResponse({
    required this.items,
    required this.custody,
    required this.generatedAt,
  });

  final List<TechnicianStockItem> items;
  final TechnicianStockCustody? custody;
  final DateTime generatedAt;
}

abstract class TechnicianStockRemoteApi {
  Future<TechnicianStockResponse> fetchTechnicianStock();
}

class DioTechnicianStockRemoteApi implements TechnicianStockRemoteApi {
  DioTechnicianStockRemoteApi(this._dio);

  final Dio _dio;

  static DioTechnicianStockRemoteApi create(ApiConfig config) =>
      DioTechnicianStockRemoteApi(createExpenseHttpClient(config));

  @override
  Future<TechnicianStockResponse> fetchTechnicianStock() async {
    try {
      final resp = await _dio.get<Map<String, dynamic>>(
        InventoryApiEndpoints.technicianStock,
      );
      final data = (resp.data ?? const <String, dynamic>{})['data'];
      return _fromJson(data is Map<String, dynamic> ? data : null);
    } on DioException catch (e) {
      if (e.response?.statusCode == 403) {
        throw const TechnicianStockForbiddenError();
      }
      throw mapDioError(e);
    }
  }
}

TechnicianStockResponse _fromJson(Map<String, dynamic>? data) {
  final custodyJson = data?['custody'];
  final custody = custodyJson is Map<String, dynamic>
      ? TechnicianStockCustody(
          kind: custodyJson['kind'] as String? ?? 'professional',
          label: custodyJson['label'] as String? ?? '',
        )
      : null;

  final items = <TechnicianStockItem>[
    for (final raw in (data?['items'] as List<dynamic>? ?? const []))
      if (raw is Map<String, dynamic>)
        TechnicianStockItem(
          sku: raw['sku'] as String? ?? '',
          name: raw['name'] as String? ?? '',
          available: (raw['available'] as num?) ?? 0,
          unit: raw['unit'] as String? ?? '',
        ),
  ];

  final generatedAt = data?['generatedAt'] is String
      ? DateTime.tryParse(data!['generatedAt'] as String) ?? DateTime.now()
      : DateTime.now();

  return TechnicianStockResponse(
    items: items,
    custody: custody,
    generatedAt: generatedAt,
  );
}
