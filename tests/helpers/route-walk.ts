// B-USERS-ACESSO-SEG — conserto do PR #527 (F4, G1 / R1-A03). Enumera TODA rota e TODA camada de middleware
// com caminho de um app Express pelo MESMO walk do censo (`tests/helpers/o6r07c-census.ts`, `censoCamadas`):
// `Router.prototype.use/route` e `express.application.use` são interceptados ANTES de o app nascer, para cada
// camada guardar o caminho com que foi montada. O censo não muda; este helper repete só a parte do walk.
//
// Uso: `instalarRegistroDeCaminhos()` ANTES de importar/criar o app; depois `percorrerApp(app)`.
// Um processo por passada: a interceptação é global ao processo (como no censo).
import { createRequire } from "node:module";

export type RotaEnumerada = { readonly method: string; readonly path: string };
export type CamadaComCaminho = { readonly key: string; readonly path: string };
export type PercursoDoApp = {
  readonly rotas: readonly RotaEnumerada[];
  readonly mwComCaminho: readonly CamadaComCaminho[];
  readonly semCaminho: readonly string[];
};

const VERBOS = ["get", "post", "put", "patch", "delete"];

let instalado = false;

export function instalarRegistroDeCaminhos(): void {
  if (instalado) {
    return;
  }

  const req0 = createRequire(process.cwd() + "/package.json");
  const express = req0("express");
  const RouterPkg = createRequire(req0.resolve("express"))("router");
  const parseMount = (args: any[]) => {
    let path: any = "/";
    let off = 0;

    if (typeof args[0] !== "function") {
      let a = args[0];

      while (Array.isArray(a) && a.length) a = a[0];

      if (typeof a !== "function") {
        path = args[0];
        off = 1;
      }
    }

    return { path, fns: args.slice(off).flat(Infinity) };
  };
  const origUse = RouterPkg.prototype.use;
  const origRoute = RouterPkg.prototype.route;
  const origAppUse = express.application.use;

  RouterPkg.prototype.use = function (this: any, ...args: any[]) {
    const before = this.stack.length;
    const { path } = parseMount(args);
    const out = origUse.apply(this, args);

    for (const l of this.stack.slice(before)) l.__mount = path;

    return out;
  };
  RouterPkg.prototype.route = function (this: any, path: any) {
    const before = this.stack.length;
    const r = origRoute.call(this, path);

    for (const l of this.stack.slice(before)) l.__path = path;

    return r;
  };
  express.application.use = function (this: any, ...args: any[]) {
    const st = this.router.stack;
    const before = st.length;
    const { fns } = parseMount(args);
    const out = origAppUse.apply(this, args);

    st.slice(before).forEach((l: any, i: number) => {
      const f = fns[i];

      if (f && f.handle && f.set) l.__subapp = f;
    });

    return out;
  };
  instalado = true;
}

export function percorrerApp(app: unknown): PercursoDoApp {
  const join = (a: string, b: string) =>
    (a.replace(/[/]+$/, "") + "/" + String(b).replace(/^[/]+/, "")).replace(/[/]+$/, "") || "/";
  const rotas: RotaEnumerada[] = [];
  const mwComCaminho: CamadaComCaminho[] = [];
  const semCaminho: string[] = [];

  (function walk(stack: any[], prefix: string) {
    for (const l of stack) {
      if (l.route) {
        const p = l.__path ?? l.route.path;

        if (typeof p !== "string") {
          semCaminho.push("ROTA " + prefix + " " + JSON.stringify(p));
          continue;
        }

        const full = join(prefix, p);
        const ms = new Set(Object.keys(l.route.methods).flatMap((m) => (m === "_all" ? VERBOS : [m])));

        for (const m of ms) rotas.push({ method: m.toUpperCase(), path: full });

        continue;
      }

      const mp = l.__mount;

      if (typeof mp !== "string") {
        semCaminho.push("CAMADA " + prefix + " " + String(mp));
        continue;
      }

      const pre = join(prefix, mp);

      if (l.__subapp) {
        walk(l.__subapp.router.stack, pre);
        continue;
      }

      if (l.handle && l.handle.stack) {
        walk(l.handle.stack, pre);
        continue;
      }

      const chave = "MIDDLEWARE " + pre + " · " + ((l.handle && l.handle.name) || "(anônima)");

      if (mp !== "/") mwComCaminho.push({ key: chave, path: pre });
    }
  })((app as any).router.stack, "");

  return { rotas, mwComCaminho, semCaminho };
}

const PARAM = /:([A-Za-z0-9_]+)/g;

// Troca cada parâmetro do caminho por um valor (o G1 usa UUIDs aleatórios: o portão recusa antes de qualquer
// leitura, então o valor não importa — e sob mutação nada da semente é tocado).
export function preencherParametros(path: string, valor: () => string): string {
  return path.replace(PARAM, () => valor());
}
