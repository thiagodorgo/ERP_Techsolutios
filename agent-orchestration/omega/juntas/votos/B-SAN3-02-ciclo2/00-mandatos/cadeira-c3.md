# Mandato — Cadeira C3′ (refeita) — B-SAN3-02 ciclo 2 (junta de DINHEIRO)

## MEDIDO

Estado do PR 448 no instante da redação, pela ferramenta `mandato-refs.sh` copiada sem mudança da pasta do redator do ciclo 1 para a pasta própria deste redator `C:/Users/AMP/erp-pausa-2026-10-03/redator-san302c2/`, com o cwd no worktree do objeto; a ferramenta sai com ec 3 porque a ata do ciclo 1 nomeia o PR sem declarar aprovação, medido por: `cd C:/Users/AMP/w-san3-02 && bash C:/Users/AMP/erp-pausa-2026-10-03/redator-san302c2/mandato-refs.sh 448`
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

Os 14 check-runs do objeto estão concluídos e todos `success` (zero fora de `completed success`), em sete jobs com os dois gatilhos, medido por: `gh api repos/thiagodorgo/ERP_Techsolutios/commits/09b380dab54946e16303c8bae0e95bbaa0d667a5/check-runs --jq '.total_count, ([.check_runs[] | select(.status != "completed" or .conclusion != "success")] | length), ([.check_runs[] | .name] | sort | join(", "))'`
```
14
0
authority-portal, authority-portal, backend, backend, backend-postgres, backend-postgres, docker, docker, flutter, flutter, frontend, frontend, owner-portal, owner-portal
```

A C3 do ciclo 1 (`jurado-san302-c3-argon`) NÃO votou: caiu antes de medir, pelo teto mensal da API do Gemini, e não deixou evidência — logo nada dela se herda e esta cadeira é refeita inteira, medido por: `git -C C:/Users/AMP/w-san3-02 show 09b380dab54946e16303c8bae0e95bbaa0d667a5:agent-orchestration/omega/juntas/votos/B-SAN3-02/00-quedas.md | tr -d '\r' | grep -i -o -E 'jurado-san302-c3-argon|antes de medir|teto mensal de gasto'; git -C C:/Users/AMP/w-san3-02 ls-tree --name-only 09b380dab54946e16303c8bae0e95bbaa0d667a5 agent-orchestration/omega/juntas/votos/B-SAN3-02/ | grep -c -i 'c3-'`
```
jurado-san302-c3-argon
antes de medir
teto mensal de gasto
0
```

O diff do BLOCO contra a merge-base atual tem 51 caminhos; fora do registro são 28, e são os MESMOS 28 caminhos do diff do bloco no ciclo 1 (contra a merge-base de então); o `ci.yml` segue só com as duas linhas `SUITES` das suítes novas, o `RBAC_MATRIX.md` com 1 linha por 1, e nem a migração `prisma/migrations/20260811000000_add_invoicing/migration.sql` nem `Kpis` aparecem, medido por: `cd C:/Users/AMP/w-san3-02 && git diff --name-status 9009e81be3c5a711584747428c55707a17afc009 09b380dab54946e16303c8bae0e95bbaa0d667a5 | wc -l; diff <(git diff --name-only "$(git merge-base 8e6a6c29b8a0aced5bf3968383aa9ef247019f46 9009e81be3c5a711584747428c55707a17afc009)" 8e6a6c29b8a0aced5bf3968383aa9ef247019f46 | grep -v -i -E '^(agent-orchestration|docs/revisoes)/') <(git diff --name-only 9009e81be3c5a711584747428c55707a17afc009 09b380dab54946e16303c8bae0e95bbaa0d667a5 | grep -v -i -E '^(agent-orchestration|docs/revisoes)/') && echo "mesmos caminhos fora do registro nos dois ciclos"; git diff --name-only 9009e81be3c5a711584747428c55707a17afc009 09b380dab54946e16303c8bae0e95bbaa0d667a5 | grep -v -i -E '^(agent-orchestration|docs/revisoes)/' | wc -l; git diff 9009e81be3c5a711584747428c55707a17afc009 09b380dab54946e16303c8bae0e95bbaa0d667a5 -- .github/workflows/ci.yml | tr -d '\r' | grep -i -E '^[+-][^+-]'; git diff --numstat 9009e81be3c5a711584747428c55707a17afc009 09b380dab54946e16303c8bae0e95bbaa0d667a5 -- RBAC_MATRIX.md prisma/migrations/20260811000000_add_invoicing/migration.sql Kpis`
```
51
mesmos caminhos fora do registro nos dois ciclos
28
+          SUITES="$SUITES tests/work-order-invoicing-atomic-db.test.ts"
+          SUITES="$SUITES tests/work-order-invoicing-migration-drill-db.test.ts"
1	1	RBAC_MATRIX.md
```

A base desta cadeira é a merge-base atual: entre ela e a merge-base do ciclo 1 o código do faturamento, as suítes dele, os ajudantes de teste, o `prisma/` e o `ci.yml` não mudaram (o que a `main` trouxe nesse intervalo é outra matéria), medido por: `cd C:/Users/AMP/w-san3-02 && git diff --name-only "$(git merge-base 8e6a6c29b8a0aced5bf3968383aa9ef247019f46 9009e81be3c5a711584747428c55707a17afc009)" 9009e81be3c5a711584747428c55707a17afc009 -- src/modules/work-order-financials src/modules/financial-titles src/modules/financial-uow src/database tests/work-order-invoicing.test.ts tests/work-order-financials.test.ts tests/helpers prisma .github/workflows/ci.yml | wc -l`
```
0
```

Do objeto do ciclo 1 ao objeto do ciclo 2 há três commits de primeiro pai (o conserto, o registro e um merge da `origin/main`); o diff cru entre os objetos tem 138 caminhos, mas o do primeiro pai do merge (o incremento próprio do ciclo 2) tem 16, dois de código, medido por: `cd C:/Users/AMP/w-san3-02 && git rev-list --first-parent --count 8e6a6c29b8a0aced5bf3968383aa9ef247019f46..09b380dab54946e16303c8bae0e95bbaa0d667a5; git diff --name-only 8e6a6c29b8a0aced5bf3968383aa9ef247019f46 09b380dab54946e16303c8bae0e95bbaa0d667a5 | wc -l; git diff --name-only 8e6a6c29b8a0aced5bf3968383aa9ef247019f46 "$(git rev-parse 09b380dab54946e16303c8bae0e95bbaa0d667a5^1)"`
```
3
138
agent-orchestration/omega/juntas/J-B-SAN3-02-ciclo1.md
agent-orchestration/omega/juntas/votos/B-SAN3-02/00-mandatos/cadeira-c1.md
agent-orchestration/omega/juntas/votos/B-SAN3-02/00-mandatos/cadeira-c2.md
agent-orchestration/omega/juntas/votos/B-SAN3-02/00-mandatos/cadeira-c3.md
agent-orchestration/omega/juntas/votos/B-SAN3-02/00-mandatos/inspetor-san302.md
agent-orchestration/omega/juntas/votos/B-SAN3-02/00-quedas.md
agent-orchestration/omega/juntas/votos/B-SAN3-02/c1-evidencia.md
agent-orchestration/omega/juntas/votos/B-SAN3-02/c1-voto.json
agent-orchestration/omega/juntas/votos/B-SAN3-02/c2-evidencia.md
agent-orchestration/omega/juntas/votos/B-SAN3-02/c2-voto.json
agent-orchestration/omega/juntas/votos/B-SAN3-02/insp-san302-evidencia.md
agent-orchestration/omega/juntas/votos/B-SAN3-02/insp-san302-parecer.md
agent-orchestration/omega/reprovacoes/R-B-SAN3-02-1.md
docs/revisoes/SAN3/B-SAN3-02-dev.md
prisma/migrations/20260878000000_invoice_complementary_title/migration.sql
tests/work-order-invoicing-migration-drill-db.test.ts
```

O merge da `origin/main` dentro do ramo NÃO é sem conteúdo próprio: a árvore do objeto difere do merge automático exatamente nos três arquivos de registro em que houve conflito; a resolução não removeu linha de `decisoes.md` nem de `pendencias.md` contra nenhum dos dois pais, e o índice GERADO `pendencias-indice.md` perdeu linhas contra os dois pais, medido por: `cd C:/Users/AMP/w-san3-02 && P1=$(git rev-parse 09b380dab54946e16303c8bae0e95bbaa0d667a5^1); git merge-tree --write-tree --name-only "$P1" 9009e81be3c5a711584747428c55707a17afc009 | sed -n '2,4p'; T=$(git merge-tree --write-tree "$P1" 9009e81be3c5a711584747428c55707a17afc009 | head -1); git diff --name-only "$T" "09b380dab54946e16303c8bae0e95bbaa0d667a5^{tree}"; for f in agent-orchestration/controle/decisoes.md agent-orchestration/controle/pendencias.md agent-orchestration/controle/pendencias-indice.md; do echo "$f removidas_vs_ramo=$(git diff --numstat "$P1" 09b380dab54946e16303c8bae0e95bbaa0d667a5 -- $f | cut -f2) removidas_vs_main=$(git diff --numstat 9009e81be3c5a711584747428c55707a17afc009 09b380dab54946e16303c8bae0e95bbaa0d667a5 -- $f | cut -f2)"; done`
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

O `pendencias-indice.md` declara ser gerado por um script do repositório, e o script existe no objeto, medido por: `cd C:/Users/AMP/w-san3-02 && git show 09b380dab54946e16303c8bae0e95bbaa0d667a5:agent-orchestration/controle/pendencias-indice.md | tr -d '\r' | sed -n '1,3p'; git cat-file -e 09b380dab54946e16303c8bae0e95bbaa0d667a5:agent-orchestration/controle/gerar-indice-pendencias.py && echo "PRESENTE agent-orchestration/controle/gerar-indice-pendencias.py"`
```
# Indice de pendencias — GERADO, nao digitado

> Produzido por `agent-orchestration/controle/gerar-indice-pendencias.py`.
PRESENTE agent-orchestration/controle/gerar-indice-pendencias.py
```

O PERMITIDO e o PROIBIDO deste bloco estão em dois lugares do objeto: §6.1 e §6.2 do plano v2 (`B-SAN3-02-plano.md`) e §7.1 e §7.2 do plano do ciclo 2 (`R-B-SAN3-02-1.md`); o §7.1 manda apensar o `# ANEXO D` ao plano e o §9 prevê um revisor independente antes da junta — e nenhum dos dois está no objeto (o plano não tem Anexo D; o único arquivo que nomeia o revisor é o próprio plano do ciclo 2; nenhum relatório de revisão do ciclo 2 na pasta de revisões fora do repositório), medido por: `cd C:/Users/AMP/w-san3-02 && git show 09b380dab54946e16303c8bae0e95bbaa0d667a5:docs/revisoes/SAN3/B-SAN3-02-plano.md | tr -d '\r' | grep -n -i -E '^### 6\.[12] '; git show 09b380dab54946e16303c8bae0e95bbaa0d667a5:agent-orchestration/omega/reprovacoes/R-B-SAN3-02-1.md | tr -d '\r' | grep -n -i -E '^### 7\.[12] ' | cut -c1-60; git show 09b380dab54946e16303c8bae0e95bbaa0d667a5:agent-orchestration/omega/reprovacoes/R-B-SAN3-02-1.md | tr -d '\r' | grep -n -i -o -E 'APPEND\*\* `# ANEXO D|\*\*revisor independente\*\* \(antes da junta\)'; git show 09b380dab54946e16303c8bae0e95bbaa0d667a5:docs/revisoes/SAN3/B-SAN3-02-plano.md | tr -d '\r' | grep -c -i '^# ANEXO D'; git grep -l -i -E 'rev-san302-c2-(agyopus|opus)' 09b380dab54946e16303c8bae0e95bbaa0d667a5 | cut -d: -f2; ls C:/Users/AMP/erp-pausa-2026-10-03/revisoes/ | grep -c -i -E 'san3-02-.*(ciclo2|c2)'`
```
305:### 6.1 PERMITIDO
327:### 6.2 PROIBIDO (nominal — fora disto, o §C4 vale por inteiro)
181:### 7.1 PERMITIDO (caminhos exatos; nada mais)
192:### 7.2 PROIBIDO (nominal; fora disto vale o §C4 e o §
188:APPEND** `# ANEXO D
234:**revisor independente** (antes da junta)
0
agent-orchestration/omega/reprovacoes/R-B-SAN3-02-1.md
0
```

As mutações do bloco têm três contagens no objeto: 30 no Anexo B do plano v2, "24 → 27" no plano do ciclo 2 e 33/33 vermelhas no relatório do dev (30 do ciclo 1 + 3 do ciclo 2, que ele aponta como erro de aritmética do plano); o corpo desta cadeira ainda cobra 18 (M1…M16), cobra uma pendência de precedência que não existe no objeto e nomeia o executor como Claude Opus ou Codex (desta vez o executor é Claude Opus, coerente com a linha 35), medido por: `cd C:/Users/AMP/w-san3-02 && git show 09b380dab54946e16303c8bae0e95bbaa0d667a5:docs/revisoes/SAN3/B-SAN3-02-plano.md | tr -d '\r' | grep -n -i -o -E '\| \*\*30\*\* = 28 \+ \*\*M27b\*\* \+ \*\*M28\*\*|A precedência fica \*\*idêntica\*\* à de hoje'; git show 09b380dab54946e16303c8bae0e95bbaa0d667a5:agent-orchestration/omega/reprovacoes/R-B-SAN3-02-1.md | tr -d '\r' | grep -n -i -o -E 'as mutações sobem de 24 → \*\*27\*\*'; git show 09b380dab54946e16303c8bae0e95bbaa0d667a5:docs/revisoes/SAN3/B-SAN3-02-dev.md | tr -d '\r' | grep -n -i -o -E '\*\*33/33 vermelhas\*\*|30 \(ciclo 1\) \+ 3'; git show 09b380dab54946e16303c8bae0e95bbaa0d667a5:.claude/agents/especialistas/jurado-san302-c3-regressao-e-contrato.md | tr -d '\r' | grep -n -i -o -E 'as 18 mutações do §7.5 \(M1…M16\)|P-SAN3-02-PRECEDENCIA-PERIOD-CLOSED|Claude Opus, ou Codex .gpt-5.6-sol.'; git show 09b380dab54946e16303c8bae0e95bbaa0d667a5:agent-orchestration/controle/pendencias.md | tr -d '\r' | grep -c -i 'P-SAN3-02-PRECEDENCIA'`
```
21:A precedência fica **idêntica** à de hoje
734:| **30** = 28 + **M27b** + **M28**
142:as mutações sobem de 24 → **27**
238:30 (ciclo 1) + 3
238:**33/33 vermelhas**
35:Claude Opus, ou Codex `gpt-5.6-sol`
110:as 18 mutações do §7.5 (M1…M16)
148:P-SAN3-02-PRECEDENCIA-PERIOD-CLOSED
0
```

A suíte inteira que o dev rodou no contêiner, na forma do job `backend`, deu 9 falhas, que ele atribui ao contêiner sem o binário `docker`; o arquivo dessas falhas nasceu antes do bloco (pela `main`) e não está no diff do bloco, medido por: `cd C:/Users/AMP/w-san3-02 && grep -i -o -E '\[run-backend-tests\] [0-9]+ arquivo\(s\) · [0-9]+ teste\(s\) · pass [0-9]+ · fail [0-9]+ · skipped [0-9]+' C:/Users/AMP/erp-pausa-2026-10-03/dev302c2/06-npm-test.log; git log --diff-filter=A --format='%ad %s' --date=short 09b380dab54946e16303c8bae0e95bbaa0d667a5 -- tests/traccar-dev-topology.test.ts | cut -d'(' -f1; git diff --name-only 9009e81be3c5a711584747428c55707a17afc009 09b380dab54946e16303c8bae0e95bbaa0d667a5 -- tests/traccar-dev-topology.test.ts | wc -l`
```
[run-backend-tests] 324 arquivo(s) · 3751 teste(s) · pass 3740 · fail 9 · skipped 2
2026-10-18 feat
0
```

O corpo desta cadeira existe no objeto, não mudou desde o objeto do ciclo 1 e, descontados o frontmatter e o bloco de adaptação Codex do espelho, é IDÊNTICO entre `.claude/agents/especialistas/` e `.agents/agents/especialistas/` (comparação EOL-neutra); o S0 num worktree descartável no objeto está verde, medido por: `cd C:/Users/AMP/w-san3-02 && diff <(git show "09b380dab54946e16303c8bae0e95bbaa0d667a5:.claude/agents/especialistas/jurado-san302-c3-regressao-e-contrato.md" | tr -d '\r' | awk 'f; $0=="---"{n++; if(n==2) f=1}' | sed '/^$/d') <(git show "09b380dab54946e16303c8bae0e95bbaa0d667a5:.agents/agents/especialistas/jurado-san302-c3-regressao-e-contrato.md" | tr -d '\r' | awk 'f; $0=="---"{n++; if(n==2) f=1}' | awk 'index($0,"Papel para o Codex"){s=1} s&&$0==""{s=0; next} !s' | sed '/^$/d') >/dev/null && echo "IDENTICO corpo c3"; git diff --quiet 8e6a6c29b8a0aced5bf3968383aa9ef247019f46 09b380dab54946e16303c8bae0e95bbaa0d667a5 -- '.claude/agents/especialistas/jurado-san302-*' '.agents/agents/especialistas/jurado-san302-*' && echo "corpos jurado-san302 iguais entre os objetos"; git worktree add --detach C:/Users/AMP/w-rsan302c2-s0 09b380dab54946e16303c8bae0e95bbaa0d667a5 >/dev/null 2>&1; node C:/Users/AMP/w-rsan302c2-s0/scripts/sync-agent-agents.mjs --check; echo ec=$?; git worktree remove --force C:/Users/AMP/w-rsan302c2-s0`
```
IDENTICO corpo c3
corpos jurado-san302 iguais entre os objetos
[agents-sync] OK — 76 agentes, espelho consistente.
ec=0
```

A ferramenta de banco descartável nomeia contêineres e rede por um ID fixo `tl<epoch><pid>`, não aceita prefixo, roda `npm ci` e `prisma migrate deploy` dentro do contêiner sobre uma cópia do worktree sem `node_modules` e, sem comando, roda `npm test` na forma do job `backend`, medido por: `grep -n -i -o -E 'ID="tl[^"]*"|--exclude=./node_modules|npm ci --no-audit|npx prisma migrate deploy|CMD="\$\{2:-[^}]*\}' C:/Users/AMP/erp-pausa-2026-10-03/ferramentas/teste-linux.sh`
```
7:CMD="${2:-npm test}
7:ID="tl$(date +%s)$$"
17:--exclude=./node_modules
17:npm ci --no-audit
17:npx prisma migrate deploy
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

Você é `jurado-san302c2-c3-opus`, identidade nova, executor Claude Code (subagente), modelo Claude Opus, nível menor declarado (§C7.6); a cadeira é REFEITA pela regra (3) do §C7 item 9, e INTEIRA, porque a C3 do ciclo 1 caiu sem medir (medido acima); o seu corpo canônico é `.claude/agents/especialistas/jurado-san302-c3-regressao-e-contrato.md` (o plano do ciclo 2 previa a identidade `jurado-san302-c3b-opus`; a de fato é esta, nomeada pelo orquestrador). Na primeira linha de `c3-evidencia.md`, declare executor efetivo, modelo, nível, objeto, `mandato_md5` deste arquivo e o veredito IDENTICO/DIVERGE do corpo que você carregou contra o blob do objeto, EOL-neutro (nunca `md5sum` cru sob `core.autocrlf=true`). Opus esgotado: PARE sem votar e registre onde parou (§C7.6-bis). Se o seu nome coincidir com algum inelegível do mandato do inspetor, pare. O plano v2 com os anexos, o plano do ciclo 2 (`R-B-SAN3-02-1.md`), a ata do ciclo 1, o relatório do dev (inclusive a contagem 3751/9) e o parecer do DBA são **A RE-VERIFICAR**, nunca fato herdado; não herde contagem de ninguém, derruba com: `head -1 C:/Users/AMP/w-san3-02/agent-orchestration/omega/juntas/votos/B-SAN3-02-ciclo2/c3-evidencia.md | grep -i -E 'executor|modelo|mandato_md5|IDENTICO|DIVERGE'`

A legalidade vem antes do mérito: parecer `insp-san302c2-parecer.md` do inspetor `inspetor-san302c2-opus` com LIBERADO ou LIBERADO COM RESSALVA nomeando você, seu executor, seus dois worktrees e seu terreno de banco; o objeto continua sendo o head do PR 448 colado acima, com 14 de 14 check-runs concluídos, e você resolve o objeto de novo no fim e declara se andou. Régua: bloco de DINHEIRO, unanimidade de 3 com veto do CONJUNTO (§C7 item 9 (4), §C7 item 8(1)); ciclo 2, o ÚLTIMO em que todo `bloqueia` com escopo `dentro-do-bloco` reprova, grave ou não (§C7 item 8(2)). Todo achado declara gravidade, classe, escopo, N e forma; `pre-existente` exige evidência de origem ou data e pendência com dono (§C7.1-ter(a)) e não reprova; escopo sem evidência conta como `dentro-do-bloco`; "não consigo medir" item seu é REPROVADO; não proponha correção (§C7.4-bis); não cobre KPI nem `Kpis/*` (congelado, `D-GOV-PROPORCIONAL` (5)), nem a ata antes do voto, nem tela (`SAN3-25`), nem matéria de C1r ou C2′; não leia o que a `main` trouxe como diff do bloco; não leia votos desta junta do ciclo 2; o voto declara `arquivos_medidos` (§C7 item 9 (0); a suíte inteira obriga `**`), derruba com: `grep -i -E 'legalidade|A RE-VERIFICAR|gravidade|classe|escopo|arquivos_medidos' C:/Users/AMP/w-san3-02/agent-orchestration/omega/juntas/votos/B-SAN3-02-ciclo2/c3-voto.json`

Terreno: dois worktrees exclusivos, `C:/Users/AMP/w-jsan302c2-c3-<sufixo>` no objeto e `C:/Users/AMP/w-jsan302c2-c3b-<sufixo>` na merge-base colada acima, cada um com `npm ci` próprio e zero junction de `node_modules` (§C7.1-ter(c)), removidos só por `git worktree remove --force` depois de conferir que nenhum processo os usa. Memória por padrão; para a suíte inteira e os `-db`, Postgres 16 DESCARTÁVEL por `bash C:/Users/AMP/erp-pausa-2026-10-03/ferramentas/teste-linux.sh <seu-worktree> '<comando>'` (sem comando, ela roda `npm test` na forma do job `backend`); a ferramenta nomeia os seus contêineres e rede `tl<epoch><pid>` (medido acima), e você registra esse ID na evidência como seu; todo contêiner, rede ou base que você criar fora da ferramenta leva o prefixo `jsan302c2-c3-` (base `jsan302c2_c3_<caso>`). Antes de cada subida, meça a memória de commit livre (no mínimo 4 GB, P8 (c)), conte os trabalhos Docker alheios excluindo `erp-*` (no máximo 2 na máquina contando o seu; base e objeto em sequência, nunca juntos) e o disco (no mínimo 10 GB); faltando qualquer um, espere. Nunca a base viva (`erp-postgres`, `erp-redis`) nem as portas 5432, 6379, 3000, 5173, 5050 e 8899; nunca `prune` nem contêiner alheio. Conteúdo se compara por `git show` ou `git hash-object`, nunca por `git archive` com `tar` sob `core.autocrlf=true`; geradores (o do índice de pendências inclusive) rodam numa CÓPIA descartável, nunca no worktree do objeto; mutação só no seu worktree, uma por vez, restauro provado por `git hash-object <arquivo>` igual a `git rev-parse <objeto>:<arquivo>`; teardown só do que é seu, derruba com: `grep -i -E 'w-jsan302c2-c3-|w-jsan302c2-c3b-|jsan302c2|tl[0-9]|junction|erp-|commit livre|4 GB|5432|6379|3000|5173|5050|8899|hash-object|teardown' C:/Users/AMP/w-san3-02/agent-orchestration/omega/juntas/votos/B-SAN3-02-ciclo2/c3-evidencia.md`

Item 1 de 3 (regressão por nome, suíte inteira e CI; item 1 do corpo): prove por execução que todo NOME de teste da base em `tests/work-order-invoicing.test.ts` e `tests/work-order-financials.test.ts` (N medido por parser do TAP na base; o plano espera 16 e 31) existe e passa no objeto, e o mesmo para as regressões do financeiro do plano §7.6 passo 4, em memória e `-db`, com toda asserção enfraquecida comparada hunk a hunk; `npm run check`, `npm run lint`, `npm run build` e `npm test` na forma do job `backend` do `.github/workflows/ci.yml` do objeto, com fail 0 e skipped até 2 nomeados — e, se reaparecerem as 9 falhas de `tests/traccar-dev-topology.test.ts` (medidas acima no log do dev), só as classifique como `pre-existente` de ambiente com a origem colada acima E a mesma suíte verde fora do contêiner ou no log do job `backend` da CI do objeto; `tests/work-order-invoicing-atomic-db.test.ts` e `tests/work-order-invoicing-migration-drill-db.test.ts` (agora com o T-D(f)) 3 vezes seguidas cada, mesmo `# tests`, 0 skip, 0 fail; e, nos logs do job `backend-postgres` do objeto, as duas suítes executadas com casos (por nome no TAP, o T-D(f) entre eles) e o guard de zero skip verde, comparando com os check-runs da merge-base. Vermelho-controle: o parser conta um `not ok` e um `# SKIP` a mais num TAP copiado; o comparador de nomes acusa uma remoção e um renome sem par fabricados; as duas suítes `-db` contra o `src/` da base (cópia, hashes provados) ficam vermelhas em pelo menos um caso que o plano diz que prendem, derruba com: `grep -i -E 'Item 1|por nome|16|31|npm test|skipped|traccar-dev-topology|atomic-db|migration-drill-db|T-D\(f\)|backend-postgres|check-runs|parser|vermelho|hash-object' C:/Users/AMP/w-san3-02/agent-orchestration/omega/juntas/votos/B-SAN3-02-ciclo2/c3-evidencia.md`

Item 2 de 3 (escopo, registro, espelho e mutações; item 2 do corpo, nas três camadas medidas acima): prove por execução (a) a tabela arquivo, permitido ou registro ou fora, efeito, de `git diff --name-status` da merge-base atual contra o objeto (51 caminhos), classificada contra o PERMITIDO EXTRAÍDO por você do §6.1 do plano v2 e do §7.1 do plano do ciclo 2 (não copiado daqui), com o PROIBIDO do §6.2, do §7.2 e do §C4 vazio; (b) o incremento próprio do ciclo 2 (objeto do ciclo 1 contra o primeiro pai do merge, 16 caminhos) contido no §7.1: só a migração (as seis DDL do up e as seis do down byte-iguais, `BEGIN;` e `COMMIT;` como 1ª e última sentença, cabeçalho do down na mesma linha `-- down`) e o drill como código, registro em APPEND, e a classificação, com motivo, da ata em `agent-orchestration/omega/juntas/`, do `R-B-SAN3-02-1.md` em `agent-orchestration/omega/reprovacoes/`, da ausência do `# ANEXO D` no plano e da ausência de artefato do revisor independente do ciclo 2 (todos medidos acima); (c) o merge da `origin/main`: conteúdo próprio só na resolução dos três arquivos de registro em conflito, `decisoes.md` e `pendencias.md` sem linha removida contra os dois pais, e o `pendencias-indice.md` do objeto IGUAL ao que `agent-orchestration/controle/gerar-indice-pendencias.py` gera, numa cópia descartável, a partir do `pendencias.md` do objeto (as linhas perdidas são contadores ou lixo de conflito?); mais `node scripts/sync-agent-agents.mjs --check` verde com N; e as mutações do relatório do dev contra as três contagens medidas acima (30, "24 → 27", 33; o corpo cobra 18, divergência medida), cada uma com comando registrado, reexecutando por conta própria uma amostra de 2 que você escolhe e declara, sendo uma delas do ciclo 2 (M29, M29b ou M29c). Vermelho-controle: o classificador acusa uma lista fabricada com `src/database/rls.ts`, `Kpis/kpis-latest.json`, uma 2ª migração e uma linha removida de `agent-orchestration/controle/pendencias.md`; cada `git diff --quiet` com ec 0 usado como prova tem o irmão com ec 1 num caminho sabidamente alterado; o comparador do índice acusa uma linha fabricada a menos; o check de espelho acusa uma cópia deliberadamente diferente numa árvore descartável, derruba com: `grep -i -E 'Item 2|PERMITIDO|PROIBIDO|51|16|incremento|merge|conflito|pendencias-indice|gerar-indice-pendencias|ANEXO D|revisor|APPEND|sync-agent-agents|30|33|amostra|vermelho' C:/Users/AMP/w-san3-02/agent-orchestration/omega/juntas/votos/B-SAN3-02-ciclo2/c3-evidencia.md`

Item 3 de 3 (o contrato não muda para quem já usa; item 3 do corpo, com a precedência do plano v2): prove por execução, com uma sonda PRÓPRIA de rota pelo app real em memória rodada na base E no objeto, a tabela caso, código, `reason` e conjunto de chaves do corpo, para 1º faturamento, replay sem delta (409 `already_invoiced`), OS sem itens e título removido com itens carimbados (422 `nothing_to_invoice`), competência fechada com itens (422 `period_closed`), OS de outra organização (404 `work_order_not_found`, nada vaza), OS cancelada (422 `work_order_cancelled`), `due_date` inválida (400 `invalid_due_date`), item depois do 1º faturamento (201 complementar no objeto, 409 na base: a mudança autorizada pela Q1), `PATCH` e `DELETE` de item carimbado (422 `item_invoiced`), `GET /financial-titles` (DTO só ganha `parentTitleId`) e `POST /financial-titles` com `parent_title_id` (ignorado); a precedência IDÊNTICA à da base nos dois casos do plano (T-PREC2: replay em mês fechado dá 409 nos dois lados; T-PREC3: OS vazia em mês fechado dá 422 `nothing_to_invoice` nos dois lados) — a mudança admitida pela linha 148 do corpo não existe no plano nem nas pendências (medido acima) e não serve de exceção; códigos novos só onde o plano os declara (409 `invoice_items_changed`, 503 `invoice_transient_conflict`, 400 `invalid_parent_title_reference`); e a auditoria `work_order.invoiced` com as chaves da base mais, no máximo, `complementary`, sem `amount`, `party_name`, `tenant_id`, token, path nem id de outra organização. Vermelho-controle: a sonda distingue a base do objeto no caso do item depois do 1º faturamento; o comparador de chaves acusa um corpo fabricado sem `invoicedItemCount` e com `tenant_id` a mais; M13 e M14, uma por vez, acusadas pela sonda, com restauro por hash, derruba com: `grep -i -E 'Item 3|already_invoiced|nothing_to_invoice|period_closed|work_order_not_found|item_invoiced|parentTitleId|T-PREC2|T-PREC3|precedência|invoice_transient_conflict|complementary|M13|M14|vermelho' C:/Users/AMP/w-san3-02/agent-orchestration/omega/juntas/votos/B-SAN3-02-ciclo2/c3-evidencia.md`

Protocolo P1/P2/P3/P4/P7 do §C7.7, verbatim no bloco colado acima, com `<cadeira>` = `c3`: evidência em `c3-evidencia.md` após CADA item; `c3-voto.json` nasce esqueleto com os três itens EM APURAÇÃO e o campo `arquivos_medidos`, cada item gravado ao ser medido, e fecha antes da mensagem final de 1 linha; sucessor de identidade nova re-executa os comandos registrados e só então mede a cauda; três itens exatos; PAUSA grava head, feito, falta, próximo comando e arquivos meio-escritos e para. Queda vai a `00-quedas.md` deste diretório (P6, pelo orquestrador); no máximo 2 jurados em paralelo (P5). Guarde fora do worktree, numa pasta sua em `C:/Users/AMP/erp-pausa-2026-10-03/`, as sondas e os scripts que a sua evidência cita, para que ela seja re-executável. Únicos outputs no repositório: `c3-evidencia.md` e `c3-voto.json` em `C:/Users/AMP/w-san3-02/agent-orchestration/omega/juntas/votos/B-SAN3-02-ciclo2/`; nunca commit, derruba com: `test -f C:/Users/AMP/w-san3-02/agent-orchestration/omega/juntas/votos/B-SAN3-02-ciclo2/c3-voto.json`

## MEDIDO

Pré-voo deste mandato com as ferramentas copiadas, sem mudança, para a pasta própria do redator `C:/Users/AMP/erp-pausa-2026-10-03/redator-san302c2/` (o `RAIZ=C:/Users/AMP/w-san3-02` da linha 211 do `mandato-preflight.sh` vem da cópia do ciclo 1), executado com o cwd no worktree do objeto; o redator é `redator-san302c2-opus` (Claude Opus, nível menor declarado); o `sed` troca, nos AVISOs, o número da migração pelo marcador `<corrida>` e o caminho dela pelo marcador `<migracao>`, e apaga a linha de AVISO do ec 3 da ferramenta (o texto dela traz o token reservado da checagem 7, que fora da colagem seria recusado; o ec 3 está declarado na primeira unidade), medido por: `cd C:/Users/AMP/w-san3-02 && MANDATO_REFS=C:/Users/AMP/erp-pausa-2026-10-03/redator-san302c2/mandato-refs.sh bash C:/Users/AMP/erp-pausa-2026-10-03/redator-san302c2/mandato-preflight.sh C:/Users/AMP/w-san3-02/agent-orchestration/omega/juntas/votos/B-SAN3-02-ciclo2/00-mandatos/cadeira-c3.md 448 2>&1 | sed -E -e "s#prisma/migrations/2026[0-9]+_[a-z_]+/migration[.]sql#<migracao>#g" -e "s#'2026[0-9]+'#'<corrida>'#g" -e '/NAO DETERMINAVEL/d'; echo ec=${PIPESTATUS[0]}`
```
COLAGEM    l.6-21: refs do PR #448 confere com a saida atual
AVISO      corrida hex em caminho versionado nao cobrada pela checagem 4: '<corrida>' em <migracao> — l.43
AVISO      corrida hex em caminho versionado nao cobrada pela checagem 4: '<corrida>' em <migracao> — l.76

PRE-VOO OK — C:/Users/AMP/w-san3-02/agent-orchestration/omega/juntas/votos/B-SAN3-02-ciclo2/00-mandatos/cadeira-c3.md
ec=0
```
