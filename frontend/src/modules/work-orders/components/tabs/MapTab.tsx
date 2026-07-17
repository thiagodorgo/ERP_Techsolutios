import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MapPin, Navigation, Route, TriangleAlert } from "lucide-react";

import { getStaleLevel, type StaleLevel } from "../../../operations/map/map/mapMarkers";
import { listPoisFromApi } from "../../../registry/pois/pois.service";
import type { PoiItem } from "../../../registry/pois/pois.types";
import { MapRouteCanvas, type MapRouteMarker } from "../../map/MapRouteCanvas";
import {
  fetchMapStartPoints,
  geocodeWorkOrderDestination,
  geocodeWorkOrderOrigin,
  type WorkOrderMapStartPoints,
} from "../../map/mapStartPoints.service";
import { createRouteProvider, type RoutePoint } from "../../map/routeProvider";
import type { WorkOrderDetail, WorkOrdersApiContext } from "../../work-orders.types";

// Ω3F-8b (J-MAPAS-5) — aba "Mapa" do Hub da OS. Marcadores + polyline RETA + distância HAVERSINE sobre a
// base MapLibre+OpenFreeMap (custo US$ 0, sem chave, sem SKU pago). Partida SELECIONÁVEL: posição do
// técnico atribuído (real) / base (POI categoria base) / POI do registry. O número é rotulado com
// HONESTIDADE ("distância aproximada em linha reta") — a rota rodoviária real é maior. Estados §7:
// loading · vazio honesto (OS sem coordenada → CTA geocodificar, sem quebrar) · erro (tile server fora →
// fallback) · dados desatualizados (carimbo de idade da posição do técnico). LGPD: nenhuma coordenada crua
// exposta como texto feio, nenhuma chave.

const card: CSSProperties = { background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14 };
const sectionTitle: CSSProperties = { fontSize: 15, fontWeight: 800, color: "#0F172A" };
const sectionSub: CSSProperties = { fontSize: 12.5, color: "#64748B", marginTop: 3 };

type LoadState =
  | { readonly status: "loading" }
  | { readonly status: "error" }
  | { readonly status: "ready"; readonly data: WorkOrderMapStartPoints };

type StartKind = "origin" | "real" | "base" | "poi";

type StartOption = {
  readonly key: string;
  readonly label: string;
  readonly kind: StartKind;
  /** null para "origin" (a partida É a origem — sem trecho extra). */
  readonly point: RoutePoint | null;
};

export function MapTab({
  workOrder,
  context,
  permissions,
  initialData,
}: {
  workOrder: WorkOrderDetail;
  context: WorkOrdersApiContext;
  permissions: readonly string[];
  /** Injeção de estado pronto para SSR determinístico (o efeito de carga não roda em renderToString). */
  initialData?: WorkOrderMapStartPoints;
}) {
  const [state, setState] = useState<LoadState>(
    initialData ? { status: "ready", data: initialData } : { status: "loading" },
  );
  const [pois, setPois] = useState<readonly PoiItem[]>([]);
  const [selectedKey, setSelectedKey] = useState<string>("");
  const [canvasFailed, setCanvasFailed] = useState(false);
  const [geocodeNote, setGeocodeNote] = useState<string | null>(null);

  const canGeocode = permissions.includes("work_orders:update");

  const load = useCallback(async () => {
    setState({ status: "loading" });
    setCanvasFailed(false);
    try {
      const [points, poiData] = await Promise.all([
        fetchMapStartPoints(context, workOrder.id),
        listPoisFromApi(context, { limit: 100 }).catch(() => ({ items: [] as PoiItem[] })),
      ]);
      setPois(poiData.items ?? []);
      setState({ status: "ready", data: points });
    } catch {
      setState({ status: "error" });
    }
  }, [context, workOrder.id]);

  useEffect(() => {
    // Com initialData (testes) não busca: mantém o estado injetado determinístico.
    if (initialData) return;
    void load();
  }, [initialData, load]);

  const data = state.status === "ready" ? state.data : null;

  const originPoint = useMemo<RoutePoint | null>(
    () => (data?.origin ? { latitude: data.origin.latitude, longitude: data.origin.longitude } : null),
    [data],
  );
  const destinationPoint = useMemo<RoutePoint | null>(
    () => (data?.destination ? { latitude: data.destination.latitude, longitude: data.destination.longitude } : null),
    [data],
  );

  const startOptions = useMemo<StartOption[]>(() => {
    if (!data) return [];
    const options: StartOption[] = [];
    if (data.technician) {
      options.push({
        key: "tecnico",
        label: "Posição do técnico",
        kind: "real",
        point: { latitude: data.technician.latitude, longitude: data.technician.longitude },
      });
    }
    options.push({ key: "origin", label: "Sair da origem da OS", kind: "origin", point: null });
    for (const base of data.bases) {
      options.push({
        key: `base:${base.id}`,
        label: `Base · ${base.name}`,
        kind: "base",
        point: { latitude: base.latitude, longitude: base.longitude },
      });
    }
    for (const poi of pois) {
      if (!poi.isActive) continue; // POI inativo não é partida válida (espelha o filtro is_active do backend)
      if ((poi.category ?? "").trim().toLowerCase() === "base") continue; // bases já vieram do read minimizado
      options.push({
        key: `poi:${poi.id}`,
        label: `Ponto · ${poi.name}`,
        kind: "poi",
        point: { latitude: poi.latitude, longitude: poi.longitude },
      });
    }
    return options;
  }, [data, pois]);

  const selected = startOptions.find((option) => option.key === selectedKey) ?? startOptions[0];
  const startPoint = selected && selected.kind !== "origin" ? selected.point : null;

  const provider = useMemo(() => createRouteProvider(), []);
  const route = provider.computeRoute(startPoint, originPoint, destinationPoint);

  const markers = useMemo<MapRouteMarker[]>(() => {
    const list: MapRouteMarker[] = [];
    if (startPoint && selected && selected.kind !== "origin") {
      list.push({ id: "start", latitude: startPoint.latitude, longitude: startPoint.longitude, kind: "start", label: selected.label });
    }
    if (originPoint) list.push({ id: "origin", latitude: originPoint.latitude, longitude: originPoint.longitude, kind: "origin", label: "Origem" });
    if (destinationPoint) {
      list.push({ id: "destination", latitude: destinationPoint.latitude, longitude: destinationPoint.longitude, kind: "destination", label: "Destino" });
    }
    return list;
  }, [startPoint, selected, originPoint, destinationPoint]);

  const attemptGeocode = useCallback(
    async (target: "origin" | "destination") => {
      setGeocodeNote(null);
      try {
        const result =
          target === "origin"
            ? await geocodeWorkOrderOrigin(context, workOrder.id)
            : await geocodeWorkOrderDestination(context, workOrder.id);
        if (result.geocoded) {
          await load();
        } else {
          setGeocodeNote(result.reason ?? "Não foi possível localizar o endereço.");
        }
      } catch {
        setGeocodeNote("Não foi possível concluir a geocodificação agora.");
      }
    },
    [context, workOrder.id, load],
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ ...card, padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <Route size={18} aria-hidden style={{ color: "#2563EB" }} />
          <div style={sectionTitle}>Mapa da ordem de serviço</div>
        </div>
        <div style={sectionSub}>Partida, origem e destino com a distância estimada do trajeto.</div>

        {state.status === "loading" ? (
          <div style={{ marginTop: 16, fontSize: 13, color: "#94A3B8" }}>Carregando mapa da OS…</div>
        ) : state.status === "error" ? (
          <div style={{ marginTop: 16, padding: "10px 13px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 9, fontSize: 12.5, color: "#B91C1C" }}>
            Não foi possível carregar os pontos do mapa desta OS.
          </div>
        ) : !originPoint && !destinationPoint ? (
          <EmptyState workOrder={workOrder} canGeocode={canGeocode} geocodeNote={geocodeNote} onGeocode={attemptGeocode} />
        ) : (
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Seletor de partida (real / base / POI) */}
            {startOptions.length > 1 ? (
              <label style={{ display: "flex", flexDirection: "column", gap: 6, maxWidth: 360 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#334155" }}>Partida</span>
                <select
                  value={selected?.key ?? "origin"}
                  onChange={(event) => setSelectedKey(event.target.value)}
                  style={{ padding: "8px 10px", borderRadius: 9, border: "1px solid #CBD5E1", fontSize: 13, fontFamily: "inherit", color: "#0F172A", background: "#fff" }}
                >
                  {startOptions.map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            {/* Carimbo de idade da posição do técnico (dados desatualizados, §7) */}
            {data?.technician ? <TechnicianFreshness capturedAt={data.technician.capturedAt} /> : null}

            {/* Canvas MapLibre — com fallback estático quando a inicialização falha (tela não quebra) */}
            {canvasFailed ? (
              <div style={{ padding: "14px 16px", background: "#F8FAFC", border: "1px dashed #CBD5E1", borderRadius: 12, fontSize: 12.5, color: "#64748B" }}>
                O mapa interativo não pôde ser carregado agora. Os pontos e a distância seguem abaixo.
              </div>
            ) : (
              <MapRouteCanvas markers={markers} routeGeometry={route.geometry} onInitError={() => setCanvasFailed(true)} />
            )}

            {/* Distância estimada — rótulo HONESTO obrigatório */}
            <DistanceCard km={route.km} legs={route.geometry.length} label={route.label} mode={route.mode} />

            {/* Lista legível dos pontos (sem coordenada crua) */}
            <PointsList
              startLabel={selected && selected.kind !== "origin" ? selected.label : null}
              originAddress={data?.origin?.address ?? null}
              destinationAddress={data?.destination?.address ?? null}
              hasDestination={Boolean(destinationPoint)}
              workOrder={workOrder}
              canGeocode={canGeocode}
              geocodeNote={geocodeNote}
              onGeocode={attemptGeocode}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// --- distância estimada (rótulo honesto + modo reta) ---
function DistanceCard({ km, legs, label, mode }: { km: number; legs: number; label: string; mode: string }) {
  if (legs < 2) {
    return (
      <div style={{ padding: "12px 16px", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 12, fontSize: 12.5, color: "#64748B" }}>
        Informe origem e destino para estimar a distância do trajeto.
      </div>
    );
  }
  return (
    <div
      data-route-mode={mode}
      style={{ padding: "14px 16px", background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 12, display: "flex", alignItems: "center", gap: 12 }}
    >
      <Navigation size={20} aria-hidden style={{ color: "#2563EB" }} />
      <div>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#1D4ED8" }}>≈ {formatKm(km)}</div>
        <div style={{ fontSize: 12, color: "#3B82F6", fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: 11.5, color: "#64748B", marginTop: 2 }}>
          A rota por vias reais costuma ser maior que a linha reta.
        </div>
      </div>
    </div>
  );
}

// --- frescor da posição do técnico ---
function TechnicianFreshness({ capturedAt }: { capturedAt: string }) {
  const level = getStaleLevel(capturedAt);
  const tone = freshnessTone(level);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: tone.bg, border: `1px solid ${tone.border}`, borderRadius: 9, fontSize: 12.5, color: tone.text, maxWidth: 420 }}>
      <MapPin size={15} aria-hidden />
      <span>
        Posição do técnico {tone.label} · {formatMapDate(capturedAt)}
      </span>
    </div>
  );
}

function freshnessTone(level: StaleLevel): { bg: string; border: string; text: string; label: string } {
  if (level === "live") return { bg: "#F0FDF4", border: "#BBF7D0", text: "#15803D", label: "ao vivo" };
  if (level === "amber") return { bg: "#FFFBEB", border: "#FDE68A", text: "#B45309", label: "de alguns minutos atrás" };
  return { bg: "#F1F5F9", border: "#CBD5E1", text: "#475569", label: "desatualizada" };
}

// --- lista dos pontos ---
function PointsList({
  startLabel,
  originAddress,
  destinationAddress,
  hasDestination,
  workOrder,
  canGeocode,
  geocodeNote,
  onGeocode,
}: {
  startLabel: string | null;
  originAddress: string | null;
  destinationAddress: string | null;
  hasDestination: boolean;
  workOrder: WorkOrderDetail;
  canGeocode: boolean;
  geocodeNote: string | null;
  onGeocode: (target: "origin" | "destination") => void;
}) {
  const woHasDestinationAddress = Boolean(destinationAddress) || Boolean(workOrder.destinationAddress);
  return (
    <div style={{ border: "1px solid #F1F5F9", borderRadius: 12, overflow: "hidden" }}>
      {startLabel ? <PointRow color="#2563EB" title="Partida" value={startLabel} /> : null}
      <PointRow color="#16A34A" title="Origem" value={originAddress ?? workOrder.serviceAddress ?? "Local da OS"} />
      {hasDestination ? (
        <PointRow color="#DC2626" title="Destino" value={destinationAddress ?? "Destino da OS"} />
      ) : woHasDestinationAddress ? (
        <div style={{ padding: "12px 14px", borderTop: "1px solid #F1F5F9", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12.5, color: "#64748B" }}>Destino ainda sem coordenada no mapa.</span>
          {canGeocode ? (
            <button
              onClick={() => onGeocode("destination")}
              style={{ padding: "7px 12px", background: "#2563EB", border: "none", borderRadius: 8, fontSize: 12.5, fontWeight: 700, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}
            >
              Geocodificar destino
            </button>
          ) : null}
        </div>
      ) : null}
      {geocodeNote ? (
        <div style={{ padding: "10px 14px", borderTop: "1px solid #F1F5F9", fontSize: 12, color: "#B45309", background: "#FFFBEB", display: "flex", alignItems: "center", gap: 7 }}>
          <TriangleAlert size={14} aria-hidden /> {geocodeNote}
        </div>
      ) : null}
    </div>
  );
}

function PointRow({ color, title, value }: { color: string; title: string; value: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderTop: title === "Partida" ? "none" : "1px solid #F1F5F9" }}>
      <span aria-hidden style={{ width: 10, height: 10, borderRadius: "50%", background: color, flexShrink: 0 }} />
      <div style={{ display: "flex", flexDirection: "column" }}>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: ".3px" }}>{title}</span>
        <span style={{ fontSize: 13, color: "#0F172A", fontWeight: 600 }}>{value}</span>
      </div>
    </div>
  );
}

// --- estado vazio honesto (§7): OS sem coordenada de origem/destino ---
function EmptyState({
  workOrder,
  canGeocode,
  geocodeNote,
  onGeocode,
}: {
  workOrder: WorkOrderDetail;
  canGeocode: boolean;
  geocodeNote: string | null;
  onGeocode: (target: "origin" | "destination") => void;
}) {
  const hasOriginAddress = Boolean(workOrder.serviceAddress);
  return (
    <div style={{ marginTop: 16, padding: "24px 20px", textAlign: "center", border: "1px dashed #E2E8F0", borderRadius: 12 }}>
      <MapPin size={26} aria-hidden style={{ color: "#CBD5E1" }} />
      <div style={{ fontSize: 13.5, fontWeight: 700, color: "#334155", marginTop: 8 }}>Esta OS ainda não tem coordenadas no mapa</div>
      <div style={{ fontSize: 12.5, color: "#94A3B8", marginTop: 4 }}>
        {hasOriginAddress
          ? "Há endereço cadastrado — localize-o no mapa para ver a rota."
          : "Cadastre um endereço de origem para posicionar a OS no mapa."}
      </div>
      {canGeocode && hasOriginAddress ? (
        <button
          onClick={() => onGeocode("origin")}
          style={{ marginTop: 14, padding: "9px 16px", background: "#2563EB", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}
        >
          Geocodificar origem
        </button>
      ) : null}
      {geocodeNote ? <div style={{ fontSize: 12, color: "#B45309", marginTop: 10 }}>{geocodeNote}</div> : null}
    </div>
  );
}

// --- helpers de formatação ---
export function formatKm(km: number): string {
  if (!Number.isFinite(km)) return "—";
  if (km >= 10) return `${Math.round(km)} km`;
  return `${km.toFixed(1)} km`;
}

function formatMapDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "data indisponível";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(date);
}

export default MapTab;
