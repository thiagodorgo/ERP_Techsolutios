import assert from "node:assert/strict";
import path from "node:path";
import test, { before } from "node:test";

import {
  ARQUIVO_INSTANTANEO,
  CLASSES_DO_BLOCO,
  classificarLeitura,
  DIR_FORMAS_LEITURA,
  executarCensoDeLeitura,
  lerInstantaneoLeitura,
  serializarInstantaneo,
  type ClassificacaoLeitura,
  type InstantaneoLeitura,
  type ResultadoOraculo,
} from "./helpers/wo-leitura-census.js";
import fs from "node:fs";

// B-WO-LEITURA-TECNICO (item 71) — O GUARD DE LEITURA (plano §5.3; Emenda 1 §2.2; Emenda 2 §1).
//
// A propriedade: nenhuma LEITURA do app (toda GET/HEAD montada e toda camada `MIDDLEWARE` com caminho próprio) entrega ao
// técnico de campo que NÃO é o atribuído conteúdo de uma OS alheia; a OS alheia responde o MESMO que um id inexistente;
// a lista filtra no servidor. Cada T é uma propriedade, e toda categoria de violação tem um T dono (T-L0).
//
// O universo vem do censo do 07c (`executarCenso`, reusado SEM mudar uma linha); o oráculo e o classificador são deste
// bloco (`tests/helpers/wo-leitura-census.ts`). O instantâneo (`tests/fixtures/wo-leitura-classificacao.json`) é GERADO:
//   node --import tsx tests/helpers/wo-leitura-census.ts gravar tests/fixtures/wo-leitura-classificacao.json
// e o diff dele é revisado chave a chave.
//
// As 4 formas injetadas (`tests/fixtures/wo-leitura-formas/`) rodam juntas (`grupo.mts`, o idioma do `grupo-a.mts` do
// 07c), cada uma com a sua asserção (T-FORMAS).
//
// Tempo: dois censos (base e formas), cada um com o oráculo, em processos filhos, em paralelo.

const INSTANTANEO: InstantaneoLeitura = lerInstantaneoLeitura();

const CATEGORIAS: Record<string, string> = {
  "NAO-CLASSIFICADA": "T-L1",
  ENVELHECIDA: "T-L1",
  "CLASSE-FORA-DA-LISTA": "T-L1",
  "MARCADOR-INVALIDO": "T-L1",
  "SEM-OBSERVACAO": "T-L1",
  CANARIO: "T-L2",
  "ORACULO-DE-EXISTENCIA": "T-L3",
  "LISTA-COM-ALHEIA": "T-L4",
  "FILTRO-DIFERENTE": "T-L4",
  "CLASSE-INCOMPATIVEL": "T-L5",
  "ORACULO-CEGO": "T-L6",
  "SEM-CHAMADA-NATURAL": "T-L6",
  "NAO-ALCANCADA-SEM-PROVA": "T-L7",
  "MIDDLEWARE-RESPONDE-LEITURA": "T-L8",
};

const categoria = (v: string) => v.slice(0, v.indexOf(":"));
const daCategoria = (cl: ClassificacaoLeitura, ...cats: string[]) => cl.violacoes.filter((v) => cats.includes(categoria(v)));

type Rodada = { c3: any; oraculo: ResultadoOraculo; ms: number };
let base: Promise<Rodada>;
let formas: Promise<Rodada>;

before(() => {
  base = executarCensoDeLeitura({});
  formas = executarCensoDeLeitura({ injecao: path.join(DIR_FORMAS_LEITURA, "grupo.mts") });
  for (const p of [base, formas]) p.catch(() => undefined);
});

async function daBase(): Promise<{ r: Rodada; cl: ClassificacaoLeitura }> {
  const r = await base;
  return { r, cl: classificarLeitura(r.c3, r.oraculo, INSTANTANEO) };
}

test("T-L0 — toda violação que o classificador emite cai numa categoria com T dono", async () => {
  const { cl } = await daBase();
  const f = await formas;
  const clF = classificarLeitura(f.c3, f.oraculo, INSTANTANEO);
  for (const v of [...cl.violacoes, ...clF.violacoes]) assert.ok(categoria(v) in CATEGORIAS, `categoria sem T dono: ${v}`);
  assert.ok(cl.chaves > 0, "o universo está vazio — o app não subiu no processo filho");
});

test("T-L1 — toda chave do universo está no instantâneo, com classe da lista fechada e marcador válido; nenhuma chave morta", async () => {
  const { cl } = await daBase();
  assert.deepEqual(daCategoria(cl, "NAO-CLASSIFICADA", "ENVELHECIDA", "CLASSE-FORA-DA-LISTA", "MARCADOR-INVALIDO", "SEM-OBSERVACAO"), []);
});

test("T-L2 — nenhum 2xx de nenhuma leitura, para B e C, contém canário de conteúdo da OS-X (nem os bytes da semente)", async () => {
  const { cl } = await daBase();
  assert.deepEqual(daCategoria(cl, "CANARIO"), []);
});

test("T-L3 — em OS·LEITURA-ESCOPO, a OS-X responde o mesmo status:code:reason do UUID aleatório, para B e C", async () => {
  const { cl } = await daBase();
  assert.deepEqual(daCategoria(cl, "ORACULO-DE-EXISTENCIA"), []);
});

test("T-L4 — em LISTA·FILTRO-SERVIDOR, a OS-X não aparece sem filtro e ?workOrderId=<X> ≡ <aleatório> nas duas formas", async () => {
  const { cl } = await daBase();
  assert.deepEqual(daCategoria(cl, "LISTA-COM-ALHEIA", "FILTRO-DIFERENTE"), []);
});

test("T-L5 — a classe bate com a propriedade (caminho, canário, camada)", async () => {
  const { cl } = await daBase();
  assert.deepEqual(daCategoria(cl, "CLASSE-INCOMPATIVEL"), []);
});

test("T-L6 — controle positivo: com A (atribuído), toda chave das 3 classes cumpre o seu marcador", async () => {
  const { cl } = await daBase();
  assert.deepEqual(daCategoria(cl, "ORACULO-CEGO", "SEM-CHAMADA-NATURAL"), []);
  for (const classe of CLASSES_DO_BLOCO) {
    assert.ok(Object.values(INSTANTANEO).some((e) => e.classe === classe), `o instantâneo não tem entrada ${classe}: o oráculo estaria cego`);
  }
});

test("T-L7 — NAO-ALCANCADA só com prova: 401/403 nos dois papéis, com e sem permissão, com id aleatório e com os ids da semente", async () => {
  const { cl } = await daBase();
  assert.deepEqual(daCategoria(cl, "NAO-ALCANCADA-SEM-PROVA"), []);
});

test("T-L8 — nenhuma camada com caminho próprio (sem rota GET de mesmo caminho) responde leitura 2xx", async (t) => {
  const { r, cl } = await daBase();
  assert.deepEqual(daCategoria(cl, "MIDDLEWARE-RESPONDE-LEITURA"), []);
  // Publicado (Emenda 2 §1.2): a resposta medida de cada camada de hoje, para B e C.
  for (const o of r.oraculo.obs.filter((x) => x.tipo === "MIDDLEWARE")) {
    t.diagnostic(`${o.chave} → ${[...new Set(o.camadaStatus.map((x) => `${x.split(" ")[0]} ${x.split(" ").pop()}`))].join(", ")}`);
  }
});

test("T-FORMAS — as 4 formas injetadas são achadas, cada uma pela sua asserção", async (t) => {
  const f = await formas;
  const cl = classificarLeitura(f.c3, f.oraculo, INSTANTANEO);
  const tem = (prefixo: string) =>
    assert.ok(cl.violacoes.some((v) => v.startsWith(prefixo)), `esperada a violação que começa com: ${prefixo}\nviolações: ${cl.violacoes.slice(0, 30).join("\n")}`);
  await t.test("inject-get-nova — T-L1 NAO-CLASSIFICADA e T-L2 canário", () => {
    tem("NAO-CLASSIFICADA: GET /api/v1/work-orders/:workOrderId/leitura-nova");
    tem("CANARIO: — ft GET /api/v1/work-orders/:workOrderId/leitura-nova");
  });
  await t.test("inject-referencia-vaza — T-L1 e T-L2 (sem `work-orders` no caminho)", () => {
    tem("NAO-CLASSIFICADA: GET /api/v1/tags-eco/:workOrderId");
    tem("CANARIO: — ft GET /api/v1/tags-eco/:workOrderId");
  });
  await t.test("inject-query-vaza — T-L1 e T-L2 pela variante entityType/entityId", () => {
    tem("NAO-CLASSIFICADA: GET /api/v1/eco-lista");
    tem("CANARIO: — ft GET /api/v1/eco-lista /api/v1/eco-lista?entityType=work_order&entityId=");
  });
  await t.test("inject-via-use — T-L1, T-L2 e T-L8 (a camada com caminho fora de c3.rotas)", () => {
    const chave = "MIDDLEWARE /api/v1/via-use/:workOrderId · (anônima)";
    assert.equal(f.c3.contagem[chave], 1, "a camada da 4ª forma não está em c3.contagem");
    assert.ok(!f.c3.rotas.some((x: any) => x.path === "/api/v1/via-use/:workOrderId"), "a 4ª forma virou rota: não prova a camada");
    tem(`NAO-CLASSIFICADA: ${chave}`);
    tem(`CANARIO: — ft ${chave}`);
    tem(`MIDDLEWARE-RESPONDE-LEITURA: ${chave}`);
  });
});

// O formato fixado (Emenda 2 §3.3). A igualdade "gerado == instantâneo" NÃO é um teste aqui: as mutações MR12, MR13 e
// MR13b editam o instantâneo e declaram "só T-L1", "só T-L5" e "só T-L7" (Emenda 2 §3.2); um teste de igualdade ficaria
// vermelho a mais. Ela é um passo da bateria (`gravar` + comparação byte a byte), registrado no diário do dev.
test("T-FORMATO — o instantâneo está no formato fixado (chaves ordenadas, 2 espaços, LF, valor {classe, marcador?, nota?, pendencia?})", () => {
  assert.equal(fs.readFileSync(ARQUIVO_INSTANTANEO, "utf8"), serializarInstantaneo(INSTANTANEO));
});

test("tempo do censo de leitura (publicado) — os dois censos terminaram", async (t) => {
  const [b, f] = await Promise.all([base, formas]);
  t.diagnostic(`censo de leitura — base ${b.ms} ms · formas ${f.ms} ms · universo ${classificarLeitura(b.c3, b.oraculo, INSTANTANEO).chaves} chaves`);
  assert.ok(b.ms > 0 && f.ms > 0);
});
