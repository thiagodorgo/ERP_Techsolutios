import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { resolveFrontendPermissionsFromBackend } from "../src/modules/auth/auth.adapter";
import { resolveContextLandingRoute } from "../src/modules/context/landing-route";

const dashboardSource = readFileSync(new URL("../src/pages/DashboardPage.tsx", import.meta.url), "utf8");
const contextSelectionSource = readFileSync(
  new URL("../src/pages/ContextSelectionPage.tsx", import.meta.url),
  "utf8",
);

test("Nova OS só renderiza com work_orders:create", () => {
  assert.match(dashboardSource, /can\("work_orders:create"\)\s*&&\s*\(/);
  assert.match(dashboardSource, /navigate\("\/work-orders\/new"\)/);
});

test("KPI integra o detalhe clicável existente e não usa navegação direta no card", () => {
  assert.match(dashboardSource, /<ClickableKpiCard/);
  assert.match(dashboardSource, /buildDashboardKpiDetail\(card\.kpi, mapDashboardSource\(data\.summarySource\), timeseries\.data, can\)/);
  const cardsBlock = dashboardSource.slice(
    dashboardSource.indexOf("kpiCards.map"),
    dashboardSource.indexOf("registryPills.length"),
  );
  assert.doesNotMatch(cardsBlock, /navigate\("\/work-orders"\)/);
});

test("troca de organização decide e persiste pelas permissões da sessão efetiva", () => {
  assert.match(contextSelectionSource, /const permissions = nextSession\.user\.permissions/);
  assert.match(contextSelectionSource, /setActiveContext\(\{ \.\.\.context, permissions \}\)/);
  assert.match(contextSelectionSource, /resolveContextLandingRoute\(permissions\)/);
});

test("aliases de apresentação não promovem capacidade de OS", () => {
  const permissions = resolveFrontendPermissionsFromBackend(["os.read"]);
  assert.equal(permissions.includes("work_orders:read"), false);
  assert.equal(resolveContextLandingRoute(["dashboard:view"]), null);
});
