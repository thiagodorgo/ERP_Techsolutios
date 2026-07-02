import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';

/// Returns true when the device location service is enabled AND permission is
/// granted. Silently returns false on platforms where Geolocator is unavailable
/// (e.g., desktop test runners).
final gpsAvailableProvider = FutureProvider<bool>((ref) async {
  try {
    final enabled = await Geolocator.isLocationServiceEnabled();
    if (!enabled) return false;
    final permission = await Geolocator.checkPermission();
    return permission == LocationPermission.always ||
        permission == LocationPermission.whileInUse;
  } catch (_) {
    return false;
  }
});
