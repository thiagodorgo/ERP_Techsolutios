import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../../shared/theme/erp_mobile_theme.dart';

const _kThemePrefKey = 'erp.app_theme_mode';

class ThemeModeNotifier extends AsyncNotifier<AppThemeMode> {
  @override
  Future<AppThemeMode> build() async {
    const storage = FlutterSecureStorage();
    final stored = await storage.read(key: _kThemePrefKey);
    return AppThemeModeLabel.fromKey(stored);
  }

  Future<void> setMode(AppThemeMode mode) async {
    state = AsyncValue.data(mode);
    const storage = FlutterSecureStorage();
    await storage.write(key: _kThemePrefKey, value: mode.storageKey);
  }
}

final themeModeProvider =
    AsyncNotifierProvider<ThemeModeNotifier, AppThemeMode>(
      ThemeModeNotifier.new,
    );
