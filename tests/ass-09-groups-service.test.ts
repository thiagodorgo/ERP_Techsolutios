import assert from "node:assert/strict";
import test from "node:test";

import type { PrismaClient } from "@prisma/client";

import { PrismaEconomicGroupsRepository, sqlStateOf } from "../src/modules/subscription-billing/economic-groups/economic-groups.prisma.js";
import {
  InMemoryEconomicGroupsRepository,
  MembershipConflictError,
  MembershipRangeError,
  type EconomicGroupsRepository,
  type MembershipAuditEvent,
  type MembershipChanges,
} from "../src/modules/subscription-billing/economic-groups/economic-groups.repository.js";
import {
  EconomicGroupsService,
  type GroupTenantDirectory,
  type GroupTenantRef,
  type MembershipAuditChange,
} from "../src/modules/subscription-billing/economic-groups/economic-groups.service.js";

// -----------------------------------------------------------------------------------------------
// B-ASS-09 · F5b — serviço do grupo econômico em MEMÓRIA (Emenda 2 §2.1): R-GRP-3 a R-GRP-6 e R-GRP-8 (T-GRP-5 a
// T-GRP-11 e T-GRP-13), mais o T-GRP-14 da Emenda 2.1 §5. Sem HTTP (a rota é da F6): os casos chamam o
// `EconomicGroupsService` com o `InMemoryEconomicGroupsRepository` (que espelha a exclusão e o CHECK da M6) e o relógio
// fixo, e asserem o `statusCode` e o `reason` do `SubscriptionBillingError`. `tests/ass-09-groups.test.ts` é da F2.
//
// Mutações que estes casos matam (as do `membership.rules.ts` se aplicam no worktree e se restauram, nunca se commitam):
//   M-GRP-7  (serviço) tirar `if (inAnotherGroup.length > 0) throw tenantInAnotherGroup(inAnotherGroup);`     → T-GRP-5: 409 membership_conflict
//   M-GRP-4  (F2) `return deriveBusinessDate(now);` → `return now.toISOString().slice(0, 10);`              → T-GRP-8: 422 membership_retroactive
//   M-GRP-8  (dublê) o nome sem `toLowerCase()`                                                            → T-GRP-9: o duplicado passa
//   M-GRP-11 (F2) `return row.validTo === null || row.validTo > from;` → `return row.validTo === null;`     → T-GRP-11: 409 membership_conflict
//   M-GRP-12 (F2) `if (validFrom <= row.validFrom) throw retroactive();` → `<`                              → T-GRP-13: 422 membership_range_invalid
//   M-GRP-13 (serviço) tirar `if (error instanceof MembershipRangeError) throw rangeInvalid();`             → T-GRP-14: statusCode indefinido
//   M-C2-40P01 (Prisma) `new Set(["23P01", "40P01"])` → `new Set(["23P01"])` (J-566, C2-1)                  → T-GRP-15: o erro cru do driver sobe
// -----------------------------------------------------------------------------------------------

const A = "00000000-0000-4000-8000-00000000000a";
const B = "00000000-0000-4000-8000-00000000000b";
const C = "00000000-0000-4000-8000-00000000000c";
const PLATFORM = "00000000-0000-4000-8000-0000000000ff";

class TestDirectory implements GroupTenantDirectory {
  private readonly tenants = new Map<string, GroupTenantRef>([
    [A, { id: A, slug: "org-a", name: "Organização A" }],
    [B, { id: B, slug: "org-b", name: "Organização B" }],
    [C, { id: C, slug: "org-c", name: "Organização C" }],
    [PLATFORM, { id: PLATFORM, slug: "platform", name: "Plataforma" }],
  ]);

  async getTenant(id: string): Promise<GroupTenantRef | null> {
    return this.tenants.get(id) ?? null;
  }

  async listTenantIds(): Promise<readonly string[]> {
    return [...this.tenants.keys()];
  }
}

/** Relógio em data de negócio de São Paulo: meio-dia SP do dia pedido (15:00 UTC). */
function spNoon(day: string): () => Date {
  return () => new Date(`${day}T15:00:00.000Z`);
}

function setup(clock: () => Date, audit?: (change: MembershipAuditChange) => MembershipAuditEvent) {
  const repository = new InMemoryEconomicGroupsRepository();
  const service = new EconomicGroupsService(repository, new TestDirectory(), clock, audit);
  return { repository, service };
}

async function expectError(
  label: string,
  run: () => Promise<unknown>,
  expected: { statusCode: number; reason: string },
): Promise<any> {
  let caught: any;
  await assert.rejects(
    run,
    (error: any) => {
      caught = error;
      assert.equal(error?.statusCode, expected.statusCode, `${label}: status (motivo recebido: ${error?.reason ?? error?.code})`);
      assert.equal(error?.reason, expected.reason, `${label}: motivo`);
      return true;
    },
    label,
  );
  return caught;
}

test("T-GRP-5..7 · um grupo por vez: G2 com organização vigente em G1 → 422 com a lista; mover = sair de G1 e entrar em G2", async () => {
  // MUTAÇÃO QUE MATA: M-GRP-7 (sem a conferência do serviço, o espelho da exclusão responde 409 `membership_conflict`).
  const { service } = setup(spNoon("2026-10-01"));
  const g1 = await service.createGroup({ name: "Grupo 1", actorId: null });
  const g2 = await service.createGroup({ name: "Grupo 2", actorId: null });
  await service.putMembers(g1.id, { tenantIds: [A, C], actorId: null });

  const error = await expectError("G2 com C vigente em G1", () => service.putMembers(g2.id, { tenantIds: [C, B], actorId: null }), {
    statusCode: 422,
    reason: "tenant_in_another_group",
  });
  assert.deepEqual(error.tenantIds, [C], "a resposta lista as organizações que já estão em outro grupo");
  assert.equal((await service.getGroup(g2.id)).members.length, 0, "nada mudou em G2");

  // Mover C para G2 a partir de 2026-11-01: sai de G1 e entra em G2, no mesmo dia.
  await service.putMembers(g1.id, { tenantIds: [A], validFrom: "2026-11-01", actorId: null });
  await service.putMembers(g2.id, { tenantIds: [C], validFrom: "2026-11-01", actorId: null });
  const g1History = await service.history(g1.id);
  const g2History = await service.history(g2.id);
  assert.deepEqual(
    [...g1History, ...g2History].filter((row) => row.tenantId === C).map((row) => [row.validFrom, row.validTo]),
    [
      ["2026-10-01", "2026-11-01"],
      ["2026-11-01", null],
    ],
    "histórico de C: 2 linhas, a de G1 fechada no dia em que a de G2 começa",
  );
  assert.equal((await service.getGroup(g1.id)).memberCount, 2, "em 2026-10-01 C ainda conta em G1");
  const g2Detail = await service.getGroup(g2.id);
  assert.deepEqual(
    g2Detail.members.map((m) => [m.tenantId, m.scheduled, m.tenantName]),
    [[C, true, "Organização C"]],
    "o vínculo agendado aparece com scheduled: true",
  );
});

test("T-GRP-8 · data de negócio em SP: 13/10 22:30 SP aceita validFrom 2026-10-13 e recusa 2026-10-12", async () => {
  // MUTAÇÃO QUE MATA: M-GRP-4 (`todayBusinessDate` em UTC daria 2026-10-14 e recusaria 2026-10-13).
  const { service } = setup(() => new Date("2026-10-14T01:30:00.000Z"));
  const g1 = await service.createGroup({ name: "Grupo 1", actorId: null });
  await service.putMembers(g1.id, { tenantIds: [A], validFrom: "2026-10-13", actorId: null });
  assert.deepEqual((await service.history(g1.id)).map((row) => row.validFrom), ["2026-10-13"]);
  await expectError("validFrom de ontem em SP", () => service.putMembers(g1.id, { tenantIds: [A, B], validFrom: "2026-10-12", actorId: null }), {
    statusCode: 422,
    reason: "membership_retroactive",
  });
  const padrao = await service.putMembers(g1.id, { tenantIds: [A, B], actorId: null });
  assert.deepEqual(
    padrao.members.map((m) => [m.tenantId, m.validFrom]).sort(),
    [
      [A, "2026-10-13"],
      [B, "2026-10-13"],
    ],
    "sem validFrom, vale hoje em SP",
  );
});

test("T-GRP-9..10 · nome sem diferenciar maiúsculas entre os não excluídos; excluir libera o nome; excluir com membro → 422", async () => {
  // MUTAÇÃO QUE MATA: M-GRP-8 (no dublê, o nome sem `toLowerCase()` → o duplicado em outra caixa passa).
  const { repository, service } = setup(spNoon("2026-10-01"));
  const g1 = await service.createGroup({ name: "Grupo Um", actorId: null });
  await expectError("mesmo nome em outra caixa", () => service.createGroup({ name: "  grupo um ", actorId: null }), {
    statusCode: 409,
    reason: "group_name_exists",
  });
  await expectError("nome vazio", () => service.createGroup({ name: "   ", actorId: null }), { statusCode: 422, reason: "name_invalid" });
  await expectError("nome com 121 caracteres", () => service.createGroup({ name: "x".repeat(121), actorId: null }), {
    statusCode: 422,
    reason: "name_invalid",
  });
  const g2 = await service.createGroup({ name: "Grupo Dois", notes: " nota ", actorId: null });
  assert.equal(g2.notes, "nota");
  await expectError("renomear para nome ativo", () => service.patchGroup(g2.id, { name: "GRUPO UM", actorId: null }), {
    statusCode: 409,
    reason: "group_name_exists",
  });

  await service.putMembers(g1.id, { tenantIds: [A], actorId: null });
  await expectError("excluir com membro vigente", () => service.deleteGroup(g1.id, null), { statusCode: 422, reason: "group_has_members" });
  await service.putMembers(g2.id, { tenantIds: [B], validFrom: "2026-12-01", actorId: null });
  await expectError("excluir com membro agendado", () => service.deleteGroup(g2.id, null), { statusCode: 422, reason: "group_has_members" });

  await service.putMembers(g1.id, { tenantIds: [], validFrom: "2026-10-02", actorId: null });
  const later = new EconomicGroupsService(repository, new TestDirectory(), spNoon("2026-10-02"));
  await later.deleteGroup(g1.id, null);
  await expectError("grupo excluído", () => later.getGroup(g1.id), { statusCode: 404, reason: "group_not_found" });
  const again = await later.createGroup({ name: "grupo um", actorId: null });
  assert.equal(again.name, "grupo um", "o nome do grupo excluído volta a valer");
  assert.deepEqual(
    (await later.listGroups()).map((g) => g.name).sort(),
    ["Grupo Dois", "grupo um"],
    "a lista não traz o excluído",
  );
});

test("T-GRP-11 · vigência futura: a sequência do crítico no dublê", async () => {
  // MUTAÇÃO QUE MATA: M-GRP-11 (`overlaps` sem o fechado no futuro → a 3ª chamada cai no espelho da exclusão: 409).
  const { service } = setup(spNoon("2026-10-01"));
  const g1 = await service.createGroup({ name: "Grupo 1", actorId: null });
  const g2 = await service.createGroup({ name: "Grupo 2", actorId: null });
  await service.putMembers(g1.id, { tenantIds: [C], validFrom: "2026-10-01", actorId: null });
  await service.putMembers(g1.id, { tenantIds: [], validFrom: "2026-12-01", actorId: null });
  await expectError("G2 com C em 15/11", () => service.putMembers(g2.id, { tenantIds: [C], validFrom: "2026-11-15", actorId: null }), {
    statusCode: 422,
    reason: "tenant_in_another_group",
  });
  await service.putMembers(g2.id, { tenantIds: [C], validFrom: "2026-12-01", actorId: null });
  const rows = [...(await service.history(g1.id)), ...(await service.history(g2.id))].map((row) => [row.validFrom, row.validTo]);
  assert.deepEqual(rows, [
    ["2026-10-01", "2026-12-01"],
    ["2026-12-01", null],
  ]);
});

test("T-GRP-13 · fechar no dia do início → 422 membership_retroactive, nunca 500", async () => {
  // MUTAÇÃO QUE MATA: M-GRP-12 (`<` no lugar de `<=` → o fechamento chega ao CHECK espelhado: 422 membership_range_invalid).
  const { service } = setup(spNoon("2026-11-20"));
  const g1 = await service.createGroup({ name: "Grupo 1", actorId: null });
  await service.putMembers(g1.id, { tenantIds: [C], validFrom: "2026-11-20", actorId: null });
  await expectError("fechar no dia do início", () => service.putMembers(g1.id, { tenantIds: [], validFrom: "2026-11-20", actorId: null }), {
    statusCode: 422,
    reason: "membership_retroactive",
  });
  assert.deepEqual((await service.history(g1.id)).map((row) => [row.validFrom, row.validTo]), [["2026-11-20", null]], "nada mudou");
});

test("T-GRP-14 · o MembershipRangeError do repositório vira 422 membership_range_invalid", async () => {
  // MUTAÇÃO QUE MATA: M-GRP-13 (sem a tradução, o erro cru sobe sem `statusCode`).
  const inner = new InMemoryEconomicGroupsRepository();
  const failing: EconomicGroupsRepository = {
    createGroup: (input) => inner.createGroup(input),
    getGroup: (id) => inner.getGroup(id),
    listGroups: () => inner.listGroups(),
    updateGroup: (id, patch) => inner.updateGroup(id, patch),
    softDeleteGroup: (id, actor, at) => inner.softDeleteGroup(id, actor, at),
    listMembershipsOfTenants: (ids) => inner.listMembershipsOfTenants(ids),
    applyMembershipChanges: async () => {
      throw new MembershipRangeError();
    },
  };
  const service = new EconomicGroupsService(failing, new TestDirectory(), spNoon("2026-10-01"));
  const g1 = await service.createGroup({ name: "Grupo 1", actorId: null });
  await expectError("CHECK do fim no repositório", () => service.putMembers(g1.id, { tenantIds: [A], actorId: null }), {
    statusCode: 422,
    reason: "membership_range_invalid",
  });
});

// ---- J-566 · C2-1: o impasse (40P01) na checagem da EXCLUDE `economic_group_members_no_overlap`, no caminho de escrita.
// Dois INSERT conflitantes da mesma organização gravam a tupla no índice GiST e cada um espera a transação do outro; o
// detector aborta um com 40P01 (medido na C2 da J-566 e na rodada 43589206521 da CI). O perdedor tem de receber o mesmo
// 409 `membership_conflict` da exclusão (23P01), nunca o erro cru do driver.

/** Texto do driver ou do banco que não pode subir ao cliente. */
const DRIVER_TEXT = /deadlock|40P01|DriverAdapterError|ShareLock|economic_group_members|exclusion/i;

/**
 * As 3 formas do 40P01 que chegam ao repositório: a do `@prisma/adapter-pg` numa query do ORM dentro do `$transaction` (a
 * da CI e da C2), a do erro do Prisma de SQL cru (`P2010` com `meta.driverAdapterError`) e a do `pg` puro (`code` de topo).
 */
function deadlockErrors(): Array<[string, Error]> {
  return [
    [
      "adapter-pg: DriverAdapterError com cause.originalCode",
      Object.assign(new Error("deadlock detected"), {
        name: "DriverAdapterError",
        cause: { originalCode: "40P01", originalMessage: "deadlock detected", kind: "postgres" },
      }),
    ],
    [
      "Prisma P2010: meta.driverAdapterError.cause.originalCode",
      Object.assign(new Error("Raw query failed. Code: `40P01`. Message: `deadlock detected`"), {
        code: "P2010",
        meta: { driverAdapterError: { cause: { originalCode: "40P01", originalMessage: "deadlock detected" } } },
      }),
    ],
    ["pg: code de topo", Object.assign(new Error("deadlock detected"), { code: "40P01" })],
  ];
}

/**
 * Um `PrismaClient` de mentira para o `PrismaEconomicGroupsRepository`: a transação roda o trabalho num `tx` cujo INSERT do
 * vínculo lança `insertError` (a volta da organização); com `transactionError`, é a própria transação que falha depois do
 * trabalho (a volta de fora do `mapMembershipError`).
 */
function failingPrismaClient(insertError: Error | null, transactionError: Error | null = null): PrismaClient {
  const tx = {
    $executeRaw: async () => 1,
    economicGroupMember: {
      create: async (args: { readonly data: Record<string, unknown> }) => {
        if (insertError) throw insertError;
        const now = new Date("2026-10-01T15:00:00.000Z");
        return { id: "00000000-0000-4000-8000-0000000000e1", ...args.data, valid_to: null, closed_by: null, created_at: now, updated_at: now };
      },
    },
  };
  return {
    $transaction: async (work: (client: unknown) => Promise<unknown>) => {
      const out = await work(tx);
      if (transactionError) throw transactionError;
      return out;
    },
  } as unknown as PrismaClient;
}

const OPEN_A: MembershipChanges = {
  closes: [],
  opens: [{ tenantId: A, groupId: "00000000-0000-4000-8000-000000000001", validFrom: "2026-11-01", createdBy: null }],
};

test("T-GRP-15 · 40P01 no caminho de escrita (impasse na checagem da EXCLUDE) → MembershipConflictError → 409 membership_conflict, sem texto do driver (J-566, C2-1)", async () => {
  for (const [label, error] of deadlockErrors()) {
    assert.equal(sqlStateOf(error), "40P01", `${label}: o SQLSTATE é lido`);

    // (a) No INSERT, dentro da volta da organização: o erro de domínio leva a organização.
    await assert.rejects(new PrismaEconomicGroupsRepository(failingPrismaClient(error)).applyMembershipChanges(OPEN_A), (caught: unknown) => {
      assert.ok(caught instanceof MembershipConflictError, `${label}, no INSERT: veio ${String(caught)}`);
      assert.equal(caught.tenantId, A, label);
      return true;
    });
    // (b) Na transação, fora da volta.
    await assert.rejects(new PrismaEconomicGroupsRepository(failingPrismaClient(null, error)).applyMembershipChanges(OPEN_A), (caught: unknown) => {
      assert.ok(caught instanceof MembershipConflictError, `${label}, na transação: veio ${String(caught)}`);
      assert.equal(caught.tenantId, null, label);
      return true;
    });

    // (c) Pelo serviço: o perdedor recebe 409 membership_conflict, e nenhum texto do driver sobe no erro.
    const inner = new InMemoryEconomicGroupsRepository();
    const prisma = new PrismaEconomicGroupsRepository(failingPrismaClient(error));
    const racing: EconomicGroupsRepository = {
      createGroup: (input) => inner.createGroup(input),
      getGroup: (id) => inner.getGroup(id),
      listGroups: () => inner.listGroups(),
      updateGroup: (id, patch) => inner.updateGroup(id, patch),
      softDeleteGroup: (id, actor, at) => inner.softDeleteGroup(id, actor, at),
      listMembershipsOfTenants: (ids) => inner.listMembershipsOfTenants(ids),
      applyMembershipChanges: (changes) => prisma.applyMembershipChanges(changes),
    };
    const service = new EconomicGroupsService(racing, new TestDirectory(), spNoon("2026-10-01"));
    const g1 = await service.createGroup({ name: "Grupo 1", actorId: null });
    const caught = await expectError(label, () => service.putMembers(g1.id, { tenantIds: [A], validFrom: "2026-11-01", actorId: null }), {
      statusCode: 409,
      reason: "membership_conflict",
    });
    assert.equal(caught.code, "CONFLICT", label);
    assert.doesNotMatch(`${caught.code} ${caught.reason} ${caught.message}`, DRIVER_TEXT, `${label}: nada do driver no erro`);
    assert.deepEqual(await inner.listMembershipsOfTenants([A]), [], `${label}: a troca perdida não gravou vínculo`);
  }

  // A tradução é só da corrida: outro SQLSTATE (aqui, 57014, query cancelada) não vira 409 de conflito.
  const cancelled = Object.assign(new Error("canceling statement due to statement timeout"), {
    name: "DriverAdapterError",
    cause: { originalCode: "57014", kind: "postgres" },
  });
  await assert.rejects(new PrismaEconomicGroupsRepository(failingPrismaClient(cancelled)).applyMembershipChanges(OPEN_A), (caught: unknown) => {
    assert.equal(caught instanceof MembershipConflictError, false, "57014 não é corrida de vínculo");
    return true;
  });
  // O código do Prisma (P1xxx a P6xxx) não passa por SQLSTATE; o P2002 continua 23505.
  assert.equal(sqlStateOf(Object.assign(new Error("x"), { code: "P2010" })), null);
  assert.equal(sqlStateOf(Object.assign(new Error("x"), { code: "P2034" })), null);
  assert.equal(sqlStateOf(Object.assign(new Error("x"), { code: "P2002" })), "23505");
});

test("Os outros códigos do R9 e do R6: 404 do grupo e da organização, plataforma, limite de membros, data inválida", async () => {
  const { service } = setup(spNoon("2026-10-01"));
  const g1 = await service.createGroup({ name: "Grupo 1", actorId: null });
  await expectError("grupo inexistente", () => service.putMembers("00000000-0000-4000-8000-000000000999", { tenantIds: [A], actorId: null }), {
    statusCode: 404,
    reason: "group_not_found",
  });
  await expectError("organização inexistente", () => service.putMembers(g1.id, { tenantIds: ["00000000-0000-4000-8000-000000000998"], actorId: null }), {
    statusCode: 404,
    reason: "tenant_not_found",
  });
  await expectError("organização da plataforma", () => service.putMembers(g1.id, { tenantIds: [PLATFORM], actorId: null }), {
    statusCode: 422,
    reason: "platform_organization",
  });
  const many = Array.from({ length: 501 }, (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`);
  await expectError("501 organizações", () => service.putMembers(g1.id, { tenantIds: many, actorId: null }), {
    statusCode: 422,
    reason: "too_many_members",
  });
  await expectError("data fora do formato", () => service.putMembers(g1.id, { tenantIds: [A], validFrom: "2026-13-01", actorId: null }), {
    statusCode: 400,
    reason: "invalid_valid_from",
  });
  await expectError("detalhe de grupo inexistente", () => service.getGroup("nao-existe"), { statusCode: 404, reason: "group_not_found" });
  const same = await service.putMembers(g1.id, { tenantIds: [A], actorId: null });
  const again = await service.putMembers(g1.id, { tenantIds: [A, A], actorId: null });
  assert.deepEqual(again.members, same.members, "o mesmo conjunto (e repetido) não muda nada");
});

test("Saída agendada e a mesma organização pedida de novo: o vínculo continua na data da saída, sem buraco", async () => {
  // Leitura do dev, declarada (§A6): o v2 não fixa este caso; o serviço não reabre linha, abre a continuação.
  const { service } = setup(spNoon("2026-10-01"));
  const g1 = await service.createGroup({ name: "Grupo 1", actorId: null });
  await service.putMembers(g1.id, { tenantIds: [A], actorId: null });
  await service.putMembers(g1.id, { tenantIds: [], validFrom: "2026-12-01", actorId: null });
  await service.putMembers(g1.id, { tenantIds: [A], validFrom: "2026-11-01", actorId: null });
  assert.deepEqual((await service.history(g1.id)).map((row) => [row.validFrom, row.validTo]), [
    ["2026-10-01", "2026-12-01"],
    ["2026-12-01", null],
  ]);
});

test("Trilha da troca: um evento por entrada e por saída, gravado só quando a troca vale", async () => {
  const built: MembershipAuditChange[] = [];
  const audit = (change: MembershipAuditChange): MembershipAuditEvent => {
    built.push(change);
    return { tenantId: change.tenantId, actorId: change.actorId, action: `economic_group.member_${change.kind}`, entityId: change.groupId, metadata: { valid_from: change.validFrom } };
  };
  const { repository, service } = setup(spNoon("2026-10-01"), audit);
  const g1 = await service.createGroup({ name: "Grupo 1", actorId: null });
  const g2 = await service.createGroup({ name: "Grupo 2", actorId: null });
  await service.putMembers(g1.id, { tenantIds: [A, B], actorId: null });
  await service.putMembers(g1.id, { tenantIds: [B], validFrom: "2026-11-01", actorId: null });
  await expectError("B em G2 enquanto está em G1", () => service.putMembers(g2.id, { tenantIds: [B], actorId: null }), {
    statusCode: 422,
    reason: "tenant_in_another_group",
  });
  assert.deepEqual(
    repository.listAuditEvents().map((e) => [e.action, e.tenantId, e.metadata.valid_from]),
    [
      ["economic_group.member_joined", A, "2026-10-01"],
      ["economic_group.member_joined", B, "2026-10-01"],
      ["economic_group.member_left", A, "2026-11-01"],
    ],
  );
  assert.equal(built.length, 3, "a troca recusada não montou evento");
});
