# B-SAN3-19b — diário do dev

- **Dev:** `dev-19b-cl`, identidade de dev declarada, **Claude Opus 5.5** (subagente da sessão), nível menor. Não escreveu o plano nem as críticas.
- **Exceção declarada** (§C7 item 6 "IAs externas primeiro" e 11(6)): o plano pede Codex como preferência. O Codex 1 está sem cota semanal até 16/11, o Codex 2 ocupado com a pré-revisão do #536, a API no limite do dia até 21:00 e o Argon só como segundo revisor. Por isso a **pré-revisão será de outro modelo** (o Codex 2, ou a API depois das 21:00).
- **Plano:** `C:/Users/thiag/erp-pausa-2026-10-03/planos/plano-B-SAN3-19b-v2.md`, com a **Emenda 1** (requisitos da crítica r2, `revisoes/crit-19b-r2-plano.json`).
- **Perguntas do §9, sem resposta do dono ao começar:** segue a recomendação, como o plano manda. Pergunta 1 = A (`TODO-DONO`, só neste diário); Pergunta 2 não muda o código e abre a `P-MOBILE-GATE-CHAVE-FORA-DO-CATALOGO`; o resíduo do item 47 no app é deste bloco (F4).
- **Worktree:** `C:/Users/thiag/w-19b`, ramo `fix/mobile-acesso-nao-permitido-textos`, base `origin/main` `a0979f51` (#530).
- **Flutter local:** 3.41.6 (o CI fixa 3.47.5). Toda hora vem de `date` (São Paulo).
- Gravado fatia por fatia (P1). Cópia do progresso em `C:/Users/thiag/erp-pausa-2026-10-03/revisoes/dev-19b-progresso.md`.

## Fatias (esqueleto)
- F0 — vermelho-controle: FEITA (07:31)
- F1 — `assert` e chip: FEITA (07:33)
- F2 — placeholder e roteador: FEITA (07:36)
- F3 — as 9 telas: FEITA (07:38)
- F4 — despesas, P-O6R11, item 47, banner de política: FEITA (07:48)
- F5 — README, piso N0 e mutações: EM APURAÇÃO
- F6 — registro e limpeza: EM APURAÇÃO

## F0 — vermelho-controle (07:19–07:31 SP; base `a0979f51`)

Base citada (§6, F0 "ou na `main` atual, citada"): `origin/main` = `a0979f513b1554f776b1eab1cbeae43ecffd9dd2` (#530, 06:43 SP). O plano leu em `d0da291e` e a crítica r2 em `07898adf`; as duas são ancestrais da base.

**Escolha de implementação, declarada (não muda escopo nem critério):** as guardas de fonte (T1, T1-alcance, T1b, T6, T7, T9) leem a **árvore sintática** com `package:analyzer` (`parseString`), e não um balanceador de parênteses à mão. O pacote vem do lock como dependência transitiva, com o mesmo uso e o mesmo `ignore_for_file: depend_on_referenced_packages` de `test/core/sync/bo6r11_guard_fila_await_ast_test.dart` (precedente do repo); `pubspec.*` fica intocado. Isso cumpre o que o plano pede do parser ("balanceamento de parênteses, aspas aninhadas tratadas", "comentários saem", "literais adjacentes concatenados", "`${…}` e `$id` viram espaço") por construção: comentário não entra na árvore, `AdjacentStrings` é um nó, `StringInterpolation` separa texto de expressão. O falso positivo da sonda do planejador (`checklist_available_screen.dart:336`, aspas dentro de `${}`) não existe nesse caminho.

**Âncoras da T6 com a Emenda 1 (R2-01 (b)):** argumentos nomeados e `=` (parâmetro com padrão, variável, atribuição) da lista do §3.1; o 1º posicional de `Text(`; e todo braço `=>` de `switch` dentro de função **ou getter** `String` cujo nome tem `label`/`Label` (cobre `String get label` de `ExpenseReportStatusLabels`). Em cada âncora entram os ramos de `?:`, `??`, `+` e `switch` (cobre o ternário de `expense_list_screen.dart:152`).

**Prova na tela (Emenda 1, itens 1 e 2):** o arquivo `bsan319b_texto_exibido_test.dart` ganha o **T6b**, dois testes de widget da lista de despesas: (1) com a `devBootstrapSession` (semente do app de demonstração, tela 1080×6000), nenhum texto com papel cru, termo técnico, `(category_limit_exceeded)`, `(receipt_required)`, `Expense item` ou `Receipt is`, e o chip `Aprovado pelo gestor` presente; (2) lista vazia, sem "local-first", com a frase nova presente.

| Comando | Exit | Saída resumida |
|---|---|---|
| `git fetch origin; git worktree add -b fix/mobile-acesso-nao-permitido-textos C:/Users/thiag/w-19b origin/main` | 0 | `HEAD is now at a0979f51` |
| `flutter pub get` | 0 | `Got dependencies!` |
| `dart format` + `flutter analyze` nos 3 arquivos novos | 0 | `No issues found!` |
| `flutter test` dos 3 arquivos novos (base) | 1 | `+3 -15: Some tests failed.` |
| — verdes | | T1-alcance (`achadas=10 referencia=10`), T4, T6-allowlist |
| — vermelhos | | T1 (10/10 chamadas violando), T1b (`chamadas=4`, sem `blockedMessage`, `Aprovacoes`/`Diagnostico`, "workflow backend"), T2 (sem `assert`), T3 ×3, T5, T6 (`exibidos=767 violacoes=24 allowlist=2`), T6b ×2, T7 (4 literais), T8 (i)(ii)(iii), T9 |
| `python mut.py M5` (base: `final hasPermission =` e a expressão seguinte → `final hasPermission = true;`, âncora 1) | — | T4 `+0 -1: Some tests failed`; restaurado (sha `42c2a31ac15b` igual) |
| `sed -n 477,512p .github/workflows/ci.yml` (só leitura) | 0 | job `flutter`: `actions/checkout@v4` **completo** (sem `sparse-checkout`), `working-directory: mobile/flutter_app` → `../../src/modules/core-saas/permissions/catalog.ts` existe no CI; o T9 não precisa de emenda |
| `grep -c '"<chave>"' src/modules/core-saas/permissions/catalog.ts` | 0 | `workflow:request` 0 · `diagnostics:read` 0 · `checklist_run:execute` 0 · `inventory:read` 0 · `work_orders:status` 6 · `:create` 4 · `:update` 5 · `:read` 9 · `field_location:send` 4 · `expense_report:create` 5 (igual ao §1.6) |

**As 24 violações da T6 na base** = as 21 reais da sonda do plano (as 10 do componente e do placeholder, as 2 do roteador, `expense_report_detail_screen.dart:37,90`, `new_expense_report_screen.dart:51,53`, `expense_item_receipts_screen.dart:148`, `bootstrap_session.dart:183,186,189`) + as 3 da crítica r2 (`expense_models.dart:329,330`, `expense_list_screen.dart:152`). As 2 da allowlist são `diagnostics_screen.dart`. O inglês do avaliador de política não é termo da lista: a T6 não o vê, e por isso existe o T6b.

**Diferença esperada × medida:** o plano previa T4 e T1-alcance verdes; mediu-se isso, mais o teste da allowlist (verde: `DiagnosticsScreen()` só no ramo `kIsDevMode ?`, 2 usos). Primeira execução do T4 deu vermelho por defeito do próprio teste (o mesmo `ProviderScope` não troca de override); corrigido com `pumpWidget(SizedBox.shrink())` entre as duas sessões, e então verde.

## F1 — `assert` e chip (07:32–07:33 SP)

- `erp_components.dart`: `final _kChaveTecnica = RegExp(r'\b[a-z][a-z_]*:[a-z][a-z_]*\b');` e, no `build` de `PermissionBlockedState`, a `assert` de **uma linha, sem mensagem** (forma fixada pela R2-04 para a M3): `    assert(!_kChaveTecnica.hasMatch('$title $message'));`. O chip do `ApprovalDecisionCard`: `label: 'Preparacao',` → `label: 'Em breve',` (efeito declarado no cartão de despesas, R4 do plano).
- Incidente de ferramenta, corrigido antes do commit: o primeiro `python` gravou `\b` como o caractere de controle 0x08 (escape do heredoc). Medido por `od -c`, trocado por `\b` literal; `tr -cd '\010' | wc -c` = 0 nos 3 testes novos e no componente.

| Comando | Exit | Saída resumida |
|---|---|---|
| `flutter test …acesso_nao_permitido_test.dart --plain-name T2` | 0 | `+1: All tests passed!` |
| `git commit` | 0 | `d27ee12c` |

## F2 — placeholder e roteador (07:34–07:36 SP)

- `git fetch origin && git rebase origin/main` antes da F2 (trava do §4): **head da `main` usado = `a0979f51`** (#530); "is up to date".
- `module_placeholder_screen.dart`: `required this.blockedMessage`; ramo bloqueado = `PermissionBlockedState(title: 'Acesso não permitido', message: blockedMessage)`; ramo com permissão = `ApprovalDecisionCard(title: title, message: message)`, sem o `SyncStatusBanner` e sem o import de `sync_models.dart`. As linhas do gate (`final session`, `final hasPermission = …`) ficaram byte a byte.
- `router.dart`, as 4 chamadas, mesmos textos nos dois roteadores:
  - `/approvals`: `title: 'Aprovações'`; `message: 'As aprovações ainda não estão disponíveis no aplicativo.'`; `blockedMessage: 'Esta área ainda não está disponível no aplicativo.'`.
  - `/diagnostics`: `title: 'Diagnóstico'`; `message: 'Esta área só está disponível no ambiente de desenvolvimento.'`; `blockedMessage: 'Esta área não está disponível nesta versão do aplicativo.'`.
  - **`TODO-DONO` (Pergunta 1, só neste diário):** os dois `blockedMessage` acima e as mensagens de Checklists e Estoque (F3) seguem a alternativa A recomendada. Se o dono responder B ou C, o orquestrador escreve a emenda e estas 4 linhas mudam.

| Comando | Exit | Saída resumida |
|---|---|---|
| `dart format lib/app/router.dart lib/shared/ui/module_placeholder_screen.dart` | 0 | `0 changed` |
| `flutter test …acesso_nao_permitido_test.dart` | 1 | `+7 -2`: verdes T1-alcance, T1b (`chamadas=4`), T2, T3 ×3, T4; vermelhos T1 e T9 só pelas 9 telas (F3). As 2 rotas do roteador já passam no T9 |
| `flutter test` dos 3 `bsan319_*` | 0 | `+23: All tests passed!` |

## F3 — as 9 telas (07:36–07:38 SP)

Textos da tabela do §2.4 (o "…" da tabela é "Seu perfil não tem permissão para"), F_ADM = "Fale com o administrador da sua organização." só onde a chave do gate está no catálogo:

| Tela | Título | Mensagem |
|---|---|---|
| Nova OS | Ação não permitida | Seu perfil não tem permissão para criar ordens de serviço. + F_ADM |
| Executar OS | Ação não permitida | …alterar o status desta OS. + F_ADM |
| Lista de OS | Acesso não permitido | …ver ordens de serviço. + F_ADM |
| Mapa | Acesso não permitido | …usar o mapa operacional. + F_ADM |
| Detalhe da OS | Acesso não permitido | …ver esta OS. + F_ADM |
| Solicitar aprovação | Ação não permitida | …solicitar aprovação nesta OS. + F_ADM |
| Lista de despesas | Ação não permitida | …criar prestações de contas. + F_ADM |
| Checklists | Acesso não permitido | Esta área ainda não está disponível no aplicativo. (`TODO-DONO`, Pergunta 1 = A) |
| Estoque | Acesso não permitido | Esta área ainda não está disponível no aplicativo. (`TODO-DONO`, Pergunta 1 = A) |

Só os literais `title:`/`message:` mudaram; os `if`/`.has(` e as chaves dos gates ficaram intocados (o grep da trava do §5 roda na F5). Testes da §3.2, só no literal do título: `b083_polish_test.dart:332` → `Ação não permitida`; `work_order_test.dart:391`, `b086_inventory_foundation_test.dart:248`, `b085_checklist_foundation_test.dart:252` → `Acesso não permitido`. A asserção `findsNothing` de `work_order_test.dart:392-397` ficou como está.

| Comando | Exit | Saída resumida |
|---|---|---|
| `dart format` nos 13 arquivos tocados | 0 | `2 changed` (quebra de linha em `work_order_detail_screen.dart` e `work_order_operational_map_screen.dart`) |
| `flutter test …acesso_nao_permitido_test.dart` | 0 | `+9: All tests passed!` (`[T1] chamadas=10`, `[T1-alcance] achadas=10 referencia=10`, `[T1b] chamadas=4`) |
| `flutter test` b083, b085, b086, `work_orders/work_order_test.dart` | 0 | `+80: All tests passed!` |

## F4 — despesas, P-O6R11, item 47 e banner de política (07:38–07:48 SP)

Literais trocados (só os do PERMITIDO do §4 e da Emenda 1):

| Arquivo | Antes | Depois |
|---|---|---|
| `expense_report_detail_screen.dart` (`EmptyState`) | `Prestação de Contas nao encontrada` / `O relatorio nao existe no cache local deste tenant.` | `Prestação de Contas não encontrada` / `Esta prestação de contas não está salva neste aparelho.` |
| `expense_report_detail_screen.dart` (`ApprovalDecisionCard`) | `Aprovacao futura` / `Manager/finance poderao … backend workflow …` | `Aprovação da prestação de contas` / `A aprovação desta prestação de contas ainda não está disponível no aplicativo.` |
| `new_expense_report_screen.dart` (`ListTile`) | `Criacao local-first` / `… uma acao expense_report.create entra na fila de sync.` | `Salva neste aparelho` / `Ao salvar, a prestação de contas fica neste aparelho e aparece em Sincronizar até ser enviada.` |
| `expense_item_receipts_screen.dart` (`_captureLabel`) | `Camera`, `Placeholder` | `Câmera` (permitido, não exigido), `Registro manual` |
| `expense_models.dart:329-330` (Emenda 1, R2-01) | `Aprovado manager`, `Aprovado finance` | `Aprovado pelo gestor`, `Aprovado pelo financeiro` (enum, `statusTone` e agrupamento intocados) |
| `expense_list_screen.dart:152` (Emenda 1, R2-01) | `Crie uma Prestação de Contas para iniciar a fila local-first.` | `Crie uma prestação de contas para começar.` |
| `erp_components.dart`, `PolicyViolationBanner` (Emenda 1, R2-02 saída (a)) | `Text('- ${violation.message} (${violation.code})')` | `Text('- ${_violationLabel(violation.code)}: ${violation.message}')`, com `static String _violationLabel` **dentro da classe do banner**, o mesmo mapa de `expense_report_detail_screen.dart:302-306` (`Acima do limite`, `Recibo obrigatorio`, `Violacao de politica`). O código da regra não aparece mais |
| `expense_policy_evaluator.dart`, os 2 `message:` (Emenda 1, R2-02 (a)) | `Expense item exceeds the category limit`, `Receipt is required for this category` | `o valor do item passa do limite da categoria.`, `esta categoria exige recibo.` |
| `sync_engine.dart:54` | `Conflito remoto exige decisao manual.` | `Conflito remoto exige decisão manual.` |
| `field_location_service.dart:160`, `telemetry_sync_service.dart:141` | `Falha de conexao. Tente novamente.` | `Falha de conexão. Tente novamente.` |
| `api_error.dart:43-44` | `Integracao remota ainda nao disponivel. Seus dados foram mantidos localmente e serao sincronizados quando a integracao estiver ativa.` | `Integração remota ainda não disponível. Seus dados ficam guardados neste aparelho.` (sai a promessa de sincronizar) |
| `bootstrap_session.dart` (3 `displayName`) | `Tenant Demo` ×2, `Tenant Field Services` | `Organização Demonstração` ×2, `Organização Serviços de Campo` (o `dart format` quebrou a entrada de `availableTenants` em 4 linhas, como a R2-04 previu) |
| `bootstrap_repository.dart`, `_tenantDisplayName` | formatava o id (`tenant-demo` → `Tenant Demo`) | primeiro o nome de `devBootstrapSession.availableTenants` pelo id; senão o id formatado **sem a palavra `tenant`** (`tenant-xyz` → `Xyz`; só `tenant` → `Organização`). A busca é **uma linha** (`demo.addAll(devBootstrapSession.availableTenants.where(mesmoId));`), para a M18 "apagar a linha da busca" compilar como está escrita |

Testes da §3.2 e da Emenda 1, só nos literais: `b091_connectivity_profile_test.dart:389` → `Organização Demonstração`; `b098_real_auth_bootstrap_test.dart:447` → `Organização Serviços de Campo`; `bo6r11_sync_screen_despesa_e_saida_test.dart:162,172` → `find.textContaining(RegExp('Integra[cç][aã]o remota'))` (R2-03; o `dart format` quebrou cada `expect` em 4 linhas).

**Ajuste do T6b, declarado:** a primeira execução deu vermelho pelo e-mail `tecnico@tenant.demo` da `TenantContextBar` (dado do usuário de demonstração, fora do escopo pelo §2.5). O T6b passa a ler todo texto da tela **menos a subárvore da `TenantContextBar`**, o mesmo recorte que o T3 faz por subárvore. Nada mais foi excluído.

**Ressalva do cache (R2-07), sem código:** quem já estava logado no app de demonstração continua vendo o nome antigo até sair ou tocar em "Tentar de novo", porque o `bootstrapSessionProvider` usa primeiro o `restoreCached()` e o codec guarda o `displayName` (`bootstrap_codec.dart` está no PROIBIDO). Vai para o apenso da `P-CHK-SEED-DEMO-SUJO` na F6.

| Comando | Exit | Saída resumida |
|---|---|---|
| `python f4.py` (substituição literal com contagem 1 por âncora) e `dart format` nos 16 arquivos | 0 | `2 changed` |
| `flutter analyze` (app inteiro) | 0 | `No issues found!` |
| `tr -cd '\010'` nos 16 arquivos | 0 | 0 caracteres de controle |
| `flutter test test/features/bsan319b_texto_exibido_test.dart` | 0 | `+8: All tests passed!`, `[T6] exibidos=771 violacoes=0 allowlist=2` |
| `flutter test` b091, b098, bo6r11, `core/evidence_sync_test.dart`, `expenses/expense_screens_test.dart` e `bsan319b_acesso_nao_permitido_test.dart` | 0 | `+89: All tests passed!` |
