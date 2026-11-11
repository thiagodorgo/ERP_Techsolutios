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
- F5 — README, piso N0 e mutações: FEITA (07:56)
- F6 — registro e limpeza: FEITA (registro); limpeza no fim, depois do PR

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

## F5 — README, piso N0 e mutações (07:48–07:56 SP)

- `mobile/flutter_app/README.md` reescrito em português: o produto (ERP Techsolutions, app de campo), como rodar, a tabela das 4 chaves `--dart-define` que o app lê (`ERP_AUTH_MODE`, `ERP_ENV`, `API_BASE_URL`, `ERP_APP_VERSION`, com o padrão e o efeito tirados de `app_config.dart` e `http_client.dart`) e os comandos de teste. T5: `+1: All tests passed!`, `[T5] chaves=API_BASE_URL,ERP_APP_VERSION,ERP_AUTH_MODE,ERP_ENV`.
- **Piso N0 = 771**, gravado como literal no T6 (`const _pisoN0 = 771;`): a contagem medida com o código consertado (`[T6] exibidos=771 violacoes=0 allowlist=2`). 771 ≥ 500: o parser não está perdendo âncoras (a sonda do plano mediu 611 em `d0da291e` com âncoras mais estreitas; a crítica r2, 602).

**Âncoras medidas depois do `dart format` (R2-04)** com `grep -cF` (o método do plano) e, onde a forma de uma linha casa mais de uma vez, ancoradas no início da linha:

| Mutação | Âncora | `grep -cF` | Âncora usada (contagem 1) |
|---|---|---|---|
| M3 | `assert(!_kChaveTecnica.hasMatch(` | 1 | a `assert` é de uma linha, sem mensagem: apagar a linha compila |
| M8 | `          title: 'Aprovações',` | 1 | a mesma, com `\n` dos dois lados |
| M9, M22 | `          blockedMessage:` (10 espaços) | **3** | `^          blockedMessage: 'Esta área ainda não está disponível no aplicativo.',$` = 1 (só a produção do `/approvals`) |
| M17 | `displayName: 'Organização Demonstração',` | **2** | o bloco `  activeTenant: TenantContext(` … `  ),` = 1 (`^    displayName: …` com 4 espaços também dá 1) |
| M18 | `devBootstrapSession.availableTenants.where(` | 1 | a linha inteira `    demo.addAll(…where(mesmoId));` |
| M4, M5, M12, M15, M19, M20, M25 | as do plano/crítica | 1 cada | as mesmas |

**Mutações (cada uma aplicada por `python mut.py <id>`, que exige contagem 1 de cada âncora, roda o teste dono e restaura o arquivo pelo conteúdo original; sha de antes = sha de depois em todas).** Rodada inteira 07:52:05–07:55:46. Saída completa no scratchpad do dev (`mut-saida.txt`).

| Mutação | Arquivo | O que faz | Teste dono | Resultado |
|---|---|---|---|---|
| M1 | `new_work_order_screen.dart` | mensagem volta a `work_orders:create necessario…` | T1 | **vermelho** `+0 -1` |
| M2 | o próprio teste | `_scanRoot = 'lib'` → `'lib/shared'` | T1-alcance | **vermelho** (`achadas=1 referencia=10`) |
| M3 | `erp_components.dart` | apaga a linha da `assert` | T2 | **vermelho** |
| M4 | `module_placeholder_screen.dart` | `message: blockedMessage,` → a mensagem antiga com a chave | T3 | **vermelho** `-3` (a `assert` dispara nas 3) |
| M5 | `module_placeholder_screen.dart` | `final hasPermission = true;` | T4 | **vermelho** |
| M6 | `README.md` | volta `A new Flutter project.` | T5 | **vermelho** |
| M7 | `README.md` | apaga as 2 linhas com `API_BASE_URL` | T5 | **vermelho** |
| M8 | `router.dart` (produção) | `title: 'Aprovacoes'` | T1b | **vermelho** (acento e paridade) |
| M9 | `router.dart` (produção) | `blockedMessage: 'Permissao workflow:request nao retornou no bootstrap.'` | T1b | **vermelho** |
| M10 | `expense_report_detail_screen.dart` | mensagem volta a `Manager/finance … backend workflow …` | T6 | **vermelho** (`violacoes=1`) |
| M11 | `new_expense_report_screen.dart` | subtítulo volta a `… acao expense_report.create …` (chave com ponto) | T6 | **vermelho** (`violacoes=1`) |
| M12 | `expense_item_receipts_screen.dart` | `=> 'Placeholder',` (braço de função de rótulo) | T6 | **vermelho** (`violacoes=1`) |
| M13 | o próprio teste | a alternância de âncoras vira só `'title'` | T6 | **vermelho** (`exibidos=522` < 771) |
| M15 | `sync_engine.dart` | `decisao manual` | T7 | **vermelho** |
| M16 | `api_error.dart` | acrescenta `' Serao sincronizados.'` | T7 | **vermelho** |
| M17 | `bootstrap_session.dart` | `activeTenant` volta a `Tenant Demo` | T8 (i) | **vermelho** |
| M18 | `bootstrap_repository.dart` | apaga a linha da busca em `devBootstrapSession.availableTenants` | T8 (ii) | **vermelho** |
| M19 | `erp_components.dart` | chip volta a `Preparacao` | T3 | **vermelho** (só o caso com permissão) |
| M20 | `expense_list_screen.dart` | título `Acesso não permitido` em vez de `Ação não permitida` | T1 | **vermelho** (tabela de títulos) |
| M21 | `inventory_list_screen.dart` | acrescenta F_ADM (chave fora do catálogo) | T9 | **vermelho** |
| M22 | `router.dart` (produção) | `blockedMessage` do `/approvals` + F_ADM | T9 | **vermelho** |
| M23 | `expense_models.dart` | `Aprovado pelo gestor` → `Aprovado manager` (Emenda 1, R2-01) | T6, T6b | **vermelho** `-2` (T6 `violacoes=1` e o T6b da lista de demonstração) |
| M24 | `expense_list_screen.dart` | a frase do vazio volta a ter `fila local-first` (R2-01) | T6, T6b | **vermelho** `-2` (T6 e o T6b da lista vazia) |
| M25 | `sync_screen.dart` | `label: 'Sincronizados · Integração remota ainda não ativa',` (o mutante da R2-03, acentuado) | `bo6r11` w3 | **vermelho** `-2` (w3 e w3') |
| M26 | `module_placeholder_screen.dart` | o banner volta ao lado do cartão (com o import) (R2-05) | T3 | **vermelho** (o caso com permissão: `find.byType(SyncStatusBanner)` na tela inteira) |
| M27 | `erp_components.dart` | o banner de política volta a `'- ${violation.message} (${violation.code})'` (Emenda 1, item 2) | T6b | **vermelho** |
| M28 | `expense_policy_evaluator.dart` | a mensagem volta ao inglês `Expense item exceeds the category limit` (Emenda 1, item 2) | T6b | **vermelho** |

**Numeração, declarada:** o plano define M1–M13 e M15–M22 (não há M14). M23–M26 são as da crítica r2 (Emenda 1). **M27 e M28 são minhas**, para a "mais uma mutação" que a Emenda 1 (item 2, saída (a) da R2-02) pede no banner de política: uma prova o código cru, a outra o inglês.

**Grep da trava do §5** sobre `git diff origin/main...HEAD -U0 -- mobile/flutter_app/lib` (07:54): **2 linhas**, as duas exceções nomeadas:
- `-                  'Permissao $requiredPermission nao retornou no bootstrap. O backend continua sendo autoridade final.',` — texto removido (casa `requiredPermission` por estar dentro da interpolação);
- `+    if (demo.isNotEmpty) return demo.first.displayName;` — o resolvedor de nome local de `bootstrap_repository.dart` (exceção declarada pela Emenda 1, item 4 / R2-06): só decide o `displayName`; `tenantId` e `permissions` não passam por ele.

## Bateria final (§6 do plano; 07:56:55–07:58:20 SP; head `f2639513`)

| Comando (em `mobile/flutter_app`) | Exit | Saída resumida |
|---|---|---|
| `flutter pub get` | 0 | ok |
| `dart format --output=none --set-exit-if-changed` nos 33 arquivos de `lib`/`test` tocados (`git diff --name-only origin/main...HEAD -- lib test`) | 0 | `Formatted 33 files (0 changed)` |
| `flutter analyze` | 0 | `No issues found!` |
| `flutter test` dos 3 `bsan319b_*` | 0 | **`+18: All tests passed!`** (`[T1] chamadas=10`, `[T1-alcance] achadas=10 referencia=10`, `[T1b] chamadas=4`, `[T6] exibidos=771 violacoes=0 allowlist=2`, `[T5] chaves=API_BASE_URL,ERP_APP_VERSION,ERP_AUTH_MODE,ERP_ENV`) |
| regressões da §3.2 (os 3 `bsan319_*`, b083, b085, b086, `work_orders/work_order_test.dart`, b091, b098, bo6r11, `core/evidence_sync_test.dart`) | 0 | **`+178: All tests passed!`** |
| `flutter test --reporter compact` (suíte inteira) | 0 | **`00:41 +1118: All tests passed!`** (0 `[E]`, 0 pulados) |
| `git diff --check origin/main...HEAD` (na raiz) | 0 | vazio |

- **Contagem:** +1118 no head, dos quais 18 são os testes novos deste bloco. A base `a0979f51` não foi medida inteira por mim; a crítica r2 mediu `+1100` em `07898adf` com o conserto simulado, o que é coerente com 1118 − 18 (derivado, não medido).
- **Format, declarado (CRIT19B-07(a)):** o `format` foi rodado só nos arquivos tocados, como o plano manda; o do repositório inteiro falha no Flutter local 3.41.6 por `bsan313_minhas_os_escopo_test.dart`, anterior ao bloco. O juiz é o job `flutter` do CI (3.47.5).

## F6 — registro (07:58–07:59 SP)

- `agent-orchestration/controle/pendencias.md`:
  - **fechadas:** `P-SAN3-19-PLACEHOLDER-CHAVE-CRUA`, `P-O6R11-TEXTOS-FORA-DE-D-T`, `P-MOBILE-FAXINA-TERMOS-TECNICOS` (cada uma com a linha `status: FECHADA (2026-11-11, B-SAN3-19b, …)`, o `status anterior` e um parágrafo de fechamento com teste e mutação);
  - **apensos:** `P-CHK-SEED-DEMO-SUJO` (a instância do app fechou; a ressalva do bootstrap em cache, R2-07; o e-mail de demonstração como observação) e `P-MOBILE-TITULOS-SEM-ACENTO` (os exemplos da §2.3, medidos);
  - **aberta:** `P-MOBILE-GATE-CHAVE-FORA-DO-CATALOGO` (ALTA, `pre-existente`; N = 4 gates de tela + 1 gate de botão `inventory:write` + 3 chaves sem efeito, R2-08; forma; causa; dono pela Pergunta 2).
- `docs/revisoes/SAN3/PLANO_SAN3.md`, linhas dos itens 47 e 48: só a nota do resíduo do app.
- `agent-orchestration/codex/comandos/B-SAN3-19b-placeholder-e-readme.md`: o comando do bloco.
- **Conferência do classificador do índice, sem gravar o índice:** rodei `gerar-indice-pendencias.py` sobre uma **cópia** do `pendencias.md` no scratchpad: `{'FECHADA': 196, 'ABERTA': 627, 'SEM-STATUS': 4}`; as 3 fechadas caem em FECHADAS, a nova em ABERTAS balde A, nenhuma contraditória. O `pendencias-indice.md` do repositório **não** foi regenerado: está fora do PERMITIDO do §4 (o próprio índice diz que, se divergir, vale o `pendencias.md`). Pergunta abaixo.

## Desvios e perguntas ao orquestrador

1. **Guardas por árvore sintática** (`package:analyzer`, dependência transitiva, precedente `bo6r11_guard_fila_await_ast_test.dart`), e não por balanceador de parênteses à mão. Mesmo arquivo, mesmo critério; declarado na F0.
2. **T6b**, teste de widget novo dentro de `bsan319b_texto_exibido_test.dart` (arquivo do PERMITIDO), que a Emenda 1 pede (itens 1 e 2). Ele recorta a subárvore da `TenantContextBar` por causa do e-mail de demonstração (fora do escopo, §2.5).
3. **M27 e M28** são mutações minhas para o banner de política (a Emenda 1 pede "mais uma mutação"); não há M14 no plano.
4. **Resíduo de classe da R2-02 (2), sem dono:** 4 `SnackBar` mostram `$e` cru (`work_order_execute_screen.dart:144`, `checklist_run_screen.dart:126`, `checklist_acknowledgement_screen.dart:65`, `new_work_order_screen.dart:223`). A Emenda 1 escolheu a saída (a) só para o banner; esses arquivos/linhas estão fora do PERMITIDO e **não foram tocados**. Registrei o resíduo no fechamento da `P-MOBILE-FAXINA-TERMOS-TECNICOS`. **Pergunta:** abrir `P-MOBILE-TEXTO-TECNICO-INTERPOLADO` (N = 4) com dono, ou outro destino? Não abri por conta própria.
5. **`pendencias-indice.md`** não regenerado (fora do PERMITIDO). **Pergunta:** regenerar no PR semanal de registro ou neste PR, por emenda?
6. **`'Camera'` → `'Câmera'`** em `_captureLabel`: permitido pelo plano, não exigido; feito. O outro `'Camera'` (`evidence_picker.dart:89`) ficou para a `P-MOBILE-TITULOS-SEM-ACENTO`.
7. **`TODO-DONO` (Pergunta 1 = A):** as 4 mensagens de Checklists, Estoque, `/approvals` e `/diagnostics`. Se o dono responder B ou C, o orquestrador escreve a emenda.

## Leitura do CI do head `ccdc9978` (PR #540; 08:03–08:19 SP)

- Job `flutter`, nos dois gatilhos (push: run `43008192758`, job `130480877738`; pull_request: run `43008231670`, job `130481011991`), resumo lido no log pela API (`gh api repos/thiagodorgo/ERP_Techsolutios/actions/jobs/<job>/logs`), não pela cor (§C7 item 11(3)): `+1118: All tests passed!`, `Formatted 246 files (0 changed)` (no 3.47.5 o `format` do repositório inteiro passa), `No issues found!`, `stable-3.47.5`. As guardas do bloco rodaram no CI: `[T1] chamadas=10`, `[T1-alcance] achadas=10 referencia=10`, `[T1b] chamadas=4`, `[T5] chaves=API_BASE_URL,ERP_APP_VERSION,ERP_AUTH_MODE,ERP_ENV`, `[T6] exibidos=771 violacoes=0 allowlist=2`.
- `gh pr checks 540` às 08:19: **16/16 `pass`** (antivirus, authority-portal, backend, backend-postgres, docker, flutter, frontend, owner-portal, nos dois gatilhos).
- Limpeza (08:04): `mobile/flutter_app/build/` (82 MB) e `.dart_tool/` (24 MB) removidos do worktree. O kit de mutações, para o verificador, ficou em `C:/Users/thiag/erp-pausa-2026-10-03/revisoes/dev-19b-mutacoes/` (fora do repositório).

## Emenda 2 do plano (orquestrador, 11/11 08:20 SP) e este commit (08:21–08:25 SP)

A Emenda 2 (`plano-B-SAN3-19b-v2.md`, no fim) respondeu às perguntas 4, 5 e 7 da F6:
1. **(5)** O PERMITIDO ganha `agent-orchestration/controle/pendencias-indice.md`, **só** para a regeneração pelo gerador.
2. **(4)** Os 4 `SnackBar` com `$e` cru ficam **fora** deste bloco. Viram a `P-MOBILE-TEXTO-TECNICO-INTERPOLADO`, que o PR de registro do orquestrador registra; este bloco **não** a cria.
3. **(7)** A leitura do CI e a emenda entram neste diário, sem mudar código nem teste.

| Comando | Exit | Saída resumida |
|---|---|---|
| `git fetch origin && git merge --no-ff --no-commit origin/main` (`2f8a9a5e`, #538) | 1 | conflito só em `agent-orchestration/controle/pendencias.md` (as duas pontas acrescentaram entradas no fim) |
| resolução | 0 | mantidas as duas: as entradas novas da `main` (826 → 856 cabeçalhos `## P-`) e, depois delas, a `P-MOBILE-GATE-CHAVE-FORA-DO-CATALOGO` (857 no ramo); 0 marcadores; commit `2a0c621b` |
| `git diff --stat ccdc9978 HEAD -- mobile` | 0 | vazio: o merge não mexe em código nem teste do app |
| `python agent-orchestration/controle/gerar-indice-pendencias.py` | 0 | `857 cabecalhos / 846 IDs`, `{'FECHADA': 199, 'ABERTA': 654, 'SEM-STATUS': 4}`; ABERTAS 656 → 654 (+1 aberta, −3 fechadas) |
| rodar o gerador de novo e comparar (`cmp`) | 0 | sem diff (o versionado é igual ao gerado); 0 `CR` antes e depois |

Observação, sem ação: a entrada `P-J535-C3-02-ITEM47-STATUS-X-RESIDUO`, vinda da `main`, cita uma `P-SAN3-07-APP-NOME-TECNICO-OFFLINE` como destino da instância offline do item 47. Essa pendência não tem cabeçalho próprio no `pendencias.md` da `main` de agora (`grep -c '^## P-SAN3-07-APP-NOME-TECNICO-OFFLINE'` = 0). É a mesma instância que este bloco fecha (apenso da `P-CHK-SEED-DEMO-SUJO`). Quem reconcilia é o registro do orquestrador.

## Conserto da pré-revisão `prerev-540-cl` (Emenda 3 do plano; 08:51–09:08 SP)

A pré-revisão (`revisoes/prerev-540.json`, APROVADO com 7 não graves) foi feita por Claude Opus 5.5, sem cruzamento (§C7 item 11(2), declarado lá). A Emenda 3 (orquestrador, 08:51) autoriza os consertos PR540-01, 02, 03, 04 e 07. O 05 (`P-MOBILE-IDENTIFICADOR-CRU-NA-TELA`) e o 06 (`P-SAN3-08-LIMPEZA-VARRE-TABELAS-ALHEIAS`) são do orquestrador; não foram criados aqui. Quem conserta (eu, o dev) não achou: os achados são do revisor (§C7.4-bis).

| Achado | Conserto | Teste / mutação |
|---|---|---|
| **PR540-01** | `expense_report_detail_screen.dart`: o `ApprovalDecisionCard` "ainda não disponível" só aparece se `report.status == ExpenseReportStatus.submitted \|\| report.status == ExpenseReportStatus.underReview`, os dois status do grupo "Enviados" do app (`expense_list_screen.dart`, `_PcGroup.submitted`). Fora disso, o cartão some. É condição de **status**, não de permissão | **T6c** (novo, em `bsan319b_texto_exibido_test.dart`): prestação `submitted` mostra o cartão; `approvedManager` mostra "Aprovado pelo gestor" e **não** mostra o cartão. **M29** (apagar as 2 linhas do `if`) → T6c **vermelho** |
| **PR540-02** | `new_expense_report_screen.dart`: "…fica neste aparelho e entra na fila de envio. Acompanhe o envio em Sincronizar." (a ação entra na fila e fica listada em Sincronizar, também depois de enviada) | M11 com a âncora nova → T6 vermelho |
| **PR540-03** | `erp_components.dart`, o `_violationLabel` **novo** do banner: `Recibo obrigatório`, `Violação de política`. O mapa do detalhe fica com a `P-MOBILE-TITULOS-SEM-ACENTO` (apenso ajustado) | T6b verde; M27 vermelha |
| **PR540-04** | T6: `errorText` e `text` (o `text:` de `TextSpan`) entram na alternância de âncoras. Medido: `exibidos=779 violacoes=0 allowlist=2` (antes 771); **piso N0 = 779**. Na `pendencias.md`, o status da `P-MOBILE-FAXINA-TERMOS-TECNICOS` diz o que a guarda cobre ("a guarda de fonte dos literais nas âncoras de exibição do app (T6) em 0; texto montado só por interpolação fica fora dela") e o fechamento cita as âncoras novas e o 779 | **MP2** (`TextSpan(text: 'Você tem acesso a cada tenant: ')`) e **MP3** (`errorText: 'payload rejeitado pelo endpoint'`), as 2 sondas do revisor que sobreviviam → agora **vermelhas** (`violacoes=1`) |
| **PR540-07** | `P-MOBILE-GATE-CHAVE-FORA-DO-CATALOGO`: **dono provisório** = um bloco próprio de permissão do app, com junta completa e `coordenador-de-acessos`, até a resposta do dono à Pergunta 2. Fechamento da `P-MOBILE-FAXINA`: a pergunta sobre os 4 `SnackBar` sai; fica a destinação da Emenda 2 (`P-MOBILE-TEXTO-TECNICO-INTERPOLADO`, do orquestrador) e a da Emenda 3 para o dado cru interpolado (`P-MOBILE-IDENTIFICADOR-CRU-NA-TELA`, do orquestrador) | — |

**Grep da trava do §5:** passa a ter 3 linhas, as 2 já declaradas mais a nova condição de status do PR540-01 (`+              if (report.status == ExpenseReportStatus.submitted ||`), exceção declarada pela Emenda 3, item 1.

**Rodada completa de mutações (09:00:39–09:06:10):** `python mut.py` M1–M13, M15–M29, MP2 e MP3 = **30 de 30 vermelhas**, todas restauradas (sha igual), 0 abortadas. M23 agora fica vermelha em 3 testes (T6, T6b e o T6c, que espera "Aprovado pelo gestor"). Kit atualizado em `C:/Users/thiag/erp-pausa-2026-10-03/revisoes/dev-19b-mutacoes/` (`mutacoes.json`, `mut3-saida.txt`).

| Comando | Exit | Saída resumida |
|---|---|---|
| `python conserto.py` + `t6c.py` (substituição literal com contagem 1) e `dart format` nos 4 arquivos | 0 | `0 changed` depois do `flutter pub get` |
| `flutter analyze` | 0 | `No issues found!` |
| `flutter test test/features/bsan319b_texto_exibido_test.dart` | 0 | `+9: All tests passed!`, `[T6] exibidos=779 violacoes=0 allowlist=2` |
| commit do código | 0 | `616b1ff8` |
