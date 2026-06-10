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
      zoomControl?: boolean;
      gestureHandling?: string;
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
