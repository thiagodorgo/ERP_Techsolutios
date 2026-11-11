// B-USERS-ACESSO-SEG (S8, UEM-01/UEM-03) — o app REAL (src/app.ts com o core-saas de produção), num processo
// PRÓPRIO, para a prova de que a senha provisória e os dados de outra organização não vão para o log: o teste lê o
// stdout e o stderr reais do processo (o pino escreve direto no descritor, não passa por `process.stdout.write`).
// O ambiente vem do processo pai (DATABASE_URL, CORE_SAAS_PERSISTENCE=prisma, LOG_LEVEL=trace, JWT_SECRET).
// Imprime `PORT <n>` ao subir.

const { createApp } = await import("../../src/app.js");
const { createCoreSaasService } = await import("../../src/modules/core-saas/index.js");

const app = createApp(await createCoreSaasService());
const server = app.listen(0, "127.0.0.1", () => {
  const address = server.address();
  process.stdout.write(`PORT ${typeof address === "object" && address ? address.port : 0}\n`);
});
