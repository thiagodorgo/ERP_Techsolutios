import '../network/api_error.dart';
import '../sync/sync_models.dart';
import 'telemetry_api.dart';
import 'telemetry_codec.dart';
import 'telemetry_event.dart';
import 'telemetry_local_store.dart';

class TelemetryFlushSummary {
  const TelemetryFlushSummary({
    this.accepted = 0,
    this.alreadyApplied = 0,
    this.rejected = 0,
    this.failed = 0,
  });

  final int accepted;
  final int alreadyApplied;
  final int rejected;
  final int failed;

  /// Total efetivamente removido do buffer (estados terminais).
  int get purged => accepted + alreadyApplied + rejected;
}

/// Flush em lote da telemetria (D-Ω4C-TELE-FLUTTER-IDEMP), plugado no
/// `AutoSyncCoordinator` num try/catch ISOLADO. Puxa ≤50 pendentes → POST →
/// mapeia por `clientActionId`:
///  - accepted / already_applied → purga (terminal-sucesso; idempotente);
///  - rejected → descarta SEM retry (validação/consent — retry não ajuda);
///  - ausente no `results` / erro de rede → `failed` + retry com backoff (cap
///    `maxRetry`, depois descarta p/ não inchar o buffer).
class TelemetrySyncService {
  TelemetrySyncService({
    required TelemetryLocalStore store,
    required TelemetryApi api,
    this.maxBatchSize = 50,
    this.maxRetry = 5,
  }) : _store = store,
       _api = api;

  final TelemetryLocalStore _store;
  final TelemetryApi _api;
  final int maxBatchSize;
  final int maxRetry;

  Future<TelemetryFlushSummary> flushTenant(String tenantId) async {
    final pending = await _store.pendingForTenant(
      tenantId,
      limit: maxBatchSize,
      maxRetry: maxRetry,
    );
    if (pending.isEmpty) return const TelemetryFlushSummary();

    List<TelemetrySyncResult> results;
    try {
      results = await _api.sendBatch(pending);
    } catch (error) {
      final mapped = _mapError(error);
      for (final event in pending) {
        await _markFailed(event, mapped.code, mapped.safeMessage);
      }
      return TelemetryFlushSummary(failed: pending.length);
    }

    final resultMap = {
      for (final result in results) result.clientActionId: result,
    };
    var accepted = 0;
    var alreadyApplied = 0;
    var rejected = 0;
    var failed = 0;

    for (final event in pending) {
      final result = resultMap[event.clientActionId];
      if (result == null) {
        // Sem resposta do servidor → retry (pode ser lote parcial/transiente).
        await _markFailed(
          event,
          'MISSING_RESULT',
          'Evento de telemetria sem resposta do servidor.',
        );
        failed++;
        continue;
      }

      switch (result.status) {
        case 'accepted':
          await _store.remove(event.localId);
          accepted++;
        case 'already_applied':
          await _store.remove(event.localId);
          alreadyApplied++;
        case 'rejected':
          // Terminal: descarta sem retry (ex.: tracking_consent_required).
          await _store.remove(event.localId);
          rejected++;
        default:
          await _markFailed(
            event,
            'SERVER_ERROR',
            'Falha ao processar telemetria. Tente novamente.',
          );
          failed++;
      }
    }

    return TelemetryFlushSummary(
      accepted: accepted,
      alreadyApplied: alreadyApplied,
      rejected: rejected,
      failed: failed,
    );
  }

  Future<void> _markFailed(
    TelemetryEvent event,
    String code,
    String safeMessage,
  ) async {
    final nextRetry = event.retryCount + 1;
    if (nextRetry >= maxRetry) {
      // Cap de retry esgotado → descarta p/ não inchar o buffer dedicado.
      await _store.remove(event.localId);
      return;
    }
    await _store.save(
      event.copyWith(
        syncStatus: SyncStatus.failed,
        retryCount: nextRetry,
        lastErrorCode: code,
        lastSafeError: safeMessage,
      ),
    );
  }
}

({String code, String safeMessage}) _mapError(Object error) {
  if (error is ApiNetworkError || error is ApiTimeoutError) {
    return (
      code: 'NETWORK_ERROR',
      safeMessage: 'Falha de conexao. Tente novamente.',
    );
  }
  if (error is ApiServerError &&
      error.statusCode >= 400 &&
      error.statusCode < 500) {
    return (code: 'VALIDATION_ERROR', safeMessage: error.safeMessage);
  }
  if (error is ApiError) {
    return (code: 'SYNC_ERROR', safeMessage: error.safeMessage);
  }
  return (
    code: 'SYNC_ERROR',
    safeMessage: 'Nao foi possivel sincronizar a telemetria.',
  );
}
