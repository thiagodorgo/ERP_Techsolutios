# Mandato — Cadeira C4b (C4 refeita) — B-SAN3-12a (junta de DINHEIRO, ciclo 2)

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

O corpo desta cadeira existe no objeto e, descontados o frontmatter e o bloco de adaptação Codex do espelho, é IDÊNTICO entre os dois espelhos (comparação EOL-neutra; o arquivo inteiro difere por construção do espelho, e por isso não se publica hash); o número de linhas de cada espelho está na saída, e nenhum commit do ciclo 2 o tocou (a última linha conta os commits que o tocam até o objeto e até o objeto do ciclo 1, `<objeto>~4`), medido por: `cd C:/Users/AMP/w-san312a && diff <(tr -d '\r' < C:/Users/AMP/w-san312a/.claude/agents/especialistas/jurado-san312a-c4-isolamento-e-invariantes.md | awk 'f; $0=="---"{n++; if(n==2) f=1}' | sed '/^$/d') <(tr -d '\r' < C:/Users/AMP/w-san312a/.agents/agents/especialistas/jurado-san312a-c4-isolamento-e-invariantes.md | awk 'f; $0=="---"{n++; if(n==2) f=1}' | awk 'index($0,"Papel para o Codex"){s=1} s&&$0==""{s=0; next} !s' | sed '/^$/d') >/dev/null && echo 'IDENTICO corpo c4-isolamento-e-invariantes' || echo 'DIVERGE corpo c4-isolamento-e-invariantes'; wc -l < C:/Users/AMP/w-san312a/.claude/agents/especialistas/jurado-san312a-c4-isolamento-e-invariantes.md; wc -l < C:/Users/AMP/w-san312a/.agents/agents/especialistas/jurado-san312a-c4-isolamento-e-invariantes.md; echo "commits que tocam o corpo: até o objeto $(git rev-list --count 8a9fc1d8426426403f8642e263b3e932d1738716 -- C:/Users/AMP/w-san312a/.claude/agents/especialistas/jurado-san312a-c4-isolamento-e-invariantes.md), até o objeto do ciclo 1 $(git rev-list --count 8a9fc1d8426426403f8642e263b3e932d1738716~4 -- C:/Users/AMP/w-san312a/.claude/agents/especialistas/jurado-san312a-c4-isolamento-e-invariantes.md)"`
```
IDENTICO corpo c4-isolamento-e-invariantes
392
398
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

Ciclo 2, pelo §C7 item 9: no diretório de votos do ciclo 1 (`B-SAN3-12a`) há voto e evidência só da C2 e da C4, os dois `REPROVADO` (o campo `voto` de cada JSON), e nenhum da C1 nem da C3, que o orquestrador segurou; o `arquivos_medidos` dos dois votos alcança o que o conserto tocou (o serviço de cheques e o de títulos); no diretório deste ciclo 2 (`B-SAN3-12a-ciclo2`) só há o diretório dos mandatos. Logo a C2 e a C4 são REFEITAS (regra (3)), com identidade nova (C2b e C4b), a C1 e a C3 votam pela primeira vez, e não há voto verde a carregar nem a revalidar; a C4b é a C4 refeita, focada nos achados dela mais a regressão dos itens dela, medido por: `ls C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a | sed -e 's#^#C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a/#'; echo "votos do ciclo 1 por cadeira: $(ls C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a | grep -i -E '^c[1234]-voto\.json$' | tr '\n' ' ')"; node -e 'const fs=require("fs");for(const c of ["c2","c4"]){const j=JSON.parse(fs.readFileSync("C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a/"+c+"-voto.json","utf8").replace(String.fromCharCode(65279),""));const a=JSON.stringify(j.arquivos_medidos)+JSON.stringify((j.itens||[]).map(i=>i.arquivos_medidos||""));console.log(c+": voto="+j.voto+" alcança cheque.service.ts="+a.includes("cheque.service.ts")+" alcança financial-title(s)="+a.includes("financial-title"))}'; ls C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a-ciclo2 | sed -e 's#^#C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a-ciclo2/#'`
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

Os achados da C4 no ciclo 1, na reprovação (C4-03 grave: dinheiro; C4-02; C4-04; C4-01; linhas cortadas), e o que o plano do ciclo 2 manda a C4 refeita medir (a linha da C4 no C2.5, cortada): o plano previa dividir a C4 em duas se o mandato passasse de 3 itens, e esta composição do orquestrador a mantém numa cadeira só com 3 itens (A29; A13-bis; R-res-5-bis), cada um levando a regressão do item correspondente do ciclo 1 — divergência registrada (§A2), e vale este mandato, medido por: `tr -d '\r' < C:/Users/AMP/w-san312a/agent-orchestration/omega/reprovacoes/R-B-SAN3-12a-ciclo1.md | grep -n -i -E '\*\*C4-0[1-4]\*\*' | cut -c1-170; tr -d '\r' < C:/Users/AMP/w-san312a/docs/revisoes/SAN3/B-SAN3-12-plano.md | grep -n -i -E '^- \*\*C4 — isolamento e invariantes — REFEITA' | cut -c1-260`
```
9:  - **C4-03** (bloqueia, dentro, **GRAVE: dinheiro**): PATCH do valor do título × vínculo de cheque em corrida. Os dois passam, e o título fica com valor 150 e cheq
10:  - **C4-02** (bloqueia, dentro, não grave): tirar `reconciled` do WHERE do CAS da conciliação (M13a) não deixa nenhum teste do bloco vermelho; o comportamento mud
11:  - **C4-04** (ajuste, pré-existente): DELETE do título × vínculo deixa título apagado com cheque pendente (100/100). `P-SAN3-20-DELETE-TITULO-COM-CHEQUE` NÃO fe
12:  - **C4-01** (ajuste): o teste R-res-5 não fica vermelho sem `withTenantRls` como superusuário, o papel da CI.
1057:- **C4 — isolamento e invariantes — REFEITA, identidade nova** (≠ `jurado-san312a-c4-opus`): **A29-a..h** (re-executa a sonda p4 dela: esperado **0** estados ruins em N ≥ 20 por modo, nos 2 papéis — superusuário e papel sem bypass), **A13-bis
```

O conserto do A29 no serviço de títulos do objeto: o `update` e o `delete` fazem o fast-fail pela porta do pool fora da transação e depois entram em `uow.run`, com a trava SHARED do período, o `findByIdForUpdate` do título e o re-check `assertNoPendingCheque(ctx.cheques, …)` sob o lock (linhas da busca textual, cortadas); no objeto do ciclo 1 (`<objeto>~4`, o vermelho-controle deste mandato) o serviço não tinha `findByIdForUpdate` nem re-check com `ctx.cheques` (contagens no blob dele), medido por: `cd C:/Users/AMP/w-san312a && B4=$(git ls-tree 8a9fc1d8426426403f8642e263b3e932d1738716~4 -- C:/Users/AMP/w-san312a/src/modules/financial-titles/financial-title.service.ts | awk '{print $3}'); tr -d '\r' < C:/Users/AMP/w-san312a/src/modules/financial-titles/financial-title.service.ts | grep -n -i -E 'uow\.run\(|assertPeriodOpenShared\(|findByIdForUpdate\(|assertNoPendingCheque\(' | cut -c1-140; echo "no objeto do ciclo 1: findByIdForUpdate=$(git cat-file blob "$B4" | grep -c -i 'findByIdForUpdate') re-check-com-ctx.cheques=$(git cat-file blob "$B4" | grep -c -i 'assertNoPendingCheque(ctx.cheques')"`
```
139:    return uow.run(actor.tenantId, (ctx) => this.createForWorkOrderInUnit(ctx, actor, input));
155:    await ctx.assertPeriodOpenShared(competencia, periodClosedError);
282:      await assertNoPendingCheque(await createDefaultChequePendingReader(), actor.tenantId, current.id);
306:    return uow.run(actor.tenantId, async (ctx) => {
307:      await ctx.assertPeriodOpenShared(current.competencia, periodClosedError);
308:      const locked = await ctx.titles.findByIdForUpdate(actor.tenantId, current.id);
311:        await assertNoPendingCheque(ctx.cheques, actor.tenantId, locked.id);
410:    await assertNoPendingCheque(await createDefaultChequePendingReader(), actor.tenantId, current.id);
415:    return uow.run(actor.tenantId, async (ctx) => {
416:      await ctx.assertPeriodOpenShared(current.competencia, periodClosedError);
417:      const locked = await ctx.titles.findByIdForUpdate(actor.tenantId, current.id);
419:      await assertNoPendingCheque(ctx.cheques, actor.tenantId, locked.id);
451:async function assertNoPendingCheque(reader: ChequePendingReader, tenantId: string, financialTitleId: string): Promise<void> {
no objeto do ciclo 1: findByIdForUpdate=0 re-check-com-ctx.cheques=0
```

O lado do vínculo, que o plano diz já estar certo (os controles A29-b e A29-d): no serviço de cheques do objeto a revalidação sob o lock trava o título por `findByIdForUpdate` e confere o saldo exato (`assertExactOpenBalance`); e o `invalid_title_reference` nasce com status 400 no repositório de cheques (o A29-d do plano diz 422; o dev declara que o teste afere o 400 medido) — linhas cortadas, mais a linha do relatório do dev que declara essa diferença e a da ordem período → título, medido por: `tr -d '\r' < C:/Users/AMP/w-san312a/src/modules/cheques/cheque.service.ts | grep -n -i -E 'revalidateTitleLinkUnderLock\(|ctx\.titles\.findByIdForUpdate\(|assertExactOpenBalance\(' | cut -c1-130; tr -d '\r' < C:/Users/AMP/w-san312a/src/modules/cheques/cheque.repository.ts | grep -n -i -E '"invalid_title_reference"' | cut -c1-110; tr -d '\r' < C:/Users/AMP/w-san312a/docs/revisoes/SAN3/B-SAN3-12a-dev.md | grep -n -i -o -E 'invalid_title_reference` é \*\*400\*\*[^,]{0,40}|\*\*Ordem período → título\.\*\*[^.]{0,60}'`
```
196:      await this.revalidateTitleLinkUnderLock(ctx, actor, titleId, direction, amount, currency);
247:      await this.revalidateTitleLinkUnderLock(ctx, actor, titleId, current.direction, current.amount, current.currency);
532:    assertExactOpenBalance(title, amount);
538:  private async revalidateTitleLinkUnderLock(
546:    const locked = await ctx.titles.findByIdForUpdate(actor.tenantId, titleId);
554:    assertExactOpenBalance(locked, amount);
580:    const locked = await ctx.titles.findByIdForUpdate(actor.tenantId, financialTitleId);
606:function assertExactOpenBalance(title: FinancialTitle, chequeAmount: number): void {
83:  return new ChequeError(400, "CHEQUE_INVALID", "invalid_title_reference", "The referenced financial title
325:**Ordem período → título.** O passo 2 do E2
332:invalid_title_reference` é **400** (`cheque.repository.ts:83`)
```

Os casos do ciclo 2 que os três itens medem existem no objeto, com o nome na linha do `test(`: A29-a a A29-d, A29-g e A29-h no `-db` novo de corrida (com barreira por `waitForOwnBlockedStatement`/`holdGate` e asserção de `deadlock`), A29-e, A29-f e A29-h em memória, A13-bis no `-db` do CAS e R-res-5-bis no `-db` do agregado (com o papel efêmero e a asserção de `rolbypassrls`); mais os casos do ciclo 1 que cada item regride (A21, A16, A13, R-res-5); e os `-db` pulam DECLARANDO quando falta `DATABASE_URL`, medido por: `for f in C:/Users/AMP/w-san312a/tests/b-san3-12a-title-mutation-race-db.test.ts C:/Users/AMP/w-san312a/tests/b-san3-12a-pay-pending-cheque.test.ts C:/Users/AMP/w-san312a/tests/b-san3-12a-pay-pending-cheque-db.test.ts C:/Users/AMP/w-san312a/tests/b-san3-12a-reconcile-cas-db.test.ts C:/Users/AMP/w-san312a/tests/b-san3-12a-entries-aggregate-db.test.ts; do echo "$f"; tr -d '\r' < $f | grep -n -i -o -E '^ *test\(["`](A29-[a-h]|A13-bis|A13|R-res-5-bis|R-res-5|A21|A2/A21|A19/A20/A21|A16)[^"`]{0,40}|skip: "Defina DATABASE_URL[^"]{0,30}'; done; f=C:/Users/AMP/w-san312a/tests/b-san3-12a-title-mutation-race-db.test.ts; echo "deadlock=$(tr -d '\r' < $f | grep -c -i 'deadlock') waitForOwnBlockedStatement=$(tr -d '\r' < $f | grep -c -i 'waitForOwnBlockedStatement') holdGate=$(tr -d '\r' < $f | grep -c -i 'holdGate')"; f=C:/Users/AMP/w-san312a/tests/b-san3-12a-entries-aggregate-db.test.ts; echo "createEphemeralRole=$(tr -d '\r' < $f | grep -c -i 'createEphemeralRole') rolbypassrls=$(tr -d '\r' < $f | grep -c -i 'rolbypassrls')"`
```
C:/Users/AMP/w-san312a/tests/b-san3-12a-title-mutation-race-db.test.ts
37:skip: "Defina DATABASE_URL e aplique as migrations.
45:  test("A29-a (db, barreira): vínculo em voo × PATC
71:  test("A29-b (db, barreira, controle): PATCH amount=
95:  test("A29-c (db, barreira): vínculo em voo × DELE
119:  test("A29-d (db, barreira, controle): DELETE em voo
145:    test(`A29-g (db, N=20, sem barreira): Promise.all([
173:  test("A29-h (db): o período fecha DEPOIS do fast-f
C:/Users/AMP/w-san312a/tests/b-san3-12a-pay-pending-cheque.test.ts
329:test("A21: PATCH {amount} e DELETE do título com
339:test("A21: sem cheque pendente (sem cheque, ou de
349:test("A2/A21: cross-tenant — o cheque pendente de
376:test("A29-e (memória): PATCH {amount} e DELETE que
401:  test(`A29-f (memória): o vínculo commita DEPOIS d
419:test("A29-f (memória, arranjo inverso): o PATCH/DE
432:test("A29-h (memória): o período fecha DEPOIS do
C:/Users/AMP/w-san312a/tests/b-san3-12a-pay-pending-cheque-db.test.ts
17:skip: "Defina DATABASE_URL e aplique as migrations.
64:  test("A19/A20/A21 (db): valor exato no vínculo; cancel/D
180:  test("A16 (db, paridade): cheques.linkedPending*
C:/Users/AMP/w-san312a/tests/b-san3-12a-reconcile-cas-db.test.ts
26:skip: "Defina DATABASE_URL e aplique as migrations.
33:  test("A13 (db, barreira): o 1º grava e segura o
69:  test("A13 (db, 10 rodadas concorrentes): dois cli
93:  test("A13-bis (db): o flag lido conta no CAS — linh
122:  test("A13 (db): sem estado → 400 sem gravar; es
C:/Users/AMP/w-san312a/tests/b-san3-12a-entries-aggregate-db.test.ts
17:skip: "Defina DATABASE_URL e aplique as migrations.
106:  test("R-res-5 (db): duas organizações na mesma base
131:  test("R-res-5-bis (db, papel SEM bypass): o agregado stan
deadlock=9 waitForOwnBlockedStatement=6 holdGate=2
createEphemeralRole=3 rolbypassrls=2
```

Os alvos das mutações M13a e M5a no objeto: o `WHERE` do CAS da conciliação compara `reconciled` (o operando que a M13a tira) e `reconciled_at`, e o agregado standalone roda em `withTenantRls` (o que a M5a tira) com o filtro `tenant_id = …` no `$queryRaw`; a tabela `financial_entries` tem `ENABLE` e `FORCE ROW LEVEL SECURITY` na migração que a criou; e o ciclo 2 não tocou `src/modules/financial-entries` (0 caminho de `<objeto>~4` ao objeto), linhas cortadas, medido por: `cd C:/Users/AMP/w-san312a && tr -d '\r' < C:/Users/AMP/w-san312a/src/modules/financial-entries/financial-entry-prisma.repository.ts | grep -n -i -E 'reconciled: input\.expectedReconciled|reconciled_at: input\.expectedReconciledAt|tenant_id = \$\{input\.tenantId\}|withTenantRls\(this\.prismaClient, input\.tenantId, \(tx\) => new PrismaFinancialEntryRepository\(tx\)\.aggregate' | cut -c1-150; F=C:/Users/AMP/w-san312a/$(git ls-tree -r --name-only 8a9fc1d8426426403f8642e263b3e932d1738716 -- prisma/migrations | grep -i -E '_add_financial_entries/migration\.sql$'); tr -d '\r' < "$F" | grep -n -i -E 'ALTER TABLE "financial_entries" (ENABLE|FORCE) ROW LEVEL SECURITY'; echo "caminhos do ciclo 2 em financial-entries: $(git diff --name-only 8a9fc1d8426426403f8642e263b3e932d1738716~4 8a9fc1d8426426403f8642e263b3e932d1738716 -- src/modules/financial-entries | wc -l)"`
```
103:        reconciled: input.expectedReconciled,
104:        reconciled_at: input.expectedReconciledAt,
150:    const filters: Prisma.Sql[] = [Prisma.sql`tenant_id = ${input.tenantId}::uuid`, Prisma.sql`deleted_at IS NULL`];
255:    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaFinancialEntryRepository(tx).aggregate(input));
66:ALTER TABLE "financial_entries" ENABLE ROW LEVEL SECURITY;
67:ALTER TABLE "financial_entries" FORCE ROW LEVEL SECURITY;
caminhos do ciclo 2 em financial-entries: 0
```

As pendências que regem a régua da C4b, no registro do objeto, com data e prioridade (linha e título): `P-SAN3-20-DELETE-TITULO-COM-CHEQUE` (a nota do ciclo 2 diz que ela fecha no merge, pelo porteiro, com A29-c e A29-g; a linha da nota, cortada), `P-SAN3-20-RESUMO-CHEQUE-VINCULADO`, `P-SAN3-12-CAS-VERSION-COLUMN` (o ABA residual do CAS) e `P-FINANCIAL-SUMMARY-SEM-SEGUNDA-ORGANIZACAO` (nova, pré-existente), medido por: `tr -d '\r' < C:/Users/AMP/w-san312a/agent-orchestration/controle/pendencias.md | grep -n -i -E '^## (P-SAN3-20-DELETE-TITULO-COM-CHEQUE|P-SAN3-20-RESUMO-CHEQUE-VINCULADO|P-SAN3-12-CAS-VERSION-COLUMN|P-FINANCIAL-SUMMARY-SEM-SEGUNDA-ORGANIZACAO) \(' | cut -c1-150; tr -d '\r' < C:/Users/AMP/w-san312a/agent-orchestration/controle/pendencias.md | grep -n -i -E '^- \*\*ciclo 2 do B-SAN3-12a \(2026-10-26\):\*\* a prova concorrente' | cut -c1-200 | sed -e 's#tests[/]#C:/Users/AMP/w-san312a/tests/#g'`
```
11617:## P-SAN3-20-DELETE-TITULO-COM-CHEQUE (2026-10-24) — título com cheque pendente pode ser apagado — BAIXA
11623:## P-SAN3-20-RESUMO-CHEQUE-VINCULADO (2026-10-24) — KPI pode somar título e cheque pendente — BAIXA
11704:## P-SAN3-12-CAS-VERSION-COLUMN (2026-10-25) — ABA residual do CAS por estado lógico — BAIXA
11836:## P-FINANCIAL-SUMMARY-SEM-SEGUNDA-ORGANIZACAO (2026-10-26) — nenhum teste do resumo financeiro tem 2ª organização — BAIXA
11621:- **ciclo 2 do B-SAN3-12a (2026-10-26):** a prova concorrente existe — `C:/Users/AMP/w-san312a/tests/b-san3-12a-title-mutation-race-db.test.ts` A29-c (barreira: o DELETE bloqueia no FOR UPDATE da unidade, relê e sa
```

Memória de commit livre em GB (a P8 (c) exige pelo menos 4 antes de lançar agente), os trabalhos Docker vivos fora da base `erp-*` (o teto é 2 contando o da cadeira) e o disco livre em `C:` (a ordem do orquestrador: PARE abaixo de 7 GB), no instante da redação: a cadeira mede de novo antes de subir, medido por: `powershell.exe -NoProfile -Command '$o=Get-CimInstance Win32_PerfFormattedData_PerfOS_Memory; [math]::Round(($o.CommitLimit-$o.CommittedBytes)/1GB,2)'; docker ps --format '{{.Names}}' | grep -v -i -E '^erp-' | sed -E 's#-(pg|redis|run|net)$##' | sort -u; echo "trabalhos fora de erp: $(docker ps --format '{{.Names}}' | grep -v -i -E '^erp-' | sed -E 's#-(pg|redis|run|net)$##' | sort -u | wc -l)"; df -h /c | tail -1 | awk '{print "livre em C: " $4}'`
```
13,03
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

Você é `jurado-san312a-c4b-opus` (identidade nova; o orquestrador confirma no disparo), a C4 REFEITA do ciclo 2 (§C7 item 9(3)); executor Claude Opus (subagente genérico, corpo lido do blob do objeto), modelo **Claude Opus**, nível menor DECLARADO (§C7.6), ou Codex GPT-5.6 Sol se o orquestrador o declarar no disparo; o seu corpo canônico é `C:/Users/AMP/w-san312a/.claude/agents/especialistas/jurado-san312a-c4-isolamento-e-invariantes.md`, carregado **do blob do objeto** (o worktree está no objeto, medido acima; §A7). O corpo foi escrito para o ciclo 1: onde ele divergir deste mandato quanto a objeto, ciclo, itens, diretório de votos, régua, bases ou inelegíveis, vale este mandato. Na primeira linha de `c4b-evidencia.md`, declare executor efetivo, modelo, nível, objeto, `mandato_md5` deste arquivo (CR retirado antes do md5) e o veredito IDENTICO/DIVERGE do corpo que você carregou contra o blob do objeto, EOL-neutro. **Opus esgotado: PARE sem votar** e registre onde parou (§C7.6-bis); o sucessor de queda é outra identidade declarada. Inelegíveis por nome: `planejador-mestre` (Fable, plano v3), `planejador-san312-e1-fable` (E1 e E1-bis), `planejador-san312a-c2-fable` (auditoria e plano do ciclo 2, que reproduziu o C4-03 com barreira), `crit-san312-pro`, `crit-san312-opus-r2`, `crit-san312-pro-r2`, `crit-san3-12-r2-pro`, `crit-san312a-e1-opus`, `dev-san312a-opus`, `dev-san312a-c2-opus` (dev do ciclo 2), `fab-red-san312a-opus`, `redator-san312a-r2-opus`, `fab-red-san312a-r3-opus` (fabricou o seu corpo), `redator-san312a-c2-opus` (redigiu este mandato e executou as medições dele), o orquestrador, `inspetor-san312a-opus`, `jurado-san312a-c2-opus` e `jurado-san312a-c4-opus` (os achadores do ciclo 1), e as outras identidades deste ciclo, `inspetor-san312a-c2-opus`, `jurado-san312a-c1-opus`, `jurado-san312a-c2b-opus` e `jurado-san312a-c3-opus`; se o seu nome coincidir, pare. Monocultura declarada: o dev do ciclo 2 e as identidades desta junta rodam em Claude Opus, salvo a cadeira que o orquestrador declarar em Codex. O plano do ciclo 2 (auditoria C2.0, critérios e mutações), o relatório do dev (seção "Ciclo 2", inclusive as 9/9 mutações vermelhas e as duas leituras declaradas) e a reprovação do ciclo 1 são **A RE-VERIFICAR**, derruba com: `head -1 C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a-ciclo2/c4b-evidencia.md | grep -i -E 'executor|Opus|Sol|mandato_md5|objeto|IDENTICO|DIVERGE'`

A legalidade vem antes do mérito: parecer `insp-san312a-c2-parecer.md` do inspetor `inspetor-san312a-c2-opus`, no diretório deste ciclo, com LIBERADO ou LIBERADO COM RESSALVA nomeando você, o seu executor, o seu worktree, os seus containers e a sua vez (uma cadeira por vez); o objeto é o head do PR 459 (medido acima), com todos os check-runs concluídos (head que andou bloqueia o início). Régua: bloco de DINHEIRO e de PERMISSÃO, **unanimidade das 4 cadeiras do ciclo 2 com veto** (C1, C2b, C3 e C4b; §C7 item 8(1)); **ciclo 2**: todo `bloqueia` com escopo `dentro-do-bloco` ainda reprova, grave ou não (§C7 item 8(2)); você é a cadeira VERMELHA refeita (§C7 item 9(3)), com a régua do ciclo corrente, focada nos achados C4-03 e C4-04 (agora A29), C4-02 (A13-bis) e C4-01 (R-res-5-bis), mais a regressão dos itens 1 a 3 da C4; título com valor mudado ou apagado com cheque a compensar vinculado é `grave: dinheiro`, soma de outra organização no agregado é `grave: vazamento entre organizações`, conciliação sobrescrita sem 409 é `grave: perda de dado`; mutação do plano sem caso vermelho é `criterio_que_nao_pode_falhar`; o ABA do CAS reproduzido SÓ pela via forçada é resíduo com dono (`P-SAN3-12-CAS-VERSION-COLUMN`, medido acima) e não reprova por construção. A ordem de travas e a ausência de deadlock do A29 como competência de DBA são da C1 (você mede o desfecho e registra `deadlock detected` se aparecer); a régua de quem pode o quê é da C2b; suíte, escopo e contrato são da C3. Todo achado declara gravidade, classe, escopo, N e forma; `pre-existente` exige evidência de data ou origem e pendência com dono (§C7.1-ter(a)); "não consigo medir" item seu é REPROVADO; não proponha correção (§C7.4-bis), não reabra as decisões do dono nem o plano do ciclo 2, não cobre KPI, não leia votos e evidências de outras cadeiras de nenhum ciclo (a reprovação e o plano são os seus insumos dos achados); o voto declara `arquivos_medidos` (§C7 item 9 (0)) POR ITEM, honesto, e `**` no item que rodar `npm test`, `check` ou `build`, derruba com: `grep -i -E 'legalidade|A RE-VERIFICAR|gravidade|classe|escopo|arquivos_medidos|ciclo 2|refeita|grave: dinheiro|4 cadeiras' C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a-ciclo2/c4b-voto.json`

Terreno: worktree exclusivo `C:/Users/AMP/j12a2-c4b-wt`, detached no objeto, com `npm ci` próprio (e `npx prisma generate`) e zero junction de `node_modules` (§C7.1-ter(c)), removido só por `git worktree remove --force` depois de conferir que nenhum processo o usa; o vermelho-controle por `git checkout <objeto>~4 -- <caminho>` (o objeto do ciclo 1, medido acima) no SEU worktree, restaurado e provado por `git hash-object` = blob do objeto. Postgres 16 `j12a2-c4b-pg` e Redis 7 `j12a2-c4b-redis` próprios, só em `127.0.0.1`, portas altas testadas antes (candidatas 47843 e 47844; nunca as das outras cadeiras), senha aleatória só por ambiente; bancos extras `j12a2_c4b_*`; no seu Postgres você cria um papel `j12a2_c4b_rt` `NOSUPERUSER NOBYPASSRLS` com os grants da aplicação para a sua sonda (o superusuário contorna a RLS), e o remove no fim; `DATABASE_URL` e `REDIS_URL` seus como prefixo de **todo** comando `node`/`npm`; `npx prisma migrate deploy` no SEU banco. Antes de subir: memória de commit livre ≥ 4 GB (P8 (c)), no máximo 2 trabalhos Docker na máquina contando o seu (medido acima), disco ≥ 7 GB (abaixo disso, PARE e registre); faltando memória ou teto, espere. Uma cadeira por vez: você só sobe quando o inspetor disser que é a sua vez. Nunca a base viva (`erp-postgres`, `erp-redis`, `erp-postgres-alt`), nem 5432, 6379, 3000, 5173, 5050, 8899, 55432, 55412, 55413; nunca `prune` nem container alheio. Mutação só no seu worktree, uma por vez, âncora única com prova de aplicação (CRLF incluso); barreira determinística (`application_name`, `pg_stat_activity`, `pg_locks`), nunca relógio; scripts e sondas numa pasta sua `C:/Users/AMP/erp-pausa-2026-10-03/j12a2-c4b/`, para que a evidência seja re-executável, derruba com: `grep -i -E 'j12a2-c4b-wt|j12a2-c4b-pg|j12a2-c4b-redis|j12a2_c4b_|j12a2_c4b_rt|BYPASSRLS|127\.0\.0\.1|junction|commit livre|4 GB|7 GB|erp-|5432|6379|hash-object|<objeto>~4|teardown' C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a-ciclo2/c4b-evidencia.md`

Item 1 de 3 (A29-a a A29-h — os achados C4-03 e C4-04: o PATCH de valor e o DELETE do título não gravam sobre cheque pendente vinculado nem sob corrida, e o lado do vínculo continua recusando; mais a regressão do item 3 da C4, A21 e A16): `C:/Users/AMP/w-san312a/tests/b-san3-12a-title-mutation-race-db.test.ts` três vezes contra o seu Postgres (mesmo `# tests`, `skipped = 0`, 0 `deadlock detected`), `C:/Users/AMP/w-san312a/tests/b-san3-12a-pay-pending-cheque.test.ts` em memória e os A21/A16 de `C:/Users/AMP/w-san312a/tests/b-san3-12a-pay-pending-cheque-db.test.ts`, `C:/Users/AMP/w-san312a/tests/cheque-title-link.test.ts` e `C:/Users/AMP/w-san312a/tests/financial-summary.test.ts`, com `tests | pass | fail | skipped`; e, no log do job `backend` da CI do objeto, o `ok` (não `skip`) dos casos A29 do `-db` novo. A sua sonda, que é a do achado (vínculo × PATCH de `amount` e vínculo × `DELETE`, pelos serviços Prisma, N ≥ 20 rodadas por modo, com `Promise.all` e também com barreira de lock sua, vencedor por SQL em transação aberta), sob o superusuário E sob o `j12a2_c4b_rt`: o número de estados ruins (valor diferente do cheque com pendente > 0, ou título apagado com pendente > 0) tem de ser 0, cada rodada com exatamente um `ok` e um 422 do conjunto {`title_has_pending_cheque`, `cheque_amount_mismatch`, `invalid_title_reference`}; diga se o status do `invalid_title_reference` (400 no repositório, medido acima; o A29-d do plano diz 422) é só divergência de texto do plano ou muda o contrato; o contador de `uow.run` do A29-e (1 no que grava, 0 nos fast-fails); o período fechando dentro da corrida (A29-h); e a regressão A21/A16 do ciclo 1 (PATCH só de `description` → 200; cheque pendente de outra organização não recusa daqui; `linkedPending*` igual em memória e no Prisma). Mutações (≥ 1/3 das do plano re-executadas, mais a sua): tirar o re-check do `update`, tirar o re-check do `delete`, tirar `ctx.assertPeriodOpenShared`, e a sua (o re-check sob o lock lendo pela porta do pool em vez de `ctx.cheques`). Vermelho-controle: com `C:/Users/AMP/w-san312a/src/modules/financial-titles/financial-title.service.ts` do objeto do ciclo 1 (`<objeto>~4`) no seu worktree, o A29-a, o A29-c, o A29-f e o A29-g do objeto ficam vermelhos pelo desfecho e a sua sonda volta a mostrar estados ruins; o A29-b e o A29-d ficam verdes lá (declarado no plano), derruba com: `grep -i -E 'Item 1|A29-a|A29-b|A29-c|A29-d|A29-e|A29-f|A29-g|A29-h|C4-03|C4-04|estados ruins|j12a2_c4b_rt|title_has_pending_cheque|cheque_amount_mismatch|invalid_title_reference|deadlock|A21|A16|vermelho|<objeto>~4' C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a-ciclo2/c4b-evidencia.md`

Item 2 de 3 (A13-bis — o achado C4-02: a retirada do operando `reconciled` do CAS da conciliação passa a ter caso vermelho; mais a regressão do item 2 da C4, R-res-4 e A13): `C:/Users/AMP/w-san312a/tests/b-san3-12a-reconcile-cas-db.test.ts` três vezes contra o seu Postgres e os A13 de `C:/Users/AMP/w-san312a/tests/b-san3-12a-unreconcile-policy.test.ts` em memória, com `tests | pass | fail | skipped`; a M13a aplicada por você (tirar `reconciled: input.expectedReconciled` do `WHERE`, alvo medido acima), com prova de aplicação: o A13-bis fica VERMELHO pela asserção do 409 (a linha `(false, null)` com o cliente `(true, null)` devolve 200 e grava) e o restauro volta ao blob; diga se o A13-bis prova também o segundo caso que o plano nomeia (linha `(true, X)` com cliente `(false, X)` → 409) e se existe outra forma de retirar o operando que nenhum caso acusa (uma mutação sua, por exemplo a comparação do par na memória); e a regressão do contrato do CAS do ciclo 1: sem os campos esperados 400 `expected_state_required` e nada gravado; dois clientes do mesmo estado lido, 200 e 409 `reconciliation_stale`, com o `reconciled_by` do 1º intacto; concorrência real N ≥ 20 rodadas, exatamente 1 grava, 0 `deadlock detected`. Vermelho-controle declarado pelo plano: no objeto do ciclo 1 o A13-bis é VERDE (o código já estava certo); o vermelho é a M13a sobre o objeto, derruba com: `grep -i -E 'Item 2|A13-bis|C4-02|M13a|reconciled|expected_state_required|reconciliation_stale|reconciled_by|R-res-4|A13|deadlock|vermelho|restauro' C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a-ciclo2/c4b-evidencia.md`

Item 3 de 3 (R-res-5-bis — o achado C4-01: a camada RLS do agregado é provada sob papel SEM bypass; mais a regressão do item 1 da C4, R-res-5 e A14): `C:/Users/AMP/w-san312a/tests/b-san3-12a-entries-aggregate-db.test.ts` três vezes contra o seu Postgres, com `tests | pass | fail | skipped`, dizendo se o R-res-5-bis RODOU (o papel efêmero criado, `rolsuper` e `rolbypassrls` falsos, medido acima que o teste os afere) ou foi pulado pelo motivo declarado "exige CREATE ROLE", e qual dos dois acontece na CI do objeto (o `DATABASE_URL` superusuário do job `backend`, lido no log); a M5a aplicada por você (o agregado standalone sem `withTenantRls`, alvo medido acima): o R-res-5-bis fica VERMELHO sob o papel sem bypass e o R-res-5 continua verde sob o superusuário (declarado no plano; diga se é isso), restaurada por blob; a matriz das mutações M5a, M5b (sem o filtro `tenant_id =`) e M5c (as duas) × {superusuário, `j12a2_c4b_rt`}, com vaza ou não, vermelho ou verde e o caso que acusa — toda mutação que vaza sem caso vermelho é `criterio_que_nao_pode_falhar`; e a regressão do isolamento do ciclo 1 por sonda sua: duas organizações, centavos adversariais, `group_by` `none`, `month` e `day`, conta alheia → `items` vazio e nunca 403, nos dois papéis, e as mutações do A14 (somar em `Number` antes do `round`; tirar `deleted_at IS NULL`). Vermelho-controle declarado pelo plano: no objeto do ciclo 1 o caso não existe e o código é o mesmo (o ciclo 2 não tocou `financial-entries`, medido acima); o vermelho é a M5a sob o papel, e a sua sonda sob a M5c acusa o vazamento, derruba com: `grep -i -E 'Item 3|R-res-5-bis|C4-01|R-res-5|A14|M5a|M5b|M5c|withTenantRls|j12a2_c4b_rt|rolbypassrls|exige CREATE ROLE|cross-tenant|group_by|vermelho|restaurad' C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a-ciclo2/c4b-evidencia.md`

Protocolo P1/P2/P3/P4/P7 do §C7.7, verbatim no bloco colado acima, com `<cadeira>` = `c4b`: evidência em `c4b-evidencia.md` após CADA item; `c4b-voto.json` nasce esqueleto com os três itens EM APURAÇÃO e o campo `arquivos_medidos` por item, cada item gravado ao ser medido, e fecha antes da mensagem final de 1 linha; o voto registra que ele é REFEITO (§C7 item 9(4)); sucessor de identidade nova re-executa os comandos registrados e só então mede a cauda; três itens exatos; PAUSA grava head, feito, falta, próximo comando e arquivos meio-escritos (inclusive o papel `j12a2_c4b_rt` e uma mutação não restaurada) e para. Queda vai a `00-quedas.md` do diretório deste ciclo (P6, pelo orquestrador); uma cadeira por vez (ordem do dono, mais estreita que a P5). Únicos outputs no repositório: `c4b-evidencia.md` e `c4b-voto.json` em `C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a-ciclo2/`; nunca commit, derruba com: `test -f C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a-ciclo2/c4b-voto.json`

## MEDIDO

Pré-voo deste mandato com as ferramentas copiadas sem mudança para a pasta do redator deste ciclo `C:/Users/AMP/erp-pausa-2026-10-03/redator-san312a-c2/` (diferença contra o ramo das ferramentas medida acima), executado com o cwd no worktree do objeto; o redator do ciclo 2 é `redator-san312a-c2-opus` (Claude Opus 5.5, nível menor declarado, identidade nova, não vota), que adaptou ao objeto do ciclo 2 os geradores r3 do ciclo 1 (`fab-red-san312a-r3-opus`, sobre os de `redator-san312a-r2-opus` e `fab-red-san312a-opus`) e executou cada comando deste mandato pelo gerador `C:/Users/AMP/erp-pausa-2026-10-03/redator-san312a-c2/gerar-c4b.sh`, medido por: `cd C:/Users/AMP/w-san312a && MANDATO_REFS=C:/Users/AMP/erp-pausa-2026-10-03/redator-san312a-c2/mandato-refs.sh bash C:/Users/AMP/erp-pausa-2026-10-03/redator-san312a-c2/mandato-preflight.sh C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a-ciclo2/00-mandatos/cadeira-c4b.md 459 2>&1; echo ec=$?`
```
COLAGEM    l.6-20: refs do PR #459 confere com a saida atual

PRE-VOO OK — C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a-ciclo2/00-mandatos/cadeira-c4b.md
ec=0
```
