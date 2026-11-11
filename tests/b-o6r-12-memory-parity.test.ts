import assert from "node:assert/strict";
import test from "node:test";

import { InMemoryAuctionRepository } from "../src/modules/auction/auction.repository.js";
import { InMemoryChargeRepository } from "../src/modules/charging/charge.repository.js";
import { InMemoryNotificationRepository } from "../src/modules/impound/impound.notifications.repository.js";
import type { ImpoundProcess } from "../src/modules/impound/impound.types.js";
import { InMemoryReleaseRepository } from "../src/modules/release/release.repository.js";

const tenantId = "20000000-0000-4000-8000-000000000001";
const profileId = "30000000-0000-4000-8000-000000000001";
const processId = "40000000-0000-4000-8000-000000000001";
const now = new Date("2026-01-01T00:00:00Z");
const process: ImpoundProcess = {
  id: processId,
  tenantId,
  vehicleUnidentified: true,
  profileId,
  status: "ACTIVE_CUSTODY",
  enteredAt: now,
  originAuthority: "Órgão",
  custodySeqHead: 0,
  createdAt: now,
  updatedAt: now,
};
const impound = {
  findProcessById: async (wantedTenant: string, wantedProcess: string) =>
    wantedTenant === tenantId && wantedProcess === processId ? process : undefined,
  appendEvent: async () => ({ process, event: {} }),
};

test("B-O6R-12 C11/C21: memória congela cobrança, notificação, leilão e liberação na primeira leitura", async () => {
  const charge = new InMemoryChargeRepository(impound as never);
  charge.setProfileForTests(tenantId, profileId, {
    scope: "PUBLIC_AGREEMENT",
    model: "ROLLING_24H",
    cap: "SIX_MONTHS",
    dailyServiceCatalogId: "50000000-0000-4000-8000-000000000001",
  });
  const chargeBefore = await charge.loadAccrualContext(tenantId, processId);
  charge.setProfileForTests(tenantId, profileId, { scope: "PRIVATE_CONTRACT", model: "CALENDAR", cap: "UNLIMITED" });
  assert.deepEqual(await charge.loadAccrualContext(tenantId, processId), chargeBefore);

  const notifications = new InMemoryNotificationRepository(impound as never);
  notifications.setProfileForTests(tenantId, profileId, { scope: "PUBLIC_AGREEMENT", ownerNotifDays: 5, noticeEdictDay: 10 });
  const notificationBefore = await notifications.loadScheduleContext(tenantId, processId);
  notifications.setProfileForTests(tenantId, profileId, { scope: "PRIVATE_CONTRACT", ownerNotifDays: 99, noticeEdictDay: 100 });
  assert.deepEqual(await notifications.loadScheduleContext(tenantId, processId), notificationBefore);

  const auction = new InMemoryAuctionRepository(impound as never, async () => false);
  auction.setAuctionProfileForTests(tenantId, profileId, {
    scope: "PUBLIC_AGREEMENT",
    ownerNotifDays: 5,
    noticeEdictDay: 10,
    auctionEligibleDay: 60,
  });
  const auctionBefore = await auction.getAuctionProfile(tenantId, processId);
  auction.setAuctionProfileForTests(tenantId, profileId, {
    scope: "PRIVATE_CONTRACT",
    ownerNotifDays: 50,
    noticeEdictDay: 100,
    auctionEligibleDay: 90,
  });
  assert.deepEqual(await auction.getAuctionProfile(tenantId, processId), auctionBefore);

  const release = new InMemoryReleaseRepository(impound as never, {} as never);
  release.setProfileRequirementsForTests(tenantId, profileId, [{ code: "a", label: "A", required: true }]);
  const releaseBefore = await release.loadReleaseRequirements(tenantId, processId);
  release.setProfileRequirementsForTests(tenantId, profileId, [{ code: "b", label: "B", required: false }]);
  assert.deepEqual(await release.loadReleaseRequirements(tenantId, processId), releaseBefore);
});
