import { useEffect, useRef, type CSSProperties } from "react";
import { AlertTriangle, Map as MapIcon, MapPin } from "lucide-react";

import { Chip } from "../../../../components/ui";
import type { GoogleMapsLoadState } from "../hooks/useGoogleMapsLoader";
import type { FieldLocationItem, OperationsMapPadding, OperationsMapWorkOrderPin } from "../operations-map.types";
import {
  clusterByProximity,
  getInitials,
  getRingColor,
  getWorkOrderPriorityColor,
  isRingAvailable,
  isValidMapCoordinate,
  pickFocusCluster,
} from "../map/mapMarkers";
import { OperationsMapLegendFooter } from "./OperationsMapLegendFooter";

// Web Components do Google Maps (gmp-map + gmp-advanced-marker, v=beta) no lugar da API JS
// clássica. Markers são conteúdo custom (disco com inicial) estilizado com a paleta REAL de
// status do DS — mesma do canvas MapLibre (getRingColor): status ao vivo · âmbar >3min ·
// cinza >10min. Pins de CHAMADO (teardrop) por prioridade e o rodapé de legenda UNIFICADO
// (OperationsMapLegendFooter, mesmo componente do MapLibre) garantem paridade total.

const DEFAULT_CENTER = { lat: -23.55052, lng: -46.633308 }; // São Paulo (fallback sem operador)
const DEFAULT_ZOOM = 12;
// map-id do exemplo oficial (estilo default). Um Map ID próprio (Cloud Console) pode substituir depois.
const MAP_ID = "DEMO_MAP_ID";

export function GoogleMapsCanvas({
  loadState,
  locations,
  selectedId,
  onSelect,
  workOrderPins = [],
  selectedWorkOrderId,
  onSelectWorkOrder,
  resizeSignal,
  mapPadding,
}: {
  loadState: GoogleMapsLoadState;
  locations: readonly FieldLocationItem[];
  selectedId?: string;
  onSelect: (location: FieldLocationItem) => void;
  workOrderPins?: readonly OperationsMapWorkOrderPin[];
  selectedWorkOrderId?: string;
  onSelectWorkOrder?: (id: string) => void;
  // J-MAPAS-6 (redesign) — paridade do espelho com o MapLibre: aceita o sinal de resize e o
  // padding dos rails de vidro. O Google Maps também não redimensiona sozinho quando só o
  // container muda; disparamos o evento "resize" no innerMap ~220ms após a transição.
  resizeSignal?: number;
  mapPadding?: OperationsMapPadding;
}) {
  const mapRef = useRef<GmpMapElement | null>(null);
  // Padding vivo (px dos rails) lido no fitBounds sem re-executar o enquadramento único.
  const mapPaddingRef = useRef(mapPadding);
  mapPaddingRef.current = mapPadding;
  // Centro/zoom INICIAIS (property-assign no mount) só para o mapa não nascer em (0,0) enquanto o
  // innerMap sobe; logo em seguida o fitBounds enquadra a cidade com mais técnicos (ver efeito abaixo).
  const initialViewRef = useRef<{ center: google.maps.LatLngLiteral; zoom: number } | null>(null);
  // Enquadramento roda UMA vez (na primeira vez que há dados) — depois respeita o pan do usuário.
  const fittedRef = useRef(false);
  // M-3 (P-MAPA-GOOGLE-PADDING-RESIZE) — pontos do cluster vencedor guardados para RE-ENQUADRAR quando
  // o padding dos rails mudar (expandir/colapsar/maximizar). Sem isto o Google só aplicava o padding no
  // fitBounds inicial e um pin de borda podia ficar sob o vidro até a próxima interação (o MapLibre já
  // reaplica setPadding no resize — este fix alinha o espelho Google).
  const winnerPointsRef = useRef<google.maps.LatLngLiteral[] | null>(null);

  // Enquadra os pontos do cluster vencedor com o padding ATUAL dos rails (área reservada dos overlays de
  // vidro). Reutilizado no fitBounds inicial E no re-enquadramento de resize — fonte única do enquadramento.
  const fitInnerMapToWinner = (innerMap: google.maps.Map, padding?: OperationsMapPadding) => {
    const points = winnerPointsRef.current;
    if (!points || points.length === 0) return;
    if (points.length === 1) {
      innerMap.setCenter(points[0]!);
      innerMap.setZoom(14);
      return;
    }
    const bounds = new google.maps.LatLngBounds();
    for (const point of points) bounds.extend(point);
    innerMap.fitBounds(
      bounds,
      padding
        ? { top: padding.top, right: padding.right, bottom: padding.bottom, left: padding.left }
        : 64,
    );
  };

  if (initialViewRef.current === null) {
    const first = locations[0];
    initialViewRef.current = {
      center: first ? { lat: first.latitude, lng: first.longitude } : DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
    };
  }

  // Janela de frescor calculada UMA vez por render e propagada aos markers, para todos os pins
  // concordarem na mesma referência de tempo (getRingColor decide status/âmbar/cinza).
  const nowMs = Date.now();

  // Só chamados com coordenada válida viram pin (predicado único; nunca a "OS fantasma" 0/0).
  const validWorkOrderPins = workOrderPins.filter((pin) =>
    isValidMapCoordinate(pin.latitude, pin.longitude),
  );

  // Geometria via PROPRIEDADE (objeto LatLngLiteral) — o setter dos web components rejeita a
  // string do atributo quando vem por property-assign (comportamento do React 19 com custom
  // elements). Ref callback roda no mount, com o elemento já upgraded (loadState === "ready").
  const attachMap = (element: GmpMapElement | null) => {
    mapRef.current = element;
    if (element && initialViewRef.current) {
      element.center = initialViewRef.current.center;
      element.zoom = initialViewRef.current.zoom;
    }
  };

  // Enquadra a CIDADE COM MAIS TÉCNICOS (cluster vencedor) — não mais "todos os pontos". Agrupa os
  // técnicos por PROXIMIDADE geográfica (clusterByProximity, custo ZERO, sem geocoding), escolhe o
  // maior cluster (pickFocusCluster; empate → proxy determinístico oeste-primeiro, NÃO nome-alfabético
  // literal — divergência registrada em docs/maps/kb-mapas.md) e dá fitBounds só nesses pontos. Roda
  // UMA vez, quando há dados e o innerMap já subiu (retry por rAF). Pins de CHAMADO NÃO ditam a
  // câmera (a regra do dono é sobre técnicos); continuam renderizando normalmente como markers.
  useEffect(() => {
    if (loadState !== "ready" || fittedRef.current) return;

    const winner = pickFocusCluster(
      clusterByProximity(
        locations.map((location) => ({
          id: location.id,
          lat: location.latitude,
          lng: location.longitude,
        })),
      ),
    );
    if (!winner) return; // sem técnico com coordenada válida → mantém DEFAULT_CENTER (fallback SP)

    const points: google.maps.LatLngLiteral[] = winner.points.map((point) => ({
      lat: point.lat,
      lng: point.lng,
    }));
    // Guarda os pontos para o re-enquadramento de resize (P-MAPA-GOOGLE-PADDING-RESIZE).
    winnerPointsRef.current = points;

    let raf = 0;
    let attempts = 0;
    const tryFit = () => {
      const innerMap = mapRef.current?.innerMap;
      if (!innerMap) {
        if (attempts < 40) {
          attempts += 1;
          raf = requestAnimationFrame(tryFit);
        }
        return;
      }
      // Padding = área dos rails de vidro (quando presente) para os pins não caírem sob eles.
      fitInnerMapToWinner(innerMap, mapPaddingRef.current);
      fittedRef.current = true;
    };
    tryFit();

    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, [loadState, locations]);

  // J-MAPAS-6 (redesign) — resize imperativo quando o container muda de tamanho sem resize de
  // janela (colapsar rail / maximizar). Regra do espelho com o MapLibre: ~220ms após a transição.
  // M-3 (P-MAPA-GOOGLE-PADDING-RESIZE) — `resizeSignal` incrementa no MESMO toggle em que `mapPadding`
  // muda; logo, após o `resize()`, RE-ENQUADRAMOS com o padding ATUAL (mapPaddingRef.current) para nenhum
  // pin ficar escondido sob o rail de vidro recém-expandido. Antes só o fitBounds inicial via padding.
  useEffect(() => {
    if (resizeSignal === undefined) return;
    const timer = setTimeout(() => {
      const innerMap = mapRef.current?.innerMap;
      if (!innerMap) return;
      google.maps.event.trigger(innerMap, "resize");
      if (fittedRef.current) fitInnerMapToWinner(innerMap, mapPaddingRef.current);
    }, 220);
    return () => clearTimeout(timer);
  }, [resizeSignal]);

  // Seleção centraliza o operador (pan imperativo via innerMap — não recria o mapa).
  useEffect(() => {
    if (loadState !== "ready" || !selectedId) return;
    const target = locations.find((location) => location.id === selectedId);
    const innerMap = mapRef.current?.innerMap;
    if (target && innerMap) {
      innerMap.panTo({ lat: target.latitude, lng: target.longitude });
    }
  }, [loadState, locations, selectedId]);

  // Seleção de chamado também centraliza (mesmo pan imperativo).
  useEffect(() => {
    if (loadState !== "ready" || !selectedWorkOrderId) return;
    const target = validWorkOrderPins.find((pin) => pin.id === selectedWorkOrderId);
    const innerMap = mapRef.current?.innerMap;
    if (target && innerMap) {
      innerMap.panTo({ lat: target.latitude, lng: target.longitude });
    }
  }, [loadState, validWorkOrderPins, selectedWorkOrderId]);

  // M-4 (P-MAPA-TERM-OPERADORES) — terminologia §3: "técnicos" (era "operadores"), casando com o rail
  // "Técnicos de Campo" e a linguagem PT-BR de negócio desta view.
  const technicianCount = `${locations.length} técnico${locations.length !== 1 ? "s" : ""}`;
  const workOrderCount = `${validWorkOrderPins.length} chamado${validWorkOrderPins.length !== 1 ? "s" : ""}`;
  const subtitle =
    loadState === "loading" ? "Carregando Google Maps..." : `${technicianCount} e ${workOrderCount} no mapa.`;

  return (
    <section className="operations-map-canvas" aria-label="Mapa Operacional">
      <header>
        <div>
          <MapIcon size={20} />
          <strong>Mapa Operacional</strong>
        </div>
        <Chip tone={loadState === "ready" ? "success" : "info"}>
          {loadState === "ready" ? "Google Maps" : "Carregando..."}
        </Chip>
      </header>
      <p>{subtitle}</p>
      <div className="operations-map-canvas__gmaps" aria-label="Mapa com a posição dos Técnicos de Campo">
        {loadState === "ready" ? (
          <gmp-map ref={attachMap} map-id={MAP_ID}>
            {locations.map((location) => (
              <OperatorMarker
                key={location.id}
                location={location}
                isSelected={location.id === selectedId}
                nowMs={nowMs}
                onSelect={onSelect}
              />
            ))}
            {validWorkOrderPins.map((pin) => (
              <WorkOrderMarker
                key={pin.id}
                pin={pin}
                isSelected={pin.id === selectedWorkOrderId}
                onSelectWorkOrder={onSelectWorkOrder}
              />
            ))}
          </gmp-map>
        ) : null}
        {/* M-2 (J-MAPAS-6) — mesmo rodapé de legenda unificado do MapLibre (regra do espelho:
            paridade byte-a-byte). Ancorado à BASE do container do mapa, não flutuando sobre o canvas. */}
        <OperationsMapLegendFooter />
      </div>
      <footer>
        <span>
          <MapPin size={14} /> Atual
        </span>
        <span>
          <AlertTriangle size={14} /> Localização antiga
        </span>
      </footer>
    </section>
  );
}

function OperatorMarker({
  location,
  isSelected,
  nowMs,
  onSelect,
}: {
  location: FieldLocationItem;
  isSelected: boolean;
  nowMs: number;
  onSelect: (location: FieldLocationItem) => void;
}) {
  const markerRef = useRef<GmpAdvancedMarkerElement | null>(null);

  // Posição via PROPRIEDADE (LatLngLiteral) — o setter do web component rejeita string via
  // property-assign (React 19). Atualiza a cada refresh de localização.
  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;
    marker.position = { lat: location.latitude, lng: location.longitude };
  }, [location.latitude, location.longitude]);

  // gmp-click é custom event do web component — React não faz bind via prop; liga-se pelo ref.
  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;
    const handleClick = () => onSelect(location);
    marker.addEventListener("gmp-click", handleClick);
    return () => marker.removeEventListener("gmp-click", handleClick);
  }, [location, onSelect]);

  // Cor pela paleta REAL de status (inline vence a classe): status ao vivo · âmbar >3min ·
  // cinza >10min. A seleção NUNCA sobrescreve a cor de status (senão vira UI mentirosa) —
  // só geometria + anel de destaque via classe --selected.
  const ringColor = getRingColor(location, nowMs);
  // M-3 — espelho do realce de disponibilidade do MapLibre: técnico disponível ao vivo ganha halo.
  // A cor do halo vem da MESMA fonte (getStatusColor via --operator-ring), nunca hex solto no CSS.
  const available = isRingAvailable(location, nowMs);

  return (
    <gmp-advanced-marker ref={markerRef} title={location.displayName}>
      <div
        className={`gmp-operator-pin${available ? " gmp-operator-pin--available" : ""}${isSelected ? " gmp-operator-pin--selected" : ""}`}
        style={{ background: ringColor, "--operator-ring": ringColor } as CSSProperties}
        aria-hidden
      >
        {getInitials(location.displayName)}
      </div>
    </gmp-advanced-marker>
  );
}

function WorkOrderMarker({
  pin,
  isSelected,
  onSelectWorkOrder,
}: {
  pin: OperationsMapWorkOrderPin;
  isSelected: boolean;
  onSelectWorkOrder?: (id: string) => void;
}) {
  const markerRef = useRef<GmpAdvancedMarkerElement | null>(null);

  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;
    marker.position = { lat: pin.latitude, lng: pin.longitude }; // LatLngLiteral, nunca string
  }, [pin.latitude, pin.longitude]);

  useEffect(() => {
    const marker = markerRef.current;
    if (!marker || !onSelectWorkOrder) return;
    const handleClick = () => onSelectWorkOrder(pin.id);
    marker.addEventListener("gmp-click", handleClick);
    return () => marker.removeEventListener("gmp-click", handleClick);
  }, [pin.id, onSelectWorkOrder]);

  return (
    <gmp-advanced-marker ref={markerRef} title={`${pin.code} · ${pin.title}`}>
      <div
        className={`gmp-workorder-pin${isSelected ? " gmp-workorder-pin--selected" : ""}`}
        style={{ background: getWorkOrderPriorityColor(pin.priority) }}
        aria-hidden
      />
    </gmp-advanced-marker>
  );
}
