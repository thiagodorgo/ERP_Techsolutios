import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/auth/auth_notifier.dart';
import '../../../core/config/app_config.dart';
import '../../../core/network/api_contracts.dart';
import '../../../core/network/api_error.dart';
import '../../../core/network/http_client.dart';
import '../domain/registry_options.dart';

/// Fonte das listas de cadastro (viaturas/equipes) usadas nos seletores da OS.
abstract class RegistryOptionsApi {
  Future<List<VehicleOption>> fetchVehicles();
  Future<List<TeamOption>> fetchTeams();
}

/// Implementação real via Dio autenticado. Endpoints:
///   GET /api/v1/vehicles  -> { data: { items: [{ id, plate, model }] } }
///   GET /api/v1/teams     -> { data: { items: [{ id, name }] } }
class DioRegistryOptionsApi implements RegistryOptionsApi {
  DioRegistryOptionsApi(this._dio);

  final Dio _dio;

  static DioRegistryOptionsApi create(ApiConfig config) =>
      DioRegistryOptionsApi(createExpenseHttpClient(config));

  @override
  Future<List<VehicleOption>> fetchVehicles() async {
    try {
      final resp = await _dio.get<Map<String, dynamic>>(
        WorkOrderApiEndpoints.vehicles,
      );
      // Descarta itens sem campo exibível — o seletor nunca mostra UUID cru.
      return _items(resp.data)
          .map(_vehicleFromJson)
          .where(
            (v) =>
                v.id.isNotEmpty &&
                (v.plate.trim().isNotEmpty || v.model.trim().isNotEmpty),
          )
          .toList(growable: false);
    } on DioException catch (e) {
      throw mapDioError(e);
    }
  }

  @override
  Future<List<TeamOption>> fetchTeams() async {
    try {
      final resp = await _dio.get<Map<String, dynamic>>(
        WorkOrderApiEndpoints.teams,
      );
      return _items(resp.data)
          .map(_teamFromJson)
          .where((t) => t.id.isNotEmpty && t.name.trim().isNotEmpty)
          .toList(growable: false);
    } on DioException catch (e) {
      throw mapDioError(e);
    }
  }

  // Envelope tolerante: aceita { data: { items } }, { items } ou lista pura.
  List<Map<String, dynamic>> _items(Map<String, dynamic>? body) {
    if (body == null) return const [];
    final data = body['data'];
    final container = data is Map<String, dynamic> ? data : body;
    final raw = container['items'] ?? body['items'] ?? const <dynamic>[];
    if (raw is! List) return const [];
    return raw.whereType<Map>().map(Map<String, dynamic>.from).toList();
  }

  VehicleOption _vehicleFromJson(Map<String, dynamic> j) => VehicleOption(
    id: _str(j['id']),
    plate: _str(j['plate']),
    model: _str(j['model']),
  );

  TeamOption _teamFromJson(Map<String, dynamic> j) =>
      TeamOption(id: _str(j['id']), name: _str(j['name']));

  String _str(Object? value) => value is String ? value : '';
}

// Devolve o cliente Dio quando ERP_AUTH_MODE=remote e há token; caso contrário
// null — o controller degrada para listas vazias (sem dados fabricados offline).
final registryOptionsApiProvider = Provider<RegistryOptionsApi?>((ref) {
  if (!kIsRemoteAuth) return null;
  final config = ref.watch(authenticatedApiConfigProvider);
  if (config.accessToken == null) return null;
  return DioRegistryOptionsApi.create(config);
});

/// Carrega viaturas + equipes para os seletores. Offline/local/dev ou falha de
/// rede: degrada com segurança para [RegistryOptions.empty].
final registryOptionsControllerProvider = FutureProvider<RegistryOptions>((
  ref,
) async {
  final api = ref.watch(registryOptionsApiProvider);
  if (api == null) return RegistryOptions.empty;
  try {
    final vehicles = await api.fetchVehicles();
    final teams = await api.fetchTeams();
    return RegistryOptions(vehicles: vehicles, teams: teams);
  } on ApiError {
    return RegistryOptions.empty;
  } catch (e, stack) {
    // Falha inesperada não pode quebrar a tela; segue offline-safe.
    if (kDebugMode) {
      debugPrint('registryOptions load failed: $e\n$stack');
    }
    return RegistryOptions.empty;
  }
});
