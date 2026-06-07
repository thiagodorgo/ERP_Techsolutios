import { Camera, CheckSquare, ClipboardCheck, FileSignature, MapPin, Plus, Send, ToggleLeft, Wrench } from "lucide-react";

import { Badge, Button, Card, Chip, Table } from "../../../components/ui";
import type { TenantChecklist, TenantChecklistComponent, TenantChecklistType } from "../types";

const availableComponents: Array<{ key: string; label: string; icon: typeof CheckSquare }> = [
  { key: "photo", label: "Foto obrigatoria", icon: Camera },
  { key: "textarea", label: "Observacao", icon: ClipboardCheck },
  { key: "damage_marker", label: "Marcador de avaria", icon: MapPin },
  { key: "acknowledgement", label: "Ciencia de responsabilidade", icon: FileSignature },
];

const checklistTypeLabel: Record<TenantChecklistType, string> = {
  towing_collection: "Guincho - coleta",
  towing_delivery: "Guincho - entrega",
  technical_evidence: "Evidencia tecnica",
  custom: "Customizado",
};

const mockChecklists: TenantChecklist[] = [
  {
    id: "chk_towing_collection",
    tenantId: "ten-industrial-01",
    name: "Coleta de veiculo rebocado",
    description: "Seleciona tipo de veiculo, registra avarias e fotos na coleta.",
    type: "towing_collection",
    status: "published",
    version: 3,
    publishedAt: "2026-06-05T13:00:00.000Z",
    updatedAt: "2026-06-05T13:00:00.000Z",
    components: [
      component("vehicle_type", "Tipo de veiculo", true),
      component("damage_marker", "Marcacao de avarias", true),
      component("photo", "Fotos da coleta", true),
    ],
  },
  {
    id: "chk_towing_delivery",
    tenantId: "ten-industrial-01",
    name: "Entrega de veiculo rebocado",
    description: "Nova vistoria, comparacao com coleta e ciencia quando houver divergencia.",
    type: "towing_delivery",
    status: "draft",
    version: 2,
    updatedAt: "2026-06-06T17:30:00.000Z",
    components: [
      component("damage_marker", "Nova vistoria", true),
      component("textarea", "Observacao de divergencia", true, { requireObservation: true }),
      component("acknowledgement", "Ciencia de responsabilidade", true, { requireAcknowledgement: true }),
    ],
  },
  {
    id: "chk_technical_before_after",
    tenantId: "ten-industrial-01",
    name: "Evidencia tecnica antes/depois",
    description: "Reparo, construcao, manutencao ou servico interno/externo.",
    type: "technical_evidence",
    status: "published",
    version: 1,
    publishedAt: "2026-06-04T10:00:00.000Z",
    updatedAt: "2026-06-04T10:00:00.000Z",
    components: [
      component("before_after_photo", "Foto antes/depois", true, { requirePhoto: true }),
      component("textarea", "Laudo tecnico", false),
    ],
  },
];

function component(
  type: TenantChecklistComponent["type"],
  label: string,
  required: boolean,
  config?: TenantChecklistComponent["config"],
): TenantChecklistComponent {
  return {
    id: `cmp_${type}_${label.toLowerCase().replaceAll(" ", "_")}`,
    key: type,
    label,
    type,
    required,
    orderIndex: 0,
    config,
  };
}

export function TenantChecklistsPage() {
  return (
    <div className="page-stack">
      <header className="page-heading page-heading--row">
        <div>
          <span>W02A · Administrador</span>
          <h1>Checklists</h1>
          <p>Configuracao tenant_checklist para schemas consumidos por Web e Mobile.</p>
        </div>
        <div className="platform-actions">
          <Button variant="secondary">
            <ToggleLeft size={16} />
            Ativar/Inativar
          </Button>
          <Button>
            <Plus size={16} />
            Criar checklist
          </Button>
        </div>
      </header>

      <section className="tenant-checklist-grid">
        <Card title="Templates do tenant">
          <Table
            rows={mockChecklists}
            keyForRow={(row) => row.id}
            columns={[
              { key: "name", header: "Checklist", render: (row) => <strong>{row.name}</strong> },
              { key: "type", header: "Tipo", render: (row) => checklistTypeLabel[row.type] },
              { key: "status", header: "Status", render: (row) => <Chip tone={row.status === "published" ? "success" : "pending"}>{row.status}</Chip> },
              { key: "version", header: "Versao", render: (row) => `v${row.version}` },
              { key: "components", header: "Componentes", render: (row) => String(row.components.length) },
            ]}
          />
        </Card>

        <Card title="Componentes disponiveis">
          <div className="tenant-checklist-components">
            {availableComponents.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.key}>
                  <Icon size={18} />
                  <span>{item.label}</span>
                </article>
              );
            })}
          </div>
        </Card>
      </section>

      <section className="tenant-checklist-grid tenant-checklist-grid--three">
        {mockChecklists.map((checklist) => (
          <Card
            key={checklist.id}
            title={checklist.name}
            action={
              <Button size="sm" variant={checklist.status === "published" ? "secondary" : "primary"}>
                <Send size={14} />
                Publicar
              </Button>
            }
          >
            <div className="tenant-checklist-card">
              <Badge tone={checklist.type === "technical_evidence" ? "audit" : "info"}>{checklistTypeLabel[checklist.type]}</Badge>
              <p>{checklist.description}</p>
              <div>
                {checklist.components.map((componentItem) => (
                  <span key={componentItem.id}>
                    {componentItem.required ? "Obrigatorio" : "Opcional"} · {componentItem.label}
                  </span>
                ))}
              </div>
            </div>
          </Card>
        ))}
      </section>

      <Card title="Consumo Mobile">
        <div className="tenant-checklist-mobile">
          <Wrench size={20} />
          <p>
            M10, M11 e M12 devem renderizar campos a partir do schema retornado pela API. M10/M11 cobrem guincho/reboque;
            M12 cobre evidencia tecnica antes/depois para outros servicos.
          </p>
        </div>
      </Card>
    </div>
  );
}
