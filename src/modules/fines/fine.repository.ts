import { randomUUID } from "node:crypto";

import type {
  CreateFineInput,
  Fine,
  ListFinesInput,
  ListFinesResult,
  UpdateFineInput,
} from "./fine.types.js";
import { FineError } from "./fine.types.js";

/** Statuses that are NOT eligible for a due-deadline notification (R3.2). */
export const FINE_FINAL_NOTIFICATION_STATUSES = ["paga", "cancelada", "deferida"] as const;

export interface FineRepository {
  create(input: CreateFineInput): Promise<Fine>;
  list(input: ListFinesInput): Promise<ListFinesResult>;
  findById(tenantId: string, fineId: string): Promise<Fine | undefined>;
  update(input: UpdateFineInput): Promise<Fine | undefined>;
  /** R3.2 — non-final fines with a `prazo_recurso` OR `prazo_pagamento` in [now, until]. */
  listDue(tenantId: string, now: Date, until: Date): Promise<Fine[]>;
  reset?(): void;
}

export class InMemoryFineRepository implements FineRepository {
  private readonly fines = new Map<string, Fine>();

  async create(input: CreateFineInput): Promise<Fine> {
    // R3.3 — composite unique (tenant_id, numero_auto). Same number in another
    // tenant is allowed; duplicate in the SAME tenant is a 409.
    if (this.hasNumeroAuto(input.tenantId, input.numeroAuto)) {
      throw duplicateNumeroAuto();
    }

    const now = new Date();
    const fine: Fine = {
      ...input,
      id: randomUUID(),
      isActive: input.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };

    this.fines.set(fine.id, fine);

    return fine;
  }

  async list(input: ListFinesInput): Promise<ListFinesResult> {
    const filtered = this.sortedFines()
      .filter((fine) => fine.tenantId === input.tenantId)
      .filter((fine) => input.vehicleId === undefined || fine.vehicleId === input.vehicleId)
      .filter((fine) => input.driverId === undefined || fine.driverId === input.driverId)
      .filter((fine) => input.status === undefined || fine.status === input.status)
      .filter((fine) => input.isActive === undefined || fine.isActive === input.isActive)
      .filter((fine) => matchesPrazoFrom(fine, input.prazoFrom))
      .filter((fine) => matchesPrazoTo(fine, input.prazoTo))
      .filter((fine) => matchesSearch(fine, input.search));

    return {
      items: filtered.slice(input.offset, input.offset + input.limit),
      total: filtered.length,
      limit: input.limit,
      offset: input.offset,
    };
  }

  async findById(tenantId: string, fineId: string): Promise<Fine | undefined> {
    const fine = this.fines.get(fineId);
    return fine?.tenantId === tenantId ? fine : undefined;
  }

  async update(input: UpdateFineInput): Promise<Fine | undefined> {
    const current = await this.findById(input.tenantId, input.fineId);
    if (!current) return undefined;

    // R3.3 — changing numero_auto to one already used by ANOTHER fine of the
    // same tenant is a 409.
    if (
      input.numeroAuto !== undefined &&
      input.numeroAuto !== current.numeroAuto &&
      this.hasNumeroAuto(input.tenantId, input.numeroAuto, current.id)
    ) {
      throw duplicateNumeroAuto();
    }

    // `responsibleOperatorProfileId` é tri-estado: undefined = não muda; null = LIMPAR (→ undefined);
    // string = setar. É tratado à parte para não vazar `null` no tipo (Fine usa string | undefined).
    const { responsibleOperatorProfileId, ...restInput } = input;
    const nextResponsible =
      responsibleOperatorProfileId === undefined
        ? current.responsibleOperatorProfileId
        : (responsibleOperatorProfileId ?? undefined);

    const updated: Fine = {
      ...current,
      ...definedFields(restInput),
      responsibleOperatorProfileId: nextResponsible,
      updatedAt: new Date(),
    };
    this.fines.set(updated.id, updated);

    return updated;
  }

  async listDue(tenantId: string, now: Date, until: Date): Promise<Fine[]> {
    return this.sortedFines().filter(
      (fine) =>
        fine.tenantId === tenantId &&
        fine.isActive &&
        !isFinalForNotification(fine.status) &&
        (withinWindow(fine.prazoRecurso, now, until) || withinWindow(fine.prazoPagamento, now, until)),
    );
  }

  reset(): void {
    this.fines.clear();
  }

  private hasNumeroAuto(tenantId: string, numeroAuto: string, excludeId?: string): boolean {
    return [...this.fines.values()].some(
      (fine) => fine.tenantId === tenantId && fine.numeroAuto === numeroAuto && fine.id !== excludeId,
    );
  }

  private sortedFines(): Fine[] {
    return [...this.fines.values()].sort((left, right) => {
      const byCreatedAt = right.createdAt.getTime() - left.createdAt.getTime();
      if (byCreatedAt !== 0) return byCreatedAt;

      return right.updatedAt.getTime() - left.updatedAt.getTime();
    });
  }
}

export function isFinalForNotification(status: string): boolean {
  return (FINE_FINAL_NOTIFICATION_STATUSES as readonly string[]).includes(status);
}

function withinWindow(date: Date | undefined, now: Date, until: Date): boolean {
  if (!date) return false;
  return date.getTime() >= now.getTime() && date.getTime() <= until.getTime();
}

function matchesPrazoFrom(fine: Fine, from: Date | undefined): boolean {
  if (!from) return true;
  return earliestPrazo(fine) !== undefined && (earliestPrazo(fine) as Date).getTime() >= from.getTime();
}

function matchesPrazoTo(fine: Fine, to: Date | undefined): boolean {
  if (!to) return true;
  return latestPrazoWithin(fine, to);
}

function earliestPrazo(fine: Fine): Date | undefined {
  const dates = [fine.prazoRecurso, fine.prazoPagamento].filter((value): value is Date => value !== undefined);
  if (dates.length === 0) return undefined;

  return dates.reduce((earliest, current) => (current.getTime() < earliest.getTime() ? current : earliest));
}

function latestPrazoWithin(fine: Fine, to: Date): boolean {
  return [fine.prazoRecurso, fine.prazoPagamento].some(
    (value) => value !== undefined && value.getTime() <= to.getTime(),
  );
}

function matchesSearch(fine: Fine, search: string | undefined): boolean {
  if (!search) return true;
  const normalized = search.toLowerCase();

  return [fine.numeroAuto, fine.orgao, fine.descricao]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(normalized));
}

function duplicateNumeroAuto(): FineError {
  return new FineError(409, "FINE_CONFLICT", "duplicate_numero_auto", "A fine with this numeroAuto already exists in this organization.");
}

function definedFields<T extends Record<string, unknown>>(input: T): Partial<T> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as Partial<T>;
}
