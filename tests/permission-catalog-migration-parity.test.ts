import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { PERMISSION_CATALOG } from "../src/modules/core-saas/permissions/catalog.js";

// GUARD ESTÁTICO DA FRONTEIRA — nasceu do achado ALTA-2 do crítico-adversarial contra o PR-03.
//
// POR QUE ESTE ARQUIVO EXISTE SEPARADO de `permission-catalog-db-parity.test.ts`: aquele guard
// compara o catálogo com o BANCO, e no CI o banco é escrito por `npm run db:seed`, que faz upsert
// do catálogo inteiro. Comparar o catálogo com uma tabela preenchida a partir do próprio catálogo
// é tautologia: bate sempre, por construção. O cenário que ele NÃO pega é justamente o que este PR
// consertou — alguém acrescenta `checklist_runs:delete` ao catálogo SEM migração de dados, o CI
// fica verde, produção roda só `prisma migrate deploy` (`deploy-production.yml:135`, sem `db:seed`)
// e a rota responde 403 para todos os papéis.
//
// Aqui não há banco: lemos os `.sql` do disco. Determinístico, roda em qualquer job, e falha no PR
// que introduz a permissão — não meses depois, em produção.
//
// LIMITE DECLARADO (D-007, sem fingir cobertura): a checagem é TEXTUAL. Ela prova que a chave
// aparece em SQL executável de alguma migração; NÃO prova que a migração concede a permissão aos
// papéis certos, nem que é idempotente. Quem verifica o efeito real é o guard de banco
// (`permission-catalog-db-parity.test.ts`), contra um ambiente provisionado.

const MIGRATIONS_DIR = fileURLToPath(new URL("../prisma/migrations/", import.meta.url));

/**
 * FRONTEIRA HISTÓRICA — CONGELADA em 2026-08-10 (branch `feat/chk-p1-pr03-run-lifecycle`, PR #344).
 *
 * Medição que definiu o formato deste guard: das 197 chaves do catálogo, apenas 7 aparecem em
 * alguma migração — e as 7 vieram das duas migrações de dados deste próprio PR (`20260861000000`
 * e `20260862000000`). As 190 abaixo nunca tiveram migração: existem em banco só porque alguém
 * rodou `db:seed`. Exigir migração retroativa para elas reprovaria o repositório inteiro de saída,
 * o guard seria desligado no dia seguinte e não ensinaria nada.
 *
 * Então a regra é de FRONTEIRA: dívida antiga fica declarada aqui, em voz alta, e TODA chave
 * acrescentada daqui em diante paga a migração.
 *
 * ESTA LISTA NÃO CRESCE. Acrescentar uma chave nova a ela é reabrir exatamente o bug que o guard
 * existe para fechar — deve ser reprovado na revisão do PR. Ela só ENCOLHE: quando uma destas
 * chaves finalmente ganhar migração, o teste de higiene abaixo manda removê-la daqui.
 */
const PERMISSOES_HERDADAS_DO_SEED = new Set<string>([
  "platform:cloud-charge-rules:read",
  "platform:cloud-charge-rules:write",
  "platform:cloud-charges:read",
  "platform:cloud-charges:calculate",
  "platform:cloud-cost-allocation:read",
  "platform:cloud-cost-allocation:run",
  "platform:cloud-costs:read",
  "platform:cloud-costs:import",
  "platform:cloud-usage:read",
  "platform:dashboard:read",
  "platform:tenants:read",
  "platform:audit:read",
  "tenant.manage",
  "users.manage",
  "users.read",
  "users:read",
  "roles.manage",
  "audit.read",
  "audit:read",
  "dashboard:read",
  "tenant_settings:read",
  "tenant_settings:update",
  "work_orders:read",
  "work_orders:create",
  "work_orders:update",
  "work_orders:assign",
  "work_orders:status",
  "work_orders:cancel",
  "work_orders:delete",
  "work_orders:comment",
  "work_orders:mileage_correct",
  "customers:read",
  "customers:create",
  "customers:update",
  "vehicles:read",
  "vehicles:create",
  "vehicles:update",
  "teams:read",
  "teams:create",
  "teams:update",
  "service_catalog:read",
  "price_tables:read",
  "branches:read",
  "suppliers:read",
  "operator_profiles:read",
  "tags:read",
  "pois:read",
  "tariffs:read",
  "yard:read",
  "jurisdiction:read",
  "service_quotes:read",
  "work_order_financials:read",
  "financial_accounts:read",
  "financial_titles:read",
  "professional_statements:read",
  "financial_entries:read",
  "cheques:read",
  "service_catalog:create",
  "price_tables:create",
  "branches:create",
  "suppliers:create",
  "operator_profiles:create",
  "tags:create",
  "pois:create",
  "tariffs:create",
  "yard:create",
  "jurisdiction:create",
  "impound:create",
  "charging:create",
  "charging:settle",
  "service_quotes:create",
  "work_order_financials:create",
  "financial_accounts:create",
  "financial_titles:create",
  "professional_statements:create",
  "financial_entries:create",
  "cheques:create",
  "service_catalog:update",
  "price_tables:update",
  "branches:update",
  "suppliers:update",
  "operator_profiles:update",
  "tags:update",
  "pois:update",
  "tariffs:update",
  "yard:update",
  "jurisdiction:update",
  "impound:update",
  "impound:transition",
  "impound:inspect",
  "impound:allocate",
  "impound:notify",
  "release:process",
  "release:approve",
  "auction:appraise",
  "vehicle_identity:merge",
  "service_quotes:update",
  "service_quotes:approve",
  "work_order_financials:update",
  "financial_accounts:update",
  "financial_titles:update",
  "professional_statements:update",
  "financial_entries:update",
  "cheques:update",
  "financial_period:read",
  "financial_period:close",
  "financial_period:reopen",
  "fuel_logs:read",
  "fuel_logs:create",
  "fuel_logs:update",
  "maintenance_orders:read",
  "maintenance_orders:create",
  "maintenance_orders:update",
  "fines:read",
  "fines:create",
  "fines:update",
  "insurance_policies:read",
  "insurance_policies:create",
  "insurance_policies:update",
  "damages:read",
  "damages:create",
  "damages:update",
  "inventory_items:read",
  "inventory_items:create",
  "inventory_items:update",
  "stock_movements:read",
  "stock_movements:create",
  "cycle_counts:read",
  "cycle_counts:create",
  "purchase_orders:read",
  "purchase_orders:create",
  "field_location:read",
  "field_location:send",
  "field_location:history",
  "field_operator:read",
  "field_operator:action",
  "field_dispatch:read",
  "field_dispatch:create",
  "field_dispatch:update",
  "field_dispatch:cancel",
  "field_dispatch:reassign",
  "logistics:read",
  "logistics_routes:read",
  "billing:read",
  "invoices:read",
  "payments:read",
  "reports:read",
  "commissions:read",
  "commissions:read_own",
  "commissions:manage_policy",
  "commissions:calculate",
  "commissions:approve",
  "commissions:adjust",
  "commissions:settle",
  "commissions:audit",
  "expense_report:read",
  "expense_report:read_own",
  "expense_report:create",
  "expense_report:update",
  "expense_report:submit",
  "expense_report:approve_manager",
  "expense_report:approve_finance",
  "expense_report:return",
  "expense_report:reject",
  "expense_report:pay",
  "expense_policy:read",
  "expense_policy:manage",
  "expense_receipt:attach",
  "expense_sync:write",
  "expense_audit:read",
  "os.manage",
  "os.read",
  "inventory.manage",
  "inventory.read",
  "finance.manage",
  "finance.read",
  "finance:read",
  "notifications:read",
  "notifications:update",
  "notifications:create",
  "sessions:read",
  "sessions:revoke",
  "tenant_checklists:read",
  "tenant_checklists:create",
  "tenant_checklists:update",
  "tenant_checklists:publish",
  "telemetry:read",
  "authority_credentials:manage",
  "platform:vehicle-identity-unmerge:manage",
]);

const PADRAO_A_SEGUIR = "prisma/migrations/20260861000000_grant_checklist_run_reopen_permission";

function listarArquivosSql(diretorio: string): string[] {
  const encontrados: string[] = [];

  for (const entrada of fs.readdirSync(diretorio, { withFileTypes: true })) {
    const completo = path.join(diretorio, entrada.name);
    if (entrada.isDirectory()) encontrados.push(...listarArquivosSql(completo));
    else if (entrada.name.toLowerCase().endsWith(".sql")) encontrados.push(completo);
  }

  return encontrados;
}

/**
 * Comentário não concede permissão nenhuma. Sem esta remoção o guard aceita uma chave citada em
 * prosa — e isso NÃO é hipotético: `impound:update`, `release:approve` e `auction:appraise` só
 * aparecem em texto de comentário (nas migrações 20260855/20260856/20260851/20260842) e passariam
 * por "provisionadas".
 *
 * `--[^\n]*` e NÃO `--.*$`: os `.sql` deste repositório estão em CRLF. Em JS o `.` não casa `\r` e
 * o `$` (sem flag `m`) só casa o fim da STRING, então a versão "óbvia" devolvia o comentário
 * inteiro intacto — foi exatamente esse engano que fez a primeira medição contar 10 chaves
 * provisionadas em vez das 7 reais.
 */
function removerComentarios(sql: string): string {
  return sql.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/--[^\n]*/g, " ");
}

/**
 * Bordas obrigatórias — defesa contra falso-provisionado por substring. Hoje nenhuma migração cita
 * `platform:audit:read` nem `commissions:read_own` (medido; com e sem bordas o resultado é o mesmo),
 * mas SE uma vier a citar, sem bordas o guard daria `audit:read`/`commissions:read` por provisionadas
 * sem migração nenhuma. A classe exclui os caracteres que compõem uma chave (`:`, `.`, `_`, `-`,
 * alfanuméricos), de modo que aspas, vírgula e parêntese do SQL contam como borda.
 */
function citaChave(sqlSemComentarios: string, chave: string): boolean {
  const escapada = chave.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const borda = "[^A-Za-z0-9_.:-]";
  return new RegExp(`(^|${borda})${escapada}(${borda}|$)`).test(sqlSemComentarios);
}

const arquivosSql = listarArquivosSql(MIGRATIONS_DIR);
const sqlExecutavel = removerComentarios(
  arquivosSql.map((arquivo) => fs.readFileSync(arquivo, "utf8")).join("\n"),
);
const comMigracao = new Set(PERMISSION_CATALOG.filter((chave) => citaChave(sqlExecutavel, chave)));

test("as migrações são lidas de fato (o guard não pode passar por não ter olhado nada)", () => {
  // Um caminho errado faria `arquivosSql` vazio: a higiene da linha de base passaria vazia e só a
  // fronteira acusaria — com uma mensagem que culparia o autor da permissão, não o caminho quebrado.
  assert.ok(
    arquivosSql.length > 0,
    `Nenhum .sql encontrado em ${MIGRATIONS_DIR} — o guard estaria medindo o vácuo.`,
  );
});

test("permissão acrescentada ao catálogo chega ao banco por migração (fronteira)", () => {
  const semProvisionamento = PERMISSION_CATALOG.filter(
    (chave) => !PERMISSOES_HERDADAS_DO_SEED.has(chave) && !comMigracao.has(chave),
  );

  assert.deepEqual(
    semProvisionamento,
    [],
    `Permissão nova no catálogo e SEM migração de dados: ${semProvisionamento.join(", ")}.\n` +
      "Em produção o deploy roda apenas `prisma migrate deploy` (deploy-production.yml, sem `db:seed`): " +
      "a permissão nasce MORTA no banco e a rota protegida por ela responde 403 para TODOS os papéis, " +
      "inclusive tenant_admin/super_admin — enquanto o corpo do login (que lê o catálogo em código) " +
      "anuncia a permissão e a interface habilita o botão.\n" +
      `Entregue no MESMO PR uma migração aditiva e idempotente, no padrão de ${PADRAO_A_SEGUIR}: ` +
      "INSERT em `permissions` com ON CONFLICT (key) DO NOTHING + INSERT em `role_permissions` " +
      "selecionando os papéis com ON CONFLICT (role_id, permission_id) DO NOTHING.",
  );
});

test("a fronteira histórica não apodrece (linha de base só encolhe)", () => {
  const noCatalogo = new Set<string>(PERMISSION_CATALOG);

  // Junta PR-03 (2ª rodada, verificador): sem este teto, o caminho de menor esforço de quem vê a
  // fronteira reprovar é ACRESCENTAR a chave nova à própria linha de base — e os três testes voltam
  // a passar com a permissão nascendo morta em produção, que é o exato bug que este guard fecha.
  // A linha de base só pode ENCOLHER (dívida sendo paga); crescer exige mexer neste número na cara
  // do revisor, com a justificativa do lado.
  const TAMANHO_CONGELADO = 189;
  assert.ok(
    PERMISSOES_HERDADAS_DO_SEED.size <= TAMANHO_CONGELADO,
    `A linha de base CRESCEU (${PERMISSOES_HERDADAS_DO_SEED.size} > ${TAMANHO_CONGELADO}). ` +
      "Acrescentar chave a PERMISSOES_HERDADAS_DO_SEED reabre o bug que este guard fecha: " +
      "entregue a migração de dados, não a isenção (padrão: " +
      "prisma/migrations/20260861000000_grant_checklist_run_reopen_permission).",
  );

  const orfas = [...PERMISSOES_HERDADAS_DO_SEED].filter((chave) => !noCatalogo.has(chave));
  assert.deepEqual(
    orfas,
    [],
    `Chave na linha de base que não existe mais no catálogo: ${orfas.join(", ")}. ` +
      "Remova a linha correspondente de PERMISSOES_HERDADAS_DO_SEED — linha de base desatualizada " +
      "vira esconderijo: uma chave futura com o mesmo nome nasceria isenta da fronteira.",
  );

  const jaMigradas = [...PERMISSOES_HERDADAS_DO_SEED].filter((chave) => comMigracao.has(chave));
  assert.deepEqual(
    jaMigradas,
    [],
    `Chave da linha de base que já ganhou migração: ${jaMigradas.join(", ")}. ` +
      "Remova-a de PERMISSOES_HERDADAS_DO_SEED: a dívida foi paga e a fronteira precisa encolher. " +
      "Se ela continuar isenta, uma remoção acidental da migração no futuro passaria despercebida.",
  );
});
