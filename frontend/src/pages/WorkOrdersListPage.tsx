import { Plus, SlidersHorizontal } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { BlockedBanner, ERPSearchBar, FilterBar, WorkOrderCard, WorkOrderGrid } from "../components/erp";
import { Button, Card, Drawer, EmptyState } from "../components/ui";
import { listWorkOrders } from "../modules/work-orders/repository";
import type { WorkOrder } from "../modules/work-orders/types";

export function WorkOrdersListPage() {
  const navigate = useNavigate();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [query, setQuery] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => {
    listWorkOrders().then(setWorkOrders);
  }, []);

  const filtered = workOrders.filter((item) => `${item.code} ${item.customer} ${item.team} ${item.vehicle}`.toLowerCase().includes(query.toLowerCase()));
  const blocked = filtered.find((item) => item.blocked);

  return (
    <section className="page-stack">
      <header className="page-heading page-heading--row">
        <div>
          <span>W17 Ordens de Servico</span>
          <h1>Listagem e busca global de OS</h1>
        </div>
        <Button onClick={() => navigate("/work-orders/new")}>
          <Plus size={16} />
          Criar OS
        </Button>
      </header>
      <FilterBar>
        <ERPSearchBar value={query} onChange={setQuery} />
        <Button variant="secondary" onClick={() => setFilterOpen(true)}>
          <SlidersHorizontal size={16} />
          Filtros
        </Button>
      </FilterBar>
      {blocked?.blockReason ? <BlockedBanner reason={blocked.blockReason} /> : null}
      {filtered.length ? (
        <Card title="Grade operacional">
          <WorkOrderGrid workOrders={filtered} onOpen={(workOrder) => navigate(`/work-orders/${workOrder.id}`)} />
          <div className="work-order-mobile-list">
            {filtered.map((workOrder) => (
              <WorkOrderCard key={workOrder.id} workOrder={workOrder} onOpen={(item) => navigate(`/work-orders/${item.id}`)} />
            ))}
          </div>
        </Card>
      ) : (
        <EmptyState title="Nenhuma OS encontrada" detail="Ajuste filtros de filial, status, SLA ou cliente." />
      )}
      <Drawer title="Filtros avancados" open={filterOpen} onClose={() => setFilterOpen(false)}>
        <div className="drawer-stack">
          <FilterBar />
          <p>Estrutura preparada para filtros salvos por usuário, organização e papel.</p>
          <Button onClick={() => setFilterOpen(false)}>Aplicar filtros</Button>
        </div>
      </Drawer>
    </section>
  );
}
