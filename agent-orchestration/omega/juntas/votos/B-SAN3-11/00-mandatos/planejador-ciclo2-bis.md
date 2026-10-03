# Mandato — planejador do ciclo 2, emenda 16-bis — B-SAN3-11 (PR 401, junta)

## MEDIDO

Estado do PR 401 pela ferramenta do B-GOV-MANDATO medido por: `bash scripts/mandato-refs.sh 401`
```
# refs do PR #401 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato
# gerado em: 2026-10-03T05:46Z · repo: thiagodorgo/ERP_Techsolutios

ramo:            fix/dossie-versao-da-vistoria
base:            origin/main
estado:          OPEN | rascunho=true | CONFLICTING
head do PR:      feb0d838e1b940f4fb4771cdf447c2ea02c82a49
merge-base:      f03b883fb6ffeeddd4b833300ff3832ee4dc8cc0
merge commit:    <ainda nao mergeado>
check-runs:      total=7 nao-verdes=0 pendentes=0
approved_head:   NAO DETERMINAVEL (a ata casa o PR mas NAO declara aprovacao: nenhuma linha '- **approved_head:**')
                 objeto declarado defa502ee0a03dabbc8786d568d00f7eb7ca726d (agent-orchestration/omega/juntas/J-B-SAN3-11.md:3 @head-do-PR) — aprovacao nao legivel por maquina
                 NAO invente: sem a linha '- **approved_head:**' numa ata que se declare
                 sobre este PR, a ferramenta NAO afirma qual head a junta aprovou.
```

Os arquivos que o ramo muda contra a base dele (merge-base com origin/main) medido por: `git diff --name-only "$(git merge-base origin/main HEAD)" HEAD | paste -sd" "`
```
Kpis/app.js Kpis/kpis-history.json Kpis/kpis-history.md Kpis/kpis-latest.json agent-orchestration/codex/comandos/B-SAN3-11-dossie-versao-da-vistoria.md agent-orchestration/codex/log-execucao.md agent-orchestration/controle/pendencias-indice.md agent-orchestration/controle/pendencias.md agent-orchestration/docs/status-geral.md agent-orchestration/omega/juntas/BRIEFING-B-SAN3-11.md agent-orchestration/omega/juntas/J-B-SAN3-11.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-inspetor-terreno-b.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-inspetor-terreno.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/C1.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/C2.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/C3.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/dev-ciclo2-D1.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/dev-ciclo2-D2.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/dev-ciclo2-D3.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/dev-errata1.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/dev-errata1bis.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/dev-integracao.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/dev-integracao2.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/dev.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/fabrica-ciclo2.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/inspetor-b.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/inspetor.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/planejador-ciclo2.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/planejador-errata1.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/planejador-errata1bis.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-quedas.md agent-orchestration/omega/juntas/votos/B-SAN3-11/C1-evidencia.md agent-orchestration/omega/juntas/votos/B-SAN3-11/C1-voto.json agent-orchestration/omega/juntas/votos/B-SAN3-11/C2-evidencia.md agent-orchestration/omega/juntas/votos/B-SAN3-11/C2-voto.json agent-orchestration/omega/juntas/votos/B-SAN3-11/C3-evidencia.md agent-orchestration/omega/juntas/votos/B-SAN3-11/C3-voto.json agent-orchestration/omega/juntas/votos/B-SAN3-11/DEV-errata1-evidencia.md agent-orchestration/omega/juntas/votos/B-SAN3-11/DEV-relatorio.md agent-orchestration/omega/juntas/votos/B-SAN3-11/PLANEJADOR-ciclo2-relatorio.md agent-orchestration/omega/juntas/votos/B-SAN3-11/PLANEJADOR-errata1-relatorio.md agent-orchestration/omega/juntas/votos/B-SAN3-11/PLANEJADOR-errata1bis-relatorio.md agent-orchestration/omega/reprovacoes/R-B-SAN3-11-1.md docs/revisoes/SAN3/B-SAN3-11-plano.md frontend/package.json frontend/src/modules/patios/processes/components/ChecklistRunsPanel.tsx frontend/src/modules/patios/processes/processes.adapter.ts frontend/src/modules/patios/processes/processes.types.ts frontend/tests/patios-dossie-checklist.smoke.test.tsx frontend/tests/patios-dossie-print.smoke.test.tsx frontend/tests/patios-dossie-versao.smoke.test.tsx scripts/san3-11-dossie-vistoria-censo.mjs
```

O plano do bloco existe no ramo, com este numero de linhas medido por: `wc -l < docs/revisoes/SAN3/B-SAN3-11-plano.md`
```
1811
```

## HIPOTESE

O papel e o planejador-mestre do ciclo 2 do B-SAN3-11 (PR 401), a MESMA identidade planejador-ciclo2-b-san3-11, para uma emenda curta
  (secao 16-bis); o Fable e obrigatorio (retorno ao planejador, secao C7 item 6 do contrato); esgotado o Fable, Opus com a substituicao
  declarada; esgotado o Opus, para; declara na 1a linha do arquivo de saida o papel, a identidade, o modelo e o mandato_md5 deste arquivo derruba com: `head -1 C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/PLANO-C2bis-B-SAN3-11.md | grep -ic 'mandato_md5'`

O insumo e o relatorio da agente-fabrica em C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/FABRICA-401-c2.md (secao 5, observacoes a, b e c), lido como relato e nunca como fato: tres criterios que a
  secao 16.5 manteve da errata — A17 linha nova (o numero de falhas sob a mutacao do teto, agora que T20 a T22 tambem chamam o arnes), A18
  linha nova (o total e as linhas exatas da varredura, agora que o gerador e o v2 do Apendice E) e A25 com a linha da secao 15-bis.8 (o
  arquivo de teste igual ao da errata, que o E13 muda por construcao) — re-medidos pelo planejador por execucao propria no head do PR,
  com comando e saida derruba com: `grep -ic 'A25' C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/PLANO-C2bis-B-SAN3-11.md`

A emenda reescreve cada um dos tres como propriedade valida para o ciclo 2, com a mutacao que o deixa vermelho, sem afrouxar o que eles
  protegiam (a morte por tempo vira excecao nomeada; nenhum status coalescido; o diff da correcao dentro do escopo), e diz em que
  intervalo de commits cada um se mede; o texto sai pronto para o orquestrador apensar ao plano docs/revisoes/SAN3/B-SAN3-11-plano.md
  como secao 16-bis, e diz se os corpos das cadeiras do ciclo 2 precisam de emenda derruba com: `grep -ic 'A17' C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/PLANO-C2bis-B-SAN3-11.md`

O terreno e as regras: o planejador nao desenvolve, nao commita e nao vota; escreve so C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/PLANO-C2bis-B-SAN3-11.md, incremental com hora UTC (P1), mensagem final
  de 1 linha (P2); worktree proprio detached C:/Users/AMP/w-plc2b, removido pelo nome ao fim com 0 processo vivo; o worktree do dev
  C:/Users/AMP/w-dc2 e so leitura; nunca tail -f nem MSYS_NO_PATHCONV exportada; timeout em tudo; base viva nunca alvo; sob PAUSA grava a
  secao PAUSA e para (P7) derruba com: `grep -ic 'medido por' C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/PLANO-C2bis-B-SAN3-11.md`

## MEDIDO

Pre-voo deste mandato no head do PR, com o pre-voo do ramo do B-GOV-MANDATO copiado para um arnes local medido por: `bash scripts/mandato-preflight.sh <este-mandato> 401; echo ec=$?`
```
COLAGEM    l.6-21: refs do PR #401 confere com a saida atual

PRE-VOO OK — C:/Users/AMP/w-nuv11/agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/planejador-ciclo2-bis.md
ec=0
head=feb0d838e1b940f4fb4771cdf447c2ea02c82a49
utc=2026-10-03T05:46:35Z
```
