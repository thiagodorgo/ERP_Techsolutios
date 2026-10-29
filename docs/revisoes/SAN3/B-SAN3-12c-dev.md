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

## Ajustes superiores do parecer — aplicados antes do código da FATIA 2

O parecer externo `rev-plano-12c-parecer.md` vale acima da E5 por ordem expressa do dono. Este DEV não altera
requisito nem julga o plano; apenas fixa a execução reproduzível dos dois ajustes aprovados.

### R-T3 — procedimento reproduzível de três vias

Antes de integrar uma `origin/main` nova, registrar `BASE=$(git merge-base HEAD origin/main)`, `BRANCH=$(git
rev-parse HEAD)` e `MAIN=$(git rev-parse origin/main)`. Depois do merge, registrar `RESULT=$(git rev-parse HEAD)`.
Em diretório temporário fora do repositório, executar literalmente a função abaixo para cada uma das quatro refs;
ela normaliza EOL e extrai a seção inteira de cada ID tocado, até o próximo cabeçalho `##`:

```bash
IDS='P-SAN3-12B-BUSCA-TABELA-TITULOS P-FINANCE-SUMMARY-ADAPTER-NUM-ZERO P-SAN3-12-CE4-BRACO1-NA-CI P-SAN3-12B-R4B-TRAVA-RODADA-SEM-TESTE P-SAN3-12B-KPI-PRESSED-COM-CONTA P-SAN3-12B-PERFIL-SEM-ENTRIES-READ-VAZIO P-SAN3-12B-PAGER-ROTULO-FILTRADO P-REGISTRO-MERGE-CONFERE-TRES-VIAS'
extract_sections() {
  ref="$1"; out="$2"
  git show "$ref:agent-orchestration/controle/pendencias.md" | tr -d '\r' |
    awk -v ids="$IDS" 'BEGIN { n=split(ids,a," ") }
      /^## / { keep=0; for (i=1;i<=n;i++) if ($0 ~ ("^## " a[i] "([ (]|$)")) keep=1 }
      keep { print }' > "$out"
}
extract_sections "$BASE" base.sections
extract_sections "$BRANCH" branch.sections
extract_sections "$MAIN" main.sections
extract_sections "$RESULT" result.sections
for f in base branch main result; do LC_ALL=C sort -u "$f.sections" > "$f.sorted"; done
diff -u branch.sections result.sections > branch-result.diff || true
diff -u main.sections result.sections > main-result.diff || true
comm -23 <(comm -13 base.sorted branch.sorted) result.sorted > branch-added-missing.txt
comm -12 <(comm -23 base.sorted branch.sorted) result.sorted > branch-removed-reappeared.txt
comm -23 <(comm -13 base.sorted main.sorted) result.sorted > main-added-missing.txt
comm -12 <(comm -23 base.sorted main.sorted) result.sorted > main-removed-reappeared.txt
```

Aceite: os quatro arquivos `*-missing/reappeared.txt` ficam vazios, salvo lista nominal de edições intencionais
registrada no relatório; os dois `diff` são lidos por seção e toda diferença de estado, dono, `bloqueia`, critério
ou fechamento é explicada. O mesmo `git show REF:caminho | tr -d '\r'` + `diff -u` é aplicado ao plano e a este
relatório. O índice é regenerado depois. Vermelho-controle: em cópia de `result.sections`, trocar uma linha
`status: FECHADA` por `status: ABERTA` sem mudar cabeçalhos; `diff -u` deve acusar a linha e o conjunto
`branch-removed-reappeared.txt` (ou o conjunto equivalente da ponta autora) deixa de ficar vazio.

### FATIA 13 dividida

- **13A — geometria e capturas:** nove combinações A/B/C × 1280×720, 1366×768 e 1440×900; comparação com a
  referência, `scrollWidth <= clientWidth`, dígitos completos, grades e alinhamento tabular; mutações de 27px e
  classe de grade; commit `test(financeiro): comprova geometria das três aparências`.
- **13B — interação, estados e formulários:** teclado, foco/ARIA, detalhe único, formulários e estados R-T5 nas
  três aparências; mutações de ARIA/foco e dois detalhes; recaptura somente das combinações afetadas por ajuste;
  commit `test(financeiro): comprova interação das três aparências`.

Cada subfatia fecha separadamente com teste-dono, mutações, restauro por hash, commit, push e `RETOMADA 13A/13B`.

## Evidência incremental — FATIA 2

1. Retomada P3/P7: `git diff --stat` mediu 4 arquivos, 238 inserções e 58 remoções; a leitura integral do diff
   confirmou parcial restrito a R-P2 e aos dois ajustes superiores do parecer, sem arquivo fora do escopo.
2. `df -B1 /c` → 12.217.450.496 bytes livres no fechamento, acima do piso de 7.500.000.000.
3. Testes donos sobre o parcial restaurado: Node 22 absoluto,
   `node --test --import tsx tests/financial-summary.adapter.test.ts tests/finance-page-live.test.tsx` →
   **49 testes · 49 pass · 0 fail · 0 skipped**.
4. O adapter passou de 5 para 14 casos efetivos, acima da meta M>=10, cobrindo camel/snake, ausência, null,
   string, NaN, Infinity, zero explícito, `linkedPending*`, coleções vazias/ausentes e número inválido na série.
5. `npm --prefix frontend run check` → `tsc -b --noEmit`, ec=0. `git diff --check` → limpo. Diff em
   `src prisma .github Kpis mobile` e lockfiles → vazio.

## Mutações e vermelho-controle — FATIA 2

- **Controle na base da fatia 1 (`043eba17`):** worktree descartável no HEAD anterior; os 14 casos novos foram
  executados por injeção do runner contra o adapter-base, sem editar a cópia. Resultado: **5 pass · 9 fail**,
  todos os nove vermelhos por asserção R-P2 (`source api` em vez de `fallback`), não por compilação/import.
- **Mutação obrigatória:** `invalidSummary().source` foi trocado temporariamente de `fallback` para `api`,
  reproduzindo sucesso API com os zeros do fallback. Testes donos: **38 pass · 11 fail**; falharam os dois
  cenários DOM e os nove casos do adapter que exigem indisponibilidade.
- **Restauro:** hash SHA-256 do adapter antes e depois da mutação =
  `5be301a1b1bbd5fcf7d08e082f1aa1fd2e69853716f2288b3b567256330b6674`; verde 49/49 reexecutado.

## RETOMADA 2

- **Hora UTC real:** `2026-10-29T00:47:12Z`.
- **Executor/modelo:** `dev-san312c-sol` · Codex CLI · GPT-5.6 Sol · esforço medium · nível menor declarado.
- **Head medido antes do commit da fatia:** `043eba17fa832c1bf516f9a4b2882405cfb6c0eb`; head-base
  `3c27f1bf3177d2778bdcfb0dfafd57186780efbc`; remoto da branch ainda em `043eba17`.
- **Feito:** R-P2 fechado no código/testes; resumo incompleto vira fallback seguro, carga inicial não publica
  `R$ 0,00` falso e refresh conserva o último resumo válido com estado stale; ajustes do parecer registrados.
- **Mutações:** base anterior vermelha 9/14; mutação `fallback→api/zero` vermelha 11/49; restauro por hash e
  verde final 49/49.
- **Falta:** FATIAS 3–14, com a 13 dividida em 13A/13B. A próxima é a FATIA 3, R-P1/P4/P5/P6 em A.
- **Próximo comando exato:** `"C:/Program Files/Git/bin/bash.exe" -lc 'cd /c/Users/AMP/w-san312c && df -B1 /c && git status --short --branch && git rev-parse HEAD origin/main'`.
- **Arquivos meio-escritos:** nenhum.
- **Limpeza:** worktree descartável `C:/Users/AMP/w-san312c-f2base` e dois arquivos scratch `fatia2-adapter-*`
  removidos após conferir caminhos; nenhum rastreado, `.env` ou `node_modules` do dev foi removido.

## Evidência incremental — FATIA 3

1. Retomada P3/P7: `git status --short` vazio em `6465f5bd`; a última `RETOMADA 2` declarou a fatia 2 íntegra e
   nenhum arquivo meio-escrito. `df -B1 /c` → 13.524.373.504 bytes livres na abertura e 13.516.591.104 no
   fechamento, acima do piso de 7.500.000.000.
2. R-P1: busca local explícita sobre os títulos carregados cobre documento, cliente/fornecedor e descrição; resultado
   fora da página só aparece depois de `Carregar mais títulos`; limpar a busca restaura as linhas. Nenhum filtro foi
   inventado no servidor.
3. R-P4: indicador global só publica `aria-pressed=true` sem conta em foco; acioná-lo limpa a conta e mantém o filtro
   global visível.
4. R-P5: `readEntries` entrou no modelo único; sem `financial_entries:read`, Extrato/Conciliação exibem
   `StatePanel tone=forbidden`, e os spies confirmam zero GET de extrato, agregado e política.
5. R-P6: contador e pager separam resultado filtrado, títulos carregados e universo do servidor; com filtro local o
   universo vem qualificado como `(sem este filtro)`.
6. Testes donos finais, no diretório `frontend` com Node 22 absoluto:
   `node --test --import tsx tests/finance-page-live.test.tsx tests/finance-contas-extrato.smoke.test.tsx` →
   **51 testes · 51 pass · 0 fail · 0 skipped**. A primeira tentativa a partir da raiz falhou por configuração JSX
   (`React is not defined`) e não foi usada como evidência de produto.
7. `npm --prefix frontend run check` → `tsc -b --noEmit`, ec=0; `git diff --check` limpo; diff em
   `src prisma .github Kpis mobile` e lockfiles → vazio.

## Mutações e vermelho-controle — FATIA 3

- **R-P1 termo ignorado:** restaurar a filtragem-base somente por alvo → teste R-P1/R-P6 vermelho, 20 linhas em vez
  de 1. **Descrição omitida:** retirar `title.description` da allowlist → vermelho, 0 linhas em vez de 1.
- **R-P4 pressed global:** restaurar a expressão-base que aceita alvo não nulo com conta → vermelho,
  `aria-pressed=true` em vez de `false`.
- **R-P5 proibido:** trocar somente o painel de lançamentos de `forbidden` para `empty` → vermelho, painel proibido
  ausente; a trava de rede permaneceu independente.
- **R-P6 pager ambíguo:** restaurar `1–1 de 1 carregados · 130 no servidor` → vermelho contra o rótulo qualificado.
- **Restauro:** SHA-256 de `FinanceiroViewA.tsx` antes das mutações e após todos os restauros =
  `445c4ed8f3f88bb0f262d9ebbf6f6c5ad75f9dd894cc700fedba7da1188ea773`; bateria final 51/51.

## RETOMADA 3

- **Hora UTC real:** `2026-10-29T02:32:07Z`.
- **Executor/modelo:** `dev-san312c-sol` · Codex CLI · GPT-5.6 Sol · esforço medium · nível menor declarado.
- **Head medido antes do commit da fatia:** `6465f5bda70bb819c6efacc4915f0f6b125089ed`; head-base
  `3c27f1bf3177d2778bdcfb0dfafd57186780efbc`.
- **Feito:** R-P1/R-P4/R-P5/R-P6 fechados na aparência A com testes comportamentais, controles vermelhos e
  restauro por hash; `ts-frontend-full` orientou a camada existente e `ui-ux-pro-max` a clareza do estado/pager.
- **Falta:** FATIAS 4–14, com 13 dividida em 13A/13B. A próxima é a FATIA 4, R-P3/C3R3-N2, somente teste
  determinístico da rodada superada.
- **Próximo comando exato:** `"C:/Program Files/Git/bin/bash.exe" -lc 'cd /c/Users/AMP/w-san312c && df -B1 /c && git status --short --branch && git rev-parse HEAD origin/main'`.
- **Arquivos meio-escritos:** nenhum.
- **Limpeza:** nenhuma árvore/scratch temporária criada; `node_modules` próprio preservado.
