# Mandato — Cadeira C3 — B-SAN3-02 ciclo 1 (junta de DINHEIRO)

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

O diff do BLOCO (merge-base colada acima contra o objeto) tem 38 caminhos; o `ci.yml` ganhou só as duas linhas `SUITES` das suítes novas; `RBAC_MATRIX.md` mudou 1 linha por 1; a migração `prisma/migrations/20260811000000_add_invoicing/migration.sql` e `Kpis` não aparecem no numstat, medido por: `git diff --name-status 2ecfb333aed0a0efcc1f171148473aad2921be66 8e6a6c29b8a0aced5bf3968383aa9ef247019f46 | wc -l; git diff 2ecfb333aed0a0efcc1f171148473aad2921be66 8e6a6c29b8a0aced5bf3968383aa9ef247019f46 -- .github/workflows/ci.yml | tr -d '\r' | grep -i -E '^[+-][^+-]'; git diff --numstat 2ecfb333aed0a0efcc1f171148473aad2921be66 8e6a6c29b8a0aced5bf3968383aa9ef247019f46 -- RBAC_MATRIX.md prisma/migrations/20260811000000_add_invoicing/migration.sql Kpis`
```
38
+          SUITES="$SUITES tests/work-order-invoicing-atomic-db.test.ts"
+          SUITES="$SUITES tests/work-order-invoicing-migration-drill-db.test.ts"
1	1	RBAC_MATRIX.md
```

O arquivo `tests/traccar-dev-topology.test.ts`, de onde vêm as 9 falhas que o relatório do dev atribui ao ambiente do contêiner (sem o binário `docker`), nasceu antes do bloco e não está no diff do bloco, medido por: `git log --diff-filter=A --format='%ad %s' --date=short 8e6a6c29b8a0aced5bf3968383aa9ef247019f46 -- tests/traccar-dev-topology.test.ts | cut -c1-50; git diff --name-only 2ecfb333aed0a0efcc1f171148473aad2921be66 8e6a6c29b8a0aced5bf3968383aa9ef247019f46 -- tests/traccar-dev-topology.test.ts | wc -l`
```
2026-10-18 feat(traccar): a primeira posição do
0
```

DIVERGÊNCIA corpo × plano (registrada pelo §A2, não consolidada em silêncio): a linha 110 do seu corpo cobra "18 mutações (M1…M16)", e o plano no objeto (Anexo B §5, linha 734) fixa 30, com a M16 retirada na v2; a linha 148 do seu corpo admite uma mudança de precedência declarada como `P-SAN3-02-PRECEDENCIA-PERIOD-CLOSED`, e o plano v2 (resposta ao A8, linha 21) fixa a precedência IDÊNTICA à de hoje, sem essa pendência no objeto (0 ocorrências); a linha 35 do seu corpo nomeia o executor como Claude Opus ou Codex `gpt-5.6-sol`, e o executor desta cadeira é outro (ver a unidade seguinte), medido por: `git show 8e6a6c29b8a0aced5bf3968383aa9ef247019f46:.claude/agents/especialistas/jurado-san302-c3-regressao-e-contrato.md | tr -d '\r' | grep -n -i -o -E 'as 18 mutações do §7.5 \(M1…M16\)|P-SAN3-02-PRECEDENCIA-PERIOD-CLOSED|Claude Opus, ou Codex .gpt-5.6-sol.'; git show 8e6a6c29b8a0aced5bf3968383aa9ef247019f46:docs/revisoes/SAN3/B-SAN3-02-plano.md | tr -d '\r' | grep -n -i -o -E '\| \*\*30\*\* = 28 \+ \*\*M27b\*\* \+ \*\*M28\*\*|A precedência fica \*\*idêntica\*\* à de hoje'; git show 8e6a6c29b8a0aced5bf3968383aa9ef247019f46:agent-orchestration/controle/pendencias.md | tr -d '\r' | grep -c -i 'P-SAN3-02-PRECEDENCIA'`
```
35:Claude Opus, ou Codex `gpt-5.6-sol`
110:as 18 mutações do §7.5 (M1…M16)
148:P-SAN3-02-PRECEDENCIA-PERIOD-CLOSED
21:A precedência fica **idêntica** à de hoje
734:| **30** = 28 + **M27b** + **M28**
0
```

O Gemini 4 Argon é tratado no nível menor por LEITURA DO ORQUESTRADOR declarada, não por equivalência dita pelo dono; o Gemini Flash fica abaixo do nível menor; e o Gemini nunca é revisor único, medido por: `git show 8e6a6c29b8a0aced5bf3968383aa9ef247019f46:agent-orchestration/controle/decisoes.md | tr -d '\r' | grep -n -i -o -E 'D-GEMINI-ARGON-USO. \(16/10, manhã\)|o Argon foi tratado no nível menor do contrato'; git show 8e6a6c29b8a0aced5bf3968383aa9ef247019f46:CLAUDE.md | tr -d '\r' | grep -n -i -o -E 'Gemini Flash\*\* fica abaixo do nível menor|Gemini nunca revisor único'`
```
3692:D-GEMINI-ARGON-USO` (16/10, manhã)
3692:o Argon foi tratado no nível menor do contrato
566:Gemini Flash** fica abaixo do nível menor
576:Gemini nunca revisor único
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

Você é `jurado-san302-c3-argon`, identidade nova, executor Gemini CLI, modelo Gemini 4 Argon pela API do Gemini, no nível menor por leitura do orquestrador declarada (`D-GEMINI-ARGON-USO`, medida acima), e NÃO no executor que a linha 35 do seu corpo nomeia (divergência registrada acima); você é uma de três cadeiras, com duas em Claude Opus, logo não é revisor único. O seu corpo canônico é `.claude/agents/especialistas/jurado-san302-c3-regressao-e-contrato.md` (o §9 do plano previa a identidade `jurado-san302-c3-regressao`; a de fato é esta). Na primeira linha de `c3-evidencia.md`, declare executor efetivo, modelo efetivo que a API respondeu, nível, objeto, `mandato_md5` deste arquivo e o veredito IDENTICO/DIVERGE do corpo que você carregou contra o blob do objeto, EOL-neutro (nunca `md5sum` cru sob `core.autocrlf=true`). Argon esgotado ou indisponível: PARE sem votar, grave o estado como na PAUSA e registre onde parou; nunca troque para outro modelo (o Gemini Flash fica abaixo do nível menor), e o orquestrador nomeia sucessor de identidade nova (P3). Se o seu nome coincidir com algum inelegível do mandato do inspetor, pare. O plano v2 com os Anexos A, B e C, as críticas, o relatório do dev, o parecer do DBA e a revisão independente fora do repo são **A RE-VERIFICAR**, nunca fato herdado; não herde contagem de ninguém, derruba com: `head -1 C:/Users/AMP/w-san3-02/agent-orchestration/omega/juntas/votos/B-SAN3-02/c3-evidencia.md | grep -i -E 'executor|Argon|modelo|mandato_md5|IDENTICO|DIVERGE'`

A legalidade vem antes do mérito: parecer `insp-san302-parecer.md` do inspetor `inspetor-san302-opus` com LIBERADO ou LIBERADO COM RESSALVA nomeando você, seu executor, seus dois worktrees e seu terreno de banco; o objeto continua sendo o head do PR 448 colado acima, com 14 de 14 check-runs concluídos, e você resolve o objeto de novo no fim e declara se andou. Régua: bloco de DINHEIRO, unanimidade de 3 com veto (§C7 item 8(1), §C7.1-ter(b)); ciclo 1, logo todo `bloqueia` com escopo `dentro-do-bloco` reprova, grave ou não (§C7 item 8(2)). Todo achado declara gravidade, classe, escopo, N e forma; `pre-existente` exige evidência de origem ou data e pendência com dono (§C7.1-ter(a)) e não reprova; escopo sem evidência conta como `dentro-do-bloco`; "não consigo medir" item seu é REPROVADO; não proponha correção (§C7.4-bis); não cobre KPI nem `Kpis/*` (congelado, `D-GOV-PROPORCIONAL` (5)), nem a ata antes do voto, nem tela (`SAN3-25`), nem matéria de C1 ou C2; não leia o merge da `main` como diff do bloco; não leia votos alheios desta junta, derruba com: `grep -i -E 'legalidade|A RE-VERIFICAR|gravidade|classe|escopo' C:/Users/AMP/w-san3-02/agent-orchestration/omega/juntas/votos/B-SAN3-02/c3-voto.json`

Terreno: dois worktrees exclusivos, `C:/Users/AMP/w-jsan302-c3-<sufixo>` no objeto e `C:/Users/AMP/w-jsan302-c3b-<sufixo>` na merge-base colada acima, cada um com `npm ci` próprio e zero junction de `node_modules` (§C7.1-ter(c)), removidos só por `git worktree remove --force` depois de conferir que nenhum processo os usa. Memória por padrão; para a suíte inteira e os `-db`, Postgres 16 DESCARTÁVEL por `bash C:/Users/AMP/erp-pausa-2026-10-03/ferramentas/teste-linux.sh <seu-worktree> '<comando>'` (sem comando, ela roda `npm test` na forma do job `backend`); a ferramenta nomeia os seus contêineres e rede `tl<epoch><pid>` (medido acima), e você registra esse ID na evidência como seu; todo contêiner, rede ou base que você criar fora da ferramenta leva o prefixo `jsan302-c3-`. Antes de subir, conte os trabalhos Docker alheios excluindo `erp-*` (no máximo 2 na máquina contando o seu) e meça a memória de commit livre (no mínimo 3 GB); faltando qualquer um, espere. Nunca a base viva (`erp-postgres`, `erp-redis`) nem as portas 5432, 6379, 3000, 5173, 5050 e 8899; nunca `prune` nem contêiner alheio. Conteúdo se compara por `git show` ou `git hash-object`, nunca por `git archive` com `tar` sob `core.autocrlf=true`; mutação só no seu worktree, uma por vez, restauro provado por `git hash-object <arquivo>` igual a `git rev-parse <objeto>:<arquivo>`; teardown só do que é seu, derruba com: `grep -i -E 'w-jsan302-c3-|w-jsan302-c3b-|jsan302-c3-|tl[0-9]|junction|erp-|commit livre|5432|6379|3000|5173|5050|8899|hash-object|teardown' C:/Users/AMP/w-san3-02/agent-orchestration/omega/juntas/votos/B-SAN3-02/c3-evidencia.md`

Item 1 de 3 (regressão por nome, suíte inteira e CI; item 1 do seu corpo): prove por execução que todo NOME de teste da base em `tests/work-order-invoicing.test.ts` e `tests/work-order-financials.test.ts` (N medido por parser do TAP na base; o plano espera 16 e 31) existe e passa no objeto, e o mesmo para as regressões do financeiro do plano §7.6 passo 4, em memória e `-db`, com toda asserção enfraquecida comparada hunk a hunk; `npm run check`, `npm run lint`, `npm run build` e `npm test` na forma do job `backend` do `.github/workflows/ci.yml` do objeto, com fail 0 e skipped até 2 nomeados — e, se reaparecerem as 9 falhas de `tests/traccar-dev-topology.test.ts` que o dev atribui ao contêiner sem `docker`, só as classifique como `pre-existente` de ambiente com a origem colada acima E a mesma suíte verde fora do contêiner ou no log do job `backend` da CI do objeto; `tests/work-order-invoicing-atomic-db.test.ts` e `tests/work-order-invoicing-migration-drill-db.test.ts` 3 vezes seguidas cada, mesmo `# tests`, 0 skip, 0 fail; e, nos logs do job `backend-postgres` do objeto, as duas suítes novas EXECUTADAS com casos (por nome no TAP) e o guard de zero skip verde, comparando com os check-runs da base (o achado 1 da revisão independente é A RE-VERIFICAR contra o commit "incluir suítes de faturamento no postgres"). Vermelho-controle: o parser conta um `not ok` e um `# SKIP` a mais num TAP copiado; o comparador de nomes acusa uma remoção e um renome sem par fabricados; as duas suítes novas contra o `src/` da base (cópia, hashes provados) ficam vermelhas em pelo menos um caso que o plano diz que prendem, derruba com: `grep -i -E 'Item 1|por nome|16|31|npm test|skipped|traccar-dev-topology|atomic-db|migration-drill-db|backend-postgres|check-runs|parser|vermelho|hash-object' C:/Users/AMP/w-san3-02/agent-orchestration/omega/juntas/votos/B-SAN3-02/c3-evidencia.md`

Item 2 de 3 (escopo, registro, espelho e mutações; item 2 do seu corpo): prove por execução a tabela arquivo, permitido ou registro ou fora, efeito, de `git diff --name-status` da merge-base contra o objeto, classificada contra a lista PERMITIDA EXTRAÍDA do §6.1 do plano no objeto (não copiada daqui): a ampliação da Q3 só nos três arquivos de `src/modules/financial-uow/` com o repositório de itens no contexto, a da Q2 e Q4 só no modelo `FinancialTitle` e numa migração nova, o `.github/workflows/ci.yml` só nas linhas `SUITES` do `backend-postgres` (colado acima), o `RBAC_MATRIX.md` só na frase da linha 122, e cada hunk de teste justificado pelo §6.1; o PROIBIDO do §6.2 e do §C4 vazio; registro APPEND, com 0 linhas removidas em `agent-orchestration/controle/` (inclusive `pendencias-indice.md`, que o diff modifica), a `D-SAN3-02-TITULO-COMPLEMENTAR` com (A) as palavras do dono e (B) a derivação aprovada na Q4, e nenhuma das três pendências `P-Ω4-3-INVOICE-ATOMIC`, `P-Ω4-3-INVOICE-TOCTOU-DELETE` e `P-Ω4-3-REFATURAR-DELTA` dada como FECHADA sem o teste que a fecha; `node scripts/sync-agent-agents.mjs --check` verde com N no objeto; e as mutações do relatório do dev contra as 30 do Anexo B §5 (não as 18 da linha 110 do seu corpo, divergência medida acima), com a M11 pela forma M11b e a M19 pelo T-Z3 plano-independente, reexecutando por conta própria uma amostra de 2 que você escolhe e declara. Vermelho-controle: o classificador acusa uma lista fabricada com `src/database/rls.ts`, `Kpis/kpis-latest.json`, uma 2ª migração e uma linha removida de `agent-orchestration/controle/pendencias.md`; cada `git diff --quiet` com ec 0 usado como prova tem o irmão com ec 1 num caminho sabidamente alterado; o check de espelho acusa uma cópia deliberadamente diferente numa árvore descartável, derruba com: `grep -i -E 'Item 2|PERMITIDO|PROIBIDO|financial-uow|FinancialTitle|SUITES|RBAC_MATRIX|APPEND|pendencias-indice|D-SAN3-02-TITULO-COMPLEMENTAR|FECHADA|sync-agent-agents|30|amostra|vermelho' C:/Users/AMP/w-san3-02/agent-orchestration/omega/juntas/votos/B-SAN3-02/c3-evidencia.md`

Item 3 de 3 (o contrato não muda para quem já usa; item 3 do seu corpo, com a precedência do plano v2): prove por execução, com uma sonda PRÓPRIA de rota pelo app real em memória rodada na base E no objeto, a tabela caso, código, `reason` e conjunto de chaves do corpo, para 1º faturamento, replay sem delta (409 `already_invoiced`), OS sem itens e título removido com itens carimbados (422 `nothing_to_invoice`), competência fechada com itens (422 `period_closed`), OS de outra organização (404 `work_order_not_found`, nada vaza), OS cancelada (422 `work_order_cancelled`), `due_date` inválida (400 `invalid_due_date`), item depois do 1º faturamento (201 complementar no objeto, 409 na base: a mudança autorizada pela Q1), `PATCH` e `DELETE` de item carimbado (422 `item_invoiced`), `GET /financial-titles` (DTO só ganha `parentTitleId`) e `POST /financial-titles` com `parent_title_id` (ignorado); a precedência IDÊNTICA à da base nos dois casos do plano (T-PREC2: replay em mês fechado dá 409 nos dois lados; T-PREC3: OS vazia em mês fechado dá 422 `nothing_to_invoice` nos dois lados) — a mudança admitida pela linha 148 do seu corpo não existe no plano nem nas pendências, e não serve de exceção; códigos novos só onde o plano os declara (409 `invoice_items_changed`, 503 `invoice_transient_conflict`, 400 `invalid_parent_title_reference`); e a auditoria `work_order.invoiced` com as chaves da base mais, no máximo, `complementary`, sem `amount`, `party_name`, `tenant_id`, token, path nem id de outra organização. Vermelho-controle: a sonda distingue a base do objeto no caso do item depois do 1º faturamento; o comparador de chaves acusa um corpo fabricado sem `invoicedItemCount` e com `tenant_id` a mais; M13 e M14, uma por vez, acusadas pela sonda, com restauro por hash, derruba com: `grep -i -E 'Item 3|already_invoiced|nothing_to_invoice|period_closed|work_order_not_found|item_invoiced|parentTitleId|T-PREC2|T-PREC3|precedência|invoice_transient_conflict|complementary|M13|M14|vermelho' C:/Users/AMP/w-san3-02/agent-orchestration/omega/juntas/votos/B-SAN3-02/c3-evidencia.md`

Protocolo P1/P2/P3/P4/P7 do §C7.7, verbatim no bloco colado acima, com `<cadeira>` = `c3`: evidência em `c3-evidencia.md` após CADA item; `c3-voto.json` nasce esqueleto com os três itens EM APURAÇÃO, cada item gravado ao ser medido, e fecha antes da mensagem final de 1 linha; sucessor de identidade nova re-executa os comandos registrados e só então mede a cauda; três itens exatos; PAUSA grava head, feito, falta, próximo comando e arquivos meio-escritos e para. Queda vai a `00-quedas.md` do mesmo diretório (P6, pelo orquestrador); no máximo 2 jurados em paralelo (P5). Únicos outputs: `c3-evidencia.md` e `c3-voto.json` em `C:/Users/AMP/w-san3-02/agent-orchestration/omega/juntas/votos/B-SAN3-02/`; nunca commit, derruba com: `test -f C:/Users/AMP/w-san3-02/agent-orchestration/omega/juntas/votos/B-SAN3-02/c3-voto.json`

## MEDIDO

Pré-voo deste mandato com as ferramentas copiadas de `origin/chore/mandato-refs-e-preflight` para a pasta própria do redator `C:/Users/AMP/erp-pausa-2026-10-03/redator-san302/`, com a única adaptação funcional `RAIZ=C:/Users/AMP/w-san3-02` no `mandato-preflight.sh` (linha 211), executado com o cwd no worktree do objeto; o redator é `redator-san302-opus` (Claude Opus, nível menor declarado); o `sed` só troca, nos AVISOs, o número da migração pelo marcador `<corrida>` e o caminho dela pelo marcador `<migracao>`, para que a própria colagem não gere AVISO novo (os caminhos são os do bloco acima), medido por: `cd C:/Users/AMP/w-san3-02 && MANDATO_REFS=C:/Users/AMP/erp-pausa-2026-10-03/redator-san302/mandato-refs.sh bash C:/Users/AMP/erp-pausa-2026-10-03/redator-san302/mandato-preflight.sh C:/Users/AMP/w-san3-02/agent-orchestration/omega/juntas/votos/B-SAN3-02/00-mandatos/cadeira-c3.md 448 2>&1 | sed -E -e "s#prisma/migrations/2026[0-9]+_[a-z_]+/migration[.]sql#<migracao>#g" -e "s#'2026[0-9]+'#'<corrida>'#g"; echo ec=${PIPESTATUS[0]}`
```
COLAGEM    l.6-19: refs do PR #448 confere com a saida atual
AVISO      corrida hex em caminho versionado nao cobrada pela checagem 4: '<corrida>' em <migracao> — l.94

PRE-VOO OK — C:/Users/AMP/w-san3-02/agent-orchestration/omega/juntas/votos/B-SAN3-02/00-mandatos/cadeira-c3.md
ec=0
```
