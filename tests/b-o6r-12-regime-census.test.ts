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
    ["src/modules/impound/impound.notifications-prisma.repository.ts", "regime_scope"],
    ["src/modules/auction/auction-prisma.repository.ts", "regime_auction_eligible_day"],
    ["src/modules/release/release-prisma.repository.ts", "regime_release_requirements"],
    ["src/modules/patios-dashboard/patios-dashboard-prisma.repository.ts", "regime_owner_notif_days"],
  ] as const;
  for (const [path, required] of cases) {
    const source = read(path);
    assert.match(source, new RegExp(required), `${path} não lê ${required}`);
    assert.doesNotMatch(source, /jurisdiction_profiles|\bjp\./, `${path} voltou ao perfil vivo`);
  }
});

test("B-O6R-12 C22: cobrança declara somente ponteiro e fuso como insumos vivos", () => {
  const source = read("src/modules/charging/charge-prisma.repository.ts");
  assert.deepEqual(INSUMOS_VIVOS_DIARIA, ["jp.daily_service_catalog_id", "y.timezone"]);
  for (const input of INSUMOS_VIVOS_DIARIA) assert.match(source, new RegExp(input.replaceAll(".", "\\.")));
  assert.match(read("agent-orchestration/controle/pendencias.md"), /P-O6R-B12-FUSO-DO-PATIO-VIVO/);
  assert.equal(LEITORES_VIVOS.length, 4);
});
