// B-GRUPO-GESTOR (1a, F1) — a composição do serviço do Painel.
//
// Memória: `createMemoryGroupPanelReaders` (esta fatia). Prisma: a composição é da fatia F2; até ela entrar, o modo
// Prisma responde 503 `group_panel_unavailable` e não lê nada (falha fechada, nunca um atalho sem RLS).

import { env } from "../../config/env.js";
import type { ICoreSaasService } from "../core-saas/services/core-saas-service.interface.js";
import { CoreSaasError } from "../core-saas/types/core-saas.types.js";
import type { GroupPanelServiceResolver } from "./group-panel.controller.js";
import { createMemoryGroupPanelReaders } from "./group-panel.readers.js";
import { GroupPanelService } from "./group-panel.service.js";

export class GroupPanelUnavailableError extends CoreSaasError {
  constructor() {
    super(503, "SERVICE_UNAVAILABLE", "group_panel_unavailable", "O Painel do grupo não está disponível agora.");
    this.name = "GroupPanelUnavailableError";
  }
}

export function createMemoryGroupPanelService(core: ICoreSaasService, clock?: () => Date): GroupPanelService {
  return new GroupPanelService(createMemoryGroupPanelReaders(core), clock);
}

export function createDefaultGroupPanelServiceResolver(core: ICoreSaasService): GroupPanelServiceResolver {
  return async () => {
    if (env.CORE_SAAS_PERSISTENCE !== "prisma") return createMemoryGroupPanelService(core);
    // F2: aqui entra a composição Prisma (cada leitura em `withTenantRls` da própria organização).
    throw new GroupPanelUnavailableError();
  };
}
