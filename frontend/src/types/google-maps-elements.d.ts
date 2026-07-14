// Web Components do Google Maps (gmp-map / gmp-advanced-marker, v=beta) no JSX do React 19.
// Este arquivo É um módulo (import no topo) — obrigatório para AUGMENTAR o módulo react em vez
// de redeclará-lo (num script global, `declare module "react"` substituiria os exports do react).
import type { DetailedHTMLProps, HTMLAttributes } from "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      // ATENÇÃO: center/zoom/position NÃO entram como props JSX — React 19 faz property-assign
      // em custom elements e os setters exigem LatLng (objeto), não a string do atributo.
      // Geometria é setada imperativamente via ref (GoogleMapsCanvas). Só atributos seguros aqui.
      "gmp-map": DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
        "map-id"?: string;
      };
      "gmp-advanced-marker": DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
        title?: string;
      };
    }
  }
}
