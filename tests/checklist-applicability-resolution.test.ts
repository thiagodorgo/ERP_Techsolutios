import assert from "node:assert/strict";
import test from "node:test";

import {
  compareApplicabilityRules,
  isApplicabilityCandidate,
  resolveChecklistApplicability,
} from "../src/modules/checklists/applicability/checklist-applicability.resolution.js";
import type { ChecklistApplicabilityRule } from "../src/modules/checklists/applicability/checklist-applicability.types.js";

// CHECKLIST P1 PR-04a — a resolução de aplicabilidade é PURA, então dá para prová-la exaustivamente sem banco
// e sem servidor. E precisa ser provada exaustivamente: o vínculo é STICKY na criação da ordem de serviço e
// NÃO há backfill — uma resolução errada congela a vistoria errada naquela ordem PARA SEMPRE.
//
// As duas semânticas abaixo foram decididas por JUNTA (§C7.1), não escolhidas por conveniência:
//   · `generic` é FALLBACK (só entra se nenhuma fase concreta casou), não parcela que soma;
//   · CLIENTE vence SERVIÇO na precedência (o topo da ordem total, espelhando `pickApplicableTariff`).

const TENANT = "tenant-1";
const PUBLICADOS = new Set(["T1", "T2", "T3", "T4"]);

let contador = 0;

function regra(over: Partial<ChecklistApplicabilityRule> = {}): ChecklistApplicabilityRule {
  contador += 1;
  return {
    id: `rule-${String(contador).padStart(3, "0")}`,
    tenantId: TENANT,
    templateId: "T1",
    role: "collection",
    isActive: true,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...over,
  };
}

// ── candidatura: NULL é "qualquer", não "ausente" ──────────────────────────────────────────────

test("aplicabilidade: regra sem cliente casa qualquer cliente; regra COM cliente só casa aquele", () => {
  const semCliente = regra();
  const comCliente = regra({ customerId: "C1" });

  assert.equal(isApplicabilityCandidate(semCliente, { customerId: "C1" }), true);
  assert.equal(isApplicabilityCandidate(semCliente, { customerId: "C2" }), true);
  assert.equal(isApplicabilityCandidate(semCliente, {}), true, "sem cliente na ordem, a curinga ainda vale");

  assert.equal(isApplicabilityCandidate(comCliente, { customerId: "C1" }), true);
  assert.equal(isApplicabilityCandidate(comCliente, { customerId: "C2" }), false);
  assert.equal(isApplicabilityCandidate(comCliente, {}), false, "ordem sem cliente não casa regra de cliente");
});

test("aplicabilidade: regra desativada ou apagada nunca é candidata", () => {
  const desativada = regra({ isActive: false });
  const apagada = regra({ deletedAt: new Date("2026-02-01T00:00:00.000Z") });

  assert.equal(isApplicabilityCandidate(desativada, {}), false);
  assert.equal(isApplicabilityCandidate(apagada, {}), false);
});

test("aplicabilidade: regra apontando para modelo NÃO publicado é ignorada (disciplina do freeze do despacho)", () => {
  const paraRascunho = regra({ templateId: "T-RASCUNHO" });

  const { matches } = resolveChecklistApplicability([paraRascunho], {}, PUBLICADOS);

  assert.deepEqual(matches, [], "nunca se manda ao campo um formulário que a organização não publicou");
});

// ── DECISÃO 1 DA JUNTA: `generic` é FALLBACK ───────────────────────────────────────────────────

test("junta D1: o genérico NÃO soma quando uma fase concreta casou — ele é rede de segurança", () => {
  // O caso mais provável em produção: o administrador cria a curinga "toda ordem tem a vistoria padrão".
  const coleta = regra({ role: "collection", serviceCatalogId: "S1", templateId: "T1" });
  const generica = regra({ role: "generic", templateId: "T2" });

  const { matches, shadowed } = resolveChecklistApplicability(
    [coleta, generica],
    { serviceCatalogId: "S1" },
    PUBLICADOS,
  );

  assert.deepEqual(
    matches.map((match) => match.templateId),
    ["T1"],
    "com semântica de soma, TODA ordem do tenant ganharia uma vistoria a mais, para sempre e sem aviso",
  );
  assert.equal(shadowed.some((item) => item.templateId === "T2"), true, "o genérico preterido vira sombreamento");
});

test("junta D1: sem nenhuma fase concreta, o genérico RESGATA (senão a ordem ficaria sem vistoria)", () => {
  const generica = regra({ role: "generic", templateId: "T2" });

  const { matches } = resolveChecklistApplicability([generica], { serviceCatalogId: "S9" }, PUBLICADOS);

  assert.deepEqual(matches.map((match) => match.templateId), ["T2"]);
  assert.deepEqual(matches.map((match) => match.role), ["generic"]);
});

test("junta D1: coleta e entrega convivem — o teto por ordem é uma vistoria POR FASE", () => {
  const coleta = regra({ role: "collection", templateId: "T1" });
  const entrega = regra({ role: "delivery", templateId: "T2" });
  const generica = regra({ role: "generic", templateId: "T3" });

  const { matches } = resolveChecklistApplicability([coleta, entrega, generica], {}, PUBLICADOS);

  assert.deepEqual(matches.map((match) => match.templateId), ["T1", "T2"]);
  assert.equal(
    matches.some((match) => match.role === "generic"),
    false,
    "duas fases concretas casaram: o genérico fica de fora",
  );
});

test("junta D1: o MESMO modelo em duas fases sai UMA vez (senão a junção da PR-04b duplicaria a vistoria)", () => {
  const coleta = regra({ role: "collection", templateId: "T1" });
  const entrega = regra({ role: "delivery", templateId: "T1" });

  const { matches, shadowed } = resolveChecklistApplicability([coleta, entrega], {}, PUBLICADOS);

  assert.equal(matches.length, 1, "a mesma vistoria não pode ser pedida duas vezes na mesma ordem");
  assert.equal(matches[0].templateId, "T1");
  assert.equal(matches[0].role, "collection", "a primeira fase vence; a segunda vira sombreamento");
  assert.equal(shadowed.some((item) => item.ruleId === entrega.id), true);
});

// ── DECISÃO 2 DA JUNTA: CLIENTE vence SERVIÇO ──────────────────────────────────────────────────

test("junta D2: a exigência do CLIENTE vence o padrão do serviço — o cenário que decidiu o voto", () => {
  // "O cliente C exige o checklist reforçado" versus "o padrão do serviço X". A ordem casa as duas.
  const padraoDoServico = regra({ role: "collection", serviceCatalogId: "S1", templateId: "T1" });
  const exigenciaDoCliente = regra({
    role: "collection",
    serviceType: "reboque",
    customerId: "C1",
    templateId: "T2",
  });

  const { matches, shadowed } = resolveChecklistApplicability(
    [padraoDoServico, exigenciaDoCliente],
    { serviceCatalogId: "S1", serviceType: "reboque", customerId: "C1" },
    PUBLICADOS,
  );

  assert.deepEqual(
    matches.map((match) => match.templateId),
    ["T2"],
    "com serviço dominando, a exigência contratual do cliente seria ignorada EM SILÊNCIO, e sem backfill " +
      "as ordens desse cliente ficariam sem a prova contratada para sempre",
  );
  assert.equal(shadowed.some((item) => item.templateId === "T1"), true);
});

test("junta D2: dentro do mesmo cliente, a precedência do dono sobrevive intacta (concreto > tipo > qualquer)", () => {
  const porServico = regra({ role: "collection", serviceCatalogId: "S1", customerId: "C1", templateId: "T1" });
  const porTipo = regra({ role: "collection", serviceType: "reboque", customerId: "C1", templateId: "T2" });
  const curinga = regra({ role: "collection", customerId: "C1", templateId: "T3" });

  const contexto = { serviceCatalogId: "S1", serviceType: "reboque", customerId: "C1" };

  assert.equal(
    resolveChecklistApplicability([curinga, porTipo, porServico], contexto, PUBLICADOS).matches[0].templateId,
    "T1",
  );
  assert.equal(
    resolveChecklistApplicability([curinga, porTipo], contexto, PUBLICADOS).matches[0].templateId,
    "T2",
  );
  assert.equal(resolveChecklistApplicability([curinga], contexto, PUBLICADOS).matches[0].templateId, "T3");
});

test("junta D2: sem regra do cliente, o padrão do serviço volta a valer para todos os outros clientes", () => {
  const padraoDoServico = regra({ role: "collection", serviceCatalogId: "S1", templateId: "T1" });
  const exigenciaDoCliente = regra({ role: "collection", customerId: "C1", templateId: "T2" });

  const { matches } = resolveChecklistApplicability(
    [padraoDoServico, exigenciaDoCliente],
    { serviceCatalogId: "S1", customerId: "C2" },
    PUBLICADOS,
  );

  assert.deepEqual(matches.map((match) => match.templateId), ["T1"]);
});

// ── ordem total: não existe empate ─────────────────────────────────────────────────────────────

test("ordem total: com tudo igual, o desempate final é o id — a resolução é reproduzível", () => {
  const mesmoInstante = new Date("2026-03-01T00:00:00.000Z");
  const b = regra({ id: "rule-bbb", createdAt: mesmoInstante, templateId: "T2" });
  const a = regra({ id: "rule-aaa", createdAt: mesmoInstante, templateId: "T1" });

  assert.equal(compareApplicabilityRules(a, b) < 0, true);
  assert.equal(compareApplicabilityRules(b, a) > 0, true);
  assert.equal(compareApplicabilityRules(a, a), 0);

  // Reproduzível independentemente da ordem de entrada — é o que garante que memória e Prisma congelem a
  // MESMA vistoria na criação da ordem.
  const daFrente = resolveChecklistApplicability([a, b], {}, PUBLICADOS).matches[0];
  const deTras = resolveChecklistApplicability([b, a], {}, PUBLICADOS).matches[0];
  assert.deepEqual(daFrente, deTras);
});

test("ordem total: entre regras igualmente específicas, a mais RECENTE vence", () => {
  const antiga = regra({ createdAt: new Date("2026-01-01T00:00:00.000Z"), templateId: "T1" });
  const nova = regra({ createdAt: new Date("2026-06-01T00:00:00.000Z"), templateId: "T2" });

  const { matches } = resolveChecklistApplicability([antiga, nova], {}, PUBLICADOS);

  assert.equal(matches[0].templateId, "T2");
});

test("nenhuma regra casa: a resolução devolve vazio, não inventa vistoria", () => {
  const outroCliente = regra({ customerId: "C9" });

  const { matches, shadowed } = resolveChecklistApplicability([outroCliente], { customerId: "C1" }, PUBLICADOS);

  assert.deepEqual(matches, []);
  assert.deepEqual(shadowed, []);
});

test("a proveniência viaja no resultado: qual regra escolheu a vistoria", () => {
  const vencedora = regra({ role: "collection", customerId: "C1", templateId: "T2" });

  const { matches } = resolveChecklistApplicability([vencedora], { customerId: "C1" }, PUBLICADOS);

  assert.equal(matches[0].ruleId, vencedora.id, "sem isto, ninguém explica seis meses depois por que esta vistoria");
});
