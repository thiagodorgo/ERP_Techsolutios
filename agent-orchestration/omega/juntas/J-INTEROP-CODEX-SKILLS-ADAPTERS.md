# Junta — D-INTEROP-CLAUDE-CODEX: adapters OpenAI das skills

**Data:** 2026-07-28

**Branch:** `chore/codex-skills-adapters`

**Natureza:** governança/tooling; decisão normal (§C7, maioria simples)

**Resultado:** **APROVADO 3/3 — unânime**

## Escopo avaliado

- criar `agents/openai.yaml` nas 8 skills sem adapter;
- incorporar no versionamento as 5 skills que estavam apenas no checkout local;
- preservar metadata comunitária no formato portátil;
- sincronizar `.claude/skills/` → `.agents/skills/`;
- atualizar decisão e KPIs raiz sem alterar métricas nem `blocks_completed`;
- não tocar `src/`, `tests/`, `prisma/`, `frontend/`, `portals/` nem git stash.

## Votos

| Papel | Voto | Justificativa |
| --- | --- | --- |
| `validador-mestre` | **APROVADO** | Escopo íntegro; 8 adapters coerentes com os `SKILL.md`; 11 skills válidas; JSON/JS/diff verdes; zero path proibido. |
| `agente-ci-doutor` | **FAVORÁVEL** | Gate honesto: sync 11/36, adapters 8/8, quick-validate 11/11, testes do `skill-creator` 9/9, zero skip executado e KPI carry-forward provado. |
| `critico-adversarial` | **APROVADO** | Adapters adjacentes aos `SKILL.md`, inclusive skills aninhadas; recuperação das 5 skills evita adapters órfãos; metadata preservada; nenhuma expansão de produto. |

## Verificações da junta

- `node scripts/sync-agent-skills.mjs --check` → **OK — 11 skills, 36 arquivos, espelho idêntico**.
- `quick_validate.py` → **11/11 skills válidas**.
- 8/8 adapters novos com `display_name`, `short_description` de 25–64 caracteres
  e `default_prompt` contendo `$<skill-name>`.
- testes do pacote `skill-creator` → **9/9**, sem falha e sem skip executado.
- `node --check Kpis/app.js` e parse de `kpis-latest.json`/`kpis-history.json` → OK.
- `git diff --cached --check` → OK.
- KPI carry-forward byte-semântico: backend 1871/1877, smoke 937/937,
  Flutter 807/807, MVP 99%/88% e `blocks_completed=110`, todos inalterados.
- zero arquivo em `src/`, `tests/`, `prisma/`, `frontend/` ou `portals/`.

## Incidente transitório sanado

Os testes Python criaram `scripts/__pycache__/*.pyc` somente na origem `.claude`,
causando drift temporário no `--check`. O artefato regenerável foi removido de
forma restrita após dry-run; o gate foi reexecutado e voltou a verde. Nenhum
binário entra no commit.

## Observações não bloqueantes

- Executar futuros testes Python com `PYTHONDONTWRITEBYTECODE=1` ou limpar
  `__pycache__` antes do sync/check.
- Dois adapters legados usados como molde não seguem integralmente o contrato
  atual de 25–64 caracteres/default prompt; são preexistentes e ficaram fora do
  escopo explícito das 8 skills.

## Gate

**Verde da junta concedido.** Commit e abertura do PR autorizados; merge continua
condicionado ao CI remoto verde e à atualização do campo `pr` dos KPIs após a
criação do PR.
