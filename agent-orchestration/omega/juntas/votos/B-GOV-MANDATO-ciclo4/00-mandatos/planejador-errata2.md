# Mandato — planejador-ciclo4-b-gov-mandato (errata 2) — ciclo 4 do B-GOV-MANDATO (PR 393)

## MEDIDO

Forma do mandato: campos declarados, decisao do dono D-MANDATO-FORMA registrada em origin/main medido por: `MSYS_NO_PATHCONV=1 git -C C:/Users/AMP/w-mandato show origin/main:agent-orchestration/controle/decisoes.md | grep -ic '^## D-MANDATO-FORMA'`
```
1
```

Estado do PR 393 no instante do lancamento, pela ferramenta do bloco medido por: `bash scripts/mandato-refs.sh 393`
```
# refs do PR #393 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato
# gerado em: 2026-10-01T17:13Z · repo: thiagodorgo/ERP_Techsolutios

ramo:            chore/mandato-refs-e-preflight
base:            origin/main
estado:          OPEN | rascunho=true | MERGEABLE
head do PR:      738f0736e1bde573cc96f96174d5bc3d99dd7fa3
merge-base:      5b6e103638f398d6074eecc5daebdf2d3bcd2252
merge commit:    <ainda nao mergeado>
check-runs:      total=14 nao-verdes=4 pendentes=0
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

O papel e planejador-mestre, a MESMA identidade planejador-ciclo4-b-gov-mandato da secao 15 e da errata 15.14 (Fable por contrato;
  esgotado o Fable, Opus com a substituicao declarada; esgotado o Opus, para), relancada para uma segunda errata; declara na 1a linha
  da errata o papel, a identidade, o modelo, o mandato_md5 deste arquivo e o md5 EOL-neutro do corpo planejador-mestre de origin/main derruba com: `grep -ic 'mandato_md5' C:/Users/AMP/w-mandato/docs/revisoes/SAN3/B-GOV-MANDATO-ciclo3-plano.md`

Item 1 — criterio que nao pode passar: a secao 15.9 manda o inspetor e a cadeira de escopo re-executarem o pre-voo de cada mandato no
  head do objeto, com REJEITADO igual a BLOQUEADO; o orquestrador mediu em 01/10, no head do ramo, que os quatro mandatos ja
  versionados do ciclo 4 reprovam (ec 1) porque a colagem do refs e os SHAs de proveniencia envelhecem a cada commit — as saidas estao
  em C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/reexec/;
  a errata re-mede isso e decide o criterio que preserva a PROPRIEDADE (o mandato existia, passou no instrumento antes de o agente nascer
  e nao foi editado depois) sem reprovar por construcao, com a mutacao que o deixaria vermelho e o que muda nos corpos da C3 do ciclo 4
  e no mandato do inspetor derruba com: `grep -ic 'por construcao\|por construção' C:/Users/AMP/w-mandato/docs/revisoes/SAN3/B-GOV-MANDATO-ciclo3-plano.md`

Item 2 — premissas do plano que o dev de testes falsificou por medicao (relatorio em
  C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/DEVT4C.md, secao final):
  os casos Y02 a Y05 e F-25 nao ficam vermelhos no vermelho-controle do refs (o mandato-refs.sh nao muda no ciclo 4; o vermelho deles
  e a mutacao); a secao 15.9 diz que 298, 305, 364 e 405 ficam cobertos pelos casos novos, e medido contra o head nenhuma versao viavel
  derruba caso alem dos 23; e a divisao dos casos fechou em 36 no pre-voo e 5 no refs (41) depois da errata 15.14; a errata re-mede cada
  um e corrige as linhas do plano que as cadeiras usariam como criterio derruba com: `grep -ic 'Y02' C:/Users/AMP/w-mandato/docs/revisoes/SAN3/B-GOV-MANDATO-ciclo3-plano.md`

A errata entra so por adicao ao fim da secao 15 do plano docs/revisoes/SAN3/B-GOV-MANDATO-ciclo3-plano.md, numa subsecao nova depois da
  15.14, sem tocar outra linha nem outro arquivo, e diz para cada item quem executa e o que a cadeira confere; o planejador nao conserta,
  nao escreve caso nem corpo e nao versiona derruba com: `git -C C:/Users/AMP/w-mandato status --porcelain | grep -iv 'B-GOV-MANDATO-ciclo3-plano.md' | wc -l`

O terreno: mede num worktree proprio detached C:/Users/AMP/w-pl4f (caminho curto; conferir que existe), removido pelo nome ao fim; o dev
  de scripts trabalha em paralelo em outro worktree e o planejador nao toca scripts nem tests; nunca tail -f nem MSYS_NO_PATHCONV
  exportada; timeout no que executa artefato; base viva erp-postgres 5432 e erp-redis 6379 nunca alvo; se receber PAUSA, grava a secao
  PAUSA no fim da errata e para sozinho derruba com: `git -C C:/Users/AMP/Documents/GitHub/ERP_Techsolutios worktree list | grep -ic 'w-pl4f'`

## MEDIDO

Pre-voo deste mandato no head do lancamento medido por: `cd C:/Users/AMP/w-mandato && bash scripts/mandato-preflight.sh agent-orchestration/omega/juntas/votos/B-GOV-MANDATO-ciclo4/00-mandatos/planejador-errata2.md 393; echo ec=$?`
```
COLAGEM    l.11-29: refs do PR #393 confere com a saida atual

PRE-VOO OK — C:/Users/AMP/w-mandato/agent-orchestration/omega/juntas/votos/B-GOV-MANDATO-ciclo4/00-mandatos/planejador-errata2.md
ec=0
head=738f0736e1bde573cc96f96174d5bc3d99dd7fa3
utc=2026-10-01T17:13:23Z
```
