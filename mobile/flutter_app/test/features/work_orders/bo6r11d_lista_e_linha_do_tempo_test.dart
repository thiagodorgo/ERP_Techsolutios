import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_remote_api.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/domain/work_order_models.dart';
import 'package:flutter_test/flutter_test.dart';

// B-O6R-11d (P1) — os caminhos VIVOS: a lista "Minhas OS" e a linha do tempo.
//
// Hoje a lista lê o status pelo nome do enum do app, e toda OS em rota, no local ou em andamento aparece
// "Agendada" (o PR534-03 da pré-revisão do #534 mediu isso com a resposta real da lista: `on_route → scheduled`);
// a OS "urgente" aparece "Normal". A linha do tempo tem um SEGUNDO tradutor, também pelo nome do app, que zera o
// status de 6 dos 10 casos. Os dois passam pelo `DioWorkOrderRemoteApi` real com adaptador falso.

class _Backend implements HttpClientAdapter {
  _Backend(this.corpo);

  final Object corpo;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async => ResponseBody.fromString(
    jsonEncode(corpo),
    200,
    headers: {
      Headers.contentTypeHeader: ['application/json; charset=utf-8'],
    },
  );

  @override
  void close({bool force = false}) {}
}

DioWorkOrderRemoteApi _api(Object corpo) {
  final dio = Dio(BaseOptions(baseUrl: 'https://test.local'));
  dio.transformer = SyncTransformer();
  dio.httpClientAdapter = _Backend(corpo);
  return DioWorkOrderRemoteApi(dio);
}

Map<String, dynamic> _itemDaLista(String id, String status, String priority) =>
    {
      'id': id,
      'code': 'OS-$id',
      'title': 'OS $id',
      'status': status,
      'priority': priority,
      'customerName': 'Cliente $id',
      'serviceAddress': 'Rua $id',
      'assignedOperatorId': null,
      'assignedUserId': 'tecnico-1',
      'vehicleId': null,
      'scheduledFor': null,
      'slaDueAt': null,
      'createdAt': '2026-11-11T12:00:00.000Z',
    };

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
};

void main() {
  group('B-O6R-11d — lista e linha do tempo (P1)', () {
    test(
      'T5: a lista "Minhas OS" traduz status e prioridade do backend (em andamento/urgente, No local, Em rota)',
      () async {
        final api = _api({
          'items': [
            _itemDaLista('a', 'in_progress', 'urgent'),
            _itemDaLista('b', 'on_site', 'medium'),
            _itemDaLista('c', 'on_route', 'high'),
            _itemDaLista('d', 'assigned', 'low'),
          ],
          'pagination': {
            'limit': 100,
            'offset': 0,
            'total': 4,
            'nextCursor': null,
          },
        });
        final resultado = await api.fetchAssignedOpenWorkOrders(
          tenantId: 'org-sessao',
        );
        final porId = {for (final os in resultado.orders) os.serverId: os};

        expect(porId['a']!.status, WorkOrderStatus.inService);
        expect(porId['a']!.priority, WorkOrderPriority.critical);
        expect(porId['b']!.status, WorkOrderStatus.arrived);
        expect(porId['b']!.status.label, 'No local');
        expect(porId['b']!.priority, WorkOrderPriority.normal);
        expect(porId['c']!.status, WorkOrderStatus.enRoute);
        expect(porId['c']!.priority, WorkOrderPriority.high);
        // PR534-03: de "Despachada" o app inicia a rota (antes vinha "Agendada", que só vai a Despachada).
        expect(porId['d']!.status, WorkOrderStatus.dispatched);
        expect(
          porId['d']!.status.canTransitionTo(WorkOrderStatus.enRoute),
          isTrue,
        );
        expect(porId['d']!.priority, WorkOrderPriority.low);
      },
    );

    test(
      'T12: a linha do tempo traduz fromStatus/toStatus dos 10 status do backend e nunca chuta o desconhecido',
      () async {
        final eventos = [
          for (final par in _esperadoDoBackend.entries)
            {
              'id': 'evt-${par.key}',
              'workOrderId': 'wo-1',
              'eventType': 'work_order_status_changed',
              'fromStatus': par.key,
              'toStatus': par.key,
              'actorUserId': 'user-1',
              'message': 'Status ${par.key}',
              'metadata': <String, dynamic>{},
              'createdAt': '2026-11-11T12:00:00.000Z',
            },
          {
            'id': 'evt-futuro',
            'workOrderId': 'wo-1',
            'eventType': 'work_order_status_changed',
            'fromStatus': null,
            'toStatus': 'futuro_x',
            'actorUserId': 'user-1',
            'message': 'Status futuro',
            'metadata': <String, dynamic>{},
            'createdAt': '2026-11-11T12:00:00.000Z',
          },
        ];
        final linha = await _api({'data': eventos}).fetchTimeline('wo-1');
        expect(linha, hasLength(_esperadoDoBackend.length + 1));
        final porId = {for (final e in linha) e.localId: e};

        for (final par in _esperadoDoBackend.entries) {
          final evento = porId['evt-${par.key}']!;
          expect(evento.toStatus, par.value, reason: 'toStatus ${par.key}');
          expect(evento.fromStatus, par.value, reason: 'fromStatus ${par.key}');
        }
        expect(porId['evt-futuro']!.toStatus, isNull);
        expect(porId['evt-futuro']!.fromStatus, isNull);
      },
    );
  });
}
