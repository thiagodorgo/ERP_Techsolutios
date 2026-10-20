import assert from "node:assert/strict";
import test from "node:test";

import { PrismaDashboardRepository } from "../src/modules/dashboard/dashboard-prisma.repository.js";

test("consulta Prisma aplica o filtro não terminal fora dos dois ramos críticos", async () => {
  let criticalQuery: Record<string, unknown> | undefined;
  const count = async () => 0;
  const client = {
    workOrder: {
      count,
      groupBy: async () => [],
      findMany: async (query: Record<string, unknown>) => {
        criticalQuery = query;
        return [];
      },
    },
    customer: { count },
    vehicle: { count },
    team: { count },
    serviceCatalog: { count },
    workOrderEvent: { findMany: async () => [] },
  };

  await new PrismaDashboardRepository(client as never).getSummary({
    tenantId: "tenant-a",
    now: new Date("2026-10-17T12:00:00.000Z"),
  });

  const where = criticalQuery?.where as {
    status?: { notIn?: string[] };
    OR?: Array<Record<string, unknown>>;
  };
  assert.deepEqual(where.status?.notIn, ["completed", "cancelled", "rejected"]);
  assert.equal(where.OR?.length, 2);
  assert.equal(where.OR?.some((branch) => "status" in branch), false);
});
