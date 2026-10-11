  // T-02: C7/C8 com escritor que NAO segura o lock do item (SQL cru, item_id de OUTRO item, nao commitado) — o unico jeito de alcancar o 23505
  if (want("C78")) {
    const IDX = `CREATE UNIQUE INDEX plan4_rev_key ON stock_movements (tenant_id, reverses_movement_id) WHERE reverses_movement_id IS NOT NULL`;
    for (const kind of ["v3", "headbase"] as const) {
      if (kind === "v3") await admin.$executeRawUnsafe(IDX);
      for (const via of ["C7", "C8"] as const) {
        const t = await newTenant(via + "-" + kind); const X = await newItem(t, { base: 10 }); const Z = await newItem(t, { base: 10 });
        const sid = randomUUID();
        const m = via === "C7" ? await mov(t, X, "saida", -3) : await mov(t, X, "saida", -3, { sourceType: "fuel_log", sourceId: sid });
        let rel!: () => void; const gate = new Promise<void>((r) => (rel = r));
        const ph = admin.$transaction(async (tx: any) => { await tx.$executeRawUnsafe(`INSERT INTO stock_movements (tenant_id,item_id,type,quantidade_sinalizada,custody_type,reverses_movement_id) VALUES ($1::uuid,$2::uuid,$3,3,$4,$5::uuid)`, t, Z, "saida", "base", m); await gate; }, { timeout: 30000 });
        await sleep(200); const tb = Date.now();
        const repo = new invMod.RlsPrismaInventoryRepository(roleB.client);
        const pb = (via === "C7"
          ? (kind === "headbase" ? repo.reverseMovement({ tenantId: t, movementId: m }) : reverseV3(roleB.client, t, m))
          : (kind === "headbase" ? repo.removeExitForSource({ tenantId: t, sourceType: "fuel_log", sourceId: sid }).then((r: any) => r === undefined ? "undefined" : { compensou: r.id }) : removeExitV3(roleB.client, t, "fuel_log", sid)))
          .then((v: any) => ({ ok: v, ms: Date.now() - tb }), (e: any) => ({ err: errInfo(e), ms: Date.now() - tb }));
        const bloqueadoEm = await waitBlocked("plan4-B", 1500);
        await sleep(300); rel(); await ph; const rb = await pb;
        const n = ((await admin.$queryRawUnsafe(`SELECT count(*)::int n FROM stock_movements WHERE reverses_movement_id=$1::uuid`, m)) as any[])[0].n;
        R[via + "_" + kind] = { forma: "compensacao de m por SQL cru com item_id=Z (escritor sem o lock de X), NAO commitada; B = " + via + " " + kind + "; commit do cru durante o INSERT de B", B: rb, B_bloqueadoEm: bloqueadoEm, compensacoesDepois: n }; save();
      }
      if (kind === "v3") await admin.$executeRawUnsafe(`DROP INDEX plan4_rev_key`);
    }
  }
  // T-03 / A-03: unidade v3 segurando X DENTRO da tx (gancho beforeUnitCommit) x open() real / recalculateAbc() real; controle v1 -> 40P01
  if (want("LO")) {
    for (const kind of ["open", "abc"] as const) for (const design of ["v3", "v1ctrl"] as const) {
      const t = await newTenant("lo-" + kind + "-" + design); const [lo, hi] = [randomUUID(), randomUUID()].sort();
      const X = await newItem(t, { id: lo, base: 100 }); await sleep(20); const Y = await newItem(t, { id: hi, base: 100 });
      if (kind === "abc") { await mov(t, X, "saida", -1, { unitCost: 1 }); await mov(t, Y, "saida", -50, { unitCost: 1 }); }
      const { s } = await newSession(t, [{ item: X, system: 100, counted: 99 }, { item: Y, system: 100, counted: 99 }]);
      const v1 = () => withTenantRls(roleA.client, t, async (tx: any) => { await tx.$queryRawUnsafe(SESS_FU, t, s); await tx.$queryRawUnsafe(LOCK_ITEM, t, X); await sleep(1500); await tx.$queryRawUnsafe(LOCK_ITEM, t, Y); return "A-ok"; });
      const pa = (design === "v3" ? closeV3(roleA.client, t, s, randomUUID(), { beforeUnitCommitMs: (id) => (id === X ? 1500 : 0) }) : v1()).then((v: any) => ({ ok: v?.status ?? v }), (e) => ({ err: errInfo(e) }));
      await sleep(300);
      const pb = (kind === "open" ? svcOf(roleB.client).open(actor(t), {}).then((v: any) => "entries=" + v.entries.length) : invSvcOf(roleB.client).recalculateAbc(actor(t)).then((v: any) => JSON.stringify(v.summary))).then((v: any) => ({ ok: v }), (e: any) => ({ err: errInfo(e) }));
      const bloqueadoEm = await waitBlocked("plan4-B", 1200);
      const [ra, rb] = await Promise.all([pa, pb]);
      R["LO_" + kind + "_" + design] = { A: ra, B: rb, B_bloqueadoEm: bloqueadoEm, deadlock: /40P01/.test(JSON.stringify([ra, rb])), final: design === "v3" ? await state(t, s) : undefined }; save();
    }
  }
