import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import type { Router } from "express";

// -----------------------------------------------------------------------------------------------
// B-ASS-09 · F8 — R-API-1 do plano v2 (A-06, D-10): o `API_CONTRACTS.md` diz o que o router faz.
//   (1) o §3.3 lista EXATAMENTE as 10 rotas da visão, do câmbio e dos grupos, cada uma com a permissão — e as duas coisas
//       saem do RUNTIME: o caminho, da pilha do `express.Router` dos 3 routers; a permissão, de uma sonda HTTP por rota (o
//       ator sem papel de plataforma passa da guarda só com a permissão certa em `x-permissions`, a via de cabeçalho de dev);
//   (2) a seção `platform_billing_overview@2026-11.b-ass-09` existe, com a base da assinatura e a lista dos campos que podem
//       ser `null` (P13);
//   (3) as 3 linhas das rotas de markup que o B-ASS-01 tirou ficam, marcadas como retiradas.
//
// MUTAÇÃO QUE MATA: M-API-1 (apagar do `API_CONTRACTS.md` a linha da rota `GET /platform/billing/economic-groups/:groupId/history`).
// -----------------------------------------------------------------------------------------------

process.env.CORE_SAAS_PERSISTENCE = process.env.CORE_SAAS_PERSISTENCE ?? "memory";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BILLING = "/platform/billing";
const PERMISSIONS = ["platform:billing:read", "platform:billing:manage"] as const;
const GROUP_ID = "00000000-0000-4000-8000-000000000001";

/** O §3.3 do `API_CONTRACTS.md`, delimitado pelo próprio cabeçalho e pelo do §3.4. */
function section33(): string {
  const text = readFileSync(path.join(ROOT, "API_CONTRACTS.md"), "utf8").replace(/\r\n/g, "\n");
  const start = text.indexOf("\n### 3.3 ");
  const end = text.indexOf("\n### 3.4 ", start);
  assert.ok(start >= 0 && end > start, "o §3.3 e o §3.4 existem no API_CONTRACTS.md");
  return text.slice(start, end);
}

/** As linhas da tabela do §3.3 das rotas do B-ASS-09: `MÉTODO caminho-relativo permissão`. */
function documented(section: string): string[] {
  const rows: string[] = [];
  const re = /^\| (GET|POST|PUT|PATCH|DELETE) \| `\/platform\/billing(\/(?:overview|fx-rates|economic-groups)[^`]*)` \| `(platform:billing:[a-z]+)` \|/gm;
  for (const match of section.matchAll(re)) rows.push(`${match[1]} ${match[2]} ${match[3]}`);
  return rows.sort();
}

/** As rotas montadas num router, da pilha do `express.Router` em runtime (como o `san3-05` e o T-ACC-1a fazem). */
function routesOf(router: Router): string[] {
  const out: string[] = [];
  const visit = (node: { stack?: unknown[] }) => {
    for (const layer of (node.stack ?? []) as Array<{ route?: { path: string; methods: Record<string, boolean> }; handle?: { stack?: unknown[] } }>) {
      if (layer.route) {
        for (const [method, on] of Object.entries(layer.route.methods)) {
          if (on && method !== "_all") out.push(`${method.toUpperCase()} ${layer.route.path}`);
        }
      } else if (layer.handle && Array.isArray(layer.handle.stack)) {
        visit(layer.handle);
      }
    }
  };
  visit(router as unknown as { stack?: unknown[] });
  return out.sort();
}

function concrete(route: string): string {
  return route.replace(":groupId", GROUP_ID).replace(":month", "2026-10");
}

test("T-API-1 · o §3.3 do API_CONTRACTS.md lista as 10 rotas do B-ASS-09, com a permissão, iguais às do runtime", async () => {
  const [{ createApp }, { createOverviewPlatformRouter }, { createFxRatesPlatformRouter }, { createEconomicGroupsPlatformRouter }, factory] =
    await Promise.all([
      import("../src/app.js"),
      import("../src/modules/subscription-billing/overview/overview.routes.js"),
      import("../src/modules/subscription-billing/fx-rates/fx-rates.routes.js"),
      import("../src/modules/subscription-billing/economic-groups/economic-groups.routes.js"),
      import("../src/modules/subscription-billing/overview/overview.factory.js"),
    ]);
  const mounted = [
    ...routesOf(createOverviewPlatformRouter()),
    ...routesOf(createFxRatesPlatformRouter()),
    ...routesOf(createEconomicGroupsPlatformRouter()),
  ].sort();
  assert.equal(mounted.length, 10, `os 3 routers montam 10 rotas: ${JSON.stringify(mounted)}`);

  factory.resetOverviewRuntimeForTests();
  const server: Server = createApp().listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", () => resolve()));
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1${BILLING}`;
  const runtime: string[] = [];
  try {
    for (const route of mounted) {
      const [method, routePath] = route.split(" ") as [string, string];
      const passes: string[] = [];
      for (const permission of PERMISSIONS) {
        const url = `${baseUrl}${concrete(routePath)}${method === "GET" && routePath === "/overview" ? "?period=2026-10" : ""}`;
        const response = await fetch(url, {
          method,
          headers: {
            "content-type": "application/json",
            "x-tenant-id": "ten_api09",
            "x-user-id": "usr_api09",
            "x-role": "tenant_admin",
            "x-permissions": permission,
          },
          ...(method === "GET" || method === "DELETE" ? {} : { body: "{}" }),
        });
        const body = (await response.json()) as { error?: { reason?: string } };
        const blocked = response.status === 403 && body.error?.reason === "platform_permission_required";
        if (!blocked) passes.push(permission);
      }
      assert.equal(passes.length, 1, `${route}: exatamente uma permissão passa da guarda (passaram ${JSON.stringify(passes)})`);
      runtime.push(`${route} ${passes[0]}`);
    }
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    factory.resetOverviewRuntimeForTests();
  }

  assert.deepEqual(documented(section33()), runtime.sort(), "o §3.3 tem de listar as rotas e as permissões que o router aplica");
});

test("T-API-1 · a seção platform_billing_overview@2026-11.b-ass-09 traz a base da assinatura e os campos que podem ser null", () => {
  const section = section33();
  const start = section.indexOf("`platform_billing_overview@2026-11.b-ass-09`");
  assert.ok(start >= 0, "a seção do contrato existe no §3.3");
  const contract = section.slice(start);
  assert.match(contract, /subscriptionBasis: \\?"before_credits\\?"|subscriptionBasis: "before_credits"/);
  for (const field of ["statementTotal", "creditsApplied", "subscriptionSource", "allocatedCostOriginal", "conversionResidualCost"]) {
    assert.ok(contract.includes(`\`${field}\``), `o contrato descreve \`${field}\``);
  }
  const nullable = [
    "lines[*].allocatedCost",
    "lines[*].margin",
    "lines[*].marginPct",
    "totals.allocatedCost",
    "totals.margin",
    "totals.marginPct",
    "global.tenantsCost",
    "global.platformOwnCost",
    "global.unallocatedOther",
    "global.unallocatedByReason[*].cost",
    "global.roundingResidualCost",
    "global.conversionResidualCost",
    "global.totalCost",
    "global.margin",
    "global.marginPct",
  ];
  for (const field of nullable) assert.ok(contract.includes(`\`${field}\``), `o contrato diz que \`${field}\` pode ser null`);
  for (const code of ["invalid_period", "period_in_future", "statement_integrity_violation", "membership_integrity_violation", "membership_conflict", "tenant_in_another_group", "membership_range_invalid"]) {
    assert.ok(contract.includes(`\`${code}\``), `o contrato lista o código \`${code}\``);
  }
});

test("T-API-1 · as 3 rotas de markup que o B-ASS-01 tirou ficam no §3.3, marcadas como retiradas (D-10)", () => {
  const lines = section33().split("\n");
  for (const route of ["`/platform/cloud-charge-rules`", "`/platform/cloud-charges/calculation-runs`", "`/platform/cloud-charges/summary`"]) {
    const row = lines.filter((line) => line.startsWith("|") && line.includes(route));
    assert.equal(row.length, 1, `uma linha de ${route}`);
    assert.match(row[0]!, /\*\*Retiradas? \(B-ASS-01, 404\)\.\*\*/, `${route} marcada como retirada`);
  }
});
