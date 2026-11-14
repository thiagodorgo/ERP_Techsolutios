# B-MOBILE-GATE-CHAVE — as telas do app pedem a permissão que o servidor conhece (item 66 do portão)

- **Tipo:** feature
- **Fase:** Execution
- **Trilha:** mobile (Flutter) + backend/raiz (só exports e testes)
- **Data:** 2026-11-14
- **Branch:** `fix/mobile-gate-chave` (worktree `C:/Users/thiag/w-gate66`, a partir da `origin/main` `d2737339`)
- **Autor do comando:** `dev-66-cl` (Claude Opus 5.5, identidade de dev declarada, §C7 11(6)), por ordem do orquestrador.

## Papel desta execução e o motivo do só-Claude

- **Dev das fatias F0 a F3:** `dev-66-cl`, Claude Opus 5.5, nível menor declarado (§C7.6), identidade nova: não escreveu o
  plano v1, as emendas 1 e 2 nem a abertura (`plano-66-abre-fable`), e não é o revisor `rev-66-abre-cl`.
- **A prova com perfil real** (a parte da F0 e da F3 que só grava evidência, `perfil-real-{antes,depois}.md`, e o arnês do
  `platform_admin` da Emenda 2, E2.2) é de OUTRA identidade, `dev-66-perfil-cl`, em worktree próprio, ao mesmo tempo
  (opção do §7 da abertura).
- **Só-Claude, sem cruzamento entre casas — declarado (§C7 11(2)).** Ordem do dono de 13/11, por volta de 23:12 SP,
  literal: *"claude, agora eh so vc. faca um plano para vc atacar tudo sozinho, deixe as ias dormindo, vc vai pegar
  tudo, nas juntas cadeiras em paralelo, quero dar o maior gas agora, minhas decisoes vao todas nas recomendacoes."*; e a
  autorização, por volta de 23:20 SP: *"pode comecar"*. As IAs externas dormem; todo verificador é identidade Claude
  nova, e as regras (3) a (7) do §C7 11 valem iguais.

## Fontes (vale a mais nova)

1. `erp-pausa-2026-10-03/planos/plano-B-MOBILE-GATE-CHAVE-abertura.md` (`plano-66-abre-fable`, Fable): §3 a §7.
2. `plano-B-MOBILE-GATE-CHAVE-emenda2.md`, `plano-B-MOBILE-GATE-CHAVE-emenda1.md` e o plano v1 `plano-B-MOBILE-GATE-CHAVE.md`.
3. A revisão da abertura `revisoes/b-mobile-gate-chave/rev-66-abre-cl.json` (APROVADO COM AJUSTES): os achados REV66-01 a
   REV66-05 entram como requisito (abaixo).
4. As 3 respostas do dono de 13/11 (2.1 (a), 2.2 (a), 2.3 (a)), gravadas em `controle/decisoes.md`
   (`D-DONO-1311-RECOMENDACOES`, parte do app).

## Objetivo

Cada gate de tela e de botão do app decide com a mesma régua da rota do servidor (módulo "qualquer um", as chaves do
catálogo e o modo "qualquer uma"/"todas"), numa tabela única (`lib/core/permissions/mobile_gates.dart`). Nenhuma chave
inventada fica no app, nenhum papel passa além do que a rota libera, e um guard gerado do catálogo impede que o defeito
volte. **Fica de fora:** ligar o `ModuleResolver` à navegação, o replay de `inventory_entry.create`/`inventory_exit.create`
(é do `B-O6R-04b`), mudar o catálogo, o banco ou a CI.

## Decisões que este comando fixa (o plano deixou ao orquestrador)

- **A5 (guard nas telas Nova Entrada e Nova Saída) entra agora**, pela recomendação da abertura e pela regra do dono
  "minhas decisões vão todas nas recomendações" (13/11). O ramo "pendência ALTA com dono `B-O6R-04b`" fica sem efeito.
- **Texto das duas telas de movimento (REV66-02 (b)):** a recomendação da revisão, no padrão do 19b para tela de AÇÃO —
  título "Ação não permitida"; mensagem "Seu perfil não tem permissão para registrar entradas de estoque. Fale com o
  administrador da sua organização." (na Saída, "saídas de estoque").
- **REV66-01:** entram as mutações M19b (o VALOR de `MOBILE_INVENTORY_STOCK_ACTION_PERMISSION` vira `'work_orders:update'`:
  vermelhas a T4.1 E a RA1.5) e M19c (o VALOR de `MOBILE_INVENTORY_READ_PERMISSIONS` vira `['inventory.manage']`: vermelhas
  a T4.1 E o T2/G2). A RA1.5 lê a mesma matriz que vai para a fixture e nunca recalcula a decisão.
- **REV66-02:** (a) as duas telas entram em `_tituloPorArquivo` e `_gatePorTela` do `bsan319b`; (c) o T1 ganha +2 casos (o
  papel `inventory` com o módulo `inventory` desligado vê o bloqueio nas 2 telas), T1 = 66; (d) mutações M20b (tirar o
  guard da Saída) e M20c (trocar o guard da Entrada por `.has(..., 'inventory.manage')` literal, sem módulo).
- **REV66-03:** a T4.3 mede exatamente as 2 listas de demo (`permissions: const [...]` do `LocalDevAuthRepository` e
  `permissions: PermissionSet({...})` do `devBootstrapSession`); os `requiredPermissions`/`perms` de módulo passam só pela T4.2.
- **REV66-04:** (i) 15b × `bsan315_estoque_real_test.dart`: este bloco mexe só nas chaves e na sessão da montagem; o 15b
  só no T-A7 (`:469-475`); quem mergear depois re-roda o arquivo inteiro. (ii) 17 × `bsan319b_acesso_nao_permitido_test.dart`:
  o 17 precisa de 1 linha em `_tituloPorArquivo` se puser `PermissionBlockedState` na tela de consentimento; com o 66 antes,
  o 17 rebaseia e re-roda o `bsan319b` inteiro. (iii) **Re-medição no disparo (14/11 01:10 SP, `dev-66-cl`):**
  SEC-LOG v2 (`plano-B-SEC-LOG-SANITIZA-v2.md`, 00:49) toca em `mobile-inventory-sync.ts` e `mobile-checklist-sync.ts` só
  o logger e a expressão do ramo genérico de erro (`:395-410`), disjuntos das constantes e dos usos daqui; a 15b-abertura
  (00:22) lista o 66 em `bsan315_estoque_real_test.dart` com trechos disjuntos e põe `router.dart`, `home_screen.dart`,
  `mobile-inventory-sync.ts` e `checklist_available_screen.dart` no PROIBIDO dela (`:55-56`, `:34`); a 17-abertura (00:24)
  confirma o encontro textual em `home_screen.dart` (`:358`: "66 antes do 17"). A ordem segura do §4 da abertura vale.
- **REV66-05:** o payload do G3 no T2 é literal `{ item_id: 'inv-item-tow-cable', warehouse_id: 'mobile-warehouse-main',
  quantity: 1 }`, sem `tenant_id`.
- **Total de mutações:** as 35 da abertura (§5) + M19b, M19c, M20b e M20c da revisão = **39**, cada uma rodada como escrita
  e restaurada.

## Escopo PERMITIDO

O §5 do v1, com as emendas 1 e 2 e o §5 da abertura:

- `mobile/flutter_app/lib/core/permissions/mobile_gates.dart` (novo)
- `mobile/flutter_app/lib/features/checklists/ui/checklist_available_screen.dart` (G1, G1b)
- `mobile/flutter_app/lib/features/inventory/ui/inventory_list_screen.dart` (G2, G3)
- `mobile/flutter_app/lib/features/inventory/ui/stock_entry_screen.dart` e `stock_exit_screen.dart` (só o guard, A5)
- `mobile/flutter_app/lib/app/router.dart` (só `/approvals` e `/diagnostics`, nos dois roteadores)
- `mobile/flutter_app/lib/shared/ui/module_placeholder_screen.dart` (recebe a regra; estado "indisponível" do G5)
- `mobile/flutter_app/lib/shared/ui/home_screen.dart` (construtor, `canApprove` e as duas entradas de Diagnóstico)
- `mobile/flutter_app/lib/core/auth/auth_repository.dart` (só a lista de demo) e
  `mobile/flutter_app/lib/core/bootstrap/bootstrap_session.dart` (só `devBootstrapSession`)
- `mobile/flutter_app/lib/core/bootstrap/bootstrap_repository.dart` (só `_kNavigationModules`)
- `mobile/flutter_app/test/features/bmobile_gate_chave_test.dart` (novo) e `mobile/flutter_app/test/fixtures/mobile_gate_matrix.json` (novo, gerado)
- os 10 testes da E8 (só chaves e sessão; no `bsan319b`, também `_gatePorTela`, `_gatePorRota`, `_tituloPorArquivo`, o T1b, o
  T3 de `/diagnostics` e o T9), `test/features/b083_polish_test.dart` (só a montagem do teste 26) e
  `test/features/b113_home_approvals_banner_test.dart` (só a sessão do gestor)
- `tests/mobile-gate-chave-matriz.test.ts` e `tests/mobile-gate-chave-catalogo.test.ts` (novos)
- `src/modules/mobile/mobile-inventory-sync.ts` (só as 2 constantes da RA1.2, antes de `function assertAvailabilityActor`, e
  os usos em `:246` e `:349`) e `src/modules/mobile/mobile-checklist-sync.ts` (só o export de `MOBILE_CHECKLIST_ACTION_PERMISSIONS`)
- registro: este comando, `agent-orchestration/omega/evidencias/B-MOBILE-GATE-CHAVE/**` (menos os `perfil-real-*.md`, que
  são do `dev-66-perfil-cl`), `agent-orchestration/omega/juntas/J-*-B-MOBILE-GATE-CHAVE*` e `votos/**` da junta;
  `agent-orchestration/controle/decisoes.md` e `pendencias.md` (só acréscimo), `pendencias-indice.md` (só pelo gerador) e
  `docs/revisoes/SAN3/PLANO_SAN3.md` (só a linha do item 66)

## Escopo PROIBIDO

- `src/modules/core-saas/permissions/catalog.ts`, `prisma/**`, `migrations/**`, `.github/**`, `Kpis/**` (congelado),
  `frontend/**`, `infra/**`, `.env`, lockfiles JS, `pubspec.yaml`/`pubspec.lock`.
- Em `mobile-inventory-sync.ts`: `assertSyncActor`, o logger e o ramo de erro (`actionErrorResult`).
- Qualquer outra rota ou serviço de `src/**`; ligar o `ModuleResolver`; o replay de estoque.

## Bateria de validação (§4.6 do v1)

```bash
cd mobile/flutter_app
flutter pub get
dart format --output=none --set-exit-if-changed lib test
flutter analyze
flutter test test/features/bmobile_gate_chave_test.dart --reporter compact
# regressões: os 10 arquivos da E8, b083 e b113
flutter test --reporter compact
cd ../..
npm run check && npm run lint && npm test && npm run build
node --test --import tsx tests/mobile-gate-chave-matriz.test.ts tests/mobile-gate-chave-catalogo.test.ts
git diff --check
```

Na forma real (§C7 11(3)): o resumo TAP dos jobs do CI no head (`gh run view <run> --job <job> --log`, filtrado por
`not ok`, `# fail` e `# tests`) mostra os dois testes novos executados e o arquivo novo no job Flutter. KPI congelado.

## Estados obrigatórios (§7)

- [x] acesso não permitido (Checklists, Estoque, Nova Entrada, Nova Saída, Aprovações), em língua de negócio e com
  "Fale com o administrador da sua organização."
- [x] indisponível (Diagnóstico fora do modo de desenvolvimento), sem "acesso não permitido".

## Junta (§C7)

Junta completa (§6.2 da abertura): inspetor de terreno + 4 cadeiras em paralelo (C1 `coordenador-de-acessos`, C2a, C2b e
C3), unanimidade. Fluxo do §C7 10(3): pré-revisão (F4) → junta → triagem → um conserto → conferência → merge → porteiro.

## Definition of Done (§10)

- [ ] Escopo respeitado · [ ] bateria verde · [ ] permissão validada no backend (a régua do app é a da rota) ·
  [ ] sem termo técnico na UI · [ ] limpeza (§C5) · [ ] PR aberto · [ ] KPI congelado, intocado.

## Rastreabilidade (§C6)

- **ID:** B-MOBILE-GATE-CHAVE · **PR #:** preenchido após `gh pr create` · **Merge commit:** `null` → backfill ·
  **Approved head:** `null` → backfill · **Junta:** `agent-orchestration/omega/juntas/J-<n>-B-MOBILE-GATE-CHAVE.md` ·
  **Status:** `published_per_pr`.
- Diário do dev: `erp-pausa-2026-10-03/revisoes/b-mobile-gate-chave/dev-66-cl.md` (fora do repositório).
