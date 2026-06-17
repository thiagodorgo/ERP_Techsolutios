import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../bootstrap/bootstrap_repository.dart';
import '../network/api_error.dart';
import '../network/connectivity_repository.dart';
import 'sync_providers.dart';

// ── State ─────────────────────────────────────────────────────────────────────

class AutoSyncState {
  const AutoSyncState({
    this.isRunning = false,
    this.lastSyncAt,
    this.lastSafeError,
  });

  final bool isRunning;
  final DateTime? lastSyncAt;

  // Human-readable error — never contains tokens, passwords or private paths
  final String? lastSafeError;

  bool get hasError => lastSafeError != null;

  AutoSyncState copyWith({
    bool? isRunning,
    DateTime? lastSyncAt,
    String? lastSafeError,
    bool clearError = false,
  }) {
    return AutoSyncState(
      isRunning: isRunning ?? this.isRunning,
      lastSyncAt: lastSyncAt ?? this.lastSyncAt,
      lastSafeError: clearError ? null : (lastSafeError ?? this.lastSafeError),
    );
  }
}

// ── Coordinator ───────────────────────────────────────────────────────────────

/// Listens to [networkStatusProvider] and triggers a sync pass for all domains
/// when connectivity transitions from offline → online.
///
/// Prevents concurrent runs via [_running] flag.
/// Sync errors produce a safe message — tokens never appear in state.
class AutoSyncCoordinator extends Notifier<AutoSyncState> {
  bool _running = false;

  @override
  AutoSyncState build() {
    ref.listen<NetworkStatus>(networkStatusProvider, (prev, next) {
      if (prev == NetworkStatus.offline && next == NetworkStatus.online) {
        _triggerSync();
      }
    });
    return const AutoSyncState();
  }

  /// Manually request a sync pass (e.g. from a button tap).
  Future<void> triggerManual() => _triggerSync();

  Future<void> _triggerSync() async {
    if (_running) return;
    _running = true;
    state = state.copyWith(isRunning: true, clearError: true);
    try {
      final session = ref.read(bootstrapSessionProvider).asData?.value;
      if (session == null) {
        // Not authenticated — skip silently, reset running flag
        state = state.copyWith(isRunning: false);
        return;
      }
      final tenantId = session.activeTenant.tenantId;

      try {
        await ref.read(fieldLocationSyncServiceProvider).syncTenant(tenantId);
      } catch (_) {
        // Field Location falha isolada nao deve bloquear os demais dominios.
      }
      // Work order status sync
      await ref.read(workOrderSyncReplayServiceProvider).replayTenant(tenantId);
      // Checklist sync
      await ref.read(checklistSyncReplayServiceProvider).replayTenant(tenantId);
      // Evidence metadata sync
      await ref.read(evidenceSyncReplayServiceProvider).replayTenant(tenantId);
      // Evidence binary upload
      await ref
          .read(evidenceBinaryUploadServiceProvider)
          .uploadTenant(tenantId);
      // RDV/expense sync
      await ref.read(syncReplayServiceProvider).replayTenant(tenantId);

      state = state.copyWith(
        isRunning: false,
        lastSyncAt: DateTime.now().toUtc(),
        clearError: true,
      );
    } catch (e) {
      state = state.copyWith(isRunning: false, lastSafeError: _safeMessage(e));
    } finally {
      _running = false;
    }
  }

  String _safeMessage(Object e) {
    if (e is ApiError) return e.safeMessage;
    return 'Falha na sincronizacao. Tente novamente.';
  }
}

final autoSyncCoordinatorProvider =
    NotifierProvider<AutoSyncCoordinator, AutoSyncState>(
      AutoSyncCoordinator.new,
    );
