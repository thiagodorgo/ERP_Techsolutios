# B-O6R-07c — Crítica adversarial r1 do plano

> **Papel:** `critico-adversarial` · **identidade:** `critico-b-o6r-07c-r1` (nova).
> **Modelo que rodou:** **Opus 5.5 — substituição DECLARADA** (§C7.6-bis): o bloco é de permissão, não de dinheiro;
> o Fable está reservado a bloco de dinheiro (decisão do dono de 08/10). O frontmatter segue `fable`.
> **Objeto:** `docs/revisoes/SAN3/B-O6R-07c-plano.md` de `planejador-b-o6r-07c`, no ramo
> `fix/o6r07c-subresource-scope`, head `00109988e3fc486cca824d13b48fd024fdc4090f` (medido).
> **Ref do código medido:** `origin/main` = `c1cfdabe12c74b58f8393dbee4f333224c56b303` (medido; o worktree tem o
> mesmo `src/` — o head só acrescenta o plano). Rodada **1 de no máximo 2**. Quem critica não conserta (§C7.4-bis).
> **Estado:** COMPLETO (gravado item a item; evidência E1–E9 abaixo, cada uma com comando e saída).

## Veredito

**VOLTA AO PLANO.** Três achados `bloqueia`, todos `dentro-do-plano`: A1, A2 e A3. Dois deles (A1 e A2) dependem de
**decisão do dono** antes de o planejador poder consertar (seção seguinte). A3 é técnico: é do planejador.

O que **sobrevive** e pode virar requisito explícito do plano v2:
- os números do censo **reproduzem** exatamente (61 · 36 · 33 · 16 · 17), e a tabela do §2.1 é idêntica à que gerei (E1);
- as 3 vias "já guardadas pelo 07a" estão guardadas **por execução**, e a via 10 (`work_order.mileage`) está aberta (E5);
- o desenho por agregado (uma porta `getForMutation`, um `assertRunMutationScope`) e a recusa **por ação dentro do
  lote 200** estão corretos: o 403 vira `rejected` nos 3 syncs (`isConflictError` só pega 409 — `mobile-checklist-sync.ts:1021-1027` e
  `mobile-work-order-sync.ts:482-489`), o upload preserva o blob e o 403 não derruba a sessão (E3);
- a ampliação (despacho e upload) **não é escopo novo**: o CE-2 (`PLANO_SAN3.md:325`) só fecha o `Ω6R-SEC-002`
  com escopo provado em **todas** as vias do censo, e as duas estão no censo. Sem a ampliação, o SEC-002 não fecha;
- a fronteira não colide com o #388 nem com o #389 em código de produção; colide só em arquivos de registro, que
  são append (E8).

## Achados

| id | gravidade | escopo (com evidência) | achado | motivo |
|---|---|---|---|---|
| **A1** | **bloqueia** | **dentro-do-plano.** A recusa na vistoria, na evidência e na km nasce no 07c. Hoje o técnico despachado responde e conclui a vistoria: 200/200 (E2). Só a recusa no **status** da OS é anterior (07a, #369) | O predicado da vistoria, da evidência e da km é "a OS está atribuída a mim", e isso **nega o técnico despachado** no fluxo principal de alocação. O mapa só chama `POST /operations/dispatches`, que não grava a atribuição (`OS depois do despacho: {"status":"open"}`), e o app lista **todas** as OS da organização (`work_order_list_screen.dart:141`, `repo.workOrders`). Para o mesmo técnico na mesma OS, o plano diz "sim" no status do despacho (alvo) e "não" na vistoria que **esse** despacho criou para ele. O R3 manda o caso para o `P-O6R-B11`, mas o PR dele (#388) só toca `mobile/**`, `Kpis/**` e corpos de agente, então não consegue mudar o backend. Nenhum teste do §4 cobre "o despachado sem atribuição responde a run do próprio despacho". A regra (i) do §4.6 ("fixture em que um técnico age em OS sem atribuição → corrige-se a fixture") disfarça exatamente esse fluxo de fixture preguiçosa | O plano bloqueia algo que um papel faz hoje, de forma legítima, sem decisão do dono. Isso é regra de negócio nova. `docs/03-atores-papeis.md:290` (AUTH-007) e `docs/04-regras-negocio.md:83` (RN-MOB-001) dizem "atribuídos **ou autorizados por escopo**", e o plano cita essas linhas sem a segunda metade |
| **A2** | **bloqueia** | **dentro-do-plano.** A premissa é do plano (§3.6, R5, S-REPLAY). O teto de 5 tentativas do app é pre-existente e fica fora do escopo do bloco: o `mobile/**` é PROIBIDO e o #388 não o muda (`git diff origin/main...a24f58b5 -- mobile/flutter_app/lib` → 0 linhas com `maxRetry`/`retryCount`) | "A recusa não perde a ação" é meia-verdade. A ação **não some** e **não vira conflito**: fica `failed`. Só que toda replay filtra `retryCount < 5` (`sync_replay_service.dart:150,666,1367`; `evidence_sync.dart:297`), e nada zera o contador de ação `failed` (só o resolvedor de **conflito**, `sync_conflict_resolver.dart:20-24`). Depois de 5 sincronizações, a ação fica **presa no aparelho, sem saída**. O R5 ("é reenviada a cada sync … sem perda, alta × baixo") é falso por medição. O S-REPLAY só prova o servidor: no app, a recuperação "redistribuída a OS, o mesmo `client_action_id` é aceito" não acontece se a redistribuição vier depois da 5ª sincronização | Somado ao A1, a vistoria e as fotos que o técnico despachado coleta offline (prova de custódia) **nunca chegam ao servidor**, e o usuário não tem como recuperar. Para o negócio, isso é perda de dado, a classe que o §C7.8(1) manda tratar com junta completa. O plano a classifica como "ruído" |
| **A3** | **bloqueia** | **dentro-do-plano.** O guard e o helper do censo são entregáveis do bloco. O CE-2 está em `PLANO_SAN3.md:325` e o CE-G1 em `:322` | O gerador reconhece **forma**, não enuncia a propriedade (E4). Com o próprio script do Apêndice A, 3 de 5 formas novas, todas alcançáveis pelo técnico (200), **escapam em silêncio**: F1, um `GET` que escreve (o census pula GET); F2, `router.all` (descartado por `m !== "_all"`); F5, um lote de sync num sub-router (o `classify` o descarta como `SYNC(lote)` e o `census-sync` não o enumera, porque só percorre `l.route` no nível 1). F3 (montagem com `:param`) e F4 (`:id`) aparecem como NAO-CLASSIFICADA, mas sem identidade de OS: pela regra "por nome de parâmetro" do §4.3, F4 **não** é da propriedade. A regex de tipo de ação não acha aspas simples, template, dígito, hífen, maiúscula nem despacho por prefixo, e o repo não tem linter de aspas (`"lint": "npm run check"`). MG1–MG6 só exercitam formas que o gerador já vê | O CE-2 exige que "um guard fique vermelho quando surge rota mutante alcançável pelo técnico sem teste de escopo". F2 e F5 são exatamente isso, e o guard fica verde. O §3.7 descarta o default-deny em runtime (`router.param`) apoiado nessa cobertura, então a afirmação "o default de qualquer via **nova** é negar" (§1) é falsa para formas medidas |
| A4 | ajuste | dentro-do-plano (E9) | A D-07c-IDEMP é justificada por "o app repetiria **para sempre**", o que é falso (`maxRetry = 5`). O `already_applied` durável só existe nos handlers de vistoria. A km (`work_order.mileage`, escopada pelo plano) deduplica num `Map` em memória (`mobile-work-order-sync.ts:65`) e perde o recibo no restart. `checklist.complete` e `divergence_create` respondem `already_applied` **por estado** (`mobile-checklist-sync.ts:621`, `:502-504`), inclusive para técnico nunca atribuído | A decisão que vai à junta descreve um mecanismo que o código não tem. A junta vota sobre premissa falsa |
| A5 | ajuste | dentro-do-plano (E7) | O G-WIDE usa `managerA` em toda via. Em 5 das 6 rotas de vistoria o manager é `403 permission_required` (sem `checklist_runs:update`/`:acknowledge` desde o B-SAN3-04a), então o G-WIDE passa sem provar nada e a **M9 não é detectada** na vistoria. O S-ORFA pede "`managerA` → não-403" ao **responder**, e o código correto dá 403 | O teste como especificado é vazio num ponto e impossível no outro. O dev teria de trocar o ator em silêncio |
| A6 | nota | dentro-do-plano | A M1 promete derrubar "G-NEG nas **13** de OS", mas as linhas 1, 2 e 13 são guardadas pelo 07a fora do `getForMutation` (§3.1: "`update` e `changeStatus` não mudam"), então são no máximo **10**. O R1 (mapeamento `related_entity_type` no Prisma) não tem mutação que o derrube; só o positivo da `-db` o cobre | A tabela de mutações promete mais cobertura do que o desenho entrega |
| A7 | ajuste | dentro-do-plano (E8) | "Mudar o status [do despacho] escreve na **linha do tempo da OS**" é falso. O evento vai para `fieldDispatchEvent`, que nada fora de `field-dispatch/` lê. A conclusão (despacho é subrecurso) sobrevive por outra evidência: o despacho aparece na aba Mobile da OS e na ação da lista | Premissa falsa citada como prova (§A6: separar fato de hipótese) |
| A8 | nota | pre-existente: `P-SAN3-04A-CHECKLIST-POR-ESCOPO-ESCRITORIO` (`pendencias.md:9724`, 2026-09-18, dono `B-SAN3-22`) | O §1 diz que `operator` e `manager` "passam sempre" e que "a matriz diz o mesmo", mas a `RBAC_MATRIX.md:44` lhes dá "…-**by-scope**" na vistoria | A tensão já tem dono. Falta só o plano citá-la em vez de afirmar concordância |
| A9 | nota | pre-existente: `f7219abf`, 2026-07-22, #270 (E6) | O `POST /damages` da classe R **debita o extrato de um colega**. O técnico escolhe o responsável e o valor (−900 medido). O plano manda registrar a classe R como MÉDIA com a causa "`work_order_id` do corpo não passa pelo escopo" | Fora da propriedade do 07c, mas o texto de pendência que o plano dita erra a classe (é dinheiro, não vínculo a OS) e a gravidade. Não há registro disso em `pendencias.md`/`achados.jsonl` |
| A10 | ajuste | dentro-do-plano (E8) | O §5.2 proíbe `C:/Users/AMP/w-389j`, que não existe; o worktree vivo é `C:/Users/AMP/w-389`. E o §5.2 diz que o #389 "só toca inventory", mas ele toca também `prisma/**`, `ci.yml` e um teste de catálogo | A proibição escrita não alcança o caminho real |
| A11 | nota | dentro-do-plano | Tamanho G e divisão (ver a seção seguinte) | — |
| A12 | nota | pre-existente: `.github/workflows/ci.yml:116-121` (o job `backend-postgres` existe porque as permissões no banco divergiram do catálogo 3 vezes) | O censo mede o alcance só em memória (catálogo em código). A `-db` do plano roda no job `backend`, não no subconjunto com permissões provisionadas, e o `.github/**` é PROIBIDO no bloco | O alcance real em produção (permissões do banco) não é medido pelo censo. É risco conhecido da casa, não defeito do plano |

### Tamanho G: dividir?

Sim, a divisão é defensável. O corte que não deixa a propriedade aberta pela metade é **por dependência de decisão**,
não por arquivo:
- **07c-a** cobre as 10 vias registradas do item 11 (vias 3–12 do §2.1: anexo, comentário, tag, geocode e km)
  pela porta `getForMutation`. Elas não dependem de A1/A2 (são web e online, exceto a km, que segue a mesma
  semântica que o 07a já aplica ao status) e carregam o guard;
- **07c-b** cobre a vistoria (item 51, REST + sync), a evidência e o despacho, **depois** das decisões D1/D2.
- No 07c-a, as vias do 07c-b entram no guard como "abertas, com dono 07c-b", e a rede reversa obriga a lista a
  esvaziar. O `Ω6R-SEC-002` só fecha no 07c-b (CE-2).
- A decisão de dividir é da junta e do orquestrador; registro o corte, não o imponho.

### Perguntas do mandato, respondidas

1. **Gerador.** Enuncia forma, não propriedade (A3).
   - Das 25 vias fora da propriedade, as 15 N estão fora pela razão certa: conferi o `/attachments` genérico e
     ele não aceita `work_order` como entidade (`attachment-entity-resolver.ts:83-128` registra só damage, fine,
     insurance_policy e maintenance_order).
   - Nas 10 R, a classe está certa quanto à OS, mas o `POST /damages` tem efeito de dinheiro (A9).
   - As 3 vias do 07a estão guardadas por execução (E5).
2. **Propriedade.**
   - O `field_technician` está conforme a `RBAC_MATRIX.md:44-45,66`.
   - O "atribuído" ignora o despacho e o "ou autorizados por escopo" de AUTH-007/RN-MOB-001 (A1).
   - O plano não menciona a OS com equipe (`teamId`, `work-order.types.ts:171,232`; AUTH-004, "por equipe").
3. **Sync do app.** A recusa é resposta, não erro de rede. No app ela vira `failed`, fica presa depois de 5
   tentativas, não some e não vira conflito (A2).
4. **Testes.**
   - Existe mutação para cada critério declarado.
   - Há lacunas: G-WIDE vazio e S-ORFA impossível (A5), M1 com cobertura inflada (A6).
   - Não há teste nem mutação do fluxo do A1.
   - A via nova só nasce negada nas formas que o gerador vê (A3).
5. **Ampliação.** É necessária pelo CE-2 e não é escopo novo. Não colide com o #388/#389 em código (E8).
   - Uma dependência não está registrada: o Traccar usa o `accepted_at` da via 32, e a D-07c-DESPACHO-ALVO
     preserva o aceite pelo próprio técnico.
6. **Tamanho.** É G. A divisão sugerida está acima.

## Decisões do dono

Separado dos achados: estas três decisões são **regra de negócio**. Nem o planejador, nem a junta, nem o crítico
podem tomá-las.

- **D1 (vem do A1). Quem é "atribuído" para escrever na vistoria, na evidência e na km de uma OS?**
  - **(a)** Só quem está em `assigned_operator_id` (o que o plano propõe). Consequência medida: o técnico
    despachado pelo mapa, sem atribuição na OS, **perde** o acesso que tem hoje à vistoria que o despacho criou
    para ele.
  - **(b)** A atribuição da OS **ou** o alvo de um despacho ativo da OS.
  - **(c)** O despacho passa a gravar a atribuição da OS. Isso muda o fluxo de despacho e sai do bloco.
  - Pergunta junto: membros da equipe da OS (`teamId`) contam? A equipe de guincho de duas pessoas é o caso.
- **D2 (vem do A2). Trabalho coletado offline por técnico atribuído no momento da coleta, sincronizado depois de
  uma redistribuição: o servidor recusa ou aceita?**
  - Hoje aceita (não há escopo). O plano passa a recusar.
  - Se recusar, o dono aceita que essa vistoria ou foto fique **presa no aparelho**? O app desiste depois de 5
    tentativas e não oferece saída; mudar isso é `mobile/**`, fora do bloco.
- **D3 (vem do A9; fora do 07c, para registro).** O técnico de campo pode, ao registrar um dano, lançar débito no
  extrato de um colega e escolher o valor? Hoje pode (medido: −900). Não há registro disso.

**Não são do dono** (junta ou orquestrador): a ampliação do §5.1 (o CE-2 já a exige), a D-07c-IDEMP (A4), a
D-07c-DESPACHO-ALVO, a tensão `coordenador-de-acessos` × inelegibilidade e a divisão em 07c-a/07c-b.

## Evidência (comando → saída resumida → veredito parcial)

### E1 — reexecução dos geradores do Apêndice A (P3)

- `git -C C:/Users/AMP/w-07c rev-parse HEAD` → `00109988…`; `origin/main` → `c1cfdabe…`; o diff do head sobre a main
  é só o plano (`git show --stat HEAD` → 1 arquivo, 907 linhas).
- Extraí `census.mts` (linhas 717–782), `census-sync.mts` (788–841) e `classify.cjs` (847–906) do próprio plano
  para o scratchpad; cwd = `C:/Users/AMP/w-07c`, Node v20.19.5, sem `DATABASE_URL`/`REDIS_URL`.
- `node --import tsx census.mts` → `rotas montadas: 409 | routers aninhados: 12 | mutantes: 223 | alcançam: 42` (ec=0).
- `node --import tsx census-sync.mts` → `endpoints: 5 | arquivos: 758 | literais: 335 | pares: 1675 | alcançados: 23` (ec=0).
- `node classify.cjs` → `OS=13 · VISTORIA=18 · DESPACHO=1 · EVIDENCIA-OS=4 · R=10 · N=15 · NAO-CLASSIFICADA=0 · total=61`;
  `NA PROPRIEDADE: 36 (07a: 3 · abertas: 33 · registradas: 16 · NOVAS: 17)`.
- `diff` da tabela que gerei × §2.1 do plano (linhas 170–230) → **idêntica**.
- **Veredito parcial:** os números do plano **reproduzem**. O ataque passa a ser sobre o que o gerador **não vê**.

### E2 — o fluxo real de despacho não atribui a OS; o técnico despachado responde a vistoria hoje

- Leitura: `git grep "operations/dispatches\|assign" origin/main -- frontend/src` → a alocação do mapa
  (`frontend/src/modules/operations/map/hooks/useAllocateDispatch.ts`, `OperationsMapPage.tsx:193`) chama **só**
  `POST /operations/dispatches` (`dispatches.service.ts:98`); `assignWorkOrder` (`work-orders.service.ts:143-146`) é
  ação **separada**. `field-dispatch.service.ts:219-226` (`create`) não exige nem grava atribuição da OS; o
  provisionamento da run grava `relatedEntityType: "work_order"` (`:896-900`).
- Execução (`probe-dispatch.mts` no scratchpad, `createApp` real em memória, cwd = worktree, head `00109988`):
  `tenant_admin` publica modelo → cria OS com `checklistId` → despacha ao `tecA` (`field_technician`):
  ```
  template 201 publish 200 OS 201 despacho 201 alvo do despacho = tecA: true
  OS depois do despacho: {"status":"open"}            ← nenhum campo de atribuição
  run provisionada pelo despacho: true relatedEntityType= work_order relatedEntityId==OS: true
  tecA (despachado, OS sem atribuição) responde a run (PATCH): 200
  tecA muda status da OS (guard do 07a): 403 not_assigned_to_actor
  tecA muda status do PRÓPRIO despacho: 200 accepted
  tecA conclui a run: 200
  ```
- **Veredito parcial:** hoje o técnico **despachado** responde e conclui a vistoria que o despacho criou **para
  ele**. Pelo predicado do §1 (run → OS → `assigned_operator_id`), depois do 07c ele leva **403** nas duas — e na
  evidência da OS pelo sync/upload. O plano escolhe o **alvo do despacho** para o status do despacho (§3.4) e a
  **atribuição da OS** para a run que o **mesmo** despacho provisionou: para o mesmo técnico, na mesma OS, o 07c diz
  "sim" num e "não" no outro. → achado **A1**.

### E3 — o que o app faz com a recusa (leitura em `origin/main`, `mobile/flutter_app/lib`)

- `git show origin/main:mobile/flutter_app/lib/core/sync/sync_replay_service.dart`:
  - `rejected` → `failed` (`:507`); `failed` → `retryCount + 1`, `lastSafeError: 'Servidor recusou a acao.'` (`:763-768`).
  - **Toda** replay filtra `.where((a) => a.retryCount < maxRetry)` com `maxRetry = 5` (`:136,150` expense;
    `:629,666` OS; `:1348,1367` vistoria); `evidence_sync.dart:279,297` idem.
- `sync_queue_repository.dart:36-46`: `pendingForTenant` inclui `failed` (a ação **não** é apagada).
- `git grep "retryCount: 0"` em `mobile/flutter_app/lib` → só `sync_conflict_resolver.dart:24` (e só para
  `status == conflict`, `:20`), telemetria e localização. **Nenhum** caminho zera `retryCount` de ação `failed`.
- Upload binário: HTTP 403 → `ApiUnauthorizedError` (`http_client.dart:79`) → `uploadErrorCode: 'UNAUTHORIZED'`,
  `uploadStatus: failed`, blob preservado (`evidence_upload.dart:226-232,251-253`); o interceptor só limpa sessão em
  **401** (`auth_interceptor.dart:39`) — o 403 não derruba a sessão.
- **Veredito parcial:** a ação recusada **não some** e **não vira conflito**: fica `failed`, é reenviada **no máximo
  5 vezes** e depois fica **presa no aparelho para sempre**, sem saída automática nem manual. O §3.6 ("a ação não é
  descartada") é verdadeiro; o R5 ("é reenviada a cada sync … sem perda, mas com ruído") é **falso** depois da 5ª
  passada; e o S-REPLAY só prova o lado do servidor — a recuperação "redistribuída a OS, o mesmo `client_action_id`
  é aceito" **não acontece no app** se a redistribuição vier depois de 5 sincronizações. → achado **A2**.

### E4 — formas novas de via × o gerador do plano (o próprio script, com injeção)

- Harness: `inject.mts` (scratchpad) monta, no app **real**, um router sob `/api/v1` (antes do 404) com 5 formas
  novas, todas atrás de `requirePermission("work_orders:status")` e respondendo 200; o `census.mts` e o
  `census-sync.mts` do plano rodam **sem alteração**, só com a linha de injeção depois do `createApp`. Para F5,
  emulei o literal `"/mobile"` que o dev escreveria em `src/**` (o census lê literais de montagem por `git grep`).
- Alcance real por HTTP (`probe-forms.mts`, `field_technician`, OS aleatória): F1 `GET …/aceitar-por-link` **200** ·
  F2 `POST`/`PUT …/via-all` (`router.all`) **200/200** · F3 `POST /work-orders/:workOrderId/notas` (sub-router
  montado com parâmetro) **200** · F4 `POST /work-orders/:id/fechar` **200** · F5 `POST /mobile/sync/novidade-actions`
  (sub-router `/mobile`) **200**.
- O que o gerador do plano devolveu (`census-forms2.log`, `census-sync-forms.log`, `classify-forms.log`):
  `rotas montadas: 413 | mutantes: 226 | alcançam: 45`; `endpoints de sync: 5` (inalterado);
  classify → `NAO-CLASSIFICADA=2 · total=63`, as duas sendo F3 (`POST /?NESTED?/`, sondada no caminho errado →
  404) e F4 (`POST /work-orders/:id/fechar`).
  | forma | resultado no gerador | efeito no guard do §4.3 |
  |---|---|---|
  | F1 GET que escreve | **ausente** (o census pula GET/HEAD: `row[role] = "-"`, Apêndice A `:767`) | **escapa em silêncio** |
  | F2 `router.all` | **ausente** (`if (m !== "_all")`, `:746`; nem conta como rota) | **escapa em silêncio** |
  | F3 montagem com `:param` | `?NESTED?`, NAO-CLASSIFICADA, sondada no URL errado | falha visível, mas sem identidade de OS (não entra no G-NEG) |
  | F4 `:id` em vez de `:workOrderId` | NAO-CLASSIFICADA | falha visível; pela regra "por forma" do §4.3 **não** é da propriedade |
  | F5 lote de sync em sub-router | o `census.mts` acha (200), o `classify` **descarta** como `SYNC(lote)` (`:887`), e o `census-sync` **não** a enumera (só percorre `l.route` no nível 1, `:809-810`) | **escapa em silêncio** |
- Tipos de ação de sync: a regex `"([a-z_]+[.][a-z_.]+)"` (`:815`) **não** acha `'checklist.x'` (aspas simples),
  `` `${D}.x` `` (template), `"checklist.photo_v2"` (dígito), `"checklist-run.reopen"` (hífen),
  `"Checklist.PhotoAdd"` (maiúscula) nem despacho por prefixo (`startsWith("checklist.")`) — medido com `node -e`.
  O repo **não** tem ESLint/Prettier (`package.json:33`: `"lint": "npm run check"` = `tsc`): nada obriga aspas duplas.
- **Veredito parcial:** o gerador reconhece **forma**, não enuncia a propriedade. 3 de 5 formas REST/lote escapam em
  silêncio; o "default = negar" do §4.3(b) só vale para o que o gerador **vê**. → achado **A3**.

### E5 — as 3 vias "já guardadas pelo 07a", por execução

- `probe-07a.mts` (app real em memória; OS atribuída a `A` por `userId`, forma do app):
  ```
  assign(userId=A) 200 {"assignedOperatorId":"<A>","assignedUserId":"<A>"}
  B (field_technician, NÃO atribuído) | PATCH /:id 403 not_assigned_to_actor | PATCH /status 403 not_assigned_to_actor | sync status_change 200 rejected not_assigned_to_actor | sync mileage 200 accepted
  T (technician, NÃO atribuído)       | PATCH /:id 403 not_assigned_to_actor | PATCH /status 403 not_assigned_to_actor | sync status_change 200 rejected not_assigned_to_actor | sync mileage 200 accepted
  mileageStart depois do sync do B/T: 111111
  A (atribuído) | PATCH /:id 200 | sync status_change 200 accepted
  ```
- **Veredito parcial:** as 3 estão guardadas **por execução** (negativo nos dois papéis de campo, positivo no
  atribuído). A via 10 (`work_order.mileage`) está **aberta** como o plano diz. Sem achado aqui.

### E6 — classe R: `POST /damages` não é só "vínculo por referência" — debita o extrato de um colega

- Leitura: `damage.service.ts:121-128,139-143,171-173` — no **create**, `responsible_operator_profile_id` +
  `responsible_amount` → `applyResponsibleStatementEffect` → débito no extrato do profissional (`:496-511`);
  `catalog.ts:942-943` (`field_technician`) e `:607-608` (`technician`) têm `damages:create`.
- Execução (`probe-damage.mts`): `field_technician` cria dano num veículo com `responsible_operator_profile_id` = perfil
  de um **colega** e `responsible_amount: 900` → `201`; extrato do colega: antes `currentBalance 0, count 0`,
  depois `currentBalance -900, totalDebits 900, count 1`.
- Origem: `f7219abf` (2026-07-22, #270, Ω4C PR-09) — **pre-existente**; `grep` em `pendencias.md` e
  `achados.jsonl` por `responsible_operator_profile`, `damages:create`, `POST /damages` → **0** registros.
- **Veredito parcial:** o plano mede o `POST /damages` (linha 40 do §2.1), classifica R e registra a pendência
  nova como MÉDIA com causa "o `work_order_id` do corpo não passa pelo escopo da OS". O efeito medido é **dinheiro**
  (débito no extrato alheio), não vínculo a OS. Fora da propriedade do 07c — mas a descrição da pendência que o
  plano manda registrar está errada de classe e de gravidade. → achado **A9** (nota).

### E7 — papéis `tenant_wide` nas vias de vistoria: o G-WIDE com `managerA` é vazio, e o S-ORFA não fecha

- Catálogo (`awk` do bloco `manager:` em `catalog.ts`): `checklist_runs:read`, `:complete`, `:reopen` — **sem**
  `:update` e **sem** `:acknowledge` (revogados pelo `B-SAN3-04a`, `pendencias.md:1803`). `operator`: `read`,
  `create`, `update`, `complete`.
- Execução (`probe-mgr.mts`, run provisionada pelo despacho, mesmas 6 rotas REST de vistoria):
  ```
  manager          PATCH=403:permission_required | markers=403:permission_required | divergence=403:permission_required | acknowledgement=403:permission_required | attachments=403:permission_required | complete=200
  field_dispatcher 403:permission_required nas 6
  ```
  (operator/tenant_admin saíram 409 `checklist_run_locked` porque o `complete` do manager trancou a run antes — efeito
  de ordem da sonda, não do papel.)
- **Veredito parcial:** no §4.1, o G-WIDE usa `managerA` em **toda** via; nas vistorias ele recebe
  `permission_required` em 5 de 6 rotas REST, então "não é `not_assigned_to_actor`" passa **sem provar nada**, e a
  M9 ("escopo aplicado também a `tenant_wide`") **não** é detectada ali. E o S-ORFA pede "`managerA` → não-403" ao
  **responder** a `runOrfa`: com o código certo ele recebe **403** `permission_required` — o teste como escrito sai
  vermelho no código correto, e o dev teria de trocar o ator em silêncio. → achado **A5**.
- Matriz × plano: `RBAC_MATRIX.md:44` dá ao `operator` "create/answer/complete-**by-scope**" e ao `manager`
  "read/complete-**by-scope**"; o plano (§1) diz que eles "passam sempre" e que "a matriz diz o mesmo" citando só a
  linha 45. A tensão **já está registrada** em `P-SAN3-04A-CHECKLIST-POR-ESCOPO-ESCRITORIO`
  (`pendencias.md:9724`, dono `B-SAN3-22`) — o plano não a cita. → achado **A8** (nota).

### E8 — fronteira, #388, #389 e o Traccar

- `gh pr diff 388 --name-only` (31 arquivos, head `a24f58b5`) e `gh pr diff 389 --name-only` (120, head `ae863e1a`),
  cruzados com os 10 arquivos de produção do §5.1: **zero** interseção em código. Interseção só em registro:
  `pendencias.md`, `pendencias-indice.md`, `log-execucao.md` (388 e 389) e `docs/revisoes/O6R/achados.jsonl` (389).
- O §5.2 afirma que o #389 "só toca `src/modules/inventory/**` e testes de estoque": medido, o #389 também toca
  `prisma/schema.prisma`, uma migração, `.github/workflows/ci.yml` (+4 suítes no `backend-postgres`) e
  `tests/db-catalog-write-guard.test.ts`. Sem efeito nos arquivos do 07c, mas a afirmação é falsa.
- O §5.2 proíbe `C:/Users/AMP/w-389j`; `git worktree list` → o worktree vivo é `C:/Users/AMP/w-389`
  (`ae863e1a`, `fix/inventory-consistency`). A proibição nomeia um caminho que não existe e deixa o real sem trava
  escrita. → achado **A10** (ajuste).
- O §2.2 justifica o despacho como subrecurso porque "escreve na **linha do tempo da OS** (`createEvent` com
  `workOrderId`)". Medido: `createEvent` grava `fieldDispatchEvent` (`field-dispatch-prisma.repository.ts:117-130`);
  `git grep "fieldDispatchEvent\|field_dispatch_events" -- src frontend/src` fora de `field-dispatch/` → **0**. A
  OS não lê esse evento. O despacho segue exibido **na OS** (aba Mobile, `MobileTab.tsx:5-7`; ação na lista,
  `work-orders-row.handlers.ts:1`), então a conclusão sobrevive por outra evidência — mas a premissa citada é falsa.
  → achado **A7** (ajuste).
- Traccar (`git show 9cb441bd:docs/revisoes/TRACCAR/PLANO_TRACCAR.md:485,593,605`): o B-TRC-01 atribui posição ao
  técnico pelo `accepted_at` do despacho, gravado quando o status vai a `accepted` — a via 32 que o 07c guarda.
  A `D-07c-DESPACHO-ALVO` (alvo do despacho) mantém o aceite do próprio técnico; a alternativa (atribuição da OS,
  a M4) quebraria a premissa do Traccar. Dependência não registrada no plano. → nota no **A1**.

### E9 — a premissa da D-07c-IDEMP

- `grep -n "new Map\|syncReceipts"` nos 3 syncs: os recibos são **`Map` em memória** de módulo
  (`mobile-work-order-sync.ts:65`, `mobile-checklist-sync.ts:159`, `mobile-evidence-sync.ts:85`). No checklist há
  idempotência **durável** pelos handlers (`mobile-checklist-sync.ts:234-240`, comentário "P0a"); no sync de OS
  **não** há: `work_order.mileage` (que o plano passa a escopar em `setMileage`) só deduplica pelo `Map`.
- Os handlers `checklist.complete` e `checklist.divergence_create` devolvem `already_applied` por **estado** da run
  (`mobile-checklist-sync.ts:621` e `:502-504`), não por `client_action_id`: com a ordem da D-07c-IDEMP, um
  técnico **nunca** atribuído recebe `already_applied` (não `rejected`) ao concluir uma run já concluída por outro.
- A justificativa escrita (§3.3: "recusar o que já está no banco faria o app repetir **para sempre**") é falsa
  pelo E3 (`maxRetry = 5`).
- **Veredito parcial:** sem escrita indevida (nenhum efeito novo), mas a decisão que o plano leva à junta descreve um
  mecanismo que o código não tem: vale para o checklist por `client_action_id`, não vale para a quilometragem
  depois de um restart, e por estado vale para qualquer técnico. → achado **A4** (ajuste).


## Apêndice — as sondas do crítico, verbatim (P3: roteiro de reexecução)

Rodadas com cwd = `C:/Users/AMP/w-07c` (head `00109988`), `node --import tsx <arquivo>`, sem `DATABASE_URL`/`REDIS_URL`.
Os geradores do plano (`census.mts`, `census-sync.mts`, `classify.cjs`) são os do Apêndice A do plano, sem
edição; as variantes `*-forms*.mts` são os mesmos arquivos com **uma** linha a mais logo depois do `createApp`:
`await (await import("<inject.mts>")).inject(app);` (e, no `census-forms2`, também `emulateMountLiteral("/mobile")`).

### inject.mts

```ts
// Injeta 5 FORMAS NOVAS de via mutante sobre a OS no app REAL, antes do 404 de /api/v1 (crítico 07c, r1).
// Cada handler "escreve" (responde 200) depois de passar o RBAC com work_orders:status — permissão que o técnico tem.
import { pathToFileURL } from "node:url";
export async function inject(app: any) {
  const root = new URL(pathToFileURL(process.cwd()).href + "/src/");
  const imp = (p: string) => import(new URL(p, root).href);
  const { createRequire } = await import("node:module"); const { Router } = createRequire(process.cwd() + "/package.json")("express");
  const { attachAuthenticatedActor } = await imp("modules/auth/index.ts");
  const { tenantContextMiddleware } = await imp("modules/core-saas/middleware/tenant-context.middleware.ts");
  const { createPersistentRbacContextMiddleware } = await imp("modules/core-saas/middleware/persistent-rbac-context.middleware.ts");
  const { requirePermission } = await imp("modules/core-saas/middleware/rbac.middleware.ts");
  const perm = requirePermission("work_orders:status");
  const ok = (_q: any, s: any) => s.status(200).json({ data: { escreveu: true } });
  const r = Router();
  r.use(tenantContextMiddleware); r.use(createPersistentRbacContextMiddleware());
  // F1 — GET que escreve (aceitar por link)
  r.get("/work-orders/:workOrderId/aceitar-por-link", perm, ok);
  // F2 — router.all
  r.all("/work-orders/:workOrderId/via-all", perm, ok);
  // F3 — sub-router montado com parâmetro no caminho de montagem
  const n = Router({ mergeParams: true }); n.post("/", perm, ok);
  r.use("/work-orders/:workOrderId/notas", n);
  // F4 — mesmo recurso, parâmetro com outro nome
  r.post("/work-orders/:id/fechar", perm, ok);
  // F5 — endpoint de lote de sync num sub-router "/mobile" (forma de montagem que o census-sync não percorre)
  const m = Router(); m.post("/sync/novidade-actions", perm, ok);
  r.use("/mobile", m);
  const st = app.router.stack; const before = st.length;
  app.use("/api/v1", attachAuthenticatedActor(), r);
  const added = st.splice(before, st.length - before);
  st.splice(before - 1, 0, ...added); // antes do 404 route_not_found
  console.log("[inject] camadas adicionadas antes do 404:", added.length);
}
// Emula o literal "/mobile" que um dev escreveria em src/** ao montar o sub-router F5 (o census lê os literais
// de montagem por `git grep` DEPOIS do createApp). Só acrescenta o literal à saída do git grep do census.
export async function emulateMountLiteral(lit: string) {
  const { createRequire, syncBuiltinESMExports } = await import("node:module");
  const cp = createRequire(process.cwd() + "/package.json")("child_process");
  const orig = cp.execFileSync;
  cp.execFileSync = (...a: any[]) => { const out = orig(...a); return (a[0] === "git" && a[1]?.[0] === "grep" && a[1]?.includes("-o")) ? out + `"${lit}"\n` : out; };
  syncBuiltinESMExports();
}
```

### probe-forms.mts

```ts
import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
process.env.LOG_LEVEL = "silent"; process.env.CORE_SAAS_PERSISTENCE = "memory";
const root = new URL(pathToFileURL(process.cwd()).href + "/src/");
const imp = (p: string) => import(new URL(p, root).href);
const { createApp } = await imp("app.ts");
const { CoreSaasRegistry } = await imp("modules/core-saas/services/core-saas.service.ts");
const { MemoryCoreSaasAdapter } = await imp("modules/core-saas/services/memory-core-saas.adapter.ts");
const { InMemoryCoreSaasStore } = await imp("modules/core-saas/store/core-saas.store.ts");
const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
const t = core.createTenant({ name: "f", modules: ["work_orders"] });
const app = createApp(new MemoryCoreSaasAdapter(core)); await (await import("<scratchpad>/inject.mts")).inject(app);
const server = app.listen(0, "127.0.0.1"); await new Promise((r) => server.once("listening", r));
const base = `http://127.0.0.1:${(server.address() as any).port}`;
const h = { "content-type": "application/json", "x-tenant-id": t.id, "x-user-id": randomUUID(), "x-role": "field_technician" };
const id = randomUUID();
for (const [m, p] of [["GET", `/api/v1/work-orders/${id}/aceitar-por-link`], ["POST", `/api/v1/work-orders/${id}/via-all`], ["PUT", `/api/v1/work-orders/${id}/via-all`], ["POST", `/api/v1/work-orders/${id}/notas`], ["POST", "/api/v1/mobile/sync/novidade-actions"]]) {
  const r = await fetch(base + p, { method: m, headers: h, body: m === "GET" ? undefined : "{}" });
  console.log(m, p.replace(id, ":workOrderId"), "→", r.status, (await r.text()).slice(0, 40));
}
server.close(); process.exit(0);
```

### probe-dispatch.mts

```ts
// Sonda do crítico: o fluxo real de despacho (mapa → POST /operations/dispatches) atribui a OS ao técnico?
// E o técnico despachado responde a vistoria que o despacho provisionou para ele?
import { pathToFileURL } from "node:url";
process.env.LOG_LEVEL = "silent"; process.env.CORE_SAAS_PERSISTENCE = "memory";
delete process.env.DATABASE_URL; delete process.env.REDIS_URL;
const root = new URL(pathToFileURL(process.cwd()).href + "/src/");
const imp = (p: string) => import(new URL(p, root).href);
const { createApp } = await imp("app.ts");
const { CoreSaasRegistry } = await imp("modules/core-saas/services/core-saas.service.ts");
const { MemoryCoreSaasAdapter } = await imp("modules/core-saas/services/memory-core-saas.adapter.ts");
const { InMemoryCoreSaasStore } = await imp("modules/core-saas/store/core-saas.store.ts");
const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
const t = core.createTenant({ name: "crt07c", modules: ["work_orders", "field_operations", "tenant_checklist", "checklists"] });
const mgr = core.createUser({ tenantId: t.id, name: "M", email: "crt-m@example.com", roles: ["manager"] });
const tecA = core.createUser({ tenantId: t.id, name: "A", email: "crt-a@example.com", roles: ["field_technician"] });
const app = createApp(new MemoryCoreSaasAdapter(core));
const server = app.listen(0, "127.0.0.1"); await new Promise((r) => server.once("listening", r));
const base = `http://127.0.0.1:${(server.address() as any).port}`;
const H = (u: any, role: string) => ({ "content-type": "application/json", "x-tenant-id": t.id, "x-user-id": u.id, "x-role": role });
async function req(path: string, method: string, h: any, body?: unknown) {
  const r = await fetch(base + path, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) });
  const tx = await r.text(); let j: any = null; try { j = JSON.parse(tx); } catch {}
  return { s: r.status, j };
}
const adm = { id: mgr.id };
const tpl = await req("/api/v1/tenant/checklists", "POST", H(adm, "tenant_admin"), { name: "Coleta", type: "technical_evidence", schema: {}, components: [{ componentKey: "ok", type: "observation", label: "ok?", required: false, config: {}, validationRules: {}, visibilityRules: {} }] });
const pub = await req(`/api/v1/tenant/checklists/${tpl.j.data.id}/publish`, "POST", H(adm, "tenant_admin"), {});
const wo = await req("/api/v1/work-orders", "POST", H(adm, "tenant_admin"), { title: "OS", checklistId: tpl.j.data.id });
const disp = await req("/api/v1/operations/dispatches", "POST", H(adm, "tenant_admin"), { workOrderId: wo.j.data.id, operatorUserId: tecA.id });
const woAfter = await req(`/api/v1/work-orders/${wo.j.data.id}`, "GET", H(adm, "tenant_admin"));
const runs = await req(`/api/v1/mobile/checklist-runs?workOrderId=${wo.j.data.id}`, "GET", H(adm, "tenant_admin"));
const run = runs.j?.data?.[0];
console.log("template", tpl.s, "publish", pub.s, "OS", wo.s, "despacho", disp.s, "alvo do despacho = tecA:", disp.j?.data?.operatorUserId === tecA.id);
console.log("OS depois do despacho:", JSON.stringify(Object.fromEntries(Object.entries(woAfter.j?.data ?? {}).filter(([k]) => /assign|status|operator/i.test(k)))));
console.log("run provisionada pelo despacho:", !!run, "relatedEntityType=", run?.relatedEntityType, "relatedEntityId==OS:", run?.relatedEntityId === wo.j.data.id);
const ans = await req(`/api/v1/mobile/checklist-runs/${run.id}`, "PATCH", H(tecA, "field_technician"), { answers: [] });
console.log("tecA (despachado, OS sem atribuição) responde a run (PATCH):", ans.s, ans.j?.error?.reason ?? "");
const st = await req(`/api/v1/work-orders/${wo.j.data.id}/status`, "PATCH", H(tecA, "field_technician"), { status: "accepted" });
console.log("tecA muda status da OS (guard do 07a):", st.s, st.j?.error?.reason ?? "");
const ds = await req(`/api/v1/operations/dispatches/${disp.j.data.id}/status`, "PATCH", H(tecA, "field_technician"), { status: "accepted" });
console.log("tecA muda status do PRÓPRIO despacho:", ds.s, ds.j?.error?.reason ?? "", ds.j?.data?.status ?? "");
const comp = await req(`/api/v1/mobile/checklist-runs/${run.id}/complete`, "POST", H(tecA, "field_technician"), {});
console.log("tecA conclui a run:", comp.s, comp.j?.error?.reason ?? "");
server.close(); process.exit(0);
```

### probe-07a.mts

```ts
// As 3 vias "já guardadas pelo 07a" — por execução: técnico NÃO atribuído × atribuído × gestor.
import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
process.env.LOG_LEVEL = "silent"; process.env.CORE_SAAS_PERSISTENCE = "memory";
delete process.env.DATABASE_URL; delete process.env.REDIS_URL;
const root = new URL(pathToFileURL(process.cwd()).href + "/src/");
const imp = (p: string) => import(new URL(p, root).href);
const { createApp } = await imp("app.ts");
const { CoreSaasRegistry } = await imp("modules/core-saas/services/core-saas.service.ts");
const { MemoryCoreSaasAdapter } = await imp("modules/core-saas/services/memory-core-saas.adapter.ts");
const { InMemoryCoreSaasStore } = await imp("modules/core-saas/store/core-saas.store.ts");
const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
const t = core.createTenant({ name: "g07a", modules: ["work_orders", "field_operations"] });
const mgr = { id: randomUUID() };
const A = { id: randomUUID() };
const B = { id: randomUUID() };
const T = { id: randomUUID() };
const app = createApp(new MemoryCoreSaasAdapter(core));
const server = app.listen(0, "127.0.0.1"); await new Promise((r) => server.once("listening", r));
const base = `http://127.0.0.1:${(server.address() as any).port}`;
const H = (u: any, role: string) => ({ "content-type": "application/json", "x-tenant-id": t.id, "x-user-id": u.id, "x-role": role });
async function req(path: string, method: string, h: any, body?: unknown) {
  const r = await fetch(base + path, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) });
  const tx = await r.text(); let j: any = null; try { j = JSON.parse(tx); } catch {}
  return { s: r.status, j };
}
const wo = await req("/api/v1/work-orders", "POST", H(mgr, "manager"), { title: "OS g" });
const asg = await req(`/api/v1/work-orders/${wo.j.data.id}/assign`, "POST", H(mgr, "manager"), { userId: A.id });
console.log("A.id=", A.id, "OS", wo.s, "assign(userId=A)", asg.s, asg.j?.error?.message ?? "", JSON.stringify(Object.fromEntries(Object.entries(asg.j?.data ?? {}).filter(([k]) => /assign/i.test(k)))));
const id = wo.j.data.id;
const sync = (u: any, role: string, status: string) => req("/api/v1/mobile/sync/work-order-actions", "POST", H(u, role), { client_batch_id: randomUUID(), actions: [{ client_action_id: randomUUID(), type: "work_order.status_change", payload: { work_order_id: id, status } }] });
const km = (u: any, role: string) => req("/api/v1/mobile/sync/work-order-actions", "POST", H(u, role), { client_batch_id: randomUUID(), actions: [{ client_action_id: randomUUID(), type: "work_order.mileage", payload: { work_order_id: id, mileage_start: 111111 } }] });
const one = (r: any) => { const d = r.j?.data ?? r.j ?? {}; const a = [...(d.accepted ?? []), ...(d.rejected ?? []), ...(d.conflicts ?? [])][0]; return `${r.s} ${a?.status ?? ""} ${a?.error?.reason ?? ""}`; };
for (const [nome, u, role] of [["B (field_technician, NÃO atribuído)", B, "field_technician"], ["T (technician, NÃO atribuído)", T, "technician"]] as const) {
  const p1 = await req(`/api/v1/work-orders/${id}`, "PATCH", H(u, role), { title: "x" });
  const p2 = await req(`/api/v1/work-orders/${id}/status`, "PATCH", H(u, role), { status: "accepted" });
  const p3 = await sync(u, role, "accepted");
  const p4 = await km(u, role);
  console.log(nome, "| PATCH /:id", p1.s, p1.j?.error?.reason ?? "", "| PATCH /status", p2.s, p2.j?.error?.reason ?? "", "| sync status_change", one(p3), "| sync mileage", one(p4));
}
const g = await req(`/api/v1/work-orders/${id}`, "GET", H(mgr, "manager"));
console.log("mileageStart depois do sync do B/T:", g.j?.data?.mileageStart ?? g.j?.data?.mileage_start ?? JSON.stringify(Object.fromEntries(Object.entries(g.j?.data ?? {}).filter(([k]) => /mile/i.test(k)))));
const a1 = await req(`/api/v1/work-orders/${id}`, "PATCH", H(A, "field_technician"), { title: "y" });
const a3 = await sync(A, "field_technician", "accepted");
console.log("A (atribuído) | PATCH /:id", a1.s, a1.j?.error?.reason ?? "", "| sync status_change", one(a3));
server.close(); process.exit(0);
```

### probe-mgr.mts

```ts
// Sonda do crítico: o fluxo real de despacho (mapa → POST /operations/dispatches) atribui a OS ao técnico?
// E o técnico despachado responde a vistoria que o despacho provisionou para ele?
import { pathToFileURL } from "node:url";
process.env.LOG_LEVEL = "silent"; process.env.CORE_SAAS_PERSISTENCE = "memory";
delete process.env.DATABASE_URL; delete process.env.REDIS_URL;
const root = new URL(pathToFileURL(process.cwd()).href + "/src/");
const imp = (p: string) => import(new URL(p, root).href);
const { createApp } = await imp("app.ts");
const { CoreSaasRegistry } = await imp("modules/core-saas/services/core-saas.service.ts");
const { MemoryCoreSaasAdapter } = await imp("modules/core-saas/services/memory-core-saas.adapter.ts");
const { InMemoryCoreSaasStore } = await imp("modules/core-saas/store/core-saas.store.ts");
const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
const t = core.createTenant({ name: "crt07c", modules: ["work_orders", "field_operations", "tenant_checklist", "checklists"] });
const mgr = core.createUser({ tenantId: t.id, name: "M", email: "crt-m@example.com", roles: ["manager"] });
const tecA = core.createUser({ tenantId: t.id, name: "A", email: "crt-a@example.com", roles: ["field_technician"] });
const app = createApp(new MemoryCoreSaasAdapter(core));
const server = app.listen(0, "127.0.0.1"); await new Promise((r) => server.once("listening", r));
const base = `http://127.0.0.1:${(server.address() as any).port}`;
const H = (u: any, role: string) => ({ "content-type": "application/json", "x-tenant-id": t.id, "x-user-id": u.id, "x-role": role });
async function req(path: string, method: string, h: any, body?: unknown) {
  const r = await fetch(base + path, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) });
  const tx = await r.text(); let j: any = null; try { j = JSON.parse(tx); } catch {}
  return { s: r.status, j };
}
const adm = { id: mgr.id };
const tpl = await req("/api/v1/tenant/checklists", "POST", H(adm, "tenant_admin"), { name: "Coleta", type: "technical_evidence", schema: {}, components: [{ componentKey: "ok", type: "observation", label: "ok?", required: false, config: {}, validationRules: {}, visibilityRules: {} }] });
const pub = await req(`/api/v1/tenant/checklists/${tpl.j.data.id}/publish`, "POST", H(adm, "tenant_admin"), {});
const wo = await req("/api/v1/work-orders", "POST", H(adm, "tenant_admin"), { title: "OS", checklistId: tpl.j.data.id });
const disp = await req("/api/v1/operations/dispatches", "POST", H(adm, "tenant_admin"), { workOrderId: wo.j.data.id, operatorUserId: tecA.id });
const woAfter = await req(`/api/v1/work-orders/${wo.j.data.id}`, "GET", H(adm, "tenant_admin"));
const runs = await req(`/api/v1/mobile/checklist-runs?workOrderId=${wo.j.data.id}`, "GET", H(adm, "tenant_admin"));
const run = runs.j?.data?.[0];
console.log("template", tpl.s, "publish", pub.s, "OS", wo.s, "despacho", disp.s, "alvo do despacho = tecA:", disp.j?.data?.operatorUserId === tecA.id);
console.log("OS depois do despacho:", JSON.stringify(Object.fromEntries(Object.entries(woAfter.j?.data ?? {}).filter(([k]) => /assign|status|operator/i.test(k)))));
console.log("run provisionada pelo despacho:", !!run, "relatedEntityType=", run?.relatedEntityType, "relatedEntityId==OS:", run?.relatedEntityId === wo.j.data.id);
const sid = randomUUIDx();
function randomUUIDx() { return crypto.randomUUID(); }
const rid = run.id;
const comp0 = (await req(`/api/v1/tenant/checklists/${tpl.j.data.id}`, "GET", H(adm, "tenant_admin"))).j?.data?.components?.[0]?.id;
const vias: Array<[string, string, any]> = [
  ["PATCH", `/api/v1/mobile/checklist-runs/${rid}`, { answers: [] }],
  ["POST", `/api/v1/mobile/checklist-runs/${rid}/markers`, { componentId: comp0 ?? "x", x: 1, y: 1, markerType: "damage" }],
  ["POST", `/api/v1/mobile/checklist-runs/${rid}/divergence`, { observation: "x", componentId: comp0 ?? "x" }],
  ["POST", `/api/v1/mobile/checklist-runs/${rid}/acknowledgement`, { message: "x" }],
  ["POST", `/api/v1/mobile/checklist-runs/${rid}/attachments`, { componentId: comp0 ?? "x", fileUrl: "x" }],
  ["POST", `/api/v1/mobile/checklist-runs/${rid}/complete`, {}],
];
for (const role of ["manager", "operator", "field_dispatcher", "tenant_admin"]) {
  const out: string[] = [];
  for (const [m, p, b] of vias) { const r = await req(p, m, H(adm, role), b); out.push(`${p.split("/").pop()?.slice(0, 14)}=${r.s}${r.j?.error?.reason ? ":" + r.j.error.reason : ""}`); }
  console.log(role.padEnd(16), out.join(" | "));
}
const sy = await req("/api/v1/mobile/sync/checklist-actions", "POST", H(adm, "manager"), { client_batch_id: sid, actions: [{ client_action_id: crypto.randomUUID(), type: "checklist.item_answer", payload: { run_id: rid, component_id: comp0, value: "x" } }] });
console.log("manager sync item_answer:", sy.s, sy.j?.error?.reason ?? JSON.stringify((sy.j?.data?.rejected ?? sy.j?.data?.accepted ?? [])[0]?.error ?? (sy.j?.data?.accepted?.[0]?.status)));
server.close(); process.exit(0);
```

### probe-damage.mts

```ts
// Achado lateral (classe R): o técnico cria dano com profissional responsável → débito imediato no extrato de um colega?
import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
process.env.LOG_LEVEL = "silent"; process.env.CORE_SAAS_PERSISTENCE = "memory";
delete process.env.DATABASE_URL; delete process.env.REDIS_URL;
const root = new URL(pathToFileURL(process.cwd()).href + "/src/");
const imp = (p: string) => import(new URL(p, root).href);
const { createApp } = await imp("app.ts");
const { CoreSaasRegistry } = await imp("modules/core-saas/services/core-saas.service.ts");
const { MemoryCoreSaasAdapter } = await imp("modules/core-saas/services/memory-core-saas.adapter.ts");
const { InMemoryCoreSaasStore } = await imp("modules/core-saas/store/core-saas.store.ts");
const op = await imp("modules/operator-profiles/operator-profile.service.ts");
const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
const t = core.createTenant({ name: "dmg", modules: ["work_orders", "fleet", "damages"] });
const mgr = { id: randomUUID() }, tec = { id: randomUUID() }, colega = { id: randomUUID() };
const ps = await op.createDefaultOperatorProfileService();
const perfilColega = await ps.create({ tenantId: t.id, userId: mgr.id, roles: ["tenant_admin"], permissions: [] } as never, { user_id: colega.id, full_name: "Colega" });
const app = createApp(new MemoryCoreSaasAdapter(core));
const server = app.listen(0, "127.0.0.1"); await new Promise((r) => server.once("listening", r));
const base = `http://127.0.0.1:${(server.address() as any).port}`;
const H = (u: any, role: string) => ({ "content-type": "application/json", "x-tenant-id": t.id, "x-user-id": u.id, "x-role": role });
async function req(path: string, method: string, h: any, body?: unknown) {
  const r = await fetch(base + path, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) });
  const tx = await r.text(); let j: any = null; try { j = JSON.parse(tx); } catch {}
  return { s: r.status, j };
}
const v = await req("/api/v1/vehicles", "POST", H(mgr, "manager"), { plate: "ABC1D23", model: "Guincho" });
const antes = await req(`/api/v1/professional-statements?operatorProfileId=${perfilColega.id}`, "GET", H(mgr, "tenant_admin"));
const d = await req("/api/v1/damages", "POST", H(tec, "field_technician"), { vehicle_id: v.j?.data?.id, data: "2026-10-10", gravidade: "leve", descricao: "x", custo_real: 1000, responsible_operator_profile_id: perfilColega.id, responsible_amount: 900 });
const depois = await req(`/api/v1/professional-statements?operatorProfileId=${perfilColega.id}`, "GET", H(mgr, "tenant_admin"));
const n = (r: any) => JSON.stringify(r.j?.data ?? r.j)?.slice(0, 300);
console.log("veículo", v.s, v.j?.error?.reason ?? "", "| dano pelo field_technician", d.s, d.j?.error?.reason ?? d.j?.error?.message ?? "");
console.log("extrato do colega ANTES:", antes.s, n(antes));
console.log("extrato do colega DEPOIS:", depois.s, n(depois));
server.close(); process.exit(0);
```
