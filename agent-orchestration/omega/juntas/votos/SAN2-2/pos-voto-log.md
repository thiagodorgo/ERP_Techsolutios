# SAN2-2 — diário do pós-voto (tratamento dos dois achados da cadeira C4)

**Contexto.** Junta do SAN2-2, PR **#363**, **APROVADO 4×0**. A cadeira C4
(`auditor-do-kpi-honesto`, 3ª suplente, identidade NOVA) aprovou com **duas ressalvas nomeadas**
em `04-kpi-voto.json` → `achados`. Este agente **não** foi quem achou — a C4 achou, este trata
(§C7.4-bis: quem acha não conserta).

- **Worktree:** `.claude/worktrees/san2-r`
- **Head julgado:** `c8dc716` (`git rev-parse HEAD` = `c8dc716e9b4ffa014783289fdab484da07858d67`)
- **Mandato:** A-1 (corrigir) · A-2 (registrar como pendência, **NÃO consertar**)
- **Fora do mandato:** a ressalva do item 3d (`pr` null → 363) — é ressalva do voto, não um dos
  dois achados. Não tocada aqui; segue devida antes do merge.

---

## Passo 0 — leitura do voto da C4

Li `agent-orchestration/omega/juntas/votos/SAN2-2/04-kpi-voto.json`, campo `achados`.

**A-1** (`dentro-do-bloco`, MÉDIA, `ajuste`, `bloqueia: false`) — o `summary` publica
"o PR toca 16 arquivos". A C4 mediu commit a commit: `db2d291` (Fase 1) = 9 · `02ced85` (Fase 2)
= 11 · `2e4985b` (Fase 3) = **16** · `12ff986` = 25 · `c8dc716` (head julgado) = **25**. O número
estava **certo quando foi escrito** e envelheceu dentro do próprio PR. Os 3 arquivos de `Kpis/`
— justamente os que a §C3.1 OBRIGA todo PR a tocar — ficaram fora da conta.

**A-2** (`pre-existente` COM evidência de origem, MÉDIA, `bloqueia: false`) — o painel não
renderiza `release.summary` nem a `description` do history. Medição da C4: no `Kpis/app.js`,
removida a linha do `FROZEN` (l.1623, dado congelado e não código de render), `release.` /
`.summary` / `.description` têm **UMA** ocorrência — `if (latest.release && latest.release.status_label)`
(l.932) — e `status_label` **nem existe** no JSON, logo nem essa dispara. Evidência de origem: a
MESMA medição sobre `git show main:Kpis/app.js` (main = `87f6ae6`, merge do #362, 2026-08-29)
devolve a MESMA única ocorrência → antecede o bloco.

---

## Passo 1 — A-1: medição própria do número real

Não copiei o 25 do voto; medi eu mesmo no head julgado.

```
$ git rev-parse HEAD
c8dc716e9b4ffa014783289fdab484da07858d67

$ git diff --name-only main...HEAD | wc -l
25
```

**CONFERE com o 25 da C4.** Decomposição, medida bucket a bucket com
`git diff --name-only main...HEAD -- <caminho> | wc -l`:

| bucket | N |
|---|---|
| `.agents/agents/` + `.claude/agents/` (papéis de agente) | 2 |
| `.github/workflows/ci.yml` | 1 |
| `AGENTS.md` + `CLAUDE.md` (os 2 contratos) | 2 |
| `Kpis/` | 3 |
| `agent-orchestration/` | 15 |
| `scripts/` | 1 |
| `tests/` | 1 |
| **total** | **25** |

Soma fecha: 2+1+2+3+15+1+1 = **25**.

**Nota de divergência com a enumeração da C4 (não com o total).** A C4 enumerou
"2 de `agent-orchestration/controle/`, **12** de `agent-orchestration/omega/`", que somaria 24.
Medido por mim: `agent-orchestration/` tem **15** arquivos no diff (2 em `controle/` + **13** em
`omega/` — a C4 contou 12 em `omega/`). O **total 25 está certo** nas duas medições; a
decomposição dela errou por um em `omega/`. Uso a minha na correção. Não é achado novo: é a
mesma classe do A-1 (enumeração manual), e por isso a formulação nova **âncora o número no
commit** em vez de depender de recontagem.

---

## Passo 2 — A-1: correção, com formulação que NÃO envelhece

A cura que a C4 aponta é **ancorar, não recontar** ("contar os próprios arquivos é
estruturalmente impossível para um summary que ainda vai ganhar commits"). Escolhi a forma
ancorada: o número **e** o commit onde ele foi medido, mais a régua para reproduzi-lo.

Frase antiga (idêntica no `summary` do `kpis-latest.json` e na `description` da entrada SAN2-2
do `kpis-history.json`, ambas no índice 5008 do texto):

> `(o PR toca 16 arquivos: 2 de papel de agente, ci.yml, os 2 contratos, 9 de agent-orchestration/, scripts/sync-agent-agents.mjs e tests/agents-mirror-guard.test.ts)`

Frase nova: ver o diff. Ela (a) diz **25**, (b) ancora em **`c8dc716`, o head julgado**, (c) dá
o comando que a reproduz, (d) inclui os **3 de `Kpis/`** que faltavam, e (e) diz que os 16 eram
de `2e4985b` — em vez de apagar a história, datar as duas medições.

Editados: `Kpis/kpis-latest.json` (`release.summary`) e `Kpis/kpis-history.json`
(`description` da entrada `SAN2-2`). **Nenhum valor de `metrics` tocado** — o A-1 não é métrica.

---

## Passo 3 — A-1: freeze + provas

`node scripts/kpi-freeze.mjs` **depois** de editar os JSON (esquecer derruba o guard), e as três
provas exigidas. Saídas no passo correspondente abaixo.

---

## Passo 4 — A-2: pendência (NÃO conserto)

`P-KPI-PAINEL-NAO-RENDERIZA-SUMMARY` criada em `agent-orchestration/controle/pendencias.md`,
status **ABERTA**, severidade **MÉDIA**. `Kpis/app.js` e `Kpis/index.html` **não** foram tocados
para render — o único toque em `app.js` é a reinjeção do `FROZEN` pelo `kpi-freeze.mjs` (dado
congelado, não código de render), exatamente como o item 3e do voto já caracterizou.

---

## Passo 5 — índice de pendências por script

`python agent-orchestration/controle/gerar-indice-pendencias.py`, com placar antes/depois.

**Armadilha respeitada:** sob `core.autocrlf=true`, `md5sum` e `git status` mentem — o índice
regenerado muda de md5 com `git diff` VAZIO. Medição eol-neutro
(`git -c core.autocrlf=false diff --stat`), nunca md5.
