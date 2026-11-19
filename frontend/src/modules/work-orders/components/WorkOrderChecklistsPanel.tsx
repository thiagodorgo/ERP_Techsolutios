import { AlertTriangle, Camera, Car, Check, Eye, History, ListChecks, Lock, PenLine, Plus, Repeat, Send, Smartphone, Trash2, Truck, WifiOff } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { DenseExpandableRow } from "../../../components/dense-list";
import { Modal } from "../../../components/ui";
import { ApiError } from "../../../services/api/client";
import { defaultAppearanceFor, type Appearance } from "../../appearance/appearance.storage";
import { useScreenAppearance } from "../../appearance/useScreenAppearance";
import { listTenantChecklists } from "../../checklists/checklist.service";
import type { ChecklistApiContext, TenantChecklist } from "../../checklists/types";
import {
  buildChecklistAdjustmentBody,
  checklistAdjustFollowUp,
  checklistAdjustMessage,
  checklistPanelAccess,
  displayOrder,
  inclusionOf,
  liveLinesOf,
  LOCAL_REFUSAL_MESSAGES,
  PHASE_LABELS,
  publishedTemplates,
  READ_ONLY_MESSAGES,
  REMOVAL_REASON_MAX,
  requirementsSentence,
  TEMPLATE_TYPE_LABELS,
  templateRequirements,
  workOrderAlreadyDispatched,
  type ChecklistChange,
  type IncludablePhase,
  type RetirableLine,
  type TemplateRequirements,
} from "../work-order-checklists.model";
import { adjustWorkOrderChecklists } from "../work-orders.service";
import { getWorkOrderChecklistRoleLabel, getWorkOrderChecklistSourceLabel } from "../work-orders.adapter";
import type { WorkOrderChecklistLink, WorkOrderDetail, WorkOrderEvent, WorkOrdersApiContext } from "../work-orders.types";
import { formatClockTime } from "./StaleDataBanner";
import { StatePanel, StatePanelAction } from "./StatePanel";

// B-GUI-02 — "Vistorias desta OS": o operador escolhe o modelo da COLETA e, se quiser, o da ENTREGA, antes do envio ao
// guincheiro. Contêiner ÚNICO das 3 aparências aprovadas (`screen-refs/os-vistorias-3opcoes.reference.html`, a maquete que
// o dono aprovou em 17/11): A "Na ficha da OS" (em Informações gerais), B "Duas vagas" e C "Como o app vai ver" (as duas na
// aba Vistorias). Tela-modelo: `GeneralInfoTab.tsx` dentro de `WorkOrderDetailPage.tsx`; padrão dos blocos clicáveis
// (D-PADRAO-BLOCOS-CLICAVEIS): todo bloco filtra a lista, a linha tem uma altura e abre o detalhe logo abaixo, um por vez.
// Componentes da biblioteca: `DenseExpandableRow` (linha + detalhe), `Modal`, `StatePanel`; classes `.pat-*` de app.css.
//
// O que a tela NÃO faz (Emendas 1.1 e 2): não reordena (a primária é a coleta, decidida pelo servidor), não manda mais de
// uma linha por chamada, não retira linha que o operador não escolheu, e não mostra o selo "enviada" por vistoria (não há
// dado confiável; P-GUI02-VISTORIA-ENVIADA-POR-LINHA). "Trocar" são duas chamadas de uma linha: retirar a antiga e, só
// depois do 200, incluir a nova.

export const OS_VISTORIAS_APPEARANCE_KEY = "os-vistorias";

/**
 * O único lugar do front que lê a aparência das vistorias da OS (o guard de aparência exige UM contêiner). A página, a
 * janela da OS (pela `WorkOrderDetailView`) e a aba Informações gerais leem por aqui.
 *
 * LEITURA do dev, declarada (§A6): sem os provedores de sessão e de organização (render isolado da View nos testes de SSR,
 * que já existiam antes deste bloco), `useScreenAppearance` lança; aqui isso vira o padrão da tela (A). Com os provedores
 * — sempre, no app — a leitura é a de toda tela com aparência. A presença dos provedores não muda entre renders da mesma
 * árvore, então a ordem dos hooks é estável.
 */
export function useWorkOrderChecklistsAppearance(): Appearance {
  try {
    return useScreenAppearance(OS_VISTORIAS_APPEARANCE_KEY).appearance;
  } catch {
    return defaultAppearanceFor(OS_VISTORIAS_APPEARANCE_KEY);
  }
}

/** Data e hora no formato da ficha da OS (o mesmo `fmtDate` de Informações gerais, sem o import circular). */
function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// ---------- tipos internos ----------

type TemplatesState =
  | { readonly status: "skipped" }
  | { readonly status: "loading" }
  | { readonly status: "error" }
  | { readonly status: "ready"; readonly items: readonly TenantChecklist[]; readonly drafts: number };

type SubmitOutcome = { readonly ok: true; readonly workOrder: WorkOrderDetail } | { readonly ok: false; readonly message: string; readonly retry: boolean };

type Target = "coleta" | "entrega" | "fotos" | "assin" | "conferir";

type DialogState =
  | { readonly mode: "retire"; readonly line: RetirableLine; readonly name: string; readonly error: string | null; readonly busy: boolean }
  | {
      readonly mode: "swap";
      readonly line: RetirableLine & { readonly role: IncludablePhase };
      readonly oldName: string;
      readonly newTemplate: TenantChecklist;
      /** A 1ª chamada (retirar) já voltou 200: tentar de novo repete só a inclusão. */
      readonly retired: boolean;
      readonly error: string | null;
      readonly busy: boolean;
    };

const TARGET_LABELS: Readonly<Record<Target, string>> = {
  coleta: "Servem à coleta",
  entrega: "Servem à entrega",
  fotos: "Pedem fotos",
  assin: "Pedem assinatura",
  conferir: "Em uso nesta OS",
};

const sectionTitle: CSSProperties = { fontSize: 15, fontWeight: 800, color: "#0F172A" };
const sectionSub: CSSProperties = { fontSize: 12.5, color: "#64748B", marginTop: 3, lineHeight: 1.45 };
const card: CSSProperties = { background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, overflow: "hidden", minWidth: 0 };
const tag = (bg: string, color: string): CSSProperties => ({ background: bg, color });
const SELO = {
  falta: tag("#FEF3C7", "#B45309"),
  definida: tag("#DBEAFE", "#1D4ED8"),
  definidaEntrega: tag("#EDE9FE", "#6D28D9"),
  opcional: tag("#F1F5F9", "#64748B"),
  proximo: tag("#FEF3C7", "#B45309"),
};

// ---------- o contêiner ----------

export function WorkOrderChecklistsPanel({
  workOrder: incomingWorkOrder,
  timeline,
  context,
  permissions,
  appearance,
  lastUpdatedAt = null,
  onChanged,
}: {
  readonly workOrder: WorkOrderDetail;
  readonly timeline: readonly WorkOrderEvent[];
  readonly context: WorkOrdersApiContext;
  readonly permissions: readonly string[];
  readonly appearance: Appearance;
  readonly lastUpdatedAt?: string | null;
  /** Depois de gravar (ou de uma recusa que pede recarga): a página recarrega a OS e a linha do tempo. */
  readonly onChanged?: () => void;
}) {
  // A OS devolvida pelo PATCH vale até a página recarregar a dela (evita piscar o estado anterior).
  const [savedWorkOrder, setSavedWorkOrder] = useState<WorkOrderDetail | null>(null);
  useEffect(() => setSavedWorkOrder(null), [incomingWorkOrder]);
  const workOrder = savedWorkOrder ?? incomingWorkOrder;

  const access = checklistPanelAccess(permissions, workOrder.status);
  const [forcedReadOnly, setForcedReadOnly] = useState<"terminal" | "forbidden_on_save" | null>(null);
  const [offlineSince, setOfflineSince] = useState<string | null>(null);
  const canEdit = access.canEdit && forcedReadOnly === null && offlineSince === null;
  const readOnlyMessage = forcedReadOnly ? READ_ONLY_MESSAGES[forcedReadOnly] : access.readOnlyReason ? READ_ONLY_MESSAGES[access.readOnlyReason] : null;

  const [templates, setTemplates] = useState<TemplatesState>(access.canReadTemplates ? { status: "loading" } : { status: "skipped" });
  const checklistContext = useMemo<ChecklistApiContext>(
    () => ({ token: context.token, tenantId: context.tenantId ?? "", branchId: context.branchId, role: context.role ?? "", permissions: [...permissions] }),
    [context.token, context.tenantId, context.branchId, context.role, permissions],
  );
  const loadTemplates = useCallback(async () => {
    // Sem `tenant_checklists:read` a tela nem chama a lista: o 403 não vira ruído na auditoria de acesso negado.
    if (!access.canReadTemplates) return;
    setTemplates({ status: "loading" });
    try {
      const all = await listTenantChecklists(checklistContext);
      setTemplates({ status: "ready", items: publishedTemplates(all), drafts: all.filter((item) => item.status === "draft").length });
    } catch {
      setTemplates({ status: "error" });
    }
  }, [access.canReadTemplates, checklistContext]);
  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  const live = useMemo(() => liveLinesOf(workOrder), [workOrder]);
  const ordered = useMemo(() => displayOrder(live), [live]);
  const dispatched = workOrderAlreadyDispatched(workOrder, timeline);
  const lastDispatchAt = useMemo(
    () => timeline.filter((event) => event.eventType === "field_dispatch_created").reduce<string | null>((max, event) => (!max || event.createdAt > max ? event.createdAt : max), null),
    [timeline],
  );

  const templateById = useMemo(() => {
    const map = new Map<string, TenantChecklist>();
    if (templates.status === "ready") for (const item of templates.items) map.set(item.id, item);
    return map;
  }, [templates]);

  const lineView = useCallback(
    (line: WorkOrderChecklistLink) => {
      const template = templateById.get(line.checklistId) ?? null;
      const inclusion = inclusionOf(timeline, line);
      const name = template?.name ?? inclusion?.label ?? "Modelo de vistoria";
      const nameHint = template
        ? null
        : inclusion?.label
          ? "nome na inclusão"
          : templates.status === "ready"
            ? "não registrado"
            : "o nome não está disponível para o seu perfil";
      const nextDispatch = dispatched && lastDispatchAt !== null && inclusion !== null && inclusion.createdAt > lastDispatchAt;
      return { line, template, name, nameHint, inclusion, nextDispatch, requirements: template ? templateRequirements(template) : null };
    },
    [dispatched, lastDispatchAt, templateById, templates.status, timeline],
  );
  const collectionLine = ordered.find((line) => line.role === "collection") ?? null;
  const deliveryLine = ordered.find((line) => line.role === "delivery") ?? null;

  // ---------- filtro dos blocos e linha aberta ----------
  const [target, setTarget] = useState<Target | null>(null);
  const [openRow, setOpenRow] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ readonly id: string; readonly message: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);
  const say = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4200);
  }, []);
  const toggleTarget = (next: Target) => {
    setTarget((current) => (current === next ? null : next));
    setOpenRow(null);
  };

  // ---------- gravar ----------
  const submit = useCallback(
    async (change: ChecklistChange, liveNow: readonly WorkOrderChecklistLink[]): Promise<SubmitOutcome> => {
      const built = buildChecklistAdjustmentBody(liveNow, change);
      if (built.kind === "refused") return { ok: false, message: LOCAL_REFUSAL_MESSAGES[built.reason], retry: false };
      try {
        const updated = await adjustWorkOrderChecklists(context, workOrder.id, built.body);
        setSavedWorkOrder(updated);
        onChanged?.();
        return { ok: true, workOrder: updated };
      } catch (error) {
        if (error instanceof ApiError) {
          const followUp = checklistAdjustFollowUp(error.status, error.reason);
          if (followUp === "read_only") setForcedReadOnly(error.reason === "work_order_terminal" ? "terminal" : "forbidden_on_save");
          if (followUp === "reload_templates") void loadTemplates();
          if (followUp === "reload_work_order") onChanged?.();
          return { ok: false, message: checklistAdjustMessage(error.status, error.reason), retry: followUp === "retry" };
        }
        // Sem resposta do servidor (rede): a web não tem fila; as escolhas ficam bloqueadas até "Tentar novamente".
        setOfflineSince(new Date().toISOString());
        return { ok: false, message: "Sem conexão com o servidor. Não foi possível salvar agora.", retry: true };
      }
    },
    [context, loadTemplates, onChanged, workOrder.id],
  );

  /** "Trocar": retirar a antiga e, SÓ depois do 200, incluir a nova (Emenda 2, §2). */
  const swapLine = useCallback(
    async (line: RetirableLine & { readonly role: IncludablePhase }, newChecklistId: string, reason: string, onRetired: () => void): Promise<SubmitOutcome> => {
      const retired = await submit({ kind: "retire", line, reason }, live);
      if (!retired.ok) return retired;
      onRetired();
      const nextLive = retired.ok ? liveLinesOf(retired.workOrder) : live;
      return submit({ kind: "include", checklistId: newChecklistId, role: line.role }, nextLive);
    },
    [live, submit],
  );

  const include = async (template: TenantChecklist, role: IncludablePhase, rowId: string) => {
    setRowError(null);
    const outcome = await submit({ kind: "include", checklistId: template.id, role }, live);
    if (!outcome.ok) {
      setRowError({ id: rowId, message: outcome.message });
      return;
    }
    say(`Vistoria de ${PHASE_LABELS[role]} definida: ${template.name}.${dispatched ? " Chega ao app no próximo envio." : " O guincheiro recebe no envio."}`);
  };

  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [reasonText, setReasonText] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);
  const openDialog = (next: DialogState) => {
    setReasonText("");
    setReasonError(null);
    setDialog(next);
  };

  const confirmDialog = async () => {
    if (!dialog) return;
    const reason = reasonText.trim();
    if (dialog.mode === "retire" || !dialog.retired) {
      if (!reason) {
        setReasonError(LOCAL_REFUSAL_MESSAGES.reason_required);
        return;
      }
    }
    setReasonError(null);
    setDialog({ ...dialog, busy: true, error: null });
    if (dialog.mode === "retire") {
      const outcome = await submit({ kind: "retire", line: dialog.line, reason }, live);
      if (!outcome.ok) {
        setDialog({ ...dialog, busy: false, error: outcome.message });
        return;
      }
      setDialog(null);
      say(`Vistoria retirada da ${PHASE_LABELS[dialog.line.role]}. O motivo ficou no histórico.`);
      return;
    }
    if (dialog.retired) {
      const outcome = await submit({ kind: "include", checklistId: dialog.newTemplate.id, role: dialog.line.role }, live);
      if (!outcome.ok) {
        setDialog({ ...dialog, busy: false, error: outcome.message });
        return;
      }
      setDialog(null);
      say(`Vistoria de ${PHASE_LABELS[dialog.line.role]} definida: ${dialog.newTemplate.name}.`);
      return;
    }
    let retiredNow = false;
    const outcome = await swapLine(dialog.line, dialog.newTemplate.id, reason, () => {
      retiredNow = true;
    });
    if (!outcome.ok) {
      setDialog({ ...dialog, busy: false, retired: retiredNow, error: outcome.message });
      return;
    }
    setDialog(null);
    say(`Vistoria de ${PHASE_LABELS[dialog.line.role]} trocada por ${dialog.newTemplate.name}.${dispatched ? " Vale no próximo envio." : ""}`);
  };

  const retry = () => {
    setOfflineSince(null);
    void loadTemplates();
    onChanged?.();
  };

  // ---------- derivados para as 3 aparências ----------
  const published = templates.status === "ready" ? templates.items : [];
  const usesOf = (templateId: string) => live.filter((line) => line.checklistId === templateId);
  const reqOf = (template: TenantChecklist) => templateRequirements(template);
  const matchesTarget = (template: TenantChecklist, current: Target | null): boolean => {
    if (!current) return true;
    const uses = usesOf(template.id);
    const req = reqOf(template);
    if (current === "coleta") return template.type !== "towing_delivery" || uses.some((line) => line.role === "collection");
    if (current === "entrega") return template.type === "towing_delivery" || template.type === "custom" || uses.some((line) => line.role === "delivery");
    if (current === "fotos") return req.photos > 0 || req.beforeAfter;
    if (current === "assin") return req.signature;
    return uses.length > 0;
  };
  const filtered = published.filter((template) => matchesTarget(template, target));
  const photoCount = published.filter((template) => matchesTarget(template, "fotos")).length;
  const signatureCount = published.filter((template) => matchesTarget(template, "assin")).length;
  // Linhas da OS cujo modelo não está na lista (lista não lida, modelo arquivado): aparecem à parte, nunca somem.
  const unlisted = ordered.filter((line) => !templateById.has(line.checklistId));

  const banners = (
    <PanelBanners
      dispatched={dispatched}
      terminal={access.terminal || forcedReadOnly === "terminal"}
      readOnlyMessage={access.terminal || forcedReadOnly === "terminal" ? null : readOnlyMessage}
      offlineAt={offlineSince ? formatClockTime(lastUpdatedAt) ?? formatClockTime(offlineSince) : null}
      onRetry={retry}
    />
  );

  const tableProps: TemplateTableProps = {
    appearance,
    templates: filtered,
    total: published.length,
    drafts: templates.status === "ready" ? templates.drafts : 0,
    target,
    onClearTarget: () => {
      setTarget(null);
      setOpenRow(null);
    },
    openRow,
    onToggleRow: (id) => setOpenRow((current) => (current === id ? null : id)),
    rowError,
    usesOf,
    nextDispatchOf: (line) => lineView(line).nextDispatch,
    dispatched,
    canEdit,
    collectionLine,
    deliveryLine,
    onInclude: (template, role, rowId) => void include(template, role, rowId),
    onSwap: (template, line) =>
      openDialog({ mode: "swap", line: line as RetirableLine & { role: IncludablePhase }, oldName: lineView(line).name, newTemplate: template, retired: false, error: null, busy: false }),
    onRetire: (line) => openDialog({ mode: "retire", line: line as RetirableLine, name: lineView(line).name, error: null, busy: false }),
  };

  const listArea = (
    <TemplatesArea
      templates={templates}
      canEdit={canEdit}
      onRetry={() => void loadTemplates()}
      readOnlyMessage={readOnlyMessage}
      table={<TemplateTable {...tableProps} />}
      unlisted={unlisted.length > 0 ? <LinkedLinesTable lines={unlisted.map(lineView)} /> : null}
    />
  );

  const collectionView = collectionLine ? lineView(collectionLine) : null;
  const deliveryView = deliveryLine ? lineView(deliveryLine) : null;
  const loadingBlocks = templates.status === "loading";

  const dialogNode = dialog ? (
    <ChecklistDialog
      dialog={dialog}
      reason={reasonText}
      reasonError={reasonError}
      onReason={setReasonText}
      onClose={() => setDialog(null)}
      onConfirm={() => void confirmDialog()}
    />
  ) : null;
  const toastNode = (
    <div role="status" aria-live="polite" style={toastStyle(toast !== null)}>
      {toast}
    </div>
  );

  if (appearance === "C") {
    return (
      <div data-aparencia="C" style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
        <PanelHeading sub="Em três passos: o que o guincheiro faz na coleta, na entrega e o que chega ao app." />
        {banners}
        {loadingBlocks ? <SkeletonBlocks count={3} columns={3} /> : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
            <StepButton
              n={1}
              title="Coleta"
              line={collectionView ? collectionView.name : "Escolher o modelo"}
              hint={collectionView ? (collectionView.requirements ? requirementsSentence(collectionView.requirements) : "o que o modelo pede não está disponível") : "sem ela, não há vistoria na retirada"}
              tone={collectionView ? "done" : "warn"}
              pressed={target === "coleta"}
              onClick={() => toggleTarget("coleta")}
            />
            <StepButton
              n={2}
              title="Entrega (opcional)"
              line={deliveryView ? deliveryView.name : "Não pedida"}
              hint={deliveryView ? (deliveryView.requirements ? requirementsSentence(deliveryView.requirements) : "o que o modelo pede não está disponível") : "escolha se o veículo for entregue a alguém"}
              tone={deliveryView ? "done" : "idle"}
              pressed={target === "entrega"}
              onClick={() => toggleTarget("entrega")}
            />
            <StepButton
              n={3}
              title="Conferir o envio"
              line={appCountSentence(linesThatGoToApp(live))}
              hint={dispatched ? "OS já enviada: novidade vale no próximo envio" : "o guincheiro recebe ao ser enviado"}
              tone="idle"
              pressed={target === "conferir"}
              onClick={() => toggleTarget("conferir")}
            />
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 250px", gap: 14, alignItems: "start" }}>
          <div style={card}>{listArea}</div>
          {loadingBlocks ? <div /> : <AppPreview workOrder={workOrder} collection={collectionView} delivery={deliveryView} dispatched={dispatched} />}
        </div>
        {dialogNode}
        {toastNode}
      </div>
    );
  }

  if (appearance === "B") {
    return (
      <div data-aparencia="B" style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
        <PanelHeading sub="Uma vistoria para a coleta e, se quiser, uma para a entrega. O guincheiro recebe as duas no envio da OS." />
        {banners}
        {loadingBlocks ? <SkeletonBlocks count={2} columns={2} /> : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
              <SlotButton phase="collection" view={collectionView} dispatched={dispatched} pressed={target === "coleta"} onClick={() => toggleTarget("coleta")} />
              <SlotButton phase="delivery" view={deliveryView} dispatched={dispatched} pressed={target === "entrega"} onClick={() => toggleTarget("entrega")} />
            </div>
            {templates.status === "ready" && published.length > 0 ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
                <MiniKpi icon={<Camera size={16} />} bg="#F0F9FF" color="#0369A1" value={photoCount} label="modelos pedem fotos" pressed={target === "fotos"} onClick={() => toggleTarget("fotos")} />
                <MiniKpi icon={<PenLine size={16} />} bg="#F0FDF4" color="#15803D" value={signatureCount} label="modelos pedem assinatura" pressed={target === "assin"} onClick={() => toggleTarget("assin")} />
              </div>
            ) : null}
          </>
        )}
        <div style={card}>{listArea}</div>
        {dialogNode}
        {toastNode}
      </div>
    );
  }

  return (
    <div data-aparencia="A" style={card}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, padding: "16px 18px 12px" }}>
        <div>
          <div style={sectionTitle}>Vistorias desta OS</div>
          <div style={sectionSub}>Escolha o modelo da coleta e, se quiser, o da entrega. O guincheiro recebe no envio da OS.</div>
        </div>
        <ManageTemplatesLink show={canEdit} />
      </div>
      <div style={{ padding: "0 18px" }}>{banners}</div>
      {loadingBlocks ? (
        <div style={{ padding: "0 18px 14px" }}>
          <SkeletonBlocks count={4} columns={4} />
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10, padding: "0 18px 14px" }}>
          <KpiBlock
            icon={<Car size={16} />}
            color="#2563EB"
            bg="#EFF6FF"
            value={collectionView ? collectionView.name : "Não definida"}
            label="Vistoria de coleta"
            hint={collectionView ? (collectionView.requirements ? requirementsSentence(collectionView.requirements) : (collectionView.nameHint ?? "")) : "o guincheiro não terá vistoria na retirada"}
            selo={collectionView ? (collectionView.nextDispatch ? ["próximo envio", SELO.proximo] : ["definida", SELO.definida]) : ["falta escolher", SELO.falta]}
            text
            pressed={target === "coleta"}
            onClick={() => toggleTarget("coleta")}
          />
          <KpiBlock
            icon={<Truck size={16} />}
            color="#7652b7"
            bg="#F3EEFB"
            value={deliveryView ? deliveryView.name : "Não pedida"}
            label="Vistoria de entrega"
            hint={deliveryView ? (deliveryView.requirements ? requirementsSentence(deliveryView.requirements) : (deliveryView.nameHint ?? "")) : "opcional: sem ela, o app não mostra a entrega"}
            selo={deliveryView ? (deliveryView.nextDispatch ? ["próximo envio", SELO.proximo] : ["definida", SELO.definidaEntrega]) : ["opcional", SELO.opcional]}
            text
            pressed={target === "entrega"}
            onClick={() => toggleTarget("entrega")}
          />
          {templates.status === "ready" ? (
            <>
              <KpiBlock icon={<Camera size={16} />} color="#0369A1" bg="#F0F9FF" value={String(photoCount)} label="Modelos que pedem fotos" hint="com número mínimo de fotos" pressed={target === "fotos"} onClick={() => toggleTarget("fotos")} />
              <KpiBlock icon={<PenLine size={16} />} color="#15803D" bg="#F0FDF4" value={String(signatureCount)} label="Modelos com assinatura" hint="cliente, motorista ou quem recebe" pressed={target === "assin"} onClick={() => toggleTarget("assin")} />
            </>
          ) : null}
        </div>
      )}
      {listArea}
      {dialogNode}
      {toastNode}
    </div>
  );
}

// ---------- peças ----------

function PanelHeading({ sub }: { readonly sub: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
      <div>
        <div style={sectionTitle}>Vistorias desta OS</div>
        <div style={sectionSub}>{sub}</div>
      </div>
    </div>
  );
}

function ManageTemplatesLink({ show }: { readonly show: boolean }) {
  const navigate = useNavigate();
  if (!show) return null;
  return (
    <button type="button" className="pat-link" onClick={() => navigate("/administrator/checklists")}>
      Gerenciar modelos
    </button>
  );
}

const bannerBase: CSSProperties = { marginBottom: 10 };
const bannerDanger: CSSProperties = { ...bannerBase, background: "#FEF2F2", border: "1px solid #FECACA", color: "#B91C1C" };
const bannerNeutral: CSSProperties = { ...bannerBase, background: "#F8FAFC", border: "1px solid #E2E8F0", color: "#475569" };

function PanelBanners({
  dispatched,
  terminal,
  readOnlyMessage,
  offlineAt,
  onRetry,
}: {
  readonly dispatched: boolean;
  readonly terminal: boolean;
  readonly readOnlyMessage: string | null;
  readonly offlineAt: string | null;
  readonly onRetry: () => void;
}) {
  const items: ReactNode[] = [];
  if (offlineAt !== null) {
    items.push(
      <div key="offline" role="status" data-faixa="sem-conexao" className="pat-banner" style={bannerDanger}>
        <WifiOff size={14} aria-hidden="true" />
        <span>Sem conexão com o servidor. Você vê o que foi carregado às {offlineAt}; as escolhas voltam quando a conexão voltar.</span>
        <button type="button" className="pat-link" onClick={onRetry}>
          Tentar novamente
        </button>
      </div>,
    );
  }
  if (dispatched && !terminal) {
    items.push(
      <div key="dispatched" role="status" data-faixa="enviada" className="pat-banner pat-banner--warning" style={bannerBase}>
        <Send size={14} aria-hidden="true" />
        <span>Esta OS já foi enviada ao guincheiro. Uma vistoria incluída agora só chega ao app num novo envio.</span>
      </div>,
    );
  }
  if (terminal) {
    items.push(
      <div key="terminal" role="status" data-faixa="encerrada" className="pat-banner" style={bannerNeutral}>
        <Lock size={14} aria-hidden="true" />
        <span>{READ_ONLY_MESSAGES.terminal}</span>
      </div>,
    );
  }
  if (readOnlyMessage) {
    items.push(
      <div key="readonly" role="status" data-faixa="so-leitura" className="pat-banner pat-banner--info" style={bannerBase}>
        <Eye size={14} aria-hidden="true" />
        <span>{readOnlyMessage}</span>
      </div>,
    );
  }
  return items.length > 0 ? <div>{items}</div> : null;
}

type Selo = readonly [string, CSSProperties];

function KpiBlock({
  icon,
  color,
  bg,
  value,
  label,
  hint,
  selo,
  text = false,
  pressed,
  onClick,
}: {
  readonly icon: ReactNode;
  readonly color: string;
  readonly bg: string;
  readonly value: string;
  readonly label: string;
  readonly hint: string;
  readonly selo?: Selo;
  readonly text?: boolean;
  readonly pressed: boolean;
  readonly onClick: () => void;
}) {
  return (
    <button type="button" className="pat-kpi pat-kpi--clickable" aria-pressed={pressed} aria-label={`${label}: ${value} — filtrar os modelos`} onClick={onClick} style={pressed ? pressedRing : undefined}>
      <div className="pat-kpi__head">
        <span className="pat-kpi__tile" style={{ background: bg, color }}>
          {icon}
        </span>
        {selo ? (
          <span className="pat-kpi__tag" style={selo[1]}>
            {selo[0]}
          </span>
        ) : null}
      </div>
      <div className="pat-kpi__value" title={value} style={text ? kpiTextValue : undefined}>
        {value}
      </div>
      <div className="pat-kpi__label">{label}</div>
      <div className="pat-kpi__hint" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={hint}>
        {hint}
      </div>
    </button>
  );
}

const pressedRing: CSSProperties = { borderColor: "#2563EB", boxShadow: "0 0 0 3px #DBEAFE" };
const kpiTextValue: CSSProperties = { fontSize: 15, letterSpacing: 0, lineHeight: 1.25, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };

function MiniKpi({ icon, bg, color, value, label, pressed, onClick }: { readonly icon: ReactNode; readonly bg: string; readonly color: string; readonly value: number; readonly label: string; readonly pressed: boolean; readonly onClick: () => void }) {
  return (
    <button
      type="button"
      className="pat-kpi pat-kpi--clickable"
      aria-pressed={pressed}
      aria-label={`${value} ${label} — filtrar`}
      onClick={onClick}
      style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", ...(pressed ? pressedRing : {}) }}
    >
      <span className="pat-kpi__tile" style={{ background: bg, color }}>
        {icon}
      </span>
      <span className="pat-kpi__value" style={{ fontSize: 20 }}>
        {value}
      </span>
      <span className="pat-kpi__label" style={{ marginTop: 0 }}>
        {label}
      </span>
    </button>
  );
}

type LineView = {
  readonly line: WorkOrderChecklistLink;
  readonly template: TenantChecklist | null;
  readonly name: string;
  readonly nameHint: string | null;
  readonly inclusion: { readonly label: string | null; readonly createdAt: string } | null;
  readonly nextDispatch: boolean;
  readonly requirements: TemplateRequirements | null;
};

function SlotButton({ phase, view, dispatched, pressed, onClick }: { readonly phase: IncludablePhase; readonly view: LineView | null; readonly dispatched: boolean; readonly pressed: boolean; readonly onClick: () => void }) {
  const isCollection = phase === "collection";
  const color = isCollection ? "#2563EB" : "#7652b7";
  const etapa = isCollection ? "Coleta · na retirada do veículo" : "Entrega · ao deixar o veículo";
  const selo: Selo = view
    ? view.nextDispatch
      ? ["próximo envio", SELO.proximo]
      : ["definida", SELO.definida]
    : isCollection
      ? ["falta escolher", SELO.falta]
      : ["opcional", SELO.opcional];
  const empty = view === null;
  return (
    <button
      type="button"
      data-vaga={phase}
      aria-pressed={pressed}
      aria-label={`${isCollection ? "Coleta" : "Entrega"}: ${view ? view.name : "não definida"} — filtrar os modelos`}
      onClick={onClick}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        textAlign: "left",
        background: empty ? "#F8FAFC" : "#fff",
        border: `1px ${empty ? "dashed" : "solid"} ${pressed ? "#2563EB" : "#E2E8F0"}`,
        boxShadow: pressed ? "0 0 0 3px #DBEAFE" : undefined,
        borderRadius: 14,
        padding: "14px 16px",
        cursor: "pointer",
        minWidth: 0,
        font: "inherit",
      }}
    >
      <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, fontSize: 11, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color }}>
        <span>{etapa}</span>
        <span className="pat-kpi__tag" style={{ ...selo[1], letterSpacing: 0, textTransform: "none" }}>
          {selo[0]}
        </span>
      </span>
      {view ? (
        <>
          <span style={{ fontSize: 16, fontWeight: 800, color: "#0F172A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={view.name}>
            {view.name}
          </span>
          <span style={{ fontSize: 12, color: "#64748B", lineHeight: 1.45 }}>
            {view.requirements ? <RequirementIcons req={view.requirements} /> : (view.nameHint ?? "")}
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5, color: "#94A3B8", fontWeight: 600, marginTop: 2 }}>
            <History size={12} aria-hidden="true" />
            {view.inclusion ? `Incluída em ${fmtDate(view.inclusion.createdAt)}` : "Inclusão sem data registrada"}
            {view.template ? ` · v${view.template.version}` : ""}
            {dispatched && view.nextDispatch ? " · vale no próximo envio" : ""}
          </span>
        </>
      ) : (
        <>
          <span style={{ fontSize: 16, fontWeight: 800, color: "#94A3B8" }}>{isCollection ? "Nenhuma vistoria de coleta" : "Nenhuma vistoria de entrega"}</span>
          <span style={{ fontSize: 12, color: "#64748B", lineHeight: 1.45 }}>
            {isCollection ? "O guincheiro não fará vistoria na retirada." : "O app não mostra a etapa de entrega ao guincheiro."} Clique para ver os modelos que servem.
          </span>
        </>
      )}
    </button>
  );
}

function StepButton({ n, title, line, hint, tone, pressed, onClick }: { readonly n: number; readonly title: string; readonly line: string; readonly hint: string; readonly tone: "done" | "warn" | "idle"; readonly pressed: boolean; readonly onClick: () => void }) {
  const ball: CSSProperties =
    tone === "done"
      ? { background: "#2563EB", borderColor: "#2563EB", color: "#fff" }
      : tone === "warn"
        ? { borderColor: "#D97706", color: "#B45309", background: "#FFFBEB" }
        : { borderColor: "#CBD5E1", color: "#64748B", background: "#fff" };
  return (
    <button
      type="button"
      data-passo={n}
      aria-pressed={pressed}
      aria-label={`Passo ${n}, ${title}: ${line} — filtrar os modelos`}
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        textAlign: "left",
        background: "#fff",
        border: `1px solid ${pressed ? "#2563EB" : "#E2E8F0"}`,
        boxShadow: pressed ? "0 0 0 3px #DBEAFE" : undefined,
        borderRadius: 12,
        padding: "11px 12px",
        cursor: "pointer",
        minWidth: 0,
        font: "inherit",
      }}
    >
      <span style={{ width: 24, height: 24, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, flexShrink: 0, border: "2px solid", ...ball }}>
        {tone === "done" ? <Check size={13} aria-hidden="true" /> : n}
      </span>
      <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
        <b style={{ fontSize: 12.5, fontWeight: 800, color: "#0F172A" }}>{title}</b>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#334155", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={line}>
          {line}
        </span>
        <small style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={hint}>
          {hint}
        </small>
      </span>
    </button>
  );
}

/** Quantas vistorias viram execução no envio (a primária é a coleta; das outras, só as de entrega). */
export function linesThatGoToApp(live: readonly WorkOrderChecklistLink[]): number {
  if (live.length === 0) return 0;
  const primary = live.find((line) => line.role === "collection") ?? displayOrder(live)[0];
  return 1 + live.filter((line) => line !== primary && line.role === "delivery").length;
}

function appCountSentence(count: number): string {
  if (count === 0) return "Nenhuma vistoria vai ao app";
  return count === 1 ? "1 vistoria vai ao app" : `${count} vistorias vão ao app`;
}

function AppPreview({ workOrder, collection, delivery, dispatched }: { readonly workOrder: WorkOrderDetail; readonly collection: LineView | null; readonly delivery: LineView | null; readonly dispatched: boolean }) {
  const comparison = collection !== null && delivery !== null && collection.line.checklistId === delivery.line.checklistId;
  const item = (title: string, view: LineView | null, empty: string) =>
    view ? (
      <div style={previewItem}>
        <b style={previewTitle}>
          {title} · {view.name}
        </b>
        <span style={previewText}>
          {view.requirements ? `${capitalize(requirementsSentence(view.requirements))}. ${view.requirements.requiredFields} campos obrigatórios.` : "O que o modelo pede não está disponível para o seu perfil."}
        </span>
        {dispatched && view.nextDispatch ? <span style={{ ...previewSeal, background: "#FEF3C7", color: "#B45309" }}>chega no próximo envio</span> : null}
      </div>
    ) : (
      <div style={{ ...previewItem, ...previewOff }}>
        <b style={{ ...previewTitle, color: "#94A3B8" }}>{title} · não pedida</b>
        <span style={previewText}>{empty}</span>
      </div>
    );
  return (
    <aside aria-label="Prévia do que o app do guincheiro vai mostrar" style={{ background: "#0F172A", borderRadius: 18, padding: 10, minWidth: 0 }}>
      <div style={{ background: "#F8FAFC", borderRadius: 12, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: "#0F172A", display: "flex", alignItems: "center", gap: 6 }}>
          <Smartphone size={14} aria-hidden="true" />
          No app do guincheiro
        </div>
        <div style={{ fontSize: 11, color: "#64748B", lineHeight: 1.4 }}>
          {workOrder.code} · {workOrder.title}
        </div>
        {item("Coleta", collection, "O guincheiro segue sem vistoria na retirada.")}
        {item("Entrega", delivery, "O app não mostra a etapa de entrega.")}
        <div style={{ ...previewItem, ...(comparison ? {} : previewOff) }}>
          <b style={{ ...previewTitle, ...(comparison ? {} : { color: "#94A3B8" }) }}>Comparação do veículo · {comparison ? "ligada" : "desligada"}</b>
          <span style={previewText}>
            {comparison ? "Coleta e entrega usam o mesmo modelo: o app compara o estado do veículo." : "Liga quando a coleta e a entrega usam o mesmo modelo."}
          </span>
        </div>
      </div>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: "#94A3B8", textAlign: "center", marginTop: 6, letterSpacing: ".04em" }}>
        {collection ? "PRONTA PARA ENVIAR" : "FALTA A COLETA"}
      </div>
    </aside>
  );
}

const previewItem: CSSProperties = { background: "#fff", border: "1px solid #E2E8F0", borderRadius: 10, padding: "9px 10px", display: "flex", flexDirection: "column", gap: 4 };
const previewOff: CSSProperties = { background: "#F1F5F9", borderStyle: "dashed" };
const previewTitle: CSSProperties = { fontSize: 11.5, fontWeight: 800, color: "#0F172A" };
const previewText: CSSProperties = { fontSize: 11, color: "#475569", lineHeight: 1.4 };
const previewSeal: CSSProperties = { display: "inline-flex", alignItems: "center", fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 99, width: "fit-content" };

function capitalize(text: string): string {
  return text ? text[0].toUpperCase() + text.slice(1) : text;
}

function RequirementIcons({ req }: { readonly req: TemplateRequirements }) {
  const parts: ReactNode[] = [];
  const item = (key: string, icon: ReactNode, label: string) => (
    <span key={key} style={{ display: "inline", marginRight: 10, whiteSpace: "nowrap" }}>
      <span style={{ color: "#94A3B8", verticalAlign: -2, marginRight: 4, display: "inline-flex" }} aria-hidden="true">
        {icon}
      </span>
      {label}
    </span>
  );
  if (req.beforeAfter) parts.push(item("ba", <Camera size={13} />, "antes e depois"));
  if (req.photos > 0) parts.push(item("fotos", <Camera size={13} />, req.photos === 1 ? "1 foto" : `${req.photos} fotos`));
  if (req.damageMap) parts.push(item("avarias", <Car size={13} />, "avarias"));
  if (req.signature) parts.push(item("assin", <PenLine size={13} />, "assinatura"));
  if (req.comparison) parts.push(item("comp", <Repeat size={13} />, "compara"));
  if (parts.length === 0) parts.push(item("perg", <ListChecks size={13} />, req.fields === 1 ? "1 pergunta" : `${req.fields} perguntas`));
  return <span style={{ display: "inline", color: "#475569", fontSize: 12 }}>{parts}</span>;
}

function SkeletonBlocks({ count, columns }: { readonly count: number; readonly columns: number }) {
  return (
    <div data-carregando aria-hidden="true" style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: 10 }}>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="pat-kpi">
          <span className="pat-skel" style={{ width: 30, height: 30, borderRadius: 9 }} />
          <br />
          <span className="pat-skel" style={{ width: "70%", height: 16, marginTop: 12 }} />
          <br />
          <span className="pat-skel" style={{ width: "50%", height: 12, marginTop: 8 }} />
        </div>
      ))}
    </div>
  );
}

function TemplatesArea({
  templates,
  canEdit,
  onRetry,
  readOnlyMessage,
  table,
  unlisted,
}: {
  readonly templates: TemplatesState;
  readonly canEdit: boolean;
  readonly onRetry: () => void;
  readonly readOnlyMessage: string | null;
  readonly table: ReactNode;
  readonly unlisted: ReactNode;
}) {
  const navigate = useNavigate();
  if (templates.status === "skipped") {
    // Sem a leitura dos modelos: o que a OS já traz, só para leitura (a frase do perfil está nas faixas).
    return unlisted ?? <div style={{ padding: "18px", fontSize: 12.5, color: "#94A3B8" }}>{readOnlyMessage ? "Nenhuma vistoria ligada a esta OS." : ""}</div>;
  }
  if (templates.status === "error") {
    return (
      <>
        <StatePanel
          tone="error"
          embedded
          title="Não foi possível carregar os modelos"
          detail="A consulta aos modelos de vistoria falhou. As vistorias desta OS continuam visíveis."
          actions={<StatePanelAction label="Tentar novamente" onClick={onRetry} />}
        />
        {unlisted}
      </>
    );
  }
  if (templates.status === "ready" && templates.items.length === 0) {
    return (
      <>
        <StatePanel
          tone="empty"
          embedded
          title="Nenhum modelo de vistoria publicado"
          detail={`Os modelos são montados e publicados em Checklists. Publique um modelo para escolhê-lo aqui.${templates.drafts > 0 ? ` ${templates.drafts === 1 ? "1 rascunho não aparece" : `${templates.drafts} rascunhos não aparecem`}.` : ""}`}
          actions={canEdit ? <StatePanelAction label="Ir para Checklists" onClick={() => navigate("/administrator/checklists")} /> : undefined}
        />
        {unlisted}
      </>
    );
  }
  return (
    <>
      {table}
      {unlisted}
    </>
  );
}

type TemplateTableProps = {
  readonly appearance: Appearance;
  readonly templates: readonly TenantChecklist[];
  readonly total: number;
  readonly drafts: number;
  readonly target: Target | null;
  readonly onClearTarget: () => void;
  readonly openRow: string | null;
  readonly onToggleRow: (id: string) => void;
  readonly rowError: { readonly id: string; readonly message: string } | null;
  readonly usesOf: (templateId: string) => readonly WorkOrderChecklistLink[];
  readonly nextDispatchOf: (line: WorkOrderChecklistLink) => boolean;
  readonly dispatched: boolean;
  readonly canEdit: boolean;
  readonly collectionLine: WorkOrderChecklistLink | null;
  readonly deliveryLine: WorkOrderChecklistLink | null;
  readonly onInclude: (template: TenantChecklist, role: IncludablePhase, rowId: string) => void;
  readonly onSwap: (template: TenantChecklist, line: WorkOrderChecklistLink) => void;
  readonly onRetire: (line: WorkOrderChecklistLink) => void;
};

const COLUMNS: Readonly<Record<Appearance, readonly { readonly label: string; readonly width: string }[]>> = {
  A: [
    { label: "MODELO", width: "38%" },
    { label: "PEDE", width: "30%" },
    { label: "VERSÃO", width: "8%" },
    { label: "NESTA OS", width: "20%" },
  ],
  B: [
    { label: "MODELO", width: "30%" },
    { label: "PEDE", width: "26%" },
    { label: "CAMPOS", width: "16%" },
    { label: "VERSÃO", width: "8%" },
    { label: "NESTA OS", width: "18%" },
  ],
  C: [
    { label: "MODELO", width: "42%" },
    { label: "PEDE", width: "32%" },
    { label: "NESTA OS", width: "26%" },
  ],
};

const GROUPS: readonly { readonly label: string; readonly match: (template: TenantChecklist) => boolean; readonly color: string; readonly bg: string }[] = [
  { label: "Para a coleta", match: (template) => template.type === "towing_collection", color: "#2563EB", bg: "#EFF6FF" },
  { label: "Para a entrega", match: (template) => template.type === "towing_delivery", color: "#7652b7", bg: "#F3EEFB" },
  { label: "Uso geral", match: (template) => template.type === "custom" || template.type === "technical_evidence", color: "#475569", bg: "#F1F5F9" },
];

function TemplateTable(props: TemplateTableProps) {
  const { appearance, templates, total, drafts, target, onClearTarget } = props;
  const columns = COLUMNS[appearance];
  const colSpan = columns.length + 1;
  const rows = (items: readonly TenantChecklist[]) => items.map((template) => <TemplateRow key={template.id} template={template} colSpan={colSpan} {...props} />);
  return (
    <div>
      {target ? (
        <div className="pat-filtro-chip-bar">
          <span className="pat-filtro-chip">
            Filtro: {TARGET_LABELS[target]}
            <button type="button" aria-label={`Tirar o filtro ${TARGET_LABELS[target]}`} onClick={onClearTarget}>
              ✕
            </button>
          </span>
        </div>
      ) : null}
      <table className="pat-ab-table">
        <colgroup>
          {columns.map((column) => (
            <col key={column.label} style={{ width: column.width }} />
          ))}
          <col style={{ width: 44 }} />
        </colgroup>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.label}>{column.label}</th>
            ))}
            <th aria-label="Abrir detalhe" />
          </tr>
        </thead>
        <tbody>
          {templates.length === 0 ? (
            <tr>
              <td colSpan={colSpan} style={{ padding: 24, textAlign: "center", color: "#94A3B8", fontSize: 13 }}>
                Nenhum modelo para este filtro.
              </td>
            </tr>
          ) : appearance === "B" ? (
            GROUPS.map((group) => {
              const items = templates.filter(group.match);
              if (items.length === 0) return null;
              return (
                <GroupRows key={group.label} label={group.label} color={group.color} bg={group.bg} count={items.length} colSpan={colSpan}>
                  {rows(items)}
                </GroupRows>
              );
            })
          ) : (
            rows(templates)
          )}
        </tbody>
      </table>
      <div className="pat-pager">
        <span className="pat-pager__range">
          {templates.length} de {total} modelos publicados{drafts > 0 ? ` · ${drafts === 1 ? "1 rascunho não aparece" : `${drafts} rascunhos não aparecem`}` : ""}
        </span>
      </div>
    </div>
  );
}

function GroupRows({ label, color, bg, count, colSpan, children }: { readonly label: string; readonly color: string; readonly bg: string; readonly count: number; readonly colSpan: number; readonly children: ReactNode }) {
  return (
    <>
      <tr>
        <td colSpan={colSpan} style={{ padding: "9px 14px 7px", background: "#fff", borderBottom: "1px solid #E2E8F0", fontSize: 11, fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase", whiteSpace: "nowrap", color }}>
          {label}
          <span style={{ display: "inline-flex", marginLeft: 8, padding: "1px 8px", borderRadius: 99, fontSize: 10.5, letterSpacing: 0, background: bg, color }}>{count}</span>
        </td>
      </tr>
      {children}
    </>
  );
}

function usageChip(uses: readonly WorkOrderChecklistLink[], nextDispatchOf: (line: WorkOrderChecklistLink) => boolean): { readonly text: string; readonly style: CSSProperties } {
  const chip = (bg: string, color: string): CSSProperties => ({ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 10.5, fontWeight: 700, padding: "3px 9px", borderRadius: 99, whiteSpace: "nowrap", lineHeight: 1.3, background: bg, color });
  if (uses.length === 0) return { text: "Não usado", style: chip("#F1F5F9", "#94A3B8") };
  const roles = new Set(uses.map((line) => line.role));
  if (roles.has("collection") && roles.has("delivery")) return { text: "Coleta e entrega", style: chip("#ECFDF5", "#059669") };
  const first = uses[0];
  const phase = first.role ? PHASE_LABELS[first.role] : "etapa não informada";
  if (nextDispatchOf(first)) return { text: `Na ${phase} · próximo envio`, style: chip("#FFFBEB", "#B45309") };
  if (first.role === "delivery") return { text: `Na ${phase}`, style: chip("#F3EEFB", "#7652b7") };
  return { text: `Na ${phase}`, style: chip("#EFF6FF", "#2563EB") };
}

function TemplateRow({ template, colSpan, ...props }: TemplateTableProps & { readonly template: TenantChecklist; readonly colSpan: number }) {
  const navigate = useNavigate();
  const { appearance, openRow, onToggleRow, usesOf, nextDispatchOf } = props;
  const rowId = `${appearance}-${template.id}`;
  const uses = usesOf(template.id);
  const req = templateRequirements(template);
  const usage = usageChip(uses, nextDispatchOf);
  const name = (
    <>
      <span style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>{template.name}</span>
      {appearance === "A" ? <span style={{ fontSize: 11.5, color: "#94A3B8", marginLeft: 8 }}>{TEMPLATE_TYPE_LABELS[template.type]}</span> : null}
    </>
  );
  const fullTitle = `${template.name} · ${TEMPLATE_TYPE_LABELS[template.type]} · ${requirementsSentence(req)}`;
  const cells =
    appearance === "A"
      ? [
          { key: "nome", content: name, title: fullTitle },
          { key: "pede", content: <RequirementIcons req={req} />, title: requirementsSentence(req) },
          { key: "versao", content: `v${template.version}` },
          { key: "nesta", content: <span style={usage.style}>{usage.text}</span>, title: usage.text },
        ]
      : appearance === "B"
        ? [
            { key: "nome", content: name, title: fullTitle },
            { key: "pede", content: <RequirementIcons req={req} />, title: requirementsSentence(req) },
            { key: "campos", content: `${req.fields} · ${req.requiredFields} obrigatórios` },
            { key: "versao", content: `v${template.version}` },
            { key: "nesta", content: <span style={usage.style}>{usage.text}</span>, title: usage.text },
          ]
        : [
            { key: "nome", content: name, title: fullTitle },
            { key: "pede", content: <RequirementIcons req={req} />, title: requirementsSentence(req) },
            { key: "nesta", content: <span style={usage.style}>{usage.text}</span>, title: usage.text },
          ];

  return (
    <DenseExpandableRow
      rowKey={rowId}
      expanded={openRow === rowId}
      colSpan={colSpan}
      onToggle={() => onToggleRow(rowId)}
      cells={cells}
      detail={<TemplateDetail template={template} rowId={rowId} uses={uses} req={req} onOpenTemplate={() => navigate(`/administrator/checklists/${template.id}`)} {...props} />}
    />
  );
}

function TemplateDetail({
  template,
  rowId,
  uses,
  req,
  onOpenTemplate,
  appearance,
  rowError,
  nextDispatchOf,
  dispatched,
  canEdit,
  collectionLine,
  deliveryLine,
  onInclude,
  onSwap,
  onRetire,
}: TemplateTableProps & { readonly template: TenantChecklist; readonly rowId: string; readonly uses: readonly WorkOrderChecklistLink[]; readonly req: TemplateRequirements; readonly onOpenTemplate: () => void }) {
  const usage = uses.length
    ? uses.map((line) => `${line.role ? `na ${PHASE_LABELS[line.role]}` : "sem etapa informada"}${nextDispatchOf(line) ? " (vale no próximo envio)" : ""}`).join(" e ")
    : "não usado nesta OS";
  const origin = uses.length ? (getWorkOrderChecklistSourceLabel(uses[0].source) ?? "—") : "—";
  const comparison = collectionLine !== null && deliveryLine !== null && collectionLine.checklistId === deliveryLine.checklistId && uses.length > 0;
  const inCollection = uses.find((line) => line.role === "collection");
  const inDelivery = uses.find((line) => line.role === "delivery");
  const prefersDelivery = template.type === "towing_delivery";

  // Emenda 2.1 (A2) — numa OS JÁ ENVIADA a coleta não se troca nem se retira: o "Trocar" retiraria a coleta e a nova seria
  // recusada (409 `collection_after_dispatch`), deixando a OS sem coleta para o próximo envio. A entrega segue as regras.
  const collectionLocked = dispatched && collectionLine !== null;
  const actions: ReactNode[] = [];
  if (canEdit) {
    const collectionButton = inCollection || collectionLocked ? null : (
      <button
        key="col"
        type="button"
        className={prefersDelivery ? "pat-btn" : "pat-btn pat-btn--primary"}
        onClick={() => (collectionLine ? onSwap(template, collectionLine) : onInclude(template, "collection", rowId))}
      >
        {collectionLine ? <Repeat size={13} aria-hidden="true" /> : <Plus size={13} aria-hidden="true" />}
        {collectionLine ? "Trocar a coleta por este" : "Usar na coleta"}
      </button>
    );
    const deliveryButton = inDelivery ? null : (
      <button
        key="ent"
        type="button"
        className={prefersDelivery ? "pat-btn pat-btn--primary" : "pat-btn"}
        onClick={() => (deliveryLine ? onSwap(template, deliveryLine) : onInclude(template, "delivery", rowId))}
      >
        {deliveryLine ? <Repeat size={13} aria-hidden="true" /> : <Plus size={13} aria-hidden="true" />}
        {deliveryLine ? "Trocar a entrega por este" : "Usar na entrega"}
      </button>
    );
    for (const button of prefersDelivery ? [deliveryButton, collectionButton] : [collectionButton, deliveryButton]) if (button) actions.push(button);
    for (const line of uses) {
      if (!line.role) continue;
      if (line.role === "collection" && collectionLocked) continue;
      actions.push(
        <button key={`ret-${line.role}`} type="button" className="pat-btn" style={dangerButton} onClick={() => onRetire(line)}>
          <Trash2 size={13} aria-hidden="true" />
          Retirar da {PHASE_LABELS[line.role]}
        </button>,
      );
    }
    if (collectionLocked) {
      actions.push(
        <span key="coleta-travada" data-coleta-travada style={{ fontSize: 12, color: "#64748B", fontWeight: 600 }}>
          {COLLECTION_LOCKED_MESSAGE}
        </span>,
      );
    }
  }
  actions.push(
    <button key="ver" type="button" className="pat-btn" onClick={onOpenTemplate}>
      <Eye size={13} aria-hidden="true" />
      Ver o modelo
    </button>,
  );

  return (
    <div className="pat-ab-detail-content">
      <div className="pat-ab-detail-grid" style={appearance === "C" ? { gridTemplateColumns: "repeat(2, minmax(0, 1fr))" } : undefined}>
        <div className="pat-ab-detail-col">
          <DetailField label="Tipo" value={TEMPLATE_TYPE_LABELS[template.type]} />
          <DetailField label="Versão" value={`v${template.version}${template.publishedAt ? `, publicada em ${fmtDate(template.publishedAt).slice(0, 10)}` : ""}`} />
          <DetailField label="Campos" value={`${req.fields}, dos quais ${req.requiredFields} obrigatórios`} />
        </div>
        <div className="pat-ab-detail-col">
          <DetailField label="O app vai pedir" value={requirementsSentence(req)} />
          {template.description ? <div className="pat-ab-detail-field" style={{ color: "#64748B" }}>{template.description}</div> : null}
        </div>
        <div className="pat-ab-detail-col" style={appearance === "C" ? { gridColumn: "1 / -1", flexDirection: "row", flexWrap: "wrap", gap: "6px 18px" } : undefined}>
          <DetailField label="Nesta OS" value={usage} />
          <DetailField label="Origem" value={origin} />
          {comparison ? <DetailField label="Comparação" value="ligada: o mesmo modelo na coleta e na entrega" /> : null}
        </div>
      </div>
      {rowError && rowError.id === rowId ? (
        <div role="alert" style={errorStrip}>
          {rowError.message}
        </div>
      ) : null}
      <div className="pat-ab-detail-actions">{actions}</div>
    </div>
  );
}

/** Emenda 2.1 (A2) — a frase da coleta travada na OS já enviada. */
export const COLLECTION_LOCKED_MESSAGE = "Esta OS já foi enviada: a vistoria de coleta não pode mais ser trocada.";

const dangerButton: CSSProperties = { color: "#B91C1C", borderColor: "#FECACA" };
const errorStrip: CSSProperties = { padding: "10px 13px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 9, fontSize: 12.5, color: "#B91C1C" };

function DetailField({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="pat-ab-detail-field">
      <span className="pat-ab-detail-label">{label}:</span> <span className="pat-ab-detail-val">{value}</span>
    </div>
  );
}

/** As vistorias da OS cujo modelo não está na lista: só leitura, com o que a OS e a linha do tempo dizem. */
function LinkedLinesTable({ lines }: { readonly lines: readonly LineView[] }) {
  return (
    <div style={{ borderTop: "1px solid #F1F5F9" }}>
      <div style={{ padding: "12px 18px 6px", fontSize: 11, fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase", color: "#64748B" }}>Vistorias ligadas a esta OS</div>
      <table className="pat-ab-table">
        <colgroup>
          <col style={{ width: "26%" }} />
          <col style={{ width: "34%" }} />
          <col style={{ width: "20%" }} />
          <col style={{ width: "20%" }} />
        </colgroup>
        <thead>
          <tr>
            <th>ETAPA</th>
            <th>MODELO</th>
            <th>ORIGEM</th>
            <th>INCLUÍDA EM</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((view, index) => (
            <tr key={`${view.line.checklistId}:${view.line.role ?? "sem-etapa"}:${index}`} style={{ height: 40, borderBottom: "1px solid #F1F5F9" }}>
              <td style={linkedCell}>{view.line.role ? getWorkOrderChecklistRoleLabel(view.line.role) : "Etapa não informada"}</td>
              <td style={linkedCell} title={view.nameHint ? `${view.name} (${view.nameHint})` : view.name}>
                <span style={{ fontWeight: 700, color: "#0F172A" }}>{view.name}</span>
                {view.nameHint ? <span style={{ color: "#94A3B8", marginLeft: 6 }}>{view.nameHint}</span> : null}
              </td>
              <td style={linkedCell}>{getWorkOrderChecklistSourceLabel(view.line.source) ?? "—"}</td>
              <td style={linkedCell}>{view.inclusion ? fmtDate(view.inclusion.createdAt) : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const linkedCell: CSSProperties = { padding: "0 12px", fontSize: 12, color: "#475569", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };

function ChecklistDialog({
  dialog,
  reason,
  reasonError,
  onReason,
  onClose,
  onConfirm,
}: {
  readonly dialog: DialogState;
  readonly reason: string;
  readonly reasonError: string | null;
  readonly onReason: (value: string) => void;
  readonly onClose: () => void;
  readonly onConfirm: () => void;
}) {
  const phase = PHASE_LABELS[dialog.line.role];
  const title = dialog.mode === "retire" ? `Retirar a vistoria de ${phase}` : `Trocar a vistoria de ${phase}`;
  const needsReason = dialog.mode === "retire" || !dialog.retired;
  return (
    <Modal title={title} open onClose={onClose}>
      <div data-dialogo={dialog.mode} style={{ display: "flex", flexDirection: "column", gap: 12, padding: "0 20px 18px" }}>
        {dialog.mode === "retire" ? (
          <p style={dialogText}>
            <strong>{dialog.name}</strong> sai desta OS{dialog.line.role === "collection" ? " e o guincheiro não fará vistoria na retirada" : ""}. Se esta vistoria já chegou ao app, o
            sistema não deixa retirar.
          </p>
        ) : dialog.retired ? (
          <p style={dialogText}>
            <strong>{dialog.oldName}</strong> já saiu desta OS, mas <strong>{dialog.newTemplate.name}</strong> não entrou: a vaga da {phase} está sem vistoria. Tente
            de novo para incluir o modelo escolhido.
          </p>
        ) : (
          <p style={dialogText}>
            Sai <strong>{dialog.oldName}</strong> e entra <strong>{dialog.newTemplate.name}</strong>. Informe por que a vistoria anterior foi retirada. Se ela já chegou ao
            app, o sistema não deixa trocar.
          </p>
        )}
        {needsReason ? (
          <label className="ui-field" style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 700, color: "#334155" }}>
            Motivo *
            <textarea
              className="ui-input"
              data-motivo
              maxLength={REMOVAL_REASON_MAX}
              value={reason}
              onChange={(event) => onReason(event.target.value)}
              placeholder="Ex.: o cliente pediu outro modelo"
              style={{ minHeight: 72, resize: "vertical" }}
            />
            <small style={{ fontWeight: 500, color: "#64748B", fontSize: 11.5 }}>Fica no histórico da OS. Até 500 caracteres.</small>
          </label>
        ) : null}
        {reasonError ? (
          <div role="alert" style={errorStrip}>
            {reasonError}
          </div>
        ) : null}
        {dialog.error ? (
          <div role="alert" data-erro-dialogo style={errorStrip}>
            <AlertTriangle size={13} aria-hidden="true" style={{ verticalAlign: -2, marginRight: 6 }} />
            {dialog.error}
          </div>
        ) : null}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button type="button" className="pat-btn" onClick={onClose} disabled={dialog.busy}>
            Voltar
          </button>
          <button type="button" className="pat-btn pat-btn--primary" data-confirmar onClick={onConfirm} disabled={dialog.busy}>
            {dialog.error ? "Tentar novamente" : dialog.mode === "retire" ? "Retirar" : "Trocar"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

const dialogText: CSSProperties = { fontSize: 13, color: "#475569", lineHeight: 1.5, margin: 0 };

function toastStyle(visible: boolean): CSSProperties {
  return visible
    ? { position: "fixed", left: "50%", bottom: 24, transform: "translateX(-50%)", zIndex: 99, background: "#0F172A", color: "#F8FAFC", border: "1px solid #334155", borderRadius: 10, padding: "10px 16px", fontSize: 13, fontWeight: 600, boxShadow: "0 12px 30px rgba(0,0,0,.4)", maxWidth: 640 }
    : { position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" };
}

export default WorkOrderChecklistsPanel;
