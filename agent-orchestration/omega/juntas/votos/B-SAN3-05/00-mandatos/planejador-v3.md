# Mandato — planejador-v3 — B-SAN3-05 (tarefa de NUVEM, ramo docs/plano-b-san3-05)

## MEDIDO

O plano do bloco existe no ramo, com este numero de linhas medido por: `wc -l < docs/revisoes/SAN3/B-SAN3-05-plano.md`
```
1913
```

O ramo contem a origin/main inteira (merge-base igual a origin/main) no instante do mandato medido por: `[ "$(git merge-base origin/main HEAD)" = "$(git rev-parse origin/main)" ] && echo IGUAL || echo DIFERENTE`
```
IGUAL
```

Os arquivos que o ramo muda contra origin/main antes do trabalho da nuvem medido por: `git diff --name-only origin/main HEAD | paste -sd" "`
```
agent-orchestration/omega/juntas/votos/B-SAN3-05/PLANEJADOR-v3-relatorio.md docs/revisoes/SAN3/B-SAN3-05-critica-r1.md docs/revisoes/SAN3/B-SAN3-05-critica-r2.md docs/revisoes/SAN3/B-SAN3-05-plano.md
```

A linha do bloco no plano-mestre da rodada medido por: `grep -ic "B-SAN3-05" docs/revisoes/SAN3/PLANO_SAN3.md`
```
5
```

## HIPOTESE

O papel e planejador-mestre, identidade nova planejador-b-san3-05-v3 (nenhuma das identidades que planejaram ou criticaram as versoes
  1 e 2), em Fable por contrato (sem Fable na sessao, Opus com a substituicao declarada na 1a linha; sem Opus, para), que declara na
  1a linha da versao 3 o papel, a identidade, o modelo e o mandato_md5 deste arquivo derruba com: `head -3 docs/revisoes/SAN3/B-SAN3-05-plano.md | grep -ic 'mandato_md5'`

A versao 3 responde a critica docs/revisoes/SAN3/B-SAN3-05-critica-r2.md achado por achado — os bloqueantes (o gerador cego a formas,
  as suites que o guard de escrita de catalogo reprova, a senha que vaza no argv ou no contexto) e os ajustes —, cada resposta com a
  mudanca no plano, o criterio de aceite e a mutacao que o deixa vermelho, medidos de novo no head e nunca herdados da versao 2 nem
  das criticas; o que a versao 3 nao responder fica dito por escrito com o motivo derruba com: `grep -ic 'critica-r2\|crítica r2' docs/revisoes/SAN3/B-SAN3-05-plano.md`

A versao 3 substitui a versao 2 no mesmo arquivo docs/revisoes/SAN3/B-SAN3-05-plano.md (o historico fica no git), mantem o paragrafo
  de abertura em MEDIDO e HIPOTESE com a secao onde mora a propriedade respondida duas vezes, e diz qual e o proximo papel depois dela
  (o critico ja usou as duas rodadas que o corpo dele permite) derruba com: `grep -ic 'proximo papel\|próximo papel' docs/revisoes/SAN3/B-SAN3-05-plano.md`

O terreno e a NUVEM (Linux; a sessao do dono em claude.ai/code, nos creditos dele): a 1a secao do relatorio traz uname -a, node -v,
  git rev-parse HEAD e git rev-parse origin/main medidos ali; banco so num cluster Postgres descartavel proprio (pg_ctl, porta livre
  provada), nunca um banco compartilhado; nunca tail -f nem leitura sem fim; timeout em tudo que executa; nada de segredo em
  arquivo, log, argv ou relatorio derruba com: `grep -ic 'uname' agent-orchestration/omega/juntas/votos/B-SAN3-05/PLANEJADOR-v3-relatorio.md`

Os commits sao Conventional Commits SEM nenhuma linha de atribuicao (a sessao de nuvem acrescenta Co-Authored-By e Claude-Session por
  padrao: desligue ou remova antes do commit), com git diff --cached --check em linha propria antes de cada um; o push e so para o
  ramo docs/plano-b-san3-05, fast-forward; nunca main, nunca pull request, nunca merge, nunca force derruba com: `git log --format=%B origin/main..HEAD | grep -icE '^(co-authored-by|claude-session)'`

O relatorio agent-orchestration/omega/juntas/votos/B-SAN3-05/PLANEJADOR-v3-relatorio.md (novo) e incremental, com hora UTC em cada secao, em MEDIDO e HIPOTESE, e e commitado e empurrado a cada entrega
  (o disco da nuvem e efemero: o que nao foi empurrado nao existe); se o dono mandar PAUSA, a tarefa termina o comando em curso, grava
  a secao PAUSA no relatorio (head, feito, falta, proximo comando, meio-escritos), commita, empurra e para sozinha (P7) derruba com: `git ls-remote origin refs/heads/docs/plano-b-san3-05 | wc -l`

## MEDIDO

Pre-voo deste mandato no head do ramo, com o pre-voo do ramo do B-GOV-MANDATO copiado para um arnes local (sem PR: sem colagem do refs) medido por: `bash scripts/mandato-preflight.sh <este-mandato>; echo ec=$?`
```
AVISO      sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)

PRE-VOO OK — C:/Users/AMP/w-nuv05/agent-orchestration/omega/juntas/votos/B-SAN3-05/00-mandatos/planejador-v3.md
ec=0
head=d5a0d3e4f9aebf647e0726dc39820d56ac9d9db0
utc=2026-10-01T16:47:28Z
```
