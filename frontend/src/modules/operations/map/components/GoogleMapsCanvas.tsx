import { useEffect, useRef } from "react";
import { AlertTriangle, Map as MapIcon, MapPin } from "lucide-react";

import { Chip } from "../../../../components/ui";
import type { GoogleMapsLoadState } from "../hooks/useGoogleMapsLoader";
import type { FieldLocationItem, OperationsMapWorkOrderPin } from "../operations-map.types";
import {
  MAP_LEGEND_ITEMS,
  clusterByProximity,
  getInitials,
  getRingColor,
  getWorkOrderPriorityColor,
  isValidMapCoordinate,
  pickFocusCluster,
} from "../map/mapMarkers";

// Web Components do Google Maps (gmp-map + gmp-advanced-marker, v=beta) no lugar da API JS
// clássica. Markers são conteúdo custom (disco com inicial) estilizado com a paleta REAL de
// status do DS — mesma do canvas MapLibre (getRingColor): status ao vivo · âmbar >3min ·
// cinza >10min. Pins de CHAMADO (teardrop) por prioridade e a legenda circulada garantem
// paridade total com a referência MapLibre.

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
}: {
  loadState: GoogleMapsLoadState;
  locations: readonly FieldLocationItem[];
  selectedId?: string;
  onSelect: (location: FieldLocationItem) => void;
  workOrderPins?: readonly OperationsMapWorkOrderPin[];
  selectedWorkOrderId?: string;
  onSelectWorkOrder?: (id: string) => void;
}) {
  const mapRef = useRef<GmpMapElement | null>(null);
  // Centro/zoom INICIAIS (property-assign no mount) só para o mapa não nascer em (0,0) enquanto o
  // innerMap sobe; logo em seguida o fitBounds enquadra a cidade com mais técnicos (ver efeito abaixo).
  const initialViewRef = useRef<{ center: google.maps.LatLngLiteral; zoom: number } | null>(null);
  // Enquadramento roda UMA vez (na primeira vez que há dados) — depois respeita o pan do usuário.
  const fittedRef = useRef(false);

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
      if (points.length === 1) {
        innerMap.setCenter(points[0]);
        innerMap.setZoom(14);
      } else {
        const bounds = new google.maps.LatLngBounds();
        for (const point of points) bounds.extend(point);
        innerMap.fitBounds(bounds, 64);
      }
      fittedRef.current = true;
    };
    tryFit();

    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, [loadState, locations]);

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

  const operatorCount = `${locations.length} operador${locations.length !== 1 ? "es" : ""}`;
  const workOrderCount = `${validWorkOrderPins.length} chamado${validWorkOrderPins.length !== 1 ? "s" : ""}`;
  const subtitle =
    loadState === "loading" ? "Carregando Google Maps..." : `${operatorCount} e ${workOrderCount} no mapa.`;

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
      <div className="operations-map-canvas__gmaps" aria-label="Mapa com localização dos operadores em campo">
        {loadState === "ready" ? (
          <>
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
            <ul className="operations-map-libre__legend" aria-label="Legenda do mapa">
              {MAP_LEGEND_ITEMS.map((item, index) =>
                item.kind === "sep" ? (
                  <li
                    key={`sep-${index}`}
                    className="operations-map-libre__legend-sep"
                    aria-hidden="true"
                  />
                ) : (
                  <li key={item.label}>
                    <span
                      className={
                        item.kind === "pin"
                          ? "operations-map-libre__pin"
                          : "operations-map-libre__dot"
                      }
                      style={{ background: item.color }}
                    />{" "}
                    {item.label}
                  </li>
                ),
              )}
            </ul>
          </>
        ) : null}
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

  return (
    <gmp-advanced-marker ref={markerRef} title={location.displayName}>
      <div
        className={`gmp-operator-pin${isSelected ? " gmp-operator-pin--selected" : ""}`}
        style={{ background: ringColor }}
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
