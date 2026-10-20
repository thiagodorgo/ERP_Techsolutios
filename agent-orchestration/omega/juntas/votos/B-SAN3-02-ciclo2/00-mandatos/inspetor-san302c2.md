# Mandato — Inspetor de terreno — B-SAN3-02 ciclo 2 (junta de DINHEIRO)

## MEDIDO

Estado do PR 448 no instante da redação, pela ferramenta `mandato-refs.sh` copiada sem mudança da pasta do redator do ciclo 1 para a pasta própria deste redator `C:/Users/AMP/erp-pausa-2026-10-03/redator-san302c2/` (o `RAIZ=C:/Users/AMP/w-san3-02` já estava na cópia do ciclo 1; `cmp` das duas cópias = iguais), com o cwd no worktree do objeto; a ferramenta sai com ec 3 porque a ata do ciclo 1 nomeia o PR sem declarar aprovação, medido por: `cd C:/Users/AMP/w-san3-02 && bash C:/Users/AMP/erp-pausa-2026-10-03/redator-san302c2/mandato-refs.sh 448`
```
# refs do PR #448 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato
# gerado em: 2026-10-20T05:57Z · repo: thiagodorgo/ERP_Techsolutios

ramo:            fix/faturamento-atomico-e-delta
base:            origin/main
estado:          OPEN | rascunho=false | MERGEABLE
head do PR:      09b380dab54946e16303c8bae0e95bbaa0d667a5
merge-base:      9009e81be3c5a711584747428c55707a17afc009
merge commit:    <ainda nao mergeado>
check-runs:      total=14 nao-verdes=0 pendentes=0
approved_head:   NAO DETERMINAVEL (a ata casa o PR mas NAO declara aprovacao: nenhuma linha '- **approved_head:**')
                 objeto declarado 8e6a6c29b8a0aced5bf3968383aa9ef247019f46 (agent-orchestration/omega/juntas/J-B-SAN3-02-ciclo1.md:3 @head-do-PR) — aprovacao nao legivel por maquina
                 NAO invente: sem a linha '- **approved_head:**' numa ata que se declare
                 sobre este PR, a ferramenta NAO afirma qual head a junta aprovou.
```

O ramo remoto aponta para o mesmo SHA que o PR declara como head (segunda fonte do objeto), medido por: `git ls-remote origin refs/heads/fix/faturamento-atomico-e-delta`
```
09b380dab54946e16303c8bae0e95bbaa0d667a5	refs/heads/fix/faturamento-atomico-e-delta
```

Os 14 check-runs do objeto estão concluídos e todos `success` (zero fora de `completed success`), em sete jobs com os dois gatilhos (push e pull_request), medido por: `gh api repos/thiagodorgo/ERP_Techsolutios/commits/09b380dab54946e16303c8bae0e95bbaa0d667a5/check-runs --jq '.total_count, ([.check_runs[] | select(.status != "completed" or .conclusion != "success")] | length), ([.check_runs[] | .name] | sort | join(", "))'`
```
14
0
authority-portal, authority-portal, backend, backend, backend-postgres, backend-postgres, docker, docker, flutter, flutter, frontend, frontend, owner-portal, owner-portal
```

Do objeto do ciclo 1 (`8e6a6c29b8a0aced5bf3968383aa9ef247019f46`) ao objeto do ciclo 2 há três commits de primeiro pai: o conserto, o registro do ciclo 1 e um merge da `origin/main`; o diff cru entre os dois objetos tem 138 caminhos, mas o do primeiro pai do merge (o trabalho próprio do bloco) tem 16, e só dois deles são código, medido por: `cd C:/Users/AMP/w-san3-02 && git rev-list --first-parent --count 8e6a6c29b8a0aced5bf3968383aa9ef247019f46..09b380dab54946e16303c8bae0e95bbaa0d667a5; git log --first-parent --format='%ad %s' --date=short 8e6a6c29b8a0aced5bf3968383aa9ef247019f46..09b380dab54946e16303c8bae0e95bbaa0d667a5 | cut -d'(' -f1 | cut -d"'" -f1; git diff --name-only 8e6a6c29b8a0aced5bf3968383aa9ef247019f46 09b380dab54946e16303c8bae0e95bbaa0d667a5 | wc -l; git diff --name-only 8e6a6c29b8a0aced5bf3968383aa9ef247019f46 "$(git rev-parse 09b380dab54946e16303c8bae0e95bbaa0d667a5^1)" | wc -l; git diff --name-only 8e6a6c29b8a0aced5bf3968383aa9ef247019f46 "$(git rev-parse 09b380dab54946e16303c8bae0e95bbaa0d667a5^1)" -- prisma src tests .github Kpis .claude .agents`
```
3
2026-10-20 Merge remote-tracking branch 
2026-10-20 docs
2026-10-20 fix
138
16
prisma/migrations/20260878000000_invoice_complementary_title/migration.sql
tests/work-order-invoicing-migration-drill-db.test.ts
```

O merge `origin/main` dentro do ramo NÃO é sem conteúdo próprio: a árvore do objeto difere do merge automático exatamente nos três arquivos de registro em que houve conflito, e a resolução não removeu linha de `decisoes.md` nem de `pendencias.md` contra nenhum dos dois pais; o índice gerado `pendencias-indice.md` perdeu linhas contra os dois pais (contadores e números de linha), medido por: `cd C:/Users/AMP/w-san3-02 && P1=$(git rev-parse 09b380dab54946e16303c8bae0e95bbaa0d667a5^1); git merge-tree --write-tree --name-only "$P1" 9009e81be3c5a711584747428c55707a17afc009 | sed -n '2,4p'; T=$(git merge-tree --write-tree "$P1" 9009e81be3c5a711584747428c55707a17afc009 | head -1); git diff --name-only "$T" "09b380dab54946e16303c8bae0e95bbaa0d667a5^{tree}"; for f in agent-orchestration/controle/decisoes.md agent-orchestration/controle/pendencias.md agent-orchestration/controle/pendencias-indice.md; do echo "$f removidas_vs_ramo=$(git diff --numstat "$P1" 09b380dab54946e16303c8bae0e95bbaa0d667a5 -- $f | cut -f2) removidas_vs_main=$(git diff --numstat 9009e81be3c5a711584747428c55707a17afc009 09b380dab54946e16303c8bae0e95bbaa0d667a5 -- $f | cut -f2)"; done`
```
agent-orchestration/controle/decisoes.md
agent-orchestration/controle/pendencias-indice.md
agent-orchestration/controle/pendencias.md
agent-orchestration/controle/decisoes.md
agent-orchestration/controle/pendencias-indice.md
agent-orchestration/controle/pendencias.md
agent-orchestration/controle/decisoes.md removidas_vs_ramo=0 removidas_vs_main=0
agent-orchestration/controle/pendencias.md removidas_vs_ramo=0 removidas_vs_main=0
agent-orchestration/controle/pendencias-indice.md removidas_vs_ramo=14 removidas_vs_main=7
```

Os insumos do ciclo 2 existem no objeto: o plano do ciclo 2 com a auditoria de topo (`R-B-SAN3-02-1.md`), a ata do ciclo 1, o relatório do dev com a seção do ciclo 2, o plano v2 com os anexos, os votos e evidências do ciclo 1, o parecer do DBA e o registro de quedas, medido por: `cd C:/Users/AMP/w-san3-02 && for p in agent-orchestration/omega/reprovacoes/R-B-SAN3-02-1.md agent-orchestration/omega/juntas/J-B-SAN3-02-ciclo1.md docs/revisoes/SAN3/B-SAN3-02-dev.md docs/revisoes/SAN3/B-SAN3-02-plano.md agent-orchestration/omega/juntas/votos/B-SAN3-02/c1-voto.json agent-orchestration/omega/juntas/votos/B-SAN3-02/c1-evidencia.md agent-orchestration/omega/juntas/votos/B-SAN3-02/c2-voto.json agent-orchestration/omega/juntas/votos/B-SAN3-02/c2-evidencia.md agent-orchestration/omega/juntas/votos/B-SAN3-02/dba-parecer.md agent-orchestration/omega/juntas/votos/B-SAN3-02/00-quedas.md; do git cat-file -e "09b380dab54946e16303c8bae0e95bbaa0d667a5:$p" && echo "PRESENTE $p"; done; git show 09b380dab54946e16303c8bae0e95bbaa0d667a5:docs/revisoes/SAN3/B-SAN3-02-dev.md | tr -d '\r' | grep -n -i -E '^## Ciclo 2 \(20/10\)'`
```
PRESENTE agent-orchestration/omega/reprovacoes/R-B-SAN3-02-1.md
PRESENTE agent-orchestration/omega/juntas/J-B-SAN3-02-ciclo1.md
PRESENTE docs/revisoes/SAN3/B-SAN3-02-dev.md
PRESENTE docs/revisoes/SAN3/B-SAN3-02-plano.md
PRESENTE agent-orchestration/omega/juntas/votos/B-SAN3-02/c1-voto.json
PRESENTE agent-orchestration/omega/juntas/votos/B-SAN3-02/c1-evidencia.md
PRESENTE agent-orchestration/omega/juntas/votos/B-SAN3-02/c2-voto.json
PRESENTE agent-orchestration/omega/juntas/votos/B-SAN3-02/c2-evidencia.md
PRESENTE agent-orchestration/omega/juntas/votos/B-SAN3-02/dba-parecer.md
PRESENTE agent-orchestration/omega/juntas/votos/B-SAN3-02/00-quedas.md
203:## Ciclo 2 (20/10)
```

Duas peças que o plano do ciclo 2 previa NÃO estão no objeto: o `# ANEXO D` apensado ao plano (§7.1 do plano do ciclo 2; o texto existe só como `R-B-SAN3-02-1.md`) e qualquer artefato do revisor independente do ciclo 2 (`rev-san302-c2-agyopus` ou o sucessor `rev-san302-c2-opus`, §9 do plano do ciclo 2), nem no repositório nem na pasta de revisões fora dele; o único arquivo que nomeia o revisor é o próprio plano, medido por: `cd C:/Users/AMP/w-san3-02 && git show 09b380dab54946e16303c8bae0e95bbaa0d667a5:docs/revisoes/SAN3/B-SAN3-02-plano.md | tr -d '\r' | grep -c -i '^# ANEXO D'; git grep -l -i -E 'rev-san302-c2-(agyopus|opus)' 09b380dab54946e16303c8bae0e95bbaa0d667a5 | cut -d: -f2; ls C:/Users/AMP/erp-pausa-2026-10-03/revisoes/ | grep -c -i -E 'san3-02-.*(ciclo2|c2)'`
```
0
agent-orchestration/omega/reprovacoes/R-B-SAN3-02-1.md
0
```

A regra `D-JUNTA-SO-CADEIRA-VERMELHA` está no objeto (contrato §C7 item 9, decisões e o item 6 do corpo do inspetor de terreno), medido por: `cd C:/Users/AMP/w-san3-02 && git show 09b380dab54946e16303c8bae0e95bbaa0d667a5:CLAUDE.md | tr -d '\r' | grep -n -i -o 'JUNTA: SÓ A CADEIRA VERMELHA É REFEITA, COM TRAVA'; git show 09b380dab54946e16303c8bae0e95bbaa0d667a5:agent-orchestration/controle/decisoes.md | tr -d '\r' | grep -n -i -o 'D-JUNTA-SO-CADEIRA-VERMELHA. (decisão do dono, 2026-10-20)'; git show 09b380dab54946e16303c8bae0e95bbaa0d667a5:.claude/agents/inspetor-de-terreno-da-junta.md | tr -d '\r' | grep -n -i -o -E '^### 6\. Voto carregado de cadeira verde|^6\.1 \*\*Toda cadeira|^6\.1-bis \*\*Precedência|^6\.2 \*\*Voto carregado sem esse comando'`
```
809:JUNTA: SÓ A CADEIRA VERMELHA É REFEITA, COM TRAVA
3789:D-JUNTA-SO-CADEIRA-VERMELHA` (decisão do dono, 2026-10-20)
149:### 6. Voto carregado de cadeira verde
151:6.1 **Toda cadeira
152:6.1-bis **Precedência
153:6.2 **Voto carregado sem esse comando
```

O voto APROVADO da C1 do ciclo 1 não tem o campo `arquivos_medidos`, e a ata do ciclo 1 já declara a C1 como REVALIDADA pela regra (0), enquanto o plano do ciclo 2 (§9-bis, escrito antes da regra (0) estar na `main`) a dava como CARREGADA e nomeava as cadeiras refeitas como `jurado-san302-c2b-opus` e `jurado-san302-c3b-opus`; vale a ata, posterior e conforme a regra no objeto (§A2: registrado, não consolidado em silêncio), medido por: `cd C:/Users/AMP/w-san3-02 && git show 09b380dab54946e16303c8bae0e95bbaa0d667a5:agent-orchestration/omega/juntas/votos/B-SAN3-02/c1-voto.json | grep -c -i 'arquivos_medidos'; git show 09b380dab54946e16303c8bae0e95bbaa0d667a5:agent-orchestration/omega/juntas/J-B-SAN3-02-ciclo1.md | tr -d '\r' | grep -n -i -o -E 'escopo dela é total \(regra \(0\)\)|Por isso ela \*\*revalida\*\*'; git show 09b380dab54946e16303c8bae0e95bbaa0d667a5:agent-orchestration/omega/reprovacoes/R-B-SAN3-02-1.md | tr -d '\r' | grep -n -i -o -E 'a C1 \*\*carrega\*\* o voto|`jurado-san302-c2b-opus`, identidade e executor novos|`jurado-san302-c3b-opus`, identidade e executor novos'`
```
0
56:escopo dela é total (regra (0))
56:Por isso ela **revalida**
249:a C1 **carrega** o voto
253:`jurado-san302-c2b-opus`, identidade e executor novos
253:`jurado-san302-c3b-opus`, identidade e executor novos
```

Os arquivos que a C1 do ciclo 1 mediu (os 12 de `src/` do faturamento, as duas suítes e os ajudantes de teste) NÃO mudaram de um objeto para o outro; no conjunto que inclui `prisma/`, só a migração do bloco mudou, medido por: `cd C:/Users/AMP/w-san3-02 && git diff --name-only 8e6a6c29b8a0aced5bf3968383aa9ef247019f46 09b380dab54946e16303c8bae0e95bbaa0d667a5 -- src/modules/work-order-financials src/modules/financial-titles src/modules/financial-uow src/database tests/work-order-invoicing.test.ts tests/work-order-invoicing-atomic-db.test.ts tests/helpers prisma/schema.prisma prisma/migrations`
```
prisma/migrations/20260878000000_invoice_complementary_title/migration.sql
```

As sondas próprias da C1 do ciclo 1 (o driver, as duas suítes de sonda e os leitores, que viviam no worktree dela) não existem mais: o worktree delas foi removido e na pasta de logs só ficaram os quatro logs; o objeto também não as tem, medido por: `ls C:/Users/AMP/erp-pausa-2026-10-03/jsan302-c1/; test -e C:/Users/AMP/w-jsan302-c1 || echo "worktree w-jsan302-c1 ausente"; git -C C:/Users/AMP/w-san3-02 ls-tree -r --name-only 09b380dab54946e16303c8bae0e95bbaa0d667a5 | grep -c -i 'jsan302-c1'`
```
r4-espera.log
run1-obj.log
run2-all.log
run3-m5b.log
worktree w-jsan302-c1 ausente
0
```

Os três corpos das cadeiras existem no objeto, não mudaram desde o objeto do ciclo 1 e, descontados o frontmatter e o bloco de adaptação Codex do espelho, são IDÊNTICOS entre `.claude/agents/especialistas/` e `.agents/agents/especialistas/` (comparação EOL-neutra; o arquivo inteiro DIFERE por construção do espelho, e por isso não se publica hash); no diretório da sessão do orquestrador eles continuam ausentes (a R1 do ciclo 1 segue: o corpo sai do blob do objeto), medido por: `cd C:/Users/AMP/w-san3-02 && for c in c1-atomicidade-e-corrida c2-complementar-e-indice c3-regressao-e-contrato; do diff <(git show "09b380dab54946e16303c8bae0e95bbaa0d667a5:.claude/agents/especialistas/jurado-san302-$c.md" | tr -d '\r' | awk 'f; $0=="---"{n++; if(n==2) f=1}' | sed '/^$/d') <(git show "09b380dab54946e16303c8bae0e95bbaa0d667a5:.agents/agents/especialistas/jurado-san302-$c.md" | tr -d '\r' | awk 'f; $0=="---"{n++; if(n==2) f=1}' | awk 'index($0,"Papel para o Codex"){s=1} s&&$0==""{s=0; next} !s' | sed '/^$/d') >/dev/null && echo "IDENTICO corpo $c" || echo "DIVERGE corpo $c"; done; git diff --quiet 8e6a6c29b8a0aced5bf3968383aa9ef247019f46 09b380dab54946e16303c8bae0e95bbaa0d667a5 -- '.claude/agents/especialistas/jurado-san302-*' '.agents/agents/especialistas/jurado-san302-*' && echo "corpos jurado-san302 iguais entre os objetos"; git diff --quiet 8e6a6c29b8a0aced5bf3968383aa9ef247019f46 09b380dab54946e16303c8bae0e95bbaa0d667a5 -- '.claude/agents/especialistas/jurado-dash-*'; echo "controle (corpos alheios que mudaram) ec=$?"; ls C:/Users/AMP/Documents/GitHub/ERP_Techsolutios/.claude/agents/especialistas/ 2>/dev/null | grep -c -i 'san302'`
```
IDENTICO corpo c1-atomicidade-e-corrida
IDENTICO corpo c2-complementar-e-indice
IDENTICO corpo c3-regressao-e-contrato
corpos jurado-san302 iguais entre os objetos
controle (corpos alheios que mudaram) ec=1
0
```

O S0 executado num worktree descartável no objeto está verde, medido por: `cd C:/Users/AMP/w-san3-02 && git worktree add --detach C:/Users/AMP/w-rsan302c2-s0 09b380dab54946e16303c8bae0e95bbaa0d667a5 >/dev/null 2>&1; node C:/Users/AMP/w-rsan302c2-s0/scripts/sync-agent-agents.mjs --check; echo ec=$?; git worktree remove --force C:/Users/AMP/w-rsan302c2-s0`
```
[agents-sync] OK — 76 agentes, espelho consistente.
ec=0
```

A ferramenta de banco descartável nomeia contêineres e rede por um ID fixo `tl<epoch><pid>`, não aceita prefixo e roda `npm ci` e `prisma migrate deploy` dentro do contêiner sobre uma cópia do worktree sem `node_modules`, medido por: `grep -n -i -o -E 'ID="tl[^"]*"|--exclude=./node_modules|npm ci --no-audit|npx prisma migrate deploy' C:/Users/AMP/erp-pausa-2026-10-03/ferramentas/teste-linux.sh`
```
7:ID="tl$(date +%s)$$"
17:--exclude=./node_modules
17:npm ci --no-audit
17:npx prisma migrate deploy
```

Identidades que planejaram, criticaram, desenvolveram, revisaram, deram parecer de banco, fabricaram corpos, inspecionaram, redigiram mandatos ou votaram neste bloco, GERADAS dos arquivos de registro do diff do bloco (merge-base atual contra o objeto; piso da inelegibilidade, não teto; inclui nomes só PREVISTOS pelo plano do ciclo 2, que não chegaram a agir), medido por: `cd C:/Users/AMP/w-san3-02 && for f in $(git diff --name-only 9009e81be3c5a711584747428c55707a17afc009 09b380dab54946e16303c8bae0e95bbaa0d667a5 -- docs/revisoes/SAN3 agent-orchestration .claude .agents); do git show "09b380dab54946e16303c8bae0e95bbaa0d667a5:$f"; done | grep -o -i -E '\b(planejador|critico|dev|rev|dba|fabrica|inspetor|redator|jurado)-san3-?02[a-z0-9-]*' | sed -E 's#-+$##' | sort -u`
```
critico-san3-02-opus
critico-san3-02-r
critico-san3-02-r1
critico-san3-02-r2
dba-san302-opus
dev-san3-02
dev-san3-02-cdx
dev-san3-02-fix-agyopus
dev-san3-02-fix-cdx
dev-san3-02-opus
dev-san302-c2-opus
dev-san302-ciclo2-agyopus
dev-san302-ciclo2-opus
fabrica-san3-02
fabrica-san3-02-gemini
fabrica-san3-02-opus
inspetor-san302
inspetor-san302-c2-opus
inspetor-san302-opus
jurado-san302
jurado-san302-c
jurado-san302-c1-atomicidade-e-corrida
jurado-san302-c1-dinheiro
jurado-san302-c1-opus
jurado-san302-c1b-opus
jurado-san302-c2-banco-migracao
jurado-san302-c2-complementar-e-indice
jurado-san302-c2-opus
jurado-san302-c2b-opus
jurado-san302-c3-argon
jurado-san302-c3-regressao
jurado-san302-c3-regressao-e-contrato
jurado-san302-c3b-opus
planejador-san3-02
planejador-san3-02-astra
planejador-san3-02-fable
planejador-san302-b4-fable
planejador-san302-ciclo2-fable
redator-san302
redator-san302-opus
rev-san3-02-cdx
rev-san302-c2-agyopus
rev-san302-c2-opus
```

As quatro identidades desta junta e o redator destes mandatos (nomeados pelo orquestrador no disparo do redator) não aparecem em arquivo nenhum do objeto, e nenhuma linha do objeto contém o radical `san302c2`, medido por: `cd C:/Users/AMP/w-san3-02 && git grep -c -i -E 'inspetor-san302c2-opus|jurado-san302c2-c1r-opus|jurado-san302c2-c2-opus|jurado-san302c2-c3-opus|redator-san302c2-opus' 09b380dab54946e16303c8bae0e95bbaa0d667a5 | wc -l; git grep -c -i 'san302c2' 09b380dab54946e16303c8bae0e95bbaa0d667a5 | wc -l`
```
0
0
```

A árvore do objeto `C:/Users/AMP/w-san3-02` está no head, sem nenhum ` M` rastreado (os fantasmas de EOL do ciclo 1 não existem mais) e, como não rastreado, só o diretório deste ciclo de votos, medido por: `git -C C:/Users/AMP/w-san3-02 rev-parse HEAD; git -C C:/Users/AMP/w-san3-02 status --short -uno | wc -l; git -C C:/Users/AMP/w-san3-02 status --short | grep -v -i -E '^\?\? agent-orchestration/omega/juntas/votos/B-SAN3-02-ciclo2/$' | wc -l`
```
09b380dab54946e16303c8bae0e95bbaa0d667a5
0
0
```

No instante da redação (2026-10-20T06:00Z), a memória de commit livre era 7,78 GB, não havia grupo de trabalho Docker alheio vivo (excluídos os `erp-*`) e o disco tinha 13 GB livres, medido por: `powershell.exe -NoProfile -Command '$o=Get-CimInstance Win32_PerfFormattedData_PerfOS_Memory; [math]::Round(($o.CommitLimit-$o.CommittedBytes)/1GB,2)'; docker ps --format '{{.Names}}' | grep -v -i -E '^erp-' | sed -E 's#-(pg|redis|run|net)$##' | sort -u | wc -l; df -h /c | tail -1 | awk '{print $4}'`
```
7,78
0
13G
```

O orçamento de memória da P8 (≥ 4 GB de commit livre para lançar agente, no máximo 3 subagentes Claude ao mesmo tempo, Docker com teto de 2 trabalhos) está no contrato do objeto, medido por: `git -C C:/Users/AMP/w-san3-02 show 09b380dab54946e16303c8bae0e95bbaa0d667a5:CLAUDE.md | tr -d '\r' | grep -n -i -o -E 'memória de commit livre ≥ 4 GB|no máximo \*\*3$|subagentes Claude\*\* ao mesmo tempo|Docker segue com teto de 2 trabalhos'`
```
719:memória de commit livre ≥ 4 GB
719:no máximo **3
720:subagentes Claude** ao mesmo tempo
720:Docker segue com teto de 2 trabalhos
```

O modelo de mandato do §C7.7 do contrato (P1, P2, P4, P3, P7), verbatim no objeto, medido por: `git -C C:/Users/AMP/w-san3-02 show 09b380dab54946e16303c8bae0e95bbaa0d667a5:CLAUDE.md | tr -d '\r' | sed -n '729,736p'`
```
   Após CADA item: apense a <cadeira>-evidencia.md → comando · saída resumida · veredito parcial.  [P1]
   Antes da mensagem final: escreva <cadeira>-voto.json. Mensagem final = 1 linha apontando o arquivo.  [P2]
   Máximo 3 itens; logs longos só no arquivo de evidência.  [P4]
   Se você substituir um caído: re-execute cada comando do <cadeira>-evidencia.md dele e compare, depois
   meça a cauda. Conclusão sem comando registrado NÃO é insumo.  [P3]
   Se receber PAUSA: termine o comando em curso, grave `## PAUSA <hora UTC>` em <cadeira>-evidencia.md
   (head · feito · falta · próximo comando · arquivos meio-escritos) e pare sozinho com 1 linha apontando
   o arquivo. Não inicie item novo.  [P7]
```

## HIPOTESE

Você é `inspetor-san302c2-opus`, identidade nova, executor Claude Code (subagente), modelo Claude Opus, nível menor declarado (o `model: opus` do frontmatter de `inspetor-de-terreno-da-junta`, §C7.6); Opus esgotado: PARE e registre onde parou (§C7.6-bis). O plano do ciclo 2 previa `inspetor-san302-c2-opus` (na lista gerada acima, como nome previsto); o de fato é este, nomeado pelo orquestrador. Declare executor efetivo, modelo, nível, objeto e `mandato_md5` deste arquivo na primeira linha de `insp-san302c2-evidencia.md`. Você não vota nem julga mérito: julga se o tabuleiro está limpo (§C7.1-bis), fail-closed. O plano do ciclo 2 e a auditoria de topo, a ata do ciclo 1, o relatório do dev, os votos e evidências do ciclo 1 e o parecer do DBA são **A RE-VERIFICAR**, nunca prova herdada. Régua da junta que você libera: bloco de DINHEIRO, unanimidade de 3 com veto (§C7 item 8(1)), do CONJUNTO pela `D-JUNTA-SO-CADEIRA-VERMELHA` (§C7 item 9 (4)): C1 revalidada + C2 refeita + C3 refeita, todos referidos ao objeto colado acima; ciclo 2, o último em que achado não grave dentro do bloco reprova (§C7 item 8(2)), derruba com: `head -1 C:/Users/AMP/w-san3-02/agent-orchestration/omega/juntas/votos/B-SAN3-02-ciclo2/insp-san302c2-evidencia.md | grep -i -E 'executor|Opus|mandato_md5|objeto'`

Item 1 de 3 (objeto, CI, mandatos, corpos, S0): resolva o objeto por `git ls-remote origin refs/heads/fix/faturamento-atomico-e-delta` e por `gh pr view 448 --json headRefOid`; confira os 14 check-runs concluídos e verdes no SHA (ausência, `queued` ou `cancelled` bloqueia o start); rode o pré-voo dos quatro mandatos deste diretório até `PRE-VOO OK` com as ferramentas da pasta `C:/Users/AMP/erp-pausa-2026-10-03/redator-san302c2/`; confira no objeto, EOL-neutro e descontado o bloco de adaptação Codex, os três corpos nos dois espelhos, e que o corpo que cada cadeira carregar é o blob do objeto (os corpos não estão no diretório da sessão, medido acima); reexecute o S0 (`sync-agent-agents.mjs --check`) num worktree descartável no objeto. Head que andou depois da redação bloqueia até novo pré-voo, derruba com: `grep -i -E 'Item 1|14/14|check-runs|PRE-VOO|corpos|espelho|S0|LIBERADO|BLOQUEADO' C:/Users/AMP/w-san3-02/agent-orchestration/omega/juntas/votos/B-SAN3-02-ciclo2/insp-san302c2-parecer.md`

Item 2 de 3 (identidades, papéis, briefing e a regra do item 9): regenere por comando seu a lista de inelegíveis (a colada acima é piso) e confira por nome que nenhuma das quatro identidades desta junta coincide com ela, com os votantes, o inspetor, o redator e o DBA do ciclo 1, com `planejador-san302-ciclo2-fable`, `dev-san302-ciclo2-opus` e `dev-san302-ciclo2-agyopus`, nem entre si; o redator destes mandatos é `redator-san302c2-opus` e também é inelegível. Nomeie C1r = `jurado-san302c2-c1r-opus`, C2′ = `jurado-san302c2-c2-opus`, C3′ = `jurado-san302c2-c3-opus`, todos Claude Opus subagente, e declare a MONOCULTURA: os quatro papéis desta junta rodam no mesmo modelo que o dev do ciclo 2 (Claude Opus), porque Codex (fora até 24/10), Antigravity e API do Gemini (sem crédito) estão indisponíveis — fato do orquestrador, que você registra como tal. Confira a separação de papéis do §C7.4-bis por nome: quem achou (`jurado-san302-c2-opus`) ≠ quem auditou e planejou (`planejador-san302-ciclo2-fable`) ≠ quem desenvolveu (`dev-san302-ciclo2-opus`; o `dev-san302-ciclo2-agyopus` caiu antes de tocar o código). Pela regra do item 9 e pelo item 6 do seu corpo: o voto da C1 do ciclo 1 sem `arquivos_medidos` NÃO carrega pela interseção (regra (0), medido acima), e a revalidação por identidade nova é o caminho; confira que o mandato da C1r manda re-executar os comandos de `c1-evidencia.md` sobre o objeto novo, com `arquivos_medidos` declarado, e que C2′ e C3′ são refeitas; a inelegibilidade de "votante do ciclo anterior" do seu item 3.1 alcança só identidades, não a cadeira. Confira a PRESENÇA no briefing: o plano do ciclo 2 (`R-B-SAN3-02-1.md`, §4–§9-bis), a ata do ciclo 1, a seção "Ciclo 2 (20/10)" do relatório do dev, os votos e evidências do ciclo 1 com o `00-quedas.md`, e os quatro logs da C1 fora do repositório; e, em cada mandato de cadeira, as divergências medidas e registradas (C1r: sondas ausentes e carga × revalidação; C2′: FK, drift e `BEGIN`/`COMMIT` no classificador; C3′: o merge com resolução de conflito, o Anexo D e o revisor ausentes, mutações 30 → 33 e a precedência). Coincidência de identidade, papel acumulado ou briefing incompleto bloqueia; a ausência do Anexo D e do revisor do ciclo 2 você classifica (bloqueia o start ou é matéria da C3′) com o motivo, derruba com: `grep -i -E 'Item 2|ineleg|jurado-san302c2-c1r-opus|jurado-san302c2-c2-opus|jurado-san302c2-c3-opus|monocultura|4-bis|arquivos_medidos|revalid|briefing|Anexo D|revisor|divergência' C:/Users/AMP/w-san3-02/agent-orchestration/omega/juntas/votos/B-SAN3-02-ciclo2/insp-san302c2-parecer.md`

Item 3 de 3 (terreno): confira a árvore `C:/Users/AMP/w-san3-02` no objeto e sem mutação viva, admitindo como não rastreado só o diretório deste ciclo de votos (medido acima); exija worktree próprio por cadeira (`C:/Users/AMP/w-jsan302c2-c1r-`, `C:/Users/AMP/w-jsan302c2-c2-`, `C:/Users/AMP/w-jsan302c2-c3-` e o da base `C:/Users/AMP/w-jsan302c2-c3b-`), `npm ci` próprio e zero junction de `node_modules` (§C7.1-ter(c)); banco DESCARTÁVEL por cadeira via `C:/Users/AMP/erp-pausa-2026-10-03/ferramentas/teste-linux.sh`, cujo ID `tl<epoch><pid>` cada cadeira registra como seu, e prefixo `jsan302c2-<cadeira>-` (contêiner, rede) ou `jsan302c2_<cadeira>_` (base) para o que for criado fora dela, sem porta publicada. Antes de cada lançamento e de cada subida: memória de commit livre de pelo menos 4 GB (P8 (c), medido acima), no máximo 2 trabalhos Docker na máquina contando o da cadeira (excluídos os `erp-*`), no máximo 3 subagentes Claude vivos ao mesmo tempo e disco de pelo menos 10 GB (a R6 do ciclo 1); base viva e portas 5432, 6379, 3000, 5173, 5050 e 8899 são proibidas. Declare baseline honesto do terreno, plano de perda de jurado (P3, sucessor de identidade nova; Opus esgotado = PARA, não há degrau abaixo, §C7.6-bis), no máximo dois jurados em paralelo (P5) e a ordem de disparo que respeita o teto de Docker com três cadeiras que sobem banco, derruba com: `grep -i -E 'Item 3|w-jsan302c2-|jsan302c2|tl[0-9]|junction|erp-|commit livre|4 GB|5432|6379|3000|5173|5050|8899|P3|P5|P8|baseline|ordem' C:/Users/AMP/w-san3-02/agent-orchestration/omega/juntas/votos/B-SAN3-02-ciclo2/insp-san302c2-parecer.md`

Protocolo P1/P2/P3/P4/P7 do §C7.7, verbatim no bloco colado acima, com `<cadeira>` = `insp-san302c2` e o parecer no lugar do voto: evidência em `insp-san302c2-evidencia.md` após CADA item; `insp-san302c2-parecer.md` nasce esqueleto com os três itens EM APURAÇÃO e fecha (LIBERADO, LIBERADO COM RESSALVA ou BLOQUEADO) antes da mensagem final de 1 linha; sucessor re-executa os comandos registrados; três itens exatos; PAUSA grava estado e para; queda em `00-quedas.md` deste diretório (P6, pelo orquestrador). Únicos outputs: `insp-san302c2-evidencia.md` e `insp-san302c2-parecer.md` em `C:/Users/AMP/w-san3-02/agent-orchestration/omega/juntas/votos/B-SAN3-02-ciclo2/`; nunca commit, derruba com: `test -f C:/Users/AMP/w-san3-02/agent-orchestration/omega/juntas/votos/B-SAN3-02-ciclo2/insp-san302c2-parecer.md`

## MEDIDO

Pré-voo deste mandato com as ferramentas copiadas, sem mudança, para a pasta própria do redator `C:/Users/AMP/erp-pausa-2026-10-03/redator-san302c2/` (o `RAIZ=C:/Users/AMP/w-san3-02` da linha 211 do `mandato-preflight.sh` vem da cópia do ciclo 1), executado com o cwd no worktree do objeto; o redator é `redator-san302c2-opus` (Claude Opus, nível menor declarado); o `sed` troca, nos AVISOs, o número da migração pelo marcador `<corrida>` e o caminho dela pelo marcador `<migracao>`, e apaga a linha de AVISO do ec 3 da ferramenta (o texto dela traz o token reservado da checagem 7, que fora da colagem seria recusado; o ec 3 está declarado na primeira unidade), medido por: `cd C:/Users/AMP/w-san3-02 && MANDATO_REFS=C:/Users/AMP/erp-pausa-2026-10-03/redator-san302c2/mandato-refs.sh bash C:/Users/AMP/erp-pausa-2026-10-03/redator-san302c2/mandato-preflight.sh C:/Users/AMP/w-san3-02/agent-orchestration/omega/juntas/votos/B-SAN3-02-ciclo2/00-mandatos/inspetor-san302c2.md 448 2>&1 | sed -E -e "s#prisma/migrations/2026[0-9]+_[a-z_]+/migration[.]sql#<migracao>#g" -e "s#'2026[0-9]+'#'<corrida>'#g" -e '/NAO DETERMINAVEL/d'; echo ec=${PIPESTATUS[0]}`
```
COLAGEM    l.6-21: refs do PR #448 confere com a saida atual
AVISO      corrida hex em caminho versionado nao cobrada pela checagem 4: '<corrida>' em <migracao> — l.104
AVISO      corrida hex em caminho versionado nao cobrada pela checagem 4: '<corrida>' em <migracao> — l.43

PRE-VOO OK — C:/Users/AMP/w-san3-02/agent-orchestration/omega/juntas/votos/B-SAN3-02-ciclo2/00-mandatos/inspetor-san302c2.md
ec=0
```
