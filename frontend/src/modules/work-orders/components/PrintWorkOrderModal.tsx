import type { CSSProperties } from "react";
import { useEffect, useState } from "react";

import { Button, Checkbox, Modal } from "../../../components/ui";
import { formatMoney as formatQuoteMoney, formatServiceQuoteDate, getServiceQuoteStatusLabel } from "../../registry/service-quotes/service-quotes.adapter";
import { listServiceQuoteItems, listServiceQuotesFromApi } from "../../registry/service-quotes/service-quotes.service";
import type { ServiceQuoteLineList, ServiceQuoteRow } from "../../registry/service-quotes/service-quotes.types";
import { formatBytes, listAttachments } from "../attachments.service";
import type { WorkOrderAttachment } from "../attachments.types";
import { listComments } from "../comments.service";
import type { WorkOrderComment } from "../comments.types";
import { formatMoney, listWorkOrderFinancials } from "../financials.service";
import type { WorkOrderFinancialList } from "../financials.types";
import { canAccessTab, visibleTabs, type WorkOrderTabSlug } from "../tabs.config";
import { formatWorkOrderDate, getWorkOrderPriorityLabel, getWorkOrderStatusLabel } from "../work-orders.adapter";
import type { WorkOrderDetail, WorkOrdersApiContext } from "../work-orders.types";

// Ω3F-6b — Imprimir a OS. 100% client-side: não existe rota/endpoint de impressão (nada de PDF no
// backend). O gestor escolhe as SEÇÕES e o navegador imprime (window.print()).
//
// Honestidade dos dados (regra do bloco: NÃO inventar): as seções oferecidas são as ABAS VISÍVEIS do hub
// (tabs.config — aba não entregue não vira seção) ∩ as que o ator PODE ver (canAccessTab). "Informações
// gerais" sai do detalhe já carregado; as demais são BUSCADAS pelos MESMOS services das abas — nenhum
// dado é fabricado aqui. Seção que falha ao carregar não é oferecida; seção sem linhas imprime vazio
// honesto ("Nenhum item…"), nunca um placeholder inventado.

type PrintSlug = Extract<WorkOrderTabSlug, "informacoes-gerais" | "financeiro" | "orcamento" | "comentarios" | "arquivos">;

const PRINTABLE: readonly PrintSlug[] = ["informacoes-gerais", "financeiro", "orcamento", "comentarios", "arquivos"];

function isPrintable(slug: WorkOrderTabSlug): slug is PrintSlug {
  return (PRINTABLE as readonly WorkOrderTabSlug[]).includes(slug);
}

type Loaded<T> = { readonly status: "loading" } | { readonly status: "ok"; readonly data: T } | { readonly status: "error" };

type QuoteWithLines = { readonly quote: ServiceQuoteRow; readonly lines: ServiceQuoteLineList | null };

// A área imprimível vive dentro do modal, mas some da tela e reaparece só no papel. Os controles do modal
// (`.wo-print-hide`) saem da impressão; o overlay é neutralizado para não pintar fundo/limitar altura.
const PRINT_CSS = `
.wo-print-root { display: none; }
@media print {
  body * { visibility: hidden !important; }
  .wo-print-hide { display: none !important; }
  .wo-print-root, .wo-print-root * { visibility: visible !important; }
  .wo-print-root { display: block !important; position: absolute !important; left: 0; top: 0; width: 100%; color: #000; }
  .ui-overlay { position: static !important; background: none !important; display: block !important; padding: 0 !important; }
  .ui-modal { position: static !important; overflow: visible !important; max-height: none !important; width: auto !important; border: none !important; box-shadow: none !important; background: none !important; }
  .wo-print-section { page-break-inside: avoid; }
}
`;

const introStyle: CSSProperties = { fontSize: 13, color: "#475569", marginBottom: 14 };
const legendStyle: CSSProperties = { fontSize: 12.5, fontWeight: 700, color: "#334155", marginBottom: 8 };
const rowStyle: CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 };
const hintStyle: CSSProperties = { fontSize: 11.5, color: "#94A3B8" };
const footerStyle: CSSProperties = { display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 };
const printTh: CSSProperties = { fontSize: 10, textAlign: "left", padding: "4px 6px", borderBottom: "1px solid #999", textTransform: "uppercase" };
const printTd: CSSProperties = { fontSize: 11, padding: "4px 6px", borderBottom: "1px solid #DDD" };

export function PrintWorkOrderModal({
  workOrder,
  context,
  permissions,
  onClose,
}: {
  readonly workOrder: WorkOrderDetail;
  readonly context: WorkOrdersApiContext;
  readonly permissions: readonly string[];
  readonly onClose: () => void;
}) {
  // Seções candidatas: aba visível + printável + permitida ao ator.
  const sections = visibleTabs().filter((tab) => isPrintable(tab.slug) && canAccessTab(tab, permissions));

  const [selected, setSelected] = useState<Partial<Record<PrintSlug, boolean>>>({ "informacoes-gerais": true });
  const [financials, setFinancials] = useState<Loaded<WorkOrderFinancialList>>({ status: "loading" });
  const [quotes, setQuotes] = useState<Loaded<readonly QuoteWithLines[]>>({ status: "loading" });
  const [comments, setComments] = useState<Loaded<readonly WorkOrderComment[]>>({ status: "loading" });
  const [attachments, setAttachments] = useState<Loaded<readonly WorkOrderAttachment[]>>({ status: "loading" });

  const offers = (slug: PrintSlug) => sections.some((tab) => tab.slug === slug);

  useEffect(() => {
    let alive = true;

    if (offers("financeiro")) {
      void listWorkOrderFinancials(context, workOrder.id)
        .then((data) => alive && setFinancials({ status: "ok", data }))
        .catch(() => alive && setFinancials({ status: "error" }));
    }

    if (offers("orcamento")) {
      void listServiceQuotesFromApi(context, { workOrderId: workOrder.id })
        .then(async (data) =>
          Promise.all(
            data.items.map(async (quote) => {
              try {
                return { quote, lines: await listServiceQuoteItems(context, quote.id) };
              } catch {
                // Uma linha que não carrega não invalida o orçamento: imprime o cabeçalho sem as linhas.
                return { quote, lines: null };
              }
            }),
          ),
        )
        .then((data) => alive && setQuotes({ status: "ok", data }))
        .catch(() => alive && setQuotes({ status: "error" }));
    }

    if (offers("comentarios")) {
      void listComments(context, workOrder.id)
        .then((data) => alive && setComments({ status: "ok", data: data.items }))
        .catch(() => alive && setComments({ status: "error" }));
    }

    if (offers("arquivos")) {
      void listAttachments(context, workOrder.id)
        .then((data) => alive && setAttachments({ status: "ok", data: data.items }))
        .catch(() => alive && setAttachments({ status: "error" }));
    }

    return () => {
      alive = false;
    };
    // Deps de propósito só [context, workOrder.id]: o modal é montado a cada abertura, então as seções
    // oferecidas (permissões do ator) são lidas no mount e não mudam durante a vida dele. Incluir o array
    // `permissions`/`sections` (identidade nova a cada render) recarregaria em loop com o setState abaixo.
  }, [context, workOrder.id]);

  const stateOf = (slug: PrintSlug): Loaded<unknown> => {
    if (slug === "financeiro") return financials;
    if (slug === "orcamento") return quotes;
    if (slug === "comentarios") return comments;
    if (slug === "arquivos") return attachments;
    return { status: "ok", data: workOrder }; // informações gerais já vieram com o detalhe
  };

  const isChecked = (slug: PrintSlug) => selected[slug] === true;
  const toggle = (slug: PrintSlug, value: boolean) => setSelected((prev) => ({ ...prev, [slug]: value }));

  // Só imprime seção pronta: nada de papel com "carregando" ou com seção que falhou.
  const printable = sections.filter((tab) => isPrintable(tab.slug) && isChecked(tab.slug) && stateOf(tab.slug).status === "ok");
  const waiting = sections.some((tab) => isPrintable(tab.slug) && isChecked(tab.slug) && stateOf(tab.slug).status === "loading");

  function handlePrint() {
    if (typeof window !== "undefined" && typeof window.print === "function") window.print();
  }

  const shows = (slug: PrintSlug) => printable.some((tab) => tab.slug === slug);

  return (
    <Modal title="Imprimir ordem de serviço" open onClose={onClose}>
      <style>{PRINT_CSS}</style>

      <div className="wo-print-hide">
        <p style={introStyle}>Escolha as seções que entram na impressão da OS {workOrder.code}.</p>

        <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
          <legend style={legendStyle}>Seções</legend>
          {sections.map((tab) => {
            if (!isPrintable(tab.slug)) return null;
            const state = stateOf(tab.slug);
            return (
              <div key={tab.slug} style={rowStyle}>
                <Checkbox
                  label={tab.label}
                  checked={isChecked(tab.slug)}
                  disabled={state.status !== "ok"}
                  onChange={(event) => toggle(tab.slug as PrintSlug, event.target.checked)}
                />
                {state.status === "loading" ? <span style={hintStyle}>carregando…</span> : null}
                {state.status === "error" ? <span style={hintStyle}>não foi possível carregar</span> : null}
              </div>
            );
          })}
        </fieldset>

        <footer style={footerStyle}>
          <Button type="button" variant="ghost" onClick={onClose}>
            Voltar
          </Button>
          <Button type="button" onClick={handlePrint} disabled={printable.length === 0 || waiting}>
            Imprimir
          </Button>
        </footer>
      </div>

      {/* Área imprimível: invisível na tela, é o que sai no papel. */}
      <div className="wo-print-root">
        <h1 style={{ fontSize: 16, margin: "0 0 2px" }}>{workOrder.code} · {workOrder.title}</h1>
        <div style={{ fontSize: 11, marginBottom: 12 }}>Ordem de serviço · impressa em {formatWorkOrderDate(new Date().toISOString())}</div>

        {shows("informacoes-gerais") ? (
          <section className="wo-print-section" style={{ marginBottom: 14 }}>
            <h2 style={{ fontSize: 12.5, margin: "0 0 6px" }}>Informações gerais</h2>
            <PrintRow label="Situação" value={getWorkOrderStatusLabel(workOrder.status)} />
            <PrintRow label="Prioridade" value={getWorkOrderPriorityLabel(workOrder.priority)} />
            <PrintRow label="Cliente" value={workOrder.customerName ?? "Não informado"} />
            <PrintRow label="Telefone" value={workOrder.customerPhone ?? "Não informado"} />
            <PrintRow label="Endereço" value={[workOrder.serviceAddress, workOrder.serviceCity, workOrder.serviceState, workOrder.serviceZipCode].filter(Boolean).join(", ") || "Não informado"} />
            <PrintRow label="Agendada para" value={formatWorkOrderDate(workOrder.scheduledFor)} />
            <PrintRow label="Aberta em" value={formatWorkOrderDate(workOrder.createdAt)} />
            {workOrder.description ? <PrintRow label="Descrição" value={workOrder.description} /> : null}
          </section>
        ) : null}

        {shows("financeiro") && financials.status === "ok" ? (
          <section className="wo-print-section" style={{ marginBottom: 14 }}>
            <h2 style={{ fontSize: 12.5, margin: "0 0 6px" }}>Financeiro</h2>
            {financials.data.items.length === 0 ? (
              <div style={{ fontSize: 11 }}>Nenhum item financeiro lançado.</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={printTh}>Descrição</th>
                    <th style={{ ...printTh, textAlign: "right" }}>Qtd</th>
                    <th style={{ ...printTh, textAlign: "right" }}>Valor unit.</th>
                    <th style={{ ...printTh, textAlign: "right" }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {financials.data.items.map((item) => (
                    <tr key={item.id}>
                      <td style={printTd}>{item.description}</td>
                      <td style={{ ...printTd, textAlign: "right" }}>{item.quantity}</td>
                      <td style={{ ...printTd, textAlign: "right" }}>{formatMoney(item.unitAmount, item.currency)}</td>
                      <td style={{ ...printTd, textAlign: "right" }}>{formatMoney(item.totalAmount, item.currency)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td style={{ ...printTd, fontWeight: 700 }} colSpan={3}>Total</td>
                    <td style={{ ...printTd, textAlign: "right", fontWeight: 700 }}>{formatMoney(financials.data.totalAmount, financials.data.currency)}</td>
                  </tr>
                </tfoot>
              </table>
            )}
          </section>
        ) : null}

        {shows("orcamento") && quotes.status === "ok" ? (
          <section className="wo-print-section" style={{ marginBottom: 14 }}>
            <h2 style={{ fontSize: 12.5, margin: "0 0 6px" }}>Orçamento</h2>
            {quotes.data.length === 0 ? (
              <div style={{ fontSize: 11 }}>Nenhum orçamento para esta ordem de serviço.</div>
            ) : (
              quotes.data.map(({ quote, lines }) => (
                <div key={quote.id} style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700 }}>
                    {quote.number ?? "Orçamento sem número"} · {getServiceQuoteStatusLabel(quote.status)} · validade {formatServiceQuoteDate(quote.validUntil)}
                  </div>
                  {lines && lines.items.length > 0 ? (
                    <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 3 }}>
                      <tbody>
                        {lines.items.map((line) => (
                          <tr key={line.id}>
                            <td style={printTd}>{line.description}</td>
                            <td style={{ ...printTd, textAlign: "right" }}>{line.quantity}</td>
                            <td style={{ ...printTd, textAlign: "right" }}>{formatQuoteMoney(line.totalAmount, line.currency)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : null}
                  <div style={{ fontSize: 11, textAlign: "right", fontWeight: 700 }}>Total: {formatQuoteMoney(quote.frozenTotal, quote.frozenCurrency)}</div>
                </div>
              ))
            )}
          </section>
        ) : null}

        {shows("comentarios") && comments.status === "ok" ? (
          <section className="wo-print-section" style={{ marginBottom: 14 }}>
            <h2 style={{ fontSize: 12.5, margin: "0 0 6px" }}>Comentários</h2>
            {comments.data.length === 0 ? (
              <div style={{ fontSize: 11 }}>Nenhum comentário registrado.</div>
            ) : (
              comments.data.map((comment) => (
                <div key={comment.id} style={{ marginBottom: 6 }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700 }}>
                    {comment.authorName ?? "Autor não identificado"} · {formatWorkOrderDate(comment.createdAt)}
                  </div>
                  <div style={{ fontSize: 11, whiteSpace: "pre-wrap" }}>{comment.message}</div>
                </div>
              ))
            )}
          </section>
        ) : null}

        {shows("arquivos") && attachments.status === "ok" ? (
          <section className="wo-print-section" style={{ marginBottom: 14 }}>
            <h2 style={{ fontSize: 12.5, margin: "0 0 6px" }}>Arquivos</h2>
            {attachments.data.length === 0 ? (
              <div style={{ fontSize: 11 }}>Nenhum arquivo anexado.</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={printTh}>Arquivo</th>
                    <th style={printTh}>Tamanho</th>
                    <th style={printTh}>Enviado por</th>
                    <th style={printTh}>Data</th>
                  </tr>
                </thead>
                <tbody>
                  {attachments.data.map((file) => (
                    <tr key={file.id}>
                      <td style={printTd}>{file.fileName}</td>
                      <td style={printTd}>{formatBytes(file.sizeBytes)}</td>
                      <td style={printTd}>{file.uploadedByName ?? "Não informado"}</td>
                      <td style={printTd}>{formatWorkOrderDate(file.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        ) : null}
      </div>
    </Modal>
  );
}

function PrintRow({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div style={{ fontSize: 11, display: "flex", gap: 6, padding: "1px 0" }}>
      <span style={{ fontWeight: 700, minWidth: 96 }}>{label}:</span>
      <span>{value}</span>
    </div>
  );
}

export default PrintWorkOrderModal;
