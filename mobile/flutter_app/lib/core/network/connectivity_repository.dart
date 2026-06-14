import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Network connectivity states.
/// [online]   — device has a working connection (optimistic default)
/// [offline]  — device has no connection
/// [checking] — transitional state while probing
/// [unknown]  — state not yet determined
enum NetworkStatus { online, offline, checking, unknown }

/// Pure-Dart notifier for network status — no native plugin dependency.
/// Call [setStatus], [setOnline] or [setOffline] to drive state from:
///   • a real connectivity plugin (e.g. connectivity_plus stream → listener)
///   • manual UI controls
///   • tests
class NetworkStatusNotifier extends Notifier<NetworkStatus> {
  @override
  NetworkStatus build() => NetworkStatus.online; // optimistic: assume online on start

  void setStatus(NetworkStatus status) => state = status;
  void setOnline() => state = NetworkStatus.online;
  void setOffline() => state = NetworkStatus.offline;
  void setChecking() => state = NetworkStatus.checking;
}

final networkStatusProvider =
    NotifierProvider<NetworkStatusNotifier, NetworkStatus>(
      NetworkStatusNotifier.new,
    );
