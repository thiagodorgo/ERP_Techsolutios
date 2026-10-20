// Mutações de controle do B-TRC-02 (plano v2 §9.5 + emenda v2.1 §1.7, §2.4, §3, §4.4). Formato do B-TRC-01: âncora ÚNICA
// (EOL-consciente), `tsc` ec 0 na forma mutada quando a edição toca `.ts` de `src/` ("não compila" = "não mede"), o teste
// indicado, restauro por BYTES com sha256 conferido. `where`: "host" = sem banco (no worktree, Docker do host para a suíte H);
// "db" = no container Linux do executor (cópia do worktree; Postgres próprio; migração mutada numa base própria).
// Carimbos da migração renumerados pela EO-1 do orquestrador (20260879000000 / 20260880000000).
import { MUTATIONS as TRC01 } from "../B-TRC-01-evidencias/mutations.mjs";

export const MIG_A = "prisma/migrations/20260879000000_vehicle_telemetry_events/migration.sql";
export const MIG_B = "prisma/migrations/20260880000000_validate_receipt_message_kind_check/migration.sql";
const MIG_01 = "prisma/migrations/20260874000000_traccar_ingestion_foundation/migration.sql";

const T = {
  A: ["tests/traccar-event-contract.test.ts"],
  B: ["tests/traccar-event-sample.test.ts"],
  C: ["tests/traccar-event-listener.test.ts"],
  D: ["tests/traccar-event-logs.test.ts"],
  H: ["tests/traccar-event-topology.test.ts"],
  E: ["tests/traccar-event-ingestion-db.test.ts"],
  F: ["tests/traccar-event-sample-db.test.ts"],
  G: ["tests/traccar-event-rls-db.test.ts"],
  contract01: ["tests/traccar-position-contract.test.ts"],
  topo01: ["tests/traccar-dev-topology.test.ts"],
  idem01: ["tests/traccar-idempotency-db.test.ts"],
  ing01: ["tests/traccar-position-ingestion-db.test.ts"],
  guard8: ["tests/auth-invariant-guards.test.ts"],
  auth01: ["tests/traccar-forward-auth.test.ts"],
  cost01: ["tests/traccar-resolution-cost.test.ts"],
};

const APP = "src/integrations/traccar/traccar-ingest.app.ts";
const LOGGER = "src/integrations/traccar/traccar-ingest.logger.ts";
const SERVICE = "src/integrations/traccar/traccar-ingestion.service.ts";
const REPO = "src/integrations/traccar/traccar-ingestion.repository.ts";
const EVT_SCHEMA = "src/integrations/traccar/traccar-event.schema.ts";
const EVT_ADAPTER = "src/integrations/traccar/traccar-event.adapter.ts";
const CATALOG = "src/integrations/traccar/traccar-telemetry-catalog.ts";
const POS_SCHEMA = "src/integrations/traccar/traccar-position.schema.ts";
const POS_ADAPTER = "src/integrations/traccar/traccar-position.adapter.ts";
const BOUNDS = "src/modules/telemetry/vehicle-telemetry.bounds.ts";
const TEL = "src/modules/telemetry/vehicle-telemetry-prisma.repository.ts";
const OVERLAY = "docker-compose.traccar.yml";
const XML = "infra/traccar/dev/traccar.xml";
const DEMO = "scripts/traccar-dev-demo.mjs";

const FORGED_EVENT_RESOLVE =
  '      const forged = command.hintTenantId;\n      const resolved = forged\n        ? await confirm(forged).then((value) =>\n            value.kind === "confirmed"\n              ? ({ kind: "confirmed", tenantId: forged, value: value.value, via: "hint" } as const)\n              : ({ kind: "unmapped" } as const),\n          )\n        : await this.resolver.resolve(key, confirm, effectiveDeadline.at);';

export const MUTATIONS_TRC02 = [
  // ---- mantidas da v1 (26) + M-E10 ampliada
  { id: "M-E01", prop: "position é opcional", where: "host", edits: [{ file: EVT_SCHEMA, find: "  const position = isObject(body.position) ? body.position : undefined;", replace: '  if (!isObject(body.position)) throw new TraccarPayloadError("position_missing");\n  const position = body.position;' }], tests: T.A },
  { id: "M-E02", prop: "event.id fora do digest", where: "host", edits: [{ file: EVT_ADAPTER, find: "    alarm: parsed.alarm ?? null,", replace: "    alarm: parsed.alarm ?? null,\n    eventId: parsed.traccarEventId ?? null," }], tests: T.A },
  { id: "M-E03", prop: "receivedAt fora da chave (determinismo)", where: "db", edits: [{ file: EVT_ADAPTER, find: "      externalEventKey: computeTraccarEventKey(context.instanceKey, {", replace: "      externalEventKey: computeTraccarEventKey(context.instanceKey + String(context.receivedAt.getTime()), {" }], tests: [...T.A, ...T.E] },
  { id: "M-E04", prop: "tipo desconhecido é ignorado", where: "db", edits: [{ file: CATALOG, find: '  if (eventKind === undefined) {\n    return { kind: "ignored", reason: "unknown_type" };', replace: '  if (eventKind === undefined) {\n    return { kind: "keep", eventKind: "alarm", alarmCode: "sos" };' }], tests: [...T.A, ...T.E] },
  { id: "M-E05", prop: "log sem o type cru", where: "host", edits: [{ file: APP, find: '      if (built.kind === "ignored") return { kind: "done", outcome: { kind: "ignored", reason: built.reason } };', replace: '      if (built.kind === "ignored") {\n        logger.info({ type: (body as { event: { type: string } }).event.type }, "evento ignorado");\n        return { kind: "done", outcome: { kind: "ignored", reason: built.reason } };\n      }' }], tests: T.D },
  { id: "M-E06", prop: "chave reservada em event dá 422", where: "host", edits: [{ file: EVT_SCHEMA, find: "  assertNoReservedKeys(event);\n", replace: "" }], tests: T.A },
  { id: "M-E07", prop: "dado pessoal do device não chega ao comando", where: "host", edits: [{ file: EVT_SCHEMA, find: "    position: position ? readPosition(position) : undefined,\n  };", replace: "    position: position ? readPosition(position) : undefined,\n    ...({ deviceName: device.name } as object),\n  };" }, { file: EVT_ADAPTER, find: "      hintTenantId: undefined,", replace: "      hintTenantId: undefined,\n      ...({ deviceName: (parsed as unknown as { deviceName?: unknown }).deviceName } as object)," }], tests: T.A },
  { id: "M-E09", prop: "evento não exige operador (C-10)", where: "db", edits: [{ file: SERVICE, find: "    // 5. (sem passo de operador: o evento é dado da VIATURA — C-10; P-TRC02-LGPD-TELEMETRIA-SEM-DESPACHO)", replace: '    const operator = await ports.operatorAt(command.occurredAt, binding.vehicleId);\n    if (operator.kind !== "single") return quarantined(NO_OPERATOR_REASON[operator.kind]);' }], tests: T.E },
  { id: "M-E10", prop: "corrida resolvida pelo ON CONFLICT (E4 com barreira)", where: "db", edits: [{ file: REPO, find: "      ON CONFLICT (instance_key, message_kind, external_event_key) DO NOTHING\n", replace: "" }], tests: T.E },
  { id: "M-E11", prop: "rota de evento só no app de ingestão", where: "host", edits: [{ file: "src/app.ts", find: '  app.use("/api/v1", healthRouter);\n', replace: '  app.use("/api/v1", healthRouter);\n  app.post("/ingest/traccar/v1/events", (_request, response) => { response.status(204).end(); });\n' }], tests: T.C },
  { id: "M-E12", prop: "a rota de evento autentica", where: "host", edits: [{ file: APP, find: "      traccarForwardAuthMiddleware(deps.authenticator),\n", replace: "" }], tests: T.C },
  { id: "M-E13", prop: "serializador de allowlist no log", where: "host", edits: [{ file: LOGGER, find: "      req: traccarIngestRequestSerializer,\n", replace: "" }], tests: T.D },
  { id: "M-E14", prop: "chave de evento global entre organizações", where: "db", migration: true, edits: [{ file: MIG_01, find: 'CREATE UNIQUE INDEX "traccar_ingress_receipts_event_key"\n  ON "traccar_ingress_receipts"("instance_key", "message_kind", "external_event_key");', replace: 'CREATE UNIQUE INDEX "traccar_ingress_receipts_event_key"\n  ON "traccar_ingress_receipts"("tenant_id", "instance_key", "message_kind", "external_event_key");' }, { file: REPO, find: "      ON CONFLICT (instance_key, message_kind, external_event_key) DO NOTHING", replace: "      ON CONFLICT (tenant_id, instance_key, message_kind, external_event_key) DO NOTHING" }], tests: T.E },
  { id: "M-E15", prop: "status por occurred_at, nunca received_at", where: "db", edits: [{ file: TEL, find: '       ORDER BY "occurred_at" DESC, CASE kind WHEN \'device_offline\'', replace: '       ORDER BY "received_at" DESC, CASE kind WHEN \'device_offline\'' }], tests: T.E },
  { id: "M-E17", prop: "amostra no MESMO tx da posição", where: "db", edits: [{ file: SERVICE, find: "    return this.telemetry.insertSample(ports.tx, row);", replace: "    return this.telemetry.insertSample(this.options.client, row);" }], tests: T.F },
  { id: "M-E18", prop: "sem atributo allowlisted, nenhuma amostra", where: "db", edits: [{ file: SERVICE, find: "    if (command.telemetry) {\n      await withSampleSavepoint(", replace: "    if (true) {\n      await withSampleSavepoint(" }], tests: T.F },
  { id: "M-E19", prop: "hours ms → s", where: "host", edits: [{ file: BOUNDS, find: "Math.round(raw / 1000)", replace: "Math.round(raw)" }], tests: T.B },
  { id: "M-E20", prop: "power V → mV", where: "host", edits: [{ file: BOUNDS, find: "Math.round(volts * 1000)", replace: "Math.round(volts)" }], tests: T.B },
  { id: "M-E21", prop: "digest da posição sem attributes (C-15)", where: "host", edits: [{ file: POS_ADAPTER, find: "    valid: parsed.valid,\n  };\n  const ordered", replace: "    valid: parsed.valid,\n    telemetry: JSON.stringify(parsed.telemetry ?? null),\n  };\n  const ordered" }], tests: [...T.B, ...T.contract01] },
  { id: "M-E22", prop: "nada em work_orders.mileage_*", where: "db", edits: [{ file: SERVICE, find: '    await repository.beforeCommit();\n\n    return {\n      kind: "confirmed",\n      value: { kind: "stored", locationId', replace: '    await tx.$executeRaw`UPDATE work_orders SET mileage_end = 1 WHERE tenant_id = ${tenantId}::uuid`;\n    await repository.beforeCommit();\n\n    return {\n      kind: "confirmed",\n      value: { kind: "stored", locationId' }], tests: T.F },
  { id: "M-E23", prop: "FORCE RLS", where: "db", migration: true, edits: [{ file: MIG_A, find: 'ALTER TABLE "vehicle_telemetry_events" FORCE ROW LEVEL SECURITY;\n', replace: "" }], tests: T.G },
  { id: "M-E24", prop: "FK composta tenant-first para a viatura", where: "db", migration: true, edits: [{ file: MIG_A, find: 'FOREIGN KEY ("tenant_id", "vehicle_id") REFERENCES "vehicles"("tenant_id", "id")', replace: 'FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id")' }], tests: T.G },
  { id: "M-E25", prop: "uma linha por recibo", where: "db", migration: true, edits: [{ file: MIG_A, find: 'CREATE UNIQUE INDEX "vehicle_telemetry_events_receipt_key" ON "vehicle_telemetry_events"("tenant_id", "receipt_id");\n', replace: "" }], tests: T.G },
  { id: "M-E26", prop: "CHECK do recibo validado", where: "db", migration: true, edits: [{ file: MIG_B, find: 'ALTER TABLE "traccar_ingress_receipts" VALIDATE CONSTRAINT "traccar_ingress_receipts_message_kind_check";', replace: "SELECT 1;" }], tests: T.G },
  { id: "M-E27", prop: "sem JSON na tabela", where: "db", migration: true, edits: [{ file: MIG_A, find: '  "ignition" BOOLEAN,\n', replace: '  "ignition" BOOLEAN,\n  "attributes" JSONB,\n' }], tests: T.G },
  { id: "M-E28", prop: "EVENT_FORWARD_HEADER só por interpolação", where: "host", edits: [{ file: OVERLAY, find: "      EVENT_FORWARD_HEADER: ${TRC_FORWARD_HEADER:?TRC_FORWARD_HEADER obrigatorio (o demo monta a partir do segredo da rodada)}", replace: '      EVENT_FORWARD_HEADER: "X-Traccar-Forward-Token: fixo"' }], tests: T.H },
  { id: "M-E29", prop: "status de dev fora do compose de produção", where: "host", edits: [{ file: "docker-compose.prod.yml", find: "      DB_RUNTIME_ROLE: erp_runtime\n", replace: '      DB_RUNTIME_ROLE: erp_runtime\n      STATUS_TIMEOUT: "60"\n' }], tests: T.H },
  // ---- novas da v2 (16) e da emenda v2.1 (5)
  { id: "M-E30", prop: "parser ⊆ CHECK (power)", where: "host", edits: [{ file: BOUNDS, find: "power: { minV: 0, maxV: 1000 }", replace: "power: { minV: -Infinity, maxV: 1000 }" }], tests: T.B },
  { id: "M-E31", prop: "CHECK ⊇ parser (power_mv)", where: "db", migration: true, edits: [{ file: MIG_A, find: '("power_mv" BETWEEN 0 AND 1000000)', replace: '("power_mv" <= 1000000)' }], tests: T.F },
  { id: "M-E32", prop: "a amostra nunca derruba a posição (domínio)", where: "db", edits: [{ file: TEL, find: "    await tx.$executeRaw`ROLLBACK TO SAVEPOINT vehicle_sample`; // erro: desfaz e classifica", replace: "    throw error; // erro: desfaz e classifica" }], tests: T.F },
  { id: "M-E33", prop: "segredo do evento fora do traccar.xml", where: "host", edits: [{ file: XML, find: "    <entry key='forward.type'>json</entry>", replace: "    <entry key='forward.type'>json</entry>\n    <entry key='event.forward.header'>X-Traccar-Forward-Token: mutacao</entry>" }], tests: T.H },
  { id: "M-E33-ctl01", prop: "lacuna medida: a guarda do 01 fica VERDE com o segredo do evento no xml (esperado: verde)", where: "host", expectGreen: true, edits: [{ file: XML, find: "    <entry key='forward.type'>json</entry>", replace: "    <entry key='forward.type'>json</entry>\n    <entry key='event.forward.header'>X-Traccar-Forward-Token: mutacao</entry>" }], tests: T.topo01 },
  { id: "M-E34", prop: "concessão só no demo (não no script do papel)", where: "host", edits: [{ file: "scripts/db-runtime-role.sh", find: "EXECUTE format('GRANT USAGE ON SCHEMA public TO %I', v_role);", replace: "EXECUTE format('GRANT USAGE ON SCHEMA public TO %I', v_role);\n  EXECUTE format('GRANT EXECUTE ON FUNCTION public.auth_login_candidates(text) TO %I', v_role);" }], tests: T.H },
  { id: "M-E35", prop: "nenhuma concessão em migração", where: "host", edits: [{ file: MIG_A, find: "--   Toca traccar_ingress_receipts (CHECK e um índice) e _prisma_migrations; nenhuma outra tabela.\n", replace: "--   Toca traccar_ingress_receipts (CHECK e um índice) e _prisma_migrations; nenhuma outra tabela.\nGRANT EXECUTE ON FUNCTION public.auth_login_candidates(text) TO erp_runtime;\n" }], tests: [...T.guard8, ...T.H] },
  { id: "M-E36", prop: "limitador por rota", where: "host", edits: [{ file: APP, find: "deps.eventLimiter ?? deps.limiter", replace: "deps.limiter" }], tests: T.C },
  { id: "M-E37", prop: "tenant do payload nunca é dica (evento)", where: "db", edits: [{ file: EVT_SCHEMA, find: "    position: position ? readPosition(position) : undefined,\n  };", replace: '    position: position ? readPosition(position) : undefined,\n    ...({ forgedTenant: isObject(event.attributes) && typeof event.attributes.tenantId === "string" ? event.attributes.tenantId : undefined } as object),\n  };' }, { file: EVT_ADAPTER, find: "      hintTenantId: undefined,", replace: "      hintTenantId: (parsed as unknown as { forgedTenant?: string }).forgedTenant," }, { file: SERVICE, find: "      const resolved = await this.resolver.resolve(key, confirm, effectiveDeadline.at);", replace: FORGED_EVENT_RESOLVE }], tests: T.E },
  { id: "M-E37b", prop: "tenant do payload nunca é dica (posição/amostra)", where: "db", edits: [{ file: SERVICE, find: "      const resolved = await this.resolver.resolve(\n        key,\n        (tenantId) => this.phaseTwo(tenantId, command, effectiveDeadline),\n        effectiveDeadline.at,\n      );", replace: '      const confirmPosition = (tenantId: string) => this.phaseTwo(tenantId, command, effectiveDeadline);\n      const forgedAttributes = (command as unknown as { forged?: string }).forged;\n      const resolved = forgedAttributes\n        ? await confirmPosition(forgedAttributes).then((value) =>\n            value.kind === "confirmed"\n              ? ({ kind: "confirmed", tenantId: forgedAttributes, value: value.value, via: "hint" } as const)\n              : ({ kind: "unmapped" } as const),\n          )\n        : await this.resolver.resolve(key, confirmPosition, effectiveDeadline.at);' }, { file: POS_SCHEMA, find: "    telemetry: telemetry.sample,\n", replace: '    telemetry: telemetry.sample,\n    ...({ forged: isObject(position.attributes) && typeof position.attributes.tenantId === "string" ? position.attributes.tenantId : undefined } as object),\n' }, { file: POS_ADAPTER, find: "    telemetry: parsed.telemetry,\n  };", replace: "    telemetry: parsed.telemetry,\n    ...({ forged: (parsed as unknown as { forged?: string }).forged } as object),\n  };" }], tests: T.F },
  { id: "M-E38", prop: "quarentena de evento grava", where: "db", edits: [{ file: SERVICE, find: "    claimTraccarCommitOrThrow(deadline);\n    const subject = isTraccarEventCommand(command)", replace: "    claimTraccarCommitOrThrow(deadline);\n    if (isTraccarEventCommand(command)) return;\n    const subject = isTraccarEventCommand(command)" }], tests: T.E },
  { id: "M-E39", prop: "coordenada na chave do evento", where: "host", edits: [{ file: EVT_ADAPTER, find: 'lat7, lon7].join("|")', replace: '"", ""].join("|")' }], tests: T.A },
  { id: "M-E40", prop: "FK de 4 colunas (linha e recibo concordam)", where: "db", migration: true, edits: [{ file: MIG_A, find: '  FOREIGN KEY ("tenant_id", "receipt_id", "vehicle_id", "binding_id")\n  REFERENCES "traccar_ingress_receipts"("tenant_id", "id", "vehicle_id", "binding_id")', replace: '  FOREIGN KEY ("tenant_id", "receipt_id")\n  REFERENCES "traccar_ingress_receipts"("tenant_id", "id")' }], tests: T.G },
  { id: "M-E41", prop: "precedência no empate", where: "db", edits: [{ file: TEL, find: "WHEN 'device_offline' THEN 0 WHEN 'device_unknown' THEN 1 ELSE 2", replace: "WHEN 'device_online' THEN 0 WHEN 'device_unknown' THEN 1 ELSE 2" }], tests: T.E },
  { id: "M-E42", prop: "última ignição por occurred_at", where: "db", edits: [{ file: TEL, find: "       ORDER BY occurred_at DESC, CASE kind WHEN 'ignition_off'", replace: "       ORDER BY received_at DESC, CASE kind WHEN 'ignition_off'" }], tests: T.E },
  { id: "M-E43", prop: "arnês FK-safe (o after do 01 falha sem a linha)", where: "db", edits: [{ file: "tests/traccar-idempotency-db.test.ts", find: '["vehicle_telemetry_events", "traccar_ingress_receipts",', replace: '["traccar_ingress_receipts",' }], tests: T.idem01 },
  { id: "M-E43h", prop: "arnês FK-safe (guarda estática H9)", where: "host", edits: [{ file: "tests/traccar-idempotency-db.test.ts", find: '["vehicle_telemetry_events", "traccar_ingress_receipts",', replace: '["traccar_ingress_receipts",' }], tests: T.H },
  { id: "M-E44", prop: "ignored contado", where: "host", edits: [{ file: APP, find: 'outcome: "ignored", reason: outcome.reason', replace: 'outcome: "stored"' }], tests: T.D },
  { id: "M-E45", prop: "bateria arredonda e depois limita", where: "host", edits: [{ file: BOUNDS, find: "Math.round(value)", replace: "Math.trunc(value)" }], tests: T.B },
  { id: "M-E46", prop: "FK de isolamento não vira warn", where: "db", edits: [{ file: TEL, find: 'new Set(["23514", "22003"])', replace: 'new Set(["23514", "22003", "23503"])' }], tests: T.F },
  { id: "M-E47", prop: "só domínio é descartável", where: "db", edits: [{ file: TEL, find: "    if (!SAMPLE_DISCARD_SQLSTATES.has(errorCode(error))) throw error;\n", replace: "" }], tests: T.F },
  { id: "M-E48", prop: "a borda aceita entra pelo caminho de produção", where: "db", edits: [{ file: TEL, find: "${sample.powerMv}", replace: "${sample.powerMv}::smallint" }], tests: T.F },
  { id: "M-E48-ctlB", prop: "lacuna medida: B9 fica VERDE com o smallint (esperado: verde)", where: "host", expectGreen: true, edits: [{ file: TEL, find: "${sample.powerMv}", replace: "${sample.powerMv}::smallint" }], tests: T.B },
  { id: "M-E49", prop: "o arnês mede ORDEM (after do 01 falha)", where: "db", edits: [{ file: "tests/traccar-position-ingestion-db.test.ts", find: '          "vehicle_telemetry_events",\n          "traccar_ingress_receipts",', replace: '          "traccar_ingress_receipts",\n          "vehicle_telemetry_events",' }], tests: T.ing01 },
  { id: "M-E49h", prop: "o arnês mede ORDEM (H9)", where: "host", edits: [{ file: "tests/traccar-position-ingestion-db.test.ts", find: '          "vehicle_telemetry_events",\n          "traccar_ingress_receipts",', replace: '          "traccar_ingress_receipts",\n          "vehicle_telemetry_events",' }], tests: T.H },
  { id: "M-E50", prop: "H7 não é vácuo (o passo do demo existe)", where: "host", edits: [{ file: DEMO, find: '    await step("demo: GRANT EXECUTE em auth_login_candidates ao erp_runtime (SÓ nesta demonstração; produção = passo 5 do runbook, ato do dono)", async () => {\n      psql("GRANT EXECUTE ON FUNCTION public.auth_login_candidates(text) TO erp_runtime;");', replace: '    await step("demo: (passo removido pela mutação M-E50)", async () => {\n      void 0;' }], tests: T.H },
  // ---- [Q1=NÃO] (decisão do dono de 19/10, antes do merge — §Q1.7): saem as 8 M-Q1-*; entra a M-E16′.
  { id: "M-E16'", prop: "quarentena nunca guarda amostra (Q1 = NÃO)", where: "db", edits: [{ file: SERVICE, find: "    const quarantined = async (reason: TraccarQuarantineReason): Promise<TraccarConfirmResult<PhaseTwoResult>> => {\n      await repository.recordQuarantine(command, reason);", replace: "    const quarantined = async (reason: TraccarQuarantineReason): Promise<TraccarConfirmResult<PhaseTwoResult>> => {\n      if (binding && command.telemetry) {\n        const forcedReceipt = await repository.insertReceipt({ tenantId, command, bindingId: binding.id, vehicleId: binding.vehicleId });\n        if (forcedReceipt) await this.insertVehicleSample(ports, this.sampleRow(tenantId, binding, forcedReceipt, command));\n      }\n      await repository.recordQuarantine(command, reason);" }], tests: T.F },
];

// ---- re-executadas do B-TRC-01 (17), com os `tests` ampliados da v2 §9.5. Âncora que deixou de ser única por causa deste
// bloco (o caminho do evento repete o idioma do 01) é re-derivada com mais contexto e marcada com ′ (a forma original fica
// registrada como "não mede" pelo próprio executor).
const reuse = (id, tests, where) => {
  const original = TRC01.find((mutation) => mutation.id === id);
  if (!original) throw new Error(`mutação do 01 ausente: ${id}`);
  return { ...original, id: `${id}@01`, where, tests };
};
const T01 = {
  idem: ["tests/traccar-idempotency-db.test.ts"],
  quar: ["tests/traccar-quarantine-db.test.ts"],
  listener: ["tests/traccar-ingest-listener.test.ts"],
  logs: ["tests/traccar-ingest-logs.test.ts"],
  ing: ["tests/traccar-position-ingestion-db.test.ts"],
};
export const REEXECUTED_01 = [
  reuse("MUT-09", [...T.cost01, ...T.E], "db"),
  reuse("MUT-10", T01.idem, "db"),
  {
    id: "MUT-10′@01",
    prop: "conteúdo divergente não é sucesso (passo 6) — âncora re-derivada com o findReceipt da POSIÇÃO",
    where: "db",
    edits: [{ file: SERVICE, find: "      const raced = await repository.findReceipt(command);\n      if (!raced) {\n        await repository.recordQuarantine(command, \"idempotency_key_owned_elsewhere\");\n        return { kind: \"confirmed\", value: { kind: \"conflict\", reason: \"owned_elsewhere\" } };\n      }\n      assertRowsBelongToTenant([raced], tenantId, \"traccar_ingress_receipts\");\n      if (raced.payloadDigest === command.payloadDigest) {", replace: "      const raced = await repository.findReceipt(command);\n      if (!raced) {\n        await repository.recordQuarantine(command, \"idempotency_key_owned_elsewhere\");\n        return { kind: \"confirmed\", value: { kind: \"conflict\", reason: \"owned_elsewhere\" } };\n      }\n      assertRowsBelongToTenant([raced], tenantId, \"traccar_ingress_receipts\");\n      if (raced.payloadDigest === command.payloadDigest || raced.id !== \"\") {" }],
    tests: T01.idem,
  },
  reuse("MUT-11", [...T01.idem, ...T.E], "db"),
  reuse("MUT-12", [...T01.idem, ...T.E], "db"),
  reuse("MUT-13", [...T01.quar, ...T.E], "db"),
  reuse("MUT-14", [...T01.quar, ...T.E], "db"),
  reuse("MUT-16", [...T01.logs, ...T.D], "host"),
  reuse("MUT-17", [...T.auth01, ...T.C], "host"),
  reuse("MUT-18", [...T.auth01, ...T.C], "host"),
  reuse("MUT-19", [...T.auth01, ...T.C], "host"),
  reuse("MUT-20", [...T.contract01, ...T.A, ...T01.ing, ...T.E], "db"),
  reuse("MUT-25", T.contract01, "host"),
  reuse("MUT-32", [...T01.listener, ...T.C], "host"),
  reuse("MUT-33", [...T01.listener, ...T.C], "host"),
  reuse("MUT-38", [...T.auth01, ...T.C], "host"),
  reuse("MUT-42", T.contract01, "host"),
  reuse("M-C1", T01.ing, "db"),
];

export const ALL = [...MUTATIONS_TRC02, ...REEXECUTED_01];
