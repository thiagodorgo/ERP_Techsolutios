import { AlertTriangle, ArrowLeft, Package, Pencil, Plus } from "lucide-react";
import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { DENSE_LIST_FETCH_LIMIT } from "../../../components/dense-list";
import { Alert, Button, Chip, EmptyState, Skeleton } from "../../../components/ui";
import { useAutoRefresh } from "../../../hooks/useAutoRefresh";
import { useAuth } from "../../../providers/AuthProvider";
import { usePermissions } from "../../../providers/PermissionProvider";
import { useTenantContext } from "../../../providers/TenantProvider";
import { useVehicles } from "../../registry/vehicles/useVehicles";
import type { VehiclesFilters } from "../../registry/vehicles/vehicles.types";
import { useWorkOrders } from "../../work-orders/useWorkOrders";
import type { WorkOrdersFilters } from "../../work-orders/work-orders.types";
import { InventoryItemFormModal } from "../components/InventoryItemFormModal";
import { StockMovementFormModal } from "../components/StockMovementFormModal";
import {
  countMovements30d,
  formatMovementDateTime,
  formatQuantity,
  formatSignedQuantity,
  formatValor,
  getAbcClassLabel,
  getMovementTypeLabel,
  getMovementTypeTone,
  getReplenishmentLabel,
  getReplenishmentTone,
} from "../inventory.adapter";
import { getInventoryItem } from "../inventory.service";
import type { InventoryItem, StockMovementsFilters } from "../inventory.types";
import { useStockMovements } from "../useStockMovements";

// F7a Estoque · detalhe — "Estoque · detalhe" (sc_estoqueDetail), agora ligado a
// GET /api/v1/inventory-items/:id + GET /api/v1/stock-movements?item_id=.
// A rota é /inventory/:id (a API busca por ID — não por SKU). Identidade visual da
// tela aprovada preservada; as linhas fabricadas da casca foram removidas (D-007).

const STABLE_VEHICLE_FILTERS: VehiclesFilters = { search: "", isActive: "all", limit: DENSE_LIST_FETCH_LIMIT };
const STABLE_WORK_ORDER_FILTERS: WorkOrdersFilters = { search: "", status: "all", priority: "all", assignedOperatorId: "", from: "", to: "" };

const mono = "'JetBrains Mono', monospace";
const POSITIVE_QTY_COLOR = "#059669";
const NEGATIVE_QTY_COLOR = "#DC2626";
const gridCols = "1fr 1.2fr 2fr 1fr 1fr 1.2fr";

const mutedStyle: CSSProperties = { fontSize: "var(--text-sm)", color: "var(--text-secondary)" };
const backLinkStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  color: "#2563EB",
  fontSize: 13,
  fontWeight: 700,
  marginBottom: 14,
  textDecoration: "none",
};
const headCellStyle: CSSProperties = { fontSize: 11, fontWeight: 700, color: "#94A3B8", letterSpacing: ".03em" };

type ItemState = {
  readonly item: InventoryItem | null;
  readonly loading: boolean;
  readonly error: string | null;
  readonly notFound: boolean;
};

export function EstoqueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  const { can } = usePermissions();

  const canUpdateItem = can("inventory_items:update");
  const canCreateMovement = can("stock_movements:create");

  const [state, setState] = useState<ItemState>({ item: null, loading: false, error: null, notFound: false });
  const [itemFormOpen, setItemFormOpen] = useState(false);
  const [movementFormOpen, setMovementFormOpen] = useState(false);

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

  const movementsFilters = useMemo<StockMovementsFilters>(() => ({ itemId: id ?? "", limit: DENSE_LIST_FETCH_LIMIT }), [id]);
  const {
    items: movements,
    pagination: movementsPagination,
    loading: movementsLoading,
    error: movementsError,
    refresh: refreshMovements,
  } = useStockMovements(movementsFilters);
  // WS-UI-REFRESH — as movimentações do item recarregam sozinhas em segundo plano (sem botão "Atualizar").
  useAutoRefresh(refreshMovements, { enabled: Boolean(id && activeContext) });
  const { items: workOrders } = useWorkOrders(STABLE_WORK_ORDER_FILTERS);
  const { items: vehicles } = useVehicles(STABLE_VEHICLE_FILTERS);

  const workOrderById = useMemo(() => new Map(workOrders.map((workOrder) => [workOrder.id, workOrder])), [workOrders]);

  const loadItem = useCallback(async () => {
    if (!id || !activeContext) return;

    setState((prev) => ({ ...prev, loading: true, error: null, notFound: false }));
    try {
      const item = await getInventoryItem(context, id);
      setState({ item, loading: false, error: null, notFound: !item });
    } catch (error) {
      const status = error && typeof error === "object" && "status" in error ? (error as { status?: number }).status : undefined;
      if (status === 404) {
        setState({ item: null, loading: false, error: null, notFound: true });
      } else {
        setState({ item: null, loading: false, error: "Não foi possível carregar o item de estoque.", notFound: false });
      }
    }
  }, [id, activeContext, context]);

  useEffect(() => {
    void loadItem();
  }, [loadItem]);

  const item = state.item;
  const movements30d = useMemo(() => countMovements30d(movements), [movements]);

  return (
    <div style={{ color: "#0F172A" }}>
      <Link to="/inventory" style={backLinkStyle}>
        <ArrowLeft size={16} aria-hidden />
        Voltar ao estoque
      </Link>

      {/* estado: carregando item */}
      {state.loading && !item ? <Skeleton lines={6} /> : null}

      {/* estado: erro ao carregar o item (com retry) */}
      {state.error ? (
        <Alert title="Não foi possível carregar o item" tone="warning">
          {state.error}{" "}
          <Button type="button" size="sm" variant="secondary" onClick={() => void loadItem()}>
            Tentar novamente
          </Button>
        </Alert>
      ) : null}

      {/* estado: não encontrado (inclui modo demonstração — sem dados fabricados) */}
      {!state.loading && !state.error && state.notFound ? (
        <EmptyState title="Item não encontrado" detail="O item pode ter sido removido ou o endereço está incorreto. Volte ao estoque e tente novamente." />
      ) : null}

      {item ? (
        <>
          {/* header — identidade da tela aprovada */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 13,
                  background: item.belowMin ? "#FFFBEB" : "#EFF6FF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: item.belowMin ? "#D97706" : "#2563EB",
                  flexShrink: 0,
                }}
              >
                <Package size={26} aria-hidden />
              </div>
              <div>
                <h1 style={{ fontSize: 20, fontWeight: 800, color: "#0F172A", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  {item.name}
                  <Chip tone={getReplenishmentTone(item.belowMin)}>{getReplenishmentLabel(item.belowMin)}</Chip>
                  {!item.isActive ? <Chip tone="default">Inativo</Chip> : null}
                </h1>
                <div style={{ fontSize: 13, color: "#64748B", fontFamily: mono }}>
                  {item.sku} · {item.unit} · Classe ABC: {getAbcClassLabel(item.abcClass)}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {canUpdateItem ? (
                <Button type="button" variant="secondary" onClick={() => setItemFormOpen(true)}>
                  <Pencil size={15} aria-hidden /> Editar
                </Button>
              ) : null}
              {canCreateMovement ? (
                <Button type="button" onClick={() => setMovementFormOpen(true)}>
                  <Plus size={15} aria-hidden /> Movimento
                </Button>
              ) : null}
            </div>
          </div>

          {/* alerta real de reposição (saldo × mínimo vindos do servidor) */}
          {item.belowMin ? (
            <div
              style={{
                marginBottom: 16,
                padding: "13px 16px",
                borderRadius: 12,
                background: "#FFFBEB",
                border: "1px solid #FDE68A",
                display: "flex",
                alignItems: "center",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <AlertTriangle size={18} style={{ color: "#D97706", flexShrink: 0 }} aria-hidden />
              <div style={{ fontSize: 13, color: "#92400E", flex: 1, minWidth: 220 }}>
                <strong>Abaixo do mínimo:</strong> {formatQuantity(item.saldo, item.unit)} disponíveis, abaixo do mínimo de{" "}
                {formatQuantity(item.minQuantity, item.unit)}.
              </div>
              <Link to="/purchase-orders" style={{ fontSize: 12.5, fontWeight: 700, color: "#2563EB" }}>
                Ver pedidos de compra
              </Link>
            </div>
          ) : null}

          {/* stat cards reais */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 16 }}>
            <DetailStat value={formatQuantity(item.saldo, item.unit)} label="Saldo atual" color={item.belowMin ? "#D97706" : "#0F172A"} />
            <DetailStat value={formatQuantity(item.minQuantity, item.unit)} label="Estoque mínimo" color="#0F172A" />
            <DetailStat value={formatValor(item.avgCost)} label="Custo médio un." color="#0F172A" />
            <DetailStat value={movements30d.toLocaleString("pt-BR")} label="Movimentações 30d" color="#0F172A" />
          </div>

          {/* histórico de movimentações do item (imutáveis) */}
          <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "15px 18px", borderBottom: "1px solid #F1F5F9" }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#0F172A" }}>Movimentações</div>
              <span style={mutedStyle}>
                {movements.length} movimento(s)
                {movementsPagination.total > movements.length ? ` · janela: primeiros ${movements.length} de ${movementsPagination.total}` : ""}
              </span>
            </div>

            {movementsError ? (
              <div style={{ padding: "14px 18px" }}>
                <Alert title="Não foi possível carregar as movimentações" tone="warning">
                  {movementsError}{" "}
                  <Button type="button" size="sm" variant="secondary" onClick={() => void refreshMovements()}>
                    Tentar novamente
                  </Button>
                </Alert>
              </div>
            ) : null}

            {movementsLoading && movements.length === 0 && !movementsError ? (
              <div style={{ padding: "14px 18px" }}>
                <Skeleton lines={4} />
              </div>
            ) : null}

            {!movementsLoading && !movementsError && movements.length === 0 ? (
              <EmptyState
                title="Nenhuma movimentação registrada"
                detail="Registre uma entrada, saída, consumo ou ajuste pelo botão Movimento — o saldo é calculado a partir delas."
              />
            ) : null}

            {!movementsError && movements.length > 0 ? (
              <>
                <div style={{ display: "grid", gridTemplateColumns: gridCols, padding: "11px 18px", background: "#F8FAFC", borderBottom: "1px solid #F1F5F9", gap: 8 }}>
                  <span style={headCellStyle}>TIPO</span>
                  <span style={{ ...headCellStyle, textAlign: "right" }}>QUANTIDADE</span>
                  <span style={headCellStyle}>MOTIVO</span>
                  <span style={{ ...headCellStyle, textAlign: "right" }}>CUSTO UNIT.</span>
                  <span style={headCellStyle}>OS</span>
                  <span style={{ ...headCellStyle, textAlign: "right" }}>DATA</span>
                </div>
                {movements.map((movement) => {
                  const workOrder = movement.workOrderId ? workOrderById.get(movement.workOrderId) : undefined;
                  return (
                    <div
                      key={movement.id}
                      style={{ display: "grid", gridTemplateColumns: gridCols, padding: "13px 18px", borderBottom: "1px solid #F1F5F9", alignItems: "center", gap: 8 }}
                    >
                      <span>
                        <Chip tone={getMovementTypeTone(movement.type)}>{getMovementTypeLabel(movement.type)}</Chip>
                      </span>
                      <span
                        style={{
                          fontSize: 13.5,
                          fontWeight: 700,
                          textAlign: "right",
                          fontVariantNumeric: "tabular-nums",
                          color: movement.quantidadeSinalizada >= 0 ? POSITIVE_QTY_COLOR : NEGATIVE_QTY_COLOR,
                        }}
                      >
                        {formatSignedQuantity(movement.quantidadeSinalizada, item.unit)}
                      </span>
                      <span style={{ fontSize: 13, color: "#1E293B" }}>{movement.reason ?? "—"}</span>
                      <span style={{ fontSize: 13, color: "#475569", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                        {formatValor(movement.unitCost)}
                      </span>
                      <span style={{ fontSize: 13 }}>
                        {movement.workOrderId ? (
                          <Link to={`/work-orders/${movement.workOrderId}`} aria-label={`Abrir OS ${workOrder?.code ?? movement.workOrderId}`}>
                            {workOrder?.code ?? "Abrir OS"}
                          </Link>
                        ) : (
                          <span style={mutedStyle}>—</span>
                        )}
                      </span>
                      <span style={{ fontSize: 12.5, color: "#94A3B8", textAlign: "right", fontFamily: mono }}>
                        {formatMovementDateTime(movement.createdAt)}
                      </span>
                    </div>
                  );
                })}
              </>
            ) : null}
          </div>
        </>
      ) : null}

      {itemFormOpen && item ? (
        <InventoryItemFormModal
          key={item.id}
          item={item}
          context={context}
          onClose={() => setItemFormOpen(false)}
          onSaved={() => {
            setItemFormOpen(false);
            void loadItem();
          }}
        />
      ) : null}

      {movementFormOpen && item ? (
        <StockMovementFormModal
          items={[item]}
          initialItemId={item.id}
          workOrders={workOrders}
          vehicles={vehicles}
          context={context}
          onClose={() => setMovementFormOpen(false)}
          onSaved={() => {
            setMovementFormOpen(false);
            // Movimento altera o saldo → recarrega item e histórico.
            void loadItem();
            void refreshMovements();
          }}
        />
      ) : null}

      {/* navegação de fallback para itens não encontrados */}
      {!state.loading && state.notFound ? (
        <div style={{ marginTop: 14 }}>
          <Button type="button" variant="secondary" onClick={() => navigate("/inventory")}>
            <ArrowLeft size={15} aria-hidden /> Ir para a lista de itens
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function DetailStat({ value, label, color }: { readonly value: string; readonly label: string; readonly color: string }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 16 }}>
      <div style={{ fontSize: 24, fontWeight: 800, color, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      <div style={{ fontSize: 12, color: "#64748B", marginTop: 1 }}>{label}</div>
    </div>
  );
}

export default EstoqueDetailPage;
