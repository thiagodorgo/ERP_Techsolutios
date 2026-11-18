// B-O6R-04b (item 31 do portão, `Ω6R-QUA-002`), F4 — a ação antiga de estoque na fila aparece, com saída.
//
// O app não produz mais `inventory_entry.create` nem `inventory_exit.create` (F3), mas um aparelho pode ter uma ação
// antiga desses tipos na fila. Antes, ela ficava `pending` para sempre, sem erro (o R4 do B-SAN3-16 fixava isso).
// Agora a varredura do B-SAN3-16 a marca como "não enviável", com a frase própria do D8 do plano, e ela aparece em
// "Envio não concluído", com "Descartar".
//
// Q1 — `inventory_entry.create` `pending`, depois de uma varredura: `failed`, retry 5, `UNROUTABLE_ACTION`, a frase.
// Q2 — o mesmo para `inventory_exit.create`.
// Q3 — "Descartar" encerra a ação (o desfecho do 16: `synced` com `DISCARDED_BY_TECHNICIAN`), e ela não volta na
//      varredura seguinte.
// Q4 — `work_order_material.add` e `.remove` seguem pela rota de envio; a varredura não toca neles.
//
// Lei: `plano-B-O6R-04b.md` §3.3 (D8) e §4.3, mais as Emendas 1, 1.1, 1.2 e 1.3 (fora do repositório).
import 'package:erp_techsolutions_mobile/core/network/api_contracts.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_presentation.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_routing.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_repository.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_stalled_resolver.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_user_scope.dart';
import 'package:flutter_test/flutter_test.dart';

const _tenant = 'tenant-bo6r04b-fila';
const _eu = 'u-bo6r04b-eu';

/// A frase do D8 do plano, literal.
const _fraseD8 =
    'O aplicativo não registra mais entrada e saída avulsas de estoque. '
    'Este lançamento não chegou ao servidor. '
    'Refaça no sistema web e descarte este registro.';

SyncAction _acao(String id, String type, Map<String, Object?> payload) =>
    SyncAction(
      clientActionId: id,
      tenantId: _tenant,
      userId: _eu,
      type: type,
      payload: payload,
      status: SyncStatus.pending,
      createdAt: DateTime.utc(2026, 11, 17, 12),
    );

// A carga que as telas retiradas (Nova Entrada / Nova Saída) enfileiravam.
const _entrada = <String, Object?>{
  'item_id': 'item-1',
  'quantity': 3,
  'invoice_number': 'NF-123',
  'supplier': 'Fornecedor',
};
const _saida = <String, Object?>{
  'item_id': 'item-1',
  'quantity': 1,
  'work_order_id': 'wo-1',
};

SyncQueueRepository _filaDoUsuario(InMemorySyncQueueRepository base) =>
    UserScopedSyncQueueRepository(queue: base, currentUserId: () => _eu);

Future<SyncAction> _guardada(SyncQueueRepository queue, String id) async =>
    (await queue.actionsForTenant(
      _tenant,
    )).singleWhere((a) => a.clientActionId == id);

void _confereNaoEnviavel(SyncAction acao) {
  expect(acao.status, SyncStatus.failed, reason: acao.clientActionId);
  expect(acao.retryCount, kSyncMaxRetry, reason: acao.clientActionId);
  expect(acao.lastErrorCode, syncUnroutableErrorCode);
  expect(acao.lastSafeError, _fraseD8, reason: acao.clientActionId);
  expect(
    presentSyncAction(acao, expenseChannelOff: false),
    SyncPresentation.stalled,
    reason: 'aparece em Envio não concluído',
  );
  expect(canDiscardSyncAction(acao.type), isTrue, reason: 'tem Descartar');
}

void main() {
  test('Q1 — inventory_entry.create pendente vira não enviável, com a frase '
      'do D8, depois de uma varredura', () async {
    final base = InMemorySyncQueueRepository();
    final queue = _filaDoUsuario(base);
    await queue.enqueue(
      _acao('q1-entrada', InventorySyncActionTypes.entryCreate, _entrada),
    );

    final marcadas = await SyncActionRoutingSweep(
      queue: queue,
    ).sweepTenant(_tenant);

    expect(marcadas.map((a) => a.clientActionId), ['q1-entrada']);
    _confereNaoEnviavel(await _guardada(queue, 'q1-entrada'));
  });

  test('Q2 — inventory_exit.create pendente vira não enviável, com a frase '
      'do D8, depois de uma varredura', () async {
    final base = InMemorySyncQueueRepository();
    final queue = _filaDoUsuario(base);
    await queue.enqueue(
      _acao('q2-saida', InventorySyncActionTypes.exitCreate, _saida),
    );

    final marcadas = await SyncActionRoutingSweep(
      queue: queue,
    ).sweepTenant(_tenant);

    expect(marcadas.map((a) => a.clientActionId), ['q2-saida']);
    _confereNaoEnviavel(await _guardada(queue, 'q2-saida'));
  });

  test('Q3 — Descartar encerra a ação antiga de estoque, e ela não volta na '
      'varredura seguinte', () async {
    final base = InMemorySyncQueueRepository();
    final queue = _filaDoUsuario(base);
    await queue.enqueue(
      _acao('q3-entrada', InventorySyncActionTypes.entryCreate, _entrada),
    );
    await queue.enqueue(
      _acao('q3-saida', InventorySyncActionTypes.exitCreate, _saida),
    );
    final sweep = SyncActionRoutingSweep(queue: queue);
    await sweep.sweepTenant(_tenant);

    for (final id in ['q3-entrada', 'q3-saida']) {
      final marcada = await _guardada(queue, id);
      _confereNaoEnviavel(marcada);
      await queue.update(
        resolveStalledAction(
          marcada,
          StalledChoice.discard,
          resolvedAt: DateTime.utc(2026, 11, 17, 13),
        ),
      );
    }

    final daSegunda = await sweep.sweepTenant(_tenant);

    expect(daSegunda, isEmpty, reason: 'a segunda varredura não marca nada');
    for (final id in ['q3-entrada', 'q3-saida']) {
      final a = await _guardada(queue, id);
      expect(a.status, SyncStatus.synced, reason: id);
      expect(a.lastErrorCode, syncDiscardedErrorCode, reason: id);
      expect(
        presentSyncAction(a, expenseChannelOff: false),
        SyncPresentation.discarded,
        reason: id,
      );
    }
  });

  test('Q4 — material da OS (add e remove) segue pela rota de envio; a '
      'varredura não toca nele', () async {
    final base = InMemorySyncQueueRepository();
    final queue = _filaDoUsuario(base);
    final material = {
      'q4-add': InventorySyncActionTypes.materialAdd,
      'q4-remove': InventorySyncActionTypes.materialRemove,
    };
    for (final e in material.entries) {
      final acao = _acao(e.key, e.value, const {
        'work_order_local_id': 'wo-local-q4',
        'material_local_id': 'mat-q4',
        'sku': 'ELE-0102',
        'quantity': 1,
      });
      expect(routeOf(acao), SyncActionRoute.replay, reason: e.key);
      await queue.enqueue(acao);
    }

    final marcadas = await SyncActionRoutingSweep(
      queue: queue,
    ).sweepTenant(_tenant);

    expect(marcadas, isEmpty);
    for (final id in material.keys) {
      final a = await _guardada(queue, id);
      expect(a.status, SyncStatus.pending, reason: id);
      expect(a.lastErrorCode, isNull, reason: id);
      expect(a.retryCount, 0, reason: id);
    }
  });
}
