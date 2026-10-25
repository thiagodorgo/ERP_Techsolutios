# Mandato — Inspetor de terreno — B-SAN3-13 ciclo 2 (junta de DADO)

## MEDIDO

Estado do PR 460 no instante da redação do ciclo 2, pela ferramenta `mandato-refs.sh` copiada sem mudança para a pasta própria do redator `C:/Users/AMP/erp-pausa-2026-10-03/redator-san313c2/`, com o cwd no worktree do objeto (ec 0: o head do PR, a merge-base, 14 check-runs, nenhum não verde, e nenhuma ata ainda), medido por: `cd C:/Users/AMP/w-san313 && bash C:/Users/AMP/erp-pausa-2026-10-03/redator-san313c2/mandato-refs.sh 460`
```
# refs do PR #460 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato
# gerado em: 2026-10-25T20:17Z · repo: thiagodorgo/ERP_Techsolutios

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

Os três corpos das cadeiras no objeto são IDÊNTICOS entre os dois espelhos descontado o bloco Codex (EOL-neutro), e o S0 (`sync-agent-agents.mjs --check`) passa num worktree descartável no objeto, `C:/Users/AMP/j13c2-insp-s0`, criado e removido pelo próprio comando (a última linha confirma a remoção), medido por: `cd C:/Users/AMP/w-san313 && for c in c1-escopo-e-cursor c2-app-nunca-perde c3-regressao-escopo-registro; do diff <(tr -d '\r' < C:/Users/AMP/w-san313/.claude/agents/especialistas/jurado-san313-$c.md | awk 'f; $0=="---"{n++; if(n==2) f=1}' | sed '/^$/d') <(tr -d '\r' < C:/Users/AMP/w-san313/.agents/agents/especialistas/jurado-san313-$c.md | awk 'f; $0=="---"{n++; if(n==2) f=1}' | awk 'index($0,"Papel para o Codex"){s=1} s&&$0==""{s=0; next} !s' | sed '/^$/d') >/dev/null && echo "IDENTICO corpo $c" || echo "DIVERGE corpo $c"; done; git worktree add --detach C:/Users/AMP/j13c2-insp-s0 cbf2db292f0643b9647017005c361a2e11da61c7 >/dev/null 2>&1; node C:/Users/AMP/j13c2-insp-s0/scripts/sync-agent-agents.mjs --check; echo "sync ec=$?"; git worktree remove --force C:/Users/AMP/j13c2-insp-s0; test -d C:/Users/AMP/j13c2-insp-s0 && echo 'worktree S0 FICOU' || echo 'worktree S0 removido'`
```
IDENTICO corpo c1-escopo-e-cursor
IDENTICO corpo c2-app-nunca-perde
IDENTICO corpo c3-regressao-escopo-registro
[agents-sync] OK — 85 agentes, espelho consistente.
sync ec=0
worktree S0 removido
```

O corpo do inspetor de terreno fixa `model: opus` no frontmatter nos dois espelhos, no objeto, medido por: `for f in C:/Users/AMP/w-san313/.claude/agents/inspetor-de-terreno-da-junta.md C:/Users/AMP/w-san313/.agents/agents/inspetor-de-terreno-da-junta.md; do echo "$f $(tr -d '\r' < $f | grep -i -E '^model:')"; done`
```
C:/Users/AMP/w-san313/.claude/agents/inspetor-de-terreno-da-junta.md model: opus
C:/Users/AMP/w-san313/.agents/agents/inspetor-de-terreno-da-junta.md model: opus
```

Os insumos do briefing do ciclo 2: no objeto, a seção do ciclo 2 do plano (com a auditoria §A, os requisitos §B, o escopo §C e as cadeiras §F) e a seção do ciclo 2 do relatório do dev (com os desvios declarados); fora do objeto, não rastreados, o registro da reprovação do ciclo 1 e, no diretório de votos do ciclo 1, a tabela de quedas, o voto e a evidência da C2 que reprovou e o parecer do inspetor do ciclo 1 (linha e começo de cada seção; contagem de linhas de cada arquivo), medido por: `tr -d '\r' < C:/Users/AMP/w-san313/docs/revisoes/SAN3/B-SAN3-13-plano.md | grep -n -i -o -E '^## Ciclo 2[^(]{0,30}|^### [A-H]\. [^(]{0,40}'; tr -d '\r' < C:/Users/AMP/w-san313/docs/revisoes/SAN3/B-SAN3-13-dev.md | grep -n -i -o -E '^## Ciclo 2.{0,30}|^### Desvios declarados[^(]{0,20}'; for f in C:/Users/AMP/w-san313/agent-orchestration/omega/reprovacoes/R-B-SAN3-13-ciclo1.md C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13/00-quedas.md C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13/c2-voto.json C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13/c2-evidencia.md C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13/insp-san313-parecer.md; do echo "$f $(wc -l < $f)"; done`
```
457:## Ciclo 2 — plano de resolução
464:### A. Auditoria da reprovação — defeito re
484:### B. Requisitos do conserto
513:### C. Escopo do conserto
528:### D. Baseline N e meta M do ciclo 2
532:### E. Ordem do dev
542:### F. Cadeiras — o que carrega, revalida ou
549:### G. Perguntas ao dono: **nenhuma.**
552:### H. Riscos do conserto
235:## Ciclo 2 (dev-san313-c2-opus)
283:### Desvios declarados do plano
C:/Users/AMP/w-san313/agent-orchestration/omega/reprovacoes/R-B-SAN3-13-ciclo1.md 13
C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13/00-quedas.md 8
C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13/c2-voto.json 40
C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13/c2-evidencia.md 84
C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13/insp-san313-parecer.md 78
```

O que cada cadeira faz neste ciclo pela regra da cadeira vermelha (§C7 item 9): no diretório de votos do ciclo 1 só existe voto da C2 (a vermelha, que é REFEITA por identidade nova), e não existe arquivo `c1-*` nem `c3-*` (as cadeiras Codex caíram antes de medir; os esqueletos estão como `caido-sol-*`): a C1 e a C3 votam pela primeira vez, no objeto do ciclo 2, e não há voto a carregar nem a revalidar, medido por: `for p in c1 c2 c3; do echo "$p: votos=$(ls C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13 | grep -c -i -E "^$p-voto") evidencias=$(ls C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13 | grep -c -i -E "^$p-evidencia") caidos=$(ls C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13 | grep -c -i -E "^caido-sol-$p-")"; done`
```
c1: votos=0 evidencias=0 caidos=0
c2: votos=1 evidencias=1 caidos=2
c3: votos=0 evidencias=0 caidos=2
```

Os critérios de aceite do plano são CA-1 a CA-25 (a lista abaixo, gerada do plano), e cada um aparece nos itens de exatamente uma das três cadeiras deste ciclo (a contagem por cadeira e a união, geradas das linhas `Item` dos três mandatos deste diretório): CA-1 a CA-11 na C1, CA-13 a CA-24 na C2 refeita, CA-12 e CA-25 na C3, medido por: `tr -d '\r' < C:/Users/AMP/w-san313/docs/revisoes/SAN3/B-SAN3-13-plano.md | grep -o -i -E '\bCA-[0-9]+\b' | sort -t- -k2,2n -u | tr '\n' ' '; echo; for c in c1 c2b c3; do echo "$c: $(grep -i -E '^Item [0-9] de 3' C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13-ciclo2/00-mandatos/cadeira-$c.md | grep -o -i -E '\bCA-[0-9]+\b' | sort -t- -k2,2n -u | tr '\n' ' ')"; done; echo "união: $(grep -h -i -E '^Item [0-9] de 3' C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13-ciclo2/00-mandatos/cadeira-c1.md C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13-ciclo2/00-mandatos/cadeira-c2b.md C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13-ciclo2/00-mandatos/cadeira-c3.md | grep -o -i -E '\bCA-[0-9]+\b' | sort -u | wc -l) distintos; repetidos entre cadeiras: $(for c in c1 c2b c3; do grep -i -E '^Item [0-9] de 3' C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13-ciclo2/00-mandatos/cadeira-$c.md | grep -o -i -E '\bCA-[0-9]+\b' | sort -u; done | sort | uniq -d | wc -l)"`
```
CA-1 CA-2 CA-3 CA-4 CA-5 CA-6 CA-7 CA-8 CA-9 CA-10 CA-11 CA-12 CA-13 CA-14 CA-15 CA-16 CA-17 CA-18 CA-19 CA-20 CA-21 CA-22 CA-23 CA-24 CA-25
c1: CA-1 CA-2 CA-3 CA-4 CA-5 CA-6 CA-7 CA-8 CA-9 CA-10 CA-11
c2b: CA-13 CA-14 CA-15 CA-16 CA-17 CA-18 CA-19 CA-20 CA-21 CA-22 CA-23 CA-24
c3: CA-12 CA-25
união: 25 distintos; repetidos entre cadeiras: 0
```

O delta do conserto contra a lista esperada do §F do plano do ciclo 2, pelo nome do arquivo: 0 caminho fora (o §F manda o inspetor bloquear caminho fora dela); a lista dos caminhos está na unidade do delta, acima, medido por: `cd C:/Users/AMP/w-san313 && echo "fora da lista esperada: $(git diff --name-only cbf2db292f0643b9647017005c361a2e11da61c7~6 cbf2db292f0643b9647017005c361a2e11da61c7 | grep -c -v -i -E '(work_order_repository|work_order_local_store|drift_work_order_local_store)\.dart$|bsan313_[a-z0-9_]*_test\.dart$|B-SAN3-13-(plano|dev)\.md$|pendencias(-indice)?\.md$')"; tr -d '\r' < C:/Users/AMP/w-san313/docs/revisoes/SAN3/B-SAN3-13-plano.md | grep -n -i -o -E 'Qualquer caminho fora disto = escopo violado \(o inspetor bloqueia\)'`
```
fora da lista esperada: 0
543:Qualquer caminho fora disto = escopo violado (o inspetor bloqueia)
```

Identidades que planejaram, criticaram, mediram, desenvolveram, acharam e fabricaram neste bloco, GERADAS dos arquivos de registro do diff do bloco (do head-base `<objeto>~19` ao objeto, lidos no disco do worktree no objeto) e do registro da reprovação do ciclo 1 (piso da inelegibilidade, não teto): o ciclo 2 acrescenta `planejador-san313-c2-fable`, `dev-san313-c2-opus` e `jurado-san313-c2-opus`; `dev-san313-pg` é nome de container e `insp-san313-parecer` é nome de arquivo, medido por: `cd C:/Users/AMP/w-san313 && for f in $(git diff --name-only cbf2db292f0643b9647017005c361a2e11da61c7~19 cbf2db292f0643b9647017005c361a2e11da61c7 -- docs/revisoes/SAN3 agent-orchestration .claude .agents) C:/Users/AMP/w-san313/agent-orchestration/omega/reprovacoes/R-B-SAN3-13-ciclo1.md; do tr -d '\r' < "$f"; done | grep -o -i -E '\b(planejador|crit|critico|dev|rev|fab|fabrica|inspetor|insp|redator|jurado|argon|med|medidor)-san3?-?13[a-z0-9-]*|planejador-mestre' | sed -E 's#-+$##' | sort -u`
```
PLANEJADOR-MESTRE
crit-san313-argon
crit-san313-opus
crit-san313-opus-r2
crit-san313-pro-r2
dev-san313
dev-san313-c2-opus
dev-san313-opus
dev-san313-pg
fab-san313-opus
insp-san313-parecer
jurado-san313
jurado-san313-c1-escopo-e-cursor
jurado-san313-c2-app-nunca-perde
jurado-san313-c2-opus
jurado-san313-c3-regressao-escopo-registro
med-san313-argon
planejador-mestre
planejador-san313-c2-fable
planejador-san313-fable
```

As quatro identidades desta junta e a do redator destes mandatos não aparecem em arquivo rastreado nenhum do objeto (contagem de arquivos rastreados que as citam, pela busca do git no worktree que está no objeto), medido por: `git -C C:/Users/AMP/w-san313 grep -l -i -E 'inspetor-san313c2-opus|jurado-san313-c1-opus|jurado-san313-c2b-opus|jurado-san313-c3-opus|redator-san313c2-opus' | wc -l`
```
0
```

Resíduo que ocupe nome, porta ou caminho desta junta no instante da redação: nenhum container com `san313` ou `j13` no nome (vivo ou parado), nenhum caminho `C:/Users/AMP/j13*`, o único worktree registrado com esses radicais é o do objeto, e as pastas do ciclo 1 que ficam como roteiro P3 (as sondas da C2 e a do planejador) são as listadas, medido por: `echo "containers san313/j13: $(docker ps -a --format '{{.Names}}' | grep -c -i -E 'san313|j13')"; echo "caminhos j13: $(ls -d C:/Users/AMP/j13* 2>/dev/null | wc -l)"; git -C C:/Users/AMP/Documents/GitHub/ERP_Techsolutios worktree list --porcelain | grep -i -E '^worktree .*(j13|san313)'; ls -d C:/Users/AMP/erp-pausa-2026-10-03/j13* 2>/dev/null`
```
containers san313/j13: 0
caminhos j13: 0
worktree C:/Users/AMP/w-san313
C:/Users/AMP/erp-pausa-2026-10-03/j13-c2
C:/Users/AMP/erp-pausa-2026-10-03/j13-plan-c2
```

Memória de commit livre em GB (a P8 (c) exige pelo menos 4 antes de lançar agente), os trabalhos Docker vivos fora da base `erp-*` (o teto é 2 contando o da cadeira) e o disco livre em `C:` (a ordem do orquestrador para este ciclo: PARE abaixo de 7 GB), no instante da redação: a cadeira mede de novo antes de subir, medido por: `powershell.exe -NoProfile -Command '$o=Get-CimInstance Win32_PerfFormattedData_PerfOS_Memory; [math]::Round(($o.CommitLimit-$o.CommittedBytes)/1GB,2)'; docker ps --format '{{.Names}}' | grep -v -i -E '^erp-' | sed -E 's#-(pg|redis|run|net)$##' | sort -u; echo "trabalhos fora de erp: $(docker ps --format '{{.Names}}' | grep -v -i -E '^erp-' | sed -E 's#-(pg|redis|run|net)$##' | sort -u | wc -l)"; df -h /c | tail -1 | awk '{print "livre em C: " $4}'`
```
13,61
trabalhos fora de erp: 0
livre em C: 10G
```

O orçamento da P8 (c) no contrato do objeto: memória de commit livre de pelo menos 4 GB e Docker com teto de 2 trabalhos (linha e trecho), medido por: `tr -d '\r' < C:/Users/AMP/w-san313/CLAUDE.md | grep -n -i -o -E 'memória de commit livre ≥ 4 GB|Docker segue com teto de 2 trabalhos'`
```
723:memória de commit livre ≥ 4 GB
724:Docker segue com teto de 2 trabalhos
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

Você é `inspetor-san313c2-opus` (identidade nova; o orquestrador confirma no disparo), executor Claude Code (subagente), modelo **Claude Opus**, nível menor DECLARADO (o `model: opus` do frontmatter de `inspetor-de-terreno-da-junta`, medido acima, §C7.6), corpo carregado do blob do objeto (`C:/Users/AMP/w-san313/.claude/agents/inspetor-de-terreno-da-junta.md`, no worktree que está no objeto, medido acima). **Opus esgotado: PARE** e registre onde parou (§C7.6-bis). Declare executor efetivo, modelo, nível, objeto, `mandato_md5` deste arquivo (CR retirado antes do md5) e IDENTICO/DIVERGE do seu corpo carregado contra o blob, EOL-neutro, na primeira linha de `insp-san313c2-evidencia.md`. Você não vota nem julga mérito: julga se o tabuleiro está limpo (§C7.1-bis), fail-closed. A seção do ciclo 2 do plano, o relatório do dev do ciclo 2, o registro da reprovação, o parecer do inspetor do ciclo 1 e os mandatos das cadeiras são **A RE-VERIFICAR**. Régua da junta que você libera: bloco de DADO (o app apaga linhas de OS do aparelho) e de permissão (escopo da lista), **unanimidade de 3 com veto** (§C7 item 8(1)); **ciclo 2**, o ÚLTIMO em que todo `bloqueia` `dentro-do-bloco` reprova (§C7 item 8(2)); os votos declaram `arquivos_medidos` (§C7 item 9 (0)) e a ata registra, por cadeira, carregado, revalidado ou refeito com o comando que o prova (§C7 item 9 (4)), derruba com: `head -1 C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13-ciclo2/insp-san313c2-evidencia.md | grep -i -E 'executor|Opus|mandato_md5|objeto|IDENTICO|DIVERGE'`

Item 1 de 3 (objeto, CI, delta do conserto, mandatos, corpos, S0): resolva o objeto por `git ls-remote origin refs/heads/fix/mobile-minhas-os` e por `gh pr view 460 --json headRefOid`; confira que o objeto do ciclo 1 é `<objeto>~6` e que o delta do conserto (os 6 commits, medidos acima) fica dentro da lista esperada do §F do plano do ciclo 2 (medido acima pelo nome: 0 fora; meça por caminho completo) e não toca `src` nem `tests` (caminho fora = escopo violado, bloqueia); todos os check-runs concluídos e verdes no SHA, nos dois gatilhos (ausência, `queued` ou `cancelled` bloqueia o start); rode o pré-voo dos quatro mandatos deste diretório até `PRE-VOO OK` com as ferramentas da pasta `C:/Users/AMP/erp-pausa-2026-10-03/redator-san313c2/` (o `RAIZ` dela aponta para um worktree que não existe mais, medido acima: por isso os caminhos dos mandatos são absolutos, e a existência de cada um é sua a conferir), e confira que toda unidade de MEDIDO tem a saída do comando colada (unidade sem saída bloqueia); confira no objeto, EOL-neutro e descontado o bloco Codex, os três corpos nos dois espelhos, que o ciclo 2 não mexeu em corpo (medido acima) e que o corpo que cada cadeira carregar é o blob do objeto; reexecute o S0 (`sync-agent-agents.mjs --check`) num worktree descartável seu no objeto. Head que andou depois do disparo bloqueia até novo pré-voo, derruba com: `grep -i -E 'Item 1|check-runs|delta|§F|fora|PRE-VOO|sem saída|corpos|espelho|S0|LIBERADO|BLOQUEADO' C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13-ciclo2/insp-san313c2-parecer.md`

Item 2 de 3 (identidades, papéis, cadeira vermelha, composição, briefing): regenere por comando seu a lista de inelegíveis (a medida acima é piso) e confira por nome que nenhuma das quatro identidades desta junta (`inspetor-san313c2-opus`, `jurado-san313-c1-opus`, `jurado-san313-c2b-opus`, `jurado-san313-c3-opus`) coincide com `planejador-mestre`, `planejador-san313-fable`, `planejador-san313-c2-fable` (auditou a reprovação e planejou o conserto), `crit-san313-opus`, `crit-san313-opus-r2`, `crit-san313-argon`, `crit-san313-pro-r2`, `med-san313-argon`, `dev-san313-opus`, `dev-san313-c2-opus` (consertou), `fab-san313-opus`, `redator-san313-opus`, `redator-san313c2-opus` (adaptou estes mandatos e executou as medições), `inspetor-san313-opus` (inspetor do ciclo 1), `jurado-san313-c2-opus` (achou C2-01 a C2-04), as cadeiras Codex caídas `jurado-san313-c1-sol`, `jurado-san313-c2-sol` e `jurado-san313-c3-sol`, e o orquestrador, nem entre si. Separação de papéis do §C7.4-bis por nome: quem achou (`jurado-san313-c2-opus`) ≠ quem auditou e planejou (`planejador-san313-c2-fable`, topo em Fable, `D-TOPO-NO-PLANO-E-EM-TODA-REPROVACAO`) ≠ quem desenvolveu (`dev-san313-c2-opus`, que cobriu o Codex Sol nomeado pelo plano, declarado no relatório do dev) ≠ quem julga. Regra da cadeira vermelha (§C7 item 9), medida acima: a C2 é REFEITA por `jurado-san313-c2b-opus`; a C1 e a C3 não têm voto do ciclo 1 (votam pela primeira vez, no objeto do ciclo 2), logo nada se carrega nem se revalida; confirme isso por comando seu e registre-o para a ata. Declare a MONOCULTURA (as quatro identidades rodam em Claude Opus, o mesmo modelo do achador e do dev do ciclo 2) e diga se a composição cumpre o §9 do plano ("nunca três cadeiras Gemini", "pelo menos uma não-Gemini"). Confira, critério por critério, que **todo** CA-1..CA-25 do §6 (a distribuição medida acima é piso) e **todo** achado C2-01 a C2-04 e **todo** desvio declarado pelo dev têm cadeira dona em algum mandato (CA, achado ou desvio sem dono bloqueia o start). Confira a PRESENÇA no briefing (medida acima): a seção do ciclo 2 do plano, a seção do ciclo 2 do relatório do dev, o registro da reprovação, a evidência e o voto da C2 do ciclo 1 como roteiro P3 da C2 refeita, e, em cada mandato de cadeira, as divergências registradas. Coincidência de identidade, papel acumulado, item sem dono ou briefing incompleto bloqueia, derruba com: `grep -i -E 'Item 2|ineleg|planejador-san313-c2-fable|dev-san313-c2-opus|jurado-san313-c2-opus|redator-san313c2-opus|inspetor-san313-opus|-sol|4-bis|refeit|carregad|revalidad|primeira|monocultura|CA-1|CA-25|C2-01|C2-04|desvio|sem dono|briefing' C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13-ciclo2/insp-san313c2-parecer.md`

Item 3 de 3 (terreno): confira a árvore `C:/Users/AMP/w-san313` no objeto e sem mutação viva, admitindo como não rastreados só o diretório de votos do ciclo 1, o registro da reprovação e o diretório deste ciclo (e os que o orquestrador declarar); exija worktree próprio por cadeira (`C:/Users/AMP/j13c2-c1-wt`, `C:/Users/AMP/j13c2-c2-wt`, `C:/Users/AMP/j13c2-c3-wt`), `npm ci`/`flutter pub get` próprios e zero junction de `node_modules` (§C7.1-ter(c)); Postgres e Redis DESCARTÁVEIS por cadeira que os usa — C1 (`j13c2-c1-pg`, `j13c2-c1-redis`) e C3 (`j13c2-c3-pg`, `j13c2-c3-redis`), só em `127.0.0.1`, portas altas testadas fora das faixas reservadas do Windows; a C2 refeita não sobe banco (Drift em memória e SQLite na pasta dela) — e qualquer resíduo (no instante da redação, medido acima) reportado, nunca varrido; as pastas do ciclo 1 com as sondas da C2 e do planejador são roteiro P3 e ficam. Antes de cada lançamento e de cada subida: memória de commit livre ≥ 4 GB (P8 (c)), no máximo 2 trabalhos Docker na máquina contando o da cadeira (excluídos os `erp-*`), disco ≥ 7 GB (ordem do orquestrador: abaixo disso, PARE); base viva e as portas 5432, 6379, 3000, 5173, 5050, 8899, 55432 proibidas. Declare baseline honesto do terreno, plano de perda de jurado (P3, sucessor de identidade nova; Opus esgotado = PARA, §C7.6-bis) e a ORDEM de disparo: **uma cadeira por vez** (ordem do dono, mais estreita que a P5); proposta do redator, a julgar: C2 refeita primeiro (é a vermelha e não sobe Docker), depois C1, depois C3, cada uma derrubando os containers dela antes da seguinte, derruba com: `grep -i -E 'Item 3|j13c2-c1-wt|j13c2-c2-wt|j13c2-c3-wt|j13c2-c1-pg|j13c2-c3-pg|junction|erp-|commit livre|4 GB|7 GB|5432|6379|P3|P5|P8|baseline|ordem|uma cadeira por vez|resíduo|roteiro' C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13-ciclo2/insp-san313c2-parecer.md`

Protocolo P1/P2/P3/P4/P7 do §C7.7, verbatim no bloco colado acima, com `<cadeira>` = `insp-san313c2` e o parecer no lugar do voto: evidência em `insp-san313c2-evidencia.md` após CADA item; `insp-san313c2-parecer.md` nasce esqueleto com os três itens EM APURAÇÃO e fecha (LIBERADO, LIBERADO COM RESSALVA ou BLOQUEADO) antes da mensagem final de 1 linha; sucessor re-executa os comandos registrados; três itens exatos; PAUSA grava estado e para; queda em `00-quedas.md` do diretório deste ciclo (P6, pelo orquestrador). Únicos outputs: `insp-san313c2-evidencia.md` e `insp-san313c2-parecer.md` em `C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13-ciclo2/`; o diretório do ciclo 1 é só leitura; nunca commit, derruba com: `test -f C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13-ciclo2/insp-san313c2-parecer.md`

## MEDIDO

Pré-voo deste mandato com as ferramentas copiadas sem mudança para a pasta do redator `C:/Users/AMP/erp-pausa-2026-10-03/redator-san313c2/` (diferença contra o ramo das ferramentas medida acima), executado com o cwd no worktree do objeto; o redator é `redator-san313c2-opus` (Claude Opus 5.5, nível menor declarado, identidade nova), que adaptou ao ciclo 2 os mandatos do ciclo 1 (conteúdo de `fab-san313-opus`, forma de `redator-san313-opus`) pelo plano de resolução do ciclo 2 e executou cada comando deste mandato pelo gerador `C:/Users/AMP/erp-pausa-2026-10-03/redator-san313c2/gerar-i.sh`, medido por: `cd C:/Users/AMP/w-san313 && MANDATO_REFS=C:/Users/AMP/erp-pausa-2026-10-03/redator-san313c2/mandato-refs.sh bash C:/Users/AMP/erp-pausa-2026-10-03/redator-san313c2/mandato-preflight.sh C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13-ciclo2/00-mandatos/inspetor-san313c2.md 460 2>&1; echo ec=$?`
```
COLAGEM    l.6-20: refs do PR #460 confere com a saida atual

PRE-VOO OK — C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13-ciclo2/00-mandatos/inspetor-san313c2.md
ec=0
```
