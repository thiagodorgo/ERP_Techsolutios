# J-OMEGA-VID — Identidade unificada de veículo de terceiro (dossiê guincho→custódia→desfecho)

> Ledger de execução da rodada **Ω-VID**. Espelha o formato de `docs/juntas/J-OMEGA5P.md`.
> Decisão de arquitetura registrada em `agent-orchestration/controle/decisoes.md` — **D-Ω-VID-01**
> (estende, não revoga, `D-Ω5P-09`/`D-Ω5P-RECON-A`).

## 1. Objetivo

Hoje o checklist de coleta do guincho (mobile, módulo `checklists`) e o dossiê de custódia
do pátio (módulo `impound`/Ω5P) são sistemas paralelos e desconectados. O dono do produto
pediu um **dossiê por veículo** que agregue os dois ao longo do tempo (um veículo pode ter
múltiplas remoções), navegável por um **modal grande com abas** aberto ao clicar no veículo
numa vaga ocupada, com ação de imprimir/salvar.

## 2. Decisão de arquitetura (Opção 2 — "Veículo como entidade de 1ª classe", feita corretamente)

Nova entidade **`ThirdPartyVehicleIdentity`**, DISTINTA da `Vehicle` da frota própria do
tenant (que continua com `plate NOT NULL @unique`, sem relação com pátios — D-Ω5P-09
preservado). Ponto de agregação: 1 identidade → N `ImpoundProcess` ao longo do tempo → N
`ChecklistRun` vinculados. Reconciliação sempre manual e auditada (nunca merge automático).

Plano completo, com evidência arquivo:linha do estado real do código, revisado
adversarialmente por 3 agentes (`critico-adversarial`, `agente-dba-guardiao`,
`coordenador-de-acessos`) em 2026-07-30 — achados incorporados ao plano final, ver §3.

## 3. Achados da junta de arquitetura (2026-07-30) — todos incorporados ao plano

- **critico-adversarial (BLOQUEADO → incorporado):** FK dura obrigatória em
  `ImpoundProcessChecklistLink.checklist_run_id` (o plano original a omitia "para
  preservar polimorfismo", mas o vínculo não é polimórfico — quebrava o próprio padrão do
  repo); identidade deve ser resolvida **na criação do processo**, não só por
  backfill+sweep assíncrono (corrida real de janela órfã); banner de duplicata na UI
  vira requisito do PR-04, não pergunta em aberto; rota `unmerge-admin` auditada em vez
  de "correção via SQL de suporte" (inaceitável num domínio com hash-chain de custódia);
  deep-link via query string `?dossie=` obrigatório no PR do modal.
- **agente-dba-guardiao (ajuste, não veto):** CHECK de enum para `confidence`
  (3 valores fechados) e `link_source` (2 valores) — o padrão real da casa usa CHECK para
  domínios pequenos/estáveis, sem CHECK só para FSMs grandes/evolutivas; nome de função
  de trigger por tabela; comentário explícito justificando o índice parcial não-único;
  backfill em UPDATE único por lote com `WHERE identity_id IS NULL`, sequencial por
  tenant; 11 cenários de prova viva (Postgres real, tx-ROLLBACK) exigidos antes de
  qualquer PR de schema ser aprovado.
- **coordenador-de-acessos (ajuste, não veto):** `vehicle_identity:merge` dedicada,
  distribuída só a `tenant_admin`/`manager`/`super_admin`/`platform_admin` (mesmo padrão
  de `release:approve`/`auction:appraise`) — **aprovado como estava**. Achado real: a aba
  "Checklist do Guincho" vazaria dado hoje escondido de `field_technician` (tem
  `impound:read` mas não `checklist_runs:read`) se usasse só `impound:read` como guarda —
  corrigido para exigir as DUAS permissões. Link→Modal só aprovado condicionado à
  sincronização de `?dossie=` (o app já usa `useSearchParams` em outros lugares — não é
  padrão novo).

## 4. Decisão de produto (dono, 2026-07-30)

- E-mail/WhatsApp de compartilhamento: **fora de escopo por enquanto**. Imprimir/Salvar:
  **dentro do escopo** (sem serviço externo pago — `window.print()` + CSS de impressão).
- Web configura o checklist e **só visualiza** o preenchido — nunca preenche (isso é
  exclusivo do guincheiro, no mobile).
- Backfill: quando achar dois processos "não identificados" com forte indício de serem o
  mesmo veículo (mesmo pátio, datas próximas, marca/modelo/cor batendo), **oferece** a
  sugestão no relatório de revisão humana — nunca decide/mescla sozinho.

## 5. Fila de PRs

| PR | Escopo | Junta obrigatória? |
|---|---|---|
| PR-00 | Recon — confirma achados do plano no código real na hora de codar | Não (bloqueia PR-01 se achar divergência) |
| PR-01 | Fix do elo quebrado Checklist↔WorkOrder (`workOrderId` descartado pelo Zod) | **Sim** |
| PR-02 | Schema `ThirdPartyVehicleIdentity` + `MergeEvent` + `ImpoundProcess.identity_id` (migração aditiva, com os ajustes do dba-guardião) | **Sim** |
| PR-03 | Script de backfill + relatório de ambíguos/sugestões | **Sim** |
| PR-04 | Merge manual + `unmerge-admin` + `ImpoundProcessChecklistLink` (com FK dura) + banner de duplicata | **Sim** |
| PR-05 | Resolução de identidade na criação do processo (sweep) + vínculo automático de checklist | **Sim** |
| PR-06 | `Modal` ganha variante `size="lg"` no design system | Não obrigatória |
| PR-07 | `VehicleDossieModal` (abas reaproveitando componentes existentes) + clique-na-vaga + `?dossie=` | Não obrigatória |
| PR-08 | Aba "Checklist do Guincho" (guarda dupla `impound:read`+`checklist_runs:read`) | Não obrigatória |
| PR-09 | Aba "Histórico de Custódias" | Não obrigatória |
| PR-10 | Imprimir/Salvar via `window.print()` + CSS de impressão | Não obrigatória |
| PR-11 (opcional) | PDF real (`@react-pdf/renderer`) — dependência nova | **Sim, junta unânime de 5 (§C7 CLAUDE.md)** |

## 6. Registro de execução

### PR-01 — fix do elo Checklist↔WorkOrder — VOTOS DA JUNTA (2026-07-31) — APROVADO 2/2

> `checklist.validator.ts` (`parseCreateChecklistRunDto`) passa a aceitar `workOrderId`
> (que o Flutter já envia, mas o Zod descartava silenciosamente) e deriva
> `relatedEntityType='work_order'`+`relatedEntityId` quando os campos explícitos não vêm —
> explícitos sempre vencem. Zero mudança em `checklist.service.ts`/repositórios (já liam/
> escreviam `relatedEntityType`/`relatedEntityId` corretamente).

- **crítico-adversarial** → **APROVADO**. 5 vetores atacados, todos resistiram: contrato
  retroativo (nenhum caller real envia os dois juntos hoje); falta de validação de
  existência do `workOrderId` (pré-existente, não piorado); cross-tenant (run sempre
  gravada sob `tenant_id=actor.tenantId`, `relatedEntityId` é só string opaca sem JOIN);
  string vazia/espaço tratada como ausente, testado; regressão dos 2 clientes reais
  (Flutter manda só `workOrderId`, web `ChecklistRuntimePage.tsx` não manda nenhum dos
  dois). 24/24 testes confirmados rodando de novo pelo próprio agente.
- **coordenador-de-acessos** → **APROVADO**. Isolamento multi-tenant confirmado sem
  regressão (mesmo padrão pré-existente de campo livre sem FK); escopo do diff bate
  exatamente com o plano (só `checklist.validator.ts` + teste novo); nenhuma permissão
  nova necessária (enriquecimento de payload, não capacidade de acesso nova).
- **Achado não-bloqueante (ambos concordam, registrado para o futuro):** `relatedEntityId`
  segue sem validação de existência/tenant contra `WorkOrder` real — aceitável hoje
  (padrão pré-existente), mas se um PR futuro (ex. PR-05, dossiê) passar a **confiar**
  nesse campo para JOIN real, aí sim precisa virar checagem/FK — já é exatamente o
  requisito que a junta de arquitetura exigiu para `ImpoundProcessChecklistLink` no PR-04.
- **Decisão:** **APROVADO 2/2**, 0 ciclo. KPI: backend +6 (5 testes novos em
  `tests/checklist-run-work-order-derivation.test.ts` + regressão 24/24 nos 4 arquivos
  `tests/checklist*.test.ts` pré-existentes, todos passando).

### PR-02 — schema `ThirdPartyVehicleIdentity` + `MergeEvent` + `ImpoundProcess.identity_id` — VOTOS DA JUNTA (2026-07-31) — **APROVADO 2/2 (ciclo 1, 1 achado consertado no próprio PR)**

> Migração aditiva (2 tabelas novas + `ImpoundProcess.identity_id` NULLABLE) implementando os 7
> ajustes que a própria junta de arquitetura já exigiu antes do código existir (§3). Junta:
> `agente-dba-guardiao` (OBRIG.) + `critico-adversarial` (OBRIG.).

- **agente-dba-guardiao (OBRIG.)** → **APROVADO** de primeira. Os 7 ajustes confirmados um a um
  no SQL real (CHECK `confidence_chk` de 3 valores; trigger `third_party_vehicle_identity_merge_events_block_mutation`
  nomeado por tabela com `ERRCODE='restrict_violation'`; comentário justificando o índice parcial
  não-único; comentário confirmando RLS herdada sem policy nova em `ImpoundProcess.identity_id`;
  runbook de rollback com `DROP TRIGGER`/`DROP FUNCTION` nomeados; self-relation Prisma `"IdentityMerge"`
  com `onDelete: Restrict` nos dois lados). Reproduziu **independentemente** (script `pg` cru próprio,
  não confiou só no relato do dev) 6 dos 9 cenários de prova viva, incluindo confirmar via
  `pg_roles.rolsuper` que a conexão padrão é superusuário (por isso o teste de RLS precisa de uma
  role `NOSUPERUSER` efêmera — a correção do dev está certa) e via `pg_constraint`/catálogo real que
  as 3 FKs novas são `ON DELETE RESTRICT` (não `SetNull`/`Cascade`). CRUD básico (`src/modules/vehicle-identities/`)
  confirmado sem caminho de merge escondido.
- **critico-adversarial (OBRIG.)** → **APROVADO_CONDICIONADO ciclo 1 → APROVADO**. 4 vetores
  atacados: self-FK cross-tenant (RESISTE, prova real via INSERT cru sob RLS, não só leitura de
  sintaxe); merge via CRUD básico (RESISTE, `create`/`update` nunca leem `canonicalIdentityId`,
  `confidence` gravável restrito a `PROVISIONAL`/`CONFIRMED`, `MERGED` rejeitado com mensagem
  dedicada); colisão de placa via PATCH (RESISTE, índice parcial não-único permite coexistência
  sem efeito colateral, comportamento documentado e intencional). **1 FURO REAL (menor):**
  `PATCH {unidentified: true, unidentifiedReason: "..."}` sobre um registro já identificado não
  exigia limpar `plate_key`/`chassis`/`renavam_key` — o CHECK do banco só valida `reason`
  preenchido, não a ausência de identificador, deixando um estado ambíguo (`unidentified=true` E
  `plate_key` populado simultaneamente) que contaminaria o PR-03 (backfill/sugestão de merge) e o
  PR-07/09 (dossiê). **FECHADO**: `assertIdentityCoherence` passa a rejeitar com 400
  (`unidentified_conflicts_with_identifier`) quando `unidentified=true` e algum identificador ainda
  está presente no estado EFETIVO pós-PATCH — o cliente precisa limpar explicitamente (`plate: null`
  etc.) no mesmo request. Decisão de rejeitar (não limpar em silêncio) confirmada pelo próprio
  crítico-adversarial, seguindo o padrão já usado no módulo (nunca reescreve campo por conta
  própria — mesmo espírito de `impound_processes_identity_chk`). Teste do bug original corrigido +
  teste de regressão novo provando o fechamento (limpeza explícita aceita, ausência rejeitada).
- **Decisão da junta:** **APROVADO 2/2** (ciclo 1→2; 1 achado MÉDIA consertado no mesmo PR, nenhum
  crítico/bloqueante de segurança de dado remanescente). **KPIs no próprio PR:** backend
  `tests/vehicle-identity-schema.test.ts`+`tests/vehicle-identity-crud.test.ts` = **26/26** (8 prova
  viva Postgres real + 18 CRUD, incluindo o teste do achado fechado); regressão da família
  impound/pátios (`impound.test.ts`, `impound-fsm.test.ts`, `impound-hashchain.test.ts`,
  `impound-concurrency.test.ts`, `impound-reception.test.ts`, `patios-dashboard.test.ts`) = **59/59**.
  Escopo proibido confirmado intocado (`impound.hashchain.ts`/`resolveTransition`/gates de
  release-leilão/permissão nova — nenhum tocado). `prisma migrate status`: 90 migrações, up to date.
  Próximo: PR-03 (backfill + relatório de ambíguos/sugestões).

### PR-03 — script de backfill de identidade — VOTOS DA JUNTA (2026-07-31) — **APROVADO 2/2 (ciclo 1, 1 achado de atribuição consertado no próprio PR)**

> `scripts/backfill-third-party-vehicle-identity.ts` — reescreve dado em produção (popula
> `identity_id` retroativamente + cria `ThirdPartyVehicleIdentity`), tratado com o mesmo rigor de
> uma migração. Junta: `agente-dba-guardiao` (OBRIG.) + `critico-adversarial` (OBRIG.).

- **agente-dba-guardiao (OBRIG.)** → **APROVADO** de primeira. Rodou o script ele mesmo (não só os
  testes do dev) contra um tenant isolado com **1200 processos gerados com UUID aleatório**
  (>2× o `BATCH_SIZE`, forçando 3 páginas de keyset pagination de verdade) — 2 rodadas
  confirmaram idempotência real (`RUN 1: 1200 criados/linkados; RUN 2: 0/0`). Confirmou no código:
  sequencial por tenant (sem `Promise.all` entre tenants), `updateMany` em statement único por
  lote (não SELECT+loop), keyset via `ORDER BY id`+cursor (nunca `OFFSET`), agrupamento só por
  `plate_key` exato (chassi/renavam sozinhos nunca disparam agrupamento automático),
  `vehicle_unidentified=true` sempre em loop separado e individual (regra dura, não heurística).
- **critico-adversarial (OBRIG.)** → **APROVADO_CONDICIONADO ciclo 1 → APROVADO**. 5 vetores
  atacados: corrida com o sweep de reconciliação (RESISTE — documentação clara de "catch-up
  reexecutável", PR-05 como correção definitiva; achou que a implementação real é MAIS segura que
  o exigido, cada tenant roda dentro de 1 transação Prisma única, tornando impossível identidade
  órfã por falha parcial); normalização de marca/modelo/cor (RESISTE, `trim().toUpperCase()`
  confirmado com teste real de variação de formatação); processo com `plate_key` E
  `vehicle_unidentified=true` simultâneos (RESISTE — confirmou que isso É um estado válido possível
  pelo CHECK antigo de Ω5P, não só dado legado; o script trata corretamente, nunca copia
  identificador para a identidade "não identificada"); atomicidade por lote (RESISTE, mais forte
  que o exigido). **1 FURO de atribuição (menor, não-funcional):** o comentário do script creditava
  a janela de 72h a uma "decisão do dono confirmada em J-OMEGA-VID.md §4" — o §4 real só diz "datas
  próximas", sem número; os 72h foram escolha do implementador. Viola a cultura de "não decidir em
  silêncio" (CLAUDE.md §A2/A6) por atribuir uma escolha técnica a uma fonte que não a contém.
  **FECHADO**: comentário reformulado para deixar claro que é escolha de implementação ajustável,
  não confirmação literal do dono.
- **Decisão da junta:** **APROVADO 2/2** (ciclo 1→2; 1 achado de rastreabilidade consertado no
  mesmo PR, nenhum funcional/de segurança remanescente). **KPIs no próprio PR:** backend +10
  (`tests/backfill-third-party-vehicle-identity.test.ts`, todos sempre-roda); regressão da família
  impound/pátios+vehicle-identity+checklist = 95/95 (dba-guardião) e 90/90 (crítico-adversarial,
  subconjunto). Rodada real contra dev DB (dev, não produção): 6 identidades criadas, 8 processos
  vinculados, 1 ambíguo, 1 sugestão — idempotente confirmado na 2ª execução. Próximo: PR-04 (merge
  manual + unmerge-admin + `ImpoundProcessChecklistLink`).

### PR-04 — merge/unmerge de identidades + banner duplicata + `ImpoundProcessChecklistLink` — VOTOS DA JUNTA (2026-07-31) — **APROVADO (ciclo 1 REPROVADO → rework → ciclo 2 CONFIRMADO_FECHADO → ciclo 3 hardening)**

> Operação praticamente irreversível sobre custódia de bem de terceiro — junta orquestrada como
> **workflow adversarial** de 4 revisores em paralelo (`agente-dba-guardiao` + `critico-adversarial`
> + `coordenador-de-acessos` + `agente-secops`), depois **workflow de re-verificação** de 3
> agentes re-atacando os consertos com PoC próprio contra Postgres real.

**Ciclo 1 (revisão do diff — REPROVADO):**
- **agente-dba-guardiao** → APROVADO. Migração `20260855000000` 100% aditiva; as DUAS FKs compostas
  tenant-first RESTRICT (`process_id`→impound_processes E `checklist_run_id`→checklist_runs — esta
  a exigida pela junta de arquitetura, FK dura, não solta); CHECK `link_source`; unique
  `(tenant_id,process_id,checklist_run_id)`; RLS ENABLE+FORCE+POLICY — 13/13 provas vivas próprias
  com role NOSUPERUSER efêmera. 2 achados BAIXA não-bloqueantes (unmerge parcial documentado; drift
  pré-existente em `work_order_*` fora de escopo).
- **coordenador-de-acessos** → APROVADO. `vehicle_identity:merge` só tenant_admin/manager/super/
  platform (idêntico a release:approve); unmerge `platform:`-prefixed só super/platform (tenant_admin
  →403, platform_admin→200 provados ao vivo); **guarda dupla `impound:read` AND `checklist_runs:read`**
  no GET checklist-runs barra field_technician (403) — fecha o achado central da junta de arquitetura.
  Isolamento cross-tenant 404 nos 3 eixos. Zero defeito.
- **agente-secops** → APROVADO_CONDICIONADO. §2.8 limpo (snapshot_before nunca sai cru por HTTP). **1
  ALTA:** `PATCH /vehicle-identities/:id` (`impound:update`, que tenant_admin/manager têm) não travava
  identidade `MERGED` → estorno PARCIAL do merge (ressurreição) SEM a permissão platform-only, provado
  empiricamente.
- **critico-adversarial** → **REPROVADO. 1 CRÍTICA (PoC contra Postgres real):** merges concorrentes
  em direções opostas (A→B e B→A) sob READ COMMITTED sem row-lock criam um **2-ciclo no grafo**
  (A.canonical=B E B.canonical=A, ambos MERGED) via write-skew — corrupção comprovada; o banner
  `duplicateCandidates` incita dois operadores a reconciliar o mesmo cluster simultaneamente. + 2
  MÉDIA (unmerge rebaixa CONFIRMED→PROVISIONAL silenciosamente; unmerge deixa processos órfãos sem
  avisar) + 1 BAIXA (mensagem do bound de 20 hops enganosa).

**Rework (6 achados fechados):** (CRÍTICA) `mergeIdentities` ganhou `SELECT … FOR UPDATE` nas linhas
source+resolved ordenadas por id + re-validação pós-lock + 409 `merge_conflict_retry` — sem tocar o
isolamento global de `withTenantRls`. (ALTA) `update()` rejeita 422 `merged_identity_read_only` +
nova migração `20260856000000` com CHECK bicondicional `canonical setado ⟺ MERGED`. (MÉDIA) unmerge
restaura a confidence original do `snapshot_before` do MergeEvent de merge mais recente; persiste
`movedProcessCount`/`movedProcessIds` no snapshot e expõe `strandedProcessCount`. (BAIXA) mensagem do
bound diferenciada; unmerge parcial documentado em `docs/deployment.md`.

**Ciclo 2 (re-verificação adversarial dos consertos — CONFIRMADO_FECHADO unânime):**
- **critico-adversarial** → CONFIRMADO_FECHADO. 12 rodadas do teste + PoC próprio de cadeia
  transitiva = zero ciclo de qualquer comprimento (segurança estrutural — aresta só entra em nó ativo
  travado = sink); `EXPLAIN` prova `LockRows` acima do `Sort` (lock em ordem de id); **360 merges
  concorrentes sobrepostos = ZERO deadlock**; races transitivos devolvem 409 limpo; CONFIRMED
  restaurado; strandedProcessCount persistido. 2 achados BAIXA de hardening remanescentes (TOCTOU
  cosmético no `update()`; unmerge sem FOR UPDATE → evento `[UNMERGE]` duplicado) — ambos
  explicitamente sem corrupção/ciclo/ressurreição.
- **agente-secops** → CONFIRMADO_FECHADO, zero achado. Bypass fechado em 2 camadas independentes
  provadas; todos os caminhos de escrita de confidence/canonical auditados, nenhum escapa.
- **agente-dba-guardiao** → CONFIRMADO_FECHADO, zero achado. Migração `20260856000000` aditiva,
  bicondicional confirmado no catálogo (`convalidated=true`), 0 linhas violando, 8/8 provas vivas
  tx-ROLLBACK, runbook presente.

**Ciclo 3 (hardening dos 2 BAIXA — mesmo padrão FOR UPDATE já provado):** `updateIdentity` do repo
Prisma ganha `SELECT confidence … FOR UPDATE` no início da tx de escrita → qualquer edição a uma
identidade MERGED falha atomicamente (fecha o TOCTOU cosmético, tombstone MERGED 100% read-only);
`unmergeIdentity` ganha `SELECT … FOR UPDATE` → dois unmerge concorrentes: exatamente 1 vence + grava
1 evento `[UNMERGE]`, o outro rejeita `not_merged` limpo (provado, 12 rodadas, evento único). Módulo
uniformemente lock-safe.

**Decisão da junta:** **APROVADO** — 1 CRÍTICA + 1 ALTA + 2 MÉDIA + 3 BAIXA, TODAS fechadas e
re-verificadas adversarialmente contra Postgres real por PoC próprio dos agentes que as acharam.
**KPIs no próprio PR:** backend +42 (`tests/vehicle-identity-merge{,-db,-concurrency}.test.ts` +
`tests/impound-checklist-link.test.ts` + `tests/impound-process-checklist-link-schema.test.ts` = 41,
+ 1 no schema pelo CHECK bicondicional); regressão vehicle-identity 55/55, checklist-link 13/13,
impound core 56/56, backfill 10/10. 2 migrações novas (`20260855000000` link table + `20260856000000`
CHECK bicondicional), `prisma migrate status` 92 up to date. 2 permissões novas (`vehicle_identity:merge`
+ `platform:vehicle-identity-unmerge:manage`) em RBAC_MATRIX.md. Próximo (intercalado por decisão do
dono): **CHECKLIST P0** — gap de sync mobile→backend (perda silenciosa de foto/avaria/assinatura),
antes dos PRs de UI do dossiê (PR-05+).

### PR-05 — sweep resolve identidade na criação + AUTO-link de checklist — VOTOS DA JUNTA (2026-08-01) — **APROVADO (ciclo 1 condicionado → correção → fechado)**

> Onde o dossiê do veículo e o checklist do guincho se encontram: o sweep de reconciliação, ao abrir um
> `ImpoundProcess` de uma OS de reboque concluída, resolve/cria a `ThirdPartyVehicleIdentity` (grava `identity_id`)
> e AUTO-linka os `ChecklistRun` da OS — tudo na MESMA tx, SEM migração (tabelas dos PR-02/04). Decisão de
> semeadura em `D-Ω-VID-05-SEED`. Junta orquestrada como workflow adversarial (crítico + dba + coordenador).

**Ciclo 1 (revisão):**
- **agente-dba-guardiao → APROVADO.** Provou ao vivo (Postgres): `prisma validate`/`migrate status` (94, up to date,
  ZERO migração); git diff não toca schema/migrations; `identity_id`+link herdam a RLS existente; tx atômica →
  `duplicate_service_order` reverte tudo (zero órfão); a query de reuso é **byte-idêntica** à do backfill (convergência
  provada); `custody_events.type` sem CHECK; AUTO-link por upsert idempotente. 25/25 DB-gated. Registrou a
  convergência como invariante (se o backfill mudar a cláusula, os dois pontos mudam juntos).
- **coordenador-de-acessos → APROVADO.** Efeito-de-domínio NÃO-amplificador (SISTEMA, `created_by=NULL`, sem
  re-checar permissão — coerente com o precedente do checklist PR-A/Ω4C); isolamento tenant por RLS+filtro+FK
  composta tenant-first; guarda dupla do dossiê (PR-04) intacta; nenhuma permissão nova. 25/25.
- **critico-adversarial → APROVADO_CONDICIONADO.** RATIFICOU com PoC próprio: concorrência (10 aberturas
  concorrentes da mesma OS → 1 processo, 0 órfão, 0 `25P02`); a classe de bug do PR-A **não reabre** (identity-create
  SEM unique → nunca P2002/aborted-tx); e o ponto mais importante — **um seed errado NÃO corrompe registro legal nem
  cobrança** (`identity_id` fora do hash-chain; diária/release/leilão/portal são process-scoped por `vehicle_plate`),
  só engana a agregação navegacional do dossiê. **1 MÉDIA:** o typo-collision POR REUSO (placa errada que casa
  exatamente uma identidade existente → 2 veículos sob 1 identidade) não tinha caminho de correção, e o D-record
  **superestimava as mitigações** (a vistoria não reapontava `identity_id`; o banner `duplicateCandidates` não dispara
  com 1 identidade; merge/unmerge não splitam). + 3 BAIXA (convergência só para placas de 7 alfanum; fragmentação sob
  sweeps concorrentes; AUTO-link fail-closed acopla navegacional a legal).

**Correção (a vistoria vira o caminho de correção — domínio-correto, D-Ω5P-REC-10):** `saveInspection`/
`upsertInspection` passam a **reconciliar `identity_id`** na mesma tx da vistoria: com a placa CONFIRMADA, resolve-ou-
cria (mesmo helper) e **re-aponta** `identity_id` se diferir → **SPLITA** a agregação errada (o processo de Y sai da
identidade de X quando a vistoria confirma Y); a identidade confirmada sobe `PROVISIONAL→CONFIRMED`. D-record corrigido
(a vistoria é o caminho de correção PRIMÁRIO da colisão-por-reuso; `duplicateCandidates`/merge NÃO splitam; a vistoria
é a garantia de convergência eventual independente do guard de seed-time); BAIXA documentadas como limitações aceitas;
AUTO-link fail-closed confirmado intencional em comentário.

**Decisão da junta:** **APROVADO** — 1 MÉDIA (correção-de-reuso) fechada com prova de SPLIT (teste #26 DB-gated), 3
BAIXA documentadas; ratificações de concorrência/`25P02`/isolamento-legal mantidas. **KPIs:** backend
**2064/2070 → 2085/2091** (+21: 18 do sweep/identidade/link + 3 da reconciliação-na-vistoria). SEM migração.
`blocks_completed` 121→122. Próximo: **PR-06** (ModalLarge — entra a reta de UI do dossiê).
