import '../bootstrap/bootstrap_session.dart';

// B-MOBILE-GATE-CHAVE (item 66 do portão) — a régua ÚNICA dos gates de tela e de botão do app.
//
// Cada regra é a cópia da rota do servidor que a tela usa: os módulos (semântica "qualquer um", a mesma do
// `module-gate.middleware.ts`, `.some`), as chaves do catálogo e o modo das chaves ("qualquer uma" ou "todas"). As
// telas e o roteador consultam só esta tabela (`MobileGates.<regra>.permite(sessão)`) e nunca escrevem chave literal.
// O `tests/mobile-gate-chave-catalogo.test.ts` (T4.1) confere cada regra contra os EXPORTS da própria rota, e o T3
// confere o veredito de cada regra contra o veredito medido no servidor, papel a papel. O servidor continua sendo a
// autoridade final (a UI só esconde).
//
// G5 (Diagnóstico) NÃO tem regra: não há rota de servidor a espelhar. Fora do modo de desenvolvimento a área fica
// indisponível para todo perfil (resposta 2.2 do dono, `D-DONO-1311-RECOMENDACOES`).

/// Modo de combinação de uma lista: `any` = qualquer uma; `all` = todas.
enum Modo { any, all }

class MobileGate {
  const MobileGate({
    required this.nome,
    required this.modulos,
    required this.modoModulo,
    required this.chaves,
    required this.modo,
  });

  final String nome;
  final List<String> modulos;
  final Modo modoModulo;
  final List<String> chaves;
  final Modo modo;

  /// `true` só quando a organização tem o módulo da rota e o perfil tem as chaves que ela confere. Sem sessão, nega.
  bool permite(BootstrapSession? sessao) {
    if (sessao == null) return false;
    final enabled = sessao.enabledModules.map((m) => m.id).toSet();
    final modules = modulos;
    if (modules.isNotEmpty) {
      final temModulo = modoModulo == Modo.any
          ? modules.any(enabled.contains)
          : modules.every(enabled.contains);
      if (!temModulo) return false;
    }
    final tem = sessao.permissions.contains;
    return modo == Modo.any ? chaves.any(tem) : chaves.every(tem);
  }
}

abstract final class MobileGates {
  // Formato fixo: UMA regra por linha (o T4.1 do servidor lê este formato). O `dart format` não reflui estas linhas.
  // O T4.1 também acha toda regra `MobileGate(` do lib/ pela propriedade, em qualquer forma e em qualquer arquivo
  // (J-561, C2B-01): regra nova fora desta tabela ou em várias linhas fica vermelha.
  // dart format off
  static const checklistsDaOs = MobileGate(nome: 'G1', modulos: ['tenant_checklist'], modoModulo: Modo.any, chaves: ['checklist_runs:read', 'checklist_runs:create'], modo: Modo.any);
  static const responderChecklist = MobileGate(nome: 'G1b', modulos: ['tenant_checklist'], modoModulo: Modo.any, chaves: ['checklist_runs:update'], modo: Modo.all);
  static const estoque = MobileGate(nome: 'G2', modulos: ['inventory'], modoModulo: Modo.any, chaves: ['inventory.read', 'inventory.manage'], modo: Modo.any);
  static const movimentarEstoque = MobileGate(nome: 'G3', modulos: ['inventory'], modoModulo: Modo.any, chaves: ['inventory.manage'], modo: Modo.all);
  static const aprovacoes = MobileGate(nome: 'G4', modulos: ['approvals', 'work_orders'], modoModulo: Modo.any, chaves: ['work_orders:approve'], modo: Modo.all);
  // dart format on
}
