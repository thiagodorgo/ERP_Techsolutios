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

## Evidência incremental — FATIA 4

1. Pré-voo limpo em `4c693818`; `df -B1 /c` → 13.515.694.080 bytes livres na abertura e
   13.512.994.816 no fechamento, acima do piso.
2. O teste DOM usa o hook real `useEntriesAggregate` com promises controladas, sem sleeps: dispara duas rodadas da
   mesma consulta, entrega 222 primeiro e 111 por último, e prova que a tela conserva 222.
3. A mesma sonda troca `acc-banco` por `acc-caixa` usando nomes de consulta específicos por conta: antes da resposta
   nova, `conta:acc-caixa` permanece indisponível e não herda 222; depois recebe 333.
4. Teste dono final: `node --test --import tsx tests/finance-page-live.test.tsx` →
   **39 testes · 39 pass · 0 fail · 0 skipped**.
5. `npm --prefix frontend run check` → ec=0; `git diff --check` limpo; proibidos e lockfiles sem diff.

## Mutações e vermelho-controle — FATIA 4

- SHA-256 inicial de `useEntriesAggregate.ts`:
  `b95e59e62ae594157114832858fd9d4cc3d47b695c263cfddd5aca42291ba424`.
- Remoção temporária exclusiva de `if (round !== roundRef.current) return;` → R-P3 vermelho por asserção:
  resposta antiga 111 substituiu 222.
- Guarda restaurada com o mesmo SHA-256; teste dono e arquivo completo voltaram a verde. Nenhuma mudança do hook
  entra no commit.

## RETOMADA 4

- **Hora UTC real:** `2026-10-29T02:35:16Z`.
- **Executor/modelo:** `dev-san312c-sol` · Codex CLI · GPT-5.6 Sol · esforço medium · nível menor declarado.
- **Head medido antes do commit da fatia:** `4c6938181c63fb98f12de0a9375b38f999592dc1`; head-base
  `3c27f1bf3177d2778bdcfb0dfafd57186780efbc`.
- **Feito:** R-P3/C3R3-N2 preso por teste determinístico; o hook permaneceu byte a byte igual.
- **Falta:** FATIAS 5–14, com 13A/13B. A próxima é a FATIA 5, `BalanceBridge` + `ReconcileDonut` na biblioteca.
- **Próximo comando exato:** `"C:/Program Files/Git/bin/bash.exe" -lc 'cd /c/Users/AMP/w-san312c && df -B1 /c && git status --short --branch && git rev-parse HEAD origin/main'`.
- **Arquivos meio-escritos:** nenhum.
- **Limpeza:** nenhuma árvore ou scratch criada; só a mutação in-place restaurada por hash.

## Evidência incremental — FATIA 5

1. Pré-voo limpo em `b4654d1d`; espaço livre 13.511.585.792 bytes na abertura e 13.516.730.368 no fechamento.
2. `BalanceBridge` nasceu na biblioteca de charts como SVG inline, zero dependência: recebe os quatro números do
   `/balance`, publica o saldo literal, aceita zero/negativos, falha fechado em ausência e oferece Entradas/Saídas por
   clique, Enter e Espaço.
3. `ReconcileDonut` usa contagens disjuntas: conciliados sem ressalva = total conciliado − ressalva de valor −
   ressalva de data; total = pendentes + conciliados, sem duplicar ressalvas. Ausência, negativo, fração ou domínio
   inconsistente tornam o dado indisponível.
4. Exports e `COMPONENT_LIBRARY.md` atualizados. Nenhum componente existente foi alterado.
5. Testes donos: `balance-bridge.test.tsx` + `reconcile-donut.test.tsx` →
   **10 testes · 10 pass · 0 fail · 0 skipped** (5 por componente, acima do piso de 4).
6. `npm --prefix frontend run check` → ec=0; `git diff --check` limpo; proibidos/lockfiles sem diff.

## Mutações e vermelho-controle — FATIA 5

- `BalanceBridge`: substituir o saldo literal por `abertura + entradas − saídas` → vermelho (130 em vez de 999);
  inverter os valores de Entradas/Saídas → vermelho no rótulo acessível.
- `ReconcileDonut`: somar ressalvas novamente no total → vermelho (50% em vez de 67%); retirar simultaneamente
  rótulo acessível e callback dos botões → vermelho na prova dos quatro filtros.
- Restauro byte a byte: `BalanceBridge.tsx` =
  `9e0baa3f7d0967e6ea69d42c289f3324a4064da6dc392eb2b6e15ef6cbd2640a`; `ReconcileDonut.tsx` =
  `5278a22e55fedcd322346008f0caac3cb4b2dc70cceb2d84eb94a630f39c3b7a`; verde final 10/10.

## RETOMADA 5

- **Hora UTC real:** `2026-10-29T02:39:00Z`.
- **Executor/modelo:** `dev-san312c-sol` · Codex CLI · GPT-5.6 Sol · esforço medium · nível menor declarado.
- **Head medido antes do commit da fatia:** `b4654d1dc51449cc7c22d7db4c82ca9c9d18d181`; head-base
  `3c27f1bf3177d2778bdcfb0dfafd57186780efbc`.
- **Feito:** R-B/R-D da biblioteca, exports, registro e 10 casos com quatro classes de mutação.
- **Falta:** FATIAS 6–14 (13A/13B). A próxima é a FATIA 6, consultas/estado B por conta e mês.
- **Próximo comando exato:** `"C:/Program Files/Git/bin/bash.exe" -lc 'cd /c/Users/AMP/w-san312c && df -B1 /c && git status --short --branch && git rev-parse HEAD origin/main'`.
- **Arquivos meio-escritos:** nenhum.
- **Limpeza:** nenhum artefato temporário; SVGs/testes são rastreáveis da entrega.

## Evidência incremental — FATIA 6

1. Pré-voo limpo em `0d28b8ad`; espaço livre 13.514.227.712 bytes na abertura e 13.523.582.976 no fechamento.
2. Consultas nomeadas da conta em foco adicionadas sem view nova: pendente comum reaproveitado; conciliado, ressalva
   de valor, ressalva de data e série mensal usam `account_id`; a série explicita a janela civil inclusiva de 6 meses.
3. `filtro=mes:AAAA-MM:in|out` conserva round-trip e produz `from/to/direction` no extrato. A bateria mediu 10 URLs
   agregadas distintas com conta em foco, sem duplicar a consulta comum.
4. `refreshAggregates` inclui o conjunto em foco; a baixa bem-sucedida continua chamando `refreshAll(true)` e,
   portanto, atualiza resumo, extrato e séries.
5. Teste dono `finance-page-live.test.tsx` → **41 testes · 41 pass · 0 fail · 0 skipped**; check TypeScript e
   `git diff --check` verdes; proibidos/lockfiles sem diff.

## Mutações e vermelho-controle — FATIA 6

- Retirar `accountId` da série mensal → vermelho (4 URLs da conta em vez de 5); retirar `from/to` → vermelho na
  fronteira civil esperada; omitir `refreshFocusedAggregates` → vermelho no guard da escrita; duplicar a consulta
  pendente comum → vermelho (11 chamadas/URL repetida).
- Restauro de `FinanceiroPage.tsx` confirmado pelo SHA-256
  `2ecce213d0d188df0ad501ad9850f10fcc2207ed3aa28a253969467647a95b48`; verde final 41/41.

## RETOMADA 6

- **Hora UTC real:** `2026-10-29T02:43:09Z`.
- **Executor/modelo:** `dev-san312c-sol` · Codex CLI · GPT-5.6 Sol · esforço medium · nível menor declarado.
- **Head medido antes do commit:** `0d28b8ad36d239f8028e07ca6ccb433b02ad0d8d`; base `3c27f1bf`.
- **Feito:** R-D da conta/situação/mês, round-trip e refresh comum.
- **Falta:** FATIAS 7–14 (13A/13B); próxima: FATIA 7, estrutura e estados da aparência B.
- **Próximo comando exato:** `"C:/Program Files/Git/bin/bash.exe" -lc 'cd /c/Users/AMP/w-san312c && df -B1 /c && git status --short --branch && git rev-parse HEAD origin/main'`.
- **Arquivos meio-escritos:** nenhum.
- **Limpeza:** nenhuma árvore/scratch; somente mutações restauradas.

## Evidência incremental — FATIA 7

1. Pré-voo limpo em `0d8ae041`; espaço livre 13.524.750.336 bytes no fechamento, acima do piso.
2. `FinanceiroViewB` nasceu pura e ainda inativa: conta em foco, saldo literal da conta, ponte, rosca e série mensal
   recebem exclusivamente o modelo real já consultado; nenhum número de organização é usado como saldo da conta.
3. Estados `loading`, `empty`, `error`, `forbidden`, `stale` e ausência parcial têm paradas explícitas. Saldo,
   agregado ou série ausente permanece indisponível e nunca é convertido em zero.
4. Contas, direções e situações da conciliação são controles acessíveis; o alvo ativo fica visível e removível.
5. Teste dono `finance-aparencia-b.smoke.test.tsx` → **8 testes · 8 pass · 0 fail · 0 skipped**;
   `tsc -b --noEmit` e `git diff --check` verdes; proibidos/lockfiles sem diff.

## Mutações e vermelho-controle — FATIA 7

- Trocar o saldo literal da conta pelo resumo global → vermelho (ponte recebeu 0 em vez de 999).
- Converter agregado pendente ausente em zero → vermelho: fabricou rosca com 100% conciliado.
- Retirar a faixa stale → vermelho; retirar o chip do filtro ativo → vermelho.
- Restauro exato de `FinanceiroViewB.tsx` confirmado por SHA-256
  `544fa017f58243a1fa5d921f398438500a0f899baac297a4d5baf1ec3882c75f`; verde final 8/8.

## RETOMADA 7

- **Hora UTC real:** `2026-10-29T02:47:41Z`.
- **Executor/modelo:** `dev-san312c-sol` · Codex CLI · GPT-5.6 Sol · esforço medium · nível menor declarado.
- **Head medido antes do commit:** `0d8ae041b01b5a568f754f016dd6b98f01e11649`; base `3c27f1bf`.
- **Feito:** estrutura, estados honestos e controles da aparência B, ainda sem ativação no registro.
- **Falta:** FATIAS 8–14 (13A/13B); próxima: FATIA 8, listas/detalhes e baixa da aparência B.
- **Próximo comando exato:** `"C:/Program Files/Git/bin/bash.exe" -lc 'cd /c/Users/AMP/w-san312c && df -B1 /c && git status --short --branch && git rev-parse HEAD origin/main'`.
- **Arquivos meio-escritos:** nenhum.
- **Limpeza:** nenhuma árvore/scratch; somente mutações in-place restauradas por hash.

## Evidência incremental — FATIA 8

1. Pré-voo limpo em `07eba33a`; espaço livre 13.497.204.736 bytes no fechamento, acima do piso.
2. A B reutiliza as tabelas/detalhes densos da A: extrato filtrado pela conta em foco e títulos abertos da
   organização convivem em duas abas, com uma única chave de detalhe inline e busca local sobre carregados.
3. `BaixaForm` ganhou somente `initialAccountId` opcional: aceita a sugestão se a conta está ativa, mantém o seletor
   editável e preserva o default vazio da A. A página compõe o mesmo formulário inline para B; A conserva o modal.
4. O fluxo existente continua dono do payload, releitura, CAS e idempotência; nenhum protocolo de escrita mudou.
5. Testes donos B + page-live + baixa → **61 testes · 61 pass · 0 fail · 0 skipped**; TypeScript e
   `git diff --check` verdes; proibidos/lockfiles sem diff.

## Mutações e vermelho-controle — FATIA 8

- Trocar a conta inicial pela literal `acc-other` → vermelho na ligação `selected.id`; esvaziar o callback da baixa
  → o mesmo teste vermelho.
- Dar uma chave de detalhe independente à segunda lista → vermelho (1 em vez de 2 usos da chave única).
- Gerar `client_action_id` a cada envio → teste F1/F2/F3 vermelho, com IDs diferentes no reenvio.
- Restauro exato: `FinanceiroViewB.tsx` =
  `8c4bdb5cc616d3a92ada140100a8b026c8dea564da9d4c4f8a02df5b3d1860f8`; `BaixaForm.tsx` =
  `c2936c1d9e6d3166dd60d9fcede08d8f4490df67557d2b0ce555d09f985977a0`.

## RETOMADA 8

- **Hora UTC real:** `2026-10-29T02:54:43Z`.
- **Executor/modelo:** `dev-san312c-sol` · Codex CLI · GPT-5.6 Sol · esforço medium · nível menor declarado.
- **Head medido antes do commit:** `07eba33a`; base `3c27f1bf`.
- **Feito:** listas/detalhes B, baixa inline com conta ativa sugerida e invariantes de reenvio preservados.
- **Falta:** FATIAS 9–14 (13A/13B); próxima: FATIA 9, séries e filtros da aparência C.
- **Próximo comando exato:** `"C:/Program Files/Git/bin/bash.exe" -lc 'cd /c/Users/AMP/w-san312c && df -B1 /c && git status --short --branch && git rev-parse HEAD origin/main'`.
- **Arquivos meio-escritos:** nenhum.
- **Limpeza:** nenhuma árvore/scratch; somente mutações in-place restauradas por hash.

## Evidência incremental — FATIA 9

1. Retomada medida em `ae3e291c`: o parcial não commitado já continha `DayBars`, seis consultas da rotina e os
   filtros de dia/idade; os testes donos expuseram somente duas contagens antigas (10/6) anteriores às seis queries
   novas. Elas foram atualizadas para 16/12 sem afrouxar a prova de URL única.
2. A janela diária usa 14 datas civis inclusivas; as idades `0-2`, `3-7`, `8-15` e `16+` são disjuntas. Dia e idade
   fazem round-trip na URL e viram filtros de extrato aplicados no servidor.
3. As duas séries diárias e as quatro faixas preservam `account_id` quando há conta em foco. `DayBars` recebe somente
   buckets retornados, não completa dia ausente, distingue `null` de zero e oferece cada dia como filtro acessível.
4. `DayBars` foi exportado, registrado em `COMPONENT_LIBRARY.md` e incluído em `test:smoke`, junto aos dois gráficos
   já criados na fatia 5. Nenhuma dependência, regra financeira ou soma monetária entrou.
5. Testes donos finais `day-bars.test.tsx` + `finance-page-live.test.tsx` → **47 testes · 47 pass · 0 fail · 0 skipped**;
   `npm --prefix frontend run check` e `git diff --check` verdes; proibidos, lockfiles e KPIs sem diff.

## Mutações e vermelho-controle — FATIA 9

- Trocar os getters civis por UTC → vermelho na virada de data; retirar `accountId` da série → vermelho na prova das
  seis consultas; sobrepor `3-7` com `0-2` → vermelho na fronteira exata.
- Trocar a série diária por agregado global (`groupBy: none`) → vermelho (5 consultas de rotina em vez de 6); tratar
  `days=null` como período vazio → vermelho contra o estado indisponível.
- Restauro byte a byte: `DayBars.tsx` =
  `6444dfd9519377a49f4bb509fb8a56ce8358163db927f8585846c5e0d403740b`, `FinanceiroPage.tsx` =
  `d67f92db337ef962728f9845728c53f5abb1fdd13e5448b38f9ab07b6ceb793d`, `financeiro.state.ts` =
  `9d2e83c7e2d60bb03e293ca97e464f3a5d05b3be9e38639c340fe4dab9728fac`.

## RETOMADA 9

- **Hora UTC real:** `2026-10-29T03:11:10Z`.
- **Executor/modelo:** `dev-san312c-sol` · Codex CLI · GPT-5.6 Sol · esforço medium · nível menor declarado.
- **Head medido antes do commit:** `ae3e291c8b605c10816fa6d72b6a5f269acd4108`; base `3c27f1bf`.
- **Feito:** R-C/R-D de séries diárias, idade das pendências, filtros navegáveis e `DayBars`, com controles
  reproduzíveis e estados honestos segundo `ts-frontend-full` e `ui-ux-pro-max`.
- **Falta:** FATIAS 10–14 (13A/13B); próxima: FATIA 10, estrutura da aparência C.
- **Próximo comando exato:** `"C:/Program Files/Git/bin/bash.exe" -lc 'cd /c/Users/AMP/w-san312c && df -B1 /c && git status --short --branch && git rev-parse HEAD origin/main'`.
- **Arquivos meio-escritos:** nenhum.
- **Limpeza:** nenhuma árvore/scratch; somente mutações in-place restauradas por hash.

## Evidência incremental — FATIA 10

1. `FinanceiroViewC` nasceu pura sobre o modelo existente: passos Baixar/Conciliar/Ressalvas/Extrato, movimento
   diário, vencimentos carregados e resumo real de cheques; não foi ativada no registry.
2. Contagens locais dizem “títulos carregados” e mostram o universo do servidor separadamente. A lacuna de filtro
   inverso de cheques é explicada sem mock, UUID, N+1 ou vínculo inventado.
3. Loading, empty, error, forbidden e stale têm estados explícitos. Teste dono → **8 testes · 8 pass · 0 fail ·
   0 skipped**; check e diff-check verdes; proibidos/lockfiles/KPIs sem diff.

## Mutações e vermelho-controle — FATIA 10

- Retirar o número do passo Ressalvas, retirar o banner stale, rotular subconjunto como servidor e inventar
  “título t1 vinculado ao cheque” → quatro controles vermelhos específicos; restauro `FinanceiroViewC.tsx` =
  `8983b34bacc61f896a158662f5e75db939100524d46e9494baa3014ee9e6fdc0`.

## RETOMADA 10

- **Hora UTC real:** `2026-10-29T03:15:34Z`.
- **Executor/modelo:** `dev-san312c-sol` · Codex CLI · GPT-5.6 Sol · esforço medium · nível menor declarado.
- **Head medido antes do commit:** `070be295`; base `3c27f1bf`.
- **Feito:** estrutura e estados honestos da aparência C, ainda inativa.
- **Falta:** FATIAS 11–14 (13A/13B); próxima: FATIA 11, sequência individual da conferência.
- **Próximo comando exato:** `"C:/Program Files/Git/bin/bash.exe" -lc 'cd /c/Users/AMP/w-san312c && df -B1 /c && git status --short --branch && git rev-parse HEAD origin/main'`.
- **Arquivos meio-escritos:** nenhum.
- **Limpeza:** nenhuma árvore/scratch; mutações restauradas.

## Evidência incremental — FATIA 11

1. A C ganhou fila individual com um detalhe aberto por vez; trocar linha só muda seleção local. O mesmo
   `ConciliarForm` continua dono da escrita, CAS, releitura e erros.
2. O avanço é callback guardado e chamado exclusivamente pelo `onDone`; fechar/403/409/422/rede não confirma nem
   avança. O fim parcial informa que há mais itens no servidor.
3. Testes donos C + page-live → **52 testes · 52 pass · 0 fail · 0 skipped**; check/diff-check verdes.

## Mutações e vermelho-controle — FATIA 11

- Chamar o avanço no fechamento → vermelho (duas chamadas/fechar confirma); declarar “Tudo conferido” com página
  parcial → vermelho. Restauro: `FinanceiroPage.tsx` = `a7995bb6849ad778d0cc58527ed2cf63a6913eb40f2c0bcf30797ee52bc5b3c9`;
  `FinanceiroViewC.tsx` = `22da3052dba78a48b7b7e0fa06f107221816d3dcf8b68d81c5f04f805c5d5e7f`.

## RETOMADA 11

- **Hora UTC real:** `2026-10-29T03:18:59Z`.
- **Executor/modelo:** `dev-san312c-sol` · Codex CLI · GPT-5.6 Sol · esforço medium · nível menor declarado.
- **Head medido antes do commit:** `55779deb`; base `3c27f1bf`.
- **Feito:** sequência individual e avanço somente após sucesso.
- **Falta:** FATIAS 12–14 (13A/13B); próxima: FATIA 12, ativação A/B/C e invariantes.
- **Próximo comando exato:** `"C:/Program Files/Git/bin/bash.exe" -lc 'cd /c/Users/AMP/w-san312c && df -B1 /c && git status --short --branch && git rev-parse HEAD origin/main'`.
- **Arquivos meio-escritos:** nenhum.
- **Limpeza:** temporários TAP em `/tmp`; mutações restauradas.

## Evidência incremental — FATIA 12

1. `useScreenAppearance("financeiro")` seleciona A/B/C e o registry publica os três nomes aprovados. A prova DOM
   escolheu B e C com uma chamada por rota comum, sem gravação automática da preferência.
2. Bateria A/B/C + F8/F17 → **82 testes · 82 pass · 0 fail · 0 skipped**; o próprio controle F8 executa as sete
   formas exigidas de `.reduce` em árvore temporária e o guard de linguagem varre as views novas.
3. Forçar sempre A deixou o teste de preferência vermelho (`A !== B`); restauro: Page =
   `a25a54a26c9ade96301f9e349fd1cb41832f6c12e6ca450098d9b2adf4121f94`, registry =
   `e0c0456b7a1b6d2f23e8222cd2505e22b1bfba5828f75fbcdf3f4fbeb5a51cd9`. Check/diff-check verdes.

## RETOMADA 12

- **Hora UTC real:** `2026-10-29T03:21:56Z`.
- **Executor/modelo:** `dev-san312c-sol` · Codex CLI · GPT-5.6 Sol · esforço medium · nível menor declarado.
- **Head medido antes do commit:** `b7c0cc6c`; base `3c27f1bf`.
- **Feito:** ativação A/B/C, registry e invariantes transversais.
- **Falta:** FATIAS 13A, 13B e 14; próxima: 13A, matriz visual/geométrica.
- **Próximo comando exato:** `"C:/Program Files/Git/bin/bash.exe" -lc 'cd /c/Users/AMP/w-san312c && df -B1 /c && git status --short --branch && git rev-parse HEAD origin/main'`.
- **Arquivos meio-escritos:** nenhum.
- **Limpeza:** temporários TAP em `/tmp`; árvore do produto limpa.

## Evidência incremental — FATIA 13A

1. A fatia 13 foi dividida pelo parecer. 13A prendeu CSS escopado B/C, grids nas três larguras-alvo, colapso,
   linha de 40px, dinheiro tabular e rótulos acessíveis. Bateria → **26 testes · 26 pass · 0 fail · 0 skipped**.
2. Mutar a linha para 47px deixou o controle geométrico vermelho; restauro de `app.css` =
   `15ee8720f055bc7d08c0b0b2ff73d9087ebd302d1ca46a9f52dc1bdec73e85c1`.
3. Chrome/Edge/Chromium não foram encontrados pelos caminhos/commands medidos; portanto não se inventam nove
   capturas nem aprovação visual. A sonda real permanece para `cognicao-visual`/CI; esta fatia prova o contrato CSS.

## RETOMADA 13A

- **Hora UTC real:** `2026-10-29T03:23:15Z`.
- **Executor/modelo:** `dev-san312c-sol` · Codex CLI · GPT-5.6 Sol · esforço medium · nível menor declarado.
- **Head medido antes do commit:** `338c26f1`; base `3c27f1bf`.
- **Feito:** geometria estática e responsividade B/C; indisponibilidade do navegador registrada honestamente.
- **Falta:** FATIAS 13B e 14; próxima: 13B, interação/teclado/formulários e handoff visual.
- **Próximo comando exato:** `"C:/Program Files/Git/bin/bash.exe" -lc 'cd /c/Users/AMP/w-san312c && df -B1 /c && git status --short --branch && git rev-parse HEAD origin/main'`.
- **Arquivos meio-escritos:** nenhum.
- **Limpeza:** nenhum servidor/artefato de navegador criado.

## Evidência incremental — FATIA 13B

1. Bateria de interação, teclado, detalhe único, baixa e conciliação A/B/C → **91 testes · 91 pass · 0 fail ·
   0 skipped**. O teste geométrico entrou no smoke oficial.
2. Retirar o rótulo das etapas deixou o controle acessível vermelho; restauro de ViewC =
   `22da3052dba78a48b7b7e0fa06f107221816d3dcf8b68d81c5f04f805c5d5e7f`. Os controles anteriores de duas chaves,
   callback vazio e avanço no fechamento continuam verdes nesta bateria.
3. Sem navegador instalado, capturas/medição real seguem explicitamente pendentes para `cognicao-visual`; não há
   SHA de imagem fabricado. A prova desta cadeira é DOM/CSS/interação executada.

## RETOMADA 13B

- **Hora UTC real:** `2026-10-29T03:24:15Z`.
- **Executor/modelo:** `dev-san312c-sol` · Codex CLI · GPT-5.6 Sol · esforço medium · nível menor declarado.
- **Head medido antes do commit:** `5c44f66a`; base `3c27f1bf`.
- **Feito:** interação/teclado/forms e inclusão do guard geométrico no smoke.
- **Falta:** FATIA 14, bateria, registro, PR e entrega.
- **Próximo comando exato:** `"C:/Program Files/Git/bin/bash.exe" -lc 'cd /c/Users/AMP/w-san312c && df -B1 /c && git status --short --branch && git rev-parse HEAD origin/main'`.
- **Arquivos meio-escritos:** nenhum.
- **Limpeza:** `/tmp/f13b.tap` é temporário regenerável; nenhum build/browser criado.

## Evidência incremental — FATIA 14

1. `origin/main` permaneceu em `3c27f1bf`, o mesmo merge-base; não houve merge concorrente. R-T3 reproduzível:
   `BRANCH_ADDITIONS_MISSING=0`, `BRANCH_REMOVALS_REAPPEARED=0`, `MAIN_CONTRIBUTIONS_SINCE_BASE=0`; a cópia
   mutada reabrindo um fechamento acusou a linha FECHADA perdida.
2. Bateria final: check verde; dirigida **180/180**; smoke **1530/1530** no Node 22.14.0 e **1530/1530** no
   Node 20.19.5; build Vite verde; diff-check limpo; backend/Prisma/.github/Kpis e lockfiles sem diff.
3. R-P1..R-P6 foram fechadas no registro e o índice foi regenerado (678 cabeçalhos/667 IDs). CE-4 braço 1,
   divergências de dados, validação visual e marco KPI #473 continuam abertos com dono, sem falso fechamento.
4. PR #474 aberto: `https://github.com/thiagodorgo/ERP_Techsolutios/pull/474`.

## RETOMADA 14

- **Hora UTC real:** `2026-10-29T03:36:44Z`.
- **Executor/modelo:** `dev-san312c-sol` · Codex CLI · GPT-5.6 Sol · esforço medium · nível menor declarado.
- **Head medido antes do commit final:** `5f611da72e6a6f1c918ecfbe23cdb73a1fc1b58e`; base `3c27f1bf`.
- **Feito:** todas as fatias, bateria, registro, índice e PR #474.
- **Falta no DEV:** nada. Próximo: revisor independente + `cognicao-visual` + CI; orquestrador cuida de #473
  depois do merge + porteiro.
- **Próximo comando exato:** `gh pr view 474 --repo thiagodorgo/ERP_Techsolutios --json headRefOid,statusCheckRollup`.
- **Arquivos meio-escritos:** nenhum.
- **Limpeza:** `frontend/dist/` foi gerado e está ignorado; a remoção explícita foi recusada pela política de execução
  do host, registrada sem mascarar. Temporários TAP em `/tmp` são regeneráveis; nenhum rastreado foi apagado.

**pronto para revisão**

## RETOMADA 15

- **Hora UTC real:** `2026-10-29T11:12:41Z`.
- **Executor/modelo:** `dev-san312c-nv-sol` · Codex · GPT-5.6 Sol · nível menor declarado; não revisou o PR.
- **Head medido antes do commit:** `33bde2eef0851190156f9686b003f9cac156465f`; base `3c27f1bf`.
- **Feito:** a aparência B passou a resolver a conta efetiva no contêiner único; URL, extrato, agregados focados,
  rotina e destaque usam o mesmo `accountId`. Sem conta válida, adota a primeira ativa; conta inativa pedida continua
  selecionada para consulta. O enum `bank` passou a usar o rótulo de negócio `Conta bancária`.
- **Teste dono vermelho antes do código:** bateria B/Page → `52 pass · 4 fail`; as falhas provaram enum cru, conta
  inativa desviada e conta ativa destacada sem consultas focadas. Depois da correção → `56 pass · 0 fail · 0 skipped`.
- **Mutações:** retirar o fallback da primeira ativa reprovou `R-B: B sem conta na URL`; limitar a seleção a contas
  ativas reprovou o caso de consulta inativa; voltar ao enum `selected.kind` reprovou o rótulo. Restauro conferido:
  `FinanceiroPage.tsx` `b189b10f...` e `FinanceiroViewB.tsx` `476a9c78...`.
- **Validação:** `npm --prefix frontend run check` verde; `git diff --check` limpo.
- **Falta:** RETOMADA 16 — recorte `sem7`, escopo do teste geométrico, pendências/registro, relatório final e bateria.
- **Próximo comando exato:** `cd /c/Users/AMP/w-san312c && npm --prefix frontend run check`.
- **Arquivos meio-escritos:** nenhum. **Limpeza:** nenhuma saída de build criada.

## RETOMADA 16

- **Hora UTC real:** `2026-10-29T11:14:27Z`.
- **Executor/modelo:** `dev-san312c-nv-sol` · Codex · GPT-5.6 Sol · nível menor declarado; não revisou o PR.
- **Head anterior:** `32f6824b`; base `3c27f1bf`.
- **Feito:** “Próximos dias” agora reutiliza exatamente a regra `sem7` (1–7 dias civis), portanto o número do bloco
  corresponde à lista que ele abre. O teste `finance-aparencias-geometry.test.ts`, fora da lista fechada da E5.3 e
  incapaz de medir geometria real, foi retirado junto de sua entrada no smoke; nenhuma regra visual o substituiu.
- **Teste dono vermelho antes do código:** cenário com títulos em +3 e +10 dias esperava 1 e recebeu 2; após a
  correção, `finance-aparencia-c.smoke` → `11 pass · 0 fail · 0 skipped`.
- **Mutação:** voltar a contar todo vencimento futuro reprovou o mesmo caso; restauro de `FinanceiroViewC.tsx`
  conferido pelo SHA-256 `223a6ce1...`.
- **Validação:** `npm --prefix frontend run check` verde; ausência do caminho fora de escopo e da entrada no script
  comprovada por `test ! -e` + `grep`; `git diff --check` limpo.
- **Falta:** registro/pendências, bateria smoke com N real e seção final “Correção não visual (29/10)”.
- **Próximo comando exato:** `cd /c/Users/AMP/w-san312c && npm --prefix frontend run test:smoke`.
- **Arquivos meio-escritos:** nenhum. **Limpeza:** nenhuma saída de build criada.
