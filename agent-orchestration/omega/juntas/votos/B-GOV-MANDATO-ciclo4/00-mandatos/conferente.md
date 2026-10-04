# Mandato — conferente-dois-lados-b-gov-mandato-c4 — ciclo 4 do B-GOV-MANDATO (PR 393)

## MEDIDO

Forma do mandato: campos declarados, decisao do dono D-MANDATO-FORMA registrada em origin/main medido por: `MSYS_NO_PATHCONV=1 git -C C:/Users/AMP/w-mandato show origin/main:agent-orchestration/controle/decisoes.md | grep -ic '^## D-MANDATO-FORMA'`
```
1
```

Estado do PR 393 no instante do lancamento, pela ferramenta do bloco medido por: `bash scripts/mandato-refs.sh 393`
```
# refs do PR #393 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato
# gerado em: 2026-10-02T11:10Z · repo: thiagodorgo/ERP_Techsolutios

ramo:            chore/mandato-refs-e-preflight
base:            origin/main
estado:          OPEN | rascunho=true | CONFLICTING
head do PR:      663eeb00eb416827f7330e96cce28c47c5ebb935
merge-base:      5bcdcc58fda793dd6e5ffc12f2d0709bef3f222d
merge commit:    <ainda nao mergeado>
check-runs:      total=7 nao-verdes=0 pendentes=0
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
DIFERENTE
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

O papel e o conferente dos dois lados do ciclo 4 (secao 15.5 do plano), identidade nova
  conferente-dois-lados-b-gov-mandato-c4, que nao e o runner das matrizes (o orquestrador), nao e dev da ferramenta, nao e o
  planejador e nao e cadeira; declara na 1a linha da evidencia e da mensagem final o papel, a identidade, o modelo, o
  mandato_md5 deste arquivo e o md5 do corpo que aplicou, lido do head do ramo em
  .claude/agents/especialistas/conferente-dois-lados-b-gov-mandato-c4.md derruba com: `head -1 C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/CONFERENCIA-393-C4.md | grep -ic 'mandato_md5'`

O objeto da conferencia sao as duas matrizes do ciclo 4 (a rodada completa no head do K4 mais a delta dos pontos 359, 372 e 612 no head do T4c-4, pelo lema da secao 14.18 — os dois heads estao no cabecalho de cada rodada, no proprio documento) publicadas em docs/revisoes/SAN3/B-GOV-MANDATO-ciclo4-mutantes.md,
  cada uma identificada pela tripla de blobs mais o ambiente (secao 15.4), e a conferencia se faz num worktree proprio detached
  no commit que as publicou, com arnes proprio por git archive sem autocrlf mais git init e hash-object sem filtros igual ao blob,
  nunca com as amostras do plano nem com as do orquestrador derruba com: `git -C C:/Users/AMP/w-mandato fetch origin && git -C C:/Users/AMP/w-mandato merge --ff-only origin/chore/mandato-refs-e-preflight && grep -ic 'tripla' C:/Users/AMP/w-mandato/docs/revisoes/SAN3/B-GOV-MANDATO-ciclo4-mutantes.md`

O procedimento e o da secao 15.5: semente propria publicada; lado VERMELHO, pelo menos 20 por cento dos VERMELHOS de cada
  matriz, cada mutante gerado pela funcao aplica da ferramenta verbatim, provado programa (o awk extraido compila e o script
  roda no insumo fixo sem diagnostico de interpretador), com o comportamento medido antes da cor do guard e a causa publicada
  reproduzida; lado VERDE, 100 por cento dos VERDES, equivalentes, MUTANTE-INVALIDO e TIMEOUT, cada um com fixture propria que
  tenta discriminar; o veredito e CONFERE ou DIVERGE por ponto, e DIVERGE em qualquer ponto devolve o bloco ao dev de scripts
  antes do inspetor derruba com: `grep -ic 'DIVERGE' C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/CONFERENCIA-393-C4.md`

A saida e versionada pelo orquestrador em agent-orchestration/omega/juntas/votos/B-GOV-MANDATO-ciclo4/00-conferencia-dois-lados.md (novo),
  byte a byte, com a semente, a identidade, os comandos e as saidas, para o inspetor re-executar um ponto de cada lado e
  para a cadeira de cobertura julgar se o conferente executou (saida colada), nunca se esta nomeado derruba com: `grep -ic 'semente' C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/CONFERENCIA-393-C4.md`

O terreno: worktree detached proprio C:/Users/AMP/w-conf4 (caminho curto; conferir que existe), npm ci proprio sem junction,
  MSYS_NO_PATHCONV nunca exportada no shell que roda artefato, guard ou ferramenta, sem tail -f, timeout em tudo que executa
  artefato mutado, a base viva erp-postgres 5432 e erp-redis 6379 nunca como alvo (este papel nao precisa de banco), nada
  escrito no repositorio, 0 processo vivo ao fim e o worktree removido pelo nome derruba com: `git -C C:/Users/AMP/Documents/GitHub/ERP_Techsolutios worktree list | grep -ic 'w-conf4'`

A evidencia e incremental, com a hora em cada secao, em C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/CONFERENCIA-393-C4.md,
  e toda falha da API por sobrecarga e registrada nela com a hora derruba com: `grep -ic 'medido por\|semente' C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/CONFERENCIA-393-C4.md`

## MEDIDO

Pre-voo deste mandato no head do lancamento medido por: `cd C:/Users/AMP/w-mandato && bash scripts/mandato-preflight.sh agent-orchestration/omega/juntas/votos/B-GOV-MANDATO-ciclo4/00-mandatos/conferente.md 393; echo ec=$?`
```
COLAGEM    l.11-30: refs do PR #393 confere com a saida atual

PRE-VOO OK — C:/Users/AMP/w-mandato/agent-orchestration/omega/juntas/votos/B-GOV-MANDATO-ciclo4/00-mandatos/conferente.md
ec=0
head=663eeb00eb416827f7330e96cce28c47c5ebb935
utc=2026-10-02T11:10:55Z
```
