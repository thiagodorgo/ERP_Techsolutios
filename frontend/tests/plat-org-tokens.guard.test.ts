import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const ROOT = new URL("../", import.meta.url);
const files = [
  "src/modules/platform/components/NewOrganizationDialog.tsx",
  "src/modules/platform/components/OrganizationStatusDialog.tsx",
  "src/modules/platform/components/OrganizationDetailPanel.tsx",
  "src/modules/platform/components/OrganizationEditNameDialog.tsx",
  "src/modules/platform/components/OrganizationAdminDialog.tsx",
  "src/modules/platform/components/OrganizationSetupDialog.tsx",
  "src/modules/platform/pages/PlatformTenantsPage.tsx",
  "src/modules/platform/usePlatformOrganizations.ts",
  "src/modules/platform/usePlatformOrganizationDetail.ts",
];

test("FV1 superfícies novas usam tokens, sem paleta ou fallback de plano próprios", () => {
  for (const file of files) {
    const source = readFileSync(new URL(file, ROOT), "utf8");
    assert.doesNotMatch(source, /#[0-9a-f]{3,8}\b|\brgba?\s*\(/i, file);
    assert.doesNotMatch(source, /planLabel|planName\s*(?:\|\||\?\?)\s*plan|(?:\|\||\?\?)\s*plan\.code/, file);
    assert.doesNotMatch(source, /\bappearance\b|localStorage.*apar|\btema\b.*organiza/i, file);
  }
  const css = readFileSync(new URL("src/styles/app.css", ROOT), "utf8");
  const section = css.slice(css.indexOf("/* B-PLAT-ORG-REAL PR-b"));
  assert.ok(section.length > 0);
  assert.doesNotMatch(section, /#[0-9a-f]{3,8}\b|\brgba?\s*\(/i);
  assert.match(section, /var\(--surface-panel\)/);
  assert.match(section, /var\(--color-core-primary\)/);
});

test("C25 linha estática neutraliza cursor e hover fora da tela de organizações", () => {
  const css = readFileSync(new URL("src/styles/app.css", ROOT), "utf8");
  assert.ok((css.match(/^\.pat-ab-row--static/gm) ?? []).length >= 2);
  assert.doesNotMatch(css, /^\.platform-organizations \.pat-ab-row--static\{cursor/gm);
});
