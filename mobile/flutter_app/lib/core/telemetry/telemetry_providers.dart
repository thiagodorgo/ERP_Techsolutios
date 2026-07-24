import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../auth/auth_notifier.dart';
import '../bootstrap/bootstrap_repository.dart';
import '../local_db/database_provider.dart';
import '../location/location_consent_store.dart';
import '../network/http_client.dart';
import '../sync/sync_providers.dart';
import 'telemetry_api.dart';
import 'telemetry_capture_service.dart';
import 'telemetry_local_store.dart';
import 'telemetry_signal_source.dart';
import 'telemetry_sync_service.dart';

/// Buffer Drift dedicado (D-Ω4C-TELE-FLUTTER-BUFFER). Fallback in-memory quando o
/// banco não está montado (espelha o field-location).
final _telemetryFallbackStore = InMemoryTelemetryLocalStore();

final telemetryLocalStoreProvider = Provider<TelemetryLocalStore>((ref) {
  try {
    return DriftTelemetryLocalStore(ref.watch(appDatabaseProvider));
  } catch (_) {
    return _telemetryFallbackStore;
  }
});

final telemetrySignalSourceProvider = Provider<TelemetrySignalSource>(
  (ref) => ConnectivityPlusSignalSource(),
);

/// Gate de consentimento de dispositivo (LGPD cliente) — o MESMO
/// `LocationConsentStore` do B-121 (cujo texto já afirma "Sem background
/// tracking."). O `tracking_consent` do PERFIL é autoridade do servidor (PR-12).
final telemetryConsentStoreProvider = Provider<LocationConsentStore>(
  (ref) => const SecureLocationConsentStore(FlutterSecureStorage()),
);

final telemetryApiProvider = Provider<TelemetryApi>((ref) {
  final config = ref.watch(authenticatedApiConfigProvider);
  if (config.accessToken == null) {
    return const PendingTelemetryApi();
  }
  return DioTelemetryApi(
    createAuthenticatedHttpClient(
      config,
      onRefresh: () async {
        await ref.read(authStateProvider.notifier).tryRefresh();
        return ref
            .read(authStateProvider)
            .maybeWhen(
              data: (state) => state.session?.tokens.accessToken,
              orElse: () => null,
            );
      },
      onClearSession: () => ref.read(authStateProvider.notifier).logout(),
    ),
  );
});

/// Serviço de captura — long-lived (mantém o timer de foreground). O gate de
/// permissão `field_location:send` é lido do bootstrap no momento da captura.
final telemetryCaptureServiceProvider = Provider<TelemetryCaptureService>((
  ref,
) {
  return TelemetryCaptureService(
    store: ref.watch(telemetryLocalStoreProvider),
    deviceLocationProvider: ref.watch(deviceLocationProvider),
    consentStore: ref.watch(telemetryConsentStoreProvider),
    signalSource: ref.watch(telemetrySignalSourceProvider),
    hasLocationSendPermission: () =>
        ref
            .read(bootstrapSessionProvider)
            .asData
            ?.value
            .permissions
            .contains('field_location:send') ??
        false,
  );
});

final telemetrySyncServiceProvider = Provider<TelemetrySyncService>(
  (ref) => TelemetrySyncService(
    store: ref.watch(telemetryLocalStoreProvider),
    api: ref.watch(telemetryApiProvider),
  ),
);
