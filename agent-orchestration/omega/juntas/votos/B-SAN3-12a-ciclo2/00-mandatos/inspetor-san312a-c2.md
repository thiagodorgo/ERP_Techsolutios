# Mandato — Inspetor de terreno — B-SAN3-12a (junta de DINHEIRO, ciclo 2)

## MEDIDO

Estado do PR 459 no instante da redação, pela ferramenta `mandato-refs.sh` copiada sem mudança para a pasta própria do redator deste ciclo `C:/Users/AMP/erp-pausa-2026-10-03/redator-san312a-c2/`, com o cwd no worktree do objeto (o head do PR, a merge-base, os check-runs, e nenhuma ata ainda), medido por: `cd C:/Users/AMP/w-san312a && bash C:/Users/AMP/erp-pausa-2026-10-03/redator-san312a-c2/mandato-refs.sh 459`
```
# refs do PR #459 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato
# gerado em: 2026-10-26T05:32Z · repo: thiagodorgo/ERP_Techsolutios

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

Ciclo 2, pelo §C7 item 9: no diretório de votos do ciclo 1 (`B-SAN3-12a`) há voto e evidência só da C2 e da C4, os dois `REPROVADO` (o campo `voto` de cada JSON), e nenhum da C1 nem da C3, que o orquestrador segurou; o `arquivos_medidos` dos dois votos alcança o que o conserto tocou (o serviço de cheques e o de títulos); no diretório deste ciclo 2 (`B-SAN3-12a-ciclo2`) só há o diretório dos mandatos. Logo a C2 e a C4 são REFEITAS (regra (3)), com identidade nova (C2b e C4b), a C1 e a C3 votam pela primeira vez, e não há voto verde a carregar nem a revalidar; o inspetor libera a composição C1, C2b, C3 e C4b, medido por: `ls C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a | sed -e 's#^#C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a/#'; echo "votos do ciclo 1 por cadeira: $(ls C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a | grep -i -E '^c[1234]-voto\.json$' | tr '\n' ' ')"; node -e 'const fs=require("fs");for(const c of ["c2","c4"]){const j=JSON.parse(fs.readFileSync("C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a/"+c+"-voto.json","utf8").replace(String.fromCharCode(65279),""));const a=JSON.stringify(j.arquivos_medidos)+JSON.stringify((j.itens||[]).map(i=>i.arquivos_medidos||""));console.log(c+": voto="+j.voto+" alcança cheque.service.ts="+a.includes("cheque.service.ts")+" alcança financial-title(s)="+a.includes("financial-title"))}'; ls C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a-ciclo2 | sed -e 's#^#C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a-ciclo2/#'`
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

Os quatro corpos das cadeiras no objeto (C1, C2 e C3 do commit dos corpos, a C4 do commit dela; a C2b e a C4b carregam os corpos da C2 e da C4) são IDÊNTICOS entre os dois espelhos descontado o bloco Codex (EOL-neutro), e o S0 (`sync-agent-agents.mjs --check`) passa num worktree descartável no objeto, `C:/Users/AMP/j12a2-insp-s0`, criado e removido pelo próprio comando (a última linha confirma a remoção), medido por: `cd C:/Users/AMP/w-san312a && for c in c1-dinheiro-e-concorrencia c2-permissao-e-auditoria c3-regressao-escopo-contrato c4-isolamento-e-invariantes; do diff <(tr -d '\r' < C:/Users/AMP/w-san312a/.claude/agents/especialistas/jurado-san312a-$c.md | awk 'f; $0=="---"{n++; if(n==2) f=1}' | sed '/^$/d') <(tr -d '\r' < C:/Users/AMP/w-san312a/.agents/agents/especialistas/jurado-san312a-$c.md | awk 'f; $0=="---"{n++; if(n==2) f=1}' | awk 'index($0,"Papel para o Codex"){s=1} s&&$0==""{s=0; next} !s' | sed '/^$/d') >/dev/null && echo "IDENTICO corpo $c" || echo "DIVERGE corpo $c"; done; git worktree add --detach C:/Users/AMP/j12a2-insp-s0 8a9fc1d8426426403f8642e263b3e932d1738716 >/dev/null 2>&1; node C:/Users/AMP/j12a2-insp-s0/scripts/sync-agent-agents.mjs --check; echo "sync ec=$?"; git worktree remove --force C:/Users/AMP/j12a2-insp-s0; test -d C:/Users/AMP/j12a2-insp-s0 && echo 'worktree S0 FICOU' || echo 'worktree S0 removido'`
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

Os insumos do briefing, no objeto: as Emendas E1 e E1-bis e a seção do ciclo 2 apensas ao plano (linha e começo dos cabeçalhos), as etapas E10 a E14 e as seções C2-D1 a C2-D7 do relatório do dev, a reprovação do ciclo 1 e as críticas versionadas do bloco (contagem de linhas de cada arquivo); e o veredito da última passada do inspetor do ciclo 1 (`inspetor-san312a-opus`), no diretório do ciclo 1, que liberou a junta que reprovou, medido por: `tr -d '\r' < C:/Users/AMP/w-san312a/docs/revisoes/SAN3/B-SAN3-12-plano.md | grep -n -i -o -E '^## Emenda E1(-bis)? \(12a\)|^## Ciclo 2 \(12a\) — plano de resolução'; tr -d '\r' < C:/Users/AMP/w-san312a/docs/revisoes/SAN3/B-SAN3-12a-dev.md | grep -n -i -o -E '^## E1[0-4] — [^(,`]{0,40}|^## Ciclo 2 \(dev-san312a-c2-opus\)|^### C2-D[1-7] — [^(`]{0,30}'; for f in C:/Users/AMP/w-san312a/docs/revisoes/SAN3/B-SAN3-12-critica-r1.md C:/Users/AMP/w-san312a/docs/revisoes/SAN3/B-SAN3-12-critica-r2.md C:/Users/AMP/w-san312a/docs/revisoes/SAN3/B-SAN3-12a-E1-critica.md C:/Users/AMP/w-san312a/docs/revisoes/SAN3/B-SAN3-12a-dev.md C:/Users/AMP/w-san312a/docs/revisoes/SAN3/B-SAN3-12-plano.md C:/Users/AMP/w-san312a/agent-orchestration/omega/reprovacoes/R-B-SAN3-12a-ciclo1.md; do echo "$f $(wc -l < $f)"; done; echo "veredito da última passada do inspetor do ciclo 1: $(tail -1 C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a/insp-san312a-parecer.md | tr -d '\r')"`
```
670:## Emenda E1 (12a)
837:## Emenda E1-bis (12a)
939:## Ciclo 2 (12a) — plano de resolução
202:## E10 — retomada pelas Emendas E1 e E1-bis
226:## E11 — mutações da E1/E1-bis
252:## E12 — bateria
267:## E13 — B1
295:## E14 — estado e limpeza
301:## Ciclo 2 (dev-san312a-c2-opus)
311:### C2-D1 — commits
317:### C2-D2 — o que foi implementado
342:### C2-D3 — vermelho-controle no objeto do
360:### C2-D4 — as mutações obrigatórias
377:### C2-D5 — bateria
397:### C2-D6 —
423:### C2-D7 — estado e limpeza
C:/Users/AMP/w-san312a/docs/revisoes/SAN3/B-SAN3-12-critica-r1.md 32
C:/Users/AMP/w-san312a/docs/revisoes/SAN3/B-SAN3-12-critica-r2.md 157
C:/Users/AMP/w-san312a/docs/revisoes/SAN3/B-SAN3-12a-E1-critica.md 128
C:/Users/AMP/w-san312a/docs/revisoes/SAN3/B-SAN3-12a-dev.md 427
C:/Users/AMP/w-san312a/docs/revisoes/SAN3/B-SAN3-12-plano.md 1070
C:/Users/AMP/w-san312a/agent-orchestration/omega/reprovacoes/R-B-SAN3-12a-ciclo1.md 20
veredito da última passada do inspetor do ciclo 1: LIBERADO COM RESSALVA
```

Cobertura: o que a E1-bis manda a junta medir, o que a C4 do ciclo 1 cobria e os critérios do ciclo 2 (A29-a a A29-h, A30-a a A30-c, A13-bis, R-res-5-bis) aparecem nas linhas `Item` de pelo menos uma das quatro cadeiras deste ciclo (a lista de cada cadeira e os que faltam, gerados das linhas `Item` dos quatro mandatos deste diretório; `faltando` vazio), medido por: `T='A27 A28 D1 A6-bis F5 B1 B2 F3 A17-bis A7 A22 R-res-5 A14 R-res-4 A13 A21 A16 A29-a A29-b A29-c A29-d A29-e A29-f A29-g A29-h A30-a A30-b A30-c A13-bis R-res-5-bis'; for c in c1 c2b c3 c4b; do echo "$c: $(for t in $T; do grep -i -E '^Item [0-9] de 3' C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a-ciclo2/00-mandatos/cadeira-$c.md | grep -q -i -E "(^|[^A-Za-z0-9-])$t([^A-Za-z0-9-]|$)" && echo -n "$t "; done)"; done; echo "faltando: $(for t in $T; do cat C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a-ciclo2/00-mandatos/cadeira-c1.md C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a-ciclo2/00-mandatos/cadeira-c2b.md C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a-ciclo2/00-mandatos/cadeira-c3.md C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a-ciclo2/00-mandatos/cadeira-c4b.md | grep -i -E '^Item [0-9] de 3' | grep -q -i -E "(^|[^A-Za-z0-9-])$t([^A-Za-z0-9-]|$)" || echo -n "$t "; done)(fim)"`
```
c1: A27 A28 D1
c2b: A27 D1 A6-bis F5 A7 A30-a A30-b A30-c
c3: A27 D1 B1 B2 F3 A17-bis A22 A29-c A29-d A29-g
c4b: R-res-5 A14 R-res-4 A13 A21 A16 A29-a A29-b A29-c A29-d A29-e A29-f A29-g A29-h A13-bis R-res-5-bis
faltando: (fim)
```

Identidades que planejaram, criticaram, desenvolveram, fabricaram e redigiram neste bloco, GERADAS dos arquivos de registro e de revisão do diff do bloco (`<objeto>~18..<objeto>~6`), do commit da C4 (`<objeto>~5..<objeto>~4`) e do conserto do ciclo 2 (`<objeto>~4..<objeto>~1`), lidos no disco do worktree no objeto (piso da inelegibilidade, não teto): além dos nomes dos planos, o registro cita os críticos do r2, o planejador e o dev do ciclo 2 e os achadores do ciclo 1; nomes de container, de arquivo e o radical dos corpos também saem e se descartam por leitura, medido por: `cd C:/Users/AMP/w-san312a && for f in $( (git diff --name-only 8a9fc1d8426426403f8642e263b3e932d1738716~18 8a9fc1d8426426403f8642e263b3e932d1738716~6 -- docs/revisoes/SAN3 agent-orchestration .claude; git diff --name-only 8a9fc1d8426426403f8642e263b3e932d1738716~5 8a9fc1d8426426403f8642e263b3e932d1738716~4 -- .claude; git diff --name-only 8a9fc1d8426426403f8642e263b3e932d1738716~4 8a9fc1d8426426403f8642e263b3e932d1738716~1 -- docs/revisoes/SAN3 agent-orchestration) | sort -u); do tr -d '\r' < "$f"; done | grep -o -i -E '\b(planejador|crit|critico|dev|rev|fab|fab-red|fabrica|inspetor|insp|redator|jurado|argon|med|medidor)-san3?-?12a?[a-z0-9-]*|planejador-mestre' | sed -E 's#-+$##' | sort -u`
```
PLANEJADOR-MESTRE
crit-san3-12-r2-pro
crit-san312-opus-r2
crit-san312-pro
crit-san312-pro-r2
crit-san312a-e1-opus
dev-san312a
dev-san312a-c2
dev-san312a-c2-opus
dev-san312a-c2-pg
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
jurado-san312a-c4-opus
planejador-mestre
planejador-san312-e1-fable
planejador-san312a-c2-fable
redator-san312a-r2-opus
```

As identidades novas deste ciclo (o inspetor, a C2b, a C4b e o redator) não aparecem em arquivo rastreado nenhum do objeto (contagem), e as da C1 e da C3, que votam pela primeira vez, aparecem só nos corpos desta junta e nos espelhos deles (a lista, pela busca do git no worktree que está no objeto, com o prefixo do worktree), medido por: `echo "arquivos que citam as identidades novas: $(git -C C:/Users/AMP/w-san312a grep -l -i -E 'inspetor-san312a-c2-opus|jurado-san312a-c2b-opus|jurado-san312a-c4b-opus|redator-san312a-c2-opus' | wc -l)"; git -C C:/Users/AMP/w-san312a grep -l -i -E 'jurado-san312a-c1-opus|jurado-san312a-c3-opus' | sed -e 's#^#C:/Users/AMP/w-san312a/#'`
```
arquivos que citam as identidades novas: 0
C:/Users/AMP/w-san312a/.agents/agents/especialistas/jurado-san312a-c1-dinheiro-e-concorrencia.md
C:/Users/AMP/w-san312a/.agents/agents/especialistas/jurado-san312a-c2-permissao-e-auditoria.md
C:/Users/AMP/w-san312a/.agents/agents/especialistas/jurado-san312a-c3-regressao-escopo-contrato.md
C:/Users/AMP/w-san312a/.agents/agents/especialistas/jurado-san312a-c4-isolamento-e-invariantes.md
C:/Users/AMP/w-san312a/.claude/agents/especialistas/jurado-san312a-c1-dinheiro-e-concorrencia.md
C:/Users/AMP/w-san312a/.claude/agents/especialistas/jurado-san312a-c2-permissao-e-auditoria.md
C:/Users/AMP/w-san312a/.claude/agents/especialistas/jurado-san312a-c3-regressao-escopo-contrato.md
C:/Users/AMP/w-san312a/.claude/agents/especialistas/jurado-san312a-c4-isolamento-e-invariantes.md
```

Resíduo que ocupe nome, porta ou caminho deste ciclo no instante da redação: nenhum container com `j12a2` no nome (vivo ou parado), nenhum caminho `C:/Users/AMP/j12a2*`, nenhum worktree registrado com esse radical e nenhuma pasta `j12a2*` de sondas no diretório de pausa; do ciclo 1 restam só as pastas de sondas da C2 e da C4 no diretório de pausa (citadas pelo plano do ciclo 2; não se varrem) e nenhum container `j12a`/`san312a`, medido por: `echo "containers j12a2: $(docker ps -a --format '{{.Names}}' | grep -c -i -E 'j12a2')"; echo "containers j12a/san312a do ciclo 1: $(docker ps -a --format '{{.Names}}' | grep -c -i -E 'j12a-|san312a')"; echo "caminhos j12a2: $(ls -d C:/Users/AMP/j12a2* 2>/dev/null | wc -l)"; echo "worktrees j12a2: $(git -C C:/Users/AMP/Documents/GitHub/ERP_Techsolutios worktree list --porcelain | grep -c -i -E '^worktree .*j12a2')"; echo "pastas j12a2 no diretório de pausa: $(ls -d C:/Users/AMP/erp-pausa-2026-10-03/j12a2* 2>/dev/null | wc -l)"; ls -d C:/Users/AMP/erp-pausa-2026-10-03/j12a-* 2>/dev/null`
```
containers j12a2: 0
containers j12a/san312a do ciclo 1: 0
caminhos j12a2: 0
worktrees j12a2: 0
pastas j12a2 no diretório de pausa: 0
C:/Users/AMP/erp-pausa-2026-10-03/j12a-c2
C:/Users/AMP/erp-pausa-2026-10-03/j12a-c4
```

Memória de commit livre em GB (a P8 (c) exige pelo menos 4 antes de lançar agente), os trabalhos Docker vivos fora da base `erp-*` (o teto é 2 contando o da cadeira) e o disco livre em `C:` (a ordem do orquestrador: PARE abaixo de 7 GB), no instante da redação: a cadeira mede de novo antes de subir, medido por: `powershell.exe -NoProfile -Command '$o=Get-CimInstance Win32_PerfFormattedData_PerfOS_Memory; [math]::Round(($o.CommitLimit-$o.CommittedBytes)/1GB,2)'; docker ps --format '{{.Names}}' | grep -v -i -E '^erp-' | sed -E 's#-(pg|redis|run|net)$##' | sort -u; echo "trabalhos fora de erp: $(docker ps --format '{{.Names}}' | grep -v -i -E '^erp-' | sed -E 's#-(pg|redis|run|net)$##' | sort -u | wc -l)"; df -h /c | tail -1 | awk '{print "livre em C: " $4}'`
```
13,01
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

Você é `inspetor-san312a-c2-opus` (identidade nova; o orquestrador confirma no disparo), o inspetor de terreno do CICLO 2; executor Claude Opus (subagente genérico, corpo lido do blob do objeto), modelo **Claude Opus**, nível menor DECLARADO (o `model: opus` do frontmatter de `inspetor-de-terreno-da-junta`, medido acima, §C7.6), ou Codex GPT-5.6 Sol se o orquestrador o declarar no disparo; corpo carregado do blob do objeto (`C:/Users/AMP/w-san312a/.claude/agents/inspetor-de-terreno-da-junta.md`, no worktree que está no objeto, medido acima). **Opus esgotado: PARE** e registre onde parou (§C7.6-bis); o sucessor de queda é outra identidade declarada. Declare executor efetivo, modelo, nível, objeto, `mandato_md5` deste arquivo (CR retirado antes do md5) e IDENTICO/DIVERGE do seu corpo carregado contra o blob, EOL-neutro, na primeira linha de `insp-san312a-c2-evidencia.md`. Você não vota nem julga mérito: julga se o tabuleiro está limpo (§C7.1-bis), fail-closed. O plano do ciclo 2, o relatório do dev (seção "Ciclo 2"), a reprovação do ciclo 1, o parecer do inspetor do ciclo 1 e os mandatos das cadeiras são **A RE-VERIFICAR**; o diretório do ciclo 1 se lê, nunca se escreve. Régua da junta que você libera: bloco de DINHEIRO e de permissão, **unanimidade das 4 cadeiras do ciclo 2 com veto** (C1, C2b, C3 e C4b; §C7 item 8(1)); **ciclo 2**, todo `bloqueia` `dentro-do-bloco` ainda reprova (§C7 item 8(2)); pelo §C7 item 9, a C2b e a C4b são as cadeiras vermelhas refeitas e a C1 e a C3 votam pela primeira vez (medido acima: não há voto verde a carregar); os votos declaram `arquivos_medidos` (regra (0)) e a ata registra, por cadeira, refeito ou primeiro voto (regra (4)), derruba com: `head -1 C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a-ciclo2/insp-san312a-c2-evidencia.md | grep -i -E 'executor|Opus|Sol|mandato_md5|objeto|IDENTICO|DIVERGE'`

Item 1 de 3 (objeto, CI, delta do ciclo 2, os dois merges, mandatos, corpos, S0): resolva o objeto por `git ls-remote origin refs/heads/feat/web-financeiro-baixa-e-contas-12a` e por `gh pr view 459 --json headRefOid`; confira que o objeto é o merge de 2 pais cujo 2º pai é a ponta da `main` (1 commit, só `Kpis`) e cuja árvore é a do merge automático (medido acima), que `<objeto>~4` é o objeto do ciclo 1 e que o delta `<objeto>~4..<objeto>~1` são os 3 commits e os 15 caminhos medidos acima (caminho fora, ou commit a mais, bloqueia); que o merge do ciclo 1 (`<objeto>~5`) segue sem conteúdo próprio fora dos 4 arquivos de registro e que o índice de pendências bate com o gerador (medidos acima, re-meça); que o head-base do bloco é `<objeto>~18` e o da emenda `<objeto>~12` pelo 1º pai, e que a merge-base do `mandato-refs.sh` é a ponta da `main` (medido acima); todos os check-runs concluídos e verdes no SHA (ausência, `queued` ou `cancelled` bloqueia o start), e o gatilho que os gerou; rode o pré-voo dos cinco mandatos deste diretório até `PRE-VOO OK` com as ferramentas da pasta `C:/Users/AMP/erp-pausa-2026-10-03/redator-san312a-c2/` (o `RAIZ` dela aponta para um worktree que não existe mais, medido acima: por isso os caminhos dos mandatos são absolutos, e a existência de cada um é sua a conferir), e confira que toda unidade de MEDIDO tem a saída do comando colada (unidade sem saída bloqueia); confira no objeto, EOL-neutro e descontado o bloco Codex, os quatro corpos nos dois espelhos e que o corpo que cada cadeira carregar é o blob do objeto (a C2b carrega o corpo da C2 e a C4b o da C4, e cada mandato diz que prevalece sobre o corpo do ciclo 1 quanto a objeto, ciclo, itens e inelegíveis); reexecute o S0 (`sync-agent-agents.mjs --check`) num worktree descartável seu no objeto. Head que andou depois do disparo bloqueia até novo pré-voo, derruba com: `grep -i -E 'Item 1|check-runs|delta|<objeto>~4|merge|merge-tree|Kpis|PRE-VOO|sem saída|corpos|espelho|S0|LIBERADO|BLOQUEADO' C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a-ciclo2/insp-san312a-c2-parecer.md`

Item 2 de 3 (identidades, papéis, composição pelo §C7 item 9, cobertura, briefing): regenere por comando seu a lista de inelegíveis (a medida acima é piso) e confira por nome que nenhuma das identidades deste ciclo (`inspetor-san312a-c2-opus`, `jurado-san312a-c1-opus`, `jurado-san312a-c2b-opus`, `jurado-san312a-c3-opus`, `jurado-san312a-c4b-opus`) coincide com `planejador-mestre`, `planejador-san312-e1-fable`, `planejador-san312a-c2-fable`, `crit-san312-pro`, `crit-san312-opus-r2`, `crit-san312-pro-r2`, `crit-san3-12-r2-pro`, `crit-san312a-e1-opus`, `dev-san312a-opus`, `dev-san312a-c2-opus`, `fab-red-san312a-opus`, `redator-san312a-r2-opus`, `fab-red-san312a-r3-opus`, `redator-san312a-c2-opus` (redigiu estes mandatos), `inspetor-san312a-opus`, `jurado-san312a-c2-opus`, `jurado-san312a-c4-opus` ou o orquestrador, nem entre si, e que a C1 e a C3 de agora não mediram nem votaram no ciclo 1 (medido acima: não há arquivo delas no diretório do ciclo 1). Separação de papéis do §C7.4-bis por nome e por ciclo: quem achou no ciclo 1 (`jurado-san312a-c2-opus`, `jurado-san312a-c4-opus`) ≠ quem auditou e planejou (`planejador-san312a-c2-fable`, topo em Fable, `D-TOPO-NO-PLANO-E-EM-TODA-REPROVACAO`) ≠ quem desenvolveu (`dev-san312a-c2-opus`) ≠ quem julga, e a reprovação registra os três papéis. A COMPOSIÇÃO do ciclo 2 pelo §C7 item 9: C2b refeita (A30 e a regressão dos itens 1 e 2 da C2), C4b refeita (A29, A13-bis e R-res-5-bis, com a regressão dos itens da C4), C1 e C3 pela primeira vez; diga se a regra (1) (carregar o verde) não se aplica a ninguém e por quê, se manter a C4b numa cadeira só com 3 itens (o plano previa dividir se passasse de 3) cumpre a P4, e se a composição cobre a competência dos achados (corrida de banco → C4b e C1; validação e rastro → C2b; contrato e suíte → C3). Declare a MONOCULTURA (as identidades rodam em Claude Opus, como o dev do ciclo 2, salvo cadeira que o orquestrador declarar em Codex Sol) e se a `D-GEMINI-SEGUNDO-REVISOR` é cumprida (nenhuma cadeira é Gemini). Confira que cada critério da cobertura medida acima (inclusive os 13 do ciclo 2) e cada pendência que o ciclo 2 manda fechar no merge (`P-SAN3-20-DELETE-TITULO-COM-CHEQUE`) têm cadeira dona (sem dono bloqueia o start). Confira a PRESENÇA no briefing (medida acima): as Emendas E1 e E1-bis, a seção do ciclo 2 do plano, as seções C2-D1 a C2-D7 do dev e a reprovação do ciclo 1; e, em cada mandato, as divergências registradas (§A2). Coincidência de identidade, papel acumulado, item sem dono ou briefing incompleto bloqueia, derruba com: `grep -i -E 'Item 2|ineleg|planejador-san312a-c2-fable|dev-san312a-c2-opus|jurado-san312a-c2-opus|jurado-san312a-c4-opus|4-bis|item 9|refeita|primeira vez|monocultura|Gemini|A29|A30|A13-bis|R-res-5-bis|sem dono|briefing|divergência' C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a-ciclo2/insp-san312a-c2-parecer.md`

Item 3 de 3 (terreno): confira a árvore `C:/Users/AMP/w-san312a` no objeto e sem mutação viva, admitindo como não rastreados só os dois diretórios de votos desta junta (e o que o orquestrador declarar); exija worktree próprio por cadeira (`C:/Users/AMP/j12a2-c1-wt`, `C:/Users/AMP/j12a2-c2b-wt`, `C:/Users/AMP/j12a2-c4b-wt`, e para a C3 dois: `C:/Users/AMP/j12a2-c3-wt` no objeto e `C:/Users/AMP/j12a2-c3-wtb` no head-base), `npm ci` próprio e zero junction de `node_modules` (§C7.1-ter(c)); Postgres 16 e Redis 7 DESCARTÁVEIS por cadeira (`j12a2-c1-pg` e `j12a2-c1-redis`, `j12a2-c2b-pg` e `j12a2-c2b-redis`, `j12a2-c3-pg` e `j12a2-c3-redis`, `j12a2-c4b-pg` e `j12a2-c4b-redis`, com bancos e papéis `j12a2_<cadeira>_*`; a C4b cria um papel sem bypass da RLS no Postgres dela), só em `127.0.0.1`, portas candidatas 47813 e 47814 (C1), 47823 e 47824 (C2b), 47833 e 47834 (C3), 47843 e 47844 (C4b), portas altas testadas fora das faixas reservadas do Windows; qualquer resíduo (no instante da redação, medido acima: as pastas de sondas do ciclo 1) reportado, nunca varrido. Antes de cada lançamento e de cada subida: memória de commit livre ≥ 4 GB (P8 (c)), no máximo 2 trabalhos Docker na máquina contando o da cadeira (excluídos os `erp-*`; medido acima), disco ≥ 7 GB (ordem do orquestrador: abaixo disso, PARE; a C3 faz dois `npm ci`, e o disco medido acima pode não comportar — declare); base viva e as portas 5432, 6379, 3000, 5173, 5050, 8899, 55432 e as do dev (55412, 55413, 47791) proibidas. Declare baseline honesto do terreno, plano de perda de jurado (P3, sucessor de identidade nova e declarada; Opus esgotado = PARA, §C7.6-bis) e a ORDEM de disparo: **uma cadeira por vez** (ordem do dono, mais estreita que a P5); ordem do orquestrador, a julgar: **C2b → C4b → C1 → C3** (as refeitas primeiro, a C2b a mais leve; a C1 depois, com um worktree e um Postgres; a C3, a mais pesada, dois worktrees e a suíte inteira duas vezes, por último), cada uma derrubando os containers e o worktree dela antes da seguinte, derruba com: `grep -i -E 'Item 3|j12a2-c1-wt|j12a2-c2b-wt|j12a2-c3-wt|j12a2-c3-wtb|j12a2-c4b-wt|j12a2-c1-pg|j12a2-c2b-pg|j12a2-c3-pg|j12a2-c4b-pg|junction|erp-|commit livre|4 GB|7 GB|5432|6379|P3|P5|P8|baseline|ordem|uma cadeira por vez|resíduo|disco' C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a-ciclo2/insp-san312a-c2-parecer.md`

Protocolo P1/P2/P3/P4/P7 do §C7.7, verbatim no bloco colado acima, com `<cadeira>` = `insp-san312a-c2` e o parecer no lugar do voto: evidência em `insp-san312a-c2-evidencia.md` após CADA item; `insp-san312a-c2-parecer.md` nasce esqueleto com os três itens EM APURAÇÃO e fecha (LIBERADO, LIBERADO COM RESSALVA ou BLOQUEADO) antes da mensagem final de 1 linha; sucessor re-executa os comandos registrados; três itens exatos; PAUSA grava estado e para; queda em `00-quedas.md` do diretório deste ciclo (P6, pelo orquestrador). Únicos outputs: `insp-san312a-c2-evidencia.md` e `insp-san312a-c2-parecer.md` em `C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a-ciclo2/`; nunca commit, derruba com: `test -f C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a-ciclo2/insp-san312a-c2-parecer.md`

## MEDIDO

Pré-voo deste mandato com as ferramentas copiadas sem mudança para a pasta do redator deste ciclo `C:/Users/AMP/erp-pausa-2026-10-03/redator-san312a-c2/` (diferença contra o ramo das ferramentas medida acima), executado com o cwd no worktree do objeto; o redator do ciclo 2 é `redator-san312a-c2-opus` (Claude Opus 5.5, nível menor declarado, identidade nova, não vota), que adaptou ao objeto do ciclo 2 os geradores r3 do ciclo 1 (`fab-red-san312a-r3-opus`, sobre os de `redator-san312a-r2-opus` e `fab-red-san312a-opus`) e executou cada comando deste mandato pelo gerador `C:/Users/AMP/erp-pausa-2026-10-03/redator-san312a-c2/gerar-i.sh`, medido por: `cd C:/Users/AMP/w-san312a && MANDATO_REFS=C:/Users/AMP/erp-pausa-2026-10-03/redator-san312a-c2/mandato-refs.sh bash C:/Users/AMP/erp-pausa-2026-10-03/redator-san312a-c2/mandato-preflight.sh C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a-ciclo2/00-mandatos/inspetor-san312a-c2.md 459 2>&1; echo ec=$?`
```
COLAGEM    l.6-20: refs do PR #459 confere com a saida atual

PRE-VOO OK — C:/Users/AMP/w-san312a/agent-orchestration/omega/juntas/votos/B-SAN3-12a-ciclo2/00-mandatos/inspetor-san312a-c2.md
ec=0
```
