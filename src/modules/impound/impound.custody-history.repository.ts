import type { CustodyHistoryItem } from "./impound.custody-history.types.js";

export interface ImpoundCustodyHistoryRepository {
  // Lista TODOS os processos que compartilham a identidade do processo alvo (incluindo o próprio, `isCurrent`).
  // Sem identidade resolvida → só o próprio processo (custódia única na base). Ordenado por entrada (mais recente
  // primeiro). Sempre tenant-scoped (nunca vaza cross-tenant). Processo inexistente no tenant → lista VAZIA (o
  // service traduz para 404): um processo existente SEMPRE inclui a si mesmo, então vazio ⟺ não-encontrado.
  listCustodyHistory(tenantId: string, processId: string): Promise<readonly CustodyHistoryItem[]>;

  reset?(): void;
}

// Registro de processo para os testes em memória — carrega o `identityId` (interno, usado só para agrupar; nunca
// sai no DTO) além dos campos do resumo.
export type RegisterHistoryProcessInput = {
  readonly tenantId: string;
  readonly id: string;
  readonly identityId?: string;
  readonly vehiclePlate?: string;
  readonly vehicleUnidentified?: boolean;
  readonly status: string;
  readonly enteredAt?: Date;
  readonly yardName?: string;
};

type StoredProcess = RegisterHistoryProcessInput & { readonly vehicleUnidentified: boolean };

export class InMemoryImpoundCustodyHistoryRepository implements ImpoundCustodyHistoryRepository {
  private readonly processes = new Map<string, StoredProcess>(); // key = `${tenantId}:${id}`

  async listCustodyHistory(tenantId: string, processId: string): Promise<readonly CustodyHistoryItem[]> {
    const target = this.processes.get(`${tenantId}:${processId}`);
    if (!target) return [];
    const siblings = target.identityId
      ? [...this.processes.values()].filter((p) => p.tenantId === tenantId && p.identityId === target.identityId)
      : [target];
    return siblings
      .map((p) => toItem(p, processId))
      .sort((a, b) => (b.enteredAt?.getTime() ?? 0) - (a.enteredAt?.getTime() ?? 0));
  }

  registerProcessForTests(input: RegisterHistoryProcessInput): void {
    this.processes.set(`${input.tenantId}:${input.id}`, { ...input, vehicleUnidentified: input.vehicleUnidentified ?? false });
  }

  reset(): void {
    this.processes.clear();
  }
}

function toItem(p: StoredProcess, currentId: string): CustodyHistoryItem {
  return {
    id: p.id,
    vehiclePlate: p.vehiclePlate,
    vehicleUnidentified: p.vehicleUnidentified,
    status: p.status,
    enteredAt: p.enteredAt,
    yardName: p.yardName,
    isCurrent: p.id === currentId,
  };
}
