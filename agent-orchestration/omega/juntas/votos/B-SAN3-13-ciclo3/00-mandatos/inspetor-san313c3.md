# Mandato — Inspetor de terreno — B-SAN3-13 ciclo 3 (junta de DADO)

## MEDIDO

Estado do PR 460 no instante da redação do ciclo 3, pela ferramenta `mandato-refs.sh` copiada sem mudança para a pasta própria do redator `C:/Users/AMP/erp-pausa-2026-10-03/redator-san313c3/`, com o cwd no worktree do objeto (o head do PR, a merge-base, os check-runs e os não verdes), medido por: `cd C:/Users/AMP/w-san313 && bash C:/Users/AMP/erp-pausa-2026-10-03/redator-san313c3/mandato-refs.sh 460`
```
# refs do PR #460 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato
# gerado em: 2026-10-25T22:21Z · repo: thiagodorgo/ERP_Techsolutios

ramo:            fix/mobile-minhas-os
base:            origin/main
estado:          OPEN | rascunho=false | MERGEABLE
head do PR:      f382422514fb2bd0f8363a191a46035c4cf7e865
merge-base:      b08c755719a6cb0ed192fa04e549ac5fc67a3e67
merge commit:    <ainda nao mergeado>
check-runs:      total=14 nao-verdes=0 pendentes=0
approved_head:   AUSENTE — nenhuma ata nomeia nem menciona #460
                 (a junta nao votou, ou a ata nao esta em origin/main nem no head do PR)

```

O ramo remoto aponta para o mesmo SHA que o PR declara como head (segunda fonte do objeto), medido por: `git -C C:/Users/AMP/w-san313 ls-remote origin refs/heads/fix/mobile-minhas-os`
```
f382422514fb2bd0f8363a191a46035c4cf7e865	refs/heads/fix/mobile-minhas-os
```

Os check-runs do head do PR estão todos concluídos e `SUCCESS` (o total, os fora de `COMPLETED`/`SUCCESS` e os nomes com a conclusão, pelo `statusCheckRollup`), e os runs do workflow `ci` no objeto do ciclo 3, um por gatilho (`pull_request` e `push`); os ids de run não são citados aqui (corrida numérica longa é cobrada como SHA pelo pré-voo) e se obtêm por `gh run list --commit`, medido por: `cd C:/Users/AMP/w-san313 && gh pr view 460 --json headRefOid,statusCheckRollup --jq '.headRefOid, (.statusCheckRollup|length), ([.statusCheckRollup[] | select(.status != "COMPLETED" or .conclusion != "SUCCESS")] | length), ([.statusCheckRollup[] | .name + ":" + .conclusion] | sort | join(", "))'; gh run list --commit f382422514fb2bd0f8363a191a46035c4cf7e865 --json workflowName,event,status,conclusion,headSha --jq '.[] | .workflowName + " " + .event + " " + .status + " " + .conclusion + " " + .headSha'`
```
f382422514fb2bd0f8363a191a46035c4cf7e865
14
0
authority-portal:SUCCESS, authority-portal:SUCCESS, backend-postgres:SUCCESS, backend-postgres:SUCCESS, backend:SUCCESS, backend:SUCCESS, docker:SUCCESS, docker:SUCCESS, flutter:SUCCESS, flutter:SUCCESS, frontend:SUCCESS, frontend:SUCCESS, owner-portal:SUCCESS, owner-portal:SUCCESS
ci pull_request completed success f382422514fb2bd0f8363a191a46035c4cf7e865
ci push completed success f382422514fb2bd0f8363a191a46035c4cf7e865
```

O worktree `C:/Users/AMP/w-san313` está no objeto do ciclo 3 e sem modificação rastreada (0 linhas no status sem não rastreados); os não rastreados são os diretórios de votos do ciclo 1, do ciclo 2 e deste ciclo (os registros das reprovações dos ciclos 1 e 2 passaram a ser rastreados no conserto); por isso as leituras de arquivo deste mandato, feitas no disco desse worktree com caminho absoluto e com o CR retirado, leem o conteúdo do objeto (o `sed` do comando põe o prefixo do worktree no caminho que o `git status` imprime), medido por: `git -C C:/Users/AMP/w-san313 rev-parse HEAD; git -C C:/Users/AMP/w-san313 status --porcelain --untracked-files=no | wc -l; git -C C:/Users/AMP/w-san313 status --short | sed -E 's#^(..) (.*)#\1 C:/Users/AMP/w-san313/\2#'`
```
f382422514fb2bd0f8363a191a46035c4cf7e865
0
?? C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13-ciclo2/
?? C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13-ciclo3/
?? C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13/
```

O objeto do ciclo 2 é `<objeto>~4`: é ancestral do objeto, e o SHA dele aparece no registro da reprovação do ciclo 2 e no voto da C3 do ciclo 2 (a contagem de linhas que o citam, sem publicá-lo); dele ao objeto há 4 commits de primeiro pai e nenhum merge (o assunto de cada um abaixo, do mais novo ao mais velho); o delta do conserto é a lista de caminhos abaixo, e nenhum caminho de código, teste, KPI, `PLANO_SAN3.md`, `pendencias.md` ou `decisoes.md` (as duas últimas linhas contam o CA-c3-4 do plano na forma de pathspec: desde o objeto do ciclo 2, tem de dar 0; desde o head-base, o controle de que o filtro pega código); o `sed` põe o prefixo do worktree no caminho impresso, medido por: `cd C:/Users/AMP/w-san313 && git merge-base --is-ancestor f382422514fb2bd0f8363a191a46035c4cf7e865~4 f382422514fb2bd0f8363a191a46035c4cf7e865 && echo 'objeto do ciclo 2 ancestral do objeto'; S2=$(git rev-parse f382422514fb2bd0f8363a191a46035c4cf7e865~4); echo "R-ciclo2 cita: $(grep -c -i "$S2" C:/Users/AMP/w-san313/agent-orchestration/omega/reprovacoes/R-B-SAN3-13-ciclo2.md) · c3-voto do ciclo 2 cita: $(grep -c -i "$S2" C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13-ciclo2/c3-voto.json)"; git rev-list --first-parent --count f382422514fb2bd0f8363a191a46035c4cf7e865~4..f382422514fb2bd0f8363a191a46035c4cf7e865; git rev-list --merges --count f382422514fb2bd0f8363a191a46035c4cf7e865~4..f382422514fb2bd0f8363a191a46035c4cf7e865; git log --first-parent --format=%s f382422514fb2bd0f8363a191a46035c4cf7e865~4..f382422514fb2bd0f8363a191a46035c4cf7e865; git diff --name-only f382422514fb2bd0f8363a191a46035c4cf7e865~4 f382422514fb2bd0f8363a191a46035c4cf7e865 | sed -e 's#^#C:/Users/AMP/w-san313/#'; for b in f382422514fb2bd0f8363a191a46035c4cf7e865~4 f382422514fb2bd0f8363a191a46035c4cf7e865~23; do echo "CA-c3-4 (código, teste, Kpis, PLANO_SAN3, pendencias, decisoes) desde $( [ "$b" = f382422514fb2bd0f8363a191a46035c4cf7e865~4 ] && echo 'objeto~4' || echo 'objeto~23, controle'): $(git diff --name-only "$b" f382422514fb2bd0f8363a191a46035c4cf7e865 -- src tests prisma frontend mobile scripts .github Kpis C:/Users/AMP/w-san313/docs/revisoes/SAN3/PLANO_SAN3.md C:/Users/AMP/w-san313/agent-orchestration/controle/pendencias.md C:/Users/AMP/w-san313/agent-orchestration/controle/decisoes.md | wc -l)"; done`
```
objeto do ciclo 2 ancestral do objeto
R-ciclo2 cita: 1 · c3-voto do ciclo 2 cita: 1
4
0
docs(registro): ciclo 3 do B-SAN3-13 — relatório do dev (CA-c3-1..4)
docs(contracts): GET /work-orders — motivos invalid_scope/invalid_open_only e do 503 no contrato (B-SAN3-13, ciclo 3)
docs(registro): R-B-SAN3-13-ciclo1 e ciclo2 — registros das reprovações da junta (B-SAN3-13)
docs(plano): ciclo 3 do B-SAN3-13 — plano de resolução da reprovação da junta de dado (C3-01)
C:/Users/AMP/w-san313/agent-orchestration/omega/reprovacoes/R-B-SAN3-13-ciclo1.md
C:/Users/AMP/w-san313/agent-orchestration/omega/reprovacoes/R-B-SAN3-13-ciclo2.md
C:/Users/AMP/w-san313/docs/claude-code-handoff/API_CONTRACTS.md
C:/Users/AMP/w-san313/docs/revisoes/SAN3/B-SAN3-13-dev.md
C:/Users/AMP/w-san313/docs/revisoes/SAN3/B-SAN3-13-plano.md
CA-c3-4 (código, teste, Kpis, PLANO_SAN3, pendencias, decisoes) desde objeto~4: 0
CA-c3-4 (código, teste, Kpis, PLANO_SAN3, pendencias, decisoes) desde objeto~23, controle: 45
```

O head-base do vermelho-controle do bloco é `<objeto>~23` (o ponto em que o ramo saiu da `main`: o merge do B-TRC-02, PR 454), ancestral da merge-base; a merge-base do objeto com a `origin/main` deste worktree é a do `mandato-refs.sh`; o ramo tem 23 commits de primeiro pai desde o head-base e um único merge, `<objeto>~13`, cujo segundo pai é a merge-base (o assunto de cada um abaixo); SHA que não sai do `mandato-refs.sh 460` não se publica, e por isso o head-base é citado como `<objeto>~23` e o objeto do ciclo 2 como `<objeto>~4` (no ciclo 2 eles eram `~19` e o próprio objeto; o merge era `~9`), medido por: `cd C:/Users/AMP/w-san313 && git log -1 --format=%s f382422514fb2bd0f8363a191a46035c4cf7e865~23; git merge-base --is-ancestor f382422514fb2bd0f8363a191a46035c4cf7e865~23 b08c755719a6cb0ed192fa04e549ac5fc67a3e67 && echo 'head-base ancestral da merge-base'; git merge-base f382422514fb2bd0f8363a191a46035c4cf7e865 origin/main; git rev-list --first-parent --count f382422514fb2bd0f8363a191a46035c4cf7e865~23..f382422514fb2bd0f8363a191a46035c4cf7e865; git rev-list --first-parent --merges --count f382422514fb2bd0f8363a191a46035c4cf7e865~23..f382422514fb2bd0f8363a191a46035c4cf7e865; git log -1 --format=%s f382422514fb2bd0f8363a191a46035c4cf7e865~13; test "$(git rev-parse f382422514fb2bd0f8363a191a46035c4cf7e865~13^2)" = b08c755719a6cb0ed192fa04e549ac5fc67a3e67 && echo 'segundo pai do merge = merge-base'`
```
feat(traccar): eventos da viatura e telemetria veicular pelo event.forward, com migração transacional e RLS forçado (B-TRC-02) (#454)
head-base ancestral da merge-base
b08c755719a6cb0ed192fa04e549ac5fc67a3e67
23
1
chore(merge): origin/main (#458) no ramo do B-SAN3-13 — registros apensados nas duas ordens, índice regenerado
segundo pai do merge = merge-base
```

As duas ferramentas do pré-voo na pasta do redator do ciclo 3 são as do ramo `origin/chore/mandato-refs-e-preflight` com uma única diferença, a linha do `RAIZ` do `mandato-preflight.sh`, fixada em `C:/Users/AMP/w-trc02` (a adaptação do B-TRC-02), e são byte a byte as da pasta do redator do ciclo 2; esse `RAIZ` não existe mais no disco, logo a checagem 6 do pré-voo não acharia caminho relativo nenhum, e por isso este mandato cita todo caminho do repositório ABSOLUTO no worktree do objeto (a checagem 6 não confere caminho absoluto, fronteira declarada no cabeçalho do pré-voo; a existência de cada um sai das leituras medidas neste mandato), medido por: `cd C:/Users/AMP/Documents/GitHub/ERP_Techsolutios && for b in mandato-refs.sh mandato-preflight.sh; do bl=$(git ls-tree -r origin/chore/mandato-refs-e-preflight -- scripts | awk -v b="$b" '$4 ~ ("/" b "$") {print $3}'); diff <(git cat-file blob "$bl") C:/Users/AMP/erp-pausa-2026-10-03/redator-san313c3/$b | grep -i -E '^[<>]'; echo "$b linhas-diferentes=$(diff <(git cat-file blob "$bl") C:/Users/AMP/erp-pausa-2026-10-03/redator-san313c3/$b | grep -c -i -E '^[<>]')"; cmp -s C:/Users/AMP/erp-pausa-2026-10-03/redator-san313c3/$b C:/Users/AMP/erp-pausa-2026-10-03/redator-san313c2/$b && echo "$b igual ao do redator do ciclo 2"; done; test -d C:/Users/AMP/w-trc02 && echo 'RAIZ existe' || echo 'RAIZ ausente: C:/Users/AMP/w-trc02'`
```
mandato-refs.sh linhas-diferentes=0
mandato-refs.sh igual ao do redator do ciclo 2
< RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
> RAIZ=C:/Users/AMP/w-trc02
mandato-preflight.sh linhas-diferentes=2
mandato-preflight.sh igual ao do redator do ciclo 2
RAIZ ausente: C:/Users/AMP/w-trc02
```

A régua deste ciclo no contrato do objeto: do §C7 item 8, as regras (1) junta proporcional ao risco, (2) teto de 2 ciclos (a partir do ciclo 3, só defeito de produto grave bloqueia) e (3) menos burocracia; do §C7 item 9, as regras (0) `arquivos_medidos` em todo voto, (1) a cadeira verde que carrega, (2) a revalidação por identidade nova e (3) a cadeira vermelha refeita (linha e começo de cada regra; e a linha da régua do ciclo 3), medido por: `tr -d '\r' < C:/Users/AMP/w-san313/CLAUDE.md | grep -n -i -o -E '\*\*\((0|1|2|3)\) [^*]{0,60}'; tr -d '\r' < C:/Users/AMP/w-san313/CLAUDE.md | grep -n -i -E -B1 'defeito de produto grave\*\*: perde dado, vaza dado entre organizações, quebra permissão ou erra dinheiro' | cut -c1-140`
```
759:**(1) Junta proporcional ao risco.
763:**(2) Teto de 2 ciclos.
768:**(3) Menos burocracia.
821:**(0) Todo voto de cadeira declara `arquivos_medidos`:
825:**(1) A cadeira verde carrega o voto
829:**(2) Se o conserto tocar o escopo dela,
832:**(3) A cadeira vermelha é refeita
763-   - **(2) Teto de 2 ciclos.** Nos ciclos 1 e 2 a junta funciona como hoje. **A partir do ciclo 3, só bloqueia
764:     defeito de produto grave**: perde dado, vaza dado entre organizações, quebra permissão ou erra dinheiro. Todo
```

Carga das cadeiras verdes pela regra (1) do §C7 item 9, pelos dois comandos do §F do plano do ciclo 3 (na forma de pathspec, do objeto do ciclo 2 `<objeto>~4` ao objeto; os dois têm de sair vazios) e pelo cruzamento mecânico de `git diff --name-only <objeto>~4 <objeto>` com o `arquivos_medidos` de cada voto do ciclo 2 (o script do redator `C:/Users/AMP/erp-pausa-2026-10-03/redator-san313c3/intersecao.js` converte cada glob em expressão regular e imprime quantos globs o voto declara, se há `**` e a interseção): C1 e C2b declaram globs sem `**`, a interseção é vazia, e os dois votos CARREGAM, referidos ao objeto, medido por: `cd C:/Users/AMP/w-san313 && echo "C1 §F: [$(git diff --name-only f382422514fb2bd0f8363a191a46035c4cf7e865~4..f382422514fb2bd0f8363a191a46035c4cf7e865 -- src prisma tests frontend scripts .github | tr '\n' ' ')]"; echo "C2b §F: [$(git diff --name-only f382422514fb2bd0f8363a191a46035c4cf7e865~4..f382422514fb2bd0f8363a191a46035c4cf7e865 -- mobile/flutter_app C:/Users/AMP/w-san313/agent-orchestration/controle/pendencias.md | tr '\n' ' ')]"; for c in c1 c2b; do echo "$c: $(node -e 'const v=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")); console.log("voto="+v.voto)' C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13-ciclo2/$c-voto.json)"; node C:/Users/AMP/erp-pausa-2026-10-03/redator-san313c3/intersecao.js C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13-ciclo2/$c-voto.json f382422514fb2bd0f8363a191a46035c4cf7e865~4 f382422514fb2bd0f8363a191a46035c4cf7e865; done`
```
C1 §F: []
C2b §F: []
c1: voto=APROVADO
globs unicos=23 tem_**=false
diff=5 intersecao=0 []
c2b: voto=APROVADO
globs unicos=10 tem_**=false
diff=5 intersecao=0 []
```

A C3 do ciclo 2 é a vermelha (REPROVADO) e declara `arquivos_medidos: ["**"]` (escopo total, que nunca carrega pela regra (1)): é REFEITA neste ciclo por `jurado-san313-c3c-opus` (§C7 item 9 (3)); o diretório de votos do ciclo 2 tem um voto e uma evidência por cadeira (C1, C2b, C3) e o parecer do inspetor do ciclo 2, medido por: `node -e 'const v=JSON.parse(require("fs").readFileSync("C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13-ciclo2/c3-voto.json","utf8")); console.log("c3 voto="+v.voto+" arquivos_medidos="+JSON.stringify(v.arquivos_medidos))'; ls C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13-ciclo2 | sed -e 's#^#C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13-ciclo2/#'`
```
c3 voto=REPROVADO arquivos_medidos=["**"]
C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13-ciclo2/00-mandatos
C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13-ciclo2/c1-evidencia.md
C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13-ciclo2/c1-voto.json
C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13-ciclo2/c2b-evidencia.md
C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13-ciclo2/c2b-voto.json
C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13-ciclo2/c3-evidencia.md
C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13-ciclo2/c3-voto.json
C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13-ciclo2/insp-san313c2-evidencia.md
C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13-ciclo2/insp-san313c2-parecer.md
```

O corpo da C3 no objeto é IDÊNTICO entre os dois espelhos descontado o bloco Codex (EOL-neutro), o ciclo 3 não mexeu em corpo (0 caminho de agentes no delta), e o S0 (`sync-agent-agents.mjs --check`) passa num worktree descartável no objeto, `C:/Users/AMP/j13c3-insp-s0`, criado e removido pelo próprio comando (a última linha confirma a remoção), medido por: `cd C:/Users/AMP/w-san313 && c=c3-regressao-escopo-registro; diff <(tr -d '\r' < C:/Users/AMP/w-san313/.claude/agents/especialistas/jurado-san313-$c.md | awk 'f; $0=="---"{n++; if(n==2) f=1}' | sed '/^$/d') <(tr -d '\r' < C:/Users/AMP/w-san313/.agents/agents/especialistas/jurado-san313-$c.md | awk 'f; $0=="---"{n++; if(n==2) f=1}' | awk 'index($0,"Papel para o Codex"){s=1} s&&$0==""{s=0; next} !s' | sed '/^$/d') >/dev/null && echo "IDENTICO corpo $c" || echo "DIVERGE corpo $c"; echo "caminhos de agentes no delta do ciclo 3: $(git diff --name-only f382422514fb2bd0f8363a191a46035c4cf7e865~4 f382422514fb2bd0f8363a191a46035c4cf7e865 -- .claude .agents | wc -l)"; git worktree add --detach C:/Users/AMP/j13c3-insp-s0 f382422514fb2bd0f8363a191a46035c4cf7e865 >/dev/null 2>&1; node C:/Users/AMP/j13c3-insp-s0/scripts/sync-agent-agents.mjs --check; echo "sync ec=$?"; git worktree remove --force C:/Users/AMP/j13c3-insp-s0; test -d C:/Users/AMP/j13c3-insp-s0 && echo 'worktree S0 FICOU' || echo 'worktree S0 removido'`
```
IDENTICO corpo c3-regressao-escopo-registro
caminhos de agentes no delta do ciclo 3: 0
[agents-sync] OK — 85 agentes, espelho consistente.
sync ec=0
worktree S0 removido
```

O corpo do inspetor de terreno fixa `model: opus` no frontmatter nos dois espelhos, no objeto, medido por: `for f in C:/Users/AMP/w-san313/.claude/agents/inspetor-de-terreno-da-junta.md C:/Users/AMP/w-san313/.agents/agents/inspetor-de-terreno-da-junta.md; do echo "$f $(tr -d '\r' < $f | grep -i -E '^model:')"; done`
```
C:/Users/AMP/w-san313/.claude/agents/inspetor-de-terreno-da-junta.md model: opus
C:/Users/AMP/w-san313/.agents/agents/inspetor-de-terreno-da-junta.md model: opus
```

Os insumos do briefing do ciclo 3: no objeto, a seção do ciclo 3 do plano (auditoria §A, texto do contrato §B, escopo §C, notas §D, critérios §E, cadeiras §F, perguntas §G, riscos §H), a seção do ciclo 3 do relatório do dev e o registro da reprovação do ciclo 2 (agora rastreado); fora do objeto, não rastreados, o voto e a evidência de cada cadeira do ciclo 2 e o parecer do inspetor do ciclo 2 (linha e começo de cada seção; contagem de linhas de cada arquivo), medido por: `tr -d '\r' < C:/Users/AMP/w-san313/docs/revisoes/SAN3/B-SAN3-13-plano.md | grep -n -i -o -E '^## Ciclo 3[^(]{0,30}|^### [A-H]\. [^(]{0,40}' | awk -F: '$1>=565'; tr -d '\r' < C:/Users/AMP/w-san313/docs/revisoes/SAN3/B-SAN3-13-dev.md | grep -n -i -o -E '^## Ciclo 3.{0,30}'; for f in C:/Users/AMP/w-san313/agent-orchestration/omega/reprovacoes/R-B-SAN3-13-ciclo2.md C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13-ciclo2/c1-voto.json C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13-ciclo2/c1-evidencia.md C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13-ciclo2/c2b-voto.json C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13-ciclo2/c2b-evidencia.md C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13-ciclo2/c3-voto.json C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13-ciclo2/c3-evidencia.md C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13-ciclo2/insp-san313c2-parecer.md; do echo "$f $(wc -l < $f)"; done`
```
565:## Ciclo 3 — plano de resolução
569:### A. Auditoria do C3-01 — defeito real, NÃ
581:### B. Texto exato do contrato
588:### C. PERMITIDO / PROIBIDO do ciclo 3
593:### D. C3-02, C3-03, C3-04 — nada a fazer
598:### E. Critério de aceite do ciclo 3
607:### F. Cadeiras do ciclo 3
616:### G. Perguntas ao dono: **nenhuma.** Não há
618:### H. Riscos do ciclo 3
332:## Ciclo 3 (dev-san313-c3-sol)
C:/Users/AMP/w-san313/agent-orchestration/omega/reprovacoes/R-B-SAN3-13-ciclo2.md 12
C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13-ciclo2/c1-voto.json 45
C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13-ciclo2/c1-evidencia.md 108
C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13-ciclo2/c2b-voto.json 102
C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13-ciclo2/c2b-evidencia.md 105
C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13-ciclo2/c3-voto.json 136
C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13-ciclo2/c3-evidencia.md 96
C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13-ciclo2/insp-san313c2-parecer.md 47
```

Os critérios de aceite do ciclo 3 são CA-c3-1 a CA-c3-5 (a lista abaixo, gerada da seção do ciclo 3 do plano), e cada um aparece nas linhas `Item` do mandato da C3 refeita deste diretório (a lista por item e a união): CA-c3-1 a CA-c3-3 no item 1, CA-c3-4 no item 2, CA-c3-5 no item 3, medido por: `tr -d '\r' < C:/Users/AMP/w-san313/docs/revisoes/SAN3/B-SAN3-13-plano.md | awk 'index($0,"## Ciclo 3 — plano de resolu")==1{f=1} f' | grep -o -i -E '\bCA-c3-[0-9]+\b' | sort -u | tr '\n' ' '; echo; tr -d '\r' < C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13-ciclo3/00-mandatos/cadeira-c3c.md | grep -i -E '^Item [0-9] de 3' | while read -r l; do echo "$(echo "$l" | cut -c1-11): $(echo "$l" | grep -o -i -E '\bCA-c3-[0-9]+\b' | sort -u | tr '\n' ' ')"; done; echo "união: $(tr -d '\r' < C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13-ciclo3/00-mandatos/cadeira-c3c.md | grep -i -E '^Item [0-9] de 3' | grep -o -i -E '\bCA-c3-[0-9]+\b' | sort -u | wc -l) distintos"`
```
CA-c3-1 CA-c3-2 CA-c3-3 CA-c3-4 CA-c3-5
Item 1 de 3: CA-c3-1 CA-c3-2 CA-c3-3
Item 2 de 3: CA-c3-4
Item 3 de 3: CA-c3-5
união: 5 distintos
```

O delta do conserto contra o PERMITIDO do §C do plano do ciclo 3, por pathspec com exclusões absolutas: 0 caminho fora (o contrato, o relatório do dev, o plano, `C:/Users/AMP/w-san313/agent-orchestration/omega/**`, corpos de jurado nos dois espelhos); a lista dos caminhos está na unidade do delta, acima, e a frase "Sem merge da `main` no ramo durante o ciclo 3" está no plano (linha e trecho), medido por: `cd C:/Users/AMP/w-san313 && echo "fora do PERMITIDO: $(git diff --name-only f382422514fb2bd0f8363a191a46035c4cf7e865~4 f382422514fb2bd0f8363a191a46035c4cf7e865 -- . ':!C:/Users/AMP/w-san313/docs/claude-code-handoff/API_CONTRACTS.md' ':!C:/Users/AMP/w-san313/docs/revisoes/SAN3/B-SAN3-13-plano.md' ':!C:/Users/AMP/w-san313/docs/revisoes/SAN3/B-SAN3-13-dev.md' ':!C:/Users/AMP/w-san313/agent-orchestration/omega' ':!C:/Users/AMP/w-san313/.claude/agents' ':!C:/Users/AMP/w-san313/.agents/agents' | wc -l)"; tr -d '\r' < C:/Users/AMP/w-san313/docs/revisoes/SAN3/B-SAN3-13-plano.md | grep -n -i -o -E 'Sem merge da `main` no ramo durante o ciclo 3'`
```
fora do PERMITIDO: 0
590:Sem merge da `main` no ramo durante o ciclo 3
```

Identidades que planejaram, criticaram, mediram, desenvolveram, acharam, redigiram e fabricaram neste bloco, GERADAS dos arquivos de registro do diff do bloco (do head-base `<objeto>~23` ao objeto, lidos no disco do worktree no objeto, inclusive os registros das reprovações dos ciclos 1 e 2, agora rastreados) e do parecer do inspetor do ciclo 2 (piso da inelegibilidade, não teto): o ciclo 3 acrescenta `planejador-san313-c3-fable`, `dev-san313-c3-opus` e `dev-san313-c3-sol`; `dev-san313-pg` é nome de container e `insp-san313-parecer` é nome de arquivo, medido por: `cd C:/Users/AMP/w-san313 && for f in $(git diff --name-only f382422514fb2bd0f8363a191a46035c4cf7e865~23 f382422514fb2bd0f8363a191a46035c4cf7e865 -- docs/revisoes/SAN3 agent-orchestration .claude .agents) C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13-ciclo2/insp-san313c2-parecer.md; do tr -d '\r' < "$f"; done | grep -o -i -E '\b(planejador|crit|critico|dev|rev|fab|fabrica|inspetor|insp|redator|jurado|argon|med|medidor)-san3?-?13[a-z0-9-]*|planejador-mestre' | sed -E 's#-+$##' | sort -u`
```
PLANEJADOR-MESTRE
crit-san313
crit-san313-argon
crit-san313-opus
crit-san313-opus-r2
crit-san313-pro-r2
dev-san313
dev-san313-c2-opus
dev-san313-c3-opus
dev-san313-c3-sol
dev-san313-opus
dev-san313-pg
fab-san313-opus
insp-san313-parecer
inspetor-san313-opus
inspetor-san313c2-opus
jurado-san313
jurado-san313-c1-escopo-e-cursor
jurado-san313-c1-opus
jurado-san313-c2-app-nunca-perde
jurado-san313-c2-opus
jurado-san313-c2b-opus
jurado-san313-c3-opus
jurado-san313-c3-regressao-escopo-registro
med-san313-argon
planejador-mestre
planejador-san313-c2-fable
planejador-san313-c3-fable
planejador-san313-fable
redator-san313-opus
redator-san313c2
redator-san313c2-opus
```

As identidades novas deste ciclo (o inspetor, a C3 refeita e o redator destes mandatos) não aparecem em arquivo rastreado nenhum do objeto (contagem de arquivos rastreados que as citam, pela busca do git no worktree que está no objeto), medido por: `git -C C:/Users/AMP/w-san313 grep -l -i -E 'inspetor-san313c3-opus|jurado-san313-c3c-opus|redator-san313c3-opus' | wc -l`
```
0
```

Resíduo que ocupe nome, porta ou caminho desta junta no instante da redação: nenhum container com `san313` ou `j13` no nome (vivo ou parado), nenhum caminho `C:/Users/AMP/j13*`, o único worktree registrado com esses radicais é o do objeto, e as pastas de sondas dos ciclos 1 e 2 (roteiros P3) são as listadas, medido por: `echo "containers san313/j13: $(docker ps -a --format '{{.Names}}' | grep -c -i -E 'san313|j13')"; echo "caminhos j13: $(ls -d C:/Users/AMP/j13* 2>/dev/null | wc -l)"; git -C C:/Users/AMP/Documents/GitHub/ERP_Techsolutios worktree list --porcelain | grep -i -E '^worktree .*(j13|san313)'; ls -d C:/Users/AMP/erp-pausa-2026-10-03/j13* 2>/dev/null`
```
containers san313/j13: 0
caminhos j13: 0
worktree C:/Users/AMP/w-san313
C:/Users/AMP/erp-pausa-2026-10-03/j13-c2
C:/Users/AMP/erp-pausa-2026-10-03/j13-plan-c2
C:/Users/AMP/erp-pausa-2026-10-03/j13c2-c1
C:/Users/AMP/erp-pausa-2026-10-03/j13c2-c2
C:/Users/AMP/erp-pausa-2026-10-03/j13c2-c3
```

Memória de commit livre em GB (a P8 (c) exige pelo menos 4 antes de lançar agente), os trabalhos Docker vivos fora da base `erp-*` (o teto é 2) e o disco livre em `C:` (a ordem do orquestrador para este ciclo: PARE abaixo de 7 GB), no instante da redação: quem for executar mede de novo antes de começar, medido por: `powershell.exe -NoProfile -Command '$o=Get-CimInstance Win32_PerfFormattedData_PerfOS_Memory; [math]::Round(($o.CommitLimit-$o.CommittedBytes)/1GB,2)'; docker ps --format '{{.Names}}' | grep -v -i -E '^erp-' | sed -E 's#-(pg|redis|run|net)$##' | sort -u; echo "trabalhos fora de erp: $(docker ps --format '{{.Names}}' | grep -v -i -E '^erp-' | sed -E 's#-(pg|redis|run|net)$##' | sort -u | wc -l)"; df -h /c | tail -1 | awk '{print "livre em C: " $4}'`
```
14,52
trabalhos fora de erp: 0
livre em C: 9.8G
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

Você é `inspetor-san313c3-opus` (identidade nova; o orquestrador confirma no disparo). Executor: **Codex GPT-5.6 Sol, ou Claude Opus se o Codex estiver sem limite, declarado no disparo** (o Codex volta às 20:13 de Brasília); nível menor DECLARADO nos dois casos (o `model: opus` do frontmatter de `inspetor-de-terreno-da-junta`, medido acima; o Sol é o equivalente do Codex, §C7.6-bis), corpo carregado do blob do objeto (`C:/Users/AMP/w-san313/.claude/agents/inspetor-de-terreno-da-junta.md` no Claude, ou o espelho `C:/Users/AMP/w-san313/.agents/agents/inspetor-de-terreno-da-junta.md` no Codex, no worktree que está no objeto). **Opus ou Sol esgotado: PARE** e registre onde parou (§C7.6-bis; nunca outro modelo). Declare executor efetivo, modelo, nível, objeto, `mandato_md5` deste arquivo (CR retirado antes do md5) e IDENTICO/DIVERGE do seu corpo carregado contra o blob, EOL-neutro, na primeira linha de `insp-san313c3-evidencia.md`. Você não vota nem julga mérito: julga se o tabuleiro está limpo (§C7.1-bis), fail-closed. A seção do ciclo 3 do plano, o relatório do dev do ciclo 3, o registro da reprovação do ciclo 2, o parecer do inspetor do ciclo 2 e o mandato da C3 refeita são **A RE-VERIFICAR**. Régua da junta que você libera: bloco de DADO, **unanimidade de 3 com veto** (§C7 item 8(1)), referida ao objeto e formada por C1 carregado + C2b carregado + C3 refeita (§C7 item 9 (4)); **ciclo 3**, em que só defeito de produto grave reprova (§C7 item 8(2)), derruba com: `head -1 C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13-ciclo3/insp-san313c3-evidencia.md | grep -i -E 'executor|Opus|Sol|mandato_md5|objeto|IDENTICO|DIVERGE'`

Item 1 de 3 (objeto, CI, delta do conserto, mandato, corpo, S0): resolva o objeto por `git ls-remote origin refs/heads/fix/mobile-minhas-os` e por `gh pr view 460 --json headRefOid`; confira que o objeto do ciclo 2 é `<objeto>~4`, que o delta do conserto (os 4 commits, sem merge, medidos acima) fica dentro do PERMITIDO do §C do plano do ciclo 3 (medido acima pelo nome: 0 fora; meça por caminho completo) e que o CA-c3-4 sai vazio (caminho fora = escopo violado, bloqueia); todos os check-runs concluídos e verdes no SHA, nos dois gatilhos (ausência, `queued` ou `cancelled` bloqueia o start); rode o pré-voo do mandato da C3 refeita e deste até `PRE-VOO OK` com as ferramentas da pasta `C:/Users/AMP/erp-pausa-2026-10-03/redator-san313c3/` (o `RAIZ` dela aponta para um worktree que não existe mais, medido acima: por isso os caminhos dos mandatos são absolutos, e a existência de cada um é sua a conferir), e confira que toda unidade de MEDIDO tem a saída do comando colada (unidade sem saída bloqueia); confira no objeto, EOL-neutro e descontado o bloco Codex, o corpo da C3 nos dois espelhos, que o ciclo 3 não mexeu em corpo (medido acima) e que o corpo que a cadeira carregar é o blob do objeto; reexecute o S0 (`sync-agent-agents.mjs --check`) num worktree descartável seu no objeto. Head que andou depois do disparo bloqueia até novo pré-voo, derruba com: `grep -i -E 'Item 1|check-runs|delta|PERMITIDO|CA-c3-4|fora|PRE-VOO|sem saída|corpo|espelho|S0|LIBERADO|BLOQUEADO' C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13-ciclo3/insp-san313c3-parecer.md`

Item 2 de 3 (a carga das cadeiras verdes e a composição do quórum, §C7 item 9): confira **por comando seu** a regra (1) para cada cadeira verde — `git diff --name-only <objeto>~4..<objeto>` (do objeto que a cadeira mediu, o do ciclo 2, ao objeto novo) cruzado com o `arquivos_medidos` do voto dela: C1 (`jurado-san313-c1-opus`, APROVADO) e C2b (`jurado-san313-c2b-opus`, APROVADO), com os dois comandos do §F do plano do ciclo 3 e o cruzamento glob a glob (medidos acima: interseção vazia nos dois, nenhum `**`); interseção vazia = voto CARREGADO, referido ao objeto; interseção não vazia, ou voto sem o campo, ou com `**` = a cadeira vai à regra (2) (identidade nova re-executa só os comandos registrados na evidência dela, sobre o objeto novo) e a junta não começa sem isso; se o orquestrador tocar `pendencias.md` antes da junta, a C2b cai na regra (2) pelo §F; a C3 do ciclo 2 (vermelha, `**`, medido acima) é REFEITA por `jurado-san313-c3c-opus`, com a régua do ciclo 3. Registre, para a ata, por cadeira, carregado, revalidado ou refeito e o comando que o prova (voto carregado sem comando não é insumo, §C7 item 9 (4)). Confira que **todo** CA-c3-1..CA-c3-5 do §E tem item dono no mandato da C3 refeita (a distribuição medida acima é piso) e que as notas C3-02, C3-03 e C3-04 estão tratadas como notas pelo §D (sem pendência e sem cadeira). CA sem dono, carga sem comando ou cadeira verde cujo escopo foi tocado sem revalidação bloqueia, derruba com: `grep -i -E 'Item 2|regra \(1\)|regra \(2\)|arquivos_medidos|interseção|carregad|revalidad|refeit|c1-voto|c2b-voto|c3c|pendencias|CA-c3-1|CA-c3-5|C3-02|C3-04|sem dono|quórum' C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13-ciclo3/insp-san313c3-parecer.md`

Item 3 de 3 (identidades, papéis, briefing e terreno): regenere por comando seu a lista de inelegíveis (a medida acima é piso) e confira por nome que nem `inspetor-san313c3-opus` nem `jurado-san313-c3c-opus` coincide com os inelegíveis do ciclo 2 — `planejador-mestre`, `planejador-san313-fable`, `planejador-san313-c2-fable`, `crit-san313-opus`, `crit-san313-opus-r2`, `crit-san313-argon`, `crit-san313-pro-r2`, `med-san313-argon`, `dev-san313-opus`, `dev-san313-c2-opus`, `fab-san313-opus`, `redator-san313-opus`, `redator-san313c2-opus`, `inspetor-san313-opus`, `jurado-san313-c2-opus`, `jurado-san313-c1-sol`, `jurado-san313-c2-sol`, `jurado-san313-c3-sol`, `jurado-san313-c1-opus`, `jurado-san313-c2b-opus` — nem com os do ciclo 3: `jurado-san313-c3-opus` (achou C3-01), `planejador-san313-c3-fable` (auditou e planejou, topo em Fable, `D-TOPO-NO-PLANO-E-EM-TODA-REPROVACAO`), `dev-san313-c3-opus` (consertou; o cabeçalho da seção do dev o chama de `dev-san313-c3-sol`, a conferir), `redator-san313c3-opus` (adaptou estes mandatos e executou as medições), `inspetor-san313c2-opus` e o orquestrador, nem entre si. Separação de papéis do §C7.4-bis por nome: quem achou ≠ quem auditou e planejou ≠ quem desenvolveu ≠ quem julga. Declare a composição por executor (C1 e C2b rodaram em Claude Opus; a C3 refeita roda no executor declarado no disparo) e a monocultura, se houver. Confira a PRESENÇA no briefing (medida acima): a seção do ciclo 3 do plano, a do relatório do dev, o registro da reprovação do ciclo 2, e a evidência da C3 do ciclo 2 como roteiro P3 da C3 refeita. Terreno: a árvore `C:/Users/AMP/w-san313` no objeto e sem mutação viva, admitindo como não rastreados só os diretórios de votos dos ciclos 1, 2 e 3 (e os que o orquestrador declarar); worktree próprio da C3 refeita, `C:/Users/AMP/j13c3-c3-wt`, zero junction de `node_modules` (§C7.1-ter(c)); a C3 refeita não sobe Docker nem Postgres (proposta do redator, a julgar: os itens dela são leituras de git, `cmp` e check-runs); qualquer resíduo (no instante da redação, medido acima) reportado, nunca varrido; as pastas de sondas dos ciclos 1 e 2 ficam. Antes do lançamento: memória de commit livre ≥ 4 GB (P8 (c)) e disco ≥ 7 GB (ordem do orquestrador: abaixo disso, PARE); base viva e as portas 5432, 6379, 3000, 5173, 5050, 8899, 55432 proibidas. Declare baseline honesto do terreno, plano de perda de jurado (P3, sucessor de identidade nova; Opus ou Sol esgotado = PARA, §C7.6-bis) e a ordem: só a C3 refeita vota neste ciclo, derruba com: `grep -i -E 'Item 3|ineleg|jurado-san313-c3-opus|planejador-san313-c3-fable|dev-san313-c3-opus|dev-san313-c3-sol|redator-san313c3-opus|inspetor-san313c2-opus|4-bis|monocultura|briefing|j13c3-c3-wt|junction|Docker|commit livre|4 GB|7 GB|5432|baseline|P3|resíduo|roteiro' C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13-ciclo3/insp-san313c3-parecer.md`

Protocolo P1/P2/P3/P4/P7 do §C7.7, verbatim no bloco colado acima, com `<cadeira>` = `insp-san313c3` e o parecer no lugar do voto: evidência em `insp-san313c3-evidencia.md` após CADA item; `insp-san313c3-parecer.md` nasce esqueleto com os três itens EM APURAÇÃO e fecha (LIBERADO, LIBERADO COM RESSALVA ou BLOQUEADO) antes da mensagem final de 1 linha; sucessor re-executa os comandos registrados; três itens exatos; PAUSA grava estado e para; queda em `00-quedas.md` do diretório deste ciclo (P6, pelo orquestrador). Únicos outputs: `insp-san313c3-evidencia.md` e `insp-san313c3-parecer.md` em `C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13-ciclo3/`; os diretórios dos ciclos 1 e 2 são só leitura; nunca commit, derruba com: `test -f C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13-ciclo3/insp-san313c3-parecer.md`

## MEDIDO

Pré-voo deste mandato com as ferramentas copiadas sem mudança para a pasta do redator `C:/Users/AMP/erp-pausa-2026-10-03/redator-san313c3/` (diferença contra o ramo das ferramentas medida acima), executado com o cwd no worktree do objeto; o redator é `redator-san313c3-opus` (Claude Opus 5.5, nível menor declarado, identidade nova), que adaptou ao ciclo 3 os mandatos do ciclo 2 (de `redator-san313c2-opus`) pelo plano de resolução do ciclo 3 e executou cada comando deste mandato pelo gerador `C:/Users/AMP/erp-pausa-2026-10-03/redator-san313c3/gerar-i.sh`, medido por: `cd C:/Users/AMP/w-san313 && MANDATO_REFS=C:/Users/AMP/erp-pausa-2026-10-03/redator-san313c3/mandato-refs.sh bash C:/Users/AMP/erp-pausa-2026-10-03/redator-san313c3/mandato-preflight.sh C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13-ciclo3/00-mandatos/inspetor-san313c3.md 460 2>&1; echo ec=$?`
```
COLAGEM    l.6-20: refs do PR #460 confere com a saida atual

PRE-VOO OK — C:/Users/AMP/w-san313/agent-orchestration/omega/juntas/votos/B-SAN3-13-ciclo3/00-mandatos/inspetor-san313c3.md
ec=0
```
