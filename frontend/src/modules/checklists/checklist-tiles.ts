import {
  AlignLeft,
  ArrowLeftRight,
  Camera,
  Car,
  CircleDot,
  ClipboardCheck,
  Images,
  ListChecks,
  MapPin,
  PenLine,
} from "lucide-react";

import type { TenantChecklistStatus } from "./types";

// CHECKLIST P1 PR-02b — mapa canônico de cores/ícones por tipo de componente (CATALOG do
// protótipo Modelos de Checklist.dc.html; lucide equivalente). Extraído da lista (PR-02a) para
// módulo compartilhado: lista, editor e (nos PRs 02c/02d) inspector/preview leem a MESMA fonte —
// token único, nunca cor mágica duplicada.

export type ChecklistComponentTile = {
  readonly Icon: typeof Camera;
  readonly bg: string;
  readonly fg: string;
};

export const CHECKLIST_COMPONENT_TILE: Record<string, ChecklistComponentTile> = {
  vehicle_selector: { Icon: Car, bg: "#EFF6FF", fg: "#2563EB" },
  damage_map: { Icon: MapPin, bg: "#FEF2F2", fg: "#DC2626" },
  photo_upload: { Icon: Camera, bg: "#F0FDF4", fg: "#15803D" },
  observation: { Icon: AlignLeft, bg: "#F8FAFC", fg: "#475569" },
  comparison: { Icon: ArrowLeftRight, bg: "#EFF6FF", fg: "#2563EB" },
  acknowledgement: { Icon: ClipboardCheck, bg: "#FAF5FF", fg: "#7E22CE" },
  before_after: { Icon: Images, bg: "#FFFBEB", fg: "#B45309" },
  single_choice: { Icon: CircleDot, bg: "#F0F9FF", fg: "#0369A1" },
  multi_choice: { Icon: ListChecks, bg: "#F0F9FF", fg: "#0369A1" },
  signature: { Icon: PenLine, bg: "#FAF5FF", fg: "#7E22CE" },
};

// Fallback do protótipo: componente de tipo desconhecido (ou modelo vazio) usa o tile de Foto.
export const CHECKLIST_DEFAULT_TILE: ChecklistComponentTile = CHECKLIST_COMPONENT_TILE.photo_upload;

export function resolveChecklistComponentTile(type: string): ChecklistComponentTile {
  return CHECKLIST_COMPONENT_TILE[type] ?? CHECKLIST_DEFAULT_TILE;
}

// Pills de situação — tokens exatos do protótipo (STATUS).
export const CHECKLIST_STATUS_TONE: Record<TenantChecklistStatus, { readonly bg: string; readonly fg: string }> = {
  draft: { bg: "#F1F5F9", fg: "#475569" },
  published: { bg: "#DCFCE7", fg: "#15803D" },
  inactive: { bg: "#F1F5F9", fg: "#64748B" },
  archived: { bg: "#F1F5F9", fg: "#94A3B8" },
};
