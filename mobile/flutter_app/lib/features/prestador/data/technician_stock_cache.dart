import '../domain/prestador_models.dart';

/// Lista salva do estoque do técnico, por (organização, usuário).
abstract class TechnicianStockCache {
  Future<TechnicianStockCacheEntry?> load(TechnicianStockCacheScope scope);

  Future<void> save(
    TechnicianStockCacheScope scope,
    List<TechnicianStockItem> items,
    DateTime fetchedAt,
  );

  Future<void> clear(TechnicianStockCacheScope scope);
}

class InMemoryTechnicianStockCache implements TechnicianStockCache {
  final Map<String, TechnicianStockCacheEntry> _entries = {};

  String _key(TechnicianStockCacheScope scope) =>
      '${scope.tenantId}\u0000${scope.userId}';

  @override
  Future<TechnicianStockCacheEntry?> load(
    TechnicianStockCacheScope scope,
  ) async => _entries[_key(scope)];

  @override
  Future<void> save(
    TechnicianStockCacheScope scope,
    List<TechnicianStockItem> items,
    DateTime fetchedAt,
  ) async {
    _entries[_key(scope)] = TechnicianStockCacheEntry(
      items: List.unmodifiable(items),
      fetchedAt: fetchedAt,
    );
  }

  @override
  Future<void> clear(TechnicianStockCacheScope scope) async {
    _entries.remove(_key(scope));
  }
}
