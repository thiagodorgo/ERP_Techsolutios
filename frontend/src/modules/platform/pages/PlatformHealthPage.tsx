import { Activity, Database, HardDrive, Server } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { Alert, Skeleton } from "../../../components/ui";
import type { HealthCheck, PlatformHealthData } from "../platform-health.types";
import { usePlatformHealth } from "../usePlatformHealth";

const card: CSSProperties = { background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14 };
function Header() { return <div style={{ marginBottom: 18 }}><div style={{ fontSize: 20, fontWeight: 800 }}>Saúde do Sistema</div><div style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>prontidão dos serviços monitorados pela plataforma</div></div>; }
function latency(check: HealthCheck): string { return check.latencyMs === undefined ? "latência não informada" : `${check.latencyMs} ms`; }
function ServiceCard({ name, operational, detail, icon }: { readonly name: string; readonly operational: boolean; readonly detail: string; readonly icon: ReactNode }) { return <div style={{ ...card, padding: 18 }}><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}><span style={{ width: 36, height: 36, borderRadius: 9, background: operational ? "#ECFDF5" : "#FEF2F2", color: operational ? "#059669" : "#DC2626", display: "flex", alignItems: "center", justifyContent: "center" }}>{icon}</span><span style={{ fontSize: 11, fontWeight: 800, padding: "4px 9px", borderRadius: 99, background: operational ? "#ECFDF5" : "#FEF2F2", color: operational ? "#059669" : "#DC2626" }}>{operational ? "Operacional" : "Indisponível"}</span></div><div style={{ fontSize: 14, fontWeight: 800 }}>{name}</div><div style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>{detail}</div></div>; }

export function PlatformHealthView({ data }: { readonly data: PlatformHealthData }) {
  const workerOperational = data.checks.worker.status === "healthy" || data.checks.worker.status === "up";
  return <div style={{ color: "#0F172A" }}><Header />{data.stale ? <div style={{ marginBottom: 14 }}><Alert title="Dados desatualizados" tone="warning">A última atualização falhou; o último estado confirmado continua visível.</Alert></div> : null}<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", ...card, padding: 16, marginBottom: 14 }}><div><div style={{ fontSize: 14, fontWeight: 800 }}>{data.status === "ready" ? "Sistema pronto" : "Sistema não pronto"}</div><div style={{ fontSize: 12, color: "#64748B", marginTop: 3 }}>versão {data.version ?? "não informada"} · revisão {data.commit ?? "não informada"}</div></div><Activity size={20} style={{ color: data.status === "ready" ? "#059669" : "#DC2626" }} /></div><div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 14 }}><ServiceCard name="Postgres" operational={data.checks.postgres.status === "up"} detail={latency(data.checks.postgres)} icon={<Database size={18} />} /><ServiceCard name="Redis" operational={data.checks.redis.status === "up"} detail={latency(data.checks.redis)} icon={<HardDrive size={18} />} /><ServiceCard name="Worker" operational={workerOperational} detail={data.checks.worker.ageSeconds === null ? "sinal não informado" : `último sinal há ${data.checks.worker.ageSeconds} s`} icon={<Server size={18} />} /></div><div style={{ ...card, padding: 18, background: "#F8FAFC", borderStyle: "dashed", display: "flex", gap: 12 }}><Activity size={18} style={{ color: "#2563EB", flexShrink: 0 }} /><div><div style={{ fontSize: 13, fontWeight: 800 }}>Monitoramento em preparação</div><div style={{ fontSize: 12.5, color: "#64748B", marginTop: 3, lineHeight: 1.5 }}>Uptime, latência p95, erros, profundidade de fila, integrações e último backup dependem da camada de observabilidade e continuam sem números nesta tela.</div></div></div></div>;
}

export function PlatformHealthPage() {
  const { data, loading } = usePlatformHealth();
  if (loading) return <div style={{ color: "#0F172A" }}><Header /><div style={{ ...card, padding: 20, marginBottom: 14 }}><Skeleton lines={5} /></div><div style={{ ...card, padding: 18, background: "#F8FAFC", borderStyle: "dashed" }}><div style={{ fontSize: 13, fontWeight: 800 }}>Monitoramento em preparação</div><div style={{ fontSize: 12.5, color: "#64748B", marginTop: 3 }}>A observabilidade complementar permanece sem fonte nesta versão.</div></div></div>;
  if (data.source !== "api") return <div style={{ color: "#0F172A" }}><Header /><Alert title="Não foi possível consultar a prontidão" tone="warning">A verificação será repetida automaticamente. Nenhum estado de serviço é presumido.</Alert></div>;
  return <PlatformHealthView data={data} />;
}

export default PlatformHealthPage;
