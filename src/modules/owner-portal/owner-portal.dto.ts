import type { ImpoundProcess, ImpoundStatus } from "../impound/impound.types.js";

// Ω5P PR-16 — DTO PÚBLICO MINIMIZADO do owner-portal (§2.8 / RN-POR-02). Contém APENAS os 6 campos autorizados.
// JAMAIS: id/tenant_id/profile_id/serviceOrderId · origem/autoridade/agente/nº do auto/BO/base legal · Renavam/
// chassi/proprietário · hashes/heads/storage_key/token. Labels PT-BR white-label (D-Ω5P — "pátio/órgão", nunca
// "polícia"). Próprio do portal (NÃO reusa o DTO do console autenticado) — isolamento por design.

const STATUS_LABELS: Record<ImpoundStatus, string> = {
  IN_REMOVAL: "Em remoção",
  RECEPTION: "Em recepção no pátio",
  ACTIVE_CUSTODY: "Sob custódia no pátio",
  RELEASE_IN_PROGRESS: "Liberação em andamento",
  RELEASED_FOR_REPAIR: "Liberado para reparo",
  RELEASED: "Liberado",
  AUCTION_ELIGIBLE: "Elegível a leilão",
  AUCTION_PREP: "Em preparação de leilão",
  LOTTED: "Em leilão",
  AUCTIONED: "Arrematado em leilão",
  AUCTION_CLOSED: "Leilão encerrado",
  DIRECT_RECYCLING: "Encaminhado à reciclagem",
  JUDICIAL_HOLD: "Sob bloqueio judicial",
  CLOSED: "Encerrado",
};

// DD/MM/AAAA (pt-BR, UTC) — sem Intl (determinismo/leveza, mesmo espírito de formatMoneyLabel). Ω5P PR-17b:
// usada tanto na marca-d'água da foto (owner-portal.photo-pipeline.ts) quanto no `capturedAtLabel` do dossiê
// (data-only, SEM hora — reduz fingerprinting do momento exato da vistoria).
export function formatDateLabelPtBr(date: Date): string {
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = date.getUTCFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

// R$ 1.234,56 (pt-BR) a partir de centavos inteiros — sem Intl (determinismo/leveza), sem aritmética de float.
export function formatMoneyLabel(cents: number, currency: string): string {
  const symbol = currency === "BRL" ? "R$" : currency;
  const negative = cents < 0;
  const abs = Math.abs(Math.trunc(cents));
  const reais = Math.trunc(abs / 100);
  const centavos = abs % 100;
  const reaisStr = reais.toLocaleString("pt-BR");
  return `${negative ? "-" : ""}${symbol} ${reaisStr},${String(centavos).padStart(2, "0")}`;
}

export type OwnerPortalProcessDto = {
  readonly status: ImpoundStatus;
  readonly statusLabel: string;
  readonly yardPublicName: string | null;
  readonly yardPublicAddress: string | null;
  readonly enteredAt: string | null;
  readonly totalDueLabel: string;
};

export function toOwnerPortalProcessDto(
  process: ImpoundProcess,
  yard: { name: string; address: string } | undefined,
  due: { totalDueCents: number; currency: string },
): OwnerPortalProcessDto {
  return {
    status: process.status,
    statusLabel: STATUS_LABELS[process.status],
    yardPublicName: yard?.name ?? null,
    yardPublicAddress: yard?.address ?? null,
    enteredAt: process.enteredAt ? process.enteredAt.toISOString() : null,
    totalDueLabel: formatMoneyLabel(due.totalDueCents, due.currency),
  };
}

// ── Ω5P PR-17 — DOSSIÊ DETALHADO MINIMIZADO (§2.8 / RN-POR-02) ──────────────────────────────────────────────────
// Agregado numa chamada: situação + pátio + descritor do veículo (posse já provada; SEM placa/Renavam/chassi) +
// débitos ITEMIZADOS por kind + prazos derivados do t0 + exigências de liberação + placeholder honesto de fotos.
// JAMAIS: id/tenant_id/profile_id/serviceOrderId · origem/autoridade/agente/nº do auto/BO/base legal · Renavam/
// chassi/proprietário · tariffId/unitAmount/periodSeq/id de linha/settled_* · storage_key/fileUrl/token/hash.

// Rótulos PT-BR white-label dos encargos (o kind interno NUNCA vai na resposta — só o label).
const CHARGE_KIND_LABELS: Record<"REMOVAL" | "DAILY" | "ADDITIONAL", string> = {
  REMOVAL: "Remoção",
  DAILY: "Diárias de estada",
  ADDITIONAL: "Encargos adicionais",
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type OwnerDossierChargeItem = {
  readonly kindLabel: string;
  readonly subtotalLabel: string;
  readonly dailyCount?: number;
  readonly capReachedLabel?: string;
};

export type OwnerDossierDeadline = {
  readonly label: string;
  readonly dueDate: string; // ISO — data derivada de enteredAt + offset em dias do perfil
  readonly elapsedLabel: string; // "Faltam N dias" / "Vence hoje" / "Prazo encerrado"
};

export type OwnerDossierRequirement = {
  readonly label: string;
  readonly required: boolean;
};

// Ω5P PR-17b — item de foto MINIMIZADO no dossiê: SÓ o opaqueRef (HMAC — o servidor recompõe o attachmentId
// internamente, o cliente nunca o vê) + a data da captura (data-only, SEM hora — reduz fingerprinting). JAMAIS
// attachmentId/storage_key/fileUrl (§2.8).
export type OwnerDossierPhotoItem = {
  readonly opaqueRef: string;
  readonly capturedAtLabel: string;
};

export type OwnerDossierPhotos = {
  readonly sets: readonly OwnerDossierPhotoItem[];
  readonly availabilityLabel: string;
};

export type OwnerDossierDto = {
  readonly status: ImpoundStatus;
  readonly statusLabel: string;
  readonly yardPublicName: string | null;
  readonly yardPublicAddress: string | null;
  readonly enteredAt: string | null;
  readonly vehicle: {
    readonly brand: string | null;
    readonly model: string | null;
    readonly color: string | null;
    readonly year: number | null;
  };
  readonly charges: {
    readonly items: readonly OwnerDossierChargeItem[];
    readonly totalDueLabel: string;
  };
  readonly deadlines: readonly OwnerDossierDeadline[];
  readonly requirements: readonly OwnerDossierRequirement[];
  readonly photos: OwnerDossierPhotos;
};

// "Faltam N dias" / "Falta 1 dia" / "Vence hoje" / "Prazo encerrado" — legível para o cidadão, sem expor cálculo.
function elapsedLabel(dueDate: Date, now: Date): string {
  const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / MS_PER_DAY);
  if (diffDays > 1) return `Faltam ${diffDays} dias`;
  if (diffDays === 1) return "Falta 1 dia";
  if (diffDays === 0) return "Vence hoje";
  return "Prazo encerrado";
}

function addDays(base: Date, days: number): Date {
  return new Date(base.getTime() + days * MS_PER_DAY);
}

// Prazos legais derivados do t0 (enteredAt) + offsets do perfil. Sem t0 (processo ainda não entrou) ⇒ lista vazia.
export function buildOwnerDossierDeadlines(
  enteredAt: Date | undefined,
  plan: { ownerNotifDays: number; noticeEdictDay: number; auctionEligibleDay: number },
  now: Date,
): readonly OwnerDossierDeadline[] {
  if (!enteredAt) return [];
  const marks: ReadonlyArray<{ label: string; days: number }> = [
    { label: "Prazo de notificação ao proprietário", days: plan.ownerNotifDays },
    { label: "Prazo para edital de notificação", days: plan.noticeEdictDay },
    { label: "Elegível a leilão a partir de", days: plan.auctionEligibleDay },
  ];
  return marks.map(({ label, days }) => {
    const dueDate = addDays(enteredAt, days);
    return { label, dueDate: dueDate.toISOString(), elapsedLabel: elapsedLabel(dueDate, now) };
  });
}

export function toOwnerDossierDto(input: {
  process: ImpoundProcess;
  yard: { name: string; address: string } | undefined;
  charges: {
    currency: string;
    items: ReadonlyArray<{ kind: "REMOVAL" | "DAILY" | "ADDITIONAL"; subtotalCents: number; count: number }>;
    capReached: boolean;
    totalDueCents: number;
  };
  plan: { ownerNotifDays: number; noticeEdictDay: number; auctionEligibleDay: number; requirements: ReadonlyArray<{ label: string; required: boolean }> } | undefined;
  photos: readonly OwnerDossierPhotoItem[];
  now: Date;
}): OwnerDossierDto {
  const { process, yard, charges, plan, photos, now } = input;
  const items: OwnerDossierChargeItem[] = charges.items.map((item) => ({
    kindLabel: CHARGE_KIND_LABELS[item.kind],
    subtotalLabel: formatMoneyLabel(item.subtotalCents, charges.currency),
    ...(item.kind === "DAILY" ? { dailyCount: item.count } : {}),
    ...(item.kind === "DAILY" && charges.capReached ? { capReachedLabel: "Teto de diárias atingido" } : {}),
  }));
  return {
    status: process.status,
    statusLabel: STATUS_LABELS[process.status],
    yardPublicName: yard?.name ?? null,
    yardPublicAddress: yard?.address ?? null,
    enteredAt: process.enteredAt ? process.enteredAt.toISOString() : null,
    vehicle: {
      brand: process.vehicleBrand ?? null,
      model: process.vehicleModel ?? null,
      color: process.vehicleColor ?? null,
      year: process.vehicleYear ?? null,
    },
    charges: {
      items,
      totalDueLabel: formatMoneyLabel(charges.totalDueCents, charges.currency),
    },
    deadlines: plan ? buildOwnerDossierDeadlines(process.enteredAt, plan, now) : [],
    requirements: (plan?.requirements ?? []).map((requirement) => ({ label: requirement.label, required: requirement.required })),
    photos: {
      sets: photos,
      // D-007 (avaliador Ω5P): esta tela ainda NÃO tem UI que consuma /photos/:opaqueRef (visualização adiada
      // para PR de frontend futuro, A2 da junta-5) — o texto não pode prometer uma ação indisponível AQUI.
      availabilityLabel:
        photos.length > 0
          ? "Fotos da vistoria registradas — consulte o órgão/pátio responsável para visualização."
          : "Nenhuma foto de vistoria registrada até o momento.",
    },
  };
}
