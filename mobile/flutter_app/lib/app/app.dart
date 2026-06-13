import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'router.dart';
import '../core/network/connectivity_bridge.dart';
import '../shared/theme/erp_mobile_theme.dart';

class ErpMobileApp extends ConsumerWidget {
  const ErpMobileApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Mount connectivity bridge — drives networkStatusProvider from real events
    ref.watch(connectivityBridgeProvider);
    final router = ref.watch(appRouterProvider);
    return MaterialApp.router(
      title: 'ERP Techsolutions',
      theme: ErpMobileTheme.light(),
      routerConfig: router,
    );
  }
}
