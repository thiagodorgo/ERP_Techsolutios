# Mandato — dev-pausa-emenda — PR 397 (B-GOV-PAUSA, D-PAUSA-GRAVA-E-PARA)

## MEDIDO

A decisao do dono esta registrada no ramo do PR 397 medido por: `grep -ic '^## D-PAUSA-GRAVA-E-PARA' C:/Users/AMP/w-pausa/agent-orchestration/controle/decisoes.md`
```
1
```

Estado do PR 397 no instante do lancamento, pela ferramenta do B-GOV-MANDATO medido por: `bash scripts/mandato-refs.sh 397`
```
# refs do PR #397 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato
# gerado em: 2026-10-01T14:19Z · repo: thiagodorgo/ERP_Techsolutios

ramo:            docs/gov-pausa-grava-e-para
base:            origin/main
estado:          OPEN | rascunho=false | MERGEABLE
head do PR:      c9eda7bb64a6ff352a35e6a4afcc071bc91530fb
merge-base:      5b6e103638f398d6074eecc5daebdf2d3bcd2252
merge commit:    <ainda nao mergeado>
check-runs:      total=14 nao-verdes=0 pendentes=0
approved_head:   AUSENTE — nenhuma ata nomeia nem menciona #397
                 (a junta nao votou, ou a ata nao esta em origin/main nem no head do PR)
```

O merge-base do ramo com origin/main e igual a origin/main medido por: `cd C:/Users/AMP/w-pausa && [ "$(git merge-base origin/main HEAD)" = "$(git rev-parse origin/main)" ] && echo IGUAL || echo DIFERENTE`
```
IGUAL
```

Os arquivos que o ramo muda contra origin/main medido por: `git -C C:/Users/AMP/w-pausa diff --name-only origin/main HEAD | paste -sd' '`
```
AGENTS.md CLAUDE.md agent-orchestration/controle/decisoes.md agent-orchestration/docs/conhecimento-de-terreno.md agent-orchestration/omega/juntas/BRIEFING-B-GOV-PAUSA.md agent-orchestration/omega/juntas/PROTOCOLO-JUNTA-RESILIENTE.md agent-orchestration/omega/juntas/votos/B-GOV-PAUSA/00-mandatos/planejador.md docs/revisoes/SAN3/B-GOV-PAUSA-plano.md
```

As linhas que o ramo acrescenta e remove em CLAUDE.md e em AGENTS.md sao as mesmas medido por: `cd C:/Users/AMP/w-pausa && diff <(git diff -U0 origin/main HEAD -- CLAUDE.md | grep -i '^[+-]' | grep -iv '^[+-][+-]') <(git diff -U0 origin/main HEAD -- AGENTS.md | grep -i '^[+-]' | grep -iv '^[+-][+-]') >/dev/null && echo IDENTICAS || echo DIFERENTES`
```
IDENTICAS
```

Ocorrencias de P7 por arquivo tocado medido por: `cd C:/Users/AMP/w-pausa && grep -ic 'P7' CLAUDE.md AGENTS.md agent-orchestration/omega/juntas/PROTOCOLO-JUNTA-RESILIENTE.md agent-orchestration/controle/decisoes.md agent-orchestration/docs/conhecimento-de-terreno.md`
```
CLAUDE.md:5
AGENTS.md:5
agent-orchestration/omega/juntas/PROTOCOLO-JUNTA-RESILIENTE.md:4
agent-orchestration/controle/decisoes.md:2
agent-orchestration/docs/conhecimento-de-terreno.md:1
```

Precedentes de KPI na main: commits que tocaram Kpis/kpis-latest.json cujo assunto fala em sem teto (o B-GOV-SEM-TETO, que mudou o contrato) e em conhecimento de terreno (o registro do PR 396) medido por: `git -C C:/Users/AMP/w-pausa log origin/main --format=%s -- Kpis/kpis-latest.json | grep -ic 'sem teto'; git -C C:/Users/AMP/w-pausa log origin/main --format=%s -- Kpis/kpis-latest.json | grep -ic 'conhecimento de terreno'`
```
1
0
```

Os tres corpos de cadeira do B-GOV-SEM-TETO existem na main (modelo de competencia para uma junta de transcricao de decisao do dono) medido por: `ls C:/Users/AMP/w-pausa/.claude/agents/especialistas/ | grep -ic 'semteto'`
```
3
```

## HIPOTESE

O papel e o desenvolvedor da emenda do B-GOV-PAUSA, identidade nova dev-pausa-emenda (o orquestrador escreveu o texto e
  nao o emenda; o planejador mediu e nao o emenda), que declara na 1a linha do relatorio e da mensagem final o papel, a
  identidade, o modelo e o mandato_md5 deste arquivo derruba com: `head -1 C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/DEV397.md | grep -ic 'mandato_md5'`

A fonte do trabalho e o plano docs/revisoes/SAN3/B-GOV-PAUSA-plano.md (secoes 5, 6 e 7) e o briefing
  agent-orchestration/omega/juntas/BRIEFING-B-GOV-PAUSA.md; o dev implementa a PROPRIEDADE de cada achado dentro do bloco
  (S-01, S-02, S-03, S-04, S-05, S-07 e S-11), nunca a redacao do plano, e nao julga a validade do achado; toda frase nova
  e elaboracao do dev, declarada como tal num paragrafo datado da entrada D-PAUSA-GRAVA-E-PARA de
  agent-orchestration/controle/decisoes.md, nunca apresentada como palavra do dono derruba com: `grep -ic 'P1–P6, inline\|seis normas' C:/Users/AMP/w-pausa/CLAUDE.md C:/Users/AMP/w-pausa/AGENTS.md`

O espelho e completo no mesmo commit: CLAUDE.md e AGENTS.md acrescentam e removem as mesmas linhas no item 7 do §C7, o modelo de
  mandato e identico nos dois contratos e em agent-orchestration/omega/juntas/PROTOCOLO-JUNTA-RESILIENTE.md, e o lado Codex
  .agents/agents/README.md descreve P7 com o mesmo comportamento derruba com: `grep -ic 'P7' C:/Users/AMP/w-pausa/.agents/agents/README.md`

Todo sujeito que P7 nomeia tem destino nomeado que existe na ref (o agente com arquivo de evidencia e o agente sem ele — dev,
  planejador, fabrica), e o roteiro de retomada tem destino que existe na ref; nenhum destino citado e um artefato inexistente,
  como o custo/trilha do texto de origem derruba com: `cd C:/Users/AMP/w-pausa && git grep -i -c 'custo/trilha' HEAD -- CLAUDE.md AGENTS.md agent-orchestration/omega/juntas/PROTOCOLO-JUNTA-RESILIENTE.md | wc -l`

As pendencias do plano (E2c) entram em agent-orchestration/controle/pendencias.md com N, forma, causa e dono — a do obituario dos
  tres votantes do B-GOV-SEM-TETO (pre-existente) e a da escada de modelo do §C7.6-bis (nota S-10) —, com o indice
  agent-orchestration/controle/pendencias-indice.md regenerado SO por agent-orchestration/controle/gerar-indice-pendencias.py derruba com: `grep -ic '^## P-GOV-PAUSA' C:/Users/AMP/w-pausa/agent-orchestration/controle/pendencias.md`

O KPI (E3) segue a secao 6 do plano: blocks_completed recontado contra o que a origin/main publicar no instante do commit, as tres
  trilhas carregadas com nota, pr 397, os campos de commit de merge e de head aprovado nulos na autoria, entrada nova no
  history JSON e em Kpis/kpis-history.md, Kpis/app.js so por node scripts/kpi-freeze.mjs, e os guards
  tests/kpi-dashboard-charts.test.ts, tests/kpi-dashboard-contraste.test.ts e tests/kpi-achados-paridade.test.ts executados com
  npm ci proprio, com N publicado derruba com: `cd C:/Users/AMP/w-pausa && git log -1 --format=%s -- Kpis/kpis-latest.json | grep -ic 'pausa'`

O registro (E4 do dev): o paragrafo datado em decisoes.md e a linha do bloco em agent-orchestration/docs/status-geral.md; o escopo e
  exatamente a tabela da secao 7 do plano e o PROIBIDO dela (src, tests, prisma, migrations, frontend, mobile, .github, infra, .env,
  lockfiles, scripts, corpos de agente, EXECUTION_MODEL.md, atas e votos de outro bloco, os worktrees alheios) derruba com: `cd C:/Users/AMP/w-pausa && git diff --name-only origin/main HEAD | grep -icE '^(src|tests|prisma|migrations|frontend|mobile|\.github|infra|scripts|\.claude|\.agents/agents/especialistas)/'`

O terreno: worktree proprio detached C:/Users/AMP/w-dev397 no head do ramo docs/gov-pausa-grava-e-para (caminho curto; conferir que
  existe), npm ci proprio sem junction, MSYS_NO_PATHCONV nunca exportada, sem tail -f, timeout no que executa, base viva erp-postgres
  5432 e erp-redis 6379 nunca alvo; commits Conventional sem linha de atribuicao, git diff --cached --check em linha propria antes de
  cada commit, push fast-forward com git push origin HEAD:docs/gov-pausa-grava-e-para (recusado, para e reporta); worktree removido
  pelo nome ao fim; relatorio incremental com hora em C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/DEV397.md;
  se receber PAUSA, grava a secao PAUSA no relatorio (head, feito, falta, proximo comando, meio-escritos) e para sozinho derruba com: `git -C C:/Users/AMP/Documents/GitHub/ERP_Techsolutios worktree list | grep -ic 'w-dev397'`

## MEDIDO

Pre-voo deste mandato no head do lancamento, com o pre-voo do ramo do B-GOV-MANDATO copiado para o arnes medido por: `cd C:/Users/AMP/w-pv397 && bash scripts/mandato-preflight.sh <este-mandato> 397; echo ec=$?`
```
COLAGEM    l.11-24: refs do PR #397 confere com a saida atual

PRE-VOO OK — C:/Users/AMP/w-pausa/agent-orchestration/omega/juntas/votos/B-GOV-PAUSA/00-mandatos/dev-pausa-emenda.md
ec=0
head=4a0a4fe8150292ae9a3922b71e251547012cc9e0
utc=2026-10-01T14:19:58Z
```
