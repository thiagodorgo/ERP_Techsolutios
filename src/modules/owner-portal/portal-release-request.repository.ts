import { randomUUID } from "node:crypto";

import type { PrismaClient } from "@prisma/client";

import { withTenantRls } from "../../database/rls.js";
import type {
  CreatePortalReleaseRequestInput,
  CreatePortalReleaseRequestResult,
  PortalReleaseRequestRepository,
  PortalReleaseRequestStatus,
} from "./portal-release-request.types.js";

// Ω5P PR-17 — repositório do PortalReleaseRequest (memory×prisma pelo mesmo env-gate das demais fatias).

const OPEN_STATUSES: ReadonlySet<PortalReleaseRequestStatus> = new Set(["PENDING", "IN_REVIEW"]);

type Row = {
  readonly id: string;
  readonly tenantId: string;
  readonly processId: string;
  readonly status: PortalReleaseRequestStatus;
  readonly note?: string;
  readonly origin: "PORTAL_OWNER";
  readonly sessionRef?: string;
  readonly requestedAt: Date;
};

// InMemory (dev/test): espelha a partial-unique (1 aberto por processo) checando a coleção — sem corrida em
// processo único de teste. Guarda só para leitura de teste (a superfície pública nunca lê esta tabela).
export class InMemoryPortalReleaseRequestRepository implements PortalReleaseRequestRepository {
  private readonly rows: Row[] = [];

  async createIfNoneOpen(input: CreatePortalReleaseRequestInput): Promise<CreatePortalReleaseRequestResult> {
    const hasOpen = this.rows.some(
      (row) => row.tenantId === input.tenantId && row.processId === input.processId && OPEN_STATUSES.has(row.status),
    );
    if (hasOpen) return { created: false };
    this.rows.push({
      id: randomUUID(),
      tenantId: input.tenantId,
      processId: input.processId,
      status: "PENDING",
      note: input.note,
      origin: "PORTAL_OWNER",
      sessionRef: input.sessionRef,
      requestedAt: input.requestedAt,
    });
    return { created: true };
  }

  readForTests(): readonly Row[] {
    return [...this.rows];
  }

  reset(): void {
    this.rows.length = 0;
  }
}

function isOpenRequestUniqueViolation(error: unknown): boolean {
  const text = error instanceof Error ? `${error.message}` : String(error);
  return text.includes("portal_release_requests_open_key") || text.includes("23505");
}

// Prisma: INSERT sob withTenantRls (o portal só escreve/lê sob o tenant vinculado — RLS FORCE). A partial-unique
// (tenant,process) WHERE status IN (PENDING,IN_REVIEW) é a barreira ATÔMICA anti-spam: a 2ª intenção concorrente
// bate 23505 → created:false (a tx aborta e rola back; nada é escrito). RAW insert (a partial-unique é raw-only).
export class PrismaPortalReleaseRequestRepository implements PortalReleaseRequestRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  async createIfNoneOpen(input: CreatePortalReleaseRequestInput): Promise<CreatePortalReleaseRequestResult> {
    try {
      await withTenantRls(this.prismaClient, input.tenantId, (tx) =>
        tx.$executeRaw`
          INSERT INTO portal_release_requests (tenant_id, process_id, status, note, origin, session_ref, requested_at)
          VALUES (
            ${input.tenantId}::uuid,
            ${input.processId}::uuid,
            'PENDING',
            ${input.note ?? null},
            'PORTAL_OWNER',
            ${input.sessionRef ?? null},
            ${input.requestedAt}
          )
        `,
      );
      return { created: true };
    } catch (error) {
      if (isOpenRequestUniqueViolation(error)) return { created: false };
      throw error;
    }
  }
}

export async function createPrismaPortalReleaseRequestRepository(): Promise<PrismaPortalReleaseRequestRepository> {
  const { prisma } = await import("../../database/prisma.js");
  return new PrismaPortalReleaseRequestRepository(prisma);
}
