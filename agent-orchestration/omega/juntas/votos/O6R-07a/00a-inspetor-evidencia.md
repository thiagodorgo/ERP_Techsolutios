# Evidencia do inspetor de terreno — junta B-O6R-07a (PR #369)

Inspetor: inspetor-de-terreno-da-junta (identidade nova, Fable por contrato).
Worktree inspecionado: `.claude/worktrees/b07`, branch `fix/o6r07a-authorization`.
Protocolo: esqueleto criado ANTES de medir; cada item apensado com comando + saida + veredito parcial.

## T1 — Arvore, isolamento e o vizinho (ciclo 5 do B-O6R-02) — MEDIDO

**1. Head e arvore do b07.**
- `git rev-parse --short HEAD` -> `e9a9caa` · branch `fix/o6r07a-authorization` · `git status --porcelain` -> apenas `?? .../00a-inspetor-evidencia.md` (este arquivo, meu). Sem mutacao viva.
- **DESVIO do briefing:** o cabecalho do briefing diz head a julgar = `7c248c9`. Medido: `git merge-base --is-ancestor 7c248c9 e9a9caa` -> ec=0 e `git log 7c248c9..e9a9caa` -> exatamente 1 commit (`e9a9caa docs(junta): briefing...`), que `git show --stat` prova tocar SO `BRIEFING-O6R-07a.md` (+206, 1 arquivo). `gh pr view 369` -> head do PR = `e9a9caa`. O codigo a julgar E o de `7c248c9`; o head real do PR/worktree e `e9a9caa` (briefing por cima). Jurados registram `head_julgado = e9a9caa` sabendo que o delta vs `7c248c9` e so o briefing. RESSALVA R1.

**2. O vizinho (ciclo 5 do B-O6R-02, Codex, UMA tentativa).**
- `git worktree list` -> `agent-af6ea607f3ddf8efd` em `84bb90b`, branch `feat/o6r-b02-financial-uow`.
- `git merge-base --is-ancestor 12c3825 84bb90b` -> **ec=0**: o head `12c3825` do preflight esta PRESERVADO como ancestral. `git log 12c3825..84bb90b` -> apenas o merge de `origin/main` (`f895dd2`, conteudos #359..#368) para dentro da branch; o untracked `B-O6R-02-ciclo5-terreno-pos-absorcao.md` naquele worktree indica absorcao feita pelo proprio preflight do ciclo 5. Ninguem desta junta o moveu.
- `git -C <vizinho> status --porcelain` -> 2 untracked proprios do ciclo 5. Nada desta junta la.
- **O que PODE move-lo a partir desta junta (tudo proibido):** (a) `Edit`/`Write` com caminho absoluto errado (precedente real — armadilha 8); (b) git destrutivo no `.git` compartilhado (reset/checkout -- ./stash/branch -f/rm de lock); (c) `git worktree remove/prune` no caminho dele. Regra: **o caminho `agent-af6ea607f3ddf8efd` nao aparece em NENHUM comando de jurado.**

**3. Junction/symlink de node_modules.**
- `cmd /c dir /AL` na raiz dos 6 candidatos (main, main/frontend, b07, b07/frontend, vizinho, gov-descuido) -> **zero reparse points**. Cada `node_modules` presente e diretorio real (b07: 222 entradas; b07/frontend: 61 entradas; vizinho: proprio; gov-descuido: nao tem). PROIBICAO respeitada.

**4. Residuo e containers.**
- `docker ps -a` -> 4 containers: `erp-postgres` (5432) e `erp-redis` (6379) = **base viva, INTOCAVEL**; `codex-o6r-c5-d29-pg` (32769) e `codex-o6r-c5-d29-redis` (32770), Up ~50min = **cluster descartavel ATIVO do ciclo 5** — nao e residuo, e tambem e intocavel. Nenhum orfao `jur-*`/`crit-*`. Nenhum `*probe*` solto na arvore b07 (find maxdepth 2 -> vazio).
- Worktree principal (`demo/investidor`, `d1fab3b`) tem mutacao viva: `planejador-mestre.md`, `porteiro-pos-merge.md`, `sync-agent-agents.mjs` modificados + `votos/SAN2-6/` untracked. FORA do terreno julgado; nenhum e arquivo das 3 cadeiras desta junta. Jurado nao escreve na arvore principal. RESSALVA R2.
- Worktree `gov-descuido` (`497d360`): status vazio, sem node_modules — inerte.

**5. Onde cada cadeira faz drill de mutacao (sem sujar a arvore julgada).**
- Regra unica: **drill de mutacao NUNCA no b07**. Cadeira que muta cria worktree proprio a partir de `e9a9caa` (`git worktree add .claude/worktrees/jur-b07a-cN e9a9caa --detach`), roda `npm ci` proprio (JAMAIS junction), muta la, mede, e remove SO com `git worktree remove --force`.
- C1 (muta `catalog.ts` p/ provar rota abrindo a papel indevido): worktree proprio + cluster descartavel proprio.
- C2 (sondas lockout/rate-limit/KDF): leitura e testes no b07 sao ok; qualquer mutacao de arnes -> worktree proprio; banco/redis -> cluster descartavel proprio.
- C3 (muta caminhos PROIBIDOS p/ provar guard + APLICA a migracao): mutacao no worktree proprio; migracao aplicada SO no postgres descartavel proprio.
- **Portas medidas AGORA** (rotacionam a cada boot — jurado RE-MEDE na hora de subir): ocupadas 5432, 6379, 32769, 32770; excluidas Hyper-V neste boot: 49698-49997, 50000-50059, 50160-50559, 53295-53494, 54183-54382, 54517-54616, 54893-55092, 60413-61012 (+2869, 5357). `55432` reservada por regra — nunca. Exemplo de faixa livre neste boot: 15400-15499.

**Veredito parcial T1: LIMPO**, com R1 (head do briefing defasado 1 commit docs) e R2 (mutacao viva na arvore principal, fora do terreno).

## T2 — Insumos, inelegibilidade, afirmacoes a re-verificar - MEDIDO

**1. Insumos como blob no head.** `git cat-file -e e9a9caa:<path>` -> OK para TODOS: plano `B-O6R-07-plano.md` (com `EMENDA E1` e `EMENDA E2` no corpo, grep 2 e 3 ocorrencias; blob IDENTICO entre `7c248c9` e `e9a9caa` por `git rev-parse` do blob), os 5 diarios (`dev-a1-a3-auth`, `dev-d1-d3-autorizacao`, `dev-k1-k3-kpi`, `dev-s1-s4-arranjo-sticky`, `dev-u1-u3-provisionamento`), `00-quedas.md`, `RBAC_MATRIX.md`, `controle/pendencias.md`, e o proprio `BRIEFING-O6R-07a.md` (este so em `e9a9caa`, como esperado).

**2. Diretorio de voto gravavel.** Provado por execucao: este arquivo foi criado e regravado em `votos/O6R-07a/` com ec=0.

**3. Inelegibilidade POR NOME.** `grep -rln "jurado-b07a" agent-orchestration/ --include=*.md` -> aparece APENAS no `BRIEFING-O6R-07a.md` (as 3 propostas). Zero ocorrencias em atas `J-*`, reprovacoes `R-*`, `OBITUARIO-IDENTIDADES.md` ou `.claude/agents/**` (`grep -rln b07a .claude/agents/` -> vazio). As 8 identidades reservadas ao ciclo 5 existem em `.claude/agents/especialistas/` (`ls | grep c5` -> 8) e NENHUMA colide com as cadeiras propostas. Os 7 participantes do §8 confirmados nos blobs do head (git grep por nome: planejador-mestre 2, dev-o6r07a-autorizacao 2, provisionamento 1, auth-residuais 4, auth-provas 4, arranjo-sticky 1, kpi-registros 1) - nenhum deles e cadeira.

**4. Numstat do briefing §2 re-medido.** `git diff --numstat f895dd2..7c248c9 | awk` -> **arquivos=41 adds=5822 dels=294** = EXATAMENTE o §2. As 12 linhas de codigo/migration batem LINHA A LINHA com a tabela do briefing (conferi as 12). Em `e9a9caa`: 42/6028/294 (delta = o briefing, +206). Tabela do briefing: FIEL.

**Veredito parcial T2: LIMPO.** Nenhuma ressalva propria; toda afirmacao do briefing segue insumo a re-medir pelas cadeiras (o proprio briefing declara).

## T3 — Baseline honesto, CI, plano de perda de jurado - MEDIDO

**1. CI no head atual.** `gh pr checks 369` (head do PR = `e9a9caa`): na 1a medicao, 6/7 pass + `docker` PENDING (o push do briefing re-disparou a CI); re-medido ao fim da inspecao: **7/7 pass** (backend 5m42s · backend-postgres 2m13s · frontend 1m34s · flutter 2m18s · docker 2m53s · authority-portal 16s · owner-portal 18s). A junta pode votar; o MERGE e que exige CI fechado - e ja esta.

**2. Baseline medido POR MIM em `e9a9caa`, arvore limpa (unico untracked = minha evidencia), SEM confiar nos diarios.**
- `npm run check` -> **ec=0** (`lint` e alias de `check` no package.json, conferido por leitura do script).
- Cluster descartavel PROPRIO: `insp-b07a-pg` (postgres:16, porta 15432) + `insp-b07a-redis` (redis:7, porta 15379) - portas fora das faixas excluidas medidas, fora de 5432/6379/32769/32770/55432. `npx prisma migrate deploy` -> **ec=0** ("All migrations have been successfully applied").
- `DATABASE_URL=...:15432 REDIS_URL=...:15379 CORE_SAAS_PERSISTENCE=memory LOG_LEVEL=silent npm test` -> **ec=0 · 255 arquivos · 2647 testes · pass 2645 · fail 0 · skipped 2** (duration ~213s) - IGUAL, numero a numero, a bateria declarada no §2 do briefing.
- `npm run build` -> **ec=0**. `git diff --check` -> **ec=0**.
- `npm --prefix frontend run check` -> **ec=0** e `run build` -> **ec=0**. **CORRECAO a armadilha 10 do briefing:** `b07/frontend/node_modules` EXISTE (61 entradas raiz; o `npm ci` do dev ficou) - a afirmacao "falha por ausencia de node_modules" esta DEFASADA; medi sem precisar de `npm ci`. `frontend/dist` gerado pelo build foi REMOVIDO apos a medicao.
- **O que NAO rodei e por que:** suite Flutter local - o bloco nao toca `mobile/` (`git diff --name-only f895dd2..e9a9caa | grep ^mobile/` -> vazio, grep ec=1) e o job `flutter` da CI passou no mesmo head; nao ha regressao possivel por este diff.

**3. Plano de perda de jurado (quorum = UNANIMIDADE de 3; cada cadeira tem veto - sem as 3, a junta NAO conclui).** Queda por infra -> o orquestrador instancia SUCESSOR de identidade NOVA na MESMA cadeira (ex.: sufixo `-s1`), que segue o P3 do briefing: re-executa cada comando do `-evidencia.md` do caido, compara, e so entao mede a cauda; evidencia sem comando nao e insumo; voto do caido sem `-voto.json` NAO conta; a queda e apensada ao `00-quedas.md`.
- Sucessor C1: re-executa as sondas de permissao/SoD/escopo do evidencia do caido (mutacao de catalogo em worktree proprio + cluster proprio) e fecha os 3 itens.
- Sucessor C2: re-executa lockout/rate-limit/KDF e RE-DECIDE o trade-off declarado (nao herda a decisao do caido).
- Sucessor C3: re-aplica a migracao em cluster descartavel NOVO (nunca reusa o do caido) e refaz o drill de escopo por mutacao.

**Veredito parcial T3: LIMPO** (baseline verde provado por execucao minha; CI 7/7 no head; plano de sucessao declarado acima), com R3 (armadilha 10 defasada - nenhum jurado pode usar "ambiente" como razao para nao medir frontend).

## Limpeza do inspetor

Criei e DERRUBEI: `insp-b07a-pg` e `insp-b07a-redis` (`docker rm -f` -> `docker ps -a` pos-teardown mostra so a base viva + o par `codex-o6r-c5-d29-*` do ciclo 5, que NAO e meu e fica). `frontend/dist` do build de baseline: removido (git status pos-limpeza = so esta evidencia). Logs em `/tmp` da sessao MSYS: efemeros. Nenhum worktree criado. Nao commitei nada (o orquestrador commita).
