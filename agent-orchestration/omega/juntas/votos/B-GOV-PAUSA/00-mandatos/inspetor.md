# Mandato — inspetor — PR 397 (B-GOV-PAUSA, D-PAUSA-GRAVA-E-PARA)

## MEDIDO

A decisao do dono esta registrada no ramo do PR 397 medido por: `grep -ic '^## D-PAUSA-GRAVA-E-PARA' C:/Users/AMP/w-pausa/agent-orchestration/controle/decisoes.md`
```
1
```

Estado do PR 397 no instante do lancamento, pela ferramenta do B-GOV-MANDATO medido por: `bash scripts/mandato-refs.sh 397`
```
# refs do PR #397 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato
# gerado em: 2026-10-01T16:27Z · repo: thiagodorgo/ERP_Techsolutios

ramo:            docs/gov-pausa-grava-e-para
base:            origin/main
estado:          OPEN | rascunho=false | MERGEABLE
head do PR:      ed61f9986f6607c797babc9cc609f97027730d85
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
.agents/agents/README.md .agents/agents/especialistas/jurado-pausa-c1-fidelidade-transcricao.md .agents/agents/especialistas/jurado-pausa-c2-consistencia-normativa-espelho.md .agents/agents/especialistas/jurado-pausa-c3-escopo-registro-kpi.md .claude/agents/especialistas/jurado-pausa-c1-fidelidade-transcricao.md .claude/agents/especialistas/jurado-pausa-c2-consistencia-normativa-espelho.md .claude/agents/especialistas/jurado-pausa-c3-escopo-registro-kpi.md AGENTS.md CLAUDE.md Kpis/app.js Kpis/kpis-history.json Kpis/kpis-history.md Kpis/kpis-latest.json agent-orchestration/controle/decisoes.md agent-orchestration/controle/pendencias-indice.md agent-orchestration/controle/pendencias.md agent-orchestration/docs/conhecimento-de-terreno.md agent-orchestration/docs/status-geral.md agent-orchestration/omega/juntas/BRIEFING-B-GOV-PAUSA.md agent-orchestration/omega/juntas/PROTOCOLO-JUNTA-RESILIENTE.md agent-orchestration/omega/juntas/votos/B-GOV-PAUSA/00-mandatos/dev-pausa-emenda.md agent-orchestration/omega/juntas/votos/B-GOV-PAUSA/00-mandatos/fabrica.md agent-orchestration/omega/juntas/votos/B-GOV-PAUSA/00-mandatos/planejador.md docs/revisoes/SAN3/B-GOV-PAUSA-plano.md
```

As linhas que o ramo acrescenta e remove em CLAUDE.md e em AGENTS.md sao as mesmas medido por: `cd C:/Users/AMP/w-pausa && diff <(git diff -U0 origin/main HEAD -- CLAUDE.md | grep -i '^[+-]' | grep -iv '^[+-][+-]') <(git diff -U0 origin/main HEAD -- AGENTS.md | grep -i '^[+-]' | grep -iv '^[+-][+-]') >/dev/null && echo IDENTICAS || echo DIFERENTES`
```
IDENTICAS
```

Ocorrencias de P7 por arquivo tocado medido por: `cd C:/Users/AMP/w-pausa && grep -ic 'P7' CLAUDE.md AGENTS.md agent-orchestration/omega/juntas/PROTOCOLO-JUNTA-RESILIENTE.md agent-orchestration/controle/decisoes.md agent-orchestration/docs/conhecimento-de-terreno.md`
```
CLAUDE.md:9
AGENTS.md:9
agent-orchestration/omega/juntas/PROTOCOLO-JUNTA-RESILIENTE.md:8
agent-orchestration/controle/decisoes.md:9
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

O papel e o inspetor-de-terreno-da-junta (contrato §C7.1-bis, fail-closed), instancia nova para a junta 1 do B-GOV-PAUSA, em
  Fable por contrato (esgotado o Fable, Opus com a substituicao declarada; esgotado o Opus, para), com o corpo de origin/main, e
  declara na 1a linha do parecer o papel, o modelo, o mandato_md5 deste arquivo e o md5 EOL-neutro do corpo; ele nao julga merito,
  julga se o tabuleiro esta limpo derruba com: `head -1 C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/INSPETOR-397.md | grep -ic 'mandato_md5'`

O objeto e resolvido pelo proprio inspetor (head de origin/docs/gov-pausa-grava-e-para por git e por gh, nunca digitado) e so e
  objeto se os check-runs desse SHA estiverem CONCLUIDOS: ausencia, pendente ou cancelado bloqueia o start, e vermelho e insumo do
  voto, nunca motivo de bloqueio por si derruba com: `grep -ic 'check-run' C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/INSPETOR-397.md`

O tabuleiro, conferido item a item contra o corpo do inspetor e a secao 8 do plano docs/revisoes/SAN3/B-GOV-PAUSA-plano.md: o plano e
  o briefing agent-orchestration/omega/juntas/BRIEFING-B-GOV-PAUSA.md no head; os tres corpos jurado-pausa-c1, c2 e c3 versionados nos
  dois espelhos no head (git ls-tree) e a fatia S0 (node scripts/sync-agent-agents.mjs --check igual a zero); os inelegiveis por nome
  (o orquestrador, planejador-b-gov-pausa, dev-pausa-emenda, a agente-fabrica, os tres votantes do B-GOV-SEM-TETO e o
  dev-semteto-emenda), conferidos pela ata agent-orchestration/omega/juntas/J-B-GOV-SEM-TETO.md e pelo
  agent-orchestration/omega/juntas/OBITUARIO-IDENTIDADES.md; o worktree proprio declarado por cadeira (w-jur-pz1, w-jur-pz2,
  w-jur-pz3); o baseline honesto (os tres guards de KPI com npm ci proprio, kpi-freeze --check, git diff --check) derruba com: `grep -ic 'sync-agent-agents' C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/INSPETOR-397.md`

Os mandatos: um por papel em agent-orchestration/omega/juntas/votos/B-GOV-PAUSA/00-mandatos/ com a cerca do veredito do pre-voo (ec,
  head, utc), e o commit de cada mandato anterior ao primeiro artefato do papel no git log; o plano deste bloco nao exige re-executar o
  pre-voo de mandato antigo no head do objeto, e o orquestrador mediu em 01/10 que essa re-execucao reprova por construcao todo
  mandato cuja colagem do refs envelheceu (pendencia aberta, nao criterio desta inspecao) derruba com: `grep -ic '00-mandatos' C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/INSPETOR-397.md`

O plano de perda de jurado (queda relanca a MESMA identidade, que nao herda nada como conclusao; voto perdido nunca aprova; a junta
  nao fecha com menos de 3 votos de merito) e o de PAUSA (P7: a cadeira grava a secao PAUSA na sua evidencia e para sozinha) estao
  declarados; as afirmacoes do plano e do briefing sao hipoteses a re-verificar; o residuo alheio (worktrees e arquivos de outras
  sessoes) se reporta, nunca se varre derruba com: `grep -ic 'PAUSA' C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/INSPETOR-397.md`

O veredito e LIBERADO, LIBERADO COM RESSALVA ou BLOQUEADO, nomeando cada condicao ausente; o parecer e incremental com hora em
  C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/INSPETOR-397.md e o orquestrador o versiona em agent-orchestration/omega/juntas/votos/B-GOV-PAUSA/00-inspetor-terreno.md (novo);
  o inspetor mede num worktree proprio detached C:/Users/AMP/w-insp397 (caminho curto; conferir que existe), removido pelo nome ao fim,
  nunca tail -f nem MSYS_NO_PATHCONV exportada, timeout no que executa, base viva erp-postgres 5432 e erp-redis 6379 nunca alvo, nada
  escrito no repositorio derruba com: `grep -icE 'LIBERADO|BLOQUEADO' C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/INSPETOR-397.md`

## MEDIDO

Pre-voo deste mandato no head do lancamento, com o pre-voo do ramo do B-GOV-MANDATO copiado para o arnes medido por: `cd C:/Users/AMP/w-pv397 && bash scripts/mandato-preflight.sh <este-mandato> 397; echo ec=$?`
```
COLAGEM    l.11-24: refs do PR #397 confere com a saida atual

PRE-VOO OK — C:/Users/AMP/w-pausa/agent-orchestration/omega/juntas/votos/B-GOV-PAUSA/00-mandatos/inspetor.md
ec=0
head=ed61f9986f6607c797babc9cc609f97027730d85
utc=2026-10-01T16:28:05Z
```
