# Mandato — Cadeira C1 — B-SAN3-12a (junta de DINHEIRO, ciclo 1)

## MEDIDO

Estado do PR 459 no instante da redação, pela ferramenta `mandato-refs.sh` copiada sem mudança para a pasta própria do redator `C:/Users/AMP/erp-pausa-2026-10-03/redator-san312a/`, com o cwd no worktree do objeto (o head do PR, a merge-base, os check-runs, e nenhuma ata ainda), medido por: `cd C:/Users/AMP/w-san312a && bash C:/Users/AMP/erp-pausa-2026-10-03/redator-san312a/mandato-refs.sh 459`
```
# refs do PR #459 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato
# gerado em: 2026-10-26T01:45Z · repo: thiagodorgo/ERP_Techsolutios

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

O corpo desta cadeira existe no objeto e, descontados o frontmatter e o bloco de adaptação Codex do espelho, é IDÊNTICO entre os dois espelhos (comparação EOL-neutra; o arquivo inteiro difere por construção do espelho, e por isso não se publica hash); o número de linhas de cada espelho está na saída, e o corpo nasceu no commit dos corpos (a última linha conta os commits que o tocam), medido por: `cd C:/Users/AMP/w-san312a && diff <(tr -d '\r' < C:/Users/AMP/w-san312a/.claude/agents/especialistas/jurado-san312a-c1-dinheiro-e-concorrencia.md | awk 'f; $0=="---"{n++; if(n==2) f=1}' | sed '/^$/d') <(tr -d '\r' < C:/Users/AMP/w-san312a/.agents/agents/especialistas/jurado-san312a-c1-dinheiro-e-concorrencia.md | awk 'f; $0=="---"{n++; if(n==2) f=1}' | awk 'index($0,"Papel para o Codex"){s=1} s&&$0==""{s=0; next} !s' | sed '/^$/d') >/dev/null && echo 'IDENTICO corpo c1-dinheiro-e-concorrencia' || echo 'DIVERGE corpo c1-dinheiro-e-concorrencia'; wc -l < C:/Users/AMP/w-san312a/.claude/agents/especialistas/jurado-san312a-c1-dinheiro-e-concorrencia.md; wc -l < C:/Users/AMP/w-san312a/.agents/agents/especialistas/jurado-san312a-c1-dinheiro-e-concorrencia.md; echo "commits que tocam o corpo: $(git rev-list --count 04b8a667780930050c8af2c77c323b81fe8794bb -- C:/Users/AMP/w-san312a/.claude/agents/especialistas/jurado-san312a-c1-dinheiro-e-concorrencia.md)"`
```
IDENTICO corpo c1-dinheiro-e-concorrencia
413
419
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

Ciclo 1: no diretório de votos desta junta não há voto nem evidência de cadeira nenhuma (só o diretório dos mandatos), logo não há voto a carregar nem a revalidar (§C7 item 9) e a C1 vota pela primeira vez, no objeto, medido por: `ls C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a | sed -e 's#^#C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a/#'; echo "arquivos c1/c2/c3 de voto ou evidência: $(ls C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a | grep -c -i -E '^c[1234]-')"`
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

O que a E1-bis (§E1b.6) diz que a C1 mede desta emenda, no plano do objeto; a composição do orquestrador dá à C1 A27, A28 e D1 (o lado de corrida e de dinheiro da D1; o lado "quem recebe 403 × 422" é da C2): divergência registrada (§A2) no corpo, e vale este mandato, medido por: `tr -d '\r' < C:/Users/AMP/w-san312a/docs/revisoes/SAN3/B-SAN3-12-plano.md | grep -n -i -o -E 'C1 \(DBA/dinheiro\) — A27-a/b/c[^;]{0,90}'`
```
928:C1 (DBA/dinheiro) — A27-a/b/c com `pg_locks`/barreira e A28 (M2 nos dois lados), além do que a E1.10 já lhe dava
```

Os arquivos de teste que medem os três itens existem no objeto (a lista dos testes do bloco e dos dois do #456 reescritos pela E1, pela busca do git no worktree que está no objeto), e o teste de barreira do A27 pula DECLARANDO quando falta `DATABASE_URL` (a linha do `skip`); o `sed` põe o prefixo do worktree, medido por: `cd C:/Users/AMP/w-san312a && git ls-tree -r --name-only 04b8a667780930050c8af2c77c323b81fe8794bb -- tests | grep -i -E 'b-san3-12a-|cheque-title-link' | sed -e 's#^#C:/Users/AMP/w-san312a/#'; tr -d '\r' < C:/Users/AMP/w-san312a/tests/b-san3-12a-link-toctou-db.test.ts | grep -n -i -o -E 'process\.env\.DATABASE_URL|skip: "[^"]{0,60}'`
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
C:/Users/AMP/w-san312a/tests/b-san3-12a-unlink-title.test.ts
C:/Users/AMP/w-san312a/tests/b-san3-12a-unreconcile-policy.test.ts
C:/Users/AMP/w-san312a/tests/cheque-title-link-atomic-db.test.ts
C:/Users/AMP/w-san312a/tests/cheque-title-link-migration-drill-db.test.ts
C:/Users/AMP/w-san312a/tests/cheque-title-link.test.ts
25:process.env.DATABASE_URL
29:skip: "Defina DATABASE_URL e aplique as migrations.
34:process.env.DATABASE_URL
```

No `ci.yml` do objeto os jobs `backend` e `backend-postgres` definem `DATABASE_URL`; nenhuma linha cita os testes `b-san3-12a-*` (contagem 0), e as que citam `cheque-title-link` são as duas `SUITES` do `backend-postgres` com o `-atomic-db` e o drill do #456 (impressas com o prefixo do worktree): os `-db` novos deste bloco não estão nas `SUITES` do `backend-postgres`; o dev diz que rodaram no job `backend` — onde a CI os executa, e se pulam, é da cadeira medir no log, medido por: `tr -d '\r' < C:/Users/AMP/w-san312a/.github/workflows/ci.yml | grep -n -i -E '^  backend(-postgres)?:|DATABASE_URL:'; echo "linhas do ci.yml com b-san3-12a: $(tr -d '\r' < C:/Users/AMP/w-san312a/.github/workflows/ci.yml | grep -c -i 'b-san3-12a')"; tr -d '\r' < C:/Users/AMP/w-san312a/.github/workflows/ci.yml | grep -n -i 'cheque-title-link' | sed -e 's#tests[/]#C:/Users/AMP/w-san312a/tests/#'`
```
31:  backend:
40:      DATABASE_URL: postgresql://postgres:postgres@localhost:5432/erp_techsolutions?schema=public
131:  backend-postgres:
134:      DATABASE_URL: postgresql://postgres:postgres@localhost:5432/erp_techsolutions?schema=public
linhas do ci.yml com b-san3-12a: 0
269:          SUITES="$SUITES C:/Users/AMP/w-san312a/tests/cheque-title-link-atomic-db.test.ts"
271:          SUITES="$SUITES C:/Users/AMP/w-san312a/tests/cheque-title-link-migration-drill-db.test.ts"
```

A conferência obrigatória da E1-bis, pela busca textual no serviço de cheques do objeto: as linhas que passam o título lido (`expectedTitleId`, o `casOnTitle` do `flipOnly`) e as chamadas a `throwChequeWriteConflict` (o 1º vínculo, o `delete` e o `cancel` passam o título; o conflito relê e distingue 404/422/409, segundo o dev), medido por: `tr -d '\r' < C:/Users/AMP/w-san312a/src/modules/cheques/cheque.service.ts | grep -n -i -E 'expectedTitleId|casOnTitle|throwChequeWriteConflict\(' | cut -c1-170`
```
222:      if (!updated) return this.throwChequeWriteConflict(actor, current.id);
232:      const updated = await ctx.cheques.update({ ...input, expectedTitleId: current.titleId ?? null });
233:      if (!updated) return this.throwChequeWriteConflict(actor, current.id, current.titleId);
250:      expectedTitleId: current.titleId,
268:    const removed = await this.repository.softDelete(actor.tenantId, current.id, actor.userId, { expectedTitleId: current.titleId ?? null });
269:    if (!removed) return this.throwChequeWriteConflict(actor, current.id, current.titleId);
458:    casOnTitle = false,
469:      ...(casOnTitle ? { expectedTitleId: current.titleId ?? null } : {}),
543:  private async throwChequeWriteConflict(actor: ChequeActorContext, chequeId: string, readTitleId?: string): Promise<never> {
```

Memória de commit livre em GB (a P8 (c) exige pelo menos 4 antes de lançar agente), os trabalhos Docker vivos fora da base `erp-*` (o teto é 2 contando o da cadeira) e o disco livre em `C:` (a ordem do orquestrador: PARE abaixo de 7 GB), no instante da redação: a cadeira mede de novo antes de subir, medido por: `powershell.exe -NoProfile -Command '$o=Get-CimInstance Win32_PerfFormattedData_PerfOS_Memory; [math]::Round(($o.CommitLimit-$o.CommittedBytes)/1GB,2)'; docker ps --format '{{.Names}}' | grep -v -i -E '^erp-' | sed -E 's#-(pg|redis|run|net)$##' | sort -u; echo "trabalhos fora de erp: $(docker ps --format '{{.Names}}' | grep -v -i -E '^erp-' | sed -E 's#-(pg|redis|run|net)$##' | sort -u | wc -l)"; df -h /c | tail -1 | awk '{print "livre em C: " $4}'`
```
14
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

Você é `jurado-san312a-c1-opus` (identidade nova; o orquestrador confirma no disparo), executor Claude Opus (subagente genérico, corpo lido do blob do objeto), modelo **Claude Opus**, nível menor DECLARADO (§C7.6), cobrindo o Codex, que está sem limite; o seu corpo canônico é `C:/Users/AMP/w-san312a/.claude/agents/especialistas/jurado-san312a-c1-dinheiro-e-concorrencia.md`, carregado **do blob do objeto** (o worktree está no objeto, medido acima; não do disco de outra sessão, §A7). Onde o corpo divergir deste mandato quanto a objeto, diretório de votos, régua, bases ou inelegíveis, vale este mandato. Na primeira linha de `c1-evidencia.md`, declare executor efetivo, modelo, nível, objeto, `mandato_md5` deste arquivo (CR retirado antes do md5) e o veredito IDENTICO/DIVERGE do corpo que você carregou contra o blob do objeto, EOL-neutro. **Opus esgotado: PARE sem votar** e registre onde parou (§C7.6-bis); o sucessor de queda é outra identidade Opus declarada. Inelegíveis por nome: `planejador-mestre` (Fable, plano v3), `planejador-san312-e1-fable` (E1 e E1-bis), `crit-san312-pro` (r1, Gemini), `crit-san312-opus-r2` (r2), `crit-san312-pro-r2` e `crit-san3-12-r2-pro` (críticos do r2 citados no registro), `crit-san312a-e1-opus` (crítica da E1, achou o D1-TOCTOU), `dev-san312a-opus`, `fab-red-san312a-opus` (fabricou os corpos e a r1 deste mandato), `redator-san312a-r2-opus` (adaptou a r2 deste mandato ao objeto anterior), `fab-red-san312a-r3-opus` (fabricou o corpo da C4, adaptou esta r3 ao objeto novo e executou as medições dele), o orquestrador, `inspetor-san312a-opus`, `jurado-san312a-c2-opus`, `jurado-san312a-c3-opus` e `jurado-san312a-c4-opus`; se o seu nome coincidir, pare. Monocultura declarada: o dev, o crítico da E1 e as cinco identidades desta junta (o inspetor e as quatro cadeiras) rodam em Claude Opus. O plano v3 com E1 e E1-bis, o relatório do dev (E10 a E14) e as críticas são **A RE-VERIFICAR**, derruba com: `head -1 C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a/c1-evidencia.md | grep -i -E 'executor|Opus|mandato_md5|objeto|IDENTICO|DIVERGE'`

A legalidade vem antes do mérito: parecer `insp-san312a-parecer.md` do inspetor `inspetor-san312a-opus` com LIBERADO ou LIBERADO COM RESSALVA nomeando você, o seu executor, o seu worktree, os seus containers e a sua vez (uma cadeira por vez); o objeto é o head do PR 459 (medido acima), com todos os check-runs concluídos (head que andou bloqueia o início). Régua: bloco de DINHEIRO e de permissão, **unanimidade das 4 cadeiras com veto** (§C7 item 8(1); a C4, `jurado-san312a-c4-isolamento-e-invariantes`, entrou por decisão do orquestrador depois de o inspetor bloquear o start por cobertura: R-res-5 e A14, R-res-4 e A13, A21 e A16 são dela, não seus); **ciclo 1**: todo `bloqueia` com escopo `dentro-do-bloco` reprova, grave ou não (§C7 item 8(2)); as bases são o head-base do bloco (`<objeto>~14` pelo 1º pai, o ponto de saída do ramo; NÃO a merge-base do `mandato-refs.sh`, que depois do merge é a ponta da `main` que entrou) e o head-base da emenda `<objeto>~8` pelo 1º pai (`<objeto>~2~6`) (medidos acima). Todo achado declara gravidade, classe, escopo, N e forma; `pre-existente` exige evidência de data ou origem e pendência com dono (§C7.1-ter(a)); "não consigo medir" item seu é REPROVADO; não proponha correção (§C7.4-bis), não reabra as decisões do dono (medidas acima) nem a E1 e a E1-bis, não cobre KPI nem matéria de C2, C3 ou C4, não leia os votos e evidências das outras cadeiras; o voto declara `arquivos_medidos` (§C7 item 9 (0)) POR ITEM, honesto, e `**` no item que rodar `npm test`, `check` ou `build`, derruba com: `grep -i -E 'legalidade|A RE-VERIFICAR|gravidade|classe|escopo|arquivos_medidos|ciclo 1' C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a/c1-voto.json`

Terreno: worktree exclusivo `C:/Users/AMP/j12a-c1-wt`, detached no objeto, com `npm ci` próprio e zero junction de `node_modules` (§C7.1-ter(c)), removido só por `git worktree remove --force` depois de conferir que nenhum processo o usa. Postgres 16 `j12a-c1-pg` e Redis 7 `j12a-c1-redis` próprios, só em `127.0.0.1`, portas altas testadas antes (candidatas 47713 e 47714), senha aleatória só por ambiente; bancos extras `j12a_c1_*`; `DATABASE_URL` e `REDIS_URL` seus como prefixo de **todo** comando `node`/`npm`; `npx prisma migrate deploy` até a migração de dados do bloco. Antes de subir: memória de commit livre ≥ 4 GB (P8 (c)), no máximo 2 trabalhos Docker na máquina contando o seu (medido acima), disco ≥ 7 GB (abaixo disso, PARE e registre); faltando memória ou teto, espere. Uma cadeira por vez: você só sobe quando o inspetor disser que é a sua vez. Nunca a base viva (`erp-postgres`, `erp-redis`, `erp-postgres-alt`), nem 5432, 6379, 3000, 5173, 5050, 8899, 55432, 55412, 55413; nunca `prune` nem container alheio. Mutação só no seu worktree, uma por vez, âncora única com prova de aplicação (CRLF incluso), restauro provado por `git hash-object` = blob do objeto; o vermelho-controle por `git checkout <head-base> -- <módulo>` no seu worktree (o head-base que o item nomeia), restaurado e provado; barreira determinística (`application_name`, `pg_stat_activity`, `pg_locks`), nunca relógio; scripts e sondas numa pasta sua `C:/Users/AMP/erp-pausa-2026-10-03/j12a-c1/`, para que a evidência seja re-executável, derruba com: `grep -i -E 'j12a-c1-wt|j12a-c1-pg|j12a-c1-redis|j12a_c1_|127\.0\.0\.1|junction|commit livre|4 GB|7 GB|erp-|5432|6379|hash-object|head-base|pg_locks|teardown' C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a/c1-evidencia.md`

Item 1 de 3 (A27 — o CAS do `title_id` lido no 1º vínculo, no `cancel` e no `delete`; A27-a a A27-f): o teste de barreira do A27 três vezes no seu Postgres (mesmo `# tests`, `skipped = 0`) e o A27-e em memória; uma sonda sua com barreira para cada escrita (vencedor por SQL em transação aberta, perdedor `finance` pelo serviço ou pela rota, o bloqueio provado por `pg_stat_activity` e `pg_locks` enquanto ele espera): status e `reason` do perdedor, FINAL do cheque, auditoria sem troca, e o pix em seguida recusado com 422 `title_has_pending_cheque`; os três desfechos do conflito (404, 422, 409) por execução; a conferência obrigatória (medida acima: só o 1º vínculo, o `delete` e o `cancel` passam o título lido) e se algum caminho que DECIDE por `title_id` ficou sem CAS. Mutações A27a-db, A27b-db, A27c-db, A27e-mem e a sua (o serviço deixa de passar o título lido no `cancel`). Vermelho-controle: com `src/modules/cheques` e `src/modules/financial-uow` do head-base da emenda `<objeto>~8`, a sua sonda mostra o perdedor com 200 e o FINAL trocado, e o A27-e do objeto fica vermelho pela asserção, derruba com: `grep -i -E 'Item 1|A27-a|A27-b|A27-c|A27-e|A27-f|barreira|pg_locks|pg_stat_activity|cheque_write_conflict|transition_conflict|title_has_pending_cheque|FINAL|A27a-db|A27e-mem|vermelho|head-base' C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a/c1-evidencia.md`

Item 2 de 3 (A28 — o `clear` de título já pago falha fechado, em memória e no Postgres; mais o F1 `-db`): `C:/Users/AMP/w-san312a/tests/cheque-title-link.test.ts` em memória e `C:/Users/AMP/w-san312a/tests/cheque-title-link-atomic-db.test.ts` três vezes no seu Postgres (o dev diz 38/38 e 15/15; `skipped = 0`), com o que K2 (l.189 reescrito) e K2-db (l.80 reescrito) asserem; uma sonda sua com o título pago por SQL commitado e por SQL em transação aberta (o `clear` bloqueado na trava do título): status, `reason`, lançamentos lidos do banco e qual das duas defesas respondeu; a contagem de casos dos dois arquivos no head-base do bloco e no objeto, com os renomeados por nome (nenhum caso apagado). Mutações M2-ambas (vermelha em memória e no `-db`), M2 só o fast-fail (verde: diga o que ela prova) e a sua (só a defesa sob a trava). Vermelho-controle: com os módulos de cheques, lançamentos e títulos do head-base do bloco, o K2 reescrito do objeto fica vermelho pela asserção (na base o pix paga o título com cheque pendente), derruba com: `grep -i -E 'Item 2|A28|K2|K2-db|title_already_paid|clear|lançamento|M2|fast-fail|trava|casos|apagado|vermelho|head-base' C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a/c1-evidencia.md`

Item 3 de 3 (D1 sob concorrência e o dinheiro em volta dela — o PATCH privilegiado não tira nem troca o vínculo; A5-bis; R-res-1; R-res-3; o invariante do A4 e do A4-bis): como `tenant_admin`, o PATCH que tiraria ou trocaria o título responde 422 `cheque_linked_unlink_first`, vínculo intacto, e o `unlink-title` com justificativa responde 200 (com `cheque_still_depositable` quando `deposited`); a enumeração, por script, de toda rota e todo caminho de escrita que grava `title_id` (N e lista: nenhuma outra porta); o A5-bis do dev e a sua sonda de `unlink-title` × `clear` com barreira nos dois sentidos (desfechos, FINAL, lançamentos; o caixa sem título do R-res-3 é medido e registrado como risco com dono, sem reprovar pelo comportamento declarado); vínculo × `clear` do mesmo título em N ≥ 10 rodadas sem `deadlock detected`, com a ordem de travas lida em `pg_locks`; `C:/Users/AMP/w-san312a/tests/b-san3-12a-pay-link-race-db.test.ts` e `C:/Users/AMP/w-san312a/tests/b-san3-12a-pay-pending-cheque-db.test.ts` três vezes (`skipped = 0`) e, ao fim de cada sonda sua, a consulta do invariante (nenhum título pago com cheque pendente vinculado e ativo; N = 0). Mutações D1, A5-bis CAS, A4 só o re-check e a sua. Vermelho-controle: com `src/modules/cheques` do head-base da emenda `<objeto>~8`, o PATCH do `tenant_admin` desvincula com 200 sem justificativa, e a sua consulta do invariante acusa um estado proibido fabricado por você, derruba com: `grep -i -E 'Item 3|D1|cheque_linked_unlink_first|unlink-title|A5-bis|R-res-1|R-res-3|deadlock|pg_locks|invariante|A4-bis|cheque_still_depositable|vermelho|head-base' C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a/c1-evidencia.md`

Protocolo P1/P2/P3/P4/P7 do §C7.7, verbatim no bloco colado acima, com `<cadeira>` = `c1`: evidência em `c1-evidencia.md` após CADA item; `c1-voto.json` nasce esqueleto com os três itens EM APURAÇÃO e o campo `arquivos_medidos` por item, cada item gravado ao ser medido, e fecha antes da mensagem final de 1 linha; sucessor de identidade nova (Opus, declarado) re-executa os comandos registrados e só então mede a cauda; três itens exatos; PAUSA grava head, feito, falta, próximo comando e arquivos meio-escritos e para. Queda vai a `00-quedas.md` do diretório desta junta (P6, pelo orquestrador); uma cadeira por vez (ordem do dono, mais estreita que a P5). Únicos outputs no repositório: `c1-evidencia.md` e `c1-voto.json` em `C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a/`; nunca commit, derruba com: `test -f C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a/c1-voto.json`

## MEDIDO

Pré-voo deste mandato com as ferramentas copiadas sem mudança para a pasta do redator `C:/Users/AMP/erp-pausa-2026-10-03/redator-san312a/` (diferença contra o ramo das ferramentas medida acima), executado com o cwd no worktree do objeto; o redator desta r3 é `fab-red-san312a-r3-opus` (Claude Opus 5.5, nível menor declarado, identidade nova), que fabricou o corpo da C4 e adaptou ao objeto novo os geradores da r2 (`redator-san312a-r2-opus`), que vinham da `fab-red-san312a-opus` (que fabricou os corpos C1 a C3 e a r1), e executou cada comando deste mandato pelo gerador `C:/Users/AMP/erp-pausa-2026-10-03/redator-san312a/gerar-c1.sh`, medido por: `cd C:/Users/AMP/w-san312a && MANDATO_REFS=C:/Users/AMP/erp-pausa-2026-10-03/redator-san312a/mandato-refs.sh bash C:/Users/AMP/erp-pausa-2026-10-03/redator-san312a/mandato-preflight.sh C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a/00-mandatos/cadeira-c1.md 459 2>&1; echo ec=$?`
```
COLAGEM    l.6-20: refs do PR #459 confere com a saida atual

PRE-VOO OK — C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a/00-mandatos/cadeira-c1.md
ec=0
```
