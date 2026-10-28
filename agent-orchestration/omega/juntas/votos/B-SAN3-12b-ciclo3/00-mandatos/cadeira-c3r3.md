# Mandato — C3 refeita — B-SAN3-12b, junta de DINHEIRO, ciclo 3

## MEDIDO

Estado atual do PR 469 pela ferramenta de refs copiada sem alteração para a pasta deste redator: ramo, base, estado, objeto, merge-base, check-runs e ausência de ata final, medido por: `cd C:/Users/AMP/w-san312b && bash C:/Users/AMP/erp-pausa-2026-10-03/redator-san312b-c3/mandato-refs.sh 469`
```
# refs do PR #469 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato
# gerado em: 2026-10-28T04:17Z · repo: thiagodorgo/ERP_Techsolutios

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

O corpo canônico desta cadeira existe no objeto e é IDÊNTICO entre os dois espelhos depois de retirar frontmatter e orientação Codex, em comparação EOL-neutra pelo blob; o ciclo 3 não mudou nenhum corpo de agente, medido por: `cd C:/Users/AMP/w-san312b && diff <(git show cfb19fd115bac02ef65eb94202b01a64e6730854:.claude/agents/especialistas/jurado-san312b-c3-dinheiro-e-contrato.md | tr -d '\r' | awk 'f; $0=="---"{n++; if(n==2) f=1}' | sed '/^$/d') <(git show cfb19fd115bac02ef65eb94202b01a64e6730854:.agents/agents/especialistas/jurado-san312b-c3-dinheiro-e-contrato.md | tr -d '\r' | awk 'f; $0=="---"{n++; if(n==2) f=1}' | awk 'index($0,"Papel para o Codex"){s=1} s&&$0==""{s=0; next} !s' | sed '/^$/d') >/dev/null && echo 'IDENTICO corpo c3-dinheiro-e-contrato' || echo 'DIVERGE corpo c3-dinheiro-e-contrato'; echo "corpos mudados no ciclo 3: $(git diff --name-only cfb19fd115bac02ef65eb94202b01a64e6730854~6 cfb19fd115bac02ef65eb94202b01a64e6730854 -- .claude/agents .agents/agents | wc -l)"`
```
IDENTICO corpo c3-dinheiro-e-contrato
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

A trava do F8 no objeto: os dois casos F8/E3 existem, a contagem congelada de tokens é 6, e o inventário de ocorrências no módulo financeiro do objeto continua 8, igual ao do objeto do ciclo 2 (o produto não mudou nesse ponto), medido por: `echo "casos F8/E3: $(grep -c -i -E '^test\("F8/E3' C:/Users/AMP/w-san312b/frontend/tests/finance-no-money-reduce.guard.test.ts)"; grep -i -E '^const FROZEN_REDUCE_TOKENS' C:/Users/AMP/w-san312b/frontend/tests/finance-no-money-reduce.guard.test.ts; for r in cfb19fd115bac02ef65eb94202b01a64e6730854 cfb19fd115bac02ef65eb94202b01a64e6730854~6; do echo "ocorrências F8 no módulo: $(git -C C:/Users/AMP/w-san312b grep -i -n -E 'reduce\(|\+= *[a-zA-Z.]*amount' $r -- frontend/src/modules/finance | wc -l)"; done`
```
casos F8/E3: 2
const FROZEN_REDUCE_TOKENS = 6;
ocorrências F8 no módulo: 8
ocorrências F8 no módulo: 8
```

A propriedade de três vias da R-E3-1, medida para o registro de pendências: A são as linhas que o ramo acrescentou entre a base do ramo (o vigésimo sexto primeiro-pai) e o objeto do ciclo 1, B as que removeu; no objeto do ciclo 2 faltam 4 linhas de A e voltaram 2 de B; no objeto, 0 e 0, medido por: `cd C:/Users/AMP/w-san312b && f=agent-orchestration/controle/pendencias.md; t=$(mktemp -d); git diff cfb19fd115bac02ef65eb94202b01a64e6730854~26 cfb19fd115bac02ef65eb94202b01a64e6730854~19 -- $f | tr -d '\r' | grep -i -E '^[+]' | grep -v -i -E '^[+][+][+] ' | cut -c2- | sort -u > $t/A; git diff cfb19fd115bac02ef65eb94202b01a64e6730854~26 cfb19fd115bac02ef65eb94202b01a64e6730854~19 -- $f | tr -d '\r' | grep -i -E '^-' | grep -v -i -E '^--- ' | cut -c2- | sort -u > $t/B; echo "A=$(wc -l < $t/A) B=$(wc -l < $t/B)"; for r in cfb19fd115bac02ef65eb94202b01a64e6730854~6 cfb19fd115bac02ef65eb94202b01a64e6730854; do git show $r:$f | tr -d '\r' | sort -u > $t/H; echo "$( [ $r = cfb19fd115bac02ef65eb94202b01a64e6730854 ] && echo objeto || echo objeto-do-ciclo-2): comm-23=$(comm -23 $t/A $t/H | wc -l) comm-12=$(comm -12 $t/B $t/H | wc -l)"; done; rm -rf $t`
```
A=15 B=2
objeto-do-ciclo-2: comm-23=4 comm-12=2
objeto: comm-23=0 comm-12=0
```

O registro do objeto: as duas seções restauradas estão FECHADAS, as 5 pendências novas da E3.4 existem uma vez cada, a D-6 está marcada como superada, o número de cabeçalhos de pendência subiu exatamente 5 em relação ao objeto do ciclo 2, e o índice versionado é igual à saída do gerador rodado no worktree de ferramenta (que fica limpo depois), medido por: `for id in P-SAN3-20-RESUMO-CHEQUE-VINCULADO P-SAN3-12-REFERENCIA-FINANCEIRO-3OPCOES-CHEQUE; do printf "$id: "; tr -d '\r' < C:/Users/AMP/w-san312b/agent-orchestration/controle/pendencias.md | awk -v h="## $id " 'index($0,h)==1{f=1;next} /^## /{f=0} f' | grep -i -m1 -o -E 'status:\*\* [A-Z]+'; done; for id in P-SAN3-12B-R4B-TRAVA-RODADA-SEM-TESTE P-SAN3-12B-KPI-PRESSED-COM-CONTA P-SAN3-12B-PERFIL-SEM-ENTRIES-READ-VAZIO P-SAN3-12B-PAGER-ROTULO-FILTRADO P-REGISTRO-MERGE-CONFERE-TRES-VIAS; do printf "$id: "; tr -d '\r' < C:/Users/AMP/w-san312b/agent-orchestration/controle/pendencias.md | grep -c -i -E "^## $id( |\$)"; done; echo "D-6 SUPERADA: $(grep -c -i 'SUPERADA no ciclo 2 pela E2/R5' C:/Users/AMP/w-san312b/docs/revisoes/SAN3/B-SAN3-12b-dev.md)"; pf=agent-orchestration/controle/pendencias.md; for r in cfb19fd115bac02ef65eb94202b01a64e6730854~6 cfb19fd115bac02ef65eb94202b01a64e6730854; do echo "cabeçalhos de pendência: $(git -C C:/Users/AMP/w-san312b show $r:$pf | grep -c -i '^## P-')"; done; cd C:/Users/AMP/w-trc02 && python -I agent-orchestration/controle/gerar-indice-pendencias.py >/dev/null && echo "diff do índice após o gerador: $(git diff --numstat -- agent-orchestration/controle/pendencias-indice.md | wc -l)"; git checkout -q -- agent-orchestration/controle/pendencias-indice.md; echo "worktree de ferramenta modificado: $(git status --porcelain | wc -l)"`
```
P-SAN3-20-RESUMO-CHEQUE-VINCULADO: status:** FECHADA
P-SAN3-12-REFERENCIA-FINANCEIRO-3OPCOES-CHEQUE: status:** FECHADA
P-SAN3-12B-R4B-TRAVA-RODADA-SEM-TESTE: 1
P-SAN3-12B-KPI-PRESSED-COM-CONTA: 1
P-SAN3-12B-PERFIL-SEM-ENTRIES-READ-VAZIO: 1
P-SAN3-12B-PAGER-ROTULO-FILTRADO: 1
P-REGISTRO-MERGE-CONFERE-TRES-VIAS: 1
D-6 SUPERADA: 3
cabeçalhos de pendência: 670
cabeçalhos de pendência: 675
diff do índice após o gerador: 0
worktree de ferramenta modificado: 0
```

O PR está mergeável, sem merge novo da main, o test:smoke lista os testes do bloco sem duplicação nominal, e os roteiros da C3 do ciclo 2 (sonda da baixa, mutações e bateria) existem fora do repositório, medido por: `cd C:/Users/AMP/w-san312b && gh pr view 469 --json mergeable,mergeStateStatus --jq '.mergeable + " " + .mergeStateStatus'; git show cfb19fd115bac02ef65eb94202b01a64e6730854:frontend/package.json | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const t=JSON.parse(s).scripts["test:smoke"];const a=t.match(/tests\/[A-Za-z0-9._-]+/g)||[];console.log("tokens",a.length,"únicos",new Set(a).size)})'; for f in zz-j12bc3r2-sonda.test.tsx mutar.mjs bateria.sh mut-item1.json mut-item2.json mut-f18.json; do test -f C:/Users/AMP/erp-pausa-2026-10-03/j12b2-c3r2/$f && echo "$f existe" || echo "$f falta"; done; for f in sonda.ts guard.ts; do test -f C:/Users/AMP/erp-pausa-2026-10-03/plan12b-c2rep/f8/$f && echo "f8 $f existe"; done`
```
MERGEABLE CLEAN
tokens 169 únicos 169
zz-j12bc3r2-sonda.test.tsx existe
mutar.mjs existe
bateria.sh existe
mut-item1.json existe
mut-item2.json existe
mut-f18.json existe
f8 sonda.ts existe
f8 guard.ts existe
```

Recursos no instante da redação, sem invocar Docker nem banco: memória de commit livre e disco C; o redator para abaixo de 7,5 GB, medido por: `powershell.exe -NoProfile -Command '$o=Get-CimInstance Win32_PerfFormattedData_PerfOS_Memory; [math]::Round(($o.CommitLimit-$o.CommittedBytes)/1GB,2)'; df -BG /c | tail -1 | awk '{print "livre em C: " $(NF-2)}'`
```
12,33
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

Você é `jurado-san312b-ciclo3-c3-<executor>`, identidade nova nomeada pelo §4 do parecer da reprovação do ciclo 2, e esta é a C3 REFEITA pela regra (3) do §C7 item 9; executor Claude Opus ou Codex GPT-5.6 Sol, nível menor declarado, com capacidade para a medição requerida. Corpo canônico: `C:/Users/AMP/w-san312b/.claude/agents/especialistas/jurado-san312b-c3-dinheiro-e-contrato.md`, carregado do blob do objeto. Onde corpo e mandato divergirem sobre objeto, itens, régua, diretório ou inelegíveis, vale este mandato. Primeira linha de `c3r3-evidencia.md`: identidade, executor, modelo, nível, objeto, mandato_md5 sem CR e corpo IDENTICO/DIVERGE EOL-neutro. Modelo menor esgotado: PARE sem votar (§C7.6-bis). Inelegíveis: `planejador-mestre`, `planejador-san312-e1-fable`, `planejador-san312b-c1rep-fable`, `planejador-san312b-c2rep-fable`, `crit-san312-pro`, `crit-san312-opus-r2`, `crit-san312-pro-r2`, `crit-san3-12-r2-pro`, `crit-san312a-e1-opus`, `crit-san312-argon`, `crit-san312-sol`, `dev-san312b-sol`, `dev-san312b-opus`, `dev-san312b-ciclo2-sol`, `dev-san312b-c2-f1-sol`, `dev-san312b-c2-f2-sol`, `dev-san312b-c2-f3-sol`, `dev-san312b-c2-f4-sol`, `dev-san312b-c2-f4b-sol`, `dev-san312b-c2-f4-opus`, `dev-san312b-c2-f59-opus`, `dev-san312b-ciclo3-sol`, `dev-san312b-ciclo3-claude`, `fab-red-san312b-opus`, `redator-san312b`, `redator-san312b-c2`, `red-san312b-c2-sol`, `red-san312b-c3-opus`, `inspetor-san312b-opus`, `inspetor-san312b-c2-sol`, `jurado-san312b-c1-opus`, `jurado-san312b-c2-opus`, `jurado-san312b-c3-opus`, `jurado-san312b-c1-r2-opus`, `jurado-san312b-c2-r2b-opus`, `jurado-san312b-c2-r2-sol`, `jurado-san312b-c3-r2-opus` e o orquestrador da sessão; coincidiu, PARE, derruba com: `head -1 C:/Users/AMP/w-san312b/agent-orchestration/omega/juntas/votos/B-SAN3-12b-ciclo3/c3r3-evidencia.md | grep -i -E 'identidade|executor|modelo|objeto|mandato|IDENTICO|DIVERGE'`

Legalidade antes do mérito: exija `inspetor-san312b-c3-parecer.md` LIBERADO ou LIBERADO COM RESSALVA para seu nome, executor e worktree; confirme de novo que o head do PR 469 é o objeto e que backend, backend-postgres e frontend estão completed/success. Régua do ciclo 3 (§C7 item 8(2)): DINHEIRO, unanimidade de 3; só reprova defeito de produto GRAVE — perde dado, vaza dado entre organizações, quebra permissão ou erra dinheiro; um bloqueia de classe não grave vira pendência proposta com dono e a cadeira vota APROVADO com ressalva. Foco: C3R2-01 (R-E3-2) e C3R2-02 (R-E3-1), mais a regressão dos itens desta cadeira. Todo achado declara gravidade, escopo (com evidência de data ou origem; sem evidência conta como dentro-do-bloco), classe grave ou não grave com a razão, N e forma. Não leia votos nem evidências do ciclo 3 das outras cadeiras; os votos do ciclo 2 são insumo a re-verificar. Não proponha correção nem reabra decisão do plano. Declare `arquivos_medidos`, usando `**` se rodar check, build ou suíte total, derruba com: `grep -i -E 'legalidade|unanimidade|ciclo 3|grave|classe|C3R2-01|C3R2-02|arquivos_medidos' C:/Users/AMP/w-san312b/agent-orchestration/omega/juntas/votos/B-SAN3-12b-ciclo3/c3r3-voto.json`

Terreno: worktree exclusivo `C:/Users/AMP/j12b-c3-c3r3-wt`, detached no objeto, `npm ci` próprio, zero junction e nunca a base viva. A régua do F18 e do CE-4 é o job `backend` (e o `backend-postgres`) da CI no objeto; Postgres descartável local só se o inspetor autorizar e houver recurso, com nome e porta altos próprios, nunca `erp-postgres`. Antes de instalar: memória de commit livre ≥ 4 GB e disco ≥ 7,5 GB; abaixo, PARE. Copie para pasta sua os roteiros `C:/Users/AMP/erp-pausa-2026-10-03/j12b2-c3r2/` e `C:/Users/AMP/erp-pausa-2026-10-03/plan12b-c2rep/f8/` e troque mecanicamente o worktree antigo pelo seu; TAP e JSON antigos não são resultado. Mutação uma por vez, âncora única, restauro por hash contra o blob. Vermelho-controle usa `<objeto>~6` (objeto do ciclo 2) ou a mutação nominal, sempre restaurado. Teardown remove processos, artefatos, worktree e qualquer recurso descartável, derruba com: `grep -i -E 'j12b-c3-c3r3-wt|base viva|backend-postgres|4 GB|7,5 GB|roteiro|objeto.~6|restauro|teardown' C:/Users/AMP/w-san312b/agent-orchestration/omega/juntas/votos/B-SAN3-12b-ciclo3/c3r3-evidencia.md`

Item 1 de 3 — R-E3-2, a trava do F8 pela propriedade (C3R2-01): execute o guard do objeto e as 5 mutações de receptor da E3, uma por vez — `items.filter(f).reduce(` em `frontend/src/modules/finance/entries/`, `Object.values(m).reduce(`, `(list ?? []).reduce(` e `arr[0].reduce(` na view A, `items?.reduce(` em `frontend/src/modules/finance/accounts/` — mais a entrada falsa no inventário: todas vermelhas no guard do objeto e as 4 primeiras verdes no guard de `<objeto>~6` (o vermelho-controle). Prove a contagem de tokens 6 no módulo e 0 em `frontend/src/modules/finance/accounts/`, `frontend/src/modules/finance/entries/` e `frontend/src/modules/finance/pages/`, o inventário de 8 inalterado e as 8 chaves iguais às do objeto do ciclo 2; meça o resíduo que o relatório declara (`.reduceRight(`, `["reduce"](`, `.reduce.call(`) e diga se é grave. Reexecute por mutação a regressão F8, R12, F9, F10, F14, R4, F20 e F22 (roteiro `mut-item2.json` e afins), derruba com: `grep -i -E 'Item 1|R-E3-2|C3R2-01|receptor|filter|Object.values|accounts|inventário|contagem|resíduo|F8|R12|F9|F10|F14|R4|F20|F22|objeto.~6|vermelho' C:/Users/AMP/w-san312b/agent-orchestration/omega/juntas/votos/B-SAN3-12b-ciclo3/c3r3-evidencia.md`

Item 2 de 3 — R-E3-1 e o registro (C3R2-02): meça a propriedade de três vias com A e B tirados de `git diff <objeto>~26 <objeto>~19` no registro de pendências — no objeto os dois `comm` dão 0 e 0, e em `<objeto>~6` dão 4 e 2; as duas seções restauradas são iguais às de `<objeto>~19`; o desconto nominal do relatório do dev (2 linhas da D-8 antiga, reescritas de propósito pela E2/R13(c)) confere com o commit que ele nomeia; o índice é igual ao gerador numa cópia (R7). Confira a R-E3-6: D-6 marcada superada, a E3 apensa ao plano versionado igual à do parecer, as 5 pendências da E3.4 com dono e critério, e as 6 já abertas inalteradas. Cruze `git diff --name-only <objeto>~6 <objeto>` com o PERMITIDO e o PROIBIDO da E3.1 e prove zero edição em `src`, `prisma`, `.github`, `Kpis` e `frontend/package.json`. Execute a M-E3-1 (a linha de status ABERTA de volta) e veja o `comm` acusar, derruba com: `grep -i -E 'Item 2|R-E3-1|C3R2-02|três vias|comm|4 e 2|0 e 0|objeto.~19|D-8|índice|gerador|R-E3-6|D-6|E3.4|E3.1|PERMITIDO|PROIBIDO|M-E3-1|vermelho' C:/Users/AMP/w-san312b/agent-orchestration/omega/juntas/votos/B-SAN3-12b-ciclo3/c3r3-evidencia.md`

Item 3 de 3 — bateria, backend e a baixa: rode no seu worktree a bateria da R-E3-7 no cwd correto — `npm --prefix frontend run check`, a linha de arquivos do bloco (esperado 122 com o `pattern-css-guard`, 119 sem ele), `test:smoke` em Node 20 e em Node 22 (esperado ≥ 1482, fail 0), `npm --prefix frontend run build`, raiz `npm run check`, `npm run lint` e `npm run build`, e `git diff --check`; publique tests, pass, fail e skipped de cada linha. Prove o backend byte-idêntico ao do objeto do ciclo 2 (`git diff --name-only <objeto>~6 <objeto> -- src prisma scripts` vazio) e o job `backend` da CI verde no objeto. Refaça a regressão da baixa F1 a F5, F21, R5 e R6 pela sonda `zz-j12bc3r2-sonda.test.tsx` (esperado 5 de 5) e reexecute R5-M1 e R6-M1. Declare cada redução de amostra, derruba com: `grep -i -E 'Item 3|R-E3-7|check|122|119|1482|Node 20|Node 22|build|lint|diff --check|src prisma scripts|backend|F1|F5|F21|R5|R6|sonda|5 de 5' C:/Users/AMP/w-san312b/agent-orchestration/omega/juntas/votos/B-SAN3-12b-ciclo3/c3r3-evidencia.md`

P1/P2/P3/P4/P7: após CADA item, apense comando, saída resumida e veredito parcial em `c3r3-evidencia.md`; `c3r3-voto.json` nasce esqueleto com os três itens EM APURAÇÃO e `arquivos_medidos`, e fecha antes da mensagem final de uma linha; sucessor de identidade nova reexecuta tudo o que estiver registrado e mede a cauda; máximo três itens; PAUSA grava head, feito, falta, próximo comando e arquivos parciais e para. Os únicos outputs no repositório ficam em `C:/Users/AMP/w-san312b/agent-orchestration/omega/juntas/votos/B-SAN3-12b-ciclo3/`; nunca commit, derruba com: `test -f C:/Users/AMP/w-san312b/agent-orchestration/omega/juntas/votos/B-SAN3-12b-ciclo3/c3r3-voto.json`

