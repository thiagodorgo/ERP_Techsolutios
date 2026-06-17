import 'package:dio/dio.dart';

import '../network/api_contracts.dart';
import '../network/api_error.dart';
import '../network/http_client.dart';
import 'field_location_models.dart';

abstract class FieldLocationApi {
  Future<FieldLocationApiResponse> send(FieldLocationEvent event);
}

class FieldLocationApiResponse {
  const FieldLocationApiResponse({required this.serverId, this.receivedAt});

  final String serverId;
  final DateTime? receivedAt;
}

class PendingFieldLocationApi implements FieldLocationApi {
  const PendingFieldLocationApi();

  @override
  Future<FieldLocationApiResponse> send(FieldLocationEvent event) {
    return Future.error(const ApiIntegrationUnavailableError());
  }
}

class DioFieldLocationApi implements FieldLocationApi {
  const DioFieldLocationApi(this._client);

  final Dio _client;

  @override
  Future<FieldLocationApiResponse> send(FieldLocationEvent event) async {
    try {
      final response = await _client.post<Map<String, dynamic>>(
        FieldLocationApiEndpoints.mobileFieldLocations,
        data: fieldLocationPayloadForEvent(event),
      );
      final body = response.data ?? const <String, dynamic>{};
      final rawData = body['data'];
      final data = rawData is Map<String, dynamic> ? rawData : body;
      final id = data['id'] as String?;

      return FieldLocationApiResponse(
        serverId: id ?? event.serverId ?? event.localId,
        receivedAt: _parseDate(data['receivedAt'] ?? data['received_at']),
      );
    } on DioException catch (error) {
      throw mapDioError(error);
    }
  }
}

Map<String, Object?> fieldLocationPayloadForEvent(FieldLocationEvent event) {
  return {
    'latitude': event.latitude,
    'longitude': event.longitude,
    if (event.accuracyMeters != null) 'accuracyMeters': event.accuracyMeters,
    if (event.headingDegrees != null) 'headingDegrees': event.headingDegrees,
    if (event.speedMetersPerSecond != null)
      'speedMetersPerSecond': event.speedMetersPerSecond,
    if (event.batteryLevel != null) 'batteryLevel': event.batteryLevel,
    'recordedAt': event.recordedAt.toIso8601String(),
    'metadata': {
      if (event.workOrderServerId != null &&
          event.workOrderServerId!.trim().isNotEmpty)
        'work_order_id': event.workOrderServerId!.trim(),
      'work_order_local_id': event.workOrderLocalId,
      'event': 'manual_ping',
    },
  };
}

DateTime? _parseDate(Object? value) {
  if (value is! String || value.trim().isEmpty) return null;
  return DateTime.tryParse(value)?.toUtc();
}
