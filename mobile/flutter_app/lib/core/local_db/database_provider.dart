import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app_database.dart';

// Must be overridden before ProviderScope is mounted.
// Production: override in main() with AppDatabase.open().
// Tests: override in ProviderScope.overrides with AppDatabase.openInMemory().
final appDatabaseProvider = Provider<AppDatabase>((ref) {
  throw UnimplementedError(
    'appDatabaseProvider must be overridden with an AppDatabase instance.',
  );
});
