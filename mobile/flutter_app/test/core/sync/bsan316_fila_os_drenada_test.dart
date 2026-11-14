// B-SAN3-16 (item 5 do portão, `P-MOBILE-FILA-OS-NAO-DRENADA`) — "Solicitar aprovação" e "Não foi possível iniciar"
// saem da fila do aparelho.
//
// Lei: `plano-B-SAN3-16.md` + Emendas 1, 1.1 e 1.1.1 da abertura (fora do repositório). O que este arquivo prende:
//   - P1: os dois tipos entram no replay de OS, no grupo dos dependentes (depois do `create`), só com id de servidor
//     e motivo; o pacote leva só a lista fechada (nunca o id do usuário nem a organização) e corta o texto nos
//     limites do contrato (motivo 500 e impacto 1000 no pedido; motivo 200 e observação 1000 no "não iniciou");
//   - P4: um passe pelo `DioWorkOrderSyncBatchApi` real deixa a fila vazia; a recusa vira `failed` reenviável e, na
//     5ª, "Envio não concluído" com Descartar (a semântica herdada do B-SAN3-14, sem mudança);
//   - P6: o lote que o codec produz é o fixture `bsan316_lote_os_contrato.json`, que o servidor recebe no B8.
//
// VERMELHO-CONTROLE (F1b, em `eeac48a3`): os dois tipos não saem (S1 do plano), e sairiam com `payload: {}` (S2).
import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/network/api_contracts.dart';
import 'package:erp_techsolutions_mobile/core/permissions/permission_resolver.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_factory.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_repository.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_replay_service.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_stalled_resolver.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_local_store.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_repository.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/domain/work_order_models.dart';
import 'package:flutter_test/flutter_test.dart';

const _tenant = 'tenant-bsan316';
const _usuario = 'u-bsan316';
const _os = '7d1a3f40-0000-4000-8000-000000000316';
const _local = 'wo-local-bsan316';

SyncAction _acao(
  String id,
  String type,
  Map<String, Object?> payload, {
  SyncStatus status = SyncStatus.pending,
  int retry = 0,
}) => SyncAction(
  clientActionId: id,
  tenantId: _tenant,
  userId: _usuario,
  type: type,
  payload: payload,
  status: status,
  createdAt: DateTime.utc(2026, 11, 14, 15),
  retryCount: retry,
);

Map<String, Object?> _pedido({
  String? serverId = _os,
  String? reason = 'Troca de peça fora do orçamento',
}) => {
  'local_id': _local,
  'server_id': serverId,
  'reason': ?reason,
  'impact': 'O serviço atrasa dois dias sem a peça.',
  'urgency': 'high',
  'requested_at': '2026-11-14T15:00:00.000Z',
  'requested_by_user_id': _usuario,
};

Map<String, Object?> _naoIniciou({
  String? serverId = _os,
  String? reason = 'Cliente ausente no local',
}) => {
  'local_id': _local,
  'server_id': ?serverId,
  'reason': ?reason,
  'note': 'Portão fechado; ninguém atendeu.',
  'occurred_at': '2026-11-14T15:05:00.000Z',
  'reported_by_user_id': _usuario,
};

/// O servidor do lote de OS, no formato da resposta real (`accepted`/`rejected` por ação, com `work_order_id`).
class _ServidorDoLote implements HttpClientAdapter {
  _ServidorDoLote({this.recusar = false});

  final bool recusar;
  final String idDaOsCriada = 'srv-os-criada';
  final List<Map<String, dynamic>> lotes = <Map<String, dynamic>>[];

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    final lote = Map<String, dynamic>.from(
      jsonDecode(jsonEncode(options.data)) as Map,
    );
    lotes.add(lote);
    final aceitas = <Map<String, Object?>>[];
    final recusadas = <Map<String, Object?>>[];
    for (final raw in (lote['actions'] as List).cast<Map>()) {
      final acao = Map<String, dynamic>.from(raw);
      final payload = Map<String, dynamic>.from(acao['payload'] as Map);
      final workOrderId = acao['type'] == WorkOrderSyncActionTypes.create
          ? idDaOsCriada
          : payload['work_order_id'] as String?;
      if (recusar && acao['type'] != WorkOrderSyncActionTypes.create) {
        recusadas.add({
          'client_action_id': acao['client_action_id'],
          'type': acao['type'],
          'status': 'rejected',
          'work_order_id': workOrderId,
          'error': {
            'code': 'SERVICE_UNAVAILABLE',
            'reason': 'approval_unavailable',
            'message':
                'Não foi possível registrar o pedido de aprovação agora.',
          },
        });
        continue;
      }
      aceitas.add({
        'client_action_id': acao['client_action_id'],
        'type': acao['type'],
        'status': 'accepted',
        'work_order_id': workOrderId,
        'server_state': {'id': workOrderId, 'status': 'assigned'},
      });
    }
    return ResponseBody.fromString(
      jsonEncode({
        'data': {
          'contract': {'name': 'mobile_work_order_actions_sync'},
          'accepted': aceitas,
          'rejected': recusadas,
          'conflicts': const <Object?>[],
          'already_applied': const <Object?>[],
        },
      }),
      200,
      headers: {
        Headers.contentTypeHeader: ['application/json; charset=utf-8'],
      },
    );
  }

  @override
  void close({bool force = false}) {}

  List<Map<String, dynamic>> acoesDoTipo(String type) => [
    for (final lote in lotes)
      for (final raw in (lote['actions'] as List).cast<Map>())
        if (raw['type'] == type) Map<String, dynamic>.from(raw),
  ];
}

({WorkOrderSyncReplayService replay, _ServidorDoLote servidor}) _replay(
  SyncQueueRepository queue, {
  bool recusar = false,
}) {
  final servidor = _ServidorDoLote(recusar: recusar);
  final dio = Dio(BaseOptions(baseUrl: 'https://servidor.test'))
    ..httpClientAdapter = servidor;
  return (
    replay: WorkOrderSyncReplayService(
      queue: queue,
      api: DioWorkOrderSyncBatchApi(dio),
    ),
    servidor: servidor,
  );
}

Map<String, dynamic> _contrato() =>
    jsonDecode(
          File(
            'test/core/sync/bsan316_lote_os_contrato.json',
          ).readAsStringSync(),
        )
        as Map<String, dynamic>;

void main() {
  test('A1. aprovação com id de servidor e motivo sai no lote com motivo, '
      'impacto e urgência, sem id de usuário nem organização', () async {
    final queue = InMemorySyncQueueRepository();
    await queue.enqueue(
      _acao('a1', WorkOrderSyncActionTypes.approvalRequest, _pedido()),
    );
    final h = _replay(queue);

    await h.replay.replayTenant(_tenant);

    final enviadas = h.servidor.acoesDoTipo(
      WorkOrderSyncActionTypes.approvalRequest,
    );
    expect(enviadas, hasLength(1), reason: 'o pedido não saiu do aparelho');
    expect(enviadas.single['payload'], {
      'work_order_id': _os,
      'reason': 'Troca de peça fora do orçamento',
      'impact': 'O serviço atrasa dois dias sem a peça.',
      'urgency': 'high',
      'metadata': {
        'source': 'mobile_offline',
        'local_id': _local,
        'requested_at': '2026-11-14T15:00:00.000Z',
      },
    });
    final serializado = jsonEncode(h.servidor.lotes).toLowerCase();
    expect(serializado, isNot(contains('requested_by_user_id')));
    expect(serializado, isNot(contains(_usuario)));
    expect(serializado, isNot(contains('tenant_id')));
    expect(serializado, isNot(contains(_tenant)));
  });

  test('A2. não iniciou sai no lote com motivo e observação', () async {
    final queue = InMemorySyncQueueRepository();
    await queue.enqueue(
      _acao('a2', WorkOrderSyncActionTypes.unableToStart, _naoIniciou()),
    );
    final h = _replay(queue);

    await h.replay.replayTenant(_tenant);

    final enviadas = h.servidor.acoesDoTipo(
      WorkOrderSyncActionTypes.unableToStart,
    );
    expect(enviadas, hasLength(1), reason: 'o "não iniciou" não saiu');
    expect(enviadas.single['payload'], {
      'work_order_id': _os,
      'reason': 'Cliente ausente no local',
      'note': 'Portão fechado; ninguém atendeu.',
      'metadata': {
        'source': 'mobile_offline',
        'local_id': _local,
        'occurred_at': '2026-11-14T15:05:00.000Z',
      },
    });
    final serializado = jsonEncode(h.servidor.lotes).toLowerCase();
    expect(serializado, isNot(contains('reported_by_user_id')));
    expect(serializado, isNot(contains(_usuario)));
  });

  test('A3. sem id de servidor espera; quando a OS criada offline sobe, os '
      'dois saem no mesmo passe', () async {
    final queue = InMemorySyncQueueRepository();
    await queue.enqueue(
      _acao('a3-create', WorkOrderSyncActionTypes.create, const {
        'local_id': _local,
        'title': 'OS criada no aparelho',
      }),
    );
    await queue.enqueue(
      _acao(
        'a3-pedido',
        WorkOrderSyncActionTypes.approvalRequest,
        _pedido(serverId: null),
      ),
    );
    await queue.enqueue(
      _acao(
        'a3-nao-iniciou',
        WorkOrderSyncActionTypes.unableToStart,
        _naoIniciou(serverId: null),
      ),
    );
    final h = _replay(queue);

    await h.replay.replayTenant(_tenant);

    expect(
      h.servidor.lotes,
      hasLength(2),
      reason: 'criação, depois os dependentes',
    );
    final primeiro = (h.servidor.lotes.first['actions'] as List).cast<Map>();
    expect(primeiro.map((a) => a['type']), [WorkOrderSyncActionTypes.create]);
    final segundo = (h.servidor.lotes.last['actions'] as List).cast<Map>();
    expect(
      segundo.map((a) => a['type']).toSet(),
      {
        WorkOrderSyncActionTypes.approvalRequest,
        WorkOrderSyncActionTypes.unableToStart,
      },
      reason: 'os dois saem no mesmo passe da criação',
    );
    for (final acao in segundo) {
      expect(acao['payload']['work_order_id'], 'srv-os-criada');
    }
    expect(await queue.pendingForTenant(_tenant), isEmpty);
  });

  test(
    'A4. pedido sem motivo não sai (nem "não iniciou" sem motivo)',
    () async {
      final queue = InMemorySyncQueueRepository();
      await queue.enqueue(
        _acao(
          'a4-pedido',
          WorkOrderSyncActionTypes.approvalRequest,
          _pedido(reason: null),
        ),
      );
      await queue.enqueue(
        _acao(
          'a4-pedido-branco',
          WorkOrderSyncActionTypes.approvalRequest,
          _pedido(reason: '   '),
        ),
      );
      await queue.enqueue(
        _acao(
          'a4-nao-iniciou',
          WorkOrderSyncActionTypes.unableToStart,
          _naoIniciou(reason: null),
        ),
      );
      final h = _replay(queue);

      await h.replay.replayTenant(_tenant);

      expect(h.servidor.lotes, isEmpty, reason: 'o servidor recusaria sempre');
      expect(
        (await queue.pendingForTenant(_tenant)).map((a) => a.status).toSet(),
        {SyncStatus.pending},
      );
    },
  );

  test(
    'A5. passe pelo DioWorkOrderSyncBatchApi real, com o servidor no '
    'formato da resposta: as duas ficam synced e a fila fica vazia',
    () async {
      final queue = InMemorySyncQueueRepository();
      await queue.enqueue(
        _acao('a5-pedido', WorkOrderSyncActionTypes.approvalRequest, _pedido()),
      );
      await queue.enqueue(
        _acao(
          'a5-nao-iniciou',
          WorkOrderSyncActionTypes.unableToStart,
          _naoIniciou(),
        ),
      );
      final h = _replay(queue);

      final resultado = await h.replay.replayTenant(_tenant);

      expect(resultado.synced.map((a) => a.clientActionId).toSet(), {
        'a5-pedido',
        'a5-nao-iniciou',
      });
      expect(await queue.pendingForTenant(_tenant), isEmpty);
      for (final acao in await queue.actionsForTenant(_tenant)) {
        expect(acao.status, SyncStatus.synced, reason: acao.clientActionId);
        expect(acao.payload['result_ref'], _os);
      }
    },
  );

  test('A6. recusa do servidor vira failed reenviável; na 5ª, Envio não '
      'concluído com Descartar', () async {
    final queue = InMemorySyncQueueRepository();
    await queue.enqueue(
      _acao('a6', WorkOrderSyncActionTypes.approvalRequest, _pedido()),
    );
    final h = _replay(queue, recusar: true);

    await h.replay.replayTenant(_tenant);
    var acao = (await queue.actionsForTenant(_tenant)).single;
    expect(acao.status, SyncStatus.failed);
    expect(acao.retryCount, 1);
    expect(acao.lastErrorCode, 'approval_unavailable');
    expect(isStalledAction(acao), isFalse, reason: 'ainda reenviável');

    for (var passe = 2; passe <= kSyncMaxRetry; passe++) {
      await h.replay.replayTenant(_tenant);
    }
    acao = (await queue.actionsForTenant(_tenant)).single;
    expect(acao.retryCount, kSyncMaxRetry);
    expect(isStalledAction(acao), isTrue, reason: 'Envio não concluído');
    expect(canDiscardSyncAction(acao.type), isTrue);
    final descartada = resolveStalledAction(acao, StalledChoice.discard);
    expect(descartada.status, SyncStatus.synced);
    expect(descartada.lastErrorCode, syncDiscardedErrorCode);

    final enviadas = h.servidor.acoesDoTipo(
      WorkOrderSyncActionTypes.approvalRequest,
    );
    expect(enviadas, hasLength(kSyncMaxRetry));
  });

  test('A7. o lote que o codec produz para a entrada do fixture é igual a '
      'bsan316_lote_os_contrato.json', () {
    final contrato = _contrato();
    final entrada = [
      for (final raw in (contrato['entrada'] as List).cast<Map>())
        SyncAction(
          clientActionId: raw['client_action_id'] as String,
          tenantId: _tenant,
          userId: _usuario,
          type: raw['type'] as String,
          payload: Map<String, Object?>.from(raw['payload'] as Map),
          status: SyncStatus.pending,
          createdAt: DateTime.parse(raw['created_at'] as String),
        ),
    ];
    final lote = WorkOrderSyncCodec(
      batchIdFactory: () => contrato['client_batch_id'] as String,
    ).encodeRequest(entrada);

    expect(jsonDecode(jsonEncode(lote)), contrato['lote']);
  });

  test('A8. motivo de 600 caracteres sai com 500; a linha do tempo local '
      'guarda os 600', () async {
    final motivo = 'Peça' * 150;
    expect(motivo.length, 600);
    final queue = InMemorySyncQueueRepository();
    final session = BootstrapSession(
      activeTenant: const TenantContext(
        tenantId: _tenant,
        displayName: 'Tenant B-SAN3-16',
      ),
      enabledModules: const [],
      permissions: const PermissionSet({'work_orders:update'}),
    );
    final repo = WorkOrderRepository(
      session: session,
      syncQueue: queue,
      actionFactory: SyncActionFactory(currentUserId: () => _usuario),
      localStore: InMemoryWorkOrderLocalStore([
        WorkOrder(
          localId: _local,
          serverId: _os,
          tenantId: _tenant,
          code: 'OS-316',
          title: 'OS do item 5',
          customerName: 'Cliente',
          serviceAddress: 'Rua 5, 16',
          status: WorkOrderStatus.inService,
          priority: WorkOrderPriority.normal,
          syncStatus: SyncStatus.synced,
          createdAt: DateTime.utc(2026, 11, 14),
        ),
      ]),
    );
    await repo.load(seedIfEmpty: false);
    await repo.createApprovalRequest(
      localId: _local,
      reason: motivo,
      impact: '',
      urgency: 'normal',
    );

    final linhaDoTempo = await repo.loadTimeline(_local);
    expect(
      linhaDoTempo.map((e) => e.note),
      contains(motivo),
      reason: 'o aparelho guarda o texto inteiro',
    );
    final h = _replay(queue);
    await h.replay.replayTenant(_tenant);
    final enviadas = h.servidor.acoesDoTipo(
      WorkOrderSyncActionTypes.approvalRequest,
    );
    expect(enviadas, hasLength(1), reason: 'o pedido não saiu do aparelho');
    final enviada = enviadas.single;
    expect((enviada['payload']['reason'] as String).length, 500);
    expect(enviada['payload']['reason'], motivo.substring(0, 500));
    expect(
      (enviada['payload'] as Map).containsKey('impact'),
      isFalse,
      reason: 'impacto vazio não viaja',
    );
  });
}
