# Mandato — planejador da errata 4 — ciclo 4 do B-GOV-MANDATO (PR 393)

## MEDIDO

Forma do mandato: campos declarados, decisao do dono D-MANDATO-FORMA registrada em origin/main medido por: `MSYS_NO_PATHCONV=1 git -C C:/Users/AMP/w-mandato show origin/main:agent-orchestration/controle/decisoes.md | grep -ic '^## D-MANDATO-FORMA'`
```
1
```

Estado do PR 393 no instante do lancamento, pela ferramenta do bloco medido por: `bash scripts/mandato-refs.sh 393`
```
# refs do PR #393 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato
# gerado em: 2026-10-02T21:15Z · repo: thiagodorgo/ERP_Techsolutios

ramo:            chore/mandato-refs-e-preflight
base:            origin/main
estado:          OPEN | rascunho=true | MERGEABLE
head do PR:      325030c8e1283b6ea8bf6d6cddb6366d0f1790e6
merge-base:      4ab9d232d2c6705ad39cf6bd4313ca5c91b222a9
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

Os corpos de cadeira jurado-mandato no ramo: os dos ciclos 1 a 3 sao inelegiveis para o ciclo 4, e os tres com sufixo d sao as cadeiras do ciclo 4 medido por: `ls C:/Users/AMP/w-mandato/.claude/agents/especialistas/ | grep -i jurado-mandato | paste -sd' '`
```
jurado-mandato-c1-prevoo-fail-closed.md jurado-mandato-c1c-invariancia-de-forma.md jurado-mandato-c1d-invariancia-e-morte-interna.md jurado-mandato-c2-pergunta-feita.md jurado-mandato-c2c-cobertura-por-mutacao.md jurado-mandato-c2d-cobertura-e-dois-lados.md jurado-mandato-c3-escopo-kpi-registro.md jurado-mandato-c3b-fronteira-numero-registro.md jurado-mandato-c3c-fronteira-numero-registro.md jurado-mandato-c3d-escopo-kpi-registro-mandato.md
```

## HIPOTESE

O papel e planejador-mestre, a MESMA identidade planejador-ciclo4-b-gov-mandato da secao 15 e das erratas 15.14 a 15.16, relancada
  para uma quarta errata; o Fable e obrigatorio porque o fluxo volta ao planejador depois de correcao de codigo (secao C7 item 6 do
  contrato); esgotado o Fable, Opus com a substituicao declarada; esgotado o Opus, para; declara na 1a linha da errata o papel, a
  identidade, o modelo, o mandato_md5 deste arquivo e o md5 EOL-neutro do corpo planejador-mestre de origin/main derruba com: `grep -ic 'mandato_md5' C:/Users/AMP/w-mandato/docs/revisoes/SAN3/B-GOV-MANDATO-ciclo3-plano.md`

Item unico — o achado CONF-01 da conferencia dos dois lados, em C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/00-conferencia-dois-lados.md
  (secoes 8, 11 e 14), lido como relatorio de quem achou e nunca como fato: a versao VIAVEL do operador M7(salto) no ponto 263 do pre-voo
  (o continue trocado por ponto e virgula, onde a ferramenta publica a troca por dois pontos como MUTANTE-INVALIDO) e programa, muda o
  comportamento (a linha de outro cabecalho sai listada duas vezes) e o guard do pre-voo fica VERDE; a errata re-mede isso por execucao
  propria e decide, por propriedade e com a mutacao que deixa cada criterio vermelho, o remedio e quem o executa (caso de teste novo,
  mudanca na ferramenta com o custo de uma matriz nova, declaracao como fronteira, ou combinacao), o que acontece com as outras versoes
  viaveis que a conferencia mediu (28 cobertas, 8 sem mudanca, 2 que nao terminam) e quem reconfere o ponto antes da junta, porque a
  conferencia em DIVERGE bloqueia o inspetor derruba com: `grep -ic 'CONF-01' C:/Users/AMP/w-mandato/docs/revisoes/SAN3/B-GOV-MANDATO-ciclo3-plano.md`

A errata entra so por adicao ao fim da secao 15 do plano, numa subsecao nova depois da 15.16, sem tocar outra linha nem outro arquivo;
  o planejador nao conserta, nao escreve caso, ferramenta nem corpo e nao versiona derruba com: `git -C C:/Users/AMP/w-mandato status --porcelain | grep -iv 'B-GOV-MANDATO-ciclo3-plano.md' | grep -icv '00-quedas.md'`

O terreno: mede num worktree proprio detached C:/Users/AMP/w-pl4h no head do ramo, com npm ci proprio sem junction, removido pelo nome ao
  fim com 0 processo vivo; nunca tail -f nem MSYS_NO_PATHCONV exportada; timeout no que executa artefato mutado; base viva erp-postgres
  5432 e erp-redis 6379 nunca alvo; evidencia incremental com hora; se receber PAUSA, grava a secao PAUSA no fim da errata e para sozinho derruba com: `git -C C:/Users/AMP/Documents/GitHub/ERP_Techsolutios worktree list | grep -ic 'w-pl4h'`

## MEDIDO

Pre-voo deste mandato no head do lancamento medido por: `cd C:/Users/AMP/w-mandato && bash scripts/mandato-preflight.sh agent-orchestration/omega/juntas/votos/B-GOV-MANDATO-ciclo4/00-mandatos/planejador-errata4.md 393; echo ec=$?`
```
COLAGEM    l.11-30: refs do PR #393 confere com a saida atual

PRE-VOO OK — C:/Users/AMP/w-mandato/agent-orchestration/omega/juntas/votos/B-GOV-MANDATO-ciclo4/00-mandatos/planejador-errata4.md
ec=0
head=325030c8e1283b6ea8bf6d6cddb6366d0f1790e6
utc=2026-10-02T21:15:25Z
```
