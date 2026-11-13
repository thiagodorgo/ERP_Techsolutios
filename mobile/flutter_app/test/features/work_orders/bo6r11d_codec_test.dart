import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:erp_techsolutions_mobile/core/network/api_contracts.dart';
import 'package:erp_techsolutions_mobile/core/network/work_order_api_codec.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_replay_service.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_remote_api.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/domain/work_order_models.dart';
import 'package:flutter_test/flutter_test.dart';

// B-O6R-11d (P1, P2) — o codec ÚNICO de status e prioridade entre o app e o backend.
//
// O vocabulário do backend (`work-order.types.ts`: `WORK_ORDER_STATUSES`, `WORK_ORDER_PRIORITIES`) nunca coincidiu
// com o do app (`WorkOrderStatus`, `WorkOrderPriority`). Casar pelo nome do enum do app fazia 6 dos 10 status do
// servidor virarem "Agendada" e a OS "urgente" aparecer "Normal". A fixture compartilhada
// (`bo6r11d_work_order_contract.json`) amarra os dois lados: o teste Node confere que `backend_statuses` É a lista
// do backend, e este teste exige uma entrada EXPLÍCITA na tabela para cada item.

late final Map<String, dynamic> _fixture;

/// O que cada status do backend significa no app (a tabela da §2.2 do plano, escrita aqui à mão de propósito).
const Map<String, WorkOrderStatus> _esperadoDoBackend = {
  'open': WorkOrderStatus.scheduled,
  'assigned': WorkOrderStatus.dispatched,
  'accepted': WorkOrderStatus.dispatched,
  'on_route': WorkOrderStatus.enRoute,
  'on_site': WorkOrderStatus.arrived,
  'in_progress': WorkOrderStatus.inService,
  'paused': WorkOrderStatus.paused,
  'completed': WorkOrderStatus.completed,
  'cancelled': WorkOrderStatus.cancelled,
  'rejected': WorkOrderStatus.rejected,
  'pending_approval': WorkOrderStatus.pendingApproval,
};

/// A tabela LITERAL do `_backendStatus` em `d5ec1696:sync_replay_service.dart:886-895` (a fila não pode mudar).
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

class _AdaptadorContador implements HttpClientAdapter {
  int requisicoes = 0;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    requisicoes++;
    return ResponseBody.fromString(
      jsonEncode(_fixture['status_response']),
      200,
      headers: {
        Headers.contentTypeHeader: ['application/json; charset=utf-8'],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}

Map<String, Object?> _payloadDeCriacao(String prioridade) {
  final action = SyncAction(
    clientActionId: 'create-$prioridade',
    tenantId: 'org-sessao',
    type: WorkOrderSyncActionTypes.create,
    payload: {
      'local_id': 'wo-local-$prioridade',
      'title': 'OS $prioridade',
      'priority': prioridade,
    },
    status: SyncStatus.pending,
    createdAt: DateTime.utc(2026, 11, 11, 12),
  );
  final request = const WorkOrderSyncCodec().encodeRequest([action]);
  final encoded = (request['actions'] as List<Object?>).single as Map;
  return Map<String, Object?>.from(encoded['payload'] as Map);
}

void main() {
  setUpAll(() {
    final raw = File(
      'test/features/work_orders/bo6r11d_work_order_contract.json',
    ).readAsStringSync();
    _fixture = (jsonDecode(raw) as Map).cast<String, dynamic>();
  });

  group('B-O6R-11d — codec de status e prioridade', () {
    test(
      'T4: os 10 status do backend e pending_approval traduzem, cada um por entrada EXPLÍCITA da tabela; '
      'nome do app segue; desconhecido vira Agendada no FromApi e null no FromApiOrNull',
      () {
        final doBackend = (_fixture['backend_statuses'] as List).cast<String>();
        expect(doBackend, hasLength(10));
        for (final valor in doBackend) {
          expect(
            workOrderStatusHasBackendEntry(valor),
            isTrue,
            reason: '"$valor" do backend sem entrada explícita no codec',
          );
          expect(
            _esperadoDoBackend.containsKey(valor),
            isTrue,
            reason: '"$valor" do backend sem tradução esperada no teste',
          );
        }
        for (final par in _esperadoDoBackend.entries) {
          expect(
            workOrderStatusFromApi(par.key),
            par.value,
            reason: 'FromApi(${par.key})',
          );
          expect(
            workOrderStatusFromApiOrNull(par.key),
            par.value,
            reason: 'FromApiOrNull(${par.key})',
          );
        }
        // O cache local e os testes antigos (b109, b127) usam o nome do app.
        expect(workOrderStatusFromApi('approved'), WorkOrderStatus.approved);
        expect(workOrderStatusFromApi('inService'), WorkOrderStatus.inService);
        expect(
          workOrderStatusFromApi(' in_progress '),
          WorkOrderStatus.inService,
        );
        // Status futuro do backend: só o FromApi chuta (P-MOBILE-STATUS-DESCONHECIDO-VIRA-AGENDADA).
        expect(workOrderStatusFromApi('futuro_x'), WorkOrderStatus.scheduled);
        expect(workOrderStatusFromApiOrNull('futuro_x'), isNull);
        expect(workOrderStatusFromApiOrNull(null), isNull);
        expect(workOrderStatusFromApiOrNull(''), isNull);
        expect(workOrderStatusFromApiOrNull(42), isNull);
        // O nome antigo continua exportado (b109) e passa pelo mesmo codec.
        expect(workOrderStatusFromApiValue('on_site'), WorkOrderStatus.arrived);
      },
    );

    test(
      'T6: prioridade urgent→critical, medium→normal, low, high; e a prioridade que a fila manda '
      '(_backendPriority do create) é o inverso exato do workOrderPriorityFromApi',
      () {
        expect(workOrderPriorityFromApi('urgent'), WorkOrderPriority.critical);
        expect(workOrderPriorityFromApi('medium'), WorkOrderPriority.normal);
        expect(workOrderPriorityFromApi('low'), WorkOrderPriority.low);
        expect(workOrderPriorityFromApi('high'), WorkOrderPriority.high);
        // Nome do app (cache local) e desconhecido.
        expect(
          workOrderPriorityFromApi('critical'),
          WorkOrderPriority.critical,
        );
        expect(workOrderPriorityFromApi('futura'), WorkOrderPriority.normal);
        expect(workOrderPriorityFromApi(null), WorkOrderPriority.normal);

        // CR2-11D-07(b): ida e volta pelas 4 prioridades do app.
        final enviadas = <String>{};
        for (final prioridade in WorkOrderPriority.values) {
          final payload = _payloadDeCriacao(prioridade.name);
          final noServidor = payload['priority'] as String;
          enviadas.add(noServidor);
          expect(
            workOrderPriorityFromApi(noServidor),
            prioridade,
            reason: '${prioridade.name} → $noServidor não volta',
          );
        }
        expect(enviadas, {'low', 'medium', 'high', 'urgent'});
      },
    );

    test(
      'T10: workOrderStatusNameToApi é a tabela literal da fila de d5ec1696, para os 12 status do app',
      () {
        expect(
          _filaD5ec1696.keys.toSet(),
          WorkOrderStatus.values.map((s) => s.name).toSet(),
        );
        for (final par in _filaD5ec1696.entries) {
          expect(workOrderStatusNameToApi(par.key), par.value, reason: par.key);
        }
      },
    );

    test(
      'T14: rejected entra como Rejeitada, não tem equivalente no REST e a fila segue crua; '
      'updateWorkOrderStatus(rejected) lança ArgumentError sem requisição',
      () async {
        expect(workOrderStatusFromApi('rejected'), WorkOrderStatus.rejected);
        expect(workOrderStatusToApiOrNull('rejected'), isNull);
        expect(workOrderStatusNameToApi('rejected'), 'rejected');

        final adaptador = _AdaptadorContador();
        final dio = Dio(BaseOptions(baseUrl: 'https://test.local'));
        dio.transformer = SyncTransformer();
        dio.httpClientAdapter = adaptador;
        final api = DioWorkOrderRemoteApi(dio);
        await expectLater(
          api.updateWorkOrderStatus('wo-1', WorkOrderStatus.rejected),
          throwsArgumentError,
        );
        expect(adaptador.requisicoes, 0);
      },
    );
  });
}
