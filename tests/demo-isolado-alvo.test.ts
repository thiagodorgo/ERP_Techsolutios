// B-SAN3-10b-F4-SEED-ISOLADO (item 44) — as travas puras da demonstracao isolada: C1 a C5, C2b, C4,
// C2b-e1, C2b-e11, C4-e1 e C5-e1 do plano. Nada aqui abre conexao: `scripts/demo-isolado/alvo.mjs`
// decide so com o ambiente, a URL, o argv e o disco do diretorio de saida.
//
// Cada teste nomeia a mutacao literal que ele mata (plano v2 §6.2, Emenda 1 §E9.2, Emenda 1.1 §9.2).
// Mutacao que nao deixa o teste citado vermelho e PARADA e emenda; nunca se troca mutacao nem teste.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import * as A from "../scripts/demo-isolado/alvo.mjs";

const P = { DEMO_ISOLADO_PROJETO: "b10b-seed" };
const OK_DB = "postgresql://postgres@postgres:5432/erp_techsolutions";
const OK_REDIS = "redis://redis:6379";

type Env = Record<string, string | undefined>;
type Parse = (url: string) => { host?: string | null; port?: string | null; database?: string | null };

const motor = (base: string | undefined, extra: Env = {}) => A.avaliarAlvo({ ...P, ...extra }, base);
const banco = (db: string | undefined, redis: string | undefined = OK_REDIS, extra: Env = {}, parse?: Parse) =>
  parse
    ? A.avaliarAlvoBanco({ ...P, DATABASE_URL: db, REDIS_URL: redis, ...extra }, parse)
    : A.avaliarAlvoBanco({ ...P, DATABASE_URL: db, REDIS_URL: redis, ...extra });

function dirTemporario() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "demo-isolado-alvo-"));
}

test("C1 producao recusa, sem escape, no motor e na fundacao (mata a M1)", () => {
  for (const e of [{}, { ALLOW_PROD_SEED: "1" }, { ALLOW_PROD_BOOTSTRAP: "1" }, { ALLOW_PROD_SEED: "1", ALLOW_PROD_BOOTSTRAP: "1" }]) {
    const rm = motor("http://api:3000", { NODE_ENV: "production", ...e });
    assert.equal(rm.ok, false);
    assert.equal(rm.codigo, 2);
    assert.equal(rm.motivo, "AMBIENTE_PRODUCAO");
    const rb = banco(OK_DB, OK_REDIS, { NODE_ENV: "production", ...e });
    assert.equal(rb.codigo, 2);
    assert.equal(rb.motivo, "AMBIENTE_PRODUCAO");
  }
  assert.equal(motor("http://api:3000", { NODE_ENV: "development" }).ok, true);
  assert.equal(banco(OK_DB, OK_REDIS, { NODE_ENV: "test" }).ok, true);
});

test("C2 alvo HTTP do motor: a lista do v1 recusa e as bordas da faixa passam (mata a M3)", () => {
  for (const u of [
    "https://api.producao.exemplo.invalid",
    "http://localhost:3101",
    "http://192.168.0.10:3101",
    "http://100.64.0.1:3101",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3100",
    "http://127.0.0.1:3200",
    "http://api:3001",
    "http://127.0.0.1",
    "nao-e-url",
    "",
    undefined,
  ]) {
    const r = motor(u);
    assert.equal(r.codigo, 2, String(u));
    assert.equal(r.motivo, "ALVO_RECUSADO", String(u));
  }
  for (const u of ["http://api:3000", "http://127.0.0.1:3101", "http://127.0.0.1:3111", "http://127.0.0.1:3199"]) {
    assert.equal(motor(u).ok, true, u);
  }
});

test("C2-e1 https em host permitido recusa (mata a M2)", () => {
  for (const u of ["https://api:3000", "https://127.0.0.1:3101"]) {
    assert.equal(motor(u).motivo, "ALVO_RECUSADO", u);
  }
});

test("C2b banco e redis: a lista do v2", () => {
  for (const u of [
    "postgresql://u@localhost:5432/x",
    "postgresql://u@127.0.0.1:5432/x",
    "postgresql://u@10.0.0.5:5432/x",
    "postgresql://u@db.exemplo.invalid:5432/x",
    "postgresql://u@127.0.0.1:55499/x",
    "postgresql://u@127.0.0.1:55600/x",
    "",
    undefined,
  ]) {
    const r = banco(u);
    assert.equal(r.codigo, 2, String(u));
    assert.equal(r.motivo, "ALVO_RECUSADO", String(u));
  }
  for (const u of [OK_DB, "postgres://postgres@postgres:5432/erp_techsolutions", "postgresql://postgres@127.0.0.1:55593/x", "postgresql://u@127.0.0.1:55500/erp_seed_a"]) {
    assert.equal(banco(u).ok, true, u);
  }
  for (const r of ["", "redis://localhost:6379", "nao-e-url"]) {
    const v = banco(OK_DB, r);
    assert.equal(v.codigo, 2, r);
    assert.equal(v.motivo, "REDIS_RECUSADO", r);
  }
  // REDIS_URL ausente (sem padrao): o env nao tem a chave.
  const semRedis = A.avaliarAlvoBanco({ ...P, DATABASE_URL: OK_DB });
  assert.equal(semRedis.codigo, 2);
  assert.equal(semRedis.motivo, "REDIS_RECUSADO");
  for (const r of ["redis://redis:6379", "redis://127.0.0.1:6593"]) {
    assert.equal(banco(OK_DB, r).ok, true, r);
  }
});

test("C2b-e1 query string ou fragmento recusa (mata a M11)", () => {
  for (const u of [
    OK_DB + "?host=127.0.0.1&port=55564",
    "postgresql://postgres@127.0.0.1:55564/x?host=db.producao.exemplo.invalid&port=5432",
    OK_DB + "?host=host.docker.internal",
    OK_DB + "?port=5433",
    OK_DB + "?sslmode=disable",
    // A pilha corta o sufixo `?schema=public` na invocacao; a trava nao aceita query nenhuma (Emenda 1.1 §1).
    OK_DB + "?schema=public",
    OK_DB + "?",
    OK_DB + "#host=127.0.0.1",
    OK_DB + "#",
  ]) {
    const r = banco(u);
    assert.equal(r.codigo, 2, u);
    assert.equal(r.motivo, "ALVO_RECUSADO", u);
  }
});

test("C2b-e1 o parse do driver decide (mata a M12)", () => {
  const outroHost: Parse = () => ({ host: "10.0.0.5", port: "5432", database: "erp_techsolutions" });
  const semPorta: Parse = () => ({ host: "postgres", port: "", database: "erp_techsolutions" });
  assert.equal(banco(OK_DB, OK_REDIS, {}, outroHost).motivo, "ALVO_RECUSADO");
  assert.equal(banco(OK_DB, OK_REDIS, {}, semPorta).motivo, "ALVO_RECUSADO");
});

test("C2b-e11 espaco inicial com o parser real recusa (mata a M12)", () => {
  // O `new URL` apara o espaco e le o destino permitido; o parser do driver le outro host (Emenda 1.1 §5.2).
  for (const u of [" " + OK_DB, " postgresql://u@127.0.0.1:55570/x"]) {
    const r = banco(u);
    assert.equal(r.codigo, 2, JSON.stringify(u));
    assert.equal(r.motivo, "ALVO_RECUSADO", JSON.stringify(u));
  }
});

test("C2b-e1 canario: o parser e o do driver e ainda troca o destino pela query", () => {
  const r = A.parserDoDriver()(OK_DB + "?host=127.0.0.1&port=55564");
  assert.equal(`${r.host}:${r.port}`, "127.0.0.1:55564");
});

test("C2b-e1 porta ausente, protocolo e forma recusam", () => {
  for (const u of [
    "postgresql://postgres@postgres/erp_techsolutions",
    "mysql://postgres@postgres:5432/erp_techsolutions",
    "postgresql://postgres@postgres:5432/outra",
    "postgresql://postgres@postgres:5432/",
    "postgresql://postgres@%2Fvar%2Frun/erp_techsolutions",
    "postgresql:///erp_techsolutions",
    "postgresql://u@127.0.0.1:55570/X",
  ]) {
    assert.equal(banco(u).motivo, "ALVO_RECUSADO", u);
  }
});

test("C2b-e1 dotenv com override ou caminho recusa (mata a M13)", () => {
  assert.equal(banco(OK_DB, OK_REDIS, { DOTENV_CONFIG_OVERRIDE: "true" }).motivo, "ALVO_RECUSADO");
  assert.equal(banco(OK_DB, OK_REDIS, { DOTENV_CONFIG_OVERRIDE: "" }).motivo, "ALVO_RECUSADO");
  assert.equal(banco(OK_DB, OK_REDIS, { DOTENV_CONFIG_PATH: "/x/.env" }).motivo, "ALVO_RECUSADO");
});

test("C2b-e1 redis: a 6379 do host e a faixa (mata a M10)", () => {
  for (const r of [
    "redis://127.0.0.1:6379",
    "redis://127.0.0.1",
    "redis://127.0.0.1:6499",
    "redis://127.0.0.1:6600",
    "rediss://redis:6379",
    "redis://redis:6380",
    "redis://redis:6379?db=1",
    "redis://redis:6379#x",
  ]) {
    const v = banco(OK_DB, r);
    assert.equal(v.codigo, 2, r);
    assert.equal(v.motivo, "REDIS_RECUSADO", r);
  }
  for (const r of ["redis://127.0.0.1:6500", "redis://127.0.0.1:6599"]) {
    assert.equal(banco(OK_DB, r).ok, true, r);
  }
});

test("C2b-e1 alvo trocado depois da avaliacao e visto (mata a M15)", () => {
  const a = { DATABASE_URL: OK_DB, REDIS_URL: OK_REDIS };
  assert.equal(A.alvoMudou({ ...a }, a), false);
  assert.equal(A.alvoMudou({ ...a, DATABASE_URL: "postgresql://postgres@127.0.0.1:55564/x" }, a), true);
  assert.equal(A.alvoMudou({ ...a, REDIS_URL: "redis://127.0.0.1:6379" }, a), true);
  assert.equal(A.alvoMudou({ REDIS_URL: OK_REDIS }, a), true);
});

test("C2b-e11 argumento fora da lista recusa (mata a M24)", () => {
  // O caso que mata a mutacao tem numero PAR de argumentos: o impar ja cai em "flag sem valor".
  for (const argv of [
    ["dotenv_config_path=x", "dotenv_config_override=true"],
    ["--fixture", "f.json", "dotenv_config_override=true", "x"],
    ["--limpar", "x"],
    ["--limpar"],
    ["--fixture", "a.json", "--fixture", "b.json"],
    ["--fixture"],
    ["--fixture", "f.json", "--saida-segredo"],
  ]) {
    const r = A.avaliarArgumentos(argv);
    assert.equal(r.ok, false, JSON.stringify(argv));
    assert.equal(r.codigo, 2, JSON.stringify(argv));
    assert.equal(r.motivo, "ARGUMENTO_RECUSADO", JSON.stringify(argv));
  }
  const bom = A.avaliarArgumentos(["--fixture", "f.json", "--saida-segredo", "/s"]);
  assert.equal(bom.ok, true);
  assert.deepEqual(bom.lido, { "--fixture": "f.json", "--saida-segredo": "/s" });
  assert.equal(A.avaliarArgumentos([]).ok, true);
});

test("C3 projeto (mata a M6)", () => {
  for (const p of ["b10bx-seed", "erp-o6r-smoke", "erp", "", "b10b-", "demo-isolado-", "demo-isolado-ABC", "b10b-seed_x", "b10b-" + "a".repeat(41)]) {
    const r = A.avaliarAlvo({ DEMO_ISOLADO_PROJETO: p }, "http://api:3000");
    assert.equal(r.codigo, 2, p);
    assert.equal(r.motivo, "PROJETO_RECUSADO", p);
  }
  assert.equal(A.avaliarAlvo({}, "http://api:3000").motivo, "PROJETO_RECUSADO");
  assert.equal(A.avaliarAlvoBanco({ DATABASE_URL: OK_DB, REDIS_URL: OK_REDIS }).motivo, "PROJETO_RECUSADO");
  for (const p of ["b10b-seed", "b10b-seed-ctl", "demo-isolado-x", "demo-isolado-a1", "b10b-" + "a".repeat(40)]) {
    assert.equal(A.avaliarAlvo({ DEMO_ISOLADO_PROJETO: p }, "http://api:3000").ok, true, p);
  }
});

test("C4 censo puro (mata a M4)", () => {
  const pl = { slug: "platform", name: "Plataforma" };
  const fx = { slug: "organizacao-exemplo-x", name: "Organização Exemplo" };
  const ou = { slug: "outra", name: "Outra Exemplo" };
  const n = "Organização Exemplo";
  assert.equal(A.avaliarCenso([pl], n, "motor").motivo, "FUNDACAO_AUSENTE");
  const cria = A.avaliarCenso([pl], n, "fundacao");
  assert.equal(cria.ok, true);
  assert.equal(cria.existente, null);
  const segue = A.avaliarCenso([pl, fx], n, "motor");
  assert.equal(segue.ok, true);
  assert.deepEqual(segue.existente, fx);
  assert.equal(A.avaliarCenso([pl, fx], n, "fundacao").ok, true);
  for (const papel of ["motor", "fundacao"]) {
    const r = A.avaliarCenso([pl, fx, ou], n, papel);
    assert.equal(r.codigo, 3, papel);
    assert.equal(r.motivo, "ALVO_NAO_VIRGEM", papel);
    assert.equal(A.avaliarCenso([pl, ou], n, papel).motivo, "ALVO_NAO_VIRGEM", papel);
  }
  assert.equal(A.avaliarCenso([], n, "motor").motivo, "PERSISTENCIA_NAO_REAL");
  assert.equal(A.avaliarCenso([], n, "fundacao").codigo, 3);
  assert.equal(A.avaliarCenso([pl, fx, { ...fx, slug: "organizacao-exemplo-y" }], n, "fundacao").motivo, "ALVO_NAO_VIRGEM");
  assert.equal(A.avaliarCenso([fx], n, "fundacao").motivo, "BASE_SEM_OP6");
});

test("C4 plataforma: real recusa (mata a M4c)", () => {
  const r = A.avaliarPlataforma(["a@exemplo.invalid", "b@empresa.exemplo"]);
  assert.equal(r.codigo, 3);
  assert.equal(r.motivo, "PLATAFORMA_REAL");
  assert.equal(A.avaliarPlataforma(["a@exemplo.invalid.com"]).motivo, "PLATAFORMA_REAL");
  assert.equal(A.avaliarPlataforma(["a@exemplo.invalid"]).ok, true);
  assert.equal(A.avaliarPlataforma(["a@exemplo.invalid", "b@outro.invalid"]).ok, true);
});

test("C4-e1 plataforma sem usuario recusa (mata a M14)", () => {
  const r = A.avaliarPlataforma([]);
  assert.equal(r.codigo, 3);
  assert.equal(r.motivo, "BASE_SEM_OP6");
});

test("C4-e1 trava de execucao unica (mata a M19)", () => {
  const d = dirTemporario();
  try {
    const a = A.adquirirTrava(d);
    assert.equal(a.ok, true);
    const b = A.adquirirTrava(d);
    assert.equal(b.codigo, 3);
    assert.equal(b.motivo, "FUNDACAO_EM_CURSO");
    a.soltar();
    const c = A.adquirirTrava(d);
    assert.equal(c.ok, true);
    c.soltar();
    assert.deepEqual(fs.readdirSync(d), []);
  } finally {
    fs.rmSync(d, { recursive: true, force: true });
  }
});

test("C5 sem senha recusa (mata a M7)", () => {
  for (const s of ["", undefined, null]) {
    assert.throws(
      () => A.exigirSenha(s),
      (e: unknown) => e instanceof A.ErroTrava && e.codigo === 4 && e.motivo === "SENHA_AUSENTE",
      String(s),
    );
  }
  assert.equal(A.exigirSenha("x"), "x");
});

test("C5-e1 saida de segredo: ausente, ou existe mas nao aceita arquivo, recusa (mata a M18)", () => {
  const d = dirTemporario();
  try {
    const arquivo = path.join(d, "sou-arquivo");
    fs.writeFileSync(arquivo, "x");
    for (const alvo of [path.join(d, "nao-existe"), undefined, "", arquivo]) {
      const r = A.sondarSaida(alvo);
      assert.equal(r.ok, false, String(alvo));
      assert.equal(r.codigo, 4, String(alvo));
      assert.equal(r.motivo, "SAIDA_SEGREDO_AUSENTE", String(alvo));
    }
    assert.equal(fs.existsSync(arquivo), true);
    assert.equal(A.sondarSaida(d).ok, true);
    assert.deepEqual(fs.readdirSync(d), ["sou-arquivo"]);
  } finally {
    fs.rmSync(d, { recursive: true, force: true });
  }
});
