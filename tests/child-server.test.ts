import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { startChildServer, withChildServer } from "./helpers/child-server.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixtureArgs = (mode: "ready" | "silent"): string[] => [
  "--import",
  "tsx",
  path.join(ROOT, "tests/helpers/child-server-fixture.ts"),
  mode,
];

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function assertEventuallyDead(pid: number): Promise<void> {
  const deadline = Date.now() + 5_000;
  while (isAlive(pid) && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 25));
  assert.equal(isAlive(pid), false, `o processo-filho ${pid} ficou vivo`);
}

test("tempo esgotado antes de PORT mata o processo-filho", async () => {
  let pid = 0;
  await assert.rejects(
    startChildServer({
      args: fixtureArgs("silent"),
      cwd: ROOT,
      startTimeoutMs: 150,
      onSpawn: (spawnedPid) => (pid = spawnedPid),
    }),
    /sem "PORT " em 150 ms/,
  );
  assert.ok(pid > 0, "o PID do filho foi capturado");
  await assertEventuallyDead(pid);
});

test("erro depois de PORT também mata o processo-filho", async () => {
  let pid = 0;
  await assert.rejects(
    withChildServer(
      {
        args: fixtureArgs("ready"),
        cwd: ROOT,
        // Na suíte inteira há centenas de workers competindo por CPU; esta prova mede limpeza pós-PORT,
        // não latência de bootstrap. Usa o mesmo teto resiliente dos servidores reais.
        startTimeoutMs: 90_000,
        onSpawn: (spawnedPid) => (pid = spawnedPid),
      },
      async () => assert.fail("falha forçada depois da porta"),
    ),
    /falha forçada depois da porta/,
  );
  assert.ok(pid > 0, "o PID do filho foi capturado");
  await assertEventuallyDead(pid);
});
