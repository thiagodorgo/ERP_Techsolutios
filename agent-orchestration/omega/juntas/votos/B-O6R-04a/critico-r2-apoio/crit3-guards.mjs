// crit3: executa as regras de T-D (D1, D2) COMO o plano v2 as especifica (§6), contra amostras e contra o proprio desenho V5 do plano.
// D1 (plano §6): ORM  stockMovement\.(create|createMany|upsert|update|updateMany|delete|deleteMany)\(
//                SQL  (INSERT INTO|UPDATE|DELETE FROM)\s+"?(public\.)?"?stock_movements
const ORM = /stockMovement\.(create|createMany|upsert|update|updateMany|delete|deleteMany)\(/;
const SQL = /(INSERT INTO|UPDATE|DELETE FROM)\s+"?(public\.)?"?stock_movements/;
const amostras = [
  'await this.client.stockMovement.create({ data })',
  'await tx.stockMovement.createMany({ data })',
  'await tx.stockMovement.createManyAndReturn({ data })',
  'await tx.stockMovement.updateManyAndReturn({ where, data })',
  'await tx.$executeRaw`INSERT INTO stock_movements (tenant_id) VALUES (${t})`',
  'await tx.$executeRaw`INSERT INTO "stock_movements" (tenant_id) VALUES (${t})`',
  'await tx.$executeRaw`INSERT INTO public.stock_movements (tenant_id) VALUES (${t})`',
  'await tx.$executeRaw`INSERT INTO "public"."stock_movements" ("tenant_id") VALUES (${t})`',
  'await tx.$executeRaw`insert into stock_movements (tenant_id) values (${t})`',
];
console.log("== D1 (regex do plano, sem flag i)");
for (const a of amostras) console.log((ORM.test(a) || SQL.test(a) ? "  NEGA  " : "  PASSA ") + a);
// D2 (plano §6): em cada metodo com this.insertMovement( ou avg_cost:, exige this.lockItemForUpdate( ANTES da 1a ocorrencia de
// saldoOf|saldoOfCustody|hasReversalOf|findExitBySource|isExitReversed, exatamente 1 lock, antes de qualquer for(/while(/.map(/.forEach(.
// Corpo de V5 escrito EXATAMENTE como o plano descreve (§3.1 tabela, linha V5): findExitBySource sem lock -> lock(exit.itemId) -> hasReversalOfLocked -> insert.
const v5 = `async removeExitForSource(input) {
    const exit = await this.findExitBySource(input.tenantId, input.sourceType, input.sourceId);
    if (!exit) return undefined;
    const lock = await this.lockItemForUpdate(input.tenantId, exit.itemId);
    if (!lock) return undefined;
    if (await this.hasReversalOfLocked(lock, [exit.id])) return undefined;
    return this.insertMovement({ tenantId: input.tenantId, itemId: exit.itemId, reversesMovementId: exit.id, custody: BASE_CUSTODY }, lock);
  }`;
function d2(body) {
  const decisores = /\b(saldoOf|saldoOfCustody|hasReversalOf|findExitBySource|isExitReversed)\w*\(/g;
  const iLock = body.indexOf("this.lockItemForUpdate(");
  const locks = body.split("this.lockItemForUpdate(").length - 1;
  const m = decisores.exec(body); const iDec = m ? m.index : Infinity;
  const laco = body.search(/for \(|while \(|\.map\(|\.forEach\(/);
  const ok = iLock >= 0 && locks === 1 && iLock < iDec && (laco < 0 || iLock < laco);
  return { ok, iLock, primeiroDecisor: m ? m[0] : null, iDec, locks };
}
console.log("== D2 aplicado ao V5 do proprio plano:", JSON.stringify(d2(v5)));
