import 'package:connectivity_plus/connectivity_plus.dart';

import 'telemetry_event.dart';

/// Fonte do `signalType` do evento — derivada de `connectivity_plus` (JÁ no
/// pubspec: zero dep nova, D-Ω4C-TELE-FLUTTER-NODEPS). Interface própria porque
/// a `ConnectivitySource` do app colapsa tudo em online/offline e perde a
/// distinção wifi × mobile que o backend quer.
abstract class TelemetrySignalSource {
  Future<TelemetrySignalType?> currentSignal();
}

class ConnectivityPlusSignalSource implements TelemetrySignalSource {
  ConnectivityPlusSignalSource([Connectivity? connectivity])
    : _connectivity = connectivity ?? Connectivity();

  final Connectivity _connectivity;

  @override
  Future<TelemetrySignalType?> currentSignal() async {
    try {
      final results = await _connectivity.checkConnectivity();
      return mapConnectivityToSignal(results);
    } catch (_) {
      // Sinal é opcional — em falha honesta, omite (null).
      return null;
    }
  }
}

/// Fonte fixa (testes / captura sem plugin nativo).
class FixedTelemetrySignalSource implements TelemetrySignalSource {
  const FixedTelemetrySignalSource(this.signal);

  final TelemetrySignalType? signal;

  @override
  Future<TelemetrySignalType?> currentSignal() async => signal;
}

/// Wifi/ethernet → wifi; mobile → mobile; none → none; só bluetooth/vpn/other
/// (sem transporte claro) → null (omitido). Backend aceita só wifi|mobile|none.
TelemetrySignalType? mapConnectivityToSignal(List<ConnectivityResult> results) {
  if (results.any(
    (r) => r == ConnectivityResult.wifi || r == ConnectivityResult.ethernet,
  )) {
    return TelemetrySignalType.wifi;
  }
  if (results.contains(ConnectivityResult.mobile)) {
    return TelemetrySignalType.mobile;
  }
  if (results.contains(ConnectivityResult.none)) {
    return TelemetrySignalType.none;
  }
  return null;
}
