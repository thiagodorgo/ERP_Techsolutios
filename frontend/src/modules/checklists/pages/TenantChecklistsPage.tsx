import {
  Camera,
  CheckSquare,
  ClipboardCheck,
  Edit3,
  FileSignature,
  GitCompare,
  ImagePlus,
  MapPin,
  Plus,
  Send,
  ToggleLeft,
  Wrench,
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";

import { useAuth } from "../../../providers/AuthProvider";
import { useTenantContext } from "../../../providers/TenantProvider";
import { Badge, Button, Card, Checkbox, Chip, EmptyState, ErrorState, Input, Select, Skeleton, Table } from "../../../components/ui";
import {
  createTenantChecklist,
  listTenantChecklistComponents,
  listTenantChecklists,
  publishTenantChecklist,
  updateTenantChecklist,
} from "../checklist.service";
import type {
  ChecklistApiContext,
  CreateTenantChecklistInput,
  TenantChecklist,
  TenantChecklistComponentCatalogItem,
  TenantChecklistComponentInput,
  TenantChecklistComponentType,
  TenantChecklistStatus,
  TenantChecklistType,
} from "../types";

const checklistTypes: TenantChecklistType[] = ["towing_collection", "towing_delivery", "technical_evidence", "custom"];
const runStatuses = ["in_progress", "completed", "completed_with_divergence", "pending_acknowledgement"] as const;

const checklistTypeLabel: Record<TenantChecklistType, string> = {
  towing_collection: "Guincho - coleta",
  towing_delivery: "Guincho - entrega",
  technical_evidence: "Evidencia tecnica",
  custom: "Customizado",
};

const checklistStatusLabel: Record<TenantChecklistStatus, string> = {
  draft: "Rascunho",
  published: "Publicado",
  inactive: "Inativo",
  archived: "Arquivado",
};

const runStatusLabel: Record<(typeof runStatuses)[number], string> = {
  in_progress: "Em andamento",
  completed: "Concluido",
  completed_with_divergence: "Com divergencia",
  pending_acknowledgement: "Pendente de ciencia",
};

const componentIconByType: Record<TenantChecklistComponentType, typeof CheckSquare> = {
  vehicle_selector: CheckSquare,
  damage_map: MapPin,
  photo_upload: Camera,
  observation: ClipboardCheck,
  comparison: GitCompare,
  acknowledgement: FileSignature,
  before_after: ImagePlus,
};

type FormState = {
  readonly name: string;
  readonly description: string;
  readonly type: TenantChecklistType;
  readonly selectedComponents: readonly TenantChecklistComponentType[];
  readonly requiredComponents: readonly TenantChecklistComponentType[];
};

const initialFormState: FormState = {
  name: "",
  description: "",
  type: "towing_collection",
  selectedComponents: ["vehicle_selector", "photo_upload"],
  requiredComponents: ["vehicle_selector", "photo_upload"],
};

export function TenantChecklistsPage() {
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  const apiContext = useMemo(() => buildChecklistApiContext(activeContext, session?.accessToken), [activeContext, session?.accessToken]);
  const [checklists, setChecklists] = useState<TenantChecklist[]>([]);
  const [components, setComponents] = useState<TenantChecklistComponentCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingChecklist, setEditingChecklist] = useState<TenantChecklist | null>(null);
  const [formState, setFormState] = useState<FormState>(initialFormState);

  useEffect(() => {
    let active = true;

    if (!apiContext) {
      setLoading(false);
      setError("Selecione um contexto de tenant para carregar checklists.");
      return;
    }

    setLoading(true);
    setError(null);

    Promise.all([listTenantChecklists(apiContext), listTenantChecklistComponents(apiContext)])
      .then(([nextChecklists, nextComponents]) => {
        if (!active) return;
        setChecklists(nextChecklists);
        setComponents(nextComponents);
      })
      .catch((item: Error) => {
        if (!active) return;
        setError(item.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [apiContext]);

  function openCreateForm() {
    setEditingChecklist(null);
    setFormState(initialFormState);
    setFormOpen(true);
  }

  function openEditForm(checklist: TenantChecklist) {
    setEditingChecklist(checklist);
    setFormState({
      name: checklist.name,
      description: checklist.description ?? "",
      type: checklist.type,
      selectedComponents: checklist.components.map((component) => component.type),
      requiredComponents: checklist.components.filter((component) => component.required).map((component) => component.type),
    });
    setFormOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!apiContext) return;

    const input = buildChecklistInput(formState, components);
    setSaving(true);
    setError(null);

    try {
      const saved = editingChecklist
        ? await updateTenantChecklist(apiContext, editingChecklist.id, input)
        : await createTenantChecklist(apiContext, input);
      setChecklists((current) => upsertChecklist(current, saved));
      setFormOpen(false);
      setEditingChecklist(null);
    } catch (item) {
      setError(item instanceof Error ? item.message : "Falha ao salvar checklist.");
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish(checklist: TenantChecklist) {
    if (!apiContext) return;
    setSaving(true);
    setError(null);
    try {
      const published = await publishTenantChecklist(apiContext, checklist.id);
      setChecklists((current) => upsertChecklist(current, published));
    } catch (item) {
      setError(item instanceof Error ? item.message : "Falha ao publicar checklist.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleChecklistStatus(checklist: TenantChecklist) {
    if (!apiContext) return;
    const nextStatus: TenantChecklistStatus = checklist.status === "inactive" ? "draft" : "inactive";
    setSaving(true);
    setError(null);
    try {
      const updated = await updateTenantChecklist(apiContext, checklist.id, { status: nextStatus });
      setChecklists((current) => upsertChecklist(current, updated));
    } catch (item) {
      setError(item instanceof Error ? item.message : "Falha ao alterar status.");
    } finally {
      setSaving(false);
    }
  }

  const summary = useMemo(
    () => ({
      draft: checklists.filter((checklist) => checklist.status === "draft").length,
      published: checklists.filter((checklist) => checklist.status === "published").length,
      inactive: checklists.filter((checklist) => checklist.status === "inactive").length,
    }),
    [checklists],
  );

  return (
    <div className="page-stack">
      <header className="page-heading page-heading--row">
        <div>
          <span>W02A · Administrador</span>
          <h1>Checklists</h1>
          <p>Configuracao tenant_checklist para schemas consumidos por Web e Mobile.</p>
        </div>
        <div className="platform-actions">
          <Button variant="secondary" onClick={() => setFormOpen((value) => !value)} disabled={saving || !apiContext}>
            <ToggleLeft size={16} />
            {formOpen ? "Fechar formulario" : "Ativar/Inativar"}
          </Button>
          <Button onClick={openCreateForm} disabled={saving || !apiContext}>
            <Plus size={16} />
            Criar checklist
          </Button>
        </div>
      </header>

      {error ? <ErrorState title="Falha ao carregar checklists" detail={error} /> : null}

      {formOpen ? (
        <ChecklistForm
          components={components}
          editingChecklist={editingChecklist}
          formState={formState}
          saving={saving}
          onCancel={() => setFormOpen(false)}
          onChange={setFormState}
          onSubmit={handleSubmit}
        />
      ) : null}

      <section className="tenant-checklist-grid">
        <Card title="Templates do tenant">
          {loading ? <Skeleton lines={6} /> : null}
          {!loading && !error && checklists.length === 0 ? (
            <EmptyState title="Nenhum checklist cadastrado" detail="Crie o primeiro template para publicar schemas consumidos por Web e Mobile." />
          ) : null}
          {!loading && !error && checklists.length > 0 ? (
            <Table
              rows={checklists}
              keyForRow={(row) => row.id}
              columns={[
                { key: "name", header: "Checklist", render: (row) => <strong>{row.name}</strong> },
                { key: "type", header: "Tipo", render: (row) => checklistTypeLabel[row.type] },
                { key: "status", header: "Status", render: (row) => <ChecklistStatusChip status={row.status} /> },
                { key: "version", header: "Versao", render: (row) => `v${row.version}` },
                { key: "components", header: "Componentes", render: (row) => String(row.components.length) },
                {
                  key: "actions",
                  header: "Acoes",
                  render: (row) => (
                    <div className="platform-actions">
                      <Button size="sm" variant="secondary" onClick={() => openEditForm(row)}>
                        <Edit3 size={14} />
                        Editar
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => toggleChecklistStatus(row)} disabled={saving}>
                        <ToggleLeft size={14} />
                        {row.status === "inactive" ? "Ativar" : "Inativar"}
                      </Button>
                    </div>
                  ),
                },
              ]}
            />
          ) : null}
        </Card>

        <Card title="Componentes disponiveis">
          {loading ? <Skeleton lines={4} /> : null}
          {!loading && components.length === 0 ? <EmptyState title="Catalogo indisponivel" detail="A API nao retornou componentes configuraveis." /> : null}
          {!loading && components.length > 0 ? (
            <div className="tenant-checklist-components">
              {components.map((item) => {
                const Icon = componentIconByType[item.type];
                return (
                  <article key={item.type}>
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </article>
                );
              })}
            </div>
          ) : null}
        </Card>
      </section>

      <section className="tenant-checklist-grid tenant-checklist-grid--three">
        {checklists.map((checklist) => (
          <Card
            key={checklist.id}
            title={checklist.name}
            action={
              <Button size="sm" variant={checklist.status === "published" ? "secondary" : "primary"} onClick={() => handlePublish(checklist)} disabled={saving}>
                <Send size={14} />
                Publicar
              </Button>
            }
          >
            <div className="tenant-checklist-card">
              <Badge tone={checklist.type === "technical_evidence" ? "audit" : "info"}>{checklistTypeLabel[checklist.type]}</Badge>
              <ChecklistStatusChip status={checklist.status} />
              <p>{checklist.description || "Sem descricao cadastrada."}</p>
              <div>
                {checklist.components.map((componentItem) => (
                  <span key={componentItem.id}>
                    {componentItem.required ? "Obrigatorio" : "Opcional"} · {componentItem.label}
                  </span>
                ))}
              </div>
              <footer className="platform-actions">
                <Button size="sm" variant="secondary" onClick={() => openEditForm(checklist)}>
                  <Edit3 size={14} />
                  Editar
                </Button>
                <Button size="sm" variant="secondary" onClick={() => toggleChecklistStatus(checklist)} disabled={saving}>
                  <ToggleLeft size={14} />
                  {checklist.status === "inactive" ? "Ativar" : "Inativar"}
                </Button>
              </footer>
            </div>
          </Card>
        ))}
      </section>

      <Card title="Consumo Mobile">
        <div className="tenant-checklist-mobile">
          <Wrench size={20} />
          <p>
            M10, M11 e M12 renderizam campos a partir do schema publicado pela API. Estados de execucao previstos:{" "}
            {runStatuses.map((status) => runStatusLabel[status]).join(", ")}.
          </p>
        </div>
      </Card>

      <Card title="Resumo">
        <div className="tenant-checklist-summary">
          <Chip tone="pending">Rascunho: {summary.draft}</Chip>
          <Chip tone="success">Publicado: {summary.published}</Chip>
          <Chip tone="default">Inativo: {summary.inactive}</Chip>
        </div>
      </Card>
    </div>
  );
}

function ChecklistForm({
  components,
  editingChecklist,
  formState,
  saving,
  onCancel,
  onChange,
  onSubmit,
}: {
  readonly components: readonly TenantChecklistComponentCatalogItem[];
  readonly editingChecklist: TenantChecklist | null;
  readonly formState: FormState;
  readonly saving: boolean;
  readonly onCancel: () => void;
  readonly onChange: (state: FormState) => void;
  readonly onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  function toggleComponent(type: TenantChecklistComponentType) {
    const selected = formState.selectedComponents.includes(type)
      ? formState.selectedComponents.filter((item) => item !== type)
      : [...formState.selectedComponents, type];
    const required = formState.requiredComponents.filter((item) => selected.includes(item));
    onChange({ ...formState, selectedComponents: selected, requiredComponents: required });
  }

  function toggleRequired(type: TenantChecklistComponentType) {
    const required = formState.requiredComponents.includes(type)
      ? formState.requiredComponents.filter((item) => item !== type)
      : [...formState.requiredComponents, type];
    onChange({ ...formState, requiredComponents: required });
  }

  return (
    <Card title={editingChecklist ? "Editar checklist" : "Criar checklist"}>
      <form className="tenant-checklist-form" onSubmit={onSubmit}>
        <div className="form-grid">
          <Input label="Nome" value={formState.name} onChange={(event) => onChange({ ...formState, name: event.target.value })} required />
          <Input
            label="Descricao"
            value={formState.description}
            onChange={(event) => onChange({ ...formState, description: event.target.value })}
          />
          <Select label="Tipo" value={formState.type} onChange={(event) => onChange({ ...formState, type: event.target.value as TenantChecklistType })}>
            {checklistTypes.map((type) => (
              <option key={type} value={type}>
                {checklistTypeLabel[type]}
              </option>
            ))}
          </Select>
        </div>

        <div className="tenant-checklist-selection">
          {components.map((component) => {
            const selected = formState.selectedComponents.includes(component.type);
            return (
              <article key={component.type}>
                <Checkbox label={component.label} checked={selected} onChange={() => toggleComponent(component.type)} />
                <p>{component.description}</p>
                <Checkbox label="Obrigatorio" checked={formState.requiredComponents.includes(component.type)} disabled={!selected} onChange={() => toggleRequired(component.type)} />
              </article>
            );
          })}
        </div>

        <div className="platform-actions">
          <Button type="submit" disabled={saving || formState.selectedComponents.length === 0}>
            {saving ? "Salvando..." : editingChecklist ? "Salvar alteracoes" : "Criar checklist"}
          </Button>
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </form>
    </Card>
  );
}

function ChecklistStatusChip({ status }: { readonly status: TenantChecklistStatus }) {
  const tone = status === "published" ? "success" : status === "inactive" || status === "archived" ? "default" : "pending";
  return <Chip tone={tone}>{checklistStatusLabel[status]}</Chip>;
}

function buildChecklistInput(
  state: FormState,
  catalog: readonly TenantChecklistComponentCatalogItem[],
): CreateTenantChecklistInput {
  const components: TenantChecklistComponentInput[] = state.selectedComponents.map((type, index) => {
    const catalogItem = catalog.find((item) => item.type === type);
    return {
      componentKey: type,
      type,
      label: catalogItem?.label ?? type,
      required: state.requiredComponents.includes(type),
      orderIndex: index,
      config: catalogItem?.defaultConfig ?? {},
      validationRules: {},
      visibilityRules: {},
    };
  });

  return {
    name: state.name.trim(),
    description: state.description.trim() || undefined,
    type: state.type,
    schema: {
      source: "w02a",
      type: state.type,
      componentCount: components.length,
    },
    components,
  };
}

function upsertChecklist(current: TenantChecklist[], checklist: TenantChecklist): TenantChecklist[] {
  const exists = current.some((item) => item.id === checklist.id);
  if (!exists) return [checklist, ...current];
  return current.map((item) => (item.id === checklist.id ? checklist : item));
}

function buildChecklistApiContext(
  activeContext: ReturnType<typeof useTenantContext>["activeContext"],
  accessToken: string | undefined,
): ChecklistApiContext | null {
  if (!activeContext) return null;

  return {
    tenantId: activeContext.tenantId,
    branchId: activeContext.branchId,
    role: toBackendRole(activeContext.role, activeContext.permissions),
    permissions: activeContext.permissions,
    ...(accessToken && !accessToken.startsWith("mock-") ? { token: accessToken } : {}),
  };
}

function toBackendRole(role: string, permissions: readonly string[]): string {
  if (
    permissions.includes("tenant_checklists:create") ||
    permissions.includes("tenant_checklists:update") ||
    permissions.includes("tenant_checklists:publish")
  ) {
    return "tenant_admin";
  }

  const normalizedRole = role.toLowerCase();
  if (normalizedRole.includes("admin")) return "tenant_admin";
  if (normalizedRole.includes("gestor")) return "manager";
  if (normalizedRole.includes("auditor")) return "auditor";
  if (normalizedRole.includes("operador")) return "operator";
  return "tenant_admin";
}
