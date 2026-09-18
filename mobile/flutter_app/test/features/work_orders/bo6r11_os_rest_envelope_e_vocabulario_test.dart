import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:erp_techsolutions_mobile/core/network/api_contracts.dart';
import 'package:erp_techsolutions_mobile/core/network/api_error.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_replay_service.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_remote_api.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/domain/work_order_models.dart';
import 'package:flutter_test/flutter_test.dart';

// B-O6R-11 (Ω6R-QUA-004) — o REST da OS no app de campo: envelope, casing, vocabulário e payload.
//
// O que estava quebrado, medido no head-base (plano B-O6R-11 §2/§4):
//
//   1. ENVELOPE — `GET /work-orders/:id`, `PATCH /:id/status` e `POST /:id/assign` respondem
//      `{ data: toWorkOrderDto(...) }`; o app passava o envelope INTEIRO ao parser.
//   2. CASING   — o parser antigo lia snake_case (`customer_name`) sobre um DTO camelCase e exigia
//      `json['tenant_id'] as String`, campo que o DTO CORRETAMENTE não emite (§2.8). Resposta
//      íntegra = TypeError.
//   3. VOCABULÁRIO — o backend fala `open/assigned/accepted/on_route/on_site/in_progress`; o app só
//      traduzia `pending_approval`, e todo o resto caía em `scheduled` — inclusive na lista VIVA
//      do B-099. E o PATCH mandava `status.name` (`inService`), que o backend recusa com 400.
//   4. PAYLOAD  — a atribuição mandava `user_id`/`note`; o backend lê `operatorId ?? userId` e
//      `message` (work-order.service.ts:1676-1688) → 400 antes de qualquer efeito.
//
// Os testes passam pelo cliente REAL (Dio + adaptador falso), com o corpo EXATO que
// `toWorkOrderDto`/`toWorkOrderListDto` produzem — espelho do b127_timeline_remota_test.dart.
//
// Vermelho-controle no head-base: os testes marcados `vc:simbolo-novo` usam o parâmetro
// `tenantId` e a função `backendStatusFor`, que só existem depois do conserto — no head-base o
// arquivo inteiro não compila. Para medir os demais um a um, o vermelho-controle roda também uma
// cópia sem os blocos marcados (registro do dev do bloco).

class _AdaptadorFalso implements HttpClientAdapter {
  _AdaptadorFalso(this.corpo, {this.status = 200});

  final Object corpo;
  final int status;
  final List<RequestOptions> capturadas = [];

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    capturadas.add(options);
    return ResponseBody.fromString(
      jsonEncode(corpo),
      status,
      headers: {
        Headers.contentTypeHeader: ['application/json; charset=utf-8'],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}

({DioWorkOrderRemoteApi api, _AdaptadorFalso adaptador}) _apiCom(
  Object corpo, {
  int status = 200,
}) {
  final adaptador = _AdaptadorFalso(corpo, status: status);
  final dio = Dio(BaseOptions(baseUrl: 'https://test.local'));
  dio.transformer = SyncTransformer();
  dio.httpClientAdapter = adaptador;
  return (api: DioWorkOrderRemoteApi(dio), adaptador: adaptador);
}

const _id = '6f1c2b8e-2d3a-4c1e-9b7a-1a2b3c4d5e6f';

/// O corpo EXATO de `toWorkOrderDto` (work-order.dto.ts): camelCase, com `links` e `checklists`
/// (caminho de detalhe) e SEM `tenantId` — o DTO nunca emite o identificador da organização.
Map<String, dynamic> _dtoDoBackend({
  String status = 'in_progress',
  String? assignedUserId = 'user-7',
}) => {
  'id': _id,
  'code': 'OS-4821',
  'title': 'Troca de disjuntor do quadro 2',
  'description': 'Cliente sem energia no quadro 2',
  'customerName': 'Mercado Bom Preço',
  'customerDocument': '12.345.678/0001-90',
  'customerPhone': '+55 11 90000-0000',
  'serviceAddress': 'Av. Paulista, 1000',
  'serviceCity': 'São Paulo',
  'serviceState': 'SP',
  'serviceZipCode': '01310-100',
  'serviceLatitude': -23.5613,
  'serviceLongitude': -46.6565,
  'serviceGeocodedAt': null,
  'serviceGeocodeSource': null,
  'destinationAddress': null,
  'destinationCity': null,
  'destinationState': null,
  'destinationZipCode': null,
  'destinationLatitude': null,
  'destinationLongitude': null,
  'destinationGeocodedAt': null,
  'destinationGeocodeSource': null,
  'serviceDetails': null,
  'priority': 'high',
  'status': status,
  'assignedOperatorId': 'op-3',
  'assignedUserId': assignedUserId,
  'checklistId': 'chk-1',
  'checklistSnapshot': null,
  'customerId': 'cust-1',
  'vehicleId': null,
  'teamId': null,
  'serviceCatalogId': null,
  'scheduledFor': '2026-09-18T12:00:00.000Z',
  'slaDueAt': null,
  'startedAt': '2026-09-18T12:30:00.000Z',
  'arrivedAt': '2026-09-18T12:20:00.000Z',
  'completedAt': null,
  'cancelledAt': null,
  'cancellationReason': null,
  'financialCancellationDecision': null,
  'mileageStart': null,
  'mileageEnd': null,
  'mileageSource': null,
  'mileageCorrectedAt': null,
  'createdBy': 'user-1',
  'updatedBy': 'user-1',
  'createdAt': '2026-09-18T11:00:00.000Z',
  'updatedAt': '2026-09-18T12:31:00.000Z',
  'links': {
    'customer': {'id': 'cust-1', 'name': 'Mercado Bom Preço', 'isActive': true},
    'vehicle': null,
    'team': null,
    'serviceCatalog': null,
  },
  'checklists': [
    {
      'checklistId': 'chk-1',
      'role': 'primary',
      'source': 'manual',
      'ruleId': null,
      'orderIndex': 0,
    },
  ],
};

/// Backend → app (os 10 valores de `WORK_ORDER_STATUSES`, work-order.types.ts:6-17).
const _backendParaApp = <String, WorkOrderStatus>{
  'open': WorkOrderStatus.scheduled,
  'assigned': WorkOrderStatus.dispatched,
  // `accepted` é lossy de propósito: o app não distingue "atribuída" de "aceita"
  // (P-MOBILE-STATUS-ACCEPTED-LOSSY, decisão de produto).
  'accepted': WorkOrderStatus.dispatched,
  'on_route': WorkOrderStatus.enRoute,
  'on_site': WorkOrderStatus.arrived,
  'in_progress': WorkOrderStatus.inService,
  'paused': WorkOrderStatus.paused,
  'completed': WorkOrderStatus.completed,
  'cancelled': WorkOrderStatus.cancelled,
  'rejected': WorkOrderStatus.rejected,
};

/// App → backend (tabela §7 do plano) — o contrato do PATCH, escrito aqui por extenso.
const _appParaBackend = <WorkOrderStatus, String>{
  WorkOrderStatus.scheduled: 'open',
  WorkOrderStatus.dispatched: 'assigned',
  WorkOrderStatus.enRoute: 'on_route',
  WorkOrderStatus.arrived: 'on_site',
  WorkOrderStatus.inService: 'in_progress',
  WorkOrderStatus.paused: 'paused',
  WorkOrderStatus.completed: 'completed',
  WorkOrderStatus.cancelled: 'cancelled',
  WorkOrderStatus.rejected: 'rejected',
};

/// Estados que só existem no app — o backend não tem equivalente e o app não pode pedi-los.
const _semEquivalente = {
  WorkOrderStatus.pendingApproval,
  WorkOrderStatus.approved,
  WorkOrderStatus.exception,
};

void main() {
  group('B-O6R-11 REST da OS — envelope, casing e vocabulário', () {
    test(
      '1. fetchWorkOrder desembrulha `data` e lê o DTO camelCase sem tenantId',
      () async {
        final (:api, :adaptador) = _apiCom({'data': _dtoDoBackend()});

        final os = await api.fetchWorkOrder(_id);

        expect(adaptador.capturadas.single.method, 'GET');
        expect(adaptador.capturadas.single.path, '/api/v1/work-orders/$_id');
        expect(os.serverId, _id);
        expect(os.localId, _id);
        expect(os.code, 'OS-4821');
        expect(os.title, 'Troca de disjuntor do quadro 2');
        expect(os.customerName, 'Mercado Bom Preço');
        expect(os.customerDocument, '12.345.678/0001-90');
        expect(os.serviceAddress, 'Av. Paulista, 1000');
        expect(os.assignedUserId, 'user-7');
        expect(os.checklistId, 'chk-1');
        expect(os.priority, WorkOrderPriority.high);
        expect(os.scheduledAt, DateTime.utc(2026, 9, 18, 12));
        expect(os.arrivedAt, DateTime.utc(2026, 9, 18, 12, 20));
        expect(os.startedAt, DateTime.utc(2026, 9, 18, 12, 30));
        expect(os.createdAt, DateTime.utc(2026, 9, 18, 11));
        expect(os.updatedAt, DateTime.utc(2026, 9, 18, 12, 31));
        expect(os.syncStatus, SyncStatus.synced);
      },
    );

    test(
      '2. fetchWorkOrder traduz os 10 status do backend para o vocabulário do app',
      () async {
        for (final MapEntry(key: doBackend, value: esperado)
            in _backendParaApp.entries) {
          final (:api, adaptador: _) = _apiCom({
            'data': _dtoDoBackend(status: doBackend),
          });

          final os = await api.fetchWorkOrder(_id);

          expect(os.status, esperado, reason: 'backend "$doBackend"');
        }
      },
    );

    // vc:simbolo-novo:inicio
    test(
      '3. o tenant da OS vem do parâmetro da sessão, nunca do corpo',
      () async {
        final (:api, adaptador: _) = _apiCom({'data': _dtoDoBackend()});

        final comSessao = await api.fetchWorkOrder(_id, tenantId: 't-1');
        final semSessao = await api.fetchWorkOrder(_id);

        expect(comSessao.tenantId, 't-1');
        expect(
          semSessao.tenantId,
          isEmpty,
          reason: 'o DTO não emite tenant (§2.8); sem sessão, fica vazio',
        );
      },
    );
    // vc:simbolo-novo:fim

    test(
      '4. fetchWorkOrder com 404 vira ApiServerError(404) — o mapeamento de erro segue',
      () async {
        final (:api, adaptador: _) = _apiCom({
          'error': {'code': 'WORK_ORDER_NOT_FOUND'},
        }, status: 404);

        await expectLater(
          api.fetchWorkOrder(_id),
          throwsA(
            isA<ApiServerError>().having((e) => e.statusCode, 'status', 404),
          ),
        );
      },
    );

    test(
      '5. updateWorkOrderStatus envia o vocabulário do backend no PATCH /status',
      () async {
        final (:api, :adaptador) = _apiCom({'data': _dtoDoBackend()});

        await api.updateWorkOrderStatus(_id, WorkOrderStatus.inService);

        final pedido = adaptador.capturadas.single;
        expect(pedido.method, 'PATCH');
        expect(pedido.path, '/api/v1/work-orders/$_id/status');
        expect(pedido.data, {'status': 'in_progress'});
      },
    );

    test(
      '6. os 9 status com equivalente seguem a tabela; os 3 sem equivalente são recusados antes do pedido',
      () async {
        for (final MapEntry(key: doApp, value: esperado)
            in _appParaBackend.entries) {
          final (:api, :adaptador) = _apiCom({'data': _dtoDoBackend()});

          await api.updateWorkOrderStatus(_id, doApp);

          expect(adaptador.capturadas.single.data, {
            'status': esperado,
          }, reason: 'app ${doApp.name}');
        }

        for (final doApp in _semEquivalente) {
          final (:api, :adaptador) = _apiCom({'data': _dtoDoBackend()});

          await expectLater(
            api.updateWorkOrderStatus(_id, doApp),
            throwsArgumentError,
            reason: 'app ${doApp.name} não existe no backend',
          );
          expect(
            adaptador.capturadas,
            isEmpty,
            reason: 'nenhum pedido pode sair para ${doApp.name}',
          );
        }

        // A tabela cobre o enum inteiro: 9 com equivalente + 3 sem. Estado novo no app sem
        // decisão aqui deixa este teste vermelho (default negar).
        expect({
          ..._appParaBackend.keys,
          ..._semEquivalente,
        }, WorkOrderStatus.values.toSet());
      },
    );

    test(
      '7. updateWorkOrderStatus lê a OS devolvida dentro de `data`',
      () async {
        final (:api, adaptador: _) = _apiCom({
          'data': _dtoDoBackend(status: 'on_site'),
        });

        final os = await api.updateWorkOrderStatus(
          _id,
          WorkOrderStatus.arrived,
        );

        expect(os.status, WorkOrderStatus.arrived);
        expect(os.serverId, _id);
        expect(os.customerName, 'Mercado Bom Preço');
      },
    );

    test(
      '8. assignWorkOrder envia o campo que o backend lê (`userId`, `message`)',
      () async {
        final (:api, :adaptador) = _apiCom({
          'data': _dtoDoBackend(status: 'assigned'),
        });

        await api.assignWorkOrder(_id, 'user-7', note: 'Guincho 12');

        final pedido = adaptador.capturadas.single;
        expect(pedido.method, 'POST');
        expect(pedido.path, '/api/v1/work-orders/$_id/assign');
        expect(pedido.data, {'userId': 'user-7', 'message': 'Guincho 12'});
        final corpo = pedido.data as Map<String, dynamic>;
        expect(corpo.containsKey('user_id'), isFalse);
        expect(corpo.containsKey('note'), isFalse);

        // Observação em branco não vira `message` vazia.
        final (api: api2, adaptador: adaptador2) = _apiCom({
          'data': _dtoDoBackend(status: 'assigned'),
        });
        await api2.assignWorkOrder(_id, 'user-7', note: '   ');
        expect(adaptador2.capturadas.single.data, {'userId': 'user-7'});
      },
    );

    test('9. assignWorkOrder lê a OS atribuída dentro de `data`', () async {
      final (:api, adaptador: _) = _apiCom({
        'data': _dtoDoBackend(status: 'assigned', assignedUserId: 'user-7'),
      });

      final os = await api.assignWorkOrder(_id, 'user-7');

      expect(os.status, WorkOrderStatus.dispatched);
      expect(os.assignedUserId, 'user-7');
      expect(os.serverId, _id);
    });

    test(
      '10. a lista viva do B-099 traduz o status (não cai tudo em "Agendada")',
      () async {
        Map<String, dynamic> item(String id, String status) => {
          'id': id,
          'code': 'OS-$id',
          'title': 'OS $id',
          'status': status,
          'priority': 'medium',
          'customerName': 'Cliente $id',
          'serviceAddress': 'Rua $id',
          'serviceLatitude': null,
          'serviceLongitude': null,
          'assignedOperatorId': null,
          'assignedUserId': 'user-7',
          'vehicleId': null,
          'scheduledFor': null,
          'slaDueAt': null,
          'createdAt': '2026-09-18T11:00:00.000Z',
        };
        final (:api, adaptador: _) = _apiCom({
          'items': [item('a', 'in_progress'), item('b', 'assigned')],
          'pagination': {'limit': 20, 'offset': 0, 'total': 2},
        });

        final lista = await api.fetchWorkOrders(tenantId: 't-1');

        expect(lista.map((o) => o.status).toList(), [
          WorkOrderStatus.inService,
          WorkOrderStatus.dispatched,
        ]);
        expect(lista.every((o) => o.tenantId == 't-1'), isTrue);
      },
    );

    // vc:simbolo-novo:inicio
    test(
      '11. paridade com a fila: backendStatusFor == WorkOrderSyncCodec para todo status aceito',
      () async {
        const codec = WorkOrderSyncCodec();
        final aceitos = <WorkOrderStatus>[];

        for (final status in WorkOrderStatus.values) {
          final String doRest;
          try {
            doRest = backendStatusFor(status);
          } on ArgumentError {
            continue;
          }
          aceitos.add(status);

          final pedido = codec.encodeRequest([
            SyncAction(
              clientActionId: 'ca-${status.name}',
              tenantId: 't-1',
              type: WorkOrderSyncActionTypes.statusUpdate,
              payload: {'server_id': _id, 'new_status': status.name},
              status: SyncStatus.pending,
              createdAt: DateTime.utc(2026, 9, 18),
            ),
          ]);
          final acoes = pedido['actions'] as List<Object?>;
          final payload =
              (acoes.single as Map<String, Object?>)['payload']
                  as Map<String, Object?>;

          expect(
            payload['status'],
            doRest,
            reason:
                'REST e fila traduzem ${status.name} de jeitos diferentes — as duas tabelas divergiram',
          );

          // E o fio do REST é o mesmo valor.
          final (:api, :adaptador) = _apiCom({'data': _dtoDoBackend()});
          await api.updateWorkOrderStatus(_id, status);
          expect(adaptador.capturadas.single.data, {'status': doRest});
        }

        expect(aceitos.toSet(), _appParaBackend.keys.toSet());
      },
    );
    // vc:simbolo-novo:fim

    test(
      '12. fetchTimeline continua desembrulhando `data` (guarda do #351)',
      () async {
        final (:api, :adaptador) = _apiCom({
          'data': [
            {
              'id': 'evt-1',
              'workOrderId': _id,
              'eventType': 'work_order_assigned',
              'fromStatus': 'open',
              'toStatus': 'assigned',
              'actorUserId': 'user-1',
              'message': 'Atribuída ao técnico',
              'metadata': null,
              'createdAt': '2026-09-18T11:05:00.000Z',
            },
          ],
        });

        final eventos = await api.fetchTimeline(_id);

        expect(
          adaptador.capturadas.single.path,
          '/api/v1/work-orders/$_id/timeline',
        );
        expect(eventos, hasLength(1));
        expect(eventos.single.eventType, WorkOrderTimelineEventType.assigned);
        expect(eventos.single.note, 'Atribuída ao técnico');
      },
    );
  });
}
