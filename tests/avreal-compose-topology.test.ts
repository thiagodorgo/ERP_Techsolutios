import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEV = path.join(ROOT, "docker-compose.yml");
const PROD = path.join(ROOT, "docker-compose.prod.yml");
const OVERLAY = path.join(ROOT, "docker-compose.clamav.yml");
const IMAGE =
  "clamav/clamav:1.4.6@sha256:982e28f90061d0e66eb03276419f589a47c9fa601e985e472fc2f6c64b497ca0";

type Port = { target?: number | string; published?: number | string; host_ip?: string };
type Service = {
  image?: string;
  ports?: Port[];
  profiles?: string[];
  environment?: Record<string, string | null>;
  networks?: Record<string, unknown>;
  depends_on?: Record<string, { condition?: string }>;
  volumes?: Array<{ source?: string; target?: string; read_only?: boolean }>;
};
type Config = {
  services: Record<string, Service>;
  networks?: Record<string, { internal?: boolean }>;
};

function compose(files: string[], profiles: string[] = []): Config {
  const args = ["compose", "-p", "avreal-topology"];
  for (const file of files) args.push("-f", file);
  for (const profile of profiles) args.push("--profile", profile);
  args.push("config", "--format", "json");
  const result = spawnSync("docker", args, { cwd: ROOT, encoding: "utf8", timeout: 60_000 });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout) as Config;
}

let devConfig: Config | undefined;
let overlayConfig: Config | undefined;
const dev = () => (devConfig ??= compose([DEV], ["av", "av-limits"]));
const overlay = () => (overlayConfig ??= compose([PROD, OVERLAY]));

test("compose resolve os dois perfis sem consultar o daemon", () => {
  assert.ok(dev().services["erp-clamav"]);
  assert.ok(dev().services["erp-clamav-limits"]);
});

test("dev publica clamd somente em loopback e nas portas esperadas", () => {
  const normal = dev().services["erp-clamav"]!;
  const limits = dev().services["erp-clamav-limits"]!;
  assert.deepEqual(normal.profiles, ["av"]);
  assert.deepEqual(limits.profiles, ["av-limits"]);
  assert.deepEqual(normal.ports, [{ mode: "ingress", target: 3310, published: "3310", protocol: "tcp", host_ip: "127.0.0.1" }]);
  assert.deepEqual(limits.ports, [{ mode: "ingress", target: 3310, published: "3311", protocol: "tcp", host_ip: "127.0.0.1" }]);
});

test("overlay não publica porta do clamd", () => {
  assert.equal(overlay().services.clamav?.ports?.length ?? 0, 0);
});

test("overlay usa rede privada interna e a api participa dela", () => {
  assert.equal(overlay().networks?.clamav_private?.internal, true);
  assert.ok(overlay().services.clamav?.networks?.clamav_private !== undefined);
  assert.ok(overlay().services.api?.networks?.clamav_private !== undefined);
});

test("imagem tag@digest é idêntica no dev, limites e overlay", () => {
  assert.equal(dev().services["erp-clamav"]?.image, IMAGE);
  assert.equal(dev().services["erp-clamav-limits"]?.image, IMAGE);
  assert.equal(overlay().services.clamav?.image, IMAGE);
});

test("overlay ativa clamav na api e aguarda saúde", () => {
  const api = overlay().services.api!;
  assert.equal(api.environment?.EVIDENCE_SCANNER, "clamav");
  assert.equal(api.environment?.CLAMAV_HOST, "clamav");
  assert.equal(api.environment?.CLAMAV_MAX_DB_AGE_HOURS, "72");
  assert.equal(api.depends_on?.clamav?.condition, "service_healthy");
});

test("configs efetivas declaram limites e AlertExceedsMax; perfil reduzido fica fora do overlay", () => {
  const regular = readFileSync(path.join(ROOT, "infra/clamav/clamd.conf"), "utf8");
  const limits = readFileSync(path.join(ROOT, "infra/clamav/clamd.limits-test.conf"), "utf8");
  assert.match(regular, /^StreamMaxLength 110M$/m);
  assert.match(regular, /^AlertExceedsMax yes$/m);
  assert.match(limits, /^StreamMaxLength 3M$/m);
  assert.match(limits, /^MaxFileSize 1M$/m);
  assert.match(limits, /^MaxScanSize 2M$/m);
  assert.doesNotMatch(readFileSync(OVERLAY, "utf8"), /clamd\.limits-test\.conf/);
});

test("montagens de configuração são somente leitura e nenhum socket/storage de evidência é exposto", () => {
  for (const service of [dev().services["erp-clamav"]!, overlay().services.clamav!]) {
    const mounts = service.volumes ?? [];
    const clamd = mounts.find((mount) => mount.target === "/etc/clamav/clamd.conf");
    assert.equal(clamd?.read_only, true);
    assert.equal(mounts.some((mount) => /docker\.sock|evidence/i.test(mount.target ?? "")), false);
  }
});

test("arquivos montados pelo clamd são LF em qualquer checkout, inclusive com core.autocrlf", () => {
  const git = (...args: string[]) => {
    const result = spawnSync("git", args, { cwd: ROOT, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim().split(/\r?\n/).filter(Boolean);
  };
  const files = git("ls-files", "infra/clamav");
  assert(files.length >= 4, `esperava ao menos 4 arquivos em infra/clamav, achei ${files.length}`);
  for (const file of files) {
    assert.deepEqual(git("check-attr", "eol", "--", file), [`${file}: eol: lf`]);
  }
});
