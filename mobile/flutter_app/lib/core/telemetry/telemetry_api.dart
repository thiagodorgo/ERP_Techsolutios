import 'package:dio/dio.dart';

import '../network/api_contracts.dart';
import '../network/http_client.dart';
import 'telemetry_codec.dart';
import 'telemetry_event.dart';

/// Cliente HTTP da telemetria — POST em lote para `/api/v1/mobile/telemetry`.
abstract class TelemetryApi {
  Future<List<TelemetrySyncResult>> sendBatch(List<TelemetryEvent> events);
}

/// Stub seguro: enquanto não há token (não autenticado), não envia — devolve
/// vazio para que os eventos permaneçam `pending` no buffer (offline-first).
class PendingTelemetryApi implements TelemetryApi {
  const PendingTelemetryApi();

  @override
  Future<List<TelemetrySyncResult>> sendBatch(
    List<TelemetryEvent> events,
  ) async => const <TelemetrySyncResult>[];
}

class DioTelemetryApi implements TelemetryApi {
  DioTelemetryApi(this._client, {TelemetryCodec? codec})
    : _codec = codec ?? const TelemetryCodec();

  final Dio _client;
  final TelemetryCodec _codec;

  @override
  Future<List<TelemetrySyncResult>> sendBatch(
    List<TelemetryEvent> events,
  ) async {
    try {
      final response = await _client.post(
        TelemetryApiEndpoints.mobileTelemetry,
        data: _codec.encodeRequest(events),
      );
      return _codec.decodeResponse(response.data);
    } on DioException catch (error) {
      throw mapDioError(error);
    }
  }
}
