# Mandato — Cadeira C3 — B-SAN3-13 ciclo 1 (junta de DADO)

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

O corpo desta cadeira existe no objeto e, descontados o frontmatter e o bloco de adaptação Codex do espelho, é IDÊNTICO entre os dois espelhos (comparação EOL-neutra; o arquivo inteiro difere por construção do espelho, e por isso não se publica hash); o número de linhas de cada espelho está na saída, medido por: `cd C:/Users/AMP/w-san313 && diff <(tr -d '\r' < C:/Users/AMP/w-san313/.claude/agents/especialistas/jurado-san313-c3-regressao-escopo-registro.md | awk 'f; $0=="---"{n++; if(n==2) f=1}' | sed '/^$/d') <(tr -d '\r' < C:/Users/AMP/w-san313/.agents/agents/especialistas/jurado-san313-c3-regressao-escopo-registro.md | awk 'f; $0=="---"{n++; if(n==2) f=1}' | awk 'index($0,"Papel para o Codex"){s=1} s&&$0==""{s=0; next} !s' | sed '/^$/d') >/dev/null && echo 'IDENTICO corpo c3-regressao-escopo-registro' || echo 'DIVERGE corpo c3-regressao-escopo-registro'; wc -l < C:/Users/AMP/w-san313/.claude/agents/especialistas/jurado-san313-c3-regressao-escopo-registro.md; wc -l < C:/Users/AMP/w-san313/.agents/agents/especialistas/jurado-san313-c3-regressao-escopo-registro.md`
```
IDENTICO corpo c3-regressao-escopo-registro
332
338
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

Os caminhos do trabalho próprio do ramo (commits de primeiro pai sem os merges, do head-base `<objeto>~13` ao objeto, inclusive o commit dos corpos): a contagem e a lista, com o prefixo do worktree que o `sed` põe; a classificação em PERMITIDO, DESVIO DECLARADO, REGISTRO DA JUNTA ou FORA é da C3, medido por: `cd C:/Users/AMP/w-san313 && git log --first-parent --no-merges --name-only --format= ed4e229e951b4e5d4e425cbc57f1f4ac8059ce0d~13..ed4e229e951b4e5d4e425cbc57f1f4ac8059ce0d | sort -u | grep -v -i -E '^$' | wc -l; git log --first-parent --no-merges --name-only --format= ed4e229e951b4e5d4e425cbc57f1f4ac8059ce0d~13..ed4e229e951b4e5d4e425cbc57f1f4ac8059ce0d | sort -u | grep -v -i -E '^$' | sed -e 's#^#C:/Users/AMP/w-san313/#'`
```
36
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

No objeto: a seção `D-SAN3-13-SCOPE-ASSIGNED` do `decisoes.md` e as três citações do dono (a "vc cobre o codex nessa rodada" aparece duas vezes, l.3881 e l.3936); as doze pendências que a fábrica listou, cada uma com o cabeçalho na linha impressa (cortado em 90 colunas); no `API_CONTRACTS.md`, `paginate=cursor`, `invalid_cursor_mode` e `WORK_ORDER_SCOPE_UNAVAILABLE`; e zero caminho de `Kpis` mudado do head-base ao objeto (a última linha), medido por: `tr -d '\r' < C:/Users/AMP/w-san313/agent-orchestration/controle/decisoes.md | grep -n -i -o -E '^## D-SAN3-13-SCOPE-ASSIGNED|Aceito as 5 \(Recomendado\)|Só as abertas|vc cobre o codex nessa rodada'; tr -d '\r' < C:/Users/AMP/w-san313/agent-orchestration/controle/pendencias.md | grep -n -i -E '^## (P-MOBILE-MINHAS-OS-SEM-FILTRO|P-MOBILE-OS-SEEDS|P-WO-LEITURAS-TENANT-WIDE-TECNICO|P-MOBILE-SYNC-FAILED-SEM-DESCARTE|P-MOBILE-EVIDENCIA-CONFLITO-SEM-DESCARTE|P-MOBILE-MATERIAL-SEM-REPLAY|P-MOBILE-LINHA-CONFLICT-NAO-LIMPA|P-MOBILE-REPO-SESSAO-DEMO-DURANTE-RELOAD|P-MOBILE-FILA-LER-TUDO-GRAVAR-TUDO|P-WO-STATUS-VOCABULARIO-APP-BACKEND|P-WO-LIST-SCOPE-WEB-TECNICO|P-MOBILE-TELEMETRIA-TESTE-16-INSTAVEL) ' | cut -c1-90; tr -d '\r' < C:/Users/AMP/w-san313/docs/claude-code-handoff/API_CONTRACTS.md | grep -n -i -o -E 'paginate=cursor|invalid_cursor_mode|WORK_ORDER_SCOPE_UNAVAILABLE' | sort -u; git -C C:/Users/AMP/w-san313 diff --name-only ed4e229e951b4e5d4e425cbc57f1f4ac8059ce0d~13 ed4e229e951b4e5d4e425cbc57f1f4ac8059ce0d -- Kpis | wc -l`
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
24:paginate=cursor
32:WORK_ORDER_SCOPE_UNAVAILABLE
32:invalid_cursor_mode
32:paginate=cursor
0
```

Memória de commit livre em GB (a P8 (c) exige pelo menos 4 antes de lançar agente), os trabalhos Docker vivos fora da base `erp-*` (o teto é 2 contando o da cadeira) e o disco livre em `C:` (abaixo de 10 GB, `DEEP_CLEAN=1`, §C5), no instante da redação: a cadeira mede de novo antes de subir, medido por: `powershell.exe -NoProfile -Command '$o=Get-CimInstance Win32_PerfFormattedData_PerfOS_Memory; [math]::Round(($o.CommitLimit-$o.CommittedBytes)/1GB,2)'; docker ps --format '{{.Names}}' | grep -v -i -E '^erp-' | sed -E 's#-(pg|redis|run|net)$##' | sort -u; echo "trabalhos fora de erp: $(docker ps --format '{{.Names}}' | grep -v -i -E '^erp-' | sed -E 's#-(pg|redis|run|net)$##' | sort -u | wc -l)"; df -h /c | tail -1 | awk '{print "livre em C: " $4}'`
```
12,39
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

Você é `jurado-san313-c3-opus` (nome proposto pela fábrica; o orquestrador confirma no disparo), identidade nova, executor Claude Code (subagente), modelo **Claude Opus**, nível menor DECLARADO (§C7.6); o seu corpo canônico é `C:/Users/AMP/w-san313/.claude/agents/especialistas/jurado-san313-c3-regressao-escopo-registro.md`, carregado **do blob do objeto** (o worktree está no objeto, medido acima). Na primeira linha de `c3-evidencia.md`, declare executor efetivo, modelo, nível, objeto, `mandato_md5` deste arquivo (CR retirado antes do md5) e IDENTICO/DIVERGE do corpo carregado contra o blob, EOL-neutro. **Opus esgotado: PARE sem votar** (§C7.6-bis). Inelegíveis por nome: `planejador-mestre`, `crit-san313-opus`, `crit-san313-opus-r2`, `crit-san313-argon`, `crit-san313-pro-r2`, `dev-san313-opus`, `med-san313-argon` (a instância Argon que mediu), `fab-san313-opus`, `redator-san313-opus`, o orquestrador, `inspetor-san313-opus`, `jurado-san313-c1-opus`, `jurado-san313-c2-opus`; nome coincidente, pare. Monocultura declarada (o dev rodou em Claude Opus). O plano v3 com E1/E2, o relatório do dev (contagens, resíduo, merge, ajustes) e as críticas são **A RE-VERIFICAR**, derruba com: `head -1 C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13/c3-evidencia.md | grep -i -E 'executor|Opus|mandato_md5|objeto|IDENTICO|DIVERGE'`

A legalidade vem antes do mérito: parecer `insp-san313-parecer.md` de `inspetor-san313-opus` com LIBERADO ou LIBERADO COM RESSALVA nomeando você, o seu executor, o seu worktree e os seus containers; objeto = head do PR 460 depois do commit dos corpos (medido acima), check-runs concluídos. Régua: DADO, **unanimidade de 3 com veto**, **ciclo 1** (todo `bloqueia` `dentro-do-bloco` reprova, grave ou não). Divergência registrada (§A2): o plano §9 dava à C3 a rede e as telas do app; na composição do orquestrador elas são da C2, e a C3 fica com as duas baterias inteiras, o escopo, o merge e o registro. **KPI congelado (§C7 item 8(5)): não cobre KPI; só confere `Kpis` sem diff** (medido acima: zero caminho). Todo achado com gravidade, classe, escopo, N e forma; `pre-existente` só com a pre-existência MEDIDA (a base falhando na mesma forma) e pendência com dono; "não consigo medir" = REPROVADO; não proponha correção, não cobre a ata da junta (é do orquestrador depois dos votos), não leia `c1-*`/`c2-*`; `arquivos_medidos: ["**"]` (suítes inteiras), derruba com: `grep -i -E 'legalidade|A RE-VERIFICAR|gravidade|classe|escopo|arquivos_medidos|KPI|ciclo 1' C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13/c3-voto.json`

Terreno: worktree exclusivo `C:/Users/AMP/j13-c3-wt`, detached no objeto, `npm ci` e `flutter pub get` próprios, zero junction, removido só por `git worktree remove --force` depois de processos = 0. Postgres 16 `j13-c3-pg` e Redis 7 `j13-c3-redis` próprios, só em `127.0.0.1`, portas altas testadas antes (candidatas 47533 e 47534), senha aleatória só por ambiente, bancos extras `j13_c3_*`; `DATABASE_URL` e `REDIS_URL` seus como prefixo de **todo** `npm test`. Antes de subir: memória de commit livre ≥ 4 GB, no máximo 2 trabalhos Docker contando o seu (na redação já havia 2 fora da base, medido acima), disco ≥ 10 GB; a suíte com banco não sobe junto com a C1 se isso passar do teto (o inspetor dá a ordem). Nunca `erp-*`, nem 5432, 6379, 3000, 5173, 5050, 8899, 55432, 55313; nunca `prune` nem container alheio. Formato Flutter pela versão da CI (SDK avulso no `$SCRATCH`) ou pelo check-run `flutter` do objeto, declarado. Controles no head-base `<objeto>~13` (medido acima) por `git checkout ed4e229e951b4e5d4e425cbc57f1f4ac8059ce0d~13 -- <caminhos>` no seu worktree, restaurados e provados por `hash-object`; se o lockfile diferir entre base e objeto, o controle backend da base sai do CI da base, declarado. Scripts numa pasta sua `C:/Users/AMP/erp-pausa-2026-10-03/j13-c3/`, derruba com: `grep -i -E 'j13-c3-wt|j13-c3-pg|j13-c3-redis|j13_c3_|127\.0\.0\.1|junction|commit livre|4 GB|erp-|5432|6379|versão da CI|hash-object|head-base|teardown' C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13/c3-evidencia.md`

Item 1 de 3 (as duas suítes inteiras com o resíduo nomeado e datado — CA-12, CA-25): `npm run check`, `lint`, `build`; `npm test` na forma da CI (com o seu Postgres e o seu Redis) e na forma sem banco, com `arquivos · tests · pass · fail · skipped` e o nome de cada `fail` e `skip`; Flutter `pub get`, `dart format` na versão da CI, `flutter analyze` e a suíte inteira três vezes; a contagem `N_objeto − N_base` = novos do bloco + vindos da `main`, nenhum teste apagado, nenhum `skip` novo sem motivo; e o resíduo datado por execução — o `telemetry_test` 16 isolado N ≥ 10 no objeto e N ≥ 10 no head-base, e junto da suíte, com a data do teste e os imports que o bloco mudou; o `core-saas-role-authority` sem e com `DATABASE_URL` no objeto e na base; qualquer outro vermelho pelo mesmo método. Vermelho-controle: os testes do bloco ausentes na base (contagem 0) e o comparador acusando um teste apagado numa cópia sua, derruba com: `grep -i -E 'Item 1|npm run check|lint|build|npm test|skipped|dart format|flutter analyze|\+[0-9]+|N_base|N_objeto|diff-filter=D|telemetry_test|core-saas-role-authority|DATABASE_URL|pre-existente|head-base|vermelho' C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13/c3-evidencia.md`

Item 2 de 3 (o diff dentro do PERMITIDO e o merge sem conteúdo próprio — §5, §C4): os caminhos do trabalho próprio (medidos acima) classificados por script em PERMITIDO, DESVIO DECLARADO (com o lugar da declaração), REGISTRO DA JUNTA ou FORA — candidatos a desvio: `b084_home_stats_test.dart`, `docs/revisoes/SAN3/B-SAN3-13-*`, `pendencias-indice.md`, fakes de `WorkOrderLocalStore`; o PROIBIDO do §5 vazio; os hunks de `work-order.service.ts` e de `drift_work_order_local_store.dart` localizados por função (parse de chaves, não número de linha) dentro das regiões permitidas; e cada merge de primeiro pai (medido acima: um, `<objeto>~3`, com o segundo pai na merge-base): a árvore automática por `git merge-tree --write-tree`, os caminhos em que o merge difere dela só entre os conflitados e só registro, 0 linha removida de `decisoes.md` e `pendencias.md` contra cada pai, o índice igual ao que o gerador do objeto produz, e nenhum arquivo de código diferente do automático. Vermelho-controle: o classificador acusa um caminho PROIBIDO fabricado, o comparador acusa uma remoção fabricada, e um hunk fabricado no guard sai FORA, derruba com: `grep -i -E 'Item 2|PERMITIDO|PROIBIDO|DESVIO|FORA|b084|hunk|list\(\)|deleteWorkOrder|merge-tree|automático|removidas|pendencias-indice|gerar-indice|vermelho|head-base' C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13/c3-evidencia.md`

Item 3 de 3 (o registro): a seção `D-SAN3-13-SCOPE-ASSIGNED` delimitada por parse, as três citações do dono comparadas byte a byte com as do plano e atribuídas à pergunta certa, a E2 e a precisão do `OR: []` registradas como do planejador (fato × leitura, §A6), e se o registro diz "imposto no backend" sem dizer que é na lista (CRIT-4); as pendências que o §12 manda abrir, geradas por busca no plano, presentes uma vez, com severidade, bloco dono não vago e a propriedade em aberto, #32/#33 "fecham com o merge" com a prova nomeada, a `P-WO-LEITURAS-TENANT-WIDE-TECNICO` enumerando as rotas; a linha de `API_CONTRACTS.md` igual ao texto da E2 (normalizado), cada código de erro do texto emitido pelo código e todo código novo do código no texto; a linha do `B-SAN3-13` no `PLANO_SAN3.md` com o texto antigo riscado e não apagado; `Kpis` sem diff. Vermelho-controle: na base, `D-SAN3-13` = 0 e as pendências novas = 0; o comparador de citação acusa um caractere alterado; o de códigos acusa um código só no texto, derruba com: `grep -i -E 'Item 3|D-SAN3-13-SCOPE-ASSIGNED|Aceito as 5|Só as abertas|vc cobre o codex|E2|OR: \[\]|na lista|§12|dono|P-WO-LEITURAS|API_CONTRACTS|invalid_|WORK_ORDER_SCOPE_UNAVAILABLE|PLANO_SAN3|riscad|Kpis|vermelho|head-base' C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13/c3-evidencia.md`

Protocolo P1/P2/P3/P4/P7 do §C7.7, verbatim no bloco colado acima, com `<cadeira>` = `c3`: evidência em `c3-evidencia.md` após CADA item; `c3-voto.json` nasce esqueleto com os três itens EM APURAÇÃO e `arquivos_medidos: ["**"]`, cada item gravado ao ser medido, e fecha antes da mensagem final de 1 linha; sucessor de identidade nova re-executa os comandos registrados e só então mede a cauda; três itens exatos; PAUSA grava head, feito, falta, próximo comando e arquivos meio-escritos (inclusive uma suíte em curso e os controles do head-base não restaurados) e para. Queda em `00-quedas.md` deste diretório (P6, pelo orquestrador); no máximo 2 jurados em paralelo (P5). Únicos outputs no repositório: `c3-evidencia.md` e `c3-voto.json` em `C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13/`; nunca commit, derruba com: `test -f C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13/c3-voto.json`

## MEDIDO

Pré-voo deste mandato com as ferramentas copiadas sem mudança para a pasta do redator `C:/Users/AMP/erp-pausa-2026-10-03/redator-san313/` (diferença contra o ramo das ferramentas medida acima), executado com o cwd no worktree do objeto; o redator é `redator-san313-opus` (Claude Opus 5.5, nível menor declarado, cobrindo o Codex por ordem do dono), que pôs na forma v3 o conteúdo da fábrica `fab-san313-opus` e executou cada comando deste mandato pelo gerador `C:/Users/AMP/erp-pausa-2026-10-03/redator-san313/gerar-c3.sh`, medido por: `cd C:/Users/AMP/w-san313 && MANDATO_REFS=C:/Users/AMP/erp-pausa-2026-10-03/redator-san313/mandato-refs.sh bash C:/Users/AMP/erp-pausa-2026-10-03/redator-san313/mandato-preflight.sh C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13/00-mandatos/cadeira-c3.md 460 2>&1; echo ec=$?`
```
COLAGEM    l.6-20: refs do PR #460 confere com a saida atual

PRE-VOO OK — C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13/00-mandatos/cadeira-c3.md
ec=0
```
