# Mandato — inspetor de terreno — B-SAN3-12b, junta de DINHEIRO, ciclo 3

## MEDIDO

Estado atual do PR 469 pela ferramenta de refs copiada sem alteração para a pasta deste redator: ramo, base, estado, objeto, merge-base, check-runs e ausência de ata final, medido por: `cd C:/Users/AMP/w-san312b && bash C:/Users/AMP/erp-pausa-2026-10-03/redator-san312b-c3/mandato-refs.sh 469`
```
# refs do PR #469 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato
# gerado em: 2026-10-28T04:20Z · repo: thiagodorgo/ERP_Techsolutios

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

O corpo canônico do inspetor existe no objeto nos dois espelhos; a comparação EOL-neutra pelo blob desconta frontmatter e orientação Codex, medido por: `cd C:/Users/AMP/w-san312b && diff <(git show cfb19fd115bac02ef65eb94202b01a64e6730854:.claude/agents/inspetor-de-terreno-da-junta.md | tr -d '\r' | awk 'f; $0=="---"{n++; if(n==2) f=1}' | sed '/^$/d') <(git show cfb19fd115bac02ef65eb94202b01a64e6730854:.agents/agents/inspetor-de-terreno-da-junta.md | tr -d '\r' | awk 'f; $0=="---"{n++; if(n==2) f=1}' | awk 'index($0,"Papel para o Codex"){s=1} s&&$0==""{s=0; next} !s' | sed '/^$/d') >/dev/null && echo 'IDENTICO corpo do inspetor' || echo 'DIVERGE corpo do inspetor'`
```
IDENTICO corpo do inspetor
```

Os três mandatos de cadeira do ciclo 3 existem, têm no máximo três itens e nomeiam a composição do parecer: C1 e C3 refeitas, C2 revalidada, medido por: `for f in cadeira-c1r3.md cadeira-c2rev3.md cadeira-c3r3.md; do echo "$f itens: $(grep -c -i 'Item [123] de 3' C:/Users/AMP/w-san312b/agent-orchestration/omega/juntas/votos/B-SAN3-12b-ciclo3/00-mandatos/$f)"; grep -i -m1 -o -E 'C[123] (REFEITA|REVALIDADA)' C:/Users/AMP/w-san312b/agent-orchestration/omega/juntas/votos/B-SAN3-12b-ciclo3/00-mandatos/$f; done`
```
cadeira-c1r3.md itens: 3
C1 refeita
cadeira-c2rev3.md itens: 3
C2 revalidada
cadeira-c3r3.md itens: 3
C3 refeita
```

A lista nominal de inelegíveis do parecer e os executores reais registrados no relatório do dev, inclusive o Claude que cobriu as RETOMADAS 10 a 13; as identidades do ciclo 2 que o parecer nomeia estão nos votos e no parecer do inspetor do ciclo 2, medido por: `tr -d '\r' < C:/Users/AMP/w-san312b/agent-orchestration/omega/reprovacoes/R-B-SAN3-12b-ciclo2.md | grep -i -o -E 'planejador-mestre|(planejador|crit|dev|fab|redator|red|inspetor|jurado)-san3[a-z0-9-]+' | sort -u | tr '\n' ' '; echo; tr -d '\r' < C:/Users/AMP/w-san312b/docs/revisoes/SAN3/B-SAN3-12b-dev.md | grep -i -E '^[-] \*\*Executor e modelo:' | awk -F'`' '{print $2}' | sort -u | tr '\n' ' '; echo; for f in c1r2-voto.json c2rev-voto.json c3r2-voto.json c2rev-caido-r2-sol-voto.json; do tr -d '\r' < C:/Users/AMP/w-san312b/agent-orchestration/omega/juntas/votos/B-SAN3-12b-ciclo2/$f | grep -i -m1 -o -E 'jurado-san312b-[a-z0-9-]+'; done; grep -i -m1 -o -E 'inspetor-san312b-c2-[a-z]+' C:/Users/AMP/w-san312b/agent-orchestration/omega/juntas/votos/B-SAN3-12b-ciclo2/insp-san312b-c2-parecer.md`
```
crit-san3-12-r2-pro crit-san312-argon crit-san312-opus-r2 crit-san312-pro crit-san312-pro-r2 crit-san312-sol crit-san312a-e1-opus dev-san312b-ciclo2-sol dev-san312b-ciclo3-claude dev-san312b-ciclo3-sol dev-san312b-opus dev-san312b-sol inspetor-san312b-c2-sol inspetor-san312b-ciclo3- inspetor-san312b-opus jurado-san312b-c1-opus jurado-san312b-c1-r2-opus jurado-san312b-c2-opus jurado-san312b-c2-r2-sol jurado-san312b-c2-r2b-opus jurado-san312b-c3-opus jurado-san312b-c3-r2-opus jurado-san312b-ciclo3-c1-opus jurado-san312b-ciclo3-c2rev- jurado-san312b-ciclo3-c3- planejador-mestre planejador-san312-e1-fable planejador-san312b-c1rep-fable planejador-san312b-c2rep-fable red-san312b-opus redator-san312b redator-san312b-c2 
dev-san312b-c2-f1-sol dev-san312b-c2-f2-sol dev-san312b-c2-f3-sol dev-san312b-c2-f4-opus dev-san312b-c2-f59-opus dev-san312b-ciclo3-claude 
jurado-san312b-c1-r2-opus
jurado-san312b-c2-r2b-opus
jurado-san312b-c2-r2-sol
jurado-san312b-c3-r2-opus
jurado-san312b-c2-r2-sol
inspetor-san312b-c2-sol
```

A fatia S0 tem o sincronizador no objeto, e os três corpos especializados julgados existem nos dois espelhos; a execução da S0 cabe ao inspetor em worktree descartável próprio, medido por: `cd C:/Users/AMP/w-san312b && git cat-file -e cfb19fd115bac02ef65eb94202b01a64e6730854:scripts/sync-agent-agents.mjs && echo 'sincronizador existe no objeto'; for f in jurado-san312b-c1-tela-e-fidelidade jurado-san312b-c2-cadeia-de-acesso jurado-san312b-c3-dinheiro-e-contrato; do git cat-file -e cfb19fd115bac02ef65eb94202b01a64e6730854:.claude/agents/especialistas/$f.md && git cat-file -e cfb19fd115bac02ef65eb94202b01a64e6730854:.agents/agents/especialistas/$f.md && echo "$f nos dois espelhos"; done`
```
sincronizador existe no objeto
jurado-san312b-c1-tela-e-fidelidade nos dois espelhos
jurado-san312b-c2-cadeia-de-acesso nos dois espelhos
jurado-san312b-c3-dinheiro-e-contrato nos dois espelhos
```

Recursos no instante da redação, sem invocar Docker nem banco: memória de commit livre e disco C; o redator para abaixo de 7,5 GB, medido por: `powershell.exe -NoProfile -Command '$o=Get-CimInstance Win32_PerfFormattedData_PerfOS_Memory; [math]::Round(($o.CommitLimit-$o.CommittedBytes)/1GB,2)'; df -BG /c | tail -1 | awk '{print "livre em C: " $(NF-2)}'`
```
12,35
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

Você é `inspetor-san312b-ciclo3-<executor>`, identidade nova nomeada pelo §4 do parecer da reprovação do ciclo 2, o inspetor de terreno do ciclo 3; executor Claude Opus ou Codex GPT-5.6 Sol, nível menor declarado. Você NÃO vota mérito. Corpo canônico: `C:/Users/AMP/w-san312b/.claude/agents/inspetor-de-terreno-da-junta.md`, carregado do blob do objeto. Onde corpo e mandato divergirem sobre objeto, composição, inelegíveis, itens ou diretório, vale este mandato; onde o corpo trata votante do ciclo anterior, vale o §C7 item 9 (só a cadeira vermelha é refeita; a verde cruzada pelo diff é revalidada por identidade nova). Primeira linha de `inspetor-san312b-c3-evidencia.md`: identidade, executor, modelo, nível, objeto, mandato_md5 sem CR e corpo IDENTICO/DIVERGE EOL-neutro. Modelo menor esgotado: PARE (§C7.6-bis). Inelegíveis: `planejador-mestre`, `planejador-san312-e1-fable`, `planejador-san312b-c1rep-fable`, `planejador-san312b-c2rep-fable`, `crit-san312-pro`, `crit-san312-opus-r2`, `crit-san312-pro-r2`, `crit-san3-12-r2-pro`, `crit-san312a-e1-opus`, `crit-san312-argon`, `crit-san312-sol`, `dev-san312b-sol`, `dev-san312b-opus`, `dev-san312b-ciclo2-sol`, `dev-san312b-c2-f1-sol`, `dev-san312b-c2-f2-sol`, `dev-san312b-c2-f3-sol`, `dev-san312b-c2-f4-sol`, `dev-san312b-c2-f4b-sol`, `dev-san312b-c2-f4-opus`, `dev-san312b-c2-f59-opus`, `dev-san312b-ciclo3-sol`, `dev-san312b-ciclo3-claude`, `fab-red-san312b-opus`, `redator-san312b`, `redator-san312b-c2`, `red-san312b-c2-sol`, `red-san312b-c3-opus`, `inspetor-san312b-opus`, `inspetor-san312b-c2-sol`, `jurado-san312b-c1-opus`, `jurado-san312b-c2-opus`, `jurado-san312b-c3-opus`, `jurado-san312b-c1-r2-opus`, `jurado-san312b-c2-r2b-opus`, `jurado-san312b-c2-r2-sol`, `jurado-san312b-c3-r2-opus` e o orquestrador da sessão; coincidiu, PARE, derruba com: `head -1 C:/Users/AMP/w-san312b/agent-orchestration/omega/juntas/votos/B-SAN3-12b-ciclo3/inspetor-san312b-c3-evidencia.md | grep -i -E 'identidade|executor|modelo|objeto|mandato|IDENTICO|DIVERGE'`

Item 1 de 3 — objeto, CI, árvore e S0: confirme por `gh pr view 469` e `git ls-remote` que o objeto continua o head do PR; que backend, backend-postgres e frontend têm ao menos um check-run e todos os runs desses nomes estão completed/success, e que nenhum check-run do objeto está queued ou in_progress (ausência ou cancelamento conta como ausente, §C7.1-bis); PR OPEN e mergeável; origin/main igual à merge-base e ancestral do objeto, sem merge da main a repetir (se a main andou, a E2.5 com a R-E3-1 vem antes da junta e você BLOQUEIA); o worktree do bloco no objeto, sem mutação rastreada e sem merge em curso. Meça disco ≥ 7,5 GB e memória de commit ≥ 4 GB. Faça a S0 em worktree descartável no objeto com `node scripts/sync-agent-agents.mjs --check` e a comparação EOL-neutra dos corpos, e remova-o; qualquer falha BLOQUEIA. Sem Docker e sem base viva, derruba com: `grep -i -E 'Item 1|gh pr view|ls-remote|backend-postgres|completed|success|in_progress|mergeável|origin/main|merge-base|status|7,5 GB|4 GB|S0|sync-agent-agents|remov' C:/Users/AMP/w-san312b/agent-orchestration/omega/juntas/votos/B-SAN3-12b-ciclo3/inspetor-san312b-c3-evidencia.md`

Item 2 de 3 — briefing, composição e identidade: confira no objeto o parecer da reprovação do ciclo 2 (§1 a §5), a E3 no plano versionado igual à do parecer, as RETOMADAS 10 a 13 e a seção Ciclo 3 do relatório do dev, os votos e evidências do ciclo 2 marcados a re-verificar e não herdados como fato, e os quatro mandatos PRE-VOO OK. C1 e C3 são refeitas pela regra (3); a C2 é revalidada pela regra (2), provada por comando: `git diff --name-only <objeto>~6 <objeto>` cruzado com o `arquivos_medidos` do voto da C2 do ciclo 2 dá interseção não vazia (FinanceiroViewA, pendências, índice e plano), logo o voto não carrega. Confira por nome que nenhum executor coincide com planejadores, críticos, devs (inclusive `dev-san312b-ciclo3-claude`), fábrica e redatores, inspetores dos ciclos 1 e 2, jurados dos ciclos 1 e 2 e o orquestrador, e que a C1 é obrigatoriamente Claude. Compare corpo carregado e corpo julgado de cada cadeira, EOL-neutro, derruba com: `grep -i -E 'Item 2|parecer|Emenda E3|RETOMADA 13|Ciclo 3|a re-verificar|PRE-VOO OK|refeita|revalidada|objeto.~6|arquivos_medidos|interseção|inelegível|dev-san312b-ciclo3-claude|C1.*Claude|EOL' C:/Users/AMP/w-san312b/agent-orchestration/omega/juntas/votos/B-SAN3-12b-ciclo3/inspetor-san312b-c3-evidencia.md`

Item 3 de 3 — isolamento e plano de perda: nomeie os worktrees exclusivos `j12b-c3-c1r3-wt`, `j12b-c3-c2rev3-wt` e `j12b-c3-c3r3-wt`, `npm ci` próprio e zero junction; uma cadeira por vez, salvo disco ≥ 8,8 GB e memória de commit ≥ 4 GB medidos para a segunda (o parecer do ciclo 2); portas altas próprias; nenhuma base viva. C1 sem banco; C2 com backend em memória; C3 usa a CI como régua e só cria Postgres descartável com nome e porta próprios se você autorizar e houver recurso. Confirme que o diretório de saída do ciclo 3 só tem os mandatos e que cada cadeira nasce com evidência e voto-esqueleto, P1/P2/P3/P4/P7, queda registrada em `00-quedas.md` e sucessor de identidade nova. Declare a ordem de disparo e o limiar de disco: abaixo de 7,5 GB, PARE. Parecer final `LIBERADO`, `LIBERADO COM RESSALVA` ou `BLOQUEADO`, com ressalvas numeradas; sem liberação nenhuma cadeira começa, derruba com: `grep -i -E 'Item 3|j12b-c3-c1r3-wt|j12b-c3-c2rev3-wt|j12b-c3-c3r3-wt|junction|uma cadeira|8,8 GB|porta|base viva|voto-esqueleto|P1|P7|00-quedas|7,5 GB|LIBERADO|BLOQUEADO' C:/Users/AMP/w-san312b/agent-orchestration/omega/juntas/votos/B-SAN3-12b-ciclo3/inspetor-san312b-c3-evidencia.md`

P1/P2/P3/P4/P7: após CADA item, apense comando, saída resumida e veredito parcial em `inspetor-san312b-c3-evidencia.md`; `inspetor-san312b-c3-parecer.md` nasce esqueleto com os três itens EM APURAÇÃO e fecha antes da mensagem final de uma linha; sucessor de identidade nova reexecuta tudo o que estiver registrado; máximo três itens; PAUSA grava head, feito, falta, próximo comando e arquivos parciais e para. Os únicos outputs no repositório ficam em `C:/Users/AMP/w-san312b/agent-orchestration/omega/juntas/votos/B-SAN3-12b-ciclo3/`; nunca commit, derruba com: `test -f C:/Users/AMP/w-san312b/agent-orchestration/omega/juntas/votos/B-SAN3-12b-ciclo3/inspetor-san312b-c3-parecer.md`

