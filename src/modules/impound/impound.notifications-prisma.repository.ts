import type { Prisma, PrismaClient } from "@prisma/client";

import { withTenantRls } from "../../database/rls.js";
import type { ProfileScope } from "../jurisdiction/jurisdiction.types.js";
import { computeEventHash, genesisHash } from "./impound.hashchain.js";
import type { CanonicalValue, CustodyEventType } from "./impound.types.js";
import {
  buildNotificationEventPayload,
  type NotificationEventAction,
  type NotificationRepository,
} from "./impound.notifications.repository.js";
import {
  NotificationError,
  type IssueNotificationInput,
  type ListNotificationsInput,
  type MarkDueInput,
  type MarkDueResult,
  type NotificationChannel,
  type NotificationKind,
  type NotificationScheduleContext,
  type NotificationStatus,
  type ProcessNotification,
  type WaiveNotificationInput,
} from "./impound.notifications.types.js";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

type LockedProcessRow = {
  readonly custody_seq_head: number;
  readonly custody_hash_head: string | null;
};

// Repositório de baixo nível sobre um executor de tx. markDue/issue/waive rodam FOR UPDATE do processo + INSERT/
// UPDATE da projeção + append do CustodyEvent NOTIFICATION (RÉPLICA FIEL de charge-prisma:appendChargeEventTx
// reusando só as PURAS computeEventHash/genesisHash — D-Ω5P-NOTIF-01: NÃO edita o código probatório mergeado do
// impound) — tudo na MESMA tx (RLS wrapper).
export class PrismaNotificationRepository implements NotificationRepository {
  constructor(private readonly client: PrismaExecutor) {}

  async listNotifications(input: ListNotificationsInput): Promise<readonly ProcessNotification[]> {
    const rows = await this.client.processNotification.findMany({
      where: { tenant_id: input.tenantId, process_id: input.processId },
      orderBy: [{ due_at: "asc" }, { created_at: "asc" }],
    });
    return rows.map(mapNotification);
  }

  async findNotificationById(tenantId: string, notificationId: string): Promise<ProcessNotification | undefined> {
    const row = await this.client.processNotification.findFirst({ where: { tenant_id: tenantId, id: notificationId } });
    return row ? mapNotification(row) : undefined;
  }

  async markDue(input: MarkDueInput): Promise<MarkDueResult> {
    const locked = await this.lockProcess(input.tenantId, input.processId);
    if (!locked) {
      throw new NotificationError(404, "NOTIFICATION_PROCESS_NOT_FOUND", "process_not_found", "Custody process was not found.");
    }
    // Idempotência: sob o lock do processo, re-checa a existência do (tenant,process,kind). O índice único raw-only
    // process_notifications_kind_idem_key é o backstop de DB — nunca é ALCANÇADO sob o lock (serializa os ticks).
    const existing = await this.client.$queryRaw<Array<{ one: number }>>`
      SELECT 1 AS one FROM process_notifications
      WHERE tenant_id = ${input.tenantId}::uuid AND process_id = ${input.processId}::uuid AND kind = ${input.kind}
      LIMIT 1
    `;
    if (existing.length > 0) return { created: false };

    let row;
    try {
      row = await this.client.processNotification.create({
        data: {
          tenant_id: input.tenantId,
          process_id: input.processId,
          kind: input.kind,
          status: "DUE",
          due_at: input.dueAt,
          created_by: input.actorId ?? null,
          updated_by: input.actorId ?? null,
        },
      });
    } catch (error) {
      // Backstop: corrida que fure o lock (não deveria) → 23505 no índice de idempotência → no-op.
      if (isUniqueViolation(error)) return { created: false };
      throw error;
    }
    const notification = mapNotification(row);
    await this.appendNotificationEventTx(input.tenantId, input.processId, locked, notification, "due", input.occurredAt, input.actorId);
    return { created: true, notification };
  }

  async issue(input: IssueNotificationInput): Promise<ProcessNotification> {
    const locked = await this.lockProcess(input.tenantId, input.processId);
    if (!locked) {
      throw new NotificationError(404, "NOTIFICATION_PROCESS_NOT_FOUND", "process_not_found", "Custody process was not found.");
    }
    // updateMany (escopado por tenant+id+process+status=DUE) — a guarda de status vive no WHERE: 0 linhas ⇒ já
    // ISSUED/WAIVED ou inexistente (409/404). Nunca reescreve uma emissão (projeção DUE→ISSUED, como settled_*).
    const updated = await this.client.processNotification.updateManyAndReturn({
      where: { tenant_id: input.tenantId, id: input.notificationId, process_id: input.processId, status: "DUE" },
      data: {
        status: "ISSUED",
        issued_at: input.issuedAt,
        channel: input.channel,
        recipient_ref: input.recipientRef ?? null,
        updated_by: input.actorId ?? null,
      },
    });
    if (updated.length === 0) {
      await this.assertIssuableConflict(input.tenantId, input.notificationId, input.processId);
      // assertIssuableConflict sempre lança; este throw é só p/ o compilador.
      throw new NotificationError(409, "NOTIFICATION_CONFLICT", "not_due", "Only a DUE notification can be issued.");
    }
    const notification = mapNotification(updated[0]);
    // Comprovante OPCIONAL (Attachment polimórfico, entity_type="process_notification"). §2.8: file_url/storage_key
    // ficam SÓ no Attachment; nunca no payload do evento nem no audit.
    if (input.comprovante) {
      await this.client.attachment.create({
        data: {
          tenant_id: input.tenantId,
          entity_type: "process_notification",
          entity_id: input.notificationId,
          file_name: input.comprovante.fileName ?? null,
          content_type: input.comprovante.contentType ?? null,
          checksum_sha256: input.comprovante.checksumSha256 ?? null,
          storage_provider: input.comprovante.storageProvider ?? null,
          storage_key: input.comprovante.storageKey ?? null,
          file_url: input.comprovante.fileUrl,
          status: "stored",
          metadata: { kind: notification.kind, channel: notification.channel ?? null },
          uploaded_by: input.actorId ?? null,
          created_by: input.actorId ?? null,
        },
      });
    }
    await this.appendNotificationEventTx(input.tenantId, input.processId, locked, notification, "issued", input.occurredAt, input.actorId);
    return notification;
  }

  async waive(input: WaiveNotificationInput): Promise<ProcessNotification> {
    const locked = await this.lockProcess(input.tenantId, input.processId);
    if (!locked) {
      throw new NotificationError(404, "NOTIFICATION_PROCESS_NOT_FOUND", "process_not_found", "Custody process was not found.");
    }
    const updated = await this.client.processNotification.updateManyAndReturn({
      where: { tenant_id: input.tenantId, id: input.notificationId, process_id: input.processId, status: "DUE" },
      data: { status: "WAIVED", reason: input.reason, updated_by: input.actorId ?? null },
    });
    if (updated.length === 0) {
      await this.assertIssuableConflict(input.tenantId, input.notificationId, input.processId);
      throw new NotificationError(409, "NOTIFICATION_CONFLICT", "not_due", "Only a DUE notification can be waived.");
    }
    const notification = mapNotification(updated[0]);
    await this.appendNotificationEventTx(input.tenantId, input.processId, locked, notification, "waived", input.occurredAt, input.actorId);
    return notification;
  }

  async loadScheduleContext(tenantId: string, processId: string): Promise<NotificationScheduleContext | undefined> {
    const rows = await this.client.$queryRaw<
      Array<{
        entered_at: Date | null;
        frozen_at: Date | null;
        status: string;
        scope: string;
        owner_notif_days: number;
        notice_edict_day: number;
      }>
    >`
      SELECT ip.entered_at, ip.frozen_at, ip.status, jp.scope, jp.owner_notif_days, jp.notice_edict_day
      FROM impound_processes ip
      JOIN jurisdiction_profiles jp ON jp.tenant_id = ip.tenant_id AND jp.id = ip.profile_id
      WHERE ip.tenant_id = ${tenantId}::uuid AND ip.id = ${processId}::uuid
    `;
    const row = rows[0];
    if (!row) return undefined;
    return {
      tenantId,
      processId,
      enteredAt: row.entered_at ?? undefined,
      frozenAt: row.frozen_at ?? undefined,
      status: row.status,
      scope: row.scope as ProfileScope,
      ownerNotifDays: Number(row.owner_notif_days),
      noticeEdictDay: Number(row.notice_edict_day),
    };
  }

  async listNotificationCandidates(tenantId: string, limit: number): Promise<readonly string[]> {
    // Processos com t0 (entered_at), AINDA correndo o rito (frozen_at NULL), NÃO suspensos (status != JUDICIAL_HOLD)
    // e de perfil PÚBLICO (scope=PUBLIC_AGREEMENT — o privado não roda o rito administrativo do art. 328).
    const rows = await this.client.$queryRaw<Array<{ id: string }>>`
      SELECT ip.id
      FROM impound_processes ip
      JOIN jurisdiction_profiles jp ON jp.tenant_id = ip.tenant_id AND jp.id = ip.profile_id
      WHERE ip.tenant_id = ${tenantId}::uuid
        AND ip.entered_at IS NOT NULL AND ip.frozen_at IS NULL
        AND ip.status <> 'JUDICIAL_HOLD'
        AND jp.scope = 'PUBLIC_AGREEMENT'
      ORDER BY ip.entered_at ASC
      LIMIT ${limit}
    `;
    return rows.map((row) => row.id);
  }

  // SELECT ... FOR UPDATE do processo — serializa appends concorrentes no MESMO processo (anti-corrida da cadeia).
  private async lockProcess(tenantId: string, processId: string): Promise<LockedProcessRow | undefined> {
    const rows = await this.client.$queryRaw<LockedProcessRow[]>`
      SELECT custody_seq_head, custody_hash_head
      FROM impound_processes
      WHERE tenant_id = ${tenantId}::uuid AND id = ${processId}::uuid
      FOR UPDATE
    `;
    return rows[0];
  }

  // Distingue 404 (inexistente) de 409 (já ISSUED/WAIVED) quando o updateMany guardado por status=DUE afeta 0 linhas.
  private async assertIssuableConflict(tenantId: string, notificationId: string, processId: string): Promise<never> {
    const existing = await this.client.processNotification.findFirst({
      where: { tenant_id: tenantId, id: notificationId, process_id: processId },
      select: { status: true },
    });
    if (!existing) {
      throw new NotificationError(404, "NOTIFICATION_NOT_FOUND", "notification_not_found", "The notification was not found for this process.");
    }
    throw new NotificationError(409, "NOTIFICATION_CONFLICT", "not_due", "Only a DUE notification can be issued or waived.");
  }

  // RÉPLICA FIEL de charge-prisma.repository.ts:appendChargeEventTx (reusando as PURAS): computa seq/prev/hash,
  // INSERE o custody_event NOTIFICATION (P2002 no seq → 409), atualiza a âncora custody_seq_head/custody_hash_head
  // e grava o cross-anchor em audit_logs (MESMA action/entity/metadata do impound → o verifyChain reconcilia e
  // continua `valid` após NOTIFICATION intercalado). §2.8: payload/audit SEM recipient_ref/PII/tenant_id.
  private async appendNotificationEventTx(
    tenantId: string,
    processId: string,
    head: LockedProcessRow,
    notification: ProcessNotification,
    action: NotificationEventAction,
    occurredAt: Date,
    actorId?: string,
  ): Promise<void> {
    const draft: { readonly type: CustodyEventType; readonly payload: CanonicalValue; readonly occurredAt: Date; readonly actorId?: string } = {
      type: "NOTIFICATION",
      payload: buildNotificationEventPayload(notification, action),
      occurredAt,
      actorId,
    };
    const seq = head.custody_seq_head + 1;
    const prevHash = head.custody_hash_head ?? genesisHash(tenantId, processId);
    const hash = computeEventHash({
      prevHash,
      seq,
      type: draft.type,
      payload: draft.payload,
      occurredAt: draft.occurredAt,
      actorId: draft.actorId ?? null,
    });
    let eventRow;
    try {
      eventRow = await this.client.custodyEvent.create({
        data: {
          tenant_id: tenantId,
          process_id: processId,
          seq,
          type: draft.type,
          payload: draft.payload as Prisma.InputJsonValue,
          occurred_at: draft.occurredAt,
          actor_id: draft.actorId ?? null,
          prev_hash: prevHash,
          hash,
        },
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new NotificationError(409, "NOTIFICATION_CONFLICT", "concurrent_custody_append", "A concurrent custody append raced this one; retry.");
      }
      throw error;
    }
    // Mantém a âncora do agregado sincronizada com a cadeia (denuncia DELETE da ponta).
    await this.client.impoundProcess.update({
      where: { id: processId },
      data: { custody_seq_head: seq, custody_hash_head: hash },
    });
    await this.client.auditLog.create({
      data: {
        tenant_id: tenantId,
        actor_user_id: draft.actorId ?? null,
        action: "impound.custody_event.appended",
        entity: "custody_event",
        entity_id: eventRow.id,
        metadata: { processId, seq, hash },
      },
    });
  }
}

// Wrapper RLS: cada método abre uma tx com app.current_tenant_id. markDue/issue/waive rodam TODO o fluxo (FOR
// UPDATE + insert/update + head + cross-anchor) numa só tx.
export class RlsPrismaNotificationRepository implements NotificationRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  listNotifications(input: ListNotificationsInput): Promise<readonly ProcessNotification[]> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaNotificationRepository(tx).listNotifications(input));
  }

  findNotificationById(tenantId: string, notificationId: string): Promise<ProcessNotification | undefined> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaNotificationRepository(tx).findNotificationById(tenantId, notificationId));
  }

  markDue(input: MarkDueInput): Promise<MarkDueResult> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaNotificationRepository(tx).markDue(input));
  }

  issue(input: IssueNotificationInput): Promise<ProcessNotification> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaNotificationRepository(tx).issue(input));
  }

  waive(input: WaiveNotificationInput): Promise<ProcessNotification> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaNotificationRepository(tx).waive(input));
  }

  loadScheduleContext(tenantId: string, processId: string): Promise<NotificationScheduleContext | undefined> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaNotificationRepository(tx).loadScheduleContext(tenantId, processId));
  }

  listNotificationCandidates(tenantId: string, limit: number): Promise<readonly string[]> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaNotificationRepository(tx).listNotificationCandidates(tenantId, limit));
  }
}

export async function createPrismaNotificationRepository(): Promise<RlsPrismaNotificationRepository> {
  const { prisma } = await import("../../database/prisma.js");
  return new RlsPrismaNotificationRepository(prisma);
}

// ── mapper ──────────────────────────────────────────────────────────────────────────────────────────────────
type NotificationRecord = {
  readonly id: string;
  readonly tenant_id: string;
  readonly process_id: string;
  readonly kind: string;
  readonly status: string;
  readonly due_at: Date;
  readonly issued_at: Date | null;
  readonly channel: string | null;
  readonly recipient_ref: string | null;
  readonly reason: string | null;
  readonly created_by: string | null;
  readonly updated_by: string | null;
  readonly created_at: Date;
  readonly updated_at: Date;
};

function mapNotification(record: NotificationRecord): ProcessNotification {
  return {
    id: record.id,
    tenantId: record.tenant_id,
    processId: record.process_id,
    kind: record.kind as NotificationKind,
    status: record.status as NotificationStatus,
    dueAt: record.due_at,
    issuedAt: record.issued_at ?? undefined,
    channel: (record.channel ?? undefined) as NotificationChannel | undefined,
    recipientRef: record.recipient_ref ?? undefined,
    reason: record.reason ?? undefined,
    createdBy: record.created_by ?? undefined,
    updatedBy: record.updated_by ?? undefined,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const record = error as { readonly code?: unknown; readonly meta?: Record<string, unknown>; readonly message?: unknown };
  if (record.code === "P2002") return true;
  const haystack = `${String(record.code ?? "")} ${String(record.meta?.code ?? "")} ${String(record.meta?.message ?? "")} ${String(record.message ?? "")}`.toLowerCase();
  return haystack.includes("23505") || haystack.includes("process_notifications_kind_idem_key") || haystack.includes("custody_events_tenant_id_process_id_seq_key");
}
