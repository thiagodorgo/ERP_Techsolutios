// J484 C1 — driver próprio de mutações (jurado-j484-c1-opus). Âncora contada (=1), uma mutação por vez,
// restauração por `git checkout HEAD -- <arquivo>` + hash contra `git show HEAD:<arquivo>`, `git status --porcelain` publicado.
import fs from "node:fs";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";

const root = "C:/Users/thiag/w-j484-c1";
const engine = "src/modules/cloud-cost-allocation/cloud-cost-allocation.engine.ts";
const memoryRepo = "src/modules/cloud-cost-allocation/cloud-cost-allocation.repository.ts";
const git = (args) => spawnSync("git", ["-C", root, ...args], { encoding: "utf8" });
const hash = (s) => crypto.createHash("sha256").update(s.replace(/\r\n/g, "\n")).digest("hex");
const tagTests = ["tests/san3-03-tenant-tag.test.ts"];
const sysTests = ["tests/san3-03-system-org.test.ts"];
const dbTests = ["tests/san3-03-system-org-db.test.ts"];
const wants = (id) => process.argv.length <= 2 || process.argv.slice(2).includes(id);

function replace(file, before, after) {
  const path = root + "/" + file;
  const raw = fs.readFileSync(path, "utf8");
  const eol = raw.includes("\r\n") ? "\r\n" : "\n";
  const normalized = raw.replace(/\r\n/g, "\n");
  const count = normalized.split(before).length - 1;
  console.log("  anchor " + file.split("/").pop() + " count=" + count);
  if (count !== 1) throw new Error("anchor count " + count);
  fs.writeFileSync(path, normalized.replace(before, after).replace(/\n/g, eol));
}
function run(id, files, mutate, tests) {
  console.log("== " + id);
  try {
    mutate();
    const result = spawnSync(process.execPath, ["--test", "--import", "tsx", ...tests], { cwd: root, encoding: "utf8", timeout: 300000, env: process.env });
    const out = (result.stdout || "") + "\n" + (result.stderr || "");
    const failed = out.split(/\r?\n/).filter((l) => /^not ok /.test(l)).slice(0, 10);
    const syntax = out.split(/\r?\n/).filter((l) => /SyntaxError|TransformError|error TS|ReferenceError|TypeError/.test(l)).slice(0, 3);
    const summary = out.split(/\r?\n/).filter((l) => /^# (tests|pass|fail|skipped)/.test(l)).join(" ");
    console.log("  exit=" + result.status + " | " + summary);
    console.log("  falhas: " + (failed.join(" ; ") || "NENHUMA (mutante SOBREVIVE)"));
    console.log("  natureza: " + (syntax.join(" ; ") || "assertion"));
  } catch (e) {
    console.log("  NAO_APLICAVEL: " + e.message);
  } finally {
    for (const f of files) git(["checkout", "HEAD", "--", f]);
    const ok = files.every((f) => hash(fs.readFileSync(root + "/" + f, "utf8")) === hash(git(["show", "HEAD:" + f]).stdout));
    console.log("  restored=" + ok + " | git status --porcelain=[" + git(["status", "--porcelain"]).stdout.trim() + "]");
  }
}

const ambiguity = `    if (matchedTenantIds && matchedTenantIds.size > 1) {
      unallocated.push(createUnallocated(line, "ambiguous_tenant_tag"));
      roundingCount += 1;
      continue;
    }

`;
const unknownGuardIf = '    if (normalizedTag && !matchedTenantIds && input.strategy === "direct_tag_then_usage_weighted_v1") {';
const normalizer = String.raw`  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();`;

// M48 — volta ao Map em que a última organização vence (cada chave guarda só o último id).
if (wants("M48")) run("M48", [engine], () => replace(engine,
  "  const tenantIds = index.get(normalized) ?? new Set<string>();",
  "  const tenantIds = new Set<string>();"), [...tagTests, ...dbTests]);
// M49′ — ambiguidade só dentro do campo nome: id e slug sobrescrevem a chave (set), o nome acumula.
if (wants("M49p")) run("M49′", [engine], () => {
  replace(engine, "    addTenantTag(tenantIdsByTag, tenant.id, tenant.id);", "    tenantIdsByTag.set(normalizeTenantTag(tenant.id), new Set([tenant.id]));");
  replace(engine, "    if (tenant.slug) addTenantTag(tenantIdsByTag, tenant.slug, tenant.id);", "    if (tenant.slug) tenantIdsByTag.set(normalizeTenantTag(tenant.slug), new Set([tenant.id]));");
}, tagTests);
// M50 (forma do dev, P3) — apagar o bloco da ambígua: cai no primeiro id (direta).
if (wants("M50")) run("M50 (forma do dev)", [engine], () => replace(engine, ambiguity, ""), tagTests);
// M50-lit — forma LITERAL do plano: a ambígua cai na regra/uso (tenant indefinido quando >1).
if (wants("M50lit")) run("M50-lit (cai na regra/uso)", [engine], () => {
  replace(engine, ambiguity, "");
  replace(engine, "    const tenantId = matchedTenantIds?.values().next().value;",
    "    const tenantId = matchedTenantIds && matchedTenantIds.size === 1 ? matchedTenantIds.values().next().value : undefined;");
}, tagTests);
// M51 — teste da plataforma antes da ambiguidade.
if (wants("M51")) run("M51", [engine], () => {
  replace(engine, ambiguity, "");
  replace(engine, '    if (tenant && input.strategy === "direct_tag_then_usage_weighted_v1") {', ambiguity + '    if (tenant && input.strategy === "direct_tag_then_usage_weighted_v1") {');
}, tagTests);
// M52 — ambiguidade só na estratégia padrão.
if (wants("M52")) run("M52", [engine], () => replace(engine,
  "    if (matchedTenantIds && matchedTenantIds.size > 1) {",
  '    if (matchedTenantIds && matchedTenantIds.size > 1 && input.strategy === "direct_tag_then_usage_weighted_v1") {'), tagTests);
// M53 — sem trim/colapso de espaço.
if (wants("M53")) run("M53", [engine], () => replace(engine, normalizer, '  return value.normalize("NFKC").toLowerCase();'), tagTests);
// M53-b — sem NFKC.
if (wants("M53b")) run("M53-b", [engine], () => replace(engine, normalizer, String.raw`  return value.trim().replace(/\s+/g, " ").toLowerCase();`), tagTests);
// M53-c — consulta da linha só em minúsculas.
if (wants("M53c")) run("M53-c", [engine], () => replace(engine,
  "    const normalizedTag = line.tenantTag ? normalizeTenantTag(line.tenantTag) : undefined;",
  "    const normalizedTag = line.tenantTag ? line.tenantTag.toLowerCase() : undefined;"), tagTests);
// M55 — apagar o ramo unknown_tenant_tag.
if (wants("M55")) run("M55", [engine], () => replace(engine, unknownGuardIf + `
      unallocated.push(createUnallocated(line, "unknown_tenant_tag"));
      roundingCount += 1;
      continue;
    }

`, ""), tagTests);
// M55-b — recusa também na estratégia só por uso.
if (wants("M55b")) run("M55-b", [engine], () => replace(engine, unknownGuardIf, "    if (normalizedTag && !matchedTenantIds) {"), tagTests);
// M55-c — tag só de espaço tratada como desconhecida.
if (wants("M55c")) run("M55-c", [engine], () => replace(engine, unknownGuardIf,
  '    if (line.tenantTag && !matchedTenantIds && input.strategy === "direct_tag_then_usage_weighted_v1") {'), tagTests);
// M22′ — casa só por slug: apaga as linhas de id e de nome do índice.
if (wants("M22p")) run("M22′", [engine], () => {
  replace(engine, "    addTenantTag(tenantIdsByTag, tenant.id, tenant.id);\n", "");
  replace(engine, "    addTenantTag(tenantIdsByTag, tenant.name, tenant.id);\n", "");
}, sysTests);
// M17-b — listTenants do dublê esconde a plataforma.
if (wants("M17b")) run("M17-b", [memoryRepo], () => replace(memoryRepo,
  "    return this.tenants;",
  '    return this.tenants.filter((tenant) => tenant.slug?.toLowerCase() !== "platform");'), sysTests);
// M23 — custo marcado com a plataforma só é dela na estratégia direta.
if (wants("M23")) run("M23", [engine], () => replace(engine,
  "    if (tenant && systemTenant && tenant.id === systemTenant.id) {",
  '    if (tenant && systemTenant && tenant.id === systemTenant.id && input.strategy === "direct_tag_then_usage_weighted_v1") {'), sysTests);
// M-C1-NOVA — a mesma organização casando a mesma chave por dois campos (nome == slug, caso comum: slug
// derivado do nome) passa a contar como "ambígua": a organização perde a alocação direta da própria tag.
if (wants("MNOVA")) run("M-C1-NOVA (auto-colisão nome==slug vira ambígua)", [engine], () => replace(engine,
  "  tenantIds.add(tenantId);",
  '  tenantIds.add(tenantIds.has(tenantId) ? tenantId + "#dup" : tenantId);'), [...tagTests, ...sysTests, ...dbTests]);
