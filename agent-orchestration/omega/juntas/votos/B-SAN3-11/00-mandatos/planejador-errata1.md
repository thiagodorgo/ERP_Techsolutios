# Mandato — planejador da errata 1 — B-SAN3-11 (PR 401, junta)

## MEDIDO

Estado do PR 401 pela ferramenta do B-GOV-MANDATO medido por: `bash scripts/mandato-refs.sh 401`
```
# refs do PR #401 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato
# gerado em: 2026-10-02T15:19Z · repo: thiagodorgo/ERP_Techsolutios

ramo:            fix/dossie-versao-da-vistoria
base:            origin/main
estado:          OPEN | rascunho=true | CONFLICTING
head do PR:      5f6aaf56611c9753782adfe300b857249c41130c
merge-base:      5b6e103638f398d6074eecc5daebdf2d3bcd2252
merge commit:    <ainda nao mergeado>
check-runs:      total=7 nao-verdes=0 pendentes=0
approved_head:   AUSENTE — nenhuma ata nomeia nem menciona #401
                 (a junta nao votou, ou a ata nao esta em origin/main nem no head do PR)
```

Os arquivos que o ramo muda contra a base dele (merge-base com origin/main) medido por: `git diff --name-only "$(git merge-base origin/main HEAD)" HEAD | paste -sd" "`
```
Kpis/app.js Kpis/kpis-history.json Kpis/kpis-history.md Kpis/kpis-latest.json agent-orchestration/codex/comandos/B-SAN3-11-dossie-versao-da-vistoria.md agent-orchestration/codex/log-execucao.md agent-orchestration/controle/pendencias.md agent-orchestration/docs/status-geral.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/C1.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/C2.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/C3.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/dev.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/inspetor.md agent-orchestration/omega/juntas/votos/B-SAN3-11/DEV-relatorio.md docs/revisoes/SAN3/B-SAN3-11-plano.md frontend/package.json frontend/src/modules/patios/processes/components/ChecklistRunsPanel.tsx frontend/src/modules/patios/processes/processes.adapter.ts frontend/src/modules/patios/processes/processes.types.ts frontend/tests/patios-dossie-checklist.smoke.test.tsx frontend/tests/patios-dossie-print.smoke.test.tsx frontend/tests/patios-dossie-versao.smoke.test.tsx scripts/san3-11-dossie-vistoria-censo.mjs
```

O plano do bloco existe no ramo, com este numero de linhas medido por: `wc -l < docs/revisoes/SAN3/B-SAN3-11-plano.md`
```
1045
```

## HIPOTESE

O papel e o planejador-mestre, instancia nova (nao escreveu o plano do B-SAN3-11, nao desenvolve, nao vota), em Fable por contrato
  (esgotado o Fable, Opus com a substituicao declarada; esgotado o Opus, para), com o corpo de origin/main; ele escreve a ERRATA 1 do
  plano docs/revisoes/SAN3/B-SAN3-11-plano.md, que o orquestrador apensa verbatim ao fim do plano como secao 15; e declara na 1a linha
  do arquivo de saida o papel, a identidade, o modelo e o mandato_md5 deste arquivo derruba com: `head -1 C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/ERRATA-B-SAN3-11.md | grep -ic 'mandato_md5'`

O insumo e o parecer BLOQUEADO do inspetor de terreno da junta 1 em C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/INSPETOR-401.md (secao 4.2 e VEREDITO), lido como relatorio de
  quem achou e nunca como fato: as duas causas (o teto de 30 s do arnes de T13 e T14 com a copia por cpSync perto de 27 s nesta maquina,
  e a regex de mutacao de T14 cega a CRLF) sao re-medidas pelo planejador por execucao propria no head do PR 401, num worktree detached
  proprio C:/Users/AMP/w-pl11 com npm ci proprio no frontend, em Windows com core.autocrlf=true, com comando e saida colados derruba com: `grep -ic 'T14' C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/ERRATA-B-SAN3-11.md`

A errata decide o conserto de cada causa como PROPRIEDADE e nao como instancia: a mutacao de cada teste aplica em qualquer fim de linha
  (provado em checkout CRLF e em checkout LF com core.autocrlf=false), e nenhum teste do bloco converte morte por tempo em exit 1 nem
  depende do relogio da maquina para dar verde; cada criterio com a mutacao que o deixa vermelho; e a classe e varrida por script em todo
  replace ou regex de mutacao e todo spawnSync com teto nos testes novos do bloco, com a lista gerada colada derruba com: `grep -ic 'CRLF' C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/ERRATA-B-SAN3-11.md`

A errata fixa o escopo da correcao com caminhos exatos (permitido: o arquivo de teste do bloco, Kpis pela recontagem, o relatorio do dev
  e o registro; proibido: o gerador, src e o resto do frontend, salvo se a medicao provar que o defeito mora la, dito por escrito), a
  integracao da origin/main de agora por merge e nunca por rebase, com a recontagem do KPI pela secao C3 do contrato contra ela
  (blocks_completed e frontend_smoke_tests por execucao real), e o papel de quem desenvolve: identidade nova local que nao achou, nao
  planejou e nao votou derruba com: `grep -ic 'blocks_completed' C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/ERRATA-B-SAN3-11.md`

O terreno e as regras: o planejador nao desenvolve, nao commita e nao vota; escreve so C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/ERRATA-B-SAN3-11.md, incremental com a hora UTC em cada secao
  (P1), e a mensagem final e 1 linha apontando o arquivo (P2); worktree proprio removido pelo nome ao fim, com 0 processo vivo; nunca
  tail -f nem MSYS_NO_PATHCONV exportada; timeout em tudo que executa; base viva erp-postgres 5432 e erp-redis 6379 nunca alvo; se
  receber PAUSA, grava a secao PAUSA no arquivo e para (P7) derruba com: `grep -ic 'medido por' C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/ERRATA-B-SAN3-11.md`

## MEDIDO

Pre-voo deste mandato no head do PR, com o pre-voo do ramo do B-GOV-MANDATO copiado para um arnes local medido por: `bash scripts/mandato-preflight.sh <este-mandato> 401; echo ec=$?`
```
COLAGEM    l.6-19: refs do PR #401 confere com a saida atual

PRE-VOO OK — C:/Users/AMP/w-nuv11/agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/planejador-errata1.md
ec=0
head=5f6aaf56611c9753782adfe300b857249c41130c
utc=2026-10-02T15:19:13Z
```
