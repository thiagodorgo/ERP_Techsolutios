import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import 'app_appearance.dart';

/// B-APP-APARENCIA (F1) — onde fica a aparência escolhida por cada pessoa,
/// espelho do `appearance.storage.ts` do web.
///
/// Uma chave por ORGANIZAÇÃO e PESSOA (`erp.aparencia.v1.<organização>.<pessoa>`),
/// valor `{"<tela>": "A" | "B" | "C"}`, no mesmo armazenamento seguro que o app
/// já usa para o tema e para o consentimento por pessoa. A preferência não é
/// segredo; usar o mesmo armazenamento evita uma segunda forma de guardar.
///
/// §2.8: os identificadores só compõem a chave local; nenhum é renderizado.

/// A pessoa e a organização donas da escolha.
class AppAppearanceOwner {
  const AppAppearanceOwner({required this.tenantId, required this.userId});

  final String tenantId;
  final String userId;
}

/// A chave da escolha de [owner] no aparelho.
String appAppearanceStorageKey(AppAppearanceOwner owner) =>
    'erp.aparencia.v1.${owner.tenantId}.${owner.userId}';

final _screenKeyPattern = RegExp(r'^[a-z0-9][a-z0-9-]{0,39}$');

/// Só sobrevivem pares com chave de tela bem-formada e valor A, B ou C. Todo o
/// resto é descartado (espelho de `sanitizeAppearancePrefs`).
AppAppearancePrefs sanitizeAppAppearancePrefs(Object? raw) {
  if (raw is! Map) return {};
  final clean = <String, AppAppearance>{};
  for (final entry in raw.entries) {
    final screen = entry.key;
    if (screen is! String) continue;
    if (!_screenKeyPattern.hasMatch(screen)) continue;
    final value = AppAppearance.fromLetter(entry.value);
    if (value == null) continue;
    clean[screen] = value;
  }
  return clean;
}

/// A guarda da escolha. Sem dono, a leitura devolve o vazio (a tela fica no
/// padrão) e a escrita devolve `false` sem gravar: falha fechada, como no web.
abstract class AppAppearanceStore {
  /// A escolha de [owner]; vazio sem dono, com o registro ilegível ou sem nada
  /// guardado.
  Future<AppAppearancePrefs> read(AppAppearanceOwner? owner);

  /// Grava [value] para [screen]. Devolve se ficou guardado no aparelho; com o
  /// armazenamento recusando, a escolha vale até fechar o app (cópia em
  /// memória) e a resposta é `false`.
  Future<bool> write(
    AppAppearanceOwner? owner,
    String screen,
    AppAppearance value,
  );
}

/// A lógica da guarda sobre um armazenamento de chave e valor, com a cópia em
/// memória para quando ele recusa (espelho do `memory` do web).
///
/// A escrita tem um teto de tempo ([ioTimeout]): um keystore que não responde
/// vale como um que recusa (R4). O teto da leitura fica com quem a pede
/// (`AppAppearancePrefsNotifier`), que o cancela ao ser descartado.
abstract class KeyValueAppAppearanceStore implements AppAppearanceStore {
  KeyValueAppAppearanceStore({this.ioTimeout = const Duration(seconds: 3)});

  final Duration ioTimeout;
  final Map<String, AppAppearancePrefs> _memory = {};

  /// Lê o texto guardado em [key]; pode lançar (o keystore recusou).
  Future<String?> readRaw(String key);

  /// Grava [value] em [key]; pode lançar (o keystore recusou).
  Future<void> writeRaw(String key, String value);

  @override
  Future<AppAppearancePrefs> read(AppAppearanceOwner? owner) async {
    if (owner == null) return {};
    final key = appAppearanceStorageKey(owner);
    String? raw;
    try {
      raw = await readRaw(key);
    } catch (_) {
      // Leitura recusada: vale a cópia em memória desta sessão.
      return {...?_memory[key]};
    }
    if (raw == null || raw.isEmpty) return {...?_memory[key]};
    try {
      return sanitizeAppAppearancePrefs(jsonDecode(raw));
    } on FormatException {
      // JSON corrompido: a tela volta ao padrão.
      return {};
    }
  }

  @override
  Future<bool> write(
    AppAppearanceOwner? owner,
    String screen,
    AppAppearance value,
  ) async {
    if (owner == null) return false;
    if (!_screenKeyPattern.hasMatch(screen)) return false;
    final key = appAppearanceStorageKey(owner);
    AppAppearancePrefs current;
    try {
      current = await read(owner).timeout(ioTimeout);
    } catch (_) {
      current = {...?_memory[key]};
    }
    final next = {...current, screen: value};
    _memory[key] = next;
    try {
      await writeRaw(
        key,
        jsonEncode({for (final e in next.entries) e.key: e.value.letter}),
      ).timeout(ioTimeout);
      return true;
    } catch (_) {
      return false;
    }
  }
}

/// A guarda no armazenamento seguro do aparelho (o do tema).
class SecureAppAppearanceStore extends KeyValueAppAppearanceStore {
  SecureAppAppearanceStore(this._storage, {super.ioTimeout});

  final FlutterSecureStorage _storage;

  @override
  Future<String?> readRaw(String key) => _storage.read(key: key);

  @override
  Future<void> writeRaw(String key, String value) =>
      _storage.write(key: key, value: value);
}

/// A guarda em memória, para os testes. [values] é o texto cru por chave, para
/// o teste semear e conferir.
class InMemoryAppAppearanceStore extends KeyValueAppAppearanceStore {
  InMemoryAppAppearanceStore([Map<String, String>? values])
    : values = values ?? {},
      super();

  final Map<String, String> values;

  /// Semeia a escolha de [owner] (atalho dos testes).
  void seed(AppAppearanceOwner owner, Map<String, AppAppearance> prefs) {
    values[appAppearanceStorageKey(owner)] = jsonEncode({
      for (final e in prefs.entries) e.key: e.value.letter,
    });
  }

  @override
  Future<String?> readRaw(String key) async => values[key];

  @override
  Future<void> writeRaw(String key, String value) async {
    values[key] = value;
  }
}
