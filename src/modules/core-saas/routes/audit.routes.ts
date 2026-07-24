import { Router, type Request } from "express";

import type { AuditEvent } from "../types/core-saas.types.js";
import { requirePermission, requireTenantContext } from "../middleware/rbac.middleware.js";
import type { ICoreSaasService } from "../services/core-saas-service.interface.js";
import { handleAsyncRoute } from "./http.js";

// -----------------------------------------------------------------------------
// Ω4C PR-11 (D-Ω4C-AUD-FILTERS / D-Ω4C-AUD-ALLOWLIST-2.8) — Logs globais da organização.
// Reusa o store tenant-wide existente (getAuditEventsForTenant) e adiciona, no backend:
//  - filtros server-side (action exato, actorId exato, from/to por período);
//  - paginação (limit 1..200 default 50, offset >= 0), com nextOffset quando há mais;
//  - projeção §2.8: o DTO externo NUNCA carrega metadata (onde vivem ipAddress/userAgent), token,
//    refresh_token_hash nem corpo. Só a allowlist {id, action, actor_user_id, tenant_id, timestamp}.
// O tenant vem SEMPRE do ator autenticado (nunca X-Tenant-Id externo). 422 para filtro malformado.
// O pushdown SQL do filtro + índice (tenant_id, created_at) fica deferido a PR-11b (D-Ω4C-SESS-NOMIG):
// sob volume de teste, o prefixo tenant_id + ordenação basta.
// -----------------------------------------------------------------------------

const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 50;

type AuditEventView = {
  readonly id: string;
  readonly action: string;
  readonly actor_user_id: string;
  readonly tenant_id: string;
  readonly timestamp: Date;
};

type AuditQuery = {
  readonly action?: string;
  readonly actorId?: string;
  readonly from?: Date;
  readonly to?: Date;
  readonly limit: number;
  readonly offset: number;
};

export function createAuditRouter(service: ICoreSaasService): Router {
  const router = Router();

  router.get(
    "/",
    requirePermission("audit.read"),
    handleAsyncRoute(async (request, response) => {
      const actor = requireTenantContext(request);
      const query = parseAuditQuery(request);

      const all = await service.getAuditEventsForTenant(actor.tenantId);
      const filtered = all
        .filter((event) => matchesFilters(event, query))
        .sort((left, right) => sortMs(right.timestamp) - sortMs(left.timestamp));

      const page = filtered.slice(query.offset, query.offset + query.limit);
      const nextOffset = filtered.length > query.offset + query.limit ? query.offset + query.limit : undefined;

      response.status(200).json({
        data: page.map(toAuditEventView),
        ...(nextOffset === undefined ? {} : { nextOffset }),
      });
    }),
  );

  return router;
}

// §2.8: allowlist estrita. metadata (ipAddress/userAgent) NUNCA sai. tenant_id aqui é o do PRÓPRIO ator
// autenticado (não um X-Tenant-Id externo) e faz parte do contrato estável consumido pela tela de Auditoria.
function toAuditEventView(event: AuditEvent): AuditEventView {
  return {
    id: event.id,
    action: event.action,
    actor_user_id: event.actor_user_id,
    tenant_id: event.tenant_id,
    timestamp: event.timestamp,
  };
}

function matchesFilters(event: AuditEvent, query: AuditQuery): boolean {
  if (query.action && event.action !== query.action) {
    return false;
  }

  if (query.actorId && event.actor_user_id !== query.actorId) {
    return false;
  }

  const at = sortMs(event.timestamp);

  if (query.from && at < query.from.getTime()) {
    return false;
  }

  if (query.to && at > query.to.getTime()) {
    return false;
  }

  return true;
}

function parseAuditQuery(request: Request): AuditQuery {
  return {
    action: readOptionalString(request.query.action),
    actorId: readOptionalString(request.query.actorId),
    from: readOptionalDate(request.query.from, "from"),
    to: readOptionalDate(request.query.to, "to"),
    limit: readLimit(request.query.limit),
    offset: readOffset(request.query.offset),
  };
}

function readOptionalString(value: unknown): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;

  if (typeof raw !== "string") {
    return undefined;
  }

  const trimmed = raw.trim();

  return trimmed.length > 0 ? trimmed : undefined;
}

function readOptionalDate(value: unknown, field: string): Date | undefined {
  const raw = Array.isArray(value) ? value[0] : value;

  if (raw === undefined || raw === null || raw === "") {
    return undefined;
  }

  if (typeof raw !== "string") {
    throw unprocessable(field, `${field} must be an ISO-8601 date.`);
  }

  const parsed = new Date(raw);

  if (Number.isNaN(parsed.getTime())) {
    throw unprocessable(field, `${field} must be an ISO-8601 date.`);
  }

  return parsed;
}

function readLimit(value: unknown): number {
  const raw = Array.isArray(value) ? value[0] : value;

  if (raw === undefined || raw === null || raw === "") {
    return DEFAULT_LIMIT;
  }

  const parsed = Number(raw);

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_LIMIT) {
    throw unprocessable("limit", `limit must be an integer between 1 and ${MAX_LIMIT}.`);
  }

  return parsed;
}

function readOffset(value: unknown): number {
  const raw = Array.isArray(value) ? value[0] : value;

  if (raw === undefined || raw === null || raw === "") {
    return 0;
  }

  const parsed = Number(raw);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw unprocessable("offset", "offset must be a non-negative integer.");
  }

  return parsed;
}

function sortMs(value: Date | string | undefined): number {
  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === "string") {
    const parsed = new Date(value);

    return Number.isNaN(parsed.getTime()) ? Number.NEGATIVE_INFINITY : parsed.getTime();
  }

  return Number.NEGATIVE_INFINITY;
}

function unprocessable(field: string, message: string) {
  return {
    statusCode: 422,
    code: "UNPROCESSABLE_ENTITY",
    reason: `invalid_${field}`,
    message,
  };
}
