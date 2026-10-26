# Mandato — Cadeira C3 — B-SAN3-13 ciclo 2 (junta de DADO)

## MEDIDO

Estado do PR 460 no instante da redação do ciclo 2, pela ferramenta `mandato-refs.sh` copiada sem mudança para a pasta própria do redator `C:/Users/AMP/erp-pausa-2026-10-03/redator-san313c2/`, com o cwd no worktree do objeto (ec 0: o head do PR, a merge-base, 14 check-runs, nenhum não verde, e nenhuma ata ainda), medido por: `cd C:/Users/AMP/w-san313 && bash C:/Users/AMP/erp-pausa-2026-10-03/redator-san313c2/mandato-refs.sh 460`
```
# refs do PR #460 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato
# gerado em: 2026-10-25T20:14Z · repo: thiagodorgo/ERP_Techsolutios

ramo:            fix/mobile-minhas-os
base:            origin/main
estado:          OPEN | rascunho=false | MERGEABLE
head do PR:      cbf2db292f0643b9647017005c361a2e11da61c7
merge-base:      b08c755719a6cb0ed192fa04e549ac5fc67a3e67
merge commit:    <ainda nao mergeado>
check-runs:      total=14 nao-verdes=0 pendentes=0
approved_head:   AUSENTE — nenhuma ata nomeia nem menciona #460
                 (a junta nao votou, ou a ata nao esta em origin/main nem no head do PR)

```

O ramo remoto aponta para o mesmo SHA que o PR declara como head (segunda fonte do objeto), medido por: `git -C C:/Users/AMP/w-san313 ls-remote origin refs/heads/fix/mobile-minhas-os`
```
cbf2db292f0643b9647017005c361a2e11da61c7	refs/heads/fix/mobile-minhas-os
```

Os check-runs do head do PR estão todos concluídos e `SUCCESS` (o total, os fora de `COMPLETED`/`SUCCESS` e os nomes com a conclusão, pelo `statusCheckRollup`), e são dois runs do workflow `ci` no objeto do ciclo 2, um por gatilho (`pull_request` e `push`); os ids de run não são citados aqui (corrida numérica longa é cobrada como SHA pelo pré-voo) e se obtêm por `gh run list --commit`, medido por: `cd C:/Users/AMP/w-san313 && gh pr view 460 --json headRefOid,statusCheckRollup --jq '.headRefOid, (.statusCheckRollup|length), ([.statusCheckRollup[] | select(.status != "COMPLETED" or .conclusion != "SUCCESS")] | length), ([.statusCheckRollup[] | .name + ":" + .conclusion] | sort | join(", "))'; gh run list --commit cbf2db292f0643b9647017005c361a2e11da61c7 --json workflowName,event,status,conclusion,headSha --jq '.[] | .workflowName + " " + .event + " " + .status + " " + .conclusion + " " + .headSha'`
```
cbf2db292f0643b9647017005c361a2e11da61c7
14
0
authority-portal:SUCCESS, authority-portal:SUCCESS, backend-postgres:SUCCESS, backend-postgres:SUCCESS, backend:SUCCESS, backend:SUCCESS, docker:SUCCESS, docker:SUCCESS, flutter:SUCCESS, flutter:SUCCESS, frontend:SUCCESS, frontend:SUCCESS, owner-portal:SUCCESS, owner-portal:SUCCESS
ci pull_request completed success cbf2db292f0643b9647017005c361a2e11da61c7
ci push completed success cbf2db292f0643b9647017005c361a2e11da61c7
```

O worktree `C:/Users/AMP/w-san313` está no objeto do ciclo 2 e sem modificação rastreada (0 linhas no status sem não rastreados); os não rastreados são o diretório de votos do ciclo 1, o registro da reprovação do ciclo 1 e o diretório de votos deste ciclo; por isso as leituras de arquivo deste mandato, feitas no disco desse worktree com caminho absoluto e com o CR retirado, leem o conteúdo do objeto (o `sed` do comando põe o prefixo do worktree no caminho que o `git status` imprime), medido por: `git -C C:/Users/AMP/w-san313 rev-parse HEAD; git -C C:/Users/AMP/w-san313 status --porcelain --untracked-files=no | wc -l; git -C C:/Users/AMP/w-san313 status --short | sed -E 's#^(..) (.*)#\1 C:/Users/AMP/w-san313/\2#'`
```
cbf2db292f0643b9647017005c361a2e11da61c7
0
?? C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13-ciclo2/
?? C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13/
?? C:/Users/AMP/w-san313/agent-orchestration/omega/reprovacoes/R-B-SAN3-13-ciclo1.md
```

O objeto do ciclo 1 é `<objeto>~6`: é ancestral do objeto, e o SHA dele aparece no registro da reprovação do ciclo 1 e no voto da C2 do ciclo 1 (a contagem de linhas que o citam, sem publicá-lo); dele ao objeto há 6 commits de primeiro pai e nenhum merge (o assunto de cada um abaixo, do mais novo ao mais velho); o delta do conserto é a lista de caminhos abaixo, e nenhum caminho sob `src` ou `tests` (a última linha conta os dois); o `sed` põe o prefixo do worktree no caminho impresso, medido por: `cd C:/Users/AMP/w-san313 && git merge-base --is-ancestor cbf2db292f0643b9647017005c361a2e11da61c7~6 cbf2db292f0643b9647017005c361a2e11da61c7 && echo 'objeto do ciclo 1 ancestral do objeto'; S1=$(git rev-parse cbf2db292f0643b9647017005c361a2e11da61c7~6); echo "R-ciclo1 cita: $(grep -c -i "$S1" C:/Users/AMP/w-san313/agent-orchestration/omega/reprovacoes/R-B-SAN3-13-ciclo1.md) · c2-voto do ciclo 1 cita: $(grep -c -i "$S1" C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13/c2-voto.json)"; git rev-list --first-parent --count cbf2db292f0643b9647017005c361a2e11da61c7~6..cbf2db292f0643b9647017005c361a2e11da61c7; git rev-list --merges --count cbf2db292f0643b9647017005c361a2e11da61c7~6..cbf2db292f0643b9647017005c361a2e11da61c7; git log --first-parent --format=%s cbf2db292f0643b9647017005c361a2e11da61c7~6..cbf2db292f0643b9647017005c361a2e11da61c7; git diff --name-only cbf2db292f0643b9647017005c361a2e11da61c7~6 cbf2db292f0643b9647017005c361a2e11da61c7 | sed -e 's#^#C:/Users/AMP/w-san313/#'; echo "caminhos src/tests no delta: $(git diff --name-only cbf2db292f0643b9647017005c361a2e11da61c7~6 cbf2db292f0643b9647017005c361a2e11da61c7 -- src tests | wc -l)"`
```
objeto do ciclo 1 ancestral do objeto
R-ciclo1 cita: 1 · c2-voto do ciclo 1 cita: 1
6
0
docs(registro): ciclo 2 do B-SAN3-13 — relatório do dev (R8''), P-MOBILE-ORFAOS-POS-PURGA e índice
test(mobile): J1/J2/J5/J6 acusados (F32-F35) e remoteAuthModeProvider (B-SAN3-13)
fix(mobile): ramo 4 completo — ação de vistoria por local_run_id/server_run_id, marcador e ciência; run_id sai do mapa (B-SAN3-13)
fix(mobile): purga reconciliada atômica com a checagem de material e de linha (deleteWorkOrderUnlessPending) (B-SAN3-13)
test(mobile): vermelho-controle ciclo 2 — F28a, F29 e F24 reforçado no objeto (B-SAN3-13)
docs(plano): ciclo 2 do B-SAN3-13 — auditoria da reprovação e plano de resolução (planejador-san313-c2-fable)
C:/Users/AMP/w-san313/agent-orchestration/controle/pendencias-indice.md
C:/Users/AMP/w-san313/agent-orchestration/controle/pendencias.md
C:/Users/AMP/w-san313/docs/revisoes/SAN3/B-SAN3-13-dev.md
C:/Users/AMP/w-san313/docs/revisoes/SAN3/B-SAN3-13-plano.md
C:/Users/AMP/w-san313/mobile/flutter_app/lib/core/local_db/drift_work_order_local_store.dart
C:/Users/AMP/w-san313/mobile/flutter_app/lib/features/work_orders/data/work_order_local_store.dart
C:/Users/AMP/w-san313/mobile/flutter_app/lib/features/work_orders/data/work_order_repository.dart
C:/Users/AMP/w-san313/mobile/flutter_app/test/features/bsan313_os_purga_reconcilia_test.dart
C:/Users/AMP/w-san313/mobile/flutter_app/test/features/bsan313_retencao_ciclo2_test.dart
caminhos src/tests no delta: 0
```

O head-base do vermelho-controle do bloco é `<objeto>~19` (o ponto em que o ramo saiu da `main`: o merge do B-TRC-02, PR 454), ancestral da merge-base; a merge-base do objeto com a `origin/main` deste worktree é a do `mandato-refs.sh`; o ramo tem 19 commits de primeiro pai desde o head-base e um único merge, `<objeto>~9`, cujo segundo pai é a merge-base (o assunto de cada um abaixo); SHA que não sai do `mandato-refs.sh 460` não se publica, e por isso o head-base é citado como `<objeto>~19` e o objeto do ciclo 1 como `<objeto>~6` (no ciclo 1 eles eram `~13` e o próprio objeto), medido por: `cd C:/Users/AMP/w-san313 && git log -1 --format=%s cbf2db292f0643b9647017005c361a2e11da61c7~19; git merge-base --is-ancestor cbf2db292f0643b9647017005c361a2e11da61c7~19 b08c755719a6cb0ed192fa04e549ac5fc67a3e67 && echo 'head-base ancestral da merge-base'; git merge-base cbf2db292f0643b9647017005c361a2e11da61c7 origin/main; git rev-list --first-parent --count cbf2db292f0643b9647017005c361a2e11da61c7~19..cbf2db292f0643b9647017005c361a2e11da61c7; git rev-list --first-parent --merges --count cbf2db292f0643b9647017005c361a2e11da61c7~19..cbf2db292f0643b9647017005c361a2e11da61c7; git log -1 --format=%s cbf2db292f0643b9647017005c361a2e11da61c7~9; test "$(git rev-parse cbf2db292f0643b9647017005c361a2e11da61c7~9^2)" = b08c755719a6cb0ed192fa04e549ac5fc67a3e67 && echo 'segundo pai do merge = merge-base'`
```
feat(traccar): eventos da viatura e telemetria veicular pelo event.forward, com migração transacional e RLS forçado (B-TRC-02) (#454)
head-base ancestral da merge-base
b08c755719a6cb0ed192fa04e549ac5fc67a3e67
19
1
chore(merge): origin/main (#458) no ramo do B-SAN3-13 — registros apensados nas duas ordens, índice regenerado
segundo pai do merge = merge-base
```

O corpo desta cadeira existe no objeto e, descontados o frontmatter e o bloco de adaptação Codex do espelho, é IDÊNTICO entre os dois espelhos (comparação EOL-neutra; o arquivo inteiro difere por construção do espelho, e por isso não se publica hash); o número de linhas de cada espelho está na saída; o ciclo 2 não mexeu em corpo nenhum (a última linha conta os caminhos de agentes no delta do conserto), logo o corpo é o do ciclo 1 e a sua descrição ainda diz "ciclo 1", medido por: `cd C:/Users/AMP/w-san313 && diff <(tr -d '\r' < C:/Users/AMP/w-san313/.claude/agents/especialistas/jurado-san313-c3-regressao-escopo-registro.md | awk 'f; $0=="---"{n++; if(n==2) f=1}' | sed '/^$/d') <(tr -d '\r' < C:/Users/AMP/w-san313/.agents/agents/especialistas/jurado-san313-c3-regressao-escopo-registro.md | awk 'f; $0=="---"{n++; if(n==2) f=1}' | awk 'index($0,"Papel para o Codex"){s=1} s&&$0==""{s=0; next} !s' | sed '/^$/d') >/dev/null && echo 'IDENTICO corpo c3-regressao-escopo-registro' || echo 'DIVERGE corpo c3-regressao-escopo-registro'; wc -l < C:/Users/AMP/w-san313/.claude/agents/especialistas/jurado-san313-c3-regressao-escopo-registro.md; wc -l < C:/Users/AMP/w-san313/.agents/agents/especialistas/jurado-san313-c3-regressao-escopo-registro.md; echo "caminhos de agentes no delta do ciclo 2: $(git diff --name-only cbf2db292f0643b9647017005c361a2e11da61c7~6 cbf2db292f0643b9647017005c361a2e11da61c7 -- .claude .agents | wc -l)"; tr -d '\r' < C:/Users/AMP/w-san313/.claude/agents/especialistas/jurado-san313-c3-regressao-escopo-registro.md | grep -i -o -m1 -E 'ciclo 1'`
```
IDENTICO corpo c3-regressao-escopo-registro
332
338
caminhos de agentes no delta do ciclo 2: 0
ciclo 1
```

As duas ferramentas do pré-voo na pasta do redator do ciclo 2 são as do ramo `origin/chore/mandato-refs-e-preflight` com uma única diferença, a linha do `RAIZ` do `mandato-preflight.sh`, fixada em `C:/Users/AMP/w-trc02` (a adaptação do B-TRC-02), e são byte a byte as da pasta do redator do ciclo 1; esse `RAIZ` não existe mais no disco, logo a checagem 6 do pré-voo não acharia caminho relativo nenhum, e por isso este mandato cita todo caminho do repositório ABSOLUTO no worktree do objeto (a checagem 6 não confere caminho absoluto, fronteira declarada no cabeçalho do pré-voo; a existência de cada um sai das leituras medidas neste mandato), medido por: `cd C:/Users/AMP/Documents/GitHub/ERP_Techsolutios && for b in mandato-refs.sh mandato-preflight.sh; do bl=$(git ls-tree -r origin/chore/mandato-refs-e-preflight -- scripts | awk -v b="$b" '$4 ~ ("/" b "$") {print $3}'); diff <(git cat-file blob "$bl") C:/Users/AMP/erp-pausa-2026-10-03/redator-san313c2/$b | grep -i -E '^[<>]'; echo "$b linhas-diferentes=$(diff <(git cat-file blob "$bl") C:/Users/AMP/erp-pausa-2026-10-03/redator-san313c2/$b | grep -c -i -E '^[<>]')"; cmp -s C:/Users/AMP/erp-pausa-2026-10-03/redator-san313c2/$b C:/Users/AMP/erp-pausa-2026-10-03/redator-san313/$b && echo "$b igual ao do redator do ciclo 1"; done; test -d C:/Users/AMP/w-trc02 && echo 'RAIZ existe' || echo 'RAIZ ausente: C:/Users/AMP/w-trc02'`
```
mandato-refs.sh linhas-diferentes=0
mandato-refs.sh igual ao do redator do ciclo 1
< RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
> RAIZ=C:/Users/AMP/w-trc02
mandato-preflight.sh linhas-diferentes=2
mandato-preflight.sh igual ao do redator do ciclo 1
RAIZ ausente: C:/Users/AMP/w-trc02
```

A régua deste ciclo no contrato do objeto: do §C7 item 8, as regras (1) junta proporcional ao risco, (2) teto de 2 ciclos e (3) menos burocracia; do §C7 item 9, as regras (0) `arquivos_medidos` em todo voto, (1) a cadeira verde que carrega, (2) a revalidação por identidade nova e (3) a cadeira vermelha refeita (linha e começo de cada regra), medido por: `tr -d '\r' < C:/Users/AMP/w-san313/CLAUDE.md | grep -n -i -o -E '\*\*\((0|1|2|3)\) [^*]{0,60}'`
```
759:**(1) Junta proporcional ao risco.
763:**(2) Teto de 2 ciclos.
768:**(3) Menos burocracia.
821:**(0) Todo voto de cadeira declara `arquivos_medidos`:
825:**(1) A cadeira verde carrega o voto
829:**(2) Se o conserto tocar o escopo dela,
832:**(3) A cadeira vermelha é refeita
```

A C3 ainda não votou neste bloco: no diretório de votos do ciclo 1 não há arquivo `c3-*` (o esqueleto da cadeira Codex caída foi preservado como `caido-sol-c3-*`), logo não há voto da C3 a carregar nem a revalidar (§C7 item 9), e ela vota pela primeira vez, no objeto do ciclo 2, medido por: `echo "arquivos c3-* no ciclo 1: $(ls C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13 | grep -c -i -E '^c3-')"; ls C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13 | grep -i -E 'c3' | sed -e 's#^#C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13/#'`
```
arquivos c3-* no ciclo 1: 0
C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13/caido-sol-c3-evidencia.md
C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13/caido-sol-c3-voto.json
```

Os caminhos do trabalho próprio do ramo (commits de primeiro pai sem os merges, do head-base `<objeto>~19` ao objeto, inclusive os 6 do ciclo 2): a contagem e a lista, com o prefixo do worktree que o `sed` põe; a classificação em PERMITIDO, DESVIO DECLARADO, REGISTRO DA JUNTA ou FORA é da C3, medido por: `cd C:/Users/AMP/w-san313 && git log --first-parent --no-merges --name-only --format= cbf2db292f0643b9647017005c361a2e11da61c7~19..cbf2db292f0643b9647017005c361a2e11da61c7 | sort -u | grep -v -i -E '^$' | wc -l; git log --first-parent --no-merges --name-only --format= cbf2db292f0643b9647017005c361a2e11da61c7~19..cbf2db292f0643b9647017005c361a2e11da61c7 | sort -u | grep -v -i -E '^$' | sed -e 's#^#C:/Users/AMP/w-san313/#'`
```
37
C:/Users/AMP/w-san313/.agents/agents/especialistas/jurado-san313-c1-escopo-e-cursor.md
C:/Users/AMP/w-san313/.agents/agents/especialistas/jurado-san313-c2-app-nunca-perde.md
C:/Users/AMP/w-san313/.agents/agents/especialistas/jurado-san313-c3-regressao-escopo-registro.md
C:/Users/AMP/w-san313/.claude/agents/especialistas/jurado-san313-c1-escopo-e-cursor.md
C:/Users/AMP/w-san313/.claude/agents/especialistas/jurado-san313-c2-app-nunca-perde.md
C:/Users/AMP/w-san313/.claude/agents/especialistas/jurado-san313-c3-regressao-escopo-registro.md
C:/Users/AMP/w-san313/agent-orchestration/controle/decisoes.md
C:/Users/AMP/w-san313/agent-orchestration/controle/pendencias-indice.md
C:/Users/AMP/w-san313/agent-orchestration/controle/pendencias.md
C:/Users/AMP/w-san313/docs/claude-code-handoff/API_CONTRACTS.md
C:/Users/AMP/w-san313/docs/revisoes/SAN3/B-SAN3-13-critica-r1.md
C:/Users/AMP/w-san313/docs/revisoes/SAN3/B-SAN3-13-critica-r2.md
C:/Users/AMP/w-san313/docs/revisoes/SAN3/B-SAN3-13-dev.md
C:/Users/AMP/w-san313/docs/revisoes/SAN3/B-SAN3-13-medicao.md
C:/Users/AMP/w-san313/docs/revisoes/SAN3/B-SAN3-13-plano.md
C:/Users/AMP/w-san313/docs/revisoes/SAN3/PLANO_SAN3.md
C:/Users/AMP/w-san313/mobile/flutter_app/lib/core/local_db/drift_work_order_local_store.dart
C:/Users/AMP/w-san313/mobile/flutter_app/lib/features/work_orders/data/work_order_local_store.dart
C:/Users/AMP/w-san313/mobile/flutter_app/lib/features/work_orders/data/work_order_remote_api.dart
C:/Users/AMP/w-san313/mobile/flutter_app/lib/features/work_orders/data/work_order_repository.dart
C:/Users/AMP/w-san313/mobile/flutter_app/lib/features/work_orders/ui/work_order_list_screen.dart
C:/Users/AMP/w-san313/mobile/flutter_app/lib/shared/ui/home_screen.dart
C:/Users/AMP/w-san313/mobile/flutter_app/test/features/b084_home_stats_test.dart
C:/Users/AMP/w-san313/mobile/flutter_app/test/features/bsan313_home_lista_e1_test.dart
C:/Users/AMP/w-san313/mobile/flutter_app/test/features/bsan313_minhas_os_escopo_test.dart
C:/Users/AMP/w-san313/mobile/flutter_app/test/features/bsan313_os_purga_reconcilia_test.dart
C:/Users/AMP/w-san313/mobile/flutter_app/test/features/bsan313_retencao_ciclo2_test.dart
C:/Users/AMP/w-san313/src/modules/work-orders/work-order-prisma.repository.ts
C:/Users/AMP/w-san313/src/modules/work-orders/work-order.dto.ts
C:/Users/AMP/w-san313/src/modules/work-orders/work-order.repository.ts
C:/Users/AMP/w-san313/src/modules/work-orders/work-order.service.ts
C:/Users/AMP/w-san313/src/modules/work-orders/work-order.types.ts
C:/Users/AMP/w-san313/src/modules/work-orders/work-order.validators.ts
C:/Users/AMP/w-san313/tests/san3-13-wo-list-cursor-db.test.ts
C:/Users/AMP/w-san313/tests/san3-13-wo-list-cursor.test.ts
C:/Users/AMP/w-san313/tests/san3-13-wo-list-prisma-where.test.ts
C:/Users/AMP/w-san313/tests/san3-13-wo-list-scope.test.ts
```

O delta do conserto (`<objeto>~6` ao objeto) contra o escopo do plano do ciclo 2 (§C e §F), pelo nome do arquivo: 0 caminho fora da lista esperada (os três arquivos de `lib` permitidos, testes `bsan313_*`, o plano e o relatório do dev, as pendências e o índice) e 0 caminho em cada família do PROIBIDO do §C (backend, contrato de API, vistoria, prestador, sync, configuração, schema, os stores Drift de vistoria e prestador, rede e telas da OS, KPI); os hunks dentro das funções permitidas são da C3 medir, medido por: `cd C:/Users/AMP/w-san313 && echo "fora da lista esperada: $(git diff --name-only cbf2db292f0643b9647017005c361a2e11da61c7~6 cbf2db292f0643b9647017005c361a2e11da61c7 | grep -c -v -i -E '(work_order_repository|work_order_local_store|drift_work_order_local_store)\.dart$|bsan313_[a-z0-9_]*_test\.dart$|B-SAN3-13-(plano|dev)\.md$|pendencias(-indice)?\.md$')"; for p in src tests '*API_CONTRACTS.md' '*checklists*' '*prestador*' '*core?sync*' '*app_config.dart' '*app_database.dart' '*work_order_remote_api.dart' '*home_screen.dart' '*work_order_list_screen.dart' '*PLANO_SAN3.md' Kpis; do echo "PROIBIDO $p: $(git diff --name-only cbf2db292f0643b9647017005c361a2e11da61c7~6 cbf2db292f0643b9647017005c361a2e11da61c7 -- "$p" | wc -l)"; done`
```
fora da lista esperada: 0
PROIBIDO src: 0
PROIBIDO tests: 0
PROIBIDO *API_CONTRACTS.md: 0
PROIBIDO *checklists*: 0
PROIBIDO *prestador*: 0
PROIBIDO *core?sync*: 0
PROIBIDO *app_config.dart: 0
PROIBIDO *app_database.dart: 0
PROIBIDO *work_order_remote_api.dart: 0
PROIBIDO *home_screen.dart: 0
PROIBIDO *work_order_list_screen.dart: 0
PROIBIDO *PLANO_SAN3.md: 0
PROIBIDO Kpis: 0
```

No objeto: a seção `D-SAN3-13-SCOPE-ASSIGNED` do `decisoes.md` e as três citações do dono (a "vc cobre o codex nessa rodada" aparece duas vezes); as doze pendências que a fábrica listou no ciclo 1 e a `P-MOBILE-ORFAOS-POS-PURGA` que o ciclo 2 abriu (RQ-4), cada uma com o cabeçalho na linha impressa (cortado em 90 colunas), e a nova também no índice; no `API_CONTRACTS.md`, `paginate=cursor`, `invalid_cursor_mode` e `WORK_ORDER_SCOPE_UNAVAILABLE`; o texto do R8″ (RQ-5) uma vez no plano e uma vez no relatório do dev; e zero caminho de `Kpis` mudado do head-base ao objeto (a última linha), medido por: `tr -d '\r' < C:/Users/AMP/w-san313/agent-orchestration/controle/decisoes.md | grep -n -i -o -E '^## D-SAN3-13-SCOPE-ASSIGNED|Aceito as 5 \(Recomendado\)|Só as abertas|vc cobre o codex nessa rodada'; tr -d '\r' < C:/Users/AMP/w-san313/agent-orchestration/controle/pendencias.md | grep -n -i -E '^## (P-MOBILE-MINHAS-OS-SEM-FILTRO|P-MOBILE-OS-SEEDS|P-WO-LEITURAS-TENANT-WIDE-TECNICO|P-MOBILE-SYNC-FAILED-SEM-DESCARTE|P-MOBILE-EVIDENCIA-CONFLITO-SEM-DESCARTE|P-MOBILE-MATERIAL-SEM-REPLAY|P-MOBILE-LINHA-CONFLICT-NAO-LIMPA|P-MOBILE-REPO-SESSAO-DEMO-DURANTE-RELOAD|P-MOBILE-FILA-LER-TUDO-GRAVAR-TUDO|P-WO-STATUS-VOCABULARIO-APP-BACKEND|P-WO-LIST-SCOPE-WEB-TECNICO|P-MOBILE-TELEMETRIA-TESTE-16-INSTAVEL|P-MOBILE-ORFAOS-POS-PURGA) ' | cut -c1-90; echo "índice cita P-MOBILE-ORFAOS-POS-PURGA: $(tr -d '\r' < C:/Users/AMP/w-san313/agent-orchestration/controle/pendencias-indice.md | grep -c -i 'P-MOBILE-ORFAOS-POS-PURGA')"; tr -d '\r' < C:/Users/AMP/w-san313/docs/claude-code-handoff/API_CONTRACTS.md | grep -n -i -o -E 'paginate=cursor|invalid_cursor_mode|WORK_ORDER_SCOPE_UNAVAILABLE' | sort -u; echo "R8 no plano: $(tr -d '\r' < C:/Users/AMP/w-san313/docs/revisoes/SAN3/B-SAN3-13-plano.md | grep -c -i 'Escritor de material fora da trava: se grava ANTES') · no relatório do dev: $(tr -d '\r' < C:/Users/AMP/w-san313/docs/revisoes/SAN3/B-SAN3-13-dev.md | grep -c -i 'Escritor de material fora da trava: se grava ANTES')"; git -C C:/Users/AMP/w-san313 diff --name-only cbf2db292f0643b9647017005c361a2e11da61c7~19 cbf2db292f0643b9647017005c361a2e11da61c7 -- Kpis | wc -l`
```
3881:vc cobre o codex nessa rodada
3932:## D-SAN3-13-SCOPE-ASSIGNED
3934:Aceito as 5 (Recomendado)
3935:Só as abertas
3936:vc cobre o codex nessa rodada
2070:## P-MOBILE-OS-SEEDS (2026-08-06) — lista de OS do app mostra SEEDS locais como se
8865:## P-MOBILE-MINHAS-OS-SEM-FILTRO (2026-09-11) — "Minhas OS" lista a organização i
11661:## P-WO-LEITURAS-TENANT-WIDE-TECNICO (2026-10-25) — o técnico ainda LÊ OS e desp
11671:## P-MOBILE-SYNC-FAILED-SEM-DESCARTE (2026-10-25) — ação failed e tipos não rep
11680:## P-MOBILE-EVIDENCIA-CONFLITO-SEM-DESCARTE (2026-10-25) — evidência em conflict
11687:## P-MOBILE-MATERIAL-SEM-REPLAY (2026-10-25) — work_order_material.add fica pendin
11695:## P-MOBILE-LINHA-CONFLICT-NAO-LIMPA (2026-10-25) — useServer muda só a ação; a
11701:## P-MOBILE-REPO-SESSAO-DEMO-DURANTE-RELOAD (2026-10-25) — o provider nasce com a
11708:## P-MOBILE-FILA-LER-TUDO-GRAVAR-TUDO (2026-10-25) — enqueue/update da fila sobres
11716:## P-WO-STATUS-VOCABULARIO-APP-BACKEND (2026-10-25) — approved só no app; rejecte
11722:## P-WO-LIST-SCOPE-WEB-TECNICO (2026-10-25) — confirmar que nenhuma tela web com s
11728:## P-MOBILE-TELEMETRIA-TESTE-16-INSTAVEL (2026-10-25) — o teste 16 da telemetria f
11735:## P-MOBILE-ORFAOS-POS-PURGA (2026-10-25) — ação e material órfãos da OS que s
índice cita P-MOBILE-ORFAOS-POS-PURGA: 1
24:paginate=cursor
32:WORK_ORDER_SCOPE_UNAVAILABLE
32:invalid_cursor_mode
32:paginate=cursor
R8 no plano: 1 · no relatório do dev: 1
0
```

Memória de commit livre em GB (a P8 (c) exige pelo menos 4 antes de lançar agente), os trabalhos Docker vivos fora da base `erp-*` (o teto é 2 contando o da cadeira) e o disco livre em `C:` (a ordem do orquestrador para este ciclo: PARE abaixo de 7 GB), no instante da redação: a cadeira mede de novo antes de subir, medido por: `powershell.exe -NoProfile -Command '$o=Get-CimInstance Win32_PerfFormattedData_PerfOS_Memory; [math]::Round(($o.CommitLimit-$o.CommittedBytes)/1GB,2)'; docker ps --format '{{.Names}}' | grep -v -i -E '^erp-' | sed -E 's#-(pg|redis|run|net)$##' | sort -u; echo "trabalhos fora de erp: $(docker ps --format '{{.Names}}' | grep -v -i -E '^erp-' | sed -E 's#-(pg|redis|run|net)$##' | sort -u | wc -l)"; df -h /c | tail -1 | awk '{print "livre em C: " $4}'`
```
13,66
trabalhos fora de erp: 0
livre em C: 10G
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

Você é `jurado-san313-c3-opus` (o nome da composição do ciclo 1, que nunca votou; o orquestrador confirma no disparo), executor Claude Code (subagente), modelo **Claude Opus**, nível menor DECLARADO (§C7.6); o seu corpo canônico é `C:/Users/AMP/w-san313/.claude/agents/especialistas/jurado-san313-c3-regressao-escopo-registro.md`, carregado **do blob do objeto** (o worktree está no objeto, medido acima). O corpo é o do ciclo 1 e diz "ciclo 1" (medido acima): onde ele divergir deste mandato quanto a ciclo, objeto, diretório de votos ou escopo, vale este mandato. Na primeira linha de `c3-evidencia.md`, declare executor efetivo, modelo, nível, objeto, `mandato_md5` deste arquivo (CR retirado antes do md5) e IDENTICO/DIVERGE do corpo carregado contra o blob, EOL-neutro. **Opus esgotado: PARE sem votar** (§C7.6-bis). Inelegíveis por nome: `planejador-mestre`, `planejador-san313-fable`, `planejador-san313-c2-fable` (auditou a reprovação e planejou o conserto), `crit-san313-opus`, `crit-san313-opus-r2`, `crit-san313-argon`, `crit-san313-pro-r2`, `med-san313-argon`, `dev-san313-opus`, `dev-san313-c2-opus` (consertou), `fab-san313-opus`, `redator-san313-opus`, `redator-san313c2-opus` (este mandato), `inspetor-san313-opus`, `jurado-san313-c2-opus` (achou C2-01 a C2-04), as cadeiras Codex caídas `jurado-san313-c1-sol`, `jurado-san313-c2-sol` e `jurado-san313-c3-sol`, o orquestrador, `inspetor-san313c2-opus`, `jurado-san313-c1-opus` e `jurado-san313-c2b-opus`; nome coincidente, pare. Monocultura declarada (o dev do ciclo 1 e o do ciclo 2 rodaram em Claude Opus). O plano v3 com E1/E2, a seção do ciclo 2 do plano, o relatório do dev dos dois ciclos (contagens, resíduo, merge, ajustes, desvios) e as críticas são **A RE-VERIFICAR**, derruba com: `head -1 C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13-ciclo2/c3-evidencia.md | grep -i -E 'executor|Opus|mandato_md5|objeto|IDENTICO|DIVERGE'`

A legalidade vem antes do mérito: parecer `insp-san313c2-parecer.md` de `inspetor-san313c2-opus` com LIBERADO ou LIBERADO COM RESSALVA nomeando você, o seu executor, o seu worktree e os seus containers; objeto = head do PR 460 do ciclo 2 (medido acima), check-runs concluídos. Régua: DADO, **unanimidade de 3 com veto**, **ciclo 2**, o ÚLTIMO em que todo `bloqueia` `dentro-do-bloco` reprova, grave ou não (§C7 item 8(2)). Divergência registrada (§A2): o plano §9 dava à C3 a rede e as telas do app; na composição do orquestrador elas são da C2, e a C3 fica com as duas baterias inteiras, o escopo (agora também o do delta do conserto), o merge e o registro. **KPI congelado (§C7 item 8(5)): não cobre KPI; só confere `Kpis` sem diff** (medido acima: zero caminho). Todo achado com gravidade, classe, escopo, N e forma; `pre-existente` só com a pre-existência MEDIDA (a base falhando na mesma forma) e pendência com dono; "não consigo medir" = REPROVADO; não proponha correção, não cobre a ata da junta (é do orquestrador depois dos votos), não julgue o mérito de C2-01 a C2-04 (é da C2 refeita), não leia os votos e evidências das outras cadeiras de ciclo nenhum; `arquivos_medidos: ["**"]` (suítes inteiras), derruba com: `grep -i -E 'legalidade|A RE-VERIFICAR|gravidade|classe|escopo|arquivos_medidos|KPI|ciclo 2' C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13-ciclo2/c3-voto.json`

Terreno: worktree exclusivo `C:/Users/AMP/j13c2-c3-wt`, detached no objeto, `npm ci` e `flutter pub get` próprios, zero junction, removido só por `git worktree remove --force` depois de processos = 0. Postgres 16 `j13c2-c3-pg` e Redis 7 `j13c2-c3-redis` próprios, só em `127.0.0.1`, portas altas testadas antes (candidatas 47633 e 47634), senha aleatória só por ambiente, bancos extras `j13c2_c3_*`; `DATABASE_URL` e `REDIS_URL` seus como prefixo de **todo** `npm test`. Antes de subir: memória de commit livre ≥ 4 GB, no máximo 2 trabalhos Docker contando o seu (medido acima), disco ≥ 7 GB (abaixo disso, PARE e registre); uma cadeira por vez (ordem do dono): você só sobe quando o inspetor disser que é a sua vez. Nunca `erp-*`, nem 5432, 6379, 3000, 5173, 5050, 8899, 55432, 55313; nunca `prune` nem container alheio. Formato Flutter pela versão da CI (Dart 3.13.4, SDK avulso numa pasta sua) ou pelo check-run `flutter` do objeto, declarado. Controles no head-base `<objeto>~19` e no objeto do ciclo 1 `<objeto>~6` (medidos acima) por `git checkout cbf2db292f0643b9647017005c361a2e11da61c7~19 -- <caminhos>` ou `~6`, no seu worktree, restaurados e provados por `hash-object`; se o lockfile diferir entre base e objeto, o controle backend da base sai do CI da base, declarado. Scripts numa pasta sua `C:/Users/AMP/erp-pausa-2026-10-03/j13c2-c3/`, derruba com: `grep -i -E 'j13c2-c3-wt|j13c2-c3-pg|j13c2-c3-redis|j13c2_c3_|127\.0\.0\.1|junction|commit livre|4 GB|7 GB|erp-|5432|6379|versão da CI|3\.13\.4|hash-object|head-base|teardown' C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13-ciclo2/c3-evidencia.md`

Item 1 de 3 (as duas suítes inteiras com o resíduo nomeado e datado — CA-12, CA-25): `npm run check`, `lint`, `build`; `npm test` na forma da CI (com o seu Postgres e o seu Redis) e na forma sem banco, com `arquivos · tests · pass · fail · skipped` e o nome de cada `fail` e `skip` (o backend não mudou no ciclo 2, medido acima: o N tem de ser o do objeto do ciclo 1); Flutter `pub get`, `dart format` na versão da CI, `flutter analyze` e a suíte inteira três vezes (o dev declara 905, 0 skip, e o plano pede ao menos 905); a contagem `N_objeto − N_base` = novos do bloco (ciclo 1 e ciclo 2) + vindos da `main`, e `N_objeto − N_ciclo1` = só os novos do ciclo 2, nenhum teste apagado, nenhum `skip` novo sem motivo; e o resíduo datado por execução — o `telemetry_test` 16 isolado N ≥ 10 no objeto e N ≥ 10 no head-base, e junto da suíte, com a data do teste e os imports que o bloco mudou; o `core-saas-role-authority` sem e com `DATABASE_URL` no objeto e na base; qualquer outro vermelho pelo mesmo método. Vermelho-controle: os testes do bloco ausentes na base (contagem 0) e o comparador acusando um teste apagado numa cópia sua, derruba com: `grep -i -E 'Item 1|npm run check|lint|build|npm test|skipped|dart format|flutter analyze|905|N_base|N_objeto|N_ciclo1|diff-filter=D|telemetry_test|core-saas-role-authority|DATABASE_URL|pre-existente|head-base|vermelho' C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13-ciclo2/c3-evidencia.md`

Item 2 de 3 (o diff dentro do PERMITIDO e o merge sem conteúdo próprio — §5 da v3, §C e §F do ciclo 2, §C4): os caminhos do trabalho próprio (medidos acima) classificados por script em PERMITIDO, DESVIO DECLARADO (com o lugar da declaração), REGISTRO DA JUNTA ou FORA — candidatos a desvio: `b084_home_stats_test.dart`, `docs/revisoes/SAN3/B-SAN3-13-*`, `pendencias-indice.md`, fakes de `WorkOrderLocalStore`; o PROIBIDO do §5 vazio; o delta do conserto `<objeto>~6` ao objeto dentro do PERMITIDO do §C do ciclo 2 e com o PROIBIDO do §C vazio (o que se mediu acima, pelo nome, é piso: meça por caminho completo); os hunks de `work_order_repository.dart` do ciclo 2 localizados por função (parse de chaves, não número de linha) só no typedef do gancho, nos mapas de chaves, no `_reconcile`, em `buildWorkOrderExternalPendingWork` e nos providers, com `_serial`, as 7 mutações, `_hasPendingWork` ramos 1 a 3, `_isFabricated`, `_purgeFabricatedOrders`, `_upsertRemoteOrders` e `load()` intocados; os de `drift_work_order_local_store.dart` só no método novo, com o `deleteWorkOrder` sem mudança; os de `work-order.service.ts` e do store Drift do ciclo 1 dentro das regiões permitidas; e o merge de primeiro pai (medido acima: um, `<objeto>~9`, com o segundo pai na merge-base): a árvore automática por `git merge-tree --write-tree`, os caminhos em que o merge difere dela só entre os conflitados e só registro, 0 linha removida de `decisoes.md` e `pendencias.md` contra cada pai, o índice igual ao que o gerador do objeto produz, e nenhum arquivo de código diferente do automático. Vermelho-controle: o classificador acusa um caminho PROIBIDO fabricado, o comparador acusa uma remoção fabricada, e um hunk fabricado em `_isFabricated` sai FORA, derruba com: `grep -i -E 'Item 2|PERMITIDO|PROIBIDO|DESVIO|FORA|b084|hunk|_reconcile|_isFabricated|deleteWorkOrder|merge-tree|automático|removidas|pendencias-indice|gerar-indice|vermelho|head-base' C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13-ciclo2/c3-evidencia.md`

Item 3 de 3 (o registro): a seção `D-SAN3-13-SCOPE-ASSIGNED` delimitada por parse, as três citações do dono comparadas byte a byte com as do plano e atribuídas à pergunta certa, a E2 e a precisão do `OR: []` registradas como do planejador (fato × leitura, §A6), e se o registro diz "imposto no backend" sem dizer que é na lista (CRIT-4); as pendências que o §12 manda abrir, geradas por busca no plano, presentes uma vez, com severidade, bloco dono não vago e a propriedade em aberto, #32/#33 "fecham com o merge" com a prova nomeada, a `P-WO-LEITURAS-TENANT-WIDE-TECNICO` enumerando as rotas; a `P-MOBILE-ORFAOS-POS-PURGA` do ciclo 2 com a severidade BAIXA e o dono `B-SAN3-16` que o RQ-4 manda, e o índice igual ao que o gerador do objeto produz; o R8″ do relatório do dev igual, normalizado, ao do plano (RQ-5), com a v3 não reescrita; a seção do ciclo 2 do relatório do dev com as contagens que você mediu no item 1 e os 4 desvios declarados; a linha de `API_CONTRACTS.md` igual ao texto da E2 (normalizado), cada código de erro do texto emitido pelo código e todo código novo do código no texto, e nenhuma mudança dele nem do `PLANO_SAN3.md` no ciclo 2 (RQ-6); a linha do `B-SAN3-13` no `PLANO_SAN3.md` com o texto antigo riscado e não apagado; `Kpis` sem diff. Vermelho-controle: na base, `D-SAN3-13` = 0 e as pendências novas = 0; no objeto do ciclo 1, a `P-MOBILE-ORFAOS-POS-PURGA` = 0; o comparador de citação acusa um caractere alterado; o de códigos acusa um código só no texto, derruba com: `grep -i -E 'Item 3|D-SAN3-13-SCOPE-ASSIGNED|Aceito as 5|Só as abertas|vc cobre o codex|E2|OR: \[\]|na lista|§12|dono|P-WO-LEITURAS|P-MOBILE-ORFAOS-POS-PURGA|B-SAN3-16|R8|desvios|API_CONTRACTS|invalid_|WORK_ORDER_SCOPE_UNAVAILABLE|PLANO_SAN3|riscad|Kpis|vermelho|head-base' C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13-ciclo2/c3-evidencia.md`

Protocolo P1/P2/P3/P4/P7 do §C7.7, verbatim no bloco colado acima, com `<cadeira>` = `c3`: evidência em `c3-evidencia.md` após CADA item; `c3-voto.json` nasce esqueleto com os três itens EM APURAÇÃO e `arquivos_medidos: ["**"]`, cada item gravado ao ser medido, e fecha antes da mensagem final de 1 linha; sucessor de identidade nova re-executa os comandos registrados e só então mede a cauda; três itens exatos; PAUSA grava head, feito, falta, próximo comando e arquivos meio-escritos (inclusive uma suíte em curso e os controles não restaurados) e para. Queda em `00-quedas.md` do diretório deste ciclo (P6, pelo orquestrador); uma cadeira por vez. Únicos outputs no repositório: `c3-evidencia.md` e `c3-voto.json` em `C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13-ciclo2/`; o diretório do ciclo 1 é só leitura; nunca commit, derruba com: `test -f C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13-ciclo2/c3-voto.json`

## MEDIDO

Pré-voo deste mandato com as ferramentas copiadas sem mudança para a pasta do redator `C:/Users/AMP/erp-pausa-2026-10-03/redator-san313c2/` (diferença contra o ramo das ferramentas medida acima), executado com o cwd no worktree do objeto; o redator é `redator-san313c2-opus` (Claude Opus 5.5, nível menor declarado, identidade nova), que adaptou ao ciclo 2 os mandatos do ciclo 1 (conteúdo de `fab-san313-opus`, forma de `redator-san313-opus`) pelo plano de resolução do ciclo 2 e executou cada comando deste mandato pelo gerador `C:/Users/AMP/erp-pausa-2026-10-03/redator-san313c2/gerar-c3.sh`, medido por: `cd C:/Users/AMP/w-san313 && MANDATO_REFS=C:/Users/AMP/erp-pausa-2026-10-03/redator-san313c2/mandato-refs.sh bash C:/Users/AMP/erp-pausa-2026-10-03/redator-san313c2/mandato-preflight.sh C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13-ciclo2/00-mandatos/cadeira-c3.md 460 2>&1; echo ec=$?`
```
COLAGEM    l.6-20: refs do PR #460 confere com a saida atual

PRE-VOO OK — C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13-ciclo2/00-mandatos/cadeira-c3.md
ec=0
```
