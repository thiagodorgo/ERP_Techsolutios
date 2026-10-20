# Mandato — Inspetor — B-DASH-PERFIL ciclo 2

## MEDIDO

Estado do PR 446 no instante da redação, pela ferramenta `mandato-refs.sh` copiada de `origin/chore/mandato-refs-e-preflight` para a subpasta própria `redator-dash2` do scratch do redator (sem adaptação), com o cwd no worktree do objeto, medido por: `cd C:/Users/AMP/w-dash && bash <scratch-do-redator>/redator-dash2/mandato-refs.sh 446`
```
# refs do PR #446 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato
# gerado em: 2026-10-19T10:36Z · repo: thiagodorgo/ERP_Techsolutios

ramo:            fix/dash-perfil
base:            origin/main
estado:          OPEN | rascunho=false | MERGEABLE
head do PR:      faad24ce7c00ab4d7610d0784c0beab8a479ddb0
merge-base:      bf83cda8a9acdc92f05f29397d1860bed9be5388
merge commit:    <ainda nao mergeado>
check-runs:      total=14 nao-verdes=0 pendentes=0
approved_head:   NAO DETERMINAVEL (a ata casa o PR mas NAO declara aprovacao: nenhuma linha '- **approved_head:**')
                 objeto declarado 849bf840f2bdecae87b82a17b26adf505d8a2a8e (agent-orchestration/omega/juntas/J-B-DASH-PERFIL-ciclo1.md:3 @head-do-PR) — aprovacao nao legivel por maquina
                 NAO invente: sem a linha '- **approved_head:**' numa ata que se declare
                 sobre este PR, a ferramenta NAO afirma qual head a junta aprovou.
```

Os 14 check-runs do objeto estão concluídos e todos `success` (zero fora de `completed success`), medido por: `gh api repos/thiagodorgo/ERP_Techsolutios/commits/faad24ce7c00ab4d7610d0784c0beab8a479ddb0/check-runs --jq '.total_count, ([.check_runs[] | select(.status != "completed" or .conclusion != "success")] | length)'`
```
14
0
```

Os três insumos do ciclo 2 existem no objeto: o plano do ciclo 2 com a auditoria de topo (Partes 1 a 4), a ata do ciclo 1 e o relatório do dev do ciclo 2, medido por: `for p in agent-orchestration/omega/reprovacoes/R-B-DASH-PERFIL-1.md agent-orchestration/omega/juntas/J-B-DASH-PERFIL-ciclo1.md docs/revisoes/TELAS/B-DASH-PERFIL-ciclo2-dev.md; do git cat-file -e "faad24ce7c00ab4d7610d0784c0beab8a479ddb0:$p" && echo "PRESENTE $p"; done`
```
PRESENTE agent-orchestration/omega/reprovacoes/R-B-DASH-PERFIL-1.md
PRESENTE agent-orchestration/omega/juntas/J-B-DASH-PERFIL-ciclo1.md
PRESENTE docs/revisoes/TELAS/B-DASH-PERFIL-ciclo2-dev.md
```

O objeto do ciclo 1 (o declarado na ata do ciclo 1 e na colagem acima) e o objeto do ciclo 2 não diferem em nenhum arquivo de `frontend/src` nem de `src`: o ciclo 2 não tocou produto, medido por: `git diff --name-only 849bf840f2bdecae87b82a17b26adf505d8a2a8e faad24ce7c00ab4d7610d0784c0beab8a479ddb0 -- frontend/src src | wc -l`
```
0
```

Os seis corpos das cadeiras existem no objeto e são, blob a blob, IDÊNTICOS aos do objeto do ciclo 1, medido por: `for p in .claude/agents/especialistas/jurado-dash-c1-cadeia-de-acesso.md .agents/agents/especialistas/jurado-dash-c1-cadeia-de-acesso.md .claude/agents/especialistas/jurado-dash-c2-troca-de-organizacao.md .agents/agents/especialistas/jurado-dash-c2-troca-de-organizacao.md .claude/agents/especialistas/jurado-dash-c3-regressao-e-escopo.md .agents/agents/especialistas/jurado-dash-c3-regressao-e-escopo.md; do git cat-file -e "faad24ce7c00ab4d7610d0784c0beab8a479ddb0:$p" && [ "$(git rev-parse 849bf840f2bdecae87b82a17b26adf505d8a2a8e:$p)" = "$(git rev-parse faad24ce7c00ab4d7610d0784c0beab8a479ddb0:$p)" ] && echo "IDENTICO $p"; done`
```
IDENTICO .claude/agents/especialistas/jurado-dash-c1-cadeia-de-acesso.md
IDENTICO .agents/agents/especialistas/jurado-dash-c1-cadeia-de-acesso.md
IDENTICO .claude/agents/especialistas/jurado-dash-c2-troca-de-organizacao.md
IDENTICO .agents/agents/especialistas/jurado-dash-c2-troca-de-organizacao.md
IDENTICO .claude/agents/especialistas/jurado-dash-c3-regressao-e-escopo.md
IDENTICO .agents/agents/especialistas/jurado-dash-c3-regressao-e-escopo.md
```

O S0 executado num worktree descartável no objeto está verde, medido por: `git worktree add --detach C:/Users/AMP/w-dash2-s0 faad24ce7c00ab4d7610d0784c0beab8a479ddb0 >/dev/null 2>&1; node C:/Users/AMP/w-dash2-s0/scripts/sync-agent-agents.mjs --check; echo ec=$?; git worktree remove --force C:/Users/AMP/w-dash2-s0`
```
[agents-sync] OK — 73 agentes, espelho consistente.
ec=0
```

Os commits próprios do ramo depois do objeto do ciclo 1, excluída a `main` integrada, são quatro: a ata do ciclo 1, os testes do ciclo 2, o relatório do dev e o registro da reprovação, medido por: `git log --no-merges --format='%ad %s' --date=short 849bf840f2bdecae87b82a17b26adf505d8a2a8e..faad24ce7c00ab4d7610d0784c0beab8a479ddb0 ^origin/main | cut -c1-100`
```
2026-10-19 docs(registro): R-B-DASH-PERFIL-1 — auditoria de topo da reprovação do ciclo 1 e plan
2026-10-19 docs(dash-perfil): relatório do dev do ciclo 2 — bateria §2.7, 7/7 mutações vermelh
2026-10-19 test(dash-perfil): ciclo 2 prende por comportamento que só a sessão libera e que o acti
2026-10-19 docs(junta): ata do ciclo 1 do B-DASH-PERFIL — REPROVADO 1 x 2, com mandatos, votos, ev
```

O modelo de mandato do §C7.7 do contrato (P1, P2, P4, P3, P7), verbatim no objeto, medido por: `git show faad24ce7c00ab4d7610d0784c0beab8a479ddb0:CLAUDE.md | tr -d '\r' | sed -n '708,715p'`
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

Você é `inspetor-dash2-opus`, identidade nova, executor Claude Code, modelo Claude Opus, nível menor declarado (o `model: opus` do frontmatter de `inspetor-de-terreno-da-junta`, §C7.6). Declare executor efetivo, modelo, nível, objeto e `mandato_md5` deste arquivo na primeira linha de `insp-dash2-evidencia.md`. Você não vota nem julga mérito: julga se o tabuleiro está limpo (§C7.1-bis), fail-closed. Plano do ciclo 2, ata do ciclo 1 e relatório do dev são **A RE-VERIFICAR**, nunca prova herdada. Régua da junta que você libera: PERMISSÃO, unanimidade de 3 com veto, ciclo 2 (o último em que achado não grave reprova), derruba com: `head -1 C:/Users/AMP/w-dash/agent-orchestration/omega/juntas/votos/B-DASH-PERFIL-ciclo2/insp-dash2-evidencia.md | grep -i -E 'executor|Opus|mandato_md5|objeto'`

Item 1 de 3 (objeto, CI, mandatos, corpos, S0): resolva o objeto por `git ls-remote origin refs/heads/fix/dash-perfil` e por `gh pr view 446`; confira os 14 check-runs concluídos e verdes no SHA (ausência, `queued` ou `cancelled` bloqueia o start); rode o pré-voo dos quatro mandatos deste diretório até `PRE-VOO OK` com a mesma ferramenta; confira no objeto, por blob e EOL-neutro, os seis corpos das cadeiras nos dois espelhos e que são os mesmos do ciclo 1; reexecute o S0 (`sync-agent-agents.mjs --check`) num worktree descartável no objeto. Head que andou depois da redação bloqueia até novo pré-voo, derruba com: `grep -i -E 'Item 1|14/14|check-runs|PRE-VOO|seis corpos|S0|LIBERADO|BLOQUEADO' C:/Users/AMP/w-dash/agent-orchestration/omega/juntas/votos/B-DASH-PERFIL-ciclo2/insp-dash2-parecer.md`

Item 2 de 3 (identidades, papéis e briefing): confira por nome a inelegibilidade de `jurado-dash-c1-cdx`, `jurado-dash-c2-opus`, `jurado-dash-c3-opus`, `jurado-dash-c3-cdx`, `jurado-dash-c2-gemini`, `inspetor-dash-cdx`, `redator-dash-cdx`, `planejador-dash-ciclo2-fable`, `dev-dash-ciclo2-opus`, `dev-b-dash-perfil-opus`, `dev-dash-emenda-cdx`, `planejador-dash-emenda-gemini`, mais toda identidade de dev, planejador ou achador nomeada no plano do ciclo 2, na ata do ciclo 1 e no relatório do dev; nomeie C1 = `jurado-dash2-c1-opus` (Claude Opus), C2 = `jurado-dash2-c2-opus` (Claude Opus) e C3 = `jurado-dash2-c3-cdx` (Codex GPT-5.6 Sol, médio), e confira que nenhuma coincide com as inelegíveis nem entre si; confira a separação de papéis do §C7.4-bis (quem achou, quem planejou e quem desenvolveu no ciclo 2, por nome). Confira a PRESENÇA no briefing (§2.8): o plano do ciclo 2, a ata do ciclo 1 e, no mandato de C1, a reclassificação de C1-01 como `pre-existente`, não grave, com os comandos da Parte 1.1. Coincidência de identidade ou briefing incompleto bloqueia, derruba com: `grep -i -E 'Item 2|ineleg|jurado-dash2-c1-opus|jurado-dash2-c2-opus|jurado-dash2-c3-cdx|4-bis|briefing|pre-existente|Parte 1.1' C:/Users/AMP/w-dash/agent-orchestration/omega/juntas/votos/B-DASH-PERFIL-ciclo2/insp-dash2-parecer.md`

Item 3 de 3 (terreno): confira a árvore `C:/Users/AMP/w-dash` sem mutação viva, admitindo só os ` M` fantasmas de EOL em `.agents/` e `.claude/` e os outputs deste diretório; exija worktree próprio por cadeira (`C:/Users/AMP/w-jdash2-c1-`, `C:/Users/AMP/w-jdash2-c2-`, `C:/Users/AMP/w-jdash2-c3-`), `npm ci` próprio e zero junction de `node_modules`; cluster e rede próprios `jdash2-c1-`, `jdash2-c2-`, `jdash2-c3-`, sem porta publicada. Conte os trabalhos Docker alheios excluindo `erp-*`: no máximo 2 na máquina contando o de cada cadeira; base viva e portas 5432, 6379, 3000, 5173, 5050 e 8899 são proibidas. Declare baseline honesto do terreno, plano de perda de jurado (P3, sucessor de identidade nova) e no máximo dois jurados em paralelo (P5), derruba com: `grep -i -E 'Item 3|w-jdash2-|jdash2-|junction|erp-|5432|6379|3000|5173|5050|8899|P3|P5|baseline' C:/Users/AMP/w-dash/agent-orchestration/omega/juntas/votos/B-DASH-PERFIL-ciclo2/insp-dash2-parecer.md`

Protocolo P1/P2/P3/P4/P7 do §C7.7, verbatim no bloco colado acima, com `<cadeira>` = `insp-dash2` e o parecer no lugar do voto: evidência em `insp-dash2-evidencia.md` após CADA item; `insp-dash2-parecer.md` nasce esqueleto com os três itens EM APURAÇÃO e fecha (LIBERADO, LIBERADO COM RESSALVA ou BLOQUEADO) antes da mensagem final de 1 linha; sucessor re-executa os comandos registrados; três itens exatos; PAUSA grava estado e para; queda em `00-quedas.md` (P6, pelo orquestrador). Únicos outputs: `insp-dash2-evidencia.md` e `insp-dash2-parecer.md` em `C:/Users/AMP/w-dash/agent-orchestration/omega/juntas/votos/B-DASH-PERFIL-ciclo2/`; nunca commit, derruba com: `test -f C:/Users/AMP/w-dash/agent-orchestration/omega/juntas/votos/B-DASH-PERFIL-ciclo2/insp-dash2-parecer.md`

## MEDIDO

Pré-voo deste mandato com as ferramentas copiadas de `origin/chore/mandato-refs-e-preflight` para a subpasta própria `redator-dash2`, com a única adaptação funcional `RAIZ=C:/Users/AMP/w-dash` no `mandato-preflight.sh`, executado com o cwd no worktree do objeto; o `sed` só troca o caminho real do scratch da sessão pelo marcador, para que nenhum UUID de sessão entre no mandato, e o nome do campo reservado da ferramenta no AVISO pelo marcador `<campo-reservado>` (o estado dele está na colagem do PR 446 acima), medido por: `cd C:/Users/AMP/w-dash && MANDATO_REFS=<scratch-do-redator>/redator-dash2/mandato-refs.sh bash <scratch-do-redator>/redator-dash2/mandato-preflight.sh <este-mandato> 446 2>&1 | sed -e "s#<caminho-real-do-scratch>#<scratch-do-redator>#g" -e "s#appro[u-w]ed_head#<campo-reservado>#g"; echo ec=${PIPESTATUS[0]}`
```
COLAGEM    l.6-21: refs do PR #446 confere com a saida atual
AVISO      <campo-reservado> NAO DETERMINAVEL (mandato-refs.sh ec=3) — a proveniencia dos SHAs vale; rode 'bash <scratch-do-redator>/redator-dash2/mandato-refs.sh 446' para ver o que a ferramenta viu. 

PRE-VOO OK — C:/Users/AMP/w-dash/agent-orchestration/omega/juntas/votos/B-DASH-PERFIL-ciclo2/00-mandatos/inspetor-dash2.md
ec=0
```
