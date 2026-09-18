const roleA = await createEphemeralRole(admin, withApplicationName(DB, "plan4-A"));
const roleB = await createEphemeralRole(admin, withApplicationName(DB, "plan4-B"));
try {
  if (want("PRE")) {
    const out: any = {};
    for (const [n, r] of [["A", roleA], ["B", roleB]] as const) out[n] = ((await (r as any).client.$queryRawUnsafe(`SELECT current_user u, r.rolsuper, r.rolbypassrls, current_setting($1) app FROM pg_roles r WHERE r.rolname=current_user`, "application_name")) as any[])[0];
    const t = await newTenant("pre"); const t2 = await newTenant("pre2");
    out.iso = ((await withTenantRls(roleA.client, t, (tx: any) => tx.$queryRawUnsafe(`SELECT current_setting($1) i`, "transaction_isolation"))) as any[])[0].i;
    out.tenantLock_linhas = { comContexto: (await withTenantRls(roleA.client, t, (tx: any) => tx.$queryRawUnsafe(TENANT_LOCK, t))).length, semContexto: (await roleA.client.$transaction((tx: any) => tx.$queryRawUnsafe(TENANT_LOCK, t))).length, contextoDeOutroTenant: (await withTenantRls(roleA.client, t2, (tx: any) => tx.$queryRawUnsafe(TENANT_LOCK, t))).length };
    out.tenantsTemRls = ((await admin.$queryRawUnsafe(`SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname=$1`, "tenants")) as any[])[0];
    const X = await newItem(t, { base: 10 });
    let rel!: () => void; const gate = new Promise<void>((r) => (rel = r));
    const pa = withTenantRls(roleA.client, t, async (tx: any) => { await tx.$queryRawUnsafe(TENANT_LOCK, t); await gate; return "A-ok"; });
    await sleep(150); const tV = Date.now();
    const rv = await new invMod.RlsPrismaInventoryRepository(roleB.client).createMovement({ tenantId: t, itemId: X, type: "saida", quantidadeSinalizada: -1 }).then(() => ({ ok_ms: Date.now() - tV }), (e: any) => ({ err: errInfo(e) }));
    rel(); await pa; out.tenantNoKeyUpdate_vs_insertMovimento = rv;
    R.PRE = out; save();
  }
  // S-01: cenario STUCK do critico (BASE 4 + viatura 6; open real fotografa 10; contado 2 -> -8 na BASE -> 409)
  if (want("STUCK")) {
    for (const kind of ["headbase", "v2", "v3", "v3_recount_close"] as const) {
      const t = await newTenant("stuck-" + kind);
      const V = ((await admin.$queryRawUnsafe(`INSERT INTO vehicles (tenant_id, plate, model) VALUES ($1::uuid, $2, $3) RETURNING id`, t, "PLN" + Math.floor(Math.random() * 9000 + 1000), "Guincho")) as any[])[0].id;
      const X = await newItem(t, { base: 10, avg: 1 });
      const g = randomUUID(); await mov(t, X, "link", -6, { group: g }); await mov(t, X, "link", 6, { custody: "vehicle", vehicle: V, group: g });
      const opened: any = await svcOf(roleA.client).open(actor(t), {});
      const s = opened.id; const E = opened.entries[0].id;
      await svcOf(roleA.client).recordEntry(actor(t), s, E, { counted_quantity: 2 });
      const out: any = { forma: "item 10 no total (BASE 4 + viatura 6); open real; contado 2 (variancia -8); ajuste vai para a BASE", systemQuantity: opened.entries[0].systemQuantity, saldoBase: await saldoBase(t, X) };
      const closeFn = kind === "headbase" ? () => svcOf(roleA.client).close(actor(t), s) : kind === "v2" ? () => closeV2(roleA.client, t, s, randomUUID()) : () => closeV3(roleA.client, t, s, randomUUID());
      try { await closeFn(); out.close = "ok"; } catch (e) { out.close = errInfo(e); }
      out.aposClose = await state(t, s);
      if (kind === "headbase") {
        try { const r = await svcOf(roleB.client).recordEntry(actor(t), s, E, { counted_quantity: 4 }); out.recontagem = "ok contado=" + r.countedQuantity; } catch (e) { out.recontagem = errInfo(e); }
        try { const r = await svcOf(roleB.client).cancel(actor(t), s); out.cancel = "ok " + r.status; } catch (e) { out.cancel = errInfo(e); }
      } else if (kind === "v2") { out.recontagem = await recordEntryV2(roleB.client, t, s, E, 4); out.cancel = await cancelV2(roleB.client, t, s); try { await closeV2(roleA.client, t, s, randomUUID()); out.close2 = "ok"; } catch (e) { out.close2 = errInfo(e); } }
      else if (kind === "v3") { out.recontagem = await recordEntryV3(roleB.client, t, s, E, 4); out.cancel = await cancelV3(roleB.client, t, s); }
      else { out.recontagem = await recordEntryV3(roleB.client, t, s, E, 8); try { const r = await closeV3(roleA.client, t, s, randomUUID()); out.close2 = r; } catch (e) { out.close2 = errInfo(e); } out.saldoBaseFinal = await saldoBase(t, X); }
      out.final = await state(t, s);
      R["STUCK_" + kind] = out; save();
    }
    // parcial: X aplicado, Y (BASE 4 + viatura 6, contado 2) -> 409 -> fechando com 1 carimbo; saidas: recontar Y (nao carimbada) e retomar; cancel recusado; X (carimbada) recusada
    {
      const t = await newTenant("stuck-partial"); const [lo, hi] = [randomUUID(), randomUUID()].sort();
      const V = ((await admin.$queryRawUnsafe(`INSERT INTO vehicles (tenant_id, plate, model) VALUES ($1::uuid, $2, $3) RETURNING id`, t, "PLP" + Math.floor(Math.random() * 9000 + 1000), "Guincho")) as any[])[0].id;
      const X = await newItem(t, { id: lo, base: 10, avg: 1 }); const Y = await newItem(t, { id: hi, base: 10, avg: 1 });
      const g = randomUUID(); await mov(t, Y, "link", -6, { group: g }); await mov(t, Y, "link", 6, { custody: "vehicle", vehicle: V, group: g });
      const { s, ids: [EX, EY] } = await newSession(t, [{ item: X, system: 10, counted: 7 }, { item: Y, system: 10, counted: 2 }]);
      const out: any = {};
      try { await closeV3(roleA.client, t, s, randomUUID()); out.close = "ok"; } catch (e) { out.close = errInfo(e); }
      out.aposClose = await state(t, s);
      out.recontagemY_naoCarimbada = await recordEntryV3(roleB.client, t, s, EY, 8);
      out.recontagemX_carimbada = await recordEntryV3(roleB.client, t, s, EX, 9);
      out.cancel = await cancelV3(roleB.client, t, s);
      try { out.close2 = await closeV3(roleB.client, t, s, randomUUID()); } catch (e) { out.close2 = errInfo(e); }
      out.final = await state(t, s); out.saldoBaseY = await saldoBase(t, Y);
      const ent: any[] = await admin.$queryRawUnsafe(`SELECT item_id, counted_quantity::float8 contado, variance::float8 variance, adjustment_movement_id IS NOT NULL carimbada FROM cycle_count_entries WHERE cycle_count_id=$1::uuid ORDER BY item_id`, s);
      out.entries = ent; R.STUCK_partial_v3 = out; save();
    }
  }
