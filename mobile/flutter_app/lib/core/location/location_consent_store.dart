import 'package:flutter_secure_storage/flutter_secure_storage.dart';

const manualLocationConsentText =
    'A localização será capturada somente quando você tocar em Enviar '
    'localização agora. Não há rastreamento em segundo plano. '
    'Sem background tracking.';

abstract class LocationConsentStore {
  Future<bool> hasAcceptedManualCapture();
  Future<void> acceptManualCapture();
  Future<void> clearManualCapture();
}

class SecureLocationConsentStore implements LocationConsentStore {
  const SecureLocationConsentStore(this._storage);

  static const _key = 'erp.location.manual_capture_consent';

  final FlutterSecureStorage _storage;

  @override
  Future<bool> hasAcceptedManualCapture() async {
    return await _storage.read(key: _key) == 'accepted';
  }

  @override
  Future<void> acceptManualCapture() {
    return _storage.write(key: _key, value: 'accepted');
  }

  @override
  Future<void> clearManualCapture() {
    return _storage.delete(key: _key);
  }
}

class InMemoryLocationConsentStore implements LocationConsentStore {
  InMemoryLocationConsentStore({bool accepted = false}) : _accepted = accepted;

  bool _accepted;

  @override
  Future<bool> hasAcceptedManualCapture() async => _accepted;

  @override
  Future<void> acceptManualCapture() async {
    _accepted = true;
  }

  @override
  Future<void> clearManualCapture() async {
    _accepted = false;
  }
}
