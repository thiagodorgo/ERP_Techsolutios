import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

// B-O6R-09 (R2-10 da crítica r2; emenda 1 §4) — GUARDA DE VARREDURA dos escritores de despacho.
//
// A atomicidade "estado + linha do tempo na mesma transação" vale POR CONSTRUÇÃO só para quem passa pela interface
// `FieldDispatchRepository` (`createWithEvent`/`transitionWithEvent`). A classe `PrismaFieldDispatchRepository`
// continua exportada com os métodos crus (`create`, `changeStatus`, `reassign`, `createEvent`) porque as fixtures do
// Traccar os usam (R-A9). Esta guarda fecha a porta dos fundos em `src/**`: um chamador novo que instanciasse a classe
// crua, ou que escrevesse direto nos delegates `fieldDispatch`/`fieldDispatchEvent`, gravaria despacho sem evento.
//
//   (i)   `new PrismaFieldDispatchRepository(` só em `field-dispatch-prisma.repository.ts`;
//   (ii)  escrita pelos delegates `fieldDispatch`/`fieldDispatchEvent` só nesse arquivo;
//   (iii) SQL cru que escreve em `field_dispatches`/`field_dispatch_events` em nenhum arquivo de `src/**`;
//   (iv)  `new PrismaWorkOrderRepository(` só nos arquivos congelados abaixo (o mesmo princípio para a OS: a classe
//         crua recebe `tx`, e quem a instancia decide a transação).
//
// ALCANCE DECLARADO: `src/**` em `.ts`. Os testes, `prisma/seed-fleet.ts` e `scripts/**` ficam fora — as fixtures do
// Traccar são as legítimas, e o resto é a pendência `P-B-O6R-09-ESCRITORES-FORA-DE-SRC` (pré-existente).

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "src");
const DISPATCH_REPOSITORY = "src/modules/field-dispatch/field-dispatch-prisma.repository.ts";

// Medido por `grep -rn "new PrismaWorkOrderRepository(" src` em origin/main 07898adf (fatia 0 do bloco), mais o escopo de
// escrita da fatia 6 (`work-order-scope.ts`: a OS criada dentro da transação da aprovação do orçamento).
const WORK_ORDER_REPOSITORY_FACTORIES: readonly string[] = [
  "src/modules/authority/authority-removal.repository.ts",
  "src/modules/work-orders/work-order-prisma.repository.ts",
  "src/modules/work-orders/work-order-scope.ts",
];

function sourceFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) files.push(...sourceFiles(full));
    else if (entry.endsWith(".ts")) files.push(full);
  }
  return files;
}

function filesMatching(pattern: RegExp): string[] {
  return sourceFiles(SRC)
    .filter((file) => pattern.test(readFileSync(file, "utf8")))
    .map((file) => path.relative(ROOT, file).split(path.sep).join("/"))
    .sort();
}

test("[R2-10 · i] new PrismaFieldDispatchRepository( só no repositório Prisma do despacho", () => {
  assert.deepEqual(filesMatching(/new\s+PrismaFieldDispatchRepository\s*\(/), [DISPATCH_REPOSITORY]);
});

test("[R2-10 · ii] escrita pelos delegates fieldDispatch/fieldDispatchEvent só no repositório Prisma do despacho", () => {
  const writer = /\bfieldDispatch(Event)?\s*\.\s*(create|createMany|createManyAndReturn|update|updateMany|updateManyAndReturn|upsert|delete|deleteMany)\b/;
  assert.deepEqual(filesMatching(writer), [DISPATCH_REPOSITORY]);
});

test("[R2-10 · iii] nenhum SQL cru de src/** escreve em field_dispatches/field_dispatch_events", () => {
  const rawWriter = /\b(insert\s+into|update|delete\s+from)\s+"?(public"?\.)?"?field_dispatch(es|_events)\b/i;
  assert.deepEqual(filesMatching(rawWriter), []);
});

test("[R2-10 · iv] new PrismaWorkOrderRepository( só nas fábricas congeladas", () => {
  assert.deepEqual(filesMatching(/new\s+PrismaWorkOrderRepository\s*\(/), [...WORK_ORDER_REPOSITORY_FACTORIES].sort());
});

// EM1-04 (emenda 1.1) — um erro ENGOLIDO dentro da transação da aprovação faz o Postgres desfazer tudo no COMMIT e a
// `$transaction` resolver: o serviço responderia 200 com o id de uma OS desfeita. O corpo de `approveWithWorkOrder` no
// repositório Prisma (Rls) não tem `.catch(`. O corpo é delimitado por parse de chaves, a partir da assinatura.
test("[EM1-04 · v] o corpo de approveWithWorkOrder no repositório Prisma do orçamento não engole erro (.catch( = 0)", () => {
  const text = readFileSync(path.join(ROOT, "src/modules/service-quotes/service-quote-prisma.repository.ts"), "utf8").replace(/\r\n/g, "\n");
  const signature = text.indexOf("  approveWithWorkOrder(\n    input: ApproveWithWorkOrderInput,");
  assert.ok(signature >= 0, "a assinatura de approveWithWorkOrder (Rls) não foi achada");
  const open = text.indexOf("{", text.indexOf("): Promise<ServiceQuoteApprovalResult>", signature));
  let depth = 0;
  let end = open;
  for (; end < text.length; end += 1) {
    if (text[end] === "{") depth += 1;
    if (text[end] === "}") depth -= 1;
    if (depth === 0) break;
  }
  const body = text.slice(open, end + 1);
  assert.ok(body.includes("linkCreatedWorkOrder("), "o corpo delimitado não é o da aprovação");
  assert.equal(body.split(".catch(").length - 1, 0, "approveWithWorkOrder engole erro dentro da transação");
});
