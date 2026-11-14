// B-SAN3-10b-F4-SEED-ISOLADO — C7: a fixture publica da demonstracao isolada e generica.
//
// O repositorio e publico. A fixture nao pode trazer nome real (marca, orgao, banco, cidade, pessoa) nem
// e-mail fora de `@exemplo.invalid`. A lista proibida do plano NAO pode estar escrita aqui: ela casaria
// consigo mesma na varredura das linhas acrescentadas (C11). Por isso este teste e uma LISTA FECHADA de
// palavras: todo texto livre da fixture so pode usar o vocabulario abaixo. Palavra nova exige mudar este
// arquivo, e a mudanca passa pela varredura C11 do PR. Fail-closed: o que nao esta na lista reprova.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { validarFixture } from "../scripts/demo-isolado/semear.mjs";

const ARQUIVO = path.resolve("scripts/demo-isolado/fixture-exemplo.json");
const MATRIZ = path.resolve("scripts/demo-isolado/matriz-exemplo.tsv");

const VOCABULARIO = new Set(
  [
    "exemplo", "organização", "administração", "plataforma", "gestora", "despacho", "técnica", "financeiro",
    "auditoria", "cliente", "ltda", "viatura", "equipe", "remoção", "padrão", "tabela", "perfil", "documento",
    "do", "de", "veículo", "quem", "retira", "pátio", "rua", "cidade", "bloco", "marca", "modelo", "prata",
    "autoridade", "base", "frente", "traseira", "lado", "esquerdo", "direito", "teto", "painel", "motor", "chassi",
    "hodômetro", "objetos", "internos", "avarias", "encargo", "mobile", "exm", "concluída", "pelo", "app", "ordem",
    "aceita", "a", "caminho", "no", "local", "iniciado", "atribuída", "caixa", "banco", "baixa", "fornecedor",
  ].map((p) => p.toLowerCase()),
);

// Campos de valor tecnico (codigo, papel, referencia), com a regra propria de cada um.
const CHAVE = /^[a-z][a-z0-9_]{0,30}$/;
const TECNICOS: Record<string, RegExp> = {
  chave: CHAVE,
  membros: CHAVE,
  criada_por: CHAVE,
  por: CHAVE,
  tecnica: CHAVE,
  usuario: CHAVE,
  papel: /^(tenant_admin|manager|field_dispatcher|operator|field_technician|finance|auditor)$/,
  email: /^[a-z0-9._-]+@exemplo\.invalid$/,
  placa: /^EXM[0-9A-Z]{4}$/,
  placa_atendida: /^EXM[0-9A-Z]{4}$/,
  viatura: /^EXM[0-9A-Z]{4}$/,
  telefone: /^\(11\) 3000-[0-9]{4}$/,
  tipo: /^[A-Za-z_]{1,40}$/,
  moeda: /^BRL$/,
  uf: /^[A-Z]{2}$/,
  escopo: /^[A-Z_]{1,40}$/,
  modelo_diaria: /^[A-Z0-9_]{1,40}$/,
  teto_diaria: /^[A-Z_]{1,40}$/,
  codigo: /^[A-Z0-9_-]{1,40}$/,
  vaga: /^[A-Z0-9_-]{1,40}$/,
  fuso: /^America\/Sao_Paulo$/,
  classe: /^[A-Z]{1,20}$/,
  situacao_final: /^[A-Z_]{1,40}$/,
  set: /^[A-Z_]{1,40}$/,
  procedimento: /^EXM-[A-Z0-9-]{1,30}$/,
  chassi: /^EXM[0-9A-Z]{1,30}$/,
  documento: /^EXM-[A-Z0-9-]{1,30}$/,
  direcao: /^(receivable|payable)$/,
  tipo_parte: /^[a-z_]{1,40}$/,
  meio: /^[a-z_]{1,40}$/,
  prioridade: /^[a-z]{1,20}$/,
  para: /^[a-z_]{1,40}$/,
  agencia: /^[0-9-]{1,20}$/,
  numero: /^[0-9-]{1,20}$/,
};
const DINHEIRO = new Set(["preco_base", "valor", "saldo_inicial"]);
const NUMEROS = new Set(["ano", "latitude", "longitude", "vencimento_relativo_dias", "duracao_estimada_min"]);

type Falha = string;

export function conferirFixtureGenerica(texto: string): Falha[] {
  const falhas: Falha[] = [];
  let f: unknown;
  try {
    f = JSON.parse(texto);
  } catch {
    return ["json invalido"];
  }
  if (texto.includes("work_order.create")) falhas.push("a fixture pede OS pelo sync (work_order.create)");
  const palavras = (v: string) => v.split(/[^\p{L}]+/u).filter(Boolean);
  const andar = (v: unknown, chave: string, onde: string) => {
    if (Array.isArray(v)) return v.forEach((x, i) => andar(x, chave, `${onde}[${i}]`));
    if (v && typeof v === "object") return Object.entries(v).forEach(([k, x]) => andar(x, k, `${onde}.${k}`));
    if (typeof v === "number") {
      if (!NUMEROS.has(chave)) falhas.push(`${onde}: numero fora de ${[...NUMEROS].join("/")} (dinheiro e texto)`);
      return;
    }
    if (typeof v === "boolean") return;
    if (typeof v !== "string") return falhas.push(`${onde}: tipo inesperado`);
    if (/@/.test(v) && !/^[a-z0-9._-]+@exemplo\.invalid$/.test(v)) falhas.push(`${onde}: e-mail fora de @exemplo.invalid`);
    if (DINHEIRO.has(chave)) {
      if (!/^[0-9]{1,12}[.][0-9]{2}$/.test(v)) falhas.push(`${onde}: dinheiro sem 2 casas`);
      return;
    }
    if (TECNICOS[chave]) {
      if (!TECNICOS[chave].test(v)) falhas.push(`${onde}: valor tecnico fora da regra`);
      return;
    }
    for (const p of palavras(v)) {
      if (!VOCABULARIO.has(p.toLowerCase())) falhas.push(`${onde}: palavra fora do vocabulario (${p.length} letras)`);
    }
  };
  andar(f, "", "fixture");
  return falhas;
}

const texto = fs.readFileSync(ARQUIVO, "utf8");
const fixture = JSON.parse(texto);

test("C7 a fixture passa no esquema do motor", () => {
  assert.deepEqual(validarFixture(fixture), []);
});

test("C7 as 3 chaves congeladas da fundacao (Emenda 1.1 §8.1)", () => {
  assert.equal(typeof fixture.organizacao.nome, "string");
  assert.equal(typeof fixture.admin.nome, "string");
  assert.equal(typeof fixture.admin.email, "string");
  assert.ok(fixture.admin.email.endsWith(".invalid"));
  // O nome leva acento e vai em UTF-8 (Emenda 1.3 §2); o slug sai do produto, em ASCII.
  assert.equal(fixture.organizacao.nome, "Organização Exemplo");
  // O nome do administrador tambem leva acento (Emenda 1.6, PR-A5).
  assert.equal(fixture.admin.nome, "Administração Exemplo");
  assert.notEqual(fixture.organizacao.nome.toLowerCase(), "demo");
});

test("C7 a fixture e generica: vocabulario fechado, e-mail @exemplo.invalid, dinheiro em texto, sem OS pelo sync (mata a injecao de nome real)", () => {
  assert.deepEqual(conferirFixtureGenerica(texto), []);
  // Vermelho-controle dentro do proprio teste: um nome fora do vocabulario e um e-mail real reprovam.
  const comNomeReal = texto.replace("Cliente Exemplo Ltda", "Cliente Exemplo Ltda Fulano");
  assert.ok(conferirFixtureGenerica(comNomeReal).some((f) => f.includes("vocabulario")));
  const comEmailReal = texto.replace("gestor@exemplo.invalid", "gestor@exemplo");
  assert.ok(conferirFixtureGenerica(comEmailReal).some((f) => f.includes("e-mail")));
  const comNumero = texto.replace('"valor": "350.00"', '"valor": 350');
  assert.ok(conferirFixtureGenerica(comNumero).length > 0);
});

test("C7 todo e-mail da fixture e unico e termina em @exemplo.invalid", () => {
  const emails = [fixture.admin.email, fixture.plataforma.email, ...fixture.usuarios.map((u: { email: string }) => u.email)];
  assert.equal(new Set(emails).size, emails.length);
  assert.ok(emails.every((e) => /^[a-z0-9._-]+@exemplo\.invalid$/.test(e)));
});

test("C7 a matriz generica usa so papeis da fixture e nao tem e-mail real", () => {
  const papeis = new Set(["plataforma", "admin", ...fixture.usuarios.map((u: { chave: string }) => u.chave)]);
  const linhas = fs
    .readFileSync(MATRIZ, "utf8")
    .split(/\r?\n/)
    .filter((l) => l.trim() && !l.startsWith("#"))
    .slice(1);
  assert.ok(linhas.length > 0);
  for (const l of linhas) {
    const [, id, papel] = l.split("\t");
    assert.ok(papeis.has(papel), `${id}: papel ${papel} fora da fixture`);
    for (const e of l.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) ?? []) {
      assert.match(e, /@exemplo\.invalid$/, `${id}: e-mail fora de @exemplo.invalid`);
    }
  }
});
