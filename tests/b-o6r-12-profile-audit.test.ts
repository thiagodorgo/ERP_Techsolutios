import assert from "node:assert/strict";
import test from "node:test";

import type { JurisdictionProfile } from "../src/modules/jurisdiction/jurisdiction.types.js";
import { computeProfileChanges } from "../src/modules/jurisdiction/jurisdiction.audit.js";
import { portalPlanFromRegime } from "../src/modules/jurisdiction/jurisdiction.service.js";

const before: JurisdictionProfile = {
  id: "10000000-0000-4000-8000-000000000001",
  tenantId: "20000000-0000-4000-8000-000000000001",
  name: "Regime anterior",
  scope: "PUBLIC_AGREEMENT",
  ownerNotifDays: 5,
  noticeEdictDay: 10,
  auctionEligibleDay: 60,
  auctionEdictBusinessDays: 15,
  dailyModel: "ROLLING_24H",
  dailyCap: "SIX_MONTHS",
  releaseRequirements: [{ code: "doc", label: "Documento anterior", required: true }],
  notes: "nota privada anterior",
  active: true,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
};

test("B-O6R-12 C9: auditoria lista todos os campos e só omite valores de notes", () => {
  const after: JurisdictionProfile = {
    ...before,
    name: "Regime corrigido",
    dailyCap: "THIRTY_DAYS_LEGACY",
    releaseRequirements: [{ code: "doc2", label: "Documento atual", required: false }],
    notes: "nota privada atual",
  };
  const result = computeProfileChanges(before, after);

  assert.deepEqual(result.changedFields, ["name", "daily_cap", "release_requirements", "notes"]);
  assert.deepEqual(result.changes.name, { from: "Regime anterior", to: "Regime corrigido" });
  assert.deepEqual(result.changes.daily_cap, { from: "SIX_MONTHS", to: "THIRTY_DAYS_LEGACY" });
  assert.deepEqual(result.changes.release_requirements, {
    from: [{ code: "doc", label: "Documento anterior", required: true }],
    to: [{ code: "doc2", label: "Documento atual", required: false }],
  });
  assert.equal("notes" in result.changes, false);
});

// C8 (fiação do controller) mora no -db, por HTTP, lendo audit_logs (A7: auditoria sem banco não observa nada).
// C19 (o dossiê mostra a cópia) mora em tests/owner-portal-dossier-rls.test.ts, com banco. Aqui fica só a
// allowlist §2.8 da projeção do portal.
test("B-O6R-12 C19 (allowlist §2.8): a projeção do portal leva só os 3 prazos e {label, required}", () => {
  const plan = portalPlanFromRegime({
    scope: "PUBLIC_AGREEMENT",
    ownerNotifDays: 5,
    noticeEdictDay: 10,
    auctionEligibleDay: 60,
    auctionEdictBusinessDays: 15,
    dailyModel: "ROLLING_24H",
    dailyCap: "SIX_MONTHS",
    releaseRequirements: [{ code: "doc", label: "Documento", required: true }],
    dailyServiceCatalogId: "30000000-0000-4000-8000-000000000001",
  });

  assert.deepEqual(plan, {
    ownerNotifDays: 5,
    noticeEdictDay: 10,
    auctionEligibleDay: 60,
    requirements: [{ label: "Documento", required: true }],
  });
  assert.deepEqual(Object.keys(plan).sort(), ["auctionEligibleDay", "noticeEdictDay", "ownerNotifDays", "requirements"]);
});
