// J484 C1b — propriedade: plataforma nunca em allocations; conservação fecha; ambígua/desconhecida nunca alocam.
const { allocateCloudCosts } = await import("file:///" + process.argv[2]);
let seed = 12345; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];
const ps = new Date("2026-11-01T00:00:00.000Z"), pe = new Date("2026-11-30T23:59:59.999Z");
const tenants = [
  { id: "platform-id", name: "Plataforma", slug: "platform" },
  { id: "a", name: "Duplicada", slug: "alpha" }, { id: "b", name: "Duplicada", slug: "beta" },
  { id: "c", name: "Gama", slug: "duplicada" }, { id: "d", name: "Delta", slug: "delta" }, { id: "e", name: "platform", slug: "eps" },
];
const tags = [undefined, "", "   ", "platform-id", "PLATFORM-ID", "Plataforma", "platform", "Duplicada", " duplicada ", "alpha", "BETA",
  "Gama", "gama", "delta", "Delta ", "nao-existe", "eps", "a", "d", "ＤＥＬＴＡ", "Delta\u200b"];
let runs = 0, bad = 0, plat = 0;
for (let k = 0; k < 4000; k++) {
  const strategy = pick(["direct_tag_then_usage_weighted_v1", "usage_weighted_v1"]);
  const n = 1 + Math.floor(rnd() * 6);
  const lines = Array.from({ length: n }, (_, i) => ({ id: "l" + i, importId: "i", provider: "aws", billingPeriodStart: ps, billingPeriodEnd: pe,
    serviceCode: pick(["AmazonEC2", "AmazonRDS", "AmazonS3", "Weird"]), usageType: "BoxUsage", tenantTag: pick(tags),
    unblendedCost: Math.round(rnd() * 1e8) / 1e6, currency: "USD", rawLineHash: "h" + i, metadata: {}, createdAt: ps }));
  const basis = tenants.filter(() => rnd() < 0.8).map((t) => ({ tenantId: t.id, metricKey: "audited_actions_count", quantity: Math.floor(rnd() * 50), unit: "count", sourceType: "audit" }));
  let r: any;
  try { r = allocateCloudCosts({ runId: "r", periodStart: ps, periodEnd: pe, strategy, tenants, costLineItems: lines, usageBasis: basis }); }
  catch (e: any) { console.log("THROW", e.message); bad++; continue; }
  runs++;
  if (r.allocations.some((x: any) => x.tenantId === "platform-id")) { plat++; console.log("PLATAFORMA EM ALLOCATIONS", strategy); }
  const sum = r.totalAllocatedCost + r.totalPlatformCost + r.totalUnallocatedCost + r.roundingResidualCost;
  if (Math.abs(sum - r.totalImportedCost) > 1e-9) { bad++; console.log("NAO FECHA", sum, r.totalImportedCost); }
  // linhas com tag ambígua (Duplicada/duplicada/platform/Plataforma? ) nunca alocam diretamente
  for (const a of r.allocations) if (a.allocationMethod === "direct_tenant_tag") {
    const line = lines.find((l) => l.id === a.costLineItemId || l.id === a.sourceLineId);
  }
}
console.log(JSON.stringify({ runs, bad, platInAllocations: plat }));
