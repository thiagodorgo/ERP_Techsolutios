// J484 C1b — grafias NOVAS (jurado-j484-c1b-opus). Invisíveis (Default_Ignorable) do lado do NOME e do lado da TAG.
// Uso: node --import tsx c1b-grafias-novas.mts <caminho do engine.ts>
const enginePath = process.argv[2];
const { allocateCloudCosts } = await import("file:///" + enginePath);
const ps = new Date("2026-11-01T00:00:00.000Z"), pe = new Date("2026-11-30T23:59:59.999Z");
const P = { id: "platform-id", name: "Plataforma", slug: "platform" };
function run(tag: string, tenants: any[], strategy: string) {
  const ids = tenants.map((t) => t.id);
  const r = allocateCloudCosts({
    runId: "r", periodStart: ps, periodEnd: pe, strategy, tenants,
    costLineItems: [{ id: "l", importId: "i", provider: "aws", billingPeriodStart: ps, billingPeriodEnd: pe,
      serviceCode: "AmazonEC2", usageType: "BoxUsage", tenantTag: tag, unblendedCost: 10, currency: "USD",
      rawLineHash: "l", metadata: {}, createdAt: ps }],
    usageBasis: ids.map((id, i) => ({ tenantId: id, metricKey: "audited_actions_count", quantity: i + 1, unit: "count", sourceType: "audit" })),
  });
  return { alloc: r.allocations.map((a: any) => [a.tenantId, a.allocatedCost]), platform: r.totalPlatformCost,
    unalloc: r.unallocated.map((u: any) => [u.reason, u.unallocatedCost]),
    closes: Math.abs(r.totalImportedCost - r.totalAllocatedCost - r.totalPlatformCost - r.totalUnallocatedCost - r.roundingResidualCost) < 1e-9 };
}
const inv: Array<[string, string]> = [
  ["U+00AD soft hyphen", "\u00ad"], ["U+200B ZWSP", "\u200b"], ["U+200C ZWNJ", "\u200c"], ["U+200D ZWJ", "\u200d"],
  ["U+2060 word joiner", "\u2060"], ["U+FEFF BOM (meio)", "\ufeff"], ["U+034F CGJ", "\u034f"], ["U+FE0F VS16", "\ufe0f"],
  ["U+200E LRM", "\u200e"], ["U+202E RLO", "\u202e"], ["U+180E MVS", "\u180e"], ["U+2062 invisible times", "\u2062"],
];
for (const [label, ch] of inv) {
  for (const strategy of ["direct_tag_then_usage_weighted_v1", "usage_weighted_v1"]) {
    // lado do NOME: A tem o invisível no meio do nome; B tem o nome limpo; tag limpa (digitada vendo a tela)
    const nameSide = run("Duplicada", [{ id: "a", name: "Dupli" + ch + "cada", slug: "alpha" }, { id: "b", name: "Duplicada", slug: "beta" }, P], strategy);
    // lado do NOME, invisível na PONTA do nome de A
    const nameEdge = run("Duplicada", [{ id: "a", name: "Duplicada" + ch, slug: "alpha" }, { id: "b", name: "Duplicada", slug: "beta" }, P], strategy);
    // lado da TAG: A e B com nomes limpos iguais, tag com invisível
    const tagSide = run("Dupli" + ch + "cada", [{ id: "a", name: "Duplicada", slug: "alpha" }, { id: "b", name: "Duplicada", slug: "beta" }, P], strategy);
    // lado da TAG, organização única: tag com invisível e A única
    const tagSingle = run("Alfa" + ch, [{ id: "a", name: "Alfa", slug: "alpha" }, { id: "b", name: "Beta", slug: "beta" }, P], strategy);
    console.log(JSON.stringify({ label, strategy, nameSide, nameEdge, tagSide, tagSingle }));
  }
}
