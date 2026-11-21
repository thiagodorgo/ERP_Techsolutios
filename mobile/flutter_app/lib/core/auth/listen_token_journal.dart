import 'auth_token_storage.dart';

/// Diário durável dos tokens de renovação das sessões somente de leitura.
/// Há no máximo um token por pátio; tokens nunca são expostos em logs.
class ListenTokenJournal {
  ListenTokenJournal(this._storage);

  final AuthTokenStorage _storage;

  Future<Map<String, String>> all() async =>
      Map.unmodifiable(await _storage.loadListenTokens());

  Future<String?> tokenFor(String tenantId) async =>
      (await _storage.loadListenTokens())[tenantId];

  Future<void> put(String tenantId, String token) async {
    final current = await _storage.loadListenTokens();
    await _storage.saveListenTokens({...current, tenantId: token});
  }

  Future<void> remove(String tenantId) async {
    final current = await _storage.loadListenTokens();
    if (current.remove(tenantId) == null) return;
    await _storage.saveListenTokens(current);
  }

  Future<void> retainTenants(Set<String> tenantIds) async {
    final current = await _storage.loadListenTokens();
    current.removeWhere((tenantId, _) => !tenantIds.contains(tenantId));
    await _storage.saveListenTokens(current);
  }

  Future<void> clear() => _storage.saveListenTokens(const {});
}
