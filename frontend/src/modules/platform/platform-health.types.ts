export type HealthCheck = { readonly status: "up" | "down" | "unknown"; readonly latencyMs?: number };
export type WorkerHealthCheck = { readonly status: string; readonly ageSeconds: number | null };
export type PlatformHealthData = {
  readonly status: "ready" | "not_ready" | "unknown";
  readonly version?: string;
  readonly commit?: string;
  readonly timestamp?: string;
  readonly checks: { readonly postgres: HealthCheck; readonly redis: HealthCheck; readonly worker: WorkerHealthCheck };
  readonly source: "api" | "mock" | "fallback";
  readonly stale: boolean;
};

export function emptyPlatformHealth(source: PlatformHealthData["source"]): PlatformHealthData {
  return { status: "unknown", checks: { postgres: { status: "unknown" }, redis: { status: "unknown" }, worker: { status: "unknown", ageSeconds: null } }, source, stale: false };
}
