import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";

// -----------------------------------------------------------------------------------------------
// B-USERS-ACESSO-SEG — conserto do PR #527, G2 (A12, com a correção R1-A07). A propriedade, medida pela
// API do compilador TypeScript (declarações de import, `import()`, `require`, acesso a propriedade), não
// por texto de chamada: só o `jwt.service.ts` assina ou verifica JWT com o segredo do ERP, e só os pontos
// permitidos chegam a ele.
//   (a) o pacote `jose`, por qualquer forma, só entra em `jwt.service.ts` e `portal-shared/portal-session.ts`;
//   (b) `signAccessToken`/`verifyAccessToken`, por qualquer forma (nomeado, alias, `import *` de
//       `jwt.service.js`, ou `import *` de `auth/index.js` seguido de acesso à propriedade), só chegam a:
//       assinar `auth.routes.ts` e `auth-session.service.ts`; verificar `authenticated-actor.middleware.ts`
//       (a reexportação `export *` de `auth/index.ts` não é import). Todo `import *` de `jwt.service.js` fora
//       dessa lista é vermelho;
//   (c) o segredo do ERP (`env.JWT_SECRET`, `process.env.JWT_SECRET`, `process.env["JWT_SECRET"]`) só é lido
//       em `jwt.service.ts`, `config/env.ts` e nos 2 baldes de login (`auth.routes.ts`, `anonymous-login.service.ts`);
//   (d) `acceptPasswordChangeSession: true` aparece UMA vez no `src/`, em `identity-links.routes.ts`, e o
//       middleware do portão não importa Prisma, banco nem repositório (a `D-USERS-2`: sem consulta por requisição).
// Resíduo declarado (plano, Emenda 3): reexportação nova por `export … from` noutro barril escapa; o G1 cobre.
// -----------------------------------------------------------------------------------------------

const ROOT = process.cwd();
const SRC = path.join(ROOT, "src");
const MIDDLEWARE = "src/modules/auth/middleware/authenticated-actor.middleware.ts";

type Achados = {
  readonly jose: Set<string>;
  readonly sign: Set<string>;
  readonly verify: Set<string>;
  readonly jwtNamespace: Set<string>;
  readonly secret: Set<string>;
  readonly acceptTrue: string[];
  readonly middlewareImports: string[];
};

function moduleOf(node: ts.Node): string | null {
  if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
    return node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier) ? node.moduleSpecifier.text : null;
  }

  if (
    ts.isCallExpression(node) &&
    (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
      (ts.isIdentifier(node.expression) && node.expression.text === "require")) &&
    node.arguments.length > 0 &&
    ts.isStringLiteralLike(node.arguments[0]!)
  ) {
    return (node.arguments[0] as ts.StringLiteralLike).text;
  }

  return null;
}

const isJwtService = (m: string) => /(^|\/)jwt\.service(\.js|\.ts)?$/.test(m);
const isAuthBarrel = (m: string) => /(^|\/)auth\/index(\.js|\.ts)?$/.test(m) || /(^|\/)modules\/auth$/.test(m);

function analisar(): Achados {
  const a: Achados = {
    jose: new Set(),
    sign: new Set(),
    verify: new Set(),
    jwtNamespace: new Set(),
    secret: new Set(),
    acceptTrue: [],
    middlewareImports: [],
  };

  for (const file of sourceFiles(SRC)) {
    const relative = slash(path.relative(ROOT, file));
    const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
    const namespaces = new Map<string, string>();

    const visit = (node: ts.Node): void => {
      const mod = moduleOf(node);

      if (mod !== null) {
        if (mod === "jose") a.jose.add(relative);
        if (relative === MIDDLEWARE) a.middlewareImports.push(mod);

        if (isJwtService(mod) || isAuthBarrel(mod)) {
          if (ts.isImportDeclaration(node)) {
            const bindings = node.importClause?.namedBindings;

            if (bindings && ts.isNamespaceImport(bindings)) {
              namespaces.set(bindings.name.text, mod);
              if (isJwtService(mod)) a.jwtNamespace.add(relative);
            }

            if (bindings && ts.isNamedImports(bindings)) {
              for (const element of bindings.elements) {
                const imported = element.propertyName?.text ?? element.name.text;

                if (imported === "signAccessToken") a.sign.add(relative);
                if (imported === "verifyAccessToken") a.verify.add(relative);
              }
            }
          } else if (!ts.isExportDeclaration(node)) {
            // `import()`/`require` do módulo: tudo dele fica ao alcance.
            a.sign.add(relative);
            a.verify.add(relative);
          }
        }
      }

      // Acesso à propriedade sobre um `import *` do jwt.service ou do barril do auth.
      if (
        (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.expression) && namespaces.has(node.expression.text)) ||
        (ts.isElementAccessExpression(node) && ts.isIdentifier(node.expression) && namespaces.has(node.expression.text))
      ) {
        const name = ts.isPropertyAccessExpression(node)
          ? node.name.text
          : ts.isStringLiteralLike(node.argumentExpression)
            ? node.argumentExpression.text
            : "?";

        if (name === "signAccessToken" || name === "?") a.sign.add(relative);
        if (name === "verifyAccessToken" || name === "?") a.verify.add(relative);
      }

      // O segredo do ERP: `<qualquer>.JWT_SECRET` ou `<qualquer>["JWT_SECRET"]`.
      if (
        (ts.isPropertyAccessExpression(node) && node.name.text === "JWT_SECRET") ||
        (ts.isElementAccessExpression(node) &&
          ts.isStringLiteralLike(node.argumentExpression) &&
          node.argumentExpression.text === "JWT_SECRET")
      ) {
        a.secret.add(relative);
      }

      if (
        ts.isPropertyAssignment(node) &&
        ((ts.isIdentifier(node.name) && node.name.text === "acceptPasswordChangeSession") ||
          (ts.isStringLiteral(node.name) && node.name.text === "acceptPasswordChangeSession")) &&
        node.initializer.kind === ts.SyntaxKind.TrueKeyword
      ) {
        a.acceptTrue.push(relative);
      }

      ts.forEachChild(node, visit);
    };

    visit(source);
  }

  return a;
}

test("A12/G2 — APIs JWT, segredo do ERP e exceção da sessão restrita ficam nos pontos fechados", () => {
  const a = analisar();

  assert.deepEqual([...a.jose].sort(), [
    "src/modules/auth/services/jwt.service.ts",
    "src/modules/portal-shared/portal-session.ts",
  ], "(a) jose só nos dois pontos");
  assert.deepEqual([...a.jwtNamespace].sort(), [], "(b) import * de jwt.service.js fora da lista");
  assert.deepEqual([...a.sign].sort(), [
    "src/modules/auth/routes/auth.routes.ts",
    "src/modules/auth/services/auth-session.service.ts",
  ], "(b) quem chega a signAccessToken");
  assert.deepEqual([...a.verify].sort(), [MIDDLEWARE], "(b) quem chega a verifyAccessToken");
  assert.deepEqual([...a.secret].sort(), [
    "src/config/env.ts",
    "src/modules/auth/routes/auth.routes.ts",
    "src/modules/auth/services/anonymous-login.service.ts",
    "src/modules/auth/services/jwt.service.ts",
  ], "(c) quem lê o segredo do ERP");
  assert.deepEqual(a.acceptTrue, ["src/modules/auth/routes/identity-links.routes.ts"], "(d) a exceção única");

  const middlewareText = readFileSync(path.join(ROOT, MIDDLEWARE), "utf8");
  const proibidos = a.middlewareImports.filter((m) => /@prisma\/client|(^|\/)database\/|repositor/i.test(m));

  assert.deepEqual(proibidos, [], "(d) o portão não importa Prisma, banco nem repositório");
  assert.doesNotMatch(middlewareText, /@prisma\/client|PrismaClient|Repository\b/, "(d) nem por texto");
});

function sourceFiles(root: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const target = path.join(root, entry.name);
    if (entry.isDirectory()) found.push(...sourceFiles(target));
    else if (entry.isFile() && entry.name.endsWith(".ts")) found.push(target);
  }
  return found;
}

function slash(value: string): string {
  return value.replaceAll("\\", "/");
}
