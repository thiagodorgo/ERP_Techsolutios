import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../bootstrap/bootstrap_repository.dart';
import '../sync/sync_providers.dart';
import 'location_consent_store.dart';

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
