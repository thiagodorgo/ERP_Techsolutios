# Mandato — dev do B-SAN3-06b no Codex — B-SAN3-06b (tarefa de NUVEM, ramo fix/console-plataforma-sem-ficcao)

## MEDIDO

O plano do bloco existe no ramo, com este numero de linhas medido por: `wc -l < docs/revisoes/SAN3/B-SAN3-06b-plano.md`
```
1498
```

O ramo contem a origin/main inteira (merge-base igual a origin/main) no instante do mandato medido por: `[ "$(git merge-base origin/main HEAD)" = "$(git rev-parse origin/main)" ] && echo IGUAL || echo DIFERENTE`
```
IGUAL
```

Os arquivos que o ramo muda contra origin/main antes do trabalho da nuvem medido por: `git diff --name-only origin/main HEAD | paste -sd" "`
```
agent-orchestration/codex/comandos/B-SAN3-06b-console-plataforma-sem-ficcao.md agent-orchestration/omega/juntas/votos/B-SAN3-06b/DEV-relatorio.md docs/revisoes/SAN3/B-SAN3-06b-plano.md
```

A linha do bloco no plano-mestre da rodada medido por: `grep -ic "B-SAN3-06b" docs/revisoes/SAN3/PLANO_SAN3.md`
```
4
```

## HIPOTESE

O papel e o dev do B-SAN3-06b, identidade nova dev-b-san3-06b-codex, executado no Codex pela orquestracao hibrida do contrato (o
  AGENTS.md e o espelho do CLAUDE.md; em divergencia vale o CLAUDE.md); nao planejou, nao achou e nao vota; o inspetor, a junta e o
  porteiro ficam com o orquestrador local; o dev declara na 1a linha de conteudo do agent-orchestration/omega/juntas/votos/B-SAN3-06b/DEV-relatorio.md o papel, a identidade, a ferramenta, o modelo e
  o mandato_md5 deste arquivo derruba com: `grep -ic 'mandato_md5' agent-orchestration/omega/juntas/votos/B-SAN3-06b/DEV-relatorio.md`

Item 1 (o terreno de agora): o plano docs/revisoes/SAN3/B-SAN3-06b-plano.md foi medido em outra main; o dev re-mede o §0 inteiro contra a origin/main de agora (as
  premissas, as listas geradas pelos Apendices A a D e a linha de base), confere que nenhuma pendencia que bloqueia este bloco esta aberta
  e que nenhum ramo em voo toca os arquivos do §5, e grava cada divergencia com comando e saida; premissa falsificada que muda o
  desenho e PARADA, gravada e devolvida ao orquestrador, nunca decisao do dev derruba com: `grep -ic 'premissa' agent-orchestration/omega/juntas/votos/B-SAN3-06b/DEV-relatorio.md`

Item 2 (as entregas): E1 a E9 do §3, nos arquivos do §5 e so dentro do PERMITIDO do §6 (nada em src, nada em App.tsx, a ampliacao de
  PlatformLayout.tsx so no PLATFORM_NAV), com os criterios A1 a A20 do §7 cada um visto vermelho com a sua mutacao e verde sem ela, e os
  testes T1 a T40 do §8; toda mutacao por texto prova que aplicou antes de a cor valer, porque o checkout desta maquina e CRLF derruba com: `grep -ic 'mutacao' agent-orchestration/omega/juntas/votos/B-SAN3-06b/DEV-relatorio.md`

Item 3 (bateria, KPI e registro): a bateria do §8 inteira com N e forma por TAP; o KPI pelo §9 e pela secao C3 do contrato
  (blocks_completed igual ao da main mais 1, frontend_smoke_tests por execucao real, app.js so pela saida do kpi-freeze); as pendencias do
  §13 com dono e o indice pelo gerador; commits Conventional com git diff --cached --check como trava, SEM linha de atribuicao nem
  co-autoria, e push so para o ramo fix/console-plataforma-sem-ficcao, nunca main, nunca PR, nunca merge, nunca force derruba com: `grep -ic 'denominador\|# tests' agent-orchestration/omega/juntas/votos/B-SAN3-06b/DEV-relatorio.md`

O terreno e as regras: worktree proprio em caminho curto (por exemplo C:/Users/AMP/w-codex06b), npm ci proprio sem junction de
  node_modules; a arvore principal e os worktrees de outros blocos nunca sao tocados; a base viva erp-postgres 5432 e erp-redis 6379 nunca
  e alvo; nunca tail -f nem leitura sem fim; timeout em tudo que executa; evidencia incremental com hora UTC em cada secao do relatorio
  (P1), commit e push a cada item fechado; sob ordem de PAUSA do dono grava a secao PAUSA (head, feito, falta, proximo comando) e para
  (P7) derruba com: `grep -ic 'UTC' agent-orchestration/omega/juntas/votos/B-SAN3-06b/DEV-relatorio.md`

## MEDIDO

Pre-voo deste mandato no head do ramo, com o pre-voo do ramo do B-GOV-MANDATO copiado para um arnes local (sem PR: sem colagem do refs) medido por: `bash scripts/mandato-preflight.sh <este-mandato>; echo ec=$?`
```
AVISO      sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)

PRE-VOO OK — C:/Users/AMP/w-b06b/agent-orchestration/omega/juntas/votos/B-SAN3-06b/00-mandatos/dev-codex.md
ec=0
head=8e636a2382786d8b4cc8478da1a2789df4593dd9
utc=2026-10-03T02:40:58Z
```
