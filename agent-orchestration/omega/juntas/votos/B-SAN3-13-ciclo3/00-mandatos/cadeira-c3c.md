# Mandato — Cadeira C3 refeita (C3c) — B-SAN3-13 ciclo 3 (junta de DADO)

## MEDIDO

Estado do PR 460 no instante da redação do ciclo 3, pela ferramenta `mandato-refs.sh` copiada sem mudança para a pasta própria do redator `C:/Users/AMP/erp-pausa-2026-10-03/redator-san313c3/`, com o cwd no worktree do objeto (o head do PR, a merge-base, os check-runs e os não verdes), medido por: `cd C:/Users/AMP/w-san313 && bash C:/Users/AMP/erp-pausa-2026-10-03/redator-san313c3/mandato-refs.sh 460`
```
# refs do PR #460 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato
# gerado em: 2026-10-25T22:19Z · repo: thiagodorgo/ERP_Techsolutios

ramo:            fix/mobile-minhas-os
base:            origin/main
estado:          OPEN | rascunho=false | MERGEABLE
head do PR:      f382422514fb2bd0f8363a191a46035c4cf7e865
merge-base:      b08c755719a6cb0ed192fa04e549ac5fc67a3e67
merge commit:    <ainda nao mergeado>
check-runs:      total=14 nao-verdes=0 pendentes=0
approved_head:   AUSENTE — nenhuma ata nomeia nem menciona #460
                 (a junta nao votou, ou a ata nao esta em origin/main nem no head do PR)

```

O ramo remoto aponta para o mesmo SHA que o PR declara como head (segunda fonte do objeto), medido por: `git -C C:/Users/AMP/w-san313 ls-remote origin refs/heads/fix/mobile-minhas-os`
```
f382422514fb2bd0f8363a191a46035c4cf7e865	refs/heads/fix/mobile-minhas-os
```

Os check-runs do head do PR estão todos concluídos e `SUCCESS` (o total, os fora de `COMPLETED`/`SUCCESS` e os nomes com a conclusão, pelo `statusCheckRollup`), e os runs do workflow `ci` no objeto do ciclo 3, um por gatilho (`pull_request` e `push`); os ids de run não são citados aqui (corrida numérica longa é cobrada como SHA pelo pré-voo) e se obtêm por `gh run list --commit`, medido por: `cd C:/Users/AMP/w-san313 && gh pr view 460 --json headRefOid,statusCheckRollup --jq '.headRefOid, (.statusCheckRollup|length), ([.statusCheckRollup[] | select(.status != "COMPLETED" or .conclusion != "SUCCESS")] | length), ([.statusCheckRollup[] | .name + ":" + .conclusion] | sort | join(", "))'; gh run list --commit f382422514fb2bd0f8363a191a46035c4cf7e865 --json workflowName,event,status,conclusion,headSha --jq '.[] | .workflowName + " " + .event + " " + .status + " " + .conclusion + " " + .headSha'`
```
f382422514fb2bd0f8363a191a46035c4cf7e865
14
0
authority-portal:SUCCESS, authority-portal:SUCCESS, backend-postgres:SUCCESS, backend-postgres:SUCCESS, backend:SUCCESS, backend:SUCCESS, docker:SUCCESS, docker:SUCCESS, flutter:SUCCESS, flutter:SUCCESS, frontend:SUCCESS, frontend:SUCCESS, owner-portal:SUCCESS, owner-portal:SUCCESS
ci pull_request completed success f382422514fb2bd0f8363a191a46035c4cf7e865
ci push completed success f382422514fb2bd0f8363a191a46035c4cf7e865
```

O worktree `C:/Users/AMP/w-san313` está no objeto do ciclo 3 e sem modificação rastreada (0 linhas no status sem não rastreados); os não rastreados são os diretórios de votos do ciclo 1, do ciclo 2 e deste ciclo (os registros das reprovações dos ciclos 1 e 2 passaram a ser rastreados no conserto); por isso as leituras de arquivo deste mandato, feitas no disco desse worktree com caminho absoluto e com o CR retirado, leem o conteúdo do objeto (o `sed` do comando põe o prefixo do worktree no caminho que o `git status` imprime), medido por: `git -C C:/Users/AMP/w-san313 rev-parse HEAD; git -C C:/Users/AMP/w-san313 status --porcelain --untracked-files=no | wc -l; git -C C:/Users/AMP/w-san313 status --short | sed -E 's#^(..) (.*)#\1 C:/Users/AMP/w-san313/\2#'`
```
f382422514fb2bd0f8363a191a46035c4cf7e865
0
?? C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13-ciclo2/
?? C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13-ciclo3/
?? C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13/
```

O objeto do ciclo 2 é `<objeto>~4`: é ancestral do objeto, e o SHA dele aparece no registro da reprovação do ciclo 2 e no voto da C3 do ciclo 2 (a contagem de linhas que o citam, sem publicá-lo); dele ao objeto há 4 commits de primeiro pai e nenhum merge (o assunto de cada um abaixo, do mais novo ao mais velho); o delta do conserto é a lista de caminhos abaixo, e nenhum caminho de código, teste, KPI, `PLANO_SAN3.md`, `pendencias.md` ou `decisoes.md` (as duas últimas linhas contam o CA-c3-4 do plano na forma de pathspec: desde o objeto do ciclo 2, tem de dar 0; desde o head-base, o controle de que o filtro pega código); o `sed` põe o prefixo do worktree no caminho impresso, medido por: `cd C:/Users/AMP/w-san313 && git merge-base --is-ancestor f382422514fb2bd0f8363a191a46035c4cf7e865~4 f382422514fb2bd0f8363a191a46035c4cf7e865 && echo 'objeto do ciclo 2 ancestral do objeto'; S2=$(git rev-parse f382422514fb2bd0f8363a191a46035c4cf7e865~4); echo "R-ciclo2 cita: $(grep -c -i "$S2" C:/Users/AMP/w-san313/agent-orchestration/omega/reprovacoes/R-B-SAN3-13-ciclo2.md) · c3-voto do ciclo 2 cita: $(grep -c -i "$S2" C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13-ciclo2/c3-voto.json)"; git rev-list --first-parent --count f382422514fb2bd0f8363a191a46035c4cf7e865~4..f382422514fb2bd0f8363a191a46035c4cf7e865; git rev-list --merges --count f382422514fb2bd0f8363a191a46035c4cf7e865~4..f382422514fb2bd0f8363a191a46035c4cf7e865; git log --first-parent --format=%s f382422514fb2bd0f8363a191a46035c4cf7e865~4..f382422514fb2bd0f8363a191a46035c4cf7e865; git diff --name-only f382422514fb2bd0f8363a191a46035c4cf7e865~4 f382422514fb2bd0f8363a191a46035c4cf7e865 | sed -e 's#^#C:/Users/AMP/w-san313/#'; for b in f382422514fb2bd0f8363a191a46035c4cf7e865~4 f382422514fb2bd0f8363a191a46035c4cf7e865~23; do echo "CA-c3-4 (código, teste, Kpis, PLANO_SAN3, pendencias, decisoes) desde $( [ "$b" = f382422514fb2bd0f8363a191a46035c4cf7e865~4 ] && echo 'objeto~4' || echo 'objeto~23, controle'): $(git diff --name-only "$b" f382422514fb2bd0f8363a191a46035c4cf7e865 -- src tests prisma frontend mobile scripts .github Kpis C:/Users/AMP/w-san313/docs/revisoes/SAN3/PLANO_SAN3.md C:/Users/AMP/w-san313/agent-orchestration/controle/pendencias.md C:/Users/AMP/w-san313/agent-orchestration/controle/decisoes.md | wc -l)"; done`
```
objeto do ciclo 2 ancestral do objeto
R-ciclo2 cita: 1 · c3-voto do ciclo 2 cita: 1
4
0
docs(registro): ciclo 3 do B-SAN3-13 — relatório do dev (CA-c3-1..4)
docs(contracts): GET /work-orders — motivos invalid_scope/invalid_open_only e do 503 no contrato (B-SAN3-13, ciclo 3)
docs(registro): R-B-SAN3-13-ciclo1 e ciclo2 — registros das reprovações da junta (B-SAN3-13)
docs(plano): ciclo 3 do B-SAN3-13 — plano de resolução da reprovação da junta de dado (C3-01)
C:/Users/AMP/w-san313/agent-orchestration/omega/reprovacoes/R-B-SAN3-13-ciclo1.md
C:/Users/AMP/w-san313/agent-orchestration/omega/reprovacoes/R-B-SAN3-13-ciclo2.md
C:/Users/AMP/w-san313/docs/claude-code-handoff/API_CONTRACTS.md
C:/Users/AMP/w-san313/docs/revisoes/SAN3/B-SAN3-13-dev.md
C:/Users/AMP/w-san313/docs/revisoes/SAN3/B-SAN3-13-plano.md
CA-c3-4 (código, teste, Kpis, PLANO_SAN3, pendencias, decisoes) desde objeto~4: 0
CA-c3-4 (código, teste, Kpis, PLANO_SAN3, pendencias, decisoes) desde objeto~23, controle: 45
```

O head-base do vermelho-controle do bloco é `<objeto>~23` (o ponto em que o ramo saiu da `main`: o merge do B-TRC-02, PR 454), ancestral da merge-base; a merge-base do objeto com a `origin/main` deste worktree é a do `mandato-refs.sh`; o ramo tem 23 commits de primeiro pai desde o head-base e um único merge, `<objeto>~13`, cujo segundo pai é a merge-base (o assunto de cada um abaixo); SHA que não sai do `mandato-refs.sh 460` não se publica, e por isso o head-base é citado como `<objeto>~23` e o objeto do ciclo 2 como `<objeto>~4` (no ciclo 2 eles eram `~19` e o próprio objeto; o merge era `~9`), medido por: `cd C:/Users/AMP/w-san313 && git log -1 --format=%s f382422514fb2bd0f8363a191a46035c4cf7e865~23; git merge-base --is-ancestor f382422514fb2bd0f8363a191a46035c4cf7e865~23 b08c755719a6cb0ed192fa04e549ac5fc67a3e67 && echo 'head-base ancestral da merge-base'; git merge-base f382422514fb2bd0f8363a191a46035c4cf7e865 origin/main; git rev-list --first-parent --count f382422514fb2bd0f8363a191a46035c4cf7e865~23..f382422514fb2bd0f8363a191a46035c4cf7e865; git rev-list --first-parent --merges --count f382422514fb2bd0f8363a191a46035c4cf7e865~23..f382422514fb2bd0f8363a191a46035c4cf7e865; git log -1 --format=%s f382422514fb2bd0f8363a191a46035c4cf7e865~13; test "$(git rev-parse f382422514fb2bd0f8363a191a46035c4cf7e865~13^2)" = b08c755719a6cb0ed192fa04e549ac5fc67a3e67 && echo 'segundo pai do merge = merge-base'`
```
feat(traccar): eventos da viatura e telemetria veicular pelo event.forward, com migração transacional e RLS forçado (B-TRC-02) (#454)
head-base ancestral da merge-base
b08c755719a6cb0ed192fa04e549ac5fc67a3e67
23
1
chore(merge): origin/main (#458) no ramo do B-SAN3-13 — registros apensados nas duas ordens, índice regenerado
segundo pai do merge = merge-base
```

O corpo desta cadeira existe no objeto e, descontados o frontmatter e o bloco de adaptação Codex do espelho, é IDÊNTICO entre os dois espelhos (comparação EOL-neutra; o arquivo inteiro difere por construção do espelho, e por isso não se publica hash); o número de linhas de cada espelho está na saída; o ciclo 3 não mexeu em corpo nenhum (a penúltima linha conta os caminhos de agentes no delta do conserto), logo o corpo é o do ciclo 1 e a sua descrição ainda diz "ciclo 1", medido por: `cd C:/Users/AMP/w-san313 && diff <(tr -d '\r' < C:/Users/AMP/w-san313/.claude/agents/especialistas/jurado-san313-c3-regressao-escopo-registro.md | awk 'f; $0=="---"{n++; if(n==2) f=1}' | sed '/^$/d') <(tr -d '\r' < C:/Users/AMP/w-san313/.agents/agents/especialistas/jurado-san313-c3-regressao-escopo-registro.md | awk 'f; $0=="---"{n++; if(n==2) f=1}' | awk 'index($0,"Papel para o Codex"){s=1} s&&$0==""{s=0; next} !s' | sed '/^$/d') >/dev/null && echo 'IDENTICO corpo c3-regressao-escopo-registro' || echo 'DIVERGE corpo c3-regressao-escopo-registro'; wc -l < C:/Users/AMP/w-san313/.claude/agents/especialistas/jurado-san313-c3-regressao-escopo-registro.md; wc -l < C:/Users/AMP/w-san313/.agents/agents/especialistas/jurado-san313-c3-regressao-escopo-registro.md; echo "caminhos de agentes no delta do ciclo 3: $(git diff --name-only f382422514fb2bd0f8363a191a46035c4cf7e865~4 f382422514fb2bd0f8363a191a46035c4cf7e865 -- .claude .agents | wc -l)"; tr -d '\r' < C:/Users/AMP/w-san313/.claude/agents/especialistas/jurado-san313-c3-regressao-escopo-registro.md | grep -i -o -m1 -E 'ciclo 1'`
```
IDENTICO corpo c3-regressao-escopo-registro
332
338
caminhos de agentes no delta do ciclo 3: 0
ciclo 1
```

As duas ferramentas do pré-voo na pasta do redator do ciclo 3 são as do ramo `origin/chore/mandato-refs-e-preflight` com uma única diferença, a linha do `RAIZ` do `mandato-preflight.sh`, fixada em `C:/Users/AMP/w-trc02` (a adaptação do B-TRC-02), e são byte a byte as da pasta do redator do ciclo 2; esse `RAIZ` não existe mais no disco, logo a checagem 6 do pré-voo não acharia caminho relativo nenhum, e por isso este mandato cita todo caminho do repositório ABSOLUTO no worktree do objeto (a checagem 6 não confere caminho absoluto, fronteira declarada no cabeçalho do pré-voo; a existência de cada um sai das leituras medidas neste mandato), medido por: `cd C:/Users/AMP/Documents/GitHub/ERP_Techsolutios && for b in mandato-refs.sh mandato-preflight.sh; do bl=$(git ls-tree -r origin/chore/mandato-refs-e-preflight -- scripts | awk -v b="$b" '$4 ~ ("/" b "$") {print $3}'); diff <(git cat-file blob "$bl") C:/Users/AMP/erp-pausa-2026-10-03/redator-san313c3/$b | grep -i -E '^[<>]'; echo "$b linhas-diferentes=$(diff <(git cat-file blob "$bl") C:/Users/AMP/erp-pausa-2026-10-03/redator-san313c3/$b | grep -c -i -E '^[<>]')"; cmp -s C:/Users/AMP/erp-pausa-2026-10-03/redator-san313c3/$b C:/Users/AMP/erp-pausa-2026-10-03/redator-san313c2/$b && echo "$b igual ao do redator do ciclo 2"; done; test -d C:/Users/AMP/w-trc02 && echo 'RAIZ existe' || echo 'RAIZ ausente: C:/Users/AMP/w-trc02'`
```
mandato-refs.sh linhas-diferentes=0
mandato-refs.sh igual ao do redator do ciclo 2
< RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
> RAIZ=C:/Users/AMP/w-trc02
mandato-preflight.sh linhas-diferentes=2
mandato-preflight.sh igual ao do redator do ciclo 2
RAIZ ausente: C:/Users/AMP/w-trc02
```

A régua deste ciclo no contrato do objeto: do §C7 item 8, as regras (1) junta proporcional ao risco, (2) teto de 2 ciclos (a partir do ciclo 3, só defeito de produto grave bloqueia) e (3) menos burocracia; do §C7 item 9, as regras (0) `arquivos_medidos` em todo voto, (1) a cadeira verde que carrega, (2) a revalidação por identidade nova e (3) a cadeira vermelha refeita (linha e começo de cada regra; e a linha da régua do ciclo 3), medido por: `tr -d '\r' < C:/Users/AMP/w-san313/CLAUDE.md | grep -n -i -o -E '\*\*\((0|1|2|3)\) [^*]{0,60}'; tr -d '\r' < C:/Users/AMP/w-san313/CLAUDE.md | grep -n -i -E -B1 'defeito de produto grave\*\*: perde dado, vaza dado entre organizações, quebra permissão ou erra dinheiro' | cut -c1-140`
```
759:**(1) Junta proporcional ao risco.
763:**(2) Teto de 2 ciclos.
768:**(3) Menos burocracia.
821:**(0) Todo voto de cadeira declara `arquivos_medidos`:
825:**(1) A cadeira verde carrega o voto
829:**(2) Se o conserto tocar o escopo dela,
832:**(3) A cadeira vermelha é refeita
763-   - **(2) Teto de 2 ciclos.** Nos ciclos 1 e 2 a junta funciona como hoje. **A partir do ciclo 3, só bloqueia
764:     defeito de produto grave**: perde dado, vaza dado entre organizações, quebra permissão ou erra dinheiro. Todo
```

A C3 do ciclo 2 votou REPROVADO com `arquivos_medidos: ["**"]` (escopo total, §C7 item 9 (0)): o voto não carrega nem se revalida, e a cadeira é REFEITA por identidade nova (§C7 item 9 (3)); a evidência dela é o roteiro P3 desta cadeira (linhas do arquivo) e os achados C3-01 a C3-04 estão no voto (identificador e gravidade de cada um), medido por: `cd C:/Users/AMP/w-san313 && node -e 'const v=JSON.parse(require("fs").readFileSync("C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13-ciclo2/c3-voto.json","utf8")); console.log("voto="+v.voto+" arquivos_medidos="+JSON.stringify(v.arquivos_medidos)+" jurado="+v.jurado); for (const a of (v.achados||[])) console.log((a.id||"")+" "+(a.gravidade||"")+" "+(a.escopo||""))'; echo "linhas da c3-evidencia do ciclo 2: $(wc -l < C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13-ciclo2/c3-evidencia.md)"`
```
voto=REPROVADO arquivos_medidos=["**"] jurado=jurado-san313-c3-opus (identidade nova; nada herdado como fato)
C3-01 bloqueia dentro-do-bloco
C3-02 nota dentro-do-bloco
C3-03 nota dentro-do-bloco
C3-04 nota dentro-do-bloco
linhas da c3-evidencia do ciclo 2: 96
```

CA-c3-1 do plano do ciclo 3, no objeto e no vermelho-controle `<objeto>~4` (o objeto do ciclo 2): os 4 motivos do C3-01 aparecem 1 vez cada no `API_CONTRACTS.md` do objeto e 0 vez no do ciclo 2 (leitura do blob por `git show`, CR retirado), medido por: `cd C:/Users/AMP/w-san313 && A=$(git ls-files --full-name C:/Users/AMP/w-san313/docs/claude-code-handoff/API_CONTRACTS.md); for r in f382422514fb2bd0f8363a191a46035c4cf7e865 f382422514fb2bd0f8363a191a46035c4cf7e865~4; do printf '%s: ' "$( [ "$r" = f382422514fb2bd0f8363a191a46035c4cf7e865 ] && echo objeto || echo 'objeto~4')"; for k in invalid_scope invalid_open_only scope_resolver_unavailable scope_resolution_failed; do printf '%s=%s ' "$k" "$(git show "$r:$A" | tr -d '\r' | grep -c -i "$k")"; done; echo; done`
```
objeto: invalid_scope=1 invalid_open_only=1 scope_resolver_unavailable=1 scope_resolution_failed=1
objeto~4: invalid_scope=0 invalid_open_only=0 scope_resolver_unavailable=0 scope_resolution_failed=0
```

CA-c3-2 do plano do ciclo 3, no objeto: o texto da seção §B do plano (a linha citada que começa por `GET /api/v1/work-orders`, depois do cabeçalho da seção do ciclo 3, sem o prefixo de citação) e a linha do contrato que começa por `GET /api/v1/work-orders` — filtros são iguais byte a byte (`cmp` sem saída e a palavra IGUAL; o tamanho de cada lado na última linha), medido por: `cmp <(tr -d '\r' < C:/Users/AMP/w-san313/docs/revisoes/SAN3/B-SAN3-13-plano.md | awk 'index($0,"## Ciclo 3 — plano de resolu")==1{f=1} f && /^> `GET \/api\/v1\/work-orders`/{sub(/^> /,""); print; exit}') <(tr -d '\r' < C:/Users/AMP/w-san313/docs/claude-code-handoff/API_CONTRACTS.md | grep -i -m1 '^`GET /api/v1/work-orders` — filtros') && echo IGUAL; echo "bytes plano=$(tr -d '\r' < C:/Users/AMP/w-san313/docs/revisoes/SAN3/B-SAN3-13-plano.md | awk 'index($0,"## Ciclo 3 — plano de resolu")==1{f=1} f && /^> `GET \/api\/v1\/work-orders`/{sub(/^> /,""); print; exit}' | wc -c) contrato=$(tr -d '\r' < C:/Users/AMP/w-san313/docs/claude-code-handoff/API_CONTRACTS.md | grep -i -m1 '^`GET /api/v1/work-orders` — filtros' | wc -c)"`
```
IGUAL
bytes plano=1473 contrato=1473
```

CA-c3-3 do plano do ciclo 3, no objeto: os motivos que o BLOCO acrescentou em `src/modules/work-orders` desde o head-base `<objeto>~23` (os 8 abaixo) estão todos no contrato do objeto (a contagem de FALTA é 0); no objeto do ciclo 2 faltavam 4 (o vermelho-controle), medido por: `cd C:/Users/AMP/w-san313 && A=$(git ls-files --full-name C:/Users/AMP/w-san313/docs/claude-code-handoff/API_CONTRACTS.md); M=$(git diff f382422514fb2bd0f8363a191a46035c4cf7e865~23 f382422514fb2bd0f8363a191a46035c4cf7e865 -- src/modules/work-orders | grep -i -E '^\+' | grep -o -i -E '"(invalid_[a-z_]+|scope_[a-z_]+)"' | tr -d '"' | sort -u); echo $M; for r in f382422514fb2bd0f8363a191a46035c4cf7e865 f382422514fb2bd0f8363a191a46035c4cf7e865~4; do n=0; for m in $M; do git show "$r:$A" | grep -q -i "$m" || n=$((n+1)); done; echo "FALTA no $( [ "$r" = f382422514fb2bd0f8363a191a46035c4cf7e865 ] && echo objeto || echo 'objeto~4'): $n"; done`
```
invalid_cursor invalid_cursor_mode invalid_cursor_offset invalid_open_only invalid_paginate invalid_scope scope_resolution_failed scope_resolver_unavailable
FALTA no objeto: 0
FALTA no objeto~4: 4
```

Regressão por construção (§F item 3 do plano do ciclo 3): nenhuma diferença entre o objeto do ciclo 2 e o objeto em código, teste, schema, app Flutter, frontend, scripts e workflows (a palavra CODIGO-IDENTICO), logo as suítes que o ciclo 2 rodou valem por identidade de árvore; e o relatório do dev do ciclo 3 (cabeçalho da seção e linha de identidade, cortados em 160 colunas) — o cabeçalho nomeia `dev-san313-c3-sol` e a identidade declarada é `dev-san313-c3-opus`, cobrindo o Codex, medido por: `cd C:/Users/AMP/w-san313 && git diff --quiet f382422514fb2bd0f8363a191a46035c4cf7e865~4 f382422514fb2bd0f8363a191a46035c4cf7e865 -- src tests prisma mobile frontend scripts .github && echo CODIGO-IDENTICO; tr -d '\r' < C:/Users/AMP/w-san313/docs/revisoes/SAN3/B-SAN3-13-dev.md | grep -n -i -E '^## Ciclo 3|^\*\*Identidade:\*\*' | tail -2 | cut -c1-160`
```
CODIGO-IDENTICO
332:## Ciclo 3 (dev-san313-c3-sol)
334:**Identidade:** `dev-san313-c3-opus` — Claude Opus 5.5, nível menor DECLARADO, cobrindo o Codex (`dev-san313-c3-sol`, GPT-5.6 Sol) que estava sem limite
```

Memória de commit livre em GB (a P8 (c) exige pelo menos 4 antes de lançar agente), os trabalhos Docker vivos fora da base `erp-*` (o teto é 2) e o disco livre em `C:` (a ordem do orquestrador para este ciclo: PARE abaixo de 7 GB), no instante da redação: quem for executar mede de novo antes de começar, medido por: `powershell.exe -NoProfile -Command '$o=Get-CimInstance Win32_PerfFormattedData_PerfOS_Memory; [math]::Round(($o.CommitLimit-$o.CommittedBytes)/1GB,2)'; docker ps --format '{{.Names}}' | grep -v -i -E '^erp-' | sed -E 's#-(pg|redis|run|net)$##' | sort -u; echo "trabalhos fora de erp: $(docker ps --format '{{.Names}}' | grep -v -i -E '^erp-' | sed -E 's#-(pg|redis|run|net)$##' | sort -u | wc -l)"; df -h /c | tail -1 | awk '{print "livre em C: " $4}'`
```
14,47
trabalhos fora de erp: 0
livre em C: 9.8G
```

O modelo de mandato do §C7.7 do contrato (P1, P2, P4, P3, P7), verbatim no objeto, medido por: `tr -d '\r' < C:/Users/AMP/w-san313/CLAUDE.md | grep -n -i -A7 'Após CADA item: apense a <cadeira>-evidencia.md'`
```
733:   Após CADA item: apense a <cadeira>-evidencia.md → comando · saída resumida · veredito parcial.  [P1]
734-   Antes da mensagem final: escreva <cadeira>-voto.json. Mensagem final = 1 linha apontando o arquivo.  [P2]
735-   Máximo 3 itens; logs longos só no arquivo de evidência.  [P4]
736-   Se você substituir um caído: re-execute cada comando do <cadeira>-evidencia.md dele e compare, depois
737-   meça a cauda. Conclusão sem comando registrado NÃO é insumo.  [P3]
738-   Se receber PAUSA: termine o comando em curso, grave `## PAUSA <hora UTC>` em <cadeira>-evidencia.md
739-   (head · feito · falta · próximo comando · arquivos meio-escritos) e pare sozinho com 1 linha apontando
740-   o arquivo. Não inicie item novo.  [P7]
```

## HIPOTESE

Você é `jurado-san313-c3c-opus` (identidade nova; o orquestrador confirma no disparo). Executor: **Codex GPT-5.6 Sol, ou Claude Opus se o Codex estiver sem limite, declarado no disparo** (o Codex volta às 20:13 de Brasília); nível menor DECLARADO nos dois casos (§C7.6, §C7.6-bis). O corpo canônico é `C:/Users/AMP/w-san313/.claude/agents/especialistas/jurado-san313-c3-regressao-escopo-registro.md` (Claude) ou o espelho `C:/Users/AMP/w-san313/.agents/agents/especialistas/jurado-san313-c3-regressao-escopo-registro.md` (Codex), carregado **do blob do objeto** (o worktree está no objeto, medido acima). O corpo é o do ciclo 1 e diz "ciclo 1" (medido acima): onde ele divergir deste mandato quanto a ciclo, objeto, diretório de votos, régua ou itens, vale este mandato. Na primeira linha de `c3c-evidencia.md`, declare executor efetivo, modelo, nível, objeto, `mandato_md5` deste arquivo (CR retirado antes do md5) e IDENTICO/DIVERGE do corpo carregado contra o blob, EOL-neutro. **Opus ou Sol esgotado: PARE sem votar** (§C7.6-bis; nunca outro modelo). Inelegíveis por nome: os do ciclo 2 — `planejador-mestre`, `planejador-san313-fable`, `planejador-san313-c2-fable`, `crit-san313-opus`, `crit-san313-opus-r2`, `crit-san313-argon`, `crit-san313-pro-r2`, `med-san313-argon`, `dev-san313-opus`, `dev-san313-c2-opus`, `fab-san313-opus`, `redator-san313-opus`, `redator-san313c2-opus`, `inspetor-san313-opus`, `jurado-san313-c2-opus`, `jurado-san313-c1-sol`, `jurado-san313-c2-sol`, `jurado-san313-c3-sol`, `jurado-san313-c1-opus` e `jurado-san313-c2b-opus` (os votos carregados) — mais `jurado-san313-c3-opus` (achou C3-01), `planejador-san313-c3-fable` (auditou e planejou o ciclo 3), `dev-san313-c3-opus` (consertou), `dev-san313-c3-sol` (o nome do cabeçalho da seção do dev, medido acima), `redator-san313c3-opus` (este mandato), `inspetor-san313c2-opus`, `inspetor-san313c3-opus` e o orquestrador; nome coincidente, pare. A seção do ciclo 3 do plano, o relatório do dev do ciclo 3 (contagens, CA, vermelhos-controle, bateria) e o registro da reprovação do ciclo 2 são **A RE-VERIFICAR**; o que está medido acima é piso, não teto, derruba com: `head -1 C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13-ciclo3/c3c-evidencia.md | grep -i -E 'executor|Opus|Sol|mandato_md5|objeto|IDENTICO|DIVERGE'`

A legalidade vem antes do mérito: parecer `insp-san313c3-parecer.md` de `inspetor-san313c3-opus` com LIBERADO ou LIBERADO COM RESSALVA nomeando você, o seu executor e o seu worktree; objeto = head do PR 460 do ciclo 3 (medido acima), check-runs concluídos. Régua: bloco de DADO, **unanimidade de 3 com veto** (§C7 item 8(1)), referida ao objeto = C1 carregado + C2b carregado + esta cadeira (§C7 item 9 (4)); **ciclo 3 (§C7 item 8(2)): só defeito de produto GRAVE reprova** — perde dado, vaza dado entre organizações, quebra permissão ou erra dinheiro; todo outro achado, inclusive de registro, contrato, processo ou forma, vira **pendência com dono** (bloco dono nomeado) e não reprova. Todo achado com gravidade, classe, escopo, N e forma; `pre-existente` só com a pre-existência MEDIDA e pendência com dono (§C7.1-ter(a)); "não consigo medir" = REPROVADO. **KPI congelado (§C7 item 8(5)): não cobre KPI.** C3-02, C3-03 e C3-04 são notas pelo §D do plano do ciclo 3 (nada a fazer): não os reabra como bloqueio. Não proponha correção (§C7.4-bis), não cobre a ata (é do orquestrador depois dos votos), não leia votos nem evidências da C1 e da C2b de ciclo nenhum; a evidência da C3 do ciclo 2 é o seu roteiro P3 (só leitura, copie). `arquivos_medidos: ["**"]` (os itens leem o diff inteiro e os check-runs), derruba com: `grep -i -E 'legalidade|A RE-VERIFICAR|gravidade|classe|escopo|arquivos_medidos|ciclo 3|grave|pendência|KPI' C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13-ciclo3/c3c-voto.json`

Terreno: worktree exclusivo `C:/Users/AMP/j13c3-c3-wt`, detached no objeto, zero junction de `node_modules` (§C7.1-ter(c)), removido só por `git worktree remove --force` depois de processos = 0; os três itens são leituras de git, `cmp` e check-runs, e por isso **esta cadeira não sobe Docker nem Postgres** (proposta do redator, a julgar pelo inspetor) e não toca a base viva nem as portas 5432, 6379, 3000, 5173, 5050, 8899, 55432; rerodar suíte local é opcional pelo §F do plano do ciclo 3 e, se rodar, só a forma sem banco, com `npm ci` próprio no seu worktree, comparada com a evidência da C3 do ciclo 2. Antes de começar: memória de commit livre ≥ 4 GB (P8 (c)) e disco ≥ 7 GB (ordem do orquestrador: abaixo disso, PARE e registre). Vermelhos-controle por `git show` do blob em `<objeto>~4` ou numa cópia sua (um caractere trocado), nunca editando o worktree do objeto; scripts e cópias numa pasta sua `C:/Users/AMP/erp-pausa-2026-10-03/j13c3-c3/`, derruba com: `grep -i -E 'j13c3-c3-wt|j13c3-c3[^-]|junction|Docker|commit livre|4 GB|7 GB|5432|base viva|git show|cópia|teardown' C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13-ciclo3/c3c-evidencia.md`

Item 1 de 3 (C3-01 fechado — CA-c3-1, CA-c3-2, CA-c3-3, cada um com o seu vermelho-controle): re-execute no checkout do objeto, por comando seu, os três critérios do §E do plano do ciclo 3 (os medidos acima são piso): CA-c3-1, os 4 motivos = 1 no objeto e = 0 em `<objeto>~4`; CA-c3-2, o texto de §B do plano extraído por parse da seção "Ciclo 3" igual byte a byte à linha do contrato, e o `cmp` acusando um caractere trocado numa cópia sua; CA-c3-3, todo motivo que o bloco acrescentou desde o head-base `<objeto>~23` presente no contrato (FALTA vazio), `FALTA` acusando um motivo fabricado numa cópia da lista e 4 `FALTA` em `<objeto>~4`; e confira, lendo `work-order.validators.ts` e `work-order.service.ts` do objeto, que a condição de cada motivo no texto (o 400 com `scope`/`openOnly` presente e diferente, o 503 com a referência ausente ou lançando) é a que o código emite, e que nenhum código ou motivo novo de erro existe só no texto, derruba com: `grep -i -E 'Item 1|CA-c3-1|CA-c3-2|CA-c3-3|invalid_scope|invalid_open_only|scope_resolver_unavailable|scope_resolution_failed|cmp|FALTA|vermelho|objeto~4|objeto~23|validators|service' C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13-ciclo3/c3c-evidencia.md`

Item 2 de 3 (escopo e merge — CA-c3-4): `git diff --name-only <objeto>~4..<objeto>` (o objeto do ciclo 2 ao objeto) sem caminho de código, teste, schema, app, frontend, scripts, workflows, `Kpis`, `PLANO_SAN3.md`, `pendencias.md` nem `decisoes.md` (o CA-c3-4 medido acima é piso: meça por caminho completo), e cada caminho do delta dentro do PERMITIDO do §C do plano do ciclo 3 (o contrato, a seção do ciclo 3 do relatório do dev, a seção do ciclo 3 do plano, `C:/Users/AMP/w-san313/agent-orchestration/omega/**`, corpos de jurado novos) — inclusive que o diff do plano e o do relatório do dev só acrescentam a seção do ciclo 3, sem reescrever o texto anterior, e que a linha do contrato é a única mudada nele; `git log --merges <objeto>~4..<objeto>` = 0; os commits novos = os declarados no relatório do dev do ciclo 3 (medidos acima: 4). Vermelho-controle: o classificador acusa um caminho PROIBIDO fabricado, derruba com: `grep -i -E 'Item 2|CA-c3-4|PERMITIDO|PROIBIDO|merges|commits|API_CONTRACTS|plano|dev|reescr|vermelho' C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13-ciclo3/c3c-evidencia.md`

Item 3 de 3 (regressão por identidade de árvore e CI — CA-c3-5): `git diff --quiet <objeto>~4 <objeto> -- src tests prisma mobile frontend scripts .github` com CODIGO-IDENTICO (medido acima), e por isso as suítes do ciclo 2 valem por identidade de árvore; o CA-c3-5 lido dos check-runs do objeto (`gh api` no endpoint de check-runs do commit do objeto): todos `completed success`, nos dois gatilhos, e as contagens dos logs do objeto iguais às do objeto do ciclo 2 — backend `345·3981·3979·0·2`, backend-postgres `493/493`, flutter `+905` —, conferidas contra a evidência da C3 do ciclo 2 (item 1); CI ausente, `queued` ou `cancelled` conta como ausente (§C7.1-bis). Vermelho-controle: o comparador de contagens acusa um número trocado numa cópia sua, derruba com: `grep -i -E 'Item 3|CA-c3-5|CODIGO-IDENTICO|check-runs|completed|success|backend|backend-postgres|flutter|905|493|3981|vermelho' C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13-ciclo3/c3c-evidencia.md`

Protocolo P1/P2/P3/P4/P7 do §C7.7, verbatim no bloco colado acima, com `<cadeira>` = `c3c`: evidência em `c3c-evidencia.md` após CADA item; `c3c-voto.json` nasce esqueleto com os três itens EM APURAÇÃO e `arquivos_medidos: ["**"]`, cada item gravado ao ser medido, e fecha antes da mensagem final de 1 linha; sucessor de identidade nova re-executa os comandos registrados e só então mede a cauda; três itens exatos; PAUSA grava head, feito, falta, próximo comando e arquivos meio-escritos e para. Queda em `00-quedas.md` do diretório deste ciclo (P6, pelo orquestrador). Únicos outputs no repositório: `c3c-evidencia.md` e `c3c-voto.json` em `C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13-ciclo3/`; os diretórios dos ciclos 1 e 2 são só leitura; nunca commit, derruba com: `test -f C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13-ciclo3/c3c-voto.json`

## MEDIDO

Pré-voo deste mandato com as ferramentas copiadas sem mudança para a pasta do redator `C:/Users/AMP/erp-pausa-2026-10-03/redator-san313c3/` (diferença contra o ramo das ferramentas medida acima), executado com o cwd no worktree do objeto; o redator é `redator-san313c3-opus` (Claude Opus 5.5, nível menor declarado, identidade nova), que adaptou ao ciclo 3 os mandatos do ciclo 2 (de `redator-san313c2-opus`) pelo plano de resolução do ciclo 3 e executou cada comando deste mandato pelo gerador `C:/Users/AMP/erp-pausa-2026-10-03/redator-san313c3/gerar-c3c.sh`, medido por: `cd C:/Users/AMP/w-san313 && MANDATO_REFS=C:/Users/AMP/erp-pausa-2026-10-03/redator-san313c3/mandato-refs.sh bash C:/Users/AMP/erp-pausa-2026-10-03/redator-san313c3/mandato-preflight.sh C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13-ciclo3/00-mandatos/cadeira-c3c.md 460 2>&1; echo ec=$?`
```
COLAGEM    l.6-20: refs do PR #460 confere com a saida atual

PRE-VOO OK — C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13-ciclo3/00-mandatos/cadeira-c3c.md
ec=0
```
