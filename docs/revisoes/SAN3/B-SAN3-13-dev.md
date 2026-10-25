# B-SAN3-13 — Relatório do DEV (P1, gravado por etapa)

- **Dev:** `dev-san313-opus` — Claude **Opus 5.5** (`claude-opus-5-5`), nível menor **DECLARADO**. Cobre o Codex por ordem do dono (24/10): *"vc cobre o codex nessa rodada"*. Não planejou, não criticou, não vota.
- **Fonte única:** `docs/revisoes/SAN3/B-SAN3-13-plano.md` (PLANO v3 final, `planejador-mestre` Fable) + críticas r1/r2 + medição (cópias versionadas neste PR).
- **Worktree:** `C:/Users/AMP/w-san313`, ramo `fix/mobile-minhas-os`, base `origin/main` = `8a7885f4` (#454 B-TRC-02 entrou depois da v3; ver Etapa 0).

## Estado (P2 — esqueleto)
| Etapa | Estado |
|---|---|
| 0 terreno | GRAVADO |
| 1 vermelho-controle (B1/B14-db/F1) | GRAVADO |
| 2 backend: escopo, resolver estrito, AND, openOnly | GRAVADO |
| 3 backend: cursor por id | GRAVADO (E2) |
| 4 app: rede (scope/openOnly/paginate/cursor) | GRAVADO |
| 5 app: reconciliação, retenção, lock, sementes | GRAVADO |
| 6 app: Home/lista sob a E1 | GRAVADO |
| 7 registro | GRAVADO |
| Bateria §8 | GRAVADO (CI no fim) |
| Falsificações de premissa | F-1 GRAVADA |
| Limpeza §C5 | GRAVADO |

## Etapa 0 — terreno (GRAVADO)
- `git worktree add -b fix/mobile-minhas-os C:/Users/AMP/w-san313 origin/main` → `HEAD is now at 8a7885f4` (#454 B-TRC-02 entrou depois da v3, que mediu `37a3f360`).
- Re-medição do cabeçalho do plano: `git diff --name-only 37a3f360 8a7885f4 | grep -E 'src/modules/work-orders|src/modules/mobile|mobile/'` → **vazio** (115 arquivos no delta, nenhum na superfície). As linhas do plano valem; deslocamentos de 1 linha anotados onde houve.
- `npm ci` próprio (sem junction) → `added 326 packages in 3m`; `npm run db:generate` → `Generated Prisma Client (v7.8.0)`.
- Postgres 16 descartável próprio: `docker run -d --name dev-san313-pg … -p 127.0.0.1:55313:5432 postgres:16-alpine`; `npx prisma migrate deploy` → `All migrations have been successfully applied.` Base viva (5432/6379) intocada; 1 trabalho Docker.
- `flutter pub get` (worktree) → `Got dependencies!`.
- Baseline das regressões backend no head: `node --test --import tsx tests/work-orders.test.ts tests/work-orders-routes.test.ts tests/o6r07a-wo-object-scope.test.ts tests/work-orders-list-coordinates.test.ts` → `# tests 15 # pass 15 # fail 0` (o plano contava 13 + coordinates).

## Etapa 1 — vermelho-controle no head `8a7885f4` (GRAVADO)
| Teste | Comando | Vermelho observado |
|---|---|---|
| B1 (CA-1) | `node --test --import tsx tests/san3-13-wo-list-scope.test.ts` | `not ok 1 … A deveria ver (i)(ii)(iii); total=5` — o técnico A recebe as 5 OS da organização |
| B14-db (CA-9) | `DATABASE_URL=…55313… node --test --import tsx tests/san3-13-wo-list-cursor-db.test.ts` | `not ok 1 … FALTARAM=[6 ids] paginas=1` — sem cursor a caminhada não entrega as OS de A (e a 1ª página era a de B) |
| F1 (CA-23) | `flutter test test/features/bsan313_minhas_os_escopo_test.dart` | `Expected: ['srv-1'] Actual: ['wo-local-1', 'wo-local-2', 'wo-local-3', 'srv-1']` |

## Etapa 2 — backend: escopo, resolver estrito, AND por cláusula, openOnly (GRAVADO)
- Código: `work-order.types.ts` (`assignedToActor`, `openOnly`, `matchesAssignedToActor`, `assignedToActorOperatorIds`), `work-order.validators.ts` (`WORK_ORDER_TERMINAL_STATUSES` derivada de `WORK_ORDER_STATUS_TRANSITIONS`, `isWorkOrderUuid`, `parseListScope`, `parseOpenOnly`, `parseCursorId`), os 2 repositórios, `work-order.service.ts` (`list` + `resolveListActorScope` + a referência estrita ligada ao lado da antiga). Guard, `get`, `assign`, `assignFromDispatch`: intocados.
- Precisão de localização (não é falsificação): `WorkOrderReferenceResolvers`/`resolveActorOperatorProfileId` mora em `work-order.service.ts:182`, não em `work-order.types.ts:182` como o §5 escreve; a referência estrita foi declarada lá (o §5 permite a ligação em `work-order.service.ts`).
- **Achado da própria execução (não do plano):** o rascunho mandava `OR: []` ao Prisma para o ator com `sub` não-UUID. O B17-db mediu: **`OR: []` NÃO é falso no Prisma 7** — a lista devolveu a OS mista da organização (`+ [ { … title: 'Bomba mista' … } ]`). Remédio dentro do escopo: o repositório Prisma responde vazio sem consultar quando nenhum id do escopo tem forma de UUID (teste B12 R2-N3: `findMany`/`count` não chamados). Coerente com o R2-N1 da crítica (o Prisma 7 descarta elemento vazio de `OR`).
- `node --test --import tsx tests/san3-13-wo-list-scope.test.ts tests/san3-13-wo-list-prisma-where.test.ts` + as 4 regressões → `# tests 29 # pass 29 # fail 0`.
- `DATABASE_URL=…55313… node --test --import tsx tests/san3-13-wo-list-cursor-db.test.ts` → B17-db `ok`, B18-db `ok`, B14-db `not ok` (esperado: o cursor é o commit 3). Teardown escopado: `select count(*) from tenants` → `0` depois da suíte.
- Ajuste de teste declarado: B3 buscava `"Via ii"` e casava também `"Via iii"` (`contains`) — trocado para `"Via iii"`; B18-db: OS `cancelled` exige `financial_cancellation_decision` (CHECK `work_orders_cancelled_decision_check`).

## Etapa 3 — backend: cursor por `id` — PARADA por premissa falsificada (GRAVADO)

### FALSIFICAÇÃO F-1 — o contrato do §3 não diz como a 1ª página da caminhada entra na ordem `id desc`
**O que o plano escreve (v3):**
- §3 `cursor`: "Modo cursor: ordem **`id desc`** …, página = `id < cursor`"; "Com `cursor`, `offset` ausente ou `0`".
- §3 `limit/offset/total`: "Modo `offset` continua `created_at desc, code desc`".
- §3 `pagination`: "`nextCursor` — regra única: `id` do último item se `items.length === limit`, senão `null` (**em ambos os modos**)".
- §4.1 (app): `GET /work-orders?scope=assigned&openOnly=true&limit=100[&cursor=<nextCursor>]` — a **1ª página vai SEM `cursor`**.
- Nenhum trecho define o que seleciona o "modo cursor" numa requisição sem `cursor`.

**A leitura literal** (modo cursor ⇔ `cursor` presente) foi implementada e medida: a 1ª página sai em `created_at desc, code desc` e o seu `nextCursor` é o `id` do último item; a 2ª página em diante é `id < cursor` em `id desc`. As duas ordens não são a mesma, então a caminhada pula OS e termina "completa".

**Execução (head do ramo `9cfa5111` + o cursor literal não commitado, salvo em `<scratchpad>/cursor-letra.patch`):**
`DATABASE_URL=postgresql://…@127.0.0.1:55313/erp_san313 node --test --import tsx tests/san3-13-wo-list-cursor-db.test.ts` →
```
not ok 1 - B14-db (CA-9): 6 OS de A, 5 com created_at idêntico até µs e 1 no mesmo ms — limit=1 entrega todas e termina nextCursor=null
    FALTARAM=["b403c39a-9491-4329-a088-892a8e341aa4","8c5e4399-c720-4f2c-889d-78bb58b3004d"] paginas=5
ok 2 - B17-db …
ok 3 - B18-db …
```
**Consequência:** é a classe do CRIT-11/R2-1 (OS ainda do técnico não entregue, caminhada "completa", purga no aparelho), reaberta pelo contrato. A classe não depende do Postgres: vale em qualquer conjunto em que a ordem por `created_at` difira da ordem por `id` (uuid aleatório — quase sempre). O CA-9 do próprio plano a pega.

**O que falta decidir (é contrato público, `API_CONTRACTS.md`; não é do dev — §C2.2 e a regra do mandato "não improvise remédio"):** o que coloca a 1ª página na ordem `id desc`. Leituras possíveis, SEM escolha minha:
1. um parâmetro que o app já manda na 1ª página seleciona o modo (ex.: `scope=assigned` ou `openOnly=true` ⇒ ordem `id desc`) — muda a ordem dessas listas também para a web;
2. um marcador explícito na 1ª página (ex.: `cursor=` de início, ou `paginate=cursor`) — muda o §3 ("cursor que não é UUID → 400") e o §4.1;
3. a regra do `nextCursor` muda ("só no modo cursor") — sozinha não fecha: a 1ª página continua sem modo.

**Estado do trabalho na parada:**
- Commits no ramo (não empurrado): `f6b1ea37` (vermelho-controle B1/B14-db/F1) e `9cfa5111` (escopo, resolver estrito, AND por cláusula, `openOnly`), ambos verdes no que cobrem (29/29 sem banco; B17-db e B18-db verdes no Postgres próprio).
- Não commitado no worktree: o cursor na leitura literal (5 arquivos de `src/modules/work-orders/`, `+62 −13`), cópia em `<scratchpad>/cursor-letra.patch`. Ao retomar: aplicar a emenda do planejador sobre ele.
- Não iniciados: commits 4-7 (app: rede, reconciliação/retenção/lock/sementes, Home/lista; registro). Nenhum depende da escolha acima, exceto o parâmetro que o app manda na 1ª página (§4.1, CA-13).
- Terreno: worktree `C:/Users/AMP/w-san313` intacto; container `dev-san313-pg` **parado** (`docker stop`, não removido — `docker start dev-san313-pg` na retomada; porta 127.0.0.1:55313).

## Etapa 3 (retomada) — cursor por `id` sob a Emenda E2 (GRAVADO)
- E2 lida inteira (plano l.432-453; cópia versionada atualizada em `docs/revisoes/SAN3/B-SAN3-13-plano.md`). Aplicada sobre `cursor-letra.patch`: `paginate=cursor` (`parsePaginate`) declara o modo em toda página; `cursor` sem o modo → 400 `invalid_cursor_mode`; `nextCursor` só no modo cursor (`null` no offset); `offset` devolvido `0` no modo cursor. `docker start dev-san313-pg`.
- `DATABASE_URL=…55313… node --test --import tsx tests/san3-13-wo-list-cursor-db.test.ts` → `# tests 5 # pass 5 # fail 0 # skipped 0` (B14-db, B15-db, B19-db, B17-db, B18-db).
- **Precisão (não falsificação):** a E2 pede `paginas = 6` no B14-db com `limit=1`. Pela regra que a própria E2 escreve (`nextCursor` = último `id` se `items.length === limit`), a 6ª página — cheia — aponta para uma 7ª, vazia, que fecha com `null`. O teste afirma as duas coisas: `paginasComItens = 6` e `paginas (requisições) = 7`.
- Memória: `node --test --import tsx tests/san3-13-wo-list-cursor.test.ts` → B10, B13, B16 (`OS_ainda_de_A_que_o_pull_nao_trouxe=0`), B19 → `# pass 4`. B12 com `orderBy` por modo → `# pass 5`.
- Todas as suítes backend do bloco + regressões (sem banco): `# tests 34 # pass 34 # fail 0`.
- Commit `d051328b`.

### Mutações backend (`<scratchpad>/mut_backend.py`: aplica com âncora única, roda, restaura com `git checkout`, confere árvore limpa)
```
M1 sem ramo operator=userId [B1]: VERMELHO fail=8 restaurado=True
M2 sem ramo perfil [B1]: VERMELHO fail=5 restaurado=True
M3 + ramo assigned_user_id (memória) [B1/B6]: VERMELHO fail=5 restaurado=True
M4 filtro do chamador substitui o escopo [B3]: VERMELHO fail=1 restaurado=True
M5 forçar por 'tem papel de campo' sem a união [B5]: VERMELHO fail=1 restaurado=True
M6 resolver engole erro (200 encolhido) [B9]: VERMELHO fail=1 restaurado=True
M7 sub não-UUID vira 503 [B9]: VERMELHO fail=1 restaurado=True
M8 ignorar openOnly (memória) [B11]: VERMELHO fail=1 restaurado=True
M9 OR do search no topo (Prisma) [B12/B17-db]: VERMELHO fail=4 restaurado=True
M10 count sem escopo (Prisma) [B12/B17-db]: VERMELHO fail=4 restaurado=True
M11 openOnly como chave simples (Prisma) [B12/B18-db]: VERMELHO fail=3 restaurado=True
M12 F-1: modo pela presença de cursor (Prisma) [B14-db/B19-db]: VERMELHO fail=3 restaurado=True
M13 orderBy único nos dois modos (Prisma) [B12/B14-db]: VERMELHO fail=4 restaurado=True
M14 nextCursor também no modo offset (memória) [B19]: VERMELHO fail=1 restaurado=True
M15 cursor sem paginate aceito (serviço) [B13]: VERMELHO fail=1 restaurado=True
M16 memória ordena por outra chave no modo cursor [B15-db]: VERMELHO fail=1 restaurado=True
M17 escopo do Prisma com OR: [] (sem curto-circuito) [B12/B17-db]: VERMELHO fail=2 restaurado=True
```
17/17 vermelhas; 17/17 restauradas (`git status --short` vazio depois).

## Etapa 4 — app: rede (GRAVADO)
- `work_order_remote_api.dart`: `WorkOrderFetchResult {orders, complete}` e a interface À PARTE `WalkingWorkOrderRemoteApi` (o `DioWorkOrderRemoteApi` implementa as duas). `fetchWorkOrders` mantém a assinatura e devolve as `orders` da caminhada. Toda página: `scope=assigned&openOnly=true&paginate=cursor&limit=100`; da 2ª em diante `cursor` tal como veio; nunca `offset`; teto 50 páginas; sem `pagination.nextCursor` → incompleta.
- **Leitura declarada (não falsificação):** o §4.1 diz "mantém a assinatura (10 fakes) e devolve `orders` + `complete`". Uma assinatura não devolve dois valores; para manter a de `fetchWorkOrders` e os fakes existentes, a completude vem pela interface à parte, e o repositório trata a API que não a implementa como caminhada incompleta (atualiza, nunca apaga — o comportamento de antes; `b099` 30/30 sem ajuste, H6 não caiu).
- Testes F2 (capturador com `paginate=cursor` em toda página, cursor opaco `'opaco/1 ä'` devolvido igual, sem `offset`), F3 (230), F4 (teto e backend antigo). Commit `b45af82a`.

## Etapa 5 — app: reconciliação, retenção, trava, sementes (GRAVADO)
- Store: `deleteWorkOrder` na interface, no `InMemory` (materiais: no-op declarado — moram no `PrestadorLocalStore`) e no Drift (evidência, linha do tempo, `work_order_materials` e a linha, numa transação).
- Repositório: trava ESTÁTICA `_serial` (fila ociosa = `null`, ver abaixo) envolvendo as 7 mutações públicas (corpo de antes, renomeado `_…Locked`), a fabricação do `load()` e a reconciliação; `_reconcile` relê cada linha candidata e a fila do store; `_hasPendingWork` com os 5 ramos; `_isFabricated` (sem `serverId` e sem `work_order.create` de qualquer status); `allowSeedOrders` (provider: `!kIsRemoteAuth`); `hasExternalPendingWork` composto por `buildWorkOrderExternalPendingWork` (vistoria + materiais; falha de leitura = retém); `lastPullIncomplete`; `workOrdersForUser` removido (0 chamadores). Mapa `workOrderActionReferenceKeys` classifica as 26 constantes de `*SyncActionTypes` (F24).
- **Achado de execução (meu, corrigido):** a 1ª versão da trava encadeava sempre no `Future` anterior; em `testWidgets` o `Future` estático pertencia à zona do teste anterior, que ninguém mais bombeia → `pumpAndSettle timed out` em `b126` e `b115`. Remédio: com a fila ociosa, a operação corre já (o `Future` da cauda zera ao terminar). `work_orders/` + `b099` → `+119: All tests passed!`.
- Ajustes de teste declarados: F18 precisava que o pull do `load()` trouxesse a OS (senão a reconciliação a tirava antes da mutação — o próprio comportamento certo).
- Testes: `bsan313_os_purga_reconcilia_test.dart` 19 (F5, F8, F9-F11/F19, F12, F13/F14 ×2, F15, F16, F17, F18, F20, F21/F25, F21 Drift, F22, F22b, F6, F7, F24, R10) + F1, F5(503), F23 no arquivo de escopo. Commit `5e6c0f0c`.

## Etapa 6 — app: Home e lista sob a E1 (GRAVADO)
- Home: "OS hoje" = abertas agendadas hoje; tile "Concluídas" → **"A sincronizar"** (OS com `syncStatus != synced`); faixa de "dados desatualizados" também com `lastPullIncomplete` (o mesmo `_WoPullErrorBanner`). Lista: mesma faixa (`_PullErrorBanner`); aba "Concluidas" vazia → `EmptyState` com "As OS concluídas saem do aparelho depois de sincronizar. O histórico fica no portal." Componentes existentes; nenhum layout novo.
- **Ajuste de teste declarado, fora da lista nominal do §5:** `test/features/b084_home_stats_test.dart` afirmava o rótulo "Concluídas" (testes 1 e 3) e o "doneCount" (teste 4). O CA-21 manda o rótulo sumir, então os três foram ajustados às claras (nada apagado): rótulo "A sincronizar"; o teste 4 passa a contar OS com envio pendente.
- Testes F26, F26b, F27, F27b (`bsan313_home_lista_e1_test.dart`). Commit 6.

### Mutações do app (`<scratchpad>/mut_flutter.py`: âncora única, roda os testes do bloco, restaura com `git checkout`, confere árvore limpa)
Rodada 1 (25 mutações):
```
FM1 sem scope na query [F2]: VERMELHO pass=5 fail=1 restaurado=True
FM2 paginate só com cursor (1ª página sem) [F2]: VERMELHO pass=5 fail=1 restaurado=True
FM3 cursor reinterpretado [F2]: VERDE(!) pass=6 fail=0 restaurado=True
FM4 para na 1ª página [F3]: VERMELHO pass=3 fail=3 restaurado=True
FM5 purga com caminhada incompleta [F5]: VERMELHO pass=18 fail=1 restaurado=True
FM6 sem a chave work_order_local_id [F11/F24]: VERMELHO pass=17 fail=2 restaurado=True
FM7 sem a chave server_id [F9]: VERMELHO pass=17 fail=2 restaurado=True
FM8 sem a chave work_order_id [F10]: VERMELHO pass=17 fail=2 restaurado=True
FM9 sem o ramo 2 (linha pending) [F12/F22b]: VERMELHO pass=17 fail=2 restaurado=True
FM10 ramo 3 sem conflict [F20]: VERMELHO pass=18 fail=1 restaurado=True
FM11 ramo 3 ignora LOCAL_BLOB_MISSING [F20]: VERMELHO pass=18 fail=1 restaurado=True
FM12 ramo 3 sem exigir blob [F20]: VERMELHO pass=18 fail=1 restaurado=True
FM13 sem os ramos 4/5 (gancho) [F21/F25]: VERMELHO pass=16 fail=3 restaurado=True
FM14 Drift sem apagar materiais [F16/F21]: VERMELHO pass=17 fail=2 restaurado=True
FM15 store em memória sem apagar filhas [F1/F8]: VERMELHO pass=22 fail=3 restaurado=True
FM16 trava por instância [F22]: VERMELHO pass=18 fail=1 restaurado=True
FM17 reconcilia lendo _orders [F22b]: VERDE(!) pass=19 fail=0 restaurado=True
FM18 purga por isFinal [F23]: VERDE(!) pass=6 fail=0 restaurado=True
FM19 sem varredura (só upsert) [F1/F8]: VERMELHO pass=15 fail=10 restaurado=True
FM20 failed não retém [F19]: VERMELHO pass=18 fail=1 restaurado=True
FM21 constante nova sem classificar [F24]: VERMELHO pass=18 fail=1 restaurado=True
FM22 Home mantém 'Concluídas' [F26]: VERMELHO pass=2 fail=2 restaurado=True
FM23 sem o texto do vazio [F27]: VERMELHO pass=3 fail=1 restaurado=True
FM24 sem trava [F18/F22]: VERMELHO pass=17 fail=2 restaurado=True
FM25 fabricação ignora a criação na fila [F15]: VERMELHO pass=18 fail=1 restaurado=True
```
**Três verdes na rodada 1 — o teste é que era fraco, e foi endurecido (commit `ee1477bd`):**
- FM3 (cursor reinterpretado com `trim().toLowerCase()`): os cursores do F2 já eram minúsculos e sem espaço. F2 passa a usar `' OpAcO/1 Ä '`.
- FM17 (decidir pelo `_orders` da instância): como escrita, a mutação lia o `_orders` DEPOIS do upsert, que já o recarrega do store — não era a classe. Reescrita para o instantâneo tirado ANTES (o `_orders` velho do R2-4).
- FM18 (purga por `isFinal`): o F23 tinha a `approved` local `synced`, que o upsert sobrescreve com o status do backend antes de qualquer decisão. F23 passa a usar a `approved` local AINDA `pending` (o caso real em que ela sobrevive ao upsert), e a mutação passa a apagar toda linha `isFinal` sem consultar a retenção.
Rodada 2:
```
FM3 cursor reinterpretado [F2]: VERMELHO pass=5 fail=1 restaurado=True
FM17 reconcilia lendo o _orders da instância [F22b]: VERMELHO pass=10 fail=9 restaurado=True
FM18 purga por isFinal [F23]: VERMELHO pass=5 fail=1 restaurado=True
```
**25/25 vermelhas** (22 na 1ª rodada + 3 depois do endurecimento); 25/25 restauradas.

## Etapa 7 — registro (GRAVADO)
- `controle/decisoes.md`: `D-SAN3-13-SCOPE-ASSIGNED`, com as palavras literais do dono (Q1-Q5 "Aceito as 5 (Recomendado)", E1 "Só as abertas", "vc cobre o codex nessa rodada"), a Emenda E2 e a precisão do `OR: []`.
- `controle/pendencias.md`: `P-MOBILE-MINHAS-OS-SEM-FILTRO` e `P-MOBILE-OS-SEEDS` → RESOLVIDA com o merge (prova nomeada); 10 abertas com dono: as 9 do §12 do plano (`P-WO-LEITURAS-TENANT-WIDE-TECNICO`, `P-MOBILE-SYNC-FAILED-SEM-DESCARTE`, `P-MOBILE-EVIDENCIA-CONFLITO-SEM-DESCARTE`, `P-MOBILE-MATERIAL-SEM-REPLAY` ALTA, `P-MOBILE-LINHA-CONFLICT-NAO-LIMPA`, `P-MOBILE-REPO-SESSAO-DEMO-DURANTE-RELOAD`, `P-MOBILE-FILA-LER-TUDO-GRAVAR-TUDO`, `P-WO-STATUS-VOCABULARIO-APP-BACKEND`, `P-WO-LIST-SCOPE-WEB-TECNICO`) + `P-MOBILE-TELEMETRIA-TESTE-16-INSTAVEL` (pre-existente, medida nesta bateria).
- `pendencias-indice.md` regenerado (`python agent-orchestration/controle/gerar-indice-pendencias.py`): placar 621 → 630 cabeçalhos, ABERTAS 465 → 472, FECHADAS 153 → 155. (Uma palavra "crítica" no corpo fazia o gerador classificar a `P-WO-LEITURAS…` como CRÍTICA; reescrita para "revisão adversarial" — fica MÉDIA, como o cabeçalho.)
- `PLANO_SAN3.md` (linha do `B-SAN3-13`): emenda do teste de encerramento (§14 do plano + E2), texto antigo riscado, não apagado.
- `docs/claude-code-handoff/API_CONTRACTS.md`: linha da lista + o texto exato do contrato da E2.
- Ata da junta (`omega/juntas/J-SAN3-13-*.md`): é da junta, não do dev — não criada aqui. `Kpis/**` intocado.

## Bateria §8 — no head final do ramo (GRAVADO)
| # | Comando | Resultado |
|---|---|---|
| 1 | `flutter pub get` | `Got dependencies!` |
| 2 | `dart format --output=none --set-exit-if-changed lib test` | exit 0 |
| 3 | `flutter analyze` | `No issues found!` |
| 4 | `flutter test test/features/bsan313_*` (3 arquivos) | `+29: All tests passed!` |
| 5 | regressões `b099`, `b103`, `b097`, `b107`, `work_orders/`, `home_screen_test` | `+217: All tests passed!` |
| 6 | `flutter test --reporter compact` | 1ª execução `+893: All tests passed!` (864 + 29; no commit 6, antes do `ee1477bd`, que só endureceu F2 e F23); 2ª e 3ª, no head final, `+892 -1` — o vermelho é sempre `telemetry_test.dart` 16 (instável e pre-existente: 2/5 isolado; `P-MOBILE-TELEMETRIA-TESTE-16-INSTAVEL`). 0 skip |
| 7 | `npm run check` | exit 0 |
| 8 | `npm run lint` | exit 0 |
| 9 | `node --test --import tsx tests/san3-13-wo-list-{scope,cursor,prisma-where}.test.ts` | `# tests 19 # pass 19 # fail 0` |
| 10 | `DATABASE_URL=…127.0.0.1:55313… node --test --import tsx tests/san3-13-wo-list-cursor-db.test.ts` | `# tests 5 # pass 5 # fail 0 # skipped 0` (B14-db, B15-db, B19-db, B17-db, B18-db) |
| 11 | regressões `work-orders`, `work-orders-routes`, `o6r07a`, `work-orders-list-coordinates` | `# tests 15 # pass 15 # fail 0` |
| 12 | `npm test` (forma 1: sem `DATABASE_URL`, sem Redis) | `344 arquivo(s) · 3342 teste(s) · pass 3244 · fail 1 · skipped 97`. O `fail 1` é `tests/core-saas-role-authority.test.ts`, que derruba o arquivo inteiro com `DATABASE_URL is required to initialize Prisma Client` — **pre-existente**: com o `src/` da `origin/main` (`git checkout origin/main -- src`, rodado e desfeito) dá o mesmo erro. A contagem oficial (forma do job `backend` da CI, com Postgres e Redis) sai do item 16 |
| 13 | `npm run build` | exit 0 |
| 14 | `git diff --check origin/main...HEAD` | exit 0 |
| 15 | `node scripts/sync-agent-agents.mjs --check` | `OK — 82 agentes, espelho consistente.` |
| 16 | CI no head empurrado | ver "Entrega" |
| 17 | limpeza §C5 | ver "Limpeza" |

**Testes novos (M):** backend 24 (scope 10, cursor 4, prisma-where 5, `-db` 5) · Flutter 29 (escopo 6, purga/reconciliação 19, Home/lista 4). Meta do §7 (backend ≥ 16 com ≥ 4 `-db`; Flutter ≥ 24) cumprida. Nada apagado; `b084` ajustado às claras (Etapa 6).

### Critérios × teste × mutação
| CA | Teste(s) | Mutação → vermelho observado |
|---|---|---|
| CA-1 | B1 | M1, M2, M3 |
| CA-2 | B3, B17-db | M4, M9 |
| CA-3 | B4, B13, B19-db | M15 |
| CA-4 | B5 | M5 |
| CA-5 | B7, B17-db (`total`) | M10 |
| CA-6 | B12 (5) | M9, M11, M13, M17 |
| CA-7 | B6 | M3 |
| CA-8 | B9, B17-db (não-UUID), B12 R2-N3 | M6, M7, M17 |
| CA-9 | B14-db, B10, B16 | M12 (a F-1), M13 |
| CA-10 | B11, B18-db | M8, M11 |
| CA-11 | B15-db, B19 | M16, M14 |
| CA-12 | regressões backend | — |
| CA-13 | F2, F3 | FM1, FM2, FM3, FM4 |
| CA-14 | F4, F5 (incompleta), F5 (503) | FM5 |
| CA-15 | F9-F11/F19 | FM6, FM7, FM8, FM20 |
| CA-16 | F20 | FM10, FM11, FM12 |
| CA-17 | F12 | FM9 |
| CA-18 | F13/F14 | FM19 |
| CA-19 | F21/F25, F21 Drift, F16 | FM13, FM14 |
| CA-20 | F18, F22, F22b | FM16, FM17, FM24 |
| CA-21 | F26, F26b | FM22 |
| CA-22 | F27, F27b | FM23 |
| CA-23 | F1, F6, F15, F23 | FM15, FM18, FM19, FM25 |
| CA-24 | F24 | FM21, FM6 |
| CA-25 | regressões Flutter e suíte | — |

## Entrega — CI (GRAVADO)
- Ramo empurrado: `git push -u origin fix/mobile-minhas-os`. A `origin/main` andou para `b08c7557` (#458, B-GUARD-MIGRACAO) e conflitou nos registros (apensos dos dois lados): `git merge origin/main` no ramo (`2d8fe6c1`), com a entrada do #458 primeiro e as deste bloco depois, e `pendencias-indice.md` regenerado (631 cabeçalhos, 473 ABERTAS, 155 FECHADAS). Nada reescrito.
- CI `40166075473` no head `2d8fe6c1`: `backend` **success** — `[run-backend-tests] 345 arquivo(s) · 3981 teste(s) · pass 3979 · fail 0 · skipped 2` (os 5 `-db` do bloco executados de verdade: `ok 2770…2774` B14-db, B15-db, B19-db, B17-db, B18-db); `backend-postgres` **success** (`# tests 493 # pass 493 # fail 0 # skipped 0`); `frontend`, `owner-portal`, `authority-portal` **success**; `flutter` **failure** no `dart format --set-exit-if-changed`: `Changed test/features/bsan313_minhas_os_escopo_test.dart`.
- **Causa (terreno, não produto):** o Flutter desta máquina é 3.41.6 e o da CI é 3.47.5 — os dois `dart format` quebram de forma diferente a chamada encadeada sobre um argumento partido (`await _apiOver(\n backend,\n ).fetch…`). Remédio só no teste: helper `_walk(backend)` e expressões curtas, que as duas versões formatam igual. Local: `dart format` exit 0, `flutter analyze` limpo, `+6` no arquivo; FM1-FM4 re-executadas sobre o teste reescrito → 4/4 vermelhas, restauradas.

## Limpeza §C5 (GRAVADO)
- Removidos: container `dev-san313-pg` (`docker rm -f`; `docker ps -a | grep -c dev-san313` → 0), `dist/` (6,1 MB), `mobile/flutter_app/build/` (61 MB), os anexos de teste não rastreados em `storage/` (`git clean -fdx -- storage`; o `.gitkeep` rastreado fica). Mantidos: `node_modules` e `.dart_tool` do worktree (reinstalar custa caro; o worktree fica para re-execução), e os roteiros de mutação no scratchpad (`mut_backend.py`, `mut_flutter.py`, `cursor-letra.patch`) para P3. Nada rastreado apagado; base viva e prefixo `dev-san312a-` intocados.
- **2ª tentativa (head `84dcaab2`, run `40166705012`):** o `flutter` acusou de novo o mesmo arquivo — o palpite estava errado. Medido com o formatador DA CI: Flutter 3.47.5 = Dart **3.13.4** (`releases_windows.json`), SDK avulso baixado no scratchpad (`dartsdk-windows-x64-release.zip` 3.13.4). `dart format` 3.13.4 mudava um único `expect(…, ['srv-1'], reason: …)` do F1. Aplicada a saída do formatador da CI; `dart format --output=none --set-exit-if-changed lib test` com o 3.13.4 → exit 0; `+6` no arquivo.
