# DEV ciclo 2 — B-SAN3-05

- Identidade: `dev-ciclo2-b-san3-05`
- Papel: desenvolvedor do ciclo 2; não achou, não planejou e não votou.
- Modelo: GPT-5.6 Sol — substituição declarada por decisão do dono em 2026-10-08; o bloco não toca dinheiro e Fable/Astra ficam reservados a blocos de dinheiro.
- Worktree exclusivo: `C:/Users/AMP/w-o05`
- Ramo: `fix/runtime-role-sem-bypass`
- PR: #405

## Pré-condições

### P0.1 — head local × remoto

**Comando:** `git -C C:/Users/AMP/w-o05 rev-parse HEAD`; `git -C C:/Users/AMP/w-o05 ls-remote origin refs/heads/fix/runtime-role-sem-bypass`

**Saída resumida:** ambos devolveram `ebffaca889ce81e326a657921811e19f40ecc19f`.

**Resultado:** PASSOU — ponto de partida local e remoto idênticos ao SHA determinado pelo dono.

### P0.2 — contrato, memória e plano

**Comando:** `Get-Content` integral de `.agents/skills/saas-multi-tenant/SKILL.md`, `CLAUDE.md`, `PROJECT_MEMORY.md` e `docs/revisoes/SAN3/B-SAN3-05-plano.md` C2.1–C2.6; busca do estado vivo em `status-geral`, `log-execucao` e `controle`.

**Saída resumida:** contrato canônico com separação de papéis/P1/P7 lido; plano C2 `STATUS: COMPLETO`; escopo, paradas RC3/RC4 e bateria B0–B14 identificados.

**Resultado:** PASSOU — a autorização específica do plano para RLS prevalece sobre a restrição genérica da skill.

### P0.3 — árvore e scratchpads preservados

**Comando:** `git status --short --branch`; `git log --oneline --decorate -12`; `git diff --name-status origin/main...HEAD`.

**Saída resumida:** ramo correto e sem mutação rastreada; somente `?? scratchpad/`; `pl05c2` e `pl05c2s` não serão apagados nem commitados.

**Resultado:** PASSOU — terreno inicial preservado.

## Integração da main e KPI congelado

### I1 — `origin/main` integrada por merge

**Comando:** `git fetch origin main`; `git rev-parse origin/main`; `git merge --no-edit origin/main`.

**Saída resumida:** `origin/main=c8af64580cb85ddf4960fecb2f8604384f8f0328`; merge iniciado sem rebase/force; conflitos somente nos 4 registros previstos pelo plano.

**Resultado:** PARCIAL — merge em curso; resolução por união em I2.

### I2 — quatro conflitos de registro resolvidos por união

**Comando:** remoção mecânica somente dos marcadores nos 3 registros-fonte, preservando os dois lados; `python agent-orchestration/controle/gerar-indice-pendencias.py`; busca por `^(<<<<<<<|=======|>>>>>>>)` nos 4 arquivos.

**Saída resumida:** união preservou as entradas do B-SAN3-05 e da main/B-SAN3-11; índice regenerado com 446 cabeçalhos/435 IDs, 326 abertas, 117 fechadas, 3 sem status; marcadores = 0.

**Resultado:** PASSOU — os quatro conflitos previstos foram resolvidos sem apagar nenhum lado.

### I3 — `Kpis/*` byte a byte na versão da main

**Comando:** `git -c core.autocrlf=false checkout origin/main -- Kpis/app.js Kpis/kpis-latest.json Kpis/kpis-history.json Kpis/kpis-history.md`; `git diff --quiet origin/main -- Kpis/`.

**Saída resumida:** `kpi_diff_ec=0`.

**Resultado:** PASSOU — KPI congelado; o diff final do PR não carrega alteração própria em `Kpis/*`.

## Implementação

### B1 — credencial sem senha em claro no canal do servidor

**Comando:** EM APURAÇÃO

**Saída resumida:** EM APURAÇÃO

**Resultado:** EM APURAÇÃO

### B2 — toda mutação de catálogo sob a trava única

**Comando:** EM APURAÇÃO

**Saída resumida:** EM APURAÇÃO

**Resultado:** EM APURAÇÃO

### B3 — ratchet fail-closed e catálogo FORCE reconciliado

**Comando:** EM APURAÇÃO

**Saída resumida:** EM APURAÇÃO

**Resultado:** EM APURAÇÃO

### B4 — cenário executável por membro FORCE da superfície

**Comando:** EM APURAÇÃO

**Saída resumida:** EM APURAÇÃO

**Resultado:** EM APURAÇÃO

### D1 — T8d mede exercibilidade de REPLICATION

**Comando:** EM APURAÇÃO

**Saída resumida:** EM APURAÇÃO

**Resultado:** EM APURAÇÃO

### D2 — via de views transitiva

**Comando:** EM APURAÇÃO

**Saída resumida:** EM APURAÇÃO

**Resultado:** EM APURAÇÃO

### D3 — boot de produção fail-closed e filhos finalizados

**Comando:** EM APURAÇÃO

**Saída resumida:** EM APURAÇÃO

**Resultado:** EM APURAÇÃO

### D4 — logs sem componentes da URL efetiva

**Comando:** EM APURAÇÃO

**Saída resumida:** EM APURAÇÃO

**Resultado:** EM APURAÇÃO

### A1 — ajustes do ciclo 2 e pendências C2.6

**Comando:** EM APURAÇÃO

**Saída resumida:** EM APURAÇÃO

**Resultado:** EM APURAÇÃO

## Validação B0–B14

### B0 — head, CI, escopo e KPI

**Comando:** EM APURAÇÃO

**Saída resumida:** EM APURAÇÃO

**Resultado:** EM APURAÇÃO

### B1 — `npm run check`

**Comando:** EM APURAÇÃO

**Saída resumida:** EM APURAÇÃO

**Resultado:** EM APURAÇÃO

### B2 — `npm run lint`

**Comando:** EM APURAÇÃO

**Saída resumida:** EM APURAÇÃO

**Resultado:** EM APURAÇÃO

### B3 — testes unitários/contratuais selecionados

**Comando:** EM APURAÇÃO

**Saída resumida:** EM APURAÇÃO

**Resultado:** EM APURAÇÃO

### B4 — gerador normal e `--all`

**Comando:** EM APURAÇÃO

**Saída resumida:** EM APURAÇÃO

**Resultado:** EM APURAÇÃO

### B5 — modo e EOL do script

**Comando:** EM APURAÇÃO

**Saída resumida:** EM APURAÇÃO

**Resultado:** EM APURAÇÃO

### B6 — receitas DB N=3 + controle sem psql

**Comando:** EM APURAÇÃO

**Saída resumida:** EM APURAÇÃO

**Resultado:** EM APURAÇÃO

### B7 — matriz do `server.log`

**Comando:** EM APURAÇÃO

**Saída resumida:** EM APURAÇÃO

**Resultado:** EM APURAÇÃO

### B8 — lote DB N=10

**Comando:** EM APURAÇÃO

**Saída resumida:** EM APURAÇÃO

**Resultado:** EM APURAÇÃO

### B9 — canário e guarda estrutural

**Comando:** EM APURAÇÃO

**Saída resumida:** EM APURAÇÃO

**Resultado:** EM APURAÇÃO

### B10 — porta REPLICATION

**Comando:** reservado à junta 2 por C2.4.

**Saída resumida:** não cabe ao dev.

**Resultado:** AGUARDA JUNTA

### B11 — suíte inteira e build

**Comando:** EM APURAÇÃO

**Saída resumida:** EM APURAÇÃO

**Resultado:** EM APURAÇÃO

### B12 — premissas e diff do guard de catálogo

**Comando:** EM APURAÇÃO

**Saída resumida:** EM APURAÇÃO

**Resultado:** EM APURAÇÃO

### B13 — `git diff --check`

**Comando:** EM APURAÇÃO

**Saída resumida:** EM APURAÇÃO

**Resultado:** EM APURAÇÃO

### B14 — caminho do compose

**Comando:** EM APURAÇÃO

**Saída resumida:** EM APURAÇÃO

**Resultado:** EM APURAÇÃO

## Divergências e paradas obrigatórias

EM APURAÇÃO

## Checklist — B-SAN3-05 · ciclo 2 · desenvolvimento

**Solicitado:**

- [ ] B1 — EM APURAÇÃO
- [ ] B2 — EM APURAÇÃO
- [ ] B3 — EM APURAÇÃO
- [ ] B4 — EM APURAÇÃO
- [ ] D1 — EM APURAÇÃO
- [ ] D2 — EM APURAÇÃO
- [ ] D3 — EM APURAÇÃO
- [ ] D4 — EM APURAÇÃO
- [ ] Ajustes do ciclo — EM APURAÇÃO
- [ ] Integração da main — EM APURAÇÃO
- [ ] `Kpis/*` à main — EM APURAÇÃO

**Feito:** EM APURAÇÃO

**Não feito / divergências:** EM APURAÇÃO

**Validação:** EM APURAÇÃO

**Head empurrado:** EM APURAÇÃO

**Próximos passos (análise):** EM APURAÇÃO
