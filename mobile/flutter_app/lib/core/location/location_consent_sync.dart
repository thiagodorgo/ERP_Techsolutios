import '../telemetry/telemetry_local_store.dart';
import 'field_location_store.dart';
import 'location_consent_api.dart';
import 'location_consent_store.dart';

/// Leva a decisão de consentimento do titular à organização ANTES de qualquer
/// posição e de qualquer lote de telemetria (P4), e apaga o não enviado com
/// coordenada quando o titular revoga ou a organização recusa (P7, P8, P12).
///
/// Recebe resolvedores, não instâncias que mudam: o dono e a API são lidos na
/// hora de cada envio (a API muda a cada troca de token; CR17-01). Todo envio de
/// decisão passa por aqui, em exclusão mútua (single-flight, P11): a tela, o
/// coordenador e o envio das posições.
class LocationConsentSync {
  LocationConsentSync({
    required LocationConsentStore store,
    required LocationConsentOwnerResolver currentOwner,
    required LocationConsentApi Function() api,
    required FieldLocationStore Function() fieldLocationStore,
    required TelemetryLocalStore Function() telemetryStore,
  }) : _store = store,
       _currentOwner = currentOwner,
       _api = api,
       _fieldLocationStore = fieldLocationStore,
       _telemetryStore = telemetryStore;

  final LocationConsentStore _store;
  final LocationConsentOwnerResolver _currentOwner;
  final LocationConsentApi Function() _api;
  final FieldLocationStore Function() _fieldLocationStore;
  final TelemetryLocalStore Function() _telemetryStore;

  Future<bool>? _inFlight;
  DateTime? _supersededProfileAt;

  /// `true` quando a organização já conhece a última decisão do dono da
  /// sessão. Sem dono (sem sessão autenticada) não há decisão a enviar, e a
  /// captura já está barrada porque o store responde "não": `true`. Erro ao ler
  /// o armazenamento com dono, ou falha no envio: `false` (falha fechada).
  ///
  /// Resíduo declarado (CR17R2-09 (c)): sem dono resolvível, uma decisão de
  /// outro dono que ficou pendente no aparelho não segura o lote.
  Future<bool> settleDecision(String tenantId) {
    final owner = _currentOwner();
    if (owner == null) return Future.value(true);
    if (owner.tenantId != tenantId) return Future.value(false);
    return _inFlight ??= _drain(owner).whenComplete(() => _inFlight = null);
  }

  /// `settleDecision` e "concedido e confirmado pela organização".
  Future<bool> readyToSendPositions(String tenantId) async {
    if (!await settleDecision(tenantId)) return false;
    return positionsStillAllowed(tenantId);
  }

  /// A conferência local, sem rede, antes de cada envio de posição
  /// (CR17R2-01 (1)): o dono da sessão é o mesmo e o consentimento dele está
  /// concedido e confirmado.
  Future<bool> positionsStillAllowed(String tenantId) async {
    final owner = _currentOwner();
    if (owner == null || owner.tenantId != tenantId) return false;
    try {
      final status = await _store.status();
      return status.granted &&
          status.serverState == LocationConsentServerState.registered;
    } catch (_) {
      return false;
    }
  }

  /// O titular aceita (a tela): grava a decisão e tenta registrá-la.
  Future<bool> accept(String tenantId) async {
    await _store.acceptManualCapture();
    return settleDecision(tenantId);
  }

  /// O titular revoga (P7): a captura para na hora, o não enviado com
  /// coordenada daquela organização é apagado, e a revogação vai à organização.
  Future<bool> revoke(String tenantId) async {
    await _store.clearManualCapture();
    await _discardUnsentWithLocation(tenantId);
    return settleDecision(tenantId);
  }

  /// "Agora não" é uma decisão "não" (P13): o mesmo caminho da revogação; o
  /// store marca "não permitido" quando não havia "sim" antes (E2.6).
  Future<bool> decline(String tenantId) => revoke(tenantId);

  /// A organização recusou uma POSIÇÃO por falta de consentimento (P8): o
  /// registro volta a "não decidiu", o não enviado com coordenada é apagado, e
  /// o app nunca re-concede sozinho.
  Future<void> resetAfterServerRefusal(String tenantId) async {
    final owner = _currentOwner();
    if (owner == null) {
      await _discardUnsentWithLocation(tenantId);
      return;
    }
    await _resetAfterServerRefusal(owner, tenantId);
  }

  Future<bool> _drain(LocationConsentOwner owner) async {
    final tenantId = owner.tenantId;
    try {
      while (true) {
        // Ler → conferir o dono → resolver a API e enviar, sem espera entre a
        // conferência e o envio (CR17R2-05 (1)).
        final decision = await _store.pendingDecisionFor(owner);
        if (_currentOwner() != owner) return false;
        if (decision == null) return true;
        final api = _api();
        final sending = decision.granted
            ? api.grant(decision)
            : api.revoke(decision);

        LocationConsentApiResult? result;
        try {
          result = await sending;
        } on LocationConsentRefusedError catch (refusal) {
          if (refusal.reason == 'operator_profile_required') {
            // Fica pendente e é reenviada no próximo passe, sem gastar
            // tentativa (P10).
            // dart format off
            await _store.markServerState(owner, LocationConsentServerState.profileMissing);
            // dart format on
            return false;
          }
          if (!_refusesTheGrant(decision, refusal)) return false;
          result = null; // 403 ou 400 do aceite: o mesmo caminho do superseded
        }

        if (result == null ||
            result.status == LocationConsentApiStatus.superseded) {
          // superseded (P12), 403 do aceite (P14) e 400 do aceite (CR17R2-03).
          _supersededProfileAt = result?.profileUpdatedAt;
          // dart format off
          await _resetAfterServerRefusal(owner, tenantId, needsReconfirm: true);
          // dart format on
          return true;
        }
        await _store.markAcknowledged(owner, decision.clientActionId);
        // Repete: se nasceu outra decisão enquanto esta ia, ela sai agora.
      }
    } catch (_) {
      return false;
    }
  }

  /// O aceite recusado com 403 (sem `field_location:send`, ou o módulo
  /// desligado na organização) ou 400 (`decided_at` mais de 5 min no futuro):
  /// "confirme de novo", sem laço e sem prender o portão.
  bool _refusesTheGrant(
    LocationConsentDecision decision,
    LocationConsentRefusedError refusal,
  ) =>
      decision.granted &&
      (refusal.statusCode == 403 || refusal.statusCode == 400);

  Future<void> _resetAfterServerRefusal(
    LocationConsentOwner owner,
    String tenantId, {
    bool needsReconfirm = false,
  }) async {
    final profileUpdatedAt = needsReconfirm ? _supersededProfileAt : null;
    _supersededProfileAt = null;
    await _store.resetAfterServerRefusal(
      owner,
      needsReconfirm: needsReconfirm,
      profileUpdatedAt: profileUpdatedAt,
    );
    await _discardUnsentWithLocation(tenantId);
  }

  /// O apagamento único (CR17R2-08): os pontos do envio manual não enviados e
  /// os pulsos da telemetria COM coordenada não enviados daquela organização.
  /// Os eventos sem GPS ficam.
  Future<void> _discardUnsentWithLocation(String tenantId) async {
    await _fieldLocationStore().discardPendingForTenant(tenantId);
    await _telemetryStore().discardLocationEventsForTenant(tenantId);
  }
}
