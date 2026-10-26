# Mandato — Cadeira C3 — B-SAN3-12a (junta de DINHEIRO, ciclo 2)

## MEDIDO

Estado do PR 459 no instante da redação, pela ferramenta `mandato-refs.sh` copiada sem mudança para a pasta própria do redator deste ciclo `C:/Users/AMP/erp-pausa-2026-10-03/redator-san312a-c2/`, com o cwd no worktree do objeto (o head do PR, a merge-base, os check-runs, e nenhuma ata ainda), medido por: `cd C:/Users/AMP/w-san312a && bash C:/Users/AMP/erp-pausa-2026-10-03/redator-san312a-c2/mandato-refs.sh 459`
```
# refs do PR #459 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato
# gerado em: 2026-10-26T05:29Z · repo: thiagodorgo/ERP_Techsolutios

ramo:            feat/web-financeiro-baixa-e-contas-12a
base:            origin/main
estado:          OPEN | rascunho=false | MERGEABLE
head do PR:      8a9fc1d8426426403f8642e263b3e932d1738716
merge-base:      aaa9d36a50dfac81a2ce338ef552ab51a0bed650
merge commit:    <ainda nao mergeado>
check-runs:      total=14 nao-verdes=0 pendentes=0
approved_head:   AUSENTE — nenhuma ata nomeia nem menciona #459
                 (a junta nao votou, ou a ata nao esta em origin/main nem no head do PR)

```

O ramo remoto aponta para o mesmo SHA que o PR declara como head (segunda fonte do objeto), medido por: `cd C:/Users/AMP/w-san312a && test "$(git ls-remote origin refs/heads/feat/web-financeiro-baixa-e-contas-12a | cut -f1)" = 8a9fc1d8426426403f8642e263b3e932d1738716 && echo "ls-remote = head do PR"`
```
ls-remote = head do PR
```

Os check-runs do head do PR estão todos concluídos e `SUCCESS` (o head confere, o total, os fora de `COMPLETED`/`SUCCESS` e os nomes com a conclusão, pelo `statusCheckRollup`), e os runs do objeto (o do gatilho `push` e o do `pull_request`, os dois listados com o estado e a conclusão); os ids de run não são citados aqui (corrida numérica longa é cobrada como SHA pelo pré-voo) e se obtêm por `gh run list --commit`, medido por: `cd C:/Users/AMP/w-san312a && gh pr view 459 --json headRefOid,statusCheckRollup --jq '(.headRefOid == "8a9fc1d8426426403f8642e263b3e932d1738716"), (.statusCheckRollup|length), ([.statusCheckRollup[] | select(.status != "COMPLETED" or .conclusion != "SUCCESS")] | length), ([.statusCheckRollup[] | .name + ":" + .conclusion] | sort | join(", "))'; gh run list --commit 8a9fc1d8426426403f8642e263b3e932d1738716 --json workflowName,event,status,conclusion --jq '.[] | .workflowName + " " + .event + " " + .status + " " + .conclusion'`
```
true
14
0
authority-portal:SUCCESS, authority-portal:SUCCESS, backend-postgres:SUCCESS, backend-postgres:SUCCESS, backend:SUCCESS, backend:SUCCESS, docker:SUCCESS, docker:SUCCESS, flutter:SUCCESS, flutter:SUCCESS, frontend:SUCCESS, frontend:SUCCESS, owner-portal:SUCCESS, owner-portal:SUCCESS
ci pull_request completed success
ci push completed success
```

O worktree `C:/Users/AMP/w-san312a` (o do dev, que o orquestrador nomeou para esta junta) está no objeto e sem modificação rastreada (0 linhas no status sem não rastreados); os não rastreados são só os dois diretórios de votos desta junta, o do ciclo 1 (`B-SAN3-12a`) e o deste ciclo 2 (`B-SAN3-12a-ciclo2`); por isso as leituras de arquivo deste mandato, feitas no disco desse worktree com caminho absoluto e com o CR retirado, leem o conteúdo do objeto (o `sed` põe o prefixo do worktree no caminho que o `git status` imprime), medido por: `cd C:/Users/AMP/w-san312a && test "$(git rev-parse HEAD)" = 8a9fc1d8426426403f8642e263b3e932d1738716 && echo 'HEAD = objeto'; git status --porcelain --untracked-files=no | wc -l; git status --short | sed -E 's#^(..) (.*)#\1 C:/Users/AMP/w-san312a/\2#'`
```
HEAD = objeto
0
?? C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a-ciclo2/
?? C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a/
```

O delta do ciclo 2. O objeto é um merge (2 pais): o 2º pai é a ponta da `main` (a merge-base do `mandato-refs.sh`), que entrou com 1 commit e só os 4 arquivos de `Kpis`, e a árvore do objeto é IGUAL à do merge automático dos dois pais (0 caminhos: o merge não tem conteúdo próprio). Pelo 1º pai, `<objeto>~4` é o OBJETO DO CICLO 1 (o mesmo SHA que a reprovação do ciclo 1 nomeia, comparado por comando sem citá-lo); de `<objeto>~4` a `<objeto>~1` há 3 commits sem merge (o plano do ciclo 2, o conserto e o registro do dev; o assunto de cada um abaixo) e 15 caminhos (a lista inteira, com o prefixo do worktree), dos quais 2 sob `src` (o serviço de títulos e o de cheques), 6 sob `tests`, 0 sob `prisma` e 0 sob `Kpis`, medido por: `cd C:/Users/AMP/w-san312a && echo "pais do objeto: $(git rev-list --parents -n1 8a9fc1d8426426403f8642e263b3e932d1738716 | wc -w | awk '{print $1-1}'); pais de <objeto>~1: $(git rev-list --parents -n1 8a9fc1d8426426403f8642e263b3e932d1738716~1 | wc -w | awk '{print $1-1}')"; test "$(git rev-parse 8a9fc1d8426426403f8642e263b3e932d1738716^2)" = aaa9d36a50dfac81a2ce338ef552ab51a0bed650 && echo '2º pai do objeto = merge-base do mandato-refs.sh (ponta da main)'; echo "a main que entrou no ciclo 2: $(git rev-list --count 8a9fc1d8426426403f8642e263b3e932d1738716~1..8a9fc1d8426426403f8642e263b3e932d1738716^2) commit(s)"; git diff --name-only $(git merge-base 8a9fc1d8426426403f8642e263b3e932d1738716~1 8a9fc1d8426426403f8642e263b3e932d1738716^2) 8a9fc1d8426426403f8642e263b3e932d1738716^2 | sed -e 's#^#C:/Users/AMP/w-san312a/#'; T=$(git merge-tree --write-tree 8a9fc1d8426426403f8642e263b3e932d1738716~1 8a9fc1d8426426403f8642e263b3e932d1738716^2 | head -1); echo "objeto × merge automático dos dois pais: $(git diff --name-only "$T" 8a9fc1d8426426403f8642e263b3e932d1738716 | wc -l) caminhos"; test "$(git rev-parse 8a9fc1d8426426403f8642e263b3e932d1738716~4)" = "$(tr -d '\r' < C:/Users/AMP/w-san312a/agent-orchestration/omega/reprovacoes/R-B-SAN3-12a-ciclo1.md | grep -o -i -E '[0-9a-f]{40}' | head -1)" && echo '<objeto>~4 = objeto do ciclo 1 (o SHA que a R-B-SAN3-12a-ciclo1.md nomeia)'; echo "<objeto>~4..<objeto>~1: $(git rev-list --count 8a9fc1d8426426403f8642e263b3e932d1738716~4..8a9fc1d8426426403f8642e263b3e932d1738716~1) commit(s), $(git rev-list --merges --count 8a9fc1d8426426403f8642e263b3e932d1738716~4..8a9fc1d8426426403f8642e263b3e932d1738716~1) merge(s)"; for i in 3 2 1; do echo "<objeto>~$i: $(git log -1 --format=%s 8a9fc1d8426426403f8642e263b3e932d1738716~$i)"; done; git diff --name-only 8a9fc1d8426426403f8642e263b3e932d1738716~4 8a9fc1d8426426403f8642e263b3e932d1738716~1 | sed -e 's#^#C:/Users/AMP/w-san312a/#'; for d in src tests prisma Kpis; do echo "sob $d: $(git diff --name-only 8a9fc1d8426426403f8642e263b3e932d1738716~4 8a9fc1d8426426403f8642e263b3e932d1738716~1 -- $d | wc -l)"; done`
```
pais do objeto: 2; pais de <objeto>~1: 1
2º pai do objeto = merge-base do mandato-refs.sh (ponta da main)
a main que entrou no ciclo 2: 1 commit(s)
C:/Users/AMP/w-san312a/Kpis/app.js
C:/Users/AMP/w-san312a/Kpis/kpis-history.json
C:/Users/AMP/w-san312a/Kpis/kpis-history.md
C:/Users/AMP/w-san312a/Kpis/kpis-latest.json
objeto × merge automático dos dois pais: 0 caminhos
<objeto>~4 = objeto do ciclo 1 (o SHA que a R-B-SAN3-12a-ciclo1.md nomeia)
<objeto>~4..<objeto>~1: 3 commit(s), 0 merge(s)
<objeto>~3: docs(plano): plano de resolução do ciclo 2 do B-SAN3-12a e registro da reprovação do ciclo 1
<objeto>~2: fix(financeiro): PATCH do valor e DELETE do título relêem o cheque pendente sob o lock, e a justificativa do desvínculo recusa controle e texto mal-formado (B-SAN3-12a ciclo 2)
<objeto>~1: docs(registro): ciclo 2 do B-SAN3-12a — relatório do dev, A30 como leitura do planejador, 4 pendências pré-existentes com dono e papéis do ciclo
C:/Users/AMP/w-san312a/API_CONTRACTS.md
C:/Users/AMP/w-san312a/agent-orchestration/controle/decisoes.md
C:/Users/AMP/w-san312a/agent-orchestration/controle/pendencias-indice.md
C:/Users/AMP/w-san312a/agent-orchestration/controle/pendencias.md
C:/Users/AMP/w-san312a/agent-orchestration/omega/reprovacoes/R-B-SAN3-12a-ciclo1.md
C:/Users/AMP/w-san312a/docs/revisoes/SAN3/B-SAN3-12-plano.md
C:/Users/AMP/w-san312a/docs/revisoes/SAN3/B-SAN3-12a-dev.md
C:/Users/AMP/w-san312a/src/modules/cheques/cheque.service.ts
C:/Users/AMP/w-san312a/src/modules/financial-titles/financial-title.service.ts
C:/Users/AMP/w-san312a/tests/b-san3-12a-entries-aggregate-db.test.ts
C:/Users/AMP/w-san312a/tests/b-san3-12a-pay-pending-cheque-db.test.ts
C:/Users/AMP/w-san312a/tests/b-san3-12a-pay-pending-cheque.test.ts
C:/Users/AMP/w-san312a/tests/b-san3-12a-reconcile-cas-db.test.ts
C:/Users/AMP/w-san312a/tests/b-san3-12a-title-mutation-race-db.test.ts
C:/Users/AMP/w-san312a/tests/b-san3-12a-unlink-title.test.ts
sob src: 2
sob tests: 6
sob prisma: 0
sob Kpis: 0
```

As bases, por comando e em forma relativa (SHA que não sai do `mandato-refs.sh 459` não se publica). O head-base do BLOCO (o ponto em que o ramo saiu da `main`) é `<objeto>~18` pelo 1º pai: ele é a merge-base dos dois pais do merge do ciclo 1 (`<objeto>~5`) e ancestral da `main` de agora; do head-base ao objeto, pelo 1º pai, há 18 commits, dos quais 2 merges (o `<objeto>~5`, do ciclo 1, e o próprio objeto); a merge-base com a `origin/main` é o 2º pai do objeto, não o head-base do bloco. O diff do PR (merge-base..objeto) é a UNIÃO de três trechos — o diff do BLOCO (`<objeto>~18..<objeto>~6`, os commits do ramo antes do merge do ciclo 1, corpos C1 a C3 inclusos), o corpo da C4 (`<objeto>~5..<objeto>~4`) e o conserto do ciclo 2 (`<objeto>~4..<objeto>~1`) — conjunto IGUAL, provado. O head-base da EMENDA (antes do A27 e da D1) é `<objeto>~12` pelo 1º pai (`<objeto>~6~6`), e o commit do A27 e da D1 é `<objeto>~11` (o assunto de cada um abaixo). A última linha diz quantos commits a `main` (as duas entradas) tem depois do head-base, quantos caminhos dela caem sob `tests` e quais caem também no diff do bloco, medido por: `cd C:/Users/AMP/w-san312a && test "$(git merge-base 8a9fc1d8426426403f8642e263b3e932d1738716~6 8a9fc1d8426426403f8642e263b3e932d1738716~5^2)" = "$(git rev-parse 8a9fc1d8426426403f8642e263b3e932d1738716~18)" && echo 'merge-base dos dois pais do merge do ciclo 1 = <objeto>~18 (head-base do bloco)'; test "$(git merge-base 8a9fc1d8426426403f8642e263b3e932d1738716 origin/main)" = "$(git rev-parse 8a9fc1d8426426403f8642e263b3e932d1738716^2)" && echo 'merge-base com a origin/main = 2º pai do objeto, não o head-base do bloco'; git merge-base --is-ancestor 8a9fc1d8426426403f8642e263b3e932d1738716~18 8a9fc1d8426426403f8642e263b3e932d1738716^2 && echo 'head-base do bloco ancestral da main de agora'; echo "1º pai, head-base..objeto: $(git rev-list --first-parent --count 8a9fc1d8426426403f8642e263b3e932d1738716~18..8a9fc1d8426426403f8642e263b3e932d1738716) commits, $(git rev-list --first-parent --merges --count 8a9fc1d8426426403f8642e263b3e932d1738716~18..8a9fc1d8426426403f8642e263b3e932d1738716) merge(s)"; echo "caminhos: bloco $(git diff --name-only 8a9fc1d8426426403f8642e263b3e932d1738716~18 8a9fc1d8426426403f8642e263b3e932d1738716~6 | wc -l); corpo da C4 $(git diff --name-only 8a9fc1d8426426403f8642e263b3e932d1738716~5 8a9fc1d8426426403f8642e263b3e932d1738716~4 | wc -l); conserto do ciclo 2 $(git diff --name-only 8a9fc1d8426426403f8642e263b3e932d1738716~4 8a9fc1d8426426403f8642e263b3e932d1738716~1 | wc -l); diff do PR $(git diff --name-only aaa9d36a50dfac81a2ce338ef552ab51a0bed650 8a9fc1d8426426403f8642e263b3e932d1738716 | wc -l)"; diff <( (git diff --name-only 8a9fc1d8426426403f8642e263b3e932d1738716~18 8a9fc1d8426426403f8642e263b3e932d1738716~6; git diff --name-only 8a9fc1d8426426403f8642e263b3e932d1738716~5 8a9fc1d8426426403f8642e263b3e932d1738716~4; git diff --name-only 8a9fc1d8426426403f8642e263b3e932d1738716~4 8a9fc1d8426426403f8642e263b3e932d1738716~1) | sort -u) <(git diff --name-only aaa9d36a50dfac81a2ce338ef552ab51a0bed650 8a9fc1d8426426403f8642e263b3e932d1738716 | sort -u) >/dev/null && echo 'diff do PR = bloco + corpo da C4 + conserto do ciclo 2 (conjunto IGUAL)'; echo "<objeto>~12: $(git log -1 --format=%s 8a9fc1d8426426403f8642e263b3e932d1738716~12)"; echo "<objeto>~11: $(git log -1 --format=%s 8a9fc1d8426426403f8642e263b3e932d1738716~11)"; test "$(git rev-parse 8a9fc1d8426426403f8642e263b3e932d1738716~12)" = "$(git rev-parse 8a9fc1d8426426403f8642e263b3e932d1738716~6~6)" && echo '<objeto>~12 = <objeto>~6~6'; echo "a main depois do head-base: $(git rev-list --count 8a9fc1d8426426403f8642e263b3e932d1738716~18..8a9fc1d8426426403f8642e263b3e932d1738716^2) commits, $(git diff --name-only 8a9fc1d8426426403f8642e263b3e932d1738716~18 8a9fc1d8426426403f8642e263b3e932d1738716^2 -- tests | wc -l) caminhos sob tests; em comum com o diff do bloco:"; comm -12 <(git diff --name-only 8a9fc1d8426426403f8642e263b3e932d1738716~18 8a9fc1d8426426403f8642e263b3e932d1738716^2 | sort) <(git diff --name-only 8a9fc1d8426426403f8642e263b3e932d1738716~18 8a9fc1d8426426403f8642e263b3e932d1738716~6 | sort) | sed -e 's#^#C:/Users/AMP/w-san312a/#'`
```
merge-base dos dois pais do merge do ciclo 1 = <objeto>~18 (head-base do bloco)
merge-base com a origin/main = 2º pai do objeto, não o head-base do bloco
head-base do bloco ancestral da main de agora
1º pai, head-base..objeto: 18 commits, 2 merge(s)
caminhos: bloco 67; corpo da C4 2; conserto do ciclo 2 15; diff do PR 71
diff do PR = bloco + corpo da C4 + conserto do ciclo 2 (conjunto IGUAL)
<objeto>~12: docs(revisoes): relatório do dev do B-SAN3-12a — critérios, 35 mutações, bateria base × head e as falsificações F1–F9
<objeto>~11: fix(financeiro): CAS do título lido no 1º vínculo, no cancel e no delete do cheque (A27) e o PATCH privilegiado que tira o vínculo responde 422 (D1) — Emenda E1/E1-bis do B-SAN3-12a
<objeto>~12 = <objeto>~6~6
a main depois do head-base: 4 commits, 24 caminhos sob tests; em comum com o diff do bloco:
C:/Users/AMP/w-san312a/agent-orchestration/controle/decisoes.md
C:/Users/AMP/w-san312a/agent-orchestration/controle/pendencias-indice.md
C:/Users/AMP/w-san312a/agent-orchestration/controle/pendencias.md
C:/Users/AMP/w-san312a/agent-orchestration/docs/status-geral.md
C:/Users/AMP/w-san312a/docs/revisoes/SAN3/PLANO_SAN3.md
```

O corpo desta cadeira existe no objeto e, descontados o frontmatter e o bloco de adaptação Codex do espelho, é IDÊNTICO entre os dois espelhos (comparação EOL-neutra; o arquivo inteiro difere por construção do espelho, e por isso não se publica hash); o número de linhas de cada espelho está na saída, e nenhum commit do ciclo 2 o tocou (a última linha conta os commits que o tocam até o objeto e até o objeto do ciclo 1, `<objeto>~4`), medido por: `cd C:/Users/AMP/w-san312a && diff <(tr -d '\r' < C:/Users/AMP/w-san312a/.claude/agents/especialistas/jurado-san312a-c3-regressao-escopo-contrato.md | awk 'f; $0=="---"{n++; if(n==2) f=1}' | sed '/^$/d') <(tr -d '\r' < C:/Users/AMP/w-san312a/.agents/agents/especialistas/jurado-san312a-c3-regressao-escopo-contrato.md | awk 'f; $0=="---"{n++; if(n==2) f=1}' | awk 'index($0,"Papel para o Codex"){s=1} s&&$0==""{s=0; next} !s' | sed '/^$/d') >/dev/null && echo 'IDENTICO corpo c3-regressao-escopo-contrato' || echo 'DIVERGE corpo c3-regressao-escopo-contrato'; wc -l < C:/Users/AMP/w-san312a/.claude/agents/especialistas/jurado-san312a-c3-regressao-escopo-contrato.md; wc -l < C:/Users/AMP/w-san312a/.agents/agents/especialistas/jurado-san312a-c3-regressao-escopo-contrato.md; echo "commits que tocam o corpo: até o objeto $(git rev-list --count 8a9fc1d8426426403f8642e263b3e932d1738716 -- C:/Users/AMP/w-san312a/.claude/agents/especialistas/jurado-san312a-c3-regressao-escopo-contrato.md), até o objeto do ciclo 1 $(git rev-list --count 8a9fc1d8426426403f8642e263b3e932d1738716~4 -- C:/Users/AMP/w-san312a/.claude/agents/especialistas/jurado-san312a-c3-regressao-escopo-contrato.md)"`
```
IDENTICO corpo c3-regressao-escopo-contrato
370
376
commits que tocam o corpo: até o objeto 1, até o objeto do ciclo 1 1
```

As duas ferramentas do pré-voo na pasta do redator deste ciclo são as do ramo `origin/chore/mandato-refs-e-preflight` com uma única diferença, a linha do `RAIZ` do `mandato-preflight.sh`, fixada em `C:/Users/AMP/w-trc02` (a adaptação do B-TRC-02), e são byte a byte as da pasta do redator do ciclo 1 desta junta (`C:/Users/AMP/erp-pausa-2026-10-03/redator-san312a/`, copiadas sem alteração); esse `RAIZ` não existe mais no disco, logo a checagem 6 do pré-voo não acharia caminho relativo nenhum, e por isso este mandato cita todo caminho do repositório ABSOLUTO no worktree do objeto (a checagem 6 não confere caminho absoluto, fronteira declarada no cabeçalho do pré-voo; a existência de cada um sai das leituras medidas neste mandato), medido por: `cd C:/Users/AMP/Documents/GitHub/ERP_Techsolutios && for b in mandato-refs.sh mandato-preflight.sh; do bl=$(git ls-tree -r origin/chore/mandato-refs-e-preflight -- scripts | awk -v b="$b" '$4 ~ ("/" b "$") {print $3}'); diff <(git cat-file blob "$bl") C:/Users/AMP/erp-pausa-2026-10-03/redator-san312a-c2/$b | grep -i -E '^[<>]'; echo "$b linhas-diferentes=$(diff <(git cat-file blob "$bl") C:/Users/AMP/erp-pausa-2026-10-03/redator-san312a-c2/$b | grep -c -i -E '^[<>]')"; cmp -s C:/Users/AMP/erp-pausa-2026-10-03/redator-san312a-c2/$b C:/Users/AMP/erp-pausa-2026-10-03/redator-san312a/$b && echo "$b igual ao do redator do ciclo 1 desta junta"; done; test -d C:/Users/AMP/w-trc02 && echo 'RAIZ existe' || echo 'RAIZ ausente: C:/Users/AMP/w-trc02'`
```
mandato-refs.sh linhas-diferentes=0
mandato-refs.sh igual ao do redator do ciclo 1 desta junta
< RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
> RAIZ=C:/Users/AMP/w-trc02
mandato-preflight.sh linhas-diferentes=2
mandato-preflight.sh igual ao do redator do ciclo 1 desta junta
RAIZ ausente: C:/Users/AMP/w-trc02
```

A régua desta junta no contrato do objeto: do §C7 item 8, as regras (1) junta proporcional ao risco, (2) teto de 2 ciclos e (3) menos burocracia; do §C7 item 9, as regras (0) `arquivos_medidos` em todo voto, (1) a cadeira verde que carrega, (2) a revalidação por identidade nova e (3) a cadeira vermelha refeita (linha e começo de cada regra), medido por: `tr -d '\r' < C:/Users/AMP/w-san312a/CLAUDE.md | grep -n -i -o -E '\*\*\((0|1|2|3)\) [^*]{0,60}'`
```
759:**(1) Junta proporcional ao risco.
763:**(2) Teto de 2 ciclos.
768:**(3) Menos burocracia.
821:**(0) Todo voto de cadeira declara `arquivos_medidos`:
825:**(1) A cadeira verde carrega o voto
829:**(2) Se o conserto tocar o escopo dela,
832:**(3) A cadeira vermelha é refeita
```

As decisões do dono que regem o bloco, literais, nos apêndices do plano no objeto (as 4 perguntas de 24/10 e as respostas à crítica r2 de 25/10: valor exato, mesmo privilégio da troca, migração de dados autorizada), uma linha por decisão; e as linhas em que o plano diz "Perguntas ao dono: 0" (a da E1-bis e a do resumo do ciclo 2, depois do cabeçalho C2.6), medido por: `tr -d '\r' < C:/Users/AMP/w-san312a/docs/revisoes/SAN3/B-SAN3-12-plano.md | grep -n -i -o -E 'Aceito as 4 \(Recomendado\)|Só cheque do valor exato \(Recomendado\)|Mesmo privilégio da troca \(Recomendado\)|Autorizo \(Recomendado\)' | sort -t: -k2 -u; tr -d '\r' < C:/Users/AMP/w-san312a/docs/revisoes/SAN3/B-SAN3-12-plano.md | grep -n -i -o -E '^### C2\.6 — Perguntas ao dono|^- \*\*Perguntas ao dono: 0\.\*\*'`
```
623:Aceito as 4 (Recomendado)
29:Autorizo (Recomendado)
29:Mesmo privilégio da troca (Recomendado)
29:Só cheque do valor exato (Recomendado)
936:- **Perguntas ao dono: 0.**
1062:### C2.6 — Perguntas ao dono
1070:- **Perguntas ao dono: 0.**
```

Ciclo 2, pelo §C7 item 9: no diretório de votos do ciclo 1 (`B-SAN3-12a`) há voto e evidência só da C2 e da C4, os dois `REPROVADO` (o campo `voto` de cada JSON), e nenhum da C1 nem da C3, que o orquestrador segurou; o `arquivos_medidos` dos dois votos alcança o que o conserto tocou (o serviço de cheques e o de títulos); no diretório deste ciclo 2 (`B-SAN3-12a-ciclo2`) só há o diretório dos mandatos. Logo a C2 e a C4 são REFEITAS (regra (3)), com identidade nova (C2b e C4b), a C1 e a C3 votam pela primeira vez, e não há voto verde a carregar nem a revalidar; a C3 vota pela primeira vez, no objeto do ciclo 2, medido por: `ls C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a | sed -e 's#^#C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a/#'; echo "votos do ciclo 1 por cadeira: $(ls C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a | grep -i -E '^c[1234]-voto\.json$' | tr '\n' ' ')"; node -e 'const fs=require("fs");for(const c of ["c2","c4"]){const j=JSON.parse(fs.readFileSync("C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a/"+c+"-voto.json","utf8").replace(String.fromCharCode(65279),""));const a=JSON.stringify(j.arquivos_medidos)+JSON.stringify((j.itens||[]).map(i=>i.arquivos_medidos||""));console.log(c+": voto="+j.voto+" alcança cheque.service.ts="+a.includes("cheque.service.ts")+" alcança financial-title(s)="+a.includes("financial-title"))}'; ls C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a-ciclo2 | sed -e 's#^#C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a-ciclo2/#'`
```
C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a/00-mandatos
C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a/c2-evidencia.md
C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a/c2-voto.json
C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a/c4-evidencia.md
C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a/c4-voto.json
C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a/insp-san312a-evidencia-r2.md
C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a/insp-san312a-evidencia.md
C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a/insp-san312a-parecer-bloqueado-r2.md
C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a/insp-san312a-parecer.md
votos do ciclo 1 por cadeira: c2-voto.json c4-voto.json
c2: voto=REPROVADO alcança cheque.service.ts=true alcança financial-title(s)=true
c4: voto=REPROVADO alcança cheque.service.ts=true alcança financial-title(s)=true
C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a-ciclo2/00-mandatos
```

O plano de resolução do ciclo 2 no objeto (a seção "Ciclo 2 (12a)" do plano, apensa pelo planejador de topo `planejador-san312a-c2-fable`): o cabeçalho da seção, as linhas dos critérios A29-a a A29-h e A30-a a A30-c, os cabeçalhos do A13-bis e do R-res-5-bis, o do escopo (C2.2) e o das cadeiras do ciclo 2 (C2.5), número de linha e começo de cada, medido por: `tr -d '\r' < C:/Users/AMP/w-san312a/docs/revisoes/SAN3/B-SAN3-12-plano.md | grep -n -i -o -E '^## Ciclo 2 \(12a\) — plano de resolução|^\| A(29|30)-[a-h] \([^)]{0,60}\)|^#### E2\.[34] — C4-0[12] → \*\*(A13-bis|R-res-5-bis)\*\*|^### C2\.(2|5) — [^(]{0,40}'`
```
939:## Ciclo 2 (12a) — plano de resolução
983:| A29-a (db, barreira)
984:| A29-b (db, barreira — controle do lado oposto)
985:| A29-c (db, barreira)
986:| A29-d (db, barreira — controle)
987:| A29-e (memória, contador)
988:| A29-f (memória, determinístico, sem relógio)
989:| A29-g (db, sem barreira — invariante de regressão)
990:| A29-h (regressão de período)
1005:| A30-a (memória, função pura)
1006:| A30-b (HTTP, memória)
1007:| A30-c (db, propriedade do rastro)
1011:#### E2.3 — C4-02 → **A13-bis**
1014:#### E2.4 — C4-01 → **R-res-5-bis**
1023:### C2.2 — Escopo do ciclo 2: PERMITIDO e PROIBIDO
1054:### C2.5 — Cadeiras do ciclo 2
```

O PR não está em conflito com a `main` (estado de merge pelo GitHub). A trava `migration-transaction-guard.mjs` do B-GUARD-MIGRACAO (#458), que entrou no ramo pelo merge do ciclo 1 (ausente no 1º pai dele, `<objeto>~6`), está no objeto (o script e o teste que a põe no `npm test`) e julga a migração de dados deste bloco: executada no worktree do objeto, o rodapé dela e, por migração NOVA (carimbo trocado por `<carimbo>`), o número de sentenças e de violações; a migração do bloco é a `<carimbo>_grant_finance_unreconcile_and_cheque_unlink_permissions` (carimbo que começa por 2026 0882), nova, com 0 violação; o conserto do ciclo 2 não tocou `prisma` (medido no delta), medido por: `cd C:/Users/AMP/w-san312a && gh pr view 459 --json mergeable,mergeStateStatus --jq '.mergeable + " " + .mergeStateStatus'; git ls-tree -r --name-only 8a9fc1d8426426403f8642e263b3e932d1738716 -- C:/Users/AMP/w-san312a/scripts C:/Users/AMP/w-san312a/tests | grep -i 'migration-transaction-guard' | sed -e 's#^#C:/Users/AMP/w-san312a/#'; echo "no 1º pai do merge do ciclo 1: $(git ls-tree -r --name-only 8a9fc1d8426426403f8642e263b3e932d1738716~6 -- C:/Users/AMP/w-san312a/scripts | grep -c -i 'migration-transaction-guard')"; node C:/Users/AMP/w-san312a/scripts/migration-transaction-guard.mjs; echo "ec=$?"; node --input-type=module -e 'const g=await import("file:///C:/Users/AMP/w-san312a/scripts/migration-transaction-guard.mjs"); const r=g.auditMigrationsDir("C:/Users/AMP/w-san312a/prisma/migrations"); for (const m of r.migrations.filter(x=>x.nova)) console.log("<carimbo>"+m.name.slice(14), "nova", "sentenças="+(Array.isArray(m.statements)?m.statements.length:m.statements), "violações="+m.violations.length)'`
```
MERGEABLE CLEAN
C:/Users/AMP/w-san312a/scripts/migration-transaction-guard.mjs
C:/Users/AMP/w-san312a/tests/migration-transaction-guard.test.ts
no 1º pai do merge do ciclo 1: 0
migrações: 117 · anteriores: 112 · novas: 5 · violações: 0
ec=0
<carimbo>_invoice_complementary_title nova sentenças=6 violações=0
<carimbo>_vehicle_telemetry_events nova sentenças=17 violações=0
<carimbo>_validate_receipt_message_kind_check nova sentenças=1 violações=0
<carimbo>_cheque_title_link nova sentenças=3 violações=0
<carimbo>_grant_finance_unreconcile_and_cheque_unlink_permissions nova sentenças=2 violações=0
```

Os dois merges da `main` no ramo não têm conteúdo próprio fora dos registros. O do ciclo 2 (o objeto) é IGUAL ao merge automático dos dois pais (0 caminhos). O do ciclo 1 (`<objeto>~5`), comparado com o merge AUTOMÁTICO dos dois pais dele (`git merge-tree --write-tree`, que deixa os marcadores de conflito), só difere nos 4 arquivos de registro (os 3 de append e o índice regenerado); nos 3 de append, nenhuma linha do 2º pai dele (a `main`) sai, e as linhas do 1º pai (o ramo) que saem são, todas, linhas que a própria `main` tirou ou trocou depois do head-base (a contagem "fora das que a main tirou" é 0). O índice de pendências do objeto é byte a byte (CR retirado) o que o gerador `gerar-indice-pendencias.py` do objeto produz do `pendencias.md` do objeto, rodado numa pasta temporária (0 linha de diferença; a primeira linha é o resumo que o gerador imprime), medido por: `cd C:/Users/AMP/w-san312a && T2=$(git merge-tree --write-tree 8a9fc1d8426426403f8642e263b3e932d1738716~1 8a9fc1d8426426403f8642e263b3e932d1738716^2 | head -1); echo "merge do ciclo 2 (objeto) × automático: $(git diff --name-only "$T2" 8a9fc1d8426426403f8642e263b3e932d1738716 | wc -l) caminhos"; T=$(git merge-tree --write-tree 8a9fc1d8426426403f8642e263b3e932d1738716~6 8a9fc1d8426426403f8642e263b3e932d1738716~5^2 | head -1); echo "merge do ciclo 1 (<objeto>~5) × automático: $(git diff --name-only "$T" 8a9fc1d8426426403f8642e263b3e932d1738716~5 | wc -l) caminhos"; git diff --name-only "$T" 8a9fc1d8426426403f8642e263b3e932d1738716~5 | sed -e 's#^#C:/Users/AMP/w-san312a/#'; for f in C:/Users/AMP/w-san312a/agent-orchestration/controle/decisoes.md C:/Users/AMP/w-san312a/agent-orchestration/controle/pendencias.md C:/Users/AMP/w-san312a/agent-orchestration/docs/status-geral.md; do a=$(git diff --numstat 8a9fc1d8426426403f8642e263b3e932d1738716~6 8a9fc1d8426426403f8642e263b3e932d1738716~5 -- "$f" | cut -f2); b=$(git diff --numstat 8a9fc1d8426426403f8642e263b3e932d1738716~5^2 8a9fc1d8426426403f8642e263b3e932d1738716~5 -- "$f" | cut -f2); x=$(comm -23 <(git diff -U0 8a9fc1d8426426403f8642e263b3e932d1738716~6 8a9fc1d8426426403f8642e263b3e932d1738716~5 -- "$f" | grep -a -i -E '^-' | grep -a -v -i -E '^---' | sort) <(git diff -U0 8a9fc1d8426426403f8642e263b3e932d1738716~18 8a9fc1d8426426403f8642e263b3e932d1738716~5^2 -- "$f" | grep -a -i -E '^-' | grep -a -v -i -E '^---' | sort) | wc -l); echo "$f: saem do 1º pai ${a:-0} (fora das que a main tirou: $x) · saem do 2º pai ${b:-0}"; done; PYTHONIOENCODING=utf-8 python -I -X utf8 -c 'import os,io,subprocess,tempfile,shutil,difflib; d=tempfile.mkdtemp(); c=os.path.join(d,"agent-orchestration","controle"); os.makedirs(c); io.open(os.path.join(c,"pendencias.md"),"w",encoding="utf-8",newline="").write(io.open("C:/Users/AMP/w-san312a/agent-orchestration/controle/pendencias.md",encoding="utf-8").read()); subprocess.run(["python","-I","C:/Users/AMP/w-san312a/agent-orchestration/controle/gerar-indice-pendencias.py"],cwd=d,check=True); a=io.open("C:/Users/AMP/w-san312a/agent-orchestration/controle/pendencias-indice.md",encoding="utf-8").read(); b=io.open(os.path.join(c,"pendencias-indice.md"),encoding="utf-8").read(); n=sum(1 for l in difflib.ndiff(a.splitlines(),b.splitlines()) if l[:1] in "+-"); print("índice do objeto × gerador:", "IGUAL" if a==b else "DIFERE", n, "linha(s) de diferença"); shutil.rmtree(d)'`
```
merge do ciclo 2 (objeto) × automático: 0 caminhos
merge do ciclo 1 (<objeto>~5) × automático: 4 caminhos
C:/Users/AMP/w-san312a/agent-orchestration/controle/decisoes.md
C:/Users/AMP/w-san312a/agent-orchestration/controle/pendencias-indice.md
C:/Users/AMP/w-san312a/agent-orchestration/controle/pendencias.md
C:/Users/AMP/w-san312a/agent-orchestration/docs/status-geral.md
C:/Users/AMP/w-san312a/agent-orchestration/controle/decisoes.md: saem do 1º pai 0 (fora das que a main tirou: 0) · saem do 2º pai 0
C:/Users/AMP/w-san312a/agent-orchestration/controle/pendencias.md: saem do 1º pai 2 (fora das que a main tirou: 0) · saem do 2º pai 0
C:/Users/AMP/w-san312a/agent-orchestration/docs/status-geral.md: saem do 1º pai 0 (fora das que a main tirou: 0) · saem do 2º pai 0
indice: 651 cabecalhos / 640 IDs | {'FECHADA': 155, 'ABERTA': 493, 'SEM-STATUS': 3} | baldes {'-': 155, 'C': 65, 'B': 204, '?': 3, 'A': 224} | diferidas-materiais 13
índice do objeto × gerador: IGUAL 0 linha(s) de diferença
```

O que a E1-bis (§E1b.6) diz que a C3 mede, e o que o plano do ciclo 2 acrescenta à C3 (a linha da C3 no C2.5: B1, B2, A17-bis, contrato da justificativa, do re-check do título e dos 409, e o registro das 4 pendências novas, da `P-SAN3-20-DELETE-TITULO-COM-CHEQUE` e dos papéis), linha e começo de cada; esta composição do orquestrador dá à C3 três itens — B1 e B2; escopo (com os dois merges e a migração de dados); registro e contrato, com a decisão sobre a `P-SAN3-12A-PLANO-FALSIFICADO-ESCOPO` — divergência de arranjo registrada (§A2), e vale este mandato, medido por: `tr -d '\r' < C:/Users/AMP/w-san312a/docs/revisoes/SAN3/B-SAN3-12-plano.md | grep -n -i -o -E 'C3 \(fail-closed/contrato\) — B1 \(três listas, CI no head\)[^.]{0,60}'; tr -d '\r' < C:/Users/AMP/w-san312a/docs/revisoes/SAN3/B-SAN3-12-plano.md | grep -n -i -E '^- \*\*C3 — fail-closed, contrato e suíte' | cut -c1-300`
```
928:C3 (fail-closed/contrato) — B1 (três listas, CI no head), B2 (`skipped`), F3, A17-bis, os 409 no contrato
1059:- **C3 — fail-closed, contrato e suíte (`**`) — vota pela 1ª vez:** B1 (CI no head; três listas normalizadas por script, "só no head" = 0 ou cada um com causa), B2 (`skipped`), A17-bis, contrato (justificativa A30; re-check do título; os 409), registro (as 4 pendências abertas com don
```

O critério de fechamento B1 nos números do plano do objeto (CI concluída e verde no head; as três listas com "só no head" que tem de ser 0; o T2.1 à mão) e o que o relatório do dev declara no ciclo 2 (C2-D6): "só no head" N=1, o arquivo do drill de migração de eventos do Traccar, por `EBUSY: resource busy or locked` no hook de fim (limpeza de pasta temporária no Windows), o "= 0" da letra do B1 não atingido nesta máquina, e 0 pulados só no head; linha e trecho, medido por: `tr -d '\r' < C:/Users/AMP/w-san312a/docs/revisoes/SAN3/B-SAN3-12-plano.md | grep -n -i -o -E 'CI concluída e verde no head|"só no head" \(tem de ser \*\*0\*\*\)|medida à mão no descartável só migrado' | sort -t: -k2 -u; tr -d '\r' < C:/Users/AMP/w-san312a/docs/revisoes/SAN3/B-SAN3-12a-dev.md | grep -n -i -o -E 'Só no head, N=1|traccar-event-migration-drill-db\.test\.ts` \(o arquivo\)|EBUSY: resource busy or locked|O "= 0" da letra do B1 não foi atingido nesta máquina|Pulados só no head: \*\*0\*\*'`
```
903:"só no head" (tem de ser **0**)
902:CI concluída e verde no head
904:medida à mão no descartável só migrado
408:Só no head, N=1
408:traccar-event-migration-drill-db.test.ts` (o arquivo)
409:EBUSY: resource busy or locked
412:O "= 0" da letra do B1 não foi atingido nesta máquina
421:Pulados só no head: **0**
```

O diff do BLOCO, do head-base ao 1º pai do merge do ciclo 1 (`<objeto>~18..<objeto>~6`): o total de caminhos; quantos caem no PROIBIDO nomeado do plano (§7.4, os PROIBIDOS nomeados da E1.10 e o §C4: esquema do Prisma, `infra`, `.github`, `Kpis`, `mobile`, o envelope comum de erro, o gerador e o guard do censo de vias, o seed, a suíte de autoridade de papéis, a suíte de paridade de migração e o script de provisionamento) e quantos têm `traccar` no nome; e o conserto do ciclo 2 (`<objeto>~4..<objeto>~1`, 15 caminhos, medidos no delta) contra o PROIBIDO do C2.2 do plano (a unidade de trabalho financeira, o `core-saas`, o controller, as rotas, os repositórios e os tipos de cheque, os repositórios e a porta do título, `financial-entries`, `tests/helpers`, o arnês P7, `tests/fixtures`, `prisma`, `.github`, `Kpis`, `frontend`, `mobile`): 0 caminho, e os 2 de `src` são os dois do PERMITIDO; nenhum caminho com `traccar` no nome nos dois trechos, medido por: `cd C:/Users/AMP/w-san312a && echo "caminhos no diff do bloco: $(git diff --name-only 8a9fc1d8426426403f8642e263b3e932d1738716~18 8a9fc1d8426426403f8642e263b3e932d1738716~6 | wc -l)"; echo "PROIBIDO por nome (bloco): $(git diff --name-only 8a9fc1d8426426403f8642e263b3e932d1738716~18 8a9fc1d8426426403f8642e263b3e932d1738716~6 | grep -c -i -E '(schema\.prisma|http\.ts|o6r07c-census\.ts|o6r07c-census-guard\.test\.ts|seed\.ts|core-saas-role-authority\.test\.ts|permission-catalog-migration-parity\.test\.ts|provision-rbac\.ts)$')"; echo "PROIBIDO por diretório (bloco): $(git diff --name-only 8a9fc1d8426426403f8642e263b3e932d1738716~18 8a9fc1d8426426403f8642e263b3e932d1738716~6 -- infra .github Kpis mobile | wc -l)"; echo "PROIBIDO do C2.2 no conserto do ciclo 2: $(git diff --name-only 8a9fc1d8426426403f8642e263b3e932d1738716~4 8a9fc1d8426426403f8642e263b3e932d1738716~1 | grep -c -i -E '^(src[/]modules[/]financial-uow[/]|src[/]modules[/]core-saas[/]|src[/]modules[/]cheques[/](cheque\.controller|cheque\.routes|cheque\.repository|cheque-prisma\.repository|cheque\.types)\.ts$|src[/]modules[/]financial-titles[/](financial-title-prisma\.repository|financial-title\.repository|cheque-pending-reader)\.ts$|src[/]modules[/]financial-entries[/]|tests[/]helpers[/]|tests[/]financial-uow-journal-classification\.test\.ts$|tests[/]fixtures[/]|prisma[/]|\.github[/]|Kpis[/]|frontend[/]|mobile[/])')"; echo "src no conserto do ciclo 2:"; git diff --name-only 8a9fc1d8426426403f8642e263b3e932d1738716~4 8a9fc1d8426426403f8642e263b3e932d1738716~1 -- src | sed -e 's#^#C:/Users/AMP/w-san312a/#'; echo "com traccar no nome: bloco $(git diff --name-only 8a9fc1d8426426403f8642e263b3e932d1738716~18 8a9fc1d8426426403f8642e263b3e932d1738716~6 | grep -c -i traccar), ciclo 2 $(git diff --name-only 8a9fc1d8426426403f8642e263b3e932d1738716~4 8a9fc1d8426426403f8642e263b3e932d1738716~1 | grep -c -i traccar)"; git diff --name-only 8a9fc1d8426426403f8642e263b3e932d1738716~18 8a9fc1d8426426403f8642e263b3e932d1738716~6 | sed -e 's#^#C:/Users/AMP/w-san312a/#'`
```
caminhos no diff do bloco: 67
PROIBIDO por nome (bloco): 0
PROIBIDO por diretório (bloco): 0
PROIBIDO do C2.2 no conserto do ciclo 2: 0
src no conserto do ciclo 2:
C:/Users/AMP/w-san312a/src/modules/cheques/cheque.service.ts
C:/Users/AMP/w-san312a/src/modules/financial-titles/financial-title.service.ts
com traccar no nome: bloco 0, ciclo 2 0
C:/Users/AMP/w-san312a/.agents/agents/especialistas/jurado-san312a-c1-dinheiro-e-concorrencia.md
C:/Users/AMP/w-san312a/.agents/agents/especialistas/jurado-san312a-c2-permissao-e-auditoria.md
C:/Users/AMP/w-san312a/.agents/agents/especialistas/jurado-san312a-c3-regressao-escopo-contrato.md
C:/Users/AMP/w-san312a/.claude/agents/especialistas/jurado-san312a-c1-dinheiro-e-concorrencia.md
C:/Users/AMP/w-san312a/.claude/agents/especialistas/jurado-san312a-c2-permissao-e-auditoria.md
C:/Users/AMP/w-san312a/.claude/agents/especialistas/jurado-san312a-c3-regressao-escopo-contrato.md
C:/Users/AMP/w-san312a/API_CONTRACTS.md
C:/Users/AMP/w-san312a/APPROVAL_LIMITS.md
C:/Users/AMP/w-san312a/RBAC_MATRIX.md
C:/Users/AMP/w-san312a/agent-orchestration/controle/decisoes.md
C:/Users/AMP/w-san312a/agent-orchestration/controle/pendencias-indice.md
C:/Users/AMP/w-san312a/agent-orchestration/controle/pendencias.md
C:/Users/AMP/w-san312a/agent-orchestration/docs/status-geral.md
C:/Users/AMP/w-san312a/docs/revisoes/SAN3/B-SAN3-12-critica-r1.md
C:/Users/AMP/w-san312a/docs/revisoes/SAN3/B-SAN3-12-critica-r2.md
C:/Users/AMP/w-san312a/docs/revisoes/SAN3/B-SAN3-12-plano.md
C:/Users/AMP/w-san312a/docs/revisoes/SAN3/B-SAN3-12a-E1-critica.md
C:/Users/AMP/w-san312a/docs/revisoes/SAN3/B-SAN3-12a-dev.md
C:/Users/AMP/w-san312a/docs/revisoes/SAN3/PLANO_SAN3.md
C:/Users/AMP/w-san312a/prisma/migrations/sha-omitido_grant_finance_unreconcile_and_cheque_unlink_permissions/migration.sql
C:/Users/AMP/w-san312a/src/modules/cheques/cheque-prisma.repository.ts
C:/Users/AMP/w-san312a/src/modules/cheques/cheque.controller.ts
C:/Users/AMP/w-san312a/src/modules/cheques/cheque.repository.ts
C:/Users/AMP/w-san312a/src/modules/cheques/cheque.routes.ts
C:/Users/AMP/w-san312a/src/modules/cheques/cheque.service.ts
C:/Users/AMP/w-san312a/src/modules/cheques/cheque.types.ts
C:/Users/AMP/w-san312a/src/modules/core-saas/permissions/catalog.ts
C:/Users/AMP/w-san312a/src/modules/financial-entries/financial-entry-prisma.repository.ts
C:/Users/AMP/w-san312a/src/modules/financial-entries/financial-entry.controller.ts
C:/Users/AMP/w-san312a/src/modules/financial-entries/financial-entry.dto.ts
C:/Users/AMP/w-san312a/src/modules/financial-entries/financial-entry.repository.ts
C:/Users/AMP/w-san312a/src/modules/financial-entries/financial-entry.routes.ts
C:/Users/AMP/w-san312a/src/modules/financial-entries/financial-entry.service.ts
C:/Users/AMP/w-san312a/src/modules/financial-entries/financial-entry.types.ts
C:/Users/AMP/w-san312a/src/modules/financial-summary/financial-summary-prisma.repository.ts
C:/Users/AMP/w-san312a/src/modules/financial-summary/financial-summary.compute.ts
C:/Users/AMP/w-san312a/src/modules/financial-summary/financial-summary.repository.ts
C:/Users/AMP/w-san312a/src/modules/financial-summary/financial-summary.types.ts
C:/Users/AMP/w-san312a/src/modules/financial-titles/cheque-pending-reader.ts
C:/Users/AMP/w-san312a/src/modules/financial-titles/financial-title.dto.ts
C:/Users/AMP/w-san312a/src/modules/financial-titles/financial-title.service.ts
C:/Users/AMP/w-san312a/src/modules/financial-uow/financial-uow.ts
C:/Users/AMP/w-san312a/src/modules/tenant-settings/tenant-setting.service.ts
C:/Users/AMP/w-san312a/src/modules/tenant-settings/tenant-setting.validators.ts
C:/Users/AMP/w-san312a/tests/b-san3-12a-aggregate-tz-db.test.ts
C:/Users/AMP/w-san312a/tests/b-san3-12a-entries-aggregate-db.test.ts
C:/Users/AMP/w-san312a/tests/b-san3-12a-entries-aggregate.test.ts
C:/Users/AMP/w-san312a/tests/b-san3-12a-link-toctou-db.test.ts
C:/Users/AMP/w-san312a/tests/b-san3-12a-pay-link-race-db.test.ts
C:/Users/AMP/w-san312a/tests/b-san3-12a-pay-pending-cheque-db.test.ts
C:/Users/AMP/w-san312a/tests/b-san3-12a-pay-pending-cheque.test.ts
C:/Users/AMP/w-san312a/tests/b-san3-12a-permissions-migration-drill-db.test.ts
C:/Users/AMP/w-san312a/tests/b-san3-12a-reasons-census.test.ts
C:/Users/AMP/w-san312a/tests/b-san3-12a-reconcile-cas-db.test.ts
C:/Users/AMP/w-san312a/tests/b-san3-12a-unlink-title.test.ts
C:/Users/AMP/w-san312a/tests/b-san3-12a-unreconcile-policy.test.ts
C:/Users/AMP/w-san312a/tests/cheque-title-link-atomic-db.test.ts
C:/Users/AMP/w-san312a/tests/cheque-title-link.test.ts
C:/Users/AMP/w-san312a/tests/cheques.test.ts
C:/Users/AMP/w-san312a/tests/core-saas.test.ts
C:/Users/AMP/w-san312a/tests/financial-entries.test.ts
C:/Users/AMP/w-san312a/tests/financial-entry-reverse-restore-db.test.ts
C:/Users/AMP/w-san312a/tests/financial-period-closes.test.ts
C:/Users/AMP/w-san312a/tests/financial-summary.test.ts
C:/Users/AMP/w-san312a/tests/financial-uow-journal-classification.test.ts
C:/Users/AMP/w-san312a/tests/fixtures/o6r07c-classificacao-vias.json
C:/Users/AMP/w-san312a/tests/fixtures/role-catalog-contract.snapshot.json
```

A forma da migração de dados do bloco, no SQL do objeto lido pelo nome da pasta sem o carimbo e com os comentários retirados: uma linha `BEGIN;` e uma `COMMIT;`, zero instrução de esquema (`CREATE`, `ALTER`, `DROP`, `TRUNCATE`), os `INSERT` e os `ON CONFLICT` contados; e o drill do bloco existe no objeto e cita a pasta da migração pelo nome (a regra G6 da trava `migration-transaction-guard.mjs` exige isso de migração com mais de uma sentença), medido por: `F=C:/Users/AMP/w-san312a/$(git -C C:/Users/AMP/w-san312a ls-tree -r --name-only 8a9fc1d8426426403f8642e263b3e932d1738716 -- prisma/migrations | grep -i 'grant_finance_unreconcile_and_cheque_unlink_permissions'); S=$(tr -d '\r' < "$F" | sed -e 's#--.*$##' ); echo "BEGIN: $(printf '%s\n' "$S" | grep -c -i -E '^BEGIN;')"; echo "COMMIT: $(printf '%s\n' "$S" | grep -c -i -E '^COMMIT;')"; echo "instruções de esquema: $(printf '%s\n' "$S" | grep -c -i -E '\b(CREATE|ALTER|DROP|TRUNCATE)\b')"; echo "INSERT: $(printf '%s\n' "$S" | grep -c -i -E '^INSERT INTO')"; echo "ON CONFLICT: $(printf '%s\n' "$S" | grep -c -i -E 'ON CONFLICT')"; D=$(basename "$(dirname "$F")"); echo "o drill do bloco cita a pasta: $(tr -d '\r' < C:/Users/AMP/w-san312a/tests/b-san3-12a-permissions-migration-drill-db.test.ts | grep -c -i -E "$D")"`
```
BEGIN: 1
COMMIT: 1
instruções de esquema: 0
INSERT: 2
ON CONFLICT: 2
o drill do bloco cita a pasta: 1
```

O registro no objeto: a `P-SAN3-12A-PLANO-FALSIFICADO-ESCOPO` (o cabeçalho com a gravidade, a linha do índice com a gravidade e a coluna de aberta, e quantas linhas a dizem fechada; o índice diz CRÍTICA e o cabeçalho ALTA); a `P-SAN3-12-DRILL-PRISMA-SHIM-WINDOWS` (a família de ambiente Windows que o dev cita para o "só no head"); as 4 pendências novas do ciclo 2 e a `P-SAN3-20-DELETE-TITULO-COM-CHEQUE` com a nota do ciclo 2 (linha e título, cortados); e os papéis do ciclo 2 na reprovação do ciclo 1 (as linhas dos papéis, da auditoria do topo e do dev), medido por: `tr -d '\r' < C:/Users/AMP/w-san312a/agent-orchestration/controle/pendencias.md | grep -n -i -E '^## (P-SAN3-12A-PLANO-FALSIFICADO-ESCOPO|P-SAN3-12-DRILL-PRISMA-SHIM-WINDOWS|P-AUDIT-CRITICA-NA-TRANSACAO|P-TENANT-SETTING-AUDIT-SEM-VALOR|P-RBAC-MIGRATION-PARITY-ESTATICA|P-FINANCIAL-SUMMARY-SEM-SEGUNDA-ORGANIZACAO|P-SAN3-20-DELETE-TITULO-COM-CHEQUE) \(' | cut -c1-150; tr -d '\r' < C:/Users/AMP/w-san312a/agent-orchestration/controle/pendencias-indice.md | grep -i -E '^\| `P-SAN3-12A-PLANO-FALSIFICADO-ESCOPO`' | cut -d'|' -f2-5; echo "linhas que a dizem fechada: $(tr -d '\r' < C:/Users/AMP/w-san312a/agent-orchestration/controle/pendencias.md | grep -i 'P-SAN3-12A-PLANO-FALSIFICADO-ESCOPO' | grep -c -i 'fechad')"; tr -d '\r' < C:/Users/AMP/w-san312a/agent-orchestration/controle/pendencias.md | grep -n -i -E '^- \*\*ciclo 2 do B-SAN3-12a \(2026-10-26\):\*\*' | cut -c1-160 | sed -e 's#tests[/]#C:/Users/AMP/w-san312a/tests/#g'; tr -d '\r' < C:/Users/AMP/w-san312a/agent-orchestration/omega/reprovacoes/R-B-SAN3-12a-ciclo1.md | grep -n -i -o -E '^- \*\*(Papéis do ciclo 2|Auditoria e plano do topo[^*]{0,30}|Dev do ciclo 2[^*]{0,20}):\*\*'`
```
11617:## P-SAN3-20-DELETE-TITULO-COM-CHEQUE (2026-10-24) — título com cheque pendente pode ser apagado — BAIXA
11660:## P-SAN3-12A-PLANO-FALSIFICADO-ESCOPO (2026-10-25) — o PERMITIDO do 12a não cobre o que as regras do dono quebram — ALTA (processo; bloque
11722:## P-SAN3-12-DRILL-PRISMA-SHIM-WINDOWS (2026-10-25) — drills que chamam o shim bash de `node_modules/.bin/prisma` com `node` falham no Windows
11819:## P-AUDIT-CRITICA-NA-TRANSACAO (2026-10-26) — evento de auditoria `critical` gravado DEPOIS do ato, em best-effort — MÉDIA
11825:## P-TENANT-SETTING-AUDIT-SEM-VALOR (2026-10-26) — `tenant_setting.upserted` não diz o valor gravado — BAIXA
11831:## P-RBAC-MIGRATION-PARITY-ESTATICA (2026-10-26) — a guarda estática não acusa migração que concede chave a papel não autorizado — BAIX
11836:## P-FINANCIAL-SUMMARY-SEM-SEGUNDA-ORGANIZACAO (2026-10-26) — nenhum teste do resumo financeiro tem 2ª organização — BAIXA
 `P-SAN3-12A-PLANO-FALSIFICADO-ESCOPO` | 11660 | CRÍTICA | sim
linhas que a dizem fechada: 0
11621:- **ciclo 2 do B-SAN3-12a (2026-10-26):** a prova concorrente existe — `C:/Users/AMP/w-san312a/tests/b-san3-12a-title-mutation-race-db.test.ts` A29-c (barreira: o DELETE bloqu
15:- **Papéis do ciclo 2:**
19:- **Auditoria e plano do topo (2026-10-26, ~00:20 BRT):**
20:- **Dev do ciclo 2 (2026-10-26):**
```

O contrato no objeto, no que o ciclo 2 mudou: as linhas acrescentadas ao `API_CONTRACTS.md` de `<objeto>~4` ao objeto (o re-check do PATCH e do `DELETE` do título sob o lock, com o 422 `title_has_pending_cheque`; a justificativa bem-formada, com o 400 `invalid_justification`), cortadas, medido por: `cd C:/Users/AMP/w-san312a && git diff -U0 8a9fc1d8426426403f8642e263b3e932d1738716~4 8a9fc1d8426426403f8642e263b3e932d1738716 -- API_CONTRACTS.md | grep -i -E '^\+[^+]' | cut -c1-170`
```
+  - `PATCH /financial-titles/:id` que muda `amount` e `DELETE /financial-titles/:id` → `422 title_has_pending_cheque`. O
+    fast-fail não abre transação; a escrita roda numa transação que trava o período (SHARED) e a linha do título e relê o
+    conjunto pendente SOB o lock (re-check): um vínculo que commita entre o fast-fail e a escrita também recusa (ciclo 2, A29).
+  `{ justification }` (10–500 caracteres após o trim, e texto bem-formado: sem U+0000, sem surrogate isolado, sem controle
+  C0 salvo TAB/LF/CR, sem DEL — senão `400 invalid_justification`; Unicode válido é gravado verbatim). `200 { data: <cheque com titleId null>, warning? }` — `warn
```

Memória de commit livre em GB (a P8 (c) exige pelo menos 4 antes de lançar agente), os trabalhos Docker vivos fora da base `erp-*` (o teto é 2 contando o da cadeira) e o disco livre em `C:` (a ordem do orquestrador: PARE abaixo de 7 GB), no instante da redação: a cadeira mede de novo antes de subir, medido por: `powershell.exe -NoProfile -Command '$o=Get-CimInstance Win32_PerfFormattedData_PerfOS_Memory; [math]::Round(($o.CommitLimit-$o.CommittedBytes)/1GB,2)'; docker ps --format '{{.Names}}' | grep -v -i -E '^erp-' | sed -E 's#-(pg|redis|run|net)$##' | sort -u; echo "trabalhos fora de erp: $(docker ps --format '{{.Names}}' | grep -v -i -E '^erp-' | sed -E 's#-(pg|redis|run|net)$##' | sort -u | wc -l)"; df -h /c | tail -1 | awk '{print "livre em C: " $4}'`
```
12,95
dev-san322
trabalhos fora de erp: 1
livre em C: 12G
```

O modelo de mandato do §C7.7 do contrato (P1, P2, P4, P3, P7), verbatim no objeto, medido por: `tr -d '\r' < C:/Users/AMP/w-san312a/CLAUDE.md | grep -n -i -A7 'Após CADA item: apense a <cadeira>-evidencia.md'`
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

Você é `jurado-san312a-c3-opus` (o orquestrador confirma no disparo), a C3, que vota pela PRIMEIRA vez nesta junta (no ciclo 1 ela foi segurada e não votou nem mediu); executor Claude Opus (subagente genérico, corpo lido do blob do objeto), modelo **Claude Opus**, nível menor DECLARADO (§C7.6), ou Codex GPT-5.6 Sol se o orquestrador o declarar no disparo; o seu corpo canônico é `C:/Users/AMP/w-san312a/.claude/agents/especialistas/jurado-san312a-c3-regressao-escopo-contrato.md`, carregado **do blob do objeto** (o worktree está no objeto, medido acima; §A7). O corpo foi escrito para o ciclo 1: onde ele divergir deste mandato quanto a objeto, ciclo, itens, diretório de votos, régua, bases ou inelegíveis, vale este mandato. Na primeira linha de `c3-evidencia.md`, declare executor efetivo, modelo, nível, objeto, `mandato_md5` deste arquivo (CR retirado antes do md5) e o veredito IDENTICO/DIVERGE do corpo que você carregou contra o blob do objeto, EOL-neutro. **Opus esgotado: PARE sem votar** e registre onde parou (§C7.6-bis); o sucessor de queda é outra identidade declarada. Inelegíveis por nome: `planejador-mestre` (Fable, plano v3), `planejador-san312-e1-fable` (E1 e E1-bis), `planejador-san312a-c2-fable` (auditoria e plano do ciclo 2), `crit-san312-pro`, `crit-san312-opus-r2`, `crit-san312-pro-r2`, `crit-san3-12-r2-pro`, `crit-san312a-e1-opus` (achou B1 e B2, os critérios que você mede), `dev-san312a-opus`, `dev-san312a-c2-opus` (dev do ciclo 2, autor das três listas que você julga), `fab-red-san312a-opus` (fabricou o seu corpo), `redator-san312a-r2-opus`, `fab-red-san312a-r3-opus`, `redator-san312a-c2-opus` (redigiu este mandato e executou as medições dele), o orquestrador, `inspetor-san312a-opus`, `jurado-san312a-c2-opus` e `jurado-san312a-c4-opus` (os achadores do ciclo 1), e as outras identidades deste ciclo, `inspetor-san312a-c2-opus`, `jurado-san312a-c1-opus`, `jurado-san312a-c2b-opus` e `jurado-san312a-c4b-opus`; se o seu nome coincidir, pare. Monocultura declarada: o dev do ciclo 2 e as identidades desta junta rodam em Claude Opus, salvo a cadeira que o orquestrador declarar em Codex. O plano v3 com E1, E1-bis e o ciclo 2, o relatório do dev (E10 a E14 e a seção "Ciclo 2", inclusive as três listas e a causa EBUSY) e as críticas são **A RE-VERIFICAR**, derruba com: `head -1 C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a-ciclo2/c3-evidencia.md | grep -i -E 'executor|Opus|Sol|mandato_md5|objeto|IDENTICO|DIVERGE'`

A legalidade vem antes do mérito: parecer `insp-san312a-c2-parecer.md` do inspetor `inspetor-san312a-c2-opus`, no diretório deste ciclo, com LIBERADO ou LIBERADO COM RESSALVA nomeando você, o seu executor, os seus dois worktrees, os seus containers e a sua vez (uma cadeira por vez); o objeto é o head do PR 459 (medido acima), com todos os check-runs concluídos (head que andou bloqueia o início). Régua: bloco de DINHEIRO e de permissão, **unanimidade das 4 cadeiras do ciclo 2 com veto** (C1, C2b, C3 e C4b; §C7 item 8(1)); **ciclo 2**: todo `bloqueia` com escopo `dentro-do-bloco` ainda reprova, grave ou não (§C7 item 8(2)); você vota pela primeira vez (não há voto seu a carregar, §C7 item 9); a base de toda comparação de escopo e de suíte é o head-base do bloco (`<objeto>~18` pelo 1º pai; NÃO a merge-base do `mandato-refs.sh`, que é a ponta da `main`), nunca a `main` de agora, e a lista do dev usou outra base (a `main` do ciclo 1, `<objeto>~5^2`): diga se isso muda alguma lista; o diff do BLOCO é `<objeto>~18..<objeto>~6`, o conserto do ciclo 2 é `<objeto>~4..<objeto>~1`, e os dois merges se julgam à parte, pelo conteúdo próprio (medido acima); um teste financeiro que passa a falhar ou a ser pulado é `grave: dinheiro` até prova de causa. Todo achado declara gravidade, classe, escopo, N e forma; `pre-existente` exige evidência de data ou origem (a frequência igual na base conta) e pendência com dono (§C7.1-ter(a)); "não consigo medir" item seu é REPROVADO; não proponha correção (§C7.4-bis), não reabra as decisões do dono nem a E1, a E1-bis e o plano do ciclo 2, não cobre KPI (o merge da `main` trouxe só `Kpis`, que não é matéria da junta), não meça matéria de C1, C2b ou C4b, não leia votos e evidências de outras cadeiras de nenhum ciclo; o voto declara `arquivos_medidos` (§C7 item 9 (0)) POR ITEM, com `**` no item 1 (ele roda `npm test`), derruba com: `grep -i -E 'legalidade|A RE-VERIFICAR|gravidade|classe|escopo|arquivos_medidos|ciclo 2|primeira vez|head-base|4 cadeiras' C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a-ciclo2/c3-voto.json`

Terreno: DOIS worktrees exclusivos, detached, `C:/Users/AMP/j12a2-c3-wt` no objeto e `C:/Users/AMP/j12a2-c3-wtb` no head-base do bloco, cada um com `npm ci` próprio (e `npx prisma generate`, sem o qual o lado sem cliente gerado falha por import, como o dev mediu) e zero junction de `node_modules` (§C7.1-ter(c)), removidos só por `git worktree remove --force` depois de conferir que nenhum processo os usa; dois `npm ci` custam disco: meça antes de cada um e PARE abaixo de 7 GB (medido acima). Postgres 16 `j12a2-c3-pg` e Redis 7 `j12a2-c3-redis` próprios, só em `127.0.0.1`, portas altas testadas antes (candidatas 47833 e 47834), senha aleatória só por ambiente; bancos frescos por lado `j12a2_c3_base` e `j12a2_c3_obj`; `DATABASE_URL`, `REDIS_URL` (o seu Redis) e `CORE_SAAS_PERSISTENCE` iguais nos dois lados, como prefixo de **todo** comando `node`/`npm`; se um drill cair pelo shim do `.bin/prisma` no Windows ou por `EBUSY`, um container Node Linux seu com o mesmo prefixo. Antes de subir: memória de commit livre ≥ 4 GB (P8 (c)), no máximo 2 trabalhos Docker na máquina contando o seu; faltando, espere. Uma cadeira por vez. Nunca a base viva (`erp-postgres`, `erp-redis`, `erp-postgres-alt`), nem 5432, 6379, 3000, 5173, 5050, 8899, 55432, 55412, 55413; nunca `prune` nem container alheio. Mutação só no worktree do objeto, uma por vez, âncora única com prova de aplicação (CRLF incluso), restauro provado por `git hash-object` = blob do objeto; nunca medir conteúdo de commit com `git archive` mais `tar` sob `core.autocrlf=true`; scripts, normalizador e sondas numa pasta sua `C:/Users/AMP/erp-pausa-2026-10-03/j12a2-c3/`, para que a evidência seja re-executável, derruba com: `grep -i -E 'j12a2-c3-wt|j12a2-c3-wtb|j12a2-c3-pg|j12a2-c3-redis|j12a2_c3_|127\.0\.0\.1|junction|commit livre|4 GB|7 GB|erp-|5432|6379|hash-object|head-base|shim|EBUSY|teardown' C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a-ciclo2/c3-evidencia.md`

Item 1 de 3 (B1 e B2 — a suíte base × objeto com as três listas, o "só no head" do drill do Traccar A JULGAR, a CI no objeto e o `skipped`): os check-runs do objeto (medidos acima) e, no log do job `backend` do objeto, a linha de resumo do runner, o desfecho do arquivo do drill de migração de eventos do Traccar e o `ok` ou `skip` de cada `-db` do bloco, inclusive o `-db` novo de corrida do ciclo 2 (eles não estão nas `SUITES` do `backend-postgres`, medido acima); `npm test` na forma do job `backend` da CI nos seus dois worktrees, com banco fresco migrado em cada lado e o seu Redis, normalizado por script SEU (chave = arquivo + nome do caso, lida do TAP, sem prefixo de worktree), com as três listas e N — só no objeto, só na base, nos dois lados — e a causa de cada item lida da mensagem do TAP, mais os totais dos dois lados; os casos cujo arquivo está no diff `<objeto>~18..<objeto>^2` (a `main` que entrou pelos dois merges, medido acima) se publicam à parte, com N, e não contam no "só no objeto" do bloco; o "só no head = 1" do dev (`EBUSY` no hook de fim, medido acima) julgado por comando: o diff do bloco e o do ciclo 2 tocam o caminho dele (os imports gerados por script cruzados com os dois diffs; medido acima: 0 caminho com `traccar` no nome), a frequência do `EBUSY` em N ≥ 5 rodadas isoladas no objeto e N ≥ 5 na base no Windows, e o desfecho no Linux (o job `backend` da CI e um container seu) — do bloco (`dentro-do-bloco`) ou ambiente pré-existente (`pre-existente`, com evidência de data ou origem e dono: a `P-SAN3-12-DRILL-PRISMA-SHIM-WINDOWS` cobre essa forma ou é preciso pendência nova?); e diga se o critério "só no head = 0" do B1 está cumprido na SUA lista, e com que forma de terreno. B2: `tests · pass · fail · skipped` de todo passo, `skipped` do objeto contido no da base por nome, nenhum passo com `pass 0` e `skipped ≥ 1`. Controles: uma falha sua num teste financeiro que o bloco não toca aparece em "só no objeto" com a causa, e um nome com o caminho absoluto do worktree não se perde no seu normalizador; no head-base, o censo de `reason` copiado do objeto fica vermelho pela asserção, derruba com: `grep -i -E 'Item 1|B1|B2|só no objeto|só na base|nos dois lados|Traccar|EBUSY|frequência|Linux|skipped|backend|normaliz|causa|DRILL-PRISMA-SHIM|vermelho|head-base' C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a-ciclo2/c3-evidencia.md`

Item 2 de 3 (escopo — o bloco contra o §7.1, a E1.10 e a E1b.6; o conserto do ciclo 2 contra o C2.2; os dois merges; e a migração de dados, A22): o diff do bloco (medido acima, com a lista inteira) contra a lista PERMITIDA extraída por script do §7.1, da E1.10 e da E1b.6 do plano no objeto (publique a lista extraída e o método) e contra a PROIBIDA (medido acima); o conserto do ciclo 2 (15 caminhos, medidos acima) contra o PERMITIDO e o PROIBIDO do C2.2, extraídos por script, e os hunks delimitados por PARSE: no serviço de títulos só `update`, `delete` e `assertNoPendingCheque` (mais os imports que eles exigem; o plano não os nomeia: gradue), no de cheques só `parseUnlinkJustification` e a mensagem dela; o `-db` novo de corrida e os 5 testes tocados só com casos novos, nenhum caso apagado nos arquivos de teste antigos, base × objeto; `git diff --check` do diff do bloco, do conserto do ciclo 2 e dos dois merges; a fixture de vias (F3) regenerada pelo gerador num worktree seu igual à do objeto e com exatamente as 3 entradas novas contra a da base, e o guard do censo no objeto; os dois merges sem conteúdo próprio (medido acima, re-meça por comando seu, inclusive a contagem das linhas que saem dos 3 de append no do ciclo 1, sem confiar na deste mandato) e o índice de pendências igual ao gerador do objeto rodado numa pasta sua; e a migração de dados do bloco (a forma medida acima; a trava `migration-transaction-guard.mjs` executada por você no objeto, regras G1 a G7, com o caso do `C:/Users/AMP/w-san312a/tests/migration-transaction-guard.test.ts` verde e com vermelho-controle numa cópia sua sem o `BEGIN;`; `C:/Users/AMP/w-san312a/tests/b-san3-12a-permissions-migration-drill-db.test.ts` e o `permission-catalog-db-parity` com `RBAC_DB_PARITY=1` no seu Postgres, `skipped = 0`; o corpo aplicado de novo converge e o rollback do runbook do rodapé tira só as 2 chaves). Mutações: um caminho fabricado no diff do ciclo 2 que o seu laço tem de acusar, a classe do `unlink-title` editada à mão na fixture (vermelho no T14) e o `INSERT INTO role_permissions` apagado (db-parity e drill vermelhos). Controles: a fixture da base contra o gerador do objeto acusa as 3 rotas; o laço rodado com o PERMITIDO sem as ampliações da E1.10 acusa os caminhos que a E1 fez entrar, derruba com: `grep -i -E 'Item 2|PERMITIDO|PROIBIDO|C2\.2|E1\.10|E1b\.6|hunk|parse|parseUnlinkJustification|assertNoPendingCheque|caso apagado|diff --check|vias|census|merge-tree|gerar-indice|migration-transaction-guard|G6|drill|db-parity|rollback|A22|vermelho|head-base' C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a-ciclo2/c3-evidencia.md`

Item 3 de 3 (registro e contrato — a `P-SAN3-12A-PLANO-FALSIFICADO-ESCOPO` fecha?, as pendências do ciclo 2 e o contrato do que o ciclo 2 mudou; A17-bis): a pendência (medida acima: o cabeçalho diz ALTA, o índice CRÍTICA, e nenhuma linha a diz fechada) — os três critérios do B1 estão cumpridos no objeto pela sua medição do item 1 (CI concluída e verde no head; "só no head" = 0 ou cada um com causa de ambiente provada; o T2.1 à mão)? Ela FECHA neste merge, fecha com ressalva nomeada, ou fica aberta com dono? O registro a declara fechada ou troca o critério? A divergência de gravidade entre a entrada e o índice é do gerador ou do texto?; as 4 pendências novas do ciclo 2 (medidas acima) existem com `escopo: pre-existente`, evidência de data ou origem e dono; a `P-SAN3-20-DELETE-TITULO-COM-CHEQUE` traz o critério de fechamento (A29-c e A29-g) pronto para o porteiro, sem se declarar fechada antes do merge; os papéis do ciclo 2 (achadores, topo, dev) estão na reprovação do ciclo 1 com nome, modelo e identidade distinta (medido acima), e o dev não acumula papel; o contrato: o censo de `reason` do bloco (A17-bis) e um censo SEU, por script, cruzado com o `API_CONTRACTS.md` e com a lista congelada de pré-existentes, os novos do bloco todos no contrato, e o que o ciclo 2 acrescentou (medido acima: o re-check do título com 422 `title_has_pending_cheque`; a justificativa bem-formada com 400 `invalid_justification`) dizendo exatamente o que o código faz — inclusive o status do `invalid_title_reference` (400 no repositório; o A29-d do plano diz 422), o D1 e os 409 do A27. Mutações A17bis e um pré-existente documentado sem sair da lista. Controle: um `reason` fabricado por você no código, fora do contrato, é acusado pelo seu censo, derruba com: `grep -i -E 'Item 3|P-SAN3-12A-PLANO-FALSIFICADO-ESCOPO|fecha|ALTA|CRÍTICA|P-AUDIT-CRITICA-NA-TRANSACAO|P-SAN3-20-DELETE-TITULO-COM-CHEQUE|papéis|API_CONTRACTS|reason|A17bis|title_has_pending_cheque|invalid_justification|invalid_title_reference|409|vermelho' C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a-ciclo2/c3-evidencia.md`

Protocolo P1/P2/P3/P4/P7 do §C7.7, verbatim no bloco colado acima, com `<cadeira>` = `c3`: evidência em `c3-evidencia.md` após CADA item; `c3-voto.json` nasce esqueleto com os três itens EM APURAÇÃO e o campo `arquivos_medidos` por item, cada item gravado ao ser medido, e fecha antes da mensagem final de 1 linha; sucessor de identidade nova re-executa os comandos registrados e só então mede a cauda (log parcial de `npm test` não vale como lista); três itens exatos; PAUSA grava head, feito, falta, próximo comando e arquivos meio-escritos e para. Queda vai a `00-quedas.md` do diretório deste ciclo (P6, pelo orquestrador); uma cadeira por vez (ordem do dono, mais estreita que a P5). Únicos outputs no repositório: `c3-evidencia.md` e `c3-voto.json` em `C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a-ciclo2/`; nunca commit, derruba com: `test -f C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a-ciclo2/c3-voto.json`

## MEDIDO

Pré-voo deste mandato com as ferramentas copiadas sem mudança para a pasta do redator deste ciclo `C:/Users/AMP/erp-pausa-2026-10-03/redator-san312a-c2/` (diferença contra o ramo das ferramentas medida acima), executado com o cwd no worktree do objeto; o redator do ciclo 2 é `redator-san312a-c2-opus` (Claude Opus 5.5, nível menor declarado, identidade nova, não vota), que adaptou ao objeto do ciclo 2 os geradores r3 do ciclo 1 (`fab-red-san312a-r3-opus`, sobre os de `redator-san312a-r2-opus` e `fab-red-san312a-opus`) e executou cada comando deste mandato pelo gerador `C:/Users/AMP/erp-pausa-2026-10-03/redator-san312a-c2/gerar-c3.sh`, medido por: `cd C:/Users/AMP/w-san312a && MANDATO_REFS=C:/Users/AMP/erp-pausa-2026-10-03/redator-san312a-c2/mandato-refs.sh bash C:/Users/AMP/erp-pausa-2026-10-03/redator-san312a-c2/mandato-preflight.sh C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a-ciclo2/00-mandatos/cadeira-c3.md 459 2>&1; echo ec=$?`
```
COLAGEM    l.6-20: refs do PR #459 confere com a saida atual

PRE-VOO OK — C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a-ciclo2/00-mandatos/cadeira-c3.md
ec=0
```
