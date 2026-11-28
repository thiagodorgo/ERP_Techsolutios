import type { Request } from "express";

import { requireTenantContext } from "../core-saas/middleware/rbac.middleware.js";
import type { Permission } from "../core-saas/permissions/catalog.js";
import { readRouteParam } from "../core-saas/routes/http.js";
import { resolveUserNames, type UserNameResolver } from "../core-saas/users/user-name-resolver.js";
import { toWorkOrderEvidenceListDto } from "./work-order-evidence.dto.js";
import type { WorkOrderEvidenceService } from "./work-order-evidence.service.js";

export type WorkOrderEvidenceServiceResolver = () => Promise<WorkOrderEvidenceService>;

/**
 * §5.3 — a posição da evidência é dado de localização de uma pessoa, e `field_location:read` é a permissão
 * que o sistema já tem para ler posição. Ela NÃO guarda a rota (a rota é `work_orders:read`, §5.1): decide
 * apenas se o campo `position` aparece no corpo.
 */
const FIELD_LOCATION_READ: Permission = "field_location:read";

export class WorkOrderEvidenceController {
  // Ω3F-5b — `resolveUserName` opcional (composto no app.ts): `createdBy` vira `createdByName` legível.
  // Sem ele, `createdByName` sai null e a UI cai num rótulo neutro (NUNCA o UUID, §11.2).
  constructor(
    private readonly resolveService: WorkOrderEvidenceServiceResolver,
    private readonly resolveUserName?: UserNameResolver,
  ) {}

  async listEvidences(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const records = await service.listEvidences(actor, readRouteParam(request.params.workOrderId));
    const names = await resolveUserNames(this.resolveUserName, actor.tenantId, records.map((record) => record.actorUserId));
    return {
      // §5.1 — a resposta é `{ data: { items: [...] } }`.
      body: {
        data: toWorkOrderEvidenceListDto(records, {
          nameById: names,
          canReadFieldLocation: actor.permissions.includes(FIELD_LOCATION_READ),
        }),
      },
    };
  }

  async downloadEvidence(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    // §5.2 — o binário sai por stream no servidor (`sendVerifiedFile`, montado na rota), sem URL assinada.
    const file = await service.getEvidenceDownload(
      actor,
      readRouteParam(request.params.workOrderId),
      readRouteParam(request.params.evidenceId),
    );
    return { file };
  }

  private async resolveServiceWithActor(request: Request) {
    return [await this.resolveService(), requireTenantContext(request)] as const;
  }
}
