import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../auth/auth_notifier.dart';
import '../bootstrap/bootstrap_repository.dart';
import '../network/http_client.dart';
import '../sync/sync_providers.dart';
import '../telemetry/telemetry_providers.dart';
import 'location_consent_api.dart';
import 'location_consent_store.dart';
import 'location_consent_sync.dart';

/// O dono do consentimento NA HORA da leitura (P2; CR17-01): o `sub` da sessão
/// autenticada e a organização ativa do bootstrap. Só `ref.read`, nunca
/// `ref.watch`: quem chama é um provider estável, que não pode ser reconstruído
/// a cada troca de sessão ou refresh de token.
///
/// Exige os dois: com a sessão recarregando, o bootstrap não tem dado e o dono
/// é `null` (o store responde "não"; falha fechada).
LocationConsentOwner? locationConsentOwnerOf(Ref ref) {
  final userId = ref.read(currentSyncUserIdProvider);
  final tenantId = ref
      .read(bootstrapSessionProvider)
      .asData
      ?.value
      .activeTenant
      .tenantId
      .trim();
  if (userId == null || tenantId == null || tenantId.isEmpty) return null;
  return LocationConsentOwner(tenantId: tenantId, userId: userId);
}

/// A API do consentimento, no molde de `fieldLocationApiProvider`. Muda a cada
/// troca de token; por isso o `LocationConsentSync` a lê na hora do envio.
final locationConsentApiProvider = Provider<LocationConsentApi>((ref) {
  final config = ref.watch(authenticatedApiConfigProvider);
  if (config.accessToken == null) {
    return const PendingLocationConsentApi();
  }

  return DioLocationConsentApi(
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

/// O envio das decisões de consentimento, ESTÁVEL: não vigia nada (S9b). O
/// dono, a API e os dois buffers são resolvidos na hora de cada uso.
final locationConsentSyncProvider = Provider<LocationConsentSync>((ref) {
  return LocationConsentSync(
    store: ref.read(locationConsentStoreProvider),
    currentOwner: () => locationConsentOwnerOf(ref),
    api: () => ref.read(locationConsentApiProvider),
    fieldLocationStore: () => ref.read(fieldLocationStoreProvider),
    telemetryStore: () => ref.read(telemetryLocalStoreProvider),
  );
});

/// O estado do consentimento do titular, para as telas (Início, Perfil e a
/// tela de localização). É folha de UI: pode vigiar a sessão, porque não
/// alimenta serviço long-lived. Quem muda a decisão o invalida.
final locationConsentStatusProvider =
    FutureProvider.autoDispose<LocationConsentStatus>((ref) {
      ref.watch(currentSyncUserIdProvider);
      return ref.watch(locationConsentStoreProvider).status();
    });
