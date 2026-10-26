# Mandato — Cadeira C4 — B-SAN3-12a (junta de DINHEIRO, ciclo 1)

## MEDIDO

Estado do PR 459 no instante da redação, pela ferramenta `mandato-refs.sh` copiada sem mudança para a pasta própria do redator `C:/Users/AMP/erp-pausa-2026-10-03/redator-san312a/`, com o cwd no worktree do objeto (o head do PR, a merge-base, os check-runs, e nenhuma ata ainda), medido por: `cd C:/Users/AMP/w-san312a && bash C:/Users/AMP/erp-pausa-2026-10-03/redator-san312a/mandato-refs.sh 459`
```
# refs do PR #459 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato
# gerado em: 2026-10-26T01:50Z · repo: thiagodorgo/ERP_Techsolutios

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

O corpo desta cadeira existe no objeto e, descontados o frontmatter e o bloco de adaptação Codex do espelho, é IDÊNTICO entre os dois espelhos (comparação EOL-neutra; o arquivo inteiro difere por construção do espelho, e por isso não se publica hash); o número de linhas de cada espelho está na saída, e o corpo nasceu no commit dos corpos (a última linha conta os commits que o tocam), medido por: `cd C:/Users/AMP/w-san312a && diff <(tr -d '\r' < C:/Users/AMP/w-san312a/.claude/agents/especialistas/jurado-san312a-c4-isolamento-e-invariantes.md | awk 'f; $0=="---"{n++; if(n==2) f=1}' | sed '/^$/d') <(tr -d '\r' < C:/Users/AMP/w-san312a/.agents/agents/especialistas/jurado-san312a-c4-isolamento-e-invariantes.md | awk 'f; $0=="---"{n++; if(n==2) f=1}' | awk 'index($0,"Papel para o Codex"){s=1} s&&$0==""{s=0; next} !s' | sed '/^$/d') >/dev/null && echo 'IDENTICO corpo c4-isolamento-e-invariantes' || echo 'DIVERGE corpo c4-isolamento-e-invariantes'; wc -l < C:/Users/AMP/w-san312a/.claude/agents/especialistas/jurado-san312a-c4-isolamento-e-invariantes.md; wc -l < C:/Users/AMP/w-san312a/.agents/agents/especialistas/jurado-san312a-c4-isolamento-e-invariantes.md; echo "commits que tocam o corpo: $(git rev-list --count 04b8a667780930050c8af2c77c323b81fe8794bb -- C:/Users/AMP/w-san312a/.claude/agents/especialistas/jurado-san312a-c4-isolamento-e-invariantes.md)"`
```
IDENTICO corpo c4-isolamento-e-invariantes
392
398
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

Ciclo 1: no diretório de votos desta junta não há voto nem evidência de cadeira nenhuma (só o diretório dos mandatos), logo não há voto a carregar nem a revalidar (§C7 item 9) e a C4 vota pela primeira vez, no objeto, medido por: `ls C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a | sed -e 's#^#C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a/#'; echo "arquivos c1/c2/c3 de voto ou evidência: $(ls C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a | grep -c -i -E '^c[1234]-')"`
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

Por que a C4 existe: a passada anterior do inspetor desta junta BLOQUEOU o start por cobertura e nomeou, no item 2 do parecer, os quatro critérios sem cadeira (R-res-5 e A14, R-res-4 e A13, A21, A16) e o veredito (as linhas do parecer, pela busca textual), medido por: `tr -d '\r' < C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a/insp-san312a-parecer.md | grep -n -i -o -E '^## Item 2 de 3[^.]{0,60}|^  [1-4]\. \*\*(R-res-5|R-res-4 e A13|A21|A16)[^*]{0,60}\*\*|^\*\*BLOQUEADO\.\*\*|^BLOQUEADO$'`
```
20:## Item 2 de 3: identidades, papéis, composição, cobertura, briefing
31:  1. **R-res-5.**
32:  2. **R-res-4 e A13.**
33:  3. **A21 (`P-SAN3-20-DELETE-TITULO-COM-CHEQUE`, §12.1).**
34:  4. **A16 (`P-SAN3-20-RESUMO-CHEQUE-VINCULADO`, §12.1).**
57:**BLOQUEADO.**
75:BLOQUEADO
```

O quadro de riscos residuais do plano no objeto dá o R-res-4 à C3 ("opcional") e o R-res-5 à C2, e o §10 dava A13 e A14 à C1; nesta composição os quatro, mais A21 e A16, são da C4: divergência registrada (§A2) no corpo, e vale este mandato (as linhas do quadro e do §10, cortadas), medido por: `tr -d '\r' < C:/Users/AMP/w-san312a/docs/revisoes/SAN3/B-SAN3-12-plano.md | grep -n -i -E '^\| R-res-(4|5) \|' | cut -c1-170; tr -d '\r' < C:/Users/AMP/w-san312a/docs/revisoes/SAN3/B-SAN3-12-plano.md | grep -n -i -o -E 'C1 `agente-dba-guardiao`/dinheiro — \*\*Claude Opus\*\* \([^)]{0,70}\)'`
```
652:| R-res-4 | **ABA residual do CAS por estado** (§4.6): re-conciliação dupla no mesmo ms com carimbo lido igual | C3 | `-db` adversarial opcional (dois `UPDATE` no
653:| R-res-5 | **`$queryRaw` do bucket diário** com RLS: a consulta crua precisa rodar dentro de `withTenantRls` (como `sumByAccount`) — fora dela, vaza entre organiz
577:C1 `agente-dba-guardiao`/dinheiro — **Claude Opus** (corrida A4, CAS A13, paridade A14, auditoria A7)
```

Os critérios A13, A14, A16 e A21 do §8.1 do plano no objeto, com a mutação que cada um nomeia (linhas cortadas), e as duas pendências do §12.1 que o bloco fecha com A21 e A16, medido por: `tr -d '\r' < C:/Users/AMP/w-san312a/docs/revisoes/SAN3/B-SAN3-12-plano.md | grep -n -i -E '^\| A(13|14|16|21) \|' | cut -c1-230; tr -d '\r' < C:/Users/AMP/w-san312a/docs/revisoes/SAN3/B-SAN3-12-plano.md | grep -n -i -o -E 'P-SAN3-20-DELETE-TITULO-COM-CHEQUE` \(12a, A21[^)]{0,10}\)|P-SAN3-20-RESUMO-CHEQUE-VINCULADO` \(12a, A16[^)]{0,30}\)'`
```
490:| A13 | (v3, R2-05) `reconcile` sem `expected_reconciled`/`expected_reconciled_at` → 400 `expected_state_required`, nada gravado; dois clientes **leem o mesmo estado** (`false`, `null`) e gravam em sequência → o 1º 200,
491:| A14 | `aggregate group_by=none&reconciled=false` → `count`/`inflow`/`outflow` iguais à soma de fixture com centavos adversariais (0.1+0.2), em **memória e Prisma** (paridade `-db`); deletado não conta; cross-tenant não
493:| A16 | `financial-summary.cheques.linkedPendingAmount` = Σ cheques pendentes **com** `title_id`; sem vínculo = 0 | somar também os sem título |
500:| A21 | (v3) `PATCH /financial-titles/:id {amount}` e `DELETE /financial-titles/:id` com cheque pendente vinculado → 422 `title_has_pending_cheque`; `PATCH` só de `description` → 200; sem cheque pendente → como hoje | r
605:P-SAN3-20-DELETE-TITULO-COM-CHEQUE` (12a, A21 — v3)
605:P-SAN3-20-RESUMO-CHEQUE-VINCULADO` (12a, A16 + rótulo na tela em 12b)
```

O agregado no objeto: o `$queryRaw` do `aggregate` traz o filtro `tenant_id = …` E roda dentro de `withTenantRls` (o wrapper que o chama), duas camadas — a mutação que o plano nomeia ("tirar o `withTenantRls`") pode não deixar vermelho o teste cross-tenant enquanto o filtro explícito existir, e por isso o item 1 mede a matriz mutação × papel; a tabela `financial_entries` tem `ENABLE` e `FORCE ROW LEVEL SECURITY` na migração que a criou (linhas da busca textual, a migração lida pelo nome da pasta sem o carimbo), medido por: `tr -d '\r' < C:/Users/AMP/w-san312a/src/modules/financial-entries/financial-entry-prisma.repository.ts | grep -n -i -E 'async aggregate\(|tenant_id = \$\{input\.tenantId\}|\$queryRaw<Array<\{ bucket|withTenantRls\(this\.prismaClient, input\.tenantId, \(tx\) => new PrismaFinancialEntryRepository\(tx\)\.aggregate|fora dela a RLS' | cut -c1-170; F=C:/Users/AMP/w-san312a/$(git -C C:/Users/AMP/w-san312a ls-tree -r --name-only 04b8a667780930050c8af2c77c323b81fe8794bb -- prisma/migrations | grep -i -E '_add_financial_entries/migration\.sql$'); tr -d '\r' < "$F" | grep -n -i -E 'ALTER TABLE "financial_entries" (ENABLE|FORCE) ROW LEVEL SECURITY'; echo "consultas cruas em financial-entries e financial-summary: $(git -C C:/Users/AMP/w-san312a grep -c -i -E '\$queryRaw|\$executeRaw' -- src/modules/financial-entries src/modules/financial-summary | sed -e 's#^#C:/Users/AMP/w-san312a/#' | tr '\n' ' ')"`
```
141:  // Roda na transação recebida (o Rls abaixo abre `withTenantRls`): fora dela a RLS não filtraria (R-res-5).
142:  async aggregate(input: AggregateFinancialEntryInput): Promise<readonly FinancialEntryAggregateItem[]> {
150:    const filters: Prisma.Sql[] = [Prisma.sql`tenant_id = ${input.tenantId}::uuid`, Prisma.sql`deleted_at IS NULL`];
157:    const rows = await this.client.$queryRaw<Array<{ bucket: string | null; count: number; inflow: string; outflow: string }>>`
255:    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaFinancialEntryRepository(tx).aggregate(input));
66:ALTER TABLE "financial_entries" ENABLE ROW LEVEL SECURITY;
67:ALTER TABLE "financial_entries" FORCE ROW LEVEL SECURITY;
consultas cruas em financial-entries e financial-summary: C:/Users/AMP/w-san312a/src/modules/financial-entries/financial-entry-prisma.repository.ts:2
```

O CAS da conciliação no objeto: no Prisma, o `WHERE` do `reconcile` compara `reconciled` e `reconciled_at` com o estado esperado; na memória, o par é comparado antes de gravar; no serviço, o `reconcile` roda em `uow.run` e o 409 `reconciliation_stale` nasce na releitura (linhas da busca textual, cortadas), medido por: `tr -d '\r' < C:/Users/AMP/w-san312a/src/modules/financial-entries/financial-entry-prisma.repository.ts | grep -n -i -E 'reconciled: input\.expectedReconciled|reconciled_at: input\.expectedReconciledAt' | cut -c1-140; tr -d '\r' < C:/Users/AMP/w-san312a/src/modules/financial-entries/financial-entry.repository.ts | grep -n -i -E 'current\.reconciled !== input\.expectedReconciled|input\.expectedReconciledAt\?\.getTime' | cut -c1-140; tr -d '\r' < C:/Users/AMP/w-san312a/src/modules/financial-entries/financial-entry.service.ts | grep -n -i -E 'const entry = await uow\.run\(actor\.tenantId|expectedReconciled: expected\.reconciled|409 reconciliation_stale\.|"expected_state_required",' | cut -c1-140`
```
103:        reconciled: input.expectedReconciled,
104:        reconciled_at: input.expectedReconciledAt,
272:    if (current.reconciled !== input.expectedReconciled) return undefined;
273:    if ((current.reconciledAt?.getTime() ?? null) !== (input.expectedReconciledAt?.getTime() ?? null)) return undefined;
169:    "expected_state_required",
541:  // → 403 unreconcile_forbidden (só no desfazer) → 400 invalid_divergence_type → (unidade) 409 reconciliation_stale.
568:    // decide; 0 linhas → relê na mesma unidade: sumiu → 404, mudou → 409 reconciliation_stale.
570:    const entry = await uow.run(actor.tenantId, async (ctx) => {
574:        expectedReconciled: expected.reconciled,
```

A21 e A16 no objeto: o serviço de títulos chama `assertNoPendingCheque` no `update` e no `delete` (as duas linhas de chamada, mais a definição, que lança `title_has_pending_cheque`); o `compute` do resumo soma `linkedPending*` só dos cheques pendentes com `titleId`; a projeção em memória e a consulta Prisma do resumo trazem o título do cheque, e a Prisma filtra por `tenant_id` (linhas da busca textual, cortadas), medido por: `tr -d '\r' < C:/Users/AMP/w-san312a/src/modules/financial-titles/financial-title.service.ts | grep -n -i -E 'await assertNoPendingCheque\(|^async function assertNoPendingCheque|"title_has_pending_cheque",' | cut -c1-140; tr -d '\r' < C:/Users/AMP/w-san312a/src/modules/financial-summary/financial-summary.compute.ts | grep -n -i -E 'isChequePending\(cheque\.status\)|cheque\.titleId != null|linkedPendingAmount \+= cheque\.amount' | cut -c1-140; tr -d '\r' < C:/Users/AMP/w-san312a/src/modules/financial-summary/financial-summary.repository.ts | grep -n -i -o -E 'titleId: c\.titleId[^,}]{0,20}'; tr -d '\r' < C:/Users/AMP/w-san312a/src/modules/financial-summary/financial-summary-prisma.repository.ts | grep -n -i -E 'select: \{ direction: true, status: true, amount: true, title_id: true \}|titleId: cheque\.title_id' | cut -c1-140`
```
280:      await assertNoPendingCheque(actor.tenantId, current.id);
392:    await assertNoPendingCheque(actor.tenantId, current.id);
422:async function assertNoPendingCheque(tenantId: string, financialTitleId: string): Promise<void> {
428:      "title_has_pending_cheque",
148:    if (!isChequePending(cheque.status)) continue;
149:    if (cheque.titleId != null) {
151:      linkedPendingAmount += cheque.amount;
59:titleId: c.titleId ?? null
31:        select: { direction: true, status: true, amount: true, title_id: true },
79:        titleId: cheque.title_id,
```

Os testes que medem os três itens existem no objeto e cada caso nomeado está lá (R-res-5 e A14 do agregado, A13 da conciliação, A21 e A16), e os quatro `-db` pulam DECLARANDO quando falta `DATABASE_URL` (contagem, por arquivo, dos casos com o identificador do item no nome e das linhas de `skip:` que mandam definir a variável); o `sed` põe o prefixo do worktree, medido por: `cd C:/Users/AMP/w-san312a && for f in C:/Users/AMP/w-san312a/tests/b-san3-12a-entries-aggregate.test.ts C:/Users/AMP/w-san312a/tests/b-san3-12a-entries-aggregate-db.test.ts C:/Users/AMP/w-san312a/tests/b-san3-12a-aggregate-tz-db.test.ts C:/Users/AMP/w-san312a/tests/b-san3-12a-unreconcile-policy.test.ts C:/Users/AMP/w-san312a/tests/b-san3-12a-reconcile-cas-db.test.ts C:/Users/AMP/w-san312a/tests/b-san3-12a-pay-pending-cheque.test.ts C:/Users/AMP/w-san312a/tests/b-san3-12a-pay-pending-cheque-db.test.ts C:/Users/AMP/w-san312a/tests/cheque-title-link.test.ts C:/Users/AMP/w-san312a/tests/financial-summary.test.ts; do c=$(tr -d '\r' < $f | grep -c -i -E '^ *test[(].(R-res-5|A14|A13|A21|A2/A21|A19/A20/A21|A16|K2)'); k=$(tr -d '\r' < $f | grep -c -i -E 'skip: .Defina'); echo "$f casos-do-item=$c skip=$k"; done; tr -d '\r' < C:/Users/AMP/w-san312a/tests/b-san3-12a-entries-aggregate-db.test.ts | grep -n -i -o -E 'test[(].R-res-5 [(]db[)][^,]{0,60}'`
```
C:/Users/AMP/w-san312a/tests/b-san3-12a-entries-aggregate.test.ts casos-do-item=2 skip=0
C:/Users/AMP/w-san312a/tests/b-san3-12a-entries-aggregate-db.test.ts casos-do-item=2 skip=1
C:/Users/AMP/w-san312a/tests/b-san3-12a-aggregate-tz-db.test.ts casos-do-item=0 skip=1
C:/Users/AMP/w-san312a/tests/b-san3-12a-unreconcile-policy.test.ts casos-do-item=4 skip=0
C:/Users/AMP/w-san312a/tests/b-san3-12a-reconcile-cas-db.test.ts casos-do-item=3 skip=1
C:/Users/AMP/w-san312a/tests/b-san3-12a-pay-pending-cheque.test.ts casos-do-item=3 skip=0
C:/Users/AMP/w-san312a/tests/b-san3-12a-pay-pending-cheque-db.test.ts casos-do-item=2 skip=1
C:/Users/AMP/w-san312a/tests/cheque-title-link.test.ts casos-do-item=5 skip=0
C:/Users/AMP/w-san312a/tests/financial-summary.test.ts casos-do-item=2 skip=0
106:test("R-res-5 (db): duas organizações na mesma base — o agregado de cada u
```

As pendências que regem a régua da C4 existem no registro do objeto, com data e prioridade: as duas do §12.1 que o 12a fecha (A21, A16) e a do ABA residual do CAS (R-res-4), com dono (linha e título), medido por: `tr -d '\r' < C:/Users/AMP/w-san312a/agent-orchestration/controle/pendencias.md | grep -n -i -o -E '^## (P-SAN3-20-DELETE-TITULO-COM-CHEQUE|P-SAN3-20-RESUMO-CHEQUE-VINCULADO|P-SAN3-12-CAS-VERSION-COLUMN) \([0-9-]{10}\) — [^—]{0,70}— [A-Z]+'`
```
11617:## P-SAN3-20-DELETE-TITULO-COM-CHEQUE (2026-10-24) — título com cheque pendente pode ser apagado — BAIXA
11622:## P-SAN3-20-RESUMO-CHEQUE-VINCULADO (2026-10-24) — KPI pode somar título e cheque pendente — BAIXA
11703:## P-SAN3-12-CAS-VERSION-COLUMN (2026-10-25) — ABA residual do CAS por estado lógico — BAIXA
```

Memória de commit livre em GB (a P8 (c) exige pelo menos 4 antes de lançar agente), os trabalhos Docker vivos fora da base `erp-*` (o teto é 2 contando o da cadeira) e o disco livre em `C:` (a ordem do orquestrador: PARE abaixo de 7 GB), no instante da redação: a cadeira mede de novo antes de subir, medido por: `powershell.exe -NoProfile -Command '$o=Get-CimInstance Win32_PerfFormattedData_PerfOS_Memory; [math]::Round(($o.CommitLimit-$o.CommittedBytes)/1GB,2)'; docker ps --format '{{.Names}}' | grep -v -i -E '^erp-' | sed -E 's#-(pg|redis|run|net)$##' | sort -u; echo "trabalhos fora de erp: $(docker ps --format '{{.Names}}' | grep -v -i -E '^erp-' | sed -E 's#-(pg|redis|run|net)$##' | sort -u | wc -l)"; df -h /c | tail -1 | awk '{print "livre em C: " $4}'`
```
14,03
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

Você é `jurado-san312a-c4-opus` (identidade nova; o orquestrador confirma no disparo), executor Claude Opus (subagente genérico, corpo lido do blob do objeto), modelo **Claude Opus**, nível menor DECLARADO (§C7.6), cobrindo o Codex, que está sem limite; o seu corpo canônico é `C:/Users/AMP/w-san312a/.claude/agents/especialistas/jurado-san312a-c4-isolamento-e-invariantes.md`, carregado **do blob do objeto** (o worktree está no objeto, medido acima; §A7). Onde o corpo divergir deste mandato quanto a objeto, diretório de votos, régua, bases ou inelegíveis, vale este mandato. Na primeira linha de `c4-evidencia.md`, declare executor efetivo, modelo, nível, objeto, `mandato_md5` deste arquivo (CR retirado antes do md5) e o veredito IDENTICO/DIVERGE do corpo que você carregou contra o blob do objeto, EOL-neutro. **Opus esgotado: PARE sem votar** e registre onde parou (§C7.6-bis); o sucessor de queda é outra identidade Opus declarada. Inelegíveis por nome: `planejador-mestre` (Fable, plano v3), `planejador-san312-e1-fable` (E1 e E1-bis), `crit-san312-pro` (r1, Gemini), `crit-san312-opus-r2` (r2), `crit-san312-pro-r2` e `crit-san3-12-r2-pro` (críticos do r2 citados no registro), `crit-san312a-e1-opus` (crítica da E1), `dev-san312a-opus`, `fab-red-san312a-opus` (fabricou os corpos C1 a C3 e a r1 dos mandatos), `redator-san312a-r2-opus` (adaptou a r2 dos mandatos), `fab-red-san312a-r3-opus` (fabricou o seu corpo, redigiu este mandato e executou as medições dele), o orquestrador, `inspetor-san312a-opus`, `jurado-san312a-c1-opus`, `jurado-san312a-c2-opus` e `jurado-san312a-c3-opus`; se o seu nome coincidir, pare. Monocultura declarada: o dev, o crítico da E1 e as cinco identidades desta junta (o inspetor e as quatro cadeiras) rodam em Claude Opus. O plano v3 com E1 e E1-bis, o relatório do dev, as críticas e o parecer anterior do inspetor são **A RE-VERIFICAR**, derruba com: `head -1 C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a/c4-evidencia.md | grep -i -E 'executor|Opus|mandato_md5|objeto|IDENTICO|DIVERGE'`

A legalidade vem antes do mérito: um parecer NOVO do inspetor (`insp-san312a-parecer.md` refeito depois do bloqueio medido acima, que não libera ninguém) com LIBERADO ou LIBERADO COM RESSALVA nomeando você, o seu executor, o seu worktree, os seus containers e a sua vez (uma cadeira por vez, na ordem C2 → C4 → C1 → C3); o objeto é o head do PR 459 (medido acima), com todos os check-runs concluídos (head que andou bloqueia o início). Régua: bloco de DINHEIRO e de PERMISSÃO, **unanimidade das 4 cadeiras com veto** (§C7 item 8(1); a C4 entrou por decisão do orquestrador depois do bloqueio por cobertura); **ciclo 1**: todo `bloqueia` com escopo `dentro-do-bloco` reprova, grave ou não (§C7 item 8(2)); soma de outra organização no agregado ou no resumo é `grave: vazamento entre organizações`, conciliação sobrescrita sem 409 é `grave: perda de dado`, valor de título mudado com cheque a compensar é `grave: dinheiro`; o ABA do CAS reproduzido SÓ pela via forçada é resíduo declarado com dono (`P-SAN3-12-CAS-VERSION-COLUMN`, medido acima) e não reprova por construção, e reproduzido pela via real se gradua com frequência e efeito. Todo achado declara gravidade, classe, escopo, N e forma; `pre-existente` exige evidência de data ou origem e pendência com dono (§C7.1-ter(a)); "não consigo medir" item seu é REPROVADO; não proponha correção (§C7.4-bis), não reabra as decisões do dono nem a E1 e a E1-bis, não cobre KPI nem matéria de C1, C2 ou C3, não leia os votos e evidências das outras cadeiras; o voto declara `arquivos_medidos` (§C7 item 9 (0)) POR ITEM, honesto, e `**` no item que rodar `npm test`, `check` ou `build`, derruba com: `grep -i -E 'legalidade|A RE-VERIFICAR|gravidade|classe|escopo|arquivos_medidos|ciclo 1|vazamento entre organizações|4 cadeiras' C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a/c4-voto.json`

Terreno: worktree exclusivo `C:/Users/AMP/j12a-c4-wt`, detached no objeto, com `npm ci` próprio e zero junction de `node_modules` (§C7.1-ter(c)), removido só por `git worktree remove --force` depois de conferir que nenhum processo o usa; o vermelho-controle por `git checkout <objeto>~14 -- <caminho>` (o head-base do bloco, medido acima) no SEU worktree, restaurado e provado por `git hash-object` = blob do objeto. Postgres 16 `j12a-c4-pg` e Redis 7 `j12a-c4-redis` próprios, só em `127.0.0.1`, portas altas testadas antes (candidatas 47743 e 47744; nunca as das outras cadeiras), senha aleatória só por ambiente; bancos extras `j12a_c4_*`; no seu Postgres você cria um papel `j12a_c4_rt` `NOSUPERUSER NOBYPASSRLS` com os grants da aplicação, para medir a RLS (o superusuário a contorna), e o remove no fim; `DATABASE_URL` e `REDIS_URL` seus como prefixo de **todo** comando `node`/`npm`; `npx prisma migrate deploy` no SEU banco. Antes de subir: memória de commit livre ≥ 4 GB (P8 (c)), no máximo 2 trabalhos Docker na máquina contando o seu (medido acima), disco ≥ 7 GB (abaixo disso, PARE e registre); faltando memória ou teto, espere. Uma cadeira por vez: você só sobe quando o inspetor disser que é a sua vez. Nunca a base viva (`erp-postgres`, `erp-redis`, `erp-postgres-alt`), nem 5432, 6379, 3000, 5173, 5050, 8899, 55432, 55412, 55413; nunca `prune` nem container alheio. Mutação só no seu worktree, uma por vez, âncora única com prova de aplicação (CRLF incluso); scripts e sondas numa pasta sua `C:/Users/AMP/erp-pausa-2026-10-03/j12a-c4/`, para que a evidência seja re-executável, derruba com: `grep -i -E 'j12a-c4-wt|j12a-c4-pg|j12a-c4-redis|j12a_c4_|j12a_c4_rt|BYPASSRLS|127\.0\.0\.1|junction|commit livre|4 GB|7 GB|erp-|5432|6379|hash-object|head-base|teardown' C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a/c4-evidencia.md`

Item 1 de 3 (R-res-5 e A14 — o agregado `GET /financial-entries/aggregate` não vaza entre organizações, e cada camada que o impede foi vista acusando): `C:/Users/AMP/w-san312a/tests/b-san3-12a-entries-aggregate.test.ts` em memória e `C:/Users/AMP/w-san312a/tests/b-san3-12a-entries-aggregate-db.test.ts` e `C:/Users/AMP/w-san312a/tests/b-san3-12a-aggregate-tz-db.test.ts` contra o seu Postgres, com `tests | pass | fail | skipped` (o caso "R-res-5 (db)" rodado, não pulado); o terreno da RLS no seu banco (`relrowsecurity`, `relforcerowsecurity` e as políticas de `financial_entries`; `rolsuper` e `rolbypassrls` do seu papel e do `j12a_c4_rt`); a sua sonda cross-tenant pela rota e pelo serviço — duas organizações, centavos adversariais, um deletado em cada, `group_by` `none`, `month` e `day`, com `account_id` da outra, `reconciled`, `direction`, `from` e `to` —, rodada sob o superusuário E sob o `j12a_c4_rt`: cada organização vê só os seus, a conta alheia devolve `items` vazio e nunca 403; a matriz das mutações M5a (sem o `withTenantRls` no caminho do agregado), M5b (sem o filtro `tenant_id =`) e M5c (as duas) × os dois papéis, com vaza ou não, vermelho ou verde e o motivo, respondendo por execução se a RLS sozinha filtra e se, sem o `withTenantRls`, ela ainda seria a defesa (mutação sem caso vermelho é `criterio_que_nao_pode_falhar`); a enumeração por script das consultas cruas de `src/modules/financial-entries` e `src/modules/financial-summary` (medida acima), cada uma dentro ou fora de `withTenantRls` e com ou sem filtro de tenant; e as mutações do A14 (somar em `Number` antes do `round`; tirar `deleted_at IS NULL`) na memória e no `-db`. Vermelho-controle: no head-base do bloco a rota não existe (a sua sonda recebe 404 de rota) e, no objeto, a M5c sob o superusuário faz a sua sonda acusar o vazamento, derruba com: `grep -i -E 'Item 1|R-res-5|A14|aggregate|withTenantRls|tenant_id|M5a|M5b|M5c|j12a_c4_rt|rolbypassrls|relforcerowsecurity|cross-tenant|queryRaw|vermelho|head-base' C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a/c4-evidencia.md`

Item 2 de 3 (R-res-4 e A13 — o CAS por estado lógico da conciliação e o ABA residual): os casos A13 de `C:/Users/AMP/w-san312a/tests/b-san3-12a-unreconcile-policy.test.ts` em memória e `C:/Users/AMP/w-san312a/tests/b-san3-12a-reconcile-cas-db.test.ts` contra o seu Postgres, com `tests | pass | fail | skipped`; a sua sonda HTTP do contrato — sem os dois campos esperados, só com um, com tipos errados: 400 `expected_state_required` e NADA gravado (a linha relida igual); dois clientes do mesmo estado lido, em sequência: 200 e 409 `reconciliation_stale`; estado defasado explícito: 409; lançamento de outra organização: 404; nos 409, o `reconciled_by` e o `reconciliation_ref` do 1º intactos; nos dois sentidos (conciliar e desfazer pelo `tenant_admin`; a permissão do desfazer é da C2); a concorrência real no Postgres, N ≥ 20 rodadas de dois `reconcile` simultâneos do mesmo estado lido: exatamente 1 grava em toda rodada, 0 `deadlock detected`; o ABA residual em duas vias com N e forma — a FORÇADA (dois `UPDATE` com o `WHERE` do CAS gravando o MESMO carimbo, concorrentes sob READ COMMITTED: linhas afetadas por cada um) e a REAL (pelo serviço, sem forçar, N ≥ 200 tentativas de re-conciliar quem leu `(true, T)`: quantas vezes o carimbo novo saiu no mesmo ms de `T` e quantas vezes os dois gravaram), com o efeito do 2º sobre `reconciled_by`, `reconciliation_ref` e `divergence_type`; e as mutações M13a (sem `reconciled` no `WHERE`), M13b (sem `reconciled_at` no `WHERE`), M13c (sem a comparação do par na memória), M13d (o `reconcile` em memória fora do `uow.run`) e M13e (aceitar a ausência dos campos), cada uma com o caso vermelho e a asserção. Vermelho-controle: com `src/modules/financial-entries` do head-base do bloco no seu worktree, o `reconcile` sem estado esperado e o 2º cliente do mesmo estado respondem 200, e a sua sonda e o caso A13 do objeto ficam vermelhos pela asserção, derruba com: `grep -i -E 'Item 2|R-res-4|A13|expected_state_required|reconciliation_stale|reconciled_by|ABA|via forçada|via real|READ COMMITTED|M13a|M13b|M13c|M13d|M13e|deadlock|vermelho|head-base' C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a/c4-evidencia.md`

Item 3 de 3 (A21 e A16 — o título com cheque pendente não muda de valor nem some, e o resumo soma o vinculado certo; fecham `P-SAN3-20-DELETE-TITULO-COM-CHEQUE` e `P-SAN3-20-RESUMO-CHEQUE-VINCULADO`, medidas acima): os casos A21 de `C:/Users/AMP/w-san312a/tests/b-san3-12a-pay-pending-cheque.test.ts`, o A19/A20/A21 e o A16 de paridade de `C:/Users/AMP/w-san312a/tests/b-san3-12a-pay-pending-cheque-db.test.ts` contra o seu Postgres, o caso do A21 em `C:/Users/AMP/w-san312a/tests/cheque-title-link.test.ts` e os A16 de `C:/Users/AMP/w-san312a/tests/financial-summary.test.ts`, com `tests | pass | fail | skipped`; a sua sonda A21 pela rota — título com cheque `registered` e com cheque `deposited` vinculados: PATCH de `amount` (maior, menor, igual), de `amount` com `description`, só de `description`, e `DELETE`: status, `reason`, `details` sem `tenant_id`, e título e cheque relidos intactos nos 422; depois do desvínculo e com cheque `cleared`, `bounced` ou `cancelled`, "como hoje"; cheque pendente de outra organização não recusa o PATCH daqui; o `PATCH /status → cancelled` só como nota (`P-SAN3-12-STATUS-CANCELLED-COM-CHEQUE-PENDENTE`, pré-existente com dono); a sua sonda A16 — pendentes com e sem título, compensado, devolvido, cancelado e deletado com título, e um pendente com título na outra organização: `cheques.linkedPendingCount` e `linkedPendingAmount` iguais à fixture em centavos inteiros, iguais em memória e no Prisma, sem soma alheia, e as chaves do bloco `cheques` do DTO sem `tenant_id`; as mutações M21a (sem a guarda no `update`) e M21b (sem a guarda no `delete`), separadas, M21c (a porta aceitando `cleared` como pendente), M16a (somar os sem título), M16b (sem `titleId` na projeção em memória), M16c (contar `cleared` e `bounced`) e M16d (sem o filtro de tenant na consulta Prisma do resumo), cada uma com o caso vermelho e a asserção; e diga, de cada pendência do §12.1, se o critério escrito está cumprido por execução (o porteiro as fecha no merge). Vermelho-controle: com `src/modules/financial-titles` do head-base do bloco no seu worktree, o PATCH de valor e o `DELETE` do título com cheque pendente passam (2xx) e o A21 do objeto fica vermelho pela asserção; com `src/modules/financial-summary` do head-base, o A16 (compute) do objeto fica vermelho pela asserção, derruba com: `grep -i -E 'Item 3|A21|A16|title_has_pending_cheque|linkedPendingAmount|linkedPendingCount|cheque-pending-reader|M21a|M21b|M21c|M16a|M16b|M16c|M16d|DELETE-TITULO|RESUMO-CHEQUE|vermelho|head-base' C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a/c4-evidencia.md`

Protocolo P1/P2/P3/P4/P7 do §C7.7, verbatim no bloco colado acima, com `<cadeira>` = `c4`: evidência em `c4-evidencia.md` após CADA item; `c4-voto.json` nasce esqueleto com os três itens EM APURAÇÃO e o campo `arquivos_medidos` por item, cada item gravado ao ser medido, e fecha antes da mensagem final de 1 linha; sucessor de identidade nova (Opus, declarado) re-executa os comandos registrados e só então mede a cauda; três itens exatos; PAUSA grava head, feito, falta, próximo comando e arquivos meio-escritos (inclusive o papel `j12a_c4_rt` e uma mutação não restaurada) e para. Queda vai a `00-quedas.md` do diretório desta junta (P6, pelo orquestrador); uma cadeira por vez (ordem do dono, mais estreita que a P5). Únicos outputs no repositório: `c4-evidencia.md` e `c4-voto.json` em `C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a/`; nunca commit, derruba com: `test -f C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a/c4-voto.json`

## MEDIDO

Pré-voo deste mandato com as ferramentas copiadas sem mudança para a pasta do redator `C:/Users/AMP/erp-pausa-2026-10-03/redator-san312a/` (diferença contra o ramo das ferramentas medida acima), executado com o cwd no worktree do objeto; o redator desta r3 é `fab-red-san312a-r3-opus` (Claude Opus 5.5, nível menor declarado, identidade nova), que fabricou o corpo da C4 e adaptou ao objeto novo os geradores da r2 (`redator-san312a-r2-opus`), que vinham da `fab-red-san312a-opus` (que fabricou os corpos C1 a C3 e a r1), e executou cada comando deste mandato pelo gerador `C:/Users/AMP/erp-pausa-2026-10-03/redator-san312a/gerar-c4.sh`, medido por: `cd C:/Users/AMP/w-san312a && MANDATO_REFS=C:/Users/AMP/erp-pausa-2026-10-03/redator-san312a/mandato-refs.sh bash C:/Users/AMP/erp-pausa-2026-10-03/redator-san312a/mandato-preflight.sh C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a/00-mandatos/cadeira-c4.md 459 2>&1; echo ec=$?`
```
COLAGEM    l.6-20: refs do PR #459 confere com a saida atual

PRE-VOO OK — C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a/00-mandatos/cadeira-c4.md
ec=0
```
