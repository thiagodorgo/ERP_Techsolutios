import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/bootstrap/bootstrap_repository.dart';
import '../../../core/network/connectivity_repository.dart';
import '../data/commissions_by_patio.dart';

/// B-APP-ORG-2 (A3, tela) — o estado da aba Comissões, só em memória (CM6):
/// nada vai para o banco do aparelho. Cada pátio carrega e falha sozinho.

/// Um pátio da aba, com a marca do pátio da sessão viva.
final class CommissionPatioEntry {
  const CommissionPatioEntry({required this.patio, required this.isCurrent});

  final CommissionPatio patio;
  final bool isCurrent;
}

/// Os pátios da aba: o da sessão viva primeiro, depois os outros da lista que
/// o servidor confirmou. `null` enquanto a sessão não carregou.
final commissionPatiosProvider = Provider<List<CommissionPatioEntry>?>((ref) {
  final session = ref.watch(bootstrapSessionProvider).asData?.value;
  if (session == null) return null;
  final active = session.activeTenant;
  return List.unmodifiable([
    CommissionPatioEntry(
      patio: CommissionPatio(id: active.tenantId, name: active.displayName),
      isCurrent: true,
    ),
    for (final tenant in session.availableTenants)
      if (tenant.tenantId != active.tenantId)
        CommissionPatioEntry(
          patio: CommissionPatio(id: tenant.tenantId, name: tenant.displayName),
          isCurrent: false,
        ),
  ]);
});

/// A ligação produtiva é da fatia A1, no merge: o token de cada pátio (a
/// sessão viva e as sessões de escuta) e o cliente com renovação. A tela não
/// monta cliente HTTP (guarda G1 do B-APP-SESSAO-RENOVA). Sem a ligação, cada
/// bloco mostra o erro do pátio.
final commissionRepositoryProvider = Provider<CommissionByPatioRepository?>(
  (ref) => null,
);

/// O relógio da aba (os testes fixam a hora).
final commissionClockProvider = Provider<DateTime Function()>(
  (ref) => DateTime.now,
);

/// O que a aba sabe de um pátio.
final class CommissionPatioState {
  const CommissionPatioState({
    required this.loading,
    this.block,
    this.loadedAt,
    this.attemptAt,
    this.stale = false,
  });

  /// Há um pedido em curso.
  final bool loading;

  /// O resultado que a tela mostra (no "sem atualização", o anterior).
  final CommissionPatioBlock? block;

  /// A hora em que chegou o resultado mostrado.
  final DateTime? loadedAt;

  /// A hora da última tentativa.
  final DateTime? attemptAt;

  /// A última tentativa falhou e a tela mostra os dados de [loadedAt].
  final bool stale;
}

/// Um bloco da tela: o pátio e o que a aba sabe dele.
final class CommissionPatioView {
  const CommissionPatioView({required this.entry, required this.state});

  final CommissionPatioEntry entry;
  final CommissionPatioState? state;

  CommissionPatio get patio => entry.patio;

  CommissionPatioData? get data => state?.block?.data;

  /// O total do mês que o servidor mandou, em centavos; a tela só formata.
  int? get totalCents => data?.totalCents;
}

final commissionsControllerProvider =
    NotifierProvider<CommissionsController, Map<String, CommissionPatioState>>(
      CommissionsController.new,
    );

class CommissionsController
    extends Notifier<Map<String, CommissionPatioState>> {
  @override
  Map<String, CommissionPatioState> build() =>
      const <String, CommissionPatioState>{};

  bool get _offline => ref.read(networkStatusProvider) == NetworkStatus.offline;

  /// Carrega os pátios que ainda não têm resultado (sem conexão, nada).
  Future<void> open(List<CommissionPatio> patios) async {
    if (_offline) return;
    await Future.wait([
      for (final patio in patios)
        if (!state.containsKey(patio.id)) _load(patio),
    ]);
  }

  /// Pede de novo todos os pátios (sem conexão, nada).
  Future<void> refresh(List<CommissionPatio> patios) async {
    if (_offline) return;
    await Future.wait([
      for (final patio in patios)
        if (state[patio.id]?.loading != true) _load(patio),
    ]);
  }

  /// "Tentar de novo": pede o pátio mesmo sem conexão conhecida.
  Future<void> retry(CommissionPatio patio) => _load(patio);

  Future<void> _load(CommissionPatio patio) async {
    final previous = state[patio.id];
    final clock = ref.read(commissionClockProvider);
    _put(
      patio.id,
      CommissionPatioState(
        loading: true,
        block: previous?.block,
        loadedAt: previous?.loadedAt,
        attemptAt: previous?.attemptAt,
        stale: previous?.stale ?? false,
      ),
    );
    final result = await _fetch(patio, clock());
    if (!ref.mounted) return;
    final at = clock();
    final kept = previous?.block;
    if (result.status == CommissionPatioBlockStatus.failed &&
        kept?.status == CommissionPatioBlockStatus.loaded) {
      // Sem atualização: fica o que já estava na tela, com a hora dele.
      _put(
        patio.id,
        CommissionPatioState(
          loading: false,
          block: kept,
          loadedAt: previous?.loadedAt,
          attemptAt: at,
          stale: true,
        ),
      );
      return;
    }
    _put(
      patio.id,
      CommissionPatioState(
        loading: false,
        block: result,
        loadedAt: at,
        attemptAt: at,
      ),
    );
  }

  Future<CommissionPatioBlock> _fetch(
    CommissionPatio patio,
    DateTime today,
  ) async {
    final repository = ref.read(commissionRepositoryProvider);
    if (repository == null) return CommissionPatioBlock.failed(patio);
    try {
      final blocks = await repository.load([
        patio,
      ], months: CommissionMonth.lastMonths(today));
      return blocks.single;
    } catch (_) {
      // Um pátio nunca derruba a aba (CM4).
      return CommissionPatioBlock.failed(patio);
    }
  }

  void _put(String patioId, CommissionPatioState value) {
    state = Map.unmodifiable({...state, patioId: value});
  }
}

/// A linha aberta da aba: uma por vez, na tela inteira.
final commissionOpenRowProvider =
    NotifierProvider<CommissionOpenRowController, String?>(
      CommissionOpenRowController.new,
    );

class CommissionOpenRowController extends Notifier<String?> {
  @override
  String? build() => null;

  void toggle(String key) => state = state == key ? null : key;

  void closeIn(String prefix) {
    final open = state;
    if (open != null && open.startsWith(prefix)) state = null;
  }
}
