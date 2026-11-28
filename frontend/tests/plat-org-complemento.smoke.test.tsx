import assert from "node:assert/strict";
import test, { after } from "node:test";

import { elements, installMiniDom, propsOf, text, type MiniDomElement } from "./helpers/mini-dom";

process.env.VITE_USE_MOCKS = "false";
const dom = installMiniDom();

const React = await import("react");
const { createRoot } = await import("react-dom/client");
const { OrganizationSetupDialog } = await import("../src/modules/platform/components/OrganizationSetupDialog");
const { OrganizationDetailPanelView } = await import("../src/modules/platform/components/OrganizationDetailPanel");
const { NewOrganizationResultView } = await import("../src/modules/platform/components/NewOrganizationDialog");
const { MemoryRouter } = await import("react-router-dom");
const { setStoredAuthSession } = await import("../src/modules/auth/auth.storage");
const { mockSession } = await import("../src/mocks/auth/context");
const { DETAIL_A, ORGANIZATION_A } = await import("./helpers/plat-org.fixture");

type ActFn = (callback: () => Promise<void> | void) => Promise<void>;
const act = (React as unknown as { act: ActFn }).act;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const settle = async () => {
  for (let step = 0; step < 8; step += 1) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
};

const PROFILE_INPUT = {
  legalName: "Empresa Teste Ltda",
  document: "00000000000191",
  email: "cobranca@example.invalid",
  address: { postalCode: "01001000", street: "Rua A", number: "1", district: "Centro", city: "São Paulo", cityIbge: "3550308", state: "SP" },
  paymentMethod: "undefined",
} as const;

const PROFILE = {
  ...PROFILE_INPUT,
  complete: true,
  missing: [],
} as const;

const PLAN = { id: "plan-starter", code: "starter", name: "Plano Regional Teste", active: true, currentVersion: { version: 1, validFrom: "2026-01-01" } } as const;

let cleanup: (() => Promise<void>) | null = null;
after(async () => {
  if (cleanup) await cleanup();
});

function json(status: number, data: unknown) {
  return new Response(JSON.stringify(status >= 400 ? { error: data } : { data }), { status, headers: { "content-type": "application/json" } });
}

type MountOptions = {
  readonly item?: "plan" | "profile";
  readonly permissions?: readonly string[];
  readonly onChanged?: () => void | Promise<void>;
};

async function mountDialog(fetchImpl: typeof fetch, options: MountOptions = {}) {
  if (cleanup) await cleanup();
  const permissions = options.permissions ?? ["platform:billing:read", "platform:billing:manage"];
  setStoredAuthSession({ ...mockSession, user: { ...mockSession.user, roles: ["Super Admin"], permissions: ["platform:tenants:read", ...permissions] } });
  globalThis.fetch = fetchImpl;
  const container = dom.doc.createElement("div");
  dom.doc.body.appendChild(container);
  const root = createRoot(container as unknown as Element);
  await act(async () => {
    root.render(React.createElement(OrganizationSetupDialog as never, { organization: ORGANIZATION_A, onClose: () => undefined, permissions, onChanged: options.onChanged ?? (() => undefined), ...(options.item ? { item: options.item } : {}) }));
  });
  await settle();
  const unmount = async () => {
    cleanup = null;
    await act(async () => root.unmount());
    container.parentNode?.removeChild(container);
  };
  cleanup = unmount;
  return { container, root, unmount };
}

function button(container: MiniDomElement, label: string) {
  return elements(container, (element) => element.localName === "button").find((element) => text(element).includes(label));
}

function control(container: MiniDomElement, label: string, tag: "input" | "select" = "input") {
  const field = elements(container, (element) => element.localName === "label" && text(element).includes(label))[0];
  return field ? elements(field, (element) => element.localName === tag)[0] as MiniDomElement | undefined : undefined;
}

async function change(element: MiniDomElement, value: string) {
  await act(async () => {
    (propsOf(element).onChange as (event: unknown) => void)({ currentTarget: { value }, target: { value } });
  });
  await settle();
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

test("DT1 a vigência usa o dia de São Paulo", async () => {
  const RealDate = globalThis.Date;
  const cases = [
    ["2026-11-27T23:59:59Z", "2026-11-27"],
    ["2026-11-28T01:30:00Z", "2026-11-27"],
    ["2026-11-28T02:59:59Z", "2026-11-27"],
    ["2026-11-28T03:00:00Z", "2026-11-28"],
  ] as const;
  try {
    for (const [instant, expected] of cases) {
      const fixed = new RealDate(instant).getTime();
      class FixedDate extends RealDate {
        constructor(value?: string | number | Date) {
          super(value === undefined ? fixed : value instanceof RealDate ? value.getTime() : value);
        }
        static override now() { return fixed; }
      }
      globalThis.Date = FixedDate as DateConstructor;
      let validFrom: string | null = null;
      const page = await mountDialog((async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const method = init?.method ?? "GET";
        if (method === "GET" && url.endsWith("/platform/billing/plans")) return json(200, [PLAN]);
        if (method === "GET" && url.endsWith("/billing-profile")) return json(200, PROFILE);
        if (method === "GET" && url.endsWith("/subscription")) return json(200, null);
        if (method === "PUT" && url.endsWith("/subscription")) {
          validFrom = JSON.parse(String(init?.body)).validFrom as string;
          return json(200, {});
        }
        return json(599, { code: "sem_fixture", reason: "sem_fixture", message: "sem fixture" });
      }) as typeof fetch, { item: "plan" });
      const select = elements(page.container, (element) => element.localName === "select")[0] as MiniDomElement;
      assert.ok(select, "seletor de planos");
      await act(async () => {
        (propsOf(select).onChange as (event: unknown) => void)({ currentTarget: { value: PLAN.code }, target: { value: PLAN.code } });
      });
      await settle();
      const button = elements(page.container, (element) => element.localName === "button").find((element) => /plano/i.test(text(element)));
      assert.ok(button, "botão do plano");
      await act(async () => button.click());
      await settle();
      console.log(`MEDIDA DT1 instante=${instant} validFrom=${validFrom}`);
      assert.equal(validFrom, expected, instant);
      await page.unmount();
    }
  } finally {
    globalThis.Date = RealDate;
  }
});

test("PF1 leitura falha não deixa salvar", async () => {
  let puts = 0;
  const page = await mountDialog((async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input); const method = init?.method ?? "GET";
    if (url.endsWith("/billing-profile") && method === "GET") return json(500, { code: "profile_unavailable" });
    if (url.endsWith("/billing-profile") && method === "PUT") { puts += 1; return json(200, PROFILE); }
    return json(599, { code: "sem_fixture" });
  }) as typeof fetch, { item: "profile" });
  const save = button(page.container, "Salvar dados da empresa");
  assert.equal(save, undefined);
  assert.match(text(page.container), /Nada pode ser salvo sem essa leitura/);
  assert.equal(puts, 0);
});

test("PF2 leitura pendente não deixa salvar e depois preenche os 11 campos", async () => {
  const pending = deferred<Response>();
  let puts = 0;
  const page = await mountDialog((async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input); const method = init?.method ?? "GET";
    if (url.endsWith("/billing-profile") && method === "GET") return pending.promise;
    if (url.endsWith("/billing-profile") && method === "PUT") { puts += 1; return json(200, PROFILE); }
    return json(599, { code: "sem_fixture" });
  }) as typeof fetch, { item: "profile" });
  const save = button(page.container, "Salvar dados da empresa");
  assert.equal(save, undefined);
  assert.equal(puts, 0);
  pending.resolve(json(200, PROFILE));
  await settle();
  assert.equal(elements(page.container, (element) => element.localName === "input" || element.localName === "select").length, 11);
  assert.equal(propsOf(button(page.container, "Salvar dados da empresa")!).disabled, false);
  assert.equal(String(propsOf(control(page.container, "Razão social")!).value), PROFILE.legalName);
});

test("PF3 o PUT leva o perfil lido inteiro e só troca a razão social", async () => {
  let body: unknown = null;
  const page = await mountDialog((async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input); const method = init?.method ?? "GET";
    if (url.endsWith("/billing-profile") && method === "GET") return json(200, PROFILE);
    if (url.endsWith("/billing-profile") && method === "PUT") {
      body = JSON.parse(String(init?.body));
      return json(200, { ...PROFILE, legalName: "Empresa Editada Ltda" });
    }
    return json(599, { code: "sem_fixture" });
  }) as typeof fetch, { item: "profile" });
  await change(control(page.container, "Razão social")!, "Empresa Editada Ltda");
  await act(async () => button(page.container, "Salvar dados da empresa")!.click());
  await settle();
  assert.deepEqual(body, { ...PROFILE_INPUT, legalName: "Empresa Editada Ltda" });
});

test("PF4 sem a leitura permitida não há escrita", async () => {
  let puts = 0;
  let gets = 0;
  const page = await mountDialog((async (_input: RequestInfo | URL, init?: RequestInit) => {
    if ((init?.method ?? "GET") === "GET") { gets += 1; return json(403, { code: "forbidden" }); }
    puts += 1;
    return json(200, PROFILE);
  }) as typeof fetch, { item: "profile", permissions: ["platform:billing:manage"] });
  const save = button(page.container, "Salvar dados da empresa");
  assert.equal(save, undefined);
  assert.match(text(page.container), /não consulta os dados de cobrança/);
  assert.equal(gets, 0);
  assert.equal(puts, 0);
});

test("PF5 salvos não é concluídos quando ainda faltam campos", async () => {
  const incomplete = { ...PROFILE, complete: false, missing: ["email"], email: null };
  const page = await mountDialog((async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input); const method = init?.method ?? "GET";
    if (url.endsWith("/billing-profile") && method === "GET") return json(200, incomplete);
    if (url.endsWith("/billing-profile") && method === "PUT") return json(200, incomplete);
    return json(599, { code: "sem_fixture" });
  }) as typeof fetch, { item: "profile" });
  await act(async () => button(page.container, "Salvar dados da empresa")!.click());
  await settle();
  assert.match(text(page.container), /Dados da empresa salvos\. Ainda faltam campos/);
  assert.doesNotMatch(text(page.container), /concluídos/i);
});

test("PF6 resposta velha da organização A não entra na organização B", async () => {
  const slowA = deferred<Response>();
  const organizationB = { ...ORGANIZATION_A, id: "org-b", name: "Organização B" };
  const profileB = { ...PROFILE, legalName: "Empresa B Ltda" };
  const fetchImpl = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes(`/${ORGANIZATION_A.id}/billing-profile`)) return slowA.promise;
    if (url.includes(`/${organizationB.id}/billing-profile`)) return json(200, profileB);
    return json(599, { code: "sem_fixture" });
  }) as typeof fetch;
  const page = await mountDialog(fetchImpl, { item: "profile" });
  await act(async () => page.root.render(React.createElement(OrganizationSetupDialog as never, {
    organization: organizationB,
    item: "profile",
    permissions: ["platform:billing:read", "platform:billing:manage"],
    onClose: () => undefined,
    onChanged: () => undefined,
  })));
  await settle();
  slowA.resolve(json(200, PROFILE));
  await settle();
  assert.equal(String(propsOf(control(page.container, "Razão social")!).value), profileB.legalName);
  assert.match(text(page.container), /Organização B/);
});

test("PF7 recusa não apaga o que a pessoa digitou", async () => {
  let gets = 0;
  let puts = 0;
  const page = await mountDialog((async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input); const method = init?.method ?? "GET";
    if (url.endsWith("/billing-profile") && method === "GET") { gets += 1; return json(200, PROFILE); }
    if (url.endsWith("/billing-profile") && method === "PUT") { puts += 1; return json(422, { code: "invalid_profile", reason: "invalid_profile", message: "x" }); }
    if (url.endsWith("/platform/billing/plans")) return json(200, []);
    return json(599, { code: "sem_fixture" });
  }) as typeof fetch, { item: "profile" });
  const legalName = control(page.container, "Razão social");
  assert.ok(legalName);
  await change(legalName, "Empresa Editada Ltda");
  const save = button(page.container, "Salvar dados da empresa");
  assert.ok(save);
  await act(async () => save.click()); await settle();
  console.log(`MEDIDA PF7 gets=${gets} puts=${puts} valor=${String(propsOf(legalName).value)} texto=${text(page.container)}`);
  assert.match(text(page.container), /Não foi possível salvar os dados da empresa\. Nada foi alterado\./);
  assert.equal(String(propsOf(control(page.container, "Razão social")!).value), "Empresa Editada Ltda");
  assert.equal(gets, 1);
});

test("PF8 sem confirmação, a tela relê", async () => {
  for (const failure of ["500", "network"] as const) {
    let gets = 0;
    const reload = deferred<Response>();
    const page = await mountDialog((async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input); const method = init?.method ?? "GET";
      if (url.endsWith("/billing-profile") && method === "GET") { gets += 1; return gets === 1 ? json(200, PROFILE) : reload.promise; }
      if (url.endsWith("/billing-profile") && method === "PUT") {
        if (failure === "network") throw new TypeError("Failed to fetch");
        return json(500, { code: "internal_error", reason: "internal_error", message: "x" });
      }
      if (url.endsWith("/platform/billing/plans")) return json(200, []);
      return json(599, { code: "sem_fixture" });
    }) as typeof fetch, { item: "profile" });
    const save = button(page.container, "Salvar dados da empresa"); assert.ok(save);
    await act(async () => save.click()); await settle();
    console.log(`MEDIDA PF8 ${failure} gets=${gets} texto=${text(page.container)}`);
    assert.equal(gets, 2, `${failure}: uma releitura`);
    assert.equal(control(page.container, "Razão social"), undefined, `${failure}: sem campo enquanto relê`);
    assert.equal(button(page.container, "Salvar dados da empresa"), undefined, `${failure}: sem botão enquanto relê`);
    reload.resolve(json(200, { ...PROFILE, legalName: `Relido ${failure}` }));
    await settle();
    assert.equal(String(propsOf(control(page.container, "Razão social")!).value), `Relido ${failure}`);
  }
});

test("PF9 Tentar novamente refaz a leitura", async () => {
  let gets = 0;
  const page = await mountDialog((async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith("/billing-profile")) { gets += 1; return gets === 1 ? json(500, { code: "x" }) : json(200, PROFILE); }
    if (url.endsWith("/platform/billing/plans")) return json(200, []);
    return json(599, { code: "sem_fixture" });
  }) as typeof fetch, { item: "profile" });
  const retry = button(page.container, "Tentar novamente");
  console.log(`MEDIDA PF9 retry=${Boolean(retry)} gets=${gets}`);
  assert.ok(retry);
  await act(async () => retry.click()); await settle();
  assert.equal(gets, 2);
  assert.equal(elements(page.container, (element) => element.localName === "input").length, 10);
  assert.ok(button(page.container, "Salvar dados da empresa"));
});

test("PF10 depois de salvar, a organização é relida", async () => {
  let changed = 0;
  const page = await mountDialog((async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input); const method = init?.method ?? "GET";
    if (url.endsWith("/billing-profile") && method === "GET") return json(200, PROFILE);
    if (url.endsWith("/billing-profile") && method === "PUT") return json(200, PROFILE);
    if (url.endsWith("/platform/billing/plans")) return json(200, []);
    return json(599, { code: "sem_fixture" });
  }) as typeof fetch, { item: "profile", onChanged: () => { changed += 1; } });
  await act(async () => button(page.container, "Salvar dados da empresa")!.click()); await settle();
  console.log(`MEDIDA PF10 onChanged=${changed}`);
  assert.equal(changed, 1);
});

test("PF11 dois cliques em salvar, um PUT", async () => {
  let puts = 0;
  const pending = deferred<Response>();
  const page = await mountDialog((async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input); const method = init?.method ?? "GET";
    if (url.endsWith("/billing-profile") && method === "GET") return json(200, PROFILE);
    if (url.endsWith("/billing-profile") && method === "PUT") { puts += 1; return pending.promise; }
    if (url.endsWith("/platform/billing/plans")) return json(200, []);
    return json(599, { code: "sem_fixture" });
  }) as typeof fetch, { item: "profile" });
  await act(async () => { const save = button(page.container, "Salvar dados da empresa")!; save.click(); save.click(); });
  await settle();
  console.log(`MEDIDA PF11 puts=${puts}`);
  assert.equal(puts, 1);
  pending.resolve(json(200, PROFILE));
  await settle();
});

test("PF12 durante o envio, o salvar fica desligado e o clique forçado não envia", async () => {
  let puts = 0;
  const pending = deferred<Response>();
  const page = await mountDialog((async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input); const method = init?.method ?? "GET";
    if (url.endsWith("/billing-profile") && method === "GET") return json(200, PROFILE);
    if (url.endsWith("/billing-profile") && method === "PUT") { puts += 1; return pending.promise; }
    if (url.endsWith("/platform/billing/plans")) return json(200, []);
    return json(599, { code: "sem_fixture" });
  }) as typeof fetch, { item: "profile" });
  await act(async () => button(page.container, "Salvar dados da empresa")!.click()); await settle();
  const save = button(page.container, "Salvar dados da empresa")!;
  const disabled = propsOf(save).disabled;
  await act(async () => save.click()); await settle();
  console.log(`MEDIDA PF12 disabled=${String(disabled)} puts=${puts}`);
  assert.equal(disabled, true);
  assert.equal(puts, 1);
  pending.resolve(json(200, PROFILE));
  await settle();
});

test("PF13 depois da recusa, salvar de novo envia", async () => {
  for (const first of [422, 500] as const) {
    let gets = 0; let puts = 0;
    const page = await mountDialog((async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input); const method = init?.method ?? "GET";
      if (url.endsWith("/billing-profile") && method === "GET") { gets += 1; return json(200, PROFILE); }
      if (url.endsWith("/billing-profile") && method === "PUT") { puts += 1; return puts === 1 ? json(first, { code: "x", reason: "x", message: "x" }) : json(200, PROFILE); }
      if (url.endsWith("/platform/billing/plans")) return json(200, []);
      return json(599, { code: "sem_fixture" });
    }) as typeof fetch, { item: "profile" });
    await act(async () => button(page.container, "Salvar dados da empresa")!.click()); await settle();
    await act(async () => button(page.container, "Salvar dados da empresa")!.click()); await settle();
    console.log(`MEDIDA PF13 first=${first} gets=${gets} puts=${puts} texto=${text(page.container)}`);
    assert.equal(puts, 2);
    assert.match(text(page.container), /Dados da empresa salvos\./);
  }
});

test("PL1 quem já tem plano e só precisa de perfil não vê troca", async () => {
  if (cleanup) await cleanup();
  const organization = { ...ORGANIZATION_A, setup: { complete: false, missing: ["profile"] as const } };
  const container = dom.doc.createElement("div");
  dom.doc.body.appendChild(container);
  const root = createRoot(container as unknown as Element);
  await act(async () => root.render(React.createElement(MemoryRouter, null,
    React.createElement(OrganizationDetailPanelView, {
      organization,
      data: { detail: DETAIL_A, source: "api", forbidden: false, notFound: false },
      permissions: ["platform:billing:read", "platform:billing:manage"],
    }),
  )));
  await settle();
  assert.ok(button(container, "Preencher"));
  assert.equal(button(container, "Escolher plano"), undefined);
  assert.doesNotMatch(text(container), /Ligar o plano/);
  cleanup = async () => {
    cleanup = null;
    await act(async () => root.unmount());
    container.parentNode?.removeChild(container);
  };
});

test("PL2 a assinatura existente nunca recebe PUT", async () => {
  let puts = 0;
  const page = await mountDialog((async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input); const method = init?.method ?? "GET";
    if (url.endsWith("/subscription") && method === "GET") return json(200, { planCode: "starter" });
    if (url.endsWith("/subscription") && method === "PUT") { puts += 1; return json(200, {}); }
    return json(599, { code: "sem_fixture" });
  }) as typeof fetch, { item: "plan" });
  assert.match(text(page.container), /já tem plano contratado/);
  assert.equal(button(page.container, "Ligar o plano"), undefined);
  assert.equal(puts, 0);
});

test("PL3 a reconsulta do clique vence e impede o PUT", async () => {
  let gets = 0;
  let puts = 0;
  const page = await mountDialog((async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input); const method = init?.method ?? "GET";
    if (url.endsWith("/subscription") && method === "GET") { gets += 1; return json(200, gets === 1 ? null : { planCode: "starter" }); }
    if (url.endsWith("/platform/billing/plans")) return json(200, [PLAN]);
    if (url.endsWith("/subscription") && method === "PUT") { puts += 1; return json(200, {}); }
    return json(599, { code: "sem_fixture" });
  }) as typeof fetch, { item: "plan" });
  await change(elements(page.container, (element) => element.localName === "select")[0] as MiniDomElement, PLAN.code);
  await act(async () => button(page.container, "Ligar o plano")!.click());
  await settle();
  assert.equal(gets, 2);
  assert.equal(puts, 0);
  assert.match(text(page.container), /já tem plano contratado/);
});

test("PL4 leitura falha fecha sem PUT", async () => {
  for (const scenario of ["500", "403", "sem-leitura"] as const) {
    let puts = 0;
    const permissions = scenario === "sem-leitura" ? ["platform:billing:manage"] : ["platform:billing:read", "platform:billing:manage"];
    const page = await mountDialog((async (input: RequestInfo | URL, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      if (method === "GET") return json(scenario === "403" ? 403 : 500, { code: "subscription_unavailable" });
      if (String(input).endsWith("/subscription")) { puts += 1; return json(200, {}); }
      return json(599, { code: "sem_fixture" });
    }) as typeof fetch, { item: "plan", permissions });
    assert.equal(button(page.container, "Ligar o plano"), undefined, scenario);
    assert.match(text(page.container), /Nada pode ser alterado sem essa leitura/);
    assert.equal(puts, 0, scenario);
    await page.unmount();
  }
});

test("PL5 o corpo do plano é fechado e a organização é relida", async () => {
  let subscriptionGets = 0;
  let body: Record<string, unknown> | null = null;
  let changed = 0;
  const page = await mountDialog((async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input); const method = init?.method ?? "GET";
    if (url.endsWith("/subscription") && method === "GET") { subscriptionGets += 1; return json(200, null); }
    if (url.endsWith("/platform/billing/plans")) return json(200, [PLAN]);
    if (url.endsWith("/subscription") && method === "PUT") { body = JSON.parse(String(init?.body)); return json(200, {}); }
    return json(599, { code: "sem_fixture" });
  }) as typeof fetch, { item: "plan", onChanged: () => { changed += 1; } });
  await change(elements(page.container, (element) => element.localName === "select")[0] as MiniDomElement, PLAN.code);
  await act(async () => button(page.container, "Ligar o plano")!.click());
  await settle();
  assert.equal(subscriptionGets, 2);
  assert.deepEqual(Object.keys(body ?? {}).sort(), ["planCode", "validFrom"]);
  assert.equal((body ?? {}).planCode, PLAN.code);
  assert.equal(changed, 1);
});

test("PL6 a corrida perdida não mente", async () => {
  for (const afterRefusal of ["present", "absent"] as const) {
    let gets = 0;
    const page = await mountDialog((async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input); const method = init?.method ?? "GET";
      if (url.endsWith("/subscription") && method === "GET") {
        gets += 1;
        return json(200, gets < 3 || afterRefusal === "absent" ? null : { planCode: "starter" });
      }
      if (url.endsWith("/platform/billing/plans")) return json(200, [PLAN]);
      if (url.endsWith("/subscription") && method === "PUT") return json(422, { code: "invalid_subscription", reason: "subscription_retroactive" });
      return json(599, { code: "sem_fixture" });
    }) as typeof fetch, { item: "plan" });
    await change(elements(page.container, (element) => element.localName === "select")[0] as MiniDomElement, PLAN.code);
    await act(async () => button(page.container, "Ligar o plano")!.click());
    await settle();
    if (afterRefusal === "present") assert.match(text(page.container), /já tem plano contratado/);
    else assert.match(text(page.container), /data deste computador não bate com a do servidor\. Nada foi alterado/);
    assert.doesNotMatch(text(page.container), /Não foi possível concluir esta etapa/);
    await page.unmount();
  }
});

test("PL7 sem confirmação, o plano não se dá por ligado", async () => {
  let gets = 0; let puts = 0;
  const reload = deferred<Response>();
  const page = await mountDialog((async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input); const method = init?.method ?? "GET";
    if (url.endsWith("/subscription") && method === "GET") { gets += 1; if (gets === 1) return json(200, null); if (gets === 2) return json(200, null); return reload.promise; }
    if (url.endsWith("/subscription") && method === "PUT") { puts += 1; return json(500, { code: "x" }); }
    if (url.endsWith("/platform/billing/plans")) return json(200, [PLAN]);
    if (url.endsWith("/billing-profile")) return json(200, PROFILE);
    return json(599, { code: "sem_fixture" });
  }) as typeof fetch, { item: "plan" });
  await change(elements(page.container, (element) => element.localName === "select")[0] as MiniDomElement, PLAN.code);
  await act(async () => button(page.container, "plano")!.click()); await settle();
  console.log(`MEDIDA PL7 gets=${gets} puts=${puts} texto=${text(page.container)}`);
  assert.equal(puts, 1);
  assert.equal(gets, 3, "abertura, clique e releitura após 5xx");
  assert.match(text(page.container), /Não foi possível confirmar se o plano foi ligado/);
  assert.equal(elements(page.container, (element) => element.localName === "select").length, 0);
  reload.resolve(json(200, null)); await settle();
});

test("PL8 durante o envio, o botão fica desligado e o clique forçado não envia", async () => {
  let gets = 0; let puts = 0;
  const clickGet = deferred<Response>();
  const page = await mountDialog((async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input); const method = init?.method ?? "GET";
    if (url.endsWith("/subscription") && method === "GET") { gets += 1; return gets === 1 ? json(200, null) : clickGet.promise; }
    if (url.endsWith("/subscription") && method === "PUT") { puts += 1; return json(200, {}); }
    if (url.endsWith("/platform/billing/plans")) return json(200, [PLAN]);
    if (url.endsWith("/billing-profile")) return json(200, PROFILE);
    return json(599, { code: "sem_fixture" });
  }) as typeof fetch, { item: "plan" });
  await change(elements(page.container, (element) => element.localName === "select")[0] as MiniDomElement, PLAN.code);
  await act(async () => button(page.container, "plano")!.click()); await settle();
  const link = button(page.container, "plano")!; const disabled = propsOf(link).disabled;
  await act(async () => link.click()); await settle();
  console.log(`MEDIDA PL8 disabled=${String(disabled)} gets=${gets} puts=${puts}`);
  assert.equal(disabled, true); assert.equal(gets, 2); assert.equal(puts, 0);
  clickGet.resolve(json(200, null)); await settle();
  assert.equal(puts, 1);
});

test("PL9 o resultado da criação lista o que falta pela mesma peça", async () => {
  if (cleanup) await cleanup();
  let gets = 0; let posts = 0;
  const read = deferred<Response>();
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input); const method = init?.method ?? "GET";
    if (method === "GET" && url.endsWith(`/platform/tenants/${ORGANIZATION_A.id}`)) { gets += 1; return read.promise; }
    if (method === "POST") posts += 1;
    return json(599, { code: "sem_fixture" });
  }) as typeof fetch;
  const result = {
    organization: ORGANIZATION_A,
    provisioning: { group: { status: "done" }, profile: { status: "failed" }, subscription: { status: "skipped" }, admin: { status: "skipped" } },
  } as const;
  const container = dom.doc.createElement("div"); dom.doc.body.appendChild(container);
  const root = createRoot(container as unknown as Element);
  await act(async () => root.render(React.createElement(NewOrganizationResultView as never, { result, onClose: () => undefined, permissions: ["platform:billing:read", "platform:billing:manage", "platform:users:create_admin"] })));
  await settle();
  const before = elements(container, (element) => element.localName === "button").map((element) => text(element));
  console.log(`MEDIDA PL9 antes gets=${gets} buttons=${JSON.stringify(before)} posts=${posts}`);
  assert.equal(gets, 1);
  assert.deepEqual(before.filter((label) => ["Escolher plano", "Preencher", "Criar administrador"].includes(label)), []);
  read.resolve(json(200, ORGANIZATION_A));
  await settle();
  const after = elements(container, (element) => element.localName === "button").map((element) => text(element));
  assert.deepEqual(after.filter((label) => ["Escolher plano", "Preencher", "Criar administrador"].includes(label)).sort(), ["Criar administrador", "Escolher plano", "Preencher"]);
  assert.equal(posts, 0, "o resultado nunca repete o POST da organização");
  cleanup = null;
  await act(async () => root.unmount()); container.parentNode?.removeChild(container);
});

test("PL10 dois cliques sem re-render, um envio", async () => {
  let gets = 0; let puts = 0;
  const clickGet = deferred<Response>();
  const page = await mountDialog((async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input); const method = init?.method ?? "GET";
    if (url.endsWith("/subscription") && method === "GET") { gets += 1; return gets === 1 ? json(200, null) : clickGet.promise; }
    if (url.endsWith("/subscription") && method === "PUT") { puts += 1; return json(200, {}); }
    if (url.endsWith("/platform/billing/plans")) return json(200, [PLAN]);
    if (url.endsWith("/billing-profile")) return json(200, PROFILE);
    return json(599, { code: "sem_fixture" });
  }) as typeof fetch, { item: "plan" });
  await change(elements(page.container, (element) => element.localName === "select")[0] as MiniDomElement, PLAN.code);
  await act(async () => { const link = button(page.container, "plano")!; link.click(); link.click(); }); await settle();
  console.log(`MEDIDA PL10 gets=${gets} puts=${puts}`);
  assert.equal(gets, 2);
  clickGet.resolve(json(200, null)); await settle();
  assert.equal(puts, 1);
});

test("PL11 depois de uma saída sem ligar, Ligar o plano envia de novo", async () => {
  for (const firstFailure of ["get", "put"] as const) {
    let gets = 0; let puts = 0;
    const page = await mountDialog((async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input); const method = init?.method ?? "GET";
      if (url.endsWith("/subscription") && method === "GET") {
        gets += 1;
        if (firstFailure === "get" && gets === 2) throw new TypeError("Failed to fetch");
        return json(200, null);
      }
      if (url.endsWith("/subscription") && method === "PUT") { puts += 1; return firstFailure === "put" && puts === 1 ? json(400, { code: "x" }) : json(200, {}); }
      if (url.endsWith("/platform/billing/plans")) return json(200, [PLAN]);
      if (url.endsWith("/billing-profile")) return json(200, PROFILE);
      return json(599, { code: "sem_fixture" });
    }) as typeof fetch, { item: "plan" });
    await change(elements(page.container, (element) => element.localName === "select")[0] as MiniDomElement, PLAN.code);
    await act(async () => button(page.container, "plano")!.click()); await settle();
    await act(async () => button(page.container, "plano")!.click()); await settle();
    console.log(`MEDIDA PL11 failure=${firstFailure} gets=${gets} puts=${puts} texto=${text(page.container)}`);
    assert.equal(puts, firstFailure === "get" ? 1 : 2);
  }
});
