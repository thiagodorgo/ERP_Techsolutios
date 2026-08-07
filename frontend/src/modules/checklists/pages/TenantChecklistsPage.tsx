import {
  AlertTriangle,
  Archive,
  ClipboardList,
  Copy,
  ExternalLink,
  Eye,
  Lock,
  Plus,
  RefreshCcw,
  RotateCcw,
  Search,
  Settings,
} from "lucide-react";
import type { KeyboardEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../../../providers/AuthProvider";
import { usePermissions } from "../../../providers/PermissionProvider";
import { useTenantContext } from "../../../providers/TenantProvider";
import { buildChecklistApiContext } from "../checklist.api-context";
import {
  addComponentToDraft,
  buildChecklistInputFromDraft,
  createEmptyChecklistDraft,
  defaultComponentForType,
  hasChecklistPendingChanges,
} from "../checklist.builder";
import { checklistStatusLabel, checklistTypeLabel, resolveChecklistComponentTypeLabel } from "../checklist.constants";
import { checklistEditorPath } from "../checklist-editor.model";
import {
  createTenantChecklist,
  listTenantChecklistComponents,
  listTenantChecklists,
  updateTenantChecklist,
} from "../checklist.service";
import { CHECKLIST_STATUS_TONE, resolveChecklistComponentTile } from "../checklist-tiles";
import { CHECKLIST_TOAST_HANDOFF_KEY } from "./ChecklistEditorPage";
import { ChecklistToast, useChecklistToast } from "../components/ChecklistToast";
import type {
  TenantChecklist,
  TenantChecklistBuilderDraft,
  TenantChecklistComponentCatalogItem,
  TenantChecklistStatus,
} from "../types";

// CHECKLIST P1 PR-02a — a LISTA de "Modelos de Checklist" recriada sobre o protótipo do dono
// (Modelos de Checklist.dc.html, bloco scList): header com kicker ADMINISTRAÇÃO, busca 230px,
// filtro de situação, 4 KPI mini-cards contados do payload REAL (D-007), tabela nova com tile do
// primeiro componente, pills de situação e ações-ícone com toast.
//
// CHECKLIST P1 PR-02b — a ponte do builder antigo abaixo da lista MORREU: abrir um modelo (clique
// na linha, ação "Editar/Ver modelo" e "Novo modelo" instantâneo) navega para a sub-rota do EDITOR
// (`/administrator/checklists/:checklistId`), sob o mesmo gate `tenant_checklists:read`.

type ChecklistFilter = TenantChecklistStatus | "all" | "pending_changes";

const FILTER_OPTIONS: readonly { readonly value: ChecklistFilter; readonly label: string }[] = [
  { value: "all", label: "Todas as situações" },
  { value: "published", label: "Publicados" },
  { value: "draft", label: "Rascunhos" },
  { value: "pending_changes", label: "Com alterações não publicadas" },
  { value: "inactive", label: "Inativos" },
];

/** KPIs contados do payload REAL da lista — zeros honestos, nunca fabricação (D-007). */
export function computeChecklistKpis(checklists: readonly TenantChecklist[]) {
  return {
    publicados: checklists.filter((checklist) => checklist.status === "published").length,
    rascunhos: checklists.filter((checklist) => checklist.status === "draft").length,
    alteracoesNaoPublicadas: checklists.filter((checklist) => hasChecklistPendingChanges(checklist)).length,
    inativos: checklists.filter((checklist) => checklist.status === "inactive").length,
  };
}

const KPI_CARDS: readonly {
  readonly key: keyof ReturnType<typeof computeChecklistKpis>;
  readonly label: string;
  readonly hint: string;
  readonly dot: string;
}[] = [
  { key: "publicados", label: "Publicados", hint: "disponíveis no aplicativo", dot: "#22C55E" },
  { key: "rascunhos", label: "Rascunhos", hint: "ainda não publicados", dot: "#94A3B8" },
  { key: "alteracoesNaoPublicadas", label: "Alterações não publicadas", hint: "o campo ainda usa a versão antiga", dot: "#F59E0B" },
  { key: "inativos", label: "Inativos", hint: "fora das novas ordens", dot: "#64748B" },
];

/** "hoje" quando for hoje; senão dd/mm/aaaa (pt-BR), como no protótipo. */
export function formatChecklistUpdatedAt(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const sameDay =
    date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
  return sameDay ? "hoje" : date.toLocaleDateString("pt-BR");
}

/** Rótulo da ação de situação — o mesmo verbo no title e no aria-label (a11y). */
function statusActionLabel(checklist: { readonly status: TenantChecklistStatus }): string {
  return checklist.status === "inactive" ? "Reativar modelo" : "Inativar modelo";
}

/**
 * Esconde-fino das ações de LINHA, como função pura.
 * A junta do PR-02a mostrou que os smokes SSR não provam isto: sem efeitos, a lista nunca carrega
 * e os `doesNotMatch` passam vazios. Decidir aqui torna a regra auditável por teste de unidade —
 * lembrando que a autoridade final é sempre o backend (§2.4); a UI só deixa de oferecer.
 */
export function rowActionVisibility(input: {
  readonly canUpdate: boolean;
  readonly canWrite: boolean;
  readonly canReadRuns: boolean;
}): { readonly open: "edit" | "view"; readonly toggleStatus: boolean; readonly duplicate: boolean; readonly runs: boolean } {
  return {
    open: input.canUpdate ? "edit" : "view",
    toggleStatus: input.canUpdate,
    duplicate: input.canWrite,
    // Leitura de execuções tem gate PRÓPRIO — não herda o de escrita.
    runs: input.canReadRuns,
  };
}

/** Resumo da linha: rótulos PT-BR (mapa local) dos 3 primeiros tipos + " · +N" quando houver mais. */
export function summarizeChecklistComponents(
  components: readonly { readonly type: string; readonly label: string }[],
): string {
  const names = components
    .slice(0, 3)
    .map((component) => resolveChecklistComponentTypeLabel(component.type, component.label))
    .join(" · ");
  return components.length > 3 ? `${names} · +${components.length - 3}` : names;
}

export function TenantChecklistsPage({
  // Costura de teste (SSR não executa efeitos, então o smoke jamais veria o estado carregado):
  // com `initialChecklists`, o primeiro render nasce carregado com esse payload e o markup real
  // das linhas/ações fica auditável. Em produção a prop não é passada — comportamento intocado.
  initialChecklists,
}: {
  readonly initialChecklists?: readonly TenantChecklist[];
} = {}) {
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  const { can } = usePermissions();
  // RBAC (§2.4 — a UI só molda; o backend é a autoridade): esconde-fino de TODO botão de escrita
  // dos papéis somente-leitura (o backend já responde 403; a tela não oferece o que não pode).
  const canCreate = can("tenant_checklists:create");
  const canUpdate = can("tenant_checklists:update");
  const canPublish = can("tenant_checklists:publish");
  const canWrite = canCreate || canUpdate || canPublish;
  // "Ver execuções" é LEITURA — gate próprio (junta PR-02a), não o canWrite.
  const canReadRuns = can("checklist_runs:read");
  const navigate = useNavigate();
  const location = useLocation();
  const apiContext = useMemo(() => buildChecklistApiContext(activeContext, session?.accessToken), [activeContext, session?.accessToken]);
  const { toast, showToast } = useChecklistToast();
  const [checklists, setChecklists] = useState<TenantChecklist[]>(() => [...(initialChecklists ?? [])]);
  const [components, setComponents] = useState<TenantChecklistComponentCatalogItem[]>([]);
  // Junta PR-02a (MÉDIA): iniciar em `false` fazia o primeiro frame comitado ser o vazio-hero
  // ("Nenhum modelo ainda — crie o primeiro"), afirmando ausência de dados que existem, ~30ms
  // antes do skeleton. O protótipo nunca mostra o vazio pré-fetch (stLoading é estado próprio).
  const [loading, setLoading] = useState(initialChecklists === undefined);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ChecklistFilter>("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    // Junta PR-02a (BAIXA): ao TROCAR de organização, zera o que está na tela antes do fetch —
    // senão a lista da organização anterior persiste visível durante a troca (§7).
    setChecklists([]);
    void loadChecklists();
  }, [apiContext]);

  useEffect(() => {
    // PR-02b: "Salvar e sair" no editor confirma a gravação AQUI — o toast não sobrevive à troca
    // de rota, então a mensagem viaja no state e é consumida uma única vez.
    const handoff = (location.state as Record<string, unknown> | null)?.[CHECKLIST_TOAST_HANDOFF_KEY];
    if (typeof handoff !== "string" || handoff.length === 0) return;

    showToast(handoff, "ok");
    navigate(location.pathname, { replace: true, state: null });
  }, [location.key]);

  const kpis = useMemo(() => computeChecklistKpis(checklists), [checklists]);
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
      setLoadError("Selecione uma organização ativa para carregar os modelos.");
      return;
    }

    setLoading(true);
    setLoadError(null);

    try {
      const [nextChecklists, nextComponents] = await Promise.all([
        listTenantChecklists(apiContext),
        listTenantChecklistComponents(apiContext),
      ]);
      setChecklists(nextChecklists);
      setComponents(nextComponents);
    } catch {
      // Junta PR-02a (BAIXA): recarga falhando COM dados na tela era silenciosa — a lista da
      // organização anterior continuava visível como se fosse a atual (§7 "dados desatualizados").
      // Agora: sem dados → card de erro; com dados → toast de aviso, sem esconder o que já veio.
      const message = "A conexão com o servidor falhou. Verifique sua internet e tente novamente — nenhum modelo foi alterado.";
      setLoadError(message);
      if (checklists.length > 0) showToast(message, "warn");
    } finally {
      setLoading(false);
    }
  }

  /** PR-02b: abrir um modelo é NAVEGAR para o editor (rota própria, deep-linkável). */
  function openChecklist(checklist: TenantChecklist) {
    navigate(checklistEditorPath(checklist.id));
  }

  // "Novo modelo" instantâneo do protótipo: cria o rascunho "Novo modelo" (Guincho — Coleta) via
  // POST existente e ABRE o editor no modelo recém-criado. O contrato do backend exige ≥1
  // componente no create, então o rascunho nasce com os componentes padrão do tipo.
  async function handleCreateModel() {
    if (!apiContext) return;

    setSaving(true);

    try {
      const draft = applyTypeDefaults({ ...createEmptyChecklistDraft("towing_collection"), name: "Novo modelo" });
      const saved = await createTenantChecklist(apiContext, buildChecklistInputFromDraft(draft));
      setChecklists((current) => [saved, ...current]);
      openChecklist(saved);
    } catch (item) {
      showToast(item instanceof Error ? item.message : "Falha ao criar o modelo.", "warn");
    } finally {
      setSaving(false);
    }
  }

  // Junta PR-02a (ALTA): o protótipo não desenhou nenhuma ação de Inativar/Reativar, e sem ela a
  // tela perdia o ÚNICO caminho de tirar de circulação um modelo criado por engano pelo "Novo
  // modelo" instantâneo — lixo irremovível pela UI. A capacidade existe no backend e volta aqui
  // (o redesign não pode custar capacidade real); o lugar definitivo dela é o editor, no PR-02c.
  async function handleToggleStatus(checklist: TenantChecklist) {
    if (!apiContext) return;

    const nextStatus: TenantChecklistStatus = checklist.status === "inactive" ? "draft" : "inactive";
    setSaving(true);

    try {
      const saved = await updateTenantChecklist(apiContext, checklist.id, { status: nextStatus });
      setChecklists((current) => upsertChecklist(current, saved));
      showToast(
        nextStatus === "inactive"
          ? "Modelo inativado — não entra em novas ordens."
          : "Modelo reativado como rascunho. Publique para enviar ao aplicativo.",
        "ok",
      );
    } catch (item) {
      showToast(item instanceof Error ? item.message : "Falha ao alterar a situação do modelo.", "warn");
    } finally {
      setSaving(false);
    }
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

  function handleRowKeyDown(event: KeyboardEvent<HTMLDivElement>, checklist: TenantChecklist) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openChecklist(checklist);
    }
  }

  const showSkeleton = loading && checklists.length === 0;
  const showErrorCard = !loading && loadError !== null && checklists.length === 0;

  return (
    <div className="ckb-page">
      {showSkeleton ? <ChecklistListSkeleton /> : null}

      {showErrorCard ? (
        <div className="ckb-error-wrap">
          <div className="ckb-error" role="alert">
            <div className="ckb-error-tile" aria-hidden="true">
              <AlertTriangle size={26} />
            </div>
            <div className="ckb-error-title">Não foi possível carregar os modelos</div>
            <div className="ckb-error-detail">{loadError}</div>
            <button type="button" className="ckb-btn-primary ckb-btn-primary--retry" onClick={() => void loadChecklists()}>
              <RefreshCcw size={15} aria-hidden="true" />
              Tentar novamente
            </button>
          </div>
        </div>
      ) : null}

      {!showSkeleton && !showErrorCard ? (
        <>
          <header className="ckb-header">
            <div className="ckb-header-info">
              <div className="ckb-kicker">ADMINISTRAÇÃO</div>
              <h1 className="ckb-title">Modelos de Checklist</h1>
              <p className="ckb-subtitle">
                Configure os checklists que a equipe de campo preenche no aplicativo — perguntas, fotos obrigatórias, mapa de
                avarias e assinatura do cliente.
              </p>
            </div>
            <div className="ckb-header-actions">
              <div className="ckb-search">
                <Search size={15} aria-hidden="true" />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Buscar modelo…"
                  aria-label="Buscar modelo"
                />
              </div>
              <select
                className="ckb-select"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as ChecklistFilter)}
                aria-label="Filtrar por situação"
              >
                {FILTER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {canCreate ? (
                <button type="button" className="ckb-btn-primary" onClick={() => void handleCreateModel()} disabled={saving || !apiContext}>
                  <Plus size={15} aria-hidden="true" />
                  Novo modelo
                </button>
              ) : null}
            </div>
          </header>

          {!canWrite ? (
            <div className="ckb-readonly-banner">
              <div className="ckb-readonly-tile" aria-hidden="true">
                <Lock size={16} />
              </div>
              <div>
                <div className="ckb-readonly-title">Você está no modo somente leitura</div>
                <div className="ckb-readonly-sub">Seu perfil permite consultar os modelos, mas não criar, editar ou publicar.</div>
              </div>
            </div>
          ) : null}

          {checklists.length > 0 ? (
            <>
              <div className="ckb-kpis">
                {KPI_CARDS.map((card) => (
                  <div key={card.key} className="ckb-kpi">
                    <div className="ckb-kpi-head">
                      <span className="ckb-kpi-dot" style={{ background: card.dot }} aria-hidden="true" />
                      <span className="ckb-kpi-value">{kpis[card.key]}</span>
                    </div>
                    <div className="ckb-kpi-label">{card.label}</div>
                    <div className="ckb-kpi-hint">{card.hint}</div>
                  </div>
                ))}
              </div>

              <div className="ckb-table" role="table" aria-label="Modelos de checklist">
                {/* Junta PR-02a (BAIXA): o cabeçalho estava `aria-hidden`, escondendo MODELO/TIPO/
                    SITUAÇÃO… de leitores de tela. Agora a grade tem semântica de tabela. */}
                <div className="ckb-grid ckb-table-head" role="row">
                  <div role="columnheader">MODELO</div>
                  <div role="columnheader">TIPO</div>
                  <div role="columnheader">SITUAÇÃO</div>
                  <div role="columnheader" style={{ textAlign: "right" }}>VERSÃO</div>
                  <div role="columnheader" style={{ textAlign: "right" }}>CAMPOS</div>
                  <div role="columnheader">ATUALIZADO</div>
                  <div role="columnheader" style={{ textAlign: "right" }}>AÇÕES</div>
                </div>

                {filteredChecklists.map((checklist) => {
                  const ordered = [...checklist.components].sort((a, b) => a.orderIndex - b.orderIndex);
                  // Tile/pill vêm da FONTE ÚNICA do módulo (checklist-tiles) — lista, editor e os
                  // PRs seguintes leem o mesmo mapa; nada de cor mágica duplicada por tela.
                  const tile = resolveChecklistComponentTile(ordered[0]?.type ?? "photo_upload");
                  const TileIcon = tile.Icon;
                  const tone = CHECKLIST_STATUS_TONE[checklist.status];
                  const pending = hasChecklistPendingChanges(checklist);
                  const rowActions = rowActionVisibility({ canUpdate, canWrite, canReadRuns });
                  const openLabel = rowActions.open === "edit" ? "Editar modelo" : "Ver modelo";
                  return (
                    <div
                      key={checklist.id}
                      role="row"
                      tabIndex={0}
                      className="ckb-grid ckb-row"
                      aria-label={`Abrir o modelo ${checklist.name}`}
                      onClick={() => openChecklist(checklist)}
                      onKeyDown={(event) => handleRowKeyDown(event, checklist)}
                    >
                      <div className="ckb-cell-model">
                        <div className="ckb-model-tile" style={{ background: tile.bg, color: tile.fg }} aria-hidden="true">
                          <TileIcon size={17} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div className="ckb-model-name">{checklist.name}</div>
                          <div className="ckb-model-summary">{summarizeChecklistComponents(ordered)}</div>
                        </div>
                      </div>
                      <div className="ckb-cell-type">{checklistTypeLabel[checklist.type]}</div>
                      <div className="ckb-cell-status">
                        <span className="ckb-pill" style={{ background: tone.bg, color: tone.fg }}>
                          {checklistStatusLabel[checklist.status]}
                        </span>
                        {pending ? <span className="ckb-pill ckb-pill--pending">Alterações não publicadas</span> : null}
                      </div>
                      <div className="ckb-cell-version">v{checklist.version}</div>
                      <div className="ckb-cell-count">{checklist.components.length}</div>
                      <div className="ckb-cell-updated">{formatChecklistUpdatedAt(checklist.updatedAt)}</div>
                      <div className="ckb-cell-actions">
                        <button
                          type="button"
                          className="ckb-icon-btn"
                          title={openLabel}
                          aria-label={openLabel}
                          onClick={(event) => {
                            event.stopPropagation();
                            openChecklist(checklist);
                          }}
                        >
                          {rowActions.open === "edit" ? <Settings size={15} /> : <Eye size={15} />}
                        </button>
                        {rowActions.toggleStatus ? (
                          <button
                            type="button"
                            className="ckb-icon-btn"
                            title={statusActionLabel(checklist)}
                            aria-label={statusActionLabel(checklist)}
                            disabled={saving}
                            onClick={(event) => {
                              event.stopPropagation();
                              void handleToggleStatus(checklist);
                            }}
                          >
                            {checklist.status === "inactive" ? <RotateCcw size={14} /> : <Archive size={14} />}
                          </button>
                        ) : null}
                        {rowActions.duplicate ? (
                          <button
                            type="button"
                            className="ckb-icon-btn"
                            title="Duplicar modelo"
                            aria-label="Duplicar modelo"
                            onClick={(event) => {
                              event.stopPropagation();
                              showToast("Duplicar modelo estará disponível em breve.", "info");
                            }}
                          >
                            <Copy size={14} />
                          </button>
                        ) : null}
                        {/* Junta PR-02a (BAIXA): "Ver execuções" é ação de LEITURA — gate próprio,
                            não o canWrite (quem só lê execuções precisa alcançá-las). */}
                        {rowActions.runs ? (
                          <button
                            type="button"
                            className="ckb-icon-btn"
                            title="Ver execuções deste modelo"
                            aria-label="Ver execuções deste modelo"
                            onClick={(event) => {
                              event.stopPropagation();
                              navigate("/operations/checklists");
                            }}
                          >
                            <ExternalLink size={14} />
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}

                {filteredChecklists.length === 0 ? (
                  <div className="ckb-no-results">
                    <div className="ckb-no-results-title">Nenhum modelo encontrado</div>
                    <div className="ckb-no-results-sub">Ajuste a busca ou o filtro de situação.</div>
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <div className="ckb-empty">
              <div className="ckb-empty-tile" aria-hidden="true">
                <ClipboardList size={30} />
              </div>
              <div className="ckb-empty-title">Nenhum modelo ainda — crie o primeiro</div>
              <p className="ckb-empty-sub">
                Um modelo define o que o guincheiro precisa fotografar, marcar e assinar em campo. Comece por uma vistoria de
                coleta: leva menos de 5 minutos.
              </p>
              {canCreate ? (
                <button type="button" className="ckb-empty-cta" onClick={() => void handleCreateModel()} disabled={saving || !apiContext}>
                  <Plus size={16} aria-hidden="true" />
                  Criar primeiro modelo
                </button>
              ) : null}
            </div>
          )}

        </>
      ) : null}

      <ChecklistToast toast={toast} />
    </div>
  );
}

/** Skeleton do protótipo (shimmer 1.15s) espelhando header + cards + tabela. */
function ChecklistListSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="ckb-skl-head">
        <div>
          <div className="ckb-skl" style={{ width: 70, height: 11, marginBottom: 10 }} />
          <div className="ckb-skl" style={{ width: 260, height: 22, marginBottom: 9 }} />
          <div className="ckb-skl" style={{ width: 420, height: 13 }} />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div className="ckb-skl" style={{ width: 210, height: 36 }} />
          <div className="ckb-skl" style={{ width: 130, height: 36 }} />
          <div className="ckb-skl" style={{ width: 130, height: 36 }} />
        </div>
      </div>
      <div className="ckb-kpis">
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className="ckb-skl" style={{ height: 74 }} />
        ))}
      </div>
      <div className="ckb-skl-card">
        <div className="ckb-skl" style={{ height: 34, marginBottom: 14 }} />
        <div className="ckb-skl" style={{ height: 44, marginBottom: 10 }} />
        <div className="ckb-skl" style={{ height: 44, marginBottom: 10 }} />
        <div className="ckb-skl" style={{ height: 44, marginBottom: 10 }} />
        <div className="ckb-skl" style={{ height: 44 }} />
      </div>
    </div>
  );
}

function upsertChecklist(current: TenantChecklist[], checklist: TenantChecklist): TenantChecklist[] {
  const exists = current.some((item) => item.id === checklist.id);
  if (!exists) return [checklist, ...current];
  return current.map((item) => (item.id === checklist.id ? checklist : item));
}
