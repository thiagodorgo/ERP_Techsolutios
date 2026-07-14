# J-SAN-6 — Ata: junta-de-código do PR Ω-INFRA-4 (backup + restore comprovado + observabilidade)

**Junta-de-código** (verifica o DIFF `7c70b71` + o drill ao vivo) — composição da spec do PR7:
**agente-dba-guardiao (veto; restore comprovado = pré-condição) · agente-secops · agente-devops-provisionador ·
critico-adversarial** — maioria.

## Veredictos (4/4 favorável — 2 APROVADO + 2 APROVADO_CONDICIONADO; condições de teste dobradas, resto → ativação)
| Agente | Veredito | Núcleo |
|---|---|---|
| agente-secops | **APROVADO** | Zero segredo real versionado (grep classificado); 9 condições (C1-C9) no código; SSE no PutObject; retenção com todas as guardas; `PG*` env; erro sanitizado; Environment `backup` dedicado; sem `upload-artifact` do dump. 1 obs MÉDIA não-bloqueante (nome do bucket no log — mascarado por ser secret). |
| agente-devops-provisionador | **APROVADO** | Workflows coerentes (backup schedule/gated/environment dedicado/concurrency/permissions mínimas; uptime cron gated); script robusto (guard exit≠0, ContentLength, temp unlink, IsTruncated); `buildS3Config` espelha `createS3Client` linha a linha; sem migration/dep nova. Nenhum furo de executabilidade. |
| agente-dba-guardiao | **APROVADO_CONDICIONADO** (merge LIBERADO) | Restore genuinamente comprovado na camada de banco (round-trip byte-exato + integridade exata + RLS comportamental sob não-superuser) → núcleo do veto satisfeito. 6 merge-gates dobrados. Condição de ATIVAÇÃO (não merge): completar o passo 3 do runbook (app + login HTTP contra cópia restaurada). |
| critico-adversarial | **APROVADO_CONDICIONADO** (merge LIBERADO) | 8/8 condições do design dobradas no código (não só no texto); drill coerente com o artefato. Nenhum furo que quebre suíte/vaze segredo/destrua backup. 4 requisitos (2 de teste, 2 de ativação). |

## Drill de restore COMPROVADO AO VIVO (pré-condição do veto do dba — satisfeita)
`backup-database.mjs` REAL (container node+pg16, espelho do CI) → MinIO(SSE via KMS) → **download byte-exato**
(713.655) → `pg_restore` **EXIT=0 ~3,6s (RTO)** → integridade SOURCE==RESTAURADO **exata** (9 tenants / 16 users /
**62 policies RLS** / 71 tabelas) → **isolamento por tenant comportamental sob role NÃO-superuser** (FORCE RLS:
`app.current_tenant_id` de org_a → 1 tenant distinto visível de 9). Evidência: `task-history/T-SAN-INFRA4-backup.md`.

## Condições — o que foi dobrado ANTES do merge × o que é de ATIVAÇÃO
**Dobradas neste ciclo (teste-hardening do critico R1/R2):**
- **keepMinimum DEFAULT** (caminho de produção que omite a opção — L201) agora tem teste (3 mais recentes sobrevivem).
- **Borda 30d exata** testada: idade==30d MANTIDA, 30d+1ms EXPIRA (corte estrito). Testes backup 14 → **16/16**.

**Requisitos de ATIVAÇÃO (no DOSSIÊ — `relatorio-saneamento-infra.md`):**
- **[dba]** completar+registrar o passo 3 do runbook: app apontando p/ cópia restaurada + login HTTP OK + 1 rota autenticada.
- **[critico R3]** alinhar SSE: o script usa AES256 (SSE-S3); a bucket policy DEVE aceitar AES256 (senão 403 no 1º cron), ou o script passa `aws:kms`+KeyId. Verificar antes de ligar `BACKUP_ENABLED`.
- **[critico R4]** se adotar OIDC p/ as creds AWS, somar `permissions: id-token: write` ao `backup-database.yml`.
- Restore-drill AUTOMÁTICO periódico (Actions schedule contra o último backup real) = follow-up de ativação.

## Evidência
tsc N/A (scripts .mjs; tests via tsx) · testes backup **16/16** · suíte inteira **0 fail** · `git diff --check` limpo ·
zero segredo no diff · sem migration/dep nova · drill end-to-end exit 0.

**APROVADO — merge do Ω-INFRA-4 (FECHA a RODADA SANEAMENTO, PRs 1-7).** O merge NÃO é go-live: config INERTE
(gated até `BACKUP_ENABLED`/`*_HEALTH_URL`). Ativação viva (bucket S3 real, PITR, contas obs, app-login contra restore) = hand-off.
