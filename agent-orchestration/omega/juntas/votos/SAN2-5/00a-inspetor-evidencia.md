# EVIDÊNCIA INCREMENTAL — inspetor-de-terreno-da-junta · SAN2-5 (PR #367)

Instância nova, Fable por contrato. Cada item abaixo foi appendado APÓS a medição correspondente.
Head sob inspeção: `5256b49` · branch `chore/san2-5-preparar-ciclo5` · worktree `san2-r`.

## Item 1 — Árvore sem mutação viva · worktrees · linhagem

```
$ git status --porcelain            -> (vazio) · ec=0
$ git rev-parse --short HEAD        -> 5256b49
$ git branch --show-current         -> chore/san2-5-preparar-ciclo5
$ git merge-base HEAD origin/main   -> df496d2 (= origin/main = main do plano)
$ git worktree list
  raiz               d1fab3b [demo/investidor]
  agent-af6ea607…    12c3825 [feat/o6r-b02-financial-uow]   <- branch de insumo, INTACTA no head julgado
  gov-descuido       497d360 [docs/governanca-porteiro-pre-merge-sol]
  san2-r             5256b49 [chore/san2-5-preparar-ciclo5] <- este
```
VERDE: árvore limpa; head existe e é 1 commit sobre 44a30e4 (parecer do porteiro #366) sobre df496d2 (main).
A branch de insumo `feat/o6r-b02-financial-uow` segue em `12c3825` — prova §6.8 do plano (o bloco não a mutou).

## Item 2 — Os 8 corpos e a tabela E1.8 (o ponto crítico) — RE-MEDIDO POR MIM

Forma: `git hash-object <arquivo>` (aplica normalização — eol-neutro) · `wc -l` · CR por
`LC_ALL=C tr -cd '\r' | wc -c` (NUNCA `grep -c $'\r'` — devolveu 0 para arquivo com 494 CR nesta sessão).

```
critico-c5-adversarial.md                     dc173575… · 357 · CR=0
jurado-c5-arnes-catalogo-postgres.md          254cc4f6… · 400 · CR=0
jurado-c5-banco-fk-triggers.md                ab726a8c… · 409 · CR=0
jurado-c5-suplente-arnes-catalogo-postgres.md d7291590… · 410 · CR=0
jurado-c5-suplente-banco-fk-triggers.md       5d183658… · 413 · CR=0   <- o corpo reescrito às 23:29:01; tabela JÁ corrigida
jurado-c5-suplente-validador-diff-plano.md    a08aeb2f… · 400 · CR=0
jurado-c5-validador-diff-plano.md             0a1f64ce… · 367 · CR=0
suplente-critico-c5-adversarial.md            deb2543f… · 339 · CR=0
```

Três provas independentes, todas verdes:
1. **Disco × tabela E1.8 publicada** (grep da linha exata `| arquivo | hash | linhas | 0 |` no apenso): **8/8, diverge 0**.
2. **Disco × blob do commit** (`git ls-tree HEAD`): **8/8 idênticos** — o head CONGELA o conteúdo; a corrida
   descrita no ADENDO CRÍTICO do diário (fábrica reescrevendo após conferência) **não existe mais neste head**.
3. **Estabilidade medida**: digest do conjunto re-lido após 20 s == digest do ls-tree
   (`0113956e2f8d` = `0113956e2f8d`); `git status --porcelain` do diretório = 0 linhas. Nenhum escritor vivo.
VERDE.

## Item 3 — Fatia S0: `sync-agent-agents.mjs --check` · e o que ele NÃO prova

```
$ node scripts/sync-agent-agents.mjs --check   -> ec=0 (por variável)
  [agents-sync] OK — 23 agentes, espelho consistente.
$ git status --porcelain .agents/ | wc -l      -> 0   (espelho intocado)
$ sed -n '66p' scripts/sync-agent-agents.mjs
  const files = readdirSync(SRC).filter((f) => f.endsWith('.md')).sort();
$ ls .claude/agents/*.md | wc -l               -> 23
$ ls .claude/agents/especialistas/*.md | wc -l -> 8
```
VERDE para o que o S0 cobre — E REGISTRO OBRIGATÓRIO: `readdirSync` plano, sem recursão — o `--check`
é CEGO a `especialistas/`. **Este ec=0 NÃO é prova de existência, integridade ou conformidade dos 8
corpos** (23 contados, 8 invisíveis). A prova dos corpos é o Item 2 (hash a hash). Usar o ec=0 como
aval dos jurados seria o conforto falso que o próprio bloco denunciou (`P-SYNC-AGENTS-NAO-RECURSIVO`).

## Item 4 — Nenhum `5/5` operante · campo `escopo` em todos os votantes

Grep transcrito nos 8 corpos:
- `5/5`: ocorre APENAS como revogação declarada — "está **REVOGADO**" (C1 l.79-80; C2 l.75; suplentes
  l.71/82) e "**Não existe 5/5 aqui**" (validador l.33; supl. validador l.56; supl. crítico l.81).
  Zero ocorrência como regra operante. Dois corpos trazem a cláusula "se algum documento do briefing
  disser 5/5, ele está desatualizado e este parágrafo vence".
- `"escopo"` no schema de voto: **presente nos 6 votantes** (C1/C2/C3 + 3 suplentes, 1 ocorrência JSON
  cada); quórum "unanimidade de 3" escrito nos 6. Crítico + suplente do crítico: NÃO votam (0 `VOTO:`,
  fecham em `VEREDITO:`) — conformes à cadeira.
- Residual conhecido (ressalva 1 do diário, decisão registrada do dev): C1 l.307-309 mantém as 3
  linhas-modelo de VOTO originais sem `escopo`; o APENSO do corpo (l.356) declara a forma correta como
  a que vale ("nesta forma é que ela vale") e é operante. NÃO-bloqueante; vai como ressalva à junta.
VERDE.

## Item 5 — Apensos ao plano do ciclo 5: append-only provado por mecânica (blob a blob, eol-neutro)

```
$ git diff --numstat df496d2..HEAD -- .../B-O6R-02-ciclo5-plano.md   -> 442  0
$ git diff -U0 df496d2..HEAD -- <idem> | grep -c '^-[^-]'            -> 0   (zero linha removida)
$ git show df496d2:<plano> | wc -l  -> 341   ·   git show HEAD:<plano> | wc -l -> 783
$ git show df496d2:<plano> | head -n 341 | md5sum  -> 7da5b2f3da6f8e5c7f8ffb6c0c967a85
$ git show HEAD:<plano>    | head -n 341 | md5sum  -> 7da5b2f3da6f8e5c7f8ffb6c0c967a85   (IDÊNTICAS)
$ git show HEAD:<plano> | tr -cd '\r' | wc -c      -> 0   (LF puro no blob)
```
As 341 linhas originais estão hash-idênticas; +442/−0. Medição por blob (`git show`), imune ao autocrlf
da árvore. VERDE.

## Item 6 — Diff de código VAZIO · escopo por commit

```
$ git diff df496d2..HEAD -- src tests prisma .github scripts .agents frontend mobile infra \
    API_CONTRACTS.md CLAUDE.md AGENTS.md package.json package-lock.json | wc -c   -> 0 bytes
$ git diff --name-only 44a30e4..HEAD   -> 16 arquivos, TODOS na lista PERMITIDO do §5 do plano:
    8 corpos em .claude/agents/especialistas/ · Kpis/{app.js,kpis-history.json,kpis-latest.json}
    · controle/pendencias.md · votos/SAN2-5/{2 diários} · planos/{B-O6R-02-ciclo5-plano.md,SAN2-5-plano.md}
$ git diff --name-only df496d2..44a30e4 -> votos/SAN2-4b/00c-porteiro-pos-merge-366.md
    (commit do PORTEIRO do #366 — base declarada da branch, não entrega deste bloco)
$ git branch -v --list feat/o6r-b02-financial-uow -> 12c3825   (branch de insumo INTACTA — prova §6.8)
```
VERDE. Nota de mapa para a junta (mérito, não terreno): no diff estão F1 (corpos), F2 (apensos
E1/E3/E4), F4 (E5 KPI/freeze) e as emendas de pendências E2d/E3 (`P-SYNC-AGENTS-NAO-RECURSIVO` +1,
`P-O6R-B02-SUITES-LIST-CI` +2); NÃO estão E2c, E6a/E6b/E6c/E6d (grep `SAN2-6` no diff de pendencias.md
= 0) nem E7 — os próprios diários nomeiam o não-entregue. A junta julga diff × §3.9/§5 sem presumir
entrega integral.

## Item 7 — Insumos do briefing presentes

- Plano `SAN2-5-plano.md`: lido inteiro (518 linhas; §8 define a junta: MAIORIA de 3, sem crítico).
- Diários: `dev-b1-b2-junta-corpos.md` (769 l., inclui conferência independente do sucessor + ADENDO
  CRÍTICO da reescrita às 23:29:01) · `dev-b3-b4-dividas.md` (408 l.). Lidos.
- Parecer do porteiro do #366: `votos/SAN2-4b/00c-porteiro-pos-merge-366.md` — existe, veredito
  `LIBERADO COM RESSALVA` (l.153), ressalva C.10 transcrita (worktree próprio para cadeira que muta).
- Afirmações herdadas: o plano declara "nada herdado" e re-mediu (§2); os diários re-mediram de novo;
  eu re-medi por cima (Itens 2–5). Nenhuma premissa de ata anterior entra como fato no briefing.
VERDE.

## Item 8 — Inelegibilidade POR NOME (fail-closed; ausência no obituário NÃO absolve)

```
$ grep -rln "governanca-de-juntas|painel-e-registro-kpi|validador-diff-escopo" omega/juntas/ controle/
  -> 0 arquivos para cada um dos 3 nomes (nem atas, nem votos, nem obituário)
```
As 3 cadeiras da junta do SAN2-5 são identidades novas: nunca votaram, nunca acharam, não planejaram,
não desenvolveram este bloco (planejador = `planejador-mestre` do SAN2-5; devs = `dev-san2-5` e
sucessor — nomes distintos das cadeiras). Cobertura do obituário é PARCIAL por construção (parte 3,
derivada das atas, segue aberta) — por isso a conferência foi feita NAS ATAS, não só no obituário.
Bônus (terreno do ciclo 5, re-conferido de graça): os 6 corpos novos `jurado-c5-*`/`suplente-*` = 0
ocorrências em atas/obituário; os 2 RESERVADOS constam do obituário l.92-93 como **RESERVADA (nunca
votou)** — reserva, não sepultamento. VERDE.

## Item 9 — Baseline honesto, medido AGORA

```
$ npm run check            -> ec=0 (tsc --noEmit; exit por variável, saída em arquivo do scratchpad)
$ node --check Kpis/app.js -> ec=0
KPI (lido dos JSON, não do texto): history = 150 entradas; entrada SAN2-4b backfilled com
pr=366 / merge_commit=df496d2 / approved_head=2d2d16d (o head julgado da ata, não o headRefOid);
latest metrics.blocks_completed = 156 com a nota-condição "157 SÓ QUANDO O SAN2-5 MERGEAR";
entrada SAN2-5 nova com pr/merge_commit/approved_head = null (autoria, §C3.5).
```
Bate com o exigido: 156 · 366/df496d2/2d2d16d · 150 entradas. VERDE.

## Item 10 — Plano de perda de jurado (P5/P6) e worktree da cadeira que muta

Declarado no §8 do plano: suplente nomeado POR CADEIRA antes do início (D-JUNTA-RESILIENTE); C2
(única cadeira com mandato de mutação — provas por mutação nos guards do painel) trabalha em worktree
próprio, sem junction de node_modules. PORÉM: os 3 suplentes ainda NÃO estão nomeados em arquivo
nenhum (`grep suplente` nos diários = 0; não existe J-SAN2-5.md ainda) e nenhum worktree para C2 foi
provisionado. O plano declara; o briefing tem de EXECUTAR — vai como RESSALVA R1/R2 do parecer,
condição de disparo, não de voto.

## Item 11 — CI do PR #367 (medido às ~00h de 2026-09-01)

```
$ gh pr view 367 -> OPEN · MERGEABLE · headRefOid 5256b491607154d61d2190d4029e13334daa1281 (= head inspecionado)
  checks: backend ✓ · backend-postgres ✓ · frontend ✓ · owner-portal ✓ · authority-portal ✓ · flutter ✓
          docker IN_PROGRESS
```
6/7 verdes no head exato que inspecionei; `docker` ainda rodando. A junta pode votar; MERGE só com 7/7
(ressalva R5). VERDE COM NOTA.

## Item 12 — Resíduos de rodadas anteriores

```
$ docker ps -a -> APENAS erp-postgres / erp-redis (Up 3 days, healthy) — a base viva, listada e não tocada
$ cmd /c dir /AL (raiz do worktree) -> nenhuma junction/symlink
$ git status --porcelain -> apenas os meus 2 arquivos de registro (untracked, no caminho permitido)
```
Nenhum container `jur-*`/`crit-*`, nenhuma sonda `*-probe*`, nenhum worktree órfão além dos 4
conhecidos (Item 1). VERDE.
