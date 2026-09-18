  // S-02: TVV_resume (esperado -30) e TVV_concorrente (esperado -60) do critico, avg_cost 2
  if (want("TVV")) {
    for (const kind of ["headbase", "v2", "v3"] as const) {
      const t = await newTenant("tvv-" + kind); const items: string[] = [];
      for (let i = 0; i < 5; i++) items.push(await newItem(t, { base: 10, avg: 2 }));
      items.sort();
      const { s } = await newSession(t, items.map((it) => ({ item: it, system: 10, counted: 7 })));
      await mov(t, items[2], "saida", -9);
      const u = randomUUID(); const fn = kind === "headbase" ? () => svcOf(roleA.client).close({ ...actor(t), userId: u }, s).then((r: any) => ({ status: r.cycleCount.status, totalVarianceValue: r.totalVarianceValue })) : kind === "v2" ? () => closeV2(roleA.client, t, s, u) : () => closeV3(roleA.client, t, s, u);
      let c1: any; let c2: any;
      try { c1 = await fn(); } catch (e) { c1 = { err: errInfo(e) }; }
      const aposFalha = await state(t, s);
      await mov(t, items[2], "entrada", 9, { unitCost: 2 });
      try { c2 = await fn(); } catch (e) { c2 = { err: errInfo(e) }; }
      R["TVV_resume_" + kind] = { close1: c1, aposFalha, close2: c2, final: await state(t, s), esperado: -30 }; save();
    }
    for (const kind of ["v2", "v3"] as const) {
      const iters: any[] = [];
      for (let i = 0; i < (kind === "v2" ? 3 : 5); i++) {
        const t = await newTenant("tvvc-" + kind); const items: string[] = [];
        for (let k = 0; k < 10; k++) items.push(await newItem(t, { base: 10, avg: 2 }));
        const { s } = await newSession(t, items.map((it) => ({ item: it, system: 10, counted: 7 })));
        let go!: () => void; const start = new Promise<void>((r) => (go = r));
        const ps = [roleA.client, roleB.client].map((c, k) => (async () => { await start; if (k === 1) await sleep(15); return closeV(kind, c, t, s, randomUUID(), { betweenUnitsMs: 25 }); })());
        go(); const st = await Promise.allSettled(ps);
        iters.push({ st: st.map((x: any) => x.status === "fulfilled" ? { ok: x.value.status, begin: x.value.beginStatus, applied: x.value.applied, skipped: x.value.skipped, totalVarianceValue: x.value.totalVarianceValue } : { err: x.reason?.statusCode + "|" + x.reason?.reason }), final: await state(t, s) });
      }
      R["TVV_concorrente_" + kind] = { esperado: -60, iters }; save();
    }
  }
  // T-01: B3 como ESPECIFICADO (carimbo ANTES do B) com barreira fragment "tenant_id" (casa nos dois mundos) — head-base e v3
  if (want("B3")) {
    for (const kind of ["headbase", "v3"] as const) {
      const t = await newTenant("b3-" + kind); const X = await newItem(t, { base: 10 });
      const { s, ids: [E] } = await newSession(t, [{ item: X, system: 10, counted: 7 }]);
      let release!: () => void; const gate = new Promise<void>((r) => (release = r)); const marks: any[] = [];
      const pa = admin.$transaction(async (tx: any) => {
        await tx.$executeRawUnsafe(`SELECT set_config($2,$1,true)`, t, "app.current_tenant_id");
        await tx.$queryRawUnsafe(`SELECT id FROM cycle_counts WHERE id=$1::uuid FOR UPDATE`, s);
        await tx.$executeRawUnsafe(`UPDATE cycle_counts SET status=$2 WHERE id=$1::uuid AND status=$3`, s, "fechando", "aberta");
        const m: any[] = await tx.$queryRawUnsafe(`INSERT INTO stock_movements (tenant_id,item_id,type,quantidade_sinalizada,custody_type,cycle_count_id) VALUES ($1::uuid,$2::uuid,$4,-3,$5,$3::uuid) RETURNING id`, t, X, s, "ajuste", "base");
        await tx.$executeRawUnsafe(`UPDATE cycle_count_entries SET variance=-3, adjustment_movement_id=$2::uuid WHERE id=$1::uuid`, E, m[0].id);
        await tx.$executeRawUnsafe(`UPDATE cycle_counts SET status=$2 WHERE id=$1::uuid AND status=$3`, s, "concluida", "fechando");
        marks.push(["admin: carimbo+concluida (nao commitado)", now()]); await gate; marks.push(["admin: commit", now()]);
      }, { timeout: 30000 });
      await sleep(200); marks.push(["B: recordEntry " + kind + " contado=5", now()]);
      const pb = (kind === "headbase" ? svcOf(roleB.client).recordEntry(actor(t), s, E, { counted_quantity: 5 }).then((r: any) => ({ ok: "contado=" + r.countedQuantity })) : recordEntryV3(roleB.client, t, s, E, 5)).then((v: any) => ({ ...v, at: now() }), (e: any) => ({ err: errInfo(e), at: now() }));
      const bloqueadoEm = await waitBlocked("plan4-B", 2500);
      const barreira: any = {};
      for (const frag of ["tenant_id", "cycle_counts"]) { try { await waitForOwnBlockedStatement(admin, { applicationName: "plan4-B", fragment: frag, label: "B3", timeoutMs: 2000 }); barreira[frag] = "casou"; } catch (e: any) { barreira[frag] = "FALHOU: " + String(e.message).slice(0, 120); } }
      release(); await pa; const rb = await pb;
      const entry: any[] = await admin.$queryRawUnsafe(`SELECT counted_quantity::float8 contado, variance::float8 variance FROM cycle_count_entries WHERE id=$1::uuid`, E);
      R["B3_" + kind] = { bloqueadoEm, barreira, B: rb, entryFinal: entry[0], invarianteContado7: entry[0].contado === 7, sessao: await state(t, s), marks }; save();
    }
  }
