import 'field_location_models.dart';

abstract class DeviceLocationProvider {
  Future<DeviceLocationResult> currentLocation();
}

abstract class DeviceLocationStatusReader {
  Future<DeviceLocationStatus> status();
  Future<bool> openAppSettings();
}

class DeviceLocationStatus {
  const DeviceLocationStatus({
    required this.consentAccepted,
    this.serviceEnabled,
    this.permissionLabel = 'Nao verificada',
    this.safeMessage,
    this.settingsAvailable = false,
  });

  final bool consentAccepted;
  final bool? serviceEnabled;
  final String permissionLabel;
  final String? safeMessage;
  final bool settingsAvailable;
}

class DeviceLocationResult {
  const DeviceLocationResult._({
    required this.isAvailable,
    this.fix,
    this.safeMessage,
  });

  factory DeviceLocationResult.available(FieldLocationFix fix) {
    return DeviceLocationResult._(isAvailable: true, fix: fix);
  }

  factory DeviceLocationResult.unavailable([String? safeMessage]) {
    return DeviceLocationResult._(
      isAvailable: false,
      safeMessage:
          safeMessage ??
          'Localizacao do dispositivo indisponivel nesta versao. '
              'Mapa e sincronizacao preparados para o adapter GPS nativo pendente.',
    );
  }

  final bool isAvailable;
  final FieldLocationFix? fix;
  final String? safeMessage;
}

class PendingDeviceLocationProvider implements DeviceLocationProvider {
  const PendingDeviceLocationProvider();

  @override
  Future<DeviceLocationResult> currentLocation() async {
    return DeviceLocationResult.unavailable();
  }
}
