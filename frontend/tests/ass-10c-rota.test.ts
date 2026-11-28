import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

// B-ASS-10c-OPERACAO · R-ROTA, R-PERM (estático), R-SEGREDO (estático) e R-T5-DIN — a rota `/platform/billing` sob o
// guarda de `platform:billing:read`; o item "Cobrança" no menu do console e na navegação; só o `App.tsx` importa a página;
// cada chave da tela é a MESMA da rota do servidor; e nada do módulo usa armazenamento do navegador nem `console`. A trava
// "a tela não calcula dinheiro" (T-DIN-1 a 3) vive em `ass-10c-nao-calcula.guard.test.ts`, o arquivo que o plano nomeia.

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND = path.dirname(HERE);
const REPO = path.dirname(FRONTEND);
const SRC = path.join(FRONTEND, "src");
const MODULE_DIR = "modules/platform/billing-operations/";

function files(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const target = path.join(directory, name);
    return statSync(target).isDirectory() ? files(target) : /\.(ts|tsx)$/.test(name) ? [target] : [];
  });
}
const read = (file: string) => readFileSync(file, "utf8");

/** O bloco `<Route path="/platform/billing" …/>` do `App.tsx`, delimitado pelo próximo `<Route`. */
export function billingRouteBlock(source: string): string {
  const start = source.indexOf('path="/platform/billing"');
  assert.ok(start > 0, "a rota /platform/billing existe");
  const end = source.indexOf("<Route", start);
  return source.slice(start, end < 0 ? undefined : end);
}

test("T-ROT-1 /platform/billing monta a página sob PermissionGuard de platform:billing:read", () => {
  const block = billingRouteBlock(read(path.join(SRC, "App.tsx")));
  assert.match(block, /<PermissionGuard permissions=\{\["platform:billing:read"\]\}>\s*<PlatformBillingOpsPage \/>/);
});

test("T-ROT-1 vermelho-controle: o mesmo enunciado acusa a rota sem o guarda", () => {
  const block = billingRouteBlock(read(path.join(SRC, "App.tsx")).replace('<PermissionGuard permissions={["platform:billing:read"]}>\n                  <PlatformBillingOpsPage />\n                </PermissionGuard>', "<PlatformBillingOpsPage />"));
  assert.doesNotMatch(block, /<PermissionGuard permissions=\{\["platform:billing:read"\]\}>\s*<PlatformBillingOpsPage \/>/);
});

test("T-ROT-2 'Cobrança' está no menu do console (grupo PRINCIPAL, depois do Cloud Billing) e na navegação da plataforma", async () => {
  const layout = read(path.join(SRC, "layouts/PlatformLayout.tsx"));
  assert.match(layout, /\{ label: "Custo da nuvem", path: "\/platform\/cloud-billing", icon: Cloud \},\s*\{ label: "Cobrança", path: "\/platform\/billing", icon: Receipt \}/);
  const { platformNavigation } = await import("../src/navigation/platformNavigation");
  const item = platformNavigation.find((entry) => entry.path === "/platform/billing");
  assert.equal(item?.label, "Cobrança");
  assert.deepEqual(item?.requiredPermissions, ["platform:billing:read"]);
  assert.equal(item?.status, undefined, "ligada, não planejada");
});

test("T-ROT-3 só o App.tsx importa a página do módulo (a única porta para fora)", () => {
  const importers = files(SRC)
    .filter((file) => !file.includes(`${path.sep}billing-operations${path.sep}`))
    .filter((file) => /billing-operations\//.test(read(file)))
    .map((file) => path.relative(SRC, file).replace(/\\/g, "/"));
  assert.deepEqual(importers, ["App.tsx"]);
});

test("T-PERM-1 cada chave da tela é a MESMA de uma rota do servidor (a de canal, completa)", async () => {
  const { BILLING_OPS_PERMISSIONS } = await import("../src/modules/platform/billing-operations/billing-ops.access");
  const routes = ["src/modules/subscription-billing/statements/statements.platform.routes.ts", "src/modules/subscription-billing/vault/vault.platform.routes.ts"].map((file) => read(path.join(REPO, file))).join("\n");
  const serverKeys = new Set([...routes.matchAll(/requirePlatformPermission\("([^"]+)"\)/g)].map((match) => match[1]!));
  for (const key of [BILLING_OPS_PERMISSIONS.read, BILLING_OPS_PERMISSIONS.settle, BILLING_OPS_PERMISSIONS.manageProviders]) assert.ok(serverKeys.has(key), `chave sem rota: ${key}`);
  assert.equal(BILLING_OPS_PERMISSIONS.manageProviders, "platform:billing-providers:manage");
});

test("T-SEG-4 nada do módulo usa armazenamento do navegador, nem console, nem põe segredo na URL", () => {
  const offenders = files(path.join(SRC, MODULE_DIR)).filter((file) => /localStorage|sessionStorage|console\.(log|info|debug|warn|error)|[?&](secret|password|pfxBase64)=/.test(read(file)));
  assert.deepEqual(offenders, []);
});
