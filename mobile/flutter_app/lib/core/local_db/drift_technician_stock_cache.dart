import 'dart:convert';

import 'package:drift/drift.dart';

import '../../features/prestador/data/technician_stock_cache.dart';
import '../../features/prestador/domain/prestador_models.dart';
import 'app_database.dart';

class DriftTechnicianStockCache implements TechnicianStockCache {
  DriftTechnicianStockCache(this._db);

  final AppDatabase _db;

  @override
  Future<TechnicianStockCacheEntry?> load(
    TechnicianStockCacheScope scope,
  ) async {
    final rows = await _db
        .customSelect(
          'SELECT items_json, fetched_at FROM technician_stock_cache '
          'WHERE tenant_id = ? AND user_id = ?',
          variables: [
            Variable<String>(scope.tenantId),
            Variable<String>(scope.userId),
          ],
        )
        .get();
    if (rows.isEmpty) return null;
    return TechnicianStockCacheEntry(
      items: _decodeItems(rows.single.read<String>('items_json')),
      fetchedAt: DateTime.fromMillisecondsSinceEpoch(
        rows.single.read<int>('fetched_at'),
      ),
    );
  }

  @override
  Future<void> save(
    TechnicianStockCacheScope scope,
    List<TechnicianStockItem> items,
    DateTime fetchedAt,
  ) async {
    await _db.customInsert(
      'INSERT OR REPLACE INTO technician_stock_cache '
      '(tenant_id, user_id, items_json, fetched_at) VALUES (?, ?, ?, ?)',
      variables: [
        Variable<String>(scope.tenantId),
        Variable<String>(scope.userId),
        Variable<String>(_encodeItems(items)),
        Variable<int>(fetchedAt.toUtc().millisecondsSinceEpoch),
      ],
    );
  }

  @override
  Future<void> clear(TechnicianStockCacheScope scope) async {
    await _db.customStatement(
      'DELETE FROM technician_stock_cache WHERE tenant_id = ? AND user_id = ?',
      [scope.tenantId, scope.userId],
    );
  }

  String _encodeItems(List<TechnicianStockItem> items) => jsonEncode([
    for (final item in items)
      {
        'sku': item.sku,
        'name': item.name,
        'category': item.category,
        'available': item.available,
        'unit': item.unit,
      },
  ]);

  List<TechnicianStockItem> _decodeItems(String json) {
    final raw = jsonDecode(json) as List<dynamic>;
    return [
      for (final entry in raw)
        TechnicianStockItem(
          sku: (entry as Map<String, dynamic>)['sku'] as String,
          name: entry['name'] as String,
          category: (entry['category'] as String?) ?? '',
          available: entry['available'] as num,
          unit: entry['unit'] as String,
        ),
    ];
  }
}
