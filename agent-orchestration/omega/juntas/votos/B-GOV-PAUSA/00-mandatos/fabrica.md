# Mandato — fabrica — PR 397 (B-GOV-PAUSA, D-PAUSA-GRAVA-E-PARA)

## MEDIDO

A decisao do dono esta registrada no ramo do PR 397 medido por: `grep -ic '^## D-PAUSA-GRAVA-E-PARA' C:/Users/AMP/w-pausa/agent-orchestration/controle/decisoes.md`
```
1
```

Estado do PR 397 no instante do lancamento, pela ferramenta do B-GOV-MANDATO medido por: `bash scripts/mandato-refs.sh 397`
```
# refs do PR #397 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato
# gerado em: 2026-10-01T14:20Z · repo: thiagodorgo/ERP_Techsolutios

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

O papel e a agente-fabrica, que escreve os corpos das tres cadeiras novas da junta do B-GOV-PAUSA (secao 8 do plano
  docs/revisoes/SAN3/B-GOV-PAUSA-plano.md e o briefing agent-orchestration/omega/juntas/BRIEFING-B-GOV-PAUSA.md):
  jurado-pausa-c1-fidelidade-transcricao, jurado-pausa-c2-consistencia-normativa-espelho e jurado-pausa-c3-escopo-registro-kpi,
  cada um em .claude/agents/especialistas/ e no espelho .agents/agents/especialistas/ no formato do gerador
  scripts/sync-agent-agents.mjs (sem a linha tools no espelho, com o preambulo Codex), frontmatter name, description de uma linha,
  tools Read Grep Glob Bash e model opus; ela declara na mensagem final que leu este mandato pelo caminho derruba com: `ls C:/Users/AMP/w-pausa/.claude/agents/especialistas/ | grep -ic 'jurado-pausa-c'`

Os itens de cada cadeira sao os da secao 8 do plano e do briefing, no maximo 3 por cadeira (P4), transcritos sem diluir e sem
  legislacao nova: C1 julga as elaboracoes do transcritor uma a uma contra as palavras do dono (bloqueia so onde a elaboracao muda o
  que o dono decidiu); C2 gera a propria lista de regras vivas e mede espelho, modelo de mandato e destinos na ref; C3 mede escopo
  por laco, KPI com N e forma, corpos no head, pendencias pelo gerador e check-runs; os tres corpos mandam declarar o mandato_md5
  na 1a linha da evidencia derruba com: `grep -ic 'mandato_md5' C:/Users/AMP/w-pausa/.claude/agents/especialistas/jurado-pausa-c1-fidelidade-transcricao.md`

O modelo de mandato colado em cada corpo e o do contrato com a linha P7 (sob PAUSA a cadeira grava a secao PAUSA na sua evidencia
  e para sozinha) — esta e a primeira junta sob P7 — e as regras da casa estao nos tres: maioria de 3 sem veto e sem suplente (queda
  relanca a mesma identidade, que nao herda nada; voto perdido nunca aprova; a junta nao fecha com menos de 3 votos de merito); todo
  achado com gravidade e escopo, este com evidencia de data ou origem; nao consigo medir e REPROVADO; nenhuma cadeira propoe
  correcao; votam juntas sem ler o voto umas das outras; somente leitura, escrevendo so a propria evidencia e o proprio voto;
  worktree detached em caminho curto, junction proibida, base viva erp-postgres 5432 e erp-redis 6379 nunca alvo, MSYS_NO_PATHCONV
  nunca exportada, sem tail -f, timeout em tudo que executa derruba com: `grep -ic 'PAUSA' C:/Users/AMP/w-pausa/.claude/agents/especialistas/jurado-pausa-c2-consistencia-normativa-espelho.md`

Os inelegiveis da secao 8 do plano estao listados por nome nos tres corpos: o orquestrador, o planejador-b-gov-pausa, o
  dev-pausa-emenda, a agente-fabrica, os tres votantes do B-GOV-SEM-TETO e o dev-semteto-emenda, conferidos tambem pela ata
  agent-orchestration/omega/juntas/J-B-GOV-SEM-TETO.md e pelo agent-orchestration/omega/juntas/OBITUARIO-IDENTIDADES.md derruba com: `grep -ic 'dev-pausa-emenda' C:/Users/AMP/w-pausa/.claude/agents/especialistas/jurado-pausa-c3-escopo-registro-kpi.md`

A fabrica nao versiona, nao roda o sync e nao toca nenhum outro arquivo: o unico efeito dela sao os seis arquivos novos, e quem
  versiona e o orquestrador (sync, git add -f nos dois espelhos, check igual a zero); a mensagem final traz os seis caminhos, as
  linhas de cada corpo e toda divergencia entre a secao 8 do plano e este mandato, em que vale o plano, gravada tambem em
  C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/FABRICA-397.md derruba com: `git -C C:/Users/AMP/w-pausa status --porcelain | grep -ivE 'especialistas' | wc -l`

## MEDIDO

Pre-voo deste mandato no head do lancamento, com o pre-voo do ramo do B-GOV-MANDATO copiado para o arnes medido por: `cd C:/Users/AMP/w-pv397 && bash scripts/mandato-preflight.sh <este-mandato> 397; echo ec=$?`
```
COLAGEM    l.11-24: refs do PR #397 confere com a saida atual

PRE-VOO OK — C:/Users/AMP/w-pausa/agent-orchestration/omega/juntas/votos/B-GOV-PAUSA/00-mandatos/fabrica.md
ec=0
head=4a0a4fe8150292ae9a3922b71e251547012cc9e0
utc=2026-10-01T14:20:19Z
```
