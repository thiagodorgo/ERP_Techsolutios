import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:erp_techsolutions_mobile/core/appearance/app_appearance.dart';
import 'package:erp_techsolutions_mobile/core/appearance/app_appearance_providers.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_repository.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/local_db/app_database.dart';
import 'package:erp_techsolutions_mobile/core/local_db/drift_sync_action_store.dart';
import 'package:erp_techsolutions_mobile/core/local_db/drift_work_order_local_store.dart';
import 'package:erp_techsolutions_mobile/core/location/gps_service.dart';
import 'package:erp_techsolutions_mobile/core/permissions/permission_resolver.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_factory.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_store.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_providers.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_repository.dart';
import 'package:erp_techsolutions_mobile/features/checklists/data/checklist_local_store.dart';
import 'package:erp_techsolutions_mobile/features/checklists/data/checklist_repository.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_conflict_resolution_service.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_local_store.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_remote_api.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_repository.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/domain/work_order_models.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/ui/work_order_detail_screen.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/ui/work_order_execute_screen.dart';
import 'package:erp_techsolutions_mobile/shared/theme/erp_mobile_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import '../../capturas/captura_helper.dart'
    show GuinchoChecklistRepository, GuinchoRemote, GuinchoRemoteApi, fixarTela;

// B-GUI-D1 — o app lê, guarda e preserva o destino, o veículo atendido e o prazo da OS (lista de OS do servidor).
// Plano: `plano-APP-GUINCHO-emenda1.md` §5.4 + `plano-B-GUI-D1-emenda1.md` + `-emenda1.1.md` (prevalece).
//   D4  — o leitor tolerante (servidor antigo e tipo errado viram null só no campo);
//   D4b — o servidor vence, inclusive com o vazio;
//   D4c — o store Drift grava e lê os 7 campos e a coordenada da coleta;
//   D4d — a 1ª ação offline (copyWith + INSERT OR REPLACE) não apaga nenhum dos 7;
//   D4e — o `props` leva os 7 (a tela só se redesenha quando o objeto muda);
//   D7a/D7b — o fim da placa nunca chega à tela (guarda de código e de comportamento).

const _tenant = 'tenant-guid1';
const _userId = 'user-guid1';

const _session = BootstrapSession(
  activeTenant: TenantContext(tenantId: _tenant, displayName: 'Tenant GUI-D1'),
  enabledModules: [],
  permissions: PermissionSet({
    'work_orders:read',
    'work_orders:status',
    'work_orders:update',
  }),
  user: AuthenticatedUser(
    userId: _userId,
    email: 'tech@guid1.demo',
    tenantRole: 'field_technician',
    tenantRoles: ['field_technician'],
    scope: 'tenant',
  ),
);

final _sla = DateTime.utc(2026, 12, 1, 15);

WorkOrder _woCompleta({
  String localId = 'wo-guid1-01',
  WorkOrderStatus status = WorkOrderStatus.dispatched,
  SyncStatus syncStatus = SyncStatus.synced,
  String? checkinPlateTail = '23',
}) => WorkOrder(
  localId: localId,
  serverId: 'srv-$localId',
  tenantId: _tenant,
  code: 'OS-1042',
  title: 'Reboque GUI-D1',
  customerName: 'Cliente GUI-D1',
  serviceAddress: 'Rua da Coleta, 10',
  latitude: -23.55,
  longitude: -46.63,
  status: status,
  priority: WorkOrderPriority.normal,
  syncStatus: syncStatus,
  createdAt: DateTime.utc(2026, 11, 1),
  assignedUserId: _userId,
  checkinMode: CheckinMode.plate,
  checkinPlateTail: checkinPlateTail,
  destinationAddress: 'Pátio Central, 200',
  destinationLatitude: -23.6,
  destinationLongitude: -46.7,
  attendedVehiclePlateMasked: 'ABC1D**',
  attendedVehicleModel: 'Onix',
  attendedVehicleColor: 'Prata',
  slaDueAt: _sla,
);

/// Os 7 campos do B-GUI-D1 e a coordenada da coleta, para comparar ida e volta.
List<Object?> _seteECoordenada(WorkOrder o) => [
  o.destinationAddress,
  o.destinationLatitude,
  o.destinationLongitude,
  o.attendedVehiclePlateMasked,
  o.attendedVehicleModel,
  o.attendedVehicleColor,
  o.slaDueAt,
  o.latitude,
  o.longitude,
];

final _esperado = <Object?>[
  'Pátio Central, 200',
  -23.6,
  -46.7,
  'ABC1D**',
  'Onix',
  'Prata',
  _sla,
  -23.55,
  -46.63,
];

// Backend falso no nível do HTTP, para o parser real da lista (`DioWorkOrderRemoteApi`). Os itens podem mudar entre
// dois pulls (D4b).
class _ListBackend implements HttpClientAdapter {
  _ListBackend(this.items);

  List<Map<String, dynamic>> items;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async => ResponseBody.fromString(
    jsonEncode({
      'items': items,
      'pagination': {'nextCursor': null},
    }),
    200,
    headers: {
      Headers.contentTypeHeader: [Headers.jsonContentType],
    },
  );

  @override
  void close({bool force = false}) {}
}

Map<String, dynamic> _item(String id, Map<String, dynamic> extra) => {
  'id': id,
  'code': 'OS-$id',
  'title': 'OS $id',
  'status': 'dispatched',
  'priority': 'normal',
  'customerName': 'Cliente',
  'serviceAddress': 'Rua da Coleta, 10',
  'createdAt': '2026-11-11T00:00:00.000Z',
  ...extra,
};

const _completo = <String, dynamic>{
  'serviceLatitude': -23.55,
  'serviceLongitude': -46.63,
  'destinationAddress': 'Pátio Central, 200',
  'destinationLatitude': -23.6,
  'destinationLongitude': -46.7,
  'attendedVehicle': {
    'plateMasked': 'ABC1D**',
    'model': 'Onix',
    'color': 'Prata',
  },
  'slaDueAt': '2026-12-01T15:00:00.000Z',
  'checkinMode': 'plate',
  'checkinPlateTail': '23',
};

Future<Map<String, WorkOrder>> _ler(List<Map<String, dynamic>> items) async {
  final dio = Dio(BaseOptions(baseUrl: 'http://backend.test'));
  dio.httpClientAdapter = _ListBackend(items);
  final result = await DioWorkOrderRemoteApi(
    dio,
  ).fetchAssignedOpenWorkOrders(tenantId: _tenant);
  return {for (final o in result.orders) o.serverId!: o};
}

GoRouter _router(WorkOrder wo) => GoRouter(
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
    // Emenda 1.2 (depois do B-GUI-FID1): a chegada vive na tela de execução, como no teste do FID1.
    GoRoute(
      path: '/work-orders/:id/execute',
      builder: (_, state) =>
          WorkOrderExecuteScreen(workOrderId: state.pathParameters['id']!),
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

Widget _detalhe(WorkOrder wo, {AppAppearance aparencia = AppAppearance.a}) {
  final store = InMemoryWorkOrderLocalStore([wo]);
  final queue = InMemorySyncQueueRepository();
  final repo = WorkOrderRepository(
    session: _session,
    syncQueue: queue,
    actionFactory: SyncActionFactory(),
    localStore: store,
    seedWorkOrders: [wo],
  );
  return ProviderScope(
    overrides: [
      bootstrapSessionProvider.overrideWith((_) async => _session),
      workOrderLocalStoreProvider.overrideWithValue(store),
      syncActionStoreProvider.overrideWithValue(InMemorySyncActionStore([])),
      workOrderRepositoryProvider.overrideWithValue(repo),
      gpsAvailableProvider.overrideWith((_) async => true),
      // Emenda 1.2: o mesmo arnês do `bguifid1_detalhe_e_checkin_test.dart` (vistoria, conflito e as 3 aparências).
      workOrderConflictResolutionServiceProvider.overrideWithValue(
        WorkOrderConflictResolutionService(queue: queue, store: store),
      ),
      checklistRepositoryProvider.overrideWithValue(
        GuinchoChecklistRepository(
          localStore: InMemoryChecklistLocalStore(),
          remoteApi: GuinchoRemoteApi(GuinchoRemote.ok),
        ),
      ),
      screenAppearanceProvider(
        kDetalheOsAppearanceKey,
      ).overrideWithValue(AsyncValue.data(aparencia)),
      screenAppearanceProvider(
        kExecucaoGuinchoAppearanceKey,
      ).overrideWithValue(AsyncValue.data(aparencia)),
    ],
    child: MaterialApp.router(
      theme: ErpMobileTheme.light(),
      routerConfig: _router(wo),
    ),
  );
}

/// Todo texto pintado na tela (todo `RichText`, que é o que o `Text` desenha) e todo texto editável.
List<String> _textosNaTela(WidgetTester t) => [
  for (final w in t.widgetList<RichText>(find.byType(RichText)))
    w.text.toPlainText(),
  for (final w in t.widgetList<EditableText>(find.byType(EditableText)))
    w.controller.text,
];

void main() {
  group('D4 — o leitor da lista (tolerante)', () {
    test(
      'JSON completo: os 7 campos e a coleta (serviceLatitude/Longitude → latitude/longitude)',
      () async {
        final porId = await _ler([_item('a', _completo)]);
        expect(_seteECoordenada(porId['a']!), _esperado);
      },
    );

    test(
      'servidor antigo (chaves ausentes): null nos 7, sem exceção',
      () async {
        final porId = await _ler([_item('b', {})]);
        final o = porId['b']!;
        expect(_seteECoordenada(o), List<Object?>.filled(9, null));
        expect(o.code, 'OS-b');
      },
    );

    test(
      'tipo errado: null só no campo errado, sem exceção, e o resto do item intacto',
      () async {
        final porId = await _ler([
          _item('c', {..._completo, 'destinationLatitude': 'x'}),
          _item('d', {..._completo, 'attendedVehicle': 'texto'}),
          _item('e', {
            ..._completo,
            'attendedVehicle': {
              'plateMasked': 5,
              'model': 'Onix',
              'color': 'Prata',
            },
          }),
          _item('f', {..._completo, 'slaDueAt': 'não-data'}),
          _item('g', {..._completo, 'destinationAddress': 7}),
          _item('h', {..._completo, 'serviceLatitude': '-23'}),
        ]);
        expect(porId.length, 6, reason: 'um item com tipo errado sumiu');

        List<Object?> com(int i, Object? v) =>
            List<Object?>.from(_esperado)..[i] = v;
        expect(_seteECoordenada(porId['c']!), com(1, null));
        expect(
          _seteECoordenada(porId['d']!),
          List<Object?>.from(_esperado)
            ..[3] = null
            ..[4] = null
            ..[5] = null,
        );
        expect(_seteECoordenada(porId['e']!), com(3, null));
        expect(_seteECoordenada(porId['f']!), com(6, null));
        expect(_seteECoordenada(porId['g']!), com(0, null));
        expect(_seteECoordenada(porId['h']!), com(7, null));
        for (final o in porId.values) {
          expect(o.checkinMode, CheckinMode.plate);
          expect(o.checkinPlateTail, '23');
        }
      },
    );
  });

  group('D4b — o servidor vence, inclusive com o vazio', () {
    test(
      'um pull traz o veículo; o seguinte traz attendedVehicle: null e a OS local fica sem veículo',
      () async {
        final db = AppDatabase.openInMemory();
        addTearDown(db.close);
        final store = DriftWorkOrderLocalStore(db);
        final backend = _ListBackend([_item('srv-1', _completo)]);
        final dio = Dio(BaseOptions(baseUrl: 'http://backend.test'))
          ..httpClientAdapter = backend;
        final repo = WorkOrderRepository(
          session: _session,
          syncQueue: InMemorySyncQueueRepository(),
          actionFactory: SyncActionFactory(),
          localStore: store,
          remoteApi: DioWorkOrderRemoteApi(dio),
          allowSeedOrders: false,
        );
        expect(await repo.refresh(), WorkOrderPullOutcome.success);
        var salvo = (await store.loadWorkOrders()).single;
        expect(salvo.attendedVehicleModel, 'Onix');
        expect(salvo.attendedVehiclePlateMasked, 'ABC1D**');

        backend.items = [
          _item('srv-1', {..._completo, 'attendedVehicle': null}),
        ];
        expect(await repo.refresh(), WorkOrderPullOutcome.success);
        salvo = (await store.loadWorkOrders()).single;
        expect(salvo.attendedVehiclePlateMasked, isNull);
        expect(salvo.attendedVehicleModel, isNull);
        expect(salvo.attendedVehicleColor, isNull);
        expect(salvo.destinationAddress, 'Pátio Central, 200');
      },
    );
  });

  group('D4c — o store Drift', () {
    test(
      'grava e lê, ida e volta, os 7 campos e a coordenada da coleta',
      () async {
        final db = AppDatabase.openInMemory();
        addTearDown(db.close);
        await DriftWorkOrderLocalStore(db).saveWorkOrder(_woCompleta());
        final lida = (await DriftWorkOrderLocalStore(
          db,
        ).loadWorkOrders()).single;
        expect(_seteECoordenada(lida), _esperado);
        expect(lida, _woCompleta());
      },
    );
  });

  group('D4d — a 1ª ação offline não apaga o destino nem o veículo', () {
    test(
      'updateStatus(enRoute) sem rede, store recarregado: os 7 e a coleta intactos; a ação entra pending',
      () async {
        final db = AppDatabase.openInMemory();
        addTearDown(db.close);
        final store = DriftWorkOrderLocalStore(db);
        await store.saveWorkOrder(_woCompleta());
        final queue = PersistentSyncQueueRepository(DriftSyncActionStore(db));
        final repo = WorkOrderRepository(
          session: _session,
          syncQueue: queue,
          actionFactory: SyncActionFactory(),
          localStore: store,
          allowSeedOrders: false,
        );
        await repo.load(seedIfEmpty: false);

        await repo.updateStatus('wo-guid1-01', WorkOrderStatus.enRoute);

        final recarregada = (await DriftWorkOrderLocalStore(
          db,
        ).loadWorkOrders()).single;
        expect(recarregada.status, WorkOrderStatus.enRoute);
        expect(recarregada.syncStatus, SyncStatus.pending);
        expect(_seteECoordenada(recarregada), _esperado);
        final fila = await queue.pendingForTenant(_tenant);
        expect(fila, hasLength(1));
        expect(fila.single.status, SyncStatus.pending);
        expect(fila.single.payload['new_status'], 'enRoute');
      },
    );
  });

  group('D4e — o props leva os 7 campos', () {
    final base = _woCompleta();
    final variacoes = <String, WorkOrder>{
      'destinationAddress': base.copyWith(destinationAddress: 'Outro pátio'),
      'destinationLatitude': base.copyWith(destinationLatitude: -1.0),
      'destinationLongitude': base.copyWith(destinationLongitude: -1.0),
      'attendedVehiclePlateMasked': base.copyWith(
        attendedVehiclePlateMasked: 'XYZ98**',
      ),
      'attendedVehicleModel': base.copyWith(attendedVehicleModel: 'Gol'),
      'attendedVehicleColor': base.copyWith(attendedVehicleColor: 'Preto'),
      'slaDueAt': base.copyWith(slaDueAt: DateTime.utc(2027)),
    };
    for (final entrada in variacoes.entries) {
      test('duas OS que diferem só em ${entrada.key} são diferentes', () {
        expect(entrada.value == base, isFalse);
        expect(entrada.value, isNot(equals(base)));
      });
    }
  });

  group('D7 — o fim da placa nunca chega à tela', () {
    test(
      'D7a — os arquivos de lib/ que citam o fim (checkinPlateTail|checkin_plate_tail) são exatamente os 5',
      () {
        final padrao = RegExp(r'checkinPlateTail|checkin_plate_tail');
        final achados = <String>[
          for (final f in Directory('lib').listSync(recursive: true))
            if (f is File &&
                f.path.endsWith('.dart') &&
                padrao.hasMatch(f.readAsStringSync()))
              f.path.replaceAll(r'\', '/'),
        ]..sort();
        // Um leitor novo do fim obriga a mudar esta lista no PR, e o revisor vê. Emenda 1.2: o B-GUI-FID1 (#595) extraiu
        // o diálogo de chegada; o 5º arquivo passa a ser `ui/checkin_confirm_dialog.dart` (medido na main 60c0704a).
        expect(achados, <String>[
          'lib/core/local_db/app_database.dart',
          'lib/core/local_db/drift_work_order_local_store.dart',
          'lib/features/work_orders/data/work_order_remote_api.dart',
          'lib/features/work_orders/domain/work_order_models.dart',
          'lib/features/work_orders/ui/checkin_confirm_dialog.dart',
        ]);
      },
    );

    // Emenda 1.2 — o percurso do B-GUI-FID1: detalhe → "Iniciar atendimento" → tela de chegada → "Iniciar rota" →
    // "Cheguei ao local" → diálogo com a dica `plate-masked-hint`. Nas 3 aparências (o arnês do FID1 expõe a troca).
    for (final ap in AppAppearance.values) {
      testWidgets(
        'D7b — ${ap.letter}: com plateMasked ABC1D** e fim ZQ, nenhum texto do detalhe, da chegada nem do diálogo traz ZQ',
        (t) async {
          fixarTela(t, const Size(390, 1800));
          // "ZQ": letras que nenhum id, código ou data tem (sentinela do B-SAN3-26).
          final wo = _woCompleta(
            status: WorkOrderStatus.dispatched,
            checkinPlateTail: 'ZQ',
          ).copyWith(serviceType: WorkOrderServiceType.tow);
          Future<void> tocar(Finder f) async {
            await t.ensureVisible(f);
            await t.pumpAndSettle();
            await t.tap(f);
            await t.pumpAndSettle();
          }

          void semFim(String onde) {
            final textos = _textosNaTela(t);
            expect(textos, isNotEmpty, reason: onde);
            for (final texto in textos) {
              expect(texto.contains('ZQ'), isFalse, reason: '$onde: "$texto"');
            }
          }

          await t.pumpWidget(_detalhe(wo, aparencia: ap));
          await t.pumpAndSettle();
          semFim('detalhe');
          await tocar(find.byKey(const Key('detalhe-os-iniciar')));
          expect(
            find.byKey(Key('aparencia-checkin-${ap.letter}')),
            findsOneWidget,
          );
          semFim('chegada');
          await tocar(find.byKey(const Key('checkin-start-route')));
          semFim('chegada em rota');
          await tocar(find.byKey(const Key('checkin-arrived')));
          expect(find.byKey(const Key('plate-input')), findsOneWidget);
          final dica = find.byKey(const Key('plate-masked-hint'));
          expect(dica, findsOneWidget);
          expect(t.widget<Text>(dica).data, isNot(contains('ZQ')));
          semFim('diálogo');
        },
      );
    }
  });
}
