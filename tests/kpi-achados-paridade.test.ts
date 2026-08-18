import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

// O painel de KPI passou a publicar o estado da auditoria Ω6R — quantos achados existem, quantos
// fecharam, quais blocos os fecham. Esse número sai do `Kpis/kpis-latest.json`, mas a VERDADE mora em
// `docs/revisoes/O6R/achados.jsonl`. Dois arquivos com o mesmo número escrito à mão divergem: quando
// este guard foi escrito, o registro em Markdown dizia "29 ativos" enquanto o JSONL já tinha 30 linhas
// com 2 fechados — a divergência só apareceu porque alguém foi montar o painel.
//
// Este guard existe para que a próxima divergência falhe a bateria em vez de ir para a tela que o dono
// mostra a investidor. Ele NÃO valida o painel (isso é o kpi-dashboard-charts); valida que os três
// artefatos contam a mesma história: JSONL ↔ KPI ↔ registro em Markdown.

const ROOT = fileURLToPath(new URL("../", import.meta.url));

type Achado = { id: string; severidade: string; status: string; modulo?: string };

const ACHADOS: Achado[] = readFileSync(`${ROOT}docs/revisoes/O6R/achados.jsonl`, "utf8")
  .split("\n")
  .filter((line) => line.trim().length > 0)
  .map((line) => JSON.parse(line) as Achado);

const LATEST = JSON.parse(readFileSync(`${ROOT}Kpis/kpis-latest.json`, "utf8")) as {
  production_readiness?: Record<string, unknown>;
  findings?: { itens?: ReadonlyArray<{ id: string; severidade: string; status: string; resumo?: string; bloco?: string | null }> };
  roadmap?: { blocos?: ReadonlyArray<{ id: string; achados?: readonly string[]; estado: string }> };
};

const REGISTRO = readFileSync(`${ROOT}docs/revisoes/O6R/REGISTRO_ACHADOS_O6R.md`, "utf8");

const fechado = (a: { status: string }) => a.status === "fechado";
const bySev = (sev: string) => ACHADOS.filter((a) => a.severidade === sev);

test("auditoria: o painel publica exatamente a contagem do registro de achados", () => {
  const pr = LATEST.production_readiness;
  assert.ok(pr, "kpis-latest.json precisa do bloco production_readiness — é o que o painel lê.");

  const p0 = bySev("P0");
  const p1 = bySev("P1");

  assert.equal(pr.p0_total, p0.length, "p0_total divergiu do achados.jsonl");
  assert.equal(pr.p0_fechados, p0.filter(fechado).length, "p0_fechados divergiu do achados.jsonl");
  assert.equal(pr.p0_abertos, p0.length - p0.filter(fechado).length, "p0_abertos não fecha com total − fechados");
  assert.equal(pr.p1_total, p1.length, "p1_total divergiu do achados.jsonl");
  assert.equal(pr.p1_fechados, p1.filter(fechado).length, "p1_fechados divergiu do achados.jsonl");
  assert.equal(pr.p1_abertos, p1.length - p1.filter(fechado).length, "p1_abertos não fecha com total − fechados");

  // Toda severidade do registro tem de estar contabilizada em algum balde. Um `P2` novo hoje
  // sumiria da tela sem ninguém perceber.
  assert.equal(p0.length + p1.length, ACHADOS.length, `há achados fora de P0/P1: ${[...new Set(ACHADOS.map((a) => a.severidade))].join(", ")}`);
});

test("auditoria: cada achado do registro aparece no painel, com o mesmo estado", () => {
  const itens = LATEST.findings?.itens ?? [];
  assert.equal(itens.length, ACHADOS.length, "o painel lista um número de achados diferente do registro");

  const noPainel = new Map(itens.map((i) => [i.id, i]));
  for (const a of ACHADOS) {
    const i = noPainel.get(a.id);
    assert.ok(i, `${a.id} existe no registro e sumiu do painel`);
    assert.equal(i.severidade, a.severidade, `${a.id}: severidade divergente`);
    assert.equal(i.status, a.status, `${a.id}: estado divergente entre registro e painel`);
    assert.ok(i.resumo && i.resumo.trim().length > 0, `${a.id}: sem resumo — o painel mostraria uma linha vazia`);
  }

  // E o inverso: o painel não pode inventar achado que o registro não tem (D-007).
  for (const i of itens) {
    assert.ok(ACHADOS.some((a) => a.id === i.id), `${i.id} está no painel e não existe no registro`);
  }
});

test("auditoria: todo achado fechado carrega rastro — quem fechou e quando", () => {
  const fechados = ACHADOS.filter(fechado) as Array<Achado & { fechado_em?: string; fechado_por?: string; evidencia_fechamento?: string }>;
  const raw = readFileSync(`${ROOT}docs/revisoes/O6R/achados.jsonl`, "utf8")
    .split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l) as Record<string, unknown>);

  for (const a of fechados) {
    const linha = raw.find((r) => r.id === a.id)!;
    assert.ok(linha.fechado_em, `${a.id}: fechado sem data — um fechamento sem rastro não é fechamento`);
    assert.ok(linha.fechado_por, `${a.id}: fechado sem dizer qual bloco/PR o fechou`);
    assert.ok(linha.evidencia_fechamento, `${a.id}: fechado sem evidência`);

    // O registro em Markdown é o documento que a junta lê. Ele tem de concordar.
    const secao = REGISTRO.split(/^### /m).find((s) => s.startsWith(`[${a.id}]`));
    assert.ok(secao, `${a.id}: sem seção no REGISTRO_ACHADOS_O6R.md`);
    assert.match(secao, /- Status: \*\*fechado\*\*/, `${a.id}: fechado no JSONL e o registro em Markdown não diz isso`);
  }

  const espelhados = LATEST.production_readiness?.fechados as ReadonlyArray<{ id: string }> | undefined;
  assert.equal(espelhados?.length ?? -1, fechados.length, "a lista de fechados do painel divergiu do registro");
});

test("auditoria: o veredito só some da tela quando não houver mais crítico aberto", () => {
  const pr = LATEST.production_readiness as Record<string, unknown>;
  const criticosAbertos = bySev("P0").filter((a) => !fechado(a)).length;

  if (criticosAbertos > 0) {
    assert.equal(pr.deploy_bloqueado, true, `há ${criticosAbertos} achados críticos abertos e o painel não marca o bloqueio de produção`);
    assert.match(String(pr.veredito), /REPROVADO/i, "com crítico aberto, o veredito publicado tem de dizer o que a junta decidiu");
  }

  // Fechar achados NÃO libera deploy por si — só a junta libera. Este guard existe para impedir que
  // alguém troque o veredito ao ver o contador chegar a zero; nesse dia, o teste falha de propósito e
  // obriga a decisão a passar por uma junta com ata.
  if (criticosAbertos === 0 && pr.deploy_bloqueado === false) {
    assert.ok(
      String(pr.fonte_veredito ?? "").includes("J-") && String(pr.veredito ?? "").match(/APROVAD/i),
      "liberar produção exige veredito novo de junta registrado em fonte_veredito — não basta zerar o contador",
    );
  }
});

test("auditoria: o cronograma cobre todo achado aberto, e nenhum bloco promete achado inexistente", () => {
  const blocos = LATEST.roadmap?.blocos ?? [];
  assert.ok(blocos.length > 0, "kpis-latest.json precisa do bloco roadmap — é o cronograma do painel");

  const cobertos = new Set(blocos.flatMap((b) => b.achados ?? []));
  const abertosSemBloco = ACHADOS.filter((a) => !fechado(a) && !cobertos.has(a.id)).map((a) => a.id);
  assert.deepEqual(abertosSemBloco, [], `achados abertos sem bloco de correção no cronograma: ${abertosSemBloco.join(", ")}`);

  const inventados = [...cobertos].filter((id) => !ACHADOS.some((a) => a.id === id));
  assert.deepEqual(inventados, [], `o cronograma cita achados que não existem: ${inventados.join(", ")}`);

  // Bloco marcado como concluído não pode ter achado seu ainda aberto — foi assim que a distinção
  // entre "fechado" e "parcialmente superado" precisou existir (Ω6R-QUA-004, PR #351).
  for (const b of blocos.filter((x) => x.estado === "concluido")) {
    const pendentes = (b.achados ?? []).filter((id) => {
      const a = ACHADOS.find((x) => x.id === id);
      return a && !fechado(a);
    });
    assert.deepEqual(pendentes, [], `${b.id} está marcado como concluído mas seus achados ${pendentes.join(", ")} seguem abertos`);
  }
});
