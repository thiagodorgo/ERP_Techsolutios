import { randomUUID } from "node:crypto";

import type { PrismaClient } from "@prisma/client";

import { withTenantRls } from "../../database/rls.js";
import {
  originateSystemRemovalWorkOrder,
  type InMemoryWorkOrderRepository,
} from "../work-orders/work-order.repository.js";
import { PrismaWorkOrderRepository } from "../work-orders/work-order-prisma.repository.js";
import type {
  AuthorityConsumptionContext,
  AuthorityRemovalConsumptionPort,
  AuthorityRemovalRepository,
  AuthorityRemovalStatus,
  CreateAuthorityRemovalInput,
  CreateAuthorityRemovalResult,
} from "./authority-removal.types.js";

// Ω5P PR-18b — repositório da AuthorityRemovalRequest (memory×prisma pelo mesmo env-gate das demais fatias) + porta
// de CONSUMO estreita. A escrita é ATÔMICA: INSERT da solicitação (OPEN) + (catálogo resolvido → origina a
// WorkOrder(open) SISTEMA na MESMA tx + UPDATE work_order_id). A partial-unique (tenant, plate) WHERE status='OPEN'
// é a barreira anti-spam: a 2ª solicitação ABERTA da mesma placa bate 23505 → created:false (tx aborta, NADA extra).

// ── porta de CONSUMO (resolve credencial + catálogo de remoção do tenant, sob RLS) ──────────────────────────────

// Resolve o catálogo de remoção do tenant (D-Ω5P-AUTH-06, fail-closed): o ÚNICO service_catalog ATIVO com
// custody_profile_id IS NOT NULL. `null` quando há 0 ou ≥2 — NUNCA se chuta um catálogo (jurisdição/tarifa erradas).
export type RemovalCatalogResolver = (tenantId: string) => Promise<string | null>;

// Porta de leitura da credencial que o consumo precisa (subset — NUNCA o repo cheio de provisionamento).
export interface AuthorityCredentialConsumptionReader {
  findById(tenantId: string, id: string): Promise<{ readonly status: string; readonly authorityName: string } | undefined>;
}

// Adapter genérico (memory×prisma): a leitura da credencial vem de um reader estreito; o catálogo, de um resolver
// injetado. No Prisma ambos correm sob RLS. Em memory/dev o resolver default é fail-closed (null ⇒ enfileira).
export class AuthorityRemovalConsumptionAdapter implements AuthorityRemovalConsumptionPort {
  constructor(
    private readonly credentials: AuthorityCredentialConsumptionReader,
    private readonly resolveCatalog: RemovalCatalogResolver,
  ) {}

  async findConsumptionContext(tenantId: string, credentialId: string): Promise<AuthorityConsumptionContext | undefined> {
    const credential = await this.credentials.findById(tenantId, credentialId);
    if (!credential) return undefined;
    const removalServiceCatalogId = await this.resolveCatalog(tenantId);
    return { status: credential.status, authorityName: credential.authorityName, removalServiceCatalogId };
  }
}

// Resolver Prisma do catálogo de remoção (sob RLS FORCE — tenant vinculado). LIMIT 2: distingue 0/1/≥2 sem varrer.
export function createPrismaRemovalCatalogResolver(prismaClient: PrismaClient): RemovalCatalogResolver {
  return async (tenantId: string) =>
    withTenantRls(prismaClient, tenantId, async (tx) => {
      const rows = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM service_catalog
        WHERE tenant_id = ${tenantId}::uuid AND is_active = true AND custody_profile_id IS NOT NULL
        LIMIT 2
      `;
      return rows.length === 1 ? rows[0].id : null;
    });
}

// ── InMemory (dev/test): espelha a partial-unique checando a coleção (processo único de teste, sem corrida) ──────
type Row = {
  readonly id: string;
  readonly tenantId: string;
  readonly credentialId: string;
  workOrderId: string | null;
  readonly plate: string;
  readonly legalBasis: string | null;
  readonly locationNote: string | null;
  status: AuthorityRemovalStatus;
  readonly sessionRef: string | null;
  readonly requestedAt: Date;
};

export class InMemoryAuthorityRemovalRepository implements AuthorityRemovalRepository {
  private readonly rows: Row[] = [];

  // Recebe um InMemoryWorkOrderRepository (o mesmo do modo memory) para ORIGINAR a OS em memória, espelhando a
  // atomicidade do Prisma (INSERT + origem na mesma "tx").
  constructor(private readonly workOrders: InMemoryWorkOrderRepository) {}

  async createRemoval(input: CreateAuthorityRemovalInput): Promise<CreateAuthorityRemovalResult> {
    const hasOpen = this.rows.some(
      (row) => row.tenantId === input.tenantId && row.plate === input.plate && row.status === "OPEN",
    );
    if (hasOpen) return { created: false, originated: false };

    let workOrderId: string | null = null;
    if (input.removalServiceCatalogId) {
      const workOrder = await originateSystemRemovalWorkOrder(this.workOrders, {
        tenantId: input.tenantId,
        plate: input.plate,
        serviceCatalogId: input.removalServiceCatalogId,
      });
      workOrderId = workOrder.id;
    }
    this.rows.push({
      id: randomUUID(),
      tenantId: input.tenantId,
      credentialId: input.credentialId,
      workOrderId,
      plate: input.plate,
      legalBasis: input.legalBasis ?? null,
      locationNote: input.locationNote ?? null,
      status: "OPEN",
      sessionRef: input.sessionRef ?? null,
      requestedAt: input.requestedAt,
    });
    return { created: true, originated: workOrderId !== null, workOrderId: workOrderId ?? undefined };
  }

  readForTests(): readonly Row[] {
    return this.rows.map((row) => ({ ...row }));
  }

  reset(): void {
    this.rows.length = 0;
  }
}

// Singleton in-memory COMPARTILHADO (mesmo espírito de getMemoryAuthorityCredentialRepository/getMemoryWorkOrder
// RepositoryForTests): permite que o runtime de authority-release-approval (PR-19) enxergue as MESMAS solicitações
// que o runtime de authority-removal (PR-18b) originou em modo dev/memory (paridade com o Prisma, 1 tabela só).
let memoryRemovalRepository: InMemoryAuthorityRemovalRepository | undefined;

export function getMemoryAuthorityRemovalRepository(workOrders: InMemoryWorkOrderRepository): InMemoryAuthorityRemovalRepository {
  memoryRemovalRepository ??= new InMemoryAuthorityRemovalRepository(workOrders);
  return memoryRemovalRepository;
}

export function resetMemoryAuthorityRemovalRepositoryForTests(): void {
  memoryRemovalRepository = undefined;
}

// ── Prisma (produção) ───────────────────────────────────────────────────────────────────────────────────────────
// Casa SÓ o nome da constraint de idempotência (não "23505" solto — qualquer outra unique/PK violation na mesma tx
// seria engolida como falso-duplicata se casássemos o código genérico; achado F1 da junta do PR-18b).
function isOpenRemovalUniqueViolation(error: unknown): boolean {
  const text = error instanceof Error ? error.message : String(error);
  return text.includes("authority_removal_requests_open_plate_key");
}

export class PrismaAuthorityRemovalRepository implements AuthorityRemovalRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  async createRemoval(input: CreateAuthorityRemovalInput): Promise<CreateAuthorityRemovalResult> {
    try {
      return await withTenantRls(this.prismaClient, input.tenantId, async (tx) => {
        // INSERT PRIMEIRO: se já houver uma solicitação ABERTA para a placa, a partial-unique dispara 23505 AQUI
        // (antes de qualquer OS ser criada) → a tx inteira aborta. RAW insert (a partial-unique é raw-only).
        const inserted = await tx.$queryRaw<Array<{ id: string }>>`
          INSERT INTO authority_removal_requests
            (tenant_id, credential_id, plate, legal_basis, location_note, status, session_ref, requested_at)
          VALUES (
            ${input.tenantId}::uuid,
            ${input.credentialId}::uuid,
            ${input.plate},
            ${input.legalBasis ?? null},
            ${input.locationNote ?? null},
            'OPEN',
            ${input.sessionRef ?? null},
            ${input.requestedAt}
          )
          RETURNING id
        `;
        const requestId = inserted[0].id;

        let workOrderId: string | undefined;
        if (input.removalServiceCatalogId) {
          // Origina a OS(open) na MESMA tx (ator SISTEMA), pelo método estreito. A FK composta tenant-first
          // (tenant_id, work_order_id) → work_orders é ligada logo em seguida.
          const workOrder = await originateSystemRemovalWorkOrder(new PrismaWorkOrderRepository(tx), {
            tenantId: input.tenantId,
            plate: input.plate,
            serviceCatalogId: input.removalServiceCatalogId,
          });
          workOrderId = workOrder.id;
          await tx.$executeRaw`
            UPDATE authority_removal_requests
            SET work_order_id = ${workOrder.id}::uuid, updated_at = now()
            WHERE tenant_id = ${input.tenantId}::uuid AND id = ${requestId}::uuid
          `;
        }
        return { created: true, originated: workOrderId !== undefined, workOrderId };
      });
    } catch (error) {
      if (isOpenRemovalUniqueViolation(error)) return { created: false, originated: false };
      throw error;
    }
  }
}

export async function createPrismaAuthorityRemovalRepository(): Promise<PrismaAuthorityRemovalRepository> {
  const { prisma } = await import("../../database/prisma.js");
  return new PrismaAuthorityRemovalRepository(prisma);
}
