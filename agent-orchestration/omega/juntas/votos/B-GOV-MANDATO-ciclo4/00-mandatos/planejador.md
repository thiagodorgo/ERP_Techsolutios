# Mandato do planejador do ciclo 4 do B-GOV-MANDATO (PR 393)

## MEDIDO

Forma do mandato: campos declarados, decisao do dono D-MANDATO-FORMA registrada em origin/main medido por: `MSYS_NO_PATHCONV=1 git -C C:/Users/AMP/w-mandato show origin/main:agent-orchestration/controle/decisoes.md | grep -ic '^## D-MANDATO-FORMA'`
```
1
```

Estado do PR 393 no instante do lancamento, pela ferramenta do bloco medido por: `bash scripts/mandato-refs.sh 393`
```
# refs do PR #393 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato
# gerado em: 2026-10-01T03:03Z · repo: thiagodorgo/ERP_Techsolutios

ramo:            chore/mandato-refs-e-preflight
base:            origin/main
estado:          OPEN | rascunho=true | MERGEABLE
head do PR:      a3e52e370bb01e939ad467afaf6f5f9195a8c08b
merge-base:      5b6e103638f398d6074eecc5daebdf2d3bcd2252
merge commit:    <ainda nao mergeado>
check-runs:      total=14 nao-verdes=0 pendentes=0
approved_head:   NAO DETERMINAVEL (a ata casa o PR mas NAO declara aprovacao: nenhuma linha '- **approved_head:**')
                 objeto declarado 7462b75bfb7768556a2da2ee13f9ac92e9198872 (agent-orchestration/omega/juntas/J-B-GOV-MANDATO.md:10 @head-do-PR) — aprovacao nao legivel por maquina
                 objeto declarado 4c8819effd0b9f7a1ef8040eaa1707ca8342fdad (agent-orchestration/omega/juntas/J-B-GOV-MANDATO.md:96 @head-do-PR) — aprovacao nao legivel por maquina
                 objeto declarado 28b4defdc067387f384e06614e033e0976e9912b (agent-orchestration/omega/juntas/J-B-GOV-MANDATO.md:215 @head-do-PR) — aprovacao nao legivel por maquina
                 agent-orchestration/omega/juntas/J-B-GOV-SEM-TETO.md (mencao no corpo) @head-do-PR
                 NAO invente: sem a linha '- **approved_head:**' numa ata que se declare
                 sobre este PR, a ferramenta NAO afirma qual head a junta aprovou.
```

O merge-base do head com origin/main e igual a origin/main (a main pos-396 esta integrada) medido por: `cd C:/Users/AMP/w-mandato && [ "$(git merge-base origin/main HEAD)" = "$(git rev-parse origin/main)" ] && echo IGUAL || echo DIFERENTE`
```
IGUAL
```

A junta 3 reprovou 2 x 1; achados por gravidade em cada voto, lidos do JSON de cada evidencia medido por: `for n in 1 2 3; do f=C:/Users/AMP/w-mandato/agent-orchestration/omega/juntas/votos/B-GOV-MANDATO-ciclo3/C$n-evidencia.md; echo "C$n: bloqueia=$(grep -ic '"gravidade": *"bloqueia"' $f) ajuste=$(grep -ic '"gravidade": *"ajuste"' $f) nota=$(grep -ic '"gravidade": *"nota"' $f)"; done`
```
C1: bloqueia=4 ajuste=3 nota=3
C2: bloqueia=2 ajuste=3 nota=1
C3: bloqueia=0 ajuste=3 nota=7
```

Os seis bloqueantes do ciclo 3, por id medido por: `grep -h -ioE '"id": *"C[123]c-0[0-9]"[^}]*"gravidade": *"bloqueia"' C:/Users/AMP/w-mandato/agent-orchestration/omega/juntas/votos/B-GOV-MANDATO-ciclo3/C*-evidencia.md | grep -ioE 'C[123]c-0[0-9]' | sort -u | paste -sd' '`
```
C1c-01 C1c-02 C1c-03 C1c-04 C2c-01 C2c-02
```

O parecer da auditoria tem a secao 8 (conserto da maquina) e nao tem a secao 9 (atestacao); os quatro registros R existem medido por: `grep -ic '^## 8\. Conserto da máquina' C:/Users/AMP/w-mandato/agent-orchestration/omega/reprovacoes/R-B-GOV-MANDATO-ciclo3-auditoria.md; grep -ic '^## 9\.' C:/Users/AMP/w-mandato/agent-orchestration/omega/reprovacoes/R-B-GOV-MANDATO-ciclo3-auditoria.md; ls C:/Users/AMP/w-mandato/agent-orchestration/omega/reprovacoes/ | grep -i MANDATO`
```
1
0
R-B-GOV-MANDATO-1.md
R-B-GOV-MANDATO-2.md
R-B-GOV-MANDATO-3.md
R-B-GOV-MANDATO-ciclo3-auditoria.md
```

As tres pendencias do conserto da maquina estao no ramo medido por: `grep -ioE '^## P-GOV-MAQUINA-393-[A-Z0-9-]+' C:/Users/AMP/w-mandato/agent-orchestration/controle/pendencias.md | paste -sd' '`
```
## P-GOV-MAQUINA-393-D-M1-DOIS-LADOS ## P-GOV-MAQUINA-393-D-M2-MANDATO-ARTEFATO ## P-GOV-MAQUINA-393-D-M3-FALHA-INTERNA
```

Os sete corpos de cadeira dos ciclos 1 a 3, inelegiveis para o ciclo 4 medido por: `ls C:/Users/AMP/w-mandato/.claude/agents/especialistas/ | grep -i jurado-mandato | paste -sd' '`
```
jurado-mandato-c1-prevoo-fail-closed.md jurado-mandato-c1c-invariancia-de-forma.md jurado-mandato-c2-pergunta-feita.md jurado-mandato-c2c-cobertura-por-mutacao.md jurado-mandato-c3-escopo-kpi-registro.md jurado-mandato-c3b-fronteira-numero-registro.md jurado-mandato-c3c-fronteira-numero-registro.md
```

## HIPOTESE

O papel e planejador-mestre, identidade nova planejador-ciclo4-b-gov-mandato, em Fable por contrato, e o corpo aplicado e o de origin/main, cujo md5 EOL-neutro o agente declara na 1a linha junto com o mandato_md5 deste arquivo derruba com: `MSYS_NO_PATHCONV=1 git -C C:/Users/AMP/w-mandato show origin/main:.claude/agents/planejador-mestre.md | tr -d '\r' | md5sum`

Os cinco artefatos do bloco (scripts/mandato-refs.sh, scripts/mandato-preflight.sh, scripts/mandato-mutantes.sh, tests/mandato-refs.test.ts, tests/mandato-preflight.test.ts) tem no head os mesmos blobs das matrizes publicadas em docs/revisoes/SAN3/B-GOV-MANDATO-ciclo3-mutantes.md derruba com: `for f in scripts/mandato-refs.sh scripts/mandato-preflight.sh scripts/mandato-mutantes.sh tests/mandato-refs.test.ts tests/mandato-preflight.test.ts; do echo "$(git -C C:/Users/AMP/w-mandato rev-parse HEAD:$f | cut -c1-8) $f"; done`

O planejador escreve a secao 15 do plano docs/revisoes/SAN3/B-GOV-MANDATO-ciclo3-plano.md, so por adicao e sem tocar outro arquivo, com o §0 medido por ele mesmo no head e, nela: a resposta a cada um dos seis bloqueantes com o conserto, o criterio de aceite e a mutacao que o deixaria vermelho; a amostra DOS DOIS LADOS da matriz (semente, comando, saida e a identidade de quem mediu, diferente do runner e do dev); a tabela da secao 1.1 com a classe A15 e a coluna papel-por-artefato sem celula vazia para matriz e KPI, como manda a secao 8.6 condicao 3 do parecer da auditoria derruba com: `grep -ic '^## §15' C:/Users/AMP/w-mandato/docs/revisoes/SAN3/B-GOV-MANDATO-ciclo3-plano.md; git -C C:/Users/AMP/w-mandato status --porcelain | grep -iv 'B-GOV-MANDATO-ciclo3-plano.md' | wc -l`

O conserto do bloco no ciclo 4 cobre, com teste cujo mutante viavel fica vermelho: na ferramenta de mutacao, validar o programa awk de cada mutante antes de medir a cor do guard, conferir os equivalentes por id e sair com ec diferente de zero quando um controle falha (fronteiras 25, 26 e 28); no pre-voo, as quatro formas de C1c-01 a C1c-04 e a morte interna da secao 1.5 do parecer (REC com status) derruba com: `cd C:/Users/AMP/w-mandato && timeout 1800 bash scripts/mandato-mutantes.sh preflight --only 298,305 --jobs 2 2>&1 | grep -iE '^(298|305) '`

Os devs do ciclo 4 sao identidades novas, um para scripts e um para tests, e nenhum dos sete corpos de cadeira, o inspetor da junta 3, o planejador do ciclo 3, o planejador do conserto da maquina nem o auditor ocupa papel de planejador, dev ou cadeira no ciclo 4 derruba com: `awk '/^## §15/,0' C:/Users/AMP/w-mandato/docs/revisoes/SAN3/B-GOV-MANDATO-ciclo3-plano.md | grep -icE 'dev-t-[1-6]|dev-s-2|planejador-conserto|auditor-maquina'`

Toda premissa herdada do plano do ciclo 3 e dos votos entra na secao 15 marcada a re-verificar, e cada numero dela traz o comando que o produziu derruba com: `awk '/^## §15/,0' C:/Users/AMP/w-mandato/docs/revisoes/SAN3/B-GOV-MANDATO-ciclo3-plano.md | grep -ic 'medido por'`

O planejador nao conserta codigo, nao escreve corpo de agente, nao versiona e nao usa `tail -f` nem exporta MSYS_NO_PATHCONV no shell que executa artefato; executa em worktree proprio C:/Users/AMP/w-pl4 (caminho curto), removido pelo nome ao fim, com a base viva erp-postgres 5432 e erp-redis 6379 nunca como alvo derruba com: `git -C C:/Users/AMP/Documents/GitHub/ERP_Techsolutios worktree list | grep -ic 'w-pl4'`

## MEDIDO

Pre-voo deste mandato no head do lancamento medido por: `cd C:/Users/AMP/w-mandato && bash scripts/mandato-preflight.sh agent-orchestration/omega/juntas/votos/B-GOV-MANDATO-ciclo4/00-mandatos/planejador.md 393; echo ec=$?`
```
COLAGEM    l.11-29: refs do PR #393 confere com a saida atual

PRE-VOO OK — C:/Users/AMP/w-mandato/agent-orchestration/omega/juntas/votos/B-GOV-MANDATO-ciclo4/00-mandatos/planejador.md
ec=0
head=a3e52e370bb01e939ad467afaf6f5f9195a8c08b
utc=2026-10-01T03:03:12Z
```
