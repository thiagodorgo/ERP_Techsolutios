# B-O6R-11 — Plano de resolução (ciclo 3, corte mínimo): perda de dado no app de campo

> **Papel:** `planejador-o6r11-fable` (identidade nova; topo, §C7.6). **Modelo que rodou: Fable (claude-fable-5-1) — sem fallback.**
> **Data:** 2026-10-30 (São Paulo). **Régua:** `D-JUNTA-FLUXO-RAPIDO` (`CLAUDE.md` na `origin/main` `264c3760`, §C7 item 10, l.841):
> perda de dado, logo **junta completa**, com pré-revisão, UMA votação, UM conserto e conferência.
> **Este plano não desenvolve, não vota, não commita.** Tudo abaixo foi medido na `origin/main` `264c3760` ou na ref do ramo
> `origin/fix/mobile-work-order-contracts` `a24f58b5`, com o comando ao lado (§A7, `D-MEDIR-NA-REF-ALVO`). O que vem do
> diagnóstico antigo (`C:/Users/AMP/.claude/plans/luminous-nibbling-sparrow.md`, Partes 2 e 4) entrou como **hipótese** e foi re-medido.

## Resposta curta à pergunta do mandato

Do #388 ainda valem, e **mergem limpos** sobre a `main`: os **dois consertos de fila** (`sync_queue_repository.dart`
serializada; `prestador_repository.dart` com `for-in` + `await`), o lint `unawaited_futures` e **12 casos de teste** em 3
arquivos (`bo6r11_fila_serializada` 5, `bo6r11_material_enfileira_e_sobrevive_reinicio` 4, `bo6r11_guard_fila_await_ast` 3).
Eles fecham `Ω6R-QUA-005`, a perda que **executa hoje**.

O resto do #388, a reescrita de `work_order_remote_api.dart` (`Ω6R-QUA-004`) com 18 testes, **conflita com o #460**
(B-SAN3-13), **muda a interface** que 8 fakes de teste e o repositório implementam, e cobre um **caminho morto**: detalhe,
status e assign REST da OS **não têm chamador** na `main` (§0.16). Sai para um bloco próprio, `B-O6R-11d`.

A segunda perda que executa hoje, o **lote preso em `syncing` para sempre** (`MP5`/`B4`: 3 sítios, zero resgate, §0.18-0.20),
**não está no #388** e entra aqui com o menor conserto que **não** troca encalhe por OS duplicada (a idempotência do
`work_order.create` no backend é em memória, §0.21).

**Corte escolhido: §3, opção B. Fatias: 8 (F0 a F7), até 45 min cada.**

---

## §0 — Terreno medido (comando → saída → leitura)

Árvore `C:/Users/AMP/Documents/GitHub/ERP_Techsolutios`, refs remotas após `git fetch`, 2026-10-30.

| # | Comando | Saída (resumida) | Leitura |
|---|---|---|---|
| 0.1 | `df -h /c` | `238G 213G 25G 90%` | **25 GB livres**, acima do piso de 7,5 GB. |
| 0.2 | `git log -1 --format='%h %ci %s' origin/main` | `264c3760 2026-10-30 09:26:59 -0300 docs(governanca): registro de 28 a 30/10 e fluxo rapido (#475)` | Ref julgada: `264c3760`. |
| 0.3 | `gh pr view 388 --json state,isDraft,mergeable,headRefOid,updatedAt,changedFiles,additions,deletions` | `OPEN · isDraft true · mergeable UNKNOWN · head a24f58b5 · updatedAt 2026-10-08 · 31 arquivos · +8332/-358` | Rascunho parado há 22 dias; mergeabilidade não computada. |
| 0.4 | `git log --oneline origin/main..origin/fix/mobile-work-order-contracts` e `git merge-base` | 24 commits; base `fc3363e3` | O ramo nasce de `fc3363e3`. |
| 0.5 | `git log --format='%h %ci %s' fc3363e3..origin/fix/... -- mobile/flutter_app/lib mobile/flutter_app/test` (1º) | `2db06ac7 2026-09-25 12:34 test(mobile): censo de instancias ... (ciclo 2)` | **O ciclo 3 não escreveu código**: depois disso só docs (`f46c4d91` emenda 6; `a24f58b5` decisão). Código do ramo = ciclo 2. |
| 0.6 | `git log --oneline fc3363e3..origin/main -- mobile/.../work_orders mobile/.../prestador mobile/.../core/sync mobile/.../core/local_db mobile/flutter_app/test` | `d6399294 fix(mobile): Minhas OS só do técnico, abertas e por cursor (B-SAN3-13) (#460)` | **Um** commit da `main` tocou os caminhos do bloco; tocou `work_order_remote_api.dart` (+98) e `work_order_repository.dart` (+432). |
| 0.7 | `git merge-tree --write-tree --name-only origin/main origin/fix/...` | 11 em CONFLICT: 4 `Kpis/*`, `log-execucao.md`, `decisoes.md`, `pendencias-indice.md`, `pendencias.md`, `status-geral.md`, `PLANO_SAN3.md`, **`work_order_remote_api.dart`** | 10 de registro/KPI + **1 de código**. Os outros 3 arquivos de código e os 6 de teste do ramo auto-mergeiam. |
| 0.8 | `git show f6b25c68:.../work_order_remote_api.dart` (árvore do merge-tree), marcadores | hunks em l.115-131 (assinatura de `fetchWorkOrders`: `main` `{String? tenantId}` + `fetchAssignedOpenWorkOrders` com cursor; ramo `{required String tenantId}`) e l.182-195 (parse de `items`) | Conflito **só no método de lista**, que o #460 reescreveu. |
| 0.9 | `git diff --stat fc3363e3..origin/fix/... -- mobile/` | 10 arquivos, +2332/-96: `analysis_options.yaml` +6; `sync_queue_repository.dart` +21/-4; `prestador_repository.dart` +11/-6; `work_order_remote_api.dart` +252; 4 testes novos (197, 847, 221, 822 linhas); `b099` e `b121` editados | O grosso é QUA-004. O que fecha QUA-005 são **~32 linhas de lib + 418 de teste**. |
| 0.10 | `git show origin/main:.../prestador_repository.dart`, l.121-133 | `selection.forEach((sku, qty) { ... _syncQueue.enqueue(action); });` sem `await`; `notifyListeners()` e `return` em seguida | **QUA-005 executa na `main`**: N `enqueue` concorrentes; retorno antes da gravação. |
| 0.11 | `git show origin/main:.../sync_queue_repository.dart` l.17-34 e `.../drift_sync_action_store.dart` l.28-55 | `enqueue`: `load()` → dedupe → `save([...actions, action])`; `save`: `transaction { DELETE FROM sync_actions; INSERT x N }` | Read-modify-write **da fila inteira**; k chamadas concorrentes, a última `save` vence: k ações viram 1. |
| 0.12 | `git grep -n "PersistentSyncQueueRepository(" origin/main -- mobile/flutter_app/lib` | `sync_providers.dart:33` (única construção) | **Uma instância em produção**: serializar por instância fecha a classe em produção (o caso 21 do ramo vale na `main`). |
| 0.13 | `git grep -c "implements SyncQueueRepository" origin/main -- mobile/flutter_app` | lib: 2 (Persistent, InMemory); test: 8 arquivos (`b090b, b091, b099, b100, b103, b105, b106, b121`) | Mudar a **interface** da fila custa 8 fakes + InMemory. Este plano **não** muda a interface. |
| 0.14 | `git show origin/main:.../work_order_remote_api.dart` l.165-232 e l.299 | detalhe/status/assign → `_workOrderFromJson(resp.data!)`; parser faz `json['tenant_id'] as String` | **QUA-004 (envelope) segue no código** da `main`: sob `{data:{...}}` o cast duro lança. |
| 0.15 | `git show origin/main:src/modules/work-orders/work-order.controller.ts` | `data: toWorkOrderDto(...)` em l.48, 57, 107, 140, 167, 191, 217, 244 | Backend responde `{ data }` em detalhe/status/assign. |
| 0.16 | `git grep -n "\.fetchWorkOrder(\|\.updateWorkOrderStatus(\|\.assignWorkOrder(\|WorkOrderApiEndpoints\." origin/main -- mobile/flutter_app/lib`, excluindo o próprio arquivo | só `api_contracts.dart:24`, `sync_replay_service.dart:570` (`mobileWorkOrderSync`), `registry_options_remote_api.dart` (vehicles/teams), `work_order_repository.dart:856` (`fetchTimeline`), `work_order_approval_request_screen.dart:210` (`createApprovalRequest` via repo) | **Nenhum chamador** de detalhe/status/assign REST. Status vai pela fila (`statusUpdate` → replay → `POST /mobile/work-orders/sync`); `fetchTimeline` já lê `{data}` (#351). **QUA-004 restante = caminho morto: contrato latente, não perda que executa.** |
| 0.17 | `work-order.service.ts`, `async assign(` +22 linhas | `:1795 operatorId = parseRequiredUuid(body.operatorId ?? body.userId)`; `:1796 userId = parseOptionalUuid(body.userId)` | O app manda `user_id` (snake); o backend lê `operatorId`/`userId`. Componente "assign envia campo não lido" **confirmado**, mas no caminho morto (0.16). |
| 0.18 | `sync_queue_repository.dart` l.37-47 (main) | `pendingForTenant` filtra `pending`, `failed`, `conflict` | `syncing` **nunca** volta a ser elegível. |
| 0.19 | `git grep -n "copyWith(status: SyncStatus.syncing)" origin/main -- mobile/.../core/sync`; `git grep -n -i "reclaim\|stuck"` no mesmo diretório | `sync_replay_service.dart:159, :675, :1389`; `sync_engine.dart:36`. reclaim/stuck: **0** | 3 serviços gravam `syncing` **antes** da rede (`update` durável no Drift). Morte do processo nessa janela, ou exceção que escape depois da marca, deixa o lote em `syncing` **para sempre**, invisível ao replay. **`MP5`/`B4` executa na `main`.** |
| 0.20 | `git grep -n "\.replayTenant(\|\.flushTenant(" origin/main -- mobile/flutter_app/lib`, excluindo o coordenador | vazio | **Só `AutoSyncCoordinator._triggerSync`** dispara replay, em voo único (`_running`, `auto_sync_coordinator.dart:65-66`). No topo dele nada deste processo está legitimamente em `syncing`. |
| 0.21 | `src/modules/mobile/mobile-work-order-sync.ts` l.60-120; `prisma/schema.prisma` l.2519-2523 (main) | `const syncReceipts = new Map<...>()`; schema: "O create normal de OS não carimba (NULL cai fora do índice parcial)"; unique parcial `(tenant_id, client_action_id)` só na migração `20260806000000` (DUPLICATE) | **Idempotência do `work_order.create` pela fila é em memória** do backend. A premissa do `B-O6R-11c` (diagnóstico antigo, Parte 4) **continua válida**: reenvio automático após reinício do backend pode **duplicar OS**. |
| 0.22 | `shared/ui/sync_screen.dart` l.24-33; `sync_replay_service.dart` l.812-829 (main) | `_resolveConflict(action, choice)` grava `resolveConflictAction(action, ...)` com o `action` do retrato do `FutureBuilder`; `_mapDependentActions` não pula `conflict` | `B2` é **plausível por forma** (o `update` substitui o registro inteiro), mas uma ação só entra em `conflict` **depois** de enviada, logo já tem `server_id`, e por leitura não há escritor concorrente dela. **Vai como sonda por execução (§5 R4), não como conserto a priori.** |
| 0.23 | `checklists/ui/checklist_run_screen.dart` l.93-99; `checklists/data/checklist_repository.dart` l.539-578 (main) | `void _onAnswer(...) { setState(...); repo.saveAnswer(...); }` (Future descartada); `saveAnswer`: `await saveRun` → `await _syncQueue.enqueue` → `notifyListeners` | A Future descartada **roda**; perda só por morte entre o toque e a gravação (ms); um `enqueue` por toque, sem RMW com a fila serializada. A decisão de 25/09 já o pôs **fora** (`B-O6R-11b`). Fica fora. |
| 0.24 | `Kpis/kpis-latest.json` l.17-20 (main); `git ls-tree -r <ref> --name-only mobile/flutter_app/test`, contagem de `_test.dart` | `flutter_tests 905/905` (marco 27/10, CI run 40440707891, head `f7922ab7`); 66 arquivos na `main`, 66 no ramo | **Baseline N = 905** (a confirmar em F0). A igualdade 66=66 é coincidência: o ramo criou 4; a `main` ganhou 4 por outros blocos. |
| 0.25 | `gh api repos/thiagodorgo/ERP_Techsolutios/commits/a24f58b5.../check-runs` | 14 runs concluídos; `flutter completed success` | Head do #388 **com CI verde**, mas sobre o código do ramo na base `fc3363e3`, não sobre o merge com a `main`. |
| 0.26 | `.github/workflows/ci.yml` l.3-20 (main) | `push: branches: main, fix/**, feat/**, chore/**, docs/**` + `workflow_dispatch` | Todo push do dev em `fix/**` gera check-runs no SHA: o inspetor terá objeto medível. |
| 0.27 | `pendencias.md` (main): `grep -n P-O6R-B11`; `grep -c` das 3 pendências de fila do ramo | `P-O6R-B11` ABERTA (l.3385-3434); contagem **0** | As **15 pendências** que o ramo criou (diff do ramo em `pendencias.md`, cabeçalhos `## P-`) **não existem na `main`**. |
| 0.28 | `git ls-tree -r <ref> --name-only agent-orchestration/omega docs/juntas`, filtro `o6r-11` (main e ramo) | `main`: vazio; ramo: `omega/juntas/votos/B-O6R-11/00-dev.md`, `omega/planos/B-O6R-11-plano.md` | **Atas dos ciclos 1 e 2 não estão versionadas** em ref nenhuma; o registro do ciclo 2 está na emenda 5 do comando (`133f898c`) e no diário do dev. Nada delas se herda como fato. |
| 0.29 | imports de `bo6r11_guard_fila_await_ast_test.dart` (ramo); `pubspec.yaml` (main e ramo) | importa `package:analyzer/...`; `pubspec.yaml` **não** declara `analyzer`; `pubspec.lock` o tem (transitivo) | O guard sobre a AST usa dependência **transitiva**. Passou no CI do ramo (0.25). Declarado em §9 R-f; `pubspec` é PROIBIDO. |
| 0.30 | `CLAUDE.md` l.841-870 (main) | item 10 `D-JUNTA-FLUXO-RAPIDO`: 3 níveis; trava fail-closed; pré-revisão → junta 1x → triagem → 1 conserto → conferência → merge/porteiro; refaz cadeira só em 2 casos | Régua deste bloco (§8). |
| 0.31 | `git show a24f58b5 -- agent-orchestration/controle/decisoes.md` | `D-O6R-11-ESCOPO-DIVIDIDO` (25/09): ciclo 3 = 8 verbos + conformidade em 3 camadas + `reclaimStuckSyncing` + sítio da vistoria; `B-O6R-11b` = `SyncOrigin` + `discarded_futures` | É o **desenho inteiro** que o mandato manda não reabrir. Deste pacote, **só o resgate de `syncing`** fecha perda que executa hoje (0.19), e entra aqui na forma mínima (§3). |
| 0.32 | imports dos 3 testes a aproveitar (ramo), fora de `flutter*`, `analyzer`, `dart:` | só `package:erp_techsolutions_mobile/...` já existentes na `main`; `test/support` e `test/helpers` existem na `main` | Os 3 testes **não dependem de helper do ramo**. |
| 0.33 | `sync_providers.dart` l.109-119; `sync_replay_service.dart` l.147-150 (main) | `syncReplayServiceProvider` = `SyncReplayService(api: DioExpenseSyncBatchApi(...), supportedActionTypes: ExpenseSyncActionTypes.supported)`; o seu `replayTenant` filtra só por tipo e `retryCount < maxRetry` | O replay de **despesas** fala com API **real** e **não exclui `conflict`** (os de OS, `:665`, e vistoria, `:1366`, excluem). Comportamento **pré-existente**: hoje um conflito de despesa vindo do servidor já é reenviado na passada seguinte. Afeta o destino `conflict` do resgate para ações de despesa (§3, §5 R3(g), §9 R-j). |
| 0.34 | `git grep -n "InventorySyncActionTypes.|materialAdd" origin/main -- mobile/flutter_app/lib/core/sync mobile/.../prestador/data` | só `prestador_repository.dart:125` (o `enqueue`) | **`inventory.material_add` não tem serviço de replay no app**: a ação, uma vez gravada, fica `pending` até existir quem a envie. QUA-005 garante que ela **sobrevive**; enviá-la é outro bloco (§5 R6, §9 R-k). |

**Leitura consolidada do §0.** Perda de dado que executa na `main` `264c3760`: **(i)** `QUA-005`: `addSelection` retorna antes
de gravar e N `enqueue` concorrem num RMW de fila inteira (0.10-0.12); **(ii)** `MP5`/`B4`: lote em `syncing` sem resgate em 3
sítios (0.18-0.20). O `QUA-004` restante é contrato latente em caminho morto (0.14-0.17). O `B2` é sonda (0.22). O sítio da
vistoria e os 16 `discarded_futures` são rede para o futuro (0.23; decisão de 25/09).

---

## §1 — O que do #388 ainda vale (auditoria do ramo contra a `main` de hoje)

| Componente do ramo (`a24f58b5`) | Estado na `main` `264c3760` | Vale? | Como entra e o que custa |
|---|---|---|---|
| **A.** `sync_queue_repository.dart`: `_tail`/`_serialized` em `enqueue` e `update` (+21/-4) | defeito presente (0.11); arquivo **sem** conflito (0.7) | **SIM** | `git checkout origin/fix/mobile-work-order-contracts -- <arquivo>` no ramo novo. Minutos. |
| **B.** `prestador_repository.dart`: `for (final entry in selection.entries) { ... await _syncQueue.enqueue(action); }` (+11/-6) | defeito presente (0.10); sem conflito | **SIM** | idem. |
| **C.** `analysis_options.yaml`: `unawaited_futures: true` (+6) | lint desligado; sem conflito | **SIM, condicional** | entra só se `flutter analyze` na `main` + A + B der **0 issues**; se acusar sítio fora do escopo, **não entra** (fail-closed de escopo) e vira pendência com N e arquivos (§5 R5). |
| **D.** Testes: `bo6r11_fila_serializada_test.dart` (5 casos, 17-21), `bo6r11_material_enfileira_e_sobrevive_reinicio_test.dart` (4, 13-16), `bo6r11_guard_fila_await_ast_test.dart` (3) | ausentes; sem conflito; imports só de `package:` existentes (0.32) | **SIM** | cherry-pick dos 3 arquivos. O caso 21 ("exatamente uma construção de `PersistentSyncQueueRepository` em lib/") é verdadeiro na `main` (0.12). |
| **E.** `work_order_remote_api.dart` reescrito (+252), `bo6r11_os_rest_envelope_e_vocabulario_test.dart` (18 casos), fakes de `b099` e `b121` | **conflita** com o #460 (0.7-0.8); muda a **interface** (`required String tenantId` em 4 métodos; `fetchWorkOrders` com assinatura diferente da que `work_order_repository.dart:282-284` chama); cobre **caminho morto** (0.16) | **NÃO, neste corte** | sai como bloco **`B-O6R-11d`** ("contrato REST da OS no app": envelope `{data}`, camelCase, `assign` com `operatorId`/`userId`, `required tenantId`), levando os 18 testes e os 2 fakes. O ramo `fix/mobile-work-order-contracts` **não se apaga** até o 11d colher isso. |
| **F.** Registro do ramo: comando + 6 emendas, plano, diário do dev, 15 pendências, decisões, KPI, 4 corpos de jurados (`.claude/agents/especialistas/jurado-o6r11-*` e espelho `.agents/`) | 10 arquivos em conflito; KPI **congelado** (`D-GOV-PROPORCIONAL` 5); pendências ausentes (0.27) | **PARCIAL** | **Não** se porta KPI. **Portam-se 3 pendências** que este corte toca ou decide (`P-MOBILE-FILA-RMW-STORE`, `P-MOBILE-DISCARDED-FUTURES`, `P-MOBILE-MATERIAL-E-FILA-NAO-ATOMICOS`); as **12 restantes** entram como **índice de uma linha cada** apontando para `origin/fix/mobile-work-order-contracts:agent-orchestration/controle/pendencias.md`. Os 4 corpos de jurados **não se portam**: a junta compõe cadeiras do elenco da `main`. O comando do bloco é **recriado na `main`** (v2), com o histórico apontando para o ramo. |

**O que do ciclo 2 fica fechado e não se reabre** (emenda 6 (F), `f46c4d91`): tenant da sessão vence o do corpo; vocabulário
de status; os 3 bloqueios do ciclo 1. Tudo isso vive no componente **E** e viaja com ele para o `B-O6R-11d`. Cobrar aqui é
reprovar sem defeito.

**Custo de aproveitar vs refazer, em números.** Aproveitar A+B+C+D: 4 `git checkout <ramo> -- <arquivo>` (zero conflito),
~32 linhas de lib já revisadas por 2 ciclos de junta e com CI verde no ramo (0.25); refazer do zero custaria uma fatia de dev e
perderia os 12 casos já escritos. Aproveitar E custaria reconciliar 2 hunks de conflito + 8 fakes + o repositório, para um
caminho que não executa. A conta decide sozinha.

---

## §2 — A propriedade de perda de dado, enunciada como propriedade

**P-FILA-DURÁVEL.** *Toda ação que o app aceitou do técnico (o método de domínio retornou sem lançar) está, a partir desse
instante, gravada na fila persistente, e permanece alcançável pelo replay ou visível ao técnico para decisão até ficar
`synced`. Nenhuma mutação da fila apaga, sobrescreve ou torna inalcançável uma ação que não seja a sua própria.*

Quatro sub-propriedades, cada uma com a medida que a decide:

| Sub-propriedade | Enunciado | Como se mede (o teste que a decide) | Onde ela hoje falha na `main` |
|---|---|---|---|
| **P1 — retorno só depois da gravação** | Se `addSelection` retorna com N SKUs válidos, o store persistente contém N ações `material_add` pendentes, e reabrir o banco preserva as N na ordem. | caso 13 (store com latência) e caso 14 (3 SKUs + reinício do Drift → 3 pendentes em ordem) | 0.10 (`forEach` sem `await`) |
| **P2 — mutações não se perdem entre si** | k mutações concorrentes (`enqueue`/`update`) sobre a mesma instância da fila produzem k efeitos no store; nenhuma sobrescreve outra. | casos 17 (2 `enqueue`), 18 (`enqueue` x `update`, nas duas ordens), 19 (erro não trava a fila), 20 (dedupe sob concorrência) | 0.11 (RMW da fila inteira) |
| **P3 — nenhuma ação encalha** | No início de cada passada de sincronização, nenhuma ação do tenant está em `syncing`; toda `syncing` herdada de um processo anterior (ou de exceção que escapou) vira **visível e decidível** pelo técnico, nunca descartada nem reenviada às cegas. | teste de integração do §5 R3: 3 ações `syncing` no Drift + 1 `pending` + 1 `synced` → `triggerManual` → as 3 em `conflict` com `lastErrorCode == 'SYNC_INTERRUPTED'`, a API fake **não** recebe nenhuma das 3 nessa passada, a `pending` segue o replay, a `synced` intocada, e `pendingForTenant` devolve as 3 | 0.18-0.19 (sem resgate) |
| **P4 — retrato velho não destrói escrita alheia** (sonda) | Uma decisão da tela sobre a ação A não reverte campo de A escrito por outro escritor entre a leitura e o toque. | sonda do §5 R4 com o **par de produção** (`_mapDependentActions` x `resolveConflictAction`); vermelho → conserto mínimo; não reproduz → pendência | 0.22 (plausível por forma; par de produção não provado) |

O que **não** é desta propriedade e não se cobra aqui: forma do envelope REST (QUA-004, `B-O6R-11d`); idempotência durável
no backend (`B-O6R-11c`); `SyncOrigin` e `discarded_futures` (`B-O6R-11b`); vocabulário de verbos do store (desenho, fora).

---

## §3 — O corte escolhido, e as opções descartadas (uma linha cada)

### Escolhido: **Opção B — ramo novo a partir da `main`, cherry-pick cirúrgico do que fecha `QUA-005` no #388, mais o resgate de `syncing` na forma mínima; `QUA-004` sai para `B-O6R-11d`; o #388 fecha sem merge.**

1. Ramo **novo** `fix/mobile-fila-duravel-b-o6r-11` a partir de `origin/main` (nunca rebase do #388).
2. `git checkout origin/fix/mobile-work-order-contracts -- ` nos **4 arquivos de código** (A, B, C) e **3 de teste** (D) do §1. Zero conflito (0.7).
3. **Resgate de `syncing`** (P3): função pura nova `reclaimInterruptedSyncing(List<SyncAction>)` em `core/sync/sync_interrupted_reclaim.dart`, aplicada pelo `AutoSyncCoordinator` **no topo de `_triggerSync`**, depois de obter o `tenantId` e antes do primeiro replay, via `actionsForTenant` + `update` (serializado por A), em `try/catch` isolado como os vizinhos. Cada `syncing` herdada vira **`conflict`** com `lastErrorCode: 'SYNC_INTERRUPTED'`, `lastSafeError` em PT-BR de negócio, `retryCount` preservado, `processedAt` limpo, payload intocado. Por quê `conflict` e não `pending`/`failed`: `pending` e `failed` (com `retryCount < maxRetry`) são **reenviadas automaticamente**, e o `work_order.create` não é idempotente de forma durável (0.21): reenviar às cegas troca encalhe por **OS duplicada**. `conflict` **não** é reenviado pelos replays de OS e de vistoria (filtros em `sync_replay_service.dart:665` e `:1366`); o replay de **despesas** (`:147-150`) não exclui `conflict`, comportamento **pré-existente** igual ao que ele já faz com conflito vindo do servidor (0.33), declarado em §5 R3(g) e §9 R-j, com a alternativa de 1 linha deixada ao orquestrador; aparece na tela de Sincronização com a resolução manual que **já existe** (`_resolveConflict`: "manter minha versão" reenvia; "usar do servidor" encerra), e usa um status **existente** (nenhum enum novo, nenhuma migração Drift). É o **menor** conserto que torna a ação recuperável sem criar o defeito vizinho.
4. **Sonda P4** por execução com o par de produção; conserto só se vermelha; se não reproduz, pendência.
5. Registro: `P-O6R-B11` (QUA-005 fechada aqui; QUA-004 → 11d; MP5 resgate manual aqui, reenvio automático → 11c); 3 pendências portadas; índice das 12 do ramo; comando v2 na `main`; `PLANO_SAN3.md` l.115 e l.283.
6. Depois do merge: comentário no #388 apontando o PR novo e o `B-O6R-11d`; **fechar o #388 sem merge**; **não apagar** o ramo (o 11d colhe o componente E).

**Por que este é o menor corte que fecha a perda que executa hoje:** os dois caminhos medidos (0.10-0.12 e 0.18-0.20) ficam
fechados com ~32 linhas aproveitadas + ~40 linhas novas + 1 chamada no coordenador; nenhuma interface muda; nenhum status novo;
nenhum arquivo em conflito com a `main` é tocado; o que não executa fica nomeado, com dono, fora.

### Descartadas (uma linha cada)

- **A. Rebase do #388 inteiro sobre a `main`:** 11 conflitos (1 de código com interface divergente do #460: 2 hunks + 8 fakes + repositório; 10 de registro), KPI congelado, e reabre o `QUA-004` num caminho morto. Custo: 2 a 3 fatias só de reconciliação, sem fechar perda nova.
- **C. Ciclo 3 como decidido em 25/09 (8 verbos + conformidade em 3 camadas + `SyncOrigin`):** é o desenho inteiro, já derrubado 2 vezes pelo crítico; custo de uma semana ou mais; o mandato proíbe reabri-lo.
- **D. Só `QUA-005` (A+B+C+D), sem o resgate de `syncing`:** menor ainda, mas deixa um caminho de perda **medido e conhecido** fora; fere o critério 5 do portão ("nenhum risco conhecido de perda de dados", `PLANO_SAN3.md` l.73).
- **E. Resgate de `syncing` para `pending` (reenvio automático):** melhor UX, mas duplica OS enquanto o create não carimba (0.21); fica para depois do `B-O6R-11c`, como refino por tipo (pendência §5 R6).
- **F. Resgate para `failed` com `retryCount = maxRetry`:** não reenvia, mas a tela **não tem** botão de reenvio para `failed` (grep em `sync_screen.dart`: zero) — visível e sem saída é encalhe com outro nome.

---

## §4 — Escopo PERMITIDO e PROIBIDO (caminhos exatos)

Raiz do app: `mobile/flutter_app/`. Branch: `fix/mobile-fila-duravel-b-o6r-11`, a partir de `origin/main` (`264c3760` ou mais novo,
medido em F0). Worktree próprio em caminho curto (`C:/Users/AMP/w-o6r11c3`), `flutter pub get` próprio, **sem junction** de
`.dart_tool`/`node_modules`.

### PERMITIDO

| Caminho | O que pode mudar | Origem |
|---|---|---|
| `lib/core/sync/sync_queue_repository.dart` | só o que o ramo trouxe: `_tail`, `_serialized`, `enqueue`/`update` embrulhados | cherry-pick A |
| `lib/features/prestador/data/prestador_repository.dart` | só o laço `for-in` + `await` no lugar do `forEach` | cherry-pick B |
| `analysis_options.yaml` | só a linha `unawaited_futures: true` e o comentário; **condicional** (§5 R5) | cherry-pick C |
| `lib/core/sync/sync_interrupted_reclaim.dart` | **NOVO**: `const syncInterruptedErrorCode = 'SYNC_INTERRUPTED'`; `const syncInterruptedSafeError = '<PT-BR>'`; `List<SyncAction> reclaimInterruptedSyncing(Iterable<SyncAction> actions)` (pura: devolve só as que estavam `syncing`, já convertidas) | novo (P3) |
| `lib/core/sync/auto_sync_coordinator.dart` | só: uma chamada no topo de `_triggerSync`, após `final tenantId = ...` e antes de `fieldLocationSyncService`, em `try/catch` isolado: `for (final a in reclaimInterruptedSyncing(await queue.actionsForTenant(tenantId))) await queue.update(a);` (ou método privado equivalente). Nada mais nesse arquivo. | novo (P3) |
| `lib/shared/ui/sync_screen.dart` | **SÓ se a sonda P4 ficar vermelha com o par de produção**: em `_resolveConflict`, reler a ação por `clientActionId` via `queue.actionsForTenant(tenantId)` imediatamente antes de aplicar `resolveConflictAction`. Nada de layout, texto ou componente. | condicional (P4) |
| `test/core/sync/bo6r11_fila_serializada_test.dart` | cherry-pick, sem edição além de `dart format` | D |
| `test/core/sync/bo6r11_guard_fila_await_ast_test.dart` | cherry-pick, sem edição além de `dart format` | D |
| `test/features/prestador/bo6r11_material_enfileira_e_sobrevive_reinicio_test.dart` | cherry-pick, sem edição além de `dart format` | D |
| `test/core/sync/bo6r11_resgate_syncing_interrompido_test.dart` | **NOVO**: unitários da função pura + integração com Drift em memória e coordenador (§5 R3) | novo |
| `test/features/bo6r11_sonda_sync_screen_retrato_velho_test.dart` | **NOVO**: a sonda P4 (§5 R4); fica no repositório com o resultado que der (vermelho→conserto→verde; ou "não reproduz" como teste que documenta o estado) | novo |
| `agent-orchestration/controle/pendencias.md`, `pendencias-indice.md` | `P-O6R-B11` atualizada; 3 pendências portadas; índice das 12 do ramo; pendências novas (§5 R6) | registro |
| `agent-orchestration/docs/status-geral.md`, `agent-orchestration/codex/log-execucao.md` | entrada do bloco | registro |
| `agent-orchestration/codex/comandos/B-O6R-11-mobile-work-order-contracts.md` | **recriado na `main`** (v2): aponta para o comando e as 6 emendas do ramo; incorpora este plano como emenda 7 | registro |
| `agent-orchestration/omega/planos/B-O6R-11-plano-ciclo3.md` | cópia versionada deste arquivo | registro |
| `agent-orchestration/omega/juntas/votos/B-O6R-11-c3/00-dev.md` | diário do dev (P1/P2; seções `## RETOMADA n`) | registro |
| `docs/revisoes/SAN3/PLANO_SAN3.md` | **só** o status da linha 283 (`B-O6R-11`) e do item 3 da linha 115 | registro |

### PROIBIDO

- `lib/features/work_orders/data/work_order_remote_api.dart` e `work_order_repository.dart` (QUA-004 e o terreno do #460 → `B-O6R-11d`).
- `lib/core/sync/sync_replay_service.dart`, `sync_engine.dart`, `sync_models.dart` (nenhum status novo), `sync_action_store.dart`, `lib/core/local_db/drift_sync_action_store.dart` e qualquer migração Drift (`app_database.dart`).
- `lib/features/checklists/**` (sítio da vistoria → `B-O6R-11b`); qualquer outra tela além da condição dita para `sync_screen.dart`.
- `pubspec.yaml`, `pubspec.lock` (o `analyzer` segue transitivo, §9 R-f); dependência nova exige junta de 5.
- `src/**`, `prisma/**`, `frontend/**`, `.github/**`, `CLAUDE.md`, `AGENTS.md`, lockfiles JS.
- `Kpis/**` (congelado, `D-GOV-PROPORCIONAL` 5).
- `.claude/agents/**`, `.agents/agents/**` (os 4 corpos de jurados do ramo não se portam).
- A interface `SyncQueueRepository` e os 8 fakes de teste que a implementam (0.13).
- O ramo `fix/mobile-work-order-contracts` e o PR #388: não se faz push neles; não se apagam.

**Trava de escopo (fail-closed):** se qualquer requisito exigir tocar um caminho PROIBIDO, o dev **para, registra no diário e
devolve ao orquestrador** (emenda escrita antes do código, `D-EMENDA-ANTES-DO-CODIGO`). Não se "ajeita" fora do escopo.

---

## §5 — Requisitos: critério · mutação · vermelho-controle

Regra geral (P1/P2 do protocolo resiliente): cada medida vai para o diário **ao ser feita** (comando, saída resumida,
veredito parcial). Mutação é **uma de cada vez**, revertida por **edição inversa** (nunca `git checkout`/`stash` na árvore do
bloco), e o resultado (vermelho/verde, qual caso) fica registrado. "Vermelho-controle" = o mesmo teste rodado sobre o head da
`main` **sem** o conserto, num worktree temporário descartável, e fica **vermelho**; teste que já nasce verde sem o conserto
**não prova nada** e é registrado como tal.

### R1 — Fila serializada (P2) — cherry-pick A + D

- **Critério:** casos 17, 18, 19, 20 e 21 de `bo6r11_fila_serializada_test.dart` verdes sobre `PersistentSyncQueueRepository`
  com store em memória e com `DriftSyncActionStore` em memória (`NativeDatabase.memory()`), conforme o arquivo já faz.
- **Mutações (cada uma deve deixar pelo menos o caso indicado vermelho):**
  - **M1:** em `enqueue`, trocar `=> _serialized(() async {` por `async {` (sem encadear) → caso 17 vermelho.
  - **M2:** idem em `update` → caso 18 vermelho (pelo menos uma das duas ordens).
  - **M3:** em `_serialized`, remover o `onError: (Object _) {}` da cauda → caso 19 vermelho (um erro trava as seguintes).
- **Vermelho-controle:** rodar os 5 casos no head da `main` (sem A) → 17 e 18 vermelhos; 19, 20 e 21 podem ficar verdes
  (não dependem do encadeamento) e **isso se registra**: só 17 e 18 são prova; os outros são guarda.

### R2 — Retorno só depois da gravação (P1) — cherry-pick B + D (+ C)

- **Critério:** casos 13, 14, 15 e 16 de `bo6r11_material_enfileira_e_sobrevive_reinicio_test.dart` verdes; o caso 14 abre um
  `AppDatabase` real em memória, grava 3 SKUs, **fecha e reabre** o store sobre o mesmo executor e conta 3 pendentes na ordem.
  O guard `bo6r11_guard_fila_await_ast_test.dart` (3 casos) verde: nenhum `enqueue`/`update` da fila chamado sem `await` dentro
  de corpo `async` em `lib/`, medido pela AST (não por texto).
- **Mutações:**
  - **M4:** em `addSelection`, remover o `await` de `_syncQueue.enqueue(action)` → caso 13 vermelho (store com latência) **e**
    o guard AST vermelho **e**, se C entrou, `flutter analyze` acusa `unawaited_futures`.
  - **M5:** voltar o laço para `selection.forEach((sku, qty) { ... })` → guard AST vermelho e caso 13 vermelho.
- **Vermelho-controle:** casos 13 e 14 no head da `main` (sem B) → 13 vermelho; 14 vermelho **ou** intermitente (é corrida:
  registrar N=5 execuções e quantas falharam; o diário do ramo mediu isso em 18/09, mas **não se herda**: re-medir).

### R3 — Nenhuma ação encalha (P3) — novo

- **Função pura** `reclaimInterruptedSyncing(Iterable<SyncAction>)` devolve **só** as ações cujo `status == SyncStatus.syncing`,
  cada uma como `copyWith(status: SyncStatus.conflict, lastErrorCode: syncInterruptedErrorCode, lastSafeError:
  syncInterruptedSafeError, clearProcessedAt: true)`, com `retryCount`, `payload`, `tenantId`, `type`, `createdAt` e
  `clientActionId` **intocados**. Entrada vazia → saída vazia. Ordem preservada.
- **Texto do `lastSafeError`** (PT-BR de negócio, sem termo técnico, §3 do contrato): *"O envio foi interrompido antes da
  confirmação. 'Manter minha versão' reenvia; 'Usar do servidor' encerra este item."* (ajustar ao vocabulário exato dos dois
  botões em `sync_screen.dart`, medido em F4).
- **Coordenador:** a chamada fica no topo de `_triggerSync`, **depois** de `final tenantId = session.activeTenant.tenantId;` e
  **antes** de qualquer replay/flush, em `try/catch` isolado (falha do resgate não bloqueia os domínios).
- **Critério (teste de integração, Drift em memória + `ProviderContainer` com os serviços de replay substituídos por fakes que
  registram o que receberam):** semear 3 ações `syncing` (`work_order.status_update`, `checklist.answer_upsert` e **uma de despesa**,
  `ExpenseSyncActionTypes.reportCreate`; **não** `inventory.material_add`, que não tem replay no app, 0.34), 1 `pending` e 1
  `synced`; chamar `triggerManual()`; asserir: (a) as 3 estão em `conflict` com `lastErrorCode == 'SYNC_INTERRUPTED'`; (b) os
  fakes de **OS e de vistoria não receberam** as suas resgatadas nessa passada; (c) a `pending` foi entregue ao fake do seu
  domínio; (d) a `synced` está idêntica; (e) `pendingForTenant` devolve as 3 (visíveis à tela); (f) `retryCount` e `payload`
  das 3 iguais aos semeados; (g) a de **despesa é entregue** ao fake de despesas, porque o replay de despesas não exclui
  `conflict` (0.33): **comportamento pré-existente documentado, não requisito deste bloco**; se o orquestrador aprovar a
  alternativa de 1 linha (§9 R-j), (g) inverte e passa a valer a mesma regra de (b).
- **Critério (unitários da função pura):** 4 casos: só `syncing` é convertida; campos preservados; entrada vazia; ordem.
- **Mutações:**
  - **M6:** comentar a chamada no coordenador → (a) e (e) vermelhos.
  - **M7:** trocar `SyncStatus.conflict` por `SyncStatus.pending` na função → (b) vermelho (os fakes de OS e de vistoria recebem as suas).
  - **M8:** trocar por `SyncStatus.failed` → (b) vermelho (com `retryCount < maxRetry`, `failed` é reenviado por todos os replays).
  - **M9:** converter também as `pending` (remover o filtro de status) → (c) vermelho.
- **Vermelho-controle:** o teste de integração no head da `main` + A + B (sem R3) → (a) e (e) vermelhos: as 3 continuam
  `syncing` e `pendingForTenant` não as devolve.

### R4 — Sonda P4: retrato velho na tela de Sincronização — decisão por execução, não por leitura

- **O que se tenta reproduzir (o par de produção nomeado em 25/09):** a tela lê `actionsForTenant` uma vez no `build()`; o
  técnico toca "manter minha versão" minutos depois; entre a leitura e o toque, o `AutoSyncCoordinator` roda
  `_mapDependentActions` e grava `server_id` numa ação; a tela então grava o retrato velho por cima e o `server_id` some.
- **Procedimento (30 min, com teto):** (1) construir, só com a API pública (`enqueue`/`update`/`replayTenant` com fake), uma
  ação **em `conflict` sem `server_id`** que depois receba `server_id` por `_mapDependentActions`; (2) se o estado for
  **alcançável**, aplicar `resolveConflictAction(retratoVelho, keepMine)` + `update` como `_resolveConflict` faz e asserir que
  `server_id` sobrevive → **vermelho esperado**; (3) se o estado **não for alcançável pela API pública** (uma ação só vira
  `conflict` depois de enviada, logo já com `server_id`, 0.22), o teste fica no repositório como **"não reproduz"**: asserção
  de que o estado é inalcançável, com comentário de 3 linhas, e o item vira pendência.
- **Se vermelho:** conserto mínimo em `_resolveConflict` (reler por `clientActionId` antes de aplicar), teste passa a verde,
  mutação **M10** (voltar a usar o `action` do retrato) → vermelho. Janela residual entre a releitura e o `update` fica
  **declarada** como pendência BAIXA (fechá-la de verdade exige verbo de leitura fresca dentro da seção serializada, que muda a
  interface: fora deste corte).
- **Se não reproduz:** pendência `P-MOBILE-SYNC-SCREEN-RETRATO-VELHO` (BAIXA), com o comando que tentou e o motivo.
  **Nenhuma linha em `sync_screen.dart`.** Isto é o que impede o loop: não se conserta o que não ficou vermelho.

### R5 — Lint `unawaited_futures` (camada 2 da P1) — condicional

- **Critério:** com C aplicado, `flutter analyze` na versão do CI (medir `flutter --version` em F0) dá **0 issues**.
- **Se acusar ≥1 issue fora dos arquivos PERMITIDOS:** C **não entra** neste bloco (reverter a linha), e nasce a pendência
  `P-MOBILE-UNAWAITED-FUTURES-FORA-DO-ESCOPO` com N, arquivos e linhas, dono `B-O6R-11b`. O guard AST (R2) continua sendo a
  camada 1 e **não depende** do lint. Fail-closed de escopo; nada se corrige fora do §4.

### R6 — Registro honesto

- `P-O6R-B11` (pendencias.md l.3385): `Ω6R-QUA-005` **FECHADA por este bloco** (PR novo, commits); `Ω6R-QUA-004` **segue
  ABERTA com escopo reduzido** e dono **`B-O6R-11d`** (componentes "envelope/casing" e "assign envia campo não lido"); `MP5`
  resgatado **para decisão manual** aqui, **reenvio automático** fica com `B-O6R-11c` (idempotência durável) — entrada nova
  `P-MOBILE-SYNC-INTERROMPIDO-REENVIO-MANUAL` (MÉDIA) descrevendo a troca de risco (duplicar vs encalhar) e o refino por tipo
  quando o 11c mergear.
- Portadas do ramo (texto verbatim + nota "portada do ramo em <data>"): `P-MOBILE-FILA-RMW-STORE` (a serialização protege a
  instância; o censo garante uma; o conserto definitivo no store continua pendência), `P-MOBILE-DISCARDED-FUTURES` (com a
  emenda 6 (D)3: o sítio da vistoria **executa a gravação** e está fora deste bloco, 0.23), `P-MOBILE-MATERIAL-E-FILA-NAO-ATOMICOS`.
- Pré-existentes achadas por este plano (0.33, 0.34), **não** deste bloco e sem conserto aqui: `P-MOBILE-DESPESA-CONFLICT-REENVIADO`
  (o replay de despesas não exclui `conflict`, ao contrário dos de OS e vistoria; evidência `:147-150` × `:665`/`:1366`; dono
  `B-O6R-11b` ou o bloco de despesas) e `P-MOBILE-MATERIAL-SEM-REPLAY` (`inventory.material_add` não tem serviço de replay no
  app: a ação sobrevive, ninguém a envia; dono: trilha de estoque mobile / PR-08).
- Índice `P-O6R-B11-PENDENCIAS-DO-RAMO-388` com as **12** restantes, uma linha cada, apontando para
  `origin/fix/mobile-work-order-contracts:agent-orchestration/controle/pendencias.md` (nenhuma se perde, nenhuma se reabre).
- `PLANO_SAN3.md`: l.115 (item 3) e l.283 (`B-O6R-11`) ganham status "QUA-005 fechada em <PR>; QUA-004 → B-O6R-11d; MP5 resgate manual" — **sem** reescrever a linha.
- Comando v2 do bloco na `main` + cópia deste plano em `agent-orchestration/omega/planos/B-O6R-11-plano-ciclo3.md`.
- **KPI: nada** (congelado). O PR declara isso no corpo.
- Depois do merge: comentário no #388 (PR novo, 11d, 11c) e **fechar sem merge**; ramo **preservado**.

---

## §6 — Fatias para o dev (Codex GPT-5.6 Sol; até 45 min cada; UMA por vez; cada fatia termina com commit + push + `## RETOMADA n` no diário)

Regras que valem em toda fatia: diário em `agent-orchestration/omega/juntas/votos/B-O6R-11-c3/00-dev.md` (P1: cada medida
ao ser feita; P2: o diário antes da mensagem final; P7: se receber `PAUSA`, grava `## PAUSA <hora UTC>` e para). Worktree
`C:/Users/AMP/w-o6r11c3` em `fix/mobile-fila-duravel-b-o6r-11`. **Disco < 7,5 GB → PARE** e registre. Nenhum arquivo PROIBIDO.
Formatação com o `dart format` da versão local **e** a forma aceita pelo CI (o ramo já pagou isso em `ea27b369`). Mensagem final
de cada fatia = 1 linha apontando o diário. O orquestrador é quem reporta ao dono.

| Fatia | Tempo | O que faz | Prova registrada | Commit |
|---|---|---|---|---|
| **F0 — Terreno** | 20 min | `git fetch`; `git worktree add C:/Users/AMP/w-o6r11c3 -b fix/mobile-fila-duravel-b-o6r-11 origin/main`; `cd mobile/flutter_app && flutter pub get`; `flutter --version`; `df -h`; baseline `flutter test --reporter compact` → **N** (esperado 905); criar o diário com `## RETOMADA 0` (head, versão, N, disco) | saídas de `flutter --version`, `df`, última linha do `flutter test` | `docs(b-o6r-11): diário do ciclo 3 — terreno medido` |
| **F1 — Vermelho-controle** | 40 min | Num worktree **temporário** sobre `origin/main` (não no do bloco), copiar os 3 testes do ramo (`git show origin/fix/mobile-work-order-contracts:<caminho> > <caminho>`) **sem** o código A/B e rodar cada arquivo; registrar por caso: vermelho/verde, e para o caso 14 **N=5 execuções**. Também rodar `flutter analyze` com `unawaited_futures: true` nesse worktree para medir R5 (issues fora do escopo: N e arquivos). Remover o worktree temporário (`git worktree remove --force`). **Nada se commita de código nesta fatia.** | tabela caso → resultado; saída do `analyze` | `docs(b-o6r-11): vermelho-controle no head da main, por caso` |
| **F2 — QUA-005: código + testes** | 30 min | No worktree do bloco: `git checkout origin/fix/mobile-work-order-contracts -- mobile/flutter_app/lib/core/sync/sync_queue_repository.dart mobile/flutter_app/lib/features/prestador/data/prestador_repository.dart mobile/flutter_app/test/core/sync/bo6r11_fila_serializada_test.dart mobile/flutter_app/test/core/sync/bo6r11_guard_fila_await_ast_test.dart mobile/flutter_app/test/features/prestador/bo6r11_material_enfileira_e_sobrevive_reinicio_test.dart`; `dart format`; `flutter analyze`; rodar os 3 arquivos → 12/12; mutações **M1-M5**, uma por vez, revertidas por edição inversa, com o caso que ficou vermelho | `analyze` 0 issues; 12/12; tabela M1-M5 | `fix(mobile): fila serializa mutações e material só retorna depois de gravado (B-O6R-11)` |
| **F3 — Lint (condicional)** | 15 min | Se F1 mediu **0 issues fora do escopo**: `git checkout <ramo> -- mobile/flutter_app/analysis_options.yaml`; `flutter analyze` → 0. Se mediu ≥1: **não** aplicar; registrar a pendência `P-MOBILE-UNAWAITED-FUTURES-FORA-DO-ESCOPO` (N, arquivos, linhas) no diário para F6 | saída do `analyze` | `chore(mobile): liga unawaited_futures (B-O6R-11)` **ou** só diário |
| **F4 — Resgate de `syncing` (P3)** | 45 min | Criar `lib/core/sync/sync_interrupted_reclaim.dart` (constantes + função pura); medir em `sync_screen.dart` os rótulos exatos dos dois botões de conflito e escrever o `lastSafeError` com eles; inserir a chamada no topo de `_triggerSync` (após `tenantId`, antes do 1º serviço, `try/catch` isolado); escrever `test/core/sync/bo6r11_resgate_syncing_interrompido_test.dart` (4 unitários + 1 integração com Drift em memória e fakes de replay que registram o recebido); rodar; **vermelho-controle**: comentar a chamada → (a) e (e) vermelhos → descomentar; mutações **M6-M9** uma por vez | 5/5; tabela M6-M9; vermelho-controle | `fix(mobile): ação presa em "sincronizando" volta visível para decisão do técnico, sem reenvio às cegas (B-O6R-11)` |
| **F5 — Sonda P4** | 30 min (teto) | Seguir §5 R4 passo a passo. Resultado A (vermelho com par real): conserto mínimo em `_resolveConflict` + mutação M10. Resultado B (estado inalcançável): teste fica como "não reproduz" com a asserção de inalcançabilidade; **zero linhas em `sync_screen.dart`**. Qualquer dos dois **se registra**, com o comando | o teste + a decisão A/B | `test(mobile): sonda do retrato velho na tela de sincronização (B-O6R-11)` (+ `fix(...)` se A) |
| **F6 — Registro** | 40 min | `pendencias.md`: §5 R6 inteiro (P-O6R-B11, 3 portadas verbatim, índice das 12, novas); regenerar `pendencias-indice.md` com o gerador usado pelo ramo (comando em `origin/fix/...:agent-orchestration/codex/log-execucao.md`, commit `d343ebcc`; se não existir na `main`, editar o índice à mão e dizer isso); `status-geral.md`; `log-execucao.md`; comando v2 em `agent-orchestration/codex/comandos/B-O6R-11-mobile-work-order-contracts.md`; cópia deste plano em `agent-orchestration/omega/planos/B-O6R-11-plano-ciclo3.md`; `PLANO_SAN3.md` l.115 e l.283 (status, sem reescrever). **Nada em `Kpis/`.** | `git diff --stat` do registro; `grep -c "## P-"` antes/depois | `docs(registro): B-O6R-11 ciclo 3 — QUA-005 fechada, QUA-004 para o 11d, pendências do #388 portadas e indexadas` |
| **F7 — Bateria final + PR** | 30 min | `dart format --output=none --set-exit-if-changed lib test`; `flutter analyze`; `flutter test --reporter compact` → **M** (zero falha, zero skip); `git diff --check`; `git diff --name-only origin/main` **cruzado com o §4** (nenhum PROIBIDO); push; `gh pr create --base main` com corpo: objetivo, propriedade (§2), DoD, como testar, tabela de vermelhos-controle e mutações, N→M, "KPI congelado: nada em Kpis/", "fecha QUA-005; QUA-004 → B-O6R-11d; reenvio automático → B-O6R-11c; #388 fecha sem merge após este"; esperar check-runs; `## RETOMADA 7` com o SHA e a URL do PR | `format` exit 0; `analyze` 0; `+M: All tests passed!`; lista de arquivos × §4 | (push + PR; sem commit novo além de ajustes de formato, se houver) |

**Total: 8 fatias, 250 min nominais.** Se uma fatia estourar 45 min, o dev grava `## RETOMADA n` com "feito / falta / próximo
comando" e **para**; o orquestrador decide se a mesma identidade continua. Fatias não se juntam.

---

## §7 — Baseline N de testes e meta

- **N (Flutter, `origin/main`):** 905/905, medido pela CI no head `f7922ab7` (0.24); a `main` de hoje (`264c3760`) não tocou
  `mobile/` depois disso (0.6 mostra só o #460, já dentro dos 905). **F0 confirma** com execução local.
- **Casos novos deste bloco:** 12 aproveitados (R1 5 + R2 4 + guard 3) + 5 do resgate (R3: 4 unitários + 1 integração) + 1 sonda
  (R4) = **18**. Meta: **M ≥ 923**, zero falha, zero skip, e **M − N = número de casos novos** (nenhum caso existente some).
- **Sobre "M ≥ 2N" do molde:** não se aplica a bloco de **correção** sobre uma suíte de 905; dobrar a suíte aqui seria inventar
  teste. A meta honesta é **cada requisito com teste que fica vermelho sem o conserto** (§5) e a suíte inteira verde. Declarado.
- **Backend e frontend:** intocados; carregam o último valor oficial com nota (o PR não os exerce).

---

## §8 — Junta no fluxo rápido (`D-JUNTA-FLUXO-RAPIDO`): pré-revisão, UMA votação, UM conserto, conferência

**Nível:** junta completa (pode perder dado sem volta) — já o máximo; a trava automática (item 10 (2)) sobre `git diff
--name-only origin/main` confirma que o bloco não toca banco, permissão, autenticação, isolamento nem escrita financeira (se
tocar, o dev saiu do §4 e o bloco volta antes da junta). **Quórum:** unanimidade de 3 (§C7.1-ter(b)). **Modelos:** inspetor,
cadeiras, pré-revisor, dev do conserto e verificador no nível menor, **declarado** (Opus no Claude; GPT-5.6 Sol no Codex; o dev
das fatias é Codex Sol por mandato). **Inelegíveis:** quem desenvolveu (Codex Sol das fatias), este planejador, e quem pré-revisou
não senta em cadeira. Os 4 corpos de jurados do ramo não existem na `main` e **não se usam**.

1. **Pré-revisão (1 revisor, não o dev):** roda a bateria do F7, re-executa os vermelhos-controle de R1-R3 num worktree
   próprio e as **mutações M1-M9** (uma por vez), confere `git diff --name-only` × §4. Achados vão ao dev, que conserta
   **antes** da junta. Sem ata; só o arquivo de evidência do revisor.
2. **Inspetor de terreno (Opus declarado):** worktree próprio por jurado que muta; SHA do PR com check-runs **concluídos**
   (0.26 garante que o push gera); S0 do espelho Codex (`node scripts/sync-agent-agents.mjs --check`); baseline N re-medido;
   nada herdado da ata de ciclo nenhum (0.28: não há atas versionadas). `LIBERADO` ou a junta não começa.
3. **Junta, uma vez só** — cada cadeira entrega a **lista completa** de achados, cada um com o comando que o reproduz, e declara
   `arquivos_medidos` (item 9 (0)):

   | Cadeira | Mandato (≤3 itens) | `arquivos_medidos` |
   |---|---|---|
   | **C1 — fila e durabilidade** | (1) P1 e P2: 12 casos aproveitados verdes + **re-executar** M1-M5 e os vermelhos-controle de R1/R2 por conta própria; (2) P3: integração do resgate verde + M6-M9 + vermelho-controle; (3) o texto do `lastSafeError` e a posição da chamada no coordenador (antes do 1º serviço, `try/catch` isolado) | `mobile/flutter_app/lib/core/sync/sync_queue_repository.dart`, `.../sync_interrupted_reclaim.dart`, `.../auto_sync_coordinator.dart`, `mobile/flutter_app/lib/features/prestador/data/prestador_repository.dart`, `mobile/flutter_app/test/core/sync/bo6r11_*`, `mobile/flutter_app/test/features/prestador/bo6r11_*` |
   | **C2 — fail-closed Dart e escopo** | (1) `dart format --set-exit-if-changed`, `flutter analyze`, suíte inteira na versão do CI; (2) `git diff --name-only origin/main` × §4 (nenhum PROIBIDO; nenhum status novo em `sync_models.dart`; `pubspec` intocado; `analyzer` segue transitivo e **declarado**); (3) a sonda P4: a decisão A/B está **provada pelo comando** registrado, não afirmada | `**` |
   | **C3 — registro e rastreabilidade** | (1) `P-O6R-B11` e as 3 portadas conferidas **contra o ramo** (`git show origin/fix/...:agent-orchestration/controle/pendencias.md`), índice das 12 completo; (2) `PLANO_SAN3.md` l.115/l.283 só com status; comando v2 e cópia do plano presentes; (3) `Kpis/` intocado; corpo do PR diz o que o diff faz (promessa × diff) | `agent-orchestration/**`, `docs/revisoes/SAN3/PLANO_SAN3.md`, `Kpis/**` |

4. **Triagem:** **grave** = P1, P2 ou P3 violada, ou arquivo PROIBIDO tocado → conserta agora; **não grave e simples** (texto,
   nome, comentário, formato) → mesma leva; **não grave e grande** → pendência com dono, não segura o bloco.
5. **Um conserto só**, por dev que **não achou** (nem o Codex das fatias se o achado for na fatia dele: usa a conta 2 ou Argon),
   com teste que fica vermelho sem o conserto.
6. **Conferência:** um verificador que **não consertou** roda o comando de cada achado, confere o teste vermelho→verde e o CI
   inteiro no SHA final.
7. **Merge (squash, `--delete-branch` do ramo NOVO apenas)** → `porteiro-pos-merge` (merge de produto) → limpeza §C5 → comentário
   e fechamento do #388 **sem merge**, ramo antigo preservado.

**Refazer cadeira (item 10 (4)):** só se o conserto mudar regra fora do que o achado apontava, ou se a conferência mostrar defeito
grave ainda presente. Cadeira verde carrega o voto pela regra do item 9 (1)/(2) com `git diff --name-only <objeto medido>..<objeto
novo>` × `arquivos_medidos`. **Auditoria do topo depois da junta:** só para defeito grave ou decisão de desenho (item 10 (5)).

---

## §9 — Riscos e rollback

| # | Risco | Como se mitiga neste plano | Se acontecer |
|---|---|---|---|
| R-a | `unawaited_futures` acusa sítios fora do escopo na `main` de hoje (o ramo mediu 0 em `fc3363e3`; a `main` andou) | F1 mede **antes** de aplicar; F3 é condicional | C não entra; pendência com N e arquivos (§5 R5); o guard AST segue como camada 1 |
| R-b | O resgate marca `conflict` uma ação **legitimamente** em voo | Só no topo de `_triggerSync`, sob `_running`; só o coordenador dispara replay (0.20); teste (c) prova que `pending` em voo não é tocada | Teste de integração vermelho na junta → conserto único |
| R-c | Técnico escolhe "manter minha versão" numa `work_order.create` resgatada e o backend já tinha aplicado **e** reiniciou → OS duplicada | Decisão humana e **visível**, texto do erro avisa; é a troca de risco declarada em `P-MOBILE-SYNC-INTERROMPIDO-REENVIO-MANUAL`; o fechamento real é o `B-O6R-11c` | Fica registrado como risco residual **assumido** (menor que encalhe silencioso: hoje a ação some; com o corte, ela aparece e o pior caso é duplicata visível no painel) |
| R-d | Os 3 testes aproveitados dependem de algo que a `main` mudou (assinatura, helper) | 0.32 mediu: só `package:` existentes; F1 os roda no head da `main` **antes** de qualquer código | Se não compilarem: o dev registra o símbolo que falta e **para** (emenda antes de código); não se "ajusta" o teste para passar |
| R-e | Versão do Flutter/Dart do CI difere da local (formato 3.11 × 3.13, `ea27b369` no ramo) | F0 registra `flutter --version`; F7 roda `dart format --set-exit-if-changed`; a cadeira C2 roda na versão do CI | Ajuste de formato na mesma leva (não grave, simples) |
| R-f | `package:analyzer` importado como dependência **transitiva** pelo guard AST; uma atualização de `drift_dev`/`build_runner` pode removê-la | Declarado aqui e na pendência portada `P-MOBILE-FILA-RMW-STORE` (nota); `pubspec` é PROIBIDO neste bloco | Se o CI quebrar por isso no futuro, bloco próprio declara `analyzer` em `dev_dependencies` (dependência nova → junta de 5) |
| R-g | O #460 (ou outro merge na `main`) toca `auto_sync_coordinator.dart`/`sync_queue_repository.dart` durante o bloco | F0 parte da `main` do dia; antes da junta, `git fetch` + `git merge-base --is-ancestor origin/main HEAD` ou rebase declarado no diário | Rebase do ramo **novo** (pequeno, 3-4 commits), nunca do #388 |
| R-h | A sonda P4 consome mais que 30 min sem decisão | Teto explícito em F5; resultado B ("não reproduz") é **válido** e termina a fatia | Pendência BAIXA; zero linhas em `sync_screen.dart` |
| R-i | Disco abaixo de 7,5 GB (hoje 25 GB; worktree Flutter + `.dart_tool` ≈ 1-2 GB) | Medir em F0 e antes de F7; `git worktree remove --force` do temporário em F1 | **PARE** e registre (§C5; limite do dono) |
| R-j | Ação de **despesa** resgatada para `conflict` é reenviada na mesma passada pelo replay de despesas (0.33) — para esse domínio, o resgate equivale a reenvio automático | Declarado; é o comportamento pré-existente do serviço com conflito do servidor; (g) do teste de R3 o documenta | **Alternativa de 1 linha, decisão do orquestrador por emenda:** `.where((a) => a.status != SyncStatus.conflict)` em `sync_replay_service.dart:150`, a mesma forma de `:665`/`:1366`; entraria no PERMITIDO como emenda escrita (`D-EMENDA-ANTES-DO-CODIGO`) e (g) inverteria. Sem a emenda, fica a pendência `P-MOBILE-DESPESA-CONFLICT-REENVIADO` |
| R-k | `inventory.material_add` não tem replay (0.34): o material sobrevive ao reinício, mas não chega ao backend | Fora do alcance de QUA-005 (que é sobre sobreviver); pendência `P-MOBILE-MATERIAL-SEM-REPLAY` | Bloco da trilha de estoque mobile |

**Rollback:** `git revert` do squash. Sem migração, sem mudança de schema Drift, sem status novo: ações que já tenham sido
marcadas `conflict`/`SYNC_INTERRUPTED` pelo código revertido continuam **decidíveis pela tela**, porque `conflict` e a resolução
manual já existem na `main`. O ramo `fix/mobile-work-order-contracts` permanece como estava.

---

## §10 — Rastreabilidade: o que este plano NÃO reabre (e para onde cada coisa vai)

| Tema | Decisão aqui | Dono |
|---|---|---|
| Envelope `{data}`/camelCase/`assign` com `operatorId` no REST da OS; `required tenantId` na interface; 18 testes de vocabulário; fakes `b099`/`b121` | **fora** (caminho morto, 0.16; conflita com #460) | `B-O6R-11d` (bloco novo; colhe o componente E do ramo) |
| Idempotência **durável** por `client_action_id` no backend (começando por `work_order.create`, que não carimba, 0.21); reenvio **automático** das resgatadas por tipo | **fora** (migração; `prisma/**`) | `B-O6R-11c` (plano próprio, `agente-dba-guardiao`, unanimidade) |
| `SyncOrigin`; lint `discarded_futures` e os 16 avisos; sítio da vistoria `checklist_run_screen.dart:98` | **fora** (rede para o futuro; 0.23) | `B-O6R-11b` |
| Vocabulário de 8 verbos no `SyncActionStore`; máquina de conformidade em 3 camadas; "vacina" | **fora** (desenho inteiro; derrubado 2x) | decisão de desenho do dono, se e quando |
| Tenant da sessão vence o do corpo; vocabulário de status; os 3 bloqueios do ciclo 1 | **fechados no ramo** (emenda 6 (F)); não se cobram aqui | viajam com E para o 11d |
| `Ω6R-QUA-005` (material some no restart) | **fecha aqui** (P1 + P2) | este bloco |
| `MP5`/`B4` (lote preso em `syncing`) | **resgate visível aqui** (P3); reenvio automático → 11c | este bloco / 11c |
| `B2` (retrato velho na tela) | **sonda** (P4) | este bloco (se vermelho) ou pendência BAIXA |
| As 12 outras pendências do ramo | **indexadas**, uma linha cada, apontando para o ramo | cada uma mantém o dono que o ramo deu |
| KPI | **nada** | congelado (`D-GOV-PROPORCIONAL` 5) |
| Replay de despesas reenvia `conflict` (pré-existente, 0.33) | **fora**, salvo emenda de 1 linha (§9 R-j) | `B-O6R-11b` ou bloco de despesas |
| `inventory.material_add` sem replay (pré-existente, 0.34) | **fora** | trilha de estoque mobile / PR-08 |

**Nota de método (§A6, fato × hipótese).** São **fatos medidos** nesta ref: tudo no §0. São **hipóteses** que este plano re-mediu
e confirmou: a premissa do 11c (0.21); a inexistência de chamador para QUA-004 (0.16). É **hipótese que este plano re-mediu e
rebaixou**: `B2` como perda que executa (0.22 → sonda). É **leitura do planejador, declarada**: que `conflict` é o destino certo
para a ação interrompida (por ser o único status existente que é visível e não reenviado às cegas); se o dono preferir reenvio
automático aceitando a duplicata até o 11c, isto se troca numa constante (`SyncStatus.pending` em `reclaimInterruptedSyncing`)
e numa asserção (M7 vira o critério), sem mexer em mais nada.
