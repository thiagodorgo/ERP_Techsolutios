# Mandato — Inspetor de terreno — B-SAN3-12a (junta de DINHEIRO, ciclo 1)

## MEDIDO

Estado do PR 459 no instante da redação, pela ferramenta `mandato-refs.sh` copiada sem mudança para a pasta própria do redator `C:/Users/AMP/erp-pausa-2026-10-03/redator-san312a/`, com o cwd no worktree do objeto (o head do PR, a merge-base, os check-runs, e nenhuma ata ainda), medido por: `cd C:/Users/AMP/w-san312a && bash C:/Users/AMP/erp-pausa-2026-10-03/redator-san312a/mandato-refs.sh 459`
```
# refs do PR #459 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato
# gerado em: 2026-10-26T01:47Z · repo: thiagodorgo/ERP_Techsolutios

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

Os quatro corpos das cadeiras no objeto (C1, C2 e C3 de `<objeto>~2`, e a C4 do commit do topo) são IDÊNTICOS entre os dois espelhos descontado o bloco Codex (EOL-neutro), e o S0 (`sync-agent-agents.mjs --check`) passa num worktree descartável no objeto, `C:/Users/AMP/j12a-insp-s0`, criado e removido pelo próprio comando (a última linha confirma a remoção), medido por: `cd C:/Users/AMP/w-san312a && for c in c1-dinheiro-e-concorrencia c2-permissao-e-auditoria c3-regressao-escopo-contrato c4-isolamento-e-invariantes; do diff <(tr -d '\r' < C:/Users/AMP/w-san312a/.claude/agents/especialistas/jurado-san312a-$c.md | awk 'f; $0=="---"{n++; if(n==2) f=1}' | sed '/^$/d') <(tr -d '\r' < C:/Users/AMP/w-san312a/.agents/agents/especialistas/jurado-san312a-$c.md | awk 'f; $0=="---"{n++; if(n==2) f=1}' | awk 'index($0,"Papel para o Codex"){s=1} s&&$0==""{s=0; next} !s' | sed '/^$/d') >/dev/null && echo "IDENTICO corpo $c" || echo "DIVERGE corpo $c"; done; git worktree add --detach C:/Users/AMP/j12a-insp-s0 04b8a667780930050c8af2c77c323b81fe8794bb >/dev/null 2>&1; node C:/Users/AMP/j12a-insp-s0/scripts/sync-agent-agents.mjs --check; echo "sync ec=$?"; git worktree remove --force C:/Users/AMP/j12a-insp-s0; test -d C:/Users/AMP/j12a-insp-s0 && echo 'worktree S0 FICOU' || echo 'worktree S0 removido'`
```
IDENTICO corpo c1-dinheiro-e-concorrencia
IDENTICO corpo c2-permissao-e-auditoria
IDENTICO corpo c3-regressao-escopo-contrato
IDENTICO corpo c4-isolamento-e-invariantes
[agents-sync] OK — 89 agentes, espelho consistente.
sync ec=0
worktree S0 removido
```

O corpo do inspetor de terreno fixa `model: opus` no frontmatter nos dois espelhos, no objeto, medido por: `for f in C:/Users/AMP/w-san312a/.claude/agents/inspetor-de-terreno-da-junta.md C:/Users/AMP/w-san312a/.agents/agents/inspetor-de-terreno-da-junta.md; do echo "$f $(tr -d '\r' < $f | grep -i -E '^model:')"; done`
```
C:/Users/AMP/w-san312a/.claude/agents/inspetor-de-terreno-da-junta.md model: opus
C:/Users/AMP/w-san312a/.agents/agents/inspetor-de-terreno-da-junta.md model: opus
```

Os insumos do briefing, no objeto: as Emendas E1 e E1-bis apensas ao plano (linha e começo dos cabeçalhos de cada uma e das seções E1.10 e E1b.6), as etapas E10 a E14 do relatório do dev, e as críticas versionadas do bloco (contagem de linhas de cada arquivo); a cópia versionada `B-SAN3-12-plano-v3.md` que o §7.1 do plano prevê NÃO existe no objeto (a última linha conta), o que é matéria de registro da C3, medido por: `tr -d '\r' < C:/Users/AMP/w-san312a/docs/revisoes/SAN3/B-SAN3-12-plano.md | grep -n -i -o -E '^## Emenda E1(-bis)? \(12a\)|^### E1\.10 — [^(]{0,30}|^### E1b\.6 — [^(]{0,30}'; tr -d '\r' < C:/Users/AMP/w-san312a/docs/revisoes/SAN3/B-SAN3-12a-dev.md | grep -n -i -o -E '^## E1[0-4] — [^(,`]{0,40}'; for f in C:/Users/AMP/w-san312a/docs/revisoes/SAN3/B-SAN3-12-critica-r1.md C:/Users/AMP/w-san312a/docs/revisoes/SAN3/B-SAN3-12-critica-r2.md C:/Users/AMP/w-san312a/docs/revisoes/SAN3/B-SAN3-12a-E1-critica.md C:/Users/AMP/w-san312a/docs/revisoes/SAN3/B-SAN3-12a-dev.md C:/Users/AMP/w-san312a/docs/revisoes/SAN3/B-SAN3-12-plano.md; do echo "$f $(wc -l < $f)"; done; echo "plano-v3 versionado: $(git -C C:/Users/AMP/w-san312a ls-tree -r --name-only 04b8a667780930050c8af2c77c323b81fe8794bb -- docs | grep -c -i 'B-SAN3-12-plano-v3')"`
```
670:## Emenda E1 (12a)
783:### E1.10 — §7.1 emendado
837:## Emenda E1-bis (12a)
917:### E1b.6 — O que muda no §7.1/§9.2 em r
202:## E10 — retomada pelas Emendas E1 e E1-bis
226:## E11 — mutações da E1/E1-bis
252:## E12 — bateria
267:## E13 — B1
295:## E14 — estado e limpeza
C:/Users/AMP/w-san312a/docs/revisoes/SAN3/B-SAN3-12-critica-r1.md 32
C:/Users/AMP/w-san312a/docs/revisoes/SAN3/B-SAN3-12-critica-r2.md 157
C:/Users/AMP/w-san312a/docs/revisoes/SAN3/B-SAN3-12a-E1-critica.md 128
C:/Users/AMP/w-san312a/docs/revisoes/SAN3/B-SAN3-12a-dev.md 299
C:/Users/AMP/w-san312a/docs/revisoes/SAN3/B-SAN3-12-plano.md 937
plano-v3 versionado: 0
```

Ciclo 1: no diretório de votos desta junta não há voto nem evidência de cadeira nenhuma (só o diretório dos mandatos e a evidência e o parecer BLOQUEADO da passada anterior do inspetor, que bloqueou o start por cobertura e motivou a C4): as quatro cadeiras votam pela primeira vez, no objeto, e não há voto a carregar nem a revalidar (§C7 item 9), medido por: `ls C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a | sed -e 's#^#C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a/#'; echo "arquivos c1/c2/c3/c4 de voto ou evidência: $(ls C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a | grep -c -i -E '^c[1234]-')"; echo "veredito da passada anterior: $(tail -1 C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a/insp-san312a-parecer.md | tr -d '\r')"`
```
C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a/00-mandatos
C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a/insp-san312a-evidencia.md
C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a/insp-san312a-parecer.md
arquivos c1/c2/c3/c4 de voto ou evidência: 0
veredito da passada anterior: BLOQUEADO
```

O que a E1-bis (§E1b.6) manda a junta medir — A27, A28, D1, A6-bis, F5, B1, B2, F3 e A17-bis — aparece nas linhas `Item` de pelo menos uma das quatro cadeiras deste diretório; e os quatro critérios que a passada anterior do inspetor achou sem cadeira (R-res-5 e A14, R-res-4 e A13, A21, A16) aparecem agora nas linhas `Item` da C4 (a lista de cada cadeira e os que faltam, gerados das linhas `Item` dos quatro mandatos; `faltando` vazio); a distribuição difere da E1b.6 e do quadro de riscos do plano (a D1 está na C1 e na C2; a auditoria A7 na C2; R-res-5, que o plano dava à C2, e R-res-4, que dava à C3, estão na C4), e cada corpo registra a divergência (§A2), medido por: `for c in c1 c2 c3 c4; do echo "$c: $(grep -i -E '^Item [0-9] de 3' C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a/00-mandatos/cadeira-$c.md | grep -o -i -E '\b(A27|A28|D1|A6-bis|F5|B1|B2|F3|A17-bis|A7|R-res-5|A14|R-res-4|A13|A21|A16)\b' | sort -u | tr '\n' ' ')"; done; echo "faltando: $(for t in A27 A28 D1 A6-bis F5 B1 B2 F3 A17-bis R-res-5 A14 R-res-4 A13 A21 A16; do grep -h -i -E '^Item [0-9] de 3' C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a/00-mandatos/cadeira-c1.md C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a/00-mandatos/cadeira-c2.md C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a/00-mandatos/cadeira-c3.md C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a/00-mandatos/cadeira-c4.md | grep -q -i -E "\\b$t\\b" || echo -n "$t "; done)"`
```
c1: A27 A28 D1
c2: A27 A6-bis A7 B2 D1 F5
c3: A17-bis A27 B1 B2 D1 F3
c4: A13 A14 A16 A21 R-res-4 R-res-5
faltando:
```

Identidades que planejaram, criticaram, desenvolveram, fabricaram e redigiram neste bloco, GERADAS dos arquivos de registro e de revisão do diff do bloco (do head-base ao 1º pai, `<objeto>~14..<objeto>~2`, lidos no disco do worktree no objeto), do commit da C4 (`<objeto>~1..<objeto>`) e dos quatro corpos (piso da inelegibilidade, não teto): além dos nomes do plano, o registro cita `crit-san312-pro-r2` e `crit-san3-12-r2-pro` (críticos do r2, inelegíveis); `dev-san312a-pg` e `dev-san312a-pg2` são nomes de container, `insp-san312a-parecer` é nome de arquivo e `jurado-san312a` é o radical dos corpos, medido por: `cd C:/Users/AMP/w-san312a && for f in $( (git diff --name-only 04b8a667780930050c8af2c77c323b81fe8794bb~14 04b8a667780930050c8af2c77c323b81fe8794bb~2 -- docs/revisoes/SAN3 agent-orchestration .claude; git diff --name-only 04b8a667780930050c8af2c77c323b81fe8794bb~1 04b8a667780930050c8af2c77c323b81fe8794bb -- .claude) | sort -u); do tr -d '\r' < "$f"; done | grep -o -i -E '\b(planejador|crit|critico|dev|rev|fab|fab-red|fabrica|inspetor|insp|redator|jurado|argon|med|medidor)-san3?-?12a?[a-z0-9-]*|planejador-mestre' | sed -E 's#-+$##' | sort -u`
```
PLANEJADOR-MESTRE
crit-san3-12-r2-pro
crit-san312-opus-r2
crit-san312-pro
crit-san312-pro-r2
crit-san312a-e1-opus
dev-san312a
dev-san312a-opus
dev-san312a-pg
dev-san312a-pg2
fab-red-san312a-opus
fab-red-san312a-r3-opus
insp-san312a-parecer
inspetor-san312a-opus
jurado-san312a
jurado-san312a-c1-dinheiro-e-concorrencia
jurado-san312a-c1-opus
jurado-san312a-c2-opus
jurado-san312a-c2-permissao-e-auditoria
jurado-san312a-c3-opus
jurado-san312a-c3-regressao-escopo-contrato
jurado-san312a-c4-isolamento-e-invariantes
planejador-mestre
planejador-san312-e1-fable
redator-san312a-r2-opus
```

As cinco identidades desta junta (o inspetor e as quatro cadeiras) e as dos dois fabricantes de corpos aparecem, entre os arquivos rastreados do objeto, só nos quatro corpos desta junta e nos seus dois espelhos (a lista de arquivos que as citam, pela busca do git no worktree que está no objeto, com o prefixo do worktree), medido por: `git -C C:/Users/AMP/w-san312a grep -l -i -E 'inspetor-san312a-opus|jurado-san312a-c1-opus|jurado-san312a-c2-opus|jurado-san312a-c3-opus|jurado-san312a-c4-opus|fab-red-san312a-opus|fab-red-san312a-r3-opus' | sed -e 's#^#C:/Users/AMP/w-san312a/#'`
```
C:/Users/AMP/w-san312a/.agents/agents/especialistas/jurado-san312a-c1-dinheiro-e-concorrencia.md
C:/Users/AMP/w-san312a/.agents/agents/especialistas/jurado-san312a-c2-permissao-e-auditoria.md
C:/Users/AMP/w-san312a/.agents/agents/especialistas/jurado-san312a-c3-regressao-escopo-contrato.md
C:/Users/AMP/w-san312a/.agents/agents/especialistas/jurado-san312a-c4-isolamento-e-invariantes.md
C:/Users/AMP/w-san312a/.claude/agents/especialistas/jurado-san312a-c1-dinheiro-e-concorrencia.md
C:/Users/AMP/w-san312a/.claude/agents/especialistas/jurado-san312a-c2-permissao-e-auditoria.md
C:/Users/AMP/w-san312a/.claude/agents/especialistas/jurado-san312a-c3-regressao-escopo-contrato.md
C:/Users/AMP/w-san312a/.claude/agents/especialistas/jurado-san312a-c4-isolamento-e-invariantes.md
```

Resíduo que ocupe nome, porta ou caminho desta junta no instante da redação: nenhum container com `san312a` ou `j12a` no nome (vivo ou parado), nenhum caminho `C:/Users/AMP/j12a*`, o único worktree registrado com esses radicais é o do objeto, e nenhuma pasta `j12a*` de sondas no diretório de pausa, medido por: `echo "containers san312a/j12a: $(docker ps -a --format '{{.Names}}' | grep -c -i -E 'san312a|j12a')"; echo "caminhos j12a: $(ls -d C:/Users/AMP/j12a* 2>/dev/null | wc -l)"; git -C C:/Users/AMP/Documents/GitHub/ERP_Techsolutios worktree list --porcelain | grep -i -E '^worktree .*(j12a|san312a)'; echo "pastas j12a no diretório de pausa: $(ls -d C:/Users/AMP/erp-pausa-2026-10-03/j12a* 2>/dev/null | wc -l)"`
```
containers san312a/j12a: 0
caminhos j12a: 0
worktree C:/Users/AMP/w-san312a
pastas j12a no diretório de pausa: 0
```

Memória de commit livre em GB (a P8 (c) exige pelo menos 4 antes de lançar agente), os trabalhos Docker vivos fora da base `erp-*` (o teto é 2 contando o da cadeira) e o disco livre em `C:` (a ordem do orquestrador: PARE abaixo de 7 GB), no instante da redação: a cadeira mede de novo antes de subir, medido por: `powershell.exe -NoProfile -Command '$o=Get-CimInstance Win32_PerfFormattedData_PerfOS_Memory; [math]::Round(($o.CommitLimit-$o.CommittedBytes)/1GB,2)'; docker ps --format '{{.Names}}' | grep -v -i -E '^erp-' | sed -E 's#-(pg|redis|run|net)$##' | sort -u; echo "trabalhos fora de erp: $(docker ps --format '{{.Names}}' | grep -v -i -E '^erp-' | sed -E 's#-(pg|redis|run|net)$##' | sort -u | wc -l)"; df -h /c | tail -1 | awk '{print "livre em C: " $4}'`
```
14,04
dev-san322
trabalhos fora de erp: 1
livre em C: 12G
```

O orçamento da P8 (c) no contrato do objeto: memória de commit livre de pelo menos 4 GB e Docker com teto de 2 trabalhos (linha e trecho), medido por: `tr -d '\r' < C:/Users/AMP/w-san312a/CLAUDE.md | grep -n -i -o -E 'memória de commit livre ≥ 4 GB|Docker segue com teto de 2 trabalhos'`
```
723:memória de commit livre ≥ 4 GB
724:Docker segue com teto de 2 trabalhos
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

Você é `inspetor-san312a-opus` (identidade nova; o orquestrador confirma no disparo), executor Claude Opus (subagente genérico, corpo lido do blob do objeto), modelo **Claude Opus**, nível menor DECLARADO (o `model: opus` do frontmatter de `inspetor-de-terreno-da-junta`, medido acima, §C7.6), cobrindo o Codex, que está sem limite; corpo carregado do blob do objeto (`C:/Users/AMP/w-san312a/.claude/agents/inspetor-de-terreno-da-junta.md`, no worktree que está no objeto, medido acima). **Opus esgotado: PARE** e registre onde parou (§C7.6-bis); o sucessor de queda é outra identidade Opus declarada. Declare executor efetivo, modelo, nível, objeto, `mandato_md5` deste arquivo (CR retirado antes do md5) e IDENTICO/DIVERGE do seu corpo carregado contra o blob, EOL-neutro, na primeira linha de `insp-san312a-evidencia.md`. Você não vota nem julga mérito: julga se o tabuleiro está limpo (§C7.1-bis), fail-closed. O plano v3 com E1 e E1-bis, o relatório do dev e os mandatos das cadeiras são **A RE-VERIFICAR**. Esta é a SEGUNDA passada desta identidade nesta junta: a primeira BLOQUEOU o start por cobertura (o parecer e a evidência dela estão no diretório desta junta); antes de escrever, copie os dois para `insp-san312a-parecer-bloqueado-r2.md` e `insp-san312a-evidencia-r2.md` no mesmo diretório (preservar, nunca apagar) e meça de novo tudo, sem herdar a passada anterior como fato. Régua da junta que você libera: bloco de DINHEIRO e de permissão, **unanimidade das 4 cadeiras com veto** (§C7 item 8(1); a C4 entrou por decisão do orquestrador); **ciclo 1**, todo `bloqueia` `dentro-do-bloco` reprova (§C7 item 8(2)); os votos declaram `arquivos_medidos` (§C7 item 9 (0)), derruba com: `head -1 C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a/insp-san312a-evidencia.md | grep -i -E 'executor|Opus|mandato_md5|objeto|IDENTICO|DIVERGE'`

Item 1 de 3 (objeto, CI, delta dos corpos, merge da `main` no ramo, mandatos, corpos, S0): resolva o objeto por `git ls-remote origin refs/heads/feat/web-financeiro-baixa-e-contas-12a` e por `gh pr view 459 --json headRefOid`; confira que o objeto é o commit do corpo da C4 (1 pai, só os 2 arquivos do corpo nos dois espelhos) em cima do merge de 2 pais `<objeto>~1`, que a cerca da fábrica é `<objeto>~3` pelo 1º pai e que o delta da cerca a `<objeto>~2` são só os 6 arquivos dos corpos C1 a C3 (medido acima; caminho fora bloqueia), e que o merge não tem conteúdo próprio fora dos 4 arquivos de registro (o merge `<objeto>~1` × o merge automático dos dois pais dele; medido acima, re-meça); confira que o head-base do bloco é `<objeto>~14` pelo 1º pai e que a merge-base do `mandato-refs.sh` é agora a ponta da `main` (medido acima); todos os check-runs concluídos e verdes no SHA (ausência, `queued` ou `cancelled` bloqueia o start), e o gatilho que os gerou; registre o merge da `main` no ramo (o PR sem conflito, a `main` que entrou) e a trava de migração do #458 agora no objeto, julgando a migração do bloco (medidos acima), como fato do terreno para o orquestrador e a C3 — o objeto da junta é o commit da C4 em cima deste merge, e um head que andar depois dele bloqueia até novo pré-voo; rode o pré-voo dos cinco mandatos deste diretório até `PRE-VOO OK` com as ferramentas da pasta `C:/Users/AMP/erp-pausa-2026-10-03/redator-san312a/` (o `RAIZ` dela aponta para um worktree que não existe mais, medido acima: por isso os caminhos dos mandatos são absolutos, e a existência de cada um é sua a conferir), e confira que toda unidade de MEDIDO tem a saída do comando colada (unidade sem saída bloqueia); confira no objeto, EOL-neutro e descontado o bloco Codex, os quatro corpos nos dois espelhos e que o corpo que cada cadeira carregar é o blob do objeto; reexecute o S0 (`sync-agent-agents.mjs --check`) num worktree descartável seu no objeto. Head que andou depois do disparo bloqueia até novo pré-voo, derruba com: `grep -i -E 'Item 1|check-runs|delta|corpos|merge|merge-tree|migration-transaction-guard|PRE-VOO|sem saída|espelho|S0|LIBERADO|BLOQUEADO' C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a/insp-san312a-parecer.md`

Item 2 de 3 (identidades, papéis, composição, cobertura, briefing): regenere por comando seu a lista de inelegíveis (a medida acima é piso) e confira por nome que nenhuma das cinco identidades desta junta (`inspetor-san312a-opus`, `jurado-san312a-c1-opus`, `jurado-san312a-c2-opus`, `jurado-san312a-c3-opus`, `jurado-san312a-c4-opus`) coincide com `planejador-mestre`, `planejador-san312-e1-fable`, `crit-san312-pro`, `crit-san312-opus-r2`, `crit-san312-pro-r2`, `crit-san3-12-r2-pro`, `crit-san312a-e1-opus`, `dev-san312a-opus`, `fab-red-san312a-opus` (fabricou os corpos e a r1 destes mandatos), `redator-san312a-r2-opus` (adaptou a r2 destes mandatos), `fab-red-san312a-r3-opus` (fabricou o corpo da C4 e adaptou esta r3 ao objeto novo) ou o orquestrador, nem entre si. A COMPOSIÇÃO tem quatro cadeiras: C1 `jurado-san312a-c1-dinheiro-e-concorrencia`, C2 `jurado-san312a-c2-permissao-e-auditoria`, C3 `jurado-san312a-c3-regressao-escopo-contrato` e C4 `jurado-san312a-c4-isolamento-e-invariantes` (isolamento entre organizações e invariantes residuais: R-res-5 e A14, R-res-4 e A13, A21 e A16), e as quatro decidem por unanimidade com veto. Separação de papéis do §C7.4-bis por nome: quem achou (os críticos, e o dev nas falsificações F1 a F9) ≠ quem planejou (`planejador-mestre`, `planejador-san312-e1-fable`, topo em Fable) ≠ quem desenvolveu (`dev-san312a-opus`) ≠ quem julga. Declare a MONOCULTURA (as cinco identidades rodam em Claude Opus, o mesmo modelo do dev e do crítico da E1; o Codex Sol que o §10 do plano nomeava para a C2 está sem limite) e diga se a composição cumpre o §10 do plano e a `D-GEMINI-SEGUNDO-REVISOR` (nenhuma cadeira é Gemini). Confira, critério por critério, que o que a E1-bis manda a junta medir (a cobertura medida acima é piso), os riscos residuais R-res-1 a R-res-7 que cabem ao 12a e as pendências que o §12.1 manda fechar no 12a têm cadeira dona em algum mandato (sem dono bloqueia o start), inclusive os quatro que a passada anterior achou sem dono (R-res-5 e A14, R-res-4 e A13, A21, A16), agora na C4 (cobertura medida acima). Confira a PRESENÇA no briefing (medida acima): as Emendas E1 e E1-bis, as etapas E10 a E14 do dev e as críticas; e, em cada mandato e corpo de cadeira, as divergências registradas (§A2). Coincidência de identidade, papel acumulado, item sem dono ou briefing incompleto bloqueia, derruba com: `grep -i -E 'Item 2|ineleg|planejador-san312-e1-fable|crit-san312a-e1-opus|dev-san312a-opus|fab-red-san312a-opus|4-bis|monocultura|Gemini|A27|A28|D1|F5|B1|B2|R-res|A13|A14|A16|A21|C4|sem dono|briefing|divergência' C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a/insp-san312a-parecer.md`

Item 3 de 3 (terreno): confira a árvore `C:/Users/AMP/w-san312a` no objeto e sem mutação viva, admitindo como não rastreado só o diretório de votos desta junta (e o que o orquestrador declarar); exija worktree próprio por cadeira (`C:/Users/AMP/j12a-c1-wt`, `C:/Users/AMP/j12a-c2-wt`, `C:/Users/AMP/j12a-c4-wt`, e para a C3 dois: `C:/Users/AMP/j12a-c3-wt` no objeto e `C:/Users/AMP/j12a-c3-wtb` no head-base), `npm ci` próprio e zero junction de `node_modules` (§C7.1-ter(c)); Postgres 16 e Redis 7 DESCARTÁVEIS por cadeira (`j12a-c1-pg` e `j12a-c1-redis`, `j12a-c2-pg` e `j12a-c2-redis`, `j12a-c3-pg` e `j12a-c3-redis`, `j12a-c4-pg` e `j12a-c4-redis`, com bancos e papéis `j12a_c4_*` da C4, que cria um papel sem bypass da RLS no Postgres dela), só em `127.0.0.1`, portas candidatas 47713 e 47714 (C1), 47723 e 47724 (C2), 47733 e 47734 (C3), 47743 e 47744 (C4), portas altas testadas fora das faixas reservadas do Windows; qualquer resíduo (no instante da redação, medido acima) reportado, nunca varrido. Antes de cada lançamento e de cada subida: memória de commit livre ≥ 4 GB (P8 (c)), no máximo 2 trabalhos Docker na máquina contando o da cadeira (excluídos os `erp-*`; medido acima), disco ≥ 7 GB (ordem do orquestrador: abaixo disso, PARE; a C3 faz dois `npm ci`, e o disco medido acima pode não comportar — declare); base viva e as portas 5432, 6379, 3000, 5173, 5050, 8899, 55432 e as do dev (55412, 55413) proibidas. Declare baseline honesto do terreno, plano de perda de jurado (P3, sucessor Opus de identidade nova; Opus esgotado = PARA, §C7.6-bis) e a ORDEM de disparo: **uma cadeira por vez** (ordem do dono, mais estreita que a P5); ordem do orquestrador, a julgar: **C2 → C4 → C1 → C3** (C2 a mais leve; a C4 em seguida, com um worktree e um Postgres; a C3, a mais pesada, dois worktrees e a suíte inteira duas vezes, por último), cada uma derrubando os containers e o worktree dela antes da seguinte, derruba com: `grep -i -E 'Item 3|j12a-c1-wt|j12a-c2-wt|j12a-c3-wt|j12a-c3-wtb|j12a-c4-wt|j12a-c1-pg|j12a-c2-pg|j12a-c3-pg|j12a-c4-pg|C4|junction|erp-|commit livre|4 GB|7 GB|5432|6379|P3|P5|P8|baseline|ordem|uma cadeira por vez|resíduo|disco' C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a/insp-san312a-parecer.md`

Protocolo P1/P2/P3/P4/P7 do §C7.7, verbatim no bloco colado acima, com `<cadeira>` = `insp-san312a` e o parecer no lugar do voto: evidência em `insp-san312a-evidencia.md` após CADA item; `insp-san312a-parecer.md` nasce esqueleto com os três itens EM APURAÇÃO e fecha (LIBERADO, LIBERADO COM RESSALVA ou BLOQUEADO) antes da mensagem final de 1 linha; sucessor re-executa os comandos registrados; três itens exatos; PAUSA grava estado e para; queda em `00-quedas.md` do diretório desta junta (P6, pelo orquestrador). Únicos outputs: `insp-san312a-evidencia.md` e `insp-san312a-parecer.md` em `C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a/`; nunca commit, derruba com: `test -f C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a/insp-san312a-parecer.md`

## MEDIDO

Pré-voo deste mandato com as ferramentas copiadas sem mudança para a pasta do redator `C:/Users/AMP/erp-pausa-2026-10-03/redator-san312a/` (diferença contra o ramo das ferramentas medida acima), executado com o cwd no worktree do objeto; o redator desta r3 é `fab-red-san312a-r3-opus` (Claude Opus 5.5, nível menor declarado, identidade nova), que fabricou o corpo da C4 e adaptou ao objeto novo os geradores da r2 (`redator-san312a-r2-opus`), que vinham da `fab-red-san312a-opus` (que fabricou os corpos C1 a C3 e a r1), e executou cada comando deste mandato pelo gerador `C:/Users/AMP/erp-pausa-2026-10-03/redator-san312a/gerar-i.sh`, medido por: `cd C:/Users/AMP/w-san312a && MANDATO_REFS=C:/Users/AMP/erp-pausa-2026-10-03/redator-san312a/mandato-refs.sh bash C:/Users/AMP/erp-pausa-2026-10-03/redator-san312a/mandato-preflight.sh C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a/00-mandatos/inspetor-san312a.md 459 2>&1; echo ec=$?`
```
COLAGEM    l.6-20: refs do PR #459 confere com a saida atual

PRE-VOO OK — C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a/00-mandatos/inspetor-san312a.md
ec=0
```
