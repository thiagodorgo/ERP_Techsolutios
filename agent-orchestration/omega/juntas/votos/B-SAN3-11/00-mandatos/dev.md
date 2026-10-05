# Mandato — dev — B-SAN3-11 (tarefa de NUVEM, ramo fix/dossie-versao-da-vistoria)

## MEDIDO

O plano do bloco existe no ramo, com este numero de linhas medido por: `wc -l < docs/revisoes/SAN3/B-SAN3-11-plano.md`
```
1045
```

O ramo contem a origin/main inteira (merge-base igual a origin/main) no instante do mandato medido por: `[ "$(git merge-base origin/main HEAD)" = "$(git rev-parse origin/main)" ] && echo IGUAL || echo DIFERENTE`
```
IGUAL
```

Os arquivos que o ramo muda contra origin/main antes do trabalho da nuvem medido por: `git diff --name-only origin/main HEAD | paste -sd" "`
```
agent-orchestration/omega/juntas/votos/B-SAN3-11/DEV-relatorio.md docs/revisoes/SAN3/B-SAN3-11-plano.md
```

A linha do bloco no plano-mestre da rodada medido por: `grep -ic "B-SAN3-11" docs/revisoes/SAN3/PLANO_SAN3.md`
```
2
```

## HIPOTESE

O papel e o desenvolvedor do B-SAN3-11, identidade nova dev-san3-11-dossie, que declara na 1a linha do relatorio o papel, a
  identidade, o modelo que rodou e o mandato_md5 deste arquivo (EOL-neutro) derruba com: `head -1 agent-orchestration/omega/juntas/votos/B-SAN3-11/DEV-relatorio.md | grep -ic 'mandato_md5'`

A fonte do trabalho e o plano docs/revisoes/SAN3/B-SAN3-11-plano.md: as entregas E1 a E6 da secao 3, o escopo PERMITIDO e PROIBIDO
  da secao 6 (so os caminhos ali nomeados), os criterios de aceite com a mutacao que os deixa vermelhos da secao 7, a bateria da
  secao 8 e o KPI da secao 9; o dev implementa o plano e nao o reinterpreta — toda divergencia medida vira falsificacao escrita no
  relatorio, nunca desvio silencioso; nada em src, prisma, mobile, .github, lockfiles, CLAUDE.md, AGENTS.md, .claude ou .agents derruba com: `git diff --name-only origin/main HEAD | grep -icE '^(src|prisma|mobile|\.github|\.claude|\.agents)/|^(CLAUDE|AGENTS)\.md$|package-lock'`

A prova e a bateria da secao 8 do plano executada de verdade, com N e forma publicados no relatorio (npm ci proprio na raiz e no
  frontend; check, build e test:smoke do frontend; o guard gerado E4 com a mutacao propria vermelha); o KPI recontado contra o que a
  origin/main publicar no instante do commit, os campos de merge e de head aprovado nulos na autoria derruba com: `grep -ic 'test:smoke' agent-orchestration/omega/juntas/votos/B-SAN3-11/DEV-relatorio.md`

O terreno e a NUVEM (Linux; a sessao do dono em claude.ai/code, nos creditos dele): a 1a secao do relatorio traz uname -a, node -v,
  git rev-parse HEAD e git rev-parse origin/main medidos ali; banco so num cluster Postgres descartavel proprio (pg_ctl, porta livre
  provada), nunca um banco compartilhado; nunca tail -f nem leitura sem fim; timeout em tudo que executa; nada de segredo em
  arquivo, log, argv ou relatorio derruba com: `grep -ic 'uname' agent-orchestration/omega/juntas/votos/B-SAN3-11/DEV-relatorio.md`

Os commits sao Conventional Commits SEM nenhuma linha de atribuicao (a sessao de nuvem acrescenta Co-Authored-By e Claude-Session por
  padrao: desligue ou remova antes do commit), com git diff --cached --check em linha propria antes de cada um; o push e so para o
  ramo fix/dossie-versao-da-vistoria, fast-forward; nunca main, nunca pull request, nunca merge, nunca force derruba com: `git log --format=%B origin/main..HEAD | grep -icE '^(co-authored-by|claude-session)'`

O relatorio agent-orchestration/omega/juntas/votos/B-SAN3-11/DEV-relatorio.md (novo) e incremental, com hora UTC em cada secao, em MEDIDO e HIPOTESE, e e commitado e empurrado a cada entrega
  (o disco da nuvem e efemero: o que nao foi empurrado nao existe); se o dono mandar PAUSA, a tarefa termina o comando em curso, grava
  a secao PAUSA no relatorio (head, feito, falta, proximo comando, meio-escritos), commita, empurra e para sozinha (P7) derruba com: `git ls-remote origin refs/heads/fix/dossie-versao-da-vistoria | wc -l`

## MEDIDO

Pre-voo deste mandato no head do ramo, com o pre-voo do ramo do B-GOV-MANDATO copiado para um arnes local (sem PR: sem colagem do refs) medido por: `bash scripts/mandato-preflight.sh <este-mandato>; echo ec=$?`
```
AVISO      sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)

PRE-VOO OK — C:/Users/AMP/w-nuv11/agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/dev.md
ec=0
head=2c7136f96d2b7907de642919a57bbdbc1131f5b4
utc=2026-10-01T16:47:04Z
```
