# Mandato — planejador da errata 1-bis — B-SAN3-11 (PR 401, junta)

## MEDIDO

Estado do PR 401 pela ferramenta do B-GOV-MANDATO medido por: `bash scripts/mandato-refs.sh 401`
```
# refs do PR #401 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato
# gerado em: 2026-10-02T16:13Z · repo: thiagodorgo/ERP_Techsolutios

ramo:            fix/dossie-versao-da-vistoria
base:            origin/main
estado:          OPEN | rascunho=true | CONFLICTING
head do PR:      508240fb1bc84528c5ce34bb506fada13b7ca178
merge-base:      5b6e103638f398d6074eecc5daebdf2d3bcd2252
merge commit:    <ainda nao mergeado>
check-runs:      total=7 nao-verdes=0 pendentes=0
approved_head:   AUSENTE — nenhuma ata nomeia nem menciona #401
                 (a junta nao votou, ou a ata nao esta em origin/main nem no head do PR)
```

Os arquivos que o ramo muda contra a base dele (merge-base com origin/main) medido por: `git diff --name-only "$(git merge-base origin/main HEAD)" HEAD | paste -sd" "`
```
Kpis/app.js Kpis/kpis-history.json Kpis/kpis-history.md Kpis/kpis-latest.json agent-orchestration/codex/comandos/B-SAN3-11-dossie-versao-da-vistoria.md agent-orchestration/codex/log-execucao.md agent-orchestration/controle/pendencias.md agent-orchestration/docs/status-geral.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-inspetor-terreno.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/C1.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/C2.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/C3.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/dev-errata1.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/dev.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/inspetor.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/planejador-errata1.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-quedas.md agent-orchestration/omega/juntas/votos/B-SAN3-11/DEV-relatorio.md agent-orchestration/omega/juntas/votos/B-SAN3-11/PLANEJADOR-errata1-relatorio.md docs/revisoes/SAN3/B-SAN3-11-plano.md frontend/package.json frontend/src/modules/patios/processes/components/ChecklistRunsPanel.tsx frontend/src/modules/patios/processes/processes.adapter.ts frontend/src/modules/patios/processes/processes.types.ts frontend/tests/patios-dossie-checklist.smoke.test.tsx frontend/tests/patios-dossie-print.smoke.test.tsx frontend/tests/patios-dossie-versao.smoke.test.tsx scripts/san3-11-dossie-vistoria-censo.mjs
```

O plano do bloco existe no ramo, com este numero de linhas medido por: `wc -l < docs/revisoes/SAN3/B-SAN3-11-plano.md`
```
1319
```

## HIPOTESE

O papel e o planejador-mestre da errata 1 do B-SAN3-11 (PR 401), a MESMA identidade planejador-errata1-b-san3-11, agora para a errata
  1-bis; o Fable e obrigatorio porque o fluxo voltou ao planejador depois de correcao de codigo (secao C7 item 6 do contrato); esgotado o
  Fable, Opus com a substituicao declarada; esgotado o Opus, para; declara na 1a linha do arquivo de saida o papel, a identidade, o modelo
  e o mandato_md5 deste arquivo derruba com: `head -1 C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/ERRATA-1bis-B-SAN3-11.md | grep -ic 'mandato_md5'`

O insumo e a evidencia do dev da errata em C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/DEV-ERRATA1-401.md (secao 9, a divergencia, e a secao PARADA), lida como relatorio de quem
  executou e nunca como fato: D1 (com teto, o Node preenche error ETIMEDOUT e signal SIGTERM com status nulo, e a forma de referencia testa
  error antes de status nulo, logo o criterio A17 que cobra a mensagem morto por sinal nao e alcancavel) e D2 (a regex NULL da varredura
  casa a linha de retorno da propria forma de referencia por causa do coalescimento do stdout, logo NULL=0 do A18 nao e alcancavel; e EOL
  da 3, nao 2) sao re-medidas pelo planejador por execucao propria, com comando e saida colados derruba com: `grep -ic 'ETIMEDOUT' C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/ERRATA-1bis-B-SAN3-11.md`

A errata 1-bis decide, por propriedade e com a mutacao que deixa cada criterio vermelho, se muda a forma ou o criterio em cada caso
  (A17, A18 e o total esperado da varredura), sem escopo novo e sem afrouxar a P-A nem a P-B; e o texto vai pronto para o orquestrador
  apensar verbatim ao plano docs/revisoes/SAN3/B-SAN3-11-plano.md como subsecao da secao 15 derruba com: `grep -ic 'A17' C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/ERRATA-1bis-B-SAN3-11.md`

A errata 1-bis diz ao dev o que vale do que ele ja commitou localmente (o merge da main, o E6 e E7, a recontagem do KPI e a secao do
  relatorio) e a ordem do que falta (o A17 de novo, os controles A19 a A21, a bateria da secao 15.8 nos dois terrenos, a varredura final,
  o registro e o push); e decide o destino da observacao do dev sobre o indice de pendencias que nao foi regenerado no commit original
  do bloco (dentro ou fora do escopo, com dono) derruba com: `grep -ic 'pendencias-indice' C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/ERRATA-1bis-B-SAN3-11.md`

O terreno e as regras: o worktree do dev C:/Users/AMP/w-dev11 e so leitura (nunca mutado); se precisar executar, worktree proprio detached
  C:/Users/AMP/w-pl11b, removido pelo nome ao fim com 0 processo vivo; o planejador nao desenvolve, nao commita e nao vota; escreve so C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/ERRATA-1bis-B-SAN3-11.md,
  incremental com a hora UTC (P1), mensagem final de 1 linha (P2); nunca tail -f nem MSYS_NO_PATHCONV exportada; timeout em tudo que
  executa; base viva nunca alvo; sob PAUSA grava a secao PAUSA e para (P7) derruba com: `grep -ic 'medido por' C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/ERRATA-1bis-B-SAN3-11.md`

## MEDIDO

Pre-voo deste mandato no head do PR, com o pre-voo do ramo do B-GOV-MANDATO copiado para um arnes local medido por: `bash scripts/mandato-preflight.sh <este-mandato> 401; echo ec=$?`
```
COLAGEM    l.6-19: refs do PR #401 confere com a saida atual

PRE-VOO OK — C:/Users/AMP/w-nuv11/agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/planejador-errata1bis.md
ec=0
head=508240fb1bc84528c5ce34bb506fada13b7ca178
utc=2026-10-02T16:13:10Z
```
