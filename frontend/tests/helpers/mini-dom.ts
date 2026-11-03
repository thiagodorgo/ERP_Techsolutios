// B-APAR-OS (fundação da trilha B-APAR-3) — o DOM mínimo do repositório, num lugar só. Extraído da cópia de
// `finance-page-live.test.tsx` (que a herdou de `aparencia-patios-live`, que a herdou de `work-orders-page-live`), sem mudar
// o comportamento: ZERO dependência nova; nós, texto e comentário; atributos e `style`; `localStorage` em memória;
// `setInterval` que CAPTURA o callback e NUNCA dispara sozinho (o teste aciona o tick quando quer o 2º plano);
// `setTimeout` colapsado para 0 ms; `IS_REACT_ACT_ENVIRONMENT = true`.
//
// Uso: chame `installMiniDom()` ANTES de qualquer `import` de `react-dom/client` (ele calcula `canUseDOM` ao carregar) —
// React, roteador, provedores e páginas entram por `await import(...)` depois da instalação.
//
// Os testes "live" NOVOS da trilha B-APAR importam daqui. Migrar as cópias que já existem nos outros arquivos NÃO é deste
// bloco (`P-FRONT-DOM-MINIMO-TRIPLICADO`); os nomes das classes daqui (`MiniDom*`) são diferentes dos das cópias para que
// a contagem de cópias inline (contagem por `git grep` da declaração de classe `MiniNode` em `frontend/tests`) continue medindo só as cópias.

const HTML_NS = "http://www.w3.org/1999/xhtml";

export type Listener = (event: unknown) => void;

export class MiniDomNode {
  nodeType: number;
  nodeName: string;
  ownerDocument: MiniDomDocument | null;
  childNodes: MiniDomNode[] = [];
  parentNode: MiniDomNode | null = null;
  readonly listeners = new Map<string, Set<Listener>>();

  constructor(nodeType: number, nodeName: string, ownerDocument: MiniDomDocument | null) {
    this.nodeType = nodeType;
    this.nodeName = nodeName;
    this.ownerDocument = ownerDocument;
  }
  get firstChild(): MiniDomNode | null {
    return this.childNodes[0] ?? null;
  }
  get lastChild(): MiniDomNode | null {
    return this.childNodes[this.childNodes.length - 1] ?? null;
  }
  get nextSibling(): MiniDomNode | null {
    if (!this.parentNode) return null;
    const siblings = this.parentNode.childNodes;
    return siblings[siblings.indexOf(this) + 1] ?? null;
  }
  get previousSibling(): MiniDomNode | null {
    if (!this.parentNode) return null;
    const siblings = this.parentNode.childNodes;
    return siblings[siblings.indexOf(this) - 1] ?? null;
  }
  get parentElement(): MiniDomNode | null {
    return this.parentNode && this.parentNode.nodeType === 1 ? this.parentNode : null;
  }
  appendChild<T extends MiniDomNode>(child: T): T {
    if (child.parentNode) child.parentNode.removeChild(child);
    child.parentNode = this;
    this.childNodes.push(child);
    return child;
  }
  insertBefore<T extends MiniDomNode>(child: T, reference: MiniDomNode | null): T {
    if (!reference) return this.appendChild(child);
    if (child.parentNode) child.parentNode.removeChild(child);
    const index = this.childNodes.indexOf(reference);
    this.childNodes.splice(index, 0, child);
    child.parentNode = this;
    return child;
  }
  removeChild<T extends MiniDomNode>(child: T): T {
    const index = this.childNodes.indexOf(child);
    if (index >= 0) this.childNodes.splice(index, 1);
    child.parentNode = null;
    return child;
  }
  contains(node: MiniDomNode | null): boolean {
    for (let current = node; current; current = current.parentNode) if (current === this) return true;
    return false;
  }
  get textContent(): string {
    return this.childNodes.map((child) => child.textContent).join("");
  }
  set textContent(value: string | null) {
    for (const child of this.childNodes) child.parentNode = null;
    this.childNodes = [];
    if (value !== "" && value != null) this.appendChild(this.ownerDocument!.createTextNode(String(value)));
  }
  addEventListener(type: string, listener: Listener): void {
    const set = this.listeners.get(type) ?? new Set<Listener>();
    set.add(listener);
    this.listeners.set(type, set);
  }
  removeEventListener(type: string, listener: Listener): void {
    this.listeners.get(type)?.delete(listener);
  }
}

export class MiniDomText extends MiniDomNode {
  data: string;
  constructor(data: unknown, doc: MiniDomDocument) {
    super(3, "#text", doc);
    this.data = String(data);
  }
  get nodeValue(): string {
    return this.data;
  }
  set nodeValue(value: string) {
    this.data = String(value);
  }
  override get textContent(): string {
    return this.data;
  }
  override set textContent(value: string | null) {
    this.data = String(value);
  }
}

export class MiniDomComment extends MiniDomNode {
  data: string;
  constructor(data: string, doc: MiniDomDocument) {
    super(8, "#comment", doc);
    this.data = data;
  }
  override get textContent(): string {
    return "";
  }
  override set textContent(_value: string | null) {
    /* comentário não tem texto visível */
  }
}

type StyleObject = Record<string, string> & { setProperty: (key: string, value: string) => void; removeProperty: (key: string) => void };

function styleObject(): StyleObject {
  const style = {} as StyleObject;
  Object.defineProperty(style, "setProperty", { value: (key: string, value: string) => void (style[key] = value) });
  Object.defineProperty(style, "removeProperty", { value: (key: string) => void delete style[key] });
  return style;
}

export class MiniDomElement extends MiniDomNode {
  readonly tagName: string;
  readonly localName: string;
  readonly namespaceURI: string;
  readonly attributes = new Map<string, string>();
  readonly style = styleObject();
  private storedValue: string | undefined;
  // O <select> do paginador (TablePager): o React lê `options` e marca `selected`.
  selected = false;
  defaultSelected = false;

  constructor(tag: string, doc: MiniDomDocument, ns = HTML_NS) {
    super(1, ns === HTML_NS ? tag.toUpperCase() : tag, doc);
    this.tagName = this.nodeName;
    this.localName = tag;
    this.namespaceURI = ns;
  }
  get options(): MiniDomElement[] {
    return elements(this, (el) => el.localName === "option");
  }
  /**
   * Seletor SIMPLES (o bastante para os componentes da trilha): lista separada por vírgula de compostos com descendência
   * por espaço; composto = tag opcional + `[attr]`/`[attr='v']` + `:not([attr])`. Fora disso, lança — nunca finge achar.
   */
  querySelector(selector: string): MiniDomElement | null {
    return this.querySelectorAll(selector)[0] ?? null;
  }
  querySelectorAll(selector: string): MiniDomElement[] {
    return elements(this, (el) => matches(el, selector, this));
  }
  closest(selector: string): MiniDomElement | null {
    for (let node: MiniDomNode | null = this; node; node = node.parentNode) if (node instanceof MiniDomElement && matches(node, selector)) return node;
    return null;
  }
  setAttribute(name: string, value: unknown): void {
    this.attributes.set(name, String(value));
  }
  getAttribute(name: string): string | null {
    return this.attributes.has(name) ? this.attributes.get(name)! : null;
  }
  hasAttribute(name: string): boolean {
    return this.attributes.has(name);
  }
  removeAttribute(name: string): void {
    this.attributes.delete(name);
  }
  setAttributeNS(_ns: string | null, name: string, value: unknown): void {
    this.setAttribute(name, value);
  }
  removeAttributeNS(_ns: string | null, name: string): void {
    this.removeAttribute(name);
  }
  focus(): void {
    if (this.ownerDocument) this.ownerDocument.activeElement = this;
  }
  /** `el.click()` aciona o `onClick` que o React registrou no nó (sem delegação de eventos). */
  click(): void {
    const handler = propsOf(this).onClick;
    if (typeof handler === "function") handler({ target: this, currentTarget: this, preventDefault() {}, stopPropagation() {} });
  }
  blur(): void {}
  get value(): string {
    return this.storedValue ?? (this.localName === "option" ? (this.getAttribute("value") ?? this.textContent) : "");
  }
  set value(value: unknown) {
    this.storedValue = String(value);
  }
}

export type CapturedInterval = { fn: (() => void) | null; ms: number };

export class MiniDomDocument extends MiniDomNode {
  documentElement!: MiniDomElement;
  body!: MiniDomElement;
  activeElement!: MiniDomElement;
  hidden = false;
  defaultView: unknown = null;
  constructor() {
    super(9, "#document", null);
  }
  createElement(tag: string): MiniDomElement {
    return new MiniDomElement(tag, this);
  }
  createElementNS(ns: string, tag: string): MiniDomElement {
    return new MiniDomElement(tag, this, ns);
  }
  createTextNode(text: unknown): MiniDomText {
    return new MiniDomText(text, this);
  }
  createComment(text: string): MiniDomComment {
    return new MiniDomComment(text, this);
  }
  querySelector(selector: string): MiniDomElement | null {
    return this.documentElement?.querySelector(selector) ?? null;
  }
}

export function installMiniDom() {
  const doc = new MiniDomDocument();
  doc.documentElement = doc.appendChild(new MiniDomElement("html", doc));
  doc.body = doc.documentElement.appendChild(new MiniDomElement("body", doc));
  doc.activeElement = doc.body;
  const storage = new Map<string, string>();
  const intervals: CapturedInterval[] = [];
  const win = {
    document: doc,
    event: undefined as unknown,
    HTMLIFrameElement: class {},
    navigator: { userAgent: "node" },
    location: { href: "http://localhost/", pathname: "/", search: "", hash: "" },
    localStorage: {
      getItem: (key: string) => (storage.has(key) ? storage.get(key)! : null),
      setItem: (key: string, value: unknown) => void storage.set(key, String(value)),
      removeItem: (key: string) => void storage.delete(key),
      clear: () => storage.clear(),
    },
    addEventListener: (type: string, listener: Listener) => doc.addEventListener(type, listener),
    removeEventListener: (type: string, listener: Listener) => doc.removeEventListener(type, listener),
    dispatchEvent: (event: { type: string }) => {
      for (const listener of doc.listeners.get(event.type) ?? []) listener(event);
      return true;
    },
    setInterval: (fn: () => void, ms: number) => {
      intervals.push({ fn, ms });
      return intervals.length;
    },
    clearInterval: (id: number) => {
      if (intervals[id - 1]) intervals[id - 1].fn = null;
    },
    setTimeout: (fn: () => void, _ms?: number) => globalThis.setTimeout(fn, 0),
    clearTimeout: globalThis.clearTimeout.bind(globalThis),
    getComputedStyle: () => ({ getPropertyValue: () => "" }),
    scrollTo: () => {},
  };
  doc.defaultView = win;
  Object.defineProperty(globalThis, "window", { configurable: true, value: win });
  Object.defineProperty(globalThis, "document", { configurable: true, value: doc });
  if (typeof (globalThis as { navigator?: unknown }).navigator === "undefined") {
    Object.defineProperty(globalThis, "navigator", { configurable: true, value: win.navigator });
  }
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  return { doc, win, storage, intervals };
}

const VOID = new Set(["input", "img", "br", "hr", "meta", "link"]);

export function serialize(node: MiniDomNode): string {
  if (node instanceof MiniDomText) return node.data.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  if (node instanceof MiniDomComment) return "";
  if (!(node instanceof MiniDomElement)) return node.childNodes.map(serialize).join("");
  const attrs = [...node.attributes].map(([key, value]) => ` ${key}="${value.replace(/"/g, "&quot;")}"`).join("");
  const style = Object.entries(node.style)
    .map(([key, value]) => `${key}:${value}`)
    .join(";");
  const open = `<${node.localName}${attrs}${style ? ` style="${style}"` : ""}>`;
  return VOID.has(node.localName) ? open : `${open}${node.childNodes.map(serialize).join("")}</${node.localName}>`;
}

export function elements(root: MiniDomNode, match: (el: MiniDomElement) => boolean, acc: MiniDomElement[] = []): MiniDomElement[] {
  for (const child of root.childNodes) {
    if (child instanceof MiniDomElement) {
      if (match(child)) acc.push(child);
      elements(child, match, acc);
    }
  }
  return acc;
}

export const text = (el: MiniDomNode) => el.textContent;
export const hasClass = (el: MiniDomElement, cls: string) => (el.getAttribute("class") ?? "").split(/\s+/).includes(cls);

/** Propriedades que o React registrou no nó (`__reactProps$…`): é por elas que o teste aciona clique, tecla e digitação. */
export function propsOf(el: MiniDomElement): Record<string, unknown> {
  const key = Object.keys(el).find((name) => name.startsWith("__reactProps$"));
  if (!key) throw new Error(`propriedades internas do React ausentes em <${el.localName}>`);
  return (el as unknown as Record<string, unknown>)[key] as Record<string, unknown>;
}

type Compound = { readonly tag: string | null; readonly classes: readonly string[]; readonly attrs: readonly (readonly [string, string | null])[]; readonly not: readonly string[] };

function parseCompound(raw: string): Compound {
  const m = /^([a-z][a-z0-9]*)?((?:\.[a-z0-9_-]+)*)((?:\[[^\]]+\]|:not\(\[[^\]]+\]\))*)$/i.exec(raw);
  if (!m) throw new Error(`mini-dom: seletor não suportado: ${raw}`);
  const classes = (m[2] ?? "").split(".").filter(Boolean);
  const attrs: (readonly [string, string | null])[] = [];
  const not: string[] = [];
  for (const part of (m[3] ?? "").matchAll(/(:not\()?\[([a-z-]+)(?:=['"]?([^'"\]]*)['"]?)?\]\)?/gi)) {
    if (part[1]) not.push(part[2]);
    else attrs.push([part[2], part[3] ?? null]);
  }
  return { tag: m[1]?.toLowerCase() ?? null, classes, attrs, not };
}

function matchesCompound(el: MiniDomElement, c: Compound): boolean {
  if (c.tag && el.localName !== c.tag) return false;
  for (const cls of c.classes) if (!hasClass(el, cls)) return false;
  for (const [name, value] of c.attrs) if (!el.hasAttribute(name) || (value !== null && el.getAttribute(name) !== value)) return false;
  for (const name of c.not) if (el.hasAttribute(name)) return false;
  return true;
}

function matches(el: MiniDomElement, selector: string, scope?: MiniDomNode): boolean {
  return selector.split(",").some((alternative) => {
    const parts = alternative.trim().split(/\s+/).map(parseCompound);
    if (!matchesCompound(el, parts[parts.length - 1])) return false;
    let node: MiniDomNode | null = el.parentNode;
    for (let i = parts.length - 2; i >= 0; i -= 1) {
      while (node && node !== scope && !(node instanceof MiniDomElement && matchesCompound(node, parts[i]))) node = node.parentNode;
      if (!node || node === scope) return false;
      node = node.parentNode;
    }
    return true;
  });
}
