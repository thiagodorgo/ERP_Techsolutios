// ignore_for_file: depend_on_referenced_packages
// `package:analyzer` vem do lock deste app como dependência TRANSITIVA (o mesmo uso de
// `test/core/sync/bo6r11_guard_fila_await_ast_test.dart`). Se sumir da resolução, este teste NÃO
// COMPILA: a falha é ruidosa, nunca silenciosa. `pubspec.*` fica intocado.
//
// B-SAN3-19b (item 48 e resíduo do item 47; plano v2 §3.1, T6, T7 e T8, com a Emenda 1):
// nenhum texto exibido de `lib/` tem termo técnico.
//
// T6 lê a árvore sintática de todo `lib/**/*.dart` e coleta os literais nas âncoras de exibição:
//   - argumento nomeado ou `=` de `title`, `subtitle`, `message`, `text` (`TextSpan`),
//     `errorText`… (lista abaixo);
//   - o 1º argumento posicional de `Text(`;
//   - os braços `=>` dentro de função ou getter `String` cujo nome tem `label`/`Label`.
// Em cada âncora entram todos os ramos da expressão (`?:`, `??`, `+`, `switch`). Interpolação
// vira espaço; comentário não conta. T6b é a prova na tela: a lista de despesas do app de
// demonstração não mostra papel cru, "local-first", código de regra nem texto em inglês.
import 'dart:io';

import 'package:analyzer/dart/analysis/utilities.dart';
import 'package:analyzer/dart/ast/ast.dart';
import 'package:analyzer/dart/ast/visitor.dart';
import 'package:erp_techsolutions_mobile/app/router.dart';
import 'package:erp_techsolutions_mobile/core/auth/auth_token_storage.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_repository.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/network/api_error.dart';
import 'package:erp_techsolutions_mobile/core/permissions/permission_resolver.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_store.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_providers.dart';
import 'package:erp_techsolutions_mobile/features/auth/auth_models.dart';
import 'package:erp_techsolutions_mobile/features/expenses/data/expense_local_store.dart';
import 'package:erp_techsolutions_mobile/features/expenses/data/expense_repository.dart';
import 'package:erp_techsolutions_mobile/features/expenses/domain/expense_models.dart';
import 'package:erp_techsolutions_mobile/shared/ui/erp_components.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

// ── T6: âncoras, regras, allowlist e piso ────────────────────────────────────

const _ancorasNomeadas =
    'title|subtitle|message|blockedMessage|label|labelText|hintText|helperText|errorText|text|tooltip|safeMessage|lastSafeError|greeting|semanticLabel|emptyMessage|description|displayName';
final _funcaoDeRotulo = RegExp('[Ll]abel');

// Piso N0 (plano v2 §3.1): a contagem medida com o código já consertado. Era
// `[T6] exibidos=771` na F5; com `text` e `errorText` nas âncoras (Emenda 3, PR540-04),
// `exibidos=779`. Se cair abaixo dele, o analisador está perdendo âncoras. Texto exibido
// removido de propósito pede o piso novo, medido, no mesmo PR.
const _pisoN0 = 779;

// Allowlist nomeada, no máximo 1 entrada: a tela só abre com `kIsDevMode` (conferido abaixo).
const _allowlist = {'lib/core/diagnostics/diagnostics_screen.dart'};

final _chave = RegExp(r'\b[a-z][a-z_]*:[a-z][a-z_]*\b');
final _chaveDeAcao = RegExp(r'\b[a-z][a-z_]+\.[a-z][a-z_]+\b');
final _termo = RegExp(
  r'\b(bootstrap|backend|placeholder|workflow|token|tenant|local-first|payload|endpoint)\b',
  caseSensitive: false,
);
const _papeisFixos = [
  'manager',
  'finance',
  'operator',
  'auditor',
  'support',
  'inventory',
];
final _tresLetras = RegExp(r'[A-Za-zÀ-ÿ]{3}');

/// Chaves do mapa de papéis, lidas do arquivo (não copiadas aqui).
List<String> _papeisDoArquivo() {
  final fonte = File('lib/core/auth/role_labels.dart').readAsStringSync();
  final chaves = RegExp(
    r"^\s*'([a-z_]+)'\s*:",
    multiLine: true,
  ).allMatches(fonte).map((m) => m.group(1)!).toList();
  return chaves;
}

RegExp _papelCru() {
  final todos = {..._papeisDoArquivo(), ..._papeisFixos};
  return RegExp('\\b(${todos.join('|')})\\b', caseSensitive: false);
}

String _rel(String caminho) {
  final p = caminho.replaceAll(r'\', '/');
  final i = p.indexOf('lib/');
  return i < 0 ? p : p.substring(i);
}

Map<String, String> _fontes(String raiz) {
  final saida = <String, String>{};
  for (final f in Directory(raiz).listSync(recursive: true).whereType<File>()) {
    if (!f.path.endsWith('.dart')) continue;
    saida[_rel(f.path)] = f.readAsStringSync();
  }
  return saida;
}

CompilationUnit _parse(String caminho, String fonte) =>
    parseString(content: fonte, path: caminho, throwIfDiagnostics: false).unit;

/// Texto do literal, com cada interpolação trocada por um espaço.
String _valor(StringLiteral s) {
  if (s is SimpleStringLiteral) return s.value;
  if (s is AdjacentStrings) return s.strings.map(_valor).join();
  if (s is StringInterpolation) {
    return s.elements
        .map((e) => e is InterpolationString ? e.value : ' ')
        .join();
  }
  return '';
}

/// Todo literal que a expressão pode exibir: ela mesma e cada ramo de `?:`, `??`, `+` e `switch`.
void _ramos(Expression? e, void Function(StringLiteral) achou) {
  if (e == null) return;
  if (e is StringLiteral) {
    achou(e);
  } else if (e is ParenthesizedExpression) {
    _ramos(e.expression, achou);
  } else if (e is ConditionalExpression) {
    _ramos(e.thenExpression, achou);
    _ramos(e.elseExpression, achou);
  } else if (e is BinaryExpression &&
      (e.operator.lexeme == '??' || e.operator.lexeme == '+')) {
    _ramos(e.leftOperand, achou);
    _ramos(e.rightOperand, achou);
  } else if (e is SwitchExpression) {
    for (final c in e.cases) {
      _ramos(c.expression, achou);
    }
  }
}

class _Literal {
  _Literal(this.arquivo, this.linha, this.texto);
  final String arquivo;
  final int linha;
  final String texto;
}

class _ColetaExibidos extends RecursiveAstVisitor<void> {
  _ColetaExibidos(this.arquivo, this.unidade, this.ancora);
  final String arquivo;
  final CompilationUnit unidade;
  final RegExp ancora;
  final porOffset = <int, _Literal>{};
  var _dentroDeRotulo = 0;

  void _anota(Expression? e) => _ramos(e, (s) {
    final linha = unidade.lineInfo.getLocation(s.offset).lineNumber;
    porOffset[s.offset] = _Literal(arquivo, linha, _valor(s));
  });

  String? _nomeFinal(Expression e) => switch (e) {
    SimpleIdentifier i => i.name,
    PrefixedIdentifier p => p.identifier.name,
    PropertyAccess a => a.propertyName.name,
    _ => null,
  };

  bool _ehString(TypeAnnotation? t) =>
      t is NamedType && t.name.lexeme == 'String';

  @override
  void visitNamedExpression(NamedExpression node) {
    if (ancora.hasMatch(node.name.label.name)) _anota(node.expression);
    super.visitNamedExpression(node);
  }

  @override
  void visitDefaultFormalParameter(DefaultFormalParameter node) {
    final nome = node.name?.lexeme;
    if (nome != null && ancora.hasMatch(nome)) _anota(node.defaultValue);
    super.visitDefaultFormalParameter(node);
  }

  @override
  void visitVariableDeclaration(VariableDeclaration node) {
    if (ancora.hasMatch(node.name.lexeme)) _anota(node.initializer);
    super.visitVariableDeclaration(node);
  }

  @override
  void visitAssignmentExpression(AssignmentExpression node) {
    final nome = _nomeFinal(node.leftHandSide);
    if (nome != null && ancora.hasMatch(nome)) _anota(node.rightHandSide);
    super.visitAssignmentExpression(node);
  }

  void _primeiroPosicional(ArgumentList args) {
    final posicionais = args.arguments.where((a) => a is! NamedExpression);
    if (posicionais.isNotEmpty) _anota(posicionais.first);
  }

  @override
  void visitMethodInvocation(MethodInvocation node) {
    if (node.target == null && node.methodName.name == 'Text') {
      _primeiroPosicional(node.argumentList);
    }
    super.visitMethodInvocation(node);
  }

  @override
  void visitInstanceCreationExpression(InstanceCreationExpression node) {
    final c = node.constructorName;
    if (c.name == null && c.type.name.lexeme == 'Text') {
      _primeiroPosicional(node.argumentList);
    }
    super.visitInstanceCreationExpression(node);
  }

  void _rotulo(String nome, TypeAnnotation? retorno, AstNode corpo) {
    if (!_funcaoDeRotulo.hasMatch(nome) || !_ehString(retorno)) {
      corpo.visitChildren(this);
      return;
    }
    _dentroDeRotulo++;
    if (corpo is ExpressionFunctionBody) _anota(corpo.expression);
    corpo.visitChildren(this);
    _dentroDeRotulo--;
  }

  @override
  void visitFunctionDeclaration(FunctionDeclaration node) {
    _rotulo(node.name.lexeme, node.returnType, node.functionExpression.body);
    node.functionExpression.parameters?.accept(this);
  }

  @override
  void visitMethodDeclaration(MethodDeclaration node) {
    _rotulo(node.name.lexeme, node.returnType, node.body);
    node.parameters?.accept(this);
  }

  @override
  void visitSwitchExpressionCase(SwitchExpressionCase node) {
    if (_dentroDeRotulo > 0) _anota(node.expression);
    super.visitSwitchExpressionCase(node);
  }
}

({List<_Literal> exibidos, List<String> violacoes, int naAllowlist})
_varreduraT6() {
  final ancora = RegExp('^(?:$_ancorasNomeadas)\$');
  final papel = _papelCru();
  final exibidos = <_Literal>[];
  final violacoes = <String>[];
  var naAllowlist = 0;
  final fontes = _fontes('lib');
  final caminhos = fontes.keys.toList()..sort();
  for (final caminho in caminhos) {
    final unidade = _parse(caminho, fontes[caminho]!);
    final coleta = _ColetaExibidos(caminho, unidade, ancora);
    unidade.accept(coleta);
    for (final l in coleta.porOffset.values) {
      if (!_tresLetras.hasMatch(l.texto)) continue;
      exibidos.add(l);
      final problemas = [
        if (_chave.hasMatch(l.texto)) 'chave técnica',
        if (_chaveDeAcao.hasMatch(l.texto)) 'chave de ação',
        if (_termo.hasMatch(l.texto)) 'termo técnico',
        if (papel.hasMatch(l.texto)) 'papel cru',
      ];
      if (problemas.isEmpty) continue;
      if (_allowlist.contains(caminho)) {
        naAllowlist++;
        continue;
      }
      violacoes.add(
        '${l.arquivo}:${l.linha}: "${l.texto}" (${problemas.join(', ')})',
      );
    }
  }
  return (exibidos: exibidos, violacoes: violacoes, naAllowlist: naAllowlist);
}

// ── T6b, T8: sessões e app ───────────────────────────────────────────────────

class _Despesas extends StatelessWidget {
  const _Despesas(this.sessao, {this.local = '/expenses', this.relatorios});
  final BootstrapSession sessao;
  final String local;
  final List<ExpenseReport>? relatorios;

  @override
  Widget build(BuildContext context) {
    appRouter.go(local);
    return ProviderScope(
      overrides: [
        bootstrapSessionProvider.overrideWith((_) async => sessao),
        expenseLocalStoreProvider.overrideWithValue(
          InMemoryExpenseLocalStore(relatorios ?? const []),
        ),
        syncActionStoreProvider.overrideWithValue(InMemorySyncActionStore()),
      ],
      child: MaterialApp.router(routerConfig: appRouter),
    );
  }
}

/// Todo texto da tela, fora a barra da organização: ela mostra o e-mail do usuário de
/// demonstração (`tecnico@tenant.demo`), que é dado do usuário e fica fora deste bloco (plano v2
/// §2.5; apenso na `P-CHK-SEED-DEMO-SUJO`).
List<String> _todosOsTextos(WidgetTester tester) {
  final daBarra = tester
      .widgetList<Text>(
        find.descendant(
          of: find.byType(TenantContextBar),
          matching: find.byType(Text),
        ),
      )
      .toSet();
  return tester
      .widgetList<Text>(find.byType(Text))
      .where((t) => !daBarra.contains(t))
      .map((t) => t.data ?? t.textSpan?.toPlainText() ?? '')
      .toList();
}

AuthSession _sessaoLocal(String tenantId) => AuthSession(
  tokens: AuthTokens(
    accessToken: 'acesso-bsan319b',
    expiresAt: DateTime.now().toUtc().add(const Duration(hours: 1)),
  ),
  user: AuthUser(
    sub: 'u-bsan319b',
    email: 'tecnico@empresa.test',
    tenantId: tenantId,
    tenantRole: 'field_technician',
    tenantRoles: const ['field_technician'],
    permissions: const ['work_orders:read'],
    scope: 'tenant',
  ),
);

void main() {
  group('B-SAN3-19b · texto exibido', () {
    test('T6 — nenhum texto exibido de lib/ tem termo técnico', () {
      final r = _varreduraT6();
      debugPrint(
        '[T6] exibidos=${r.exibidos.length} violacoes=${r.violacoes.length} '
        'allowlist=${r.naAllowlist}',
      );
      expect(r.violacoes, isEmpty, reason: r.violacoes.join('\n'));
      expect(r.exibidos.length, greaterThanOrEqualTo(_pisoN0));
    });

    test('T6 — a allowlist só vale para a tela que abre com kIsDevMode', () {
      expect(_allowlist.length, lessThanOrEqualTo(1));
      for (final a in _allowlist) {
        expect(File(a).existsSync(), isTrue, reason: '$a sumiu');
      }
      final fonte = File('lib/app/router.dart').readAsStringSync();
      final unidade = _parse('lib/app/router.dart', fonte);
      final usos = <AstNode>[];
      unidade.accept(_UsosDeDiagnostico(usos));
      expect(usos.length, 2, reason: 'DiagnosticsScreen() no roteador');
      for (final u in usos) {
        final pai = u.parent;
        final noRamoDev =
            pai is ConditionalExpression &&
            identical(pai.thenExpression, u) &&
            pai.condition is SimpleIdentifier &&
            (pai.condition as SimpleIdentifier).name == 'kIsDevMode';
        expect(
          noRamoDev,
          isTrue,
          reason: 'DiagnosticsScreen() fora do ramo dev',
        );
      }
    });

    test('T7 — os textos de falha estão acentuados e o aviso de integração '
        'não promete sincronizar', () {
      const proibidos = [
        'decisao manual',
        'Falha de conexao',
        'Integracao remota',
      ];
      final achados = <String>[];
      final fontes = _fontes('lib');
      for (final e in fontes.entries) {
        final unidade = _parse(e.key, e.value);
        unidade.accept(
          _TodoTexto((offset, texto) {
            for (final p in proibidos) {
              if (texto.contains(p)) {
                final l = unidade.lineInfo.getLocation(offset).lineNumber;
                achados.add('${e.key}:$l: "$p"');
              }
            }
          }),
        );
      }
      expect(achados, isEmpty, reason: achados.join('\n'));

      const aviso = ApiIntegrationUnavailableError();
      expect(aviso.safeMessage.toLowerCase(), isNot(contains('sincroniz')));
      expect(aviso.safeMessage, contains('Integração'));
    });

    test('T8 (i) — a sessão de demonstração não chama a organização de '
        '"Tenant"', () {
      expect(
        devBootstrapSession.activeTenant.displayName,
        'Organização Demonstração',
      );
      final nomes = [
        devBootstrapSession.activeTenant.displayName,
        for (final t in devBootstrapSession.availableTenants) t.displayName,
      ];
      for (final n in nomes) {
        expect(n.toLowerCase(), isNot(contains('tenant')), reason: n);
      }
    });

    test('T8 (ii) — o app local dá à organização de demonstração o nome '
        'da sessão de demonstração', () async {
      final repo = LocalDevBootstrapRepository(InMemoryAuthTokenStorage());
      final bs = await repo.fetch(_sessaoLocal('tenant-demo'));
      expect(bs.activeTenant.displayName, 'Organização Demonstração');
      for (final t in bs.availableTenants) {
        expect(t.displayName, 'Organização Demonstração');
      }
    });

    test('T8 (iii) — id fora da sessão de demonstração: o nome não diz '
        '"tenant"', () async {
      final repo = LocalDevBootstrapRepository(InMemoryAuthTokenStorage());
      final bs = await repo.fetch(_sessaoLocal('tenant-xyz'));
      expect(bs.activeTenant.tenantId, 'tenant-xyz');
      expect(
        bs.activeTenant.displayName.toLowerCase(),
        isNot(contains('tenant')),
      );
      expect(bs.activeTenant.displayName.trim(), isNotEmpty);
    });

    testWidgets('T6b — a lista de despesas do app de demonstração não mostra '
        'papel cru, código de regra nem inglês', (tester) async {
      tester.view.physicalSize = const Size(1080, 6000);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.reset);

      await tester.pumpWidget(const _Despesas(devBootstrapSession));
      await tester.pumpAndSettle();

      final textos = _todosOsTextos(tester);
      expect(textos, contains('Aprovado pelo gestor'));
      final papel = _papelCru();
      final ruins = textos.where(
        (t) =>
            papel.hasMatch(t) ||
            _termo.hasMatch(t) ||
            t.contains('(category_limit_exceeded)') ||
            t.contains('(receipt_required)') ||
            t.contains('Expense item') ||
            t.contains('Receipt is'),
      );
      expect(ruins, isEmpty, reason: ruins.join('\n'));
    });

    testWidgets('T6c — o cartão "ainda não disponível" só aparece quando a '
        'prestação espera aprovação (PR540-01)', (tester) async {
      tester.view.physicalSize = const Size(1080, 6000);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.reset);

      final org = devBootstrapSession.activeTenant.tenantId;
      ExpenseReport pc(String id, ExpenseReportStatus status) => ExpenseReport(
        localId: id,
        title: 'Prestação $id',
        tenantId: org,
        employeeId: devBootstrapSession.user.userId,
        policyVersion: devBootstrapSession.expensePolicy.version,
        status: status,
        advance: ExpenseAdvance(tenantId: org, amount: 0),
      );
      final relatorios = [
        pc('PC-enviada', ExpenseReportStatus.submitted),
        pc('PC-aprovada', ExpenseReportStatus.approvedManager),
      ];
      const cartao = 'Aprovação da prestação de contas';

      await tester.pumpWidget(
        _Despesas(
          devBootstrapSession,
          local: '/expenses/PC-enviada',
          relatorios: relatorios,
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('Enviado'), findsOneWidget);
      expect(find.text(cartao), findsOneWidget);

      // Sessão nova = ProviderScope novo (a troca de override não vale no mesmo escopo).
      await tester.pumpWidget(const SizedBox.shrink());
      await tester.pumpWidget(
        _Despesas(
          devBootstrapSession,
          local: '/expenses/PC-aprovada',
          relatorios: relatorios,
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('Aprovado pelo gestor'), findsOneWidget);
      expect(find.text(cartao), findsNothing);
    });

    testWidgets('T6b — a lista vazia não fala em "local-first"', (
      tester,
    ) async {
      const vazia = BootstrapSession(
        activeTenant: TenantContext(
          tenantId: 'org-bsan319b',
          displayName: 'Guinchos Brasil',
        ),
        enabledModules: [],
        permissions: PermissionSet({
          'expense_report:read',
          'expense_report:create',
        }),
      );
      await tester.pumpWidget(const _Despesas(vazia));
      await tester.pumpAndSettle();

      final textos = _todosOsTextos(tester);
      expect(textos, contains('Crie uma prestação de contas para começar.'));
      final ruins = textos.where((t) => _termo.hasMatch(t));
      expect(ruins, isEmpty, reason: ruins.join('\n'));
    });
  });
}

class _UsosDeDiagnostico extends RecursiveAstVisitor<void> {
  _UsosDeDiagnostico(this.usos);
  final List<AstNode> usos;

  @override
  void visitMethodInvocation(MethodInvocation node) {
    if (node.target == null && node.methodName.name == 'DiagnosticsScreen') {
      usos.add(node);
    }
    super.visitMethodInvocation(node);
  }

  @override
  void visitInstanceCreationExpression(InstanceCreationExpression node) {
    if (node.constructorName.type.name.lexeme == 'DiagnosticsScreen') {
      usos.add(node);
    }
    super.visitInstanceCreationExpression(node);
  }
}

/// Todo trecho de texto de literal (fora de comentário, que não entra na árvore).
class _TodoTexto extends RecursiveAstVisitor<void> {
  _TodoTexto(this.achou);
  final void Function(int offset, String texto) achou;

  @override
  void visitSimpleStringLiteral(SimpleStringLiteral node) {
    achou(node.offset, node.value);
    super.visitSimpleStringLiteral(node);
  }

  @override
  void visitInterpolationString(InterpolationString node) {
    achou(node.offset, node.value);
    super.visitInterpolationString(node);
  }
}
