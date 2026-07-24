import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'router.dart';
import '../core/auth/auth_notifier.dart';
import '../core/bootstrap/bootstrap_repository.dart';
import '../core/network/connectivity_bridge.dart';
import '../core/sync/auto_sync_coordinator.dart';
import '../core/telemetry/telemetry_capture_service.dart';
import '../core/telemetry/telemetry_providers.dart';
import '../core/theme/theme_mode_notifier.dart';
import '../shared/theme/erp_mobile_theme.dart';

class ErpMobileApp extends ConsumerStatefulWidget {
  const ErpMobileApp({super.key});

  @override
  ConsumerState<ErpMobileApp> createState() => _ErpMobileAppState();
}

class _ErpMobileAppState extends ConsumerState<ErpMobileApp>
    with WidgetsBindingObserver {
  @override
  void initState() {
    super.initState();
    // Ω4C PR-13 (D-Ω4C-TELE-FLUTTER-FOREGROUND) — observa o ciclo de vida para
    // ligar/desligar a captura de telemetria SÓ em primeiro plano. SEM
    // WorkManager, background service ou isolate.
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    // Garante que nenhum timer de captura sobrevive ao encerramento do app.
    try {
      ref.read(telemetryCaptureServiceProvider).stop();
    } catch (_) {
      // Provider ja descartado — no-op.
    }
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    super.didChangeAppLifecycleState(state);
    switch (state) {
      case AppLifecycleState.resumed:
        _onResumed();
      case AppLifecycleState.paused:
      case AppLifecycleState.detached:
        _onBackgrounded(emitDisconnect: true);
      case AppLifecycleState.inactive:
      case AppLifecycleState.hidden:
        // Transições transitórias: apenas pausa o timer (sem evento de acesso).
        _onBackgrounded(emitDisconnect: false);
    }
  }

  void _onResumed() {
    final tenantId = _activeTenantId();
    if (!_isAuthenticated() || tenantId == null) return;
    final capture = ref.read(telemetryCaptureServiceProvider);
    capture.start(_activeTenantId);
    // APP_CONNECT (foreground) — de-dup por estado no serviço.
    capture.recordAppConnect(tenantId: tenantId).catchError((_) => null);
  }

  void _onBackgrounded({required bool emitDisconnect}) {
    final TelemetryCaptureService capture;
    try {
      capture = ref.read(telemetryCaptureServiceProvider);
    } catch (_) {
      return;
    }
    if (emitDisconnect) {
      final tenantId = _activeTenantId();
      if (tenantId != null) {
        capture.recordAppDisconnect(tenantId: tenantId).catchError((_) => null);
      }
    }
    capture.stop();
  }

  String? _activeTenantId() {
    return ref
        .read(bootstrapSessionProvider)
        .asData
        ?.value
        .activeTenant
        .tenantId;
  }

  bool _isAuthenticated() {
    return ref.read(authStateProvider).asData?.value.isAuthenticated ?? false;
  }

  @override
  Widget build(BuildContext context) {
    ref.watch(connectivityBridgeProvider);
    // Arma o auto-sync no root: registra o listener offline->online globalmente
    // (antes so era montado ao abrir Sync/Perfil). `.notifier` evita rebuild do
    // app a cada mudanca de estado do sync. O coordinator ja ignora sessao nula.
    ref.watch(autoSyncCoordinatorProvider.notifier);
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
