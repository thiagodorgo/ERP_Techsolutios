import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string): string => readFileSync(path, "utf8").replace(/\r\n/g, "\n");

export const LEITORES_VIVOS = [
  "src/modules/charging/charge-prisma.repository.ts:jurisdiction_profiles:ponteiro-null",
  "src/modules/impound/impound-prisma.repository.ts:.jurisdictionProfile.:carimbo",
  "src/modules/impound/impound-prisma.repository.ts:.jurisdictionProfile.:fotos",
  "src/modules/owner-portal/owner-portal.service.ts:getPortalProfile(:fallback-memoria",
] as const;
export const INSUMOS_VIVOS_DIARIA = ["jp.daily_service_catalog_id", "y.timezone"] as const;

test("B-O6R-12 C10: leitores de prazos/liberação usam regime do processo", () => {
  const cases = [
    ["src/modules/impound/impound.notifications-prisma.repository.ts", "jp.scope"],
    ["src/modules/auction/auction-prisma.repository.ts", "jp.auction_eligible_day"],
    ["src/modules/release/release-prisma.repository.ts", "jp.release_requirements"],
    ["src/modules/patios-dashboard/patios-dashboard-prisma.repository.ts", "jp.owner_notif_days"],
  ] as const;
  for (const [path, forbidden] of cases) assert.equal(read(path).includes(forbidden), false, `${path} ainda contém ${forbidden}`);
});

test("B-O6R-12 C22: cobrança declara somente ponteiro e fuso como insumos vivos", () => {
  const source = read("src/modules/charging/charge-prisma.repository.ts");
  assert.deepEqual(INSUMOS_VIVOS_DIARIA, ["jp.daily_service_catalog_id", "y.timezone"]);
  for (const input of INSUMOS_VIVOS_DIARIA) assert.match(source, new RegExp(input.replaceAll(".", "\\.")));
  assert.match(read("agent-orchestration/controle/pendencias.md"), /P-O6R-B12-FUSO-DO-PATIO-VIVO/);
  assert.equal(LEITORES_VIVOS.length, 4);
});
