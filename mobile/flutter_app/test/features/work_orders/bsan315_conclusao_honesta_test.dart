// B-SAN3-15b (P10, itens 35 e 36 do portão) — a conclusão do prestador, honesta.
//
// Plano: `plano-B-SAN3-15-v2.md` §3.3 (T-H1 a T-H3, iguais ao v1 §3.3), a Emenda 5 (abertura) §2.3, §2.4, §2.5 e §3
// (T-H2 reescrito pela decisão 1.C, T-H4 e T-H5) e a Emenda 5.1 §4 (T-H6):
//   T-H1 — nenhum valor em reais na conclusão; o cartão "Comissão" traz o texto da Pergunta 3 (a);
//   T-H2 — decisão 1.C: checklist obrigatório não concluído → SEM NENHUM TOQUE, o aviso e "Abrir checklist", e
//          "Concluir atendimento" desabilitado; checklist concluído → o botão ativo e a conclusão enfileira;
//   T-H3 — guarda de fonte: `_baseValueFor` e `ratePercent:` dão 0 em `lib/features/work_orders/`;
//   T-H4 — depois de concluir, o cartão "Tempo" mostra a duração, e não "—";
//   T-H5 — decisão 1.D: o resumo do prestador não tem "Equipamento" nem o código da OS;
//   T-H6 — CRIT-04: OS SEM checklist não toca no repositório de checklist (o b120 caso 9 continua sem sobrepor o
//          provider).
//
// O conserto único da J-564 (ata `J-564-b-san3-15b.md`, triagem) acrescenta:
//   C3-02 — T-H2 (concluído) e T-H4 asserem a AUSÊNCIA de "Não foi possível concluir" depois do sucesso, e o T-H7
//           cobre a volta de "Abrir checklist" (sem exceção, aviso some e o botão fica ativo);
//   C3-01 — T-H8: OS pausada → "Concluir atendimento" inativo e "Retome o atendimento para concluir."; a transição
//           recusada vira mensagem em português nos dois pontos do repositório e na tela, sem o nome do estado interno.
//
// VERMELHO-CONTROLE (F0b, `main` d2737339): hoje a tela inventa a comissão (T-H1, T-H3), só avisa do checklist
// depois do toque e recusa a OS com checklist concluído (T-H2), não refaz o resumo depois de concluir (T-H4) e
// mostra "Equipamento" com o código da OS (T-H5). O T-H6 é verde na `main` (a tela de hoje não lê checklist) e é a
// guarda da M-H6.
import 'dart:io';

import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_repository.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/local_db/app_database.dart';
import 'package:erp_techsolutions_mobile/core/local_db/database_provider.dart';
import 'package:erp_techsolutions_mobile/core/network/api_error.dart';
import 'package:erp_techsolutions_mobile/core/permissions/permission_resolver.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_factory.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_repository.dart';
import 'package:erp_techsolutions_mobile/features/checklists/data/checklist_local_store.dart';
import 'package:erp_techsolutions_mobile/features/checklists/data/checklist_remote_api.dart';
import 'package:erp_techsolutions_mobile/features/checklists/data/checklist_repository.dart';
import 'package:erp_techsolutions_mobile/features/checklists/domain/checklist_models.dart';
import 'package:erp_techsolutions_mobile/features/prestador/data/prestador_local_store.dart';
import 'package:erp_techsolutions_mobile/features/prestador/data/prestador_repository.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_local_store.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_repository.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/domain/work_order_models.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/ui/work_order_conclusion_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

const _tenant = 'tenant-bsan315-conclusao';
const _woId = 'wo-bsan315-conclusao';
const _cl = 'cl-bsan315-conclusao';
const _codigo = 'OS-3615';

const _session = BootstrapSession(
  activeTenant: TenantContext(tenantId: _tenant, displayName: 'Organização'),
  enabledModules: [],
  permissions: PermissionSet({
    'work_orders:read',
    'work_orders:status',
    'work_orders:update',
  }),
  user: AuthenticatedUser(
    userId: 'user-bsan315-conclusao',
    email: 'tecnico@bsan315.demo',
    tenantRole: 'field_technician',
    tenantRoles: ['field_technician'],
    scope: 'tenant',
  ),
);

WorkOrder _wo({
  String? checklistId,
  DateTime? startedAt,
  WorkOrderStatus status = WorkOrderStatus.inService,
}) => WorkOrder(
  localId: _woId,
  serverId: 'srv-$_woId',
  tenantId: _tenant,
  code: _codigo,
  title: 'Troca de disjuntor',
  customerName: 'Indústria Alfa',
  serviceAddress: 'Rua da Conclusão, 36',
  status: status,
  priority: WorkOrderPriority.high,
  syncStatus: SyncStatus.synced,
  createdAt: DateTime.utc(2026, 11, 14),
  startedAt: startedAt,
  serviceType: WorkOrderServiceType.provider,
  checklistId: checklistId,
);

MobileChecklistRun _run(MobileChecklistRunStatus status) => MobileChecklistRun(
  localId: 'clrun-bsan315',
  serverId: 'srv-clrun-bsan315',
  tenantId: _tenant,
  checklistId: _cl,
  workOrderId: _woId,
  schemaVersion: 'v1',
  status: status,
  kind: MobileChecklistRunKind.collection,
  executedByUserId: 'user-bsan315-conclusao',
  startedAt: DateTime.utc(2026, 11, 14),
  syncStatus: SyncStatus.synced,
  answers: const {},
);

/// Repositório de checklist que conta as leituras de execução (T-H6).
class _ChecklistContado extends ChecklistRepository {
  _ChecklistContado(InMemoryChecklistLocalStore store)
    : super(
        session: _session,
        syncQueue: InMemorySyncQueueRepository(),
        actionFactory: SyncActionFactory(),
        localStore: store,
        remoteApi: _SemChecklistRemoto(),
      );

  int leituras = 0;

  @override
  Future<List<MobileChecklistRun>> getRunsForWorkOrder(
    String workOrderId,
  ) async {
    leituras += 1;
    return super.getRunsForWorkOrder(workOrderId);
  }
}

class _Conclusao {
  _Conclusao(this.wo, {List<MobileChecklistRun> runs = const []})
    : _runs = runs;

  final WorkOrder wo;
  final List<MobileChecklistRun> _runs;
  final InMemorySyncQueueRepository queue = InMemorySyncQueueRepository();
  late final WorkOrderRepository repo = WorkOrderRepository(
    session: _session,
    syncQueue: queue,
    actionFactory: SyncActionFactory(),
    localStore: InMemoryWorkOrderLocalStore([wo]),
  );
  late _ChecklistContado checklists;

  /// O armazenamento das execuções do checklist (T-H7 conclui a vistoria nele antes de voltar).
  late InMemoryChecklistLocalStore checklistStore;

  /// Quantas vezes o provider do repositório de checklist foi criado (lido ou observado).
  int criacoesDoProvider = 0;

  Future<void> pump(WidgetTester t) async {
    t.view.physicalSize = const Size(800, 4000);
    t.view.devicePixelRatio = 1.0;
    addTearDown(t.view.resetPhysicalSize);
    addTearDown(t.view.resetDevicePixelRatio);
    final db = AppDatabase.openInMemory();
    addTearDown(db.close);
    final store = InMemoryChecklistLocalStore();
    for (final run in _runs) {
      await store.saveRun(run);
    }
    checklistStore = store;
    checklists = _ChecklistContado(store);
    final prestRepo = PrestadorRepository(
      session: _session,
      syncQueue: InMemorySyncQueueRepository(),
      actionFactory: SyncActionFactory(),
      localStore: InMemoryPrestadorLocalStore(),
    );
    await t.pumpWidget(
      ProviderScope(
        overrides: [
          appDatabaseProvider.overrideWithValue(db),
          bootstrapSessionProvider.overrideWith((_) async => _session),
          workOrderRepositoryProvider.overrideWithValue(repo),
          prestadorRepositoryProvider.overrideWithValue(prestRepo),
          checklistRepositoryProvider.overrideWith((ref) {
            criacoesDoProvider += 1;
            return checklists;
          }),
        ],
        child: MaterialApp.router(
          routerConfig: GoRouter(
            initialLocation: '/work-orders/$_woId/conclusion',
            routes: [
              GoRoute(
                path: '/work-orders/:id/conclusion',
                builder: (_, s) => WorkOrderConclusionScreen(
                  workOrderId: s.pathParameters['id']!,
                ),
              ),
              GoRoute(
                path: '/work-orders/:id',
                builder: (_, s) =>
                    Scaffold(body: Text('Detalhe ${s.pathParameters['id']}')),
              ),
              GoRoute(
                path: '/checklists/:checklistId/run',
                builder: (_, s) => Scaffold(
                  body: Builder(
                    builder: (c) => Column(
                      children: [
                        Text('Vistoria ${s.uri}'),
                        TextButton(
                          key: const Key('checklist-voltar'),
                          onPressed: () => c.pop(),
                          child: const Text('Voltar'),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
    await t.pumpAndSettle();
  }

  Finder get concluir => find.byKey(const Key('conclude-button'));

  bool concluirAtivo(WidgetTester t) =>
      t.widget<FilledButton>(concluir).onPressed != null;

  Future<List<SyncAction>> conclusoesNaFila() async => [
    for (final a in await queue.actionsForTenant(_tenant))
      if (a.payload['new_status'] == WorkOrderStatus.completed.name) a,
  ];
}

const _avisoTitulo = 'Checklist obrigatório pendente';
const _avisoTexto = 'Conclua o checklist obrigatório antes de finalizar a OS.';
const _falha = 'Não foi possível concluir. Tente novamente.';
const _retome = 'Retome o atendimento para concluir.';

/// Nenhum texto da tela traz o nome técnico de uma transição (J-564 C3-01): nem a frase em inglês do repositório,
/// nem o nome do estado interno.
List<String> _textosTecnicos() => [
  for (final e in find.byType(Text).evaluate())
    if (RegExp(
      r'Invalid transition|WorkOrderStatus\.|→',
    ).hasMatch(_textoDe(e.widget as Text)))
      _textoDe(e.widget as Text),
];

String _textoDe(Text w) => w.data ?? w.textSpan?.toPlainText() ?? '';

void main() {
  group('B-SAN3-15b T-H1 — sem valor em reais na conclusão', () {
    testWidgets(
      'nenhum "R\$ <número>" na tela; o cartão Comissão só com o texto',
      (t) async {
        final h = _Conclusao(_wo());
        await h.pump(t);
        expect(find.byKey(const Key('commission-card')), findsOneWidget);
        expect(find.textContaining(RegExp(r'R\$\s?\d')), findsNothing);
        expect(
          find.text(
            'A comissão deste atendimento é calculada pela empresa depois que a OS for enviada.',
          ),
          findsOneWidget,
        );
      },
    );
  });

  group('B-SAN3-15b T-H2 — decisão 1.C: o aviso do checklist antes do toque', () {
    testWidgets(
      'checklist não concluído: sem nenhum toque, o aviso, "Abrir checklist" e o botão desabilitado',
      (t) async {
        final h = _Conclusao(
          _wo(checklistId: _cl),
          runs: [_run(MobileChecklistRunStatus.inProgress)],
        );
        await h.pump(t);

        // Nenhum toque até aqui.
        expect(find.text(_avisoTitulo), findsOneWidget);
        expect(find.text(_avisoTexto), findsOneWidget);
        expect(find.text('Abrir checklist'), findsOneWidget);
        expect(h.concluir, findsOneWidget);
        expect(h.concluirAtivo(t), isFalse);
        expect(await h.conclusoesNaFila(), isEmpty);
      },
    );

    testWidgets(
      'checklist concluído: o botão ativo, e a conclusão enfileira pela tela',
      (t) async {
        final h = _Conclusao(
          _wo(checklistId: _cl),
          runs: [_run(MobileChecklistRunStatus.completed)],
        );
        await h.pump(t);
        expect(find.text(_avisoTitulo), findsNothing);
        expect(h.concluirAtivo(t), isTrue);

        await t.tap(h.concluir);
        await t.pumpAndSettle();
        expect(find.byKey(const Key('conclusion-synced')), findsOneWidget);
        expect(await h.conclusoesNaFila(), hasLength(1));
        // J-564 C3-02: depois do sucesso, nenhuma falha na tela.
        expect(find.text(_falha), findsNothing, reason: 'falha falsa');
      },
    );
  });

  group(
    'B-SAN3-15b T-H3 — guarda de fonte: a comissão inventada sai do código',
    () {
      test(
        '_baseValueFor e ratePercent: dão 0 em lib/features/work_orders/',
        () {
          final dir = Directory('lib/features/work_orders');
          expect(
            dir.existsSync(),
            isTrue,
            reason: 'rode a partir de mobile/flutter_app',
          );
          final achados = <String>[];
          final arquivos = dir
              .listSync(recursive: true)
              .whereType<File>()
              .where((f) => f.path.endsWith('.dart'))
              .toList();
          expect(arquivos, isNotEmpty, reason: 'a guarda mede algo');
          for (final file in arquivos) {
            final linhas = file.readAsLinesSync();
            for (var i = 0; i < linhas.length; i++) {
              if (linhas[i].contains('_baseValueFor') ||
                  linhas[i].contains('ratePercent:')) {
                achados.add('${file.path}:${i + 1}');
              }
            }
          }
          expect(achados, isEmpty, reason: achados.join('\n'));
        },
      );
    },
  );

  group('B-SAN3-15b T-H4 — o "Tempo" depois de concluir', () {
    testWidgets('antes "—"; depois de concluir, a duração', (t) async {
      final h = _Conclusao(
        _wo(
          startedAt: DateTime.now().toUtc().subtract(
            const Duration(hours: 1, minutes: 30),
          ),
        ),
      );
      await h.pump(t);
      expect(find.text('—'), findsOneWidget, reason: 'antes de concluir');

      await t.tap(h.concluir);
      await t.pumpAndSettle();
      expect(find.byKey(const Key('conclusion-synced')), findsOneWidget);
      expect(find.text('—'), findsNothing, reason: 'depois de concluir');
      expect(
        find.textContaining(RegExp(r'^1h (29|30|31)min$')),
        findsOneWidget,
      );
      // J-564 C3-02: depois do sucesso, nenhuma falha na tela.
      expect(find.text(_falha), findsNothing, reason: 'falha falsa');
    });
  });

  group('B-SAN3-15b T-H7 — a volta de "Abrir checklist" (J-564 C3-02)', () {
    testWidgets(
      'abre o checklist, conclui a vistoria e volta: sem exceção, o aviso some e o botão fica ativo',
      (t) async {
        final h = _Conclusao(
          _wo(checklistId: _cl),
          runs: [_run(MobileChecklistRunStatus.inProgress)],
        );
        await h.pump(t);
        expect(find.text(_avisoTitulo), findsOneWidget);
        expect(h.concluirAtivo(t), isFalse);

        await t.tap(find.byKey(const Key('conclusion-open-checklist')));
        await t.pumpAndSettle();
        expect(find.byKey(const Key('checklist-voltar')), findsOneWidget);
        await h.checklistStore.saveRun(
          _run(MobileChecklistRunStatus.completed),
        );
        await t.tap(find.byKey(const Key('checklist-voltar')));
        await t.pumpAndSettle();

        expect(t.takeException(), isNull);
        expect(find.text(_avisoTitulo), findsNothing);
        expect(h.concluirAtivo(t), isTrue);
        expect(find.text(_falha), findsNothing);
      },
    );
  });

  group('B-SAN3-15b T-H8 — OS pausada (J-564 C3-01)', () {
    testWidgets(
      'pausada: "Concluir atendimento" inativo e "Retome o atendimento para concluir.", nada na fila',
      (t) async {
        final h = _Conclusao(_wo(status: WorkOrderStatus.paused));
        await h.pump(t);
        expect(h.concluir, findsOneWidget);
        expect(h.concluirAtivo(t), isFalse);
        expect(find.text(_retome), findsOneWidget);
        expect(_textosTecnicos(), isEmpty);
        expect(await h.conclusoesNaFila(), isEmpty);
      },
    );

    testWidgets(
      'em atendimento: sem o aviso de retomar; pausada depois de abrir a tela: o toque mostra a recusa em português',
      (t) async {
        final h = _Conclusao(_wo());
        await h.pump(t);
        expect(find.text(_retome), findsNothing);
        expect(h.concluirAtivo(t), isTrue);

        // A OS é pausada com a tela já aberta (o resumo ainda é o de antes).
        await h.repo.updateStatus(_woId, WorkOrderStatus.paused);
        await t.tap(h.concluir);
        await t.pumpAndSettle();

        expect(find.byKey(const Key('conclusion-synced')), findsNothing);
        expect(
          find.text('A situação desta OS não permite concluir agora.'),
          findsOneWidget,
        );
        expect(_textosTecnicos(), isEmpty);
        expect(await h.conclusoesNaFila(), isEmpty);
      },
    );

    test(
      'o repositório recusa a transição em português, nos dois pontos, sem o nome do estado interno',
      () async {
        final repo = WorkOrderRepository(
          session: _session,
          syncQueue: InMemorySyncQueueRepository(),
          actionFactory: SyncActionFactory(),
          localStore: InMemoryWorkOrderLocalStore([
            _wo(status: WorkOrderStatus.paused),
          ]),
        );
        await repo.load();
        Matcher recusa(String mensagem) => throwsA(
          isA<StateError>().having((e) => e.message, 'message', mensagem),
        );
        await expectLater(
          repo.completeWorkOrder(
            _woId,
            checklistComplete: true,
            deliveryComplete: true,
          ),
          recusa('A situação desta OS não permite concluir agora.'),
        );
        await expectLater(
          repo.updateStatus(_woId, WorkOrderStatus.completed),
          recusa('A situação desta OS não permite essa mudança agora.'),
        );
      },
    );
  });

  group(
    'B-SAN3-15b T-H5 — decisão 1.D: sem "Equipamento" no resumo do prestador',
    () {
      testWidgets(
        'não há "Equipamento" nem o código da OS; há Serviço e Cliente',
        (t) async {
          final h = _Conclusao(_wo());
          await h.pump(t);
          expect(find.text('Equipamento'), findsNothing);
          expect(find.text(_codigo), findsNothing);
          expect(find.textContaining(_codigo), findsNothing);
          expect(find.text('Serviço'), findsOneWidget);
          expect(find.text('Cliente'), findsOneWidget);
          expect(find.text('Troca de disjuntor'), findsOneWidget);
          expect(find.text('Indústria Alfa'), findsOneWidget);
        },
      );
    },
  );

  group(
    'B-SAN3-15b T-H6 — OS sem checklist não toca no repositório de checklist',
    () {
      testWidgets('abre, conclui e enfileira, com 0 leituras do checklist', (
        t,
      ) async {
        final h = _Conclusao(_wo());
        await h.pump(t);
        expect(h.concluirAtivo(t), isTrue);
        await t.tap(h.concluir);
        await t.pumpAndSettle();
        expect(find.byKey(const Key('conclusion-synced')), findsOneWidget);
        expect(await h.conclusoesNaFila(), hasLength(1));
        expect(h.criacoesDoProvider, 0, reason: 'provider de checklist criado');
        expect(h.checklists.leituras, 0, reason: 'execuções lidas');
      });
    },
  );
}

class _SemChecklistRemoto implements ChecklistRemoteApi {
  @override
  Future<List<RemoteChecklistRun>> fetchRunsForWorkOrder(
    String workOrderId, {
    String? checklistId,
  }) async => const [];

  @override
  Future<MobileChecklistSchema> fetchChecklistRender(String checklistId) =>
      Future.error(const ApiNetworkError());

  @override
  Future<List<MobileChecklistTemplate>> fetchAvailableChecklists({
    required String tenantId,
    String? workOrderId,
  }) async => const [];

  @override
  Future<String> createRun({
    required String checklistId,
    required String workOrderId,
    required String tenantId,
    required String userId,
  }) => Future.error(const ApiNetworkError());

  @override
  Future<void> patchRun({
    required String runId,
    required Map<String, Object?> answers,
  }) => Future.error(const ApiNetworkError());

  @override
  Future<void> completeRun(String runId) =>
      Future.error(const ApiNetworkError());

  @override
  Future<void> createMarker({
    required String runId,
    required String type,
    String? label,
    String? description,
    String? positionLabel,
  }) => Future.error(const ApiNetworkError());

  @override
  Future<void> createDivergence({
    required String runId,
    required String description,
  }) => Future.error(const ApiNetworkError());

  @override
  Future<void> acknowledge({
    required String runId,
    required String acknowledgedByName,
    required String acknowledgedByRole,
  }) => Future.error(const ApiNetworkError());

  @override
  Future<void> attachMetadata({
    required String runId,
    required String fieldId,
    required String fileName,
    required String mimeType,
    required int sizeBytes,
    String? checksum,
  }) => Future.error(const ApiNetworkError());
}
