// B-TRC-01 · resolução do dispositivo (plano v2.1 §4.2, §4.3; B-02, B-03, A2-06).
//
// A organização NUNCA vem do payload. A resolução tem duas fases:
//   FASE 1, descoberta — barata e NÃO autoritativa: dica em memória → senão as organizações ativas, uma sondagem por
//     organização sob o GUC dela (`findFirstTenantRls`, somente leitura, canário), PARANDO no primeiro achado;
//   FASE 2, confirmação — a AUTORIDADE: o `confirm` de quem chama roda sob `withTenantRlsBudget` e trava o vínculo
//     com `FOR SHARE`. Confirmação com zero linhas derruba a dica e, se restar ≥ 1 s do orçamento, refaz descoberta +
//     confirmação UMA vez; zero de novo → dispositivo não mapeado; sem orçamento → indisponível (503).
// Custo limitado:
//   - dica positiva por (instância, dispositivo), validade DESLIZANTE: cada confirmação bem-sucedida a renova (A2-06);
//   - cache negativo para dispositivo sem vínculo: o envio seguinte no prazo não varre de novo;
//   - os dois com no máximo `cacheMax` entradas (sai a mais antiga);
//   - teto de organizações ativas (`maxTenants`): acima dele a descoberta NÃO roda (`budget_exceeded`, quarentena
//     durável), nunca uma organização adivinhada. A partir de 80 % do teto, aviso no log a cada descoberta.
// Reinício do processo zera as dicas (memória do processo): declarado em §4.3.

import type { PrismaClient } from "@prisma/client";

import { findFirstTenantRls, TenantRowsLeakError } from "../../database/rls.js";
import { TraccarIngestionRepository, type TraccarDeviceKey } from "./traccar-ingestion.repository.js";

export type TraccarDiscoveryPorts = {
  countActiveTenants(): Promise<number>;
  listActiveTenantIds(): Promise<readonly string[]>;
  findBoundTenant(tenantIds: readonly string[], key: TraccarDeviceKey): Promise<string | null>;
};

export type TraccarConfirmResult<T> = { readonly kind: "confirmed"; readonly value: T } | { readonly kind: "not_bound" };

export type TraccarResolveOutcome<T> =
  | { readonly kind: "confirmed"; readonly tenantId: string; readonly value: T; readonly via: "hint" | "discovery" }
  | { readonly kind: "unmapped" }
  | { readonly kind: "budget_exceeded"; readonly activeTenants: number }
  | { readonly kind: "unavailable"; readonly reason: "rows_from_another_tenant" | "deadline" };

export type TraccarResolutionLogger = {
  info(object: Record<string, unknown>, message: string): void;
  warn(object: Record<string, unknown>, message: string): void;
};

export type TraccarResolverOptions = {
  readonly maxTenants: number;
  readonly hintTtlMs: number;
  readonly negativeTtlMs: number;
  readonly cacheMax: number;
  readonly now?: () => number;
  readonly logger?: TraccarResolutionLogger;
};

export const TRACCAR_RESOLVE_RETRY_MIN_REMAINING_MS = 1_000;
export const TRACCAR_RESOLVE_CAPACITY_WARNING_RATIO = 0.8;

type Hint = { readonly tenantId: string; readonly expiresAt: number };

function cacheKey(key: TraccarDeviceKey): string {
  return `${key.instanceKey}\u0000${key.externalDeviceKey}`;
}

export class TraccarTenantResolver {
  private readonly hints = new Map<string, Hint>();
  private readonly negatives = new Map<string, number>();
  private readonly now: () => number;

  constructor(
    private readonly ports: TraccarDiscoveryPorts,
    private readonly options: TraccarResolverOptions,
  ) {
    this.now = options.now ?? (() => Date.now());
  }

  async resolve<T>(
    key: TraccarDeviceKey,
    confirm: (tenantId: string) => Promise<TraccarConfirmResult<T>>,
    deadline: number,
  ): Promise<TraccarResolveOutcome<T>> {
    const id = cacheKey(key);
    const hint = this.validHint(id);

    if (hint) {
      const confirmed = await confirm(hint.tenantId);
      if (confirmed.kind === "confirmed") {
        this.rememberHint(id, hint.tenantId);
        return { kind: "confirmed", tenantId: hint.tenantId, value: confirmed.value, via: "hint" };
      }
      // Dica envenenada ou velha: a confirmação (a autoridade) não achou o vínculo nessa organização.
      this.hints.delete(id);
      return this.retryAfterNotBound(id, key, confirm, deadline);
    }

    if (this.negativeValid(id)) {
      return { kind: "unmapped" };
    }

    const first = await this.discover(id, key, confirm);
    if (first.kind !== "not_bound") return first;
    return this.retryAfterNotBound(id, key, confirm, deadline);
  }

  /** Para o log de início (§4.3, A2-06): organizações ativas contra o teto. */
  async reportCapacity(): Promise<number> {
    const active = await this.ports.countActiveTenants();
    this.observeCapacity(active, "startup");
    return active;
  }

  cacheSizes(): { readonly hints: number; readonly negatives: number } {
    return { hints: this.hints.size, negatives: this.negatives.size };
  }

  private async retryAfterNotBound<T>(
    id: string,
    key: TraccarDeviceKey,
    confirm: (tenantId: string) => Promise<TraccarConfirmResult<T>>,
    deadline: number,
  ): Promise<TraccarResolveOutcome<T>> {
    if (deadline - this.now() < TRACCAR_RESOLVE_RETRY_MIN_REMAINING_MS) {
      return { kind: "unavailable", reason: "deadline" };
    }
    const second = await this.discover(id, key, confirm);
    return second.kind === "not_bound" ? { kind: "unmapped" } : second;
  }

  private async discover<T>(
    id: string,
    key: TraccarDeviceKey,
    confirm: (tenantId: string) => Promise<TraccarConfirmResult<T>>,
  ): Promise<TraccarResolveOutcome<T> | { readonly kind: "not_bound" }> {
    const active = await this.ports.countActiveTenants();
    this.observeCapacity(active, "discovery");
    if (active > this.options.maxTenants) {
      return { kind: "budget_exceeded", activeTenants: active };
    }

    const tenantIds = await this.ports.listActiveTenantIds();
    if (tenantIds.length > this.options.maxTenants) {
      return { kind: "budget_exceeded", activeTenants: tenantIds.length };
    }

    let found: string | null;
    try {
      found = await this.ports.findBoundTenant(tenantIds, key);
    } catch (error) {
      if (error instanceof TenantRowsLeakError) {
        this.options.logger?.warn({ code: error.code }, "Traccar resolution canary tripped");
        return { kind: "unavailable", reason: "rows_from_another_tenant" };
      }
      throw error;
    }

    if (found === null) {
      this.rememberNegative(id);
      return { kind: "unmapped" };
    }

    const confirmed = await confirm(found);
    if (confirmed.kind === "confirmed") {
      this.negatives.delete(id);
      this.rememberHint(id, found);
      return { kind: "confirmed", tenantId: found, value: confirmed.value, via: "discovery" };
    }
    return { kind: "not_bound" };
  }

  private observeCapacity(active: number, phase: "startup" | "discovery"): void {
    const ratio = this.options.maxTenants > 0 ? active / this.options.maxTenants : 1;
    const fields = { phase, activeTenants: active, maxTenants: this.options.maxTenants, ratio: Number(ratio.toFixed(3)) };
    if (ratio >= TRACCAR_RESOLVE_CAPACITY_WARNING_RATIO) {
      this.options.logger?.warn(fields, "Traccar resolution: active organizations at or above 80% of the discovery cap");
    } else if (phase === "startup") {
      this.options.logger?.info(fields, "Traccar resolution: active organizations against the discovery cap");
    }
  }

  private validHint(id: string): Hint | undefined {
    const hint = this.hints.get(id);
    if (!hint) return undefined;
    if (hint.expiresAt <= this.now()) {
      this.hints.delete(id);
      return undefined;
    }
    return hint;
  }

  private rememberHint(id: string, tenantId: string): void {
    this.hints.delete(id);
    this.evictIfFull(this.hints);
    this.hints.set(id, { tenantId, expiresAt: this.now() + this.options.hintTtlMs });
  }

  private negativeValid(id: string): boolean {
    const expiresAt = this.negatives.get(id);
    if (expiresAt === undefined) return false;
    if (expiresAt <= this.now()) {
      this.negatives.delete(id);
      return false;
    }
    return true;
  }

  private rememberNegative(id: string): void {
    this.negatives.delete(id);
    this.evictIfFull(this.negatives);
    this.negatives.set(id, this.now() + this.options.negativeTtlMs);
  }

  private evictIfFull(map: Map<string, unknown>): void {
    while (map.size >= Math.max(1, this.options.cacheMax)) {
      const oldest = map.keys().next();
      if (oldest.done) return;
      map.delete(oldest.value);
    }
  }
}

/**
 * As portas reais da descoberta. A lista vem de `tenants` (tabela global, sem RLS, já enumerada pelo produto); cada
 * sondagem roda sob o GUC da PRÓPRIA organização, dentro de `findFirstTenantRls` (somente leitura, canário, parada
 * no primeiro achado). Nenhuma leitura cross-tenant nova.
 */
export function createPrismaDiscoveryPorts(
  client: PrismaClient,
  budget: { readonly maxWait: number; readonly timeout: number },
): TraccarDiscoveryPorts {
  return {
    countActiveTenants: () => client.tenant.count({ where: { status: "active" } }),
    async listActiveTenantIds() {
      const rows = await client.tenant.findMany({
        where: { status: "active" },
        select: { id: true },
        orderBy: [{ created_at: "asc" }, { id: "asc" }],
      });
      return rows.map((row) => row.id);
    },
    async findBoundTenant(tenantIds, key) {
      const found = await findFirstTenantRls(
        client,
        tenantIds,
        (tx) => new TraccarIngestionRepository(tx).probeActiveBinding(key),
        { ...budget, table: "vehicle_tracking_bindings" },
      );
      return found?.tenantId ?? null;
    },
  };
}
