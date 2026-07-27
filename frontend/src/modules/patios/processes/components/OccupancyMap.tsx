import { Ban, ExternalLink, Lock, PackageOpen, Pencil, Plus, ShieldCheck } from "lucide-react";
import type { CSSProperties } from "react";
import { Link } from "react-router-dom";

import { Button } from "../../../../components/ui";
import { getVehicleLabel } from "../processes.adapter";
import type { ProcessListItem } from "../processes.types";
import type { YardSpotItem } from "../../yards/yards.types";

// Mapa de ocupação (§11) — grade de vagas colorida por status (FREE verde / OCCUPIED âmbar / BLOCKED vermelho).
// A vaga OCUPADA vira LINK ao dossiê do processo (placa resolvida via join client-side com a lista de processos
// do pátio). §allowlist: currentProcessId NUNCA é renderizado como texto — só no href do dossiê e no join.
// Ações allocate/vacate/move (impound:allocate) aparecem só quando `canAllocate`; "Editar" (config da vaga +
// bloqueio operacional FREE⇄BLOCKED) aparece só quando `canEdit` (yard:update) — preserva a capacidade do PR-04.

type ProcessSummary = Pick<ProcessListItem, "id" | "vehiclePlate" | "vehicleUnidentified" | "statusLabel">;

const gridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 };
const tileBase: CSSProperties = { border: "1px solid", borderRadius: 12, padding: 12, display: "flex", flexDirection: "column", gap: 8, minHeight: 96 };
const codeRow: CSSProperties = { display: "flex", alignItems: "center", gap: 6, fontWeight: 800, color: "#0F172A" };
const mutedStyle: CSSProperties = { fontSize: 12, color: "#64748B" };
const linkStyle: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 4, color: "#2563EB", fontWeight: 700, fontSize: 13, textDecoration: "none" };
const actionRow: CSSProperties = { display: "flex", gap: 6, flexWrap: "wrap", marginTop: "auto" };

const TONE: Record<string, { bg: string; border: string }> = {
  FREE: { bg: "#F0FDF4", border: "#BBF7D0" },
  OCCUPIED: { bg: "#FFFBEB", border: "#FDE68A" },
  BLOCKED: { bg: "#FEF2F2", border: "#FECACA" },
};

export function OccupancyMap({
  spots,
  resolveProcess,
  canAllocate,
  canEdit = false,
  onAllocate,
  onVacate,
  onMove,
  onEdit,
}: {
  readonly spots: readonly YardSpotItem[];
  readonly resolveProcess: (processId: string) => ProcessSummary | undefined;
  readonly canAllocate: boolean;
  readonly canEdit?: boolean;
  readonly onAllocate?: (spot: YardSpotItem) => void;
  readonly onVacate?: (spot: YardSpotItem, processId: string) => void;
  readonly onMove?: (spot: YardSpotItem, processId: string) => void;
  readonly onEdit?: (spot: YardSpotItem) => void;
}) {
  const showEdit = canEdit && Boolean(onEdit);
  return (
    <div style={gridStyle}>
      {spots.map((spot) => {
        const tone = TONE[spot.status] ?? TONE.FREE;
        const process = spot.currentProcessId ? resolveProcess(spot.currentProcessId) : undefined;
        return (
          <div key={spot.id} style={{ ...tileBase, background: tone.bg, borderColor: tone.border }}>
            <div style={codeRow}>
              {spot.status === "BLOCKED" ? <Ban size={14} aria-hidden /> : spot.status === "OCCUPIED" ? <Lock size={14} aria-hidden /> : <ShieldCheck size={14} aria-hidden />}
              <span>{spot.code}</span>
              <span style={{ ...mutedStyle, fontWeight: 600 }}>· {spot.statusLabel}</span>
            </div>

            {spot.status === "OCCUPIED" && spot.currentProcessId ? (
              <div>
                <Link to={`/patios/processos/${spot.currentProcessId}`} style={linkStyle} aria-label="Abrir o dossiê do processo desta vaga">
                  {process ? getVehicleLabel(process) : "Abrir dossiê"} <ExternalLink size={13} aria-hidden />
                </Link>
                {process ? <div style={mutedStyle}>{process.statusLabel}</div> : null}
              </div>
            ) : (
              <div style={mutedStyle}>{spot.vehicleClassLabel}{spot.covered ? " · Coberta" : ""}</div>
            )}

            {canAllocate || showEdit ? (
              <div style={actionRow}>
                {canAllocate && spot.status === "FREE" && onAllocate ? (
                  <Button type="button" size="sm" variant="secondary" onClick={() => onAllocate(spot)} aria-label={`Alocar um processo na vaga ${spot.code}`}>
                    <Plus size={13} aria-hidden /> Alocar
                  </Button>
                ) : null}
                {canAllocate && spot.status === "OCCUPIED" && spot.currentProcessId && onMove ? (
                  <Button type="button" size="sm" variant="ghost" onClick={() => onMove(spot, spot.currentProcessId as string)} aria-label={`Mover o processo da vaga ${spot.code}`}>
                    <PackageOpen size={13} aria-hidden /> Mover
                  </Button>
                ) : null}
                {canAllocate && spot.status === "OCCUPIED" && spot.currentProcessId && onVacate ? (
                  <Button type="button" size="sm" variant="ghost" onClick={() => onVacate(spot, spot.currentProcessId as string)} aria-label={`Liberar a vaga ${spot.code}`}>
                    Liberar
                  </Button>
                ) : null}
                {showEdit ? (
                  <Button type="button" size="sm" variant="ghost" onClick={() => onEdit?.(spot)} aria-label={`Editar a vaga ${spot.code}`}>
                    <Pencil size={13} aria-hidden /> Editar
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export default OccupancyMap;
