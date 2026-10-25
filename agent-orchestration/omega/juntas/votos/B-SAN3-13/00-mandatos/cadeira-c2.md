# Mandato — Cadeira C2 — B-SAN3-13 ciclo 1 (junta de DADO)

## MEDIDO

Estado do PR 460 no instante da redação, pela ferramenta `mandato-refs.sh` copiada sem mudança para a pasta própria do redator `C:/Users/AMP/erp-pausa-2026-10-03/redator-san313/`, com o cwd no worktree do objeto (ec 0: o head do PR, a merge-base, 14 check-runs, nenhum não verde, e nenhuma ata ainda), medido por: `cd C:/Users/AMP/w-san313 && bash C:/Users/AMP/erp-pausa-2026-10-03/redator-san313/mandato-refs.sh 460`
```
# refs do PR #460 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato
# gerado em: 2026-10-25T18:34Z · repo: thiagodorgo/ERP_Techsolutios

ramo:            fix/mobile-minhas-os
base:            origin/main
estado:          OPEN | rascunho=false | MERGEABLE
head do PR:      ed4e229e951b4e5d4e425cbc57f1f4ac8059ce0d
merge-base:      b08c755719a6cb0ed192fa04e549ac5fc67a3e67
merge commit:    <ainda nao mergeado>
check-runs:      total=14 nao-verdes=0 pendentes=0
approved_head:   AUSENTE — nenhuma ata nomeia nem menciona #460
                 (a junta nao votou, ou a ata nao esta em origin/main nem no head do PR)

```

O ramo remoto aponta para o mesmo SHA que o PR declara como head (segunda fonte do objeto), medido por: `git -C C:/Users/AMP/w-san313 ls-remote origin refs/heads/fix/mobile-minhas-os`
```
ed4e229e951b4e5d4e425cbc57f1f4ac8059ce0d	refs/heads/fix/mobile-minhas-os
```

Os check-runs do head do PR estão todos concluídos e `SUCCESS` (o total, os fora de `COMPLETED`/`SUCCESS` e os nomes com a conclusão, pelo `statusCheckRollup`), e são dois runs do workflow `ci` no objeto, um por gatilho (`pull_request` e `push`); os ids de run não são citados aqui (corrida numérica longa é cobrada como SHA pelo pré-voo) e se obtêm por `gh run list --commit`, medido por: `cd C:/Users/AMP/w-san313 && gh pr view 460 --json headRefOid,statusCheckRollup --jq '.headRefOid, (.statusCheckRollup|length), ([.statusCheckRollup[] | select(.status != "COMPLETED" or .conclusion != "SUCCESS")] | length), ([.statusCheckRollup[] | .name + ":" + .conclusion] | sort | join(", "))'; gh run list --commit ed4e229e951b4e5d4e425cbc57f1f4ac8059ce0d --json workflowName,event,status,conclusion,headSha --jq '.[] | .workflowName + " " + .event + " " + .status + " " + .conclusion + " " + .headSha'`
```
ed4e229e951b4e5d4e425cbc57f1f4ac8059ce0d
14
0
authority-portal:SUCCESS, authority-portal:SUCCESS, backend-postgres:SUCCESS, backend-postgres:SUCCESS, backend:SUCCESS, backend:SUCCESS, docker:SUCCESS, docker:SUCCESS, flutter:SUCCESS, flutter:SUCCESS, frontend:SUCCESS, frontend:SUCCESS, owner-portal:SUCCESS, owner-portal:SUCCESS
ci pull_request completed success ed4e229e951b4e5d4e425cbc57f1f4ac8059ce0d
ci push completed success ed4e229e951b4e5d4e425cbc57f1f4ac8059ce0d
```

O worktree `C:/Users/AMP/w-san313` está no objeto e sem modificação rastreada (0 linhas no status sem não rastreados), e o único não rastreado é o diretório de votos desta junta; por isso as leituras de arquivo deste mandato, feitas no disco desse worktree com caminho absoluto e com o CR retirado, leem o conteúdo do objeto (o `sed` do comando põe o prefixo do worktree no caminho que o `git status` imprime), medido por: `git -C C:/Users/AMP/w-san313 rev-parse HEAD; git -C C:/Users/AMP/w-san313 status --porcelain --untracked-files=no | wc -l; git -C C:/Users/AMP/w-san313 status --short | sed -E 's#^(..) (.*)#\1 C:/Users/AMP/w-san313/\2#'`
```
ed4e229e951b4e5d4e425cbc57f1f4ac8059ce0d
0
?? C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13/
```

Do commit anterior ao objeto (`<objeto>~1`, o head que a fábrica recebeu) ao objeto há um commit, o dos corpos, e o delta é só os três corpos `jurado-san313-*` nos dois espelhos (o `sed` põe o prefixo do worktree no caminho impresso), medido por: `cd C:/Users/AMP/w-san313 && git rev-list --count ed4e229e951b4e5d4e425cbc57f1f4ac8059ce0d~1..ed4e229e951b4e5d4e425cbc57f1f4ac8059ce0d; git log -1 --format=%s ed4e229e951b4e5d4e425cbc57f1f4ac8059ce0d; git log -1 --format=%s ed4e229e951b4e5d4e425cbc57f1f4ac8059ce0d~1; git diff --name-only ed4e229e951b4e5d4e425cbc57f1f4ac8059ce0d~1 ed4e229e951b4e5d4e425cbc57f1f4ac8059ce0d | sed -e 's#^#C:/Users/AMP/w-san313/#'`
```
1
docs(junta): corpos das 3 cadeiras da junta de dado do B-SAN3-13
test(mobile): F1 no formato do dart format 3.13.4 (o da CI) (B-SAN3-13)
C:/Users/AMP/w-san313/.agents/agents/especialistas/jurado-san313-c1-escopo-e-cursor.md
C:/Users/AMP/w-san313/.agents/agents/especialistas/jurado-san313-c2-app-nunca-perde.md
C:/Users/AMP/w-san313/.agents/agents/especialistas/jurado-san313-c3-regressao-escopo-registro.md
C:/Users/AMP/w-san313/.claude/agents/especialistas/jurado-san313-c1-escopo-e-cursor.md
C:/Users/AMP/w-san313/.claude/agents/especialistas/jurado-san313-c2-app-nunca-perde.md
C:/Users/AMP/w-san313/.claude/agents/especialistas/jurado-san313-c3-regressao-escopo-registro.md
```

O head-base do vermelho-controle é `<objeto>~13` (o ponto em que o ramo saiu da `main`: o merge do B-TRC-02, PR 454), ancestral da merge-base atual; a merge-base atual é a `origin/main` de agora; o ramo tem 13 commits de primeiro pai desde o head-base e um único merge, `<objeto>~3`, cujo segundo pai é a merge-base (o assunto de cada um abaixo; SHA que não sai do `mandato-refs.sh 460` não se publica, e por isso o head-base é citado como `<objeto>~13`), medido por: `cd C:/Users/AMP/w-san313 && git log -1 --format=%s ed4e229e951b4e5d4e425cbc57f1f4ac8059ce0d~13; git merge-base --is-ancestor ed4e229e951b4e5d4e425cbc57f1f4ac8059ce0d~13 b08c755719a6cb0ed192fa04e549ac5fc67a3e67 && echo 'head-base ancestral da merge-base'; git merge-base ed4e229e951b4e5d4e425cbc57f1f4ac8059ce0d origin/main; git rev-parse origin/main; git rev-list --first-parent --count ed4e229e951b4e5d4e425cbc57f1f4ac8059ce0d~13..ed4e229e951b4e5d4e425cbc57f1f4ac8059ce0d; git rev-list --first-parent --merges --count ed4e229e951b4e5d4e425cbc57f1f4ac8059ce0d~13..ed4e229e951b4e5d4e425cbc57f1f4ac8059ce0d; git log -1 --format=%s ed4e229e951b4e5d4e425cbc57f1f4ac8059ce0d~3; test "$(git rev-parse ed4e229e951b4e5d4e425cbc57f1f4ac8059ce0d~3^2)" = b08c755719a6cb0ed192fa04e549ac5fc67a3e67 && echo 'segundo pai do merge = merge-base'`
```
feat(traccar): eventos da viatura e telemetria veicular pelo event.forward, com migração transacional e RLS forçado (B-TRC-02) (#454)
head-base ancestral da merge-base
b08c755719a6cb0ed192fa04e549ac5fc67a3e67
b08c755719a6cb0ed192fa04e549ac5fc67a3e67
13
1
chore(merge): origin/main (#458) no ramo do B-SAN3-13 — registros apensados nas duas ordens, índice regenerado
segundo pai do merge = merge-base
```

O corpo desta cadeira existe no objeto e, descontados o frontmatter e o bloco de adaptação Codex do espelho, é IDÊNTICO entre os dois espelhos (comparação EOL-neutra; o arquivo inteiro difere por construção do espelho, e por isso não se publica hash); o número de linhas de cada espelho está na saída, medido por: `cd C:/Users/AMP/w-san313 && diff <(tr -d '\r' < C:/Users/AMP/w-san313/.claude/agents/especialistas/jurado-san313-c2-app-nunca-perde.md | awk 'f; $0=="---"{n++; if(n==2) f=1}' | sed '/^$/d') <(tr -d '\r' < C:/Users/AMP/w-san313/.agents/agents/especialistas/jurado-san313-c2-app-nunca-perde.md | awk 'f; $0=="---"{n++; if(n==2) f=1}' | awk 'index($0,"Papel para o Codex"){s=1} s&&$0==""{s=0; next} !s' | sed '/^$/d') >/dev/null && echo 'IDENTICO corpo c2-app-nunca-perde' || echo 'DIVERGE corpo c2-app-nunca-perde'; wc -l < C:/Users/AMP/w-san313/.claude/agents/especialistas/jurado-san313-c2-app-nunca-perde.md; wc -l < C:/Users/AMP/w-san313/.agents/agents/especialistas/jurado-san313-c2-app-nunca-perde.md`
```
IDENTICO corpo c2-app-nunca-perde
383
389
```

As duas ferramentas do pré-voo na pasta do redator são as do ramo `origin/chore/mandato-refs-e-preflight` com uma única diferença, a linha do `RAIZ` do `mandato-preflight.sh`, fixada em `C:/Users/AMP/w-trc02` (a adaptação do B-TRC-02), e são byte a byte as da pasta do redator do B-TRC-02; esse `RAIZ` não existe mais no disco, logo a checagem 6 do pré-voo não acharia caminho relativo nenhum, e por isso este mandato cita todo caminho do repositório ABSOLUTO no worktree do objeto (a checagem 6 não confere caminho absoluto, fronteira declarada no cabeçalho do pré-voo; a existência de cada um sai das leituras medidas neste mandato), medido por: `cd C:/Users/AMP/Documents/GitHub/ERP_Techsolutios && for b in mandato-refs.sh mandato-preflight.sh; do bl=$(git ls-tree -r origin/chore/mandato-refs-e-preflight -- scripts | awk -v b="$b" '$4 ~ ("/" b "$") {print $3}'); diff <(git cat-file blob "$bl") C:/Users/AMP/erp-pausa-2026-10-03/redator-san313/$b | grep -i -E '^[<>]'; echo "$b linhas-diferentes=$(diff <(git cat-file blob "$bl") C:/Users/AMP/erp-pausa-2026-10-03/redator-san313/$b | grep -c -i -E '^[<>]')"; cmp -s C:/Users/AMP/erp-pausa-2026-10-03/redator-san313/$b C:/Users/AMP/erp-pausa-2026-10-03/redator-trc02-c2/$b && echo "$b igual ao do redator do B-TRC-02"; done; test -d C:/Users/AMP/w-trc02 && echo 'RAIZ existe' || echo 'RAIZ ausente: C:/Users/AMP/w-trc02'`
```
mandato-refs.sh linhas-diferentes=0
mandato-refs.sh igual ao do redator do B-TRC-02
< RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
> RAIZ=C:/Users/AMP/w-trc02
mandato-preflight.sh linhas-diferentes=2
mandato-preflight.sh igual ao do redator do B-TRC-02
RAIZ ausente: C:/Users/AMP/w-trc02
```

Os três arquivos de teste Flutter do bloco e a contagem de casos (`test`/`testWidgets`) de cada um, e o `b084_home_stats_test.dart`, que o bloco ajustou fora da lista nominal do §5, com as linhas acrescentadas e removidas do head-base `<objeto>~13` ao objeto (o `awk` põe o prefixo do worktree no caminho impresso), medido por: `cd C:/Users/AMP/w-san313 && for f in bsan313_minhas_os_escopo_test bsan313_os_purga_reconcilia_test bsan313_home_lista_e1_test; do echo "$f $(tr -d '\r' < C:/Users/AMP/w-san313/mobile/flutter_app/test/features/$f.dart | grep -c -i -E '^\s*(test|testWidgets)\(')"; done; git diff --numstat ed4e229e951b4e5d4e425cbc57f1f4ac8059ce0d~13 ed4e229e951b4e5d4e425cbc57f1f4ac8059ce0d -- '*b084_home_stats_test.dart' | awk '{print $1, $2, "C:/Users/AMP/w-san313/" $3}'`
```
bsan313_minhas_os_escopo_test 6
bsan313_os_purga_reconcilia_test 18
bsan313_home_lista_e1_test 4
18 7 C:/Users/AMP/w-san313/mobile/flutter_app/test/features/b084_home_stats_test.dart
```

No repositório de OS do app, no objeto: a trava estática (`_serialTail`, l.158, e `_serial`, l.160), as chaves de referência local, do servidor e por ação (l.61, l.62, l.70), os status de ação que retêm (l.104) e os de evidência com blob no aparelho (l.111), a regra de fabricação no ramo de purga (l.355) e o `allowSeedOrders: !kIsRemoteAuth` do provider (l.1027); nenhuma classe deste arquivo implementa `WalkingWorkOrderRemoteApi` (o padrão está no comando e não casa aqui), medido por: `tr -d '\r' < C:/Users/AMP/w-san313/mobile/flutter_app/lib/features/work_orders/data/work_order_repository.dart | grep -n -i -E 'static Future<void>\? _serialTail|static Future<T> _serial|workOrderLocalReferenceKeys =|workOrderServerReferenceKeys =|_pendingActionStatuses =|_blobStillOnDeviceUploadStatuses =|workOrderActionReferenceKeys =|_isFabricated\(row, actions\) \|\||allowSeedOrders: !kIsRemoteAuth|class .*implements .*WalkingWorkOrderRemoteApi'`
```
61:const workOrderLocalReferenceKeys = <String>{'local_id', 'work_order_local_id'};
62:const workOrderServerReferenceKeys = <String>{
70:const workOrderActionReferenceKeys = <String, Set<String>>{
104:const _pendingActionStatuses = <SyncStatus>{
111:const _blobStillOnDeviceUploadStatuses = <SyncStatus>{
158:  static Future<void>? _serialTail;
160:  static Future<T> _serial<T>(Future<T> Function() body) async {
355:      if (_isFabricated(row, actions) || !await _hasPendingWork(row, actions)) {
1027:    allowSeedOrders: !kIsRemoteAuth,
```

Toda implementação de `WorkOrderRemoteApi` em `lib` e `test` do app, pela busca do git no worktree que está no objeto: duas em `lib` (`PendingBackendWorkOrderRemoteApi`, que não implementa a caminhada, e `DioWorkOrderRemoteApi`, que implementa também `WalkingWorkOrderRemoteApi`; qual delas o provider de produção usa é do item 3) e três fakes de teste (só o do `bsan313_os_purga_reconcilia_test` implementa a caminhada); o `sed` põe o prefixo do worktree no caminho impresso, medido por: `git -C C:/Users/AMP/w-san313 grep -n -i -E 'implements[^{]*WorkOrderRemoteApi|extends[^{]*WorkOrderRemoteApi' -- mobile/flutter_app/lib mobile/flutter_app/test | sed -e 's#^#C:/Users/AMP/w-san313/#'`
```
C:/Users/AMP/w-san313/mobile/flutter_app/lib/features/work_orders/data/work_order_remote_api.dart:47:class PendingBackendWorkOrderRemoteApi implements WorkOrderRemoteApi {
C:/Users/AMP/w-san313/mobile/flutter_app/lib/features/work_orders/data/work_order_remote_api.dart:83:    implements WorkOrderRemoteApi, WalkingWorkOrderRemoteApi {
C:/Users/AMP/w-san313/mobile/flutter_app/test/features/b099_real_work_orders_pull_test.dart:17:class _FakeRemoteApi implements WorkOrderRemoteApi {
C:/Users/AMP/w-san313/mobile/flutter_app/test/features/b121_mobile_hardening_test.dart:57:class _TimelineRemote implements WorkOrderRemoteApi {
C:/Users/AMP/w-san313/mobile/flutter_app/test/features/bsan313_os_purga_reconcilia_test.dart:39:class _WalkingApi implements WorkOrderRemoteApi, WalkingWorkOrderRemoteApi {
```

Memória de commit livre em GB (a P8 (c) exige pelo menos 4 antes de lançar agente), os trabalhos Docker vivos fora da base `erp-*` (o teto é 2 contando o da cadeira) e o disco livre em `C:` (abaixo de 10 GB, `DEEP_CLEAN=1`, §C5), no instante da redação: a cadeira mede de novo antes de subir, medido por: `powershell.exe -NoProfile -Command '$o=Get-CimInstance Win32_PerfFormattedData_PerfOS_Memory; [math]::Round(($o.CommitLimit-$o.CommittedBytes)/1GB,2)'; docker ps --format '{{.Names}}' | grep -v -i -E '^erp-' | sed -E 's#-(pg|redis|run|net)$##' | sort -u; echo "trabalhos fora de erp: $(docker ps --format '{{.Names}}' | grep -v -i -E '^erp-' | sed -E 's#-(pg|redis|run|net)$##' | sort -u | wc -l)"; df -h /c | tail -1 | awk '{print "livre em C: " $4}'`
```
12,47
trabalhos fora de erp: 0
livre em C: 11G
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

Você é `jurado-san313-c2-opus` (nome proposto pela fábrica; o orquestrador confirma no disparo), identidade nova, executor Claude Code (subagente), modelo **Claude Opus**, nível menor DECLARADO (§C7.6); o seu corpo canônico é `C:/Users/AMP/w-san313/.claude/agents/especialistas/jurado-san313-c2-app-nunca-perde.md`, carregado **do blob do objeto** (o worktree está no objeto, medido acima). Na primeira linha de `c2-evidencia.md`, declare executor efetivo, modelo, nível, objeto, `mandato_md5` deste arquivo (CR retirado antes do md5), `flutter --version`/`dart --version` e IDENTICO/DIVERGE do corpo carregado contra o blob, EOL-neutro. **Opus esgotado: PARE sem votar** e registre onde parou (§C7.6-bis). Inelegíveis por nome: `planejador-mestre`, `crit-san313-opus`, `crit-san313-opus-r2`, `crit-san313-argon`, `crit-san313-pro-r2`, `dev-san313-opus`, `med-san313-argon` (a instância Argon que mediu), `fab-san313-opus`, `redator-san313-opus`, o orquestrador, `inspetor-san313-opus`, `jurado-san313-c1-opus`, `jurado-san313-c3-opus`; nome coincidente, pare. **Monocultura declarada:** o dev rodou em Claude Opus, como você — toda conclusão sua sai de execução sua. Plano v3 com E1/E2, relatório do dev (inclusive as 25 FM e o endurecimento de FM3/FM17/FM18) e críticas são **A RE-VERIFICAR**, derruba com: `head -1 C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13/c2-evidencia.md | grep -i -E 'executor|Opus|mandato_md5|objeto|flutter|IDENTICO|DIVERGE'`

A legalidade vem antes do mérito: parecer `insp-san313-parecer.md` de `inspetor-san313-opus` com LIBERADO ou LIBERADO COM RESSALVA nomeando você, o seu executor e o seu worktree; objeto = head do PR 460 depois do commit dos corpos (medido acima), check-runs concluídos. Régua: DADO, **unanimidade de 3 com veto**, **ciclo 1** (todo `bloqueia` `dentro-do-bloco` reprova). Divergência registrada (§A2): o plano §9 dava CA-13/14/21/22 à C3; na composição do orquestrador eles são seus (item 3), e a bateria Flutter inteira (`format`/`analyze`/suíte) é da C3. Todo achado com gravidade, classe, escopo, N e forma; `pre-existente` com evidência de origem e dono; "não consigo medir" = REPROVADO; não proponha correção, não reabra a E1 (*"Só as abertas"*) nem Q1–Q5, não cobre KPI nem matéria de C1/C3, não leia `c1-*`/`c3-*`; `arquivos_medidos` honesto (o que você lê para medir — sync, evidência, prestador, vistoria — entra; o glob `**` do app Flutter, sob o prefixo `mobile/flutter_app`, se rodou `flutter analyze` ou a suíte inteira), derruba com: `grep -i -E 'legalidade|A RE-VERIFICAR|gravidade|classe|escopo|arquivos_medidos|monocultura|ciclo 1' C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13/c2-voto.json`

Terreno: worktree exclusivo `C:/Users/AMP/j13-c2-wt`, detached no objeto, `flutter pub get` próprio (e `npm ci` próprio só se rodar o teste em memória do backend do item 3), zero junction, removido só por `git worktree remove --force` depois de conferir processos = 0. **Esta cadeira não sobe Postgres nem Redis**: o "banco" é o Drift dos testes (em memória) e, em sonda sua, SQLite em `C:/Users/AMP/erp-pausa-2026-10-03/j13-c2/j13-c2-*.sqlite`, apagado no fim; container, se algum, com prefixo `j13-c2-`, só `127.0.0.1`, e contando no teto de 2 trabalhos Docker. Nenhuma API remota nem aparelho real. Nunca `erp-*`, `j13-c1-*`, `j13-c3-*`, `dev-san313-*`. Mutação só no seu worktree, uma por vez, âncora única com prova (CRLF incluso), mutante que compila (`flutter analyze` do arquivo) e caso irmão verde, restauro provado por `git hash-object` = blob; o vermelho-controle no head-base `<objeto>~13` (medido acima) por `git checkout ed4e229e951b4e5d4e425cbc57f1f4ac8059ce0d~13 -- mobile/flutter_app/lib` com a versão de vermelho-controle do teste do dev, restaurado e provado; sondas `test/features/zz_j13c2_*` criadas, rodadas e apagadas; scripts numa pasta sua `C:/Users/AMP/erp-pausa-2026-10-03/j13-c2/`, derruba com: `grep -i -E 'j13-c2-wt|j13-c2-|zz_j13c2|sqlite|junction|commit livre|hash-object|head-base|flutter analyze|teardown' C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13/c2-evidencia.md`

Item 1 de 3 (retenção por família — nada pendente é apagado; CA-15, CA-16, CA-17, CA-19, CA-24; §11-bis item 1): os testes `bsan313_os_purga_reconcilia` e de escopo, caso a caso; a matriz **gerada por script** — cada constante de `*SyncActionTypes` × cada `SyncStatus` (inclusive `local`) × a chave que o produtor daquela ação grava — com N e o resultado fica/sai; as tabelas Drift com coluna de OS e o destino de cada (consultada, apagada, nem uma coisa nem outra, e por quê); a evidência com blob em cada `uploadStatus` que o uploader e o replay escrevem, e o blob órfão em disco; os estados sem drenagem (ação `failed`, `approval_request`, `unable_to_start`, `work_order_material.add`, evidência `conflict`, material `pending`) retidos em 5 pulls completos seguidos, e o gancho externo que lança retendo; a regra de fabricação diante de uma linha sem `serverId` e sem `create` mas COM trabalho pendente, e quando uma OS real chega a esse estado; o F24 diante de constante nova em cada classe e de uma classe nova. Mutações FM6–FM15, FM20, FM21 e as duas suas. Vermelho-controle: a sonda contra a base mostra a reatribuída que nunca sai, e a FM19 deixa vermelhos os "sai" da matriz, derruba com: `grep -i -E 'Item 1|matriz|SyncStatus|local|syncing|work_order_local_id|work_order_server_id|LOCAL_BLOB_MISSING|blob órfão|5 pulls|unable_to_start|approval_request|material|fabrica|F24|classe nova|FM6|FM21|vermelho|head-base' C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13/c2-evidencia.md`

Item 2 de 3 (reconciliação sob trava estática relendo do store; drenagem; sementes — CA-14, CA-18, CA-20, CA-23): a trava medida por sonda — duas instâncias sobre o mesmo store e a mesma fila com as 7 mutações públicas contra um `_reconcile` preso; exceção que libera a cauda; duas chamadas síncronas com a fila ociosa; reentrância listada por busca textual dos corpos travados e, se houver, deadlock provado com `timeout`; os vizinhos `b099`, `b103`, `b115`, `b126`, `home_screen_test` no mesmo processo dos `bsan313_*`, nas duas ordens; o `_orders` velho e a janela do escritor fora da trava entre o `_reloadRow` e o `deleteWorkOrder` (R8'), com o custo medido; a drenagem ponta a ponta (`useServer` sai, `keepMine` fica); nenhuma purga sob teto, backend sem `nextCursor`, API sem caminhada, erro, 503 ou falha de rede; outra organização intocada, inclusive com a sessão de demonstração do provider durante o recarregamento; as sementes e as filhas fora no `load()` com `allowSeedOrders: false`, o `b099` 6.x verde sem ajuste com o default, a criada offline e a `approved` pendente retidas, e o caso H1 pelo provider real. Mutações FM5, FM16–FM19, FM24, FM25 e as duas suas. Vermelho-controle: no head-base, o F1 do dev vermelho pela asserção; no objeto, a FM16 deixa vermelha a sua sonda de duas instâncias, derruba com: `grep -i -E 'Item 2|duas instâncias|_serial|reentr|deadlock|exceção|b115|b126|_orders|R8|useServer|keepMine|incompleta|503|tenant-demo|outra organização|allowSeedOrders|semente|H1|FM16|FM24|vermelho|head-base' C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13/c2-evidencia.md`

Item 3 de 3 (os desvios do dev e o que o app pede e mostra — CA-13, CA-21, CA-22; o `b084`; a interface de completude; a contagem `paginas`): a query de toda página (`scope=assigned`, `openOnly=true`, `paginate=cursor`, `limit=100`, `cursor` só da 2ª em diante, byte a byte, com um cursor seu com espaço, maiúscula, `/`, `%` e não-ASCII, nunca `offset`, dedupe, teto); a regra do `nextCursor` no múltiplo exato medida no backend em memória e no app (a página final vazia com `null` fecha completa e reconcilia) e se o teste do dev afirma a propriedade da E2 ou só um número; toda implementação de `WorkOrderRemoteApi` (as medidas acima são piso) e a do provider de produção caminhando, pelo provider real; a Home ("A sincronizar" 0/1, sem "Concluídas", "OS hoje" só abertas) e a aba "Concluidas" (texto exato do plano; terminal retida com o selo), PT-BR sem termo técnico e sem layout novo; o `b084` classificado asserção por asserção (trocada × afrouxada) e a contagem de testes antes e depois. Mutações FM1–FM4, FM22, FM23 e a sua. Vermelho-controle: o capturador contra a base mostra a requisição sem parâmetros e a Home da base mostra "Concluídas", derruba com: `grep -i -E 'Item 3|scope=assigned|openOnly=true|paginate=cursor|limit=100|cursor|offset|múltiplo|paginas|WalkingWorkOrderRemoteApi|provider|A sincronizar|Concluídas|Concluidas|b084|afrouxad|FM1|FM23|vermelho|head-base' C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13/c2-evidencia.md`

Protocolo P1/P2/P3/P4/P7 do §C7.7, verbatim no bloco colado acima, com `<cadeira>` = `c2`: evidência em `c2-evidencia.md` após CADA item; `c2-voto.json` nasce esqueleto com os três itens EM APURAÇÃO e `arquivos_medidos`, cada item gravado ao ser medido, e fecha antes da mensagem final de 1 linha; sucessor de identidade nova re-executa os comandos registrados e só então mede a cauda; três itens exatos; PAUSA grava head, feito, falta, próximo comando e arquivos meio-escritos e para. Queda em `00-quedas.md` deste diretório (P6, pelo orquestrador); no máximo 2 jurados em paralelo (P5). Únicos outputs no repositório: `c2-evidencia.md` e `c2-voto.json` em `C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13/`; nunca commit, derruba com: `test -f C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13/c2-voto.json`

## MEDIDO

Pré-voo deste mandato com as ferramentas copiadas sem mudança para a pasta do redator `C:/Users/AMP/erp-pausa-2026-10-03/redator-san313/` (diferença contra o ramo das ferramentas medida acima), executado com o cwd no worktree do objeto; o redator é `redator-san313-opus` (Claude Opus 5.5, nível menor declarado, cobrindo o Codex por ordem do dono), que pôs na forma v3 o conteúdo da fábrica `fab-san313-opus` e executou cada comando deste mandato pelo gerador `C:/Users/AMP/erp-pausa-2026-10-03/redator-san313/gerar-c2.sh`, medido por: `cd C:/Users/AMP/w-san313 && MANDATO_REFS=C:/Users/AMP/erp-pausa-2026-10-03/redator-san313/mandato-refs.sh bash C:/Users/AMP/erp-pausa-2026-10-03/redator-san313/mandato-preflight.sh C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13/00-mandatos/cadeira-c2.md 460 2>&1; echo ec=$?`
```
COLAGEM    l.6-20: refs do PR #460 confere com a saida atual

PRE-VOO OK — C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13/00-mandatos/cadeira-c2.md
ec=0
```
