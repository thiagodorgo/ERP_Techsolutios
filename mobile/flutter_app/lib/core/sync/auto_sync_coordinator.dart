import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/auth/auth_models.dart';
import '../../features/checklists/data/checklist_attachment_upload.dart';
import '../../features/checklists/data/checklist_repository.dart';
import '../auth/auth_notifier.dart';
import '../bootstrap/bootstrap_repository.dart';
import '../bootstrap/bootstrap_session.dart';
import '../bootstrap/bootstrap_session_match.dart';
import '../location/location_consent_providers.dart';
import '../network/api_error.dart';
import '../network/connectivity_repository.dart';
import '../telemetry/telemetry_providers.dart';
import 'expense_sync_pass.dart';
import 'sync_action_routing.dart';
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

/// B-APP-ORG (T-a): quanto a troca de organização espera a passada em curso
/// terminar. Estourou: a troca não acontece e a porta reabre.
const kSessionChangeHoldTimeout = Duration(seconds: 30);

/// Listens to [networkStatusProvider] and triggers a sync pass for all domains
/// when connectivity transitions from offline → online.
///
/// Prevents concurrent runs via [_running] flag.
/// Sync errors produce a safe message — tokens never appear in state.
///
/// B-APP-SESSAO-RENOVA (D8): a passada é da sessão que a começou. A época da
/// sessão é guardada no início e conferida depois de cada domínio: mudou
/// (expirou, "Sair", login de outra pessoa), a passada para, e só a expiração
/// vira mensagem. Depois de uma sessão morta, o novo login roda uma passada
/// sozinho.
///
/// B-APP-ORG (T-a e T-c, itens 69 e 70): a troca de sessão fecha a porta
/// ([holdForSessionChange]) e espera a passada em curso parar no próximo
/// limite de domínio; e a passada só roda quando o bootstrap é da sessão viva.
class AutoSyncCoordinator extends Notifier<AutoSyncState> {
  bool _running = false;

  /// T-a: a porta fechada pela troca de sessão. Nenhuma passada começa, e a
  /// passada em curso para no próximo limite de domínio.
  bool _held = false;

  /// T-a: completa quando a passada em curso termina (`_running == false`).
  Completer<void>? _passEnded;

  /// T-a: fecha a porta e espera a passada em curso terminar, até [timeout].
  /// `true`: nenhuma passada em curso, pode trocar. `false`: o prazo estourou;
  /// a porta reabre e a troca não deve acontecer.
  Future<bool> holdForSessionChange({
    Duration timeout = kSessionChangeHoldTimeout,
  }) async {
    _held = true;
    if (!_running) return true;
    final ended = _passEnded ??= Completer<void>();
    try {
      await ended.future.timeout(timeout);
      return true;
    } on TimeoutException {
      _held = false; // a troca não acontece: a porta reabre
      return false;
    }
  }

  /// T-a: reabre a porta, em qualquer desfecho da troca.
  void releaseAfterSessionChange() {
    _held = false;
  }

  /// D8: a sessão morreu (`expired`) desde o último login.
  bool _sessionDiedThisRun = false;

  @override
  AutoSyncState build() {
    ref.listen<NetworkStatus>(networkStatusProvider, (prev, next) {
      if (prev == NetworkStatus.offline && next == NetworkStatus.online) {
        _triggerSync();
      }
    });
    ref.listen<AuthStatus?>(
      authStateProvider.select((async) => async.asData?.value.status),
      (prev, next) {
        if (next == AuthStatus.expired) _sessionDiedThisRun = true;
        // dart format off
      if (_sessionDiedThisRun && next == AuthStatus.authenticated) _triggerAfterRelogin(); // novo login depois de sessão morta
        // dart format on
      },
    );
    return const AutoSyncState();
  }

  int _currentEpoch() => ref.read(authStateProvider.notifier).epoch;

  // dart format off
  bool _passStillValid(int epoch) => epoch == _currentEpoch(); // a passada é da sessão que a começou
  // dart format on

  bool get _sessionExpired =>
      ref.read(authStateProvider).asData?.value.status == AuthStatus.expired;

  /// D8: a época mudou no meio da passada. Para sem tocar em mais nada; a
  /// mensagem só quando a sessão expirou ("Sair" e outra pessoa: calada).
  void _stopSuperseded() {
    state = _sessionExpired
        ? state.copyWith(
            isRunning: false,
            lastSafeError: kSessionExpiredMessage,
          )
        : state.copyWith(isRunning: false, clearError: true);
  }

  /// D8 (C2): o novo login depois de uma sessão morta roda uma passada, com
  /// rede, depois do bootstrap da sessão nova. As ações de outro dono seguem
  /// com o dono delas (a fila por usuário não muda).
  Future<void> _triggerAfterRelogin() async {
    _sessionDiedThisRun = false;
    if (ref.read(networkStatusProvider) == NetworkStatus.offline) return;
    final epoch = _currentEpoch();
    // O bootstrap segue a chave da sessão na microtarefa seguinte (D6).
    await Future<void>.delayed(Duration.zero);
    try {
      await ref.read(bootstrapSessionProvider.future);
    } catch (_) {
      return;
    }
    if (!_passStillValid(epoch)) return;
    await _triggerSync();
  }

  /// Manually request a sync pass (e.g. from a button tap).
  Future<void> triggerManual() => _triggerSync();

  /// T-c: o bootstrap da passada ainda é da sessão viva.
  bool _passSessionStillLive(BootstrapSession? passSession) =>
      passSession == null ||
      bootstrapMatchesLiveSession(
        passSession,
        ref.read(authStateProvider).asData?.value,
      );

  Future<void> _triggerSync() async {
    if (_held) return;
    if (_running) return;
    _running = true;
    final epoch = _currentEpoch();
    BootstrapSession? passSession;
    var passStarted = false;
    // D8: a guarda entre domínios: a sessão mudou, a passada para aqui.
    // B-APP-ORG: também quando a troca pediu para parar (T-a) ou o bootstrap
    // da passada deixou de ser da sessão viva (T-c).
    bool superseded() {
      // dart format off
      if (_passStillValid(epoch) && !_held && _passSessionStillLive(passSession)) return false;
      // dart format on
      _stopSuperseded();
      return true;
    }

    state = state.copyWith(isRunning: true, clearError: true);
    try {
      final session = ref.read(bootstrapSessionProvider).asData?.value;
      if (session == null) {
        // Not authenticated — skip silently, reset running flag
        state = state.copyWith(isRunning: false);
        return;
      }
      passSession = session;
      final liveAuth = ref.read(authStateProvider).asData?.value;
      // dart format off
      if (!bootstrapMatchesLiveSession(session, liveAuth)) return; // T-c: bootstrap de outra sessão, a passada não roda
      // dart format on
      passStarted = true;
      final tenantId = session.activeTenant.tenantId;

      try {
        await ref.read(syncQueueReclaimServiceProvider).reclaimTenant(tenantId);
      } catch (_) {
        // Resgate falho nao bloqueia os demais dominios de sincronizacao.
      }
      if (superseded()) return;
      // B-SAN3-16 (P5): o que nao tem como sair vira erro visivel, com saida.
      try {
        await ref.read(syncActionRoutingSweepProvider).sweepTenant(tenantId);
      } catch (_) {}
      if (superseded()) return;

      try {
        await ref.read(fieldLocationSyncServiceProvider).syncTenant(tenantId);
      } catch (_) {
        // Field Location falha isolada nao deve bloquear os demais dominios.
      }
      if (superseded()) return;
      // Ω4C PR-13 — flush da telemetria (buffer Drift dedicado). Try/catch
      // ISOLADO: falha aqui nunca entanga OS/checklist/RDV.
      try {
        final consentSync = ref.read(locationConsentSyncProvider);
        if (await consentSync.settleDecision(tenantId)) {
          await ref.read(telemetrySyncServiceProvider).flushTenant(tenantId);
        }
      } catch (_) {
        // Telemetria falha isolada nao deve bloquear os demais dominios.
      }
      if (superseded()) return;
      // Work order status sync
      await ref.read(workOrderSyncReplayServiceProvider).replayTenant(tenantId);
      if (superseded()) return;
      try {
        await ref
            .read(inventorySyncReplayServiceProvider)
            .replayTenant(tenantId);
      } catch (_) {
        // Material falho nao bloqueia vistoria, evidencia nem despesa.
      }
      if (superseded()) return;
      // B-SAN3-14 (R-A5) — a coleta e a entrega das OS de guincho no aparelho.
      try {
        final checklistRepo = ref.read(checklistRepositoryProvider);
        await checklistRepo.prefetchRunsForOpenTowWorkOrders();
      } catch (_) {
        // Pré-carga falha isolada não bloqueia os demais domínios.
      }
      if (superseded()) return;
      // Checklist: baixa o server_run_id das runs iniciadas 100% offline ANTES
      // do replay (junta PR-B). Religa o download sem depender de o guincheiro
      // reabrir a tela — as ações offline carimbadas viram replay-elegíveis já
      // neste passe. Falha isolada não bloqueia os demais domínios.
      try {
        await ref.read(checklistRepositoryProvider).downloadPendingRuns();
      } catch (_) {
        // Download de run pendente falho não bloqueia o replay/telemetria.
      }
      if (superseded()) return;
      // Checklist sync
      await ref.read(checklistSyncReplayServiceProvider).replayTenant(tenantId);
      if (superseded()) return;
      // Checklist photo binary upload (multipart contra o server_run_id baixado)
      try {
        await ref
            .read(checklistAttachmentUploadServiceProvider)
            .uploadTenant(tenantId);
      } catch (_) {
        // Falha isolada do upload de foto nao bloqueia os demais dominios.
      }
      if (superseded()) return;
      // Evidence metadata sync
      await ref.read(evidenceSyncReplayServiceProvider).replayTenant(tenantId);
      if (superseded()) return;
      // Evidence binary upload
      await ref
          .read(evidenceBinaryUploadServiceProvider)
          .uploadTenant(tenantId);
      if (superseded()) return;
      // RDV/expense sync + comprovante (B-RDV-COMPROVANTE, conserto c1): lote →
      // upload multipart → lote. Os ids de servidor do relatorio e do item nascem
      // no lote; o envio do relatorio espera a vez do comprovante e sai no 2o lote
      // do MESMO passe. A falha do 1o lote propaga como antes; o upload e o 2o
      // lote sao isolados; o blob so morre quando o servidor confirma.
      await runExpenseSyncPass(
        tenantId,
        replay: ref.read(syncReplayServiceProvider),
        receipts: () => ref.read(expenseReceiptSyncServiceProvider),
      );
      if (superseded()) return;

      state = state.copyWith(
        isRunning: false,
        lastSyncAt: DateTime.now().toUtc(),
        clearError: true,
      );
    } catch (e) {
      // D8: erro de um domínio depois de a época mudar não vira mensagem.
      if (superseded()) return;
      state = state.copyWith(isRunning: false, lastSafeError: _safeMessage(e));
    } finally {
      _running = false;
      // T-c: a passada que não rodou também deixa de estar "em andamento".
      if (passSession != null && !passStarted) {
        state = state.copyWith(isRunning: false);
      }
      // T-a: quem espera a troca fica sabendo que a passada terminou.
      final ended = _passEnded;
      _passEnded = null;
      ended?.complete();
    }
  }

  String _safeMessage(Object e) {
    if (e is ApiError) return e.safeMessage;
    return 'Falha na sincronização. Tente novamente.';
  }
}

final autoSyncCoordinatorProvider =
    NotifierProvider<AutoSyncCoordinator, AutoSyncState>(
      AutoSyncCoordinator.new,
    );
