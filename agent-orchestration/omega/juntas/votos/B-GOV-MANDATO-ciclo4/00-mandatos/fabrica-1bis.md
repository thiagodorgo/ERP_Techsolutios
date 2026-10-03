# Mandato — agente-fabrica (passo 1-bis da errata 15.15) — ciclo 4 do B-GOV-MANDATO (PR 393)

## MEDIDO

Forma do mandato: campos declarados, decisao do dono D-MANDATO-FORMA registrada em origin/main medido por: `MSYS_NO_PATHCONV=1 git -C C:/Users/AMP/w-mandato show origin/main:agent-orchestration/controle/decisoes.md | grep -ic '^## D-MANDATO-FORMA'`
```
1
```

Estado do PR 393 no instante do lancamento, pela ferramenta do bloco medido por: `bash scripts/mandato-refs.sh 393`
```
# refs do PR #393 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato
# gerado em: 2026-10-01T21:20Z · repo: thiagodorgo/ERP_Techsolutios

ramo:            chore/mandato-refs-e-preflight
base:            origin/main
estado:          OPEN | rascunho=true | MERGEABLE
head do PR:      26730e2b59bb9c9ccd7d34ad730f95a2523cfbbd
merge-base:      513937b0555e2a6175e7e89d8ae9e44dbc995f8a
merge commit:    <ainda nao mergeado>
check-runs:      total=14 nao-verdes=0 pendentes=0
approved_head:   NAO DETERMINAVEL (a ata casa o PR mas NAO declara aprovacao: nenhuma linha '- **approved_head:**')
                 objeto declarado 7462b75bfb7768556a2da2ee13f9ac92e9198872 (agent-orchestration/omega/juntas/J-B-GOV-MANDATO.md:10 @head-do-PR) — aprovacao nao legivel por maquina
                 objeto declarado 4c8819effd0b9f7a1ef8040eaa1707ca8342fdad (agent-orchestration/omega/juntas/J-B-GOV-MANDATO.md:96 @head-do-PR) — aprovacao nao legivel por maquina
                 objeto declarado 28b4defdc067387f384e06614e033e0976e9912b (agent-orchestration/omega/juntas/J-B-GOV-MANDATO.md:215 @head-do-PR) — aprovacao nao legivel por maquina
                 agent-orchestration/omega/juntas/J-B-GOV-PAUSA.md (mencao no corpo) @head-do-PR
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

O parecer da auditoria: presenca da secao 8 (conserto da maquina) e da secao 9 (atestacao), contadas (0 = ausente); os registros R existentes medido por: `grep -ic '^## 8\. Conserto da máquina' C:/Users/AMP/w-mandato/agent-orchestration/omega/reprovacoes/R-B-GOV-MANDATO-ciclo3-auditoria.md; grep -ic '^## 9\.' C:/Users/AMP/w-mandato/agent-orchestration/omega/reprovacoes/R-B-GOV-MANDATO-ciclo3-auditoria.md; ls C:/Users/AMP/w-mandato/agent-orchestration/omega/reprovacoes/ | grep -i MANDATO`
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
jurado-mandato-c1-prevoo-fail-closed.md jurado-mandato-c1c-invariancia-de-forma.md jurado-mandato-c1d-invariancia-e-morte-interna.md jurado-mandato-c2-pergunta-feita.md jurado-mandato-c2c-cobertura-por-mutacao.md jurado-mandato-c2d-cobertura-e-dois-lados.md jurado-mandato-c3-escopo-kpi-registro.md jurado-mandato-c3b-fronteira-numero-registro.md jurado-mandato-c3c-fronteira-numero-registro.md jurado-mandato-c3d-escopo-kpi-registro-mandato.md
```

## HIPOTESE

O papel e a agente-fabrica, que emenda tres corpos do ciclo 4 ja versionados, nos dois espelhos, conforme o passo 1-bis da errata
  15.15 do plano docs/revisoes/SAN3/B-GOV-MANDATO-ciclo3-plano.md (letras b e d): jurado-mandato-c3d-escopo-kpi-registro-mandato,
  jurado-mandato-c2d-cobertura-e-dois-lados e jurado-mandato-c1d-invariancia-e-morte-interna, em .claude/agents/especialistas/ e no
  espelho .agents/agents/especialistas/ no formato do gerador scripts/sync-agent-agents.mjs; ela declara na mensagem final que leu
  este mandato pelo caminho derruba com: `grep -ic 'replay' .claude/agents/especialistas/jurado-mandato-c3d-escopo-kpi-registro-mandato.md`

Na C3d, o item 4d passa a ser o REPLAY no commit que versionou cada mandato, como a errata 15.15 letra b o escreve: os comandos, o stub
  de replay verbatim (o arquivo C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/pl4f/replay-refs.sh),
  as precondicoes PRE1, PRE2 e P-b, o esperado, o achado do mandato da errata 1 como fato a classificar e o vermelho-controle; a
  re-execucao viva no head vira o paragrafo de registro; e as outras seis mencoes que a errata lista (description, as linhas do corpo e
  o modelo de voto) dizem o mesmo derruba com: `grep -ic 'PRE1' .claude/agents/especialistas/jurado-mandato-c3d-escopo-kpi-registro-mandato.md`

Na C2d, as quatro formas viaveis de 298, 305, 364 e 405 e o esperado da errata 15.15 letra d (pelo menos um caso vermelho nomeado por
  forma; forma que sobrevive com comportamento diferente e NAO-COBERTO e bloqueia); na C1d, o numero herdado de casos novos passa ao da
  errata (41 entradas, 45 com o T4c-3), para nao deixar premissa velha no corpo derruba com: `grep -ic 'V298' .claude/agents/especialistas/jurado-mandato-c2d-cobertura-e-dois-lados.md`

A emenda e transcricao da errata, sem legislacao nova e sem diluir o resto do corpo; toda frase nova se marca como emenda da errata
  15.15 no proprio corpo; a fabrica nao versiona, nao roda o sync e nao toca nenhum outro arquivo alem dos seis; a mensagem final traz
  os seis caminhos, as linhas de cada corpo antes e depois e toda divergencia entre a errata e este mandato, em que vale a errata, gravada
  tambem em C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/FABRICA-C4-1BIS.md derruba com: `git status --porcelain | grep -ivE 'especialistas' | wc -l`

## MEDIDO

Pre-voo deste mandato no head do lancamento medido por: `cd C:/Users/AMP/w-mandato && bash scripts/mandato-preflight.sh agent-orchestration/omega/juntas/votos/B-GOV-MANDATO-ciclo4/00-mandatos/fabrica-1bis.md 393; echo ec=$?`
```
COLAGEM    l.11-30: refs do PR #393 confere com a saida atual

PRE-VOO OK — C:/Users/AMP/w-mandato/agent-orchestration/omega/juntas/votos/B-GOV-MANDATO-ciclo4/00-mandatos/fabrica-1bis.md
ec=0
head=26730e2b59bb9c9ccd7d34ad730f95a2523cfbbd
utc=2026-10-01T21:20:17Z
```
