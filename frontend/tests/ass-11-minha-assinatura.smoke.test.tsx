import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import { OVER_LIMIT_NOTE } from "../src/components/charts";
import type { MySubscriptionViewModel } from "../src/modules/settings/subscription/components/my-subscription.shared";
import { MySubscriptionViewA } from "../src/modules/settings/subscription/components/MySubscriptionViewA";
import { MySubscriptionViewB } from "../src/modules/settings/subscription/components/MySubscriptionViewB";
import { MySubscriptionViewC } from "../src/modules/settings/subscription/components/MySubscriptionViewC";
import { buildMySubscriptionScreen } from "../src/modules/settings/subscription/my-subscription.state";
import type { MySubscription, MySubscriptionBlock, MySubscriptionPayment } from "../src/modules/settings/subscription/my-subscription.types";

// B-ASS-11 (F4, Emenda 1 §8.1 e Emenda 1.1 §5.1) — as 3 aparências renderizadas (`renderToString`) a partir do MESMO
// modelo, nos 15 estados da referência aprovada (o 2 com as duas variantes), e com cada bloco aberto um por vez:
//   T-S1 os mesmos textos de conteúdo nas 3;  T-S2 nenhuma palavra de dinheiro, módulo, veículo ou tendência, em toda a
//   tela (inclusive no detalhe);  T-S3a/T-S3b sem meio de pagamento (estados 5 e 2): nenhum rótulo de meio e "Copiar dados
//   da fatura";  T-S4 só o meio que veio, e todo link https em aba nova com noopener;  T-S5 o texto de cada estado;
//   T-S6 nenhum termo técnico;  T-S7 a medição antiga é 2 dias civis ou mais.

const ORG = "Guincho Exemplo Ltda";
const VENC_SET = "2026-10-11";
const VENC_OUT = "2026-11-11";
const NO_MEANS: Omit<MySubscriptionPayment, "dueDate"> = { payUrl: null, pixCopyPaste: null, boletoLine: null, boletoUrl: null };
const ALL_MEANS: Omit<MySubscriptionPayment, "dueDate"> = {
  payUrl: "https://pagamento.exemplo/fatura",
  pixCopyPaste: "pix-de-exemplo",
  boletoLine: "linha-de-exemplo",
  boletoUrl: "https://pagamento.exemplo/boleto",
};

function subscription(over: Partial<MySubscription> = {}): MySubscription {
  return {
    period: "2026-11",
    planName: "Plus",
    users: { used: 18, included: 20, overLimit: false },
    storageGb: { used: 42, included: 50, overLimit: false, measuredAt: "2026-11-13" },
    status: { inGoodStanding: true, overdueSince: null, nextDueDate: null },
    payment: null,
    ...over,
  };
}
const onTimeWith = (dueDate: string, means: Omit<MySubscriptionPayment, "dueDate">, measuredAt = "2026-11-13") =>
  subscription({ storageGb: { used: 42, included: 50, overLimit: false, measuredAt }, status: { inGoodStanding: true, overdueSince: null, nextDueDate: dueDate }, payment: { dueDate, ...means } });

type Fixture = {
  readonly id: string;
  readonly kind: MySubscriptionViewModel["state"];
  readonly today?: string;
  readonly data?: MySubscription;
  readonly stale?: boolean;
};

const FIXTURES: readonly Fixture[] = [
  { id: "1", kind: "ready", today: "2026-11-14", data: subscription() },
  { id: "2a", kind: "ready", today: "2026-11-06", data: onTimeWith(VENC_OUT, NO_MEANS, "2026-11-05") },
  { id: "2b", kind: "ready", today: "2026-11-14", data: onTimeWith(VENC_OUT, NO_MEANS) },
  { id: "3", kind: "ready", today: "2026-11-06", data: onTimeWith(VENC_OUT, ALL_MEANS, "2026-11-05") },
  { id: "4", kind: "ready", today: "2026-11-14", data: subscription({ status: { inGoodStanding: false, overdueSince: VENC_SET, nextDueDate: VENC_SET }, payment: { dueDate: VENC_SET, ...ALL_MEANS } }) },
  { id: "5", kind: "ready", today: "2026-11-14", data: subscription({ status: { inGoodStanding: false, overdueSince: VENC_SET, nextDueDate: VENC_SET }, payment: { dueDate: VENC_SET, ...NO_MEANS } }) },
  { id: "6", kind: "ready", today: "2026-11-14", data: subscription({ status: { inGoodStanding: false, overdueSince: null, nextDueDate: VENC_OUT }, payment: { dueDate: VENC_OUT, ...NO_MEANS } }) },
  { id: "7", kind: "ready", today: "2026-11-14", data: subscription({ status: { inGoodStanding: false, overdueSince: VENC_SET, nextDueDate: null } }) },
  {
    id: "8",
    kind: "ready",
    today: "2026-11-14",
    data: subscription({ users: { used: 23, included: 20, overLimit: true }, storageGb: { used: 57, included: 50, overLimit: true, measuredAt: "2026-11-13" } }),
  },
  { id: "9", kind: "ready", today: "2026-11-01", data: subscription({ storageGb: { used: 0, included: 50, overLimit: false, measuredAt: null } }) },
  { id: "10", kind: "ready", today: "2026-11-14", data: subscription({ storageGb: { used: 42, included: 50, overLimit: false, measuredAt: "2026-11-11" } }) },
  { id: "11", kind: "loading" },
  { id: "12", kind: "error" },
  { id: "13", kind: "forbidden" },
  { id: "14", kind: "none" },
  { id: "15", kind: "ready", today: "2026-11-14", data: subscription(), stale: true },
];
const byId = (id: string) => FIXTURES.find((fixture) => fixture.id === id)!;

function modelOf(fixture: Fixture, open: MySubscriptionBlock | null = null): MySubscriptionViewModel {
  const noop = () => undefined;
  return {
    state: fixture.kind,
    screen: fixture.data ? buildMySubscriptionScreen(fixture.data, fixture.today ?? "2026-11-14", ORG) : null,
    organizationName: ORG,
    stale: fixture.stale ?? false,
    lastUpdatedAt: "09:40",
    refreshing: false,
    open,
    onToggle: noop,
    onOpen: noop,
    onClose: noop,
    onRetry: noop,
    canSeeUsers: true,
    copy: null,
    onCopy: noop,
  };
}

const VIEWS = { A: MySubscriptionViewA, B: MySubscriptionViewB, C: MySubscriptionViewC } as const;
type Letter = keyof typeof VIEWS;
const LETTERS: readonly Letter[] = ["A", "B", "C"];

function html(letter: Letter, model: MySubscriptionViewModel): string {
  const View = VIEWS[letter];
  return renderToString(
    <MemoryRouter>
      <View {...model} />
    </MemoryRouter>,
  ).replace(/<!-- -->/g, "");
}

/** O texto que a pessoa lê (tags fora, espaços normalizados). */
function visible(markup: string): string {
  return markup
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** Os blocos que cada estado oferece (o detalhe também é tela). */
function blocksOf(fixture: Fixture): MySubscriptionBlock[] {
  if (!fixture.data) return [];
  return ["plano", "usuarios", "espaco", "situacao", ...(fixture.data.payment ? (["pagar"] as const) : [])];
}

/** Toda renderização de um estado numa vista: fechada e com cada bloco aberto, um por vez. */
function allRenders(letter: Letter, fixture: Fixture): { label: string; markup: string }[] {
  return [null, ...blocksOf(fixture)].map((open) => ({ label: `estado ${fixture.id} · ${letter} · ${open ?? "fechado"}`, markup: html(letter, modelOf(fixture, open)) }));
}

test("T-S1 as 3 aparências trazem os mesmos textos de conteúdo (plano, as duas legendas, a situação)", () => {
  for (const fixture of FIXTURES.filter((item) => item.data)) {
    const screen = modelOf(fixture).screen!;
    const users = `${screen.users.used} de ${screen.users.included} usuários`;
    const storage = screen.storage.pending ? `— de ${screen.storage.included} GB` : `${screen.storage.used} de ${screen.storage.included} GB`;
    for (const letter of LETTERS) {
      const text = visible(html(letter, modelOf(fixture)));
      for (const expected of [screen.planName ?? "—", users, storage, screen.overdue ? "Em atraso" : "Em dia"]) {
        assert.ok(text.includes(expected), `estado ${fixture.id} · ${letter}: sem "${expected}"`);
      }
      if (screen.overdueSince) assert.ok(text.includes("11/10/2026"), `estado ${fixture.id} · ${letter}: sem a data do atraso`);
    }
  }
});

const MONEY = /R\$|\bpre[çc]os?\b|\bvalor(es)?\b|\btota(l|is)\b|\bm[óo]dulos?\b|\bve[íi]culos?\b|\btend[êe]ncias?\b/gi;

test("T-S2 nos 15 estados × 3 vistas, com cada bloco aberto, 0 palavra de dinheiro, módulo, veículo ou tendência", () => {
  const hits: string[] = [];
  let renders = 0;
  for (const fixture of FIXTURES) {
    for (const letter of LETTERS) {
      for (const { label, markup } of allRenders(letter, fixture)) {
        renders += 1;
        const withoutClasses = markup.replace(/\sclass="[^"]*"/g, "");
        for (const match of withoutClasses.matchAll(MONEY)) hits.push(`${label}: "${match[0]}"`);
      }
    }
  }
  assert.ok(renders >= 16 * 3, `denominador: ${renders} renderizações`);
  assert.deepEqual(hits, []);
});

const MEAN_BUTTON = [/(^|>)\s*Pagar\s*(<|$)/, /(^|>)\s*Copiar código Pix\s*(<|$)/, /(^|>)\s*Copiar linha digitável\s*(<|$)/, /(^|>)\s*Abrir boleto\s*(<|$)/, /(^|>)\s*Baixar nota fiscal\s*(<|$)/];
const MEAN_WORD = /\bPix\b|\bboleto\b|linha digitável/i;

function assertNoMeans(fixture: Fixture) {
  for (const letter of LETTERS) {
    for (const { label, markup } of allRenders(letter, fixture)) {
      for (const button of MEAN_BUTTON) assert.doesNotMatch(markup, button, `${label}: rótulo de meio ${button}`);
      assert.doesNotMatch(visible(markup), MEAN_WORD, `${label}: palavra de meio`);
    }
    const open = visible(html(letter, modelOf(fixture, "pagar")));
    assert.ok(open.includes("Copiar dados da fatura"), `${letter}: "Copiar dados da fatura" no "Como pagar"`);
  }
}

test("T-S3a estado 5 (em atraso, sem pagamento pela tela) × 3: nenhum rótulo nem palavra de meio; \"Copiar dados da fatura\"", () => {
  assertNoMeans(byId("5"));
});

test("T-S3b estado 2 (em dia, fatura em aberto, sem pagamento pela tela) × 3: o mesmo do 3a, com \"Em dia\" e sem \"Em atraso\"", () => {
  for (const id of ["2a", "2b"]) {
    const fixture = byId(id);
    assertNoMeans(fixture);
    for (const letter of LETTERS) {
      for (const { label, markup } of allRenders(letter, fixture)) {
        const text = visible(markup);
        assert.ok(text.includes("Em dia"), `${label}: sem "Em dia"`);
        assert.doesNotMatch(text, /em atraso/i, `${label}: "Em atraso" num estado em dia`);
      }
    }
  }
});

test("T-S4 só o meio que veio: só payUrl → Pagar; só pixCopyPaste → Copiar código Pix; todo link https em aba nova com noopener", () => {
  const only = (means: Partial<MySubscriptionPayment>): Fixture => ({
    id: "4-parcial",
    kind: "ready",
    today: "2026-11-14",
    data: subscription({ status: { inGoodStanding: false, overdueSince: VENC_SET, nextDueDate: VENC_SET }, payment: { dueDate: VENC_SET, ...NO_MEANS, ...means } }),
  });
  for (const letter of LETTERS) {
    const link = html(letter, modelOf(only({ payUrl: "https://pagamento.exemplo/fatura" }), "pagar"));
    assert.match(link, MEAN_BUTTON[0], `${letter}: "Pagar" com payUrl`);
    assert.doesNotMatch(link, MEAN_BUTTON[1], `${letter}: sem "Copiar código Pix" só com payUrl`);
    const pix = html(letter, modelOf(only({ pixCopyPaste: "pix-de-exemplo" }), "pagar"));
    assert.match(pix, MEAN_BUTTON[1], `${letter}: "Copiar código Pix" com pixCopyPaste`);
    assert.doesNotMatch(pix, MEAN_BUTTON[0], `${letter}: sem "Pagar" só com pixCopyPaste`);
    const everything = html(letter, modelOf(byId("4"), "pagar"));
    const anchors = [...everything.matchAll(/<a\b[^>]*href="https:[^"]*"[^>]*>/g)].map((m) => m[0]);
    assert.equal(anchors.length, 2, `${letter}: "Pagar" e "Abrir boleto" são links`);
    for (const anchor of anchors) {
      assert.match(anchor, /target="_blank"/, anchor);
      assert.match(anchor, /rel="noopener noreferrer"/, anchor);
    }
  }
});

const STATE_TEXT: Readonly<Record<string, { open?: MySubscriptionBlock; has: readonly (string | RegExp)[]; not?: readonly RegExp[] }>> = {
  "1": { has: ["Em dia", "Sem fatura em aberto"] },
  "2a": { has: ["Em dia", "Fatura em aberto", /vence em 11\/11\/2026/i] },
  "2b": { has: ["Em dia", /venceu em 11\/11\/2026/i, "16/11"] },
  "3": { open: "pagar", has: ["Em dia", "Fatura em aberto", "Pagar", "Copiar código Pix", "Copiar linha digitável", "Abrir boleto"] },
  "4": { open: "pagar", has: ["Em atraso", "11/10/2026", "Pagar", "Copiar código Pix"] },
  "5": { open: "pagar", has: ["Em atraso", "11/10/2026", "Esta fatura não tem pagamento pela tela", "Copiar dados da fatura"] },
  "6": { has: ["Em atraso"], not: [/desde/i] },
  "7": { has: ["Em atraso", "11/10/2026"], not: [/como pagar/i] },
  "8": { has: ["Passou do limite", "23 de 20 usuários", "57 de 50 GB", OVER_LIMIT_NOTE] },
  "9": { has: ["— de 50 GB", "Em estimativa"] },
  "10": { has: ["Medição antiga · 11/11", "sem medição nova há 3 dias"] },
  "11": { has: ["Carregando a assinatura"] },
  "12": { has: ["Não foi possível carregar a assinatura", "Tentar de novo"] },
  "13": { has: ["Acesso não permitido"], not: [/Plus/, /de 20 usuários/, /Em dia/] },
  "14": { has: ["Sua organização ainda não tem assinatura"] },
  "15": { has: ["Dados desatualizados — última atualização às 09:40", "Tentar de novo", "18 de 20 usuários"] },
};

test("T-S5 cada um dos 15 estados tem o seu texto, nas 3; no 6 não existe \"desde\"; no 7 não existe \"Como pagar\"", () => {
  assert.deepEqual(Object.keys(STATE_TEXT).sort(), FIXTURES.map((fixture) => fixture.id).sort(), "todo estado tem o seu texto");
  for (const fixture of FIXTURES) {
    const rule = STATE_TEXT[fixture.id];
    for (const letter of LETTERS) {
      // Na C, com fatura em aberto, o "Como pagar" já abre (o contêiner faz isso); as outras abrem fechadas.
      const open = rule.open ?? (letter === "C" && fixture.data?.payment ? "pagar" : null);
      const text = visible(html(letter, modelOf(fixture, open)));
      for (const expected of rule.has) {
        if (typeof expected === "string") assert.ok(text.includes(expected), `estado ${fixture.id} · ${letter}: sem "${expected}"\n${text}`);
        else assert.match(text, expected, `estado ${fixture.id} · ${letter}`);
      }
      for (const { label, markup } of allRenders(letter, fixture)) {
        for (const forbidden of rule.not ?? []) assert.doesNotMatch(visible(markup), forbidden, label);
      }
    }
  }
  for (const letter of LETTERS) {
    assert.match(html(letter, modelOf(byId("11"))), /data-state="loading"/, `${letter}: esqueleto`);
    assert.match(html(letter, modelOf(byId("13"))), /data-state="forbidden"/, `${letter}: bloqueio`);
    assert.match(html(letter, modelOf(byId("15"))), /data-state="stale"/, `${letter}: faixa de desatualizado`);
  }
});

const TECHNICAL = /\btenant\b|statement|endpoint|billing|usage-history|\bB-[A-Z]{2,}|\bundefined\b|\bNaN\b|\bnull\b|stm-exemplo|\bAPI\b/i;

test("T-S6 0 termo técnico no texto, nos rótulos acessíveis e nos títulos", () => {
  const hits: string[] = [];
  for (const fixture of FIXTURES) {
    for (const letter of LETTERS) {
      for (const { label, markup } of allRenders(letter, fixture)) {
        const spoken = [visible(markup), ...[...markup.matchAll(/(?:aria-label|title)="([^"]*)"/g)].map((m) => m[1])].join(" ");
        const match = TECHNICAL.exec(spoken);
        if (match) hits.push(`${label}: "${match[0]}"`);
      }
    }
  }
  assert.deepEqual(hits, []);
});

test("T-S7 com hoje = 2026-11-14, medição de 2026-11-12 mostra o selo de medição antiga; a de 2026-11-13, não", () => {
  const at = (measuredAt: string): Fixture => ({ id: "medicao", kind: "ready", today: "2026-11-14", data: subscription({ storageGb: { used: 42, included: 50, overLimit: false, measuredAt } }) });
  for (const letter of LETTERS) {
    assert.match(visible(html(letter, modelOf(at("2026-11-12")))), /Medição antiga · 12\/11/, `${letter}: 2 dias = antiga`);
    assert.doesNotMatch(visible(html(letter, modelOf(at("2026-11-13")))), /Medição antiga/, `${letter}: ontem é normal`);
  }
  assert.equal(modelOf(at("2026-11-12")).screen?.storage.measurementOld, true);
  assert.equal(modelOf(at("2026-11-13")).screen?.storage.measurementOld, false);
});
