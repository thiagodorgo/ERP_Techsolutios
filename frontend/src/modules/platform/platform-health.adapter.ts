import type { HealthCheck, PlatformHealthData, WorkerHealthCheck } from "./platform-health.types";

function record(value: unknown): Record<string, unknown> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function string(value: unknown): string | undefined { return typeof value === "string" && value.trim() ? value : undefined; }
function number(value: unknown): number | undefined { return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : undefined; }
function dependency(value: unknown): HealthCheck { const row = record(value); const status = row.status === "up" || row.status === "down" ? row.status : "unknown"; return { status, latencyMs: number(row.latencyMs) }; }
function worker(value: unknown): WorkerHealthCheck { const row = record(value); return { status: string(row.status) ?? "unknown", ageSeconds: number(row.ageSeconds) ?? null }; }

export function adaptPlatformHealth(raw: unknown): Omit<PlatformHealthData, "source" | "stale"> {
  const root = record(raw);
  const checks = record(root.checks);
  const status = root.status === "ready" || root.status === "not_ready" ? root.status : "unknown";
  return { status, version: string(root.version), commit: string(root.commit), timestamp: string(root.timestamp), checks: { postgres: dependency(checks.postgres), redis: dependency(checks.redis), worker: worker(checks.worker) } };
}
