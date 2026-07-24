import 'telemetry_event.dart';

/// Resultado por evento decodificado da resposta do backend.
/// status ∈ accepted | already_applied | rejected (espelha
/// `TelemetryIngestResult` do serviço PR-12).
class TelemetrySyncResult {
  const TelemetrySyncResult({
    required this.clientActionId,
    required this.status,
    this.reason,
  });

  final String clientActionId;
  final String status;
  final String? reason;

  bool get isAccepted => status == 'accepted' || status == 'already_applied';
  bool get isRejected => status == 'rejected';
}

/// Codec do envelope de telemetria (D-Ω4C-TELE-FLUTTER-2.8).
///
/// Envelope: `{ client_batch_id, events: [ <flat> ] }` (≤50). Evento FLAT com só
/// os campos do contrato — camelCase nos campos + snake no envelope, como os
/// codecs de OS/checklist. NUNCA `tenant_id`/`token`/`path`/base64: o tenant e o
/// perfil são resolvidos pelo ATOR autenticado no backend.
class TelemetryCodec {
  const TelemetryCodec({String Function()? batchIdFactory})
    : _batchIdFactory = batchIdFactory;

  final String Function()? _batchIdFactory;

  Map<String, Object?> encodeRequest(List<TelemetryEvent> events) {
    return {
      'client_batch_id': _batchIdFactory?.call() ?? _buildBatchId(events),
      'events': events.map(_encodeEvent).toList(growable: false),
    };
  }

  List<TelemetrySyncResult> decodeResponse(Object? rawBody) {
    final outer = _asStringMap(rawBody);
    final data = _asStringMap(outer['data'] ?? outer);
    final rawResults = data['results'] ?? outer['results'];
    return _listOfMaps(rawResults)
        .where((item) => _clientActionId(item) != null)
        .map(
          (item) => TelemetrySyncResult(
            clientActionId: _clientActionId(item)!,
            status: _readNonEmptyString(item['status']) ?? 'rejected',
            reason: _readNonEmptyString(item['reason']),
          ),
        )
        .toList(growable: false);
  }

  Map<String, Object?> _encodeEvent(TelemetryEvent event) {
    // §2.8: SÓ os campos do contrato. lat/lng só quando presentes (heartbeat
    // consentido). Nenhuma chave de tenant/segredo/caminho é emitida.
    return <String, Object?>{
      'client_action_id': event.clientActionId,
      'eventType': event.eventType.wire,
      'capturedAt': event.capturedAt.toIso8601String(),
      if (event.hasGps) 'lat': event.latitude,
      if (event.hasGps) 'lng': event.longitude,
      if (event.accuracyMeters != null) 'accuracyM': event.accuracyMeters,
      if (event.speedKmh != null) 'speedKmh': event.speedKmh,
      if (event.signalType != null) 'signalType': event.signalType!.wire,
      if (_isNonEmpty(event.appVersion)) 'appVersion': event.appVersion!.trim(),
      if (_isNonEmpty(event.refusalReason))
        'refusalReason': event.refusalReason!.trim(),
      if (_isNonEmpty(event.workOrderId))
        'workOrderId': event.workOrderId!.trim(),
    };
  }

  String _buildBatchId(List<TelemetryEvent> events) {
    if (events.isEmpty) return 'telemetry-batch-empty';
    final first = events.first;
    return 'telemetry-batch-'
        '${first.capturedAt.toUtc().millisecondsSinceEpoch}-'
        '${first.clientActionId}';
  }

  bool _isNonEmpty(String? value) => value != null && value.trim().isNotEmpty;

  String? _readNonEmptyString(Object? value) =>
      value is String && value.trim().isNotEmpty ? value.trim() : null;

  String? _clientActionId(Map<String, dynamic> item) =>
      _readNonEmptyString(item['client_action_id']) ??
      _readNonEmptyString(item['clientActionId']);

  Map<String, dynamic> _asStringMap(Object? value) {
    if (value is Map<String, dynamic>) return value;
    if (value is Map) return Map<String, dynamic>.from(value);
    return const {};
  }

  List<Map<String, dynamic>> _listOfMaps(Object? value) {
    if (value is! List) return const [];
    return value
        .whereType<Map>()
        .map((item) => Map<String, dynamic>.from(item))
        .toList(growable: false);
  }
}
