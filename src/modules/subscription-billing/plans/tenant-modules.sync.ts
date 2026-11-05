// B-ASS-02 — vínculo plano → módulo (R-PLAN-3, G16). Escreve `tenants.modules` no Postgres a cada
// atribuição de assinatura e a cada versão que entra em vigência. O caminho de escrita usa
// `prisma.tenant.update` (o TenantRepository só expõe `create`; PREMISSA FALSA registrada no relatório).
// Organização sem assinatura → `tenants.modules` NÃO é tocado (o serviço simplesmente não chama).

export interface TenantModulesWriter {
  writeModules(tenantId: string, modules: readonly string[]): Promise<void>;
}

// Dublê de teste: grava as chamadas para o teste de memória provar "chamou/não chamou".
export class RecordingTenantModulesWriter implements TenantModulesWriter {
  readonly calls: Array<{ readonly tenantId: string; readonly modules: readonly string[] }> = [];

  async writeModules(tenantId: string, modules: readonly string[]): Promise<void> {
    this.calls.push({ tenantId, modules: [...modules] });
  }
}
