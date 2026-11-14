// B-ASS-09 · F6 — R4 a R10, o grupo econômico (`/api/v1/platform/billing/economic-groups`), sob `requirePlatformPermission`.
// A regra é do `EconomicGroupsService` (F5b, sobre as regras da F2a); a rota só lê a entrada, chama e traduz. Criar,
// renomear e excluir grupo gravam a trilha de plataforma; entrar e sair gravam a trilha da organização dentro da troca
// (o serviço recebe o montador pela fábrica). Tudo pela allowlist (§4.3): o nome do grupo nunca entra.

import { Router, type Request } from "express";

import { resolveRequestActor } from "../../auth/middleware/authenticated-actor.middleware.js";
import { handleAsyncRoute, readRouteParam } from "../../core-saas/routes/http.js";
import { requirePlatformPermission } from "../../platform/platform-permissions.js";
import { createDefaultOverviewRuntime } from "../overview/overview.factory.js";
import { trailMetadata } from "../overview/overview.trail.js";
import { SubscriptionBillingError } from "../plans/plan-types.js";
import type { PlatformAuditWriter } from "../plans/platform-audit.js";
import type { GroupDetail, GroupMemberView, GroupView } from "./economic-groups.service.js";

export function createEconomicGroupsPlatformRouter(): Router {
  const router = Router();

  router.get("/economic-groups", requirePlatformPermission("platform:billing:read"), handleAsyncRoute(async (_request, response) => {
    const runtime = await createDefaultOverviewRuntime();
    response.status(200).json({ data: (await runtime.groups.listGroups()).map(groupDto) });
  }));

  router.post("/economic-groups", requirePlatformPermission("platform:billing:manage"), handleAsyncRoute(async (request, response) => {
    const runtime = await createDefaultOverviewRuntime();
    const body = bodyOf(request);
    const actorId = actorOf(request);
    const group = await runtime.groups.createGroup({ name: textOf(body.name), notes: notesOf(body.notes), actorId });
    await recordGroupTrail(runtime.platformAudit, "economic_group.created", group, actorId);
    response.status(201).json({ data: groupDto(group) });
  }));

  router.get("/economic-groups/:groupId", requirePlatformPermission("platform:billing:read"), handleAsyncRoute(async (request, response) => {
    const runtime = await createDefaultOverviewRuntime();
    response.status(200).json({ data: detailDto(await runtime.groups.getGroup(readRouteParam(request.params.groupId))) });
  }));

  router.patch("/economic-groups/:groupId", requirePlatformPermission("platform:billing:manage"), handleAsyncRoute(async (request, response) => {
    const runtime = await createDefaultOverviewRuntime();
    const body = bodyOf(request);
    const actorId = actorOf(request);
    const group = await runtime.groups.patchGroup(readRouteParam(request.params.groupId), {
      ...(body.name === undefined ? {} : { name: textOf(body.name) }),
      ...(body.notes === undefined ? {} : { notes: notesOf(body.notes) }),
      actorId,
    });
    await recordGroupTrail(runtime.platformAudit, "economic_group.updated", group, actorId);
    response.status(200).json({ data: groupDto(group) });
  }));

  router.delete("/economic-groups/:groupId", requirePlatformPermission("platform:billing:manage"), handleAsyncRoute(async (request, response) => {
    const runtime = await createDefaultOverviewRuntime();
    const actorId = actorOf(request);
    const group = await runtime.groups.deleteGroup(readRouteParam(request.params.groupId), actorId);
    await recordGroupTrail(runtime.platformAudit, "economic_group.deleted", group, actorId);
    response.status(200).json({ data: groupDto(group) });
  }));

  router.put("/economic-groups/:groupId/members", requirePlatformPermission("platform:billing:manage"), handleAsyncRoute(async (request, response) => {
    const runtime = await createDefaultOverviewRuntime();
    const body = bodyOf(request);
    if (!Array.isArray(body.tenantIds) || !body.tenantIds.every((id) => typeof id === "string")) {
      throw new SubscriptionBillingError(400, "SUBSCRIPTION_BILLING_INVALID", "invalid_tenant_ids", "tenantIds é uma lista de ids de organização.");
    }
    const detail = await runtime.groups.putMembers(readRouteParam(request.params.groupId), {
      tenantIds: body.tenantIds as string[],
      ...(body.validFrom === undefined ? {} : { validFrom: body.validFrom as string }),
      actorId: actorOf(request),
    });
    response.status(200).json({ data: detailDto(detail) });
  }));

  router.get("/economic-groups/:groupId/history", requirePlatformPermission("platform:billing:read"), handleAsyncRoute(async (request, response) => {
    const runtime = await createDefaultOverviewRuntime();
    response.status(200).json({ data: (await runtime.groups.history(readRouteParam(request.params.groupId))).map(memberDto) });
  }));

  return router;
}

/** A trilha de plataforma do grupo: o contexto inteiro vai à allowlist, que só deixa o id do grupo e o ator. */
async function recordGroupTrail(writer: PlatformAuditWriter, action: string, group: GroupView, actorId: string | null): Promise<void> {
  await writer.record({
    action,
    entity: "economic_group",
    entityId: group.id,
    metadata: trailMetadata({ actor_user_id: actorId, group_id: group.id, name: group.name, notes: group.notes }),
  });
}

function groupDto(group: GroupView) {
  return {
    id: group.id,
    name: group.name,
    notes: group.notes,
    memberCount: group.memberCount,
    createdAt: group.createdAt.toISOString(),
    updatedAt: group.updatedAt.toISOString(),
  };
}

function memberDto(member: GroupMemberView) {
  return {
    tenantId: member.tenantId,
    tenantName: member.tenantName,
    validFrom: member.validFrom,
    validTo: member.validTo,
    scheduled: member.scheduled,
  };
}

function detailDto(detail: GroupDetail) {
  return { ...groupDto(detail), members: detail.members.map(memberDto) };
}

function bodyOf(request: Request): Record<string, unknown> {
  return request.body && typeof request.body === "object" && !Array.isArray(request.body) ? (request.body as Record<string, unknown>) : {};
}

function textOf(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function notesOf(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

/** O ator do pedido (token, ou os cabeçalhos do modo de desenvolvimento), como o resto da casa. */
function actorOf(request: Request): string | null {
  return resolveRequestActor(request)?.userId ?? null;
}
