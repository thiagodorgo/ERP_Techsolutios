// pgbench do B-TRC-01 (plano v2.1 §8.5 passo 11, §11.3 M-22): evidência, não gate de CI. Gera o SQL de semeadura e
// os scripts do caminho quente e da varredura de pior caso (dispositivo sem vínculo) para T organizações.
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ORGS = 1000;
const tenants = Array.from({ length: ORGS }, () => randomUUID());
const lines = ["BEGIN;"];
for (const [index, id] of tenants.entries()) {
  const vehicle = randomUUID();
  lines.push(`INSERT INTO tenants (id, name, slug) VALUES ('${id}', 'bench ${index}', 'bench-${index}');`);
  lines.push(`INSERT INTO vehicles (id, tenant_id, plate, model) VALUES ('${vehicle}', '${id}', 'B${String(index).padStart(6, "0")}', 'bench');`);
  // 20 vínculos históricos (desativados) + 1 ativo por organização: 21.000 vínculos, 1.000 ativos (como a M-22).
  lines.push(
    `INSERT INTO vehicle_tracking_bindings (tenant_id, vehicle_id, instance_key, external_device_key, valid_from, valid_to)
     SELECT '${id}', '${vehicle}', 'bench', 'old-${index}-' || g, now() - interval '2 days', now() - interval '1 day' FROM generate_series(1, 20) g;`,
  );
  lines.push(`INSERT INTO vehicle_tracking_bindings (tenant_id, vehicle_id, instance_key, external_device_key) VALUES ('${id}', '${vehicle}', 'bench', 'dev-${index}');`);
}
lines.push("COMMIT;");
writeFileSync(path.join(HERE, "seed.sql"), `${lines.join("\n")}\n`);

// caminho quente: confirmação FOR SHARE + INSERT do recibo ON CONFLICT DO NOTHING RETURNING, e ROLLBACK
const hotTenant = tenants[0];
writeFileSync(
  path.join(HERE, "hot.sql"),
  [
    "BEGIN;",
    `SELECT set_config('app.current_tenant_id', '${hotTenant}', true);`,
    "SELECT id, vehicle_id FROM vehicle_tracking_bindings WHERE instance_key = 'bench' AND external_device_key = 'dev-0' AND valid_to IS NULL FOR SHARE;",
    `INSERT INTO traccar_ingress_receipts (tenant_id, instance_key, message_kind, external_event_key, payload_digest, binding_id, vehicle_id, traccar_device_id, fix_time)
     SELECT '${hotTenant}', 'bench', 'position', md5(random()::text), 'd', b.id, b.vehicle_id, '1', now() FROM vehicle_tracking_bindings b
      WHERE b.instance_key = 'bench' AND b.external_device_key = 'dev-0' AND b.valid_to IS NULL
     ON CONFLICT (instance_key, message_kind, external_event_key) DO NOTHING RETURNING id;`,
    "ROLLBACK;",
    "",
  ].join("\n"),
);

// varredura de pior caso: dispositivo SEM vínculo, T voltas (GUC + sondagem), somente leitura
for (const count of [10, 100, 500]) {
  const scan = ["BEGIN READ ONLY;"];
  for (const id of tenants.slice(0, count)) {
    scan.push(`SELECT set_config('app.current_tenant_id', '${id}', true);`);
    scan.push("SELECT id, tenant_id FROM vehicle_tracking_bindings WHERE instance_key = 'bench' AND external_device_key = 'desconhecido' AND valid_to IS NULL LIMIT 2;");
  }
  scan.push("COMMIT;", "");
  writeFileSync(path.join(HERE, `scan-${count}.sql`), scan.join("\n"));
}
console.log("ok");
