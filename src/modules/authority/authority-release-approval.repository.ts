import { randomUUID } from "node:crypto";

import type { PrismaClient } from "@prisma/client";

import { withTenantRls } from "../../database/rls.js";
import type { ImpoundRepository } from "../impound/impound.repository.js";
import { PrismaReleaseRepository } from "../release/release-prisma.repository.js";
import type { ReleaseRepository } from "../release/release.repository.js";
import { InMemoryAuthorityRemovalRepository } from "./authority-removal.repository.js";
import type {
  AuthorityReleaseApprovalRepository,
  LinkedRelease,
  PendingApproval,
  RecordApprovalInput,
  RecordRejectionInput,
} from "./authority-release-approval.types.js";

// Ω5P PR-19 — repositório da vinculação processo↔autoridade (D-08) + registro de decisão. memory×prisma pelo mesmo
// env-gate das demais fatias. A vinculação NUNCA usa authority_case_number/origin_agent_name/origin_authority
// (texto livre/neutro) — só a cadeia AuthorityRemovalRequest.credential_id → work_order_id → ImpoundProcess.
// service_order_id (a ÚNICA proveniência de um ato que a PRÓPRIA credencial praticou).

const ACTIVE_RELEASE_STATUSES = new Set(["IN_PROGRESS", "AUTHORIZED"]);

// ── InMemory (dev/test) ─────────────────────────────────────────────────────────────────────────────────────────
export class InMemoryAuthorityReleaseApprovalRepository implements AuthorityReleaseApprovalRepository {
  private readonly decisions: Array<{
    readonly id: string;
    readonly tenantId: string;
    readonly releaseId: string;
    readonly credentialId: string;
    readonly decision: "APPROVED" | "REJECTED";
    readonly reference?: string;
    readonly note?: string;
    readonly decidedAt: Date;
  }> = [];

  constructor(
    private readonly removals: InMemoryAuthorityRemovalRepository,
    private readonly impound: Pick<ImpoundRepository, "listProcesses" | "findProcessById">,
    private readonly release: Pick<ReleaseRepository, "getActiveReleaseView" | "approve">,
  ) {}

  // Só work_order_id ORIGINADOS pela PRÓPRIA credencial (D-08) — nunca "qualquer processo do tenant".
  private workOrderIdsFor(tenantId: string, credentialId: string): Set<string> {
    const ids = this.removals
      .readForTests()
      .filter((row) => row.tenantId === tenantId && row.credentialId === credentialId && row.workOrderId)
      .map((row) => row.workOrderId as string);
    return new Set(ids);
  }

  async listPendingApprovals(tenantId: string, credentialId: string): Promise<readonly PendingApproval[]> {
    const workOrderIds = this.workOrderIdsFor(tenantId, credentialId);
    if (workOrderIds.size === 0) return [];
    const { items } = await this.impound.listProcesses({ tenantId, limit: 1000, offset: 0 });
    const out: PendingApproval[] = [];
    for (const process of items) {
      if (!process.serviceOrderId || !workOrderIds.has(process.serviceOrderId)) continue;
      const view = await this.release.getActiveReleaseView(tenantId, process.id);
      if (!view || view.release.status !== "IN_PROGRESS" || view.release.authorityApprovedAt) continue;
      out.push({
        processId: process.id,
        releaseId: view.release.id,
        kind: view.release.kind,
        vehiclePlate: process.vehiclePlate,
        requestedAt: view.release.createdAt,
        pendingRequirements: view.checks.filter((check) => check.required && !check.satisfied).map((check) => check.code),
      });
    }
    return out;
  }

  async findLinkedRelease(tenantId: string, credentialId: string, processId: string): Promise<LinkedRelease | undefined> {
    const workOrderIds = this.workOrderIdsFor(tenantId, credentialId);
    if (workOrderIds.size === 0) return undefined;
    const process = await this.impound.findProcessById(tenantId, processId);
    if (!process || !process.serviceOrderId || !workOrderIds.has(process.serviceOrderId)) return undefined;
    const view = await this.release.getActiveReleaseView(tenantId, processId);
    if (!view || !ACTIVE_RELEASE_STATUSES.has(view.release.status)) return undefined;
    return { releaseId: view.release.id, alreadyApproved: view.release.authorityApprovedAt !== undefined };
  }

  async recordApproval(input: RecordApprovalInput): Promise<void> {
    this.decisions.push({
      id: randomUUID(),
      tenantId: input.tenantId,
      releaseId: input.releaseId,
      credentialId: input.credentialId,
      decision: "APPROVED",
      reference: input.reference,
      note: input.note,
      decidedAt: input.occurredAt,
    });
    // Reusa release.repository.approve() TAL-QUAL (D-09) — idempotente por natureza (2ª chamada é no-op no repo).
    await this.release.approve({
      tenantId: input.tenantId,
      releaseId: input.releaseId,
      authorityReference: input.reference,
      authorityNote: input.note,
      authorityCredentialId: input.credentialId,
    });
  }

  async recordRejection(input: RecordRejectionInput): Promise<void> {
    this.decisions.push({
      id: randomUUID(),
      tenantId: input.tenantId,
      releaseId: input.releaseId,
      credentialId: input.credentialId,
      decision: "REJECTED",
      note: input.note,
      decidedAt: input.occurredAt,
    });
    // D-10: ImpoundRelease NÃO muda — nenhuma chamada ao release.repository aqui.
  }

  readDecisionsForTests(): readonly {
    readonly id: string;
    readonly tenantId: string;
    readonly releaseId: string;
    readonly credentialId: string;
    readonly decision: "APPROVED" | "REJECTED";
    readonly reference?: string;
    readonly note?: string;
    readonly decidedAt: Date;
  }[] {
    return [...this.decisions];
  }

  reset(): void {
    this.decisions.length = 0;
  }
}

// ── Prisma (produção) ───────────────────────────────────────────────────────────────────────────────────────────
type LinkedProcessRow = { readonly process_id: string; readonly release_id: string; readonly authority_approved_at: Date | null };

export class PrismaAuthorityReleaseApprovalRepository implements AuthorityReleaseApprovalRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  async listPendingApprovals(tenantId: string, credentialId: string): Promise<readonly PendingApproval[]> {
    return withTenantRls(this.prismaClient, tenantId, async (tx) => {
      const rows = await tx.$queryRaw<
        Array<{
          process_id: string;
          release_id: string;
          kind: string;
          vehicle_plate: string | null;
          created_at: Date;
        }>
      >`
        SELECT DISTINCT ip.id AS process_id, ir.id AS release_id, ir.kind, ip.vehicle_plate, ir.created_at
        FROM impound_releases ir
        JOIN impound_processes ip ON ip.tenant_id = ir.tenant_id AND ip.id = ir.process_id
        JOIN authority_removal_requests arr
          ON arr.tenant_id = ir.tenant_id AND arr.work_order_id = ip.service_order_id AND arr.credential_id = ${credentialId}::uuid
        WHERE ir.tenant_id = ${tenantId}::uuid AND ir.status = 'IN_PROGRESS' AND ir.authority_approved_at IS NULL
        ORDER BY ir.created_at ASC
      `;
      const out: PendingApproval[] = [];
      for (const row of rows) {
        const pending = await tx.$queryRaw<Array<{ code: string }>>`
          SELECT code FROM release_requirement_checks
          WHERE tenant_id = ${tenantId}::uuid AND release_id = ${row.release_id}::uuid AND required = true AND satisfied = false
          ORDER BY code ASC
        `;
        out.push({
          processId: row.process_id,
          releaseId: row.release_id,
          kind: row.kind,
          vehiclePlate: row.vehicle_plate ?? undefined,
          requestedAt: row.created_at,
          pendingRequirements: pending.map((p) => p.code),
        });
      }
      return out;
    });
  }

  async findLinkedRelease(tenantId: string, credentialId: string, processId: string): Promise<LinkedRelease | undefined> {
    return withTenantRls(this.prismaClient, tenantId, async (tx) => {
      const rows = await tx.$queryRaw<LinkedProcessRow[]>`
        SELECT ip.id AS process_id, ir.id AS release_id, ir.authority_approved_at
        FROM impound_processes ip
        JOIN authority_removal_requests arr
          ON arr.tenant_id = ip.tenant_id AND arr.work_order_id = ip.service_order_id AND arr.credential_id = ${credentialId}::uuid
        JOIN impound_releases ir
          ON ir.tenant_id = ip.tenant_id AND ir.process_id = ip.id AND ir.status IN ('IN_PROGRESS', 'AUTHORIZED')
        WHERE ip.tenant_id = ${tenantId}::uuid AND ip.id = ${processId}::uuid
        ORDER BY ir.created_at DESC
        LIMIT 1
      `;
      const row = rows[0];
      if (!row) return undefined;
      return { releaseId: row.release_id, alreadyApproved: row.authority_approved_at !== null };
    });
  }

  // 1 TX: INSERT release_authority_decisions(APPROVED) + release.repository.approve() (PrismaReleaseRepository
  // TX-scoped, reusado tal-qual — D-09) — a MESMA tx, nunca 2 transações separadas.
  async recordApproval(input: RecordApprovalInput): Promise<void> {
    await withTenantRls(this.prismaClient, input.tenantId, async (tx) => {
      await tx.$executeRaw`
        INSERT INTO release_authority_decisions (tenant_id, release_id, credential_id, decision, reference, note, decided_at)
        VALUES (${input.tenantId}::uuid, ${input.releaseId}::uuid, ${input.credentialId}::uuid, 'APPROVED', ${input.reference ?? null}, ${input.note ?? null}, ${input.occurredAt})
      `;
      await new PrismaReleaseRepository(tx).approve({
        tenantId: input.tenantId,
        releaseId: input.releaseId,
        authorityReference: input.reference,
        authorityNote: input.note,
        authorityCredentialId: input.credentialId,
      });
    });
  }

  // 1 TX: SÓ o INSERT da decisão (D-10) — ImpoundRelease jamais tocado aqui.
  async recordRejection(input: RecordRejectionInput): Promise<void> {
    await withTenantRls(this.prismaClient, input.tenantId, async (tx) => {
      await tx.$executeRaw`
        INSERT INTO release_authority_decisions (tenant_id, release_id, credential_id, decision, note, decided_at)
        VALUES (${input.tenantId}::uuid, ${input.releaseId}::uuid, ${input.credentialId}::uuid, 'REJECTED', ${input.note}, ${input.occurredAt})
      `;
    });
  }
}

export async function createPrismaAuthorityReleaseApprovalRepository(): Promise<PrismaAuthorityReleaseApprovalRepository> {
  const { prisma } = await import("../../database/prisma.js");
  return new PrismaAuthorityReleaseApprovalRepository(prisma);
}
