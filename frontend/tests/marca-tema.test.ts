import assert from "node:assert/strict";
import test, { after } from "node:test";

import { elements, installMiniDom, propsOf, text, type MiniDomElement, type MiniDomNode } from "./helpers/mini-dom";

// B-MARCA-LOGIN-SIDEBAR (fatia L) — as 3 cores do sistema (Grafite, Branca e Preta): a guarda e o seletor.
//   T-L16 valor inválido ou ausente na guarda do aparelho = Grafite;
//   T-L17 (a) o `theme.boot` aplica a chave do aparelho sem usuário; (b) escolher no menu grava as duas chaves; (c) o menu,
//         ao montar, copia a pessoal para a do aparelho SÓ SE ela existir; (d) nada é gravado em chave `techsol.aparencia.`;
//   T-L19 o seletor tem "Grafite", "Branca" e "Preta", sem "(aprovada)", e marca a cor em uso;
//   T-L21 os 3 controles de cor têm 44 px de altura mínima, recebem foco por Tab e mudam por seta.
// O menu é o `AppearanceMenu` de verdade, montado com os provedores reais no DOM mínimo do repositório.
process.env.VITE_USE_MOCKS = "false";

const dom = installMiniDom();

const consoleErrors: string[] = [];
const originalConsoleError = console.error;
console.error = (...args: unknown[]) => {
  consoleErrors.push(args.map((arg) => (arg instanceof Error ? (arg.stack ?? arg.message) : String(arg))).join(" "));
};
after(() => {
  console.error = originalConsoleError;
  assert.deepEqual(consoleErrors, [], "nenhum console.error em todo o arquivo");
});

const React = await import("react");
const { createRoot } = await import("react-dom/client");
const { MemoryRouter } = await import("react-router-dom");
const { AppearanceMenu } = await import("../src/modules/appearance");
const { AuthProvider } = await import("../src/providers/AuthProvider");
const { TenantProvider } = await import("../src/providers/TenantProvider");
const { PermissionProvider } = await import("../src/providers/PermissionProvider");
const { setStoredAuthSession } = await import("../src/modules/auth/auth.storage");
const { mockSession } = await import("../src/mocks/auth/context");
// O boot entra sob demanda, dentro de cada caso: sem o arquivo, cada caso falha por si (e não o arquivo inteiro).
const bootThemeColor = async () => (await import("../src/modules/appearance/theme.boot")).bootThemeColor();

const h = React.createElement;
type ActFn = (callback: () => Promise<void> | void) => Promise<void>;
const reactAct = (React as unknown as { act?: ActFn }).act;
const act: ActFn = (callback) => {
  if (typeof reactAct !== "function") throw new Error("React.act ausente");
  return reactAct(callback);
};

const DEVICE_KEY = "techsol.tema.dispositivo";
const USER_ID = "u-tema-1";
const PERSONAL_KEY = `techsol.tema.${USER_ID}`;

const theme = () => dom.doc.documentElement.getAttribute("data-tema");

function freshTerrain() {
  dom.storage.clear();
  dom.doc.documentElement.removeAttribute("data-tema");
}

function seedSession() {
  setStoredAuthSession({ ...mockSession, user: { ...mockSession.user, id: USER_ID } });
}

async function mountMenu() {
  const container = dom.doc.createElement("div");
  dom.doc.body.appendChild(container);
  const root = createRoot(container as unknown as Element);
  await act(async () => {
    root.render(
      h(MemoryRouter, null, h(AuthProvider, null, h(TenantProvider, null, h(PermissionProvider, null, h(AppearanceMenu))))) as never,
    );
  });
  return {
    container: container as MiniDomElement,
    open: async () => {
      const trigger = elements(container as MiniDomElement, (el) => el.localName === "button" && el.getAttribute("aria-label") === "Aparência das telas")[0];
      assert.ok(trigger, "o gatilho do menu de aparência");
      await act(async () => {
        (propsOf(trigger).onClick as () => void)();
      });
    },
    unmount: async () => {
      await act(async () => root.unmount());
      container.parentNode?.removeChild(container);
    },
  };
}

const colorGroup = (root: MiniDomNode) => elements(root, (el) => el.getAttribute("role") === "radiogroup")[0];
const colorRadios = (root: MiniDomNode) => elements(root, (el) => el.getAttribute("role") === "radio");
const radioNamed = (root: MiniDomNode, name: string) => colorRadios(root).find((el) => text(el).trim() === name);

test("T-L16 valor inválido ou ausente na guarda do aparelho = Grafite", async () => {
  freshTerrain();
  assert.equal(await bootThemeColor(), "grafite", "ausente");
  assert.equal(theme(), "grafite");
  for (const invalid of ["roxa", "", "GRAFITE", "branca ", "null"]) {
    dom.storage.set(DEVICE_KEY, invalid);
    assert.equal(await bootThemeColor(), "grafite", `inválido: ${JSON.stringify(invalid)}`);
    assert.equal(theme(), "grafite");
  }
  dom.storage.set(DEVICE_KEY, "preta");
  assert.equal(await bootThemeColor(), "preta", "controle: um valor válido vale");
  assert.equal(theme(), "preta");
});

test("T-L17 a guarda: o boot sem usuário, a escolha no menu, a cópia ao montar só com chave pessoal, e nada em techsol.aparencia.", async () => {
  // (a) o boot aplica a chave do aparelho sem usuário, e não grava nada.
  freshTerrain();
  dom.storage.set(DEVICE_KEY, "branca");
  assert.equal(await bootThemeColor(), "branca");
  assert.equal(theme(), "branca", "(a) o data-tema do elemento raiz vem da chave do aparelho");
  assert.deepEqual([...dom.storage.keys()], [DEVICE_KEY], "(a) o boot só lê");

  // (c) sem chave pessoal, montar o menu não grava nada: a cor do aparelho fica.
  freshTerrain();
  seedSession();
  dom.storage.set(DEVICE_KEY, "preta");
  dom.doc.documentElement.setAttribute("data-tema", "preta");
  const before = new Map(dom.storage);
  let menu = await mountMenu();
  await menu.unmount();
  assert.equal(dom.storage.get(DEVICE_KEY), "preta", "(c) sem chave pessoal, a do aparelho não muda");
  assert.equal(dom.storage.has(PERSONAL_KEY), false, "(c) e nenhuma chave pessoal nasce");
  assert.deepEqual([...dom.storage.keys()].filter((key) => key.startsWith("techsol.tema.")), [...before.keys()].filter((key) => key.startsWith("techsol.tema.")));
  assert.equal(theme(), "preta");

  // (c) com chave pessoal, montar o menu aplica a pessoal e a copia para a do aparelho.
  dom.storage.set(PERSONAL_KEY, "branca");
  menu = await mountMenu();
  await menu.unmount();
  assert.equal(dom.storage.get(DEVICE_KEY), "branca", "(c) a pessoal é copiada para a do aparelho");
  assert.equal(theme(), "branca", "(c) e aplicada");

  // (b) escolher no menu grava as duas chaves e aplica.
  freshTerrain();
  seedSession();
  menu = await mountMenu();
  await menu.open();
  const preta = radioNamed(menu.container, "Preta");
  assert.ok(preta, "a opção Preta");
  await act(async () => {
    (propsOf(preta).onClick as () => void)();
  });
  await menu.unmount();
  assert.equal(dom.storage.get(DEVICE_KEY), "preta", "(b) a chave do aparelho");
  assert.equal(dom.storage.get(PERSONAL_KEY), "preta", "(b) a chave pessoal");
  assert.equal(theme(), "preta", "(b) a cor é aplicada");

  // (d) a cor nunca mora na chave da aparência por tela.
  assert.deepEqual([...dom.storage.keys()].filter((key) => key.startsWith("techsol.aparencia.")), [], "(d) nada em techsol.aparencia.");
});

test("T-L19 o seletor \"Cores do sistema\" tem Grafite, Branca e Preta, sem \"(aprovada)\", e marca a cor em uso", async () => {
  freshTerrain();
  seedSession();
  dom.storage.set(DEVICE_KEY, "branca");
  await bootThemeColor();
  const menu = await mountMenu();
  try {
    await menu.open();
    const group = colorGroup(menu.container);
    assert.ok(group, "um radiogroup");
    const labelId = group.getAttribute("aria-labelledby") ?? "";
    assert.equal(labelId.startsWith("aparencia-"), false, "o id do grupo não começa com aparencia-");
    const label = elements(menu.container, (el) => el.getAttribute("id") === labelId)[0];
    assert.equal(text(label ?? group).trim(), "Cores do sistema");
    const radios = colorRadios(menu.container);
    assert.deepEqual(radios.map((el) => text(el).trim()), ["Grafite", "Branca", "Preta"]);
    assert.doesNotMatch(text(group), /aprovada/i, "sem \"(aprovada)\"");
    assert.deepEqual(
      radios.map((el) => el.getAttribute("aria-checked")),
      ["false", "true", "false"],
      "a Branca, que está em uso, vem marcada",
    );
    assert.equal(elements(group, (el) => el.getAttribute("role") === "menuitemradio").length, 0, "nenhum menuitemradio no seletor de cor");
  } finally {
    await menu.unmount();
  }
});

test("T-L21 os 3 controles de cor têm 44 px de altura mínima, recebem foco por Tab e mudam por seta dentro do grupo", async () => {
  freshTerrain();
  seedSession();
  await bootThemeColor();
  const menu = await mountMenu();
  try {
    await menu.open();
    const radios = colorRadios(menu.container);
    assert.equal(radios.length, 3);
    for (const radio of radios) {
      assert.equal(radio.localName, "button", "um botão de verdade");
      assert.ok(Number.parseFloat(String(radio.style.minHeight)) >= 44, `${text(radio).trim()}: altura mínima ${String(radio.style.minHeight)}`);
      assert.notEqual(radio.getAttribute("tabindex"), "-1", `${text(radio).trim()}: entra na ordem do Tab`);
    }
    let stopped = 0;
    const key = async (from: MiniDomElement, name: string) => {
      await act(async () => {
        (propsOf(from).onKeyDown as (event: unknown) => void)({
          key: name,
          preventDefault() {},
          stopPropagation() {
            stopped += 1;
          },
        });
      });
    };
    const checked = () => colorRadios(menu.container).find((el) => el.getAttribute("aria-checked") === "true");

    await key(radioNamed(menu.container, "Grafite")!, "ArrowDown");
    assert.equal(text(checked()!).trim(), "Branca", "seta para baixo: a próxima");
    assert.equal(dom.doc.activeElement, radioNamed(menu.container, "Branca"), "o foco vai junto");
    assert.equal(theme(), "branca");
    await key(radioNamed(menu.container, "Branca")!, "ArrowRight");
    assert.equal(text(checked()!).trim(), "Preta");
    await key(radioNamed(menu.container, "Preta")!, "ArrowDown");
    assert.equal(text(checked()!).trim(), "Grafite", "dá a volta dentro do grupo");
    await key(radioNamed(menu.container, "Grafite")!, "ArrowUp");
    assert.equal(text(checked()!).trim(), "Preta", "seta para cima: a anterior");
    assert.equal(dom.doc.activeElement, radioNamed(menu.container, "Preta"));
    assert.equal(stopped, 4, "a seta não passa para os itens do menu");
    await key(radioNamed(menu.container, "Preta")!, "Tab");
    assert.equal(stopped, 4, "o Tab segue a ordem normal");
    assert.equal(text(checked()!).trim(), "Preta", "o Tab não muda a cor");
  } finally {
    await menu.unmount();
  }
});
