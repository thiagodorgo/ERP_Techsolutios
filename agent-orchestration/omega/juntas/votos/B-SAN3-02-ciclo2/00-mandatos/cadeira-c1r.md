# Mandato — Cadeira C1r (revalidação) — B-SAN3-02 ciclo 2 (junta de DINHEIRO)

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

Os 14 check-runs do objeto estão concluídos e todos `success` (zero fora de `completed success`), medido por: `gh api repos/thiagodorgo/ERP_Techsolutios/commits/09b380dab54946e16303c8bae0e95bbaa0d667a5/check-runs --jq '.total_count, ([.check_runs[] | select(.status != "completed" or .conclusion != "success")] | length)'`
```
14
0
```

A regra que manda esta cadeira existir, `D-JUNTA-SO-CADEIRA-VERMELHA` (§C7 item 9), está no contrato do objeto; o voto APROVADO da C1 do ciclo 1 não tem o campo `arquivos_medidos`, e a ata do ciclo 1 declara a C1 REVALIDADA pela regra (0); o plano do ciclo 2 (§9-bis, anterior à regra na `main`) a dava como CARREGADA — vale a ata, posterior e conforme a regra (§A2: registrado, não consolidado em silêncio), medido por: `cd C:/Users/AMP/w-san3-02 && git show 09b380dab54946e16303c8bae0e95bbaa0d667a5:CLAUDE.md | tr -d '\r' | grep -n -i -o 'JUNTA: SÓ A CADEIRA VERMELHA É REFEITA, COM TRAVA'; git show 09b380dab54946e16303c8bae0e95bbaa0d667a5:agent-orchestration/omega/juntas/votos/B-SAN3-02/c1-voto.json | grep -c -i 'arquivos_medidos'; git show 09b380dab54946e16303c8bae0e95bbaa0d667a5:agent-orchestration/omega/juntas/J-B-SAN3-02-ciclo1.md | tr -d '\r' | grep -n -i -o -E 'escopo dela é total \(regra \(0\)\)|Por isso ela \*\*revalida\*\*'; git show 09b380dab54946e16303c8bae0e95bbaa0d667a5:agent-orchestration/omega/reprovacoes/R-B-SAN3-02-1.md | tr -d '\r' | grep -n -i -o 'a C1 \*\*carrega\*\* o voto'`
```
809:JUNTA: SÓ A CADEIRA VERMELHA É REFEITA, COM TRAVA
0
56:escopo dela é total (regra (0))
56:Por isso ela **revalida**
249:a C1 **carrega** o voto
```

Do objeto do ciclo 1 ao objeto do ciclo 2 há três commits de primeiro pai (o conserto, o registro do ciclo 1 e um merge da `origin/main`); o trabalho próprio do bloco tem 16 caminhos, dois deles código: a migração do bloco e o drill dela, medido por: `cd C:/Users/AMP/w-san3-02 && git rev-list --first-parent --count 8e6a6c29b8a0aced5bf3968383aa9ef247019f46..09b380dab54946e16303c8bae0e95bbaa0d667a5; git diff --name-only 8e6a6c29b8a0aced5bf3968383aa9ef247019f46 "$(git rev-parse 09b380dab54946e16303c8bae0e95bbaa0d667a5^1)" | wc -l; git diff --name-only 8e6a6c29b8a0aced5bf3968383aa9ef247019f46 "$(git rev-parse 09b380dab54946e16303c8bae0e95bbaa0d667a5^1)" -- prisma src tests .github Kpis .claude .agents`
```
3
16
prisma/migrations/20260878000000_invoice_complementary_title/migration.sql
tests/work-order-invoicing-migration-drill-db.test.ts
```

Os arquivos que a C1 do ciclo 1 mediu (os 12 de `src/` do faturamento, as duas suítes do objeto e os ajudantes de teste) NÃO mudaram de um objeto para o outro; no conjunto que inclui `prisma/`, só a migração do bloco mudou — e é ela que o `prisma migrate deploy` aplica no cluster de toda sonda de banco desta cadeira, medido por: `cd C:/Users/AMP/w-san3-02 && git diff --name-only 8e6a6c29b8a0aced5bf3968383aa9ef247019f46 09b380dab54946e16303c8bae0e95bbaa0d667a5 -- src/modules/work-order-financials src/modules/financial-titles src/modules/financial-uow src/database tests/work-order-invoicing.test.ts tests/work-order-invoicing-atomic-db.test.ts tests/helpers prisma/schema.prisma prisma/migrations`
```
prisma/migrations/20260878000000_invoice_complementary_title/migration.sql
```

A mudança da migração, descontados os comentários, são só duas sentenças novas, `BEGIN;` no começo e `COMMIT;` no fim; as seis sentenças DDL são as mesmas, medido por: `cd C:/Users/AMP/w-san3-02 && diff <(git show 8e6a6c29b8a0aced5bf3968383aa9ef247019f46:prisma/migrations/20260878000000_invoice_complementary_title/migration.sql | tr -d '\r' | sed -E '/^[[:space:]]*--/d;/^[[:space:]]*$/d') <(git show 09b380dab54946e16303c8bae0e95bbaa0d667a5:prisma/migrations/20260878000000_invoice_complementary_title/migration.sql | tr -d '\r' | sed -E '/^[[:space:]]*--/d;/^[[:space:]]*$/d'); echo diff-ec=$?`
```
0a1
> BEGIN;
14a16
> COMMIT;
diff-ec=1
```

A base do vermelho-controle da C1 do ciclo 1 (o `src/` da merge-base que o ciclo 1 usou) se resolve pela merge-base do objeto do ciclo 1 com a merge-base atual; nela os 12 arquivos de `src/` do faturamento diferem do objeto, e entre ela e a `main` de agora os arquivos do faturamento e os testes que esta cadeira usa não mudaram, medido por: `cd C:/Users/AMP/w-san3-02 && B0=$(git merge-base 8e6a6c29b8a0aced5bf3968383aa9ef247019f46 9009e81be3c5a711584747428c55707a17afc009); git diff --name-only "$B0" 09b380dab54946e16303c8bae0e95bbaa0d667a5 -- src/modules/work-order-financials src/modules/financial-titles src/modules/financial-uow | wc -l; git diff --name-only "$B0" 9009e81be3c5a711584747428c55707a17afc009 -- src/modules/work-order-financials src/modules/financial-titles src/modules/financial-uow tests/work-order-invoicing.test.ts tests/work-order-financials.test.ts tests/helpers | wc -l`
```
12
0
```

O roteiro P3 desta cadeira é a evidência da C1 do ciclo 1, no objeto, com as seções de legalidade, terreno, leitura estática do blob, sondas, os três itens e o teardown, medido por: `git -C C:/Users/AMP/w-san3-02 show 09b380dab54946e16303c8bae0e95bbaa0d667a5:agent-orchestration/omega/juntas/votos/B-SAN3-02/c1-evidencia.md | tr -d '\r' | grep -n -i -E '^## |^### '`
```
5:## 0. Legalidade e objeto
15:## 0.1 Terreno
22:## 0.2 Leitura do blob (item 1, "mesmo tx")
28:## 0.3 Sondas próprias e subida do banco
38:### Papel sem bypass (regra comum)
41:## Item 1 — K1 (falha injetada entre o título e o carimbo)
67:## Item 2 — K2 (item apagado/alterado durante o faturamento)
91:## Item 3 — dois faturamentos na mesma OS; advisory antes do row lock; ordem total
119:## Teardown (02:33Z)
```

Os comandos que a C1 do ciclo 1 executou no banco estão registrados, com o ec de cada um, nos três logs fora do repositório (37 execuções: 5, 27 e 5); seis delas (os mesmos três comandos, no primeiro e no segundo log) rodam suítes VERSIONADAS do objeto, e as outras 31 rodam sondas próprias da cadeira, medido por: `cd C:/Users/AMP/erp-pausa-2026-10-03/jsan302-c1 && grep -c -i '^RUN \[' run1-obj.log run2-all.log run3-m5b.log; grep -i -E '^RUN \[obj-' run2-all.log; grep -o -i '^RUN \[[^]]*\] ec=[0-9]*' run2-all.log run3-m5b.log | cut -d: -f2 | tr '\n' ';'; echo`
```
run1-obj.log:5
run2-all.log:27
run3-m5b.log:5
RUN [obj-mem-invoicing] ec=0 :: CORE_SAAS_PERSISTENCE=memory node --test --import tsx tests/work-order-invoicing.test.ts
RUN [obj-db-atomic-1] ec=0 :: node --test --import tsx tests/work-order-invoicing-atomic-db.test.ts
RUN [obj-db-atomic-2] ec=0 :: node --test --import tsx tests/work-order-invoicing-atomic-db.test.ts
RUN [obj-mem-invoicing] ec=0;RUN [obj-db-atomic-1] ec=0;RUN [obj-db-atomic-2] ec=0;RUN [sonda-mem] ec=0;RUN [sonda-db] ec=0;RUN [M1/MA1] ec=1;RUN [M1/K1A] ec=1;RUN [M1/SYM] ec=0;RUN [M9/MA1] ec=1;RUN [M9/K1A] ec=1;RUN [M3/MA3] ec=1;RUN [M20/MA6] ec=1;RUN [M24/MA3+MA7] ec=1;RUN [M2/R2+R2B+Z2] ec=1;RUN [M4/R1] ec=1;RUN [M4'/R4] ec=1;RUN [M4m/MM4b] ec=1;RUN [M4m/R1] ec=1;RUN [M4i/MM4c] ec=1;RUN [M17/A4] ec=1;RUN [ORDINV/ORD] ec=1;RUN [M4"/Z1] ec=1;RUN [M19/Z3] ec=1;RUN [M19/Z3L] ec=1;RUN [base/K1A] ec=1;RUN [base/R1] ec=1;RUN [base/R2] ec=1;RUN [M5b/SYM] ec=0;RUN [M5b/A4B] ec=1;RUN [M1/M1+M5b/SYM] ec=1;RUN [M1/M1+M5b/SYM-N20] ec=1;RUN [M1/M1/SYM-N20] ec=0;
```

As sondas próprias da C1 do ciclo 1 (o driver, as duas suítes de sonda, os leitores, o script de mutação e a cópia da base, que viviam no worktree dela) NÃO existem mais: o worktree foi removido e na pasta de logs só ficaram os quatro logs; o objeto também não as tem — logo as 31 execuções de sonda não podem ser repetidas pelo MESMO arquivo, medido por: `ls C:/Users/AMP/erp-pausa-2026-10-03/jsan302-c1/; test -e C:/Users/AMP/w-jsan302-c1 || echo "worktree w-jsan302-c1 ausente"; git -C C:/Users/AMP/w-san3-02 ls-tree -r --name-only 09b380dab54946e16303c8bae0e95bbaa0d667a5 | grep -c -i 'jsan302-c1'`
```
r4-espera.log
run1-obj.log
run2-all.log
run3-m5b.log
worktree w-jsan302-c1 ausente
0
```

O corpo da C1 existe no objeto, não mudou desde o objeto do ciclo 1 e, descontados o frontmatter e o bloco de adaptação Codex do espelho, é IDÊNTICO entre `.claude/agents/especialistas/` e `.agents/agents/especialistas/` (comparação EOL-neutra), medido por: `cd C:/Users/AMP/w-san3-02 && diff <(git show "09b380dab54946e16303c8bae0e95bbaa0d667a5:.claude/agents/especialistas/jurado-san302-c1-atomicidade-e-corrida.md" | tr -d '\r' | awk 'f; $0=="---"{n++; if(n==2) f=1}' | sed '/^$/d') <(git show "09b380dab54946e16303c8bae0e95bbaa0d667a5:.agents/agents/especialistas/jurado-san302-c1-atomicidade-e-corrida.md" | tr -d '\r' | awk 'f; $0=="---"{n++; if(n==2) f=1}' | awk 'index($0,"Papel para o Codex"){s=1} s&&$0==""{s=0; next} !s' | sed '/^$/d') >/dev/null && echo "IDENTICO corpo c1"; git diff --quiet 8e6a6c29b8a0aced5bf3968383aa9ef247019f46 09b380dab54946e16303c8bae0e95bbaa0d667a5 -- '.claude/agents/especialistas/jurado-san302-*' '.agents/agents/especialistas/jurado-san302-*' && echo "corpos jurado-san302 iguais entre os objetos"`
```
IDENTICO corpo c1
corpos jurado-san302 iguais entre os objetos
```

DIVERGÊNCIA corpo × plano, a mesma do ciclo 1 (registrada pelo §A2, não consolidada em silêncio): a linha 127 do corpo espera, na T-A4, o perdedor com 409; o plano v2 (§4 linha 245 e §7.1 linha 344) mudou o alvo, declaradamente, para 201 complementar; o corpo não tem nenhuma ocorrência de `T-Z` nem de `M19`, e o aceite do Anexo B §6 (linha 801) exige a M19 vermelha 3 vezes no planner padrão, medido por: `git -C C:/Users/AMP/w-san3-02 show 09b380dab54946e16303c8bae0e95bbaa0d667a5:.claude/agents/especialistas/jurado-san302-c1-atomicidade-e-corrida.md | tr -d '\r' | grep -n -i -o -E 'Esperado: o perdedor dá 409 .already_invoiced.|T-Z|M19'; git -C C:/Users/AMP/w-san3-02 show 09b380dab54946e16303c8bae0e95bbaa0d667a5:docs/revisoes/SAN3/B-SAN3-02-plano.md | tr -d '\r' | grep -n -i -o -E 'perdedor \*\*201\*\* com .parentTitleId === T1.id.|o 2º \*\*201 complementar\*\*|\*\*M19 vermelha 3×\*\* no planner padrão'`
```
127:Esperado: o perdedor dá 409 `already_invoiced`
245:o 2º **201 complementar**
344:perdedor **201** com `parentTitleId === T1.id`
801:**M19 vermelha 3×** no planner padrão
```

A ferramenta de banco descartável nomeia contêineres e rede por um ID fixo `tl<epoch><pid>`, não aceita prefixo e roda `npm ci` e `prisma migrate deploy` dentro do contêiner sobre uma cópia do worktree sem `node_modules` (logo o cluster de toda sonda sai da migração NOVA), medido por: `grep -n -i -o -E 'ID="tl[^"]*"|--exclude=./node_modules|npm ci --no-audit|npx prisma migrate deploy' C:/Users/AMP/erp-pausa-2026-10-03/ferramentas/teste-linux.sh`
```
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

Você é `jurado-san302c2-c1r-opus`, identidade nova, executor Claude Code (subagente), modelo Claude Opus, nível menor declarado (§C7.6); a sua função NÃO é julgar a C1 do zero: é a REVALIDAÇÃO da regra (2) do §C7 item 9 — re-executar os comandos registrados em `c1-evidencia.md` do ciclo 1 (o roteiro do P3) sobre o objeto colado acima e comparar com a saída registrada. O corpo `.claude/agents/especialistas/jurado-san302-c1-atomicidade-e-corrida.md` é CONTEXTO (competência, casos e vermelhos), não mandato. Na primeira linha de `c1r-evidencia.md`, declare executor efetivo, modelo, nível, objeto, `mandato_md5` deste arquivo e o veredito IDENTICO/DIVERGE do corpo que você carregou contra o blob do objeto, EOL-neutro (nunca `md5sum` cru sob `core.autocrlf=true`). Opus esgotado: PARE sem votar e registre onde parou (§C7.6-bis). Se o seu nome coincidir com algum inelegível do mandato do inspetor, pare. A evidência e o voto da C1 do ciclo 1, os logs dela, o plano do ciclo 2, a ata e o relatório do dev são **A RE-VERIFICAR**: valem como roteiro, nunca como fato, derruba com: `head -1 C:/Users/AMP/w-san3-02/agent-orchestration/omega/juntas/votos/B-SAN3-02-ciclo2/c1r-evidencia.md | grep -i -E 'executor|modelo|mandato_md5|IDENTICO|DIVERGE'`

A legalidade vem antes do mérito: parecer `insp-san302c2-parecer.md` do inspetor `inspetor-san302c2-opus` com LIBERADO ou LIBERADO COM RESSALVA nomeando você, seu executor, seu worktree e seu terreno de banco; o objeto continua sendo o head do PR 448 colado acima, com 14 de 14 check-runs concluídos (head que andou bloqueia o início). Régua de comparação (§C7 item 9 (2)): saída IGUAL à registrada mantém o verde daquele trecho; saída DIFERENTE vira voto novo com a régua do ciclo 2 — bloco de DINHEIRO, unanimidade de 3 com veto do CONJUNTO (§C7 item 9 (4)), e todo `bloqueia` com escopo `dentro-do-bloco` reprova, grave ou não (§C7 item 8(2)). Como as 31 execuções de sonda não podem ser repetidas pelo mesmo arquivo (medido acima), a leitura deste redator, DECLARADA como derivação e não como regra escrita, é: nelas não há "saída igual" possível; você reconstrói a sonda pelo caso registrado (mesmo caso, mesma asserção, mesmo N, mesmo vermelho-controle) e o resultado dela é voto novo naquele item, com a régua do ciclo 2 — e se o orquestrador ler diferente, ele corrige este mandato antes do disparo. Todo achado declara gravidade, classe, escopo, N e forma; `pre-existente` exige evidência de origem ou data e pendência com dono (§C7.1-ter(a)) e não reprova; escopo sem evidência conta como `dentro-do-bloco`; "não consigo medir" item seu é REPROVADO; não proponha correção (§C7.4-bis), não cobre KPI (congelado) nem matéria de C2′ ou C3′, e não leia votos alheios desta junta (os do ciclo 1 de C2 e C3 também não), derruba com: `grep -i -E 'legalidade|A RE-VERIFICAR|regra \(2\)|IGUAL|DIFERENTE|voto novo|gravidade|classe|escopo' C:/Users/AMP/w-san3-02/agent-orchestration/omega/juntas/votos/B-SAN3-02-ciclo2/c1r-voto.json`

O voto declara `arquivos_medidos` (§C7 item 9 (0)): a lista de caminhos ou globs que a SUA medição alcança — no mínimo os 12 arquivos de `src/modules/work-order-financials`, `src/modules/financial-titles` e `src/modules/financial-uow`, `src/database/**` que as sondas tocarem, as duas suítes do objeto, `tests/helpers/**`, `prisma/schema.prisma` e `prisma/migrations/**` (o cluster de toda sonda de banco sai do `migrate deploy` delas) — e, se você rodar comando que mede o código inteiro, declara `**`; o campo vem com o comando que o derivou, derruba com: `grep -i -E 'arquivos_medidos' C:/Users/AMP/w-san3-02/agent-orchestration/omega/juntas/votos/B-SAN3-02-ciclo2/c1r-voto.json`

Terreno: worktree exclusivo prefixado `C:/Users/AMP/w-jsan302c2-c1r-`, no objeto, com `npm ci` próprio e zero junction de `node_modules` (§C7.1-ter(c)), removido só por `git worktree remove --force` depois de conferir que nenhum processo o usa. Banco: Postgres 16 DESCARTÁVEL por `bash C:/Users/AMP/erp-pausa-2026-10-03/ferramentas/teste-linux.sh <seu-worktree> '<comando>'`; a ferramenta nomeia os seus contêineres e rede `tl<epoch><pid>` (medido acima), e você registra esse ID na evidência como seu ANTES de o `trap` removê-los; todo contêiner ou rede que você criar fora da ferramenta leva o prefixo `jsan302c2-c1r-`, e toda base `jsan302c2_c1r_<caso>`. Antes de cada subida, meça a memória de commit livre (no mínimo 4 GB, P8 (c)), conte os trabalhos Docker alheios excluindo `erp-*` (no máximo 2 na máquina contando o seu) e o disco (no mínimo 10 GB); faltando qualquer um, espere. Nunca a base viva (`erp-postgres`, `erp-redis`) nem as portas 5432, 6379, 3000, 5173, 5050 e 8899; nunca `prune` nem contêiner alheio. Sondas e mutações só no seu worktree (nunca rastreadas, nunca commitadas), uma mutação por vez, com âncora única e prova de aplicação (CRLF incluso), restauro provado por `git hash-object <arquivo>` igual a `git rev-parse <objeto>:<arquivo>`; gatilhos e funções de falha escopados pelo tenant do teste e removidos no `finally`, com 0 resto provado em `pg_trigger` e `pg_proc`; GUARDE o texto das suas sondas fora do worktree antes de removê-lo, numa pasta sua em `C:/Users/AMP/erp-pausa-2026-10-03/jsan302c2-c1r/`, para que a sua evidência seja re-executável (a falta disso é o que tornou esta revalidação impossível pelo mesmo arquivo); teardown só do que é seu, derruba com: `grep -i -E 'w-jsan302c2-c1r-|jsan302c2|tl[0-9]|junction|erp-|commit livre|4 GB|5432|6379|3000|5173|5050|8899|hash-object|pg_trigger|teardown|pausa-2026-10-03.jsan302c2-c1r' C:/Users/AMP/w-san3-02/agent-orchestration/omega/juntas/votos/B-SAN3-02-ciclo2/c1r-evidencia.md`

Item 1 de 3 (o que se re-executa pelo MESMO comando): re-execute, sobre o objeto, as seções 0 e 0.2 de `c1-evidencia.md` — objeto por duas fontes, check-runs, e a leitura estática do blob de `src/modules/work-order-financials/work-order-financial.service.ts`, `src/modules/financial-titles/financial-title.service.ts` e `src/modules/financial-uow/financial-uow-prisma.ts` (o INSERT do título e o carimbo no MESMO `tx` da unidade; nenhum `this.repository.create` no caminho do `invoice`), com os números de linha comparados; a identidade dos 12 arquivos de `src/` contra o objeto do ciclo 1 (o HASHCHECK 12/12 do ciclo 1, agora por `git diff` entre os dois objetos ou por `git hash-object` no seu worktree); e as três execuções `RUN [obj-…]` coladas acima, pelo mesmo comando, dentro do contêiner da ferramenta, cujo cluster sai da migração NOVA: `tests/work-order-invoicing.test.ts` em memória e `tests/work-order-invoicing-atomic-db.test.ts` duas vezes, comparando `# tests`, `# pass`, `# fail` e `# skipped` com `run2-all.log` (35/35 e 17/17 com 0 skip registrados). Publique, por comando, IGUAL ou DIFERENTE, derruba com: `grep -i -E 'Item 1|0\.2|mesmo tx|this\.repository|12/12|obj-mem-invoicing|obj-db-atomic|35|17|run2-all|IGUAL|DIFERENTE' C:/Users/AMP/w-san3-02/agent-orchestration/omega/juntas/votos/B-SAN3-02-ciclo2/c1r-evidencia.md`

Item 2 de 3 (K1 e K2, as seções "Item 1" e "Item 2" de `c1-evidencia.md`, por sonda reconstruída): reproduza, sob o papel efêmero `NOSUPERUSER NOBYPASSRLS` com `rolsuper` e `rolbypassrls` falsos lidos pela própria conexão do serviço, cada caso registrado — K1A (gatilho `BEFORE UPDATE` no carimbo), irmão positivo (1 título = Σ dos carimbados), K1B (gatilho `BEFORE INSERT` no título), T-A1, T-A3 (409 `invoice_items_changed`), T-A6 (503 `invoice_transient_conflict` nas formas `P2034` e `P2010`/`40P01`), T-A7 (409 alheio e 400 `invalid_parent_title_reference` intactos), T-PREC (422 `period_closed`) — e as corridas T-R1, T-R2, T-R2b e T-R4 com N = 5 cada, barreira por `application_name` (`tests/helpers/pg-barrier.ts`), o perdedor bloqueado provado em `pg_stat_activity` (`wait_event_type = 'Lock'`, `usename` = o papel) antes da liberação, frequência por desfecho e denominador constante, mais T-M4b e T-M4c em memória e o leitor de desfechos com uma resposta fabricada de cada balde; compare desfecho a desfecho com as tabelas registradas. Vermelho-controle, como registrado: a sonda contra o `src/` da base (a merge-base resolvida acima, cópia com hashes provados) reproduz o título sem carimbo (K1A) e o TOCTOU (R1 e R2, N = 3); M1, M9, M3 (só em memória), M20, M24, M2 (morte em R2, R2b e Z2), M4, M4′, M4m e M4i, uma por vez, cada uma vermelha no caso que a cita, derruba com: `grep -i -E 'Item 2|K1A|K1B|irmão positivo|T-A1|T-A3|T-A6|T-A7|T-PREC|T-R1|T-R2|T-R2b|T-R4|T-M4b|T-M4c|pg_stat_activity|rolbypassrls|M1|M9|M3|M20|M24|M2|M4|vermelho|hash-object' C:/Users/AMP/w-san3-02/agent-orchestration/omega/juntas/votos/B-SAN3-02-ciclo2/c1r-evidencia.md`

Item 3 de 3 (corrida e ordem de travas, a seção "Item 3" de `c1-evidencia.md`, por sonda reconstruída): reproduza (a) dois `invoice` reais concorrentes na mesma OS, sem barreira, N = 10, um 201 e um 409 `already_invoiced` por rodada, 1 original ativo e nenhum item com dois `title_id`; (b) a T-A4 NA FORMA DO PLANO v2 (201 COMPLEMENTAR com `parentTitleId` igual ao original, `invoicedItemCount` 1, 2 títulos; NÃO o 409 da linha 127 do corpo, divergência medida acima) com N = 3, e a T-A4b (409 `already_invoiced`, nada persiste); (c) a advisory antes do row lock, por `pg_locks` enquanto o `invoice` espera a trava exclusiva do período (`src/database/financial-period-lock.ts`), com 0 row lock em itens e títulos; (d) T-Z1, T-Z2, e a T-Z3 no planner padrão SEM `PGOPTIONS`, com a premissa `ctid(i1) < ctid(i2)` medida e o `EXPLAIN (COSTS OFF)` do `UPDATE` sem ordem registrado, mais a T-Z3L (5000 linhas de lastro e `ANALYZE`, Index Scan), sem `40P01` em nenhuma conexão. Vermelho-controle, como registrado: M17 (A4), a ordem invertida acusada por `pg_locks`, M4″ (Z1), M19 em Seq e em Index (3 + 3), M5b (`DROP INDEX` do índice de originais no SEU cluster depois do deploy: A4b com 2 originais), M1 + M5b (violações na SYM) e M1 sozinha na SYM (verde, registrado como fato no ciclo 1); o leitor de `pg_locks` acusa uma linha fabricada. Compare desfecho a desfecho com o registrado e publique IGUAL ou DIFERENTE por caso, derruba com: `grep -i -E 'Item 3|SYM|T-A4|T-A4b|complementar|pg_locks|advisory|T-Z1|T-Z2|T-Z3|ctid|EXPLAIN|PGOPTIONS|M17|M4″|M19|M5b|M1|IGUAL|DIFERENTE|vermelho' C:/Users/AMP/w-san3-02/agent-orchestration/omega/juntas/votos/B-SAN3-02-ciclo2/c1r-evidencia.md`

Protocolo P1/P2/P3/P4/P7 do §C7.7, verbatim no bloco colado acima, com `<cadeira>` = `c1r`: evidência em `c1r-evidencia.md` após CADA item; `c1r-voto.json` nasce esqueleto com os três itens EM APURAÇÃO e o campo `arquivos_medidos`, cada item gravado ao ser medido, e fecha (`voto` APROVADO ou REPROVADO, com `revalidacao` IGUAL ou DIFERENTE por item) antes da mensagem final de 1 linha; sucessor de identidade nova re-executa os comandos registrados e só então mede a cauda; três itens exatos; PAUSA grava head, feito, falta, próximo comando e arquivos meio-escritos e para. Queda vai a `00-quedas.md` deste diretório (P6, pelo orquestrador); no máximo 2 jurados em paralelo (P5). Únicos outputs: `c1r-evidencia.md` e `c1r-voto.json` em `C:/Users/AMP/w-san3-02/agent-orchestration/omega/juntas/votos/B-SAN3-02-ciclo2/`, mais a cópia das suas sondas na pasta sua fora do repositório; nunca commit, derruba com: `test -f C:/Users/AMP/w-san3-02/agent-orchestration/omega/juntas/votos/B-SAN3-02-ciclo2/c1r-voto.json`

## MEDIDO

Pré-voo deste mandato com as ferramentas copiadas, sem mudança, para a pasta própria do redator `C:/Users/AMP/erp-pausa-2026-10-03/redator-san302c2/` (o `RAIZ=C:/Users/AMP/w-san3-02` da linha 211 do `mandato-preflight.sh` vem da cópia do ciclo 1), executado com o cwd no worktree do objeto; o redator é `redator-san302c2-opus` (Claude Opus, nível menor declarado); o `sed` troca, nos AVISOs, o número da migração pelo marcador `<corrida>` e o caminho dela pelo marcador `<migracao>`, e apaga a linha de AVISO do ec 3 da ferramenta (o texto dela traz o token reservado da checagem 7, que fora da colagem seria recusado; o ec 3 está declarado na primeira unidade), medido por: `cd C:/Users/AMP/w-san3-02 && MANDATO_REFS=C:/Users/AMP/erp-pausa-2026-10-03/redator-san302c2/mandato-refs.sh bash C:/Users/AMP/erp-pausa-2026-10-03/redator-san302c2/mandato-preflight.sh C:/Users/AMP/w-san3-02/agent-orchestration/omega/juntas/votos/B-SAN3-02-ciclo2/00-mandatos/cadeira-c1r.md 448 2>&1 | sed -E -e "s#prisma/migrations/2026[0-9]+_[a-z_]+/migration[.]sql#<migracao>#g" -e "s#'2026[0-9]+'#'<corrida>'#g" -e '/NAO DETERMINAVEL/d'; echo ec=${PIPESTATUS[0]}`
```
COLAGEM    l.6-21: refs do PR #448 confere com a saida atual
AVISO      corrida hex em caminho versionado nao cobrada pela checagem 4: '<corrida>' em <migracao> — l.47
AVISO      corrida hex em caminho versionado nao cobrada pela checagem 4: '<corrida>' em <migracao> — l.53
AVISO      corrida hex em caminho versionado nao cobrada pela checagem 4: '<corrida>' em <migracao> — l.56

PRE-VOO OK — C:/Users/AMP/w-san3-02/agent-orchestration/omega/juntas/votos/B-SAN3-02-ciclo2/00-mandatos/cadeira-c1r.md
ec=0
```
