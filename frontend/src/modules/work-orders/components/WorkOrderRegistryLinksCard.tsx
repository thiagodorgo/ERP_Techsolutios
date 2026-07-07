import { Truck, UserRound, Users, Wrench } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

import { Chip } from "../../../components/ui";
import { formatBRL } from "../../registry/service-catalog/service-catalog.adapter";
import type { WorkOrderDetail } from "../work-orders.types";

// C2 (Detalhe de OS enriquecido): "Cadastros vinculados" — mostra os vínculos
// resolvidos (cliente/viatura/equipe/serviço) que o backend anexa ao detalhe.
// Regras: nunca exibe UUID (só nome/placa/valor); o snapshot do cliente é a
// fonte da verdade e o vínculo com o cadastro é apenas um reforço; degrada
// para snapshot-only quando `links` está ausente (OS antiga / backend sem C2).

const card: CSSProperties = { background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14 };
const rowLabel: CSSProperties = { display: "flex", alignItems: "center", gap: 7, fontSize: 11.5, color: "#94A3B8", fontWeight: 600, marginBottom: 5 };
const iconWrap: CSSProperties = { color: "#94A3B8", display: "inline-flex" };
const valueStrong: CSSProperties = { fontSize: 14, fontWeight: 700, color: "#0F172A" };
const valueMuted: CSSProperties = { fontSize: 13.5, fontWeight: 600, color: "#94A3B8" };
const mono: CSSProperties = { fontFamily: "'JetBrains Mono', monospace" };

function LinkRow({ icon, label, children, last }: { icon: ReactNode; label: string; children: ReactNode; last?: boolean }) {
  return (
    <div style={{ padding: "14px 0", borderBottom: last ? "none" : "1px solid #F1F5F9" }}>
      <div style={rowLabel}>
        <span style={iconWrap} aria-hidden>{icon}</span>
        {label}
      </div>
      {children}
    </div>
  );
}

export function WorkOrderRegistryLinksCard({ workOrder }: { workOrder: WorkOrderDetail }) {
  const links = workOrder.links ?? null;
  const customerLink = links?.customer ?? null;
  const vehicle = links?.vehicle ?? null;
  const team = links?.team ?? null;
  const service = links?.serviceCatalog ?? null;

  const hasSnapshot = Boolean(workOrder.customerName || workOrder.customerDocument || workOrder.customerPhone);

  return (
    <div style={{ ...card, padding: 20 }}>
      <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>Cadastros vinculados</div>
      <div style={{ fontSize: 12.5, color: "#64748B", marginBottom: 6, lineHeight: 1.45 }}>Cliente, viatura, equipe e serviço ligados a esta ordem.</div>

      {/* Cliente — o snapshot capturado na criação é a fonte da verdade;
          o vínculo com o cadastro atual (quando existe) é um reforço. */}
      <LinkRow icon={<UserRound size={13} />} label="Cliente">
        {hasSnapshot ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={valueStrong}>{workOrder.customerName ?? "Cliente sem nome informado"}</span>
              {customerLink ? <Chip tone="info">Vinculado ao cadastro</Chip> : null}
              {customerLink && !customerLink.isActive ? <Chip tone="warning">Cadastro inativo</Chip> : null}
            </div>
            {workOrder.customerDocument || workOrder.customerPhone ? (
              <div style={{ fontSize: 12, color: "#64748B", marginTop: 3, ...mono }}>{[workOrder.customerDocument, workOrder.customerPhone].filter(Boolean).join(" · ")}</div>
            ) : null}
            <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 4 }}>Dados no momento da criação</div>
          </>
        ) : customerLink ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={valueStrong}>{customerLink.name}</span>
            <Chip tone="info">Vinculado ao cadastro</Chip>
            {!customerLink.isActive ? <Chip tone="warning">Cadastro inativo</Chip> : null}
          </div>
        ) : (
          <span style={valueMuted}>Sem cliente vinculado</span>
        )}
      </LinkRow>

      {/* Viatura */}
      <LinkRow icon={<Truck size={13} />} label="Viatura">
        {vehicle ? (
          <span style={valueStrong}>{[vehicle.plate, vehicle.model].filter(Boolean).join(" · ")}</span>
        ) : (
          <span style={valueMuted}>Sem viatura vinculada</span>
        )}
      </LinkRow>

      {/* Equipe */}
      <LinkRow icon={<Users size={13} />} label="Equipe">
        {team ? <span style={valueStrong}>{team.name}</span> : <span style={valueMuted}>Sem equipe vinculada</span>}
      </LinkRow>

      {/* Serviço */}
      <LinkRow icon={<Wrench size={13} />} label="Serviço" last>
        {service ? (
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
            <span style={valueStrong}>{service.name}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#059669", ...mono }}>{formatBRL(service.basePrice)}</span>
          </div>
        ) : (
          <span style={valueMuted}>Sem serviço vinculado</span>
        )}
      </LinkRow>
    </div>
  );
}

export default WorkOrderRegistryLinksCard;
