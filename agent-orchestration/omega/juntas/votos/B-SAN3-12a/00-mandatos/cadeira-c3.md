# Mandato — Cadeira C3 — B-SAN3-12a (junta de DINHEIRO, ciclo 1)

## MEDIDO

Estado do PR 459 no instante da redação, pela ferramenta `mandato-refs.sh` copiada sem mudança para a pasta própria do redator `C:/Users/AMP/erp-pausa-2026-10-03/redator-san312a/`, com o cwd no worktree do objeto (o head do PR, a merge-base, os check-runs, e nenhuma ata ainda), medido por: `cd C:/Users/AMP/w-san312a && bash C:/Users/AMP/erp-pausa-2026-10-03/redator-san312a/mandato-refs.sh 459`
```
# refs do PR #459 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato
# gerado em: 2026-10-26T01:46Z · repo: thiagodorgo/ERP_Techsolutios

ramo:            feat/web-financeiro-baixa-e-contas-12a
base:            origin/main
estado:          OPEN | rascunho=false | MERGEABLE
head do PR:      04b8a667780930050c8af2c77c323b81fe8794bb
merge-base:      b2f8e6cf5bb1bd044887ab0829821b089530d9c5
merge commit:    <ainda nao mergeado>
check-runs:      total=14 nao-verdes=0 pendentes=0
approved_head:   AUSENTE — nenhuma ata nomeia nem menciona #459
                 (a junta nao votou, ou a ata nao esta em origin/main nem no head do PR)

```

O ramo remoto aponta para o mesmo SHA que o PR declara como head (segunda fonte do objeto), medido por: `cd C:/Users/AMP/w-san312a && test "$(git ls-remote origin refs/heads/feat/web-financeiro-baixa-e-contas-12a | cut -f1)" = 04b8a667780930050c8af2c77c323b81fe8794bb && echo "ls-remote = head do PR"`
```
ls-remote = head do PR
```

Os check-runs do head do PR estão todos concluídos e `SUCCESS` (o head confere, o total, os fora de `COMPLETED`/`SUCCESS` e os nomes com a conclusão, pelo `statusCheckRollup`), e os runs do objeto (agora que o merge da `main` deixou o PR sem conflito, há o do gatilho `push` e o do `pull_request`, os dois listados com o estado e a conclusão); os ids de run não são citados aqui (corrida numérica longa é cobrada como SHA pelo pré-voo) e se obtêm por `gh run list --commit`, medido por: `cd C:/Users/AMP/w-san312a && gh pr view 459 --json headRefOid,statusCheckRollup --jq '(.headRefOid == "04b8a667780930050c8af2c77c323b81fe8794bb"), (.statusCheckRollup|length), ([.statusCheckRollup[] | select(.status != "COMPLETED" or .conclusion != "SUCCESS")] | length), ([.statusCheckRollup[] | .name + ":" + .conclusion] | sort | join(", "))'; gh run list --commit 04b8a667780930050c8af2c77c323b81fe8794bb --json workflowName,event,status,conclusion --jq '.[] | .workflowName + " " + .event + " " + .status + " " + .conclusion'`
```
true
14
0
authority-portal:SUCCESS, authority-portal:SUCCESS, backend-postgres:SUCCESS, backend-postgres:SUCCESS, backend:SUCCESS, backend:SUCCESS, docker:SUCCESS, docker:SUCCESS, flutter:SUCCESS, flutter:SUCCESS, frontend:SUCCESS, frontend:SUCCESS, owner-portal:SUCCESS, owner-portal:SUCCESS
ci pull_request completed success
ci push completed success
```

O worktree `C:/Users/AMP/w-san312a` (o do dev, que o orquestrador nomeou para esta junta) está no objeto e sem modificação rastreada (0 linhas no status sem não rastreados); o único não rastreado é o diretório de votos desta junta; por isso as leituras de arquivo deste mandato, feitas no disco desse worktree com caminho absoluto e com o CR retirado, leem o conteúdo do objeto (o `sed` põe o prefixo do worktree no caminho que o `git status` imprime), medido por: `cd C:/Users/AMP/w-san312a && test "$(git rev-parse HEAD)" = 04b8a667780930050c8af2c77c323b81fe8794bb && echo 'HEAD = objeto'; git status --porcelain --untracked-files=no | wc -l; git status --short | sed -E 's#^(..) (.*)#\1 C:/Users/AMP/w-san312a/\2#'`
```
HEAD = objeto
0
?? C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a/
```

O objeto é o commit do corpo da C4 (1 pai), em cima do merge da `main` no ramo, `<objeto>~1` (2 pais), que era o objeto da r2 desta junta. Pelo 1º pai, `<objeto>~2` é o commit dos corpos C1, C2 e C3 (o objeto da fábrica na r1) e `<objeto>~3` é a cerca da fábrica. Os três trechos do delta: da cerca a `<objeto>~2`, 1 commit sem merge, exatamente os 6 arquivos dos 3 corpos nos dois espelhos, nenhum sob `src`, `tests` ou `prisma`; de `<objeto>~2` a `<objeto>~1`, o merge, que traz a `main` (os caminhos dele estão contados, e os que caem sob `src`, `tests` e `prisma` são os da `main` que entrou; o conteúdo próprio do merge é medido na unidade do merge); de `<objeto>~1` ao objeto, 1 commit sem merge, exatamente os 2 arquivos do corpo da C4 nos dois espelhos, nenhum sob `src`, `tests` ou `prisma` (o assunto de cada commit abaixo; o `sed` põe o prefixo do worktree no caminho impresso), medido por: `cd C:/Users/AMP/w-san312a && echo "pais do objeto: $(git rev-list --parents -n1 04b8a667780930050c8af2c77c323b81fe8794bb | wc -w | awk '{print $1-1}'); pais de <objeto>~1: $(git rev-list --parents -n1 04b8a667780930050c8af2c77c323b81fe8794bb~1 | wc -w | awk '{print $1-1}')"; git merge-base --is-ancestor 04b8a667780930050c8af2c77c323b81fe8794bb~3 04b8a667780930050c8af2c77c323b81fe8794bb~2 && echo 'cerca ancestral de <objeto>~2'; echo "cerca..<objeto>~2: $(git rev-list --count 04b8a667780930050c8af2c77c323b81fe8794bb~3..04b8a667780930050c8af2c77c323b81fe8794bb~2) commit(s), $(git rev-list --merges --count 04b8a667780930050c8af2c77c323b81fe8794bb~3..04b8a667780930050c8af2c77c323b81fe8794bb~2) merge(s)"; git log -1 --format=%s 04b8a667780930050c8af2c77c323b81fe8794bb~2; git diff --name-only 04b8a667780930050c8af2c77c323b81fe8794bb~3 04b8a667780930050c8af2c77c323b81fe8794bb~2 | sed -e 's#^#C:/Users/AMP/w-san312a/#'; echo "caminhos src/tests/prisma no delta dos corpos C1-C3: $(git diff --name-only 04b8a667780930050c8af2c77c323b81fe8794bb~3 04b8a667780930050c8af2c77c323b81fe8794bb~2 -- src tests prisma | wc -l)"; git log -1 --format=%s 04b8a667780930050c8af2c77c323b81fe8794bb~1; echo "<objeto>~2..<objeto>~1 (o merge): $(git diff --name-only 04b8a667780930050c8af2c77c323b81fe8794bb~2 04b8a667780930050c8af2c77c323b81fe8794bb~1 | wc -l) caminhos, $(git diff --name-only 04b8a667780930050c8af2c77c323b81fe8794bb~2 04b8a667780930050c8af2c77c323b81fe8794bb~1 -- src tests prisma | wc -l) sob src/tests/prisma"; git log -1 --format=%s 04b8a667780930050c8af2c77c323b81fe8794bb; git diff --name-only 04b8a667780930050c8af2c77c323b81fe8794bb~1 04b8a667780930050c8af2c77c323b81fe8794bb | sed -e 's#^#C:/Users/AMP/w-san312a/#'; echo "caminhos src/tests/prisma no commit da C4: $(git diff --name-only 04b8a667780930050c8af2c77c323b81fe8794bb~1 04b8a667780930050c8af2c77c323b81fe8794bb -- src tests prisma | wc -l)"`
```
pais do objeto: 1; pais de <objeto>~1: 2
cerca ancestral de <objeto>~2
cerca..<objeto>~2: 1 commit(s), 0 merge(s)
docs(junta): corpos das 3 cadeiras da junta de dinheiro do B-SAN3-12a
C:/Users/AMP/w-san312a/.agents/agents/especialistas/jurado-san312a-c1-dinheiro-e-concorrencia.md
C:/Users/AMP/w-san312a/.agents/agents/especialistas/jurado-san312a-c2-permissao-e-auditoria.md
C:/Users/AMP/w-san312a/.agents/agents/especialistas/jurado-san312a-c3-regressao-escopo-contrato.md
C:/Users/AMP/w-san312a/.claude/agents/especialistas/jurado-san312a-c1-dinheiro-e-concorrencia.md
C:/Users/AMP/w-san312a/.claude/agents/especialistas/jurado-san312a-c2-permissao-e-auditoria.md
C:/Users/AMP/w-san312a/.claude/agents/especialistas/jurado-san312a-c3-regressao-escopo-contrato.md
caminhos src/tests/prisma no delta dos corpos C1-C3: 0
chore(merge): origin/main no ramo do B-SAN3-12a — registros apensados nos dois lados, índice regenerado
<objeto>~2..<objeto>~1 (o merge): 121 caminhos, 30 sob src/tests/prisma
docs(junta): corpo da cadeira C4 da junta de dinheiro do B-SAN3-12a
C:/Users/AMP/w-san312a/.agents/agents/especialistas/jurado-san312a-c4-isolamento-e-invariantes.md
C:/Users/AMP/w-san312a/.claude/agents/especialistas/jurado-san312a-c4-isolamento-e-invariantes.md
caminhos src/tests/prisma no commit da C4: 0
```

O head-base do BLOCO (o ponto em que o ramo saiu da `main`) é `<objeto>~14` pelo 1º pai, medido por comando e SEM a merge-base com a `origin/main`: ele é a merge-base dos dois pais do merge `<objeto>~1` e ancestral da ponta da `main` que entrou (`<objeto>~1^2`); do head-base ao objeto, pelo 1º pai, há 14 commits, dos quais 1 merge (o `<objeto>~1`; acima dele só o commit da C4, e os 12 de baixo são do bloco, sem merge); a merge-base do `mandato-refs.sh` com a `origin/main` é a PONTA da `main` que entrou (o 2º pai do merge), e não o head-base do bloco (as linhas do `test`). O diff do BLOCO é `<objeto>~14..<objeto>~2` (os commits do ramo antes do merge), e o diff do PR (merge-base..objeto) é a união dele com os 2 arquivos do commit da C4 (os conjuntos contados abaixo, e a igualdade provada). O head-base da EMENDA (o head em que a crítica da E1 mediu o D1-TOCTOU, antes do A27 e da D1) é `<objeto>~8` pelo 1º pai (`<objeto>~2~6`), e o commit do A27 e da D1 é `<objeto>~7` (o assunto de cada um abaixo); SHA que não sai do `mandato-refs.sh 459` não se publica, e por isso o head-base, os pais e esses dois são citados em forma relativa; a última linha diz quantos commits a `main` que entrou tem depois do head-base e quantos caminhos dela caem no diff do bloco (os arquivos de registro e o plano da rodada, que o merge juntou), medido por: `cd C:/Users/AMP/w-san312a && test "$(git merge-base 04b8a667780930050c8af2c77c323b81fe8794bb~2 04b8a667780930050c8af2c77c323b81fe8794bb~1^2)" = "$(git rev-parse 04b8a667780930050c8af2c77c323b81fe8794bb~14)" && echo 'merge-base dos dois pais do merge = <objeto>~14 (head-base do bloco)'; test "$(git merge-base 04b8a667780930050c8af2c77c323b81fe8794bb origin/main)" = "$(git rev-parse 04b8a667780930050c8af2c77c323b81fe8794bb~1^2)" && echo 'merge-base com a origin/main = 2º pai do merge (ponta da main que entrou), não o head-base do bloco'; test "$(git rev-parse 04b8a667780930050c8af2c77c323b81fe8794bb~1^2)" = b2f8e6cf5bb1bd044887ab0829821b089530d9c5 && echo '2º pai do merge = merge-base do mandato-refs.sh'; git merge-base --is-ancestor 04b8a667780930050c8af2c77c323b81fe8794bb~14 04b8a667780930050c8af2c77c323b81fe8794bb~1^2 && echo 'head-base do bloco ancestral da main que entrou'; echo "1º pai, head-base..objeto: $(git rev-list --first-parent --count 04b8a667780930050c8af2c77c323b81fe8794bb~14..04b8a667780930050c8af2c77c323b81fe8794bb) commits, $(git rev-list --first-parent --merges --count 04b8a667780930050c8af2c77c323b81fe8794bb~14..04b8a667780930050c8af2c77c323b81fe8794bb) merge(s); head-base..<objeto>~2: $(git rev-list --merges --count 04b8a667780930050c8af2c77c323b81fe8794bb~14..04b8a667780930050c8af2c77c323b81fe8794bb~2) merge(s)"; echo "caminhos do diff do bloco: $(git diff --name-only 04b8a667780930050c8af2c77c323b81fe8794bb~14 04b8a667780930050c8af2c77c323b81fe8794bb~2 | wc -l); do commit da C4: $(git diff --name-only 04b8a667780930050c8af2c77c323b81fe8794bb~1 04b8a667780930050c8af2c77c323b81fe8794bb | wc -l); do diff do PR: $(git diff --name-only b2f8e6cf5bb1bd044887ab0829821b089530d9c5 04b8a667780930050c8af2c77c323b81fe8794bb | wc -l)"; diff <( (git diff --name-only 04b8a667780930050c8af2c77c323b81fe8794bb~14 04b8a667780930050c8af2c77c323b81fe8794bb~2; git diff --name-only 04b8a667780930050c8af2c77c323b81fe8794bb~1 04b8a667780930050c8af2c77c323b81fe8794bb) | sort -u) <(git diff --name-only b2f8e6cf5bb1bd044887ab0829821b089530d9c5 04b8a667780930050c8af2c77c323b81fe8794bb | sort -u) >/dev/null && echo 'diff do PR = diff do bloco + commit da C4 (conjunto IGUAL)'; git log -1 --format=%s 04b8a667780930050c8af2c77c323b81fe8794bb~8; git log -1 --format=%s 04b8a667780930050c8af2c77c323b81fe8794bb~7; test "$(git rev-parse 04b8a667780930050c8af2c77c323b81fe8794bb~8)" = "$(git rev-parse 04b8a667780930050c8af2c77c323b81fe8794bb~2~6)" && echo '<objeto>~8 = <objeto>~2~6'; git merge-base --is-ancestor 04b8a667780930050c8af2c77c323b81fe8794bb~14 04b8a667780930050c8af2c77c323b81fe8794bb~8 && echo 'head-base do bloco ancestral do head-base da emenda'; echo "a main que entrou: $(git rev-list --count 04b8a667780930050c8af2c77c323b81fe8794bb~14..04b8a667780930050c8af2c77c323b81fe8794bb~1^2) commits depois do head-base, $(git diff --name-only 04b8a667780930050c8af2c77c323b81fe8794bb~14 04b8a667780930050c8af2c77c323b81fe8794bb~1^2 | wc -l) caminhos, $(git diff --name-only 04b8a667780930050c8af2c77c323b81fe8794bb~14 04b8a667780930050c8af2c77c323b81fe8794bb~1^2 -- C:/Users/AMP/w-san312a/tests | wc -l) sob tests; em comum com o diff do bloco:"; comm -12 <(git diff --name-only 04b8a667780930050c8af2c77c323b81fe8794bb~14 04b8a667780930050c8af2c77c323b81fe8794bb~1^2 | sort) <(git diff --name-only 04b8a667780930050c8af2c77c323b81fe8794bb~14 04b8a667780930050c8af2c77c323b81fe8794bb~2 | sort) | sed -e 's#^#C:/Users/AMP/w-san312a/#'`
```
merge-base dos dois pais do merge = <objeto>~14 (head-base do bloco)
merge-base com a origin/main = 2º pai do merge (ponta da main que entrou), não o head-base do bloco
2º pai do merge = merge-base do mandato-refs.sh
head-base do bloco ancestral da main que entrou
1º pai, head-base..objeto: 14 commits, 1 merge(s); head-base..<objeto>~2: 0 merge(s)
caminhos do diff do bloco: 67; do commit da C4: 2; do diff do PR: 69
diff do PR = diff do bloco + commit da C4 (conjunto IGUAL)
docs(revisoes): relatório do dev do B-SAN3-12a — critérios, 35 mutações, bateria base × head e as falsificações F1–F9
fix(financeiro): CAS do título lido no 1º vínculo, no cancel e no delete do cheque (A27) e o PATCH privilegiado que tira o vínculo responde 422 (D1) — Emenda E1/E1-bis do B-SAN3-12a
<objeto>~8 = <objeto>~2~6
head-base do bloco ancestral do head-base da emenda
a main que entrou: 3 commits depois do head-base, 121 caminhos, 24 sob tests; em comum com o diff do bloco:
C:/Users/AMP/w-san312a/agent-orchestration/controle/decisoes.md
C:/Users/AMP/w-san312a/agent-orchestration/controle/pendencias-indice.md
C:/Users/AMP/w-san312a/agent-orchestration/controle/pendencias.md
C:/Users/AMP/w-san312a/agent-orchestration/docs/status-geral.md
C:/Users/AMP/w-san312a/docs/revisoes/SAN3/PLANO_SAN3.md
```

O corpo desta cadeira existe no objeto e, descontados o frontmatter e o bloco de adaptação Codex do espelho, é IDÊNTICO entre os dois espelhos (comparação EOL-neutra; o arquivo inteiro difere por construção do espelho, e por isso não se publica hash); o número de linhas de cada espelho está na saída, e o corpo nasceu no commit dos corpos (a última linha conta os commits que o tocam), medido por: `cd C:/Users/AMP/w-san312a && diff <(tr -d '\r' < C:/Users/AMP/w-san312a/.claude/agents/especialistas/jurado-san312a-c3-regressao-escopo-contrato.md | awk 'f; $0=="---"{n++; if(n==2) f=1}' | sed '/^$/d') <(tr -d '\r' < C:/Users/AMP/w-san312a/.agents/agents/especialistas/jurado-san312a-c3-regressao-escopo-contrato.md | awk 'f; $0=="---"{n++; if(n==2) f=1}' | awk 'index($0,"Papel para o Codex"){s=1} s&&$0==""{s=0; next} !s' | sed '/^$/d') >/dev/null && echo 'IDENTICO corpo c3-regressao-escopo-contrato' || echo 'DIVERGE corpo c3-regressao-escopo-contrato'; wc -l < C:/Users/AMP/w-san312a/.claude/agents/especialistas/jurado-san312a-c3-regressao-escopo-contrato.md; wc -l < C:/Users/AMP/w-san312a/.agents/agents/especialistas/jurado-san312a-c3-regressao-escopo-contrato.md; echo "commits que tocam o corpo: $(git rev-list --count 04b8a667780930050c8af2c77c323b81fe8794bb -- C:/Users/AMP/w-san312a/.claude/agents/especialistas/jurado-san312a-c3-regressao-escopo-contrato.md)"`
```
IDENTICO corpo c3-regressao-escopo-contrato
370
376
commits que tocam o corpo: 1
```

As duas ferramentas do pré-voo na pasta do redator são as do ramo `origin/chore/mandato-refs-e-preflight` com uma única diferença, a linha do `RAIZ` do `mandato-preflight.sh`, fixada em `C:/Users/AMP/w-trc02` (a adaptação do B-TRC-02), e são byte a byte as da pasta do redator do ciclo 2 do B-SAN3-13 (copiadas sem alteração); esse `RAIZ` não existe mais no disco, logo a checagem 6 do pré-voo não acharia caminho relativo nenhum, e por isso este mandato cita todo caminho do repositório ABSOLUTO no worktree do objeto (a checagem 6 não confere caminho absoluto, fronteira declarada no cabeçalho do pré-voo; a existência de cada um sai das leituras medidas neste mandato), medido por: `cd C:/Users/AMP/Documents/GitHub/ERP_Techsolutios && for b in mandato-refs.sh mandato-preflight.sh; do bl=$(git ls-tree -r origin/chore/mandato-refs-e-preflight -- scripts | awk -v b="$b" '$4 ~ ("/" b "$") {print $3}'); diff <(git cat-file blob "$bl") C:/Users/AMP/erp-pausa-2026-10-03/redator-san312a/$b | grep -i -E '^[<>]'; echo "$b linhas-diferentes=$(diff <(git cat-file blob "$bl") C:/Users/AMP/erp-pausa-2026-10-03/redator-san312a/$b | grep -c -i -E '^[<>]')"; cmp -s C:/Users/AMP/erp-pausa-2026-10-03/redator-san312a/$b C:/Users/AMP/erp-pausa-2026-10-03/redator-san313c2/$b && echo "$b igual ao do redator do B-SAN3-13 ciclo 2"; done; test -d C:/Users/AMP/w-trc02 && echo 'RAIZ existe' || echo 'RAIZ ausente: C:/Users/AMP/w-trc02'`
```
mandato-refs.sh linhas-diferentes=0
mandato-refs.sh igual ao do redator do B-SAN3-13 ciclo 2
< RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
> RAIZ=C:/Users/AMP/w-trc02
mandato-preflight.sh linhas-diferentes=2
mandato-preflight.sh igual ao do redator do B-SAN3-13 ciclo 2
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

As decisões do dono que regem o bloco, literais, nos apêndices do plano no objeto (as 4 perguntas de 24/10 e as respostas à crítica r2 de 25/10: valor exato, mesmo privilégio da troca, migração de dados autorizada), uma linha por decisão, medido por: `tr -d '\r' < C:/Users/AMP/w-san312a/docs/revisoes/SAN3/B-SAN3-12-plano.md | grep -n -i -o -E 'Aceito as 4 \(Recomendado\)|Só cheque do valor exato \(Recomendado\)|Mesmo privilégio da troca \(Recomendado\)|Autorizo \(Recomendado\)' | sort -t: -k2 -u`
```
623:Aceito as 4 (Recomendado)
29:Autorizo (Recomendado)
29:Mesmo privilégio da troca (Recomendado)
29:Só cheque do valor exato (Recomendado)
```

Ciclo 1: no diretório de votos desta junta não há voto nem evidência de cadeira nenhuma (só o diretório dos mandatos), logo não há voto a carregar nem a revalidar (§C7 item 9) e a C3 vota pela primeira vez, no objeto, medido por: `ls C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a | sed -e 's#^#C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a/#'; echo "arquivos c1/c2/c3 de voto ou evidência: $(ls C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a | grep -c -i -E '^c[1234]-')"`
```
C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a/00-mandatos
C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a/insp-san312a-evidencia.md
C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a/insp-san312a-parecer.md
arquivos c1/c2/c3 de voto ou evidência: 0
```

O PR não está mais em conflito com a `main` (estado de merge pelo GitHub): o orquestrador fez o merge da `origin/main` no ramo, e o objeto é esse merge (o assunto, na unidade do delta). E a trava `migration-transaction-guard.mjs` do B-GUARD-MIGRACAO (#458), que antes só existia na `main`, agora está no objeto (o script e o teste que a põe no `npm test`), e julga a migração de dados deste bloco: executada no worktree do objeto, o rodapé dela e, por migração NOVA (carimbo trocado por `<carimbo>`), o número de sentenças fora do controle de transação (pela contagem do próprio guard) e de violações; a migração do bloco é a `<carimbo>_grant_finance_unreconcile_and_cheque_unlink_permissions` (carimbo que começa por 2026 0882), nova, com 0 violação, medido por: `cd C:/Users/AMP/w-san312a && gh pr view 459 --json mergeable,mergeStateStatus --jq '.mergeable + " " + .mergeStateStatus'; git ls-tree -r --name-only 04b8a667780930050c8af2c77c323b81fe8794bb -- C:/Users/AMP/w-san312a/scripts C:/Users/AMP/w-san312a/tests | grep -i 'migration-transaction-guard' | sed -e 's#^#C:/Users/AMP/w-san312a/#'; echo "no 1º pai: $(git ls-tree -r --name-only 04b8a667780930050c8af2c77c323b81fe8794bb~2 -- C:/Users/AMP/w-san312a/scripts | grep -c -i 'migration-transaction-guard')"; node C:/Users/AMP/w-san312a/scripts/migration-transaction-guard.mjs; echo "ec=$?"; node --input-type=module -e 'const g=await import("file:///C:/Users/AMP/w-san312a/scripts/migration-transaction-guard.mjs"); const r=g.auditMigrationsDir("C:/Users/AMP/w-san312a/prisma/migrations"); for (const m of r.migrations.filter(x=>x.nova)) console.log("<carimbo>"+m.name.slice(14), "nova", "sentenças="+(Array.isArray(m.statements)?m.statements.length:m.statements), "violações="+m.violations.length)'`
```
MERGEABLE CLEAN
C:/Users/AMP/w-san312a/scripts/migration-transaction-guard.mjs
C:/Users/AMP/w-san312a/tests/migration-transaction-guard.test.ts
no 1º pai: 0
migrações: 117 · anteriores: 112 · novas: 5 · violações: 0
ec=0
<carimbo>_invoice_complementary_title nova sentenças=6 violações=0
<carimbo>_vehicle_telemetry_events nova sentenças=17 violações=0
<carimbo>_validate_receipt_message_kind_check nova sentenças=1 violações=0
<carimbo>_cheque_title_link nova sentenças=3 violações=0
<carimbo>_grant_finance_unreconcile_and_cheque_unlink_permissions nova sentenças=2 violações=0
```

O merge não tem conteúdo próprio fora dos registros: a árvore do merge `<objeto>~1` (o objeto da r2; o commit da C4 em cima dele não toca registro), comparada com a do merge AUTOMÁTICO dos dois pais (`git merge-tree --write-tree`, que deixa os marcadores de conflito), só difere nos 4 arquivos de registro (os 3 de append e o índice regenerado); o plano da rodada, que os dois lados tocaram, entrou pelo merge automático. Nos 3 arquivos de append, nenhuma linha do 2º pai (a `main`) sai, e as linhas do 1º pai (o ramo) que saem são, todas, linhas que a própria `main` tirou ou trocou depois do head-base (a contagem "fora das que a main tirou" é 0). O índice de pendências do objeto é byte a byte (CR retirado) o que o gerador `gerar-indice-pendencias.py` do objeto produz do `pendencias.md` do objeto, rodado numa pasta temporária (0 linha de diferença; a primeira linha é o resumo que o gerador imprime), medido por: `cd C:/Users/AMP/w-san312a && T=$(git merge-tree --write-tree 04b8a667780930050c8af2c77c323b81fe8794bb~2 04b8a667780930050c8af2c77c323b81fe8794bb~1^2 | head -1); echo "merge <objeto>~1 × merge automático: $(git diff --name-only "$T" 04b8a667780930050c8af2c77c323b81fe8794bb~1 | wc -l) caminhos"; git diff --name-only "$T" 04b8a667780930050c8af2c77c323b81fe8794bb~1 | sed -e 's#^#C:/Users/AMP/w-san312a/#'; for f in C:/Users/AMP/w-san312a/agent-orchestration/controle/decisoes.md C:/Users/AMP/w-san312a/agent-orchestration/controle/pendencias.md C:/Users/AMP/w-san312a/agent-orchestration/docs/status-geral.md; do a=$(git diff --numstat 04b8a667780930050c8af2c77c323b81fe8794bb~2 04b8a667780930050c8af2c77c323b81fe8794bb~1 -- "$f" | cut -f2); b=$(git diff --numstat 04b8a667780930050c8af2c77c323b81fe8794bb~1^2 04b8a667780930050c8af2c77c323b81fe8794bb~1 -- "$f" | cut -f2); x=$(comm -23 <(git diff -U0 04b8a667780930050c8af2c77c323b81fe8794bb~2 04b8a667780930050c8af2c77c323b81fe8794bb~1 -- "$f" | grep -a -i -E '^-' | grep -a -v -i -E '^---' | sort) <(git diff -U0 04b8a667780930050c8af2c77c323b81fe8794bb~14 04b8a667780930050c8af2c77c323b81fe8794bb~1^2 -- "$f" | grep -a -i -E '^-' | grep -a -v -i -E '^---' | sort) | wc -l); echo "$f: saem do 1º pai ${a:-0} (fora das que a main tirou: $x) · saem do 2º pai ${b:-0}"; done; PYTHONIOENCODING=utf-8 python -I -c 'import os,io,subprocess,tempfile,shutil,difflib; d=tempfile.mkdtemp(); c=os.path.join(d,"agent-orchestration","controle"); os.makedirs(c); io.open(os.path.join(c,"pendencias.md"),"w",encoding="utf-8",newline="").write(io.open("C:/Users/AMP/w-san312a/agent-orchestration/controle/pendencias.md",encoding="utf-8").read()); subprocess.run(["python","-I","C:/Users/AMP/w-san312a/agent-orchestration/controle/gerar-indice-pendencias.py"],cwd=d,check=True); a=io.open("C:/Users/AMP/w-san312a/agent-orchestration/controle/pendencias-indice.md",encoding="utf-8").read(); b=io.open(os.path.join(c,"pendencias-indice.md"),encoding="utf-8").read(); n=sum(1 for l in difflib.ndiff(a.splitlines(),b.splitlines()) if l[:1] in "+-"); print("índice do objeto × gerador:", "IGUAL" if a==b else "DIFERE", n, "linha(s) de diferença"); shutil.rmtree(d)'`
```
merge <objeto>~1 × merge automático: 4 caminhos
C:/Users/AMP/w-san312a/agent-orchestration/controle/decisoes.md
C:/Users/AMP/w-san312a/agent-orchestration/controle/pendencias-indice.md
C:/Users/AMP/w-san312a/agent-orchestration/controle/pendencias.md
C:/Users/AMP/w-san312a/agent-orchestration/docs/status-geral.md
C:/Users/AMP/w-san312a/agent-orchestration/controle/decisoes.md: saem do 1º pai 0 (fora das que a main tirou: 0) · saem do 2º pai 0
C:/Users/AMP/w-san312a/agent-orchestration/controle/pendencias.md: saem do 1º pai 2 (fora das que a main tirou: 0) · saem do 2º pai 0
C:/Users/AMP/w-san312a/agent-orchestration/docs/status-geral.md: saem do 1º pai 0 (fora das que a main tirou: 0) · saem do 2º pai 0
indice: 647 cabecalhos / 636 IDs | {'FECHADA': 155, 'ABERTA': 489, 'SEM-STATUS': 3} | baldes {'-': 155, 'C': 65, 'B': 201, '?': 3, 'A': 223} | diferidas-materiais 13
�ndice do objeto � gerador: IGUAL 0 linha(s) de diferen�a
```

O que a E1-bis (§E1b.6) diz que a C3 mede desta emenda, no plano do objeto; a composição do orquestrador dá à C3 B1, B2, o escopo E1 e E1-bis, a pendência do plano falsificado, o contrato e a migração de dados com o drill (o "DBA na junta" do §5.1 do plano fica com a C3): divergência registrada (§A2) no corpo, e vale este mandato, medido por: `tr -d '\r' < C:/Users/AMP/w-san312a/docs/revisoes/SAN3/B-SAN3-12-plano.md | grep -n -i -o -E 'C3 \(fail-closed/contrato\) — B1 \(três listas, CI no head\)[^.]{0,60}'`
```
928:C3 (fail-closed/contrato) — B1 (três listas, CI no head), B2 (`skipped`), F3, A17-bis, os 409 no contrato
```

O critério de fechamento B1 da E1-bis, nos três números do plano do objeto (CI no head; as três listas com "só no head" que tem de ser 0; o T2.1 à mão), e o que o relatório do dev declara no E13: a frase em que ele diz que o "= 0" da letra do B1 não foi atingido e o caso único "só no head" (o teste de tempo do Traccar), linha e trecho, medido por: `tr -d '\r' < C:/Users/AMP/w-san312a/docs/revisoes/SAN3/B-SAN3-12-plano.md | grep -n -i -o -E 'CI concluída e verde no head|três listas|"só no head" \(tem de ser \*\*0\*\*\)|medida à mão no descartável só migrado'; tr -d '\r' < C:/Users/AMP/w-san312a/docs/revisoes/SAN3/B-SAN3-12a-dev.md | grep -n -i -o -E 'O "= 0" da letra do B1 NÃO foi atingido|só no head — N=1|ingestão: tempo esgotado → 503'`
```
902:CI concluída e verde no head
903:três listas
903:"só no head" (tem de ser **0**)
904:medida à mão no descartável só migrado
918:três listas
928:três listas
934:três listas
279:só no head — N=1
279:ingestão: tempo esgotado → 503
```

O diff do bloco, do head-base ao 1º pai (`<objeto>~14..<objeto>~2`, os commits do ramo antes do merge; mesmo conjunto de caminhos que o diff do PR, medido acima): o total de caminhos; quantos caem no PROIBIDO nomeado do plano (§7.4, os PROIBIDOS nomeados da E1.10 e o §C4: esquema do Prisma, `infra`, `.github`, `Kpis`, `mobile`, o envelope comum de erro, o gerador e o guard do censo de vias, o seed, a suíte de autoridade de papéis, a suíte de paridade de migração e o script de provisionamento) e quantos caminhos têm `traccar` no nome (o teste de tempo do "só no head" é do Traccar); a lista inteira está na saída, com o prefixo do worktree, medido por: `cd C:/Users/AMP/w-san312a && echo "caminhos no diff do bloco: $(git diff --name-only 04b8a667780930050c8af2c77c323b81fe8794bb~14 04b8a667780930050c8af2c77c323b81fe8794bb~2 | wc -l)"; echo "PROIBIDO por nome: $(git diff --name-only 04b8a667780930050c8af2c77c323b81fe8794bb~14 04b8a667780930050c8af2c77c323b81fe8794bb~2 | grep -c -i -E '(schema\.prisma|http\.ts|o6r07c-census\.ts|o6r07c-census-guard\.test\.ts|seed\.ts|core-saas-role-authority\.test\.ts|permission-catalog-migration-parity\.test\.ts|provision-rbac\.ts)$')"; echo "PROIBIDO por diretório: $(git diff --name-only 04b8a667780930050c8af2c77c323b81fe8794bb~14 04b8a667780930050c8af2c77c323b81fe8794bb~2 -- infra .github Kpis mobile | wc -l)"; echo "com traccar no nome: $(git diff --name-only 04b8a667780930050c8af2c77c323b81fe8794bb~14 04b8a667780930050c8af2c77c323b81fe8794bb~2 | grep -c -i traccar)"; git diff --name-only 04b8a667780930050c8af2c77c323b81fe8794bb~14 04b8a667780930050c8af2c77c323b81fe8794bb~2 | sed -e 's#^#C:/Users/AMP/w-san312a/#'`
```
caminhos no diff do bloco: 67
PROIBIDO por nome: 0
PROIBIDO por diretório: 0
com traccar no nome: 0
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

A forma da migração de dados do bloco, no SQL do objeto lido pelo nome da pasta sem o carimbo e com os comentários retirados: uma linha `BEGIN;` e uma `COMMIT;`, zero instrução de esquema (`CREATE`, `ALTER`, `DROP`, `TRUNCATE`), os `INSERT` e os `ON CONFLICT` contados; e o drill do bloco existe no objeto e cita a pasta da migração pelo nome (a regra G6 da trava `migration-transaction-guard.mjs`, que agora está no objeto, exige isso de migração com mais de uma sentença), medido por: `F=C:/Users/AMP/w-san312a/$(git -C C:/Users/AMP/w-san312a ls-tree -r --name-only 04b8a667780930050c8af2c77c323b81fe8794bb -- prisma/migrations | grep -i 'grant_finance_unreconcile_and_cheque_unlink_permissions'); S=$(tr -d '\r' < "$F" | sed -e 's#--.*$##' ); echo "BEGIN: $(printf '%s\n' "$S" | grep -c -i -E '^BEGIN;')"; echo "COMMIT: $(printf '%s\n' "$S" | grep -c -i -E '^COMMIT;')"; echo "instruções de esquema: $(printf '%s\n' "$S" | grep -c -i -E '\b(CREATE|ALTER|DROP|TRUNCATE)\b')"; echo "INSERT: $(printf '%s\n' "$S" | grep -c -i -E '^INSERT INTO')"; echo "ON CONFLICT: $(printf '%s\n' "$S" | grep -c -i -E 'ON CONFLICT')"; D=$(basename "$(dirname "$F")"); echo "o drill do bloco cita a pasta: $(tr -d '\r' < C:/Users/AMP/w-san312a/tests/b-san3-12a-permissions-migration-drill-db.test.ts | grep -c -i -E "$D")"`
```
BEGIN: 1
COMMIT: 1
instruções de esquema: 0
INSERT: 2
ON CONFLICT: 2
o drill do bloco cita a pasta: 1
```

A pendência `P-SAN3-12A-PLANO-FALSIFICADO-ESCOPO` no registro do objeto: o cabeçalho da entrada (com a gravidade) e a linha do índice (com a gravidade e a coluna de aberta), e quantas vezes ela é dita fechada no registro (contagem de linhas que a citam junto de "fechad"); e o índice e a entrada divergem na gravidade (ALTA no cabeçalho da entrada, CRÍTICA no índice), medido por: `tr -d '\r' < C:/Users/AMP/w-san312a/agent-orchestration/controle/pendencias.md | grep -n -i -E '^## P-SAN3-12A-PLANO-FALSIFICADO-ESCOPO'; tr -d '\r' < C:/Users/AMP/w-san312a/agent-orchestration/controle/pendencias-indice.md | grep -i -E '^\| `P-SAN3-12A-PLANO-FALSIFICADO-ESCOPO`' | cut -d'|' -f2-5; echo "linhas que a dizem fechada: $(tr -d '\r' < C:/Users/AMP/w-san312a/agent-orchestration/controle/pendencias.md | grep -i 'P-SAN3-12A-PLANO-FALSIFICADO-ESCOPO' | grep -c -i 'fechad')"`
```
11659:## P-SAN3-12A-PLANO-FALSIFICADO-ESCOPO (2026-10-25) — o PERMITIDO do 12a não cobre o que as regras do dono quebram — ALTA (processo; bloqueia o merge do 12a)
 `P-SAN3-12A-PLANO-FALSIFICADO-ESCOPO` | 11659 | CRÍTICA | sim
linhas que a dizem fechada: 0
```

Memória de commit livre em GB (a P8 (c) exige pelo menos 4 antes de lançar agente), os trabalhos Docker vivos fora da base `erp-*` (o teto é 2 contando o da cadeira) e o disco livre em `C:` (a ordem do orquestrador: PARE abaixo de 7 GB), no instante da redação: a cadeira mede de novo antes de subir, medido por: `powershell.exe -NoProfile -Command '$o=Get-CimInstance Win32_PerfFormattedData_PerfOS_Memory; [math]::Round(($o.CommitLimit-$o.CommittedBytes)/1GB,2)'; docker ps --format '{{.Names}}' | grep -v -i -E '^erp-' | sed -E 's#-(pg|redis|run|net)$##' | sort -u; echo "trabalhos fora de erp: $(docker ps --format '{{.Names}}' | grep -v -i -E '^erp-' | sed -E 's#-(pg|redis|run|net)$##' | sort -u | wc -l)"; df -h /c | tail -1 | awk '{print "livre em C: " $4}'`
```
14,04
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

Você é `jurado-san312a-c3-opus` (identidade nova; o orquestrador confirma no disparo), executor Claude Opus (subagente genérico, corpo lido do blob do objeto), modelo **Claude Opus**, nível menor DECLARADO (§C7.6), cobrindo o Codex, que está sem limite; o seu corpo canônico é `C:/Users/AMP/w-san312a/.claude/agents/especialistas/jurado-san312a-c3-regressao-escopo-contrato.md`, carregado **do blob do objeto** (o worktree está no objeto, medido acima; §A7). Onde o corpo divergir deste mandato quanto a objeto, diretório de votos, régua, bases ou inelegíveis, vale este mandato. Na primeira linha de `c3-evidencia.md`, declare executor efetivo, modelo, nível, objeto, `mandato_md5` deste arquivo (CR retirado antes do md5) e o veredito IDENTICO/DIVERGE do corpo que você carregou contra o blob do objeto, EOL-neutro. **Opus esgotado: PARE sem votar** e registre onde parou (§C7.6-bis); o sucessor de queda é outra identidade Opus declarada. Inelegíveis por nome: `planejador-mestre` (Fable, plano v3), `planejador-san312-e1-fable` (E1 e E1-bis), `crit-san312-pro` (r1, Gemini), `crit-san312-opus-r2` (r2), `crit-san312-pro-r2` e `crit-san3-12-r2-pro` (críticos do r2 citados no registro), `crit-san312a-e1-opus` (crítica da E1; achou B1 e B2, os critérios que você mede), `dev-san312a-opus`, `fab-red-san312a-opus` (fabricou os corpos e a r1 deste mandato), `redator-san312a-r2-opus` (adaptou a r2 deste mandato ao objeto anterior), `fab-red-san312a-r3-opus` (fabricou o corpo da C4, adaptou esta r3 ao objeto novo e executou as medições dele), o orquestrador, `inspetor-san312a-opus`, `jurado-san312a-c1-opus`, `jurado-san312a-c2-opus` e `jurado-san312a-c4-opus`; se o seu nome coincidir, pare. Monocultura declarada: o dev, o crítico da E1 e as cinco identidades desta junta (o inspetor e as quatro cadeiras) rodam em Claude Opus. O plano v3 com E1 e E1-bis, o relatório do dev (E10 a E14, inclusive as três listas e o carimbo "tempo/carga") e as críticas são **A RE-VERIFICAR**, derruba com: `head -1 C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a/c3-evidencia.md | grep -i -E 'executor|Opus|mandato_md5|objeto|IDENTICO|DIVERGE'`

A legalidade vem antes do mérito: parecer `insp-san312a-parecer.md` do inspetor `inspetor-san312a-opus` com LIBERADO ou LIBERADO COM RESSALVA nomeando você, o seu executor, os seus dois worktrees, os seus containers e a sua vez (uma cadeira por vez); o objeto é o head do PR 459 (medido acima), com todos os check-runs concluídos (head que andou bloqueia o início). Régua: bloco de DINHEIRO e de permissão, **unanimidade das 4 cadeiras com veto** (§C7 item 8(1); a C4, `jurado-san312a-c4-isolamento-e-invariantes`, entrou por decisão do orquestrador depois de o inspetor bloquear o start por cobertura: R-res-5 e A14, R-res-4 e A13, A21 e A16 são dela, não seus); **ciclo 1**: todo `bloqueia` com escopo `dentro-do-bloco` reprova, grave ou não (§C7 item 8(2)); a base de toda comparação de escopo e de suíte é o head-base do bloco (`<objeto>~14` pelo 1º pai, o ponto de saída do ramo; NÃO a merge-base do `mandato-refs.sh`, que depois do merge é a ponta da `main` que entrou), nunca a `main` de agora; o diff do BLOCO é `<objeto>~14..<objeto>~2`, e o merge se julga à parte, pelo conteúdo próprio dele (medido acima: o merge, a `main` que entrou, a trava de migração agora no objeto); um teste financeiro que passa a falhar ou a ser pulado é `grave: dinheiro` até prova de causa. Todo achado declara gravidade, classe, escopo, N e forma; `pre-existente` exige evidência de data ou origem (a frequência igual na base conta) e pendência com dono (§C7.1-ter(a)); "não consigo medir" item seu é REPROVADO; não proponha correção (§C7.4-bis), não reabra as decisões do dono nem a E1 e a E1-bis, não cobre KPI, não meça matéria de C1, C2 ou C4, não leia os votos e evidências das outras cadeiras; o voto declara `arquivos_medidos` (§C7 item 9 (0)) POR ITEM, com `**` no item 1 (ele roda `npm test`), derruba com: `grep -i -E 'legalidade|A RE-VERIFICAR|gravidade|classe|escopo|arquivos_medidos|ciclo 1|head-base' C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a/c3-voto.json`

Terreno: DOIS worktrees exclusivos, detached, `C:/Users/AMP/j12a-c3-wt` no objeto e `C:/Users/AMP/j12a-c3-wtb` no head-base do bloco, cada um com `npm ci` próprio e zero junction de `node_modules` (§C7.1-ter(c)), removidos só por `git worktree remove --force` depois de conferir que nenhum processo os usa; dois `npm ci` custam disco: meça antes de cada um e PARE abaixo de 7 GB (medido acima). Postgres 16 `j12a-c3-pg` e Redis 7 `j12a-c3-redis` próprios, só em `127.0.0.1`, portas altas testadas antes (candidatas 47733 e 47734), senha aleatória só por ambiente; bancos frescos por lado `j12a_c3_base` e `j12a_c3_obj`; `DATABASE_URL`, `REDIS_URL` (o seu Redis) e `CORE_SAAS_PERSISTENCE` iguais nos dois lados, como prefixo de **todo** comando `node`/`npm`; se um drill cair pelo shim do `.bin/prisma` no Windows (`P-SAN3-12-DRILL-PRISMA-SHIM-WINDOWS`), um container Node Linux seu com o mesmo prefixo. Antes de subir: memória de commit livre ≥ 4 GB (P8 (c)), no máximo 2 trabalhos Docker na máquina contando o seu; faltando, espere. Uma cadeira por vez. Nunca a base viva (`erp-postgres`, `erp-redis`, `erp-postgres-alt`), nem 5432, 6379, 3000, 5173, 5050, 8899, 55432, 55412, 55413; nunca `prune` nem container alheio. Mutação só no worktree do objeto, uma por vez, âncora única com prova de aplicação (CRLF incluso), restauro provado por `git hash-object` = blob do objeto; nunca medir conteúdo de commit com `git archive` mais `tar` sob `core.autocrlf=true`; scripts, normalizador e sondas numa pasta sua `C:/Users/AMP/erp-pausa-2026-10-03/j12a-c3/`, para que a evidência seja re-executável, derruba com: `grep -i -E 'j12a-c3-wt|j12a-c3-wtb|j12a-c3-pg|j12a-c3-redis|j12a_c3_|127\.0\.0\.1|junction|commit livre|4 GB|7 GB|erp-|5432|6379|hash-object|head-base|shim|teardown' C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a/c3-evidencia.md`

Item 1 de 3 (B1 e B2 — a suíte base × objeto com as três listas, o "só no head" do Traccar A JULGAR, a CI no objeto e o `skipped`): os check-runs do objeto (medidos acima) e, no log do job `backend` do objeto, a linha de resumo do runner e o `ok` ou `skip` de cada `-db` do bloco (eles não estão nas `SUITES` do `backend-postgres`); `npm test` na forma do job `backend` da CI nos seus dois worktrees, com banco fresco migrado em cada lado e o seu Redis, normalizado por script SEU (chave = arquivo + nome do caso, lida do TAP, sem prefixo de worktree), com as três listas e N — só no objeto, só na base, nos dois lados — e a causa de cada item lida da mensagem do TAP, mais os totais dos dois lados; o teste de tempo do Traccar (a ingestão com tempo esgotado → 503) julgado por comando: o diff do bloco toca o caminho dele (os imports gerados por script cruzados com o diff; medido acima: 0 caminhos com `traccar` no nome) e a frequência de falha em N ≥ 5 rodadas isoladas no objeto e N ≥ 5 na base, na mesma carga — do bloco (`dentro-do-bloco`) ou flutuação pré-existente (`pre-existente`, com evidência e dono); a `main` que entrou pelo merge (medido acima: 3 commits depois do head-base, 24 caminhos sob `tests`) traz casos que o head-base não tem: o seu normalizador separa, por script, os casos cujo arquivo está no diff `<objeto>~14..<objeto>~1^2` e os publica à parte, com N; eles não contam no "só no objeto" do bloco, mas um deles que falhe no objeto é achado, com a causa; e diga se o critério "só no head = 0" do B1 está cumprido na SUA lista; B2: `tests · pass · fail · skipped` de todo passo, `skipped` do objeto contido no da base por nome, nenhum passo com `pass 0` e `skipped ≥ 1`, e o B1-3 medido por você. Controles: uma falha sua num teste financeiro que o bloco não toca aparece em "só no objeto" com a causa, e um nome com o caminho absoluto do worktree não se perde no seu normalizador; no head-base, o censo de `reason` copiado do objeto fica vermelho pela asserção, derruba com: `grep -i -E 'Item 1|B1|B2|só no objeto|só na base|nos dois lados|Traccar|tempo esgotado|frequência|skipped|backend|backend-postgres|normaliz|causa|vermelho|head-base' C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a/c3-evidencia.md`

Item 2 de 3 (o escopo E1 e E1-bis, a `P-SAN3-12A-PLANO-FALSIFICADO-ESCOPO` e o contrato): o diff do bloco (medido acima, com a lista inteira) contra a lista PERMITIDA extraída por script do §7.1, da E1.10 e da E1b.6 do plano no objeto (publique a lista extraída e o método) e contra a PROIBIDA (medido acima: as contagens por nome e por diretório); os hunks dos arquivos com "só isto" no plano delimitados por parse (o serviço de títulos só `update` e `delete`; a unidade de trabalho financeira só `CHEQUE_REPO_KIND` e `journaledCheques`; a projeção do resumo em memória; o `upsert` das configurações; os 5 + 2 casos dos dois arquivos do #456; as 4 entradas do arnês P7; os 3 papéis do snapshot); `git diff --check` do diff do bloco (`<objeto>~14..<objeto>~2`) e do merge (o 1º pai × o objeto, só nos 4 arquivos de registro); nenhum caso apagado nos arquivos de teste antigos tocados, base × objeto; a fixture de vias (F3) regenerada pelo gerador num worktree seu igual à do objeto e com exatamente as 3 entradas novas contra a da base, e o guard do censo no objeto; o merge da `main` sem conteúdo próprio (medido acima, re-meça por comando seu): a árvore do objeto contra a do merge automático dos dois pais (`git merge-tree --write-tree`) difere só nos 4 arquivos de registro; nenhum dos pais perde linha nos 3 de append (a linha do 1º pai que sai tem de ser linha que a `main` tirou depois do head-base: conte por script seu, sem confiar na contagem deste mandato); o índice de pendências bate com o gerador `gerar-indice-pendencias.py` do objeto, rodado por você numa pasta sua; e o merge não traz caminho do bloco que não estivesse no 1º pai (o conjunto de caminhos do diff do bloco igual ao do diff do PR); a pendência (medida acima: cabeçalho, índice e a gravidade de cada um) — os três critérios do B1 estão cumpridos? ela fecha? o registro a declara fechada ou troca o critério? e as duas pendências novas da E1-bis existem com escopo e dono; o contrato: o censo de `reason` do bloco (A17-bis) e um censo SEU, por script, cruzado com o `API_CONTRACTS.md` e com a lista congelada de pré-existentes, os novos do bloco todos no contrato, e o D1 e os 409 do A27 escritos. Mutações A17bis, um pré-existente documentado sem sair da lista, a classe do `unlink-title` editada à mão na fixture (vermelho no T14) e a sua (um caminho fabricado no diff, que o seu laço tem de acusar). Controles: a fixture da base contra o gerador do objeto acusa as 3 rotas; o laço rodado com o PERMITIDO sem as ampliações da E1.10 acusa os caminhos que a E1 fez entrar, derruba com: `grep -i -E 'Item 2|merge-tree|merge automático|gerar-indice|PERMITIDO|PROIBIDO|hunk|E1\.10|E1b\.6|diff --check|caso apagado|vias|census|P-SAN3-12A-PLANO-FALSIFICADO-ESCOPO|fecha|API_CONTRACTS|reason|A17bis|D1|409|vermelho|head-base' C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a/c3-evidencia.md`

Item 3 de 3 (a migração de dados do bloco, com `BEGIN`/`COMMIT`, idempotência, rollback e o drill; A22): a forma (medida acima: `BEGIN`, `COMMIT`, zero instrução de esquema, os `INSERT` com `ON CONFLICT`), o diff contra o molde da migração de permissão de checklist (só chaves, descrições e papéis mudam), o esquema do Prisma sem diff no bloco, e o nome da pasta ordenado depois da última migração do head-base e de toda migração que a `main` trouxe pelo merge (o 2º pai); a trava `migration-transaction-guard.mjs` do #458, que agora está no objeto e roda no `npm test` dele (medido acima: rodapé com 0 violação, e a migração do bloco, a `<carimbo>_grant_finance_unreconcile_and_cheque_unlink_permissions` de carimbo que começa por 2026 0882, entre as novas, com 0), executada por você no objeto contra as migrações e os testes do objeto (regras G1 a G7, em especial o G1 do carimbo antigo, o G2 do envoltório e o G6 do drill nomeado), com o caso do `C:/Users/AMP/w-san312a/tests/migration-transaction-guard.test.ts` verde no seu `npm test`, e com vermelho-controle numa cópia sua (o `BEGIN;` tirado do SQL do bloco: a trava fica vermelha nomeando a pasta); `C:/Users/AMP/w-san312a/tests/b-san3-12a-permissions-migration-drill-db.test.ts` e o `permission-catalog-db-parity` com `RBAC_DB_PARITY=1` três vezes no seu Postgres (`skipped = 0`), com o que cada caso afirma; uma sonda sua num banco fresco: deploy até a migração anterior, papéis semeados, a migração do bloco, o corpo aplicado de novo (contagens iguais), o rollback do runbook do rodapé verbatim (somem só as 2 chaves e as concessões), o `migrate resolve` e o deploy de novo (converge), a base nova sem papéis (0 concessão e o provisionamento converge), e uma falha injetada entre os dois `INSERT` numa cópia sua (a primeira metade não fica gravada); os guards de catálogo no objeto com a linha de base do parity sem diff no bloco. Mutações: o `INSERT INTO role_permissions` apagado (db-parity e drill vermelhos), as chaves acrescentadas à linha de base (vermelho) e a sua (o `ON CONFLICT` tirado numa cópia: qual caso acusa?). Vermelho-controle: no worktree da base, o parity de migração contra o catálogo do objeto fica vermelho pela asserção, e a sua sonda acusa uma concessão a mais fabricada por você, derruba com: `grep -i -E 'Item 3|BEGIN|COMMIT|DDL|esquema|ON CONFLICT|idempot|rollback|runbook|migrate resolve|drill|db-parity|migration-transaction-guard|G1|G6|linha de base|A22|vermelho|head-base' C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a/c3-evidencia.md`

Protocolo P1/P2/P3/P4/P7 do §C7.7, verbatim no bloco colado acima, com `<cadeira>` = `c3`: evidência em `c3-evidencia.md` após CADA item; `c3-voto.json` nasce esqueleto com os três itens EM APURAÇÃO e o campo `arquivos_medidos` por item, cada item gravado ao ser medido, e fecha antes da mensagem final de 1 linha; sucessor de identidade nova (Opus, declarado) re-executa os comandos registrados e só então mede a cauda (log parcial de `npm test` não vale como lista); três itens exatos; PAUSA grava head, feito, falta, próximo comando e arquivos meio-escritos e para. Queda vai a `00-quedas.md` do diretório desta junta (P6, pelo orquestrador); uma cadeira por vez (ordem do dono, mais estreita que a P5). Únicos outputs no repositório: `c3-evidencia.md` e `c3-voto.json` em `C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a/`; nunca commit, derruba com: `test -f C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a/c3-voto.json`

## MEDIDO

Pré-voo deste mandato com as ferramentas copiadas sem mudança para a pasta do redator `C:/Users/AMP/erp-pausa-2026-10-03/redator-san312a/` (diferença contra o ramo das ferramentas medida acima), executado com o cwd no worktree do objeto; o redator desta r3 é `fab-red-san312a-r3-opus` (Claude Opus 5.5, nível menor declarado, identidade nova), que fabricou o corpo da C4 e adaptou ao objeto novo os geradores da r2 (`redator-san312a-r2-opus`), que vinham da `fab-red-san312a-opus` (que fabricou os corpos C1 a C3 e a r1), e executou cada comando deste mandato pelo gerador `C:/Users/AMP/erp-pausa-2026-10-03/redator-san312a/gerar-c3.sh`, medido por: `cd C:/Users/AMP/w-san312a && MANDATO_REFS=C:/Users/AMP/erp-pausa-2026-10-03/redator-san312a/mandato-refs.sh bash C:/Users/AMP/erp-pausa-2026-10-03/redator-san312a/mandato-preflight.sh C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a/00-mandatos/cadeira-c3.md 459 2>&1; echo ec=$?`
```
COLAGEM    l.6-20: refs do PR #459 confere com a saida atual

PRE-VOO OK — C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a/00-mandatos/cadeira-c3.md
ec=0
```
