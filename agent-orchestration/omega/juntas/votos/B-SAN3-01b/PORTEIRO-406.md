porteiro-pos-merge | Opus 5.5 (substituicao declarada: dono suspendeu Fable e Astra ate o reset semanal, decisoes de 03 e 04/10) | mandato_md5 1ca27ccb680e7afda09ef814b955c980 | corpo_md5 374b1b0d091a85cddf1733d3e51456ae

# Parecer do porteiro-pos-merge — merge do PR 406 (registro puro, B-SAN3-01b)

Instancia nova. Corpo materializado de origin/main, md5 EOL-neutro conferido contra o blob. Parecer incremental (P1); cada item com comando, saida resumida e veredito parcial. Nao commito; o orquestrador versiona.

## 0. Identidade, corpo e mandato — 2026-10-04T15:46Z

medido por: `git ls-tree origin/main .claude/agents/porteiro-pos-merge.md` -> blob 00d75b02; `git cat-file -p 00d75b02 | tr -d '\r' | md5sum`
```
corpo_local     = 374b1b0d091a85cddf1733d3e51456ae
corpo_blob_main = 374b1b0d091a85cddf1733d3e51456ae
```
medido por: `tr -d '\r' < 00-mandatos/porteiro-406.md | md5sum` e o mesmo sobre `git show bfa84f39:<mandato>`
```
mandato_local = mandato_blob(bfa84f39) = 1ca27ccb680e7afda09ef814b955c980
w-reg406 HEAD = bfa84f39a6766c92482b24d3e9b11b1c7cd31511, ramo docs/registro-porteiro-406, arvore limpa
```
Veredito parcial: corpo e mandato conferem. Modelo: Opus 5.5 por substituicao declarada do invocador (§C7.6-bis); o frontmatter segue `fable`.

## 1. O merge existe e esta integro — 2026-10-04T15:48Z

medido por: `gh pr view 406 --json state,mergeCommit,headRefOid,headRefName,mergedAt`
```
state=MERGED  merge=8ee10bd2e44d95206551b71351f23d901192cbb6  head=82fe6ba803d77f7cc02c31cddf214b396568793f
ref=docs/registro-porteiro-404  mergedAt=2026-10-04T15:41:54Z
```
medido por: `git merge-base --is-ancestor 8ee10bd2 origin/main && echo NA-MAIN`; `git rev-list --parents -n1 8ee10bd2`; `git log origin/main -3`
```
NA-MAIN ; pais de 8ee10bd2 = b404815c (squash, um pai) ; origin/main = 8ee10bd2 (topo)
```
medido por: `gh api .../commits/82fe6ba8.../check-runs` (head do PR)
```
14 check-runs, 14 success
```
medido por: `gh api .../commits/8ee10bd2.../check-runs` + `gh run list --commit 8ee10bd2` + `gh run view <id> --json headBranch`
```
run 37213980025 ci/push/main            in_progress  (frontend, backend-postgres, flutter, authority, owner = success; backend AINDA em curso as 15:48Z)
run 37214131891 ci/push/docs/registro-porteiro-406  cancelled  (o ramo de registro nasceu apontando para 8ee10bd2 e foi substituido por bfa84f39; cancelamento por concorrencia, nao e o run da main)
run 37213979999 deploy-staging/push     skipped
```
Veredito parcial: merge integro e na origin/main; head do PR com 14/14 verdes. O run de push da main em 8ee10bd2 tem o job `backend` ainda em curso — reconfiro no fim (item 8).

## 2. A promessa x o entregue — 2026-10-04T15:52Z

medido por: `gh pr view 406 --json body`; `git show --stat 8ee10bd2`; `git show 8ee10bd2 --numstat`
```
corpo: registro puro; mandato+parecer do porteiro do #404; R404-1 e R404-3 tratadas, R404-2 e R404-4 abertas;
       decisoes.md (03 e 04/10, conflito com §C7.6 registrado); status-geral (PAUSA de 03/10 e retomada); log-execucao.
diff (6 arquivos, +2086/-2):
  2/2   Kpis/kpis-history.md                       (so os 2 titulos da R404-1)
  1/0   agent-orchestration/codex/log-execucao.md
  29/0  agent-orchestration/controle/decisoes.md   (append-only)
  43/0  agent-orchestration/docs/status-geral.md   (append-only)
  65/0  votos/B-SAN3-01b/00-mandatos/porteiro-404.md
  1946/0 votos/B-SAN3-01b/PORTEIRO-404.md
```
Todo arquivo tocado esta no corpo; nenhum arquivo de codigo, teste, `Kpis/*.json` nem `Kpis/app.js|index.html` no diff. Escopo nao cresceu.

**2a. PORTEIRO-404.md versionado x origem declarada.** A origem e o caminho que o mandato do porteiro-404 nomeia
(`00-mandatos/porteiro-404.md` l.37/44/48/50/53 -> `<scratchpad da sessao>/PORTEIRO-404.md`, 303268 bytes, 03/10 13:41).
medido por: `md5sum`, `tr -cd '\r' | wc -c`, `awk '/[ \t]$/'` e um comparador python byte a byte sobre a origem e o blob de 8ee10bd2
```
origem: 1946 CRLF ; 14 CR-CR-LF ; 101 CR soltos no meio de linha (saida de progresso "Updating files: 17% ...\rUpdating files: 18% ...", l.176 e seguintes) ; 8 linhas com espaco final (8 bytes)
blob:   0 CR ; 0 espaco final ; 301213 bytes = 303268 - 2047 CR - 8 espacos
tr -d '\r' + rstrip(origem)  == blob  -> IDENTICO (md5 cb8457cb4af2d6cad51768cb86ab5816 dos dois lados)
so CRLF->LF + rstrip (CR solto preservado) == blob  -> DIFERENTE (os 101 CR soltos)
```
Veredito 2a: conforme pela regra EOL-neutra do proprio projeto (`tr -d '\r'`, §A7/§C7.1-ter(c)); nenhum caractere visivel muda.
**Nota N406-1 (nota, pre-existente na origem):** o commit diz "quebras de linha normalizadas para LF ... nenhum outro byte muda";
os 101 CR soltos dentro da saida de progresso do git foram REMOVIDOS (nao convertidos em LF), o que funde as linhas de progresso
numa so. Nao altera conteudo legivel; registro so para a descricao ficar exata ("todo CR removido", nao "CRLF->LF").

**2b. decisoes.md.** medido por: `git cat-file -p <blob decisoes de origin/main> | grep -c "**<ID> "` para os 6 IDs; leitura do hunk
```
D-FABLE-SO-DINHEIRO=1 D-NUVEM-ENCERRADA=1 D-CODEX-HABILITADO=1 D-CODEX-PADRAO-SOL=1 D-FABLE-ASTRA-SUSPENSOS=1 D-CLAUDE-OPUS-UMA-POR-VEZ=1
```
IDs unicos; hunk so acrescenta (29/0). Cada entrada separa a citacao (italico entre aspas) da transcricao, e o cabecalho declara
"a citacao e literal, o resto e transcricao". Conflito §A2 registrado na D-FABLE-ASTRA-SUSPENSOS contra o §C7.6
(`CLAUDE.md` de origin/main l.468: "o **Fable é OBRIGATÓRIO**"). D-MANDATO-FORMA-2 e o cabecalho da lista de OS registrados
como "Pendente do dono (não é decisão)" — e o que a R404-3 pedia (estado, sem decisao inventada).
Nao executavel por mim: a literalidade das citacoes contra o chat do dono (fonte fora do repositorio); conferi forma e coerencia
com o status-geral (a PAUSA de 03/10 cita as mesmas decisoes em prosa).
**Nota N406-2 (nota):** o conflito registrado nomeia so o §C7.6 (planejador); a suspensao alcanca tambem o §C7.6-bis (gates fixados
em Fable/Astra), onde a substituicao por Opus/Sol ja e o degrau previsto — sem conflito material, mas "esgotado" ≠ "suspenso pelo
dono" nao esta escrito. Sem efeito no start.

**2c. R404-1.** medido por: `git cat-file -p <blob kpis-history.md de origin/main> | grep -nE '^#+ .*na autoria'`
```
l.2982 "## 2026-10-01 — B-GOV-PAUSA (PR #397) — ..."      (sem "na autoria")
l.3020 "## 2026-10-02 — B-SAN3-01b (PR #402) — ..."        (sem "na autoria")
restam 7 titulos antigos com "na autoria" (l.2408 ... l.2946), fora da R404-1, que nomeou so :2982 e :3020
```
Veredito 2c: R404-1 feita como pedida.

Veredito parcial do item 2: promessa = entregue. Duas notas sem efeito no start.

## 3. Os numeros sao reais — 2026-10-04T15:54Z

Terreno: worktree proprio detached `C:/Users/AMP/w-port406` em origin/main 8ee10bd2; `npm ci --ignore-scripts` proprio (326 pacotes, ec=0, `node_modules` diretorio proprio, nao junction).
O PR 406 nao declara contagem nova (registro puro); o que ha a reexecutar e que nada de KPI se moveu e que os guards seguem verdes.
medido por: `git diff --stat b404815c 8ee10bd2 -- Kpis/kpis-latest.json Kpis/kpis-history.json Kpis/app.js Kpis/index.html | wc -l`
```
0  (nenhum byte de KPI nem do painel muda no merge)
```
medido por: `node scripts/kpi-freeze.mjs --check; echo $?` e `node --check Kpis/app.js`
```
kpi-freeze: em dia (snapshot 2026-10-02).  freeze_ec=0 ; app.js check ec=0
```
medido por: `node --test --import tsx tests/kpi-dashboard-charts.test.ts tests/kpi-dashboard-contraste.test.ts tests/kpi-achados-paridade.test.ts`
```
# tests 29 / pass 29 / fail 0 / cancelled 0 / skipped 0   ec=0 ; git status --porcelain no worktree = 0 linhas
```
Veredito parcial: nenhum numero declarado a reproduzir; o painel nao defasou (kpi-freeze em dia) e os 3 guards de KPI dao 29/29.

## 4. KPI fechado (§C3.5) — 2026-10-04T15:54Z

medido por: `node -e` sobre `Kpis/kpis-latest.json` e `Kpis/kpis-history.json` de 8ee10bd2
```
latest:  pr 402 | merge_commit 3e40a256ce80... | approved_head cdf370dcb4c8... | status published_per_pr
history: 166 entradas; ultimas 3 = #394 (b3f0af5f/7ad08690, blocks 168), #397 (513937b0/67c2c280, 169), #402 (3e40a256/cdf370dc, 170)
nulls historicos: 36 entradas antigas (ultima no indice 155 de 166); as 10 mais recentes sem null
```
Registro puro nao abre entrada de KPI (precedente #398, #403, #404, citado no corpo); nao ha backfill devido por este merge,
e o do #402 ja estava pago. Veredito parcial: conforme.

## 5. Registro da junta (§C7.1) — 2026-10-04T15:55Z

medido por: `bash scripts/mandato-refs.sh 406` (colado no mandato, l.6-19, e reconferido pelo pre-voo do mandato) e `grep -n 'P-GOV-REGISTRO-PURO-QUORUM' controle/pendencias.md`
```
approved_head: AUSENTE — nenhuma ata nomeia nem menciona #406
pendencias.md:6956 "## P-GOV-REGISTRO-PURO-QUORUM (2026-09-05) — MÉDIA · PR de registro puro: junta de 3 ou uma cadeira independente?" (aberta)
```
O #406 e registro puro sem junta, como os precedentes que o proprio corpo cita (#398, #403, #404). A convencao de quorum para registro
puro esta aberta como pendencia §A2 com dono (decisao do dono / junta de governanca) e nao e resolvida por este porteiro por precedente
(mesma conduta do porteiro do #404, R404-3). Veredito parcial: sem ata, coerente com a pratica registrada; a divida de quorum viaja
na P-GOV-REGISTRO-PURO-QUORUM, nao nasce aqui.

## 6. Pendencias — 2026-10-04T15:55Z

medido por: `git show --stat 8ee10bd2` (pendencias.md fora do diff); `grep -nE '^## ' pendencias.md | tail -12`; `grep -n 'R404-' pendencias.md`
```
pendencias.md nao tocado pelo #406 ; 0 ocorrencias de "R404-" em pendencias.md
R404-2 e R404-4 registradas como abertas em status-geral.md (secao RETOMADA) e no corpo do PR, com destino nomeado no PORTEIRO-404 l.1940/1942
```
Fechadas pelo bloco e conferidas no artefato (amostragem = as duas): R404-1 (item 2c, titulos l.2982/l.3020 sem "na autoria") e R404-3
(item 2b, estado "Pendente do dono (não é decisão)" em decisoes.md, sem decisao inventada). Ambas verdadeiras.
**Nota N406-3 (nota):** R404-2 (aceite dos planejadores 06a/06c para os donos de pendencias.md:9949/:9959) e R404-4 (disco) seguem
abertas so em status-geral.md e no PORTEIRO-404, sem entrada propria em pendencias.md. O PORTEIRO-404 as destinou ao orquestrador e
ao planejamento 06a/06c, nao a pendencias.md, entao nao ha descumprimento; registro para nao se perderem.
Veredito parcial: conforme.

## 7. Limpeza (§C5) — 2026-10-04T15:55Z

medido por: `git branch --list docs/registro-porteiro-404`; `git ls-remote origin refs/heads/docs/registro-porteiro-404`; `git rev-parse main origin/main`;
`git status --porcelain | grep -c '^ D'`; `git branch --merged main`; `test -d w-reg404 / w-port404`; `df -h /c`
```
ramo local do registro do #404: 0 ; ramo remoto: 0 (apagado no merge)
main local = origin/main = 8ee10bd2 (avancada)
arquivo rastreado apagado na arvore principal: 0 ; ramos locais mergeados alem de main: 0
w-reg404: ausente ; w-port404: ausente
disco C: 8.6G livres as 15:55Z (9.1G antes do meu npm ci; devolvo com a remocao do w-port406)
```
Registro puro: nao mexe em banco, sem residuo de teste a procurar na base viva (base viva nao foi alvo).
Residuo alheio reportado, nao varrido: `C:/Users/AMP/w-pvreg` (detached em 8ee10bd2, criado ~13 min antes desta medicao; pelo nome, o
arnes do pre-voo do orquestrador para este mandato) — conferir que sai quando o pre-voo acabar.
**R406-1 (ressalva operacional, continua a R404-4):** disco abaixo de ~10 GB (8.6-9.1 GB). Pelo corpo, manda rodar `DEEP_CLEAN=1`
(`docs/limpeza-de-disco.md`), respeitando a P-CHORE-CLEANUP-DESCE-EM-WORKTREES e os terrenos vivos (w-e5, w-pl11c3, dev do #405).
Veredito parcial: limpeza do registro do #404 feita como declarada; disco segue curto.

**Errata do proprio parecer (15:57Z):** as horas dos cabecalhos dos itens 2 a 7 e a hora do disco no item 7 foram
escritas adiantadas (16:00Z, 16:01Z...) sem medir `date -u`; a medicao seguinte deu 15:56:33Z. Corrigidas para a janela real
(15:52Z-15:55Z, pela ordem dos comandos: o `npm ci` comecou 15:52:56Z). Nenhum resultado muda.

## 8. O proximo bloco pode comecar? — 2026-10-04T15:57Z

medido por: `gh run view 37213980025 --json status,conclusion,jobs` (run de push da main em 8ee10bd2, que estava em curso no item 1)
```
status=completed conclusion=success ; 7/7 jobs success (flutter, owner-portal, backend-postgres, authority-portal, backend, frontend, docker)
```
medido por: `gh pr view 393|401|405 --json number,state,isDraft,headRefOid`
```
#393 OPEN draft=true head=4af61a41 ; #401 OPEN draft=true head=05510bf1 ; #405 OPEN draft=true head=e3cb269d
```
medido por: `grep -niE 'bloqueia[^.]{0,80}(junta (3|5)|#?40[15]|B-SAN3-(05|11)|ciclo (3|5))' controle/pendencias.md | grep -viE 'n[aã]o bloqueia'` e
`grep -nE 'BLOQUEIA' pendencias.md | grep -iE '393|401|405|B-GOV-MANDATO|B-SAN3-11|B-SAN3-05' | grep -viE 'fechad|resolvid|superad'`
```
0 pendencias abertas que BLOQUEIEM a junta 5 do #393, a junta 3 do #401 ou a junta do #405
(as unicas mencoes do #393 com "bloqueia" dizem "não bloqueia ... a junta 3 do #393", pendencias.md:9785/:9800/:9814)
```
Terreno do porteiro: `w-port406` removido por `git worktree remove --force` (rm_ec=0, diretorio ausente, fora do `git worktree list`)
depois de 0 processo vivo contado por CommandLine (o unico residuo era um `du` meu em segundo plano, parado antes da remocao).
Disco de volta a 9.1G. Nao toquei w-e5, w-pl11c3 nem o terreno do dev do #405; base viva nao foi alvo; nada escrito no repositorio
alem deste parecer, que o orquestrador versiona.

## Resumo do que executei

- md5 EOL-neutro do corpo (= blob de origin/main) e do mandato (= blob de bfa84f39) — conferem.
- `gh pr view 406`, `merge-base --is-ancestor`, check-runs do head (14/14) e do merge (run da main 7/7 success; o run cancelado e do ramo de registro).
- promessa x diff: 6 arquivos, todos no corpo; sem codigo, teste nem KPI.
- PORTEIRO-404 x origem declarada: identico pela regra EOL-neutra (`tr -d '\r'` + espacos finais), md5 cb8457cb...; nota N406-1 sobre 101 CR soltos.
- decisoes.md: 6 IDs unicos, append-only, citacao separada da transcricao, conflito com §C7.6 registrado; nota N406-2.
- R404-1 e R404-3 conferidas no artefato (verdadeiras).
- `kpi-freeze --check` em dia; `node --check Kpis/app.js`; 3 guards de KPI 29/29; KPI JSON/painel sem byte mudado; backfill do #402 pago.
- limpeza do registro do #404 conferida; disco < 10 GB (R406-1).
- 0 pendencia que bloqueie os tres proximos alvos.

Achados: nenhum `bloqueia`. Ressalva R406-1 (operacional: disco 8.6-9.1 GB, continua a R404-4). Notas N406-1, N406-2, N406-3 (sem
efeito no start). R404-2 segue aberta com o destino que o porteiro do #404 deu (orquestrador / planejamento 06a e 06c).

LIBERADO COM RESSALVA: junta 5 do PR 393, junta 3 do PR 401 e junta do PR 405 | R406-1 (disco abaixo de 10 GB: DEEP_CLEAN=1 em janela sem terreno vivo, respeitando a P-CHORE-CLEANUP-DESCE-EM-WORKTREES) e a R404-2 aberta seguem com o orquestrador; o proximo PR de registro pode deixar exata a descricao do N406-1
