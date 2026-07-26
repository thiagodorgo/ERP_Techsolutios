import { ArrowLeft, Ban, Lock, Pencil, Plus, ShieldCheck } from "lucide-react";
import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useParams } from "react-router-dom";

import { Alert, Button, Card, Chip, EmptyState, Skeleton } from "../../../../components/ui";
import { useAutoRefresh } from "../../../../hooks/useAutoRefresh";
import { useAuth } from "../../../../providers/AuthProvider";
import { usePermissions } from "../../../../providers/PermissionProvider";
import { useTenantContext } from "../../../../providers/TenantProvider";
import { YardAreaFormModal } from "../components/YardAreaFormModal";
import { YardFormModal } from "../components/YardFormModal";
import { YardSpotFormModal } from "../components/YardSpotFormModal";
import { getSpotStatusLabel, getSpotStatusTone, getYardActiveLabel, getYardActiveTone } from "../yards.adapter";
import { getYard, getYardOccupancy, listYardAreas, listYardSpots } from "../yards.service";
import type { YardAreaItem, YardItem, YardOccupancySummary, YardSpotItem } from "../yards.types";

const backLinkStyle: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, color: "#2563EB", fontSize: 13, fontWeight: 700, marginBottom: 14, textDecoration: "none" };
const mutedStyle: CSSProperties = { color: "var(--text-secondary)", fontSize: "var(--text-sm)" };
const countStyle: CSSProperties = { fontSize: "var(--text-sm)", color: "var(--text-secondary)", fontWeight: 700 };
const summaryGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 14 };
const rowStyle: CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 4px", borderBottom: "1px solid var(--border-subtle, #E2E8F0)", flexWrap: "wrap" };

type AreaNode = { readonly area: YardAreaItem; readonly depth: number };

// Ordena as áreas como árvore (Quadra→Corredor→Fileira) via parentId, calculando a profundidade para indentação.
function toTree(areas: readonly YardAreaItem[]): AreaNode[] {
  const childrenByParent = new Map<string, YardAreaItem[]>();
  for (const area of areas) {
    const key = area.parentId ?? "__root__";
    const list = childrenByParent.get(key) ?? [];
    list.push(area);
    childrenByParent.set(key, list);
  }
  const ordered: AreaNode[] = [];
  const visited = new Set<string>();
  const walk = (parentKey: string, depth: number) => {
    const children = [...(childrenByParent.get(parentKey) ?? [])].sort((a, b) => a.name.localeCompare(b.name));
    for (const area of children) {
      if (visited.has(area.id)) continue;
      visited.add(area.id);
      ordered.push({ area, depth });
      walk(area.id, depth + 1);
    }
  };
  walk("__root__", 0);
  // Órfãos (parent fora da janela) entram no topo para não sumirem.
  for (const area of areas) {
    if (!visited.has(area.id)) {
      visited.add(area.id);
      ordered.push({ area, depth: 0 });
    }
  }
  return ordered;
}

export function PatioDetailPage() {
  const { yardId } = useParams<{ yardId: string }>();
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  const { can } = usePermissions();

  const canCreate = can("yard:create");
  const canUpdate = can("yard:update");

  const [yard, setYard] = useState<YardItem | null>(null);
  const [areas, setAreas] = useState<YardAreaItem[]>([]);
  const [occupancy, setOccupancy] = useState<YardOccupancySummary | null>(null);
  const [spots, setSpots] = useState<YardSpotItem[]>([]);
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [yardModalOpen, setYardModalOpen] = useState(false);
  const [areaModal, setAreaModal] = useState<{ open: boolean; area: YardAreaItem | null }>({ open: false, area: null });
  const [spotModal, setSpotModal] = useState<{ open: boolean; spot: YardSpotItem | null }>({ open: false, spot: null });

  const context = useMemo(
    () => ({
      token: session?.accessToken,
      tenantId: activeContext?.tenantId,
      branchId: activeContext?.branchId,
      role: activeContext?.role,
      permissions: activeContext?.permissions,
    }),
    [activeContext, session?.accessToken],
  );

  const loadYard = useCallback(async () => {
    if (!yardId || !activeContext) return;
    setLoading(true);
    setError(null);
    setNotFound(false);
    try {
      const [yardData, areaData, occ] = await Promise.all([
        getYard(context, yardId),
        listYardAreas(context, yardId).catch(() => []),
        getYardOccupancy(context, yardId).catch(() => null),
      ]);
      setYard(yardData);
      setNotFound(!yardData);
      setAreas(areaData);
      setOccupancy(occ);
      setSelectedAreaId((current) => (current && areaData.some((area) => area.id === current) ? current : areaData[0]?.id ?? null));
    } catch (err) {
      const status = err && typeof err === "object" && "status" in err ? (err as { status?: number }).status : undefined;
      if (status === 404) setNotFound(true);
      else setError("Não foi possível carregar o pátio.");
    } finally {
      setLoading(false);
    }
  }, [yardId, activeContext, context]);

  const loadSpots = useCallback(async () => {
    if (!selectedAreaId || !activeContext) {
      setSpots([]);
      return;
    }
    try {
      setSpots(await listYardSpots(context, selectedAreaId));
    } catch {
      setSpots([]);
    }
  }, [selectedAreaId, activeContext, context]);

  useEffect(() => {
    void loadYard();
  }, [loadYard]);

  useEffect(() => {
    void loadSpots();
  }, [loadSpots]);

  useAutoRefresh(loadYard, { enabled: Boolean(yardId && activeContext) });

  const tree = useMemo(() => toTree(areas), [areas]);
  const selectedArea = useMemo(() => areas.find((area) => area.id === selectedAreaId) ?? null, [areas, selectedAreaId]);

  return (
    <section className="page-stack work-orders-page">
      <Link to="/patios/patios" style={backLinkStyle}>
        <ArrowLeft size={16} aria-hidden /> Voltar aos pátios
      </Link>

      {loading && !yard ? <Skeleton lines={6} /> : null}

      {error ? (
        <Alert title="Não foi possível carregar o pátio" tone="warning">
          {error}{" "}
          <Button type="button" size="sm" variant="secondary" onClick={() => void loadYard()}>
            Tentar novamente
          </Button>
        </Alert>
      ) : null}

      {!loading && !error && notFound ? (
        <EmptyState title="Pátio não encontrado" detail="O pátio pode ter sido removido ou o endereço está incorreto. Volte à lista de pátios." />
      ) : null}

      {yard ? (
        <>
          <header className="page-heading page-heading--row">
            <div>
              <span>Pátios</span>
              <h1>
                {yard.name} <Chip tone={getYardActiveTone(yard.active)}>{getYardActiveLabel(yard.active)}</Chip>
              </h1>
              <p>
                {yard.address} · Fuso horário: {yard.timezone}
              </p>
            </div>
            <div className="work-orders-actions">
              {canUpdate ? (
                <Button type="button" variant="secondary" onClick={() => setYardModalOpen(true)}>
                  <Pencil size={15} aria-hidden /> Editar pátio
                </Button>
              ) : null}
            </div>
          </header>

          <Card title="Ocupação">
            {occupancy ? (
              <div style={summaryGridStyle}>
                <SummaryStat label="Vagas" value={occupancy.total} />
                <SummaryStat label="Livres" value={occupancy.free} tone="success" />
                <SummaryStat label="Ocupadas" value={occupancy.occupied} tone="warning" />
                <SummaryStat label="Bloqueadas" value={occupancy.blocked} tone="danger" />
              </div>
            ) : (
              <p style={mutedStyle}>Resumo de ocupação indisponível no momento.</p>
            )}
          </Card>

          <Card
            title="Áreas"
            action={
              canCreate ? (
                <Button type="button" size="sm" onClick={() => setAreaModal({ open: true, area: null })}>
                  <Plus size={14} aria-hidden /> Nova área
                </Button>
              ) : (
                <span style={countStyle}>{tree.length} área(s)</span>
              )
            }
          >
            {tree.length === 0 ? (
              <EmptyState title="Nenhuma área cadastrada" detail="Cadastre a primeira área (quadra, corredor ou fileira) para organizar as vagas do pátio." />
            ) : (
              <div>
                {tree.map(({ area, depth }) => (
                  <div key={area.id} style={{ ...rowStyle, paddingLeft: 4 + depth * 20 }}>
                    <button
                      type="button"
                      onClick={() => setSelectedAreaId(area.id)}
                      aria-pressed={area.id === selectedAreaId}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        textAlign: "left",
                        fontWeight: area.id === selectedAreaId ? 800 : 600,
                        color: area.id === selectedAreaId ? "#2563EB" : "#0F172A",
                      }}
                    >
                      <Chip tone="default">{area.kindLabel}</Chip>
                      <span>{area.name}</span>
                      <span style={mutedStyle}>· {area.vehicleClassLabel}</span>
                      {area.covered ? <span style={mutedStyle}>· Coberta</span> : null}
                    </button>
                    {canUpdate ? (
                      <Button type="button" size="sm" variant="ghost" aria-label={`Editar a área ${area.name}`} onClick={() => setAreaModal({ open: true, area })}>
                        <Pencil size={13} aria-hidden /> Editar
                      </Button>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </Card>

          {selectedArea ? (
            <Card
              title={`Vagas · ${selectedArea.name}`}
              action={
                canCreate ? (
                  <Button type="button" size="sm" onClick={() => setSpotModal({ open: true, spot: null })}>
                    <Plus size={14} aria-hidden /> Nova vaga
                  </Button>
                ) : (
                  <span style={countStyle}>{spots.length} vaga(s)</span>
                )
              }
            >
              {spots.length === 0 ? (
                <EmptyState title="Nenhuma vaga cadastrada" detail="Cadastre a primeira vaga desta área. A situação começa como Livre; o bloqueio operacional é feito na edição." />
              ) : (
                <div>
                  {spots.map((spot) => (
                    <div key={spot.id} style={rowStyle}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <strong>{spot.code}</strong>
                        <Chip tone={getSpotStatusTone(spot.status)}>
                          {spot.status === "BLOCKED" ? <Ban size={12} aria-hidden /> : spot.status === "OCCUPIED" ? <Lock size={12} aria-hidden /> : <ShieldCheck size={12} aria-hidden />}{" "}
                          {getSpotStatusLabel(spot.status)}
                        </Chip>
                        <span style={mutedStyle}>{spot.vehicleClassLabel}</span>
                        {spot.covered ? <span style={mutedStyle}>· Coberta</span> : null}
                      </div>
                      {canUpdate ? (
                        <Button type="button" size="sm" variant="ghost" aria-label={`Editar a vaga ${spot.code}`} onClick={() => setSpotModal({ open: true, spot })}>
                          <Pencil size={13} aria-hidden /> Editar
                        </Button>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ) : null}
        </>
      ) : null}

      {yardModalOpen && yard ? (
        <YardFormModal
          key={yard.id}
          yard={yard}
          context={context}
          onClose={() => setYardModalOpen(false)}
          onSaved={() => {
            setYardModalOpen(false);
            void loadYard();
          }}
        />
      ) : null}

      {areaModal.open && yardId ? (
        <YardAreaFormModal
          key={areaModal.area?.id ?? "new-area"}
          yardId={yardId}
          area={areaModal.area}
          areas={areas}
          context={context}
          onClose={() => setAreaModal({ open: false, area: null })}
          onSaved={() => {
            setAreaModal({ open: false, area: null });
            void loadYard();
          }}
        />
      ) : null}

      {spotModal.open && selectedArea ? (
        <YardSpotFormModal
          key={spotModal.spot?.id ?? "new-spot"}
          areaId={selectedArea.id}
          spot={spotModal.spot}
          context={context}
          onClose={() => setSpotModal({ open: false, spot: null })}
          onSaved={() => {
            setSpotModal({ open: false, spot: null });
            void loadSpots();
            void loadYard();
          }}
        />
      ) : null}
    </section>
  );
}

function SummaryStat({ label, value, tone }: { readonly label: string; readonly value: number; readonly tone?: "success" | "warning" | "danger" }) {
  const color = tone === "success" ? "#059669" : tone === "warning" ? "#D97706" : tone === "danger" ? "#DC2626" : "#0F172A";
  return (
    <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 16 }}>
      <div style={{ fontSize: 24, fontWeight: 800, color, fontVariantNumeric: "tabular-nums" }}>{value.toLocaleString("pt-BR")}</div>
      <div style={{ fontSize: 12, color: "#64748B", marginTop: 1 }}>{label}</div>
    </div>
  );
}

export default PatioDetailPage;
