# Mandato — cadeira C2d — ciclo 4 do B-GOV-MANDATO (PR 393)

## MEDIDO

Forma do mandato: campos declarados, decisao do dono D-MANDATO-FORMA registrada em origin/main medido por: `MSYS_NO_PATHCONV=1 git -C C:/Users/AMP/w-mandato show origin/main:agent-orchestration/controle/decisoes.md | grep -ic '^## D-MANDATO-FORMA'`
```
1
```

Estado do PR 393 no instante do lancamento, pela ferramenta do bloco medido por: `bash scripts/mandato-refs.sh 393`
```
# refs do PR #393 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato
# gerado em: 2026-10-03T04:45Z · repo: thiagodorgo/ERP_Techsolutios

ramo:            chore/mandato-refs-e-preflight
base:            origin/main
estado:          OPEN | rascunho=true | MERGEABLE
head do PR:      d031518d2ba58b25ae96814452fbda31b868635e
merge-base:      b404815ce3d1f1b8e5121bd1526978f7222e7479
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

Os mandatos do ciclo 4 ja versionados, um por papel medido por: `ls C:/Users/AMP/w-mandato/agent-orchestration/omega/juntas/votos/B-GOV-MANDATO-ciclo4/00-mandatos/ | paste -sd' '`
```
auditor-atestacao.md c1d.md c2d.md conferente-reconferencia.md conferente.md dev-scripts-k4b3.md dev-scripts-k4b4.md dev-scripts.md dev-tests-t4c5.md dev-tests.md fabrica-1bis.md fabrica-1quater.md fabrica-1ter.md fabrica.md inspetor.md planejador-errata.md planejador-errata2.md planejador-errata3.md planejador-errata4.md planejador.md
```

Os quatro corpos novos do ciclo 4 nos dois espelhos, e a fatia S0 medido por: `ls C:/Users/AMP/w-mandato/.claude/agents/especialistas/ C:/Users/AMP/w-mandato/.agents/agents/especialistas/ | grep -icE 'c1d-invariancia-e-morte-interna|c2d-cobertura-e-dois-lados|c3d-escopo-kpi-registro-mandato|conferente-dois-lados-b-gov-mandato-c4'; cd C:/Users/AMP/w-mandato && node scripts/sync-agent-agents.mjs --check >/dev/null 2>&1; echo s0=$?`
```
8
s0=0
```

As matrizes do ciclo 4 publicadas (linhas N= no documento) e a conferencia dos dois lados versionada (0 = ausente) medido por: `grep -ic '^N=' C:/Users/AMP/w-mandato/docs/revisoes/SAN3/B-GOV-MANDATO-ciclo4-mutantes.md; ls C:/Users/AMP/w-mandato/agent-orchestration/omega/juntas/votos/B-GOV-MANDATO-ciclo4/ | grep -ic '00-conferencia-dois-lados.md'`
```
3
1
```

## HIPOTESE

O papel e a cadeira C2 da junta 4 (secao 15.9 do plano), identidade nova jurado-mandato-c2d-cobertura-e-dois-lados,
  competencia cobertura por mutacao, honestidade da matriz e conferencia dos dois lados; o corpo aplicado e o do head do ramo em
  .claude/agents/especialistas/jurado-mandato-c2d-cobertura-e-dois-lados.md, e a cadeira declara na 1a linha da evidencia e da
  mensagem final o papel, a identidade, o modelo, o mandato_md5 deste arquivo e o md5 EOL-neutro do corpo derruba com: `head -1 C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/VOTO-393-J4-C2.md | grep -ic 'mandato_md5'`

A legalidade da junta 4 e conferida pela propria cadeira antes de medir merito: a secao 9 do parecer
  agent-orchestration/omega/reprovacoes/R-B-GOV-MANDATO-ciclo3-auditoria.md existe com CONSERTO VERIFICADO, e o parecer do inspetor em
  agent-orchestration/omega/juntas/votos/B-GOV-MANDATO-ciclo4/00-inspetor-terreno.md (novo) diz LIBERADO; faltando um dos dois, a
  cadeira nao vota e reporta derruba com: `grep -ic 'CONSERTO VERIFICADO' C:/Users/AMP/w-mandato/agent-orchestration/omega/reprovacoes/R-B-GOV-MANDATO-ciclo3-auditoria.md`

O objeto julgado e resolvido pela propria cadeira (head do ramo chore/mandato-refs-e-preflight por git, nunca digitado), num
  worktree detached proprio C:/Users/AMP/w-j4c2 (caminho curto; conferir que existe), com npm ci proprio sem junction, arnes proprio
  por git archive sem autocrlf mais git init e hash-object sem filtros igual ao blob; a identidade de cada matriz publicada em
  docs/revisoes/SAN3/B-GOV-MANDATO-ciclo4-mutantes.md e a tripla de blobs mais o ambiente (secao 15.4), e a cadeira confere
  que os blobs do head sao os publicados antes de medir derruba com: `git -C C:/Users/AMP/Documents/GitHub/ERP_Techsolutios worktree list | grep -ic 'w-j4c2'`

Item 1 (reexecucao da E4 nova): a matriz refs inteira; a matriz do pre-voo por amostra com semente propria publicada — pelo menos
  20 por cento dos VERMELHOS e 100 por cento dos VERDES, equivalentes, MUTANTE-INVALIDO e TIMEOUT —, cada mutante gerado pela
  funcao aplica da ferramenta verbatim e provado programa, com o comportamento medido antes da cor do guard; toda divergencia com a
  matriz publicada e achado, e a cadeira nunca usa as amostras do plano nem as do conferente como medicao propria derruba com: `grep -ic 'semente' C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/VOTO-393-J4-C2.md`

Item 2 (invalidos e versoes viaveis): os invalidos historicos do pre-voo e do refs saem MUTANTE-INVALIDO fora do denominador; a cadeira
  mede a versao viavel de cada um que a matriz publicar como coberto e julga se e coberto pelos casos do T4c ou pela isencao exata;
  invalido publicado como coberto e bloqueia derruba com: `grep -ic 'MUTANTE-INVALIDO' C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/VOTO-393-J4-C2.md`

Item 3 (M-1 e equivalentes): o M-1 e derivado por conjuntos e por fixture propria sobre cada equivalente declarado em
  docs/revisoes/SAN3/B-GOV-MANDATO-ciclo4-equivalentes.txt; ponto VERDE nao declarado e bloqueia; equivalente discriminavel por
  fixture e bloqueia derruba com: `grep -ic 'M-1' C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/VOTO-393-J4-C2.md`

Item 4 (o conferente executou): a conferencia versionada em
  agent-orchestration/omega/juntas/votos/B-GOV-MANDATO-ciclo4/00-conferencia-dois-lados.md traz saida colada por ponto e termina na reconferencia do 263 (CONFERIDO, errata 15.17),
  e a cadeira reproduz 1 ponto de cada lado e o 263 com os comandos dela; a cadeira julga execucao (saida), nunca nomeacao derruba com: `grep -ic 'conferente' C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/VOTO-393-J4-C2.md`

Item 5 e 6 (M-EXT e drills): pelo menos 10 mutantes proprios fora da enumeracao da ferramenta (M-EXT), cada um com cor medida; e os
  drills t-invalido, t-inventado, t-controle, t-timeout, t-next e t-diferencial reexecutados com os vermelhos-controle historicos ao
  lado, com a copia que falha o controle saindo ec igual a 2 derruba com: `grep -ic 'M-EXT' C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/VOTO-393-J4-C2.md`

As regras da casa: maioria de 3, sem veto individual e sem suplente (queda relanca a mesma identidade, que nao herda nada; voto
  perdido nunca aprova); todo achado com gravidade (bloqueia, ajuste, nota) e escopo (dentro-do-bloco ou pre-existente com evidencia
  de data ou origem; sem evidencia conta como dentro-do-bloco); nao consigo medir e REPROVADO; a cadeira nao propoe correcao; vota
  junto com as outras duas sem ler o voto delas; custo nunca e criterio; o veredito final e APROVADO ou REPROVADO com os achados em
  JSON (id, gravidade, escopo, evidencia) derruba com: `grep -ic '"escopo"' C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/VOTO-393-J4-C2.md`

O terreno: MSYS_NO_PATHCONV nunca exportada no shell que roda artefato, guard ou ferramenta; sem tail -f; timeout em tudo que
  executa artefato mutado; a base viva erp-postgres 5432 e erp-redis 6379 nunca como alvo (este papel nao precisa de banco); nada
  escrito no repositorio; 0 processo vivo ao fim; worktree removido pelo nome; evidencia incremental com a hora em cada secao em
  C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/VOTO-393-J4-C2.md,
  e toda falha da API por sobrecarga registrada nela com a hora derruba com: `grep -ic 'medido por' C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/VOTO-393-J4-C2.md`

## MEDIDO

Pre-voo deste mandato no head do lancamento medido por: `cd C:/Users/AMP/w-mandato && bash scripts/mandato-preflight.sh agent-orchestration/omega/juntas/votos/B-GOV-MANDATO-ciclo4/00-mandatos/c2d.md 393; echo ec=$?`
```
COLAGEM    l.11-30: refs do PR #393 confere com a saida atual

PRE-VOO OK — C:/Users/AMP/w-mandato/agent-orchestration/omega/juntas/votos/B-GOV-MANDATO-ciclo4/00-mandatos/c2d.md
ec=0
head=d031518d2ba58b25ae96814452fbda31b868635e
utc=2026-10-03T04:45:37Z
```
