import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

// B-MARCA-LOGIN-SIDEBAR (fatia L) — o login da marca Pátio Sul ERP, renderizado no servidor (molde: `smoke-flow.test.tsx`).
//   T-L1  a marca: "Pátio Sul ERP", o slogan e a imagem com o texto alternativo "Pátio Sul Brasil"; "TechSolutions" não aparece;
//   T-L2  sem o botão do Google e sem "ou continue com";
//   T-L3  "E-mail" ligado a `login-email`, "Senha" ligado a `login-password`, os `autoComplete` de hoje e o botão "Entrar";
//   T-L5  modo demonstração: com VITE_USE_MOCKS=true, a faixa e os campos preenchidos; sem ele, sem faixa e campos vazios;
//   T-L14 o título do documento é "Pátio Sul ERP";
//   T-L18 a Branca mostra o logo escuro; a Grafite e a Preta, o amarelo (as duas imagens na página e a folha que escolhe).
// Alvo: docs/claude-code-handoff/screen-refs/login-patiosul.reference.html.

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, "..");

const storage = new Map<string, string>();
Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: {
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
      clear: () => storage.clear(),
    },
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => true,
    setTimeout: globalThis.setTimeout.bind(globalThis),
  },
});

async function renderLogin(useMocks: boolean): Promise<string> {
  process.env.VITE_USE_MOCKS = useMocks ? "true" : "false";
  storage.clear();
  const { AuthProvider } = await import("../src/providers/AuthProvider");
  const { LoginPage } = await import("../src/pages/LoginPage");
  return renderToString(
    <MemoryRouter initialEntries={["/login"]}>
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

/** O texto visível: sem marcação, com as entidades básicas resolvidas. */
function visible(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, " ");
}

/** As tags de abertura de um elemento, por nome. */
function tags(html: string, name: string): string[] {
  return [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, "g"))].map((match) => match[0]);
}

function attr(tag: string, name: string): string | null {
  return new RegExp(`\\s${name}="([^"]*)"`, "i").exec(tag)?.[1] ?? null;
}

test("T-L1 a marca: \"Pátio Sul ERP\", o slogan e o logo com o texto alternativo \"Pátio Sul Brasil\"; sem \"TechSolutions\"", async () => {
  const html = await renderLogin(false);
  const text = visible(html);
  assert.match(text, /Pátio Sul ERP/, "o nome do sistema");
  assert.match(text, /Gestão de pátio, guincho e leilão em um só sistema\./, "o slogan");
  assert.match(text, /© Pátio Sul ERP/, "o rodapé do cartão");
  const logos = tags(html, "img");
  assert.equal(logos.length, 2, "o logo de letras amarelas e o de letras pretas");
  for (const logo of logos) assert.equal(attr(logo, "alt"), "Pátio Sul Brasil");
  assert.doesNotMatch(html, /TechSolutions/, "a marca antiga não aparece");
  assert.doesNotMatch(html, /Plataforma de operações de campo/, "o subtítulo antigo não aparece");
});

test("T-L2 sem o botão \"Entrar com Google\" e sem o divisor \"ou continue com\"", async () => {
  const text = visible(await renderLogin(false));
  assert.doesNotMatch(text, /Google/);
  assert.doesNotMatch(text, /ou continue com/);
});

test("T-L3 \"E-mail\" e \"Senha\" ligados aos campos, com os autoComplete de hoje, e o botão de envio \"Entrar\"", async () => {
  const html = await renderLogin(false);
  const emailLabel = tags(html, "label").find((tag) => attr(tag, "for") === "login-email");
  assert.ok(emailLabel, "o rótulo do e-mail aponta para login-email");
  assert.match(html, /<label[^>]*for="login-email"[^>]*>E-mail<\/label>/, "o rótulo diz \"E-mail\"");
  const email = tags(html, "input").find((tag) => attr(tag, "id") === "login-email");
  assert.ok(email, "o campo login-email existe");
  assert.equal(attr(email, "type"), "email");
  assert.equal(attr(email, "autocomplete"), "email");

  // A senha é o `PasswordInput` da biblioteca: o <label> envolve o rótulo "Senha" e o campo login-password.
  const passwordLabel = /<label[^>]*>(?:(?!<\/label>).)*<\/label>/gs;
  const wrapping = [...html.matchAll(passwordLabel)].map((match) => match[0]).find((block) => /id="login-password"/.test(block));
  assert.ok(wrapping, "um <label> envolve o campo login-password");
  assert.match(wrapping, /<span>Senha<\/span>/, "o rótulo do campo de senha é \"Senha\"");
  const password = tags(wrapping, "input")[0];
  assert.equal(attr(password, "type"), "password");
  assert.equal(attr(password, "autocomplete"), "current-password");
  assert.match(wrapping, /aria-label="Mostrar senha"/, "o olho da biblioteca está no campo");

  const submit = /<button[^>]*type="submit"[^>]*>(?:(?!<\/button>).)*<\/button>/s.exec(html)?.[0] ?? "";
  assert.equal(visible(submit).trim(), "Entrar", "o botão de envio diz \"Entrar\"");
});

test("T-L5 o modo demonstração: com VITE_USE_MOCKS=true, a faixa e os campos preenchidos; sem ele, sem faixa e com os campos vazios", async () => {
  const demo = await renderLogin(true);
  assert.match(visible(demo), /Ambiente de demonstração · dados fictícios\./, "a faixa aparece no modo demonstração");
  assert.match(demo, /data-faixa="demonstracao"/);
  assert.ok(attr(tags(demo, "input").find((tag) => attr(tag, "id") === "login-email") ?? "", "value"), "o e-mail de exemplo vem preenchido");
  assert.ok(attr(tags(demo, "input").find((tag) => attr(tag, "id") === "login-password") ?? "", "value"), "a senha de exemplo vem preenchida");

  const real = await renderLogin(false);
  assert.doesNotMatch(visible(real), /Ambiente de demonstração/, "fora do modo demonstração, sem a faixa");
  assert.doesNotMatch(real, /data-faixa="demonstracao"/);
  assert.equal(attr(tags(real, "input").find((tag) => attr(tag, "id") === "login-email") ?? "", "value"), "", "o e-mail vem vazio");
  assert.equal(attr(tags(real, "input").find((tag) => attr(tag, "id") === "login-password") ?? "", "value"), "", "a senha vem vazia");
});

test("T-L14 o título do documento é \"Pátio Sul ERP\"", () => {
  const index = readFileSync(resolve(FRONTEND, "index.html"), "utf8");
  assert.equal(/<title>([^<]*)<\/title>/.exec(index)?.[1], "Pátio Sul ERP");
});

test("T-L18 a Branca mostra o logo de letras pretas; a Grafite e a Preta, o de letras amarelas", async () => {
  const html = await renderLogin(false);
  const logos = tags(html, "img");
  const amarelo = logos.find((tag) => /ps-login__logo--amarelo/.test(attr(tag, "class") ?? ""));
  const escuro = logos.find((tag) => /ps-login__logo--escuro/.test(attr(tag, "class") ?? ""));
  assert.ok(amarelo && escuro, "as duas imagens estão na página");
  assert.match(attr(amarelo, "src") ?? "", /patiosul-logo-login\.png$/);
  assert.match(attr(escuro, "src") ?? "", /patiosul-logo-login-escuro\.png$/);

  // A folha escolhe pela cor do elemento raiz: o escuro só na Branca, misturado ao fundo claro; nas outras duas, o amarelo.
  const css = readFileSync(resolve(FRONTEND, "src/styles/marca.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  const rule = (selector: string) => {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
    return new RegExp(`(?:^|})\\s*${escaped}\\s*\\{([^}]*)\\}`).exec(css)?.[1].replace(/\s+/g, " ").trim() ?? null;
  };
  assert.match(rule(".ps-login__logo--escuro") ?? "", /display: none/, "sem cor escolhida (Grafite) e na Preta, o escuro fica escondido");
  assert.match(rule(':root[data-tema="branca"] .ps-login__logo--amarelo') ?? "", /display: none/, "na Branca, o amarelo some");
  const branca = rule(':root[data-tema="branca"] .ps-login__logo--escuro') ?? "";
  assert.match(branca, /display: block/, "na Branca, o escuro aparece");
  assert.match(branca, /mix-blend-mode: multiply/, "misturado ao fundo claro, sem moldura");
  assert.equal(rule(':root[data-tema="preta"] .ps-login__logo--amarelo'), null, "a Preta não esconde o amarelo");
});
