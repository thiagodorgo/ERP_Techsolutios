// Ω4C PR-14 — Telemetria WEB (Quilometragem · Acessos · Recusas · Dispositivos), SEM o mapa. Espelho no
// front dos DTOs §2.8 já projetados pelo backend PR-12 (GET /telemetry/{km,access,refusals,devices}, gate
// telemetry:read). §2.8/LGPD (crítico desta fatia): NENHUMA destas views carrega lat/lng, IP, tenant_id,
// operator_profile_id externo, client_action_id nem sdk_int cru — a coordenada crua é exclusiva do mapa
// (/telemetry/track), DEFERIDO ao PR-15 (Junta de Mapas) e proibido aqui. O adapter só reconstrói o
// allowlist; se algo sensível vier no corpo por acidente, NÃO entra no objeto renderizado.

// Janela padrão de leitura (espelha TELEMETRY_WINDOW_DEFAULT_HOURS do backend): sem De/Até selecionado,
// o backend aplica as últimas 24 horas. O teto (168h) é validado no backend → 422 window_too_large.
export const TELEMETRY_DEFAULT_WINDOW_HOURS = 24;

// Quilometragem por profissional/dia. kmTotal já vem com 1 casa (Decimal(10,1)); pontos usados = leituras
// consentidas que somaram o trajeto. SEM coordenada crua.
export type TelemetryKmView = {
  readonly professionalLabel: string;
  readonly day: string;
  readonly kmTotal: number;
  readonly pointsUsed: number;
};

// Acesso do APP de campo (conectou/desconectou) — distinto do "Acessos" de Controle·Usuários (login web,
// PR-11). `event` já vem em PT-BR do backend ("conectou"/"desconectou"); `when` = "dd/mm HH:mm" (SP).
export type TelemetryAccessView = {
  readonly professionalLabel: string;
  readonly event: string;
  readonly when: string;
};

// Recusa de serviço (SERVICE_REFUSAL). `reason`/`workOrderRef` podem ser nulos (honesto "—"). SEM IP/coord.
export type TelemetryRefusalView = {
  readonly id: string;
  readonly when: string;
  readonly professionalLabel: string;
  readonly workOrderRef: string | null;
  readonly reason: string | null;
};

// Dispositivo do profissional (rótulo GROSSEIRO, anti-fingerprint). `lastSeenAt` chega como ISO. SEM sdk_int
// cru/IP/tenant_id.
export type TelemetryDeviceView = {
  readonly professionalLabel: string;
  readonly deviceLabel: string;
  readonly appVersion: string | null;
  readonly lastSeenAt: string;
};

// Ω4C PR-15 (Junta de Mapas J-MAPAS-9) — Rastreamento. ESTA é a ÚNICA view de Telemetria com coordenada crua
// (o propósito é desenhar o trajeto no mapa), gated forte por telemetry:read (backend autoridade) e só existe
// se o profissional CONSENTIU na origem (consent-gate PR-12). §2.8/LGPD: allowlist ESTRITO
// {capturedAt, lat, lng, accuracyM} — NUNCA IP, tenant_id, sdk_int, client_action_id, operator_profile_id
// externo nem device. `speedKmh` NÃO entra (cor por velocidade DIFERIDA). A coordenada só é consumida pela
// geometria/mapa; nunca vai para log/console/CSV.
export type TrackView = {
  readonly capturedAt: string;
  readonly lat: number;
  readonly lng: number;
  readonly accuracyM: number | null;
};

// Origem/estado §7 de cada carga:
//  · api            → dados reais carregados
//  · mock           → modo mock: lista VAZIA honesta (D-007, nunca fabrica)
//  · forbidden      → 403 do gate telemetry:read → "acesso não permitido"
//  · fallback       → erro real (5xx/rede) → vazio + "tentar novamente"
//  · needs_professional → km/acessos/recusas sem profissional selecionado: o endpoint NÃO é chamado
//    (backend exigiria professionalId → 422 professional_required); estado honesto "selecione um profissional"
//  · invalid_window → 422 do backend (window_too_large / invalid_window): mensagem honesta "reduza o intervalo"
export type TelemetrySource = "api" | "mock" | "forbidden" | "fallback" | "needs_professional" | "invalid_window";

export type TelemetryData<T> = {
  readonly items: readonly T[];
  readonly source: TelemetrySource;
};

export type TelemetryApiContext = {
  readonly token?: string;
  readonly tenantId?: string;
  readonly branchId?: string;
  readonly role?: string;
  readonly permissions?: string[];
};

// Filtro De/Até (YYYY-MM-DD, do <Input type="date">). Vazio → últimas 24h (default do backend).
export type TelemetryPeriod = {
  readonly from: string;
  readonly to: string;
};

export const DEFAULT_TELEMETRY_PERIOD: TelemetryPeriod = { from: "", to: "" };

// Lista VAZIA honesta para qualquer estado não-api (mock/erro/403/sem-seleção/janela) — nunca inventa linha.
export function emptyTelemetry<T>(source: TelemetrySource): TelemetryData<T> {
  return { items: [], source };
}
