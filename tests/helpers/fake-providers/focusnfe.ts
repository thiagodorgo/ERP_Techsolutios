import type { IncomingMessage } from "node:http";

import { scenarioOf, sendJson, startFakeServer, type FakeServer } from "./shared.js";

type StoredInvoice = {
  readonly id: string;
  readonly ref: string;
  readonly serie: number;
  readonly numero: number;
  queryCount: number;
  status: string;
};

const invoices = new Map<string, StoredInvoice>();
const dpsNumbers = new Set<string>();
let sequence = 1;

export function resetFocusNfeFakeState(): void {
  invoices.clear();
  dpsNumbers.clear();
  sequence = 1;
}

export type FocusNfeWebhookEvent = { readonly ref: string; readonly status: string; readonly id?: string };

/**
 * B-ASS-08 · F4 — o falso Focus NFe EMITE um webhook para a nossa URL, com a autenticidade do Focus: header
 * nomeado por nós (`X-Webhook-Token`) = o segredo registrado (`webhook_secret`). `badSecret` reproduz o ataque.
 */
export async function emitFocusNfeWebhook(
  targetUrl: string,
  event: FocusNfeWebhookEvent,
  options: { secret: string; badSecret?: boolean } = { secret: "" },
): Promise<{ status: number; body: unknown }> {
  const token = options.badSecret ? `${options.secret}-WRONG` : options.secret;
  const response = await fetch(targetUrl, {
    method: "POST",
    headers: { "content-type": "application/json", "X-Webhook-Token": token },
    body: JSON.stringify(event),
  });
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  return { status: response.status, body };
}

function scenario(req: IncomingMessage, fallback: string): string {
  const selected = scenarioOf(req);
  return selected === "ok" ? fallback : selected;
}

export async function startFocusNfeFake(defaultScenario = "ok"): Promise<FakeServer> {
  resetFocusNfeFakeState();
  return startFakeServer(async (req, res, body) => {
    const selected = scenario(req, defaultScenario);
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    const method = req.method ?? "GET";

    if (selected === "rate_limited_429") {
      res.setHeader("Retry-After", "2");
      return sendJson(res, 429, { mensagem: "muitas requisições" });
    }
    if (selected === "validation_422") {
      return sendJson(res, 422, { status: "erro_validacao", mensagem: `credencial rejeitada: ${String(req.headers.authorization ?? "")}` });
    }

    if (method === "POST" && (url.pathname === "/v2/nfsen" || url.pathname === "/v2/nfse")) {
      const ref = url.searchParams.get("ref") ?? "";
      const existing = invoices.get(ref);
      if (existing || selected === "duplicate_ref") {
        return sendJson(res, 422, { status: "erro_validacao", id: existing?.id ?? "nfse_existing", mensagem: "Já existe um DPS com esta referência" });
      }
      const parsed = body ? (JSON.parse(body) as Record<string, unknown>) : {};
      const dpsKey = `${String(parsed.serie_dps)}:${String(parsed.numero_dps)}`;
      if (dpsNumbers.has(dpsKey)) {
        return sendJson(res, 422, { status: "erro_validacao", mensagem: "numero_dps já utilizado na serie_dps" });
      }
      const id = `nfse_${sequence++}`;
      dpsNumbers.add(dpsKey);
      invoices.set(ref, { id, ref, serie: Number(parsed.serie_dps), numero: Number(parsed.numero_dps), queryCount: 0, status: selected === "rejected" ? "erro_autorizacao" : "processando_autorizacao" });
      return sendJson(res, 202, { id, ref, status: "processando_autorizacao" });
    }

    const invoiceMatch = url.pathname.match(/^\/v2\/nfsen\/(.+)$/);
    if (invoiceMatch && method === "GET") {
      const ref = decodeURIComponent(invoiceMatch[1]!);
      const invoice = invoices.get(ref);
      if (!invoice) return sendJson(res, 200, { status: "situacao_desconhecida" });
      invoice.queryCount += 1;
      if (invoice.status === "erro_autorizacao") return sendJson(res, 200, { id: invoice.id, ref, status: invoice.status, erros: [{ mensagem: "rejeição simulada" }] });
      if (invoice.queryCount === 1 && selected !== "authorized") return sendJson(res, 200, { id: invoice.id, ref, status: "processando_autorizacao" });
      return sendJson(res, 200, {
        id: invoice.id,
        ref,
        status: "autorizado",
        numero: "NFSE-1001",
        codigo_verificacao: "VERIFY-1001",
        url_danfse: "https://documentos.invalid/publico/nfse-1001.pdf",
        url_xml: "https://documentos.invalid/publico/nfse-1001.xml",
      });
    }
    if (invoiceMatch && method === "DELETE") {
      const ref = decodeURIComponent(invoiceMatch[1]!);
      if (selected === "cancel_error_in_200") return sendJson(res, 200, { ref, status: "erro_cancelamento", erros: [{ mensagem: "cancelamento negado" }] });
      const invoice = invoices.get(ref);
      if (invoice) invoice.status = "cancelado";
      return sendJson(res, 200, { ref, status: "processando_cancelamento" });
    }

    if (method === "POST" && url.pathname === "/v2/empresas") return sendJson(res, 201, { id: `empresa_${sequence++}` });
    if (method === "POST" && url.pathname === "/v2/hooks") return sendJson(res, 201, { id: `hook_${sequence++}` });
    return sendJson(res, 404, { mensagem: `rota falsa ausente: ${method} ${url.pathname}` });
  });
}
