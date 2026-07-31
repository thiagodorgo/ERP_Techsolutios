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
