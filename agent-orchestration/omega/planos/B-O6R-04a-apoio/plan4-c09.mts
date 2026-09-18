  // N-OVL: head-base (2 open reais no mesmo item -> saldo 98) x v3 (open com lock do tenant + exclusao -> 2o open 409; corrida 2 opens x5 -> 1 ok)
  if (want("OVL")) {
    { const t = await newTenant("ovl-hb"); const X = await newItem(t, { base: 100 });
      const s1: any = await svcOf(roleA.client).open(actor(t), {}); const s2: any = await svcOf(roleA.client).open(actor(t), {});
      await svcOf(roleA.client).recordEntry(actor(t), s1.id, s1.entries[0].id, { counted_quantity: 99 });
      await svcOf(roleA.client).recordEntry(actor(t), s2.id, s2.entries[0].id, { counted_quantity: 99 });
      for (const s of [s1.id, s2.id]) await svcOf(roleA.client).close(actor(t), s);
      R.OVL_headbase = { sessoes: 2, saldoFinal: await saldoBase(t, X), fisico: 99 }; save(); }
    { const t = await newTenant("ovl-v3"); const X = await newItem(t, { base: 100 });
      const s1 = await openV3(roleA.client, t, [{ id: X, saldo: 100 }]);
      let s2: any; try { s2 = await openV3(roleA.client, t, [{ id: X, saldo: 100 }]); } catch (e) { s2 = errInfo(e); }
      const iters: any[] = [];
      for (let i = 0; i < 5; i++) {
        const t2 = await newTenant("ovl-race"); const Y = await newItem(t2, { base: 100 });
        let go!: () => void; const start = new Promise<void>((r) => (go = r));
        const ps = [roleA.client, roleB.client].map((c) => (async () => { await start; return openV3(c, t2, [{ id: Y, saldo: 100 }], 400); })());
        go(); await sleep(250); const bloq = await blockedOf("plan4-B");
        const st = await Promise.allSettled(ps);
        const n = ((await admin.$queryRawUnsafe(`SELECT count(*)::int n FROM cycle_counts WHERE tenant_id=$1::uuid`, t2)) as any[])[0].n;
        iters.push({ resultados: st.map((x: any) => x.status === "fulfilled" ? "ok" : x.reason?.reason), B_bloqueadoEm: bloq, sessoesCriadas: n });
      }
      const E1 = ((await admin.$queryRawUnsafe(`SELECT id FROM cycle_count_entries WHERE cycle_count_id=$1::uuid`, s1)) as any[])[0].id;
      await recordEntryV3(roleA.client, t, s1, E1, 99); const c = await closeV3(roleA.client, t, s1, randomUUID());
      // depois de concluida, um novo open do mesmo item e aceito
      let s3: any; try { s3 = await openV3(roleA.client, t, [{ id: X, saldo: 99 }]); } catch (e) { s3 = errInfo(e); }
      R.OVL_v3 = { open2: s2, corrida: iters, closeS1: c, saldoFinal: await saldoBase(t, X), fisico: 99, openDepoisDeConcluida: typeof s3 === "string" ? "ok" : s3 }; save(); }
  }
  // A-01/A-02 re-medidos contra o desenho v3 (recordEntry em fechando so para entry nao carimbada; cancel sob FOR UPDATE)
  if (want("E34")) {
    for (const kind of ["recordEntry_carimbada", "cancel", "recordEntry_naoCarimbada"] as const) {
      const t = await newTenant("e34-" + kind); const [lo, hi] = [randomUUID(), randomUUID()].sort();
      const X = await newItem(t, { id: lo, base: 10 }); const Y = kind === "recordEntry_naoCarimbada" ? await newItem(t, { id: hi, base: 10 }) : undefined;
      const { s, ids } = await newSession(t, Y ? [{ item: X, system: 10, counted: 7 }, { item: Y, system: 10, counted: 7 }] : [{ item: X, system: 10, counted: 7 }]);
      const pa = closeV3(roleA.client, t, s, randomUUID(), { beforeUnitCommitMs: (id) => (id === X ? 1500 : 0) }).then((v) => ({ ok: v, at: now() }), (e) => ({ err: errInfo(e), at: now() }));
      await sleep(300);
      const pb = (kind === "cancel" ? cancelV3(roleB.client, t, s) : recordEntryV3(roleB.client, t, s, kind === "recordEntry_carimbada" ? ids[0] : ids[1], 5)).then((v: any) => ({ ...v, at: now() }), (e: any) => ({ err: errInfo(e), at: now() }));
      const bloqueadoEm = await waitBlocked("plan4-B", 1200);
      const [ra, rb] = await Promise.all([pa, pb]);
      const ent: any[] = await admin.$queryRawUnsafe(`SELECT item_id, counted_quantity::float8 contado, system_quantity::float8 sistema, variance::float8 variance FROM cycle_count_entries WHERE cycle_count_id=$1::uuid ORDER BY item_id`, s);
      R["E34_" + kind] = { A: ra, B: rb, B_bloqueadoEm: bloqueadoEm, entries: ent, coerente: ent.every((e) => e.variance === null || e.variance === e.contado - e.sistema), sessao: await state(t, s) }; save();
    }
  }
  // T-04: DDL numa base PROPRIA (erp_plan_mig) nao toca quem segura stock_movements na base das suites (erp_plan_b04a)
  if (want("DDLISO")) {
    const t1 = await newTenant("ddl-h"); const X = await newItem(t1, { base: 10 }); const t2 = await newTenant("ddl-v"); const Y = await newItem(t2, { base: 10 });
    let rel!: () => void; const gate = new Promise<void>((r) => (rel = r));
    const h = admin.$transaction(async (tx: any) => { await tx.$executeRawUnsafe(`INSERT INTO stock_movements (tenant_id,item_id,type,quantidade_sinalizada,custody_type) VALUES ($1::uuid,$2::uuid,$3,-1,$4)`, t1, X, "saida", "base"); await gate; }, { timeout: 30000 });
    await sleep(200); const tD = Date.now();
    const d = (async () => { try { const o = execFileSync("docker", ["exec", "plan-b04a-pg", "psql", "-U", "plan", "-d", "erp_plan_mig", "-v", "ON_ERROR_STOP=1", "-c", "CREATE UNIQUE INDEX plan4_tmp ON stock_movements (tenant_id, id) WHERE false; DROP INDEX plan4_tmp;"], { encoding: "utf8" }); return { ok_ms: Date.now() - tD, out: o.trim().slice(-40) }; } catch (e: any) { return { err: String(e.stderr ?? e.message).slice(0, 200) }; } })();
    await sleep(200); const tV = Date.now();
    const v = new invMod.RlsPrismaInventoryRepository(roleB.client).createMovement({ tenantId: t2, itemId: Y, type: "saida", quantidadeSinalizada: -1 }).then(() => ({ ok_ms: Date.now() - tV }), (e: any) => ({ err: errInfo(e), ms: Date.now() - tV }));
    const bloq = await waitBlocked("plan4-B", 1000);
    await sleep(3000); rel(); await h; const [rd, rv] = await Promise.all([d, v]);
    R.DDLISO = { forma: "H (admin) INSERT em stock_movements na base das suites + segura 3,4 s; D = CREATE/DROP INDEX na base PROPRIA erp_plan_mig; V = createMovement head-base de outro tenant na base das suites", D: rd, V: rv, V_bloqueadoEm: bloq }; save();
  }
