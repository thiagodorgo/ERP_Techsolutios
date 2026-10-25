# B-TRC-02 — EMENDA v2.3 ao plano v2 (+ v2.1 + v2.2): resposta ao parecer DESFAVORÁVEL do DBA (D1 · R1 · R2 · R3), ANTES da junta

- **Identidade:** `planejador-trc02-v23-fable` (NOVA; Fable pelo frontmatter de `planejador-mestre`, `D-PLANEJADOR-MODELO-FABLE`). Papel: quem planeja (§C7.4-bis) — o DBA achou, outro agente desenvolve.
- **Regra:** `D-EMENDA-ANTES-DO-CODIGO` — esta emenda é plano; nada do repositório foi tocado por mim (worktree `C:/Users/AMP/w-trc02` só leitura; medições numa CÓPIA no scratchpad da sessão, em Postgres descartável via `ferramentas/teste-linux.sh`, P8 conferido: 7,9 GB livres, 0 trabalhos `tl*`).
- **Objeto medido:** head `27ebbdee` do ramo `feat/traccar-b-trc-02` (`prisma/` idêntico ao que o DBA mediu — nota de ref do parecer). Precedente: `origin/main` `079332a5` (B-SAN3-02: `20260878000000_invoice_complementary_title` + `tests/work-order-invoicing-migration-drill-db.test.ts` + `R-B-SAN3-02-1.md` §5–§6).
- **Variante:** Q1 = NÃO (dono, 19/10). Regras do Traccar continuam (nunca `tenant_id` do payload; quarentena; token em tempo constante; nenhuma porta pública).
- **Estado deste arquivo (P2):** COMPLETO em 2026-10-20T09:35Z — nasceu como esqueleto (seções `EM APURAÇÃO`) e foi preenchido seção a seção após cada medição; 0 placeholders restantes.

## 0. Resumo para quem decide (1 minuto)
1. **O DBA está certo e o bloqueante é defeito de produto:** o `prisma migrate deploy` 7.8.0 roda a migração A sentença a sentença em autocommit; falha após k = 1..17 deixa catálogo parcial (k = 16 deixa `traccar_ingress_receipts` SEM CHECK) e o redeploy não converge pelo CLI. Mesma classe que o B-SAN3-02 consertou em `079332a5` (C2-01), commit que não está na base do ramo.
2. **Conserto (1):** a A vira **transação explícita** — `BEGIN;` antes da 1ª sentença, `COMMIT;` depois da 17ª; **as 17 sentenças não mudam um byte**; cabeçalho e rodapé reescritos. Medido com o CLI real em Postgres descartável: deploy ec 0 com catálogo idêntico ao da forma autocommit; **17/17 k** atômicos (`diff_vs_main=0`) e convergentes por `resolve --rolled-back` + `deploy` (`diff_vs_hp=0`); `ShareLock` retido até o COMMIT. A **B não muda** (1 sentença = 1 transação; reaplicável, medido).
3. **Conserto (2) — R1/R2:** rodapé `-- down` no formato do precedente, **a guarda é a 1ª sentença** (conta toda linha de `vehicle_telemetry_events` + todo recibo ≠ `position`; falha com 22P02 e a contagem na mensagem) e a invocação única é `psql -v ON_ERROR_STOP=1 --single-transaction -f`. Medido: ponta A volta ao catálogo da main e re-up converge; ponta B para na 1ª (autocommit inclusive) sem apagar nada; sem a guarda, em transação única, o 23514 desfaz tudo (controle em autocommit reproduz o "SEM CHECK" do DBA).
4. **R3 (lock):** **aceito** com declaração — parágrafo literal para `docs/deployment.md` e `P-TRC02-LOCK-INDICE-RECIBO-PROD` (dono B-TRC-06). `CONCURRENTLY` rejeitado (não cabe em transação; 2 migrações a mais e caminho não atômico para uma tabela que nasce vazia em produção).
5. **Teste que prende:** `tests/traccar-event-migration-drill-db.test.ts` (molde: T-D(f) do B-SAN3-02) — 6 `test()`: up; down em transação única + re-up real; R1 (autocommit para na guarda); R2 (sem guarda, 23514, nada muda); **k = 1..17** pelo CLI real; B reaplicável. O G9 sai da suíte RLS (10 → 9). **Mutações:** +6 (M-E51/51b/51c/52/53/54h — as três de transação medidas vermelhas na sonda) e 8 re-executadas.
6. **Escopo acrescido:** o arquivo de teste novo; `docs/deployment.md` ganha um parágrafo; o resto já era PERMITIDO (A, G, `ci.yml`, `mutations.mjs`). `schema.prisma` e a B: 0 bytes. Contagens: testes 97 → 102; `backend-postgres` 434 → 439 (esperado); mutações 72 → 78. Perguntas ao dono: 0.

## 1. O que o DBA achou, re-lido (D1 bloqueia; R1, R2, R3 ressalvas) — defeito real ou artefato?
Auditoria (§C7.4, item "defeito real ou artefato?") — cada achado re-lido contra a prova executada pelo DBA (`dbatrc02/run3.out`, `run4.out`, `run-final.out`) e contra o precedente mergeado:

| Achado | Classe | Veredito desta planejadora | Por quê (evidência) |
|---|---|---|---|
| **D1** — a A não é atômica no `prisma migrate deploy` 7.8.0; k = 1..17 deixam catálogo parcial; k = 16 deixa `traccar_ingress_receipts` SEM CHECK; `resolve --rolled-back` + redeploy → P3018 | `bloqueia`, `dentro-do-bloco` | **DEFEITO REAL do produto.** A correção é obrigatória antes da junta | `run3.out`: `xact_start` do backend do deploy muda a cada sentença (51.811 → 51.872 → 51.893 → 52.018) e o escritor passa durante o `pg_sleep` pós-índice — logo cada sentença commita sozinha. `run4.out`: 17/17 k com `diff_vs_main` 28..41; k=16 `SEM-CHECK` e `INSERT … 'qualquer'` aceito; (ii) `resolve+redeploy` ec=1 `already exists P3018` em 17/17. É o MESMO fato que o B-SAN3-02 mediu (C2-01, `R-B-SAN3-02-1.md` §5: "falha depois da sentença k deixava 1..k aplicadas, P3018") e consertou com `BEGIN;`/`COMMIT;` no próprio arquivo — mergeado em `079332a5`, que **não está na base do ramo** (`merge-base --is-ancestor` → não). O plano v2 §6.1 assumiu "uma migração = uma transação" sem medir: hipótese herdada, não dado podre de arquivo — o fato só foi descoberto no repositório em 20/10, depois da v2 (19/10 03:18). |
| **R1** — a guarda do rodapé (passo 3) vem DEPOIS do `DROP TABLE` (passo 1); e não enxerga amostras `sample` penduradas em recibos `position` | ressalva, `dentro-do-bloco` | **REAL.** Corrigido em §3: guarda é a 1ª sentença e conta `vehicle_telemetry_events` inteira + recibos ≠ `position` | `run-final.out` rb2: com 5 recibos `event` + 5 linhas, o passo 3 manda PARAR, mas `to_regclass('vehicle_telemetry_events')` já é `f`. A amostra Q1 = NÃO nasce SÓ pendurada em recibo `position` (§Q1.7) → o critério "recibo ≠ position" tem ponto cego por construção. |
| **R2** — passos 4a/4b em autocommit: 4a apaga o CHECK, 4b falha (23514), o recibo fica SEM CHECK | ressalva, `dentro-do-bloco` | **REAL.** Corrigido em §3: o down é transação ÚNICA (`psql -v ON_ERROR_STOP=1 --single-transaction`), e o drill T-M(d) prova que sem a guarda o 23514 desfaz tudo | `run-final.out` rb2b (autocommit → `count 0` de CHECK) × rb3 (BEGIN/COMMIT → diff 0). Mesmo mecanismo que o DBA do B-SAN3-02 apontou (R2 de lá, `psql` sem `ON_ERROR_STOP` segue no erro). |
| **R3** — `ShareLock` em `traccar_ingress_receipts` por 1,7–3,9 s por 1 M de recibos (o `CREATE UNIQUE INDEX` de 4 colunas); escritas falham por `lock_timeout` na janela; leituras não | ressalva | **REAL, ACEITA com declaração** (§4): dev sem dado real, produção ainda não no ar; janela linear e medida; runbook + pendência com dono. Com a transação explícita o lock dura até o COMMIT (+ a cauda de 10 sentenças, cada uma < 40 ms — `run-final.out` "quebra por sentença") | `run1-tentativa1.out`/`run-final.out`: 3 745 ms e 1 583 ms no índice; demais < 40 ms; escritor 14/53 e 6/43 falhas; leitor 0/129. |
| R3.1 do próprio DBA ("atômico" com `DO $i$…$i$`) | artefato de sonda, **descartado pelo próprio DBA** | Lição que vira regra desta emenda: **nenhum dollar-quote na A nem no rodapé** — o `$…$` muda o modo de envio do Prisma (script inteiro numa consulta) e mascararia o que o drill mede | `run4.out` controle: com `DO $i$`, `xact_start` = 46.904 e `now` = 48.914 numa consulta só (o cabeçalho inteiro aparece em `query`). |

**Conclusão da auditoria:** o DBA mediu certo, com o CLI real, e o bloqueante é defeito de produto; a composição cobriu a competência (banco); nenhum dado podre no parecer. O que falhou foi o **plano** (hipótese "Prisma = transação por migração" não medida) — por isso o conserto nasce aqui, no topo, antes de qualquer código (`D-TOPO-NO-PLANO-E-EM-TODA-REPROVACAO`; devolução de DBA antes da junta tratada como reprovação de junta para este efeito, conforme o mandato do orquestrador).

## 2. Decisão (1): conserto da migração A — transação EXPLÍCITA; a B fica como está
### 2.1 Cabe tudo numa transação? (medido)
**Pergunta decisiva:** as 17 sentenças da A são DDL transacional no PostgreSQL 16 e o schema-engine do Prisma 7.8.0 (`schema-engine-cli 3c6e1927…` — o MESMO hash que o precedente mediu) honra `BEGIN;`/`COMMIT;` escritos no arquivo? **Resposta: SIM, medido com o CLI real, 17/17 prefixos** (§11 P3/P4/P8; Postgres 16.14 descartável, base no estado da main com 3 000 recibos legados).

- **Cabem numa transação (inventário):** `CREATE TABLE` (1) · `CREATE [UNIQUE] INDEX` **sem** `CONCURRENTLY` (6: cinco na tabela nova, um no recibo) · `ALTER TABLE … ADD CONSTRAINT … FOREIGN KEY` (4) · `ENABLE`/`FORCE ROW LEVEL SECURITY` (2) · `DROP POLICY IF EXISTS` + `CREATE POLICY` (2) · `DROP CONSTRAINT` + `ADD CONSTRAINT … CHECK … NOT VALID` (2). Nenhuma das formas que o Postgres recusa dentro de bloco de transação (`CREATE INDEX CONCURRENTLY`, `REINDEX CONCURRENTLY`, `CREATE DATABASE`/`TABLESPACE`, `VACUUM`, `ALTER SYSTEM`) aparece — `grep -ciE 'concurrently|create database|vacuum|alter system'` na A → 0. O `… NOT VALID` é só a forma que pula a varredura; é tão transacional quanto o `ADD CONSTRAINT` comum.
- **Prova por comportamento:** (P3) deploy da A v2.3 ec 0 em 1,82 s; catálogo (impressão digital de `public`, 3 269 linhas) **idêntico** ao da A original em autocommit (`diff_vs_ctl=0`); `prisma migrate diff` md5 `ea7c0780690a` nos dois; 2º deploy "No pending"; `status` ec 0. (P4) falha injetada depois de cada k = 1..17 → `diff_vs_main=0` nos 17, tabela/índice/política ausentes, CHECK `= 'position'` `valid=true`, 1 linha de A `fin=false,rb=false`; redeploy `P3009`; `resolve --rolled-back` ec 0; redeploy ec 0 e `diff_vs_hp=0`; `status` ec 0 — **17/17 convergem**, 6,4–7,6 s por k. (P8) com `pg_sleep(4)` depois da 7ª sentença, o backend do deploy mostra `xact_start` 1,3 s atrás de `now` (uma transação só) e segura `ShareLock` em `traccar_ingress_receipts`: o escritor com `lock_timeout` 300 ms falha, o leitor passa — exatamente o inverso do `run3.out` do DBA sobre o objeto (onde o escritor passava, porque cada sentença commitava).
- **Mecanismo do CLI (igual ao precedente):** a sentença que falha deixa a conexão em "aborted transaction"; o engine tenta gravar `logs` na mesma conexão e recebe `25P02` → o CLI imprime só `Error: ERROR: current transaction is aborted, commands ignored until end of transaction block` (P4 k=1, cauda) e a causa real fica no log do servidor. A linha "started" de `_prisma_migrations` persiste (gravada em autocommit antes do `BEGIN`) → `P3009` no redeploy → `resolve --rolled-back` → deploy limpo. Custo aceito e declarado no cabeçalho da A e em `docs/deployment.md` (§4); o drill assere **estado**, nunca mensagem.
### 2.2 Texto exato da migração A (v2.3) — as 17 sentenças NÃO mudam um byte
**Receita (o dev aplica EXATAMENTE isto; a cadeira do DBA confere por diff de sentenças):** o arquivo novo = cabeçalho novo (abaixo) + `BEGIN;` + linha vazia + **o corpo do objeto, byte a byte** (da linha `CREATE TABLE "vehicle_telemetry_events" (` até a linha `  CHECK ("message_kind" IN ('position', 'event')) NOT VALID;`, inclusive os três comentários internos `-- (2) …`, `-- A-12: …`, `-- (3) …`) + linha vazia + `COMMIT;` + linha vazia + rodapé `-- down` novo. Régua de forma (comando do dev e da cadeira): extrair as sentenças executáveis dos dois arquivos (`grep -vE '^\s*--'` → juntar → cortar em `;`) e `diff` — **0 linhas** depois de retirar `BEGIN;`/`COMMIT;` (medido nesta emenda: `sentencas: orig=17 v23=19`, `DIFF=0`). Sem `$…$` no arquivo (0 ocorrências, medido), sem `GRANT`/`REVOKE`/`OWNER TO` (0, medido). Arquivo em LF (como o objeto: `file` → "UTF-8 text").

**Arquivo completo (`prisma/migrations/20260879000000_vehicle_telemetry_events/migration.sql`, v2.3 — gerado pela receita; sha256 `3713c341…` do objeto vira o do arquivo abaixo):**
```sql
-- B-TRC-02 (plano v2 §6.1, variante Q1 = NÃO por decisão do dono de 19/10 — §Q1.7) — telemetria VEICULAR do Traccar. ADITIVA e forward-only.
-- Carimbo renumerado pelo orquestrador (20260878000000 é do B-SAN3-02): esta é a 20260879000000; o VALIDATE é a 20260880000000.
-- O QUE TOCA: (1) cria vehicle_telemetry_events; (2) em traccar_ingress_receipts: UM índice único novo (alvo da FK de 4 colunas) e o
--   CHECK de message_kind alargado (DROP + ADD … NOT VALID; o VALIDATE vai na 20260880000000, N2-06). Nada mais é tocado.
-- RLS e acesso: DML pelo papel de runtime via DEFAULT PRIVILEGES do migrador (scripts/db-runtime-role.sh); NENHUMA concessão aqui.
-- Os domínios numéricos dos CHECKs abaixo são os MESMOS de src/modules/telemetry/vehicle-telemetry.bounds.ts (uma fonte; B9/F9 provam).
-- Q1 = NÃO: a amostra só nasce com a posição ACEITA, pendurada no recibo dela; "uma amostra por recibo" é o UNIQUE (tenant_id, receipt_id).
--
-- TRANSAÇÃO EXPLÍCITA (emenda v2.3; achado D1 do DBA de 2026-10-20 — o mesmo fato do C2-01 do B-SAN3-02, 20260878000000): o
-- `prisma migrate deploy` 7.8 executa o script sentença a sentença, em autocommit — NÃO numa transação única (medido: falha depois
-- da sentença k deixava 1..k aplicadas; k = 16 deixava traccar_ingress_receipts SEM o CHECK de message_kind; `resolve --rolled-back`
-- + redeploy quebrava em P3018). Por isso as 17 sentenças vão entre BEGIN e COMMIT — todas DDL transacionais (sem CONCURRENTLY):
-- falha em qualquer uma → nada aplicado (drill T-M(e)). Deploy falho: o CLI mostra só "current transaction is aborted" (a causa real
-- está no log do servidor Postgres); recuperação = `prisma migrate resolve --rolled-back 20260879000000_vehicle_telemetry_events` e
-- `prisma migrate deploy` de novo (converge; T-M(e)). Lock: o CREATE UNIQUE INDEX do recibo segura ShareLock em traccar_ingress_receipts
-- até o COMMIT (escritas esperam; leituras não) — ~2-4 s por 1 M de recibos, janela declarada em docs/deployment.md.
-- ROLLBACK: o bloco `-- down` no fim deste arquivo (manual, transação única, guarda ANTES de qualquer DROP; só em ambiente SEM dado real).
BEGIN;

CREATE TABLE "vehicle_telemetry_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "vehicle_id" UUID NOT NULL,
  "binding_id" UUID NOT NULL,
  "receipt_id" UUID NOT NULL,
  "kind" TEXT NOT NULL,
  "alarm_code" TEXT,
  "source" TEXT NOT NULL DEFAULT 'forward',
  "occurred_at" TIMESTAMPTZ(6) NOT NULL,
  "received_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "traccar_event_id" BIGINT,
  "traccar_position_id" BIGINT,
  "ignition" BOOLEAN,
  "motion" BOOLEAN,
  "odometer_m" BIGINT,
  "total_distance_m" BIGINT,
  "engine_hours_s" BIGINT,
  "power_mv" INTEGER,
  "battery_level_pct" INTEGER,
  CONSTRAINT "vehicle_telemetry_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "vehicle_telemetry_events_kind_check" CHECK ("kind" IN (
    'sample','device_online','device_unknown','device_offline','device_moving','device_stopped','device_overspeed',
    'ignition_on','ignition_off','alarm')),
  CONSTRAINT "vehicle_telemetry_events_source_check" CHECK ("source" IN ('forward','reconciliation')),
  CONSTRAINT "vehicle_telemetry_events_alarm_code_check"
    CHECK (("kind" = 'alarm') = ("alarm_code" IS NOT NULL) AND ("alarm_code" IS NULL OR "alarm_code" ~ '^[a-zA-Z]{1,32}$')),
  CONSTRAINT "vehicle_telemetry_events_measures_check" CHECK (
    ("kind" = 'sample' AND ("ignition" IS NOT NULL OR "motion" IS NOT NULL OR "odometer_m" IS NOT NULL
       OR "total_distance_m" IS NOT NULL OR "engine_hours_s" IS NOT NULL OR "power_mv" IS NOT NULL OR "battery_level_pct" IS NOT NULL))
    OR ("kind" <> 'sample' AND "ignition" IS NULL AND "motion" IS NULL AND "odometer_m" IS NULL AND "total_distance_m" IS NULL
       AND "engine_hours_s" IS NULL AND "power_mv" IS NULL AND "battery_level_pct" IS NULL)),
  CONSTRAINT "vehicle_telemetry_events_ranges_check" CHECK (
    ("odometer_m" IS NULL OR ("odometer_m" BETWEEN 0 AND 9007199254740991))
    AND ("total_distance_m" IS NULL OR ("total_distance_m" BETWEEN 0 AND 9007199254740991))
    AND ("engine_hours_s" IS NULL OR ("engine_hours_s" BETWEEN 0 AND 9007199254740991))
    AND ("power_mv" IS NULL OR ("power_mv" BETWEEN 0 AND 1000000))
    AND ("battery_level_pct" IS NULL OR ("battery_level_pct" BETWEEN 0 AND 100)))
);

CREATE UNIQUE INDEX "vehicle_telemetry_events_tenant_id_id_key" ON "vehicle_telemetry_events"("tenant_id", "id");
CREATE UNIQUE INDEX "vehicle_telemetry_events_receipt_key" ON "vehicle_telemetry_events"("tenant_id", "receipt_id");
CREATE INDEX "vehicle_telemetry_events_vehicle_time_idx" ON "vehicle_telemetry_events"("tenant_id", "vehicle_id", "occurred_at" DESC);
CREATE INDEX "vehicle_telemetry_events_vehicle_kind_time_idx" ON "vehicle_telemetry_events"("tenant_id", "vehicle_id", "kind", "occurred_at" DESC);
CREATE INDEX "vehicle_telemetry_events_time_idx" ON "vehicle_telemetry_events"("tenant_id", "occurred_at");

-- (2) traccar_ingress_receipts: alvo da FK de 4 colunas (índice único NOVO; redundante com a PK, necessário para a FK)
CREATE UNIQUE INDEX "traccar_ingress_receipts_tenant_id_id_vehicle_binding_key"
  ON "traccar_ingress_receipts"("tenant_id", "id", "vehicle_id", "binding_id");

ALTER TABLE "vehicle_telemetry_events" ADD CONSTRAINT "vehicle_telemetry_events_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "vehicle_telemetry_events" ADD CONSTRAINT "vehicle_telemetry_events_tenant_id_vehicle_id_fkey"
  FOREIGN KEY ("tenant_id", "vehicle_id") REFERENCES "vehicles"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "vehicle_telemetry_events" ADD CONSTRAINT "vehicle_telemetry_events_tenant_id_binding_id_fkey"
  FOREIGN KEY ("tenant_id", "binding_id") REFERENCES "vehicle_tracking_bindings"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- A-12: a linha e o recibo concordam em viatura E vínculo — no banco, não no código.
ALTER TABLE "vehicle_telemetry_events" ADD CONSTRAINT "vehicle_telemetry_events_receipt_fkey"
  FOREIGN KEY ("tenant_id", "receipt_id", "vehicle_id", "binding_id")
  REFERENCES "traccar_ingress_receipts"("tenant_id", "id", "vehicle_id", "binding_id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "vehicle_telemetry_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "vehicle_telemetry_events" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "vehicle_telemetry_events_tenant_isolation" ON "vehicle_telemetry_events";
CREATE POLICY "vehicle_telemetry_events_tenant_isolation" ON "vehicle_telemetry_events"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- (3) CHECK de message_kind do recibo: DROP + ADD NOT VALID (o VALIDATE vai na migração seguinte). 'position' ⊂ lista nova.
ALTER TABLE "traccar_ingress_receipts" DROP CONSTRAINT "traccar_ingress_receipts_message_kind_check";
ALTER TABLE "traccar_ingress_receipts" ADD CONSTRAINT "traccar_ingress_receipts_message_kind_check"
  CHECK ("message_kind" IN ('position', 'event')) NOT VALID;

COMMIT;

-- down (MANUAL, nunca automático; só em ambiente SEM dado real; invocar `psql -v ON_ERROR_STOP=1 --single-transaction -f <down.sql>`:
-- a guarda é a 1ª sentença e PARA (22P02, com a contagem na mensagem) antes de qualquer DROP; sem --single-transaction o 23514 da
-- 5ª sentença deixaria o recibo SEM CHECK (R2 do DBA). Provado no drill T-M(b)/(c)/(d): up → down → re-up pelo `migrate deploy`):
--   SELECT CASE WHEN n = 0 THEN 'ok' ELSE ('PARE: ' || n || ' linha(s) de telemetria ou recibo(s) de evento - dado nao se apaga para voltar')::int::text END AS guarda_do_down
--     FROM (SELECT (SELECT count(*) FROM "vehicle_telemetry_events") + (SELECT count(*) FROM "traccar_ingress_receipts" WHERE "message_kind" <> 'position') AS n) g;
--   DROP TABLE IF EXISTS "vehicle_telemetry_events";
--   DROP INDEX IF EXISTS "traccar_ingress_receipts_tenant_id_id_vehicle_binding_key";
--   ALTER TABLE "traccar_ingress_receipts" DROP CONSTRAINT "traccar_ingress_receipts_message_kind_check";
--   ALTER TABLE "traccar_ingress_receipts" ADD CONSTRAINT "traccar_ingress_receipts_message_kind_check" CHECK ("message_kind" IN ('position'));
--   DELETE FROM "_prisma_migrations" WHERE "migration_name" IN ('20260879000000_vehicle_telemetry_events', '20260880000000_validate_receipt_message_kind_check');
--   -- a tabela leva consigo política, índices e as 4 FKs; toca traccar_ingress_receipts (CHECK e um índice) e _prisma_migrations; nenhuma outra tabela.
```

**Por que esta forma e não outra (decididas; não reabrir):**
- **`BEGIN;`/`COMMIT;` no próprio script, e não "migração idempotente" (`IF NOT EXISTS` + `DROP IF EXISTS`)** — o precedente mediu e decidiu o mesmo (`R-B-SAN3-02-1.md` §5: "a alternativa idempotente NÃO é necessária e não se adota"); aqui seria pior: 17 sentenças mudariam de texto, e `ADD CONSTRAINT` não tem `IF NOT EXISTS`.
- **Ordem das 17 sentenças inalterada** — o DBA mediu lock e tempo nessa ordem (item 1); reordenar reabriria a medição sem ganho: dentro da transação todo lock dura até o COMMIT de qualquer modo.
- **Nada de `CREATE INDEX CONCURRENTLY`** — não pode estar numa transação (`25001`), exigiria uma 3ª migração NÃO atômica com limpeza de índice `INVALID`, para uma tabela que em produção terá 0 linhas na ativação (§4).
- **Cabeçalho declara o mecanismo, a recuperação e a janela de lock** — como a `20260878000000`; o operador que vir "current transaction is aborted" no CLI sabe onde está a causa (log do servidor) e o que fazer (`resolve --rolled-back` + `deploy`).
- **O rodapé é o do §3** (guarda em 1º; transação única; formato `-- down` + `--   SQL`, o que o `downStatements()` do molde lê).
### 2.3 A migração B (só `VALIDATE`) — precisa de BEGIN/COMMIT? NÃO (medido)
**Decisão: a B não muda (0 bytes).** Uma sentença (`ALTER TABLE … VALIDATE CONSTRAINT …`) é a sua própria transação no autocommit do Prisma; `BEGIN;`/`COMMIT;` em volta não acrescentariam atomicidade (não há "prefixo parcial" de uma sentença) e dariam ao drill um "k" sem significado. O que importa na B é **reaplicabilidade**, e ela está medida (§11 P5): falha injetada depois do `VALIDATE` → deploy ec 1 (`P3018`), o `VALIDATE` **já valeu** (`valid=true` — commitou sozinho antes da falha), B com 1 linha falha e A aplicada; redeploy → `P3009`; `resolve --rolled-back <B>` ec 0; redeploy ec 0 → `diff_vs_hp=0`, B `rb=true` + B `fin=true`. O `VALIDATE` é idempotente (sobre CHECK já válido é no-op), logo o caminho converge por construção. O T-M(f) prende isso e assere o estado intermediário medido (`checkValid: true` com B falha). Separar o `VALIDATE` numa migração própria continua necessário (N2-06): na MESMA transação da A, o `ACCESS EXCLUSIVE` do `DROP`/`ADD CONSTRAINT` ficaria segurado durante a varredura de validação; com a B à parte, a varredura roda sob `SHARE UPDATE EXCLUSIVE` (o DBA mediu ~0,1 s sem bloquear DML).

**Armadilha registrada para o drill (e para qualquer operador):** a B aplicada sobre a main SEM a A é um no-op com ec 0 — o CHECK antigo tem o mesmo nome e já é válido. Por isso a template do T-M(e)/(f) exclui A **e** B (§5.1).

## 3. Decisão (2): o rodapé `-- down` — guarda ANTES de qualquer DROP e transação única (R1 · R2)
**Decisão:** o rodapé de rollback da A é reescrito no formato do precedente (`-- down (…)` + linhas `--   <SQL>`; comentários internos como `--   -- texto`) com **seis** sentenças, nesta ordem: **(1) a GUARDA**, (2) `DROP TABLE IF EXISTS "vehicle_telemetry_events"`, (3) `DROP INDEX IF EXISTS …_tenant_id_id_vehicle_binding_key`, (4) `DROP CONSTRAINT …message_kind_check`, (5) `ADD CONSTRAINT … CHECK ("message_kind" IN ('position'))`, (6) `DELETE FROM "_prisma_migrations" …`. Texto literal: ver o fim do arquivo em §2.2. **Invocação única autorizada:** `psql -v ON_ERROR_STOP=1 --single-transaction -f <down.sql>` (o cabeçalho do rodapé diz isto). Só em ambiente SEM dado real; nunca como recuperação de deploy falho (essa é `resolve --rolled-back` + `deploy`, §2).

**A guarda (R1):** uma única sentença SQL, sem função e **sem dollar-quote**, que PARA com erro quando há dado:
```sql
SELECT CASE WHEN n = 0 THEN 'ok' ELSE ('PARE: ' || n || ' linha(s) de telemetria ou recibo(s) de evento - dado nao se apaga para voltar')::int::text END AS guarda_do_down
  FROM (SELECT (SELECT count(*) FROM "vehicle_telemetry_events") + (SELECT count(*) FROM "traccar_ingress_receipts" WHERE "message_kind" <> 'position') AS n) g;
```
- `n` soma **toda** linha de `vehicle_telemetry_events` (amostras `sample` penduradas em recibos `position` — o ponto cego do R1 — e eventos) **e** todo recibo ≠ `position`. `n = 0` → devolve `ok` e o down segue; `n > 0` → o cast `::int` do texto falha com **SQLSTATE 22P02** e a mensagem do servidor carrega o texto e a contagem (`invalid input syntax for type integer: "PARE: 1 linha(s) …"`). Sob `ON_ERROR_STOP=1` o psql para na 1ª sentença: nenhum DROP chegou a ser enviado (R1) — e, sob `--single-transaction`, mesmo um operador que rode sentença a sentença em autocommit (R1 literal) para ANTES de qualquer DROP, porque a guarda é a primeira (medido: §11 P6c).
- Por que não `DO $$ … RAISE EXCEPTION … $$`: o DBA mediu que `$…$` muda o modo de envio do Prisma (`run4.out`, controle do R3.1). O rodapé é comentário, mas o arquivo da migração é lido inteiro pelo splitter do Prisma; a regra é não ter dollar-quote em arquivo cujo comportamento de transação o drill mede. Por que não `1/0`: a mensagem não diria nada ao operador.
- O `DROP CONSTRAINT` (4) fica **sem** `IF EXISTS`: em estado inesperado o down falha fechado (e, na transação, nada muda).

**Transação única (R2):** com `--single-transaction`, (5) falhando por `23514` (há recibo `event` e a guarda foi pulada) desfaz (2)–(4) — o CHECK alargado e a tabela ficam (medido: §11 P6d); sem a flag, o próprio DBA mediu o recibo ficar SEM CHECK (rb2b; reproduzido no P6e como controle). O (6) `DELETE FROM "_prisma_migrations"` entra na mesma transação: ou tudo volta ao estado da main, ou nada.

**Parse pelo teste (uma fonte, o arquivo):** `downStatements()` do molde — linhas após `-- down` que casam `/^--\s{2,}\S/`, tirado o prefixo `--\s+` e o comentário de cauda ` -- …`, descartadas as que sobram começando por `--`, juntadas e cortadas em `;` de fim de linha. O cabeçalho de 3 linhas do rodapé começa com `-- ` (um espaço) e por isso NÃO entra. Medido nesta emenda com o mesmo parser (`down-extract.mjs`): **6 sentenças, a 1ª é a guarda** (§11 P6).

**O que muda contra o rodapé do objeto:** a guarda sai do passo 3 e vira a 1ª sentença, e passa a contar a tabela inteira; os números de passo saem (quebravam o parse e sugeriam execução "um a um"); o `SELECT count(*)` que só informava vira sentença que PARA; o comentário final vira `--   -- …` (o parser o descarta); nenhum DROP/ALTER do rodapé muda de texto. O G9 antigo executava o rodapé sentença a sentença em autocommit e tolerava a ordem com a guarda em 3º — esse teste muda de casa e de enunciado (§5.2).

## 4. Decisão (3): R3 — o lock do índice único no recibo
**Decisão: o lock é ACEITO, com a janela DECLARADA no runbook e pendência com dono para produção** — não se muda a forma do índice.

**O que o lock é, na forma v2.3 (muda um pouco contra o que o DBA mediu):** o `CREATE UNIQUE INDEX` de 4 colunas em `traccar_ingress_receipts` pega `ShareLock` (escritas esperam; leituras não) pelo tempo da construção — 1 583 a 3 745 ms por 1 001 000 recibos, linear no volume (DBA, item 1). Com a transação explícita esse lock **dura até o COMMIT**: soma-se a cauda de 10 sentenças (4 FKs, RLS, política, DROP/ADD CHECK), cada uma < 40 ms (DBA, "quebra por sentença") → **+ < 0,4 s**; e o `ACCESS EXCLUSIVE` do `DROP`/`ADD CONSTRAINT` do recibo (16ª/17ª) também vai até o COMMIT — dezenas de ms, agora bloqueando leituras nesse instante (o DBA mediu leitor 0/129 bloqueado na forma autocommit; aqui o DBA re-mede com volume na junta). Medido nesta emenda (§11 P8, sem volume): `ShareLock` retido no `pg_sleep` pós-índice, escritor barrado por `lock_timeout`, leitor passa. A ingestão (`withTenantRlsBudget`, `lock_timeout` local de 1 s) devolve 503 nessa janela; o forward de posição do Traccar re-tenta, o de evento não (S-E3) — eventos na janela se perdem.

**Por que aceitar:** (1) produção não está no ar; o pré-requisito de ingestão em produção é o B-SAN3-05 e a tabela de recibos nasce com 0 linhas — na ativação a janela é ~0 s; (2) extrapolação linear: 100 mil recibos ≈ 0,16–0,37 s, abaixo do `lock_timeout` da ingestão — sem 503; (3) o volume que torna a janela relevante (≥ 1 M) só existe depois de meses de ingestão, e o B-TRC-05 (expurgo de 90 dias) é o bloco que limita o crescimento — a decisão de janela pertence a quem ativa a produção (B-TRC-06). **Por que não `CREATE UNIQUE INDEX CONCURRENTLY`:** não cabe em transação (`25001`); exigiria uma 3ª migração NÃO atômica (índice `INVALID` em caso de falha, limpeza manual, `DROP INDEX IF EXISTS` antes de re-tentar) e uma 4ª para a FK de 4 colunas que depende dele — três arquivos e um caminho não atômico para evitar segundos de espera numa tabela que em produção estará vazia. **Por que não tirar a FK de 4 colunas:** é o A-12 (linha e recibo concordam em viatura E vínculo, no banco) — invariante de produto, não de desempenho.

**Risco de deadlock, declarado:** dentro da transação a A segura `ShareLock` no recibo e, em seguida, pede `SHARE ROW EXCLUSIVE` em `tenants`, `vehicles` e `vehicle_tracking_bindings` (FKs). Uma transação de ingestão que já segure `ROW EXCLUSIVE` numa dessas e peça o recibo forma ciclo; o Postgres resolve em `deadlock_timeout` (1 s) matando uma das duas: se mata a ingestão → 503 (como já acontece pela janela); se mata a migração → **nada aplicado** (atomicidade do §2) e `resolve --rolled-back` + `deploy` de novo. Nenhum dos dois caminhos deixa catálogo parcial ou dado perdido. O runbook manda aplicar com o forward pausado quando houver volume — o que elimina o ciclo.

**Parágrafo literal para `docs/deployment.md`** (inserir logo depois do bloco "Eventos do Traccar (B-TRC-02)", que termina em `(P-TRC02-LIMITES-POR-ROTA-PROD).`, l.401 do head):
> **Migração `20260879000000_vehicle_telemetry_events` — janela de lock e deploy falho (B-TRC-02, emenda v2.3).** A migração é uma transação explícita (`BEGIN`/`COMMIT`): o `CREATE UNIQUE INDEX` de 4 colunas em `traccar_ingress_receipts` segura `ShareLock` na tabela **até o COMMIT** — escritas (ingestão de posição e de evento) esperam e, vencido o `lock_timeout` da ingestão (1 s), devolvem 503; leituras só param nos milissegundos finais (troca do CHECK). Medido (DBA, 2026-10-20): 1,6–3,7 s por 1 000 000 de recibos, linear no volume; a cauda depois do índice soma menos de 0,4 s. Com até ~100 mil recibos a janela fica abaixo do `lock_timeout` e não há 503. Com volume: aplicar com o `forward` do Traccar pausado ou em janela anunciada — eventos nessa janela se perdem (o forward de evento não re-tenta); posições re-tentam. Deploy falho em qualquer sentença: NADA fica aplicado; o CLI mostra só "current transaction is aborted" — a causa está no log do servidor Postgres; recuperação = `prisma migrate resolve --rolled-back 20260879000000_vehicle_telemetry_events` e `prisma migrate deploy` (converge; é o passo documentado, não o `resolve` às cegas que o Runbook A proíbe). O `down` do arquivo é manual, transação única e só sem dado real (`psql -v ON_ERROR_STOP=1 --single-transaction -f`).

**Pendência nomeada:** `P-TRC02-LOCK-INDICE-RECIBO-PROD` — dono **B-TRC-06** (ativação/produção do Traccar); gatilho: antes de aplicar a 20260879 numa base com > 100 mil recibos, pausar o forward ou anunciar janela; medir a janela real na base de produção/staging e registrar. Prioridade MÉDIA. O DBA re-mede o lock com 1 M na junta (item 1), agora na forma transacional.

## 5. O teste que prende a atomicidade — `tests/traccar-event-migration-drill-db.test.ts` (molde: T-D(f) do B-SAN3-02)
### 5.1 Arquivo, arnês e os 6 `test()` (T-M(a)–(f))
**Arquivo NOVO:** `tests/traccar-event-migration-drill-db.test.ts`. **Molde (regra do espelho):** `tests/work-order-invoicing-migration-drill-db.test.ts` da `origin/main` `079332a5` — o dev COPIA de lá o arnês (`bootstrap` com base própria `CREATE DATABASE … TEMPLATE template0` + `migrate deploy` pelo CLI real `prisma/build/index.js` num processo filho; `after` com `DROP DATABASE … WITH (FORCE)` de todas as bases e `rmSync` do temporário), os ajudantes `rawStatements` / `upStatements` / `downStatements` / `variantWithFailureAfter` / `runPrisma` / `cliTail` / `databaseUrlFor` / `createFromTemplate` / `migrationRows`, a `INJECTED_FAILURE` (`ALTER TABLE "drill_nao_existe" ADD COLUMN "x" INT`) e o `prisma.config.mjs` temporário (`--config`). Muda só o que é deste bloco: `MIGRATION_A`/`MIGRATION_B`, `catalogState()` e os casos. Nunca a base compartilhada; sem `DATABASE_URL` → 1 `test()` `skip` declarado (como o molde; o guard de zero pulos do `backend-postgres` pune o pulo).

**`catalogState(db)` (o que se compara — sempre por consulta ao catálogo, nunca pela mensagem do CLI):**
`{ table, receiptIndex, policies, newTableIndexes, fks, check, checkValid }` = `to_regclass('public.vehicle_telemetry_events') IS NOT NULL` · `count(*) FROM pg_indexes WHERE indexname = 'traccar_ingress_receipts_tenant_id_id_vehicle_binding_key'` · `count(*) FROM pg_policies WHERE tablename = 'vehicle_telemetry_events'` · `count(*) FROM pg_indexes WHERE tablename = 'vehicle_telemetry_events'` · `count(*) FROM pg_constraint WHERE conrelid = 'vehicle_telemetry_events'::regclass AND contype = 'f'` · `pg_get_constraintdef(oid)` e `convalidated` de `traccar_ingress_receipts_message_kind_check`.
- **ANTES** (= estado da main): `{ table: false, receiptIndex: 0, policies: 0, newTableIndexes: 0, fks: 0, check: "CHECK ((message_kind = 'position'::text))", checkValid: true }`.
- **INTEIRO** (A + B): `{ table: true, receiptIndex: 1, policies: 1, newTableIndexes: 6, fks: 4, check: "CHECK ((message_kind = ANY (ARRAY['position'::text, 'event'::text])))", checkValid: true }` — 6 = pkey + `tenant_id_id_key` + `receipt_key` + 3 índices de leitura; os textos dos CHECKs são os impressos pela sonda (§11 P2/P4).

**Forma (dentro de `upStatements()`, chamada por T-M(a) e T-M(e)):** `rawStatements()[0] === "BEGIN"`, `.at(-1) === "COMMIT"`, **17** sentenças entre eles, nenhum outro `BEGIN`/`COMMIT`. **`downStatements()`**: 6 sentenças; `[0]` casa `/^SELECT CASE WHEN n = 0 THEN 'ok'/` e contém `"vehicle_telemetry_events"` **e** `"message_kind" <> 'position'`; `[1]` começa por `DROP TABLE IF EXISTS "vehicle_telemetry_events"`; `[5]` por `DELETE FROM "_prisma_migrations"`.

**Armadilha da template (medida, §11 P1/P5 — o dev NÃO precisa redescobrir):** a B é `VALIDATE CONSTRAINT traccar_ingress_receipts_message_kind_check`; sobre a main esse CHECK existe com o MESMO nome (`= 'position'`, do B-TRC-01) e já é válido → a B aplicada sem a A é um no-op com ec 0. Se a B ficasse na template `_main`, `_prisma_migrations` a marcaria aplicada e, depois da A, o CHECK alargado ficaria `NOT VALID` para sempre no drill. Por isso a template **exclui A e B** (`cpSync` de todas as outras), e o diretório de variante recebe `A_k` (variante) **e** `B` (limpa).

**Replay do down (ajudante `replayDown(db, statements, mode)`):** `mode = "single-transaction"` → `db.$transaction(async (tx) => { for (const s of statements) s.startsWith("SELECT") ? await tx.$queryRawUnsafe(s) : await tx.$executeRawUnsafe(s); })`; `mode = "autocommit"` → o mesmo laço sobre `db`, parando na 1ª rejeição (é o operador do R1). T-M(b) e T-M(d) usam `single-transaction`; T-M(c) usa `autocommit`.

**Os 6 `test()` (nome = propriedade; ordem do arquivo = ordem de execução; cada um com o vermelho-controle que o mata):**

- **T-M(a)** `[T-M(a)] migrate deploy numa base própria aplica A e B: catálogo INTEIRO (tabela com 6 índices, 4 FKs e política; índice de 4 colunas no recibo; CHECK alargado e VALIDADO); forma: BEGIN, 17 sentenças, COMMIT`. Mede: `drill()` → `migrationRows` de A e de B com `finished: 1` → `catalogState` = INTEIRO → `upStatements()`. Vermelho: M-E51 (forma), M-E25/M-E40 (catálogo).
- **T-M(b)** `[T-M(b)] down (ponta A, sem dado) em transação ÚNICA volta o catálogo ao da main (tabela e índice do recibo ausentes, CHECK = 'position' válido, _prisma_migrations sem A/B); o re-up pelo migrate deploy REAL converge (A e B aplicadas, CHECK validado)`. Mede: `replayDown(db, downStatements(), "single-transaction")` → ANTES e `migrationRows` de A/B `total: 0` → `runPrisma(["migrate", "deploy"])` na base do drill com o diretório real → INTEIRO, A/B `finished: 1`. É o caminho feliz; os controles são T-M(c)/(d).
- **T-M(c)** `[T-M(c)] ponta B, forma R1 (operador em AUTOCOMMIT, sentença a sentença): com 1 amostra 'sample' pendurada em recibo 'position' e NENHUM recibo de evento, a 1ª sentença (a guarda) falha com 22P02 e a mensagem traz a contagem; nada foi apagado (tabela com a linha, índice do recibo e CHECK alargado intactos)`. Mede: semear organização + viatura + vínculo + recibo `position` + 1 linha `sample` pela conexão admin da base do drill; `replayDown(db, downStatements(), "autocommit")` → rejeição na 1ª com SQLSTATE `22P02` e `assert.match(mensagem, /PARE: 1 linha/)`; `catalogState` = INTEIRO; `count(*)` = 1. Vermelho: **M-E52** (guarda depois do `DROP TABLE`: a tabela some antes de parar), **M-E53** (guarda só com recibos ≠ position: não para e o down vai até o fim).
- **T-M(d)** `[T-M(d)] ponta B, forma R2 (SEM a guarda, transação ÚNICA): com 1 recibo 'event' e a sua linha, o re-estreitamento do CHECK falha (23514) e NADA muda (tabela com a linha, índice do recibo, CHECK alargado e válido, A e B em _prisma_migrations)`. Mede: semear recibo `event` + linha `device_online`; `replayDown(db, downStatements().slice(1), "single-transaction")` → `23514`; `catalogState` = INTEIRO, `count(*)` = 1, A/B `finished: 1`. Vermelho: **M-E54h** (arnês: `"autocommit"` no lugar de `"single-transaction"` → o CHECK some).
- **T-M(e)** `[T-M(e)] para k = 1..17: migrate deploy com falha injetada depois da k-ésima sentença deixa o catálogo como ANTES (tabela, índice do recibo e política ausentes; CHECK = 'position' validado; linha FALHA de A em _prisma_migrations; B ausente); resolve --rolled-back + deploy convergem (catálogo INTEIRO, A e B aplicadas, status up to date)`. = T-D(f) do molde com k = 1..17: template `_main` sem A/B; por k: `createFromTemplate` → grava `A_k` + `B` limpa no temporário → `deploy --config` com ec ≠ 0 → `catalogState` = ANTES → `migrationRows(A)` = `{ total: 1, failed: 1, finished: 0, rolled_back: 0 }` e `migrationRows(B).total` = 0 → A limpa → `deploy` ec ≠ 0 com `P3009` no stderr → `resolve --rolled-back <A>` ec 0 → `deploy` ec 0 → INTEIRO, A `{ total: 2, failed: 0, finished: 1, rolled_back: 1 }`, B `finished: 1` → `migrate status` ec 0; falhas acumuladas em `failures[]` e `assert.deepEqual(failures, [])`. Vermelho: **M-E51** (17/17 k), **M-E51b** (k = 16 e 17), **M-E51c** (k = 1).
- **T-M(f)** `[T-M(f)] B: migrate deploy com falha injetada depois do VALIDATE deixa linha FALHA de B com o CHECK já validado (A aplicada); resolve --rolled-back + deploy convergem (B aplicada; catálogo INTEIRO)`. Mede: template `_main` + A limpa + `B_k` (= B + `INJECTED_FAILURE`) → ec ≠ 0 → `migrationRows(B)` = `{ total: 1, failed: 1 }`, A `finished: 1`, `catalogState` = INTEIRO (o VALIDATE commitou sozinho: é uma sentença, autocommit — medido §11 P5) → B limpa → `P3009` → `resolve --rolled-back <B>` → `deploy` ec 0 → INTEIRO, B `{ total: 2, finished: 1, rolled_back: 1 }`. Vermelho: M-E26 (B sem o VALIDATE → `checkValid` falso no fim).

**Custo (medido nesta emenda, §11 P4):** 6,4–7,6 s por k no contêiner (deploy falho + redeploy + resolve + deploy + status) → T-M(e) ≈ 2 min; o arquivo inteiro ≈ 3 min. Aceito na CI (`backend-postgres` e `backend`); o dev publica o tempo medido no comentário do `ci.yml`. Timeout: T-M(e) `{ timeout: 900_000 }`; os demais `{ timeout: 180_000 }`.

**Restrições de forma do arquivo novo (guardas do repositório que o leem):** (i) **nenhuma** ocorrência das palavras `GRANT`, `REVOKE`, `OWNER TO`, `CREATE ROLE`, `DROP ROLE`, `ALTER ROLE` — nem em comentário: `tests/db-catalog-write-guard.test.ts` conta lexicalmente e o arquivo não entra na allowlist congelada (o molde tem 0); (ii) o bloco `after` **não cita** `traccar_ingress_receipts` (o H9 de `traccar-event-topology.test.ts` enumera todo `traccar-*-db.test.ts` cujo `after` apaga recibos; o drill derruba a BASE, não linhas — a lista nominal do H9 fica como está); (iii) entra na lista curada do `ci.yml` (§6), medido 3×; (iv) `_prisma_migrations` só na base própria; (v) nome termina em `-db.test.ts` (auto-skip declarado sem `DATABASE_URL`, como o molde).
### 5.2 O que sai de `tests/traccar-event-rls-db.test.ts` (G9 muda de casa)
O caso `banco: drill — migrate deploy numa base própria, rollback do rodapé na ordem executável, _prisma_migrations limpo` (G9) **sai** de `tests/traccar-event-rls-db.test.ts`: ele executava o rodapé sentença a sentença em autocommit, aceitava a guarda em 3º lugar (`["DROP TABLE", "DROP INDEX", "SELECT count(*)", …]`) e lia os passos numerados — tudo o que o §3 muda. A propriedade dele vive agora, mais forte, em T-M(b) (down em transação única + re-up pelo deploy real) e T-M(c) (ordem e guarda). A suíte G passa de **10 para 9** casos (G1–G8 e G10 ficam com os títulos de hoje; nenhum caso do 01 some; o `after` da G mantém o `DELETE` em ordem FK-safe — o H9 não muda).

**Edição exata na G (e só esta):** remover (a) o `test()` G9 inteiro; (b) `let drillDatabase: string | undefined;` e a linha `if (drillDatabase) await h.admin.$executeRawUnsafe(\`DROP DATABASE IF EXISTS "${drillDatabase}" WITH (FORCE)\`);` do `after`; (c) as constantes `ROOT`, `MIGRATION_A`, `MIGRATION_B`; (d) as importações que ficam sem uso — `execFileSync` (`node:child_process`), `readFileSync` (`node:fs`), `createRequire` (`node:module`), `path`, `fileURLToPath` (`node:url`) — `tsconfig` é `strict` sem `noUnusedLocals`, mas importação órfã é ruído que a cadeira do escopo marca; (e) no comentário de cabeçalho, trocar `e o DRILL da migração numa base própria (sobe, rollback na ordem executável do rodapé, \`_prisma_migrations\` limpo, DROP DATABASE)` por `o drill da migração (up, down em transação única com guarda, atomicidade por prefixo k = 1..17) vive em tests/traccar-event-migration-drill-db.test.ts`. Régua da cadeira do escopo: `git diff --numstat <base>..<head> -- tests/traccar-event-rls-db.test.ts` só com remoções e a troca do comentário (≈ `2 60`); `node --test` da G → `# tests 9 # pass 9 # fail 0 # skipped 0`.
### 5.3 Mutações novas (vermelho-controle) e re-ancoragens
Catálogo: `docs/revisoes/TRACCAR/B-TRC-02-evidencias/mutations.mjs` (formato do 01: âncora ÚNICA, `tsc` ec 0 quando toca `.ts`, teste nomeado, restauro por BYTES com sha256; `migration: true` sobe a migração mutada numa base própria `trc02_mut` dentro do contêiner). Entra `M: ["tests/traccar-event-migration-drill-db.test.ts"]` em `T`. Âncoras no arquivo **v2.3** (§2.2); `\n` literal como nas entradas existentes.

| Id | Propriedade | `file` → `find` ⇒ `replace` | `tests` | Vermelho esperado (medido na sonda, §11 P7) |
|---|---|---|---|---|
| **M-E51** | a A é UMA transação (= o objeto do DBA) | `MIG_A` (`migration: true`), 2 edições: `BEGIN;\n\nCREATE TABLE "vehicle_telemetry_events" (` ⇒ `CREATE TABLE "vehicle_telemetry_events" (`; e `NOT VALID;\n\nCOMMIT;\n` ⇒ `NOT VALID;\n` | `T.M` | T-M(e) em **17/17** k (k=1: `table: true`; k=16: `check: SEM-CHECK` — P7 `M-E51 k=16: … check=SEM-CHECK`); T-M(a) por forma |
| **M-E51b** | o COMMIT fecha DEPOIS da última sentença | `MIG_A` (`migration: true`), 2 edições: `-- (3) CHECK de message_kind do recibo: DROP + ADD NOT VALID` ⇒ `COMMIT;\n-- (3) CHECK de message_kind do recibo: DROP + ADD NOT VALID`; e `NOT VALID;\n\nCOMMIT;\n` ⇒ `NOT VALID;\n` | `T.M` | T-M(e) em k=16 (recibo SEM CHECK — P7 `M-E51b k=16: … check=SEM-CHECK`) e k=17 (catálogo inteiro, não "antes"); T-M(a) por forma (última ≠ COMMIT) |
| **M-E51c** | o BEGIN abre ANTES da primeira sentença | `MIG_A` (`migration: true`), 2 edições: `BEGIN;\n\nCREATE TABLE` ⇒ `CREATE TABLE`; e `("battery_level_pct" BETWEEN 0 AND 100)))\n);\n` ⇒ `("battery_level_pct" BETWEEN 0 AND 100)))\n);\nBEGIN;\n` | `T.M` | T-M(e) em k=1 (`table: true` — P7 `M-E51c k=1: tabela=true`); T-M(a) por forma (primeira ≠ BEGIN) |
| **M-E52** | a guarda vem ANTES de qualquer DROP (R1) | `MIG_A`, 1 edição no rodapé: a linha `--   DROP TABLE IF EXISTS "vehicle_telemetry_events";\n` sobe para ANTES da linha `--   SELECT CASE WHEN n = 0 …` (find = as 3 linhas guarda+DROP; replace = DROP + guarda) | `T.M` | T-M(c) (em autocommit a tabela some antes de parar) e T-M(d) (`slice(1)` passa a conter a guarda: 22P02, não 23514); forma `[0]`/`[1]` |
| **M-E53** | a guarda enxerga a amostra pendurada em recibo `position` (R1, ponto cego) | `MIG_A`, 1 edição: `(SELECT count(*) FROM "vehicle_telemetry_events") + ` ⇒ `` (vazio) | `T.M` | T-M(c): com 1 `sample` e 0 recibos de evento a guarda devolve `ok` e o down vai até o fim (estado ANTES, não 22P02) |
| **M-E54h** | o teste mede a TRANSAÇÃO, não a guarda (R2) — mutação de arnês | `tests/traccar-event-migration-drill-db.test.ts`: `downStatements().slice(1), "single-transaction")` ⇒ `downStatements().slice(1), "autocommit")` | `T.M` | T-M(d): 23514 na 5ª, mas as 4 anteriores já valeram → `check` ausente / `table: false` |

**Re-ancoragens obrigatórias (o rodapé mudou):** **M-E35** — `find` passa a ser a última linha do rodapé `--   -- a tabela leva consigo política, índices e as 4 FKs; toca traccar_ingress_receipts (CHECK e um índice) e _prisma_migrations; nenhuma outra tabela.\n` ⇒ a mesma + `GRANT EXECUTE ON FUNCTION public.auth_login_candidates(text) TO erp_runtime;\n` (vermelho inalterado: guard 8 + H7). **M-S6** — `find` passa a `-- down (MANUAL, nunca automático; só em ambiente SEM dado real; invocar` ⇒ `CREATE TABLE "zz_mutacao_trc02" ("id" INTEGER PRIMARY KEY);\n\n-- down (MANUAL, nunca automático; só em ambiente SEM dado real; invocar` (a tabela nasce DEPOIS do COMMIT, em autocommit; T14a/b vê 120 — vermelho inalterado).

**Re-execução (arquivo editado = roda 1× de novo, como o precedente fez com M11b/M28/M22):** M-E23, M-E24, M-E25, M-E27, M-E31, M-E40 (corpo da A, âncoras intactas; agora dentro da transação — o deploy mutado continua ec 0 e a G, sem o G9, as acusa), M-E35 e M-S6 (re-ancoradas). As demais 64 entradas não tocam arquivo alterado e **não** se re-executam.

## 6. Escopo PERMITIDO acrescido (exato) e PROIBIDO que se mantém
Soma ao §7.1/§7.3 do plano v2, à v2.1 (R3-4) e à v2.2 (R-S1/R-S2). A cadeira do escopo mede `git diff --name-only <base>..<head>` ⊆ (§7 do PLANO_TRACCAR ∪ §7.3 ∪ v2.1 ∪ v2.2 ∪ esta tabela).

| Caminho | Estado | Trabalho EXATO nesta emenda |
|---|---|---|
| `prisma/migrations/20260879000000_vehicle_telemetry_events/migration.sql` | já PERMITIDO | reescrita pela receita do §2.2: cabeçalho novo, `BEGIN;`, `COMMIT;`, rodapé `-- down` novo; **as 17 sentenças byte-iguais** (régua: diff de sentenças = 0) |
| `prisma/migrations/20260880000000_validate_receipt_message_kind_check/migration.sql` | já PERMITIDO | **0 bytes** (§2.3) |
| `tests/traccar-event-migration-drill-db.test.ts` | **NOVO — acrescido** | §5.1 (molde: `work-order-invoicing-migration-drill-db.test.ts`) |
| `tests/traccar-event-rls-db.test.ts` | já PERMITIDO | só o que §5.2 lista (G9 sai; órfãos saem; 1 comentário) |
| `.github/workflows/ci.yml` | já PERMITIDO (bloco `SUITES=`) | + 1 linha `SUITES="$SUITES tests/traccar-event-migration-drill-db.test.ts"` logo após a de `traccar-event-rls-db`; o comentário de 4 linhas do B-TRC-02 (l.295-298) passa a dizer "4 suítes" e "20+13+9+6 = 48 casos" com o total do job medido 3× (`P-TRC-CI-COMENTARIO-DENOMINADOR` continua fechada: o número é o medido) |
| `docs/revisoes/TRACCAR/B-TRC-02-evidencias/mutations.mjs` | já PERMITIDO | `T.M`; M-E51, M-E51b, M-E51c, M-E52, M-E53, M-E54h; re-ancoragem de M-E35 e M-S6 (§5.3) |
| `docs/deployment.md` | PERMITIDO **alargado** (antes: só chaves `event.*`/`status.timeout`) | **um parágrafo**, o literal do §4, inserido após a l.401 do head |
| `docs/revisoes/TRACCAR/B-TRC-02-emenda-v2.3.md` (cópia desta), `B-TRC-02-dev.md` (append do ciclo), `B-TRC-02-evidencias/results-db-v23.jsonl` | registro | — |
| `agent-orchestration/controle/pendencias.md`, `decisoes.md` | pelo orquestrador | §10 |

**PROIBIDO (mantém o §7.4, v2.1 e v2.2 §5.4; explicitado para esta emenda):** `prisma/schema.prisma` (**0 bytes** — `BEGIN`/`COMMIT` não muda o schema; drift md5 idêntico, medido §11 P3); qualquer outra migração (`20260874…` e as demais carregam a mesma classe — `pre-existente`, pendência em §10, fora deste bloco); `scripts/db-runtime-role.sh`; `src/**` (nenhuma linha de código muda nesta emenda); `tests/work-order-invoicing-migration-drill-db.test.ts` (o molde não se edita); `tests/traccar-event-topology.test.ts` (H9 fica; a lista nominal não muda); `tests/db-catalog-write-guard.test.ts` (o arquivo novo não entra na allowlist — não contém os tokens); `Kpis/**` (congelado); `package*.json`.

## 7. Contagens (v2.2 → v2.3), baseline e meta
| O quê | v2.2 (medido pelo dev, Q1 = NÃO) | v2.3 | Diferença |
|---|---|---|---|
| Critérios | 27 (C-01..C-27) | **29** | +**C-28** "a migração A é atômica no `prisma migrate deploy` real e, falhando em qualquer sentença, `resolve --rolled-back` + `deploy` convergem; a B é reaplicável" (T-M(e)/(f)); +**C-29** "o down é transação única com a guarda — que vê toda linha de telemetria e todo recibo ≠ `position` — ANTES de qualquer DROP" (T-M(b)/(c)/(d)) |
| Testes novos do bloco | 97 (A 17 · B 11 · C 12 · D 5 · H 9 · E 20 · F 13 · G 10) | **102** (… · G **9** · **M 6**) | −1 (G9 muda de casa) +6 (T-M(a)–(f)); T-M(e) carrega 17 sub-medições e T-M(f) 1 |
| `backend-postgres` (`fail 0`, `skipped 0`) | 434 ×3 | **439** esperado | o dev mede 3× e publica o real; denominador constante |
| Linux, `$(ls tests/traccar-*.test.ts)` | 229 (= 132 do 01 + 97) | **234** | — |
| Mutações no catálogo | 72 (35 host + 37 banco) | **78** (36 host + 42 banco) | +M-E51, M-E51b, M-E51c, M-E52, M-E53 (banco) +M-E54h (host: arnês; roda no contêiner por tocar suíte `-db`) — contar onde o executor as põe |
| Re-executadas por arquivo editado | — | 8 | M-E23, M-E24, M-E25, M-E27, M-E31, M-E40, M-E35 (re-ancorada), M-S6 (re-ancorada) |
| Baseline N / meta 2N | 149 / 298; déficit declarado (`P-TRC02-DEFICIT-2N`) | 149 / 298; 102 novos | o déficit continua declarado; esta emenda não o fecha nem o piora |
| Migrações | 2 (A + B) | 2 | a A muda cabeçalho/BEGIN/COMMIT/rodapé; a B 0 bytes; nenhuma migração nova |
| Variáveis de ambiente novas | 0 | 0 | — |
| Perguntas ao dono | 0 | **0** | nada aqui é decisão de produto; R3 é aceito com dono nomeado |

## 8. Bateria do dev (ordem; comando → saída → veredito em `B-TRC-02-dev.md`)
Tudo que é `-db` roda em contêiner Linux próprio (`bash C:/Users/AMP/erp-pausa-2026-10-03/ferramentas/teste-linux.sh <worktree> "<comando>"`), P8 (≥ 4 GB livres, ≤ 2 trabalhos Docker); nunca a base viva nem as portas 5432/6379/3000/5173/5050/8899. Worktree próprio com `npm ci` próprio (junction PROIBIDA).

0. **Baseline** (head atual do ramo, depois de `git pull --rebase origin main`): `sha256sum prisma/migrations/20260879000000_vehicle_telemetry_events/migration.sql` → `3713c341…` (o objeto); contêiner: G → `# tests 10 # pass 10`; forma do `backend-postgres` → 434.
1. **Migração A** pela receita do §2.2 (copiar o literal de `C:/Users/AMP/erp-pausa-2026-10-03/planos/B-TRC-02-v23-sondas/A.v23.sql` — é o arquivo que a sonda executou). Régua de forma: sentenças executáveis do objeto × do novo (sem `BEGIN;`/`COMMIT;`) → `diff` **0**; `grep -c '^BEGIN;'` = 1; `grep -c '^COMMIT;'` = 1; `grep -cE '\$\$|\$[a-z]+\$'` = 0; `grep -ciE 'grant|revoke|owner to'` = 0; `file` → sem CRLF.
2. **Drill novo** (§5.1) + **G sem o G9** (§5.2) + `ci.yml` + `mutations.mjs` + parágrafo de `docs/deployment.md` (§4) + cópia desta emenda em `docs/revisoes/TRACCAR/`.
3. `timeout -k 15 600 npm run check` · `npm run lint`.
4. Contêiner: `node --test --import tsx --test-reporter=tap tests/traccar-event-migration-drill-db.test.ts` → `# tests 6 # pass 6 # fail 0 # skipped 0`; no log, 17 linhas `[drill T-M(e)] k=<k>: atômico e convergente em <ms>` + 1 de T-M(f); tempo total publicado. **3×** (denominador constante).
5. Contêiner: G → `# tests 9 # pass 9`; E+F+G+M → `# tests 48 # pass 48 # fail 0 # skipped 0`.
6. **Vermelho-controle** (retratos no contêiner, nunca o worktree): (a) A **do objeto** (sem BEGIN/COMMIT) + drill novo → T-M(a) vermelho por forma e T-M(e) com `failures` em 17/17 k; (b) A v2.3 com o **rodapé antigo** → `downStatements()` lança "a migração traz o rodapé `-- down`" → T-M(b)/(c)/(d) vermelhos. TAP publicado.
7. **Mutações** (`run-mutations.mjs <wt> db "M-E51,M-E51b,M-E51c,M-E52,M-E53,M-E54h,M-E23,M-E24,M-E25,M-E27,M-E31,M-E40,M-E35,M-S6"`): 14 vermelhas, `restoredOk` 14/14, resultados em `results-db-v23.jsonl`; o vermelho de cada uma bate com a coluna "esperado" do §5.3.
8. Forma do `backend-postgres` **3×** → `439/439` (ou o número real), `skipped 0`, constante; `npm test` (forma `backend`): `fail 0`, pulos nomeados como hoje.
9. `prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script | md5sum` = o da `origin/main` (0 deriva nova); `git diff --name-only origin/main...HEAD` ⊆ §6; `git diff --numstat` da G só com remoções + 1 comentário; `git diff --quiet` nos 9 arquivos do 01 e em `prisma/schema.prisma`.
10. `timeout -k 15 600 npm run build` · `node scripts/sync-agent-agents.mjs --check` · `git diff --check` · `node --check Kpis/app.js`; `git diff --name-only origin/main...HEAD -- Kpis | wc -l` = 0.
11. Commit único `fix(traccar): migração A como transação explícita, down com guarda antes de qualquer DROP e drill de atomicidade por prefixo k=1..17 (B-TRC-02, emenda v2.3)` → push → CI verde no head (os 2 gatilhos). Limpeza §C5 em 1 linha (`docker ps -a | grep -c 'tl\|dtrc02'` = 0; worktree removido por `git worktree remove --force`).
12. **DBA re-mede só a cadeira vermelha** (`D-JUNTA-SO-CADEIRA-VERMELHA`, dono 20/10): item 3 (k = 1..17 pelo CLI real; down nas três pontas) e item 1 (lock com 1 M, agora até o COMMIT). Parecer FAVORÁVEL → inspetor de terreno → junta de segurança (§10 do plano v2).

## 9. Riscos, rollback e o que o DBA re-mede na junta
| Risco | Prob./impacto | Mitigação |
|---|---|---|
| Uma versão futura do Prisma passar a envolver cada migração numa transação própria — `BEGIN` aninhado viraria `WARNING: there is already a transaction in progress` e o `COMMIT` interno fecharia a dela | baixa / médio | o T-M(e) mede comportamento, não forma: qualquer mudança de modo aparece como vermelho no primeiro bump de `prisma`; o precedente carrega o mesmo risco e a mesma trava |
| Mensagem opaca do CLI no deploy falho ("current transaction is aborted") | certa / baixo | declarada no cabeçalho da A e no runbook (§4); a causa está no log do servidor; o drill assere estado |
| `_prisma_migrations.logs` fica NULL no deploy falho (o engine não consegue gravar na conexão abortada) | certa / baixo | idem; o P3009 continua nascendo da linha "started" — o caminho de recuperação não depende de `logs` |
| T-M(e) acrescenta ~2 min ao job | certa / baixo | medido e declarado no `ci.yml`; alternativa (amostrar k) rejeitada: a propriedade é "todo prefixo", e o DBA mediu os 17 |
| `CREATE DATABASE … TEMPLATE` falhar por conexão viva na template | média / baixo | `createFromTemplate` do molde re-tenta 20× a 250 ms; o admin fica na base de manutenção |
| O operador rodar o down fora de `--single-transaction` | média / alto (sem dado real: baixo) | a guarda em 1º para antes de qualquer DROP mesmo em autocommit (T-M(c)); o cabeçalho do rodapé nomeia a única invocação; T-M(d) prova o que a transação evita |
| A guarda com `::int` ser "otimizada" por uma versão futura do Postgres | muito baixa / baixo | o ramo ELSE depende de `n` (coluna), não é constante; T-M(c) acusa se um dia devolver `ok` com dado |
| Deadlock entre a A e a ingestão (§4) | baixa / baixo | qualquer vítima termina em estado íntegro (503 ou rollback atômico); forward pausado com volume |
| O dev "aproveita" para mexer no corpo da A ou no schema | baixa / alto | régua de 17 sentenças byte-iguais e `prisma/schema.prisma` 0 bytes (§6, §8 passo 1/9) |

**Rollback desta emenda:** `git revert` do commit único devolve a A do objeto, a G com o G9 e remove o drill — o estado que o DBA reprovou; nenhuma base aplicada muda (a A v2.3 e a do objeto produzem o MESMO catálogo, `diff_vs_ctl=0`, e o checksum de `_prisma_migrations` só importa para quem ainda não aplicou). Rollback do bloco inteiro: inalterado (plano v2 §11).

## 10. Registro (orquestrador), pendências nomeadas e papéis
**Papéis (§C7.4-bis; a ata registra):** quem **achou** = `dba-trc02-opus` (parecer de 2026-10-20; Opus, nível menor, declarado) — não planeja nem conserta; quem **planejou** = `planejador-trc02-v23-fable` (esta; Fable) — não desenvolve; quem **desenvolve** = o dev do ramo ou identidade nova, em **Opus declarado** — não julga a validade do achado (ele está medido aqui e no parecer). O DBA re-mede a cadeira vermelha depois do conserto (é a sua cadeira, não um conserto). Modelos conforme §C7.6 (topo só no plano e em toda reprovação; resto no nível menor, declarado).

**Decisões a registrar em `decisoes.md` (texto proposto; o orquestrador grava):**
- `D-TRC02-MIGRACAO-TRANSACAO-EXPLICITA` (2026-10-20): "a migração `20260879000000_vehicle_telemetry_events` do B-TRC-02 passa a transação explícita (`BEGIN;`/`COMMIT;` no próprio arquivo), pelo mesmo mecanismo medido no B-SAN3-02 (C2-01): o `prisma migrate deploy` 7.8 executa sentença a sentença em autocommit. O down é manual, transação única, com a guarda antes de qualquer DROP. A propriedade é presa por drill com o CLI real, falha injetada após cada sentença (k = 1..17). Recomendação de regra geral, a decidir pelo dono: migração nova com mais de uma sentença e só DDL transacional leva `BEGIN`/`COMMIT` e drill por prefixo; migração com `CONCURRENTLY` fica sozinha no arquivo e declara a não-atomicidade."
- Q1 = NÃO (`D-TRC02-Q1-NAO`) e as decisões da v2.1/v2.2 continuam; nada aqui as altera.

**Pendências nomeadas (o orquestrador grava em `pendencias.md`):**
- `P-TRC02-LOCK-INDICE-RECIBO-PROD` — MÉDIA — dono **B-TRC-06**: janela do `CREATE UNIQUE INDEX` do recibo (1,6–3,7 s/1 M, até o COMMIT); com > 100 mil recibos aplicar com o forward pausado/janela anunciada; medir em staging/produção (§4).
- `P-MIGRACOES-ANTERIORES-SEM-TRANSACAO-EXPLICITA` — BAIXA — classe `pre-existente` (fora do veto, §C7.1-ter(a)): as migrações anteriores à `20260878000000` (ex.: `20260874000000_traccar_ingestion_foundation`, com DDL em várias sentenças) rodam sentença a sentença; já aplicadas em todos os ambientes, só importam para base nova com deploy interrompido. Dono: bloco de saneamento que o orquestrador nomear (SAN3); conserto = o mesmo deste bloco, arquivo a arquivo, com drill.
- `P-TRC02-DEFICIT-2N` — inalterada.

**Para a ata do ciclo:** composição cobre a competência (banco — o DBA); quem achou ≠ quem conserta (sim); dado podre no planejamento (não: o parecer foi medido com o CLI real e esta emenda re-mediu 17/17 em terreno próprio); o Fable foi usado no plano (frontmatter), sem fallback.

## 11. Evidência desta planejadora (P1: comando → saída → veredito)
Terreno: cópia do worktree (sem `.git`/`node_modules`) no scratchpad da sessão → `bash ferramentas/teste-linux.sh <cópia> "bash /w/.planprobe/probe.sh"` (Postgres 16.14 + Redis em rede própria, `npm ci` dentro do contêiner, 115 migrações aplicadas pelo preâmbulo; tudo removido pelo nome no fim: `docker ps -a | grep -c tl` → 0, redes `tl*` → 0). A A da cópia é byte-igual ao blob de `27ebbdee` (sha256 `3713c341…` nos dois). Sondas, saída integral e o literal da A: `C:/Users/AMP/erp-pausa-2026-10-03/planos/B-TRC-02-v23-sondas/` (`probe.sh`, `probe.out`, `A.v23.sql` sha256 `13e07382…`, `A.orig.sql`, `down.sql`, `down-extract.mjs`, `fp.sql`, `seed-legado.sql`). O worktree `w-trc02` e o repositório não foram tocados. P8 antes de subir: 7 960 MB livres de 24 261; 0 trabalhos `tl*`. Duração do contêiner: ~9 min.

| Passo | Comando (resumido) | Saída (linhas de `probe.out`) | Veredito parcial |
|---|---|---|---|
| Geração da A v2.3 | cabeçalho + `BEGIN;` + corpo (`awk` do `CREATE TABLE` até `NOT VALID;`) + `COMMIT;` + rodapé; sentenças executáveis de cada arquivo (`grep -vE '^\s*--'` → `;`) e `diff` | `sentencas: orig=17 v23=19`; `DIFF=0 (17 sentencas byte-iguais)`; `grep -c '^(BEGIN ou COMMIT);'` = 2; dollar-quote 0; GRANT/REVOKE/OWNER 0 | corpo intocado; forma limpa |
| Parser do down | `node down-extract.mjs A.v23.sql --count` / `--one-per-line` | `6`; 1ª = `SELECT CASE WHEN n = 0 THEN 'ok' …`, depois `DROP TABLE`, `DROP INDEX`, `ALTER … DROP CONSTRAINT`, `ALTER … ADD CONSTRAINT`, `DELETE FROM "_prisma_migrations"` | o parser do molde lê o rodapé novo; guarda em 1º |
| P0 | `select version()`; `npx prisma --version` | `PostgreSQL 16.14`; `prisma 7.8.0`, `schema-engine-cli 3c6e1927…` (l.2-4) | mesmo engine do precedente |
| P1 | A/B fora → `migrate deploy` → `seed-legado.sql` N=2000 → impressão digital | `All migrations have been successfully applied.`; `legado 3000 1000 200 200`; `fp_main linhas=3230` (l.8-10) | template da main com dado legado |
| P2 | A ORIGINAL (autocommit) → deploy → `fp_ctl` | `tabela=true idx_recibo=1 policy=1 check=… ANY(position,event) valid=true`; A e B `fin=true` (l.14) | referência do catálogo do objeto |
| P3 | A v2.3 → deploy real; `fp`; 2º deploy; `status`; `migrate diff --script` md5 | `deploy_ec=0 wall_s=1.82`; `diff_vs_ctl=0 diff_vs_main=41 (linhas fp_hp=3269)`; `No pending migrations`; `status ec=0`; md5 `ea7c0780690a` = `ea7c0780690a` (l.17-21) | **cabe numa transação; catálogo idêntico; 0 deriva** |
| P4 | k = 1..17: falha `ALTER TABLE "drill_nao_existe"` após a k-ésima; estado; redeploy; `resolve --rolled-back`; redeploy; `status` | 17 linhas iguais: `deploy_ec=1 [aborted] diff_vs_main=0 tabela=false idx_recibo=0 policy=0 check=… 'position' valid=true pm=[A:fin=false,rb=false] · redeploy ec=1 [P3009] · resolve ec=0 · redeploy ec=0 diff_vs_hp=0 pm=[A rb=true ; A fin=true ; B fin=true] status_ec=0 (6.4–7.6 s)` (l.24-41); cauda do CLI em k=1: `current transaction is aborted` (l.25) | **17/17 atômicos e convergentes** |
| P5 | B + falha após o `VALIDATE`; redeploy; resolve; redeploy | `deploy_ec=1 [does not exist P3018] … valid=true pm=[A fin=true ; B fin=false]`; `redeploy ec=1 [P3009]`; `resolve ec=0 redeploy ec=0 diff_vs_hp=0 … pm=[A fin=true ; B rb=true ; B fin=true]` (l.44-46) | B reaplicável; o VALIDATE commitou sozinho |
| P6a | base INTEIRA → `psql -v ON_ERROR_STOP=1 --single-transaction -f down.sql` → deploy | `down ec=0 … diff_vs_main=0 pm=[] tabela=false idx_recibo=0 policy=0 check=… 'position' valid=true`; `re-up (migrate deploy) ec=0 diff_vs_hp=0 pm=[A fin=true ; B fin=true]` (l.51-52) | ponta A: volta e re-up convergem |
| P6b | 1 `sample` pendurada em recibo `position`; down single-tx | `guarda antiga (recibos <> position) = 0 · linhas de telemetria = 1`; `down single-tx ec=3 erro=[… ERROR:  22P02: invalid input syntax for type integer: "PARE: 1 linha(s) de telemetria ou recibo(s) de evento - …"] diff_vs_hp=0 linhas=1` (l.55-56) | a guarda nova vê o ponto cego do R1 e para sem apagar |
| P6c | o mesmo down, sentença a sentença em autocommit (R1 literal) | `autocommit: [ ERR] tabela=true linhas=1 diff_vs_hp=0` (l.58) | para na 1ª; nenhum DROP enviado |
| P6d | recibo `event` + linha; down SEM guarda em single-tx | `ec=3 erro=[…:7: ERROR:  23514: check constraint "traccar_ingress…"] diff_vs_hp=0 linhas=1 tabela=true idx_recibo=1 policy=1 check=… ANY(position,event) valid=true` (l.61) | R2 fechado pela transação |
| P6e (controle) | o mesmo, em autocommit (como o DBA mediu) | `tabela=false idx_recibo=0 policy=0 check=SEM-CHECK · insert message_kind=qualquer -> qualquer` (l.63) | reproduz o rb2b do DBA — o que a transação evita |
| P7 | M-E51 (objeto) k=16; M-E51b (COMMIT antes da 16ª) k=16; M-E51c (BEGIN depois da 1ª) k=1 | `M-E51 k=16: … check=SEM-CHECK`; `M-E51b forma: 18:BEGIN; 89:COMMIT;` → `k=16: … check=SEM-CHECK`; `M-E51c forma: 59:BEGIN; 94:COMMIT;` → `k=1: tabela=true …` (l.66-72) | as 3 mutações de transação são vermelhas no T-M(e) |
| P8 | `pg_sleep(4)` após a 7ª sentença; `pg_locks`/`xact_start`; escritor e leitor com `lock_timeout` 300 ms | `locks … em recibos: [ShareLock] xact_start=45.907 now=47.191`; escritor → erro (última linha do erro do psql, o marcador `^`; o INSERT não devolveu `INSERT 0 1`); `leitor: count=3000`; `deploy lk ec=0` (l.75-78) | uma transação só; lock até o COMMIT; leitura não bloqueia |

Limite declarado desta evidência: o lock foi caracterizado sem volume (3 000 recibos) — os números de janela com 1 M são os do DBA (item 1) e ele os re-mede na forma transacional (§8 passo 12). Nada aqui foi commitado; a sonda não escreveu no worktree.

## Resumo para o orquestrador
1. D1 do DBA é defeito real (autocommit sentença a sentença no Prisma 7.8.0, mesma classe do C2-01 do B-SAN3-02); a correção é a A como transação explícita (`BEGIN;`/`COMMIT;`, 17 sentenças intocadas) — medida nesta emenda com o CLI real: 17/17 prefixos atômicos e convergentes, catálogo idêntico ao de antes; a B não muda.
2. R1/R2: rodapé `-- down` com a guarda (telemetria inteira + recibos ≠ position) em 1º lugar e invocação única `psql -v ON_ERROR_STOP=1 --single-transaction -f`; as três pontas medidas (volta/re-up, para na 1ª, 23514 desfaz tudo).
3. R3: lock aceito e declarado — parágrafo em `docs/deployment.md` + `P-TRC02-LOCK-INDICE-RECIBO-PROD` (dono B-TRC-06); `CONCURRENTLY` rejeitado com motivo.
4. Teste novo `tests/traccar-event-migration-drill-db.test.ts` (6 casos, k = 1..17 no molde do T-D(f)); G9 sai da RLS (10 → 9); +6 mutações (3 medidas vermelhas) e 8 re-executadas; escopo acrescido = o teste novo + 1 parágrafo do runbook; contagens 97 → 102 testes, 434 → 439 `backend-postgres`, 72 → 78 mutações.
5. Dev em Opus declarado (nunca o DBA nem esta planejadora); depois, só a cadeira vermelha do DBA re-mede (itens 3 e 1) → inspetor → junta. Perguntas ao dono: 0. Sondas e o literal da A em `C:/Users/AMP/erp-pausa-2026-10-03/planos/B-TRC-02-v23-sondas/`.
