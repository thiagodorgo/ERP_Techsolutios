# B-SAN3-19 — relatório do dev

- **Dev:** `dev-san319-opus`, Claude Opus 5.5. Não escreveu o plano.
- **Verificador:** Codex GPT-5.6 Sol (item 11). Houve cruzamento de modelo.
- **Plano:** `C:/Users/thiag/erp-pausa-2026-10-03/planos/B-SAN3-19-plano.md`.
- **Worktree:** `C:/Users/thiag/w-san319`, ramo `fix/mobile-faxina-termos`, base `origin/main` `5da03cac`.
- Gravado fatia por fatia (P1).

## Fatia 1 — medição do §1 (em `origin/main` `5da03cac`)

| Comando | Exit | Saída resumida |
|---|---|---|
| `git fetch -q origin && git rev-parse --short origin/main` | 0 | `5da03cac` |
| `grep -n label android/app/src/main/AndroidManifest.xml` | 0 | `6: android:label="flutter_app"` — T1 confirmado |
| `grep -n -A1 -E 'CFBundleDisplayName\|CFBundleName' ios/Runner/Info.plist` | 0 | `CFBundleDisplayName` = `Flutter App` (l.10); `CFBundleName` = `flutter_app` (l.18). O iOS também diz o nome do template: entra no escopo (§2) |
| `grep -rn tenantRole lib` (só exibição) | 0 | `erp_components.dart:21`, `home_screen.dart:153`, `home_screen.dart:411` (`_UserCard`, usado na l.171) com o papel cru; `profile_screen.dart:59` já usa `_rolePtLabel`. T2/T3 confirmados nas linhas do plano |
| `sed -n 253,263p tenant_selector_screen.dart` e `sed -n 234,244p profile_screen.dart` | 0 | as duas cópias do mapa são **idênticas entre si** (6 papéis + fallback `Membro`) |
| `grep -rln 'TenantContextBar(' lib` | 0 | 6 arquivos: diagnostics, expense_list, work_order_detail, work_order_operational_map, module_placeholder e a própria definição |

### Conferência das duas cópias × tabela do §3.1 do plano

As duas cópias batem entre si, rótulo por rótulo. A tabela do plano difere delas em um rótulo e no fallback:

| Chave | Cópias (tenant_selector, profile) | Tabela do plano | Web (`frontend/src/modules/auth/auth.adapter.ts:230`) | Usado |
|---|---|---|---|---|
| `manager` | **Gestor Operacional** | **Gestor** | Gestor Operacional | **Gestor Operacional** |
| desconhecida | Membro | Usuário (decisão explícita do §3.1) | — (`null`) | Usuário |
| `field_technician`, `field_dispatcher`, `tenant_admin`, `finance`, `auditor` | iguais à tabela | — | — | iguais |
| `platform_admin`, `operator`, `inventory`, `support` | ausentes (caíam em `Membro`) | Admin Plataforma, Operação, Estoque, Suporte | — | os da tabela |

**Divergência registrada, não consolidada em silêncio (§A2).** A condição de parada do mandato ("um rótulo nas duas cópias divergir") não se cumpre: as duas cópias são iguais. A diferença é entre as cópias e a tabela do plano, em `manager`. O §3.1 diz "o mapa vem das duas cópias que já existem", e a web, a fonte vizinha, também usa "Gestor Operacional". Mantive **"Gestor Operacional"**, para que o perfil e o seletor de organização não mudem de rótulo sem decisão. O revisor ou o orquestrador corrigem numa linha (`role_labels.dart`) se o certo for "Gestor".

Rótulos declarados pelo dev (o §3.1 manda declarar): `field_dispatcher` → **Operação de Campo** (o das cópias e do §3 do contrato); `tenant_member` → **Membro** (o fallback antigo das cópias, que é o rótulo do papel genérico do `auth_repository.dart:283`). Chaves que o backend conhece e o mapa fechado não traz (`super_admin`, `technician`, `viewer`) caem em **Usuário**: nunca aparecem cruas. Fica como nota para o revisor.

### Conferência do #483 (§3.4)

| Comando | Exit | Saída resumida |
|---|---|---|
| `grep -rn -i "integração remota\|ainda não ativa\|nao ativa" lib` | 0 | só `sync_screen.dart:397` "Envio de despesas ainda não ativado" — o aviso novo do #483, não o falso |
| `grep -n "_BackendPendingNotice()" -B4 lib/shared/ui/sync_screen.dart` | 0 | renderizado só sob `if (channelOff)` (l.153): condicional. Nada sobrou |
| `grep -n "tenantRole" lib/shared/ui/module_placeholder_screen.dart` | 1 | nada; a tela usa a `TenantContextBar`, que este bloco conserta |

Sem sobra do #483: o bloco segue.

## Fatia 2 — testes do §4 e vermelho-controle (código de `origin/main` `5da03cac`, só os testes novos)

| Comando (em `mobile/flutter_app`) | Exit | Saída resumida |
|---|---|---|
| `flutter pub get` | 0 | dependências resolvidas, nada mudou no `pubspec.lock` |
| `dart format test/features/bsan319_*_test.dart` | 0 | 3 arquivos, 1 reformatado |
| `flutter test test/features/bsan319_role_label_test.dart --reporter compact` | 1 | **vermelho**: compilação falha, `lib/core/auth/role_labels.dart` não existe, `Method not found: 'roleLabel'` |
| `flutter test test/features/bsan319_sem_papel_cru_test.dart --reporter compact` | 1 | **vermelho 0/3**: home não acha `Técnico de Campo · Guinchos Brasil`; a barra não acha `Técnico de Campo · tecnico@tenant.demo` nem `Gestor Operacional · gestor@guinchos.example` |
| `flutter test test/features/bsan319_nome_do_app_test.dart --reporter compact` | 1 | **vermelho 0/2**: Android sem `android:label="ERP Techsolutions"`; iOS `CFBundleDisplayName` = `Flutter App` |

Testes: `bsan319_role_label_test.dart` (11 chaves do mapa, caixa/espaço, 6 chaves fora do mapa incluindo `''` e `'   '`), `bsan319_sem_papel_cru_test.dart` (home, barra com `field_technician`, barra com `manager`), `bsan319_nome_do_app_test.dart` (Android e iOS). O teste do iOS é acréscimo do dev, porque o `Info.plist` foi medido com o nome do template.

## Fatia 3 — conserto do §3

- `lib/core/auth/role_labels.dart` (novo): `roleLabel(String key)`, mapa fechado de 11 chaves (tabela da fatia 1), `trim().toLowerCase()` como as cópias faziam, fallback `Usuário`.
- `home_screen.dart:154` e `:412`, `erp_components.dart:22` (`TenantContextBar`): `roleLabel(session.user.tenantRole)`.
- `tenant_selector_screen.dart:221`: `roleLabel(widget.tenant.userRole ?? '')` (o campo é anulável; nulo vira `Usuário`). A cópia `_rolePtLabel` saiu.
- `profile_screen.dart:60`: `roleLabel(session.user.tenantRole)`; a variável local virou `rotuloDoPapel` para não sombrear a função. A cópia `_rolePtLabel` saiu.
- `AndroidManifest.xml:6`: `android:label="ERP Techsolutions"`. `Info.plist:10,18`: `CFBundleDisplayName` e `CFBundleName` = `ERP Techsolutions`.
- Nenhum valor de papel enviado ou comparado mudou: só as 5 expressões de texto exibido.
- Nota para o revisor: `CFBundleName` tem 17 caracteres; a Apple recomenda até 15 para esse campo (o nome exibido sob o ícone é o `CFBundleDisplayName`). Não bloqueia build; fica registrado.

| Comando (em `mobile/flutter_app`) | Exit | Saída resumida |
|---|---|---|
| `grep -rn _rolePtLabel lib` | 1 | nenhuma cópia sobrou |
| `dart format lib/core/auth/role_labels.dart lib/shared/ui lib/features/auth` | 0 | 12 arquivos, 1 reformatado (`erp_components.dart`) |
| `flutter test test/features/bsan319_{role_label,sem_papel_cru,nome_do_app}_test.dart --reporter compact` | 0 | `+23: All tests passed!` (18 + 3 + 2) |

## Fatia 4 — mutações M1 a M4 (uma de cada vez, `sed -i` sobre cópia guardada, restauradas com md5 conferido)

| Mutação | Arquivo e troca | Teste | Exit | Saída | Restauro |
|---|---|---|---|---|---|
| M1 | `home_screen.dart:154`, `${roleLabel(session.user.tenantRole)}` → `${session.user.tenantRole}` | `bsan319_sem_papel_cru_test.dart` | 1 | `+2 -1: Some tests failed.` (home) | md5 igual |
| M2 | `erp_components.dart:22`, o mesmo na `TenantContextBar` | `bsan319_sem_papel_cru_test.dart` | 1 | `+1 -2: Some tests failed.` (as duas da barra) | md5 igual |
| M3 | `role_labels.dart`, `?? _rotuloDesconhecido` → `?? key` | `bsan319_role_label_test.dart` | 1 | `+12 -6: Some tests failed.` (as 6 chaves fora do mapa) | md5 igual |
| M4 | `AndroidManifest.xml:6`, `android:label="flutter_app"` | `bsan319_nome_do_app_test.dart` | 1 | `+1 -1: Some tests failed.` (Android) | md5 igual |

As quatro vermelhas. `git status --short` depois das quatro: só os arquivos do conserto e os novos, nenhum resto.

## Fatia 5 — bateria do §5

| Comando | Exit | Saída resumida |
|---|---|---|
| `flutter pub get` | 0 | resolvido (fatia 2) |
| `dart format --output=none --set-exit-if-changed lib test` | **1** | `219 files (1 changed)`: o único é `test/features/bsan313_minhas_os_escopo_test.dart`, que este bloco **não toca** (último commit `d6399294`, #460). Pré-existente, de versão: o Flutter local é 3.41.6 e o CI fixa 3.47.5 (`ci.yml:489`). O CI é o juiz |
| `dart format --output=none --set-exit-if-changed <os 15 arquivos do bloco>` | 0 | `0 changed` |
| `flutter analyze` | 0 | `No issues found!` |
| `flutter test test/features/bsan319_*_test.dart --reporter compact` | 0 | `+23: All tests passed!` |
| Regressões: `flutter test b091_connectivity_profile b084_home_stats b113_home_approvals_banner bsan313_home_lista_e1` | 0 | `+34: All tests passed!`. Nenhuma expectativa precisou mudar: o `b091` (perfil) já esperava `Técnico de Campo` e nenhum teste procurava o papel cru na home |
| `flutter test --reporter compact` (suíte inteira) | 0 | `+997: All tests passed!`, 0 skip |
| `git diff --check` (raiz) | 0 | limpo |

"Tenant Demo" não aparece em nenhuma expectativa da home; o do perfil (`b091` t08) vem do `bootstrap_session.dart`, fora do escopo (item 47).

## Pendências propostas (não feitas)

- "Tenant Demo" do modo offline em `bootstrap_session.dart` (item 47).
- Títulos sem acento no app (`Aprovacoes`, `Diagnostico`…), em bloco próprio de acentuação do mobile.
- Decisão de rótulo de `manager`: "Gestor Operacional" (cópias e web, usado aqui) × "Gestor" (tabela do plano).
- Papéis do backend fora do mapa fechado (`super_admin`, `technician`, `viewer`) aparecem como "Usuário".
- Formatação de `bsan313_minhas_os_escopo_test.dart` sob o Flutter local 3.41.6 (sem efeito no CI, que fixa 3.47.5).
