// C1 J484 — sonda de grafias NOVAS contra o motor do objeto (worktree w-j484-c1).
import { allocateCloudCosts } from "file:///C:/Users/thiag/w-j484-c1/src/modules/cloud-cost-allocation/cloud-cost-allocation.engine.ts";
const ps = new Date("2026-11-01T00:00:00.000Z"), pe = new Date("2026-11-30T23:59:59.999Z");
const P = { id: "platform-id", name: "Plataforma", slug: "platform" };
function run(tag: string, tenants: any[], strategy = "direct_tag_then_usage_weighted_v1") {
  const ids = tenants.map((t) => t.id);
  const r = allocateCloudCosts({
    runId: "r", periodStart: ps, periodEnd: pe, strategy: strategy as any, tenants,
    costLineItems: [{ id: "l", importId: "i", provider: "aws", billingPeriodStart: ps, billingPeriodEnd: pe,
      serviceCode: "AmazonEC2", usageType: "BoxUsage", tenantTag: tag, unblendedCost: 10, currency: "USD",
      rawLineHash: "l", metadata: {}, createdAt: ps } as any],
    usageBasis: ids.map((id, i) => ({ tenantId: id, metricKey: "audited_actions_count", quantity: i + 1, unit: "count", sourceType: "audit" })) as any,
  });
  return { alloc: r.allocations.map((a) => [a.tenantId, a.allocatedCost]), platform: r.totalPlatformCost,
    unalloc: r.unallocated.map((u) => [u.reason, u.unallocatedCost]),
    closes: Math.abs(r.totalImportedCost - r.totalAllocatedCost - r.totalPlatformCost - r.totalUnallocatedCost - r.roundingResidualCost) < 1e-9 };
}
const cases: Array<[string, string, any[]]> = [
  // tag com zero-width em tenant de nome ambíguo
  ["zwsp-tag-nome-dup", "Duplicada\u200b", [{ id: "a", name: "Duplicada", slug: "alpha" }, { id: "b", name: "Beta", slug: "duplicada" }, P]],
  ["zwj-tag", "Dupli\u200dcada", [{ id: "a", name: "Duplicada", slug: "alpha" }, { id: "b", name: "Beta", slug: "duplicada" }, P]],
  ["bom-tag", "\ufeffDuplicada", [{ id: "a", name: "Duplicada", slug: "alpha" }, { id: "b", name: "Beta", slug: "duplicada" }, P]],
  ["soft-hyphen-tag", "Dupli\u00adcada", [{ id: "a", name: "Duplicada", slug: "alpha" }, { id: "b", name: "Beta", slug: "duplicada" }, P]],
  // NOME do tenant com invisível: A "Duplicada\u200b" e B slug "duplicada" -> o motor NAO ve ambiguidade
  ["zwsp-no-NOME-A-tag-limpa", "Duplicada", [{ id: "a", name: "Duplicada\u200b", slug: "alpha" }, { id: "b", name: "Beta", slug: "duplicada" }, P]],
  ["zwsp-no-NOME-A-nomes-iguais", "Duplicada", [{ id: "a", name: "Duplicada\u200b", slug: "alpha" }, { id: "b", name: "Duplicada", slug: "beta" }, P]],
  ["soft-hyphen-no-NOME-A-nomes-iguais", "Duplicada", [{ id: "a", name: "Dupli\u00adcada", slug: "alpha" }, { id: "b", name: "Duplicada", slug: "beta" }, P]],
  // acento combinante vs composto
  ["nfd-tag-vs-nfc-nome-dup", "Sa\u0303o Paulo", [{ id: "a", name: "São Paulo", slug: "alpha" }, { id: "b", name: "S\u00e3o Paulo", slug: "beta" }, P]],
  ["nfd-nome-vs-nfc-nome", "São Paulo", [{ id: "a", name: "Sa\u0303o Paulo", slug: "alpha" }, { id: "b", name: "São Paulo", slug: "beta" }, P]],
  // id em maiúsculas
  ["id-upper", "TENANT-A-UUID", [{ id: "tenant-a-uuid", name: "Alfa", slug: "alpha" }, { id: "b", name: "Beta", slug: "beta" }, P]],
  ["id-upper-vs-nome-outro", "TENANT-A-UUID", [{ id: "tenant-a-uuid", name: "Alfa", slug: "alpha" }, { id: "b", name: "Tenant-A-Uuid", slug: "beta" }, P]],
  // slug com hífen vs underscore
  ["hifen-vs-underscore", "alpha_norte", [{ id: "a", name: "Alfa", slug: "alpha-norte" }, { id: "b", name: "Beta", slug: "beta" }, P]],
  ["hifen-vs-underscore-nome-outro", "alpha-norte", [{ id: "a", name: "Alfa", slug: "alpha-norte" }, { id: "b", name: "alpha_norte", slug: "beta" }, P]],
  ["hifen-vs-en-dash", "alpha\u2013norte", [{ id: "a", name: "Alfa", slug: "alpha-norte" }, { id: "b", name: "Beta", slug: "beta" }, P]],
  ["non-breaking-hyphen-nfkc", "alpha\u2011norte", [{ id: "a", name: "Alfa", slug: "alpha-norte" }, { id: "b", name: "Beta", slug: "beta" }, P]],
  // nome de A = slug de B com caixa diferente
  ["nomeA-slugB-caixa", "ALPHA", [{ id: "a", name: "Alpha", slug: "aa" }, { id: "b", name: "Beta", slug: "alpha" }, P]],
  ["nomeA-slugB-caixa-largura", "ａｌｐｈａ", [{ id: "a", name: "ALPHA", slug: "aa" }, { id: "b", name: "Beta", slug: "alpha" }, P]],
  // homoglifo cirílico
  ["cirilico-nome-A", "Duplicada", [{ id: "a", name: "Dupli\u0441ada", slug: "alpha" }, { id: "b", name: "Duplicada", slug: "beta" }, P]],
  // turco İ
  ["turco-I-ponto", "istanbul", [{ id: "a", name: "İstanbul", slug: "aa" }, { id: "b", name: "Beta", slug: "istanbul" }, P]],
  ["turco-I-ponto-tag-upper", "İSTANBUL", [{ id: "a", name: "İstanbul", slug: "aa" }, { id: "b", name: "Beta", slug: "istanbul" }, P]],
  // ß / SS
  ["sharp-s", "STRASSE", [{ id: "a", name: "Straße", slug: "aa" }, { id: "b", name: "Beta", slug: "strasse" }, P]],
  // ligadura ﬁ (NFKC -> fi)
  ["ligadura", "ﬁnanceira", [{ id: "a", name: "Financeira", slug: "aa" }, { id: "b", name: "Beta", slug: "financeira" }, P]],
  // plataforma com grafia: nome de A = "platform" em caixa alta e largura total
  ["plataforma-grafia-nome-A", "PLATFORM", [{ id: "a", name: "ＰＬＡＴＦＯＲＭ", slug: "aa" }, P]],
  ["plataforma-tag-zwsp", "platform\u200b", [{ id: "a", name: "Alfa", slug: "aa" }, P]],
  // tag = id de plataforma em caixa alta
  ["plataforma-id-upper", "PLATFORM-ID", [{ id: "a", name: "Alfa", slug: "aa" }, P]],
  // linha de quebra U+2028 / U+0085 (NEL)
  ["line-sep-dup", "Duplicada\u2028", [{ id: "a", name: "Duplicada", slug: "alpha" }, { id: "b", name: "Beta", slug: "duplicada" }, P]],
  ["nel-dup", "Duplicada\u0085", [{ id: "a", name: "Duplicada", slug: "alpha" }, { id: "b", name: "Beta", slug: "duplicada" }, P]],
  ["espaco-interno-nome", "Duplicada  Norte", [{ id: "a", name: "Duplicada Norte", slug: "alpha" }, { id: "b", name: "Duplicada\u3000Norte", slug: "beta" }, P]],
  ["vazio-zwsp-so", "\u200b", [{ id: "a", name: "Alfa", slug: "aa" }, { id: "b", name: "Beta", slug: "bb" }, P]],
];
for (const [label, tag, tenants] of cases) {
  for (const s of ["direct_tag_then_usage_weighted_v1", "usage_weighted_v1"]) {
    console.log(JSON.stringify({ label, strategy: s, tag: JSON.stringify(tag), ...run(tag, tenants, s) }));
  }
}
