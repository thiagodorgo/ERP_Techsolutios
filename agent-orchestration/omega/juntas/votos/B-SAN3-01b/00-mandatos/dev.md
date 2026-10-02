# Mandato — dev-b-san3-01b — B-SAN3-01b (tarefa de NUVEM, ramo fix/web-guarda-por-alcance-e-estado-da-pagina)

## MEDIDO

O plano do bloco existe no ramo, com este numero de linhas medido por: `wc -l < docs/revisoes/SAN3/B-SAN3-01b-plano.md`
```
2070
```

O ramo contem a origin/main inteira (merge-base igual a origin/main) no instante do mandato medido por: `[ "$(git merge-base origin/main HEAD)" = "$(git rev-parse origin/main)" ] && echo IGUAL || echo DIFERENTE`
```
IGUAL
```

Os arquivos que o ramo muda contra origin/main antes do trabalho da nuvem medido por: `git diff --name-only origin/main HEAD | paste -sd" "`
```
agent-orchestration/codex/comandos/B-SAN3-01b-web-guarda-por-alcance-e-estado-da-pagina.md agent-orchestration/omega/juntas/votos/B-SAN3-01b/DEV-relatorio.md docs/revisoes/SAN3/B-SAN3-01b-plano.md
```

A linha do bloco no plano-mestre da rodada medido por: `grep -ic "B-SAN3-01b" docs/revisoes/SAN3/PLANO_SAN3.md`
```
1
```

## HIPOTESE

O papel e o desenvolvedor do B-SAN3-01b, identidade nova dev-b-san3-01b (nao e o planejador do bloco nem nenhuma identidade dos
  blocos em voo), que declara na 1a linha do relatorio o papel, a identidade, o modelo que rodou e o mandato_md5 deste arquivo
  (EOL-neutro) derruba com: `head -1 agent-orchestration/omega/juntas/votos/B-SAN3-01b/DEV-relatorio.md | grep -ic 'mandato_md5'`

A fonte do trabalho e o plano docs/revisoes/SAN3/B-SAN3-01b-plano.md, que o dev implementa sem reinterpretar: o comando
  agent-orchestration/codex/comandos/B-SAN3-01b-web-guarda-por-alcance-e-estado-da-pagina.md (colado do §14), as entregas do §3,
  o contrato e a modelagem do §4, os arquivos e a regra do espelho do §5, o escopo PERMITIDO e PROIBIDO do §6 (so os caminhos ali
  nomeados — nada em src, prisma, mobile, .github, lockfiles, CLAUDE.md, AGENTS.md, .claude ou .agents), os criterios do §7 cada um
  com a mutacao que o deixa vermelho, os testes e a bateria do §8 (baseline N medido, meta M maior ou igual a 2N) e o KPI do §9;
  toda divergencia medida entre o plano e o terreno vira falsificacao escrita no relatorio, nunca desvio silencioso derruba com: `git diff --name-only origin/main HEAD | grep -icE '^(src|prisma|mobile|\.github|\.claude|\.agents)/|^(CLAUDE|AGENTS)\.md$|package-lock'`

A prova e a bateria do §8 executada de verdade (npm ci proprio na raiz e no frontend; check, build e os testes do frontend com N e
  forma publicados; cada criterio do §7 visto vermelho com a sua mutacao e verde sem ela, com a saida colada); a propriedade do bloco
  — a web nao fabrica dado: todo ramo de erro vira ESTADO, nunca DADO, e a guarda vale por alcance e pelo estado da pagina — provada
  por execucao, nunca por leitura derruba com: `grep -ic 'mutacao\|mutação' agent-orchestration/omega/juntas/votos/B-SAN3-01b/DEV-relatorio.md`

O KPI (§9) e recontado contra o que a origin/main publicar no instante do commit, com as trilhas que o bloco nao tocou carregadas com
  nota, os campos de commit de merge e de head aprovado nulos na autoria, e Kpis/app.js so por node scripts/kpi-freeze.mjs; a junta
  (unanimidade de 3, §10) e o inspetor acontecem depois, localmente, e nao sao do dev derruba com: `git log -1 --format=%s -- Kpis/kpis-latest.json | grep -ic 'san3-01b'`

O terreno e a NUVEM (Linux; a sessao do dono em claude.ai/code, nos creditos dele): a 1a secao do relatorio traz uname -a, node -v,
  git rev-parse HEAD e git rev-parse origin/main medidos ali; este bloco e so de frontend e nao precisa de banco; nunca tail -f nem
  leitura sem fim; timeout em tudo que executa; nada de segredo em arquivo, log, argv ou relatorio; outra sessao de nuvem trabalha
  no mesmo repositorio em outro ramo (fix/runtime-role-sem-bypass, so backend) e este bloco nao toca os arquivos dela derruba com: `grep -ic 'uname' agent-orchestration/omega/juntas/votos/B-SAN3-01b/DEV-relatorio.md`

Os commits sao Conventional Commits SEM nenhuma linha de atribuicao (a sessao de nuvem acrescenta Co-Authored-By e Claude-Session por
  padrao: desligue ou remova antes do commit), com autor thiagodorgo e o e-mail noreply do GitHub do dono, com git diff --cached --check
  em linha propria antes de cada um; o push e so para o ramo fix/web-guarda-por-alcance-e-estado-da-pagina, fast-forward; nunca
  main, nunca pull request, nunca merge, nunca force derruba com: `git log --format=%B origin/main..HEAD | grep -icE '^(co-authored-by|claude-session)'`

O relatorio agent-orchestration/omega/juntas/votos/B-SAN3-01b/DEV-relatorio.md (ja existe como esqueleto) e incremental, com hora UTC
  em cada secao, em MEDIDO e HIPOTESE, commitado e empurrado a cada entrega (o disco da nuvem e efemero: o que nao foi empurrado nao
  existe); se o dono mandar PAUSA, a tarefa termina o comando em curso, grava a secao PAUSA no relatorio (head, feito, falta, proximo
  comando, meio-escritos), commita, empurra e para sozinha (P7) derruba com: `git ls-remote origin refs/heads/fix/web-guarda-por-alcance-e-estado-da-pagina | wc -l`

## MEDIDO

Pre-voo deste mandato no head do ramo, com o pre-voo do ramo do B-GOV-MANDATO copiado para um arnes local (sem PR: sem colagem do refs) medido por: `bash scripts/mandato-preflight.sh <este-mandato>; echo ec=$?`
```
AVISO      sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)

PRE-VOO OK — C:/Users/AMP/w-nuv01b/agent-orchestration/omega/juntas/votos/B-SAN3-01b/00-mandatos/dev.md
ec=0
head=ad08866136fd37d3fad3067a9d667a14145c7c52
utc=2026-10-02T05:26:44Z
```
