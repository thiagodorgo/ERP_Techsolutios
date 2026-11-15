import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { FRONTEND_ROOT, listSmokeFiles, smokeArgPath } from "../scripts/run-smoke.mjs";

// B-SMOKE-LISTA — o runner do `test:smoke` (`frontend/scripts/run-smoke.mjs`). Fecha `P-SMOKE-LINHA-NO-LIMITE-DO-WINDOWS`.
//   T1 o script do `package.json` é o runner, sem lista de arquivos na linha de comando;
//   T2 equivalência: todo arquivo da lista congelada do `026d5fd2` que ainda existe é rodado pelo runner;
//   T3 o runner lista exatamente os `*.test.ts(x)` direto em `tests/`, e este arquivo, que não estava na lista, entra sozinho;
//   T4 o filtro e a não recursão, numa fixture isolada (mata o runner sem o filtro `*.test.*` e o runner recursivo);
//   T5 o caminho que vai para o `node --test`: relativo dentro do frontend, absoluto fora;
//   T6 o código de saída do `node --test` passa pelo runner (mata o runner que engole o código de saída), e zero arquivo
//      ou argumento a mais falham.
// As fixtures vivem em diretório temporário do sistema, nunca em `frontend/tests`, e saem no `finally`.

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND = path.resolve(HERE, "..");
const TESTS_DIR = path.join(FRONTEND, "tests");
const RUNNER = path.join(FRONTEND, "scripts", "run-smoke.mjs");
const THIS_FILE = `tests/${path.basename(fileURLToPath(import.meta.url))}`;

/** A lista do `test:smoke` na `origin/main` `026d5fd2`, a última escrita à mão: 219 caminhos, na ordem de lá. */
const LISTA_026D5FD2: readonly string[] = [
  "tests/smoke-flow.test.tsx",
  "tests/work-orders.adapter.test.ts",
  "tests/dispatches.adapter.test.ts",
  "tests/dispatch-create-idempotency.test.ts",
  "tests/api-client.test.ts",
  "tests/dashboard.adapter.test.ts",
  "tests/customers.adapter.test.ts",
  "tests/customers.smoke.test.tsx",
  "tests/vehicles.adapter.test.ts",
  "tests/vehicles.smoke.test.tsx",
  "tests/teams.adapter.test.ts",
  "tests/teams.smoke.test.tsx",
  "tests/service-catalog.adapter.test.ts",
  "tests/service-catalog.smoke.test.tsx",
  "tests/price-tables.adapter.test.ts",
  "tests/price-tables.smoke.test.tsx",
  "tests/tariffs.adapter.test.ts",
  "tests/tariffs.smoke.test.tsx",
  "tests/service-quotes.smoke.test.tsx",
  "tests/branches.adapter.test.ts",
  "tests/branches.smoke.test.tsx",
  "tests/suppliers.adapter.test.ts",
  "tests/suppliers.smoke.test.tsx",
  "tests/tags.adapter.test.ts",
  "tests/tags.smoke.test.tsx",
  "tests/pois.adapter.test.ts",
  "tests/pois.smoke.test.tsx",
  "tests/operator-profiles.adapter.test.ts",
  "tests/operator-profiles.smoke.test.tsx",
  "tests/tenant-settings.adapter.test.ts",
  "tests/tenant-settings.smoke.test.tsx",
  "tests/cadastros-nav.test.tsx",
  "tests/sidebar-nav.test.tsx",
  "tests/access-gating.test.ts",
  "tests/checklists-access-gating.smoke.test.tsx",
  "tests/checklists-models-list.smoke.test.tsx",
  "tests/checklists-editor.smoke.test.tsx",
  "tests/checklists-editor-lock.smoke.test.tsx",
  "tests/checklists-preview.smoke.test.tsx",
  "tests/checklists-run-lock.test.ts",
  "tests/invoices-nfe-honest-stop.smoke.test.tsx",
  "tests/platform-health-honest-stop.smoke.test.tsx",
  "tests/trend-chart.test.tsx",
  "tests/work-order-timeseries.test.tsx",
  "tests/dashboard-timeseries-permission-gate.test.tsx",
  "tests/kpi-cards-clickable.test.tsx",
  "tests/kpi-cards-clickable-f2b.test.tsx",
  "tests/work-order-registry-links.test.tsx",
  "tests/work-order-registry-links-detail.test.tsx",
  "tests/dense-list.test.ts",
  "tests/fuel-logs.adapter.test.ts",
  "tests/fuel-logs.smoke.test.tsx",
  "tests/maintenance-orders.adapter.test.ts",
  "tests/maintenance-orders.smoke.test.tsx",
  "tests/fines.adapter.test.ts",
  "tests/fines.smoke.test.tsx",
  "tests/insurance-policies.adapter.test.ts",
  "tests/insurance-policies.smoke.test.tsx",
  "tests/damages.adapter.test.ts",
  "tests/damages.smoke.test.tsx",
  "tests/operations-map.adapter.test.ts",
  "tests/operations-map-libre.test.ts",
  "tests/operations-map-work-order-pins.test.ts",
  "tests/operations-map-google-canvas.test.ts",
  "tests/operations-map-faxina.test.ts",
  "tests/operations-map-work-orders.adapter.test.ts",
  "tests/operations-map-layout.test.ts",
  "tests/operations-map-legend-footer.test.ts",
  "tests/operations-map-technicians.test.ts",
  "tests/operations-map-calls.test.ts",
  "tests/operations-map-alert.test.ts",
  "tests/operations-map-allocation.test.ts",
  "tests/operations-map-view-memory.test.ts",
  "tests/operations-map-routes-layer.test.ts",
  "tests/operations-map-dnd.test.ts",
  "tests/operations-map-marker-popup.test.ts",
  "tests/operations-map-detail-popover.test.ts",
  "tests/inventory.adapter.test.ts",
  "tests/inventory.smoke.test.tsx",
  "tests/commissions.adapter.test.ts",
  "tests/commissions.smoke.test.tsx",
  "tests/financial-summary.adapter.test.ts",
  "tests/users.adapter.test.ts",
  "tests/users.smoke.test.tsx",
  "tests/notifications.adapter.test.ts",
  "tests/notifications.smoke.test.tsx",
  "tests/command-palette.test.tsx",
  "tests/copy-cera.test.tsx",
  "tests/work-order-hub.test.tsx",
  "tests/work-order-financials.test.tsx",
  "tests/work-order-quote-tab.test.tsx",
  "tests/work-order-comments-tab.test.tsx",
  "tests/work-order-attachments-tab.test.tsx",
  "tests/work-order-cancel-duplicate-tab.test.tsx",
  "tests/work-order-mobile-mileage-tab.test.tsx",
  "tests/work-order-logs-tab.test.tsx",
  "tests/work-order-form-destination.test.ts",
  "tests/work-order-map-tab.test.tsx",
  "tests/work-orders-row-actions.test.tsx",
  "tests/work-orders-honest-errors.test.tsx",
  "tests/work-orders-page-live.test.tsx",
  "tests/finance-titles.test.tsx",
  "tests/audit-events.smoke.test.tsx",
  "tests/field-operators.smoke.test.tsx",
  "tests/platform-overview.smoke.test.tsx",
  "tests/platform-tenant-detail.smoke.test.tsx",
  "tests/approvals.smoke.test.tsx",
  "tests/entity-attachments-tab.test.tsx",
  "tests/payable-toggle.test.tsx",
  "tests/extrato-profissional.test.tsx",
  "tests/scheduled-notification.test.tsx",
  "tests/abastecimento-station-type.test.tsx",
  "tests/manutencao-itens.test.tsx",
  "tests/multas-condutor.test.tsx",
  "tests/estoque-custodia.test.tsx",
  "tests/danos-responsavel.test.tsx",
  "tests/remuneracoes-liquidar.test.tsx",
  "tests/auditoria-sessoes.test.tsx",
  "tests/telemetria-web.test.tsx",
  "tests/telemetria-rastreamento.test.tsx",
  "tests/track-geometry.test.ts",
  "tests/central-notificacoes.smoke.test.tsx",
  "tests/patios-yards.smoke.test.tsx",
  "tests/patios-perfis.smoke.test.tsx",
  "tests/patios-processos.smoke.test.tsx",
  "tests/patios-dossie.smoke.test.tsx",
  "tests/patios-mapa.smoke.test.tsx",
  "tests/patios-debitos.smoke.test.tsx",
  "tests/patios-transicoes.smoke.test.tsx",
  "tests/patios-liberacao.smoke.test.tsx",
  "tests/patios-liberacoes-fila.smoke.test.tsx",
  "tests/patios-leiloes.smoke.test.tsx",
  "tests/patios-leiloes-funil.smoke.test.tsx",
  "tests/patios-liquidacao.smoke.test.tsx",
  "tests/patios-painel.smoke.test.tsx",
  "tests/price-tables-scope-category.smoke.test.tsx",
  "tests/modal-large.test.tsx",
  "tests/patios-dossie-modal.smoke.test.tsx",
  "tests/patios-dossie-deeplink.smoke.test.tsx",
  "tests/patios-dossie-checklist.smoke.test.tsx",
  "tests/patios-dossie-history.smoke.test.tsx",
  "tests/patios-dossie-print.smoke.test.tsx",
  "tests/pattern-css-guard.test.ts",
  "tests/auth-login-errors.adapter.test.ts",
  "tests/san3-04a-sidebar-estoque-financeiro.test.tsx",
  "tests/patios-dossie-versao.smoke.test.tsx",
  "tests/work-orders-list-tools.test.ts",
  "tests/san3-06b-organizacoes.smoke.test.tsx",
  "tests/san3-06b-cloud-billing.smoke.test.tsx",
  "tests/san3-06b-paradas-honestas.smoke.test.tsx",
  "tests/san3-06b-health.smoke.test.tsx",
  "tests/san3-06b-navegacao-plataforma.test.ts",
  "tests/san3-06b-console-sem-ficcao.guard.test.ts",
  "tests/dashboard-profile-behavior.test.tsx",
  "tests/dashboard-profile-provider.test.tsx",
  "tests/context-selection-page-live.test.tsx",
  "tests/aparencia-storage.test.ts",
  "tests/aparencia-hook.test.tsx",
  "tests/aparencia-menu.smoke.test.tsx",
  "tests/aparencia-registro.guard.test.ts",
  "tests/os-aparencia-a.smoke.test.tsx",
  "tests/os-aparencia-b.smoke.test.tsx",
  "tests/os-aparencia-c.smoke.test.tsx",
  "tests/os-aparencias-live.test.tsx",
  "tests/dashboard-aparencia-a.smoke.test.tsx",
  "tests/dashboard-aparencia-b.smoke.test.tsx",
  "tests/dashboard-aparencia-c.smoke.test.tsx",
  "tests/dashboard-aparencias-live.test.tsx",
  "tests/aparencia-patios.smoke.test.tsx",
  "tests/aparencia-patios-live.test.tsx",
  "tests/financial-accounts.adapter.test.ts",
  "tests/financial-entries.adapter.test.ts",
  "tests/dense-expandable-row.test.tsx",
  "tests/finance-no-money-reduce.guard.test.ts",
  "tests/finance-redirects.test.tsx",
  "tests/finance-baixa.smoke.test.tsx",
  "tests/finance-contas-extrato.smoke.test.tsx",
  "tests/finance-conciliacao.smoke.test.tsx",
  "tests/finance-page-live.test.tsx",
  "tests/balance-bridge.test.tsx",
  "tests/reconcile-donut.test.tsx",
  "tests/day-bars.test.tsx",
  "tests/finance-aparencia-b.smoke.test.tsx",
  "tests/finance-aparencia-c.smoke.test.tsx",
  "tests/auth-troca-senha.adapter.test.ts",
  "tests/troca-senha-live.test.tsx",
  "tests/context-switch-troca-senha.test.tsx",
  "tests/bsan315-contagem-fechamento.test.tsx",
  "tests/b-san3-24-cheque-actions.test.ts",
  "tests/b-san3-24-cheque-cash-impact.test.ts",
  "tests/b-san3-24-cheques.smoke.test.tsx",
  "tests/b-san3-24-cheques-live.test.tsx",
  "tests/b-san3-24-cheques-aparencias-live.test.tsx",
  "tests/b-san3-24-period-actions.test.ts",
  "tests/b-san3-24-fechamento-live.test.tsx",
  "tests/b-san3-24-fechamento-aparencias-live.test.tsx",
  "tests/b-san3-24-conserto-j547.test.tsx",
  "tests/b-san3-24-conserto-j547-live.test.tsx",
  "tests/b-san3-25-faturar-os.smoke.test.tsx",
  "tests/b-san3-25-faturar-os-live.test.tsx",
  "tests/b-san3-24-titles-sem-orfao.test.ts",
  "tests/ass-10b-cambio.test.ts",
  "tests/ass-10b-mes-inicial.test.ts",
  "tests/ass-10b-dinheiro.smoke.test.tsx",
  "tests/ass-10b-acoes.smoke.test.tsx",
  "tests/ass-10b-biblioteca.smoke.test.tsx",
  "tests/ass-10b-grupos.test.ts",
  "tests/ass-10b-nao-calcula.guard.test.ts",
  "tests/ass-10b-uso-medido.smoke.test.tsx",
  "tests/ass-10b-aparencias.smoke.test.tsx",
  "tests/ass-10b-estados.smoke.test.tsx",
  "tests/ass-10b-guarda.test.ts",
  "tests/ass-10b-aparencia-plataforma.smoke.test.tsx",
  "tests/ass-11-usage-pie.test.tsx",
  "tests/ass-11-minha-assinatura.adapter.test.ts",
  "tests/ass-11-minha-assinatura.smoke.test.tsx",
  "tests/ass-11-minha-assinatura-live.test.tsx",
  "tests/ass-11-menu-e-rota.test.tsx",
  "tests/ass-11-escopo.guard.test.ts",
];

const listed = () => listSmokeFiles(TESTS_DIR).map((name: string) => `tests/${name}`);

function withTempDir<T>(fn: (dir: string) => T): T {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "erp-run-smoke-"));
  try {
    return fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function write(file: string, lines: readonly string[]): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${lines.join("\n")}\n`, "utf8");
}

test("T1 o test:smoke é o runner, sem lista de arquivos na linha de comando", () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(FRONTEND, "package.json"), "utf8"));
  assert.equal(pkg.scripts["test:smoke"], "node scripts/run-smoke.mjs");
  assert.equal(path.resolve(FRONTEND_ROOT), FRONTEND, "o runner roda o node --test a partir do frontend");
});

test("T2 equivalência: todo arquivo da lista do 026d5fd2 que ainda existe é rodado pelo runner", () => {
  assert.equal(LISTA_026D5FD2.length, 219);
  assert.equal(new Set(LISTA_026D5FD2).size, 219, "a lista congelada não tem repetido");
  const existing = LISTA_026D5FD2.filter((file) => fs.existsSync(path.join(FRONTEND, file)));
  assert.ok(existing.length > 0, "controle de vacuidade: a lista congelada ainda aponta para arquivos que existem");
  const runs = new Set(listed());
  assert.deepEqual(existing.filter((file) => !runs.has(file)), [], "arquivo da lista antiga que o runner deixaria de rodar");
});

test("T3 o runner lista exatamente os *.test.ts(x) direto em tests/, e um arquivo novo entra sozinho", () => {
  const onDisk = fs
    .readdirSync(TESTS_DIR)
    .filter((name) => /\.test\.tsx?$/.test(name) && fs.statSync(path.join(TESTS_DIR, name)).isFile())
    .sort();
  assert.deepEqual(listSmokeFiles(TESTS_DIR), onDisk);
  for (const file of listed()) assert.match(file, /^tests\/[^/\\]+\.test\.tsx?$/);
  assert.ok(listed().includes(THIS_FILE), "este arquivo não estava na lista antiga e o runner o pega sem editar o package.json");
  assert.ok(!LISTA_026D5FD2.includes(THIS_FILE));
});

test("T4 fixture: só *.test.ts e *.test.tsx, só arquivo, só no nível de cima, em ordem alfabética", () => {
  withTempDir((dir) => {
    const tests = path.join(dir, "tests");
    for (const name of ["b.test.tsx", "a.test.ts", "helper.ts", "algo.guard.ts", "dados.json", "c.test.js", "d.test.ts.bak", "leia-me.md"]) {
      write(path.join(tests, name), ["export {};"]);
    }
    write(path.join(tests, "helpers", "aninhado.test.ts"), ["export {};"]);
    write(path.join(tests, "sub", "fundo", "x.test.tsx"), ["export {};"]);
    write(path.join(tests, "pasta.test.ts", "dentro.test.ts"), ["export {};"]);
    assert.deepEqual(listSmokeFiles(tests), ["a.test.ts", "b.test.tsx"]);
  });
});

test("T5 o caminho para o node --test: relativo dentro do frontend, absoluto fora", () => {
  assert.equal(smokeArgPath(TESTS_DIR, "x.test.ts"), "tests/x.test.ts");
  const outside = path.join(os.tmpdir(), "erp-run-smoke-fora");
  assert.equal(smokeArgPath(outside, "x.test.ts"), path.join(outside, "x.test.ts"));
});

const PASSA = [
  'import assert from "node:assert/strict";',
  'import test from "node:test";',
  "const um: number = 1;",
  'test("fixture: passa a", () => { assert.equal(um, 1); });',
  'test("fixture: passa b", () => { assert.ok(true); });',
];

const FALHA = [
  'import assert from "node:assert/strict";',
  'import test from "node:test";',
  "const um: number = 1;",
  'test("fixture: falha de proposito", () => { assert.equal(um, 2); });',
];

type RunnerRun = { readonly status: number | null; readonly stdout: string; readonly stderr: string };

function runRunner(args: readonly string[]): RunnerRun {
  // `NODE_TEST_CONTEXT` vem do test runner de fora; herdada, o `node --test` de dentro pula os arquivos e sai 0.
  // No uso real (npm, CI) ela não existe.
  const env: NodeJS.ProcessEnv = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  const result = spawnSync(process.execPath, [RUNNER, ...args], { cwd: FRONTEND, encoding: "utf8", timeout: 120_000, env });
  assert.equal(result.error, undefined, `o runner não executou: ${result.error?.message}`);
  return { status: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

test("T6a fixture com teste que FALHA: o runner sai com código diferente de 0 e o TAP do filho chega", () => {
  withTempDir((dir) => {
    write(path.join(dir, "vermelho.test.ts"), FALHA);
    const run = runRunner([dir]);
    assert.notEqual(run.status, 0, `saiu 0 com teste falhando:\n${run.stdout}\n${run.stderr}`);
    assert.match(run.stdout, /^not ok 1 - fixture: falha de proposito$/m);
    assert.match(run.stdout, /^# fail 1$/m);
  });
});

test("T6b fixture verde: o runner sai 0 e o TAP traz os 2 testes", () => {
  withTempDir((dir) => {
    write(path.join(dir, "verde.test.ts"), PASSA);
    const run = runRunner([dir]);
    assert.equal(run.status, 0, `saiu ${run.status} com teste verde:\n${run.stdout}\n${run.stderr}`);
    assert.match(run.stdout, /^# tests 2$/m);
    assert.match(run.stdout, /^# pass 2$/m);
    assert.match(run.stdout, /^# fail 0$/m);
  });
});

test("T6c diretório sem arquivo de teste: o runner sai 1 e diz por quê", () => {
  withTempDir((dir) => {
    write(path.join(dir, "helper.ts"), ["export {};"]);
    write(path.join(dir, "helpers", "aninhado.test.ts"), FALHA);
    const run = runRunner([dir]);
    assert.equal(run.status, 1, `esperava 1, veio ${run.status}:\n${run.stdout}\n${run.stderr}`);
    assert.match(run.stderr, /nenhum arquivo \*\.test\.ts ou \*\.test\.tsx/);
    assert.doesNotMatch(run.stdout, /^# tests/m, "não havia o que rodar");
  });
});

test("T6d mais de um argumento: o runner sai 2 sem rodar nada", () => {
  const run = runRunner([TESTS_DIR, TESTS_DIR]);
  assert.equal(run.status, 2);
  assert.match(run.stderr, /no máximo 1 argumento/);
  assert.doesNotMatch(run.stdout, /^# tests/m);
});
