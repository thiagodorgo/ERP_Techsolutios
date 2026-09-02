# SAN2-1R — Cadeira 03 (KPI e REGISTRO) — Evidência

- **Identidade:** jurado-suplente-kpi-registro-san2-1r (identidade NOVA; o titular caiu sem escrever nada — medição do zero)
- **Data:** 2026-08-29 · **Head julgado:** `4cd0867` · **Base:** `a0a1075` · **Worktree:** `.claude/worktrees/san2-1`

## Item 1 — bateria + métricas (MEDIDO, não herdado)

### 1a. `node --test --import tsx tests/kpi-dashboard-charts.test.ts`
Executado por mim neste worktree, N=1:
```
# tests 16
# pass 16
# fail 0
# cancelled 0
# skipped 0
# duration_ms 5083.133
```
**16/16 — CONFERE com o alegado.**

### 1b. `node scripts/kpi-freeze.mjs --check`
Executado por mim, saída integral:
```
kpi-freeze: em dia (snapshot 2026-08-29).
```
**"em dia" — CONFERE com o alegado.**

### 1c. `git diff a0a1075..4cd0867 -- Kpis/kpis-latest.json`
Diff completo lido (50 linhas). O que muda:
- `version`: `SAN2-R` → `SAN2-1R`; `release.block`/`title`/`summary`/`backfill_note` reescritos para o bloco corrente.
- `release.pr`: `361` → `null` — **conforme contrato §C3.5** (null na autoria; backfill do #361 registrado no history: merge_commit `a0a1075`, approved_head `48dc863`).
- Notas de `flutter_tests`, `frontend_smoke_tests` e `backend_tests` ganham SOMENTE o marcador apendado `[SAN2-1R: valor CARREGADO — bloco de registro, diff de codigo vazio; sem reexecucao (§C3.3).]` — o texto anterior fica intacto.

O que **NÃO** muda (ausente do diff, confirmado no arquivo do head):
- **Nenhum `value`/`total`/`display` de métrica de teste**: flutter 864/864 · smoke 1126/1126 · backend 2595/2597 · contract focused 34/34 — todos idênticos à base.
- **`blocks_completed` = 152** (nota ainda do B-O6R-ARNES, coerente com bloco de registro que não entrega feature).
- **`mvp_demo` = 99% · `mvp_vendavel` = 88%** — intocados, como exige §C3.4 para PR que não move escopo de produto.
- `git diff --stat a0a1075..4cd0867 -- Kpis/` = `app.js` (2), `kpis-history.json` (+14/-1 append), `kpis-latest.json` (18) — sem alteração fora do padrão de snapshot+history.

**Veredito do item 1: os três alegados CONFEREM com execução real. Carregar métricas com marcador §C3.3 é o tratamento correto para diff de código de produto vazio.**

## Item 2 — placar em prosa × execução (MEDIDO)

### 2a. Execução do gerador
`PYTHONIOENCODING=utf-8 python agent-orchestration/controle/gerar-indice-pendencias.py`, saída integral:
```
indice: 229 cabecalhos / 221 IDs | {'FECHADA': 45, 'ABERTA': 184} | baldes {'-': 45, 'C': 77, 'B': 76, 'A': 31} | diferidas-materiais 2
```

### 2b. Idempotência
`git status --porcelain -- agent-orchestration/controle/` **vazio** e `git diff -- pendencias-indice.md` **vazio** após a execução — o gerador NÃO sujou a árvore; nenhum restore necessário.

### 2c. Confronto com o `summary` do `Kpis/kpis-latest.json`
Alegado: "229 cabecalhos / 221 IDs / 184 ABERTAS (77 diferidas -> 107 ativas) / 45 FECHADAS / zero sem status / zero contraditorias".

| Número | Prosa | Execução | |
|---|---|---|---|
| cabeçalhos | 229 | 229 | CONFERE |
| IDs | 221 | 221 | CONFERE |
| ABERTAS | 184 | 184 | CONFERE |
| diferidas (balde C) | 77 | 77 | CONFERE |
| ativas | 107 | B:76 + A:31 = 107 | CONFERE |
| FECHADAS | 45 | 45 (= balde '-') | CONFERE |
| sem status | zero | 45+184 = 229 = todos os cabeçalhos; contador sem SEM-STATUS | CONFERE |
| contraditórias | zero | contador sem CONTRADITORIA | CONFERE |

### 2d. A costura 79 × 77, verificada por execução (a classe que já reprovou este bloco 2×)
O summary fala em "as 79 diferidas" (etiqueta trocada) e publica **77** no placar. Medi a costura:
- **79 linhas** em `pendencias.md` carregam a etiqueta corrigida `balde C — adiada por triagem automática; NÃO verificada item a item` (contagem minha; a 80ª ocorrência de "NÃO verificada" é prosa da entrada `P-SAN2-LEITURA-DAS-79`, linha 4068).
- **77 entradas** têm marcador `**agendamento:** DIFERIDO-LEVE` ATIVO (regex do próprio gerador, reexecutada por mim) = balde C.
- As **2** etiquetadas sem marcador ativo são exatamente as que o summary diz ter movido: `P-036` (FECHADA como duplicata → balde `-`) e `P-Ω3F3B-UPDATE-VALIDA4` (linha 608: `~~DIFERIDO-LEVE~~ → RETIRADO DO BALDE C em 2026-08-29`, achado A-C2 → ativa). 79 − 2 = 77. **A prosa e o placar contam a MESMA história.**
- A velha etiqueta mentirosa ("sem consequencia de produto, dado, seguranca ou numero"): **0 ocorrências** em `pendencias.md` — a troca foi completa.

### 2e. Achado menor (nota, não bloqueia)
O summary escreve o ID do tripwire como `P-O3F3B-UPDATE-VALIDA4` (O latino); o ID real no `pendencias.md` é `P-Ω3F3B-UPDATE-VALIDA4` (Ω grego). O JSON translitera ASCII em todo o texto (escreve "Omega-SAN2", "§C3.3" etc.), então é convenção, não número errado — mas um grep pelo literal do JSON não acha a pendência. Escopo: dentro-do-bloco; gravidade: nota.

**Veredito do item 2: nenhuma divergência prosa × execução. O placar publicado é o placar medido.**
