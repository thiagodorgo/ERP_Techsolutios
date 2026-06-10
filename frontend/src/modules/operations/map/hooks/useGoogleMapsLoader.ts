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
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&loading=async`;
      script.async = true;
      script.defer = true;
      script.onload = () => broadcast("ready");
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
