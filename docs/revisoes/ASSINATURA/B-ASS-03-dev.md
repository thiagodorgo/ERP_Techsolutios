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

## TROCA DE DEV — 06/11 03:00 SP

- O `dev-ass03` (DeepSeek Pro, oficial) parou às 02:29 SP por falta de saldo. As fatias F0–F4 estavam commitadas e a F5 estava em andamento, sem commit.
- Às 03:00 SP (pico da DeepSeek), por ordem do dono (*"03h00: eu entro para orquestrar. e codificar tambem"*), o dev passa à identidade declarada **`dev-ass03-opus`** (Claude Opus 5.5, esforço médio; §C7 item 11(6)). É uma tarefa por vez: nenhum outro braço mexe no bloco enquanto isto roda.
- Retomada medida antes de confiar no parcial:
  - `npm run check` verde;
  - `ass-03-metering` + `ass-03-metering-jobs` + `job-worker-bootstrap` = 18/18;
  - as `-db` do bloco + `san3-05-leituras-de-plataforma-db` = 22/22 no `devass03-pg` (127.0.0.1:55503), depois de `prisma migrate deploy`.
- Nota de terreno: o `devass03-pg` foi publicado pelo dev anterior em `0.0.0.0:55503`, e não só em 127.0.0.1. Fica registrado, e o container é removido no fim do bloco.

## F5 — job com hora marcada + registro + bootstrap + rota + etiquetas (35) — `dev-ass03-opus`

- O que veio do parcial do DeepSeek e foi conferido no código:
  - `subscription.measure-daily` em `JOB_NAMES` e no registro, enfileirado no bootstrap;
  - medição às 12:00 e às 23:30 SP;
  - uma transação por organização em `withTenantRlsBudget` (GUC da organização, `statement_timeout` de 30 s);
  - `GET /platform/billing/tenants/:tenantId/usage` com `platform:billing:read`, sob `withTenantRls`.
- Lição das Emendas 2–4 ao §4.2 (o prompt do bloco as estende ao §4.3), com o diff contendo só as chaves novas:
  - **Censo o6r07c**, regenerado pelo gerador: `node --import tsx tests/helpers/o6r07c-census.ts gravar tests/fixtures/o6r07c-classificacao-vias.json` → 478 chaves, +1 chave `ROTA GET /api/v1/platform/billing/tenants/:tenantId/usage` classe `LEITURA`. Nenhuma chave existente mudou.
  - **Falso positivo do T8** (`TIPO-NAO-RESOLVIDO: subscription-billing.jobs.ts:66: part.type === type`): era o `formatToParts` do relógio de parede, e não um despacho de mensagem. Reescrito como mapa pelo nome da parte, sem mudar o comportamento. O censo depois disso deu `VIOLAÇÕES: 0`.
  - **Ratchet san3-05 (T13)**: 2 chaves L2 novas, `new PrismaMeteringSqlExecutor(tx)` e `new PrismaTenantUsageDailyRepository(tx)` em `metering-prisma.repository.ts:155-156`, ambas `PARAMETRO(tx)`. Entraram nas NOVAS com o motivo: o único chamador é `runSubscriptionMeasureDaily`, que cria o tx em `withTenantRlsBudget(prisma, tenant.id, …)`, e o medidor assere o GUC e o canário antes de gravar (R-MED-4).
  - **Contagens fixas**:
    - `san3-05-acessos-de-plataforma-guard.test.ts:297`: `ENABLE=115 FORCE=115` → `116`. A única entrada nova é `tenant_usage_daily`, conferida na saída do gerador (lista L0 FORCE).
    - `san3-05-runtime-role-guard-db.test.ts:1016`: DML `125` → `126`. O número vem de comando: `SELECT count(*) FROM pg_tables WHERE schemaname='public'` = 126 no cluster migrado. Esse teste exige psql/bash/setsid e roda só no CI Linux; o aceite dele é o CI.
- Bateria da fatia: `o6r07c-census-guard` + `san3-05-acessos-de-plataforma-guard` + `ass-03-metering` + `ass-03-metering-jobs` + `job-worker-bootstrap` + `san3-05-leituras-de-plataforma-db` = **97/97**, fail 0. `npm run check` sem erro. `git diff --check` limpo.
- Fora do PERMITIDO literal do §4.3, pela mesma classe das Emendas 2–4 (a revisar):
  - `tests/job-worker-bootstrap.test.ts`, porque o job novo entra no bootstrap e o teste enumera as varreduras;
  - os 3 arquivos de guard acima.


## F6 — R-MED-8: o banco pesa no rateio pelo espaço medido (40) — `dev-ass03-opus`

- **PREMISSA FALSA → Emenda 1 do orquestrador ao §4.3** (no plano, antes do código): o tipo `CloudUsageMetricKey` é a lista fechada `CLOUD_USAGE_METRIC_KEYS`, que também valida eventos externos. Ele atravessa `cloud-cost-allocation.types.ts` e `cloud-cost-allocation.engine.ts`, que estão fora do PERMITIDO.
  - Medido no banco: não há CHECK na métrica de base. `tenant_cloud_cost_allocations` só tem CHECK no método, e `storage_usage_weight` está na lista. **Não há migração.**
  - Feito: o novo tipo `AllocationBasisMetricKey = CloudUsageMetricKey | "db_bytes_estimated"` (só tipo) em `types.ts`, `engine.ts` e `rules.ts`.
  - `src/modules/cloud-usage/**` ficou **intocado**: nenhum evento externo pode declarar a chave.
- **Regra `database`** (`rules.ts`): `storage_usage_weight`, `basisMetricKeys: ["db_bytes_estimated", "audited_actions_count"]`, `estimate: true`. Sem medição, `resolveBasis` cai para as ações.
- **Derivação no `sumUsageBasis`:**
  - **dublê em memória**: `seed({ usageDaily })` e o último dia com db não nulo até `periodEnd`;
  - **Prisma**: `tx.tenantUsageDaily.findFirst` dentro do `forEachTenantRls` da organização, com `tenant_id` na cláusula (superusuário de dev/CI ignora RLS) e o canário `assertRowsBelongToTenant(..., "tenant_usage_daily")`;
  - `DERIVADAS` ganhou `db_bytes_estimated`.
- **Testes novos** (`tests/ass-03-rateio-banco.test.ts`):
  - T-MED-12: A 3 GB e B 1 GB dão 75/25 pelo espaço, mesmo com as ações em 1:3 ao contrário;
  - T-MED-12b: vale o último dia medido; o dia depois do período e o dia nulo não contam;
  - T-MED-13: sem medição, o rateio segue pelas ações;
  - T-MED-13b: a medição não vaza para EC2.
- **Mutação do plano**: pôr `db_bytes_estimated` DEPOIS de `audited_actions_count` deixou T-MED-12 e T-MED-12b vermelhos (2 fail). Restaurado; os mesmos 10/10 voltaram verdes.
  - Nota: a primeira restauração por `git checkout` desfez a edição da F6 em `rules.ts`. Restaurei pela cópia feita antes da mutação e conferi com o grep da ordem e os testes.
- **Suítes de rateio existentes**, em memória: `cloud-cost-allocation`, `cloud-cost-allocation-routes`, `san3-03-*` (compute-rules, derived-basis, basis-census, conservation, summary, system-org) mais as novas = **62/62**.
- **Com banco**, no `devass03-pg`, em série (`--test-concurrency=1`): `san3-03-derived-basis-db`, `san3-03-system-org-db`, `san3-03-import-scope-db`, `san3-05-leituras-de-plataforma-db`, os 3 `ass-03-*-db` e o ratchet `san3-05-acessos` = **77/77**.
  - Em paralelo, um caso da `san3-03-derived-basis-db` (T10–T12, papel sem bypass) falhou uma vez por disputa no cluster único. Sozinho deu 9/9, duas vezes. É a mesma classe ambiental já registrada (`db-catalog-write-guard` em paralelo).
- **Limite declarado:** o caminho Prisma do R-MED-8 não tem `-db` próprio, porque o plano pede T-MED-12/13 em memória. Fica para o revisor sênior conferir a leitura sob o GUC.
- `npm run check` sem erro.


## F7 — docs + bateria + PR (30) — `dev-ass03-opus`

- `docs/subscription-billing.md`: nova seção "Medição diária da franquia", com o que cada medida mede e o que não mede, a segurança, a rota, o rateio e o rollback.
- Rodados com sucesso: `npm run check`, `npm run lint`, `npm run build`, `node scripts/migration-transaction-guard.mjs` (124 migrações, 12 novas, 0 violações) e `git diff --check`.
- `npm test` local, na forma do CI (Windows, `devass03-pg` + `devass03-redis`): 4506 testes, 4496 aprovados, 8 reprovados, 2 pulados. Os 8 reprovados são os vermelhos de ambiente Windows que já existiam:
  - `runtime-role-guard-db` T14;
  - `bootstrap-platform-admin-db` T2.1;
  - `traccar-event-migration-drill-db` (EBUSY);
  - T10–T12 em paralelo, que passou sozinho e em série.
- PR #505 aberto. CI do head `d226919f`:
  - `backend`: 4524 testes, 4522 aprovados, 0 falhas, 2 pulados. Os vermelhos de ambiente passam no Linux, inclusive a contagem 126.
  - `backend-postgres`: 503/503.
  - `frontend`: 1635/1636. O único vermelho foi o T40, que conta os endpoints de plataforma.
- **Conserto do T40** (adendo à Emenda 1 ao §4.3): o script `scripts/san3-06b-endpoints-de-plataforma.mjs` mede **35** = 34 + `GET /api/v1/platform/billing/tenants/:tenantId/usage` (`platform:billing:read`, `subscription-billing.platform.routes.ts:161`). Só a linha 61 mudou, de 34 para 35. O teste local deu 3/3.

PRONTO PARA REVISÃO d5f8c8c2fd20dcd838bc5e8ad0acedfa4ec214c0 PR #505


## CONSERTO ÚNICO — achados do revisor sênior (`rev-ass03-senior-opus`, REPROVADO) — `dev-ass03-opus`

Fonte: `C:/Users/thiag/erp-pausa-2026-10-03/revisoes/rev-ass03-senior-parecer.md` (head julgado `0ca8bd5e`). Quem achou não consertou: o revisor foi um subagente com identidade nova; o conserto é do dev. A triagem segue o fluxo rápido: grave e simples se consertam agora, o resto vira pendência com dono.

**Consertados:**
- **G-1 (grave, perda de dado):** a falha de uma organização derrubava a volta inteira.
  - O laço agora é a função pura `measureTenantsSequentially` (`subscription-billing.jobs.ts`). Ela isola a falha de cada organização: registra `{tenantId, code}` no log e no resultado, só o código e sem mensagem, e segue para a próxima.
  - Teste: `tests/ass-03-metering-loop.test.ts`, T-MED-18 e T-MED-18b.
  - Mutação "laço sem try/catch": 2 fail.
- **G-2 (grave, erra dinheiro):** tabela estourada gravava a soma parcial.
  - Agora `tablesTimedOut.length > 0` deixa `dbBytes = null` (`metering.service.ts`).
  - A gravação usa `COALESCE(EXCLUDED.db_bytes_estimated, tenant_usage_daily.db_bytes_estimated)` no Prisma e `?? existing` na memória, para que uma amostra estourada não apague a medida completa já gravada no mesmo dia.
  - Testes: T-MED-db-13 (`users` mede e `audit_logs` estoura → NULL) e T-MED-db-14 (o COALESCE).
  - Mutações "sem anular" e "COALESCE→EXCLUDED": 1 fail cada.
- **M-1:** o handler não relança mais a falha geral. Ele registra o erro e re-enfileira UMA vez, então a retentativa da fila deixa de multiplicar a cadeia.
- **M-2:** o T-MED-db-1 agora cria o técnico de campo de verdade, com papel `field_technician` atribuído em `user_role_assignments`.
- **M-3:** o T-MED-db-12 prova o `GREATEST` no SQL real (3 e depois 2 → 3). Mutação `GREATEST→EXCLUDED`: 1 fail.
- **M-5:** `runSubscriptionMeasureDaily(now, { tenantIds })`. O teste `san3-05-leituras` mede só as organizações do próprio cenário, e o `san3-04a` voltou a verde.
- **B-3:** o T-MED-19 testa o filtro `platform` do laço real. Mutação "sem filtro": 1 fail.
- **B-6:** a quebra de linha final da fixture do censo foi devolvida. O censo T14 passa.

As 5 mutações foram restauradas pela cópia do arquivo, com md5 igual ao de antes, e o `git status` ficou só com o conserto.

**Bateria do conserto:**
- em memória: laço, job e medidor = 14/14;
- `ass-03-metering-db` = 9/9;
- guards (censo e ratchet), `san3-05-leituras-db`, `san3-04a`, rateio e bootstrap, em série = 104/104;
- `npm run check`, `npm run lint` e `npm run build` verdes.

**Viram pendência, não graves e com dono (registradas no `REGISTRO-PENDENTE.md` para o próximo PR de registro):**
- **M-4:** o "byte a byte" do R-MED-3 varia ±6 B depois de um VACUUM causado por outra organização. A causa não foi medida. Dono: B-ASS-04, que lê a medida para cobrar.
- **B-2:** o canário `LIMIT 1` só detecta bypass por acaso, sob superusuário. Em produção, quem protege é o G-DB-ROLE. Dono: B-SAN3-05.
- **B-4:** o SQL real de veículos não tem `-db`, o que o plano previu. Dono: B-ASS-12 (rastreamento).
- **B-5:** sem medição, o rateio do banco grava o método `storage_usage_weight` mesmo quando cai para as ações. Dono: B-ASS-09a.
- **B-7:** a classe já existia. O `(PD) sweep` disputa o catálogo de papéis em paralelo. Dono: B-SAN3-05.
- **M-1, a mesma classe em `charge.jobs.ts`:** fica fora do bloco. Dono: o módulo de diárias.
