import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, posix } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  INVOICE_REASONS_OUT_OF_SCOPE,
  INVOICE_UI_REASONS,
} from "../frontend/src/modules/work-orders/work-order-invoice.model.js";

// -----------------------------------------------------------------------------------------------
// B-SAN3-25 (item 50 do portão) — R-ENUM, a enumeração FAIL-CLOSED dos motivos do faturamento (CE-G1; plano v2 §2.1 com a
// Emenda 1 §E1.3, que prevalece).
//
// [E1] Toda recusa (status, motivo) que o `POST /api/v1/work-orders/:id/invoice` pode produzir está na lista do que a aba
//      traduz (`INVOICE_UI_REASONS`) ou na do que fica fora, com o porquê (`INVOICE_REASONS_OUT_OF_SCOPE`), as duas do
//      modelo PURO do front. A fonte é GERADA do código real, lido como TEXTO (`readFileSync`; CRLF → LF antes de qualquer
//      regex; nada de `src/**` é importado nem executado):
//        (a1) todo `.ts` dos 3 diretórios do faturamento e os 6 avulsos do v2;
//        (a2) a PILHA de `src/app.ts`, derivada do próprio arquivo: toda montagem `app.use(` de `createApp` até a do
//             faturamento (que tem de casar exatamente 1 vez), cada componente classificado por `INVOICE_PILHA` ou como
//             roteador `create<X>Router` de definição única; entrada da tabela fora da pilha também reprova;
//        (a3) o nível 2: em cada roteador montado num caminho que alcança o faturamento, todo `router.use` que alcança tem de
//             estar em `INVOICE_MW_DE_ROTEADOR`; `post`/`all` que colide com a rota reprova; `param`/`route` reprovam.
//      Os sítios são P1 `new <X>Error(`, P2 `errors.invalid(`/`errors.unprocessable(`, P3 `overflowReason:`, P4
//      `deny(response`/`sendForbidden(response` e P5 `.status(<arg>).json(`/`.send(`. Sítio não literal só passa se estiver
//      em `INVOICE_SITIOS_NAO_LITERAIS` (multiconjunto, nas duas direções). Os importes dos 3 diretórios que saem deles têm
//      de estar na varredura ou em `INVOICE_IMPORTS_SEM_MOTIVO`, com o porquê.
// [E2] O parágrafo "Lista fechada do que a aba Financeiro da OS traduz no faturamento" do `API_CONTRACTS.md` é igual, em
//      conjunto, a `INVOICE_UI_REASONS` (e cada frase do parágrafo é a do modelo).
//
// A REGRA EXECUTÁVEL é a sonda de referência da Emenda 1 (`planos/plano-B-SAN3-25-v2-emenda1-sonda-renum.mjs.txt`) com o
// julgamento do driver (`…-emenda1-mutacoes.mjs.txt`, função `julga`): as funções abaixo (`closeParen`, `splitArgs`, `lead`,
// `strLit`, `isPathConst`, `resolveConst`, `reachesPrefix`, `routeMatches`) e as tabelas `INVOICE_PILHA` e
// `INVOICE_MW_DE_ROTEADOR` são as da sonda, sem mudança de regra (regra diferente exige emenda, §C7 item 11(3)).
// Mutações donas (plano §4.3 e E1.5): M-E1 a M-E4 e M-E6 a M-E12 no servidor (temporárias), M-E5 no parágrafo.
// -----------------------------------------------------------------------------------------------

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const INVOICE_PATH = "/api/v1/work-orders/wo-1/invoice";

const DIRS = ["src/modules/work-order-financials", "src/modules/financial-titles", "src/modules/financial-uow"];
const AVULSOS_V2 = [
  "src/modules/tariffs/financial-item.shape.ts",
  "src/modules/core-saas/middleware/rbac.middleware.ts",
  "src/modules/core-saas/middleware/tenant-context.middleware.ts",
  "src/modules/core-saas/middleware/persistent-rbac-context.middleware.ts",
  "src/modules/core-saas/routes/http.ts",
  "src/modules/navigation/module-gate.middleware.ts",
];

// (a2) A pilha do app — verbatim da sonda de referência (Emenda 1 §E1.3 passo 4).
const INVOICE_PILHA: Record<string, { sem_resposta?: string; fonte?: string; definicao?: string; roteador?: string; alvo?: string }> = {
  helmet: { sem_resposta: "cabeçalhos de segurança; chama next()" },
  cors: { sem_resposta: "responde só ao preflight OPTIONS, sem corpo de erro" },
  createSubscriptionBillingWebhookRouterForApp: { sem_resposta: "webhook em BILLING_WEBHOOK_MOUNT_PATH; fora desse caminho chama next() (app.ts:119-125)" },
  "express.json": { sem_resposta: "erro de parse segue para rejectMalformedJson; os outros vão ao tratador padrão do Express, sem reason" },
  rejectMalformedJson: { fonte: "src/app.ts", definicao: "function rejectMalformedJson(" },
  logger: { sem_resposta: "pino-http; só registra" },
  healthRouter: { roteador: "src/routes/health.routes.ts" },
  attachAuthenticatedActor: { fonte: "src/modules/auth/middleware/authenticated-actor.middleware.ts", definicao: "export function attachAuthenticatedActor(" },
  createModuleGate: { fonte: "src/modules/navigation/module-gate.middleware.ts", definicao: "export function createModuleGate(" },
  createWorkOrderFinancialRouter: { alvo: "o faturamento; os middlewares dele já são fontes do v2" },
};

// (a3) Os middlewares de roteador que alcançam o faturamento — verbatim da sonda (Emenda 1 §E1.3 (a3)).
const INVOICE_MW_DE_ROTEADOR: Record<string, string> = {
  tenantContextMiddleware: "src/modules/core-saas/middleware/tenant-context.middleware.ts",
  createPersistentRbacContextMiddleware: "src/modules/core-saas/middleware/persistent-rbac-context.middleware.ts",
};

// (b) Os destinos de importe dos 3 diretórios que saem deles e NÃO estão na varredura, cada um com o porquê (plano v2
// §2.1(b)). Destino novo sem classificação reprova. Retrato no head da A0 da raiz: 24 destinos, 5 deles avulsos da (a1).
const INVOICE_IMPORTS_SEM_MOTIVO: Record<string, string> = {
  "src/config/business-time.ts": "Data e fuso de negócio (deriveCompetencia e afins); não monta resposta nem cria motivo.",
  "src/config/env.ts": "Configuração congelada no import (modo de persistência, tempos); não cria motivo.",
  "src/database/financial-period-lock.ts": "Trava consultiva do período; quem recusa o período fechado é financial-title.repository.ts (422 period_closed), dentro dos diretórios.",
  "src/database/prisma.ts": "Cliente do banco.",
  "src/database/rls.ts": "Contexto de RLS por organização; o único erro é o canário TenantRowsLeakError, sem status nem reason, que cai no tratador genérico e na frase genérica.",
  "src/modules/cheques/cheque-prisma.repository.ts": "Porta de cheques da unidade financeira, que o faturamento não chama.",
  "src/modules/cheques/cheque.repository.ts": "Porta de cheques da unidade financeira, que o faturamento não chama.",
  "src/modules/cheques/cheque.service.ts": "Leitura de cheque pendente na baixa de título; o faturamento não a chama.",
  "src/modules/cheques/cheque.types.ts": "Tipos de cheque da unidade financeira.",
  "src/modules/core-saas/audit/audit-request-context.ts": "Contexto de auditoria do pedido (best-effort); não responde.",
  "src/modules/core-saas/permissions/catalog.ts": "Catálogo de permissões (constantes); o RoleNotAssignableError dele é do provisionamento de papel.",
  "src/modules/financial-accounts/financial-account.service.ts": "Só o repositório de contas em memória para testes; contas são da baixa de título.",
  "src/modules/financial-entries/financial-entry-prisma.repository.ts": "Porta de lançamentos de caixa da unidade financeira, que o faturamento não chama.",
  "src/modules/financial-entries/financial-entry.repository.ts": "Porta de lançamentos de caixa da unidade financeira, que o faturamento não chama.",
  "src/modules/financial-entries/financial-entry.service.ts": "Lançamentos de caixa (baixa de título); o faturamento não os chama.",
  "src/modules/financial-entries/financial-entry.types.ts": "Tipos de lançamento de caixa da unidade financeira.",
  "src/modules/service-quotes/service-quote.service.ts": "Resolvedor de tarifa do lançamento de item por tabela; o faturamento não resolve tarifa.",
  "src/modules/work-orders/work-order.service.ts": "get() da OS: o 404 é traduzido para 404 work_order_not_found (work-order-financial.service.ts:502-503); o 400 de id só nasce com id inválido na URL, e a tela usa o id da OS carregada.",
  "src/modules/work-orders/work-order.types.ts": "A classe WorkOrderError, usada só para reconhecer o 404 do get(); as fábricas de lá são do cancelamento e do app de campo.",
};

// (c) Os sítios NÃO literais conhecidos, chave `P<n> <arquivo> | <texto normalizado da linha>`, comparados como
// MULTICONJUNTO nas duas direções (o http.ts tem 2 linhas iguais). `produz` diz quais motivos o sítio produz.
const INVOICE_SITIOS_NAO_LITERAIS: ReadonlyArray<{ readonly sitio: string; readonly produz: string }> = [
  {
    sitio: 'P1 src/modules/work-order-financials/work-order-financial.validators.ts | invalid: (reason, message) => new WorkOrderFinancialError(400, "WORK_ORDER_FINANCIAL_INVALID", reason, message),',
    produz: "fábrica 400 passada a tariffs/financial-item.shape.ts: o motivo literal de cada errors.invalid(\"…\") de lá (P2).",
  },
  {
    sitio: 'P1 src/modules/work-order-financials/work-order-financial.validators.ts | unprocessable: (reason, message) => new WorkOrderFinancialError(422, "WORK_ORDER_FINANCIAL_UNPROCESSABLE", reason, message),',
    produz: "fábrica 422 passada a tariffs/financial-item.shape.ts: 422 financial_total_overflow (o overflowReason deste módulo, P3).",
  },
  {
    sitio: 'P1 src/modules/financial-titles/financial-title.validators.ts | invalid: (reason, message) => new FinancialTitleError(400, "FINANCIAL_TITLE_INVALID", reason, message),',
    produz: "fábrica 400 passada a tariffs/financial-item.shape.ts: o motivo literal de cada errors.invalid(\"…\") de lá (P2).",
  },
  {
    sitio: 'P1 src/modules/financial-titles/financial-title.validators.ts | unprocessable: (reason, message) => new FinancialTitleError(422, "FINANCIAL_TITLE_UNPROCESSABLE", reason, message),',
    produz: "fábrica 422 passada a tariffs/financial-item.shape.ts: 422 amount_overflow (o overflowReason deste módulo, P3).",
  },
  {
    sitio: "P1 src/modules/financial-titles/financial-title.validators.ts | throw new FinancialTitleError(400, \"FINANCIAL_TITLE_INVALID\", `invalid_${field}`, `${field} must be at most ${maxLength} characters.`);",
    produz: "400 invalid_document, invalid_category e invalid_description (parseOptionalBounded do título à mão); o faturamento não passa esses campos.",
  },
  {
    sitio: "P2 src/modules/tariffs/financial-item.shape.ts | throw errors.invalid(`invalid_${field}`, `${field} must be a number greater than or equal to zero.`);",
    produz: "400 invalid_quantity, invalid_unitAmount, invalid_totalAmount (lançar e editar item) e invalid_amount (título); no faturamento a soma ≤ 0 vira 422 nothing_to_invoice antes.",
  },
  {
    sitio: "P2 src/modules/tariffs/financial-item.shape.ts | throw errors.unprocessable(options.overflowReason, `${field} exceeds the maximum monetary value (${MONEY_MAX}).`);",
    produz: "o overflowReason de cada módulo (P3): 422 financial_total_overflow (item) e 422 amount_overflow (título).",
  },
  {
    sitio: "P4 src/modules/core-saas/middleware/rbac.middleware.ts | function sendForbidden(",
    produz: "a definição; os pares são as chamadas sendForbidden(response, \"…\") do mesmo arquivo (P4 literal): 403 tenant_required, role_required, permission_required.",
  },
  {
    sitio: "P5 src/modules/core-saas/middleware/rbac.middleware.ts | response.status(403).json({",
    produz: "o corpo do sendForbidden, com o motivo recebido por parâmetro: os mesmos 403 da linha acima.",
  },
  {
    sitio: "P4 src/modules/core-saas/middleware/tenant-context.middleware.ts | function sendForbidden(",
    produz: "a definição; o par é a chamada sendForbidden(response, \"…\") do mesmo arquivo (P4 literal): 403 legacy_headers_disabled.",
  },
  {
    sitio: "P5 src/modules/core-saas/middleware/tenant-context.middleware.ts | response.status(403).json({",
    produz: "o corpo do sendForbidden, com o motivo recebido por parâmetro: o mesmo 403 da linha acima.",
  },
  {
    sitio: "P5 src/modules/core-saas/routes/http.ts | response.status(error.statusCode).json({",
    produz: "o status e o motivo do erro de domínio que chegou ao tratador: os pares P1 das fontes.",
  },
  {
    sitio: "P5 src/modules/core-saas/routes/http.ts | response.status(error.statusCode).json({",
    produz: "o status e o motivo do erro de domínio que chegou ao tratador: os pares P1 das fontes.",
  },
  {
    sitio: "P4 src/modules/navigation/module-gate.middleware.ts | function deny(response: Response, status: number, code: string, reason: string, message: string): void {",
    produz: "a definição; os pares são as chamadas deny(response, <status>, \"…\", \"…\") do mesmo arquivo (P4 literal).",
  },
  {
    sitio: "P5 src/modules/navigation/module-gate.middleware.ts | response.status(status).json({",
    produz: "o corpo do deny, com status e motivo recebidos por parâmetro: os pares da linha acima.",
  },
];

// (iii) Controles positivos: o par e o arquivo de onde ele TEM de vir (v2 + Emenda 1 §E1.3 (d)).
const CONTROLES: Record<string, string> = {
  "422 work_order_cancelled": "src/modules/work-order-financials/work-order-financial.types.ts",
  "403 module_not_enabled": "src/modules/navigation/module-gate.middleware.ts",
  "401 session_inactive": "src/modules/auth/middleware/authenticated-actor.middleware.ts",
  "400 invalid_json": "src/app.ts",
};

// (v) Os pares que nascem ANTES do router: só podem vir da pilha (src/app.ts ou o middleware de autenticação).
const PRE_ROTA = ["401 session_inactive", "503 session_check_unavailable", "403 password_change_required", "400 invalid_json"];
const PRE_ROTA_ORIGENS = ["src/app.ts:", "src/modules/auth/middleware/authenticated-actor.middleware.ts:"];

// ------------------------------------------------ a sonda de referência (Emenda 1), sem mudança de regra

const BT = String.fromCharCode(96);
const BS = String.fromCharCode(92);
const QUOTES = new Set(['"', "'", BT]);

const lineOf = (text: string, idx: number) => text.slice(0, idx).split("\n").length;
const norm = (s: string) => s.trim().replace(/\s+/g, " ");

// Do "(" em `open` até o ")" que fecha, pulando strings e comentários. Devolve o índice do ")".
function closeParen(text: string, open: number): number {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    const c = text[i];
    if (QUOTES.has(c)) {
      i++;
      while (i < text.length && text[i] !== c) {
        if (text[i] === BS) i++;
        i++;
      }
      continue;
    }
    if (c === "/" && text[i + 1] === "/") {
      while (i < text.length && text[i] !== "\n") i++;
      continue;
    }
    if (c === "/" && text[i + 1] === "*") {
      i = text.indexOf("*/", i + 2) + 1;
      continue;
    }
    if (c === "(" || c === "{" || c === "[") depth++;
    if (c === ")" || c === "}" || c === "]") {
      depth--;
      if (depth === 0) return i;
    }
  }
  throw new Error("parentese sem par em " + open);
}

function splitArgs(inner: string): string[] {
  const args: string[] = [];
  let depth = 0;
  let cur = "";
  for (let i = 0; i < inner.length; i++) {
    const c = inner[i];
    if (QUOTES.has(c)) {
      let j = i + 1;
      while (j < inner.length && inner[j] !== c) {
        if (inner[j] === BS) j++;
        j++;
      }
      cur += inner.slice(i, j + 1);
      i = j;
      continue;
    }
    if (c === "/" && inner[i + 1] === "/") {
      while (i < inner.length && inner[i] !== "\n") i++;
      continue;
    }
    if (c === "(" || c === "{" || c === "[") depth++;
    if (c === ")" || c === "}" || c === "]") depth--;
    if (c === "," && depth === 0) {
      args.push(cur.trim());
      cur = "";
      continue;
    }
    cur += c;
  }
  if (cur.trim()) args.push(cur.trim());
  return args;
}

const lead = (arg: string) => (/^([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)/.exec(arg) || [])[1] || "<anonimo>";

function strLit(arg: string): string | undefined {
  if (arg.length >= 2 && QUOTES.has(arg[0]) && arg[arg.length - 1] === arg[0] && !arg.slice(1, -1).includes(arg[0])) return arg.slice(1, -1);
  return undefined;
}

const isPathConst = (arg: string) => /^[A-Z][A-Z0-9_]*$/.test(arg);

function resolveConst(text: string, id: string): string | undefined {
  const m = new RegExp(String.raw`const\s+${id}\s*=\s*["']([^"']+)["']`).exec(text);
  return m ? m[1] : undefined;
}

// Prefixo do app.use/router.use do Express (fronteira de segmento).
const reachesPrefix = (mount: string, path: string) => mount === "/" || path === mount || path.startsWith(mount + "/");

// Rota exata (":p" = um segmento; "*" = qualquer coisa).
function routeMatches(route: string, path: string): boolean {
  const esc = route
    .split("")
    .map((ch) => (".+?^${}()|[]".includes(ch) || ch === BS ? BS + ch : ch))
    .join("");
  const re = "^" + esc.replace(/\*/g, ".*").replace(/:[A-Za-z_]\w*/g, "[^/]+") + "/?$";
  return new RegExp(re).test(path);
}

type Retrato = {
  readonly fontes: readonly string[];
  readonly pilhaMontagens: number;
  readonly pilhaAlcanca: number;
  readonly roteadores: number;
  readonly mwDeRoteador: Readonly<Record<string, number>>;
  readonly importesFora: readonly string[];
  readonly sitios: number;
  readonly porPadrao: Readonly<Record<string, number>>;
  readonly naoLiterais: readonly string[];
  readonly semMotivo: readonly string[];
  readonly origem: ReadonlyMap<string, readonly string[]>;
  readonly falhas: readonly string[];
};

function extrairRetrato(root: string): Retrato {
  const rd = (p: string) => readFileSync(join(root, p), "utf8").replace(/\r\n/g, "\n");
  const listTs = (dir: string): string[] => {
    const out: string[] = [];
    const walk = (d: string) => {
      for (const n of readdirSync(join(root, d)).sort()) {
        const rel = d + "/" + n;
        if (statSync(join(root, rel)).isDirectory()) walk(rel);
        else if (rel.endsWith(".ts") && !rel.endsWith(".d.ts")) out.push(rel);
      }
    };
    walk(dir);
    return out;
  };

  // ---- (a2) a pilha do app
  const falhas: string[] = [];
  const app = rd("src/app.ts");
  const iStart = app.indexOf("export function createApp(");
  const mountRe = /app\.use\(\s*"\/api\/v1"\s*,\s*attachAuthenticatedActor\(\)\s*,\s*createWorkOrderFinancialRouter\(\)\s*\)\s*;/g;
  const mounts = [...app.matchAll(mountRe)];
  if (iStart < 0) falhas.push("createApp não achado");
  if (mounts.length !== 1) falhas.push("montagem do faturamento: " + mounts.length + " (esperado 1)");
  const iEnd = mounts.length ? mounts[0].index! + mounts[0][0].length : 0;
  const appRegiao = app.slice(0, iEnd); // do início do arquivo até o fim da montagem do faturamento
  const pilha: Array<{ linha: number; caminho: string; alcanca: boolean; componentes: string[] }> = [];
  for (const m of appRegiao.matchAll(/\bapp\.use\(/g)) {
    if (m.index! < iStart) continue;
    const open = m.index! + "app.use".length;
    const close = closeParen(app, open);
    const args = splitArgs(app.slice(open + 1, close));
    let caminho: string | undefined;
    let comps = args;
    if (args.length >= 2 && strLit(args[0]) !== undefined) {
      caminho = strLit(args[0]);
      comps = args.slice(1);
    } else if (args.length >= 2 && isPathConst(args[0])) {
      caminho = resolveConst(app, args[0]) ?? "?" + args[0];
      comps = args.slice(1);
    }
    const alcanca = caminho === undefined || caminho.startsWith("?") || reachesPrefix(caminho, INVOICE_PATH);
    pilha.push({ linha: lineOf(app, m.index!), caminho: caminho ?? "(global)", alcanca, componentes: comps.map(lead) });
  }
  const fontesNovas = new Set<string>();
  const roteadores = new Map<string, { nome: string; montagem: string }>();
  const defIndex = new Map<string, string[]>();
  for (const f of listTs("src")) {
    for (const d of rd(f).matchAll(/export\s+(?:async\s+)?function\s+(create\w+Router)\s*\(/g)) {
      defIndex.set(d[1], [...(defIndex.get(d[1]) ?? []), f]);
    }
  }
  const vistos = new Set<string>();
  for (const p of pilha.filter((x) => x.alcanca)) {
    for (const c of p.componentes) {
      vistos.add(c);
      const cls = INVOICE_PILHA[c];
      if (cls && cls.fonte) {
        const n = rd(cls.fonte).split(cls.definicao!).length - 1;
        if (n !== 1) falhas.push("definição de " + c + " em " + cls.fonte + ": " + n + " (esperado 1)");
        fontesNovas.add(cls.fonte);
      } else if (cls && cls.roteador) {
        roteadores.set(cls.roteador, { nome: c, montagem: p.caminho });
      } else if (cls && (cls.sem_resposta || cls.alvo)) {
        // classificado
      } else if (/^create\w+Router$/.test(c)) {
        const defs = defIndex.get(c) ?? [];
        if (defs.length !== 1) falhas.push("roteador " + c + ": " + defs.length + " definições (esperado 1)");
        else roteadores.set(defs[0], { nome: c, montagem: p.caminho });
      } else {
        falhas.push("componente da pilha sem classe: " + c + " (app.ts:" + p.linha + ")");
      }
    }
  }
  for (const k of Object.keys(INVOICE_PILHA)) if (!vistos.has(k)) falhas.push("entrada da tabela da pilha fora da pilha: " + k);

  // ---- (a3) nível 2: cada roteador montado antes do faturamento, num caminho que o alcança
  const mwDeRoteador: Array<{ arq: string; linha: number; c: string }> = [];
  for (const [arq, info] of roteadores) {
    const t = rd(arq);
    const rel = INVOICE_PATH.slice(info.montagem === "(global)" ? 0 : info.montagem.length) || "/";
    const vars = [...t.matchAll(/\b(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:express\.)?Router\(/g)].map((x) => x[1]);
    if (vars.length === 0) {
      falhas.push("roteador sem Router() declarado: " + arq);
      continue;
    }
    for (const v of new Set(vars)) {
      for (const m of t.matchAll(new RegExp(String.raw`\b${v}\.(use|all|param|route|post|get|put|patch|delete)\(`, "g"))) {
        const metodo = m[1];
        const open = m.index! + m[0].length - 1;
        const args = splitArgs(t.slice(open + 1, closeParen(t, open)));
        const linha = lineOf(t, m.index!);
        if (metodo === "param" || metodo === "route") {
          falhas.push(arq + ":" + linha + " " + v + "." + metodo + "( não suportado");
          continue;
        }
        if (metodo === "use") {
          let caminho: string | undefined;
          let comps = args;
          if (strLit(args[0]) !== undefined) {
            caminho = strLit(args[0]);
            comps = args.slice(1);
          } else if (isPathConst(args[0])) {
            caminho = resolveConst(t, args[0]) ?? "?" + args[0];
            comps = args.slice(1);
          }
          const alcanca = caminho === undefined || caminho.startsWith("?") || reachesPrefix(caminho, rel);
          if (!alcanca) continue;
          for (const c of comps.map(lead)) {
            mwDeRoteador.push({ arq, linha, c });
            if (INVOICE_MW_DE_ROTEADOR[c]) fontesNovas.add(INVOICE_MW_DE_ROTEADOR[c]);
            else falhas.push("middleware de roteador sem classe: " + c + " (" + arq + ":" + linha + ")");
          }
          continue;
        }
        const p0 = strLit(args[0] ?? "");
        if ((metodo === "post" || metodo === "all") && p0 !== undefined && routeMatches(p0, rel)) {
          falhas.push("rota anterior colide com o faturamento: " + arq + ":" + linha + " " + metodo + " " + p0);
        }
      }
    }
  }
  for (const k of Object.keys(INVOICE_MW_DE_ROTEADOR)) {
    if (!mwDeRoteador.some((x) => x.c === k)) falhas.push("entrada da tabela de middlewares de roteador sem uso: " + k);
  }

  // ---- fontes finais: (a1) + (a2)/(a3)
  const fontes = [...new Set([...DIRS.flatMap(listTs), ...AVULSOS_V2, ...fontesNovas])];

  // ---- (b) fronteira de importes dos 3 diretórios
  const dirOf = (f: string) => DIRS.find((d) => f.startsWith(d + "/"));
  const importesFora = new Set<string>();
  for (const f of DIRS.flatMap(listTs)) {
    for (const m of rd(f).matchAll(/(?:from\s+|import\(\s*)["'](\.{1,2}\/[^"']+)["']/g)) {
      const dest = posix.normalize(posix.join(posix.dirname(f), m[1])).replace(/\.js$/, ".ts");
      if (!dirOf(dest)) importesFora.add(dest);
    }
  }

  // ---- (c) sítios e pares
  const origem = new Map<string, string[]>();
  const naoLiterais: string[] = [];
  const semMotivo: string[] = [];
  const porPadrao: Record<string, number> = { P1: 0, P2: 0, P3: 0, P4: 0, P5: 0 };
  const addPar = (s: string, r: string, f: string, l: number) => {
    const k = s + " " + r;
    origem.set(k, [...(origem.get(k) ?? []), f + ":" + l]);
  };
  for (const f of fontes) {
    const t = f === "src/app.ts" ? appRegiao : rd(f);
    const linhaTxt = (l: number) => norm(t.split("\n")[l - 1]);
    for (const m of t.matchAll(/\bnew\s+([A-Z][A-Za-z0-9]*Error)\s*\(/g)) {
      porPadrao.P1++;
      const l = lineOf(t, m.index!);
      const a = /^\(\s*(\d{3})\s*,\s*"[A-Z0-9_]+"\s*,\s*"([a-z0-9_]+)"/.exec(t.slice(m.index! + m[0].length - 1));
      if (a) addPar(a[1], a[2], f, l);
      else naoLiterais.push("P1 " + f + " | " + linhaTxt(l));
    }
    for (const m of t.matchAll(/\berrors\.(invalid|unprocessable)\(/g)) {
      porPadrao.P2++;
      const l = lineOf(t, m.index!);
      const a = /^\(\s*"([a-z0-9_]+)"/.exec(t.slice(m.index! + m[0].length - 1));
      if (a) addPar(m[1] === "invalid" ? "400" : "422", a[1], f, l);
      else naoLiterais.push("P2 " + f + " | " + linhaTxt(l));
    }
    for (const m of t.matchAll(/\boverflowReason:\s*"([a-z0-9_]+)"/g)) {
      porPadrao.P3++;
      addPar("422", m[1], f, lineOf(t, m.index!));
    }
    for (const m of t.matchAll(/\b(deny|sendForbidden)\(\s*response\b/g)) {
      porPadrao.P4++;
      const l = lineOf(t, m.index!);
      const rest = t.slice(m.index! + m[0].length);
      const a = m[1] === "deny" ? /^\s*,\s*(\d{3})\s*,\s*"[A-Z0-9_]+"\s*,\s*"([a-z0-9_]+)"/.exec(rest) : /^\s*,\s*"([a-z0-9_]+)"/.exec(rest);
      if (a) addPar(m[1] === "deny" ? a[1] : "403", m[1] === "deny" ? a[2] : a[1], f, l);
      else naoLiterais.push("P4 " + f + " | " + linhaTxt(l));
    }
    for (const m of t.matchAll(/\.status\(/g)) {
      const open = m.index! + ".status".length;
      const close = closeParen(t, open);
      const after = /^\s*\.(json|send)\(/.exec(t.slice(close + 1));
      if (!after) continue;
      porPadrao.P5++;
      const l = lineOf(t, m.index!);
      const bOpen = close + after[0].length;
      const corpo = t.slice(bOpen, closeParen(t, bOpen) + 1);
      const st = /^\s*(\d{3})\s*$/.exec(t.slice(open + 1, close));
      if (!/\breason\b/.test(corpo)) {
        semMotivo.push((st ? st[1] : "?") + " " + f + ":" + l);
        continue;
      }
      const r = /\breason:\s*"([a-z0-9_]+)"/.exec(corpo);
      if (st && r) addPar(st[1], r[1], f, l);
      else naoLiterais.push("P5 " + f + " | " + linhaTxt(l));
    }
  }
  const sitios = Object.values(porPadrao).reduce((a, b) => a + b, 0);

  return {
    fontes,
    pilhaMontagens: pilha.length,
    pilhaAlcanca: pilha.filter((p) => p.alcanca).length,
    roteadores: roteadores.size,
    mwDeRoteador: Object.fromEntries(Object.keys(INVOICE_MW_DE_ROTEADOR).map((k) => [k, mwDeRoteador.filter((x) => x.c === k).length])),
    importesFora: [...importesFora].sort(),
    sitios,
    porPadrao,
    naoLiterais,
    semMotivo,
    origem,
    falhas,
  };
}

let cache: Retrato | undefined;
function retrato(): Retrato {
  cache ??= extrairRetrato(ROOT);
  return cache;
}

const UI = Object.keys(INVOICE_UI_REASONS);
const OUT = Object.keys(INVOICE_REASONS_OUT_OF_SCOPE);

// ------------------------------------------------ [E1]

test("[E1] (pilha) a pilha de src/app.ts até o faturamento e o nível 2 dos roteadores estão inteiros classificados", () => {
  const r = retrato();
  assert.deepEqual(r.falhas, [], "pilha ou nível 2 com componente, rota ou definição fora da regra");
});

test("[E1] (i) todo par (status, motivo) alcançável pelo faturamento está na lista da tela ou na do que fica fora", () => {
  const r = retrato();
  const semClasse = [...r.origem.keys()].filter((k) => !UI.includes(k) && !OUT.includes(k)).sort();
  assert.deepEqual(
    semClasse.map((k) => `${k} ← ${r.origem.get(k)!.join(", ")}`),
    [],
    "par sem classe: ponha em INVOICE_UI_REASONS (com frase) ou em INVOICE_REASONS_OUT_OF_SCOPE (com o porquê)",
  );
});

test("[E1] (ii) todo par da lista da tela existe na fonte com o mesmo status", () => {
  const r = retrato();
  assert.ok(UI.length > 0, "a lista da tela está vazia");
  const sumiu = UI.filter((k) => !r.origem.has(k));
  assert.deepEqual(sumiu, [], "par da tela que o servidor não manda mais (renomeado ou com outro status)");
});

test("[E1] (iii) controles positivos: os 4 pares vêm dos arquivos certos", () => {
  const r = retrato();
  for (const [k, arq] of Object.entries(CONTROLES)) {
    const origens = r.origem.get(k) ?? [];
    assert.ok(
      origens.some((o) => o.startsWith(arq + ":")),
      `controle ${k} não vem de ${arq} (origens: ${JSON.stringify(origens)})`,
    );
  }
});

test("[E1] (iv) pisos do extrator (só pegam extrator quebrado)", () => {
  const r = retrato();
  assert.ok(r.origem.size >= 60, `pares=${r.origem.size} (piso 60)`);
  assert.ok(r.sitios >= 80, `sitios=${r.sitios} (piso 80)`);
  assert.ok(r.pilhaAlcanca >= 40, `pilha_alcanca=${r.pilhaAlcanca} (piso 40)`);
  assert.ok(r.roteadores >= 30, `roteadores=${r.roteadores} (piso 30)`);
  for (const [k, n] of Object.entries(r.mwDeRoteador)) {
    assert.ok(n >= 25, `mw_de_roteador ${k}=${n} (piso 25)`);
  }
});

test("[E1] (v) os 4 pares de antes do router só nascem na pilha (src/app.ts ou o middleware de autenticação)", () => {
  const r = retrato();
  for (const k of PRE_ROTA) {
    const origens = r.origem.get(k) ?? [];
    assert.ok(origens.length > 0, `par pré-rota ${k} ausente da fonte`);
    const fora = origens.filter((o) => !PRE_ROTA_ORIGENS.some((p) => o.startsWith(p)));
    assert.deepEqual(fora, [], `par pré-rota ${k} com origem fora da pilha`);
  }
});

test("[E1] (b) fronteira de importes: todo destino fora dos 3 diretórios está na varredura ou na tabela, com o porquê", () => {
  const r = retrato();
  assert.ok(r.importesFora.length > 0, "nenhum importe para fora dos 3 diretórios (extrator quebrado)");
  const semClasse = r.importesFora.filter((d) => !AVULSOS_V2.includes(d) && !r.fontes.includes(d) && !(d in INVOICE_IMPORTS_SEM_MOTIVO));
  assert.deepEqual(semClasse, [], "destino de importe novo sem classificação (INVOICE_IMPORTS_SEM_MOTIVO)");
  for (const [d, porque] of Object.entries(INVOICE_IMPORTS_SEM_MOTIVO)) {
    assert.ok(porque.trim().length > 0, `INVOICE_IMPORTS_SEM_MOTIVO ${d} sem o porquê`);
  }
});

test("[E1] (c) os sítios não literais são exatamente os da tabela, como multiconjunto, nas duas direções", () => {
  const r = retrato();
  const achados = [...r.naoLiterais].sort();
  const tabela = INVOICE_SITIOS_NAO_LITERAIS.map((s) => s.sitio).sort();
  assert.deepEqual(achados, tabela, "sítio não literal novo, ou entrada da tabela que sumiu da fonte");
  for (const s of INVOICE_SITIOS_NAO_LITERAIS) {
    assert.ok(s.produz.trim().length > 0, `INVOICE_SITIOS_NAO_LITERAIS sem o que produz: ${s.sitio}`);
  }
});

// ------------------------------------------------ [E2]

test("[E2] o parágrafo da lista fechada do API_CONTRACTS.md é igual, em conjunto, a INVOICE_UI_REASONS", () => {
  const texto = readFileSync(join(ROOT, "API_CONTRACTS.md"), "utf8").replace(/\r\n/g, "\n");
  const cabecalho = "**Lista fechada do que a aba Financeiro da OS traduz no faturamento (B-SAN3-25).**";
  assert.equal(texto.split(cabecalho).length - 1, 1, "o cabeçalho do parágrafo tem de aparecer exatamente 1 vez");
  const linhas = texto.slice(texto.indexOf(cabecalho)).split("\n");
  const inicio = linhas.findIndex((l) => l.startsWith("- `"));
  assert.ok(inicio > 0, "o parágrafo não tem lista");
  const pares = new Map<string, string>();
  for (const linha of linhas.slice(inicio)) {
    if (!linha.startsWith("- `")) break;
    const m = /^- `(\d{3} [a-z0-9_]+)` — "([^"]+)"/.exec(linha);
    assert.ok(m, `linha fora do formato da lista: ${linha}`);
    assert.equal(pares.has(m[1]), false, `par repetido no parágrafo: ${m[1]}`);
    pares.set(m[1], m[2]);
  }
  assert.deepEqual([...pares.keys()].sort(), [...UI].sort(), "o parágrafo e INVOICE_UI_REASONS não têm os mesmos pares");
  for (const [k, frase] of pares) {
    assert.equal(frase, INVOICE_UI_REASONS[k].message, `a frase do parágrafo para ${k} não é a da tela`);
  }
});
