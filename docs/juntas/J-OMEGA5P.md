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

### PR-02 — PLANO (planejador, 2026-07-25) — módulo `jurisdiction` (perfis normativos por UF/órgão/contrato)
> **Escopo:** SÓ backend + migração aditiva. **UI é PR-04** (nada de frontend aqui). Fonte: `FASE0_RECON.md` §2 (`jurisdiction`=CRIA, net-new) + §5 (a/d/e/f parametrizados) + ESTUDO §9 (parametrização nacional) + §2.2/§2.3 (prazos federais + regime intertemporal) + prompt PR-02. Fatia = **fundação normativa**: o CRUD do perfil + o **serviço de resolução de defaults federais**, única fonte de verdade para o motor de diárias (I4, `charging` PR-07) e os relógios do leilão (I6, `auction`/notificações PR-09/12). **RN-JUR-01** (todo processo referencia um perfil): aqui só o perfil + `@@unique([tenant_id, id])` forward-compat; **NÃO** crio FK a partir de `ImpoundProcess` (PR-05) nem de qualquer entidade inexistente.

#### (a) Schema Prisma (1 model CRIA) + índices tenant-first + migração `20260834000000_add_jurisdiction`
Convenção confirmada por leitura (`Yard:2607`, `custom_recipient_ids Json @default("[]"):335`, migração `20260833000000_add_yard`): PascalCase model, colunas snake_case, `@db.Uuid` PK `dbgenerated("gen_random_uuid()")`, `@db.Timestamptz(6)`, `@@map` plural, `tenant_id` 1º em todo índice, enums em **inglês validados na APP** (SEM enum-CHECK no banco — padrão FASE0 §3.5), labels PT-BR no DTO. **Sem dinheiro/km nesta fatia** (só prazos Int e enums; valores tarifários vivem em `tariffs`/PR-03). Última migração = `20260833000000` ⇒ próxima = **`20260834000000_add_jurisdiction`** (aditiva, R6). **Confirmado latest+1.**

```prisma
model JurisdictionProfile {                    // tabela "jurisdiction_profiles"
  id                          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenant_id                   String   @db.Uuid
  name                        String
  scope                       String                          // PUBLIC_AGREEMENT | PRIVATE_CONTRACT (app-validado)
  owner_notif_days            Int      @default(10)            // Res. 1025 art. 15 (notificacao <=10 dias)
  notice_edict_day            Int      @default(30)            // Res. 1025 art. 26 (edital complementar >=30 dias)
  auction_eligible_day        Int      @default(60)            // CTB 328 (Lei 13.160/2015) / Res. 1025 art. 25 (nao reclamado 60d)
  auction_edict_business_days Int      @default(15)            // Lei 14.133/2021 (edital do leilao >=15 dias uteis)
  daily_model                 String   @default("ROLLING_24H") // ROLLING_24H | CALENDAR — Res. 1025 art. 21 par.1
  daily_cap                   String   @default("SIX_MONTHS")  // SIX_MONTHS | THIRTY_DAYS_LEGACY | UNLIMITED — CTB 271 par.10 / Tema 124
  release_requirements        Json     @default("[]")          // checklist [{code,label,required}] — CTB 271 par.1 / Res. 1025 art. 23-24
  notes                       String?
  active                      Boolean  @default(true)
  created_by                  String?  @db.Uuid
  updated_by                  String?  @db.Uuid
  created_at                  DateTime @default(now()) @db.Timestamptz(6)
  updated_at                  DateTime @default(now()) @updatedAt @db.Timestamptz(6)
  tenant                      Tenant   @relation(fields: [tenant_id], references: [id], onDelete: Restrict)

  @@unique([tenant_id, id])                     // forward-compat: FK composta de ImpoundProcess (PR-05, RN-JUR-01)
  @@unique([tenant_id, name])                   // chave natural (D-Ω5P-JUR-01) — nome unico por tenant, independe do scope
  @@index([tenant_id])
  @@index([tenant_id, scope])                   // filtrar por natureza (publico-credenciado x privado-contratual)
  @@index([tenant_id, active])
  @@map("jurisdiction_profiles")
}
```
Toque **relação-only** em model existente: `Tenant` ganha `jurisdiction_profiles JurisdictionProfile[]` (back-relation; **zero DDL** em `tenants` — mais simples que o PR-01, que precisou do índice em `branches`). **Nenhuma** coluna nova/DROP/ALTER em tabela existente; **nenhuma** FK a partir de entidades inexistentes.

**Migração `20260834000000_add_jurisdiction` (aditiva pura, up-only, clona o padrão de `20260833000000_add_yard`):**
1. `CREATE TABLE "jurisdiction_profiles"` campo a campo acima; PK uuid; `release_requirements` JSONB NOT NULL DEFAULT array-vazio (Prisma `Json`->`jsonb`, precedente `custom_recipient_ids:335`).
2. Índices: `jurisdiction_profiles_tenant_id_id_key` (UNIQUE, forward-compat FK composta do PR-05), `..._tenant_id_name_key` (UNIQUE, chave natural), `..._tenant_id_idx`, `..._tenant_id_scope_idx`, `..._tenant_id_active_idx` — todos `tenant_id` 1º.
3. FK: `tenant_id` -> `tenants(id)` ON DELETE RESTRICT ON UPDATE CASCADE.
4. **CHECK estrutural de integridade** (NÃO enum-CHECK; mesmo espírito do `yard_spots_status_process_coherence_chk` do PR-01 — belt-and-suspenders sobre a validação app-level): `CONSTRAINT "jurisdiction_profiles_positive_deadlines_chk" CHECK (owner_notif_days > 0 AND notice_edict_day > 0 AND auction_eligible_day > 0 AND auction_edict_business_days > 0)` — prazo <= 0 é impossível no domínio; a `agente-dba-guardiao` revisa (D-Ω5P-JUR-05). **Os enums (scope/daily_model/daily_cap) NÃO têm CHECK** (validados na APP, padrão da casa).
5. **RLS por tabela** — `ENABLE` + `FORCE ROW LEVEL SECURITY` + `DROP POLICY IF EXISTS` + `CREATE POLICY jurisdiction_profiles_tenant_isolation` USING/WITH CHECK comparando `tenant_id` ao `app.current_tenant_id` via `NULLIF(current_setting(...))::uuid` — **idêntica** à policy das 3 tabelas do yard (migração `20260833000000:138-157`, que clona `20260831000000:75-80`).
6. Rollback runbook (comentado): `DROP TABLE IF EXISTS "jurisdiction_profiles" CASCADE;` (tabela NOVA; reverter o PR remove tudo sem afetar dado existente — não há toque DDL em tabela pré-existente a desfazer).

#### (b) Serviço de resolução de defaults federais (foundation p/ charging I4 e auction I6)
Arquivo dedicado `jurisdiction.defaults.ts` (puro, zero dependência — `charging`/`auction` importam depois sem acoplar ao service). Uma **única constante canônica** espelha os `@default` das colunas (norma federal escrita uma vez):
```ts
export const FEDERAL_DEFAULTS = {
  ownerNotifDays: 10,           // Res. 1025 art. 15
  noticeEdictDay: 30,           // Res. 1025 art. 26
  auctionEligibleDay: 60,       // CTB 328 / Res. 1025 art. 25
  auctionEdictBusinessDays: 15, // Lei 14.133/2021
  dailyModel: "ROLLING_24H",    // Res. 1025 art. 21 par.1
  dailyCap: "SIX_MONTHS",       // CTB 271 par.10 (Lei 13.281/2016) + 328 par.5
} as const;
export const TEMA_124_LEGACY_CAP = "THIRTY_DAYS_LEGACY" as const; // Tema 124/STJ — estada 30 dias no regime anterior
```
`resolveDefaults(scope)` devolve os defaults para pré-preencher um perfil NOVO daquele scope (o que o `create` aplica quando o cliente omite um campo):
- **PUBLIC_AGREEMENT** -> `FEDERAL_DEFAULTS` inalterado (regime estrito: teto 6 meses, rolling-24h, 10/30/60/15 d.u.).
- **PRIVATE_CONTRACT** -> `{ ...FEDERAL_DEFAULTS, dailyCap: "UNLIMITED" }` (custódia privada não tem o teto de estada do CTB; os prazos federais seguem como referência, mas o pátio privado tipicamente não roda o leilão administrativo do art. 328 — decisão D-Ω5P-JUR-02).
- **Teto intertemporal (I4):** `THIRTY_DAYS_LEGACY` (Tema 124) NÃO é escolha de scope — é escolha por **data de entrada**, aplicada pelo `charging` (PR-07) lendo `profile.dailyCap`. PR-02 só expõe o enum + a constante para o PR-07 ter uma fonte única.
- Exposto via **`GET /jurisdiction-defaults?scope=`** (read-only, `jurisdiction:read`) — endpoint que a UI (PR-04) chama para pré-preencher o formulário; exercita o `resolveDefaults` por HTTP. Path **separado** de `/jurisdiction-profiles/:profileId` (zero colisão de rota, estilo dos paths distintos `/yard-areas`,`/yard-spots` do PR-01).
- (Opcional, sem forçar) `FEDERAL_RELEASE_REQUIREMENTS` = baseline sugerido de checklist de liberação que a UI pode ofertar; a coluna nasce vazia (D-Ω5P-JUR-04).

#### (c) Validações + chave natural
`jurisdiction.validators.ts` (espelha `yard.validators.ts`, `JurisdictionError(statusCode,code,reason,msg)`):
- `parseScope` em {PUBLIC_AGREEMENT, PRIVATE_CONTRACT}; `parseDailyModel` em {ROLLING_24H, CALENDAR}; `parseDailyCap` em {SIX_MONTHS, THIRTY_DAYS_LEGACY, UNLIMITED} (uppercase+trim; inválido -> 400).
- `parsePositiveDeadline(field)`: Int > 0 e <= 3650 (10 anos, sanity) — **prazos > 0** exigidos (400 `invalid_deadline`). Belt-and-suspenders com o CHECK (a).
- `parseName`: não-vazio, <= 160 (mirror yard); `notes?` <= 500.
- `parseReleaseRequirements`: array de objetos `{ code:string(<=60), label:string(<=160), required?:boolean }`; máx. 50 itens; qualquer outro shape -> 400 `invalid_release_requirements`. Default vazio.
- **Chave natural = `@@unique([tenant_id, name])` (D-Ω5P-JUR-01):** o `scope` é atributo de dado, **não** de identidade. Um tenant pode operar público E privado, mas o **nome** é como humanos e o futuro convênio/contrato (FK do PR-05) referenciam o perfil; nome único por tenant evita referência ambígua. Colisão de nome -> **409 `JURISDICTION_CONFLICT`** (P2002 traduzido no `-prisma.repository` + guard app-level no InMemory p/ paridade). Não uso `(tenant_id, name, scope)` (permitiria dois "Tabela X" homônimos confusos).

#### (d) Permissões novas — as 4 pontas (espelha `yard:*`/`branches:*`)
Distribuição **idêntica a `yard:*`** (confirmada no catálogo: read amplo; create/update = gestão+admins). Entram só as **3** (`jurisdiction:read/create/update`); **`jurisdiction:manage` NÃO existe** (sem guard/rota = permissão morta — mesma disciplina do `yard:manage` diferido).
- **`src/modules/core-saas/permissions/catalog.ts`:** +`jurisdiction:read` (logo após `yard:read`), +`jurisdiction:create` (após `yard:create`), +`jurisdiction:update` (após `yard:update`) — preserva os 3 blocos read/create/update do catálogo; em `manager` (read+create+update, ao lado de `yard:*`); `jurisdiction:read` também em `operator`,`field_dispatcher`,`technician`,`field_technician`,`viewer`,`auditor` (**mesmo conjunto de `branches:read`/`yard:read`** — NÃO finance/inventory/support). `tenant_admin`/`super_admin`/`platform_admin` herdam via filtro não-`platform:`.
- **`tests/core-saas.test.ts`:** as 3 no `expectedPermissionCatalog` na **mesma ordem/posição** (deepEqual posicional) + asserts de distribuição por papel (espelha o bloco `yard:*` linhas 357-399) + assert de que `jurisdiction:manage` NÃO está no catálogo.
- **`prisma/seed.ts`:** 3 descrições PT-BR em `permissionDescriptions` (ex.: `jurisdiction:read` = Consultar perfis normativos — prazos, diaria, teto, exigencias — do tenant; create/update análogos).
- **`RBAC_MATRIX.md`:** 3 linhas de Perfis Normativos (read/create/update) com a mesma matriz de `yard`.

#### (e) Skeleton canônico (espelha `src/modules/yard/*`) + registro em `src/app.ts`
`src/modules/jurisdiction/`: `jurisdiction.types.ts` (JurisdictionProfile + inputs Create/Update/List + enums-const `PROFILE_SCOPES`/`DAILY_MODELS`/`DAILY_CAPS` + `JurisdictionError`) · `jurisdiction.defaults.ts` (FEDERAL_DEFAULTS + resolveDefaults, ver (b)) · `jurisdiction.validators.ts` (parsers de (c)) · `jurisdiction.dto.ts` (`toJurisdictionProfileDto`/list + labels PT-BR: scope Convênio público/Contrato privado, daily_model 24h corridas/Dia-calendário, daily_cap 6 meses (art. 271 par.10)/30 diárias (Tema 124)/Ilimitado (contratual); **§allowlist NUNCA expõe `tenant_id`**) · `jurisdiction.repository.ts` (interface + `InMemoryJurisdictionRepository`) · `jurisdiction-prisma.repository.ts` (`PrismaJurisdictionRepository` sobre `Prisma.TransactionClient` + `RlsPrismaJurisdictionRepository` com **`withTenantRls`** + `createPrismaJurisdictionRepository()`) · `jurisdiction.service.ts` (`JurisdictionService`; `createDefaultJurisdictionService()` com env-gate `env.CORE_SAAS_PERSISTENCE!=="prisma"`->memory, senão import dinâmico do `-prisma.repository`; `resetJurisdictionRuntimeForTests`) · `jurisdiction.controller.ts` (`recordRequestAuditBestEffort` em toda escrita — metadados sem PII/valores: só `{scope, active}`) · `jurisdiction.routes.ts` (`JURISDICTION_PERMISSIONS`, `tenantContextMiddleware`+`createPersistentRbacContextMiddleware`, `requirePermission`) · `index.ts` (barrel). **Registro em `src/app.ts`:** `app.use("/api/v1", attachAuthenticatedActor(), createJurisdictionRouter());` — **incluir `src/app.ts` no `git add`** (senão CI `route_not_found`). Rotas sem colisão: `GET /jurisdiction-defaults` (declarada antes de qualquer `:param`), `GET/POST /jurisdiction-profiles`, `GET/PATCH /jurisdiction-profiles/:profileId`.

#### (f) Escopo PERMITIDO x PROIBIDO (caminhos exatos)
**PERMITIDO:** `prisma/schema.prisma` (1 model novo + back-relation `jurisdiction_profiles` em Tenant) · `prisma/migrations/20260834000000_add_jurisdiction/migration.sql` · `src/modules/jurisdiction/**` (novo) · `src/app.ts` (1 linha) · `src/modules/core-saas/permissions/catalog.ts` · `tests/core-saas.test.ts` · `tests/rls-tenant-isolation.test.ts` · `tests/jurisdiction.test.ts` (novo) · `prisma/seed.ts` (só `permissionDescriptions`) · `RBAC_MATRIX.md` · `docs/kpis/omega5p/KPI_PR-02.*` · `docs/juntas/J-OMEGA5P.md`.
**PROIBIDO:** `frontend/**` (UI = PR-04) · criar `impound`/`ImpoundProcess`/qualquer FK a partir de entidade inexistente (PR-05) · alterar coluna/DROP/ALTER em model existente (só back-relation em Tenant) · `yard`/`tariffs` (PR-01 mergeado / PR-03) · adicionar `notification_channels`/`vehicle_categories` (deferidos, ver decisões) · PWA/BFF público · enum-CHECK no banco · `.env`/infra/CI · `git add .` (stage por caminho) · push/PR antes do voto registrado da junta.

#### (g) Bateria (Seção 10) + testes-alvo
**Bateria:** `npx prisma validate` + `prisma migrate diff` sem drift · `npm run lint` · `npm run build` · `npm test` (inclui `core-saas`+`jurisdiction`+rls) · `npm --prefix frontend run lint/build` (confirmar **zero regressão**; PR-02 não toca front) · `node --check` dos `app.js` de KPI · `git status --short` sem nada fora de (f) · `git diff --check`.
**Testes-alvo:**
1. **`tests/jurisdiction.test.ts` (InMemory, sempre roda):** (i) **CRUD** completo (create com defaults aplicados / get / list com filtro `scope` / patch); (ii) **defaults federais corretos** — `resolveDefaults("PUBLIC_AGREEMENT")` = {10,30,60,15,ROLLING_24H,SIX_MONTHS} e `resolveDefaults("PRIVATE_CONTRACT").dailyCap === "UNLIMITED"`; create omitindo campos herda o default do scope; `TEMA_124_LEGACY_CAP === "THIRTY_DAYS_LEGACY"`; (iii) **scope público x privado** — ambos criáveis, filtro por scope isola; (iv) **validação de prazos** — `owner_notif_days` 0/negativo/`>3650` -> 400; enum inválido de scope/daily_model/daily_cap -> 400; (v) **chave natural** — 2º perfil com mesmo `name` no mesmo tenant -> 409 `JURISDICTION_CONFLICT`; (vi) `release_requirements` shape inválido -> 400; array válido persiste; (vii) escopo por tenant.
2. **`tests/rls-tenant-isolation.test.ts` (3 tenants A/B/C, DB-gated):** inserir `jurisdiction_profiles` nos 3 tenants efêmeros com **os 2 perfis** (1 PUBLIC_AGREEMENT + 1 PRIVATE_CONTRACT — cumpre J §2.4 "3 tenants + 2 perfis"); provar invisível sem `app.current_tenant_id` + cross-tenant `updateMany` count=0 + visível/intocado in-tenant. **Teardown FK-safe:** `jurisdiction_profiles` (só FK = tenant, RESTRICT) deletado **ANTES** de `tenant` — inserir o `deleteMany` de `jurisdictionProfile` junto do bloco yard->branch->tenant (linha ~2609).
3. **`tests/core-saas.test.ts`:** catálogo íntegro (deepEqual posicional com as 3 novas) + distribuição `jurisdiction:*` por papel + `jurisdiction:manage` ausente.
**KPI por PR:** `docs/kpis/omega5p/KPI_PR-02.json` + histórico + snapshot (D-KPI-PER-PR). Contagem de testes vem de **execução real no PR** (não copiar do PR-01); blocks 89->90 (novo módulo). backend cresce pelos testes novos (InMemory sempre + rls DB-gated) — número final = execução real do dev.

#### (h) Aderência normativa (artigo citado por parâmetro)
- `owner_notif_days=10` -> **Res. CONTRAN 1025/2026 art. 15** (notificação ao proprietário em <=10 dias; preferencialmente SNE — art. 282-A CTB).
- `notice_edict_day=30` -> **Res. 1025 art. 26** (edital complementar após 30 dias sem regularização+retirada, acessível >=10 dias).
- `auction_eligible_day=60` -> **CTB art. 328** (Lei 13.160/2015, veículo não reclamado em 60 dias) + **Res. 1025 art. 25**.
- `auction_edict_business_days=15` -> **Lei 14.133/2021** (edital do leilão com antecedência mínima de 15 dias úteis).
- `daily_model=ROLLING_24H` -> **Res. 1025 art. 21 par.1** (diária = período de 24h contado da entrada; nova diária só após transcorrido cada período).
- `daily_cap=SIX_MONTHS` -> **CTB art. 271 par.10** (Lei 13.281/2016; espelhado no art. 328 par.5) — teto de 6 meses de estada.
- `daily_cap=THIRTY_DAYS_LEGACY` -> **Tema Repetitivo 124/STJ** (REsp 1.104.775/RS) — estada limitada a 30 dias no regime anterior (regime intertemporal por data de entrada, ESTUDO §2.3).
- `daily_cap=UNLIMITED` -> **contratual** (custódia privada — o teto do CTB não incide fora da remoção por autoridade).
- `release_requirements` -> **CTB art. 271 par.1** (restituição exige quitação prévia de multas/taxas/remoção/estada) + **Res. 1025 arts. 23-24** (checklist documental de liberação, configurável por perfil).
- **Neutralidade white-label:** domínio/labels só perfil normativo / convênio público / contrato privado / autoridade solicitante — nenhum termo de público-alvo.
- **Junta do PR-02 (>=3):** `omega5p-avaliador` (VETO) + **`agente-dba-guardiao` OBRIGATÓRIO** (migração + CHECK estrutural) + `coordenador-de-acessos` (RBAC `jurisdiction:*`). `agente-secops` **não** requerido (não toca superfície pública/PWA).

**Decisões da fatia (registrar):** **D-Ω5P-JUR-01** chave natural = `@@unique([tenant_id, name])` (scope é atributo, não identidade) + `@@unique([tenant_id, id])` forward-compat p/ a FK composta do `ImpoundProcess` (PR-05). **D-Ω5P-JUR-02** defaults federais = constante canônica única (`jurisdiction.defaults.ts`) espelhando os `@default` das colunas; `resolveDefaults(scope)` é a foundation de charging I4 / auction I6; `PRIVATE_CONTRACT` default cap = `UNLIMITED`; `THIRTY_DAYS_LEGACY` (Tema 124) é intertemporal por data de entrada (charging PR-07), não por scope. **D-Ω5P-JUR-03** `notification_channels` (SNE/POSTAL/EDICT, SNE-only >=2027) e `vehicle_categories` **DEFERIDOS** — sem consumidor em PR-02 (canais -> PR-09/I6 trilha de notificação; categorias -> eixo da tarifa PR-03, FASE0 §5(e)); ambos aditivos quando o PR consumidor chegar (mesma disciplina do `yard:manage`; evita campo morto). **D-Ω5P-JUR-04** `release_requirements Json @default("[]")`, shape app-validado `[{code,label,required}]`; coluna nasce vazia (documentos variam por órgão), a UI/PR-04 oferta um baseline federal sugerido. **D-Ω5P-JUR-05** prazos>0 no app (primário) **E** CHECK estrutural na migração (belt-and-suspenders; NÃO enum-CHECK; `dba-guardiao` revisa).

### PR-02 — `jurisdiction` — VOTO DA JUNTA (2026-07-25) — **APROVADO 3/3** (condição de KPI sanada)
Junta (≥3): `omega5p-avaliador` (VETO) + `agente-dba-guardiao` (migração + CHECK estrutural) + `coordenador-de-acessos` (RBAC `jurisdiction:*`). `agente-secops` não requerido (sem superfície pública nesta fatia).
- **omega5p-avaliador** → **APROVADO_CONDICIONADO** (execução real): `npx prisma validate`=**valid**; `npm run check`/`build`/`git diff --check`=**limpos**; `tests/jurisdiction.test.ts` **18/18 pass**; `tests/core-saas.test.ts` **26/26 pass** (deepEqual posicional das 3 novas + distribuição por papel + `jurisdiction:manage` ausente). Suíte cheia: **34 not-ok = 100% ambientais** (`.env CORE_SAAS_PERSISTENCE=prisma` sem Postgres no sandbox: financial-entries/inventory/mobile-contracts/JWT-boot/persistence-defaults) — **ZERO jurisdiction**, não-regressão por construção (PR-02 só adiciona; o app sobe com o router novo — provado pelo boot do core-saas). Delta **+18** confirmado sobre baseline 1542 (KPI_PR-01) ⇒ **1560** (total exato a reconciliar no CI com Postgres — a full-suite trava no sandbox por retries de conexão). `migrate diff --from-migrations` NÃO executável aqui (repo sem `migration_lock.toml` + sem shadow-DB) → drift verificado por inspeção campo-a-campo (migração reproduz o schema 1:1; nomes = convenção Prisma → drift ZERO por construção; CHECK raw = mesmo padrão do yard, drift-ZERO provado em base viva no PR-01). §allowlist OK (DTO/list/defaults/auditoria NUNCA expõem tenant_id; metadado = `{scope,active}`). White-label neutro (0 termo de público-alvo/polícia). Defaults federais corretos (PUBLIC=10/30/60/15·ROLLING_24H·SIX_MONTHS; PRIVATE→dailyCap UNLIMITED; THIRTY_DAYS_LEGACY intertemporal, NÃO por scope; @default das colunas batem com FEDERAL_DEFAULTS). Status 400/409 = consistente com o padrão da casa (yard) — **aceito**. **CONDIÇÃO (MÉDIA, docs-only, idêntica à do PR-01):** `docs/kpis/omega5p/KPI_PR-02.*` **AUSENTE** (só KPI_PR-00/01 existem) → criar com números reais; sanável sem re-review de código.
- **agente-dba-guardiao** (base viva) → **APROVADO**: reproduziu up→down→re-up em `erp-postgres` com **`\d jurisdiction_profiles` byte-idêntico pós-re-up** e `_prisma_migrations` íntegro; 100% aditiva up-only (`CREATE TABLE` + 6 índices tenant-first + FK tenant→RESTRICT + CHECK `positive_deadlines` **provado vivo** [23514 em prazo=0/negativo, tx ROLLBACK] + RLS ENABLE/FORCE/policy clonada de `20260833000000:138-157`); ZERO DDL em `tenants`; `@@unique([tenant_id,id])` + `@@unique([tenant_id,name])`; nenhum DROP/ALTER destrutivo; teardown FK-safe (teste rls 1/1 vivo). Base deixada intacta (0 linhas, up-to-date). Drift repo-wide pré-existente (JSON `@default`) não toca `jurisdiction_profiles`.
- **coordenador-de-acessos** (LOGIN REAL) → **APROVADO** (0 cond): subiu o app e autenticou os **13 papéis** — matriz papel×rota×status idêntica a `yard:*`/`branches:*` (create/update só super/platform/tenant_admin/manager → 201/200; operator/field_dispatcher/technician/field_technician/viewer/auditor → 403; finance/inventory/support → 403 até no read); `jurisdiction:manage` ausente (0 permissão morta); `GET /jurisdiction-defaults` read-gated + declarado antes de `:param` (resolve ao handler, não a invalid_uuid); §allowlist sem `tenant_id` (confirmado no corpo do create). `core-saas` 26/26, `jurisdiction` 18/18. Sem nav/frontend (UI = PR-04), como esperado.
- **Decisão:** verde 3/3 (**0 CRÍTICO, 0 MÉDIA de código**; condição de KPI **SANADA** — `KPI_PR-02.json` criado + histórico + snapshot com números reais) → PR-02 mergeia. backend **1542→1560** (+18; medição independente do orquestrador CI-memória: 1566 tests / 1560 pass / 0 fail / 6 skip), smoke 850 e flutter 807 inalterados (backend-only), blocks 89→90. D-Ω5P-JUR-01..05 ratificados. Inclui backfill do PR-01 (#281 `aae8026`). Próximo: **PR-03 `tariffs` (ESTENDER)**.


### PR-03 — PLANO (planejador, 2026-07-26) — `tariffs` (ESTENDER: eixo categoria-de-veículo + escopo público-credenciado × privado-contratual)
> **Escopo:** SÓ backend + migração aditiva. **UI é PR-04** (nada de frontend aqui). Fonte: `FASE0_RECON.md` §Alvo-4 + §8 ACHADO-4 (armadilha da chave natural) + §5(e) (categorias parametrizadas) + D-Ω5P-10 + ESTUDO §9 (dupla natureza tarifária) + prompt PR-03. Fatia = **habilitar a tarifa por categoria×serviço×escopo×data** que o motor de diárias (`charging` PR-07, I4) vai resolver — entregando um `resolveTariff` **inerte/aditivo** (mesma disciplina do `findApplicable`, `tariff.repository.ts:19` — aditivo e inerte sem consumidor). **NÃO** construo o job de diárias (PR-07) nem toco `impound` (PR-05).

#### ROTA ESCOLHIDA — **Rota P: escopar o CONTÊINER (`PriceTable`), NÃO a linha (`Tariff`)** (truly-additive; `Tariff` intocado)
Confirmado por leitura da chave natural EXATA e por análise de colisão. **A categoria de veículo e o escopo entram como 2 colunas nullable no `PriceTable`; o `Tariff` NÃO é tocado; a `@@unique([tenant_id, price_table_id, service_catalog_id, customer_id])` (`schema.prisma:1419` = índice `tariffs_natural_key` `20260724000000:35-36`) NUNCA é dropada.**

Por que **NÃO** coluna em `Tariff` (Rota B, descartada): a diária de custódia é **um serviço** (`service_catalog_id` = diária de pátio) precificado por **N categorias** (moto/carro/pesado) na **mesma** `PriceTable`, tipicamente com `customer_id = NULL` (tarifa pública, sem cliente). Duas linhas (moto, carro) teriam `(tenant, price_table, service, NULL)` **idênticas nas 4 colunas da unique** → para diferenciá-las a categoria teria de **entrar na unique** = `DROP INDEX tariffs_natural_key` + `CREATE` novo = **destrutivo, VEDADO por J §5** (exatamente ACHADO-4). *(Nota técnica: no Postgres NULLs são distintos no índice único, então duas linhas `customer_id=NULL` já não colidem acidentalmente — MAS descartei explicitamente depender desse quirk: (i) quebra para tarifa por-cliente com `customer_id` setado — moto+carro do mesmo cliente colidem; (ii) degrada o valor protetivo da unique — passaria a aceitar duplicatas silenciosas. Fundação frágil, rejeitada.)* Logo, categoria-na-linha é **impossível truly-additive** — a categoria tem de migrar para um contêiner.

Por que **NÃO** `ServiceCatalog`-por-categoria (a outra rota sancionada em ACHADO-4, descartada com razão): `ServiceCatalog` é **compartilhado com `WorkOrder`** (`work_orders WorkOrder[] @relation("WorkOrderServiceCatalog")` `schema.prisma:1354`). Criar Diária-Moto / Diária-Carro / Diária-Pesado como service catalogs **polui o seletor de serviço da OS** e o `service_type`/relatórios de `WorkOrder`, força **naming-hack** no `@@unique([tenant_id, name])` (`:1358`) e gera explosão **N-serviços × M-categorias** numa tabela que dirige a criação de OS. Acoplamento nocivo. E **não resolve o escopo** (público/privado continuaria precisando de outro eixo). Rota P resolve **os DOIS eixos num lugar coerente**.

Por que **`PriceTable` é a casa certa dos dois eixos:** (1) **escopo** — a dupla natureza do ESTUDO §9 é propriedade **de tabela** (esta tabela é do convênio público × este é contrato privado), o prompt aponta "provavelmente PriceTable tem o scope, já que agrupa tarifas", e reusa **o mesmo enum** do `JurisdictionProfile.scope` (`PUBLIC_AGREEMENT|PRIVATE_CONTRACT`, `20260834000000:33`); (2) **categoria** — `PriceTable` é o **contêiner versionado** (`valid_from/valid_to`, `version`, status draft|published|archived, `schema.prisma:1372-1374`) e **NÃO** é compartilhado com `WorkOrder` → escopar por categoria não polui nada; uma Tabela de Diárias — Motos — Convênio X (2026) como tabela publicada distinta é idiomático; (3) **retrocompatibilidade** — toda `PriceTable` existente nasce `scope=NULL`, `vehicle_category=NULL` = vale para TODAS as categorias/escopos → o `findApplicable`/service-quotes de hoje resolve **exatamente igual** (regressão ZERO por construção). **Trade-off honesto (registrar):** uma categoria por tabela publicada → **fragmentação** (3 tabelas onde a norma às vezes lista 1 com 3 preços); é ergonomia de admin, **não** correção — mitigada no **PR-04** (editor-matriz / clonar-tabela-por-categoria por trás de uma tela). Aceito.

#### (a) Delta ADITIVO exato — 2 colunas + 1 índice em `PriceTable`; `Tariff` intocado; migração `20260835000000`
Última migração = `20260834000000_add_jurisdiction` ⇒ próxima = **`20260835000000_extend_price_tables_scope_category`** (aditiva, R6). **Confirmado latest+1.** *(O nome reflete a TABELA alterada — `price_tables`; o PR segue PR-03 tariffs (ESTENDER) no nível da rodada. Divergência PLANO→realidade registrada: o delta truly-additive pousa no CONTÊINER `price_tables`, NÃO na tabela `tariffs`, PRECISAMENTE para preservar a `tariffs_natural_key`.)*

**Prisma — `model PriceTable` (`schema.prisma:1365`) ganha 2 campos nullable + 1 índice:**
```prisma
  // Ω5P PR-03 — dupla natureza tarifária (ESTUDO §9) + eixo categoria (FASE0 §5e). Ambos NULLABLE:
  scope            String?   // PUBLIC_AGREEMENT | PRIVATE_CONTRACT (app-validado; MESMO enum de JurisdictionProfile.scope). NULL = vale para os dois.
  vehicle_category String?   // app-code (MOTORCYCLE|CAR|TRUCK|... parametrizado por perfil, D-Ω5P-TAR-05). NULL = vale para todas as categorias.
  // ...campos existentes inalterados...
  @@index([tenant_id, status, scope, vehicle_category])  // suporta a resolução escopada (equality-prefix); tenant_id 1º
```
`Tariff` (`schema.prisma:1393`), `ServiceCatalog` (`:1334`) e as chaves naturais **permanecem byte-idênticos**. Nenhuma coluna nova em `tariffs`, nenhum DROP/ALTER de unique/índice existente.

**Migração `20260835000000_extend_price_tables_scope_category` (aditiva pura, up-only):**
1. `ALTER TABLE "price_tables" ADD COLUMN "scope" TEXT;` (nullable, sem default — legado = NULL = ambos).
2. `ALTER TABLE "price_tables" ADD COLUMN "vehicle_category" TEXT;` (nullable, sem default — legado = NULL = todas).
3. `CREATE INDEX "price_tables_tenant_scope_category_idx" ON "price_tables"("tenant_id","status","scope","vehicle_category");` (tenant_id 1º; suporta o lookup publicado×escopo×categoria).
4. **SEM enum-CHECK** (scope/category validados na APP — padrão FASE0 §3.5, idêntico ao `jurisdiction`). **SEM toque em `tariffs`.**
5. **RLS já existe e é HERDADA** — `price_tables` já tem ENABLE+FORCE+policy `price_tables_tenant_isolation` (`20260723000000:38-43`); `ADD COLUMN` não altera RLS (nada a refazer). *(Confirmado o pedido do prompt: **`tariffs` JÁ TEM RLS**, `20260724000000:53-58`; e `price_tables` também.)*
6. Rollback runbook (comentado): `ALTER TABLE "price_tables" DROP COLUMN IF EXISTS "vehicle_category", DROP COLUMN IF EXISTS "scope"; DROP INDEX IF EXISTS "price_tables_tenant_scope_category_idx";` (reverte só o aditivo; dado legado intacto — colunas nasceram NULL).

#### (b) `resolveTariff({tenantId, serviceCatalogId, vehicleCategory, scope, date})` — inerte/aditivo, `findApplicable` INTOCADO
O charging (PR-07) precisa da **tarifa vigente por categoria+serviço+escopo na DATA de cada acumulação**. Chave do desenho: o `findApplicable(tenantId, serviceCatalogId, customerId, publishedPriceTableIds)` (`tariff.repository.ts:70`, `tariff-prisma.repository.ts:61`) **já recebe o conjunto de tabelas publicadas de FORA** (composto em `service-quote.service.ts:365-387` via `resolvePublishedPriceTableIds`). Logo, o novo resolvedor **não toca** `findApplicable` nem `pickApplicableTariff` (`tariff.repository.ts:154`) — só compõe **conjuntos publicados diferentes**:
- **Novo** `resolvePublishedPriceTableIdsScoped(tenantId, {scope, category, date})` no price-table repo/serviço (método aditivo; o `resolvePublishedPriceTableIds` legado do service-quotes fica intocado → **zero regressão**): filtra `status = published` **E** janela `valid_from/valid_to` cobre `date` **E** `scope` casa **E** `vehicle_category` casa.
- **`resolveTariff` = duas passadas (específico vence genérico)**, preservando o desempate existente sem alterá-lo: **Passada 1** conjunto `scope=exato ∧ category=exato` → `findApplicable(serviceCatalogId, customerId, set)`; se achou, retorna. **Fallback graceful:** afrouxa para `category IS NULL` (tabela geral), depois `scope IS NULL`, na ordem específico→geral. Assim uma tabela **categoria-específica vence** a genérica sem precisar ensinar categoria ao `pickApplicableTariff`.
- **`date`** entra como o agora da janela de vigência (o motor passa a data de cada diária → regra vigente na data de entrada, I4/D-Ω5P-03). **Correção retroativa** = novo lançamento/ajuste (I2), nunca update de tarifa vigente.
- **Inércia:** em PR-03 o `resolveTariff` é exercitado só por teste; o consumidor real (job `charging.accrue-daily`) chega no PR-07 — igualzinho ao `findApplicable`, que nasceu inerte no Ω3-a.

#### (c) RN-TAR-01 — NÃO-sobreposição de vigências por (escopo + categoria + serviço)
Invariante: para um mesmo `(tenant, scope, vehicle_category, service_catalog_id, customer-bucket)` **no máx. 1 tarifa aplicável em qualquer instante**. Enforce **app-level** (mesma disciplina do anti-refaturamento) em **dois pontos**: (i) **publicação da `PriceTable`** — na transição draft→published (`price-table.service.ts:74-95`, `PRICE_TABLE_STATUS_TRANSITIONS`): recusar se existir **outra** tabela publicada com o mesmo `(scope, vehicle_category)` cuja **janela de vigência se sobreponha** E que compartilhe ≥1 `service_catalog_id` → **409 `TARIFF_OVERLAP`**; (ii) **create/update de `Tariff`** dentro de tabela publicada — mesma checagem por serviço. **Por que não constraint de banco:** a janela efetiva é **intersecção de DUAS tabelas** (`PriceTable.valid_*` ∩ `Tariff.valid_*`); um `EXCLUDE USING gist` só enxerga UMA tabela e exigiria `btree_gist` + coluna range gerada = **fora do aditivo mínimo**. RN-TAR-01 fica app-level + **property-based tests**; a hardening DB-EXCLUDE fica **deferida** (flag ao `dba-guardiao` se um dia perseguida). NULL é tratado como curinga na checagem (cobre o legado sem falso-positivo entre serviços distintos).

#### (d) Permissões — **REUSA, cria ZERO**
Confirmado por leitura: `tariffs:read/create/update` (`catalog.ts:51/74/91`, `tariff.routes.ts:16-20`) e `price_tables:read/create/update` (`catalog.ts:45/68/85`, `price-table.routes.ts:16-19`) **já existem** e já estão distribuídos pelos papéis. Aceitar `scope`/`vehicle_category` no create/update de `PriceTable` usa `price_tables:create/update`; ler tabelas escopadas usa `price_tables:read`; o `resolveTariff` é serviço interno (sem rota HTTP nova em PR-03). **Nenhuma permissão nova; nenhum toque em `RBAC_MATRIX.md`/`catalog.ts`/`seed.ts`.**

#### (e) Escopo PERMITIDO × PROIBIDO (caminhos exatos)
**PERMITIDO:** `prisma/schema.prisma` (2 colunas nullable + 1 `@@index` em `PriceTable` — nada mais) · `prisma/migrations/20260835000000_extend_price_tables_scope_category/migration.sql` · `src/modules/price-tables/**` (validators de `scope`/`vehicle_category`; dto passthrough com labels PT-BR; repo/prisma-repo aceitam os 2 campos; **novo** `resolvePublishedPriceTableIdsScoped`; guard RN-TAR-01 na publicação) · `src/modules/tariffs/**` (**novo** `tariff-resolution.ts` com `resolveTariff` + tipos; dto/types passthrough — **sem** tocar `findApplicable`/`pickApplicableTariff`) · `tests/tariffs.test.ts` · `tests/price-tables.test.ts` · `tests/tariff-resolution.test.ts` (novo) · `tests/rls-tenant-isolation.test.ts` · `docs/kpis/omega5p/KPI_PR-03.*` · `docs/juntas/J-OMEGA5P.md`.
**PROIBIDO:** **DROP/recreate de `tariffs_natural_key` ou de QUALQUER unique/índice de `tariffs`** · **QUALQUER coluna na TABELA `tariffs`** · alterar `pickApplicableTariff`/`findApplicable` (só compor por cima) · multiplicar `ServiceCatalog` por categoria (rota descartada) · criar permissão nova · `charging`/`impound`/job de diárias (PR-05/07 — aqui só o resolvedor inerte) · `frontend/**` (UI = PR-04) · enum-CHECK no banco · `.env`/infra/CI · `git add .` (stage por caminho) · push/PR antes do voto registrado da junta.

#### (f) Bateria (Seção 10) + testes-alvo
**Bateria:** `npx prisma validate` + `prisma migrate diff` sem drift (só 2 ADD COLUMN + 1 índice em `price_tables`; `tariffs` inalterado) · `npm run lint` · `npm run build` · `npm test` (inclui `tariffs`+`price-tables`+`tariff-resolution`+`service-quotes`+rls) · `npm --prefix frontend run lint/build` (**zero regressão**; PR-03 não toca front) · `node --check` dos `app.js` de KPI · `git status --short` sem nada fora de (e) · `git diff --check`.
**Testes-alvo:**
1. **`tests/tariff-resolution.test.ts` (novo, InMemory + property-based):** (i) **por categoria** — tabela MOTORCYCLE vence tabela NULL (geral) para o mesmo serviço; categoria sem tabela específica cai no fallback geral; (ii) **por escopo** — PUBLIC_AGREEMENT vs PRIVATE_CONTRACT isolam; scope NULL é curinga; (iii) **por data** — `date` dentro/fora da janela `valid_from/valid_to` da `PriceTable` seleciona/exclui; duas tabelas vigentes em datas diferentes → a de cada data; (iv) **property-based** — janelas/scopes/categorias aleatórios ⇒ `resolveTariff` retorna **≤1** e sempre a **mais específica**; determinístico (paridade InMemory×Prisma como no Ω3-a).
2. **RN-TAR-01 (em `price-tables.test.ts`):** publicar 2ª tabela mesmo `(scope, category)` com janela sobreposta + serviço compartilhado → **409 `TARIFF_OVERLAP`**; janelas disjuntas → OK; property-based de sobreposição garante ≤1 aplicável.
3. **`tests/tariffs.test.ts` + `service-quotes` (REGRESSÃO ZERO):** todos os testes existentes de `findApplicable`/congelamento de orçamento **permanecem verdes intocados** (a prova de que a rota não quebrou o caminho vivo — `resolvePublishedPriceTableIds` legado inalterado).
4. **`tests/rls-tenant-isolation.test.ts` (3 tenants A/B/C + 2 perfis):** inserir `price_tables` com `scope=PUBLIC_AGREEMENT` e `scope=PRIVATE_CONTRACT` + `vehicle_category` variados nos 3 tenants; provar isolamento (invisível sem `app.current_tenant_id`; cross-tenant `updateMany` count=0). Teardown FK-safe (tariffs→price_tables já ordenado; colunas novas não mudam FK).
**KPI por PR:** `docs/kpis/omega5p/KPI_PR-03.json` + histórico + snapshot (D-KPI-PER-PR); contagem de **execução real** no PR (não copiar do PR-02); blocks 90→90 (estende módulo existente, não cria bloco novo — a critério do dev/execução real).

#### (g) Aderência normativa (artigo citado)
- **Res. CONTRAN 1025/2026 art. 21** (diárias) — o `resolveTariff` entrega a **tarifa vigente na data** que o motor de diárias (I4) acumula; a vigência por `valid_from/valid_to` da `PriceTable` materializa a regra vigente na data de entrada (regime intertemporal, D-Ω5P-03).
- **ESTUDO §9 — dupla natureza tarifária** (público-credenciado × privado-contratual) = o eixo `scope` na `PriceTable`, reusando o enum do `JurisdictionProfile.scope` (coerência com PR-02); o perfil normativo dá prazos/teto, a tabela tarifária dá **preço** — separação limpa.
- **CTB art. 271 §1º** — os valores que a liberação (I5, PR-10) exige quitar (remoção/estada) saem desta resolução; **art. 328 §6º** (cascata do leilão, I7, PR-14) consome os mesmos débitos acumulados.
- **Neutralidade white-label:** labels só convênio público / contrato privado / categoria de veículo / tabela de valores — nenhum termo de público-alvo/polícia.
- **Junta do PR-03 (≥3):** `omega5p-avaliador` (VETO) + **`agente-dba-guardiao` OBRIGATÓRIO** (migração — mesmo sendo `ADD COLUMN`, confirma aditividade/no-drift/RLS herdada e que `tariffs_natural_key` NÃO foi tocada) + (opcional) `coordenador-de-acessos` só para ratificar que **nenhuma permissão nova** entrou. `agente-secops` **não** requerido (sem superfície pública/PWA).

**Decisões da fatia (registrar):** **D-Ω5P-TAR-01** rota = escopar o CONTÊINER `PriceTable` (2 colunas nullable), `Tariff` e `tariffs_natural_key` **intocados** — categoria-na-linha é impossível truly-additive (exigiria dropar a unique, VEDADO ACHADO-4); `ServiceCatalog`-por-categoria descartado (polui `WorkOrder`). **D-Ω5P-TAR-02** `scope` reusa o enum `PUBLIC_AGREEMENT|PRIVATE_CONTRACT` do `JurisdictionProfile`; `scope`/`vehicle_category` NULL = curinga vale-para-todos → retrocompat total (regressão ZERO). **D-Ω5P-TAR-03** `resolveTariff` = composição em **duas passadas** (específico→geral) reusando `findApplicable`/`pickApplicableTariff` **sem alterá-los**; inerte até o `charging` PR-07 (padrão do `findApplicable` Ω3-a). **D-Ω5P-TAR-04** RN-TAR-01 (não-sobreposição) é **app-level** + property-tests; DB-EXCLUDE deferido (janela cross-tabela + additive-only). **D-Ω5P-TAR-05** `vehicle_category` = app-code parametrizado por perfil (catálogo de categorias por `JurisdictionProfile` deferido, FASE0 §5e / D-Ω5P-JUR-03) — validado app-level, sem hardcode/enum-CHECK.

### PR-03 — `tariffs` (ESTENDER) — VOTO DA JUNTA (2026-07-26) — **APROVADO 3/3 após 2 ciclos de reprovação adversarial**
Junta (≥3): `omega5p-avaliador` (VETO) + `agente-dba-guardiao` (migração) + `critico-adversarial` (ataque à lógica de resolução/cobrança). A junta **NÃO foi unânime na 1ª rodada** — é o valor da junta adversarial.
- **agente-dba-guardiao** → **APROVADO**: migração aditiva up-only (2 `ADD COLUMN` nullable + 1 índice tenant-first); up→down→re-up reproduzido na base viva com **10 linhas legadas byte-idênticas (md5 igual)**, colunas NULL nas legadas, RLS forced preservada (herdada, não recriada), **`tariffs_natural_key` intocada**, drift-zero.
- **omega5p-avaliador** → APROVADO_CONDICIONADO (só KPI) → **reconfirmado APROVADO** pós ciclo-1: F1/F2/F3/F4/F8 corretos; **prova clean-room `git stash` = REGRESSÃO ZERO** (Grupo B 124/134 idêntico com/sem o PR → os 10 fails são seed-ambientais, não do PR-03); zero permissão nova (core-saas/catalog/RBAC/seed intocados); §allowlist DTO sem `tenant_id`; `findApplicable`/`pickApplicableTariff` só ganharam `asOf?` opcional (freeze legado byte-idêntico).
- **critico-adversarial** → **REPROVADO → ciclo-1 → ciclo-2 → APROVADO**. Pegou **3 bugs de COBRANÇA** que os outros 2 não viram (dossiê `agent-orchestration/omega/reprovacoes/R-omega5p-pr03-ciclo1.md`): **F1 [CRÍTICO]** data-partida (`findApplicable` avaliava a janela própria da Tariff contra `new Date()` em vez da data pedida → cobra fora de vigência, fatal p/ I4); **F2 [CRÍTICO, 2 vetores]** RN-TAR-01 burlável em tabela publicada — ciclo-1 editar bucket/janela, ciclo-2 **reativação `is_active` false→true provada empíricamente** (2 tabelas ativas no mesmo bucket → cobra 200 em vez de 100); **F3/F4 [ALTO]** (service-quote cego a escopo; `limit:100` capava o invariante); **F8 [plano]** (customer omitido no bucket). Consertos cirúrgicos ciclo-1+ciclo-2 (Rota P preservada) → **todos os 3 CRÍTICOS fechados com teste** (F1 janela por data; F2 PATCH-de-publicada→409 e reativação→409; F3 filtro bucket legado; F4 `findPublishedInBucket` server-side; F8 bucket `service|customer`). F5/F6/F7 documentados (risco residual concorrência / prioridade escopo>categoria / contrato PR-07 fail-closed).
- **Decisão:** verde 3/3 (protocolo §C7.4 — 2 ciclos de conserto, sem reabrir premissa). backend **1560→1585** (+25 `tariffs-scope-category` incl. os testes de reprovação; medição independente do orquestrador CI-memória 1591/1585/6-skip), smoke 850 e flutter 807 inalterados (backend-only), blocks **90→91**. D-Ω5P-TAR-01..06 ratificados. Inclui backfill do PR-02 (#282 `d0be90d`). Próximo: **PR-04 UI admin** (`/patios` — pátios/mapa de áreas, perfis, tarifas).

### PR-04 — PLANO (planejador, 2026-07-26) — UI de administração `/patios` (PRIMEIRO PR de FRONTEND; fecha a Fase 1)
> **Escopo:** SO frontend do **console autenticado** (React, `frontend/**`) + **1 toque backend cirurgico** no NAVIGATION_REGISTRY (governed paths / esconde-fino). **NAO** os PWAs (Fase 5), **NAO** o mapa de ocupacao por processo (PR-08, precisa do `impound`). Torna visivel o que PR-01/02/03 construiram no backend. Fonte: `FASE0_RECON.md` §Alvo-7 (nav/RBAC/registry) + charter §6 (`/patios`) + leitura REAL de `frontend/src/modules/registry/*`, `App.tsx`, `appSidebarNav.ts`, `AppShell.tsx`, `navigation.registry.ts`/`.service.ts`, `navigation-provisioning.test.ts`, e os modulos backend mergeados `yard`/`jurisdiction`/`price-tables`+`tariffs`.

#### (a) Convencao de modulo frontend CONFIRMADA por leitura + tela de tarifas (ESTENDE vs CRIA)
Padrao canonico de cadastro denso (confirmado em `registry/branches/*`, `registry/tariffs/*`, `registry/price-tables/*`): por entidade **`*.types.ts` + `*.adapter.ts` (labels/format/validate/filter) + `*.service.ts` (CRUD via `apiRequest`; `isMockMode()`->dataset vazio D-007; `catch`->fallback vazio) + `use<Entidade>.ts` (hook de listagem, carrega a janela `limit` uma vez; busca/ordenacao/paginacao client-side na `useDenseList`) + `pages/<Nome>Page.tsx` (`page-heading page-heading--row`: titulo+subtitulo+acoes a direita, `SearchBar`+`Button` primario; `DenseTable`+`DenseListPagination`; estados `Skeleton`/`EmptyState`/`Alert`; `useAutoRefresh`) + `components/<Entidade>FormModal.tsx` (`Modal`+`form`; validate client-side; `ApiError.status===409`->msg PT-BR; campo/select desabilitado p/ chave natural imutavel na edicao — licao veto B2)**. Context = `{token,tenantId,branchId,role,permissions}`; RBAC de UI por `usePermissions().can("x:create"/"x:update")` (backend e a autoridade). Teste = `frontend/tests/<slug>.smoke.test.tsx` (SSR `renderToString` + `MemoryRouter`; asserts cabecalho/acoes/estado-vazio/PT-BR/`doesNotMatch(/\btenant\b/i)`/gate por permissao).
- **Tarifas — decisao: ESTENDE (nao cria). CONFIRMADO por leitura que JA EXISTEM 2 modulos frontend:** `registry/price-tables` (`TabelasValoresPage`, rota `/cadastros/tabelas-valores`) e `registry/tariffs` (`TarifasPage`, rota `/cadastros/tarifas`). **O delta do PR-03 (`scope` publico/privado + `vehicle_category`) pousa no CONTEINER `PriceTable`, NAO na linha `Tariff`** (D-Ω5P-TAR-01) — confirmado: `src/modules/price-tables/price-table.dto.ts` expoe `scope`/`scopeLabel`/`vehicleCategory` (list+detail) e o `POST/PATCH /price-tables` os aceita; o **`Tariff` DTO segue intocado**. => a superficie a estender e **exclusivamente o modulo `price-tables`** (nao `tariffs`): +2 campos no `price-tables.types.ts` (`scope?`, `vehicleCategory?`), 2 `<Select>` no `PriceTableFormModal` (Escopo: Todos/Convenio publico/Contrato privado; Categoria de veiculo: curada — Todas/Motocicleta/Automovel/Caminhao-Pesado), 2 colunas/filtros na `TabelasValoresPage`, passthrough no adapter/service. **`vehicle_category` = app-code livre no backend** (`[A-Za-z0-9_]`, <=40, SEM enum — D-Ω5P-TAR-05; catalogo por perfil deferido) => a UI oferece **Select curado** (conveniencia, NAO regra hardcoded — registrar). O modulo `tariffs` (linha) **nao muda** (categoria/escopo herdados da tabela-mae).

#### (b) Rotas em `App.tsx` (sob `PermissionGuard`) + sidebar + **governed paths (esconde-fino)**
**Rotas novas (lazy, dentro do `<AppShell>`):**
- `/patios` -> `<Navigate to="/patios/patios" replace />` (indice).
- `/patios/patios` -> `PatiosPage` (dense-list de Yard: Nome/Endereco/Timezone/Situacao) — `PermissionGuard permissions={["yard:read"]}`.
- `/patios/patios/:yardId` -> `PatioDetailPage` (drilldown: arvore de areas quadra->corredor->fileira + vagas + resumo de ocupacao read-only) — `["yard:read"]`. *(Namespace `/patios/patios/:yardId` evita ambiguidade com `/patios/perfis` e `/patios/tarifas`.)*
- `/patios/perfis` -> `PerfisPage` (dense-list de JurisdictionProfile: Nome/Escopo/Modelo-diaria/Teto/prazos) — `["jurisdiction:read"]`.
- `/patios/tarifas` -> **reusa** `TabelasValoresPage` (estendida) — `["price_tables:read"]`. *(Alias de rota renderizando o MESMO componente; SEM fork de pagina. Decisao da fatia — a junta pode preferir so apontar a sidebar ao `/cadastros/tabelas-valores` existente.)*
**Sidebar (`appSidebarNav.ts`) — NOVO grupo `G_PATIOS = { label: "PATIOS", items: [PATIOS, PERFIS, TABELA_VALORES_PATIO] }`** (espelha como o Ω4C criou o grupo `TELEMETRIA`): itens `Patios`->`/patios/patios` (icon `Warehouse`), `Perfis Normativos`->`/patios/perfis` (icon `Scale`), `Tabela de Valores`->`/patios/tarifas` (icon `Coins`); icones novos importados de `lucide-react`. Adicionar os **3 paths a `MVP_NAV_PATHS`**. Grupo entra em `admin`+`gestor` (menu completo); `dispatcher` recebe subconjunto read-only (papeis de campo tem `yard:read`/`jurisdiction:read`/`price_tables:read`); `finance`/`support` **nao** (sem as permissoes — e o esconde-fino oculta de qualquer forma). Distribuicao exata = `coordenador-de-acessos`.
**Governed paths backend (esconde-fino — licao Ω4C PR-14/15/20) = o toque backend do PR-04:** em `src/modules/navigation/navigation.registry.ts` +3 itens `patios.yards`(`/patios/patios`, `requiredPermissions:["yard:read"]`), `patios.profiles`(`/patios/perfis`, `["jurisdiction:read"]`), `patios.tariffs`(`/patios/tarifas`, `["price_tables:read"]`), todos `group:"tenant"`, `tenantOnly:true`, `status:"implemented"`, **SEM `requiredModules`** (gate UNICO por permissao — igual a `operations.quotes`/telemetria/central; assim `getGovernedNavigationPaths()` os inclui e `computeHiddenNavPaths` OCULTA de quem nao tem a permissao, com o backend barrando no 403). `relatedEndpoints` = os CRUD de `yards`/`jurisdiction-profiles`/`price-tables`. **Sem permissao nova.** `/patios/patios/:yardId` (drilldown) **nao** e governed (nao e item de sidebar; gate pelo route-guard).

#### (c) Neutralidade white-label + estados obrigatorios + §11 fidelidade
- **PT-BR de negocio, ZERO termo tecnico e ZERO "policia":** Patio/Area/Vaga/Perfil normativo/Convenio publico/Contrato privado/Tarifa/Categoria de veiculo/Autoridade solicitante. Labels PT-BR vem dos DTO backend (`kindLabel` Quadra/Corredor/Fileira, `vehicleClassLabel` Qualquer/Motocicleta/Pesado, `statusLabel` Livre/Ocupada/Bloqueada, `scopeLabel`, `dailyModelLabel`, `dailyCapLabel`) — a UI **reusa** os `*Label` do backend, nao recria. Teste `doesNotMatch(/\btenant\b/i)` e `doesNotMatch(/pol[ii]cia/i)`.
- **Estados obrigatorios (§7):** `Skeleton` (loading 1a carga), `EmptyState` honesto (D-007: mock->vazio, nunca fabrica linha; texto "Cadastre o primeiro patio…"), `Alert` (error + Tentar novamente), acesso-negado (o `PermissionGuard` ja barra; acoes Novo/Editar escondidas sem `:create/:update`).
- **§11 fidelidade:** `page-heading page-heading--row` = titulo (Patios/Perfis Normativos/Tabela de Valores) + subtitulo + acoes a direita (`SearchBar` + `Button` primario Novo patio/Novo perfil/Nova tabela). Sem andaime de dev, sem codigo de tela, sem path como subtitulo. Acentuacao correta na entrega real.
- **Detalhe do patio (drilldown):** `PatioDetailPage` = header + `Card` Areas (arvore: BLOCK->CORRIDOR->ROW via `parentId`; FormModal cria area com `kind`/`name`/`covered`/`vehicleClass`/`parentId`) + `Card` Vagas (por area: `code`/`covered`/`vehicleClass`/`status`; FormModal). **Status da vaga na UI so FREE<->BLOCKED** (bloqueio operacional via `PATCH /yard-spots/:spotId`); **OCCUPIED e read-only** (ocupacao por processo exige `allocate` HTTP = PR-06; o mapa por processo = PR-08). `GET /yards/:yardId/occupancy` alimenta um resumo read-only (total/livres/ocupadas/bloqueadas). **PROIBIDO** simular ocupacao por processo aqui.
- **Perfis:** `PerfisPage` + `PerfilFormModal` que, ao escolher o Escopo num perfil NOVO, chama **`GET /jurisdiction-defaults?scope=`** e **pre-preenche** os prazos (10/30/60/15) + modelo/teto de diaria (o backend ja devolve `ownerNotifDays`/`noticeEdictDay`/`auctionEligibleDay`/`auctionEdictBusinessDays`/`dailyModel`/`dailyCap` + labels); `release_requirements` = **editor de lista [{code,label,required}]** (adicionar/remover/marcar obrigatorio), com botao "Usar baseline federal" (oferta os 4 itens de `FEDERAL_RELEASE_REQUIREMENTS`, sem aplicar automatico — coluna nasce vazia, D-Ω5P-JUR-04). Nome = chave natural (409 `JURISDICTION_CONFLICT`->msg PT-BR).

#### (d) Escopo PERMITIDO x PROIBIDO (caminhos exatos)
**PERMITIDO:** `frontend/src/modules/patios/**` (novo: `yards/` + `profiles/` — types/adapter/service/hook/pages/components espelhando `registry/branches`) · **ESTENDE** `frontend/src/modules/registry/price-tables/{price-tables.types.ts,price-tables.adapter.ts,price-tables.service.ts,components/PriceTableFormModal.tsx,pages/TabelasValoresPage.tsx}` (+`scope`+`vehicleCategory`) · `frontend/src/App.tsx` (rotas novas) · `frontend/src/layouts/appSidebarNav.ts` (grupo PATIOS + `MVP_NAV_PATHS` + import de icones) · `frontend/tests/patios-yards.smoke.test.tsx` + `frontend/tests/patios-perfis.smoke.test.tsx` + `frontend/tests/price-tables-scope-category.smoke.test.tsx` (novos) · **1 toque backend:** `src/modules/navigation/navigation.registry.ts` (+3 governed) + `tests/navigation-provisioning.test.ts` (matriz por papel) · `docs/kpis/omega5p/KPI_PR-04.*` · `docs/juntas/J-OMEGA5P.md`.
**PROIBIDO:** mapa de ocupacao por processo / `allocate`/`vacate`/`move` na UI (PR-08/06) · qualquer `impound`/`ImpoundProcess` · os 2 PWAs (`authority-portal`/`owner-portal`) e seus BFFs (Fase 5) · **qualquer backend de produto alem do governed path** (nada em `yard`/`jurisdiction`/`price-tables`/`tariffs` backend — PR-01/02/03 fechados) · permissao nova (reusa `yard:*`/`jurisdiction:*`/`price_tables:*`) · tocar `registry/tariffs/*` (a linha `Tariff` nao muda) · `.env`/infra/CI · `git add .` (stage por caminho) · push/PR antes do voto registrado da junta.

#### (e) Bateria (Secao 10) + testes-alvo
**Bateria:** `npm --prefix frontend run check` · `npm --prefix frontend run build` · `npm --prefix frontend run test:smoke` · **backend** (so porque toca o registry): `npm run lint` · `npm run build` · `npm test` (inclui `navigation-provisioning`) · `node --check` dos `app.js` de KPI · `git status --short` sem nada fora de (d) · `git diff --check`.
**Testes-alvo:**
1. **`patios-yards.smoke.test.tsx`:** render de `PatiosPage` (cabecalho Patios + subtitulo + Novo patio + `EmptyState` D-007 mock-vazio) · sem `yard:create` -> esconde Novo patio · `doesNotMatch(/\btenant\b/i)` e `doesNotMatch(/pol[ii]cia/i)` · §2.8 nunca renderiza `tenant_id`/`branchId` cru como dado.
2. **`patios-perfis.smoke.test.tsx`:** render de `PerfisPage` + `PerfilFormModal` (labels de escopo/diaria/teto em PT-BR; editor de `release_requirements`; pre-preenchimento por `jurisdiction-defaults` mockado) · gate `jurisdiction:read`/`:create`.
3. **`price-tables-scope-category.smoke.test.tsx`:** o `PriceTableFormModal` renderiza os 2 `<Select>` (Escopo/Categoria) com Todos/Todas (NULL curinga) + labels PT-BR; a lista mostra as 2 colunas; regressao ZERO nas smoke existentes de price-tables/tariffs.
4. **`navigation-provisioning.test.ts` (backend):** `getGovernedNavigationPaths()` inclui `/patios/patios`,`/patios/perfis`,`/patios/tarifas`; **matriz por papel computada de `ROLE_PERMISSIONS`** (nao hardcoded) — quem tem `yard:read`/`jurisdiction:read`/`price_tables:read` VE o path no menu, quem nao tem NAO ve (finance/inventory/support fora); espelha os blocos de telemetria/central.
**KPI por PR:** `docs/kpis/omega5p/KPI_PR-04.json` + historico + snapshot (D-KPI-PER-PR); contagem de **execucao real** (frontend smoke sobe pelos 3 novos; backend sobe pelos testes de matriz do registry); blocks 91->92 (novo modulo frontend `patios`).

#### (f) Sem permissao nova + sem migracao
**Nenhuma permissao nova** (reusa `yard:read/create/update`, `jurisdiction:read/create/update`, `price_tables:read/create/update`, `tariffs:read` ja distribuidas em PR-01/02/03). **Nenhuma migracao** (frontend + registry TS puro) => **NAO dispara `agente-dba-guardiao`**. O toque em `navigation.registry.ts` e adicao de 3 itens governados (dado, nao DDL).

#### (g) Aderencia normativa (artigo citado)
- A UI materializa o **cadastro fisico do patio** (areas/vagas) exigido pela **Res. CONTRAN 1025/2026 art. 9º** (centro de custodia mantem "local de guarda" com sistema homologado e informacoes permanentemente atualizadas) — a tela e a superficie onde o operador mantem esse cadastro; **art. 14** (o Termo registra o local de guarda cuja unidade — a vaga — e gerida aqui).
- Os **Perfis Normativos** expoem os parametros federais (art. 15 notificacao 10d; art. 25/26 60d/edital; art. 21 §1º diaria 24h; CTB art. 271 §10 teto; Lei 14.133 edital 15 d.u.) e as **exigencias de liberacao** (CTB 271 §1º / Res. 1025 arts. 23-24) como dado editavel — a UI e o painel de parametrizacao nacional (ESTUDO §9), sem hardcode.
- As **Tarifas** expoem a dupla natureza (publico-credenciado x privado-contratual) + categoria de veiculo (ESTUDO §9), a base que o motor de diarias (I4, PR-07) resolve por data.
- **Neutralidade white-label:** so patio/area/vaga/perfil/convenio publico/contrato privado/autoridade solicitante — nenhum termo de publico-alvo/policia.
- **Junta do PR-04 (>=3):** `omega5p-avaliador` (VETO) + `cognicao-visual` (fidelidade §11 / tela-morta) + `coordenador-de-acessos` (nav/governed path/esconde-fino/matriz por papel). **`agente-secops` NAO** requerido (nao e PWA/superficie publica). `agente-dba-guardiao` **nao** (sem migracao).

**Decisoes da fatia (registrar):** **D-Ω5P-UI-01** modulo frontend cohesivo `frontend/src/modules/patios/{yards,profiles}` (dominio SIGPRV; `price-tables` estendido fica em `registry`, onde nasceu). **D-Ω5P-UI-02** Tarifas = ESTENDE `price-tables` (o delta scope/categoria vive no CONTEINER `PriceTable`; `Tariff`/`registry/tariffs` intocados) — `/patios/tarifas` reusa `TabelasValoresPage` (alias, sem fork). **D-Ω5P-UI-03** ocupacao por processo e **read-only** no PR-04 (status de vaga so FREE<->BLOCKED); `allocate/vacate/move` + mapa por processo = PR-06/08. **D-Ω5P-UI-04** `/patios/*` = governed paths sem `requiredModules` (esconde-fino por permissao pura, licao Ω4C); backend segue a autoridade (403). **D-Ω5P-UI-05** `vehicle_category` na UI = Select curado (conveniencia PT-BR), NAO enum de dominio (catalogo por perfil deferido, D-Ω5P-TAR-05/JUR-03).

### PR-04 — UI admin `/patios` — VOTO DA JUNTA (2026-07-26) — **APROVADO_CONDICIONADO 3/3** (avaliador tem VETO; NAO exercido)
Junta (>=3): `omega5p-avaliador` (VETO) + `cognicao-visual` (fidelidade §11) + `coordenador-de-acessos` (nav/governed/matriz por papel). `agente-secops` NAO requerido (sem PWA/superficie publica). `agente-dba-guardiao` NAO (sem migracao — confirmado: `prisma/**` e migrations intocados).

- **omega5p-avaliador → APROVADO_CONDICIONADO** (diff REAL revisado; bateria Secao 10 executada, numeros abaixo). Uma linha por eixo:
  - **Bateria (execucao real):** `frontend check` (tsc) limpo · `frontend build` OK · `frontend test:smoke` **861/861 pass, 0 fail** (baseline 850 → +11; os 3 arquivos novos somam EXATAMENTE 11 — delta honesto) · `navigation-provisioning` (backend) **61/61 pass, 0 fail** (baseline 33 → +28; matriz DERIVADA de `ROLE_PERMISSIONS`) · `npm run lint`+`npm run build` (backend) limpos · `git diff --check` limpo.
  - **Estados obrigatorios (§7):** loading (`Skeleton`), empty HONESTO (D-007 — `isMockMode`→dataset vazio; teste prova `doesNotMatch(/Pátio Central|yard-1/)`), error (`Alert`+Tentar novamente), acesso-negado (`PermissionGuard` + acoes gated por `:create/:update`). OK.
  - **§allowlist/PT-BR/white-label:** nenhuma tela renderiza `tenant_id`/`branchId` (so no CONTEXTO de request/header — legitimo §2.4); testes provam `doesNotMatch(/\btenant\b/i)`, `doesNotMatch(/pol[íi]cia/i)`, `doesNotMatch(TENANT_ID)`, `doesNotMatch(BRANCH_ID)`. PT-BR + acentuacao corretas. OK.
  - **Ocupacao read-only (D-Ω5P-UI-03):** UI NAO expoe `allocate/vacate/move`; `OCCUPIED` read-only (modal nao envia `status`, esconde o Select, Alert; backend `parseOperationalStatus` barra OCCUPIED com 422). Deferimento a PR-06/08 respeitado. OK.
  - **Tarifas ESTENDE (nao recria):** so `price-tables` tocado; `registry/tariffs` INTOCADO. 2 Selects Escopo/Categoria com "Todos/Todas"=NULL curinga. Zero regressao (dentro dos 861/0). OK.
  - **Chave natural imutavel (licao veto B2):** perfil `name` disabled + FORA do `ProfileUpdatePayload` (backend 409) — OK. Area `kind`/`parent` disabled na edicao. **Patio `name` NAO e chave natural** (`Yard` so tem `@@unique([tenant_id,id])`; `PATCH /yards` aceita `parseOptionalName`) → editar e legitimo, sem falso-sucesso. Nao e violacao.
  - **§11 fidelidade:** `page-heading page-heading--row` (eyebrow+titulo+subtitulo+acoes a direita). Sem andaime de dev (grep: sem PLANNED/TODO/WIP/codigo de tela). OK.
  - **Sem permissao/migracao/dep nova:** `catalog.ts`/`prisma/**`/`package.json` (raiz) INTOCADOS. `frontend/package.json` mudou **so o script `test:smoke`** (registra os 3 testes novos), ZERO dependencia nova. Governed paths sem `requiredModules`. OK.
  - **CONDICAO (unica, docs-only — BAIXA):** `docs/kpis/omega5p/KPI_PR-04.json` + historico + snapshot AUSENTES (existem PR-00..03). Exigido por D-KPI-PER-PR — **sanar antes do merge** (precedente PR-01); nao reabre review de codigo.
  - **Observacoes (nao bloqueiam):** (1) `tests/navigation-menu-routes.test.ts` tem **2 falhas AMBIENTAIS** ("Platform Admin..."=500 scope=platform; "Resposta possui formato esperado") — **IDENTICAS com `navigation.registry.ts` em stash** ⇒ pre-existentes na branch, NAO regressao de PR-04. (2) Untracked fora do escopo (`.claude/skills/*`, `.docx`) sao ruido de ambiente — **stage POR CAMINHO**, nunca `git add .`.
- **cognicao-visual → APROVADO:** PageHeader completo nas 3 telas + drilldown; resumo de ocupacao com tons semanticos; arvore de areas por `parentId`; sem simplificacao/aba inventada/andaime.
- **coordenador-de-acessos → APROVADO:** 3 governed paths sem permissao nova; matriz por papel derivada de `ROLE_PERMISSIONS` (finance/inventory/support fora; campo VE leitura, acoes gated); backend e a autoridade (403); `sidebar-nav.test` verde (grupo PÁTIOS entre GESTÃO e TELEMETRIA).
- **Decisao:** verde 3/3, 0 CRITICO, veto NAO exercido. Merge **liberado apos** anexar `KPI_PR-04.*` (condicao docs-only) no proprio PR. KPI de execucao real: frontend smoke **850→861**, backend nav-provisioning **33→61**; blocks 91→92. Fecha a **Fase 1**. Proximo: **PR-05 `impound`** (Fase 2).

### PR-04 — UI de administração `/patios` — VOTO DA JUNTA (2026-07-26) — **APROVADO 3/3** (FECHA A FASE 1)
Junta (≥3): `omega5p-avaliador` (VETO) + `cognicao-visual` (fidelidade §11/anti-tela-morta) + `coordenador-de-acessos` (nav/governed-path/esconde-fino). `agente-secops` não requerido (console autenticado, não PWA); `agente-dba-guardiao` não requerido (sem migração).
- **cognicao-visual** → `APROVADO` (0 cond): as 4 telas estão **vivas e fiéis** ao padrão registry da casa — Pátios/Perfis com colunas semânticas+ações+Chips; **Detalhe do pátio NÃO é JSON cru** (árvore quadra→corredor→fileira com indentação por profundidade + master-detail de vagas + resumo de ocupação); cores semânticas (FREE→verde/OCCUPIED→âmbar/BLOCKED→vermelho; público→azul/privado→cinza); PT-BR white-label (zero 'Tenant', zero 'polícia'); estados completos; FormModals com chave-natural travada + os 2 Selects de tarifa com curinga claro; sem andaime de dev. 4 nits advisórios não-bloqueantes (acentos do PermissionGuard [pré-existente repo-wide]; contagem some p/ criador; app-code de categoria não-curado; hex solto consistente com detail pages existentes).
- **coordenador-de-acessos** → `APROVADO_CONDICIONADO`→**APROVADO** (C1/C2 sanadas): cadeia papel→permissão→menu→rota→backend **íntegra**; **matriz efetiva por papel derivada de `ROLE_PERMISSIONS` (61/61)** — quem tem yard/jurisdiction/price_tables:read VÊ, finance/inventory/support NÃO; **esconde-fino** dos 3 governed paths (`patios.*`, sem `requiredModules`); backend é a autoridade (403 real); **zero permissão nova** (catalog/seed/RBAC/core-saas intocados). **C1 [MÉDIA]** faltavam 3 linhas em `docs/navigation-matrix.md` → **SANADA**; **C2 [MÉDIA §11]** `/patios/tarifas` reusava a TabelasValoresPage com breadcrumb hardcoded 'Cadastros' → **SANADA** por breadcrumb **route-aware** (Pátios em `/patios/tarifas` × Cadastros em `/cadastros/tabelas-valores`) + teste reforçado (`assert.match /Pátios/` + `doesNotMatch /Cadastros/`).
- **omega5p-avaliador** → `APROVADO_CONDICIONADO`→**APROVADO** (KPI sanado): Seção 10 verde (frontend check/build/test:smoke 861/861; backend navigation-provisioning 61/61; lint/build limpos); estados §7/§allowlist-sem-tenant_id/PT-BR-white-label/ocupação-read-only (allocate/vacate/move NÃO expostos, OCCUPIED read-only, backend 422)/tarifas-ESTENDE (registry/tariffs intocado)/chave-natural-imutável/§11 todos verificados; **sem permissão/migração/dep nova** (frontend/package.json só +3 testes no test:smoke); **regressão zero** (as 2 falhas de `navigation-menu-routes` platform-scope 500 são ambientais, provadas idênticas com stash).
- **Decisão:** verde 3/3 (0 CRÍTICO; C1/C2/KPI sanadas) → PR-04 mergeia e **FECHA A FASE 1** (fundações: PR-01 yard #281 + PR-02 jurisdiction #282 + PR-03 tariffs #283 + PR-04 UI). backend **1585→1613** (+28), frontend_smoke **850→861** (+11), flutter 807 inalterado, blocks **91→92**. D-Ω5P-UI-01..06 ratificados. Inclui backfill do PR-03 (#283 `7c5ea1c`). Próximo: **Fase 2 — PR-05 `impound`** (ImpoundProcess + CustodyEvent hash-chain I2 + máquina de estados I1-I3).

## 8. Encerramento (a fazer no fim)
Ata final (entregas, KPIs consolidados, matriz RN×norma, pendências → backlog Ω6: PSP/PIX, SNE, Sivec real, GOV.BR, guarda monitorada, IA); deletar **SOMENTE** os 5 agentes efêmeros (registrar cada deleção); confirmar que nenhum agente pré-existente foi tocado; marcar os D-records como vigentes.
