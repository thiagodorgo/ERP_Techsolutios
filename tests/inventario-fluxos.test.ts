// Testes do extrator do inventário "quem manda e quem recebe" (scripts/inventario-fluxos.mjs).
// Amostras PEQUENAS e virtuais (arquivos em memória): rota com guard, rota sem guard, rota mutante sem auditoria,
// chamada do front a rota inexistente, menu que oferece tela que o guard recusa. Nada aqui lê o repositório real.
import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import * as inv from "../scripts/inventario-fluxos.mjs";

const ts = inv.loadTypeScript();
const R = path.resolve("/inventario-virtual");
const arq = (rel: string) => path.join(R, rel);

const BACKEND: Record<string, string> = {
  [arq("src/app.ts")]: `
import express from "express";
import { createXRouter } from "./modules/x/x.routes.js";
export function createApp() {
  const app = express();
  app.use("/api/v1", createXRouter());
  return app;
}
`,
  [arq("src/modules/core-saas/middleware/rbac.middleware.ts")]: `
export function requirePermission(permission: string) {
  return (_req: unknown, _res: unknown, next: () => void) => next();
}
`,
  [arq("src/modules/core-saas/audit/audit-request-context.ts")]: `
export async function recordRequestAuditBestEffort(_request: unknown, _input: { action: string }): Promise<void> {}
`,
  [arq("src/modules/x/x.routes.ts")]: `
import { Router } from "express";
import { requirePermission } from "../core-saas/middleware/rbac.middleware.js";
import { XController } from "./x.controller.js";
export const X_PERMISSIONS = { read: "x:read", update: "x:update" } as const;
export function createXRouter() {
  const router = Router();
  const controller = new XController();
  router.get("/x", requirePermission(X_PERMISSIONS.read), async (_req: unknown, res: any) => { res.json(await controller.list()); });
  router.post("/x", requirePermission("x:create"), async (req: unknown, res: any) => { res.json(await controller.create(req)); });
  router.patch("/x/:id", requirePermission(X_PERMISSIONS.update), async (req: unknown, res: any) => { res.json(await controller.update(req)); });
  router.get("/x-publico", async (_req: unknown, res: any) => { res.json({}); });
  return router;
}
`,
  [arq("src/modules/x/x.controller.ts")]: `
import { recordRequestAuditBestEffort } from "../core-saas/audit/audit-request-context.js";
import { XService } from "./x.service.js";
export class XController {
  private readonly service = new XService();
  async list() { return this.service.list(); }
  async create(request: unknown) {
    const item = await this.service.create();
    await recordRequestAuditBestEffort(request, { action: "x.created" });
    return item;
  }
  async update(_request: unknown) { return this.service.update(); }
}
`,
  [arq("src/modules/x/x.service.ts")]: `
const client: any = {};
export class XService {
  async list() { return []; }
  async create() { return client.x.create({ data: {} }); }
  async update() { return client.x.update({ data: {} }); }
}
`,
};

const FRONT: Record<string, string> = {
  [arq("frontend/src/App.tsx")]: `
import { Route, Routes } from "react-router-dom";
import { PermissionGuard } from "./guards/PermissionGuard";
import { XPage } from "./pages/XPage";
import { AbertaPage } from "./pages/AbertaPage";
export function App() {
  return (
    <Routes>
      <Route path="/x" element={<PermissionGuard permissions={["x:read"]}><XPage /></PermissionGuard>} />
      <Route path="/aberta" element={<AbertaPage />} />
    </Routes>
  );
}
`,
  [arq("frontend/src/guards/PermissionGuard.tsx")]: `
export function PermissionGuard({ children }: { children: unknown; permissions: string[] }) { return children; }
`,
  [arq("frontend/src/services/api/client.ts")]: `
export async function apiRequest<T>(path: string, options: { method?: string } = {}): Promise<T> {
  return (await fetch(path, { method: options.method })) as unknown as T;
}
`,
  [arq("frontend/src/x.service.ts")]: `
import { apiRequest } from "./services/api/client";
export function listX() { return apiRequest("/x"); }
export function atualizarX(id: string) { return apiRequest(\`/x/\${encodeURIComponent(id)}\`, { method: "PATCH" }); }
export function criarFantasma(id: string) { return apiRequest(\`/nao-existe/\${encodeURIComponent(id)}\`, { method: "POST" }); }
`,
  [arq("frontend/src/pages/XPage.tsx")]: `
import { atualizarX, criarFantasma, listX } from "../x.service";
export function XPage() {
  void listX();
  return <div><button onClick={() => atualizarX("1")}>salvar</button><button onClick={() => criarFantasma("1")}>fantasma</button></div>;
}
`,
  [arq("frontend/src/pages/AbertaPage.tsx")]: `
export function AbertaPage() { return <p>sem chamadas</p>; }
`,
};

function backend() {
  const program = inv.criarPrograma(ts, [arq("src/app.ts")], BACKEND);
  const ctx = inv.criarContexto(ts, program, R, arq("src"));
  const { rotas, naoLidos } = inv.extrairRotasBackend(ctx, inv.fabricasRaiz(ctx, arq("src/app.ts")));
  for (const r of rotas) {
    const ef = inv.analisarEfeitosDaRota(ctx, r);
    r.efeitos = ef.efeitos;
    r.elosNaoResolvidos = ef.elosNaoResolvidos;
  }
  return { rotas, naoLidos };
}

function front() {
  const program = inv.criarPrograma(ts, [arq("frontend/src/App.tsx")], FRONT);
  const ctx = inv.criarContexto(ts, program, R, arq("frontend/src"));
  const { rotas, naoLidos } = inv.extrairRotasFront(ctx, arq("frontend/src/App.tsx"));
  const todas = inv.todasChamadasFront(ctx);
  const porTela = new Map();
  for (const rf of rotas) {
    const alc = inv.alcancar(ctx, [rf._decl], "referencias");
    porTela.set(rf, alc.chamadas.map((c: unknown) => todas.get(c)).filter(Boolean));
    rf.permissoesConsultadas = [];
  }
  return { rotas, naoLidos, todas, porTela };
}

const rota = (rotas: any[], metodo: string, caminho: string) => rotas.find((r) => r.metodo === metodo && r.caminho === caminho);

test("backend: rota com guard resolve a permissão (literal e constante `as const`)", () => {
  const { rotas, naoLidos } = backend();
  assert.deepEqual(naoLidos, []);
  assert.equal(rotas.length, 4);
  assert.deepEqual(rota(rotas, "GET", "/api/v1/x").permissoes, ["x:read"]);
  assert.deepEqual(rota(rotas, "POST", "/api/v1/x").permissoes, ["x:create"]);
  assert.deepEqual(rota(rotas, "PATCH", "/api/v1/x/:id").permissoes, ["x:update"]);
  assert.equal(rota(rotas, "GET", "/api/v1/x").tipoGuarda, "tenant");
});

test("backend: rota sem guard sai como tipoGuarda 'nenhuma'", () => {
  const { rotas } = backend();
  const r = rota(rotas, "GET", "/api/v1/x-publico");
  assert.equal(r.tipoGuarda, "nenhuma");
  assert.deepEqual(r.permissoes, []);
});

test("backend: efeito de auditoria com o nome do evento e gravação Prisma, pelo grafo controller → service", () => {
  const { rotas } = backend();
  const post = rota(rotas, "POST", "/api/v1/x");
  const auditoria = post.efeitos.filter((e: any) => e.categoria === "auditoria");
  assert.equal(auditoria.length, 1);
  assert.deepEqual(auditoria[0].acoes, ["x.created"]);
  assert.ok(post.efeitos.some((e: any) => e.padrao === "gravação Prisma" && e.alvo === "x.create"));
  assert.deepEqual(inv.nomesDeAuditoria(post), ["x.created"]);
  const patch = rota(rotas, "PATCH", "/api/v1/x/:id");
  assert.ok(patch.efeitos.some((e: any) => e.alvo === "x.update"));
  assert.ok(!patch.efeitos.some((e: any) => e.categoria === "auditoria"));
});

test("front: rota com PermissionGuard e rota sem guard; chamadas lidas com método e caminho", () => {
  const { rotas, naoLidos, todas } = front();
  assert.deepEqual(naoLidos, []);
  const x = rotas.find((r: any) => r.caminho === "/x");
  const aberta = rotas.find((r: any) => r.caminho === "/aberta");
  assert.deepEqual(x.guarda.permissoes, ["x:read"]);
  assert.equal(x.componente, "XPage");
  assert.equal(aberta.guarda, null);
  const lidas = [...todas.values()].map((c: any) => `${c.metodos.join("/")} ${c.caminhos.join(",")}`).sort();
  // A chamada interna do cliente HTTP (fetch(path)) é embrulho e não entra.
  assert.deepEqual(lidas, ["GET /x", "PATCH /x/:param", "POST /nao-existe/:param"]);
});

function inventario() {
  const b = backend();
  const f = front();
  const catalogo = {
    papeis: ["leitor", "editor"],
    papeisPlataforma: [],
    permissoes: ["x:read", "x:create", "x:update"],
    porPapel: { leitor: ["x:read"], editor: ["x:read", "x:create", "x:update"] },
  };
  return inv.montarInventario({
    rotasBack: b.rotas,
    rotasFront: f.rotas,
    chamadasPorTela: f.porTela,
    todasChamadas: [...f.todas.values()],
    catalogo,
    papeisCanonicos: ["leitor", "editor", "visitante"],
    menu: {
      porTipo: { leitor: [{ grupo: "G", rotulo: "X", caminho: "/x" }], visitante: [{ grupo: "G", rotulo: "X", caminho: "/x" }] },
      allowlist: null,
      localNav: "frontend/src/layouts/appSidebarNav.ts:1",
    },
    camadaUi: {
      aliases: {},
      sempre: [],
      rotuloDe: (p: string) => p,
      tipoMenu: (rotulos: string[]) => rotulos[0] ?? null,
      bypassPlataforma: () => false,
    },
    registroMenu: [],
    matriz: { notas: [], tabela: [] },
    localCatalogo: "catalog.ts",
  });
}

test("quebra (c): rota que muda dado sem auditoria é apontada; a que audita, não", () => {
  const r = inventario();
  const rotasC = r.quebras.c.map((q: any) => q.rota);
  assert.ok(rotasC.includes("PATCH /api/v1/x/:id"));
  assert.ok(!rotasC.includes("POST /api/v1/x"));
  assert.ok(r.quebras.c.every((q: any) => /:\d+$/.test(q.local)), "toda quebra tem arquivo:linha");
});

test("quebra (d): chamada do front para rota que não existe no backend, com a tela que a usa", () => {
  const r = inventario();
  const d = r.quebras.d.filter((q: any) => q.sentido === "front→back");
  assert.equal(d.length, 1);
  assert.match(d[0].descricao, /POST \/nao-existe\/:param não existe no backend \(usado por \/x\)/);
  assert.match(d[0].local, /x\.service\.ts:\d+$/);
  // E o inverso: rota do backend sem nenhuma tela.
  const semTela = r.quebras.d.filter((q: any) => q.sentido === "back→front").map((q: any) => q.descricao);
  assert.ok(semTela.some((s: string) => s.startsWith("POST /api/v1/x ")));
});

test("quebras (a) e (b): menu oferece tela que o guard recusa; ação cuja permissão o perfil não tem", () => {
  const r = inventario();
  const a = r.quebras.a.find((q: any) => q.perfil === "visitante");
  assert.ok(a, "visitante tem /x no menu e não tem x:read");
  assert.match(a.descricao, /PermissionGuard exige x:read/);
  const b = r.quebras.b.find((q: any) => q.acao === "PATCH /x/:param");
  assert.ok(b);
  assert.deepEqual(b.perfis, ["leitor"]);
});

test("normalização de caminho e casamento com a rota do backend", () => {
  const U = "\u0001";
  assert.deepEqual(inv.normalizarCaminhoFront(`/customers${U}`).caminho, "/customers");
  assert.deepEqual(inv.normalizarCaminhoFront(`/customers/${U}?x=1`).caminho, "/customers/:param");
  assert.equal(inv.normalizarCaminhoFront(`${U}/x`).caminho, null);
  const back = [
    { metodo: "GET", caminhoRelativo: "/work-orders/kpis" },
    { metodo: "GET", caminhoRelativo: "/work-orders/:id" },
  ];
  assert.equal(inv.casarRota("GET", "/work-orders/:param", back)?.caminhoRelativo, "/work-orders/:id");
  assert.equal(inv.casarRota("GET", "/work-orders/kpis", back)?.caminhoRelativo, "/work-orders/kpis");
  assert.equal(inv.casarRota("POST", "/work-orders/kpis", back), null);
});

test("célula de tabela escapa a barra vertical", () => {
  assert.equal(inv.celula("a | b"), "a \\| b");
});

test("matriz: lê '**verbo** → papéis' das notas, inclusive dois verbos em negrito", () => {
  const notas = [
    { linha: 10, texto: "- foo uses `foo:read`, `foo:create`. **read** → manager, auditor; **create+update** (quem lança) → tenant_admin" },
    { linha: 11, texto: "- bar uses `bar:inspect`, `bar:allocate`. **inspect** (x) + **allocate** (y) → manager" },
  ];
  const d = inv.declaracoesDaMatriz(notas, new Set(["manager", "auditor", "tenant_admin"]));
  const m = Object.fromEntries(d.map((x: any) => [x.permissao, x.papeis]));
  assert.deepEqual(m["foo:read"], ["manager", "auditor"]);
  assert.deepEqual(m["foo:update"], ["tenant_admin"]);
  assert.deepEqual(m["bar:inspect"], ["manager"]);
  assert.deepEqual(m["bar:allocate"], ["manager"]);
});
