import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'connectivity_repository.dart';

// ── Abstract source ────────────────────────────────────────────────────────────

/// Interface for connectivity data sources.
/// Real implementation uses connectivity_plus; tests use ManualConnectivitySource.
abstract class ConnectivitySource {
  /// Stream of connectivity changes.
  Stream<NetworkStatus> get statusStream;

  /// Probe the current connectivity state once.
  Future<NetworkStatus> fetchCurrent();
}

// ── connectivity_plus implementation ──────────────────────────────────────────

/// Converts connectivity_plus results to [NetworkStatus].
/// Considers wifi, mobile, ethernet as online; none as offline; otherwise unknown.
class ConnectivityPlusSource implements ConnectivitySource {
  ConnectivityPlusSource([Connectivity? connectivity])
    : _connectivity = connectivity ?? Connectivity();

  final Connectivity _connectivity;

  @override
  Stream<NetworkStatus> get statusStream =>
      _connectivity.onConnectivityChanged.map(_fromResults);

  @override
  Future<NetworkStatus> fetchCurrent() async {
    final results = await _connectivity.checkConnectivity();
    return _fromResults(results);
  }

  NetworkStatus _fromResults(List<ConnectivityResult> results) {
    if (results.any(
      (r) =>
          r == ConnectivityResult.wifi ||
          r == ConnectivityResult.mobile ||
          r == ConnectivityResult.ethernet ||
          r == ConnectivityResult.vpn,
    )) {
      return NetworkStatus.online;
    }
    if (results.contains(ConnectivityResult.none)) {
      return NetworkStatus.offline;
    }
    return NetworkStatus.unknown;
  }
}

// ── Manual source (tests / manual control) ────────────────────────────────────

/// Test-friendly connectivity source driven by [emit].
/// Does NOT depend on any native plugin.
class ManualConnectivitySource implements ConnectivitySource {
  ManualConnectivitySource([NetworkStatus initial = NetworkStatus.online])
    : _current = initial;

  final StreamController<NetworkStatus> _controller =
      StreamController<NetworkStatus>.broadcast();
  NetworkStatus _current;

  void emit(NetworkStatus status) {
    _current = status;
    _controller.add(status);
  }

  @override
  Stream<NetworkStatus> get statusStream => _controller.stream;

  @override
  Future<NetworkStatus> fetchCurrent() async => _current;

  void dispose() => _controller.close();
}

// ── Providers ─────────────────────────────────────────────────────────────────

/// Provides the connectivity source.
/// Override in tests with [ManualConnectivitySource].
final connectivitySourceProvider = Provider<ConnectivitySource>(
  (ref) => ConnectivityPlusSource(),
);

/// Bridge provider — subscribes to [connectivitySourceProvider] and drives
/// [networkStatusProvider] with real connectivity events.
///
/// Mount once in the root widget via [ref.watch(connectivityBridgeProvider)].
/// In tests: override [connectivitySourceProvider]; the bridge respects it.
final connectivityBridgeProvider = Provider<void>((ref) {
  final source = ref.watch(connectivitySourceProvider);

  // Initialize to current connectivity status
  source.fetchCurrent().then((status) {
    // Guard against disposal before future completes
    try {
      ref.read(networkStatusProvider.notifier).setStatus(status);
    } catch (_) {}
  });

  // Stream listener drives subsequent changes
  final sub = source.statusStream.listen((status) {
    try {
      ref.read(networkStatusProvider.notifier).setStatus(status);
    } catch (_) {}
  });

  ref.onDispose(sub.cancel);
});
