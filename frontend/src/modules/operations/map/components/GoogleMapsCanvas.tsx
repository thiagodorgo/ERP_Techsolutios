import { useEffect, useRef } from "react";
import { AlertTriangle, Map as MapIcon, MapPin } from "lucide-react";

import { Chip } from "../../../../components/ui";
import type { GoogleMapsLoadState } from "../hooks/useGoogleMapsLoader";
import type { FieldLocationItem } from "../operations-map.types";

export function GoogleMapsCanvas({
  loadState,
  locations,
  selectedId,
  onSelect,
}: {
  loadState: GoogleMapsLoadState;
  locations: readonly FieldLocationItem[];
  selectedId?: string;
  onSelect: (location: FieldLocationItem) => void;
}) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());

  // Initialize the map once the Google Maps script is ready.
  useEffect(() => {
    if (loadState !== "ready" || !mapContainerRef.current || mapRef.current) return;

    const first = locations[0];
    const center = first
      ? { lat: first.latitude, lng: first.longitude }
      : { lat: -23.55052, lng: -46.633308 };

    mapRef.current = new google.maps.Map(mapContainerRef.current, {
      center,
      zoom: 12,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      zoomControl: true,
      gestureHandling: "cooperative",
    });
  }, [loadState, locations]);

  // Create and sync markers whenever locations or selection changes.
  useEffect(() => {
    const mapInstance = mapRef.current;
    if (loadState !== "ready" || !mapInstance) return;

    const activeIds = new Set(locations.map((loc) => loc.id));

    // Remove markers for locations no longer present.
    markersRef.current.forEach((marker, id) => {
      if (!activeIds.has(id)) {
        marker.setMap(null);
        markersRef.current.delete(id);
      }
    });

    for (const location of locations) {
      const isSelected = location.id === selectedId;
      const fillColor = isSelected ? "#0f8fbf" : location.isStale ? "#f59e0b" : "#22c55e";
      const scale = isSelected ? 16 : 12;

      const existing = markersRef.current.get(location.id);

      if (existing) {
        existing.setPosition({ lat: location.latitude, lng: location.longitude });
        existing.setIcon({ path: 0, scale, fillColor, fillOpacity: 1, strokeColor: "#ffffff", strokeWeight: 2 });
      } else {
        const marker = new google.maps.Marker({
          position: { lat: location.latitude, lng: location.longitude },
          map: mapInstance,
          title: location.displayName,
          label: {
            text: location.displayName.slice(0, 1).toUpperCase(),
            color: "#ffffff",
            fontSize: "11px",
            fontWeight: "bold",
          },
          icon: { path: 0, scale, fillColor, fillOpacity: 1, strokeColor: "#ffffff", strokeWeight: 2 },
        });

        marker.addListener("click", () => {
          onSelect(location);
        });

        markersRef.current.set(location.id, marker);
      }
    }

    // Keep the selected operator centered.
    const target = locations.find((loc) => loc.id === selectedId);
    if (target) mapInstance.panTo({ lat: target.latitude, lng: target.longitude });
  }, [loadState, locations, selectedId, onSelect]);

  // Clean up all markers on unmount.
  useEffect(() => {
    return () => {
      markersRef.current.forEach((marker) => marker.setMap(null));
      markersRef.current.clear();
    };
  }, []);

  const subtitle =
    loadState === "loading"
      ? "Carregando Google Maps..."
      : `${locations.length} operador${locations.length !== 1 ? "es" : ""} no mapa.`;

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
      <div
        ref={mapContainerRef}
        className="operations-map-canvas__gmaps"
        aria-label="Mapa com localização dos operadores em campo"
      />
      <footer>
        <span><MapPin size={14} /> Atual</span>
        <span><AlertTriangle size={14} /> Localização antiga</span>
      </footer>
    </section>
  );
}
