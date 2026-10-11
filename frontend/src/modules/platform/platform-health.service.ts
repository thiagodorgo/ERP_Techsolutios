import { isMockMode } from "../../config/env";
import { adaptPlatformHealth } from "./platform-health.adapter";
import type { PlatformHealthData } from "./platform-health.types";
import { emptyPlatformHealth } from "./platform-health.types";

// A rota pública devolve corpo útil tanto em 200 quanto em 503. Por isso este serviço lê o Response
// diretamente, sem anexar autorização e sem usar o cliente que transforma 503 em exceção sem corpo.
export async function getPlatformHealth(): Promise<PlatformHealthData> {
  if (isMockMode()) return emptyPlatformHealth("mock");
  try {
    const response = await fetch("/api/v1/health/ready", { headers: { Accept: "application/json" } });
    if (response.status !== 200 && response.status !== 503) return emptyPlatformHealth("fallback");
    const raw: unknown = await response.json();
    return { ...adaptPlatformHealth(raw), source: "api", stale: false };
  } catch {
    return emptyPlatformHealth("fallback");
  }
}
