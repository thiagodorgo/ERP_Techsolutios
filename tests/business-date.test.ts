import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { businessDateAtRequest } from "./helpers/business-date.js";

test("a data de negócio é lida no instante da requisição, inclusive na virada de meia-noite em São Paulo", () => {
  const clock = { now: new Date("2026-11-19T02:59:59.900Z") };
  const dateForRequest = businessDateAtRequest(() => clock.now);

  assert.equal(dateForRequest(), "2026-11-18", "controle: ainda é o dia anterior às 23:59:59.900 em São Paulo");
  clock.now = new Date("2026-11-19T03:00:00.100Z");
  assert.equal(dateForRequest(), "2026-11-19", "a requisição depois da meia-noite usa o novo dia de negócio");
});

test("o consumidor T10 lê a data de negócio pelo helper no instante da PUT", () => {
  const source = readFileSync(new URL("./san3-05-leituras-de-plataforma-db.test.ts", import.meta.url), "utf8");

  assert.match(source, /import \{ businessDateAtRequest \} from "\.\/helpers\/business-date\.js";/);
  assert.match(source, /subscriptionValidFrom:\s*\(\) => string;/);
  assert.match(source, /subscriptionValidFrom:\s*businessDateAtRequest\(\),/);
  assert.match(
    source,
    /validFrom:\s*cenario\.subscriptionValidFrom\(\)/,
    "T10 deve consultar o relógio no instante da PUT, não capturar a data durante a preparação",
  );
});
