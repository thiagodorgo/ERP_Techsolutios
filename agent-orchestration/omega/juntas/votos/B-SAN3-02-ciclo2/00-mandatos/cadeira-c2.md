# Mandato — Cadeira C2′ (refeita) — B-SAN3-02 ciclo 2 (junta de DINHEIRO)

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

O achado que reprovou o ciclo 1 é o C2-01, `bloqueia`, `dentro-do-bloco`, no voto REPROVADO da C2 do ciclo 1 (identidade `jurado-san302-c2-opus`, inelegível para esta cadeira), medido por: `git -C C:/Users/AMP/w-san3-02 show 09b380dab54946e16303c8bae0e95bbaa0d667a5:agent-orchestration/omega/juntas/votos/B-SAN3-02/c2-voto.json | grep -n -i -o -E '"id": "C2-01"|"gravidade": "bloqueia"|"escopo": "dentro-do-bloco"|"voto": "REPROVADO"'`
```
12:"voto": "REPROVADO"
21:"id": "C2-01"
25:"gravidade": "bloqueia"
26:"escopo": "dentro-do-bloco"
```

Do objeto do ciclo 1 ao objeto do ciclo 2, o trabalho próprio do bloco tem 16 caminhos e só dois são código: a migração do bloco e o drill dela; `src/`, `prisma/schema.prisma`, as outras migrações e as outras suítes não mudaram, medido por: `cd C:/Users/AMP/w-san3-02 && git diff --name-only 8e6a6c29b8a0aced5bf3968383aa9ef247019f46 "$(git rev-parse 09b380dab54946e16303c8bae0e95bbaa0d667a5^1)" | wc -l; git diff --name-only 8e6a6c29b8a0aced5bf3968383aa9ef247019f46 "$(git rev-parse 09b380dab54946e16303c8bae0e95bbaa0d667a5^1)" -- prisma src tests .github Kpis .claude .agents`
```
16
prisma/migrations/20260878000000_invoice_complementary_title/migration.sql
tests/work-order-invoicing-migration-drill-db.test.ts
```

A migração do objeto abre com `BEGIN;` (linha 13) e fecha com `COMMIT;` (linha 43), com as seis sentenças DDL entre elas e o cabeçalho do down na linha 48, que agora traz a invocação com `ON_ERROR_STOP=1`, medido por: `git -C C:/Users/AMP/w-san3-02 show 09b380dab54946e16303c8bae0e95bbaa0d667a5:prisma/migrations/20260878000000_invoice_complementary_title/migration.sql | tr -d '\r' | grep -n -i -E '^(BEGIN|COMMIT);|^-- down|^ALTER|^CREATE|^DROP' | cut -c1-90`
```
13:BEGIN;
16:ALTER TABLE "financial_titles" ADD COLUMN "parent_title_id" UUID;
19:CREATE UNIQUE INDEX "financial_titles_tenant_wo_direction_id_key"
23:ALTER TABLE "financial_titles"
30:ALTER TABLE "financial_titles"
36:CREATE UNIQUE INDEX "financial_titles_wo_direction_original_active_key"
41:DROP INDEX IF EXISTS "financial_titles_wo_direction_active_key";
43:COMMIT;
48:-- down (MANUAL, nunca automático; invocar `psql -v ON_ERROR_STOP=1 --single-transacti
```

Descontados os comentários, o up mudou só pelas duas sentenças `BEGIN;` e `COMMIT;`, e o rodapé do down (depois da linha `-- down`) é idêntico ao do objeto do ciclo 1, medido por: `cd C:/Users/AMP/w-san3-02 && diff <(git show 8e6a6c29b8a0aced5bf3968383aa9ef247019f46:prisma/migrations/20260878000000_invoice_complementary_title/migration.sql | tr -d '\r' | sed -E '/^[[:space:]]*--/d;/^[[:space:]]*$/d') <(git show 09b380dab54946e16303c8bae0e95bbaa0d667a5:prisma/migrations/20260878000000_invoice_complementary_title/migration.sql | tr -d '\r' | sed -E '/^[[:space:]]*--/d;/^[[:space:]]*$/d'); echo up-diff-ec=$?; diff <(git show 8e6a6c29b8a0aced5bf3968383aa9ef247019f46:prisma/migrations/20260878000000_invoice_complementary_title/migration.sql | tr -d '\r' | awk 'f; index($0,"-- down")==1{f=1}') <(git show 09b380dab54946e16303c8bae0e95bbaa0d667a5:prisma/migrations/20260878000000_invoice_complementary_title/migration.sql | tr -d '\r' | awk 'f; index($0,"-- down")==1{f=1}'); echo down-diff-ec=$?`
```
0a1
> BEGIN;
14a16
> COMMIT;
up-diff-ec=1
down-diff-ec=0
```

A garantia falsa do ciclo 1 ("na mesma transação do `migrate deploy`") saiu do comentário da migração, que agora escreve a execução sentença a sentença, a recuperação por `resolve --rolled-back` e o log do servidor Postgres como lugar da causa, medido por: `cd C:/Users/AMP/w-san3-02 && git show 8e6a6c29b8a0aced5bf3968383aa9ef247019f46:prisma/migrations/20260878000000_invoice_complementary_title/migration.sql | tr -d '\r' | grep -c -i 'na mesma transação do'; git show 09b380dab54946e16303c8bae0e95bbaa0d667a5:prisma/migrations/20260878000000_invoice_complementary_title/migration.sql | tr -d '\r' | grep -c -i 'na mesma transação do'; git show 09b380dab54946e16303c8bae0e95bbaa0d667a5:prisma/migrations/20260878000000_invoice_complementary_title/migration.sql | tr -d '\r' | grep -n -i -o -E 'sentença a sentença|log do servidor Postgres|resolve --rolled-back'`
```
1
0
8:sentença a sentença
11:log do servidor Postgres
11:resolve --rolled-back
```

O drill do objeto ganhou `rawStatements` e o caso T-D(f) (falha injetada depois de cada DDL, k = 1..6), ao lado de T-D(a) a T-D(e); e as duas suítes do faturamento estão nas `SUITES` do job `backend-postgres` da CI, medido por: `cd C:/Users/AMP/w-san3-02 && git show 09b380dab54946e16303c8bae0e95bbaa0d667a5:tests/work-order-invoicing-migration-drill-db.test.ts | tr -d '\r' | grep -n -i -o -E 'test\("\[T-D\([a-f]\)\][^"]{0,40}|function (rawStatements|upStatements|downStatements)'; git show 09b380dab54946e16303c8bae0e95bbaa0d667a5:.github/workflows/ci.yml | tr -d '\r' | grep -n -i -E 'SUITES=.*invoicing'`
```
105:function rawStatements
122:function upStatements
133:function downStatements
237:test("[T-D(a)] migrate deploy: índices novos presente
266:test("[T-D(b)] legado ANTES do up (2 títulos da mesma
284:test("[T-D(d)] down (ponta A, sem complementar) → re
308:test("[T-D(c)] original + 2 complementares OK; 2º ori
322:test("[T-D(e)] a FK de 4 colunas recusa pai de OUTRA O
433:test("[T-D(f)] para k = 1..6: migrate deploy com falha
300:          SUITES="$SUITES tests/work-order-invoicing-atomic-db.test.ts"
301:          SUITES="$SUITES tests/work-order-invoicing-migration-drill-db.test.ts"
```

O plano do ciclo 2 fixa o fluxo do deploy (falha → P3009 → `resolve --rolled-back` → deploy → `status` "up to date"; base que já aplicou a versão antiga do arquivo fica inerte), pede para esta cadeira injeção PRÓPRIA (não a do teste) e o snapshot de catálogo igual ao do objeto do ciclo 1, e declara o risco R1 (mensagem do CLI mascarada), medido por: `git -C C:/Users/AMP/w-san3-02 show 09b380dab54946e16303c8bae0e95bbaa0d667a5:agent-orchestration/omega/reprovacoes/R-B-SAN3-02-1.md | tr -d '\r' | grep -n -i -o -E 'ec 1, \*\*P3009\*\*|ec 0, "marked as rolled back"|ec 0; .migrate status. ec 0 "up to date"|base que já aplicou a \*\*versão antiga\*\*|\*\*R1 — mensagem mascarada:\*\*|snapshot de catálogo = objeto do ciclo 1|com injeção própria'`
```
88:ec 1, **P3009**
89:ec 0, "marked as rolled back"
90:ec 0; `migrate status` ec 0 "up to date"
91:base que já aplicou a **versão antiga**
237:com injeção própria
237:snapshot de catálogo = objeto do ciclo 1
251:snapshot de catálogo = objeto do ciclo 1
261:**R1 — mensagem mascarada:**
```

O relatório do dev registra as três mutações novas do ciclo 2 e uma divergência dele contra o plano (a M29c morre em todo prefixo, não só em k = 1), com o drill 6/6 três vezes, medido por: `git -C C:/Users/AMP/w-san3-02 show 09b380dab54946e16303c8bae0e95bbaa0d667a5:docs/revisoes/SAN3/B-SAN3-02-dev.md | tr -d '\r' | grep -n -i -E '^\| \*\*M29[bc]?\*\* \|' | cut -d'|' -f2; git -C C:/Users/AMP/w-san3-02 show 09b380dab54946e16303c8bae0e95bbaa0d667a5:docs/revisoes/SAN3/B-SAN3-02-dev.md | tr -d '\r' | grep -n -i -o -E 'M29c morre em 6/6 k, não só em k=1|drill \*\*6/6 × 3\*\*'`
```
 **M29** 
 **M29b** 
 **M29c** 
218:drill **6/6 × 3**
243:M29c morre em 6/6 k, não só em k=1
```

O corpo desta cadeira existe no objeto, não mudou desde o objeto do ciclo 1 e, descontados o frontmatter e o bloco de adaptação Codex do espelho, é IDÊNTICO entre `.claude/agents/especialistas/` e `.agents/agents/especialistas/` (comparação EOL-neutra), medido por: `cd C:/Users/AMP/w-san3-02 && diff <(git show "09b380dab54946e16303c8bae0e95bbaa0d667a5:.claude/agents/especialistas/jurado-san302-c2-complementar-e-indice.md" | tr -d '\r' | awk 'f; $0=="---"{n++; if(n==2) f=1}' | sed '/^$/d') <(git show "09b380dab54946e16303c8bae0e95bbaa0d667a5:.agents/agents/especialistas/jurado-san302-c2-complementar-e-indice.md" | tr -d '\r' | awk 'f; $0=="---"{n++; if(n==2) f=1}' | awk 'index($0,"Papel para o Codex"){s=1} s&&$0==""{s=0; next} !s' | sed '/^$/d') >/dev/null && echo "IDENTICO corpo c2"; git diff --quiet 8e6a6c29b8a0aced5bf3968383aa9ef247019f46 09b380dab54946e16303c8bae0e95bbaa0d667a5 -- '.claude/agents/especialistas/jurado-san302-*' '.agents/agents/especialistas/jurado-san302-*' && echo "corpos jurado-san302 iguais entre os objetos"`
```
IDENTICO corpo c2
corpos jurado-san302 iguais entre os objetos
```

DIVERGÊNCIA corpo × plano, a mesma do ciclo 1 (registrada pelo §A2, não consolidada em silêncio): a linha 82 do corpo descreve a FK de 2 colunas, que a Q4 do dono substituiu pela de 4 colunas; a linha 86 pede `migrate diff` com `--shadow-database-url` saindo vazio, critério que o Anexo B mediu como impossível no Prisma 7.8.0 e substituiu pelo delta de exatamente uma sentença; e o critério de transação única (linha 84) e o vermelho "deploy não atômico" (linha 101), que reprovaram o ciclo 1, seguem no corpo, medido por: `git -C C:/Users/AMP/w-san3-02 show 09b380dab54946e16303c8bae0e95bbaa0d667a5:.claude/agents/especialistas/jurado-san302-c2-complementar-e-indice.md | tr -d '\r' | grep -n -i -o -E 'FK composta .\(tenant_id, parent_title_id\) → financial_titles\(tenant_id, id\).|shadow-database-url .{0,20}sai vazio|\*\*3\. Idempotência e transação única\.\*\*|^- deploy não atômico;'; git -C C:/Users/AMP/w-san3-02 show 09b380dab54946e16303c8bae0e95bbaa0d667a5:docs/revisoes/SAN3/B-SAN3-02-plano.md | tr -d '\r' | grep -n -i -o -E 'O delta tem de ser \*\*exatamente uma sentença, só no head\*\*|não há .--shadow-database-url. em 7.8.0'`
```
82:FK composta `(tenant_id, parent_title_id) → financial_titles(tenant_id, id)`
84:**3. Idempotência e transação única.**
86:shadow-database-url <base própria>` sai vazio
101:- deploy não atômico;
710:O delta tem de ser **exatamente uma sentença, só no head**
728:não há `--shadow-database-url` em 7.8.0
```

A ressalva R2 do DBA (o down só para na ponta B se invocado com `ON_ERROR_STOP`) segue apensada à pendência `P-SAN3-02-DOWN-COM-COMPLEMENTAR` no objeto, agora na linha 11443 por causa do merge, medido por: `git -C C:/Users/AMP/w-san3-02 show 09b380dab54946e16303c8bae0e95bbaa0d667a5:agent-orchestration/controle/pendencias.md | tr -d '\r' | grep -n -i -o -E '.{0,40}ON_ERROR_STOP=1 --single-transaction.{0,20}'`
```
11443: para na ponta B se rodar como `psql -v ON_ERROR_STOP=1 --single-transaction -f <down>`. Num `ps
```

A ferramenta de banco descartável nomeia contêineres e rede por um ID fixo `tl<epoch><pid>`, não aceita prefixo e roda `npm ci` e `prisma migrate deploy` dentro do contêiner sobre uma cópia do worktree sem `node_modules`, medido por: `grep -n -i -o -E 'ID="tl[^"]*"|--exclude=./node_modules|npm ci --no-audit|npx prisma migrate deploy' C:/Users/AMP/erp-pausa-2026-10-03/ferramentas/teste-linux.sh`
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

Você é `jurado-san302c2-c2-opus`, identidade nova, executor Claude Code (subagente), modelo Claude Opus, nível menor declarado (§C7.6); a cadeira é REFEITA pela regra (3) do §C7 item 9, focada no achado C2-01 mais a regressão dos itens da C2 do ciclo 1 que o conserto pode afetar (migração, drill, catálogo, down); o seu corpo canônico é `.claude/agents/especialistas/jurado-san302-c2-complementar-e-indice.md` (o plano do ciclo 2 previa a identidade `jurado-san302-c2b-opus`; a de fato é esta, nomeada pelo orquestrador). Na primeira linha de `c2-evidencia.md`, declare executor efetivo, modelo, nível, objeto, `mandato_md5` deste arquivo e o veredito IDENTICO/DIVERGE do corpo que você carregou contra o blob do objeto, EOL-neutro (nunca `md5sum` cru sob `core.autocrlf=true`). Opus esgotado: PARE sem votar e registre onde parou (§C7.6-bis). Se o seu nome coincidir com algum inelegível do mandato do inspetor, pare. O plano do ciclo 2 (`R-B-SAN3-02-1.md`), o relatório do dev, a evidência e o voto da C2 do ciclo 1 (roteiro, não prova) e o parecer do DBA (`dba-san302-opus`) são **A RE-VERIFICAR**: no voto, o campo `dba_guardiao` nomeia cada convergência e cada divergência (§A2), derruba com: `head -1 C:/Users/AMP/w-san3-02/agent-orchestration/omega/juntas/votos/B-SAN3-02-ciclo2/c2-evidencia.md | grep -i -E 'executor|modelo|mandato_md5|IDENTICO|DIVERGE'`

A legalidade vem antes do mérito: parecer `insp-san302c2-parecer.md` do inspetor `inspetor-san302c2-opus` com LIBERADO ou LIBERADO COM RESSALVA nomeando você, seu executor, seu worktree e seu terreno de banco; o objeto continua sendo o head do PR 448 colado acima, com 14 de 14 check-runs concluídos (head que andou bloqueia o início). Régua: bloco de DINHEIRO, unanimidade de 3 com veto do CONJUNTO (§C7 item 9 (4), §C7 item 8(1)); ciclo 2, o ÚLTIMO em que todo `bloqueia` com escopo `dentro-do-bloco` reprova, grave ou não (§C7 item 8(2)); migração destrutiva é parada irredutível (§C7.5), não voto. Todo achado declara gravidade, classe, escopo, N e forma; `pre-existente` exige evidência de origem ou data e pendência com dono (§C7.1-ter(a)) e não reprova; escopo sem evidência conta como `dentro-do-bloco`; "não consigo medir" item seu é REPROVADO; não proponha correção (§C7.4-bis), não reabra a decisão do dono (Q1–Q4) sem efeito novo, não cobre KPI nem matéria de C1r ou C3′, e não leia votos desta junta do ciclo 2; o voto declara `arquivos_medidos` (§C7 item 9 (0)), derruba com: `grep -i -E 'legalidade|A RE-VERIFICAR|gravidade|classe|escopo|dba_guardiao|arquivos_medidos' C:/Users/AMP/w-san3-02/agent-orchestration/omega/juntas/votos/B-SAN3-02-ciclo2/c2-voto.json`

Terreno: worktree exclusivo prefixado `C:/Users/AMP/w-jsan302c2-c2-`, no objeto, com `npm ci` próprio e zero junction de `node_modules` (§C7.1-ter(c)), removido só por `git worktree remove --force` depois de conferir que nenhum processo o usa. Banco: Postgres 16 DESCARTÁVEL por `bash C:/Users/AMP/erp-pausa-2026-10-03/ferramentas/teste-linux.sh <seu-worktree> '<comando>'`; a ferramenta nomeia os seus contêineres e rede `tl<epoch><pid>` (medido acima), e você registra esse ID na evidência como seu; as bases são `CREATE DATABASE jsan302c2_c2_<caso>` dentro do SEU cluster, apagadas no `finally`, com 0 bases desse prefixo provado no fim; todo contêiner ou rede que você criar fora da ferramenta leva o prefixo `jsan302c2-c2-`. Antes de cada subida, meça a memória de commit livre (no mínimo 4 GB, P8 (c)), conte os trabalhos Docker alheios excluindo `erp-*` (no máximo 2 na máquina contando o seu) e o disco (no mínimo 10 GB); faltando qualquer um, espere. Nunca a base viva (`erp-postgres`, `erp-redis`) nem as portas 5432, 6379, 3000, 5173, 5050 e 8899; nunca `prune` nem contêiner alheio. Toda variante da migração é CÓPIA num diretório temporário de migrações (nunca o arquivo real); mutação em arquivo real só no seu worktree, uma por vez, com âncora única e prova de aplicação (CRLF incluso), restauro provado por `git hash-object <arquivo>` igual a `git rev-parse <objeto>:<arquivo>`; teardown só do que é seu, derruba com: `grep -i -E 'w-jsan302c2-c2-|jsan302c2_c2_|jsan302c2-c2-|tl[0-9]|junction|erp-|commit livre|4 GB|5432|6379|3000|5173|5050|8899|hash-object|teardown' C:/Users/AMP/w-san3-02/agent-orchestration/omega/juntas/votos/B-SAN3-02-ciclo2/c2-evidencia.md`

Item 1 de 3 (o C2-01 fechou: atomicidade e convergência pelo CLI REAL do Prisma): com injeção PRÓPRIA (não a do T-D(f)), numa base sua no nível da `main` (as migrações sem a do bloco, aplicadas por `prisma migrate deploy`), cópia da migração do objeto num diretório temporário de migrações com uma sentença que falha inserida depois da k-ésima DDL (k = 1..6; `BEGIN;` e `COMMIT;` onde o arquivo os tem), rodada pelo `npx prisma migrate deploy` real com `--config` temporário: prove que cada k termina com ec ≠ 0 e o catálogo IGUAL ao de antes (sem `parent_title_id`, sem o índice auxiliar, sem FK nem CHECK, sem o índice de originais; `financial_titles_wo_direction_active_key` presente) e a linha da migração em `_prisma_migrations` com `finished_at` e `rolled_back_at` nulos; e que a recuperação converge — 2º deploy com P3009, `migrate resolve --rolled-back` com ec 0, deploy com ec 0, catálogo inteiro e `migrate status` "up to date" (reaplicável sobre a própria falha, sem 42701). Prove também que uma base que já aplicou o arquivo do objeto do ciclo 1 fica inerte com o arquivo novo (`deploy` sem pendência, `status` em dia), e leia no código do T-D(f) que ele assere ESTADO e nunca a mensagem do CLI (o R1 do plano: "current transaction is aborted" e `logs` nulo publicados como residual medido, com N). Vermelho-controle: o arquivo do objeto do ciclo 1 (`git show` do blob dele), com a mesma injeção, reproduz o parcial em todo k; M29 (sem `BEGIN`/`COMMIT`), M29b (`COMMIT` antes da sentença 6) e M29c (`BEGIN` depois da sentença 1), cada uma vermelha pela sua injeção E pelo T-D(f), com os k em que morre comparados com o relatório do dev (a M29c em 6/6, divergência dele contra o plano); a sua injeção, aplicada depois do `COMMIT`, deixa as seis DDL aplicadas (prova de que ela injeta), derruba com: `grep -i -E 'Item 1|C2-01|injeção própria|k=1|k=6|--config|P3009|resolve --rolled-back|up to date|42701|_prisma_migrations|inerte|R1|current transaction|M29|M29b|M29c|vermelho|hash-object' C:/Users/AMP/w-san3-02/agent-orchestration/omega/juntas/votos/B-SAN3-02-ciclo2/c2-evidencia.md`

Item 2 de 3 (a migração e o catálogo não regrediram; item 1 do corpo, com a Q4 e o critério de drift do Anexo B §3): prove por execução que a migração continua aditiva — classificador de sentenças por script, com `BEGIN` e `COMMIT` classificados como controle de transação (nem aditivo nem destrutivo, e o classificador DIZ isso), o único `DROP` é o do índice antigo depois do novo, sem `CONCURRENTLY`; as seis DDL do up e as seis do down byte-iguais às do objeto do ciclo 1 (medido acima, você re-mede); `prisma/migrations/20260811000000_add_invoicing/migration.sql` e `prisma/schema.prisma` iguais entre os dois objetos; fixture legada antes do deploy, preservada (contagem e hash de linhas, `parent_title_id` nulo); o SNAPSHOT de catálogo (índices com `pg_get_indexdef`, constraints com `pg_get_constraintdef`, `relrowsecurity`/`relforcerowsecurity`, policies e colunas de `financial_titles`) de uma base migrada pelo arquivo novo IGUAL ao de uma base migrada pelo arquivo do objeto do ciclo 1 — é o que fecha a dependência indireta da C1 (§9-bis do plano do ciclo 2); FK de 4 colunas com `confdeltype = 'r'`, CHECK e índice de originais com o predicado exato; 2º deploy sem pendência; o delta de drift do Anexo B §3 EXATAMENTE `ALTER TABLE "financial_titles" DROP CONSTRAINT "financial_titles_parent_title_fkey"` (o "diff vazio" da linha 86 do corpo é critério impossível, divergência medida acima); e o drill inteiro (T-D(a) a T-D(f)) 6/6 três vezes seguidas, mesmo `# tests`, 0 skip, 0 fail. Vermelho-controle: M11b, M28 (T-D(c) nominal, `23514` ausente) e M22 (T-D(a) e T-D(e)) vermelhas; o leitor de catálogo acusa um índice fabricado sem `parent_title_id IS NULL` e uma FK fabricada sem tenant; o classificador acusa `DROP COLUMN` e `UPDATE` fabricados; o comparador de snapshot acusa uma diferença fabricada, derruba com: `grep -i -E 'Item 2|aditiva|BEGIN|COMMIT|controle de transação|CONCURRENTLY|byte-iguais|schema.prisma|fixture|snapshot|confdeltype|predicado|drift|DROP CONSTRAINT|T-D|6/6|M11b|M28|M22|vermelho' C:/Users/AMP/w-san3-02/agent-orchestration/omega/juntas/votos/B-SAN3-02-ciclo2/c2-evidencia.md`

Item 3 de 3 (o down e a operação; item 1.5 do corpo e a R2 do DBA): prove por execução o rollback nas duas pontas com `psql -v ON_ERROR_STOP=1 --single-transaction`: ponta A (sem complementar ativo: up → down → re-up, índices 1 → 1 → 1, sem perda por contagem e hash de linhas) e ponta B (com complementar ativo: para em `23505` sem remover objeto nem linha); re-meça a R2 (o mesmo down SEM `ON_ERROR_STOP` termina com ec 0 e derruba coluna e backstop) e julgue-a contra o que o objeto escreve agora no cabeçalho do down (linha 48) e na pendência `P-SAN3-02-DOWN-COM-COMPLEMENTAR` (linha 11443); prove que o cabeçalho do down continua NA linha `-- down`, de modo que o `downStatements()` do drill (que corta na linha que começa com `-- down`) segue devolvendo as seis sentenças do down e nada do comentário; e prove que o drill sobe as próprias bases e as apaga (0 base do prefixo dele depois da suíte, inclusive com um caso forçado a falhar). Vermelho-controle: uma cópia do down com o cabeçalho partido em duas linhas faz o `downStatements()` devolver texto de comentário (ou o drill acusar); uma cópia do down sem a recriação do índice antigo faz a ponta A acusar (o re-up ou o índice não volta), derruba com: `grep -i -E 'Item 3|ponta A|ponta B|ON_ERROR_STOP|single-transaction|23505|R2|DOWN-COM-COMPLEMENTAR|downStatements|-- down|0 base|vermelho' C:/Users/AMP/w-san3-02/agent-orchestration/omega/juntas/votos/B-SAN3-02-ciclo2/c2-evidencia.md`

Protocolo P1/P2/P3/P4/P7 do §C7.7, verbatim no bloco colado acima, com `<cadeira>` = `c2`: evidência em `c2-evidencia.md` após CADA item; `c2-voto.json` nasce esqueleto com os três itens EM APURAÇÃO e o campo `arquivos_medidos`, cada item gravado ao ser medido, e fecha antes da mensagem final de 1 linha; sucessor de identidade nova re-executa os comandos registrados e só então mede a cauda; três itens exatos; PAUSA grava head, feito, falta, próximo comando e arquivos meio-escritos e para. Queda vai a `00-quedas.md` deste diretório (P6, pelo orquestrador); no máximo 2 jurados em paralelo (P5). Guarde fora do worktree, numa pasta sua em `C:/Users/AMP/erp-pausa-2026-10-03/`, os scripts e as sondas que a sua evidência cita, para que ela seja re-executável. Únicos outputs no repositório: `c2-evidencia.md` e `c2-voto.json` em `C:/Users/AMP/w-san3-02/agent-orchestration/omega/juntas/votos/B-SAN3-02-ciclo2/`; nunca commit, derruba com: `test -f C:/Users/AMP/w-san3-02/agent-orchestration/omega/juntas/votos/B-SAN3-02-ciclo2/c2-voto.json`

## MEDIDO

Pré-voo deste mandato com as ferramentas copiadas, sem mudança, para a pasta própria do redator `C:/Users/AMP/erp-pausa-2026-10-03/redator-san302c2/` (o `RAIZ=C:/Users/AMP/w-san3-02` da linha 211 do `mandato-preflight.sh` vem da cópia do ciclo 1), executado com o cwd no worktree do objeto; o redator é `redator-san302c2-opus` (Claude Opus, nível menor declarado); o `sed` troca, nos AVISOs, o número da migração pelo marcador `<corrida>` e o caminho dela pelo marcador `<migracao>`, e apaga a linha de AVISO do ec 3 da ferramenta (o texto dela traz o token reservado da checagem 7, que fora da colagem seria recusado; o ec 3 está declarado na primeira unidade), medido por: `cd C:/Users/AMP/w-san3-02 && MANDATO_REFS=C:/Users/AMP/erp-pausa-2026-10-03/redator-san302c2/mandato-refs.sh bash C:/Users/AMP/erp-pausa-2026-10-03/redator-san302c2/mandato-preflight.sh C:/Users/AMP/w-san3-02/agent-orchestration/omega/juntas/votos/B-SAN3-02-ciclo2/00-mandatos/cadeira-c2.md 448 2>&1 | sed -E -e "s#prisma/migrations/2026[0-9]+_[a-z_]+/migration[.]sql#<migracao>#g" -e "s#'2026[0-9]+'#'<corrida>'#g" -e '/NAO DETERMINAVEL/d'; echo ec=${PIPESTATUS[0]}`
```
COLAGEM    l.6-21: refs do PR #448 confere com a saida atual
AVISO      corrida hex em caminho versionado nao cobrada pela checagem 4: '<corrida>' em <migracao> — l.168
AVISO      corrida hex em caminho versionado nao cobrada pela checagem 4: '<corrida>' em <migracao> — l.45
AVISO      corrida hex em caminho versionado nao cobrada pela checagem 4: '<corrida>' em <migracao> — l.49
AVISO      corrida hex em caminho versionado nao cobrada pela checagem 4: '<corrida>' em <migracao> — l.62
AVISO      corrida hex em caminho versionado nao cobrada pela checagem 4: '<corrida>' em <migracao> — l.72

PRE-VOO OK — C:/Users/AMP/w-san3-02/agent-orchestration/omega/juntas/votos/B-SAN3-02-ciclo2/00-mandatos/cadeira-c2.md
ec=0
```
