import type { Request } from "express";

import { env } from "../../../config/env.js";
import { EnterpriseAuditLogService } from "./audit-log.service.js";
import type { EnterpriseAuditLogInput } from "./audit-log.types.js";

export type AuditRequestContext = {
  readonly tenantId?: string;
  readonly actorId?: string;
  readonly actorEmail?: string;
  readonly requestId?: string;
  readonly correlationId?: string;
  readonly ipAddress?: string;
  readonly userAgent?: string;
};

export function extractAuditRequestContext(request: Request): AuditRequestContext {
  const tenantContext = request.tenantContext;
  const actor = request.actor;

  return {
    tenantId: tenantContext?.tenantId ?? actor?.tenantId,
    actorId: tenantContext?.userId ?? actor?.userId,
    actorEmail: actor?.email,
    requestId: readRequestId(request),
    correlationId: readHeader(request, "x-correlation-id") ?? readRequestId(request),
    ipAddress: request.ip,
    userAgent: readHeader(request, "user-agent"),
  };
}

export async function recordRequestAuditBestEffort(
  request: Request,
  input: Omit<EnterpriseAuditLogInput, "tenantId" | "actorId" | "actorEmail" | "requestId" | "correlationId" | "ipAddress" | "userAgent"> & {
    readonly tenantId?: string;
    readonly actorId?: string;
  },
): Promise<void> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    return;
  }

  const context = extractAuditRequestContext(request);
  const tenantId = input.tenantId ?? context.tenantId;

  if (!tenantId) {
    return;
  }

  try {
    const [{ prisma }, { withTenantRls }, { AuditLogRepository }] = await Promise.all([
      import("../../../database/prisma.js"),
      import("../../../database/rls.js"),
      import("../repositories/audit-log.repository.js"),
    ]);

    await withTenantRls(prisma, tenantId, async (tx) => {
      await new EnterpriseAuditLogService(new AuditLogRepository(tx)).record({
        ...input,
        tenantId,
        actorId: input.actorId ?? context.actorId,
        actorEmail: context.actorEmail,
        requestId: context.requestId,
        correlationId: context.correlationId,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      });
    });
  } catch (error) {
    request.log?.warn(
      {
        action: input.action,
        tenantId,
        error: error instanceof Error ? error.message : "Unknown audit error.",
      },
      "Audit log could not be recorded.",
    );
  }
}

function readHeader(request: Request, name: string): string | undefined {
  return request.header(name)?.trim() || undefined;
}

function readRequestId(request: Request): string | undefined {
  const candidate = (request as Request & { id?: unknown }).id;

  return typeof candidate === "string" ? candidate : readHeader(request, "x-request-id");
}
