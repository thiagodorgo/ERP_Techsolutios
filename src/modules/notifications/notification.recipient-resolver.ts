import type { DomainEventEnvelope } from "../../infra/events/domain-event.types.js";
import type { Permission, Role } from "../core-saas/permissions/catalog.js";
import type { NotificationRepository } from "./notification.repository.js";
import type { NotificationRecipientCandidate } from "./notification.types.js";

export class NotificationRecipientResolver {
  constructor(private readonly repository: Pick<NotificationRepository, "listRecipientCandidates">) {}

  async resolve(event: DomainEventEnvelope): Promise<readonly string[]> {
    if (!event.tenantId) return [];

    const candidates = (await this.repository.listRecipientCandidates(event.tenantId))
      .filter((candidate) => candidate.status === "active")
      .filter((candidate) => candidate.userId !== event.actorId);
    const selected = candidates.filter((candidate) => shouldReceive(event.name, candidate));

    return [...new Set(selected.map((candidate) => candidate.userId))].slice(0, 20);
  }
}

function shouldReceive(eventName: string, candidate: NotificationRecipientCandidate): boolean {
  if (eventName === "checklist_run.completed") {
    return hasPermission(candidate, "checklist_runs:read") || hasAnyRole(candidate, ["super_admin", "tenant_admin", "manager"]);
  }

  if (eventName === "checklist_run.divergence_reported") {
    return hasAnyRole(candidate, ["super_admin", "tenant_admin", "manager"]) || hasPermission(candidate, "audit.read");
  }

  if (eventName === "checklist_run.acknowledgement_created") {
    return hasAnyRole(candidate, ["super_admin", "tenant_admin", "manager"]);
  }

  return false;
}

function hasPermission(candidate: NotificationRecipientCandidate, permission: Permission): boolean {
  return candidate.permissions.includes(permission);
}

function hasAnyRole(candidate: NotificationRecipientCandidate, roles: readonly Role[]): boolean {
  return roles.some((role) => candidate.roles.includes(role));
}
