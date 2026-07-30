import { computeNotificationSchedule, isNotificationTrailComplete, type NotificationProfile } from "../impound/impound.notifications.js";
import type { ProcessNotification } from "../impound/impound.notifications.types.js";
import type { DeadlineAlert } from "./patios-dashboard.types.js";

// Ω5P PR-20 — REUSA o motor puro de prazos do PR-09 (computeNotificationSchedule/isNotificationTrailComplete)
// para os alertas de prazo do painel — nunca reimplementa o cálculo do prazo aqui (o plano é explícito sobre
// isso). Fonte da verdade continua sendo o JurisdictionProfile (ownerNotifDays/noticeEdictDay); este módulo só
// AGREGA para exibição, não decide nada de negócio.
export type DeadlineAlertSource = {
  readonly processId: string;
  readonly enteredAt: Date;
  readonly profile: NotificationProfile;
  readonly notifications: readonly ProcessNotification[];
};

// Um marco é um "alerta de prazo" quando (a) já passou de devido (dueAt <= now) e (b) ainda não está resolvido
// (ISSUED, ou WAIVED com fundamento) — isNotificationTrailComplete filtra rápido os processos SEM nenhum marco
// pendente; computeNotificationSchedule dá o instante exato de cada marco individual (a trilha inteira pode estar
// incompleta por só 1 marco, não todos).
export function computeDeadlineAlerts(sources: readonly DeadlineAlertSource[], now: Date): readonly DeadlineAlert[] {
  const alerts: DeadlineAlert[] = [];
  for (const source of sources) {
    if (isNotificationTrailComplete(source.profile, source.notifications)) continue;
    const schedule = computeNotificationSchedule(source.enteredAt, source.profile);
    for (const mark of schedule) {
      if (mark.dueAt.getTime() > now.getTime()) continue; // ainda não venceu — não é alerta
      const matching = source.notifications.find((notification) => notification.kind === mark.kind);
      const resolved =
        matching?.status === "ISSUED" ||
        (matching?.status === "WAIVED" && typeof matching.reason === "string" && matching.reason.trim().length > 0);
      if (!resolved) {
        alerts.push({ processId: source.processId, kind: mark.kind, dueAt: mark.dueAt.toISOString() });
      }
    }
  }
  return alerts.sort((left, right) => left.dueAt.localeCompare(right.dueAt));
}
