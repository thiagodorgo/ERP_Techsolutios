# B-O6R-07c — Plano v3: escopo por objeto nos subrecursos da OS — 07c-a (guard por propriedade) e 07c-b

> **Papel:** `planejador-mestre` · **identidade:** `planejador-b-o6r-07c` (a mesma da v1 e da v2).
> **Modelo que rodou:** **Opus 5.5 — substituição DECLARADA** (§C7.6-bis, `D-FALLBACK-MODELO-FABLE-OPUS`).
> **Por que o Fable faltou:** não faltou por cota — o dono **reservou o Fable a bloco de dinheiro**
> (decisão de 08/10); este bloco é de **PERMISSÃO**. O frontmatter do `planejador-mestre` continua `fable`.
> **Ref medida:** ramo `fix/o6r07c-subresource-scope`, head `39e7c836e63e71b56b6abf303d3ea4e64b9f8a86` (v1, r1, v2, r2);
> código em `origin/main` = `c1cfdabe12c74b58f8393dbee4f333224c56b303` (o ramo não toca `src/`). Medido por
> `git rev-parse HEAD origin/main` no worktree `C:/Users/AMP/w-07c` (§A7).
> **Insumos:** crítica r1 (`B-O6R-07c-CRITICA-r1.md`, `critico-b-o6r-07c-r1`) e crítica r2 (`B-O6R-07c-CRITICA-r2.md`,
> `critico-b-o6r-07c-r2`): **07c-a volta ao plano só no guard; 07c-b pronto para planejar depois de D1/D2**. A r2 foi a
> última rodada de crítica (máximo de 2): o guard será julgado **pela junta, por mutação**. Versões anteriores no
> histórico: v1 `00109988`, v2 `f7334f34`.
> **O que a v3 muda:** só o guard (censo, lotes, classificação e as mutações dele) e o texto que vai ao dono. O conserto
> das 10 vias do 07c-a (07c-a.1 e 07c-a.2) foi **validado pela r2** e fica como está.
> **Estado:** COMPLETO (seção a seção; o Apêndice A foi reexecutado a partir do texto deste arquivo: instantâneo idêntico, 0 violação na base, N1/N2 vermelhos).

## Resumo

- **07c-a** (não depende do dono): as 10 vias registradas + o guard. **07c-b** (espera D1/D2): vistoria (18),
  evidência (4) e despacho (1). **O `Ω6R-SEC-002` só fecha no 07c-b.**
- **Guard v3 — a propriedade, enunciada:** (1) **toda camada** do app que pode responder a uma requisição é contada
  — rota, roteador, sub-app e middleware — e o que não está classificado, ou mudou de contagem, deixa o guard
  vermelho; (2) nenhum middleware responde 2xx/3xx ao papel de campo; (3) o conjunto de tipos que um lote **aceita** vem
  dos pontos em que o **despachante decide** pelo campo `type`, com dobra de constante; o que não se resolve deixa o guard
  vermelho; (4) "alcança" e "aceita" são decididos por **igualdade de respostas** (com e sem permissão; tipo × tipo
  inexistente), nunca por texto do motivo; (5) a classe escrita no instantâneo é **conferida** contra a propriedade
  (via da OS não pode ser `N`/`LEITURA`), e leitura que muda o estado da OS deixa o guard vermelho.
- **Prova por execução:** as 6 formas da r2 (N1 middleware com caminho, N2 sub-app, N3a ponto dentro da constante, N3b
  concatenação, N3c tipo sem ponto, N10 recusa por validação) e a má classificação do B3 ficam **verdes no guard v2** e
  **vermelhas no guard v3**; as 6 da r1 (F1–F6) continuam vermelhas; a linha de base (`c1cfdabe`) dá **0 violação**.
- **Tamanho:** 07c-a passa a **G** (o produto é pequeno; o guard é a maior parte); 07c-b segue **G**.

## Comum — a propriedade e o gerador v3

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
- **Uma porta só — a certa (B5 da r2):** a porta é **`assertMutationObjectScope`** (`work-order.service.ts:808-840`), não
  `getForMutation`. `update` (`:852`) e `changeStatus` (`:1319`) a chamam **direto**; `getForMutation` (07c-a) a chama;
  e a vistoria e a evidência do 07c-b passam por `getForMutation`. Logo, qualquer resposta à D1 aplicada **em
  `assertMutationObjectScope`** alcança, de uma vez, as 3 vias do 07a, as 10 do 07c-a e as do 07c-b. Aplicada em
  `getForMutation`, não alcançaria o status nem a edição da OS. Se a D1 vier "atribuição **ou** despacho ativo", o
  técnico despachado volta a poder mudar o status **e editar** a OS, o que hoje o 07a nega (crítica r1 E2).

**Fronteiras declaradas (mantidas da v1, com as correções da crítica):** leitura fora (escopo de leitura é do
`B-SAN3-13`); registro próprio que só **aponta** para uma OS (classe R) fora — **exceto** que o `POST /damages` não é
só apontar: debita o extrato de um colega (A9, registro abaixo); moderação de comentário (`D-Ω3F-5-COMMENT`,
`work-order-comment.service.ts:139-145`) intacta dentro da OS que cabe ao técnico. Os papéis de escritório
`operator` e `manager` "passam sempre" **quanto à atribuição da OS**; na vistoria a matriz lhes dá "…-by-scope"
(`RBAC_MATRIX.md:44`) — tensão **já registrada** em `P-SAN3-04A-CHECKLIST-POR-ESCOPO-ESCRITORIO`
(`agent-orchestration/controle/pendencias.md:9724`, dono `B-SAN3-22`), que este bloco não resolve (A8).

### C.2 O gerador v3 — a propriedade do guard, enunciada (B1, B2, B3 da r2)

**Por que o v2 não bastava (r2, E3–E5, reproduzido por mim):** o `walk` do v2 só descia em `l.route` e
`l.handle.stack` e **pulava sem contar** toda camada terminal (183 hoje, 14 chaves, todas middleware) — por isso um
handler montado como middleware (N1) e um sub-app `express()` (N2) escreviam com o guard verde; o extrator de tipos
testava a **forma** antes de resolver a constante e só olhava literais com ponto (N3a–c escapavam); e o censo de lotes
decidia "não alcança" por **substring** do motivo (`/role_required/` casava `checklist_role_required`, N10).

**A propriedade que o guard v3 enuncia, e o mecanismo de cada parte:**

1. **Toda camada que pode responder é contada e classificada.** O `census-v3.mts` intercepta o registro
   (`Router.prototype.use`/`route` do pacote `router`, `node_modules/router/index.js:362,425`, e
   `express.application.use`, `node_modules/express/lib/application.js:190-240`, que é onde o sub-app vira
   `mounted_app`) e o `walk` conta **toda** camada: `ROTA <método> <caminho>`, `ROTEADOR <montagem>`, `SUBAPP <montagem>`
   (e desce nele), `MIDDLEWARE <montagem> · <nome>` e `SEM-CAMINHO <montagem>` (caminho que não é texto). O instantâneo
   guarda **a contagem** de cada chave: camada nova em qualquer posição — inclusive um middleware anônimo a mais no
   mesmo roteador — muda a contagem e deixa o guard vermelho.
2. **Nenhum middleware responde sucesso ao campo.** Toda camada é instrumentada (o cabeçalho `x-censo-07c` diz quem
   respondeu); o censo sonda toda rota, todo caminho de montagem de middleware (5 verbos) e um caminho inexistente sob
   cada montagem, com os dois papéis de campo. Middleware que encerra a requisição com status abaixo de 400 → vermelho.
   É a prova, por execução, de que as 183 camadas middleware de hoje **não respondem nem escrevem** para o campo: elas
   passam adiante: no censo de `c1cfdabe`, a **única** camada middleware que encerrou requisição foi o 404 final
   (`mwRespostas` = `MIDDLEWARE /api/v1 · (anônima)` → só `404`); as recusas 401/403 vêm de dentro da pilha das rotas.
3. **O conjunto de tipos aceitos vem do despachante.** O `tipos-v3.mts` não procura literais com cara de tipo: usa o
   compilador TypeScript (`typescript` 5.9.3, já dependência de desenvolvimento) para achar **os pontos em que o código
   decide pelo campo `type`** do contrato — `X.type`, `X["type"]`, `{ type }` desestruturado, e o que deriva deles por
   variável ou parâmetro (ponto fixo no programa inteiro) — em igualdade, `switch`/`case`, `includes`/`has`/`indexOf`,
   acesso por chave (`TABELA[t]`) e `startsWith`/`endsWith`/`includes`/`test` (prefixo = **curinga**). O valor comparado
   é **dobrado**: literal de qualquer aspa, template, concatenação, `as`/`satisfies`, `const` local ou **importada**
   (pelo checker), propriedade de objeto `const`, chaves de objeto e elementos de array/`Set`/`Map`. O que não se dobra
   vai para `naoResolvidos` com arquivo:linha → vermelho. Sem filtro de forma: tipo sem ponto entra.
4. **"Alcança" e "aceita" sem ler texto.** Rota: o papel de campo com as permissões dele × o **mesmo** papel sem
   permissão nenhuma (`x-permissions: nenhuma`, `tenant-context.middleware.ts:37-39,73-86`): respostas iguais = o RBAC
   decide. Lote: um tipo é **aceito** quando a resposta do gestor (todas as permissões) a ele difere da resposta a um
   tipo inexistente; é **alcançado** pelo papel de campo quando a resposta do papel é **igual** à do gestor (a permissão
   por ação não o barrou). Toda comparação é igualdade de `status + balde + code + reason` — nenhuma substring.
5. **A classe é conferida, não só a presença (B3).** Pertença à propriedade = regra por recurso (`work-orders`,
   `checklist-runs`, `dispatches` seguidos de parâmetro de qualquer nome, e `mobile/evidence-uploads`) **ou**
   comportamento (trocar um parâmetro do caminho pela OS, vistoria ou despacho reais muda a resposta do gestor). Via da
   propriedade que muta só aceita classe da propriedade (`OS·07a`, `OS·07c-a`, `·07c-b`, `OS·SEM-ALCANCE`, `LOTE`);
   leitura da propriedade só aceita `LEITURA-OS`, e toda `LEITURA-OS` passa pela **impressão digital** da OS (detalhe,
   comentários, anexos, linha do tempo, vistorias, despachos) antes e depois do GET do técnico **não atribuído**: mudou
   → vermelho. Classe `*SEM-ALCANCE*` exige que o campo **não** alcance (status 401/403 iguais com e sem permissão).

**Números em `c1cfdabe`** (cwd `C:/Users/AMP/w-07c`, Node v20.19.5, sem `DATABASE_URL`/`REDIS_URL`; Apêndice A):

```
node --import tsx census-v3.mts c3.json            (21 s)
  → camadas: ROTA 409 · ROTEADOR 75 · SUBAPP 0 · MIDDLEWARE 183 (14 chaves) · SEM-CAMINHO 0
  → alcançadas (diferencial): field_technician 125 · technician 123 · toca-por-caminho 31 · toca-por-corpo 0
  → middleware que respondeu sucesso ao campo: 0 · leitura que escreve: 0
node --import tsx sync-v3.mts c3.json s3.json      (12 s, 8,5 s dos quais na análise do TypeScript)
  → tipos candidatos (do despachante): 59 | lotes: 5 | pares aceitos: 30 (alcançados: field_technician 20 · technician 23)
    | não resolvidos: 3 | curingas estáticos: 3 | curinga dinâmico: 0 | lotes instáveis: 0
node classify-v3.cjs c3.json s3.json --gravar inst-base.json
  → DESPACHO·07c-b=1 · EVIDENCIA-OS·07c-b=4 · LEITURA=174 · LEITURA-OS=12 · LOTE=5 · MIDDLEWARE=183 · N=15 · OS·07a=3
    · OS·07c-a=10 · OS·SEM-ALCANCE=15 · R=10 · ROTEADOR=75 · SEM-ALCANCE-CAMPO=172 · VISTORIA·07c-b=18
  → chaves vivas: 468 | entradas ·07c-b: 23 | VIOLAÇÕES: 0
```

Paridade com a v2, conferida: as 10 do `OS·07c-a`, as 3 do `OS·07a` e as 23 `·07c-b` são as mesmas; os 20 pares que o
`field_technician` alcança e os 23 do `technician` são os 23 da v2 (que somava os dois papéis). Diferenças, todas
explicadas: o v3 classifica as **409** rotas (não só as alcançadas) e as 183 camadas middleware; acha **5** lotes (o de
estoque, que o campo não alcança, entra como `SEM-ALCANCE-CAMPO`); e o diferencial deixa de contar como "alcançadas" as
rotas públicas e as que recusam igual com e sem permissão (`/auth/*`, `/health*`, `/me`, `/mobile/bootstrap`,
`/navigation/menu` e o `/attachments` genérico, que valida antes de checar permissão) — essas ficam como `N` ou
`LEITURA`, nunca como `SEM-ALCANCE` (que exige 401/403).

**As listas literais de hoje (item novo em qualquer uma = vermelho):**
- `naoResolvidos` aceitos (3): `src/config/business-time.ts`, `src/modules/telemetry/telemetry.dto.ts` e
  `src/modules/charging/charge.accrual.ts`, todos `part.type === type` — partes de `Intl.DateTimeFormat.formatToParts`,
  não tipo de ação.
- curingas estáticos aceitos (3): `mobile-evidence-sync.ts:327-328` (`type.includes(".work_order_")`,
  `type.endsWith("_photo")`, `type.endsWith("_signature")`) — classificação **depois** de `isSupportedActionType`
  (`:249`, lista fechada `supportedActionTypes`, `:540-542`), não despacho.

**Prova por execução — formas da r2 (verbatim do apêndice dela) e da r1, guard v2 × guard v3:**

| forma | guard v2 (`c1cfdabe` + injeção; reexecutado por mim) | guard v3 (mesma injeção, instantâneo de `c1cfdabe`) |
|---|---|---|
| N1 · middleware com caminho `/work-orders/:workOrderId/via-use` | **verde**: `409 rotas · 146 alcançadas`, `NAO-CLASSIFICADA` ausente | **vermelho**: `NAO-CLASSIFICADA: MIDDLEWARE …/via-use` + 2 `MIDDLEWARE-RESPONDE-SUCESSO` (200 aos dois papéis) + contagens de `/api/v1` mudadas |
| N2 · sub-app `express()` em `/api/v1` | **verde** (mesma saída) | **vermelho**: `NAO-CLASSIFICADA: SUBAPP /api/v1` e `NAO-CLASSIFICADA (na propriedade): ROTA POST …/via-subapp` |
| N9 · caminho em array (controle da r2) | vermelho (T3) | **vermelho**: `SEM-CAMINHO` |
| N3a · `${WO_PREFIX}odometro` com `WO_PREFIX = "work_order."` | **verde**: `tipos 439 · pares 23` | **vermelho**: `NAO-CLASSIFICADA (na propriedade): PAR …work-order-actions · work_order.odometro` |
| N3b · `WO_FAM + ".reboque"` | **verde** | **vermelho**: `… · work_order.reboque` |
| N3c · `"km_rapida"` (sem ponto) | **verde** | **vermelho**: `NAO-CLASSIFICADA: PAR … · km_rapida` |
| N3d · constante importada que não se resolve | (não medido ponta a ponta na r2) | **vermelho**: `TIPO-NAO-RESOLVIDO` (`prova-tipos-v3.mts`) |
| N10 · recusa de validação `checklist_role_required` | **verde**: `tipos 440 · pares 23` (descartado pela substring) | **vermelho**: `NAO-CLASSIFICADA (na propriedade): PAR … · work_order.vistoria_set` |
| B3 · F1 como `LEITURA`, F3 e F4 como `N` no instantâneo | **verde** para as 3 (cai de 9 para 6 `NAO-CLASSIFICADA`) | **vermelho**: 3 `CLASSE-INCOMPATIVEL` (F1 esperado `LEITURA-OS`; F3 e F4 `N (na propriedade)`) |
| F1′ · GET que **escreve** de verdade, inscrito como `LEITURA-OS` (`inject-get-escreve.mts`) | — | **vermelho**: `LEITURA-ESCREVE: GET …/aceitar-por-link` |
| F1–F5 da r1 (`inject.mts`) | vermelho (v2) | **vermelho**: 14 violações (as 9 rotas + roteadores `/api/v1/mobile` e `…/notas` novos + contagens) |
| F6 da r1 (`inject-prefixo.mts`) | vermelho (v2) | **vermelho**: rota e 8 pares `NAO-CLASSIFICADA` + `CURINGA-DINAMICO` |

Extrator v3 sobre as formas de tipo (`prova-tipos-v3.mts`): N3a, N3b, N3c, N10, aspas simples, maiúscula, hífen,
dígito, despacho por tabela, por desestruturação e por parâmetro repassado → **resolvidos**; constante importada que não
se resolve e comparação com variável → **`naoResolvidos`**; `startsWith` → **curinga**. Nenhum caso cai em "nem um nem
outro".

**Riscos residuais, declarados (não são formas que escapam em silêncio, e sim limites do que se mede):**
- uma camada **existente** cujo corpo passe a escrever sem mudar a estrutura (mesma chave, mesma contagem) não muda o
  instantâneo — é mudança de comportamento, coberta pelos testes do módulo e pelo G-NEG do laço, não pelo censo;
- despacho por um campo que **não** seja `type` violaria o contrato dos lotes (API_CONTRACTS, o app manda `type`); se
  acontecer, o tipo novo não entra como candidato — mas a rota do lote é a mesma, e o par só seria visto pelo teste do
  módulo;
- o "toca-por-corpo" (pôr `work_order_id` real no corpo) deu **0** em `c1cfdabe`: as rotas validam o corpo antes de
  resolver a referência; a classe `R` continua sendo declaração revisada, não medição;
- o alcance é medido com o catálogo em código; equivale ao banco enquanto `tests/permission-catalog-db-parity.test.ts`
  estiver verde no `backend-postgres` (`.github/workflows/ci.yml:134,194`) — nota A12 da r1, mantida;
- a rota polimórfica `/attachments` (B8): o discriminador `entity_type` vem de um registro
  (`attachment-entity-resolver.ts:80-135`); o guard v3 ganha o **T13**, que lê `entityTypes()` do registro real e o
  compara com a lista literal das 4 de hoje (`damage`, `fine`, `insurance_policy`, `maintenance_order`) — entidade nova
  no registro → vermelho. Rota polimórfica **nova** já cai no T1 (rota nova).

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

### 07c-a.3 O guard que o 07c-a entrega (o mesmo que o 07c-b vai esvaziar) — v3

- `tests/helpers/o6r07c-census.ts` — porta, **sem mudar o algoritmo**, do `census-v3.mts`, `sync-v3.mts`,
  `tipos-v3.mts` e `classify-v3.cjs` do Apêndice A (a C2 compara as contagens com um gerador **dela**).
- `tests/fixtures/o6r07c-classificacao-vias.json` — o **instantâneo** de `c1cfdabe`: 468 chaves com `{ classe, n }`,
  gerado por `classify-v3.cjs --gravar` e revisado (Apêndice B). Chaves: `ROTA <método> <caminho>`,
  `ROTEADOR <montagem>`, `SUBAPP <montagem>`, `MIDDLEWARE <montagem> · <nome>` e `PAR <lote> · <tipo>`.
- `tests/o6r07c-census-guard.test.ts`, com estes testes (cada um é uma propriedade, não uma lista de casos):

| id | asserção | falha quando |
|---|---|---|
| T1 | toda chave viva está no instantâneo | camada nova de qualquer forma — rota, roteador, sub-app, middleware, par de lote |
| T2 | toda chave do instantâneo está viva | rota ou camada removida ou renomeada sem atualizar a classificação |
| T3 | zero `SEM-CAMINHO` | camada montada com caminho que não é texto (array, regex) |
| T4 | a contagem `n` de cada chave é a viva | camada a mais (ou a menos) numa chave que já existe — inclusive middleware anônimo no mesmo roteador |
| T5 | nenhum middleware encerra requisição do campo com status abaixo de 400 | handler montado como middleware (N1), em qualquer caminho de montagem ou caminho inexistente sob ela |
| T6 | a classe escrita é compatível com a propriedade (regras do item 5 da C.2) | via da OS inscrita como `N`, `R`, `LEITURA` ou `SEM-ALCANCE-CAMPO`; `SEM-ALCANCE` que o campo alcança; `LOTE` sem comportamento de lote, ou lote com outra classe |
| T7 | nenhuma `LEITURA-OS` muda a impressão digital da OS | GET da propriedade que escreve (F1′) |
| T8 | `naoResolvidos` ⊆ a lista literal dos 3 de hoje | ponto de despacho por `type` cujo valor não se dobra (constante importada sem origem, variável) |
| T9 | curingas estáticos ⊆ a lista literal dos 3 de hoje | despacho por prefixo/sufixo/regex no `type` |
| T10 | zero curinga dinâmico e zero lote instável | lote que aceita `<família>.<inexistente>`, ou que responde diferente a dois tipos inexistentes |
| T11 | o conjunto das entradas `·07c-b` é **exatamente** a lista literal das 23 de hoje | via empurrada para o 07c-b sem passar pela junta (catraca: só diminui; no 07c-b, chega a vazio) |
| T12 | as formas das duas críticas, injetadas num app novo, são achadas: F1–F6 (r1), N1, N2, N9, N3a, N3b, N3c, N10 (r2), F1′ e a má classificação do B3 | o gerador regride para reconhecer forma — é o teste que fica **vermelho com o gerador v2** (tabela da C.2) |
| T13 | `createDefaultAttachmentEntityResolver().entityTypes()` = `damage`, `fine`, `insurance_policy`, `maintenance_order` | entidade nova na rota polimórfica `/attachments` (B8) |

O T12 usa as injeções verbatim dos apêndices das críticas (`inject.mts` da r1; `inject-novas.mts`, `inject-tipo.mts`,
`inject-motivo.mts` da r2) e as deste plano (`inject-prefixo.mts`, `inject-get-escreve.mts`), copiadas para
`tests/fixtures/o6r07c-formas/`. Tempo medido do censo inteiro: **21 s + 12 s**; o T12 roda o censo uma vez por forma —
o dev pode agrupar as formas compatíveis numa injeção só, desde que cada uma continue com a sua asserção.

### 07c-a.4 Testes de encerramento e mutações

**Régua (baseline medido na v1, válido: o código não mudou):** 44 suítes não-`-db` das vias tocadas, em
`c1cfdabe`, `CORE_SAAS_PERSISTENCE=memory` → `# tests 430 · pass 427 · fail 0 · skipped 3` (3 auto-pulos declarados).
**N = 8** (os testes do 07a que provam a propriedade) → **M ≥ 16**; o 07c-a entrega ≥ 40 (13 do laço G + 10
semânticos + 13 do guard, o T12 com uma asserção por forma + ≥ 4 `-db`).

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

**Mutações (cada uma derruba o que está ao lado; o dev grava o vermelho e a restauração; CE-G1(c)):**

| mutação | derruba |
|---|---|
| M1 `getForMutation` sem `assertMutationObjectScope` | G-NEG das **10** vias do 07c-a (as 3 do 07a não passam por ele), S-ANX, S-KM, S-COM, S-GEO |
| M2 `setMileage` volta a `this.get` | G-NEG da via 10, S-KM |
| M3 `geocodeById`/`geocodeDestinationById` voltam a `findById` | G-NEG das vias 8 e 9, S-GEO |
| M4 controller de anexo faz o multipart antes do escopo | S-ORDEM, G-NEG da via 1 |
| M5 um dos 5 métodos de comentário volta a `assertWorkOrder` | G-NEG da via correspondente, S-COM |
| M6 `assertCanMutate` de comentário passa a exigir só o autor | S-MOD |
| M7 nega tudo (`assigned_only` sempre recusado) | G-POS, S-DUAL |
| M8 escopo aplicado também a `tenant_wide` | G-WIDE, S-MOD, **S-ROLES** (B4) |
| M9 `resolveActorOperatorProfileId` devolve `undefined` | `-db` positivo por perfil (o por user id segue verde) |
| **M10** (B4) `getForMutation` converte o 404 da OS em 403 `not_assigned_to_actor` | **S-XT** (o cross-tenant deixa de ser 404) |
| **M11** (B4) o sync de OS consulta o recibo **depois** do `processAction` (`mobile-work-order-sync.ts:81-105`, mutação temporária) | **S-KM-RESTART, 1ª asserção** (o reenvio no mesmo processo vira `rejected`, não `already_applied`) |
| MG1 rota nova `POST /work-orders/:workOrderId/x` com `work_orders:update` | T1 (e T6 se inscrita como `N`) |
| MG2 middleware com caminho que responde 200 (N1) | T1, T4, T5 |
| MG3 sub-app `express()` com rota de OS (N2) | T1, T4 |
| MG4 rota com caminho em array (N9) | **T3** (B4) |
| **MG5** (B4) apagar a rota `DELETE /work-orders/:workOrderId/comments/:commentId/tags/:tagId` do router | **T2** (entrada envelhecida) |
| MG6 tipo novo em lote existente: `${CONST}` com ponto na constante, concatenação, sem ponto (N3a–c) | T1 |
| MG7 tipo novo comparado com constante importada inexistente (N3d) | T8 |
| MG8 tipo novo cujo payload do censo falha validação com motivo que contém `role_required` (N10) | T1 |
| MG9 lote que aceita qualquer `checklist.*` (F6) | T1, T10 |
| MG10 despacho por `startsWith` num lote | T9 |
| MG11 inscrever F1 como `LEITURA` e F3/F4 como `N` (B3) | T6 |
| MG12 GET da propriedade que escreve na OS, inscrito como `LEITURA-OS` (F1′) | T7 |
| MG13 conceder `checklist_runs:create` ao `field_technician` no catálogo | T6 (`POST /mobile/checklist-runs` está como `SEM-ALCANCE-CAMPO` e passa a ser alcançada) |
| MG14 acrescentar uma entrada `·07c-b` ao instantâneo | T11 |
| MG15 registrar `work_order` como entidade de `/attachments` | T13 |
| MG16 trocar o `tipos-v3` pelo extrator do v2, ou o `walk` pelo do v2 | T12 |

Os testes do laço G e os semânticos seguem os da v2 (validados pela r2, E7). Uma regra nova, do B3: o laço G lê do
instantâneo **toda** entrada `OS·07a` e `OS·07c-a` e monta a requisição pela receita genérica (parâmetros pela semente,
corpo `{}`); entrada que não produza o 403 do G-NEG **falha** — o laço **nunca pula** uma entrada.

### 07c-a.5 Escopo permitido e proibido

**Permitido (caminhos exatos):** `src/modules/work-orders/work-order.service.ts` (só `getForMutation`, `setMileage`,
`geocodeById`, `geocodeDestinationById`) · `src/modules/work-orders/work-order-attachment.service.ts` ·
`src/modules/work-orders/work-order-attachment.controller.ts` · `src/modules/work-order-comments/work-order-comment.service.ts`
· `tests/helpers/o6r07c-census.ts`, `tests/fixtures/o6r07c-classificacao-vias.json`, `tests/o6r07c-census-guard.test.ts`,
`tests/o6r07c-subresource-scope.test.ts`, `tests/o6r07c-subresource-scope-db.test.ts`, `tests/fixtures/o6r07c-formas/**`
(as injeções do T12) (novos; o helper usa o `typescript` que já é dependência de desenvolvimento — nenhuma
dependência nova) · fixtures das suítes da
régua só nas classes (i) OS sem atribuição no arnês → atribuir, e (ii) teste que afirmava o defeito → vira negativo,
cada arquivo listado na evidência · `API_CONTRACTS.md` (as linhas de anexo, comentário, geocode e
`/mobile/sync/work-order-actions`) · registro: `agent-orchestration/controle/pendencias.md` (APPEND),
`pendencias-indice.md` (gerador), `agent-orchestration/codex/log-execucao.md`, `agent-orchestration/omega/juntas/**`.
Os dois arquivos de anexo estão fora da linha do `PLANO_SAN3.md:254`, que em `work-orders/` nomeia só
`work-order.routes.ts` e `work-order.service.ts`: as vias 1 e 2 moram neles — é a ampliação nominal que o CE-2 já
exige (crítica, parágrafo da ampliação). `work-order.routes.ts` fica permitido **sem** mudança prevista.

**Proibido:** `prisma/**`, `src/modules/work-orders/work-order.types.ts`, `src/modules/core-saas/permissions/catalog.ts`
(fora das mutações temporárias MG13 e M11 — esta em `mobile-work-order-sync.ts` —, sempre revertidas), `src/modules/checklists/**`, `src/modules/field-dispatch/**`, `src/modules/mobile/**`
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

Mais: vermelho-controle de cada teste de recusa em `c1cfdabe`; M1–M11 e MG1–MG16 uma a uma, com `git diff` vazio
depois de cada restauração; limpeza §C5 (`storage/checklist-attachments/<uuid>/` das passadas; o `.gitkeep` fica).

### 07c-a.7 Junta

Permissão → **inspetor + 3 cadeiras com veto + unanimidade**, teto de 2 ciclos (§C7.8(1)(2)); a crítica do plano
terminou (r1 e r2, o máximo); a junta julga o guard **por mutação**. Corpos medidos em `git ls-tree c1cfdabe .claude/agents/`; a fábrica cria os 3 com identidade nova
e o orquestrador os versiona nos dois espelhos.

| cadeira | competência (corpo de origem) | identidade | mandato (no máximo 3 itens) |
|---|---|---|---|
| C1 · escopo por objeto | `coordenador-de-acessos.md` | `jurado-07ca-c1-escopo-por-objeto` | (1) G-NEG/G-POS/G-WIDE por sonda **própria** no head; (2) `RBAC_MATRIX.md:45,66` × catálogo × comportamento, S-MOD, 404 cross-tenant; (3) a km: a semântica é a do status do 07a, e o S-KM-RESTART |
| C2 · censo e guard | `guardiao-fail-closed.md` + `inspetor-de-rotas.md` | `jurado-07ca-c2-censo-e-guard` | (1) gerador **próprio**; contagens ROTA 409 · ROTEADOR 75 · MIDDLEWARE 183 (14 chaves) · SEM-CAMINHO 0; 59 tipos · 5 lotes · 30 pares; 468 chaves; (2) reproduzir as formas das duas críticas (F1–F6, N1, N2, N9, N3a–d, N10, B3, F1′) e executar MG1–MG16; (3) CE-G1 (a)(b)(c) e o T6/T11 na letra |
| C3 · regressão, escopo e registro | corpo novo | `jurado-07ca-c3-regressao-escopo` | (1) régua das 44 + `npm test` + `-db` em cluster próprio; (2) fixtures só (i)/(ii), diff no permitido, proibido vazio; (3) registro — **sem** cobrar KPI |

**Inelegíveis por nome:** `planejador-b-o6r-07c`; o dev do 07c-a; `critico-b-o6r-07c-r1` e a identidade da rodada 2;
`jurado-b07a-autorizacao-e-alcada` (achou o `C1-A1`, `J-O6R-07a-ciclo1.md:13`); `jurado-b07a-c2-autorizacao-s` (achou o
`S-A1`, `J-O6R-07a-ciclo2.md:13,60`); a identidade `coordenador-de-acessos` (achou o `C2-09`,
`votos/SAN3-plano/C2-coordenador-de-acessos-voto.json:54`); a identidade `guardiao-fail-closed` (achou o `C2c2-03`,
`votos/SAN3-plano-ciclo2/C2-guardiao-fail-closed-voto.json:30`); `porteiro-pos-merge` (reconfirmou o `S-A1`; não vota).
**Tensão (§A2) para o orquestrador registrar:** o `PLANO_SAN3.md:254` pede *unanimidade + coordenador-de-acessos*, e
essa identidade é achadora do item 51; a competência entra pela C1, com identidade nova.

### 07c-a.8 Riscos, tamanho e o que fecha

- **R-a1** O guard pesa: 21 s de censo de camadas e 12 s de lotes (medido), mais uma rodada por forma no T12. Cabe na
  suíte, mas o dev mede e publica o tempo do arquivo. **R-a2** O instantâneo tem 468 chaves e muda a cada rota ou
  roteador novo do produto inteiro — é o preço do fail-closed: toda camada nova passa por alguém que a classifica, e
  a classe escrita é conferida pela propriedade (T6). Mitigação: o instantâneo é **gerado** (`classify-v3.cjs --gravar`)
  e o diff dele é revisado. **R-a3** Fixtures quebrando: regra (i)/(ii)/(iii) da v1, mantida.
- **R-a4, corrigido (B7):** o app **nunca produz** `work_order.mileage` — `WorkOrderSyncActionTypes`
  (`mobile/flutter_app/lib/core/network/api_contracts.dart:48-60`) não o tem, e `git log --all -S'"work_order.mileage"' --
  mobile` volta vazio (r2, E6). A via 10 só é alcançada por requisição forjada: fechá-la não tira nada do técnico,
  despachado ou não, e o caso "o app marca a ação `failed`" da v2 era hipotético. E o reenvio que cai em **outra
  instância** da API já não acha o recibo (o `Map` é por processo) — é o caso (ii) do 07c-a.2 sem reinício nenhum.
- **R-a5** A única perda real do 07c-a para o despachado sem atribuição é **comentar e anexar pelo console web** em
  OS que não é dele — conforme `RBAC_MATRIX.md:45` (`execute/update-assigned`); a D1 (b), se vier, reabre (r2, E6).
- **Rollback:** reverter o squash; sem migração e sem dado novo.
- **Tamanho: G** — o produto é pequeno (4 arquivos, P); o guard v3 (censo de camadas, análise do TypeScript, lotes por
  diferencial, instantâneo de 468 chaves, 13 testes e as formas das duas críticas) é o que pesa.
- **Fecha:** as 10 vias da `P-O6R-SUBRECURSO-OBJECT-SCOPE`, por escopo provado, e o item vinculante dela (*censar o
  sync antes de declarar o SEC-002 fechado*), cumprido pelo gerador v3. **Não fecha:** a pendência inteira (passa a
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

### 07c-b.2 D1 — quem é "o técnico da OS" para escrever **qualquer coisa** nela?

Hoje, medido (`probe-dispatch.mts` da crítica r1, reexecutado por mim e pela r2 em `c1cfdabe`): o despacho pelo mapa
**não** grava a atribuição na OS (OS depois do despacho: só `status: open`); o técnico despachado **responde e conclui**
a vistoria que o despacho criou para ele (200 e 200), muda o status do **próprio** despacho (200, `accepted`) e **não**
consegue mudar o status da OS (403, o 07a).

**O alcance da resposta (B5 da r2) — o dono decide para tudo isto de uma vez**, porque a resposta entra numa porta só
(`assertMutationObjectScope`, ver C.1): **editar os campos da OS** (`PATCH /work-orders/:id`), mudar o **status**,
**comentar** (criar, editar, apagar, marcar e desmarcar tag), **anexar** e apagar anexo, **geocodificar** origem e
destino, lançar **km**, e — no 07c-b — **responder, concluir e dar ciência na vistoria** e **mandar evidência** (foto,
assinatura, observação) da OS.

As opções, com o efeito de cada uma:

- **(a) Só quem foi atribuído na OS.** O técnico mandado pelo mapa, sem a atribuição, não faz nada disso na OS — nem a
  vistoria e as fotos que hoje faz. O despachante passa a ter de atribuir **e** despachar, sempre, senão o serviço trava
  no campo.
- **(b) Quem foi atribuído na OS, ou o alvo de um despacho ativo dela.** O fluxo do mapa continua; o técnico despachado
  passa a poder **editar a OS, comentar, anexar, geocodificar**, mudar o status, lançar km, fazer a vistoria e mandar
  evidência — inclusive pelo console web, que ele acessa hoje (menu de despacho, `appSidebarNav.ts:178-187`, r2 E6).
  Precisa definir "ativo" (proposta: despacho não cancelado, não concluído, não reatribuído).
- **(c) O despacho passa a gravar a atribuição da OS.** Um critério só (a atribuição); despachar = atribuir; reatribuir
  o despacho troca a atribuição. O efeito sobre o técnico é o de (b), mas pela atribuição. Muda o fluxo de despacho
  (`field-dispatch.service.ts`, criação e reatribuição), que é do `B-O6R-09`; sai deste bloco ou o amplia.
- **E a equipe (`teamId` da OS)?** A equipe existe no banco (`prisma/schema.prisma:2264` `Team`, `:2288` `TeamMember`).
  **Sim:** qualquer membro da equipe da OS faz tudo o que está acima (o ajudante do guincho de duas pessoas). **Não:** só
  o técnico atribuído ou despachado.

**Dependência do Traccar (registrar):** o `B-TRC-01` atribui a posição ao técnico pelo `accepted_at` do despacho,
gravado quando o status vai a `accepted` (`git show 9cb441bd:docs/revisoes/TRACCAR/PLANO_TRACCAR.md`, linhas 485, 593
e 605) — exatamente a via 32. Qualquer resposta à D1 tem de manter o técnico **alvo** aceitando o **próprio** despacho;
a regra "atribuição da OS" aplicada ao despacho quebraria a premissa do Traccar.

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

**O alcance da D2 (B6 da r2) — vale também para status e km.** O trabalho offline do técnico inclui, além da vistoria
e da evidência (07c-b), o **status** e a **km** pelo lote de OS. Os dois **já** são recusados hoje com `rejected` — o
status pelo 07a, a km pelo 07c-a — e caem no mesmo teto de 5 tentativas. Para cada opção:
- **(a), (b) ou (c):** status e km seguem a mesma regra que a vistoria e a evidência, sem mexer no lote de OS.
- **(d), recusar como conflito:** para que status e km também virem conflito (e ganhem a saída da tela de conflito), o
  07c-b precisa mexer em `src/modules/mobile/mobile-work-order-sync.ts` (`actionErrorResult`, `:302-314`, que hoje só
  leva 409 a conflito por `isConflictError`, `:482`). Sem isso, vistoria e evidência viram conflito e status e km
  continuam `rejected` e presos — metade das vias numa política, metade na outra. **Com (d), o arquivo entra no
  escopo do 07c-b.**

Fato que o dono deve saber junto: o app manda o status como `work_order.status_update`
(`mobile/flutter_app/lib/core/network/api_contracts.dart:52`) e o lote de OS só despacha `work_order.status_change`
(`mobile-work-order-sync.ts:260`); o contrato do app é do `B-O6R-11` (#388) e do `B-SAN3-16`, não do 07c.

**As travas de arquivo, resolvidas (B6):** `mobile-work-order-sync.ts` tem a trava `07c → SAN3-16`
(`PLANO_SAN3.md:357`). O 07c-a **não** toca o arquivo. Com D2 (a), (b) ou (c), o 07c-b também não toca: a trava é
satisfeita **pelo 07c-a**, e o `SAN3-16` pode seguir logo depois dele — inclusive para construir a saída do app que a
opção (a) exige antes de o 07c-b mergear; a cadeia não fecha em si mesma (`07c-a → SAN3-16 → 07c-b`). Com D2 (d), o
07c-b toca o arquivo e a trava passa a `07c-b → SAN3-16`. A outra trava, `work-order.service.ts`
(`SAN3-13 → 07c → SAN3-23`, `PLANO_SAN3.md:356`), vira `07c-a → SAN3-13 → … → SAN3-23` — o `SAN3-13` não começou.

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
  evidência; o **T11 com a lista vazia** é o critério de fechamento.

### 07c-b.6 Tamanho e o que fecha

- **Tamanho: G** com D1 (a) ou (b); **G+** com D1 (c) (entra o fluxo de despacho). Mais o bloco de app da D2, se (a).
- **Fecha:** o resíduo da `P-O6R-SUBRECURSO-OBJECT-SCOPE`, a `P-SAN3-CHECKLIST-RUN-SEM-ESCOPO-POR-OBJETO` e o
  **`Ω6R-SEC-002`**. Entrega o mecanismo de escopo por run que a `P-SAN3-04A-CHECKLIST-ESCOPO-ESTOQUE` espera (a
  definição do escopo do Estoque segue sendo de produto).

### 07c-b.7 Notas de desenho para o plano do 07c-b (B8 e B9 da r2)

- **B9 (i) — D1 (b) e o ciclo de importação.** Com (b), `assertMutationObjectScope` precisa saber se há despacho ativo
  da OS para o ator. Mas `field-dispatch.service.ts` já importa `work-orders` (`:4` os tipos, `:9` o serviço);
  importar `field-dispatch` de volta em `work-order.service.ts` cria ciclo. O predicado entra por **referência
  injetada** nas `references` do `WorkOrderService`, no mesmo idioma do `resolveActorOperatorProfileId`
  (`work-order.service.ts:175,2046-2057`), com import dinâmico na composição padrão — e o mesmo fail-closed: sem o
  resolvedor, o ator de campo é recusado. Aumenta o 07c-b em um resolvedor e seus testes.
- **B9 (ii) — D2 (b) e o histórico.** "Era o técnico no momento T" tem fonte no servidor: o evento
  `work_order_assigned` da linha do tempo da OS (`work-order.service.ts:1702`) e os eventos `field_dispatch_created` e
  `field_dispatch_reassigned` do despacho (`field-dispatch.types.ts:18-20`), todos com hora do servidor. O que **não**
  tem fonte confiável é o T: ele viria do relógio do aparelho (`local_created_at`). Com D2 (b), o 07c-b cresce em uma
  consulta de histórico e herda esse risco, declarado no 07c-b.3.
- **B8 — rota polimórfica.** O `POST /attachments` decide a entidade pelo `entity_type` de um registro
  (`attachment-entity-resolver.ts:80-135`); registrar ali um subrecurso da OS seria via nova com a mesma chave de rota.
  O guard do 07c-a já cobre (T13, que compara `entityTypes()` com a lista literal das 4 de hoje); o 07c-b herda.
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

## Resposta à crítica r2

Os 9 achados foram **aceitos**; nenhum recusado. As sondas da r2 foram usadas **verbatim** (extraídas do apêndice dela)
e reexecutadas por mim contra o guard v2 — que fica verde como ela mediu — e contra o guard v3, que fica vermelho.

| achado | gravidade | disposição | onde na v3 |
|---|---|---|---|
| B1 · o `walk` pula camada terminal (N1 middleware com caminho, N2 sub-app; 183 camadas sem contagem) | bloqueia | **aceito** — toda camada é contada (`ROTA`, `ROTEADOR`, `SUBAPP`, `MIDDLEWARE`, `SEM-CAMINHO`) com multiplicidade; nenhum middleware pode responder sucesso ao campo; as 183 de hoje entram como classe `MIDDLEWARE`, com a prova por execução de que só o 404 final encerra requisição | C.2 itens 1 e 2; 07c-a.3 T1, T3, T4, T5; MG2–MG4 |
| B2 · tipo novo em lote existente escapa (N3a ponto na constante, N3b concatenação, N3c sem ponto, N10 motivo com `role_required`) | bloqueia | **aceito** — tipos vêm dos pontos de decisão do despachante pelo campo `type`, com dobra de constante e sem filtro de forma; o que não se dobra deixa vermelho; "aceita" e "alcança" por igualdade de respostas, nunca por texto | C.2 itens 3 e 4; T8–T10; MG6–MG10 |
| B3 · o guard cobra presença, não classe; o laço G não diz o que faz com entrada sem roteiro | ajuste | **aceito** — classe conferida pela propriedade (regra por recurso **ou** comportamento); leitura da propriedade passa pela impressão digital da OS; o laço G nunca pula | C.2 item 5; T6, T7; 07c-a.4 (regra do laço); MG11, MG12 |
| B4 · sem mutação para S-XT, 1ª asserção do S-KM-RESTART, T2, T3; M8 não credita S-ROLES | ajuste | **aceito** — M10 (404 → 403), M11 (recibo depois do processamento), MG5 (rota removida → envelhecida), MG4 (caminho em array); M8 credita S-ROLES | 07c-a.4 |
| B5 · a porta única é `assertMutationObjectScope`; a D1 alcança também editar, comentar, anexar e geocodificar | ajuste | **aceito** — porta corrigida e alcance completo no texto ao dono | C.1; 07c-b.2; R.2 |
| B6 · a D2 não diz se vale para status e km; as travas `07c → SAN3-16` e `07c-a → SAN3-13` sem registro | ajuste | **aceito** — a D2 cobre status e km, com o efeito de (d) sobre `mobile-work-order-sync.ts`; as duas travas resolvidas e registradas | 07c-b.3; R.4 |
| B7 · o app nunca produz `work_order.mileage`; o risco da km estava superestimado | nota | **aceito** — R-a4 reescrito; o caso de várias instâncias da API registrado | 07c-a.8 |
| B8 · rota polimórfica `/attachments` | nota | **aceito** — T13 lê o registro real de entidades | C.2 (riscos); 07c-a.3 T13; 07c-b.7 |
| B9 · ciclo de importação na D1 (b) e histórico na D2 (b) | nota | **aceito** — referência injetada; histórico existe no servidor, o T não | 07c-b.7 |

**Sem achado na r2, mantido como estava (validado por ela):** o desenho de produção das 10 vias (07c-a.1, 07c-a.2), a
premissa corrigida do A4, o laço G-NEG/G-POS/G-WIDE com `managerA`, os semânticos S-* e a divisão em 07c-a/07c-b.
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
- D1-07c (pergunta ao dono, 2026-10-10): quem é o técnico da OS para escrever QUALQUER coisa nela — editar os campos da OS, mudar o status, comentar, anexar, geocodificar, lançar km, fazer a vistoria e mandar evidência? (A resposta entra numa porta só, assertMutationObjectScope, e vale para tudo isso de uma vez.)
  (a) só quem foi atribuído na OS — o técnico mandado pelo mapa sem atribuição não faz nada disso, nem a vistoria e as fotos que hoje faz;
  (b) atribuído OU alvo de despacho ativo da OS — o fluxo do mapa segue; o despachado passa a editar a OS, comentar, anexar, geocodificar, mudar status, lançar km, fazer a vistoria e mandar evidência, inclusive pelo console web;
  (c) o despacho passa a gravar a atribuição — um critério só; o efeito é o de (b); muda o fluxo de despacho.
  E: membros da equipe da OS (teamId) contam? Bloqueia o B-O6R-07c-b. Plano: docs/revisoes/SAN3/B-O6R-07c-plano.md (07c-b.2).
- D2-07c (pergunta ao dono, 2026-10-10): trabalho feito offline por quem ERA o técnico — vistoria, evidência, status e km —, sincronizado depois de a OS ir para outro:
  (a) recusar — o app tenta 5 vezes e o trabalho fica preso no aparelho, sem saída, até o app ganhar uma (B-SAN3-16);
  (b) aceitar se ele era o técnico na hora da coleta — pelo relógio do aparelho, que pode estar errado ou forjado;
  (c) aceitar de quem já foi técnico da OS alguma vez — escopo frouxo;
  (d) recusar como conflito — o app já mostra conflito com "manter a minha" e "usar a do servidor"; para valer também para status e km, o 07c-b passa a mexer no lote de OS.
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
  pelo gerador v3, que conta toda camada que pode responder e todo tipo que o despachante aceita). Resíduo: as 23 entradas `·07c-b` do instantâneo
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

- **Travas de arquivo do `PLANO_SAN3.md` §6, reordenação (B6) — registrar em `controle/decisoes.md` como decisão do
  orquestrador, no PR do 07c-a:** "Com a divisão do `B-O6R-07c` (2026-10-10): (1) a trava de
  `src/modules/work-orders/work-order.service.ts`, `SAN3-13 → 07c → SAN3-23` (`PLANO_SAN3.md:356`), passa a
  `07c-a → SAN3-13 → SAN3-23`; o 07c-b só toca esse arquivo se a D1-07c for (b) ou (c), e aí entra na fila depois do
  `SAN3-13`. (2) A trava de `src/modules/mobile/mobile-work-order-sync.ts`, `07c → SAN3-16` (`PLANO_SAN3.md:357`), é
  satisfeita pelo **07c-a** (que não toca o arquivo) quando a D2-07c for (a), (b) ou (c), e passa a `07c-b → SAN3-16`
  quando for (d), porque aí o 07c-b toca o arquivo. Com (a), a ordem é `07c-a → SAN3-16 → 07c-b`: o `SAN3-16` constrói a
  saída do app que o 07c-b exige antes de mergear."
## Apêndice A — os geradores v3, verbatim (P3: roteiro de reexecução)

Rodados com cwd = `C:/Users/AMP/w-07c` (código de `c1cfdabe`), depois de `npm ci` e `prisma generate`, sem
`DATABASE_URL`/`REDIS_URL`. Ordem: `node --import tsx census-v3.mts c3.json [injecao.mts]` → `node --import tsx
sync-v3.mts c3.json s3.json [injecao.mts]` → `node classify-v3.cjs c3.json s3.json [instantaneo.json] [--gravar arq]`
(sai com código 1 se houver violação). As injeções das críticas são as dos apêndices delas, sem edição (`inject.mts` da
r1; `inject-novas.mts`, `inject-tipo.mts`, `inject-motivo.mts` da r2; o `inject-n1n2.mts` é o `inject-novas.mts` sem a
linha do N9, como a r2 descreve). As deste plano estão abaixo. Os geradores v2 seguem no histórico (`f7334f34`).

### census-v3.mts

```ts
// Censo v3 do B-O6R-07c (resposta ao B1 e ao B3 da r2): TODA camada que pode responder a uma requisição é contada.
//  - Interceptação do registro (Router.prototype.use/route e express.application.use) anota caminho e sub-app.
//  - O walk conta TODA camada: ROTA (por método), ROTEADOR, SUBAPP (e desce nele) e MIDDLEWARE (terminal, com
//    contagem por chave). Camada que o walk não sabe compor (caminho não textual) é contada como SEM-CAMINHO.
//  - Cada camada é instrumentada: o cabeçalho x-censo-07c da resposta diz QUEM respondeu (ROTA ou MIDDLEWARE).
//  - Alcance sem ler texto de motivo: a resposta do papel com as permissões dele × a do MESMO papel sem permissão
//    nenhuma (x-permissions: nenhuma). Igual = o RBAC decide (não alcança). Diferente = alcança.
//  - Pertença à OS por comportamento: trocar um parâmetro do caminho por uma OS/vistoria/despacho reais muda a
//    resposta (toca-por-caminho); pôr work_order_id real no corpo muda a resposta (toca-por-corpo).
//  - Leitura que escreve: em toda leitura da propriedade, a impressão digital da OS (detalhe, comentários, anexos,
//    linha do tempo, vistorias, despachos) é tirada antes e depois da requisição do técnico NÃO atribuído.
// Uso (cwd = raiz do worktree): node --import tsx census-v3.mts <saida.json> [injecao.mts]
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
process.env.LOG_LEVEL = "silent"; process.env.CORE_SAAS_PERSISTENCE = "memory";
delete process.env.DATABASE_URL; delete process.env.REDIS_URL;
const req0 = createRequire(process.cwd() + "/package.json");
const express = req0("express");
const RouterPkg = createRequire(req0.resolve("express"))("router");
const parseMount = (args: any[]) => { let path: any = "/"; let off = 0; if (typeof args[0] !== "function") { let a = args[0]; while (Array.isArray(a) && a.length) a = a[0]; if (typeof a !== "function") { path = args[0]; off = 1; } } return { path, fns: args.slice(off).flat(Infinity) }; };
const origUse = RouterPkg.prototype.use; const origRoute = RouterPkg.prototype.route; const origAppUse = express.application.use;
RouterPkg.prototype.use = function (...args: any[]) { const before = this.stack.length; const { path } = parseMount(args); const out = origUse.apply(this, args); for (const l of this.stack.slice(before)) l.__mount = path; return out; };
RouterPkg.prototype.route = function (path: any) { const before = this.stack.length; const r = origRoute.call(this, path); for (const l of this.stack.slice(before)) l.__path = path; return r; };
express.application.use = function (...args: any[]) {
  const st = this.router.stack; const before = st.length; const { fns } = parseMount(args);
  const out = origAppUse.apply(this, args);
  st.slice(before).forEach((l: any, i: number) => { const f = fns[i]; if (f && f.handle && f.set) l.__subapp = f; });
  return out;
};
const origWriteHead = http.ServerResponse.prototype.writeHead;
http.ServerResponse.prototype.writeHead = function (...a: any[]) { try { if (!this.headersSent) this.setHeader("x-censo-07c", encodeURIComponent((this as any).req?.__resp ?? "")); } catch {} return origWriteHead.apply(this, a as any); };
const root = new URL(pathToFileURL(process.cwd()).href + "/src/");
const imp = (p: string) => import(new URL(p, root).href);
const { createApp } = await imp("app.ts");
const { CoreSaasRegistry } = await imp("modules/core-saas/services/core-saas.service.ts");
const { MemoryCoreSaasAdapter } = await imp("modules/core-saas/services/memory-core-saas.adapter.ts");
const { InMemoryCoreSaasStore } = await imp("modules/core-saas/store/core-saas.store.ts");
const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
const t = core.createTenant({ name: "Censo v3 07c", modules: ["work_orders", "field_operations", "tenant_checklist", "checklists"] });
const mgr = core.createUser({ tenantId: t.id, name: "M", email: "c3-m@example.com", roles: ["manager"] });
const tecA = core.createUser({ tenantId: t.id, name: "A", email: "c3-a@example.com", roles: ["field_technician"] });
const tecB = core.createUser({ tenantId: t.id, name: "B", email: "c3-b@example.com", roles: ["field_technician"] });
const app = createApp(new MemoryCoreSaasAdapter(core));
if (process.argv[3]) await (await import(pathToFileURL(process.argv[3]).href)).inject(app);
const server = app.listen(0, "127.0.0.1"); await new Promise((r) => server.once("listening", r));
const base = "http://127.0.0.1:" + (server.address() as any).port;
const H = (uid: string, role: string, semPerm = false) => ({ "content-type": "application/json", "x-tenant-id": t.id, "x-user-id": uid, "x-role": role, ...(semPerm ? { "x-permissions": "nenhuma" } : {}) });
async function chamar(method: string, path: string, h: any, body?: unknown) {
  const r = await fetch(base + path, { method, headers: h, body: method === "GET" || method === "HEAD" ? undefined : JSON.stringify(body ?? {}), signal: AbortSignal.timeout(4000) }).catch(() => null);
  if (!r) return { s: 0, k: "sem-resposta", resp: "", j: null as any };
  const resp = decodeURIComponent(r.headers.get("x-censo-07c") ?? "");
  const tx = await r.text().catch(() => ""); let j: any = null; try { j = JSON.parse(tx); } catch {}
  return { s: r.status, k: r.status + ":" + (j?.error?.code ?? "") + ":" + (j?.error?.reason ?? ""), resp, j };
}
// Semente: OS atribuída ao tecA (por user id, a forma do app), modelo publicado, despacho ao tecA (provisiona a vistoria).
const ADM = mgr.id;
const tpl = await chamar("POST", "/api/v1/tenant/checklists", H(ADM, "tenant_admin"), { name: "Coleta", type: "technical_evidence", schema: {}, components: [{ componentKey: "ok", type: "observation", label: "ok?", required: false, config: {}, validationRules: {}, visibilityRules: {} }] });
await chamar("POST", "/api/v1/tenant/checklists/" + tpl.j.data.id + "/publish", H(ADM, "tenant_admin"), {});
const wo = await chamar("POST", "/api/v1/work-orders", H(ADM, "tenant_admin"), { title: "OS censo", checklistId: tpl.j.data.id });
const osA = wo.j.data.id;
const disp = await chamar("POST", "/api/v1/operations/dispatches", H(ADM, "tenant_admin"), { workOrderId: osA, operatorUserId: tecA.id });
await chamar("POST", "/api/v1/work-orders/" + osA + "/assign", H(ADM, "tenant_admin"), { userId: tecA.id });
const runs = await chamar("GET", "/api/v1/mobile/checklist-runs?workOrderId=" + osA, H(ADM, "tenant_admin"));
const runA = runs.j?.data?.[0]?.id; const dispA = disp.j?.data?.id;
if (!osA || !runA || !dispA) { console.error("semente incompleta", { osA, runA, dispA }); process.exit(2); }
const ids = [osA, runA, dispA];
const join = (a: string, b: string) => (a.replace(/[/]+$/, "") + "/" + String(b).replace(/^[/]+/, "")).replace(/[/]+$/, "") || "/";
const contagem = new Map<string, number>(); const conta = (k: string) => contagem.set(k, (contagem.get(k) ?? 0) + 1);
type Rota = { method: string; path: string };
const rotas: Rota[] = []; const montagens: string[] = []; const semCaminho: string[] = [];
const mwComCaminho: Array<{ key: string; path: string }> = [];
const VERBOS = ["get", "post", "put", "patch", "delete"];
function envolver(l: any, chave: string) {
  const h = l.handle; if (typeof h !== "function" || h.__censo) return;
  const w = h.length === 4 ? function (this: any, e: any, q: any, s: any, n: any) { q.__resp = chave; return h.call(this, e, q, s, n); } : function (this: any, q: any, s: any, n: any) { q.__resp = chave; return h.call(this, q, s, n); };
  (w as any).__censo = true; l.handle = w;
}
(function walk(stack: any[], prefix: string) {
  for (const l of stack) {
    if (l.route) {
      const p = l.__path ?? l.route.path;
      if (typeof p !== "string") { semCaminho.push("ROTA " + prefix + " " + JSON.stringify(p)); conta("SEM-CAMINHO " + prefix); continue; }
      const full = join(prefix, p);
      const ms = new Set(Object.keys(l.route.methods).flatMap((m) => (m === "_all" ? VERBOS : [m])));
      for (const m of ms) { conta("ROTA " + m.toUpperCase() + " " + full); rotas.push({ method: m.toUpperCase(), path: full }); }
      envolver(l, "ROTA " + full);
      continue;
    }
    const mp = l.__mount;
    if (typeof mp !== "string") { semCaminho.push("CAMADA " + prefix + " " + String(mp)); conta("SEM-CAMINHO " + prefix); continue; }
    const pre = join(prefix, mp);
    if (l.__subapp) { conta("SUBAPP " + pre); montagens.push(pre); walk(l.__subapp.router.stack, pre); continue; }
    if (l.handle && l.handle.stack) { conta("ROTEADOR " + pre); montagens.push(pre); walk(l.handle.stack, pre); continue; }
    const chave = "MIDDLEWARE " + pre + " · " + ((l.handle && l.handle.name) || "(anônima)");
    conta(chave); envolver(l, chave);
    if (mp !== "/") mwComCaminho.push({ key: chave, path: pre });
  }
})((app as any).router.stack, "");
const PARAM = /:([A-Za-z0-9_]+)/g;
const nParams = (p: string) => (p.match(PARAM) ?? []).length;
const sub = (p: string, vals: string[]) => { let i = 0; return p.replace(PARAM, () => vals[i++]); };
const USR: Record<string, string> = { field_technician: tecB.id, technician: randomUUID() };
const mwRespostas = new Map<string, Set<string>>(); const mwSucesso: string[] = [];
const anotar = (o: any, papel: string, alvo: string) => {
  if (!o.resp.startsWith("MIDDLEWARE")) return;
  const s = mwRespostas.get(o.resp) ?? new Set<string>(); s.add(String(o.s)); mwRespostas.set(o.resp, s);
  if (o.s > 0 && o.s < 400) mwSucesso.push(papel + " " + alvo + " → " + o.s + " por " + o.resp);
};
const saida: any[] = [];
// Fase 1 — alcance diferencial, ids aleatórios (nada de semente toca o estado).
for (const r of rotas) {
  const rnd = Array.from({ length: nParams(r.path) }, () => randomUUID());
  const url = sub(r.path, rnd);
  const row: any = { method: r.method, path: r.path };
  for (const papel of ["field_technician", "technician"]) {
    const o = await chamar(r.method, url, H(USR[papel], papel)); const o0 = await chamar(r.method, url, H(USR[papel], papel, true));
    row[papel] = { k: o.k, resp: o.resp, alcanca: o.k !== o0.k }; anotar(o, papel, r.method + " " + r.path);
  }
  row.admin = (await chamar(r.method, url, H(ADM, "tenant_admin"))).k;
  row.rnd = rnd; saida.push(row);
}
// Fase 1b — middleware com caminho próprio e varredura de caminho inexistente em cada montagem.
for (const m of mwComCaminho) for (const v of VERBOS) for (const papel of ["field_technician", "technician"]) {
  const o = await chamar(v.toUpperCase(), sub(m.path, Array.from({ length: nParams(m.path) }, () => randomUUID())), H(USR[papel], papel)); anotar(o, papel, v.toUpperCase() + " " + m.path);
}
for (const pre of new Set(montagens)) for (const v of VERBOS) for (const papel of ["field_technician", "technician"]) {
  const p = join(pre, "__censo_07c__/x"); const o = await chamar(v.toUpperCase(), sub(p, Array.from({ length: nParams(p) }, () => randomUUID())), H(USR[papel], papel)); anotar(o, papel, v.toUpperCase() + " " + p);
}
// Fase 2 — leitura que escreve: impressão digital do estado da OS antes/depois de cada GET/HEAD do técnico NÃO atribuído.
async function digital() {
  const a = H(ADM, "tenant_admin"); const partes: string[] = [];
  for (const p of ["/api/v1/work-orders/" + osA, "/api/v1/work-orders/" + osA + "/comments", "/api/v1/work-orders/" + osA + "/attachments", "/api/v1/work-orders/" + osA + "/timeline", "/api/v1/mobile/checklist-runs?workOrderId=" + osA, "/api/v1/operations/dispatches"]) partes.push(JSON.stringify((await chamar("GET", p, a)).j));
  return partes.join("|");
}
const leituraEscreve: string[] = [];
for (const row of saida.filter((x) => x.method === "GET" || x.method === "HEAD")) {
  const n = nParams(row.path); const tentativas: string[][] = n === 0 ? [[]] : [];
  for (let i = 0; i < n; i++) for (const id of ids) tentativas.push(row.rnd.map((v: string, j: number) => (j === i ? id : v)));
  for (const vals of tentativas) { const d0 = await digital(); await chamar(row.method, sub(row.path, vals), H(tecB.id, "field_technician")); const d1 = await digital(); if (d0 !== d1) { leituraEscreve.push(row.method + " " + row.path + " " + JSON.stringify(vals)); row.leituraEscreve = true; } }
}
// Fase 3 — pertença à OS por comportamento (gestor, que alcança tudo): caminho e corpo. Pode mutar a semente: vem por último.
for (const row of saida) {
  const n = nParams(row.path);
  for (let i = 0; i < n && !row.tocaCaminho; i++) for (const id of ids) {
    const o = await chamar(row.method, sub(row.path, row.rnd.map((v: string, j: number) => (j === i ? id : v))), H(ADM, "tenant_admin"));
    if (o.k !== row.admin) { row.tocaCaminho = true; break; }
  }
  if (row.method !== "GET" && row.method !== "HEAD") {
    const url = sub(row.path, row.rnd);
    const o1 = await chamar(row.method, url, H(ADM, "tenant_admin"), { work_order_id: osA, workOrderId: osA });
    const o2 = await chamar(row.method, url, H(ADM, "tenant_admin"), { work_order_id: randomUUID(), workOrderId: randomUUID() });
    if (o1.k !== o2.k) row.tocaCorpo = true;
  }
}
server.close();
const res = { semente: { osA, runA, dispA }, contagem: Object.fromEntries([...contagem].sort()), semCaminho, mwSucesso, mwRespostas: Object.fromEntries([...mwRespostas].map(([k, v]) => [k, [...v].sort()])), leituraEscreve, rotas: saida };
fs.writeFileSync(process.argv[2], JSON.stringify(res, null, 1));
const tipo = (p: string) => [...contagem.keys()].filter((k) => k.startsWith(p)).reduce((a, k) => a + (contagem.get(k) ?? 0), 0);
console.log("camadas: ROTA " + tipo("ROTA ") + " · ROTEADOR " + tipo("ROTEADOR ") + " · SUBAPP " + tipo("SUBAPP ") + " · MIDDLEWARE " + tipo("MIDDLEWARE ") + " (" + [...contagem.keys()].filter((k) => k.startsWith("MIDDLEWARE ")).length + " chaves) · SEM-CAMINHO " + tipo("SEM-CAMINHO "));
console.log("alcançadas (diferencial): field_technician " + saida.filter((x) => x.field_technician.alcanca).length + " · technician " + saida.filter((x) => x.technician.alcanca).length + " · toca-por-caminho " + saida.filter((x) => x.tocaCaminho).length + " · toca-por-corpo " + saida.filter((x) => x.tocaCorpo).length);
console.log("middleware que respondeu sucesso ao campo: " + mwSucesso.length + " · leitura que escreve: " + leituraEscreve.length);
for (const x of mwSucesso.slice(0, 10)) console.log("MW-SUCESSO", x);
for (const x of leituraEscreve.slice(0, 10)) console.log("LEITURA-ESCREVE", x);
process.exit(0);
```

### sync-v3.mts

```ts
// Censo v3 dos lotes de sync (resposta ao B2 da r2). Nada de texto de motivo, nada de forma de literal:
//  - Tipos candidatos = o que o DESPACHANTE compara com o campo `type` (tipos-v3.mts, todo src/); o que não se resolve
//    e todo despacho por prefixo vão para a lista de falhas.
//  - Lote = rota POST cuja resposta a um envelope com tipo inexistente difere da resposta a `{}` (ou que ecoa a ação).
//  - Tipo ACEITO pelo lote = a resposta do gestor (que tem todas as permissões) a esse tipo difere da resposta a um tipo
//    inexistente. Tipo ALCANÇADO pelo papel de campo = aceito E a resposta do papel é IGUAL à do gestor (a permissão por
//    ação não o barrou). Comparação de respostas por igualdade — nenhuma leitura de substring.
//  - Curinga dinâmico: `<família>.<inexistente>` aceito por algum lote.
// Uso: node --import tsx sync-v3.mts <c3.json> <saida.json> [injecao.mts]
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { analisarTipos } from "./tipos-v3.mts";
process.env.LOG_LEVEL = "silent"; process.env.CORE_SAAS_PERSISTENCE = "memory";
delete process.env.DATABASE_URL; delete process.env.REDIS_URL;
const root = new URL(pathToFileURL(process.cwd()).href + "/src/");
const imp = (p: string) => import(new URL(p, root).href);
const { createApp } = await imp("app.ts");
const { CoreSaasRegistry } = await imp("modules/core-saas/services/core-saas.service.ts");
const { MemoryCoreSaasAdapter } = await imp("modules/core-saas/services/memory-core-saas.adapter.ts");
const { InMemoryCoreSaasStore } = await imp("modules/core-saas/store/core-saas.store.ts");
const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
const t = core.createTenant({ name: "Censo sync v3", modules: ["work_orders"] });
const app = createApp(new MemoryCoreSaasAdapter(core));
if (process.argv[4]) await (await import(pathToFileURL(process.argv[4]).href)).inject(app);
const arquivos = execFileSync("git", ["ls-files", "src"], { encoding: "utf8" }).split(String.fromCharCode(10)).filter((f) => /[.]ts$/.test(f) && !/test/.test(f)).map((f) => process.cwd() + "/" + f);
const an = analisarTipos(arquivos);
const server = app.listen(0, "127.0.0.1"); await new Promise((r) => server.once("listening", r));
const base = "http://127.0.0.1:" + (server.address() as any).port;
const ADM = randomUUID(); const USR: Record<string, string> = { field_technician: randomUUID(), technician: randomUUID() };
const PARAM = /:([A-Za-z0-9_]+)/g;
async function saida(path: string, uid: string, papel: string, corpo: any): Promise<string> {
  const r = await fetch(base + path.replace(PARAM, () => randomUUID()), { method: "POST", headers: { "content-type": "application/json", "x-tenant-id": t.id, "x-user-id": uid, "x-role": papel }, body: JSON.stringify(corpo), signal: AbortSignal.timeout(4000) }).catch(() => null);
  if (!r) return "sem-resposta";
  const j: any = await r.json().catch(() => ({}));
  const id = corpo && corpo.actions && corpo.actions[0] ? corpo.actions[0].client_action_id : "";
  const d = (j && j.data) || {};
  for (const k of Object.keys(d)) if (Array.isArray(d[k])) for (const a of d[k]) if (a && (a.client_action_id === id || a.client_evidence_id === id || a.clientActionId === id)) return r.status + "|" + k + "|" + ((a.error && a.error.code) || "") + "|" + ((a.error && a.error.reason) || "") + "|" + (a.status || "");
  return r.status + "|lote|" + ((j && j.error && j.error.code) || "") + "|" + ((j && j.error && j.error.reason) || "");
}
const env = (type: string) => { const id = randomUUID(); return { client_batch_id: randomUUID(), actions: [{ client_action_id: id, clientActionId: id, client_evidence_id: id, type, local_created_at: new Date().toISOString(), payload: { work_order_id: randomUUID(), run_id: randomUUID(), local_run_id: randomUUID(), component_id: randomUUID(), status: "accepted", mileage_start: 1, note: "x", observation: "x", message: "x", value: "x" } }] }; };
const INEX1 = "__tipo_inexistente_07c_a__"; const INEX2 = "__tipo_inexistente_07c_b__";
const c3 = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const posts: string[] = [...new Set<string>(c3.rotas.filter((x: any) => x.method === "POST").map((x: any) => x.path))];
const lotes: string[] = []; const instaveis: string[] = [];
for (const p of posts) { const a = await saida(p, ADM, "tenant_admin", env(INEX1)); const v = await saida(p, ADM, "tenant_admin", {}); if (a !== v || a.split("|")[1] !== "lote") { lotes.push(p); const b = await saida(p, ADM, "tenant_admin", env(INEX2)); if (a !== b) instaveis.push(p + " : " + a + " × " + b); } }
// O texto vazio é recusado pelo parser do envelope antes do despacho: não nomeia handler.
const candidatos = [...an.tipos.keys()].filter((x) => x.length > 0).sort();
const familias = [...new Set(candidatos.filter((x) => x.includes(".")).map((x) => x.split(".")[0]))];
const pares: any[] = []; const curingaDinamico: string[] = [];
for (const lote of lotes) {
  const ref = await saida(lote, ADM, "tenant_admin", env(INEX1));
  for (const tp of candidatos) {
    const a = await saida(lote, ADM, "tenant_admin", env(tp)); if (a === ref) continue;
    const row: any = { lote, type: tp, admin: a };
    for (const papel of ["field_technician", "technician"]) { const o = await saida(lote, USR[papel], papel, env(tp)); row[papel] = { k: o, alcanca: o === a }; }
    pares.push(row);
  }
  for (const f of familias) { const x = await saida(lote, ADM, "tenant_admin", env(f + "." + INEX1)); if (x !== ref) curingaDinamico.push(lote + " · " + f + "." + INEX1 + " → " + x); }
}
server.close();
const res = { candidatos: candidatos.length, lotes, instaveis, naoResolvidos: an.naoResolvidos, curingasEstaticos: an.curingas, curingaDinamico, pares };
fs.writeFileSync(process.argv[3], JSON.stringify(res, null, 1));
console.log("tipos candidatos (do despachante): " + candidatos.length + " | lotes: " + lotes.length + " | pares aceitos: " + pares.length + " (alcançados: field_technician " + pares.filter((x) => x.field_technician.alcanca).length + " · technician " + pares.filter((x) => x.technician.alcanca).length + ") | não resolvidos: " + an.naoResolvidos.length + " | curingas estáticos: " + an.curingas.length + " | curinga dinâmico: " + curingaDinamico.length + " | lotes instáveis: " + instaveis.length);
for (const l of lotes) console.log("lote:", l);
process.exit(0);
```

### tipos-v3.mts

```ts
// Extrator v3 de tipos de ação (resposta ao B2 da r2). Não procura LITERAIS com cara de tipo: procura os pontos em que
// o código DECIDE pelo campo `type` de uma ação (o discriminador do contrato do lote) e resolve o valor comparado.
//  Origem do "tipo" (contaminação): `X.type`, `X["type"]`, desestruturação `{ type }`; propaga por variável cujo
//  inicializador contém um tipo, e por parâmetro de função chamada com um tipo (ponto fixo, todo o programa).
//  Pontos de decisão: igualdade e desigualdade, `switch`/`case`, `C.includes(t)`/`C.has(t)`/`C.indexOf(t)`, `C[t]`,
//  e `t.startsWith/endsWith/includes(...)`/`re.test(t)` (despacho por prefixo: CURINGA estático).
//  Resolução (dobra de constante): literal, template com partes resolvíveis, concatenação, `as`/`satisfies`/
//  parênteses, `const` local ou importada (via checker), propriedade de objeto `const`, chaves de objeto e elementos
//  de array/Set/Map. O que não se resolve vai para `naoResolvidos` com arquivo:linha — e o guard falha nele.
// A fonte é lida por `fs.readFileSync(arquivo, "utf8")` (a mesma porta que as sondas da r2 emulam).
import fs from "node:fs";
import { createRequire } from "node:module";
const ts = createRequire(process.cwd() + "/package.json")("typescript");
export type ResultadoTipos = { tipos: Map<string, string[]>; naoResolvidos: string[]; curingas: string[] };
export function analisarTipos(arquivos: string[]): ResultadoTipos {
  const opts = { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.NodeNext, moduleResolution: ts.ModuleResolutionKind.NodeNext, noEmit: true, skipLibCheck: true, types: [] };
  const host = ts.createCompilerHost(opts, true);
  const origGet = host.getSourceFile.bind(host);
  host.getSourceFile = (f: string, lang: any, ...r: any[]) => (f.includes("node_modules") ? origGet(f, lang, ...r) : ts.createSourceFile(f, fs.readFileSync(f, "utf8"), lang, true));
  host.readFile = (f: string) => (fs.existsSync(f) ? fs.readFileSync(f, "utf8") : undefined);
  const prog = ts.createProgram(arquivos, opts, host);
  const chk = prog.getTypeChecker();
  const fontes = prog.getSourceFiles().filter((s: any) => !s.isDeclarationFile && !s.fileName.includes("node_modules"));
  const raiz = process.cwd().split(String.fromCharCode(92)).join("/") + "/";
  const sym = (n: any) => { let s = chk.getSymbolAtLocation(n); if (s && s.flags & ts.SymbolFlags.Alias) { try { s = chk.getAliasedSymbol(s); } catch {} } return s; };
  const onde = (n: any) => { const sf = n.getSourceFile(); const p = sf.getLineAndCharacterOfPosition(n.getStart()); return sf.fileName.replace(raiz, "") + ":" + (p.line + 1); };
  const embrulho = (e: any) => ts.isParenthesizedExpression(e) || ts.isAsExpression(e) || (ts.isSatisfiesExpression && ts.isSatisfiesExpression(e)) || (ts.isTypeAssertionExpression && ts.isTypeAssertionExpression(e)) || ts.isNonNullExpression(e);
  const desemb = (e: any): any => (e && embrulho(e) ? desemb(e.expression) : e);
  const contaminados = new Set<any>();
  const ehTipo = (e0: any): boolean => {
    const e = desemb(e0); if (!e) return false;
    if (ts.isPropertyAccessExpression(e) && e.name.text === "type") return true;
    if (ts.isElementAccessExpression(e) && ts.isStringLiteralLike(e.argumentExpression) && e.argumentExpression.text === "type") return true;
    if (ts.isIdentifier(e)) { const s = sym(e); return Boolean(s && contaminados.has(s)); }
    if (ts.isCallExpression(e)) return e.arguments.some((a: any) => ehTipo(a));
    return false;
  };
  const contem = (n: any): boolean => { if (ehTipo(n)) return true; let a = false; ts.forEachChild(n, (c: any) => { if (!a && contem(c)) a = true; }); return a; };
  const marcar = (s: any) => { if (s && !contaminados.has(s)) { contaminados.add(s); return true; } return false; };
  let mudou = true; let voltas = 0;
  while (mudou && voltas < 20) {
    mudou = false; voltas++;
    for (const sf of fontes) (function v(n: any) {
      if (ts.isVariableDeclaration(n) && n.initializer && ts.isIdentifier(n.name) && contem(n.initializer)) { if (marcar(sym(n.name))) mudou = true; }
      if (ts.isBindingElement(n)) {
        const pn = n.propertyName; const nomeado = pn && ts.isIdentifier(pn) && pn.text === "type"; const curto = !pn && ts.isIdentifier(n.name) && n.name.text === "type";
        if ((nomeado || curto) && ts.isIdentifier(n.name)) { if (marcar(sym(n.name))) mudou = true; }
      }
      if (ts.isCallExpression(n)) n.arguments.forEach((a: any, i: number) => {
        if (!ehTipo(a)) return;
        const s = sym(n.expression); const d = s ? (s.valueDeclaration ?? (s.declarations ? s.declarations[0] : undefined)) : undefined;
        const ps = d ? (d.parameters ?? (d.initializer ? d.initializer.parameters : undefined)) : undefined;
        const p = ps ? ps[i] : undefined;
        if (p && ts.isIdentifier(p.name)) { if (marcar(sym(p.name))) mudou = true; }
      });
      ts.forEachChild(n, v);
    })(sf);
  }
  const declDe = (e: any) => { const s = sym(ts.isPropertyAccessExpression(e) ? e.name : e) || sym(e); return s ? (s.valueDeclaration ?? (s.declarations ? s.declarations[0] : undefined)) : undefined; };
  const dobrar = (e0: any, prof = 0): string | undefined => {
    const e = desemb(e0); if (!e || prof > 12) return undefined;
    if (ts.isStringLiteralLike(e)) return e.text;
    if (ts.isTemplateExpression(e)) { let s = e.head.text; for (const sp of e.templateSpans) { const x = dobrar(sp.expression, prof + 1); if (x === undefined) return undefined; s += x + sp.literal.text; } return s; }
    if (ts.isBinaryExpression(e) && e.operatorToken.kind === ts.SyntaxKind.PlusToken) { const a = dobrar(e.left, prof + 1); const b = dobrar(e.right, prof + 1); return a === undefined || b === undefined ? undefined : a + b; }
    if (ts.isIdentifier(e) || ts.isPropertyAccessExpression(e)) {
      const d = declDe(e); if (!d) return undefined;
      if (ts.isVariableDeclaration(d) && d.initializer && (ts.getCombinedNodeFlags(d) & ts.NodeFlags.Const)) return dobrar(d.initializer, prof + 1);
      if ((ts.isPropertyAssignment(d) || ts.isEnumMember(d)) && d.initializer) return dobrar(d.initializer, prof + 1);
    }
    return undefined;
  };
  const membros = (c0: any, prof = 0): string[] | undefined => {
    const c = desemb(c0); if (!c || prof > 8) return undefined;
    if (ts.isArrayLiteralExpression(c)) {
      const r: string[] = [];
      for (const el of c.elements) {
        if (ts.isSpreadElement(el)) { const m = membros(el.expression, prof + 1); if (!m) return undefined; r.push(...m); continue; }
        const d0 = desemb(el); const x = ts.isArrayLiteralExpression(d0) ? dobrar(d0.elements[0], prof + 1) : dobrar(el, prof + 1);
        if (x === undefined) return undefined; r.push(x);
      }
      return r;
    }
    if (ts.isObjectLiteralExpression(c)) {
      const r: string[] = [];
      for (const p of c.properties) {
        if (ts.isSpreadAssignment(p)) { const m = membros(p.expression, prof + 1); if (!m) return undefined; r.push(...m); continue; }
        const nm = p.name; if (!nm) return undefined;
        if (ts.isIdentifier(nm) || ts.isStringLiteralLike(nm) || ts.isNumericLiteral(nm)) r.push(nm.text);
        else if (ts.isComputedPropertyName(nm)) { const x = dobrar(nm.expression, prof + 1); if (x === undefined) return undefined; r.push(x); }
        else return undefined;
      }
      return r;
    }
    if (ts.isNewExpression(c)) return c.arguments && c.arguments.length ? membros(c.arguments[0], prof + 1) : [];
    if (ts.isCallExpression(c) && ts.isPropertyAccessExpression(c.expression) && ["keys", "values", "entries", "from"].includes(c.expression.name.text)) return membros(c.arguments[0], prof + 1);
    if (ts.isIdentifier(c) || ts.isPropertyAccessExpression(c)) { const d = declDe(c); if (d && (ts.isVariableDeclaration(d) || ts.isPropertyAssignment(d)) && d.initializer) return membros(d.initializer, prof + 1); }
    return undefined;
  };
  const tipos = new Map<string, string[]>(); const naoResolvidos: string[] = []; const curingas: string[] = [];
  const add = (v: string, n: any) => { const l = tipos.get(v) ?? []; l.push(onde(n)); tipos.set(v, l); };
  const IGUAL = [ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken, ts.SyntaxKind.EqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsToken];
  // Comparação com número, booleano, null/undefined ou typeof não é despacho de tipo de ação (o contrato é texto).
  const vazio = (e: any) => { const d = desemb(e); return (ts.isIdentifier(d) && d.text === "undefined") || d.kind === ts.SyntaxKind.NullKeyword || ts.isNumericLiteral(d) || d.kind === ts.SyntaxKind.TrueKeyword || d.kind === ts.SyntaxKind.FalseKeyword || ts.isTypeOfExpression(d) || (ts.isPrefixUnaryExpression(d) && ts.isNumericLiteral(d.operand)); };
  for (const sf of fontes) (function v(n: any) {
    if (ts.isBinaryExpression(n) && IGUAL.includes(n.operatorToken.kind)) {
      const a = ehTipo(n.left); const b = ehTipo(n.right);
      if (a !== b) { const outro = a ? n.right : n.left; const x = dobrar(outro); if (x !== undefined) add(x, n); else if (!vazio(outro)) naoResolvidos.push(onde(n) + ": " + n.getText().slice(0, 90)); }
    }
    if (ts.isSwitchStatement(n) && ehTipo(n.expression)) for (const cl of n.caseBlock.clauses) if (ts.isCaseClause(cl)) { const x = dobrar(cl.expression); if (x !== undefined) add(x, cl); else naoResolvidos.push(onde(cl) + ": case " + cl.expression.getText().slice(0, 80)); }
    if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression)) {
      const m = n.expression.name.text; const alvo = n.expression.expression;
      if (["includes", "has", "indexOf"].includes(m) && n.arguments[0] && ehTipo(n.arguments[0]) && !ehTipo(alvo)) { const ms = membros(alvo); if (ms) ms.forEach((x) => add(x, n)); else naoResolvidos.push(onde(n) + ": " + n.getText().slice(0, 90)); }
      if (["startsWith", "endsWith", "includes", "match", "search"].includes(m) && ehTipo(alvo)) curingas.push(onde(n) + ": " + n.getText().slice(0, 90));
      if (m === "test" && n.arguments[0] && ehTipo(n.arguments[0])) curingas.push(onde(n) + ": " + n.getText().slice(0, 90));
    }
    if (ts.isElementAccessExpression(n) && ehTipo(n.argumentExpression) && !ts.isStringLiteralLike(n.argumentExpression)) { const ms = membros(n.expression); if (ms) ms.forEach((x) => add(x, n)); else naoResolvidos.push(onde(n) + ": " + n.getText().slice(0, 90)); }
    ts.forEachChild(n, v);
  })(sf);
  return { tipos, naoResolvidos, curingas };
}
```

### classify-v3.cjs

```js
// classify-v3.cjs <c3.json> <s3.json> [instantaneo.json] [--gravar <arquivo>]
// Sem instantâneo: classifica pelas REGRAS (é assim que o instantâneo nasce). Com instantâneo: o instantâneo decide a
// classe, e as REGRAS DE PROPRIEDADE conferem se a classe escrita é compatível (B3) — nunca só a presença.
const fs = require("fs");
const args = process.argv.slice(2);
const c3 = JSON.parse(fs.readFileSync(args[0], "utf8"));
const s3 = JSON.parse(fs.readFileSync(args[1], "utf8"));
const snapArg = args[2] && !args[2].startsWith("--") ? args[2] : null;
const gi = args.indexOf("--gravar"); const gravar = gi >= 0 ? args[gi + 1] : null;
const snap = snapArg ? JSON.parse(fs.readFileSync(snapArg, "utf8")) : null;
const NAO_RESOLVIDOS_ACEITOS = new Set([
  "src/config/business-time.ts: part.type === type",
  "src/modules/telemetry/telemetry.dto.ts: part.type === type",
  "src/modules/charging/charge.accrual.ts: p.type === type",
]);
const CURINGAS_ACEITOS = new Set([
  "src/modules/mobile/mobile-evidence-sync.ts: type.includes(QQ.work_order_QQ)",
  "src/modules/mobile/mobile-evidence-sync.ts: type.endsWith(QQ_photoQQ)",
  "src/modules/mobile/mobile-evidence-sync.ts: type.endsWith(QQ_signatureQQ)",
].map((x) => x.split("QQ").join(String.fromCharCode(34))));
const semLinha = (x) => x.replace(/:[0-9]+: /, ": ");
const SEG = /[/](work-orders|checklist-runs|dispatches)[/]:[A-Za-z0-9_]+/;
const IN_PROP = new Set(["OS·07a", "OS·07c-a", "VISTORIA·07c-b", "DESPACHO·07c-b", "EVIDENCIA-OS·07c-b", "OS·SEM-ALCANCE", "LOTE"]);
const G07A = new Set(["ROTA PATCH /api/v1/work-orders/:workOrderId", "ROTA PATCH /api/v1/work-orders/:workOrderId/status", "PAR /api/v1/mobile/sync/work-order-actions · work_order.status_change"]);
const R = new Set(["ROTA POST /api/v1/mobile/telemetry", "ROTA POST /api/v1/fuel-logs", "ROTA PATCH /api/v1/fuel-logs/:fuelLogId", "ROTA POST /api/v1/damages", "ROTA POST /api/v1/expense-reports", "ROTA PATCH /api/v1/expense-reports/:reportId", "ROTA POST /api/v1/expense-reports/:reportId/items"]);
const N = new Set(["ROTA POST /api/v1/auth/login", "ROTA POST /api/v1/auth/refresh", "ROTA POST /api/v1/auth/logout", "ROTA POST /api/v1/notifications/fleet-alerts/run", "ROTA POST /api/v1/notifications/:notificationId/read", "ROTA POST /api/v1/notifications/read-all", "ROTA POST /api/v1/notifications/:notificationId/archive", "ROTA POST /api/v1/mobile/field-locations", "ROTA POST /api/v1/damages/:damageId/attachments", "ROTA POST /api/v1/attachments", "ROTA DELETE /api/v1/attachments/:attachmentId", "ROTA POST /api/v1/expense-reports/:reportId/submit"]);
const lotes = new Set(s3.lotes);
const vivas = new Map();
for (const [k, n] of Object.entries(c3.contagem)) vivas.set(k, { k, n, tipo: k.split(" ")[0] });
for (const r of c3.rotas) {
  const k = "ROTA " + r.method + " " + r.path; const v = vivas.get(k);
  const semAlc = ["field_technician", "technician"].every((p) => !r[p].alcanca && /^(401|403):/.test(r[p].k));
  Object.assign(v, { r, leitura: r.method === "GET" || r.method === "HEAD", prop: SEG.test(r.path) || r.path.endsWith("/mobile/evidence-uploads") || Boolean(r.tocaCaminho), semAlcance: semAlc });
}
for (const p of s3.pares) {
  const k = "PAR " + p.lote + " · " + p.type;
  vivas.set(k, { k, n: 1, tipo: "PAR", p, prop: /^work_order[.]/.test(p.type) || /^checklist/.test(p.type) || /^evidence[.]work_order_/.test(p.type), semAlcance: !p.field_technician.alcanca && !p.technician.alcanca });
}
function porRegra(v) {
  if (v.tipo === "MIDDLEWARE" || v.tipo === "ROTEADOR" || v.tipo === "SUBAPP") return v.tipo;
  if (v.tipo === "SEM-CAMINHO") return "NAO-CLASSIFICADA";
  if (G07A.has(v.k)) return "OS·07a";
  if (v.tipo === "ROTA") {
    const p = v.r.path;
    if (v.leitura) return v.prop ? "LEITURA-OS" : "LEITURA";
    if (lotes.has(p)) return "LOTE";
    if (v.prop) {
      if (v.semAlcance) return "OS·SEM-ALCANCE";
      if (/[/]work-orders[/]:/.test(p)) return "OS·07c-a";
      if (/[/]checklist-runs[/]:/.test(p)) return "VISTORIA·07c-b";
      if (/[/]dispatches[/]:/.test(p)) return "DESPACHO·07c-b";
      if (p.endsWith("/mobile/evidence-uploads")) return "EVIDENCIA-OS·07c-b";
      return "NAO-CLASSIFICADA";
    }
    if (R.has(v.k)) return "R";
    if (N.has(v.k)) return "N";
    if (v.semAlcance) return "SEM-ALCANCE-CAMPO";
    return "NAO-CLASSIFICADA";
  }
  const t = v.p.type;
  if (v.prop) {
    if (v.semAlcance) return "OS·SEM-ALCANCE";
    if (/^work_order[.]/.test(t)) return "OS·07c-a";
    if (/^checklist/.test(t)) return "VISTORIA·07c-b";
    return "EVIDENCIA-OS·07c-b";
  }
  if (/^expense_/.test(t)) return "R";
  if (/^evidence[.]field_/.test(t)) return "N";
  if (v.semAlcance) return "SEM-ALCANCE-CAMPO";
  return "NAO-CLASSIFICADA";
}
const viol = [];
const add = (c, x) => viol.push(c + ": " + x);
for (const v of vivas.values()) {
  const e = snap ? snap[v.k] : { classe: porRegra(v), n: v.n };
  if (!e || e.classe === "NAO-CLASSIFICADA") { add("NAO-CLASSIFICADA" + (v.prop ? " (na propriedade)" : ""), v.k); continue; }
  if (e.n !== v.n) add("CONTAGEM", v.k + " instantâneo " + e.n + " × vivo " + v.n);
  const c = e.classe;
  if (v.tipo === "MIDDLEWARE" || v.tipo === "ROTEADOR" || v.tipo === "SUBAPP") { if (c !== v.tipo) add("CLASSE-INCOMPATIVEL", v.k + " = " + c); continue; }
  if (v.tipo === "SEM-CAMINHO") { add("SEM-CAMINHO", v.k); continue; }
  if (v.tipo === "ROTA" && v.leitura) { const esp = v.prop ? "LEITURA-OS" : "LEITURA"; if (c !== esp) add("CLASSE-INCOMPATIVEL", v.k + " = " + c + " (esperado " + esp + ")"); continue; }
  if (v.prop && !IN_PROP.has(c)) add("CLASSE-INCOMPATIVEL", v.k + " = " + c + " (na propriedade)");
  if (!v.prop && IN_PROP.has(c) && c !== "LOTE") add("CLASSE-INCOMPATIVEL", v.k + " = " + c + " (fora da propriedade)");
  if (c === "LOTE" && !(v.tipo === "ROTA" && lotes.has(v.r.path))) add("CLASSE-INCOMPATIVEL", v.k + " = LOTE sem comportamento de lote");
  if (v.tipo === "ROTA" && lotes.has(v.r.path) && c !== "LOTE") add("CLASSE-INCOMPATIVEL", v.k + " é lote e está como " + c);
  if (/SEM-ALCANCE/.test(c) && !v.semAlcance) add("CLASSE-INCOMPATIVEL", v.k + " = " + c + " mas o campo alcança");
}
const envelhecidas = snap ? Object.keys(snap).filter((k) => !vivas.has(k)) : [];
envelhecidas.forEach((k) => add("ENVELHECIDA", k));
(c3.semCaminho || []).forEach((x) => add("SEM-CAMINHO", x));
(c3.mwSucesso || []).forEach((x) => add("MIDDLEWARE-RESPONDE-SUCESSO", x));
(c3.leituraEscreve || []).forEach((x) => add("LEITURA-ESCREVE", x));
s3.naoResolvidos.filter((x) => !NAO_RESOLVIDOS_ACEITOS.has(semLinha(x))).forEach((x) => add("TIPO-NAO-RESOLVIDO", x));
s3.curingasEstaticos.filter((x) => !CURINGAS_ACEITOS.has(semLinha(x))).forEach((x) => add("CURINGA-ESTATICO", x));
s3.curingaDinamico.forEach((x) => add("CURINGA-DINAMICO", x));
s3.instaveis.forEach((x) => add("LOTE-INSTAVEL", x));
const cont = {};
for (const v of vivas.values()) { const c = snap ? (snap[v.k] ? snap[v.k].classe : "NAO-CLASSIFICADA") : porRegra(v); cont[c] = (cont[c] || 0) + v.n; }
console.log("CLASSES (com multiplicidade): " + Object.entries(cont).sort().map(([c, n]) => c + "=" + n).join(" · "));
const b07 = [...vivas.values()].filter((v) => /07c-b/.test(snap ? ((snap[v.k] || {}).classe || "") : porRegra(v))).length;
console.log("chaves vivas: " + vivas.size + " | entradas ·07c-b: " + b07 + " | VIOLAÇÕES: " + viol.length);
for (const x of viol) console.log("  " + x);
if (gravar) { const o = {}; for (const v of vivas.values()) o[v.k] = { classe: porRegra(v), n: v.n }; fs.writeFileSync(gravar, JSON.stringify(o, null, 1)); console.log("instantâneo gravado: " + Object.keys(o).length + " chaves"); }
process.exitCode = viol.length ? 1 : 0;
```

### prova-tipos-v3.mts

```ts
// Prova do B2 (estática): as formas de tipo da r2 (e as da v2) num handler. Cada caso vira um arquivo .ts temporário
// e passa pelo extrator v3. Esperado: ou o tipo é RESOLVIDO (entra no censo e o lote é sondado com ele), ou o ponto de
// decisão vai para naoResolvidos (o guard falha). Nunca "nem um nem outro", que é o silêncio da v2.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { analisarTipos } from "./tipos-v3.mts";
const NL = String.fromCharCode(10); const Q = String.fromCharCode(34); const B = String.fromCharCode(96);
const casos: Array<[string, string]> = [
  ["N3a template com o ponto DENTRO da constante", "const WO = " + Q + "work_order." + Q + ";" + NL + "export function f(action: any) { if (action.type === " + B + "${WO}odometro" + B + ") return 1; }"],
  ["N3b concatenação", "const WO = " + Q + "work_order" + Q + ";" + NL + "export function f(action: any) { if (action.type === WO + " + Q + ".reboque" + Q + ") return 1; }"],
  ["N3c tipo sem ponto", "export function f(action: any) { if (action.type === " + Q + "km_rapida" + Q + ") return 1; }"],
  ["N3d constante importada que não se resolve", "import { WO_MILEAGE_V2 } from " + Q + "./inexistente.js" + Q + ";" + NL + "export function f(action: any) { if (action.type === WO_MILEAGE_V2) return 1; }"],
  ["N10 tipo com literal (o problema era o motivo)", "export function f(action: any) { if (action.type === " + Q + "work_order.vistoria_set" + Q + ") return 1; }"],
  ["v2: aspas simples", "export function f(action: any) { if (action.type === 'checklist.x') return 1; }"],
  ["v2: maiúscula, hífen, dígito", "export function f(action: any) { switch (action.type) { case " + Q + "Checklist.PhotoAdd" + Q + ": case " + Q + "checklist-run.reopen" + Q + ": case " + Q + "checklist.photo_v2" + Q + ": return 1; } }"],
  ["despacho por tabela", "const T = { " + Q + "work_order.tabela" + Q + ": 1 } as const;" + NL + "export function f(action: any) { return T[action.type as keyof typeof T]; }"],
  ["despacho por desestruturação", "export function f({ type }: any) { if (type === " + Q + "work_order.desestruturado" + Q + ") return 1; }"],
  ["despacho por parâmetro repassado", "function g(tipo: string) { return tipo === " + Q + "work_order.repassado" + Q + "; }" + NL + "export function f(action: any) { return g(action.type); }"],
  ["despacho por prefixo", "export function f(action: any) { return action.type.startsWith(" + Q + "checklist." + Q + "); }"],
  ["despacho dinâmico (comparação com variável)", "export function f(action: any, esperado: string) { return action.type === esperado; }"],
];
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tipos-v3-"));
for (const [nome, fonte] of casos) {
  const f = path.join(dir, "caso.ts").split(String.fromCharCode(92)).join("/"); fs.writeFileSync(f, fonte);
  const r = analisarTipos([f]);
  console.log(nome.padEnd(48) + " | tipos: " + JSON.stringify([...r.tipos.keys()]) + " | naoResolvidos: " + r.naoResolvidos.length + " | curingas: " + r.curingas.length);
}
fs.rmSync(dir, { recursive: true, force: true });
```

### inject-get-escreve.mts

```ts
// Forma F1' (B3/B1): um GET que ESCREVE de verdade na OS — muda o título pelo serviço de OS, com contexto de gestão.
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
  const { createDefaultWorkOrderService } = await imp("modules/work-orders/work-order.service.ts");
  const r = Router();
  r.use(tenantContextMiddleware); r.use(createPersistentRbacContextMiddleware());
  r.get("/work-orders/:workOrderId/aceitar-por-link", requirePermission("work_orders:read"), async (q: any, s: any) => {
    const svc = await createDefaultWorkOrderService();
    await svc.update({ tenantId: q.tenantContext.tenantId, userId: q.tenantContext.userId, roles: ["manager"], permissions: [] } as never, q.params.workOrderId, { title: "escrito por GET" }).catch(() => undefined);
    s.status(200).json({ data: { ok: true } });
  });
  const st = app.router.stack; const before = st.length;
  app.use("/api/v1", attachAuthenticatedActor(), r);
  const added = st.splice(before, st.length - before);
  st.splice(before - 1, 0, ...added);
}
```

### mk-malclass.cjs

```js
const fs = require("fs");
const [base, out] = process.argv.slice(2);
const s = JSON.parse(fs.readFileSync(base, "utf8"));
s["ROTA GET /api/v1/work-orders/:workOrderId/aceitar-por-link"] = { classe: "LEITURA", n: 1 };
s["ROTA POST /api/v1/work-orders/:id/fechar"] = { classe: "N", n: 1 };
s["ROTA POST /api/v1/work-orders/:workOrderId/notas"] = { classe: "N", n: 1 };
fs.writeFileSync(out, JSON.stringify(s, null, 1)); console.log("ok");
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

## Apêndice B — o instantâneo de `c1cfdabe` (gerado por `classify-v3.cjs --gravar`)

468 chaves. Abaixo, todas as que **não** são `LEITURA`, `SEM-ALCANCE-CAMPO` ou `ROTEADOR` (essas três vêm resumidas
depois); o arquivo inteiro é regenerado pelo dev com o mesmo comando e revisado chave a chave pela C2.

| chave | classe | n |
|---|---|---|
| `ROTA PATCH /operations/dispatches/:dispatchId/status` | DESPACHO·07c-b | 1 |
| `PAR /mobile/sync/evidence-actions · evidence.work_order_observation` | EVIDENCIA-OS·07c-b | 1 |
| `PAR /mobile/sync/evidence-actions · evidence.work_order_photo` | EVIDENCIA-OS·07c-b | 1 |
| `PAR /mobile/sync/evidence-actions · evidence.work_order_signature` | EVIDENCIA-OS·07c-b | 1 |
| `ROTA POST /mobile/evidence-uploads` | EVIDENCIA-OS·07c-b | 1 |
| `ROTA GET /mobile/checklist-runs/:runId/attachments/:attachmentId/download` | LEITURA-OS | 1 |
| `ROTA GET /mobile/checklist-runs/:runId/comparison` | LEITURA-OS | 1 |
| `ROTA GET /operations/dispatches/:dispatchId` | LEITURA-OS | 1 |
| `ROTA GET /operations/dispatches/:dispatchId/timeline` | LEITURA-OS | 1 |
| `ROTA GET /work-orders/:workOrderId` | LEITURA-OS | 1 |
| `ROTA GET /work-orders/:workOrderId/attachments` | LEITURA-OS | 1 |
| `ROTA GET /work-orders/:workOrderId/attachments/:attachmentId/download` | LEITURA-OS | 1 |
| `ROTA GET /work-orders/:workOrderId/audit-logs` | LEITURA-OS | 1 |
| `ROTA GET /work-orders/:workOrderId/comments` | LEITURA-OS | 1 |
| `ROTA GET /work-orders/:workOrderId/financial-items` | LEITURA-OS | 1 |
| `ROTA GET /work-orders/:workOrderId/map-start-points` | LEITURA-OS | 1 |
| `ROTA GET /work-orders/:workOrderId/timeline` | LEITURA-OS | 1 |
| `ROTA POST /mobile/sync/checklist-actions` | LOTE | 1 |
| `ROTA POST /mobile/sync/evidence-actions` | LOTE | 1 |
| `ROTA POST /mobile/sync/expense-actions` | LOTE | 1 |
| `ROTA POST /mobile/sync/inventory-actions` | LOTE | 1 |
| `ROTA POST /mobile/sync/work-order-actions` | LOTE | 1 |
| `MIDDLEWARE / · corsMiddleware` | MIDDLEWARE | 1 |
| `MIDDLEWARE / · helmetMiddleware` | MIDDLEWARE | 1 |
| `MIDDLEWARE / · jsonParser` | MIDDLEWARE | 1 |
| `MIDDLEWARE / · result` | MIDDLEWARE | 1 |
| `MIDDLEWARE  · (anônima)` | MIDDLEWARE | 114 |
| `MIDDLEWARE  · tenantContextMiddleware` | MIDDLEWARE | 56 |
| `MIDDLEWARE /auth/identity-links · (anônima)` | MIDDLEWARE | 1 |
| `MIDDLEWARE /me · (anônima)` | MIDDLEWARE | 1 |
| `MIDDLEWARE /me · tenantContextMiddleware` | MIDDLEWARE | 1 |
| `MIDDLEWARE /navigation · (anônima)` | MIDDLEWARE | 2 |
| `MIDDLEWARE /navigation · tenantContextMiddleware` | MIDDLEWARE | 1 |
| `MIDDLEWARE /platform · (anônima)` | MIDDLEWARE | 1 |
| `MIDDLEWARE /sessions · (anônima)` | MIDDLEWARE | 1 |
| `MIDDLEWARE /sessions · tenantContextMiddleware` | MIDDLEWARE | 1 |
| `PAR /mobile/sync/evidence-actions · evidence.field_observation` | N | 1 |
| `PAR /mobile/sync/evidence-actions · evidence.field_photo` | N | 1 |
| `PAR /mobile/sync/evidence-actions · evidence.field_signature` | N | 1 |
| `ROTA DELETE /attachments/:attachmentId` | N | 1 |
| `ROTA POST /attachments` | N | 1 |
| `ROTA POST /auth/login` | N | 1 |
| `ROTA POST /auth/logout` | N | 1 |
| `ROTA POST /auth/refresh` | N | 1 |
| `ROTA POST /damages/:damageId/attachments` | N | 1 |
| `ROTA POST /expense-reports/:reportId/submit` | N | 1 |
| `ROTA POST /mobile/field-locations` | N | 1 |
| `ROTA POST /notifications/:notificationId/archive` | N | 1 |
| `ROTA POST /notifications/:notificationId/read` | N | 1 |
| `ROTA POST /notifications/fleet-alerts/run` | N | 1 |
| `ROTA POST /notifications/read-all` | N | 1 |
| `PAR /mobile/sync/work-order-actions · work_order.status_change` | OS·07a | 1 |
| `ROTA PATCH /work-orders/:workOrderId` | OS·07a | 1 |
| `ROTA PATCH /work-orders/:workOrderId/status` | OS·07a | 1 |
| `PAR /mobile/sync/work-order-actions · work_order.mileage` | OS·07c-a | 1 |
| `ROTA DELETE /work-orders/:workOrderId/attachments/:attachmentId` | OS·07c-a | 1 |
| `ROTA DELETE /work-orders/:workOrderId/comments/:commentId` | OS·07c-a | 1 |
| `ROTA DELETE /work-orders/:workOrderId/comments/:commentId/tags/:tagId` | OS·07c-a | 1 |
| `ROTA PATCH /work-orders/:workOrderId/comments/:commentId` | OS·07c-a | 1 |
| `ROTA POST /work-orders/:workOrderId/attachments` | OS·07c-a | 1 |
| `ROTA POST /work-orders/:workOrderId/comments` | OS·07c-a | 1 |
| `ROTA POST /work-orders/:workOrderId/comments/:commentId/tags/:tagId` | OS·07c-a | 1 |
| `ROTA POST /work-orders/:workOrderId/geocode` | OS·07c-a | 1 |
| `ROTA POST /work-orders/:workOrderId/geocode-destination` | OS·07c-a | 1 |
| `PAR /mobile/sync/checklist-actions · checklist_run.create` | OS·SEM-ALCANCE | 1 |
| `PAR /mobile/sync/checklist-actions · checklist.run_create` | OS·SEM-ALCANCE | 1 |
| `PAR /mobile/sync/work-order-actions · work_order.assign` | OS·SEM-ALCANCE | 1 |
| `PAR /mobile/sync/work-order-actions · work_order.create` | OS·SEM-ALCANCE | 1 |
| `ROTA DELETE /work-orders/:workOrderId/financial-items/:itemId` | OS·SEM-ALCANCE | 1 |
| `ROTA PATCH /operations/dispatches/:dispatchId/reassign` | OS·SEM-ALCANCE | 1 |
| `ROTA PATCH /work-orders/:workOrderId/checklists` | OS·SEM-ALCANCE | 1 |
| `ROTA PATCH /work-orders/:workOrderId/financial-items/:itemId` | OS·SEM-ALCANCE | 1 |
| `ROTA PATCH /work-orders/:workOrderId/mileage` | OS·SEM-ALCANCE | 1 |
| `ROTA POST /mobile/checklist-runs/:runId/reopen` | OS·SEM-ALCANCE | 1 |
| `ROTA POST /work-orders/:workOrderId/assign` | OS·SEM-ALCANCE | 1 |
| `ROTA POST /work-orders/:workOrderId/cancel` | OS·SEM-ALCANCE | 1 |
| `ROTA POST /work-orders/:workOrderId/duplicate` | OS·SEM-ALCANCE | 1 |
| `ROTA POST /work-orders/:workOrderId/financial-items` | OS·SEM-ALCANCE | 1 |
| `ROTA POST /work-orders/:workOrderId/invoice` | OS·SEM-ALCANCE | 1 |
| `PAR /mobile/sync/expense-actions · expense_item.create` | R | 1 |
| `PAR /mobile/sync/expense-actions · expense_report.create` | R | 1 |
| `PAR /mobile/sync/expense-actions · expense_report.submit` | R | 1 |
| `ROTA PATCH /expense-reports/:reportId` | R | 1 |
| `ROTA PATCH /fuel-logs/:fuelLogId` | R | 1 |
| `ROTA POST /damages` | R | 1 |
| `ROTA POST /expense-reports` | R | 1 |
| `ROTA POST /expense-reports/:reportId/items` | R | 1 |
| `ROTA POST /fuel-logs` | R | 1 |
| `ROTA POST /mobile/telemetry` | R | 1 |
| `PAR /mobile/sync/checklist-actions · checklist_acknowledgement.create` | VISTORIA·07c-b | 1 |
| `PAR /mobile/sync/checklist-actions · checklist_attachment.attach` | VISTORIA·07c-b | 1 |
| `PAR /mobile/sync/checklist-actions · checklist_divergence.create` | VISTORIA·07c-b | 1 |
| `PAR /mobile/sync/checklist-actions · checklist_marker.create` | VISTORIA·07c-b | 1 |
| `PAR /mobile/sync/checklist-actions · checklist_run.complete` | VISTORIA·07c-b | 1 |
| `PAR /mobile/sync/checklist-actions · checklist.acknowledgement_create` | VISTORIA·07c-b | 1 |
| `PAR /mobile/sync/checklist-actions · checklist.attachment_attach` | VISTORIA·07c-b | 1 |
| `PAR /mobile/sync/checklist-actions · checklist.complete` | VISTORIA·07c-b | 1 |
| `PAR /mobile/sync/checklist-actions · checklist.divergence_create` | VISTORIA·07c-b | 1 |
| `PAR /mobile/sync/checklist-actions · checklist.item_answer` | VISTORIA·07c-b | 1 |
| `PAR /mobile/sync/checklist-actions · checklist.item_note` | VISTORIA·07c-b | 1 |
| `PAR /mobile/sync/checklist-actions · checklist.marker_create` | VISTORIA·07c-b | 1 |
| `ROTA PATCH /mobile/checklist-runs/:runId` | VISTORIA·07c-b | 1 |
| `ROTA POST /mobile/checklist-runs/:runId/acknowledgement` | VISTORIA·07c-b | 1 |
| `ROTA POST /mobile/checklist-runs/:runId/attachments` | VISTORIA·07c-b | 1 |
| `ROTA POST /mobile/checklist-runs/:runId/complete` | VISTORIA·07c-b | 1 |
| `ROTA POST /mobile/checklist-runs/:runId/divergence` | VISTORIA·07c-b | 1 |
| `ROTA POST /mobile/checklist-runs/:runId/markers` | VISTORIA·07c-b | 1 |

**Resumidas:** `LEITURA` — 174 chaves, multiplicidade 174; `SEM-ALCANCE-CAMPO` — 172 chaves, multiplicidade 172; `ROTEADOR` — 15 chaves, multiplicidade 75.

**A lista literal do T11 (as 23 entradas `·07c-b`):** `ROTA PATCH /mobile/checklist-runs/:runId` · `ROTA PATCH /operations/dispatches/:dispatchId/status` · `ROTA POST /mobile/checklist-runs/:runId/acknowledgement` · `ROTA POST /mobile/checklist-runs/:runId/attachments` · `ROTA POST /mobile/checklist-runs/:runId/complete` · `ROTA POST /mobile/checklist-runs/:runId/divergence` · `ROTA POST /mobile/checklist-runs/:runId/markers` · `ROTA POST /mobile/evidence-uploads` · `PAR /mobile/sync/checklist-actions · checklist.acknowledgement_create` · `PAR /mobile/sync/checklist-actions · checklist.attachment_attach` · `PAR /mobile/sync/checklist-actions · checklist.complete` · `PAR /mobile/sync/checklist-actions · checklist.divergence_create` · `PAR /mobile/sync/checklist-actions · checklist.item_answer` · `PAR /mobile/sync/checklist-actions · checklist.item_note` · `PAR /mobile/sync/checklist-actions · checklist.marker_create` · `PAR /mobile/sync/checklist-actions · checklist_acknowledgement.create` · `PAR /mobile/sync/checklist-actions · checklist_attachment.attach` · `PAR /mobile/sync/checklist-actions · checklist_divergence.create` · `PAR /mobile/sync/checklist-actions · checklist_marker.create` · `PAR /mobile/sync/checklist-actions · checklist_run.complete` · `PAR /mobile/sync/evidence-actions · evidence.work_order_observation` · `PAR /mobile/sync/evidence-actions · evidence.work_order_photo` · `PAR /mobile/sync/evidence-actions · evidence.work_order_signature`
