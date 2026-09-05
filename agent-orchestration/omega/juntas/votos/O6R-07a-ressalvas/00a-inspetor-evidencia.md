# 00a — inspetor-de-terreno-da-junta · PR #373 (B-O6R-07a, ressalvas R1+R2 do porteiro do #369) · evidência

> Identidade: `inspetor-de-terreno-da-junta` (Fable). Não vota, não conserta, não julga mérito.
> Worktree: `.claude/worktrees/r07a`. Escrito **ao medir** (P1); esqueleto criado antes da 1ª medição. 2026-09-05.
> Todo `ec` abaixo saiu por variável (`cmd > arq 2>&1; ec=$?`), nunca por pipe.

## T1 — Árvore, concorrência e resíduos — MEDIDO

**1.1 Head, branch, remoto, árvore.**
- `git rev-parse HEAD` → `039c2dc11fa3be199c05666db28602d4c5524125` · `git branch --show-current` → `chore/o6r07a-ressalvas` · após `git fetch origin`, `origin/chore/o6r07a-ressalvas` → **mesmo hash** (local == remoto) · `gh api pulls/373` → `head=039c2dc base=cae6086 mergeable=true mergeable_state=behind`.
- `git status --porcelain --untracked-files=all` → **só** `?? …/00a-inspetor-evidencia.md` (meu esqueleto). **Árvore limpa.**
- `git log --oneline origin/main..HEAD`: `a425f54` (00c porteiro, 184/0) · `dfc0507` (registro: 5/5 · 30/0 · 32/32) · `039c2dc` (briefing, 59/0). `merge-base HEAD origin/main` = `cae6086`.
- Byte-identidade blob×worktree (`git cat-file -p HEAD:<p> | cmp - <p>`): `kpis-history.json` **IDÊNTICO** · `achados.jsonl` **IDÊNTICO** · `pendencias.md` difere bruto — blob 552 798 B / **0 CR** / 6 527 linhas; worktree 559 325 B / **6 527 CR** — e **IDÊNTICO após remover os CR** (`tr -d` do CR e `cmp`). Causa: `core.autocrlf=true` (`git ls-files --eol` → `i/lf w/crlf`). **Mutação viva = ZERO.** Blobs de `cae6086` e `origin/main` também **0 CR** — o blob é LF puro, não "misto".

**1.2 Concorrência — a `main` MOVEU desde o briefing.**
- `origin/main` = **`1a7ad4d`** (briefing: `cae6086`). `git log cae6086..origin/main`: `066b47e` **#374 MERGED 12:36:25Z** · `1a7ad4d` **#375 MERGED 19:31:41Z** (ambos da outra sessão; o briefing diz "#374 aberto").
- `gh pr diff 374 --name-only`: `Kpis/app.js` · `Kpis/kpis-latest.json` · `pendencias-indice.md` · `pendencias.md`. `gh pr diff 375 --name-only`: `pendencias-indice.md` · `pendencias.md`. `git diff --numstat cae6086 origin/main`: `app.js` 1/1 · `kpis-latest.json` 39/15 · `pendencias-indice.md` 103/92 · `pendencias.md` **104/3**. **Interseção com este PR: `pendencias.md`.**
- Colisão medida sem tocar a árvore: `git merge-tree --write-tree origin/main HEAD` → **ec=0**, tree `0b711e4c` (**sem conflito**). `git diff --numstat origin/main 0b711e4c` = **exatamente** o numstat da branch (5 arquivos); `git diff --numstat HEAD 0b711e4c` = **exatamente** o que a main trouxe (4 arquivos). O merge preserva os dois lados inteiros.
- **O CI já testou esse merge:** log do job `backend` do run `33987381166` → `HEAD is now at daff652 Merge 039c2dc… into 1a7ad4d…` (pais = main atual + head).
- **Guards na árvore mesclada** (worktree descartável meu `wt-r07a-inspetor-merged`, detached num commit **sem ref** `e7d37fb` → tree `0b711e4`): `node --check Kpis/app.js` ec=0 · `kpi-freeze --check` ec=0 · `kpi-achados-paridade` **6/6** ec=0 · `kpi-dashboard-charts` **16/16** ec=0 · `git diff --check origin/main HEAD` ec=0. Os 2 testes de backend que leem `pendencias.md` (`financial-ledger-helper`, `impound-checklist-link`): 16/17, `fail 1` = `ERR_MODULE_NOT_FOUND: Cannot find package dotenv imported from …/src/config/env.ts` — **ambiental** (worktree no scratchpad, fora do repo, sem `node_modules`); **controle** no `r07a` (mesmo par, mesmo loader) → **32/32 ec=0**; CI `backend` verde no mesmo merge. Não é conteúdo.

**1.3 Worktrees, docker, junction, resíduos.**
- `git worktree list --porcelain`: raiz `d1fab3b [demo/investidor]` · `gov-descuido 497d360 [docs/governanca-porteiro-pre-merge-sol]` (26/08, sem `node_modules`, **alheio**) · `o6r-b02-cond5` (**alheio e ATIVO**: `1a7ad4d [chore/o6r-b02-c5-pendencia-suites]` numa chamada, `b19211f [chore/o6r-b02-c5-status-em-prosa]` minutos depois) · `r07a 039c2dc` (este). Nenhum `jur-*`.
- Disco `.claude/worktrees/`: + **`san2-r`** — diretório **vazio** (0 entradas), sem `.git`, **não registrado**. Órfão alheio, inerte.
- `docker ps -a`: só `erp-postgres` (5432) e `erp-redis` (6379), Up 7 days. **Zero** `jur-*`/`crit-*`/`porteiro-*`.
- Junction/symlink: `cmd /c dir /AL` nas 5 raízes (principal, gov-descuido, o6r-b02-cond5, r07a, san2-r) → "Arquivo não encontrado" em todas (**zero reparse point**); `dir /AL …\node_modules` (principal, r07a) → 0. `node_modules` existe **só** na árvore principal; `r07a`/`gov-descuido`/`o6r-b02-cond5`: AUSENTE. (O `r07a` resolve pacotes da principal por **subida de diretório** do Node, sem link — por isso os guards rodam sem `npm ci` local; a versão dos pacotes é a da instalação da `demo/investidor`.)
- `find` `jur-probe*`/`*-probe.ts`/`crit-probe*` no `r07a` → **0**. `.env` no `r07a`: só `.env.example` (nenhum `.env` real → nada aponta para 5432).
- Árvore principal (`demo/investidor`): 5 ` M` + 6 `??` em `.claude/agents/**` (B-O6R-02 ciclo 5) + `.claude/worktrees/` — **alheio, não tocado** (3 dos ` M` são o fantasma stat-cache já provado 2×).
- **Scratchpad NÃO é exclusivo desta sessão**: centenas de arquivos de sessões anteriores, incluindo `o6r07a-c3-idx/` (04/09 08:48, sem `.git`, contém `agent-orchestration/` + `indice-COMMITADO.md`) e `o6r07a-c3-pend-added.txt` — resíduo **inerte** da cadeira C3 do ciclo 2 (PR #369) deste bloco. **Reportado, não tocado.**

**Veredito parcial T1: VERDE com ressalva** (premissa "#374 aberto / base cae6086" defasada; resíduos alheios inertes; concorrência ativa no `o6r-b02-cond5`).

## T2 — Insumos e inelegibilidade — MEDIDO

**2.1 Insumos como blob no HEAD** (`git cat-file -e HEAD:<p>` + id do blob): `BRIEFING-O6R-07a-ressalvas.md` `16e5658` · `votos/O6R-07a/00c-porteiro-pos-merge-369.md` `b911ee8` · `votos/O6R-07a/11-c2-autorizacao-evidencia.md` `d763d27` · `J-O6R-07a-ciclo1.md` `a42ce4a` · `J-O6R-07a-ciclo2.md` `cf6e445`. **5/5 OK.**
- Ata ciclo 1 l.17: "RESULTADO: REPROVADO 2×1"; ata ciclo 2 l.4 head `9989c62` (medido por cadeira), l.17 "APROVADO 3×0" — **insumo para C2 re-medir**, não fato meu.
- Briefing l.7: "insumo, não veredito. Re-meça tudo"; cada item de §3 manda medir (`git log` / re-execute / "confira na ata" / "meça a trilha"). Afirmações da ata anterior **não** são herdadas como fato. OK.
- Ciclo desta junta = **1** (PR novo) → parecer do crítico e PD não são exigidos (§C7.4).
- Plano do ciclo: `ls codex/comandos | grep -iE "07a|ressalv"` → **nada**; o briefing faz as vezes de plano (head: medir; arquivos: §2; bateria: C3.3, **sem N/forma declarada**).

**2.2 Inelegibilidade por nome.** `grep -rn -E "jurado-r07a-decima-via|jurado-r07a-backfill|jurado-r07a-escopo-guards"` em `agent-orchestration docs .claude .agents Kpis` (md/json/jsonl), excluído o briefing → **0 ocorrências** (ec=1). `grep r07a` em `OBITUARIO-IDENTIDADES.md` → 0; em `J-*.md` e `reprovacoes/R-*.md` → 0. Participantes do B-O6R-07a, por nome: ciclo 1 `jurado-b07a-autorizacao-e-alcada` / `jurado-b07a-auth-e-kdf` / `jurado-b07a-migracao-escopo-registro`; ciclo 2 `jurado-b07a-c2-autorizacao-s` / `jurado-b07a-c2-auth-multiorg-s` / `jurado-b07a-migracao-escopo-registro` (mantida); dev `dev-o6r07a-ciclo2` (+ diários `dev-*` do ciclo 1); `planejador-mestre`; `porteiro-pos-merge` (00c); inspetores 00a/00b. **Nenhum coincide** com `jurado-r07a-*`. Achador das ressalvas = porteiro do #369 (não é cadeira); planejador/dev deste PR = orquestrador (não é cadeira). **Sem colisão.**

**2.3 Numstat do §2.** `git show --numstat --format= dfc0507` → `5/5 Kpis/kpis-history.json` · `30/0 pendencias.md` · `32/32 achados.jsonl` — **BATE**. Mas o PR inteiro (`gh pr diff 373 --name-only` = `git diff --numstat cae6086 HEAD`) tem **5 arquivos**: + `BRIEFING-O6R-07a-ressalvas.md` 59/0 + `votos/O6R-07a/00c-porteiro-pos-merge-369.md` 184/0. **§2 do briefing está incompleto** (achado do orquestrador; os 2 extras são docs de governança, inertes).

**2.4 Competência × achados.** C1 (décima via: execução em arnês + paridade pendência/achado) · C2 (backfill §C3.5) · C3 (escopo, guards, índice). Cobre. Como a décima via foi medida: `11-c2` l.171-172/236/308/565 — "arnês HTTP em memória, nenhum cluster subido, nenhuma porta aberta"; porteiro G1.8 idem (o cluster `57432` dele serviu só ao `npm test`). → **C1 não precisa de banco**; precisa de worktree próprio com `npm ci` + `prisma generate`.

**Veredito parcial T2: VERDE com ressalva** (§2 incompleto; sem plano formal/bateria sem forma).

## T3 — Baseline e plano de perda — MEDIDO

- **CI:** `gh pr checks 373` — 1ª leitura: 3 `pass` + 3 `pending` (run `33987381166` `in_progress`, criado 19:31:49Z = push do `039c2dc`, commit 19:31:38Z; o "7/7" do briefing referia-se ao run `33941744183` de `dfc0507`). Leitura final 19:40Z: `authority-portal` · `backend` (5m12s) · `backend-postgres` · `docker` · `flutter` · `frontend` · `owner-portal` = **7/7 pass, ec=0** — sobre o merge `daff652` (head + main atual).
- **Baseline meu no `r07a` @ `039c2dc`** (loader `tsx` da árvore principal, só leitura): `node --check Kpis/app.js` **ec=0** · `node scripts/kpi-freeze.mjs --check` **ec=0** ("em dia, snapshot 2026-09-05") · `kpi-achados-paridade` **6/6 ec=0** · `kpi-dashboard-charts` **16/16 ec=0** · `git diff --check cae6086 HEAD` **ec=0** · **S0** `node scripts/sync-agent-agents.mjs --check` **ec=0** ("34 agentes, espelho consistente").
- **Banco / suíte plena:** concordo que **não** são necessários — numstat prova zero `src/`/`tests/`/`prisma/`; a suíte plena rodou no CI sobre o merge com a main atual (`backend` 5m12s pass); os 2 testes de backend que leem `pendencias.md` passaram 32/32 no `r07a`; os guards que leem `kpis-history`/`achados.jsonl` passaram. Discordaria só se algum outro teste lesse esses 3 arquivos — `grep -l pendencias tests/*.ts` achou exatamente os 2 já rodados.
- **Plano de perda de jurado:** **AUSENTE** no briefing (§5 só manda "gravar ao medir"). Linhas P3 no parecer (R3).

**Veredito parcial T3: VERDE com ressalva forte** (plano de perda ausente).

## Limpeza (o que criei e o que confirmei derrubado)

- Worktree `wt-r07a-inspetor-merged` (scratchpad, detached em commit **sem ref** `e7d37fb`): `git worktree remove` **desregistrou** mas falhou em apagar o diretório ("Filename too long", ec=255); `cmd rmdir` falhou (sintaxe/long path); **`rm -rf` ec=0** → verificado **NÃO existe**; `.git/worktrees/` = `gov-descuido`/`o6r-b02-cond5`/`r07a`; `git worktree list` = 4 (nenhum meu). O objeto `e7d37fb` fica **dangling** (sem ref; não rodei `gc`).
- 9 arquivos de saída no scratchpad (`mt/s0/t1/t2/m1/m2/m3/c3/wt.txt`) removidos. **Ressalva honesta:** foram escritos com `>` e nomes curtos sem prefixo; se algum pré-existia de outra sessão, foi sobrescrito antes de removido — não verifiquei antes; devia ter prefixado `r07a-`.
- Docker: **nada criado**. Base viva: **não tocada nem lida**. `r07a`: só os meus 2 untracked (`00a-inspetor-evidencia.md`, `00a-inspetor-parecer.md`). Resíduos alheios (`gov-descuido`, `san2-r`, `o6r07a-c3-*` no scratchpad, agentes do B-O6R-02 na árvore principal): **reportados, não tocados**.
- Nota de método: as duas gravações inteiras por heredoc falharam (comando truncado acima de ~5 KB: "unexpected EOF while looking for matching quote"); os arquivos foram gravados em fatias ≤ 2,5 KB, com o fim da fatia anterior conferido antes de cada apenso.
