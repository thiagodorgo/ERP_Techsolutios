# Mandato — dev, integracao da main pos-402 (2a tentativa) — B-SAN3-11 (PR 401, junta)

## MEDIDO

Estado do PR 401 pela ferramenta do B-GOV-MANDATO medido por: `bash scripts/mandato-refs.sh 401`
```
# refs do PR #401 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato
# gerado em: 2026-10-02T22:50Z · repo: thiagodorgo/ERP_Techsolutios

ramo:            fix/dossie-versao-da-vistoria
base:            origin/main
estado:          OPEN | rascunho=true | CONFLICTING
head do PR:      976797f9dacd2e31c7d94c07da1da8354a1b0942
merge-base:      4ab9d232d2c6705ad39cf6bd4313ca5c91b222a9
merge commit:    <ainda nao mergeado>
check-runs:      total=7 nao-verdes=0 pendentes=0
approved_head:   AUSENTE — nenhuma ata nomeia nem menciona #401
                 (a junta nao votou, ou a ata nao esta em origin/main nem no head do PR)
```

Os arquivos que o ramo muda contra a base dele (merge-base com origin/main) medido por: `git diff --name-only "$(git merge-base origin/main HEAD)" HEAD | paste -sd" "`
```
Kpis/app.js Kpis/kpis-history.json Kpis/kpis-history.md Kpis/kpis-latest.json agent-orchestration/codex/comandos/B-SAN3-11-dossie-versao-da-vistoria.md agent-orchestration/codex/log-execucao.md agent-orchestration/controle/pendencias-indice.md agent-orchestration/controle/pendencias.md agent-orchestration/docs/status-geral.md agent-orchestration/omega/juntas/BRIEFING-B-SAN3-11.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-inspetor-terreno.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/C1.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/C2.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/C3.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/dev-errata1.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/dev-errata1bis.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/dev-integracao.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/dev.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/inspetor-b.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/inspetor.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/planejador-errata1.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/planejador-errata1bis.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-quedas.md agent-orchestration/omega/juntas/votos/B-SAN3-11/DEV-errata1-evidencia.md agent-orchestration/omega/juntas/votos/B-SAN3-11/DEV-relatorio.md agent-orchestration/omega/juntas/votos/B-SAN3-11/PLANEJADOR-errata1-relatorio.md agent-orchestration/omega/juntas/votos/B-SAN3-11/PLANEJADOR-errata1bis-relatorio.md docs/revisoes/SAN3/B-SAN3-11-plano.md frontend/package.json frontend/src/modules/patios/processes/components/ChecklistRunsPanel.tsx frontend/src/modules/patios/processes/processes.adapter.ts frontend/src/modules/patios/processes/processes.types.ts frontend/tests/patios-dossie-checklist.smoke.test.tsx frontend/tests/patios-dossie-print.smoke.test.tsx frontend/tests/patios-dossie-versao.smoke.test.tsx scripts/san3-11-dossie-vistoria-censo.mjs
```

O plano do bloco existe no ramo, com este numero de linhas medido por: `wc -l < docs/revisoes/SAN3/B-SAN3-11-plano.md`
```
1449
```

## HIPOTESE

O papel e o dev da errata 1 do B-SAN3-11 (PR 401), a MESMA identidade dev-errata1-b-san3-11 (local, Opus), para a segunda tentativa de um passo curto que a
  secao 15.9 do plano docs/revisoes/SAN3/B-SAN3-11-plano.md ja manda (se a main andar antes do merge, o numero e o da main de entao mais
  1): a main andou com o merge do PR 402; o dev declara na 1a linha do seu relatorio o papel, a identidade, o modelo e o mandato_md5 deste
  arquivo derruba com: `head -1 C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/DEV-INTEG-401.md | grep -ic 'mandato_md5'`

Item 1: a origin/main de agora integrada ao ramo do PR 401 por merge e nunca por rebase; conflitos so em registro e KPI, cada um
  resolvido com as duas entradas e a deste bloco por ultimo, sem nenhuma linha da main removida (provado por diff contra a main); e o
  conflito que a primeira tentativa mediu em frontend/package.json, so na linha do test:smoke, resolvido pela UNIAO dos dois acrescimos
  (o arquivo de teste que a main trouxe e o deste bloco), provada por conjunto (lista final igual a base mais o acrescimo da main mais o
  deste bloco) e sem nenhuma outra chave do package.json mudar (emenda do orquestrador, papel de integracao; o plano ja permite so a
  linha do smoke) derruba com: `grep -ic 'merge' C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/DEV-INTEG-401.md`

Item 2: o KPI recontado pela secao C3 do contrato contra a main integrada: blocks_completed igual ao da main mais 1, frontend_smoke_tests
  pelo TAP de uma execucao real do test:smoke no head integrado (os testes do PR 402 e os deste bloco somados), o arquivo de teste do
  bloco 16/16, history com n igual ao da main mais 1 e a entrada deste bloco por ultimo, e o app.js so pela saida do kpi-freeze com o
  --check verde derruba com: `grep -ic 'blocks_completed' C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/DEV-INTEG-401.md`

Item 3: a secao de integracao no DEV-relatorio.md do bloco (append), 1 linha em agent-orchestration/codex/log-execucao.md e em
  agent-orchestration/docs/status-geral.md; commits Conventional com git diff --cached --check como trava; push fast-forward depois de
  provar a ancestralidade; nunca force, nunca main, nunca PR, sem linhas de atribuicao derruba com: `grep -ic 'is-ancestor' C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/DEV-INTEG-401.md`

O terreno: worktree proprio detached C:/Users/AMP/w-dev11i, npm ci proprio sem junction, removido pelo nome ao fim com 0 processo vivo;
  evidencia incremental com hora em C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/DEV-INTEG-401.md (P1); mensagem final de 1 linha (P2); nunca tail -f nem MSYS_NO_PATHCONV exportada; timeout em tudo
  que executa; base viva nunca alvo; se a medicao contradisser o plano, grava e PARA; sob PAUSA grava e para (P7) derruba com: `grep -ic 'medido por' C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/DEV-INTEG-401.md`

## MEDIDO

Pre-voo deste mandato no head do PR, com o pre-voo do ramo do B-GOV-MANDATO copiado para um arnes local medido por: `bash scripts/mandato-preflight.sh <este-mandato> 401; echo ec=$?`
```
COLAGEM    l.6-19: refs do PR #401 confere com a saida atual

PRE-VOO OK — C:/Users/AMP/w-nuv11/agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/dev-integracao2.md
ec=0
head=976797f9dacd2e31c7d94c07da1da8354a1b0942
utc=2026-10-02T22:50:40Z
```
