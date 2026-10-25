import assert from "node:assert/strict";
import test from "node:test";

// B-APARENCIA-USUARIO — guarda da aparência pessoal (D-APARENCIA-RESPOSTAS (a)): no navegador, por organização e
// usuário, chave `techsol.aparencia.<tenantId>.<userId>`, todo acesso dentro de try/catch.

type StubStorage = { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void; clear(): void };

const store = new Map<string, string>();
let failWrites = false;
let failReads = false;
const localStorage: StubStorage = {
  getItem: (key) => {
    if (failReads) throw new Error("leitura recusada");
    return store.get(key) ?? null;
  },
  setItem: (key, value) => {
    if (failWrites) throw new Error("cota cheia");
    store.set(key, value);
  },
  removeItem: (key) => void store.delete(key),
  clear: () => store.clear(),
};
Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: { localStorage, addEventListener: () => undefined, removeEventListener: () => undefined },
});

const storageModule = await import("../src/modules/appearance/appearance.storage");
const { appearanceStorageKey, readScreenAppearance, writeScreenAppearance, sanitizeAppearancePrefs, defaultAppearanceFor } = storageModule;

function reset() {
  store.clear();
  failWrites = false;
  failReads = false;
}

test("chave por organização E usuário; sem um dos dois não há chave", () => {
  assert.equal(appearanceStorageKey("org-1", "usr-1"), "techsol.aparencia.org-1.usr-1");
  assert.equal(appearanceStorageKey(undefined, "usr-1"), null);
  assert.equal(appearanceStorageKey("org-1", undefined), null);
  assert.equal(appearanceStorageKey("", ""), null);
});

test("padrão por tela: Pátios = B; as demais = A (D-APARENCIA-RESPOSTAS (b))", () => {
  reset();
  assert.equal(defaultAppearanceFor("patios"), "B");
  assert.equal(defaultAppearanceFor("dashboard"), "A");
  assert.equal(defaultAppearanceFor("work-orders"), "A");
  assert.equal(readScreenAppearance(appearanceStorageKey("org-1", "usr-1"), "patios"), "B", "nada guardado → padrão da tela");
  assert.equal(readScreenAppearance(appearanceStorageKey("org-1", "usr-1"), "dashboard"), "A");
});

test("round-trip: grava e lê de volta, no formato { tela: letra }", () => {
  reset();
  const key = appearanceStorageKey("org-1", "usr-1");
  assert.equal(writeScreenAppearance(key, "patios", "C"), true);
  assert.equal(readScreenAppearance(key, "patios"), "C");
  assert.deepEqual(JSON.parse(store.get("techsol.aparencia.org-1.usr-1") ?? "null"), { patios: "C" });
  writeScreenAppearance(key, "dashboard", "B");
  assert.deepEqual(JSON.parse(store.get("techsol.aparencia.org-1.usr-1") ?? "null"), { patios: "C", dashboard: "B" }, "uma tela não apaga a outra");
});

test("isolamento: a escolha de um usuário não vaza para outro usuário nem para outra organização", () => {
  reset();
  writeScreenAppearance(appearanceStorageKey("org-1", "usr-1"), "patios", "A");
  assert.equal(readScreenAppearance(appearanceStorageKey("org-1", "usr-1"), "patios"), "A");
  assert.equal(readScreenAppearance(appearanceStorageKey("org-1", "usr-2"), "patios"), "B", "outro usuário, mesma organização");
  assert.equal(readScreenAppearance(appearanceStorageKey("org-2", "usr-1"), "patios"), "B", "mesmo usuário, outra organização");
});

test("valor inválido ou JSON corrompido cai no padrão da tela", () => {
  reset();
  store.set("techsol.aparencia.org-1.usr-1", JSON.stringify({ patios: "Z", dashboard: "c", "work-orders": 3 }));
  assert.equal(readScreenAppearance(appearanceStorageKey("org-1", "usr-1"), "patios"), "B");
  assert.equal(readScreenAppearance(appearanceStorageKey("org-1", "usr-1"), "dashboard"), "A");
  assert.equal(readScreenAppearance(appearanceStorageKey("org-1", "usr-1"), "work-orders"), "A");
  store.set("techsol.aparencia.org-1.usr-1", "{nao-e-json");
  assert.equal(readScreenAppearance(appearanceStorageKey("org-1", "usr-1"), "patios"), "B");
  store.set("techsol.aparencia.org-1.usr-1", JSON.stringify(["C"]));
  assert.equal(readScreenAppearance(appearanceStorageKey("org-1", "usr-1"), "patios"), "B");
});

test("sanitize descarta chave malformada e protótipo", () => {
  const prefs = sanitizeAppearancePrefs(JSON.parse('{"__proto__":"C","patios":"A","Tela Errada":"B","constructor":"C"}'));
  assert.deepEqual({ ...prefs }, { patios: "A", constructor: "C" });
  assert.equal(Object.getPrototypeOf(prefs), Object.prototype, "nada de protótipo trocado");
});

test("sem organização ou sem usuário: não grava nada e a tela fica no padrão", () => {
  reset();
  assert.equal(writeScreenAppearance(null, "patios", "C"), false);
  assert.equal(store.size, 0);
  assert.equal(readScreenAppearance(null, "patios"), "B");
  assert.equal(readScreenAppearance(null, "dashboard"), "A");
});

test("navegador recusa gravar (aba anônima, cota): não quebra, devolve false e a escolha vale na sessão", () => {
  reset();
  failWrites = true;
  const key = appearanceStorageKey("org-9", "usr-9");
  assert.doesNotThrow(() => writeScreenAppearance(key, "patios", "A"));
  assert.equal(writeScreenAppearance(key, "patios", "C"), false);
  assert.equal(store.size, 0);
  assert.equal(readScreenAppearance(key, "patios"), "C", "cópia em memória");
  failReads = true;
  assert.doesNotThrow(() => readScreenAppearance(key, "patios"));
  assert.equal(readScreenAppearance(key, "patios"), "C");
});

test("valor fora de A/B/C nunca é gravado", () => {
  reset();
  const key = appearanceStorageKey("org-1", "usr-1");
  assert.equal(writeScreenAppearance(key, "patios", "D" as never), false);
  assert.equal(writeScreenAppearance(key, "../patios", "A"), false);
  assert.equal(store.size, 0);
});
