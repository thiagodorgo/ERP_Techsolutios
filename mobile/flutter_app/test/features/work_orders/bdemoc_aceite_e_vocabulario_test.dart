import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_repository.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/location/gps_service.dart';
import 'package:erp_techsolutions_mobile/core/network/api_contracts.dart';
import 'package:erp_techsolutions_mobile/core/permissions/permission_resolver.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_factory.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_store.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_providers.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_repository.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_replay_service.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_local_store.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_remote_api.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_repository.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/domain/work_order_models.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/domain/work_order_steps.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/ui/work_order_detail_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

// B-DEMO-C (S6) — vocabulário de status do app, nos dois sentidos, com `accepted` DISTINTO.
//
// Antes deste bloco, `workOrderStatusFromApiValue` só traduzia `pending_approval`: todo o resto do
// vocabulário do backend (`assigned`, `accepted`, `on_route`, `on_site`, `in_progress`) caía em
// `scheduled` ("Agendada"), e a linha do tempo (`_statusFromApi`) comparava `enum.name` com o valor do
// backend, deixando metade dos passos em `null`. O botão "Aceitar" (S7) precisa distinguir "falta
// aceitar" (`assigned` → `dispatched`) de "já aceitou" (`accepted` → `accepted`).
//
// As afirmações comparam `.name` de propósito: o arquivo compila na `origin/main` (onde
// `WorkOrderStatus.accepted` não existe) e o vermelho-controle sai por ASSERÇÃO, não por compilação.

class _AdaptadorFalso implements HttpClientAdapter {
  _AdaptadorFalso(this.corpo);

  final Object corpo;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    return ResponseBody.fromString(
      jsonEncode(corpo),
      200,
      headers: {
        Headers.contentTypeHeader: ['application/json; charset=utf-8'],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}

DioWorkOrderRemoteApi _apiCom(Object corpo) {
  final dio = Dio(BaseOptions(baseUrl: 'https://test.local'));
  dio.transformer = SyncTransformer();
  dio.httpClientAdapter = _AdaptadorFalso(corpo);
  return DioWorkOrderRemoteApi(dio);
}

Map<String, dynamic> _evento(String id, String? de, String? para) => {
  'id': id,
  'workOrderId': 'wo-democ',
  'eventType': 'work_order_status_changed',
  'fromStatus': de,
  'toStatus': para,
  'actorUserId': 'user-1',
  'message': null,
  'metadata': null,
  'createdAt': '2026-10-27T10:00:00.000Z',
};

String _lote() => 'lote-bdemoc';

// --- S7: o botão "Aceitar" no bloco de check-in do detalhe da OS (tela-modelo: o próprio bloco). ---

const _s7Tenant = 'tenant-bdemoc-s7';
const _s7User = 'user-bdemoc-s7';

const _s7Session = BootstrapSession(
  activeTenant: TenantContext(tenantId: _s7Tenant, displayName: 'Tenant S7'),
  enabledModules: [],
  permissions: PermissionSet({
    'work_orders:read',
    'work_orders:status',
    'work_orders:update',
  }),
  user: AuthenticatedUser(
    userId: _s7User,
    email: 'guincheiro@bdemoc.demo',
    tenantRole: 'field_technician',
    tenantRoles: ['field_technician'],
    scope: 'tenant',
  ),
);

WorkOrder _s7Wo(WorkOrderStatus status) => WorkOrder(
  localId: 'wo-bdemoc-s7',
  serverId: 'srv-bdemoc-s7',
  tenantId: _s7Tenant,
  code: 'OS-2077',
  title: 'Guincho da demo',
  customerName: 'Cliente da demo',
  serviceAddress: 'Rua da Demo, 1',
  status: status,
  priority: WorkOrderPriority.normal,
  syncStatus: SyncStatus.synced,
  createdAt: DateTime.utc(2026, 10, 27),
  assignedUserId: _s7User,
);

/// Repositório que recusa toda mudança de status com o MESMO texto que o repositório real lança numa
/// transição inválida (`StateError('Invalid transition: ${wo.status} → $newStatus')`).
class _RepoQueRecusa extends WorkOrderRepository {
  _RepoQueRecusa(WorkOrder wo, WorkOrderLocalStore store)
    : super(
        session: _s7Session,
        syncQueue: InMemorySyncQueueRepository(),
        actionFactory: SyncActionFactory(),
        localStore: store,
        seedWorkOrders: [wo],
      );

  @override
  Future<WorkOrderMutationResult> updateStatus(
    String localId,
    WorkOrderStatus newStatus,
  ) async {
    throw StateError(
      'Invalid transition: ${WorkOrderStatus.dispatched} → $newStatus',
    );
  }
}

Widget _s7App(WorkOrder wo, WorkOrderRepository repo, WorkOrderLocalStore st) {
  final router = GoRouter(
    initialLocation: '/work-orders/${wo.localId}',
    routes: [
      GoRoute(
        path: '/work-orders',
        builder: (_, _) => const Scaffold(body: Text('Lista OS')),
      ),
      GoRoute(
        path: '/work-orders/:id',
        builder: (_, state) =>
            WorkOrderDetailScreen(workOrderId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/work-orders/:id/execute',
        builder: (_, _) => const Scaffold(body: Text('Execute')),
      ),
      GoRoute(
        path: '/work-orders/:id/approval-request',
        builder: (_, _) => const Scaffold(body: Text('Approval')),
      ),
      GoRoute(
        path: '/field-map',
        builder: (_, _) => const Scaffold(body: Text('Mapa')),
      ),
      GoRoute(
        path: '/work-orders/:id/checklists',
        builder: (_, _) => const Scaffold(body: Text('Checklists')),
      ),
    ],
  );
  return ProviderScope(
    overrides: [
      bootstrapSessionProvider.overrideWith((_) async => _s7Session),
      workOrderLocalStoreProvider.overrideWithValue(st),
      syncActionStoreProvider.overrideWithValue(InMemorySyncActionStore([])),
      workOrderRepositoryProvider.overrideWithValue(repo),
      gpsAvailableProvider.overrideWith((_) async => true),
    ],
    child: MaterialApp.router(routerConfig: router),
  );
}

Future<({WorkOrderRepository repo, InMemorySyncQueueRepository fila})>
_s7Montar(WidgetTester t, WorkOrderStatus status) async {
  final wo = _s7Wo(status);
  final store = InMemoryWorkOrderLocalStore([wo]);
  final fila = InMemorySyncQueueRepository();
  final repo = WorkOrderRepository(
    session: _s7Session,
    syncQueue: fila,
    actionFactory: SyncActionFactory(),
    localStore: store,
    seedWorkOrders: [wo],
  );
  await repo.load(seedIfEmpty: false);
  await t.pumpWidget(_s7App(wo, repo, store));
  await t.pumpAndSettle();
  return (repo: repo, fila: fila);
}

Future<void> _s7RolarAte(WidgetTester t, Finder alvo) async {
  await t.scrollUntilVisible(
    alvo,
    300,
    scrollable: find.byType(Scrollable).first,
  );
}

void main() {
  group('B-DEMO-C S6 · F1 vocabulário backend → app', () {
    const esperado = <String, String>{
      'open': 'scheduled',
      'assigned': 'dispatched',
      'accepted': 'accepted',
      'on_route': 'enRoute',
      'on_site': 'arrived',
      'in_progress': 'inService',
      'paused': 'paused',
      'completed': 'completed',
      'cancelled': 'cancelled',
      'rejected': 'rejected',
      'pending_approval': 'pendingApproval',
    };

    for (final entrada in esperado.entries) {
      test('F1 — `${entrada.key}` vira `${entrada.value}`', () {
        expect(workOrderStatusFromApiValue(entrada.key).name, entrada.value);
      });
    }

    test(
      'F1 — status desconhecido continua caindo em `scheduled` (declarado, não decidido aqui)',
      () {
        expect(workOrderStatusFromApiValue('xyz').name, 'scheduled');
        expect(workOrderStatusFromApiValue(null).name, 'scheduled');
      },
    );
  });

  group('B-DEMO-C S6 · tabela única nos dois sentidos', () {
    // O vocabulário do backend é LIDO do arquivo do backend (o teste não o altera). Status novo lá sem entrada
    // explícita aqui cairia em silêncio no destino do desconhecido (`scheduled`). Forma do caso 16 do
    // `bo6r11_os_rest_envelope_e_vocabulario_test.dart` do #388.
    test(
      'F1 paridade — todo status de WORK_ORDER_STATUSES tem entrada explícita em backendStatusToApp',
      () {
        final arquivo = File(
          '../../src/modules/work-orders/work-order.types.ts',
        );
        expect(
          arquivo.existsSync(),
          isTrue,
          reason:
              'o vocabulário do backend é a fonte: sem o arquivo o teste não mede nada '
              '(o CI faz checkout do repositório inteiro e roda em mobile/flutter_app)',
        );
        final bloco = RegExp(
          r'WORK_ORDER_STATUSES\s*=\s*\[(.*?)\]\s*as\s+const',
          dotAll: true,
        ).firstMatch(arquivo.readAsStringSync());
        expect(bloco, isNotNull, reason: 'WORK_ORDER_STATUSES mudou de forma');
        final valores = RegExp(
          r'"([a-z_]+)"',
        ).allMatches(bloco!.group(1)!).map((m) => m.group(1)!).toList();
        expect(valores, hasLength(greaterThanOrEqualTo(10)));
        expect(backendStatusToApp.keys, containsAll(valores));
      },
    );

    test('ida e volta: backendStatusFor(backendStatusToApp[v]) == v', () {
      for (final entrada in backendStatusToApp.entries) {
        if (entrada.value == WorkOrderStatus.pendingApproval) continue;
        expect(backendStatusFor(entrada.value), entrada.key);
      }
    });

    test('estado que só existe no app não tem equivalente no backend', () {
      for (final s in [
        WorkOrderStatus.pendingApproval,
        WorkOrderStatus.approved,
        WorkOrderStatus.exception,
      ]) {
        expect(() => backendStatusFor(s), throwsArgumentError);
      }
    });

    test(
      'o codec da fila DELEGA à tabela: new_status e previous_status saem no vocabulário do backend',
      () {
        Map<String, Object?> payloadDe(String novo, String anterior) {
          final req = const WorkOrderSyncCodec(batchIdFactory: _lote)
              .encodeRequest([
                SyncAction(
                  clientActionId: 'c-$novo',
                  tenantId: 't',
                  type: WorkOrderSyncActionTypes.statusUpdate,
                  payload: {
                    'local_id': 'wo-local',
                    'server_id': 'srv-1',
                    'new_status': novo,
                    'previous_status': anterior,
                  },
                  status: SyncStatus.pending,
                  createdAt: DateTime.utc(2026, 10, 27),
                ),
              ]);
          final acao = (req['actions'] as List).single as Map;
          return Map<String, Object?>.from(acao['payload'] as Map);
        }

        for (final s in WorkOrderStatus.values) {
          final p = payloadDe(s.name, s.name);
          final meta = Map<String, Object?>.from(p['metadata'] as Map);
          final esperado =
              {
                WorkOrderStatus.pendingApproval,
                WorkOrderStatus.approved,
                WorkOrderStatus.exception,
              }.contains(s)
              ? s.name
              : backendStatusFor(s);
          expect(p['status'], esperado, reason: s.name);
          expect(meta['previous_status'], esperado, reason: s.name);
        }
      },
    );
  });

  group('B-DEMO-C S6 · `accepted` no app', () {
    test('rótulo "Aceita", tom info, passo 0 do stepper', () {
      expect(WorkOrderStatus.accepted.label, 'Aceita');
      expect(WorkOrderStatus.accepted.statusTone, 'info');
      expect(
        workOrderActiveStepIndex(
          WorkOrderServiceType.tow,
          WorkOrderStatus.accepted,
        ),
        0,
      );
      expect(workOrderActiveStepIndex(null, WorkOrderStatus.accepted), 0);
      expect(WorkOrderStatus.accepted.isFinal, isFalse);
    });
  });

  group('B-DEMO-C S6 · R16 linha do tempo usa a mesma tabela', () {
    test(
      'R16 — assigned/accepted/on_route/on_site/in_progress viram dispatched/accepted/enRoute/arrived/inService; xyz vira null',
      () async {
        final api = _apiCom({
          'data': [
            _evento('e1', 'assigned', 'accepted'),
            _evento('e2', 'accepted', 'on_route'),
            _evento('e3', 'on_route', 'on_site'),
            _evento('e4', 'on_site', 'in_progress'),
            _evento('e5', 'in_progress', 'xyz'),
          ],
        });

        final eventos = await api.fetchTimeline('wo-democ');
        final pares = [
          for (final e in eventos) [e.fromStatus?.name, e.toStatus?.name],
        ];

        expect(pares, [
          ['dispatched', 'accepted'],
          ['accepted', 'enRoute'],
          ['enRoute', 'arrived'],
          ['arrived', 'inService'],
          ['inService', null],
        ]);
      },
    );
  });

  group('B-DEMO-C S7 · F2/F3 "Aceitar" e a máquina local', () {
    test('F3 — dispatched só vai para accepted; accepted vai para enRoute', () {
      expect(
        WorkOrderStatus.dispatched.canTransitionTo(WorkOrderStatus.enRoute),
        isFalse,
        reason: 'o servidor recusa assigned → on_route na OS (409)',
      );
      expect(
        WorkOrderStatus.dispatched.canTransitionTo(WorkOrderStatus.accepted),
        isTrue,
      );
      expect(WorkOrderStatus.accepted.allowedTransitions, {
        WorkOrderStatus.enRoute,
      });
      expect(WorkOrderStatus.scheduled.allowedTransitions, {
        WorkOrderStatus.dispatched,
      });
    });

    testWidgets(
      'F2 — dispatched mostra "Aceitar" e NÃO "Iniciar rota"; o toque enfileira status_update(accepted)',
      (t) async {
        final m = await _s7Montar(t, WorkOrderStatus.dispatched);
        await _s7RolarAte(t, find.byKey(const Key('checkin-accept')));

        expect(find.byKey(const Key('checkin-accept')), findsOneWidget);
        expect(find.text('Aceitar'), findsOneWidget);
        expect(find.byKey(const Key('checkin-start-route')), findsNothing);
        final alvo = t.getSize(find.byKey(const Key('checkin-accept')));
        expect(alvo.height, greaterThanOrEqualTo(44), reason: 'alvo de toque');

        await t.tap(find.byKey(const Key('checkin-accept')));
        await t.pumpAndSettle();

        final acoes = await m.fila.actionsForTenant(_s7Tenant);
        final status = acoes
            .where((a) => a.type == WorkOrderSyncActionTypes.statusUpdate)
            .toList();
        expect(status, hasLength(1));
        expect(status.single.payload['new_status'], 'accepted');
        expect(status.single.payload['previous_status'], 'dispatched');
        expect(
          m.repo.workOrders
              .singleWhere((o) => o.localId == 'wo-bdemoc-s7')
              .status,
          WorkOrderStatus.accepted,
        );
      },
    );

    testWidgets(
      'F3 — accepted mostra "Iniciar rota" (e não "Aceitar"); o toque enfileira enRoute',
      (t) async {
        final m = await _s7Montar(t, WorkOrderStatus.accepted);
        await _s7RolarAte(t, find.byKey(const Key('checkin-start-route')));

        expect(find.byKey(const Key('checkin-start-route')), findsOneWidget);
        expect(find.byKey(const Key('checkin-accept')), findsNothing);

        await t.tap(find.byKey(const Key('checkin-start-route')));
        await t.pumpAndSettle();

        final acoes = await m.fila.actionsForTenant(_s7Tenant);
        expect(
          acoes
              .where((a) => a.type == WorkOrderSyncActionTypes.statusUpdate)
              .single
              .payload['new_status'],
          'enRoute',
        );
      },
    );

    testWidgets(
      'scheduled não tem botão de avanço: mostra "Aguardando despacho."',
      (t) async {
        await _s7Montar(t, WorkOrderStatus.scheduled);
        await _s7RolarAte(t, find.text('Aguardando despacho.'));

        expect(find.text('Aguardando despacho.'), findsOneWidget);
        expect(find.byKey(const Key('checkin-accept')), findsNothing);
        expect(find.byKey(const Key('checkin-start-route')), findsNothing);
      },
    );

    testWidgets(
      'F3 — o SnackBar de erro não expõe StateError nem WorkOrderStatus',
      (t) async {
        final wo = _s7Wo(WorkOrderStatus.dispatched);
        final store = InMemoryWorkOrderLocalStore([wo]);
        final repo = _RepoQueRecusa(wo, store);
        await repo.load(seedIfEmpty: false);
        await t.pumpWidget(_s7App(wo, repo, store));
        await t.pumpAndSettle();
        // Na `main` o botão de dispatched é o "Iniciar rota"; neste bloco, o "Aceitar". O teste toca o que
        // a máquina oferecer, para medir só o texto do SnackBar.
        final botao =
            WorkOrderStatus.dispatched.canTransitionTo(WorkOrderStatus.accepted)
            ? find.byKey(const Key('checkin-accept'))
            : find.byKey(const Key('checkin-start-route'));
        await _s7RolarAte(t, botao);

        await t.tap(botao);
        await t.pump();

        final barra = find.byType(SnackBar);
        expect(barra, findsOneWidget);
        final textos = find
            .descendant(of: barra, matching: find.byType(Text))
            .evaluate()
            .map((e) => (e.widget as Text).data ?? '')
            .join(' ');
        expect(textos, isNot(contains('StateError')));
        expect(textos, isNot(contains('WorkOrderStatus')));
        expect(textos, isNot(contains('Invalid transition')));
        expect(textos, 'Não foi possível mudar o status desta OS agora.');
      },
    );
  });
}
