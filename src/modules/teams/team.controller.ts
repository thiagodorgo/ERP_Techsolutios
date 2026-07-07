import type { Request } from "express";

import { recordRequestAuditBestEffort } from "../core-saas/audit/audit-request-context.js";
import { requireTenantContext } from "../core-saas/middleware/rbac.middleware.js";
import { readRouteParam } from "../core-saas/routes/http.js";
import { toTeamDto, toTeamListDto, toTeamMemberDto } from "./team.dto.js";
import type { TeamService } from "./team.service.js";

export type TeamServiceResolver = () => Promise<TeamService>;

export class TeamController {
  constructor(private readonly resolveService: TeamServiceResolver) {}

  async list(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const result = await service.list(actor, request.query as Record<string, unknown>);

    return {
      body: toTeamListDto(result),
    };
  }

  async create(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const team = await service.create(actor, request.body ?? {});

    await recordRequestAuditBestEffort(request, {
      action: "team.created",
      resourceType: "team",
      resourceId: team.id,
      outcome: "success",
      severity: "info",
      metadata: {
        name: team.name,
      },
    });

    return {
      status: 201,
      data: toTeamDto(team),
    };
  }

  async get(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const team = await service.get(actor, readRouteParam(request.params.teamId));

    return {
      data: toTeamDto(team),
    };
  }

  async update(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const body = (request.body ?? {}) as Record<string, unknown>;
    const team = await service.update(actor, readRouteParam(request.params.teamId), body);

    const deactivating = body.is_active === false || body.isActive === false;

    await recordRequestAuditBestEffort(request, {
      action: deactivating ? "team.deactivated" : "team.updated",
      resourceType: "team",
      resourceId: team.id,
      outcome: "success",
      severity: "info",
      metadata: deactivating
        ? {
            name: team.name,
            isActive: team.isActive,
          }
        : {
            name: team.name,
          },
    });

    return {
      data: toTeamDto(team),
    };
  }

  async addMember(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const teamId = readRouteParam(request.params.teamId);
    const member = await service.addMember(actor, teamId, request.body ?? {});

    await recordRequestAuditBestEffort(request, {
      action: "team.member_added",
      resourceType: "team",
      resourceId: teamId,
      outcome: "success",
      severity: "info",
      metadata: {
        userId: member.userId,
      },
    });

    return {
      status: 201,
      data: toTeamMemberDto(member),
    };
  }

  async removeMember(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const teamId = readRouteParam(request.params.teamId);
    const userId = readRouteParam(request.params.userId);
    await service.removeMember(actor, teamId, userId);

    await recordRequestAuditBestEffort(request, {
      action: "team.member_removed",
      resourceType: "team",
      resourceId: teamId,
      outcome: "success",
      severity: "info",
      metadata: {
        userId,
      },
    });

    return {
      status: 200,
      data: { removed: true },
    };
  }

  private async resolveServiceWithActor(request: Request) {
    return [await this.resolveService(), requireTenantContext(request)] as const;
  }
}
