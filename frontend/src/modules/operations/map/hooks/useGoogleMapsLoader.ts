import { useEffect, useState } from "react";

export type GoogleMapsLoadState = "idle" | "loading" | "ready" | "error";

// Module-level singleton: the script is loaded only once per page lifecycle.
let currentState: GoogleMapsLoadState = "idle";
const subscribers = new Set<(state: GoogleMapsLoadState) => void>();

function broadcast(next: GoogleMapsLoadState): void {
  currentState = next;
  subscribers.forEach((fn) => fn(next));
}

export function useGoogleMapsLoader(apiKey: string | undefined): GoogleMapsLoadState {
  const [state, setState] = useState<GoogleMapsLoadState>(() => currentState);

  useEffect(() => {
    if (!apiKey) return;

    subscribers.add(setState);

    if (currentState === "idle") {
      broadcast("loading");
      const script = document.createElement("script");
      // Web Components (gmp-map / gmp-advanced-marker): libraries=maps,marker + v=beta.
      // O parâmetro callback é obrigatório na API — console.debug como noop (padrão do exemplo oficial).
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&callback=console.debug&libraries=maps,marker&v=beta`;
      script.async = true;
      script.onload = () => {
        // "ready" só quando o custom element estiver definido — evita renderizar <gmp-map>
        // antes de a biblioteca registrar o elemento.
        void customElements
          .whenDefined("gmp-map")
          .then(() => broadcast("ready"))
          .catch(() => broadcast("error"));
      };
      script.onerror = () => broadcast("error");
      document.head.appendChild(script);
    } else {
      // Late subscriber: sync to current global state immediately.
      setState(currentState);
    }

    return () => {
      subscribers.delete(setState);
    };
  }, [apiKey]);

  return state;
}
