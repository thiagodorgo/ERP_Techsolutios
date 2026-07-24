import type { Request } from "express";

import { requireTenantContext } from "../core-saas/middleware/rbac.middleware.js";
import type { TelemetryActorContext } from "./telemetry.types.js";
import type { TelemetryService } from "./telemetry.service.js";

export type TelemetryServiceResolver = () => Promise<TelemetryService>;

// Controller THIN. As 5 leituras (Quilometragem/Rastreamento/Recusas/Acessos/Dispositivos) devolvem só as
// views §2.8 (a coordenada crua vive SÓ no /track). Sem escrita aqui — a ingestão entra pela rota do mobile.
export class TelemetryController {
  constructor(private readonly resolveService: TelemetryServiceResolver) {}

  async km(request: Request) {
    const [service, actor] = await this.resolve(request);
    return { data: await service.getKm(actor, query(request)) };
  }

  async track(request: Request) {
    const [service, actor] = await this.resolve(request);
    return { data: await service.getTrack(actor, query(request)) };
  }

  async refusals(request: Request) {
    const [service, actor] = await this.resolve(request);
    return { data: await service.getRefusals(actor, query(request)) };
  }

  async access(request: Request) {
    const [service, actor] = await this.resolve(request);
    return { data: await service.getAccess(actor, query(request)) };
  }

  async devices(request: Request) {
    const [service, actor] = await this.resolve(request);
    return { data: await service.getDevices(actor, query(request)) };
  }

  private async resolve(request: Request): Promise<readonly [TelemetryService, TelemetryActorContext]> {
    return [await this.resolveService(), requireTenantContext(request) as TelemetryActorContext] as const;
  }
}

function query(request: Request): Record<string, unknown> {
  return (request.query ?? {}) as Record<string, unknown>;
}
