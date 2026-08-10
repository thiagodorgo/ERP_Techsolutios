# J-CHK-P1-PR03 — Ciclo de vida da vistoria e reabertura versionada

- **Bloco:** CHECKLIST P1 PR-03 (`D-CHK-P1-RUN-LIFECYCLE`, `D-CHK-P1-REOPEN-RBAC`)
- **Branch:** `feat/chk-p1-pr03-run-lifecycle`
- **Data:** 2026-08-08 → 2026-08-10
- **Composição (5, §C7.1):** `planejador-mestre` · `critico-adversarial` · `agente-dba-guardiao` ·
  `coordenador-de-acessos` · `validador-mestre`
- **Veredito da 1ª rodada:** **APROVADO_CONDICIONADO** → condições cumpridas (abaixo, uma a uma).
- **Veredito da 2ª rodada (2026-08-10):** **REPROVADO** pelo `critico-adversarial` ·
  **APROVADO_CONDICIONADO** pelo `agente-dba-guardiao` → **PR reprovado**, correções em curso
  (§"2ª rodada" no fim desta ata).

---

## O que o bloco entrega

A decisão do dono — *"responder a qualquer momento"* — foi lida como **trava ao concluir/assinar**: enquanto a
OS está viva o guincheiro preenche à vontade; ao **concluir**, a vistoria vira **prova jurídica do estado do
veículo** e fica imutável. Corrigir depois não é editar: é **reabrir**, o que cria uma **nova versão vinculada**
(`reopened_from_run_id` + motivo obrigatório) preservando a original.

Reabrir ganhou permissão **própria** (`checklist_runs:reopen`) em vez de reusar `checklist_runs:update` — quem
executou a vistoria em campo não destrava a própria assinatura (mesma disciplina de `financial_period:reopen`).

---

## Achados ALTA (todos fechados)

### 1. Cobrança DOBRADA na reabertura — `critico-adversarial`

`checklist_run.completed` **é métrica faturada** (`cloud-usage.events.ts` + `basisMetricKeys` do rateio). Concluir
a versão reaberta emitia o evento outra vez: **a organização pagaria de novo por corrigir um erro**. A premissa
original do dev — e o elogio do orquestrador a ela — **estavam errados**; a verificação por `grep` nas duas
superfícies de cobrança confirmou o crítico.

**Fechado:** a conclusão carimba `isReopenedRun`/`reopenedFromRunId` no evento e o consumidor registra
**quantidade 0** com `idempotencyKey` distinta. A operação continua auditável; só não é cobrada duas vezes.

### 2. O buraco do PATCH estava meio fechado — `critico-adversarial`

A guarda era **blocklist** (barrava só as duas conclusões) e deixava duas portas abertas:

- rebaixar `pending_acknowledgement` → `in_progress` **apagava a divergência** da prova — exatamente o que
  protege a organização numa disputa sobre o veículo;
- carimbar `pending_acknowledgement` num rascunho comum alcançava um estado de espera **sem divergência
  nenhuma por trás**.

**Fechado:** virou **allowlist** (`assertChecklistRunStatusTransition` aceita apenas `undefined` e `cancelled`);
toda outra transição pertence à ação de domínio correspondente. Provado por teste **e por mutação** (restaurar a
blocklist derruba a suíte).

### 3. Vazamento §2.8 na reabertura — `coordenador-de-acessos`

Erro inesperado do Prisma subia **cru** até a resposta HTTP: caminho absoluto do servidor, trecho do código
gerado e nomes de coluna internas (inclusive `tenant_id`).

**Fechado:** o detalhe fica no log do servidor; o cliente recebe `CHECKLIST_RUN_REOPEN_FAILED` em linguagem de
negócio. O teste contra o Postgres afirma que a resposta de conflito **não contém** `tenant_id`.

---

## Achados MÉDIA fechados

| # | Achado | Correção |
|---|---|---|
| 1 | check-then-act sem trava: entre "li que está concluída" e "criei a versão", outra transação podia **cancelar** a vistoria (o índice único — não-parcial; NULLs são distintos — só barra reabertura dupla) | `SELECT ... FOR UPDATE` na linha, dentro da mesma transação RLS |
| 2 | reabrir vistoria de **modelo arquivado** criava versão em limbo (o app de campo só lista modelo publicado) | recusa 409 `checklist_template_archived`, com caminho de saída; paridade nos dois repositórios |
| 3 | `pending_acknowledgement` por porta dos fundos | **este registro estava ERRADO** — ver §"Correção de registro" abaixo |
| 4 | o **dossiê do veículo** mostrava a versão SUBSTITUÍDA como se fosse a vigente (o vínculo aponta para a original) | `supersededByRunId`/`reopenedFromRunId` no resumo do dossiê; histórico preservado, verdade dita |

---

## Achado SISTÊMICO (unânime) — permissão nova nasce morta em produção

Em `CORE_SAAS_PERSISTENCE=prisma` (o modo real) o gate resolve permissões da **tabela** `role_permissions`
(`PersistentAuthorizationService`). O catálogo em código só chega ao banco por `prisma/seed.ts`, e
`deploy-production.yml` roda **apenas** `prisma migrate deploy` ("SEM db:seed — produção NUNCA semeia").

Consequência: **toda permissão nova adicionada só ao código nasce morta em produção** — a rota responde 403 para
todos os papéis, inclusive `tenant_admin`. Agravante: o corpo do **login** anuncia a permissão (vem do catálogo)
enquanto o middleware não a tem (vem do banco) — a interface habilita o botão e a API recusa.

Aconteceu com `checklist_runs:reopen` neste PR. E, ao escrever o guard, apareceu um segundo caso **já em produção**:
`field_technician` estava **sem nenhuma permissão de checklist** no banco — `GET /mobile/checklists/available`
respondia 403 para o técnico de campo.

**Fechado:** duas migrações de dados idempotentes (`20260861000000`, `20260862000000`) + guard permanente
`tests/permission-catalog-db-parity.test.ts`. Verificado ao vivo: 403 → **200** para `tecnico.demo`.

---

## Por que os testes verdes não pegavam nada disso

Toda a suíte de rota roda em `CORE_SAAS_PERSISTENCE=memory`: o gate lê o catálogo **em código** e o repositório é
um `Map`. Divergência entre o que o código declara e o que o **banco** aceita passa verde. Foram **três bugs
graves da mesma família em dois dias**:

1. `#341` — o CHECK do banco só aceitava 7 tipos de componente enquanto o código tinha 10 (o recurso do `#330`
   nunca funcionou no modo real);
2. `checklist_runs:reopen` morta em produção;
3. `field_technician` sem grant de checklist na tabela.

**Fechado (autorização explícita do dono):** job novo **`backend-postgres`** no CI — banco **provisionado**
(`migrate deploy` + `db:seed`, como um ambiente de verdade) e um subconjunto curado de suítes rodando em
`prisma`, batendo no Postgres **por HTTP**. Com **guard anti-verde-cego**: essas suítes auto-pulam sem banco, e
qualquer teste pulado **derruba o job**. O `docker` passou a depender dele.

Arquivo novo `tests/checklist-routes-db.test.ts` sobe o app **real** sobre o Postgres com `PrismaCoreSaasService`
e JWT assinado, exercendo: os 10 tipos sobrevivendo ao banco · o gate de reabrir lendo a **tabela** (403 para o
papel sem grant, 201 para o com) · reabertura preservando a original e recusando a segunda · allowlist do PATCH ·
modelo arquivado.

---

## Divergência consciente da recomendação da junta

- **`client_run_key` NÃO é transferido** para a versão reaberta (a junta sugeriu transferir). É a chave de
  idempotência de **uma criação** vinda do aplicativo: transferi-la faria um replay da criação original devolver
  a versão NOVA, e ainda colidiria com `@@unique([tenant_id, client_run_key])` enquanto a original existisse.
  Fica `NULL`, documentado no código.

## Achado colateral corrigido (fora do escopo original)

O teardown de `checklist-run-create-concurrency-db.test.ts` falhava contra o Postgres com o cloud-usage ativo: o
registro de consumo é **best-effort e fire-and-forget** e podia aterrissar **depois** da limpeza, fazendo a
exclusão do tenant bater na FK `cloud_usage_events_tenant_id_fkey`. Falha **pré-existente** (reproduzida com as
mudanças deste PR revertidas). Varredura final fora da transação RLS + uma repetição.

---

---

# 2ª rodada da junta (2026-08-10)

| Agente | Veredito |
|---|---|
| `critico-adversarial` | **REPROVADO** |
| `agente-dba-guardiao` | **APROVADO_CONDICIONADO** |
| `coordenador-de-acessos` | **APROVADO_CONDICIONADO** (auditoria com login real dos 9 papéis num banco isolado) |

## Correção de registro (§A2) — a MÉDIA #3 estava consolidada como uma crença FALSA

A tabela de MÉDIA acima registrava o item #3 (`pending_acknowledgement` por porta dos fundos) como
*"coberto pela allowlist (ALTA 2)"*. **Não estava.** O §A2 proíbe consolidar em silêncio, então o registro
fica aqui, inteiro:

- **O que a allowlist realmente cobria:** só a **transição de STATUS** pelo PATCH. `assertChecklistRunStatusTransition`
  impede *chegar* a `pending_acknowledgement` por edição de rascunho — e nada além disso.
- **O que continuava aberto:** o **CONTEÚDO** da vistoria já em `pending_acknowledgement`. Respostas,
  marcadores de avaria, observações e anexos passavam livres, porque a única trava de escrita
  (`assertChecklistRunMutable`) barra apenas estado **terminal**, e `pending_acknowledgement` não é terminal.
  Consequência real: o **próprio guincheiro** — que tem `checklist_runs:update` e **não** tem
  `checklist_runs:reopen` — reescrevia a resposta e acrescentava marcador **depois de concluir e assinar**,
  sem versão nova, sem motivo registrado e sem trilha de reabertura. Justamente o caminho da **avaria
  contestada**, o mais sensível juridicamente.
- **Como isso passou batido:** o teste que "provava" a cobertura olhava o **STATUS** (a transição recusada) e
  nunca o **CONTEÚDO** (a resposta gravada depois da assinatura). Verde legítimo sobre a pergunta errada. Na
  2ª rodada o `critico-adversarial` **provou por EXECUÇÃO**, não por leitura: rodou a escrita e ela foi aceita.
- **Como foi fechado:** travas **separadas** em `src/modules/checklists/checklist.run-lifecycle.ts` —
  `assertChecklistRunFieldWritable` congela o conteúdo em `pending_acknowledgement`, enquanto a **ciência**
  continua passando (é ela que fecha o ciclo, levando a run a `completed_with_divergence`), com
  `assertChecklistRunCompletionTarget` distinguindo esse salto legítimo de um `completeRun` repetido. E
  `pending_acknowledgement` **virou reabrível**: com o conteúdo congelado, sem isso a vistoria ficaria sem
  saída nenhuma — não edita e não reabre.

**Lição registrada:** teste que afirma cobertura precisa exercer o **efeito** (o dado gravado), não o
**rótulo** (o status recusado). E ata não recebe "coberto por X" sem que alguém tenha executado o ataque.

## Achados da 2ª rodada e destino

| Severidade | Achado | Destino |
|---|---|---|
| **ALTA** (`critico-adversarial`, provado por execução) | conteúdo de vistoria **pós-assinatura** editável em `pending_acknowledgement` (MÉDIA #3 mal registrada) | **CORRIGIDO** — trava dupla + `pending_acknowledgement` reabrível (acima) |
| **BAIXA / A1** | dossiê do veículo resolvia a substituição em **um salto só**: com v1→v2→v3 apontava a v2, já substituída, enquanto a vigente era a v3 | **CORRIGIDO no backend** — cadeia percorrida até o fim + campo `currentRunId`; paridade memória/Prisma; teste de 3 versões e de ciclo. **UI em aberto** (`P-CHK-DOSSIE-VERSAO-NA-UI`): a aba do dossiê ainda não consome os 3 campos |
| **BAIXA / A1** | consulta de substituições rodava **com lista vazia** (`in: []` → `1=0` no Prisma): round-trip desperdiçado em todo dossiê sem checklist | **CORRIGIDO** — retorno cedo; teste conta as consultas e exige zero |
| **BAIXA / A1** | comentário em `checklist.run-lifecycle.ts` chamava de "índice parcial único" o que **não é parcial** (medido: `indpred` é NULL) — o que trava a reabertura dupla é o NULL ser **distinto** em índice único no Postgres | **CORRIGIDO** — só o comentário; nenhuma lógica tocada |
| — | esta ata registrava a MÉDIA #3 como coberta (crença falsa) | **CORRIGIDO** — §"Correção de registro" acima (§A2) |

**Atribuição:** a ALTA é do `critico-adversarial`, provada por execução. Os três itens menores chegaram às
frentes de correção como "BAIXA do `critico-adversarial` e A1 do `agente-dba-guardiao`" **sem o desmembramento
item a item** — ficam registrados em conjunto para não inventar autoria (§A6: fato ≠ hipótese).

## Demais achados da 2ª rodada (todos com destino)

| Origem | Achado | Destino |
|---|---|---|
| `agente-dba-guardiao` **B1 (ALTA)** + `coordenador-de-acessos` M2 | as migrações de grant (`20260861`/`20260862`) fazem `INSERT ... SELECT FROM roles` — em base NOVA (`roles` vazia) viram **no-op silencioso**, ficam marcadas como aplicadas e **nunca mais rodam**; o bug ressuscitaria na primeira base de produção limpa | **CORRIGIDO** — provisionamento CONVERGENTE (`npm run db:provision-rbac`, idempotente, roda no deploy DEPOIS do migrate; `scripts/provision-rbac.ts` + passo em `deploy-production.yml` + drill `scripts/rbac-provision-drill.sh` provando reprodução do bug, convergência, idempotência, isolamento do papel de organização e zero dado de demonstração) |
| `coordenador-de-acessos` **A1 (ALTA, provado por HTTP 201)** | o guard de paridade era **unidirecional**: grant fora de banda no banco (ex.: Suporte com `checklist_runs:reopen`) passava verde — e o papel reabria prova jurídica de verdade | **CORRIGIDO** — direção banco→catálogo no guard; provado por mutação (remover o laço deixa a deriva real de dev passar) |
| `coordenador-de-acessos` **A2 (ALTA)** | papel do catálogo **ausente** no banco era filtrado da asserção — o cenário em que a `20260862` não faz nada ficava invisível | **CORRIGIDO** — papel global ausente reprova; `platform_admin` é a única isenção, comentada |
| `critico-adversarial` ALTA-2/ALTA-3 | o guard era **tautológico** no job semeado (compara o catálogo com uma tabela escrita a partir dele) e a sentinela `roles`-vazia era **poluível** pelos testes paralelos (vermelho intermitente em PR alheio) | **CORRIGIDO** — guard ESTÁTICO novo (`tests/permission-catalog-migration-parity.test.ts`: toda chave nova exige migração; fronteira histórica de 189 chaves CONGELADA — só encolhe) + gate explícito `RBAC_DB_PARITY=1` só no job `backend-postgres` |
| `critico-adversarial` ALTA-4 | a correção da **cobrança dobrada** não tinha teste — invariante financeira pendurada num booleano que um refactor apaga em silêncio | **CORRIGIDO** — `tests/cloud-usage-checklist-reopen.test.ts` (4 testes: quantidade 0, payload legado conta 1, produtor carimba, chave `:reopened`); provado por 4 mutações, inclusive no PRODUTOR |
| verificador da frente mobile (**BLOQUEANTE §2.8, provado por sonda**) | a redação do conflito cobria só o `rejected_content` — a assinatura em **base64 voltava inteira** por `conflict.local.payload.value` | **CORRIGIDO** — redação em `sanitizeActionForConflict` (nunca em `normalizePayload`, que alimenta o fingerprint de idempotência) + teto nos campos de texto vizinhos + asserção sobre o conflito INTEIRO; provado por mutação |
| `critico-adversarial` MÉDIA-5 | o sync devolvia `next_action` de retry para condição **permanente** (`checklist_run_locked`) — ação reciclando na fila para sempre; a foto da avaria ficava sem entrada | **CORRIGIDO** — orientação terminal `stop_retrying_and_request_run_reopen` + `rejected_content` com o que não entrou; lado retriável também coberto por teste (mutação A2) |
| `critico-adversarial` MÉDIA-6 + `agente-dba-guardiao` D2 | `console.error` despejava o erro cru no stdout (fora do logger, ignorando LOG_LEVEL) e a sanitização cobria 1 statement de 6 — P2028/40001 vazavam caminho absoluto como HTTP 400 | **CORRIGIDO** — método inteiro protegido, recusas de negócio preservadas, transitório (503) separado de determinístico (500), logger estruturado; caso P2010+meta.code coberto por teste |
| `coordenador-de-acessos` M3 | as migrações de grant não filtravam `tenant_id IS NULL` — numa instalação com papel de organização homônimo, alargariam papel do cliente | **MITIGADO com registro** — migração aplicada é imutável; exposição analisada (base nova roda os grants antes de existir organização); a retirada `20260863` e o provisionamento já filtram; padrão registrado no cabeçalho da `20260863` |
| `coordenador-de-acessos` B2 | a linha nova da `RBAC_MATRIX.md` tinha **3 afirmações falsas** (status `superseded` inexistente; `checklist_runs:cancel` inexistente; "índice parcial") | **CORRIGIDO** — linha reescrita contra o estado medido do banco |
| `coordenador-de-acessos` M6 | com o grant reconciliado, `field_technician` lê por id qualquer vistoria da organização (escopo é a organização, não o autor) | **REGISTRADO na RBAC_MATRIX** — é o que o catálogo declara; restringir por propriedade = mudança de escopo (pendência) |
| verificador da frente do dossiê | o espelho do frontend (`processes.types.ts`) ficou defasado **por causa deste PR** (3 campos novos do DTO não consumidos) — a aba do dossiê ainda não marca "versão substituída" | **PENDÊNCIA REGISTRADA** — `P-CHK-DOSSIE-VERSAO-NA-UI` em `controle/pendencias.md`; backend diz a verdade, a UI consome no PR-05 (histórico) |
| deriva pega pelo guard novo | `manager`/`technician` globais com `checklist_runs:create` no banco que a decisão D-CHK-DISPATCH-CREATE (#320) retirou do catálogo — faltou o DELETE | **CORRIGIDO** — migração de retirada `20260863000000` (escopada a `tenant_id IS NULL`); o guard bidirecional volta verde |

**Escopo deste registro:** ele cobre os achados que chegaram documentados às frentes de correção desta rodada.
Se a 2ª rodada levantou mais itens, o destino deles **está em andamento** e entra aqui quando a frente
correspondente fechar — nenhum achado é dado como resolvido sem prova.

**Bateria da 2ª rodada:** cada frente de correção reporta a sua (as correções rodaram **em paralelo** no mesmo
repositório). A consolidação vale quando todas fecharem; a tabela abaixo é da **1ª rodada**.

---

## Bateria da 1ª rodada (execução real)

| Gate | Resultado |
|---|---|
| `npm run check` / `npm run lint` | verde |
| Suíte backend completa | **2135/2141** (0 falhas, 6 pulos DB-gated de sempre) |
| Subconjunto contra o Postgres (o do CI novo) | **21/21, 0 pulos** |
| `npm --prefix frontend run check` | verde |
| `npm --prefix frontend run test:smoke` | **1112/1112** |
| Guard do painel de KPI | 6/6 |
| Mutação: allowlist → blocklist | suíte **REPROVA** (1 falha) ✔ |
| Mutação: guarda de modelo arquivado removida | suíte **REPROVA** (1 falha) ✔ |

## Rastreabilidade

- Decisões: `D-CHK-P1-RUN-LIFECYCLE`, `D-CHK-P1-REOPEN-RBAC` (`controle/decisoes.md`)
- Pendências abertas/atualizadas: `P-SUITE-ENV-PERSISTENCE`, `P-JUNTA-LIMPEZA-BASE-VIVA`
- KPIs: `Kpis/kpis-latest.json` + `kpis-history.json` (versão `CHK-P1-PR-03`), `pr`/`merge_commit`/
  `approved_head` **null na autoria** (backfill pós-merge, §C3.5)
