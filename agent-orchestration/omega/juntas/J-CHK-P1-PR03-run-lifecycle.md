# J-CHK-P1-PR03 — Ciclo de vida da vistoria e reabertura versionada

- **Bloco:** CHECKLIST P1 PR-03 (`D-CHK-P1-RUN-LIFECYCLE`, `D-CHK-P1-REOPEN-RBAC`)
- **Branch:** `feat/chk-p1-pr03-run-lifecycle`
- **Data:** 2026-08-08 → 2026-08-10
- **Composição (5, §C7.1):** `planejador-mestre` · `critico-adversarial` · `agente-dba-guardiao` ·
  `coordenador-de-acessos` · `validador-mestre`
- **Veredito:** **APROVADO_CONDICIONADO** → condições cumpridas nesta entrega (abaixo, uma a uma).

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
| 1 | check-then-act sem trava: entre "li que está concluída" e "criei a versão", outra transação podia **cancelar** a vistoria (o índice parcial único só barra reabertura dupla) | `SELECT ... FOR UPDATE` na linha, dentro da mesma transação RLS |
| 2 | reabrir vistoria de **modelo arquivado** criava versão em limbo (o app de campo só lista modelo publicado) | recusa 409 `checklist_template_archived`, com caminho de saída; paridade nos dois repositórios |
| 3 | `pending_acknowledgement` por porta dos fundos | coberto pela allowlist (ALTA 2) |
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

## Bateria (execução real)

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
