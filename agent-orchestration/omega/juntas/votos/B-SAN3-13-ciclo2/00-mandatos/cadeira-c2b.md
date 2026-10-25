# Mandato — Cadeira C2 refeita (C2b) — B-SAN3-13 ciclo 2 (junta de DADO)

## MEDIDO

Estado do PR 460 no instante da redação do ciclo 2, pela ferramenta `mandato-refs.sh` copiada sem mudança para a pasta própria do redator `C:/Users/AMP/erp-pausa-2026-10-03/redator-san313c2/`, com o cwd no worktree do objeto (ec 0: o head do PR, a merge-base, 14 check-runs, nenhum não verde, e nenhuma ata ainda), medido por: `cd C:/Users/AMP/w-san313 && bash C:/Users/AMP/erp-pausa-2026-10-03/redator-san313c2/mandato-refs.sh 460`
```
# refs do PR #460 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato
# gerado em: 2026-10-25T20:12Z · repo: thiagodorgo/ERP_Techsolutios

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

O corpo desta cadeira existe no objeto e, descontados o frontmatter e o bloco de adaptação Codex do espelho, é IDÊNTICO entre os dois espelhos (comparação EOL-neutra; o arquivo inteiro difere por construção do espelho, e por isso não se publica hash); o número de linhas de cada espelho está na saída; o ciclo 2 não mexeu em corpo nenhum (a última linha conta os caminhos de agentes no delta do conserto), logo o corpo é o do ciclo 1 e a sua descrição ainda diz "ciclo 1", medido por: `cd C:/Users/AMP/w-san313 && diff <(tr -d '\r' < C:/Users/AMP/w-san313/.claude/agents/especialistas/jurado-san313-c2-app-nunca-perde.md | awk 'f; $0=="---"{n++; if(n==2) f=1}' | sed '/^$/d') <(tr -d '\r' < C:/Users/AMP/w-san313/.agents/agents/especialistas/jurado-san313-c2-app-nunca-perde.md | awk 'f; $0=="---"{n++; if(n==2) f=1}' | awk 'index($0,"Papel para o Codex"){s=1} s&&$0==""{s=0; next} !s' | sed '/^$/d') >/dev/null && echo 'IDENTICO corpo c2-app-nunca-perde' || echo 'DIVERGE corpo c2-app-nunca-perde'; wc -l < C:/Users/AMP/w-san313/.claude/agents/especialistas/jurado-san313-c2-app-nunca-perde.md; wc -l < C:/Users/AMP/w-san313/.agents/agents/especialistas/jurado-san313-c2-app-nunca-perde.md; echo "caminhos de agentes no delta do ciclo 2: $(git diff --name-only cbf2db292f0643b9647017005c361a2e11da61c7~6 cbf2db292f0643b9647017005c361a2e11da61c7 -- .claude .agents | wc -l)"; tr -d '\r' < C:/Users/AMP/w-san313/.claude/agents/especialistas/jurado-san313-c2-app-nunca-perde.md | grep -i -o -m1 -E 'ciclo 1'`
```
IDENTICO corpo c2-app-nunca-perde
383
389
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

Os achados que esta cadeira refeita julga estão no registro da reprovação do ciclo 1 (C2-01 grave, C2-02 não grave, C2-03 ajuste, C2-04 nota), e o roteiro P3 da C2 do ciclo 1 existe: a evidência e o voto dela no diretório de votos do ciclo 1 (linhas de cada um e o `arquivos_medidos` do voto), as sondas e os roteiros de mutação dela na pasta `C:/Users/AMP/erp-pausa-2026-10-03/j13-c2/` e a sonda do planejador do ciclo 2 na pasta `C:/Users/AMP/erp-pausa-2026-10-03/j13-plan-c2/` (as listas abaixo), medido por: `tr -d '\r' < C:/Users/AMP/w-san313/agent-orchestration/omega/reprovacoes/R-B-SAN3-13-ciclo1.md | grep -n -i -o -E '\*\*C2-0[1-4][^:]*:|C2-03 \([^)]*\)|C2-04 \([^)]*\)'; wc -l < C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13/c2-evidencia.md; wc -l < C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13/c2-voto.json; tr -d '\r' < C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13/c2-voto.json | grep -i -o -E '"arquivos_medidos"[^]]*]' | grep -i -o -E '"[^"]*"' | sed -e 1d | tr -d '"' | sed -e 's#^#arquivos_medidos: C:/Users/AMP/w-san313/#'; ls C:/Users/AMP/erp-pausa-2026-10-03/j13-c2 | sed -e 's#^#C:/Users/AMP/erp-pausa-2026-10-03/j13-c2/#'; ls C:/Users/AMP/erp-pausa-2026-10-03/j13-plan-c2 | sed -e 's#^#C:/Users/AMP/erp-pausa-2026-10-03/j13-plan-c2/#'`
```
6:**C2-01 (grave, perda de dado):
7:**C2-02 (não grave):
8:C2-03 (J1, J2, J5, J6 sem teste vermelho)
8:C2-04 (a regra de fabricação também apaga o pendente de linha fabricada)
84
40
arquivos_medidos: C:/Users/AMP/w-san313/mobile/flutter_app/**
arquivos_medidos: C:/Users/AMP/w-san313/tests/san3-13-wo-list-cursor.test.ts
arquivos_medidos: C:/Users/AMP/w-san313/src/modules/work-orders/work-order.repository.ts
arquivos_medidos: C:/Users/AMP/w-san313/src/modules/work-orders/work-order.service.ts
C:/Users/AMP/erp-pausa-2026-10-03/j13-c2/base.log
C:/Users/AMP/erp-pausa-2026-10-03/j13-c2/be-cursor.log
C:/Users/AMP/erp-pausa-2026-10-03/j13-c2/be-sonda.log
C:/Users/AMP/erp-pausa-2026-10-03/j13-c2/c2-voto.json
C:/Users/AMP/erp-pausa-2026-10-03/j13-c2/evid-final.md
C:/Users/AMP/erp-pausa-2026-10-03/j13-c2/h1.log
C:/Users/AMP/erp-pausa-2026-10-03/j13-c2/mut_c2.diff
C:/Users/AMP/erp-pausa-2026-10-03/j13-c2/mut_c2.out
C:/Users/AMP/erp-pausa-2026-10-03/j13-c2/mut_c2.py
C:/Users/AMP/erp-pausa-2026-10-03/j13-c2/mut_c2b.out
C:/Users/AMP/erp-pausa-2026-10-03/j13-c2/mut_extra.py
C:/Users/AMP/erp-pausa-2026-10-03/j13-c2/mut_runner.py
C:/Users/AMP/erp-pausa-2026-10-03/j13-c2/npmci.log
C:/Users/AMP/erp-pausa-2026-10-03/j13-c2/pubget.log
C:/Users/AMP/erp-pausa-2026-10-03/j13-c2/repo.lf.dart
C:/Users/AMP/erp-pausa-2026-10-03/j13-c2/sonda1.log
C:/Users/AMP/erp-pausa-2026-10-03/j13-c2/t-bloco.log
C:/Users/AMP/erp-pausa-2026-10-03/j13-c2/viz1.log
C:/Users/AMP/erp-pausa-2026-10-03/j13-c2/viz2.log
C:/Users/AMP/erp-pausa-2026-10-03/j13-c2/viz3.log
C:/Users/AMP/erp-pausa-2026-10-03/j13-c2/viz4.log
C:/Users/AMP/erp-pausa-2026-10-03/j13-c2/wt.log
C:/Users/AMP/erp-pausa-2026-10-03/j13-c2/zz_j13c2_base_test.dart
C:/Users/AMP/erp-pausa-2026-10-03/j13-c2/zz_j13c2_h1_test.dart
C:/Users/AMP/erp-pausa-2026-10-03/j13-c2/zz_j13c2_sonda_test.dart.copia
C:/Users/AMP/erp-pausa-2026-10-03/j13-plan-c2/zz_plan13c2_p1_test.dart
```

O delta do conserto no app, linhas acrescentadas e removidas por arquivo de `<objeto>~6` ao objeto (o arquivo de teste do ciclo 1 perdeu uma linha, a do ajuste declarado do F24), e os quatro arquivos de teste Flutter do bloco no objeto com a contagem de chamadas `test`/`testWidgets` de cada um (o dev declara 41 testes do bloco: 29 do ciclo 1 mais 12 novos; o `awk` e o `sed` põem o prefixo do worktree no caminho impresso), medido por: `cd C:/Users/AMP/w-san313 && git diff --numstat cbf2db292f0643b9647017005c361a2e11da61c7~6 cbf2db292f0643b9647017005c361a2e11da61c7 -- mobile | awk '{print $1, $2, "C:/Users/AMP/w-san313/" $3}'; for f in bsan313_minhas_os_escopo_test bsan313_os_purga_reconcilia_test bsan313_home_lista_e1_test bsan313_retencao_ciclo2_test; do echo "C:/Users/AMP/w-san313/mobile/flutter_app/test/features/$f.dart $(tr -d '\r' < C:/Users/AMP/w-san313/mobile/flutter_app/test/features/$f.dart | grep -c -i -E '^\s*(test|testWidgets)\(')"; done; git diff cbf2db292f0643b9647017005c361a2e11da61c7~6 cbf2db292f0643b9647017005c361a2e11da61c7 -- '*bsan313_os_purga_reconcilia_test.dart' | grep -i -E '^-[^-]' | tr -d '\r'`
```
31 0 C:/Users/AMP/w-san313/mobile/flutter_app/lib/core/local_db/drift_work_order_local_store.dart
18 0 C:/Users/AMP/w-san313/mobile/flutter_app/lib/features/work_orders/data/work_order_local_store.dart
65 20 C:/Users/AMP/w-san313/mobile/flutter_app/lib/features/work_orders/data/work_order_repository.dart
119 1 C:/Users/AMP/w-san313/mobile/flutter_app/test/features/bsan313_os_purga_reconcilia_test.dart
493 0 C:/Users/AMP/w-san313/mobile/flutter_app/test/features/bsan313_retencao_ciclo2_test.dart
C:/Users/AMP/w-san313/mobile/flutter_app/test/features/bsan313_minhas_os_escopo_test.dart 6
C:/Users/AMP/w-san313/mobile/flutter_app/test/features/bsan313_os_purga_reconcilia_test.dart 21
C:/Users/AMP/w-san313/mobile/flutter_app/test/features/bsan313_home_lista_e1_test.dart 4
C:/Users/AMP/w-san313/mobile/flutter_app/test/features/bsan313_retencao_ciclo2_test.dart 9
-      final keys = entry.value.difference({'run_id'});
```

No repositório de OS do app, no objeto: o typedef do gancho externo (agora com dois argumentos), o conjunto `workOrderRunReferenceKeys`, os status de ação que retêm, a trava estática `_serialTail`, a chamada a `deleteWorkOrderUnlessPending` no `_reconcile`, o `remoteAuthModeProvider` e o `allowSeedOrders` lido dele; e a chave `run_id` não aparece mais no arquivo (a contagem); no store Drift, o `deleteWorkOrder` incondicional mantido e o `deleteWorkOrderUnlessPending` novo, ambos em `transaction`, com o `NOT EXISTS` sobre `work_order_materials` no predicado, medido por: `tr -d '\r' < C:/Users/AMP/w-san313/mobile/flutter_app/lib/features/work_orders/data/work_order_repository.dart | grep -n -i -E 'typedef WorkOrderExternalPendingWork|workOrderRunReferenceKeys =|_pendingActionStatuses =|static Future<void>\? _serialTail|deleteWorkOrderUnlessPending\(|final remoteAuthModeProvider|allowSeedOrders: !ref'; echo "linhas com run_id entre aspas: $(tr -d '\r' < C:/Users/AMP/w-san313/mobile/flutter_app/lib/features/work_orders/data/work_order_repository.dart | grep -c -i -E "'run_id'")"; tr -d '\r' < C:/Users/AMP/w-san313/mobile/flutter_app/lib/core/local_db/drift_work_order_local_store.dart | grep -n -i -E 'Future<void> deleteWorkOrder\(|deleteWorkOrderUnlessPending|transaction\(|NOT EXISTS'`
```
56:typedef WorkOrderExternalPendingWork =
73:const workOrderRunReferenceKeys = <String>{'local_run_id', 'server_run_id'};
112:const _pendingActionStatuses = <SyncStatus>{
166:  static Future<void>? _serialTail;
369:        await _localStore.deleteWorkOrderUnlessPending(row.localId);
1021:final remoteAuthModeProvider = Provider<bool>((_) => kIsRemoteAuth);
1045:    allowSeedOrders: !ref.watch(remoteAuthModeProvider),
linhas com run_id entre aspas: 0
189:  Future<void> deleteWorkOrder(String localId) async {
191:    await _db.transaction(() async {
215:  Future<bool> deleteWorkOrderUnlessPending(String localId) async {
217:    return _db.transaction(() async {
221:        'AND NOT EXISTS (SELECT 1 FROM work_order_materials '
```

Os produtores de ação de vistoria no app (o desvio 3 do dev: o plano dizia 7, são 6 sítios, todos em `checklist_repository.dart`, e `runCreate` não tem produtor), pela busca do git no worktree que está no objeto; e os 4 desvios declarados pelo dev, com a linha de cada um no relatório do dev (o `sed` põe o prefixo do worktree no caminho impresso; o texto do desvio sai cortado em 48 colunas), medido por: `git -C C:/Users/AMP/w-san313 grep -n -i -E 'type: ChecklistSyncActionTypes\.' -- mobile/flutter_app/lib | sed -e 's#^#C:/Users/AMP/w-san313/#'; echo "sítios: $(git -C C:/Users/AMP/w-san313 grep -n -i -E 'type: ChecklistSyncActionTypes\.' -- mobile/flutter_app/lib | wc -l) · runCreate como tipo de ação gravada: $(git -C C:/Users/AMP/w-san313 grep -n -i -E 'type: ChecklistSyncActionTypes\.runCreate' -- mobile/flutter_app/lib | wc -l)"; tr -d '\r' < C:/Users/AMP/w-san313/docs/revisoes/SAN3/B-SAN3-13-dev.md | grep -n -i -E '^### Desvios declarados|^[1-4]\. \*\*' | cut -c1-48`
```
C:/Users/AMP/w-san313/mobile/flutter_app/lib/features/checklists/data/checklist_repository.dart:513:      type: ChecklistSyncActionTypes.divergenceCreate,
C:/Users/AMP/w-san313/mobile/flutter_app/lib/features/checklists/data/checklist_repository.dart:555:      type: ChecklistSyncActionTypes.answerUpsert,
C:/Users/AMP/w-san313/mobile/flutter_app/lib/features/checklists/data/checklist_repository.dart:613:      type: ChecklistSyncActionTypes.runComplete,
C:/Users/AMP/w-san313/mobile/flutter_app/lib/features/checklists/data/checklist_repository.dart:690:      type: ChecklistSyncActionTypes.markerCreate,
C:/Users/AMP/w-san313/mobile/flutter_app/lib/features/checklists/data/checklist_repository.dart:736:      type: ChecklistSyncActionTypes.acknowledgementCreate,
C:/Users/AMP/w-san313/mobile/flutter_app/lib/features/checklists/data/checklist_repository.dart:817:      type: ChecklistSyncActionTypes.attachmentAttach,
sítios: 6 · runCreate como tipo de ação gravada: 0
283:### Desvios declarados do plano (nenhum muda
284:1. **Ajuste "2º argumento" em F21/F25/R10 n
285:2. **F28b:** como escrito (`addMarker` real)
286:3. **"7 produtores" → 6:** `runCreate` nã
287:4. **M-C2-02a** derrubou F28a-**e** (5), nã
```

Memória de commit livre em GB (a P8 (c) exige pelo menos 4 antes de lançar agente), os trabalhos Docker vivos fora da base `erp-*` (o teto é 2 contando o da cadeira) e o disco livre em `C:` (a ordem do orquestrador para este ciclo: PARE abaixo de 7 GB), no instante da redação: a cadeira mede de novo antes de subir, medido por: `powershell.exe -NoProfile -Command '$o=Get-CimInstance Win32_PerfFormattedData_PerfOS_Memory; [math]::Round(($o.CommitLimit-$o.CommittedBytes)/1GB,2)'; docker ps --format '{{.Names}}' | grep -v -i -E '^erp-' | sed -E 's#-(pg|redis|run|net)$##' | sort -u; echo "trabalhos fora de erp: $(docker ps --format '{{.Names}}' | grep -v -i -E '^erp-' | sed -E 's#-(pg|redis|run|net)$##' | sort -u | wc -l)"; df -h /c | tail -1 | awk '{print "livre em C: " $4}'`
```
13,46
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

Você é `jurado-san313-c2b-opus`, identidade NOVA que refaz a cadeira C2, a vermelha do ciclo 1 (§C7 item 9 (3)); executor Claude Code (subagente), modelo **Claude Opus**, nível menor DECLARADO (§C7.6); o seu corpo canônico é `C:/Users/AMP/w-san313/.claude/agents/especialistas/jurado-san313-c2-app-nunca-perde.md`, carregado **do blob do objeto** (o worktree está no objeto, medido acima). O corpo é o do ciclo 1 e diz "ciclo 1" (medido acima): onde ele divergir deste mandato quanto a ciclo, objeto, identidade, diretório de votos ou foco, vale este mandato. Na primeira linha de `c2b-evidencia.md`, declare executor efetivo, modelo, nível, objeto, `mandato_md5` deste arquivo (CR retirado antes do md5), `flutter --version`/`dart --version` e IDENTICO/DIVERGE do corpo carregado contra o blob, EOL-neutro. **Opus esgotado: PARE sem votar** e registre onde parou (§C7.6-bis). Inelegíveis por nome: `jurado-san313-c2-opus` (achou C2-01 a C2-04: quem achou não julga o conserto do próprio achado), `planejador-mestre`, `planejador-san313-fable`, `planejador-san313-c2-fable` (auditou a reprovação e planejou o conserto), `crit-san313-opus`, `crit-san313-opus-r2`, `crit-san313-argon`, `crit-san313-pro-r2`, `med-san313-argon`, `dev-san313-opus`, `dev-san313-c2-opus` (consertou), `fab-san313-opus`, `redator-san313-opus`, `redator-san313c2-opus` (este mandato), `inspetor-san313-opus`, as cadeiras Codex caídas `jurado-san313-c1-sol`, `jurado-san313-c2-sol` e `jurado-san313-c3-sol`, o orquestrador, `inspetor-san313c2-opus`, `jurado-san313-c1-opus` e `jurado-san313-c3-opus`; nome coincidente, pare. **Monocultura declarada:** o achador, o dev do ciclo 2 e você rodam em Claude Opus — toda conclusão sua sai de execução sua. A seção do ciclo 2 do plano (auditoria, RQ-1 a RQ-6, §C, §E, §F), o relatório do dev do ciclo 2 (as 12 mutações, a bateria, os 4 desvios) e a evidência da C2 do ciclo 1 são **A RE-VERIFICAR**: a evidência da C2 do ciclo 1 é roteiro de re-execução (P3), nunca conclusão herdada, derruba com: `head -1 C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13-ciclo2/c2b-evidencia.md | grep -i -E 'executor|Opus|mandato_md5|objeto|flutter|IDENTICO|DIVERGE'`

A legalidade vem antes do mérito: parecer `insp-san313c2-parecer.md` de `inspetor-san313c2-opus` com LIBERADO ou LIBERADO COM RESSALVA nomeando você, o seu executor e o seu worktree; objeto = head do PR 460 do ciclo 2 (medido acima), check-runs concluídos. Régua: DADO, **unanimidade de 3 com veto**, **ciclo 2**, o ÚLTIMO em que todo `bloqueia` `dentro-do-bloco` reprova, grave ou não (§C7 item 8(2)); a régua é a do ciclo corrente, focada nos achados e na regressão dos itens da C2 (§C7 item 9 (3)). Divergência registrada (§A2): o plano §9 dava CA-13/14/21/22 à C3; na composição do orquestrador eles são da C2, e a bateria Flutter inteira (`format`/`analyze`/suíte) é da C3. Todo achado com gravidade, classe, escopo, N e forma; `pre-existente` com evidência de origem e dono; um defeito que o conserto do ciclo 2 introduziu é `dentro-do-bloco`; "não consigo medir" = REPROVADO; não proponha correção, não reabra a E1 (*"Só as abertas"*), Q1–Q5 nem a decisão de desenho da C2-04 (a regra de fabricação), não cobre KPI nem matéria de C1/C3, não leia os votos e evidências das outras cadeiras deste ciclo; `arquivos_medidos` honesto (o que você lê para medir — sync, evidência, prestador, vistoria — entra; o glob `**` do app Flutter, sob o prefixo `mobile/flutter_app`, se rodou `flutter analyze` ou a suíte inteira), derruba com: `grep -i -E 'legalidade|A RE-VERIFICAR|gravidade|classe|escopo|arquivos_medidos|monocultura|ciclo 2' C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13-ciclo2/c2b-voto.json`

Terreno: worktree exclusivo `C:/Users/AMP/j13c2-c2-wt`, detached no objeto, `flutter pub get` próprio, zero junction, removido só por `git worktree remove --force` depois de conferir processos = 0. **Esta cadeira não sobe Postgres nem Redis**: o "banco" é o Drift dos testes (em memória) e, em sonda sua, SQLite em `C:/Users/AMP/erp-pausa-2026-10-03/j13c2-c2/j13c2-c2-*.sqlite`, apagado no fim; nenhum container, nenhuma API remota, nenhum aparelho real. Antes de lançar: memória de commit livre ≥ 4 GB (P8 (c)), disco ≥ 7 GB (abaixo disso, PARE e registre); uma cadeira por vez (ordem do dono). Nunca `erp-*`, nunca os caminhos do ciclo 1 (`C:/Users/AMP/erp-pausa-2026-10-03/j13-c2/` e `C:/Users/AMP/erp-pausa-2026-10-03/j13-plan-c2/` são só leitura: você COPIA as sondas para a sua pasta). Mutação só no seu worktree, uma por vez, âncora única com prova (CRLF incluso), mutante que compila (`flutter analyze` do arquivo) e caso irmão verde, restauro provado por `git hash-object` = blob; o vermelho-controle no objeto do ciclo 1, `<objeto>~6` (medido acima: é onde o defeito existe), por `git checkout cbf2db292f0643b9647017005c361a2e11da61c7~6 -- mobile/flutter_app/lib` no seu worktree, restaurado e provado; sondas `test/features/zz_j13c2b_*` criadas, rodadas e apagadas; scripts numa pasta sua `C:/Users/AMP/erp-pausa-2026-10-03/j13c2-c2/`, derruba com: `grep -i -E 'j13c2-c2-wt|j13c2-c2|zz_j13c2b|sqlite|junction|commit livre|7 GB|hash-object|objeto do ciclo 1|flutter analyze|teardown' C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13-ciclo2/c2b-evidencia.md`

Item 1 de 3 (C2-01 e C2-02, por execução — RQ-1, RQ-2, RQ-5): copie a sonda da C2 do ciclo 1 e a do planejador para a sua pasta, adapte ao gancho de dois argumentos (o ajuste declarado do plano, 1 linha) e rode S3′ (escritor de material na janela entre o ramo 5 e o apagar) e S2′ (`saveAnswer` real com o run `synced`) com a expectativa invertida, no objeto e no objeto do ciclo 1: no objeto, a OS fica e `materiais_de_w=1`, a ação fica na fila, e com tudo `synced` a OS e as filhas saem; no objeto do ciclo 1, `materiais_de_w=0` e `OS_restantes=[]`. Rode F28a a F28e e F29 a F31, e meça você mesmo a propriedade do R8″ (material pendente nunca apagado: escritor ANTES, DURANTE e DEPOIS da transação, N ≥ 10 em cada, com a frequência) e a do predicado atômico (o `NOT EXISTS` e a linha `pending` no MESMO `DELETE`, nenhum `await` entre decisão e apagar). Execute M-C2-01a, M-C2-01b, M-C2-01c, M-C2-01d, M-C2-02a, M-C2-02b, M-C2-02c e M-C2-02d, cada uma vermelha pela asserção e restaurada; julgue os desvios 2 (o F28b com duas OS) e 4 (a M-C2-02a derruba F28a a F28e): o F28b mede a propriedade ou só a mutação?; e uma mutação SUA que ninguém listou. Vermelho-controle: S3′ e S2′ vermelhos pela asserção no objeto do ciclo 1, derruba com: `grep -i -E 'Item 1|C2-01|C2-02|S3|S2|materiais_de_w|OS_restantes|F28|F29|F30|F31|R8|ANTES|DURANTE|DEPOIS|NOT EXISTS|M-C2-01|M-C2-02|desvio 2|desvio 4|mutação própria|objeto do ciclo 1|vermelho' C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13-ciclo2/c2b-evidencia.md`

Item 2 de 3 (C2-03 e o resto dos desvios — RQ-3, RQ-2 F24): rode F32 a F35 e execute as mutações J1 (`_pendingActionStatuses` sem `syncing`), J2 (`_serial` sem `try/finally`), J5 (`allowSeedOrders: true` cravado) e J6 (API sem caminhada = `complete: true`), cada uma vermelha pela asserção (J2 por `timeout`, nunca suíte travada) e restaurada; o `remoteAuthModeProvider` lido pelos dois providers e o F34 provando a semente fora com o modo remoto e dentro sem ele; o F24 reforçado (toda chave do mapa tem leitor; `run_id` fora, medido acima) e a M-C2-02c. Julgue os desvios 1 (F21, F25 e R10 sem nenhuma linha mudada, pelo diff do arquivo de teste do ciclo 1, medido acima: uma linha removida, a do F24) e 3 (6 sítios produtores, não 7, medido acima: o F24 conta os sítios em vez de cravar o número — afirma a propriedade ou só a forma?). Vermelho-controle: cada mutação J vermelha pela asserção no objeto; o F24 reforçado vermelho no objeto do ciclo 1 pela chave `run_id`, derruba com: `grep -i -E 'Item 2|C2-03|F32|F33|F34|F35|J1|J2|J5|J6|syncing|try/finally|timeout|remoteAuthModeProvider|allowSeedOrders|F24|run_id|desvio 1|desvio 3|F21|F25|R10|sítios|vermelho' C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13-ciclo2/c2b-evidencia.md`

Item 3 de 3 (regressão dos itens da C2 do ciclo 1, no objeto — CA-13, CA-14, CA-15, CA-16, CA-17, CA-18, CA-19, CA-20, CA-21, CA-22, CA-23, CA-24): a matriz S1 gerada por script (cada constante de `*SyncActionTypes` × cada `SyncStatus` × a chave do produtor, com N e o fica/sai; o ciclo 1 mediu N=781, e o N do objeto pode mudar com as chaves novas: explique a diferença); a trava S5a, S5b e S5c; o F16 e a regra de fabricação S4 sem mudança (C2-04 é nota de desenho: a semente sai, inclusive a 3ª `pending`; registre se a `P-MOBILE-ORFAOS-POS-PURGA` nomeia o que você mede); S6 (503), S8 (a query `scope=assigned`, `openOnly=true`, `paginate=cursor`, `limit=100`, cursor igual, sem `offset`) e S8b (incompleta não purga); a busca sem `clearAll`, DELETE em massa, `offset` ou `isFinal` no caminho de purga; os vizinhos `b099`, `b103`, `b115`, `b126`, `home_screen_test` e `b084` verdes. Vermelho-controle: a FM16 do ciclo 1 (trava sem `_serial`) deixa vermelha a sua sonda de duas instâncias no objeto, derruba com: `grep -i -E 'Item 3|CA-13|CA-24|matriz|S1|N=|S4|S5|S6|S8|F16|fabrica|semente|P-MOBILE-ORFAOS-POS-PURGA|clearAll|offset|isFinal|b099|b115|b126|b084|FM16|vermelho' C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13-ciclo2/c2b-evidencia.md`

Protocolo P1/P2/P3/P4/P7 do §C7.7, verbatim no bloco colado acima, com `<cadeira>` = `c2b`: evidência em `c2b-evidencia.md` após CADA item; `c2b-voto.json` nasce esqueleto com os três itens EM APURAÇÃO e `arquivos_medidos`, cada item gravado ao ser medido, e fecha antes da mensagem final de 1 linha; sucessor de identidade nova re-executa os comandos registrados e só então mede a cauda; três itens exatos; PAUSA grava head, feito, falta, próximo comando e arquivos meio-escritos (inclusive uma mutação não restaurada) e para. Queda em `00-quedas.md` do diretório deste ciclo (P6, pelo orquestrador); uma cadeira por vez. Únicos outputs no repositório: `c2b-evidencia.md` e `c2b-voto.json` em `C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13-ciclo2/`; o diretório do ciclo 1 é só leitura; nunca commit, derruba com: `test -f C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13-ciclo2/c2b-voto.json`

## MEDIDO

Pré-voo deste mandato com as ferramentas copiadas sem mudança para a pasta do redator `C:/Users/AMP/erp-pausa-2026-10-03/redator-san313c2/` (diferença contra o ramo das ferramentas medida acima), executado com o cwd no worktree do objeto; o redator é `redator-san313c2-opus` (Claude Opus 5.5, nível menor declarado, identidade nova), que adaptou ao ciclo 2 os mandatos do ciclo 1 (conteúdo de `fab-san313-opus`, forma de `redator-san313-opus`) pelo plano de resolução do ciclo 2 e executou cada comando deste mandato pelo gerador `C:/Users/AMP/erp-pausa-2026-10-03/redator-san313c2/gerar-c2b.sh`, medido por: `cd C:/Users/AMP/w-san313 && MANDATO_REFS=C:/Users/AMP/erp-pausa-2026-10-03/redator-san313c2/mandato-refs.sh bash C:/Users/AMP/erp-pausa-2026-10-03/redator-san313c2/mandato-preflight.sh C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13-ciclo2/00-mandatos/cadeira-c2b.md 460 2>&1; echo ec=$?`
```
COLAGEM    l.6-20: refs do PR #460 confere com a saida atual

PRE-VOO OK — C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13-ciclo2/00-mandatos/cadeira-c2b.md
ec=0
```
