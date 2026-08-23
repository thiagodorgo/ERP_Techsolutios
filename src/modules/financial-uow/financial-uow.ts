import { env } from "../../config/env.js";
import type {
  ChequeRepository,
  InMemoryChequeRepository,
} from "../cheques/cheque.repository.js";
import type { Cheque } from "../cheques/cheque.types.js";
import type {
  FinancialEntryRepository,
  InMemoryFinancialEntryRepository,
} from "../financial-entries/financial-entry.repository.js";
import type { FinancialEntry } from "../financial-entries/financial-entry.types.js";
import type {
  FinancialPeriodCloseRepository,
  FinancialTitleRepository,
  InMemoryFinancialTitleRepository,
} from "../financial-titles/financial-title.repository.js";
import type { FinancialTitle } from "../financial-titles/financial-title.types.js";

// -----------------------------------------------------------------------------------------------
// B-O6R-02 (Ω6R-DIN-001..004/008) — PORTA de Unit of Work do financeiro.
//
// Contrato: `run(tenantId, work)` executa `work` como UMA unidade tenant-scoped. Tudo que o `work`
// escrever pelos repositórios do contexto (titles/entries/cheques) commita JUNTO ou morre JUNTO —
// não existe estado intermediário commitável. `assertPeriodOpenShared` toma a trava de período em modo SHARED e
// re-valida isPeriodClosed DENTRO da mesma unidade (DIN-008); período fechado → lança o erro da
// fábrica do chamador (título e lançamento têm códigos próprios) → a unidade inteira desfaz.
//
// Duas implementações, mesma porta (idioma de resolver dos serviços financeiros):
//   · Prisma (financial-uow-prisma.ts) — transação REAL (withTenantRls + advisory lock do Postgres).
//     É a implementação de produção e a ÚNICA que serve de evidência de atomicidade.
//   · Memória (abaixo) — DUBLÊ HONESTO: mutex por tenant + UNDO-LOG por JOURNAL DE BEFORE-IMAGES.
//     NÃO é evidência de nada: existe para as provas em memória dos módulos financeiros continuarem
//     vivas quando os fluxos multi-write (F3+) atravessarem a porta. A prova real de cada garantia é
//     a suíte -db contra Postgres.
//
// M1 (ciclo 2 · C4) — O QUE O UNDO-LOG DESFAZ, e o que o comentário antigo dizia de errado.
// Até este bloco, o rollback restaurava o SNAPSHOT DO TENANT INTEIRO, tirado antes do `work`. Isso
// desfazia mais do que a unidade escreveu: qualquer linha commitada FORA da unidade enquanto ela
// estava em voo era destruída. E o comentário afirmava que o mutex "faz as vezes da trava", o que
// para esse caso é FALSO — o mutex serializa unidades entre si, não impede escrita DIRETA no
// repositório (que é o que as próprias suítes fazem o tempo todo ao preparar fixture).
// Agora: cada repositório do contexto é entregue por DELEGAÇÃO EXPLÍCITA (nunca spread de instância
// — perderia os métodos do prototype) sobre um JOURNAL: antes de cada escrita, a before-image da
// linha é guardada (uma vez por id, a primeira). No erro, o rollback parte do snapshot CORRENTE no
// instante da falha e substitui/remove SOMENTE os ids do journal — o que a unidade não tocou
// sobrevive.
// LIMITAÇÃO RESIDUAL, dita porque ela existe: a granularidade é a LINHA. Se outra escrita alterar a
// MESMA linha que a unidade tocou, o rollback devolve a before-image da unidade e essa outra escrita
// se perde. Em memória (single-thread, com o mutex serializando as unidades) só se chega nisso
// escrevendo direto no repositório no meio de uma unidade em voo; o Postgres resolve de verdade, com
// row lock. O dublê não promete mais do que isto.
// -----------------------------------------------------------------------------------------------

export interface FinancialUowContext {
  readonly titles: FinancialTitleRepository;
  readonly entries: FinancialEntryRepository;
  // B-O6R-02 F5 (Ω6R-DIN-003) — cheques na MESMA unidade: clear/bounce fazem transição (CAS) +
  // lançamento + vínculo juntos; falha → o cheque volta ao estado anterior PELO BANCO (rollback).
  readonly cheques: ChequeRepository;
  /**
   * DIN-008 — trava SHARED de (tenant, period) + re-check de isPeriodClosed DENTRO da unidade.
   * Período fechado → lança `onClosed(period)` e a unidade inteira desfaz.
   */
  assertPeriodOpenShared(period: string, onClosed: (period: string) => Error): Promise<void>;
}

export interface FinancialUnitOfWork {
  run<T>(tenantId: string, work: (ctx: FinancialUowContext) => Promise<T>): Promise<T>;
}

// Resolver da porta (mesmo idioma dos service-resolvers dos módulos financeiros).
export type FinancialUowResolver = () => Promise<FinancialUnitOfWork>;

export type MemoryFinancialUowDeps = {
  readonly titles: InMemoryFinancialTitleRepository;
  readonly entries: InMemoryFinancialEntryRepository;
  readonly cheques: InMemoryChequeRepository;
  readonly periodCloses: FinancialPeriodCloseRepository;
};

export class MemoryFinancialUnitOfWork implements FinancialUnitOfWork {
  private readonly tenantMutex = new Map<string, Promise<void>>();

  constructor(private readonly deps: MemoryFinancialUowDeps) {}

  async run<T>(tenantId: string, work: (ctx: FinancialUowContext) => Promise<T>): Promise<T> {
    return this.withTenantMutex(tenantId, async () => {
      // UNDO-LOG por JOURNAL: um por repositório, escopado ao tenant desta unidade.
      const titleJournal = new TenantRowJournal(this.deps.titles, tenantId);
      const entryJournal = new TenantRowJournal(this.deps.entries, tenantId);
      const chequeJournal = new TenantRowJournal(this.deps.cheques, tenantId);

      const ctx: FinancialUowContext = {
        titles: journaledTitles(this.deps.titles, titleJournal),
        entries: journaledEntries(this.deps.entries, entryJournal),
        cheques: journaledCheques(this.deps.cheques, chequeJournal),
        assertPeriodOpenShared: async (period, onClosed) => {
          // Memória não tem advisory lock — o mutex por tenant serializa as UNIDADES entre si (e só
          // isso: escrita direta no repositório não passa por ele). Aqui fica o re-check, que é a
          // semântica observável do DIN-008: fechado → erro → a unidade desfaz.
          if (await this.deps.periodCloses.isPeriodClosed(tenantId, period)) {
            throw onClosed(period);
          }
        },
      };

      try {
        return await work(ctx);
      } catch (error) {
        // Ordem inversa da escrita, como antes; cada journal só mexe nos ids que a unidade tocou.
        chequeJournal.rollback();
        entryJournal.rollback();
        titleJournal.rollback();
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

// -----------------------------------------------------------------------------------------------
// M1 — JOURNAL DE BEFORE-IMAGES e os três delegadores.
//
// Por que delegação escrita à mão, e não spread nem Proxy: `{ ...repo }` sobre uma INSTÂNCIA copia
// só as propriedades próprias — os métodos vivem no prototype e somem (lição registrada do ciclo 1).
// Um Proxy resolveria, mas escondendo QUAIS métodos escrevem; aqui a lista é a documentação: o que
// não aparece com `remember(...)` é leitura, e isso é verificável lendo o arquivo.
// -----------------------------------------------------------------------------------------------

type UowRow = { readonly id: string };

/** O par snapshot/restore tenant-escopado que os repositórios InMemory já expunham. */
type TenantSnapshotStore<TRow extends UowRow> = {
  snapshotTenantForUow(tenantId: string): TRow[];
  restoreTenantForUow(tenantId: string, rows: readonly TRow[]): void;
};

class TenantRowJournal<TRow extends UowRow> {
  // id → estado ANTES da primeira escrita da unidade (undefined = a linha não existia).
  private readonly beforeImages = new Map<string, TRow | undefined>();

  constructor(
    private readonly store: TenantSnapshotStore<TRow>,
    private readonly tenantId: string,
  ) {}

  /** Só a PRIMEIRA before-image por id importa: é o estado ao qual o rollback tem de voltar. */
  remember(id: string, image: TRow | undefined): void {
    if (!this.beforeImages.has(id)) {
      this.beforeImages.set(id, image === undefined ? undefined : { ...image });
    }
  }

  /** Lê a linha atual para a before-image (undefined quando ainda não existe). */
  async rememberById(id: string, read: (id: string) => Promise<TRow | undefined>): Promise<void> {
    if (this.beforeImages.has(id)) return;
    this.remember(id, await read(id));
  }

  rollback(): void {
    if (this.beforeImages.size === 0) return;
    // Parte do estado CORRENTE (no instante da falha), não do snapshot do início: escrita alheia
    // commitada durante a unidade, em linha que a unidade não tocou, SOBREVIVE.
    const rows = new Map(this.store.snapshotTenantForUow(this.tenantId).map((row) => [row.id, row]));
    for (const [id, image] of this.beforeImages) {
      if (image === undefined) rows.delete(id);
      else rows.set(id, image);
    }
    this.store.restoreTenantForUow(this.tenantId, [...rows.values()]);
  }
}

function journaledTitles(base: InMemoryFinancialTitleRepository, journal: TenantRowJournal<FinancialTitle>): FinancialTitleRepository {
  return {
    // ---- escritas: before-image ANTES de mutar ----
    create: async (input) => {
      const created = await base.create(input);
      journal.remember(created.id, undefined); // não existia
      return created;
    },
    update: async (input) => {
      await journal.rememberById(input.financialTitleId, (id) => base.findById(input.tenantId, id));
      return base.update(input);
    },
    changeStatus: async (input) => {
      await journal.rememberById(input.financialTitleId, (id) => base.findById(input.tenantId, id));
      return base.changeStatus(input);
    },
    applyPayment: async (input) => {
      await journal.rememberById(input.financialTitleId, (id) => base.findById(input.tenantId, id));
      return base.applyPayment(input);
    },
    applyPaymentGuarded: async (input) => {
      await journal.rememberById(input.financialTitleId, (id) => base.findById(input.tenantId, id));
      return base.applyPaymentGuarded(input);
    },
    restorePaymentGuarded: async (input) => {
      await journal.rememberById(input.financialTitleId, (id) => base.findById(input.tenantId, id));
      return base.restorePaymentGuarded(input);
    },
    softDelete: async (tenantId, financialTitleId, deletedBy) => {
      await journal.rememberById(financialTitleId, (id) => base.findById(tenantId, id));
      return base.softDelete(tenantId, financialTitleId, deletedBy);
    },
    // ---- leituras: delegação pura ----
    list: (input) => base.list(input),
    findById: (tenantId, financialTitleId) => base.findById(tenantId, financialTitleId),
    findActiveByWorkOrder: (tenantId, workOrderId, direction) => base.findActiveByWorkOrder(tenantId, workOrderId, direction),
    findActiveBySource: (tenantId, sourceType, sourceId, direction) => base.findActiveBySource(tenantId, sourceType, sourceId, direction),
    findByIdForUpdate: (tenantId, financialTitleId) => base.findByIdForUpdate(tenantId, financialTitleId),
  };
}

function journaledEntries(base: InMemoryFinancialEntryRepository, journal: TenantRowJournal<FinancialEntry>): FinancialEntryRepository {
  return {
    create: async (input) => {
      const created = await base.create(input);
      journal.remember(created.id, undefined);
      return created;
    },
    update: async (input) => {
      await journal.rememberById(input.financialEntryId, (id) => base.findById(input.tenantId, id));
      return base.update(input);
    },
    reconcile: async (input) => {
      await journal.rememberById(input.financialEntryId, (id) => base.findById(input.tenantId, id));
      return base.reconcile(input);
    },
    softDelete: async (tenantId, financialEntryId, deletedBy) => {
      await journal.rememberById(financialEntryId, (id) => base.findById(tenantId, id));
      return base.softDelete(tenantId, financialEntryId, deletedBy);
    },
    list: (input) => base.list(input),
    findById: (tenantId, financialEntryId) => base.findById(tenantId, financialEntryId),
    findActiveReversalOf: (tenantId, originalEntryId) => base.findActiveReversalOf(tenantId, originalEntryId),
    findByIdForUpdate: (tenantId, financialEntryId) => base.findByIdForUpdate(tenantId, financialEntryId),
    sumByAccount: (tenantId, accountId) => base.sumByAccount(tenantId, accountId),
  };
}

function journaledCheques(base: InMemoryChequeRepository, journal: TenantRowJournal<Cheque>): ChequeRepository {
  return {
    create: async (input) => {
      const created = await base.create(input);
      journal.remember(created.id, undefined);
      return created;
    },
    update: async (input) => {
      await journal.rememberById(input.chequeId, (id) => base.findById(input.tenantId, id));
      return base.update(input);
    },
    transition: async (input) => {
      await journal.rememberById(input.chequeId, (id) => base.findById(input.tenantId, id));
      return base.transition(input);
    },
    softDelete: async (tenantId, chequeId, deletedBy) => {
      await journal.rememberById(chequeId, (id) => base.findById(tenantId, id));
      return base.softDelete(tenantId, chequeId, deletedBy);
    },
    attachClearingEntry: async (tenantId, chequeId, entryId, updatedBy) => {
      await journal.rememberById(chequeId, (id) => base.findById(tenantId, id));
      return base.attachClearingEntry(tenantId, chequeId, entryId, updatedBy);
    },
    attachBounceEntry: async (tenantId, chequeId, entryId, updatedBy) => {
      await journal.rememberById(chequeId, (id) => base.findById(tenantId, id));
      return base.attachBounceEntry(tenantId, chequeId, entryId, updatedBy);
    },
    list: (input) => base.list(input),
    findById: (tenantId, chequeId) => base.findById(tenantId, chequeId),
    findActiveByLinkedEntry: (tenantId, entryId) => base.findActiveByLinkedEntry(tenantId, entryId),
  };
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
    const [titleModule, entryModule, chequeModule] = await Promise.all([
      import("../financial-titles/financial-title.service.js"),
      import("../financial-entries/financial-entry.service.js"),
      import("../cheques/cheque.service.js"),
    ]);
    return createMemoryFinancialUnitOfWork({
      titles: titleModule.getMemoryFinancialTitleRepositoryForTests(),
      entries: entryModule.getMemoryFinancialEntryRepositoryForTests(),
      cheques: chequeModule.getMemoryChequeRepositoryForTests(),
      periodCloses: titleModule.getMemoryFinancialPeriodCloseRepositoryForTests(),
    });
  }
  const { createPrismaFinancialUnitOfWork } = await import("./financial-uow-prisma.js");
  return createPrismaFinancialUnitOfWork();
}
