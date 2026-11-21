import { Bell, KeyRound, Loader2, Plug, Power, Settings2, X } from "lucide-react";
import { useState, type ReactNode } from "react";

import { StatusPill } from "../../../../components/patterns";
import { errorText } from "../billing-ops.errors";
import { environmentLabel, fiscalFieldLabel, formatDateTime, providerKindLabel } from "../billing-ops.labels";
import type { ChannelView } from "../billing-ops.state";
import type { Provider } from "../billing-ops.types";
import type { BillingOpsActions } from "../useBillingOpsActions";
import type { DialogAction } from "./BillingOpsDialogs";

// B-ASS-10c-OPERACAO — o painel do canal (§6.3 do plano; maquete `painelCanal`/`cartao`): um cartão por tipo (pagamento e
// nota fiscal) com o provedor, o ambiente, a credencial MASCARADA (só o final e a data), o aviso automático, os dados
// fiscais que faltam, o último teste e ligar/desligar. "Testar conexão" e "Registrar" rodam direto (uma requisição cada,
// botão travado enquanto roda) e o resultado aparece no cartão; depois, a tela relê o canal (R-RELE).

type Props = {
  readonly channel: ChannelView;
  readonly actions: BillingOpsActions;
  readonly onDialog: (dialog: DialogAction) => void;
  readonly onClose: () => void;
  readonly onReread: () => void;
  /** Uma recusa disse que o servidor está com a cobrança desligada (`channel_disabled`). */
  readonly onServerOff: () => void;
};

type CardNote = { readonly running: "test" | "webhook" | null; readonly message: string | null; readonly tone: "ok" | "danger" };
const IDLE: CardNote = { running: null, message: null, tone: "ok" };

function Line({ label, children, action }: { readonly label: string; readonly children: ReactNode; readonly action?: ReactNode }) {
  return (
    <div className="pat-ab-detail-field" style={{ display: "grid", gridTemplateColumns: "120px minmax(0, 1fr) auto", alignItems: "center", gap: 10, padding: "8px 0", borderTop: "1px solid #f1f5f9" }}>
      <span className="pat-ab-detail-label">{label}</span>
      <span className="pat-ab-detail-val" style={{ minWidth: 0 }}>
        {children}
      </span>
      <span>{action}</span>
    </div>
  );
}

function ProviderCard({ kind, provider, actions, onDialog, onReread, onServerOff }: { readonly kind: "payment" | "invoice"; readonly provider: Provider | null } & Omit<Props, "channel" | "onClose">) {
  const [note, setNote] = useState<CardNote>(IDLE);
  if (!provider) {
    return (
      <div className="cb-card" data-cartao={kind}>
        <div className="cb-card__head">
          <div>
            <div className="cb-card__hint">{providerKindLabel(kind)}</div>
            <h3 className="cb-card__title">Nenhum provedor disponível</h3>
          </div>
        </div>
      </div>
    );
  }
  const token = provider.credentials.find((item) => item.kind === "api_token");
  const certificate = provider.credentials.find((item) => item.kind === "certificate");
  const webhook = provider.credentials.find((item) => item.kind === "webhook_secret");
  const run = async (which: "test" | "webhook") => {
    if (note.running) return;
    setNote({ running: which, message: null, tone: "ok" });
    if (which === "test") {
      const result = await actions.testConnection(provider.provider);
      if (!result.ok && result.reason === "channel_disabled") onServerOff();
      setNote(
        result.ok
          ? result.value.ok
            ? { running: null, message: `Conexão confirmada em ${formatDateTime(result.value.at)}.`, tone: "ok" }
            : { running: null, message: errorText(result.value.code), tone: "danger" }
          : { running: null, message: errorText(result.reason), tone: "danger" },
      );
    } else {
      const result = await actions.registerWebhook(provider.provider);
      if (!result.ok && result.reason === "channel_disabled") onServerOff();
      setNote(
        result.ok
          ? { running: null, message: result.value.alreadyRegistered ? "O aviso automático já estava registrado." : `Aviso automático registrado em ${formatDateTime(result.value.registeredAt)}.`, tone: "ok" }
          : { running: null, message: errorText(result.reason), tone: "danger" },
      );
    }
    onReread();
  };
  const testAge = provider.lastTest ? Date.now() - Date.parse(provider.lastTest.at) : null;
  return (
    <div className="cb-card" data-cartao={kind}>
      <div className="cb-card__head">
        <div>
          <div className="cb-card__hint">{providerKindLabel(kind)}</div>
          <h3 className="cb-card__title">{provider.label}</h3>
        </div>
        {provider.enabled ? <StatusPill sm label="Ligado" bg="#ECFDF5" fg="#047857" dot="#047857" /> : <StatusPill sm label="Desligado" bg="#F1F5F9" fg="#475569" dot="#475569" />}
      </div>
      <Line
        label="Ambiente"
        action={
          <button type="button" className="pat-btn" onClick={() => onDialog({ kind: "provider-settings", provider })}>
            <Settings2 size={14} aria-hidden="true" />
            Ambiente e dados fiscais
          </button>
        }
      >
        {environmentLabel(provider.environment)}
      </Line>
      <Line
        label="Credencial"
        action={
          <button type="button" className="pat-btn" onClick={() => onDialog({ kind: "credential", provider, webhook: false })}>
            <KeyRound size={14} aria-hidden="true" />
            Trocar credencial
          </button>
        }
      >
        {token ? `Chave de acesso final ••••${token.last4}, cadastrada em ${formatDateTime(token.createdAt)}` : "Nenhuma chave cadastrada"}
        {provider.credentialsReadable === false ? <span style={{ display: "block", color: "#b91c1c" }}>A chave cadastrada não pôde ser lida.</span> : null}
        {certificate ? <span style={{ display: "block" }}>Certificado digital A1 cadastrado em {formatDateTime(certificate.createdAt)}</span> : null}
      </Line>
      <Line
        label="Aviso automático"
        action={
          <span style={{ display: "inline-flex", gap: 6 }}>
            <button type="button" className="pat-btn" onClick={() => void run("webhook")} disabled={note.running !== null}>
              <Bell size={14} aria-hidden="true" />
              {webhook ? "Registrar de novo" : "Registrar"}
            </button>
            <button type="button" className="pat-btn" onClick={() => onDialog({ kind: "credential", provider, webhook: true })}>
              Colar segredo
            </button>
          </span>
        }
      >
        {webhook ? `Registrado em ${formatDateTime(webhook.createdAt)} (${provider.environment === "sandbox" ? "sandbox" : "produção"})` : "Não registrado"}
      </Line>
      <Line label="Dados fiscais">
        {provider.missing.length ? <span style={{ color: "#b45309" }}>Faltam: {provider.missing.map((field) => fiscalFieldLabel(field).toLocaleLowerCase("pt-BR")).join(", ")}</span> : kind === "invoice" ? "Completos" : "Não se aplicam"}
        {provider.pendingHomologationCount ? (
          <span style={{ display: "block", color: "#b45309" }}>
            Homologação pendente: {provider.pendingHomologationCount} {provider.pendingHomologationCount === 1 ? "item a conferir" : "itens a conferir"} na primeira operação real
          </span>
        ) : null}
      </Line>
      <Line
        label="Último teste"
        action={
          <button type="button" className="pat-btn" onClick={() => void run("test")} disabled={note.running !== null}>
            {note.running === "test" ? <Loader2 size={14} aria-hidden="true" /> : <Plug size={14} aria-hidden="true" />}
            Testar conexão
          </button>
        }
      >
        {note.running === "test"
          ? "Testando…"
          : !provider.lastTest
            ? "Nunca testado"
            : provider.lastTest.ok
              ? (
                  <>
                    Conexão confirmada em {formatDateTime(provider.lastTest.at)}
                    {testAge !== null && testAge > 30 * 60 * 1000 ? <span style={{ color: "#b45309" }}> · mais de 30 minutos atrás</span> : null}
                  </>
                )
              : <span style={{ color: "#b91c1c" }}>O último teste não passou ({formatDateTime(provider.lastTest.at)})</span>}
        {note.message ? (
          <span style={{ display: "block", color: note.tone === "ok" ? "#047857" : "#b91c1c" }} role="status">
            {note.message}
          </span>
        ) : null}
      </Line>
      <div className="pat-ab-detail-actions" style={{ marginTop: 10 }}>
        {provider.enabled ? (
          <>
            <span className="pat-ab-detail-note">Ligado: {kind === "payment" ? "as cobranças saem para o provedor." : "as notas saem para o provedor."}</span>
            <button type="button" className="pat-btn" style={{ color: "#b91c1c" }} onClick={() => onDialog({ kind: "disable", provider })}>
              <Power size={14} aria-hidden="true" />
              Desligar
            </button>
          </>
        ) : (
          <>
            <span className="pat-ab-detail-note">Desligado: nada sai para o provedor.</span>
            <button type="button" className="pat-btn pat-btn--primary" onClick={() => onDialog({ kind: "enable", provider })}>
              <Power size={14} aria-hidden="true" />
              Ligar…
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export function ProviderPanel({ channel, actions, onDialog, onClose, onReread, onServerOff }: Props) {
  return (
    <section className="cb-panel" aria-label="Canal de cobrança" data-painel-canal="" style={{ marginBottom: 16 }}>
      <div className="cb-panel__toolbar">
        <div style={{ minWidth: 0 }}>
          <h2 className="cb-card__title" style={{ margin: 0 }}>
            Canal de cobrança
          </h2>
          <p className="cb-card__hint" style={{ margin: "2px 0 0" }}>
            {channel.state === "forbidden"
              ? "Sem permissão para ver os provedores. O resto da tela segue normal."
              : channel.state === "failed"
                ? "Não foi possível ler o canal agora. A tela tenta de novo na próxima atualização."
                : "Um provedor por tipo. Ligar é um ato do dono: a tela confere o texto digitado, e o servidor confere teste recente, aviso automático registrado e dados fiscais antes de ligar. Depois de toda mudança a tela relê o canal."}
          </p>
        </div>
        <button type="button" className="pat-btn" onClick={onClose} style={{ marginLeft: "auto" }}>
          <X size={14} aria-hidden="true" />
          Fechar
        </button>
      </div>
      {channel.state === "ok" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 14, padding: 16 }}>
          <ProviderCard kind="payment" provider={channel.payment} actions={actions} onDialog={onDialog} onReread={onReread} onServerOff={onServerOff} />
          <ProviderCard kind="invoice" provider={channel.invoice} actions={actions} onDialog={onDialog} onReread={onReread} onServerOff={onServerOff} />
        </div>
      ) : channel.state === "loading" ? (
        <div style={{ padding: 16 }} aria-busy="true">
          Carregando o canal…
        </div>
      ) : null}
    </section>
  );
}
