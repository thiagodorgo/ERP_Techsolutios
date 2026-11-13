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
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_local_store.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_repository.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/domain/work_order_models.dart';
import 'package:flutter_test/flutter_test.dart';

// B-O6R-11d (P2, P2-bis) — o lote que o app MANDA para o servidor (`POST /mobile/sync/work-order-actions`).
//
// O instrumento é o caminho real: o produtor (`assignRegistry` do repositório), a fila em memória, o
// `WorkOrderSyncReplayService` e o `WorkOrderSyncCodec`, que é onde `_assignPayload` e `_backendStatus` rodam
// (CR2-11D-01: o `CaptureWorkOrderBatchApi` recebe a ação CRUA da fila; por isso o lote capturado passa pelo
// `encodeRequest`, como em `b126_registry_assignment_test.dart` e `bfilausuario_dependente_de_outro_dono_test.dart`).
//
// Q1 = A (`D-DONO-TODAS-RECOMENDACOES-1111`): a ação de viatura/equipe declara o técnico que o aparelho conhecia
// (`expected_technician_id`) e manda o `user_id` (o servidor apagava o usuário atribuído sem ele). Se a gestão
// trocou o técnico antes do envio, o servidor responde conflito, e a ação fica em conflito para decisão manual.

late final Map<String, dynamic> _fixture;

const _tenant = 'org-11d';
const _tecnicoU = '00000000-0000-4000-8000-000000000a01';
const _osServidor = '00000000-0000-4000-8000-0000000000f1';
const _viatura = '00000000-0000-4000-8000-0000000000c1';

const _session = BootstrapSession(
  activeTenant: TenantContext(tenantId: _tenant, displayName: 'Organização'),
  enabledModules: [],
  permissions: PermissionSet({'work_orders:read', 'work_orders:assign'}),
  user: AuthenticatedUser(
    userId: _tecnicoU,
    email: 'tecnico@11d.demo',
    tenantRole: 'field_technician',
    tenantRoles: ['field_technician'],
    scope: 'tenant',
  ),
);

WorkOrder _os() => WorkOrder(
  localId: 'wo-11d-01',
  serverId: _osServidor,
  tenantId: _tenant,
  code: 'OS-000777',
  title: 'OS do contrato',
  customerName: 'Cliente',
  serviceAddress: 'Rua do Contrato, 11',
  status: WorkOrderStatus.dispatched,
  priority: WorkOrderPriority.normal,
  syncStatus: SyncStatus.synced,
  createdAt: DateTime.utc(2026, 11, 11),
  assignedUserId: _tecnicoU,
);

Map<String, Object?> _semMetadata(Map<String, Object?> payload) =>
    Map<String, Object?>.from(payload)..remove('metadata');

Map<String, Object?> _payloadCodificado(SyncAction action) {
  final request = const WorkOrderSyncCodec().encodeRequest([action]);
  final encoded = (request['actions'] as List<Object?>).single as Map;
  return Map<String, Object?>.from(encoded['payload'] as Map);
}

List<SyncActionResult> _tudoProcessado(List<SyncAction> lote) => [
  for (final a in lote)
    SyncActionResult(clientActionId: a.clientActionId, status: 'processed'),
];

/// A tabela LITERAL do `_backendStatus` em `d5ec1696:sync_replay_service.dart:886-895`.
const Map<String, String> _filaD5ec1696 = {
  'scheduled': 'open',
  'dispatched': 'assigned',
  'enRoute': 'on_route',
  'arrived': 'on_site',
  'inService': 'in_progress',
  'paused': 'paused',
  'pendingApproval': 'pendingApproval',
  'completed': 'completed',
  'approved': 'approved',
  'rejected': 'rejected',
  'exception': 'exception',
  'cancelled': 'cancelled',
};

class _ServidorDeConflito implements HttpClientAdapter {
  int requisicoes = 0;
  Object? ultimoCorpo;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    requisicoes++;
    ultimoCorpo = options.data;
    final acoes = ((options.data as Map)['actions'] as List).cast<Map>();
    return ResponseBody.fromString(
      jsonEncode({
        'data': {
          'summary': {
            'received': acoes.length,
            'accepted': 0,
            'rejected': 0,
            'conflicts': acoes.length,
          },
          'accepted': const [],
          'already_applied': const [],
          'rejected': const [],
          'conflicts': [
            for (final acao in acoes)
              {
                'client_action_id': acao['client_action_id'],
                'type': 'work_order.assign',
                'status': 'conflict',
                'work_order_id': _osServidor,
                'conflict': {
                  'conflict_type': 'technician_changed_since_action',
                  'server_id': _osServidor,
                  'local': <String, dynamic>{},
                  'next_action': 'refresh_work_order_and_retry',
                },
                'error': {
                  'code': 'WORK_ORDER_TECHNICIAN_CHANGED',
                  'reason': 'technician_changed_since_action',
                  'message':
                      'O técnico desta OS mudou depois do envio; confira antes de reenviar.',
                },
              },
          ],
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
}

void main() {
  setUpAll(() {
    final raw = File(
      'test/features/work_orders/bo6r11d_work_order_contract.json',
    ).readAsStringSync();
    _fixture = (jsonDecode(raw) as Map).cast<String, dynamic>();
  });

  group('B-O6R-11d — o lote de viatura/equipe (P2-bis, Q1 = A)', () {
    test(
      'T9: o produtor real (assignRegistry) → fila → replay → codec manda exatamente sync_assign_payload; '
      'a ação legada sem user_id sai na mesma forma',
      () async {
        final esperado = Map<String, Object?>.from(
          _fixture['sync_assign_payload'] as Map,
        );
        final queue = InMemorySyncQueueRepository();
        final repo = WorkOrderRepository(
          session: _session,
          syncQueue: queue,
          actionFactory: SyncActionFactory(),
          localStore: InMemoryWorkOrderLocalStore([_os()]),
          seedWorkOrders: [_os()],
        );
        await repo.load(seedIfEmpty: false);
        await repo.assignRegistry(
          'wo-11d-01',
          vehicleId: _viatura,
          vehiclePlate: 'ABC1D23',
        );

        final capture = CaptureWorkOrderBatchApi(_tudoProcessado);
        final replay = WorkOrderSyncReplayService(queue: queue, api: capture);
        final resultado = await replay.replayTenant(_tenant);
        expect(resultado.synced, hasLength(1));
        final enviada = capture.captured!.single;
        expect(enviada.type, WorkOrderSyncActionTypes.assign);
        expect(_semMetadata(_payloadCodificado(enviada)), equals(esperado));

        // Ação já na fila antes do conserto (sem user_id): o codec deriva na hora do envio.
        final legada = SyncAction(
          clientActionId: 'assign-legado',
          tenantId: _tenant,
          type: WorkOrderSyncActionTypes.assign,
          payload: const {
            'local_id': 'wo-11d-01',
            'server_id': _osServidor,
            'operator_id': _tecnicoU,
            'vehicle_id': _viatura,
            'occurred_at': '2026-11-11T12:00:00.000Z',
            'message': 'Mobile definiu viatura/equipe.',
          },
          status: SyncStatus.pending,
          createdAt: DateTime.utc(2026, 11, 11, 12),
        );
        expect(_semMetadata(_payloadCodificado(legada)), equals(esperado));
      },
    );

    test(
      'T9c (regressão B-107): o conflito technician_changed_since_action vira conflito na fila, '
      'com o código do servidor, e não é reenviado sozinho',
      () async {
        final servidor = _ServidorDeConflito();
        final dio = Dio(BaseOptions(baseUrl: 'https://test.local'));
        dio.transformer = SyncTransformer();
        dio.httpClientAdapter = servidor;
        final api = DioWorkOrderSyncBatchApi(dio);

        final acao = SyncAction(
          clientActionId: 'assign-conflito',
          tenantId: _tenant,
          type: WorkOrderSyncActionTypes.assign,
          payload: const {
            'local_id': 'wo-11d-01',
            'server_id': _osServidor,
            'operator_id': _tecnicoU,
            'vehicle_id': _viatura,
            'message': 'Mobile definiu viatura/equipe.',
          },
          status: SyncStatus.pending,
          createdAt: DateTime.utc(2026, 11, 11, 12),
        );

        final direto = await api.sendBatch([acao]);
        expect(direto.single.status, 'conflict');
        expect(direto.single.errorCode, 'technician_changed_since_action');

        final queue = InMemorySyncQueueRepository();
        await queue.enqueue(acao);
        final replay = WorkOrderSyncReplayService(queue: queue, api: api);
        final primeiro = await replay.replayTenant(_tenant);
        expect(primeiro.conflicts, hasLength(1));
        final naFila = (await queue.actionsForTenant(_tenant)).single;
        expect(naFila.status, SyncStatus.conflict);
        expect(naFila.lastErrorCode, 'technician_changed_since_action');
        expect(naFila.lastSafeError, 'Conflito remoto exige decisão manual.');

        final antes = servidor.requisicoes;
        final segundo = await replay.replayTenant(_tenant);
        expect(segundo.synced, isEmpty);
        expect(segundo.conflicts, isEmpty);
        expect(
          servidor.requisicoes,
          antes,
          reason: 'reenviou a ação em conflito',
        );
      },
    );

    test(
      'T10b (regressão): a fila de status manda o mesmo status de d5ec1696 para os 12 status do app',
      () async {
        final queue = InMemorySyncQueueRepository();
        for (final status in WorkOrderStatus.values) {
          await queue.enqueue(
            SyncAction(
              clientActionId: 'status-${status.name}',
              tenantId: _tenant,
              type: WorkOrderSyncActionTypes.statusUpdate,
              payload: {
                'local_id': 'wo-${status.name}',
                'server_id': 'srv-${status.name}',
                'new_status': status.name,
                'previous_status': status.name,
              },
              status: SyncStatus.pending,
              createdAt: DateTime.utc(2026, 11, 11, 12),
            ),
          );
        }
        final capture = CaptureWorkOrderBatchApi(_tudoProcessado);
        final replay = WorkOrderSyncReplayService(queue: queue, api: capture);
        await replay.replayTenant(_tenant);
        final lote = capture.captured!;
        expect(lote, hasLength(WorkOrderStatus.values.length));

        final request = const WorkOrderSyncCodec().encodeRequest(lote);
        final acoes = (request['actions'] as List<Object?>).cast<Map>();
        final porId = {for (final a in acoes) a['client_action_id']: a};
        for (final par in _filaD5ec1696.entries) {
          final payload = Map<String, Object?>.from(
            porId['status-${par.key}']!['payload'] as Map,
          );
          expect(payload['status'], par.value, reason: 'status ${par.key}');
          final metadata = Map<String, Object?>.from(
            payload['metadata'] as Map,
          );
          expect(
            metadata['previous_status'],
            par.value,
            reason: 'previous ${par.key}',
          );
        }
      },
    );
  });
}
