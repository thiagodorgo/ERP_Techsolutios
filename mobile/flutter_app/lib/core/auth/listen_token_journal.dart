import 'auth_token_storage.dart';
import 'serial_lock.dart';

/// Diário durável dos tokens de renovação das sessões somente de leitura.
/// Há no máximo um token por pátio; tokens nunca são expostos em logs.
/// Toda leitura e toda escrita passam por uma trava: duas gravações nunca se
/// atropelam. Um token só sai daqui se ainda for o mesmo ([removeIfSame]).
class ListenTokenJournal {
  ListenTokenJournal(this._storage);

  final AuthTokenStorage _storage;
  final _lock = SerialLock();

  Future<Map<String, String>> all() => _lock.run(
    () async =>
        Map<String, String>.unmodifiable(await _storage.loadListenTokens()),
  );

  Future<String?> tokenFor(String tenantId) =>
      _lock.run(() async => (await _storage.loadListenTokens())[tenantId]);

  // dart format off
  Future<void> put(String tenantId, String token) => _lock.run(() => _put(tenantId, token)); // toda escrita do diário passa pela trava
  Future<void> removeIfSame(String tenantId, String token) => _lock.run(() => _removeIfSame(tenantId, token)); // toda escrita do diário passa pela trava
  // dart format on

  Future<void> _put(String tenantId, String token) async {
    final current = await _storage.loadListenTokens();
    await _storage.saveListenTokens({...current, tenantId: token});
  }

  Future<void> _removeIfSame(String tenantId, String token) async {
    final current = await _storage.loadListenTokens();
    // dart format off
    if (current[tenantId] != token) return; // só sai o token que quem chama conhece
    // dart format on
    current.remove(tenantId);
    await _storage.saveListenTokens(current);
  }
}
