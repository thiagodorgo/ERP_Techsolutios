import { CheckCircle2, Circle } from "lucide-react";
import type { CSSProperties } from "react";

import { Chip, EmptyState } from "../../../../components/ui";
import { formatDateTime, groupPhotosBySet } from "../processes.adapter";
import type { InspectionView } from "../processes.types";

// Vistoria de recepção (LEITURA — art. 14 §1º). Dados do laudo + galeria de fotos AGRUPADA por conjunto (set) +
// selo de completude (requiredSets/complete). §2.8: fileUrl é o único link de mídia (console autenticado). Sem
// vistoria → EmptyState honesto. Edição (PUT) é o PR-08c (não acionável aqui).
const gridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 };
const fieldStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: 2 };
const labelStyle: CSSProperties = { fontSize: 11, color: "#64748B", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".03em" };
const valueStyle: CSSProperties = { fontSize: 14, color: "#0F172A" };
const setTitle: CSSProperties = { fontSize: 13, fontWeight: 800, color: "#0F172A", margin: "14px 0 8px" };
const galleryStyle: CSSProperties = { display: "flex", gap: 10, flexWrap: "wrap" };
const thumbStyle: CSSProperties = { width: 120, height: 90, objectFit: "cover", borderRadius: 8, border: "1px solid #E2E8F0", background: "#F1F5F9" };
const completeRow: CSSProperties = { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 12 };
const requiredSetRow: CSSProperties = { display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#334155" };

export function InspectionSection({ view }: { readonly view: InspectionView }) {
  if (!view) {
    return (
      <EmptyState
        title="Vistoria de recepção ainda não registrada"
        detail="Quando a vistoria de entrada for lançada (estado do veículo, objetos, equipamentos e conjuntos fotográficos), ela aparece aqui."
      />
    );
  }

  const { inspection, photos, requiredSets, complete } = view;
  const groups = groupPhotosBySet(photos);
  const setsWithPhotos = new Set(groups.map((group) => group.set));

  return (
    <div>
      <div style={completeRow}>
        <Chip tone={complete ? "success" : "warning"}>
          {complete ? <CheckCircle2 size={13} aria-hidden /> : <Circle size={13} aria-hidden />}{" "}
          {complete ? "Vistoria completa" : "Vistoria incompleta"}
        </Chip>
        <Chip tone={inspection.signatureStatus === "SIGNED" ? "success" : inspection.signatureStatus === "REFUSED" ? "warning" : "default"}>
          {inspection.signatureStatusLabel}
        </Chip>
        <span style={{ fontSize: 12, color: "#64748B" }}>Registrada em {formatDateTime(inspection.inspectedAt)}</span>
      </div>

      <div style={gridStyle}>
        <Field label="Agente da vistoria" value={inspection.agentName} />
        <Field label="Lataria" value={inspection.bodyworkState} />
        <Field label="Pintura" value={inspection.paintState} />
        <Field label="Pneus" value={inspection.tiresState} />
        <Field label="Hodômetro (km)" value={inspection.odometerKm} />
        <Field label="Objetos internos" value={inspection.internalObjects} />
        <Field label="Equipamentos ausentes" value={inspection.missingEquipment} />
        <Field label="Quem assinou" value={inspection.signerName} />
      </div>

      {inspection.observations ? (
        <div style={{ ...fieldStyle, marginTop: 12 }}>
          <span style={labelStyle}>Observações</span>
          <span style={valueStyle}>{inspection.observations}</span>
        </div>
      ) : null}

      {requiredSets.length > 0 ? (
        <div style={{ marginTop: 14 }}>
          <span style={labelStyle}>Conjuntos fotográficos exigidos</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 6 }}>
            {requiredSets.map((set) => (
              <div key={set} style={requiredSetRow}>
                {setsWithPhotos.has(set) ? <CheckCircle2 size={14} color="#059669" aria-hidden /> : <Circle size={14} color="#D97706" aria-hidden />}
                <span>{set}</span>
                <span style={{ color: "#94A3B8" }}>{setsWithPhotos.has(set) ? "registrado" : "pendente"}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {groups.length === 0 ? (
        <p style={{ ...valueStyle, color: "#64748B", marginTop: 12 }}>Nenhuma foto de vistoria anexada.</p>
      ) : (
        groups.map((group) => (
          <div key={group.set}>
            <div style={setTitle}>{`Conjunto ${group.set} · ${group.photos.length} ${group.photos.length === 1 ? "foto" : "fotos"}`}</div>
            <div style={galleryStyle}>
              {group.photos.map((photo) => (
                <a key={photo.id} href={photo.fileUrl} target="_blank" rel="noreferrer" aria-label={`Abrir foto do conjunto ${group.set}`}>
                  <img src={photo.fileUrl} alt={`Foto da vistoria — conjunto ${group.set}`} style={thumbStyle} loading="lazy" />
                </a>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function Field({ label, value }: { readonly label: string; readonly value: string | null }) {
  return (
    <div style={fieldStyle}>
      <span style={labelStyle}>{label}</span>
      <span style={valueStyle}>{value?.trim() ? value : "—"}</span>
    </div>
  );
}

export default InspectionSection;
