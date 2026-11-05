// B-ASS-02 — vínculo plano → módulo (R-PLAN-3, G16). Escreve `tenants.modules` no Postgres a cada
// atribuição de assinatura e a cada versão que entra em vigência. O caminho de escrita usa
// `prisma.tenant.update` (o TenantRepository só expõe `create`; PREMISSA FALSA registrada no relatório).
// Organização sem assinatura → `tenants.modules` NÃO é tocado (o serviço simplesmente não chama).

export interface TenantModulesWriter {
  writeModules(tenantId: string, modules: readonly string[]): Promise<void>;
}

export interface PlanVersionModulesSynchronizer {
  syncVersionEnteringToday(planId: string, modules: readonly string[], effectiveAt: Date): Promise<void>;
}

// Recalcula somente as organizacoes cuja assinatura vigente usa o plano alterado. A leitura
// cross-tenant continua delegada ao repositorio Prisma, que percorre cada tenant com GUC/RLS.
export class TenantModulesSynchronizer implements PlanVersionModulesSynchronizer {
  constructor(
    private readonly subscriptions: import("./subscriptions.repository.js").SubscriptionsRepository,
    private readonly plans: import("./plans.repository.js").PlansRepository,
    private readonly writer: TenantModulesWriter,
  ) {}

  async syncVersionEnteringToday(
    planId: string,
    modules: readonly string[],
    effectiveAt: Date,
  ): Promise<void> {
    const active = (await this.subscriptions.listActiveSubscriptions()).filter(
      (subscription) => subscription.planId === planId,
    );
    for (const subscription of active) {
      const addonModules: string[] = [];
      for (const addon of await this.subscriptions.listActiveAddons(
        subscription.tenantId,
        subscription.id,
      )) {
        const versions = await this.plans.listVersions(addon.planId);
        const version = versions.find(
          (candidate) =>
            candidate.validFrom.getTime() <= effectiveAt.getTime() &&
            (candidate.validTo === null || effectiveAt.getTime() < candidate.validTo.getTime()),
        );
        if (version) addonModules.push(...version.modules);
      }
      await this.writer.writeModules(subscription.tenantId, [
        ...new Set([...modules, ...addonModules]),
      ]);
    }
  }
}

// Dublê de teste: grava as chamadas para o teste de memória provar "chamou/não chamou".
export class RecordingTenantModulesWriter implements TenantModulesWriter {
  readonly calls: Array<{ readonly tenantId: string; readonly modules: readonly string[] }> = [];

  async writeModules(tenantId: string, modules: readonly string[]): Promise<void> {
    this.calls.push({ tenantId, modules: [...modules] });
  }
}
