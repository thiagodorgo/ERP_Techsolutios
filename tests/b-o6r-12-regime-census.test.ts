import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";

// B-O6R-12 (A13, §2.2.11 do plano v2 + E1.6) — CATRACA DOS LEITORES VIVOS DO PERFIL NORMATIVO.
//
// Procura por SUPERFÍCIE DE ACESSO, não por alias: varre todo `src/**/*.ts` fora de `src/modules/jurisdiction/`,
// ignorando linhas de comentário, com 4 regras, e compara o resultado (arquivo, regra, texto da linha) com a
// allowlist congelada `LEITORES_VIVOS`. Leitor novo do perfil vivo, em qualquer módulo e com qualquer alias, deixa
// isto vermelho; leitor removido também (a allowlist só encolhe junto com o código).
//
// Limite declarado: continua sendo guarda de FORMA, só que mais larga (o próprio plano diz isso no A13). A prova da
// propriedade são os testes que executam: C1-C3, C12, C13, C19 e C20-C20d.

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const read = (relative: string): string => readFileSync(path.join(ROOT, relative), "utf8").replace(/\r\n/g, "\n");

type Regra = "R1" | "R2" | "R3" | "R4";
type Leitor = {
  readonly arquivo: string;
  readonly regra: Regra;
  readonly texto: string;
  readonly motivo: string;
  readonly pendencia: string | null;
};

export const REGRAS: Readonly<Record<Regra, RegExp>> = {
  // R1 — o nome da tabela em SQL.
  R1: /\bjurisdiction_profiles\b/,
  // R2 — o delegate do Prisma.
  R2: /\.jurisdictionProfile\./,
  // R3 — include/select da relação `profile` de impoundProcess.
  R3: /\bprofile:\s*(true\b|\{)/,
  // R4 — a porta de leitura do módulo, chamada de fora dele.
  R4: /\b(getPortalProfile|findProfileById)\(/,
};

// Regra explícita de ARQUIVO (plano §2.2.11, R1): a lista de tabelas censuradas da medição cita o nome da tabela
// como dado, não lê o perfil.
export const FORA_DA_R1: Readonly<Record<string, string>> = {
  "src/modules/subscription-billing/metering/censored-tables.ts": "lista de tabelas censuradas da medição; não lê o perfil",
};

export const LEITORES_VIVOS: readonly Leitor[] = [
  {
    arquivo: "src/modules/charging/charge-prisma.repository.ts",
    regra: "R1",
    texto: "JOIN jurisdiction_profiles jp ON jp.tenant_id = ip.tenant_id AND jp.id = ip.profile_id",
    motivo: "só a queda do ponteiro da diária (A1): cópia NULL segue o ponteiro atual do perfil",
    pendencia: null,
  },
  {
    arquivo: "src/modules/impound/impound-prisma.repository.ts",
    regra: "R2",
    texto: "const profile = await this.client.jurisdictionProfile.findFirst({ where: { tenant_id: tenantId, id: profileId } });",
    motivo: "requireProfileRegime: lê o perfil para o create da abertura; quem grava o retrato é o gatilho",
    pendencia: null,
  },
  {
    arquivo: "src/modules/impound/impound-prisma.repository.ts",
    regra: "R2",
    texto: "const profile = await this.client.jurisdictionProfile.findFirst({",
    motivo: "fotos da recepção (required_photo_sets), que o PATCH não edita; fica vivo, declarado (§1.2)",
    pendencia: null,
  },
  {
    arquivo: "src/modules/owner-portal/owner-portal.service.ts",
    regra: "R4",
    texto: "getPortalProfile(",
    motivo: "falso positivo (E1.6): a declaração da porta, não uma chamada",
    pendencia: null,
  },
  {
    arquivo: "src/modules/owner-portal/owner-portal.service.ts",
    regra: "R4",
    texto: ": await this.deps.jurisdiction.getPortalProfile(this.deps.tenantId, process.profileId),",
    motivo: "queda do portal para processo sem retrato (só em memória: no Prisma o regime é NOT NULL)",
    pendencia: "P-O6R-B12-PORTAL-MEMORIA",
  },
  {
    arquivo: "src/modules/patios-dashboard/patios-dashboard-prisma.repository.ts",
    regra: "R3",
    texto: "profile: { ownerNotifDays: Number(row.owner_notif_days), noticeEdictDay: Number(row.notice_edict_day) },",
    motivo: "falso positivo (E1.6): literal montado da linha do SELECT, que já lê o retrato",
    pendencia: null,
  },
  {
    arquivo: "src/modules/subscription-billing/charges/charge-request.service.ts",
    regra: "R3",
    texto:
      "): (row: BillingOutboxRow, port: { ensureCustomer(profile: { readonly name: string; readonly document: string; readonly email?: string }): Promise<{ readonly customerId: string }> }) => Promise<CustomerResolution> {",
    motivo: "falso positivo (E1.6): assinatura de tipo do cliente da cobrança, sem relação com o perfil normativo",
    pendencia: null,
  },
];

// O fuso do pátio é insumo vivo DECLARADO (A10, pendência com dono); o ponteiro é a exceção do A1.
export const INSUMOS_VIVOS_DIARIA = ["jp.daily_service_catalog_id", "y.timezone"] as const;

function listarTs(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(path.join(ROOT, dir))) {
    const relative = `${dir}/${entry}`;
    if (statSync(path.join(ROOT, relative)).isDirectory()) out.push(...listarTs(relative));
    else if (relative.endsWith(".ts")) out.push(relative);
  }
  return out;
}

export function varrerSuperficies(): Array<{ arquivo: string; regra: Regra; texto: string }> {
  const achados: Array<{ arquivo: string; regra: Regra; texto: string }> = [];
  for (const arquivo of listarTs("src")) {
    if (arquivo.startsWith("src/modules/jurisdiction/")) continue;
    for (const linha of read(arquivo).split("\n")) {
      const texto = linha.trim();
      if (texto.startsWith("//") || texto.startsWith("*") || texto.startsWith("/*")) continue;
      for (const regra of Object.keys(REGRAS) as Regra[]) {
        if (regra === "R1" && arquivo in FORA_DA_R1) continue;
        if (REGRAS[regra].test(texto)) achados.push({ arquivo, regra, texto });
      }
    }
  }
  return achados;
}

const chave = (item: { arquivo: string; regra: string; texto: string }): string => `${item.arquivo} | ${item.regra} | ${item.texto}`;

test("B-O6R-12 C10: a varredura R1-R4 de src/** dá exatamente LEITORES_VIVOS", () => {
  const achados = varrerSuperficies().map(chave).sort();
  const esperado = LEITORES_VIVOS.map(chave).sort();
  assert.deepEqual(achados, esperado, "leitor do perfil vivo fora da allowlist (ou allowlist com entrada que o código já não tem)");
  for (const leitor of LEITORES_VIVOS) {
    assert.ok(leitor.motivo.length > 0, `${chave(leitor)} sem motivo`);
    if (leitor.pendencia) assert.match(read("agent-orchestration/controle/pendencias.md"), new RegExp(leitor.pendencia));
  }
});

test("B-O6R-12 C10 (positivo): os 4 leitores da Q1 leem o retrato do processo", () => {
  const cases = [
    ["src/modules/impound/impound.notifications-prisma.repository.ts", "ip.regime_scope = 'PUBLIC_AGREEMENT'"],
    ["src/modules/auction/auction-prisma.repository.ts", "ip.regime_auction_eligible_day AS auction_eligible_day"],
    ["src/modules/release/release-prisma.repository.ts", "SELECT ip.regime_release_requirements AS release_requirements"],
    ["src/modules/patios-dashboard/patios-dashboard-prisma.repository.ts", "ip.regime_owner_notif_days AS owner_notif_days"],
  ] as const;
  for (const [arquivo, trecho] of cases) assert.ok(read(arquivo).includes(trecho), `${arquivo} não lê ${trecho}`);
});

function colunasNaoIpDoAccrual(): string[] {
  const source = read("src/modules/charging/charge-prisma.repository.ts");
  const inicio = source.indexOf("async loadAccrualContext(");
  assert.ok(inicio >= 0, "loadAccrualContext não encontrado");
  const select = source.indexOf("SELECT", inicio);
  const from = source.indexOf("FROM impound_processes ip", select);
  assert.ok(select > inicio && from > select, "SELECT de loadAccrualContext não delimitado");
  const lista = source.slice(select + "SELECT".length, from);
  const refs = [...lista.matchAll(/\b([a-z_][a-z0-9_]*)\.([a-z_][a-z0-9_]*)\b/g)].map((m) => `${m[1]}.${m[2]}`);
  assert.ok(refs.some((ref) => ref.startsWith("ip.")), "controle: a lista do SELECT tem colunas ip.");
  return [...new Set(refs.filter((ref) => !ref.startsWith("ip.")))].sort();
}

test("B-O6R-12 C22: as colunas não ip. do SELECT da diária são exatamente INSUMOS_VIVOS_DIARIA", () => {
  assert.deepEqual(colunasNaoIpDoAccrual(), [...INSUMOS_VIVOS_DIARIA].sort());
  assert.match(read("agent-orchestration/controle/pendencias.md"), /P-O6R-B12-FUSO-DO-PATIO-VIVO/);
});
