// Ω4C PR-04 (D-Ω4C-NOTIF-CENTRAL-SPLIT) — tipos do motor de notificações AGENDÁVEIS no frontend. Enums em
// INGLÊS (contrato do backend, /notifications/scheduled); os rótulos PT-BR (Privada/Pública/Personalizada,
// Pendente/Disparada/Cancelada) só existem na fronteira de apresentação (adapter). §2.8/LGPD: a view
// surfaceada NÃO carrega tenant_id/client_action_id/custom_recipient_ids/source_id crus.

export type ScheduledNotificationVisibility = "private" | "public" | "custom";
export type ScheduledNotificationStatus = "pending" | "fired" | "cancelled";
export type ScheduledNotificationSourceType =
  | "maintenance_item"
  | "fine"
  | "insurance_policy"
  | "financial_title"
  | "manual";

// Projeção mínima exibida na lista do criador (§2.8 — só o necessário para render, sem ids sensíveis).
export type ScheduledNotificationView = {
  readonly id: string;
  readonly title: string;
  readonly message: string;
  readonly notifyAt: string;
  readonly remindBeforeMinutes: number | null;
  readonly visibility: ScheduledNotificationVisibility;
  readonly status: ScheduledNotificationStatus;
  readonly createdAt: string;
};

export type ScheduledNotificationSource = "api" | "mock" | "fallback";

export type ScheduledNotificationListResult = {
  readonly items: ScheduledNotificationView[];
  readonly source: ScheduledNotificationSource;
  readonly forbidden: boolean;
};

// Intenção do popup de criação. notifyAt é o naïve "YYYY-MM-DDTHH:mm" (ancorado ao fuso de negócio no backend).
export type CreateScheduledNotificationInput = {
  readonly title: string;
  readonly message: string;
  readonly notifyAt: string;
  readonly remindBeforeMinutes?: number | null;
  readonly visibility: ScheduledNotificationVisibility;
  readonly customRecipientIds?: readonly string[];
  readonly sourceType?: ScheduledNotificationSourceType;
  readonly sourceId?: string;
};

// §2.8 — candidato do picker PERSONALIZADA: SÓ id + nome (nunca e-mail/papel/dado sensível).
export type RecipientOption = {
  readonly id: string;
  readonly name: string;
};

export type RecipientCandidatesResult = {
  readonly items: RecipientOption[];
  readonly unavailable: boolean;
};
