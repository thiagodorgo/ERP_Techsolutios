// J-571 (C3-A2): um app Express novo, sem o tratador final. A G4e tem de reprovar: o erro cairia no tratador padrão do
// Express, que escreve o `err.stack` cru.
import express from "express";

export function criarAppSemTratador() {
  const app = express();
  app.get("/x", () => {
    throw new Error("connect ECONNREFUSED c3-sentinela-host.interno:6391");
  });
  return app;
}
