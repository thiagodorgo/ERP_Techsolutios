# Mandato — Cadeira C3 — B-DASH-PERFIL ciclo 3

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

No objeto, o `test:smoke` executa os três arquivos de comportamento do bloco (`dashboard-profile-behavior.test.tsx`, `dashboard-profile-provider.test.tsx` e `context-selection-page-live.test.tsx`), e o arquivo de teste do `active-tenant` não tem `assert.match`, medido por: `git show 33345c6ed5021bdd7c3a5162b14c2bc52a2ed39d:frontend/package.json | grep -i -o -E '(dashboard-profile-[a-z]*|context-selection-page-live)\.test\.tsx'; git show 33345c6ed5021bdd7c3a5162b14c2bc52a2ed39d:tests/auth-active-tenant-permissions.test.ts | grep -i -c 'assert.match'`
```
dashboard-profile-behavior.test.tsx
dashboard-profile-provider.test.tsx
context-selection-page-live.test.tsx
0
```

Nota obrigatória sobre `P-FRONT-DOM-MINIMO-TRIPLICADO`: a pendência foi apensada pelo ORQUESTRADOR no commit head `33345c6ed5021bdd7c3a5162b14c2bc52a2ed39d` (não pelo dev `dev-dash-ciclo3-argon`, porque o dev a esqueceu), junto com a regeneração do índice, e as três pendências do bloco constam tanto em `pendencias.md` quanto em `pendencias-indice.md`, medido por: `git show --stat=200 --format='%an: %s' 33345c6ed5021bdd7c3a5162b14c2bc52a2ed39d; for f in pendencias.md pendencias-indice.md; do git show 33345c6ed5021bdd7c3a5162b14c2bc52a2ed39d:agent-orchestration/controle/$f | grep -i -c -E 'P-DASH-PERFIL-(SUPER-ADMIN-ATALHO-UI|TROCA-CLIQUE-SEM-TESTE)|P-FRONT-DOM-MINIMO-TRIPLICADO'; done`
```
thiagodorgo: docs(registro): pendência P-FRONT-DOM-MINIMO-TRIPLICADO do plano do ciclo 3, apensada pelo orquestrador (B-DASH-PERFIL)

 agent-orchestration/controle/pendencias-indice.md | 13 +++++++------
 agent-orchestration/controle/pendencias.md        |  7 +++++++
 2 files changed, 14 insertions(+), 6 deletions(-)
3
3
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

Você é `jurado-dash3-c3-opus`, identidade nova, executor Claude Code, modelo Claude Opus, nível menor declarado (§C7.6). Na primeira linha de `c3-evidencia.md`, declare executor efetivo, modelo, nível, objeto, `mandato_md5` deste arquivo e o veredito IDENTICO/DIVERGE do seu corpo nos dois espelhos (EOL-neutro: nunca `md5sum` cru sob `core.autocrlf=true`). Seu corpo canônico é `.claude/agents/especialistas/jurado-dash-c3-regressao-e-escopo.md`; leia-o com `git show 33345c6ed5021bdd7c3a5162b14c2bc52a2ed39d:.claude/agents/especialistas/jurado-dash-c3-regressao-e-escopo.md` antes do mérito, porque ele não existe no diretório da sessão. Plano do ciclo 3 (`agent-orchestration/omega/reprovacoes/R-B-DASH-PERFIL-2.md`), atas dos ciclos 1 e 2 e relatório do dev (`docs/revisoes/TELAS/B-DASH-PERFIL-ciclo3-dev.md`) são **A RE-VERIFICAR**, nunca fato herdado; são inelegíveis por nome `jurado-dash-c1-cdx`, `jurado-dash-c2-opus`, `jurado-dash-c3-opus`, `jurado-dash-c3-cdx`, `jurado-dash-c2-gemini`, `jurado-dash2-c1-opus`, `jurado-dash2-c2-opus`, `jurado-dash2-c3-cdx`, `inspetor-dash-cdx`, `inspetor-dash2-opus`, `inspetor-dash2b-opus`, `planejador-dash-ciclo2-fable`, `planejador-dash-ciclo3-fable`, `dev-dash-ciclo2-opus`, `dev-dash-ciclo3-argon`, `dev-b-dash-perfil-opus`, `dev-dash-emenda-cdx`, `planejador-dash-emenda-gemini`, `redator-dash-cdx`, `redator-dash2-opus`, `redator-dash3-argon`, `inspetor-dash3-opus` e as outras cadeiras do ciclo 3, derruba com: `head -1 C:/Users/AMP/w-dash/agent-orchestration/omega/juntas/votos/B-DASH-PERFIL-ciclo3/c3-evidencia.md | grep -i -E 'executor|modelo|mandato_md5|IDENTICO|DIVERGE'`

A legalidade vem antes do mérito: parecer `insp-dash3-parecer.md` do inspetor `inspetor-dash3-opus` com LIBERADO ou LIBERADO COM RESSALVA nomeando você, seu executor, seu worktree e seu cluster; o objeto continua sendo o head do PR 446 (`33345c6ed5021bdd7c3a5162b14c2bc52a2ed39d`) com 14 de 14 check-runs concluídos. **Régua do ciclo 3 (§C7 item 8(2) e §2.8 de `agent-orchestration/omega/reprovacoes/R-B-DASH-PERFIL-2.md`, verbatim):** a partir do CICLO 3, **só bloqueia defeito de produto grave** — perde dado, vaza dado entre organizações, quebra permissão na autoridade ou erra dinheiro; **todo outro achado** (arnês, forma de teste, registro, mandato, processo) **vira pendência com dono e o bloco mergeia**. Ainda assim, todo achado declara gravidade, classe, escopo, N e forma; `pre-existente` exige evidência de origem ou data e bloco dono (§C7.1-ter(a)); "não consigo medir" item seu é REPROVADO; não proponha correção (§C7.4-bis) e não leia votos alheios do ciclo 3, derruba com: `grep -i -E 'legalidade|A RE-VERIFICAR|gravidade|classe|escopo' C:/Users/AMP/w-dash/agent-orchestration/omega/juntas/votos/B-DASH-PERFIL-ciclo3/c3-voto.json`

Terreno: worktree exclusivo prefixado `C:/Users/AMP/w-jdash3-c3-`, no objeto, com `npm ci` próprio e zero junction de `node_modules` (§C7.1-ter(c)). Conforme §2.7 de `agent-orchestration/omega/reprovacoes/R-B-DASH-PERFIL-2.md`, contêiner Linux não é exigido no ciclo 3 porque nem o backend nem `tests/` da raiz mudaram e a CI Linux (14/14 verde) já rodou no objeto; se precisar de Docker, cluster e rede próprios `jdash3-c3-*`, nenhuma porta publicada e no máximo 2 trabalhos Docker na máquina excluindo `erp-*`. Nunca a base viva nem as portas 5432, 6379, 3000, 5173, 5050 e 8899. Nunca dispare `node --test` ou `tsx --test` sem lista explícita de arquivos na raiz. Mutação só no seu worktree, uma por vez, com restauro e prova de que `git hash-object <arquivo>` é igual a `git rev-parse 33345c6ed5021bdd7c3a5162b14c2bc52a2ed39d:<arquivo>`; teardown do que você criou, derruba com: `grep -i -E 'w-jdash3-c3-|jdash3-c3-|junction|5432|6379|3000|5173|5050|8899|hash-object|teardown' C:/Users/AMP/w-dash/agent-orchestration/omega/juntas/votos/B-DASH-PERFIL-ciclo3/c3-evidencia.md`

Item 1 de 3 (§2.7 e §2.8 de `agent-orchestration/omega/reprovacoes/R-B-DASH-PERFIL-2.md`, regressão e compilação no objeto): execute no seu worktree `npm --prefix frontend run test:smoke` (o relatório do dev mede 1339/1339 com os 4 casos K1–K4 do arquivo novo, A RE-VERIFICAR), `npm --prefix frontend run check`, `npm --prefix frontend run build`, `npm run check`, `npm run lint` e `npm run build`, publicando N, pass, fail e skip. Faça um vermelho-controle próprio em `frontend/src/pages/ContextSelectionPage.tsx` (por exemplo M3b) contra `npm --prefix frontend run test:smoke` provando que o `test:smoke` executa `frontend/tests/context-selection-page-live.test.tsx` e fica vermelho, restaure e prove o hash do blob, derruba com: `grep -i -E 'Item 1|test:smoke|1339|check|lint|build|vermelho|hash-object' C:/Users/AMP/w-dash/agent-orchestration/omega/juntas/votos/B-DASH-PERFIL-ciclo3/c3-evidencia.md`

Item 2 de 3 (§2.6, §2.7 e §2.8 de `agent-orchestration/omega/reprovacoes/R-B-DASH-PERFIL-2.md`, escopo do delta do ciclo 3 e nota obrigatória da pendência): meça o escopo no **delta do ciclo 3** (`git log --no-merges --name-only faad24ce7c00ab4d7610d0784c0beab8a479ddb0..33345c6ed5021bdd7c3a5162b14c2bc52a2ed39d ^origin/main`) e comprove que nenhum arquivo PROIBIDO foi tocado (`frontend/src/**`, `src/**`, `frontend/tests/helpers/**`, `frontend/tests/work-orders-page-live.test.tsx`, `frontend/tests/patios-dossie-versao.smoke.test.tsx`, `frontend/tests/dashboard-profile-behavior.test.tsx`, `frontend/tests/dashboard-profile-provider.test.tsx`, `tests/**`, `prisma/**`, `Kpis/**`, lockfiles), que 0 linha de teste foi removida (`git diff -U0 faad24ce7c00ab4d7610d0784c0beab8a479ddb0..33345c6ed5021bdd7c3a5162b14c2bc52a2ed39d -- frontend/tests tests | grep -i -c -E '^-[^-]'` = 0), que 0 dependência de DOM entrou e que `frontend/package.json` só mudou na linha `"test:smoke"`. **Nota obrigatória a registrar e conferir:** a pendência `P-FRONT-DOM-MINIMO-TRIPLICADO` foi apensada pelo **ORQUESTRADOR** no commit `33345c6ed5021bdd7c3a5162b14c2bc52a2ed39d`, não pelo dev (`dev-dash-ciclo3-argon`), porque o dev a esqueceu; confira que ela consta em `agent-orchestration/controle/pendencias.md` e que `agent-orchestration/controle/pendencias-indice.md` bate com a regeneração por `python agent-orchestration/controle/gerar-indice-pendencias.py` (pela régua do ciclo 3, o apensamento pelo orquestrador é achado de processo não grave e não bloqueia), derruba com: `grep -i -E 'Item 2|PERMITIDO|PROIBIDO|frontend/src|test:smoke|P-FRONT-DOM-MINIMO-TRIPLICADO|orquestrador|pendencias-indice' C:/Users/AMP/w-dash/agent-orchestration/omega/juntas/votos/B-DASH-PERFIL-ciclo3/c3-evidencia.md`

Item 3 de 3 (§2.8 de `agent-orchestration/omega/reprovacoes/R-B-DASH-PERFIL-2.md`, presença do arquivo A no `test:smoke` e check-runs da CI concluídos no objeto): comprove que `context-selection-page-live.test.tsx` está presente exatamente 1 vez em `frontend/package.json` na linha `"test:smoke"`, que os espelhos `node scripts/sync-agent-agents.mjs --check` e `node scripts/sync-agent-skills.mjs --check` passam e que todos os 14 check-runs de `33345c6ed5021bdd7c3a5162b14c2bc52a2ed39d` em `gh api repos/thiagodorgo/ERP_Techsolutios/commits/33345c6ed5021bdd7c3a5162b14c2bc52a2ed39d/check-runs` estão `completed` e `success`, derruba com: `grep -i -E 'Item 3|context-selection-page-live|check-runs|14|completed|success|sync-agent' C:/Users/AMP/w-dash/agent-orchestration/omega/juntas/votos/B-DASH-PERFIL-ciclo3/c3-evidencia.md`

Protocolo P1/P2/P3/P4/P7 do §C7.7, verbatim no bloco colado acima, com `<cadeira>` = `c3`: evidência em `c3-evidencia.md` após CADA item; `c3-voto.json` nasce esqueleto com os três itens EM APURAÇÃO, cada item gravado ao ser medido, e fecha antes da mensagem final de 1 linha; sucessor de identidade nova re-executa os comandos registrados e só então mede a cauda; três itens exatos; PAUSA grava head, feito, falta, próximo comando e arquivos meio-escritos e para. Queda vai a `00-quedas.md` do mesmo diretório (P6, pelo orquestrador); no máximo 2 jurados em paralelo (P5). Únicos outputs: `c3-evidencia.md` e `c3-voto.json` em `C:/Users/AMP/w-dash/agent-orchestration/omega/juntas/votos/B-DASH-PERFIL-ciclo3/`; nunca commit, derruba com: `test -f C:/Users/AMP/w-dash/agent-orchestration/omega/juntas/votos/B-DASH-PERFIL-ciclo3/c3-voto.json`

## MEDIDO

Pré-voo deste mandato com as ferramentas copiadas de `origin/chore/mandato-refs-e-preflight` para a subpasta própria `redator-dash3`, com a única adaptação funcional `RAIZ="C:/Users/AMP/w-dash"` no `mandato-preflight.sh`, executado com o cwd no worktree do objeto; o `sed` só troca o caminho real do scratch da sessão pelo marcador, para que nenhum caminho externo entre no mandato, e o nome do campo reservado da ferramenta no AVISO pelo marcador `<campo-reservado>` (o estado dele está na colagem do PR 446 acima), medido por: `cd C:/Users/AMP/w-dash && MANDATO_REFS=<scratch-do-redator>/redator-dash3/mandato-refs.sh bash <scratch-do-redator>/redator-dash3/mandato-preflight.sh C:/Users/AMP/w-dash/agent-orchestration/omega/juntas/votos/B-DASH-PERFIL-ciclo3/00-mandatos/cadeira-c3.md 446 2>&1 | sed -e "s#<caminho-real-do-scratch>#<scratch-do-redator>#g" -e "s#appro[u-w]ed_head#<campo-reservado>#g"; echo ec=${PIPESTATUS[0]}`
```
COLAGEM    l.6-22: refs do PR #446 confere com a saida atual
AVISO      <campo-reservado> NAO DETERMINAVEL (mandato-refs.sh ec=3) — a proveniencia dos SHAs vale; rode 'bash <scratch-do-redator>/redator-dash3/mandato-refs.sh 446' para ver o que a ferramenta viu. 

PRE-VOO OK — C:/Users/AMP/w-dash/agent-orchestration/omega/juntas/votos/B-DASH-PERFIL-ciclo3/00-mandatos/cadeira-c3.md
ec=0
```
