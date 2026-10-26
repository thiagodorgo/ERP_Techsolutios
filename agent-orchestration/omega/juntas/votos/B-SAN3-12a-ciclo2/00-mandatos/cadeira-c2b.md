# Mandato — Cadeira C2b (C2 refeita) — B-SAN3-12a (junta de DINHEIRO, ciclo 2)

## MEDIDO

Estado do PR 459 no instante da redação, pela ferramenta `mandato-refs.sh` copiada sem mudança para a pasta própria do redator deste ciclo `C:/Users/AMP/erp-pausa-2026-10-03/redator-san312a-c2/`, com o cwd no worktree do objeto (o head do PR, a merge-base, os check-runs, e nenhuma ata ainda), medido por: `cd C:/Users/AMP/w-san312a && bash C:/Users/AMP/erp-pausa-2026-10-03/redator-san312a-c2/mandato-refs.sh 459`
```
# refs do PR #459 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato
# gerado em: 2026-10-26T05:25Z · repo: thiagodorgo/ERP_Techsolutios

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

O corpo desta cadeira existe no objeto e, descontados o frontmatter e o bloco de adaptação Codex do espelho, é IDÊNTICO entre os dois espelhos (comparação EOL-neutra; o arquivo inteiro difere por construção do espelho, e por isso não se publica hash); o número de linhas de cada espelho está na saída, e nenhum commit do ciclo 2 o tocou (a última linha conta os commits que o tocam até o objeto e até o objeto do ciclo 1, `<objeto>~4`), medido por: `cd C:/Users/AMP/w-san312a && diff <(tr -d '\r' < C:/Users/AMP/w-san312a/.claude/agents/especialistas/jurado-san312a-c2-permissao-e-auditoria.md | awk 'f; $0=="---"{n++; if(n==2) f=1}' | sed '/^$/d') <(tr -d '\r' < C:/Users/AMP/w-san312a/.agents/agents/especialistas/jurado-san312a-c2-permissao-e-auditoria.md | awk 'f; $0=="---"{n++; if(n==2) f=1}' | awk 'index($0,"Papel para o Codex"){s=1} s&&$0==""{s=0; next} !s' | sed '/^$/d') >/dev/null && echo 'IDENTICO corpo c2-permissao-e-auditoria' || echo 'DIVERGE corpo c2-permissao-e-auditoria'; wc -l < C:/Users/AMP/w-san312a/.claude/agents/especialistas/jurado-san312a-c2-permissao-e-auditoria.md; wc -l < C:/Users/AMP/w-san312a/.agents/agents/especialistas/jurado-san312a-c2-permissao-e-auditoria.md; echo "commits que tocam o corpo: até o objeto $(git rev-list --count 8a9fc1d8426426403f8642e263b3e932d1738716 -- C:/Users/AMP/w-san312a/.claude/agents/especialistas/jurado-san312a-c2-permissao-e-auditoria.md), até o objeto do ciclo 1 $(git rev-list --count 8a9fc1d8426426403f8642e263b3e932d1738716~4 -- C:/Users/AMP/w-san312a/.claude/agents/especialistas/jurado-san312a-c2-permissao-e-auditoria.md)"`
```
IDENTICO corpo c2-permissao-e-auditoria
366
372
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

Ciclo 2, pelo §C7 item 9: no diretório de votos do ciclo 1 (`B-SAN3-12a`) há voto e evidência só da C2 e da C4, os dois `REPROVADO` (o campo `voto` de cada JSON), e nenhum da C1 nem da C3, que o orquestrador segurou; o `arquivos_medidos` dos dois votos alcança o que o conserto tocou (o serviço de cheques e o de títulos); no diretório deste ciclo 2 (`B-SAN3-12a-ciclo2`) só há o diretório dos mandatos. Logo a C2 e a C4 são REFEITAS (regra (3)), com identidade nova (C2b e C4b), a C1 e a C3 votam pela primeira vez, e não há voto verde a carregar nem a revalidar; a C2b é a C2 refeita, focada no achado dela mais a regressão dos itens dela, medido por: `ls C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a | sed -e 's#^#C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a/#'; echo "votos do ciclo 1 por cadeira: $(ls C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a | grep -i -E '^c[1234]-voto\.json$' | tr '\n' ' ')"; node -e 'const fs=require("fs");for(const c of ["c2","c4"]){const j=JSON.parse(fs.readFileSync("C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a/"+c+"-voto.json","utf8").replace(String.fromCharCode(65279),""));const a=JSON.stringify(j.arquivos_medidos)+JSON.stringify((j.itens||[]).map(i=>i.arquivos_medidos||""));console.log(c+": voto="+j.voto+" alcança cheque.service.ts="+a.includes("cheque.service.ts")+" alcança financial-title(s)="+a.includes("financial-title"))}'; ls C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a-ciclo2 | sed -e 's#^#C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a-ciclo2/#'`
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

O que o plano do ciclo 2 manda a C2 refeita medir (a linha da C2 no C2.5) e a régua que ele escreveu para o achado C2-01 (a falha OPERACIONAL da auditoria é da pendência pré-existente e não reprova; reprova a entrada aceita pelo validador que derrube o rastro), linha e começo de cada; e a reprovação do ciclo 1 descreve o C2-01 (a linha do achado, cortada), medido por: `tr -d '\r' < C:/Users/AMP/w-san312a/docs/revisoes/SAN3/B-SAN3-12-plano.md | grep -n -i -o -E '\*\*C2 — permissão e auditoria — REFEITA[^:]{0,60}|\*\*Régua para a C2 refeita:\*\*[^;]{0,200}'; tr -d '\r' < C:/Users/AMP/w-san312a/agent-orchestration/omega/reprovacoes/R-B-SAN3-12a-ciclo1.md | grep -n -i -E '\*\*C2-01\*\*' | cut -c1-200`
```
999:**Régua para a C2 refeita:** falha **operacional** da auditoria (banco de auditoria, FK, RLS) é desta pendência pré-existente e **não reprova** (§C7.1-ter(a))
1056:**C2 — permissão e auditoria — REFEITA, identidade nova** (≠ `jurado-san312a-c2-opus`)
6:  - **C2-01** (bloqueia, dentro, não grave): justificativa com NUL (`\u0000`) passa no 10–500. O desvínculo grava 200 e `title_id=null`, e a auditoria `cheque.title_unlinked` não é gravada, po
```

O validador da justificativa no objeto (`parseUnlinkJustification` no serviço de cheques: a classe de controle proibida, o `isWellFormed` por tipo local e o `invalid_justification`; linhas da busca textual, cortadas) e, no objeto do ciclo 1 (`<objeto>~4`, o vermelho-controle deste mandato), a mesma função sem `isWellFormed` e sem a classe de controle (contagem 0 de cada no blob dele); o diff do ciclo 2 em `src/modules/cheques` e `src/modules/financial-titles` é só nos dois serviços (rotas, controllers e repositórios intocados: quem pode o quê não mudou por arquivo), medido por: `cd C:/Users/AMP/w-san312a && B4=$(git ls-tree 8a9fc1d8426426403f8642e263b3e932d1738716~4 -- C:/Users/AMP/w-san312a/src/modules/cheques/cheque.service.ts | awk '{print $3}'); tr -d '\r' < C:/Users/AMP/w-san312a/src/modules/cheques/cheque.service.ts | grep -n -i -E 'JUSTIFICATION_FORBIDDEN_CONTROL =|type WellFormedCheckable|export function parseUnlinkJustification|isWellFormed\(\) \|\||"invalid_justification",' | cut -c1-150; echo "no objeto do ciclo 1: isWellFormed=$(git cat-file blob "$B4" | grep -c -i 'isWellFormed') classe-de-controle=$(git cat-file blob "$B4" | grep -c -i 'JUSTIFICATION_FORBIDDEN_CONTROL')"; git diff --name-only 8a9fc1d8426426403f8642e263b3e932d1738716~4 8a9fc1d8426426403f8642e263b3e932d1738716 -- src/modules/cheques src/modules/financial-titles | sed -e 's#^#C:/Users/AMP/w-san312a/#'`
```
98:const JUSTIFICATION_FORBIDDEN_CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
101:type WellFormedCheckable = string & { isWellFormed(): boolean };
103:export function parseUnlinkJustification(value: unknown): string {
106:  if (!(normalized as WellFormedCheckable).isWellFormed() || JUSTIFICATION_FORBIDDEN_CONTROL.test(normalized)) {
110:      "invalid_justification",
no objeto do ciclo 1: isWellFormed=0 classe-de-controle=0
C:/Users/AMP/w-san312a/src/modules/cheques/cheque.service.ts
C:/Users/AMP/w-san312a/src/modules/financial-titles/financial-title.service.ts
```

Os casos do A30 (e o A7, a auditoria crítica do desvínculo, que o item 1 regride) existem no objeto, com o nome na linha do `test(`, nos dois arquivos que o plano nomeia, e o `-db` pula DECLARANDO quando falta `DATABASE_URL`; e o contrato do objeto diz a regra nova da justificativa (linha do `API_CONTRACTS.md`, cortada), medido por: `for f in C:/Users/AMP/w-san312a/tests/b-san3-12a-unlink-title.test.ts C:/Users/AMP/w-san312a/tests/b-san3-12a-pay-pending-cheque-db.test.ts; do echo "$f"; tr -d '\r' < $f | grep -n -i -o -E '^ *test\("(A30-[abc]|A7)[^"]{0,50}|skip: "Defina DATABASE_URL[^"]{0,40}'; done; tr -d '\r' < C:/Users/AMP/w-san312a/API_CONTRACTS.md | grep -n -i -E 'surrogate isolado' | cut -c1-200`
```
C:/Users/AMP/w-san312a/tests/b-san3-12a-unlink-title.test.ts
149:test("A30-a: justificativa com U+0000, surrogate isolado, con
323:test("A7: a entrada de auditoria do desvínculo é Crític
464:test("A30-b (HTTP): justificativa com NUL → 400 invalid_jus
C:/Users/AMP/w-san312a/tests/b-san3-12a-pay-pending-cheque-db.test.ts
17:skip: "Defina DATABASE_URL e aplique as migrations.
89:  test("A7 (db): o unlink-title pelo controller grava a audi
123:  test("A30-c (db): justificativa recusada (NUL, surrogate alto
533:  `{ justification }` (10–500 caracteres após o trim, e texto bem-formado: sem U+0000, sem surrogate isolado, sem controle
```

A pendência pré-existente com dono que recebe a falha operacional da auditoria (`P-AUDIT-CRITICA-NA-TRANSACAO`), no registro do objeto, com data e prioridade (linha e título), medido por: `tr -d '\r' < C:/Users/AMP/w-san312a/agent-orchestration/controle/pendencias.md | grep -n -i -E '^## P-AUDIT-CRITICA-NA-TRANSACAO \(' | cut -c1-160`
```
11819:## P-AUDIT-CRITICA-NA-TRANSACAO (2026-10-26) — evento de auditoria `critical` gravado DEPOIS do ato, em best-effort — MÉDIA
```

No catálogo do objeto, as duas chaves novas e as listas dos papéis que decidem a herança: `super_admin` e `platform_admin` recebem o próprio `PERMISSION_CATALOG` (a mesma referência), `tenant_admin` recebe `TENANT_ADMIN_PERMISSIONS` (derivado do catálogo por filtro) e o `finance` tem lista própria (linha de cada uma, pela busca textual), medido por: `tr -d '\r' < C:/Users/AMP/w-san312a/src/modules/core-saas/permissions/catalog.ts | grep -n -i -E '"(financial_entries:unreconcile|cheques:unlink_title)"|^  (super_admin|tenant_admin|platform_admin): PERMISSION_CATALOG|^  tenant_admin: TENANT_ADMIN_PERMISSIONS|^const TENANT_ADMIN_PERMISSIONS|^  finance: \[' | cut -c1-120`
```
153:  "financial_entries:unreconcile",
159:  "cheques:unlink_title",
414:const TENANT_ADMIN_PERMISSIONS = PERMISSION_CATALOG.filter(
419:  super_admin: PERMISSION_CATALOG,
420:  tenant_admin: TENANT_ADMIN_PERMISSIONS,
736:  platform_admin: PERMISSION_CATALOG,
819:  finance: [
```

O snapshot dos papéis, do head-base do bloco (`<objeto>~18`) ao objeto, por papel: tamanho antes e depois, chaves acrescentadas e retiradas (script de `node` lendo o blob do head-base pela entrada stdin e o arquivo do objeto no disco do worktree): só `super_admin`, `tenant_admin` e `platform_admin` mudam, cada um com exatamente as 2 chaves novas, e nenhum outro papel muda; e o ciclo 2 não tocou o snapshot nem o catálogo (0 caminho de `<objeto>~4` ao objeto), medido por: `cd C:/Users/AMP/w-san312a && B=$(git ls-tree -r 8a9fc1d8426426403f8642e263b3e932d1738716~18 -- tests/fixtures | awk '$4 ~ /role-catalog-contract/ {print $3}'); git cat-file blob "$B" | node -e 'const fs=require("fs");const a=JSON.parse(fs.readFileSync(0,"utf8"));const b=JSON.parse(fs.readFileSync("C:/Users/AMP/w-san312a/tests/fixtures/role-catalog-contract.snapshot.json","utf8"));const ra=a.ROLE_PERMISSIONS,rb=b.ROLE_PERMISSIONS;for(const r of Object.keys(rb)){const A=new Set(ra[r]||[]);const add=rb[r].filter(k=>!A.has(k));const S=new Set(rb[r]);const rem=(ra[r]||[]).filter(k=>!S.has(k));console.log(r+" "+(ra[r]||[]).length+" -> "+rb[r].length+" +["+add.join(",")+"] -["+rem.join(",")+"]")}'; echo "caminhos do ciclo 2 em fixtures/catálogo: $(git diff --name-only 8a9fc1d8426426403f8642e263b3e932d1738716~4 8a9fc1d8426426403f8642e263b3e932d1738716 -- tests/fixtures src/modules/core-saas | wc -l)"`
```
super_admin 198 -> 200 +[financial_entries:unreconcile,cheques:unlink_title] -[]
tenant_admin 185 -> 187 +[financial_entries:unreconcile,cheques:unlink_title] -[]
manager 139 -> 139 +[] -[]
technician 44 -> 44 +[] -[]
field_dispatcher 42 -> 42 +[] -[]
viewer 45 -> 45 +[] -[]
platform_admin 198 -> 200 +[financial_entries:unreconcile,cheques:unlink_title] -[]
operator 68 -> 68 +[] -[]
finance 61 -> 61 +[] -[]
inventory 17 -> 17 +[] -[]
field_technician 43 -> 43 +[] -[]
auditor 56 -> 56 +[] -[]
support 10 -> 10 +[] -[]
caminhos do ciclo 2 em fixtures/catálogo: 0
```

A migração de dados do bloco concede as 2 chaves só a `super_admin` e `tenant_admin` no banco (`platform_admin` é pseudo-papel sem linha), dentro de `BEGIN`/`COMMIT` e com `ON CONFLICT DO NOTHING` (linhas da busca textual no SQL do objeto, lido pelo nome da pasta sem o carimbo); e os arquivos-base que a decisão do dono (Q3) mandou emendar citam as 2 chaves (`RBAC_MATRIX.md` e `APPROVAL_LIMITS.md` do objeto; só os números de linha), medido por: `F=C:/Users/AMP/w-san312a/$(git -C C:/Users/AMP/w-san312a ls-tree -r --name-only 8a9fc1d8426426403f8642e263b3e932d1738716 -- prisma/migrations | grep -i 'grant_finance_unreconcile_and_cheque_unlink_permissions'); tr -d '\r' < "$F" | grep -n -i -E "^BEGIN;|^COMMIT;|r\.key IN|^ON CONFLICT"; echo "RBAC_MATRIX.md: $(tr -d '\r' < C:/Users/AMP/w-san312a/RBAC_MATRIX.md | grep -n -i -E 'financial_entries:unreconcile|cheques:unlink_title' | cut -d: -f1 | tr '\n' ' ')"; echo "APPROVAL_LIMITS.md: $(tr -d '\r' < C:/Users/AMP/w-san312a/APPROVAL_LIMITS.md | grep -n -i -E 'unreconcile|unlink_title' | cut -d: -f1 | tr '\n' ' ')"`
```
26:BEGIN;
32:ON CONFLICT (key) DO NOTHING;
39:   AND r.key IN ('super_admin', 'tenant_admin')
40:ON CONFLICT (role_id, permission_id) DO NOTHING;
42:COMMIT;
RBAC_MATRIX.md: 128 130 131
APPROVAL_LIMITS.md: 37
```

As ações de auditoria que o bloco grava, pela busca do git em `src` no worktree que está no objeto: `cheque.title_unlinked` e `cheque.bounced` no controller de cheques e `financial_entry.unreconciled` no de lançamentos (o `sed` põe o prefixo do worktree; linhas cortadas), medido por: `git -C C:/Users/AMP/w-san312a grep -n -i -E 'cheque\.title_unlinked|financial_entry\.unreconciled|cheque\.bounced' -- src | sed -e 's#^#C:/Users/AMP/w-san312a/#' | cut -c1-150`
```
C:/Users/AMP/w-san312a/src/modules/cheques/cheque.controller.ts:74:        action: "cheque.bounced",
C:/Users/AMP/w-san312a/src/modules/cheques/cheque.controller.ts:82:      await this.audit(request, "cheque.bounced", item);
C:/Users/AMP/w-san312a/src/modules/cheques/cheque.controller.ts:125:    action: "cheque.title_unlinked",
C:/Users/AMP/w-san312a/src/modules/cheques/cheque.service.ts:256:  // obrigatória; o controller grava a auditoria Crítica `cheque.title_unlinked`. C
C:/Users/AMP/w-san312a/src/modules/financial-entries/financial-entry.controller.ts:136:    action: item.reconciled ? "financial_entry.reconciled" : "f
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

Você é `jurado-san312a-c2b-opus` (identidade nova; o orquestrador confirma no disparo), a C2 REFEITA do ciclo 2 (§C7 item 9(3)); executor Claude Opus (subagente genérico, corpo lido do blob do objeto), modelo **Claude Opus**, nível menor DECLARADO (§C7.6), ou Codex GPT-5.6 Sol se o orquestrador o declarar no disparo; o seu corpo canônico é `C:/Users/AMP/w-san312a/.claude/agents/especialistas/jurado-san312a-c2-permissao-e-auditoria.md`, carregado **do blob do objeto** (o worktree está no objeto, medido acima; §A7). O corpo foi escrito para o ciclo 1: onde ele divergir deste mandato quanto a objeto, ciclo, itens, diretório de votos, régua, bases ou inelegíveis, vale este mandato. Na primeira linha de `c2b-evidencia.md`, declare executor efetivo, modelo, nível, objeto, `mandato_md5` deste arquivo (CR retirado antes do md5) e o veredito IDENTICO/DIVERGE do corpo que você carregou contra o blob do objeto, EOL-neutro. **Opus esgotado: PARE sem votar** e registre onde parou (§C7.6-bis); o sucessor de queda é outra identidade declarada. Inelegíveis por nome: `planejador-mestre` (Fable, plano v3), `planejador-san312-e1-fable` (E1 e E1-bis), `planejador-san312a-c2-fable` (auditoria e plano do ciclo 2), `crit-san312-pro`, `crit-san312-opus-r2`, `crit-san312-pro-r2`, `crit-san3-12-r2-pro`, `crit-san312a-e1-opus`, `dev-san312a-opus`, `dev-san312a-c2-opus` (dev do ciclo 2), `fab-red-san312a-opus`, `redator-san312a-r2-opus`, `fab-red-san312a-r3-opus`, `redator-san312a-c2-opus` (redigiu este mandato e executou as medições dele), o orquestrador, `inspetor-san312a-opus` (inspetor do ciclo 1), `jurado-san312a-c2-opus` e `jurado-san312a-c4-opus` (os achadores do ciclo 1), e as outras identidades deste ciclo, `inspetor-san312a-c2-opus`, `jurado-san312a-c1-opus`, `jurado-san312a-c3-opus` e `jurado-san312a-c4b-opus`; se o seu nome coincidir, pare. Monocultura declarada: o dev do ciclo 2 e as identidades desta junta rodam em Claude Opus, salvo a cadeira que o orquestrador declarar em Codex. O plano do ciclo 2 (auditoria C2.0 e critérios), o relatório do dev (seção "Ciclo 2") e a reprovação do ciclo 1 são **A RE-VERIFICAR**, derruba com: `head -1 C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a-ciclo2/c2b-evidencia.md | grep -i -E 'executor|Opus|Sol|mandato_md5|objeto|IDENTICO|DIVERGE'`

A legalidade vem antes do mérito: parecer `insp-san312a-c2-parecer.md` do inspetor `inspetor-san312a-c2-opus`, no diretório deste ciclo, com LIBERADO ou LIBERADO COM RESSALVA nomeando você, o seu executor, o seu worktree, os seus containers e a sua vez (uma cadeira por vez); o objeto é o head do PR 459 (medido acima), com todos os check-runs concluídos (head que andou bloqueia o início). Régua: bloco de DINHEIRO e de PERMISSÃO, **unanimidade das 4 cadeiras do ciclo 2 com veto** (C1, C2b, C3 e C4b; §C7 item 8(1)); **ciclo 2**: todo `bloqueia` com escopo `dentro-do-bloco` ainda reprova, grave ou não (§C7 item 8(2)); você é a cadeira VERMELHA refeita (§C7 item 9(3)), com a régua do ciclo corrente, focada no achado C2-01 (agora A30) mais a regressão dos itens 1 e 2 da C2; a régua do C2-01 é a que o plano escreveu (medida acima): falha operacional da auditoria (banco de auditoria, FK, RLS) é da `P-AUDIT-CRITICA-NA-TRANSACAO`, pré-existente com dono, e não reprova; reprova a entrada aceita pelo validador com a qual o desvínculo grava sem rastro. A matéria de A29 (corrida, desfecho), A13-bis e R-res-5-bis é da C4b, a de ordem de travas da C1 e a de suíte, escopo e contrato da C3: de A29 você mede só que ele não muda quem pode o quê. Todo achado declara gravidade, classe, escopo, N e forma; `pre-existente` exige evidência de data ou origem e pendência com dono (§C7.1-ter(a)); "não consigo medir" item seu é REPROVADO; não proponha correção (§C7.4-bis), não reabra as decisões do dono nem o plano do ciclo 2 (o A30 é leitura do planejador que o dono desfaz numa linha: julgue se o código cumpre o A30, não se o A30 é bom), não cobre KPI, não leia votos e evidências de outras cadeiras de nenhum ciclo (a reprovação e o plano são os seus insumos do achado); o voto declara `arquivos_medidos` (§C7 item 9 (0)) POR ITEM, honesto, e `**` no item que rodar `npm test`, `check` ou `build`, derruba com: `grep -i -E 'legalidade|A RE-VERIFICAR|gravidade|classe|escopo|arquivos_medidos|ciclo 2|refeita|P-AUDIT-CRITICA-NA-TRANSACAO|4 cadeiras' C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a-ciclo2/c2b-voto.json`

Terreno: worktree exclusivo `C:/Users/AMP/j12a2-c2b-wt`, detached no objeto, com `npm ci` próprio (e `npx prisma generate`) e zero junction de `node_modules` (§C7.1-ter(c)), removido só por `git worktree remove --force` depois de conferir que nenhum processo o usa. Postgres 16 `j12a2-c2b-pg` e Redis 7 `j12a2-c2b-redis` próprios, só em `127.0.0.1`, portas altas testadas antes (candidatas 47823 e 47824), senha aleatória só por ambiente; bancos extras `j12a2_c2b_*`; `DATABASE_URL` e `REDIS_URL` seus como prefixo de **todo** comando `node`/`npm`; `npx prisma migrate deploy` e, onde o item pedir, `npm run db:provision-rbac` no SEU banco. Antes de subir: memória de commit livre ≥ 4 GB (P8 (c)), no máximo 2 trabalhos Docker na máquina contando o seu (medido acima), disco ≥ 7 GB (abaixo disso, PARE e registre); faltando memória ou teto, espere. Uma cadeira por vez: você só sobe quando o inspetor disser que é a sua vez. Nunca a base viva (`erp-postgres`, `erp-redis`, `erp-postgres-alt`), nem 5432, 6379, 3000, 5173, 5050, 8899, 55432, 55412, 55413; nunca `prune` nem container alheio. Mutação só no seu worktree, uma por vez, âncora única com prova de aplicação (CRLF incluso), restauro provado por `git hash-object` = blob do objeto; o vermelho-controle por `git checkout <objeto>~4 -- <caminho>` (o objeto do ciclo 1, medido acima) ou pelo head-base que o item nomeia, no seu worktree, restaurado e provado; scripts e sondas numa pasta sua `C:/Users/AMP/erp-pausa-2026-10-03/j12a2-c2b/`, para que a evidência seja re-executável, derruba com: `grep -i -E 'j12a2-c2b-wt|j12a2-c2b-pg|j12a2-c2b-redis|j12a2_c2b_|127\.0\.0\.1|junction|commit livre|4 GB|7 GB|erp-|5432|6379|hash-object|<objeto>~4|head-base|teardown' C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a-ciclo2/c2b-evidencia.md`

Item 1 de 3 (A30-a, A30-b e A30-c — o achado C2-01: toda justificativa aceita pelo validador grava o desvínculo COM rastro, e a recusada não grava nada; mais a regressão do rastro do item 3 da C2, o A7): `C:/Users/AMP/w-san312a/tests/b-san3-12a-unlink-title.test.ts` em memória e `C:/Users/AMP/w-san312a/tests/b-san3-12a-pay-pending-cheque-db.test.ts` contra o seu Postgres, com `tests | pass | fail | skipped` (o A30-c e o A7 rodados, não pulados); uma sonda SUA, por script, que enumera as entradas por propriedade e não por amostra — cada código de U+0000 a U+00FF, os surrogates isolados (alto e baixo, no início, no meio e no fim), pares válidos (emoji), NFD, U+2028 e U+2029, U+FEFF, U+FFFE e U+FFFF, HTML, TAB, LF e CR, e os limites 9, 10, 500 e 501 —, cada uma pela rota `unlink-title` como `tenant_admin` no seu Postgres: o veredito do validador, o status, o `title_id` relido e o número de linhas `cheque.title_unlinked` gravadas (`severity` `critical`, `metadata.justification` igual à enviada, chaves do `metadata` contra uma allowlist que você declara do plano, nenhum `tenant_id`, token, path, bucket, `storage key` ou base64, §2.8); a propriedade do C2-01 fecha se o conjunto "aceita pelo validador E 200 E 0 rastro" é VAZIO (N e a lista), e uma recusa de entrada legítima (acentos, emoji, HTML, TAB, LF, CR) é achado; diga se o 400 mantém a precedência do A30-b (403 da rota → 400 da justificativa → 404 → 422) e se o contrato (medido acima) diz o que o código faz. Mutações (≥ 1/3 do plano re-executadas, mais a sua): tirar o `isWellFormed`, tirar a classe de controle, e a sua (aceitar o DEL). Vermelho-controle: com `C:/Users/AMP/w-san312a/src/modules/cheques/cheque.service.ts` do objeto do ciclo 1 (`<objeto>~4`, medido acima) no seu worktree, o A30-a, o A30-b e o A30-c do objeto ficam vermelhos pela asserção e a sua sonda acusa NUL com 200 e 0 rastro, derruba com: `grep -i -E 'Item 1|A30-a|A30-b|A30-c|C2-01|A7|isWellFormed|surrogate|U\+0000|invalid_justification|title_unlinked|critical|metadata|allowlist|vazio|vermelho|<objeto>~4' C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a-ciclo2/c2b-evidencia.md`

Item 2 de 3 (regressão do item 1 da C2 — quem pode o quê com `cheques:unlink_title` e `financial_entries:unreconcile`, por ator, sequencial e sob a barreira do A27: A5, A6, A6-bis, D1, A9 a A12, A18; e o A29 não muda quem pode o quê): `C:/Users/AMP/w-san312a/tests/b-san3-12a-unreconcile-policy.test.ts` e `C:/Users/AMP/w-san312a/tests/core-saas.test.ts` com `tests | pass | fail | skipped`; a matriz efetiva gerada por script seu, para cada papel do catálogo (os 13 do snapshot, medidos acima) e para um usuário `finance` + `manager`, no seu Postgres migrado e provisionado, POR AMOSTRAGEM de pelo menos 1/3 das células (sorteio por semente declarada, e as células do 403 `unreconcile_forbidden`, do 403 `unlink_requires_privilege` e do 422 `cheque_linked_unlink_first` sempre dentro): status e `reason` por célula comparados com a §4.8 do plano e a nota da `RBAC_MATRIX.md`; e, para o PATCH de `amount`, o PATCH só de `description` e o `DELETE` de título, com e sem cheque pendente, por papel: status e `reason` no objeto IGUAIS aos do objeto do ciclo 1 (`<objeto>~4`, num worktree ou checkout seu) — o 403 de quem não tem a permissão e o 422 `title_has_pending_cheque` de quem tem, o mesmo conjunto de papéis nos dois (o ciclo 2 tocou só os dois serviços, medido acima). Mutação: a sua (a política do desfazer lida sem exigir o papel `finance`). Vermelho-controle: com `src/modules/cheques` do head-base da emenda `<objeto>~12` no seu worktree, o PATCH do `tenant_admin` desvincula com 200 e o A6-bis do objeto fica vermelho pela asserção; e a sua matriz acusa uma célula fabricada por você, derruba com: `grep -i -E 'Item 2|matriz|amostragem|semente|unreconcile_forbidden|unlink_requires_privilege|cheque_linked_unlink_first|title_has_pending_cheque|A6-bis|A29|<objeto>~4|<objeto>~12|vermelho' C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a-ciclo2/c2b-evidencia.md`

Item 3 de 3 (regressão do item 2 da C2 — F5: `super_admin` e `platform_admin` +2, sem ampliar quem tem o privilégio além do que o dono aprovou; snapshot × catálogo × migração): re-meça por script seu o snapshot do head-base do bloco ao objeto (medido acima: só os três admins mudam, +2 cada, e o ciclo 2 não tocou snapshot nem catálogo) e a POSIÇÃO das 2 chaves; prove por `node --import tsx -e` a identidade de referência de `super_admin` e `platform_admin` com o catálogo; no seu Postgres só migrado (sem papéis) e depois de `db:provision-rbac`, a consulta papel × permissão das 2 chaves (antes 0; depois só `super_admin` e `tenant_admin`), o `permission-catalog-db-parity` com `RBAC_DB_PARITY=1` e o `core-saas-role-authority` com banco e sem `CORE_SAAS_PERSISTENCE=prisma`, e diga, chave a chave, se a distribuição medida é a que a `RBAC_MATRIX.md`, o `APPROVAL_LIMITS.md` (linhas medidas acima) e as decisões literais do dono dizem — sem mais, sem menos (uma concessão a mais é `grave: quebra de permissão`). Mutações (≥ 1/3 das do ciclo 1, mais a sua): a concessão ao `finance` no catálogo, uma das chaves fora de `platform_admin`, e a sua (a migração concedendo também ao `finance`, numa cópia sua aplicada ao seu banco). Vermelho-controle: com o snapshot do head-base do bloco (`<objeto>~18`), o `core-saas-role-authority` contra o catálogo do objeto fica vermelho pela asserção do caso do contrato de deploy, derruba com: `grep -i -E 'Item 3|F5|super_admin|platform_admin|tenant_admin|finance|snapshot|posição|PERMISSION_CATALOG|provision|db-parity|role-authority|RBAC_MATRIX|APPROVAL_LIMITS|vermelho|<objeto>~18' C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a-ciclo2/c2b-evidencia.md`

Protocolo P1/P2/P3/P4/P7 do §C7.7, verbatim no bloco colado acima, com `<cadeira>` = `c2b`: evidência em `c2b-evidencia.md` após CADA item; `c2b-voto.json` nasce esqueleto com os três itens EM APURAÇÃO e o campo `arquivos_medidos` por item, cada item gravado ao ser medido, e fecha antes da mensagem final de 1 linha; o voto registra que ele é REFEITO (§C7 item 9(4): a ata diz, por cadeira, carregado, revalidado ou refeito); sucessor de identidade nova re-executa os comandos registrados e só então mede a cauda; três itens exatos; PAUSA grava head, feito, falta, próximo comando e arquivos meio-escritos e para. Queda vai a `00-quedas.md` do diretório deste ciclo (P6, pelo orquestrador); uma cadeira por vez (ordem do dono, mais estreita que a P5). Únicos outputs no repositório: `c2b-evidencia.md` e `c2b-voto.json` em `C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a-ciclo2/`; nunca commit, derruba com: `test -f C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a-ciclo2/c2b-voto.json`

## MEDIDO

Pré-voo deste mandato com as ferramentas copiadas sem mudança para a pasta do redator deste ciclo `C:/Users/AMP/erp-pausa-2026-10-03/redator-san312a-c2/` (diferença contra o ramo das ferramentas medida acima), executado com o cwd no worktree do objeto; o redator do ciclo 2 é `redator-san312a-c2-opus` (Claude Opus 5.5, nível menor declarado, identidade nova, não vota), que adaptou ao objeto do ciclo 2 os geradores r3 do ciclo 1 (`fab-red-san312a-r3-opus`, sobre os de `redator-san312a-r2-opus` e `fab-red-san312a-opus`) e executou cada comando deste mandato pelo gerador `C:/Users/AMP/erp-pausa-2026-10-03/redator-san312a-c2/gerar-c2b.sh`, medido por: `cd C:/Users/AMP/w-san312a && MANDATO_REFS=C:/Users/AMP/erp-pausa-2026-10-03/redator-san312a-c2/mandato-refs.sh bash C:/Users/AMP/erp-pausa-2026-10-03/redator-san312a-c2/mandato-preflight.sh C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a-ciclo2/00-mandatos/cadeira-c2b.md 459 2>&1; echo ec=$?`
```
COLAGEM    l.6-20: refs do PR #459 confere com a saida atual

PRE-VOO OK — C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a-ciclo2/00-mandatos/cadeira-c2b.md
ec=0
```
