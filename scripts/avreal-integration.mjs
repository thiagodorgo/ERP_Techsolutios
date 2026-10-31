import { spawnSync } from "node:child_process";

const host = process.env.AVREAL_CLAMAV_HOST;
if (!host) {
  console.error("AVREAL_CLAMAV_HOST é obrigatório; integração não pode pular.");
  process.exit(2);
}

const result = spawnSync(
  process.execPath,
  [
    "--test",
    "--test-reporter=tap",
    "--import",
    "tsx",
    "tests/avreal-clamd-integration.test.ts",
  ],
  {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: "test",
      EVIDENCE_SCANNER: "clamav",
      CLAMAV_HOST: host,
      CLAMAV_PORT: process.env.AVREAL_CLAMAV_PORT ?? "3310",
      CLAMAV_MAX_DB_AGE_HOURS: "0",
    },
    encoding: "utf8",
    stdio: ["inherit", "pipe", "pipe"],
  },
);

process.stdout.write(result.stdout ?? "");
process.stderr.write(result.stderr ?? "");

const tap = result.stdout ?? "";
const tests = Number(/^# tests (\d+)$/m.exec(tap)?.[1] ?? "0");
const skipped = Number(/^# skipped (\d+)$/m.exec(tap)?.[1] ?? "0");
if (result.status !== 0 || tests === 0 || skipped !== 0) {
  console.error(
    `integração ClamAV inválida: exit=${String(result.status)} tests=${tests} skipped=${skipped}`,
  );
  process.exit(result.status && result.status !== 0 ? result.status : 1);
}
