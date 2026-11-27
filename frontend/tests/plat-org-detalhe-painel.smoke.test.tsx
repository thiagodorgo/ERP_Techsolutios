import assert from "node:assert/strict";
import test from "node:test";

import { composePlatformOrganizations, filterPlatformOrganizations } from "../src/modules/platform/platform-organizations.state";
import type { PlatformOverviewData } from "../src/modules/platform/platform-overview.types";
import { ORGANIZATION_A, ORGANIZATION_SYSTEM } from "./helpers/plat-org.fixture";

const overview: PlatformOverviewData = {
  activeOrgs: 3,
  totalOrgs: 3,
  totalUsers: 11,
  source: "api",
  forbidden: false,
  stale: false,
  orgs: [
    { id: ORGANIZATION_SYSTEM.id, name: "nome não canônico", slug: "platform", status: "active", userCount: 8, moduleCount: 2, createdAt: ORGANIZATION_SYSTEM.createdAt },
    { id: "somente-overview", name: "Não deve nascer", status: "active", userCount: 99, moduleCount: 99, createdAt: "2026-01-01" },
    { id: ORGANIZATION_A.id, name: "nome não canônico", status: "suspended", userCount: 3, moduleCount: 1, createdAt: ORGANIZATION_A.createdAt },
  ],
};

test("FP10 composição por id usa somente organizações canônicas, conserva ordem e marca status divergente", () => {
  const rows = composePlatformOrganizations([ORGANIZATION_A, ORGANIZATION_SYSTEM], overview);
  assert.deepEqual(rows.map((row) => row.id), [ORGANIZATION_A.id, ORGANIZATION_SYSTEM.id]);
  assert.equal(rows[0]?.name, "Organização A");
  assert.equal(rows[0]?.userCount, 3);
  assert.equal(rows[0]?.countsStale, true);
  assert.equal(rows[1]?.userCount, 8);
  assert.equal(rows.some((row) => row.id === "somente-overview"), false);
});

test("FP10 contagem ausente é desconhecida, nunca zero", () => {
  const rows = composePlatformOrganizations([ORGANIZATION_A], { ...overview, orgs: [] });
  assert.equal(rows[0]?.userCount, null);
  assert.equal(rows[0]?.moduleCount, null);
});

test("FP12 incompleto é dimensão própria e busca inclui grupo", () => {
  const completePending = { ...ORGANIZATION_A, id: "pending", status: "pending" as const, setup: { complete: true, missing: [] } };
  const rows = composePlatformOrganizations([ORGANIZATION_A, completePending, ORGANIZATION_SYSTEM], { ...overview, orgs: [] });
  assert.deepEqual(filterPlatformOrganizations(rows, { query: "grupo teste", groupId: "", status: "incomplete" }).map((row) => row.id), [ORGANIZATION_A.id]);
  assert.deepEqual(filterPlatformOrganizations(rows, { query: "", groupId: "", status: "active" }).map((row) => row.id), [ORGANIZATION_A.id, ORGANIZATION_SYSTEM.id]);
});
