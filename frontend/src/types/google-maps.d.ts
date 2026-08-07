/**
 * Minimal Google Maps JavaScript API type declarations.
 * Only the subset used in GoogleMapsCanvas is declared here.
 * Replace with @types/google.maps if the integration expands significantly.
 *
 * J-MAPAS-10 PR-2 (espelho): o canvas Google passou a consumir rotas tracejadas (Polyline +
 * IconSequence), memória da visão (idle + getCenter/getZoom), pan imperativo com padding
 * (panTo + panBy) e popup do marker (InfoWindow ancorado no AdvancedMarkerElement).
 * O `Marker` CLÁSSICO saiu daqui — está DEPRECATED na API e nunca foi usado (usamos
 * `gmp-advanced-marker`, o AdvancedMarkerElement).
 */
declare namespace google {
  namespace maps {
    class Map {
      constructor(element: HTMLElement, options?: MapOptions);
      panTo(latLng: LatLngLiteral): void;
      /** Move o CENTRO em pixels — usado para emular o `setPadding` do MapLibre (stack de 348px). */
      panBy(x: number, y: number): void;
      setCenter(latLng: LatLngLiteral): void;
      setZoom(zoom: number): void;
      getCenter(): LatLng | undefined;
      getZoom(): number | undefined;
      setOptions(options: MapOptions): void;
      addListener(eventName: string, handler: () => void): MapsEventListener;
    }

    interface MapsEventListener {
      remove(): void;
    }

    class LatLng {
      lat(): number;
      lng(): number;
    }

    // Controles: só o zoom, no canto INFERIOR DIREITO (paridade com o NavigationControl do MapLibre).
    enum ControlPosition {
      RIGHT_BOTTOM,
    }

    // J-MAPAS-6 (redesign) — resize imperativo quando o container muda sem resize de janela.
    namespace event {
      function trigger(instance: object, eventName: string, ...args: unknown[]): void;
    }

    interface MapOptions {
      center?: LatLngLiteral;
      zoom?: number;
      mapTypeControl?: boolean;
      streetViewControl?: boolean;
      fullscreenControl?: boolean;
      zoomControl?: boolean;
      zoomControlOptions?: ZoomControlOptions;
      gestureHandling?: string;
      clickableIcons?: boolean;
    }

    interface ZoomControlOptions {
      position?: ControlPosition;
    }

    /**
     * Linha tracejada = polyline com `strokeOpacity: 0` + símbolo repetido (padrão oficial de
     * "dashed line" documentado em developers.google.com/maps/documentation/javascript/symbols).
     */
    class Polyline {
      constructor(options?: PolylineOptions);
      setMap(map: Map | null): void;
    }

    interface PolylineOptions {
      path?: readonly LatLngLiteral[];
      map?: Map;
      clickable?: boolean;
      strokeColor?: string;
      strokeOpacity?: number;
      strokeWeight?: number;
      zIndex?: number;
      icons?: readonly IconSequence[];
    }

    interface IconSequence {
      icon?: Symbol;
      offset?: string;
      repeat?: string;
    }

    interface Symbol {
      path: string | number;
      scale?: number;
      strokeColor?: string;
      strokeOpacity?: number;
      strokeWeight?: number;
      fillColor?: string;
      fillOpacity?: number;
    }

    /** Popup do marker (espelho do maplibregl.Popup): aceita conteúdo DOM e âncora no marker. */
    class InfoWindow {
      constructor(options?: InfoWindowOptions);
      open(options?: InfoWindowOpenOptions): void;
      close(): void;
      setContent(content: string | Element | Text): void;
      addListener(eventName: string, handler: () => void): MapsEventListener;
    }

    interface InfoWindowOptions {
      content?: string | Element | Text;
      maxWidth?: number;
      disableAutoPan?: boolean;
    }

    interface InfoWindowOpenOptions {
      map?: Map;
      // `anchor` aceita MVCObject | AdvancedMarkerElement (o custom element gmp-advanced-marker).
      anchor?: object;
      shouldFocus?: boolean;
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
