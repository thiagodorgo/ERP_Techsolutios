import { Eye, Plus, RefreshCcw, Send, ToggleLeft } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";

import { Button, Card, EmptyState, ErrorState, SearchBar, Select, Skeleton, Table } from "../../../components/ui";
import { useAuth } from "../../../providers/AuthProvider";
import { usePermissions } from "../../../providers/PermissionProvider";
import { useTenantContext } from "../../../providers/TenantProvider";
import {
  addComponentToDraft,
  buildChecklistInputFromDraft,
  createDraftFromChecklist,
  createEmptyChecklistDraft,
  defaultComponentForType,
  hasChecklistPendingChanges,
  moveDraftComponent,
  removeDraftComponent,
  updateDraftComponent,
} from "../checklist.builder";
import { checklistStatusOptions, checklistTypeLabel } from "../checklist.constants";
import {
  createTenantChecklist,
  listTenantChecklistComponents,
  listTenantChecklists,
  publishTenantChecklist,
  updateTenantChecklist,
} from "../checklist.service";
import { ChecklistCanvas } from "../components/ChecklistCanvas";
import { ChecklistComponentPalette } from "../components/ChecklistComponentPalette";
import { ChecklistInspector } from "../components/ChecklistInspector";
import { ChecklistSchemaPreview } from "../components/ChecklistSchemaPreview";
import { ChecklistStatusBadge } from "../components/ChecklistStatusBadge";
import { NewChecklistForm } from "../components/NewChecklistForm";
import type {
  ChecklistApiContext,
  TenantChecklist,
  TenantChecklistBuilderDraft,
  TenantChecklistComponentCatalogItem,
  TenantChecklistStatus,
} from "../types";

type ChecklistFilter = TenantChecklistStatus | "all" | "pending_changes";

export function TenantChecklistsPage() {
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  const { can } = usePermissions();
  // RBAC (§2.4 — a UI só molda; o backend é a autoridade): esconde as ações de ESCRITA de checklist
  // dos papéis somente-leitura (o backend já responde 403; a tela não deve oferecer o que não pode).
  const canCreate = can("tenant_checklists:create");
  const canUpdate = can("tenant_checklists:update");
  const canPublish = can("tenant_checklists:publish");
  const apiContext = useMemo(() => buildChecklistApiContext(activeContext, session?.accessToken), [activeContext, session?.accessToken]);
  const [checklists, setChecklists] = useState<TenantChecklist[]>([]);
  const [components, setComponents] = useState<TenantChecklistComponentCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ChecklistFilter>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedChecklistId, setSelectedChecklistId] = useState<string | null>(null);
  const [selectedComponentId, setSelectedComponentId] = useState<string | undefined>();
  const [builderDraft, setBuilderDraft] = useState<TenantChecklistBuilderDraft>(createEmptyChecklistDraft());

  useEffect(() => {
    loadChecklists();
  }, [apiContext]);

  const selectedChecklist = useMemo(
    () => checklists.find((checklist) => checklist.id === selectedChecklistId) ?? null,
    [checklists, selectedChecklistId],
  );
  const selectedComponent = builderDraft.components.find((component) => component.id === selectedComponentId);
  const filteredChecklists = useMemo(
    () =>
      checklists.filter((checklist) => {
        const matchesStatus =
          statusFilter === "all" ||
          (statusFilter === "pending_changes" ? hasChecklistPendingChanges(checklist) : checklist.status === statusFilter);
        const matchesSearch = checklist.name.toLowerCase().includes(searchTerm.trim().toLowerCase());
        return matchesStatus && matchesSearch;
      }),
    [checklists, searchTerm, statusFilter],
  );

  async function loadChecklists() {
    if (!apiContext) {
      setLoading(false);
      setError("Selecione um contexto de organização para carregar checklists.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [nextChecklists, nextComponents] = await Promise.all([
        listTenantChecklists(apiContext),
        listTenantChecklistComponents(apiContext),
      ]);
      setChecklists(nextChecklists);
      setComponents(nextComponents);

      const nextSelected = selectedChecklistId
        ? nextChecklists.find((checklist) => checklist.id === selectedChecklistId)
        : nextChecklists[0];
      selectChecklist(nextSelected ?? null);
    } catch (item) {
      setError(item instanceof Error ? item.message : "Falha ao carregar checklists.");
    } finally {
      setLoading(false);
    }
  }

  function selectChecklist(checklist: TenantChecklist | null) {
    setSelectedChecklistId(checklist?.id ?? null);
    setSelectedComponentId(checklist?.components[0]?.id);
    setBuilderDraft(checklist ? createDraftFromChecklist(checklist) : createEmptyChecklistDraft());
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!apiContext) return;

    setSaving(true);
    setError(null);

    try {
      const saved = await createTenantChecklist(apiContext, buildChecklistInputFromDraft(builderDraft));
      setChecklists((current) => [saved, ...current]);
      setCreateOpen(false);
      selectChecklist(saved);
    } catch (item) {
      setError(item instanceof Error ? item.message : "Falha ao criar checklist.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveBuilder() {
    if (!apiContext || !selectedChecklist) return;

    setSaving(true);
    setError(null);

    try {
      const saved = await updateTenantChecklist(apiContext, selectedChecklist.id, buildChecklistInputFromDraft(builderDraft));
      setChecklists((current) => upsertChecklist(current, saved));
      selectChecklist(saved);
    } catch (item) {
      setError(item instanceof Error ? item.message : "Falha ao salvar builder.");
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
      if (selectedChecklistId === published.id) {
        selectChecklist(published);
      }
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
      if (selectedChecklistId === updated.id) {
        selectChecklist(updated);
      }
    } catch (item) {
      setError(item instanceof Error ? item.message : "Falha ao alterar status.");
    } finally {
      setSaving(false);
    }
  }

  function handleAddComponent(component: TenantChecklistComponentCatalogItem) {
    const nextDraft = addComponentToDraft(builderDraft, component);
    setBuilderDraft(nextDraft);
    setSelectedComponentId(nextDraft.components.at(-1)?.id);
  }

  function handleMoveComponent(componentId: string, direction: "up" | "down") {
    setBuilderDraft((current) => moveDraftComponent(current, componentId, direction));
  }

  function handleRemoveComponent(componentId: string) {
    setBuilderDraft((current) => {
      const nextDraft = removeDraftComponent(current, componentId);
      setSelectedComponentId(nextDraft.components[0]?.id);
      return nextDraft;
    });
  }

  function applyTypeDefaults(draft: TenantChecklistBuilderDraft): TenantChecklistBuilderDraft {
    if (draft.components.length > 0) {
      return draft;
    }

    const defaultsByType = {
      towing_collection: ["vehicle_selector", "photo_upload"],
      towing_delivery: ["comparison", "acknowledgement"],
      technical_evidence: ["before_after"],
      custom: [],
    } as const;

    return defaultsByType[draft.type].reduce<TenantChecklistBuilderDraft>((currentDraft, componentType) => {
      const component = defaultComponentForType(componentType, components);
      return component ? addComponentToDraft(currentDraft, component) : currentDraft;
    }, draft);
  }

  function openCreateBuilder() {
    setCreateOpen(true);
    setSelectedChecklistId(null);
    setSelectedComponentId(undefined);
    setBuilderDraft(applyTypeDefaults(createEmptyChecklistDraft()));
  }

  return (
    <div className="page-stack">
      <header className="page-heading page-heading--row">
        <div>
          <span>ADMINISTRADOR</span>
          <h1>Checklists</h1>
          <p>Builder visual para configurar checklists publicados para Web e Mobile.</p>
        </div>
        <div className="platform-actions">
          <Button variant="secondary" onClick={loadChecklists} disabled={loading || saving || !apiContext}>
            <RefreshCcw size={16} />
            Tentar novamente
          </Button>
          {canCreate ? (
            <Button onClick={openCreateBuilder} disabled={saving || !apiContext}>
              <Plus size={16} />
              Novo checklist
            </Button>
          ) : null}
        </div>
      </header>

      {error ? <ErrorState title="Falha ao carregar checklists" detail={error} /> : null}

      {createOpen ? (
        <Card title="Novo checklist">
          <NewChecklistForm
            draft={builderDraft}
            saving={saving}
            onCancel={() => setCreateOpen(false)}
            onChange={(draft) => setBuilderDraft(applyTypeDefaults(draft))}
            onSubmit={handleCreate}
          />
        </Card>
      ) : null}

      <section className="tenant-checklist-builder-shell">
        <Card title="Checklists da organização">
          <div className="erp-filter-bar">
            <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Buscar checklist" />
            <Select label="Status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as ChecklistFilter)}>
              {checklistStatusOptions.map((status) => (
                <option key={status} value={status}>
                  {formatFilterLabel(status)}
                </option>
              ))}
            </Select>
          </div>

          {loading ? <Skeleton lines={6} /> : null}
          {!loading && !error && checklists.length === 0 ? (
            <EmptyState title="Nenhum checklist cadastrado" detail="Crie um rascunho e monte o checklist com componentes da plataforma." />
          ) : null}
          {!loading && !error && checklists.length > 0 && filteredChecklists.length === 0 ? (
            <EmptyState title="Nenhum resultado" detail="Ajuste a busca ou o filtro de status para ver outros checklists." />
          ) : null}
          {!loading && filteredChecklists.length > 0 ? (
            <Table
              rows={filteredChecklists}
              keyForRow={(row) => row.id}
              onRowClick={selectChecklist}
              columns={[
                { key: "name", header: "Checklist", render: (row) => <strong>{row.name}</strong> },
                { key: "type", header: "Tipo", render: (row) => checklistTypeLabel[row.type] },
                {
                  key: "status",
                  header: "Status",
                  render: (row) => <ChecklistStatusBadge status={row.status} uiState={hasChecklistPendingChanges(row) ? "pending_changes" : undefined} />,
                },
                { key: "version", header: "Versão", render: (row) => `v${row.version}` },
                { key: "updatedAt", header: "Atualizado", render: (row) => new Date(row.updatedAt).toLocaleDateString("pt-BR") },
                {
                  key: "actions",
                  header: "Ações",
                  render: (row) => (
                    <div className="platform-actions">
                      <Button size="sm" variant="secondary" onClick={() => selectChecklist(row)}>
                        <Eye size={14} />
                        Visualizar
                      </Button>
                      {canPublish ? (
                        <Button size="sm" variant={row.status === "published" ? "secondary" : "primary"} onClick={() => handlePublish(row)} disabled={saving}>
                          <Send size={14} />
                          Publicar
                        </Button>
                      ) : null}
                      {canUpdate ? (
                        <Button size="sm" variant="secondary" onClick={() => toggleChecklistStatus(row)} disabled={saving}>
                          <ToggleLeft size={14} />
                          {row.status === "inactive" ? "Ativar" : "Inativar"}
                        </Button>
                      ) : null}
                    </div>
                  ),
                },
              ]}
            />
          ) : null}
        </Card>

        <Card title="Builder visual">
          {selectedChecklist ? (
            <div className="checklist-builder-heading">
              <div>
                <strong>{selectedChecklist.name}</strong>
                <span>
                  {checklistTypeLabel[selectedChecklist.type]} · v{selectedChecklist.version}
                </span>
              </div>
              <ChecklistStatusBadge status={selectedChecklist.status} uiState={hasChecklistPendingChanges(selectedChecklist) ? "pending_changes" : undefined} />
            </div>
          ) : (
            <EmptyState title="Selecione um checklist" detail="Escolha um checklist existente ou crie um rascunho para abrir o builder." />
          )}

          {selectedChecklist ? (
            <>
              <div className="checklist-builder-layout">
                <section>
                  <h3>Componentes</h3>
                  <ChecklistComponentPalette components={components} onAdd={handleAddComponent} />
                </section>
                <section>
                  <h3>Estrutura</h3>
                  <ChecklistCanvas
                    components={builderDraft.components}
                    selectedComponentId={selectedComponentId}
                    onMove={handleMoveComponent}
                    onRemove={handleRemoveComponent}
                    onSelect={setSelectedComponentId}
                  />
                </section>
                <section>
                  <h3>Propriedades</h3>
                  <ChecklistInspector
                    component={selectedComponent}
                    onChange={(componentId, patch) => setBuilderDraft((current) => updateDraftComponent(current, componentId, patch))}
                  />
                </section>
              </div>

              {/* Rodapé de escrita — some INTEIRO (texto de ajuda + ações) p/ papel sem update nem publish,
                  senão o <p> ficaria órfão descrevendo uma ação indisponível (cognicao §11). */}
              {canUpdate || canPublish ? (
                <div className="checklist-builder-footer">
                  <p>Publicar gera uma nova versão do checklist para uso nos fluxos de campo.</p>
                  <div className="platform-actions">
                    {canUpdate ? (
                      // "Salvar builder" só PATCHea (updateTenantChecklist) → gate exato = tenant_checklists:update.
                      <Button onClick={handleSaveBuilder} disabled={saving || builderDraft.components.length === 0}>
                        {saving ? "Salvando..." : "Salvar builder"}
                      </Button>
                    ) : null}
                    {canPublish ? (
                      <Button variant="secondary" onClick={() => handlePublish(selectedChecklist)} disabled={saving}>
                        <Send size={14} />
                        Publicar checklist
                      </Button>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </>
          ) : null}
        </Card>
      </section>

      <Card title="Pré-visualização do checklist">
        <ChecklistSchemaPreview draft={builderDraft} />
      </Card>
    </div>
  );
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

function formatFilterLabel(status: ChecklistFilter): string {
  const labels: Record<ChecklistFilter, string> = {
    all: "Todos",
    draft: "Rascunho",
    published: "Publicado",
    inactive: "Inativo",
    archived: "Arquivado",
    pending_changes: "Alterações pendentes",
  };

  return labels[status];
}
