// B-ASS-10b (T5) · T-DIN-P — a trava que ENUNCIA "a tela não calcula dinheiro" (R-T5-DIN, plano v2 §6.2; Emenda 1, A4-r2 e
// A8-r2). Propriedade, conferida pelo verificador de tipos do TypeScript em todo `.ts`/`.tsx` do módulo, menos o arquivo de
// dinheiro (`cloud-billing.money.ts`):
//  R1 conta       — valor marcado (dinheiro, percentual, taxa, geometria) não é operando de + - * / % ** nem de ++ -- + - unários;
//  R3 conversão   — valor marcado não entra em Number, parseFloat, parseInt, BigInt, String, JSON.parse nem em Math.*; e
//                   essas funções não são passadas como CALLBACK sobre lista de valor marcado (`.map(Number)`, A4-r2 formas 1 e 3);
//  R5 geometria   — o número de desenho não vira texto (filho de JSX, trecho de template, toString);
//  R6 formatação  — toFixed, toLocaleString, toPrecision, Intl.NumberFormat e Math.round/floor/ceil/trunc só no arquivo de dinheiro;
//  R7 percentual  — nenhum "%" colado a um valor interpolado (o percentual vem pronto de `formatPct`);
//  R8 marca       — ninguém forja nem retira a marca com `as` fora do arquivo de dinheiro;
//  R10/R11        — a geometria não perde a marca por parâmetro `number` de função do módulo nem por anotação de tipo;
//  R12 escala     — a marca `data-escala` (o texto de escala dos eixos, A8-r2) só existe nos componentes da biblioteca
//                   (`frontend/src/components/**`), nunca num arquivo do módulo.
// LIMITES DECLARADOS (A4-r2 formas 2 e 4): geometria dentro de lista/contêiner perdendo a marca (`const xs: number[] =
// …geometryNumber(…)`) e valor marcado entregue a função de fora do módulo e da biblioteca. Quem cobre é a cadeira de
// dinheiro da junta, pelos 2 `git grep` da Emenda 1 §2 (e o T-DIN-1). Base: a referência executada pelo plano
// (`planos/plano-B-ASS-10b-T5-v2-ref-nao-calcula.guard.ts.txt`), com as regras da emenda acrescentadas.
import path from "node:path";
import ts from "typescript";

type Brand = "money" | "pct" | "rate" | "geometry";
const ARITHMETIC = new Set([
  ts.SyntaxKind.PlusToken, ts.SyntaxKind.MinusToken, ts.SyntaxKind.AsteriskToken, ts.SyntaxKind.SlashToken, ts.SyntaxKind.PercentToken,
  ts.SyntaxKind.AsteriskAsteriskToken, ts.SyntaxKind.PlusEqualsToken, ts.SyntaxKind.MinusEqualsToken, ts.SyntaxKind.AsteriskEqualsToken,
  ts.SyntaxKind.SlashEqualsToken, ts.SyntaxKind.PercentEqualsToken, ts.SyntaxKind.AsteriskAsteriskEqualsToken,
]);
const UNARY = new Set([ts.SyntaxKind.PlusToken, ts.SyntaxKind.MinusToken, ts.SyntaxKind.PlusPlusToken, ts.SyntaxKind.MinusMinusToken]);
const PERCENT_AFTER = /^\s?%/;
const CONVERTERS = /^(Number|parseFloat|parseInt|BigInt|String|JSON\.parse|Number\.parse(Float|Int))$/;

export function moneyViolations(files: readonly string[], options: ts.CompilerOptions, root: string, moduleDir: string, moneyFile: string): string[] {
  const program = ts.createProgram([...files], options);
  const checker = program.getTypeChecker();
  const relative = (fileName: string) => path.relative(root, path.resolve(fileName)).split(path.sep).join("/");
  const inModule = (fileName: string) => relative(fileName).startsWith(moduleDir) && relative(fileName) !== moneyFile;

  const brandOfType = (type: ts.Type): Brand | null => {
    for (const part of type.isUnion() ? type.types : [type]) {
      const marker = part.getProperty("__brand");
      const literal = marker ? checker.getTypeOfSymbol(marker) : undefined;
      if (literal?.isStringLiteral()) return literal.value as Brand;
    }
    return null;
  };
  const brandOf = (node: ts.Node): Brand | null => brandOfType(checker.getTypeAtLocation(node));
  const brandOfArgument = (node: ts.Expression): Brand | null => {
    if (!ts.isSpreadElement(node)) return brandOf(node);
    const element = checker.getIndexTypeOfType(checker.getTypeAtLocation(node.expression), ts.IndexKind.Number);
    return element ? brandOfType(element) : null;
  };
  const brandOfElements = (node: ts.Expression): Brand | null => {
    const element = checker.getIndexTypeOfType(checker.getTypeAtLocation(node), ts.IndexKind.Number);
    return element ? brandOfType(element) : null;
  };

  const violations: string[] = [];
  for (const source of program.getSourceFiles().filter((file) => inModule(file.fileName))) {
    const flag = (node: ts.Node, rule: string) =>
      violations.push(`${relative(source.fileName)}:${source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1} ${rule}`);
    const visit = (node: ts.Node): void => {
      if (ts.isBinaryExpression(node) && ARITHMETIC.has(node.operatorToken.kind)) {
        if (brandOf(node.left) || brandOf(node.right)) flag(node, "R1 conta com valor marcado");
        if (node.operatorToken.kind === ts.SyntaxKind.PlusToken && ts.isStringLiteralLike(node.right) && PERCENT_AFTER.test(node.right.text)) flag(node, "R7 percentual montado na tela");
      }
      if ((ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node)) && UNARY.has(node.operator) && brandOf(node.operand)) flag(node, "R1 conta com valor marcado");
      if (ts.isCallExpression(node)) {
        const callee = node.expression.getText(source);
        if ((CONVERTERS.test(callee) || /^Math\./.test(callee)) && node.arguments.some((argument) => brandOfArgument(argument))) flag(node, "R3 conversão de valor marcado");
        // A4-r2 (formas 1 e 3): a função de conversão passada como callback sobre uma lista de valor marcado
        if (ts.isPropertyAccessExpression(node.expression) && node.arguments.some((argument) => (ts.isIdentifier(argument) || ts.isPropertyAccessExpression(argument)) && CONVERTERS.test(argument.getText(source))) && brandOfElements(node.expression.expression)) {
          flag(node, "R3 conversão de valor marcado (callback)");
        }
        if (/^Math\.(round|floor|ceil|trunc)$/.test(callee)) flag(node, "R6 arredondamento fora do arquivo de dinheiro");
        if (ts.isPropertyAccessExpression(node.expression)) {
          const method = node.expression.name.text;
          if (["toFixed", "toLocaleString", "toPrecision"].includes(method)) flag(node, "R6 formatação fora do arquivo de dinheiro");
          if (method === "toString" && brandOf(node.expression.expression)) flag(node, "R5 valor marcado vira texto");
        }
        const declaration = checker.getResolvedSignature(node)?.declaration;
        if (declaration && inModule(declaration.getSourceFile().fileName)) {
          const parameters = checker.getResolvedSignature(node)!.parameters;
          node.arguments.forEach((argument, index) => {
            const parameter = parameters[Math.min(index, parameters.length - 1)];
            if (parameter && brandOfArgument(argument) === "geometry" && !brandOfType(checker.getTypeOfSymbolAtLocation(parameter, node))) flag(argument, "R10 geometria desmarcada por parâmetro");
          });
        }
      }
      if (ts.isPropertyAccessExpression(node) && node.getText(source) === "Intl.NumberFormat") flag(node, "R6 formatação fora do arquivo de dinheiro");
      if (ts.isTemplateExpression(node)) {
        for (const span of node.templateSpans) {
          if (brandOf(span.expression) === "geometry") flag(span, "R5 geometria vira texto");
          if (PERCENT_AFTER.test(span.literal.text)) flag(span, "R7 percentual montado na tela");
        }
      }
      if (ts.isJsxExpression(node) && node.expression && (ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent))) {
        if (brandOf(node.expression) === "geometry") flag(node, "R5 geometria vira texto");
        const siblings = node.parent.children;
        const next = siblings[siblings.indexOf(node) + 1];
        if (next && ts.isJsxText(next) && PERCENT_AFTER.test(next.text)) flag(node, "R7 percentual montado na tela");
      }
      if (ts.isAsExpression(node) || ts.isTypeAssertionExpression(node)) {
        const target = brandOfType(checker.getTypeFromTypeNode(node.type));
        if (target) flag(node, "R8 marca forjada");
        else if (brandOf(node.expression)) flag(node, "R8 marca retirada");
      }
      if (ts.isVariableDeclaration(node) && node.type && node.initializer && brandOf(node.initializer) === "geometry" && !brandOfType(checker.getTypeFromTypeNode(node.type))) flag(node, "R11 geometria desmarcada por anotação");
      // A8-r2: a marca de escala só nasce nos componentes da biblioteca
      if (ts.isJsxAttribute(node) && node.name.getText(source) === "data-escala") flag(node, "R12 data-escala fora da biblioteca");
      if ((ts.isPropertyAssignment(node) || ts.isShorthandPropertyAssignment(node)) && ts.isStringLiteral(node.name) && node.name.text === "data-escala") flag(node, "R12 data-escala fora da biblioteca");
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return violations;
}
