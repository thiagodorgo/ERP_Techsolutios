# B-O6R-07c — Plano v2: escopo por objeto nos subrecursos da OS — dividido em 07c-a e 07c-b

> **Papel:** `planejador-mestre` · **identidade:** `planejador-b-o6r-07c` (a mesma da v1).
> **Modelo que rodou:** **Opus 5.5 — substituição DECLARADA** (§C7.6-bis, `D-FALLBACK-MODELO-FABLE-OPUS`).
> **Por que o Fable faltou:** não faltou por cota — o dono **reservou o Fable a bloco de dinheiro**
> (decisão de 08/10); este bloco é de **PERMISSÃO**. O frontmatter do `planejador-mestre` continua `fable`.
> **Ref medida:** ramo `fix/o6r07c-subresource-scope`, head `8391dea801162d135234b38503b6a30cfb254b0b` (plano v1 +
> crítica r1); código em `origin/main` = `c1cfdabe12c74b58f8393dbee4f333224c56b303` (o ramo não toca `src/`). Medido
> por `git rev-parse HEAD origin/main` no worktree `C:/Users/AMP/w-07c` (§A7).
> **Insumo:** `docs/revisoes/SAN3/B-O6R-07c-CRITICA-r1.md` (identidade `critico-b-o6r-07c-r1`), veredito **VOLTA AO
> PLANO**. A v1 continua no histórico (`git show 00109988:docs/revisoes/SAN3/B-O6R-07c-plano.md`).
> **Divisão:** decisão **do orquestrador**, não do dono: 07c-a (as 10 vias registradas + o guard) e 07c-b
> (vistoria, evidência e despacho), este **esperando** as decisões D1 e D2 do dono.
> **Estado:** COMPLETO (gravado seção a seção; Apêndice A reexecutado a partir do texto deste arquivo).

## Resumo

- **Divisão (orquestrador):** **07c-a** = as 10 vias registradas (anexo ×2, comentário e tag ×5, geocode ×2, km pelo
  sync) + o guard; não depende do dono; **tamanho M**. **07c-b** = vistoria (18), evidência de OS (4) e despacho (1);
  **espera D1 e D2 do dono**; **tamanho G** (G+ se a D1 for "o despacho grava a atribuição").
- **O `Ω6R-SEC-002` só fecha no 07c-b.** O 07c-a fecha as 10 vias e deixa a `P-O6R-SUBRECURSO-OBJECT-SCOPE` PARCIAL,
  com o resíduo nomeado (as 23 entradas `·07c-b`).
- **Gerador v2 (A3):** enumera pelo registro das rotas (não por literal), sonda todo método, acha lote pelo
  comportamento, extrai tipo de ação com aspas simples, crase, template e maiúscula, e testa curinga. Em `c1cfdabe`:
  409 rotas, 146 alcançadas pelo campo (104 leituras + 42 mutantes), 4 lotes, 23 pares de sync, 0 curinga; instantâneo
  de 169 entradas. As 6 formas da crítica (F1 GET que escreve, F2 `router.all`, F3 sub-router com parâmetro, F4 `:id`,
  F5 lote em sub-router, F6 despacho por prefixo) ficam **vermelhas** no guard v2 e escapavam ou saíam erradas no v1 —
  provado por execução: F1–F5 com o `inject.mts` da própria crítica, F6 com o `inject-prefixo.mts` (Apêndice A).
- **Para o dono:** D1 (quem é o técnico da OS: atribuição, atribuição ou despacho ativo, ou o despacho grava a
  atribuição; e a equipe), D2 (trabalho offline depois de redistribuição: recusar, aceitar por relógio, aceitar ex-técnico,
  ou recusar como conflito) e D3 (dano que debita o extrato de colega — fora do 07c, registrada como pendência ALTA de
  dinheiro).
- **Crítica r1:** 12 de 12 achados aceitos (§Resposta à crítica r1).


## Comum — a propriedade e o gerador v2

### C.1 A propriedade (inalterada no enunciado; o que muda é quem decide "atribuído")

> **P-07c.** Nenhum ator cujo único acesso à OS é por papel de campo (`field_technician`, `technician` — os
> `assigned_only` do 07a, `src/modules/work-orders/work-order.types.ts:90-104,124-129`) **escreve** em subrecurso de
> uma OS que não lhe cabe. Recusa: **403** `not_assigned_to_actor` no REST; **por ação**, dentro do lote 200, no sync.
> 404 segue sendo do cross-tenant. Toda via que o técnico alcança — de qualquer forma — tem de estar **classificada**;
> a não classificada **falha o guard** (default negar).

**"Lhe cabe" — o que é decisão e o que não é:**
- **07c-a:** o predicado é **o do 07a, sem mudança** (`assigned_operator_id` = perfil **ou** user id do ator,
  `work-order.service.ts:808-840`). As 10 vias do 07c-a são web (anexo, comentário, tag, geocode — o app não as chama:
  `git grep -nE "/comments|/attachments|geocode" -- mobile/flutter_app/lib`, excluídas as de checklist, devolve 0
  linhas) e a quilometragem, que segue a semântica que o 07a **já** aplica ao status pelo mesmo sync
  (`work_order.status_change`, guardado, crítica E5). Nenhuma regra de negócio nova.
- **07c-b:** para vistoria, evidência e despacho, "lhe cabe" **é a decisão D1 do dono**. A v1 escolheu sozinha
  (atribuição da OS para a vistoria, alvo do despacho para o despacho) e a crítica mediu que isso **nega o técnico
  despachado** no fluxo principal (A1, reexecutado por mim: `probe-dispatch.mts` → OS depois do despacho
  `{"status":"open"}`, técnico despachado responde e conclui a vistoria hoje com 200/200). Escrevo as opções; não
  escolho.
- **Uma porta só:** qualquer resposta à D1 muda o predicado em **um** lugar (`WorkOrderService.getForMutation`,
  §07c-a), e o 07c-a herda — inclusive o status do 07a. Se a D1 vier "atribuição **ou** despacho ativo", o técnico
  despachado volta a poder mudar o status da OS, o que hoje o 07a nega (crítica E2: `403 not_assigned_to_actor`).

**Fronteiras declaradas (mantidas da v1, com as correções da crítica):** leitura fora (escopo de leitura é do
`B-SAN3-13`); registro próprio que só **aponta** para uma OS (classe R) fora — **exceto** que o `POST /damages` não é
só apontar: debita o extrato de um colega (A9, registro abaixo); moderação de comentário (`D-Ω3F-5-COMMENT`,
`work-order-comment.service.ts:139-145`) intacta dentro da OS que cabe ao técnico. Os papéis de escritório
`operator` e `manager` "passam sempre" **quanto à atribuição da OS**; na vistoria a matriz lhes dá "…-by-scope"
(`RBAC_MATRIX.md:44`) — tensão **já registrada** em `P-SAN3-04A-CHECKLIST-POR-ESCOPO-ESCRITORIO`
(`agent-orchestration/controle/pendencias.md:9724`, dono `B-SAN3-22`), que este bloco não resolve (A8).

### C.2 O gerador v2 — enuncia a propriedade, não a forma (A3)

**O que mudou, ponto a ponto contra o E4 da crítica** (texto integral no Apêndice A; reexecutável — P3):
1. **Caminho verdadeiro de toda rota, de qualquer forma de montagem.** Antes de o app nascer, o `census-v2.mts`
   intercepta `Router.prototype.use` e `Router.prototype.route` do pacote `router` que o Express 5 usa
   (`node_modules/router/index.js:362,425`; `express/lib/application.js:190-222` delega a ele) e anota em cada camada
   o caminho **no momento do registro**. Montagem com parâmetro, sub-router de sub-router e nome de parâmetro
   qualquer saem com o caminho real — sem ler literal de `src/**` e sem `?NESTED?`. Camada sem caminho de texto
   (regex) é contada e **falha** o guard; hoje são **0**.
2. **Todo método.** GET e HEAD são sondados; rota `all` vira os 5 verbos. Resposta que não termina em 4 s (o fluxo
   SSE de `/operations/field-events/stream`) conta pelos cabeçalhos.
3. **Lote de sync por comportamento, não por caminho.** Lote = rota POST alcançável que, a um envelope com tipo
   inexistente, devolve a ação num balde ou responde `unsupported_action*`. Nada de `/mobile/sync/` no código.
4. **Tipos por extrator v2** (`tipos.mts`): aspas duplas, simples e crase; maiúscula, dígito e hífen; template com
   `${CONSTANTE}` resolvida por `const X = "…"` do mesmo arquivo. Template **com forma de tipo** que não se resolve
   volta numa lista — o guard falha em item novo dela.
5. **Curinga:** cada lote tem de responder `unsupported` a um tipo inexistente nu **e** a `<família>.<inexistente>`
   para cada família conhecida (147). Aceitar é despacho por prefixo → falha.
6. **Classificação por instantâneo, regra só para marcar pertença.** O guard compara as vias vivas com um
   instantâneo revisado (`tests/fixtures/o6r07c-classificacao-vias.json`): via viva fora dele = **NAO-CLASSIFICADA**
   (falha, default negar); entrada que não está mais viva = **ENVELHECIDA** (falha). A regra de pertença é por
   **recurso**, com parâmetro de **qualquer nome**: segmento `work-orders`, `checklist-runs` ou `dispatches` seguido de
   `:qualquer`, mais `mobile/evidence-uploads` e os tipos `work_order.*`, `checklist*`, `evidence.work_order_*`.

**Números em `c1cfdabe`** (cwd `C:/Users/AMP/w-07c`, Node v20.19.5, sem `DATABASE_URL`/`REDIS_URL`):

```
node --import tsx census-v2.mts c2.json
  → rotas registradas: 409 | camadas sem caminho de texto: 0 | alcançadas pelo campo: 146 (GET/HEAD 104 · mutantes 42)
node --import tsx census-sync-v2.mts c2.json s2.json
  → POST alcançáveis: 31 | lotes (por comportamento): 4 | arquivos: 758 | tipos: 439 | famílias: 147
    | pares alcançados: 23 | tipo inexistente aceito (curinga): 0 | template de tipo não resolvido: 4
node classify-v2.cjs c2.json s2.json --gravar-snapshot snapshot-base.json
  → DESPACHO·07c-b=1 · EVIDENCIA-OS·07c-b=4 · LEITURA=104 · LOTE=4 · N=15 · OS·07a=3 · OS·07c-a=10 · R=10
    · VISTORIA·07c-b=18 · total=169 · NA PROPRIEDADE (regra): 48 · NAO-CLASSIFICADA: 0
```

As 42 mutantes e os 23 pares são **os mesmos** da v1 (o censo v1 dava 42 + 23); o que entra de novo é a
classificação explícita das **104 leituras** — é ela que faz um GET novo que escreva nascer vermelho. Os 4 lotes
são os 4 endpoints de sync que o campo alcança (o de estoque é `permission_required` para os dois papéis). Os 4
templates não resolvidos são falsos positivos **nomeados** (`aws-cur.repository.ts`, número formatado;
`evidence-storage.ts`, nome de arquivo temporário; `service-quote.controller.ts` e `approval.service.ts`, nomes de
evento de domínio) e entram numa lista literal do guard; item novo nela falha. As 48 "na propriedade" = 36 vias
mutantes + 12 leituras sob `/work-orders/:p`, `/checklist-runs/:p` e `/dispatches/:p` (estas ficam `LEITURA` no
instantâneo).

**A heurística sobre as 104 leituras é medida, não prova:** `git grep` dos handlers de `router.get` por nome de método
com verbo de escrita (`create|update|delete|mark|run|accept|sync|record|set|apply|register|archive|…`) devolve só
`compareChecklistRun`, `listRunsForWorkOrder`, `getAllocationRun`, `getCalculationRun`, `listAllocationRuns`,
`listCalculationRuns` — todas leituras ("Run" no nome). Que nenhum GET **existente** escreva é hipótese sustentada por
nome; o que o guard **garante** é que um GET **novo** não entra sem alguém classificá-lo (mandato da C2, §07c-a.7).

**Prova por execução — cada forma da crítica, gerador v1 × v2** (injeção = `inject.mts` do apêndice da crítica, sem
edição; F6 = `inject-prefixo.mts`, Apêndice A deste plano):

| forma | gerador v1 (Apêndice A da v1, rodado por mim) | gerador v2 + instantâneo de `c1cfdabe` |
|---|---|---|
| F1 · GET que escreve, `/work-orders/:workOrderId/aceitar-por-link` | **ausente** (o v1 não sonda GET) | `NAO-CLASSIFICADA (na propriedade)` → **vermelho** |
| F2 · `router.all`, `/work-orders/:workOrderId/via-all` | **ausente** (o v1 descarta `_all`) | 5 entradas `NAO-CLASSIFICADA (na propriedade)`, uma por verbo → **vermelho** |
| F3 · sub-router montado com parâmetro, `/work-orders/:workOrderId/notas` | `POST /?NESTED?/`, sondada no caminho errado (404) | caminho verdadeiro, `NAO-CLASSIFICADA (na propriedade)` → **vermelho** |
| F4 · `:id` em vez de `:workOrderId`, `/work-orders/:id/fechar` | `NAO-CLASSIFICADA`, mas **fora** da propriedade | `NAO-CLASSIFICADA (na propriedade)` → **vermelho** |
| F5 · lote em sub-router `/mobile`, `/mobile/sync/novidade-actions` | `POST /?NESTED?/sync/novidade-actions`, 404 (com o literal `/mobile` emulado pela crítica, some como `SYNC(lote)`, E4) | caminho verdadeiro, `NAO-CLASSIFICADA` → **vermelho** |
| F6 · lote que aceita qualquer `checklist.*` (despacho por prefixo) | vê os 8 tipos que já existem como literal, como `VISTORIA` aberta; **não vê** o curinga | endpoint `NAO-CLASSIFICADA` + **2** `CURINGA` (os dois papéis) → **vermelho** |

Saídas: v1 com a injeção da crítica → `NAO-CLASSIFICADA=3 · total=64` (F3, F4, F5 mal sondadas ou fora; F1 e F2 sem
linha); v2 com a mesma injeção → `rotas registradas: 418 | alcançadas: 155` e **9** `NAO-CLASSIFICADA` (as 9 linhas
acima de F1–F5); v2 com F6 → `NAO-CLASSIFICADA=11 · CURINGA: 2`.

**Tipos — v1 × v2** (`prova-tipos.mts`, Apêndice A): `'checklist.x'`, `` `${D}.via_template` `` (com `const D =
"checklist"`), `"checklist.photo_v2"`, `"checklist-run.reopen"`, `"Checklist.PhotoAdd"` e
`` `checklist.crase_sem_interpolacao` `` → **v1: não acha nenhum; v2: acha os seis**; `` `${desconhecida}.dinamico` ``
volta como não resolvido (o guard falha).

**O que o gerador v2 ainda não pega (risco residual, declarado):** um handler que escreva **sem** passar o RBAC do
papel de campo não é "alcançável" pela sonda — mas aí a recusa já existe (não é a propriedade); uma escrita disparada
por **outra** via que não seja requisição HTTP (job, evento) está fora do censo por construção; e o alcance é medido
com as permissões do **catálogo em código**, que equivalem às do banco enquanto o guard de paridade
`tests/permission-catalog-db-parity.test.ts` estiver verde no job `backend-postgres` (`.github/workflows/ci.yml:134,194`)
— é por isso que o A12 é nota, não bloqueio.


## 07c-a

**Não depende de D1 nem de D2.** Pode ir ao dev assim que a rodada 2 da crítica aprovar. **O `Ω6R-SEC-002` NÃO fecha
no 07c-a** — fecha só no 07c-b (CE-2, `PLANO_SAN3.md:325`: só com escopo provado em **todas** as vias do censo).

### 07c-a.1 As 10 vias (as registradas na `P-O6R-SUBRECURSO-OBJECT-SCOPE`, `pendencias.md:6726-6747` e `:6771`)

| registro | via | ponto único de decisão depois do 07c-a |
|---|---|---|
| 1 | `POST /work-orders/:workOrderId/attachments` | `WorkOrderAttachmentService.assertCanMutate`, chamado pelo controller **antes** do multipart |
| 2 | `DELETE /work-orders/:workOrderId/attachments/:attachmentId` | `WorkOrderAttachmentService.deleteAttachment` → `getForMutation` |
| 3–7 | `POST /comments`, `PATCH`/`DELETE /comments/:commentId`, `POST`/`DELETE /comments/:commentId/tags/:tagId` (todas sob `/work-orders/:workOrderId`) | `WorkOrderCommentService` → `getForMutation`, antes do parse e da busca do comentário |
| 8 | `POST /work-orders/:workOrderId/geocode` | `WorkOrderService.geocodeById` → `getForMutation` |
| 9 | `POST /work-orders/:workOrderId/geocode-destination` | `WorkOrderService.geocodeDestinationById` → `getForMutation` |
| 10 | sync `POST /mobile/sync/work-order-actions` · `work_order.mileage` | `WorkOrderService.setMileage` → `getForMutation` |

Mais as **3** que o 07a já guarda (`PATCH /work-orders/:workOrderId`, `PATCH …/status`, sync `work_order.status_change`)
entram no laço de teste como **regressão** (crítica E5: guardadas por execução).

### 07c-a.2 Desenho

- `work-order.service.ts`: **novo** `async getForMutation(actor, workOrderId)` = `this.get` (404 cross-tenant,
  inalterado) → `this.assertMutationObjectScope` (o do 07a, corpo intocado) → a OS. `setMileage` (`:1247`) troca
  `this.get` (`:1253`) por `getForMutation`. `geocodeById` (`:194`) e `geocodeDestinationById` (`:283`) trocam o par
  `parseRequiredUuid` + `repository.findById` pelo `getForMutation` (mesmo 404) — logo o escopo vem **antes** do 409
  `already_geocoded`. `update` e `changeStatus` **não mudam**.
- `work-order-attachment.service.ts`: `createUploadedAttachment` e `deleteAttachment` resolvem a OS por
  `getForMutation` (a conversão 404 → `work_order_not_found` do `assertWorkOrder`, `:138-146`, é preservada; o 403
  atravessa); expõe `assertCanMutate(actor, workOrderId)`. Listar e baixar seguem em `get`.
- `work-order-attachment.controller.ts`: `createAttachment` chama `assertCanMutate` **antes** do teste de multipart
  (`:35`) e do parse (`:40`) — o servidor não lê nem verifica bytes de quem não pode gravar.
- `work-order-comment.service.ts`: `addComment`, `editComment`, `deleteComment`, `attachTag`, `detachTag` passam por
  um `assertWorkOrderForMutation` (= `getForMutation` com a conversão 404 → `commentNotFoundError` de
  `assertWorkOrder`, `:117-126`), **antes** de `parseComment` e da busca do comentário; `assertCanMutate`
  (`:139-145`, `D-Ω3F-5-COMMENT`) **fica intacto** logo depois. `listComments` segue em `get`.
- **Sem migração.** `mobile-work-order-sync.ts` **não muda** (a via 10 fecha no serviço).

**Idempotência da quilometragem — a premissa corrigida (A4).** Os recibos do sync de OS são um `Map` em memória do
processo (`mobile-work-order-sync.ts:65`); a km **não** tem chave durável. Consequências, declaradas: (i) reenvio do
mesmo `client_action_id` no **mesmo** processo → `already_applied` pelo recibo (antes do escopo, como já é hoje para
o status); (ii) depois de um **reinício** do servidor **e** de uma redistribuição, o reenvio de uma km já aplicada sai
`rejected` `not_assigned_to_actor` — o valor **já está** no banco, nada se perde, e o app marca a ação `failed` (até 5
tentativas, ver A2 no 07c-b). Não há decisão de idempotência nova no 07c-a; a D-07c-IDEMP da v1 vai, corrigida, para
o 07c-b.

### 07c-a.3 O guard que o 07c-a entrega (o mesmo que o 07c-b vai esvaziar)

- `tests/helpers/o6r07c-census.ts` — porta, sem mudança de algoritmo, do `census-v2.mts`, `census-sync-v2.mts`,
  `tipos.mts` e `classify-v2.cjs` do Apêndice A (a C2 compara as contagens com o gerador dela).
- `tests/fixtures/o6r07c-classificacao-vias.json` — o **instantâneo** (169 entradas em `c1cfdabe`), gerado por
  `classify-v2.cjs --gravar-snapshot` e revisado; chave `MÉTODO caminho` ou `SYNC endpoint · tipo`, valor = a
  classe. As 23 entradas `·07c-b` são as vias **abertas com dono 07c-b**.
- `tests/o6r07c-census-guard.test.ts`, com estes testes:

| id | asserção | falha quando |
|---|---|---|
| T1 | nenhuma via viva fora do instantâneo | via nova de qualquer forma, inclusive GET (default negar) |
| T2 | nenhuma entrada do instantâneo morta | rota removida ou renomeada sem atualizar a classificação |
| T3 | zero camada sem caminho de texto | montagem por regex, que o censo não sabe compor |
| T4 | zero curinga | lote que aceita tipo inexistente, nu ou com prefixo de família |
| T5 | templates de tipo não resolvidos ⊆ a lista literal dos 4 de hoje | tipo de ação montado em template que o extrator não resolve |
| T6 | o conjunto das entradas `·07c-b` é **exatamente** a lista literal das 23 de hoje | qualquer via nova empurrada para o 07c-b sem passar pela junta (catraca: só diminui) |
| T7 | as 6 formas da crítica, injetadas num app novo, são achadas: F1–F5 como `NAO-CLASSIFICADA`, F6 como curinga | o gerador regride para reconhecer forma (é o teste que fica **vermelho com o gerador v1**) |
| T8 | o extrator de tipos acha as 6 formas de tipo e devolve o template dinâmico | o extrator regride para a regex do v1 |

No 07c-b, a lista do T6 tem de chegar **vazia** — é o critério de fechamento dele.

### 07c-a.4 Testes de encerramento e mutações

**Régua (baseline medido na v1, válido: o código não mudou):** 44 suítes não-`-db` das vias tocadas, em
`c1cfdabe`, `CORE_SAAS_PERSISTENCE=memory` → `# tests 430 · pass 427 · fail 0 · skipped 3` (3 auto-pulos declarados).
**N = 8** (os testes do 07a que provam a propriedade) → **M ≥ 16**; o 07c-a entrega ≥ 30 (13 do laço G + 10
semânticos + 8 do guard + ≥ 4 `-db`).

**Laço G** (`tests/o6r07c-subresource-scope.test.ts`): para **cada** entrada `OS·07a` e `OS·07c-a` do instantâneo (13
hoje — lidas do instantâneo, não digitadas), com `osA` atribuída ao perfil do `tecnicoA`:
- **G-NEG:** `tecnicoB` (mesmo papel, não atribuído) → 403 `not_assigned_to_actor` (REST, corpo `{}`) ou `rejected`
  `not_assigned_to_actor` (sync, lote 200).
- **G-POS:** `tecnicoA` → a resposta **não** é `not_assigned_to_actor`.
- **G-WIDE (corrigido, A5):** um papel `tenant_wide` → a resposta **não** é `not_assigned_to_actor` **e não** é
  `permission_required`; se for `permission_required`, o teste **falha** com "G-WIDE vazio — escolha um papel
  `tenant_wide` que alcance a via". Nas 13 do 07c-a o `manager` alcança todas (`catalog.ts:430-435`: `read`,
  `comment`, `create`, `update`, `status`), então o ator é o `managerA`.

**Semânticos (vermelhos em `c1cfdabe`, exceto os positivos, que são controle):**

| id | cenário | asserção |
|---|---|---|
| S-ANX | `tecnicoB` apaga anexo da `osA` | 403 e o download pelo `managerA` segue 200 (antes: 204 e 200→404, `pendencias.md:6730`) |
| S-KM | `tecnicoB` manda `work_order.mileage` da `osA` | `rejected` `not_assigned_to_actor`, lote 200, `mileageStart` segue `null` (antes: `null → 111111`, `pendencias.md:6771`) |
| S-KM-RESTART | `tecnicoA` manda km (aceita) → `managerA` reatribui a `osA` → reenvio do mesmo `client_action_id` no mesmo processo; depois `resetMobileWorkOrderSyncRuntimeForTests()` (simula reinício) e reenvio | 1º reenvio `already_applied`; 2º `rejected` `not_assigned_to_actor`; o km no banco é o aplicado (A4, declarado) |
| S-COM | `tecnicoB` comenta, edita, apaga e (des)taggeia na `osA` | 403 nas 5; comentário do `tecnicoA` intacto |
| S-MOD | moderação | `managerA` edita e apaga comentário do `tecnicoA` → 2xx; `tecnicoA` edita comentário do `managerA` na `osA` → 2xx |
| S-GEO | `tecnicoB` em `geocode` e `geocode-destination` da `osA` | 403 nas 2, provedor desligado (o escopo vem antes do 409/422) |
| S-ORDEM | `tecnicoB` faz `POST …/attachments` **sem** multipart na `osA` | 403 (não 400 `multipart_required`): escopo antes do parse |
| S-XT | `tecnicoB2` (outra organização) em anexo, comentário e km | 404 (cross-tenant intocado) |
| S-DUAL | `osU` atribuída por user id (a forma do app) | o `tecnicoA` anexa, comenta e manda km → 2xx/`accepted` |
| S-ROLES | ator com os papéis `field_technician` e `manager` em `osA` alheia | não-403 em anexo e comentário (união por presença) |

**`-db`** (`tests/o6r07c-subresource-scope-db.test.ts`, cluster descartável `dev07c-`, auto-pulo declarado sem
banco): anexo, comentário e km por Prisma, positivo (atribuído por perfil **e** por user id) e negativo.

**Mutações (cada uma derruba o que está ao lado; o dev grava o vermelho e a restauração):**

| mutação | derruba |
|---|---|
| M1 `getForMutation` sem `assertMutationObjectScope` | G-NEG das **10** vias do 07c-a (as 3 do 07a não passam por ele e seguem verdes — correção do A6), S-ANX, S-KM, S-COM, S-GEO |
| M2 `setMileage` volta a `this.get` | G-NEG da via 10, S-KM |
| M3 `geocodeById`/`geocodeDestinationById` voltam a `findById` | G-NEG das vias 8 e 9, S-GEO |
| M4 controller de anexo faz o multipart antes do escopo | S-ORDEM, G-NEG da via 1 |
| M5 um dos 5 métodos de comentário volta a `assertWorkOrder` | G-NEG da via correspondente, S-COM |
| M6 `assertCanMutate` de comentário passa a exigir só o autor | S-MOD |
| M7 nega tudo (`assigned_only` sempre recusado) | G-POS, S-DUAL |
| M8 escopo aplicado também a `tenant_wide` | G-WIDE, S-MOD |
| M9 `resolveActorOperatorProfileId` devolve `undefined` (o R1 da v1, que não tinha mutação — A6) | `-db` positivo por perfil (o por user id segue verde, dual-match) |
| MG1 rota nova `POST /work-orders/:workOrderId/x` com `work_orders:update` | T1 |
| MG2 `GET` novo que escreve (F1) · MG3 `router.all` (F2) · MG4 sub-router montado com parâmetro (F3) · MG5 `:id` no lugar de `:workOrderId` (F4) · MG6 lote em sub-router (F5) | T1 em cada uma |
| MG7 lote que aceita qualquer `checklist.*` (F6) | T4 |
| MG8 conceder `checklist_runs:create` ao `field_technician` no catálogo | T1 (`POST /mobile/checklist-runs` vira alcançável e não está no instantâneo) |
| MG9 apagar uma entrada do instantâneo · MG10 acrescentar uma entrada `·07c-b` | T1 · T6 |
| MG11 tipo de ação montado em template novo com constante não resolvível | T5 |
| MG12 trocar o extrator de tipos pela regex do v1 | T8 |

### 07c-a.5 Escopo permitido e proibido

**Permitido (caminhos exatos):** `src/modules/work-orders/work-order.service.ts` (só `getForMutation`, `setMileage`,
`geocodeById`, `geocodeDestinationById`) · `src/modules/work-orders/work-order-attachment.service.ts` ·
`src/modules/work-orders/work-order-attachment.controller.ts` · `src/modules/work-order-comments/work-order-comment.service.ts`
· `tests/helpers/o6r07c-census.ts`, `tests/fixtures/o6r07c-classificacao-vias.json`, `tests/o6r07c-census-guard.test.ts`,
`tests/o6r07c-subresource-scope.test.ts`, `tests/o6r07c-subresource-scope-db.test.ts` (novos) · fixtures das suítes da
régua só nas classes (i) OS sem atribuição no arnês → atribuir, e (ii) teste que afirmava o defeito → vira negativo,
cada arquivo listado na evidência · `API_CONTRACTS.md` (as linhas de anexo, comentário, geocode e
`/mobile/sync/work-order-actions`) · registro: `agent-orchestration/controle/pendencias.md` (APPEND),
`pendencias-indice.md` (gerador), `agent-orchestration/codex/log-execucao.md`, `agent-orchestration/omega/juntas/**`.
Os dois arquivos de anexo estão fora da linha do `PLANO_SAN3.md:254`, que em `work-orders/` nomeia só
`work-order.routes.ts` e `work-order.service.ts`: as vias 1 e 2 moram neles — é a ampliação nominal que o CE-2 já
exige (crítica, parágrafo da ampliação). `work-order.routes.ts` fica permitido **sem** mudança prevista.

**Proibido:** `prisma/**`, `src/modules/work-orders/work-order.types.ts`, `src/modules/core-saas/permissions/catalog.ts`
(fora da mutação MG8, revertida), `src/modules/checklists/**`, `src/modules/field-dispatch/**`, `src/modules/mobile/**`
(07c-b), `mobile/**`, `frontend/**`, `Kpis/**` (KPI congelado, §C7.8(5)), `src/app.ts`, `.github/**`, `package.json`,
`package-lock.json`, `.env*`, `RBAC_MATRIX.md` e os demais arquivos-base, as classes R e N (`damages`, `fuel-logs`,
`expense-management`, `telemetry`, `notifications`, `attachments`). **Worktrees de outros agentes, intocáveis:**
`C:/Users/AMP/w-389`, `C:/Users/AMP/w-insp389`, `C:/Users/AMP/w-traccar` (A10: a v1 nomeava `w-389j`, que não existe
na saída de `git worktree list`).

**Interseção com PRs abertos, medida (A10):** o #389 (head `ae863e1a`) toca, além de `src/modules/inventory/**` e
testes de estoque, `prisma/schema.prisma`, `prisma/migrations/20260873000000_add_stock_movements_unique_backstops/`,
`.github/workflows/ci.yml`, `tests/db-catalog-write-guard.test.ts` e `scripts/inventory-duplicates-census.sql`
(`gh pr diff 389 --name-only`); o #388 (head `a24f58b5`) toca `mobile/**`, `Kpis/**` e corpos de agente. **Zero**
interseção com o permitido do 07c-a em código; em registro, só arquivos de APPEND. A trava de
`work-order.service.ts` (`SAN3-13 → 07c`, §6 do plano SAN3) não é violada: o `SAN3-13` não começou (depende do
`B-O6R-11`, #388); a ordem passa a `07c-a → SAN3-13`.

### 07c-a.6 Bateria exata

Cabeçalho da evidência do dev com o ambiente (nada exportado por conveniência no runner); worktree próprio com
`npm ci` próprio; cluster descartável `dev07c-pg`/`dev07c-redis` sem porta pública, removido pelo nome; nunca
5432/6379/3000/5173/5050 nem `erp-*`.

```
DATABASE_URL=URL_DO_CLUSTER_DEV07C npx prisma generate
DATABASE_URL=URL_DO_CLUSTER_DEV07C npx prisma migrate deploy
npm run check
npm run lint
node --test --import tsx tests/o6r07c-census-guard.test.ts tests/o6r07c-subresource-scope.test.ts
DATABASE_URL=URL_DO_CLUSTER_DEV07C node --test --import tsx tests/o6r07c-subresource-scope-db.test.ts
node --test --import tsx tests/o6r07a-wo-object-scope.test.ts          (8 de 8, arquivo sem edição)
node --test --import tsx --test-reporter=tap AS_44_SUITES_DA_REGUA     (memory; 0 fail)
npm test                                                              (forma canônica; N e forma publicados)
npm run build
node scripts/sync-agent-agents.mjs --check                            (se a fábrica criar corpos)
git diff --check
```

Mais: vermelho-controle de cada teste de recusa em `c1cfdabe`; M1–M9 e MG1–MG12 uma a uma, com `git diff` vazio
depois de cada restauração; limpeza §C5 (`storage/checklist-attachments/<uuid>/` das passadas; o `.gitkeep` fica).

### 07c-a.7 Junta

Permissão → **inspetor + 3 cadeiras com veto + unanimidade**, teto de 2 ciclos (§C7.8(1)(2)); crítico no plano (esta
v2 vai à rodada 2). Corpos medidos em `git ls-tree c1cfdabe .claude/agents/`; a fábrica cria os 3 com identidade nova
e o orquestrador os versiona nos dois espelhos.

| cadeira | competência (corpo de origem) | identidade | mandato (no máximo 3 itens) |
|---|---|---|---|
| C1 · escopo por objeto | `coordenador-de-acessos.md` | `jurado-07ca-c1-escopo-por-objeto` | (1) G-NEG/G-POS/G-WIDE por sonda **própria** no head; (2) `RBAC_MATRIX.md:45,66` × catálogo × comportamento, S-MOD, 404 cross-tenant; (3) a km: a semântica é a do status do 07a, e o S-KM-RESTART |
| C2 · censo e guard | `guardiao-fail-closed.md` + `inspetor-de-rotas.md` | `jurado-07ca-c2-censo-e-guard` | (1) gerador **próprio**; contagens 409/146/42/104, 4/439/147/23, 169; (2) reproduzir F1–F6 e executar MG1–MG12; (3) CE-G1 (a)(b)(c) e o T6 na letra |
| C3 · regressão, escopo e registro | corpo novo | `jurado-07ca-c3-regressao-escopo` | (1) régua das 44 + `npm test` + `-db` em cluster próprio; (2) fixtures só (i)/(ii), diff no permitido, proibido vazio; (3) registro — **sem** cobrar KPI |

**Inelegíveis por nome:** `planejador-b-o6r-07c`; o dev do 07c-a; `critico-b-o6r-07c-r1` e a identidade da rodada 2;
`jurado-b07a-autorizacao-e-alcada` (achou o `C1-A1`, `J-O6R-07a-ciclo1.md:13`); `jurado-b07a-c2-autorizacao-s` (achou o
`S-A1`, `J-O6R-07a-ciclo2.md:13,60`); a identidade `coordenador-de-acessos` (achou o `C2-09`,
`votos/SAN3-plano/C2-coordenador-de-acessos-voto.json:54`); a identidade `guardiao-fail-closed` (achou o `C2c2-03`,
`votos/SAN3-plano-ciclo2/C2-guardiao-fail-closed-voto.json:30`); `porteiro-pos-merge` (reconfirmou o `S-A1`; não vota).
**Tensão (§A2) para o orquestrador registrar:** o `PLANO_SAN3.md:254` pede *unanimidade + coordenador-de-acessos*, e
essa identidade é achadora do item 51; a competência entra pela C1, com identidade nova.

### 07c-a.8 Riscos, tamanho e o que fecha

- **R-a1** O guard pesa pouco: o censo leva **8 s** e o de sync **7 s** (medido no worktree). **R-a2** O instantâneo
  de 169 entradas é uma lista a revisar; mitigação: ele nasce do gerador e só **classifica** (a enumeração é gerada),
  e a C2 confere a classe de cada entrada. **R-a3** Fixtures quebrando: regra (i)/(ii)/(iii) da v1, mantida. **R-a4**
  O técnico despachado sem atribuição perde a **km** pelo sync — mas já perdeu o **status** no 07a (crítica E2); a D1
  muda os dois numa porta só.
- **Rollback:** reverter o squash; sem migração e sem dado novo.
- **Tamanho: M** — 4 arquivos de produção com mudança pequena; o volume é o guard (helper, instantâneo, 8 testes).
- **Fecha:** as 10 vias da `P-O6R-SUBRECURSO-OBJECT-SCOPE`, por escopo provado, e o item vinculante dela (*censar o
  sync antes de declarar o SEC-002 fechado*), cumprido pelo gerador v2. **Não fecha:** a pendência inteira (passa a
  PARCIAL, resíduo = as 23 entradas `·07c-b`), o item 51 nem o `Ω6R-SEC-002`.


## 07c-b (espera D1/D2)

**Sem rodeio:** o 07c-b **não começa** antes de o dono responder D1 e D2. É nele — e **só** nele — que o
`Ω6R-SEC-002` fecha (CE-2) e que o item 51 (`P-SAN3-CHECKLIST-RUN-SEM-ESCOPO-POR-OBJETO`) fecha. Até lá, o técnico de
campo continua podendo responder, concluir e dar ciência em vistoria de OS que não é dele, registrar evidência de OS
alheia pelo sync e mexer no status do despacho de um colega — as 23 entradas `·07c-b` do instantâneo, abertas, com
dono.

### 07c-b.1 O que está dentro (23 entradas do instantâneo, todas abertas hoje)

- **Vistoria (18):** as 6 rotas REST `/mobile/checklist-runs/:runId` (responder, anexar, marcar avaria, concluir,
  registrar divergência, dar ciência) e os 7 tipos canônicos do sync de vistoria mais os 5 apelidos
  (`mobile-checklist-sync.ts:50-65`).
- **Evidência de OS (4):** `evidence.work_order_observation`, `_photo`, `_signature` pelo sync e o upload binário
  `POST /mobile/evidence-uploads`.
- **Despacho (1):** `PATCH /operations/dispatches/:dispatchId/status`.

### 07c-b.2 D1 — quem é "o técnico da OS" para escrever na vistoria, na evidência, na km e no status?

Hoje, medido (`probe-dispatch.mts` da crítica, reexecutado por mim em `c1cfdabe`): o despacho pelo mapa **não** grava
a atribuição na OS (OS depois do despacho: só `status: open`); o técnico despachado **responde e conclui** a vistoria
que o despacho criou para ele (200 e 200), muda o status do **próprio** despacho (200, `accepted`) e **não** consegue
mudar o status da OS (403, o 07a). As opções, com o efeito de cada uma em português claro:

- **(a) Só quem foi atribuído na OS** (o que a v1 propunha). Efeito: o técnico mandado pelo mapa, sem a atribuição,
  **deixa de conseguir** fazer a vistoria e mandar as fotos da OS para a qual foi mandado — o despachante passa a ter
  de atribuir **e** despachar, sempre, senão o serviço trava no campo.
- **(b) Quem foi atribuído na OS, ou o alvo de um despacho ativo dessa OS.** Efeito: o fluxo do mapa continua como
  está; o técnico despachado faz vistoria, fotos, km **e passa a poder mudar o status da OS** (hoje o 07a nega); a
  mudança é uma linha na porta única (`getForMutation`). Precisa definir "ativo" (proposta: despacho não cancelado,
  não concluído, não reatribuído).
- **(c) O despacho passa a gravar a atribuição da OS.** Efeito: um critério só (a atribuição); despachar = atribuir;
  reatribuir o despacho troca a atribuição. Muda o fluxo de despacho (`field-dispatch.service.ts`, criação e
  reatribuição), que é do `B-O6R-09`; sai deste bloco ou o amplia.
- **E a equipe (`teamId` da OS)?** A equipe existe no banco (`prisma/schema.prisma:2264` `Team`, `:2288`
  `TeamMember`). **Sim:** qualquer membro da equipe da OS escreve (o ajudante do guincho de duas pessoas faz a
  vistoria). **Não:** só o técnico atribuído/despachado.

**Dependência do Traccar (registrar):** o `B-TRC-01` atribui a posição ao técnico pelo `accepted_at` do despacho,
gravado quando o status vai a `accepted` (`git show 9cb441bd:docs/revisoes/TRACCAR/PLANO_TRACCAR.md`, linhas 485, 593
e 605) — exatamente a via 32. Qualquer resposta à D1 tem de manter o técnico **alvo** aceitando o **próprio**
despacho; a regra "atribuição da OS" aplicada ao despacho (a M4 da v1) quebraria a premissa do Traccar.

### 07c-b.3 D2 — trabalho feito offline e sincronizado depois de uma redistribuição

O caso: o técnico **era** o técnico da OS quando fez a vistoria e tirou as fotos sem sinal; quando o aparelho
sincroniza, o despachante já passou a OS a outro. Hoje o servidor **aceita** (não há escopo). O que o app faz com uma
recusa, medido em `origin/main` (leitura; `mobile/**` é proibido aqui):
- a recusa vira `failed` (`sync_replay_service.dart:507`) e **fica na fila** (`sync_queue_repository.dart:36-46`);
- **toda** replay só reenvia ação com `retryCount < 5` (`sync_replay_service.dart:136` define `maxRetry = 5`; filtros em
  `:150`, `:666`, `:1367`; `evidence_sync.dart:297`);
- nada zera o contador de uma ação `failed` — só o resolvedor de **conflito** (`sync_conflict_resolver.dart:20-27`);
- logo, depois de 5 sincronizações, a ação **fica presa no aparelho, sem saída** (crítica A2). A v1 chamou isso de
  "ruído"; é dado que não chega ao servidor.

**Opções, com o efeito de cada uma:**
- **(a) Recusar.** O trabalho offline de quem deixou de ser o técnico é recusado; o aparelho tenta 5 vezes e desiste,
  e a vistoria/foto fica presa no aparelho. Só é aceitável **junto** com uma saída no app (avisar, descartar
  conscientemente ou mandar ao gestor) — conserto de `mobile/**`.
- **(b) Aceitar se ele era o técnico no momento da coleta.** Nada fica preso. Risco: o "momento da coleta" é o
  relógio do aparelho (`local_created_at`), que o servidor não pode confiar; um relógio errado ou forjado escreve
  numa OS que já é de outro.
- **(c) Aceitar sempre de quem já foi técnico daquela OS alguma vez.** Nada fica preso; o escopo fica mais frouxo:
  um ex-técnico continua escrevendo na OS para sempre.
- **(d) Recusar como CONFLITO, não como recusa.** O servidor devolve a ação no balde `conflicts[]` com o motivo
  `not_assigned_to_actor`. O app **já** mostra conflito na tela de sincronização (`sync_screen.dart`) com duas
  saídas: *manter a minha* (reenvia e zera as tentativas — serve quando o despachante devolve a OS) e *usar a do
  servidor* (descarta conscientemente). Nada fica preso em silêncio e o backend resolve sem mudar o app. **A
  medir no plano do 07c-b antes de prometer:** que as replays de vistoria e de evidência no app levam conflito à
  mesma tela (a de OS leva: `sync_replay_service.dart:755-762`).

**Quem conserta o teto de 5 tentativas.** Ele é **pré-existente** e vale para **toda** recusa permanente, não só a
de escopo. **Não** é o #388: o diff dele não mexe em `maxRetry`/`retryCount` (crítica, A2; e eu medi que o único
arquivo de fila que ele toca, `sync_queue_repository.dart`, só serializa as mutações). **Não** é o 07c-b: `mobile/**`
é proibido num bloco de backend. **Dono proposto:** o `B-SAN3-16` (`fix/mobile-fila-os-drenada`, já dono da fila do
app e já depois do 07c na trava de `mobile-work-order-sync.ts`, `PLANO_SAN3.md:287,357`), ampliado com "ação recusada
de forma permanente ganha saída visível". Se o dono escolher **(d)**, a urgência cai (o conflito tem saída) e o teto
fica como pendência do `B-SAN3-16`; se escolher **(a)**, o 07c-b **só mergeia depois** dessa saída existir, ou o dono
aceita por escrito a vistoria presa no aparelho.

### 07c-b.4 O que vale qualquer que seja a resposta (desenho da v1, com as correções da crítica)

- **Pontos únicos de decisão:** `ChecklistService.assertRunMutationScope` (run → OS → o predicado que a D1 definir,
  pela porta `getForMutation`; run sem OS → nega, fail-closed), chamado no início de todo método que escreve run ou
  filho (`updateRun`, `createAttachment`, `createUploadedAttachment`, `createMarker`, `completeRun`, `registerDivergence`,
  `acknowledgeRun`, e também `reopenRun` e `createRun`); `checklist.controller.ts` chama-o **antes** do parse nas 6
  rotas; `FieldDispatchService.changeStatus` confere o **alvo do despacho** (salvo resposta diferente da D1);
  `mobile-evidence-sync.ts` passa o `work_order_id` pela mesma porta antes de validar o metadado;
  `mobile-evidence-upload.ts` confere de novo depois do recibo. Mesma recusa: 403 no REST, por ação no lote.
- **Despacho é subrecurso da OS — premissa corrigida (A7).** A v1 dizia que mudar o status do despacho escreve na
  linha do tempo da OS; é falso: o evento vai para `fieldDispatchEvent` (`field-dispatch-prisma.repository.ts:117-118`),
  que nada fora de `field-dispatch/` lê (`git grep "fieldDispatchEvent\|field_dispatch_events" -- src frontend/src`, fora
  do módulo → 0). A conclusão se sustenta por outra evidência: o despacho é exibido **na OS** — a aba Mobile do
  detalhe da OS lista os despachos dela (`frontend/src/modules/work-orders/components/tabs/MobileTab.tsx:5-7`).
- **D-07c-IDEMP — premissa corrigida (A4).** Os recibos dos três syncs são `Map` em memória do processo
  (`mobile-work-order-sync.ts:65`, `mobile-checklist-sync.ts:159`, `mobile-evidence-sync.ts:85`). Só o sync de vistoria
  tem idempotência **durável**, e de dois jeitos: por `client_action_id` gravado no metadado (resposta e nota,
  marcador, ciência — `mobile-checklist-sync.ts:429-432`, `:456-457`, `:538-539`) e por **estado** da run (divergência e conclusão,
  `:502-507`, `:621-622`). Regra corrigida: **por `client_action_id`**, o `already_applied` vem antes do escopo (é a
  mesma ação, já gravada); **por estado**, o escopo vem **antes** — o estado da run não diz quem agiu, e um técnico
  que nunca foi o da OS não pode receber `already_applied` pela conclusão de outro. A justificativa da v1 ("o app
  repetiria para sempre") era falsa: repete no máximo 5 vezes (D2).
- **Escopo do 07c-b (a ampliação da v1, que o CE-2 já exige):** `src/modules/checklists/checklist.service.ts`,
  `checklist.controller.ts`, `src/modules/mobile/mobile-checklist-sync.ts` (só `handleAttachmentAttach` e a ordem dos
  handlers por estado), `mobile-evidence-sync.ts`, `mobile-evidence-upload.ts`, `src/modules/field-dispatch/field-dispatch.service.ts`
  (só `changeStatus`; com a D1 (c), também criação e reatribuição — aí o 07c-b cresce e pede nova ampliação).

### 07c-b.5 Testes do 07c-b (os da v1, corrigidos)

- **Laço G** sobre as 23 entradas `·07c-b` (lidas do instantâneo), com **G-WIDE escolhido por sonda (A5):** o primeiro
  papel `tenant_wide` que **não** recebe `permission_required` naquela via — na vistoria, o `manager` só alcança
  `complete` (`catalog.ts`, bloco `manager:`; sem `checklist_runs:update` nem `:acknowledge` desde o `B-SAN3-04a`,
  `pendencias.md:1803`), então o laço usa `operator` (update, complete) e `tenant_admin` (acknowledge); se nenhum
  alcançar, o teste falha dizendo que o G-WIDE está vazio.
- **S-ORFA corrigido (A5):** técnico (atribuído ou não) na run sem OS → 403 `not_assigned_to_actor`; `operator`
  responde a mesma run → não-403 (a tensão "by-scope" do `operator` segue com o `B-SAN3-22`, A8).
- **S-DESPACHADO (novo, A1):** o técnico alvo de despacho ativo, **sem** atribuição na OS, responde a vistoria que o
  despacho provisionou. Esperado: **depende da D1** — (a) 403; (b) e (c) 2xx. O teste nasce com a resposta do dono.
- **S-RECUSA-NO-APP (novo, A2):** depende da D2 — com (d), a ação recusada sai em `conflicts[]` com
  `not_assigned_to_actor`; com (a), em `rejected[]`, e o teste de app do bloco dono (`B-SAN3-16`) prova a saída.
- Mantidos da v1: S-RUN, S-RUN-OK, S-DISP (positivo do próprio despacho), S-EVI, E-UP, S-MIX, S-REPLAY, S-IDEMP (agora
  separado em por-`client_action_id` e por-estado), S-XT, S-DUAL, S-ROLES, S-SVC; `-db` de vistoria, despacho e
  evidência; o **T6 com a lista vazia** é o critério de fechamento.

### 07c-b.6 Tamanho e o que fecha

- **Tamanho: G** com D1 (a) ou (b); **G+** com D1 (c) (entra o fluxo de despacho). Mais o bloco de app da D2, se (a).
- **Fecha:** o resíduo da `P-O6R-SUBRECURSO-OBJECT-SCOPE`, a `P-SAN3-CHECKLIST-RUN-SEM-ESCOPO-POR-OBJETO` e o
  **`Ω6R-SEC-002`**. Entrega o mecanismo de escopo por run que a `P-SAN3-04A-CHECKLIST-ESCOPO-ESTOQUE` espera (a
  definição do escopo do Estoque segue sendo de produto).


## Resposta à crítica r1

Todos os 12 achados foram **aceitos**; nenhum recusado. Onde a crítica pedia decisão do dono, a v2 escreve as opções
e não escolhe. As sondas dela que o plano usa como prova foram **reexecutadas por mim** em `c1cfdabe` (P3):
`probe-dispatch.mts` e `probe-damage.mts` reproduziram as saídas do E2 e do E6, e o `inject.mts` foi usado sem edição
na prova do gerador.

| achado | gravidade | disposição | onde na v2 |
|---|---|---|---|
| A1 · o predicado nega o técnico despachado | bloqueia | **aceito** — virou a decisão **D1** do dono, com 3 opções e a pergunta da equipe; teste S-DESPACHADO nasce com a resposta | 07c-b.2, 07c-b.5; Comum C.1 |
| A2 · a ação recusada fica presa no aparelho depois de 5 tentativas | bloqueia | **aceito** — virou a decisão **D2**, com 4 opções (inclusive recusar como conflito, que usa a tela de conflito que o app já tem); dono do teto proposto: `B-SAN3-16`; não é o #388 nem o 07c-b | 07c-b.3 |
| A3 · o gerador reconhece forma | bloqueia | **aceito** — gerador v2 por interceptação do registro, todo método, lote por comportamento, extrator de tipo v2 e sonda de curinga; F1–F6 provadas por execução, vermelhas no v1 e achadas no v2; guard T1–T8 | Comum C.2; 07c-a.3; Apêndice A |
| A4 · a D-07c-IDEMP descreve mecanismo que não existe | ajuste | **aceito** — km sem chave durável (07c-a); IDEMP reescrita: por `client_action_id` antes do escopo, por estado depois | 07c-a.2; 07c-b.4 |
| A5 · G-WIDE vazio e S-ORFA impossível | ajuste | **aceito** — G-WIDE falha se o ator recebe `permission_required`; no 07c-b o ator é escolhido por sonda (`operator`, `tenant_admin`); S-ORFA usa o `operator` | 07c-a.4; 07c-b.5 |
| A6 · M1 inflada; R1 sem mutação | nota | **aceito** — M1 derruba 10, não 13; M9 (resolvedor de perfil) cobre o R1 do 07c-a; o da run fica com a `-db` do 07c-b | 07c-a.4 |
| A7 · o despacho não escreve na linha do tempo da OS | ajuste | **aceito** — premissa trocada pela evidência certa (aba Mobile da OS) | 07c-b.4 |
| A8 · `operator`/`manager` são by-scope na vistoria | nota | **aceito** — citada a `P-SAN3-04A-CHECKLIST-POR-ESCOPO-ESCRITORIO` (dono `B-SAN3-22`) | Comum C.1 |
| A9 · `POST /damages` debita o extrato de um colega | nota | **aceito** — classe corrigida (dinheiro, não vínculo); pendência nova com severidade e dono; decisão **D3** do dono | Registro |
| A10 · worktree errado e interseção do #389 incompleta | ajuste | **aceito** — `w-389`, `w-insp389`, `w-traccar`; o #389 toca `prisma/**`, `ci.yml`, o teste de escrita no catálogo e um script SQL | 07c-a.5 |
| A11 · tamanho G, dividir | nota | **aceito** — divisão do orquestrador: 07c-a (**M**) e 07c-b (**G**) | 07c-a.8; 07c-b.6 |
| A12 · alcance medido só com o catálogo em código | nota | **aceito como nota** — o guard de paridade catálogo × banco (`backend-postgres`) torna as duas medidas equivalentes enquanto estiver verde; declarado como risco residual | Comum C.2 |

**Fora dos achados, também resolvido:** a ampliação de fronteira da v1 (despacho e upload) fica no 07c-b; a
D-07c-DESPACHO-ALVO vira o **default** do 07c-b, sujeito à D1, com a dependência do Traccar registrada; a tensão
`coordenador-de-acessos` × inelegibilidade segue para o orquestrador registrar (07c-a.7).


## Registro — texto pronto para o orquestrador copiar

### R.1 Pendência nova (A9) — `agent-orchestration/controle/pendencias.md`, APPEND

```
## P-O6R-07C-DANO-DEBITA-EXTRATO-DE-COLEGA (2026-10-10) — o técnico de campo, ao registrar um dano, lança débito no extrato de um colega e escolhe o valor — ALTA (dinheiro)

- status: ABERTA (crítica r1 do plano do B-O6R-07c, achado A9, `critico-b-o6r-07c-r1`; reexecutado pelo planejador `planejador-b-o6r-07c` em `c1cfdabe`)
- **prova (N = 2 papéis · forma: execução):** `field_technician` (`catalog.ts:943`) e `technician` (`catalog.ts:608`) têm `damages:create`; no `POST /damages`, `responsible_operator_profile_id` + `responsible_amount` (`src/modules/damages/damage.service.ts:121-143`) levam a `applyResponsibleStatementEffect` (`:171-173`, corpo em `:496`), que lança o débito no extrato do profissional. Sonda `probe-damage.mts` (apêndice da crítica r1): `field_technician` cria dano num veículo com o perfil de um colega e `responsible_amount: 900` → 201; extrato do colega antes `currentBalance 0, count 0`, depois `currentBalance -900, totalDebits 900, count 1`.
- **causa:** o efeito de dinheiro do dano (Ω4C PR-09) não tem alçada nem restrição de papel sobre QUEM é o responsável e QUANTO; o RBAC só pergunta se o ator pode criar dano.
- **escopo:** `pre-existente` — `f7219abf`, 2026-07-22, PR #270; anterior ao B-O6R-07c e fora da fronteira dele. Nenhum registro anterior (`grep` por `responsible_operator_profile`, `damages:create`, `POST /damages` em `pendencias.md` e `docs/revisoes/O6R/achados.jsonl` → 0).
- **dono:** a nomear pelo estrategista — bloco de **dinheiro** (junta completa, Fable por decisão do dono de 08/10), depois da decisão D3.
- **bloqueia:** a decidir pelo dono (D3). Proposta do planejador: entra no gate da versão vendável (dinheiro lançado contra terceiro sem aprovação).
- **teste de encerramento:** depende da D3. Se o campo não pode: papel de campo com `responsible_*` no `POST /damages` → 403 (ou o débito fica pendente de aprovação de quem tem alçada), extrato do colega inalterado, com vermelho-controle no head-base. Se pode com limite: acima do limite de `APPROVAL_LIMITS.md` → pendente de aprovação.
```

### R.2 Decisões a pedir ao dono — `agent-orchestration/controle/decisoes.md`, como PERGUNTAS ABERTAS

```
- D1-07c (pergunta ao dono, 2026-10-10): quem é o técnico da OS para escrever na vistoria, na evidência, na km e no status?
  (a) só quem foi atribuído na OS — o técnico mandado pelo mapa sem atribuição perde a vistoria e as fotos;
  (b) atribuído OU alvo de despacho ativo da OS — o fluxo do mapa segue; o despachado passa também a mudar o status da OS;
  (c) o despacho passa a gravar a atribuição — um critério só; muda o fluxo de despacho.
  E: membros da equipe da OS (teamId) contam? Bloqueia o B-O6R-07c-b. Planos: docs/revisoes/SAN3/B-O6R-07c-plano.md (07c-b.2).
- D2-07c (pergunta ao dono, 2026-10-10): trabalho feito offline por quem ERA o técnico, sincronizado depois de a OS ir para outro:
  (a) recusar — o app tenta 5 vezes e a vistoria fica presa no aparelho, sem saída, até o app ganhar uma;
  (b) aceitar se ele era o técnico na hora da coleta — pelo relógio do aparelho, que pode estar errado ou forjado;
  (c) aceitar de quem já foi técnico da OS alguma vez — escopo frouxo;
  (d) recusar como conflito — o app já mostra conflito com "manter a minha" e "usar a do servidor"; nada fica preso em silêncio.
  Bloqueia o B-O6R-07c-b. Plano: 07c-b.3.
- D3-07c (pergunta ao dono, 2026-10-10): o técnico de campo pode, ao registrar um dano, lançar débito no extrato de um colega e escolher o valor? Hoje pode (medido: -900). Fora do 07c; dono da pendência P-O6R-07C-DANO-DEBITA-EXTRATO-DE-COLEGA.
```

### R.3 Dependência do Traccar — `decisoes.md` (decisão de desenho, não do dono) e nota no plano do Traccar

```
- D-07c-DESPACHO-ALVO (2026-10-10, planejador do B-O6R-07c; default do 07c-b, sujeito à D1-07c): o status do despacho (PATCH /operations/dispatches/:dispatchId/status) é escopado pelo ALVO do despacho (FieldDispatch.operatorUserId), não pela atribuição da OS. Dependência registrada: o B-TRC-01 atribui a posição ao técnico pelo accepted_at do despacho, gravado quando o status vai a accepted (git show 9cb441bd:docs/revisoes/TRACCAR/PLANO_TRACCAR.md, linhas 485, 593 e 605). Qualquer resposta à D1-07c tem de manter o técnico alvo aceitando o próprio despacho; trocar o critério do despacho pela atribuição da OS quebraria a premissa do Traccar.
```

### R.4 As demais entradas que o bloco deixa (APPEND; o 07c-a e o 07c-b gravam cada uma no PR que as produz)

- **`P-O6R-SUBRECURSO-OBJECT-SCOPE`, append (no PR do 07c-a):** "Bloco dividido pelo orquestrador em 2026-10-10. O
  07c-a fecha por escopo provado as 10 vias desta entrada e cumpre o item vinculante (o censo do sync, agora gerado
  pelo gerador v2, que enumera toda forma de rota e de lote). Resíduo: as 23 entradas `·07c-b` do instantâneo
  `tests/fixtures/o6r07c-classificacao-vias.json` (18 de vistoria, 4 de evidência de OS, 1 de despacho), dono
  `B-O6R-07c-b`, bloqueado pelas decisões D1-07c e D2-07c do dono. Status: PARCIAL. O `Ω6R-SEC-002` segue
  `parcialmente_superado`."
- **Nova `P-O6R-07C-APP-RECUSA-PERMANENTE-SEM-SAIDA`** — MÉDIA (vira ALTA se a D2-07c for "recusar"): ação que o
  servidor recusa de forma permanente fica `failed`, é reenviada no máximo 5 vezes (`sync_replay_service.dart:136,150,666,1367`;
  `evidence_sync.dart:297`) e depois fica presa no aparelho, sem saída — só conflito zera o contador
  (`sync_conflict_resolver.dart:20-27`). `pre-existente` (o teto e a falta de saída antecedem o 07c). Dono proposto:
  `B-SAN3-16`. Teste de encerramento: ação recusada de forma permanente aparece ao usuário com uma saída (descartar
  com aviso ou encaminhar), e nenhuma ação fica invisível na fila.
- **Nova `P-O6R-07C-VINCULO-A-OS-ALHEIA-POR-REFERENCIA`** — MÉDIA, `pre-existente`, dono `fila pós-gate`: classe R do
  censo (10 entradas: `POST /damages`, `POST`/`PATCH /fuel-logs`, `POST`/`PATCH /expense-reports`, `POST
  /expense-reports/:reportId/items`, 3 ações `expense_*` do sync, `POST /mobile/telemetry`) aceitam `work_order_id` no
  corpo sem passar pelo escopo da OS; a OS não muda nem os exibe. O efeito de **dinheiro** do `POST /damages` está
  na pendência própria (R.1), não aqui.
- **Nova `P-O6R-07C-FLEET-ALERTS-RUN-PELO-CAMPO`** — MÉDIA, `pre-existente` (`f47062ba`, 2026-07-09, #152): o
  `POST /notifications/fleet-alerts/run` responde 200 ao `field_technician` e ao `technician` e dispara a varredura da
  organização inteira com distribuição a destinatários (`notification.controller.ts:76-99`), sob `notifications:update`,
  que o `RBAC_MATRIX.md:86` diz ser da própria caixa. Dono `fila pós-gate`.
- **`P-SAN3-04A-CHECKLIST-ESCOPO-ESTOQUE`, append:** o mecanismo de escopo por run nasce no 07c-b; a definição do
  escopo do Estoque é de produto; dono passa a `fila pós-gate` depois do 07c-b.
- **`P-O6R-B01-RELIGACAO-SEM-REMEDIO`, append (dono órfão, `PLANO_SAN3.md:400-401`):** não cabe no 07c (superfície de
  identidade, fora do alcance do técnico: `/auth/identity-links*` responde 401 `jwt_required` na sonda); ganha bloco
  próprio pós-gate, a nomear pelo estrategista.
- **`P-O6R-B11`, append:** o despacho não grava a atribuição da OS (`git grep -nF ".assign(" -- src/modules/field-dispatch`
  → 0); com o guard do 07a, o técnico despachado sem atribuição não muda o status da OS. A resposta é a D1-07c.
- **Tensão (§A2):** `PLANO_SAN3.md:254` pede *unanimidade + coordenador-de-acessos* para o 07c; a identidade
  `coordenador-de-acessos` é achadora do `C2-09` (item 51) e a casa não deixa quem achou votar no conserto
  (`J-B-O6R-07b.md:17`). Resolução proposta: a competência entra pela C1 com identidade nova.


## Apêndice A — os geradores v2, verbatim (P3: roteiro de reexecução)

Rodados com cwd = `C:/Users/AMP/w-07c` (código de `c1cfdabe`), depois de `npm ci` e `prisma generate`, sem
`DATABASE_URL`/`REDIS_URL`. Ordem: `node --import tsx census-v2.mts c2.json [injecao.mts]` → `node --import tsx
census-sync-v2.mts c2.json s2.json [injecao.mts]` → `node classify-v2.cjs c2.json s2.json [instantaneo.json]`.
A injeção F1–F5 é o `inject.mts` do apêndice da crítica r1 (`B-O6R-07c-CRITICA-r1.md`), sem edição; a F6 é a
`inject-prefixo.mts` abaixo. O `tests/helpers/o6r07c-census.ts` do dev porta estes arquivos sem mudar o algoritmo.

### census-v2.mts

```ts
// Censo v2 do B-O6R-07c — enuncia a PROPRIEDADE, não a forma (resposta ao A3 da crítica r1).
// 1) Toda camada registrada em QUALQUER Router (use/route, inclusive app.use) é anotada com o caminho ORIGINAL no
//    momento do registro (interceptação de Router.prototype.use/route do pacote `router` que o Express 5 usa) —
//    montagem com parâmetro, sub-router de sub-router e nome de parâmetro qualquer saem com o caminho verdadeiro.
// 2) TODO método é sondado, inclusive GET/HEAD; rota `all` é sondada nos 5 verbos.
// 3) "Alcança" = a resposta não é 401 nem 403 de permissão/papel/tenant/plataforma (o RBAC deixou passar).
// Uso (cwd = raiz do worktree): node --import tsx census-v2.mts <saida.json> [modulo-de-injecao.mts]
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
process.env.LOG_LEVEL = "silent"; process.env.CORE_SAAS_PERSISTENCE = "memory";
delete process.env.DATABASE_URL; delete process.env.REDIS_URL;
const req0 = createRequire(process.cwd() + "/package.json");
const RouterPkg = createRequire(req0.resolve("express"))("router");
const origUse = RouterPkg.prototype.use, origRoute = RouterPkg.prototype.route;
RouterPkg.prototype.use = function (...args: any[]) {
  const before = this.stack.length;
  let path: any = "/";
  if (typeof args[0] !== "function") { let a = args[0]; while (Array.isArray(a) && a.length) a = a[0]; if (typeof a !== "function") path = args[0]; }
  const out = origUse.apply(this, args);
  for (const l of this.stack.slice(before)) l.__mount = path;
  return out;
};
RouterPkg.prototype.route = function (path: any) {
  const before = this.stack.length;
  const route = origRoute.call(this, path);
  for (const l of this.stack.slice(before)) l.__path = path;
  return route;
};
const root = new URL(pathToFileURL(process.cwd()).href + "/src/");
const imp = (p: string) => import(new URL(p, root).href);
const { createApp } = await imp("app.ts");
const { CoreSaasRegistry } = await imp("modules/core-saas/services/core-saas.service.ts");
const { MemoryCoreSaasAdapter } = await imp("modules/core-saas/services/memory-core-saas.adapter.ts");
const { InMemoryCoreSaasStore } = await imp("modules/core-saas/store/core-saas.store.ts");
const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
const tenant = core.createTenant({ name: "Censo v2 07c", modules: ["work_orders"] });
const app = createApp(new MemoryCoreSaasAdapter(core));
if (process.argv[3]) await (await import(pathToFileURL(process.argv[3]).href)).inject(app);
const join = (a: string, b: string) => (a.replace(/[/]+$/, "") + "/" + String(b).replace(/^[/]+/, "")).replace(/[/]+$/, "") || "/";
type R = { method: string; path: string };
const routes: R[] = []; const semCaminho: string[] = [];
(function walk(stack: any[], prefix: string) {
  for (const l of stack) {
    if (l.route) {
      const p = l.__path ?? l.route.path;
      if (typeof p !== "string") { semCaminho.push(String(p)); continue; }
      const ms = Object.keys(l.route.methods).flatMap((m) => (m === "_all" ? ["get", "post", "put", "patch", "delete"] : [m]));
      for (const m of new Set(ms)) routes.push({ method: m.toUpperCase(), path: join(prefix, p) });
    } else if (l.handle?.stack) {
      const mp = l.__mount;
      if (typeof mp !== "string") { semCaminho.push(String(mp)); continue; }
      walk(l.handle.stack, join(prefix, mp));
    }
  }
})((app as any).router.stack, "");
const server = app.listen(0, "127.0.0.1"); await new Promise((r) => server.once("listening", r));
const base = `http://127.0.0.1:${(server.address() as any).port}`;
const user = randomUUID(); const out: any[] = [];
for (const r of routes) {
  const url = base + r.path.replace(/:([A-Za-z0-9_]+)/g, () => randomUUID());
  const row: any = { method: r.method, path: r.path };
  for (const role of ["field_technician", "technician", "viewer"]) {
    const res = await fetch(url, { method: r.method, headers: { "content-type": "application/json", "x-tenant-id": tenant.id, "x-user-id": user, "x-role": role }, body: r.method === "GET" || r.method === "HEAD" || r.method === "DELETE" ? undefined : "{}", signal: AbortSignal.timeout(4000) }).catch((e: any) => ({ status: 0, text: async () => "", streamed: String(e?.name) }));
    // Resposta que não termina em 4 s (fluxo SSE): os cabeçalhos chegaram, então o RBAC deixou passar → conta como alcance.
    const text = await (res as any).text().catch(() => ""); let reason = ""; try { reason = JSON.parse(text)?.error?.reason ?? ""; } catch {}
    row[role] = (res as any).status === 0 ? "sem-resposta-em-4s" : `${(res as any).status}${reason ? ":" + reason : ""}`;
  }
  out.push(row);
}
server.close();
const barrado = (s: string) => /^403:(permission_required|role_required|tenant_required|platform_permission_required)$/.test(s) || /^401/.test(s);
const reach = out.filter((x) => !barrado(x.field_technician) || !barrado(x.technician));
fs.writeFileSync(process.argv[2], JSON.stringify({ total: out.length, semCaminho, reach }, null, 1));
const por = (m: (x: any) => boolean) => reach.filter(m).length;
console.log(`rotas registradas: ${out.length} | camadas sem caminho de texto: ${semCaminho.length} | alcançadas pelo campo: ${reach.length} (GET/HEAD ${por((x) => x.method === "GET" || x.method === "HEAD")} · mutantes ${por((x) => x.method !== "GET" && x.method !== "HEAD")})`);
process.exit(0);
```

### census-sync-v2.mts

```ts
// Censo v2 das ações de sync. Lotes = toda rota POST que o censo v2 achou alcançável e que RESPONDE como lote
// (devolve a ação num balde ou diz "unsupported_action*") a um envelope com tipo inexistente — sem olhar o caminho.
// Tipos = extrator v2 (tipos.mts) sobre todo .ts não-teste de src/modules. Cada lote também tem de RECUSAR tipo
// inexistente, nu e com o prefixo de cada família conhecida — senão há despacho por prefixo/curinga.
// Uso: node --import tsx census-sync-v2.mts <c2.json> <saida.json> [modulo-de-injecao.mts]
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { extrairTipos } from "./tipos.mts";
process.env.LOG_LEVEL = "silent"; process.env.CORE_SAAS_PERSISTENCE = "memory";
delete process.env.DATABASE_URL; delete process.env.REDIS_URL;
const root = new URL(pathToFileURL(process.cwd()).href + "/src/");
const imp = (p: string) => import(new URL(p, root).href);
const { createApp } = await imp("app.ts");
const { CoreSaasRegistry } = await imp("modules/core-saas/services/core-saas.service.ts");
const { MemoryCoreSaasAdapter } = await imp("modules/core-saas/services/memory-core-saas.adapter.ts");
const { InMemoryCoreSaasStore } = await imp("modules/core-saas/store/core-saas.store.ts");
const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
const tenant = core.createTenant({ name: "Censo sync v2", modules: ["work_orders"] });
const app = createApp(new MemoryCoreSaasAdapter(core));
if (process.argv[4]) await (await import(pathToFileURL(process.argv[4]).href)).inject(app);
const server = app.listen(0, "127.0.0.1"); await new Promise((r) => server.once("listening", r));
const base = `http://127.0.0.1:${(server.address() as any).port}`;
const user = randomUUID();
async function enviar(path: string, role: string, type: string) {
  const id = randomUUID();
  const payload = { work_order_id: randomUUID(), run_id: randomUUID(), local_run_id: randomUUID(), component_id: randomUUID(), status: "accepted", mileage_start: 1, note: "x", observation: "x", message: "x", value: "x" };
  const body = { client_batch_id: randomUUID(), actions: [{ client_action_id: id, clientActionId: id, client_evidence_id: id, type, local_created_at: new Date().toISOString(), payload }] };
  const res = await fetch(base + path.replace(/:([A-Za-z0-9_]+)/g, () => randomUUID()), { method: "POST", headers: { "content-type": "application/json", "x-tenant-id": tenant.id, "x-user-id": user, "x-role": role }, body: JSON.stringify(body), signal: AbortSignal.timeout(4000) }).catch(() => null);
  if (!res) return { lote: false, r: "sem-resposta" };
  const j: any = await res.json().catch(() => ({}));
  const reason = j?.error?.reason ?? "";
  let achou: any; const d = j?.data ?? {};
  for (const k of Object.keys(d)) if (Array.isArray(d[k])) for (const a of d[k]) if (a?.client_action_id === id || a?.client_evidence_id === id || a?.clientActionId === id) achou = { k, a };
  const lote = Boolean(achou) || /unsupported_action/.test(reason);
  return { lote, r: achou ? `${achou.k}:${achou.a?.error?.reason ?? achou.a?.status ?? ""}` : `${res.status}:${reason}` };
}
const c2 = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const posts = c2.reach.filter((x: any) => x.method === "POST").map((x: any) => x.path);
const INEX = "__tipo_inexistente_07c__";
const lotes: string[] = [];
for (const p of posts) { const a = await enviar(p, "field_technician", INEX + ".x"); const b = await enviar(p, "technician", INEX + ".x"); if (a.lote || b.lote) lotes.push(p); }
const arquivos = execFileSync("git", ["ls-files", "src/modules"], { encoding: "utf8" }).split(String.fromCharCode(10)).filter((f) => /[.]ts$/.test(f) && !/test/.test(f));
const tipos = new Set<string>(); const naoResolvidos: string[] = [];
for (const f of arquivos) { const e = extrairTipos(fs.readFileSync(f, "utf8")); e.tipos.forEach((t) => tipos.add(t)); e.naoResolvidos.forEach((t) => naoResolvidos.push(f + ": " + t)); }
const familias = [...new Set([...tipos].map((t) => t.split(".")[0]))].sort();
const naoAlcanca = (s: string) => /permission_required|role_required|tenant_required|unsupported_action/.test(s);
const curinga: string[] = []; const rows: any[] = [];
for (const lote of lotes) {
  for (const fam of ["", ...familias]) {
    const t = (fam ? fam + "." : "") + INEX;
    for (const role of ["field_technician", "technician"]) { const r = await enviar(lote, role, t); if (!naoAlcanca(r.r) && !/^403:/.test(r.r)) curinga.push(`${lote} · ${t} · ${role} → ${r.r}`); }
  }
  for (const type of [...tipos].sort()) {
    const row: any = { endpoint: lote, type };
    for (const role of ["field_technician", "technician"]) row[role] = (await enviar(lote, role, type)).r;
    rows.push(row);
  }
}
server.close();
const reach = rows.filter((r) => !naoAlcanca(r.field_technician) || !naoAlcanca(r.technician));
fs.writeFileSync(process.argv[3], JSON.stringify({ lotes, tiposN: tipos.size, familias: familias.length, naoResolvidos, curinga, reach }, null, 1));
console.log(`POST alcançáveis: ${posts.length} | lotes (por comportamento): ${lotes.length} | arquivos: ${arquivos.length} | tipos: ${tipos.size} | famílias: ${familias.length} | pares alcançados: ${reach.length} | tipo inexistente aceito (curinga): ${curinga.length} | template de tipo não resolvido: ${naoResolvidos.length}`);
for (const l of lotes) console.log("lote:", l);
for (const c of curinga.slice(0, 10)) console.log("CURINGA:", c);
for (const n of naoResolvidos.slice(0, 10)) console.log("NAO-RESOLVIDO:", n);
process.exit(0);
```

### tipos.mts

```ts
// Extrator v2 de tipos de ação de sync (resposta ao A3, parte "regex de tipo"). Aceita aspas duplas, simples e
// crase; maiúsculas, dígitos e hífen; e template com ${CONSTANTE} resolvida a partir de `const X = "..."` do mesmo
// arquivo. Template com forma de tipo que NÃO se resolve volta em `naoResolvidos` (o guard o trata como falha).
export const FORMA_TIPO = /^[A-Za-z][A-Za-z0-9_-]*([.][A-Za-z0-9_-]+)+$/;
export function extrairTipos(fonte: string): { tipos: Set<string>; naoResolvidos: string[] } {
  const tipos = new Set<string>(); const naoResolvidos: string[] = [];
  const consts = new Map<string, string>();
  for (const m of fonte.matchAll(/const ([A-Za-z_][A-Za-z0-9_]*)[ ]*(?::[^=;]+)?=[ ]*["'`]([^"'`$]*)["'`]/g)) consts.set(m[1], m[2]);
  for (const m of fonte.matchAll(/"([^"]*)"|'([^']*)'|`([^`]*)`/g)) {
    let v = m[1] ?? m[2] ?? m[3] ?? "";
    if (m[3] !== undefined && v.includes("${")) {
      const forma = v.replace(/[$][{][^}]*[}]/g, "X");
      if (!FORMA_TIPO.test(forma)) continue;
      const r = v.replace(/[$][{]([A-Za-z_][A-Za-z0-9_]*)[}]/g, (_t, n) => consts.get(n) ?? "${" + n + "}");
      if (r.includes("${")) { naoResolvidos.push(v); continue; }
      v = r;
    }
    if (FORMA_TIPO.test(v)) tipos.add(v);
  }
  return { tipos, naoResolvidos };
}
// O extrator do plano v1 (Apêndice A, census-sync.mts), para a prova comparativa.
export function extrairTiposV1(fonte: string): Set<string> {
  return new Set([...fonte.matchAll(/"([a-z_]+[.][a-z_.]+)"/g)].map((m) => m[1]));
}
```

### classify-v2.cjs

```js
// classify-v2.cjs <c2.json> <s2.json> [snapshot.json] [--gravar-snapshot <arquivo>]
// Sem snapshot: classifica pelas REGRAS (é assim que o snapshot nasce, revisado pelo planejador).
// Com snapshot: o snapshot DECIDE — via viva fora dele = NAO-CLASSIFICADA (default negar); entrada do snapshot que
// não está mais viva = ENVELHECIDA. As regras continuam marcando quem PERTENCE à propriedade (coluna "prop").
const fs = require("fs");
const args = process.argv.slice(2);
const c2 = JSON.parse(fs.readFileSync(args[0], "utf8"));
const s2 = JSON.parse(fs.readFileSync(args[1], "utf8"));
const snapArg = args[2] && !args[2].startsWith("--") ? args[2] : null;
const gi = args.indexOf("--gravar-snapshot"); const gravar = gi >= 0 ? args[gi + 1] : null;
const snap = snapArg ? JSON.parse(fs.readFileSync(snapArg, "utf8")) : null;
const lotes = new Set(s2.lotes);
const OS_SEG = /[/](work-orders|checklist-runs|dispatches)[/]:[A-Za-z0-9_]+/;   // propriedade: recurso-da-OS + parâmetro de QUALQUER nome
const propHttp = (m, p) => OS_SEG.test(p) || p.endsWith("/mobile/evidence-uploads");
const propSync = (t) => /^work_order[.]/.test(t) || /^checklist/.test(t) || /^evidence[.]work_order_/.test(t);
const G07A = new Set(["PATCH /api/v1/work-orders/:workOrderId", "PATCH /api/v1/work-orders/:workOrderId/status", "SYNC work_order.status_change"]);
const R = new Set(["POST /api/v1/mobile/telemetry", "POST /api/v1/fuel-logs", "PATCH /api/v1/fuel-logs/:fuelLogId", "POST /api/v1/damages", "POST /api/v1/expense-reports", "PATCH /api/v1/expense-reports/:reportId", "POST /api/v1/expense-reports/:reportId/items", "SYNC expense_item.create", "SYNC expense_report.create", "SYNC expense_report.submit"]);
const N = new Set(["POST /api/v1/auth/login", "POST /api/v1/auth/refresh", "POST /api/v1/auth/logout", "POST /api/v1/notifications/fleet-alerts/run", "POST /api/v1/notifications/:notificationId/read", "POST /api/v1/notifications/read-all", "POST /api/v1/notifications/:notificationId/archive", "POST /api/v1/mobile/field-locations", "POST /api/v1/damages/:damageId/attachments", "POST /api/v1/attachments", "DELETE /api/v1/attachments/:attachmentId", "POST /api/v1/expense-reports/:reportId/submit", "SYNC evidence.field_observation", "SYNC evidence.field_photo", "SYNC evidence.field_signature"]);
function porRegra(k, m, p, t) {
  if (G07A.has(k)) return "OS·07a";
  if (t !== undefined) {
    if (/^work_order[.]/.test(t)) return "OS·07c-a";
    if (/^checklist/.test(t)) return "VISTORIA·07c-b";
    if (/^evidence[.]work_order_/.test(t)) return "EVIDENCIA-OS·07c-b";
  } else {
    if (lotes.has(p)) return "LOTE";
    if (m === "GET" || m === "HEAD") return "LEITURA";
    if (/[/]work-orders[/]:[A-Za-z0-9_]+/.test(p)) return "OS·07c-a";
    if (/[/]checklist-runs[/]:[A-Za-z0-9_]+/.test(p)) return "VISTORIA·07c-b";
    if (/[/]dispatches[/]:[A-Za-z0-9_]+/.test(p)) return "DESPACHO·07c-b";
    if (p.endsWith("/mobile/evidence-uploads")) return "EVIDENCIA-OS·07c-b";
  }
  if (R.has(k)) return "R";
  if (N.has(k)) return "N";
  return "NAO-CLASSIFICADA";
}
const vivas = [];
for (const x of c2.reach) vivas.push({ k: `${x.method} ${x.path}`, m: x.method, p: x.path, ft: x.field_technician, tech: x.technician, prop: propHttp(x.method, x.path) });
for (const r of s2.reach) vivas.push({ k: `SYNC ${r.endpoint} · ${r.type}`, kt: `SYNC ${r.type}`, m: "SYNC", p: r.endpoint, t: r.type, ft: r.field_technician, tech: r.technician, prop: propSync(r.type) });
const linhas = vivas.map((v) => ({ ...v, c: snap ? (snap[v.k] ?? "NAO-CLASSIFICADA") : porRegra(v.kt ?? v.k, v.m, v.p, v.t) }));
const envelhecidas = snap ? Object.keys(snap).filter((k) => !vivas.some((v) => v.k === k)) : [];
const cont = {}; for (const l of linhas) cont[l.c] = (cont[l.c] || 0) + 1;
console.log("CONTAGEM: " + Object.entries(cont).sort().map(([c, n]) => `${c}=${n}`).join(" · ") + ` · total=${linhas.length}`);
console.log(`NA PROPRIEDADE (regra): ${linhas.filter((l) => l.prop).length} · ENVELHECIDAS: ${envelhecidas.length} · CURINGA: ${s2.curinga.length} · TEMPLATE-NAO-RESOLVIDO: ${s2.naoResolvidos.length}`);
for (const l of linhas.filter((l) => l.c === "NAO-CLASSIFICADA")) console.log(`NAO-CLASSIFICADA${l.prop ? " (na propriedade)" : ""}: ${l.k} ft=${l.ft} tech=${l.tech}`);
for (const e of envelhecidas) console.log("ENVELHECIDA: " + e);
if (gravar) { const o = {}; for (const l of linhas) o[l.k] = l.c; fs.writeFileSync(gravar, JSON.stringify(o, null, 1)); console.log("snapshot gravado:", gravar, Object.keys(o).length, "entradas"); }
if (process.env.TABELA) for (const l of linhas.filter((l) => l.c !== "LEITURA")) console.log(`| ${l.k.replace("/api/v1", "")} | ${l.c} | ${l.ft} | ${l.tech} |`);
```

### inject-prefixo.mts

```ts
// Forma F6 (A3, "despacho por prefixo"): um lote de sync que aceita QUALQUER tipo `checklist.*` — nenhum literal
// de tipo novo existe na fonte, então só a sonda de tipo inexistente por família o denuncia.
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
export async function inject(app: any) {
  const root = new URL(pathToFileURL(process.cwd()).href + "/src/");
  const imp = (p: string) => import(new URL(p, root).href);
  const { Router } = createRequire(process.cwd() + "/package.json")("express");
  const { attachAuthenticatedActor } = await imp("modules/auth/index.ts");
  const { tenantContextMiddleware } = await imp("modules/core-saas/middleware/tenant-context.middleware.ts");
  const { createPersistentRbacContextMiddleware } = await imp("modules/core-saas/middleware/persistent-rbac-context.middleware.ts");
  const { requirePermission } = await imp("modules/core-saas/middleware/rbac.middleware.ts");
  const r = Router();
  r.use(tenantContextMiddleware); r.use(createPersistentRbacContextMiddleware());
  r.post("/mobile/sync/prefixo-actions", requirePermission("work_orders:status"), (q: any, s: any) => {
    const accepted: any[] = []; const rejected: any[] = [];
    for (const a of q.body?.actions ?? []) {
      if (String(a.type).startsWith("checklist.")) accepted.push({ client_action_id: a.client_action_id, status: "accepted" });
      else rejected.push({ client_action_id: a.client_action_id, status: "rejected", error: { reason: "unsupported_action_type" } });
    }
    s.status(200).json({ data: { accepted, rejected } });
  });
  const st = app.router.stack; const before = st.length;
  app.use("/api/v1", attachAuthenticatedActor(), r);
  const added = st.splice(before, st.length - before);
  st.splice(before - 1, 0, ...added);
}
```

### prova-tipos.mts

```ts
// Prova do A3 (tipos): as formas que a crítica mediu como invisíveis ao extrator v1, num trecho de fonte de teste.
import { extrairTipos, extrairTiposV1 } from "./tipos.mts";
const D = "checklist";
const fonte = [
  "const D = " + JSON.stringify(D) + ";",
  "if (t === 'checklist.x') {}",
  "if (t === `${D}.via_template`) {}",
  "if (t === \"checklist.photo_v2\") {}",
  "if (t === \"checklist-run.reopen\") {}",
  "if (t === \"Checklist.PhotoAdd\") {}",
  "if (t === `checklist.crase_sem_interpolacao`) {}",
  "if (t === `${desconhecida}.dinamico`) {}",
].join(String.fromCharCode(10));
const esperado = ["checklist.x", "checklist.via_template", "checklist.photo_v2", "checklist-run.reopen", "Checklist.PhotoAdd", "checklist.crase_sem_interpolacao"];
const v1 = extrairTiposV1(fonte); const v2 = extrairTipos(fonte);
for (const t of esperado) console.log(t.padEnd(34), "v1:", v1.has(t) ? "acha" : "NAO ACHA", "| v2:", v2.tipos.has(t) ? "acha" : "NAO ACHA");
console.log("template dinâmico não resolvido (v2 devolve para o guard falhar):", JSON.stringify(v2.naoResolvidos));
```

## Apêndice B — a classificação gerada em `c1cfdabe` (o instantâneo, sem as leituras)

Saída de `TABELA=1 node classify-v2.cjs c2.json s2.json`, sem edição: 65 entradas (as 169 do instantâneo menos as
104 `LEITURA`, listadas depois). Colunas: via · classe · resposta ao `field_technician` · resposta ao `technician`.

| via | classe | field_technician | technician |
|---|---|---|---|
| POST /auth/login | N | 400 | 400 |
| POST /auth/refresh | N | 400 | 400 |
| POST /auth/logout | N | 200 | 200 |
| POST /mobile/sync/work-order-actions | LOTE | 400:invalid_envelope | 400:invalid_envelope |
| POST /mobile/sync/checklist-actions | LOTE | 400:invalid_envelope | 400:invalid_envelope |
| POST /mobile/sync/evidence-actions | LOTE | 400:invalid_envelope | 400:invalid_envelope |
| POST /mobile/evidence-uploads | EVIDENCIA-OS·07c-b | 400:invalid_content_type | 400:invalid_content_type |
| POST /mobile/telemetry | R | 422:operator_profile_required | 422:operator_profile_required |
| POST /notifications/fleet-alerts/run | N | 200 | 200 |
| POST /notifications/:notificationId/read | N | 404:notification_not_found | 404:notification_not_found |
| POST /notifications/read-all | N | 200 | 200 |
| POST /notifications/:notificationId/archive | N | 404:notification_not_found | 404:notification_not_found |
| PATCH /mobile/checklist-runs/:runId | VISTORIA·07c-b | 404:checklist_run_not_found | 404:checklist_run_not_found |
| POST /mobile/checklist-runs/:runId/attachments | VISTORIA·07c-b | 400:invalid_request | 400:invalid_request |
| POST /mobile/checklist-runs/:runId/markers | VISTORIA·07c-b | 400:invalid_request | 400:invalid_request |
| POST /mobile/checklist-runs/:runId/complete | VISTORIA·07c-b | 404:checklist_run_not_found | 404:checklist_run_not_found |
| POST /mobile/checklist-runs/:runId/divergence | VISTORIA·07c-b | 400:invalid_request | 400:invalid_request |
| POST /mobile/checklist-runs/:runId/acknowledgement | VISTORIA·07c-b | 400:invalid_request | 400:invalid_request |
| POST /mobile/field-locations | N | 400:invalid_number | 400:invalid_number |
| PATCH /work-orders/:workOrderId | OS·07a | 404:not_found | 404:not_found |
| PATCH /work-orders/:workOrderId/status | OS·07a | 404:not_found | 404:not_found |
| POST /work-orders/:workOrderId/attachments | OS·07c-a | 400:multipart_required | 400:multipart_required |
| DELETE /work-orders/:workOrderId/attachments/:attachmentId | OS·07c-a | 404:work_order_not_found | 404:work_order_not_found |
| POST /work-orders/:workOrderId/geocode | OS·07c-a | 404:not_found | 404:not_found |
| POST /work-orders/:workOrderId/geocode-destination | OS·07c-a | 404:not_found | 404:not_found |
| POST /fuel-logs | R | 400:required_field | 403:permission_required |
| PATCH /fuel-logs/:fuelLogId | R | 404:not_found | 403:permission_required |
| POST /damages | R | 400:required_field | 400:required_field |
| POST /damages/:damageId/attachments | N | 400:multipart_required | 400:multipart_required |
| POST /work-orders/:workOrderId/comments | OS·07c-a | 404:not_found | 404:not_found |
| PATCH /work-orders/:workOrderId/comments/:commentId | OS·07c-a | 404:not_found | 404:not_found |
| DELETE /work-orders/:workOrderId/comments/:commentId | OS·07c-a | 404:not_found | 404:not_found |
| POST /work-orders/:workOrderId/comments/:commentId/tags/:tagId | OS·07c-a | 404:not_found | 404:not_found |
| DELETE /work-orders/:workOrderId/comments/:commentId/tags/:tagId | OS·07c-a | 404:not_found | 404:not_found |
| POST /attachments | N | 400:multipart_required | 400:multipart_required |
| DELETE /attachments/:attachmentId | N | 404:attachment_not_found | 404:attachment_not_found |
| PATCH /operations/dispatches/:dispatchId/status | DESPACHO·07c-b | 404:not_found | 403:permission_required |
| POST /expense-reports | R | 403:permission_required | 400:required_field |
| PATCH /expense-reports/:reportId | R | 403:permission_required | 404:not_found |
| POST /expense-reports/:reportId/items | R | 403:permission_required | 404:not_found |
| POST /expense-reports/:reportId/submit | N | 403:permission_required | 404:not_found |
| POST /mobile/sync/expense-actions | LOTE | 403:permission_required | 400:invalid_actions |
| SYNC /mobile/sync/work-order-actions · work_order.mileage | OS·07c-a | rejected:not_found | rejected:not_found |
| SYNC /mobile/sync/work-order-actions · work_order.status_change | OS·07a | rejected:not_found | rejected:not_found |
| SYNC /mobile/sync/checklist-actions · checklist.acknowledgement_create | VISTORIA·07c-b | rejected:checklist_run_not_found | rejected:checklist_run_not_found |
| SYNC /mobile/sync/checklist-actions · checklist.attachment_attach | VISTORIA·07c-b | rejected:checklist_run_not_found | rejected:checklist_run_not_found |
| SYNC /mobile/sync/checklist-actions · checklist.complete | VISTORIA·07c-b | rejected:checklist_run_not_found | rejected:checklist_run_not_found |
| SYNC /mobile/sync/checklist-actions · checklist.divergence_create | VISTORIA·07c-b | rejected:checklist_run_not_found | rejected:checklist_run_not_found |
| SYNC /mobile/sync/checklist-actions · checklist.item_answer | VISTORIA·07c-b | rejected:checklist_run_not_found | rejected:checklist_run_not_found |
| SYNC /mobile/sync/checklist-actions · checklist.item_note | VISTORIA·07c-b | rejected:checklist_run_not_found | rejected:checklist_run_not_found |
| SYNC /mobile/sync/checklist-actions · checklist.marker_create | VISTORIA·07c-b | rejected:checklist_run_not_found | rejected:checklist_run_not_found |
| SYNC /mobile/sync/checklist-actions · checklist_acknowledgement.create | VISTORIA·07c-b | rejected:checklist_run_not_found | rejected:checklist_run_not_found |
| SYNC /mobile/sync/checklist-actions · checklist_attachment.attach | VISTORIA·07c-b | rejected:checklist_run_not_found | rejected:checklist_run_not_found |
| SYNC /mobile/sync/checklist-actions · checklist_divergence.create | VISTORIA·07c-b | rejected:checklist_run_not_found | rejected:checklist_run_not_found |
| SYNC /mobile/sync/checklist-actions · checklist_marker.create | VISTORIA·07c-b | rejected:checklist_run_not_found | rejected:checklist_run_not_found |
| SYNC /mobile/sync/checklist-actions · checklist_run.complete | VISTORIA·07c-b | rejected:checklist_run_not_found | rejected:checklist_run_not_found |
| SYNC /mobile/sync/evidence-actions · evidence.field_observation | N | accepted:accepted | accepted:accepted |
| SYNC /mobile/sync/evidence-actions · evidence.field_photo | N | rejected:required_field | rejected:required_field |
| SYNC /mobile/sync/evidence-actions · evidence.field_signature | N | rejected:required_field | rejected:required_field |
| SYNC /mobile/sync/evidence-actions · evidence.work_order_observation | EVIDENCIA-OS·07c-b | accepted:accepted | accepted:accepted |
| SYNC /mobile/sync/evidence-actions · evidence.work_order_photo | EVIDENCIA-OS·07c-b | rejected:required_field | rejected:required_field |
| SYNC /mobile/sync/evidence-actions · evidence.work_order_signature | EVIDENCIA-OS·07c-b | rejected:required_field | rejected:required_field |
| SYNC /mobile/sync/expense-actions · expense_item.create | R | 403:permission_required | 400:required_field |
| SYNC /mobile/sync/expense-actions · expense_report.create | R | 403:permission_required | 400:required_field |
| SYNC /mobile/sync/expense-actions · expense_report.submit | R | 403:permission_required | 400:required_field |

**As 104 `LEITURA`:** `GET /health` · `GET /health/ready` · `GET /health/worker` · `GET /me` · `GET /mobile/bootstrap` · `GET /mobile/inventory/availability` · `GET /navigation/menu` · `GET /notifications` · `GET /notifications/unread-count` · `GET /tenant/checklist-components` · `GET /tenant/checklists` · `GET /tenant/checklists/templates` · `GET /tenant/checklists/:checklistId` · `GET /mobile/checklists/available` · `GET /mobile/checklists/:checklistId/render` · `GET /mobile/checklist-runs` · `GET /mobile/checklist-runs/:runId/attachments/:attachmentId/download` · `GET /mobile/checklist-runs/:runId/comparison` · `GET /approvals/pending` · `GET /approvals/:approvalId` · `GET /work-orders` · `GET /work-orders/:workOrderId` · `GET /work-orders/:workOrderId/timeline` · `GET /work-orders/:workOrderId/attachments` · `GET /work-orders/:workOrderId/attachments/:attachmentId/download` · `GET /work-orders/:workOrderId/map-start-points` · `GET /dashboard/summary` · `GET /customers` · `GET /customers/:customerId` · `GET /vehicles` · `GET /vehicles/:vehicleId` · `GET /fuel-logs` · `GET /fuel-logs/:fuelLogId` · `GET /maintenance-orders` · `GET /maintenance-orders/odometer-suggestion` · `GET /maintenance-orders/:maintenanceOrderId` · `GET /maintenance-orders/:maintenanceOrderId/items` · `GET /fines` · `GET /fines/:fineId` · `GET /damages` · `GET /damages/:damageId` · `GET /damages/:damageId/attachments` · `GET /damages/:damageId/attachments/:attachmentId/download` · `GET /service-catalog` · `GET /service-catalog/:serviceId` · `GET /price-tables` · `GET /price-tables/:priceTableId` · `GET /tariffs` · `GET /tariffs/:tariffId` · `GET /yards` · `GET /yards/:yardId` · `GET /yards/:yardId/occupancy` · `GET /yards/:yardId/areas` · `GET /yard-areas/:areaId` · `GET /yard-areas/:areaId/spots` · `GET /yard-spots/:spotId` · `GET /jurisdiction-defaults` · `GET /jurisdiction-profiles` · `GET /jurisdiction-profiles/:profileId` · `GET /impound-processes` · `GET /impound-processes/:processId` · `GET /impound-processes/:processId/events` · `GET /impound-processes/:processId/verify` · `GET /impound-processes/:processId/inspection` · `GET /impound-processes/:processId/notifications` · `GET /impound-processes/:processId/checklist-runs` · `GET /impound-processes/:processId/custody-history` · `GET /impound-processes/:processId/charges` · `GET /impound-processes/:processId/charges/statement` · `GET /impound-processes/:processId/release` · `GET /impound-processes/:processId/auction` · `GET /impound-processes/:processId/auction/settlement` · `GET /patios/dashboard/summary` · `GET /vehicle-identities` · `GET /vehicle-identities/:identityId` · `GET /service-quotes` · `GET /service-quotes/:serviceQuoteId` · `GET /service-quotes/:serviceQuoteId/items` · `GET /work-orders/:workOrderId/financial-items` · `GET /work-orders/:workOrderId/comments` · `GET /work-orders/:workOrderId/audit-logs` · `GET /branches` · `GET /branches/:branchId` · `GET /suppliers` · `GET /suppliers/:supplierId` · `GET /tags` · `GET /tags/:tagId` · `GET /pois` · `GET /pois/:poiId` · `GET /operator-profiles` · `GET /operator-profiles/:profileId` · `GET /attachments` · `GET /attachments/:attachmentId/download` · `GET /teams` · `GET /teams/:teamId` · `GET /operations/dispatches` · `GET /operations/dispatches/:dispatchId` · `GET /operations/dispatches/:dispatchId/timeline` · `GET /operations/work-orders-timeseries` · `GET /commissions/calculations/mine` · `GET /commissions/statements/my-summary` · `GET /expense-categories` · `GET /expense-reports` · `GET /expense-reports/:reportId`
