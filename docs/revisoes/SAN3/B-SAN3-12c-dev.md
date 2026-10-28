# B-SAN3-12c — Relatório do DEV

- **Identidade:** `dev-san312c-sol`
- **Executor/modelo:** Codex CLI · GPT-5.6 Sol · esforço medium · nível menor declarado
- **Papel:** DEV; não planejou e não vota (§C7.4-bis)
- **Fatia atual:** 1 — abertura e baseline
- **Branch/worktree:** `feat/web-financeiro-aparencias-b-c` · `C:/Users/AMP/w-san312c`
- **Head-base:** `3c27f1bf3177d2778bdcfb0dfafd57186780efbc`
- **Plano:** `docs/revisoes/SAN3/B-SAN3-12-plano.md`, Emenda E5

## Evidência incremental — FATIA 1

1. `df -B1 /c` → 13.285.302.272 bytes livres antes do worktree; 12.513.681.408 bytes após instalações e baseline; ambos acima do piso de 7.500.000.000.
2. `git fetch origin main` + `git rev-parse origin/main` → `3c27f1bf3177d2778bdcfb0dfafd57186780efbc`; a base não avançou além da ref planejada.
3. `git worktree list --porcelain` + medição de `C:/Users/AMP/w-san312c` → worktree/ramo não existiam; foram criados isolados em `origin/main`.
4. `git ls-remote --heads origin feat/web-financeiro-baixa-e-contas` → 0 linhas; a ressalva do porteiro sobre a branch residual do 12b já estava satisfeita antes do primeiro push.
5. Node absoluto `C:/Users/AMP/AppData/Local/nvm/v22.14.0/node.exe --version` → `v22.14.0`; npm 10.9.2. `npm ci` raiz → 326 pacotes; `npm --prefix frontend ci` → 103 pacotes. Lockfiles não foram editados.
6. `realpath node_modules` e `realpath frontend/node_modules`, com `test ! -L` → ambos ficam sob `C:/Users/AMP/w-san312c`; nenhuma junction/symlink.
7. `git merge-base --is-ancestor 3c27f1bf HEAD` → verde. Controle negativo com `f2ece5daff9cb57eff04c4df543604b5307f819f` → recusado como não ancestral, sem mutar refs reais.
8. Baseline dirigido: Node 22 absoluto, `node --test --import tsx tests/finance-*.test.ts* tests/financial-*.adapter.test.ts tests/dense-expandable-row.test.tsx tests/pattern-css-guard.test.ts` → **122 testes · 122 pass · 0 fail · 0 skipped**.
9. Baseline smoke completo: `npm --prefix frontend run test:smoke` com Node 22 absoluto → **1482 testes · 1482 pass · 0 fail · 0 skipped**, duração TAP 284.036 s.
10. Inventário estático antes de testes novos: `finance-page-live` 51 casos; `finance-contas-extrato` 30; `finance-baixa` 9; `financial-summary.adapter` 5. Meta E5: baseline real 1482 + pelo menos 40 casos = **≥1522**.
11. Conferência final: E5 externa × E5 versionada por `cmp` → idênticas; `npm --prefix frontend run check` → `tsc -b --noEmit`, ec=0; `git diff --check` limpo; diff em `Kpis src prisma .github mobile` e lockfiles → vazio.
12. Correção de terreno antes do commit: a primeira chamada de patch apontou para a árvore principal. Medição imediata separou os dois worktrees; as mudanças foram reaplicadas no `w-san312c` e revertidas exclusivamente na árvore principal por patch. Resultado conferido: árvore principal sem diff rastreado e somente os três untracked alheios preexistentes; worktree-alvo contém todo o diff desta fatia. Nenhum arquivo alheio foi removido ou alterado.

## Mutações e vermelho-controle — FATIA 1

- Controle operacional obrigatório: um SHA não ancestral foi apresentado ao mesmo gate `merge-base --is-ancestor`; a abertura foi **recusada** (`NEGATIVE_CONTROL=REFUSED_NON_ANCESTOR`). Nenhuma ref foi alterada.
- Não houve código de produto nesta fatia, portanto não há mutação de produto. O restauro é “não aplicável”; `git status` antes da edição estava limpo e as únicas mudanças rastreadas são os registros permitidos desta abertura.

## RETOMADA 1

- **Hora UTC real:** `2026-10-28T23:39:09Z`.
- **Executor/modelo:** `dev-san312c-sol` · Codex CLI · GPT-5.6 Sol · esforço medium · nível menor declarado.
- **Head medido antes do commit da fatia:** `3c27f1bf3177d2778bdcfb0dfafd57186780efbc`; head-base e commit anterior são o mesmo objeto. O SHA deste commit fica no push/log externo, evitando autorreferência impossível.
- **Feito:** worktree/ramo isolados; dependências próprias; E5 versionada verbatim; comando e relatório criados; baseline 122/122 e smoke 1482/1482; aliases e divergências §A2 registrados; `Kpis/**` intocado.
- **Mutações:** controle não ancestral recusado; nenhuma mutação de produto na abertura.
- **Falta:** FATIAS 2–14. A próxima é a FATIA 2, R-P2 — resumo incompleto não vira zero.
- **Próximo comando exato:** `"C:/Program Files/Git/bin/bash.exe" -lc 'cd /c/Users/AMP/w-san312c && df -B1 /c && git status --short --branch && git rev-parse HEAD && git rev-parse origin/main'`.
- **Arquivos meio-escritos:** nenhum.
- **Limpeza:** nenhum artefato temporário removido; `node_modules` próprios permanecem para as fatias seguintes.
