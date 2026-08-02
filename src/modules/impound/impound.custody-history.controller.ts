import type { Request } from "express";

import { requireTenantContext } from "../core-saas/middleware/rbac.middleware.js";
import { readRouteParam } from "../core-saas/routes/http.js";
import { toCustodyHistoryListDto } from "./impound.custody-history.dto.js";
import type { ImpoundCustodyHistoryService } from "./impound.custody-history.service.js";

export type ImpoundCustodyHistoryServiceResolver = () => Promise<ImpoundCustodyHistoryService>;

export class ImpoundCustodyHistoryController {
  constructor(private readonly resolveService: ImpoundCustodyHistoryServiceResolver) {}

  async listCustodyHistory(request: Request) {
    const service = await this.resolveService();
    const actor = requireTenantContext(request);
    const items = await service.listCustodyHistory(actor, readRouteParam(request.params.processId));
    return { body: toCustodyHistoryListDto(items) };
  }
}
