# B-SAN3-22 — Checklist com trava otimista e vistoria viva protegida

> **Briefing corrigido pós-merge (2026-10-27):** a suíte `checklist-template-lock-db` foi exercida no CI pelo job
> **`backend`**, não pelo `backend-postgres` (job 121975457986, `ok 576` a `ok 586`). A
> `P-B-SAN3-22-CI-DB-SUITE` permanece aberta até a decisão sobre incluí-la também na lista curada do
> `backend-postgres`.

## Papel desta execução

DEV backend `dev-san322-sol`, Codex GPT-5.6 Sol, esforço medium, nível menor declarado. Não planeja, não critica e não vota.

## Fonte única

`docs/revisoes/SAN3/B-SAN3-22-plano.md` (cópia da v2 final de 2026-10-25). Q1–Q4 não se reabrem.

## Escopo desta fatia

- `src/modules/checklists/**` conforme §5 da v2;
- os 3 testes novos e os 13 consumidores de teste permitidos;
- `API_CONTRACTS.md` e registros do bloco;
- zero alteração em `frontend/**`, `prisma/**`, `migrations/**`, `mobile/**` e `Kpis/**`.

## Propriedade

PATCH, publish e DELETE exigem `expectedUpdatedAt`; a decisão ocorre sob `SELECT ... FOR UPDATE` tenant-first com comparação por `date_trunc('milliseconds', updated_at)`. Mudança não textual é recusada enquanto houver vistoria viva. Criação e reabertura leem status/versão sob `FOR KEY SHARE`. Modelo arquivado continua servindo somente as vistorias já vivas.

## Bateria

A bateria é a dos §§8–9 do plano v2 e do mandato do usuário: check, lint, build, testes dirigidos e regressões, suíte completa com banco descartável, guard de migração, mutações e `git diff --check`.
