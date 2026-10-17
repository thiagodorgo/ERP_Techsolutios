// B-O6R-07c-a (07c-a.3 do plano) — o gerador v3 do guard, PORTADO SEM MUDAR O ALGORITMO.
//
// Origem: `docs/revisoes/SAN3/B-O6R-07c-plano.md`, Apêndice A (`census-v3.mts`, `sync-v3.mts`, `tipos-v3.mts`,
// `classify-v3.cjs`). O corpo de cada função abaixo é o do apêndice; o que muda é só a casca:
//   - o que o script lia de `process.argv` vira parâmetro, e o que ele gravava em arquivo vira retorno;
//   - o `process.exit` do script fica na ponta de linha de comando deste arquivo (`main`), não no algoritmo.
// A C2 da junta compara as contagens com um gerador DELA — por isso o algoritmo não pode ter sido "melhorado".
//
// Por que cada censo roda num PROCESSO FILHO: o censo de camadas intercepta `Router.prototype.use/route` e
// `express.application.use` ANTES de o app nascer, e embrulha o `handle` de cada camada que visita; o app guarda
// estado em memória de módulo (OS, despachos, recibos de sync). Duas passadas no mesmo processo herdariam as
// interceptações e o estado uma da outra. Um processo por passada é o que o apêndice fazia (um `node` por script).
//
// Uso como biblioteca (testes): `executarCenso({ injecao })` → `{ c3, s3 }`; `classificar(c3, s3, instantaneo)`.
// Uso como linha de comando (cwd = raiz do repositório):
//   node --import tsx tests/helpers/o6r07c-census.ts censo <saida-c3.json> [injecao.mts]
//   node --import tsx tests/helpers/o6r07c-census.ts lotes <c3.json> <saida-s3.json> [injecao.mts]
//   node --import tsx tests/helpers/o6r07c-census.ts gravar <instantaneo.json>
// O `gravar` regenera o instantâneo pelas REGRAS (é o `classify-v3.cjs --gravar`): o diff dele é revisado.
import { execFile, execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ESTE_ARQUIVO = fileURLToPath(import.meta.url);
export const RAIZ_DO_REPO = path.resolve(path.dirname(ESTE_ARQUIVO), "..", "..");

// ================================================================================================
// census-v3.mts (Apêndice A) — TODA camada que pode responder a uma requisição é contada.
// ================================================================================================
// Censo v3 do B-O6R-07c (resposta ao B1 e ao B3 da r2): TODA camada que pode responder a uma requisição é contada.
//  - Interceptação do registro (Router.prototype.use/route e express.application.use) anota caminho e sub-app.
//  - O walk conta TODA camada: ROTA (por método), ROTEADOR, SUBAPP (e desce nele) e MIDDLEWARE (terminal, com
//    contagem por chave). Camada que o walk não sabe compor (caminho não textual) é contada como SEM-CAMINHO.
//  - Cada camada é instrumentada: o cabeçalho x-censo-07c da resposta diz QUEM respondeu (ROTA ou MIDDLEWARE).
//  - Alcance sem ler texto de motivo: a resposta do papel com as permissões dele × a do MESMO papel sem permissão
//    nenhuma (x-permissions: nenhuma). Igual = o RBAC decide (não alcança). Diferente = alcança.
//  - Pertença à OS por comportamento: trocar um parâmetro do caminho por uma OS/vistoria/despacho reais muda a
//    resposta (toca-por-caminho); pôr work_order_id real no corpo muda a resposta (toca-por-corpo).
//  - Leitura que escreve: em toda leitura da propriedade, a impressão digital da OS (detalhe, comentários, anexos,
//    linha do tempo, vistorias, despachos) é tirada antes e depois da requisição do técnico NÃO atribuído.
export async function censoCamadas(injecao?: string): Promise<{ res: any; resumo: string[] }> {
  process.env.LOG_LEVEL = "silent"; process.env.CORE_SAAS_PERSISTENCE = "memory";
  delete process.env.DATABASE_URL; delete process.env.REDIS_URL;
  const req0 = createRequire(process.cwd() + "/package.json");
  const express = req0("express");
  const RouterPkg = createRequire(req0.resolve("express"))("router");
  const parseMount = (args: any[]) => { let path: any = "/"; let off = 0; if (typeof args[0] !== "function") { let a = args[0]; while (Array.isArray(a) && a.length) a = a[0]; if (typeof a !== "function") { path = args[0]; off = 1; } } return { path, fns: args.slice(off).flat(Infinity) }; };
  const origUse = RouterPkg.prototype.use; const origRoute = RouterPkg.prototype.route; const origAppUse = express.application.use;
  RouterPkg.prototype.use = function (...args: any[]) { const before = this.stack.length; const { path } = parseMount(args); const out = origUse.apply(this, args); for (const l of this.stack.slice(before)) l.__mount = path; return out; };
  RouterPkg.prototype.route = function (path: any) { const before = this.stack.length; const r = origRoute.call(this, path); for (const l of this.stack.slice(before)) l.__path = path; return r; };
  express.application.use = function (...args: any[]) {
    const st = this.router.stack; const before = st.length; const { fns } = parseMount(args);
    const out = origAppUse.apply(this, args);
    st.slice(before).forEach((l: any, i: number) => { const f = fns[i]; if (f && f.handle && f.set) l.__subapp = f; });
    return out;
  };
  const origWriteHead = http.ServerResponse.prototype.writeHead;
  http.ServerResponse.prototype.writeHead = function (...a: any[]) { try { if (!this.headersSent) this.setHeader("x-censo-07c", encodeURIComponent((this as any).req?.__resp ?? "")); } catch {} return origWriteHead.apply(this, a as any); };
  const root = new URL(pathToFileURL(process.cwd()).href + "/src/");
  const imp = (p: string) => import(new URL(p, root).href);
  const { createApp } = await imp("app.ts");
  const { CoreSaasRegistry } = await imp("modules/core-saas/services/core-saas.service.ts");
  const { MemoryCoreSaasAdapter } = await imp("modules/core-saas/services/memory-core-saas.adapter.ts");
  const { InMemoryCoreSaasStore } = await imp("modules/core-saas/store/core-saas.store.ts");
  const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const t = core.createTenant({ name: "Censo v3 07c", modules: ["work_orders", "field_operations", "tenant_checklist", "checklists"] });
  const mgr = core.createUser({ tenantId: t.id, name: "M", email: "c3-m@example.com", roles: ["manager"] });
  const tecA = core.createUser({ tenantId: t.id, name: "A", email: "c3-a@example.com", roles: ["field_technician"] });
  const tecB = core.createUser({ tenantId: t.id, name: "B", email: "c3-b@example.com", roles: ["field_technician"] });
  const app = createApp(new MemoryCoreSaasAdapter(core));
  if (injecao) await (await import(pathToFileURL(injecao).href)).inject(app);
  const server = app.listen(0, "127.0.0.1"); await new Promise((r) => server.once("listening", r));
  const base = "http://127.0.0.1:" + (server.address() as any).port;
  const H = (uid: string, role: string, semPerm = false) => ({ "content-type": "application/json", "x-tenant-id": t.id, "x-user-id": uid, "x-role": role, ...(semPerm ? { "x-permissions": "nenhuma" } : {}) });
  async function chamar(method: string, path: string, h: any, body?: unknown) {
    const r = await fetch(base + path, { method, headers: h, body: method === "GET" || method === "HEAD" ? undefined : JSON.stringify(body ?? {}), signal: AbortSignal.timeout(4000) }).catch(() => null);
    if (!r) return { s: 0, k: "sem-resposta", resp: "", j: null as any };
    const resp = decodeURIComponent(r.headers.get("x-censo-07c") ?? "");
    const tx = await r.text().catch(() => ""); let j: any = null; try { j = JSON.parse(tx); } catch {}
    return { s: r.status, k: r.status + ":" + (j?.error?.code ?? "") + ":" + (j?.error?.reason ?? ""), resp, j };
  }
  // Semente: OS atribuída ao tecA (por user id, a forma do app), modelo publicado, despacho ao tecA (provisiona a vistoria).
  const ADM = mgr.id;
  const tpl = await chamar("POST", "/api/v1/tenant/checklists", H(ADM, "tenant_admin"), { name: "Coleta", type: "technical_evidence", schema: {}, components: [{ componentKey: "ok", type: "observation", label: "ok?", required: false, config: {}, validationRules: {}, visibilityRules: {} }] });
  await chamar("POST", "/api/v1/tenant/checklists/" + tpl.j.data.id + "/publish", H(ADM, "tenant_admin"), {});
  const wo = await chamar("POST", "/api/v1/work-orders", H(ADM, "tenant_admin"), { title: "OS censo", checklistId: tpl.j.data.id });
  const osA = wo.j.data.id;
  const disp = await chamar("POST", "/api/v1/operations/dispatches", H(ADM, "tenant_admin"), { workOrderId: osA, operatorUserId: tecA.id });
  await chamar("POST", "/api/v1/work-orders/" + osA + "/assign", H(ADM, "tenant_admin"), { userId: tecA.id });
  const runs = await chamar("GET", "/api/v1/mobile/checklist-runs?workOrderId=" + osA, H(ADM, "tenant_admin"));
  const runA = runs.j?.data?.[0]?.id; const dispA = disp.j?.data?.id;
  if (!osA || !runA || !dispA) { throw new Error("semente incompleta " + JSON.stringify({ osA, runA, dispA })); }
  const ids = [osA, runA, dispA];
  const join = (a: string, b: string) => (a.replace(/[/]+$/, "") + "/" + String(b).replace(/^[/]+/, "")).replace(/[/]+$/, "") || "/";
  const contagem = new Map<string, number>(); const conta = (k: string) => contagem.set(k, (contagem.get(k) ?? 0) + 1);
  type Rota = { method: string; path: string };
  const rotas: Rota[] = []; const montagens: string[] = []; const semCaminho: string[] = [];
  const mwComCaminho: Array<{ key: string; path: string }> = [];
  const VERBOS = ["get", "post", "put", "patch", "delete"];
  function envolver(l: any, chave: string) {
    const h = l.handle; if (typeof h !== "function" || h.__censo) return;
    const w = h.length === 4 ? function (this: any, e: any, q: any, s: any, n: any) { q.__resp = chave; return h.call(this, e, q, s, n); } : function (this: any, q: any, s: any, n: any) { q.__resp = chave; return h.call(this, q, s, n); };
    (w as any).__censo = true; l.handle = w;
  }
  (function walk(stack: any[], prefix: string) {
    for (const l of stack) {
      if (l.route) {
        const p = l.__path ?? l.route.path;
        if (typeof p !== "string") { semCaminho.push("ROTA " + prefix + " " + JSON.stringify(p)); conta("SEM-CAMINHO " + prefix); continue; }
        const full = join(prefix, p);
        const ms = new Set(Object.keys(l.route.methods).flatMap((m) => (m === "_all" ? VERBOS : [m])));
        for (const m of ms) { conta("ROTA " + m.toUpperCase() + " " + full); rotas.push({ method: m.toUpperCase(), path: full }); }
        envolver(l, "ROTA " + full);
        continue;
      }
      const mp = l.__mount;
      if (typeof mp !== "string") { semCaminho.push("CAMADA " + prefix + " " + String(mp)); conta("SEM-CAMINHO " + prefix); continue; }
      const pre = join(prefix, mp);
      if (l.__subapp) { conta("SUBAPP " + pre); montagens.push(pre); walk(l.__subapp.router.stack, pre); continue; }
      if (l.handle && l.handle.stack) { conta("ROTEADOR " + pre); montagens.push(pre); walk(l.handle.stack, pre); continue; }
      const chave = "MIDDLEWARE " + pre + " · " + ((l.handle && l.handle.name) || "(anônima)");
      conta(chave); envolver(l, chave);
      if (mp !== "/") mwComCaminho.push({ key: chave, path: pre });
    }
  })((app as any).router.stack, "");
  const PARAM = /:([A-Za-z0-9_]+)/g;
  const nParams = (p: string) => (p.match(PARAM) ?? []).length;
  const sub = (p: string, vals: string[]) => { let i = 0; return p.replace(PARAM, () => vals[i++]); };
  const USR: Record<string, string> = { field_technician: tecB.id, technician: randomUUID() };
  const mwRespostas = new Map<string, Set<string>>(); const mwSucesso: string[] = [];
  const anotar = (o: any, papel: string, alvo: string) => {
    if (!o.resp.startsWith("MIDDLEWARE")) return;
    const s = mwRespostas.get(o.resp) ?? new Set<string>(); s.add(String(o.s)); mwRespostas.set(o.resp, s);
    if (o.s > 0 && o.s < 400) mwSucesso.push(papel + " " + alvo + " → " + o.s + " por " + o.resp);
  };
  const saida: any[] = [];
  // Fase 1 — alcance diferencial, ids aleatórios (nada de semente toca o estado).
  for (const r of rotas) {
    const rnd = Array.from({ length: nParams(r.path) }, () => randomUUID());
    const url = sub(r.path, rnd);
    const row: any = { method: r.method, path: r.path };
    for (const papel of ["field_technician", "technician"]) {
      const o = await chamar(r.method, url, H(USR[papel], papel)); const o0 = await chamar(r.method, url, H(USR[papel], papel, true));
      row[papel] = { k: o.k, resp: o.resp, alcanca: o.k !== o0.k }; anotar(o, papel, r.method + " " + r.path);
    }
    row.admin = (await chamar(r.method, url, H(ADM, "tenant_admin"))).k;
    row.rnd = rnd; saida.push(row);
  }
  // Fase 1b — middleware com caminho próprio e varredura de caminho inexistente em cada montagem.
  for (const m of mwComCaminho) for (const v of VERBOS) for (const papel of ["field_technician", "technician"]) {
    const o = await chamar(v.toUpperCase(), sub(m.path, Array.from({ length: nParams(m.path) }, () => randomUUID())), H(USR[papel], papel)); anotar(o, papel, v.toUpperCase() + " " + m.path);
  }
  for (const pre of new Set(montagens)) for (const v of VERBOS) for (const papel of ["field_technician", "technician"]) {
    const p = join(pre, "__censo_07c__/x"); const o = await chamar(v.toUpperCase(), sub(p, Array.from({ length: nParams(p) }, () => randomUUID())), H(USR[papel], papel)); anotar(o, papel, v.toUpperCase() + " " + p);
  }
  // Fase 2 — leitura que escreve: impressão digital do estado da OS antes/depois de cada GET/HEAD do técnico NÃO atribuído.
  async function digital() {
    const a = H(ADM, "tenant_admin"); const partes: string[] = [];
    for (const p of ["/api/v1/work-orders/" + osA, "/api/v1/work-orders/" + osA + "/comments", "/api/v1/work-orders/" + osA + "/attachments", "/api/v1/work-orders/" + osA + "/timeline", "/api/v1/mobile/checklist-runs?workOrderId=" + osA, "/api/v1/operations/dispatches"]) partes.push(JSON.stringify((await chamar("GET", p, a)).j));
    return partes.join("|");
  }
  const leituraEscreve: string[] = [];
  for (const row of saida.filter((x) => x.method === "GET" || x.method === "HEAD")) {
    const n = nParams(row.path); const tentativas: string[][] = n === 0 ? [[]] : [];
    for (let i = 0; i < n; i++) for (const id of ids) tentativas.push(row.rnd.map((v: string, j: number) => (j === i ? id : v)));
    for (const vals of tentativas) { const d0 = await digital(); await chamar(row.method, sub(row.path, vals), H(tecB.id, "field_technician")); const d1 = await digital(); if (d0 !== d1) { leituraEscreve.push(row.method + " " + row.path + " " + JSON.stringify(vals)); row.leituraEscreve = true; } }
  }
  // Fase 3 — pertença à OS por comportamento (gestor, que alcança tudo): caminho e corpo. Pode mutar a semente: vem por último.
  for (const row of saida) {
    const n = nParams(row.path);
    for (let i = 0; i < n && !row.tocaCaminho; i++) for (const id of ids) {
      const o = await chamar(row.method, sub(row.path, row.rnd.map((v: string, j: number) => (j === i ? id : v))), H(ADM, "tenant_admin"));
      if (o.k !== row.admin) { row.tocaCaminho = true; break; }
    }
    if (row.method !== "GET" && row.method !== "HEAD") {
      const url = sub(row.path, row.rnd);
      const o1 = await chamar(row.method, url, H(ADM, "tenant_admin"), { work_order_id: osA, workOrderId: osA });
      const o2 = await chamar(row.method, url, H(ADM, "tenant_admin"), { work_order_id: randomUUID(), workOrderId: randomUUID() });
      if (o1.k !== o2.k) row.tocaCorpo = true;
    }
  }
  server.close();
  const res = { semente: { osA, runA, dispA }, contagem: Object.fromEntries([...contagem].sort()), semCaminho, mwSucesso, mwRespostas: Object.fromEntries([...mwRespostas].map(([k, v]) => [k, [...v].sort()])), leituraEscreve, rotas: saida };
  const tipo = (p: string) => [...contagem.keys()].filter((k) => k.startsWith(p)).reduce((a, k) => a + (contagem.get(k) ?? 0), 0);
  const resumo = [
    "camadas: ROTA " + tipo("ROTA ") + " · ROTEADOR " + tipo("ROTEADOR ") + " · SUBAPP " + tipo("SUBAPP ") + " · MIDDLEWARE " + tipo("MIDDLEWARE ") + " (" + [...contagem.keys()].filter((k) => k.startsWith("MIDDLEWARE ")).length + " chaves) · SEM-CAMINHO " + tipo("SEM-CAMINHO "),
    "alcançadas (diferencial): field_technician " + saida.filter((x) => x.field_technician.alcanca).length + " · technician " + saida.filter((x) => x.technician.alcanca).length + " · toca-por-caminho " + saida.filter((x) => x.tocaCaminho).length + " · toca-por-corpo " + saida.filter((x) => x.tocaCorpo).length,
    "middleware que respondeu sucesso ao campo: " + mwSucesso.length + " · leitura que escreve: " + leituraEscreve.length,
    ...mwSucesso.slice(0, 10).map((x) => "MW-SUCESSO " + x),
    ...leituraEscreve.slice(0, 10).map((x) => "LEITURA-ESCREVE " + x),
  ];
  return { res, resumo };
}

// ================================================================================================
// sync-v3.mts (Apêndice A) — os lotes de sync.
// ================================================================================================
// Censo v3 dos lotes de sync (resposta ao B2 da r2). Nada de texto de motivo, nada de forma de literal:
//  - Tipos candidatos = o que o DESPACHANTE compara com o campo `type` (tipos-v3.mts, todo src/); o que não se resolve
//    e todo despacho por prefixo vão para a lista de falhas.
//  - Lote = rota POST cuja resposta a um envelope com tipo inexistente difere da resposta a `{}` (ou que ecoa a ação).
//  - Tipo ACEITO pelo lote = a resposta do gestor (que tem todas as permissões) a esse tipo difere da resposta a um tipo
//    inexistente. Tipo ALCANÇADO pelo papel de campo = aceito E a resposta do papel é IGUAL à do gestor (a permissão por
//    ação não o barrou). Comparação de respostas por igualdade — nenhuma leitura de substring.
//  - Curinga dinâmico: `<família>.<inexistente>` aceito por algum lote.
export async function censoLotes(c3: any, injecao?: string): Promise<{ res: any; resumo: string[] }> {
  process.env.LOG_LEVEL = "silent"; process.env.CORE_SAAS_PERSISTENCE = "memory";
  delete process.env.DATABASE_URL; delete process.env.REDIS_URL;
  const root = new URL(pathToFileURL(process.cwd()).href + "/src/");
  const imp = (p: string) => import(new URL(p, root).href);
  const { createApp } = await imp("app.ts");
  const { CoreSaasRegistry } = await imp("modules/core-saas/services/core-saas.service.ts");
  const { MemoryCoreSaasAdapter } = await imp("modules/core-saas/services/memory-core-saas.adapter.ts");
  const { InMemoryCoreSaasStore } = await imp("modules/core-saas/store/core-saas.store.ts");
  const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const t = core.createTenant({ name: "Censo sync v3", modules: ["work_orders"] });
  const app = createApp(new MemoryCoreSaasAdapter(core));
  if (injecao) await (await import(pathToFileURL(injecao).href)).inject(app);
  const arquivos = execFileSync("git", ["ls-files", "src"], { encoding: "utf8" }).split(String.fromCharCode(10)).filter((f) => /[.]ts$/.test(f) && !/test/.test(f)).map((f) => process.cwd() + "/" + f);
  const an = analisarTipos(arquivos);
  const server = app.listen(0, "127.0.0.1"); await new Promise((r) => server.once("listening", r));
  const base = "http://127.0.0.1:" + (server.address() as any).port;
  const ADM = randomUUID(); const USR: Record<string, string> = { field_technician: randomUUID(), technician: randomUUID() };
  const PARAM = /:([A-Za-z0-9_]+)/g;
  async function saida(path: string, uid: string, papel: string, corpo: any): Promise<string> {
    const r = await fetch(base + path.replace(PARAM, () => randomUUID()), { method: "POST", headers: { "content-type": "application/json", "x-tenant-id": t.id, "x-user-id": uid, "x-role": papel }, body: JSON.stringify(corpo), signal: AbortSignal.timeout(4000) }).catch(() => null);
    if (!r) return "sem-resposta";
    const j: any = await r.json().catch(() => ({}));
    const id = corpo && corpo.actions && corpo.actions[0] ? corpo.actions[0].client_action_id : "";
    const d = (j && j.data) || {};
    for (const k of Object.keys(d)) if (Array.isArray(d[k])) for (const a of d[k]) if (a && (a.client_action_id === id || a.client_evidence_id === id || a.clientActionId === id)) return r.status + "|" + k + "|" + ((a.error && a.error.code) || "") + "|" + ((a.error && a.error.reason) || "") + "|" + (a.status || "");
    return r.status + "|lote|" + ((j && j.error && j.error.code) || "") + "|" + ((j && j.error && j.error.reason) || "");
  }
  const env = (type: string) => { const id = randomUUID(); return { client_batch_id: randomUUID(), actions: [{ client_action_id: id, clientActionId: id, client_evidence_id: id, type, local_created_at: new Date().toISOString(), payload: { work_order_id: randomUUID(), run_id: randomUUID(), local_run_id: randomUUID(), component_id: randomUUID(), status: "accepted", mileage_start: 1, note: "x", observation: "x", message: "x", value: "x" } }] }; };
  const INEX1 = "__tipo_inexistente_07c_a__"; const INEX2 = "__tipo_inexistente_07c_b__";
  const posts: string[] = [...new Set<string>(c3.rotas.filter((x: any) => x.method === "POST").map((x: any) => x.path))];
  const lotes: string[] = []; const instaveis: string[] = [];
  for (const p of posts) { const a = await saida(p, ADM, "tenant_admin", env(INEX1)); const v = await saida(p, ADM, "tenant_admin", {}); if (a !== v || a.split("|")[1] !== "lote") { lotes.push(p); const b = await saida(p, ADM, "tenant_admin", env(INEX2)); if (a !== b) instaveis.push(p + " : " + a + " × " + b); } }
  // O texto vazio é recusado pelo parser do envelope antes do despacho: não nomeia handler.
  const candidatos = [...an.tipos.keys()].filter((x) => x.length > 0).sort();
  const familias = [...new Set(candidatos.filter((x) => x.includes(".")).map((x) => x.split(".")[0]))];
  const pares: any[] = []; const curingaDinamico: string[] = [];
  for (const lote of lotes) {
    const ref = await saida(lote, ADM, "tenant_admin", env(INEX1));
    for (const tp of candidatos) {
      const a = await saida(lote, ADM, "tenant_admin", env(tp)); if (a === ref) continue;
      const row: any = { lote, type: tp, admin: a };
      for (const papel of ["field_technician", "technician"]) { const o = await saida(lote, USR[papel], papel, env(tp)); row[papel] = { k: o, alcanca: o === a }; }
      pares.push(row);
    }
    for (const f of familias) { const x = await saida(lote, ADM, "tenant_admin", env(f + "." + INEX1)); if (x !== ref) curingaDinamico.push(lote + " · " + f + "." + INEX1 + " → " + x); }
  }
  server.close();
  const res = { candidatos: candidatos.length, lotes, instaveis, naoResolvidos: an.naoResolvidos, curingasEstaticos: an.curingas, curingaDinamico, pares };
  const resumo = [
    "tipos candidatos (do despachante): " + candidatos.length + " | lotes: " + lotes.length + " | pares aceitos: " + pares.length + " (alcançados: field_technician " + pares.filter((x) => x.field_technician.alcanca).length + " · technician " + pares.filter((x) => x.technician.alcanca).length + ") | não resolvidos: " + an.naoResolvidos.length + " | curingas estáticos: " + an.curingas.length + " | curinga dinâmico: " + curingaDinamico.length + " | lotes instáveis: " + instaveis.length,
    ...lotes.map((l) => "lote: " + l),
  ];
  return { res, resumo };
}

// ================================================================================================
// tipos-v3.mts (Apêndice A) — os pontos em que o código DECIDE pelo campo `type`.
// ================================================================================================
// Extrator v3 de tipos de ação (resposta ao B2 da r2). Não procura LITERAIS com cara de tipo: procura os pontos em que
// o código DECIDE pelo campo `type` de uma ação (o discriminador do contrato do lote) e resolve o valor comparado.
//  Origem do "tipo" (contaminação): `X.type`, `X["type"]`, desestruturação `{ type }`; propaga por variável cujo
//  inicializador contém um tipo, e por parâmetro de função chamada com um tipo (ponto fixo, todo o programa).
//  Pontos de decisão: igualdade e desigualdade, `switch`/`case`, `C.includes(t)`/`C.has(t)`/`C.indexOf(t)`, `C[t]`,
//  e `t.startsWith/endsWith/includes(...)`/`re.test(t)` (despacho por prefixo: CURINGA estático).
//  Resolução (dobra de constante): literal, template com partes resolvíveis, concatenação, `as`/`satisfies`/
//  parênteses, `const` local ou importada (via checker), propriedade de objeto `const`, chaves de objeto e elementos
//  de array/Set/Map. O que não se resolve vai para `naoResolvidos` com arquivo:linha — e o guard falha nele.
// A fonte é lida por `fs.readFileSync(arquivo, "utf8")` (a mesma porta que as sondas da r2 emulam).
export type ResultadoTipos = { tipos: Map<string, string[]>; naoResolvidos: string[]; curingas: string[] };
export function analisarTipos(arquivos: string[]): ResultadoTipos {
  const ts = createRequire(process.cwd() + "/package.json")("typescript");
  const opts = { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.NodeNext, moduleResolution: ts.ModuleResolutionKind.NodeNext, noEmit: true, skipLibCheck: true, types: [] };
  const host = ts.createCompilerHost(opts, true);
  const origGet = host.getSourceFile.bind(host);
  host.getSourceFile = (f: string, lang: any, ...r: any[]) => (f.includes("node_modules") ? origGet(f, lang, ...r) : ts.createSourceFile(f, fs.readFileSync(f, "utf8"), lang, true));
  host.readFile = (f: string) => (fs.existsSync(f) ? fs.readFileSync(f, "utf8") : undefined);
  const prog = ts.createProgram(arquivos, opts, host);
  const chk = prog.getTypeChecker();
  const fontes = prog.getSourceFiles().filter((s: any) => !s.isDeclarationFile && !s.fileName.includes("node_modules"));
  const raiz = process.cwd().split(String.fromCharCode(92)).join("/") + "/";
  const sym = (n: any) => { let s = chk.getSymbolAtLocation(n); if (s && s.flags & ts.SymbolFlags.Alias) { try { s = chk.getAliasedSymbol(s); } catch {} } return s; };
  const onde = (n: any) => { const sf = n.getSourceFile(); const p = sf.getLineAndCharacterOfPosition(n.getStart()); return sf.fileName.replace(raiz, "") + ":" + (p.line + 1); };
  const embrulho = (e: any) => ts.isParenthesizedExpression(e) || ts.isAsExpression(e) || (ts.isSatisfiesExpression && ts.isSatisfiesExpression(e)) || (ts.isTypeAssertionExpression && ts.isTypeAssertionExpression(e)) || ts.isNonNullExpression(e);
  const desemb = (e: any): any => (e && embrulho(e) ? desemb(e.expression) : e);
  const contaminados = new Set<any>();
  const ehTipo = (e0: any): boolean => {
    const e = desemb(e0); if (!e) return false;
    if (ts.isPropertyAccessExpression(e) && e.name.text === "type") return true;
    if (ts.isElementAccessExpression(e) && ts.isStringLiteralLike(e.argumentExpression) && e.argumentExpression.text === "type") return true;
    if (ts.isIdentifier(e)) { const s = sym(e); return Boolean(s && contaminados.has(s)); }
    if (ts.isCallExpression(e)) return e.arguments.some((a: any) => ehTipo(a));
    return false;
  };
  const contem = (n: any): boolean => { if (ehTipo(n)) return true; let a = false; ts.forEachChild(n, (c: any) => { if (!a && contem(c)) a = true; }); return a; };
  const marcar = (s: any) => { if (s && !contaminados.has(s)) { contaminados.add(s); return true; } return false; };
  let mudou = true; let voltas = 0;
  while (mudou && voltas < 20) {
    mudou = false; voltas++;
    for (const sf of fontes) (function v(n: any) {
      if (ts.isVariableDeclaration(n) && n.initializer && ts.isIdentifier(n.name) && contem(n.initializer)) { if (marcar(sym(n.name))) mudou = true; }
      if (ts.isBindingElement(n)) {
        const pn = n.propertyName; const nomeado = pn && ts.isIdentifier(pn) && pn.text === "type"; const curto = !pn && ts.isIdentifier(n.name) && n.name.text === "type";
        if ((nomeado || curto) && ts.isIdentifier(n.name)) { if (marcar(sym(n.name))) mudou = true; }
      }
      if (ts.isCallExpression(n)) n.arguments.forEach((a: any, i: number) => {
        if (!ehTipo(a)) return;
        const s = sym(n.expression); const d = s ? (s.valueDeclaration ?? (s.declarations ? s.declarations[0] : undefined)) : undefined;
        const ps = d ? (d.parameters ?? (d.initializer ? d.initializer.parameters : undefined)) : undefined;
        const p = ps ? ps[i] : undefined;
        if (p && ts.isIdentifier(p.name)) { if (marcar(sym(p.name))) mudou = true; }
      });
      ts.forEachChild(n, v);
    })(sf);
  }
  const declDe = (e: any) => { const s = sym(ts.isPropertyAccessExpression(e) ? e.name : e) || sym(e); return s ? (s.valueDeclaration ?? (s.declarations ? s.declarations[0] : undefined)) : undefined; };
  const dobrar = (e0: any, prof = 0): string | undefined => {
    const e = desemb(e0); if (!e || prof > 12) return undefined;
    if (ts.isStringLiteralLike(e)) return e.text;
    if (ts.isTemplateExpression(e)) { let s = e.head.text; for (const sp of e.templateSpans) { const x = dobrar(sp.expression, prof + 1); if (x === undefined) return undefined; s += x + sp.literal.text; } return s; }
    if (ts.isBinaryExpression(e) && e.operatorToken.kind === ts.SyntaxKind.PlusToken) { const a = dobrar(e.left, prof + 1); const b = dobrar(e.right, prof + 1); return a === undefined || b === undefined ? undefined : a + b; }
    if (ts.isIdentifier(e) || ts.isPropertyAccessExpression(e)) {
      const d = declDe(e); if (!d) return undefined;
      if (ts.isVariableDeclaration(d) && d.initializer && (ts.getCombinedNodeFlags(d) & ts.NodeFlags.Const)) return dobrar(d.initializer, prof + 1);
      if ((ts.isPropertyAssignment(d) || ts.isEnumMember(d)) && d.initializer) return dobrar(d.initializer, prof + 1);
    }
    return undefined;
  };
  const membros = (c0: any, prof = 0): string[] | undefined => {
    const c = desemb(c0); if (!c || prof > 8) return undefined;
    if (ts.isArrayLiteralExpression(c)) {
      const r: string[] = [];
      for (const el of c.elements) {
        if (ts.isSpreadElement(el)) { const m = membros(el.expression, prof + 1); if (!m) return undefined; r.push(...m); continue; }
        const d0 = desemb(el); const x = ts.isArrayLiteralExpression(d0) ? dobrar(d0.elements[0], prof + 1) : dobrar(el, prof + 1);
        if (x === undefined) return undefined; r.push(x);
      }
      return r;
    }
    if (ts.isObjectLiteralExpression(c)) {
      const r: string[] = [];
      for (const p of c.properties) {
        if (ts.isSpreadAssignment(p)) { const m = membros(p.expression, prof + 1); if (!m) return undefined; r.push(...m); continue; }
        const nm = p.name; if (!nm) return undefined;
        if (ts.isIdentifier(nm) || ts.isStringLiteralLike(nm) || ts.isNumericLiteral(nm)) r.push(nm.text);
        else if (ts.isComputedPropertyName(nm)) { const x = dobrar(nm.expression, prof + 1); if (x === undefined) return undefined; r.push(x); }
        else return undefined;
      }
      return r;
    }
    if (ts.isNewExpression(c)) return c.arguments && c.arguments.length ? membros(c.arguments[0], prof + 1) : [];
    if (ts.isCallExpression(c) && ts.isPropertyAccessExpression(c.expression) && ["keys", "values", "entries", "from"].includes(c.expression.name.text)) return membros(c.arguments[0], prof + 1);
    if (ts.isIdentifier(c) || ts.isPropertyAccessExpression(c)) { const d = declDe(c); if (d && (ts.isVariableDeclaration(d) || ts.isPropertyAssignment(d)) && d.initializer) return membros(d.initializer, prof + 1); }
    return undefined;
  };
  const tipos = new Map<string, string[]>(); const naoResolvidos: string[] = []; const curingas: string[] = [];
  const add = (v: string, n: any) => { const l = tipos.get(v) ?? []; l.push(onde(n)); tipos.set(v, l); };
  const IGUAL = [ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken, ts.SyntaxKind.EqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsToken];
  // Comparação com número, booleano, null/undefined ou typeof não é despacho de tipo de ação (o contrato é texto).
  const vazio = (e: any) => { const d = desemb(e); return (ts.isIdentifier(d) && d.text === "undefined") || d.kind === ts.SyntaxKind.NullKeyword || ts.isNumericLiteral(d) || d.kind === ts.SyntaxKind.TrueKeyword || d.kind === ts.SyntaxKind.FalseKeyword || ts.isTypeOfExpression(d) || (ts.isPrefixUnaryExpression(d) && ts.isNumericLiteral(d.operand)); };
  for (const sf of fontes) (function v(n: any) {
    if (ts.isBinaryExpression(n) && IGUAL.includes(n.operatorToken.kind)) {
      const a = ehTipo(n.left); const b = ehTipo(n.right);
      if (a !== b) { const outro = a ? n.right : n.left; const x = dobrar(outro); if (x !== undefined) add(x, n); else if (!vazio(outro)) naoResolvidos.push(onde(n) + ": " + n.getText().slice(0, 90)); }
    }
    if (ts.isSwitchStatement(n) && ehTipo(n.expression)) for (const cl of n.caseBlock.clauses) if (ts.isCaseClause(cl)) { const x = dobrar(cl.expression); if (x !== undefined) add(x, cl); else naoResolvidos.push(onde(cl) + ": case " + cl.expression.getText().slice(0, 80)); }
    if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression)) {
      const m = n.expression.name.text; const alvo = n.expression.expression;
      if (["includes", "has", "indexOf"].includes(m) && n.arguments[0] && ehTipo(n.arguments[0]) && !ehTipo(alvo)) { const ms = membros(alvo); if (ms) ms.forEach((x) => add(x, n)); else naoResolvidos.push(onde(n) + ": " + n.getText().slice(0, 90)); }
      if (["startsWith", "endsWith", "includes", "match", "search"].includes(m) && ehTipo(alvo)) curingas.push(onde(n) + ": " + n.getText().slice(0, 90));
      if (m === "test" && n.arguments[0] && ehTipo(n.arguments[0])) curingas.push(onde(n) + ": " + n.getText().slice(0, 90));
    }
    if (ts.isElementAccessExpression(n) && ehTipo(n.argumentExpression) && !ts.isStringLiteralLike(n.argumentExpression)) { const ms = membros(n.expression); if (ms) ms.forEach((x) => add(x, n)); else naoResolvidos.push(onde(n) + ": " + n.getText().slice(0, 90)); }
    ts.forEachChild(n, v);
  })(sf);
  return { tipos, naoResolvidos, curingas };
}

// ================================================================================================
// classify-v3.cjs (Apêndice A) — sem instantâneo classifica pelas REGRAS (é assim que o instantâneo nasce);
// com instantâneo, o instantâneo decide a classe e as REGRAS DE PROPRIEDADE conferem se a classe escrita é
// compatível (B3) — nunca só a presença.
// ================================================================================================
export type Instantaneo = Record<string, { classe: string; n: number }>;
export type Classificacao = {
  readonly violacoes: string[];
  readonly classes: Record<string, number>;
  readonly chavesVivas: number;
  readonly entradas07cB: number;
  readonly gerado: Instantaneo;
  readonly resumo: string[];
};
export function classificar(c3: any, s3: any, snap: Instantaneo | null): Classificacao {
  const NAO_RESOLVIDOS_ACEITOS = new Set([
    "src/config/business-time.ts: part.type === type",
    "src/modules/telemetry/telemetry.dto.ts: part.type === type",
    "src/modules/charging/charge.accrual.ts: p.type === type",
  ]);
  const CURINGAS_ACEITOS = new Set([
    "src/modules/mobile/mobile-evidence-sync.ts: type.includes(QQ.work_order_QQ)",
    "src/modules/mobile/mobile-evidence-sync.ts: type.endsWith(QQ_photoQQ)",
    "src/modules/mobile/mobile-evidence-sync.ts: type.endsWith(QQ_signatureQQ)",
  ].map((x) => x.split("QQ").join(String.fromCharCode(34))));
  const semLinha = (x: string) => x.replace(/:[0-9]+: /, ": ");
  const SEG = /[/](work-orders|checklist-runs|dispatches)[/]:[A-Za-z0-9_]+/;
  const IN_PROP = new Set(["OS·07a", "OS·07c-a", "VISTORIA·07c-b", "DESPACHO·07c-b", "EVIDENCIA-OS·07c-b", "OS·SEM-ALCANCE", "LOTE"]);
  const G07A = new Set(["ROTA PATCH /api/v1/work-orders/:workOrderId", "ROTA PATCH /api/v1/work-orders/:workOrderId/status", "PAR /api/v1/mobile/sync/work-order-actions · work_order.status_change"]);
  const R = new Set(["ROTA POST /api/v1/mobile/telemetry", "ROTA POST /api/v1/fuel-logs", "ROTA PATCH /api/v1/fuel-logs/:fuelLogId", "ROTA POST /api/v1/damages", "ROTA POST /api/v1/expense-reports", "ROTA PATCH /api/v1/expense-reports/:reportId", "ROTA POST /api/v1/expense-reports/:reportId/items"]);
  const N = new Set(["ROTA POST /api/v1/auth/login", "ROTA POST /api/v1/auth/refresh", "ROTA POST /api/v1/auth/logout", "ROTA POST /api/v1/notifications/fleet-alerts/run", "ROTA POST /api/v1/notifications/:notificationId/read", "ROTA POST /api/v1/notifications/read-all", "ROTA POST /api/v1/notifications/:notificationId/archive", "ROTA POST /api/v1/mobile/field-locations", "ROTA POST /api/v1/damages/:damageId/attachments", "ROTA POST /api/v1/attachments", "ROTA DELETE /api/v1/attachments/:attachmentId", "ROTA POST /api/v1/expense-reports/:reportId/submit"]);
  const lotes = new Set(s3.lotes);
  const vivas = new Map<string, any>();
  for (const [k, n] of Object.entries(c3.contagem)) vivas.set(k, { k, n, tipo: k.split(" ")[0] });
  for (const r of c3.rotas) {
    const k = "ROTA " + r.method + " " + r.path; const v = vivas.get(k);
    const semAlc = ["field_technician", "technician"].every((p) => !r[p].alcanca && /^(401|403):/.test(r[p].k));
    Object.assign(v, { r, leitura: r.method === "GET" || r.method === "HEAD", prop: SEG.test(r.path) || r.path.endsWith("/mobile/evidence-uploads") || Boolean(r.tocaCaminho), semAlcance: semAlc });
  }
  for (const p of s3.pares) {
    const k = "PAR " + p.lote + " · " + p.type;
    vivas.set(k, { k, n: 1, tipo: "PAR", p, prop: /^work_order[.]/.test(p.type) || /^checklist/.test(p.type) || /^evidence[.]work_order_/.test(p.type), semAlcance: !p.field_technician.alcanca && !p.technician.alcanca });
  }
  function porRegra(v: any): string {
    if (v.tipo === "MIDDLEWARE" || v.tipo === "ROTEADOR" || v.tipo === "SUBAPP") return v.tipo;
    if (v.tipo === "SEM-CAMINHO") return "NAO-CLASSIFICADA";
    if (G07A.has(v.k)) return "OS·07a";
    if (v.tipo === "ROTA") {
      const p = v.r.path;
      if (v.leitura) return v.prop ? "LEITURA-OS" : "LEITURA";
      if (lotes.has(p)) return "LOTE";
      if (v.prop) {
        if (v.semAlcance) return "OS·SEM-ALCANCE";
        if (/[/]work-orders[/]:/.test(p)) return "OS·07c-a";
        if (/[/]checklist-runs[/]:/.test(p)) return "VISTORIA·07c-b";
        if (/[/]dispatches[/]:/.test(p)) return "DESPACHO·07c-b";
        if (p.endsWith("/mobile/evidence-uploads")) return "EVIDENCIA-OS·07c-b";
        return "NAO-CLASSIFICADA";
      }
      if (R.has(v.k)) return "R";
      if (N.has(v.k)) return "N";
      if (v.semAlcance) return "SEM-ALCANCE-CAMPO";
      return "NAO-CLASSIFICADA";
    }
    const t = v.p.type;
    if (v.prop) {
      if (v.semAlcance) return "OS·SEM-ALCANCE";
      if (/^work_order[.]/.test(t)) return "OS·07c-a";
      if (/^checklist/.test(t)) return "VISTORIA·07c-b";
      return "EVIDENCIA-OS·07c-b";
    }
    if (/^expense_/.test(t)) return "R";
    if (/^evidence[.]field_/.test(t)) return "N";
    if (v.semAlcance) return "SEM-ALCANCE-CAMPO";
    return "NAO-CLASSIFICADA";
  }
  const viol: string[] = [];
  const add = (c: string, x: string) => viol.push(c + ": " + x);
  for (const v of vivas.values()) {
    const e = snap ? snap[v.k] : { classe: porRegra(v), n: v.n };
    if (!e || e.classe === "NAO-CLASSIFICADA") { add("NAO-CLASSIFICADA" + (v.prop ? " (na propriedade)" : ""), v.k); continue; }
    if (e.n !== v.n) add("CONTAGEM", v.k + " instantâneo " + e.n + " × vivo " + v.n);
    const c = e.classe;
    if (v.tipo === "MIDDLEWARE" || v.tipo === "ROTEADOR" || v.tipo === "SUBAPP") { if (c !== v.tipo) add("CLASSE-INCOMPATIVEL", v.k + " = " + c); continue; }
    if (v.tipo === "SEM-CAMINHO") { add("SEM-CAMINHO", v.k); continue; }
    if (v.tipo === "ROTA" && v.leitura) { const esp = v.prop ? "LEITURA-OS" : "LEITURA"; if (c !== esp) add("CLASSE-INCOMPATIVEL", v.k + " = " + c + " (esperado " + esp + ")"); continue; }
    if (v.prop && !IN_PROP.has(c)) add("CLASSE-INCOMPATIVEL", v.k + " = " + c + " (na propriedade)");
    if (!v.prop && IN_PROP.has(c) && c !== "LOTE") add("CLASSE-INCOMPATIVEL", v.k + " = " + c + " (fora da propriedade)");
    if (c === "LOTE" && !(v.tipo === "ROTA" && lotes.has(v.r.path))) add("CLASSE-INCOMPATIVEL", v.k + " = LOTE sem comportamento de lote");
    if (v.tipo === "ROTA" && lotes.has(v.r.path) && c !== "LOTE") add("CLASSE-INCOMPATIVEL", v.k + " é lote e está como " + c);
    if (/SEM-ALCANCE/.test(c) && !v.semAlcance) add("CLASSE-INCOMPATIVEL", v.k + " = " + c + " mas o campo alcança");
  }
  const envelhecidas = snap ? Object.keys(snap).filter((k) => !vivas.has(k)) : [];
  envelhecidas.forEach((k) => add("ENVELHECIDA", k));
  (c3.semCaminho || []).forEach((x: string) => add("SEM-CAMINHO", x));
  (c3.mwSucesso || []).forEach((x: string) => add("MIDDLEWARE-RESPONDE-SUCESSO", x));
  (c3.leituraEscreve || []).forEach((x: string) => add("LEITURA-ESCREVE", x));
  s3.naoResolvidos.filter((x: string) => !NAO_RESOLVIDOS_ACEITOS.has(semLinha(x))).forEach((x: string) => add("TIPO-NAO-RESOLVIDO", x));
  s3.curingasEstaticos.filter((x: string) => !CURINGAS_ACEITOS.has(semLinha(x))).forEach((x: string) => add("CURINGA-ESTATICO", x));
  s3.curingaDinamico.forEach((x: string) => add("CURINGA-DINAMICO", x));
  s3.instaveis.forEach((x: string) => add("LOTE-INSTAVEL", x));
  const cont: Record<string, number> = {};
  for (const v of vivas.values()) { const c = snap ? (snap[v.k] ? snap[v.k].classe : "NAO-CLASSIFICADA") : porRegra(v); cont[c] = (cont[c] || 0) + v.n; }
  const b07 = [...vivas.values()].filter((v) => /07c-b/.test(snap ? ((snap[v.k] || {}).classe || "") : porRegra(v))).length;
  const gerado: Instantaneo = {}; for (const v of vivas.values()) gerado[v.k] = { classe: porRegra(v), n: v.n };
  const resumo = [
    "CLASSES (com multiplicidade): " + Object.entries(cont).sort().map(([c, n]) => c + "=" + n).join(" · "),
    "chaves vivas: " + vivas.size + " | entradas ·07c-b: " + b07 + " | VIOLAÇÕES: " + viol.length,
    ...viol.map((x) => "  " + x),
  ];
  return { violacoes: viol, classes: cont, chavesVivas: vivas.size, entradas07cB: b07, gerado, resumo };
}

// ================================================================================================
// Casca de execução — um processo filho por passada (ver o cabeçalho).
// ================================================================================================
export type Censo = { readonly c3: any; readonly s3: any; readonly resumo: string[]; readonly ms: number };

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
          reject(new Error(`censo 07c (${args[0]}) falhou: ${erro.message}\n${String(stderr).slice(-4000)}`));
          return;
        }
        resolve(String(stdout));
      },
    );
  });
}

export async function executarCenso(opcoes: { readonly injecao?: string; readonly timeoutMs?: number } = {}): Promise<Censo> {
  const inicio = Date.now();
  const timeoutMs = opcoes.timeoutMs ?? 600_000;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "o6r07c-censo-"));
  try {
    const arqC3 = path.join(dir, "c3.json");
    const arqS3 = path.join(dir, "s3.json");
    const extra = opcoes.injecao ? [opcoes.injecao] : [];
    const saida1 = await rodarFilho(["censo", arqC3, ...extra], timeoutMs);
    const saida2 = await rodarFilho(["lotes", arqC3, arqS3, ...extra], timeoutMs);
    const c3 = JSON.parse(fs.readFileSync(arqC3, "utf8"));
    const s3 = JSON.parse(fs.readFileSync(arqS3, "utf8"));
    const resumo = [...saida1.trim().split(/\r?\n/), ...saida2.trim().split(/\r?\n/)];
    return { c3, s3, resumo, ms: Date.now() - inicio };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

export function lerInstantaneo(): Instantaneo {
  return JSON.parse(fs.readFileSync(path.join(RAIZ_DO_REPO, "tests", "fixtures", "o6r07c-classificacao-vias.json"), "utf8"));
}

export const DIR_FORMAS = path.join(RAIZ_DO_REPO, "tests", "fixtures", "o6r07c-formas");

async function main(argv: string[]): Promise<void> {
  const [modo, ...resto] = argv;
  if (modo === "censo") {
    const { res, resumo } = await censoCamadas(resto[1]);
    fs.writeFileSync(resto[0], JSON.stringify(res, null, 1));
    console.log(resumo.join("\n"));
    process.exit(0);
  }
  if (modo === "lotes") {
    const c3 = JSON.parse(fs.readFileSync(resto[0], "utf8"));
    const { res, resumo } = await censoLotes(c3, resto[2]);
    fs.writeFileSync(resto[1], JSON.stringify(res, null, 1));
    console.log(resumo.join("\n"));
    process.exit(0);
  }
  if (modo === "gravar") {
    const { c3, s3, resumo } = await executarCenso({});
    const cl = classificar(c3, s3, null);
    fs.writeFileSync(resto[0], JSON.stringify(cl.gerado, null, 1));
    console.log([...resumo, ...cl.resumo, "instantâneo gravado: " + Object.keys(cl.gerado).length + " chaves"].join("\n"));
    process.exit(cl.violacoes.length ? 1 : 0);
  }
  console.error("uso: censo <c3.json> [injecao] | lotes <c3.json> <s3.json> [injecao] | gravar <instantaneo.json>");
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
