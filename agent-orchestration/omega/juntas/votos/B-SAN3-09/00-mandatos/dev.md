# Mandato — dev — B-SAN3-09 (tarefa de NUVEM, ramo feat/bootstrap-platform-admin)

## MEDIDO

O plano do bloco existe no ramo, com este numero de linhas medido por: `wc -l < docs/revisoes/SAN3/B-SAN3-09-plano.md`
```
1550
```

O ramo contem a origin/main inteira (merge-base igual a origin/main) no instante do mandato medido por: `[ "$(git merge-base origin/main HEAD)" = "$(git rev-parse origin/main)" ] && echo IGUAL || echo DIFERENTE`
```
IGUAL
```

Os arquivos que o ramo muda contra origin/main antes do trabalho da nuvem medido por: `git diff --name-only origin/main HEAD | paste -sd" "`
```
agent-orchestration/omega/juntas/votos/B-SAN3-09/DEV-relatorio.md docs/revisoes/SAN3/B-SAN3-09-plano.md
```

A linha do bloco no plano-mestre da rodada medido por: `grep -ic "B-SAN3-09" docs/revisoes/SAN3/PLANO_SAN3.md`
```
3
```

## HIPOTESE

O papel e o desenvolvedor do B-SAN3-09, identidade nova dev-san3-09-bootstrap, que declara na 1a linha do relatorio o papel, a
  identidade, o modelo que rodou e o mandato_md5 deste arquivo (EOL-neutro) derruba com: `head -1 agent-orchestration/omega/juntas/votos/B-SAN3-09/DEV-relatorio.md | grep -ic 'mandato_md5'`

A fonte do trabalho e o plano docs/revisoes/SAN3/B-SAN3-09-plano.md: as entregas E1 a E5 da secao 3, o escopo PERMITIDO e PROIBIDO
  da secao 6, os criterios com mutacao da secao 7, a bateria da secao 8 e o KPI da secao 9; o script do apendice B e o ponto de
  partida declarado do plano, e o dev o confere por execucao em vez de copiar sem medir; nada em src, prisma, frontend, mobile,
  .github, lockfiles, tests/helpers ou no guard tests/db-catalog-write-guard.test.ts derruba com: `git diff --name-only origin/main HEAD | grep -icE '^(src|prisma|frontend|mobile|\.github|tests/helpers)/|db-catalog-write-guard|package-lock'`

A prova e a bateria da secao 8 executada de verdade num cluster Postgres e num Redis descartaveis PROPRIOS (o teste com banco migra e
  provisiona dentro dele), com N e forma publicados; a senha do administrador nunca passa por argv, log, relatorio nem fixture com
  valor real; o teste novo nao contem as palavras de escrita de catalogo que o ratchet lexical proibe, nem em comentario derruba com: `git diff origin/main HEAD -- tests | grep -icE '^[+].*(CREATE ROLE|DROP ROLE|ALTER ROLE)'`

O terreno e a NUVEM (Linux; a sessao do dono em claude.ai/code, nos creditos dele): a 1a secao do relatorio traz uname -a, node -v,
  git rev-parse HEAD e git rev-parse origin/main medidos ali; banco so num cluster Postgres descartavel proprio (pg_ctl, porta livre
  provada), nunca um banco compartilhado; nunca tail -f nem leitura sem fim; timeout em tudo que executa; nada de segredo em
  arquivo, log, argv ou relatorio derruba com: `grep -ic 'uname' agent-orchestration/omega/juntas/votos/B-SAN3-09/DEV-relatorio.md`

Os commits sao Conventional Commits SEM nenhuma linha de atribuicao (a sessao de nuvem acrescenta Co-Authored-By e Claude-Session por
  padrao: desligue ou remova antes do commit), com git diff --cached --check em linha propria antes de cada um; o push e so para o
  ramo feat/bootstrap-platform-admin, fast-forward; nunca main, nunca pull request, nunca merge, nunca force derruba com: `git log --format=%B origin/main..HEAD | grep -icE '^(co-authored-by|claude-session)'`

O relatorio agent-orchestration/omega/juntas/votos/B-SAN3-09/DEV-relatorio.md (novo) e incremental, com hora UTC em cada secao, em MEDIDO e HIPOTESE, e e commitado e empurrado a cada entrega
  (o disco da nuvem e efemero: o que nao foi empurrado nao existe); se o dono mandar PAUSA, a tarefa termina o comando em curso, grava
  a secao PAUSA no relatorio (head, feito, falta, proximo comando, meio-escritos), commita, empurra e para sozinha (P7) derruba com: `git ls-remote origin refs/heads/feat/bootstrap-platform-admin | wc -l`

## MEDIDO

Pre-voo deste mandato no head do ramo, com o pre-voo do ramo do B-GOV-MANDATO copiado para um arnes local (sem PR: sem colagem do refs) medido por: `bash scripts/mandato-preflight.sh <este-mandato>; echo ec=$?`
```
AVISO      sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)

PRE-VOO OK — C:/Users/AMP/w-nuv09/agent-orchestration/omega/juntas/votos/B-SAN3-09/00-mandatos/dev.md
ec=0
head=452b0027d8e6ac0f5b5e62207e67b1b8679da783
utc=2026-10-01T16:47:17Z
```
