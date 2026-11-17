// B-WO-LEITURA-TECNICO (item 71 do portão) — o censo de LEITURA: a semente com canários, o oráculo que chama toda GET
// montada e toda camada com caminho próprio, e o classificador do instantâneo `tests/fixtures/wo-leitura-classificacao.json`.
//
// A lei: o plano `B-WO-LEITURA-TECNICO` (§5.3) com as Emendas 1 (§2.2: o universo é toda GET montada; classe
// `NAO-ALCANCADA` com prova; T-L7) e 2 (§1: o universo soma as camadas `MIDDLEWARE <caminho> ·` com caminho próprio, classe
// `CAMADA-COM-CAMINHO`, T-L8; §2: o `marcador` positivo por rota; §3: o formato do instantâneo).
//
// O que este arquivo NÃO faz: mudar o censo do 07c. O universo vem de `executarCenso` de `tests/helpers/o6r07c-census.ts`
// (o `c3`), reusado sem mudar uma linha. Este arquivo classifica por conta própria, a partir do comportamento:
//   - o oráculo semeia uma OS-X com canários (Emenda 2 §2.2), despachada ao técnico A, e chama cada caminho do universo
//     como B (`field_technician` não atribuído) e C (`technician`), com todo id da semente em todo parâmetro e, nos
//     caminhos sem parâmetro, com as variantes de query (Emenda 1 §2.2, T-L2); como A (atribuído) para o controle positivo;
//   - o classificador decide a classe pelo que A recebe (dado da OS-X no corpo ⇒ uma das 3 classes do bloco; a classe
//     pela forma: parâmetro de caminho ⇒ `OS·LEITURA-ESCOPO`; corpo em lista ⇒ `LISTA·FILTRO-SERVIDOR`; senão
//     `AGREGADO·ESCOPO`), e a prova 401/403 pelo que B e C recebem (`NAO-ALCANCADA`). As únicas tabelas escritas à mão
//     são as notas e as pendências das rotas SEM dado de OS (§2.2 (a)(b)(c) do plano), revisadas chave a chave.
//
// Uso como biblioteca: `executarOraculo({ c3, injecao })` → `{ obs }` (processo filho); `classificarLeitura(c3, obs, snap)`.
// Uso como linha de comando (cwd = raiz do repositório):
//   node --import tsx tests/helpers/wo-leitura-census.ts oraculo <c3.json> <saida.json> [injecao.mts]
//   node --import tsx tests/helpers/wo-leitura-census.ts gravar <instantaneo.json>
// O `gravar` regenera o instantâneo pelas regras; o diff dele é revisado chave a chave.
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { executarCenso } from "./o6r07c-census.js";

const ESTE_ARQUIVO = fileURLToPath(import.meta.url);
export const RAIZ_DO_REPO = path.resolve(path.dirname(ESTE_ARQUIVO), "..", "..");
export const ARQUIVO_INSTANTANEO = path.join(RAIZ_DO_REPO, "tests", "fixtures", "wo-leitura-classificacao.json");
export const DIR_FORMAS_LEITURA = path.join(RAIZ_DO_REPO, "tests", "fixtures", "wo-leitura-formas");

// ------------------------------------------------------------------------------------------------
// A lista fechada de canários de CONTEÚDO (Emenda 2 §2.3) e o binário da semente.
// ------------------------------------------------------------------------------------------------
export const CANARIOS = [
  "TITCANX", // título
  "CLICANX", // cliente
  "DESCANX", // descrição
  "ENDCANX", // endereço
  "SENHAX77", // access_code
  "PLACANX1", // placa
  "COMCANX", // comentário
  "MOTCANX", // motivo da aprovação
  "ITEMCANX", // item financeiro
  "RESPCANX", // resposta da vistoria
  "ANEXOCANX", // nome do anexo da OS
  "ANEXVISTCANX", // nome do anexo da vistoria
  "OBSCANX", // observação do despacho
] as const;

/** PNG 1×1 de 67 bytes — os bytes da semente. Um 2xx cujo corpo é igual a eles é vazamento (T-L2). */
export const PNG_SEMENTE = Buffer.from(
  "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082",
  "hex",
);

export const CLASSE_OS = "OS·LEITURA-ESCOPO";
export const CLASSE_LISTA = "LISTA·FILTRO-SERVIDOR";
export const CLASSE_AGREGADO = "AGREGADO·ESCOPO";
export const CLASSE_SEM_DADO = "SEM-DADO-DE-OS";
export const CLASSE_NAO_ALCANCADA = "NAO-ALCANCADA";
export const CLASSE_CAMADA = "CAMADA-COM-CAMINHO";
/** A lista fechada (Emenda 2 §1.2): 6 classes. */
export const CLASSES = [CLASSE_OS, CLASSE_LISTA, CLASSE_AGREGADO, CLASSE_SEM_DADO, CLASSE_NAO_ALCANCADA, CLASSE_CAMADA] as const;
export const CLASSES_DO_BLOCO: readonly string[] = [CLASSE_OS, CLASSE_LISTA, CLASSE_AGREGADO];

/** A lista fechada de marcadores (Emenda 2 §2.4). */
export const MARCADORES: readonly string[] = [
  ...CANARIOS.map((c) => `canario:${c}`),
  "id:os",
  "id:run",
  "id:despacho",
  "id:aprovacao",
  "binario:png-semente",
  "igual-ao-gestor",
];

// ------------------------------------------------------------------------------------------------
// As rotas numeradas (Emenda 2 §3.1). O número é o NOME do subteste (`<CASO> · <papel> · R<n>`) e da violação; a classe
// e o marcador vêm do instantâneo. `chamada` é a chamada natural de A (o controle positivo): os parâmetros saem da
// semente pelo nome; `{X}` é a OS-X e `{T}` o modelo de vistoria da semente.
// ------------------------------------------------------------------------------------------------
export type RotaNumerada = { readonly r: string; readonly chave: string; readonly query: string };
const W = "GET /api/v1/work-orders/:workOrderId";
export const R_ROTAS: readonly RotaNumerada[] = [
  { r: "R1", chave: "GET /api/v1/work-orders", query: "" },
  { r: "R2", chave: W, query: "" },
  { r: "R3", chave: `${W}/timeline`, query: "" },
  { r: "R4", chave: `${W}/attachments`, query: "" },
  { r: "R5", chave: `${W}/attachments/:attachmentId/download`, query: "" },
  { r: "R6", chave: `${W}/map-start-points`, query: "" },
  { r: "R7", chave: `${W}/financial-items`, query: "" },
  { r: "R8", chave: `${W}/comments`, query: "" },
  { r: "R9", chave: `${W}/audit-logs`, query: "" },
  { r: "R10a", chave: "GET /api/v1/mobile/checklist-runs", query: "?workOrderId={X}" },
  { r: "R10b", chave: "GET /api/v1/mobile/checklist-runs", query: "?workOrderId={X}&checklistId={T}&roleAware=1" },
  { r: "R11", chave: "GET /api/v1/mobile/checklist-runs/:runId/comparison", query: "" },
  { r: "R12", chave: "GET /api/v1/mobile/checklist-runs/:runId/attachments/:attachmentId/download", query: "" },
  { r: "R13", chave: "GET /api/v1/operations/dispatches", query: "" },
  { r: "R14", chave: "GET /api/v1/operations/dispatches/:dispatchId", query: "" },
  { r: "R15", chave: "GET /api/v1/operations/dispatches/:dispatchId/timeline", query: "" },
  { r: "R16", chave: "GET /api/v1/approvals/pending", query: "" },
  { r: "R17", chave: "GET /api/v1/approvals/:approvalId", query: "" },
  { r: "R18", chave: "GET /api/v1/dashboard/summary", query: "" },
];
export const rotulosDe = (chave: string): string[] => R_ROTAS.filter((x) => x.chave === chave).map((x) => x.r);
const rotulo = (chave: string): string => rotulosDe(chave).join(",") || "—";

// ------------------------------------------------------------------------------------------------
// Notas e pendências das rotas sem dado de OS (plano §2.2 (a)(b)(c); Emenda 1 §2.2 e §5.1). Escritas à mão e revisadas
// chave a chave: o T-L5 confere a classe contra o comportamento; estas tabelas só anotam o porquê.
// ------------------------------------------------------------------------------------------------
const NOTA_CAMADA = "camada sem rota própria; a resposta vem da rota de mesmo caminho ou do 404";
const NOTAS_FIXAS: Readonly<Record<string, string>> = {
  "GET /api/v1/health/ready": "sem permissão por desenho",
  "GET /api/v1/attachments": "permissão no serviço; work_order não registrado em attachment-entity-resolver",
  "GET /api/v1/attachments/:attachmentId/download": "permissão no serviço; work_order não registrado em attachment-entity-resolver",
};
const PENDENCIAS_POR_PREFIXO: ReadonlyArray<readonly [RegExp, string]> = [
  [/^GET \/api\/v1\/(damages|fuel-logs|service-quotes|expense-reports)(\/|$)/, "P-WO-LEITURA-ID-EM-FROTA"],
  [/^GET \/api\/v1\/operations\/work-orders-timeseries$/, "P-RBAC-TECNICO-LEITURAS-FORA-DE-OS"],
  [/^GET \/api\/v1\/mobile\/inventory\/availability$/, "P-MOBILE-AVAILABILITY-TENANT-ID"],
];

export type EntradaInstantaneo = { readonly classe: string; readonly marcador?: string; readonly nota?: string; readonly pendencia?: string };
export type InstantaneoLeitura = Record<string, EntradaInstantaneo>;

export function lerInstantaneoLeitura(arquivo = ARQUIVO_INSTANTANEO): InstantaneoLeitura {
  return JSON.parse(fs.readFileSync(arquivo, "utf8"));
}

/** O formato fixado (Emenda 2 §3.3): chaves ordenadas por `sort()`, `JSON.stringify(obj, null, 2) + "\n"`, LF. */
export function serializarInstantaneo(snap: InstantaneoLeitura): string {
  const ordenado: Record<string, EntradaInstantaneo> = {};
  for (const k of Object.keys(snap).sort()) {
    const e = snap[k];
    ordenado[k] = {
      classe: e.classe,
      ...(e.marcador !== undefined ? { marcador: e.marcador } : {}),
      ...(e.nota !== undefined ? { nota: e.nota } : {}),
      ...(e.pendencia !== undefined ? { pendencia: e.pendencia } : {}),
    };
  }
  return JSON.stringify(ordenado, null, 2) + "\n";
}

// ------------------------------------------------------------------------------------------------
// O universo U (Emenda 2 §1.2): toda GET/HEAD de `c3.rotas` ∪ toda chave `MIDDLEWARE <caminho> ·` de `c3.contagem` com
// caminho ∉ {`/`, `/api/v1`}.
// ------------------------------------------------------------------------------------------------
export type ElementoU = { readonly chave: string; readonly caminho: string; readonly tipo: "ROTA" | "MIDDLEWARE"; readonly method: string };
export function universo(c3: any): ElementoU[] {
  const rotas: ElementoU[] = (c3.rotas as any[])
    .filter((r) => r.method === "GET" || r.method === "HEAD")
    .map((r) => ({ chave: `${r.method} ${r.path}`, caminho: r.path, tipo: "ROTA" as const, method: r.method }));
  const camadas: ElementoU[] = Object.keys(c3.contagem)
    .filter((k) => k.startsWith("MIDDLEWARE ") && !["/", "/api/v1"].includes(k.split(" ")[1]))
    .map((k) => ({ chave: k, caminho: k.split(" ")[1], tipo: "MIDDLEWARE" as const, method: "GET" }));
  const vistos = new Set<string>();
  return [...rotas, ...camadas].filter((e) => (vistos.has(e.chave) ? false : (vistos.add(e.chave), true)));
}

// ------------------------------------------------------------------------------------------------
// HTTP de teste.
// ------------------------------------------------------------------------------------------------
export type Resp = { readonly s: number; readonly k: string; readonly ct: string; readonly buf: Buffer; readonly text: string; readonly j: any };
export type Http = (method: string, caminho: string, headers: Record<string, string>, corpo?: unknown) => Promise<Resp>;
export type Cabecalhos = (usuario: string, papeis: string, semPermissao?: boolean) => Record<string, string>;

export function criarHttp(base: string): Http {
  return async (method, caminho, headers, corpo) => {
    const ehForm = typeof FormData !== "undefined" && corpo instanceof FormData;
    const r = await fetch(base + caminho, {
      method,
      headers: ehForm ? headers : { "content-type": "application/json", ...headers },
      body: method === "GET" || method === "HEAD" || corpo === undefined ? undefined : ehForm ? (corpo as FormData) : JSON.stringify(corpo),
      signal: AbortSignal.timeout(15_000),
    }).catch(() => null);
    if (!r) return { s: 0, k: "sem-resposta", ct: "", buf: Buffer.alloc(0), text: "", j: null };
    const buf = Buffer.from(await r.arrayBuffer());
    const text = buf.toString("utf8");
    let j: any = null;
    try {
      j = JSON.parse(text);
    } catch {
      j = null;
    }
    return { s: r.status, k: `${r.status}:${j?.error?.code ?? ""}:${j?.error?.reason ?? ""}`, ct: r.headers.get("content-type") ?? "", buf, text, j };
  };
}

/** Cabeçalhos do modo memória (legacy headers de desenvolvimento): papéis em lista, permissões zeradas sob `semPermissao`. */
export function cabecalhosDeMemoria(tenantId: string): Cabecalhos {
  return (usuario, papeis, semPermissao = false) => ({
    "x-tenant-id": tenantId,
    "x-user-id": usuario,
    "x-role": papeis,
    ...(semPermissao ? { "x-permissions": "nenhuma" } : {}),
  });
}

// ------------------------------------------------------------------------------------------------
// A semente (Emenda 2 §2.2), pela API. Usuários REAIS (o chamador os cria no core); A e B com perfil de campo.
// ------------------------------------------------------------------------------------------------
export type Usuarios = { readonly gestor: string; readonly A: string; readonly B: string; readonly C: string };
export type Semente = {
  readonly osX: string;
  readonly codeX: string;
  readonly checklistId: string;
  readonly componentId: string;
  readonly runX: string;
  readonly dispA: string;
  readonly aprA: string;
  readonly comentario: string;
  readonly anexoOs: string;
  readonly anexoVist: string;
};

function exigir(r: Resp, esperado: number, passo: string): any {
  if (r.s !== esperado) throw new Error(`semente (${passo}): esperado ${esperado}, veio ${r.k} ${r.text.slice(0, 400)}`);
  return r.j;
}

function formPng(nome: string, extra: Record<string, string> = {}): FormData {
  const form = new FormData();
  for (const [k, v] of Object.entries(extra)) form.set(k, v);
  form.set("file", new Blob([PNG_SEMENTE], { type: "image/png" }), nome);
  return form;
}

export async function semear(http: Http, h: Cabecalhos, u: Usuarios, opcoes: { readonly papelGestor?: string } = {}): Promise<Semente> {
  const G = h(u.gestor, opcoes.papelGestor ?? "tenant_admin");
  const A = h(u.A, "field_technician");
  const tpl = exigir(
    await http("POST", "/api/v1/tenant/checklists", G, {
      name: "Vistoria canário",
      type: "technical_evidence",
      schema: {},
      components: [{ componentKey: "obs", type: "observation", label: "Observação", required: false, config: {}, validationRules: {}, visibilityRules: {} }],
    }),
    201,
    "modelo",
  ).data;
  exigir(await http("POST", `/api/v1/tenant/checklists/${tpl.id}/publish`, G, { expectedUpdatedAt: tpl.updatedAt }), 200, "publicar");
  const componentId = tpl.components[0].id as string;
  const os1 = exigir(
    await http("POST", "/api/v1/work-orders", G, {
      title: "TITCANX",
      customerName: "CLICANX",
      description: "DESCANX",
      serviceAddress: "ENDCANX",
      serviceLatitude: -23.5123456,
      serviceLongitude: -46.6123456,
      priority: "urgent",
      serviceDetails: { access_code: "SENHAX77", plate: "PLACANX1" },
      checklistId: tpl.id,
    }),
    201,
    "OS-X",
  ).data;
  const osX = os1.id as string;
  const disp = exigir(await http("POST", "/api/v1/operations/dispatches", G, { workOrderId: osX, operatorUserId: u.A, observation: "OBSCANX" }), 201, "despacho").data;
  exigir(await http("PATCH", `/api/v1/operations/dispatches/${disp.id}/status`, A, { status: "accepted" }), 200, "aceite");
  const runs = exigir(await http("GET", `/api/v1/mobile/checklist-runs?workOrderId=${osX}&roleAware=1`, G), 200, "runs").data;
  if (!Array.isArray(runs) || runs.length === 0) throw new Error("semente: o despacho não provisionou a vistoria");
  const runX = runs[0].id as string;
  exigir(await http("PATCH", `/api/v1/mobile/checklist-runs/${runX}`, A, { answers: [{ componentId, value: "RESPCANX" }] }), 200, "resposta");
  const com = exigir(await http("POST", `/api/v1/work-orders/${osX}/comments`, A, { message: "COMCANX" }), 201, "comentário").data;
  exigir(
    await http("POST", `/api/v1/work-orders/${osX}/financial-items`, G, { source: "manual", description: "ITEMCANX", quantity: 1, unit_amount: 10, currency: "BRL" }),
    201,
    "item financeiro",
  );
  const anx = exigir(await http("POST", `/api/v1/work-orders/${osX}/attachments`, A, formPng("ANEXOCANX.png")), 201, "anexo da OS").data;
  const anv = exigir(await http("POST", `/api/v1/mobile/checklist-runs/${runX}/attachments`, A, formPng("ANEXVISTCANX.png", { componentId })), 201, "anexo da vistoria").data;
  const lote = exigir(
    await http("POST", "/api/v1/mobile/sync/work-order-actions", A, {
      client_batch_id: randomUUID(),
      actions: [{ client_action_id: randomUUID(), type: "work_order.approval_request", payload: { work_order_id: osX, reason: "MOTCANX", urgency: "high" } }],
    }),
    200,
    "pedido de aprovação",
  ).data;
  if ((lote?.accepted ?? []).length !== 1) throw new Error(`semente: o pedido de aprovação não foi aceito ${JSON.stringify(lote).slice(0, 400)}`);
  const pend = exigir(await http("GET", `/api/v1/approvals/pending?workOrderId=${osX}`, G), 200, "aprovações").data;
  const apr = (pend as any[]).find((a) => (a.work_order_id ?? a.workOrderId) === osX);
  if (!apr) throw new Error("semente: a aprovação de A não apareceu para o gestor");
  return {
    osX,
    codeX: os1.code as string,
    checklistId: tpl.id as string,
    componentId,
    runX,
    dispA: disp.id as string,
    aprA: apr.id as string,
    comentario: com.id as string,
    anexoOs: (anx.id ?? anx.attachment?.id) as string,
    anexoVist: (anv.id ?? anv.attachment?.id) as string,
  };
}

// ------------------------------------------------------------------------------------------------
// Leitura do corpo: canário, binário, ids da semente.
// ------------------------------------------------------------------------------------------------
export function canariosNoCorpo(r: Resp, semente: Semente): string[] {
  if (!(r.s >= 200 && r.s < 300)) return [];
  const achados: string[] = CANARIOS.filter((c) => r.text.includes(c));
  if (semente.codeX && r.text.includes(semente.codeX)) achados.push(`code:${semente.codeX}`);
  if (r.buf.equals(PNG_SEMENTE)) achados.push("binario:png-semente");
  return achados;
}

const idsDa = (semente: Semente) =>
  ({ "id:run": semente.runX, "id:despacho": semente.dispA, "id:aprovacao": semente.aprA, "id:os": semente.osX }) as const;

/** Cumpre o marcador? (Emenda 2 §2.4). `gestor` é a resposta do gestor na mesma URL (para `igual-ao-gestor`). */
export function cumpreMarcador(marcador: string, r: Resp, semente: Semente, gestor?: Resp): boolean {
  if (!(r.s >= 200 && r.s < 300)) return false;
  if (marcador.startsWith("canario:")) return r.text.includes(marcador.slice("canario:".length));
  if (marcador === "binario:png-semente") return r.buf.equals(PNG_SEMENTE) && r.ct.toLowerCase().startsWith("image/png");
  if (marcador === "igual-ao-gestor") return r.s === 200 && gestor !== undefined && gestor.s === 200 && r.text === gestor.text;
  const id = (idsDa(semente) as Record<string, string>)[marcador];
  return id !== undefined && r.text.includes(id);
}

/** O marcador que a regra gera para a resposta de A: o 1º canário da lista; senão o binário; senão o id mais específico. */
function marcadorPorRegra(r: Resp, semente: Semente): string | undefined {
  if (!(r.s >= 200 && r.s < 300)) return undefined;
  for (const c of CANARIOS) if (r.text.includes(c)) return `canario:${c}`;
  if (r.buf.equals(PNG_SEMENTE)) return "binario:png-semente";
  for (const [m, id] of Object.entries(idsDa(semente))) if (r.text.includes(id)) return m;
  return undefined;
}

/** Normaliza o que muda de uma chamada para outra sem ser dado (carimbos ISO-8601), para comparar corpos. */
export function normalizarCorpo(texto: string): string {
  return texto.replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z/g, "<instante>");
}

/** Mesmo corpo módulo o ECO do filtro: o corpo com o id da OS-X trocado pelo aleatório é o do aleatório. */
export function mesmoModuloEco(rX: Resp, rR: Resp, osX: string, aleatorio: string): boolean {
  return rX.k === rR.k && normalizarCorpo(rX.text.replaceAll(osX, aleatorio)) === normalizarCorpo(rR.text);
}

/** Forma do corpo: lista (`data` é array, ou objeto com `items` array) ou agregado. */
function formaDoCorpo(r: Resp): "lista" | "objeto" {
  const d = r.j?.data ?? r.j;
  if (Array.isArray(d)) return "lista";
  if (d && typeof d === "object" && Array.isArray(d.items)) return "lista";
  return "objeto";
}

// ------------------------------------------------------------------------------------------------
// Parâmetros e variantes.
// ------------------------------------------------------------------------------------------------
const PARAM = /:([A-Za-z0-9_]+)/g;
export const nomesDeParametro = (caminho: string): string[] => [...caminho.matchAll(PARAM)].map((m) => m[1]);
const substituir = (caminho: string, valores: readonly string[]) => {
  let i = 0;
  return caminho.replace(PARAM, () => valores[i++]);
};

export function idsDaSemente(s: Semente): string[] {
  return [s.osX, s.runX, s.dispA, s.aprA, s.comentario, s.anexoOs, s.anexoVist];
}

/** O id natural de cada parâmetro (a chamada de A): pelo nome do parâmetro e, no anexo, pelo recurso. */
export function idNatural(caminho: string, parametro: string, s: Semente): string | undefined {
  if (parametro === "workOrderId") return s.osX;
  if (parametro === "runId") return s.runX;
  if (parametro === "dispatchId") return s.dispA;
  if (parametro === "approvalId") return s.aprA;
  if (parametro === "commentId") return s.comentario;
  if (parametro === "attachmentId") return caminho.includes("/checklist-runs/") ? s.anexoVist : s.anexoOs;
  return undefined;
}

export function urlNatural(chave: string, query: string, s: Semente): string | undefined {
  const caminho = chave.slice(chave.indexOf(" ") + 1);
  const ids: string[] = [];
  for (const p of nomesDeParametro(caminho)) {
    const id = idNatural(caminho, p, s);
    if (!id) return undefined;
    ids.push(id);
  }
  return substituir(caminho, ids) + query.replaceAll("{X}", s.osX).replaceAll("{T}", s.checklistId);
}

/** Todas as combinações dos ids da semente nos parâmetros (produto cartesiano). */
function combinacoes(n: number, ids: readonly string[]): string[][] {
  let acc: string[][] = [[]];
  for (let i = 0; i < n; i++) acc = acc.flatMap((c) => ids.map((id) => [...c, id]));
  return acc;
}

/** As variantes de query dos caminhos sem parâmetro (Emenda 1 §2.2, T-L2). */
export function variantesDeQuery(s: Semente, usuarios: Usuarios, entityTypes: readonly string[]): string[] {
  const ids = idsDaSemente(s);
  const v = [
    "",
    `?workOrderId=${s.osX}`,
    `?work_order_id=${s.osX}`,
    `?workOrderId=${s.osX}&checklistId=${s.checklistId}&roleAware=1`,
    `?checklistId=${s.checklistId}`,
    "?roleAware=1",
    `?operatorUserId=${usuarios.A}`,
    `?assignedUserId=${usuarios.A}`,
  ];
  for (const tipo of [...entityTypes, "work_order"]) for (const id of ids) v.push(`?entityType=${tipo}&entityId=${id}`);
  return v;
}

// ------------------------------------------------------------------------------------------------
// O oráculo — observações cruas (fatos medidos), por chave do universo. Não decide violação: isso é do classificador.
// ------------------------------------------------------------------------------------------------
export type Vazamento = { readonly papel: string; readonly url: string; readonly canarios: readonly string[] };
export type Observacao = {
  readonly chave: string;
  readonly tipo: "ROTA" | "MIDDLEWARE";
  readonly params: number;
  /** T-L2: os 2xx de B (ft) e C (tec) com canário de conteúdo da OS-X. */
  readonly vazamentos: Vazamento[];
  /** T-L3: a resposta ao UUID aleatório, e as combinações de ids da semente que respondem diferente (por papel). */
  readonly kAleatorio: Record<string, string>;
  readonly diferencas: Array<{ readonly papel: string; readonly url: string; readonly k: string }>;
  /** T-L4: o id da OS-X na lista pedida sem filtro, e a igualdade ?workOrderId=<X> ≡ <aleatório> nas duas formas. */
  readonly idOsXSemFiltro: Array<{ readonly papel: string }>;
  readonly filtroDiferente: Array<{ readonly papel: string; readonly forma: "a" | "b"; readonly kX: string; readonly kR: string }>;
  /** T-L7: todas as respostas (B e C, com e sem permissão, ids da semente e aleatório) são 401/403? */
  readonly so401403: boolean;
  readonly respostasNaoNegadas: string[];
  /** T-L8: os GET de camada (B e C, cada id da semente) que responderam 2xx. */
  readonly camada2xx: string[];
  readonly camadaStatus: string[];
  /** Controle positivo (A): a chamada natural e o que ela trouxe. */
  readonly natural?: { readonly url: string; readonly k: string; readonly marcadorRegra?: string; readonly forma: "lista" | "objeto" };
  /** As chamadas naturais das rotas numeradas (R10a/R10b separados), com o marcador cumprido ou não, por marcador. */
  readonly naturaisR: Array<{ readonly r: string; readonly url: string; readonly k: string; readonly cumpre: Record<string, boolean> }>;
};

export type ResultadoOraculo = { readonly semente: Semente; readonly usuarios: Usuarios; readonly obs: Observacao[]; readonly ms: number };

const ehNegacao = (k: string) => /^(401|403):/.test(k);

export async function observar(
  http: Http,
  h: Cabecalhos,
  u: Usuarios,
  s: Semente,
  U: readonly ElementoU[],
  entityTypes: readonly string[],
): Promise<Observacao[]> {
  const ids = idsDaSemente(s);
  const variantes = variantesDeQuery(s, u, entityTypes);
  const papeis: Array<[string, string, string]> = [
    ["ft", u.B, "field_technician"],
    ["tec", u.C, "technician"],
  ];
  const obs: Observacao[] = [];
  for (const e of U) {
    const nomes = nomesDeParametro(e.caminho);
    const urlsSemente = nomes.length === 0 ? variantes.map((q) => e.caminho + q) : combinacoes(nomes.length, ids).map((c) => substituir(e.caminho, c));
    const aleatorio = substituir(e.caminho, nomes.map(() => randomUUID()));
    const vazamentos: Vazamento[] = [];
    const kAleatorio: Record<string, string> = {};
    const diferencas: Observacao["diferencas"] = [];
    const idOsXSemFiltro: Observacao["idOsXSemFiltro"] = [];
    const filtroDiferente: Observacao["filtroDiferente"] = [];
    const respostasNaoNegadas: string[] = [];
    const camada2xx: string[] = [];
    const camadaStatus: string[] = [];
    for (const [papel, usuario, role] of papeis) {
      const H = h(usuario, role);
      const H0 = h(usuario, role, true);
      const rAle = await http(e.method, aleatorio, H);
      kAleatorio[papel] = rAle.k;
      for (const extra of [rAle, await http(e.method, aleatorio, H0)]) if (!ehNegacao(extra.k)) respostasNaoNegadas.push(`${papel} ${aleatorio} ${extra.k}`);
      for (const url of urlsSemente) {
        const r = await http(e.method, url, H);
        const can = canariosNoCorpo(r, s);
        if (can.length) vazamentos.push({ papel, url, canarios: can });
        if (nomes.length > 0 && r.k !== rAle.k) diferencas.push({ papel, url, k: r.k });
        if (!ehNegacao(r.k)) respostasNaoNegadas.push(`${papel} ${url} ${r.k}`);
        const r0 = await http(e.method, url, H0);
        if (!ehNegacao(r0.k)) respostasNaoNegadas.push(`${papel}(sem permissão) ${url} ${r0.k}`);
        if (e.tipo === "MIDDLEWARE") {
          camadaStatus.push(`${papel} ${url} ${r.s}`);
          if (r.s >= 200 && r.s < 300) camada2xx.push(`${papel} ${url} ${r.s}`);
        }
      }
      if (nomes.length === 0) {
        const plano = await http(e.method, e.caminho, H);
        if (plano.s >= 200 && plano.s < 300 && plano.text.includes(s.osX)) idOsXSemFiltro.push({ papel });
        const R = randomUUID();
        const formas: Array<["a" | "b", (id: string) => string]> = [
          ["a", (id) => `?workOrderId=${id}`],
          ["b", (id) => `?workOrderId=${id}&checklistId=${s.checklistId}&roleAware=1`],
        ];
        for (const [forma, q] of formas) {
          const rX = await http(e.method, e.caminho + q(s.osX), H);
          const rR = await http(e.method, e.caminho + q(R), H);
          // Igualdade módulo o ECO do filtro: o corpo da OS-X com o id trocado pelo aleatório tem de ser o do aleatório.
          const igual = mesmoModuloEco(rX, rR, s.osX, R);
          if (!igual) filtroDiferente.push({ papel, forma, kX: rX.k, kR: rR.k });
        }
      }
    }
    // Controle positivo (A): a chamada natural. Sem parâmetro, a 1ª variante em que A recebe dado da OS-X que não é eco.
    const HA = h(u.A, "field_technician");
    let natural: Observacao["natural"];
    if (e.tipo === "ROTA") {
      const candidatas = nomes.length === 0 ? variantes : [""];
      for (const q of candidatas) {
        const url = nomes.length === 0 ? e.caminho + q : urlNatural(e.chave, "", s);
        if (!url) break;
        const r = await http(e.method, url, HA);
        const m = marcadorPorRegra(r, s);
        if (m === undefined) {
          if (natural === undefined) natural = { url, k: r.k, forma: formaDoCorpo(r) };
          continue;
        }
        if (q !== "" && q.includes(s.osX)) {
          const R = randomUUID();
          const rR = await http(e.method, e.caminho + q.replaceAll(s.osX, R), HA);
          if (mesmoModuloEco(r, rR, s.osX, R)) continue; // só o eco do filtro
        }
        natural = { url, k: r.k, marcadorRegra: m, forma: formaDoCorpo(r) };
        break;
      }
    }
    const naturaisR: Observacao["naturaisR"] = [];
    for (const rn of R_ROTAS.filter((x) => x.chave === e.chave)) {
      const url = urlNatural(rn.chave, rn.query, s);
      if (!url) continue;
      const r = await http(e.method, url, HA);
      const g = await http(e.method, url, h(u.gestor, "tenant_admin"));
      const cumpre: Record<string, boolean> = {};
      for (const m of MARCADORES) cumpre[m] = cumpreMarcador(m, r, s, g);
      naturaisR.push({ r: rn.r, url, k: r.k, cumpre });
    }
    obs.push({
      chave: e.chave,
      tipo: e.tipo,
      params: nomes.length,
      vazamentos,
      kAleatorio,
      diferencas,
      idOsXSemFiltro,
      filtroDiferente,
      so401403: respostasNaoNegadas.length === 0,
      respostasNaoNegadas: respostasNaoNegadas.slice(0, 6),
      camada2xx,
      camadaStatus: [...new Set(camadaStatus.map((x) => x.replace(/ [0-9a-f-]{36}/g, " <id>")))],
      ...(natural ? { natural } : {}),
      naturaisR,
    });
  }
  return obs;
}

/** O app do oráculo, em memória, num processo (o filho): core, organização, usuários reais, perfis, semente. */
export async function oraculoEmMemoria(c3: any, injecao?: string): Promise<ResultadoOraculo> {
  const inicio = Date.now();
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "memory";
  delete process.env.DATABASE_URL;
  delete process.env.REDIS_URL;
  const dirAnexos = fs.mkdtempSync(path.join(os.tmpdir(), "wo-leitura-anexos-"));
  process.env.CHECKLIST_STORAGE_LOCAL_DIR = dirAnexos;
  try {
    const root = new URL(pathToFileURL(RAIZ_DO_REPO).href + "/src/");
    const imp = (p: string) => import(new URL(p, root).href);
    const { createApp } = await imp("app.ts");
    const { CoreSaasRegistry } = await imp("modules/core-saas/services/core-saas.service.ts");
    const { MemoryCoreSaasAdapter } = await imp("modules/core-saas/services/memory-core-saas.adapter.ts");
    const { InMemoryCoreSaasStore } = await imp("modules/core-saas/store/core-saas.store.ts");
    const { createDefaultAttachmentEntityResolver } = await imp("modules/attachments/attachment-entity-resolver.ts");
    const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
    const t = core.createTenant({ name: "Censo de leitura", modules: ["work_orders", "field_operations", "tenant_checklist", "checklists"] });
    const gestor = core.createUser({ tenantId: t.id, name: "Gestor", email: "wol-g@example.com", roles: ["tenant_admin"] });
    const A = core.createUser({ tenantId: t.id, name: "Tecnico A", email: "wol-a@example.com", roles: ["field_technician"] });
    const B = core.createUser({ tenantId: t.id, name: "Tecnico B", email: "wol-b@example.com", roles: ["field_technician"] });
    const C = core.createUser({ tenantId: t.id, name: "Tecnico C", email: "wol-c@example.com", roles: ["technician"] });
    // Em memória o id do usuário do core é `usr_…`, não UUID: nenhum perfil de campo pode existir para ele
    // (`OperatorProfile.user_id` é UUID; `resolveListActorScope` só usa o ramo user id). O despacho atribui pelo user id,
    // a forma do app. O ramo do PERFIL é exercido na `-db` (usuários UUID, perfis reais).
    const app = createApp(new MemoryCoreSaasAdapter(core));
    if (injecao) await (await import(pathToFileURL(injecao).href)).inject(app);
    const server = app.listen(0, "127.0.0.1");
    await new Promise((r) => server.once("listening", r));
    try {
      const http = criarHttp("http://127.0.0.1:" + (server.address() as any).port);
      const h = cabecalhosDeMemoria(t.id);
      const usuarios: Usuarios = { gestor: gestor.id, A: A.id, B: B.id, C: C.id };
      const semente = await semear(http, h, usuarios);
      const entityTypes = [...createDefaultAttachmentEntityResolver().entityTypes()].sort();
      const obs = await observar(http, h, usuarios, semente, universo(c3), entityTypes);
      return { semente, usuarios, obs, ms: Date.now() - inicio };
    } finally {
      server.close();
    }
  } finally {
    fs.rmSync(dirAnexos, { recursive: true, force: true });
  }
}

// ------------------------------------------------------------------------------------------------
// O classificador — as violações, por categoria, e o instantâneo gerado pela regra.
// ------------------------------------------------------------------------------------------------
export type ClassificacaoLeitura = {
  readonly violacoes: string[];
  readonly gerado: InstantaneoLeitura;
  readonly chaves: number;
  readonly resumo: string[];
};

/** A classe e o marcador que a REGRA dá à observação (o `gravar`). */
function classePorRegra(e: ElementoU, o: Observacao | undefined): EntradaInstantaneo {
  if (e.tipo === "MIDDLEWARE") return { classe: CLASSE_CAMADA, nota: NOTA_CAMADA };
  if (o?.so401403) return { classe: CLASSE_NAO_ALCANCADA };
  const m = o?.natural?.marcadorRegra;
  if (o && m) {
    const classe = o.params > 0 ? CLASSE_OS : o.natural?.forma === "lista" ? CLASSE_LISTA : CLASSE_AGREGADO;
    return { classe, marcador: m };
  }
  // Sem dado de OS-X na resposta de A. O `/audit-logs` em memória devolve `{"items":[]}` (nenhum escritor grava
  // `entity: "work_order"`, Emenda 2 §2.1): o marcador dele é `igual-ao-gestor`, e a classe vem do caminho.
  if (o && o.params > 0 && o.naturaisR.some((n) => n.cumpre["igual-ao-gestor"])) return { classe: CLASSE_OS, marcador: "igual-ao-gestor" };
  const nota = NOTAS_FIXAS[e.chave];
  const pend = PENDENCIAS_POR_PREFIXO.find(([re]) => re.test(e.chave))?.[1];
  return { classe: CLASSE_SEM_DADO, ...(nota ? { nota } : {}), ...(pend ? { pendencia: pend } : {}) };
}

export function classificarLeitura(c3: any, oraculo: ResultadoOraculo, snap: InstantaneoLeitura | null): ClassificacaoLeitura {
  const U = universo(c3);
  const porChave = new Map(oraculo.obs.map((o) => [o.chave, o]));
  const rotasGet = new Set((c3.rotas as any[]).filter((r) => r.method === "GET").map((r) => r.path));
  const tocaCaminho = new Set((c3.rotas as any[]).filter((r) => r.tocaCaminho).map((r) => `${r.method} ${r.path}`));
  const k3 = new Map((c3.rotas as any[]).map((r) => [`${r.method} ${r.path}`, r]));
  const viol: string[] = [];
  const add = (cat: string, x: string) => viol.push(`${cat}: ${x}`);
  const gerado: InstantaneoLeitura = {};
  for (const e of U) gerado[e.chave] = classePorRegra(e, porChave.get(e.chave));
  const usado = snap ?? gerado;

  // T-L1 — toda chave de U no instantâneo, com classe da lista fechada; o bloco com marcador válido; nenhuma chave morta.
  for (const e of U) {
    const en = usado[e.chave];
    if (!en) {
      add("NAO-CLASSIFICADA", e.chave);
      continue;
    }
    if (!(CLASSES as readonly string[]).includes(en.classe)) add("CLASSE-FORA-DA-LISTA", `${e.chave} = ${en.classe}`);
    if (CLASSES_DO_BLOCO.includes(en.classe) && !(en.marcador && MARCADORES.includes(en.marcador))) add("MARCADOR-INVALIDO", `${e.chave} = ${en.marcador ?? "(ausente)"}`);
  }
  const vivas = new Set(U.map((e) => e.chave));
  for (const k of Object.keys(usado)) if (!vivas.has(k)) add("ENVELHECIDA", k);

  for (const e of U) {
    const o = porChave.get(e.chave);
    const en = usado[e.chave];
    if (!o) {
      add("SEM-OBSERVACAO", e.chave);
      continue;
    }
    // T-L2 — o canário, independente da classe.
    for (const v of o.vazamentos) add("CANARIO", `${rotulo(e.chave)} ${v.papel} ${e.chave} ${v.url} [${v.canarios.join(",")}]`);
    // T-L8 — camada sem rota GET própria não responde leitura.
    if (e.tipo === "MIDDLEWARE" && !rotasGet.has(e.caminho)) for (const x of o.camada2xx) add("MIDDLEWARE-RESPONDE-LEITURA", `${e.chave} ${x}`);
    if (!en) continue;
    // T-L3 — OS·LEITURA: a OS-X (toda combinação de ids da semente) ≡ o UUID aleatório.
    if (en.classe === CLASSE_OS) for (const d of o.diferencas) add("ORACULO-DE-EXISTENCIA", `${rotulo(e.chave)} ${d.papel} ${e.chave} ${d.url} ${d.k} ≠ ${o.kAleatorio[d.papel]}`);
    // T-L4 — LISTA: sem o id da OS-X na lista sem filtro; ?workOrderId=<X> ≡ <aleatório> nas duas formas.
    if (en.classe === CLASSE_LISTA) {
      for (const x of o.idOsXSemFiltro) add("LISTA-COM-ALHEIA", `${rotulo(e.chave)} ${x.papel} ${e.chave}`);
      for (const f of o.filtroDiferente) {
        const r = e.chave === "GET /api/v1/mobile/checklist-runs" ? (f.forma === "a" ? "R10a" : "R10b") : rotulo(e.chave);
        add("FILTRO-DIFERENTE", `${r} ${f.papel} ${e.chave} forma ${f.forma} ${f.kX} ≠ ${f.kR}`);
      }
    }
    // T-L5 — a classe bate com a propriedade.
    if (e.tipo === "MIDDLEWARE" && en.classe !== CLASSE_CAMADA) add("CLASSE-INCOMPATIVEL", `${e.chave} = ${en.classe} (camada é ${CLASSE_CAMADA})`);
    if (e.tipo !== "MIDDLEWARE" && en.classe === CLASSE_CAMADA) add("CLASSE-INCOMPATIVEL", `${e.chave} = ${CLASSE_CAMADA} (não é camada)`);
    if (en.classe === CLASSE_SEM_DADO && tocaCaminho.has(e.chave)) add("CLASSE-INCOMPATIVEL", `${e.chave} = ${CLASSE_SEM_DADO} (toca a OS pelo caminho)`);
    if (en.classe === CLASSE_SEM_DADO && o.vazamentos.length) add("CLASSE-INCOMPATIVEL", `${e.chave} = ${CLASSE_SEM_DADO} (mostra canário)`);
    if (en.classe === CLASSE_SEM_DADO && o.natural?.marcadorRegra) add("CLASSE-INCOMPATIVEL", `${e.chave} = ${CLASSE_SEM_DADO} (A recebe dado da OS: ${o.natural.marcadorRegra})`);
    // T-L6 — controle positivo: toda chave das 3 classes cumpre o seu marcador para A, em toda chamada numerada.
    if (CLASSES_DO_BLOCO.includes(en.classe) && en.marcador) {
      if (o.naturaisR.length === 0) add("SEM-CHAMADA-NATURAL", `${e.chave} (sem número R)`);
      for (const n of o.naturaisR) if (!n.cumpre[en.marcador]) add("ORACULO-CEGO", `${n.r} ${e.chave} ${n.url} ${n.k} não cumpre ${en.marcador}`);
    }
    // T-L7 — NAO-ALCANCADA só com prova: o censo (k dos dois papéis, com e sem permissão, id aleatório) e o oráculo.
    if (en.classe === CLASSE_NAO_ALCANCADA) {
      const r = k3.get(e.chave);
      const censoNega = r && ["field_technician", "technician"].every((p) => !r[p].alcanca && ehNegacao(r[p].k));
      if (!censoNega || !o.so401403) add("NAO-ALCANCADA-SEM-PROVA", `${e.chave} censo ${r ? ["field_technician", "technician"].map((p) => r[p].k).join("/") : "?"} · ${o.respostasNaoNegadas.slice(0, 2).join(" | ")}`);
    }
  }
  const cont: Record<string, number> = {};
  for (const e of U) {
    const c = usado[e.chave]?.classe ?? "NAO-CLASSIFICADA";
    cont[c] = (cont[c] ?? 0) + 1;
  }
  const resumo = [
    `universo: ${U.length} chaves (${U.filter((e) => e.tipo === "ROTA").length} GET/HEAD + ${U.filter((e) => e.tipo === "MIDDLEWARE").length} camadas com caminho)`,
    "classes: " + Object.entries(cont).sort().map(([c, n]) => `${c}=${n}`).join(" · "),
    `violações: ${viol.length}`,
    ...viol.slice(0, 40).map((x) => "  " + x),
  ];
  return { violacoes: viol, gerado, chaves: U.length, resumo };
}

// ------------------------------------------------------------------------------------------------
// Casca de execução — o oráculo roda num processo filho (o app guarda estado em memória de módulo, como no 07c).
// ------------------------------------------------------------------------------------------------
function rodarFilho(args: string[], timeoutMs: number): Promise<string> {
  const env = { ...process.env };
  delete env.DATABASE_URL;
  delete env.REDIS_URL;
  return new Promise((resolve, reject) => {
    execFile(
      process.execPath,
      ["--import", "tsx", ESTE_ARQUIVO, ...args],
      { cwd: RAIZ_DO_REPO, env, timeout: timeoutMs, maxBuffer: 64 * 1024 * 1024, windowsHide: true },
      (erro, stdout, stderr) => {
        if (erro) {
          reject(new Error(`oráculo de leitura (${args[0]}) falhou: ${erro.message}\n${String(stderr).slice(-4000)}`));
          return;
        }
        resolve(String(stdout));
      },
    );
  });
}

export async function executarOraculo(c3: any, opcoes: { readonly injecao?: string; readonly timeoutMs?: number } = {}): Promise<ResultadoOraculo> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "wo-leitura-oraculo-"));
  try {
    const arqC3 = path.join(dir, "c3.json");
    const arqSaida = path.join(dir, "obs.json");
    fs.writeFileSync(arqC3, JSON.stringify(c3));
    await rodarFilho(["oraculo", arqC3, arqSaida, ...(opcoes.injecao ? [opcoes.injecao] : [])], opcoes.timeoutMs ?? 900_000);
    return JSON.parse(fs.readFileSync(arqSaida, "utf8"));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/** Censo do 07c (o universo) + o oráculo de leitura, com a mesma injeção nos dois. */
export async function executarCensoDeLeitura(opcoes: { readonly injecao?: string } = {}): Promise<{ c3: any; oraculo: ResultadoOraculo; ms: number }> {
  const inicio = Date.now();
  const censo = await executarCenso(opcoes.injecao ? { injecao: opcoes.injecao } : {});
  const oraculo = await executarOraculo(censo.c3, opcoes);
  return { c3: censo.c3, oraculo, ms: Date.now() - inicio };
}

async function main(argv: string[]): Promise<void> {
  const [modo, ...resto] = argv;
  if (modo === "oraculo") {
    const c3 = JSON.parse(fs.readFileSync(resto[0], "utf8"));
    const r = await oraculoEmMemoria(c3, resto[2]);
    fs.writeFileSync(resto[1], JSON.stringify(r));
    console.log(`oráculo: ${r.obs.length} chaves em ${r.ms} ms`);
    process.exit(0);
  }
  if (modo === "gravar") {
    const { c3, oraculo, ms } = await executarCensoDeLeitura({});
    const cl = classificarLeitura(c3, oraculo, null);
    fs.writeFileSync(resto[0], serializarInstantaneo(cl.gerado));
    console.log([...cl.resumo, `instantâneo gravado: ${Object.keys(cl.gerado).length} chaves (${ms} ms)`].join("\n"));
    process.exit(0);
  }
  console.error("uso: oraculo <c3.json> <saida.json> [injecao] | gravar <instantaneo.json>");
  process.exit(2);
}

const chamadoDireto = (() => {
  if (!process.argv[1]) return false;
  const a = path.resolve(process.argv[1]);
  return process.platform === "win32" ? a.toLowerCase() === ESTE_ARQUIVO.toLowerCase() : a === ESTE_ARQUIVO;
})();
if (chamadoDireto) {
  main(process.argv.slice(2)).catch((erro) => {
    console.error(erro);
    process.exit(1);
  });
}
