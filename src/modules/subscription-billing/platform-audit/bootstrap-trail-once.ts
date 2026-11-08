// B-ASS-05b — a trilha de plataforma dos planos no banco, com `plans.bootstrapped_by_migration` gravada UMA vez.
//
// O `PlansService` marca a trilha de bootstrap como gravada só na memória do processo
// (`bootstrappedTrailRecorded`): cada reinício gravaria outra linha. Este escritor consulta `platform_audit_logs`
// por essa ação antes de gravar e não grava se ela já existir. As outras ações passam direto para o escritor de
// baixo, que filtra a metadata pela allowlist própria (`audit-metadata.ts`).
//
// Residual declarado: dois processos subindo ao mesmo tempo podem, os dois, não achar a linha e gravar uma cada.
// Fechar isso pede índice único na tabela, e este bloco não tem migração.

import type { PrismaClient } from "@prisma/client";

import type { PlatformAuditEntry, PlatformAuditWriter } from "../plans/platform-audit.js";
import { PrismaPlatformAuditWriter } from "./platform-audit.prisma.js";

export const PLANS_BOOTSTRAP_TRAIL_ACTION = "plans.bootstrapped_by_migration";

export class BootstrapTrailOnceWriter implements PlatformAuditWriter {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly inner: PlatformAuditWriter = new PrismaPlatformAuditWriter(prisma),
  ) {}

  async record(entry: PlatformAuditEntry): Promise<void> {
    if (entry.action === PLANS_BOOTSTRAP_TRAIL_ACTION) {
      const existing = await this.prisma.platformAuditLog.findFirst({
        where: { action: PLANS_BOOTSTRAP_TRAIL_ACTION },
        select: { id: true },
      });
      if (existing) return;
    }
    await this.inner.record(entry);
  }
}
