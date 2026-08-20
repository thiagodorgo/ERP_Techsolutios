import { env } from "../../config/env.js";
import type {
  FinancialEntryRepository,
  InMemoryFinancialEntryRepository,
} from "../financial-entries/financial-entry.repository.js";
import type {
  FinancialPeriodCloseRepository,
  FinancialTitleRepository,
  InMemoryFinancialTitleRepository,
} from "../financial-titles/financial-title.repository.js";

// -----------------------------------------------------------------------------------------------
// B-O6R-02 (Ω6R-DIN-001..004/008) — PORTA de Unit of Work do financeiro.
//
// Contrato: `run(tenantId, work)` executa `work` como UMA unidade tenant-scoped. Tudo que o `work`
// escrever pelos repositórios do contexto commita JUNTO ou morre JUNTO — não existe estado
// intermediário commitável. `assertPeriodOpenShared` toma a trava de período em modo SHARED e
// re-valida isPeriodClosed DENTRO da mesma unidade (DIN-008); período fechado → lança o erro da
// fábrica do chamador (título e lançamento têm códigos próprios) → a unidade inteira desfaz.
//
// Duas implementações, mesma porta (idioma de resolver dos serviços financeiros):
//   · Prisma (financial-uow-prisma.ts) — transação REAL (withTenantRls + advisory lock do Postgres).
//     É a implementação de produção e a ÚNICA que serve de evidência de atomicidade.
//   · Memória (abaixo) — DUBLÊ HONESTO: mutex por tenant (Node é single-thread; o mutex serializa
//     interleaving de awaits, fazendo as vezes da trava) + UNDO-LOG por snapshot tenant-escopado
//     (work lança → restaura o estado anterior). NÃO é evidência de nada: existe para as provas em
//     memória dos módulos financeiros continuarem vivas quando os fluxos multi-write (F3+)
//     atravessarem a porta. A prova real de cada garantia é a suíte -db contra Postgres.
// -----------------------------------------------------------------------------------------------

export interface FinancialUowContext {
  readonly titles: FinancialTitleRepository;
  readonly entries: FinancialEntryRepository;
  /**
   * DIN-008 — trava SHARED de (tenant, period) + re-check de isPeriodClosed DENTRO da unidade.
   * Período fechado → lança `onClosed(period)` e a unidade inteira desfaz.
   */
  assertPeriodOpenShared(period: string, onClosed: (period: string) => Error): Promise<void>;
}

export interface FinancialUnitOfWork {
  run<T>(tenantId: string, work: (ctx: FinancialUowContext) => Promise<T>): Promise<T>;
}

export type MemoryFinancialUowDeps = {
  readonly titles: InMemoryFinancialTitleRepository;
  readonly entries: InMemoryFinancialEntryRepository;
  readonly periodCloses: FinancialPeriodCloseRepository;
};

export class MemoryFinancialUnitOfWork implements FinancialUnitOfWork {
  private readonly tenantMutex = new Map<string, Promise<void>>();

  constructor(private readonly deps: MemoryFinancialUowDeps) {}

  async run<T>(tenantId: string, work: (ctx: FinancialUowContext) => Promise<T>): Promise<T> {
    return this.withTenantMutex(tenantId, async () => {
      // UNDO-LOG: snapshots tenant-escopados tirados ANTES do work; falha → restaura na ordem inversa.
      const undoLog: Array<() => void> = [
        ((rows) => () => this.deps.titles.restoreTenantForUow(tenantId, rows))(this.deps.titles.snapshotTenantForUow(tenantId)),
        ((rows) => () => this.deps.entries.restoreTenantForUow(tenantId, rows))(this.deps.entries.snapshotTenantForUow(tenantId)),
      ];

      const ctx: FinancialUowContext = {
        titles: this.deps.titles,
        entries: this.deps.entries,
        assertPeriodOpenShared: async (period, onClosed) => {
          // Memória não tem advisory lock — o mutex por tenant JÁ serializa a unidade inteira; aqui
          // fica só o re-check (a semântica observável do DIN-008: fechado → erro → unidade desfaz).
          if (await this.deps.periodCloses.isPeriodClosed(tenantId, period)) {
            throw onClosed(period);
          }
        },
      };

      try {
        return await work(ctx);
      } catch (error) {
        for (const undo of undoLog.reverse()) undo();
        throw error;
      }
    });
  }

  private async withTenantMutex<T>(tenantId: string, fn: () => Promise<T>): Promise<T> {
    const previous = this.tenantMutex.get(tenantId) ?? Promise.resolve();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.tenantMutex.set(
      tenantId,
      previous.then(() => gate),
    );
    await previous;
    try {
      return await fn();
    } finally {
      release();
    }
  }
}

export function createMemoryFinancialUnitOfWork(deps: MemoryFinancialUowDeps): MemoryFinancialUnitOfWork {
  return new MemoryFinancialUnitOfWork(deps);
}

let defaultUowPromise: Promise<FinancialUnitOfWork> | undefined;

// Resolver default (mesmo idioma de createDefaultFinancial*Service): memória fora de produção,
// Prisma quando CORE_SAAS_PERSISTENCE=prisma. Imports dinâmicos — os singletons InMemory vivem nos
// serviços (financial-title.service/financial-entry.service) e o import estático criaria ciclo
// quando os serviços passarem a consumir a porta (F3+).
export async function createDefaultFinancialUnitOfWork(): Promise<FinancialUnitOfWork> {
  defaultUowPromise ??= createFinancialUnitOfWork();
  return defaultUowPromise;
}

export function resetFinancialUowRuntimeForTests(): void {
  defaultUowPromise = undefined;
}

async function createFinancialUnitOfWork(): Promise<FinancialUnitOfWork> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    const [titleModule, entryModule] = await Promise.all([
      import("../financial-titles/financial-title.service.js"),
      import("../financial-entries/financial-entry.service.js"),
    ]);
    return createMemoryFinancialUnitOfWork({
      titles: titleModule.getMemoryFinancialTitleRepositoryForTests(),
      entries: entryModule.getMemoryFinancialEntryRepositoryForTests(),
      periodCloses: titleModule.getMemoryFinancialPeriodCloseRepositoryForTests(),
    });
  }
  const { createPrismaFinancialUnitOfWork } = await import("./financial-uow-prisma.js");
  return createPrismaFinancialUnitOfWork();
}
