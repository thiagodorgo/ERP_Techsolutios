import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

type JsonObject = Record<string, unknown>;

const KPIS_DIR = fileURLToPath(new URL("../Kpis/", import.meta.url));
const LATEST_REAL = JSON.parse(
  readFileSync(`${KPIS_DIR}kpis-latest.json`, "utf8"),
) as unknown;
const HISTORY_REAL = JSON.parse(
  readFileSync(`${KPIS_DIR}kpis-history.json`, "utf8"),
) as unknown;
const DATA = /^\d{4}-\d{2}-\d{2}$/;
const MERGE = /^[0-9a-f]{7,40}$/;
const ESTADOS = new Set(["concluido", "parcial", "a_fazer"]);

const objeto = (valor: unknown): valor is JsonObject =>
  typeof valor === "object" && valor !== null && !Array.isArray(valor);

const copia = <T>(valor: T): T => structuredClone(valor);

const numeroPr = (valor: unknown): number | null => {
  if (typeof valor !== "number" && typeof valor !== "string") return null;
  if (typeof valor === "string" && valor.trim() === "") return null;
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : null;
};

const casa = (version: string, id: string): boolean =>
  version === id ||
  (version.startsWith(id) && !/^\d$/.test(version.charAt(id.length)));

export function verificarFrescor(latest: unknown, history: unknown): string[] {
  if (!objeto(latest) || !objeto(latest.roadmap)) return ["E0:roadmap.blocos"];

  const roadmap = latest.roadmap;
  if (!Array.isArray(roadmap.blocos) || roadmap.blocos.length === 0)
    return ["E0:roadmap.blocos"];
  if (typeof roadmap.as_of !== "string" || !DATA.test(roadmap.as_of))
    return ["E0:roadmap.as_of"];
  if (!objeto(latest.recent) || !Array.isArray(latest.recent.itens))
    return ["E0:recent.itens"];

  const blocos = roadmap.blocos;
  for (const bloco of blocos) {
    if (!objeto(bloco)) return ["E0:estado:desconhecido"];
    if (typeof bloco.id !== "string") return ["E0:bloco-sem-id"];
    const id = bloco.id;
    if (typeof bloco.estado !== "string" || !ESTADOS.has(bloco.estado))
      return [`E0:estado:${id}`];
  }

  const merges = (Array.isArray(history) ? history : []).filter(
    (entrada): entrada is JsonObject =>
      objeto(entrada) &&
      typeof entrada.merge_commit === "string" &&
      MERGE.test(entrada.merge_commit) &&
      typeof entrada.snapshot_date === "string" &&
      DATA.test(entrada.snapshot_date),
  );
  if (merges.length === 0) return ["E0:history-sem-merge"];

  const dia = merges.reduce(
    (maior, entrada) =>
      String(entrada.snapshot_date) > maior
        ? String(entrada.snapshot_date)
        : maior,
    "0000-00-00",
  );
  for (const entrada of merges) {
    if (entrada.snapshot_date !== dia || numeroPr(entrada.pr) !== null)
      continue;
    const version =
      typeof entrada.version === "string" ? entrada.version : "desconhecido";
    return [`E0:history-pr:${version}`];
  }
  const codigos: string[] = [];

  for (const bloco of blocos) {
    const id = String((bloco as JsonObject).id);
    if (
      (bloco as JsonObject).estado === "a_fazer" &&
      merges.some(
        (entrada) =>
          typeof entrada.version === "string" && casa(entrada.version, id),
      )
    ) {
      codigos.push(`P1:${id}`);
    }
  }

  if (roadmap.as_of < dia) codigos.push("P2");

  const prsRecentes = new Set(
    latest.recent.itens
      .filter(objeto)
      .flatMap((item) => {
        const pr = numeroPr(item.pr);
        return pr === null ? [] : [pr];
      }),
  );
  const prsAusentes = new Set<number>();
  for (const entrada of merges) {
    if (entrada.snapshot_date !== dia) continue;
    const pr = numeroPr(entrada.pr)!;
    if (!prsRecentes.has(pr)) prsAusentes.add(pr);
  }
  for (const pr of prsAusentes) codigos.push(`P3:${pr}`);

  return codigos;
}

const FIX_HISTORY: JsonObject[] = [
  {
    snapshot_date: "2026-08-19",
    version: "B-O6R-01-CICLO3-CORRECAO",
    pr: 357,
    merge_commit: "a1b2c3d",
  },
  {
    snapshot_date: "2026-08-20",
    version: "B-O6R-05",
    pr: 353,
    merge_commit: "b2c3d4e",
  },
  {
    snapshot_date: "2026-08-22",
    version: "B-O6R-ARNES",
    pr: 360,
    merge_commit: "c3d4e5f",
  },
  {
    snapshot_date: "2026-09-01",
    version: "B-O6R-07a",
    pr: 369,
    merge_commit: "d4e5f60",
  },
  {
    snapshot_date: "2026-09-02",
    version: "B-O6R-08",
    pr: 370,
    merge_commit: null,
  },
  {
    snapshot_date: "2026-10-30",
    version: "PR-475",
    pr: 475,
    merge_commit: "264c376",
  },
  {
    snapshot_date: "2026-10-31",
    version: "PR-478",
    pr: 478,
    merge_commit: "e78e396",
  },
  {
    snapshot_date: "2026-10-31",
    version: "PR-479",
    pr: 479,
    merge_commit: "0fda595",
  },
];

const FIX_LATEST: JsonObject = {
  roadmap: {
    as_of: "2026-10-31",
    blocos: [
      { id: "B-O6R-01", estado: "concluido" },
      { id: "B-O6R-05", estado: "concluido" },
      { id: "B-O6R-07", estado: "parcial" },
      { id: "B-O6R-08", estado: "a_fazer" },
    ],
  },
  recent: { itens: [{ pr: 479 }, { pr: 478 }, { pr: null }, { pr: 475 }] },
};

const codigos = (latest: unknown, history: unknown): string[] =>
  [...verificarFrescor(latest, history)].sort();
const esperado = (latest: unknown, history: unknown, valor: string[]): void => {
  assert.deepEqual(codigos(latest, history), [...valor].sort());
};
const bloco = (latest: JsonObject, id: string): JsonObject => {
  const roadmap = latest.roadmap as JsonObject;
  return (roadmap.blocos as JsonObject[]).find((item) => item.id === id)!;
};

test("frescor: C0 — fixture verde", () =>
  esperado(FIX_LATEST, FIX_HISTORY, []));

test("frescor: M1 — nome exato mergeado não fica a_fazer", () => {
  const latest = copia(FIX_LATEST);
  bloco(latest, "B-O6R-05").estado = "a_fazer";
  esperado(latest, FIX_HISTORY, ["P1:B-O6R-05"]);
});

test("frescor: M2 — sub-bloco mergeado não fica a_fazer", () => {
  const latest = copia(FIX_LATEST);
  bloco(latest, "B-O6R-07").estado = "a_fazer";
  esperado(latest, FIX_HISTORY, ["P1:B-O6R-07"]);
});

test("frescor: M3 — sufixo de ciclo mergeado não fica a_fazer", () => {
  const latest = copia(FIX_LATEST);
  bloco(latest, "B-O6R-01").estado = "a_fazer";
  esperado(latest, FIX_HISTORY, ["P1:B-O6R-01"]);
});

test("frescor: M4 — roadmap.as_of um dia antes de D", () => {
  const latest = copia(FIX_LATEST);
  (latest.roadmap as JsonObject).as_of = "2026-10-30";
  esperado(latest, FIX_HISTORY, ["P2"]);
});

test("frescor: M5 — entrega nova sem recent acende P2 e P3", () => {
  const history = copia(FIX_HISTORY);
  history.push({
    snapshot_date: "2026-11-01",
    version: "PR-999",
    pr: 999,
    merge_commit: "9f9f9f9",
  });
  esperado(FIX_LATEST, history, ["P2", "P3:999"]);
});

test("frescor: M6 — irmão ausente no último dia acende P3", () => {
  const latest = copia(FIX_LATEST);
  (latest.recent as JsonObject).itens = (
    (latest.recent as JsonObject).itens as JsonObject[]
  ).filter((item) => item.pr !== 478);
  esperado(latest, FIX_HISTORY, ["P3:478"]);
});

test("frescor: M7 — roadmap.as_of ausente falha fechado", () => {
  const latest = copia(FIX_LATEST);
  delete (latest.roadmap as JsonObject).as_of;
  esperado(latest, FIX_HISTORY, ["E0:roadmap.as_of"]);
});

test("frescor: M8 — estado fora da lista falha fechado", () => {
  const latest = copia(FIX_LATEST);
  bloco(latest, "B-O6R-08").estado = "a fazer";
  esperado(latest, FIX_HISTORY, ["E0:estado:B-O6R-08"]);
});

test("frescor: M9 — history sem merge falha fechado", () => {
  const history = copia(FIX_HISTORY).map((entrada) => ({
    ...entrada,
    merge_commit: null,
  }));
  esperado(FIX_LATEST, history, ["E0:history-sem-merge"]);
});

test("frescor: M10 — D não depende do último elemento do array", () => {
  const history = copia(FIX_HISTORY);
  history.unshift({
    snapshot_date: "2026-11-01",
    version: "PR-999",
    pr: 999,
    merge_commit: "9f9f9f9",
  });
  esperado(FIX_LATEST, history, ["P2", "P3:999"]);
});

test("frescor: M11 — roadmap.blocos não-array falha fechado", () => {
  const latest = copia(FIX_LATEST);
  (latest.roadmap as JsonObject).blocos = {};
  esperado(latest, FIX_HISTORY, ["E0:roadmap.blocos"]);
});

test("frescor: M12 — roadmap.blocos vazio falha fechado", () => {
  const latest = copia(FIX_LATEST);
  (latest.roadmap as JsonObject).blocos = [];
  esperado(latest, FIX_HISTORY, ["E0:roadmap.blocos"]);
});

test("frescor: M13 — recent.itens não-array falha fechado", () => {
  const latest = copia(FIX_LATEST);
  (latest.recent as JsonObject).itens = null;
  esperado(latest, FIX_HISTORY, ["E0:recent.itens"]);
});

test("frescor: M14 — roadmap.as_of fora do formato falha fechado", () => {
  const latest = copia(FIX_LATEST);
  (latest.roadmap as JsonObject).as_of = "31/10/2026";
  esperado(latest, FIX_HISTORY, ["E0:roadmap.as_of"]);
  (latest.roadmap as JsonObject).as_of = "x2026-10-31y";
  esperado(latest, FIX_HISTORY, ["E0:roadmap.as_of"]);
});

test("frescor: M15 — merge_commit não hexadecimal não conta", () => {
  const history = copia(FIX_HISTORY);
  history.push({
    snapshot_date: "2026-11-01",
    version: "PR-999",
    pr: 999,
    merge_commit: "nao-hex",
  });
  esperado(FIX_LATEST, history, []);
  history.at(-1)!.merge_commit = "x9f9f9f9y";
  esperado(FIX_LATEST, history, []);
});

test("frescor: M16 — merge no dia D sem PR numérico falha fechado", () => {
  const latest = copia(FIX_LATEST);
  (latest.roadmap as JsonObject).as_of = "2026-11-01";
  const history = copia(FIX_HISTORY);
  history.push({
    snapshot_date: "2026-11-01",
    version: "PR-999",
    merge_commit: "9f9f9f9",
  });
  esperado(latest, history, ["E0:history-pr:PR-999"]);
});

test("frescor: M17 — recent com PR nulo não satisfaz PR zero", () => {
  const latest = copia(FIX_LATEST);
  (latest.roadmap as JsonObject).as_of = "2026-11-01";
  (latest.recent as JsonObject).itens = [{ pr: null }];
  const history = copia(FIX_HISTORY);
  history.push({
    snapshot_date: "2026-11-01",
    version: "PR-0",
    pr: 0,
    merge_commit: "9f9f9f9",
  });
  esperado(latest, history, ["P3:0"]);
});

test("frescor: M18 — bloco sem ID string falha fechado", () => {
  const latest = copia(FIX_LATEST);
  (latest.roadmap as JsonObject).blocos = [
    ...((latest.roadmap as JsonObject).blocos as JsonObject[]),
    { estado: "a_fazer" },
  ];
  const history = copia(FIX_HISTORY);
  history.push({
    snapshot_date: "2026-10-01",
    version: "B-X1",
    pr: 401,
    merge_commit: "4014014",
  });
  esperado(latest, history, ["E0:bloco-sem-id"]);
});

test("frescor: N1 — fronteira numérica não casa bloco diferente", () => {
  const history = copia(FIX_HISTORY);
  history.push({
    snapshot_date: "2026-10-01",
    version: "B-O6R-081",
    pr: 401,
    merge_commit: "4014014",
  });
  esperado(FIX_LATEST, history, []);
});

test("frescor: N2 — merge_commit null não conta", () => {
  const history = copia(FIX_HISTORY);
  history.push({
    snapshot_date: "2026-10-02",
    version: "B-O6R-08a",
    pr: 402,
    merge_commit: null,
  });
  esperado(FIX_LATEST, history, []);
});

test("frescor: N3 — P3 exige apenas o último dia", () => {
  const latest = copia(FIX_LATEST);
  (latest.recent as JsonObject).itens = (
    (latest.recent as JsonObject).itens as JsonObject[]
  ).filter((item) => item.pr !== 475);
  esperado(latest, FIX_HISTORY, []);
});

test("frescor: R0 — Kpis reais satisfazem P1, P2 e P3", () => {
  const resultado = codigos(LATEST_REAL, HISTORY_REAL);
  assert.deepEqual(
    resultado,
    [],
    `Kpis reais sem frescor: ${JSON.stringify(resultado)}. Corrija bloco a_fazer mergeado para parcial/concluido, suba roadmap.as_of para D e inclua cada PR do dia D em recent.itens.`,
  );
});

test("frescor: R1 — candidatos reais não podem voltar a a_fazer", () => {
  assert.ok(
    objeto(LATEST_REAL) &&
      objeto(LATEST_REAL.roadmap) &&
      Array.isArray(LATEST_REAL.roadmap.blocos),
  );
  const candidatos = LATEST_REAL.roadmap.blocos
    .filter(
      (item): item is JsonObject =>
        objeto(item) &&
        item.estado !== "a_fazer" &&
        typeof item.id === "string",
    )
    .filter((item) => {
      const mutado = copia(LATEST_REAL);
      bloco(mutado, String(item.id)).estado = "a_fazer";
      return verificarFrescor(mutado, HISTORY_REAL).includes(
        `P1:${String(item.id)}`,
      );
    });
  assert.ok(
    candidatos.length >= 1,
    "o dado real precisa ter ao menos um bloco mergeado candidato à prova R1",
  );
  for (const candidato of candidatos) {
    const mutado = copia(LATEST_REAL);
    bloco(mutado, String(candidato.id)).estado = "a_fazer";
    assert.ok(
      verificarFrescor(mutado, HISTORY_REAL).includes(
        `P1:${String(candidato.id)}`,
      ),
    );
  }
});

test("frescor: R2 — merge real no dia D+1 exige P2 e P3", () => {
  const history = Array.isArray(HISTORY_REAL)
    ? (copia(HISTORY_REAL) as JsonObject[])
    : [];
  const merges = history.filter(
    (entrada) =>
      typeof entrada.merge_commit === "string" &&
      MERGE.test(entrada.merge_commit) &&
      typeof entrada.snapshot_date === "string" &&
      DATA.test(entrada.snapshot_date),
  );
  const dia = merges.reduce(
    (maior, entrada) =>
      String(entrada.snapshot_date) > maior
        ? String(entrada.snapshot_date)
        : maior,
    "0000-00-00",
  );
  const proximoDia = new Date(`${dia}T00:00:00Z`);
  proximoDia.setUTCDate(proximoDia.getUTCDate() + 1);
  const prsConhecidos = history.map((entrada) => Number(entrada.pr));
  if (
    objeto(LATEST_REAL) &&
    objeto(LATEST_REAL.recent) &&
    Array.isArray(LATEST_REAL.recent.itens)
  ) {
    prsConhecidos.push(
      ...LATEST_REAL.recent.itens.filter(objeto).map((item) => Number(item.pr)),
    );
  }
  const pr = Math.max(...prsConhecidos.filter(Number.isFinite)) + 1;
  history.push({
    snapshot_date: proximoDia.toISOString().slice(0, 10),
    version: `PR-${pr}`,
    pr,
    merge_commit: "9f9f9f9",
  });
  const resultado = verificarFrescor(LATEST_REAL, history);
  assert.ok(resultado.includes("P2"));
  assert.ok(
    resultado.includes(`P3:${pr}`),
    JSON.stringify({ resultado, pr, dia }),
  );
});
