# Mandato — Inspetor — B-DASH-PERFIL ciclo 3

## MEDIDO

Estado do PR 446 no instante da redação, pela ferramenta `mandato-refs.sh` copiada de `origin/chore/mandato-refs-e-preflight` para a subpasta própria `redator-dash3` do scratch do redator (sem adaptação), com o cwd no worktree do objeto, medido por: `cd C:/Users/AMP/w-dash && bash <scratch-do-redator>/redator-dash3/mandato-refs.sh 446`
```
# refs do PR #446 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato
# gerado em: 2026-10-20T02:24Z · repo: thiagodorgo/ERP_Techsolutios

ramo:            fix/dash-perfil
base:            origin/main
estado:          OPEN | rascunho=false | MERGEABLE
head do PR:      33345c6ed5021bdd7c3a5162b14c2bc52a2ed39d
merge-base:      2ecfb333aed0a0efcc1f171148473aad2921be66
merge commit:    <ainda nao mergeado>
check-runs:      total=14 nao-verdes=0 pendentes=0
approved_head:   NAO DETERMINAVEL (2 atas casam #446 no cabecalho — a ferramenta nao escolhe)
                 objeto declarado 849bf840f2bdecae87b82a17b26adf505d8a2a8e (agent-orchestration/omega/juntas/J-B-DASH-PERFIL-ciclo1.md:3 @head-do-PR) — aprovacao nao legivel por maquina
                 objeto declarado faad24ce7c00ab4d7610d0784c0beab8a479ddb0 (agent-orchestration/omega/juntas/J-B-DASH-PERFIL-ciclo2.md:3 @head-do-PR) — aprovacao nao legivel por maquina
                 NAO invente: sem a linha '- **approved_head:**' numa ata que se declare
                 sobre este PR, a ferramenta NAO afirma qual head a junta aprovou.
```

Os 14 check-runs do objeto estão concluídos e todos `success` (zero fora de `completed success`), medido por: `gh api repos/thiagodorgo/ERP_Techsolutios/commits/33345c6ed5021bdd7c3a5162b14c2bc52a2ed39d/check-runs --jq '.total_count, ([.check_runs[] | select(.status != "completed" or .conclusion != "success")] | length)'`
```
14
0
```

Os cinco insumos dos ciclos 1, 2 e 3 existem no objeto: o plano e auditoria de topo do ciclo 3 (Partes 1 a 4), o plano do ciclo 2, as atas dos ciclos 1 e 2 e o relatório do dev do ciclo 3, medido por: `for p in agent-orchestration/omega/reprovacoes/R-B-DASH-PERFIL-2.md agent-orchestration/omega/reprovacoes/R-B-DASH-PERFIL-1.md agent-orchestration/omega/juntas/J-B-DASH-PERFIL-ciclo1.md agent-orchestration/omega/juntas/J-B-DASH-PERFIL-ciclo2.md docs/revisoes/TELAS/B-DASH-PERFIL-ciclo3-dev.md; do git cat-file -e "33345c6ed5021bdd7c3a5162b14c2bc52a2ed39d:$p" && echo "PRESENTE $p"; done`
```
PRESENTE agent-orchestration/omega/reprovacoes/R-B-DASH-PERFIL-2.md
PRESENTE agent-orchestration/omega/reprovacoes/R-B-DASH-PERFIL-1.md
PRESENTE agent-orchestration/omega/juntas/J-B-DASH-PERFIL-ciclo1.md
PRESENTE agent-orchestration/omega/juntas/J-B-DASH-PERFIL-ciclo2.md
PRESENTE docs/revisoes/TELAS/B-DASH-PERFIL-ciclo3-dev.md
```

O objeto do ciclo 1 (`849bf840f2bdecae87b82a17b26adf505d8a2a8e`), o objeto do ciclo 2 (`faad24ce7c00ab4d7610d0784c0beab8a479ddb0`) e o objeto do ciclo 3 (`33345c6ed5021bdd7c3a5162b14c2bc52a2ed39d`) não diferem em nenhum arquivo de `frontend/src` nem de `src`: os ciclos 2 e 3 não tocaram produto, medido por: `git diff --name-only 849bf840f2bdecae87b82a17b26adf505d8a2a8e 33345c6ed5021bdd7c3a5162b14c2bc52a2ed39d -- frontend/src src | wc -l; git diff --name-only faad24ce7c00ab4d7610d0784c0beab8a479ddb0 33345c6ed5021bdd7c3a5162b14c2bc52a2ed39d -- frontend/src src | wc -l`
```
0
0
```

Os seis corpos das cadeiras existem no objeto e são, blob a blob, IDÊNTICOS aos dos objetos dos ciclos 1 e 2, medido por: `for p in .claude/agents/especialistas/jurado-dash-c1-cadeia-de-acesso.md .agents/agents/especialistas/jurado-dash-c1-cadeia-de-acesso.md .claude/agents/especialistas/jurado-dash-c2-troca-de-organizacao.md .agents/agents/especialistas/jurado-dash-c2-troca-de-organizacao.md .claude/agents/especialistas/jurado-dash-c3-regressao-e-escopo.md .agents/agents/especialistas/jurado-dash-c3-regressao-e-escopo.md; do git cat-file -e "33345c6ed5021bdd7c3a5162b14c2bc52a2ed39d:$p" && [ "$(git rev-parse 849bf840f2bdecae87b82a17b26adf505d8a2a8e:$p)" = "$(git rev-parse 33345c6ed5021bdd7c3a5162b14c2bc52a2ed39d:$p)" ] && [ "$(git rev-parse faad24ce7c00ab4d7610d0784c0beab8a479ddb0:$p)" = "$(git rev-parse 33345c6ed5021bdd7c3a5162b14c2bc52a2ed39d:$p)" ] && echo "IDENTICO $p"; done`
```
IDENTICO .claude/agents/especialistas/jurado-dash-c1-cadeia-de-acesso.md
IDENTICO .agents/agents/especialistas/jurado-dash-c1-cadeia-de-acesso.md
IDENTICO .claude/agents/especialistas/jurado-dash-c2-troca-de-organizacao.md
IDENTICO .agents/agents/especialistas/jurado-dash-c2-troca-de-organizacao.md
IDENTICO .claude/agents/especialistas/jurado-dash-c3-regressao-e-escopo.md
IDENTICO .agents/agents/especialistas/jurado-dash-c3-regressao-e-escopo.md
```

O S0 dos espelhos de agentes e skills no objeto está verde, medido por: `node C:/Users/AMP/w-dash/scripts/sync-agent-agents.mjs --check; node C:/Users/AMP/w-dash/scripts/sync-agent-skills.mjs --check; echo ec=$?`
```
[agents-sync] OK — 73 agentes, espelho consistente.
[skills-sync] OK — 12 skills, 39 arquivos, espelho idêntico.
ec=0
```

Os commits próprios do ramo depois do objeto do ciclo 2, excluída a `main` integrada, são três: a ata do ciclo 2 com o plano do ciclo 3, o teste de clique real do ciclo 3 e o registro da pendência `P-FRONT-DOM-MINIMO-TRIPLICADO` apensado pelo orquestrador, medido por: `git log --no-merges --format='%ad %s' --date=short faad24ce7c00ab4d7610d0784c0beab8a479ddb0..33345c6ed5021bdd7c3a5162b14c2bc52a2ed39d ^origin/main | cut -c1-100`
```
2026-10-19 docs(registro): pendência P-FRONT-DOM-MINIMO-TRIPLICADO do plano do ciclo 3, apensada pe
2026-10-19 test(dash-perfil): ciclo 3 prende por clique na ContextSelectionPage real a navegação p
2026-10-19 docs(registro): ata do ciclo 2 (REPROVADO, navegação pós-troca sem teste) e R-B-DASH-P
```

O modelo de mandato do §C7.7 do contrato (P1, P2, P4, P3, P7), verbatim no objeto, medido por: `git show 33345c6ed5021bdd7c3a5162b14c2bc52a2ed39d:CLAUDE.md | tr -d '\r' | sed -n '708,715p'`
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

Você é `inspetor-dash3-opus`, identidade nova, executor Claude Code, modelo Claude Opus, nível menor declarado (o `model: opus` do frontmatter de `inspetor-de-terreno-da-junta`, §C7.6). Declare executor efetivo, modelo, nível, objeto e `mandato_md5` deste arquivo na primeira linha de `insp-dash3-evidencia.md`. Você não vota nem julga mérito: julga se o tabuleiro está limpo (§C7.1-bis), fail-closed. Plano do ciclo 3 (`agent-orchestration/omega/reprovacoes/R-B-DASH-PERFIL-2.md`), atas dos ciclos 1 e 2 e relatório do dev (`docs/revisoes/TELAS/B-DASH-PERFIL-ciclo3-dev.md`) são **A RE-VERIFICAR**, nunca prova herdada. Régua da junta que você libera: PERMISSÃO, unanimidade de 3 com veto, ciclo 3 (a partir do ciclo 3, só defeito de produto grave reprova; todo o resto vira pendência com dono e o bloco mergeia, §C7 item 8(2)), derruba com: `head -1 C:/Users/AMP/w-dash/agent-orchestration/omega/juntas/votos/B-DASH-PERFIL-ciclo3/insp-dash3-evidencia.md | grep -i -E 'executor|Opus|mandato_md5|objeto'`

Item 1 de 3 (objeto, CI, mandatos, corpos, S0): resolva o objeto por `git ls-remote origin refs/heads/fix/dash-perfil` e por `gh pr view 446` (`33345c6ed5021bdd7c3a5162b14c2bc52a2ed39d`); confira os 14 check-runs concluídos e verdes no SHA (ausência, `queued` ou `cancelled` bloqueia o start); rode o pré-voo dos quatro mandatos deste diretório (`cadeira-c1.md`, `cadeira-c2.md`, `cadeira-c3.md`, `inspetor-dash3.md`) até `PRE-VOO OK` com a mesma ferramenta em `C:/Users/AMP/erp-pausa-2026-10-03/redator-dash3/`; confira no objeto, por blob e EOL-neutro, os seis corpos das cadeiras nos dois espelhos e que são os mesmos dos ciclos 1 e 2; reexecute o S0 (`sync-agent-agents.mjs --check` e `sync-agent-skills.mjs --check`) no objeto. Head que andou depois da redação bloqueia até novo pré-voo, derruba com: `grep -i -E 'Item 1|14/14|check-runs|PRE-VOO|seis corpos|S0|LIBERADO|BLOQUEADO' C:/Users/AMP/w-dash/agent-orchestration/omega/juntas/votos/B-DASH-PERFIL-ciclo3/insp-dash3-parecer.md`

Item 2 de 3 (identidades, papéis, troca de executor da C2 e briefing): gere a lista inteira de identidades inelegíveis do objeto e confira por nome a inelegibilidade de `jurado-dash-c1-cdx`, `jurado-dash-c2-opus`, `jurado-dash-c3-opus`, `jurado-dash-c3-cdx`, `jurado-dash-c2-gemini`, `inspetor-dash-cdx`, `redator-dash-cdx`, `planejador-dash-ciclo2-fable`, `dev-dash-ciclo2-opus`, `dev-b-dash-perfil-opus`, `dev-dash-emenda-cdx`, `planejador-dash-emenda-gemini`, `jurado-dash2-c1-opus`, `jurado-dash2-c2-opus`, `jurado-dash2-c3-cdx`, `inspetor-dash2-opus`, `inspetor-dash2b-opus`, `redator-dash2`, `redator-dash2-opus`, `planejador-dash-ciclo3-fable`, `dev-dash-ciclo3-argon`, `redator-dash3-argon`, mais toda identidade de dev, planejador ou achador nomeada nos planos dos ciclos 2 e 3, nas atas dos ciclos 1 e 2 e nos relatórios de dev; nomeie C1 = `jurado-dash3-c1-opus` (Claude Opus), C2 = `jurado-dash3-c2-argon` (Gemini 4 Argon via Gemini CLI — registrando que o plano previa a C2 no Antigravity, que está sem crédito) e C3 = `jurado-dash3-c3-opus` (Claude Opus), e confira que nenhuma coincide com as inelegíveis nem entre si; confira a separação de papéis do §C7.4-bis no ciclo 3 (achou = `jurado-dash2-c2-opus`; auditou e planejou = `planejador-dash-ciclo3-fable`; desenvolveu = `dev-dash-ciclo3-argon`; redigiu mandatos = `redator-dash3-argon`). Confira a PRESENÇA no briefing (§2.8): o plano `R-B-DASH-PERFIL-2.md`, a ata `J-B-DASH-PERFIL-ciclo2.md` (com C3 não votou — executor sem limite P6), a régua do ciclo 3 verbatim nos mandatos, o roteiro das mutações M3b/M3c/M3e/M1a na C2 e a nota obrigatória na C3 de que `P-FRONT-DOM-MINIMO-TRIPLICADO` foi apensada pelo orquestrador. Coincidência de identidade ou briefing incompleto bloqueia, derruba com: `grep -i -E 'Item 2|ineleg|jurado-dash3-c1-opus|jurado-dash3-c2-argon|jurado-dash3-c3-opus|Antigravity|4-bis|briefing|P-FRONT-DOM-MINIMO-TRIPLICADO' C:/Users/AMP/w-dash/agent-orchestration/omega/juntas/votos/B-DASH-PERFIL-ciclo3/insp-dash3-parecer.md`

Item 3 de 3 (terreno): confira a árvore `C:/Users/AMP/w-dash` sem mutação viva, admitindo só os ` M` fantasmas de EOL em `.agents/` e `.claude/` e os outputs deste diretório; exija worktree próprio por cadeira (`C:/Users/AMP/w-jdash3-c1-`, `C:/Users/AMP/w-jdash3-c2-`, `C:/Users/AMP/w-jdash3-c3-`), `npm ci` próprio e zero junction de `node_modules`; se houver contêiner, cluster e rede próprios `jdash3-c1-`, `jdash3-c2-`, `jdash3-c3-`, sem porta publicada. Conte os trabalhos Docker alheios excluindo `erp-*`: no máximo 2 na máquina contando o de cada cadeira; base viva e portas 5432, 6379, 3000, 5173, 5050 e 8899 são proibidas. Declare baseline honesto do terreno, plano de perda de jurado (P3, sucessor de identidade nova) e no máximo dois jurados em paralelo (P5), derruba com: `grep -i -E 'Item 3|w-jdash3-|jdash3-|junction|erp-|5432|6379|3000|5173|5050|8899|P3|P5|baseline' C:/Users/AMP/w-dash/agent-orchestration/omega/juntas/votos/B-DASH-PERFIL-ciclo3/insp-dash3-parecer.md`

Protocolo P1/P2/P3/P4/P7 do §C7.7, verbatim no bloco colado acima, com `<cadeira>` = `insp-dash3` e o parecer no lugar do voto: evidência em `insp-dash3-evidencia.md` após CADA item; `insp-dash3-parecer.md` nasce esqueleto com os três itens EM APURAÇÃO e fecha (LIBERADO, LIBERADO COM RESSALVA ou BLOQUEADO) antes da mensagem final de 1 linha; sucessor re-executa os comandos registrados; três itens exatos; PAUSA grava estado e para; queda em `00-quedas.md` (P6, pelo orquestrador). Únicos outputs: `insp-dash3-evidencia.md` e `insp-dash3-parecer.md` em `C:/Users/AMP/w-dash/agent-orchestration/omega/juntas/votos/B-DASH-PERFIL-ciclo3/`; nunca commit, derruba com: `test -f C:/Users/AMP/w-dash/agent-orchestration/omega/juntas/votos/B-DASH-PERFIL-ciclo3/insp-dash3-parecer.md`

## MEDIDO

Pré-voo deste mandato com as ferramentas copiadas de `origin/chore/mandato-refs-e-preflight` para a subpasta própria `redator-dash3`, com a única adaptação funcional `RAIZ="C:/Users/AMP/w-dash"` no `mandato-preflight.sh`, executado com o cwd no worktree do objeto; o `sed` só troca o caminho real do scratch da sessão pelo marcador, para que nenhum caminho externo entre no mandato, e o nome do campo reservado da ferramenta no AVISO pelo marcador `<campo-reservado>` (o estado dele está na colagem do PR 446 acima), medido por: `cd C:/Users/AMP/w-dash && MANDATO_REFS=<scratch-do-redator>/redator-dash3/mandato-refs.sh bash <scratch-do-redator>/redator-dash3/mandato-preflight.sh C:/Users/AMP/w-dash/agent-orchestration/omega/juntas/votos/B-DASH-PERFIL-ciclo3/00-mandatos/inspetor-dash3.md 446 2>&1 | sed -e "s#<caminho-real-do-scratch>#<scratch-do-redator>#g" -e "s#appro[u-w]ed_head#<campo-reservado>#g"; echo ec=${PIPESTATUS[0]}`
```
COLAGEM    l.6-22: refs do PR #446 confere com a saida atual
AVISO      <campo-reservado> NAO DETERMINAVEL (mandato-refs.sh ec=3) — a proveniencia dos SHAs vale; rode 'bash <scratch-do-redator>/redator-dash3/mandato-refs.sh 446' para ver o que a ferramenta viu. 

PRE-VOO OK — C:/Users/AMP/w-dash/agent-orchestration/omega/juntas/votos/B-DASH-PERFIL-ciclo3/00-mandatos/inspetor-dash3.md
ec=0
```
