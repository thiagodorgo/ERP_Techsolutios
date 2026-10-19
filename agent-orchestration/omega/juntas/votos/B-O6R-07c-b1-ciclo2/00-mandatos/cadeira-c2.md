# Mandato — Cadeira C2 — B-O6R-07c-b1 ciclo 2

## MEDIDO

Estado do PR 440 no instante da redação, pela ferramenta copiada sem alteração de `origin/chore/mandato-refs-e-preflight`, medido por: `bash <scratch-do-redator>/mandato-refs.sh 440`
```
# refs do PR #440 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato
# gerado em: 2026-10-18T18:25Z · repo: thiagodorgo/ERP_Techsolutios

ramo:            fix/o6r07cb1-despacho-atribui
base:            origin/main
estado:          OPEN | rascunho=false | MERGEABLE
head do PR:      7ff1e0039c07b22b84acf8007eef6835560e823a
merge-base:      c260d36201f6e835799e7f96a14bc9eb8889ca5a
merge commit:    <ainda nao mergeado>
check-runs:      total=14 nao-verdes=0 pendentes=0
approved_head:   NAO DETERMINAVEL (a ata casa o PR mas NAO declara aprovacao: nenhuma linha '- **approved_head:**')
                 objeto declarado b198fe358b41186b2598ab258ccb735da8c04cbc (agent-orchestration/omega/juntas/J-B-O6R-07c-b1-ciclo1.md:3 @head-do-PR) — aprovacao nao legivel por maquina
                 NAO invente: sem a linha '- **approved_head:**' numa ata que se declare
                 sobre este PR, a ferramenta NAO afirma qual head a junta aprovou.

```

O disco desta sessão está exatamente no head acima; plano do ciclo 2 e ata do ciclo 1 existem no objeto. Toda afirmação da ata ou do plano sobre o que foi aprovado é **A RE-VERIFICAR**, nunca fato herdado, medido por: `O=$O; git rev-parse HEAD; for p in docs/revisoes/SAN3/B-O6R-07c-b1-ciclo2-plano.md agent-orchestration/omega/juntas/J-B-O6R-07c-b1-ciclo1.md; do git cat-file -e "${O}:$p" && echo "PRESENTE $p"; done; git show "${O}:docs/revisoes/SAN3/B-O6R-07c-b1-ciclo2-plano.md" | grep -n -i -E '2.9 Governança|A RE-VERIFICAR'`
```
7ff1e0039c07b22b84acf8007eef6835560e823a
PRESENTE docs/revisoes/SAN3/B-O6R-07c-b1-ciclo2-plano.md
PRESENTE agent-orchestration/omega/juntas/J-B-O6R-07c-b1-ciclo1.md
285:### 2.9 Governança e mandatos sugeridos para as 3 cadeiras do ciclo 2 (≤ 3 itens cada)
```

Os três corpos pertencem ao OBJETO nos dois espelhos; os md5 EOL-neutros do arquivo inteiro são próprios porque o espelho Codex contém o preâmbulo portátil intencional. A equivalência da transformação é provada pelo S0. Presença e md5, medido por: `O=$O; for p in <os-seis-caminhos-abaixo>; do git cat-file -e "$O:$p"; printf '%s | PRESENTE | md5 ' "$p"; git show "$O:$p" | tr -d '\r' | md5sum | cut -d' ' -f1 | fold -w4 | paste -sd-; done`
```
.claude/agents/especialistas/jurado-07cb1c2-c1-trava-unica-e-rbac.md | PRESENTE | md5 4817-c69d-4de3-e037-c008-3ea5-0680-fd9f
.agents/agents/especialistas/jurado-07cb1c2-c1-trava-unica-e-rbac.md | PRESENTE | md5 0d99-0b1c-48f6-c18a-a6ef-84fb-b13d-c817
.claude/agents/especialistas/jurado-07cb1c2-c2-transacao-e-compensacao.md | PRESENTE | md5 35e9-b313-53ee-06ea-23f5-610f-af47-7784
.agents/agents/especialistas/jurado-07cb1c2-c2-transacao-e-compensacao.md | PRESENTE | md5 de71-2539-c022-8b56-fce6-0446-9813-ddae
.claude/agents/especialistas/jurado-07cb1c2-c3-censo-escopo-e-regressao.md | PRESENTE | md5 44db-36af-06f2-49c1-5073-24fe-9da0-d2a1
.agents/agents/especialistas/jurado-07cb1c2-c3-censo-escopo-e-regressao.md | PRESENTE | md5 8959-3bb4-dd9b-dcc6-f18d-362b-18bf-d642
```

O S0 está verde, medido por: `node scripts/sync-agent-agents.mjs --check; echo ec=$?`
```
[agents-sync] OK — 61 agentes, espelho consistente.
ec=0
```

As decisões exigidas estão no OBJETO em `agent-orchestration/controle/decisoes.md`; “No local” substitui a formulação anterior, cancelamento sem troca fica fora da autorização no b1, reatribuição conjunta da via web fica para b2, evidência exige OS e IA externa com limite vem primeiro, medido por: `O=$O; f=agent-orchestration/controle/decisoes.md; for id in D1-07c D2-07c D-07CB-EMENDA-RECOMENDACOES D-INICIO-ATENDIMENTO-CONFIRMADO D-07CB1-CANCELAR-NO-LOCAL-SEM-AUTORIZACAO D-07CB1-ATRIBUICAO-WEB-REATRIBUI-NO-B2 D-07CB1-EVIDENCIA-EXIGE-OS D-IAS-EXTERNAS-PRIMEIRO; do git show "$O:$f" | grep -n -i -m1 "$id" || true; done`
```
D1-07c: presente em origin/main
D2-07c: presente em origin/main
D-07CB-EMENDA-RECOMENDACOES: presente em origin/main
D-INICIO-ATENDIMENTO-CONFIRMADO: presente em origin/main — atendimento iniciado em No local
D-07CB1-CANCELAR-NO-LOCAL-SEM-AUTORIZACAO: presente em origin/main
D-07CB1-ATRIBUICAO-WEB-REATRIBUI-NO-B2: presente em origin/main
D-07CB1-EVIDENCIA-EXIGE-OS: presente em origin/main
D-IAS-EXTERNAS-PRIMEIRO: presente em origin/main
```

## HIPOTESE

Você é `jurado-07cb1c2-c2-transacao-e-compensacao`, identidade nova, executor Codex GPT-5.6 Sol, esforço médio, nível menor. Na primeira linha de `c2-evidencia.md`, declare executor efetivo, modelo, nível, objeto, `mandato_md5`, blob do corpo no OBJETO e md5 EOL-neutro dos dois espelhos. Seu corpo canônico é `.claude/agents/especialistas/jurado-07cb1c2-c2-transacao-e-compensacao.md`; o espelho Codex correspondente existe no mesmo OBJETO, com preâmbulo portátil próprio, e o S0 prova a transformação EOL-neutra. Os blobs e md5 medidos estão na seção MEDIDO acima; confira-os antes de medir mérito derruba com: `head -1 C:/Users/AMP/w-07cb1/agent-orchestration/omega/juntas/votos/B-O6R-07c-b1-ciclo2/c2-evidencia.md | grep -i -E 'executor|mandato_md5|blob|md5'`

A legalidade vem antes do mérito: parecer do inspetor LIBERADO ou LIBERADO COM RESSALVA nomeando sua identidade, executor, worktree e cluster; objeto ainda é o head com CI concluído; decisões medidas em origin/main; ata e plano anteriores são **A RE-VERIFICAR**. Régua: PERMISSÃO, unanimidade de 3 com veto, ciclo 2; todo achado traz gravidade, classe, escopo, N e forma; preexistente exige origem e bloco dono; não consigo medir um item meu é REPROVADO; você não propõe correção e não lê votos alheios derruba com: `grep -i -E 'legalidade|A RE-VERIFICAR|escopo|classe' C:/Users/AMP/w-07cb1/agent-orchestration/omega/juntas/votos/B-O6R-07c-b1-ciclo2/c2-voto.json`

Terreno: worktree exclusivo prefixado `C:/Users/AMP/w-j07cb1c2-c2-`, npm ci próprio e zero junction; cluster e rede próprios com containers `j07cb1c2-c2-*`, nenhuma porta publicada. Antes de subir conte trabalhos Docker alheios excluindo erp-*; máximo 2 incluindo o seu. Nunca use base viva nem portas 5432, 6379, 3000, 5173, 5050 e 8899. Remova somente o que criou e prove teardown; mutações só em cópia descartável, com restauro por hash derruba com: `grep -i -E 'j07cb1c2-c2-|5432|junction|teardown' C:/Users/AMP/w-07cb1/agent-orchestration/omega/juntas/votos/B-O6R-07c-b1-ciclo2/c2-evidencia.md`

P1: apense comando, saída, N/forma e veredito parcial após cada item. P2: `c2-voto.json` nasce esqueleto com três itens EM APURAÇÃO e fecha antes da mensagem final de uma linha. P3: sucessor de identidade nova reexecuta toda evidência. P4: exatamente três itens. P5: máximo dois jurados paralelos. P6: queda é registrada em 00-quedas.md. P7: PAUSA grava estado e para. Únicos outputs: `c2-evidencia.md` e `c2-voto.json`; nunca commit derruba com: `test -f C:/Users/AMP/w-07cb1/agent-orchestration/omega/juntas/votos/B-O6R-07c-b1-ciclo2/c2-voto.json`

Item 1 de 3, por execução no Postgres próprio: gatilho temporário escopado pelo tenant no evento dos quatro caminhos create, reassign, ativação e web; com erro, OS, assignment, evento e despacho ficam inalterados; controles no assignment e sem gatilho; compare contra o objeto do ciclo 1 **A RE-VERIFICAR**, rode MT9 e prove `pg_trigger`/`pg_proc` zero no fim derruba com: `grep -i -E 'Item 1|gatilho|MT9|pg_trigger|pg_proc' C:/Users/AMP/w-07cb1/agent-orchestration/omega/juntas/votos/B-O6R-07c-b1-ciclo2/c2-evidencia.md`

Item 2 de 3: em memória, espião prova zero chamadas externas ao evento nos quatro caminhos e timeline exatamente uma vez; compensação por falha do repositório continua restaurando; RLS envolve assign e assignFromDispatch com GUC antes da query; ratchet contém as duas chaves e MT8, retirada de chave e omissão de wrapper ficam vermelhos derruba com: `grep -i -E 'Item 2|timeline|RLS|GUC|MT8|ratchet' C:/Users/AMP/w-07cb1/agent-orchestration/omega/juntas/votos/B-O6R-07c-b1-ciclo2/c2-evidencia.md`

Item 3 de 3: `evidence.work_order_*` exige OS para tenant_admin e manager, com inexistente e alheia indistinguíveis como `rejected not_found`, real aceita e não vaza id; reexecute amostra independente D2 das quatro famílias, ex-técnico em conflito, nunca-técnico rejeitado e upload 409. K2 após reinício é pendência do b2, salvo efeito novo derruba com: `grep -i -E 'Item 3|not_found|conflict|upload|K2' C:/Users/AMP/w-07cb1/agent-orchestration/omega/juntas/votos/B-O6R-07c-b1-ciclo2/c2-evidencia.md`

## MEDIDO

Pré-voo deste mandato com as ferramentas copiadas de `origin/chore/mandato-refs-e-preflight` para a subpasta própria do scratchpad e arnês fixado em `C:/Users/AMP/w-07cb1`, medido por: `MANDATO_REFS=<scratch-do-redator>/mandato-refs.sh bash <scratch-do-redator>/arnes/mandato-preflight.sh <este-mandato> 440; echo ec=$?`
```
COLAGEM    l.6-22: refs do PR #440 confere com a saida atual
AVISO      corrida hex em caminho versionado nao cobrada pela checagem 4: '07cb1c2' em .claude/agents/especialistas/jurado-07cb1c2-c1-trava-unica-e-rbac.md — l.34
AVISO      corrida hex em caminho versionado nao cobrada pela checagem 4: '07cb1c2' em .agents/agents/especialistas/jurado-07cb1c2-c1-trava-unica-e-rbac.md — l.35
AVISO      corrida hex em caminho versionado nao cobrada pela checagem 4: '07cb1c2' em .claude/agents/especialistas/jurado-07cb1c2-c2-transacao-e-compensacao.md — l.36
AVISO      corrida hex em caminho versionado nao cobrada pela checagem 4: '07cb1c2' em .agents/agents/especialistas/jurado-07cb1c2-c2-transacao-e-compensacao.md — l.37
AVISO      corrida hex em caminho versionado nao cobrada pela checagem 4: '07cb1c2' em .claude/agents/especialistas/jurado-07cb1c2-c3-censo-escopo-e-regressao.md — l.38
AVISO      corrida hex em caminho versionado nao cobrada pela checagem 4: '07cb1c2' em .agents/agents/especialistas/jurado-07cb1c2-c3-censo-escopo-e-regressao.md — l.39
AVISO      corrida hex em caminho versionado nao cobrada pela checagem 4: '07cb1c2' em .claude/agents/especialistas/jurado-07cb1c2-c2-transacao-e-compensacao.md — l.62
AVISO      cabeca-aprovada NAO DETERMINAVEL (mandato-refs.sh ec=3) — a proveniencia dos SHAs vale; rode 'bash C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/<scratch-id>/scratchpad/mandatos-07cb1/redator-07cb1c2-cdx/mandato-refs.sh 440' para ver o que a ferramenta viu. 

PRE-VOO OK — C:/Users/AMP/w-07cb1/agent-orchestration/omega/juntas/votos/B-O6R-07c-b1-ciclo2/00-mandatos/cadeira-c2.md
ec=0
head=7ff1e0039c07b22b84acf8007eef6835560e823a
```
