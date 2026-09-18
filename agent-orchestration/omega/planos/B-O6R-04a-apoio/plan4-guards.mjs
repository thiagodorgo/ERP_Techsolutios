// plan4: guards do T-D v3 — D1 pela PROPRIEDADE (membro nao-leitura = escritor; SQL cru case-insensitive, qualquer grafia), D2 com leituras de identificacao, C6 sem comentarios
import { readFileSync } from "node:fs";
const READ = new Set(["findMany","findFirst","findUnique","findFirstOrThrow","findUniqueOrThrow","count","aggregate","groupBy"]);
const ORM = /\bstockMovement\.(\w+)\(/g;
const SQL = /\b(insert\s+into|update|delete\s+from|truncate(?:\s+table)?|copy|merge\s+into)\s+(?:"?public"?\s*\.\s*)?"?stock_movements"?\b/i;
export function d1Writer(line) { let m; const w = []; ORM.lastIndex = 0; while ((m = ORM.exec(line))) if (!READ.has(m[1])) w.push(m[1]); return w.length > 0 || SQL.test(line); }
const amostras = [
  'await this.client.stockMovement.create({ data })', 'await tx.stockMovement.createMany({ data })', 'await tx.stockMovement.createManyAndReturn({ data })',
  'await tx.stockMovement.updateManyAndReturn({ where, data })', 'await tx.stockMovement.upsert({})', 'await tx.stockMovement.deleteMany({})', 'await tx.stockMovement.novoMetodoQualquer({})',
  'await tx.$executeRaw`INSERT INTO stock_movements (tenant_id) VALUES (${t})`', 'await tx.$executeRaw`INSERT INTO "stock_movements" (tenant_id) VALUES (${t})`',
  'await tx.$executeRaw`INSERT INTO public.stock_movements (tenant_id) VALUES (${t})`', 'await tx.$executeRaw`INSERT INTO "public"."stock_movements" ("tenant_id") VALUES (${t})`',
  'await tx.$executeRaw`insert into stock_movements (tenant_id) values (${t})`', 'UPDATE stock_movements SET x=1', 'delete from "public"."stock_movements" where', 'COPY stock_movements FROM stdin',
];
const leituras = ['await tx.stockMovement.findMany({ where })', 'await tx.stockMovement.count({ where })', 'await tx.stockMovement.aggregate({})', 'await tx.stockMovement.groupBy({})', 'SELECT * FROM stock_movements WHERE', 'SELECT count(*) FROM "public"."stock_movements"'];
console.log("== D1 v3 — escritores (todos devem NEGAR):"); let ok = true;
for (const a of amostras) { const w = d1Writer(a); ok &&= w; console.log((w ? "  NEGA  " : "  PASSA!! ") + a); }
console.log("== D1 v3 — leituras (todas devem PASSAR):");
for (const a of leituras) { const w = d1Writer(a); ok &&= !w; console.log((w ? "  NEGA!! " : "  PASSA ") + a); }
// D2 v3: leituras de IDENTIFICACAO permitidas antes do lock; DECISAO so depois; exatamente 1 lock; lock antes de qualquer laco
const IDENT = /\b(findMovementById|findExitBySource|parse\w+)\(/g;
const DECIDE = /\b(saldoOf\w*|hasReversalOf\w*|isExitReversed\w*|movementsInGroup\w*|aggregate|wouldOverdraw|computeMovingAverage|avg_cost)\b/g;
export function d2(body) {
  const iLock = body.indexOf("this.lockItemForUpdate("); const locks = body.split("this.lockItemForUpdate(").length - 1;
  DECIDE.lastIndex = 0; const m = DECIDE.exec(body); const iDec = m ? m.index : Infinity;
  const laco = body.search(/\bfor \(|\bwhile \(|\.map\(|\.forEach\(/);
  const semLockUnlocked = !/\b(saldoOf|saldoOfCustody|hasReversalOf|isExitReversed)\(/.test(body); // versoes SEM lock nao existem mais no v3
  const ok = iLock >= 0 && locks === 1 && iLock < iDec && (laco < 0 || iLock < laco) && semLockUnlocked;
  return { ok, iLock, locks, primeiroDecisor: m ? m[0] : null, iDec, laco, semLockUnlocked };
}
const v5 = `async removeExitForSource(input) {\n const exit = await this.findExitBySource(input.tenantId, input.sourceType, input.sourceId);\n if (!exit) return undefined;\n const lock = await this.lockItemForUpdate(input.tenantId, exit.itemId);\n if (!lock) return undefined;\n if (await this.hasReversalOfLocked(lock, [exit.id])) return undefined;\n return this.insertMovement({ tenantId: input.tenantId, itemId: exit.itemId, reversesMovementId: exit.id, custody: BASE_CUSTODY }, lock);\n}`;
const v3 = `async reverseMovement(input) {\n const original = await this.findMovementById(input.tenantId, input.movementId);\n if (!original) return { status: "not_found" };\n const lock = await this.lockItemForUpdate(input.tenantId, original.itemId);\n if (!lock) return { status: "not_found" };\n const siblings = original.transferGroupId ? await this.movementsInGroupLocked(lock, original.transferGroupId) : [original];\n if (await this.hasReversalOfLocked(lock, siblings.map(s => s.id))) return { status: "already_reversed" };\n for (const leg of legs) { const before = await this.saldoOfCustodyLocked(lock, custody); if (wouldOverdraw(before, signed)) throw insufficientBalanceError(before); movements.push(await this.insertMovement({...}, lock)); }\n return { status: "ok", movements };\n}`;
const casos = { V5_v3: v5, V3_v3: v3, mut_lockNoLaco: v3.replace("const lock = await this.lockItemForUpdate(input.tenantId, original.itemId);\n if (!lock) return { status: \"not_found\" };\n", "").replace("for (const leg of legs) {", "for (const leg of legs) { const lock = await this.lockItemForUpdate(input.tenantId, leg.itemId);"), mut_decisaoAntes: v5.replace("if (!exit) return undefined;", "if (!exit) return undefined; const s = await this.client.stockMovement.aggregate({});"), mut_doisLocks: v5.replace("if (!lock) return undefined;", "if (!lock) return undefined; const l2 = await this.lockItemForUpdate(input.tenantId, exit.itemId);"), mut_semLock: v5.replace("const lock = await this.lockItemForUpdate(input.tenantId, exit.itemId);\n if (!lock) return undefined;\n", ""), mut_versaoSemLock: v5.replace("hasReversalOfLocked(lock, [exit.id])", "hasReversalOf(input.tenantId, [exit.id])") };
console.log("== D2 v3:"); for (const [k, b] of Object.entries(casos)) { const r = d2(b); const esperado = k.startsWith("mut_") ? false : true; ok &&= r.ok === esperado; console.log(`  ${r.ok === esperado ? "ok " : "!! "} ${k}: ${JSON.stringify(r)}`); }
// C6: regex fail-closed sobre o script do censo SEM comentarios
const strip = (sql) => sql.replace(/--[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
const censo = readFileSync(process.argv[2], "utf8"); const RX = /\b(INSERT|UPDATE|DELETE|TRUNCATE|ALTER|DROP|CREATE|COPY|MERGE)\b/gi;
console.log("== C6: matches no texto cru =", (censo.match(RX) ?? []).length, "| matches sem comentarios =", (strip(censo).match(RX) ?? []).length);
ok &&= (strip(censo).match(RX) ?? []).length === 0;
console.log(ok ? "GUARDS v3: TODOS OS CASOS COMO ESPERADO" : "GUARDS v3: HA DIVERGENCIA"); process.exit(ok ? 0 : 1);
