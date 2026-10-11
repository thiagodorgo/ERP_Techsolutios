import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test, { before } from "node:test";

import {
  analisarTipos,
  classificar,
  DIR_FORMAS,
  executarCenso,
  lerInstantaneo,
  type Censo,
  type Classificacao,
  type Instantaneo,
} from "./helpers/o6r07c-census.js";

// B-O6R-07c-a (07c-a.3 do plano v3) — O GUARD QUE O 07c-a ENTREGA (e que o 07c-b vai esvaziar).
//
// A propriedade que este arquivo enuncia (plano, Comum C.2):
//   (1) TODA camada do app que pode responder a uma requisição é contada — rota, roteador, sub-app e middleware —, e
//       o que não está classificado no instantâneo, ou mudou de contagem, deixa o guard vermelho;
//   (2) nenhum middleware responde 2xx/3xx ao papel de campo;
//   (3) o conjunto de tipos que um lote ACEITA vem dos pontos em que o despachante decide pelo campo `type`, com
//       dobra de constante; o que não se resolve deixa o guard vermelho;
//   (4) "alcança" e "aceita" são decididos por IGUALDADE de respostas, nunca por texto de motivo;
//   (5) a classe escrita no instantâneo é CONFERIDA contra a propriedade, e leitura que muda a OS é vermelho.
//
// Cada T abaixo é uma dessas propriedades, não uma lista de casos. O T12 é a prova de que o gerador não regrediu
// para "reconhecer forma": as formas das duas críticas, injetadas no app real, têm de ser achadas uma a uma.
//
// O instantâneo (`tests/fixtures/o6r07c-classificacao-vias.json`) é GERADO, não escrito à mão:
//   node --import tsx tests/helpers/o6r07c-census.ts gravar tests/fixtures/o6r07c-classificacao-vias.json
// e o diff dele é revisado chave a chave. Camada nova no produto inteiro passa por alguém que a classifica (R-a2).
//
// Tempo: três censos completos (linha de base e dois grupos de formas), cada um em processo próprio, em paralelo.

const INSTANTANEO: Instantaneo = lerInstantaneo();

// A lista literal das 23 entradas `·07c-b` de hoje (plano, Apêndice B). Catraca: só diminui; no 07c-b chega a vazio.
const LISTA_07C_B = [
  "ROTA PATCH /api/v1/mobile/checklist-runs/:runId",
  "ROTA PATCH /api/v1/operations/dispatches/:dispatchId/status",
  "ROTA POST /api/v1/mobile/checklist-runs/:runId/acknowledgement",
  "ROTA POST /api/v1/mobile/checklist-runs/:runId/attachments",
  "ROTA POST /api/v1/mobile/checklist-runs/:runId/complete",
  "ROTA POST /api/v1/mobile/checklist-runs/:runId/divergence",
  "ROTA POST /api/v1/mobile/checklist-runs/:runId/markers",
  "ROTA POST /api/v1/mobile/evidence-uploads",
  "PAR /api/v1/mobile/sync/checklist-actions · checklist.acknowledgement_create",
  "PAR /api/v1/mobile/sync/checklist-actions · checklist.attachment_attach",
  "PAR /api/v1/mobile/sync/checklist-actions · checklist.complete",
  "PAR /api/v1/mobile/sync/checklist-actions · checklist.divergence_create",
  "PAR /api/v1/mobile/sync/checklist-actions · checklist.item_answer",
  "PAR /api/v1/mobile/sync/checklist-actions · checklist.item_note",
  "PAR /api/v1/mobile/sync/checklist-actions · checklist.marker_create",
  "PAR /api/v1/mobile/sync/checklist-actions · checklist_acknowledgement.create",
  "PAR /api/v1/mobile/sync/checklist-actions · checklist_attachment.attach",
  "PAR /api/v1/mobile/sync/checklist-actions · checklist_divergence.create",
  "PAR /api/v1/mobile/sync/checklist-actions · checklist_marker.create",
  "PAR /api/v1/mobile/sync/checklist-actions · checklist_run.complete",
  "PAR /api/v1/mobile/sync/evidence-actions · evidence.work_order_observation",
  "PAR /api/v1/mobile/sync/evidence-actions · evidence.work_order_photo",
  "PAR /api/v1/mobile/sync/evidence-actions · evidence.work_order_signature",
];

// As entidades da rota polimórfica `/attachments` hoje (B8 da r2): entidade nova no registro é via nova com a
// mesma chave de rota — o T1 não a vê, o T13 vê.
const ENTIDADES_ATTACHMENTS = ["damage", "fine", "insurance_policy", "maintenance_order"];

// Toda categoria de violação que o classificador emite tem um T dono abaixo. Categoria nova sem dono = T0 vermelho.
const CATEGORIAS: Record<string, string> = {
  "NAO-CLASSIFICADA": "T1",
  ENVELHECIDA: "T2",
  "SEM-CAMINHO": "T3",
  CONTAGEM: "T4",
  "MIDDLEWARE-RESPONDE-SUCESSO": "T5",
  "CLASSE-INCOMPATIVEL": "T6",
  "LEITURA-ESCREVE": "T7",
  "TIPO-NAO-RESOLVIDO": "T8",
  "CURINGA-ESTATICO": "T9",
  "CURINGA-DINAMICO": "T10",
  "LOTE-INSTAVEL": "T10",
};

const categoria = (v: string) => v.slice(0, v.indexOf(":")).replace(" (na propriedade)", "");
const daCategoria = (cl: Classificacao, ...cats: string[]) => cl.violacoes.filter((v) => cats.includes(categoria(v)));

// As formas das críticas, agrupadas (o plano permite, "desde que cada uma continue com a sua asserção"):
//   grupo A = inject.mts (F1–F5, r1) + inject-prefixo.mts (F6) + inject-novas.mts (N1, N2, N9, r2) +
//             inject-tipo.mts (N3a–c, r2) + inject-motivo.mts (N10, r2);
//   grupo B = inject-get-escreve.mts (F1′) sozinho — registra a MESMA rota do F1 e o primeiro registrado responderia.
let base: Promise<Censo>;
let grupoA: Promise<Censo>;
let grupoB: Promise<Censo>;

before(() => {
  base = executarCenso({});
  grupoA = executarCenso({ injecao: path.join(DIR_FORMAS, "grupo-a.mts") });
  grupoB = executarCenso({ injecao: path.join(DIR_FORMAS, "inject-get-escreve.mts") });
  // As promessas são aguardadas pelos testes; o catch vazio só evita "rejeição não tratada" antes de chegarem lá.
  for (const p of [base, grupoA, grupoB]) p.catch(() => undefined);
});

async function classificacaoDaBase(): Promise<{ censo: Censo; cl: Classificacao }> {
  const censo = await base;
  return { censo, cl: classificar(censo.c3, censo.s3, INSTANTANEO) };
}

test("T0 — toda violação que o classificador emite cai numa categoria com T dono", async () => {
  const { cl } = await classificacaoDaBase();
  const censoA = await grupoA;
  const clA = classificar(censoA.c3, censoA.s3, INSTANTANEO);
  for (const v of [...cl.violacoes, ...clA.violacoes]) {
    assert.ok(categoria(v) in CATEGORIAS, `categoria sem T dono: ${v}`);
  }
  // Sanidade do censo: sem rota viva nenhuma, todo o resto ficaria "verde vazio" — o T2 já pegaria, e este diz por quê.
  assert.ok(cl.chavesVivas > 0, "o censo não achou camada nenhuma — o app não subiu no processo filho");
});

test("T1 — toda chave viva (rota, roteador, sub-app, middleware, par de lote) está no instantâneo", async () => {
  const { cl } = await classificacaoDaBase();
  assert.deepEqual(daCategoria(cl, "NAO-CLASSIFICADA"), []);
});

test("T2 — toda chave do instantâneo está viva (nenhuma envelhecida)", async () => {
  const { cl } = await classificacaoDaBase();
  assert.deepEqual(daCategoria(cl, "ENVELHECIDA"), []);
});

test("T3 — zero camada com caminho que não é texto (SEM-CAMINHO)", async () => {
  const { censo, cl } = await classificacaoDaBase();
  assert.deepEqual(daCategoria(cl, "SEM-CAMINHO"), []);
  assert.deepEqual(Object.keys(censo.c3.contagem).filter((k) => k.startsWith("SEM-CAMINHO ")), []);
});

test("T4 — a contagem n de cada chave é a viva (camada a mais no mesmo roteador muda a contagem)", async () => {
  const { cl } = await classificacaoDaBase();
  assert.deepEqual(daCategoria(cl, "CONTAGEM"), []);
});

test("T5 — nenhum middleware encerra requisição do campo com status abaixo de 400", async () => {
  const { cl } = await classificacaoDaBase();
  assert.deepEqual(daCategoria(cl, "MIDDLEWARE-RESPONDE-SUCESSO"), []);
});

test("T6 — a classe escrita no instantâneo é compatível com a propriedade (nunca só presença)", async () => {
  const { cl } = await classificacaoDaBase();
  assert.deepEqual(daCategoria(cl, "CLASSE-INCOMPATIVEL"), []);
});

test("T7 — nenhuma LEITURA-OS muda a impressão digital da OS", async () => {
  const { cl } = await classificacaoDaBase();
  assert.deepEqual(daCategoria(cl, "LEITURA-ESCREVE"), []);
});

test("T8 — todo ponto de despacho por `type` resolve (naoResolvidos ⊆ os 3 de hoje)", async () => {
  const { cl } = await classificacaoDaBase();
  assert.deepEqual(daCategoria(cl, "TIPO-NAO-RESOLVIDO"), []);
});

test("T9 — nenhum despacho novo por prefixo/sufixo/regex no `type` (curingas estáticos ⊆ os 3 de hoje)", async () => {
  const { cl } = await classificacaoDaBase();
  assert.deepEqual(daCategoria(cl, "CURINGA-ESTATICO"), []);
});

test("T10 — zero curinga dinâmico e zero lote instável", async () => {
  const { cl } = await classificacaoDaBase();
  assert.deepEqual(daCategoria(cl, "CURINGA-DINAMICO", "LOTE-INSTAVEL"), []);
});

test("T11 — as entradas ·07c-b do instantâneo são EXATAMENTE as 23 de hoje (catraca)", () => {
  const atuais = Object.entries(INSTANTANEO)
    .filter(([, v]) => /07c-b/.test(v.classe))
    .map(([k]) => k)
    .sort();
  assert.deepEqual(atuais, [...LISTA_07C_B].sort());
});

test("T12 — as formas das duas críticas, injetadas no app real, são achadas uma a uma", async (t) => {
  const censoA = await grupoA;
  const censoB = await grupoB;
  const A = classificar(censoA.c3, censoA.s3, INSTANTANEO);
  const B = classificar(censoB.c3, censoB.s3, INSTANTANEO);
  const tem = (cl: Classificacao, linha: string) =>
    assert.ok(cl.violacoes.includes(linha), `esperada a violação: ${linha}\nviolações: ${cl.violacoes.join("\n")}`);
  const NA = "NAO-CLASSIFICADA (na propriedade): ";
  const FORA = "NAO-CLASSIFICADA: ";

  await t.test("F1 (r1) — GET que escreve, por aceitar-por-link", () => {
    tem(A, NA + "ROTA GET /api/v1/work-orders/:workOrderId/aceitar-por-link");
  });
  await t.test("F2 (r1) — router.all, nos 5 verbos", () => {
    for (const m of ["GET", "POST", "PUT", "PATCH", "DELETE"]) tem(A, NA + `ROTA ${m} /api/v1/work-orders/:workOrderId/via-all`);
  });
  await t.test("F3 (r1) — sub-router montado com parâmetro", () => {
    tem(A, NA + "ROTA POST /api/v1/work-orders/:workOrderId/notas");
    tem(A, FORA + "ROTEADOR /api/v1/work-orders/:workOrderId/notas");
  });
  await t.test("F4 (r1) — parâmetro com outro nome (:id)", () => {
    tem(A, NA + "ROTA POST /api/v1/work-orders/:id/fechar");
  });
  await t.test("F5 (r1) — lote de sync num sub-router /mobile", () => {
    tem(A, FORA + "ROTA POST /api/v1/mobile/sync/novidade-actions");
    tem(A, FORA + "ROTEADOR /api/v1/mobile");
  });
  await t.test("F6 (r1) — lote que aceita qualquer checklist.* (despacho por prefixo em runtime)", () => {
    tem(A, FORA + "ROTA POST /api/v1/mobile/sync/prefixo-actions");
    const pares = A.violacoes.filter((v) => v.startsWith(NA + "PAR /api/v1/mobile/sync/prefixo-actions · checklist"));
    assert.ok(pares.length > 0, "nenhum par do lote por prefixo foi achado");
    assert.ok(
      A.violacoes.some((v) => v.startsWith("CURINGA-DINAMICO: /api/v1/mobile/sync/prefixo-actions · checklist.")),
      "o curinga dinâmico do lote por prefixo não foi achado",
    );
  });
  await t.test("N1 (r2) — handler montado como middleware com caminho", () => {
    tem(A, FORA + "MIDDLEWARE /api/v1/work-orders/:workOrderId/via-use · (anônima)");
    for (const papel of ["field_technician", "technician"]) {
      assert.ok(
        A.violacoes.some((v) => v.startsWith(`MIDDLEWARE-RESPONDE-SUCESSO: ${papel} POST /api/v1/work-orders/:workOrderId/via-use → 200`)),
        `o 200 do middleware ao ${papel} não foi achado`,
      );
    }
  });
  await t.test("N2 (r2) — sub-app express() montado em /api/v1", () => {
    tem(A, FORA + "SUBAPP /api/v1");
    tem(A, NA + "ROTA POST /api/v1/work-orders/:workOrderId/via-subapp");
  });
  await t.test("N9 (r2, controle) — caminho em array", () => {
    tem(A, 'SEM-CAMINHO: ROTA /api/v1 ["/work-orders/:workOrderId/via-array"]');
  });
  await t.test("N3a (r2) — tipo por template com o ponto dentro da constante", () => {
    tem(A, NA + "PAR /api/v1/mobile/sync/work-order-actions · work_order.odometro");
  });
  await t.test("N3b (r2) — tipo por concatenação", () => {
    tem(A, NA + "PAR /api/v1/mobile/sync/work-order-actions · work_order.reboque");
  });
  await t.test("N3c (r2) — tipo sem ponto", () => {
    tem(A, FORA + "PAR /api/v1/mobile/sync/work-order-actions · km_rapida");
  });
  await t.test("N10 (r2) — tipo cuja recusa de validação contém role_required", () => {
    tem(A, NA + "PAR /api/v1/mobile/sync/work-order-actions · work_order.vistoria_set");
  });
  await t.test("F1′ (plano) — GET da propriedade que escreve de verdade na OS", () => {
    tem(B, "LEITURA-ESCREVE: GET /api/v1/work-orders/:workOrderId/aceitar-por-link " + `["${censoB.c3.semente.osA}"]`);
  });
  await t.test("B3 (r2) — F1 como LEITURA, F3 e F4 como N no instantâneo (mk-malclass.cjs)", () => {
    // O mesmo acréscimo do `mk-malclass.cjs` do Apêndice A: presença sem a classe certa tem de ser vermelho.
    const malclass: Instantaneo = {
      ...INSTANTANEO,
      "ROTA GET /api/v1/work-orders/:workOrderId/aceitar-por-link": { classe: "LEITURA", n: 1 },
      "ROTA POST /api/v1/work-orders/:id/fechar": { classe: "N", n: 1 },
      "ROTA POST /api/v1/work-orders/:workOrderId/notas": { classe: "N", n: 1 },
    };
    const M = classificar(censoA.c3, censoA.s3, malclass);
    tem(M, "CLASSE-INCOMPATIVEL: ROTA GET /api/v1/work-orders/:workOrderId/aceitar-por-link = LEITURA (esperado LEITURA-OS)");
    tem(M, "CLASSE-INCOMPATIVEL: ROTA POST /api/v1/work-orders/:id/fechar = N (na propriedade)");
    tem(M, "CLASSE-INCOMPATIVEL: ROTA POST /api/v1/work-orders/:workOrderId/notas = N (na propriedade)");
  });
  await t.test("N3d e as formas de tipo (prova-tipos-v3.mts) — resolvido, não resolvido ou curinga; nunca silêncio", () => {
    const NL = String.fromCharCode(10);
    const casos: Array<[string, string, { tipos?: string[]; naoResolvidos?: number; curingas?: number }]> = [
      ["N3a", 'const WO = "work_order.";' + NL + "export function f(action: any) { if (action.type === `${WO}odometro`) return 1; }", { tipos: ["work_order.odometro"] }],
      ["N3b", 'const WO = "work_order";' + NL + 'export function f(action: any) { if (action.type === WO + ".reboque") return 1; }', { tipos: ["work_order.reboque"] }],
      ["N3c", 'export function f(action: any) { if (action.type === "km_rapida") return 1; }', { tipos: ["km_rapida"] }],
      ["N3d", 'import { WO_MILEAGE_V2 } from "./inexistente.js";' + NL + "export function f(action: any) { if (action.type === WO_MILEAGE_V2) return 1; }", { tipos: [], naoResolvidos: 1 }],
      ["N10", 'export function f(action: any) { if (action.type === "work_order.vistoria_set") return 1; }', { tipos: ["work_order.vistoria_set"] }],
      ["aspas simples", "export function f(action: any) { if (action.type === 'checklist.x') return 1; }", { tipos: ["checklist.x"] }],
      ["maiúscula, hífen, dígito", 'export function f(action: any) { switch (action.type) { case "Checklist.PhotoAdd": case "checklist-run.reopen": case "checklist.photo_v2": return 1; } }', { tipos: ["Checklist.PhotoAdd", "checklist-run.reopen", "checklist.photo_v2"] }],
      ["tabela", 'const T = { "work_order.tabela": 1 } as const;' + NL + "export function f(action: any) { return T[action.type as keyof typeof T]; }", { tipos: ["work_order.tabela"] }],
      ["desestruturação", 'export function f({ type }: any) { if (type === "work_order.desestruturado") return 1; }', { tipos: ["work_order.desestruturado"] }],
      ["parâmetro repassado", 'function g(tipo: string) { return tipo === "work_order.repassado"; }' + NL + "export function f(action: any) { return g(action.type); }", { tipos: ["work_order.repassado"] }],
      ["prefixo", 'export function f(action: any) { return action.type.startsWith("checklist."); }', { tipos: [], curingas: 1 }],
      ["comparação com variável", "export function f(action: any, esperado: string) { return action.type === esperado; }", { tipos: [], naoResolvidos: 1 }],
    ];
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "o6r07c-tipos-"));
    try {
      for (const [nome, fonte, esperado] of casos) {
        const arquivo = path.join(dir, "caso.ts").split(String.fromCharCode(92)).join("/");
        fs.writeFileSync(arquivo, fonte);
        const r = analisarTipos([arquivo]);
        assert.deepEqual([...r.tipos.keys()].sort(), [...(esperado.tipos ?? [])].sort(), `${nome}: tipos`);
        assert.equal(r.naoResolvidos.length, esperado.naoResolvidos ?? 0, `${nome}: naoResolvidos`);
        assert.equal(r.curingas.length, esperado.curingas ?? 0, `${nome}: curingas`);
      }
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

test("T13 — a rota polimórfica /attachments resolve exatamente as 4 entidades de hoje", async () => {
  const { createDefaultAttachmentEntityResolver } = await import(
    "../src/modules/attachments/attachment-entity-resolver.js"
  );
  assert.deepEqual([...createDefaultAttachmentEntityResolver().entityTypes()].sort(), [...ENTIDADES_ATTACHMENTS].sort());
});

test("tempo do censo (publicado, R-a1) — os três censos terminaram", async (t) => {
  const [b, a, bb] = await Promise.all([base, grupoA, grupoB]);
  // Não é limite: é o número que o plano manda medir e publicar (o arquivo pesa no `npm test`).
  t.diagnostic(`censo 07c — base ${b.ms} ms · grupo A ${a.ms} ms · grupo B ${bb.ms} ms`);
  assert.ok(b.ms > 0 && a.ms > 0 && bb.ms > 0);
});
