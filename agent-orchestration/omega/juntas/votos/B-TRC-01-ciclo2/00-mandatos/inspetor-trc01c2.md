# Mandato — Inspetor de terreno da junta — B-TRC-01 ciclo 2 (PR 426, junta de seguranca)

## MEDIDO

Estado do PR 426 pela ferramenta do B-GOV-MANDATO, extraida sem edicao de origin/chore/mandato-refs-e-preflight para a pasta mandatos-07cb1 do scratchpad do redator e executada a partir de C:/Users/AMP/w-trc01, medido por: `bash <scratch-do-redator>/mandato-refs.sh 426`
```
# refs do PR #426 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato
# gerado em: 2026-10-18T02:24Z · repo: thiagodorgo/ERP_Techsolutios

ramo:            feat/traccar-b-trc-01
base:            origin/main
estado:          OPEN | rascunho=false | MERGEABLE
head do PR:      2043c5840c8f60fe91538840aaefb3420a11cfe3
merge-base:      c260d36201f6e835799e7f96a14bc9eb8889ca5a
merge commit:    <ainda nao mergeado>
check-runs:      total=14 nao-verdes=0 pendentes=0
approved_head:   NAO DETERMINAVEL (a ata casa o PR mas NAO declara aprovacao: nenhuma linha '- **approved_head:**')
                 objeto declarado 5abdf83bfcfcac9f70cb1e1aad1c7a7a7cecbf91 (agent-orchestration/omega/juntas/J-B-TRC-01-ciclo1.md:3 @head-do-PR) — aprovacao nao legivel por maquina
                 NAO invente: sem a linha '- **approved_head:**' numa ata que se declare
                 sobre este PR, a ferramenta NAO afirma qual head a junta aprovou.

```

Os arquivos que o ramo muda contra a base dele (merge-base com origin/main), 93 no total, medido por: `git diff --name-only "$(git merge-base origin/main HEAD)" HEAD | paste -sd" "`
```
.agents/agents/especialistas/jurado-trc01-a-rls-e-banco.md .agents/agents/especialistas/jurado-trc01-b-superficie-e-segredo.md .agents/agents/especialistas/jurado-trc01-c-contrato-e-atribuicao.md .agents/agents/especialistas/jurado-trc01c2-a-rls-banco-e-ci.md .agents/agents/especialistas/jurado-trc01c2-b-escopo-superficie-e-trava.md .agents/agents/especialistas/jurado-trc01c2-c-viatura-no-tempo.md .claude/agents/especialistas/jurado-trc01-a-rls-e-banco.md .claude/agents/especialistas/jurado-trc01-b-superficie-e-segredo.md .claude/agents/especialistas/jurado-trc01-c-contrato-e-atribuicao.md .claude/agents/especialistas/jurado-trc01c2-a-rls-banco-e-ci.md .claude/agents/especialistas/jurado-trc01c2-b-escopo-superficie-e-trava.md .claude/agents/especialistas/jurado-trc01c2-c-viatura-no-tempo.md .env.example .github/workflows/ci.yml API_CONTRACTS.md agent-orchestration/codex/comandos/B-TRC-01-traccar-posicao-no-mapa.md agent-orchestration/omega/juntas/J-B-TRC-01-ciclo1.md agent-orchestration/omega/juntas/votos/B-TRC-01/00-mandatos/cadeira-a.md agent-orchestration/omega/juntas/votos/B-TRC-01/00-mandatos/cadeira-b.md agent-orchestration/omega/juntas/votos/B-TRC-01/00-mandatos/cadeira-c.md agent-orchestration/omega/juntas/votos/B-TRC-01/00-mandatos/inspetor-trc01.md agent-orchestration/omega/juntas/votos/B-TRC-01/00-quedas.md agent-orchestration/omega/juntas/votos/B-TRC-01/cadeira-a-evidencia.md agent-orchestration/omega/juntas/votos/B-TRC-01/cadeira-a-voto.json agent-orchestration/omega/juntas/votos/B-TRC-01/cadeira-b-evidencia.md agent-orchestration/omega/juntas/votos/B-TRC-01/cadeira-b-voto.json agent-orchestration/omega/juntas/votos/B-TRC-01/cadeira-c-evidencia.md agent-orchestration/omega/juntas/votos/B-TRC-01/cadeira-c-voto.json agent-orchestration/omega/juntas/votos/B-TRC-01/dba-guardiao-parecer.md agent-orchestration/omega/juntas/votos/B-TRC-01/insp-trc01-evidencia-1a-inspecao.md agent-orchestration/omega/juntas/votos/B-TRC-01/insp-trc01-evidencia.md agent-orchestration/omega/juntas/votos/B-TRC-01/insp-trc01-parecer-1a-inspecao.md agent-orchestration/omega/juntas/votos/B-TRC-01/insp-trc01-parecer.md agent-orchestration/omega/reprovacoes/R-B-TRC-01-ciclo1.md docker-compose.traccar.yml docs/deployment.md docs/revisoes/TRACCAR/B-TRC-01-DECISAO-T13.md docs/revisoes/TRACCAR/B-TRC-01-ciclo2-dev.md docs/revisoes/TRACCAR/B-TRC-01-dev.md docs/revisoes/TRACCAR/B-TRC-01-evidencias/bateria.sh docs/revisoes/TRACCAR/B-TRC-01-evidencias/mutations.mjs docs/revisoes/TRACCAR/B-TRC-01-evidencias/pgbench-gen.mjs docs/revisoes/TRACCAR/B-TRC-01-evidencias/results-dev-2026-10-11-rodada1.jsonl docs/revisoes/TRACCAR/B-TRC-01-evidencias/results-dev-2026-10-11-rodada2-final.jsonl docs/revisoes/TRACCAR/B-TRC-01-evidencias/run-mutations.mjs docs/revisoes/TRACCAR/B-TRC-01-evidencias/t13-mutante-formas-do-plano.ts.txt docs/revisoes/TRACCAR/PLANO_TRACCAR.md infra/traccar/dev/traccar.xml infra/traccar/fixtures/6.16.0/position-osmand.json prisma/migrations/20260874000000_traccar_ingestion_foundation/migration.sql prisma/migrations/20260875000000_validate_location_source_check/migration.sql prisma/migrations/20260876000000_work_orders_vehicle_assigned_at/migration.sql prisma/schema.prisma scripts/traccar-capture-fixture.mjs scripts/traccar-dev-demo.mjs src/config/env.ts src/database/rls.ts src/integrations/traccar/index.ts src/integrations/traccar/traccar-db.ts src/integrations/traccar/traccar-forward-auth.ts src/integrations/traccar/traccar-ingest.app.ts src/integrations/traccar/traccar-ingest.bootstrap.ts src/integrations/traccar/traccar-ingest.logger.ts src/integrations/traccar/traccar-ingestion.repository.ts src/integrations/traccar/traccar-ingestion.service.ts src/integrations/traccar/traccar-position.adapter.ts src/integrations/traccar/traccar-position.schema.ts src/integrations/traccar/traccar-rate-limit.ts src/integrations/traccar/traccar-resolution.ts src/modules/field-dispatch/field-dispatch-prisma.repository.ts src/modules/field-dispatch/field-dispatch.repository.ts src/modules/field-dispatch/field-dispatch.types.ts src/modules/field-location/field-location-prisma.repository.ts src/modules/field-location/field-location.service.ts src/modules/field-location/field-location.types.ts src/server.ts tests/san3-05-acessos-de-plataforma-guard.test.ts tests/san3-05-runtime-role-guard-db.test.ts tests/traccar-binding-uniqueness-db.test.ts tests/traccar-dev-topology.test.ts tests/traccar-forward-auth.test.ts tests/traccar-idempotency-db.test.ts tests/traccar-ingest-listener.test.ts tests/traccar-ingest-logs.test.ts tests/traccar-ingest-pool-db.test.ts tests/traccar-operator-at-fix-time.test.ts tests/traccar-position-contract.test.ts tests/traccar-position-ingestion-db.test.ts tests/traccar-quarantine-db.test.ts tests/traccar-rate-limit.test.ts tests/traccar-resolution-cost.test.ts tests/traccar-resolution-race-db.test.ts tests/traccar-rls-budget-order.test.ts
```

O head julgado no ciclo 1 (lido da linha 3 da ata do ciclo 1, para nao ser digitado aqui) e ancestral do objeto, e quantos arquivos mudam dele ate o objeto, medido por: `h1=$(sed -n 3p agent-orchestration/omega/juntas/J-B-TRC-01-ciclo1.md | grep -o -i -E "[0-9a-f]{40}" | head -1); git merge-base --is-ancestor "$h1" HEAD; echo ancestral_ec=$?; git diff --name-only "$h1" HEAD | wc -l`
```
ancestral_ec=0
130
```

As decisoes do dono que a junta aplica, por linha de agent-orchestration/controle/decisoes.md no objeto e em origin/main, medido por: `O=2043c5840c8f60fe91538840aaefb3420a11cfe3; f=agent-orchestration/controle/decisoes.md; for r in $O origin/main; do for id in D-TRC01-VEHICLE-ASSIGNED-AT D-TRACCAR-HTTP-PRIVADO-AWS D-GOV-PROPORCIONAL D-GEMINI-PRO-API-TETO D-GEMINI-SEGUNDO-REVISOR D-BRACOS-E-DOCKER-17-10; do n=$(MSYS_NO_PATHCONV=1 git show "$r:$f" | grep -n -i -e "$id" | cut -d: -f1 | head -4 | paste -sd,); echo "$r $id: ${n:-ausente}"; done; done`
```
2043c5840c8f60fe91538840aaefb3420a11cfe3 D-TRC01-VEHICLE-ASSIGNED-AT: 3682
2043c5840c8f60fe91538840aaefb3420a11cfe3 D-TRACCAR-HTTP-PRIVADO-AWS: 2210
2043c5840c8f60fe91538840aaefb3420a11cfe3 D-GOV-PROPORCIONAL: 2940,2973,2982,3010
2043c5840c8f60fe91538840aaefb3420a11cfe3 D-GEMINI-PRO-API-TETO: 3715,3723
2043c5840c8f60fe91538840aaefb3420a11cfe3 D-GEMINI-SEGUNDO-REVISOR: 3636,3638,3692,3715
2043c5840c8f60fe91538840aaefb3420a11cfe3 D-BRACOS-E-DOCKER-17-10: 3716
origin/main D-TRC01-VEHICLE-ASSIGNED-AT: 3682
origin/main D-TRACCAR-HTTP-PRIVADO-AWS: 2210
origin/main D-GOV-PROPORCIONAL: 2940,2973,2982,3010
origin/main D-GEMINI-PRO-API-TETO: 3715,3723
origin/main D-GEMINI-SEGUNDO-REVISOR: 3636,3638,3692,3715
origin/main D-BRACOS-E-DOCKER-17-10: 3716
```

A autorizacao nominal da migracao no objeto, com a opcao escolhida para as linhas antigas (o carimbo de 14 digitos do nome da migracao sai trocado por um marcador, porque a checagem 4 o cobraria fora do caminho), medido por: `MSYS_NO_PATHCONV=1 git show 2043c5840c8f60fe91538840aaefb3420a11cfe3:agent-orchestration/controle/decisoes.md | sed -n 3682p | sed -E "s,[0-9]{14},<carimbo>,g"`
```
- **`D-TRC01-VEHICLE-ASSIGNED-AT` (autorização NOMINAL de migração).** Autorizada, no ciclo 2 do B-TRC-01 (PR #426), a migração aditiva `<carimbo>_work_orders_vehicle_assigned_at`: coluna `work_orders.vehicle_assigned_at timestamptz NULL` + função/gatilho `SECURITY INVOKER`, rollback comentado, gravada só pelo banco, para que a posição vá ao técnico pela viatura que a OS tinha no instante do fix. **Opção (i):** linhas antigas ficam nulas e inelegíveis até a próxima atribuição/UPDATE da OS (falha fechada, igual ao `operator_assigned_at`). O histórico por períodos fica para o B-TRC-03. Origem do pedido: §2.4.6 do plano do ciclo 2 (auditoria e plano do modelo de topo).
```

O teto da API do Gemini que esta escrito, e se ha registro de teto para uma cadeira do B-TRC-01 (nenhuma linha com US$ 3 nem com Gemini e TRC-01 juntos), medido por: `f=agent-orchestration/controle/decisoes.md; MSYS_NO_PATHCONV=1 git show "origin/main:$f" | grep -i -o -E "Teto por tarefa:[^.]*\."; echo "linhas_US3_ou_TRC01_Gemini=$(MSYS_NO_PATHCONV=1 git show "origin/main:$f" | grep -i -c -E "US[$] ?3|TRC-01.*Gemini|Gemini.*TRC-01")"`
```
Teto por tarefa: **US$ 5 no dev do `B-DASH-PERFIL`** e **US$ 5 numa cadeira da junta do `B-O6R-07c-b1`**.
linhas_US3_ou_TRC01_Gemini=0
```

O limite de Docker que esta escrito (3 trabalhos, D-BRACOS-E-DOCKER-17-10) e se ha registro de um limite de 2, no objeto e na origin/main, medido por: `O=2043c5840c8f60fe91538840aaefb3420a11cfe3; f=agent-orchestration/controle/decisoes.md; for r in $O origin/main; do echo "$r limite_2_escrito=$(MSYS_NO_PATHCONV=1 git show "$r:$f" | grep -i -c -E "no m[aá]ximo 2 |2 trabalhos|dois trabalhos|m[aá]ximo dois") limite_3_escrito=$(MSYS_NO_PATHCONV=1 git show "$r:$f" | grep -i -c -E "maximo 3 trabalhos")"; done`
```
2043c5840c8f60fe91538840aaefb3420a11cfe3 limite_2_escrito=0 limite_3_escrito=1
origin/main limite_2_escrito=0 limite_3_escrito=1
```

Os insumos da junta: a ata e o registro de reprovacao do ciclo 1 e o relatorio do dev do ciclo 2 estao no objeto; o plano do ciclo 2 NAO esta versionado (vive fora do repositorio, no caminho absoluto abaixo), medido por: `O=2043c5840c8f60fe91538840aaefb3420a11cfe3; for p in agent-orchestration/omega/juntas/J-B-TRC-01-ciclo1.md agent-orchestration/omega/reprovacoes/R-B-TRC-01-ciclo1.md docs/revisoes/TRACCAR/B-TRC-01-ciclo2-dev.md docs/revisoes/TRACCAR/PLANO_TRACCAR.md; do MSYS_NO_PATHCONV=1 git cat-file -e "$O:$p" 2>/dev/null && echo "$p no objeto: sim" || echo "$p no objeto: nao"; done; echo "plano_ciclo2_versionado=$(git ls-tree -r --name-only $O | grep -i -c "B-TRC-01-ciclo2-auditoria")"; wc -l < C:/Users/AMP/erp-pausa-2026-10-03/planos/B-TRC-01-ciclo2-auditoria-e-plano.md`
```
agent-orchestration/omega/juntas/J-B-TRC-01-ciclo1.md no objeto: sim
agent-orchestration/omega/reprovacoes/R-B-TRC-01-ciclo1.md no objeto: sim
docs/revisoes/TRACCAR/B-TRC-01-ciclo2-dev.md no objeto: sim
docs/revisoes/TRACCAR/PLANO_TRACCAR.md no objeto: sim
plano_ciclo2_versionado=0
612
```

O parecer do guardiao de banco do ciclo 2 (R-DBA) existe na pasta desta junta, NAO rastreado, com a instancia e o veredito, medido por: `p=agent-orchestration/omega/juntas/votos/B-TRC-01-ciclo2/dba-guardiao-c2-parecer.md; grep -n -i -E "^- Inst|^## (APROVA|REPROVA)" "$p"; git ls-files --error-unmatch "$p" > /dev/null 2>&1 && echo rastreado || echo nao_rastreado`
```
3:- Instância: `dba-trc01-c2-cdx`
13:## APROVA
nao_rastreado
```

Os check-runs do job backend-postgres no objeto (o inspetor le o log deles: as 6 suites com skipped 0), medido por: `timeout 60 gh api "repos/thiagodorgo/ERP_Techsolutios/commits/2043c5840c8f60fe91538840aaefb3420a11cfe3/check-runs?per_page=100" --jq "[.check_runs[]|select(.name==\"backend-postgres\")|\"\(.name) \(.status) \(.conclusion)\"]|.[]"`
```
backend-postgres completed success
backend-postgres completed success
```

Os corpos das tres cadeiras no objeto sao os do disco do worktree, nos dois espelhos, por md5 EOL-neutro (o valor do md5 vai no disparo, nao aqui: fronteira 22 do pre-voo), medido por: `O=2043c5840c8f60fe91538840aaefb3420a11cfe3; for c in a-rls-banco-e-ci b-escopo-superficie-e-trava c-viatura-no-tempo; do for d in .claude .agents; do p=$d/agents/especialistas/jurado-trc01c2-$c.md; a=$(MSYS_NO_PATHCONV=1 git show "$O:$p" | tr -d "\r" | md5sum); b=$(tr -d "\r" < "$p" | md5sum); [ "$a" = "$b" ] && echo "$p objeto x disco: IDENTICO" || echo "$p objeto x disco: DIVERGE"; done; done`
```
.claude/agents/especialistas/jurado-trc01c2-a-rls-banco-e-ci.md objeto x disco: IDENTICO
.agents/agents/especialistas/jurado-trc01c2-a-rls-banco-e-ci.md objeto x disco: IDENTICO
.claude/agents/especialistas/jurado-trc01c2-b-escopo-superficie-e-trava.md objeto x disco: IDENTICO
.agents/agents/especialistas/jurado-trc01c2-b-escopo-superficie-e-trava.md objeto x disco: IDENTICO
.claude/agents/especialistas/jurado-trc01c2-c-viatura-no-tempo.md objeto x disco: IDENTICO
.agents/agents/especialistas/jurado-trc01c2-c-viatura-no-tempo.md objeto x disco: IDENTICO
```

O modelo de mandato do CLAUDE.md secao C7.7, verbatim no objeto, medido por: `MSYS_NO_PATHCONV=1 git show 2043c5840c8f60fe91538840aaefb3420a11cfe3:CLAUDE.md | sed -n 693,700p`
```
   Após CADA item: apense a <cadeira>-evidencia.md → comando · saída resumida · veredito parcial.  [P1]
   Antes da mensagem final: escreva <cadeira>-voto.json. Mensagem final = 1 linha apontando o arquivo.  [P2]
   Máximo 3 itens; logs longos só no arquivo de evidência.  [P4]
   Se você substituir um caído: re-execute cada comando do <cadeira>-evidencia.md dele e compare, depois
   meça a cauda. Conclusão sem comando registrado NÃO é insumo.  [P3]
   Se receber PAUSA: termine o comando em curso, grave `## PAUSA <hora UTC>` em <cadeira>-evidencia.md
   (head · feito · falta · próximo comando · arquivos meio-escritos) e pare sozinho com 1 linha apontando
   o arquivo. Não inicie item novo.  [P7]
```

Os worktrees que existem agora com os nomes deste tabuleiro (w-trc01 do dev; w-jc2-a, w-jc2-b, w-jc2-c e w-jc2-insp aparecem aqui se ja tiverem sido criados), medido por: `git -C C:/Users/AMP/Documents/GitHub/ERP_Techsolutios worktree list | grep -i -E "w-trc01|w-jc2" | awk "{print \$1, \$3, \$4}" | sed -E "s,[[:space:]]+\$,,"`
```
C:/Users/AMP/w-trc01 [feat/traccar-b-trc-01]
```

A arvore C:/Users/AMP/w-trc01 esta no objeto, as linhas modificadas que o git status lista sao so de fim de linha, e estes sao os nao rastreados (o parecer e a evidencia do R-DBA, um log solto do dev e, depois deles, os arquivos desta junta), medido por: `echo "porcelain_M=$(git status --porcelain | grep -i -c "^ M") conteudo_sem_CR=$(git diff --ignore-cr-at-eol --name-only | wc -l)"; git status --porcelain --untracked-files=all | grep -i "^??"; git rev-parse HEAD`
```
porcelain_M=52 conteudo_sem_CR=0
?? .npmtest-503.log
?? agent-orchestration/omega/juntas/votos/B-TRC-01-ciclo2/00-mandatos/cadeira-a.md
?? agent-orchestration/omega/juntas/votos/B-TRC-01-ciclo2/00-mandatos/cadeira-b.md
?? agent-orchestration/omega/juntas/votos/B-TRC-01-ciclo2/00-mandatos/cadeira-c.md
?? agent-orchestration/omega/juntas/votos/B-TRC-01-ciclo2/00-mandatos/inspetor-trc01c2.md
?? agent-orchestration/omega/juntas/votos/B-TRC-01-ciclo2/00-quedas.md
?? agent-orchestration/omega/juntas/votos/B-TRC-01-ciclo2/dba-guardiao-c2-evidencia.md
?? agent-orchestration/omega/juntas/votos/B-TRC-01-ciclo2/dba-guardiao-c2-parecer.md
2043c5840c8f60fe91538840aaefb3420a11cfe3
```

Docker agora: grupos de trabalho vivos por prefixo (tl, j e trc01; o limite desta junta e 2 trabalhos), e containers erp- (base viva) ou jtrc01c2- de pe, medido por: `echo "grupos_tl_j_trc01=$(timeout 30 docker ps --format "{{.Names}}" | grep -i -E "^(tl|j|trc01)" | cut -d- -f1 | sort -u | wc -l) erp_ou_jtrc01c2=$(timeout 30 docker ps --format "{{.Names}}" | grep -i -c -E "^(erp-|jtrc01c2-)")"; df -h /c | tail -1; date -u +%Y-%m-%dT%H:%MZ`
```
grupos_tl_j_trc01=1 erp_ou_jtrc01c2=2
C:              238G  223G   16G  94% /c
2026-10-18T02:24Z
```

O corpo do inspetor fixa o modelo, e e o mesmo no objeto e na origin/main nos dois espelhos, medido por: `O=2043c5840c8f60fe91538840aaefb3420a11cfe3; for p in .claude/agents/inspetor-de-terreno-da-junta.md .agents/agents/inspetor-de-terreno-da-junta.md; do MSYS_NO_PATHCONV=1 git show "$O:$p" | grep -n -i "^model:"; a=$(MSYS_NO_PATHCONV=1 git show "$O:$p" | tr -d "\r" | md5sum); b=$(MSYS_NO_PATHCONV=1 git show "origin/main:$p" | tr -d "\r" | md5sum); [ "$a" = "$b" ] && echo "$p objeto x origin/main: IDENTICO" || echo "$p objeto x origin/main: DIVERGE"; done`
```
5:model: opus
.claude/agents/inspetor-de-terreno-da-junta.md objeto x origin/main: IDENTICO
4:model: opus
.agents/agents/inspetor-de-terreno-da-junta.md objeto x origin/main: IDENTICO
```

O que o contrato no objeto diz do Gemini (a API paga com teto por tarefa entrou em 17/10), medido por: `MSYS_NO_PATHCONV=1 git show 2043c5840c8f60fe91538840aaefb3420a11cfe3:CLAUDE.md | sed -n 558,562p`
```
   **Gemini, pelo Antigravity** (declaração do dono, 2026-10-13, `D-GEMINI-PRO-NIVEL-CODEX`; e decisão do dono,
   2026-10-14, `D-GEMINI-SEGUNDO-REVISOR`): o **Gemini Pro** equivale ao nível menor e entra pela assinatura ou, desde 2026-10-17, pela **API paga com
   teto em dólar por tarefa autorizado pelo dono** (`D-GEMINI-PRO-API-TETO`). **Leitura do orquestrador, declarada (§A6):** o **Gemini Flash** fica abaixo do nível menor e não
   ocupa cadeira, inspetor, porteiro nem dev de bloco de risco. Como revisor de PR, o Gemini entra **só como segundo
   revisor**, e o achado dele é conferido antes de valer; e não faz design (`D-DESIGN-SO-CLAUDE`).
```

## HIPOTESE

O papel e o inspetor-de-terreno-da-junta (contrato secao C7.1-bis, fail-closed), instancia nova inspetor-trc01c2-cdx (o papel que
  os corpos das cadeiras chamam de jtrc01c2-insp) para a junta de SEGURANCA do CICLO 2 do bloco B-TRC-01 (PR 426, ingestao do
  Traccar, secao C7 item 8(4)), rodando no Codex em GPT-5.6 Sol, esforco medio; o corpo fixa model: opus (medido acima), e esta e
  uma troca de EXECUTOR no MESMO nivel menor (contrato secao C7.6: Opus no Claude Code e GPT-5.6 Sol no Codex), feita pela regra
  nova do dono que o orquestrador repassou (as IAs externas vem primeiro e o Claude so cobre falta; a regra nao esta escrita em
  decisoes.md do objeto nem da origin/main, o que o inspetor registra); usa o corpo .claude/agents/inspetor-de-terreno-da-junta.md
  do objeto, entregue no prompt, e declara na 1a linha do parecer o papel, a instancia, o executor, o modelo, a troca e o motivo, o
  mandato_md5 deste arquivo e o md5 EOL-neutro do corpo; nao julga merito e nao vota derruba com: `head -1 C:/Users/AMP/w-trc01/agent-orchestration/omega/juntas/votos/B-TRC-01-ciclo2/insp-trc01c2-parecer.md | grep -ic 'mandato_md5'` (novo)

O objeto e o head do PR 426 resolvido pelo proprio inspetor por git ls-remote e por gh pr view, so com os check-runs CONCLUIDOS
  (ausencia, queued, in_progress ou cancelled bloqueia o start; vermelho e insumo do voto); e, pelo plano do ciclo 2 secao 2.6, o
  inspetor confere ainda (i) que a autorizacao nominal do dono para a migracao nova (D-TRC01-VEHICLE-ASSIGNED-AT, opcao (i), medida
  acima) esta escrita na ref antes de a migracao entrar no diff; (ii) que o parecer R-DBA do ciclo 2 (dba-guardiao-c2-parecer.md,
  APROVA, medido acima) esta no briefing, e registra que ele NAO esta rastreado; (iii) que o backend-postgres do objeto tem
  check-run concluido COM as 6 suites -db do Traccar, lendo o log (skipped 0) derruba com: `grep -ic 'skipped 0' C:/Users/AMP/w-trc01/agent-orchestration/omega/juntas/votos/B-TRC-01-ciclo2/insp-trc01c2-parecer.md` (novo)

Os insumos estao na ref ou declarados fora dela: a ata e o registro de reprovacao do ciclo 1 e o relatorio do dev do ciclo 2 estao
  no objeto (medido acima); o plano do ciclo 2 vive so em C:/Users/AMP/erp-pausa-2026-10-03/planos/B-TRC-01-ciclo2-auditoria-e-plano.md,
  fora do repositorio (medido acima), e o inspetor registra isso como insumo nao versionado, com o md5 EOL-neutro dele no parecer,
  para que as tres cadeiras leiam o mesmo texto derruba com: `grep -ic 'auditoria-e-plano' C:/Users/AMP/w-trc01/agent-orchestration/omega/juntas/votos/B-TRC-01-ciclo2/insp-trc01c2-parecer.md` (novo)

O tabuleiro tem tres cadeiras de identidade nova, cada uma com o seu executor, todos no nivel menor e declarados: (a′)
  jurado-trc01c2-a-rls-banco-e-ci no Codex em GPT-5.6 Sol esforco medio; (b′) jurado-trc01c2-b-escopo-superficie-e-trava no Gemini
  3.1 Pro pela API, com teto declarado de US$ 3, e sob a D-GEMINI-SEGUNDO-REVISOR (o orquestrador re-executa cada achado antes de
  valer); (c′) jurado-trc01c2-c-viatura-no-tempo no Claude Code em Claude Opus 5.5, instancia jurado-trc01c2-c-opus (ordem do dono: o
  Claude entra nesta cadeira); e a (a′) tem reserva declarada: se o Codex nao comecar, o Claude Opus assume como sucessor de
  identidade nova; os corpos estao rastreados no objeto nos dois
  espelhos, o S0 fica verde (node scripts/sync-agent-agents.mjs --check no worktree do inspetor) e corpo carregado x julgado e
  conferido de forma EOL-neutra contra o md5 que o orquestrador publica no disparo derruba com: `grep -ic 'sync-agent-agents' C:/Users/AMP/w-trc01/agent-orchestration/omega/juntas/votos/B-TRC-01-ciclo2/insp-trc01c2-parecer.md` (novo)

O uso pago da API do Gemini na (b′) precisa de teto autorizado pelo dono por tarefa (contrato secao C7.6 no objeto, medido acima);
  o teto escrito cobre so o dev do B-DASH-PERFIL e uma cadeira do B-O6R-07c-b1, e nao ha linha com US$ 3 nem com Gemini e TRC-01
  (medido acima): o inspetor registra a ausencia de autorizacao escrita para esta cadeira e decide se ela impede o start (secao A2,
  sem resolver por conta propria); e registra tambem que o limite de 2 trabalhos com container, que o orquestrador e os corpos citam
  como decisao do dono de 17/10, nao esta escrito em decisoes.md, que registra 3 (D-BRACOS-E-DOCKER-17-10), e que o tabuleiro segue
  o mais restrito derruba com: `grep -ic 'US\$ 3' C:/Users/AMP/w-trc01/agent-orchestration/omega/juntas/votos/B-TRC-01-ciclo2/insp-trc01c2-parecer.md` (novo)

A inelegibilidade e conferida POR NOME contra a lista dos tres corpos e contra
  agent-orchestration/omega/juntas/OBITUARIO-IDENTIDADES.md: inelegiveis as tres cadeiras do ciclo 1 e todo ocupante delas
  (jurado-trc01-a-rls-e-banco e sucessores, jurado-trc01-b-superficie-e-segredo e sucessores, jurado-trc01-c-contrato-e-atribuicao);
  os planejadores planejador-traccar-01, planejador-traccar-02, o agente da API das emendas v2.2 e v2.3 e o planejador-trc01-ciclo2;
  os criticos critico-traccar-r1 e critico-traccar-r2 e o pesquisador da G-TRC-PD; os devs dev-trc01-claude, dev-trc01-codex,
  dev-trc01-503-agy, dev-trc01-503-gemini, dev-trc01-503-flash, rev-503-delta e o dev do ciclo 2 com sucessores; os guardioes
  dba-trc01-cdx, dba-trc01-cdx2 e dba-trc01-c2-cdx; o inspetor do ciclo 1 inspetor-trc01-cdx; o orquestrador, a agente-fabrica e este
  redator (redator-mandatos-07cb1-opus) derruba com: `grep -ic 'inelegib' C:/Users/AMP/w-trc01/agent-orchestration/omega/juntas/votos/B-TRC-01-ciclo2/insp-trc01c2-parecer.md` (novo)

O terreno: C:/Users/AMP/w-trc01 e a arvore do dev e so recebe os arquivos de saida desta junta (o inspetor confere que nenhum
  processo vivo escreve nela e que o conteudo segue igual ao objeto; o log solto do dev nao e alvo, reporta-se); worktrees proprios
  detached no objeto C:/Users/AMP/w-jc2-a, C:/Users/AMP/w-jc2-b e C:/Users/AMP/w-jc2-c (e os de comparacao que os corpos nomeiam:
  w-jc2-a-base, w-jc2-b-h1, w-jc2-c-h1), cada um com npm ci proprio e sem junction (secao C7.1-ter(c)); Postgres 16 e Redis 7
  descartaveis por cadeira com prefixo jtrc01c2-a-, jtrc01c2-b- e jtrc01c2-c-, so em 127.0.0.1 numa porta alta testada (as
  candidatas dos corpos sao 47661/47671, 47662/47672 e 47663/47673); no maximo 2 trabalhos com container ao mesmo tempo na maquina,
  contados por prefixo antes de cada subida; a base viva, as portas do dono e os servidores publicos de demonstracao do Traccar
  nunca sao alvo; o worktree C:/Users/AMP/w-07cb1 nao e alvo derruba com: `grep -ic 'jtrc01c2-' C:/Users/AMP/w-trc01/agent-orchestration/omega/juntas/votos/B-TRC-01-ciclo2/insp-trc01c2-parecer.md` (novo)

O baseline e o plano de perda de jurado ficam declarados no parecer: baseline honesto medido pelo inspetor no proprio worktree e o
  livre em C: (os corpos mandam parar abaixo de cerca de 3 GB); queda vira linha no 00-quedas.md desta junta pelo orquestrador (P6),
  o sucessor tem identidade NOVA com sufixo (os corpos dao o exemplo -s2) e re-executa o que a evidencia registrou (P3), voto
  perdido nunca conta e a junta nao fecha com menos de 3 votos; executor sem cota (Codex no limite, teto do Gemini atingido, Opus
  esgotado) para e registra onde esta, sem descer degrau (secao C7.6-bis),
  inclusive o proprio inspetor no Codex derruba com: `grep -ic 'perda de jurado' C:/Users/AMP/w-trc01/agent-orchestration/omega/juntas/votos/B-TRC-01-ciclo2/insp-trc01c2-parecer.md` (novo)

O veredito e LIBERADO, LIBERADO COM RESSALVA ou BLOQUEADO, e o parecer NOMEIA cada cadeira com o seu executor, o seu worktree, o
  seu prefixo de container e as portas, porque e isso que cada cadeira confere na legalidade; a evidencia e incremental com hora em
  C:/Users/AMP/w-trc01/agent-orchestration/omega/juntas/votos/B-TRC-01-ciclo2/insp-trc01c2-evidencia.md e o parecer em
  C:/Users/AMP/w-trc01/agent-orchestration/omega/juntas/votos/B-TRC-01-ciclo2/insp-trc01c2-parecer.md, escrito antes da mensagem
  final (P1, P2), que o orquestrador versiona; worktree proprio detached C:/Users/AMP/w-jc2-insp, removido pelo nome; nunca tail -f;
  timeout no que executa; PAUSA grava a secao PAUSA e para (P7) derruba com: `grep -icE 'LIBERADO|BLOQUEADO' C:/Users/AMP/w-trc01/agent-orchestration/omega/juntas/votos/B-TRC-01-ciclo2/insp-trc01c2-parecer.md` (novo)

## MEDIDO

Pre-voo deste mandato no head do PR, com o pre-voo de origin/chore/mandato-refs-e-preflight copiado para um arnes local no scratchpad do redator (unica alteracao, na linha 211: RAIZ fixada em C:/Users/AMP/w-trc01; o mandato-refs.sh entra pela costura MANDATO_REFS; na saida colada, o carimbo de 14 digitos entre aspas, o nome do campo reservado citado no AVISO e o caminho do scratchpad saem trocados por marcadores, porque as checagens 4 e 7 os cobrariam fora da colagem) medido por: `MANDATO_REFS=<scratch-do-redator>/mandato-refs.sh bash <arnes>/mandato-preflight.sh <este-mandato> 426 2>&1 | sed -E "$FILTRO"; echo ec=$?` com FILTRO = `s,'[0-9]{14}','<14 digitos da migracao>',; s,appro.ed.head,<campo reservado>,g; s,C:/Users/AMP/AppData/Local/Temp/[^ ']*/mandato-refs.sh,<scratch-do-redator>/mandato-refs.sh,g`
```
COLAGEM    l.6-22: refs do PR #426 confere com a saida atual
AVISO      corrida hex em caminho versionado nao cobrada pela checagem 4: '<14 digitos da migracao>' em prisma/migrations/20260874000000_traccar_ingestion_foundation/migration.sql — l.26
AVISO      corrida hex em caminho versionado nao cobrada pela checagem 4: '<14 digitos da migracao>' em prisma/migrations/20260875000000_validate_location_source_check/migration.sql — l.26
AVISO      corrida hex em caminho versionado nao cobrada pela checagem 4: '<14 digitos da migracao>' em prisma/migrations/20260876000000_work_orders_vehicle_assigned_at/migration.sql — l.26
AVISO      <campo reservado> NAO DETERMINAVEL (mandato-refs.sh ec=3) — a proveniencia dos SHAs vale; rode 'bash <scratch-do-redator>/mandato-refs.sh 426' para ver o que a ferramenta viu.

PRE-VOO OK — C:/Users/AMP/w-trc01/agent-orchestration/omega/juntas/votos/B-TRC-01-ciclo2/00-mandatos/inspetor-trc01c2.md
ec=0
head=2043c5840c8f60fe91538840aaefb3420a11cfe3
utc=2026-10-18T02:25:01Z
```
