import type { CycleCountRepository } from "./cycle-count.repository.js";
import type { InventoryRepository } from "./inventory.repository.js";

// -----------------------------------------------------------------------------------------------
// B-O6R-04a (Ω6R-DAT-003, emenda 2-h) — PORTA de Unit of Work do estoque (espelho de src/modules/financial-uow/).
//
// Contrato: `run(tenantId, work)` executa `work` como UMA unidade tenant-scoped. O fechamento de contagem roda
// UMA unidade POR ITEM: sessão `FOR UPDATE` → releitura da entrada → ajuste (o `createMovement` trava o item
// DENTRO da mesma transação) → carimbo. Tudo que a unidade escrever commita junto ou morre junto. A unidade
// segura UM item por dezenas de milissegundos — cabe no timeout de 5 s do `$transaction` para qualquer N até o
// SNAPSHOT_LIMIT, e o estado intermediário (`fechando` + carimbos) é persistido e retomável.
//
// Duas implementações, mesma porta:
//   · Prisma (inventory-uow-prisma.ts) — transação REAL (withTenantRls). A ÚNICA evidência de atomicidade.
//   · Memória (abaixo) — DUBLÊ: mutex por tenant, SEM journal (emenda 1-e). Não prova nada; mantém as provas em
//     memória do contrato vivas. A prova real é a suíte -db (tests/inventory-cycle-count-close-units-db.test.ts).
// -----------------------------------------------------------------------------------------------

export interface InventoryUowContext {
  readonly inventory: InventoryRepository;
  readonly cycleCounts: CycleCountRepository;
}

export interface InventoryUnitOfWork {
  run<T>(tenantId: string, work: (ctx: InventoryUowContext) => Promise<T>): Promise<T>;
}

export class MemoryInventoryUnitOfWork implements InventoryUnitOfWork {
  private readonly tenantMutex = new Map<string, Promise<void>>();

  constructor(
    private readonly inventory: InventoryRepository,
    private readonly cycleCounts: CycleCountRepository,
  ) {}

  async run<T>(tenantId: string, work: (ctx: InventoryUowContext) => Promise<T>): Promise<T> {
    const previous = this.tenantMutex.get(tenantId) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    const chained = previous.then(() => current);
    this.tenantMutex.set(tenantId, chained);

    await previous;
    try {
      return await work({ inventory: this.inventory, cycleCounts: this.cycleCounts });
    } finally {
      release();
      if (this.tenantMutex.get(tenantId) === chained) {
        this.tenantMutex.delete(tenantId);
      }
    }
  }
}
