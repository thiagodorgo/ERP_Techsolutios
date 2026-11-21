// B-APP-ORG (T-c, Emenda 1 §A3.3) — o bootstrap e a sessão viva são da mesma
// sessão? A passada de sincronização só roda quando são.
import '../../features/auth/auth_models.dart';
import '../auth/auth_notifier.dart';
import 'bootstrap_session.dart';

/// `true` quando [bootstrap] pertence à sessão viva [live].
///
/// - Sem bootstrap: `false`.
/// - Sem sessão viva autenticada: `true`. Não há token para mandar dado de uma
///   sessão com o de outra; é a mesma regra da T-b (`live != null`).
/// - Com sessão viva: o dono do bootstrap (`ownerKey`) tem de ser a chave da
///   sessão viva. Um cache sem dono (gravado antes do dono existir) vale só
///   para a mesma organização do token.
bool bootstrapMatchesLiveSession(BootstrapSession? bootstrap, AuthState? live) {
  if (bootstrap == null) return false;
  final liveKey = live == null ? null : sessionKeyOfState(live);
  final session = live?.session;
  if (liveKey == null || session == null) return true;
  final owner = bootstrap.ownerKey;
  if (owner != null) return owner == liveKey;
  // dart format off
  return bootstrap.activeTenant.tenantId == session.user.tenantId; // cache sem dono: a organização do token
  // dart format on
}
