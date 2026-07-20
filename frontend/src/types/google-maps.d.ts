/**
 * Minimal Google Maps JavaScript API type declarations.
 * Only the subset used in GoogleMapsCanvas is declared here.
 * Replace with @types/google.maps if the integration expands significantly.
 */
declare namespace google {
  namespace maps {
    class Map {
      constructor(element: HTMLElement, options?: MapOptions);
      panTo(latLng: LatLngLiteral): void;
      setCenter(latLng: LatLngLiteral): void;
      setZoom(zoom: number): void;
      fitBounds(bounds: LatLngBounds, padding?: number | Padding): void;
      setOptions(options: MapOptions): void;
    }

    // SPRINT POLISH (C) — fullscreen NATIVO no canto inferior direito (espelho do MapLibre).
    enum ControlPosition {
      RIGHT_BOTTOM,
    }

    // J-MAPAS-6 (redesign) — resize imperativo quando o container muda sem resize de janela
    // (colapsar rail / maximizar): o mapa não se ajusta sozinho, então disparamos o evento.
    namespace event {
      function trigger(instance: object, eventName: string, ...args: unknown[]): void;
    }

    interface Padding {
      top?: number;
      right?: number;
      bottom?: number;
      left?: number;
    }

    class LatLngBounds {
      constructor();
      extend(latLng: LatLngLiteral): LatLngBounds;
      isEmpty(): boolean;
    }

    class Marker {
      constructor(options?: MarkerOptions);
      setMap(map: Map | null): void;
      setPosition(latLng: LatLngLiteral): void;
      setIcon(icon: MarkerIcon | string | null): void;
      getIcon(): MarkerIcon | string | null | undefined;
      addListener(event: string, handler: () => void): void;
    }

    interface MapOptions {
      center?: LatLngLiteral;
      zoom?: number;
      mapTypeControl?: boolean;
      streetViewControl?: boolean;
      fullscreenControl?: boolean;
      fullscreenControlOptions?: FullscreenControlOptions;
      zoomControl?: boolean;
      gestureHandling?: string;
    }

    interface FullscreenControlOptions {
      position?: ControlPosition;
    }

    interface MarkerOptions {
      position?: LatLngLiteral;
      map?: Map;
      title?: string;
      label?: string | MarkerLabel;
      icon?: MarkerIcon | string;
    }

    interface MarkerLabel {
      text: string;
      color?: string;
      fontSize?: string;
      fontWeight?: string;
    }

    interface MarkerIcon {
      path: number | string;
      scale?: number;
      fillColor?: string;
      fillOpacity?: number;
      strokeColor?: string;
      strokeWeight?: number;
    }

    interface LatLngLiteral {
      lat: number;
      lng: number;
    }
  }
}

/**
 * Google Maps Web Components (gmp-map / gmp-advanced-marker, v=beta).
 * Subconjunto usado pelo GoogleMapsCanvas: atributos declarativos + innerMap para pan imperativo
 * + evento gmp-click nos markers (ligado via ref, não via prop — React 18 não faz bind de custom event).
 */
interface GmpMapElement extends HTMLElement {
  innerMap?: google.maps.Map;
  // Propriedades JS dos web components exigem OBJETO (LatLngLiteral), não a string do atributo
  // HTML — React 19 faz property-assign em custom elements, então geometria é setada via ref.
  center?: google.maps.LatLngLiteral | null;
  zoom?: number | null;
}

interface GmpAdvancedMarkerElement extends HTMLElement {
  position?: google.maps.LatLngLiteral | null;
}

// A augmentation JSX dos web components vive em google-maps-elements.d.ts (arquivo MÓDULO —
// augmentation de módulo não funciona a partir deste script global).
