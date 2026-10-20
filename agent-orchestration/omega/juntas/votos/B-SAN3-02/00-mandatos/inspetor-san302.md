# Mandato — Inspetor de terreno — B-SAN3-02 ciclo 1 (junta de DINHEIRO)

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

Identidades que planejaram, criticaram, desenvolveram, revisaram, deram parecer de banco ou fabricaram corpos deste bloco, GERADAS dos arquivos de registro do diff do bloco no objeto (piso da inelegibilidade, não teto), medido por: `cd C:/Users/AMP/w-san3-02 && for f in $(git diff --name-only 2ecfb333aed0a0efcc1f171148473aad2921be66 8e6a6c29b8a0aced5bf3968383aa9ef247019f46 -- docs/revisoes/SAN3 agent-orchestration .claude .agents); do git show "8e6a6c29b8a0aced5bf3968383aa9ef247019f46:$f"; done | grep -o -i -E '\b(planejador|critico|dev|rev|dba|fabrica|inspetor|redator)-san3-?02[a-z0-9-]*' | sort -u`
```
critico-san3-02-opus
critico-san3-02-r
critico-san3-02-r1
critico-san3-02-r2-
dba-san302-opus
dev-san3-02-cdx
dev-san3-02-opus
fabrica-san3-02-gemini
fabrica-san3-02-opus
planejador-san3-02-astra
planejador-san3-02-fable
planejador-san302-b4-fable
rev-san3-02-cdx
```

As quatro identidades desta junta, os dois devs dos consertos da revisão e o redator destes mandatos (nomeados pelo orquestrador no disparo do redator) não aparecem em arquivo nenhum do objeto, medido por: `cd C:/Users/AMP/w-san3-02 && git grep -c -i -E 'inspetor-san302-opus|jurado-san302-c1-opus|jurado-san302-c2-opus|jurado-san302-c3-argon|dev-san3-02-fix-cdx|dev-san3-02-fix-agyopus|redator-san302-opus' 8e6a6c29b8a0aced5bf3968383aa9ef247019f46 | wc -l`
```
0
```

A árvore do objeto `C:/Users/AMP/w-san3-02` está no head, sem mutação de conteúdo viva: os 70 ` M` rastreados são todos fantasmas de EOL em `.agents/` e `.claude/` (0 arquivo com diferença de conteúdo descontado o CR), medido por: `git -C C:/Users/AMP/w-san3-02 rev-parse HEAD; git -C C:/Users/AMP/w-san3-02 status --short -uno | wc -l; git -C C:/Users/AMP/w-san3-02 status --short -uno | grep -v -i -E '^ M \.(agents|claude)/' | wc -l; git -C C:/Users/AMP/w-san3-02 diff --ignore-cr-at-eol --name-only | wc -l`
```
8e6a6c29b8a0aced5bf3968383aa9ef247019f46
70
0
0
```

No instante da redação (2026-10-20T01:08Z), a memória de commit livre era 3,62 GB e havia 4 grupos de trabalho Docker alheios vivos, excluídos os `erp-*` (acima do teto de 2 contando o de cada cadeira: nenhuma cadeira sobe banco enquanto isso valer), medido por: `powershell.exe -NoProfile -Command '$o=Get-CimInstance Win32_PerfFormattedData_PerfOS_Memory; [math]::Round(($o.CommitLimit-$o.CommittedBytes)/1GB,2)'; docker ps --format '{{.Names}}' | grep -v -i -E '^erp-' | sed -E 's#-(pg|redis|run|net)$##' | sort -u | wc -l`
```
3,62
4
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

Você é `inspetor-san302-opus`, identidade nova, executor Claude Code, modelo Claude Opus, nível menor declarado (o `model: opus` do frontmatter de `inspetor-de-terreno-da-junta`, §C7.6); Opus esgotado: PARE e registre onde parou (§C7.6-bis). Declare executor efetivo, modelo, nível, objeto e `mandato_md5` deste arquivo na primeira linha de `insp-san302-evidencia.md`. Você não vota nem julga mérito: julga se o tabuleiro está limpo (§C7.1-bis), fail-closed. O plano v2 com os Anexos A, B e C, as críticas, o relatório do dev, o parecer do DBA e a revisão independente fora do repo são **A RE-VERIFICAR**, nunca prova herdada. Régua da junta que você libera: bloco de DINHEIRO, unanimidade de 3 com veto, ciclo 1 (todo `bloqueia` dentro do bloco reprova), derruba com: `head -1 C:/Users/AMP/w-san3-02/agent-orchestration/omega/juntas/votos/B-SAN3-02/insp-san302-evidencia.md | grep -i -E 'executor|Opus|mandato_md5|objeto'`

Item 1 de 3 (objeto, CI, mandatos, corpos, S0): resolva o objeto por `git ls-remote origin refs/heads/fix/faturamento-atomico-e-delta` e por `gh pr view 448 --json headRefOid`; confira os 14 check-runs concluídos e verdes no SHA (ausência, `queued` ou `cancelled` bloqueia o start); rode o pré-voo dos quatro mandatos deste diretório até `PRE-VOO OK` com as ferramentas da pasta `C:/Users/AMP/erp-pausa-2026-10-03/redator-san302/` (a mesma adaptação de `RAIZ`); confira no objeto, EOL-neutro e descontado o bloco de adaptação Codex, os três corpos nos dois espelhos (`.claude/agents/especialistas/` e `.agents/agents/especialistas/`) e que o corpo que cada cadeira carregar é o do objeto; reexecute o S0 (`sync-agent-agents.mjs --check`) num worktree descartável no objeto. Head que andou depois da redação bloqueia até novo pré-voo, derruba com: `grep -i -E 'Item 1|14/14|check-runs|PRE-VOO|corpos|espelho|S0|LIBERADO|BLOQUEADO' C:/Users/AMP/w-san3-02/agent-orchestration/omega/juntas/votos/B-SAN3-02/insp-san302-parecer.md`

Item 2 de 3 (identidades, papéis e briefing): confira por nome a inelegibilidade de toda identidade da lista gerada acima, mais `dev-san3-02-fix-cdx` e `dev-san3-02-fix-agyopus` (autores dos consertos do ciclo de revisão e do T-Z3, nomeados pelo orquestrador e ausentes do objeto) e `redator-san302-opus`, e regenere a lista por comando seu (o meu é piso); nomeie C1 = `jurado-san302-c1-opus` (Claude Opus), C2 = `jurado-san302-c2-opus` (Claude Opus) e C3 = `jurado-san302-c3-argon` (Gemini 4 Argon pela API do Gemini, via Gemini CLI, no nível menor pela leitura declarada `D-GEMINI-ARGON-USO`; uma de três cadeiras, logo não é revisor único) e confira que nenhuma coincide com as inelegíveis nem entre si; confira a separação de papéis do §C7.4-bis por nome: quem achou (os críticos r1 e r2 e `rev-san3-02-cdx`), quem planejou (`planejador-san3-02-astra`, `planejador-san3-02-fable` e `planejador-san302-b4-fable`) e quem desenvolveu (`dev-san3-02-opus` e os dois devs dos consertos; `dev-san3-02-cdx` caiu antes de começar). Confira a PRESENÇA no briefing (§9 do plano, "Pré-voo do inspetor"): o plano v2 com os Anexos A, B e C, as críticas r1 e r2, o relatório do dev com as 30 mutações vermelhas, a `D-SAN3-02-TITULO-COMPLEMENTAR` com a Q4 apensada, o parecer do DBA e a revisão independente; e, em cada mandato de cadeira, a divergência corpo × plano medida e registrada (C1: T-A4 e T-Z; C2: FK e drift; C3: mutações, precedência e executor). Coincidência de identidade, papel acumulado ou briefing incompleto bloqueia, derruba com: `grep -i -E 'Item 2|ineleg|jurado-san302-c1-opus|jurado-san302-c2-opus|jurado-san302-c3-argon|Argon|4-bis|briefing|Anexo|Q4|divergência' C:/Users/AMP/w-san3-02/agent-orchestration/omega/juntas/votos/B-SAN3-02/insp-san302-parecer.md`

Item 3 de 3 (terreno): confira a árvore `C:/Users/AMP/w-san3-02` no objeto e sem mutação viva, admitindo só os ` M` fantasmas de EOL em `.agents/` e `.claude/` (medidos acima) e, como não rastreados, só os arquivos deste diretório de votos; exija worktree próprio por cadeira (`C:/Users/AMP/w-jsan302-c1-`, `C:/Users/AMP/w-jsan302-c2-`, `C:/Users/AMP/w-jsan302-c3-` e o da base `C:/Users/AMP/w-jsan302-c3b-`), `npm ci` próprio e zero junction de `node_modules`; banco DESCARTÁVEL por cadeira via `C:/Users/AMP/erp-pausa-2026-10-03/ferramentas/teste-linux.sh`, cujo ID `tl<epoch><pid>` cada cadeira registra como seu (a ferramenta não aceita prefixo, medido acima), e prefixo `jsan302-<cadeira>-` para o que for criado fora dela, sem porta publicada. Conte os trabalhos Docker alheios excluindo `erp-*`: no máximo 2 na máquina contando o de cada cadeira (na redação eram 4: nenhum banco sobe enquanto isso valer), e memória de commit livre de pelo menos 3 GB antes de cada subida; base viva e portas 5432, 6379, 3000, 5173, 5050 e 8899 são proibidas. Declare baseline honesto do terreno, plano de perda de jurado (P3, sucessor de identidade nova, inclusive se o Argon esgotar), no máximo dois jurados em paralelo (P5) e a ordem de disparo que respeita o teto de Docker, derruba com: `grep -i -E 'Item 3|w-jsan302-|jsan302-|tl[0-9]|junction|erp-|commit livre|5432|6379|3000|5173|5050|8899|P3|P5|baseline' C:/Users/AMP/w-san3-02/agent-orchestration/omega/juntas/votos/B-SAN3-02/insp-san302-parecer.md`

Protocolo P1/P2/P3/P4/P7 do §C7.7, verbatim no bloco colado acima, com `<cadeira>` = `insp-san302` e o parecer no lugar do voto: evidência em `insp-san302-evidencia.md` após CADA item; `insp-san302-parecer.md` nasce esqueleto com os três itens EM APURAÇÃO e fecha (LIBERADO, LIBERADO COM RESSALVA ou BLOQUEADO) antes da mensagem final de 1 linha; sucessor re-executa os comandos registrados; três itens exatos; PAUSA grava estado e para; queda em `00-quedas.md` (P6, pelo orquestrador). Únicos outputs: `insp-san302-evidencia.md` e `insp-san302-parecer.md` em `C:/Users/AMP/w-san3-02/agent-orchestration/omega/juntas/votos/B-SAN3-02/`; nunca commit, derruba com: `test -f C:/Users/AMP/w-san3-02/agent-orchestration/omega/juntas/votos/B-SAN3-02/insp-san302-parecer.md`

## MEDIDO

Pré-voo deste mandato com as ferramentas copiadas de `origin/chore/mandato-refs-e-preflight` para a pasta própria do redator `C:/Users/AMP/erp-pausa-2026-10-03/redator-san302/`, com a única adaptação funcional `RAIZ=C:/Users/AMP/w-san3-02` no `mandato-preflight.sh` (linha 211), executado com o cwd no worktree do objeto; o redator é `redator-san302-opus` (Claude Opus, nível menor declarado), medido por: `cd C:/Users/AMP/w-san3-02 && MANDATO_REFS=C:/Users/AMP/erp-pausa-2026-10-03/redator-san302/mandato-refs.sh bash C:/Users/AMP/erp-pausa-2026-10-03/redator-san302/mandato-preflight.sh C:/Users/AMP/w-san3-02/agent-orchestration/omega/juntas/votos/B-SAN3-02/00-mandatos/inspetor-san302.md 448 2>&1; echo ec=$?`
```
COLAGEM    l.6-19: refs do PR #448 confere com a saida atual

PRE-VOO OK — C:/Users/AMP/w-san3-02/agent-orchestration/omega/juntas/votos/B-SAN3-02/00-mandatos/inspetor-san302.md
ec=0
```
