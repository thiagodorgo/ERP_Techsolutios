# T-SAN-INFRA4 — Ω-INFRA-4: backup pg_dump→S3 + restore COMPROVADO + observabilidade (PD-INFRA-2)

**Bloco:** Ω-INFRA-4 (PR7, ÚLTIMO da RODADA SANEAMENTO). Config-as-code INERTE (ativação = hand-off).
`migration_needed=false`. **Restore comprovado ao vivo** (pré-condição do veto do dba-guardiao).

## Fluxo (ultracode: design antes de código)
Workflow de design (4 leitores + PD-INFRA-2 em 2 lentes [pesquisador-web + finops, ≥3 fontes] + plano do
planejador-mestre + ataque dba/critico/secops). Os 3 ataques deram **APROVADO_CONDICIONADO**; TODAS as condições
foram dobradas na implementação + provadas no drill.

## Entregas
- **`scripts/backup-database.mjs`** — `pg_dump -Fc` (custom, comprimido) → auto-valida `pg_restore -l` (nunca sobe
  truncado) → `PutObject` (bucket dedicado, `ServerSideEncryption`) → retenção 30d SEGURA. Creds do Postgres via
  `PG*` env (nunca argv/process table). Helpers puros testáveis (buildBackupKey/parseBackupTimestamp/
  selectExpiredKeys/buildS3Config/parsePgEnvFromUrl). Erro sanitizado (§2.8). Teto 5GB documentado.
- **`scripts/restore-drill.sh`** — restaura o MESMO artefato `.dump` via `pg_restore` (casado com o formato do
  script — fecha o merge-gate do descasamento). **`scripts/uptime-check.mjs`** — probe `/health`.
- **`.github/workflows/backup-database.yml`** — schedule diário GATED (`BACKUP_ENABLED`), Environment DEDICADO
  `backup` (não `production` — evita deadlock de required-reviewers no cron). **`uptime-check.yml`** — cron `*/5`
  gated por `*_HEALTH_URL`, staging+prod.
- **`docs/omega-pd.md` PD-INFRA-2** — Fly-native (logs/métricas US$0, gru/BR) + GitHub Actions cron (uptime);
  Better Stack/Axiom = upgrades NÃO adotados (junta-5-por-pago NÃO dispara). Custo US$0 vem de repo PÚBLICO.
- **`docs/deployment.md` §Operação** — observabilidade, backup, restore+RPO/RTO, uptime, limitações.
- **`tests/backup-database.test.ts`** (14) — nome/parse/retenção segura/config S3/PG* env.

## DRILL DE RESTORE COMPROVADO AO VIVO (evidência — veto do dba satisfeito)
Rodado o `backup-database.mjs` **REAL** num container (node + postgresql-client-16, espelho do CI) contra o
Postgres local + MinIO (S3-compatível, com KMS p/ aceitar SSE):
1. `pg_dump -Fc` → **713.655 bytes**; auto-validação `pg_restore -l` OK (825 TOC entries, **62 policies RLS** no dump).
2. `PutObject` (SSE) → **OK upload**; retenção (0 expirado, 1 mantido).
3. **Round-trip S3:** download do objeto → **713.655 bytes byte-exato**.
4. `pg_restore` do objeto BAIXADO → **EXIT=0 em ~3,6s (RTO)**.
5. **Integridade SOURCE == RESTAURADO exata:** 9 tenants / 16 users / **62 policies RLS** / 71 tabelas.
6. **Isolamento por tenant COMPORTAMENTAL sob role NÃO-superuser** (FORCE RLS): com `app.current_tenant_id` de
   org_a, só as 16 linhas dessa org são visíveis (**1 tenant distinto** de 9). RLS enforça, não só existe.
- **RPO <= 24h** (dump diário); PITR/WAL nativo (RPO sub-24h) = hand-off (R2). Cleanup pós-drill: DB de drill
  dropado, MinIO removido, temp limpo (C5); erp-postgres/erp-redis intactos.

## Condições do design-junta folded (rastreabilidade)
- **[MERGE-GATE dba C1/critico C1] Descasamento de formato:** script agora emite `-Fc` e o drill restaura ESSE
  artefato (não um `-Fc` paralelo vs `.sql.gz`). **Provado no drill.**
- **[dba C2] RLS não-superuser:** provado comportamentalmente no drill (1 tenant visível).
- **[dba C3/critico C3/secops C5] Retenção perigosa:** prune só após upload OK + só prefixo/formato + protectKey +
  keepMinimum + lista truncada aborta; Lifecycle/Versioning/Object Lock = retenção autoritativa no runbook/hand-off.
- **[dba C4/critico C4] Auto-validação:** `pg_restore -l` no script; drill periódico automático = pendência de ativação.
- **[secops C3/critico F13] Senha no process table:** `PG*` env, nunca argv.
- **[secops C1] SSE + bucket privado:** `ServerSideEncryption` no PutObject (provado no MinIO+KMS); bucket privado+policy = hand-off.
- **[secops C4] §2.8:** erro sanitizado (só `error.name`); scripts nunca imprimem senha/URL/token.
- **[critico F6/dba C6] Colisão de chave:** timestamp com ms + sufixo aleatório de 8 hex.
- **[critico C5] doc-vs-build:** PD-INFRA-2 registra a decisão REAL (Fly-native + Actions cron), custo US$0 de repo PÚBLICO.
- **[critico C6/F9] Escopo honesto:** o PR entrega BACKUP + UPTIME-PROBE; logs/métricas Fly-native = hand-off (não wired).
- **[critico C7] environment deadlock:** `backup` dedicado, não `production`.
- **[critico F11/dba] Teto 5GB + versão pg_dump:** documentados no runbook.

## Bateria (verde)
`node --check` scripts + `bash -n` restore-drill · testes backup 14/14 · suíte inteira 0 fail · `git diff --check`.
Drill end-to-end exit 0. CI é a autoridade do total backend (783 → +14).
