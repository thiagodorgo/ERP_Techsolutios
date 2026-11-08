// B-ASS-05 · F6 — a trilha de PLATAFORMA no PostgreSQL (`platform_audit_logs`, M4). Cumpre o contrato do B-ASS-02
// (`PlatformAuditWriter`). A metadata passa de novo pela allowlist própria (`pickBillingAuditMetadata`) antes de
// gravar — quem chama já filtra; aqui é a segunda trava, para o que chegar sem filtro.

import type { Prisma, PrismaClient } from "@prisma/client";

import type { PlatformAuditEntry, PlatformAuditWriter } from "../plans/platform-audit.js";
import { pickBillingAuditMetadata } from "./audit-metadata.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class PrismaPlatformAuditWriter implements PlatformAuditWriter {
  constructor(private readonly prisma: PrismaClient) {}

  async record(entry: PlatformAuditEntry): Promise<void> {
    const metadata = pickBillingAuditMetadata(entry.metadata ?? {});
    const actor = typeof metadata.actor_user_id === "string" && UUID.test(metadata.actor_user_id) ? metadata.actor_user_id : null;
    await this.prisma.platformAuditLog.create({
      data: {
        actor_user_id: actor,
        action: entry.action,
        entity: entry.entity,
        entity_id: entry.entityId ?? null,
        // A allowlist só deixa passar texto, número, null e listas de uuid: tudo JSON.
        metadata: { ...metadata } as Prisma.InputJsonObject,
      },
    });
  }
}
