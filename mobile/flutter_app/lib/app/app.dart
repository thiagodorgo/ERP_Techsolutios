import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'router.dart';
import '../core/network/connectivity_bridge.dart';
import '../core/theme/theme_mode_notifier.dart';
import '../shared/theme/erp_mobile_theme.dart';

class ErpMobileApp extends ConsumerWidget {
  const ErpMobileApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    ref.watch(connectivityBridgeProvider);
    final router = ref.watch(appRouterProvider);
    final appThemeAsync = ref.watch(themeModeProvider);
    final appTheme = appThemeAsync.asData?.value ?? AppThemeMode.system;

    final isHighContrast = appTheme == AppThemeMode.highContrast;

    return MaterialApp.router(
      title: 'ERP Techsolutions',
      // highContrast replaces the light theme slot; ThemeMode.light selects it.
      theme: isHighContrast
          ? ErpMobileTheme.highContrast()
          : ErpMobileTheme.light(),
      darkTheme: ErpMobileTheme.dark(),
      themeMode: appTheme.flutterMode,
      routerConfig: router,
    );
  }
}
