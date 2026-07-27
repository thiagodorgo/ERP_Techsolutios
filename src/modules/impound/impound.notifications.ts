import type { NotificationKind, ProcessNotification } from "./impound.notifications.types.js";

// Ω5P PR-09 — MOTOR DE PRAZOS da trilha de notificações legais (I6), formalização do ESTUDO §6 (linha do tempo
// do leilão). Funções PURAS (zero I/O, testáveis por DI — espelha charge.accrual.ts):
//
//   computeNotificationSchedule(t0, profile) → DueMark[]   (quando cada marco passa a ser DEVIDO)
//   isNotificationTrailComplete(profile, notifications) → boolean   (o predicado de I6 que PR-12/13 consomem)
//
// Os prazos VÊM do JurisdictionProfile (ownerNotifDays / noticeEdictDay) — NUNCA hardcode. Tempo ABSOLUTO
// (t0 + prazo·24h em ms), DST-IMUNE por definição (24h são 24h), coerente com o rolling-24h federal do §5.
// AUCTION_EDICT (>=15 d.u.) é relativo à DATA do leilão — NÃO agendado aqui (PR-13). FAIL-CLOSED: prazo
// ausente/<=0/não-finito ⇒ marco OMITIDO (jamais fabrica data).

const MS_PER_DAY = 86_400_000;

// Subconjunto do JurisdictionProfile que o motor lê (só os prazos relativos ao t0). Injetado por DI.
export type NotificationProfile = {
  readonly ownerNotifDays: number;
  readonly noticeEdictDay: number;
};

// Um marco de notificação DEVIDO: kind + instante ABSOLUTO em que passa a ser devido (t0 + prazo·24h).
export type DueMark = {
  readonly kind: NotificationKind;
  readonly dueAt: Date;
};

// Os marcos t0-relativos, na ordem legal, ORDENADOS por due_at. Prazo <=0/não-finito ⇒ marco PULADO (fail-closed;
// determinismo total). AUCTION_EDICT NÃO entra (relativo à data do certame — PR-13).
export function computeNotificationSchedule(t0: Date, profile: NotificationProfile): readonly DueMark[] {
  const marks: DueMark[] = [];
  const t0ms = t0.getTime();
  const add = (kind: NotificationKind, days: number): void => {
    if (!Number.isFinite(days) || days <= 0) return; // fail-closed: sem prazo válido, sem marco (nunca fabrica)
    marks.push({ kind, dueAt: new Date(t0ms + days * MS_PER_DAY) });
  };
  add("OWNER_INITIAL", profile.ownerNotifDays);
  add("COMPLEMENTARY_EDICT", profile.noticeEdictDay);
  return marks.sort((left, right) => left.dueAt.getTime() - right.dueAt.getTime());
}

// Os kinds EXIGÍVEIS do perfil (relativos ao t0): exatamente os que o schedule agenda (prazo válido). Base do
// predicado de I6 e do fail-closed do sweep.
export function requiredNotificationKinds(profile: NotificationProfile): readonly NotificationKind[] {
  // t0 arbitrário (epoch): só a PRESENÇA/ordem dos kinds importa, não os instantes.
  return computeNotificationSchedule(new Date(0), profile).map((mark) => mark.kind);
}

// Predicado de I6 (PURO) que PR-12/13 importam como PRÉ-CONDIÇÃO do leilão: a trilha t0-relativa está COMPLETA
// só quando CADA kind exigível do perfil está ISSUED (ou WAIVED com fundamento). false se algum DUE/ausente/
// FAILED. Fail-closed: perfil sem nenhum marco exigível ⇒ false (não há trilha a provar → não libera o rito).
// (O edital do leilão >=15 d.u. e a janela "acessível >=10 dias" são verificados no gate de leilão, relativos à
// data do certame — R5; PR-09 entrega só a trilha t0-relativa + este predicado.)
export function isNotificationTrailComplete(
  profile: NotificationProfile,
  notifications: readonly ProcessNotification[],
): boolean {
  const required = requiredNotificationKinds(profile);
  if (required.length === 0) return false;
  return required.every((kind) => {
    const match = notifications.find((notification) => notification.kind === kind);
    if (!match) return false;
    if (match.status === "ISSUED") return true;
    if (match.status === "WAIVED") return typeof match.reason === "string" && match.reason.trim().length > 0;
    return false; // DUE / FAILED ⇒ trilha incompleta
  });
}
