  const fin: any = await withTenantRls(client, t, async (tx: any) => {
    const srow: any[] = await tx.$queryRawUnsafe(SESS_FU, t, s);
    if (srow[0]?.status !== "fechando") return { status: "not_open", current: srow[0]?.status };
    const left: any[] = await tx.$queryRawUnsafe(PENDING, t, s);
    if (left[0].n > 0) return { status: "pending", remaining: left[0].n };
    const total = kind === "v3" ? Number(((await tx.$queryRawUnsafe(TOTAL, t, s)) as any[])[0].total) : totalV2;
    const r = await tx.cycleCount.updateMany({ where: { tenant_id: t, id: s, status: "fechando" }, data: { status: "concluida" } });
    return r.count === 1 ? { status: "ok", total } : { status: "not_open", current: "?" };
  });
  if (fin.status === "not_open") throw cycleCountNotOpen(fin.current);
  if (fin.status === "pending") throw err(409, "close_incomplete");
  return { status: "concluida", beginStatus: begin.status, totalVarianceValue: roundToDecimalPrecision(fin.total), applied, skipped, reused };
}
const closeV2 = (c: any, t: string, s: string, u: string, h: Hooks = {}) => closeV("v2", c, t, s, u, h);
const closeV3 = (c: any, t: string, s: string, u: string, h: Hooks = {}) => closeV("v3", c, t, s, u, h);
// v2: recordEntry so em aberta; cancel CAS status=aberta
async function recordEntryV2(client: any, t: string, s: string, entryId: string, counted: number) {
  return withTenantRls(client, t, async (tx: any) => {
    const rows: any[] = await tx.$queryRawUnsafe(SESS_FS, t, s);
    if (!rows[0]) return { status: "not_found" };
    if (rows[0].status !== "aberta") return { status: "not_open", current: rows[0].status };
    const u = await tx.cycleCountEntry.updateManyAndReturn({ where: { tenant_id: t, id: entryId, cycle_count_id: s }, data: { counted_quantity: counted } });
    return u[0] ? { status: "ok" } : { status: "not_found" };
  });
}
async function cancelV2(client: any, t: string, s: string) {
  return withTenantRls(client, t, async (tx: any) => {
    const u = await tx.cycleCount.updateManyAndReturn({ where: { tenant_id: t, id: s, status: "aberta" }, data: { status: "cancelada", is_active: false } });
    if (u[0]) return { status: "ok" };
    const r = await tx.cycleCount.findFirst({ where: { tenant_id: t, id: s } });
    return r ? { status: "not_open", current: r.status } : { status: "not_found" };
  });
}
// v3: recordEntry — aberta: como hoje; fechando: SO entry NAO carimbada (predicado na propria linha, sob FOR SHARE da sessao)
async function recordEntryV3(client: any, t: string, s: string, entryId: string, counted: number, holdMs = 0) {
  return withTenantRls(client, t, async (tx: any) => {
    const rows: any[] = await tx.$queryRawUnsafe(SESS_FS, t, s);
    if (!rows[0]) return { status: "not_found" };
    if (rows[0].status !== "aberta" && rows[0].status !== "fechando") return { status: "not_open", current: rows[0].status };
    if (holdMs) await sleep(holdMs);
    const u = await tx.cycleCountEntry.updateManyAndReturn({ where: { tenant_id: t, id: entryId, cycle_count_id: s, ...(rows[0].status === "fechando" ? { adjustment_movement_id: null } : {}) }, data: { counted_quantity: counted } });
    if (u[0]) return { status: "ok", phase: rows[0].status };
    const ex = await tx.cycleCountEntry.findFirst({ where: { tenant_id: t, id: entryId, cycle_count_id: s } });
    return ex ? { status: "entry_adjusted" } : { status: "not_found" };
  });
}
