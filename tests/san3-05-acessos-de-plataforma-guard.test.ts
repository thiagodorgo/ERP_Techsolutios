import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

// -----------------------------------------------------------------------------------------------
// B-SAN3-05 — T13 (A15 + A24): o RATCHET SEMÂNTICO dos acessos a tabelas FORCE ROW LEVEL SECURITY que
// não estão provadamente sob contexto de organização.
//
// O gerador (`scripts/san3-05-acessos-de-plataforma.mjs`, Apêndice A do plano v3, byte a byte) reconhece
// o delegate pelo TIPO, a classe pelo SÍMBOLO e o setter pela AST — não por nome nem por texto. Este teste
// o executa em processo filho em DOIS programas:
//   1. head + as 27 fixtures de `tests/fixtures/san3-05-mutacoes/` servidas como arquivos VIRTUAIS em
//      `src/modules/zz-mut/` (`--mutant`): cada fixture tem de ganhar ≥ 1 chave (é uma forma que já
//      derrubou um gerador anterior), e as chaves fora de `zz-mut/` têm de ser as do head;
//   2. head + `--override` da fábrica do sítio 7 (`prisma as never`): o inventário tem de mudar em
//      exatamente uma chave nova e uma sumida — o ratchet vê "sumida", não só "nova".
//
// O CONGELADO é o inventário do `origin/main` (53 chaves, Apêndice A) menos as SUMIDAS mais as NOVAS deste
// bloco — cada uma com UMA linha de motivo. Chave nova ou sumida sem motivo é vermelho: atualizar esta lista
// é o ato consciente que o ratchet existe para exigir. ALCANCE DECLARADO (o que fica fora por construção):
// a semântica do contexto (envoltório confiado que não sete o GUC, `tenantId` errado) e acesso fora de
// `src/**` ou fora do Prisma — esses a superfície fechada do T11 (dinâmica) e o `B-ARNES-2` cobrem.
// -----------------------------------------------------------------------------------------------

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GENERATOR = "scripts/san3-05-acessos-de-plataforma.mjs";
const FIXTURES_DIR = "tests/fixtures/san3-05-mutacoes";
const SITE_7 = "src/modules/cloud-cost-allocation/cloud-cost-allocation-prisma.repository.ts";
const GENERATOR_TIMEOUT_MS = 240_000;

const k = (...fields: string[]): string => fields.join("\t");

// O inventário suspeito do `origin/main` (árvore `src`/`prisma` de 4ab9d232 = 5bcdcc58), chave a chave.
const ORIGIN_MAIN: readonly string[] = [
  k("L1", "src/database/financial-period-lock.ts", "-.acquirePeriodLockExclusive", "tx", "RAW-SQL($executeRaw) OPACO", "?", "PARAMETRO(tx)", "×1"),
  k("L1", "src/database/financial-period-lock.ts", "-.acquirePeriodLockShared", "tx", "RAW-SQL($executeRaw) OPACO", "?", "PARAMETRO(tx)", "×1"),
  k("L1", "src/database/rls.ts", "-.setIdentityRlsContext", "tx", "RAW-SQL($executeRaw) OPACO", "?", "PARAMETRO(tx)", "×1"),
  k("L1", "src/database/rls.ts", "-.setIdentityRlsContext", "tx", "RAW-SQL($queryRaw)", "auth_identity_links", "PARAMETRO(tx)", "×1"),
  k("L1", "src/database/rls.ts", "-.setTenantRlsContext", "client", "RAW-SQL($executeRaw) OPACO", "?", "PARAMETRO(client)", "×1"),
  k("L1", "src/modules/auth/repositories/identity-link.repository.ts", "-.insertAuthIdentity", "client.authIdentity", "authIdentity.createMany", "auth_identities", "PARAMETRO(client)", "×1"),
  k("L1", "src/modules/auth/repositories/login-candidates.repository.ts", "-.listLoginCandidatesViaFunction", "client", "RAW-SQL($queryRaw) OPACO", "?", "PARAMETRO(client)", "×1"),
  k("L1", "src/modules/auth/services/auth-session.service.ts", "AuthSessionService.refreshSession", "tx.user", "user.findFirst", "users", "PARAMETRO(tx de callback de runWithTenantContext)", "×1"),
  k("L1", "src/modules/auth/services/auth-session.service.ts", "AuthSessionService.refreshSession", "tx.userRoleAssignment", "userRoleAssignment.findMany", "user_role_assignments", "PARAMETRO(tx de callback de runWithTenantContext)", "×1"),
  k("L1", "src/modules/auth/services/identity-link.service.ts", "IdentityLinkService.handlePasswordChange", "tx", "RAW-SQL($queryRaw)", "auth_identity_links", "$TRANSACTION-SEM-SETTER-PROVADO", "×1"),
  k("L1", "src/modules/auth/services/identity-link.service.ts", "IdentityLinkService.selectLinkOfPairForUpdate", "tx", "RAW-SQL($queryRaw)", "auth_identity_links", "PARAMETRO(tx)", "×1"),
  k("L1", "src/modules/auth/services/identity-link.service.ts", "IdentityLinkService.unlink", "tx", "RAW-SQL($queryRaw)", "auth_identity_links", "$TRANSACTION-SEM-SETTER-PROVADO", "×2"),
  k("L1", "src/modules/auth/services/identity-resolver.ts", "-.normalizePairIdentity", "tx", "RAW-SQL($executeRaw) OPACO", "?", "PARAMETRO(tx)", "×3"),
  k("L1", "src/modules/auth/services/identity-resolver.ts", "-.resolveIdentityIdForPair", "tx", "RAW-SQL($queryRaw)", "auth_identity_links", "PARAMETRO(tx)", "×1"),
  k("L1", "src/modules/auth/services/login-readiness.ts", "-.classifyLoginReadiness", "client", "RAW-SQL($queryRaw) OPACO", "?", "PARAMETRO(client)", "×1"),
  k("L1", "src/modules/auth/services/session-admin.service.ts", "SessionAdminService.resolveUserLabels", "tx.user", "user.findMany", "users", "PARAMETRO(tx)", "×1"),
  k("L1", "src/modules/cloud-usage/cloud-usage.capture.ts", "-.appendChecklistRunUsageInTx", "client", "RAW-SQL($executeRaw)", "cloud_usage_events", "PARAMETRO(client)", "×1"),
  k("L1", "src/modules/commissions/work-order-cancellation.gate.ts", "-.readWorkOrderCancellationPrisma", "executor.workOrder", "workOrder.findFirst", "work_orders", "PARAMETRO(executor)", "×1"),
  k("L1", "src/modules/core-saas/services/prisma-core-saas.service.ts", "PrismaCoreSaasService.listTenantsForIdentity", "tx.user", "user.findFirst", "users", "$TRANSACTION-SEM-SETTER-PROVADO", "×1"),
  k("L1", "src/modules/financial-period-closes/financial-period-close-prisma.repository.ts", "PrismaFinancialPeriodCloseStore.readCompetencia", "tx.financialEntry", "financialEntry.findMany", "financial_entries", "PARAMETRO(tx)", "×1"),
  k("L1", "src/modules/financial-period-closes/financial-period-close-prisma.repository.ts", "PrismaFinancialPeriodCloseStore.readCompetencia", "tx.financialTitle", "financialTitle.findMany", "financial_titles", "PARAMETRO(tx)", "×1"),
  k("L1", "src/modules/impound/impound.outbox.repository.ts", "-.appendOutboxEventTx", "client.impoundOutboxEvent", "impoundOutboxEvent.create", "impound_outbox_events", "PARAMETRO(client)", "×1"),
  k("L1", "src/modules/impound/impound.outbox.repository.ts", "-.listOutboxEventsTx", "client.impoundOutboxEvent", "impoundOutboxEvent.findMany", "impound_outbox_events", "PARAMETRO(client)", "×1"),
  k("L1", "src/modules/work-orders/work-order-prisma.repository.ts", "PrismaWorkOrderRepository.assign", "tx.workOrder", "workOrder.updateManyAndReturn", "work_orders", "$TRANSACTION-SEM-SETTER-PROVADO", "×1"),
  k("L1", "src/modules/work-orders/work-order-prisma.repository.ts", "PrismaWorkOrderRepository.assign", "tx.workOrderAssignment", "workOrderAssignment.create", "work_order_assignments", "$TRANSACTION-SEM-SETTER-PROVADO", "×1"),
  k("L1", "src/routes/health.routes.ts", "-.checkPostgres", "prisma", "RAW-SQL($queryRawUnsafe) OPACO", "?", "CRU", "×1"),
  k("L2", "src/modules/auth/auth-runtime.ts", "new AuditLogRepository(tx)", "PARAMETRO(tx)", "×2"),
  k("L2", "src/modules/auth/auth-runtime.ts", "new LocalAuthCredentialRepository(tx)", "PARAMETRO(tx)", "×1"),
  k("L2", "src/modules/auth/auth-runtime.ts", "new UserRepository(tx)", "PARAMETRO(tx)", "×1"),
  k("L2", "src/modules/auth/auth-runtime.ts", "new UserRoleRepository(tx)", "PARAMETRO(tx)", "×1"),
  k("L2", "src/modules/auth/services/auth-session.service.ts", "new AuthSessionRepository(tx)", "PARAMETRO(tx de callback de runWithTenantContext)", "×3"),
  k("L2", "src/modules/auth/services/identity-link.service.ts", "new AuditLogRepository(tx)", "PARAMETRO(tx)", "×1"),
  k("L2", "src/modules/auth/services/identity-link.service.ts", "new AuthSessionRepository(tx)", "$TRANSACTION-SEM-SETTER-PROVADO", "×1"),
  k("L2", "src/modules/auth/services/identity-link.service.ts", "new AuthSessionRepository(tx)", "PARAMETRO(tx)", "×1"),
  k("L2", "src/modules/auth/services/identity-link.service.ts", "new IdentityLinkEventRepository(tx)", "PARAMETRO(tx)", "×1"),
  k("L2", "src/modules/auth/services/identity-link.service.ts", "new IdentityLinkRepository(tx)", "$TRANSACTION-SEM-SETTER-PROVADO", "×4"),
  k("L2", "src/modules/auth/services/identity-link.service.ts", "new IdentityLinkRepository(tx)", "PARAMETRO(tx)", "×1"),
  k("L2", "src/modules/auth/services/identity-resolver.ts", "new IdentityLinkEventRepository(tx)", "PARAMETRO(tx)", "×1"),
  k("L2", "src/modules/auth/services/identity-resolver.ts", "new IdentityLinkRepository(tx)", "PARAMETRO(tx)", "×1"),
  k("L2", "src/modules/auth/services/local-auth-credential.service.ts", "new LocalAuthCredentialRepository(tx)", "PARAMETRO(tx de callback de handlePasswordChange)", "×1"),
  k("L2", "src/modules/auth/services/session-admin.service.ts", "new AuditLogRepository(tx)", "PARAMETRO(tx)", "×1"),
  k("L2", "src/modules/auth/services/session-admin.service.ts", "new AuthSessionRepository(tx)", "PARAMETRO(tx de callback de runWithTenantContext)", "×3"),
  k("L2", "src/modules/cloud-charges/cloud-charge-prisma.repository.ts", "new PrismaCloudChargeRepository(prisma)", "CRU", "×1"),
  k("L2", "src/modules/cloud-cost-allocation/cloud-cost-allocation-prisma.repository.ts", "new PrismaCloudCostAllocationRepository(prisma)", "CRU", "×1"),
  k("L2", "src/modules/cloud-usage/cloud-usage-prisma.repository.ts", "new PrismaCloudUsageRepository(this.prismaClient)", "INJETADO-TRANSITIVO:SUSPEITO-ACIMA(src/modules/cloud-usage/cloud-usage-prisma.repository.ts:new RlsPrismaCloudUsageRepository(prisma) CRU)", "×2"),
  k("L2", "src/modules/cloud-usage/cloud-usage-prisma.repository.ts", "new RlsPrismaCloudUsageRepository(prisma)", "CRU", "×1"),
  k("L2", "src/modules/core-saas/services/prisma-core-saas.service.ts", "new IdentityLinkRepository(tx)", "$TRANSACTION-SEM-SETTER-PROVADO", "×1"),
  k("L2", "src/modules/core-saas/store/prisma-core-saas.store.ts", "new AuditLogRepository()", "CRU", "×1"),
  k("L2", "src/modules/core-saas/store/prisma-core-saas.store.ts", "new AuditLogRepository(tx)", "$TRANSACTION-SEM-SETTER-PROVADO", "×1"),
  k("L2", "src/modules/core-saas/store/prisma-core-saas.store.ts", "new RoleRepository()", "CRU", "×1"),
  k("L2", "src/modules/core-saas/store/prisma-core-saas.store.ts", "new UserRepository()", "CRU", "×1"),
  k("L2", "src/modules/core-saas/store/prisma-core-saas.store.ts", "new UserRoleRepository()", "CRU", "×1"),
  k("L2", "src/modules/financial-titles/financial-title-prisma.repository.ts", "new PrismaFinancialPeriodCloseRepository(tx)", "PARAMETRO(tx)", "×1"),
];

// O que este bloco TIROU do inventário, com o motivo.
const SUMIDAS: ReadonlyMap<string, string> = new Map([
  [
    k("L2", "src/modules/cloud-charges/cloud-charge-prisma.repository.ts", "new PrismaCloudChargeRepository(prisma)", "CRU", "×1"),
    "sítios 3–6 do remédio: a fábrica deixou de instanciar o repositório cru com o client raiz e devolve o RlsPrismaCloudChargeRepository (replaceTenantCharges/listTenantCharges/listAllocationTenantAllocations por organização, sob o contexto dela).",
  ],
  [
    k("L2", "src/modules/cloud-usage/cloud-usage-prisma.repository.ts", "new PrismaCloudUsageRepository(this.prismaClient)", "INJETADO-TRANSITIVO:SUSPEITO-ACIMA(src/modules/cloud-usage/cloud-usage-prisma.repository.ts:new RlsPrismaCloudUsageRepository(prisma) CRU)", "×2"),
    "sítios 1–2 do remédio: os ramos sem tenantId de listEvents/listDailyAggregates passaram a forEachTenantRls → new PrismaCloudUsageRepository(tx) sob o contexto de cada organização.",
  ],
  [
    k("L2", "src/modules/cloud-usage/cloud-usage-prisma.repository.ts", "new RlsPrismaCloudUsageRepository(prisma)", "CRU", "×1"),
    "consequência dos sítios 1–2: o envoltório de uso não repassa mais o client raiz a construtor de classe injetada (só a withTenantRls/forEachTenantRls e a `tenant`, sem FORCE), logo deixou de ser classe injetada.",
  ],
]);

// O que este bloco ACRESCENTOU ao inventário, com o motivo (nenhuma é acesso a tabela FORCE sem contexto).
const NOVAS: ReadonlyMap<string, string> = new Map([
  [
    k("L1", "src/modules/work-orders/work-order-prisma.repository.ts", "PrismaWorkOrderRepository.assignFromDispatch", "tx.workOrder", "workOrder.findFirst", "work_orders", "$TRANSACTION-SEM-SETTER-PROVADO", "×1"),
    "B-O6R-07c-b1: `assignFromDispatch` (o despacho grava a atribuição, `D1-07c`) repete, linha a linha, o desenho de `PrismaWorkOrderRepository.assign` já congelado acima (`$transaction` interno, chamado só pelo `RlsPrismaWorkOrderRepository` dentro de `withTenantRls`, que seta o GUC antes); herda a mesma classificação suspeita, sem acesso novo sem contexto.",
  ],
  [
    k("L1", "src/modules/work-orders/work-order-prisma.repository.ts", "PrismaWorkOrderRepository.assignFromDispatch", "tx.workOrder", "workOrder.updateManyAndReturn", "work_orders", "$TRANSACTION-SEM-SETTER-PROVADO", "×1"),
    "B-O6R-07c-b1: `assignFromDispatch` (o despacho grava a atribuição, `D1-07c`) repete, linha a linha, o desenho de `PrismaWorkOrderRepository.assign` já congelado acima (`$transaction` interno, chamado só pelo `RlsPrismaWorkOrderRepository` dentro de `withTenantRls`, que seta o GUC antes); herda a mesma classificação suspeita, sem acesso novo sem contexto.",
  ],
  [
    k("L1", "src/modules/work-orders/work-order-prisma.repository.ts", "PrismaWorkOrderRepository.assignFromDispatch", "tx.workOrderAssignment", "workOrderAssignment.create", "work_order_assignments", "$TRANSACTION-SEM-SETTER-PROVADO", "×1"),
    "B-O6R-07c-b1: `assignFromDispatch` (o despacho grava a atribuição, `D1-07c`) repete, linha a linha, o desenho de `PrismaWorkOrderRepository.assign` já congelado acima (`$transaction` interno, chamado só pelo `RlsPrismaWorkOrderRepository` dentro de `withTenantRls`, que seta o GUC antes); herda a mesma classificação suspeita, sem acesso novo sem contexto.",
  ],
  [
    k("L1", "src/modules/work-orders/work-order-prisma.repository.ts", "PrismaWorkOrderRepository.assign", "tx.workOrderEvent", "workOrderEvent.create", "work_order_events", "$TRANSACTION-SEM-SETTER-PROVADO", "×1"),
    "B-O6R-07c-b1 ciclo 2 (P-ATOMICA): o evento `work_order_assigned` passou a ser gravado DENTRO do `$transaction` que já grava a OS e a linha de `work_order_assignments` (`tx.workOrderEvent.create`), em vez de uma segunda transação; mesmo `$transaction` interno, chamado só pelo `RlsPrismaWorkOrderRepository` dentro de `withTenantRls`, que seta o GUC antes — herda a classificação suspeita das 3 chaves irmãs, sem acesso novo sem contexto.",
  ],
  [
    k("L1", "src/modules/work-orders/work-order-prisma.repository.ts", "PrismaWorkOrderRepository.assignFromDispatch", "tx.workOrderEvent", "workOrderEvent.create", "work_order_events", "$TRANSACTION-SEM-SETTER-PROVADO", "×1"),
    "B-O6R-07c-b1 ciclo 2 (P-ATOMICA): o evento `work_order_assigned` passou a ser gravado DENTRO do `$transaction` que já grava a OS e a linha de `work_order_assignments` (`tx.workOrderEvent.create`), em vez de uma segunda transação; mesmo `$transaction` interno, chamado só pelo `RlsPrismaWorkOrderRepository` dentro de `withTenantRls`, que seta o GUC antes — herda a classificação suspeita das 3 chaves irmãs, sem acesso novo sem contexto.",
  ],
  [
    k("L1", "src/modules/auth/services/auth-session.service.ts", "AuthSessionService.refreshSession", "tx.userRoleAssignment", "userRoleAssignment.findMany.select.role", "roles", "PARAMETRO(tx de callback de runWithTenantContext)", "×1"),
    "B3/C3E: a relação aninhada `select.role` toca a tabela FORCE `roles` pela mesma consulta já congelada como suspeita; relação FORCE não pode desaparecer só porque a operação raiz é `userRoleAssignment.findMany`.",
  ],
  [
    k("L1", "src/modules/core-saas/services/prisma-core-saas.service.ts", "PrismaCoreSaasService.listTenantsForIdentity", "tx.user", "user.findFirst.include.role_assignments", "user_role_assignments", "$TRANSACTION-SEM-SETTER-PROVADO", "×1"),
    "B3/C3E: `include.role_assignments` alcança a tabela FORCE `user_role_assignments` dentro de uma transação cujo setter inicial não foi provado; herda a classificação suspeita da consulta raiz.",
  ],
  [
    k("L1", "src/modules/core-saas/services/prisma-core-saas.service.ts", "PrismaCoreSaasService.listTenantsForIdentity", "tx.user", "user.findFirst.include.role_assignments.include.role", "roles", "$TRANSACTION-SEM-SETTER-PROVADO", "×1"),
    "B3/C3E: a segunda relação aninhada `role_assignments.include.role` alcança a tabela FORCE `roles` na mesma transação sem setter provado; o analisador deve mantê-la suspeita separadamente.",
  ],
  [
    k("L1", "src/database/runtime-role.ts", "-.probeRuntimeRolePosture", "client", "RAW-SQL($queryRawUnsafe) OPACO", "?", "PARAMETRO(client)", "×2"),
    "a sonda da trava de boot (item 9): duas consultas ao CATÁLOGO (session_user/current_user e RUNTIME_ROLE_GUARD_SQL sobre pg_roles/pg_class/pg_rewrite/pg_depend); SQL cru sem tabela literal é OPACO por desenho do gerador — não toca tabela FORCE.",
  ],
  [
    k("L2", "src/modules/cloud-charges/cloud-charge-prisma.repository.ts", "new PrismaCloudChargeRepository(this.prismaClient)", "INJETADO-TRANSITIVO:SUSPEITO-ACIMA(src/modules/cloud-charges/cloud-charge-prisma.repository.ts:new RlsPrismaCloudChargeRepository(prisma) CRU)", "×1"),
    "RlsPrismaCloudChargeRepository.semForceRls(): delegação ao cru SÓ dos 10 métodos de tabelas SEM FORCE (cloud_charge_rules, cloud_charge_calculation_runs, cloud_cost_allocation_runs, tenants), como o §2.2(b) do plano manda; os três métodos de tabela FORCE são reescritos por organização.",
  ],
  [
    k("L2", "src/modules/cloud-charges/cloud-charge-prisma.repository.ts", "new RlsPrismaCloudChargeRepository(prisma)", "CRU", "×1"),
    "a fábrica do envoltório de cobrança recebe o client raiz por desenho (a mesma forma da chave `new RlsPrismaCloudUsageRepository(prisma) CRU` que existia): o envoltório é quem abre o contexto por organização.",
  ],
  // B-TRC-01 (decisão do orquestrador em docs/revisoes/TRACCAR/B-TRC-01-DECISAO-T13.md, opção (i)): as 6 chaves que a
  // ingestão do Traccar acrescenta, medidas pelo gerador no head do bloco. Gerador e WRAPPERS intocados.
  [
    k("L1", "src/modules/field-dispatch/field-dispatch-prisma.repository.ts", "-.findOperatorsForVehicleAt", "tx", "RAW-SQL($queryRaw)", "field_dispatches", "PARAMETRO(tx)", "×1"),
    "B-TRC-01: a leitura do operador no instante do fix (l.34) recebe o `tx` da fase 2 e não abre transação; o único chamador é o callback de `withTenantRlsBudget` em traccar-ingestion.service.ts l.158, cujo helper põe o setter do GUC como 1ª instrução da transação (src/database/rls.ts l.128).",
  ],
  [
    k("L1", "src/modules/field-dispatch/field-dispatch-prisma.repository.ts", "-.findOperatorsForVehicleAt", "tx", "RAW-SQL($queryRaw)", "work_orders", "PARAMETRO(tx)", "×1"),
    "B-TRC-01: a mesma consulta (l.34) junta `work_orders` à `field_dispatches` pela viatura do vínculo; mesmo `tx` da fase 2 (traccar-ingestion.service.ts l.158), sob o setter de `withTenantRlsBudget` (src/database/rls.ts l.128).",
  ],
  [
    k("L2", "src/integrations/traccar/traccar-ingestion.service.ts", "new PrismaFieldLocationRepository(tx)", "PARAMETRO(tx de callback de withTenantRlsBudget)", "×1"),
    "B-TRC-01: a localização `source='traccar'` é gravada pelo repositório existente no MESMO tx do recibo (l.157, atomicidade de §4.2 passo 7); o `tx` vem de `withTenantRlsBudget`, cujo setter do GUC é a 1ª instrução da transação (src/database/rls.ts l.128).",
  ],
  [
    k("L2", "src/integrations/traccar/traccar-ingestion.service.ts", "new TraccarIngestionRepository(this.options.client)", "OUTRO(this.options.client)", "×1"),
    "B-TRC-01: a quarentena SEM organização resolvida (l.277; dispositivo não mapeado ou teto de organizações) é uma instrução em autocommit, sem GUC, só na tabela GLOBAL `traccar_quarantine_items` (sem RLS, sem tenant_id, sem coordenada, sem payload — nota N-02 do plano); não toca tabela FORCE.",
  ],
  [
    k("L2", "src/integrations/traccar/traccar-ingestion.service.ts", "new TraccarIngestionRepository(tx)", "PARAMETRO(tx de callback de withTenantRlsBudget)", "×2"),
    "B-TRC-01: o SQL da fase 2 (vínculo FOR SHARE, recibo, quarentena por organização) é instanciado no callback de `withTenantRlsBudget` (l.156); o helper põe o setter do GUC da candidata como 1ª instrução da transação (src/database/rls.ts l.128) e o canário confere o tenant do vínculo e do recibo. B-TRC-02 (emenda v2.4): ×2 — a 2ª instanciação é a de eventPhaseTwo (o event.forward, l.264 do head 46dd99d1), no callback de withTenantRlsBudget: mesma forma, mesmo helper (src/database/rls.ts l.128), mesmo canário assertRowsBelongToTenant no vínculo e no recibo.",
  ],
  [
    k("L2", "src/integrations/traccar/traccar-resolution.ts", "new TraccarIngestionRepository(tx)", "PARAMETRO(tx de callback de findFirstTenantRls)", "×1"),
    "B-TRC-01: a sondagem da descoberta (l.238) roda no callback de `findFirstTenantRls`, que troca o GUC antes de cada volta (src/database/rls.ts l.156 e l.160), em transação somente leitura, e passa as linhas pelo canário `assertRowsBelongToTenant` antes de usá-las.",
  ],
  // B-TRC-02 (emenda v2.4 de escopo, docs/revisoes/TRACCAR/B-TRC-02-emenda-v2.4-acessos.md §1.2): as 6 chaves L1 da telemetria
  // veicular, coladas da saída do gerador no head do bloco, com o motivo por chave. Gerador e WRAPPERS intocados.
  [
    k("L1", "src/modules/telemetry/vehicle-telemetry-prisma.repository.ts", "-.withSampleSavepoint", "tx", "RAW-SQL($executeRaw) OPACO", "?", "PARAMETRO(tx)", "×3"),
    "B-TRC-02: os 3 $executeRaw de withSampleSavepoint (l.39/43/48) são SAVEPOINT vehicle_sample / ROLLBACK TO SAVEPOINT / RELEASE SAVEPOINT — controle de sub-transação sem tabela (OPACO por desenho do gerador, a classe de acquirePeriodLock* e normalizePairIdentity já congeladas); o tx é o do passo 7 da posição (phaseTwoSteps, l.468), que só existe dentro do callback de withTenantRlsBudget (phaseTwo), cujo setter do GUC é a 1ª instrução da transação (src/database/rls.ts l.128); não lê nem grava dado.",
  ],
  [
    k("L1", "src/modules/telemetry/vehicle-telemetry-prisma.repository.ts", "PrismaVehicleTelemetryRepository.insertEvent", "tx", "RAW-SQL($queryRaw)", "vehicle_telemetry_events", "PARAMETRO(tx)", "×1"),
    "B-TRC-02: o INSERT da linha de evento em vehicle_telemetry_events (l.93; tabela ENABLE+FORCE com política WITH CHECK no GUC, migração 20260879000000 l.81-86) recebe o tx do passo 7 de eventPhaseTwoSteps (l.344), que só existe dentro do callback de withTenantRlsBudget (eventPhaseTwo); o helper põe setTenantRlsContext(tx, tenantId) como 1ª instrução (src/database/rls.ts l.128) e a FK de 4 colunas amarra a linha ao recibo da mesma organização.",
  ],
  [
    k("L1", "src/modules/telemetry/vehicle-telemetry-prisma.repository.ts", "PrismaVehicleTelemetryRepository.insertSample", "tx", "RAW-SQL($queryRaw)", "vehicle_telemetry_events", "PARAMETRO(tx)", "×1"),
    "B-TRC-02: o INSERT da amostra (l.105) roda no passo 7 da posição ACEITA, dentro do savepoint vehicle_sample, sobre o MESMO tx do recibo (phaseTwoSteps l.468 → insertVehicleSample(ports.tx) l.500), nascido em withTenantRlsBudget (phaseTwo) com o setter do GUC como 1ª instrução (src/database/rls.ts l.128); Q1 = NÃO: nunca fora da transação da posição, nunca em quarentena.",
  ],
  [
    k("L1", "src/modules/telemetry/vehicle-telemetry-prisma.repository.ts", "PrismaVehicleTelemetryRepository.latestDeviceStatus", "tx", "RAW-SQL($queryRaw)", "vehicle_telemetry_events", "PARAMETRO(tx)", "×1"),
    "B-TRC-02: porta de LEITURA interna (plano v2 §6.6, v2.1 R1-3) para o B-TRC-04, sem chamador em src/** no head; SELECT filtrado por tenant_id sobre tabela FORCE RLS, executor = parâmetro tx por contrato (VehicleTelemetryRepository), exercida em tests/traccar-event-ingestion-db.test.ts só via withTenantRls sob papel NOBYPASSRLS (asTenant, l.200-201); quando o B-TRC-04 a chamar, o chamador entra no inventário e exige motivo próprio.",
  ],
  [
    k("L1", "src/modules/telemetry/vehicle-telemetry-prisma.repository.ts", "PrismaVehicleTelemetryRepository.latestIgnition", "tx", "RAW-SQL($queryRaw)", "vehicle_telemetry_events", "PARAMETRO(tx)", "×1"),
    "B-TRC-02: porta de LEITURA interna (plano v2 §6.6, v2.1 R1-3) para o B-TRC-04, sem chamador em src/** no head; SELECT filtrado por tenant_id sobre tabela FORCE RLS, executor = parâmetro tx por contrato, exercida em tests/traccar-event-ingestion-db.test.ts só via withTenantRls sob papel NOBYPASSRLS (asTenant, l.200-201); mesma regra da chave irmã latestDeviceStatus.",
  ],
  [
    k("L1", "src/modules/telemetry/vehicle-telemetry-prisma.repository.ts", "PrismaVehicleTelemetryRepository.listByVehicle", "tx", "RAW-SQL($queryRaw)", "vehicle_telemetry_events", "PARAMETRO(tx)", "×1"),
    "B-TRC-02: porta de LEITURA interna (plano v2 §6.6, v2.1 R1-3) para o B-TRC-04, sem chamador em src/** no head; SELECT filtrado por tenant_id e LIMIT 1..500 sobre tabela FORCE RLS, executor = parâmetro tx por contrato; presa pelo caso \"listByVehicle sob o GUC de A devolve só A; sob o GUC de B devolve 0 de A\" de tests/traccar-event-ingestion-db.test.ts (emenda v2.4 R-A4), via withTenantRls sob papel NOBYPASSRLS.",
  ],
  // B-ASS-03 (lição das Emendas 2–4 ao §4.2, valendo para o §4.3): as 2 chaves L2 do medidor diário, coladas da saída do
  // gerador no head do bloco, com o motivo por chave. Gerador e WRAPPERS intocados.
  [
    k("L2", "src/modules/subscription-billing/metering/metering-prisma.repository.ts", "new PrismaMeteringSqlExecutor(tx)", "PARAMETRO(tx)", "×1"),
    "B-ASS-03: measureTenantUsageInTx (l.155) recebe o tx por contrato; o único chamador em src/** é runSubscriptionMeasureDaily (subscription-billing.jobs.ts, withTenantRlsBudget(prisma, tenant.id, …)), que fixa o GUC da organização da volta; o medidor assere current_setting(app.current_tenant_id) = tenantId e o canário assertRowsBelongToTenant antes de gravar e lança tenant_context_missing (R-MED-4, T-MED-db-6).",
  ],
  [
    k("L2", "src/modules/subscription-billing/metering/metering-prisma.repository.ts", "new PrismaTenantUsageDailyRepository(tx)", "PARAMETRO(tx)", "×1"),
    "B-ASS-03: o upsert em tenant_usage_daily (tabela ENABLE+FORCE, T-MED-db-7) usa o MESMO tx de withTenantRlsBudget da volta da organização (subscription-billing.jobs.ts); sob FORCE, a escrita sem o GUC certo violaria a política, e o medidor lança antes de tentar (R-MED-4).",
  ],
  // B-ASS-04: as chaves L1 da porta do demonstrativo, coladas da saída do gerador no head do bloco.
  [
    k("L2", "src/modules/subscription-billing/statements/statement.prisma-runtime.ts", "new AuditLogRepository(tx)", "PARAMETRO(tx)", "×1"),
    "B-ASS-04: `writeAuditInTx` grava a linha de audit_logs (tabela FORCE) no MESMO tx do movimento de dinheiro; os dois chamadores são `StatementTx.recordAudit` (tx aberto por `PrismaStatementRepository.transaction` → `withTenantRls`, e o evento de outra organização é recusado antes) e `PrismaStatementAuditSink.record` (`withTenantRls(client, event.tenantId, …)`); provado por T-ST-db-8 e T-ST-db-10 (trilha que falha desfaz o pagamento) sob papel NOSUPERUSER NOBYPASSRLS.",
  ],
  [
    k("L1", "src/modules/subscription-billing/statements/statement.prisma-runtime.ts", "-.insertCredit", "tx.subscriptionCredit", "subscriptionCredit.create", "subscription_credits", "PARAMETRO(tx)", "×1"),
    "B-ASS-04: porta `StatementTx` do repositório Prisma do demonstrativo; o único criador é `PrismaStatementRepository.transaction`, que abre `withTenantRls(client, tenantId, …)` e fixa o GUC da organização antes de entregar o tx; toda instrução filtra também por `tenant_id = tenantId` (os `SELECT … FOR UPDATE` e os `updateMany`), e o isolamento é provado sob papel NOSUPERUSER NOBYPASSRLS em tests/ass-04-statement-db.test.ts (T-ST-db-5: A não lê, não paga nem aplica crédito no demonstrativo de B; sem GUC, zero linhas nas 4 tabelas).",
  ],
  [
    k("L1", "src/modules/subscription-billing/statements/statement.prisma-runtime.ts", "-.insertIfAbsentAndLock", "tx", "RAW-SQL($queryRaw)", "subscription_statements", "PARAMETRO(tx)", "×1"),
    "B-ASS-04: porta `StatementTx` do repositório Prisma do demonstrativo; o único criador é `PrismaStatementRepository.transaction`, que abre `withTenantRls(client, tenantId, …)` e fixa o GUC da organização antes de entregar o tx; toda instrução filtra também por `tenant_id = tenantId` (os `SELECT … FOR UPDATE` e os `updateMany`), e o isolamento é provado sob papel NOSUPERUSER NOBYPASSRLS em tests/ass-04-statement-db.test.ts (T-ST-db-5: A não lê, não paga nem aplica crédito no demonstrativo de B; sem GUC, zero linhas nas 4 tabelas).",
  ],
  [
    k("L1", "src/modules/subscription-billing/statements/statement.prisma-runtime.ts", "-.insertIfAbsentAndLock", "tx.subscriptionStatement", "subscriptionStatement.createMany", "subscription_statements", "PARAMETRO(tx)", "×1"),
    "B-ASS-04: porta `StatementTx` do repositório Prisma do demonstrativo; o único criador é `PrismaStatementRepository.transaction`, que abre `withTenantRls(client, tenantId, …)` e fixa o GUC da organização antes de entregar o tx; toda instrução filtra também por `tenant_id = tenantId` (os `SELECT … FOR UPDATE` e os `updateMany`), e o isolamento é provado sob papel NOSUPERUSER NOBYPASSRLS em tests/ass-04-statement-db.test.ts (T-ST-db-5: A não lê, não paga nem aplica crédito no demonstrativo de B; sem GUC, zero linhas nas 4 tabelas).",
  ],
  [
    k("L1", "src/modules/subscription-billing/statements/statement.prisma-runtime.ts", "-.insertIfAbsentAndLock", "tx.subscriptionStatement", "subscriptionStatement.findUniqueOrThrow", "subscription_statements", "PARAMETRO(tx)", "×1"),
    "B-ASS-04: porta `StatementTx` do repositório Prisma do demonstrativo; o único criador é `PrismaStatementRepository.transaction`, que abre `withTenantRls(client, tenantId, …)` e fixa o GUC da organização antes de entregar o tx; toda instrução filtra também por `tenant_id = tenantId` (os `SELECT … FOR UPDATE` e os `updateMany`), e o isolamento é provado sob papel NOSUPERUSER NOBYPASSRLS em tests/ass-04-statement-db.test.ts (T-ST-db-5: A não lê, não paga nem aplica crédito no demonstrativo de B; sem GUC, zero linhas nas 4 tabelas).",
  ],
  [
    k("L1", "src/modules/subscription-billing/statements/statement.prisma-runtime.ts", "-.insertPayment", "tx.subscriptionStatementPayment", "subscriptionStatementPayment.create", "subscription_statement_payments", "PARAMETRO(tx)", "×1"),
    "B-ASS-04: porta `StatementTx` do repositório Prisma do demonstrativo; o único criador é `PrismaStatementRepository.transaction`, que abre `withTenantRls(client, tenantId, …)` e fixa o GUC da organização antes de entregar o tx; toda instrução filtra também por `tenant_id = tenantId` (os `SELECT … FOR UPDATE` e os `updateMany`), e o isolamento é provado sob papel NOSUPERUSER NOBYPASSRLS em tests/ass-04-statement-db.test.ts (T-ST-db-5: A não lê, não paga nem aplica crédito no demonstrativo de B; sem GUC, zero linhas nas 4 tabelas).",
  ],
  [
    k("L1", "src/modules/subscription-billing/statements/statement.prisma-runtime.ts", "-.lockById", "tx", "RAW-SQL($queryRaw)", "subscription_statements", "PARAMETRO(tx)", "×1"),
    "B-ASS-04: porta `StatementTx` do repositório Prisma do demonstrativo; o único criador é `PrismaStatementRepository.transaction`, que abre `withTenantRls(client, tenantId, …)` e fixa o GUC da organização antes de entregar o tx; toda instrução filtra também por `tenant_id = tenantId` (os `SELECT … FOR UPDATE` e os `updateMany`), e o isolamento é provado sob papel NOSUPERUSER NOBYPASSRLS em tests/ass-04-statement-db.test.ts (T-ST-db-5: A não lê, não paga nem aplica crédito no demonstrativo de B; sem GUC, zero linhas nas 4 tabelas).",
  ],
  [
    k("L1", "src/modules/subscription-billing/statements/statement.prisma-runtime.ts", "-.lockById", "tx.subscriptionStatement", "subscriptionStatement.findUniqueOrThrow", "subscription_statements", "PARAMETRO(tx)", "×1"),
    "B-ASS-04: porta `StatementTx` do repositório Prisma do demonstrativo; o único criador é `PrismaStatementRepository.transaction`, que abre `withTenantRls(client, tenantId, …)` e fixa o GUC da organização antes de entregar o tx; toda instrução filtra também por `tenant_id = tenantId` (os `SELECT … FOR UPDATE` e os `updateMany`), e o isolamento é provado sob papel NOSUPERUSER NOBYPASSRLS em tests/ass-04-statement-db.test.ts (T-ST-db-5: A não lê, não paga nem aplica crédito no demonstrativo de B; sem GUC, zero linhas nas 4 tabelas).",
  ],
  [
    k("L1", "src/modules/subscription-billing/statements/statement.prisma-runtime.ts", "-.lockCredit", "tx", "RAW-SQL($queryRaw)", "subscription_credits", "PARAMETRO(tx)", "×1"),
    "B-ASS-04: porta `StatementTx` do repositório Prisma do demonstrativo; o único criador é `PrismaStatementRepository.transaction`, que abre `withTenantRls(client, tenantId, …)` e fixa o GUC da organização antes de entregar o tx; toda instrução filtra também por `tenant_id = tenantId` (os `SELECT … FOR UPDATE` e os `updateMany`), e o isolamento é provado sob papel NOSUPERUSER NOBYPASSRLS em tests/ass-04-statement-db.test.ts (T-ST-db-5: A não lê, não paga nem aplica crédito no demonstrativo de B; sem GUC, zero linhas nas 4 tabelas).",
  ],
  [
    k("L1", "src/modules/subscription-billing/statements/statement.prisma-runtime.ts", "-.lockCredit", "tx.subscriptionCredit", "subscriptionCredit.findUniqueOrThrow", "subscription_credits", "PARAMETRO(tx)", "×1"),
    "B-ASS-04: porta `StatementTx` do repositório Prisma do demonstrativo; o único criador é `PrismaStatementRepository.transaction`, que abre `withTenantRls(client, tenantId, …)` e fixa o GUC da organização antes de entregar o tx; toda instrução filtra também por `tenant_id = tenantId` (os `SELECT … FOR UPDATE` e os `updateMany`), e o isolamento é provado sob papel NOSUPERUSER NOBYPASSRLS em tests/ass-04-statement-db.test.ts (T-ST-db-5: A não lê, não paga nem aplica crédito no demonstrativo de B; sem GUC, zero linhas nas 4 tabelas).",
  ],
  [
    k("L1", "src/modules/subscription-billing/statements/statement.prisma-runtime.ts", "-.lockPayment", "tx", "RAW-SQL($queryRaw)", "subscription_statement_payments", "PARAMETRO(tx)", "×1"),
    "B-ASS-04: porta `StatementTx` do repositório Prisma do demonstrativo; o único criador é `PrismaStatementRepository.transaction`, que abre `withTenantRls(client, tenantId, …)` e fixa o GUC da organização antes de entregar o tx; toda instrução filtra também por `tenant_id = tenantId` (os `SELECT … FOR UPDATE` e os `updateMany`), e o isolamento é provado sob papel NOSUPERUSER NOBYPASSRLS em tests/ass-04-statement-db.test.ts (T-ST-db-5: A não lê, não paga nem aplica crédito no demonstrativo de B; sem GUC, zero linhas nas 4 tabelas).",
  ],
  [
    k("L1", "src/modules/subscription-billing/statements/statement.prisma-runtime.ts", "-.lockPayment", "tx.subscriptionStatementPayment", "subscriptionStatementPayment.findUniqueOrThrow", "subscription_statement_payments", "PARAMETRO(tx)", "×1"),
    "B-ASS-04: porta `StatementTx` do repositório Prisma do demonstrativo; o único criador é `PrismaStatementRepository.transaction`, que abre `withTenantRls(client, tenantId, …)` e fixa o GUC da organização antes de entregar o tx; toda instrução filtra também por `tenant_id = tenantId` (os `SELECT … FOR UPDATE` e os `updateMany`), e o isolamento é provado sob papel NOSUPERUSER NOBYPASSRLS em tests/ass-04-statement-db.test.ts (T-ST-db-5: A não lê, não paga nem aplica crédito no demonstrativo de B; sem GUC, zero linhas nas 4 tabelas).",
  ],
  [
    k("L1", "src/modules/subscription-billing/statements/statement.prisma-runtime.ts", "-.saveCredit", "tx.subscriptionCredit", "subscriptionCredit.findUniqueOrThrow", "subscription_credits", "PARAMETRO(tx)", "×1"),
    "B-ASS-04: porta `StatementTx` do repositório Prisma do demonstrativo; o único criador é `PrismaStatementRepository.transaction`, que abre `withTenantRls(client, tenantId, …)` e fixa o GUC da organização antes de entregar o tx; toda instrução filtra também por `tenant_id = tenantId` (os `SELECT … FOR UPDATE` e os `updateMany`), e o isolamento é provado sob papel NOSUPERUSER NOBYPASSRLS em tests/ass-04-statement-db.test.ts (T-ST-db-5: A não lê, não paga nem aplica crédito no demonstrativo de B; sem GUC, zero linhas nas 4 tabelas).",
  ],
  [
    k("L1", "src/modules/subscription-billing/statements/statement.prisma-runtime.ts", "-.saveCredit", "tx.subscriptionCredit", "subscriptionCredit.updateMany", "subscription_credits", "PARAMETRO(tx)", "×1"),
    "B-ASS-04: porta `StatementTx` do repositório Prisma do demonstrativo; o único criador é `PrismaStatementRepository.transaction`, que abre `withTenantRls(client, tenantId, …)` e fixa o GUC da organização antes de entregar o tx; toda instrução filtra também por `tenant_id = tenantId` (os `SELECT … FOR UPDATE` e os `updateMany`), e o isolamento é provado sob papel NOSUPERUSER NOBYPASSRLS em tests/ass-04-statement-db.test.ts (T-ST-db-5: A não lê, não paga nem aplica crédito no demonstrativo de B; sem GUC, zero linhas nas 4 tabelas).",
  ],
  [
    k("L1", "src/modules/subscription-billing/statements/statement.prisma-runtime.ts", "-.savePayment", "tx.subscriptionStatementPayment", "subscriptionStatementPayment.findUniqueOrThrow", "subscription_statement_payments", "PARAMETRO(tx)", "×1"),
    "B-ASS-04: porta `StatementTx` do repositório Prisma do demonstrativo; o único criador é `PrismaStatementRepository.transaction`, que abre `withTenantRls(client, tenantId, …)` e fixa o GUC da organização antes de entregar o tx; toda instrução filtra também por `tenant_id = tenantId` (os `SELECT … FOR UPDATE` e os `updateMany`), e o isolamento é provado sob papel NOSUPERUSER NOBYPASSRLS em tests/ass-04-statement-db.test.ts (T-ST-db-5: A não lê, não paga nem aplica crédito no demonstrativo de B; sem GUC, zero linhas nas 4 tabelas).",
  ],
  [
    k("L1", "src/modules/subscription-billing/statements/statement.prisma-runtime.ts", "-.savePayment", "tx.subscriptionStatementPayment", "subscriptionStatementPayment.updateMany", "subscription_statement_payments", "PARAMETRO(tx)", "×1"),
    "B-ASS-04: porta `StatementTx` do repositório Prisma do demonstrativo; o único criador é `PrismaStatementRepository.transaction`, que abre `withTenantRls(client, tenantId, …)` e fixa o GUC da organização antes de entregar o tx; toda instrução filtra também por `tenant_id = tenantId` (os `SELECT … FOR UPDATE` e os `updateMany`), e o isolamento é provado sob papel NOSUPERUSER NOBYPASSRLS em tests/ass-04-statement-db.test.ts (T-ST-db-5: A não lê, não paga nem aplica crédito no demonstrativo de B; sem GUC, zero linhas nas 4 tabelas).",
  ],
  [
    k("L1", "src/modules/subscription-billing/statements/statement.prisma-runtime.ts", "-.saveStatement", "tx.subscriptionStatement", "subscriptionStatement.update", "subscription_statements", "PARAMETRO(tx)", "×1"),
    "B-ASS-04: porta `StatementTx` do repositório Prisma do demonstrativo; o único criador é `PrismaStatementRepository.transaction`, que abre `withTenantRls(client, tenantId, …)` e fixa o GUC da organização antes de entregar o tx; toda instrução filtra também por `tenant_id = tenantId` (os `SELECT … FOR UPDATE` e os `updateMany`), e o isolamento é provado sob papel NOSUPERUSER NOBYPASSRLS em tests/ass-04-statement-db.test.ts (T-ST-db-5: A não lê, não paga nem aplica crédito no demonstrativo de B; sem GUC, zero linhas nas 4 tabelas).",
  ],
  // B-ASS-05: a trava do slot do cofre, colada da saída do gerador no head do bloco, com o motivo.
  [
    k("L1", "src/modules/subscription-billing/vault/vault.prisma-runtime.ts", "PrismaCredentialRepository.replaceActive", "tx", "RAW-SQL($queryRaw) OPACO", "?", "$TRANSACTION-SEM-SETTER-PROVADO", "×1"),
    "B-ASS-05: `SELECT id FROM billing_provider_credentials … FOR UPDATE` dentro do `$transaction` da gravação da credencial; a tabela é GLOBAL da plataforma, sem tenant_id e sem RLS (M4, exceção declarada no plano §3.2), então não há GUC a fixar e nenhuma tabela FORCE é tocada; o filtro é o slot (provider, environment, kind) e a trava serializa duas gravações do mesmo kind (o UNIQUE parcial segura a corrida da primeira gravação). Provado em tests/ass-05-vault-migration-drill-db.test.ts sob papel NOBYPASSRLS.",
  ],
  // B-ASS-08 (parte 1): as 12 chaves dos repositórios Prisma do canal, coladas da saída do gerador no head do bloco, com o
  // motivo por chave. Os acessos sob `withTenantRls`/`forEachTenantRls` (charges, enqueue/findById/listByStatement e a
  // varredura de plataforma da outbox) NÃO geram chave: o gerador os prova sob contexto. Gerador e WRAPPERS intocados.
  [
    k("L1", "src/modules/subscription-billing/invoice-sequence.service.ts", "-.nextDpsNumberInTx", "tx", "RAW-SQL($queryRawUnsafe) OPACO", "?", "PARAMETRO(tx)", "×1"),
    "B-ASS-08: o UPSERT atômico da numeração da DPS (l.15) toca SÓ `billing_invoice_sequences`, tabela GLOBAL da plataforma (numeração do emissor; sem tenant_id e sem RLS — M5, exceção declarada no plano §3.2); nenhuma tabela FORCE é tocada e não há GUC a fixar. O `tx` é o da transação que grava a nota (rollback não consome número). Provado em tests/ass-08-channel-db.test.ts (T-NF-db-1) sob papel NOSUPERUSER NOBYPASSRLS.",
  ],
  [
    k("L1", "src/modules/subscription-billing/outbox/outbox.prisma.ts", "PrismaOutboxRepository.#mutate", "tx.billingOutbox", "billingOutbox.updateMany", "billing_outbox", "PARAMETRO(tx de callback de withTenantRlsBudget)", "×1"),
    "B-ASS-08: o REGISTRO do claim–chamada–registro (G8) — `updateMany` por id em billing_outbox (FORCE) — roda no callback de `withTenantRlsBudget(this.client, tenantId, …)` (l.137), cujo setter do GUC é a 1ª instrução da transação (src/database/rls.ts l.128); o tenantId é o da linha reclamada (o dispatcher passa row.tenantId). Transação curta própria, separada do claim e do fetch.",
  ],
  [
    k("L1", "src/modules/subscription-billing/outbox/outbox.prisma.ts", "PrismaOutboxRepository.#tenantsWithRefs", "this.client", "RAW-SQL($queryRawUnsafe) OPACO", "?", "INJETADO", "×1"),
    "B-ASS-08: `SELECT DISTINCT tenant_id FROM billing_statement_refs` (l.72) lê SÓ a tabela GLOBAL de ids (sem RLS, sem dado de negócio — M5, exceção declarada S8); é o índice que lista as organizações candidatas do claim POR ORGANIZAÇÃO (plano §3.8) sem varrer tabela FORCE; nenhuma tabela FORCE é tocada.",
  ],
  // Conserto J-522 (R-OBX-5, D2): o claim passou de 1 comando (`WITH picked … UPDATE`) a 3 passos na MESMA transação —
  // (1) `SELECT … FOR UPDATE SKIP LOCKED LIMIT 1`, (2) releitura do demonstrativo + cobrança viva, (3) `UPDATE` para
  // PROCESSING | SKIPPED | NEEDS_REVIEW. Logo billing_outbox ×1 → ×5 e duas chaves NOVAS para o mesmo método, todas no
  // callback de `withTenantRlsBudget`. Literal L0 (123) intocado: nenhuma tabela FORCE nova.
  [
    k("L1", "src/modules/subscription-billing/outbox/outbox.prisma.ts", "PrismaOutboxRepository.claimNext", "tx", "RAW-SQL($queryRawUnsafe)", "billing_outbox", "PARAMETRO(tx de callback de withTenantRlsBudget)", "×5"),
    "B-ASS-08 / R-OBX-5 (conserto J-522): os 5 acessos a billing_outbox (FORCE) do claim — `SELECT … FOR UPDATE SKIP LOCKED LIMIT 1`, o `EXISTS` da própria fila (outra charge_create SENT/PROCESSING) na releitura, e os 3 `UPDATE … WHERE id = $1` (PROCESSING | SKIPPED + skip_reason | NEEDS_REVIEW + last_error) — rodam, organização a organização, no MESMO callback de `withTenantRlsBudget(this.client, tenantId, CLAIM_BUDGET, …)`, cujo setter do GUC é a 1ª instrução da transação (src/database/rls.ts l.128); dois workers nunca pegam a mesma linha. Provado em tests/ass-08-channel-db.test.ts (T-OBX-db-1, T-OBX-db-3 e o vermelho-controle: sem GUC a tabela devolve zero) sob papel NOSUPERUSER NOBYPASSRLS.",
  ],
  [
    k("L1", "src/modules/subscription-billing/outbox/outbox.prisma.ts", "PrismaOutboxRepository.claimNext", "tx", "RAW-SQL($queryRawUnsafe)", "subscription_statements", "PARAMETRO(tx de callback de withTenantRlsBudget)", "×1"),
    "B-ASS-08 / R-OBX-5 (conserto J-522): releitura do demonstrativo (`SELECT s.status, s.reopened_at … FROM subscription_statements s WHERE s.id = $1`) na MESMA transação do claim (`withTenantRlsBudget`, GUC setado na 1ª instrução, rls.ts l.128); tabela FORCE da MESMA organização da linha reclamada — pago/cancelado/reaberto/refechado → SKIPPED, nunca sai. Provado em T-OBX-db-3 sob papel NOSUPERUSER NOBYPASSRLS (sem GUC o demonstrativo seria invisível e a linha iria a NEEDS_REVIEW statement_not_found, nunca a PROCESSING).",
  ],
  [
    k("L1", "src/modules/subscription-billing/outbox/outbox.prisma.ts", "PrismaOutboxRepository.claimNext", "tx", "RAW-SQL($queryRawUnsafe)", "subscription_statement_charges", "PARAMETRO(tx de callback de withTenantRlsBudget)", "×1"),
    "B-ASS-08 / R-OBX-5 (conserto J-522): releitura da cobrança viva (`EXISTS (SELECT 1 FROM subscription_statement_charges c WHERE c.statement_id = s.id AND c.status IN ('pending','confirmed'))`) na MESMA transação do claim (`withTenantRlsBudget`, GUC setado na 1ª instrução, rls.ts l.128); tabela FORCE da MESMA organização — cobrança viva já existente → NEEDS_REVIEW charge_already_exists, nunca 2ª cobrança. Provado em T-OBX-db-3 sob papel NOSUPERUSER NOBYPASSRLS.",
  ],
  [
    k("L1", "src/modules/subscription-billing/outbox/outbox.prisma.ts", "PrismaOutboxRepository.retry", "tx", "RAW-SQL($queryRawUnsafe)", "billing_outbox", "PARAMETRO(tx de callback de withTenantRlsBudget)", "×1"),
    "B-ASS-08: o `retry` (FAILED → PENDING) é `UPDATE … WHERE id = $1 AND status = 'FAILED'` em billing_outbox (FORCE) no callback de `withTenantRlsBudget(this.client, tenantId, …)` (l.179), cujo setter do GUC é a 1ª instrução da transação (src/database/rls.ts l.128).",
  ],
  // 2º conserto do #522 (E8): o pedido de cobrança é UMA transação numa UMA conexão. O SQL de `enqueue`, `listByStatement`,
  // `findLive` e `put` foi EXTRAÍDO, sem mudar, para funções `*InTx` sobre um `tx` já aberto (os métodos delegam), e a trava
  // do D1 é o `lockStatement` da porta Prisma do pedido. As 5 chaves abaixo são as que o gerador acusou no head (a de
  // `PrismaStatementRefRepository.put` saiu: o método não tem mais SQL). Literal L0 (123) intocado: nenhuma tabela FORCE nova.
  [
    k("L1", "src/modules/subscription-billing/charges/charge-intent.prisma.ts", "-.lockStatement", "tx", "RAW-SQL($queryRawUnsafe)", "subscription_statements", "PARAMETRO(tx)", "×1"),
    "2º conserto do #522 (E8): a trava do D1 no pedido — `SELECT id, status FROM subscription_statements WHERE id = $1 AND tenant_id = $2 FOR UPDATE`, que filtra também por tenant_id — sobre o `tx` de `prismaChargeIntentTx(tx, tenantId)`, cujo criador é `PrismaChargeIntentRepository.transaction` (`withTenantRlsBudget`, setter do GUC na 1ª instrução, src/database/rls.ts l.128). Provado sob papel NOSUPERUSER NOBYPASSRLS em tests/ass-08-channel-db.test.ts (T-CHG-db-1/2 e T-LOCK-1a: a 4ª instrução é esta trava, depois dos 3 set_config).",
  ],
  [
    k("L1", "src/modules/subscription-billing/charges/charges.prisma.ts", "-.findLiveInTx", "tx", "RAW-SQL($queryRawUnsafe)", "subscription_statement_charges", "PARAMETRO(tx)", "×1"),
    "2º conserto do #522 (E8): o SELECT da cobrança viva de `findLive`, extraído sem mudar para rodar sobre um `tx` já aberto; os chamadores abrem a transação sob o GUC da organização — `PrismaStatementChargeRepository.findLive` (`withTenantRls`, que o gerador prova sob contexto) e `prismaChargeIntentTx` (o `tx` de `withTenantRlsBudget` do pedido, rls.ts l.128). Provado em T-CHG-db-1/2 sob papel NOSUPERUSER NOBYPASSRLS.",
  ],
  [
    k("L1", "src/modules/subscription-billing/outbox/outbox.prisma.ts", "-.enqueueInTx", "tx", "RAW-SQL($queryRawUnsafe)", "billing_outbox", "PARAMETRO(tx)", "×2"),
    "2º conserto do #522 (E8): o `INSERT … ON CONFLICT (idempotency_key) DO NOTHING` e o SELECT da existente de `enqueue`, extraídos sem mudar para rodar sobre um `tx` já aberto; os chamadores abrem a transação sob o GUC da organização — `PrismaOutboxRepository.enqueue` (`withTenantRls`) e `prismaChargeIntentTx` (o `tx` de `withTenantRlsBudget` do pedido, rls.ts l.128), na MESMA transação da trava do demonstrativo. Provado em T-CHG-db-1/2 e T-LOCK-1a sob papel NOSUPERUSER NOBYPASSRLS.",
  ],
  [
    k("L1", "src/modules/subscription-billing/outbox/outbox.prisma.ts", "-.listByStatementInTx", "tx", "RAW-SQL($queryRawUnsafe)", "billing_outbox", "PARAMETRO(tx)", "×1"),
    "2º conserto do #522 (E8): o SELECT das linhas do demonstrativo de `listByStatement`, extraído sem mudar para rodar sobre um `tx` já aberto; os chamadores abrem a transação sob o GUC da organização — `PrismaOutboxRepository.listByStatement` (`withTenantRls`) e `prismaChargeIntentTx` (o `tx` de `withTenantRlsBudget` do pedido, rls.ts l.128), lido DEPOIS da trava. Provado em T-CHG-db-1/2 sob papel NOSUPERUSER NOBYPASSRLS.",
  ],
  [
    k("L1", "src/modules/subscription-billing/webhooks/statement-refs.prisma.ts", "-.putRefInTx", "tx", "RAW-SQL($queryRawUnsafe) OPACO", "?", "PARAMETRO(tx)", "×1"),
    "2º conserto do #522 (E8): o UPSERT do índice de `put`, extraído sem mudar; toca SÓ `billing_statement_refs`, tabela GLOBAL de ids (sem RLS; M5, exceção declarada S8 — leva do externalReference ao tenant_id sem varrer N organizações); nenhuma tabela FORCE é tocada. Recebe o cliente (`put`) ou o `tx` do pedido (`prismaChargeIntentTx`), onde o índice nasce na mesma transação da linha.",
  ],
  [
    k("L1", "src/modules/subscription-billing/webhooks/statement-refs.prisma.ts", "PrismaStatementRefRepository.resolve", "this.client", "RAW-SQL($queryRawUnsafe) OPACO", "?", "INJETADO", "×1"),
    "B-ASS-08: a leitura do índice (l.38) é a resolução da organização pelo NOSSO statement_id (R-WH-5), SÓ na tabela GLOBAL de ids `billing_statement_refs` (sem RLS); nenhuma tabela FORCE é tocada.",
  ],
  [
    k("L1", "src/modules/subscription-billing/webhooks/statement-refs.prisma.ts", "PrismaStatementRefRepository.setExternalChargeId", "this.client", "RAW-SQL($executeRawUnsafe) OPACO", "?", "INJETADO", "×1"),
    "B-ASS-08: atualiza (só UPDATE, nunca cria) o id da cobrança no índice GLOBAL `billing_statement_refs` (l.45; sem RLS, só ids); nenhuma tabela FORCE é tocada.",
  ],
  [
    k("L1", "src/modules/subscription-billing/webhooks/webhook-events.prisma.ts", "PrismaWebhookEventRepository.find", "this.client", "RAW-SQL($queryRawUnsafe) OPACO", "?", "INJETADO", "×1"),
    "B-ASS-08: `billing_webhook_events` é GLOBAL da plataforma (a organização é desconhecida ao receber; sem tenant_id e sem RLS — M5, exceção declarada §3.2); a leitura por (provider, external_event_id) (l.66) não toca tabela FORCE e a linha guarda só o digest do corpo.",
  ],
  [
    k("L1", "src/modules/subscription-billing/webhooks/webhook-events.prisma.ts", "PrismaWebhookEventRepository.listByProvider", "this.client", "RAW-SQL($queryRawUnsafe) OPACO", "?", "INJETADO", "×1"),
    "B-ASS-08: listagem por provedor (l.99) na tabela GLOBAL `billing_webhook_events` (sem RLS); não toca tabela FORCE.",
  ],
  [
    k("L1", "src/modules/subscription-billing/webhooks/webhook-events.prisma.ts", "PrismaWebhookEventRepository.listStale", "this.client", "RAW-SQL($queryRawUnsafe) OPACO", "?", "INJETADO", "×1"),
    "B-ASS-08: a varredura dos eventos `received` órfãos (l.107, R-WH-8) na tabela GLOBAL `billing_webhook_events` (sem RLS); não toca tabela FORCE.",
  ],
  [
    k("L1", "src/modules/subscription-billing/webhooks/webhook-events.prisma.ts", "PrismaWebhookEventRepository.markStatus", "this.client", "RAW-SQL($queryRawUnsafe) OPACO", "?", "INJETADO", "×2"),
    "B-ASS-08: duas instruções (l.75) na tabela GLOBAL `billing_webhook_events` (sem RLS) — o SELECT da linha atual e o UPDATE do estado e da organização resolvida; não toca tabela FORCE.",
  ],
]);

type GeneratorRun = { readonly status: number | null; readonly stdout: string; readonly stderr: string; readonly keys: string[] };

function runGenerator(extraArgs: readonly string[]): GeneratorRun {
  const result = spawnSync(process.execPath, [GENERATOR, ".", ...extraArgs], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    timeout: GENERATOR_TIMEOUT_MS,
    maxBuffer: 64 * 1024 * 1024,
  });
  const stdout = result.stdout ?? "";

  return {
    status: result.status,
    stdout,
    stderr: `${result.stderr ?? ""}${result.error ? `\n${result.error.message}` : ""}`,
    keys: stdout.split(/\r?\n/).filter((line) => line.startsWith("L1\t") || line.startsWith("L2\t")),
  };
}

function setDiff(left: readonly string[], right: readonly string[]): string[] {
  const other = new Set(right);
  return left.filter((item) => !other.has(item));
}

test("T13 · ratchet semântico: congelado com motivo por chave, 31 formas vermelhas e a 'sumida' vermelha", { timeout: 3 * GENERATOR_TIMEOUT_MS }, async (t) => {
  const fixtures = readdirSync(path.join(REPO_ROOT, FIXTURES_DIR))
    .filter((name) => name.endsWith(".ts"))
    .sort();

  assert.equal(fixtures.length, 31, `esperava 27 fixtures herdadas + C3A/C3B/C3C/C3E; vieram ${fixtures.length}`);

  const withMutants = runGenerator(fixtures.flatMap((name) => ["--mutant", path.join(FIXTURES_DIR, name)]));
  assert.equal(withMutants.status, 0, `o gerador (head + 27 fixtures) falhou:\n${withMutants.stderr}`);
  assert.equal(withMutants.stderr, "", `stderr do gerador precisa ser vazio:\n${withMutants.stderr}`);
  assert.match(withMutants.stdout, /OPS\(derivados\)=17\b/);

  const headKeys = withMutants.keys.filter((key) => !key.includes("\tsrc/modules/zz-mut/")).sort();

  await t.test("o inventário do head == congelado (origin/main − sumidas + novas), motivo por chave", () => {
    assert.equal(ORIGIN_MAIN.length, 53, "o inventário do origin/main tem 53 chaves (Apêndice A)");

    for (const [key, motivo] of [...SUMIDAS, ...NOVAS]) {
      assert.ok(motivo.trim().length > 0, `chave sem motivo: ${key}`);
    }
    for (const key of SUMIDAS.keys()) {
      assert.ok(ORIGIN_MAIN.includes(key), `"sumida" que não existia no origin/main: ${key}`);
    }
    for (const key of NOVAS.keys()) {
      assert.ok(!ORIGIN_MAIN.includes(key), `"nova" que já existia no origin/main: ${key}`);
    }

    const congelado = [...ORIGIN_MAIN.filter((key) => !SUMIDAS.has(key)), ...NOVAS.keys()].sort();
    const semMotivoNovas = setDiff(headKeys, congelado);
    const semMotivoSumidas = setDiff(congelado, headKeys);

    assert.deepEqual(
      { novasSemMotivo: semMotivoNovas, sumidasSemMotivo: semMotivoSumidas },
      { novasSemMotivo: [], sumidasSemMotivo: [] },
      "o inventário do head mudou sem atualização consciente do congelado (motivo por chave em NOVAS/SUMIDAS)",
    );
  });

  for (const fixture of fixtures) {
    await t.test(`forma ${fixture} → o gerador a põe no inventário (+≥1 chave)`, () => {
      const attributed = withMutants.keys.filter((key) => key.includes(`\tsrc/modules/zz-mut/${fixture}\t`));
      assert.ok(attributed.length >= 1, `a forma ${fixture} passou VERDE pelo gerador (0 chaves) — defeito do gerador`);
    });
  }

  await t.test("L0 exato: tabela qualificada e model sem @@map entram por nome", () => {
    const f2 = runGenerator([
      "--schema-extra", path.join(FIXTURES_DIR, "c2-f2-schema.prisma"),
      "--migration-extra", path.join(FIXTURES_DIR, "c2-f2-migration.sql"),
      "--mutant", path.join(FIXTURES_DIR, "c2-f2-reader.fixture.tsx"),
    ]);
    assert.equal(f2.status, 0, `o gerador das grafias C3-F2 falhou:\n${f2.stderr}`);
    assert.equal(f2.stderr, "");
    // B-ASS-08 (M5): 120 → 123 — exatamente as 3 tabelas FORCE novas (billing_outbox, subscription_statement_invoices,
    // subscription_statement_charges) e os 3 models delas; as 3 globais da M5 (webhook_events, statement_refs,
    // invoice_sequences) não têm RLS e não entram no L0.
    assert.match(f2.stdout, /tabelas ENABLE=123 FORCE=123 · acessores Prisma em FORCE=123/);
    assert.match(f2.stdout, /"C2ForceDefault"/);
    for (const accessor of ["c2ForceQualified.findMany", "c2ForceDefault.findMany", "c2ForceControl.findMany"]) {
      assert.ok(f2.keys.some((key) => key.includes(`\t${accessor}\t`)), `${accessor} precisa entrar no inventário`);
    }
  });

  await t.test("'sumida': a fábrica do sítio 7 trocada por fora → novas=1 sumidas=1", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "san3-05-sumida-"));

    try {
      const original = readFileSync(path.join(REPO_ROOT, SITE_7), "utf8");
      const mutated = original.replace(
        "new PrismaCloudCostAllocationRepository(prisma)",
        "new PrismaCloudCostAllocationRepository(prisma as never)",
      );
      assert.notEqual(mutated, original, "a âncora da fábrica do sítio 7 não casou — o override seria vacuamente igual");

      const overrideFile = path.join(dir, "site7.ts");
      writeFileSync(overrideFile, mutated);

      const overridden = runGenerator(["--override", `${SITE_7}=${overrideFile}`]);
      assert.equal(overridden.status, 0, `o gerador (head + override) falhou:\n${overridden.stderr}`);

      const novas = setDiff(overridden.keys, headKeys);
      const sumidas = setDiff(headKeys, overridden.keys);

      assert.equal(novas.length, 1, `novas: ${JSON.stringify(novas)}`);
      assert.equal(sumidas.length, 1, `sumidas: ${JSON.stringify(sumidas)}`);
      assert.equal(
        sumidas[0],
        k("L2", SITE_7, "new PrismaCloudCostAllocationRepository(prisma)", "CRU", "×1"),
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
