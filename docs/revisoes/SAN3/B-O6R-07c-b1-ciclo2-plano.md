# B-O6R-07c-b1 — ciclo 2: auditoria da reprovação e plano de resolução (modelo de TOPO)

- **Papel:** `planejador-mestre` (TOPO) · **identidade nova:** `planejador-07cb1-ciclo2` — não achou, não desenvolveu, não vota (§C7.4-bis).
- **Modelo:** **Fable 5.1 (`claude-fable-5-1`)**, o do frontmatter (`D-PLANEJADOR-MODELO-FABLE`); sem fallback. Autoridade: CLAUDE.md §C7.4 e §C7.6 (`D-TOPO-NO-PLANO-E-EM-TODA-REPROVACAO`).
- **Data:** 2026-10-17. **Bloco:** `B-O6R-07c-b1` (PR #440, ramo `fix/o6r07cb1-despacho-atribui`), último P0 `Ω6R-SEC-002`. Bloco de PERMISSÃO: inspetor + 3 cadeiras, unanimidade com veto; **o ciclo 2 é o último em que achado não grave reprova** (§C7 item 8(2)).
- **Objeto julgado no ciclo 1:** `b198fe358b41186b2598ab258ccb735da8c04cbc`; ata `agent-orchestration/omega/juntas/J-B-O6R-07c-b1-ciclo1.md` no head `5939a30d` (REPROVADO 1×2: C1 e C3 reprovam, C2 aprova). Base do bloco (merge-base com `origin/main`): `4fe7524e`. `origin/main` no momento desta auditoria: `2a49b015`.
- **Onde medi (§A7):** worktree detached PRÓPRIO `C:/Users/AMP/w-plan07cb1` em `5939a30d` (o `src/` é o do objeto `b198fe35`: os commits `34b8ae73`, `b198fe35` e `5939a30d` tocam só corpos, carimbo da migração e registro), `npm ci` próprio (0 symlink), `npm run db:generate` com URL fictícia, `npm run check` ec 0. Sem Postgres, sem Docker, sem base viva, sem porta. Scratch só em `…/scratchpad/plan07cb1/`. Worktree removido no fim.
- **Insumos lidos:** a ata; `c1-voto.json`, `c1-opus-evidencia.md`, `c2-voto.json`, `c2-opus-evidencia.md`, `c3-voto.json`, `c3-evidencia.md`, `insp-07cb1-parecer.md`; a emenda `docs/revisoes/SAN3/B-O6R-07c-b-emenda-2026-10-15.md`, as seções 07c-b do `B-O6R-07c-plano.md`, a crítica `B-O6R-07c-b1-critica.md` (na `origin/main`), o relatório `B-O6R-07c-b1-dev.md`; `decisoes.md` na `origin/main` (3654–3725); o código do objeto por arquivo:linha.

## Resumo executivo

| achado | classe (ciclo 1) | veredito desta auditoria | reproduzido aqui? |
|---|---|---|---|
| C1-A1 trava contornada (X1, V2, V3, V4, V5) | bloqueia · grave | **REAL — defeito do produto** | sim, 5/5 vias (sonda em memória) |
| C1-A2 `POST /assign` e lote `work_order.assign` fora da trava | bloqueia · grave | **REAL — defeito do produto** (dentro-do-bloco pela régua do corpo) | sim, 2/2 vias |
| C3-A1 compensação não desfaz a OS quando o evento falha | bloqueia · grave | **REAL — defeito do produto** | sim, 3/3 caminhos (memória); Postgres fica para a C3 do ciclo 2 (gatilho) |
| C1-A3 operator muda o técnico (ativar rascunho, falhar) | ajuste | **REAL — não grave** | sim, 2/2 |
| C3-A2 instantâneo ≠ gerador (3 vias de evidência) | ajuste | **REAL — defeito do entregável** (fixture), causado por decisão de desenho do dev | sim, 3 diferenças, 468 = 468 |
| C2-K2 vistoria já aplicada volta como conflito após reinício | ajuste | **ARTEFATO de desenho declarado** (regra D-07c-IDEMP do plano 07c-b.4) — não é defeito; vira pendência nomeada | não re-medido (exige reinício de processo; a C2 mediu N=3) |

**Síntese: 5 reais × 1 artefato.** A junta mediu certo (máquina sã). O dado podre está no processo: a trava `D-07CB1-TRAVA-ATE-B2` chegou DEPOIS do plano e da crítica (17/10) e foi desenhada pelo dev sozinho; e a emenda mandou testar atomicidade "por falha injetada" sem fixar o PONTO da injeção. Detalhes na Parte 1; o plano do ciclo 2 na Parte 2.

## O que executei (comandos → saída → veredito parcial)

| comando | saída | veredito |
|---|---|---|
| `git worktree add --detach C:/Users/AMP/w-plan07cb1 5939a30d` · `npm ci --no-audit --no-fund` · `DATABASE_URL=postgresql://x:y@127.0.0.1:1/nada npm run db:generate` · `env -u DATABASE_URL -u REDIS_URL CORE_SAAS_PERSISTENCE=memory npm run check` | ec 0/0/0/0; `find node_modules -maxdepth 1 -type l` = 0 | terreno próprio limpo |
| `env -u DATABASE_URL -u REDIS_URL CORE_SAAS_PERSISTENCE=memory node --test --import tsx --test-reporter=tap tests/o6r07c-b-scope.test.ts` | `# tests 41 · pass 41 · fail 0` | baseline do bloco em memória: **41** |
| `node --import tsx tests/helpers/o6r07c-census.ts gravar <scratch>/regen.json` (N=1) + comparador node sobre `tests/fixtures/o6r07c-classificacao-vias.json` | 468 = 468 chaves, só-fixture 0, só-regen 0, **3 diferenças**: `PAR …/evidence-actions · evidence.work_order_{observation,photo,signature}` fixture `EVIDENCIA-OS·ESCOPO` × regen `OS·SEM-ALCANCE`; resumo do gerador `EVIDENCIA-OS·ESCOPO=1 · OS·SEM-ALCANCE=18` (o commitado tem 4 e 15) | **C3-A2 reproduzido** |
| sonda PRÓPRIA `<scratch>/plan07cb1/sonda.mts` (md5 `942a9a8057138a56c606734da06546ed`; app real `createApp` + `MemoryCoreSaasAdapter`, HTTP em `listen(0)`, permissões do catálogo pelo `x-role`) | tabela abaixo | A1, A3, C3-A1 reproduzidos |
| sonda `sonda2.mts` (md5 `320226d2ffb6d2318eb6c439d6491ef0`; mesmo cabeçalho; `operatorId` UUID porque em memória os ids de usuário são `usr_00000N` e o `assign` exige UUID) | tabela abaixo | A2 e C3-A1b reproduzidos |

Saída da sonda (objeto; `d1` = despacho de tecA; "No local" = `on_route` → `arrived` pelo próprio tecA):

```
K1 antes de No local: reassign d1->tecC          | 200  OS=tecC                              (controle positivo)
K2 No local: reassign direto d1->tecC            | 409 technician_change_requires_authorization OS=tecA (a trava existe)
A1-X1 reassign d1->tecA (mesma) depois ->tecC    | 200 d1=reassigned ; 200 OS=tecC d1=tecC:reassigned
A1-V2 d1 arrived; despacho novo tecC             | 201  OS=tecC d1=arrived
A1-V3 d1 arrived; rascunho tecC ativado (gestor) | 201>200  OS=tecC
A1-V4/5 d2 tecC ativo; d1 tecA arrived -> cancelled | 200  OS tecA->tecC d2=assigned
A1-V4/5 d2 tecC ativo; d1 tecA arrived -> failed    | 200  OS tecA->tecC d2=assigned
A1-V4b d1 arrived -> cancelar d1 -> despacho tecC   | 200>201  OS=tecC   (residual, ver 1.1)
A3 operator ativa rascunho de tecC               | 200  OS=tecC
A3 operator falha d1 (tecA) com d2 tecC ativo    | 200  OS=tecC d2=assigned
C3-A1 create: evento falha                       | 400 OS=tecA:assigned despachos=0
C3-A1 reassign: evento falha                     | 400 OS=tecC d1=tecA:assigned
C3-A1 ativar rascunho: evento falha              | 400 OS=tecA d=draft
C3-ctl sem injecao                               | 201 OS=tecA despachos=1
A2-web d1 arrived, OS assigned: POST /assign <uuid> | 200  OS.user=null OS.op=UUID-novo d1=arrived
A2-lote d1 arrived: work_order.assign <uuid>     | 200 accepted OS.user=null OS.op=UUID-novo
A2-ctl OS on_site: POST /assign <uuid>           | 409 invalid_status_transition (máquina da OS, não a trava)
A2-K antes de No local (on_route): POST /assign  | 200  OS.user=null d1=tecA:on_route (permitido; despacho e OS divergem)
C3-A1b web assign <uuid>: evento falha           | 400 OS.op=UUID-novo st=assigned (mesma forma; pré-existente 51238552)
```

## PARTE 1 — AUDITORIA DA REPROVAÇÃO

### 1.1 C1-A1 — a trava contornada com o «No local» só no despacho → **REAL, grave (permissão), dentro-do-bloco**

**O que a C1 mediu** (`c1-voto.json`, achado A1; `c1-opus-evidencia.md` item 3, N=384 células, 4 papéis idênticos): com o despacho em `arrived`/`in_service` e a OS antes de `on_site`, o reassign direto é recusado (409), mas 5 vias trocam o técnico da OS: X1 (reassign à mesma pessoa e depois a outro), V2 (despacho novo), V3 (rascunho ativado), V4 (cancelar) e V5 (falhar) com devolução automática. **Re-medido aqui: 5/5 reproduzidas** (tabela acima), com os dois controles acusando (K1 troca antes de No local; K2 recusa o reassign direto).

**Causa, no código do objeto (`src/modules/field-dispatch/field-dispatch.service.ts`):**
- a trava `assertTechnicianChangeAllowed(workOrder, dispatchStatus?)` (l.942-954) mede "atendimento iniciado" em **dois objetos errados**: o status do despacho que está sendo mutado (só no `reassign`, l.636) ou o status da OS (`WORK_ORDER_SERVICE_STARTED`, l.73). `assertNewTargetAllowed` (l.957-961, usada por `create` l.254 e pela ativação l.557) olha **só a OS**. A pergunta certa é sobre a **OS como um todo**: *existe despacho ATIVO desta OS em `arrived`/`in_service`?* — e ninguém a faz;
- **X1:** reatribuir à MESMA pessoa é aceito (l.635: a trava só roda se o alvo muda) e `repository.reassign` escreve `status = reassigned` (máquina do despacho, `field-dispatch.validators.ts:12`: `arrived → reassigned`). A marca `arrived` desaparece; `reassigned` não está em `DISPATCH_SERVICE_STARTED` (l.72), e a 2ª reatribuição passa. O comentário l.634 ("reatribuir à MESMA pessoa não troca ninguém") é verdadeiro sobre o técnico e falso sobre o estado;
- **V4/V5:** `moveAssignmentToRemainingDispatch` (l.1013-1048) guarda só a OS (l.1022) e ignora que o despacho que acabou de fechar (`current.status`) estava em No local.

**Residual declarado (não é achado):** V4b — cancelar o despacho em No local e DEPOIS despachar outro (200 > 201) continua possível: o cancelamento é ato explícito e auditado do despachante, e o despacho novo nasce com nenhum despacho ativo em No local. Não é "troca de técnico"; é "encerrar e redistribuir". Fica como **pergunta ao dono para o b2** (§2.8), sem bloquear o ciclo 2.

**Por que é grave:** a C1 mediu o efeito (sonda 3b): o técnico que está no cliente perde a escrita (403 `not_assigned_to_actor` no despacho e na vistoria) e outro, que não está lá, escreve — exatamente a anomalia que a `D2-07c` e a `D-07CB1-TRAVA-ATE-B2` mandam impedir.

### 1.2 C1-A2 — atribuição pela OS (`POST /work-orders/:id/assign` e lote `work_order.assign`) fora da trava → **REAL, grave, dentro-do-bloco**

**Re-medido:** com `d1` em `arrived` e a OS em `assigned`, `POST /assign {operatorId:<uuid>}` → **200**, `assigned_user_id` vira `null` e `assigned_operator_id` vira o novo id, `d1` segue `tecA:arrived`; o lote `work_order.assign` → `accepted` com o mesmo efeito. Controle: OS em `on_site` → 409 `invalid_status_transition` — é a máquina da OS (`work-order.validators.ts:21-32`, `accepted→assigned` não existe), não a trava; a via web só passa quando a OS está em `open`/`assigned` (`assertStatusTransition` aceita `from === to`, `work-order.validators.ts:~103`). Também medido: antes de No local (`on_route`) a via web passa e deixa `d1 = tecA:on_route` com a OS em outro técnico — **despacho e OS divergem** mesmo onde a troca é permitida (limite pré-existente do `assign` web, que nunca tocou despachos; vira pendência, §2.5).

**Escopo:** o método `assign` antecede o bloco (`51238552`, 2026-06-09), mas (i) `work-order.service.ts` está no PERMITIDO da emenda (l.52) e o bloco o editou; (ii) a equivalência "despacho = atribuição" (`D1-07c`) e a trava são deste bloco; (iii) a propriedade "a troca a partir de No local é recusada" vale o que vale a via mais frouxa. Concordo com a C1: **dentro-do-bloco**. A evidência de data publicada (51238552) serve para o registro, não para rebaixar o achado.

**Causa:** `WorkOrderService.assign` (l.1688-1736) não tem trava nenhuma: `assertStatusTransition(current.status, "assigned")` (l.1711) → `repository.assign` (l.1712) → evento (l.1718). Chamadores: `work-order.controller.ts:199` (rota `POST /work-orders/:workOrderId/assign`, permissão `work_orders:assign`, `work-order.routes.ts:196-199`) e `mobile-work-order-sync.ts:233-245`.

### 1.3 C3-A1 — a compensação não desfaz a atribuição quando o INSERT do evento falha → **REAL, grave, dentro-do-bloco**

**Re-medido em memória (3/3):** substituindo `InMemoryWorkOrderRepository.prototype.createEvent` para falhar em `work_order_assigned`: create → OS `tecA:assigned` com **0 despacho**; reassign → OS `tecC` com `d1 = tecA:assigned` (restaurado); ativar rascunho → OS `tecA` com o rascunho de volta a `draft`. Controle sem injeção: 201, OS tecA, 1 despacho. **No Postgres não re-medi** (sem banco nesta auditoria); a C3 confirmou com gatilho `BEFORE INSERT ON work_order_events` no cluster dela (`c3-evidencia.md` item 2(b)), com o controle do gatilho na linha (`work_order_assignments` → OS volta a `open`: OS+linha são atômicas). Como medir no ciclo 2: §2.4 (teste `-db` com gatilho escopado por organização).

**Causa:** `WorkOrderService.assignFromDispatch` (`work-order.service.ts:1754-1822`) chama `repository.assignFromDispatch` — `$transaction { findFirst; updateManyAndReturn OS; workOrderAssignment.create }` (`work-order-prisma.repository.ts:565-605`) — e **depois**, fora dela, `repository.createEvent` (l.1804; Prisma l.631-646). O `RlsPrismaWorkOrderRepository` envolve **cada** chamada numa `withTenantRls` própria (l.742-761): duas transações. As compensações em `field-dispatch.service.ts` (`deleteById` l.433; `restoreState` l.585 e l.664) desfazem só o despacho. O docblock do método (l.1751-1752) **declara** "o evento vem depois, como no `assign`" — a forma foi escolhida, não esquecida; o que faltou foi o teste da falha DEPOIS da transação (o `-db` chama `assignFromDispatch` direto sem falha injetada — nota N1 da C3; as mutações M19/M20 do dev injetam em `assignFromDispatch` INTEIRO, antes de qualquer escrita).

**A mesma forma no `assign` web** (l.1712 → l.1718), pré-existente (`51238552`): re-medido (C3-A1b) — evento falha, cliente recebe 400, a atribuição fica. O ciclo 2 fecha os dois pelo mesmo mecanismo (§2.2), porque a propriedade é uma só e o custo marginal é nulo (mesmo repositório).

### 1.4 Ajustes

**C1-A3 — o operator passa a mudar o técnico da OS → REAL, não grave, dentro-do-bloco.** Re-medido: operator (só `field_dispatch:read/update`, emenda M4) ativa um rascunho de tecC → 200 e a OS vira tecC; operator falha `d1` com `d2` ativo → 200 e a OS vai a tecC. Causa: `assertMayActivateDraft` (`field-dispatch.service.ts:928-937`) nega por **papel** (`actorMutatesAssignedOnly`) e não por **permissão de alocar**; a ativação de rascunho é um ato de alocação (atribui a OS) e deve exigir `field_dispatch:create`. A devolução ao falhar/cancelar é side-effect de um fechamento cujo alvo foi escolhido antes por quem aloca; o operator não escolhe o técnico — fica **declarado e aceito** (§2.5), e a cadeira do ciclo 2 julga.

**C3-A2 — o instantâneo commitado não é o que o gerador do objeto produz → REAL (defeito do ENTREGÁVEL fixture), não grave, dentro-do-bloco.** Re-medido: 3 diferenças exatas (tabela). Causa em duas camadas:
1. **Decisão de desenho do dev** (relatório R4; código `mobile-evidence-sync.ts`, hunk `processAction`: `if (descriptor.scope === "work_order" && actorMutatesAssignedOnly(actor)) await service.getForMutation(...)`): o papel `tenant_wide` **não consulta a OS** ao registrar `evidence.work_order_*`. O censo define "alcança" como *a resposta do papel de campo é igual à do despachante com o mesmo payload* (`tests/helpers/o6r07c-census.ts:253`, `alcanca: o === a`); com `work_order_id` aleatório, o campo recebe `rejected not_found` e o admin `accepted` → `semAlcance` → `OS·SEM-ALCANCE` (`porRegra`, l.459). Nas 12 vias de vistoria isso não ocorre porque a run inexistente dá 404 para todos antes do escopo. A divergência é um **sintoma real**: o admin registra evidência de uma OS que não existe nesta organização, o técnico não — não é "um critério só" (`D1-07c`). Motivo do dev para a decisão: 3 asserções de `tests/mobile-backend-contracts.test.ts` (l.1716, `work_order_id: "work-order-1"`, OS inexistente) ficariam vermelhas.
2. **Nenhum T compara `gerado` × instantâneo**, embora `classificar` já devolva `gerado` (`o6r07c-census.ts:497,503`) e o guard já chame `classificar` (`o6r07c-census-guard.test.ts:110,116`). O T6 só acusa `SEM-ALCANCE` quando o campo alcança, não o inverso.

**C2-K2 — conclusão de vistoria já aplicada, reenviada após reinício e troca, volta como conflito → ARTEFATO de desenho declarado, não defeito.** É a consequência literal da regra do plano 07c-b.4 (l.550-557, `D-07c-IDEMP`): "por estado, o escopo vem antes". Nada se perde nem duplica (C2, N=3). Existe caminho de refino — a run guarda `completedBy` (`checklist.types.ts:125`; Prisma `checklist-prisma.repository.ts:716`; memória `checklist.repository.ts:476`), então "por estado COM autor gravado = o próprio ator → `already_applied`" seria honesto — mas isso **emenda uma regra que a junta já aceitou** e não é o que reprovou o bloco. Decisão deste plano: **pendência nomeada com dono `B-O6R-07c-b2`** (§2.5), onde a decisão do superior é a saída do conflito. Não entra no ciclo 2.

### 1.5 Notas e pré-existentes (não reprovam; viram pendência nomeada com bloco dono — o orquestrador registra em `controle/pendencias.md`)

| nota | origem | evidência de data | dono sugerido |
|---|---|---|---|
| `technician` (papel de campo STANDARD) sem `field_dispatch:update`: despachado, não muda o próprio despacho (403 `permission_required`) | C1-N1 | catálogo do `technician` desde `3ffec005` (2026-05-21); `catalog.ts` PROIBIDO | bloco de catálogo/RBAC (`B-SAN3-04a` ou sucessor) |
| upload com `evidence_id` de outra organização → 403 `evidence_tenant_mismatch` (não 404), igual para alheio e inexistente | C1-N2 | igual na base `4fe7524e` | `B-O6R-07b` (upload) ou sucessor |
| "usar a do servidor" marca a ação local como sincronizada sem estado do servidor | C2 | `mobile/` fora do diff do bloco | `B-SAN3-16` |
| evidência `field_*` aceita `work_order_id` alheio e o ecoa (rótulo livre, sem leitor por OS) | C2 | `366e82da` (2026-06-15) | `B-SAN3-16` ou bloco de evidência |
| idempotência durável da vistoria por `client_action_id` não confere o ator | C2 | `8a938414` (2026-08-01) | `B-O6R-07c-b2` |
| o app não emite `work_order.mileage` pela fila | C2 | contrato do app anterior | `B-SAN3-16` / trilha do app |
| o `-db` chama `assignFromDispatch`/`restoreState` direto, sem falha injetada | C3-N1 | dentro-do-bloco | **corrigido no ciclo 2** (§2.4) |
| corpo do PR cita `20260874` e a pergunta 1 em `on_route` | C3-N2 | dentro-do-bloco | **corrigido no ciclo 2** (§2.6: corpo do PR com os números do head) |
| `tests/o6r07c-census-guard.test.ts` fora da lista PERMITIDA e não declarado | C3-N3 | dentro-do-bloco | **sanado no ciclo 2**: entra no PERMITIDO (§2.3) |
| instantâneo "só removendo entradas" era inexequível (T1) — o bloco reclassificou | C3 nota | dentro-do-bloco | sanado: §2.3 escreve "reclassificar, nunca remover" |
| ex-técnico só de despacho reatribuído ANTES do deploy recebe `rejected`, não conflito; divergentes do backfill só como total no NOTICE | dev R5 | residual declarado | registrar como `P-07CB1-RESIDUAL-BACKFILL` (dono `B-O6R-07c-b2`) |

### 1.6 As três perguntas da ata (§C7.4-bis)

**(a) A composição cobriu a competência que os achados exigem?** Sim. C1 (escopo/RBAC) achou A1 e A2 com uma grade de 384 células e a sonda de efeito; C3 (persistência) achou A1 com gatilho no Postgres e controle na linha; C2 (sync) mediu as 4 famílias e não achou bloqueio — coerente com o diff (`mobile/` vazio; a camada de conflito está certa). Nenhum achado ficou fora da competência de quem o achou.

**(b) Quem achou é quem conserta?** Não, e o ciclo 2 mantém a separação: **quem achou** = `jurado-07cb1-c1-opus` e `jurado-07cb1-c3-opus` (e `-c2-opus` para os ajustes); **quem planeja** = esta identidade (`planejador-07cb1-ciclo2`, Fable); **quem desenvolve** = um dev de identidade NOVA em Opus (nível menor, declarado), que não é cadeira do ciclo 1 nem autor desta auditoria. Recomendo também que não seja `dev-b-o6r-07c-b1-opus`: quem escreveu a trava no objeto errado está convencido do desenho (a lição da repaginação do KPI, `D-JUNTA-SEPARACAO-DE-PAPEIS`). As 3 cadeiras do ciclo 2 são identidades novas (§2.9).

**(c) O planejador usou dado podre?** **Sim, em dois pontos — e os dois são de PROCESSO, não de número:**
1. **A trava não teve plano.** `D-07CB1-TRAVA-ATE-B2` nasceu em 17/10, depois da emenda (15/10) e da crítica (16/10), como resposta às perguntas do dev. O dev a implementou a partir da própria leitura (relatório, seção D0: "Leitura do dev, declarada") — leitura correta no enunciado ("a trava vale para toda via que TROCA o técnico") e errada no predicado (mediu o despacho mutado ou a OS, não "há despacho ativo da OS em No local"). Sem crítico, sem planejador; a emenda não tinha o critério "um predicado único de atendimento iniciado, por OS". É o mesmo padrão do 07c-a ciclo 1 (guarda que reconhece a via, não a propriedade).
2. **A emenda mandou "atomicidade testada por falha injetada" sem fixar o PONTO.** O dev injetou antes de qualquer escrita (M19/M20 e o teste "compensação"), e o teste ficou verde-cego para a falha DEPOIS da transação OS+linha. Um critério escrito ("injetar no último INSERT do caminho") teria pegado o A1 da C3 no dev.
Além disso, o PERMITIDO da emenda ("o instantâneo do censo, só removendo entradas") era inexequível (T1 exige toda chave viva no instantâneo); o dev fez o certo (reclassificar) e o plano ficou devendo a regra (sanado em §2.3).

### 1.7 Sinal de não-convergência (a classe se repete sem informação nova?)

**Não há repetição sem informação nova neste bloco** — é o ciclo 1 do 07c-b1. A **classe** "guarda que cobre uma via e não a propriedade" já apareceu no 07c-a (ciclo 1: guard por forma; auditoria de topo do 07c-a ciclo 2, veredito MISTO) e reaparece aqui com informação nova real (uma decisão do dono chegou depois do plano). O ciclo 2 enuncia a propriedade e põe a trava num ponto único (§2.2); **se o ciclo 2 reprovar por "via que escapa à trava", será repetição sem informação nova** — aí o orquestrador declara o sinal e a auditoria da máquina do §C7.4 (ciclo 3) deixa de ser opcional pela régua da `D-GOV-PROPORCIONAL`... mas pela mesma régua, no ciclo 3 só defeito grave bloqueia.

### 1.8 Síntese

**5 reais × 1 artefato.** Reais: C1-A1, C1-A2, C3-A1 (graves, bloqueiam, dentro-do-bloco), C1-A3 e C3-A2 (não graves). Artefato: C2-K2 (consequência declarada de regra aceita → pendência b2). A junta não fabricou achado e não deixou de ver os reais (a classe de atomicidade pré-existente no `assign` web foi vista pela mesma lente e fica fechada de graça). **Máquina sã; plano do ciclo 1 incompleto nos dois pontos acima.** O ciclo 2 resolve com um desenho de ponto único, testes com vermelho-controle por mutação, e sem tocar `prisma/**`.

## PARTE 2 — PLANO DO CICLO 2

**Objetivo:** fechar os 3 bloqueios e os 2 ajustes reais do ciclo 1 sem reabrir nada do que está verde, com UM ponto de decisão por propriedade e teste que fica vermelho pela mutação nomeada. **Ator:** quem aloca (Gestor `manager`, Operação de Campo `field_dispatcher`, Administrador `tenant_admin`) e o Técnico de Campo (`field_technician`) que já está no cliente. **Fluxo origem → destino:** o despachante tenta trocar o técnico de uma OS com atendimento iniciado por qualquer via (despacho, OS, lote) → o servidor recusa com 409 e nada é gravado; quando a troca é legítima, OS + linha + evento nascem juntos ou não nascem.

### 2.1 Propriedades a enunciar (o que o ciclo 2 prova)

- **P-TRAVA (uma trava, por OS):** *nenhuma via do servidor troca o técnico de uma OS com atendimento iniciado sem autorização do superior; atendimento iniciado = OS em `on_site`/`in_progress`/`paused` OU existe despacho ATIVO desta OS em `arrived`/`in_service`.* Até o b2 a troca responde `409 technician_change_requires_authorization` **antes de qualquer escrita**. Corolários: reatribuir ao mesmo técnico não escreve nada; a devolução automática ao cancelar/falhar não move a OS quando o despacho fechado estava em No local.
- **P-ATOMICA:** *a atribuição da OS — colunas `assigned_*`, linha em `work_order_assignments` e evento `work_order_assigned` — é UMA transação; falha em qualquer parte deixa a OS como estava; a compensação do despacho desfaz só o despacho e nunca deixa OS atribuída sem despacho que a explique.* Vale para `assign` (web/lote) e `assignFromDispatch`.
- **P-ALOCA:** *só quem pode despachar (`field_dispatch:create`) ativa um rascunho, porque ativar atribui a OS.*
- **P-CENSO:** *o instantâneo commitado é o que `classificar` gera (`gerado` == instantâneo) — e isso é um T, não um passo da bateria.*
- **P-MANTIDAS:** tudo o que o ciclo 1 provou verde continua (as 23 vias, D2 em 4 famílias, upload pela OS do recibo, rascunho, OS encerrada, backfill P6).

### 2.2 Desenho — o ponto único

**Onde mora a trava: `WorkOrderService`**, dono do técnico da OS. O despacho pergunta; a OS decide.

| peça | arquivo | o que muda |
|---|---|---|
| (a) predicado "há despacho desta OS em No local" | `src/modules/field-dispatch/field-dispatch.service.ts` | função exportada nova `hasActiveDispatchAtSite(tenantId, workOrderId): Promise<boolean>` sobre o repositório padrão (memória: `memoryRepository`; prisma: `createPrismaFieldDispatchRepository()`), `list({ tenantId, workOrderId, limit: 100, offset: 0 })` → `items.some(d => DISPATCH_SERVICE_STARTED.has(d.status))`. `DISPATCH_SERVICE_STARTED` (l.72) fica; `WORK_ORDER_SERVICE_STARTED` (l.73) sai daqui |
| (b) referência injetada | `src/modules/work-orders/work-order.service.ts` (`WorkOrderReferenceResolvers`; `createDefaultReferenceResolvers()` l.1996 — serve memória E prisma) | `hasActiveDispatchAtSite` por **import dinâmico** de `../field-dispatch/field-dispatch.service.js` (idioma de `resolveActorOperatorProfileId`, l.~2151; evita o ciclo de importação), **sem `catch`**: falha de leitura propaga e a atribuição não acontece (fail-closed; erro nunca vira permissão) |
| (c) a trava, pública | `work-order.service.ts` | `async assertTechnicianChangeAllowed(actor, current: WorkOrder, target: { userId?: string; operatorId: string })`: sem técnico atual → passa; alvo igual (`assignedUserId ?? assignedOperatorId` contra `target.userId`/`target.operatorId`) → passa; `WORK_ORDER_SERVICE_STARTED.has(current.status)` OU `await resolver(tenantId, id)` → `throw new WorkOrderError(409, "WORK_ORDER_TECHNICIAN_CHANGE_REQUIRES_AUTHORIZATION", "technician_change_requires_authorization", <mensagem atual>)`. **Resolver ausente → recusa** (fail-closed por composição incompleta, como `assertMutationObjectScope` l.803-804). `WORK_ORDER_SERVICE_STARTED` exportada de `work-order.types.ts` |
| (d) chamadores da trava | `work-order.service.ts` `assign` (antes de l.1711) e `assignFromDispatch` (depois do `get`, antes do repositório) | a chamada AUTORITATIVA: toda escrita do técnico passa por ela |
| (e) pré-checks do despacho | `field-dispatch.service.ts` `create` (l.254), ativação (l.557), `reassign` (l.635-637) | as privadas `assertTechnicianChangeAllowed`/`assertNewTargetAllowed` (l.942-961) são **apagadas**; os três pontos chamam `this.workOrderService.assertTechnicianChangeAllowed(actor, workOrder, { userId: alvo, operatorId: alvo })` ANTES de qualquer escrita (freeze, provisão, despacho). Mesma função, uma implementação; a mutação de um pré-check isolado é mutante equivalente (a autoritativa pega) — declarado |
| (f) reassign ao mesmo técnico = no-op | `field-dispatch.service.ts` `reassign` | se `operatorUserId === current.operatorUserId`: devolve `current` com 200, **sem** `repository.reassign`, sem evento, sem `assignFromDispatch`. Fecha X1 (o despacho não sai de `arrived`) |
| (g) devolução guarda o status fechado | `field-dispatch.service.ts` `moveAssignmentToRemainingDispatch` (l.1013) | recebe `closedPreviousStatus = current.status`; `if (DISPATCH_SERVICE_STARTED.has(closedPreviousStatus)) return;` ao lado da guarda da OS (l.1022). Fecha V4/V5; a OS fica com o técnico que estava no cliente |
| (h) ativar rascunho por permissão | `field-dispatch.service.ts` `assertMayActivateDraft` (l.928) | `hasPermission(actor, "field_dispatch:create")` em vez de `!actorMutatesAssignedOnly(actor)`; mesmo `reason` `dispatch_activation_requires_dispatcher`. Fecha A3 (operator e técnico → 403) |
| (i) atomicidade | `work-order.repository.ts` (interface l.69-78 + memória l.424-525), `work-order-prisma.repository.ts` (`assign` l.524-560, `assignFromDispatch` l.562-608) | `assign` e `assignFromDispatch` recebem os campos do evento (`fromStatus`, `actorUserId`, `message`, `metadata`) e gravam `work_order_events` **dentro do mesmo `$transaction`** (`tx.workOrderEvent.create` logo após `workOrderAssignment.create`); devolvem `{ workOrder, assignment, event }`. O serviço deixa de chamar `createEvent` nesses dois caminhos (l.1718, l.1804). Memória: o evento é gravado dentro do método. Fecha C3-A1 e A1b |
| (j) evidência da OS existe para todos | `src/modules/mobile/mobile-evidence-sync.ts` (hunk `processAction`) | `descriptor.scope === "work_order"`: `tenant_wide` → `await service.get(actor, workOrderId)` (404 → `rejected not_found`, cross-tenant idem); `assigned_only` → `getForMutation` como hoje. Fecha a causa do C3-A2 (um critério só) |
| (k) censo | `tests/fixtures/o6r07c-classificacao-vias.json` (SÓ pelo `gravar`), `tests/o6r07c-census-guard.test.ts` | depois de (j), `gravar` tem de dar **byte-idêntico** ao commitado (as 3 voltam a `EVIDENCIA-OS·ESCOPO`); **T14** novo: `assert.deepEqual(cl.gerado, INSTANTANEO)`. Helper intocado |
| (l) ratchet | `tests/san3-05-acessos-de-plataforma-guard.test.ts` (`NOVAS`) | 2 chaves: `PrismaWorkOrderRepository.assign` e `.assignFromDispatch` × `tx.workOrderEvent` / `workOrderEvent.create` / `work_order_events` (`$TRANSACTION-SEM-SETTER-PROVADO`, mesmo motivo das 3 do ciclo 1) |

**Mapa via → gate (todas passam pela MESMA função; é o que a C1 do ciclo 2 confere):**

| via | caminho no código | gate |
|---|---|---|
| reassign direto | `FDS.reassign` → pré-check (e) → `WOS.assignFromDispatch` → (c) | 409 antes de `repository.reassign` |
| X1 (mesma pessoa, depois outro) | `FDS.reassign` → (f) no-op; 2º passo = reassign direto | o despacho segue `arrived` → 409 |
| V2 despacho novo | `FDS.create` → (e) → … → `assignFromDispatch` → (c) | 409 antes do freeze |
| V3 ativar rascunho | `FDS.changeStatus draft→assigned` → (e) → `assignFromDispatch` → (c) | 409 antes de `repository.changeStatus` |
| V4/V5 cancelar/falhar | `FDS.changeStatus` → (g) → (`assignFromDispatch` → (c)) | 200; OS intacta |
| web `POST /work-orders/:id/assign` | `controller.assign` → `WOS.assign` → (c) | 409 |
| lote `work_order.assign` | `mobile-work-order-sync` → `WOS.assign` → (c) | o lote transforma o 409 na forma que já dá a 409 (`conflicts[]`/`rejected` com `technician_change_requires_authorization`); a C1 confere a forma e a C2 que a D2 não mudou |
| backfill P6 | migração, não é via de runtime | — |

**Contrato (códigos):** 409 `technician_change_requires_authorization` (troca a partir de No local); 403 `dispatch_activation_requires_dispatcher` (quem não despacha ativa rascunho); 404 `not_found` (OS/despacho de outra organização ou inexistente — inalterado); lote: `rejected not_found` para evidência de OS inexistente (todos os papéis); 409 `invalid_status_transition` da máquina da OS inalterado. **Modelagem:** nenhuma migração; nenhuma coluna; `Decimal`/`timestamptz`/delete lógico não se aplicam (sem mudança de esquema). A migração `20260877000000_backfill_…` fica intocada.

### 2.3 Escopo PERMITIDO / PROIBIDO (caminhos exatos; regra do espelho: o módulo de referência é o próprio `work-orders`, idioma dos resolvers injetados)

**PERMITIDO (código):**
- `src/modules/work-orders/work-order.service.ts` — (b), (c), (d), remoção dos `createEvent` de `assign`/`assignFromDispatch`;
- `src/modules/work-orders/work-order.types.ts` — exportar `WORK_ORDER_SERVICE_STARTED`; tipo do resolver; tipo de retorno `{ workOrder, assignment, event }`;
- `src/modules/work-orders/work-order.repository.ts` e `work-order-prisma.repository.ts` — (i);
- `src/modules/field-dispatch/field-dispatch.service.ts` — (a), (e), (f), (g), (h);
- `src/modules/field-dispatch/field-dispatch.types.ts` — só se (a) precisar de tipo novo (preferir não);
- `src/modules/mobile/mobile-evidence-sync.ts` — (j).

**PERMITIDO (testes e fixture):**
- `tests/o6r07c-b-scope.test.ts` (T-TRAVA, T-ALOCA, T-ATOMICA-MEM, T-EVID-EXISTE, T-COMPOSICAO; os 41 de hoje ficam, ajustando só o que o desenho muda: o `-db` [despacho] e o "mesma pessoa" — ver §2.4);
- `tests/o6r07c-b-scope-db.test.ts` (T-ATOMICA-DB; o caso [despacho] passa a exercitar `FieldDispatchService` com falha injetada);
- `tests/o6r07c-census-guard.test.ts` (T14 — declarado aqui, sanando a N3 da C3);
- `tests/fixtures/o6r07c-classificacao-vias.json` — **só pela saída do `gravar`** (regra corrigida: *reclassificar, nunca remover* — remover viola o T1); se o `gravar` divergir fora das 3 chaves do C3-A2, o dev PARA e reporta;
- `tests/san3-05-acessos-de-plataforma-guard.test.ts` — só a lista `NOVAS` (l);
- `tests/mobile-backend-contracts.test.ts` — só o arnês dos 3 casos de `evidence.work_order_*` do `tenant_admin` (l.~1716): a OS passa a existir (classe (iii), arnês) — **declarar no relatório**.

**PERMITIDO (registro):** `docs/revisoes/SAN3/B-O6R-07c-b1-ciclo2-dev.md` (relatório do dev, com comando → saída → veredito por passo); `agent-orchestration/controle/*` (APPEND: decisões, pendências de §2.5); `agent-orchestration/omega/juntas/**` e `omega/reprovacoes/**` (orquestrador); corpos das 3 cadeiras novas em `.claude/agents/especialistas/` e espelho `.agents/agents/especialistas/` (fábrica/orquestrador, `git add -f`); corpo do PR #440.

**PROIBIDO:**
- `prisma/**` e `migrations/**` — inclusive a `20260877000000_backfill_work_order_assignment_from_active_dispatches` (intocada; `git diff --quiet b198fe35 <objeto> -- prisma` ec 0 é critério da C3);
- `mobile/**`, `frontend/**`, `Kpis/**` (KPI congelado, `D-GOV-PROPORCIONAL` (5)), `src/modules/core-saas/permissions/catalog.ts` (nenhuma permissão nova), `src/app.ts`, `.github/**`, `package.json`, lockfiles, `src/modules/damages/**`;
- `src/modules/checklists/**`, `src/modules/mobile/mobile-checklist-sync.ts`, `mobile-evidence-upload.ts`, `mobile-work-order-sync.ts` (nenhum achado os toca; a trava chega ao lote por `WOS.assign`);
- `approval.*` (b2); o algoritmo E a tabela de `tests/helpers/o6r07c-census.ts`; `RBAC_MATRIX.md`; `CLAUDE.md`/`AGENTS.md`;
- os controles do ciclo 1 que estão verdes: nenhum teste existente é apagado; renome só com o nome antigo citado no relatório.

**Arquivos tocados (lista fechada, 13):** `work-order.service.ts`, `work-order.types.ts`, `work-order.repository.ts`, `work-order-prisma.repository.ts`, `field-dispatch.service.ts`, `mobile-evidence-sync.ts`, `tests/o6r07c-b-scope.test.ts`, `tests/o6r07c-b-scope-db.test.ts`, `tests/o6r07c-census-guard.test.ts`, `tests/fixtures/o6r07c-classificacao-vias.json` (esperado: diff vazio após o `gravar`), `tests/san3-05-acessos-de-plataforma-guard.test.ts`, `tests/mobile-backend-contracts.test.ts`, `docs/revisoes/SAN3/B-O6R-07c-b1-ciclo2-dev.md`. Qualquer outro arquivo = fora do escopo, declarado antes (§A2) ou achado da C3.

### 2.4 Testes novos e o vermelho-controle de cada um

Regra: todo teste novo nasce com (i) o vermelho **sem mutação** contra o objeto do ciclo 1 (`src/` trocado por `git -c core.autocrlf=false checkout b198fe35 -- src`, `hash-object` = blob, restauro provado) e (ii) a mutação nomeada abaixo numa cópia descartável (`git worktree add --detach … <head>`, `npm ci` próprio, âncora única, restauro byte-idêntico, `git worktree remove --force`). Contagens por subteste (`node --test` TAP).

| teste | arquivo | o que prova | vermelho sem mutação (objeto `b198fe35`) | mutação que o derruba |
|---|---|---|---|---|
| **T-TRAVA (grade)** — estados {d1 `arrived`, d1 `in_service`, OS `on_site`, OS `in_progress`, OS `paused`} × vias {reassign direto, X1, V2, V3, V4, V5, web `POST /assign`, lote `work_order.assign`} × papéis {`manager`, `field_dispatcher`, `tenant_admin`} = **120 células** (subtestes): 409 `technician_change_requires_authorization` com mensagem /autoriza/i, OS e despachos **intactos** (técnico, status, nº de linhas de atribuição); V4/V5: 200 e a OS fica com o técnico do despacho fechado; X1: após o 1º passo o despacho **continua `arrived`** | `tests/o6r07c-b-scope.test.ts` | P-TRAVA | X1, V2, V3, V4, V5, web, lote vermelhos nos estados d1 `arrived`/`in_service` (= os achados A1/A2); 1º passo do X1 vermelho (`reassigned`) | **MT1** resolver devolve sempre `false` (só a OS conta) → vermelho em todas as vias com d1 em No local; **MT2** no-op (f) removido → X1 vermelho; **MT3** guarda (g) removida → V4/V5 vermelhos; **MT4** `assign` sem (d) → web/lote vermelhos |
| **T-TRAVA controle positivo** — d1 `on_route` (antes de No local): as 8 vias trocam (ou movem) o técnico | idem | o complemento da `D-07CB1-TRAVA-ATE-B2` | verde nos dois (controle) | **MT5** `on_route` em `DISPATCH_SERVICE_STARTED` → vermelho |
| **T-COMPOSICAO** — `createDefaultReferenceResolvers()` tem `hasActiveDispatchAtSite` (função) e, com `WorkOrderService` montado SEM o resolver, a troca a partir de qualquer estado é recusada (fail-closed) | idem (+ `-db` [modo]) | (b), (c) fail-closed | vermelho (a referência não existe) | **MT6** resolver ausente tratado como `false` → vermelho |
| **T-ALOCA** — ativar rascunho: `operator` e `field_technician` → 403 `dispatch_activation_requires_dispatcher`, OS intacta; `manager`/`field_dispatcher`/`tenant_admin` → 200 e OS atribuída | idem | P-ALOCA | `operator` 200 → vermelho (= A3) | **MT7** critério por papel restaurado → vermelho |
| **T-ATOMICA-MEM** — espião em `InMemoryWorkOrderRepository.prototype.createEvent`: nos caminhos create/reassign/ativação/web **0 chamadas** com `eventType = work_order_assigned`; a timeline da OS tem o evento (gravado dentro do método); a compensação segue (create sem despacho; reassign volta ao alvo; o teste "compensação" de hoje fica) | idem | P-ATOMICA (forma) | vermelho (hoje o serviço chama `createEvent`) | **MT8** evento de volta para fora da transação → espião acusa |
| **T-ATOMICA-DB** — gatilho temporário `BEFORE INSERT ON work_order_events FOR EACH ROW WHEN (NEW.event_type = «work_order_assigned» AND NEW.tenant_id = «tenant do teste») EXECUTE … RAISE EXCEPTION «O6R07CB1_INJ_EVENTO»`; via `FieldDispatchService` REAL (composição prisma com core stub, como a sonda da C3) create / reassign / ativação, e via `WorkOrderService.assign`: erro propaga; OS inalterada (status e `assigned_*`), 0 linha nova em `work_order_assignments`, 0 evento; despacho compensado (create: 0 despacho; reassign: alvo e status anteriores; ativação: `draft`). Controle 1: gatilho em `work_order_assignments` → mesmo resultado (já era atômico). Controle 2: sem gatilho → 1 OS + 1 linha + 1 evento. `DROP TRIGGER`/`DROP FUNCTION` no `finally`; `pg_trigger`/`pg_proc` = 0 ao fim. O gatilho é **escopado pelo `tenant_id` do teste** (a suíte da CI roda outros `-db` em paralelo no mesmo banco) | `tests/o6r07c-b-scope-db.test.ts` (substitui o caso [despacho], sanando a N1 da C3) | P-ATOMICA (no Postgres) | vermelho: OS atribuída sem despacho (= C3-A1) | **MT9** = o objeto do ciclo 1 (evento fora) — o próprio vermelho sem mutação; e `tx.workOrderEvent.create` movido para fora do `$transaction` → vermelho |
| **T-EVID-EXISTE** — `tenant_admin` e `manager` mandam `evidence.work_order_{photo,observation,signature}` com `work_order_id` inexistente → `rejected not_found`; de outra organização → `rejected not_found` (igual ao inexistente); com OS real → `accepted`; `field_technician` não atribuído → `rejected not_assigned_to_actor` (inalterado) | `tests/o6r07c-b-scope.test.ts` | (j), um critério só | `tenant_admin` `accepted` → vermelho | **MT10** `if (… && actorMutatesAssignedOnly)` restaurado → vermelho |
| **T14** — `assert.deepEqual(cl.gerado, INSTANTANEO)` (instantâneo regenerável) | `tests/o6r07c-census-guard.test.ts` | P-CENSO | vermelho: 3 diferenças (= C3-A2) | **MT11** 1 classe editada no fixture → vermelho |
| **ratchet SAN3-05** — as 2 chaves novas em `NOVAS` | `tests/san3-05-acessos-de-plataforma-guard.test.ts` | inventário de acessos consciente | T13 vermelho sem as chaves (o ratchet acusa o acesso novo) | remover 1 chave → vermelho |

**Ajustes nos testes de hoje (declarados, sem apagar):** o teste `D-07CB1-TRAVA-ATE-B2 — a partir de No local…` ganha a asserção "reatribuir à mesma pessoa deixa o despacho em `arrived`" (hoje aceita 200 e não olha o status); o caso `-db` [despacho] (`deleteById`/`restoreState` chamados direto) é substituído pelos casos de T-ATOMICA-DB (os mesmos métodos, exercitados pelo serviço com falha injetada); o teste "compensação" em memória continua (injeção em `assignFromDispatch` inteiro: ainda prova a compensação do despacho). Nenhum teste some: C3 compara nomes objeto × base.

**Mutantes equivalentes declarados:** remover UM pré-check (e) isolado (a chamada autoritativa em `assignFromDispatch` recusa igual; muda só o momento) — o dev registra; a cadeira não cobra vermelho dele.

### 2.5 Destino de cada ajuste e de cada nota

| item | destino | como |
|---|---|---|
| C1-A3 operator ativa rascunho | **corrigir no bloco** | (h) + T-ALOCA |
| C1-A3 devolução ao falhar/cancelar pelo operator | **declarado e aceito** (não é alocação: o alvo foi escolhido antes por quem aloca; o operator só encerra) | comentário no código em (g); a C1 do ciclo 2 julga; se discordar → pendência `P-07CB1-DEVOLUCAO-POR-OPERATOR` (dono `B-O6R-07c-b2`), não grave |
| C3-A2 instantâneo ≠ gerador | **corrigir no bloco** | (j) + `gravar` byte-idêntico + T14 |
| C2-K2 conclusão já aplicada volta como conflito após reinício | **pendência nomeada** `P-07CB1-K2-CONCLUSAO-APOS-REINICIO`, dono `B-O6R-07c-b2` | texto: "por estado, o escopo vem antes (D-07c-IDEMP) faz a conclusão já gravada pelo próprio ex-técnico voltar como conflito depois de reinício do processo; a run guarda `completedBy` (checklist.types.ts:125) — o b2 decide se «por estado COM autor = o próprio ator» vira `already_applied` ou se a saída é a decisão do superior; nada se perde nem duplica (C2, N=3)" |
| web `POST /assign` antes de No local deixa despacho ativo em outro técnico | **pendência nomeada** `P-07CB1-ATRIBUICAO-WEB-COM-DESPACHO-ATIVO`, dono `B-O6R-07c-b2` (ou `B-TECNICO-ESCOPO-a`) | pré-existente (o `assign` web nunca tocou despachos, 51238552); recomendação: a via web passa a reatribuir o despacho ativo (uma verdade só). Pergunta Q2 em §2.8 |
| V4b cancelar em No local e despachar outro | **pendência nomeada** `P-07CB1-CANCELAR-EM-NO-LOCAL`, dono `B-O6R-07c-b2` | pergunta Q1 em §2.8; não é troca, é encerramento + redistribuição |
| C3-N1 `-db` chama métodos direto | **corrigido** | T-ATOMICA-DB |
| C3-N2 corpo do PR desatualizado | **corrigido** | corpo do PR reescrito com o head do ciclo 2: migração `20260877`, "No local", números reexecutados |
| C3-N3 census-guard fora da lista | **sanado** | §2.3 o lista |
| instantâneo "só removendo entradas" | **sanado** | §2.3: reclassificar, nunca remover |
| dev R5 (ex-técnico só por despacho reatribuído antes do deploy; divergentes só como total no NOTICE) | **pendência** `P-07CB1-RESIDUAL-BACKFILL`, dono `B-O6R-07c-b2` | registrar; o backfill não muda |
| pré-existentes da §1.5 (C1-N1, C1-N2, C2 ×4) | **pendências com dono** (tabela da §1.5) | o orquestrador registra por APPEND em `controle/pendencias.md` antes da junta; a C3 do ciclo 2 confere |

### 2.6 Bateria de validação (exata; o dev registra comando → saída → veredito por passo no relatório)

**No worktree do dev (Windows; `npm ci` próprio sem junction; `DATABASE_URL=postgresql://x:y@127.0.0.1:1/nada npm run db:generate` antes do check):**
1. `npm run check` · `npm run lint` · `npm run build` (remover `dist/` depois) · `git diff --check` — ec 0.
2. `env -u DATABASE_URL -u REDIS_URL CORE_SAAS_PERSISTENCE=memory node --test --import tsx --test-reporter=tap tests/o6r07c-b-scope.test.ts` — publicar `# tests/pass/fail` (meta §2.10).
3. `env -u DATABASE_URL -u REDIS_URL node --test --import tsx tests/o6r07c-census-guard.test.ts` **sozinho** (sem `--test-concurrency`: o censo filho morre por memória em paralelo — relatório do dev D3 e C3 M25) — 32/32 (31 + T14).
4. `env -u DATABASE_URL -u REDIS_URL node --import tsx tests/helpers/o6r07c-census.ts gravar <tmp>/regen.json && cmp <tmp>/regen.json tests/fixtures/o6r07c-classificacao-vias.json` — ec 0, **N=2** execuções byte-idênticas entre si.
5. Regressão em memória (listar N): `tests/o6r07c-subresource-scope.test.ts`, `tests/o6r07a*.test.ts`, `tests/field-dispatch*.test.ts`, `tests/checklist-snapshot-dispatch*.test.ts`, `tests/multi-checklist*.test.ts`, `tests/mobile-backend-contracts.test.ts`, `tests/o6r07b-*.test.ts`, `tests/san3-05-acessos-de-plataforma-guard.test.ts` — fail 0.
6. Vermelho-controle sem mutação: `src/` do objeto `b198fe35` (checkout com `core.autocrlf=false`, `hash-object` = blob) + os testes do ciclo 2 → T-TRAVA ≥ 7 vias vermelhas, T-ALOCA vermelho, T-ATOMICA-MEM vermelho, T-EVID-EXISTE vermelho, T14 vermelho; restauro provado (`git status --porcelain` = 0; `hash-object` = blob do head).
7. Mutações MT1–MT11 (uma a uma, âncora única, restauro byte-idêntico), tabela no relatório.
**No container (≤ 3 trabalhos Docker na máquina, `D-BRACOS-E-DOCKER-17-10`; cluster PRÓPRIO, rede própria, sem porta publicada; a base viva `erp-postgres`/`erp-redis` nunca é alvo):**
8. `prisma migrate deploy` (109 migrações, a `20260877` por último) → `node --test --import tsx tests/o6r07c-b-scope-db.test.ts` — publicar N; gatilhos removidos ao fim (`pg_trigger` = 0).
9. `npm test` inteiro na forma do job `backend` (`CORE_SAAS_PERSISTENCE=memory`, Postgres + Redis próprios) — se o Docker da máquina derrubar (R8/R11 do ciclo 1), declarar e deixar a CI do PR responder; a junta exige os 14 check-runs **concluídos**.
**Depois do push:** `gh api repos/thiagodorgo/ERP_Techsolutios/commits/<head>/check-runs` = 14 concluídos; `node scripts/sync-agent-agents.mjs --check` após os corpos das cadeiras; `git diff --quiet b198fe35 <head> -- prisma Kpis mobile frontend .github src/app.ts package.json package-lock.json src/modules/core-saas/permissions/catalog.ts` ec 0. **Sem KPI** (`D-GOV-PROPORCIONAL` (5)). Limpeza §C5: cópia descartável removida, `dist/` e temporários apagados, nenhum container do dev vivo.

### 2.7 Riscos e rollback

| risco | mitigação | se não der |
|---|---|---|
| R1 — fail-closed do resolver ausente quebra testes que montam `WorkOrderService` à mão e trocam técnico | `createDefaultReferenceResolvers()` é a composição única (memória e prisma); o dev lista os arnês que usam `new WorkOrderService(repo, {...})` e injeta o resolver neles (classe (iii), declarada no relatório) | fallback declarado (pior): resolver ausente → só a máquina da OS conta + T-COMPOSICAO obrigatório; registrar a troca e o motivo |
| R2 — ciclo de importação `work-orders` ↔ `field-dispatch` | import **dinâmico** dentro do resolver (idioma de `resolveActorOperatorProfileId` e `hasProvisionedChecklistRun`); nunca import estático | — |
| R3 — gatilho do `-db` sob a suíte paralela da CI (mesmo banco) | `WHEN` por `tenant_id` do teste; `DROP` no `finally`; nome com prefixo `o6r07cb1_` | se a CI acusar outro `-db` → o teste roda em `describe` serial e declara |
| R4 — `tests/mobile-backend-contracts.test.ts` (3 casos com OS inexistente) | o arnês cria uma OS real para o `tenant_admin` | alternativa: esperar `rejected not_found` (classe (ii): comportamento muda por decisão de desenho, declarar) |
| R5 — no-op do reassign ao mesmo técnico muda contrato (`reason`/`observation` não gravados) | o app não emite reassign (C2); conferir `frontend/src/modules/operations/dispatches/**` — a tela só reatribui para trocar; declarar | se houver consumidor, gravar `reason` como evento do despacho sem mudar status |
| R6 — o `gravar` trazer diferença fora das 3 chaves (ambiente/portas) | N=2 byte-idênticos antes de commitar; o dev não edita o fixture à mão; divergência fora das 3 = PARA e reporta | — |
| R7 — grade de 120 células lenta | alvo < 60 s em memória; se exceder, 2 papéis (`manager`, `field_dispatcher`) e declarar | — |
| R8 — Docker da máquina derruba sob a suíte inteira (ciclo 1, R8/R11) | ≤ 3 trabalhos; `-db` isolado; suíte inteira pela CI | declarar; a CI é a fonte primária da régua (C3) |
| R9 — repetição da classe "via que escapa à trava" | a grade T-TRAVA cobre TODAS as vias que escrevem o técnico (varredor da C1: `repository.assign` e `repository.assignFromDispatch` são os únicos escritores; a C1 do ciclo 2 re-executa o varredor) | se aparecer via nova → é o sinal de não-convergência (§1.7) |

**Rollback:** o ciclo 2 é só código e testes — nenhuma migração, nenhuma escrita nova em produção (o PR ainda não mergeou). `git revert` dos commits do ciclo 2 devolve ao objeto `b198fe35`; o fixture, se regenerado byte-idêntico, não muda. A migração `20260877` continua com o rollback comentado no cabeçalho (ciclo 1).

### 2.8 Pedido de autorização ao dono e perguntas (nenhuma bloqueia o ciclo 2)

**`prisma/**` / `migrations/**`: NENHUM pedido novo.** O ciclo 2 não toca esquema nem migrações; a atomicidade é resolvida no repositório (uma `$transaction`). A `20260877000000_backfill_…` (P6, autorizada em `D-07CB-EMENDA-RECOMENDACOES`) fica intocada.

Perguntas, com recomendação, para o orquestrador levar ao dono (viram decisão por APPEND em `decisoes.md`; até a resposta valem as recomendações, declaradas como leitura do orquestrador):
- **Q1 (`P-07CB1-CANCELAR-EM-NO-LOCAL`):** cancelar ou falhar um despacho que está em No local — sem trocar técnico — também passa a exigir autorização do superior? *Recomendo NÃO no b1:* encerramento não é troca; é ato explícito e auditado do despachante (ou do próprio técnico, no `failed`); o b2 decide se o cancelamento em No local entra na mesma fila de autorização. No ciclo 2, a OS **não muda de técnico** por causa dele (g).
- **Q2 (`P-07CB1-ATRIBUICAO-WEB-COM-DESPACHO-ATIVO`):** a atribuição pela web/lote (`POST /assign`) de uma OS que tem despacho ativo em OUTRO técnico (antes de No local) deve reatribuir o despacho junto, ou ser recusada? *Recomendo:* no b2 (ou no `B-TECNICO-ESCOPO-a`) a via web passa a reatribuir o despacho ativo — uma verdade só entre despacho e OS. No ciclo 2 ela ganha a trava (a partir de No local) e nada mais.
- **Q3 (registro, não pergunta):** `evidence.work_order_*` passa a exigir OS existente nesta organização para TODOS os papéis (inexistente/alheia → `rejected not_found`) — é o "um critério só" da `D1-07c`. Se o dono discordar, (j) volta e o C3-A2 passa a ser resolvido pelo caminho (b) da §1.4 (classe `OS·SEM-ALCANCE` no fixture e no laço G) — pior, mas honesto.

### 2.9 Governança e mandatos sugeridos para as 3 cadeiras do ciclo 2 (≤ 3 itens cada)

Permissão → inspetor de terreno + **3 cadeiras, unanimidade com veto**, ciclo 2 (§C7 item 8(1)(2): o último em que `bloqueia` não grave reprova). Inspetor e cadeiras no **nível menor (Opus), declarado** em cada artefato (`D-TOPO-NO-PLANO-E-EM-TODA-REPROVACAO`); mandato forma A com pré-voo só para eles (`D-GOV-PROPORCIONAL` (3)); P1–P7 (voto-esqueleto, evidência incremental, ≤ 3 itens, ≤ 2 em paralelo, quedas em `00-quedas.md`). **Dev:** identidade NOVA em Opus, declarado, a partir deste plano — não é cadeira do ciclo 1, não é `dev-b-o6r-07c-b1-argon`/`-opus` (§1.6(b)). **Crítico:** `D-TOPO…` não exige crítico no replanejamento; se o orquestrador o convocar, nível menor e só leitura. **Inelegíveis por nome:** `jurado-07cb1-c1-argon`, `jurado-07cb1-c1-opus`, `jurado-07cb1-c2-opus` (e o ocupante Gemini da C2), `jurado-07cb1-c3-opus`, `inspetor-07cb1-opus`, `dev-b-o6r-07c-b1-argon`, `dev-b-o6r-07c-b1-opus`, `planejador-07cb1-ciclo2`, o dev do ciclo 2. A fábrica cria os 3 corpos com identidade nova; o orquestrador versiona nos dois espelhos (`git add -f`) **antes** do inspetor; `sync-agent-agents --check` ec 0.

| cadeira | identidade sugerida | mandato (3 itens) |
|---|---|---|
| **C1 · a trava por OS** | `jurado-07cb1c2-c1-trava-por-os` | (1) **Grade PRÓPRIA** no objeto: estados {d1 `arrived`, d1 `in_service`, OS `on_site`/`in_progress`/`paused`} × vias {reassign direto, X1, V2, V3, V4, V5, web `POST /assign`, lote `work_order.assign`} × papéis que alocam — 409 e estado intacto (V4/V5: OS fica); X1: o despacho segue `arrived` após o 1º passo; controle positivo em `on_route`; N e forma declarados; o varredor de escritores (`repository.assign`/`assignFromDispatch`) re-executado — nenhum escritor fora do gate. (2) **Vermelho-controle:** a grade contra o `src/` de `b198fe35` (A1/A2 reaparecem) e MT1–MT5 (restauro provado por `hash-object`). (3) **A3 e o declarado:** ativar rascunho por `operator`/`field_technician` → 403, por quem despacha → 200; a devolução pelo operator (declarada em (g)) e o residual V4b — julgar; se discordar, pendência nomeada, não `bloqueia` (não grave) |
| **C2 · atomicidade e evidência** | `jurado-07cb1c2-c2-atomicidade-e-evidencia` | (1) **Postgres próprio** (cluster descartável, rede própria, sem porta; 2º/3º trabalho Docker contado antes): T-ATOMICA-DB com gatilho escopado por `tenant_id` nos 4 caminhos (create, reassign, ativação, web); controle do gatilho na linha; sem gatilho grava 1+1+1; `pg_trigger`/`pg_proc` = 0 ao fim; o `-db` novo contra o `src/` de `b198fe35` **vermelho** (OS atribuída sem despacho). (2) **Memória:** espião em `createEvent` (0 chamadas para `work_order_assigned` nos 4 caminhos; timeline com o evento); compensação intacta; ratchet SAN3-05 com as 2 chaves novas e motivo; `withTenantRls` segue envolvendo a chamada (GUC antes). (3) **Evidência e D2:** `evidence.work_order_*` para `tenant_admin`/`manager` com OS inexistente e alheia → `rejected not_found`, com OS real → `accepted`; amostra do item 1 da C2 do ciclo 1 re-executada (ex-técnico → `conflicts[]` nas 4 famílias; nunca-técnico → `rejected`; upload 409 pela OS do recibo) — o ciclo 2 não regrediu a D2 |
| **C3 · censo, regressão, escopo e registro** | `jurado-07cb1c2-c3-censo-regressao-escopo` | (1) **Censo:** `gravar` N=2 byte-idêntico ao fixture (`cmp` ec 0); T14 verde no objeto e **vermelho** contra `b198fe35` (3 diferenças); MT11; T11 segue vazio; M25 do ciclo 1 ainda só o T11. (2) **Régua:** CI do objeto (`backend`, `backend-postgres`) × base `4fe7524e`: fail 0; nomes de teste objeto × ciclo 1 × base — nenhum some (renomes declarados); `npm run check/lint/build` ec 0; `-db` executado com banco no job `backend`. (3) **Escopo e registro:** diff ⊆ PERMITIDO §2.3 (classificador com controle), PROIBIDO vazio (`git diff --quiet b198fe35 <obj> -- prisma Kpis mobile frontend .github src/app.ts package.json package-lock.json catalog.ts` ec 0), `sync-agent-agents --check`; relatório do dev e ESTE arquivo no objeto; corpo do PR com números do head; ata do ciclo 2 nomeando os 3 papéis e as 3 perguntas; pendências de §2.5 e as de §1.5 registradas por APPEND; decisões Q1–Q3 registradas (como leitura do orquestrador até o dono responder) — **sem KPI** |

**O que o inspetor confere (fail-closed, §C7.1-bis):** objeto = SHA com 14 check-runs **concluídos**; os 3 corpos commitados nos dois espelhos com md5 EOL-neutro publicado e igual ao carregado; mandatos forma A com pré-voo OK e caminhos reais; inelegibilidade **por nome** contra a lista acima; worktree próprio por cadeira em caminho curto, `npm ci` próprio, cluster descartável só para a C2; S0 (`sync-agent-agents --check`); baseline honesto (`npm ci`, `db:generate` fictício, `check`); **este arquivo e o relatório do dev do ciclo 2 presentes no objeto**; a ata do ciclo 1 marcada "a re-verificar" nos corpos (nenhum número herdado como fato); `src/**` do objeto ≠ `b198fe35` só nos 6 arquivos de código do §2.3; nenhuma ferramenta no worktree do dev; disco ≥ 10 GB antes de cada cadeira; ≤ 2 cadeiras em paralelo; resíduo desta auditoria removido (`git worktree list` sem `w-plan07cb1`); plano de perda de jurado (P3: sucessor com identidade nova re-executa a evidência do caído).

### 2.10 Baseline N e meta M ≥ 2N

- **N (testes do bloco, medidos aqui e pela C3):** `tests/o6r07c-b-scope.test.ts` **41** (memória, 41/41 neste worktree) + `tests/o6r07c-b-scope-db.test.ts` **7** (C3, no cluster dela) = **N = 48**. **Meta: M ≥ 96.** Previsto: 48 + T-TRAVA 120 + controle positivo 8 + T-COMPOSICAO 2 + T-ALOCA 3 + T-ATOMICA-MEM 4 + T-ATOMICA-DB 6 + T-EVID-EXISTE 4 + T14 1 ≈ **196** (contagem por subteste no TAP; o dev publica a real).
- **Suíte (régua da C3, CI do objeto do ciclo 1):** `backend` 3399/3397/0/2 (push) e 3409/3407/0/2 (PR); `backend-postgres` 339/339. O ciclo 2 mantém fail 0 e **nenhum nome de teste some** (os 2 skips `RBAC_DB_PARITY` são pré-existentes, iguais na base).
- **Tamanho:** M (um dev, 1–2 dias): 6 arquivos de código, ~250 linhas de produto, ~400 de teste.

### 2.11 Registro que o ciclo 2 deixa (orquestrador; APPEND, nunca reescrita)

- `agent-orchestration/omega/reprovacoes/R-B-O6R-07c-b1-1.md` (a reprovação do ciclo 1, apontando a ata e este arquivo) e, ao fim, `omega/juntas/J-B-O6R-07c-b1-ciclo2.md` nomeando quem achou (C1/C3 do ciclo 1), quem planejou (`planejador-07cb1-ciclo2`, Fable) e quem desenvolveu (dev novo, Opus), e as três perguntas respondidas.
- `controle/decisoes.md`: `D-07CB1-CICLO2-TRAVA-POR-OS` (a propriedade P-TRAVA como leitura do orquestrador até o dono confirmar), `D-07CB1-CICLO2-EVIDENCIA-OS-EXISTE` (Q3), e as respostas a Q1/Q2 quando vierem.
- `controle/pendencias.md`: as pendências nomeadas de §2.5 e §1.5, cada uma com dono e evidência de data.
- Este arquivo, copiado para `docs/revisoes/SAN3/B-O6R-07c-b1-ciclo2-auditoria-e-plano.md` no PR do ciclo 2 (é insumo do inspetor e das cadeiras).

### Limpeza desta auditoria
Worktree `C:/Users/AMP/w-plan07cb1` removido por `git worktree remove --force`; `regen.json`, as sondas e os logs ficam só na subpasta `plan07cb1/` do scratchpad da sessão (efêmera). Nada foi escrito no repositório nem nos worktrees de terceiros; nenhum container criado; base viva intocada.
