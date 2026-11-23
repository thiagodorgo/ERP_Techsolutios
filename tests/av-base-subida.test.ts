import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const IMAGE =
  "clamav/clamav:1.4.7@sha256:ac15046e610610347c459afabea6683a52cd041c7a10adf5f050ebb05525d62d";

type Service = {
  image?: string;
  entrypoint?: string[];
  command?: string[];
  depends_on?: Record<string, { condition?: string }>;
};
type Config = { services: Record<string, Service> };

function compose(files: string[], profiles: string[] = []): Config {
  const args = ["compose", "-p", "av-base-subida"];
  for (const file of files) args.push("-f", path.join(ROOT, file));
  for (const profile of profiles) args.push("--profile", profile);
  args.push("config", "--format", "json");
  const result = spawnSync("docker", args, { cwd: ROOT, encoding: "utf8", timeout: 60_000 });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout) as Config;
}

function startupCommand(service: Service | undefined): string {
  assert.ok(service, "serviço ausente");
  return [...(service.entrypoint ?? []), ...(service.command ?? [])].join(" ");
}

function assertFreshBeforeInit(command: string, label: string): void {
  const freshclam = command.indexOf("freshclam --foreground --stdout");
  const init = command.indexOf("exec /init");
  assert.ok(freshclam >= 0, `${label}: atualização inicial ausente: ${command}`);
  assert.ok(init > freshclam, `${label}: /init começou antes da atualização: ${command}`);
  assert.match(command, /freshclam --foreground --stdout[^;]*(?:\|\||if )/, `${label}: falha de rede não tem fallback`);
}

test("imagem 1.4.7 fica fixada pelo digest do índice em todas as topologias", () => {
  const dev = compose(["docker-compose.yml"], ["av", "av-limits"]);
  const prod = compose(["docker-compose.prod.yml", "docker-compose.clamav.yml"]);
  for (const [name, service] of [
    ["erp-clamav", dev.services["erp-clamav"]],
    ["erp-clamav-limits", dev.services["erp-clamav-limits"]],
    ["clamav", prod.services.clamav],
    ["clamav-freshclam", prod.services["clamav-freshclam"]],
  ] as const) {
    assert.equal(service?.image, IMAGE, name);
  }
});

test("dev atualiza a base antes de iniciar o clamd e segue com a base da imagem se a rede falhar", () => {
  const dev = compose(["docker-compose.yml"], ["av"]);
  assertFreshBeforeInit(startupCommand(dev.services["erp-clamav"]), "erp-clamav");
});

test("overlay conclui a atualização inicial antes de permitir que o clamd comece", () => {
  const prod = compose(["docker-compose.prod.yml", "docker-compose.clamav.yml"]);
  const updater = prod.services["clamav-freshclam"];
  const clamd = prod.services.clamav;
  assertFreshBeforeInit(startupCommand(updater), "clamav-freshclam");
  assert.equal(clamd?.depends_on?.["clamav-freshclam"]?.condition, "service_healthy");
  assert.equal(updater?.depends_on?.clamav, undefined, "o atualizador não pode esperar o clamd");
});

test("receita AWS atualiza a base antes do /init, preserva o fallback e confere a data", () => {
  const runbook = readFileSync(path.join(ROOT, "docs/infra/roteiro-aws-cloudshell.md"), "utf8");
  assert.match(runbook, /export IMAGEM_CLAMAV="clamav\/clamav@sha256:ac15046e610610347c459afabea6683a52cd041c7a10adf5f050ebb05525d62d"/);
  const recipe = runbook.match(/command: \["([^"]*(?:\\"[^"]*)*)"\]/)?.[1]?.replaceAll('\\"', '"') ?? "";
  assertFreshBeforeInit(recipe, "AWS 3b.3");
  const proof = runbook.match(/### 3b\.6[\s\S]*?(?=\n---\n)/)?.[0] ?? "";
  assert.match(proof, /zVERSION/);
  assert.match(proof, /data[^\n]*base de hoje ou de ontem/);
  assert.match(proof, /zRELOAD[\s\S]{0,300}paliativo|paliativo[\s\S]{0,300}zRELOAD/);
  assert.match(runbook, /depois de ligar[^\n]*data da base/i);
});
