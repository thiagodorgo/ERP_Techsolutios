import assert from "node:assert/strict";
import test from "node:test";

import {
  computeStaff,
  consolidateStaff,
  type GroupPanelStaffRow,
} from "../src/modules/group-panel/group-panel.staff.js";

function staff(input: Partial<GroupPanelStaffRow> & Pick<GroupPanelStaffRow, "userId">): GroupPanelStaffRow {
  return {
    userId: input.userId,
    identityId: input.identityId ?? null,
    localKey: input.localKey ?? `tenant:${input.userId}`,
    active: input.active ?? true,
    profiles: input.profiles ?? ["field_technician"],
  };
}

test("STF-1: ativos são contados por pátio", () => {
  const result = computeStaff([staff({ userId: "u1" }), staff({ userId: "u2" })], []);
  assert.equal(result.activeUsers, 2);
});

test("STF-2: usuário com dois perfis conta uma vez no total e uma vez em cada perfil", () => {
  const result = computeStaff([staff({ userId: "u1", profiles: ["manager", "field_technician"] })], []);
  assert.equal(result.activeUsers, 1);
  assert.deepEqual(result.byProfile, [
    { profile: "field_technician", count: 1 },
    { profile: "manager", count: 1 },
  ]);
});

test("STF-3: a mesma pessoa ativa em três pátios conta uma vez no grupo", () => {
  const identityId = "person-1";
  const blocks = ["a", "b", "c"].map((tenant) =>
    computeStaff([staff({ userId: `u-${tenant}`, identityId, localKey: `${tenant}:u-${tenant}` })], []),
  );
  const result = consolidateStaff(blocks);
  assert.equal(result.activeUsers, 1);
  assert.deepEqual(result.byProfile, [{ profile: "field_technician", count: 1 }]);
});

test("STF-4: inativo fica fora de todas as contagens", () => {
  const result = computeStaff([staff({ userId: "u1", active: false })], ["u1"]);
  assert.equal(result.activeUsers, 0);
  assert.equal(result.inServiceNow, 0);
  assert.deepEqual(result.byProfile, []);
});

test("STF-5: atendimento agora conta técnicos distintos atribuídos", () => {
  const result = computeStaff(
    [staff({ userId: "u1", identityId: "p1" }), staff({ userId: "u2", identityId: "p2" })],
    ["u1", "u1", "u2"],
  );
  assert.equal(result.inServiceNow, 2);
});

test("STF-6: fallback local não une contas sem identidade entre pátios", () => {
  const result = consolidateStaff([
    computeStaff([staff({ userId: "u1", identityId: null, localKey: "a:u1" })], []),
    computeStaff([staff({ userId: "u1", identityId: null, localKey: "b:u1" })], []),
  ]);
  assert.equal(result.activeUsers, 2);
});
