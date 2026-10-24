# Mandato — Inspetor de terreno — B-TRC-02 ciclo 1 (junta de SEGURANÇA, Traccar)

## MEDIDO

Estado do PR 454 no instante da redação, pela ferramenta `mandato-refs.sh` copiada sem mudança do ramo `origin/chore/mandato-refs-e-preflight` para a pasta própria deste redator `C:/Users/AMP/erp-pausa-2026-10-03/redator-trc02-v2/`, com o cwd no worktree do objeto; é o ciclo 1, nenhuma ata nomeia o PR e a ferramenta sai com ec 0, medido por: `cd C:/Users/AMP/w-trc02 && bash C:/Users/AMP/erp-pausa-2026-10-03/redator-trc02-v2/mandato-refs.sh 454`
```
# refs do PR #454 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato
# gerado em: 2026-10-21T08:02Z · repo: thiagodorgo/ERP_Techsolutios

ramo:            feat/traccar-b-trc-02
base:            origin/main
estado:          OPEN | rascunho=false | MERGEABLE
head do PR:      38504427a7b962545e559bd4d312b520b458ac42
merge-base:      539b078e311a5521b0d496ba5afae8f73acc43a0
merge commit:    <ainda nao mergeado>
check-runs:      total=14 nao-verdes=0 pendentes=0
approved_head:   AUSENTE — nenhuma ata nomeia nem menciona #454
                 (a junta nao votou, ou a ata nao esta em origin/main nem no head do PR)

```

O ramo remoto aponta para o mesmo SHA que o PR declara como head (segunda fonte do objeto), medido por: `git -C C:/Users/AMP/w-trc02 ls-remote origin refs/heads/feat/traccar-b-trc-02`
```
38504427a7b962545e559bd4d312b520b458ac42	refs/heads/feat/traccar-b-trc-02
```

Os 14 check-runs do objeto estão concluídos e todos `success` (zero fora de `completed success`), em sete jobs com os dois gatilhos, medido por: `gh api repos/thiagodorgo/ERP_Techsolutios/commits/38504427a7b962545e559bd4d312b520b458ac42/check-runs --jq '.total_count, ([.check_runs[] | select(.status != "completed" or .conclusion != "success")] | length), ([.check_runs[] | .name] | sort | join(", "))'`
```
14
0
authority-portal, authority-portal, backend, backend, backend-postgres, backend-postgres, docker, docker, flutter, flutter, frontend, frontend, owner-portal, owner-portal
```

O merge do B-TRC-01 (PR 426), que o plano v2 usa como base dos arquivos do 01 e do vermelho-controle no `src/` antigo, é o `merge commit` abaixo, lido pela mesma ferramenta; ela sai com ec 3 porque três atas casam o 426 e ela não escolhe, o que não é matéria desta junta, medido por: `cd C:/Users/AMP/w-trc02 && bash C:/Users/AMP/erp-pausa-2026-10-03/redator-trc02-v2/mandato-refs.sh 426`
```
# refs do PR #426 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato
# gerado em: 2026-10-21T08:02Z · repo: thiagodorgo/ERP_Techsolutios

ramo:            feat/traccar-b-trc-01
base:            origin/main
estado:          MERGED | rascunho=false | UNKNOWN
head do PR:      9b93df5f6f2ab06d67ed1d39c8af20732c5c3429
merge-base:      40c3651f066278654e2c71df4c3b38e1d90994c8
merge commit:    c1485c94f3e99a33f5b8f6aec96a12bc922a237e
check-runs:      total=14 nao-verdes=0 pendentes=0
approved_head:   NAO DETERMINAVEL (3 atas casam #426 no cabecalho — a ferramenta nao escolhe)
                 objeto declarado 5abdf83bfcfcac9f70cb1e1aad1c7a7a7cecbf91 (agent-orchestration/omega/juntas/J-B-TRC-01-ciclo1.md:3 @head-do-PR) — aprovacao nao legivel por maquina
                 objeto declarado 2043c5840c8f60fe91538840aaefb3420a11cfe3 (agent-orchestration/omega/juntas/J-B-TRC-01-ciclo2.md:3 @head-do-PR) — aprovacao nao legivel por maquina
                 objeto declarado 7c220467f754341a699c18c241fa9965c1a35638 (agent-orchestration/omega/juntas/J-B-TRC-01-ciclo3.md:3 @head-do-PR) — aprovacao nao legivel por maquina
                 agent-orchestration/omega/juntas/J-B-DASH-PERFIL-ciclo1.md (mencao no corpo) @origin/main
                 NAO invente: sem a linha '- **approved_head:**' numa ata que se declare
                 sobre este PR, a ferramenta NAO afirma qual head a junta aprovou.

```

As duas ferramentas do pré-voo na pasta do redator são as do ramo `origin/chore/mandato-refs-e-preflight` (que não estão no objeto), com uma única diferença, uma linha do `mandato-preflight.sh` trocada (o `RAIZ` fixado no worktree do objeto); o `mandato-refs.sh` é igual, medido por: `cd C:/Users/AMP/Documents/GitHub/ERP_Techsolutios && for f in $(git ls-tree --name-only origin/chore/mandato-refs-e-preflight scripts/ | grep -i -E 'mandato-(refs|preflight)'); do b=$(basename $f); diff <(git show origin/chore/mandato-refs-e-preflight:$f) C:/Users/AMP/erp-pausa-2026-10-03/redator-trc02-v2/$b | grep -i -E '^[<>]'; echo "$b linhas-diferentes=$(diff <(git show origin/chore/mandato-refs-e-preflight:$f) C:/Users/AMP/erp-pausa-2026-10-03/redator-trc02-v2/$b | grep -c -i -E '^[<>]')"; done`
```
< RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
> RAIZ=C:/Users/AMP/w-trc02
mandato-preflight.sh linhas-diferentes=2
mandato-refs.sh linhas-diferentes=0
```

Do merge-base ao objeto o ramo tem 28 commits de primeiro pai contados abaixo; depois da emenda v2.3 (`<objeto>~5`, 07:40), da emenda v2.4 (`<objeto>~4`, 08:51) e do registro das duas (`<objeto>~3`, 08:52), entraram o registro da transação explícita e da revisão da Q1 (`<objeto>~2`, 09:45), a M-E09 re-especificada (`<objeto>~1`, 09:50) e o registro das decisões do dono de 21/10 (`<objeto>`, 00:35); o registro que trouxe os corpos dos três jurados é das 05:55, ANTES das emendas, medido por: `cd C:/Users/AMP/w-trc02 && git rev-list --first-parent --count 539b078e311a5521b0d496ba5afae8f73acc43a0..38504427a7b962545e559bd4d312b520b458ac42; git log --first-parent --format='%ad %s' --date=format:'%m-%d %H:%M' 539b078e311a5521b0d496ba5afae8f73acc43a0..38504427a7b962545e559bd4d312b520b458ac42 | head -9 | cut -c1-96`
```
28
10-21 00:35 docs(registro): decisões do dono de 21/10 — C-10 guarda o evento sem despacho e m
10-20 09:50 test(traccar): M-E09 re-especificada na forma atual do evento e a injeção antiga p
10-20 09:45 docs(registro): D-TRC02-MIGRACAO-TRANSACAO-EXPLICITA, P-MIGRACOES-ANTERIORES-SEM-TRA
10-20 08:52 docs(registro): emendas v2.3 e v2.4 no D-TRC02-ESCOPO e 4 pendências nomeadas (B-TR
10-20 08:51 fix(traccar): inventário de acessos de plataforma com as chaves da telemetria, even
10-20 07:40 fix(traccar): migração A como transação explícita, down com guarda antes de qua
10-20 06:08 ci(traccar): um comentário só de total na lista curada, re-medido no ramo integrad
10-20 05:57 Merge remote-tracking branch 'origin/main' into feat/traccar-b-trc-02
10-20 05:55 docs(registro): B-TRC-02 — a Q1 revista pelo dono (D-TRC02-Q1-NAO), o escopo do bl
```

Os insumos do briefing que vivem no objeto existem nele: o plano v2, as quatro emendas, as respostas do dono, o relatório do dev, a crítica r2, a captura da fixture, o comando do bloco, os três corpos nos dois espelhos, o corpo do inspetor de terreno e o parecer do porteiro do 426, medido por: `cd C:/Users/AMP/w-trc02 && for p in docs/revisoes/TRACCAR/B-TRC-02-plano.md docs/revisoes/TRACCAR/B-TRC-02-emenda-v2.1.md docs/revisoes/TRACCAR/B-TRC-02-emenda-v2.2-escopo.md docs/revisoes/TRACCAR/B-TRC-02-emenda-v2.3.md docs/revisoes/TRACCAR/B-TRC-02-emenda-v2.4-acessos.md docs/revisoes/TRACCAR/B-TRC-02-respostas-do-dono.md docs/revisoes/TRACCAR/B-TRC-02-dev.md docs/revisoes/TRACCAR/B-TRC-02-critica-r2-opus.md docs/revisoes/TRACCAR/B-TRC-02-evento-captura.md agent-orchestration/codex/comandos/B-TRC-02-traccar-eventos-e-telemetria.md .claude/agents/especialistas/jurado-trc02-a-banco-rls-arnes.md .agents/agents/especialistas/jurado-trc02-a-banco-rls-arnes.md .claude/agents/especialistas/jurado-trc02-b-superficie-escopo-registro.md .agents/agents/especialistas/jurado-trc02-b-superficie-escopo-registro.md .claude/agents/especialistas/jurado-trc02-c-contrato-evento-unidades.md .agents/agents/especialistas/jurado-trc02-c-contrato-evento-unidades.md .claude/agents/inspetor-de-terreno-da-junta.md agent-orchestration/omega/juntas/votos/B-TRC-01-ciclo3/porteiro-426-parecer.md; do git cat-file -e "38504427a7b962545e559bd4d312b520b458ac42:$p" && echo "PRESENTE $p" || echo "AUSENTE $p"; done`
```
PRESENTE docs/revisoes/TRACCAR/B-TRC-02-plano.md
PRESENTE docs/revisoes/TRACCAR/B-TRC-02-emenda-v2.1.md
PRESENTE docs/revisoes/TRACCAR/B-TRC-02-emenda-v2.2-escopo.md
PRESENTE docs/revisoes/TRACCAR/B-TRC-02-emenda-v2.3.md
PRESENTE docs/revisoes/TRACCAR/B-TRC-02-emenda-v2.4-acessos.md
PRESENTE docs/revisoes/TRACCAR/B-TRC-02-respostas-do-dono.md
PRESENTE docs/revisoes/TRACCAR/B-TRC-02-dev.md
PRESENTE docs/revisoes/TRACCAR/B-TRC-02-critica-r2-opus.md
PRESENTE docs/revisoes/TRACCAR/B-TRC-02-evento-captura.md
PRESENTE agent-orchestration/codex/comandos/B-TRC-02-traccar-eventos-e-telemetria.md
PRESENTE .claude/agents/especialistas/jurado-trc02-a-banco-rls-arnes.md
PRESENTE .agents/agents/especialistas/jurado-trc02-a-banco-rls-arnes.md
PRESENTE .claude/agents/especialistas/jurado-trc02-b-superficie-escopo-registro.md
PRESENTE .agents/agents/especialistas/jurado-trc02-b-superficie-escopo-registro.md
PRESENTE .claude/agents/especialistas/jurado-trc02-c-contrato-evento-unidades.md
PRESENTE .agents/agents/especialistas/jurado-trc02-c-contrato-evento-unidades.md
PRESENTE .claude/agents/inspetor-de-terreno-da-junta.md
PRESENTE agent-orchestration/omega/juntas/votos/B-TRC-01-ciclo3/porteiro-426-parecer.md
```

Os insumos de FORA do objeto existem, com a data de modificação abaixo (todas anteriores a esta redação): o parecer do DBA, a pré-revisão Flash e as respostas do dono com a revisão da Q1, medido por: `for f in C:/Users/AMP/erp-pausa-2026-10-03/revisoes/B-TRC-02-dba-parecer.md C:/Users/AMP/erp-pausa-2026-10-03/revisoes/B-TRC-02-prerevisao-flash.md C:/Users/AMP/erp-pausa-2026-10-03/planos/B-TRC-02-respostas-do-dono.md; do echo "$(date -r "$f" '+%Y-%m-%d %H:%M') $(basename "$f")"; done`
```
2026-10-20 07:53 B-TRC-02-dba-parecer.md
2026-10-20 01:29 B-TRC-02-prerevisao-flash.md
2026-10-19 22:09 B-TRC-02-respostas-do-dono.md
```

O parecer do porteiro do 426 (item (iv) do plano v2 §10, "Inspetor") está no objeto com veredito LIBERADO COM RESSALVA, e o corpo do inspetor de terreno no objeto fixa `model: opus`, medido por: `cd C:/Users/AMP/w-trc02 && git show 38504427a7b962545e559bd4d312b520b458ac42:agent-orchestration/omega/juntas/votos/B-TRC-01-ciclo3/porteiro-426-parecer.md | tr -d '\r' | grep -n -i -o -E '\b(LIBERADO COM RESSALVA|BLOQUEADO)\b' | head -3; git show 38504427a7b962545e559bd4d312b520b458ac42:.claude/agents/inspetor-de-terreno-da-junta.md | tr -d '\r' | grep -n -i -E '^model:'`
```
72:LIBERADO COM RESSALVA
5:model: opus
```

Item (ii) do plano: cada um dos três carimbos de migração que o bloco disputa aparece uma única vez na árvore do objeto (a do B-SAN3-02 e as duas do bloco, renumeradas); item (iii): o teste H8 das fixtures sanitizadas existe no objeto, medido por: `cd C:/Users/AMP/w-trc02 && for n in _invoice_complementary_title _vehicle_telemetry_events _validate_receipt_message_kind_check; do echo "$n $(git ls-tree -d --name-only 38504427a7b962545e559bd4d312b520b458ac42 prisma/migrations/ | grep -c -i -E "$n\$")"; done; git show 38504427a7b962545e559bd4d312b520b458ac42:tests/traccar-event-topology.test.ts | tr -d '\r' | grep -n -i -o -E 'test\("evento: as 5 fixtures de evento estão sanitizadas'`
```
_invoice_complementary_title 1
_vehicle_telemetry_events 1
_validate_receipt_message_kind_check 1
234:test("evento: as 5 fixtures de evento estão sanitizadas
```

Identidades que planejaram, criticaram, pré-revisaram, desenvolveram, deram parecer de banco, registraram, fabricaram corpos ou dão nome às cadeiras deste bloco, GERADAS dos arquivos do diff do bloco (merge-base contra o objeto; piso da inelegibilidade, não teto); a família do B-TRC-01 (todas inelegíveis pelo plano v2 §10) tem o número de nomes contado abaixo, medido por: `cd C:/Users/AMP/w-trc02 && for f in $(git diff --name-only 539b078e311a5521b0d496ba5afae8f73acc43a0 38504427a7b962545e559bd4d312b520b458ac42 -- docs/revisoes/TRACCAR agent-orchestration .claude .agents); do git show "38504427a7b962545e559bd4d312b520b458ac42:$f"; done | grep -o -i -E '\b(planejador|critico|dev|rev|prerev|dba|fabrica|inspetor|redator|registrador|jurado|porteiro)-trc-?0?2[a-z0-9-]*' | sed -E 's#-+$##' | sort -u; git grep -h -o -i -E '\b(planejador|critico|dev|rev|prerev|dba|fabrica|inspetor|redator|registrador|jurado|porteiro)-trc-?0?1[a-z0-9-]*' 38504427a7b962545e559bd4d312b520b458ac42 -- agent-orchestration docs .claude .agents | sed -E 's#-+$##' | sort -u | wc -l`
```
critico-trc02-flash
critico-trc02-opus
critico-trc02-r2-opus
dba-trc02-opus
dev-trc02-opus
fabrica-trc02-opus
fabrica-trc02b-opus
jurado-trc02
jurado-trc02-a-banco-rls-arnes
jurado-trc02-a-banco-rls-arnes-s2
jurado-trc02-b-superficie-escopo-registro
jurado-trc02-b-superficie-escopo-registro-s2
jurado-trc02-c-contrato-evento-unidades
jurado-trc02-c-contrato-evento-unidades-s2
planejador-trc02-emenda-fable
planejador-trc02-escopo-fable
planejador-trc02-fable
planejador-trc02-v2-fable
planejador-trc02-v23-fable
planejador-trc02-v24-fable
prerev-trc02-flash
registrador-trc02-opus
68
```

As quatro identidades desta junta e o redator destes mandatos (nomeados pelo orquestrador) não aparecem em arquivo nenhum do objeto, e nenhuma identidade com radical `trc02` está no obituário de identidades, medido por: `cd C:/Users/AMP/w-trc02 && git grep -c -i -E 'inspetor-trc02-opus|jurado-trc02-a-opus|jurado-trc02-b-opus|jurado-trc02-c-opus|redator-trc02-opus' 38504427a7b962545e559bd4d312b520b458ac42 | wc -l; git show 38504427a7b962545e559bd4d312b520b458ac42:agent-orchestration/omega/juntas/OBITUARIO-IDENTIDADES.md | grep -c -i 'trc02'`
```
0
0
```

Os três corpos das cadeiras existem no objeto e, descontados o frontmatter e o bloco de adaptação Codex do espelho, são IDÊNTICOS entre `.claude/agents/especialistas/` e `.agents/agents/especialistas/` (comparação EOL-neutra; o arquivo inteiro DIFERE por construção do espelho, e por isso não se publica hash); nenhum deles menciona as emendas v2.3 e v2.4, o drill novo ou os casos T-M, porque o único commit que os tocou é o registro das 05:55. O corpo da cadeira C já exige E8: evento de viatura sem despacho resulta em 204 e uma linha, e classifica recusar ou quarentenar esse evento como bloqueio — portanto trata C-10 como guardar, medido por: `cd C:/Users/AMP/w-trc02 && for c in a-banco-rls-arnes b-superficie-escopo-registro c-contrato-evento-unidades; do diff <(git show "38504427a7b962545e559bd4d312b520b458ac42:.claude/agents/especialistas/jurado-trc02-$c.md" | tr -d '\r' | awk 'f; $0=="---"{n++; if(n==2) f=1}' | sed '/^$/d') <(git show "38504427a7b962545e559bd4d312b520b458ac42:.agents/agents/especialistas/jurado-trc02-$c.md" | tr -d '\r' | awk 'f; $0=="---"{n++; if(n==2) f=1}' | awk 'index($0,"Papel para o Codex"){s=1} s&&$0==""{s=0; next} !s' | sed '/^$/d') >/dev/null && echo "IDENTICO corpo $c" || echo "DIVERGE corpo $c"; echo "menções a v2.3/v2.4/drill/T-M: $(git show 38504427a7b962545e559bd4d312b520b458ac42:.claude/agents/especialistas/jurado-trc02-$c.md | grep -c -i -E 'v2\.3|v2\.4|migration-drill|T-M\(')"; done; git show 38504427a7b962545e559bd4d312b520b458ac42:.claude/agents/especialistas/jurado-trc02-c-contrato-evento-unidades.md | tr -d '\r' | grep -n -i -E 'E8\. Viatura vinculada|Evento de viatura sem despacho recusado'; git log --format='%ad %s' --date=format:'%m-%d %H:%M' 38504427a7b962545e559bd4d312b520b458ac42 -- .claude/agents/especialistas/jurado-trc02-a-banco-rls-arnes.md .claude/agents/especialistas/jurado-trc02-b-superficie-escopo-registro.md .claude/agents/especialistas/jurado-trc02-c-contrato-evento-unidades.md | cut -c1-60`
```
IDENTICO corpo a-banco-rls-arnes
menções a v2.3/v2.4/drill/T-M: 0
IDENTICO corpo b-superficie-escopo-registro
menções a v2.3/v2.4/drill/T-M: 0
IDENTICO corpo c-contrato-evento-unidades
menções a v2.3/v2.4/drill/T-M: 0
497:- Evento de viatura sem despacho recusado ou levado à quarentena: `bloqueia`, `não grave` (C-10 é objetivo do bloco).
10-20 05:55 docs(registro): B-TRC-02 — a Q1 revista pelo d
```

O S0 executado num worktree descartável no objeto, criado e removido a partir da árvore principal, está verde, medido por: `cd C:/Users/AMP/Documents/GitHub/ERP_Techsolutios && git worktree add --detach C:/Users/AMP/w-rtrc02-s0 38504427a7b962545e559bd4d312b520b458ac42 >/dev/null 2>&1; node C:/Users/AMP/w-rtrc02-s0/scripts/sync-agent-agents.mjs --check; echo ec=$?; git worktree remove --force C:/Users/AMP/w-rtrc02-s0; test -e C:/Users/AMP/w-rtrc02-s0 || echo "worktree descartavel removido"`
```
[agents-sync] OK — 79 agentes, espelho consistente.
ec=0
worktree descartavel removido
```

O parecer do DBA (`dba-trc02-opus`) NÃO está no objeto: vive fora dele, em `C:/Users/AMP/erp-pausa-2026-10-03/revisoes/B-TRC-02-dba-parecer.md`, com veredito final FAVORÁVEL na rodada 2, sobre `<objeto>~5` (o commit da emenda v2.3); de `<objeto>~5` ao objeto nenhum caminho de `prisma/` mudou, e os 13 caminhos que mudaram são os da emenda v2.4, da M-E09 e dos registros, medido por: `grep -n -i -o -E 'Veredito final \(rodada 2|FAVOR.{1,3}VEL\*\* — D1, R1 e R2 fechados|^\*\*FAVOR.{1,3}VEL\.\*\* D1, R1 e R2' C:/Users/AMP/erp-pausa-2026-10-03/revisoes/B-TRC-02-dba-parecer.md; cd C:/Users/AMP/w-trc02 && git ls-tree -r --name-only 38504427a7b962545e559bd4d312b520b458ac42 agent-orchestration/omega/juntas/votos | grep -c -i 'B-TRC-02'; git log -1 --format=%s 38504427a7b962545e559bd4d312b520b458ac42~5 | cut -c1-70; git diff --name-only 38504427a7b962545e559bd4d312b520b458ac42~5 38504427a7b962545e559bd4d312b520b458ac42 -- prisma | wc -l; git diff --name-only 38504427a7b962545e559bd4d312b520b458ac42~5 38504427a7b962545e559bd4d312b520b458ac42`
```
3:Veredito final (rodada 2
3:FAVORÁVEL** — D1, R1 e R2 fechados
176:**FAVORÁVEL.** D1, R1 e R2
0
fix(traccar): migração A como transação explícita, down com guard
0
.github/workflows/ci.yml
agent-orchestration/codex/comandos/B-TRC-02-traccar-eventos-e-telemetria.md
agent-orchestration/controle/decisoes.md
agent-orchestration/controle/pendencias-indice.md
agent-orchestration/controle/pendencias.md
docs/revisoes/TRACCAR/B-TRC-02-dev.md
docs/revisoes/TRACCAR/B-TRC-02-emenda-v2.4-acessos.md
docs/revisoes/TRACCAR/B-TRC-02-evidencias/mutations.mjs
docs/revisoes/TRACCAR/B-TRC-02-evidencias/results-db-v23.jsonl
docs/revisoes/TRACCAR/B-TRC-02-respostas-do-dono.md
src/integrations/traccar/traccar-ingestion.service.ts
tests/san3-05-acessos-de-plataforma-guard.test.ts
tests/traccar-event-ingestion-db.test.ts
```

A decisão do dono `D-MIGRACAO-COM-TRANSACAO-EXPLICITA` está no objeto: toda migração nova com mais de uma sentença e apenas DDL transacional leva `BEGIN;`/`COMMIT;` e drill por prefixo; `CONCURRENTLY` fica sozinho e declara a não-atomicidade. O guard de CI ainda pertence a bloco de ferramenta a nomear, e migrações antigas seguem na pendência declarada, medido por: `cd C:/Users/AMP/w-trc02 && git show 38504427a7b962545e559bd4d312b520b458ac42:agent-orchestration/controle/decisoes.md | tr -d '\r' | grep -n -i -E 'D-MIGRACAO-COM-TRANSACAO-EXPLICITA|A regra:.*migração nova|Exceção:.*CONCURRENTLY|Guard de CI:'; git show 38504427a7b962545e559bd4d312b520b458ac42:agent-orchestration/controle/pendencias.md | tr -d '\r' | grep -n -i -o -E '^## P-MIGRACOES-ANTERIORES-SEM-TRANSACAO-EXPLICITA|status:\*\* ABERTA' | tail -2`
```
3875:- **`D-MIGRACAO-COM-TRANSACAO-EXPLICITA` (decisão do dono, 2026-10-21).** Palavras do dono: ***"3=aprovo"***, à regra geral recomendada pelo planejador do `B-TRC-02` (emenda v2.3) depois de a mesma classe de defeito aparecer em dois blocos seguidos (`B-SAN3-02` C2-01 e `B-TRC-02` D1).
3876:  - **A regra:** toda migração nova com mais de uma sentença, e só de DDL transacional, leva `BEGIN;`/`COMMIT;` no próprio arquivo e um drill por prefixo (falha injetada após cada sentença, pelo `prisma migrate deploy` real).
3877:  - **Exceção:** migração com `CONCURRENTLY` fica sozinha no arquivo e declara a não-atomicidade.
3878:  - **Guard de CI:** um guard reprova migração nova que viole a regra. Ele é implementado por um bloco de ferramenta (regra (1) de `D-GOV-PROPORCIONAL`), dono a nomear; até lá, vale como regra do planejador e do DBA. As migrações antigas seguem pela `P-MIGRACOES-ANTERIORES-SEM-TRANSACAO-EXPLICITA`.
11600:## P-MIGRACOES-ANTERIORES-SEM-TRANSACAO-EXPLICITA
11602:status:** ABERTA
```

A variante do código é Q1 = NÃO (decisão do dono de 19/10, `D-TRC02-Q1-NAO`, linha 3824 do `decisoes.md` do objeto); a cópia `docs/revisoes/TRACCAR/B-TRC-02-respostas-do-dono.md` NO OBJETO agora traz a seção "Revisão da Q1 pelo dono" ("TRC-02 Q1 = Não"), alinhada ao arquivo fora do repositório; a migração A do objeto não tem `fix_key` nem `position_sample`, medido por: `cd C:/Users/AMP/w-trc02 && git show 38504427a7b962545e559bd4d312b520b458ac42:agent-orchestration/controle/decisoes.md | tr -d '\r' | grep -n -i -o -E 'D-TRC02-Q1-NAO. \(decisão do dono, 2026-10-19|"TRC-02 Q1 = Não"'; git show 38504427a7b962545e559bd4d312b520b458ac42:docs/revisoes/TRACCAR/B-TRC-02-respostas-do-dono.md | tr -d '\r' | grep -c -i -E 'Q1 *= *N.{1,3}O'; grep -n -i -o -E '^## Revis.{1,3}o da Q1 pelo dono|"TRC-02 Q1 = N.{1,3}o"' C:/Users/AMP/erp-pausa-2026-10-03/planos/B-TRC-02-respostas-do-dono.md; git show 38504427a7b962545e559bd4d312b520b458ac42:prisma/migrations/20260879000000_vehicle_telemetry_events/migration.sql | grep -c -i -E 'fix_key|position_sample'`
```
3824:D-TRC02-Q1-NAO` (decisão do dono, 2026-10-19
3824:"TRC-02 Q1 = Não"
1
9:## Revisão da Q1 pelo dono
11:"TRC-02 Q1 = Não"
0
```

O critério C-10 do plano v2 guarda o evento de viatura sem despacho, e a decisão do dono `D-TRC02-C10-EVENTO-SEM-DESPACHO-GUARDA` escolhe a opção A: guardar o evento para a viatura sem pessoa; guardar não é exibir. O corpo da cadeira C já exige E8 com 204 e uma linha e veta recusar ou quarentenar o evento. A pendência de LGPD continua sendo sobre a exibição futura no B-TRC-04, medido por: `cd C:/Users/AMP/w-trc02 && git show 38504427a7b962545e559bd4d312b520b458ac42:docs/revisoes/TRACCAR/B-TRC-02-plano.md | tr -d '\r' | grep -n -i -E '^\| C-10 \|' | cut -c1-140; git show 38504427a7b962545e559bd4d312b520b458ac42:agent-orchestration/controle/decisoes.md | tr -d '\r' | grep -n -i -E 'D-TRC02-C10-EVENTO-SEM-DESPACHO-GUARDA|A decisão.*opção A.*guardar|O código já se comporta assim'; git show 38504427a7b962545e559bd4d312b520b458ac42:.claude/agents/especialistas/jurado-trc02-c-contrato-evento-unidades.md | tr -d '\r' | grep -n -i -E 'E8\. Viatura vinculada|Evento de viatura sem despacho recusado'; git show 38504427a7b962545e559bd4d312b520b458ac42:agent-orchestration/controle/pendencias.md | tr -d '\r' | grep -n -i -o -E '^## P-TRC02-LGPD-TELEMETRIA-SEM-DESPACHO|bloqueia:\*\* o início do .B-TRC-04'`
```
696:| C-10 | Evento não exige operador: viatura vinculada sem despacho → 204 e linha (guardar ≠ exibir; `P-TRC02-LGPD-TELEMETRIA-SEM-DE
3871:- **`D-TRC02-C10-EVENTO-SEM-DESPACHO-GUARDA` (decisão do dono, 2026-10-21).** Palavras do dono: ***"1=a"***, em resposta à pergunta do orquestrador sobre o C-10, feita junto com o NÃO da Q1, como manda o §Q1.6 do plano.
3873:  - **A decisão:** opção A, **guardar**.
3874:  - **Efeito:** o evento fica gravado para a viatura, sem pessoa. Nenhuma tela o exibe; exibir fica para o `B-TRC-04`, sob `P-TRC02-LGPD-TELEMETRIA-SEM-DESPACHO`. O código já se comporta assim (C-10/E8 do plano v2), e nada muda.
497:- Evento de viatura sem despacho recusado ou levado à quarentena: `bloqueia`, `não grave` (C-10 é objetivo do bloco).
11507:## P-TRC02-LGPD-TELEMETRIA-SEM-DESPACHO
11512:bloqueia:** o início do `B-TRC-04
```

A pré-revisão Gemini Flash (`prerev-trc02-flash`, 2º revisor; subsídio, nunca insumo de voto) mediu um head ANTERIOR às emendas v2.3 e v2.4 (zero menções a elas ou ao drill) e escreveu "Nada achado" nas suas seções, medido por: `grep -c -i -E 'v2\.3|v2\.4|migration-drill' C:/Users/AMP/erp-pausa-2026-10-03/revisoes/B-TRC-02-prerevisao-flash.md; grep -c -i 'Nada achado' C:/Users/AMP/erp-pausa-2026-10-03/revisoes/B-TRC-02-prerevisao-flash.md`
```
0
12
```

A árvore do objeto `C:/Users/AMP/w-trc02` está no head, sem nenhum caminho rastreado modificado e, como não rastreado, só o diretório desta junta (onde estes mandatos nasceram), medido por: `git -C C:/Users/AMP/w-trc02 rev-parse HEAD; git -C C:/Users/AMP/w-trc02 status --short -uno | wc -l; git -C C:/Users/AMP/w-trc02 status --short | grep -v -i -E '^\?\? agent-orchestration/omega/juntas/votos/B-TRC-02/$' | wc -l`
```
38504427a7b962545e559bd4d312b520b458ac42
0
0
```

No instante da redação, a memória de commit livre (GB), o número de grupos de trabalho Docker alheios vivos (excluídos os `erp-*`, que são a base viva do dono e estão de pé) e o disco livre eram os abaixo, medido por: `powershell.exe -NoProfile -Command '$o=Get-CimInstance Win32_PerfFormattedData_PerfOS_Memory; [math]::Round(($o.CommitLimit-$o.CommittedBytes)/1GB,2)'; docker ps --format '{{.Names}}' | grep -v -i -E '^erp-' | sed -E 's#-(pg|redis|run|net)$##' | sort -u | wc -l; docker ps --format '{{.Names}}' | grep -c -i -E '^erp-'; df -h /c | tail -1 | awk '{print $4}'`
```
17,76
0
2
15G
```

O orçamento de memória da P8 (pelo menos 4 GB de commit livre para lançar agente, no máximo 3 subagentes Claude ao mesmo tempo, Docker com teto de 2 trabalhos) e a regra (0) do §C7 item 9 (todo voto declara `arquivos_medidos`) estão no contrato do objeto, medido por: `git -C C:/Users/AMP/w-trc02 show 38504427a7b962545e559bd4d312b520b458ac42:CLAUDE.md | tr -d '\r' | grep -n -i -o -E 'memória de commit livre ≥ 4 GB|no máximo \*\*3$|subagentes Claude\*\* ao mesmo tempo|Docker segue com teto de 2 trabalhos|\(0\) Todo voto de cadeira declara .arquivos_medidos.'`
```
719:memória de commit livre ≥ 4 GB
719:no máximo **3
720:subagentes Claude** ao mesmo tempo
720:Docker segue com teto de 2 trabalhos
817:(0) Todo voto de cadeira declara `arquivos_medidos`
```

A ferramenta de banco descartável nomeia contêineres e rede por um ID fixo `tl<epoch><pid>`, não aceita prefixo e roda `npm ci` e `prisma migrate deploy` dentro do contêiner sobre uma cópia do worktree sem `node_modules`, medido por: `grep -n -i -o -E 'ID="tl[^"]*"|--exclude=./node_modules|npm ci --no-audit|npx prisma migrate deploy' C:/Users/AMP/erp-pausa-2026-10-03/ferramentas/teste-linux.sh`
```
7:ID="tl$(date +%s)$$"
17:--exclude=./node_modules
17:npm ci --no-audit
17:npx prisma migrate deploy
```

O modelo de mandato do §C7.7 do contrato (P1, P2, P4, P3, P7), verbatim no objeto, medido por: `git -C C:/Users/AMP/w-trc02 show 38504427a7b962545e559bd4d312b520b458ac42:CLAUDE.md | tr -d '\r' | sed -n '729,736p'`
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

## HIPOTESE

Você é `inspetor-trc02-opus`, identidade nova, executor Claude Code (subagente), modelo Claude Opus, nível menor declarado (o `model: opus` do frontmatter de `inspetor-de-terreno-da-junta`, medido acima; §C7.6); Opus esgotado: PARE e registre onde parou (§C7.6-bis). Declare executor efetivo, modelo, nível, objeto e `mandato_md5` deste arquivo (`tr -d '\r' < <mandato> | md5sum`) na primeira linha de `insp-trc02-evidencia.md`. Você não vota nem julga mérito: julga se o tabuleiro está limpo (§C7.1-bis), fail-closed. O plano v2, as emendas v2.1 a v2.4, as respostas do dono, o relatório do dev, o parecer do DBA (fora do objeto), o parecer do porteiro do 426 e a pré-revisão Flash são **A RE-VERIFICAR**, nunca prova herdada. Régua da junta que você libera: bloco de ingestão do Traccar = junta de SEGURANÇA, inspetor + 3 cadeiras com identidade nova, unanimidade de 3 com veto, mais o parecer obrigatório do DBA, que não é 4ª cadeira (§C7 item 8(1)(4); plano v2 §10); ciclo 1, em que achado `bloqueia` dentro do bloco reprova (§C7 item 8(2)); nenhum voto é carregado (não há ciclo anterior), e todo voto declara `arquivos_medidos` (§C7 item 9 (0)), derruba com: `head -1 C:/Users/AMP/w-trc02/agent-orchestration/omega/juntas/votos/B-TRC-02/insp-trc02-evidencia.md | grep -i -E 'executor|Opus|mandato_md5|objeto'`

Item 1 de 3 (objeto, CI, mandatos, corpos, carimbos, S0): resolva o objeto por `git ls-remote origin refs/heads/feat/traccar-b-trc-02` e por `gh pr view 454 --json headRefOid`; confira os 14 check-runs concluídos e verdes no SHA, inclusive o `backend` (item (vii) dos corpos; ausência, `queued` ou `cancelled` bloqueia o start); rode o pré-voo dos quatro mandatos deste diretório até `PRE-VOO OK` com as ferramentas da pasta `C:/Users/AMP/erp-pausa-2026-10-03/redator-trc02-v2/` (diferença contra o ramo das ferramentas medida acima); confira no objeto, EOL-neutro e descontado o bloco de adaptação Codex, os três corpos nos dois espelhos, e que o corpo que cada cadeira carregar é o blob do objeto; reexecute o S0 (`sync-agent-agents.mjs --check`) num worktree descartável seu no objeto; confira o item (ii) do plano (cada carimbo de migração uma vez na árvore, os dois do bloco renumerados e maiores que todo carimbo do merge-base) e o item (iii) (o teste H8 existe e está verde no check-run; você confere o teste, não refaz a leitura das fixtures). Head que andou depois da redação bloqueia até novo pré-voo, derruba com: `grep -i -E 'Item 1|14/14|check-runs|backend|PRE-VOO|corpos|espelho|S0|carimbo|H8|LIBERADO|BLOQUEADO' C:/Users/AMP/w-trc02/agent-orchestration/omega/juntas/votos/B-TRC-02/insp-trc02-parecer.md`

Item 2 de 3 (identidades, papéis, briefing e divergências): regenere por comando seu a lista de inelegíveis (a colada acima é piso) e confira por nome que nenhuma das quatro identidades desta junta (`inspetor-trc02-opus`, `jurado-trc02-a-opus`, `jurado-trc02-b-opus`, `jurado-trc02-c-opus`) coincide com ela, com a família do B-TRC-01, com `planejador-trc02-fable`, `planejador-trc02-v2-fable`, `planejador-trc02-emenda-fable`, `planejador-trc02-escopo-fable`, `planejador-trc02-v23-fable`, `planejador-trc02-v24-fable`, `critico-trc02-opus`, `critico-trc02-flash`, `critico-trc02-r2-opus`, `prerev-trc02-flash`, `dev-trc02-opus`, `dba-trc02-opus`, `registrador-trc02-opus`, `fabrica-trc02-opus` e `fabrica-trc02b-opus`, nem entre si; o redator destes mandatos é `redator-trc02-opus` e também é inelegível. Declare a MONOCULTURA: as quatro identidades rodam no mesmo modelo do dev e do DBA (Claude Opus), por escolha do dono em 21/10 (~03:35 BRT), que respondeu à pergunta do orquestrador sobre quem ocupa as cadeiras com "3 em Claude Opus (Recomendado)" — o Codex volta às 05:13 BRT e a API do Gemini tem crédito; a escolha foi pela confiabilidade num gate de segurança (fato do orquestrador, que você registra como tal); o 2º revisor Gemini Flash existe só como subsídio e mediu um head anterior às emendas v2.3 e v2.4 (medido acima). Confira a separação de papéis do §C7.4-bis por nome: quem achou (os críticos r1 e r2, o DBA na rodada 1, a CI no ratchet) ≠ quem planejou (os seis planejadores) ≠ quem desenvolveu (`dev-trc02-opus`). Confira os itens do plano v2 §10 "Inspetor": (i) o parecer do DBA existe, é FAVORÁVEL na rodada 2 e é anterior a qualquer voto (medido acima: fora do objeto, sobre `<objeto>~5`, com `prisma/` sem mudança desde então); (iv) o parecer do porteiro do 426 está no briefing; (vi) a variante do relatório do dev (Q1 = NÃO, Q2 = SIM) bate com a `D-TRC02-Q1-NAO` do `decisoes.md` e com a seção "Revisão da Q1 pelo dono" da cópia `docs/revisoes/TRACCAR/B-TRC-02-respostas-do-dono.md` no objeto (medido acima). Confira em cada mandato de cadeira a PRESENÇA das divergências medidas e registradas: corpos anteriores às emendas v2.3 e v2.4; o DBA fora do objeto; (a) o G9 que mudou de casa, o total 463, os motivos do `NOVAS` e o C5; (b) a base do laço (merge-base, não o merge do 01), o PERMITIDO das emendas v2.3 e v2.4 e o registro agora presente de `D-TRC02-MIGRACAO-TRANSACAO-EXPLICITA` e `P-MIGRACOES-ANTERIORES-SEM-TRANSACAO-EXPLICITA`; (c) a M-E09 re-especificada em `<objeto>~1`; e, nas três, as decisões do dono de 21/10 `D-TRC02-C10-EVENTO-SEM-DESPACHO-GUARDA` (opção A, guardar) e `D-MIGRACAO-COM-TRANSACAO-EXPLICITA`. Coincidência de identidade, papel acumulado ou briefing incompleto bloqueia, derruba com: `grep -i -E 'Item 2|ineleg|jurado-trc02-a-opus|jurado-trc02-b-opus|jurado-trc02-c-opus|monocultura|4-bis|DBA|porteiro|Q1|briefing|divergência|C-10|MIGRACAO' C:/Users/AMP/w-trc02/agent-orchestration/omega/juntas/votos/B-TRC-02/insp-trc02-parecer.md`

Item 3 de 3 (terreno): confira a árvore `C:/Users/AMP/w-trc02` no objeto e sem mutação viva, admitindo como não rastreado só o diretório desta junta (medido acima); exija worktree próprio por cadeira (`C:/Users/AMP/w-jtrc02-a-`, `C:/Users/AMP/w-jtrc02-b-`, `C:/Users/AMP/w-jtrc02-c-`), `npm ci` próprio e zero junction de `node_modules` (§C7.1-ter(c)); Postgres e Redis DESCARTÁVEIS por cadeira, com prefixo `jtrc02-<a|b|c>-` (contêiner, rede) e `jtrc02_<a|b|c>_` (base), publicados só em `127.0.0.1` numa porta alta testada antes, ou a ferramenta `C:/Users/AMP/erp-pausa-2026-10-03/ferramentas/teste-linux.sh` copiada com o ID trocado; sondas e scripts de cada cadeira em `C:/Users/AMP/erp-pausa-2026-10-03/jtrc02-<a|b|c>/`, fora do worktree. Antes de cada lançamento e de cada subida: memória de commit livre de pelo menos 4 GB (P8, medido acima), no máximo 2 trabalhos Docker na máquina contando o da cadeira (excluídos os `erp-*`), no máximo 3 subagentes Claude vivos ao mesmo tempo e disco de pelo menos 10 GB; base viva e portas 5432, 6379, 3000, 5173, 5050 e 8899 são proibidas, e os servidores públicos de demonstração do Traccar também. Declare baseline honesto do terreno, plano de perda de jurado (P3, sucessor de identidade nova; Opus esgotado = PARA, não há degrau abaixo, §C7.6-bis), no máximo dois jurados em paralelo (P5) e a ordem de disparo que respeita o teto de Docker com as três cadeiras subindo banco (a (b) também sobe Postgres, para b-S6 e M-S6/M-S7), derruba com: `grep -i -E 'Item 3|w-jtrc02-|jtrc02|junction|erp-|commit livre|4 GB|127.0.0.1|5432|6379|3000|5173|5050|8899|P3|P5|P8|baseline|ordem' C:/Users/AMP/w-trc02/agent-orchestration/omega/juntas/votos/B-TRC-02/insp-trc02-parecer.md`

Protocolo P1/P2/P3/P4/P7 do §C7.7, verbatim no bloco colado acima, com `<cadeira>` = `insp-trc02` e o parecer no lugar do voto: evidência em `insp-trc02-evidencia.md` após CADA item; `insp-trc02-parecer.md` nasce esqueleto com os três itens EM APURAÇÃO e fecha (LIBERADO, LIBERADO COM RESSALVA ou BLOQUEADO) antes da mensagem final de 1 linha; sucessor re-executa os comandos registrados; três itens exatos; PAUSA grava estado e para; queda em `00-quedas.md` deste diretório (P6, pelo orquestrador). Únicos outputs: `insp-trc02-evidencia.md` e `insp-trc02-parecer.md` em `C:/Users/AMP/w-trc02/agent-orchestration/omega/juntas/votos/B-TRC-02/`; nunca commit, derruba com: `test -f C:/Users/AMP/w-trc02/agent-orchestration/omega/juntas/votos/B-TRC-02/insp-trc02-parecer.md`

## MEDIDO

Pré-voo deste mandato com as ferramentas copiadas do ramo `origin/chore/mandato-refs-e-preflight` para a pasta própria do redator `C:/Users/AMP/erp-pausa-2026-10-03/redator-trc02-v2/` (única adaptação: a linha 211 do `mandato-preflight.sh`, `RAIZ=C:/Users/AMP/w-trc02`), executado com o cwd no worktree do objeto; o redator é `redator-trc02-opus` (Claude Opus, nível menor declarado); o `sed` troca, nos AVISOs, o número de migração pelo marcador `<corrida>` e o caminho dela pelo marcador `<migracao>` (o número solto fora do caminho seria cobrado como SHA), medido por: `cd C:/Users/AMP/w-trc02 && MANDATO_REFS=C:/Users/AMP/erp-pausa-2026-10-03/redator-trc02-v2/mandato-refs.sh bash C:/Users/AMP/erp-pausa-2026-10-03/redator-trc02-v2/mandato-preflight.sh C:/Users/AMP/w-trc02/agent-orchestration/omega/juntas/votos/B-TRC-02/00-mandatos/inspetor-trc02.md 454 2>&1 | sed -E -e "s#prisma/migrations/2026[0-9]+_[a-z_]+/(migration[.]sql)?#<migracao>#g" -e "s#'2026[0-9]+'#'<corrida>'#g"; echo ec=${PIPESTATUS[0]}`
```
COLAGEM    l.6-20: refs do PR #454 confere com a saida atual
COLAGEM    l.35-54: refs do PR #426 confere com a saida atual
AVISO      corrida hex em caminho versionado nao cobrada pela checagem 4: '<corrida>' em <migracao> — l.206

PRE-VOO OK — C:/Users/AMP/w-trc02/agent-orchestration/omega/juntas/votos/B-TRC-02/00-mandatos/inspetor-trc02.md
ec=0
```
