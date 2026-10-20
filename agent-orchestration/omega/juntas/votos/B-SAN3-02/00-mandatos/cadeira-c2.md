# Mandato — Cadeira C2 — B-SAN3-02 ciclo 1 (junta de DINHEIRO)

## MEDIDO

Estado do PR 448 no instante da redação, pela ferramenta `mandato-refs.sh` copiada de `origin/chore/mandato-refs-e-preflight` para a pasta própria do redator `C:/Users/AMP/erp-pausa-2026-10-03/redator-san302/` (sem adaptação), com o cwd no worktree do objeto, medido por: `cd C:/Users/AMP/w-san3-02 && bash C:/Users/AMP/erp-pausa-2026-10-03/redator-san302/mandato-refs.sh 448`
```
# refs do PR #448 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato
# gerado em: 2026-10-20T00:54Z · repo: thiagodorgo/ERP_Techsolutios

ramo:            fix/faturamento-atomico-e-delta
base:            origin/main
estado:          OPEN | rascunho=false | MERGEABLE
head do PR:      8e6a6c29b8a0aced5bf3968383aa9ef247019f46
merge-base:      2ecfb333aed0a0efcc1f171148473aad2921be66
merge commit:    <ainda nao mergeado>
check-runs:      total=14 nao-verdes=0 pendentes=0
approved_head:   AUSENTE — nenhuma ata nomeia nem menciona #448
                 (a junta nao votou, ou a ata nao esta em origin/main nem no head do PR)
```

O ramo remoto aponta para o mesmo SHA que o PR declara como head (segunda fonte do objeto), medido por: `git ls-remote origin refs/heads/fix/faturamento-atomico-e-delta`
```
8e6a6c29b8a0aced5bf3968383aa9ef247019f46	refs/heads/fix/faturamento-atomico-e-delta
```

Os 14 check-runs do objeto estão concluídos e todos `success` (zero fora de `completed success`), medido por: `gh api repos/thiagodorgo/ERP_Techsolutios/commits/8e6a6c29b8a0aced5bf3968383aa9ef247019f46/check-runs --jq '.total_count, ([.check_runs[] | select(.status != "completed" or .conclusion != "success")] | length)'`
```
14
0
```

Os commits próprios do ramo sobre a base, sem os merges, são nove, e há dois merges da `origin/main` dentro do ramo (o diff do BLOCO é sempre o da merge-base colada acima, nunca o que a `main` trouxe), medido por: `git log --no-merges --format='%ad %s' --date=short 2ecfb333aed0a0efcc1f171148473aad2921be66..8e6a6c29b8a0aced5bf3968383aa9ef247019f46 | cut -c1-50; git log --merges --format='%ad %s' --date=short 2ecfb333aed0a0efcc1f171148473aad2921be66..8e6a6c29b8a0aced5bf3968383aa9ef247019f46 | cut -c1-50`
```
2026-10-19 docs(registro): parecer do DBA (FAVORÁ
2026-10-19 docs(registro): plano v2 com as emendas
2026-10-19 test(faturamento): tornar o T-Z3 indepe
2026-10-19 docs(san3): registrar aceite v2.2 reval
2026-10-19 fix(ci): incluir suítes de faturamento
2026-10-19 docs(registro): D-SAN3-02-TITULO-COMPLE
2026-10-19 test(financeiro): suítes -db do fatura
2026-10-19 test(financeiro): faturamento atômico
2026-10-19 feat(financeiro): faturamento atômico
2026-10-19 Merge remote-tracking branch 'origin/ma
2026-10-19 Merge remote-tracking branch 'origin/ma
```

Os insumos do ciclo 1 existem no objeto (plano v2 com os anexos, v1, as três críticas, o relatório do dev e o parecer do DBA), e a revisão independente prévia existe fora do repo, medido por: `cd C:/Users/AMP/w-san3-02 && for p in docs/revisoes/SAN3/B-SAN3-02-plano.md docs/revisoes/SAN3/B-SAN3-02-plano-v1.md docs/revisoes/SAN3/B-SAN3-02-critica-r1-opus.md docs/revisoes/SAN3/B-SAN3-02-critica-r1-gemini.md docs/revisoes/SAN3/B-SAN3-02-critica-r2.md docs/revisoes/SAN3/B-SAN3-02-dev.md agent-orchestration/omega/juntas/votos/B-SAN3-02/dba-parecer.md; do git cat-file -e "8e6a6c29b8a0aced5bf3968383aa9ef247019f46:$p" && echo "PRESENTE $p"; done; test -f C:/Users/AMP/erp-pausa-2026-10-03/revisoes/B-SAN3-02-revisao-dev-cdx.md && echo "PRESENTE (fora do repo) C:/Users/AMP/erp-pausa-2026-10-03/revisoes/B-SAN3-02-revisao-dev-cdx.md"`
```
PRESENTE docs/revisoes/SAN3/B-SAN3-02-plano.md
PRESENTE docs/revisoes/SAN3/B-SAN3-02-plano-v1.md
PRESENTE docs/revisoes/SAN3/B-SAN3-02-critica-r1-opus.md
PRESENTE docs/revisoes/SAN3/B-SAN3-02-critica-r1-gemini.md
PRESENTE docs/revisoes/SAN3/B-SAN3-02-critica-r2.md
PRESENTE docs/revisoes/SAN3/B-SAN3-02-dev.md
PRESENTE agent-orchestration/omega/juntas/votos/B-SAN3-02/dba-parecer.md
PRESENTE (fora do repo) C:/Users/AMP/erp-pausa-2026-10-03/revisoes/B-SAN3-02-revisao-dev-cdx.md
```

O plano versionado no objeto traz a v2 e os três anexos (A = emenda v2.1, B = emenda v2.2 com o adendo §6 do T-Z3, C = respostas do dono Q1–Q4), medido por: `git show 8e6a6c29b8a0aced5bf3968383aa9ef247019f46:docs/revisoes/SAN3/B-SAN3-02-plano.md | tr -d '\r' | grep -n -i -E '^# ANEXO [ABC]'`
```
505:# ANEXO A — Emenda v2.1 (versionada pelo orquestrador; vale sobre a v2 onde mudar)
611:# ANEXO B — Emenda v2.2 (versionada pelo orquestrador; vale sobre a v2 e a v2.1 onde mudar)
821:# ANEXO C — Respostas do dono (Q1–Q4)
```

As decisões que esta cadeira localiza estão no objeto, com as palavras literais do dono, medido por: `git show 8e6a6c29b8a0aced5bf3968383aa9ef247019f46:agent-orchestration/controle/decisoes.md | tr -d '\r' | grep -n -i -E '^- \*\*D-Ω4-C[12] |^## (REGISTRO-SAN3-CONFLITOS|D-GOV-PROPORCIONAL)|D-SAN3-02-TITULO-COMPLEMENTAR.{0,3}\(decis|À Q4 da emenda' | cut -c1-90`
```
609:- **D-Ω4-C2 (correção do critico):** idempotência do faturamento = unique parcial 
610:- **D-Ω4-C1 (correção do critico — anti-refaturamento inter-fatia):** ao faturar,
2316:## REGISTRO-SAN3-CONFLITOS (2026-09-11) — duas pendências de dinheiro cujo consert
2940:## D-GOV-PROPORCIONAL (2026-10-04) — junta proporcional, teto de 2 ciclos, menos bu
3765:- **`D-SAN3-02-TITULO-COMPLEMENTAR` (decisão do dono, 2026-10-19).** ***"sim para tu
3791:  - **(A) Palavras do dono.** Às Q1, Q2 e Q3 do plano: ***"sim para tudo"***. À Q4
```

Os três corpos das cadeiras existem no objeto e, descontados o frontmatter e o bloco de adaptação Codex do espelho, são IDÊNTICOS entre `.claude/agents/especialistas/` e `.agents/agents/especialistas/` (comparação EOL-neutra; o arquivo inteiro DIFERE por construção do espelho, e por isso não se publica hash), medido por: `cd C:/Users/AMP/w-san3-02 && for c in c1-atomicidade-e-corrida c2-complementar-e-indice c3-regressao-e-contrato; do diff <(git show "8e6a6c29b8a0aced5bf3968383aa9ef247019f46:.claude/agents/especialistas/jurado-san302-$c.md" | tr -d '\r' | awk 'f; $0=="---"{n++; if(n==2) f=1}' | sed '/^$/d') <(git show "8e6a6c29b8a0aced5bf3968383aa9ef247019f46:.agents/agents/especialistas/jurado-san302-$c.md" | tr -d '\r' | awk 'f; $0=="---"{n++; if(n==2) f=1}' | awk 'index($0,"Papel para o Codex"){s=1} s&&$0==""{s=0; next} !s' | sed '/^$/d') >/dev/null && echo "IDENTICO corpo $c" || echo "DIVERGE corpo $c"; done`
```
IDENTICO corpo c1-atomicidade-e-corrida
IDENTICO corpo c2-complementar-e-indice
IDENTICO corpo c3-regressao-e-contrato
```

O S0 executado num worktree descartável no objeto está verde, medido por: `cd C:/Users/AMP/w-san3-02 && git worktree add --detach C:/Users/AMP/w-rsan302-s0 8e6a6c29b8a0aced5bf3968383aa9ef247019f46 >/dev/null 2>&1; node C:/Users/AMP/w-rsan302-s0/scripts/sync-agent-agents.mjs --check; echo ec=$?; git worktree remove --force C:/Users/AMP/w-rsan302-s0`
```
[agents-sync] OK — 73 agentes, espelho consistente.
ec=0
```

A ferramenta de banco descartável nomeia contêineres e rede por um ID fixo `tl<epoch><pid>` e não aceita prefixo, medido por: `grep -n -i -o 'ID="tl[^"]*"' C:/Users/AMP/erp-pausa-2026-10-03/ferramentas/teste-linux.sh`
```
7:ID="tl$(date +%s)$$"
```

No ramo, o único commit próprio que tocou `prisma/` e `src/` é o de produto; o parecer do DBA mediu um merge anterior do ramo, com a mesma migração, e o que você usar dele se re-mede no objeto, medido por: `git log --format='%ad %s' --date=short 2ecfb333aed0a0efcc1f171148473aad2921be66..8e6a6c29b8a0aced5bf3968383aa9ef247019f46 -- prisma/ src/ | cut -c1-50`
```
2026-10-19 feat(financeiro): faturamento atômico
```

As sentenças ativas da migração do bloco no objeto, na forma que o dono autorizou na Q4 (coluna, índice auxiliar, FK de 4 colunas RESTRICT, CHECK, índice parcial de originais e, por último, a saída do índice antigo), medido por: `git show 8e6a6c29b8a0aced5bf3968383aa9ef247019f46:prisma/migrations/20260878000000_invoice_complementary_title/migration.sql | tr -d '\r' | sed -n '8p;11,12p;15,18p;22,24p;28,30p;33p'`
```
ALTER TABLE "financial_titles" ADD COLUMN "parent_title_id" UUID;
CREATE UNIQUE INDEX "financial_titles_tenant_wo_direction_id_key"
  ON "financial_titles" ("tenant_id", "work_order_id", "direction", "id");
ALTER TABLE "financial_titles"
  ADD CONSTRAINT "financial_titles_parent_title_fkey"
  FOREIGN KEY ("tenant_id", "work_order_id", "direction", "parent_title_id")
  REFERENCES "financial_titles" ("tenant_id", "work_order_id", "direction", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "financial_titles"
  ADD CONSTRAINT "financial_titles_parent_requires_work_order_check"
  CHECK ("parent_title_id" IS NULL OR ("work_order_id" IS NOT NULL AND "parent_title_id" <> "id"));
CREATE UNIQUE INDEX "financial_titles_wo_direction_original_active_key"
  ON "financial_titles" ("tenant_id", "work_order_id", "direction")
  WHERE "deleted_at" IS NULL AND "work_order_id" IS NOT NULL AND "parent_title_id" IS NULL;
DROP INDEX IF EXISTS "financial_titles_wo_direction_active_key";
```

DIVERGÊNCIA corpo × plano (registrada pelo §A2, não consolidada em silêncio): a linha 82 do seu corpo descreve a FK de 2 colunas, que a Q4 do dono substituiu pela de 4 colunas colada acima; a linha 86 do seu corpo pede `migrate diff` com `--shadow-database-url` saindo vazio, critério que o Anexo A (ajuste B4) e o Anexo B (§1 e §3) mediram como impossível neste repositório e no Prisma instalado, e que o Anexo B substituiu pelo delta de drift de exatamente uma sentença, medido por: `git show 8e6a6c29b8a0aced5bf3968383aa9ef247019f46:.claude/agents/especialistas/jurado-san302-c2-complementar-e-indice.md | tr -d '\r' | grep -n -i -o -E 'shadow-database-url .{0,20}sai vazio|FK composta .\(tenant_id, parent_title_id\) → financial_titles\(tenant_id, id\).'; git show 8e6a6c29b8a0aced5bf3968383aa9ef247019f46:docs/revisoes/SAN3/B-SAN3-02-plano.md | tr -d '\r' | grep -n -i -o -E 'O delta tem de ser \*\*exatamente uma sentença, só no head\*\*|não há .--shadow-database-url. em 7.8.0'`
```
82:FK composta `(tenant_id, parent_title_id) → financial_titles(tenant_id, id)`
86:shadow-database-url <base própria>` sai vazio
710:O delta tem de ser **exatamente uma sentença, só no head**
728:não há `--shadow-database-url` em 7.8.0
```

A ressalva R2 do DBA (o down só para na ponta B se invocado com `ON_ERROR_STOP`) foi apensada à pendência `P-SAN3-02-DOWN-COM-COMPLEMENTAR` no objeto, medido por: `git show 8e6a6c29b8a0aced5bf3968383aa9ef247019f46:agent-orchestration/controle/pendencias.md | tr -d '\r' | grep -n -i -o -E '.{0,40}ON_ERROR_STOP=1 --single-transaction.{0,20}'`
```
11404: para na ponta B se rodar como `psql -v ON_ERROR_STOP=1 --single-transaction -f <down>`. Num `ps
```

O modelo de mandato do §C7.7 do contrato (P1, P2, P4, P3, P7), verbatim no objeto, medido por: `git show 8e6a6c29b8a0aced5bf3968383aa9ef247019f46:CLAUDE.md | tr -d '\r' | sed -n '708,715p'`
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

Você é `jurado-san302-c2-opus`, identidade nova, executor Claude Code, modelo Claude Opus, nível menor declarado (§C7.6); o seu corpo canônico é `.claude/agents/especialistas/jurado-san302-c2-complementar-e-indice.md` (o §9 do plano previa a identidade `jurado-san302-c2-banco-migracao`; a de fato é esta, nomeada pelo orquestrador). Na primeira linha de `c2-evidencia.md`, declare executor efetivo, modelo, nível, objeto, `mandato_md5` deste arquivo e o veredito IDENTICO/DIVERGE do corpo que você carregou contra o blob do objeto, EOL-neutro (nunca `md5sum` cru sob `core.autocrlf=true`). Opus esgotado: PARE sem votar e registre onde parou (§C7.6-bis). Se o seu nome coincidir com algum inelegível do mandato do inspetor, pare. O plano v2 com os Anexos A, B e C, as críticas, o relatório do dev, a revisão independente fora do repo e o parecer do DBA (`dba-san302-opus`, FAVORÁVEL COM RESSALVA) são **A RE-VERIFICAR**: o parecer é insumo, você mede no seu terreno o que usar dele e nomeia no voto, no campo `dba_guardiao`, cada convergência e cada divergência (§A2), derruba com: `head -1 C:/Users/AMP/w-san3-02/agent-orchestration/omega/juntas/votos/B-SAN3-02/c2-evidencia.md | grep -i -E 'executor|modelo|mandato_md5|IDENTICO|DIVERGE'`

A legalidade vem antes do mérito: parecer `insp-san302-parecer.md` do inspetor `inspetor-san302-opus` com LIBERADO ou LIBERADO COM RESSALVA nomeando você, seu executor, seu worktree e seu terreno de banco; o objeto continua sendo o head do PR 448 colado acima, com 14 de 14 check-runs concluídos (head que andou bloqueia o início). Régua: bloco de DINHEIRO, unanimidade de 3 com veto (§C7 item 8(1), §C7.1-ter(b)); ciclo 1, logo todo `bloqueia` com escopo `dentro-do-bloco` reprova, grave ou não (§C7 item 8(2)); migração destrutiva é parada irredutível (§C7.5), não voto. Todo achado declara gravidade, classe, escopo, N e forma; `pre-existente` exige evidência de origem ou data e pendência com dono (§C7.1-ter(a)) e não reprova; escopo sem evidência conta como `dentro-do-bloco`; "não consigo medir" item seu é REPROVADO; não proponha correção (§C7.4-bis), não reabra a decisão do dono (Q1–Q4) sem efeito novo, não cobre KPI nem matéria de C1 ou C3, e não leia votos alheios desta junta, derruba com: `grep -i -E 'legalidade|A RE-VERIFICAR|gravidade|classe|escopo|dba_guardiao' C:/Users/AMP/w-san3-02/agent-orchestration/omega/juntas/votos/B-SAN3-02/c2-voto.json`

Terreno: worktree exclusivo prefixado `C:/Users/AMP/w-jsan302-c2-`, no objeto, com `npm ci` próprio e zero junction de `node_modules` (§C7.1-ter(c)), removido só por `git worktree remove --force` depois de conferir que nenhum processo o usa. Banco: Postgres 16 DESCARTÁVEL por `bash C:/Users/AMP/erp-pausa-2026-10-03/ferramentas/teste-linux.sh <seu-worktree> '<comando>'`; a ferramenta nomeia os seus contêineres e rede `tl<epoch><pid>` (medido acima), e você registra esse ID na evidência como seu; as bases do drill são `CREATE DATABASE jsan302_c2_<caso>` dentro do SEU cluster, apagadas no `finally`, com 0 bases desse prefixo provado no fim; todo contêiner ou rede que você criar fora da ferramenta leva o prefixo `jsan302-c2-`. Antes de subir, conte os trabalhos Docker alheios excluindo `erp-*` (no máximo 2 na máquina contando o seu) e meça a memória de commit livre (no mínimo 3 GB); faltando qualquer um, espere. Nunca a base viva (`erp-postgres`, `erp-redis`) nem as portas 5432, 6379, 3000, 5173, 5050 e 8899; nunca `prune` nem contêiner alheio. Mutação no SQL da migração, no `prisma/schema.prisma` ou em `src/` só no seu worktree, uma por vez, com âncora única e prova de aplicação (CRLF incluso), restauro provado por `git hash-object <arquivo>` igual a `git rev-parse <objeto>:<arquivo>`; teardown só do que é seu, derruba com: `grep -i -E 'w-jsan302-c2-|jsan302_c2_|jsan302-c2-|tl[0-9]|junction|erp-|commit livre|5432|6379|3000|5173|5050|8899|hash-object|teardown' C:/Users/AMP/w-san3-02/agent-orchestration/omega/juntas/votos/B-SAN3-02/c2-evidencia.md`

Item 1 de 3 (a migração; item 1 do seu corpo, com a forma da Q4 e o critério de drift do Anexo B §3): prove por execução em bases próprias que `prisma/migrations/20260878000000_invoice_complementary_title/migration.sql` é aditiva (classificação de cada sentença por script; o único DROP é o do índice antigo, DEPOIS do novo; sem `CONCURRENTLY`), que `prisma/migrations/20260811000000_add_invoicing/migration.sql` é byte-idêntica à base e que o `prisma/schema.prisma` mudou só no modelo `FinancialTitle`; fixture legada antes do deploy com dados preservados; catálogo na forma da Q4 colada acima (FK de 4 colunas com `confdeltype = 'r'`, CHECK, índice auxiliar, índice de originais com o predicado exato, antigo ausente, RLS e policies iguais às de antes); 2º deploy sem pendência e deploy com falha injetada numa cópia deixando o catálogo inteiro (transação única); o delta de drift do Anexo B §3, base na merge-base com o schema da base e base no objeto com o schema do objeto, que tem de ser EXATAMENTE `ALTER TABLE "financial_titles" DROP CONSTRAINT "financial_titles_parent_title_fkey"`, com o controle do mecanismo (0 `DROP INDEX` de índice parcial no diff da base) — o "diff vazio" da linha 86 do seu corpo é critério impossível e cobrá-lo é reprovação por construção; T-D(a) a T-D(e) 5 de 5; rollback ponta A (up, down, re-up, sem perda) e ponta B (com complementar ativo, para em `23505` sem remover objeto) com `psql -v ON_ERROR_STOP=1`, e a R2 do DBA re-medida (o mesmo down SEM `ON_ERROR_STOP` termina com ec 0 e derruba coluna e backstop) julgada contra o que o objeto escreve no comentário do down e na pendência `P-SAN3-02-DOWN-COM-COMPLEMENTAR`. Vermelho-controle: M27 e M27b vermelhas pelo delta; M28 vermelha em T-D(c) pelo `23514` ausente; M11b vermelha (a M11 na 1ª forma é equivalente, declarado pelo dev, e você confere a equivalência); M22 vermelha em T-D(a) e T-D(e); o leitor de catálogo acusa um índice fabricado sem `parent_title_id IS NULL` e uma FK fabricada sem tenant; o classificador acusa `DROP COLUMN` e `UPDATE` fabricados, derruba com: `grep -i -E 'Item 1|aditiva|CONCURRENTLY|FinancialTitle|confdeltype|predicado|drift|DROP CONSTRAINT|T-D|ponta A|ponta B|ON_ERROR_STOP|R2|M27|M27b|M28|M11b|M22|vermelho|hash-object' C:/Users/AMP/w-san3-02/agent-orchestration/omega/juntas/votos/B-SAN3-02/c2-evidencia.md`

Item 2 de 3 (o complementar e o índice de originais, K3 e K4 do plano §7.3 e §7.4; item 2 do seu corpo): prove por execução, sob o papel efêmero `NOSUPERUSER NOBYPASSRLS` com os atributos lidos pela própria conexão, T-C1 e T-C1d (T2 com `parent_title_id` igual a T1, só o delta, T1 byte-igual no banco), T-C2 (3º delta aponta para T1, nunca T2), T-C3 (original pago intacto) e T-C6 (sem `23505` com dois complementares); refaturar o carimbado recusado nas três portas (replay 409 `already_invoiced`; T-K4b com `count` 0; INSERT cru de 2º original com `23505` em T-C5-db, como dono do schema e como o papel de runtime, e a mesma colisão pela rota como 409 `already_invoiced` em T-A4b); corrida de dois originais, N de pelo menos 10, sempre 1 original ativo; e, depois do cancelamento, (a) a remoção lógica (T-C4, T-C9a, T-C9b, T-C9d) e (b) o cancelamento por status (T-C10: 201 complementar com pai `cancelled`, comportamento declarado no §3 D3 do plano com a pendência `P-SAN3-02-PAI-CANCELADO`), julgado pelo efeito em dinheiro contra a `D-SAN3-02-TITULO-COMPLEMENTAR` e a `D-Ω4-C1`, com escopo provado por data ou origem. Vermelho-controle: M5, M5b, M6, M7, M15 e M21, uma por vez, cada uma vermelha no caso que a cita; irmão positivo: o mesmo INSERT cru com pai válido é aceito, derruba com: `grep -i -E 'Item 2|T-C1|T-C1d|T-C2|T-C3|T-C6|T-K4b|T-C5-db|T-A4b|T-C4|T-C9|T-C10|cancelled|PAI-CANCELADO|M5|M5b|M6|M7|M15|M21|irmão positivo|vermelho' C:/Users/AMP/w-san3-02/agent-orchestration/omega/juntas/votos/B-SAN3-02/c2-evidencia.md`

Item 3 de 3 (o `parent_title_id` não atravessa OS, direção nem organização; item 3 do seu corpo, com a FK de 4 colunas da Q4): prove por execução, nas DUAS portas (banco, por INSERT ou UPDATE cru como dono e como o papel de runtime; aplicação, por rota e serviço), e publique para cada caso onde mora a garantia (banco, serviço ou nenhuma): pai de outra organização, de outra OS, de outra direção e avulso dão `23503` (T-D(e)); pai igual a si mesmo e complementar sem OS dão `23514`; pai que é complementar, removido, de outra OS ou de outra direção dão 400 `invalid_parent_title_reference` no serviço (T-C11, 4 subcasos, nada criado); `POST /financial-titles` com `parent_title_id` no corpo nasce com `parent_title_id` NULL; leitura cruzada, com dois tenants, em que o complementar de A é invisível a B (T-RLS). Vínculo que só um INSERT cru como dono grava e nenhuma porta da aplicação grava é residual de banco, publicado com N, forma e porta, sem reprovar sozinho. Vermelho-controle: uma cópia da migração com a FK simples aceita o caso de outra organização como dono; uma cópia do `create` público que repassa o pai faz o caso `POST` acusar; M26 vermelha em T-C11; irmão positivo com pai válido aceito nas duas portas, derruba com: `grep -i -E 'Item 3|23503|23514|invalid_parent_title_reference|T-D\(e\)|T-C11|T-RLS|POST /financial-titles|duas portas|residual|M26|irmão positivo|vermelho' C:/Users/AMP/w-san3-02/agent-orchestration/omega/juntas/votos/B-SAN3-02/c2-evidencia.md`

Protocolo P1/P2/P3/P4/P7 do §C7.7, verbatim no bloco colado acima, com `<cadeira>` = `c2`: evidência em `c2-evidencia.md` após CADA item; `c2-voto.json` nasce esqueleto com os três itens EM APURAÇÃO, cada item gravado ao ser medido, e fecha antes da mensagem final de 1 linha; sucessor de identidade nova re-executa os comandos registrados e só então mede a cauda; três itens exatos; PAUSA grava head, feito, falta, próximo comando e arquivos meio-escritos e para. Queda vai a `00-quedas.md` do mesmo diretório (P6, pelo orquestrador); no máximo 2 jurados em paralelo (P5). Únicos outputs: `c2-evidencia.md` e `c2-voto.json` em `C:/Users/AMP/w-san3-02/agent-orchestration/omega/juntas/votos/B-SAN3-02/`; nunca commit, derruba com: `test -f C:/Users/AMP/w-san3-02/agent-orchestration/omega/juntas/votos/B-SAN3-02/c2-voto.json`

## MEDIDO

Pré-voo deste mandato com as ferramentas copiadas de `origin/chore/mandato-refs-e-preflight` para a pasta própria do redator `C:/Users/AMP/erp-pausa-2026-10-03/redator-san302/`, com a única adaptação funcional `RAIZ=C:/Users/AMP/w-san3-02` no `mandato-preflight.sh` (linha 211), executado com o cwd no worktree do objeto; o redator é `redator-san302-opus` (Claude Opus, nível menor declarado); o `sed` só troca, nos AVISOs, o número da migração pelo marcador `<corrida>` e o caminho dela pelo marcador `<migracao>`, para que a própria colagem não gere AVISO novo (os caminhos são os do bloco acima), medido por: `cd C:/Users/AMP/w-san3-02 && MANDATO_REFS=C:/Users/AMP/erp-pausa-2026-10-03/redator-san302/mandato-refs.sh bash C:/Users/AMP/erp-pausa-2026-10-03/redator-san302/mandato-preflight.sh C:/Users/AMP/w-san3-02/agent-orchestration/omega/juntas/votos/B-SAN3-02/00-mandatos/cadeira-c2.md 448 2>&1 | sed -E -e "s#prisma/migrations/2026[0-9]+_[a-z_]+/migration[.]sql#<migracao>#g" -e "s#'2026[0-9]+'#'<corrida>'#g"; echo ec=${PIPESTATUS[0]}`
```
COLAGEM    l.6-19: refs do PR #448 confere com a saida atual
AVISO      corrida hex em caminho versionado nao cobrada pela checagem 4: '<corrida>' em <migracao> — l.150
AVISO      corrida hex em caminho versionado nao cobrada pela checagem 4: '<corrida>' em <migracao> — l.150
AVISO      corrida hex em caminho versionado nao cobrada pela checagem 4: '<corrida>' em <migracao> — l.99

PRE-VOO OK — C:/Users/AMP/w-san3-02/agent-orchestration/omega/juntas/votos/B-SAN3-02/00-mandatos/cadeira-c2.md
ec=0
```
