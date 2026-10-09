# Mandato — dev-b-san3-05 — B-SAN3-05 (tarefa de NUVEM, ramo fix/runtime-role-sem-bypass)

## MEDIDO

O plano do bloco existe no ramo, com este numero de linhas medido por: `wc -l < docs/revisoes/SAN3/B-SAN3-05-plano.md`
```
1121
```

O ramo contem a origin/main inteira (merge-base igual a origin/main) no instante do mandato medido por: `[ "$(git merge-base origin/main HEAD)" = "$(git rev-parse origin/main)" ] && echo IGUAL || echo DIFERENTE`
```
IGUAL
```

Os arquivos que o ramo muda contra origin/main antes do trabalho da nuvem medido por: `git diff --name-only origin/main HEAD | paste -sd" "`
```
agent-orchestration/codex/comandos/B-SAN3-05-runtime-role-sem-bypass.md agent-orchestration/omega/juntas/votos/B-SAN3-05/00-mandatos/planejador-v3.md agent-orchestration/omega/juntas/votos/B-SAN3-05/DEV-relatorio.md agent-orchestration/omega/juntas/votos/B-SAN3-05/PLANEJADOR-v3-relatorio.md docs/revisoes/SAN3/B-SAN3-05-critica-r1.md docs/revisoes/SAN3/B-SAN3-05-critica-r2.md docs/revisoes/SAN3/B-SAN3-05-plano.md
```

A linha do bloco no plano-mestre da rodada medido por: `grep -ic "B-SAN3-05" docs/revisoes/SAN3/PLANO_SAN3.md`
```
5
```

## HIPOTESE

O papel e o desenvolvedor do B-SAN3-05, identidade nova dev-b-san3-05 (nenhuma das identidades que planejaram ou criticaram as
  versoes 1, 2 e 3 do plano), que declara na 1a linha do relatorio o papel, a identidade, o modelo que rodou e o mandato_md5 deste
  arquivo (EOL-neutro) derruba com: `head -1 agent-orchestration/omega/juntas/votos/B-SAN3-05/DEV-relatorio.md | grep -ic 'mandato_md5'`

A fonte do trabalho e o plano v3 docs/revisoes/SAN3/B-SAN3-05-plano.md, que o §15 dele manda implementar sem julgar a validade dos
  achados: o comando agent-orchestration/codex/comandos/B-SAN3-05-runtime-role-sem-bypass.md (colado do §14), as entregas do §3, a
  modelagem do §4 (a trava e o Apendice E byte a byte e o script e o Apendice C byte a byte, cada um com o md5 que o plano publica),
  os arquivos e o espelho do §5, o escopo PERMITIDO e PROIBIDO do §6, os criterios A1 a A24 do §7 cada um com a mutacao que o deixa
  vermelho, os testes T1 a T16 e a bateria do §8, e o KPI do §9; toda divergencia medida entre o plano e o terreno vira falsificacao
  escrita no relatorio, nunca desvio silencioso derruba com: `git diff --name-only origin/main HEAD | grep -icE '^(prisma|mobile|frontend|\.github|\.claude|\.agents)/|^(CLAUDE|AGENTS)\.md$|package-lock'`

A prova e a bateria do §8 executada de verdade num cluster Postgres descartavel proprio (porta livre provada), com o papel de runtime
  real criado pelo script v3 (NOSUPERUSER NOBYPASSRLS), N e forma publicados no relatorio; a senha do papel nunca passa por argv, log,
  relatorio, fixture com valor real nem variavel de ambiente gravada em arquivo (a propria critica r2 pegou isso na v2); as 27 fixtures
  de mutacao do Apendice D exercidas e cada criterio do §7 visto vermelho com a sua mutacao; o guard de escrita de catalogo
  tests/db-catalog-write-guard.test.ts intocado e verde derruba com: `grep -icE 'senha|password' agent-orchestration/omega/juntas/votos/B-SAN3-05/DEV-relatorio.md`

O KPI (§9) e recontado contra o que a origin/main publicar no instante do commit, com as trilhas que o bloco nao tocou carregadas com
  nota, os campos de commit de merge e de head aprovado nulos na autoria, e Kpis/app.js so por node scripts/kpi-freeze.mjs; a junta
  (unanimidade de 3 com agente-dba-guardiao, agente-secops e guardiao-fail-closed, §10) e o inspetor acontecem depois, localmente, e
  nao sao do dev derruba com: `git log -1 --format=%s -- Kpis/kpis-latest.json | grep -ic 'san3-05'`

O terreno e a NUVEM (Linux; a sessao do dono em claude.ai/code, nos creditos dele): a 1a secao do relatorio traz uname -a, node -v,
  git rev-parse HEAD e git rev-parse origin/main medidos ali; banco so num cluster Postgres descartavel proprio (pg_ctl, porta livre
  provada), nunca um banco compartilhado; nunca tail -f nem leitura sem fim; timeout em tudo que executa; nada de segredo em arquivo,
  log, argv ou relatorio derruba com: `grep -ic 'uname' agent-orchestration/omega/juntas/votos/B-SAN3-05/DEV-relatorio.md`

Os commits sao Conventional Commits SEM nenhuma linha de atribuicao (a sessao de nuvem acrescenta Co-Authored-By e Claude-Session por
  padrao: desligue ou remova antes do commit), com autor thiagodorgo e o e-mail noreply do GitHub do dono, com git diff --cached --check
  em linha propria antes de cada um; o push e so para o ramo fix/runtime-role-sem-bypass, fast-forward; nunca main, nunca pull
  request, nunca merge, nunca force derruba com: `git log --format=%B origin/main..HEAD | grep -icE '^(co-authored-by|claude-session)'`

O relatorio agent-orchestration/omega/juntas/votos/B-SAN3-05/DEV-relatorio.md (ja existe como esqueleto) e incremental, com hora UTC
  em cada secao, em MEDIDO e HIPOTESE, commitado e empurrado a cada entrega (o disco da nuvem e efemero: o que nao foi empurrado nao
  existe); se o dono mandar PAUSA, a tarefa termina o comando em curso, grava a secao PAUSA no relatorio (head, feito, falta, proximo
  comando, meio-escritos), commita, empurra e para sozinha (P7) derruba com: `git ls-remote origin refs/heads/fix/runtime-role-sem-bypass | wc -l`

## MEDIDO

Pre-voo deste mandato no head do ramo, com o pre-voo do ramo do B-GOV-MANDATO copiado para um arnes local (sem PR: sem colagem do refs) medido por: `bash scripts/mandato-preflight.sh <este-mandato>; echo ec=$?`
```
AVISO      sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)

PRE-VOO OK — C:/Users/AMP/w-nuv05d/agent-orchestration/omega/juntas/votos/B-SAN3-05/00-mandatos/dev.md
ec=0
head=d7289e289a2565701c0f39f521a05ccb4e023a46
utc=2026-10-02T03:19:57Z
```
