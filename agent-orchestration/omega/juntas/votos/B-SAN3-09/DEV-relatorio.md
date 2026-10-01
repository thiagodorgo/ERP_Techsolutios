# Papel: dev · Identidade: dev-san3-09-bootstrap · Modelo: claude-sonnet-4-6 · mandato_md5: 5652be572623890d318194496a4bc171

## §terreno — Ambiente e HEAD (medido em 2026-10-01T01:30Z)

```
$ uname -a
Linux vm 6.18.44-fc-v51 #1 SMP PREEMPT_DYNAMIC @0 x86_64 x86_64 x86_64 GNU/Linux

$ node -v
v22.22.2

$ git rev-parse HEAD
32025930841898ad20434145135386a467b79c1a

$ git rev-parse origin/main
3b1fe0f91d5304a721aa47d6661c4eb7cba39b1c
```

Ramo: `feat/bootstrap-platform-admin`. HEAD está 5 commits à frente de origin/main.
Diferença vs origin/main: apenas arquivos de orquestração, plano e mandato. Código-alvo (scripts/, tests/, docs/deployment.md, Kpis/) intocado — campo limpo para as entregas E1–E5.

## §E1 — ENTREGUE — scripts/bootstrap-platform-admin.ts (2026-10-01T01:45Z)

Comando: `tr -d '\r' < scripts/bootstrap-platform-admin.ts | md5sum`
Saída: `a5f5383dfbbabde9a63205bd40f64782  -` ✓ (bate com plano §0.5, 417 linhas)

Comando: `wc -l < scripts/bootstrap-platform-admin.ts`
Saída: `417` ✓

Comando: `npx tsc --noEmit --strict --module NodeNext --moduleResolution NodeNext --target ES2022 --esModuleInterop --skipLibCheck --types node scripts/bootstrap-platform-admin.ts`
Saída: (sem erros) — ec=0 ✓ (A19)

Veredito parcial: E1 verde — script byte-a-byte do Apêndice B, md5 confirmado, tsc limpo.

## §E2 — ENTREGUE — tests/san3-09-bootstrap-platform-admin.test.ts (2026-10-01T02:00Z)

Comando: `node --test --import tsx tests/san3-09-bootstrap-platform-admin.test.ts 2>&1 | grep -E '^(ok|not ok|# (pass|fail))'`
Saída: 22/23 pass (T1.8 é vermelho-controle intencional — verde após E4; está documentado no teste)
Ratchet lexical (CREATE ROLE/DROP ROLE/ALTER ROLE): 0 ocorrências ✓
Autor git corrigido: thiagodorgo / 42915563+thiagodorgo@users.noreply.github.com (correção do Fable em 2026-10-01T02:00Z)

Veredito parcial: E2 verde — 22 testes sem banco, 1 doc-guard (T1.8) aguarda E4.

## §E3 — ENTREGUE — tests/san3-09-bootstrap-platform-admin-db.test.ts (2026-10-01T22:30Z)

Comando: `DATABASE_URL=postgresql://postgres@127.0.0.1:54332/erp_san3_09_dev node --test --import tsx tests/san3-09-bootstrap-platform-admin-db.test.ts 2>&1 | grep -E '# (pass|fail)'`
Saída: `# pass 11` / `# fail 0` ✓ (10 subtestes T2.1–T2.10, 1 outer test)

Ratchet lexical (db-catalog-write-guard): 0 ocorrências ✓

Correções aplicadas durante a implementação:
- Hash scrypt: formato real é `scrypt$v=1$…` (não `$scrypt-v1$`) — password_algorithm="scrypt-v1", mas o hash inicia com `scrypt$v=1$`
- Resposta do login: token em `body.data.access_token` (não `body.data.token`); roles são objetos `{id, key, name}`, verificado por `.key === "super_admin"`

Banco de drill: `erp_san3_09_dev` em `/var/lib/postgresql/erp_san3_09_dev/data`, porta 54332, já provisionado com RBAC.
Papel efêmero (T2.7): criado via `createEphemeralRole` (arnês — `tests/helpers/auth-identity-fixture.ts`), NOSUPERUSER NOBYPASSRLS provado por execução.

Veredito parcial: E3 verde — 10/10 subtestes, banco de drill descartável por subtest (T2.7/T2.9/T2.10), teardown `DROP DATABASE … WITH (FORCE)`.


## §E4 — EM APURACAO (Runbook B em docs/deployment.md)

## §E5 — EM APURACAO (KPI + registro)

## §bateria — EM APURACAO
