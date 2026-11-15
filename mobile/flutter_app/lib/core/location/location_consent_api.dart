import 'package:dio/dio.dart';

import '../network/api_contracts.dart';
import '../network/api_error.dart';
import '../network/http_client.dart';
import 'location_consent_store.dart';

/// Como a organização tratou a decisão (contrato
/// `mobile_location_consent@2026-11.b-san3-17`).
enum LocationConsentApiStatus {
  /// Registrada (inclusive a reafirmação de um aceite).
  applied,

  /// Um aceite não posterior à última alteração do cadastro: nada foi gravado,
  /// e o titular confirma de novo (P12).
  superseded,
}

class LocationConsentApiResult {
  const LocationConsentApiResult({
    required this.status,
    required this.granted,
    this.grantedAt,
    this.profileUpdatedAt,
  });

  final LocationConsentApiStatus status;
  final bool granted;
  final DateTime? grantedAt;

  /// O `profile_updated_at` que a organização devolve; depois de um
  /// `superseded`, a nova confirmação é posterior a ele (CR17R2-04).
  final DateTime? profileUpdatedAt;
}

/// A organização recusou com motivo (`error.reason` da resposta), lido ANTES de
/// `mapDioError`, que o perderia. Fica fora da hierarquia selada de
/// `ApiError`: 422 `operator_profile_required` e `tracking_consent_required`,
/// 403 do aceite e 400 do aceite. Na decisão de consentimento, só as recusas
/// de domínio de [locationConsentDomainRefusals] (Emenda 1.9, E18C-02).
class LocationConsentRefusedError implements Exception {
  const LocationConsentRefusedError(this.reason, {this.statusCode = 422});

  final String reason;
  final int statusCode;

  @override
  String toString() => 'LocationConsentRefusedError($statusCode, $reason)';
}

/// O aceite (`POST /mobile/location-consent`) e a revogação
/// (`POST /mobile/location-consent/revoke`) do PRÓPRIO consentimento.
abstract class LocationConsentApi {
  Future<LocationConsentApiResult> grant(LocationConsentDecision decision);
  Future<LocationConsentApiResult> revoke(LocationConsentDecision decision);
}

/// Sem sessão autenticada: nada sai; a decisão continua pendente.
class PendingLocationConsentApi implements LocationConsentApi {
  const PendingLocationConsentApi();

  @override
  Future<LocationConsentApiResult> grant(LocationConsentDecision decision) =>
      Future.error(const ApiIntegrationUnavailableError());

  @override
  Future<LocationConsentApiResult> revoke(LocationConsentDecision decision) =>
      Future.error(const ApiIntegrationUnavailableError());
}

class DioLocationConsentApi implements LocationConsentApi {
  const DioLocationConsentApi(this._client);

  final Dio _client;

  @override
  Future<LocationConsentApiResult> grant(LocationConsentDecision decision) =>
      _post(FieldLocationApiEndpoints.mobileLocationConsent, decision);

  @override
  Future<LocationConsentApiResult> revoke(LocationConsentDecision decision) =>
      _post(FieldLocationApiEndpoints.mobileLocationConsentRevoke, decision);

  Future<LocationConsentApiResult> _post(
    String path,
    LocationConsentDecision decision,
  ) async {
    try {
      final response = await _client.post<Map<String, dynamic>>(
        path,
        data: locationConsentPayloadFor(decision),
      );
      final body = response.data ?? const <String, dynamic>{};
      final rawData = body['data'];
      final data = rawData is Map<String, dynamic> ? rawData : body;
      return LocationConsentApiResult(
        status: data['status'] == 'superseded'
            ? LocationConsentApiStatus.superseded
            : LocationConsentApiStatus.applied,
        granted: data['granted'] == true,
        grantedAt: _parseDate(data['granted_at']),
        profileUpdatedAt: _parseDate(data['profile_updated_at']),
      );
    } on DioException catch (error) {
      final refusal = locationConsentDomainRefusalOf(error);
      if (refusal != null) throw refusal;
      throw mapDioError(error);
    }
  }
}

/// Emenda 1.9 (E18C-02): as recusas de DOMÍNIO da decisão de consentimento,
/// por status, com o código e os motivos que a organização manda. Só elas
/// viram [LocationConsentRefusedError]. O resto não é recusa: o 400 genérico
/// (`BAD_REQUEST` `invalid_request`, o do banco ocupado antes da 1.9), os 5xx
/// (inclusive o 503 `field_location_busy`), o 403 que não é de permissão
/// (`password_change_required`) e o tempo esgotado. Nesses, a decisão
/// continua pendente e nada é apagado.
const Map<int, ({String code, Set<String> reasons})>
locationConsentDomainRefusals = {
  400: (
    code: 'FIELD_LOCATION_INVALID',
    reasons: {
      'invalid_date',
      'invalid_client_action_id',
      'invalid_text_version',
    },
  ),
  403: (
    code: 'FORBIDDEN',
    reasons: {'permission_required', 'role_required', 'tenant_required'},
  ),
  422: (
    code: 'FIELD_LOCATION_PROFILE_REQUIRED',
    reasons: {'operator_profile_required'},
  ),
};

/// `true` quando o par (status, motivo) é uma recusa de domínio da decisão.
bool isLocationConsentDomainRefusal(int statusCode, String reason) =>
    locationConsentDomainRefusals[statusCode]?.reasons.contains(reason) ??
    false;

/// A recusa de domínio da resposta, ou `null` (segue para `mapDioError`).
LocationConsentRefusedError? locationConsentDomainRefusalOf(
  DioException error,
) {
  final status = error.response?.statusCode;
  if (status == null) return null;
  final rule = locationConsentDomainRefusals[status];
  if (rule == null) return null;
  final body = error.response?.data;
  final rawError = body is Map ? body['error'] : null;
  final code = rawError is Map ? rawError['code'] : null;
  final reason = rawError is Map ? rawError['reason'] : null;
  if (code != rule.code || reason is! String) return null;
  if (!rule.reasons.contains(reason)) return null;
  return LocationConsentRefusedError(reason, statusCode: status);
}

/// O corpo da decisão: `{ decided_at, client_action_id, text_version }`. Nunca
/// leva organização nem usuário: os dois vêm do ator autenticado.
Map<String, Object?> locationConsentPayloadFor(
  LocationConsentDecision decision,
) => {
  'decided_at': decision.decidedAt.toUtc().toIso8601String(),
  'client_action_id': decision.clientActionId,
  'text_version': decision.textVersion,
};

/// Lê o motivo da recusa de uma resposta de erro com status em [statuses].
/// Devolve `null` para os demais (que seguem para `mapDioError`).
LocationConsentRefusedError? locationConsentRefusalOf(
  DioException error, {
  required Set<int> statuses,
  Set<String>? reasons,
}) {
  final status = error.response?.statusCode;
  if (status == null || !statuses.contains(status)) return null;
  final body = error.response?.data;
  final rawError = body is Map ? body['error'] : null;
  final reason = rawError is Map ? rawError['reason'] : null;
  if (reasons != null && (reason is! String || !reasons.contains(reason))) {
    return null;
  }
  return LocationConsentRefusedError(
    reason is String && reason.isNotEmpty ? reason : 'unknown',
    statusCode: status,
  );
}

DateTime? _parseDate(Object? value) {
  if (value is! String || value.trim().isEmpty) return null;
  return DateTime.tryParse(value)?.toUtc();
}
