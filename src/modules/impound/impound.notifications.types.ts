import type { Permission, Role } from "../core-saas/permissions/catalog.js";
import type { ProfileScope } from "../jurisdiction/jurisdiction.types.js";

export type NotificationActorContext = {
  readonly tenantId: string;
  readonly userId: string;
  readonly roles: readonly Role[];
  readonly permissions: readonly Permission[];
};

// Ω5P PR-09 — enums em INGLÊS validados na APP (SEM CHECK de enum no banco). Labels PT-BR ficam no DTO.
// OWNER_INITIAL       = notificação inicial ao proprietário (Res. 1025 art. 15, <=10 dias da remoção).
// COMPLEMENTARY_EDICT = edital complementar (Res. 1025 art. 26, após 30 dias sem regularização).
// AUCTION_EDICT       = edital do leilão (Lei 14.133/2021, >=15 d.u.). DECLARADO p/ o gate de leilão (PR-13);
//                       NÃO é agendado por PR-09 (relativo à DATA do certame, não ao t0) — aditivo-friendly.
export const NOTIFICATION_KINDS = ["OWNER_INITIAL", "COMPLEMENTARY_EDICT", "AUCTION_EDICT"] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

// DUE    = SISTEMA marcou como DEVIDA no vencimento (t0 + prazo do perfil). Sem emissão registrada ainda.
// ISSUED = emissão efetiva registrada (ato manual impound:notify; envio real ao destinatário = Ω6).
// WAIVED = dispensa fundamentada (reason obrigatório).
// FAILED = tentativa frustrada registrada (fundamento em reason) — declarado p/ os PRs donos; PR-09 não emite.
export const NOTIFICATION_STATUSES = ["DUE", "ISSUED", "WAIVED", "FAILED"] as const;
export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number];

// Canal do envio (parametrizado; envio real = Ω6). SNE exclusivo >=2027 (Lei 14.440/2022) — só rótulo aqui.
export const NOTIFICATION_CHANNELS = ["POSTAL", "SNE", "EDICT", "IN_PERSON"] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

// Projeção consultável MUTÁVEL (DUE→ISSUED carimba issued_at/channel — como ProcessCharge.settled_*).
export type ProcessNotification = {
  readonly id: string;
  readonly tenantId: string;
  readonly processId: string;
  readonly kind: NotificationKind;
  readonly status: NotificationStatus;
  readonly dueAt: Date;
  readonly issuedAt?: Date;
  readonly channel?: NotificationChannel;
  readonly recipientRef?: string; // MINIMIZADO (§2.8: rótulo/máscara, NUNCA PII/endereço)
  readonly reason?: string;
  readonly createdBy?: string;
  readonly updatedBy?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type ListNotificationsInput = {
  readonly tenantId: string;
  readonly processId: string;
};

// Materialização de UM marco DEVIDO (motor/sweep → repo). Idempotente por (tenant, process, kind).
export type MarkDueInput = {
  readonly tenantId: string;
  readonly processId: string;
  readonly kind: NotificationKind;
  readonly dueAt: Date;
  readonly actorId?: string;
  readonly occurredAt: Date;
};

export type MarkDueResult = {
  readonly created: boolean;
  readonly notification?: ProcessNotification;
};

// Registro MANUAL de emissão (DUE→ISSUED). comprovante = Attachment OPCIONAL (só prisma cria; §2.8: storage_key
// NUNCA exposto). recipientRef já MINIMIZADO no validator.
export type IssueNotificationInput = {
  readonly tenantId: string;
  readonly processId: string;
  readonly notificationId: string;
  readonly channel: NotificationChannel;
  readonly recipientRef?: string;
  readonly issuedAt: Date;
  readonly comprovante?: NotificationAttachmentInput;
  readonly actorId?: string;
  readonly occurredAt: Date;
};

// Comprovante opcional da emissão (Attachment polimórfico, entity_type="process_notification"). §2.8: file_url/
// storage_key nunca vazam ao payload/audit da cadeia.
export type NotificationAttachmentInput = {
  readonly fileUrl: string;
  readonly fileName?: string;
  readonly contentType?: string;
  readonly checksumSha256?: string;
  readonly storageProvider?: string;
  readonly storageKey?: string;
};

// DUE→WAIVED (dispensa fundamentada; reason obrigatório).
export type WaiveNotificationInput = {
  readonly tenantId: string;
  readonly processId: string;
  readonly notificationId: string;
  readonly reason: string;
  readonly actorId?: string;
  readonly occurredAt: Date;
};

// Contexto de agendamento do sweep (impound_processes + jurisdiction_profiles). undefined = processo inexistente.
// Os prazos VÊM do JurisdictionProfile (NUNCA hardcode); scope decide se o rito administrativo corre.
export type NotificationScheduleContext = {
  readonly tenantId: string;
  readonly processId: string;
  readonly enteredAt?: Date;
  readonly frozenAt?: Date;
  readonly status: string;
  readonly scope: ProfileScope;
  readonly ownerNotifDays: number;
  readonly noticeEdictDay: number;
};

export type MarkDueProcessResult = {
  readonly examined: boolean; // false se o processo não tem t0 / não é candidato do rito (scope privado)
  readonly marked: number; // marcos DUE criados neste passe
  readonly errors: number; // marcos pulados por fail-closed (prazo ausente/<=0)
};

export type TenantNotifyScanResult = {
  readonly processed: number;
  readonly marked: number;
  readonly errors: number;
};

export class NotificationError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    readonly reason: string,
    message: string,
  ) {
    super(message);
    this.name = "NotificationError";
  }
}
