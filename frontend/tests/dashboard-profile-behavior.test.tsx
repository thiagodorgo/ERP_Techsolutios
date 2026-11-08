import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { resolveFrontendPermissionsFromBackend } from "../src/modules/auth/auth.adapter";
import { resolveContextLandingRoute } from "../src/modules/context/landing-route";

const dashboardSource = readFileSync(new URL("../src/pages/DashboardPage.tsx", import.meta.url), "utf8");
// B-APAR-DASH — a página virou o CONTÊINER das 3 aparências; o cabeçalho e os cartões moram nas peças comuns das views.
// As duas propriedades abaixo são as mesmas de antes, lidas onde o código agora está (o comportamento por perfil, nas 3
// aparências, é provado em `dashboard-aparencia-{a,b,c}.smoke` e `dashboard-aparencias-live`).
const sharedSource = readFileSync(new URL("../src/modules/dashboard/views/dashboard.shared.tsx", import.meta.url), "utf8");
const contextSelectionSource = readFileSync(
  new URL("../src/pages/ContextSelectionPage.tsx", import.meta.url),
  "utf8",
);

test("Nova OS só renderiza com work_orders:create", () => {
  assert.match(dashboardSource, /createWorkOrder: can\("work_orders:create"\)/);
  assert.match(sharedSource, /\{model\.access\.createWorkOrder \? \(\s*<button type="button" className="pat-btn pat-btn--primary" onClick=\{model\.onCreate\}>/);
  assert.match(dashboardSource, /onCreate: \(\) => navigate\("\/work-orders\/new"\)/);
});

test("KPI integra o detalhe clicável existente e não usa navegação direta no card", () => {
  // O detalhe de cada cartão é o MESMO `buildDashboardKpiDetail` de antes, agora num painel embaixo dos cartões (não pop-up).
  assert.match(sharedSource, /buildDashboardKpiDetail\(kpi, mapDashboardSource\(model\.summary\.source\), seriesAsTimeseries\(model\), model\.access\.can\)/);
  const cardsBlock = sharedSource.slice(sharedSource.indexOf("export function DashKpiGrid"), sharedSource.indexOf("export function RegistryStrip"));
  assert.ok(cardsBlock.length > 0, "bloco dos cartões encontrado");
  assert.match(cardsBlock, /onClick=\{\(\) => model\.onState\(toggleCard\(model, card\.key\)\)\}/);
  assert.doesNotMatch(cardsBlock, /onNavigate|navigate\(/);
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
