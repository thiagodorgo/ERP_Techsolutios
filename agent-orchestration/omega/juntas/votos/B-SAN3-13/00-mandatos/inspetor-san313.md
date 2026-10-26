# Mandato — Inspetor de terreno — B-SAN3-13 ciclo 1 (junta de DADO)

## MEDIDO

Estado do PR 460 no instante da redação, pela ferramenta `mandato-refs.sh` copiada sem mudança para a pasta própria do redator `C:/Users/AMP/erp-pausa-2026-10-03/redator-san313/`, com o cwd no worktree do objeto (ec 0: o head do PR, a merge-base, 14 check-runs, nenhum não verde, e nenhuma ata ainda), medido por: `cd C:/Users/AMP/w-san313 && bash C:/Users/AMP/erp-pausa-2026-10-03/redator-san313/mandato-refs.sh 460`
```
# refs do PR #460 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato
# gerado em: 2026-10-25T18:35Z · repo: thiagodorgo/ERP_Techsolutios

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

Os três corpos das cadeiras no objeto são IDÊNTICOS entre os dois espelhos descontado o bloco Codex (EOL-neutro), e o S0 (`sync-agent-agents.mjs --check`) passa num worktree descartável no objeto, `C:/Users/AMP/j13-insp-s0`, criado e removido pelo próprio comando (a última linha confirma a remoção), medido por: `cd C:/Users/AMP/w-san313 && for c in c1-escopo-e-cursor c2-app-nunca-perde c3-regressao-escopo-registro; do diff <(tr -d '\r' < C:/Users/AMP/w-san313/.claude/agents/especialistas/jurado-san313-$c.md | awk 'f; $0=="---"{n++; if(n==2) f=1}' | sed '/^$/d') <(tr -d '\r' < C:/Users/AMP/w-san313/.agents/agents/especialistas/jurado-san313-$c.md | awk 'f; $0=="---"{n++; if(n==2) f=1}' | awk 'index($0,"Papel para o Codex"){s=1} s&&$0==""{s=0; next} !s' | sed '/^$/d') >/dev/null && echo "IDENTICO corpo $c" || echo "DIVERGE corpo $c"; done; git worktree add --detach C:/Users/AMP/j13-insp-s0 ed4e229e951b4e5d4e425cbc57f1f4ac8059ce0d >/dev/null 2>&1; node C:/Users/AMP/j13-insp-s0/scripts/sync-agent-agents.mjs --check; echo "sync ec=$?"; git worktree remove --force C:/Users/AMP/j13-insp-s0; test -d C:/Users/AMP/j13-insp-s0 && echo 'worktree S0 FICOU' || echo 'worktree S0 removido'`
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

Os insumos do briefing existem no objeto (o plano v3, o relatório do dev, as cópias das críticas r1 e r2 e a medição do Argon, versionadas neste PR), e o plano tem as seções §11-bis, §13, Emenda E1 e Emenda E2 (linha e começo do título; o `sed` põe o prefixo do worktree no caminho impresso), medido por: `cd C:/Users/AMP/w-san313 && git ls-tree -r --name-only ed4e229e951b4e5d4e425cbc57f1f4ac8059ce0d -- docs/revisoes/SAN3 | grep -i 'SAN3-13' | sed -e 's#^#C:/Users/AMP/w-san313/#'; tr -d '\r' < C:/Users/AMP/w-san313/docs/revisoes/SAN3/B-SAN3-13-plano.md | grep -n -i -o -E '^## (Emenda E1|Emenda E2|§11-bis|§13)[^(]{0,40}'`
```
C:/Users/AMP/w-san313/docs/revisoes/SAN3/B-SAN3-13-critica-r1.md
C:/Users/AMP/w-san313/docs/revisoes/SAN3/B-SAN3-13-critica-r2.md
C:/Users/AMP/w-san313/docs/revisoes/SAN3/B-SAN3-13-dev.md
C:/Users/AMP/w-san313/docs/revisoes/SAN3/B-SAN3-13-medicao.md
C:/Users/AMP/w-san313/docs/revisoes/SAN3/B-SAN3-13-plano.md
374:## §11-bis — Riscos residuais para a junta
397:## §13 — Perguntas ao dono
420:## Emenda E1
432:## Emenda E2
```

Os critérios de aceite do plano são CA-1 a CA-25 (a lista abaixo, gerada do plano), e cada um aparece nos itens de exatamente uma das três cadeiras (a contagem por cadeira e a união, geradas das linhas `Item` dos três mandatos deste diretório): CA-1 a CA-11 na C1, CA-13 a CA-24 na C2, CA-12 e CA-25 na C3, medido por: `tr -d '\r' < C:/Users/AMP/w-san313/docs/revisoes/SAN3/B-SAN3-13-plano.md | grep -o -i -E '\bCA-[0-9]+\b' | sort -t- -k2,2n -u | tr '\n' ' '; echo; for c in c1 c2 c3; do echo "$c: $(grep -i -E '^Item [0-9] de 3' C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13/00-mandatos/cadeira-$c.md | grep -o -i -E '\bCA-[0-9]+\b' | sort -t- -k2,2n -u | tr '\n' ' ')"; done; echo "união: $(grep -h -i -E '^Item [0-9] de 3' C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13/00-mandatos/cadeira-c1.md C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13/00-mandatos/cadeira-c2.md C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13/00-mandatos/cadeira-c3.md | grep -o -i -E '\bCA-[0-9]+\b' | sort -u | wc -l) distintos; repetidos entre cadeiras: $(for c in c1 c2 c3; do grep -i -E '^Item [0-9] de 3' C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13/00-mandatos/cadeira-$c.md | grep -o -i -E '\bCA-[0-9]+\b' | sort -u; done | sort | uniq -d | wc -l)"`
```
CA-1 CA-2 CA-3 CA-4 CA-5 CA-6 CA-7 CA-8 CA-9 CA-10 CA-11 CA-12 CA-13 CA-14 CA-15 CA-16 CA-17 CA-18 CA-19 CA-20 CA-21 CA-22 CA-23 CA-24 CA-25
c1: CA-1 CA-2 CA-3 CA-4 CA-5 CA-6 CA-7 CA-8 CA-9 CA-10 CA-11
c2: CA-13 CA-14 CA-15 CA-16 CA-17 CA-18 CA-19 CA-20 CA-21 CA-22 CA-23 CA-24
c3: CA-12 CA-25
união: 25 distintos; repetidos entre cadeiras: 0
```

Identidades que planejaram, criticaram, mediram, desenvolveram e fabricaram neste bloco, GERADAS dos arquivos de registro do diff do bloco (do head-base `<objeto>~13` ao objeto, lidos no disco do worktree no objeto; piso da inelegibilidade, não teto): além das que a fábrica nomeou, a lista traz `med-san313-argon` (a instância Argon que mediu o diagnóstico), `crit-san313-argon` e `crit-san313-pro-r2`; `dev-san313-pg` é nome de container e `insp-san313-parecer` é nome de arquivo, medido por: `cd C:/Users/AMP/w-san313 && for f in $(git diff --name-only ed4e229e951b4e5d4e425cbc57f1f4ac8059ce0d~13 ed4e229e951b4e5d4e425cbc57f1f4ac8059ce0d -- docs/revisoes/SAN3 agent-orchestration .claude .agents); do tr -d '\r' < "$f"; done | grep -o -i -E '\b(planejador|crit|critico|dev|rev|fab|fabrica|inspetor|insp|redator|jurado|argon|med|medidor)-san3?-?13[a-z0-9-]*|planejador-mestre' | sed -E 's#-+$##' | sort -u`
```
PLANEJADOR-MESTRE
crit-san313-argon
crit-san313-opus
crit-san313-opus-r2
crit-san313-pro-r2
dev-san313
dev-san313-opus
dev-san313-pg
fab-san313-opus
insp-san313-parecer
jurado-san313
jurado-san313-c1-escopo-e-cursor
jurado-san313-c2-app-nunca-perde
jurado-san313-c3-regressao-escopo-registro
med-san313-argon
planejador-mestre
```

As quatro identidades desta junta e a do redator destes mandatos não aparecem em arquivo rastreado nenhum do objeto (contagem de arquivos rastreados que as citam, pela busca do git no worktree que está no objeto), medido por: `git -C C:/Users/AMP/w-san313 grep -l -i -E 'inspetor-san313-opus|jurado-san313-c1-opus|jurado-san313-c2-opus|jurado-san313-c3-opus|redator-san313-opus' | wc -l`
```
0
```

Resíduo que ocupe nome, porta ou caminho desta junta no instante da redação: nenhum container com `san313` ou `j13-` no nome (vivo ou parado), nenhum caminho `C:/Users/AMP/j13-*`, e o único worktree registrado com esses radicais é o do objeto, medido por: `echo "containers san313/j13: $(docker ps -a --format '{{.Names}}' | grep -c -i -E 'san313|j13-')"; echo "caminhos j13: $(ls -d C:/Users/AMP/j13-* 2>/dev/null | wc -l)"; git -C C:/Users/AMP/Documents/GitHub/ERP_Techsolutios worktree list --porcelain | grep -i -E '^worktree .*(j13-|san313)'`
```
containers san313/j13: 0
caminhos j13: 0
worktree C:/Users/AMP/w-san313
```

Memória de commit livre em GB (a P8 (c) exige pelo menos 4 antes de lançar agente), os trabalhos Docker vivos fora da base `erp-*` (o teto é 2 contando o da cadeira) e o disco livre em `C:` (abaixo de 10 GB, `DEEP_CLEAN=1`, §C5), no instante da redação: a cadeira mede de novo antes de subir, medido por: `powershell.exe -NoProfile -Command '$o=Get-CimInstance Win32_PerfFormattedData_PerfOS_Memory; [math]::Round(($o.CommitLimit-$o.CommittedBytes)/1GB,2)'; docker ps --format '{{.Names}}' | grep -v -i -E '^erp-' | sed -E 's#-(pg|redis|run|net)$##' | sort -u; echo "trabalhos fora de erp: $(docker ps --format '{{.Names}}' | grep -v -i -E '^erp-' | sed -E 's#-(pg|redis|run|net)$##' | sort -u | wc -l)"; df -h /c | tail -1 | awk '{print "livre em C: " $4}'`
```
12,52
trabalhos fora de erp: 0
livre em C: 11G
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

Você é `inspetor-san313-opus` (nome proposto pela fábrica; o orquestrador confirma no disparo), identidade nova, executor Claude Code (subagente), modelo **Claude Opus**, nível menor DECLARADO (o `model: opus` do frontmatter de `inspetor-de-terreno-da-junta`, medido acima, §C7.6), corpo carregado do blob do objeto (`C:/Users/AMP/w-san313/.claude/agents/inspetor-de-terreno-da-junta.md`, no worktree que está no objeto, medido acima). **Opus esgotado: PARE** e registre onde parou (§C7.6-bis). Declare executor efetivo, modelo, nível, objeto, `mandato_md5` deste arquivo (CR retirado antes do md5) e IDENTICO/DIVERGE do seu corpo carregado contra o blob, EOL-neutro, na primeira linha de `insp-san313-evidencia.md`. Você não vota nem julga mérito: julga se o tabuleiro está limpo (§C7.1-bis), fail-closed. Plano v3 com E1/E2, relatório do dev, críticas, medição do Argon e os mandatos das cadeiras são **A RE-VERIFICAR**. Régua da junta que você libera: bloco de DADO (o app apaga linhas de OS do aparelho) e de permissão (escopo da lista), **unanimidade de 3 com veto** (§C7 item 8(1)); **ciclo 1**, todo `bloqueia` `dentro-do-bloco` reprova; os votos declaram `arquivos_medidos` (§C7 item 9 (0)), derruba com: `head -1 C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13/insp-san313-evidencia.md | grep -i -E 'executor|Opus|mandato_md5|objeto|IDENTICO|DIVERGE'`

Item 1 de 3 (objeto, CI, mandatos, corpos, S0): resolva o objeto por `git ls-remote origin refs/heads/fix/mobile-minhas-os` e por `gh pr view 460 --json headRefOid`; confira que é o head **depois** do commit dos corpos e que o delta de `<objeto>~1` ao objeto é só os três corpos nos dois espelhos (medido acima); todos os check-runs concluídos e verdes no SHA (ausência, `queued` ou `cancelled` bloqueia o start; como o commit dos corpos é posterior ao último run do dev, confira que a CI rodou **neste** SHA, nos dois gatilhos, medido acima); rode o pré-voo dos quatro mandatos deste diretório até `PRE-VOO OK` com as ferramentas da pasta `C:/Users/AMP/erp-pausa-2026-10-03/redator-san313/` (o `RAIZ` dela aponta para um worktree que não existe mais, medido acima: por isso os caminhos dos mandatos são absolutos, e a existência de cada um é sua a conferir), e confira que toda unidade de MEDIDO tem a saída do comando colada (unidade sem saída bloqueia); confira no objeto, EOL-neutro e descontado o bloco Codex, os três corpos nos dois espelhos e que o corpo que cada cadeira carregar é o blob do objeto; reexecute o S0 (`sync-agent-agents.mjs --check`) num worktree descartável seu no objeto. Head que andou depois do disparo bloqueia até novo pré-voo, derruba com: `grep -i -E 'Item 1|check-runs|delta|PRE-VOO|sem saída|corpos|espelho|S0|LIBERADO|BLOQUEADO' C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13/insp-san313-parecer.md`

Item 2 de 3 (identidades, papéis, composição, briefing): regenere por comando seu a lista de inelegíveis (a medida acima é piso) e confira por nome que nenhuma das quatro identidades desta junta (`inspetor-san313-opus`, `jurado-san313-c1-opus`, `jurado-san313-c2-opus`, `jurado-san313-c3-opus`) coincide com `planejador-mestre` (Fable, autor do plano e das emendas), `crit-san313-opus` (r1), `crit-san313-opus-r2`, `dev-san313-opus`, `med-san313-argon` (a instância Argon que mediu o diagnóstico, nomeada no objeto, medido acima), `crit-san313-argon`, `crit-san313-pro-r2`, `fab-san313-opus` (autor do conteúdo destes mandatos e dos três corpos), `redator-san313-opus` (que pôs estes mandatos na forma e executou as medições) e o orquestrador, nem entre si. Separação de papéis do §C7.4-bis por nome: quem mediu e criticou ≠ quem planejou ≠ quem desenvolveu ≠ quem julga. Declare a MONOCULTURA: as quatro identidades rodam em Claude Opus, o mesmo modelo do dev (`dev-san313-opus`, cobrindo o Codex por ordem do dono, *"vc cobre o codex nessa rodada"*) — fato do orquestrador, que você registra como tal; o §9 do plano exige só "nunca três cadeiras Gemini" e "pelo menos uma não-Gemini", e diga se a composição cumpre. Registre a divergência plano §9 × composição do orquestrador (o plano dava CA-13/14/21/22 à C3 e a bateria backend à C1; a composição dá CA-13..24 à C2, CA-1..11 + "a web não muda" à C1, e baterias + escopo + merge + registro à C3) e confira, critério por critério, que **todo** CA-1..CA-25 do §6 (a distribuição medida acima é piso) e **todo** item do §8 tem cadeira dona em algum mandato (CA sem dono bloqueia o start). Confira a PRESENÇA no briefing: o plano v3 com E1, E2, §11-bis e §13; o relatório do dev; as críticas r1/r2 (no objeto, medido acima, ou em `C:/Users/AMP/erp-pausa-2026-10-03/revisoes/`); e, em cada mandato de cadeira, as divergências registradas. Coincidência de identidade, papel acumulado, CA sem dono ou briefing incompleto bloqueia, derruba com: `grep -i -E 'Item 2|ineleg|planejador-mestre|crit-san313|dev-san313-opus|med-san313-argon|fab-san313-opus|redator-san313-opus|monocultura|4-bis|CA-1|CA-25|sem dono|§9|divergência|briefing' C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13/insp-san313-parecer.md`

Item 3 de 3 (terreno): confira a árvore `C:/Users/AMP/w-san313` no objeto e sem mutação viva, admitindo como não rastreado só este diretório de votos (e os não rastreados que o orquestrador declarar); exija worktree próprio por cadeira (`C:/Users/AMP/j13-c1-wt`, `C:/Users/AMP/j13-c2-wt`, `C:/Users/AMP/j13-c3-wt`), `npm ci`/`flutter pub get` próprios e zero junction de `node_modules` (§C7.1-ter(c)); Postgres e Redis DESCARTÁVEIS por cadeira que os usa — C1 (`j13-c1-pg`, `j13-c1-redis`) e C3 (`j13-c3-pg`, `j13-c3-redis`), só em `127.0.0.1`, portas altas testadas fora das faixas reservadas do Windows; a C2 não sobe banco (Drift em memória e SQLite em `$SCRATCH`) — e qualquer resíduo (no instante da redação, medido acima: nenhum container `san313`/`j13-`, nenhum caminho `j13-*`) reportado, nunca varrido. Antes de cada lançamento e de cada subida: memória de commit livre ≥ 4 GB (P8 (c)), no máximo 2 trabalhos Docker na máquina contando o da cadeira (excluídos os `erp-*`), no máximo 3 subagentes Claude vivos, disco ≥ 10 GB (na redação estava abaixo, medido acima: `DEEP_CLEAN=1` antes de subir, §C5); base viva e as portas 5432, 6379, 3000, 5173, 5050, 8899, 55432 proibidas. Declare baseline honesto do terreno, plano de perda de jurado (P3, sucessor de identidade nova; Opus esgotado = PARA, §C7.6-bis), no máximo dois jurados em paralelo (P5) e a ORDEM de disparo que respeita o teto de Docker com duas cadeiras que sobem banco (proposta da fábrica, a julgar: C1 ∥ C2 primeiro; C3 quando a C1 derrubar os containers dela), derruba com: `grep -i -E 'Item 3|j13-c1-wt|j13-c2-wt|j13-c3-wt|j13-c1-pg|j13-c3-pg|junction|erp-|commit livre|4 GB|5432|6379|P3|P5|P8|baseline|ordem|resíduo|DEEP_CLEAN' C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13/insp-san313-parecer.md`

Protocolo P1/P2/P3/P4/P7 do §C7.7, verbatim no bloco colado acima, com `<cadeira>` = `insp-san313` e o parecer no lugar do voto: evidência em `insp-san313-evidencia.md` após CADA item; `insp-san313-parecer.md` nasce esqueleto com os três itens EM APURAÇÃO e fecha (LIBERADO, LIBERADO COM RESSALVA ou BLOQUEADO) antes da mensagem final de 1 linha; sucessor re-executa os comandos registrados; três itens exatos; PAUSA grava estado e para; queda em `00-quedas.md` deste diretório (P6, pelo orquestrador). Únicos outputs: `insp-san313-evidencia.md` e `insp-san313-parecer.md` em `C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13/`; nunca commit, derruba com: `test -f C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13/insp-san313-parecer.md`

## MEDIDO

Pré-voo deste mandato com as ferramentas copiadas sem mudança para a pasta do redator `C:/Users/AMP/erp-pausa-2026-10-03/redator-san313/` (diferença contra o ramo das ferramentas medida acima), executado com o cwd no worktree do objeto; o redator é `redator-san313-opus` (Claude Opus 5.5, nível menor declarado, cobrindo o Codex por ordem do dono), que pôs na forma v3 o conteúdo da fábrica `fab-san313-opus` e executou cada comando deste mandato pelo gerador `C:/Users/AMP/erp-pausa-2026-10-03/redator-san313/gerar-i.sh`, medido por: `cd C:/Users/AMP/w-san313 && MANDATO_REFS=C:/Users/AMP/erp-pausa-2026-10-03/redator-san313/mandato-refs.sh bash C:/Users/AMP/erp-pausa-2026-10-03/redator-san313/mandato-preflight.sh C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13/00-mandatos/inspetor-san313.md 460 2>&1; echo ec=$?`
```
COLAGEM    l.6-20: refs do PR #460 confere com a saida atual

PRE-VOO OK — C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13/00-mandatos/inspetor-san313.md
ec=0
```
