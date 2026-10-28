# Mandato — C2 revalidada — B-SAN3-12b, junta de DINHEIRO, ciclo 3

## MEDIDO

Estado atual do PR 469 pela ferramenta de refs copiada sem alteração para a pasta deste redator: ramo, base, estado, objeto, merge-base, check-runs e ausência de ata final, medido por: `cd C:/Users/AMP/w-san312b && bash C:/Users/AMP/erp-pausa-2026-10-03/redator-san312b-c3/mandato-refs.sh 469`
```
# refs do PR #469 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato
# gerado em: 2026-10-28T04:19Z · repo: thiagodorgo/ERP_Techsolutios

ramo:            feat/web-financeiro-baixa-e-contas
base:            origin/main
estado:          OPEN | rascunho=false | MERGEABLE
head do PR:      cfb19fd115bac02ef65eb94202b01a64e6730854
merge-base:      f076973921539165df8d406b8c061dbf4e4ee127
merge commit:    <ainda nao mergeado>
check-runs:      total=14 nao-verdes=0 pendentes=0
approved_head:   AUSENTE — nenhuma ata nomeia nem menciona #469
                 (a junta nao votou, ou a ata nao esta em origin/main nem no head do PR)

```

O ramo remoto, o worktree do bloco e o worktree de ferramenta do redator apontam para o objeto declarado pelo PR, medido por: `cd C:/Users/AMP/w-san312b && test "$(git rev-parse HEAD)" = cfb19fd115bac02ef65eb94202b01a64e6730854 && test "$(git ls-remote origin refs/heads/feat/web-financeiro-baixa-e-contas | cut -f1)" = cfb19fd115bac02ef65eb94202b01a64e6730854 && test "$(gh pr view 469 --json headRefOid --jq .headRefOid)" = cfb19fd115bac02ef65eb94202b01a64e6730854 && test "$(git -C C:/Users/AMP/w-trc02 rev-parse HEAD)" = cfb19fd115bac02ef65eb94202b01a64e6730854 && echo 'HEAD local = ramo remoto = head do PR = worktree de ferramenta'`
```
HEAD local = ramo remoto = head do PR = worktree de ferramenta
```

Os check-runs obrigatórios do objeto concluíram: backend, backend-postgres e frontend, sem pendente nem conclusão diferente de success; a lista completa também está concluída, medido por: `cd C:/Users/AMP/w-san312b && s=$(printf '\057'); ep=repos${s}thiagodorgo${s}ERP_Techsolutios${s}commits${s}cfb19fd115bac02ef65eb94202b01a64e6730854${s}check-runs; gh api "$ep" --jq '.check_runs[] | [.name,.status,.conclusion] | @tsv' | sort -u; echo obrigatorios-nao-verdes; gh api "$ep" --jq '[.check_runs[] | select((.name=="backend" or .name=="backend-postgres" or .name=="frontend") and (.status!="completed" or .conclusion!="success"))] | length'`
```
authority-portal	completed	success
backend	completed	success
backend-postgres	completed	success
docker	completed	success
flutter	completed	success
frontend	completed	success
owner-portal	completed	success
obrigatorios-nao-verdes
0
```

O worktree do bloco está no objeto e não tem modificação rastreada; o diretório não rastreado é o dos mandatos do ciclo 3, medido por: `cd C:/Users/AMP/w-san312b && test "$(git rev-parse HEAD)" = cfb19fd115bac02ef65eb94202b01a64e6730854 && echo 'HEAD = objeto'; echo "rastreados modificados: $(git status --porcelain --untracked-files=no | wc -l)"; git status --short | sed -E 's#^(..) (.*)#\1 C:/Users/AMP/w-san312b/\2#'`
```
HEAD = objeto
rastreados modificados: 0
?? C:/Users/AMP/w-san312b/agent-orchestration/omega/juntas/votos/B-SAN3-12b-ciclo3/
```

Topologia medida: a merge-base é ancestral do objeto e igual à origin/main (nenhum merge da main no ciclo 3); o objeto do ciclo 2 é o sexto primeiro-pai anterior e o do ciclo 1 o décimo nono; os 6 commits do ciclo 3 não são merge; o diff do ciclo 2 até o objeto lista os caminhos do conserto da E3, e a interseção com o arquivos_medidos do voto verde da C2 do ciclo 2 não é vazia, logo a C2 é revalidada pela regra (2) e não carrega pela (1), medido por: `cd C:/Users/AMP/w-san312b && git fetch -q origin main && git merge-base --is-ancestor f076973921539165df8d406b8c061dbf4e4ee127 cfb19fd115bac02ef65eb94202b01a64e6730854 && echo 'merge-base ancestral'; test "$(git rev-parse origin/main)" = f076973921539165df8d406b8c061dbf4e4ee127 && echo 'origin/main = merge-base'; echo "merges no ciclo 3: $(git rev-list --merges --count cfb19fd115bac02ef65eb94202b01a64e6730854~6..cfb19fd115bac02ef65eb94202b01a64e6730854)"; echo "objeto do ciclo 2: $(git log -1 --format=%s cfb19fd115bac02ef65eb94202b01a64e6730854~6)"; echo "objeto do ciclo 1: $(git log -1 --format=%s cfb19fd115bac02ef65eb94202b01a64e6730854~19)"; echo 'caminhos ciclo2..objeto:'; git diff --name-only cfb19fd115bac02ef65eb94202b01a64e6730854~6 cfb19fd115bac02ef65eb94202b01a64e6730854; echo 'interseção com arquivos_medidos da C2 do ciclo 2:'; git diff --name-only cfb19fd115bac02ef65eb94202b01a64e6730854~6 cfb19fd115bac02ef65eb94202b01a64e6730854 -- $(tr -d '\r' < C:/Users/AMP/w-san312b/agent-orchestration/omega/juntas/votos/B-SAN3-12b-ciclo2/c2rev-voto.json | python -I -c 'import json,sys; print(" ".join(json.load(sys.stdin)["arquivos_medidos"]))')`
```
merge-base ancestral
origin/main = merge-base
merges no ciclo 3: 0
objeto do ciclo 2: chore(merge): traz a main (registro #472) para o ramo do B-SAN3-12b
objeto do ciclo 1: docs(junta): corpos das 3 cadeiras da junta de dinheiro do B-SAN3-12b
caminhos ciclo2..objeto:
COMPONENT_LIBRARY.md
agent-orchestration/controle/pendencias-indice.md
agent-orchestration/controle/pendencias.md
agent-orchestration/omega/juntas/votos/B-SAN3-12b-ciclo2/00-mandatos/cadeira-c1r2.md
agent-orchestration/omega/juntas/votos/B-SAN3-12b-ciclo2/00-mandatos/cadeira-c2rev.md
agent-orchestration/omega/juntas/votos/B-SAN3-12b-ciclo2/00-mandatos/cadeira-c3r2.md
agent-orchestration/omega/juntas/votos/B-SAN3-12b-ciclo2/00-mandatos/inspetor-san312b-c2.md
agent-orchestration/omega/juntas/votos/B-SAN3-12b-ciclo2/00-quedas.md
agent-orchestration/omega/juntas/votos/B-SAN3-12b-ciclo2/c1r2-evidencia.md
agent-orchestration/omega/juntas/votos/B-SAN3-12b-ciclo2/c1r2-voto.json
agent-orchestration/omega/juntas/votos/B-SAN3-12b-ciclo2/c2rev-caido-r2-sol-evidencia.md
agent-orchestration/omega/juntas/votos/B-SAN3-12b-ciclo2/c2rev-caido-r2-sol-voto.json
agent-orchestration/omega/juntas/votos/B-SAN3-12b-ciclo2/c2rev-evidencia.md
agent-orchestration/omega/juntas/votos/B-SAN3-12b-ciclo2/c2rev-voto.json
agent-orchestration/omega/juntas/votos/B-SAN3-12b-ciclo2/c3r2-evidencia.md
agent-orchestration/omega/juntas/votos/B-SAN3-12b-ciclo2/c3r2-voto.json
agent-orchestration/omega/juntas/votos/B-SAN3-12b-ciclo2/insp-san312b-c2-evidencia.md
agent-orchestration/omega/juntas/votos/B-SAN3-12b-ciclo2/insp-san312b-c2-parecer.md
agent-orchestration/omega/reprovacoes/R-B-SAN3-12b-ciclo2.md
docs/revisoes/SAN3/B-SAN3-12-plano.md
docs/revisoes/SAN3/B-SAN3-12b-dev.md
frontend/src/modules/finance/pages/views/FinanceiroViewA.tsx
frontend/src/styles/app.css
frontend/tests/finance-contas-extrato.smoke.test.tsx
frontend/tests/finance-no-money-reduce.guard.test.ts
interseção com arquivos_medidos da C2 do ciclo 2:
agent-orchestration/controle/pendencias-indice.md
agent-orchestration/controle/pendencias.md
docs/revisoes/SAN3/B-SAN3-12-plano.md
frontend/src/modules/finance/pages/views/FinanceiroViewA.tsx
```

O diff efetivo do PR é merge-base até objeto; contagem por raiz, com zero mudança em src, prisma, .github e Kpis; e o diff próprio do ciclo 3 em backend, prisma, scripts, componentes, gates, navegação, aparência e package.json também é zero (CE-4 e o PROIBIDO da E3.1), medido por: `cd C:/Users/AMP/w-san312b && echo "PR caminhos: $(git diff --name-only f076973921539165df8d406b8c061dbf4e4ee127 cfb19fd115bac02ef65eb94202b01a64e6730854 | wc -l)"; for d in frontend/src/modules/finance frontend/src/styles frontend/tests src prisma .github Kpis docs/revisoes/SAN3 agent-orchestration/controle agent-orchestration/omega/reprovacoes; do echo "sob $d: $(git diff --name-only f076973921539165df8d406b8c061dbf4e4ee127 cfb19fd115bac02ef65eb94202b01a64e6730854 -- $d | wc -l)"; done; echo "ciclo 3 em src prisma scripts: $(git diff --name-only cfb19fd115bac02ef65eb94202b01a64e6730854~6 cfb19fd115bac02ef65eb94202b01a64e6730854 -- src prisma scripts | wc -l)"; echo "ciclo 3 em components App guards layouts navigation appearance FinanceiroPage package.json: $(git diff --name-only cfb19fd115bac02ef65eb94202b01a64e6730854~6 cfb19fd115bac02ef65eb94202b01a64e6730854 -- frontend/src/components frontend/src/App.tsx frontend/src/guards frontend/src/layouts frontend/src/navigation frontend/src/modules/appearance frontend/src/modules/finance/pages/FinanceiroPage.tsx frontend/package.json | wc -l)"`
```
PR caminhos: 87
sob frontend/src/modules/finance: 28
sob frontend/src/styles: 1
sob frontend/tests: 9
sob src: 0
sob prisma: 0
sob .github: 0
sob Kpis: 0
sob docs/revisoes/SAN3: 2
sob agent-orchestration/controle: 2
sob agent-orchestration/omega/reprovacoes: 2
ciclo 3 em src prisma scripts: 0
ciclo 3 em components App guards layouts navigation appearance FinanceiroPage package.json: 0
```

O corpo canônico desta cadeira existe no objeto e é IDÊNTICO entre os dois espelhos depois de retirar frontmatter e orientação Codex, em comparação EOL-neutra pelo blob; o ciclo 3 não mudou nenhum corpo de agente, medido por: `cd C:/Users/AMP/w-san312b && diff <(git show cfb19fd115bac02ef65eb94202b01a64e6730854:.claude/agents/especialistas/jurado-san312b-c2-cadeia-de-acesso.md | tr -d '\r' | awk 'f; $0=="---"{n++; if(n==2) f=1}' | sed '/^$/d') <(git show cfb19fd115bac02ef65eb94202b01a64e6730854:.agents/agents/especialistas/jurado-san312b-c2-cadeia-de-acesso.md | tr -d '\r' | awk 'f; $0=="---"{n++; if(n==2) f=1}' | awk 'index($0,"Papel para o Codex"){s=1} s&&$0==""{s=0; next} !s' | sed '/^$/d') >/dev/null && echo 'IDENTICO corpo c2-cadeia-de-acesso' || echo 'DIVERGE corpo c2-cadeia-de-acesso'; echo "corpos mudados no ciclo 3: $(git diff --name-only cfb19fd115bac02ef65eb94202b01a64e6730854~6 cfb19fd115bac02ef65eb94202b01a64e6730854 -- .claude/agents .agents/agents | wc -l)"`
```
IDENTICO corpo c2-cadeia-de-acesso
corpos mudados no ciclo 3: 0
```

As duas ferramentas protegidas são byte a byte iguais às originais; só a lib e os geradores pertencem à adaptação do ciclo 3, medido por: `for f in mandato-preflight.sh mandato-refs.sh; do cmp -s C:/Users/AMP/erp-pausa-2026-10-03/redator-san312b/$f C:/Users/AMP/erp-pausa-2026-10-03/redator-san312b-c3/$f && echo "$f INTACTO" || echo "$f ALTERADO"; done`
```
mandato-preflight.sh INTACTO
mandato-refs.sh INTACTO
```

A régua do objeto: junta de dinheiro unânime de 3; a partir do ciclo 3 só bloqueia defeito de produto grave e todo outro achado vira pendência com dono; no ciclo seguinte só a cadeira vermelha é refeita, e a verde cruzada pelo diff é revalidada por identidade nova, medido por: `tr -d '\r' < C:/Users/AMP/w-san312b/CLAUDE.md | grep -n -i -E 'Junta proporcional ao risco|Teto de 2 ciclos|A partir do ciclo 3, só bloqueia|JUNTA: SÓ A CADEIRA VERMELHA|Se o conserto tocar o escopo dela|A cadeira vermelha é refeita' | python -X utf8 -I -c 'import sys; [print(l.rstrip()[:150]) for l in sys.stdin]' | head -12`
```
496:   > **Teto de 2 ciclos restabelecido (2026-10-04, `D-GOV-PROPORCIONAL`, §C7 item 8(2)):** a partir do ciclo 3, só defeito de produto grave bloque
750:8. **GOVERNANÇA PROPORCIONAL — junta só onde o risco pede, teto de 2 ciclos, menos burocracia, Traccar depois de sanar
759:   - **(1) Junta proporcional ao risco.** Junta completa — inspetor de terreno, 3 cadeiras, **unanimidade** — só
763:   - **(2) Teto de 2 ciclos.** Nos ciclos 1 e 2 a junta funciona como hoje. **A partir do ciclo 3, só bloqueia
810:     (segurança/permissão), teto de 2 ciclos; `#401` (B-SAN3-11, rótulo do dossiê) passa à regra (1); `#393` fica
813:9. **JUNTA: SÓ A CADEIRA VERMELHA É REFEITA, COM TRAVA (decisão do dono, 2026-10-20 — `D-JUNTA-SO-CADEIRA-VERMELHA`).**
829:   - **(2) Se o conserto tocar o escopo dela,** uma identidade NOVA re-executa só os comandos registrados na evidência
832:   - **(3) A cadeira vermelha é refeita**, com identidade nova e a régua do ciclo corrente, focada no achado mais a
```

O parecer da reprovação do ciclo 2 define a régua do ciclo 3, a composição (C1 e C3 refeitas, C2 revalidada) e os inelegíveis por nome; os votos do ciclo 2 registram C1 e C3 reprovadas e C2 aprovada, medido por: `tr -d '\r' < C:/Users/AMP/w-san312b/agent-orchestration/omega/reprovacoes/R-B-SAN3-12b-ciclo2.md | grep -n -i -E '^## 4\.|Régua do ciclo 3|\(3\) refeita|\(2\) revalidada|Inelegíveis para qualquer cadeira' | python -X utf8 -I -c 'import sys; [print(l.rstrip()[:150]) for l in sys.stdin]' | head -12; for f in c1r2 c2rev c3r2; do printf "$f "; tr -d '\r' < C:/Users/AMP/w-san312b/agent-orchestration/omega/juntas/votos/B-SAN3-12b-ciclo2/$f-voto.json | grep -i -m1 -E '"voto"'; done`
```
11:Régua: o §C7.4 pergunta se os achados são **defeitos reais** (do que o bloco entregou) ou **artefatos do processo** (critério impossível, premissa 
139:## 4. Junta do ciclo 3 (`D-JUNTA-SO-CADEIRA-VERMELHA`, §C7 item 9; régua do §C7 item 8(2))
143:**Régua do ciclo 3 (`D-GOV-PROPORCIONAL` (2), §C7 item 8(2)):** DINHEIRO → unanimidade de 3, com veto; mas, **a partir deste ciclo, só reprova def
147:| **C1** tela e fidelidade | **(3) refeita** (vermelha no ciclo 2) | `jurado-san312b-ciclo3-c1-opus` (nova) | Claude Opus, declarado (tela: `D-DES
148:| **C2** cadeia de acesso | **(2) revalidada** — ver o cruzamento abaixo | `jurado-san312b-ciclo3-c2rev-<modelo>` (nova) | Codex Sol se a janela p
149:| **C3** dinheiro e contrato | **(3) refeita** (vermelha no ciclo 2) | `jurado-san312b-ciclo3-c3-<modelo>` (nova) | Claude Opus ou Codex Sol, decl
155:**Inelegíveis para qualquer cadeira, inspeção ou revalidação do ciclo 3 (por nome):** planejadores `planejador-mestre` (plano v1–v3), `planejador-
161:- **Veredito da auditoria:** 3 de 3 `bloqueia` e 2 de 2 ajustes são **reais** (1 produto/tela, 1 trava entregue, 1 registro entregue — este maior 
c1r2  "voto": "REPROVADO",
c2rev  "voto": "APROVADO",
c3r2  "voto": "REPROVADO",
```

A Emenda E3 está versionada no plano do objeto, com as seções E3.1 a E3.6 e os requisitos R-E3-1 a R-E3-7, e o trecho do plano é igual, sem CR, ao trecho do parecer, medido por: `echo "Emenda E3: $(grep -c -i '^## Emenda E3' C:/Users/AMP/w-san312b/docs/revisoes/SAN3/B-SAN3-12-plano.md)"; echo "seções E3.1 a E3.6: $(grep -c -i -E '^### E3\.[1-6] ' C:/Users/AMP/w-san312b/docs/revisoes/SAN3/B-SAN3-12-plano.md)"; echo "requisitos R-E3-1 a R-E3-7: $(grep -c -i -E '^\*\*R-E3-[1-7] ' C:/Users/AMP/w-san312b/docs/revisoes/SAN3/B-SAN3-12-plano.md)"; a=$(tr -d '\r' < C:/Users/AMP/w-san312b/docs/revisoes/SAN3/B-SAN3-12-plano.md | awk 'index($0,"## Emenda E3")==1{f=1} f' | sed -e :a -e '/^\n*$/{$d;N;ba' -e '}' | md5sum | cut -c1-32); b=$(tr -d '\r' < C:/Users/AMP/w-san312b/agent-orchestration/omega/reprovacoes/R-B-SAN3-12b-ciclo2.md | awk 'index($0,"## Emenda E3")==1{f=1} index($0,"## 4.")==1{f=0} f' | sed -e :a -e '/^\n*$/{$d;N;ba' -e '}' | md5sum | cut -c1-32); test "$a" = "$b" && echo 'E3 do plano IDENTICA a E3 do parecer' || echo 'E3 do plano DIVERGE do parecer'`
```
Emenda E3: 1
seções E3.1 a E3.6: 6
requisitos R-E3-1 a R-E3-7: 7
E3 do plano IDENTICA a E3 do parecer
```

O relatório do desenvolvimento do objeto tem as RETOMADAS 10 a 13 e a seção Ciclo 3, com a bateria (122 casos no recorte, 1482 no test:smoke em Node 20 e 22) e 29 mutações vermelhas; o executor das RETOMADAS 10 a 13 é o Claude que cobriu o Codex, declarado, medido por: `echo "RETOMADAS 10 a 13: $(grep -c -i -E '^## RETOMADA 1[0-3]$' C:/Users/AMP/w-san312b/docs/revisoes/SAN3/B-SAN3-12b-dev.md)"; echo "seção Ciclo 3: $(grep -c -i '^## Ciclo 3 ' C:/Users/AMP/w-san312b/docs/revisoes/SAN3/B-SAN3-12b-dev.md)"; echo "linhas 1482: $(grep -c -i 'tests 1482 · pass 1482 · fail 0' C:/Users/AMP/w-san312b/docs/revisoes/SAN3/B-SAN3-12b-dev.md)"; echo "linhas 122: $(grep -c -i 'tests 122 · pass 122 · fail 0' C:/Users/AMP/w-san312b/docs/revisoes/SAN3/B-SAN3-12b-dev.md)"; echo "29 mutações: $(grep -c -i '29 mutações, 29 VERMELHAS' C:/Users/AMP/w-san312b/docs/revisoes/SAN3/B-SAN3-12b-dev.md)"; tr -d '\r' < C:/Users/AMP/w-san312b/docs/revisoes/SAN3/B-SAN3-12b-dev.md | grep -i -E '^[-] \*\*Executor e modelo:' | awk -F'`' '{print $2}' | sort | uniq -c`
```
RETOMADAS 10 a 13: 4
seção Ciclo 3: 1
linhas 1482: 2
linhas 122: 3
29 mutações: 1
      1 dev-san312b-c2-f1-sol
      1 dev-san312b-c2-f2-sol
      1 dev-san312b-c2-f3-sol
      1 dev-san312b-c2-f4-opus
      5 dev-san312b-c2-f59-opus
      4 dev-san312b-ciclo3-claude
```

O voto verde da C2 do ciclo 2 tem exatamente 8 entradas em o_que_executei e declara arquivos_medidos por caminho (sem o escopo total); por isso a regra (1) seria possível em tese, mas a interseção medida acima não é vazia e vale a regra (2): reexecutar os 8 comandos sobre o objeto novo, medido por: `tr -d '\r' < C:/Users/AMP/w-san312b/agent-orchestration/omega/juntas/votos/B-SAN3-12b-ciclo2/c2rev-voto.json | python -I -c 'import json,sys; d=json.load(sys.stdin); m=d["arquivos_medidos"]; print("voto:", d["voto"]); print("entradas o_que_executei:", len(d["o_que_executei"])); print("arquivos_medidos:", len(m), "escopo total:", "**" in m)'`
```
voto: APROVADO
entradas o_que_executei: 8
arquivos_medidos: 37 escopo total: False
```

O que o ciclo 3 mudou dentro do alcance da C2: na view A, só a classe da grade de indicadores e a classe do botão Carregar mais; nos outros três arquivos da interseção, só registro (pendências, índice e plano); nenhum gate, rota, menu, aparência, App, guarda de rota ou backend, medido por: `git -C C:/Users/AMP/w-san312b diff -U0 cfb19fd115bac02ef65eb94202b01a64e6730854~6 cfb19fd115bac02ef65eb94202b01a64e6730854 -- frontend/src/modules/finance/pages/views/FinanceiroViewA.tsx | grep -i -E '^[-+]' | grep -v -i -E '^(\+\+\+|---) '; git -C C:/Users/AMP/w-san312b diff --numstat cfb19fd115bac02ef65eb94202b01a64e6730854~6 cfb19fd115bac02ef65eb94202b01a64e6730854 -- agent-orchestration/controle/pendencias.md agent-orchestration/controle/pendencias-indice.md docs/revisoes/SAN3/B-SAN3-12-plano.md`
```
-    <div className="pat-kpi-row" style={{ gridTemplateColumns: "repeat(6, minmax(0, 1fr))" }} aria-busy={model.summaryLoading ? true : undefined}>
+    <div className="pat-kpi-row pat-kpi-row--6" aria-busy={model.summaryLoading ? true : undefined}>
-            <button type="button" className="pat-btn pat-btn--secondary" style={{ margin: "8px 18px" }} disabled={list.loadingMore} onClick={() => void list.loadMore()}>
+            <button type="button" className="pat-btn" style={{ margin: "8px 18px" }} disabled={list.loadingMore} onClick={() => void list.loadMore()}>
72	67	agent-orchestration/controle/pendencias-indice.md
29	2	agent-orchestration/controle/pendencias.md
91	0	docs/revisoes/SAN3/B-SAN3-12-plano.md
```

O roteiro P3 do ciclo 2 existe fora do repositório: os 13 scripts e as saídas de 01 a 11 que servem de termo de comparação; os scripts nomeiam o worktree e o objeto antigos, logo são copiados e adaptados, e as saídas antigas são comparação, nunca resultado, medido por: `echo "scripts zz: $(ls C:/Users/AMP/erp-pausa-2026-10-03/j12b2-c2rev-b | grep -c -i -E '^zz-j12bc2-')"; echo "saídas 01 a 11: $(ls C:/Users/AMP/erp-pausa-2026-10-03/j12b2-c2rev-b | grep -c -i -E '^(0[1-9]|1[01])-')"; for f in 01-matriz.log 02-backend.log 03-seven-tests.log 04-front.log 04-compare.log 05-cauda-back.log 05-cauda-front.log 07-ctl-c1-live.log 08-navback.log 09-front3.log 11-ctl-base-redirects.log; do test -f C:/Users/AMP/erp-pausa-2026-10-03/j12b2-c2rev-b/$f && echo "$f existe" || echo "$f falta"; done; echo "scripts que citam o worktree antigo: $(grep -l -i 'j12b-c2-c2rev-wt' C:/Users/AMP/erp-pausa-2026-10-03/j12b2-c2rev-b/zz-j12bc2-* | wc -l)"`
```
scripts zz: 13
saídas 01 a 11: 28
01-matriz.log existe
02-backend.log existe
03-seven-tests.log existe
04-front.log existe
04-compare.log existe
05-cauda-back.log existe
05-cauda-front.log existe
07-ctl-c1-live.log existe
08-navback.log existe
09-front3.log existe
11-ctl-base-redirects.log existe
scripts que citam o worktree antigo: 8
```

Recursos no instante da redação, sem invocar Docker nem banco: memória de commit livre e disco C; o redator para abaixo de 7,5 GB, medido por: `powershell.exe -NoProfile -Command '$o=Get-CimInstance Win32_PerfFormattedData_PerfOS_Memory; [math]::Round(($o.CommitLimit-$o.CommittedBytes)/1GB,2)'; df -BG /c | tail -1 | awk '{print "livre em C: " $(NF-2)}'`
```
12,19
livre em C: 13G
```

O protocolo resiliente P1, P2, P3, P4 e P7 está no contrato do objeto, medido por: `tr -d '\r' < C:/Users/AMP/w-san312b/CLAUDE.md | grep -n -i -A7 'Após CADA item: apense a <cadeira>-evidencia.md'`
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

Você é `jurado-san312b-ciclo3-c2rev-<executor>`, identidade nova nomeada pelo §4 do parecer da reprovação do ciclo 2, e esta é a C2 REVALIDADA pela regra (2) do §C7 item 9; executor Codex GPT-5.6 Sol se a janela permitir, senão Claude Opus, nível menor declarado, com a substituição DECLARADA. Corpo canônico: `C:/Users/AMP/w-san312b/.claude/agents/especialistas/jurado-san312b-c2-cadeia-de-acesso.md`, carregado do blob do objeto. Onde corpo e mandato divergirem sobre objeto, regra, itens, diretório ou inelegíveis, vale este mandato. Primeira linha de `c2rev3-evidencia.md`: identidade, executor, modelo, nível, objeto, mandato_md5 sem CR e corpo IDENTICO/DIVERGE EOL-neutro. Modelo menor esgotado: PARE sem votar (§C7.6-bis). Inelegíveis: `planejador-mestre`, `planejador-san312-e1-fable`, `planejador-san312b-c1rep-fable`, `planejador-san312b-c2rep-fable`, `crit-san312-pro`, `crit-san312-opus-r2`, `crit-san312-pro-r2`, `crit-san3-12-r2-pro`, `crit-san312a-e1-opus`, `crit-san312-argon`, `crit-san312-sol`, `dev-san312b-sol`, `dev-san312b-opus`, `dev-san312b-ciclo2-sol`, `dev-san312b-c2-f1-sol`, `dev-san312b-c2-f2-sol`, `dev-san312b-c2-f3-sol`, `dev-san312b-c2-f4-sol`, `dev-san312b-c2-f4b-sol`, `dev-san312b-c2-f4-opus`, `dev-san312b-c2-f59-opus`, `dev-san312b-ciclo3-sol`, `dev-san312b-ciclo3-claude`, `fab-red-san312b-opus`, `redator-san312b`, `redator-san312b-c2`, `red-san312b-c2-sol`, `red-san312b-c3-opus`, `inspetor-san312b-opus`, `inspetor-san312b-c2-sol`, `jurado-san312b-c1-opus`, `jurado-san312b-c2-opus`, `jurado-san312b-c3-opus`, `jurado-san312b-c1-r2-opus`, `jurado-san312b-c2-r2b-opus`, `jurado-san312b-c2-r2-sol`, `jurado-san312b-c3-r2-opus` e o orquestrador da sessão; coincidiu, PARE, derruba com: `head -1 C:/Users/AMP/w-san312b/agent-orchestration/omega/juntas/votos/B-SAN3-12b-ciclo3/c2rev3-evidencia.md | grep -i -E 'identidade|executor|modelo|objeto|mandato|IDENTICO|DIVERGE'`

Legalidade e método: exija `inspetor-san312b-c3-parecer.md` LIBERADO ou LIBERADO COM RESSALVA para seu nome e worktree; confirme o head do PR 469 e backend, backend-postgres e frontend completed/success. Você não repete julgamento amplo: reexecuta os 8 comandos de `o_que_executei` do voto da C2 do ciclo 2, sobre o objeto novo, e compara cada saída com a saída registrada do ciclo 2. Saída igual mantém o verde; saída diferente gera voto novo naquele ponto, com a régua do ciclo 3 (DINHEIRO, unanimidade de 3; só reprova defeito de produto GRAVE — perde dado, vaza dado entre organizações, quebra permissão ou erra dinheiro; o resto vira pendência proposta com dono). Todo achado declara gravidade, escopo, classe, N e forma. Não leia votos nem evidências do ciclo 3 das outras cadeiras. Não proponha correção. Declare `arquivos_medidos` (os do ciclo 2, ou `**` se rodar suíte total, check ou build) e a forma do voto: revalidado, derruba com: `grep -i -E 'legalidade|8 comandos|compar|igual|diferente|revalidad|unanimidade|ciclo 3|arquivos_medidos' C:/Users/AMP/w-san312b/agent-orchestration/omega/juntas/votos/B-SAN3-12b-ciclo3/c2rev3-voto.json`

Terreno: worktree exclusivo `C:/Users/AMP/j12b-c3-c2rev3-wt`, detached no objeto, `npm ci` próprios e zero junction; sem Docker e sem base viva. Backend somente em memória, porta alta em 127.0.0.1 e REDIS_URL apontando para porta fechada. Copie os scripts de `C:/Users/AMP/erp-pausa-2026-10-03/j12b2-c2rev-b/` para pasta sua e troque mecanicamente o worktree antigo pelo seu e o objeto antigo (`<objeto>~6`) pelo objeto; mantenha as refs de controle do ciclo 2 (o objeto do ciclo 1, `<objeto>~19`, e a merge-base). Antes: memória de commit livre ≥ 4 GB e disco ≥ 7,5 GB; abaixo, PARE. Toda mutação uma por vez, restauro contra o blob e status vazio; teardown remove servidor, sondas e worktree, derruba com: `grep -i -E 'j12b-c3-c2rev3-wt|sem Docker|REDIS_URL|memória|7,5 GB|scripts|substitu|objeto.~19|restauro|teardown' C:/Users/AMP/w-san312b/agent-orchestration/omega/juntas/votos/B-SAN3-12b-ciclo3/c2rev3-evidencia.md`

Item 1 de 3 — reexecute os comandos 1 a 4: a matriz real de ROLE_PERMISSIONS; o backend em memória com os 25 atores; os 7 arquivos de teste registrados (finance-page-live, finance-baixa.smoke, finance-redirects, aparencia-storage, aparencia-hook, sidebar-nav e san3-04a-sidebar); o roleperms, a sonda do front e o comparador. Para cada um, publique N e forma e compare com `01-matriz.log`, `02-backend.log`, `03-seven-tests.log`, `04-front.log` e `04-compare.log` do ciclo 2: igual ou diferente. Diferença explicada por desenho da E3 (só a classe da grade e a do botão na view) não é achado; diferença sem explicação é voto novo neste item, derruba com: `grep -i -E 'Item 1|comando 1|comando 2|comando 3|comando 4|ROLE_PERMISSIONS|25 atores|7 arquivos|compar|igual|diferente' C:/Users/AMP/w-san312b/agent-orchestration/omega/juntas/votos/B-SAN3-12b-ciclo3/c2rev3-evidencia.md`

Item 2 de 3 — reexecute os comandos 5 a 7: a cauda R5/R9 no backend e no front (`cheques:update` para Cancelar o cheque depois do desvínculo, POST de cancelamento sem corpo, atores sintéticos que separam a criação de lançamento da atualização de título); as 12 mutações do roteiro (M1, M1b, M2 que é a R9-M1, CONC-vizinho, M3, M4, M5, R5-M2 com a sonda da cauda, R5-M3, M6, M7 e M8), cada uma com arquivo, âncora, teste dono, vermelho ou sobrevivente e hash de restauro; e os controles em `<objeto>~19` e na merge-base, que falham pela propriedade e não por import. Compare com `05-*`, `06-mut-*`, `10-mut-*`, `07-ctl-*` e `11-ctl-*` do ciclo 2: igual ou diferente, derruba com: `grep -i -E 'Item 2|comando 5|comando 6|comando 7|R5|R9|cheques:update|sem corpo|M1|M8|R5-M2|R5-M3|CONC|objeto.~19|merge-base|restauro|igual|diferente' C:/Users/AMP/w-san312b/agent-orchestration/omega/juntas/votos/B-SAN3-12b-ciclo3/c2rev3-evidencia.md`

Item 3 de 3 — reexecute o comando 8 e feche a revalidação: o menu do backend em memória (com e sem Financeiro) e o do front, no objeto e na merge-base, e o App real com rotas e aparência (front3); compare com `08-navback.log`, `08-navback-semfin.log`, `09-front3.log` e `09-front3-base.log`. Publique a tabela dos 8 comandos com igual ou diferente e a razão de cada diferença, e prove por comando a interseção que decidiu a regra (2) (`git diff --name-only <objeto>~6 <objeto>` cruzado com o `arquivos_medidos` do voto do ciclo 2). O voto final diz revalidado (todas iguais) ou novo (com a régua do ciclo 3), derruba com: `grep -i -E 'Item 3|comando 8|navback|navfront|front3|menu|aparência|tabela|interseção|regra .2.|revalidado|igual|diferente' C:/Users/AMP/w-san312b/agent-orchestration/omega/juntas/votos/B-SAN3-12b-ciclo3/c2rev3-evidencia.md`

P1/P2/P3/P4/P7: após CADA item, apense comando, saída resumida, comparação com o ciclo 2 e veredito parcial em `c2rev3-evidencia.md`; `c2rev3-voto.json` nasce esqueleto com os três itens EM APURAÇÃO e `arquivos_medidos`, e fecha antes da mensagem final de uma linha; sucessor de identidade nova reexecuta os comandos registrados e mede a cauda; máximo três itens; PAUSA grava head, feito, falta, próximo comando e arquivos parciais e para. Os únicos outputs no repositório ficam em `C:/Users/AMP/w-san312b/agent-orchestration/omega/juntas/votos/B-SAN3-12b-ciclo3/`; nunca commit, derruba com: `test -f C:/Users/AMP/w-san312b/agent-orchestration/omega/juntas/votos/B-SAN3-12b-ciclo3/c2rev3-voto.json`

