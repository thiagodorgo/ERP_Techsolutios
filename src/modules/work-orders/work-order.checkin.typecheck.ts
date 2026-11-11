// B-SAN3-26 (C26-08, G1a) — guarda de TIPO da P-CHECKIN-1: escrever `on_site` exige um veredito de check-in com marca.
//
// Mora em `src/` porque o `tsconfig.json` só inclui `src/**`: é o `npm run check` que cobra cada `@ts-expect-error`.
// Se alguém afrouxar o tipo (aceitar `on_site` sem veredito, aceitar um veredito montado à mão, ou criar uma OS já em
// `on_site`), a diretiva fica sem uso e o `npm run check` REPROVA. As funções nunca são chamadas; cada entrada é válida
// em tudo, menos no ponto que a guarda afirma, para a diretiva não ser satisfeita por outro erro.
import type { WorkOrderRepository } from "./work-order.repository.js";
import type { CreateWorkOrderInput } from "./work-order.types.js";

const statusBase = { tenantId: "t", workOrderId: "w", message: "m" } as const;
const createBase: CreateWorkOrderInput = { tenantId: "t", code: "OS-0001", title: "OS", priority: "medium" };

export function checkinTypeGuardOnSiteWithoutVerdict(repository: WorkOrderRepository): void {
  // @ts-expect-error — `on_site` sem veredito não compila.
  void repository.changeStatus({ ...statusBase, status: "on_site" });
}

export function checkinTypeGuardHandMadeVerdict(repository: WorkOrderRepository): void {
  // @ts-expect-error — um veredito montado à mão não tem a marca de `verifyCheckin`.
  void repository.changeStatus({ ...statusBase, status: "on_site", checkin: { mode: "office" } });
}

export function checkinTypeGuardCreateOnSite(repository: WorkOrderRepository): void {
  // @ts-expect-error — ninguém cria uma OS já em "No local".
  void repository.create({ ...createBase, status: "on_site" });
}

// Controle positivo: as mesmas entradas, sem o ponto da guarda, compilam (a guarda não é um erro de outra coisa).
export function checkinTypeGuardControls(repository: WorkOrderRepository): void {
  void repository.changeStatus({ ...statusBase, status: "on_route" });
  void repository.create({ ...createBase, status: "open" });
}
