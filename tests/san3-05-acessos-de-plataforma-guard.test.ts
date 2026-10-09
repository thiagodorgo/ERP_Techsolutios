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
    assert.match(f2.stdout, /tabelas ENABLE=109 FORCE=109 · acessores Prisma em FORCE=109/);
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
