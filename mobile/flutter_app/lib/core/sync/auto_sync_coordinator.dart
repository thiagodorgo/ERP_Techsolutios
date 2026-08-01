import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/checklists/data/checklist_attachment_upload.dart';
import '../../features/checklists/data/checklist_repository.dart';
import '../bootstrap/bootstrap_repository.dart';
import '../network/api_error.dart';
import '../network/connectivity_repository.dart';
import '../telemetry/telemetry_providers.dart';
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
      // Ω4C PR-13 — flush da telemetria (buffer Drift dedicado). Try/catch
      // ISOLADO: falha aqui nunca entanga OS/checklist/RDV.
      try {
        await ref.read(telemetrySyncServiceProvider).flushTenant(tenantId);
      } catch (_) {
        // Telemetria falha isolada nao deve bloquear os demais dominios.
      }
      // Work order status sync
      await ref.read(workOrderSyncReplayServiceProvider).replayTenant(tenantId);
      // Checklist: baixa o server_run_id das runs iniciadas 100% offline ANTES
      // do replay (junta PR-B). Religa o download sem depender de o guincheiro
      // reabrir a tela — as ações offline carimbadas viram replay-elegíveis já
      // neste passe. Falha isolada não bloqueia os demais domínios.
      try {
        await ref.read(checklistRepositoryProvider).downloadPendingRuns();
      } catch (_) {
        // Download de run pendente falho não bloqueia o replay/telemetria.
      }
      // Checklist sync
      await ref.read(checklistSyncReplayServiceProvider).replayTenant(tenantId);
      // Checklist photo binary upload (multipart contra o server_run_id baixado)
      try {
        await ref
            .read(checklistAttachmentUploadServiceProvider)
            .uploadTenant(tenantId);
      } catch (_) {
        // Falha isolada do upload de foto nao bloqueia os demais dominios.
      }
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
