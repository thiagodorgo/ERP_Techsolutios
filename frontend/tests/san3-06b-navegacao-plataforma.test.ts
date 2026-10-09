import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { getCloudCostSummary } from "../src/modules/platform/cloud-billing/cloud-billing.service";
import { getPlatformTenantById, listPlatformTenants } from "../src/modules/platform/platform.service";
import { platformNavigation } from "../src/navigation/platformNavigation";
import { filterNavigationItems } from "../src/navigation/types";

const FRONTEND = fileURLToPath(new URL("../", import.meta.url));
const REPO = path.dirname(FRONTEND);

function filesUnder(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const target = path.join(directory, name);
    return statSync(target).isDirectory() ? filesUnder(target) : [target];
  });
}

test("T38 navegação da plataforma usa rótulos de negócio e libera telas ligadas", () => {
  const labels = platformNavigation.map((item) => item.label);
  assert.equal(labels.includes("Visão Geral"), true);
  assert.equal(labels.includes("Organizações"), true);
  assert.equal(labels.includes("Planos e Módulos"), true);
  assert.equal(labels.includes("Saúde do Sistema"), true);
  assert.equal(labels.some((label) => label.includes("Tenant") || label.includes("Health")), false);
  assert.equal(platformNavigation.find((item) => item.path === "/platform/overview")?.status, undefined);
  assert.equal(platformNavigation.find((item) => item.path === "/platform/health")?.status, undefined);
  const visible = filterNavigationItems({ roles: ["Super Admin"], permissions: [], mode: "platform", scope: "platform" }, platformNavigation).map((item) => item.path);
  assert.equal(visible.includes("/platform/overview"), true);
  assert.equal(visible.includes("/platform/health"), true);
});

test("T39 modo demonstração é vazio e só config/env.ts lê o interruptor", async () => {
  process.env.VITE_USE_MOCKS = "true";
  try {
    assert.deepEqual(await listPlatformTenants(), []);
    await assert.rejects(() => getPlatformTenantById("x"), /Organização indisponível/);
    const summary = await getCloudCostSummary();
    assert.equal(summary.source, "mock");
    assert.equal(summary.data, null);
    const hits = filesUnder(path.join(FRONTEND, "src"))
      .filter((file) => /\.(ts|tsx)$/.test(file))
      .filter((file) => readFileSync(file, "utf8").includes('readFrontendEnv("VITE_USE_MOCKS"'))
      .map((file) => path.relative(FRONTEND, file).replace(/\\/g, "/"));
    assert.deepEqual(hits, ["src/config/env.ts"]);
  } finally {
    process.env.VITE_USE_MOCKS = "";
  }
});

test("T40 módulos não vaza código interno e inventário conserva 32 endpoints", () => {
  const source = readFileSync(path.join(FRONTEND, "src/modules/platform/pages/PlatformTenantModulesPage.tsx"), "utf8");
  assert.match(source, /Módulos não encontrados/);
  assert.match(source, /plano \{planLabel\(tenant\.plan\)\}/);
  assert.doesNotMatch(source, /P0\d|plano \{tenant\.plan\}/);
  const output = execFileSync(process.execPath, [path.join(REPO, "scripts/san3-06b-endpoints-de-plataforma.mjs"), REPO], { encoding: "utf8", timeout: 120_000 });
  assert.match(output, /endpoints sob \/api\/v1\/platform = 32/);
});
