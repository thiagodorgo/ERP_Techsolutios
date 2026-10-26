# B-SAN3-13 — Crítica adversarial do plano · rodada 1

- **SUBSTITUIÇÃO DECLARADA:** este arquivo é de `crit-san313-opus` (Claude **Opus 5.5**, `claude-opus-5-5`, nível menor declarado, papel `critico-adversarial`), no lugar de `crit-san313-argon` (Antigravity Gemini 4 Argon), que caiu às 22:59Z de 24/10 por créditos esgotados **sem gravar nada** (não há parcial a re-executar — P3).
- **Objeto:** `C:/Users/AMP/erp-pausa-2026-10-03/planos/B-SAN3-13-plano.md` (323 linhas, Fable) + medição `revisoes/B-SAN3-13-medicao.md`.
- **Ref medida:** worktree só-leitura `C:/Users/AMP/w-plan21` detached em `origin/main` = `c76ec481`.
- **Regra:** quem acha não propõe correção (§C7.4-bis). Cada achado: id · gravidade · escopo · evidência executada · motivo.

## Estado (P2 — esqueleto; cada item gravado ao ser medido)
| Item | Estado |
|---|---|
| 0 ref e premissas | GRAVADO |
| 1 propriedade e onde mora (backend: lista, detalhe, sync, timeline, evidência) | GRAVADO |
| 2 perda de dado no aparelho | GRAVADO |
| 3 critérios × mutações; paginação | GRAVADO |
| Veredito | GRAVADO |

## Item 0 — ref e premissas (GRAVADO)
- `git -C C:/Users/AMP/w-plan21 checkout -q --detach origin/main && git rev-parse HEAD` → `c76ec481ea9af23dea8cb58ce28fb72bf1965f2b`.
- `git diff --stat 7ab2fe71 c76ec481 -- src mobile tests` → **vazio**: o plano (medido em `7ab2fe71`) vale para o head atual.
- Cópia de execução: `san313-medicao/src` × `w-plan21/src` por `cmp` arquivo a arquivo → 794 × 794, **0 diferenças**.
- **Terreno declarado:** o `node_modules` de `san313-medicao` é um link para `C:/Users/AMP/w-agapi2/node_modules`, que **não existe mais** (`ls` → "No such file or directory"); a sonda falhava com `Cannot find package 'cors'`. Executei as sondas com um gancho de resolução (scratchpad `…/scratchpad/hook/hook.mjs`) que só redireciona pacote não achado para o `node_modules` da árvore principal (leitura). Nenhum `npm ci`, nenhum link criado, nada apagado.
- **Resíduo do caído:** existe `san313-critica/sonda-critica-r1.test.ts` (19:58 local) do `crit-san313-argon`, sem parecer gravado. Não é insumo (P3: conclusão sem comando registrado); ele **falha ao rodar** (`Cannot find module 'dotenv'`). Usei-o só como pista; cada achado abaixo foi medido por comando meu.
- Minha sonda backend: `san313-medicao/tests/crit-opus-r1-backend.test.ts` (arquivo novo e declarado; nada da medição foi alterado).

## Item 1 — a propriedade e onde ela mora (GRAVADO)

### CRIT-1 · `bloqueia` · `dentro-do-bloco` — o `OR` do escopo no `buildWhere` colide com o `OR` do `search`: o desenho do §3 l.155 reabre o vazamento no Prisma
- **Evidência:** `sed -n 787,817p src/modules/work-orders/work-order-prisma.repository.ts` → o `search` já ocupa a chave de topo `OR` (8 colunas, `contains insensitive`). O plano manda acrescentar `...(input.assignedToActor ? { OR: [...] } : {})` e afirma "o `OR` convive com as chaves já presentes (AND implícito)". Executado:
  `node -e '<objeto com os dois spreads>'` →
  `escopo ANTES do search: {"tenant_id":"t","OR":[{"code":…},{"title":…}]}` (o escopo **sumiu**) ·
  `escopo DEPOIS do search: {"tenant_id":"t","OR":[{"assigned_user_id":"A"},…]}` (o `search` **sumiu**).
- **Motivo:** em objeto JS a segunda chave `OR` substitui a primeira. Na ordem natural de inserção (filtros de atribuição ficam antes do `search` em `buildWhere`), `GET /work-orders?search=a` como técnico devolve **a organização inteira** no Postgres — exatamente o defeito #32 que o bloco fecha. O repositório de memória filtra em cadeia (`work-order.repository.ts:291-306`) e **não** reproduz a colisão; o CA-6 (paridade) e o CA-2 (só `status`) **não incluem `search`**, então a suíte do bloco fica verde com o vazamento vivo. O I1 do plano ("qualquer filtro adicional só restringe") é falso para `search` no Prisma.

### CRIT-2 · `ajuste` · `dentro-do-bloco` — H2/CA-7 "lista ⊆ mutáveis" é falsa por uma via REST, não "só por escrita direta no banco"
- **Evidência:** `sed -n 1712,1713p work-order.service.ts` → `operatorId = parseRequiredUuid(body.operatorId ?? body.userId)` e `userId = parseOptionalUuid(body.userId)`, sem conferir que o perfil pertence ao usuário. Sonda executada (`node --import <gancho> --import tsx/loader --test tests/crit-opus-r1-backend.test.ts`):
  `assign status 200 assignedUserId 7f7c5dae… assignedOperatorId dcb4dbea…` (um UUID qualquer, nem é perfil) · `lista ?assignedUserId=A total 1` · `PATCH /status por A: 403 … not_assigned_to_actor` · `# pass 1`.
- **Motivo:** o §0.3 H2 diz que o caso `assigned_user_id = eu` + `assigned_operator_id = outro` nasce "só por escrita direta no banco — aceito e registrado". É alcançável por `POST /work-orders/:id/assign` de qualquer gestor (e pelo lote `work_order.assign`). Com o predicado do §3 (ramo `assigned_user_id = userId`), essa OS entra na "Minhas OS" de A, A recebe 403 em toda ação, e a OS **também** aparece para o dono do perfil (`assigned_operator_id = perfil`). O CA-7 (B6) só exercita "as 3 vias" consistentes, logo passa por construção sem provar a propriedade que enuncia. A premissa e o critério precisam encarar a via mista.

### CRIT-3 · `bloqueia` · `dentro-do-bloco` — o resolver de perfil engole erro e devolve `undefined`; na LISTA isso vira 200 encolhido, e o app trata 200 completo como autoridade para PURGAR
- **Evidência:** `sed -n 2183,2198p work-order.service.ts` → `resolveActorOperatorProfileId: async (actor) => { try { … } catch { return undefined; } }`, com o comentário: *"O `catch` devolve undefined DE PROPÓSITO … o único consumidor é `assertMutationObjectScope`, que trata undefined como 403."* O plano (§3 l.149, R1, B9) cria um **segundo consumidor** — a lista — e chama de "fail-closed igual ao guard" a queda para 2 ramos.
- **Motivo:** no guard, `undefined` = recusa (seguro). Na lista, `undefined` = **resposta 200 com menos itens e `total` coerente com o encolhimento**: toda OS atribuída só por perfil (`assigned_user_id = null`, M5) some numa falha transitória da leitura de perfil. O §4.2 do plano faz o app tratar pull "completo e bem-sucedido" como verdade e **apagar** do aparelho o que não veio (sem trabalho pendente). Resultado: um soluço no banco de perfis apaga do celular do técnico as OS do dia dele, sem erro visível; se ele ficar offline em seguida, não tem com o que trabalhar. Fail-closed no servidor + purga no cliente = **fail-destructive no aparelho**. A premissa do comentário ("único consumidor") passa a ser falsa e o plano não a enfrenta.

### CRIT-4 · `ajuste` · `pre-existente` — outros caminhos de LEITURA tenant-wide do técnico não estão nomeados na pendência
- **Evidência:** `grep -n -A3 "router.get(" src/modules/work-orders/work-order.routes.ts` → `/approvals/pending` e `/approvals/:approvalId` com `work_orders:read`; `grep -n -A4 "router.get(" src/modules/field-dispatch/*.routes.ts` → `/operations/dispatches` (+ `/:id`, `/:id/timeline`) com `field_dispatch:read`; `sed -n 912,950p src/modules/core-saas/permissions/catalog.ts` → `field_technician` tem `work_orders:read` **e** `field_dispatch:read`; `sed -n 237,248p field-dispatch.service.ts` → `list` só com `tenantId` + filtros opcionais (`operatorUserId` livre).
- **Escopo:** rotas e permissões anteriores ao bloco (07a/Ω3; a medição M20 e o §3 l.153 já tratam o detalhe como fora) — `pre-existente`, não reprova.
- **Motivo:** a pendência nova `P-WO-DETALHE-ESCOPO-TECNICO` (§12) enumera "detalhe, timeline, logs, mapa e sub-recursos", mas **não** `GET /approvals/pending` nem `GET /operations/dispatches`, que devolvem ao técnico OS/despachos de **colegas** (identidade da OS, técnico, endereço). O resumo do plano ("imposto no backend") é verdade só para `GET /work-orders`; o registro precisa dizer quais leituras continuam abertas, senão a #32 fecha com vazamento irmão sem dono. Os caminhos `/mobile/sync/*` são de escrita e passam pelo guard (`/mobile/bootstrap` não lista OS: `sed -n 45,90p mobile.routes.ts`).

## Item 2 — perda de dado no aparelho (GRAVADO)
Execução: cópia `san313-critica/flutter_app` (lib/test/assets/pubspec do head `c76ec481`), `flutter pub get --offline` → `Got dependencies!`; sonda `test/crit_opus_r1_test.dart`, que roda o código do HEAD e aplica a regra de retenção do §2.3 (ramos 1-3, escrita a partir do texto do plano; ramo 4 = `false`, como o próprio plano declara sem gancho).
`flutter test test/crit_opus_r1_test.dart --reporter expanded` →
```
CRIT-OPUS-B: … acao=SyncStatus.synced linha.syncStatus=SyncStatus.conflict regraDoPlano(retem)=true
CRIT-OPUS-C: … janela: linha.syncStatus=SyncStatus.pending timeline=1 fila=0 regraDoPlano(retem)=false
00:00 +2: All tests passed!
```

### CRIT-5 · `bloqueia` · `dentro-do-bloco` — a OS reatribuída com ação pendente NUNCA drena: o ramo 2 (`wo.syncStatus == conflict`) a retém para sempre depois que o técnico resolve o conflito
- **Evidência:** CRIT-OPUS-B acima. Caminho do head: `updateStatus` grava a ação; o replay devolve `conflict` e `buildWorkOrderSyncEntityUpdater` (`sync_providers.dart:164-195`) põe a **linha** em `syncStatus = conflict`; a tela de conflitos (`sync_screen.dart:24-33`) chama **só** `queue.update(resolveConflictAction(…))` — `useServer` vira a ação `synced` (`sync_conflict_resolver.dart:29-33`) e **ninguém** reescreve a linha; o pull seguinte não traz a OS (foi reatribuída), então `_upsertRemoteOrders` não a toca. Resultado medido: ação `synced`, linha `conflict`, regra do plano = **retém**.
- **Mesma classe na evidência:** `buildEvidenceSyncEntityUpdater` (`sync_providers.dart:267-298`) põe `uploadStatus = conflict` e nada o desfaz após a resolução; e evidência **sem blob** (`localBlobRef == null`) nasce `uploadStatus: pending` (`work_order_repository.dart:594-595`), o sincronizador de metadados mantém `current.uploadStatus` quando não há blob (`sync_providers.dart:282-286`) e o upload só pega item com `localBlobRef != null` (`evidence_upload.dart:149-155`) → `uploadStatus != synced` para sempre → ramo 3 retém para sempre.
- **Motivo:** o §2.3 promete, e o dono aceitou na Q3, "visível com selo **até a fila drenar** … no próximo pull bem-sucedido a linha não tem mais trabalho pendente e **sai**". No fluxo real do head a linha nunca sai: o caso central do bloco (OS que deixou de ser do técnico, com trabalho feito nela) continua para sempre na "Minhas OS" do técnico — o defeito #32 sobrevive justamente onde há dado. O F14 ("ação vira `synced` → próximo pull remove") só passa se o teste montar a linha **sem** passar pelo atualizador de conflito, isto é, passa por construção. Ramos 2 e 3 leem carimbos da linha que o fluxo de resolução não limpa.

### CRIT-6 · `bloqueia` · `dentro-do-bloco` — janela de corrida entre gravar a linha e enfileirar a ação; a regra do plano manda APAGAR ali, e "avaliar por linha na hora" não fecha um check-then-act
- **Evidência:** CRIT-OPUS-C acima. `updateStatus` (`work_order_repository.dart:257-259`; idem 331-333 e 389-391) faz `await saveWorkOrder(updated)` → `await saveTimelineEvent(…)` → `await _syncQueue.enqueue(action)`. Com o `enqueue` retido, a sonda mediu: linha `pending`, timeline com 1 evento, **fila vazia**, regra do §2.3 = **não retém**. O §2.3 diz textualmente que `syncStatus == pending` sem ação na fila "não é trabalho pendente" e "sai pela I2". Os demais caminhos de escrita têm o mesmo formato (grava a linha/evidência, depois `enqueue` — M13 l.235-609).
- **Motivo:** o `_reconcile` roda num `_pullInBackground` assíncrono, concorrente com toques do técnico. Se a varredura avaliar a OS nessa janela, apaga OS + timeline e, logo depois, a ação entra na fila apontando para um `local_id` que não existe mais: o atualizador (`sync_providers.dart:168-172`) não acha a linha, a tela de conflitos não tem OS para mostrar, e o evento de timeline local já foi. Além disso, mesmo sem essa janela, `await hasPendingWork(wo)` seguido de `await deleteWorkOrder(…)` é um check-then-act com um `await` no meio — uma ação enfileirada entre os dois não é vista. O R8/F18 do plano cobre só a ordem determinística "enfileirou antes da varredura"; não há exclusão mútua entre mutação e reconciliação no desenho, e o escopo proíbe tocar `lib/core/sync/**`. Corolário: o próprio head usa `syncStatus == pending` como proteção no upsert (`work_order_repository.dart:190-193`), e o plano o descarta como critério de retenção.

### CRIT-7 · `nota` · `dentro-do-bloco` — o atualizador do replay ressuscita a linha apagada
- **Evidência:** `sed -n 164,195p lib/core/sync/sync_providers.dart` → `loadWorkOrders()` … `await store.saveWorkOrder(next)`; `drift_work_order_local_store` grava por `INSERT OR REPLACE` (M12).
- **Motivo:** se o `deleteWorkOrder` cair entre o `loadWorkOrders` e o `saveWorkOrder` do atualizador, a linha volta sem timeline nem evidência. Não perde ação, mas produz linha órfã que a próxima reconciliação terá de tratar; o plano não lista essa interleaving (sync × reconciliação).

## Item 3 — critérios × mutações; paginação (GRAVADO)

### CRIT-8 · `bloqueia` · `dentro-do-bloco` — CA-1 passa por construção para 2 das 3 mutações que ele mesmo lista
- **Evidência:** sonda `tests/crit-opus-r1-ca1.test.ts` (serviço real em memória, as 3 vias do plano) →
  `assign userId: user=A operator=A` · `assign so perfil: user=null operator=PA` · `despacho: user=A operator=PA` ·
  `predicado completo: 3 · sem ramo assigned_user_id: 3 · sem ramo operator=userId: 3 · sem ramo operator=perfil: 2` · `# pass 1`.
- **Motivo:** o §6 afirma "remover um dos 3 ramos → a OS daquela via some → vermelho". Medido: só o ramo do perfil é necessário nas 3 vias; remover `assigned_user_id = userId` **ou** `assigned_operator_id = userId` mantém `total = 3` — o teste fica verde com o predicado mutilado. As vias que exigiriam cada ramo existem (OS por `userId` com `operator ≠ userId`: a via mista do CRIT-2; OS de despacho sem resolver: B9), mas não estão no CA-1. Critério que não distingue o predicado do seu mutante não prova o predicado.

### CRIT-9 · `ajuste` · `dentro-do-bloco` — CA-10: a mutação "`deleteWorkOrder` só em `work_orders`" não fica vermelha com o cenário descrito
- **Evidência:** sonda Flutter `test/crit_opus_r1_ca10_test.dart` (head) → `sementes=[wo-local-1, wo-local-2, wo-local-3] timeline={wo-local-1: 0, …} evidencia={wo-local-1: 0, …}` · `All tests passed!`. O CA-10/F1 monta o store com `InMemoryWorkOrderLocalStore(_seedOrders)` (§1b), que não tem linha filha.
- **Motivo:** `loadTimeline('wo-local-1')` é vazio **antes** da purga; o assert "timeline das sementes apagada" passa com ou sem o `DELETE` das tabelas filhas. Só o F16 (Drift, se semear as filhas) cobre a propriedade; o CA-10 declara uma mutação que não mata.

### CRIT-10 · `ajuste` · `dentro-do-bloco` — CA-5: a mutação "`count` sem o escopo" não existe no harness em que o B7 roda
- **Evidência:** `sed -n 360,365p tests/o6r07a-wo-object-scope.test.ts` → `withWorkOrderApi` força `CORE_SAAS_PERSISTENCE = "memory"` (o espelho declarado de B1-B10); `sed -n 291,306p work-order.repository.ts` → na memória `total = filtered.length`, a mesma cadeia dos itens; `sed -n 358,371p work-order-prisma.repository.ts` → só no Prisma há `findMany` e `count` separados.
- **Motivo:** o mutante "`count({ where: <sem escopo> })`" só é escrevível no Prisma; o B7 em memória não o executa, e o B11 (inspeção do `buildWhere`) não olha o `count`. O CA-5 só mede o que diz se rodar no job `backend-postgres` — o plano deixa isso "a critério do dev".

### CRIT-11 · `bloqueia` · `dentro-do-bloco` — paginação por `offset` + "completo = itens ≥ total" declara completo um pull que perdeu OS do técnico; a reconciliação apaga OS ainda dele
- **Evidência:** sonda `tests/crit-opus-r1-paginacao.test.ts` (150 OS de A, `limit=100`, uma OS da 1ª página reatribuída a B entre a página 1 e a 2; `?assignedUserId=A` como procuração do escopo) →
  `acumulado=149 total_ultima_pagina=149 criterio_completo(items>=total)=true verdade=149 OS_ainda_de_A_que_o_pull_nao_trouxe=1` · `# pass 1`.
- **Motivo:** a ordenação é `created_at desc, code desc` (`work-order-prisma.repository.ts:363-366`; memória idem por `createdAt`, l.567-568); quando uma OS sai do conjunto no meio do pull, tudo desliza uma posição e a OS da fronteira **nunca** é entregue, mas a contagem fecha. O §4.1 define o fim do pull por `items.length >= total` e o §4.2 trata esse pull como completo e **apaga** o que não veio (sem trabalho pendente). Reatribuir é justamente o evento deste bloco; num tenant ativo ele acontece durante pulls. Mesma família do CRIT-3: o aparelho perde OS que continua sendo do técnico, sem erro.

### CRIT-12 · `ajuste` · `dentro-do-bloco` — "teto 20 páginas → dados desatualizados" acumula histórico sem fim e trava a reconciliação para sempre
- **Evidência:** `sed -n 411,426p work-order.service.ts` → a lista não filtra status (o plano não acrescenta filtro); `grep -n "completed\|Concluid" work_order_list_screen.dart` → l.26 `_WoGroup.done => 'Concluidas'`, l.41 (o app consome histórico). O H5 diz "2 000 OS atribuídas a UM técnico … não há tenant real acima disso".
- **Motivo:** o `scope=assigned` devolve **todo** o histórico do técnico (concluídas, canceladas, aprovadas). Um guincheiro com ~10 OS/dia passa de 2 000 em ~200 dias de trabalho; daí em diante todo pull é "incompleto", nunca reconcilia (reatribuídas e conflitos nunca saem) e o selo "dados desatualizados" fica permanente — o estado deixa de significar algo. São também até 20 requisições sequenciais de 100 OS por pull, em rede móvel. A premissa do H5 pensa em OS abertas; o desenho pede todas. Respondendo ao mandato: o teto com estado de desatualizado é honesto contra fingir "completo", mas, sem recorte do conjunto que entra na reconciliação, ele vira o caminho normal de um técnico antigo, não uma borda.

### CRIT-13 · `nota` · `dentro-do-bloco` — CA-12 por ramos testa o ramo isolado, não o fluxo
- **Evidência:** CRIT-OPUS-B (item 2): o fluxo real põe a linha em `conflict` antes de a ação drenar.
- **Motivo:** um teste por ramo (F9-F13) com estado montado à mão não captura a interação ramo 1 × ramo 2 do CRIT-5; falta um teste que percorra replay → conflito → resolução → pull. Nota, porque a falha de fundo já está no CRIT-5.

## Conferência das correções C1–C4 do plano à medição (GRAVADO)
- **C1:** `sed -n 836,838p work-order.service.ts` → só `assignedOperatorId` (perfil ou `actor.userId`). **Correção confirmada.** O desdobramento que o plano tira dela ("lista ⊆ mutáveis" só falha por escrita direta no banco) é falso: CRIT-2.
- **C2:** `sed -n 181,205p work_order_repository.dart` → indexa `_orders`, pula `serverId == null`, só `saveWorkOrder`. **Confirmada.**
- **C3:** `drift_work_order_local_store.dart:187-190` → `clearAll` apaga `work_order_evidence`, `work_order_timeline`, `work_orders`; loader sem join. **Confirmada.**
- **C4:** `sed -n 578,588p sync_replay_service.dart` → `b107BackendWorkOrderActionTypes = {create, statusUpdate, assign}`. **Confirmada.** Consequência não dita pelo plano: as ações não replayadas (`approval_request`, `unable_to_start`) e as `rejected` (mapeadas para `failed`, `sync_replay_service.dart:507` e `:219-225`, sem caminho de descarte na tela — `sync_screen.dart:105-107` só resolve `conflict`) retêm a OS **indefinidamente** pelo ramo 1; o "some quando drenar" vale só para quem chega a `synced`.

## Veredito (GRAVADO)
| id | gravidade | escopo |
|---|---|---|
| CRIT-1 `OR` do escopo × `OR` do `search` no `buildWhere` | bloqueia | dentro-do-bloco |
| CRIT-3 resolver engole erro → 200 encolhido → purga no aparelho | bloqueia | dentro-do-bloco |
| CRIT-5 conflito resolvido não drena (ramos 2 e 3 retêm para sempre) | bloqueia | dentro-do-bloco |
| CRIT-6 janela grava-linha/enfileira e check-then-act sem exclusão | bloqueia | dentro-do-bloco |
| CRIT-8 CA-1 não mata 2 das 3 mutações que lista | bloqueia | dentro-do-bloco |
| CRIT-11 `offset` + "itens ≥ total" declara completo um pull que perdeu OS | bloqueia | dentro-do-bloco |
| CRIT-2 via mista REST quebra H2/CA-7 | ajuste | dentro-do-bloco |
| CRIT-4 `/approvals/pending` e `/operations/dispatches` fora da pendência | ajuste | pre-existente |
| CRIT-9 CA-10: mutação das tabelas filhas não mata | ajuste | dentro-do-bloco |
| CRIT-10 CA-5: mutação só existe no Prisma | ajuste | dentro-do-bloco |
| CRIT-12 histórico ilimitado × teto de 20 páginas | ajuste | dentro-do-bloco |
| CRIT-7 replay ressuscita linha apagada | nota | dentro-do-bloco |
| CRIT-13 CA-12 só por ramo isolado | nota | dentro-do-bloco |

**O que se sustenta:** o diagnóstico (M1-M20; sondas reproduzidas), impor no backend, a correção C1 (não pedir `assignedUserId=<eu>`), nenhuma purga em pull com erro, o isolamento por organização, e nada pendente **na fila** apagado na ordem determinística.
**O que cai:** o predicado no Prisma (CRIT-1); a noção de "pull completo" em que a purga confia (CRIT-3, CRIT-11); a promessa de drenagem que o dono aceitou na Q3 (CRIT-5); a não-perda sob concorrência (CRIT-6); e a capacidade de três critérios de separar o certo do mutante (CRIT-8, -9, -10).
Quem acha não conserta: nenhuma correção é proposta aqui (§C7.4-bis). Sondas deixadas para re-execução (P3): `san313-medicao/tests/crit-opus-r1-{backend,ca1,paginacao}.test.ts` (rodar com o gancho `--import <scratchpad>/hook/register.mjs --import <repo>/node_modules/tsx/dist/loader.mjs`, porque o `node_modules` da cópia está quebrado) e `san313-critica/flutter_app/test/crit_opus_r1{,_ca10}_test.dart`.

**VOLTA AO PLANO**

_Limpeza (§C5): removidos `.dart_tool/` e `build/` da cópia `san313-critica/flutter_app` (96 MB → 13 MB); fontes e sondas mantidas para re-execução (`flutter pub get --offline` antes de rodar). Nada rastreado foi tocado; o worktree `w-plan21` não foi alterado._
