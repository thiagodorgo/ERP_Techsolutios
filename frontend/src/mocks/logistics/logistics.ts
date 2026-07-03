import type { DispatchQueue, LogisticsAsset } from "../../modules/logistics/types";

export const mockAssets: LogisticsAsset[] = [
  { id: "asset-1", label: "Zona Oeste", team: "Equipe Alfa", vehicle: "VTR-042", status: "blocked", location: "Barueri", load: 88 },
  { id: "asset-2", label: "Centro", team: "Equipe Beta", vehicle: "VTR-018", status: "assigned", location: "Bela Vista", load: 52 },
  { id: "asset-3", label: "Osasco", team: "Equipe Delta", vehicle: "VTR-011", status: "in_service", location: "Hospital Santa Clara", load: 76 },
  { id: "asset-4", label: "Guarulhos", team: "Equipe Gama", vehicle: "VTR-027", status: "available", location: "Base Leste", load: 18 },
];

export const mockQueues: DispatchQueue[] = [
  { id: "q-critical", title: "SLA crítico", count: 4, risk: "critical", items: ["OS-10021", "OS-10018", "OS-09987"] },
  { id: "q-no-team", title: "Sem equipe", count: 7, risk: "attention", items: ["OS-10031", "OS-10033", "OS-10035"] },
  { id: "q-approval", title: "Aguardando aprovação", count: 5, risk: "attention", items: ["OS-10012", "OS-10021"] },
];
