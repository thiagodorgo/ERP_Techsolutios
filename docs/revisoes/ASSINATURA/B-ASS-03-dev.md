# B-ASS-03-dev — relatório incremental do dev-ass03

- **Dev:** `dev-ass03` · nível menor declarado · identidade de dev. Esforço médio.
- **Plano:** `C:/Users/thiag/erp-pausa-2026-10-03/planos/B-ASSINATURA-plano.md` §4.3, §3, §12 e Emendas 2-4 ao §4.2.
- **Ref de partida:** `origin/main = 43716227a769e2f2661ca828ec68903e4b49167e` (B-ASS-02, #504).
- **Worktree:** `C:/Users/thiag/w-ass03` · ramo `feat/b-ass-03-medicao-franquia`.
- **Verificação desta rodada:** revisor sênior (outra identidade) no lugar da junta; porteiro revisor pós-merge.

---

## F0 — comando, hipóteses e terreno (25)

**FATOS medidos nesta fatia:**
- `npm ci` no worktree: `added 326 packages` (aviso EBADENGINE de `@prisma/streams-local`, não bloqueante).
- H-DMMF — FATO: `prisma/schema.prisma` tem 0 ocorrências de `relforcerowsecurity`/`relrowsecurity`/`ENABLE ROW LEVEL`; a RLS vive nas migrações (`ALTER TABLE ... ENABLE/FORCE ROW LEVEL SECURITY` + `CREATE POLICY`). Logo a lista censurada do medidor NÃO pode sair do DMMF ("toda tabela com tenant_id" é a mutação proibida de R-MED-9); a fonte correta é o catálogo do Postgres (`pg_class.relforcerowsecurity = true` ∩ coluna `tenant_id NOT NULL`), no cluster descartável.
- H-SIZE-NULL — FATO: `size_bytes Int?` (nulável) nas 4 tabelas de anexo — `ChecklistAttachment` (schema l.978), `WorkOrderAttachment` (l.1469), `Attachment` (l.1504), `DamageAttachment` (l.1532). Confirmado também: `status` + `deleted_at` existem só em `work_order_attachments` e `attachments`; `checklist_attachments` e `damage_attachments` não têm essas colunas (S2/E23 confirmados). `files_without_size` = linhas com `size_bytes IS NULL` é suportado.
- Comando do bloco criado em `agent-orchestration/codex/comandos/B-ASS-03-medicao-diaria.md` (29 linhas).

**PREMISSA FALSA (declarada; sigo sem ela):** o §4.3 PERMITIDO lista, para R-MED-8, apenas
`cloud-cost-allocation/{rules.ts, prisma.repository.ts, repository.ts}`. Mas a chave `db_bytes_estimated` precisa
existir no union `CloudUsageMetricKey` (definido em `src/modules/cloud-usage/cloud-usage.types.ts`), que é usado por
`UsageBasisRow.metricKey` (`cloud-cost-allocation.types.ts:127`) e por `basisMetricKeys` de `cloud-cost-allocation.rules.ts`.
Comando: `grep -rn "UsageBasisRow\|CloudUsageMetricKey" src/modules/cloud-cost-allocation/cloud-cost-allocation.types.ts src/modules/cloud-cost-allocation/cloud-cost-allocation.rules.ts` → `metricKey: CloudUsageMetricKey` e `basisMetricKeys: readonly CloudUsageMetricKey[]`. Sem adicionar a chave ao union, o TypeScript não compila a regra nova. Portanto o PERMITIDO ganha `src/modules/cloud-usage/cloud-usage.types.ts` (só a linha da chave nova) — registrado aqui e no PR. A mutação de R-MED-8 ("chave depois de audited_actions_count → vermelho") e o vermelho-controle ("em origin/main a chave não existe") permanecem válidos.

**Próxima fatia:** F1 (tipos + medidor com dublê em memória e SQL injetável).

---

## F2 — schema + M2 + guard + drill M2 (35, Docker)

- Model `TenantUsageDaily` em `prisma/schema.prisma` (medidas nuláveis: `active_users`, `db_bytes_estimated`, `files_bytes`, `files_without_size`, `tracked_vehicles`; `method_version` e `measured_at` NOT NULL; `@@unique([tenant_id,date])` + `@@index([tenant_id,date])`).
- Migração M2 `prisma/migrations/20260896000000_ass03_tenant_usage_daily/migration.sql`: aditiva, `BEGIN;`/`COMMIT;`, RLS `ENABLE + FORCE` com a política do GUC `app.current_tenant_id` (molde `20260879000000`), UNIQUE (`tenant_id`,`date`), índice e FK para `tenants`. Runbook down no comentário (DROP + DELETE escopado).
- **Autorização da M2:** coberta pela fala do dono de 31/10 ~22:15 ("siga na recomendação de tudo, exceto p14" → P1, as 7 de esquema) — §12.1 do plano. Citada no comando e no PR.
- Guard de migração verde: `node scripts/migration-transaction-guard.mjs` → `migrações: 124 · anteriores: 112 · novas: 12 · violações: 0`.
- Drill `tests/ass-03-usage-migration-drill-db.test.ts` (R-MED-7) verde no Postgres descartável `devass03-pg` (127.0.0.1:55503): up em base própria, down em transação única, atomicidade por prefixo, RLS ENABLE+FORCE — `3/3`.
- **Nota de ordem:** o drill M2 foi antecipado da F4 para cá porque o guard G6 exige que o nome da migração apareça num `tests/*-migration-drill-db.test.ts`; sem ele, a F2 deixaria o guard vermelho. Nada muda de escopo (o drill já está no PERMITIDO, R-MED-7).
- `prisma generate` + `npm run check` verdes.

## F1 — medidor com dublê em memória (45)

- `src/modules/subscription-billing/metering/` criado: `metering.types.ts` (`METERING_METHOD_VERSION=2`, `METERING_ATTACHMENT_MODELS`/`METERING_ATTACHMENT_FILTERS`, tipos e erros), `metering.sql.ts` (executor SQL injetável, sem `tenant_id =` literal), `metering.memory.ts` (dublê em memória), `tenant-usage.repository.ts` (dublê de repositório com UPSERT `GREATEST` para `activeUsers`), `metering.service.ts` (`measureTenant`/`measureDaily`/`toUsageDto`), `metering.payload.ts` (payload com `date` → 400 `unknown_field`).
- `tests/ass-03-metering.test.ts` verde `9/9`: T-MED-5 (guard de texto), T-MED-6/7 (1 linha, `GREATEST` e `measured_at` avança), T-MED-8, T-MED-9/10/11 (veículos), T-MED-14 (slug `platform` pulado), T-MED-4b (sem GUC lança) e T-MED-15 (BigInt→string).
- `npm run check` verde.

## F3 — repositório Prisma + provas -db (45, Docker)

- `metering-prisma.repository.ts`: `PrismaMeteringSqlExecutor` (GUC, canário, usuários ativos, bytes de anexo, bytes por tabela com SAVEPOINT, veículos rastreados) e `PrismaTenantUsageDailyRepository` (UPSERT `ON CONFLICT (tenant_id,date) DO UPDATE` com `GREATEST(active_users)` e último medido nas demais); `measureTenantUsageInTx` exposto no barrel.
- Correção do canário (R-MED-4): a leitura-canário `SELECT tenant_id FROM users LIMIT 1` passou a devolver as linhas lidas e o medidor usa `assertRowsBelongToTenant` (linha de OUTRA organização = vazamento → erro; zero linhas = passa). Antes, organização sem usuário era tratada como contexto ausente — falso negativo que derrubava T-MED-db-3/10.
- `tests/ass-03-metering-db.test.ts` verde `6/6` no `devass03-pg` (papel NOSUPERUSER NOBYPASSRLS): T-MED-db-1, T-MED-db-2/9, T-MED-db-3/10, T-MED-db-6, T-MED-db-7, T-MED-db-11. Seeds de anexos criam `vehicles`/`work_orders`/`damages` válidos (FK compostas) e o teardown apaga as filhas antes de `tenants`.
- Regressão: memória `tests/ass-03-metering.test.ts` continua `9/9`; `npm run check` verde.
## F4 — gerador da lista censurada + T-MED-db-8 (30, Docker)

- `scripts/gen-tenant-tables.mjs` (novo, PERMITIDO): conecta no Postgres (`DATABASE_URL`), lê `pg_class.relforcerowsecurity = true` ∩ coluna `tenant_id` NOT NULL (schema `public`, `relkind='r'`), aplica as exclusões `cloud_charge_rules`/`roles`/`platform_audit_logs` e grava `src/modules/subscription-billing/metering/censored-tables.ts` (`CENSORED_TENANT_TABLES`). Gerado pelo script, nunca editado à mão.
- Constante gerada: `111` tabelas. `npm run check` verde; o barrel `metering/index.ts` exporta `censored-tables.js`.
- `tests/ass-03-metering-census-db.test.ts` (T-MED-db-8) verde `1/1` no `devass03-pg`: a constante casa com o catálogo vivo e `cloud_charge_rules`/`roles`/`platform_audit_logs` não aparecem na lista.
- **Vermelho-controle/mutação:** em `origin/main` o gerador, a constante e o teste não existem (guarda ausente). Derivar do DMMF "toda tabela com `tenant_id`" acrescentaria `cloud_charge_rules`, `impound_payment_refs` e `roles` (medido no catálogo) → T-MED-db-8 fica vermelho nomeando as sobras.