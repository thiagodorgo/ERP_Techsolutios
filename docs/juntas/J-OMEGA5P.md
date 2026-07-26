# J-Ω5P — Junta da Rodada "Pátios de Recolhimento (SIGPRV)"

> **Aberta em:** 2026-07-25 · **Branch:** `rodada/omega5p` · **Fontes de verdade:** `docs/rodadas/omega5p/ESTUDO_SIGPRV_PATIOS.md` (marco regulatório, ontologia, máquina de estados §4.2, invariantes I1-I10 §4.3, motor de diárias §5, leilão §6, portal §7) + `docs/rodadas/omega5p/PLANO_OMEGA5P.md` (gap, D-records, PR-00..20).
> **Mandato do dono:** implementar PR-00→PR-20 com os 10 invariantes cobertos por teste, RNs do prompt, KPI por PR, ata final. Aderente à **Res. CONTRAN 1025/2026** e "Sivec-ready" por adapter, sem integração externa especulativa.
> **Princípio:** o registro é PROVA — integridade, atribuição e retenção vêm antes de conveniência.

## 1. Composição (agentes efêmeros — expiram no encerramento)
| Agente | Papel | Poder |
|---|---|---|
| `omega5p-planejador` | plano curto por PR; recon; pesquisa (≥3 fontes); ratifica/abre D-records | propõe |
| `omega5p-dev-backend` | Prisma/migrations aditivas, módulos backend, testes de invariantes | implementa |
| `omega5p-dev-frontend` | console do operador do pátio (React, autenticado) sob `/patios` | implementa |
| `omega5p-dev-portal` | **dois PWAs isolados** (authority-portal + owner-portal) + BFFs, segurança da superfície pública | implementa |
| `omega5p-avaliador` | Seção 10 + RNs + invariantes + aderência normativa | **VETO bloqueante** |

**PROIBIDO** criar/tocar/renomear/deletar qualquer agente pré-existente (inclusive Junta de Mapas, `agente-secops`, `agente-dba-guardiao`, `coordenador-de-acessos`). No encerramento, deletar **apenas** esses 5 e registrar cada deleção nesta ata (§8). Subagentes transientes de recon/pesquisa (general-purpose/Explore/pesquisador-web) são task-runners, não "agentes criados".

**Juntas de PR (≥3, autonomia por juntas — D-SAN-AUTONOMIA):** `omega5p-avaliador` (veto) + revisores pré-existentes conforme o risco — **`agente-secops` OBRIGATÓRIO em todo PR que toque os PWAs/superfície pública**; `agente-dba-guardiao` em todo PR com migração; `coordenador-de-acessos` em PR de RBAC/nav. Mapa geográfico → contrato à Junta de Mapas (não reimplementar).

## 2. Critérios de aprovação por PR
1. **Seção 10 verde:** `npx prisma validate` + `migrate diff` sem drift · `npm run lint/build/test` · `frontend lint/build/test` · `git status --short` sem nada fora do escopo.
2. **Invariantes do PR** (I1-I10) presentes e provados por teste (property-based no motor de diárias; cadeia de hash + detecção de adulteração; máquina de estados → 409; ocupação concorrente; cascata §6º; enumeração/rate-limit no portal).
3. **RNs cobertas** + **aderência normativa com artigo citado** (CTB 269-271/328; Res. 1025 arts. 9/14/15/21/23-42).
4. **Multi-tenant:** 3 tenants + 2 perfis (público-credenciado + privado-contratual) via tenants efêmeros em `tests/rls-tenant-isolation.test.ts`; `tenantId` 1º em todo índice composto.
5. **KPI por PR** (D-KPI-PER-PR): `docs/kpis/omega5p/KPI_PR-XX.json` + histórico + snapshot.
6. **Zero regressão** nas suítes Ω3F/Ω4C. Voto registrado aqui (§7). Junta sem registro = merge inválido.

## 3. Não-negociáveis
- **Neutralidade white-label:** domínio/UI falam "autoridade solicitante / órgão / pátio" — NUNCA "polícia" nem o público-alvo explícito; tudo parametrizado por `JurisdictionProfile`.
- **I2 hash chain:** `CustodyEvent` append-only; `hash = sha256(prevHash + canonicalJson(payload) + occurredAt + actorId)`; correção retroativa = ADJUSTMENT (nunca update/delete); endpoint de verificação.
- **I4 diárias:** rolling-24h federal (§21 §1º) | calendário por perfil; teto pela DATA DE ENTRADA (6 meses | 30 diárias legado | ilimitado); job idempotente/DST-safe; congelamento.
- **I5 liberação:** autorização registrada + (quitação OU dispensa) + quem retira + comprovante entrada/saída.
- **I7 cascata §6º:** Σ alocações = arrematado, ordem legal, classe inferior só após exaurir a superior.
- **I9 retenção:** imutável ≥5 anos, exclusão física VEDADA (só anonimização pós-prazo).
- **I10:** todo acesso ao portal logado (PortalAccessLog).
- Dinheiro Decimal(12,2); km Decimal(10,1); enums inglês + labels PT-BR; toda escrita auditada; migrações SÓ aditivas.

## 4. Decisões da visão do dono (2026-07-25) → D-records
- **D-Ω5P-07** pagamento = **registro manual** no MVP (sem PSP; portal "PIX-ready" por adapter). PSP futuro só por junta-de-5.
- **D-Ω5P-10** `tariffs` **já existe** no repo → **ESTENDER** (vigência×categoria×serviço, escopo público/privado), não recriar.
- **D-Ω5P-11** superfícies externas = **DOIS PWAs isolados mobile-first**, builds separados (authority-portal credenciado + owner-portal público), sem sessão/cookie do ERP.
- **D-Ω5P-12** autoridade solicitante = **persona ativa**: origina a solicitação de remoção e **aprova a liberação in-system** (a "autorização do órgão" do I5 é ação registrada no PWA).
- **D-Ω5P-13** **dois reparos distintos:** o do **guincheiro habilita a remoção** (veículo não transportável como está; remove de qualquer forma) × o do **dono libera** (LIBERADO_PARA_REPARO, art. 271 §2). Nenhum reparo evita a remoção.
- D-Ω5P-01..09 ratificados na Fase 0 (ver `FASE0_RECON.md` e §12 do ESTUDO).

## 5. Escopo
**Permitido:** `prisma/schema.prisma` + migrations aditivas; módulos backend novos (`yard`, `jurisdiction`, `impound`, `charging`, `release`, `auction`, `authority-portal`, `owner-portal`, `interop`) + extensão de `tariffs`; páginas/rotas frontend do módulo Pátios sob `/patios` + os dois PWAs (builds próprias); `docs/rodadas/omega5p/**`, `docs/decisoes/D-Ω5P-*.md`, `docs/juntas/J-OMEGA5P.md`, `docs/kpis/omega5p/**`.
**Proibido:** refactor oportunista fora dos pontos de integração; alteração destrutiva em models/endpoints existentes; secrets/.env/infra/CI; contratar serviço externo (PSP/SNE/OCR/plataforma de leilão) sem junta-de-5; reusar sessão/auth do ERP no portal; `git add .` (stage por caminho); push/PR antes da aprovação registrada da junta; push na main; merge sem checks verdes; exclusão física de dados de processo (I9).

## 6. Cronograma (PLANO §3 + deltas da visão do dono)
- **Fase 0 — PR-00:** junta + 5 agentes + recon (`FASE0_RECON.md`, tabela existe/estende/cria) + ratificação D-records + validação dos pontos abertos do ESTUDO §11.
- **Fase 1 — PR-01..04:** `yard` (pátio/áreas hierárquicas/vagas/ocupação I1) · `jurisdiction` (perfis) · `tariffs` (ESTENDER) · UI administração.
- **Fase 2 — PR-05..09:** `impound` (processo+CustodyEvent hash+máquina de estados I1-I3) · recepção/vistoria (art.9º/14) **+ origem "solicitação de remoção" da autoridade** · `charging` (motor de diárias I4) · UI operação · notificações legais (I6).
- **Fase 3 — PR-10..11:** `release` (I5 + aprovação in-system da autoridade + reparo-do-dono art.271§2) · UI liberação/fila/agendamento.
- **Fase 4 — PR-12..15:** leilão — elegibilidade/preparação/2-strikes (I8) · eventos/edital (≥15 d.u.) · liquidação cascata §6º (I7) · UI funil.
- **Fase 5 — PR-16..~18:** **dois PWAs** — authority-portal (BFF credenciado) + owner-portal (BFF público, anti-enumeração/rate-limit/PortalAccessLog I10) + hardening LGPD (I9). **secops obrigatório.** (Pode subdividir; a numeração comprime/expande conforme a fatia.)
- **Fase 6 — PR-19..20:** painel gerencial + interop Sivec-ready (outbox versionado) + varredura de invariantes + ata final + deleção dos 5 agentes efêmeros.

## 7. Registro de votos (append por PR)

### PR-00 — Fase 0 (governança + recon) — **APROVADO** (2026-07-25)
- **Recon** (`docs/rodadas/omega5p/FASE0_RECON.md`): tabela existe/estende/cria ancorada em arquivo:linha reais. Confirmado: `yard`=CRIA (Branch `:95` é organizacional, não físico), `tariffs`=ESTENDE (`Tariff:1385` já tem vigência/price-table/cliente — D-Ω5P-10), impound/CustodyEvent(hash)/charging/release/auction/2-PWAs/interop=CRIA. Reuso: WorkOrder/FieldDispatch/Attachment/ScheduledNotification/FinancialTitle(+`createPayableSourceRoutes`)/ProfessionalStatementEntry/AuditLog/`withTenantRls`/scheduler in-process (sem node-cron). D-Ω5P-01..13 **ratificados**; 2 precisões de fundação (RECON-A identidade no ImpoundProcess sem FK ao Vehicle — fecha D-Ω5P-09; RECON-B gatilho por evento dedicado idempotente). §11: Sivec/guarda-monitorada/SNE **deferidos Ω6**; conservado-sucata/categorias/veículo-sem-ID **parametrizados**.
- **Gate adversarial** (`critico-adversarial`, no lugar do `omega5p-avaliador` que ativa na próxima sessão — PR-00 é docs-only): **APROVADO_CONDICIONADO** → 5 condições aplicadas (§8 do recon): (1) âncora `FinancialEntry` `:1774`→`:1727`; (2) durabilidade do gatilho OS→custódia (transacional/sweep, não só anti-duplicação) = requisito de PR-06; (3) R1 reescopado — assinatura eletrônica da nota de leilão (ICP-Brasil) = **PD-Ω5P-SIGN + possível junta-5**, bloqueante de PR-13/14; (4) extensão de `tariffs` pela rota ServiceCatalog-por-categoria (evita troca destrutiva de unique); (5) precisões de dependência (gatilho origem-agnóstico; interop replaya de CustodyEvent). Nada CRÍTICO; nada bloqueia a Fase 1.
- **Decisão:** verde (recon íntegro + condições sanadas) → PR-00 mergeia; segue para **PR-01 `yard`**. **Ratificação oficial do `omega5p-avaliador` fica registrada para a próxima sessão** (quando o agente ativa). Novos artefatos: **PD-Ω5P-SIGN** (assinatura da nota de leilão), **D-Ω5P-RECON-A/B** (precisões de fundação).

### PR-01 — PLANO (planejador, 2026-07-25) — módulo `yard` (pátio físico + áreas hierárquicas + vagas + ocupação I1)
> **Escopo:** SÓ backend + migração aditiva. **UI é PR-04** (nada de frontend aqui). Fonte: `FASE0_RECON.md` §2/§3-Alvo3/§6 + ESTUDO §8 (yard = "local de guarda" digital) + prompt PR-01. Fatia = **fundação física**; prova **I1** já neste PR sem depender do `ImpoundProcess` (PR-05).

#### (a) Schema Prisma (3 models CRIA) + índices tenant-first + migração `20260833000000_add_yard`
Convenção confirmada por leitura (`Branch:95`, `User:112`, `Tariff`, `telemetry` migration): PascalCase model, colunas snake_case, `@db.Uuid` PK `dbgenerated("gen_random_uuid()")`, `@db.Timestamptz(6)`, `@@map` plural, `tenant_id` 1º em todo índice, enums em **inglês validados na APP** (SEM enum-CHECK no banco — padrão FASE0 §3.5), labels PT-BR no DTO. Sem dinheiro/km nesta fatia. Última migração = `20260832000000` ⇒ próxima = **`20260833000000_add_yard`** (aditiva, R6).

```prisma
model Yard {                       // tabela "yards"
  id            String     @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenant_id     String     @db.Uuid
  branch_id     String?    @db.Uuid          // recorte org. OPCIONAL (decisão D-Ω5P-YARD-01)
  name          String
  address       String
  capacity_hint Int?                          // advisory; capacidade REAL = COUNT(spots)
  timezone      String     @default("America/Sao_Paulo")  // foundation diárias DST-safe I4 (charging PR-07 lê daqui)
  active        Boolean    @default(true)
  created_by    String?    @db.Uuid
  updated_by    String?    @db.Uuid
  created_at    DateTime   @default(now()) @db.Timestamptz(6)
  updated_at    DateTime   @default(now()) @updatedAt @db.Timestamptz(6)
  tenant        Tenant     @relation(fields: [tenant_id], references: [id], onDelete: Restrict)
  branch        Branch?    @relation(fields: [tenant_id, branch_id], references: [tenant_id, id], onDelete: Restrict)
  areas         YardArea[]
  @@unique([tenant_id, id])                   // habilita FK composta de YardArea
  @@index([tenant_id])
  @@index([tenant_id, active])
  @@index([tenant_id, branch_id])
  @@map("yards")
}

model YardArea {                   // tabela "yard_areas" — árvore quadra→corredor→fileira
  id            String     @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenant_id     String     @db.Uuid
  yard_id       String     @db.Uuid
  parent_id     String?    @db.Uuid
  kind          String                        // BLOCK | CORRIDOR | ROW (app-validado)
  name          String
  covered       Boolean    @default(false)
  vehicle_class String     @default("ANY")    // ANY | MOTORCYCLE | HEAVY (app-validado)
  created_by    String?    @db.Uuid
  updated_by    String?    @db.Uuid
  created_at    DateTime   @default(now()) @db.Timestamptz(6)
  updated_at    DateTime   @default(now()) @updatedAt @db.Timestamptz(6)
  tenant        Tenant     @relation(fields: [tenant_id], references: [id], onDelete: Restrict)
  yard          Yard       @relation(fields: [tenant_id, yard_id], references: [tenant_id, id], onDelete: Cascade)
  parent        YardArea?  @relation("YardAreaTree", fields: [tenant_id, parent_id], references: [tenant_id, id], onDelete: NoAction)
  children      YardArea[] @relation("YardAreaTree")
  spots         YardSpot[]
  @@unique([tenant_id, id])                   // habilita FK composta de YardSpot + self-ref parent
  @@unique([tenant_id, yard_id, parent_id, name])  // natural-key soft (caveat null-parent em (b))
  @@index([tenant_id, yard_id])
  @@index([tenant_id, parent_id])
  @@map("yard_areas")
}

model YardSpot {                   // tabela "yard_spots" — a VAGA (unidade de ocupação I1)
  id                 String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenant_id          String   @db.Uuid
  area_id            String   @db.Uuid
  code               String
  covered            Boolean  @default(false)
  vehicle_class      String   @default("ANY")   // ANY | MOTORCYCLE | HEAVY
  status             String   @default("FREE")  // FREE | OCCUPIED | BLOCKED
  current_process_id String?  @db.Uuid          // SEM FK dura em PR-01 (ImpoundProcess=PR-05); wire real no PR-06
  created_by         String?  @db.Uuid
  updated_by         String?  @db.Uuid
  created_at         DateTime @default(now()) @db.Timestamptz(6)
  updated_at         DateTime @default(now()) @updatedAt @db.Timestamptz(6)
  tenant             Tenant   @relation(fields: [tenant_id], references: [id], onDelete: Restrict)
  area               YardArea @relation(fields: [tenant_id, area_id], references: [tenant_id, id], onDelete: Cascade)
  @@unique([tenant_id, id])                      // forward-compat (back-ref do impound no PR-06)
  @@unique([tenant_id, area_id, code])           // código único por área (exigido pelo prompt)
  @@index([tenant_id, status])                   // mapa de ocupação (vagas livres por status)
  @@index([tenant_id, area_id])
  @@map("yard_spots")
}
```
Toque **aditivo** em model existente (único, sinalizado ao `dba-guardiao`): `Branch` ganha `yards Yard[]` + `@@unique([tenant_id, id])`; `Tenant` ganha back-relations. Zero coluna nova/DROP em tabela existente.

**Migração `20260833000000_add_yard` (aditiva pura, up-only, padrão telemetry `:75-80`):**
1. `CREATE UNIQUE INDEX "branches_tenant_id_id_key" ON "branches"("tenant_id","id");` (aditivo; habilita a FK composta yards→branches — mesma razão do `users.@@unique([tenant_id,id])`).
2. `CREATE TABLE` das 3 tabelas campo a campo acima; PK uuid; `@@unique([tenant_id,id])` em cada; FKs compostas tenant-first (tenant→RESTRICT; yard→CASCADE; area→CASCADE; parent self-ref→**NO ACTION** p/ o cascade-do-yard varrer a árvore num só statement; branch→**RESTRICT**).
3. **Partial-unique que PROVA I1b** (precedente vivo `financial_entries:53`, `attachments:44`, `20260806…:32`): `CREATE UNIQUE INDEX "yard_spots_current_process_key" ON "yard_spots"("tenant_id","current_process_id") WHERE "current_process_id" IS NOT NULL;` — um process aparece em no máx. 1 vaga. Raw-only (não declarado no Prisma model, como todos os partial-unique da casa).
4. **CHECK de coerência status⇄ocupação** (invariante estrutural, não enum-CHECK): `CHECK ((status='OCCUPIED' AND current_process_id IS NOT NULL) OR (status<>'OCCUPIED' AND current_process_id IS NULL))`.
5. **RLS por tabela** (clona `20260831000000:75-80`): `ENABLE` + `FORCE ROW LEVEL SECURITY` + `DROP POLICY IF EXISTS` + `CREATE POLICY "<t>_tenant_isolation" USING/WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)` nas 3 tabelas.
6. Rollback runbook (comentado): `DROP TABLE yard_spots, yard_areas, yards CASCADE;` + `DROP INDEX branches_tenant_id_id_key;`.

#### (b) Serviço de ocupação transacional que PROVA I1 (1-para-1 vaga×processo sob concorrência)
I1 tem **duas metades**, cada uma com garantia de banco distinta (belt-and-suspenders):
- **I1b "um processo ≤ 1 vaga"** ⇒ **partial-unique** `(tenant_id, current_process_id) WHERE NOT NULL`. Duas tx que estacionam o MESMO `processId` em vagas diferentes travam vagas diferentes (sem contenção de lock); o 2º commit viola o índice → **P2002 → 409 `PROCESS_ALREADY_PARKED`**. Garantia do DB, não da app.
- **I1a "uma vaga ≤ 1 processo"** ⇒ **lock de linha + guarda de status na MESMA tx** (`withTenantRls`→`$transaction`): `SELECT ... FROM yard_spots WHERE tenant_id=$1 AND id=$2 FOR UPDATE` serializa concorrentes na MESMA vaga; a 2ª tx bloqueia, re-lê `status='OCCUPIED'` e recebe **409 `SPOT_NOT_FREE`**. (A coluna única já impede 2 processos na mesma linha; o `FOR UPDATE` fecha a janela check-then-write.)

`OccupancyService` (métodos service-level, exercitados por teste em PR-01; wire ao processo real = PR-06):
- `allocate(actor,{spotId,processId})`: tx RLS → lock `FOR UPDATE` → exige `FREE` (senão 409) → `SET status='OCCUPIED', current_process_id=$pid` (P2002→409). *(match `vehicle_class` vaga×veículo = deferido PR-06, precisa do impound.)*
- `vacate(actor,{spotId})`: lock `FOR UPDATE` → exige `OCCUPIED` → `SET status='FREE', current_process_id=NULL`.
- `move(actor,{fromSpotId,toSpotId})`: 1 tx; trava as 2 vagas `FOR UPDATE` em ordem determinística (min(id),max(id)) anti-deadlock; exige `from=OCCUPIED`/`to=FREE`; **limpa `from` ANTES de setar `to`** (senão o partial-unique dispara no meio); preserva o `processId`. Primitivo de **RN-PAT-02**; a transferência ENTRE pátios completa (evento `TRANSFERIDO_PATIO` + `CustodyEvent` preservando o processo) = **deferida ao PR-06/impound**.
- Bloqueio operacional (`FREE⇄BLOCKED`) = transição de status simples sob `yard:update` (sem processo).
- **InMemory** espelha a lógica 1:1; a prova de RACE real (Postgres `FOR UPDATE` + partial-unique) roda no teste DB-gated (Node é single-thread → InMemory prova a LÓGICA dos guards, não a corrida).

#### (c) Permissões novas — as 4 pontas
Distribuição **espelha `branches:*`** (cadastro físico/operacional): `yard:read` amplo; `yard:create`/`yard:update` = gestão+admins. **Decisão:** entram só as **3** (`yard:read/create/update`); **`yard:manage` DEFERIDO ao PR-06** (quando a ocupação ganhar superfície HTTP dirigida pela autoridade/impound) — não crio permissão sem guard/rota (evita permissão morta).
- **`src/modules/core-saas/permissions/catalog.ts`:** +`"yard:read"`,`"yard:create"`,`"yard:update"` no `PERMISSION_CATALOG` (posições espelhando `tariffs:*`); em `manager` (read+create+update); `yard:read` também em `operator`,`field_dispatcher`,`technician`,`field_technician`,`viewer`,`auditor` (mesmo conjunto de `branches:read`). `tenant_admin`/`super_admin`/`platform_admin` herdam via filtro não-`platform:`.
- **`tests/core-saas.test.ts`:** as 3 no `expectedPermissionCatalog` na **mesma ordem/posição** do catalog (o `assert.deepEqual` é posicional) + novo bloco de asserts de distribuição por papel (espelha o bloco `telemetry:read`/`professional_statements`).
- **`prisma/seed.ts`:** 3 descrições PT-BR em `permissionDescriptions` (o fallback genérico existe, mas explícito é o padrão): ex. `"yard:read":"Consultar Pátios, áreas e vagas do tenant."`, `create`/`update` análogos.
- **`RBAC_MATRIX.md`:** 3 linhas de Pátios (read/create/update) com a mesma matriz de `branches`.

#### (d) Skeleton canônico (espelha `src/modules/tariffs/*`)
`src/modules/yard/`: `yard.types.ts` (Yard/YardArea/YardSpot + inputs + `YardError(statusCode,code,reason,msg)` + tipos de ocupação) · `yard.validators.ts` (parsers kind/vehicleClass/spotStatus/code/name/uuid) · `yard.dto.ts` (`toYardDto`/`toYardAreaDto`/`toYardSpotDto` + list dtos; labels PT-BR aqui) · `yard.repository.ts` (interface + `InMemoryYardRepository`) · `yard-prisma.repository.ts` (`PrismaYardRepository` sobre `Prisma.TransactionClient` + wrapper `RlsPrismaYardRepository` com **`withTenantRls`**; ocupação usa `tx.$queryRaw ... FOR UPDATE`) · `yard.service.ts` (`YardService`+`OccupancyService`; `createDefault…Service()` com env-gate `env.CORE_SAAS_PERSISTENCE!=="prisma"`→memory, senão import dinâmico do `-prisma.repository`; `reset…ForTests`) · `yard.controller.ts` (`recordRequestAuditBestEffort` em toda escrita — sem PII/valores) · `yard.routes.ts` (`YARD_PERMISSIONS`, `tenantContextMiddleware`+`createPersistentRbacContextMiddleware`, `requirePermission`) · `index.ts` (barrel). **Registro em `src/app.ts`:** `app.use("/api/v1", attachAuthenticatedActor(), createYardRouter());` — **incluir `src/app.ts` no `git add`** (senão CI `route_not_found`). Rotas sem colisão de path: `GET/POST /yards`, `GET/PATCH /yards/:yardId`, `GET /yards/:yardId/occupancy`, `GET/POST /yards/:yardId/areas`, `GET/PATCH /yard-areas/:areaId`, `GET/POST /yard-areas/:areaId/spots`, `GET/PATCH /yard-spots/:spotId`. *(HTTP de `allocate/vacate/move` = interna/deferida ao PR-06 — precisa de `processId` real; em PR-01 são métodos de serviço exercitados por teste.)*

#### (e) Escopo PERMITIDO × PROIBIDO (caminhos exatos)
**PERMITIDO:** `prisma/schema.prisma` (3 models + relação/`@@unique([tenant_id,id])` aditiva em Branch + back-relations em Tenant) · `prisma/migrations/20260833000000_add_yard/migration.sql` · `src/modules/yard/**` (novo) · `src/app.ts` (1 linha) · `src/modules/core-saas/permissions/catalog.ts` · `tests/core-saas.test.ts` · `tests/rls-tenant-isolation.test.ts` · `tests/yard.test.ts` (novo) · `tests/yard-occupancy-concurrency.test.ts` (novo, DB-gated) · `prisma/seed.ts` (só `permissionDescriptions`) · `RBAC_MATRIX.md` · `docs/kpis/omega5p/KPI_PR-01.*` · `docs/juntas/J-OMEGA5P.md`.
**PROIBIDO:** `frontend/**` (UI = PR-04) · criar `impound`/`ImpoundProcess`/`CustodyEvent`/FK dura em `current_process_id` (PR-05/06) · alterar coluna/DROP em model existente (só índice+relação aditivos em Branch) · `tariffs`/`jurisdiction` (PR-02/03) · PWA/BFF público · enum-CHECK no banco · `.env`/infra/CI · `git add .` (stage por caminho) · push/PR antes do voto registrado da junta.

#### (f) Bateria (Seção 10) + testes-alvo
**Bateria:** `npx prisma validate` + `prisma migrate diff` sem drift · `npm run lint` · `npm run build` · `npm test` (inclui `core-saas`+`yard`+rls) · `npm --prefix frontend run lint/build` (confirmar **zero regressão**; PR-01 não toca front) · `node --check` dos `app.js` de KPI · `git status --short` sem nada fora de (e) · `git diff --check`.
**Testes-alvo:**
1. **`tests/yard-occupancy-concurrency.test.ts` (I1, DB-gated `DATABASE_URL`, skip sem banco — como `rls-tenant-isolation`):** (i) `Promise.all` de **N `allocate()` na MESMA vaga** → exatamente 1 sucesso, N−1 × 409 `SPOT_NOT_FREE` (I1a via `FOR UPDATE`); (ii) `Promise.all` do MESMO `processId` sintético em 2 vagas → exatamente 1 sucesso, 1×409 `PROCESS_ALREADY_PARKED` (I1b via partial-unique); (iii) `move` preserva o `processId` e nunca deixa 2 vagas com o mesmo processo. Teardown FK-safe.
2. **`tests/yard.test.ts` (InMemory, sempre roda):** CRUD Yard/Área/Vaga + validadores + guards de ocupação (allocate→OCCUPIED→409; re-allocate mesmo processo→409; vacate→FREE→re-allocate ok; code único por área→409) + escopo por tenant.
3. **`tests/rls-tenant-isolation.test.ts` (3 tenants A/B/C):** inserir `yards`→`yard_areas`→`yard_spots` nos 3 tenants efêmeros; provar invisível sem `app.current_tenant_id` + cross-tenant `updateMany` count=0 + visível/intocado in-tenant. **Teardown FK-safe:** `yard_spots`→`yard_areas`→`yards` **ANTES** de `branch`/`user`/`tenant`. Os 2 perfis (público-credenciado × privado-contratual) entram como dado do tenant (perfil real = PR-02).
4. **`tests/core-saas.test.ts`:** catálogo íntegro (deepEqual) + distribuição `yard:*` por papel.
**KPI por PR:** `docs/kpis/omega5p/KPI_PR-01.json` + histórico + snapshot (D-KPI-PER-PR).

#### (g) Aderência normativa + juntas
Domínio **físico** (sem artigo tarifário próprio), mas materializa: **Res. CONTRAN 1025/2026 art. 9º** (centro de custódia mantém "local de guarda" com sistema homologado e **informações permanentemente atualizadas** — I1 é a integridade que torna ocupação/aging confiáveis), **art. 14** (o Termo registra o **local de guarda**); **CTB art. 271 §1º** pressupõe o **depósito/estada** cuja unidade de custo (a vaga) é modelada aqui; multi-pátio-por-tenant = ESTUDO §8. **Neutralidade white-label:** só "pátio/área/vaga/autoridade" — nenhum termo de público-alvo. **Junta do PR-01 (≥3):** `omega5p-avaliador` (VETO) + **`agente-dba-guardiao` OBRIGATÓRIO** (migração + toque aditivo em `branches`) + `coordenador-de-acessos` (RBAC `yard:*`). `agente-secops` **não** requerido (não toca superfície pública/PWA).

**Decisões da fatia (registrar):** **D-Ω5P-YARD-01** Yard→Branch por FK composta tenant-first `(tenant_id,branch_id)`→`branches(tenant_id,id)` onDelete RESTRICT (branch opcional) + índice aditivo `branches_tenant_id_id_key` — *fallback se a junta vetar o toque em Branch:* omitir `branch_id` em PR-01. **D-Ω5P-YARD-02** I1 = partial-unique(`current_process_id`) + lock `FOR UPDATE`+guarda de status; `current_process_id` **sem FK dura** até PR-06. **D-Ω5P-YARD-03** `yard:manage` deferido ao PR-06. **D-Ω5P-YARD-04** self-ref da árvore `onDelete NoAction` (cascade-do-yard varre a árvore num statement); caveat: `@@unique([tenant_id,yard_id,parent_id,name])` — NULLs distintos no Postgres, então 2 BLOCKs de topo (parent NULL) homônimos não colidem → unicidade de nome no topo fica no guard app-level do validator.

### PR-01 — `yard` — VOTO DA JUNTA (2026-07-25) — **APROVADO 3/3**
Junta (≥3): `omega5p-avaliador` (VETO) + `agente-dba-guardiao` (migração + toque aditivo em branches) + `coordenador-de-acessos` (RBAC `yard:*`). `agente-secops` não requerido (sem superfície pública nesta fatia).
- **omega5p-avaliador** → `APROVADO_CONDICIONADO`→**APROVADO** (condição de KPI sanada): Seção 10 verde (prisma validate=valid; drift live-DB→schema = só RenameIndex pré-existente, ZERO em yards/yard_areas/yard_spots/branches; migrate status up-to-date; check/build/git diff --check limpos). **I1 PROVADO sob corrida real no Postgres** (`yard-occupancy-concurrency` 3 pass): I1a `SELECT FOR UPDATE` dentro de `withTenantRls`→409 `SPOT_NOT_FREE`; I1b índice parcial único `(tenant_id,current_process_id) WHERE NOT NULL`→P2002→409 `PROCESS_ALREADY_PARKED`; CHECK `status⇄current_process_id` coerente. §allowlist sem `tenant_id`. Delta +21 (18 InMemory + 3 concorrência) confirmado sobre 1521 ⇒ **1542**. Única condição = `KPI_PR-01.json` ausente → **SANADA** (docs-only, sem re-review de código).
- **agente-dba-guardiao** → `APROVADO`: migração 100% aditiva up-only (branches só ganha índice `branches_tenant_id_id_key`); **up→down→re-up reproduzido na base viva com drift ZERO** e `_prisma_migrations` íntegro; FKs compostas tenant-first (tenant/branch→RESTRICT, yard/area→CASCADE, parent self→NoAction); índice parcial único inclui `tenant_id` + predicado (prova funcional viva → 23505); CHECK coerente (prova viva); RLS ENABLE+FORCE+policy nas 3 (clone de `20260831000000:75-80`); teardown FK-safe. Base deixada intacta.
- **coordenador-de-acessos** → `APROVADO` (0 cond): `yard:read/create/update` nas 4 pontas; distribuição **espelha `branches:*` exatamente nos 13 papéis** (read amplo exceto finance/inventory/support; create/update só admins+manager; papéis de campo só read → POST/PATCH 403); `core-saas.test` 26/26 (deepEqual posicional + asserts por papel); **`yard:manage` ausente** (sem permissão morta); rotas verbo×permissão corretas + registradas em `src/app.ts:124`; backend é a autoridade. Sem nav/frontend (UI = PR-04), como esperado.
- **Decisão:** verde (3 APROVADO, 0 CRÍTICO; I1 provado sob concorrência real; condição de KPI sanada) → PR-01 mergeia. backend **1521→1542** (+21), smoke 850 e flutter 807 inalterados (backend-only), blocks **88→89**. D-records **D-Ω5P-YARD-01..04** ratificados. Deferido ao PR-05/06: FK dura em `current_process_id`, match `vehicle_class`, superfície HTTP de ocupação, transferência entre pátios completa, `yard:manage`. Próximo: **PR-02 `jurisdiction`**.

## 8. Encerramento (a fazer no fim)
Ata final (entregas, KPIs consolidados, matriz RN×norma, pendências → backlog Ω6: PSP/PIX, SNE, Sivec real, GOV.BR, guarda monitorada, IA); deletar **SOMENTE** os 5 agentes efêmeros (registrar cada deleção); confirmar que nenhum agente pré-existente foi tocado; marcar os D-records como vigentes.
