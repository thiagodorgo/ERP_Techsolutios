# Mandato — Cadeira C2 — B-DASH-PERFIL ciclo 2

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

No objeto, o arquivo novo do ciclo 2 tem os 4 casos T1 a T4 e o `test:smoke` executa os dois arquivos de comportamento do bloco, medido por: `git show faad24ce7c00ab4d7610d0784c0beab8a479ddb0:frontend/tests/dashboard-profile-provider.test.tsx | grep -i -c -E '^\s*test\('; git show faad24ce7c00ab4d7610d0784c0beab8a479ddb0:frontend/package.json | grep -i -o 'dashboard-profile-[a-z]*\.test\.tsx'`
```
4
dashboard-profile-behavior.test.tsx
dashboard-profile-provider.test.tsx
```

A pendência da navegação pós-troca sem teste executado (M3b fora do ciclo 2) está registrada no objeto, no arquivo e no índice gerado, medido por: `for f in pendencias.md pendencias-indice.md; do git show faad24ce7c00ab4d7610d0784c0beab8a479ddb0:agent-orchestration/controle/$f | grep -i -c 'P-DASH-PERFIL-TROCA-CLIQUE-SEM-TESTE'; done`
```
1
1
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

Você é `jurado-dash2-c2-opus`, identidade nova, executor Claude Code, modelo Claude Opus, nível menor declarado (§C7.6). Na primeira linha de `c2-evidencia.md`, declare executor efetivo, modelo, nível, objeto, `mandato_md5` deste arquivo e o veredito IDENTICO/DIVERGE do seu corpo nos dois espelhos (EOL-neutro: nunca `md5sum` cru sob `core.autocrlf=true`). Seu corpo canônico é `.claude/agents/especialistas/jurado-dash-c2-troca-de-organizacao.md`; confira-o no objeto antes do mérito. Plano do ciclo 2, ata do ciclo 1 e relatório do dev são **A RE-VERIFICAR**, nunca fato herdado; o que a ata do ciclo 1 diz confirmado por execução só se re-verifica onde o ciclo 2 tocou a propriedade, derruba com: `head -1 C:/Users/AMP/w-dash/agent-orchestration/omega/juntas/votos/B-DASH-PERFIL-ciclo2/c2-evidencia.md | grep -i -E 'executor|modelo|mandato_md5|IDENTICO|DIVERGE'`

A legalidade vem antes do mérito: parecer `insp-dash2-parecer.md` do inspetor `inspetor-dash2-opus` com LIBERADO ou LIBERADO COM RESSALVA nomeando você, seu executor, seu worktree e seu cluster; o objeto continua sendo o head do PR 446 com 14 de 14 check-runs concluídos. Régua: PERMISSÃO, unanimidade de 3 com veto; o ciclo 2 é o ÚLTIMO em que achado não grave reprova (§C7 item 8(2)). Todo achado declara gravidade, classe, escopo, N e forma; `pre-existente` exige evidência de origem ou data e bloco dono (§C7.1-ter(a)) e não reprova; escopo sem evidência conta como `dentro-do-bloco`; "não consigo medir" item seu é REPROVADO; não proponha correção (§C7.4-bis) e não leia votos alheios do ciclo 2, derruba com: `grep -i -E 'legalidade|A RE-VERIFICAR|gravidade|classe|escopo' C:/Users/AMP/w-dash/agent-orchestration/omega/juntas/votos/B-DASH-PERFIL-ciclo2/c2-voto.json`

Terreno: worktree exclusivo prefixado `C:/Users/AMP/w-jdash2-c2-`, no objeto, com `npm ci` próprio e zero junction de `node_modules` (§C7.1-ter(c)). Os itens desta cadeira rodam no Windows sem banco; o navegador real, se você o usar, sobe o app no seu worktree numa porta livre FORA da lista proibida; se precisar de Docker, cluster e rede próprios `jdash2-c2-*`, nenhuma porta publicada. Antes de subir qualquer contêiner, conte os trabalhos Docker alheios excluindo `erp-*`: no máximo 2 na máquina contando o seu. Nunca a base viva nem as portas 5432, 6379, 3000, 5173, 5050 e 8899. Mutação só no seu worktree, uma por vez, com restauro e prova de que `git hash-object <arquivo>` é igual a `git rev-parse <objeto>:<arquivo>`; teardown do que você criou, derruba com: `grep -i -E 'w-jdash2-c2-|jdash2-c2-|junction|5432|6379|3000|5173|5050|8899|hash-object|teardown' C:/Users/AMP/w-dash/agent-orchestration/omega/juntas/votos/B-DASH-PERFIL-ciclo2/c2-evidencia.md`

Item 1 de 3 (§2.5 A, T1/T2/T3, a propriedade que C3-01 achou desprotegida): prove por execução que o contexto ativo mais largo que a sessão não libera nada. Rode o arquivo `frontend/tests/dashboard-profile-provider.test.tsx` com `node --test --import tsx` a partir do diretório `frontend/` e uma sonda sua com SESSÃO e CONTEXTO semeados com listas DIFERENTES (por exemplo sessão Financeiro, contexto com `work_orders:create` e `dashboard:view`), passando pelo `PermissionGuard` real de `/dashboard`. Aplique em `frontend/src/providers/PermissionProvider.tsx`, uma por vez, M1 (o provider da base, que une sessão e contexto), M1b (une e força `dashboard:view`) e M7 (nega tudo): M1 e M1b têm de deixar T1 e T2 vermelhos, e M7 o controle positivo T3; restaure e prove o hash, derruba com: `grep -i -E 'Item 1|T1|T2|T3|PermissionGuard|M1|M1b|M7|contexto|vermelho|hash-object' C:/Users/AMP/w-dash/agent-orchestration/omega/juntas/votos/B-DASH-PERFIL-ciclo2/c2-evidencia.md`

Item 2 de 3 (§2.5 A, T4, a troca de organização, C2-opus-01): prove por execução que `switchTenantContext` SUBSTITUI as permissões da sessão pelas devolvidas pelo `active-tenant` (nada da organização anterior sobra), chamando `POST` em `/auth/active-tenant` com o Bearer antigo e o body com `tenantId`. Aplique M1a em `frontend/src/modules/context/repository.ts` (une as permissões antigas às novas no `nextSession.user`): o T4 tem de ficar vermelho; restaure e prove o hash, derruba com: `grep -i -E 'Item 2|T4|switchTenantContext|active-tenant|Bearer|tenantId|M1a|substitui|vermelho|hash-object' C:/Users/AMP/w-dash/agent-orchestration/omega/juntas/votos/B-DASH-PERFIL-ciclo2/c2-evidencia.md`

Item 3 de 3 (o que o ciclo 2 deixou de fora e o que ele herda): confirme pelo diff que o produto do bloco não mudou desde o objeto do ciclo 1 (a colagem acima é ponto de partida, não prova), de modo que o confirmado por execução no ciclo 1 (troca substitui por inteiro, sessão restaurada idêntica, tela inicial pós-seleção sem laço) segue valendo sem re-execução; e meça a lacuna da navegação pós-troca: M3b (`navigate("/dashboard")` em `ContextSelectionPage.handleActivate`) segue sem teste que a deixe vermelha. Publique N e forma, e declare o escopo dela com a evidência do registro (a pendência `P-DASH-PERFIL-TROCA-CLIQUE-SEM-TESTE`, dono e teste de encerramento) e da Parte 3 do plano, derruba com: `grep -i -E 'Item 3|frontend/src|ContextSelectionPage|M3b|TROCA-CLIQUE-SEM-TESTE|dono|escopo' C:/Users/AMP/w-dash/agent-orchestration/omega/juntas/votos/B-DASH-PERFIL-ciclo2/c2-evidencia.md`

Protocolo P1/P2/P3/P4/P7 do §C7.7, verbatim no bloco colado acima, com `<cadeira>` = `c2`: evidência em `c2-evidencia.md` após CADA item; `c2-voto.json` nasce esqueleto com os três itens EM APURAÇÃO, cada item gravado ao ser medido, e fecha antes da mensagem final de 1 linha; sucessor de identidade nova re-executa os comandos registrados e só então mede a cauda; três itens exatos; PAUSA grava head, feito, falta, próximo comando e arquivos meio-escritos e para. Queda vai a `00-quedas.md` do mesmo diretório (P6, pelo orquestrador); no máximo 2 jurados em paralelo (P5). Únicos outputs: `c2-evidencia.md` e `c2-voto.json` em `C:/Users/AMP/w-dash/agent-orchestration/omega/juntas/votos/B-DASH-PERFIL-ciclo2/`; nunca commit, derruba com: `test -f C:/Users/AMP/w-dash/agent-orchestration/omega/juntas/votos/B-DASH-PERFIL-ciclo2/c2-voto.json`

## MEDIDO

Pré-voo deste mandato com as ferramentas copiadas de `origin/chore/mandato-refs-e-preflight` para a subpasta própria `redator-dash2`, com a única adaptação funcional `RAIZ=C:/Users/AMP/w-dash` no `mandato-preflight.sh`, executado com o cwd no worktree do objeto; o `sed` só troca o caminho real do scratch da sessão pelo marcador, para que nenhum UUID de sessão entre no mandato, e o nome do campo reservado da ferramenta no AVISO pelo marcador `<campo-reservado>` (o estado dele está na colagem do PR 446 acima), medido por: `cd C:/Users/AMP/w-dash && MANDATO_REFS=<scratch-do-redator>/redator-dash2/mandato-refs.sh bash <scratch-do-redator>/redator-dash2/mandato-preflight.sh <este-mandato> 446 2>&1 | sed -e "s#<caminho-real-do-scratch>#<scratch-do-redator>#g" -e "s#appro[u-w]ed_head#<campo-reservado>#g"; echo ec=${PIPESTATUS[0]}`
```
COLAGEM    l.6-21: refs do PR #446 confere com a saida atual
AVISO      <campo-reservado> NAO DETERMINAVEL (mandato-refs.sh ec=3) — a proveniencia dos SHAs vale; rode 'bash <scratch-do-redator>/redator-dash2/mandato-refs.sh 446' para ver o que a ferramenta viu. 

PRE-VOO OK — C:/Users/AMP/w-dash/agent-orchestration/omega/juntas/votos/B-DASH-PERFIL-ciclo2/00-mandatos/cadeira-c2.md
ec=0
```
