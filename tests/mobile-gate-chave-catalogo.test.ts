import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { getRolePermissions, isValidPermission } from "../src/modules/core-saas/permissions/catalog.js";

// B-MOBILE-GATE-CHAVE (item 66 do portão) — T4: o guard gerado do catálogo do servidor.
//
//   T4.1 — cada regra de `mobile/flutter_app/lib/core/permissions/mobile_gates.dart` é IGUAL ao que a rota do servidor
//          exporta: as chaves, o modo das chaves, os módulos (`classifyRoute`) e o modo "qualquer um" dos módulos
//          (`module-gate.middleware.ts`, `.some`). Nada copiado à mão: as listas vêm dos exports da própria rota.
//   T4.2 — nenhum literal em POSIÇÃO DE PERMISSÃO do `lib/` fica fora de `PERMISSION_CATALOG`. O extrator é uma
//          função pura com um reconhecedor por classe; um canário embutido (texto, não arquivo `.dart`) tem uma
//          ocorrência de cada classe, e o teste exige as 9 de volta (apagar um reconhecedor fica vermelho, R3.1).
//          Piso por classe medido no head (R3.2). Argumento não literal só passa numa exceção NOMEADA por
//          {arquivo, classe} (R3.3), e exceção sem uso também falha (não fica buraco escondido).
//   T4.3 — as duas listas de demo (e SÓ elas, REV66-03) são subconjunto do que o catálogo dá ao técnico de campo.

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const APP = path.join(RAIZ, "mobile", "flutter_app");
const LIB = path.join(APP, "lib");
const GATES_DART = path.join(LIB, "core", "permissions", "mobile_gates.dart");

// ── leitura de Dart sem comentário ──────────────────────────────────────────────────────────────────────────────

// Troca todo comentário (`//`, `///`, `/* */` aninhado) por espaço, preservando as quebras de linha (para o número
// de linha) e o conteúdo dos literais de texto (aspas simples, duplas, triplas e cruas).
export function semComentarios(fonte: string): string {
  let saida = "";
  let i = 0;
  while (i < fonte.length) {
    const c = fonte[i];
    const prox = fonte[i + 1];
    if (c === "/" && prox === "/") {
      while (i < fonte.length && fonte[i] !== "\n") {
        saida += " ";
        i++;
      }
      continue;
    }
    if (c === "/" && prox === "*") {
      let nivel = 0;
      do {
        if (fonte[i] === "/" && fonte[i + 1] === "*") {
          nivel++;
          saida += "  ";
          i += 2;
        } else if (fonte[i] === "*" && fonte[i + 1] === "/") {
          nivel--;
          saida += "  ";
          i += 2;
        } else {
          saida += fonte[i] === "\n" ? "\n" : " ";
          i++;
        }
      } while (nivel > 0 && i < fonte.length);
      continue;
    }
    if (c === "'" || c === '"') {
      const fim = fimDoTexto(fonte, i);
      saida += fonte.slice(i, fim);
      i = fim;
      continue;
    }
    saida += c;
    i++;
  }
  return saida;
}

// Índice logo depois do literal de texto que começa em `inicio` (aspas simples, duplas ou triplas; `r` antes = cru).
function fimDoTexto(fonte: string, inicio: number): number {
  const aspa = fonte[inicio];
  const cru = inicio > 0 && fonte[inicio - 1] === "r";
  const tripla = fonte.startsWith(aspa.repeat(3), inicio);
  const fecho = tripla ? aspa.repeat(3) : aspa;
  let i = inicio + fecho.length;
  while (i < fonte.length) {
    if (!cru && fonte[i] === "\\") {
      i += 2;
      continue;
    }
    if (fonte.startsWith(fecho, i)) return i + fecho.length;
    if (!tripla && fonte[i] === "\n") return i;
    i++;
  }
  return i;
}

// Lê, a partir de `inicio` (logo depois do abre), até o fecho de mesmo nível; devolve os argumentos de topo
// separados por vírgula e o índice do fecho. Literais de texto são pulados inteiros.
function argumentosAte(fonte: string, inicio: number): { args: string[]; fim: number } {
  const args: string[] = [];
  let atual = "";
  let nivel = 0;
  let i = inicio;
  while (i < fonte.length) {
    const c = fonte[i];
    if (c === "'" || c === '"') {
      const fim = fimDoTexto(fonte, i);
      atual += fonte.slice(i, fim);
      i = fim;
      continue;
    }
    if (c === "(" || c === "[" || c === "{") nivel++;
    if (c === ")" || c === "]" || c === "}") {
      if (nivel === 0) {
        if (atual.trim()) args.push(atual.trim());
        return { args, fim: i };
      }
      nivel--;
    }
    if (c === "," && nivel === 0) {
      args.push(atual.trim());
      atual = "";
      i++;
      continue;
    }
    atual += c;
    i++;
  }
  return { args, fim: i };
}

// `'chave'`/`"chave"` puro, sem interpolação; senão `null`.
function literal(expr: string | undefined): string | null {
  if (!expr) return null;
  const m = /^(['"])([^'"$\\]*)\1$/.exec(expr.trim());
  return m ? m[2] : null;
}

// `[ 'a', 'b' ]`, `const [...]`, `{ 'a' }`, `const {...}`, `<String>[...]`: as chaves, ou `null` se algum membro
// não for literal puro (ou se a expressão não for uma coleção literal).
function colecaoLiteral(expr: string | undefined): string[] | null {
  if (!expr) return null;
  const m = /^(?:const\s+)?(?:<[^>]*>\s*)?([[{])([\s\S]*)([\]}])$/.exec(expr.trim());
  if (!m) return null;
  const { args } = argumentosAte(`${m[2]}${m[3]}`, 0);
  const chaves: string[] = [];
  for (const a of args) {
    const l = literal(a);
    if (l === null) return null;
    chaves.push(l);
  }
  return chaves;
}

// ── o extrator (uma função pura; um reconhecedor por classe, R3.1) ───────────────────────────────────────────────

export type Classe =
  | "has"
  | "has_any"
  | "has_all"
  | "required_permission"
  | "required_permissions"
  | "perms"
  | "permissions_const"
  | "permission_set"
  | "mobile_gates";

export type Posicao = { readonly classe: Classe; readonly chave: string | null; readonly linha: number };

type Reconhecedor = {
  readonly classe: Classe;
  // casa a abertura da posição; o grupo final é o abre-parêntese/colchete/chave da posição
  readonly padrao: RegExp;
  // de onde, entre os argumentos de topo, sai a chave (ou a coleção de chaves)
  readonly tomar: (args: string[]) => { readonly chaves: string[] | null };
};

const segundoArgumentoTexto = (args: string[]) => {
  const l = literal(args[1]);
  return { chaves: l === null ? null : [l] };
};
const segundoArgumentoColecao = (args: string[]) => ({ chaves: colecaoLiteral(args[1]) });
const colecaoInteira = (args: string[]) => ({ chaves: colecaoLiteral(`[${args.join(",")}]`) });
const textoInteiro = (args: string[]) => {
  const l = literal(args[0]);
  return { chaves: l === null ? null : [l] };
};
const chavesDoGate = (args: string[]) => {
  const chaves = args.find((a) => /^chaves\s*:/.test(a));
  return { chaves: chaves === undefined ? null : colecaoLiteral(chaves.replace(/^chaves\s*:/, "")) };
};

// Uma linha por classe: apagar uma delas é a mutação M8a…M8i.
const RECONHECEDORES: readonly Reconhecedor[] = [
  { classe: "has", padrao: /\.has\(/g, tomar: segundoArgumentoTexto },
  { classe: "has_any", padrao: /\.hasAny\(/g, tomar: segundoArgumentoColecao },
  { classe: "has_all", padrao: /\.hasAll\(/g, tomar: segundoArgumentoColecao },
  { classe: "required_permission", padrao: /(?<![\w'"])requiredPermission:\s*()/g, tomar: textoInteiro },
  { classe: "required_permissions", padrao: /(?<![\w'"])requiredPermissions:\s*(?:const\s*)?\[/g, tomar: colecaoInteira },
  { classe: "perms", padrao: /(?<![\w'"])perms:\s*(?:const\s*)?\[/g, tomar: colecaoInteira },
  { classe: "permissions_const", padrao: /(?<![\w'"])permissions:\s*const\s*\[/g, tomar: colecaoInteira },
  { classe: "permission_set", padrao: /\bPermissionSet\(\s*(?:const\s*)?\{/g, tomar: colecaoInteira },
  { classe: "mobile_gates", padrao: /\bMobileGate\((?!\s*\{)/g, tomar: chavesDoGate },
];

export function extrairPosicoesDePermissao(textoDart: string): Posicao[] {
  const fonte = semComentarios(textoDart);
  const saida: Posicao[] = [];
  for (const r of RECONHECEDORES) {
    for (const m of fonte.matchAll(r.padrao)) {
      const inicio = (m.index ?? 0) + m[0].length;
      const linha = fonte.slice(0, m.index).split("\n").length;
      // `requiredPermission:` não abre nada: o valor vai até a vírgula ou o fecho de mesmo nível.
      const { args } = argumentosAte(fonte, inicio);
      const alvo = r.classe === "required_permission" ? [args[0]] : args;
      const { chaves } = r.tomar(alvo);
      if (chaves === null) {
        saida.push({ classe: r.classe, chave: null, linha });
      } else {
        for (const chave of chaves) saida.push({ classe: r.classe, chave, linha });
      }
    }
  }
  return saida;
}

// ── as fontes do app ─────────────────────────────────────────────────────────────────────────────────────────────

function arquivosDart(dir: string): string[] {
  const saida: string[] = [];
  for (const nome of readdirSync(dir)) {
    const p = path.join(dir, nome);
    if (statSync(p).isDirectory()) saida.push(...arquivosDart(p));
    else if (nome.endsWith(".dart")) saida.push(p);
  }
  return saida.sort();
}

function relativo(p: string): string {
  return path.relative(APP, p).split(path.sep).join("/");
}

function posicoesDoLib(): Array<Posicao & { readonly arquivo: string }> {
  return arquivosDart(LIB).flatMap((p) =>
    extrairPosicoesDePermissao(readFileSync(p, "utf8")).map((pos) => ({ ...pos, arquivo: relativo(p) })),
  );
}

// R3.3 — as ÚNICAS posições com argumento não literal, por {arquivo, classe}.
const EXCECOES: ReadonlyArray<{ readonly arquivo: string; readonly classe: Classe; readonly motivo: string }> = [
  {
    arquivo: "lib/core/modules/module_resolver.dart",
    classe: "has_all",
    motivo: "ModuleResolver confere os requiredPermissions do módulo (código morto para navegação, P-MOBILE-MODULE-RESOLVER-MORTO)",
  },
];

// R3.2 — piso por classe, medido no head do bloco (fim da F2, 14/11/2026): o número de chaves (ou de posições não
// literais) que cada reconhecedor acha no lib/. Bloco que reduzir uma classe de propósito baixa o piso NO MESMO PR, com
// a contagem nova escrita aqui. Piso 0 é justificado por nome.
const PISO_POR_CLASSE: Readonly<Record<Classe, number>> = {
  has: 14,
  has_any: 0, // nenhum `.hasAny(` no lib: a regra "qualquer uma" mora no MobileGate, que não usa o resolvedor
  has_all: 1,
  required_permission: 0, // o `ModulePlaceholderScreen` recebe a regra (`gate:`) desde este bloco, não a chave
  required_permissions: 6,
  perms: 8,
  permissions_const: 12,
  permission_set: 12,
  mobile_gates: 7,
};

const CANARIO = `
  // um comentário com 'canario:comentario' nunca conta: .has(x, 'canario:comentario')
  final a = const PermissionResolver().has(sessao.permissions, 'canario:has');
  final b = resolver.hasAny(sessao.permissions, ['canario:has_any']);
  final c = resolver.hasAll(sessao.permissions, const ['canario:has_all']);
  const d = ModulePlaceholderScreen(title: 'T', requiredPermission: 'canario:required_permission');
  const e = EnabledModule(id: 'x', title: 'X', route: '/x', requiredPermissions: ['canario:required_permissions']);
  final f = (title: 'X', route: '/x', perms: ['canario:perms']);
  final g = AuthUser(permissions: const ['canario:permissions_const']);
  const h = PermissionSet({'canario:permission_set'});
  static const i = MobileGate(nome: 'canario', modulos: ['x'], modoModulo: Modo.any, chaves: ['canario:mobile_gates'], modo: Modo.any);
`;

const CLASSES: readonly Classe[] = [
  "has",
  "has_any",
  "has_all",
  "required_permission",
  "required_permissions",
  "perms",
  "permissions_const",
  "permission_set",
  "mobile_gates",
];

test("T4.2 · R3.1 — o canário: o extrator devolve as 9 classes, cada uma com a sua chave, e o catálogo recusa as 9", () => {
  const achadas = extrairPosicoesDePermissao(CANARIO);
  const porClasse = new Map<Classe, string[]>();
  for (const p of achadas) porClasse.set(p.classe, [...(porClasse.get(p.classe) ?? []), String(p.chave)]);
  for (const classe of CLASSES) {
    assert.deepEqual(porClasse.get(classe), [`canario:${classe}`], `classe ${classe} sem o seu canário`);
  }
  assert.equal(achadas.length, CLASSES.length, `posições a mais no canário: ${JSON.stringify(achadas)}`);
  for (const p of achadas) assert.equal(isValidPermission(String(p.chave)), false, `o catálogo aceitou ${p.chave}`);
});

test("T4.2 — todo literal em posição de permissão do lib/ está no catálogo; não literal só em exceção nomeada", () => {
  const posicoes = posicoesDoLib();
  const fora = posicoes.filter((p) => p.chave !== null && !isValidPermission(p.chave));
  assert.deepEqual(
    fora.map((p) => `${p.arquivo}:${p.linha} [${p.classe}] ${p.chave}`),
    [],
    "chave fora do catálogo do servidor",
  );

  const naoLiterais = posicoes.filter((p) => p.chave === null);
  const semExcecao = naoLiterais.filter((p) => !EXCECOES.some((e) => e.arquivo === p.arquivo && e.classe === p.classe));
  assert.deepEqual(
    semExcecao.map((p) => `${p.arquivo}:${p.linha} [${p.classe}]`),
    [],
    "posição de permissão com argumento não literal fora das exceções nomeadas",
  );
  for (const e of EXCECOES) {
    assert.equal(
      naoLiterais.some((p) => p.arquivo === e.arquivo && p.classe === e.classe),
      true,
      `exceção sem uso (tirar da lista): ${e.arquivo} [${e.classe}]`,
    );
  }
});

test("T4.2 · R3.2 — anti-vacuidade: cada classe acha no lib/ pelo menos o piso medido", () => {
  const contagem = Object.fromEntries(CLASSES.map((c) => [c, 0])) as Record<Classe, number>;
  for (const p of posicoesDoLib()) contagem[p.classe]++;
  console.log(`[T4.2] contagem por classe no lib/: ${JSON.stringify(contagem)}`);
  for (const classe of CLASSES) {
    assert.ok(contagem[classe] >= PISO_POR_CLASSE[classe], `${classe}: ${contagem[classe]} < piso ${PISO_POR_CLASSE[classe]}`);
  }
});

// ── T4.3 — as duas listas de demo ────────────────────────────────────────────────────────────────────────────────

// REV66-03: a T4.3 mede EXATAMENTE duas listas — `permissions: const [...]` do `LocalDevAuthRepository`
// (`auth_repository.dart`) e `permissions: PermissionSet({...})` do `devBootstrapSession` (`bootstrap_session.dart`).
// Os `requiredPermissions` e `perms` de módulo da demo ficam fora daqui e passam só pela T4.2 (catálogo).
function listaDeDemo(arquivo: string, ancora: RegExp, abertura: RegExp): string[] {
  const fonte = semComentarios(readFileSync(path.join(APP, arquivo), "utf8"));
  const a = ancora.exec(fonte);
  assert.ok(a, `${arquivo}: âncora ${ancora} não achada`);
  abertura.lastIndex = a.index;
  const m = abertura.exec(fonte);
  assert.ok(m, `${arquivo}: lista de demo não achada depois da âncora`);
  const { args } = argumentosAte(fonte, m.index + m[0].length);
  const chaves = colecaoLiteral(`[${args.join(",")}]`);
  assert.ok(chaves && chaves.length > 0, `${arquivo}: lista de demo vazia ou não literal`);
  return chaves;
}

test("T4.3 — as listas de demo são subconjunto do técnico de campo no catálogo", () => {
  const tecnico = new Set<string>(getRolePermissions("field_technician"));
  const listas = {
    "lib/core/auth/auth_repository.dart": listaDeDemo(
      "lib/core/auth/auth_repository.dart",
      /class LocalDevAuthRepository\b/,
      /(?<![\w'"])permissions:\s*const\s*\[/g,
    ),
    "lib/core/bootstrap/bootstrap_session.dart": listaDeDemo(
      "lib/core/bootstrap/bootstrap_session.dart",
      /const devBootstrapSession\s*=\s*BootstrapSession\(/,
      /(?<![\w'"])permissions:\s*PermissionSet\(\s*\{/g,
    ),
  };
  for (const [arquivo, chaves] of Object.entries(listas)) {
    const alem = chaves.filter((c) => !tecnico.has(c));
    assert.deepEqual(alem, [], `${arquivo}: a demo dá ao técnico o que o catálogo não dá`);
  }
});

// ── T4.1 — as regras do app × o que a rota exporta ──────────────────────────────────────────────────────────────

type Regra = {
  readonly nome: string;
  readonly modulos: string[];
  readonly modoModulo: "any" | "all";
  readonly chaves: string[];
  readonly modo: "any" | "all";
};

const LINHA_DE_REGRA =
  /^\s*static const (\w+) = MobileGate\(nome: '(G\w+)', modulos: \[([^\]]*)\], modoModulo: Modo\.(any|all), chaves: \[([^\]]*)\], modo: Modo\.(any|all)\);\s*$/;

function lerRegras(): Map<string, Regra> {
  const fonte = readFileSync(GATES_DART, "utf8");
  const regras = new Map<string, Regra>();
  for (const linha of fonte.split(/\r?\n/)) {
    if (!/MobileGate\(nome:/.test(linha)) continue;
    const m = LINHA_DE_REGRA.exec(linha);
    assert.ok(m, `regra fora do formato fixo (uma por linha): ${linha.trim()}`);
    const lista = (s: string) => colecaoLiteral(`[${s}]`) ?? assert.fail(`lista não literal: ${s}`);
    regras.set(m[2], { nome: m[2], modulos: lista(m[3]), modoModulo: m[4] as "any" | "all", chaves: lista(m[5]), modo: m[6] as "any" | "all" });
  }
  return regras;
}

const ordenado = (xs: readonly string[]) => [...xs].sort();

test("T4.1 — cada regra do app é a régua exportada pela rota do servidor (chaves, modo e módulos)", async () => {
  const [{ classifyRoute }, checklist, workOrders, estoque, syncChecklist] = await Promise.all([
    import("../src/modules/navigation/route-modules.js"),
    import("../src/modules/checklists/checklist.permissions.js"),
    import("../src/modules/work-orders/work-order.routes.js"),
    import("../src/modules/mobile/mobile-inventory-sync.js"),
    import("../src/modules/mobile/mobile-checklist-sync.js"),
  ]);
  const mod = (metodo: string, caminho: string): string[] => {
    const c = classifyRoute(metodo, caminho);
    assert.equal(c.kind, "MODULO", `${metodo} ${caminho} não é rota de módulo`);
    return [...(c as { modules: readonly string[] }).modules];
  };
  const exportado = (valor: unknown, nome: string) => {
    assert.notEqual(valor, undefined, `o servidor não exporta ${nome}`);
    return valor;
  };
  const C = checklist.CHECKLIST_PERMISSIONS;
  const leitura = exportado((estoque as Record<string, unknown>).MOBILE_INVENTORY_READ_PERMISSIONS, "MOBILE_INVENTORY_READ_PERMISSIONS") as readonly string[];
  const acaoDeEstoque = exportado(
    (estoque as Record<string, unknown>).MOBILE_INVENTORY_STOCK_ACTION_PERMISSION,
    "MOBILE_INVENTORY_STOCK_ACTION_PERMISSION",
  ) as string;
  const acoesDeChecklist = exportado(
    (syncChecklist as Record<string, unknown>).MOBILE_CHECKLIST_ACTION_PERMISSIONS,
    "MOBILE_CHECKLIST_ACTION_PERMISSIONS",
  ) as Record<string, string>;

  const esperado: Record<string, Omit<Regra, "nome">> = {
    G1: { modulos: mod("GET", "/mobile/checklists/available"), modoModulo: "any", chaves: [C.readRuns, C.createRuns], modo: "any" },
    G1b: { modulos: mod("POST", "/mobile/sync/checklist-actions"), modoModulo: "any", chaves: [acoesDeChecklist["checklist.item_answer"]], modo: "all" },
    G2: { modulos: mod("GET", "/mobile/inventory/availability"), modoModulo: "any", chaves: [...leitura], modo: "any" },
    G3: { modulos: mod("POST", "/mobile/sync/inventory-actions"), modoModulo: "any", chaves: [acaoDeEstoque], modo: "all" },
    G4: { modulos: mod("POST", "/approvals/x/approve"), modoModulo: "any", chaves: [workOrders.WORK_ORDER_PERMISSIONS.approve], modo: "all" },
  };
  assert.deepEqual(mod("POST", "/approvals/x/approve").sort(), ["approvals", "work_orders"], "G4: a rota de aprovar mudou de módulos");

  const regras = lerRegras();
  assert.deepEqual([...regras.keys()].sort(), Object.keys(esperado).sort(), "o conjunto de regras do app é fechado: G1, G1b, G2, G3, G4");
  for (const [nome, e] of Object.entries(esperado)) {
    const r = regras.get(nome)!;
    assert.deepEqual(ordenado(r.chaves), ordenado(e.chaves), `${nome}: chaves`);
    assert.equal(r.modo, e.modo, `${nome}: modo das chaves`);
    assert.deepEqual(ordenado(r.modulos), ordenado(e.modulos), `${nome}: módulos`);
    assert.equal(r.modoModulo, "any", `${nome}: módulo é "qualquer um" (module-gate.middleware.ts, .some)`);
    for (const chave of r.chaves) assert.equal(isValidPermission(chave), true, `${nome}: ${chave} fora do catálogo`);
  }
});
