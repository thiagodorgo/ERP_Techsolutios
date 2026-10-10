# Mandato — planejador-b-gov-pausa — PR 397 (B-GOV-PAUSA, D-PAUSA-GRAVA-E-PARA)

## MEDIDO

A decisao do dono esta registrada no ramo do PR 397 medido por: `grep -ic '^## D-PAUSA-GRAVA-E-PARA' C:/Users/AMP/w-pausa/agent-orchestration/controle/decisoes.md`
```
1
```

Estado do PR 397 no instante do lancamento, pela ferramenta do B-GOV-MANDATO medido por: `bash scripts/mandato-refs.sh 397`
```
# refs do PR #397 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato
# gerado em: 2026-10-01T13:34Z · repo: thiagodorgo/ERP_Techsolutios

ramo:            docs/gov-pausa-grava-e-para
base:            origin/main
estado:          OPEN | rascunho=false | MERGEABLE
head do PR:      3b00cae9c691b3d2f5c5e3ac6e33365353075258
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
AGENTS.md CLAUDE.md agent-orchestration/controle/decisoes.md agent-orchestration/docs/conhecimento-de-terreno.md agent-orchestration/omega/juntas/PROTOCOLO-JUNTA-RESILIENTE.md
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

O papel e planejador-mestre, identidade nova planejador-b-gov-pausa, em Fable por contrato (esgotado o Fable, Opus com a
  substituicao declarada na 1a linha; esgotado o Opus, para), com o corpo de origin/main, e o plano declara na 1a linha o papel,
  a identidade, o modelo, o mandato_md5 deste arquivo e o md5 EOL-neutro do corpo aplicado derruba com: `head -3 C:/Users/AMP/w-pausa/docs/revisoes/SAN3/B-GOV-PAUSA-plano.md | grep -ic 'mandato_md5'`

O objeto e o PR 397, que transcreve para o contrato a decisao do dono D-PAUSA-GRAVA-E-PARA; o texto foi escrito pelo
  orquestrador, e o plano o MEDE em vez de herda-lo: (a) fidelidade — cada clausula do texto nos cinco arquivos contra as
  palavras do dono transcritas em agent-orchestration/controle/decisoes.md, separando o que o dono disse do que e elaboracao do
  transcritor, que se declara como tal; (b) completude — a lista GERADA por comando de todo lugar vivo em que o protocolo de
  junta resiliente (P1 a P6 e o modelo de mandato) aparece, no contrato, no espelho Codex .agents/agents/README.md, nos corpos
  de gate e em EXECUTION_MODEL.md, com o que precisa ganhar P7 e o que nao precisa, e por que; (c) a coerencia de P7 com as
  regras vivas que tratam de queda, suplente e parada (P1 a P6, paradas irredutiveis, escada de modelo) derruba com: `grep -ic 'elaboracao\|elaboração' C:/Users/AMP/w-pausa/docs/revisoes/SAN3/B-GOV-PAUSA-plano.md`

O plano decide o KPI pelo contrato (natureza do diff e precedente medido na main: o B-GOV-SEM-TETO mudou o contrato pela
  mesma via e contou mais um bloco com as tres trilhas carregadas com nota), e nao pela frase do commit do orquestrador que cita
  o registro do PR 396 como precedente; o que a medicao exigir entra no escopo do dev derruba com: `grep -ic 'kpi' C:/Users/AMP/w-pausa/docs/revisoes/SAN3/B-GOV-PAUSA-plano.md`

O orquestrador escreveu o texto, logo nao o emenda nem o julga: o plano nomeia um dev de identidade nova para toda emenda que a
  medicao exigir (texto, espelho, Codex, KPI, registro, pendencias), tres cadeiras de identidade nova para a junta (fidelidade da
  transcricao; consistencia normativa e espelho; escopo, registro e KPI), maioria de 3 sem veto (o bloco nao toca dinheiro,
  seguranca, permissao nem perda de dado), sem critico-adversarial, com o inspetor-de-terreno-da-junta antes, e a lista de
  inelegiveis por nome (o orquestrador, o planejador, o dev) derruba com: `grep -ic 'maioria' C:/Users/AMP/w-pausa/docs/revisoes/SAN3/B-GOV-PAUSA-plano.md`

O planejador escreve tambem o briefing agent-orchestration/omega/juntas/BRIEFING-B-GOV-PAUSA.md (novo), no formato de
  agent-orchestration/omega/juntas/BRIEFING-B-GOV-SEM-TETO.md, com o objeto, os papeis, os itens de cada cadeira (no maximo 3
  por cadeira, P4) e os comandos de medicao; e o plano docs/revisoes/SAN3/B-GOV-PAUSA-plano.md (novo) no formato de
  docs/revisoes/SAN3/B-GOV-SEM-TETO-plano.md, curto na proporcao do bloco, com o seu proprio paragrafo de abertura em MEDIDO e
  HIPOTESE derruba com: `ls C:/Users/AMP/w-pausa/agent-orchestration/omega/juntas/ | grep -ic 'BRIEFING-B-GOV-PAUSA'`

O planejador nao conserta texto, nao escreve corpo de agente, nao versiona e nao toca nenhum arquivo alem dos dois novos em
  C:/Users/AMP/w-pausa; mede num worktree proprio detached C:/Users/AMP/w-pl397 (caminho curto; conferir que existe) removido
  pelo nome ao fim; nunca tail -f nem MSYS_NO_PATHCONV exportada; timeout no que executa; a base viva erp-postgres 5432 e
  erp-redis 6379 nunca como alvo; se receber PAUSA, grava a secao PAUSA no plano (head, feito, falta, proximo comando,
  meio-escritos) e para sozinho derruba com: `git -C C:/Users/AMP/w-pausa status --porcelain | grep -iv 'B-GOV-PAUSA' | wc -l`

## MEDIDO

Pre-voo deste mandato no head do lancamento, com o pre-voo do ramo do B-GOV-MANDATO copiado para o arnes medido por: `cd C:/Users/AMP/w-pv397 && bash scripts/mandato-preflight.sh <este-mandato> 397; echo ec=$?`
```
COLAGEM    l.11-24: refs do PR #397 confere com a saida atual

PRE-VOO OK — C:/Users/AMP/w-pausa/agent-orchestration/omega/juntas/votos/B-GOV-PAUSA/00-mandatos/planejador.md
ec=0
head=3b00cae9c691b3d2f5c5e3ac6e33365353075258
utc=2026-10-01T13:34:56Z
```
