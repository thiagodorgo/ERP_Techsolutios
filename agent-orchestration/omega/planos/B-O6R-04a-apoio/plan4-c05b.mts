async function removeExitV3(client: any, t: string, sourceType: string, sourceId: string) {
  try {
    return await withTenantRls(client, t, async (tx: any) => {
      const inv = new invMod.PrismaInventoryRepository(tx) as any;
      const exit = await inv.findExitBySource(t, sourceType, sourceId);
      if (!exit) return "undefined";
      await tx.$queryRawUnsafe(LOCK_ITEM, t, exit.itemId);
      if (await inv.hasReversalOf(t, [exit.id])) return "undefined";
      const m = await inv.insertMovement({ tenantId: t, itemId: exit.itemId, type: exit.type, quantidadeSinalizada: -exit.quantidadeSinalizada, custody: { custodyType: "base" }, reversesMovementId: exit.id });
      return { compensou: m.id };
    });
  } catch (e: any) {
    if (e?.code === "P2002") return "undefined (P2002 fora da tx)";
    throw e;
  }
}
