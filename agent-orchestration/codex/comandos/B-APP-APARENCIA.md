# B-APP-APARENCIA — seletor de aparência por pessoa no app e as aparências B e C das 4 telas aprovadas

- **Tipo:** feature, em 5 fatias em série (F1, F2, F3a, F3b, F4), 1 fatia = 1 branch = 1 PR.
- **Fase:** Execution / Validation (A5).
- **Trilha:** mobile (Flutter, `mobile/flutter_app`).
- **Data:** 2026-11-15 (comando nasce na F1).
- **Autor:** `dev-aparapp-f1-cl` (Claude Opus 5.5, dev, identidade nova) a partir do plano do bloco.
- **Lei:** o plano `plano-B-APP-APARENCIA.md` e as Emendas 1, 2 e 3 (pasta de planos do orquestrador, fora do
  repositório); a emenda mais nova prevalece. Decisões do dono: `D-APARENCIA-POR-USUARIO`, `D-TELAS-SAEM-COM-TRES`,
  `D-TELAS-SEGUEM-O-PADRAO`, `D-PADRAO-BLOCOS-CLICAVEIS`, `D-DESIGN-SO-CLAUDE`, `D-APARENCIA-RESPOSTAS` (a)(b),
  `D-DONO-1511-TROCA-SENHA-SEGUE-ESCOLHA` (vale na F4), `D-GOV-PROPORCIONAL` (KPI congelado).

## Objetivo

O usuário do app escolhe, no Perfil, qual das 3 aparências aprovadas cada tela usa. A escolha é pessoal: fica no
aparelho, por pessoa e organização, e nada vai ao servidor. As 4 telas do app que hoje só têm a A passam a entregar a
B e a C, iguais às maquetes aprovadas. **Fica de fora:** sincronizar a escolha com o servidor (vem com a AWS,
`P-SAN3-12-PREFERENCIA-APARENCIA-NO-SERVIDOR`) e as telas do app sem maquete de 3 opções.

## Contexto / fontes de verdade

- Referências aprovadas (`docs/claude-code-handoff/screen-refs/`): `localizacao-consentimento-3opcoes`,
  `execucao-guincho-3opcoes`, `prestador-atendimento-3opcoes`, `troca-senha-3opcoes` (`.reference.html`).
- Padrão do web: `frontend/src/modules/appearance/` (registro, guarda, hook e menu).
- Tela-modelo de cada B e C: a A que já está no app, na mesma feature (§5).
- Skills: `flutter-expert`/`flutter-ai-architect` para implementar, `ui-ux-pro-max` para revisar.

## Contratos / Endpoints

Nenhum. Nenhuma rota, payload ou código de resposta novo; as 3 aparências de cada tela consomem o que a A já consome.

## Regras

- A escolha é por tela (chaves iguais às do web e às dos arquivos de referência). Padrão: A em todas.
- Chave no aparelho: `erp.aparencia.v1.<organização>.<pessoa>`, no armazenamento seguro do tema. Os identificadores
  só compõem a chave local; nenhum é renderizado (§2.8).
- O dono da escolha exige sessão autenticada, o `sub` e a organização ativa (Emenda 3, §3 (a)). Sem dono: a leitura é
  o padrão e a escrita devolve `false` sem gravar.
- "Carregando" só com sessão autenticada e o bootstrap carregando (Emenda 2, R2-1); a A como dado em todo o resto.
- A leitura do aparelho tem teto de 3 s, cancelado no descarte do provider (Emenda 3, §3 (b)): um keystore que não
  responde vale como um que recusa (R4).
- As vistas B e C só desenham: recebem valores e callbacks prontos (Emenda 1, A4). Guarda, em cada fatia (0 linhas):
  `git grep -nE 'floor[(]|ceil[(]|toLowerCase|isOffline|[.]length <|serverState ==|deliveryGateOpen =>|canConclude =>' -- ':(glob)mobile/flutter_app/lib/**/aparencias/**'`.
- Texto da UI em PT-BR de negócio, sem termo técnico (§3).

## Escopo PERMITIDO — F1 (o seletor e a localização)

- novos: `mobile/flutter_app/lib/core/appearance/{app_appearance,app_appearance_store,app_appearance_providers}.dart`;
- novos: `mobile/flutter_app/lib/features/location/ui/aparencias/{location_consent_view_b,location_consent_view_c,location_consent_aparencias_shared}.dart`;
- `mobile/flutter_app/lib/features/location/ui/location_consent_screen.dart`: só o despacho e a passagem de estado;
- `mobile/flutter_app/lib/features/location/ui/location_consent_home_card.dart`: só o despacho e os desenhos B e C;
- `mobile/flutter_app/lib/shared/ui/home_screen.dart`: só a posição do aviso de localização;
- `mobile/flutter_app/lib/shared/ui/profile_screen.dart`: a seção "Telas" e a linha "Localização" de Privacidade;
- `mobile/flutter_app/lib/shared/ui/mobile_kit.dart`: acréscimo no fim e os opcionais do `MobileStatTile`;
- testes novos: `test/core/appearance/bapp_aparencia_store_test.dart`, `test/features/appearance/bapp_aparencia_perfil_test.dart`,
  `test/features/location/bapp_aparencia_localizacao_test.dart`, `test/features/location/bapp_aparencia_localizacao_contexto_test.dart`,
  `test/shared/ui/bapp_kit_aparencias_test.dart`, `test/capturas/captura_helper.dart`, `test/capturas/bapp_capturas_f1_test.dart`;
- `COMPONENT_LIBRARY.md` (só as linhas novas do app); `agent-orchestration/codex/comandos/B-APP-APARENCIA.md`;
  `agent-orchestration/controle/pendencias.md` (apenso e pendências novas do bloco) e `pendencias-indice.md` (só
  regenerado pelo gerador).

**F2, F3a, F3b e F4:** o PERMITIDO de cada uma está no plano (§3.2), trocado pelas Emendas 1 (A1, A4, A7) e 2 (R2-4).
Cada fatia acrescenta aqui a sua seção ao nascer.

## Escopo PROIBIDO (todas as fatias)

- `mobile/flutter_app/pubspec.yaml` e `pubspec.lock`; lockfiles JS;
- `src/**`, `prisma/**`, `migrations/**`, `frontend/**`, `infra/**`, `.github/workflows/**`, `.env*`;
- `Kpis/**` (KPI congelado, `D-GOV-PROPORCIONAL` (5));
- `docs/claude-code-handoff/screen-refs/**`;
- `mobile/flutter_app/lib/core/{location,sync,theme,network,permissions}/**`, `lib/app/router.dart`, os `data/` e
  `domain/` das features; `lib/core/auth/**` e `lib/features/auth/**` nas F1 a F3b;
- **todo arquivo de teste que já existe** (a prova de que a A não mudou).

## Mutações literais da F1 (Emenda 1 A5, Emenda 2 R2-1, Emenda 3 §2 e §3)

Cada uma: âncora com contagem 1 no arquivo da mutação, aplicada sozinha, vista vermelha e desfeita byte a byte.

| # | Arquivo | Trocar | Por |
|---|---|---|---|
| M1.1 | `app_appearance_store.dart` | `erp.aparencia.v1.${owner.tenantId}.${owner.userId}` | `erp.aparencia.v1.${owner.tenantId}` |
| M1.2 | `app_appearance_store.dart` | `if (!_screenKeyPattern.hasMatch(screen)) continue;` | (linha apagada) |
| M1.3 | `app_appearance_store.dart` | `if (owner == null) return false;` | `if (owner == null) return true;` |
| M1.4 | `location_consent_screen.dart` | `AppAppearance.b => LocationConsentViewB(` | `AppAppearance.b => LocationConsentViewC(` |
| M1.5 | `location_consent_sync.dart` (só durante a mutação) | `status.serverState == LocationConsentServerState.registered;` | `true;` |
| M1.6 | `profile_screen.dart` | `.setScreen(screen.key, value)` | `.setScreen(screen.key, AppAppearance.a)` |
| M1.7 | `app_appearance.dart` | `... => AppAppearance.a;` (o padrão) | `... => AppAppearance.b;` |
| M1.8 | `app_appearance_providers.dart` | `return prefs.whenData((p) => resolveAppAppearance(p, screenKey));` | `return const AsyncValue.data(AppAppearance.b);` |
| M1.9 | `app_appearance_providers.dart` | a linha do "carregando" (R2-1) | (linha apagada) |
| M1.9b | `app_appearance_providers.dart` | `auth?.isAuthenticated == true && bootstrap.isLoading` | `bootstrap.isLoading` |
| M1.10 | `app_appearance_store.dart` | `_memory[key] = next;` | (linha apagada) |
| M1.11 | `profile_screen.dart` | `if (!saved) _showNotSavedSnackBar(context);` | (linha apagada) |
| M1.12 | `profile_screen.dart` | `_openScreen = _openScreen == screen.key ? null : screen.key;` | `_openScreen = screen.key;` |
| M1.13 | `location_consent_view_b.dart` | `children: [intro, statusBlocks, actions, usageList]` | `children: [intro, statusBlocks, usageList, actions]` |
| M1.14 | `location_consent_home_card.dart` | `AppAppearance.c => LocationConsentHomeBandC(` | `AppAppearance.c => LocationConsentHomeCardB(` |
| M-onDispose | `app_appearance_providers.dart` | `ref.onDispose(timer.cancel);` | (linha apagada) |

As mutações do dev (MD1 a MD11), que cobrem testes-dono que as do plano não derrubam, ficam no corpo do PR.

## Bateria de validação (§9, Flutter)

```bash
cd mobile/flutter_app
flutter pub get
# formato pela imagem do CI (a versão do Flutter do CI):
docker run --rm -v "$PWD:/app" -w /app ci-local-flutter:3.47.5 dart format --output=none --set-exit-if-changed lib test
flutter analyze
flutter test test/core/appearance test/features/appearance test/features/location test/shared/ui/bapp_kit_aparencias_test.dart --reporter compact
# os testes de hoje das telas e do Perfil, SEM edição (R2-1):
flutter test test/features/b091_connectivity_profile_test.dart test/features/busers_seg_troca_senha_test.dart test/features/location/b121_location_consent_test.dart test/features/location/bsan317_porta_consentimento_test.dart test/features/prestador/bsan315_estoque_opcao_a_test.dart test/features/prestador/bsan315_diagnostico_test.dart test/features/prestador/bsan315_portas_test.dart test/features/prestador/b119_prestador_flow_test.dart test/features/work_orders/bsan314_guincho_entrega_test.dart test/shared/ui/mobile_expandable_row_test.dart --reporter expanded
flutter test --reporter compact
cd ../..
git diff --diff-filter=M --name-only origin/main...HEAD -- mobile/flutter_app/test/   # 0 linhas
git diff --check
```

Capturas (fora do repositório, sob pedido): `ERP_CAPTURAS_DIR=<pasta> ERP_CAPTURAS_ICONES=<MaterialIcons-Regular.otf do SDK> flutter test test/capturas/bapp_capturas_f1_test.dart`.

## Estados obrigatórios (§7)

Os 14 da tabela da maquete da localização, iguais nas 3 aparências: sem decisão; confirme de novo; concedido e
registrado; concedido sem conexão; sem cadastro; falha ao registrar; revogado; revogado sem conexão; não permitido;
desatualizado; GPS desligado; carregando; acesso não permitido; acesso não permitido com consentimento. O vazio não se
aplica (a tela não lista dado).

## KPIs

Congelados (`D-GOV-PROPORCIONAL` (5)): nenhum PR deste bloco toca `Kpis/**`.

## Nível de revisão

F1, F2, F3a e F3b: sem gatilho na trava → revisão simples (1 revisor de outra casa, o Codex Sol quando houver
crédito) + CI + conferência visual do orquestrador (nunca Codex, Gemini, agy ou subagente). F4: junta completa (a
trava sobe `lib/features/auth/`).

## Definition of Done (§10)

- [ ] Escopo respeitado; nenhum teste de hoje editado.
- [ ] Bateria verde; CI das 2 rodadas lido pelo resumo de testes de cada job.
- [ ] Estados da maquete nas 3 aparências; a11y (48 px, rótulo); contraste AA nas peças novas.
- [ ] As 3 aparências aprovadas entregues (`D-TELAS-SAEM-COM-TRES`) e conferidas nas capturas.
- [ ] Componentes novos na biblioteca, com 1 linha cada em `COMPONENT_LIBRARY.md`.
- [ ] Temporários limpos (C5).

## Rastreabilidade (§C6)

- **ID:** B-APP-APARENCIA · **F1:** branch `feat/mobile-b-app-aparencia-1-seletor` · PR: (preencher) · merge: (pós-merge).
