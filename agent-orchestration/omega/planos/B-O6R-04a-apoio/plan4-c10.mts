  // A-06 / N-E5: sizing com a emulacao LITERAL do v3 (sem findItemById por unidade; total no finishClose) x head-base
  if (want("SIZE")) {
    const bulk = async (t: string, n: number) => {
      await admin.$executeRawUnsafe(`INSERT INTO inventory_items (tenant_id,sku,name,unit,avg_cost) SELECT $1::uuid,$3||g,$4||g,$5,2 FROM generate_series(1,$2::int) g`, t, n, "SKU-", "Item ", "un");
      await admin.$executeRawUnsafe(`INSERT INTO stock_movements (tenant_id,item_id,type,quantidade_sinalizada,unit_cost,custody_type) SELECT tenant_id,id,$2,10,1,$3 FROM inventory_items WHERE tenant_id=$1::uuid`, t, "entrada", "base");
      const s = ((await admin.$queryRawUnsafe(`INSERT INTO cycle_counts (tenant_id) VALUES ($1::uuid) RETURNING id`, t)) as any[])[0].id;
      await admin.$executeRawUnsafe(`INSERT INTO cycle_count_entries (tenant_id,cycle_count_id,item_id,system_quantity,counted_quantity) SELECT tenant_id,$2::uuid,id,10,7 FROM inventory_items WHERE tenant_id=$1::uuid`, t, s);
      return s as string;
    };
    const Ns = (process.env.SIZE_N ?? "250,500,1000").split(",").map(Number); const out: any[] = [];
    const pct = (a: number[], p: number) => { const b = [...a].sort((x, y) => x - y); return b[Math.min(b.length - 1, Math.floor(p * b.length))]; };
    for (const N of Ns) {
      const row: any = { N };
      { const t = await newTenant("size-v3"); const s = await bulk(t, N); const unitMs: number[] = []; const t1 = Date.now(); let r: any;
        try { r = await closeV3(roleA.client, t, s, randomUUID(), { unitMs }); } catch (e) { r = { err: errInfo(e) }; }
        row.v3 = { ms: Date.now() - t1, status: r.status ?? r.err, totalVarianceValue: r.totalVarianceValue, esperado: -3 * 2 * N, unid_media: Math.round(unitMs.reduce((a, b) => a + b, 0) / Math.max(1, unitMs.length) * 100) / 100, unid_p95: pct(unitMs, 0.95), unid_max: Math.max(...unitMs), final: await state(t, s) }; save(); }
      if (process.env.SIZE_HB !== "0") { const t = await newTenant("size-hb"); const s = await bulk(t, N); const t1 = Date.now(); let r: any;
        try { const x: any = await svcOf(roleA.client).close(actor(t), s); r = { status: x.cycleCount.status, totalVarianceValue: x.totalVarianceValue }; } catch (e) { r = { err: errInfo(e) }; }
        row.headbase = { ms: Date.now() - t1, ...r, final: await state(t, s) }; }
      out.push(row); R.SIZE = out; save();
    }
  }
} finally {
  R.fimMs = now(); save();
  await roleA.drop().catch((e: any) => { R.dropA = errInfo(e); });
  await roleB.drop().catch((e: any) => { R.dropB = errInfo(e); });
  R.papeisOrfaos = ((await admin.$queryRawUnsafe(`SELECT count(*)::int n FROM pg_roles WHERE rolname LIKE $1`, "o6r_b01_%")) as any[])[0].n;
  save(); await admin.$disconnect();
}
