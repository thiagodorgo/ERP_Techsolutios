# Mandato — Cadeira C1 — B-SAN3-02 ciclo 1 (junta de DINHEIRO)

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

DIVERGÊNCIA corpo × plano (registrada pelo §A2, não consolidada em silêncio): a linha 127 do seu corpo espera, na T-A4, o perdedor com 409; o plano v2 (resposta ao achado A1, §4 linha 245 e §7.1 linha 344) mudou o alvo, declaradamente, para 201 complementar; o seu corpo não tem nenhuma ocorrência de `T-Z` nem de `M19`, e o aceite do Anexo B §6 (linha 801) exige a M19 vermelha 3 vezes no planner padrão, medido por: `git show 8e6a6c29b8a0aced5bf3968383aa9ef247019f46:.claude/agents/especialistas/jurado-san302-c1-atomicidade-e-corrida.md | tr -d '\r' | grep -n -i -o -E 'Esperado: o perdedor dá 409 .already_invoiced.|T-Z|M19'; git show 8e6a6c29b8a0aced5bf3968383aa9ef247019f46:docs/revisoes/SAN3/B-SAN3-02-plano.md | tr -d '\r' | grep -n -i -o -E 'perdedor \*\*201\*\* com .parentTitleId === T1.id.|o 2º \*\*201 complementar\*\*|\*\*M19 vermelha 3×\*\* no planner padrão'`
```
127:Esperado: o perdedor dá 409 `already_invoiced`
245:o 2º **201 complementar**
344:perdedor **201** com `parentTitleId === T1.id`
801:**M19 vermelha 3×** no planner padrão
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

Você é `jurado-san302-c1-opus`, identidade nova, executor Claude Code, modelo Claude Opus, nível menor declarado (§C7.6); o seu corpo canônico é `.claude/agents/especialistas/jurado-san302-c1-atomicidade-e-corrida.md` (o §9 do plano previa a identidade `jurado-san302-c1-dinheiro`; a de fato é esta, nomeada pelo orquestrador). Na primeira linha de `c1-evidencia.md`, declare executor efetivo, modelo, nível, objeto, `mandato_md5` deste arquivo e o veredito IDENTICO/DIVERGE do corpo que você carregou contra o blob do objeto, EOL-neutro (nunca `md5sum` cru sob `core.autocrlf=true`). Opus esgotado: PARE sem votar e registre onde parou (§C7.6-bis). Se o seu nome coincidir com algum inelegível do mandato do inspetor, pare. O plano v2 com os Anexos A, B e C, as críticas, o relatório do dev, o parecer do DBA (`dba-san302-opus`, insumo, não prova) e a revisão independente fora do repo são **A RE-VERIFICAR**, nunca fato herdado, derruba com: `head -1 C:/Users/AMP/w-san3-02/agent-orchestration/omega/juntas/votos/B-SAN3-02/c1-evidencia.md | grep -i -E 'executor|modelo|mandato_md5|IDENTICO|DIVERGE'`

A legalidade vem antes do mérito: parecer `insp-san302-parecer.md` do inspetor `inspetor-san302-opus` com LIBERADO ou LIBERADO COM RESSALVA nomeando você, seu executor, seu worktree e seu terreno de banco; o objeto continua sendo o head do PR 448 colado acima, com 14 de 14 check-runs concluídos (head que andou bloqueia o início). Régua: bloco de DINHEIRO, unanimidade de 3 com veto (§C7 item 8(1), §C7.1-ter(b)); ciclo 1, logo todo `bloqueia` com escopo `dentro-do-bloco` reprova, grave ou não (§C7 item 8(2)). Todo achado declara gravidade, classe, escopo, N e forma; `pre-existente` exige evidência de origem ou data e pendência com dono (§C7.1-ter(a)) e não reprova; escopo sem evidência conta como `dentro-do-bloco`; "não consigo medir" item seu é REPROVADO; não proponha correção (§C7.4-bis), não cobre KPI (congelado) nem matéria de C2 ou C3, e não leia votos alheios desta junta, derruba com: `grep -i -E 'legalidade|A RE-VERIFICAR|gravidade|classe|escopo' C:/Users/AMP/w-san3-02/agent-orchestration/omega/juntas/votos/B-SAN3-02/c1-voto.json`

Terreno: worktree exclusivo prefixado `C:/Users/AMP/w-jsan302-c1-`, no objeto, com `npm ci` próprio e zero junction de `node_modules` (§C7.1-ter(c)), removido só por `git worktree remove --force` depois de conferir que nenhum processo o usa. Banco: Postgres 16 DESCARTÁVEL por `bash C:/Users/AMP/erp-pausa-2026-10-03/ferramentas/teste-linux.sh <seu-worktree> '<comando>'`; a ferramenta nomeia os seus contêineres e rede `tl<epoch><pid>` (medido acima), e você registra esse ID na evidência como seu; todo contêiner, rede ou base que você criar fora da ferramenta leva o prefixo `jsan302-c1-` (bases `jsan302_c1_<caso>`). Antes de subir, conte os trabalhos Docker alheios excluindo `erp-*` (no máximo 2 na máquina contando o seu) e meça a memória de commit livre (no mínimo 3 GB); faltando qualquer um, espere. Nunca a base viva (`erp-postgres`, `erp-redis`) nem as portas 5432, 6379, 3000, 5173, 5050 e 8899; nunca `prune` nem contêiner alheio. Mutação só no seu worktree, uma por vez, com âncora única e prova de aplicação (CRLF incluso), restauro provado por `git hash-object <arquivo>` igual a `git rev-parse <objeto>:<arquivo>`; gatilhos e funções de falha escopados pelo tenant do teste e removidos no `finally`, com 0 resto provado em `pg_trigger` e `pg_proc`; teardown só do que é seu, derruba com: `grep -i -E 'w-jsan302-c1-|jsan302-c1-|tl[0-9]|junction|erp-|commit livre|5432|6379|3000|5173|5050|8899|hash-object|teardown' C:/Users/AMP/w-san3-02/agent-orchestration/omega/juntas/votos/B-SAN3-02/c1-evidencia.md`

Item 1 de 3 (K1, plano §7.1 e ajuste B1 do Anexo A; item 1 do seu corpo): prove por execução, sob o papel efêmero `NOSUPERUSER NOBYPASSRLS` com `rolsuper` e `rolbypassrls` falsos lidos pela própria conexão do serviço, que a falha injetada entre o título e o carimbo não deixa nada: sonda Postgres PRÓPRIA com gatilho no UPDATE que carimba e, na variante, no INSERT do título, com `financial_titles` e `work_order_financial_items` contados antes e depois; T-A1; T-A3 (409 `invoice_items_changed`); T-A6 (503 `invoice_transient_conflict` nas formas `P2034` e `P2010` com `40P01`); T-A7 (409 alheio e 400 `invalid_parent_title_reference` propagam intactos); T-PREC (422 `period_closed`, nenhum título novo); e, no blob do objeto, que o INSERT e o carimbo usam o MESMO `tx` da unidade, sem `this.repository.create` no caminho do `invoice`. Vermelho-controle: a sonda contra o `src/` da base (cópia, hashes provados) reproduz o título sem carimbo; M1, M9, M3, M20 e M24, uma por vez, ficam vermelhas no caso que as cita (a M3 só em memória, como o plano declara); irmão positivo sem gatilho grava 1 título e n carimbos com a soma certa, derruba com: `grep -i -E 'Item 1|T-A1|T-A3|T-A6|T-A7|T-PREC|M1|M9|M3|M20|M24|rolbypassrls|vermelho|hash-object' C:/Users/AMP/w-san3-02/agent-orchestration/omega/juntas/votos/B-SAN3-02/c1-evidencia.md`

Item 2 de 3 (K2, plano §7.2; item 2 do seu corpo): prove por execução as corridas T-R1, T-R2, T-R2b e T-R4 com o vencedor cru nas peças do produto e o perdedor real sob o papel sem bypass, barreira escopada por `application_name` (`tests/helpers/pg-barrier.ts`) e o bloqueio do perdedor provado em `pg_stat_activity` (`wait_event_type = 'Lock'`) antes da liberação, N de pelo menos 5 por corrida, com frequência por desfecho, denominador constante e 0 skip; mais T-M4b e T-M4c em memória. Vermelho-controle: a T-R2 ou a T-R1 contra o `src/` da base reproduz o TOCTOU; M2 (morte determinística em T-R2, T-R2b e T-Z2, pelo ajuste B2 do Anexo A: o vermelho dela no T-A4 é deadlock de forma variável e NÃO conta), M4, M4′, M4m e M4i, uma por vez; o leitor de desfechos classifica uma resposta fabricada de cada balde (201, 409, 422 `item_invoiced`, 422 `nothing_to_invoice`), derruba com: `grep -i -E 'Item 2|T-R1|T-R2|T-R2b|T-R4|T-M4b|T-M4c|pg_stat_activity|M2|M4|vermelho|hash-object' C:/Users/AMP/w-san3-02/agent-orchestration/omega/juntas/votos/B-SAN3-02/c1-evidencia.md`

Item 3 de 3 (item 3 do seu corpo, no alvo do plano v2 e com a ordem total do Anexo B §6): prove por execução (a) dois `invoice` reais concorrentes na mesma OS, sem barreira, N de pelo menos 10, cada rodada com um 201 e um 409 `already_invoiced` (ou 422), 1 original ativo e nenhum item com dois `title_id`; (b) a T-A4 NA FORMA DO PLANO v2 (§4 e §7.1, aceita na resposta ao A1): o perdedor com o item novo dá 201 COMPLEMENTAR com `parentTitleId` igual ao original, `invoicedItemCount` 1 e 2 títulos, e NÃO o 409 que a linha 127 do seu corpo espera (divergência medida acima; vale o plano, posterior e com a mudança de alvo declarada), e a T-A4b (decisão podre, P2002 dentro da unidade, 409 `already_invoiced`, nada persiste); (c) a advisory antes do row lock, por `pg_locks` enquanto o faturamento espera a trava exclusiva do período (`src/database/financial-period-lock.ts`); (d) a ordem total `(created_at, id)` nos dois escritores multi-linha, T-Z1, T-Z2 e o T-Z3 plano-independente com a premissa `ctid(i1) < ctid(i2)` medida, sem `40P01` em nenhuma conexão, matéria que o seu corpo não cobre e o plano põe no K2 e no Anexo B §6 (o achado 3 da revisão independente, M19 só 1 vez, é A RE-VERIFICAR contra o commit "tornar o T-Z3 independente do planner"). Vermelho-controle: M17 vermelha no T-A4; a ordem advisory invertida acusada por `pg_locks`; M4″ vermelha no T-Z1; M19 vermelha 3 vezes no T-Z3 no planner padrão, SEM `PGOPTIONS`, com o `EXPLAIN (COSTS OFF)` do `UPDATE` sem ordem registrado; o leitor de `pg_locks` acusa uma linha fabricada, derruba com: `grep -i -E 'Item 3|T-A4|T-A4b|complementar|pg_locks|advisory|T-Z1|T-Z2|T-Z3|ctid|M17|M19|PGOPTIONS|EXPLAIN|vermelho' C:/Users/AMP/w-san3-02/agent-orchestration/omega/juntas/votos/B-SAN3-02/c1-evidencia.md`

Protocolo P1/P2/P3/P4/P7 do §C7.7, verbatim no bloco colado acima, com `<cadeira>` = `c1`: evidência em `c1-evidencia.md` após CADA item; `c1-voto.json` nasce esqueleto com os três itens EM APURAÇÃO, cada item gravado ao ser medido, e fecha antes da mensagem final de 1 linha; sucessor de identidade nova re-executa os comandos registrados e só então mede a cauda; três itens exatos; PAUSA grava head, feito, falta, próximo comando e arquivos meio-escritos e para. Queda vai a `00-quedas.md` do mesmo diretório (P6, pelo orquestrador); no máximo 2 jurados em paralelo (P5). Únicos outputs: `c1-evidencia.md` e `c1-voto.json` em `C:/Users/AMP/w-san3-02/agent-orchestration/omega/juntas/votos/B-SAN3-02/`; nunca commit, derruba com: `test -f C:/Users/AMP/w-san3-02/agent-orchestration/omega/juntas/votos/B-SAN3-02/c1-voto.json`

## MEDIDO

Pré-voo deste mandato com as ferramentas copiadas de `origin/chore/mandato-refs-e-preflight` para a pasta própria do redator `C:/Users/AMP/erp-pausa-2026-10-03/redator-san302/`, com a única adaptação funcional `RAIZ=C:/Users/AMP/w-san3-02` no `mandato-preflight.sh` (linha 211), executado com o cwd no worktree do objeto; o redator é `redator-san302-opus` (Claude Opus, nível menor declarado), medido por: `cd C:/Users/AMP/w-san3-02 && MANDATO_REFS=C:/Users/AMP/erp-pausa-2026-10-03/redator-san302/mandato-refs.sh bash C:/Users/AMP/erp-pausa-2026-10-03/redator-san302/mandato-preflight.sh C:/Users/AMP/w-san3-02/agent-orchestration/omega/juntas/votos/B-SAN3-02/00-mandatos/cadeira-c1.md 448 2>&1; echo ec=$?`
```
COLAGEM    l.6-19: refs do PR #448 confere com a saida atual

PRE-VOO OK — C:/Users/AMP/w-san3-02/agent-orchestration/omega/juntas/votos/B-SAN3-02/00-mandatos/cadeira-c1.md
ec=0
```
