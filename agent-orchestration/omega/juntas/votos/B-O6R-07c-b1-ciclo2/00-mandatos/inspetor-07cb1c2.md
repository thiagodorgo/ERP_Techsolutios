# Mandato — Inspetor — B-O6R-07c-b1 ciclo 2

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

Você é `inspetor-07cb1c2`, identidade nova, executor Codex GPT-5.6 Sol, esforço médio, nível menor; declare executor efetivo, modelo, nível, objeto e `mandato_md5` na primeira linha da evidência. Você não vota nem julga mérito. O objeto só é liberável se continuar sendo o head do PR e tiver 14 de 14 check-runs concluídos e verdes; a ata e o plano do ciclo 1 são **A RE-VERIFICAR**. A régua é PERMISSÃO, unanimidade de 3 com veto, ciclo 2, último em que achado bloqueante não grave dentro do bloco reprova derruba com: `head -1 C:/Users/AMP/w-07cb1/agent-orchestration/omega/juntas/votos/B-O6R-07c-b1-ciclo2/insp-07cb1c2-evidencia.md | grep -i -E 'Codex|GPT-5.6|mandato_md5'`

Item 1 de 3: resolva o objeto por `git ls-remote` e `gh pr view`; confira check-runs concluídos; rode o pré-voo dos quatro mandatos; confira por blob do OBJETO e md5 EOL-neutro os corpos das três cadeiras nos dois espelhos. No objeto medido acima os seis blobs existem e S0 está verde; qualquer divergência posterior bloqueia o início, sem substituir corpo por arquivo do disco derruba com: `grep -i -E 'seis blobs|S0|md5|LIBERADO|BLOQUEADO' C:/Users/AMP/w-07cb1/agent-orchestration/omega/juntas/votos/B-O6R-07c-b1-ciclo2/insp-07cb1c2-parecer.md`

Item 2 de 3: confira inelegibilidade por nome: `jurado-07cb1-c1-opus`, `jurado-07cb1-c1-argon`, `jurado-07cb1-c2-opus`, o ocupante Gemini da C2, `jurado-07cb1-c3-opus`, `planejador-07cb1-ciclo2`, `dev-b-o6r-07c-b1-argon`, `dev-b-o6r-07c-b1-opus` e `dev-07cb1-ciclo2-opus`. Nomeie no parecer C1 e C2 em Codex GPT-5.6 Sol; C3 na primeira IA externa com limite que estiver livre; Claude Opus somente reserva declarada. O executor efetivo deve aparecer na primeira linha de cada evidência derruba com: `grep -i -E 'ineleg|C1|C2|C3|reserva' C:/Users/AMP/w-07cb1/agent-orchestration/omega/juntas/votos/B-O6R-07c-b1-ciclo2/insp-07cb1c2-parecer.md`

Item 3 de 3: confira árvore sem mutação viva, admitindo somente os ` M` EOL-neutros em `.agents/` e os cinco outputs desta redação; worktree e cluster próprios por cadeira, prefixos `j07cb1c2-c1-`, `j07cb1c2-c2-`, `j07cb1c2-c3-`; `npm ci` próprio, nunca junction; no máximo 2 trabalhos Docker, excluída a base `erp-*`; nenhuma porta publicada e nunca base viva nem portas 5432, 6379, 3000, 5173, 5050 e 8899. Declare baseline honesto, plano de perda P3/P6 e máximo de 2 jurados paralelos derruba com: `grep -i -E 'j07cb1c2-c1-|j07cb1c2-c2-|j07cb1c2-c3-|5432|P3|P6' C:/Users/AMP/w-07cb1/agent-orchestration/omega/juntas/votos/B-O6R-07c-b1-ciclo2/insp-07cb1c2-parecer.md`

P1: evidência incremental após cada item. P2: parecer nasce esqueleto e é fechado antes da mensagem final; mensagem final é uma linha. P3: sucessor novo reexecuta comandos registrados. P4: três itens. P5: até dois em paralelo e duas quedas em trinta minutos impõem pausa. P6: queda vai imediatamente a `00-quedas.md`. P7: PAUSA grava head, feito, falta, próximo comando e arquivos meio-escritos, então para. Seus únicos outputs são `insp-07cb1c2-evidencia.md` e `insp-07cb1c2-parecer.md`; nunca commit derruba com: `test -f C:/Users/AMP/w-07cb1/agent-orchestration/omega/juntas/votos/B-O6R-07c-b1-ciclo2/insp-07cb1c2-parecer.md`

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
AVISO      cabeca-aprovada NAO DETERMINAVEL (mandato-refs.sh ec=3) — a proveniencia dos SHAs vale; rode 'bash C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/<scratch-id>/scratchpad/mandatos-07cb1/redator-07cb1c2-cdx/mandato-refs.sh 440' para ver o que a ferramenta viu. 

PRE-VOO OK — C:/Users/AMP/w-07cb1/agent-orchestration/omega/juntas/votos/B-O6R-07c-b1-ciclo2/00-mandatos/inspetor-07cb1c2.md
ec=0
head=7ff1e0039c07b22b84acf8007eef6835560e823a
```
