import 'dart:async';

import 'package:geolocator/geolocator.dart' as geo;

import 'device_location_provider.dart';
import 'field_location_models.dart';
import 'location_consent_store.dart';

abstract class GeolocatorLocationPort {
  Future<bool> isLocationServiceEnabled();
  Future<geo.LocationPermission> checkPermission();
  Future<geo.LocationPermission> requestPermission();
  Future<geo.Position> getCurrentPosition({
    geo.LocationSettings? locationSettings,
  });
  Future<bool> openAppSettings();
}

class NativeGeolocatorLocationPort implements GeolocatorLocationPort {
  const NativeGeolocatorLocationPort();

  @override
  Future<bool> isLocationServiceEnabled() {
    return geo.Geolocator.isLocationServiceEnabled();
  }

  @override
  Future<geo.LocationPermission> checkPermission() {
    return geo.Geolocator.checkPermission();
  }

  @override
  Future<geo.LocationPermission> requestPermission() {
    return geo.Geolocator.requestPermission();
  }

  @override
  Future<geo.Position> getCurrentPosition({
    geo.LocationSettings? locationSettings,
  }) {
    return geo.Geolocator.getCurrentPosition(
      locationSettings: locationSettings,
    );
  }

  @override
  Future<bool> openAppSettings() {
    return geo.Geolocator.openAppSettings();
  }
}

class GeolocatorDeviceLocationProvider
    implements DeviceLocationProvider, DeviceLocationStatusReader {
  GeolocatorDeviceLocationProvider({
    required GeolocatorLocationPort port,
    required LocationConsentStore consentStore,
    this.timeout = const Duration(seconds: 12),
  }) : _port = port,
       _consentStore = consentStore;

  final GeolocatorLocationPort _port;
  final LocationConsentStore _consentStore;
  final Duration timeout;

  @override
  Future<DeviceLocationStatus> status() async {
    final consentAccepted = await _consentStore.hasAcceptedManualCapture();
    if (!consentAccepted) {
      return const DeviceLocationStatus(
        consentAccepted: false,
        safeMessage: 'Aceite a captura manual antes de pedir permissao nativa.',
      );
    }

    final serviceEnabled = await _port.isLocationServiceEnabled();
    final permission = await _port.checkPermission();
    return DeviceLocationStatus(
      consentAccepted: true,
      serviceEnabled: serviceEnabled,
      permissionLabel: _permissionLabel(permission),
      safeMessage: _statusMessage(serviceEnabled, permission),
      settingsAvailable: permission == geo.LocationPermission.deniedForever,
    );
  }

  @override
  Future<bool> openAppSettings() {
    return _port.openAppSettings();
  }

  @override
  Future<DeviceLocationResult> currentLocation() async {
    if (!await _consentStore.hasAcceptedManualCapture()) {
      return DeviceLocationResult.unavailable(
        'Aceite a captura manual de localizacao antes de pedir permissao nativa.',
      );
    }

    if (!await _port.isLocationServiceEnabled()) {
      return DeviceLocationResult.unavailable(
        'Servico de localizacao desligado. Ative a localizacao do dispositivo e tente novamente.',
      );
    }

    var permission = await _port.checkPermission();
    if (permission == geo.LocationPermission.denied) {
      permission = await _port.requestPermission();
    }

    final unavailable = _permissionUnavailable(permission);
    if (unavailable != null) {
      return DeviceLocationResult.unavailable(unavailable);
    }

    try {
      final position = await _port.getCurrentPosition(
        locationSettings: geo.LocationSettings(
          accuracy: geo.LocationAccuracy.high,
          timeLimit: timeout,
        ),
      );
      return DeviceLocationResult.available(_fixFromPosition(position));
    } on TimeoutException {
      return DeviceLocationResult.unavailable(
        'Tempo limite ao obter a localizacao. Tente novamente com o app aberto.',
      );
    } on geo.LocationServiceDisabledException {
      return DeviceLocationResult.unavailable(
        'Servico de localizacao desligado. Ative a localizacao do dispositivo e tente novamente.',
      );
    } on geo.PermissionDeniedException {
      return DeviceLocationResult.unavailable(
        'Permissao de localizacao negada. Autorize o uso durante o app aberto para enviar o ponto operacional.',
      );
    } catch (_) {
      return DeviceLocationResult.unavailable(
        'Nao foi possivel obter a localizacao do dispositivo.',
      );
    }
  }

  FieldLocationFix _fixFromPosition(geo.Position position) {
    return FieldLocationFix(
      latitude: position.latitude,
      longitude: position.longitude,
      accuracyMeters: _nonNegative(position.accuracy),
      headingDegrees: _heading(position.heading),
      speedMetersPerSecond: _nonNegative(position.speed),
      recordedAt: position.timestamp.toUtc(),
    );
  }
}

String? _permissionUnavailable(geo.LocationPermission permission) {
  return switch (permission) {
    geo.LocationPermission.whileInUse || geo.LocationPermission.always => null,
    geo.LocationPermission.denied =>
      'Permissao de localizacao negada. Autorize o uso durante o app aberto para enviar o ponto operacional.',
    geo.LocationPermission.deniedForever =>
      'Permissao de localizacao negada permanentemente. Abra as configuracoes do app para permitir uso durante o app aberto.',
    geo.LocationPermission.unableToDetermine =>
      'Nao foi possivel determinar a permissao de localizacao.',
  };
}

String _permissionLabel(geo.LocationPermission permission) {
  return switch (permission) {
    geo.LocationPermission.denied => 'Negada',
    geo.LocationPermission.deniedForever => 'Negada permanentemente',
    geo.LocationPermission.whileInUse => 'Permitida durante o uso',
    geo.LocationPermission.always => 'Permitida',
    geo.LocationPermission.unableToDetermine => 'Indeterminada',
  };
}

String? _statusMessage(bool serviceEnabled, geo.LocationPermission permission) {
  if (!serviceEnabled) {
    return 'Servico de localizacao desligado.';
  }
  return _permissionUnavailable(permission);
}

double? _nonNegative(double value) {
  if (!value.isFinite || value < 0) return null;
  return value;
}

double? _heading(double value) {
  if (!value.isFinite || value < 0 || value > 360) return null;
  return value;
}
