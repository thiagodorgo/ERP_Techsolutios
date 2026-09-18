import type { Prisma, PrismaClient } from "@prisma/client";

import { withTenantRls } from "../../database/rls.js";
import { roundToDecimalPrecision } from "./inventory.calculations.js";
import { mapTransientDbFailure } from "./inventory-prisma.repository.js";
import type { InventoryAbcClass } from "./inventory.types.js";
import {
  cycleCountBusyError,
  itemsInOpenSessionError,
  type AbortCloseOutcome,
  type BeginCloseOutcome,
  type CancelOutcome,
  type CreateCycleCountInput,
  type CycleCount,
  type CycleCountEntry,
  type CycleCountStatus,
  type CycleCountWithEntries,
  type FinishCloseOutcome,
  type ListCycleCountsInput,
  type ListCycleCountsResult,
  type RecordEntryCountInput,
  type RecordEntryOutcome,
  type StampEntryInput,
} from "./cycle-count.types.js";
import type { CycleCountRepository } from "./cycle-count.repository.js";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

type SessionRecord = Parameters<typeof mapSessionRecord>[0];

// -----------------------------------------------------------------------------------------------
// B-O6R-04a (Ω6R-DAT-003) — a contagem sob concorrência.
//
//   · toda transição de `cycle_counts.status` é CAS: `status` esperado no `where` do `updateMany`, com a
//     sessão já travada `FOR UPDATE` no mesmo statement anterior da transação (beginClose, abortClose,
//     finishClose, cancelSession — o guard D5 enumera);
//   · toda escrita em `cycle_count_entries` roda sob o lock da sessão: `FOR UPDATE` na unidade do fechamento,
//     `FOR SHARE` na recontagem — e, em `fechando`, com o predicado `adjustment_movement_id IS NULL` na
//     própria linha (a recontagem nunca escreve por cima de um ajuste aplicado);
//   · `createSession` serializa os `open` da organização pela linha do tenant (`FOR NO KEY UPDATE`, que NÃO
//     conflita com o KEY SHARE dos INSERTs com FK para `tenants`) e recusa item já em sessão não terminal (I9);
//   · contagem de carimbos e total da sessão são statements PRÓPRIOS depois de adquirido o lock — nunca
//     subconsulta no `where` de um UPDATE (o EvalPlanQual a reavaliaria com o snapshot antigo).
// -----------------------------------------------------------------------------------------------
export class PrismaCycleCountRepository implements CycleCountRepository {
  constructor(private readonly client: PrismaExecutor) {}

  async createSession(input: CreateCycleCountInput): Promise<CycleCountWithEntries> {
    // (1) Serializa os `open` da organização. A linha travada é SEMPRE a do ator (input.tenantId, resolvido do
    //     token) — nunca um parâmetro do cliente. `tenants` não tem RLS: a linha aparece em qualquer contexto.
    await this.client.$queryRaw`SELECT id FROM "tenants" WHERE id = ${input.tenantId}::uuid FOR NO KEY UPDATE`;

    // (2) Sobreposição (I9): algum item já está numa sessão `aberta|fechando` desta organização?
    const itemIds = input.entries.map((entry) => entry.itemId);
    if (itemIds.length > 0) {
      const overlapping = await this.client.$queryRaw<Array<{ item_id: string }>>`
        SELECT DISTINCT e.item_id FROM cycle_count_entries e
          JOIN cycle_counts c ON c.tenant_id = e.tenant_id AND c.id = e.cycle_count_id
         WHERE e.tenant_id = ${input.tenantId}::uuid AND c.status IN ('aberta', 'fechando') AND e.item_id = ANY(${itemIds}::uuid[])
      `;
      if (overlapping.length > 0) {
        throw itemsInOpenSessionError(overlapping.length);
      }
    }

    // (3) Só então insere — como antes.
    const session = await this.client.cycleCount.create({
      data: {
        tenant_id: input.tenantId,
        abc_class: input.abcClass ?? null,
        status: "aberta",
        notes: input.notes ?? null,
        created_by: input.createdBy ?? null,
        updated_by: input.createdBy ?? null,
      },
    });

    if (input.entries.length > 0) {
      await this.client.cycleCountEntry.createMany({
        data: input.entries.map((entry) => ({
          tenant_id: input.tenantId,
          cycle_count_id: session.id,
          item_id: entry.itemId,
          system_quantity: roundToDecimalPrecision(entry.systemQuantity),
        })),
      });
    }

    return this.requireSessionWithEntries(input.tenantId, session.id);
  }

  async listSessions(input: ListCycleCountsInput): Promise<ListCycleCountsResult> {
    const where = buildSessionWhere(input);
    const [rows, total] = await Promise.all([
      this.client.cycleCount.findMany({
        where,
        orderBy: [{ created_at: "desc" }],
        take: input.limit,
        skip: input.offset,
      }),
      this.client.cycleCount.count({ where }),
    ]);

    return {
      items: rows.map(mapSessionRecord),
      total,
      limit: input.limit,
      offset: input.offset,
    };
  }

  async findSession(tenantId: string, cycleCountId: string): Promise<CycleCount | undefined> {
    const session = await this.client.cycleCount.findFirst({
      where: { tenant_id: tenantId, id: cycleCountId },
    });

    return session ? mapSessionRecord(session) : undefined;
  }

  async findSessionWithEntries(tenantId: string, cycleCountId: string): Promise<CycleCountWithEntries | undefined> {
    const session = await this.findSession(tenantId, cycleCountId);
    if (!session) return undefined;

    return { ...session, entries: await this.entriesOf(tenantId, cycleCountId) };
  }

  /**
   * V7 (A-01, emenda 1-d) — o TOCTOU fechado: o status é lido `FOR SHARE` na MESMA transação da escrita. A unidade
   * do fechamento segura `FOR UPDATE` na sessão, logo as duas serializam; bloqueada, esta leitura devolve a versão
   * NOVA da linha (`concluida` → 422). Em `fechando`, só entrada ainda sem ajuste é recontada (S-01).
   */
  async recordEntryCount(input: RecordEntryCountInput): Promise<RecordEntryOutcome> {
    const status = await this.sessionStatus(input.tenantId, input.cycleCountId, "share");
    if (status === undefined) return { status: "not_found" };
    if (status !== "aberta" && status !== "fechando") return { status: "not_open", current: status };

    const updated = await this.client.cycleCountEntry.updateManyAndReturn({
      where: {
        tenant_id: input.tenantId,
        id: input.entryId,
        cycle_count_id: input.cycleCountId,
        ...(status === "fechando" ? { adjustment_movement_id: null } : {}),
      },
      data: {
        counted_quantity: roundToDecimalPrecision(input.countedQuantity),
      },
    });
    if (updated[0]) return { status: "ok", entry: mapEntryRecord(updated[0]) };

    const existing = await this.findEntry(input.tenantId, input.cycleCountId, input.entryId);
    return existing ? { status: "entry_adjusted" } : { status: "entry_not_found" };
  }

  async beginClose(tenantId: string, cycleCountId: string): Promise<BeginCloseOutcome> {
    const status = await this.sessionStatus(tenantId, cycleCountId, "update");
    if (status === undefined) return { status: "not_found" };

    let outcome: "started" | "resumed";
    if (status === "aberta") {
      const moved = await this.client.cycleCount.updateMany({
        where: { tenant_id: tenantId, id: cycleCountId, status: "aberta" },
        data: { status: "fechando" },
      });
      if (moved.count !== 1) return { status: "not_open", current: await this.currentStatus(tenantId, cycleCountId) };
      outcome = "started";
    } else if (status === "fechando") {
      outcome = "resumed";
    } else {
      return { status: "not_open", current: status };
    }

    const session = await this.requireSessionWithEntries(tenantId, cycleCountId);
    return { status: outcome, session, entries: session.entries };
  }

  async lockSessionForUpdate(tenantId: string, cycleCountId: string): Promise<CycleCount | undefined> {
    const rows = await this.client.$queryRaw<SessionRecord[]>`
      SELECT * FROM cycle_counts WHERE tenant_id = ${tenantId}::uuid AND id = ${cycleCountId}::uuid FOR UPDATE
    `;

    return rows[0] ? mapSessionRecord(rows[0]) : undefined;
  }

  async findEntry(tenantId: string, cycleCountId: string, entryId: string): Promise<CycleCountEntry | undefined> {
    const entry = await this.client.cycleCountEntry.findFirst({
      where: { tenant_id: tenantId, cycle_count_id: cycleCountId, id: entryId },
    });

    return entry ? mapEntryRecord(entry) : undefined;
  }

  async stampEntry(input: StampEntryInput): Promise<void> {
    const stamped = await this.client.cycleCountEntry.updateMany({
      where: {
        tenant_id: input.tenantId,
        id: input.entryId,
        cycle_count_id: input.cycleCountId,
        adjustment_movement_id: null,
      },
      data: {
        variance: roundToDecimalPrecision(input.variance),
        adjustment_movement_id: input.adjustmentMovementId,
      },
    });

    if (stamped.count !== 1) {
      // Sob o lock da sessão a entrada foi relida sem carimbo: 0 linhas aqui é invariante quebrada. Lança e a
      // transação da unidade inteira (ajuste incluído) desfaz.
      throw new Error("stampEntry: a entrada não existe ou já foi carimbada.");
    }
  }

  async abortClose(tenantId: string, cycleCountId: string): Promise<AbortCloseOutcome> {
    const status = await this.sessionStatus(tenantId, cycleCountId, "update");
    if (status !== "fechando") return { status: "not_closing", current: status };

    const stamped = await this.stampedCount(tenantId, cycleCountId);
    if (stamped > 0) return { status: "kept", stamped };

    const moved = await this.client.cycleCount.updateMany({
      where: { tenant_id: tenantId, id: cycleCountId, status: "fechando" },
      data: { status: "aberta" },
    });

    return moved.count === 1 ? { status: "reverted" } : { status: "not_closing", current: await this.currentStatus(tenantId, cycleCountId) };
  }

  async finishClose(tenantId: string, cycleCountId: string, updatedBy?: string): Promise<FinishCloseOutcome> {
    const status = await this.sessionStatus(tenantId, cycleCountId, "update");
    if (status === undefined) return { status: "not_found" };
    if (status !== "fechando") return { status: "not_open", current: status };

    const pending = await this.client.$queryRaw<Array<{ remaining: number }>>`
      SELECT count(*)::int AS remaining FROM cycle_count_entries
       WHERE tenant_id = ${tenantId}::uuid AND cycle_count_id = ${cycleCountId}::uuid
         AND counted_quantity IS NOT NULL AND counted_quantity <> system_quantity AND adjustment_movement_id IS NULL
    `;
    const remaining = pending[0]?.remaining ?? 0;
    if (remaining > 0) return { status: "pending", remaining };

    // S-02 — o total da sessão INTEIRA (inclusive unidades aplicadas em chamadas anteriores e por outro `close`
    // concorrente), somado no banco sob o lock da sessão, na transação do CAS final.
    const totals = await this.client.$queryRaw<Array<{ total: unknown }>>`
      SELECT COALESCE(SUM(e.variance * i.avg_cost), 0) AS total
        FROM cycle_count_entries e
        JOIN inventory_items i ON i.tenant_id = e.tenant_id AND i.id = e.item_id
       WHERE e.tenant_id = ${tenantId}::uuid AND e.cycle_count_id = ${cycleCountId}::uuid AND e.adjustment_movement_id IS NOT NULL
    `;

    const moved = await this.client.cycleCount.updateMany({
      where: { tenant_id: tenantId, id: cycleCountId, status: "fechando" },
      data: { status: "concluida", updated_by: updatedBy ?? null },
    });
    if (moved.count !== 1) return { status: "not_open", current: await this.currentStatus(tenantId, cycleCountId) };

    return {
      status: "ok",
      session: await this.requireSessionWithEntries(tenantId, cycleCountId),
      totalVarianceValue: roundToDecimalPrecision(decimalToNumber(totals[0]?.total)),
    };
  }

  /**
   * V8 (A-02) — `cancel` sob `FOR UPDATE` da sessão (espera qualquer unidade em curso). Em `fechando`, a contagem de
   * carimbos é um statement PRÓPRIO depois do lock: com ajuste aplicado → `close_in_progress` (a saída é recontar e
   * concluir); sem ajuste → CAS para `cancelada`.
   */
  async cancelSession(tenantId: string, cycleCountId: string, updatedBy?: string): Promise<CancelOutcome> {
    const current = await this.sessionStatus(tenantId, cycleCountId, "update");
    if (current === undefined) return { status: "not_found" };
    if (current !== "aberta" && current !== "fechando") return { status: "not_open", current };

    if (current === "fechando") {
      const stamped = await this.stampedCount(tenantId, cycleCountId);
      if (stamped > 0) return { status: "close_in_progress", stamped };
    }

    const updated = await this.client.cycleCount.updateManyAndReturn({
      where: { tenant_id: tenantId, id: cycleCountId, status: current },
      data: { status: "cancelada", is_active: false, updated_by: updatedBy ?? null },
    });

    return updated[0]
      ? { status: "ok", session: mapSessionRecord(updated[0]) }
      : { status: "not_open", current: await this.currentStatus(tenantId, cycleCountId) };
  }

  /** Status da sessão com o lock pedido, tagged (nunca `Unsafe`). `undefined` = inexistente/outro tenant. */
  private async sessionStatus(
    tenantId: string,
    cycleCountId: string,
    mode: "share" | "update",
  ): Promise<CycleCountStatus | undefined> {
    const rows =
      mode === "share"
        ? await this.client.$queryRaw<Array<{ status: string }>>`
            SELECT status FROM cycle_counts WHERE tenant_id = ${tenantId}::uuid AND id = ${cycleCountId}::uuid FOR SHARE
          `
        : await this.client.$queryRaw<Array<{ status: string }>>`
            SELECT status FROM cycle_counts WHERE tenant_id = ${tenantId}::uuid AND id = ${cycleCountId}::uuid FOR UPDATE
          `;

    return rows[0] ? (rows[0].status as CycleCountStatus) : undefined;
  }

  private async currentStatus(tenantId: string, cycleCountId: string): Promise<CycleCountStatus> {
    return (await this.findSession(tenantId, cycleCountId))?.status ?? "cancelada";
  }

  private async stampedCount(tenantId: string, cycleCountId: string): Promise<number> {
    const rows = await this.client.$queryRaw<Array<{ stamped: number }>>`
      SELECT count(adjustment_movement_id)::int AS stamped FROM cycle_count_entries
       WHERE tenant_id = ${tenantId}::uuid AND cycle_count_id = ${cycleCountId}::uuid
    `;

    return rows[0]?.stamped ?? 0;
  }

  private async entriesOf(tenantId: string, cycleCountId: string): Promise<CycleCountEntry[]> {
    const rows = await this.client.cycleCountEntry.findMany({
      where: { tenant_id: tenantId, cycle_count_id: cycleCountId },
      orderBy: [{ created_at: "asc" }],
    });

    return rows.map(mapEntryRecord);
  }

  private async requireSessionWithEntries(tenantId: string, cycleCountId: string): Promise<CycleCountWithEntries> {
    const session = await this.findSessionWithEntries(tenantId, cycleCountId);
    if (!session) {
      throw new Error("Cycle count session vanished immediately after write.");
    }

    return session;
  }
}

/**
 * Wrapper RLS: cada porta pública é UMA transação tenant-scoped (`this.tx`), e a falha transitória de banco vira
 * 503 `CYCLE_COUNT_UNAVAILABLE/cycle_count_busy` (nada gravado). O guard D7 reprova porta sem `this.tx`.
 */
export class RlsPrismaCycleCountRepository implements CycleCountRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  createSession(input: CreateCycleCountInput): Promise<CycleCountWithEntries> {
    return this.tx(input.tenantId, (repo) => repo.createSession(input));
  }

  listSessions(input: ListCycleCountsInput): Promise<ListCycleCountsResult> {
    return this.tx(input.tenantId, (repo) => repo.listSessions(input));
  }

  findSession(tenantId: string, cycleCountId: string): Promise<CycleCount | undefined> {
    return this.tx(tenantId, (repo) => repo.findSession(tenantId, cycleCountId));
  }

  findSessionWithEntries(tenantId: string, cycleCountId: string): Promise<CycleCountWithEntries | undefined> {
    return this.tx(tenantId, (repo) => repo.findSessionWithEntries(tenantId, cycleCountId));
  }

  recordEntryCount(input: RecordEntryCountInput): Promise<RecordEntryOutcome> {
    return this.tx(input.tenantId, (repo) => repo.recordEntryCount(input));
  }

  beginClose(tenantId: string, cycleCountId: string): Promise<BeginCloseOutcome> {
    return this.tx(tenantId, (repo) => repo.beginClose(tenantId, cycleCountId));
  }

  lockSessionForUpdate(tenantId: string, cycleCountId: string): Promise<CycleCount | undefined> {
    return this.tx(tenantId, (repo) => repo.lockSessionForUpdate(tenantId, cycleCountId));
  }

  findEntry(tenantId: string, cycleCountId: string, entryId: string): Promise<CycleCountEntry | undefined> {
    return this.tx(tenantId, (repo) => repo.findEntry(tenantId, cycleCountId, entryId));
  }

  stampEntry(input: StampEntryInput): Promise<void> {
    return this.tx(input.tenantId, (repo) => repo.stampEntry(input));
  }

  abortClose(tenantId: string, cycleCountId: string): Promise<AbortCloseOutcome> {
    return this.tx(tenantId, (repo) => repo.abortClose(tenantId, cycleCountId));
  }

  finishClose(tenantId: string, cycleCountId: string, updatedBy?: string): Promise<FinishCloseOutcome> {
    return this.tx(tenantId, (repo) => repo.finishClose(tenantId, cycleCountId, updatedBy));
  }

  cancelSession(tenantId: string, cycleCountId: string, updatedBy?: string): Promise<CancelOutcome> {
    return this.tx(tenantId, (repo) => repo.cancelSession(tenantId, cycleCountId, updatedBy));
  }

  /** A ÚNICA porta para o banco: transação tenant-scoped + falha transitória → 503 `cycle_count_busy`. */
  private async tx<T>(tenantId: string, work: (repo: PrismaCycleCountRepository) => Promise<T>): Promise<T> {
    try {
      return await withTenantRls(this.prismaClient, tenantId, (tx) => work(new PrismaCycleCountRepository(tx)));
    } catch (error) {
      throw mapTransientDbFailure(error, cycleCountBusyError);
    }
  }
}

export async function createPrismaCycleCountRepository(): Promise<RlsPrismaCycleCountRepository> {
  const { prisma } = await import("../../database/prisma.js");

  return new RlsPrismaCycleCountRepository(prisma);
}

function buildSessionWhere(input: ListCycleCountsInput): Prisma.CycleCountWhereInput {
  return {
    tenant_id: input.tenantId,
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.isActive !== undefined ? { is_active: input.isActive } : {}),
  };
}

function mapSessionRecord(record: {
  readonly id: string;
  readonly tenant_id: string;
  readonly abc_class: string | null;
  readonly status: string;
  readonly notes: string | null;
  readonly is_active: boolean;
  readonly created_by: string | null;
  readonly updated_by: string | null;
  readonly created_at: Date;
  readonly updated_at: Date;
}): CycleCount {
  return {
    id: record.id,
    tenantId: record.tenant_id,
    abcClass: (record.abc_class as InventoryAbcClass | null) ?? undefined,
    status: record.status as CycleCountStatus,
    notes: record.notes ?? undefined,
    isActive: record.is_active,
    createdBy: record.created_by ?? undefined,
    updatedBy: record.updated_by ?? undefined,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function mapEntryRecord(record: {
  readonly id: string;
  readonly tenant_id: string;
  readonly cycle_count_id: string;
  readonly item_id: string;
  readonly system_quantity: unknown;
  readonly counted_quantity: unknown;
  readonly variance: unknown;
  readonly adjustment_movement_id: string | null;
  readonly created_at: Date;
  readonly updated_at: Date;
}): CycleCountEntry {
  return {
    id: record.id,
    tenantId: record.tenant_id,
    cycleCountId: record.cycle_count_id,
    itemId: record.item_id,
    systemQuantity: decimalToNumber(record.system_quantity),
    countedQuantity: optionalDecimal(record.counted_quantity),
    variance: optionalDecimal(record.variance),
    adjustmentMovementId: record.adjustment_movement_id ?? undefined,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function decimalToNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

function optionalDecimal(value: unknown): number | undefined {
  if (value === null || value === undefined) return undefined;
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : undefined;
}
