# INSPETOR-394 — parecer incremental (inspetor-de-terreno-da-junta, B-GOV-SEM-TETO, PR #394)

papel: inspetor-de-terreno-da-junta · modelo: Fable 5.1 (claude-fable-5-1) · corpo APLICADO = head 7ad08690 blob 9c97b03c, md5 EOL-neutro de80b2a9d4fc7edd7b9a26e2d601f97d · corpo CARREGADO pelo harness (dir da sessão, demo/investidor d1fab3bc) md5 EOL-neutro 934a8b08c5c789abb50513305ee52409 (blob 8262abfb — versão ANTERIOR à base fc3363e3: sem 3.1-bis, 3.3, 4.3 e sem a nota de fallback).

## Head
- gh pr view 394 headRefOid = 7ad08690bad5e9cbc4d34fe6905b14c6ac634046 · git rev-parse (w-teto) = 7ad08690 · base origin/main = fc3363e3 (fetch feito) · fc3363e3 ancestral de 7ad08690: sim.
- Meu worktree: C:/Users/AMP/w-insp394 detached 7ad08690, status --porcelain = 0 linhas.

## 1.1 mutação viva
- w-teto: git status --porcelain = 22 linhas ` M` em .agents/agents/*.md; `git diff | wc -c` = 0; `git hash-object <f>` == blob do índice para os 22 (SAME ×22). Fantasma de stat-cache sob core.autocrlf=true, NÃO mutação. Untracked: nenhum.

## 2.2 (versão aplicada)
- Base fc3363e3: "ciclo ≥ 3 → parecer do crítico + PD ≥5 fontes". Head 7ad08690: "ciclo ≥ 4 → parecer da auditoria da máquina em R-<entrega>-ciclo3-auditoria.md". #394 é ciclo 1 → nenhuma versão dispara. Veredito não muda por 2.2.

## 1.3 resíduos
- `docker ps -a`: sem `jur-*`/`crit-*`. Inertes (Exited): `erp-postgres-alt` (127.0.0.1:55432, Exited 255, 10 dias), `pastrack-teste-banco-teste-1` (Exited 0, 3 dias). Vivos: `erp-postgres` 5432, `erp-redis` 6379 — não são alvo. Resíduo inerte → ressalva leve, reportado, não varrido.
- `find` por `jur-probe*`/`*-probe.ts` em w-insp394 e w-teto: 0.
- Worktrees alheios (reportados, não tocados): .claude/worktrees/{b04a,b11,gov-descuido,gov-elenco}, w-devs2 (dev vivo, outro PR), w-devs393, w-devt393, w-mandato (#393), w-teto (bloco). Sessão (árvore principal, demo/investidor) tem untracked alheios: results.txt, scripts/audit-agents-skills.mjs, votos/*, BRIEFING/J-B-O6R-02-ciclo5, TEMPLATE-J-ata.md e 4 ` M` em especialistas c5 — fora do objeto julgado.

## Diff do PR (fc3363e3..7ad08690): 21 arquivos, 4 commits (3e92b2b8, 43b37e4d, dd79c96f, 7ad08690)
- 6 corpos das cadeiras (3 × 2 espelhos) RASTREADOS no head (`git ls-tree -r 7ad08690 | grep semteto` = 6).
- `node scripts/sync-agent-agents.mjs --check` (w-insp394) → ec=0, "OK — 26 agentes, espelho consistente."
- Meu corpo: diff base..head = 1 hunk, l.73–76 (item 2.2 só).

## 3.3 corpo carregado × julgado (cadeiras) — md5 EOL-neutro no head
- c1: .claude 7a676a2fb44be53999d23471a4abd23c · .agents 7afdcca0ac9835a87341fcc3976c7821 · model: opus
- c2: .claude 635f79df868b907d5b8a1843f9646855 · .agents f83ef2d4880cdc127bb3257a0d741361 · model: opus
- c3: .claude 4396c0fbd8f6b0ddaf1c555cd6137c32 · .agents 33b13db557f00b9ff7719f95796daac3 · model: opus
- Dir da SESSÃO (C:/Users/AMP/Documents/GitHub/ERP_Techsolutios/.claude/agents/especialistas/): os 3 corpos AUSENTES → o harness não tem de onde carregar essas identidades por nome. (a confirmar ~/.claude/agents)

## 3.1-bis OBITUARIO (head): 0 hits para as 3 cadeiras e para 9 dos 10 inelegíveis; `guardiao-fail-closed` 1 hit (a ler). Nenhuma linha SEPULTADA/RESERVADA com 'semteto'.

## 4.3 check-runs no head (1ª medição): total 14, 14 completed/success (authority-portal, backend, backend-postgres, docker, flutter, frontend, owner-portal ×2 cada).

## 3.3 (cont.) — onde o harness carrega as cadeiras
- `~/.claude/agents`: não existe. Dir da sessão `.claude/agents/especialistas/`: 40 corpos de juntas passadas (jurado-06/07b/arnes/c4/c5/mandato/o6r04a) — NENHUM `jurado-semteto-*`. O corpo do inspetor carregado em mim veio desse dir e é ANTERIOR à base (sem 3.1-bis/3.3/4.3). → RESSALVA FORTE R1 (abaixo).

## 2. Espelho CLAUDE.md × AGENTS.md (provado, não herdado)
- `git diff -U0 fc3363e3 7ad08690` de cada contrato, sem linhas `@@`/cabeçalho: 64 linhas cada, md5 2c6753a7af0e4cb92607be24faef2905 nos DOIS → `diff` vazio (HUNKS IDENTICOS).
- Regiões no blob do head, EOL-neutro (`git show | tr -d '\r'`): §C7.1-bis (l.391–409 / 419–437, 19 l.) d0491a797e274c2884393ec88df94783 = ; item 4 (`^4. **Protocolo` até antes de `^4-bis`, 33 l.) 2c87539436294e91ba7e0ba494ace20d = ; §C7.7 intro (l.524–531 / 552–559, 8 l.) 02339382d79bc6184720084bb852a071 = .
- Disco w-insp394 EOL-neutro = blob nos dois (CLAUDE 08ab684a…, AGENTS 5573177a…).

## 3. Regras vivas do teto — geradas pela PROPRIEDADE (-i), não pelos termos
- Grep §9.5 do plano (7 padrões, -i) nos 6 arquivos alvo → 0 linhas (ec=1). `mandato-preflight|pré-voo` nos contratos → 0.
- `grep -n -i 'ciclo'` em CLAUDE.md (29 hits) e AGENTS.md (29): todos ou (a) o item 4 novo, (b) §C7.1-bis novo "do ciclo 4 em diante", (c) narrativa datada (l.361–379 auditoria 28/08; l.402–404 origem do inspetor; l.549 caso R2). Nenhuma regra viva que limite/condicione nº de ciclos.
- README Codex: l.59–65 = regra nova; 124/128 "a cada ciclo"; 17/26/136–159 adendos datados. PROTOCOLO: l.5 (sem teto), l.43 narrativa. EXECUTION_MODEL.md:268–278: tabela dos 5 ciclos "após 5 falho → parada + dossiê" = V-11 (proibido no §6, pendência). comando-template: 1 hit inócuo. skills: 6 hits inócuos.
- 26 corpos (.claude, recursivo; espelho provado igual pelo sync): restam validador-mestre:100 (V-07, "Máximo 2 ciclos… 3ª falha = PARADA"), critico-adversarial:3,6 (V-08), avaliador-mapas:17 (V-09), agente-fabrica:8 (V-10). Segunda varredura por formas SEM a palavra ciclo (`máx N`, `Nª falha`, `reprovações seguidas`, `dossiê ao dono`, `última tentativa`, `não há ciclo`) → só validador-mestre:100 (+espelho:106) = V-07. Nada fora de V-07…V-11.
- V-07…V-11 estão TODOS listados em `pendencias.md:9773` (`P-GOV-CICLOS-CORPOS-ORFAOS`, l.9777–9781, com commit e data de origem) e no índice gerado (l.208). Segunda pendência `P-GOV-AUDITORIA-MAQUINA-PECAS-ABERTAS` em 9788 / índice 209. T-21…T-25 em decisoes.md:2699–2720; mapa M-01…M-10 em 2725–2727.

## 4. Conflito com o #393 — re-medido
- `git merge-tree --write-tree --name-only 7ad08690 origin/chore/mandato-refs-e-preflight` (9d3de5dd; o plano citava 399ce357 — o #393 andou) → ec=1, **7 arquivos**: Kpis/app.js, kpis-history.json, kpis-history.md, kpis-latest.json, decisoes.md, pendencias-indice.md, pendencias.md.
- BRIEFING (só no commit 43b37e4d; NÃO atualizado após a emenda dd79c96f/7ad08690) §7 avisa "decisoes.md (+ Kpis/* após o KPI)" = 5; falta pendencias.md + pendencias-indice.md → RESSALVA R2. Mandato da C3 manda re-medir o conflito (mitiga). KPI recontado se o #393 mergear antes: briefing §7 "recontado no pré-merge" + plano §7.3 "se o #393 mergear antes, é 169" ✓.

## 3.1 / 3.1-bis inelegibilidade
- OBITUARIO (head): 0 hits para as 3 cadeiras; `SEPULTADA/RESERVADA` com 'semteto': 0. `git grep -i` de cada nome de cadeira no head: só BRIEFING/plano/decisoes/corpos — nunca em J-*/R-*/votos → identidades novas, não votaram. Nenhuma coincide com orquestrador/planejador/fábrica/dev-semteto-emenda nem com os 6 votantes do #393 nem com as 3 cadeiras designadas para a junta 3 do #393 (0 colisões; concordo que estas últimas seriam inelegíveis por interesse).
- §C7.4-bis (a)(b)(c) respondido por escrito no plano §10 ✓. "Votam JUNTAS, nunca 2+1": briefing §1 + plano §10 ✓.

## Quórum (julgado contra o diff)
- §C7.1-ter(b) no head (CLAUDE.md:374–376): unanimidade de 3 SÓ para dinheiro/segurança/permissão/perda de dado; diff em src/prisma/frontend/mobile/.github = 0. `D-QUORUM-B-GOV-ELENCO` existe (decisoes.md:1961): subida acima de (b) é decisão declarada ANTES do voto e registrada — não se herda. Aqui ninguém subiu, e a regra escrita não manda subir. A edição do gate é 1 hunk (l.73–76) nos dois espelhos, confinada ao 2.2; troca insumo órfão por trava de ciclo ≥4 (T-21, declarada como elaboração). NÃO vejo motivo escrito para unanimidade → maioria de 3 fica. Não é bloqueio.

## 1.2 / 5.1 / 2.1 / 2.3
- 1.2 isolamento por escrito: briefing §12 (w-teto somente-leitura; worktree próprio descartável em caminho curto; sem junction; sem banco; base viva nunca alvo; mutação só em cópia fora do repo) ✓.
- 5.1 perda: briefing §13 (relança a MESMA identidade; voto perdido nunca aprova; não fecha com <3 votos de mérito; sem suplente) ✓.
- 2.1: ciclo 1, sem ata anterior; briefing §8 marca as afirmações do plano "A RE-VERIFICAR" e §"Objeto julgado" manda cada cadeira resolver o head ✓. Citação crua idêntica em briefing/plano/corpo C1 (md5 3d82b984… após extração uniforme) ✓.
- 2.3: plano existe, nomeia head (3e92b2b8 — 3 commits atrás do objeto; briefing cobre), §6 permitido/proibido, §9 bateria com forma (cwd, ec por variável) ✓. Diff (21 arquivos) × PROIBIDO do §6 → 0 proibidos.

## 4.2 baseline (w-insp394, head 7ad08690, árvore limpa)
- `npm ci` próprio → ec=0 (326 pacotes; `node_modules` diretório real, sem reparse point). `DATABASE_URL` fictícia → `npx prisma generate` ec=0 (sem banco). `npm run check` (tsc --noEmit) → **ec=0**.
- Extra (plano §9.10–11, informativo para a C3): `node --check Kpis/app.js` ec=0 · `node scripts/kpi-freeze.mjs --check` ec=0 ("em dia, snapshot 2026-09-28") · JSON require ec=0 · guards `node --test --import tsx tests/kpi-dashboard-charts.test.ts tests/kpi-dashboard-contraste.test.ts tests/kpi-achados-paridade.test.ts` → 29/29 pass, 0 fail, ec=0 · `git diff --check fc3363e3 7ad08690` ec=0.

## 4.3 check-runs no head 7ad08690 — medição FINAL
- `gh api …/commits/7ad08690…/check-runs`: 14 total; não-success 0; não-completed 0. PR #394 OPEN, draft=true (condição de merge, não de voto), head inalterado 7ad08690. w-teto: HEAD 7ad08690, 0 mutações além dos 22 ` M` fantasma, `git diff` 0 bytes.

## VEREDITO: LIBERADO COM RESSALVA — 0 bloqueios, 3 ressalvas (R1 forte)
- **R1 (forte) — corpo carregado × corpo julgado (3.3):** os 3 corpos das cadeiras existem SÓ no head (6 rastreados, sync OK 26); no dir da sessão (`C:/Users/AMP/Documents/GitHub/ERP_Techsolutios/.claude/agents/especialistas/`, ramo demo/investidor) eles NÃO existem — o harness não tem de onde carregá-los por nome. Prova de que o dir da sessão está velho: o corpo do inspetor que o harness me entregou é ANTERIOR à base fc3363e3 (sem 3.1-bis/3.3/4.3; md5 934a8b08…); apliquei o do head (de80b2a9…). Antes de disparar, o orquestrador precisa fazer o corpo do head chegar às cadeiras (onde o harness carrega), byte-igual EOL-neutro: c1 7a676a2fb44be53999d23471a4abd23c · c2 635f79df868b907d5b8a1843f9646855 · c3 4396c0fbd8f6b0ddaf1c555cd6137c32. Cada voto declara o md5 (briefing §10 já exige); md5 diferente destes = voto contaminado, e a ata registra. Não bloqueia porque as cadeiras não têm veto (3.3: divergência em corpo sem veto = ressalva nomeada). O mesmo vale para o `porteiro-pos-merge` desta sessão: aplicar o corpo do head, não o carregado.
- **R2 — briefing defasado da emenda (commit 43b37e4d, não tocado em dd79c96f/7ad08690):** §7 declara conflito com o #393 em "decisoes.md (+ Kpis/*)" = 5 arquivos; medido AGORA são **7** (+ `pendencias.md`, `pendencias-indice.md`) e o head do #393 andou (399ce357 → 9d3de5dd); §1 l.42 ainda diz "não versionados e sem espelho" (hoje: 6 rastreados); T-21…T-25 e as duas pendências novas não são nomeadas no briefing (só "mais o que E2 acrescentar"). O orquestrador coloca isto em destaque no briefing; a C3 já tem mandato de re-medir o conflito e a C1 de julgar o que E2 acrescentou. KPI recontado se o #393 mergear antes: declarado (briefing §7 + plano §7.3).
- **R3 (leve) — resíduos inertes, reportados, não varridos:** Docker `erp-postgres-alt` (Exited 255, 127.0.0.1:55432) e `pastrack-teste-banco-teste-1` (Exited 0) — sem `jur-*`/`crit-*`; 22 ` M` fantasma em `.agents/agents/*` no w-teto (hash-object = índice ×22; `git diff` 0 bytes) — briefing §12 já avisa; worktrees alheios (b04a, b11, gov-descuido, gov-elenco, w-devs2 vivo, w-devs393, w-devt393, w-mandato) intocados; untracked alheios na árvore da sessão (results.txt, scripts/audit-agents-skills.mjs, votos/*, TEMPLATE-J-ata.md, BRIEFING/J-B-O6R-02-ciclo5) fora do objeto.
- **Fato para a ata (2.2):** o PR altera o meu item 2.2 (base: "ciclo ≥3 → crítico + PD ≥5"; head: "ciclo ≥4 → parecer da auditoria em R-<entrega>-ciclo3-auditoria.md, + registro do conserto"). Li e apliquei a versão do HEAD. O #394 é ciclo 1 → nenhuma das duas dispara; o veredito é o mesmo sob qualquer das duas. A norma que o 2.2 novo cita existe no head (CLAUDE.md:429–435, caminho do parecer + trava do inspetor).
- **Quórum:** maioria de 3 mantida — §C7.1-ter(b) literal não dispara; `D-QUORUM-B-GOV-ELENCO` diz que subida se declara antes e não se herda; ninguém subiu; edição do gate confinada a 1 hunk. Sem bloqueio.

## Limpeza (1 linha)
Criei e derrubei: worktree `C:/Users/AMP/w-insp394` (removido por `git worktree remove --force`, ec=0; `git worktree list` sem insp394; diretório inexistente), `/tmp/insp394/` e `/tmp/sync394.txt` (removidos). Nenhum container criado; base viva 5432/6379 não tocada; w-teto em 7ad08690 com `git diff` 0 bytes e `node_modules` do dev intacto; w-devs2 intocado (9d3de5dd). Fica só este parecer no scratchpad.
