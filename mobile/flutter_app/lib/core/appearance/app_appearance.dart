/// B-APP-APARENCIA (F1) — o registro das aparências do app, espelho do
/// `frontend/src/modules/appearance/appearance.registry.ts` do web.
///
/// Cada tela do app que entrega as 3 aparências aprovadas (`D-TELAS-SAEM-COM-TRES`)
/// entra aqui NO MESMO bloco que as entrega. A escolha é por tela e pessoal
/// (`D-APARENCIA-POR-USUARIO`): fica no aparelho, por pessoa e organização.
library;

/// As três aparências aprovadas de uma tela.
enum AppAppearance {
  a,
  b,
  c;

  /// A letra que vai para o armazenamento e para a tela ("A", "B" ou "C").
  String get letter => name.toUpperCase();

  /// A aparência pela letra guardada; qualquer outra coisa é `null`.
  static AppAppearance? fromLetter(Object? value) {
    if (value is! String) return null;
    for (final appearance in AppAppearance.values) {
      if (appearance.letter == value) return appearance;
    }
    return null;
  }
}

/// Uma opção de uma tela: a letra e o nome da maquete aprovada.
class AppAppearanceOption {
  const AppAppearanceOption(this.value, this.label);

  final AppAppearance value;
  final String label;
}

/// Uma tela do registro: a chave (a mesma do arquivo de referência e do web),
/// o rótulo que o Perfil mostra e as 3 opções.
class AppAppearanceScreen {
  const AppAppearanceScreen({
    required this.key,
    required this.label,
    required this.options,
  });

  final String key;
  final String label;
  final List<AppAppearanceOption> options;

  /// O nome da opção [value] nesta tela.
  String labelOf(AppAppearance value) {
    for (final option in options) {
      if (option.value == value) return option.label;
    }
    return '';
  }

  /// O meta da linha do Perfil: "B · Como o protótipo".
  String metaOf(AppAppearance value) => '${value.letter} · ${labelOf(value)}';
}

/// A chave da tela de localização e consentimento
/// (`localizacao-consentimento-3opcoes.reference.html`).
const kLocationConsentAppearanceKey = 'localizacao-consentimento';

/// O rótulo da tela de localização no seletor (Emenda 3, §1: o título da
/// maquete e o nome da chave; "Localização" sozinho repetiria a linha de
/// Privacidade do Perfil).
const kLocationConsentAppearanceLabel = 'Localização e consentimento';

/// As telas do app que já entregam as 3 aparências. Cada fatia registra só as
/// telas que ela entrega (plano §1.5).
const List<AppAppearanceScreen> appAppearanceScreens = [
  AppAppearanceScreen(
    key: kLocationConsentAppearanceKey,
    label: kLocationConsentAppearanceLabel,
    options: [
      AppAppearanceOption(AppAppearance.a, 'Cartões de hoje'),
      AppAppearanceOption(AppAppearance.b, 'Como o protótipo'),
      AppAppearanceOption(AppAppearance.c, 'Resumo e ações fixas'),
    ],
  ),
];

/// O padrão de cada tela: A em todas (`D-APARENCIA-RESPOSTAS` (b)).
AppAppearance defaultAppAppearanceFor(String screenKey) => AppAppearance.a;

/// A escolha guardada de cada tela: `{"<tela>": A | B | C}`.
typedef AppAppearancePrefs = Map<String, AppAppearance>;

/// A aparência de [screenKey]: a escolha guardada ou o padrão da tela.
AppAppearance resolveAppAppearance(
  AppAppearancePrefs prefs,
  String screenKey,
) => prefs[screenKey] ?? defaultAppAppearanceFor(screenKey);
