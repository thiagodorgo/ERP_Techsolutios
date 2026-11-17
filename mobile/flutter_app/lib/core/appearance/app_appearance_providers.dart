import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../auth/auth_notifier.dart';
import '../bootstrap/bootstrap_repository.dart';
import '../sync/sync_providers.dart';
import 'app_appearance.dart';
import 'app_appearance_store.dart';

/// B-APP-APARENCIA (F1) — a escolha de aparência para as telas, espelho do
/// `useScreenAppearance.ts` do web.

/// A guarda da escolha (o armazenamento seguro; os testes trocam pela de
/// memória).
final appAppearanceStoreProvider = Provider<AppAppearanceStore>(
  (ref) => SecureAppAppearanceStore(const FlutterSecureStorage()),
);

/// O dono da escolha, como no consentimento (`locationConsentOwnerOf`): o `sub`
/// da sessão autenticada e a organização ativa do bootstrap. Sem sessão
/// autenticada, ou sem um dos dois, `null` (a leitura devolve o padrão e a
/// escrita não grava; Emenda 2, R2-1: sem sessão autenticada, a A como dado).
AppAppearanceOwner? appAppearanceOwnerOf(Ref ref) {
  final authenticated =
      ref.watch(authStateProvider).asData?.value.isAuthenticated ?? false;
  if (!authenticated) return null;
  final userId = ref.watch(currentSyncUserIdProvider);
  final tenantId = ref
      .watch(bootstrapSessionProvider)
      .asData
      ?.value
      .activeTenant
      .tenantId
      .trim();
  if (userId == null || tenantId == null || tenantId.isEmpty) return null;
  return AppAppearanceOwner(tenantId: tenantId, userId: userId);
}

/// O teto da leitura da escolha: um keystore que não responde vale como um que
/// recusa (R4), e a tela sai do carregamento na padrão.
const appAppearanceReadTimeout = Duration(seconds: 3);

/// A escolha da pessoa desta organização, lida do aparelho. Sem dono, o vazio
/// na hora (sem passar por "carregando").
class AppAppearancePrefsNotifier extends AsyncNotifier<AppAppearancePrefs> {
  AppAppearanceOwner? _owner;

  @override
  FutureOr<AppAppearancePrefs> build() {
    final owner = appAppearanceOwnerOf(ref);
    _owner = owner;
    if (owner == null) return <String, AppAppearance>{};
    final result = Completer<AppAppearancePrefs>();
    void settle(AppAppearancePrefs prefs) {
      if (!result.isCompleted) result.complete(prefs);
    }

    // O teto é cancelado quando a leitura chega ou quando o provider é
    // descartado (troca de dono, fim do app).
    final timer = Timer(
      appAppearanceReadTimeout,
      () => settle(<String, AppAppearance>{}),
    );
    ref.onDispose(timer.cancel);
    ref
        .read(appAppearanceStoreProvider)
        .read(owner)
        .then(
          (prefs) {
            timer.cancel();
            settle(prefs);
          },
          onError: (Object _) {
            timer.cancel();
            settle(<String, AppAppearance>{});
          },
        );
    return result.future;
  }

  /// Escolhe [value] para [screenKey]. A tela muda na hora; a resposta diz se
  /// a escolha ficou guardada no aparelho (`false`: vale até fechar o app, ou
  /// não havia dono e nada mudou).
  Future<bool> setScreen(String screenKey, AppAppearance value) async {
    final owner = _owner;
    if (owner == null) {
      return false;
    }
    final current = state.asData?.value ?? const <String, AppAppearance>{};
    state = AsyncValue.data({...current, screenKey: value});
    return ref.read(appAppearanceStoreProvider).write(owner, screenKey, value);
  }
}

final appAppearancePrefsProvider =
    AsyncNotifierProvider<AppAppearancePrefsNotifier, AppAppearancePrefs>(
      AppAppearancePrefsNotifier.new,
    );

/// A aparência de uma tela.
///
/// - **Carregando** só quando há sessão autenticada e o bootstrap ainda
///   carrega: o dono vai existir daqui a pouco, e desenhar a A antes faria a
///   tela pular (Emenda 2, R2-1).
/// - **O padrão da tela** em todo outro caso sem dono: sessão carregando, com erro,
///   sem sessão, sessão restrita, bootstrap com erro.
/// - Com dono: a escolha guardada, ou o padrão da tela.
final screenAppearanceProvider =
    Provider.family<AsyncValue<AppAppearance>, String>((ref, screenKey) {
      final auth = ref.watch(authStateProvider).asData?.value;
      final bootstrap = ref.watch(bootstrapSessionProvider);
      // dart format off
      if (auth?.isAuthenticated == true && bootstrap.isLoading) return const AsyncValue.loading();
      // dart format on
      final prefs = ref.watch(appAppearancePrefsProvider);
      return prefs.whenData((p) => resolveAppAppearance(p, screenKey));
    });
