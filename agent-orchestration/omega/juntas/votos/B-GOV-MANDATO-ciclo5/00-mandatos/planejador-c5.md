# Mandato — planejador do ciclo 5 — ciclo 4 do B-GOV-MANDATO (PR 393)

## MEDIDO

Forma do mandato: campos declarados, decisao do dono D-MANDATO-FORMA registrada em origin/main medido por: `MSYS_NO_PATHCONV=1 git -C C:/Users/AMP/w-mandato show origin/main:agent-orchestration/controle/decisoes.md | grep -ic '^## D-MANDATO-FORMA'`
```
1
```

Estado do PR 393 no instante do lancamento, pela ferramenta do bloco medido por: `bash scripts/mandato-refs.sh 393`
```
# refs do PR #393 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato
# gerado em: 2026-10-04T09:07Z · repo: thiagodorgo/ERP_Techsolutios

ramo:            chore/mandato-refs-e-preflight
base:            origin/main
estado:          OPEN | rascunho=true | MERGEABLE
head do PR:      90d65341c3022607793eefaa4553ac0831397d1f
merge-base:      b404815ce3d1f1b8e5121bd1526978f7222e7479
merge commit:    <ainda nao mergeado>
check-runs:      total=14 nao-verdes=0 pendentes=0
approved_head:   NAO DETERMINAVEL (a ata casa o PR mas NAO declara aprovacao: nenhuma linha '- **approved_head:**')
                 objeto declarado 7462b75bfb7768556a2da2ee13f9ac92e9198872 (agent-orchestration/omega/juntas/J-B-GOV-MANDATO.md:10 @head-do-PR) — aprovacao nao legivel por maquina
                 objeto declarado 4c8819effd0b9f7a1ef8040eaa1707ca8342fdad (agent-orchestration/omega/juntas/J-B-GOV-MANDATO.md:96 @head-do-PR) — aprovacao nao legivel por maquina
                 objeto declarado 28b4defdc067387f384e06614e033e0976e9912b (agent-orchestration/omega/juntas/J-B-GOV-MANDATO.md:215 @head-do-PR) — aprovacao nao legivel por maquina
                 objeto declarado 371b09b26cf51ee28996074c81e2f91dca585cc3 (agent-orchestration/omega/juntas/J-B-GOV-MANDATO.md:331 @head-do-PR) — aprovacao nao legivel por maquina
                 agent-orchestration/omega/juntas/J-B-GOV-PAUSA.md (mencao no corpo) @head-do-PR
                 agent-orchestration/omega/juntas/J-B-GOV-SEM-TETO.md (mencao no corpo) @head-do-PR
                 NAO invente: sem a linha '- **approved_head:**' numa ata que se declare
                 sobre este PR, a ferramenta NAO afirma qual head a junta aprovou.
```

O merge-base do head com origin/main e igual a origin/main (a main de agora esta integrada no ramo) medido por: `cd C:/Users/AMP/w-mandato && [ "$(git merge-base origin/main HEAD)" = "$(git rev-parse origin/main)" ] && echo IGUAL || echo DIFERENTE`
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
1
R-B-GOV-MANDATO-1.md
R-B-GOV-MANDATO-2.md
R-B-GOV-MANDATO-3.md
R-B-GOV-MANDATO-4.md
R-B-GOV-MANDATO-ciclo3-auditoria.md
```

As tres pendencias do conserto da maquina estao no ramo medido por: `grep -ioE '^## P-GOV-MAQUINA-393-[A-Z0-9-]+' C:/Users/AMP/w-mandato/agent-orchestration/controle/pendencias.md | paste -sd' '`
```
## P-GOV-MAQUINA-393-D-M1-DOIS-LADOS ## P-GOV-MAQUINA-393-D-M2-MANDATO-ARTEFATO ## P-GOV-MAQUINA-393-D-M3-FALHA-INTERNA
```

Os corpos de cadeira jurado-mandato no ramo: os dos ciclos 1 a 3 sao inelegiveis para o ciclo 4, e os tres com sufixo d sao as cadeiras do ciclo 5 medido por: `ls C:/Users/AMP/w-mandato/.claude/agents/especialistas/ | grep -i jurado-mandato | paste -sd' '`
```
jurado-mandato-c1-prevoo-fail-closed.md jurado-mandato-c1c-invariancia-de-forma.md jurado-mandato-c1d-invariancia-e-morte-interna.md jurado-mandato-c2-pergunta-feita.md jurado-mandato-c2c-cobertura-por-mutacao.md jurado-mandato-c2d-cobertura-e-dois-lados.md jurado-mandato-c3-escopo-kpi-registro.md jurado-mandato-c3b-fronteira-numero-registro.md jurado-mandato-c3c-fronteira-numero-registro.md jurado-mandato-c3d-escopo-kpi-registro-mandato.md
```

## HIPOTESE

O papel e planejador-mestre, identidade NOVA planejador-ciclo5-b-gov-mandato (nao achou, nao planejou nem desenvolveu ciclo algum deste
  bloco), rodando no Codex em GPT-5.6 Sol: o dono suspendeu Fable e Astra ate o reset semanal (2026-10-03), o que suspende a obrigacao de
  Fable no retorno ao planejador (secao C7 item 6), declarada como substituicao; declara na 1a linha da secao nova do plano o papel, a
  identidade, o modelo, o mandato_md5 deste arquivo e o md5 EOL-neutro do corpo planejador-mestre do espelho Codex de origin/main derruba com: `grep -ic 'planejador-ciclo5' C:/Users/AMP/w-mandato/docs/revisoes/SAN3/B-GOV-MANDATO-ciclo3-plano.md`

Item 1 — os dois bloqueia da junta 4, lidos como relatorio de quem achou e nunca como fato: C1d-01 (um SHA fabricado escrito colado
  depois de dois pontos sai PRE-VOO OK) em C:/Users/AMP/w-mandato/agent-orchestration/omega/juntas/votos/B-GOV-MANDATO-ciclo4/C1-evidencia.md e C2d-02 (o guard do pre-voo nao exige a rejeicao de SHA abreviado de 7 a
  39 hex em prosa fora da proveniencia) em C:/Users/AMP/w-mandato/agent-orchestration/omega/juntas/votos/B-GOV-MANDATO-ciclo4/C2-evidencia.md; o planejador reproduz por execucao propria o vermelho-controle de cada um
  no head, decide o remedio por PROPRIEDADE (nunca por mais uma forma), com a mutacao que deixa cada criterio vermelho, e classifica os
  ajustes C1d-02, C2d-01, C3d-02, C3d-03, C3d-04 e C3d-06 em entra neste ciclo ou vira pendencia com dono derruba com: `grep -ic 'C1d-01' C:/Users/AMP/w-mandato/docs/revisoes/SAN3/B-GOV-MANDATO-ciclo3-plano.md`

Item 2 — o ciclo 5 inteiro: devs com identidade nova (quem achou nao conserta), os testes antes dos scripts, a conferencia e a
  reconferencia que o plano exigir, a lista de mandatos, as competencias das tres cadeiras da junta 5 para a agente-fabrica, o KPI e o
  registro; e, porque a classe de SHA reconhecido por forma se repetiu pelo quarto ciclo (R-B-GOV-MANDATO-4), uma secao O QUE SO O DONO
  DECIDE com as alternativas medidas (seguir consertando o linter de prosa, ou trocar o formato do mandato por campos declarados), cada
  uma com custo e risco escritos, sem decidir por ele derruba com: `grep -ic 'SO O DONO' C:/Users/AMP/w-mandato/docs/revisoes/SAN3/B-GOV-MANDATO-ciclo3-plano.md`

A secao nova entra so por adicao ao fim do plano C:/Users/AMP/w-mandato/docs/revisoes/SAN3/B-GOV-MANDATO-ciclo3-plano.md, como secao 16, sem tocar outra linha nem outro arquivo; o planejador nao conserta,
  nao escreve caso, ferramenta nem corpo e nao versiona derruba com: `git -C C:/Users/AMP/w-mandato status --porcelain | grep -iv 'B-GOV-MANDATO-ciclo3-plano.md' | grep -iv '^ M .agents' | grep -ic .`

O terreno: mede num worktree proprio detached C:/Users/AMP/w-pl5 no head do ramo, com npm ci proprio sem junction, removido pelo nome ao
  fim com 0 processo vivo; nunca tail -f nem MSYS_NO_PATHCONV exportada; nunca git config sem --worktree; timeout no que executa artefato
  mutado; base viva erp-postgres 5432 e erp-redis 6379 nunca alvo; evidencia incremental com hora; a cota da conta dura de 35 a 50 minutos
  por janela, entao cada passo e gravado assim que medido; se receber PAUSA, grava a secao PAUSA no fim e para sozinho derruba com: `git -C C:/Users/AMP/Documents/GitHub/ERP_Techsolutios worktree list | grep -ic 'w-pl5'`

## MEDIDO

Pre-voo deste mandato no head do lancamento medido por: `cd C:/Users/AMP/w-mandato && bash scripts/mandato-preflight.sh agent-orchestration/omega/juntas/votos/B-GOV-MANDATO-ciclo5/00-mandatos/planejador-c5.md 393; echo ec=$?`
```
COLAGEM    l.11-31: refs do PR #393 confere com a saida atual

PRE-VOO OK — C:/Users/AMP/w-mandato/agent-orchestration/omega/juntas/votos/B-GOV-MANDATO-ciclo5/00-mandatos/planejador-c5.md
ec=0
head=90d65341c3022607793eefaa4553ac0831397d1f
utc=2026-10-04T09:07:57Z
```
