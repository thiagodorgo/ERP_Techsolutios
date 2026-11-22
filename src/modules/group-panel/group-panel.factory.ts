// B-GRUPO-GESTOR (1a, F1 e F2) — a composição do serviço do Painel.
//
// Memória: `createMemoryGroupPanelReaders` (F1). Prisma: `createPrismaGroupPanelReaders` (F2), cada leitura no contexto de
// RLS da própria organização, sobre o cliente do app (o papel de runtime sem `BYPASSRLS`). O import é preguiçoso: o modo
// memória não abre o Prisma. Nunca há atalho sem RLS: sem a composição Prisma, o pedido falha.

import { env } from "../../config/env.js";
import type { ICoreSaasService } from "../core-saas/services/core-saas-service.interface.js";
import { CoreSaasError } from "../core-saas/types/core-saas.types.js";
import type { GroupPanelServiceResolver } from "./group-panel.controller.js";
import { createMemoryGroupPanelReaders } from "./group-panel.readers.js";
import { GroupPanelService } from "./group-panel.service.js";

/** Reservado para a composição que não puder ser montada (falha fechada). */
export class GroupPanelUnavailableError extends CoreSaasError {
  constructor() {
    super(503, "SERVICE_UNAVAILABLE", "group_panel_unavailable", "O Painel do grupo não está disponível agora.");
    this.name = "GroupPanelUnavailableError";
  }
}

export function createMemoryGroupPanelService(core: ICoreSaasService, clock?: () => Date): GroupPanelService {
  return new GroupPanelService(createMemoryGroupPanelReaders(core), clock);
}

/** F2: a composição Prisma, sobre o cliente do app (`src/database/prisma.ts`). */
export async function createPrismaGroupPanelService(core: ICoreSaasService, clock?: () => Date): Promise<GroupPanelService> {
  const [{ prisma }, { createPrismaGroupPanelReaders }] = await Promise.all([
    import("../../database/prisma.js"),
    import("./group-panel.prisma.js"),
  ]);
  return new GroupPanelService(createPrismaGroupPanelReaders(prisma, core), clock);
}

export function createDefaultGroupPanelServiceResolver(core: ICoreSaasService): GroupPanelServiceResolver {
  return async () => {
    if (env.CORE_SAAS_PERSISTENCE !== "prisma") return createMemoryGroupPanelService(core);
    return createPrismaGroupPanelService(core);
  };
}
