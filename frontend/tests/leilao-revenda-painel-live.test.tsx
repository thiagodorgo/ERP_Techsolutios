import assert from "node:assert/strict";
import test, { after } from "node:test";

import type {
  AuctionAttempt,
  AuctionEdict,
  AuctionView as ServerAuctionView,
} from "../../src/modules/auction/auction.types";
import { toAuctionViewDto } from "../../src/modules/auction/auction.dto";
import {
  elements,
  installMiniDom,
  propsOf,
  text,
  type MiniDomElement,
  type MiniDomNode,
} from "./helpers/mini-dom";

process.env.VITE_USE_MOCKS = "false";
const dom = installMiniDom();
const React = await import("react");
const { createRoot } = await import("react-dom/client");
const { MemoryRouter } = await import("react-router-dom");
const { AuctionPanel } =
  await import("../src/modules/patios/auction/components/AuctionPanel");
const { auctionActionErrorMessage } =
  await import("../src/modules/patios/auction/auction.adapter");
const { AuthProvider } = await import("../src/providers/AuthProvider");
const { TenantProvider } = await import("../src/providers/TenantProvider");
const { PermissionProvider } =
  await import("../src/providers/PermissionProvider");
const { mockSessionForEmail } = await import("../src/mocks/auth/context");
const { setStoredSessionPermissions } =
  await import("./helpers/session-permissions");

const h = React.createElement;
type ActFn = (callback: () => Promise<void> | void) => Promise<void>;
const act = (React as unknown as { act: ActFn }).act;
const at = new Date("2026-11-24T12:00:00.000Z");
const permissions = [
  "impound:read",
  "impound:transition",
  "auction:appraise",
  "auction:reclaim",
];
const TENANT_ID = "org-revenda";
const consoleErrors: string[] = [];
const originalConsoleError = console.error;
console.error = (...args: unknown[]) =>
  consoleErrors.push(args.map(String).join(" "));

after(() => {
  console.error = originalConsoleError;
  assert.deepEqual(consoleErrors, []);
});

function edict(
  roundNumber: number,
  status: AuctionEdict["status"],
  values?: readonly [string, string],
): AuctionEdict {
  return {
    id: `ed-${roundNumber}`,
    tenantId: TENANT_ID,
    processId: "proc-1",
    roundNumber,
    classification: "CONSERVED",
    appraisalAmount: values?.[0],
    minBidAmount: values?.[1],
    edictReference: `ED-${roundNumber}`,
    publishedAt: at,
    businessDays: 15,
    status,
    createdAt: at,
    updatedAt: at,
  };
}

function attempt(
  roundNumber: number,
  outcome: AuctionAttempt["outcome"],
  defaultedSaleRound?: number,
): AuctionAttempt {
  return {
    id: `at-${roundNumber}-${outcome}`,
    tenantId: TENANT_ID,
    processId: "proc-1",
    roundNumber,
    outcome,
    defaultedSaleRound,
    createdAt: at,
    updatedAt: at,
  };
}

function view(input: Partial<ServerAuctionView> = {}): ServerAuctionView {
  return {
    attempts: [],
    edicts: [],
    strikeCount: 0,
    maxAttempts: 2,
    status: "LOTTED",
    resalePending: false,
    custodySeq: 9,
    ...input,
  };
}

function seed() {
  dom.storage.clear();
  setStoredSessionPermissions(
    mockSessionForEmail("gestor.web@techsolutions.example"),
    permissions,
  );
  dom.storage.set(
    "erp-techsolutions.active-context",
    JSON.stringify({
      tenantId: TENANT_ID,
      tenantName: "Organização",
      tenantStatus: "active",
      branchId: "fil-1",
      branchName: "Matriz",
      role: "Gestor Operacional",
      permissions,
      enabledModules: ["dashboard"],
      scope: "tenant",
    }),
  );
}

async function settle() {
  for (let i = 0; i < 6; i++) {
    await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
  }
}

async function mount(auction: ServerAuctionView) {
  seed();
  globalThis.fetch = (async () =>
    new Response(JSON.stringify(toAuctionViewDto(auction, true)), {
      status: 200,
      headers: { "content-type": "application/json" },
    })) as typeof fetch;
  const container = dom.doc.body.appendChild(dom.doc.createElement("div"));
  const root = createRoot(container as unknown as Element);
  const process = {
    id: "proc-1",
    vehiclePlate: "ABC1D23",
    vehicleUnidentified: false,
    yardId: "yard-1",
    profileId: "prof-1",
    status: auction.status,
    statusLabel: "Leilão",
    enteredAt: at.toISOString(),
    frozenAt: null,
    originAuthority: "Autoridade municipal",
    custodySeqHead: 9,
    createdAt: at.toISOString(),
    updatedAt: at.toISOString(),
    vehicleChassis: null,
    vehicleRenavam: null,
    vehicleBrand: "Fiat",
    vehicleModel: "Uno",
    vehicleColor: null,
    vehicleYear: null,
    unidentifiedReason: null,
    originAgentName: null,
    authorityCaseNumber: null,
    incidentReportNumber: null,
    legalBasis: null,
    serviceOrderId: null,
    custodyHashHead: null,
  };
  const panel = h(AuctionPanel, {
    process,
    context: { tenantId: TENANT_ID, branchId: "fil-1", permissions },
    onDone() {},
  });
  const tree = h(
    MemoryRouter,
    null,
    h(
      AuthProvider,
      null,
      h(TenantProvider, null, h(PermissionProvider, null, panel)),
    ),
  );
  await act(async () => root.render(tree));
  await settle();
  return {
    container,
    unmount: async () => {
      await act(async () => root.unmount());
      dom.doc.body.removeChild(container);
    },
  };
}

const visible = (container: MiniDomNode) => text(container);
const namedButton = (container: MiniDomNode, name: string) =>
  elements(
    container,
    (el) =>
      el.localName === "button" &&
      (el.getAttribute("aria-label") ?? text(el).trim()) === name,
  );
const inputs = (container: MiniDomNode) =>
  elements(container, (el) => el.localName === "input");
const selects = (container: MiniDomNode) =>
  elements(container, (el) => el.localName === "select");
const appraisalRound = (container: MiniDomNode) =>
  String(propsOf(inputs(container)[0]!).value);
const optionValues = (container: MiniDomNode) =>
  elements(container, (el) => el.localName === "option").map((el) =>
    String(propsOf(el).value),
  );
const clean = (container: MiniDomNode) => ({
  tenant: /\btenant\b/i.test(visible(container)),
  technical: /resale_|custody_seq/i.test(visible(container)),
});

test("T1 · revenda pendente mostra o rito de relote, não o arremate", async () => {
  const mounted = await mount(
    view({
      resalePending: true,
      edicts: [edict(1, "LOTTED", ["12000.00", "6000.00"])],
      attempts: [attempt(1, "SOLD"), attempt(2, "NO_PAYMENT", 1)],
    }),
  );
  try {
    assert.deepEqual(
      {
        aviso: visible(mounted.container).includes("O arrematante não pagou"),
        edital: namedButton(mounted.container, "Registrar edital").length,
        relote: namedButton(
          mounted.container,
          "Colocar em lote para novo leilão",
        ).length,
        arremate: namedButton(mounted.container, "Registrar arremate").length,
        reclaim: visible(mounted.container).includes(
          "Reclamado antes da venda",
        ),
        ...clean(mounted.container),
      },
      {
        aviso: true,
        edital: 1,
        relote: 1,
        arremate: 0,
        reclaim: true,
        tenant: false,
        technical: false,
      },
    );
  } finally {
    await mounted.unmount();
  }
});

test("T2 · nova rodada loteada oferece arremate na rodada 3", async () => {
  const mounted = await mount(
    view({
      edicts: [edict(1, "CLOSED"), edict(3, "LOTTED")],
      attempts: [attempt(1, "SOLD"), attempt(2, "NO_PAYMENT", 1)],
    }),
  );
  try {
    assert.deepEqual(
      {
        arremate: namedButton(mounted.container, "Registrar arremate").length,
        rodada: appraisalRound(mounted.container),
        aviso: visible(mounted.container).includes("O arrematante não pagou"),
        relote: namedButton(
          mounted.container,
          "Colocar em lote para novo leilão",
        ).length,
        ...clean(mounted.container),
      },
      {
        arremate: 1,
        rodada: "3",
        aviso: false,
        relote: 0,
        tenant: false,
        technical: false,
      },
    );
  } finally {
    await mounted.unmount();
  }
});

test("T3 · lote comum oferece arremate sem rito de revenda", async () => {
  const mounted = await mount(view({ edicts: [edict(1, "LOTTED")] }));
  try {
    assert.deepEqual(
      {
        arremate: namedButton(mounted.container, "Registrar arremate").length,
        aviso: visible(mounted.container).includes("O arrematante não pagou"),
        relote: namedButton(
          mounted.container,
          "Colocar em lote para novo leilão",
        ).length,
        ...clean(mounted.container),
      },
      { arremate: 1, aviso: false, relote: 0, tenant: false, technical: false },
    );
  } finally {
    await mounted.unmount();
  }
});

const rv24View = (extraEdicts: readonly AuctionEdict[] = []) =>
  view({
    resalePending: true,
    edicts: [
      edict(1, "DESIGNATED", ["12000.00", "6000.00"]),
      edict(2, "LOTTED", ["10000.00", "5000.00"]),
      ...extraEdicts,
    ],
    attempts: [
      attempt(1, "DESERTED"),
      attempt(2, "SOLD"),
      attempt(3, "NO_PAYMENT", 2),
    ],
  });

test("T4 · revenda sem edital novo usa a rodada 4 e exclui rodadas antigas", async () => {
  const mounted = await mount(rv24View());
  try {
    assert.deepEqual(
      {
        rodada: appraisalRound(mounted.container),
        opcoes: optionValues(mounted.container),
        ...clean(mounted.container),
      },
      { rodada: "4", opcoes: [], tenant: false, technical: false },
    );
  } finally {
    await mounted.unmount();
  }
});

test("T5 · revenda escolhe só entre as rodadas novas 4 e 5", async () => {
  const mounted = await mount(
    rv24View([edict(4, "DESIGNATED"), edict(5, "DESIGNATED")]),
  );
  try {
    assert.deepEqual(
      {
        rodada: appraisalRound(mounted.container),
        opcoes: optionValues(mounted.container),
        selecionada: String(propsOf(selects(mounted.container)[0]!).value),
        ...clean(mounted.container),
      },
      {
        rodada: "5",
        opcoes: ["4", "5"],
        selecionada: "5",
        tenant: false,
        technical: false,
      },
    );
  } finally {
    await mounted.unmount();
  }
});

test("T6 · razões de avaliação recebem textos específicos", () => {
  assert.deepEqual(
    [
      auctionActionErrorMessage("auction_edict_not_found", 404),
      auctionActionErrorMessage("appraisal_locked_after_lot", 409),
      auctionActionErrorMessage("appraisal_round_has_result", 409),
    ],
    [
      "Registre o edital desta rodada antes de informar a avaliação.",
      "A avaliação não pode ser alterada depois que a rodada foi colocada em lote.",
      "A avaliação não pode ser alterada depois que a rodada teve resultado.",
    ],
  );
});

test("T7 · após rodada deserta a avaliação abre na rodada 2", async () => {
  const mounted = await mount(
    view({
      status: "AUCTION_ELIGIBLE",
      strikeCount: 1,
      edicts: [edict(1, "DESIGNATED", ["12000.00", "6000.00"])],
      attempts: [attempt(1, "DESERTED")],
    }),
  );
  try {
    assert.deepEqual(
      {
        rodada: appraisalRound(mounted.container),
        registrada: visible(mounted.container).includes(
          "Avaliação registrada para esta rodada",
        ),
        botao: namedButton(mounted.container, "Registrar avaliação").length,
        ...clean(mounted.container),
      },
      {
        rodada: "2",
        registrada: false,
        botao: 1,
        tenant: false,
        technical: false,
      },
    );
  } finally {
    await mounted.unmount();
  }
});

test("T8 · escolher rodada deserta mostra encerramento e esconde registro", async () => {
  const mounted = await mount(
    view({
      status: "AUCTION_ELIGIBLE",
      strikeCount: 1,
      edicts: [
        edict(1, "DESIGNATED", ["12000.00", "6000.00"]),
        edict(2, "DESIGNATED", ["10000.00", "5000.00"]),
      ],
      attempts: [attempt(1, "DESERTED")],
    }),
  );
  try {
    const before = {
      rodada: appraisalRound(mounted.container),
      registrada: visible(mounted.container).includes(
        "Avaliação registrada para esta rodada",
      ),
    };
    const select = selects(mounted.container)[0]!;
    await act(async () =>
      (propsOf(select).onChange as (event: unknown) => void)({
        target: { value: "1" },
      }),
    );
    await settle();
    assert.deepEqual(
      {
        before,
        encerrada: visible(mounted.container).includes(
          "Avaliação encerrada nesta rodada",
        ),
        botao: namedButton(mounted.container, "Registrar avaliação").length,
        ...clean(mounted.container),
      },
      {
        before: { rodada: "2", registrada: true },
        encerrada: true,
        botao: 0,
        tenant: false,
        technical: false,
      },
    );
  } finally {
    await mounted.unmount();
  }
});

test("T9 · rodada avaliada sem resultado continua corrigível", async () => {
  const mounted = await mount(
    view({
      status: "AUCTION_ELIGIBLE",
      edicts: [edict(1, "DESIGNATED", ["12000.00", "6000.00"])],
    }),
  );
  try {
    assert.deepEqual(
      {
        rodada: appraisalRound(mounted.container),
        registrada: visible(mounted.container).includes(
          "Avaliação registrada para esta rodada",
        ),
        botao: namedButton(mounted.container, "Registrar avaliação").length,
        ...clean(mounted.container),
      },
      {
        rodada: "1",
        registrada: true,
        botao: 1,
        tenant: false,
        technical: false,
      },
    );
  } finally {
    await mounted.unmount();
  }
});

test("T10 · após resgate da revenda a avaliação abre na rodada 3", async () => {
  const mounted = await mount(
    view({
      status: "AUCTION_ELIGIBLE",
      edicts: [edict(1, "CLOSED", ["12000.00", "6000.00"])],
      attempts: [attempt(1, "SOLD"), attempt(2, "NO_PAYMENT", 1)],
    }),
  );
  try {
    assert.deepEqual(
      {
        rodada: appraisalRound(mounted.container),
        registrada: visible(mounted.container).includes(
          "Avaliação registrada para esta rodada",
        ),
        ...clean(mounted.container),
      },
      { rodada: "3", registrada: false, tenant: false, technical: false },
    );
  } finally {
    await mounted.unmount();
  }
});
