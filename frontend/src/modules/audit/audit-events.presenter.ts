import type { AuditEventView } from "./audit-events.types";

// PR-C TELAS PADRONIZADAS — camada de APRESENTAÇÃO da trilha de auditoria (sc_audit).
// Traduz as `action` REAIS do backend (taxonomia auditada em src/**: auth.*, user.*, work_order.*, …)
// para rótulos PT-BR de negócio com dot semântico, agrupa os eventos por dia (America/Sao_Paulo)
// e deriva os KPIs SOMENTE dos eventos carregados (D-007 — nada fabricado aqui).
// Ação fora do dicionário → rótulo genérico honesto ("Atividade registrada no sistema"),
// NUNCA a string técnica crua na UI (§3/§11.2); o CSV exportado preserva a action original.

const DOT = {
  green: "#22C55E",
  blue: "#2563EB",
  amber: "#F59E0B",
  red: "#DC2626",
  slate: "#64748B",
  purple: "#7E22CE",
} as const;

export type AuditActionMeta = { readonly label: string; readonly dot: string };

// ── Dicionário exato (actions confirmadas no backend) ─────────────────────────
const EXACT_ACTIONS: Record<string, AuditActionMeta> = {
  "auth.login.success": { label: "Entrou no sistema", dot: DOT.green },
  "auth.login.failed": { label: "Tentativa de acesso recusada", dot: DOT.red },
  "auth.logout": { label: "Saiu do sistema", dot: DOT.slate },
  "auth.refresh.success": { label: "Sessão renovada", dot: DOT.blue },
  "auth.refresh.failed": { label: "Falha ao renovar a sessão", dot: DOT.red },
  "auth.session.created": { label: "Sessão iniciada", dot: DOT.blue },
  "auth.session.revoked": { label: "Sessão encerrada pelo sistema", dot: DOT.amber },
  "user.created": { label: "Usuário criado", dot: DOT.blue },
  "user.updated": { label: "Perfil de usuário alterado", dot: DOT.purple },
  "evidence.upload.accepted": { label: "Evidência recebida", dot: DOT.blue },
  "evidence.upload.stored": { label: "Evidência armazenada", dot: DOT.green },
  "evidence.upload.rejected": { label: "Evidência recusada", dot: DOT.red },
  "evidence.upload.scan_failed": { label: "Falha na verificação de evidência", dot: DOT.amber },
  "field_dispatch.created": { label: "Despacho de campo criado", dot: DOT.blue },
  "field_dispatch.reassigned": { label: "Despacho reatribuído", dot: DOT.amber },
  "work_order.invoiced": { label: "Ordem de serviço faturada", dot: DOT.green },
  "approval.requested": { label: "Aprovação solicitada", dot: DOT.amber },
  "team.member_added": { label: "Integrante adicionado à equipe", dot: DOT.blue },
  "team.member_removed": { label: "Integrante removido da equipe", dot: DOT.amber },
  "tenant_setting.upserted": { label: "Configuração da organização alterada", dot: DOT.purple },
};

// ── Humanização genérica "entidade.verbo" (só entidades/verbos REAIS do backend) ──
type EntityMeta = { readonly label: string; readonly fem: boolean };

const ENTITY_LABELS: Record<string, EntityMeta> = {
  work_order: { label: "Ordem de serviço", fem: true },
  service_quote: { label: "Orçamento de serviço", fem: false },
  customer: { label: "Cliente", fem: false },
  vehicle: { label: "Veículo", fem: false },
  vehicle_identity: { label: "Identidade de veículo", fem: true },
  branch: { label: "Filial", fem: true },
  tenant: { label: "Organização", fem: true },
  team: { label: "Equipe", fem: true },
  supplier: { label: "Fornecedor", fem: false },
  tag: { label: "Etiqueta", fem: true },
  poi: { label: "Ponto de interesse", fem: false },
  service_catalog: { label: "Catálogo de serviços", fem: false },
  price_table: { label: "Tabela de preços", fem: true },
  tariff: { label: "Tarifa", fem: true },
  attachment: { label: "Anexo", fem: false },
  inventory_item: { label: "Item de estoque", fem: false },
  stock_movement: { label: "Movimentação de estoque", fem: true },
  cycle_count: { label: "Contagem de estoque", fem: true },
  financial_account: { label: "Conta financeira", fem: true },
  expense_report: { label: "Relatório de despesas", fem: false },
  expense_item: { label: "Despesa", fem: true },
  commission: { label: "Comissão", fem: true },
  fuel_log: { label: "Abastecimento", fem: false },
  fine: { label: "Multa", fem: true },
  insurance_policy: { label: "Apólice de seguro", fem: true },
  damage: { label: "Registro de dano", fem: false },
  impound: { label: "Processo de pátio", fem: false },
  yard: { label: "Pátio", fem: false },
  yard_area: { label: "Área de pátio", fem: true },
  yard_spot: { label: "Vaga de pátio", fem: true },
  release: { label: "Liberação de veículo", fem: true },
  auction: { label: "Leilão", fem: false },
  jurisdiction_profile: { label: "Perfil de jurisdição", fem: false },
  authority_credential: { label: "Credencial de autoridade", fem: true },
  telemetry: { label: "Telemetria", fem: true },
  field_location: { label: "Posição de campo", fem: true },
};

type VerbMeta = { readonly masc: string; readonly fem: string; readonly dot: string };

const VERB_LABELS: Record<string, VerbMeta> = {
  created: { masc: "criado", fem: "criada", dot: DOT.blue },
  updated: { masc: "alterado", fem: "alterada", dot: DOT.slate },
  deleted: { masc: "excluído", fem: "excluída", dot: DOT.red },
  uploaded: { masc: "enviado", fem: "enviada", dot: DOT.blue },
  cancelled: { masc: "cancelado", fem: "cancelada", dot: DOT.red },
  assigned: { masc: "atribuído", fem: "atribuída", dot: DOT.blue },
  approved: { masc: "aprovado", fem: "aprovada", dot: DOT.green },
  settled: { masc: "liquidado", fem: "liquidada", dot: DOT.green },
  reversed: { masc: "estornado", fem: "estornada", dot: DOT.red },
  opened: { masc: "aberto", fem: "aberta", dot: DOT.blue },
  closed: { masc: "encerrado", fem: "encerrada", dot: DOT.slate },
  duplicated: { masc: "duplicado", fem: "duplicada", dot: DOT.blue },
  shared: { masc: "compartilhado", fem: "compartilhada", dot: DOT.blue },
  revoked: { masc: "revogado", fem: "revogada", dot: DOT.amber },
  suspended: { masc: "suspenso", fem: "suspensa", dot: DOT.amber },
  submitted: { masc: "enviado", fem: "enviada", dot: DOT.blue },
  recorded: { masc: "registrado", fem: "registrada", dot: DOT.blue },
  ingested: { masc: "recebido", fem: "recebida", dot: DOT.slate },
};

const FALLBACK_META: AuditActionMeta = { label: "Atividade registrada no sistema", dot: DOT.slate };

/** Rótulo PT-BR + dot semântico para uma `action` real. Desconhecida → genérico honesto. */
export function auditActionMeta(action: string): AuditActionMeta {
  const exact = EXACT_ACTIONS[action];
  if (exact) return exact;

  const separator = action.lastIndexOf(".");
  if (separator > 0) {
    const entity = ENTITY_LABELS[action.slice(0, separator)];
    const verb = VERB_LABELS[action.slice(separator + 1)];
    if (entity && verb) {
      return { label: `${entity.label} ${entity.fem ? verb.fem : verb.masc}`, dot: verb.dot };
    }
  }
  return FALLBACK_META;
}

// ── KPIs derivados APENAS dos eventos carregados ──────────────────────────────
export type AuditKpis = {
  readonly total: number;
  readonly logins: number;
  readonly loginActors: number;
  readonly ended: number;
  readonly endedBySystem: number;
  readonly denied: number;
};

export function computeAuditKpis(events: readonly AuditEventView[]): AuditKpis {
  let logins = 0;
  let logout = 0;
  let revoked = 0;
  let denied = 0;
  const loginActorSet = new Set<string>();

  for (const event of events) {
    if (event.action === "auth.login.success") {
      logins += 1;
      loginActorSet.add(event.actor);
    } else if (event.action === "auth.logout") logout += 1;
    else if (event.action === "auth.session.revoked") revoked += 1;
    else if (event.action === "auth.login.failed" || event.action === "auth.refresh.failed") denied += 1;
  }

  return {
    total: events.length,
    logins,
    loginActors: loginActorSet.size,
    ended: logout + revoked,
    endedBySystem: revoked,
    denied,
  };
}

// ── Agrupamento por dia (America/Sao_Paulo) — "HOJE · 4 DE AGOSTO" etc. ───────
const DAY_KEY_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const DAY_LABEL_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "numeric",
  month: "long",
});

const DAY_LABEL_YEAR_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const TIME_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** Hora "HH:mm" (America/Sao_Paulo) do instante ISO; sem instante → "—". */
export function formatEventTime(whenIso: string): string {
  if (!whenIso) return "—";
  const date = new Date(whenIso);
  if (Number.isNaN(date.getTime())) return "—";
  return TIME_FORMATTER.format(date);
}

export type AuditDayGroup = {
  readonly key: string;
  readonly label: string;
  readonly events: readonly AuditEventView[];
};

const NO_DATE_KEY = "sem-data";

/**
 * Agrupa os eventos (já ordenados DESC pelo adapter) por dia-calendário de São Paulo,
 * preservando a ordem. Rótulos: "HOJE · 4 DE AGOSTO" / "ONTEM · 3 DE AGOSTO" / "1 DE AGOSTO"
 * (ano incluído quando difere do ano corrente). Evento sem instante → "DATA NÃO REGISTRADA".
 */
export function groupAuditEventsByDay(events: readonly AuditEventView[], now: Date = new Date()): AuditDayGroup[] {
  const todayKey = DAY_KEY_FORMATTER.format(now);
  const yesterdayKey = DAY_KEY_FORMATTER.format(new Date(now.getTime() - 86_400_000));
  const currentYear = todayKey.slice(0, 4);

  const groups: { key: string; label: string; events: AuditEventView[] }[] = [];
  const byKey = new Map<string, { key: string; label: string; events: AuditEventView[] }>();

  for (const event of events) {
    const date = event.whenIso ? new Date(event.whenIso) : null;
    const valid = date && !Number.isNaN(date.getTime()) ? date : null;
    const key = valid ? DAY_KEY_FORMATTER.format(valid) : NO_DATE_KEY;

    let group = byKey.get(key);
    if (!group) {
      let label = "DATA NÃO REGISTRADA";
      if (valid) {
        const base = key.startsWith(currentYear) ? DAY_LABEL_FORMATTER.format(valid) : DAY_LABEL_YEAR_FORMATTER.format(valid);
        const prefix = key === todayKey ? "HOJE · " : key === yesterdayKey ? "ONTEM · " : "";
        label = `${prefix}${base.toLocaleUpperCase("pt-BR")}`;
      }
      group = { key, label, events: [] };
      byKey.set(key, group);
      groups.push(group);
    }
    group.events.push(event);
  }

  return groups;
}

// ── Apresentação do ator (§2.8: o DTO só traz o id opaco — NUNCA UUID cru na UI) ──
// Mesma paleta rotativa do design (InitialsAvatar); a cor é determinística por ATOR,
// então o mesmo usuário mantém a mesma cor mesmo sem o nome (degradação declarada:
// o backend não expõe nome/e-mail do ator no DTO de auditoria — P-AUD-ACTOR-NAME).
const ACTOR_PALETTE: readonly (readonly [string, string])[] = [
  ["#EFF6FF", "#2563EB"],
  ["#F0FDF4", "#15803D"],
  ["#FAF5FF", "#7E22CE"],
  ["#FFFBEB", "#B45309"],
  ["#F0F9FF", "#0369A1"],
];

export type AuditActorPresentation = {
  readonly name: string;
  readonly isSystem: boolean;
  readonly bg: string;
  readonly fg: string;
};

export function auditActorPresentation(actor: string): AuditActorPresentation {
  if (actor === "Sistema") {
    return { name: "Sistema", isSystem: true, bg: "#F1F5F9", fg: "#475569" };
  }
  let sum = 0;
  for (let index = 0; index < actor.length; index += 1) {
    sum = (sum + actor.charCodeAt(index)) % ACTOR_PALETTE.length;
  }
  const [bg, fg] = ACTOR_PALETTE[sum];
  return { name: "Usuário", isSystem: false, bg, fg };
}
