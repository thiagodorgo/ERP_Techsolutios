# Mandato — Cadeira C1 — B-SAN3-12a (junta de DINHEIRO, ciclo 2)

## MEDIDO

Estado do PR 459 no instante da redação, pela ferramenta `mandato-refs.sh` copiada sem mudança para a pasta própria do redator deste ciclo `C:/Users/AMP/erp-pausa-2026-10-03/redator-san312a-c2/`, com o cwd no worktree do objeto (o head do PR, a merge-base, os check-runs, e nenhuma ata ainda), medido por: `cd C:/Users/AMP/w-san312a && bash C:/Users/AMP/erp-pausa-2026-10-03/redator-san312a-c2/mandato-refs.sh 459`
```
# refs do PR #459 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato
# gerado em: 2026-10-26T05:27Z · repo: thiagodorgo/ERP_Techsolutios

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

O corpo desta cadeira existe no objeto e, descontados o frontmatter e o bloco de adaptação Codex do espelho, é IDÊNTICO entre os dois espelhos (comparação EOL-neutra; o arquivo inteiro difere por construção do espelho, e por isso não se publica hash); o número de linhas de cada espelho está na saída, e nenhum commit do ciclo 2 o tocou (a última linha conta os commits que o tocam até o objeto e até o objeto do ciclo 1, `<objeto>~4`), medido por: `cd C:/Users/AMP/w-san312a && diff <(tr -d '\r' < C:/Users/AMP/w-san312a/.claude/agents/especialistas/jurado-san312a-c1-dinheiro-e-concorrencia.md | awk 'f; $0=="---"{n++; if(n==2) f=1}' | sed '/^$/d') <(tr -d '\r' < C:/Users/AMP/w-san312a/.agents/agents/especialistas/jurado-san312a-c1-dinheiro-e-concorrencia.md | awk 'f; $0=="---"{n++; if(n==2) f=1}' | awk 'index($0,"Papel para o Codex"){s=1} s&&$0==""{s=0; next} !s' | sed '/^$/d') >/dev/null && echo 'IDENTICO corpo c1-dinheiro-e-concorrencia' || echo 'DIVERGE corpo c1-dinheiro-e-concorrencia'; wc -l < C:/Users/AMP/w-san312a/.claude/agents/especialistas/jurado-san312a-c1-dinheiro-e-concorrencia.md; wc -l < C:/Users/AMP/w-san312a/.agents/agents/especialistas/jurado-san312a-c1-dinheiro-e-concorrencia.md; echo "commits que tocam o corpo: até o objeto $(git rev-list --count 8a9fc1d8426426403f8642e263b3e932d1738716 -- C:/Users/AMP/w-san312a/.claude/agents/especialistas/jurado-san312a-c1-dinheiro-e-concorrencia.md), até o objeto do ciclo 1 $(git rev-list --count 8a9fc1d8426426403f8642e263b3e932d1738716~4 -- C:/Users/AMP/w-san312a/.claude/agents/especialistas/jurado-san312a-c1-dinheiro-e-concorrencia.md)"`
```
IDENTICO corpo c1-dinheiro-e-concorrencia
413
419
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

Ciclo 2, pelo §C7 item 9: no diretório de votos do ciclo 1 (`B-SAN3-12a`) há voto e evidência só da C2 e da C4, os dois `REPROVADO` (o campo `voto` de cada JSON), e nenhum da C1 nem da C3, que o orquestrador segurou; o `arquivos_medidos` dos dois votos alcança o que o conserto tocou (o serviço de cheques e o de títulos); no diretório deste ciclo 2 (`B-SAN3-12a-ciclo2`) só há o diretório dos mandatos. Logo a C2 e a C4 são REFEITAS (regra (3)), com identidade nova (C2b e C4b), a C1 e a C3 votam pela primeira vez, e não há voto verde a carregar nem a revalidar; a C1 vota pela primeira vez, no objeto do ciclo 2, medido por: `ls C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a | sed -e 's#^#C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a/#'; echo "votos do ciclo 1 por cadeira: $(ls C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a | grep -i -E '^c[1234]-voto\.json$' | tr '\n' ' ')"; node -e 'const fs=require("fs");for(const c of ["c2","c4"]){const j=JSON.parse(fs.readFileSync("C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a/"+c+"-voto.json","utf8").replace(String.fromCharCode(65279),""));const a=JSON.stringify(j.arquivos_medidos)+JSON.stringify((j.itens||[]).map(i=>i.arquivos_medidos||""));console.log(c+": voto="+j.voto+" alcança cheque.service.ts="+a.includes("cheque.service.ts")+" alcança financial-title(s)="+a.includes("financial-title"))}'; ls C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a-ciclo2 | sed -e 's#^#C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a-ciclo2/#'`
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

O que a E1-bis (§E1b.6) diz que a C1 mede, e o que o plano do ciclo 2 acrescenta à C1 (a linha da C1 no C2.5: os itens do ciclo 1 mais a ordem de travas e a ausência de deadlock do A29, sem duplicar a C4, que mede o desfecho; ≤ 3 itens), linha e começo de cada; esta composição põe a ordem de travas do A29 no item 3, junto da D1 (divergência de arranjo registrada, §A2; vale este mandato), medido por: `tr -d '\r' < C:/Users/AMP/w-san312a/docs/revisoes/SAN3/B-SAN3-12-plano.md | grep -n -i -o -E 'C1 \(DBA/dinheiro\) — A27-a/b/c[^;]{0,90}'; tr -d '\r' < C:/Users/AMP/w-san312a/docs/revisoes/SAN3/B-SAN3-12-plano.md | grep -n -i -E '^- \*\*C1 — DBA e dinheiro — vota pela 1ª vez' | cut -c1-330`
```
928:C1 (DBA/dinheiro) — A27-a/b/c com `pg_locks`/barreira e A28 (M2 nos dois lados), além do que a E1.10 já lhe dava
1058:- **C1 — DBA e dinheiro — vota pela 1ª vez** (o orquestrador a segurou no ciclo 1 porque o conserto toca o escopo dela): o mandato do ciclo 1 (A27-a/b/c com `pg_locks`/barreira, A28 com M2 nos dois lados, A4/A4-bis/A5-bis) **+ a ordem de travas e a ausência de deadlock do A29** (competência de DBA; sem duplicar a C4,
```

A ordem de travas do A29: o plano do ciclo 2 escreve "período (SHARED) → título (`FOR UPDATE`) → cheques (leitura, sem trava)" no passo 6 do E2.1 (linha e trecho), o serviço de títulos do objeto faz, no `update` e no `delete`, a trava do período ANTES do `findByIdForUpdate` e o re-check depois (linhas), o `payTitle` dos lançamentos faz o mesmo (período antes da trava do título; linhas), e o dev declara essa leitura (o passo 2 do plano listava o `findByIdForUpdate` antes da trava do período), linha cortada, medido por: `tr -d '\r' < C:/Users/AMP/w-san312a/docs/revisoes/SAN3/B-SAN3-12-plano.md | grep -n -i -o -E '6\. \*\*Ordem de travas:\*\*[^.]{0,120}'; tr -d '\r' < C:/Users/AMP/w-san312a/src/modules/financial-titles/financial-title.service.ts | grep -n -i -E 'ctx\.assertPeriodOpenShared\(current\.competencia|ctx\.titles\.findByIdForUpdate\(|assertNoPendingCheque\(ctx\.cheques' | cut -c1-120; tr -d '\r' < C:/Users/AMP/w-san312a/src/modules/financial-entries/financial-entry.service.ts | grep -n -i -E 'async payTitle\(|ctx\.assertPeriodOpenShared\(competencia|ctx\.titles\.findByIdForUpdate\(' | cut -c1-110; tr -d '\r' < C:/Users/AMP/w-san312a/docs/revisoes/SAN3/B-SAN3-12a-dev.md | grep -n -i -E '\*\*Ordem período → título\.\*\*' | cut -c1-230`
```
975:6. **Ordem de travas:** período (leitura/SHARED) → título (`FOR UPDATE`) → cheques (leitura, sem trava)
307:      await ctx.assertPeriodOpenShared(current.competencia, periodClosedError);
308:      const locked = await ctx.titles.findByIdForUpdate(actor.tenantId, current.id);
311:        await assertNoPendingCheque(ctx.cheques, actor.tenantId, locked.id);
416:      await ctx.assertPeriodOpenShared(current.competencia, periodClosedError);
417:      const locked = await ctx.titles.findByIdForUpdate(actor.tenantId, current.id);
419:      await assertNoPendingCheque(ctx.cheques, actor.tenantId, locked.id);
479:      await ctx.assertPeriodOpenShared(competencia, periodClosedError);
652:  async payTitle(actor: FinancialEntryActorContext, financialTitleId: string, body: RawRecord): Promise<Fi
687:      await ctx.assertPeriodOpenShared(competencia, periodClosedError);
692:      await ctx.titles.findByIdForUpdate(actor.tenantId, title.id);
725:      const locked = await ctx.titles.findByIdForUpdate(actor.tenantId, title.id);
325:  1. **Ordem período → título.** O passo 2 do E2.1 lista `findByIdForUpdate` → `assertPeriodOpenShared(locked.competencia)`. O passo 6 e o R2 dizem
```

Os arquivos de teste que medem os três itens existem no objeto (a lista dos testes do bloco, inclusive o `-db` novo de corrida do ciclo 2, e dos dois do #456 reescritos pela E1, pela busca do git no worktree que está no objeto), e o teste de barreira do A27 pula DECLARANDO quando falta `DATABASE_URL` (a linha do `skip`); o `sed` põe o prefixo do worktree, medido por: `cd C:/Users/AMP/w-san312a && git ls-tree -r --name-only 8a9fc1d8426426403f8642e263b3e932d1738716 -- tests | grep -i -E 'b-san3-12a-|cheque-title-link' | sed -e 's#^#C:/Users/AMP/w-san312a/#'; tr -d '\r' < C:/Users/AMP/w-san312a/tests/b-san3-12a-link-toctou-db.test.ts | grep -n -i -o -E 'process\.env\.DATABASE_URL|skip: "[^"]{0,60}'`
```
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
C:/Users/AMP/w-san312a/tests/b-san3-12a-title-mutation-race-db.test.ts
C:/Users/AMP/w-san312a/tests/b-san3-12a-unlink-title.test.ts
C:/Users/AMP/w-san312a/tests/b-san3-12a-unreconcile-policy.test.ts
C:/Users/AMP/w-san312a/tests/cheque-title-link-atomic-db.test.ts
C:/Users/AMP/w-san312a/tests/cheque-title-link-migration-drill-db.test.ts
C:/Users/AMP/w-san312a/tests/cheque-title-link.test.ts
25:process.env.DATABASE_URL
29:skip: "Defina DATABASE_URL e aplique as migrations.
34:process.env.DATABASE_URL
```

No `ci.yml` do objeto os jobs `backend` e `backend-postgres` definem `DATABASE_URL`; nenhuma linha cita os testes `b-san3-12a-*` (contagem 0), e as que citam `cheque-title-link` são as duas `SUITES` do `backend-postgres` com o `-atomic-db` e o drill do #456 (impressas com o prefixo do worktree): os `-db` deste bloco não estão nas `SUITES` do `backend-postgres`; onde a CI os executa, e se pulam, é da cadeira medir no log, medido por: `tr -d '\r' < C:/Users/AMP/w-san312a/.github/workflows/ci.yml | grep -n -i -E '^  backend(-postgres)?:|DATABASE_URL:'; echo "linhas do ci.yml com b-san3-12a: $(tr -d '\r' < C:/Users/AMP/w-san312a/.github/workflows/ci.yml | grep -c -i 'b-san3-12a')"; tr -d '\r' < C:/Users/AMP/w-san312a/.github/workflows/ci.yml | grep -n -i 'cheque-title-link' | sed -e 's#tests[/]#C:/Users/AMP/w-san312a/tests/#'`
```
31:  backend:
40:      DATABASE_URL: postgresql://postgres:postgres@localhost:5432/erp_techsolutions?schema=public
131:  backend-postgres:
134:      DATABASE_URL: postgresql://postgres:postgres@localhost:5432/erp_techsolutions?schema=public
linhas do ci.yml com b-san3-12a: 0
269:          SUITES="$SUITES C:/Users/AMP/w-san312a/tests/cheque-title-link-atomic-db.test.ts"
271:          SUITES="$SUITES C:/Users/AMP/w-san312a/tests/cheque-title-link-migration-drill-db.test.ts"
```

A conferência obrigatória da E1-bis, pela busca textual no serviço de cheques do objeto: as linhas que passam o título lido (`expectedTitleId`, o `casOnTitle` do `flipOnly`) e as chamadas a `throwChequeWriteConflict` (o 1º vínculo, o `delete` e o `cancel` passam o título; o conflito relê e distingue 404/422/409, segundo o dev); o ciclo 2 tocou nesse arquivo só a validação da justificativa (o diff dele de `<objeto>~4` ao objeto, contado em linhas e com os nomes de função dos hunks), medido por: `cd C:/Users/AMP/w-san312a && tr -d '\r' < C:/Users/AMP/w-san312a/src/modules/cheques/cheque.service.ts | grep -n -i -E 'expectedTitleId|casOnTitle|throwChequeWriteConflict\(' | cut -c1-170; git diff --numstat 8a9fc1d8426426403f8642e263b3e932d1738716~4 8a9fc1d8426426403f8642e263b3e932d1738716 -- C:/Users/AMP/w-san312a/src/modules/cheques/cheque.service.ts | cut -f1,2; git diff -U0 8a9fc1d8426426403f8642e263b3e932d1738716~4 8a9fc1d8426426403f8642e263b3e932d1738716 -- C:/Users/AMP/w-san312a/src/modules/cheques/cheque.service.ts | grep -i -E '^@@' | sed -E 's#^@@ [^@]*@@ ?##' | cut -c1-100`
```
238:      if (!updated) return this.throwChequeWriteConflict(actor, current.id);
248:      const updated = await ctx.cheques.update({ ...input, expectedTitleId: current.titleId ?? null });
249:      if (!updated) return this.throwChequeWriteConflict(actor, current.id, current.titleId);
266:      expectedTitleId: current.titleId,
284:    const removed = await this.repository.softDelete(actor.tenantId, current.id, actor.userId, { expectedTitleId: current.titleId ?? null });
285:    if (!removed) return this.throwChequeWriteConflict(actor, current.id, current.titleId);
474:    casOnTitle = false,
485:      ...(casOnTitle ? { expectedTitleId: current.titleId ?? null } : {}),
559:  private async throwChequeWriteConflict(actor: ChequeActorContext, chequeId: string, readTitleId?: string): Promise<never> {
16	0
const JUSTIFICATION_MAX = 500;
export function parseUnlinkJustification(value: unknown): string {
```

Memória de commit livre em GB (a P8 (c) exige pelo menos 4 antes de lançar agente), os trabalhos Docker vivos fora da base `erp-*` (o teto é 2 contando o da cadeira) e o disco livre em `C:` (a ordem do orquestrador: PARE abaixo de 7 GB), no instante da redação: a cadeira mede de novo antes de subir, medido por: `powershell.exe -NoProfile -Command '$o=Get-CimInstance Win32_PerfFormattedData_PerfOS_Memory; [math]::Round(($o.CommitLimit-$o.CommittedBytes)/1GB,2)'; docker ps --format '{{.Names}}' | grep -v -i -E '^erp-' | sed -E 's#-(pg|redis|run|net)$##' | sort -u; echo "trabalhos fora de erp: $(docker ps --format '{{.Names}}' | grep -v -i -E '^erp-' | sed -E 's#-(pg|redis|run|net)$##' | sort -u | wc -l)"; df -h /c | tail -1 | awk '{print "livre em C: " $4}'`
```
13,04
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

Você é `jurado-san312a-c1-opus` (o orquestrador confirma no disparo), a C1, que vota pela PRIMEIRA vez nesta junta (no ciclo 1 ela foi segurada e não votou nem mediu); executor Claude Opus (subagente genérico, corpo lido do blob do objeto), modelo **Claude Opus**, nível menor DECLARADO (§C7.6), ou Codex GPT-5.6 Sol se o orquestrador o declarar no disparo; o seu corpo canônico é `C:/Users/AMP/w-san312a/.claude/agents/especialistas/jurado-san312a-c1-dinheiro-e-concorrencia.md`, carregado **do blob do objeto** (o worktree está no objeto, medido acima; não do disco de outra sessão, §A7). O corpo foi escrito para o ciclo 1: onde ele divergir deste mandato quanto a objeto, ciclo, itens, diretório de votos, régua, bases ou inelegíveis, vale este mandato. Na primeira linha de `c1-evidencia.md`, declare executor efetivo, modelo, nível, objeto, `mandato_md5` deste arquivo (CR retirado antes do md5) e o veredito IDENTICO/DIVERGE do corpo que você carregou contra o blob do objeto, EOL-neutro. **Opus esgotado: PARE sem votar** e registre onde parou (§C7.6-bis); o sucessor de queda é outra identidade declarada. Inelegíveis por nome: `planejador-mestre` (Fable, plano v3), `planejador-san312-e1-fable` (E1 e E1-bis), `planejador-san312a-c2-fable` (auditoria e plano do ciclo 2), `crit-san312-pro`, `crit-san312-opus-r2`, `crit-san312-pro-r2`, `crit-san3-12-r2-pro`, `crit-san312a-e1-opus` (achou o D1-TOCTOU), `dev-san312a-opus`, `dev-san312a-c2-opus` (dev do ciclo 2), `fab-red-san312a-opus` (fabricou o seu corpo), `redator-san312a-r2-opus`, `fab-red-san312a-r3-opus`, `redator-san312a-c2-opus` (redigiu este mandato e executou as medições dele), o orquestrador, `inspetor-san312a-opus`, `jurado-san312a-c2-opus` e `jurado-san312a-c4-opus` (os achadores do ciclo 1), e as outras identidades deste ciclo, `inspetor-san312a-c2-opus`, `jurado-san312a-c2b-opus`, `jurado-san312a-c3-opus` e `jurado-san312a-c4b-opus`; se o seu nome coincidir, pare. Monocultura declarada: o dev do ciclo 2 e as identidades desta junta rodam em Claude Opus, salvo a cadeira que o orquestrador declarar em Codex. O plano v3 com E1, E1-bis e o ciclo 2, o relatório do dev (E10 a E14 e a seção "Ciclo 2") e as críticas são **A RE-VERIFICAR**, derruba com: `head -1 C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a-ciclo2/c1-evidencia.md | grep -i -E 'executor|Opus|Sol|mandato_md5|objeto|IDENTICO|DIVERGE'`

A legalidade vem antes do mérito: parecer `insp-san312a-c2-parecer.md` do inspetor `inspetor-san312a-c2-opus`, no diretório deste ciclo, com LIBERADO ou LIBERADO COM RESSALVA nomeando você, o seu executor, o seu worktree, os seus containers e a sua vez (uma cadeira por vez); o objeto é o head do PR 459 (medido acima), com todos os check-runs concluídos (head que andou bloqueia o início). Régua: bloco de DINHEIRO e de permissão, **unanimidade das 4 cadeiras do ciclo 2 com veto** (C1, C2b, C3 e C4b; §C7 item 8(1)); **ciclo 2**: todo `bloqueia` com escopo `dentro-do-bloco` ainda reprova, grave ou não (§C7 item 8(2)); você vota pela primeira vez (não há voto seu a carregar, §C7 item 9); as bases são o head-base do bloco (`<objeto>~18` pelo 1º pai, o ponto de saída do ramo; NÃO a merge-base do `mandato-refs.sh`, que é a ponta da `main`), o head-base da emenda `<objeto>~12` pelo 1º pai (`<objeto>~6~6`) e o objeto do ciclo 1 `<objeto>~4` (medidos acima). O desfecho do A29 (estados ruins, 422 por modo) é da C4b; você mede a ordem de travas e o deadlock do A29 como DBA; a permissão é da C2b; suíte, escopo e contrato são da C3. Todo achado declara gravidade, classe, escopo, N e forma; `pre-existente` exige evidência de data ou origem e pendência com dono (§C7.1-ter(a)); "não consigo medir" item seu é REPROVADO; não proponha correção (§C7.4-bis), não reabra as decisões do dono (medidas acima) nem a E1, a E1-bis e o plano do ciclo 2, não cobre KPI, não leia votos e evidências de outras cadeiras de nenhum ciclo; o voto declara `arquivos_medidos` (§C7 item 9 (0)) POR ITEM, honesto, e `**` no item que rodar `npm test`, `check` ou `build`, derruba com: `grep -i -E 'legalidade|A RE-VERIFICAR|gravidade|classe|escopo|arquivos_medidos|ciclo 2|primeira vez|4 cadeiras' C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a-ciclo2/c1-voto.json`

Terreno: worktree exclusivo `C:/Users/AMP/j12a2-c1-wt`, detached no objeto, com `npm ci` próprio (e `npx prisma generate`) e zero junction de `node_modules` (§C7.1-ter(c)), removido só por `git worktree remove --force` depois de conferir que nenhum processo o usa. Postgres 16 `j12a2-c1-pg` e Redis 7 `j12a2-c1-redis` próprios, só em `127.0.0.1`, portas altas testadas antes (candidatas 47813 e 47814), senha aleatória só por ambiente; bancos extras `j12a2_c1_*`; `DATABASE_URL` e `REDIS_URL` seus como prefixo de **todo** comando `node`/`npm`; `npx prisma migrate deploy` até a migração de dados do bloco. Antes de subir: memória de commit livre ≥ 4 GB (P8 (c)), no máximo 2 trabalhos Docker na máquina contando o seu (medido acima), disco ≥ 7 GB (abaixo disso, PARE e registre); faltando memória ou teto, espere. Uma cadeira por vez: você só sobe quando o inspetor disser que é a sua vez. Nunca a base viva (`erp-postgres`, `erp-redis`, `erp-postgres-alt`), nem 5432, 6379, 3000, 5173, 5050, 8899, 55432, 55412, 55413; nunca `prune` nem container alheio. Mutação só no seu worktree, uma por vez, âncora única com prova de aplicação (CRLF incluso), restauro provado por `git hash-object` = blob do objeto; o vermelho-controle por `git checkout <base> -- <módulo>` no seu worktree (a base que o item nomeia), restaurado e provado; barreira determinística (`application_name`, `pg_stat_activity`, `pg_locks`), nunca relógio; scripts e sondas numa pasta sua `C:/Users/AMP/erp-pausa-2026-10-03/j12a2-c1/`, para que a evidência seja re-executável, derruba com: `grep -i -E 'j12a2-c1-wt|j12a2-c1-pg|j12a2-c1-redis|j12a2_c1_|127\.0\.0\.1|junction|commit livre|4 GB|7 GB|erp-|5432|6379|hash-object|head-base|pg_locks|teardown' C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a-ciclo2/c1-evidencia.md`

Item 1 de 3 (A27 — o CAS do `title_id` lido no 1º vínculo, no `cancel` e no `delete`; A27-a a A27-f): o teste de barreira do A27 três vezes no seu Postgres (mesmo `# tests`, `skipped = 0`) e o A27-e em memória; uma sonda sua com barreira para cada escrita (vencedor por SQL em transação aberta, perdedor `finance` pelo serviço ou pela rota, o bloqueio provado por `pg_stat_activity` e `pg_locks` enquanto ele espera): status e `reason` do perdedor, FINAL do cheque, auditoria sem troca, e o pix em seguida recusado com 422 `title_has_pending_cheque`; os três desfechos do conflito (404, 422, 409) por execução; a conferência obrigatória (medida acima: só o 1º vínculo, o `delete` e o `cancel` passam o título lido; o ciclo 2 só tocou a justificativa nesse arquivo) e se algum caminho que DECIDE por `title_id` ficou sem CAS. Mutações A27a-db, A27b-db, A27c-db, A27e-mem e a sua (o serviço deixa de passar o título lido no `cancel`). Vermelho-controle: com `src/modules/cheques` e `src/modules/financial-uow` do head-base da emenda `<objeto>~12`, a sua sonda mostra o perdedor com 200 e o FINAL trocado, e o A27-e do objeto fica vermelho pela asserção, derruba com: `grep -i -E 'Item 1|A27-a|A27-b|A27-c|A27-e|A27-f|barreira|pg_locks|pg_stat_activity|cheque_write_conflict|transition_conflict|title_has_pending_cheque|FINAL|A27a-db|A27e-mem|vermelho|<objeto>~12' C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a-ciclo2/c1-evidencia.md`

Item 2 de 3 (A28 — o `clear` de título já pago falha fechado, em memória e no Postgres; mais o F1 `-db`): `C:/Users/AMP/w-san312a/tests/cheque-title-link.test.ts` em memória e `C:/Users/AMP/w-san312a/tests/cheque-title-link-atomic-db.test.ts` três vezes no seu Postgres (`skipped = 0`), com o que K2 e K2-db asserem; uma sonda sua com o título pago por SQL commitado e por SQL em transação aberta (o `clear` bloqueado na trava do título): status, `reason`, lançamentos lidos do banco e qual das duas defesas respondeu; a contagem de casos dos dois arquivos no head-base do bloco e no objeto, com os renomeados por nome (nenhum caso apagado); e diga se o conserto do ciclo 2 no serviço de títulos (o `update` e o `delete` agora na unidade, medido acima) mudou algum desfecho do A28. Mutações M2-ambas (vermelha em memória e no `-db`), M2 só o fast-fail (verde: diga o que ela prova) e a sua (só a defesa sob a trava). Vermelho-controle: com os módulos de cheques, lançamentos e títulos do head-base do bloco (`<objeto>~18`), o K2 reescrito do objeto fica vermelho pela asserção (na base o pix paga o título com cheque pendente), derruba com: `grep -i -E 'Item 2|A28|K2|K2-db|title_already_paid|clear|lançamento|M2|fast-fail|trava|casos|apagado|vermelho|<objeto>~18' C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a-ciclo2/c1-evidencia.md`

Item 3 de 3 (ordem de travas e deadlock — a D1 sob concorrência e o dinheiro em volta dela, A5-bis, R-res-1, R-res-3, o invariante do A4 e do A4-bis, E a ordem de travas do A29 do ciclo 2): como `tenant_admin`, o PATCH que tiraria ou trocaria o título responde 422 `cheque_linked_unlink_first`, vínculo intacto, e o `unlink-title` com justificativa responde 200 (com `cheque_still_depositable` quando `deposited`); a enumeração, por script, de toda rota e todo caminho de escrita que grava `title_id` (N e lista); o A5-bis e a sua sonda de `unlink-title` × `clear` com barreira nos dois sentidos (desfechos, FINAL, lançamentos; o caixa sem título do R-res-3 é medido e registrado como risco com dono); a ordem de travas do A29 lida em `pg_locks` (a trava SHARED do período, o `FOR UPDATE` do título, a leitura dos cheques sem trava; medida acima no código) comparada com a do `payTitle`, do vínculo e do `clear`, e a sua sonda de cruzamentos — PATCH de `amount` e `DELETE` do título × vínculo × `clear` × `payTitle` × fechamento do período, N ≥ 10 rodadas por par — sem `deadlock detected` e com o desfecho de cada rodada; julgue a leitura declarada do dev (período ANTES do título, com `current.competencia`, medida acima): a competência do título é imutável depois do create em todo caminho de escrita (por script), e a ordem do plano no passo 2 teria criado deadlock com o fechamento do período? `C:/Users/AMP/w-san312a/tests/b-san3-12a-pay-link-race-db.test.ts`, `C:/Users/AMP/w-san312a/tests/b-san3-12a-title-mutation-race-db.test.ts` e `C:/Users/AMP/w-san312a/tests/b-san3-12a-pay-pending-cheque-db.test.ts` três vezes (`skipped = 0`) e, ao fim de cada sonda sua, a consulta do invariante (nenhum título pago, alterado ou apagado com cheque pendente vinculado e ativo; N = 0). Mutações D1, A5-bis CAS, A4 só o re-check e a sua (no `update` do título, o `findByIdForUpdate` ANTES da trava do período: diga se o deadlock aparece). Vermelho-controle: com `src/modules/cheques` do head-base da emenda `<objeto>~12`, o PATCH do `tenant_admin` desvincula com 200 sem justificativa; e a sua consulta do invariante acusa um estado proibido fabricado por você, derruba com: `grep -i -E 'Item 3|D1|cheque_linked_unlink_first|unlink-title|A5-bis|R-res-1|R-res-3|A29|ordem de travas|deadlock|pg_locks|competencia|invariante|A4-bis|cheque_still_depositable|vermelho|<objeto>~12' C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a-ciclo2/c1-evidencia.md`

Protocolo P1/P2/P3/P4/P7 do §C7.7, verbatim no bloco colado acima, com `<cadeira>` = `c1`: evidência em `c1-evidencia.md` após CADA item; `c1-voto.json` nasce esqueleto com os três itens EM APURAÇÃO e o campo `arquivos_medidos` por item, cada item gravado ao ser medido, e fecha antes da mensagem final de 1 linha; sucessor de identidade nova re-executa os comandos registrados e só então mede a cauda; três itens exatos; PAUSA grava head, feito, falta, próximo comando e arquivos meio-escritos e para. Queda vai a `00-quedas.md` do diretório deste ciclo (P6, pelo orquestrador); uma cadeira por vez (ordem do dono, mais estreita que a P5). Únicos outputs no repositório: `c1-evidencia.md` e `c1-voto.json` em `C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a-ciclo2/`; nunca commit, derruba com: `test -f C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a-ciclo2/c1-voto.json`

## MEDIDO

Pré-voo deste mandato com as ferramentas copiadas sem mudança para a pasta do redator deste ciclo `C:/Users/AMP/erp-pausa-2026-10-03/redator-san312a-c2/` (diferença contra o ramo das ferramentas medida acima), executado com o cwd no worktree do objeto; o redator do ciclo 2 é `redator-san312a-c2-opus` (Claude Opus 5.5, nível menor declarado, identidade nova, não vota), que adaptou ao objeto do ciclo 2 os geradores r3 do ciclo 1 (`fab-red-san312a-r3-opus`, sobre os de `redator-san312a-r2-opus` e `fab-red-san312a-opus`) e executou cada comando deste mandato pelo gerador `C:/Users/AMP/erp-pausa-2026-10-03/redator-san312a-c2/gerar-c1.sh`, medido por: `cd C:/Users/AMP/w-san312a && MANDATO_REFS=C:/Users/AMP/erp-pausa-2026-10-03/redator-san312a-c2/mandato-refs.sh bash C:/Users/AMP/erp-pausa-2026-10-03/redator-san312a-c2/mandato-preflight.sh C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a-ciclo2/00-mandatos/cadeira-c1.md 459 2>&1; echo ec=$?`
```
COLAGEM    l.6-20: refs do PR #459 confere com a saida atual

PRE-VOO OK — C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a-ciclo2/00-mandatos/cadeira-c1.md
ec=0
```
