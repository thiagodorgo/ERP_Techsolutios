import { AlertTriangle, Inbox, Lock, RefreshCw, Upload, Users, type LucideIcon } from "lucide-react";
import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";

import { Alert, Skeleton } from "../../../../components/ui";
import { usePermissions } from "../../../../providers/PermissionProvider";
import { useScreenAppearance } from "../../../appearance";
import { cloudBillingAccess, type CloudBillingAccess } from "../cloud-billing.access";
import { capitalize, monthLabel } from "../cloud-billing.labels";
import { currentBillingMonth, todayInSaoPaulo } from "../cloud-billing.service";
import {
  buildCloudBillingView,
  clearTarget,
  INITIAL_UI,
  isPeriodOfMonth,
  selectTarget,
  setListMode,
  setSearch,
  toggleRow,
  type CloudBillingUi,
  type CloudBillingView,
} from "../cloud-billing.state";
import type { CloudBillingData } from "../cloud-billing.types";
import { useCloudBilling, useInitialBillingMonth } from "../useCloudBilling";
import { useCloudBillingActions } from "../useCloudBillingActions";
import { CloudBillingViewA } from "../views/CloudBillingViewA";
import { CloudBillingViewB } from "../views/CloudBillingViewB";
import { MonthSelect, type CloudBillingViewProps } from "../views/cloudBilling.shared";
import { CloudBillingDialogs, type DialogAction } from "../components/CloudBillingDialogs";

// B-ASS-10b (T5) — a tela de custo e margem da plataforma (`/platform/cloud-billing`), com as 3 aparências aprovadas pelo
// dono em 14/11 ("aprovo as telas de custos"; referência `screen-refs/platform-cloud-billing-3opcoes.reference.html`).
// Esta página é o CONTÊINER (molde: `PatiosPage.tsx` e `FinanceiroPage.tsx`): lê uma vez (`useCloudBilling`), guarda o
// estado da tela (mês, `modo/alvo/aberta/busca`), monta o MODELO ÚNICO (`buildCloudBillingView`) e o entrega à aparência
// escolhida pelo usuário (`useScreenAppearance("platform-cloud-billing")`) — trocar de aparência não repete leitura.
// É a ÚNICA porta do módulo para fora (T44: só o `App.tsx` a monta). Estados §7: carregando, acesso não permitido, erro
// (nenhum valor; os 3 erros 500 do contrato), vazio e dados desatualizados.

/** As aparências prontas; a que ainda não existe cai na A (o Dev-B acrescenta B e C nas F5 e F6). */
const VIEWS: Readonly<Record<string, ComponentType<CloudBillingViewProps>>> = { A: CloudBillingViewA, B: CloudBillingViewB };

export type CloudBillingScreenProps = {
  readonly data: CloudBillingData;
  readonly loading: boolean;
  readonly month: string;
  readonly model: CloudBillingView;
  readonly access: CloudBillingAccess;
  readonly appearance: string;
  readonly handlers: Omit<CloudBillingViewProps, "model" | "access">;
  readonly onRetry: () => void;
};

function StateHeader() {
  return (
    <div className="pat-page-header">
      <div className="pat-page-header__lead">
        <div className="pat-page-header__kicker">Plataforma · custo e margem</div>
        <h1 className="pat-page-header__title">Cloud Billing</h1>
        <p className="pat-page-header__subtitle">Custo da nuvem e margem por organização</p>
      </div>
    </div>
  );
}

function StatePanel({ icon: Icon, tone, title, detail, children }: { readonly icon: LucideIcon; readonly tone: "danger" | "info"; readonly title: string; readonly detail: string; readonly children?: ReactNode }) {
  return (
    <section className={`cb-state cb-state--${tone}`} role={tone === "danger" ? "alert" : "status"}>
      <span className="cb-state__icon" aria-hidden="true">
        <Icon size={26} />
      </span>
      <div className="cb-state__title">{title}</div>
      <div className="cb-state__detail">{detail}</div>
      {children}
    </section>
  );
}

function LoadingScreen() {
  return (
    <div className="cb-view" aria-busy="true">
      <StateHeader />
      <div className="cb-loading">
        <Skeleton lines={8} />
      </div>
    </div>
  );
}

/** Os estados que tomam a tela inteira, separados do hook para serem renderizáveis no teste. */
export function PlatformCloudBillingScreen({ data, loading, month, model, access, appearance, handlers, onRetry }: CloudBillingScreenProps) {
  // A1: dado de outro período é tratado como carregando — nunca aparece sob o rótulo do mês selecionado.
  if (loading || !isPeriodOfMonth(data.period, month)) return <LoadingScreen />;
  if (data.forbidden) {
    return (
      <div className="cb-view">
        <StateHeader />
        <StatePanel icon={Lock} tone="danger" title="Acesso não permitido" detail="Seu perfil não tem permissão para ver o custo e a margem da plataforma." />
      </div>
    );
  }
  const retry = (
    <button type="button" className="pat-btn pat-btn--primary" onClick={onRetry}>
      <RefreshCw size={14} aria-hidden="true" />
      Tentar de novo
    </button>
  );
  if (data.failure === "membership_integrity_violation") {
    return (
      <div className="cb-view">
        <StateHeader />
        <StatePanel icon={Users} tone="danger" title={`Não foi possível montar a visão de ${monthLabel(month)}`} detail="Uma organização aparece em dois grupos no mesmo dia. Nenhum número é exibido até o vínculo ser corrigido: a visão falha inteira, para não mostrar margem errada.">
          {retry}
        </StatePanel>
      </div>
    );
  }
  if (data.failure !== null || data.source === "fallback") {
    return (
      <div className="cb-view">
        <StateHeader />
        <StatePanel icon={AlertTriangle} tone="danger" title="Não foi possível carregar o custo e a margem" detail="A plataforma vai tentar de novo. Nenhum valor é exibido enquanto não houver resposta confirmada.">
          {retry}
        </StatePanel>
      </div>
    );
  }
  if (data.source === "mock" || model.empty) {
    return (
      <div className="cb-view">
        <div className="pat-page-header">
          <div className="pat-page-header__lead">
            <div className="pat-page-header__kicker">Plataforma · custo e margem</div>
            <h1 className="pat-page-header__title">Cloud Billing</h1>
            <p className="pat-page-header__subtitle">Custo da nuvem e margem por organização · {monthLabel(month)}</p>
          </div>
          <div className="pat-page-header__actions">
            <MonthSelect model={model} onMonth={handlers.onMonth} />
          </div>
        </div>
        <StatePanel icon={Inbox} tone="info" title={`Nenhum custo nem assinatura em ${monthLabel(month)}`} detail="Escolha outro mês no seletor acima ou importe o arquivo de custo deste mês.">
          {access.importCosts ? (
            <button type="button" className="pat-btn pat-btn--primary" onClick={() => handlers.onAction({ kind: "import" })}>
              <Upload size={14} aria-hidden="true" />
              Importar arquivo de custo
            </button>
          ) : null}
        </StatePanel>
      </div>
    );
  }
  const View = VIEWS[appearance] ?? CloudBillingViewA;
  return (
    <>
      {data.stale ? (
        <div className="cb-stale">
          <Alert title="Dados desatualizados" tone="warning">
            A atualização falhou. Os últimos dados confirmados de {capitalize(monthLabel(month))} continuam na tela enquanto a plataforma tenta de novo.
          </Alert>
        </div>
      ) : null}
      <View model={model} access={access} {...handlers} />
    </>
  );
}

function CloudBillingContent({ initialMonth }: { readonly initialMonth: string }) {
  const navigate = useNavigate();
  const { permissions } = usePermissions();
  const access = useMemo(() => cloudBillingAccess(permissions), [permissions]);
  const { appearance } = useScreenAppearance("platform-cloud-billing");
  const [month, setMonth] = useState(initialMonth);
  const [ui, setUi] = useState<CloudBillingUi>(INITIAL_UI);
  const [dialog, setDialog] = useState<DialogAction | null>(null);
  const reading = useCloudBilling(month, { readImports: access.readImports });
  const actions = useCloudBillingActions(access);
  const currentMonth = currentBillingMonth();
  const today = todayInSaoPaulo();
  const model = useMemo(
    () => buildCloudBillingView({ data: reading.data, series: reading.series, groupDetails: reading.groupDetails, composition: reading.composition, ui, currentMonth, today }),
    [reading.data, reading.series, reading.groupDetails, reading.composition, ui, currentMonth, today],
  );

  // A linha da organização que abre lê a composição por serviço do rateio do mês (moeda original; B2).
  const runId = reading.data.tenant?.cost.runId ?? null;
  const openTenant = ui.aberta?.startsWith("t:") ? ui.aberta.slice(2) : null;
  const { loadComposition, composition } = reading;
  useEffect(() => {
    if (openTenant && runId && model.originalKnown && !composition[openTenant]) void loadComposition(runId, openTenant);
  }, [openTenant, runId, model.originalKnown, composition, loadComposition]);

  const changeMonth = (next: string) => {
    setMonth(next);
    setUi((current) => ({ ...current, aberta: null }));
  };
  const handlers: Omit<CloudBillingViewProps, "model" | "access"> = {
    onTarget: (key) => {
      if (key.startsWith("mes:")) changeMonth(key.slice(4));
      else setUi((current) => selectTarget(current, key, model.parcels));
    },
    onToggleRow: (rowId) => setUi((current) => toggleRow(current, rowId)),
    onClearTarget: () => setUi((current) => clearTarget(current)),
    onMode: (modo) => setUi((current) => setListMode(current, modo)),
    onSearch: (text) => setUi((current) => setSearch(current, text)),
    onMonth: changeMonth,
    onAction: (action) => {
      if (action.kind === "open-org") navigate(`/platform/tenants/${encodeURIComponent(action.tenantId)}`);
      else if (action.kind === "retry") void reading.reloadAll();
      else setDialog(action);
    },
    onRetrySeries: () => void reading.retrySeries(model.seriesFailed),
  };

  // Depois de uma escrita com sucesso, a tela relê o mês (em segundo plano: o dado confirmado fica até a resposta).
  const rereadAfterWrite = () => {
    void reading.refresh(true);
    void reading.reloadGroupDetails();
    void reading.retrySeries();
  };

  return (
    <>
      <PlatformCloudBillingScreen
        data={reading.data}
        loading={reading.loading}
        month={month}
        model={model}
        access={access}
        appearance={appearance}
        handlers={handlers}
        onRetry={() => void reading.reloadAll()}
      />
      <CloudBillingDialogs dialog={dialog} model={model} access={access} actions={actions} onClose={() => setDialog(null)} onDone={rereadAfterWrite} onMonth={changeMonth} />
    </>
  );
}

export function PlatformCloudBillingPage() {
  const initialMonth = useInitialBillingMonth();
  if (initialMonth === null) return <LoadingScreen />;
  return <CloudBillingContent initialMonth={initialMonth} />;
}

export default PlatformCloudBillingPage;
