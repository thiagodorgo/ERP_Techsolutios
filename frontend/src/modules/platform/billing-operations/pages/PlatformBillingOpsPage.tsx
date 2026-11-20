import { AlertTriangle, Lock, RefreshCw, type LucideIcon } from "lucide-react";
import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { Alert, Skeleton } from "../../../../components/ui";
import { usePermissions } from "../../../../providers/PermissionProvider";
import { useScreenAppearance } from "../../../appearance";
import { billingOpsAccess, type BillingOpsAccess } from "../billing-ops.access";
import { buildBillingOpsView, clearTarget, INITIAL_UI, selectTarget, setSearch, toggleRow, type BillingOpsUi, type BillingOpsView, type Row } from "../billing-ops.state";
import { currentMonthInSaoPaulo, shiftMonth, todayInSaoPaulo } from "../billing-ops.service";
import type { BillingOpsData } from "../billing-ops.types";
import { useBillingOps, type DetailReading } from "../useBillingOps";
import { useBillingOpsActions } from "../useBillingOpsActions";
import { BillingOpsDialogs, type DialogAction } from "../components/BillingOpsDialogs";
import { ProviderPanel } from "../components/ProviderPanel";
import { BillingOpsViewA } from "../views/BillingOpsViewA";
import { BillingOpsViewB } from "../views/BillingOpsViewB";
import { BillingOpsViewC } from "../views/BillingOpsViewC";
import { readAtLabel, type BillingOpsViewProps } from "../views/billingOps.shared";

// B-ASS-10c-OPERACAO — a tela de operação da cobrança da plataforma (`/platform/billing`), com as 3 aparências aprovadas
// pelo dono em 20/11 (maquete `cob-op-3opcoes.reference.html`, "3 completo"). Esta página é o CONTÊINER (molde:
// `PlatformCloudBillingPage.tsx`): lê (`useBillingOps`), guarda o estado da tela (mês, alvo, linha aberta, busca, canal),
// monta o MODELO ÚNICO (`buildBillingOpsView`) e o entrega à aparência escolhida pelo usuário
// (`useScreenAppearance("platform-billing")`) — trocar de aparência não repete leitura. É a ÚNICA porta do módulo para fora
// (só o `App.tsx` a monta). Estados §7: carregando, acesso não permitido, erro, vazio e dados desatualizados.

const VIEWS: Readonly<Record<string, ComponentType<BillingOpsViewProps>>> = { A: BillingOpsViewA, B: BillingOpsViewB, C: BillingOpsViewC };

function StateHeader() {
  return (
    <div className="pat-page-header">
      <div className="pat-page-header__lead">
        <div className="pat-page-header__kicker">Plataforma · cobrança das organizações</div>
        <h1 className="pat-page-header__title">Cobrança</h1>
        <p className="pat-page-header__subtitle">Demonstrativos, cobranças, notas e canal das organizações</p>
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

export function LoadingScreen() {
  return (
    <div className="cb-view" aria-busy="true">
      <StateHeader />
      <div className="cb-loading">
        <Skeleton lines={8} />
      </div>
    </div>
  );
}

export type BillingOpsScreenProps = {
  readonly data: BillingOpsData;
  readonly model: BillingOpsView;
  readonly access: BillingOpsAccess;
  readonly appearance: string;
  readonly details: Readonly<Record<string, DetailReading>>;
  readonly channelPanel: ReactNode;
  readonly handlers: Omit<BillingOpsViewProps, "model" | "access" | "details" | "channelPanel">;
};

/** Os estados que tomam a tela inteira, separados do hook para serem renderizáveis no teste. */
export function PlatformBillingOpsScreen({ data, model, access, appearance, details, channelPanel, handlers }: BillingOpsScreenProps) {
  if (!access.read || data.listState === "forbidden") {
    return (
      <div className="cb-view">
        <StateHeader />
        <StatePanel icon={Lock} tone="danger" title="Acesso não permitido" detail="Seu perfil não tem permissão para ver a cobrança das organizações." />
      </div>
    );
  }
  if (data.listState === "loading") return <LoadingScreen />;
  if (data.listState === "failed") {
    return (
      <div className="cb-view">
        <StateHeader />
        <StatePanel icon={AlertTriangle} tone="danger" title="Não foi possível carregar a cobrança" detail="A lista de organizações não respondeu. Nenhum número é exibido enquanto não houver resposta confirmada.">
          <button type="button" className="pat-btn pat-btn--primary" onClick={handlers.onRefresh}>
            <RefreshCw size={14} aria-hidden="true" />
            Tentar de novo
          </button>
        </StatePanel>
      </div>
    );
  }
  const View = VIEWS[appearance] ?? BillingOpsViewA;
  return (
    <>
      {data.stale ? (
        <div className="cb-stale">
          <Alert title="Dados desatualizados" tone="warning">
            Não foi possível reler a situação. Os números abaixo são da leitura das {readAtLabel(data.readAt)}; nada foi alterado.{" "}
            <button type="button" className="pat-btn" onClick={handlers.onRefresh}>
              <RefreshCw size={13} aria-hidden="true" />
              Tentar de novo
            </button>
          </Alert>
        </div>
      ) : null}
      <View model={model} access={access} details={details} channelPanel={channelPanel} {...handlers} />
    </>
  );
}

/** O mês inicial: o do link (`?mes=AAAA-MM`, vindo do Cloud Billing) ou o mês do último fechamento (o anterior ao corrente). */
export function initialMonth(param: string | null, currentMonth: string): string {
  return param && /^\d{4}-(0[1-9]|1[0-2])$/.test(param) && param <= currentMonth ? param : shiftMonth(currentMonth, -1);
}

function BillingOpsContent() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { permissions } = usePermissions();
  const access = useMemo(() => billingOpsAccess(permissions), [permissions]);
  const { appearance } = useScreenAppearance("platform-billing");
  const currentMonth = currentMonthInSaoPaulo();
  const today = todayInSaoPaulo();
  const [month, setMonth] = useState(() => initialMonth(params.get("mes"), currentMonth));
  const [ui, setUi] = useState<BillingOpsUi>(() => {
    const org = params.get("org");
    return org ? { ...INITIAL_UI, alvo: `org:${org}` } : INITIAL_UI;
  });
  const [serverOff, setServerOff] = useState<boolean | null>(null);
  const [dialog, setDialog] = useState<DialogAction | null>(null);
  const reading = useBillingOps(access);
  const actions = useBillingOpsActions(access);
  const model = useMemo(() => buildBillingOpsView({ data: reading.data, month, ui, today, currentMonth, serverOff }), [reading.data, month, ui, today, currentMonth, serverOff]);

  // A linha que abre lê o detalhe e as cobranças do demonstrativo (uma vez; depois de uma escrita, de novo).
  const openRow = model.rows.find((row) => row.key === ui.aberta) ?? null;
  const { loadDetail, details } = reading;
  useEffect(() => {
    if (openRow && !details[openRow.statement.id]) void loadDetail(openRow.org.id, openRow.statement.id);
  }, [openRow, details, loadDetail]);

  const afterStatementWrite = (row: Row) => {
    void reading.rereadOrganization(row.org.id);
    void loadDetail(row.org.id, row.statement.id);
  };

  const handlers: BillingOpsScreenProps["handlers"] = {
    onTarget: (key) => {
      if (key.startsWith("mes:")) setMonth(key.slice(4));
      else setUi((current) => selectTarget(current, key));
    },
    onToggleRow: (key) => setUi((current) => toggleRow(current, key)),
    onClearTarget: () => setUi((current) => clearTarget(current)),
    onSearch: (text) => setUi((current) => setSearch(current, text)),
    onMonth: (next) => {
      setMonth(next);
      setUi((current) => ({ ...current, aberta: null }));
    },
    onRefresh: () => void reading.reload(),
    onRetryDetail: (row) => void loadDetail(row.org.id, row.statement.id),
    onDialog: setDialog,
    onOpenOrg: (orgId) => navigate(`/platform/tenants/${encodeURIComponent(orgId)}`),
  };

  const channelPanel = (
    <ProviderPanel
      channel={model.channel}
      actions={actions}
      onDialog={setDialog}
      onClose={() => setUi((current) => ({ ...current, canal: false }))}
      onReread={() => void reading.rereadProviders()}
      onServerOff={() => setServerOff(true)}
    />
  );

  const dialogKey = dialog ? `${dialog.kind}:${"row" in dialog ? dialog.row.key : dialog.provider.provider}` : "nenhuma";
  return (
    <>
      <PlatformBillingOpsScreen data={reading.data} model={model} access={access} appearance={appearance} details={details} channelPanel={channelPanel} handlers={handlers} />
      <BillingOpsDialogs
        key={dialogKey}
        dialog={dialog}
        actions={actions}
        today={today}
        channelOff={model.channel.state === "ok" ? !model.channel.on : null}
        invoiceOff={model.channel.state === "ok" ? model.channel.invoice?.enabled !== true : null}
        serverOff={serverOff}
        onClose={() => setDialog(null)}
        onStatementDone={afterStatementWrite}
        onProviderDone={() => void reading.rereadProviders()}
        onSeeChannel={() => {
          setDialog(null);
          setUi((current) => ({ ...current, canal: true }));
        }}
        onOpen={setDialog}
      />
    </>
  );
}

export function PlatformBillingOpsPage() {
  return <BillingOpsContent />;
}

export default PlatformBillingOpsPage;
