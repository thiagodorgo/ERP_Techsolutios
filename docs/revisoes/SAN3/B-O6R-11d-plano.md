> **Versão no repositório (`dev-11d-cl`, 11/11):** cópia fiel do plano v2 do `B-O6R-11d` (`plano-B-O6R-11d-v2.md`, fora do repositório, em `erp-pausa-2026-10-03/planos/`), com a **Emenda 1** no fim. O **v1** (`plano-B-O6R-11d-api`, `erp-pausa-2026-10-03/planos/B-O6R-11d-plano.md`) é citado e não copiado: o v2 o substitui inteiro, e a tabela "Achado → resolução" abaixo diz o que mudou e por quê. A crítica r1 (`crit-11d-cl`) e a r2 (`crit-11d-r2-cl`) estão em `erp-pausa-2026-10-03/revisoes/crit-11d-*.json`. O ramo precursor `origin/fix/mobile-work-order-contracts` (PR #388, `a24f58b5`, fechado sem merge) é citado na CR2-11D-05 da Emenda 1.

# Plano do bloco B-O6R-11d, v2: contrato de OS entre o app e o backend (item 3 do portão, resto do Ω6R-QUA-004)

- **Autor:** `replano-B-O6R-11d-api`, planejador de topo. Rodou em Claude Opus 5.5 pela API, declarado pelo §C7.6-bis (o Fable está suspenso por ordem do dono). Identidade nova: não escrevi o v1 nem a crítica, e não escrevo código.
- **Entradas:** o plano v1 (`plano-B-O6R-11d-api`); a crítica `crit-11d-cl` (rodada 1, VOLTA, 11 achados, com a evidência `crit-11d-plano-evidencia.md`); `REGISTRO-PENDENTE.md` (decisões do dono até 11/11 01:34 SP).
- **Ref medida (§A7):** `/work` = `main` `d5ec169687960e7ced0446af5a2bf02d5e7f0d7d` (#522). Conferi `git rev-parse HEAD` antes de ler. Toda citação `arquivo:linha` abaixo foi lida nessa árvore. Este container não tem Flutter nem banco, e não rodei teste nenhum. As saídas de execução que cito são da crítica e vêm marcadas assim.
- **Fato × hipótese:** **FATO** = lido no código desta ref. **MEDIDO PELA CRÍTICA** = saída de execução registrada pela `crit-11d-cl`, que conferi por leitura e não re-executei. **PREVISÃO** = o dev confirma na F0. **LEITURA DO PLANEJADOR** = decisão minha, declarada (§A6).
- **Nível de revisão:** continua **junta completa** (§5).

---

## Achado → resolução no v2 → teste-dono → mutação

As mutações têm o texto **literal** da linha de origem. Onde a linha ainda não existe (código que a F1/F2 escrevem), o v2 **prescreve o texto exato** da linha (§2.2). Escolhi linhas que cabem em 80 colunas depois do `dart format` e que não se repetem no arquivo. A F3 confere a unicidade (`grep -cF` = 1) antes de cada mutação (§3, regra R-M).

| Achado (grav.) | Confirmado por leitura? | Como o v2 resolve | Teste-dono | Mutação (âncora única) |
|---|---|---|---|---|
| **CL11D-01** (ALTA): risco 2 falso; ação velha de viatura/equipe desfaz a troca de técnico, e o T9 do v1 abençoava | **Sim.** `assertTechnicianChangeAllowed` passa se a OS não começou (`work-order.service.ts:1842-1870`; `:1848` só olha alvo = técnico atual; `:1851-1855` só trava em `on_site`/`in_progress`/`paused` ou despacho em No local). O lote chama `service.assign` sem pré-condição (`mobile-work-order-sync.ts:232-243`) | O risco 2 sai. O derivar `user_id` **sem pré-condição** sai. A correção depende da **Q1** (§9). Com a recomendada (A), o app manda `expected_technician_id` e o servidor responde **conflito** quando o técnico atual é outro, sem gravar nada | **N5** (Node): lote velho depois da troca U→V → `conflict` `technician_changed_since_action`, a OS segue com V. **N6**: técnico ainda U → `accepted`, `assignedUserId = U`. **T9** (Flutter): o payload é igual ao `sync_assign_payload` da fixture | **MA1**: apagar a linha `      await assertExpectedTechnician(service, actor, assignId, action.payload.expected_technician_id);` → N5 vermelho. **M9b**: apagar `    if (userId != null) payload['expected_technician_id'] = userId;` → T9 vermelho |
| **CL11D-02** (MÉDIA): o apagamento de `assigned_user_id` é do contrato do servidor; §8.5 com hipótese errada; OS já apagadas | **Sim.** `work-order-prisma.repository.ts:559` (`assigned_user_id: input.userId ?? null`); `work-order.service.ts:1795-1796`; `frontend/src/modules/work-orders/work-orders.types.ts:273-276` (`userId?` opcional); `registry_assignment_section.dart:46-49` e `work_order_repository.dart:609-611` travam a seção sem `assignedUserId` | O diagnóstico da §1.3 é reescrito: a causa é do servidor (sem `userId` = apagar) e o app a dispara. A §8.5 é corrigida. Nova pendência `P-WO-ASSIGN-SEM-USERID-APAGA-USUARIO` (MÉDIA, dono `B-O6R-07c-b2`), com o reparo das OS já apagadas e a contagem antes da entrada em produção (§4.3). O bloco não muda a semântica do REST (decisão do 07c) | **N7** (Node, caracterização): REST `{operatorId}` sozinho → `assignedUserId = null`. É o fato registrado; fica verde e documenta a pendência. **N6** cobre o reparo pelo lote (técnico só em `assignedOperatorId` → o lote grava `assignedUserId`) | **MA2**: no N7, `const semUsuario = await assignRest(ctx, osId, { operatorId: tecnicoU });` → `const semUsuario = await assignRest(ctx, osId, { operatorId: tecnicoU, userId: tecnicoU });` → N7 vermelho (prova que ele mede a forma que apaga) |
| **CL11D-03** (MÉDIA): P2 falsa para 3 status (`pendingApproval`, `approved`, `exception` → 400) | **Sim.** `sync_replay_service.dart:886-895` (`_ => status`); `work-order.types.ts:6-17` | P2 reescrita. O REST manda só os status que o backend tem. Os sem equivalente (`pendingApproval`, `approved`, `exception` e `rejected`, ver CL11D-09) **não saem do aparelho**: `ArgumentError`, zero requisição. A fila continua igual a hoje (T10) e o resíduo fica na `P-MOBILE-CODEC-FILA-STATUS-CRU` (já existe, dono `B-SAN3-16`, índice `pendencias.md:11956`) | **T7**: para cada par de `rest_status_outbound` da fixture, o corpo capturado é `{'status': v}`. **T7b**: cada item de `rest_status_sem_equivalente` → `ArgumentError` e 0 requisições; e a união dos dois cobre os 12 `WorkOrderStatus.values`. **N4** (Node): todo valor de `rest_status_outbound` ∈ `WORK_ORDER_STATUSES` | **M7**: `data: {'status': apiStatus},` → `data: {'status': status.name},` (T7). **M7c**: `if (apiStatus == null) {` → `if (apiStatus == 'nunca') {` (T7b). **M7f** (fixture): `"arrived": "on_site",` → `"arrived": "arrived",` (N4 e T7) |
| **CL11D-04** (MÉDIA): segundo tradutor de status na linha do tempo (`_statusFromApi`) zera 6 de 10 | **Sim.** `work_order_remote_api.dart:366-372`, usado em `:390-391` | P1 passa a valer também para a linha do tempo: `fromStatus`/`toStatus` usam `workOrderStatusFromApiOrNull` do codec, e `_statusFromApi` é apagado. O "desconhecido vira `null`" da linha do tempo se mantém (`:364-365`). O `b127` segue verde porque o casamento pelo nome do app continua depois da tabela | **T12**: `fetchTimeline` com `toStatus` em cada um dos 10 status do backend → status do app correto e nunca `null`; `toStatus: 'futuro_x'` → `null` | **M16**: `toStatus: workOrderStatusFromApiOrNull(json['toStatus']),` → `toStatus: WorkOrderStatus.values.asNameMap()[json['toStatus']],` |
| **CL11D-05** (MÉDIA): mutações não executáveis (M1–M3 sem âncora, M12 ambígua, M9/M14 descritivas, N2 sem mutação, T10 "verde" impossível na F0) | **Sim** por leitura. As 3 chamadas do v1 eram textualmente iguais. A quebra de linha depois do `dart format` é **MEDIDA PELA CRÍTICA** | Cada método ganha uma variável com nome próprio (`detail`, `updated`, `assigned`). A fixture tem um `customerName` diferente em cada resposta, e o N3 lê as três. M9, M14 e MA1 viram texto literal. O N2 ganha mutação (M11b). A F0 traz o esqueleto do codec com `throw UnimplementedError`, e o vermelho-controle declarado é esse. A regressão "a fila não mudou" passa a ter um teste que é **verde já na F0** (T10b, pelo `SyncReplayService` real) | **T1–T3, N2, N3, T10, T10b, G1** | **M1** `final detail = _unwrapData(resp);` → `final detail = resp.data!;` · **M2** `final updated = _unwrapData(resp);` → `final updated = resp.data!;` · **M3** `final assigned = _unwrapData(resp);` → `final assigned = resp.data!;` · **M12** apagar `"customerName": "Cliente Status",` · **M11b** apagar `"user_id": "00000000-0000-4000-8000-000000000a01",` da fixture (N2 e T9) |
| **CL11D-06** (MÉDIA): a fixture não amarra o que o app emite | **Sim** (v1 §2.2 e §3: nenhum T compara com a fixture; `rest_status_request` sem consumidor) | Os três corpos que o app emite (PATCH status, POST assign, lote assign) são capturados nos testes Flutter e comparados **por igualdade** com a seção da fixture. O Node aplica **as mesmas seções** ao backend real em memória. `rest_status_request` vira `rest_status_outbound` + `rest_status_sem_equivalente`, com consumidor dos dois lados | **T7, T8, T9** (Flutter, `equals(fixture[...])`) e **N1, N2, N4** (Node) | **M8** `'userId': userId,` → `'user_id': userId,` (T8) · **M11** fixture `"userId": ` → `"user_id": ` em `rest_assign_request` (N1 e T8) · M7f e M11b acima |
| **CL11D-07** (MÉDIA): colisão não declarada com o `B-SAN3-26` e dependência de ordem | **Parcial.** A ordem `11` antes de `SAN3-26` já está na frente 4 (`PLANO_SAN3.md:376`). O PERMITIDO do 26 é **MEDIDO PELA CRÍTICA** no plano dele, que não está nesta árvore | Trava declarada: o `B-SAN3-26` não edita `work_order_remote_api.dart`, `sync_replay_service.dart` nem `b103_work_order_sync_test.dart` antes do merge do 11d. Se já tiver ramo, faz rebase depois do merge e **re-mede por emenda** as mutações dele ancoradas em `_workOrderFromRemoteJson`, `_statusPayload` e `_backendStatus` (`D-EMENDA-ANTES-DO-CODIGO`). A dependência de produto ("No local pela base", `D-PORTAO-9-RECOMENDACOES-1011`) passa a ser critério: `on_site` aparece como "No local" na lista e na linha do tempo | **T5** (caso `on_site` → `arrived`) e **T12** (`on_site`); registro na F4 (`rg -n "B-O6R-11d" agent-orchestration/docs/status-geral.md` mostra a trava) | **M5b** apagar `  'on_site': WorkOrderStatus.arrived,` do codec → T5 e T12 vermelhos |
| **CL11D-08** (BAIXA): P3 diz "sessão ou chamador", mas o T11 aceita `''` no detalhe | **Sim.** `:382-383` (precedente da linha do tempo, que não grava na tabela de OS); 0 chamadores (`grep` abaixo) | P3 reescrita com a verdade: a organização **nunca vem do corpo**. Na lista ela é a da sessão. Nos 3 métodos de OS única ela volta **vazia por contrato** (a interface não recebe organização, e mudá-la quebraria 6 dublês, `grep -rln "implements WorkOrderRemoteApi" test` = 5 arquivos + o stub). A **guarda G1(e)** falha se algum arquivo de `lib/` chamar esses métodos, e quem ligar o primeiro chamador tem de decidir a organização no plano dele. Pendência `P-MOBILE-OS-UNICA-SEM-ORGANIZACAO` (BAIXA, dono: o primeiro bloco que ligar um desses métodos a uma tela) | **T11** (lista: sessão; detalhe: `''`, nunca `org-intrusa`) e **G1(e)** | **M13** `tenantId: fallbackTenantId,` → `tenantId: strOpt('tenantId', 'tenant_id') ?? fallbackTenantId,` (T11) · **M14e**: acrescentar em `work_order_repository.dart` (só na cópia de mutação) a linha `// remoteApi.fetchWorkOrder(` → G1(e) vermelha |
| **CL11D-09** (BAIXA): `rejected` tem dois sentidos | **Sim.** Backend: `rejected: []`, terminal (`work-order.validators.ts:31`). App: `rejected` não é final (`work_order_models.dart:62-65`) e tem saída para `inService` (`:85`) | **LEITURA DO PLANEJADOR:** entrada `rejected → rejected` (o rótulo "Rejeitada" está certo para "o técnico recusou"), registrada como colisão conhecida. Saída: o REST **não** manda `rejected`, porque o `rejected` do app é "aprovação negada" e no servidor encerraria a OS. Pela lista não chega (`openOnly`). O resíduo da tela ("Rejeitada" oferece retomar) fica na pendência `P-MOBILE-REJECTED-DOIS-SENTIDOS` (BAIXA, dono `B-SAN3-16`, que cuida do fluxo de aprovação na fila) | **T14**: entrada `rejected` → `WorkOrderStatus.rejected`; `updateWorkOrderStatus(id, rejected)` → `ArgumentError` e 0 requisições (está em `rest_status_sem_equivalente`) | **M14r**: no codec, acrescentar `  'rejected': 'rejected',` ao `_statusToBackend`, logo depois de `  'cancelled': 'cancelled',` → T14 e T7b vermelhos |
| **CL11D-10** (BAIXA): o lote de viatura/equipe dá conflito a partir de `accepted` | **Sim.** `work-order.validators.ts:21-32` + `assertStatusTransition` `:149-158` (`assigned→assigned` passa por `from === to`); `work-order.service.ts:1818` | A pendência é reescrita: `P-O6R-11D-REGISTRY-ASSIGN-REABRE-STATUS` vale para `accepted`, `on_route`, `on_site`, `in_progress` e `paused` (só `open`/`assigned` gravam), e o "toda vez" da §1.3 vira "com a OS em `open` ou `assigned`" | **N8** (Node, caracterização da pendência): lote de viatura/equipe com a OS em `accepted` → `conflict` `invalid_status_transition` | **M-N8**: no N8, `status: "accepted"` → `status: "assigned"` na linha `await setStatus(ctx, osId, { status: "accepted" });` → N8 vermelho (o lote passa a ser aceito) |
| **CL11D-11** (BAIXA): `pendencias-indice.md` fora do PERMITIDO | **Sim** (`agent-orchestration/controle/gerar-indice-pendencias.py:119` grava o índice) | Entra no PERMITIDO, **só pela saída do gerador**. Critério: rodar o gerador depois da F4 não deixa diff | `python3 agent-orchestration/controle/gerar-indice-pendencias.py && git diff --exit-code agent-orchestration/controle/pendencias-indice.md` | **M-IDX**: acrescentar uma linha em branco no fim de `pendencias-indice.md` → o critério sai com código 1 |

**Perguntas ao dono: 1 (Q1, §9).** Ela decide como a F2 trata o lote. F0, F1, F3 (para as mutações de F1) e a parte de registro da F4 independem dela.

---

## 0. Resumo para o dono

1. O item 3 do portão está **meio fechado**: a metade "material do prestador some" fechou no #483. Falta "o app lê errado a resposta da OS e manda o campo errado na atribuição".
2. No app, abrir a OS, mudar o status e atribuir leem a resposta no formato errado e quebram. Nenhuma tela usa essas três chamadas hoje, então o defeito está dormindo. **Vivos:** a lista "Minhas OS" mostra como **"Agendada"** toda OS em rota, no local ou em andamento; a linha do tempo perde o status desses mesmos 6 casos; e a OS "urgente" aparece "Normal".
3. **O que a crítica mudou.** Definir viatura ou equipe pelo app apaga o técnico gravado na OS. O v1 consertava isso mandando o técnico de volta. A crítica provou que isso tem um efeito ruim: se a gestão trocou o técnico enquanto o celular estava sem sinal, o envio atrasado **desfaz a troca em silêncio** e devolve a OS ao técnico antigo, com cara de legítima. Isso é permissão: decide quem pode mexer na OS. Por isso há **1 pergunta para você (Q1)**. A minha recomendação é o servidor recusar o envio atrasado como conflito, para decisão manual, quando o técnico mudou.
4. O resto fica no app: um tradutor único para status e prioridade (lista, detalhe e linha do tempo), a resposta lida no formato certo, e o app deixa de mandar status que o servidor recusa.
5. Junta completa (permissão, perda de dado, isolamento).
6. Esforço: cerca de 5 h de dev com a Q1 em A (4 h sem a parte de servidor). Continua 1 PR.

---

## 1. O estado de hoje (medido; o item continua ABERTO)

**Registro (FATO):** `agent-orchestration/controle/pendencias.md:3458-3459`: o `Ω6R-QUA-004` "segue ABERTA com escopo reduzido (envelope/casing e 'assign envia campo não lido'), dono `B-O6R-11d`". O critério de encerramento é `docs/revisoes/SAN3/PLANO_SAN3.md:292`: "Dio fake com `{data:{…}}` → detalhe/status/assign corretos; assign envia o campo que o backend lê".

### 1.1 Como o backend responde e o que ele lê (FATO)
- Toda rota de OS responde `{ data: ... }` (`src/modules/work-orders/work-order.routes.ts:290`). O DTO é camelCase e não emite organização (`work-order.dto.ts:36` em diante).
- Status: `open, assigned, accepted, on_route, on_site, in_progress, paused, completed, cancelled, rejected` (`work-order.types.ts:6-17`). Prioridade: `low, medium, high, urgent` (`:19`). Transições: `work-order.validators.ts:21-32`; `rejected` é terminal (`:31`).
- `POST /:id/assign` lê `body.operatorId ?? body.userId`, `body.userId` e `body.message` (`work-order.service.ts:1795-1799`). Sem nenhum dos dois → 400 `required_field` (`work-order.validators.ts:235-236`).
- O lote `work_order.assign` lê `operator_id`, `user_id`, `vehicle_id`, `team_id` e `message` (`src/modules/mobile/mobile-work-order-sync.ts:232-243`). Ele não valida chaves extras do payload (`parseAction`, `:192-210`). Um 409 vira `conflict` por ação (`:334-352`, `isConflictError` `:510-517`).
- O repositório grava `assigned_user_id: input.userId ?? null` e força `status: "assigned"` (`work-order-prisma.repository.ts:558-563`). **Sem `userId`, o servidor apaga o usuário atribuído, venha a chamada de onde vier** (CL11D-02). O tipo da web admite essa forma (`frontend/src/modules/work-orders/work-orders.types.ts:273-276`, `userId?` opcional). A definição não tem chamador (MEDIDO PELA CRÍTICA, `git grep assignWorkOrder -- frontend/src`).
- **A trava de troca de técnico** (`work-order.service.ts:1842-1870`) deixa passar quando o alvo é o técnico atual (`:1848`) **ou quando o atendimento não começou** (`:1851-1855`). Antes de "No local", qualquer atribuição troca o técnico na hora. É a leitura declarada `D-07CB1-TRAVA-ATE-B2` (`agent-orchestration/controle/decisoes.md:3719`), coberta pelo `tests/o6r07c-b-scope.test.ts:714-757` (controle positivo, inclusive para o lote, `:752-756`).

### 1.2 O que está quebrado no app (FATO, `mobile/flutter_app/lib/features/work_orders/data/work_order_remote_api.dart`)
| # | Onde | Defeito |
|---|---|---|
| D1 | `:171` `fetchWorkOrder` | `_workOrderFromJson(resp.data!)` recebe o envelope inteiro |
| D2 | `:185-187` `updateWorkOrderStatus` | mesmo envelope; manda `status.name` no vocabulário do app |
| D3 | `:222-228` `assignWorkOrder` | mesmo envelope; manda `user_id`/`note`, que o REST não lê → 400 |
| D4 | `:295-325` `_workOrderFromJson` | casts duros em snake_case, inclusive `tenant_id` (`:299`), que o DTO não emite |
| D5 | `:327-336` `workOrderStatusFromApiValue` | casa pelo nome do app; 6 dos 10 status do backend viram `scheduled` (lista viva, `:277`) |
| D6 | `:278-281` | prioridade por nome: `urgent` → `normal` |
| D7 | `:270` | a organização pode vir do corpo (`strOpt('tenantId','tenant_id')`), o que viola o §2.8 |
| **D8** (novo, CL11D-04) | `:366-372` `_statusFromApi`, usado em `:390-391` | segundo tradutor, por nome do app: na linha do tempo, `toStatus`/`fromStatus` dos 6 status `open…in_progress` viram `null` (MEDIDO PELA CRÍTICA) |
| **D9** (novo, CL11D-03) | `sync_replay_service.dart:886-895` | `pendingApproval`, `approved` e `exception` saem crus e o backend responde 400 (MEDIDO PELA CRÍTICA). Na fila isso já é a `P-MOBILE-CODEC-FILA-STATUS-CRU` (dono `B-SAN3-16`) |

Chamadores fora do arquivo: `grep -rn "\.assignWorkOrder\|\.updateWorkOrderStatus\|\.fetchWorkOrder(" mobile/flutter_app/lib` → 0 (FATO, conferido pela crítica e por mim).

### 1.3 O lote de viatura/equipe (FATO, reescrito pelo CL11D-01, 02 e 10)
- Produtor único: `_assignRegistryLocked` (`work_order_repository.dart:598-646`). Ele lança erro sem `assignedUserId` local (`:609-611`) e enfileira `'operator_id': operatorId` (`:631`), que é o `assignedUserId` local. Pelo `git log -S` da crítica, isso vale em toda versão desde o #139.
- `_assignPayload` (`sync_replay_service.dart:849-876`) repassa `operator_id` e não emite `user_id` (`:857`, `:870`).
- **Efeito 1, perda de dado:** com a OS em `open`/`assigned`, o servidor grava `assigned_operator_id = U` e **`assigned_user_id = null`** (CL11D-02: a causa é o contrato do servidor). Em `accepted` ou depois, o lote recebe 409 `invalid_status_transition` e nada grava (CL11D-10; `assertStatusTransition`, `work-order.validators.ts:149-158`).
- **Efeito 2, permissão (CL11D-01):** a ação carrega o técnico que o aparelho conhecia **no momento em que a enfileirou**. Se a gestão trocou o técnico (U→V) antes do envio e o atendimento não começou, a trava deixa passar (§1.1) e o envio **devolve a OS a U** em `assigned_operator_id`, que é a entrada de `assertMutationObjectScope` (`work-order.service.ts:919-921`). Hoje o estrago aparece, porque `assignedUserId` fica vazio. O conserto do v1 (mandar `user_id = operator_id`) o deixaria **completo e com cara de legítimo** (MEDIDO PELA CRÍTICA: `final user=U(antigo) operator=U(antigo)`).
- O lote não amplia RBAC: o técnico de campo é recusado nos dois corpos (MEDIDO PELA CRÍTICA, 1(b)).

**Conclusão:** o item NÃO fechou. Sigo.

---

## 2. Desenho

### 2.1 As propriedades (reescritas)
- **P1, leitura:** toda resposta de OS que o app lê (lista, detalhe, status, atribuição **e linha do tempo**) é interpretada na forma que o backend emite. O envelope `{data}` é desembrulhado e o camelCase do DTO é lido. Status e prioridade passam por **um** tradutor, o codec. Não há segundo parser em snake_case nem segundo tradutor de status.
- **P2, escrita (corrigida):** todo corpo que o app envia para escrever numa OS leva só chaves que o backend lê, com o sentido que ele lhes dá. Pelo REST, **só sai status que existe no backend**; status sem equivalente é recusado no aparelho, sem requisição. A fila de status fica **idêntica a hoje** (o resíduo é a `P-MOBILE-CODEC-FILA-STATUS-CRU`, `B-SAN3-16`).
- **P2-bis, atribuição sem regressão de permissão (nova, CL11D-01):** um envio atrasado da fila **nunca troca o técnico** de uma OS cujo técnico mudou depois de a ação nascer. Sem isso, o bloco não pode mandar `user_id` pelo lote. Como garantir é a **Q1**.
- **P3, organização (corrigida):** a organização da OS **nunca vem do corpo** da resposta. Na lista, é a da sessão. Nos 3 métodos de OS única, volta vazia **por contrato**, e uma guarda impede ligar esses métodos sem decidir a organização.

### 2.2 Onde cada uma mora (texto prescrito das linhas que são âncora de mutação)

**Codec, arquivo novo `mobile/flutter_app/lib/core/network/work_order_api_codec.dart`.** Ele importa `../../features/work_orders/domain/work_order_models.dart`. Há precedente de `core/` importando `features/` (`lib/core/local_db/drift_work_order_local_store.dart`, `lib/core/sync/sync_providers.dart`).
```dart
const Map<String, WorkOrderStatus> _statusFromBackend = {
  'open': WorkOrderStatus.scheduled,
  'assigned': WorkOrderStatus.dispatched,
  'accepted': WorkOrderStatus.dispatched,
  'on_route': WorkOrderStatus.enRoute,
  'on_site': WorkOrderStatus.arrived,
  'in_progress': WorkOrderStatus.inService,
  'paused': WorkOrderStatus.paused,
  'completed': WorkOrderStatus.completed,
  'cancelled': WorkOrderStatus.cancelled,
  'rejected': WorkOrderStatus.rejected,
  'pending_approval': WorkOrderStatus.pendingApproval,
};

/// null = desconhecido (a linha do tempo exige; nunca um palpite).
WorkOrderStatus? workOrderStatusFromApiOrNull(Object? value) { ... }
// corpo: tabela acima; depois casamento pelo NOME do app (cache local, b109, b127); senão null.

WorkOrderStatus workOrderStatusFromApi(Object? value) =>
    workOrderStatusFromApiOrNull(value) ?? WorkOrderStatus.scheduled;

const Map<String, String> _statusToBackend = {
  'scheduled': 'open',
  'dispatched': 'assigned',
  'enRoute': 'on_route',
  'arrived': 'on_site',
  'inService': 'in_progress',
  'paused': 'paused',
  'completed': 'completed',
  'cancelled': 'cancelled',
};

/// REST: null = sem equivalente no backend (pendingApproval, approved, exception, rejected).
String? workOrderStatusToApiOrNull(String appName) => _statusToBackend[appName];

/// Fila: IDÊNTICO ao `_backendStatus` de d5ec1696 (passa cru o que não tem tradução).
String workOrderStatusNameToApi(String appName) =>
    _statusToBackend[appName] ?? appName;

WorkOrderPriority workOrderPriorityFromApi(Object? value) { ... }
// low→low, medium→normal, high→high, urgent→critical (linha: `  'urgent': WorkOrderPriority.critical,`),
// depois o nome do app, senão normal.
```
- O `orElse: scheduled` (via `workOrderStatusFromApi`) fica só para status **futuro**, com a pendência `P-MOBILE-STATUS-DESCONHECIDO-VIRA-AGENDADA` (`pendencias.md:11954`).
- **`rejected` (CL11D-09), LEITURA DO PLANEJADOR:** na entrada, `rejected → rejected`; na saída do REST, sem equivalente (§Achados).

**`work_order_remote_api.dart`:**
- `workOrderStatusFromApiValue` continua exportado (o `b109_approval_state_regression_test.dart` o importa) e passa a ser `=> workOrderStatusFromApi(value);`.
- Desembrulho, sem `TypeError` e sem tipo novo de erro. `ApiError` é `sealed` (`lib/core/network/api_error.dart:1`): uma subclasse nova quebraria `switch` exaustivos e o arquivo não está no escopo. **LEITURA DO PLANEJADOR:** usar `ApiServerError`.
  ```dart
  Map<String, dynamic> _unwrapData(Response<Map<String, dynamic>> resp) {
    final data = resp.data?['data'];
    if (data is Map<String, dynamic>) return data;
    throw ApiServerError(
      statusCode: resp.statusCode ?? 0,
      safeMessage: 'Resposta inesperada do servidor.',
    );
  }
  ```
- Os 3 métodos, cada um com a **sua** variável (âncoras M1–M3):
  - `fetchWorkOrder`: `      final detail = _unwrapData(resp);` e `      return _workOrderFromRemoteJson(detail, fallbackTenantId: '');`
  - `updateWorkOrderStatus`: antes da requisição, `      final apiStatus = workOrderStatusToApiOrNull(status.name);` e `      if (apiStatus == null) {` → `throw ArgumentError.value(status, 'status', 'sem equivalente no servidor');` (`ArgumentError`, porque é erro de quem chama: 0 chamadores hoje). O corpo é `        data: {'status': apiStatus},`, e depois `      final updated = _unwrapData(resp);` e `return _workOrderFromRemoteJson(updated, fallbackTenantId: '');`
  - `assignWorkOrder`: o corpo é `'userId': userId,` mais `if (...) 'message': normalizedNote,`; depois `      final assigned = _unwrapData(resp);` e `return _workOrderFromRemoteJson(assigned, fallbackTenantId: '');`
- `_workOrderFromRemoteJson`: `    tenantId: fallbackTenantId,` (sem ler o corpo), `    status: workOrderStatusFromApi(json['status']),` e `    priority: workOrderPriorityFromApi(json['priority']),`.
- `_workOrderFromJson` (`:295-325`) e `_statusFromApi` (`:366-372`) são **apagados**.
- Linha do tempo: `    fromStatus: workOrderStatusFromApiOrNull(json['fromStatus']),` e `    toStatus: workOrderStatusFromApiOrNull(json['toStatus']),`.
- As interfaces não mudam. Os dublês que implementam `WorkOrderRemoteApi` (5 arquivos de teste + o stub, `grep -rln "implements WorkOrderRemoteApi"`) continuam compilando.

**`sync_replay_service.dart` (F2):**
- `_backendStatus` (`:886-895`) vira `  String _backendStatus(String status) => workOrderStatusNameToApi(status);`. O resultado é idêntico para os 12 valores (T10, T10b).
- `_assignPayload` (`:849-876`) **depende da Q1**. Com a recomendação A:
  ```dart
      final operatorId = _readNonEmptyString(source['operator_id']);
      final userId = _readNonEmptyString(source['user_id']) ?? operatorId;
      ...
      if (operatorId != null) payload['operator_id'] = operatorId;
      if (userId != null) payload['user_id'] = userId;
      if (userId != null) payload['expected_technician_id'] = userId;
  ```
  A derivação na hora do envio cobre também as ações **já enfileiradas** (o repositório, trava do SAN3-14/15/16, não é tocado). O `expected_technician_id` é id de usuário: não é organização, token nem caminho (§2.8).

**Backend, `src/modules/mobile/mobile-work-order-sync.ts` (só com a Q1 em A; F2):**
```ts
    if (action.type === "work_order.assign") {
      requireActionPermission(actor, action, "work_orders:assign");
      const assignId = parseRequiredString(action.payload.work_order_id, "work_order_id");
      await assertExpectedTechnician(service, actor, assignId, action.payload.expected_technician_id);
      const workOrder = await service.assign(actor, assignId, { /* igual a hoje */ });
```
```ts
// B-O6R-11d (CL11D-01) — pré-condição DECLARADA pelo app: a ação de viatura/equipe só vale se o técnico da OS
// ainda é o que o aparelho conhecia. Sem a chave, nada muda (web, testes do 07c, apps antigos).
async function assertExpectedTechnician(service: WorkOrderService, actor: AuthenticatedActor, workOrderId: string, expected: unknown): Promise<void> {
  if (expected === undefined) return;
  const current = await service.get(actor, workOrderId);
  const technician = current.assignedUserId ?? current.assignedOperatorId ?? null;
  if (typeof expected === "string" && technician === expected) return;
  throw new WorkOrderError(409, "WORK_ORDER_TECHNICIAN_CHANGED", "technician_changed_since_action", "O técnico desta OS mudou depois do envio; confira antes de reenviar.");
}
```
- O `WorkOrderError` já está importado (`mobile-work-order-sync.ts:4-10`), e `service.get` é público (`work-order.service.ts:847`). O 409 cai no `isConflictError` e vira `conflict` com `next_action: "refresh_work_order_and_retry"` (`:334-352`). No app, a ação vai para `SyncStatus.conflict`, com decisão manual pela regra de conflito do B-107. O texto que aparece é o padrão de hoje, "Conflito remoto exige decisão manual." (`sync_replay_service.dart:644`): nenhum texto novo de UI.
- Fail-closed: chave presente e diferente, `null`, vazia ou de outro tipo → conflito. OS sem técnico no servidor e chave presente → conflito.
- A pré-condição **só restringe**: nenhum papel ganha poder, e a trava do 07c continua inteira. A OS cujo `assigned_user_id` já foi apagado (técnico U só em `assigned_operator_id`) passa, porque `technician = U`, e o lote **repara** o `assigned_user_id` (N6).
- **Risco declarado:** há uma janela entre `get` e `assign` (TOCTOU). É a mesma classe da trava do REST (`assign` lê `current` e depois escreve). Não há transação nova.

**Fixture compartilhada `mobile/flutter_app/test/features/work_orders/bo6r11d_work_order_contract.json`:**
- `detail_response`, `status_response`, `assign_response`: `{data: <chaves de toWorkOrderDto>}`, com `customerName` **diferente em cada uma** (`"Cliente Detalhe"`, `"Cliente Status"`, `"Cliente Atribuicao"`) e status `in_progress`, `on_site` e `assigned`; prioridade `urgent`.
- `rest_status_outbound`: o mapa das 8 entradas de `_statusToBackend`, uma por linha (âncora `"arrived": "on_site",`).
- `rest_status_sem_equivalente`: `["pendingApproval", "approved", "exception", "rejected"]`.
- `rest_assign_request`: `{"userId": "<uuid U>", "message": "..."}`.
- `sync_assign_payload` (sem `metadata`): `work_order_id`, `operator_id`, `user_id` (`"user_id": "00000000-0000-4000-8000-000000000a01",`, âncora de M11b, UUID de teste fixo) e `expected_technician_id`, todos com o mesmo U, mais `vehicle_id` e `message`. **Com a Q1 em C,** saem `user_id` e `expected_technician_id`.

- Os dois lados leem as **mesmas seções**, no sentido da leitura e no da escrita. É o precedente `bo6r03b`, agora estendido ao sentido app → servidor (CL11D-06).

### 2.3 Alternativas rejeitadas
- Apagar os 3 métodos REST mortos: contraria o critério literal do `PLANO_SAN3.md:292` e mudaria a interface que os dublês implementam.
- Passar a organização da sessão aos 3 métodos por parâmetro da interface: quebra os dublês, e editar teste existente é proibido (§4.2). Fica a guarda G1(e).
- As alternativas da Q1 estão na §9.

---

## 3. Critérios de aceite

**Regra R-M (mutações):** cada mutação é aplicada **isolada** numa cópia de trabalho. Antes de aplicar, o dev roda `grep -cF '<texto de origem>' <arquivo>` e grava a saída, que tem de ser `1`; outro número é emenda, não interpretação. Depois roda o teste-dono, que tem de ficar **vermelho**, e confere que volta ao verde depois de reverter. Saída e código de saída vão no diário. Se uma mutação não deixar nada vermelho, o teste está fraco e o bloco não está pronto.

**Vermelho-controle (F0):** o codec da F0 é um **esqueleto em que toda função é `=> throw UnimplementedError('B-O6R-11d F1');`**. Os testes que dependem dele ficam vermelhos com `UnimplementedError`, e é isso que se declara (não "verde"). O T10b não usa o codec, e é a regressão que fica **verde já na F0**.

Os testes Flutter ficam em `mobile/flutter_app/test/features/work_orders/`. Os Node ficam em `tests/` e rodam com `CORE_SAAS_PERSISTENCE=memory` (como o `scripts/run-backend-tests.mjs:29-42` faz).

| Prop. | Teste-dono | Mutação literal | Vermelho-controle (PREVISÃO em `d5ec1696` + esqueleto F0) |
|---|---|---|---|
| P1 | `bo6r11d_contrato_rest_test.dart` **T1** detalhe `detail_response` → id, código, cliente "Cliente Detalhe", `assignedUserId`, `inService`, `critical` | **M1** `final detail = _unwrapData(resp);` → `final detail = resp.data!;` | `TypeError` (`:297`) |
| P1 | **T2** status: `status_response` → `arrived`, "Cliente Status" | **M2** `final updated = _unwrapData(resp);` → `final updated = resp.data!;` | `TypeError` |
| P1 | **T3** assign: `assign_response` → `assignedUserId`, `dispatched` | **M3** `final assigned = _unwrapData(resp);` → `final assigned = resp.data!;` | `TypeError` |
| P1 | **T13** resposta sem envelope (DTO cru) nos 3 métodos → `ApiServerError`, nunca `TypeError` | **M15** `if (data is Map<String, dynamic>) return data;` → `return data as Map<String, dynamic>;` | `TypeError` |
| P1 | `bo6r11d_codec_test.dart` **T4** os 10 status do backend + `pending_approval` traduzem; nomes do app (`approved`, `inService`) seguem; `'futuro_x'` → `scheduled` em `FromApi` e `null` em `FromApiOrNull` | **M4** apagar `  'in_progress': WorkOrderStatus.inService,` | `UnimplementedError` |
| P1 | **T6** prioridade: `urgent→critical`, `medium→normal`, `low`, `high` | **M6** apagar `  'urgent': WorkOrderPriority.critical,` | `UnimplementedError` |
| P1 | **T14** `rejected` entra como `rejected` (CL11D-09) | ver M14r (P2) | `UnimplementedError` |
| P1 | `bo6r11d_lista_e_linha_do_tempo_test.dart` **T5** lista pelo `DioWorkOrderRemoteApi` real com adaptador falso (padrão `bsan313_minhas_os_escopo_test.dart:83-86`): `in_progress`/`urgent` → `inService`/`critical`; `on_site` → `arrived` | **M5** `status: workOrderStatusFromApi(json['status']),` → `status: WorkOrderStatus.values.asNameMap()[json['status']] ?? WorkOrderStatus.scheduled,` · **M5b** apagar `  'on_site': WorkOrderStatus.arrived,` | `scheduled`/`normal` (MEDIDO PELA CRÍTICA) |
| P1 | **T12** linha do tempo (padrão `b127_timeline_remota_test.dart:54-58`): `toStatus` em cada um dos 10 status do backend → status certo, nunca `null`; `'futuro_x'` → `null` | **M16** `toStatus: workOrderStatusFromApiOrNull(json['toStatus']),` → `toStatus: WorkOrderStatus.values.asNameMap()[json['toStatus']],` | `null` em 6 de 10 (MEDIDO PELA CRÍTICA) |
| P1 | `tests/b-o6r-11d-work-order-contract.test.ts` **N3**: as chaves de `detail_response.data`, `status_response.data` e `assign_response.data` == as chaves de `toWorkOrderDto(amostra)`; status ∈ `WORK_ORDER_STATUSES`, prioridade ∈ `WORK_ORDER_PRIORITIES` | **M12** apagar `"customerName": "Cliente Status",` | novo |
| P2 | **T7** para cada par de `rest_status_outbound`: corpo PATCH capturado `equals({'status': v})` | **M7** `data: {'status': apiStatus},` → `data: {'status': status.name},` · **M10** (codec) `'arrived': 'on_site',` → `'arrived': 'arrived',` | manda o nome do app (`:185`) |
| P2 | **T7b** cada item de `rest_status_sem_equivalente` → `ArgumentError` e **0** requisições no adaptador; `rest_status_outbound.keys ∪ sem_equivalente` == os 12 nomes de `WorkOrderStatus.values` | **M7c** `if (apiStatus == null) {` → `if (apiStatus == 'nunca') {` · **M14r** acrescentar `  'rejected': 'rejected',` depois de `  'cancelled': 'cancelled',` em `_statusToBackend` | hoje manda e o servidor responde 400 (MEDIDO PELA CRÍTICA) |
| P2 | **N4** todo valor de `rest_status_outbound` ∈ `WORK_ORDER_STATUSES` | **M7f** fixture `"arrived": "on_site",` → `"arrived": "arrived",` | novo |
| P2 | **T8** corpo do POST assign `equals(fixture.rest_assign_request)` (mesmo `userId` e `message`) | **M8** `'userId': userId,` → `'user_id': userId,` · **M8b** `'message': normalizedNote,` → `'note': normalizedNote,` | manda `user_id`/`note` (`:223-225`) |
| P2 | **N1** `rest_assign_request` aplicado ao `WorkOrderService` em memória (padrão `tests/work-orders.test.ts:58-65`) → `assignedUserId == userId`, evento com a `message` | **M11** fixture `"userId": ` → `"user_id": ` | 400 `required_field` (MEDIDO PELA CRÍTICA) |
| P2 | `bo6r11d_sync_assign_test.dart` **T10b** (regressão, **verde na F0**): `SyncReplayService` real + `CaptureWorkOrderBatchApi` (`sync_replay_service.dart:685-696`), uma ação `statusUpdate` por `WorkOrderStatus` → `payload['status']` igual à tabela literal de `d5ec1696:sync_replay_service.dart:886-895` | **M10b** `String _backendStatus(String status) => workOrderStatusNameToApi(status);` → `String _backendStatus(String status) => status;` | verde (F0 e depois) |
| P2 | `bo6r11d_codec_test.dart` **T10** `workOrderStatusNameToApi` == a mesma tabela literal, para os 12 | M10 (acima) | `UnimplementedError` (F0, declarado) |
| P2-bis | **T9** produtor real `assignRegistry` → `CaptureWorkOrderBatchApi` → `payload` sem `metadata` `equals(fixture.sync_assign_payload)`; ação legada sem `user_id` → mesma forma | **M9** apagar `    if (userId != null) payload['user_id'] = userId;` · **M9b** (Q1=A) apagar `    if (userId != null) payload['expected_technician_id'] = userId;` · **M11b** apagar a linha `"user_id": …` da fixture | sem `user_id` (`:869-873`) |
| P2-bis | **T9c** (regressão da regra B-107) `DioWorkOrderSyncBatchApi` real sobre adaptador falso que devolve `conflicts: [{client_action_id, conflict: {conflict_type: 'technician_changed_since_action'}}]` → resultado `conflict` com `errorCode == 'technician_changed_since_action'`; no `SyncReplayService`, a ação fica em `SyncStatus.conflict` e não é reenviada sozinha | **M9c** `errorCode: _conflictCode(item) ?? 'WORK_ORDER_CONFLICT',` → `errorCode: 'WORK_ORDER_CONFLICT',` (`sync_replay_service.dart:752`, `grep -cF` = 1 hoje; só na cópia de mutação, fora do recorte editável) | verde (F0 e depois) |
| P2 / P2-bis | `tests/b-o6r-11d-work-order-contract.test.ts` **N2** `sync_assign_payload` pelo `POST /api/v1/mobile/sync/work-order-actions` (padrão `tests/mobile-work-order-assign-registry.test.ts:16-60`), OS atribuída a U → `accepted`, `assignedUserId = U` | **M11b** (acima) | `assignedUserId = null` (MEDIDO PELA CRÍTICA) |
| P2-bis (Q1=A) | `tests/b-o6r-11d-lote-tecnico-esperado.test.ts` **N5**: OS atribuída a U; a gestão troca para V por REST; lote com `sync_assign_payload` (esperado U) → `conflict`, `conflict_type = technician_changed_since_action`; a OS fica `assignedUserId = V`, `assignedOperatorId = V`, sem evento novo | **MA1** apagar `      await assertExpectedTechnician(service, actor, assignId, action.payload.expected_technician_id);` | `accepted`, a OS volta a U (MEDIDO PELA CRÍTICA, probe3) |
| P2-bis (Q1=A) | **N6** OS com U só em `assignedOperatorId` (semente REST `{ operatorId: tecnicoU }`) → lote aceito e `assignedUserId = U` (o reparo) | **MA3** em `assertExpectedTechnician`, `const technician = current.assignedUserId ?? current.assignedOperatorId ?? null;` → `const technician = current.assignedUserId ?? null;` | novo |
| P2-bis (Q1=A) | **N9** chave `expected_technician_id: null` e `""` → `conflict` (fail-closed); lote **sem** a chave → comportamento de hoje | **MA4** `if (expected === undefined) return;` → `if (expected === undefined \|\| expected === null \|\| expected === "") return;` | novo |
| registro (CL11D-02) | **N7** (caracterização): REST `{ operatorId: U }` sozinho → `assignedUserId = null` | **MA2** (§Achados) | verde (documenta a pendência) |
| registro (CL11D-10) | **N8** (caracterização): lote de viatura/equipe com a OS em `accepted` → `conflict` `invalid_status_transition` | **M-N8** (§Achados) | verde |
| P3 | **T11** lista com `tenantId: 'org-intrusa'` no item → OS da sessão; detalhe com `tenantId` no corpo → `''`; nunca `org-intrusa` | **M13** `tenantId: fallbackTenantId,` → `tenantId: strOpt('tenantId', 'tenant_id') ?? fallbackTenantId,` | lista devolve `org-intrusa` (MEDIDO PELA CRÍTICA) |
| P1–P3 | `bo6r11d_guard_contrato_test.dart` **G1** sobre o texto de `work_order_remote_api.dart`: (a) não existe `_workOrderFromJson(` nem `_statusFromApi(`; (b) cada um dos 3 métodos de OS única tem exatamente um `_unwrapData(resp)`; (c) o corpo de `_workOrderFromRemoteJson` não contém `'tenantId'` nem `'tenant_id'`; (d) não há `'user_id'` nem `'note'` no arquivo. **(e)** em `lib/`, fora deste arquivo, 0 ocorrências de `.fetchWorkOrder(`, `.updateWorkOrderStatus(` e `.assignWorkOrder(` | **M14** acrescentar, depois do fim de `_workOrderFromRemoteJson`, a linha `WorkOrder _workOrderFromJson(Map<String, dynamic> json) => throw 0;` → G1(a) · **M14e** (§Achados) | (a) e (d) vermelhos hoje |
| registro (CL11D-11) | `python3 agent-orchestration/controle/gerar-indice-pendencias.py && git diff --exit-code agent-orchestration/controle/pendencias-indice.md` | **M-IDX** (§Achados) | — |

**Sem a Q1 em A**, N5, N6, N9, MA1, MA3, MA4 e M9b saem. T9 e N2 ficam conforme a alternativa escolhida (§9).

---

## 4. Escopo

### 4.1 PERMITIDO (caminhos exatos)
- `mobile/flutter_app/lib/features/work_orders/data/work_order_remote_api.dart`
- `mobile/flutter_app/lib/core/network/work_order_api_codec.dart` (novo)
- `mobile/flutter_app/lib/core/sync/sync_replay_service.dart`: **só** `_assignPayload` (`:849-876`), `_backendStatus` (`:886-895`) e o `import` do codec
- **Só com a Q1 em A:** `src/modules/mobile/mobile-work-order-sync.ts`, **só** o ramo `work_order.assign` de `processAction` (`:232-243`) e a função nova `assertExpectedTechnician`. **Trava de arquivo:** a cadeia hoje é `07c → SAN3-16` (`PLANO_SAN3.md:387`). O 11d entra como `07c → 11d → SAN3-16`. O orquestrador confere, antes da F2, que não há ramo do `B-O6R-07c-b2` nem do `B-SAN3-16` mexendo nesse arquivo (`git branch -r` + `git log origin/<ramo> -- <arquivo>`). Isto é **HIPÓTESE** a medir: não achei ramo do b2 nesta árvore. Se houver, a F2 espera.
- Testes novos: `mobile/flutter_app/test/features/work_orders/bo6r11d_contrato_rest_test.dart`, `bo6r11d_codec_test.dart`, `bo6r11d_lista_e_linha_do_tempo_test.dart`, `bo6r11d_sync_assign_test.dart`, `bo6r11d_guard_contrato_test.dart`, `bo6r11d_work_order_contract.json`; `tests/b-o6r-11d-work-order-contract.test.ts`; com a Q1 em A, `tests/b-o6r-11d-lote-tecnico-esperado.test.ts`
- Registro: `agent-orchestration/codex/comandos/B-O6R-11d-contrato-os.md`, `docs/revisoes/SAN3/B-O6R-11d-plano.md` (este v2, versionado, com o v1 citado), `docs/revisoes/SAN3/B-O6R-11d-dev.md`, `agent-orchestration/controle/pendencias.md`, **`agent-orchestration/controle/pendencias-indice.md` (só a saída do gerador, CL11D-11)**, `agent-orchestration/codex/log-execucao.md`, `agent-orchestration/docs/status-geral.md`, `docs/revisoes/SAN3/PLANO_SAN3.md` (só o status em `:115` e `:292`, e a cadeia de travas `:387` se a Q1 for A)

### 4.2 PROIBIDO
- `src/**`, exceto o recorte acima com a Q1 em A. Em particular, `work-order.service.ts`, `work-order-prisma.repository.ts` e `work-order.repository.ts`: a semântica de `assign` sem `userId` (CL11D-02) e a de status forçado (CL11D-10) ficam com dono (§4.3).
- `prisma/**`, `migrations/**`, `.github/**`, `frontend/**`, `Kpis/**` (congelado), `.env`, `pubspec.yaml/lock`, lockfiles JS.
- `mobile/flutter_app/lib/features/work_orders/data/work_order_repository.dart` (trava SAN3-14/15/16), `lib/core/sync/sync_queue_repository.dart`, `lib/core/local_db/**`, `lib/core/network/api_error.dart`, toda tela (`**/ui/**`).
- **Testes existentes:** nenhum é editado, inclusive `tests/o6r07c-b-scope.test.ts`, `tests/mobile-work-order-assign-registry.test.ts`, `b103`, `b109`, `b126` e `b127`. Se algum quebrar, o dev **para**, e o caso vira emenda escrita, revisada antes do código (`D-EMENDA-ANTES-DO-CODIGO`).
- **Trava com o `B-SAN3-26` (CL11D-07):** até o merge do 11d, o 26 não edita `work_order_remote_api.dart`, `sync_replay_service.dart` nem `b103_work_order_sync_test.dart`. Se o 26 já tiver ramo, faz rebase depois do merge e re-mede as mutações dele por emenda.

### 4.3 Fora do bloco, com dono (registrar em `pendencias.md` na F4 e regerar o índice)
- **`P-O6R-11D-REGISTRY-ASSIGN-REABRE-STATUS`** (nova, MÉDIA, reescrita pelo CL11D-10): o lote de viatura/equipe chama `service.assign`, que força `assigned`. Com a OS em `accepted`, `on_route`, `on_site`, `in_progress` ou `paused`, ele dá 409 e a viatura/equipe não grava. Prova: N8. Dono: `B-SAN3-16`.
- **`P-WO-ASSIGN-SEM-USERID-APAGA-USUARIO`** (nova, MÉDIA, CL11D-02): `assign` sem `userId` apaga `assigned_user_id` (`work-order-prisma.repository.ts:559`), qualquer que seja o cliente; o tipo da web admite essa forma. Inclui: (i) decidir a semântica (manter o usuário atual quando o alvo é o mesmo técnico, ou exigir `userId`); (ii) **contar as OS com `assigned_user_id IS NULL AND assigned_operator_id IS NOT NULL` antes da entrada em produção** e reparar. Não há base instalada fora de bancada (`git tag` vazio, MEDIDO PELA CRÍTICA), então a previsão é 0 em produção, mas isso não está medido. Prova do fato: N7. Dono: `B-O6R-07c-b2`, que já tem a `P-WO-ASSIGN-OPERATOR-ID-TORTO` (`pendencias.md:11949`) e a `D-07CB1-ATRIBUICAO-WEB-REATRIBUI-NO-B2` (`decisoes.md:3739`).
- **`P-MOBILE-OS-UNICA-SEM-ORGANIZACAO`** (nova, BAIXA, CL11D-08): os 3 métodos de OS única devolvem a OS com organização vazia; a guarda G1(e) impede ligar esses métodos sem decisão. Dono: o primeiro bloco que ligar um deles a uma tela.
- **`P-MOBILE-REJECTED-DOIS-SENTIDOS`** (nova, BAIXA, CL11D-09). Dono: `B-SAN3-16`.
- **`P-MOBILE-CODEC-FILA-STATUS-CRU`** (existe, `:11956`, `B-SAN3-16`): a F4 acrescenta que o REST deixou de mandar os 4 status sem equivalente e que a fila continua igual a hoje (T10b).
- Seguem como estão: `P-WO-ASSIGN-OPERATOR-ID-TORTO`, `P-MOBILE-STATUS-DESCONHECIDO-VIRA-AGENDADA` (agora só para status futuro), `P-MOBILE-STATUS-ACCEPTED-LOSSY` e `P-MOBILE-APPROVAL-REQUEST-REST-404`.
- A F4 registra como **fechadas na leitura**, com T4, T5, T6 e T12 como prova: `P-MOBILE-PRIORIDADE-URGENT-MEDIUM-VIRA-NORMAL` e a parte de exibição de `P-WO-STATUS-VOCABULARIO-APP-BACKEND`. O fechamento formal fica com quem conferir.
- **Sem a Q1 em A**, a F4 abre também a `P-O6R-11D-LOTE-APAGA-USUARIO-ATRIBUIDO` (MÉDIA ou ALTA conforme a alternativa, dono `B-SAN3-16`).

---

## 5. Nível de revisão: **junta completa** (inspetor + 3 cadeiras, unanimidade)

Pelo §C7.10(1) e (2): **permissão** (P2-bis decide quem fica com a OS: `assertMutationObjectScope`, `work-order.service.ts:919-921`), **perda de dado** (`assigned_user_id`) e **isolamento** (P3). Com a Q1 em A, o bloco passa a tocar backend de sincronização, e a trava sobe do mesmo jeito.

**Cadeiras (até 3 temas cada, P4):**
- **C1, contrato de leitura:** T1–T6, T11–T14, N3, G1.
- **C2, escrita e permissão:** T7–T10b, T9c, N1, N2, N4–N9, mais a regressão do 07c (`tests/o6r07c-b-scope.test.ts`, o controle positivo do lote **sem** a chave continua aceito) e a conferência por leitura de que a pré-condição só restringe.
- **C3, regressão, mutações e escopo:** suíte Flutter inteira, `npm test`, a rodada R-M de todas as mutações, o escopo (§4) e o índice de pendências.

Fluxo do §C7.10(3): pré-revisão → junta única → triagem → um conserto → conferência → merge → porteiro.

---

## 6. Fatias

Branch `fix/mobile-os-contrato-b-o6r-11d` a partir da `main`; Conventional Commits; um commit por fatia.

| F | Commit | Conteúdo | Testes da fatia | min |
|---|---|---|---|--:|
| F0 | `test(mobile): contrato de OS — vermelhos do QUA-004 (B-O6R-11d)` | Fixture; todos os T, N e G1; codec **esqueleto** (`throw UnimplementedError`), única mudança em `lib/` | O diário registra o vermelho de cada um, com a mensagem da coluna "vermelho-controle". **Verdes declarados na F0:** T10b, T9c, N7, N8 | 80 |
| F1 | `fix(mobile): parser único e codec para resposta de OS, linha do tempo inclusive (B-O6R-11d)` | Codec completo; `_unwrapData`; 3 métodos; `_workOrderFromJson` e `_statusFromApi` apagados; organização fora do corpo; corpos REST | T1–T8, T11–T14, G1, N1, N3, N4 verdes; b109 e b127 verdes | 60 |
| F2 | `fix(mobile): o lote de atribuição manda o usuário e não desfaz troca de técnico (B-O6R-11d)` | `_backendStatus` delega; `_assignPayload` conforme a Q1; com a Q1 em A, `assertExpectedTechnician` no backend | T9, T10, T10b, N2, N5, N6, N9 verdes; `b126`, `b103`, `sync_replay_service_test`, `o6r07c-b-scope`, `mobile-work-order-assign-registry` verdes | 60 (A) / 25 (C) |
| F3 | `test(mobile): mutações literais do B-O6R-11d` | Sem código novo: a rodada R-M de todas as mutações da §3 | — | 50 |
| F4 | `docs(controle): fecha Ω6R-QUA-004 e registra o resíduo (B-O6R-11d)` | Fechamento do QUA-004; pendências da §4.3; índice regerado; status no PLANO_SAN3; trava com o SAN3-26 no status-geral; log | `rg -n "B-O6R-11d" agent-orchestration/docs/status-geral.md agent-orchestration/controle/pendencias.md`; critério CL11D-11 | 30 |

**Bateria final (§9), exata, no fim da F4:**
```
cd mobile/flutter_app
flutter pub get
dart format --output=none --set-exit-if-changed lib test
flutter analyze
flutter test test/features/work_orders/bo6r11d_contrato_rest_test.dart test/features/work_orders/bo6r11d_codec_test.dart test/features/work_orders/bo6r11d_lista_e_linha_do_tempo_test.dart test/features/work_orders/bo6r11d_sync_assign_test.dart test/features/work_orders/bo6r11d_guard_contrato_test.dart --reporter compact
flutter test test/features/b109_approval_state_regression_test.dart test/features/work_orders/b126_registry_assignment_test.dart test/features/work_orders/b127_timeline_remota_test.dart test/features/b103_work_order_sync_test.dart test/features/b099_real_work_orders_pull_test.dart test/features/bsan313_minhas_os_escopo_test.dart test/features/bsan313_os_purga_reconcilia_test.dart test/features/bsan313_retencao_ciclo2_test.dart test/core/sync/ --reporter compact
flutter test --reporter compact
cd ../..
CORE_SAAS_PERSISTENCE=memory node --test --import tsx tests/b-o6r-11d-work-order-contract.test.ts tests/b-o6r-11d-lote-tecnico-esperado.test.ts tests/o6r07c-b-scope.test.ts tests/mobile-work-order-assign-registry.test.ts
npm run check && npm run lint && npm test && npm run build
python3 agent-orchestration/controle/gerar-indice-pendencias.py && git diff --exit-code agent-orchestration/controle/pendencias-indice.md
git diff --check
```
(Sem a Q1 em A, sai `tests/b-o6r-11d-lote-tecnico-esperado.test.ts`.)
- Limpeza §C5 no fim, reportada em 1 linha. KPI **não** é atualizado (congelado).
- **Aceite na forma real (§C7.11(3)):** a pré-revisão e o verificador leem o resumo dos jobs `flutter` e `backend` da CI (`gh run view <run> --job <job> --log | grep -E 'not ok|# fail|Some tests failed'`), não só a cor.

**Total estimado:** cerca de 280 min de dev com a Q1 em A (~245 com C), mais pré-revisão (~40), junta (~90) e conferência (~30).

---

## 7. Papéis (§C7.11: um faz, o outro verifica)

| Papel | Executor | Modelo |
|---|---|---|
| Plano v1 | `plano-B-O6R-11d-api` | Claude Opus 5.5 pela API (topo por fallback declarado) |
| Crítica r1 | `crit-11d-cl` (cobriu o Codex 1, exceção declarada) | Claude Opus 5.5, sessão |
| **Replano v2 (este)** | `replano-B-O6R-11d-api` | Claude Opus 5.5 pela API (topo por fallback declarado, §C7.6-bis) |
| Crítica do v2 (corpo do `critico-adversarial`, worktree próprio, por execução, §C7.11(4)) | Codex, identidade nova | `gpt-5.6-sol` (outra casa) |
| Dev F0–F4 | Codex | `gpt-5.6-sol` |
| Pré-revisão (roteiro fixo §C7.11(5)) | identidade Claude nova | Opus |
| Inspetor de terreno | `inspetor-de-terreno-da-junta` | Opus (frontmatter) |
| Cadeiras C1–C3 | identidades novas; pelo menos uma Claude e uma Codex; Gemini só como segundo revisor | nível menor, declarado |
| Conserto pós-triagem | dev que não achou | Codex |
| Conferência | Claude nova, que não consertou nem revisou | Opus |
| Porteiro pós-merge | `porteiro-pos-merge` | Opus |

Sem crédito para cruzar: §C7.11(2), um modelo só, identidade nova, e o artefato declara que não houve cruzamento.

---

## 8. Riscos e rollback

1. **Mudança visível na lista e na linha do tempo.** OS em rota, no local ou em andamento saem de "Agendada" e mudam os botões oferecidos. É a correção, e é comportamento novo em campo. Mitigação: T5, T12 e a suíte inteira (a crítica mediu +1070 verdes com o núcleo).
2. **(Reescrito, CL11D-01)** Com a Q1 em A, a ação de viatura/equipe cujo técnico mudou depois de nascer vira **conflito para decisão manual** (B-107), em vez de desfazer a troca. A viatura/equipe dessa ação não grava até alguém decidir. É o efeito desejado, e é visível. Com a Q1 em C, o risco do v1 não existe (o lote fica como hoje), mas o apagamento continua.
3. **Trava de arquivo** com o `B-SAN3-16` (`sync_replay_service.dart` e, com a Q1 em A, `mobile-work-order-sync.ts`), com o `B-O6R-07c-b2` (`mobile-work-order-sync.ts`, a medir) e com o `B-SAN3-26` (§4.2).
4. **O conserto do app só chega com build novo.** Aparelho com build antigo não manda a chave e segue com o comportamento de hoje. Não há base instalada fora de bancada (MEDIDO PELA CRÍTICA: `git tag` vazio; sem build assinado).
5. **(Reescrito, CL11D-02)** O apagamento de `assigned_user_id` é do contrato do servidor e qualquer cliente que mande só `operatorId` o reproduz. O bloco não muda isso no REST; fica com a pendência e o dono da §4.3. A hipótese do v1 ("nenhum outro cliente depende de `user_id`") sai.
6. **Janela entre `get` e `assign`** na pré-condição (Q1 em A): é a mesma classe da trava do REST de hoje. Declarado, sem pendência nova.

**Rollback:** reverter o squash do PR. Não há migração nem dado a desfazer; a pré-condição só recusa.

---

## 9. Perguntas ao dono

### Q1. Quando o celular manda atrasado a escolha de viatura/equipe, e a gestão já trocou o técnico, o que o sistema faz?

**Premissa corrigida (o v1 estava errado).** O v1 dizia que, se o técnico tivesse mudado, "a trava do servidor recusa". Não recusa. A trava só segura a troca **depois de "No local"** (a sua decisão `D-INICIO-ATENDIMENTO-CONFIRMADO`; o "antes de No local vale na hora" é a leitura declarada `D-07CB1-TRAVA-ATE-B2`). O app usa o envio de atribuição **só** para gravar viatura/equipe, e ele carrega junto o técnico que o celular conhecia quando a ação foi feita. A crítica mediu o que acontece hoje, no servidor real em memória: a gestão troca o técnico de U para V; chega o envio atrasado; **a OS volta para U**. Hoje isso ainda deixa um rastro, porque o campo do usuário fica vazio. O conserto do v1 apagaria esse rastro. A decisão `D-07CB1-ATRIBUICAO-WEB-REATRIBUI-NO-B2` fala em "atribuição pela web/lote" como via de trocar técnico; na prática, **o app não tem nenhuma tela que troque técnico por esse envio**.

| Alternativa | O que faz | Custo | Risco | Efeito no portão (item 3) |
|---|---|---|---|---|
| **A (recomendada)**: o app declara "este envio vale se o técnico ainda for U", e o servidor responde **conflito** se não for | O envio atrasado vira um item em conflito na fila, para decisão manual (regra de hoje, B-107). O campo apagado é preenchido quando o técnico não mudou. A web e os outros envios ficam como estão, e as suas decisões do 07c ficam intactas | +~35 min de dev; o bloco passa a tocar 1 arquivo do servidor (`mobile-work-order-sync.ts`), em fila com o 07c-b2 e o SAN3-16 | Baixo: a regra só recusa, nunca dá poder a ninguém | Fecha o item 3 inteiro, sem regressão de permissão |
| **B**: o envio do app **nunca** troca técnico; técnico diferente do atual → conflito, com ou sem a declaração | Igual a A, e vale também para envios sem a declaração | Igual a A, mas **contraria** a leitura `D-07CB1-TRAVA-ATE-B2` para essa via e quebra o teste do 07c que a protege (`tests/o6r07c-b-scope.test.ts:752-756`), que precisaria de emenda | Médio: muda uma regra já julgada em junta | Fecha o item 3; reabre parte do 07c |
| **C**: o bloco **não mexe no envio de viatura/equipe**; conserta só a leitura e a atribuição pela internet (que nenhuma tela usa) | O técnico continua sendo apagado a cada viatura/equipe definida (com a OS em aberta/atribuída), e a troca atrasada continua desfazendo, como hoje | −35 min; nada no servidor | Médio: a perda de dado segue viva, com pendência para o `B-SAN3-16` | Fecha o critério **literal** do item 3 (REST), com o resíduo do envio em pendência |
| **D**: criar um envio próprio para viatura/equipe, que não carrega técnico | O desenho certo a longo prazo | +~3 h; mexe no repositório do app (trava do SAN3-14/15/16) e no servidor; fica melhor no `B-SAN3-16` | Baixo no fim, mas atrasa este bloco | Atrasa o fechamento do item 3 |

**Recomendação: A.** É a única que fecha o item sem perder dado e sem desfazer em silêncio uma troca de técnico, e não contraria nenhuma decisão sua. Se você quiser o desenho D mais adiante, ele entra no `B-SAN3-16` e a A continua valendo para os celulares que ainda mandarem o envio antigo.

---

## Emenda 1: requisitos da crítica r2 (`crit-11d-r2-cl`, rodada 2, APROVADO COM AJUSTES; orquestrador, 11/11 10:32 SP; transcrição declarada §A6; D-EMENDA-ANTES-DO-CODIGO)

> Na rodada 2, o que sobreviveu à crítica vira requisito do dev. O texto completo, com comando e saída, está em `revisoes/crit-11d-r2-plano.json`. As respostas do dono valem como as recomendações do plano (`D-DONO-TODAS-RECOMENDACOES-1111`, 11/11). Esta emenda prevalece sobre o corpo onde divergir.

- **CR2-11D-01 (MEDIA)**: O instrumento do T9 e do T10b é o CaptureWorkOrderBatchApi, que recebe a SyncAction CRUA da fila. O _assignPayload e o _backendStatus só rodam dentro de WorkOrderSyncCodec.encodeRequest, chamado pelo DioWorkOrderSyncBatchApi. Como escritos, o T9 nunca fica verde (faltam work_order_id, user_id e expected_technician_id; sobram local_id, server_id e occurred_at), o T10b nunca fica verde (status = null), e as mutações M9, M9b (a metade-app do ALTO) e M10b mexem em código que o teste não executa. Nenhum teste existente nota a remoção do expected_technician_id. A §3 também nomeia SyncReplayService (o de despesa, que recebe ExpenseSyncBatchApi); o de OS é WorkOrderSyncReplayService. REQUISITO: T9 e T10b passam o lote capturado por const WorkOrderSyncCodec().encodeRequest(captured) (precedente b126_registry_assignment_test.dart _encodedSingle e bfilausuario_dependente_de_outro_dono_test.dart:340), ou usam DioWorkOrderSyncBatchApi sobre adaptador falso e leem options.data; trocar SyncReplayService por WorkOrderSyncReplayService no T9c/T10b; a F3 prova que M9, M9b e M10b ficam vermelhas.
- **CR2-11D-02 (MEDIA)**: A trava diz que, até o merge do 11d, o 26 não edita work_order_remote_api.dart, sync_replay_service.dart nem b103_work_order_sync_test.dart. A ordem real já a desfez: o dev do B-SAN3-26 foi lançado às 02:25 SP no ramo fix/checkin-confere-placa (REGISTRO-PENDENTE.md:955), e o PERMITIDO do 26 v2 inclui work_order_remote_api.dart (_workOrderFromRemoteJson e _workOrderFromJson, este o que o 11d APAGA), _statusPayload e o b103. O plano do 26 cita o 11d 0 vezes. Não é defeito de produto; é a dependência de ordem, agora invertida. REQUISITO: a trava vira 'quem mergear primeiro manda'. O orquestrador grava no status-geral, antes da F0, qual vai primeiro. Se for o 26, a F0 do 11d parte da main com o 26, re-mede por emenda as citações de linha, e a F1 leva para o _workOrderFromRemoteJson os campos que o 26 acrescentou ao _workOrderFromJson apagado (checkinMode, checkinPlateTail), conferidos no T1. Se for o 11d, vale o rebase do 26 que o v2 já prevê.
- **CR2-11D-03 (BAIXA)**: O plano declara o vermelho de N1 como '400 required_field' e o de N2 como 'assignedUserId = null'. Esses são os vermelhos do corpo que o app manda HOJE, não do que N1 e N2 aplicam. N1 aplica rest_assign_request (userId/message) e N2 aplica sync_assign_payload (com user_id), e o servidor de hoje aceita os dois. Os dois nascem verdes na F0 e a F0 não os lista. REQUISITO: declarar N1, N2, N3, N4 e N6 verdes na F0, como a metade-servidor do contrato (o vermelho é do T8 e do T9); as mutações deles continuam na fixture (M11, M11b, M12, M7f) e no servidor (MA3).
- **CR2-11D-04 (BAIXA)**: Uma resposta 200 com {data:{}} ou {data:{foo:1}} passa pelo _unwrapData e vira OS inventada: localId 'wo-remote-<timestamp>', serverId null, código vazio, marcada synced. É o achado C3-A1 que a junta do PR #388 pegou neste mesmo código (o conserto de lá exigiu id não vazio). Hoje está dormente: 0 chamadores, e o G1(e) impede ligar. O T13 só cobre o DTO sem envelope. REQUISITO: nos 3 métodos, id ausente ou vazio → ApiServerError; o T13 ganha {data:{}} e {data:{foo:1}}; uma mutação literal na linha da checagem do id deixa o T13 vermelho.
- **CR2-11D-05 (BAIXA)**: O v2 não cita o ramo precursor origin/fix/mobile-work-order-contracts (PR #388, a24f58b5), que já consertou este mesmo arquivo e passou por junta: 'REST da OS lê o envelope {data} e fala o vocabulário do backend' e 'tenant da OS obrigatório, resposta sem OS lança, vocabulário provado (ciclo 2)'. Lá a junta fechou o tenant vazio e tornou tenantId 'required String' (C2-F2/C3-A2). O v2 volta ao vazio por contrato, com motivo declarado e com o G1(e), mas sem registrar a divergência (§A2). E 6 das 7 pendências que a F4 edita ou fecha (P-MOBILE-CODEC-FILA-STATUS-CRU, P-MOBILE-PRIORIDADE-URGENT-MEDIUM-VIRA-NORMAL, P-MOBILE-STATUS-DESCONHECIDO-VIRA-AGENDADA, P-WO-ASSIGN-OPERATOR-ID-TORTO, P-MOBILE-STATUS-ACCEPTED-LOSSY, P-MOBILE-APPROVAL-REQUEST-REST-404) não têm cabeçalho na main: existem só como itens do índice P-O6R-B11-PENDENCIAS-DO-RAMO-388, e o texto está no ramo. REQUISITO: a §1 cita o ramo e os achados da junta dele; a F4 registra em controle/ a divergência do tenant vazio (na entrada da P-MOBILE-OS-UNICA-SEM-ORGANIZACAO); e, antes de acrescentar ou fechar, porta o texto de cada pendência a partir de a24f58b5.
- **CR2-11D-06 (BAIXA)**: O comando 'python3 agent-orchestration/controle/gerar-indice-pendencias.py && git diff --exit-code …' sai com código 49 nesta máquina antes de medir: no Git Bash, python3 é o atalho da loja do Windows. A M-IDX ('sai com código 1') fica indistinguível. A convenção do repo é python (135 ocorrências contra 12). REQUISITO: usar python no critério e na bateria.
- **CR2-11D-07 (BAIXA)**: A lista de instâncias de hoje está coberta: os 10 status do backend, gerados por comando, e as 4 prioridades estão todos na tabela da §2.2. Mas nada amarra o codec de entrada à lista do backend. O T4 escreve os 10 status no próprio teste, e N3 e N4 só conferem a fixture e a saída. Um status novo no backend cai em 'Agendada' sem vermelho nenhum, quando o #388 tinha esse guarda (caso 16). E a prioridade de saída fica numa segunda tabela fora do codec (_backendPriority, usada no _createPayload), que o plano não cita e nenhum teste amarra ao inverso do workOrderPriorityFromApi. REQUISITO: (a) uma seção backend_statuses na fixture, que um teste Node afirma ser igual a WORK_ORDER_STATUSES e que o T4 percorre, exigindo entrada explícita na tabela (não o casamento pelo nome do app); (b) o _backendPriority delega ao codec, ou um teste fixa que ele é o inverso do workOrderPriorityFromApi nas 4 prioridades.
- **CR2-11D-08 (BAIXA)**: A sync_assign_payload tem work_order_id e vehicle_id fixos. No servidor real, N2 e N5 precisam trocar esses dois, porque o vehicle_id é validado dentro da organização e um id inexistente dá 400 invalid_vehicle_reference (o teste existente sobre vehicle_id inexistente ou de outra organização prova isso). O plano não diz quais chaves se trocam e quais se comparam por igualdade. N7 e N8 não têm arquivo, e a R-M precisa de um arquivo para o grep -cF. REQUISITO: nomear as chaves substituídas (work_order_id, vehicle_id) e comparar o resto por igualdade; pôr N7 e N8 num dos dois arquivos Node do PERMITIDO.
